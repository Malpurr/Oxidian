use std::fs;
use std::path::Path;
use std::sync::LazyLock;
use walkdir::WalkDir;
use serde::Serialize;

/// Returns the default vault path (~/.oxidian/vault/)
pub fn default_vault_path() -> String {
    let home = dirs::home_dir().expect("Could not find home directory");
    let vault = home.join(".oxidian").join("vault");
    vault.to_string_lossy().to_string()
}

#[derive(Debug, Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

/// Build a recursive file tree for the vault
pub fn build_file_tree(root: &str) -> Vec<FileNode> {
    let root_path = Path::new(root);
    if !root_path.exists() {
        return vec![];
    }
    build_tree_recursive(root_path, root)
}

fn build_tree_recursive(dir: &Path, vault_root: &str) -> Vec<FileNode> {
    let mut nodes: Vec<FileNode> = Vec::new();
    
    let mut entries: Vec<_> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
        Err(_) => return nodes,
    };
    
    entries.sort_by(|a, b| {
        let a_is_dir = a.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        let b_is_dir = b.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        b_is_dir.cmp(&a_is_dir).then_with(|| a.file_name().cmp(&b.file_name()))
    });
    
    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        
        // Skip hidden files and the search index directory
        if name.starts_with('.') || name == "search_index" {
            continue;
        }
        
        let relative = path.strip_prefix(vault_root)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();
        
        if path.is_dir() {
            let children = build_tree_recursive(&path, vault_root);
            nodes.push(FileNode {
                name,
                path: relative,
                is_dir: true,
                children,
            });
        } else if name.ends_with(".md") {
            nodes.push(FileNode {
                name,
                path: relative,
                is_dir: false,
                children: vec![],
            });
        }
    }
    
    nodes
}

/// Validate that a relative path doesn't escape the vault via path traversal
fn validate_path(vault_path: &str, relative_path: &str) -> Result<std::path::PathBuf, String> {
    let vault_canonical = Path::new(vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;
    let full_path = Path::new(vault_path).join(relative_path);
    
    // For new files that don't exist yet, check the parent directory
    let check_path = if full_path.exists() {
        full_path.canonicalize()
            .map_err(|e| format!("Invalid path: {}", e))?
    } else {
        // Normalize by resolving what we can, then check for ..
        let normalized = full_path.to_string_lossy().to_string();
        if normalized.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }
        full_path.clone()
    };
    
    if !check_path.starts_with(&vault_canonical) {
        return Err("Path traversal not allowed: path escapes vault".to_string());
    }
    
    Ok(full_path)
}

/// Sanitize a filename by removing characters that are invalid on most OS filesystems
pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 32 => '_', // control characters
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Read a note file from the vault
pub fn read_note(vault_path: &str, relative_path: &str) -> Result<String, String> {
    let full_path = validate_path(vault_path, relative_path)?;
    fs::read_to_string(&full_path).map_err(|e| format!("Failed to read note: {}", e))
}

/// Save a note file to the vault
pub fn save_note(vault_path: &str, relative_path: &str, content: &str) -> Result<(), String> {
    // Sanitize the filename portion of the path
    let sanitized_path = if let Some(idx) = relative_path.rfind('/') {
        let (dir, filename) = relative_path.split_at(idx + 1);
        format!("{}{}", dir, sanitize_filename(filename))
    } else {
        sanitize_filename(relative_path)
    };
    let relative_path = &sanitized_path;
    let full_path = validate_path(vault_path, relative_path)?;
    
    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    fs::write(&full_path, content).map_err(|e| format!("Failed to save note: {}", e))
}

/// Delete a note file or folder from the vault
pub fn delete_note(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let full_path = validate_path(vault_path, relative_path)?;
    if full_path.is_dir() {
        fs::remove_dir_all(&full_path).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&full_path).map_err(|e| format!("Failed to delete note: {}", e))
    }
}

/// Create a folder in the vault
pub fn create_folder(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let full_path = validate_path(vault_path, relative_path)?;
    fs::create_dir_all(&full_path).map_err(|e| format!("Failed to create folder: {}", e))
}

/// Rename a file or folder
pub fn rename_file(vault_path: &str, old_path: &str, new_path: &str) -> Result<(), String> {
    let old_full = validate_path(vault_path, old_path)?;
    let new_full = validate_path(vault_path, new_path)?;
    fs::rename(&old_full, &new_full).map_err(|e| format!("Failed to rename: {}", e))
}

static TAG_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap()
});

static WIKI_LINK_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap()
});

/// Extract all tags (#tag) from content
pub fn extract_tags(content: &str) -> Vec<String> {
    let mut tags: Vec<String> = TAG_RE.captures_iter(content)
        .map(|c| c[1].to_string())
        .collect();
    tags.sort();
    tags.dedup();
    tags
}

/// Extract all wiki-links [[target]] from content
pub fn extract_wiki_links(content: &str) -> Vec<String> {
    let mut links: Vec<String> = WIKI_LINK_RE.captures_iter(content)
        .map(|c| c[1].to_string())
        .collect();
    links.sort();
    links.dedup();
    links
}

/// Find all notes that link to a given note (backlinks)
pub fn find_backlinks(vault_path: &str, target_note: &str) -> Vec<String> {
    let target_name = Path::new(target_note)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    let mut backlinks = Vec::new();
    
    for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                let links = extract_wiki_links(&content);
                if links.iter().any(|link| {
                    link == &target_name || link.ends_with(&format!("/{}", target_name))
                }) {
                    let relative = entry.path()
                        .strip_prefix(vault_path)
                        .unwrap_or(entry.path())
                        .to_string_lossy()
                        .to_string();
                    backlinks.push(relative);
                }
            }
        }
    }
    
    backlinks
}

/// Collect all unique tags across the vault
pub fn collect_all_tags(vault_path: &str) -> Vec<String> {
    let mut all_tags = Vec::new();
    
    for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                all_tags.extend(extract_tags(&content));
            }
        }
    }
    
    all_tags.sort();
    all_tags.dedup();
    all_tags
}
