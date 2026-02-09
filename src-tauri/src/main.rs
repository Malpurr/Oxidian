// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod commands;
mod encryption;
mod markdown;
mod plugin;
mod search;
mod settings;
mod vault;

use search::SearchIndex;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub search_index: Mutex<SearchIndex>,
    pub vault_path: Mutex<String>,
    pub vault_password: Mutex<Option<String>>,
    pub vault_locked: Mutex<bool>,
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

    let state = AppState {
        search_index: Mutex::new(idx),
        vault_path: Mutex::new(vault_path),
        vault_password: Mutex::new(None),
        vault_locked: Mutex::new(vault_locked),
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
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Oxidian").ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
