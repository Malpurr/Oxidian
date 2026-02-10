// Oxidian — Core Vault Module
// File tree (cached, incremental), file watcher, rename with auto-link-update,
// move, trash (soft delete), recent files tracking, file metadata cache.

use notify::{RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;
use regex::Regex;
use std::sync::LazyLock;

static TAG_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap()
});

static WIKI_LINK_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[\[([^\]]+)\]\]").unwrap()
});

// ─── FileNode ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

// ─── FileMetadata ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub size: u64,
    pub modified: u64,
    pub created: u64,
    pub tags: Vec<String>,
    pub links: Vec<String>,
}

// ─── RecentFile ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub opened_at: u64,
}

// ─── TrashManifest ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashManifest {
    pub original_path: String,
    pub trashed_at: u64,
    pub trash_name: String,
}

// ─── VaultTree ─────────────────────────────────────────────────────

pub struct VaultTree {
    vault_root: PathBuf,
    tree: Vec<FileNode>,
    metadata: HashMap<String, FileMetadata>,
    recent_files: VecDeque<RecentFile>,
    max_recent: usize,
    built_at: Option<Instant>,
}

impl VaultTree {
    pub fn new(vault_root: &str) -> Self {
        let mut vt = VaultTree {
            vault_root: PathBuf::from(vault_root),
            tree: Vec::new(),
            metadata: HashMap::new(),
            recent_files: VecDeque::new(),
            max_recent: 50,
            built_at: None,
        };
        vt.rebuild();
        vt
    }

    pub fn rebuild(&mut self) {
        self.tree = build_file_tree_internal(&self.vault_root);
        self.metadata.clear();
        self.rebuild_metadata_walk(&self.vault_root);
        self.built_at = Some(Instant::now());
    }

    fn rebuild_metadata_walk(&mut self, root: &Path) {
        for entry in WalkDir::new(root)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !name.starts_with('.') && name != "search_index"
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
                let relative = path.strip_prefix(&self.vault_root)
                    .unwrap_or(path)
                    .to_string_lossy()
                    .to_string();
                if let Ok(meta) = self.read_file_metadata(path, &relative) {
                    self.metadata.insert(relative, meta);
                }
            }
        }
    }

    fn read_file_metadata(&self, abs_path: &Path, relative: &str) -> Result<FileMetadata, String> {
        let fs_meta = fs::metadata(abs_path).map_err(|e| e.to_string())?;
        let size = fs_meta.len();
        let modified = fs_meta.modified().unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let created = fs_meta.created().unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let content = fs::read_to_string(abs_path).unwrap_or_default();
        let tags = extract_tags(&content);
        let links = extract_wiki_links(&content);
        Ok(FileMetadata { path: relative.to_string(), size, modified, created, tags, links })
    }

    pub fn get_tree(&self) -> &[FileNode] { &self.tree }
    pub fn get_metadata(&self, relative_path: &str) -> Option<&FileMetadata> { self.metadata.get(relative_path) }
    pub fn all_metadata(&self) -> &HashMap<String, FileMetadata> { &self.metadata }

    pub fn on_file_changed(&mut self, relative_path: &str) {
        let abs = self.vault_root.join(relative_path);
        if abs.is_file() {
            if let Ok(meta) = self.read_file_metadata(&abs, relative_path) {
                self.metadata.insert(relative_path.to_string(), meta);
            }
        }
        self.tree = build_file_tree_internal(&self.vault_root);
    }

    pub fn on_file_removed(&mut self, relative_path: &str) {
        self.metadata.remove(relative_path);
        self.tree = build_file_tree_internal(&self.vault_root);
    }

    pub fn all_tags(&self) -> Vec<String> {
        let mut tags: Vec<String> = self.metadata.values()
            .flat_map(|m| m.tags.iter().cloned()).collect();
        tags.sort();
        tags.dedup();
        tags
    }

    pub fn find_backlinks(&self, target_note: &str) -> Vec<String> {
        let target_name = Path::new(target_note).file_stem().unwrap_or_default()
            .to_string_lossy().to_string();
        self.metadata.iter()
            .filter(|(_, meta)| {
                meta.links.iter().any(|link| {
                    let lt = link.split('|').next().unwrap_or(link);
                    lt == target_name || lt.ends_with(&format!("/{}", target_name))
                })
            })
            .map(|(path, _)| path.clone())
            .collect()
    }

    // ─── Recent files ──────────────────────────────────────────────

    pub fn track_recent(&mut self, path: &str) {
        self.recent_files.retain(|r| r.path != path);
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        self.recent_files.push_front(RecentFile { path: path.to_string(), opened_at: now });
        if self.recent_files.len() > self.max_recent { self.recent_files.pop_back(); }
    }

    pub fn get_recent_files(&self) -> Vec<RecentFile> { self.recent_files.iter().cloned().collect() }

    pub fn load_recent_from_disk(&mut self) {
        let path = self.vault_root.join(".oxidian").join("recent.json");
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(recent) = serde_json::from_str::<Vec<RecentFile>>(&data) {
                self.recent_files = VecDeque::from(recent);
            }
        }
    }

    pub fn save_recent_to_disk(&self) -> Result<(), String> {
        let dir = self.vault_root.join(".oxidian");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let data: Vec<&RecentFile> = self.recent_files.iter().collect();
        let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
        fs::write(dir.join("recent.json"), json).map_err(|e| e.to_string())
    }

    // ─── Rename with auto-link-update ──────────────────────────────

    pub fn rename_with_link_update(&mut self, old_relative: &str, new_relative: &str) -> Result<Vec<String>, String> {
        let old_abs = self.vault_root.join(old_relative);
        let new_abs = self.vault_root.join(new_relative);
        if let Some(parent) = new_abs.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent dir: {}", e))?;
        }
        fs::rename(&old_abs, &new_abs).map_err(|e| format!("Failed to rename: {}", e))?;

        let old_stem = Path::new(old_relative).file_stem().unwrap_or_default().to_string_lossy().to_string();
        let new_stem = Path::new(new_relative).file_stem().unwrap_or_default().to_string_lossy().to_string();

        let mut updated_files = Vec::new();
        if old_stem != new_stem {
            let files_to_check: Vec<(String, PathBuf)> = self.metadata.keys()
                .filter(|p| *p != old_relative)
                .map(|p| (p.clone(), self.vault_root.join(p)))
                .collect();

            for (rel, abs) in files_to_check {
                if let Ok(content) = fs::read_to_string(&abs) {
                    let new_content = update_wiki_links(&content, &old_stem, &new_stem);
                    if new_content != content {
                        if fs::write(&abs, &new_content).is_ok() {
                            updated_files.push(rel.clone());
                            if let Ok(meta) = self.read_file_metadata(&abs, &rel) {
                                self.metadata.insert(rel, meta);
                            }
                        }
                    }
                }
            }
        }

        self.metadata.remove(old_relative);
        if let Ok(meta) = self.read_file_metadata(&new_abs, new_relative) {
            self.metadata.insert(new_relative.to_string(), meta);
        }
        for r in self.recent_files.iter_mut() {
            if r.path == old_relative { r.path = new_relative.to_string(); }
        }
        self.tree = build_file_tree_internal(&self.vault_root);
        Ok(updated_files)
    }

    // ─── Move ──────────────────────────────────────────────────────

    pub fn move_path(&mut self, src_relative: &str, dest_dir_relative: &str) -> Result<String, String> {
        let src_abs = self.vault_root.join(src_relative);
        let name = Path::new(src_relative).file_name().ok_or("Invalid source path")?.to_string_lossy().to_string();
        let new_relative = Path::new(dest_dir_relative).join(&name).to_string_lossy().to_string();
        let dest_abs = self.vault_root.join(&new_relative);

        fs::create_dir_all(self.vault_root.join(dest_dir_relative)).map_err(|e| format!("Failed to create dest dir: {}", e))?;
        fs::rename(&src_abs, &dest_abs).map_err(|e| format!("Failed to move: {}", e))?;

        if let Some(meta) = self.metadata.remove(src_relative) {
            let mut new_meta = meta;
            new_meta.path = new_relative.clone();
            self.metadata.insert(new_relative.clone(), new_meta);
        }
        for r in self.recent_files.iter_mut() {
            if r.path == src_relative { r.path = new_relative.clone(); }
        }
        self.tree = build_file_tree_internal(&self.vault_root);
        Ok(new_relative)
    }

    // ─── Trash ─────────────────────────────────────────────────────

    pub fn trash(&mut self, relative_path: &str) -> Result<(), String> {
        let src = self.vault_root.join(relative_path);
        if !src.exists() { return Err(format!("File not found: {}", relative_path)); }

        let trash_dir = self.vault_root.join(".oxidian").join("trash");
        fs::create_dir_all(&trash_dir).map_err(|e| format!("Failed to create trash dir: {}", e))?;

        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let name = Path::new(relative_path).file_name().unwrap_or_default().to_string_lossy().to_string();
        let trash_name = format!("{}_{}", timestamp, name);

        fs::rename(&src, trash_dir.join(&trash_name)).map_err(|e| format!("Failed to trash: {}", e))?;

        let manifest = TrashManifest { original_path: relative_path.to_string(), trashed_at: timestamp, trash_name: trash_name.clone() };
        let json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
        fs::write(trash_dir.join(format!("{}.meta.json", trash_name)), json).map_err(|e| e.to_string())?;

        self.metadata.remove(relative_path);
        self.tree = build_file_tree_internal(&self.vault_root);
        Ok(())
    }

    pub fn list_trash(&self) -> Vec<TrashManifest> {
        let trash_dir = self.vault_root.join(".oxidian").join("trash");
        let mut items = Vec::new();
        if let Ok(entries) = fs::read_dir(&trash_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.ends_with(".meta.json") {
                    if let Ok(data) = fs::read_to_string(entry.path()) {
                        if let Ok(manifest) = serde_json::from_str::<TrashManifest>(&data) {
                            items.push(manifest);
                        }
                    }
                }
            }
        }
        items.sort_by(|a, b| b.trashed_at.cmp(&a.trashed_at));
        items
    }

    pub fn restore_from_trash(&mut self, trash_name: &str) -> Result<String, String> {
        let trash_dir = self.vault_root.join(".oxidian").join("trash");
        let manifest_path = trash_dir.join(format!("{}.meta.json", trash_name));
        let data = fs::read_to_string(&manifest_path).map_err(|e| format!("Trash manifest not found: {}", e))?;
        let manifest: TrashManifest = serde_json::from_str(&data).map_err(|e| format!("Invalid trash manifest: {}", e))?;

        let dest = self.vault_root.join(&manifest.original_path);
        if let Some(parent) = dest.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }

        fs::rename(trash_dir.join(trash_name), &dest).map_err(|e| format!("Failed to restore: {}", e))?;
        fs::remove_file(&manifest_path).ok();

        self.on_file_changed(&manifest.original_path);
        Ok(manifest.original_path)
    }

    pub fn empty_trash(&self) -> Result<usize, String> {
        let trash_dir = self.vault_root.join(".oxidian").join("trash");
        if !trash_dir.exists() { return Ok(0); }
        let mut count = 0;
        if let Ok(entries) = fs::read_dir(&trash_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_file() { fs::remove_file(&path).ok(); count += 1; }
                else if path.is_dir() { fs::remove_dir_all(&path).ok(); count += 1; }
            }
        }
        Ok(count)
    }

    pub fn vault_root(&self) -> &Path { &self.vault_root }
    pub fn set_vault_root(&mut self, new_root: &str) { self.vault_root = PathBuf::from(new_root); self.rebuild(); }
}

// ─── File tree building ────────────────────────────────────────────

fn build_file_tree_internal(root: &Path) -> Vec<FileNode> {
    if !root.exists() { return vec![]; }
    build_tree_recursive(root, root)
}

fn build_tree_recursive(dir: &Path, vault_root: &Path) -> Vec<FileNode> {
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
        if name.starts_with('.') || name == "search_index" { continue; }
        let relative = path.strip_prefix(vault_root).unwrap_or(&path).to_string_lossy().to_string();
        if path.is_dir() {
            let children = build_tree_recursive(&path, vault_root);
            nodes.push(FileNode { name, path: relative, is_dir: true, children });
        } else if name.ends_with(".md") {
            nodes.push(FileNode { name, path: relative, is_dir: false, children: vec![] });
        }
    }
    nodes
}

// ─── Helpers ───────────────────────────────────────────────────────

pub fn extract_tags(content: &str) -> Vec<String> {
    let mut tags: Vec<String> = TAG_RE.captures_iter(content).map(|c| c[1].to_string()).collect();
    tags.sort(); tags.dedup(); tags
}

pub fn extract_wiki_links(content: &str) -> Vec<String> {
    let mut links: Vec<String> = WIKI_LINK_RE.captures_iter(content).map(|c| c[1].to_string()).collect();
    links.sort(); links.dedup(); links
}

fn update_wiki_links(content: &str, old_name: &str, new_name: &str) -> String {
    let re = Regex::new(&format!(r"\[\[{}\]\]", regex::escape(old_name))).unwrap();
    let result = re.replace_all(content, format!("[[{}]]", new_name)).to_string();
    let re2 = Regex::new(&format!(r"\[\[{}\|", regex::escape(old_name))).unwrap();
    re2.replace_all(&result, format!("[[{}|", new_name)).to_string()
}

pub fn validate_path(vault_path: &str, relative_path: &str) -> Result<PathBuf, String> {
    let vault_canonical = Path::new(vault_path).canonicalize().map_err(|e| format!("Invalid vault path: {}", e))?;
    let full_path = Path::new(vault_path).join(relative_path);
    let check_path = if full_path.exists() {
        full_path.canonicalize().map_err(|e| format!("Invalid path: {}", e))?
    } else {
        if full_path.to_string_lossy().contains("..") { return Err("Path traversal not allowed".to_string()); }
        full_path.clone()
    };
    if !check_path.starts_with(&vault_canonical) { return Err("Path traversal not allowed: path escapes vault".to_string()); }
    Ok(full_path)
}

// ─── File Watcher ──────────────────────────────────────────────────

pub enum VaultEvent {
    FileCreated(String),
    FileModified(String),
    FileRemoved(String),
}

pub fn start_watcher(vault_root: &str) -> Result<(mpsc::Receiver<VaultEvent>, RecommendedWatcher), String> {
    let (tx, rx) = mpsc::channel();
    let root = PathBuf::from(vault_root);
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            for path in &event.paths {
                let relative = path.strip_prefix(&root).unwrap_or(path).to_string_lossy().to_string();
                if relative.starts_with('.') || relative.contains("/.") { continue; }
                let evt = match event.kind {
                    EventKind::Create(_) => Some(VaultEvent::FileCreated(relative)),
                    EventKind::Modify(_) => Some(VaultEvent::FileModified(relative)),
                    EventKind::Remove(_) => Some(VaultEvent::FileRemoved(relative)),
                    _ => None,
                };
                if let Some(e) = evt { tx.send(e).ok(); }
            }
        }
    }).map_err(|e| format!("Failed to create watcher: {}", e))?;
    watcher.watch(Path::new(vault_root), RecursiveMode::Recursive).map_err(|e| format!("Failed to watch vault: {}", e))?;
    Ok((rx, watcher))
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> (TempDir, VaultTree) {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("note1.md"), "# Note 1\n\nHello #tag1 #tag2\n\n[[note2]]").unwrap();
        fs::write(tmp.path().join("note2.md"), "# Note 2\n\n#tag2 #tag3\n\n[[note1]]").unwrap();
        fs::create_dir_all(tmp.path().join("subfolder")).unwrap();
        fs::write(tmp.path().join("subfolder/note3.md"), "# Note 3\n\n#tag1/nested").unwrap();
        let tree = VaultTree::new(&tmp.path().to_string_lossy());
        (tmp, tree)
    }

    #[test]
    fn test_build_tree() {
        let (_tmp, tree) = setup_vault();
        let nodes = tree.get_tree();
        assert!(!nodes.is_empty());
        assert!(nodes.iter().any(|n| n.is_dir && n.name == "subfolder"));
        assert!(nodes.iter().any(|n| !n.is_dir && n.name == "note1.md"));
    }

    #[test]
    fn test_extract_tags() {
        let tags = extract_tags("Hello #world #rust/async and #test123");
        assert!(tags.contains(&"world".to_string()));
        assert!(tags.contains(&"rust/async".to_string()));
        assert!(tags.contains(&"test123".to_string()));
    }

    #[test]
    fn test_extract_tags_no_false_positives() {
        let tags = extract_tags("This is a #valid tag but not# this");
        assert!(tags.contains(&"valid".to_string()));
    }

    #[test]
    fn test_extract_wiki_links() {
        let links = extract_wiki_links("See [[note1]] and [[folder/note2|display]]");
        assert!(links.contains(&"note1".to_string()));
        assert!(links.contains(&"folder/note2|display".to_string()));
    }

    #[test]
    fn test_metadata_cache() {
        let (_tmp, tree) = setup_vault();
        let meta = tree.get_metadata("note1.md").unwrap();
        assert!(meta.tags.contains(&"tag1".to_string()));
        assert!(meta.tags.contains(&"tag2".to_string()));
        assert!(meta.links.contains(&"note2".to_string()));
    }

    #[test]
    fn test_all_tags() {
        let (_tmp, tree) = setup_vault();
        let tags = tree.all_tags();
        assert!(tags.contains(&"tag1".to_string()));
        assert!(tags.contains(&"tag2".to_string()));
        assert!(tags.contains(&"tag3".to_string()));
        assert!(tags.contains(&"tag1/nested".to_string()));
    }

    #[test]
    fn test_backlinks() {
        let (_tmp, tree) = setup_vault();
        let bl = tree.find_backlinks("note2.md");
        assert!(bl.contains(&"note1.md".to_string()));
    }

    #[test]
    fn test_recent_files() {
        let (_tmp, mut tree) = setup_vault();
        tree.track_recent("note1.md");
        tree.track_recent("note2.md");
        tree.track_recent("note1.md");
        let recent = tree.get_recent_files();
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].path, "note1.md");
        assert_eq!(recent[1].path, "note2.md");
    }

    #[test]
    fn test_recent_files_max_limit() {
        let (_tmp, mut tree) = setup_vault();
        tree.max_recent = 3;
        for i in 0..5 { tree.track_recent(&format!("note{}.md", i)); }
        assert_eq!(tree.get_recent_files().len(), 3);
    }

    #[test]
    fn test_trash_and_restore() {
        let (tmp, mut tree) = setup_vault();
        assert!(tmp.path().join("note1.md").exists());
        tree.trash("note1.md").unwrap();
        assert!(!tmp.path().join("note1.md").exists());
        assert!(tree.get_metadata("note1.md").is_none());
        let trash_items = tree.list_trash();
        assert_eq!(trash_items.len(), 1);
        assert_eq!(trash_items[0].original_path, "note1.md");
        let restored = tree.restore_from_trash(&trash_items[0].trash_name).unwrap();
        assert_eq!(restored, "note1.md");
        assert!(tmp.path().join("note1.md").exists());
    }

    #[test]
    fn test_move_file() {
        let (tmp, mut tree) = setup_vault();
        let new_path = tree.move_path("note1.md", "subfolder").unwrap();
        assert_eq!(new_path, "subfolder/note1.md");
        assert!(tmp.path().join("subfolder/note1.md").exists());
        assert!(!tmp.path().join("note1.md").exists());
    }

    #[test]
    fn test_rename_with_link_update() {
        let (tmp, mut tree) = setup_vault();
        let updated = tree.rename_with_link_update("note2.md", "renamed_note.md").unwrap();
        assert!(updated.contains(&"note1.md".to_string()));
        let content = fs::read_to_string(tmp.path().join("note1.md")).unwrap();
        assert!(content.contains("[[renamed_note]]"));
        assert!(!content.contains("[[note2]]"));
    }

    #[test]
    fn test_update_wiki_links() {
        let content = "See [[old_note]] and [[old_note|display]] and [[other]]";
        let result = update_wiki_links(content, "old_note", "new_note");
        assert_eq!(result, "See [[new_note]] and [[new_note|display]] and [[other]]");
    }

    #[test]
    fn test_validate_path_traversal() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_string_lossy().to_string();
        assert!(validate_path(&root, "../etc/passwd").is_err());
        assert!(validate_path(&root, "normal/path.md").is_ok());
    }

    #[test]
    fn test_incremental_update() {
        let (tmp, mut tree) = setup_vault();
        fs::write(tmp.path().join("new_note.md"), "# New\n\n#newtag").unwrap();
        tree.on_file_changed("new_note.md");
        let meta = tree.get_metadata("new_note.md").unwrap();
        assert!(meta.tags.contains(&"newtag".to_string()));
    }

    #[test]
    fn test_empty_vault() {
        let tmp = TempDir::new().unwrap();
        let tree = VaultTree::new(&tmp.path().to_string_lossy());
        assert!(tree.get_tree().is_empty());
        assert!(tree.all_tags().is_empty());
    }

    #[test]
    fn test_empty_trash() {
        let (_tmp, mut tree) = setup_vault();
        tree.trash("note1.md").unwrap();
        tree.trash("note2.md").unwrap();
        assert_eq!(tree.list_trash().len(), 2);
        let count = tree.empty_trash().unwrap();
        assert!(count >= 2);
        assert_eq!(tree.list_trash().len(), 0);
    }

    #[test]
    fn test_save_load_recent() {
        let (tmp, mut tree) = setup_vault();
        tree.track_recent("note1.md");
        tree.track_recent("note2.md");
        tree.save_recent_to_disk().unwrap();
        let mut tree2 = VaultTree::new(&tmp.path().to_string_lossy());
        tree2.load_recent_from_disk();
        let recent = tree2.get_recent_files();
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].path, "note2.md");
    }

    #[test]
    fn test_hidden_dirs_excluded() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join(".hidden")).unwrap();
        fs::write(tmp.path().join(".hidden/secret.md"), "secret").unwrap();
        fs::write(tmp.path().join("visible.md"), "visible").unwrap();
        let tree = VaultTree::new(&tmp.path().to_string_lossy());
        assert_eq!(tree.get_tree().len(), 1);
        assert_eq!(tree.get_tree()[0].name, "visible.md");
    }
}
