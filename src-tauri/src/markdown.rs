use pulldown_cmark::{html, Options, Parser};
use regex::Regex;

/// Render markdown to HTML with wiki-link and tag support
pub fn render_markdown(input: &str) -> String {
    // Pre-process: convert wiki-links to HTML before markdown parsing
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
    
    // Post-process to add checkbox interactivity classes
    html_output = add_checkbox_classes(&html_output);
    
    html_output
}

/// Convert [[wiki-links]] to clickable HTML links
fn preprocess_wiki_links(input: &str) -> String {
    let re = Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let target = &caps[1];
        let display = caps.get(2).map(|m| m.as_str()).unwrap_or(target);
        // Escape for safe insertion into HTML attributes and JS string literals
        let target_escaped = target
            .replace('&', "&amp;")
            .replace('"', "&quot;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('\'', "\\'")
            .replace('\\', "\\\\");
        let display_escaped = display
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;");
        format!(
            r#"<a class="wiki-link" data-target="{}" href="javascript:void(0)" onclick="window.navigateToNote('{}')">{}</a>"#,
            target_escaped, target_escaped, display_escaped
        )
    })
    .to_string()
}

/// Convert #tags to clickable tag elements
fn preprocess_tags(input: &str) -> String {
    let re = Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap();
    re.replace_all(input, |caps: &regex::Captures| {
        let full_match = &caps[0];
        let tag = &caps[1];
        let prefix = if full_match.starts_with(char::is_whitespace) {
            &full_match[..1]
        } else {
            ""
        };
        format!(
            r#"{}<span class="tag" data-tag="{}" onclick="window.searchByTag('{}')"># {}</span>"#,
            prefix, tag, tag, tag
        )
    })
    .to_string()
}

/// Add interactive classes to checkboxes
fn add_checkbox_classes(html: &str) -> String {
    html.replace(
        r#"<input disabled="" type="checkbox""#,
        r#"<input type="checkbox" class="task-checkbox""#,
    )
    .replace(
        r#"<input checked="" disabled="" type="checkbox""#,
        r#"<input checked="" type="checkbox" class="task-checkbox""#,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_markdown() {
        let result = render_markdown("# Hello\n\nWorld");
        assert!(result.contains("<h1>Hello</h1>"));
        assert!(result.contains("<p>World</p>"));
    }

    #[test]
    fn test_wiki_links() {
        let result = render_markdown("Check [[My Note]] here");
        assert!(result.contains("wiki-link"));
        assert!(result.contains("My Note"));
    }

    #[test]
    fn test_wiki_links_with_alias() {
        let result = render_markdown("See [[My Note|custom text]]");
        assert!(result.contains("custom text"));
        assert!(result.contains("My Note"));
    }

    #[test]
    fn test_tags() {
        let result = render_markdown("This is #important");
        assert!(result.contains("tag"));
        assert!(result.contains("important"));
    }

    #[test]
    fn test_task_lists() {
        let result = render_markdown("- [ ] Todo\n- [x] Done");
        assert!(result.contains("task-checkbox"));
    }
}
