// Oxidian — Remember Sources: Source struct, CRUD
// Sources stored as Markdown in Sources/ folder with YAML frontmatter.

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::error::RememberError;
use super::sm2;

const SOURCES_FOLDER: &str = "Sources";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SourceType {
    Book, Article, Video, Podcast,
}

impl SourceType {
    pub fn as_str(&self) -> &str {
        match self { Self::Book => "book", Self::Article => "article", Self::Video => "video", Self::Podcast => "podcast" }
    }
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "article" => Self::Article, "video" => Self::Video, "podcast" => Self::Podcast, _ => Self::Book,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SourceStatus {
    WantToRead, Reading, Finished,
}

impl SourceStatus {
    pub fn as_str(&self) -> &str {
        match self { Self::WantToRead => "want_to_read", Self::Reading => "reading", Self::Finished => "finished" }
    }
    pub fn from_str(s: &str) -> Self {
        match s { "reading" => Self::Reading, "finished" => Self::Finished, _ => Self::WantToRead }
    }
    pub fn sort_order(&self) -> u8 {
        match self { Self::Reading => 0, Self::WantToRead => 1, Self::Finished => 2 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub path: String,
    pub title: String,
    pub author: String,
    pub source_type: SourceType,
    pub status: SourceStatus,
    pub rating: u8,
    pub started: String,
    pub finished: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceInput {
    pub title: String,
    #[serde(default)]
    pub author: String,
    #[serde(default = "default_source_type")]
    pub source_type: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub rating: u8,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub existing_path: Option<String>,
}

fn default_source_type() -> String { "book".to_string() }
fn default_status() -> String { "want_to_read".to_string() }

impl Source {
    pub fn to_markdown(&self) -> String {
        let started = if self.started.is_empty() { "null" } else { &self.started };
        let finished = if self.finished.is_empty() { "null" } else { &self.finished };
        format!(
            "---\ntype: source\ntitle: \"{}\"\nauthor: \"{}\"\nsource_type: {}\nstatus: {}\nrating: {}\nstarted: {}\nfinished: {}\n---\n{}",
            self.title, self.author, self.source_type.as_str(), self.status.as_str(),
            self.rating, started, finished, self.body,
        )
    }

    pub fn from_markdown(path: &str, content: &str) -> Result<Self, RememberError> {
        let (meta, body) = parse_source_frontmatter(content);
        if meta.get("type").map(|s| s.as_str()) != Some("source") {
            return Err(RememberError::InvalidSource(format!("{}: not a source", path)));
        }
        let status = SourceStatus::from_str(meta.get("status").map(|s| s.as_str()).unwrap_or("want_to_read"));
        Ok(Source {
            path: path.to_string(),
            title: meta.get("title").map(|s| s.trim_matches('"').to_string()).unwrap_or_default(),
            author: meta.get("author").map(|s| s.trim_matches('"').to_string()).unwrap_or_default(),
            source_type: SourceType::from_str(meta.get("source_type").map(|s| s.as_str()).unwrap_or("book")),
            status,
            rating: meta.get("rating").and_then(|s| s.parse().ok()).unwrap_or(0),
            started: meta.get("started").filter(|s| s.as_str() != "null").cloned().unwrap_or_default(),
            finished: meta.get("finished").filter(|s| s.as_str() != "null").cloned().unwrap_or_default(),
            body,
        })
    }
}

pub fn load_all_sources(vault_path: &str) -> Result<Vec<Source>, RememberError> {
    let sources_dir = Path::new(vault_path).join(SOURCES_FOLDER);
    if !sources_dir.exists() { return Ok(Vec::new()); }
    let mut sources = Vec::new();
    for entry in walkdir::WalkDir::new(&sources_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map(|e| e != "md").unwrap_or(true) { continue; }
        let relative = path.strip_prefix(vault_path).unwrap_or(path).to_string_lossy().replace('\\', "/");
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(source) = Source::from_markdown(&relative, &content) {
                sources.push(source);
            }
        }
    }
    sources.sort_by_key(|s| s.status.sort_order());
    Ok(sources)
}

pub fn save_source(vault_path: &str, source: &Source) -> Result<String, RememberError> {
    let sources_dir = Path::new(vault_path).join(SOURCES_FOLDER);
    std::fs::create_dir_all(&sources_dir).map_err(RememberError::Io)?;
    let full_path = Path::new(vault_path).join(&source.path);
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(RememberError::Io)?;
    }
    std::fs::write(&full_path, source.to_markdown()).map_err(RememberError::Io)?;
    Ok(source.path.clone())
}

pub fn create_source(vault_path: &str, input: &SourceInput) -> Result<Source, RememberError> {
    let today = sm2::today_iso();
    let status = SourceStatus::from_str(&input.status);
    let filename = input.title.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-', "_").trim().to_string();
    let path = match &input.existing_path {
        Some(p) => p.clone(),
        None => format!("{}/{}.md", SOURCES_FOLDER, filename),
    };
    let started = if status != SourceStatus::WantToRead { today.clone() } else { String::new() };
    let finished = if status == SourceStatus::Finished { today.clone() } else { String::new() };
    let body = if input.notes.is_empty() {
        "\n# Highlights & Notes\n\n".to_string()
    } else {
        format!("\n# Highlights & Notes\n\n{}\n", input.notes)
    };
    let source = Source { path, title: input.title.clone(), author: input.author.clone(),
        source_type: SourceType::from_str(&input.source_type), status, rating: input.rating,
        started, finished, body };
    save_source(vault_path, &source)?;
    Ok(source)
}

pub fn delete_source(vault_path: &str, source_path: &str) -> Result<(), RememberError> {
    let full_path = Path::new(vault_path).join(source_path);
    if full_path.exists() { std::fs::remove_file(&full_path).map_err(RememberError::Io)?; }
    Ok(())
}

fn parse_source_frontmatter(content: &str) -> (std::collections::HashMap<String, String>, String) {
    let mut meta = std::collections::HashMap::new();
    if !content.starts_with("---") { return (meta, content.to_string()); }
    let rest = &content[3..];
    let end = match rest.find("\n---") { Some(p) => p, None => return (meta, content.to_string()) };
    let yaml = &rest[..end];
    let body = &rest[end + 4..];
    let body = body.strip_prefix('\n').unwrap_or(body);
    for line in yaml.lines() {
        let line = line.trim();
        if let Some(colon) = line.find(':') {
            let key = line[..colon].trim().to_string();
            let val = line[colon + 1..].trim().to_string();
            let val = val.strip_prefix('"').and_then(|s| s.strip_suffix('"')).unwrap_or(&val).to_string();
            meta.insert(key, val);
        }
    }
    (meta, body.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_source_roundtrip() {
        let source = Source {
            path: "Sources/Test Book.md".into(), title: "Test Book".into(),
            author: "Author Name".into(), source_type: SourceType::Book,
            status: SourceStatus::Reading, rating: 4,
            started: "2026-02-01".into(), finished: String::new(),
            body: "\n# Highlights & Notes\n\nSome notes here.\n".into(),
        };
        let md = source.to_markdown();
        let parsed = Source::from_markdown("Sources/Test Book.md", &md).unwrap();
        assert_eq!(parsed.title, "Test Book");
        assert_eq!(parsed.author, "Author Name");
        assert_eq!(parsed.source_type, SourceType::Book);
        assert_eq!(parsed.status, SourceStatus::Reading);
        assert_eq!(parsed.rating, 4);
    }
}
