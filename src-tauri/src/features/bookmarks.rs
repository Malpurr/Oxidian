// Oxidian — Bookmarks Feature
// Ordered bookmark list with add/remove/reorder, persisted in .oxidian/bookmarks.json

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Bookmark {
    pub path: String,
    #[serde(default)]
    pub label: String,  // optional display label (empty = use filename)
    #[serde(default)]
    pub added_at: u64,
}

#[derive(Debug)]
pub struct BookmarkManager {
    vault_path: String,
    bookmarks: Vec<Bookmark>,
}

impl BookmarkManager {
    pub fn new(vault_path: &str) -> Self {
        let mut bm = BookmarkManager {
            vault_path: vault_path.to_string(),
            bookmarks: Vec::new(),
        };
        bm.load();
        bm
    }

    fn file_path(&self) -> String {
        Path::new(&self.vault_path)
            .join(".oxidian")
            .join("bookmarks.json")
            .to_string_lossy()
            .to_string()
    }

    /// Load bookmarks from disk.
    pub fn load(&mut self) {
        let path = self.file_path();
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(bm) = serde_json::from_str::<Vec<Bookmark>>(&content) {
                self.bookmarks = bm;
                return;
            }
            // Try legacy format: just a list of paths
            if let Ok(paths) = serde_json::from_str::<Vec<String>>(&content) {
                self.bookmarks = paths.into_iter().map(|p| Bookmark {
                    path: p,
                    label: String::new(),
                    added_at: 0,
                }).collect();
            }
        }
    }

    /// Save bookmarks to disk.
    pub fn save(&self) -> Result<(), String> {
        let path = self.file_path();
        if let Some(parent) = Path::new(&path).parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(&self.bookmarks).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())
    }

    /// Get all bookmarks.
    pub fn list(&self) -> &[Bookmark] {
        &self.bookmarks
    }

    /// Check if a path is bookmarked.
    pub fn is_bookmarked(&self, path: &str) -> bool {
        self.bookmarks.iter().any(|b| b.path == path)
    }

    /// Add a bookmark. Returns false if already exists.
    pub fn add(&mut self, path: &str) -> bool {
        if self.is_bookmarked(path) {
            return false;
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.bookmarks.push(Bookmark {
            path: path.to_string(),
            label: String::new(),
            added_at: now,
        });
        true
    }

    /// Add with a display label.
    pub fn add_with_label(&mut self, path: &str, label: &str) -> bool {
        if self.is_bookmarked(path) {
            return false;
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.bookmarks.push(Bookmark {
            path: path.to_string(),
            label: label.to_string(),
            added_at: now,
        });
        true
    }

    /// Remove a bookmark by path. Returns true if it was removed.
    pub fn remove(&mut self, path: &str) -> bool {
        let len_before = self.bookmarks.len();
        self.bookmarks.retain(|b| b.path != path);
        self.bookmarks.len() < len_before
    }

    /// Toggle bookmark: add if not present, remove if present.
    pub fn toggle(&mut self, path: &str) -> bool {
        if self.is_bookmarked(path) {
            self.remove(path);
            false  // now not bookmarked
        } else {
            self.add(path);
            true   // now bookmarked
        }
    }

    /// Reorder: move bookmark from `from_index` to `to_index`.
    pub fn reorder(&mut self, from_index: usize, to_index: usize) -> Result<(), String> {
        if from_index >= self.bookmarks.len() || to_index >= self.bookmarks.len() {
            return Err("Index out of bounds".to_string());
        }
        let item = self.bookmarks.remove(from_index);
        self.bookmarks.insert(to_index, item);
        Ok(())
    }

    /// Update the label of a bookmark.
    pub fn set_label(&mut self, path: &str, label: &str) -> bool {
        if let Some(bm) = self.bookmarks.iter_mut().find(|b| b.path == path) {
            bm.label = label.to_string();
            true
        } else {
            false
        }
    }

    /// Update a bookmark path (e.g., after rename).
    pub fn rename_path(&mut self, old_path: &str, new_path: &str) {
        for bm in &mut self.bookmarks {
            if bm.path == old_path {
                bm.path = new_path.to_string();
            }
        }
    }

    /// Remove bookmarks whose files no longer exist.
    pub fn prune_missing(&mut self) -> Vec<String> {
        let vault = &self.vault_path;
        let mut removed = Vec::new();
        self.bookmarks.retain(|bm| {
            let exists = Path::new(vault).join(&bm.path).exists();
            if !exists {
                removed.push(bm.path.clone());
            }
            exists
        });
        removed
    }

    pub fn set_vault_path(&mut self, new_path: &str) {
        self.vault_path = new_path.to_string();
        self.load();
    }
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, BookmarkManager) {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        // Create some files for prune testing
        fs::write(tmp.path().join("note1.md"), "# Note 1").unwrap();
        fs::write(tmp.path().join("note2.md"), "# Note 2").unwrap();
        let bm = BookmarkManager::new(&vault);
        (tmp, bm)
    }

    #[test]
    fn test_add_and_list() {
        let (_tmp, mut bm) = setup();
        assert!(bm.add("note1.md"));
        assert!(bm.add("note2.md"));
        assert!(!bm.add("note1.md")); // duplicate
        assert_eq!(bm.list().len(), 2);
    }

    #[test]
    fn test_remove() {
        let (_tmp, mut bm) = setup();
        bm.add("note1.md");
        bm.add("note2.md");
        assert!(bm.remove("note1.md"));
        assert!(!bm.remove("note1.md")); // already removed
        assert_eq!(bm.list().len(), 1);
        assert_eq!(bm.list()[0].path, "note2.md");
    }

    #[test]
    fn test_toggle() {
        let (_tmp, mut bm) = setup();
        assert!(bm.toggle("note1.md"));  // added
        assert!(bm.is_bookmarked("note1.md"));
        assert!(!bm.toggle("note1.md")); // removed
        assert!(!bm.is_bookmarked("note1.md"));
    }

    #[test]
    fn test_reorder() {
        let (_tmp, mut bm) = setup();
        bm.add("a.md");
        bm.add("b.md");
        bm.add("c.md");
        bm.reorder(2, 0).unwrap();
        assert_eq!(bm.list()[0].path, "c.md");
        assert_eq!(bm.list()[1].path, "a.md");
        assert_eq!(bm.list()[2].path, "b.md");
    }

    #[test]
    fn test_reorder_out_of_bounds() {
        let (_tmp, mut bm) = setup();
        bm.add("a.md");
        assert!(bm.reorder(5, 0).is_err());
    }

    #[test]
    fn test_set_label() {
        let (_tmp, mut bm) = setup();
        bm.add("note1.md");
        assert!(bm.set_label("note1.md", "My Note"));
        assert_eq!(bm.list()[0].label, "My Note");
        assert!(!bm.set_label("nonexistent.md", "label"));
    }

    #[test]
    fn test_rename_path() {
        let (_tmp, mut bm) = setup();
        bm.add("note1.md");
        bm.rename_path("note1.md", "renamed.md");
        assert!(bm.is_bookmarked("renamed.md"));
        assert!(!bm.is_bookmarked("note1.md"));
    }

    #[test]
    fn test_save_and_load() {
        let (tmp, mut bm) = setup();
        bm.add("note1.md");
        bm.add_with_label("note2.md", "Important");
        bm.save().unwrap();

        let vault = tmp.path().to_string_lossy().to_string();
        let bm2 = BookmarkManager::new(&vault);
        assert_eq!(bm2.list().len(), 2);
        assert_eq!(bm2.list()[1].label, "Important");
    }

    #[test]
    fn test_prune_missing() {
        let (_tmp, mut bm) = setup();
        bm.add("note1.md");  // exists
        bm.add("nonexistent.md");  // doesn't exist
        let removed = bm.prune_missing();
        assert_eq!(removed, vec!["nonexistent.md"]);
        assert_eq!(bm.list().len(), 1);
    }

    #[test]
    fn test_empty_vault() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let bm = BookmarkManager::new(&vault);
        assert!(bm.list().is_empty());
    }

    #[test]
    fn test_legacy_format_loading() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let dir = tmp.path().join(".oxidian");
        fs::create_dir_all(&dir).unwrap();
        // Write legacy format (just paths)
        fs::write(dir.join("bookmarks.json"), r#"["note1.md","note2.md"]"#).unwrap();

        let bm = BookmarkManager::new(&vault);
        assert_eq!(bm.list().len(), 2);
        assert_eq!(bm.list()[0].path, "note1.md");
    }
}
