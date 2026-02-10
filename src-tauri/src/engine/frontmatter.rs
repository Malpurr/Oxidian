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
