// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod commands;
mod encryption;
mod markdown;
mod plugin;
mod search;
mod settings;
mod updater;
mod vault;

use search::SearchIndex;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use tauri::Manager;

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
}

fn main() {
    env_logger::init();

    let vault_path = vault::default_vault_path();
    std::fs::create_dir_all(&vault_path).expect("Failed to create vault directory");
    std::fs::create_dir_all(format!("{}/daily", vault_path)).ok();

    let search_index =
        SearchIndex::new(&vault_path).expect("Failed to initialize search index");

    let mut idx = search_index;
    if let Err(e) = idx.reindex_vault(&vault_path) {
        log::error!("Failed to index vault: {}", e);
    }

    // Check if encryption is enabled
    let loaded_settings = settings::load_settings(&vault_path);
    let vault_locked = loaded_settings.vault.encryption_enabled;

    // Build initial metadata cache
    let mut meta_cache = VaultMetaCache::new();
    meta_cache.rebuild(&vault_path);

    let state = AppState {
        search_index: Mutex::new(idx),
        vault_path: Mutex::new(vault_path),
        vault_password: Mutex::new(None),
        vault_locked: Mutex::new(vault_locked),
        meta_cache: Mutex::new(meta_cache),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::read_note,
            commands::save_note,
            commands::delete_note,
            commands::list_files,
            commands::create_daily_note,
            commands::render_markdown,
            commands::search_notes,
            commands::get_vault_path,
            commands::set_vault_path,
            commands::create_folder,
            commands::rename_file,
            commands::get_tags,
            commands::get_backlinks,
            commands::get_graph_data,
            commands::duplicate_note,
            commands::get_settings,
            commands::save_settings,
            commands::is_first_launch,
            commands::unlock_vault,
            commands::lock_vault,
            commands::is_vault_locked,
            commands::setup_encryption,
            commands::change_password,
            commands::disable_encryption,
            commands::list_plugins,
            commands::list_obsidian_plugins,
            commands::read_plugin_main,
            commands::read_plugin_styles,
            commands::toggle_plugin,
            commands::get_enabled_plugins,
            commands::get_plugin_data,
            commands::save_plugin_data,
            commands::list_custom_themes,
            commands::load_custom_theme,
            commands::setup_vault,
            commands::install_plugin,
            commands::read_file_absolute,
            commands::check_update,
            commands::download_and_install_update,
            commands::get_current_version,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Oxidian").ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
