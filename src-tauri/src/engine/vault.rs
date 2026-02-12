use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;
use std::time::SystemTime;

use chrono::{DateTime, Utc};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

// ─── Public Types ────────────────────────────────────────────────────

/// A single entry in the vault file tree (sent to the frontend).
/// Kept as `FileNode` for backward compat with commands & JS (`list_files`).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<FileMetadata>,
}

/// Rich metadata for a single file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub size_bytes: u64,
    pub modified: Option<String>,
    pub tags: Vec<String>,
    pub links: Vec<String>,
    pub word_count: usize,
}

/// An entry in the recent-files list.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecentEntry {
    pub path: String,
    pub opened_at: String,
}

/// Cached vault tree – call `scan()` once, then `incremental_update` on FS events.
#[derive(Debug, Clone)]
pub struct VaultTree {
    pub root: Vec<FileNode>,
    pub metadata: HashMap<String, FileMetadata>,
}

// ─── Constants ───────────────────────────────────────────────────────

const TRASH_DIR: &str = ".trash";
const OXIDIAN_DIR: &str = ".oxidian";
const RECENT_FILE: &str = "recent.json";
const MAX_RECENT: usize = 50;

// ─── Regex (lazy static) ────────────────────────────────────────────

static TAG_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap()
});
static WIKI_LINK_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap()
});

// ─── Default vault path ─────────────────────────────────────────────

pub fn default_vault_path() -> String {
    match dirs::home_dir() {
        Some(home) => home.join(".oxidian").join("vault").to_string_lossy().to_string(),
        None => {
            // Fallback for Android/environments where home_dir is unavailable.
            // The caller (lib.rs setup) should override this with the app data dir.
            "/data/local/tmp/.oxidian/vault".to_string()
        }
    }
}

/// Build a vault path using a custom base directory (used on mobile).
pub fn vault_path_with_base(base: &std::path::Path) -> String {
    base.join("vault").to_string_lossy().to_string()
}

// ─── Path helpers ────────────────────────────────────────────────────

fn validate_path(vault_path: &str, relative_path: &str) -> Result<PathBuf, String> {
    let vault_canonical = Path::new(vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;
    let full_path = vault_canonical.join(relative_path);
    let check_path = if full_path.exists() {
        full_path
            .canonicalize()
            .map_err(|e| format!("Invalid path: {}", e))?
    } else {
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

pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 32 => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

fn oxidian_dir(vault_path: &str) -> PathBuf {
    Path::new(vault_path).join(OXIDIAN_DIR)
}

fn trash_dir(vault_path: &str) -> PathBuf {
    Path::new(vault_path).join(TRASH_DIR)
}

// ─── Extraction helpers ──────────────────────────────────────────────

pub fn extract_tags(content: &str) -> Vec<String> {
    // Strip frontmatter and code blocks before extracting tags
    static CODE_BLOCK_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
        regex::Regex::new(r"(?s)```.*?```|`[^`\n]+`").unwrap()
    });
    static FRONTMATTER_RE: LazyLock<regex::Regex> = LazyLock::new(|| {
        regex::Regex::new(r"(?s)\A---\n.*?\n---\n?").unwrap()
    });
    let stripped = FRONTMATTER_RE.replace(content, "");
    let stripped = CODE_BLOCK_RE.replace_all(&stripped, "");
    let mut tags: Vec<String> = TAG_RE
        .captures_iter(&stripped)
        .map(|c| c[1].to_string())
        .collect();
    tags.sort();
    tags.dedup();
    tags
}

pub fn extract_wiki_links(content: &str) -> Vec<String> {
    let mut links: Vec<String> = WIKI_LINK_RE
        .captures_iter(content)
        .map(|c| c[1].to_string())
        .collect();
    links.sort();
    links.dedup();
    links
}

fn word_count(content: &str) -> usize {
    content.split_whitespace().count()
}

fn build_file_metadata(content: &str, size: u64, modified: Option<SystemTime>) -> FileMetadata {
    let modified_str = modified.and_then(|t| {
        let dt: DateTime<Utc> = t.into();
        Some(dt.to_rfc3339())
    });
    FileMetadata {
        size_bytes: size,
        modified: modified_str,
        tags: extract_tags(content),
        links: extract_wiki_links(content),
        word_count: word_count(content),
    }
}

fn metadata_from_path(path: &Path) -> Option<FileMetadata> {
    if path.extension().map(|e| e == "md").unwrap_or(false) {
        let content = fs::read_to_string(path).unwrap_or_default();
        let meta = fs::metadata(path).ok()?;
        Some(build_file_metadata(
            &content,
            meta.len(),
            meta.modified().ok(),
        ))
    } else {
        let meta = fs::metadata(path).ok()?;
        Some(FileMetadata {
            size_bytes: meta.len(),
            modified: meta.modified().ok().map(|t| {
                let dt: DateTime<Utc> = t.into();
                dt.to_rfc3339()
            }),
            tags: vec![],
            links: vec![],
            word_count: 0,
        })
    }
}

// ─── File tree scanning ──────────────────────────────────────────────

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
        b_is_dir
            .cmp(&a_is_dir)
            .then_with(|| a.file_name().cmp(&b.file_name()))
    });
    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || name == "search_index" {
            continue;
        }
        let relative = path
            .strip_prefix(vault_root)
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
                metadata: None,
            });
        } else if name.ends_with(".md") {
            nodes.push(FileNode {
                name,
                path: relative,
                is_dir: false,
                children: vec![],
                metadata: None,
            });
        }
    }
    nodes
}

/// Full directory scan that also collects metadata into a `VaultTree`.
pub fn scan_vault(vault_path: &str) -> VaultTree {
    let root = build_file_tree(vault_path);
    let mut metadata = HashMap::new();
    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Skip hidden dirs, but not the vault root itself
            !(e.depth() > 0 && e.file_type().is_dir() && name.starts_with('.'))
        })
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.is_file() {
            let relative = path
                .strip_prefix(vault_path)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();
            if let Some(m) = metadata_from_path(path) {
                metadata.insert(relative, m);
            }
        }
    }
    VaultTree { root, metadata }
}

// ─── CRUD operations ─────────────────────────────────────────────────

pub fn read_note(vault_path: &str, relative_path: &str) -> Result<String, String> {
    let full_path = validate_path(vault_path, relative_path)?;
    fs::read_to_string(&full_path).map_err(|e| format!("Failed to read note: {}", e))
}

pub fn save_note(vault_path: &str, relative_path: &str, content: &str) -> Result<(), String> {
    let sanitized_path = if let Some(idx) = relative_path.rfind('/') {
        let (dir, filename) = relative_path.split_at(idx + 1);
        format!("{}{}", dir, sanitize_filename(filename))
    } else {
        sanitize_filename(relative_path)
    };
    let full_path = validate_path(vault_path, &sanitized_path)?;
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::write(&full_path, content).map_err(|e| format!("Failed to save note: {}", e))
}

pub fn delete_note(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let full_path = validate_path(vault_path, relative_path)?;
    if full_path.is_dir() {
        fs::remove_dir_all(&full_path).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&full_path).map_err(|e| format!("Failed to delete note: {}", e))
    }
}

pub fn create_folder(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let full_path = validate_path(vault_path, relative_path)?;
    fs::create_dir_all(&full_path).map_err(|e| format!("Failed to create folder: {}", e))
}

pub fn rename_file(vault_path: &str, old_path: &str, new_path: &str) -> Result<(), String> {
    let old_full = validate_path(vault_path, old_path)?;
    let new_full = validate_path(vault_path, new_path)?;
    if let Some(parent) = new_full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {}", e))?;
    }
    fs::rename(&old_full, &new_full).map_err(|e| format!("Failed to rename: {}", e))
}

/// Rename a file and invoke `link_updater` for every file that links to the old name.
pub fn rename_with_link_update<F>(
    vault_path: &str,
    old_path: &str,
    new_path: &str,
    link_updater: F,
) -> Result<(), String>
where
    F: Fn(&str, &str, &str) -> Result<(), String>,
{
    // First do the rename
    rename_file(vault_path, old_path, new_path)?;

    let old_name = Path::new(old_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let new_name = Path::new(new_path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    if old_name == new_name {
        return Ok(());
    }

    // Walk vault and update links
    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            let relative = path
                .strip_prefix(vault_path)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();
            if relative == new_path {
                continue;
            }
            if let Ok(content) = fs::read_to_string(path) {
                let links = extract_wiki_links(&content);
                if links.iter().any(|l| l == &old_name || l.ends_with(&format!("/{}", old_name))) {
                    link_updater(&relative, &old_name, &new_name)?;
                }
            }
        }
    }
    Ok(())
}

/// Move a file or folder to a new parent directory.
pub fn move_entry(
    vault_path: &str,
    source_path: &str,
    dest_dir: &str,
) -> Result<String, String> {
    let source_full = validate_path(vault_path, source_path)?;
    let file_name = source_full
        .file_name()
        .ok_or("No file name")?
        .to_string_lossy()
        .to_string();
    let new_relative = if dest_dir.is_empty() {
        file_name.clone()
    } else {
        format!("{}/{}", dest_dir, file_name)
    };
    let dest_full = validate_path(vault_path, &new_relative)?;
    if let Some(parent) = dest_full.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dest dir: {}", e))?;
    }
    fs::rename(&source_full, &dest_full).map_err(|e| format!("Failed to move: {}", e))?;
    Ok(new_relative)
}

/// Move a file/folder to the `.trash/` directory instead of deleting.
pub fn trash_entry(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let source_full = validate_path(vault_path, relative_path)?;
    let trash = trash_dir(vault_path);
    fs::create_dir_all(&trash).map_err(|e| format!("Failed to create trash dir: {}", e))?;

    let file_name = source_full
        .file_name()
        .ok_or("No file name")?
        .to_string_lossy()
        .to_string();

    // Avoid collisions by appending timestamp
    let dest = if trash.join(&file_name).exists() {
        let ts = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
        let stem = Path::new(&file_name)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let ext = Path::new(&file_name)
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        trash.join(format!("{}_{}{}", stem, ts, ext))
    } else {
        trash.join(&file_name)
    };

    fs::rename(&source_full, &dest).map_err(|e| format!("Failed to trash: {}", e))
}

// ─── Recent files ────────────────────────────────────────────────────

fn recent_file_path(vault_path: &str) -> PathBuf {
    oxidian_dir(vault_path).join(RECENT_FILE)
}

pub fn load_recent_files(vault_path: &str) -> Vec<RecentEntry> {
    let path = recent_file_path(vault_path);
    if let Ok(data) = fs::read_to_string(&path) {
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    }
}

pub fn add_recent_file(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let mut recent = load_recent_files(vault_path);

    // Remove existing entry for this path
    recent.retain(|e| e.path != relative_path);

    // Prepend
    recent.insert(
        0,
        RecentEntry {
            path: relative_path.to_string(),
            opened_at: chrono::Utc::now().to_rfc3339(),
        },
    );

    // Truncate
    recent.truncate(MAX_RECENT);

    let dir = oxidian_dir(vault_path);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create .oxidian: {}", e))?;
    let json =
        serde_json::to_string_pretty(&recent).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(recent_file_path(vault_path), json)
        .map_err(|e| format!("Failed to write recent files: {}", e))
}

pub fn clear_recent_files(vault_path: &str) -> Result<(), String> {
    let path = recent_file_path(vault_path);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to clear recent: {}", e))?;
    }
    Ok(())
}

// ─── Backlinks / Tags (vault-walk versions for non-cached usage) ─────

pub fn find_backlinks(vault_path: &str, target_note: &str) -> Vec<String> {
    let target_name = Path::new(target_note)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let mut backlinks = Vec::new();
    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.path().extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                let links = extract_wiki_links(&content);
                if links
                    .iter()
                    .any(|link| link == &target_name || link.ends_with(&format!("/{}", target_name)))
                {
                    let relative = entry
                        .path()
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

pub fn collect_all_tags(vault_path: &str) -> Vec<String> {
    let mut all_tags = Vec::new();
    for entry in WalkDir::new(vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
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

// ─── File metadata cache ─────────────────────────────────────────────

impl VaultTree {
    pub fn new() -> Self {
        VaultTree {
            root: vec![],
            metadata: HashMap::new(),
        }
    }

    /// Rebuild everything from scratch.
    pub fn scan(&mut self, vault_path: &str) {
        let scanned = scan_vault(vault_path);
        self.root = scanned.root;
        self.metadata = scanned.metadata;
    }

    /// Update a single file in the metadata cache.
    pub fn update_file(&mut self, vault_path: &str, relative_path: &str) {
        let full = Path::new(vault_path).join(relative_path);
        if let Some(m) = metadata_from_path(&full) {
            self.metadata.insert(relative_path.to_string(), m);
        }
    }

    /// Remove a file from the metadata cache.
    pub fn remove_file(&mut self, relative_path: &str) {
        self.metadata.remove(relative_path);
    }

    /// Incremental update: handle a single FS event.
    pub fn handle_event(&mut self, vault_path: &str, event: &notify::Event) {
        use notify::EventKind;
        match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) => {
                for path in &event.paths {
                    if let Ok(rel) = path.strip_prefix(vault_path) {
                        let rel_str = rel.to_string_lossy().to_string();
                        self.update_file(vault_path, &rel_str);
                    }
                }
                // Rebuild the tree structure on create
                if matches!(event.kind, EventKind::Create(_)) {
                    self.root = build_file_tree(vault_path);
                }
            }
            EventKind::Remove(_) => {
                for path in &event.paths {
                    if let Ok(rel) = path.strip_prefix(vault_path) {
                        self.remove_file(&rel.to_string_lossy());
                    }
                }
                self.root = build_file_tree(vault_path);
            }
            _ => {}
        }
    }

    /// Get metadata for a specific file.
    pub fn get_metadata(&self, relative_path: &str) -> Option<&FileMetadata> {
        self.metadata.get(relative_path)
    }
}

// ─── File system watcher ─────────────────────────────────────────────

/// Set up a file system watcher on the vault directory.
/// Returns the watcher (must be kept alive) and receives events via the callback.
pub fn watch_vault<F>(vault_path: &str, callback: F) -> Result<RecommendedWatcher, String>
where
    F: Fn(Event) + Send + 'static,
{
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Skip events in hidden dirs
                let dominated_by_hidden = event.paths.iter().all(|p| {
                    p.components().any(|c| {
                        c.as_os_str()
                            .to_string_lossy()
                            .starts_with('.')
                    })
                });
                if !dominated_by_hidden {
                    callback(event);
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(Path::new(vault_path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch vault: {}", e))?;

    Ok(watcher)
}

// ─── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let dir = TempDir::new().unwrap();
        let vault = dir.path();
        fs::create_dir_all(vault.join("notes")).unwrap();
        fs::write(
            vault.join("hello.md"),
            "# Hello\n\nSome text with #tag1 and #tag2\n\nLink to [[Other Note]]",
        )
        .unwrap();
        fs::write(
            vault.join("notes/other.md"),
            "# Other Note\n\n[[hello]] is linked here #tag2 #tag3",
        )
        .unwrap();
        dir
    }

    #[test]
    fn test_extract_tags() {
        let tags = extract_tags("Hello #world and #rust/lang stuff #123bad");
        assert_eq!(tags, vec!["rust/lang", "world"]);
    }

    #[test]
    fn test_extract_wiki_links() {
        let links = extract_wiki_links("See [[Note A]] and [[folder/Note B]]");
        assert_eq!(links, vec!["Note A", "folder/Note B"]);
    }

    #[test]
    fn test_word_count() {
        assert_eq!(word_count("hello world foo"), 3);
        assert_eq!(word_count(""), 0);
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("hello<world>.md"), "hello_world_.md");
        assert_eq!(sanitize_filename("normal.md"), "normal.md");
    }

    #[test]
    fn test_build_file_tree() {
        let dir = setup_vault();
        let tree = build_file_tree(dir.path().to_str().unwrap());
        assert!(!tree.is_empty());
        // Should have both a folder and a file at root
        let has_dir = tree.iter().any(|n| n.is_dir && n.name == "notes");
        let has_file = tree.iter().any(|n| !n.is_dir && n.name == "hello.md");
        assert!(has_dir);
        assert!(has_file);
    }

    #[test]
    fn test_crud_operations() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();

        // Create
        save_note(vp, "test.md", "# Test").unwrap();
        assert!(dir.path().join("test.md").exists());

        // Read
        let content = read_note(vp, "test.md").unwrap();
        assert_eq!(content, "# Test");

        // Update
        save_note(vp, "test.md", "# Updated").unwrap();
        let content = read_note(vp, "test.md").unwrap();
        assert_eq!(content, "# Updated");

        // Delete
        delete_note(vp, "test.md").unwrap();
        assert!(!dir.path().join("test.md").exists());
    }

    #[test]
    fn test_create_folder() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        create_folder(vp, "sub/deep").unwrap();
        assert!(dir.path().join("sub/deep").is_dir());
    }

    #[test]
    fn test_rename_file() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        save_note(vp, "old.md", "data").unwrap();
        rename_file(vp, "old.md", "new.md").unwrap();
        assert!(!dir.path().join("old.md").exists());
        assert!(dir.path().join("new.md").exists());
    }

    #[test]
    fn test_move_entry() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        save_note(vp, "moveme.md", "data").unwrap();
        create_folder(vp, "archive").unwrap();
        let new_path = move_entry(vp, "moveme.md", "archive").unwrap();
        assert_eq!(new_path, "archive/moveme.md");
        assert!(dir.path().join("archive/moveme.md").exists());
    }

    #[test]
    fn test_trash_entry() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        save_note(vp, "trashme.md", "gone").unwrap();
        trash_entry(vp, "trashme.md").unwrap();
        assert!(!dir.path().join("trashme.md").exists());
        assert!(dir.path().join(".trash/trashme.md").exists());
    }

    #[test]
    fn test_recent_files() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        fs::create_dir_all(oxidian_dir(vp)).unwrap();

        add_recent_file(vp, "file1.md").unwrap();
        add_recent_file(vp, "file2.md").unwrap();
        add_recent_file(vp, "file1.md").unwrap(); // duplicate moves to top

        let recent = load_recent_files(vp);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].path, "file1.md");
        assert_eq!(recent[1].path, "file2.md");
    }

    #[test]
    fn test_scan_vault() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        let tree = scan_vault(vp);
        assert!(!tree.root.is_empty());
        assert!(tree.metadata.contains_key("hello.md"));
        let m = &tree.metadata["hello.md"];
        assert!(m.tags.contains(&"tag1".to_string()));
        assert!(m.links.contains(&"Other Note".to_string()));
        assert!(m.word_count > 0);
    }

    #[test]
    fn test_vault_tree_incremental() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        let mut tree = VaultTree::new();
        tree.scan(vp);
        assert!(tree.metadata.contains_key("hello.md"));

        // Simulate remove
        tree.remove_file("hello.md");
        assert!(!tree.metadata.contains_key("hello.md"));

        // Simulate update
        tree.update_file(vp, "hello.md");
        assert!(tree.metadata.contains_key("hello.md"));
    }

    #[test]
    fn test_backlinks() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        let bl = find_backlinks(vp, "hello.md");
        // notes/other.md links to [[hello]]
        assert!(bl.iter().any(|p| p.contains("other.md")));
    }

    #[test]
    fn test_collect_all_tags() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        let tags = collect_all_tags(vp);
        assert!(tags.contains(&"tag1".to_string()));
        assert!(tags.contains(&"tag2".to_string()));
        assert!(tags.contains(&"tag3".to_string()));
    }

    #[test]
    fn test_path_traversal_blocked() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        let result = read_note(vp, "../../etc/passwd");
        assert!(result.is_err());
    }

    #[test]
    fn test_trash_collision() {
        let dir = setup_vault();
        let vp = dir.path().to_str().unwrap();
        // Create two files, trash both with same name
        save_note(vp, "dup.md", "v1").unwrap();
        trash_entry(vp, "dup.md").unwrap();
        save_note(vp, "dup.md", "v2").unwrap();
        trash_entry(vp, "dup.md").unwrap();
        // Both should be in trash (one with timestamp suffix)
        let trash = trash_dir(vp);
        let count = fs::read_dir(&trash).unwrap().count();
        assert_eq!(count, 2);
    }
}
