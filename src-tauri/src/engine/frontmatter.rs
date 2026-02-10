use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Frontmatter {
    pub title: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub created: Option<String>,
    pub modified: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

pub fn parse_frontmatter(content: &str) -> Result<(Option<Frontmatter>, &str), String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") { return Ok((None, content)); }
    let after_opening = &trimmed[3..];
    if let Some(end_pos) = after_opening.find("\n---") {
        let yaml_str = &after_opening[..end_pos];
        let body_start = 3 + end_pos + 4;
        let fm: Frontmatter = serde_yaml::from_str(yaml_str)
            .map_err(|e| format!("Failed to parse frontmatter YAML: {}", e))?;
        let offset = content.len() - trimmed.len();
        let body_ref = &content[(offset + body_start)..];
        let body_ref = body_ref.trim_start_matches('\n');
        Ok((Some(fm), body_ref))
    } else {
        Ok((None, content))
    }
}

pub fn serialize_frontmatter(fm: &Frontmatter, body: &str) -> String {
    match serde_yaml::to_string(fm) {
        Ok(yaml) => format!("---\n{}---\n\n{}", yaml, body),
        Err(_) => body.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter_none() {
        let content = "Just plain content without frontmatter";
        let result = parse_frontmatter(content).unwrap();
        assert!(result.0.is_none());
        assert_eq!(result.1, content);
    }

    #[test]
    fn test_parse_frontmatter_empty() {
        let content = "---\n---\n\nContent after empty frontmatter";
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert!(fm.title.is_none());
        assert!(fm.tags.is_empty());
        assert!(fm.aliases.is_empty());
        assert_eq!(result.1, "Content after empty frontmatter");
    }

    #[test]
    fn test_parse_frontmatter_basic() {
        let content = "---\ntitle: Test Note\ntags: [tag1, tag2]\naliases: [alias1]\n---\n\nContent here";
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.title, Some("Test Note".to_string()));
        assert_eq!(fm.tags, vec!["tag1", "tag2"]);
        assert_eq!(fm.aliases, vec!["alias1"]);
        assert_eq!(result.1, "Content here");
    }

    #[test]
    fn test_parse_frontmatter_with_dates() {
        let content = "---\ntitle: Test\ncreated: 2023-01-01\nmodified: 2023-01-02\n---\n\nBody";
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.created, Some("2023-01-01".to_string()));
        assert_eq!(fm.modified, Some("2023-01-02".to_string()));
    }

    #[test]
    fn test_parse_frontmatter_with_extra_fields() {
        let content = r#"---
title: Test
custom_field: "custom value"
number_field: 42
boolean_field: true
---

Content"#;
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.title, Some("Test".to_string()));
        assert!(fm.extra.contains_key("custom_field"));
        assert!(fm.extra.contains_key("number_field"));
        assert!(fm.extra.contains_key("boolean_field"));
    }

    #[test]
    fn test_parse_frontmatter_malformed_yaml() {
        let content = "---\ninvalid: yaml: structure:\n  - broken\n---\n\nContent";
        let result = parse_frontmatter(content);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to parse frontmatter YAML"));
    }

    #[test]
    fn test_parse_frontmatter_no_closing_delimiter() {
        let content = "---\ntitle: Test\nNo closing delimiter\n\nContent";
        let result = parse_frontmatter(content).unwrap();
        assert!(result.0.is_none());
        assert_eq!(result.1, content);
    }

    #[test]
    fn test_parse_frontmatter_whitespace_handling() {
        let content = "   ---\ntitle: Test\n---\n\n\n  Content with leading newlines";
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.title, Some("Test".to_string()));
        assert_eq!(result.1, "  Content with leading newlines");
    }

    #[test]
    fn test_parse_frontmatter_complex_tags() {
        let content = r#"---
tags:
  - programming/rust
  - notes/personal
  - work/project-x
---

Content"#;
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.tags, vec!["programming/rust", "notes/personal", "work/project-x"]);
    }

    #[test]
    fn test_parse_frontmatter_complex_aliases() {
        let content = r#"---
aliases:
  - "Long Alias Name"
  - "Another Alias"
  - simple_alias
---

Content"#;
        let result = parse_frontmatter(content).unwrap();
        let fm = result.0.unwrap();
        assert_eq!(fm.aliases, vec!["Long Alias Name", "Another Alias", "simple_alias"]);
    }

    #[test]
    fn test_serialize_frontmatter_basic() {
        let mut fm = Frontmatter::default();
        fm.title = Some("Test Note".to_string());
        fm.tags = vec!["tag1".to_string(), "tag2".to_string()];
        let body = "Content here";
        let result = serialize_frontmatter(&fm, body);
        
        assert!(result.starts_with("---\n"));
        assert!(result.contains("title: Test Note"));
        assert!(result.contains("tags:"));
        assert!(result.contains("tag1"));
        assert!(result.contains("tag2"));
        assert!(result.ends_with("Content here"));
    }

    #[test]
    fn test_serialize_frontmatter_empty() {
        let fm = Frontmatter::default();
        let body = "Just content";
        let result = serialize_frontmatter(&fm, body);
        
        assert!(result.starts_with("---\n"));
        assert!(result.ends_with("Just content"));
    }

    #[test]
    fn test_serialize_frontmatter_with_extra() {
        let mut fm = Frontmatter::default();
        fm.title = Some("Test".to_string());
        fm.extra.insert("custom".to_string(), serde_json::json!("value"));
        fm.extra.insert("number".to_string(), serde_json::json!(42));
        let body = "Content";
        let result = serialize_frontmatter(&fm, body);
        
        assert!(result.contains("title: Test"));
        assert!(result.contains("custom: value"));
        assert!(result.contains("number: 42"));
    }

    #[test]
    fn test_roundtrip_frontmatter() {
        let original = r#"---
title: Roundtrip Test
tags: [test, roundtrip]
created: 2023-01-01
custom: value
---

Original content"#;

        let (fm, body) = parse_frontmatter(original).unwrap();
        let fm = fm.unwrap();
        let serialized = serialize_frontmatter(&fm, body);
        
        // Parse again to verify roundtrip
        let (fm2, body2) = parse_frontmatter(&serialized).unwrap();
        let fm2 = fm2.unwrap();
        
        assert_eq!(fm.title, fm2.title);
        assert_eq!(fm.tags, fm2.tags);
        assert_eq!(fm.created, fm2.created);
        assert_eq!(body, body2);
    }
}
