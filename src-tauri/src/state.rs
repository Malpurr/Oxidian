use crate::engine::search::SearchIndex;
use crate::engine::vault;
use crate::features::bookmarks::BookmarkManager;
use crate::features::nav_history::NavHistory;
use crate::features::tags::TagIndex;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

/// Cached vault metadata (tags + wiki-links per file) to avoid full vault walks on every request
pub struct VaultMetaCache {
    /// file_path → (tags, wiki_links)
    pub entries: HashMap<String, (Vec<String>, Vec<String>)>,
    pub built_at: Option<Instant>,
}

impl VaultMetaCache {
    pub fn new() -> Self {
        Self { entries: HashMap::new(), built_at: None }
    }

    /// Returns true if cache is older than `max_age` seconds or empty
    pub fn is_stale(&self, max_age_secs: u64) -> bool {
        match self.built_at {
            None => true,
            Some(t) => t.elapsed().as_secs() > max_age_secs,
        }
    }

    /// Rebuild cache by walking the entire vault once
    pub fn rebuild(&mut self, vault_path: &str) {
        self.entries.clear();
        for entry in walkdir::WalkDir::new(vault_path).into_iter()
            .filter_entry(|e| {
                if e.depth() == 0 { return true; }
                let name = e.file_name().to_string_lossy();
                !(e.file_type().is_dir() && name.starts_with('.'))
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = std::fs::read_to_string(path) {
                    let relative = path.strip_prefix(vault_path)
                        .unwrap_or(path)
                        .to_string_lossy()
                        .to_string();
                    let tags = vault::extract_tags(&content);
                    let links = vault::extract_wiki_links(&content);
                    self.entries.insert(relative, (tags, links));
                }
            }
        }
        self.built_at = Some(Instant::now());
    }

    /// Update a single file entry (called on save)
    pub fn update_file(&mut self, relative_path: &str, content: &str) {
        let tags = vault::extract_tags(content);
        let links = vault::extract_wiki_links(content);
        self.entries.insert(relative_path.to_string(), (tags, links));
    }

    /// Remove a file entry (called on delete)
    pub fn remove_file(&mut self, relative_path: &str) {
        self.entries.remove(relative_path);
    }

    /// Get all unique tags across the vault
    pub fn all_tags(&self) -> Vec<String> {
        let mut tags: Vec<String> = self.entries.values()
            .flat_map(|(t, _)| t.iter().cloned())
            .collect();
        tags.sort();
        tags.dedup();
        tags
    }

    /// Find all files that link to a given note name
    pub fn find_backlinks(&self, target_note: &str) -> Vec<String> {
        let target_name = std::path::Path::new(target_note)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        self.entries.iter()
            .filter(|(_, (_, links))| {
                links.iter().any(|link| {
                    link == &target_name || link.ends_with(&format!("/{}", target_name))
                })
            })
            .map(|(path, _)| path.clone())
            .collect()
    }
}

pub struct AppState {
    pub search_index: Mutex<SearchIndex>,
    pub vault_path: Mutex<String>,
    pub vault_password: Mutex<Option<String>>,
    pub vault_locked: Mutex<bool>,
    pub meta_cache: Mutex<VaultMetaCache>,
    pub nav_history: Mutex<NavHistory>,
    pub bookmarks: Mutex<BookmarkManager>,
    pub tag_index: Mutex<TagIndex>,
}
