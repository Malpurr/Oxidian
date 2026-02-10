// Oxidian — Remember Import: Import from Kindle, Readwise CSV, Markdown, Plain Text

use serde::{Deserialize, Serialize};

use super::cards::{self, CardInput};
use super::sources::{self, SourceInput};
use super::error::RememberError;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportEntry {
    pub title: String,
    pub author: String,
    pub highlight: String,
    pub note: String,
    pub location: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub cards_created: usize,
    pub sources_created: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ImportFormat {
    Kindle,
    Readwise,
    Markdown,
    PlainText,
}

// ─── Parsers ─────────────────────────────────────────────────────────

/// Parse Kindle "My Clippings.txt" format.
pub fn parse_kindle_clippings(text: &str) -> Vec<ImportEntry> {
    let mut entries = Vec::new();

    for block in text.split("==========") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        let lines: Vec<&str> = block.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
        if lines.len() < 2 {
            continue;
        }

        // Line 1: Title (Author)
        let title_line = lines[0];
        let (title, author) = if let Some(paren_start) = title_line.rfind('(') {
            let title = title_line[..paren_start].trim().to_string();
            let author = title_line[paren_start + 1..]
                .trim_end_matches(')')
                .trim()
                .to_string();
            (title, author)
        } else {
            (title_line.to_string(), String::new())
        };

        // Line 2: metadata
        let meta_line = lines[1];
        // Skip bookmarks
        if meta_line.contains("Your Bookmark") {
            continue;
        }

        let location = extract_kindle_location(meta_line);

        // Lines 3+: highlight text
        let highlight = lines[2..].join("\n").trim().to_string();
        if highlight.is_empty() {
            continue;
        }

        entries.push(ImportEntry {
            title,
            author,
            highlight,
            note: String::new(),
            location,
            date: String::new(),
        });
    }

    entries
}

fn extract_kindle_location(meta: &str) -> String {
    // Try "Location 123-125"
    if let Some(start) = meta.find("Location") {
        let rest = &meta[start + 8..];
        let loc: String = rest.trim().chars().take_while(|c| c.is_ascii_digit() || *c == '-').collect();
        if !loc.is_empty() {
            return loc;
        }
    }
    // Try "page 42"
    if let Some(start) = meta.to_lowercase().find("page") {
        let rest = &meta[start + 4..];
        let page: String = rest.trim().chars().take_while(|c| c.is_ascii_digit()).collect();
        if !page.is_empty() {
            return format!("p.{}", page);
        }
    }
    String::new()
}

/// Parse Readwise CSV export.
pub fn parse_readwise_csv(text: &str) -> Vec<ImportEntry> {
    let mut entries = Vec::new();
    let mut lines = text.lines();

    let header = match lines.next() {
        Some(h) => h,
        None => return entries,
    };

    let cols: Vec<&str> = parse_csv_line(header);
    let find_col = |name: &str| -> Option<usize> {
        cols.iter().position(|c| c.to_lowercase().trim() == name)
    };

    let title_idx = find_col("title").or_else(|| find_col("book title"));
    let author_idx = find_col("author").or_else(|| find_col("book author"));
    let highlight_idx = find_col("highlight").or_else(|| find_col("text"));
    let note_idx = find_col("note");
    let location_idx = find_col("location");

    let highlight_idx = match highlight_idx {
        Some(i) => i,
        None => return entries,
    };

    for line in lines {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let fields: Vec<&str> = parse_csv_line(line);
        let get = |idx: Option<usize>| -> String {
            idx.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default()
        };

        let highlight = get(Some(highlight_idx));
        if highlight.is_empty() {
            continue;
        }

        entries.push(ImportEntry {
            title: get(title_idx).replace('"', ""),
            author: get(author_idx).replace('"', ""),
            highlight,
            note: get(note_idx),
            location: get(location_idx),
            date: String::new(),
        });
    }

    entries
}

fn parse_csv_line(line: &str) -> Vec<&str> {
    // Simple CSV: split on commas, handle quoted fields naively
    // For a production parser we'd use the csv crate, but keeping deps minimal
    let mut result = Vec::new();
    let mut start = 0;
    let mut in_quotes = false;
    let bytes = line.as_bytes();

    for i in 0..bytes.len() {
        if bytes[i] == b'"' {
            in_quotes = !in_quotes;
        } else if bytes[i] == b',' && !in_quotes {
            result.push(line[start..i].trim().trim_matches('"'));
            start = i + 1;
        }
    }
    result.push(line[start..].trim().trim_matches('"'));
    result
}

/// Parse blockquotes from a Markdown file as highlight candidates.
pub fn parse_markdown_highlights(text: &str, filename: &str) -> Vec<ImportEntry> {
    let title = filename.strip_suffix(".md").unwrap_or(filename).to_string();
    let mut entries = Vec::new();
    let mut current_quote = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with('>') {
            current_quote.push(trimmed.strip_prefix('>').unwrap_or(trimmed).trim_start());
        } else {
            if !current_quote.is_empty() {
                let highlight = current_quote.join("\n").trim().to_string();
                if !highlight.is_empty() {
                    entries.push(ImportEntry {
                        title: title.clone(),
                        author: String::new(),
                        highlight,
                        note: String::new(),
                        location: String::new(),
                        date: String::new(),
                    });
                }
                current_quote.clear();
            }
        }
    }
    // Flush remaining
    if !current_quote.is_empty() {
        let highlight = current_quote.join("\n").trim().to_string();
        if !highlight.is_empty() {
            entries.push(ImportEntry {
                title: title.clone(),
                author: String::new(),
                highlight,
                note: String::new(),
                location: String::new(),
                date: String::new(),
            });
        }
    }

    entries
}

/// Parse plain text — one highlight per line.
pub fn parse_plain_text(text: &str) -> Vec<ImportEntry> {
    text.lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .map(|line| ImportEntry {
            title: String::new(),
            author: String::new(),
            highlight: line.to_string(),
            note: String::new(),
            location: String::new(),
            date: String::new(),
        })
        .collect()
}

// ─── Import Execution ────────────────────────────────────────────────

/// Parse content based on format.
pub fn parse_content(content: &str, format: ImportFormat, filename: &str) -> Vec<ImportEntry> {
    match format {
        ImportFormat::Kindle => parse_kindle_clippings(content),
        ImportFormat::Readwise => parse_readwise_csv(content),
        ImportFormat::Markdown => parse_markdown_highlights(content, filename),
        ImportFormat::PlainText => parse_plain_text(content),
    }
}

/// Execute import: create source files and card files for selected entries.
pub fn execute_import(
    vault_path: &str,
    entries: &[ImportEntry],
    default_source: Option<&str>,
) -> Result<ImportResult, RememberError> {
    let mut result = ImportResult {
        cards_created: 0,
        sources_created: 0,
        errors: Vec::new(),
    };

    // Group by source title
    let mut groups: std::collections::HashMap<String, Vec<&ImportEntry>> = std::collections::HashMap::new();
    for entry in entries {
        let key = if entry.title.is_empty() {
            default_source.unwrap_or("Imported Notes").to_string()
        } else {
            entry.title.clone()
        };
        groups.entry(key).or_default().push(entry);
    }

    for (title, items) in &groups {
        let author = items.first().map(|e| e.author.as_str()).unwrap_or("");

        // Ensure source exists
        let source_slug = slugify(title);
        let source_path = format!("Sources/{}.md", source_slug);
        let full_source = std::path::Path::new(vault_path).join(&source_path);
        if !full_source.exists() {
            let input = SourceInput {
                title: title.clone(),
                author: author.to_string(),
                source_type: "book".to_string(),
                status: "finished".to_string(),
                rating: 0,
                notes: String::new(),
                existing_path: Some(source_path.clone()),
            };
            match sources::create_source(vault_path, &input) {
                Ok(_) => result.sources_created += 1,
                Err(e) => result.errors.push(format!("Source '{}': {}", title, e)),
            }
        }

        // Create cards
        for entry in items {
            let front = if entry.highlight.len() > 80 {
                format!("{}…", &entry.highlight[..80])
            } else {
                entry.highlight.clone()
            };

            let mut back = entry.highlight.clone();
            if !entry.note.is_empty() {
                back.push_str(&format!("\n\n_Note: {}_", entry.note));
            }
            if !entry.location.is_empty() {
                back.push_str(&format!("\n\n_Location: {}_", entry.location));
            }

            let input = CardInput {
                front,
                back,
                source: format!("[[{}]]", source_slug),
                tags: vec!["imported".to_string()],
                existing_path: None,
            };

            match cards::create_card(vault_path, &input) {
                Ok(_) => result.cards_created += 1,
                Err(e) => result.errors.push(format!("Card: {}", e)),
            }
        }
    }

    Ok(result)
}

fn slugify(text: &str) -> String {
    text.to_lowercase()
        .trim()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else if c.is_whitespace() { '-' } else { '\0' })
        .filter(|c| *c != '\0')
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_kindle() {
        let text = r#"The Daily Stoic (Ryan Holiday)
- Your Highlight on Location 123-125 | Added on Monday, January 1, 2026

The impediment to action advances action.
==========
Some Book (Author)
- Your Bookmark on Location 50 | Added on Tuesday, January 2, 2026

==========
Another Book (Writer)
- Your Highlight on page 42 | Added on Wednesday, January 3, 2026

Knowledge is power.
=========="#;

        let entries = parse_kindle_clippings(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].title, "The Daily Stoic");
        assert_eq!(entries[0].author, "Ryan Holiday");
        assert_eq!(entries[0].highlight, "The impediment to action advances action.");
        assert_eq!(entries[0].location, "123-125");
        assert_eq!(entries[1].location, "p.42");
    }

    #[test]
    fn test_parse_markdown_highlights() {
        let text = "# My Notes\n\nSome text.\n\n> First highlight\n> continued\n\nMore text.\n\n> Second highlight\n";
        let entries = parse_markdown_highlights(text, "notes.md");
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].highlight, "First highlight\ncontinued");
        assert_eq!(entries[1].highlight, "Second highlight");
        assert_eq!(entries[0].title, "notes");
    }

    #[test]
    fn test_parse_plain_text() {
        let text = "Line one\nLine two\n\nLine three\n";
        let entries = parse_plain_text(text);
        assert_eq!(entries.len(), 3);
    }

    #[test]
    fn test_parse_readwise_csv() {
        let text = "Title,Author,Highlight,Note,Location\nThe Book,Author Name,Some highlight text,,42\nThe Book,Author Name,Another highlight,My note,55\n";
        let entries = parse_readwise_csv(text);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].title, "The Book");
        assert_eq!(entries[0].highlight, "Some highlight text");
        assert_eq!(entries[1].note, "My note");
    }
}
