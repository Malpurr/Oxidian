// Oxidian — Navigation History Feature
// Back/forward stack, max history size, persist across sessions.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavHistory {
    stack: Vec<String>,
    current_index: isize,
    max_size: usize,
}

impl NavHistory {
    pub fn new(max_size: usize) -> Self {
        NavHistory {
            stack: Vec::new(),
            current_index: -1,
            max_size: max_size.max(10),
        }
    }

    /// Push a new path. Truncates forward history if not at end.
    pub fn push(&mut self, path: &str) {
        // Skip internal paths
        if path.starts_with("__") {
            return;
        }

        // Don't push duplicate consecutive entries
        if self.current_index >= 0 && (self.current_index as usize) < self.stack.len() {
            if self.stack[self.current_index as usize] == path {
                return;
            }
        }

        // Truncate forward history
        if self.current_index >= 0 && (self.current_index as usize) < self.stack.len().saturating_sub(1) {
            self.stack.truncate((self.current_index as usize) + 1);
        }

        self.stack.push(path.to_string());
        self.current_index = (self.stack.len() as isize) - 1;

        // Enforce max size
        if self.stack.len() > self.max_size {
            self.stack.remove(0);
            self.current_index -= 1;
        }
    }

    /// Go back. Returns the path to navigate to, or None.
    pub fn go_back(&mut self) -> Option<&str> {
        if self.current_index <= 0 {
            return None;
        }
        self.current_index -= 1;
        Some(&self.stack[self.current_index as usize])
    }

    /// Go forward. Returns the path to navigate to, or None.
    pub fn go_forward(&mut self) -> Option<&str> {
        if self.current_index < 0 || (self.current_index as usize) >= self.stack.len().saturating_sub(1) {
            return None;
        }
        self.current_index += 1;
        Some(&self.stack[self.current_index as usize])
    }

    /// Can go back?
    pub fn can_go_back(&self) -> bool {
        self.current_index > 0
    }

    /// Can go forward?
    pub fn can_go_forward(&self) -> bool {
        self.current_index >= 0 && (self.current_index as usize) < self.stack.len().saturating_sub(1)
    }

    /// Get the current path.
    pub fn current(&self) -> Option<&str> {
        if self.current_index >= 0 && (self.current_index as usize) < self.stack.len() {
            Some(&self.stack[self.current_index as usize])
        } else {
            None
        }
    }

    /// Update a path in history (after rename).
    pub fn rename_path(&mut self, old_path: &str, new_path: &str) {
        for entry in &mut self.stack {
            if entry == old_path {
                *entry = new_path.to_string();
            }
        }
    }

    /// Remove all occurrences of a path (after delete).
    pub fn remove_path(&mut self, path: &str) {
        let old_current = self.current().map(|s| s.to_string());

        self.stack.retain(|p| p != path);

        // Recalculate current_index
        if self.stack.is_empty() {
            self.current_index = -1;
        } else if let Some(ref current) = old_current {
            // Try to stay at the same position or closest
            if let Some(pos) = self.stack.iter().position(|p| p == current) {
                self.current_index = pos as isize;
            } else {
                self.current_index = (self.stack.len() as isize - 1).max(0);
            }
        }
    }

    /// Get the full stack (for debugging or display).
    pub fn get_stack(&self) -> &[String] {
        &self.stack
    }

    /// Get current index.
    pub fn get_index(&self) -> isize {
        self.current_index
    }

    /// Clear all history.
    pub fn clear(&mut self) {
        self.stack.clear();
        self.current_index = -1;
    }

    /// Save history to disk.
    pub fn save_to_disk(&self, vault_path: &str) -> Result<(), String> {
        let dir = Path::new(vault_path).join(".oxidian");
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("nav-history.json");
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())
    }

    /// Load history from disk.
    pub fn load_from_disk(vault_path: &str, max_size: usize) -> Self {
        let path = Path::new(vault_path).join(".oxidian").join("nav-history.json");
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(mut hist) = serde_json::from_str::<NavHistory>(&content) {
                hist.max_size = max_size.max(10);
                // Validate state
                if hist.current_index >= hist.stack.len() as isize {
                    hist.current_index = (hist.stack.len() as isize) - 1;
                }
                return hist;
            }
        }
        NavHistory::new(max_size)
    }
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_push_and_current() {
        let mut h = NavHistory::new(100);
        assert!(h.current().is_none());

        h.push("a.md");
        assert_eq!(h.current(), Some("a.md"));

        h.push("b.md");
        assert_eq!(h.current(), Some("b.md"));
    }

    #[test]
    fn test_no_consecutive_duplicates() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("a.md");
        h.push("a.md");
        assert_eq!(h.get_stack().len(), 1);
    }

    #[test]
    fn test_skip_internal_paths() {
        let mut h = NavHistory::new(100);
        h.push("__settings");
        assert!(h.current().is_none());
        assert_eq!(h.get_stack().len(), 0);
    }

    #[test]
    fn test_back_and_forward() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.push("c.md");

        assert!(h.can_go_back());
        assert!(!h.can_go_forward());

        let back = h.go_back().map(|s| s.to_string());
        assert_eq!(back.as_deref(), Some("b.md"));

        let back = h.go_back().map(|s| s.to_string());
        assert_eq!(back.as_deref(), Some("a.md"));

        assert!(!h.can_go_back());
        assert!(h.can_go_forward());

        let fwd = h.go_forward().map(|s| s.to_string());
        assert_eq!(fwd.as_deref(), Some("b.md"));
    }

    #[test]
    fn test_push_truncates_forward() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.push("c.md");

        h.go_back(); // at b
        h.go_back(); // at a

        h.push("d.md"); // should truncate b and c

        assert_eq!(h.get_stack(), &["a.md", "d.md"]);
        assert!(!h.can_go_forward());
    }

    #[test]
    fn test_max_size() {
        // min max_size is 10 (enforced in new()), so we need > 10 pushes
        let mut h = NavHistory::new(10);
        for i in 0..11 {
            h.push(&format!("{}.md", i));
        }
        // 11 pushes with max_size=10 → oldest evicted
        assert_eq!(h.get_stack().len(), 10);
        assert_eq!(h.get_stack()[0], "1.md");
        assert_eq!(h.current(), Some("10.md"));
    }

    #[test]
    fn test_rename_path() {
        let mut h = NavHistory::new(100);
        h.push("old.md");
        h.push("other.md");
        h.push("old.md");

        h.rename_path("old.md", "new.md");
        assert_eq!(h.get_stack(), &["new.md", "other.md", "new.md"]);
    }

    #[test]
    fn test_remove_path() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.push("c.md");

        h.remove_path("b.md");
        assert_eq!(h.get_stack(), &["a.md", "c.md"]);
    }

    #[test]
    fn test_remove_current_path() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");

        h.remove_path("b.md");
        assert_eq!(h.get_stack(), &["a.md"]);
        assert_eq!(h.current(), Some("a.md"));
    }

    #[test]
    fn test_clear() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.clear();
        assert!(h.current().is_none());
        assert!(h.get_stack().is_empty());
    }

    #[test]
    fn test_empty_go_back() {
        let mut h = NavHistory::new(100);
        assert!(h.go_back().is_none());
    }

    #[test]
    fn test_empty_go_forward() {
        let mut h = NavHistory::new(100);
        assert!(h.go_forward().is_none());
    }

    #[test]
    fn test_save_and_load() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();

        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.push("c.md");
        h.go_back(); // at b

        h.save_to_disk(&vault).unwrap();

        let loaded = NavHistory::load_from_disk(&vault, 100);
        assert_eq!(loaded.get_stack(), &["a.md", "b.md", "c.md"]);
        assert_eq!(loaded.current(), Some("b.md"));
        assert!(loaded.can_go_back());
        assert!(loaded.can_go_forward());
    }

    #[test]
    fn test_load_nonexistent() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let loaded = NavHistory::load_from_disk(&vault, 50);
        assert!(loaded.get_stack().is_empty());
    }

    #[test]
    fn test_single_entry_navigation() {
        let mut h = NavHistory::new(100);
        h.push("only.md");
        assert!(!h.can_go_back());
        assert!(!h.can_go_forward());
        assert_eq!(h.current(), Some("only.md"));
    }

    #[test]
    fn test_alternating_push_and_back() {
        let mut h = NavHistory::new(100);
        h.push("a.md");
        h.push("b.md");
        h.go_back(); // at a
        h.push("c.md"); // truncates b, stack is [a, c]
        h.go_back(); // at a
        h.push("d.md"); // truncates c, stack is [a, d]

        assert_eq!(h.get_stack(), &["a.md", "d.md"]);
        assert_eq!(h.current(), Some("d.md"));
    }
}
