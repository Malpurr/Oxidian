// Oxidian — Remember Module: Knowledge Retention System
// Re-exports, RememberState, Error types, and Tauri command wrappers.

pub mod sm2;
pub mod cards;
pub mod sources;
pub mod review;
pub mod stats;
pub mod import;
pub mod connections;
pub mod error;

use std::sync::Mutex;

use tauri::State;

use crate::state::AppState;

// ─── Remember State ──────────────────────────────────────────────────

/// Shared state for the Remember system. Can be added to Tauri's managed state.
pub struct RememberState {
    /// Cached cards (reload on demand).
    pub cards: Mutex<Vec<cards::Card>>,
    /// Cached sources.
    pub sources: Mutex<Vec<sources::Source>>,
}

impl RememberState {
    pub fn new() -> Self {
        Self {
            cards: Mutex::new(Vec::new()),
            sources: Mutex::new(Vec::new()),
        }
    }
}

impl Default for RememberState {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Tauri Commands ──────────────────────────────────────────────────

#[tauri::command]
pub fn remember_load_cards(state: State<AppState>) -> Result<Vec<cards::Card>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    cards::load_all_cards(&vault_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_create_card(state: State<AppState>, input: cards::CardInput) -> Result<cards::Card, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    cards::create_card(&vault_path, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_delete_card(state: State<AppState>, card_path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    cards::delete_card(&vault_path, &card_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_get_due_cards(state: State<AppState>) -> Result<Vec<cards::Card>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    cards::get_due_cards(&vault_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_review_card(state: State<AppState>, card_path: String, quality: u8) -> Result<review::ReviewResult, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    review::review_card(&vault_path, &card_path, quality).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_load_sources(state: State<AppState>) -> Result<Vec<sources::Source>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    sources::load_all_sources(&vault_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_create_source(state: State<AppState>, input: sources::SourceInput) -> Result<sources::Source, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    sources::create_source(&vault_path, &input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_delete_source(state: State<AppState>, source_path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    sources::delete_source(&vault_path, &source_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_get_stats(state: State<AppState>) -> Result<stats::ComputedStats, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    let all_cards = cards::load_all_cards(&vault_path).map_err(|e| e.to_string())?;
    Ok(stats::get_computed_stats(&vault_path, &all_cards))
}

#[tauri::command]
pub fn remember_get_heatmap(state: State<AppState>) -> Result<Vec<stats::DayEntry>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    Ok(stats::get_heatmap(&vault_path))
}

#[tauri::command]
pub fn remember_quality_options() -> Vec<review::QualityOption> {
    review::quality_options()
}

#[tauri::command]
pub fn remember_import_parse(content: String, format: String, filename: String) -> Result<Vec<import::ImportEntry>, String> {
    let fmt = match format.as_str() {
        "kindle" => import::ImportFormat::Kindle,
        "readwise" => import::ImportFormat::Readwise,
        "markdown" => import::ImportFormat::Markdown,
        _ => import::ImportFormat::PlainText,
    };
    Ok(import::parse_content(&content, fmt, &filename))
}

#[tauri::command]
pub fn remember_import_execute(state: State<AppState>, entries: Vec<import::ImportEntry>, default_source: Option<String>) -> Result<import::ImportResult, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    import::execute_import(&vault_path, &entries, default_source.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_find_related(state: State<AppState>, card_path: String, limit: Option<usize>) -> Result<Vec<connections::RelatedCard>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    connections::find_related(&vault_path, &card_path, limit.unwrap_or(10)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_find_auto_links(state: State<AppState>, card_path: String) -> Result<Vec<connections::AutoLinkSuggestion>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    connections::find_auto_links(&vault_path, &card_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_connection_stats(state: State<AppState>) -> Result<connections::ConnectionStats, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    connections::get_connection_stats(&vault_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_cross_source(state: State<AppState>) -> Result<Vec<connections::CrossSourceConnection>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    connections::discover_cross_source(&vault_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remember_insert_link(state: State<AppState>, card_path: String, link_title: String, position: usize, match_length: usize) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?;
    connections::insert_link(&vault_path, &card_path, &link_title, position, match_length).map_err(|e| e.to_string())
}
