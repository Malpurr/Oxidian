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
