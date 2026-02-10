use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct LinkTarget {
    pub path: String,
    pub display: String,
    pub exists: bool,
}

pub fn resolve_wikilink(_vault_path: &str, _link: &str) -> Result<Vec<LinkTarget>, String> {
    todo!("Wave 2: Implement wikilink resolution")
}

pub fn extract_outgoing_links(content: &str) -> Vec<String> {
    crate::engine::vault::extract_wiki_links(content)
}
