use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct BacklinkEntry {
    pub source_path: String,
    pub source_name: String,
    pub context: String, // surrounding text
}

/// Get detailed backlink entries for a note (with context)
pub fn get_backlinks_with_context(_vault_path: &str, _note_path: &str) -> Result<Vec<BacklinkEntry>, String> {
    todo!("Wave 2: Implement backlinks with context")
}
