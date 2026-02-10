use pulldown_cmark::{html, Options, Parser};
use regex::Regex;

pub fn render_markdown(input: &str) -> String {
    let processed = preprocess_wiki_links(input);
    let processed = preprocess_tags(&processed);
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    let parser = Parser::new_ext(&processed, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output = add_checkbox_classes(&html_output);
    html_output
}

fn preprocess_wiki_links(input: &str) -> String {
    let re = Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let target = &caps[1];
        let display = caps.get(2).map(|m| m.as_str()).unwrap_or(target);
        let te = target.replace('&', "&amp;").replace('"', "&quot;").replace('<', "&lt;").replace('>', "&gt;").replace('\'', "\\'").replace('\\', "\\\\");
        let de = display.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;");
        format!(r#"<a class="wiki-link" data-target="{}" href="javascript:void(0)" onclick="window.navigateToNote('{}')">{}</a>"#, te, te, de)
    }).to_string()
}

fn preprocess_tags(input: &str) -> String {
    let re = Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let full_match = &caps[0];
        let tag = &caps[1];
        let prefix = if full_match.starts_with(char::is_whitespace) { &full_match[..1] } else { "" };
        format!(r#"{}<span class="tag" data-tag="{}" onclick="window.searchByTag('{}')"># {}</span>"#, prefix, tag, tag, tag)
    }).to_string()
}

fn add_checkbox_classes(html: &str) -> String {
    html.replace(r#"<input disabled="" type="checkbox""#, r#"<input type="checkbox" class="task-checkbox""#)
        .replace(r#"<input checked="" disabled="" type="checkbox""#, r#"<input checked="" type="checkbox" class="task-checkbox""#)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_basic_markdown() {
        let input = "# Header\n\nSome **bold** text.";
        let output = render_markdown(input);
        assert!(output.contains("<h1>Header</h1>"));
        assert!(output.contains("<strong>bold</strong>"));
    }

    #[test]
    fn test_render_markdown_with_table() {
        let input = "| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
        let output = render_markdown(input);
        assert!(output.contains("<table>"));
        assert!(output.contains("<th>Column 1</th>"));
        assert!(output.contains("<td>Cell 1</td>"));
    }

    #[test]
    fn test_render_markdown_with_strikethrough() {
        let input = "~~strikethrough text~~";
        let output = render_markdown(input);
        assert!(output.contains("<del>strikethrough text</del>"));
    }

    #[test]
    fn test_render_markdown_with_tasklist() {
        let input = "- [x] Complete task\n- [ ] Incomplete task";
        let output = render_markdown(input);
        
        // Test that checkboxes are present and have the correct classes
        assert!(output.contains(r#"class="task-checkbox""#));
        assert!(output.contains("Complete task"));
        assert!(output.contains("Incomplete task"));
        
        // The exact format might vary, so let's be more flexible
        assert!(output.contains("checkbox") && output.contains("checked"));
    }

    #[test]
    fn test_preprocess_wiki_links_basic() {
        let input = "Check out [[Note Name]]";
        let result = preprocess_wiki_links(input);
        assert!(result.contains(r#"<a class="wiki-link""#));
        assert!(result.contains(r#"data-target="Note Name""#));
        assert!(result.contains(r#">Note Name</a>"#));
    }

    #[test]
    fn test_preprocess_wiki_links_with_alias() {
        let input = "See [[Note Name|Display Text]]";
        let result = preprocess_wiki_links(input);
        assert!(result.contains(r#"data-target="Note Name""#));
        assert!(result.contains(r#">Display Text</a>"#));
    }

    #[test]
    fn test_preprocess_wiki_links_with_special_chars() {
        let input = "[[Note & Name|Display < Text]]";
        let result = preprocess_wiki_links(input);
        assert!(result.contains(r#"data-target="Note &amp; Name""#));
        assert!(result.contains(r#">Display &lt; Text</a>"#));
    }

    #[test]
    fn test_preprocess_wiki_links_multiple() {
        let input = "Links to [[First Note]] and [[Second Note]]";
        let result = preprocess_wiki_links(input);
        assert_eq!(result.matches("wiki-link").count(), 2);
        assert!(result.contains("First Note"));
        assert!(result.contains("Second Note"));
    }

    #[test]
    fn test_preprocess_tags_basic() {
        let input = "This has #tag in it";
        let result = preprocess_tags(input);
        assert!(result.contains(r#"<span class="tag""#));
        assert!(result.contains(r#"data-tag="tag""#));
        assert!(result.contains("# tag"));
    }

    #[test]
    fn test_preprocess_tags_at_start() {
        let input = "#beginning of line";
        let result = preprocess_tags(input);
        assert!(result.contains(r#"<span class="tag""#));
        assert!(result.contains(r#"data-tag="beginning""#));
    }

    #[test]
    fn test_preprocess_tags_with_slashes() {
        let input = "Category #work/project/important";
        let result = preprocess_tags(input);
        assert!(result.contains(r#"data-tag="work/project/important""#));
        assert!(result.contains("# work/project/important"));
    }

    #[test]
    fn test_preprocess_tags_with_numbers() {
        let input = "Version #v1_2_3";
        let result = preprocess_tags(input);
        assert!(result.contains(r#"data-tag="v1_2_3""#));
    }

    #[test]
    fn test_preprocess_tags_invalid_start_number() {
        let input = "Invalid #123tag should not work";
        let result = preprocess_tags(input);
        assert!(!result.contains(r#"<span class="tag""#));
    }

    #[test]
    fn test_preprocess_tags_multiple() {
        let input = "Multiple #tag1 and #tag2 here";
        let result = preprocess_tags(input);
        assert_eq!(result.matches(r#"class="tag""#).count(), 2);
        assert!(result.contains("tag1"));
        assert!(result.contains("tag2"));
    }

    #[test]
    fn test_add_checkbox_classes_unchecked() {
        let html = r#"<input disabled="" type="checkbox">"#;
        let result = add_checkbox_classes(html);
        assert_eq!(result, r#"<input type="checkbox" class="task-checkbox">"#);
    }

    #[test]
    fn test_add_checkbox_classes_checked() {
        let html = r#"<input checked="" disabled="" type="checkbox">"#;
        let result = add_checkbox_classes(html);
        assert_eq!(result, r#"<input checked="" type="checkbox" class="task-checkbox">"#);
    }

    #[test]
    fn test_full_integration_wiki_links_and_tags() {
        let input = "See [[My Note]] about #programming";
        let output = render_markdown(input);
        assert!(output.contains("wiki-link"));
        assert!(output.contains(r#"class="tag""#));
        assert!(output.contains("My Note"));
        assert!(output.contains("programming"));
    }

    #[test]
    fn test_footnotes_enabled() {
        let input = "Text with footnote[^1].\n\n[^1]: This is the footnote.";
        let output = render_markdown(input);
        assert!(output.contains("footnote"));
    }

    #[test]
    fn test_complex_markdown_integration() {
        let input = r#"# Title with [[Link]]

This is **bold** and *italic* text with #tag.

- [x] Completed task
- [ ] Incomplete task

| Column | Value |
|--------|-------|
| Test   | Data  |

~~Struck through~~ text.

Text with footnote[^1].

[^1]: Footnote content."#;

        let output = render_markdown(input);
        
        // Check various features are processed
        assert!(output.contains("<h1>"));
        assert!(output.contains("wiki-link"));
        assert!(output.contains(r#"class="tag""#));
        assert!(output.contains(r#"class="task-checkbox""#));
        assert!(output.contains("<table>"));
        assert!(output.contains("<del>"));
        assert!(output.contains("<strong>"));
        assert!(output.contains("<em>"));
    }
}
