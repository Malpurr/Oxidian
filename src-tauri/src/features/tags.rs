// Oxidian — Tags Feature
// Full tag index (tag → files), autocomplete with prefix search, nested tags.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::sync::LazyLock;
use walkdir::WalkDir;

static TAG_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)").unwrap()
});

// ─── TagEntry ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagEntry {
    pub tag: String,
    pub files: Vec<String>,
    pub count: usize,
}

// ─── TagIndex ──────────────────────────────────────────────────────

pub struct TagIndex {
    /// tag → set of file paths
    index: BTreeMap<String, BTreeSet<String>>,
    /// file → set of tags (reverse index for fast updates)
    file_tags: HashMap<String, BTreeSet<String>>,
}

impl TagIndex {
    pub fn new() -> Self {
        TagIndex {
            index: BTreeMap::new(),
            file_tags: HashMap::new(),
        }
    }

    /// Build the full tag index from a vault directory.
    pub fn build_from_vault(&mut self, vault_path: &str) {
        self.index.clear();
        self.file_tags.clear();

        for entry in WalkDir::new(vault_path)
            .into_iter()
            .filter_entry(|e| {
                if e.depth() == 0 { return true; }
                let name = e.file_name().to_string_lossy();
                !name.starts_with('.')  && name != "search_index"
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(path) {
                    let relative = path.strip_prefix(vault_path)
                        .unwrap_or(path)
                        .to_string_lossy()
                        .to_string();
                    self.index_file(&relative, &content);
                }
            }
        }
    }

    /// Index a single file's tags.
    pub fn index_file(&mut self, relative_path: &str, content: &str) {
        // Remove old entries for this file
        self.remove_file(relative_path);

        let tags = extract_tags(content);
        let mut file_set = BTreeSet::new();

        for tag in &tags {
            self.index.entry(tag.clone())
                .or_default()
                .insert(relative_path.to_string());
            file_set.insert(tag.clone());

            // Also index parent tags for nested tags
            // e.g., #parent/child → also registers #parent
            let parts: Vec<&str> = tag.split('/').collect();
            for i in 1..parts.len() {
                let parent = parts[..i].join("/");
                self.index.entry(parent.clone())
                    .or_default()
                    .insert(relative_path.to_string());
                file_set.insert(parent);
            }
        }

        if !file_set.is_empty() {
            self.file_tags.insert(relative_path.to_string(), file_set);
        }
    }

    /// Remove a file from the index.
    pub fn remove_file(&mut self, relative_path: &str) {
        if let Some(old_tags) = self.file_tags.remove(relative_path) {
            for tag in old_tags {
                if let Some(files) = self.index.get_mut(&tag) {
                    files.remove(relative_path);
                    if files.is_empty() {
                        self.index.remove(&tag);
                    }
                }
            }
        }
    }

    /// Get all unique tags, sorted.
    pub fn all_tags(&self) -> Vec<String> {
        self.index.keys().cloned().collect()
    }

    /// Get tags with their file lists and counts.
    pub fn all_tag_entries(&self) -> Vec<TagEntry> {
        self.index.iter().map(|(tag, files)| {
            TagEntry {
                tag: tag.clone(),
                files: files.iter().cloned().collect(),
                count: files.len(),
            }
        }).collect()
    }

    /// Get files for a specific tag.
    pub fn files_for_tag(&self, tag: &str) -> Vec<String> {
        self.index.get(tag)
            .map(|s| s.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// Prefix search for tag autocomplete.
    pub fn autocomplete(&self, prefix: &str) -> Vec<String> {
        if prefix.is_empty() {
            return self.all_tags();
        }
        let lower = prefix.to_lowercase();
        self.index.keys()
            .filter(|tag| tag.to_lowercase().starts_with(&lower))
            .cloned()
            .collect()
    }

    /// Fuzzy search: tags containing the query anywhere.
    pub fn search(&self, query: &str) -> Vec<String> {
        if query.is_empty() {
            return self.all_tags();
        }
        let lower = query.to_lowercase();
        self.index.keys()
            .filter(|tag| tag.to_lowercase().contains(&lower))
            .cloned()
            .collect()
    }

    /// Get tags for a specific file.
    pub fn tags_for_file(&self, relative_path: &str) -> Vec<String> {
        self.file_tags.get(relative_path)
            .map(|s| s.iter().cloned().collect())
            .unwrap_or_default()
    }

    /// Get the total number of unique tags.
    pub fn tag_count(&self) -> usize {
        self.index.len()
    }

    /// Get nested tag tree structure.
    pub fn tag_tree(&self) -> Vec<TagTreeNode> {
        let mut root_nodes: BTreeMap<String, TagTreeNode> = BTreeMap::new();

        for tag in self.index.keys() {
            let parts: Vec<&str> = tag.split('/').collect();
            if parts.len() == 1 {
                // Top-level tag
                root_nodes.entry(tag.clone()).or_insert_with(|| TagTreeNode {
                    name: tag.clone(),
                    full_tag: tag.clone(),
                    count: self.index.get(tag).map(|s| s.len()).unwrap_or(0),
                    children: Vec::new(),
                });
            }
        }

        // Insert nested tags under parents
        for tag in self.index.keys() {
            let parts: Vec<&str> = tag.split('/').collect();
            if parts.len() > 1 {
                let parent = parts[0].to_string();
                let child_name = parts[1..].join("/");
                let entry = root_nodes.entry(parent.clone()).or_insert_with(|| TagTreeNode {
                    name: parent.clone(),
                    full_tag: parent,
                    count: 0,
                    children: Vec::new(),
                });
                entry.children.push(TagTreeNode {
                    name: child_name,
                    full_tag: tag.clone(),
                    count: self.index.get(tag).map(|s| s.len()).unwrap_or(0),
                    children: Vec::new(),
                });
            }
        }

        root_nodes.into_values().collect()
    }

    /// Rename a file in the index (after file rename).
    pub fn rename_file(&mut self, old_path: &str, new_path: &str) {
        if let Some(tags) = self.file_tags.remove(old_path) {
            for tag in &tags {
                if let Some(files) = self.index.get_mut(tag) {
                    files.remove(old_path);
                    files.insert(new_path.to_string());
                }
            }
            self.file_tags.insert(new_path.to_string(), tags);
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagTreeNode {
    pub name: String,
    pub full_tag: String,
    pub count: usize,
    pub children: Vec<TagTreeNode>,
}

/// Extract tags from markdown content.
pub fn extract_tags(content: &str) -> Vec<String> {
    let mut tags: Vec<String> = TAG_RE.captures_iter(content)
        .map(|c| c[1].to_string())
        .collect();
    tags.sort();
    tags.dedup();
    tags
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_vault() -> (TempDir, TagIndex) {
        let tmp = TempDir::new().unwrap();
        fs::write(tmp.path().join("note1.md"), "# Note 1\n\n#rust #programming #rust/async").unwrap();
        fs::write(tmp.path().join("note2.md"), "# Note 2\n\n#rust #web #programming").unwrap();
        fs::write(tmp.path().join("note3.md"), "# Note 3\n\n#personal #journal").unwrap();
        fs::create_dir_all(tmp.path().join("sub")).unwrap();
        fs::write(tmp.path().join("sub/note4.md"), "# Note 4\n\n#rust/tokio #web").unwrap();

        let mut idx = TagIndex::new();
        idx.build_from_vault(&tmp.path().to_string_lossy());
        (tmp, idx)
    }

    #[test]
    fn test_all_tags() {
        let (_tmp, idx) = setup_vault();
        let tags = idx.all_tags();
        assert!(tags.contains(&"rust".to_string()));
        assert!(tags.contains(&"programming".to_string()));
        assert!(tags.contains(&"web".to_string()));
        assert!(tags.contains(&"personal".to_string()));
        assert!(tags.contains(&"journal".to_string()));
    }

    #[test]
    fn test_files_for_tag() {
        let (_tmp, idx) = setup_vault();
        let files = idx.files_for_tag("rust");
        assert!(files.contains(&"note1.md".to_string()));
        assert!(files.contains(&"note2.md".to_string()));
        // note4 has #rust/tokio, so "rust" parent should also match
        assert!(files.contains(&"sub/note4.md".to_string()));
    }

    #[test]
    fn test_nested_tags() {
        let (_tmp, idx) = setup_vault();
        let files = idx.files_for_tag("rust/async");
        assert!(files.contains(&"note1.md".to_string()));
        assert_eq!(files.len(), 1);

        let files = idx.files_for_tag("rust/tokio");
        assert!(files.contains(&"sub/note4.md".to_string()));
    }

    #[test]
    fn test_parent_tag_includes_children() {
        let (_tmp, idx) = setup_vault();
        let rust_files = idx.files_for_tag("rust");
        // note1 has #rust, note2 has #rust, note4 has #rust/tokio (so "rust" parent)
        assert!(rust_files.len() >= 3);
    }

    #[test]
    fn test_autocomplete() {
        let (_tmp, idx) = setup_vault();
        let results = idx.autocomplete("ru");
        assert!(results.contains(&"rust".to_string()));
        assert!(results.contains(&"rust/async".to_string()));
        assert!(results.contains(&"rust/tokio".to_string()));
        assert!(!results.contains(&"web".to_string()));
    }

    #[test]
    fn test_autocomplete_empty() {
        let (_tmp, idx) = setup_vault();
        let results = idx.autocomplete("");
        assert_eq!(results.len(), idx.tag_count());
    }

    #[test]
    fn test_autocomplete_case_insensitive() {
        let (_tmp, idx) = setup_vault();
        let results = idx.autocomplete("RU");
        assert!(results.contains(&"rust".to_string()));
    }

    #[test]
    fn test_search() {
        let (_tmp, idx) = setup_vault();
        let results = idx.search("gram");
        assert!(results.contains(&"programming".to_string()));
    }

    #[test]
    fn test_tags_for_file() {
        let (_tmp, idx) = setup_vault();
        let tags = idx.tags_for_file("note3.md");
        assert!(tags.contains(&"personal".to_string()));
        assert!(tags.contains(&"journal".to_string()));
    }

    #[test]
    fn test_index_file_update() {
        let (_tmp, mut idx) = setup_vault();

        // Update note3 to have different tags
        idx.index_file("note3.md", "# Updated\n\n#newtag #fresh");
        let tags = idx.tags_for_file("note3.md");
        assert!(tags.contains(&"newtag".to_string()));
        assert!(tags.contains(&"fresh".to_string()));
        assert!(!tags.contains(&"personal".to_string()));

        // Old tags should not map to this file
        let personal_files = idx.files_for_tag("personal");
        assert!(personal_files.is_empty());
    }

    #[test]
    fn test_remove_file() {
        let (_tmp, mut idx) = setup_vault();
        idx.remove_file("note3.md");
        let files = idx.files_for_tag("personal");
        assert!(files.is_empty());
        let files = idx.files_for_tag("journal");
        assert!(files.is_empty());
    }

    #[test]
    fn test_tag_count() {
        let (_tmp, idx) = setup_vault();
        assert!(idx.tag_count() > 0);
    }

    #[test]
    fn test_tag_entries() {
        let (_tmp, idx) = setup_vault();
        let entries = idx.all_tag_entries();
        let rust_entry = entries.iter().find(|e| e.tag == "rust").unwrap();
        assert!(rust_entry.count >= 2);
        assert!(rust_entry.files.contains(&"note1.md".to_string()));
    }

    #[test]
    fn test_tag_tree() {
        let (_tmp, idx) = setup_vault();
        let tree = idx.tag_tree();

        let rust_node = tree.iter().find(|n| n.name == "rust").unwrap();
        assert!(!rust_node.children.is_empty());
        let child_names: Vec<&str> = rust_node.children.iter().map(|c| c.name.as_str()).collect();
        assert!(child_names.contains(&"async"));
        assert!(child_names.contains(&"tokio"));
    }

    #[test]
    fn test_rename_file() {
        let (_tmp, mut idx) = setup_vault();
        idx.rename_file("note1.md", "renamed.md");

        let tags = idx.tags_for_file("renamed.md");
        assert!(tags.contains(&"rust".to_string()));

        let tags = idx.tags_for_file("note1.md");
        assert!(tags.is_empty());

        let files = idx.files_for_tag("rust");
        assert!(files.contains(&"renamed.md".to_string()));
        assert!(!files.contains(&"note1.md".to_string()));
    }

    #[test]
    fn test_empty_index() {
        let idx = TagIndex::new();
        assert_eq!(idx.tag_count(), 0);
        assert!(idx.all_tags().is_empty());
        assert!(idx.autocomplete("test").is_empty());
    }

    #[test]
    fn test_extract_tags() {
        let tags = extract_tags("Hello #world #rust/async and #test_123");
        assert!(tags.contains(&"world".to_string()));
        assert!(tags.contains(&"rust/async".to_string()));
        assert!(tags.contains(&"test_123".to_string()));
    }

    #[test]
    fn test_no_tags_in_code_blocks() {
        // Note: current regex doesn't distinguish code blocks.
        // This test documents the current behavior.
        let tags = extract_tags("```\n#not_a_tag\n```\n\n#real_tag");
        // Both are extracted with current simple regex
        assert!(tags.contains(&"real_tag".to_string()));
    }
}
