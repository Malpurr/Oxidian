// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

mod engine;
mod features;
mod plugin;
mod commands;
mod state;
mod encryption;
mod updater;

use engine::search::SearchIndex;
use engine::settings;
use engine::vault;
use features::bookmarks::BookmarkManager;
use features::nav_history::NavHistory;
use features::tags::TagIndex;
use state::{AppState, VaultMetaCache};
use std::sync::Mutex;
use tauri::Manager;

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

    // Initialize nav history
    let nav_history = NavHistory::load_from_disk(&vault_path, 200);

    // Initialize bookmarks
    let bookmarks = BookmarkManager::new(&vault_path);

    // Initialize tag index
    let mut tag_index = TagIndex::new();
    tag_index.build_from_vault(&vault_path);

    let state = AppState {
        search_index: Mutex::new(idx),
        vault_path: Mutex::new(vault_path),
        vault_password: Mutex::new(None),
        vault_locked: Mutex::new(vault_locked),
        meta_cache: Mutex::new(meta_cache),
        nav_history: Mutex::new(nav_history),
        bookmarks: Mutex::new(bookmarks),
        tag_index: Mutex::new(tag_index),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            // ── Core: CRUD ──
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
            commands::duplicate_note,
            commands::setup_vault,
            commands::read_file_absolute,
            // ── Core: Settings ──
            commands::get_settings,
            commands::save_settings,
            commands::load_settings,
            commands::validate_settings,
            commands::is_first_launch,
            commands::get_platform_info,
            // ── Core: Encryption ──
            commands::unlock_vault,
            commands::lock_vault,
            commands::is_vault_locked,
            commands::setup_encryption,
            commands::change_password,
            commands::disable_encryption,
            // ── Core: Markdown / Frontmatter ──
            commands::parse_markdown,
            commands::render_markdown_html,
            commands::parse_frontmatter,
            commands::stringify_frontmatter,
            commands::get_field,
            commands::set_field,
            // ── Core: Links ──
            commands::parse_all_links,
            commands::resolve_link,
            commands::update_links_on_rename,
            // ── Core: Block References ──
            commands::generate_block_id,
            commands::find_block,
            commands::get_block_content,
            commands::list_block_ids,
            commands::list_all_block_ids,
            // ── Core: Search ──
            commands::search_vault,
            commands::fuzzy_search,
            commands::search_suggest,
            commands::index_note,
            commands::remove_from_index,
            // ── Core: Vault ops ──
            commands::scan_vault,
            commands::move_entry,
            commands::trash_entry,
            commands::get_recent_files,
            commands::add_recent_file,
            // ── Core: Auto-update ──
            commands::check_update,
            commands::download_and_install_update,
            commands::get_current_version,
            // ── Features: Graph ──
            commands::get_graph_data,
            commands::compute_graph,
            // ── Features: Canvas ──
            commands::load_canvas,
            commands::save_canvas,
            commands::canvas_add_node,
            commands::canvas_move_node,
            commands::canvas_delete_node,
            // ── Features: Bookmarks ──
            commands::list_bookmarks,
            commands::add_bookmark,
            commands::remove_bookmark,
            commands::reorder_bookmarks,
            // ── Features: Daily Notes / Templates ──
            commands::create_daily_note_v2,
            commands::list_templates,
            commands::apply_template,
            // ── Features: Tags ──
            commands::get_all_tags,
            commands::search_tags,
            // ── Features: File Recovery ──
            commands::create_file_snapshot,
            commands::list_file_snapshots,
            commands::get_snapshot_content,
            commands::restore_file_snapshot,
            commands::list_all_snapshot_files,
            // ── Features: Local Graph ──
            commands::get_local_graph,
            // ── Features: Nav History ──
            commands::nav_push,
            commands::nav_go_back,
            commands::nav_go_forward,
            commands::nav_current,
            // ── Features: Themes ──
            commands::list_custom_themes,
            commands::load_custom_theme,
            // ── Vault Manager ──
            commands::list_vaults,
            commands::add_vault,
            commands::remove_vault,
            commands::switch_vault,
            // ── Workspaces ──
            commands::save_workspace,
            commands::load_workspace,
            commands::list_workspaces,
            commands::delete_workspace,
            // ── Plugins ──
            commands::list_plugins,
            commands::list_obsidian_plugins,
            commands::read_plugin_main,
            commands::read_plugin_styles,
            commands::toggle_plugin,
            commands::toggle_core_plugin,
            commands::get_enabled_plugins,
            commands::get_plugin_data,
            commands::save_plugin_data,
            commands::install_plugin,
            commands::discover_plugins,
            commands::enable_plugin,
            commands::disable_plugin,
            commands::get_plugin_settings,
            commands::save_plugin_settings,
            // ── Remember (spaced repetition) ──
            features::remember::remember_load_cards,
            features::remember::remember_create_card,
            features::remember::remember_delete_card,
            features::remember::remember_get_due_cards,
            features::remember::remember_review_card,
            features::remember::remember_load_sources,
            features::remember::remember_create_source,
            features::remember::remember_delete_source,
            features::remember::remember_get_stats,
            features::remember::remember_get_heatmap,
            features::remember::remember_quality_options,
            features::remember::remember_import_parse,
            features::remember::remember_import_execute,
            features::remember::remember_find_related,
            features::remember::remember_find_auto_links,
            features::remember::remember_connection_stats,
            features::remember::remember_cross_source,
            features::remember::remember_insert_link,
            // ── Audio Recorder ──
            commands::save_binary_file,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Oxidian").ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
