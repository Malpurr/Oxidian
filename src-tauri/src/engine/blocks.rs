use rand::Rng;
use serde::Serialize;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
pub struct BlockResult {
    pub note_path: String,
    pub block_id: String,
    pub content: String,
    pub line_number: usize,
}

/// Generate a random 6-character alphanumeric block ID
pub fn generate_block_id() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
    (0..6).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}

/// Find a block by its ID across the entire vault.
/// Block IDs appear as `^block-id` at the end of a line (paragraph, list item, etc.)
pub fn find_block_by_id(vault_path: &str, block_id: &str) -> Option<BlockResult> {
    let marker = format!("^{}", block_id);
    
    for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(path) {
                for (i, line) in content.lines().enumerate() {
                    let trimmed = line.trim_end();
                    if trimmed.ends_with(&marker) || trimmed == marker {
                        let relative = path.strip_prefix(vault_path)
                            .unwrap_or(path)
                            .to_string_lossy()
                            .to_string();
                        
                        let block_content = extract_block_content(&content, i);
                        
                        return Some(BlockResult {
                            note_path: relative,
                            block_id: block_id.to_string(),
                            content: block_content,
                            line_number: i + 1,
                        });
                    }
                }
            }
        }
    }
    None
}

/// Get block content from a specific note by block ID
pub fn get_block_content(vault_path: &str, note_path: &str, block_id: &str) -> Result<String, String> {
    let full_path = Path::new(vault_path).join(note_path);
    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read {}: {}", note_path, e))?;
    
    let marker = format!("^{}", block_id);
    
    for (i, line) in content.lines().enumerate() {
        let trimmed = line.trim_end();
        if trimmed.ends_with(&marker) || trimmed == marker {
            return Ok(extract_block_content(&content, i));
        }
    }
    
    Err(format!("Block ^{} not found in {}", block_id, note_path))
}

/// List all block IDs in a specific note
pub fn list_block_ids(vault_path: &str, note_path: &str) -> Result<Vec<BlockResult>, String> {
    let full_path = Path::new(vault_path).join(note_path);
    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read {}: {}", note_path, e))?;
    
    let mut results = Vec::new();
    let re = regex::Regex::new(r"\^([a-zA-Z0-9][\w-]*)$").unwrap();
    
    for (i, line) in content.lines().enumerate() {
        let trimmed = line.trim_end();
        if let Some(caps) = re.captures(trimmed) {
            let block_id = caps.get(1).unwrap().as_str().to_string();
            results.push(BlockResult {
                note_path: note_path.to_string(),
                block_id: block_id.clone(),
                content: extract_block_content(&content, i),
                line_number: i + 1,
            });
        }
    }
    
    Ok(results)
}

/// List all block IDs across the entire vault
pub fn list_all_block_ids(vault_path: &str) -> Vec<BlockResult> {
    let mut results = Vec::new();
    let re = regex::Regex::new(r"\^([a-zA-Z0-9][\w-]*)$").unwrap();
    
    for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(path) {
                let relative = path.strip_prefix(vault_path)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .to_string();
                
                for (i, line) in content.lines().enumerate() {
                    let trimmed = line.trim_end();
                    if let Some(caps) = re.captures(trimmed) {
                        let block_id = caps.get(1).unwrap().as_str().to_string();
                        results.push(BlockResult {
                            note_path: relative.clone(),
                            block_id,
                            content: extract_block_content(&content, i),
                            line_number: i + 1,
                        });
                    }
                }
            }
        }
    }
    
    results
}

/// Extract the block content (the paragraph/list-item containing the block ID marker).
/// Walks backwards from the marker line to find the start of the block, then collects
/// all lines until the next blank line or block boundary.
fn extract_block_content(content: &str, marker_line: usize) -> String {
    let lines: Vec<&str> = content.lines().collect();
    
    // Find start of this block (walk backwards until blank line or start)
    let mut start = marker_line;
    while start > 0 {
        let prev = lines[start - 1].trim();
        if prev.is_empty() {
            break;
        }
        // Stop at headings (they start their own block)
        if prev.starts_with('#') && start != marker_line {
            break;
        }
        start -= 1;
    }
    
    // Collect block lines, stripping the ^block-id marker from the last line
    let block_lines: Vec<&str> = lines[start..=marker_line].to_vec();
    let mut result: Vec<String> = block_lines.iter().map(|l| l.to_string()).collect();
    
    // Remove the ^block-id from the last line
    if let Some(last) = result.last_mut() {
        if let Some(pos) = last.rfind(" ^") {
            *last = last[..pos].to_string();
        } else if last.trim().starts_with('^') {
            // The whole line is just the block ID — use preceding content
            result.pop();
        }
    }
    
    result.join("\n").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_block_id() {
        let id = generate_block_id();
        assert_eq!(id.len(), 6);
        assert!(id.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_extract_block_content() {
        let content = "# Heading\n\nThis is a paragraph with some text ^abc123";
        let result = extract_block_content(content, 2);
        assert_eq!(result, "This is a paragraph with some text");
    }

    #[test]
    fn test_extract_block_content_multiline() {
        let content = "# Heading\n\nFirst line\nSecond line ^def456";
        let result = extract_block_content(content, 3);
        assert_eq!(result, "First line\nSecond line");
    }
}
