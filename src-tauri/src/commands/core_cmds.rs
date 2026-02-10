use crate::encryption;
use crate::engine::frontmatter::{self, Frontmatter};
use crate::engine::settings::{self, Settings};
use crate::engine::search::SearchResult;
use crate::state::AppState;
use chrono::Local;
use tauri::State;

// Use full paths for vault and markdown to avoid name collisions with command functions
use crate::engine::vault as vault_ops;
use crate::engine::markdown as md;

#[tauri::command]
pub fn read_note(state: State<AppState>, path: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let password = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let settings = settings::load_settings(&vault_path);

    let content = vault_ops::read_note(&vault_path, &path)?;

    if settings.vault.encryption_enabled {
        if let Some(ref pwd) = *password {
            if content.starts_with('{') && content.contains("\"salt\"") {
                return encryption::decrypt_file_content(&content, pwd);
            }
        }
    }
    Ok(content)
}

#[tauri::command]
pub fn save_note(state: State<AppState>, path: String, content: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let password = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let settings = settings::load_settings(&vault_path);

    if settings.vault.encryption_enabled {
        if let Some(ref pwd) = *password {
            let encrypted = encryption::encrypt_file_content(&content, pwd)?;
            vault_ops::save_note(&vault_path, &path, &encrypted)?;
        } else {
            vault_ops::save_note(&vault_path, &path, &content)?;
        }
    } else {
        vault_ops::save_note(&vault_path, &path, &content)?;
    }

    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.index_note(&vault_path, &path, &content)?;

    if let Ok(mut cache) = state.meta_cache.lock() {
        cache.update_file(&path, &content);
    }

    Ok(())
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::delete_note(&vault_path, &path)?;

    if let Ok(mut cache) = state.meta_cache.lock() {
        cache.remove_file(&path);
    }

    Ok(())
}

#[tauri::command]
pub fn list_files(state: State<AppState>) -> Result<Vec<vault_ops::FileNode>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(vault_ops::build_file_tree(&vault_path))
}

#[tauri::command]
pub fn create_daily_note(state: State<AppState>) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let today = Local::now().format("%Y-%m-%d").to_string();
    let relative_path = format!("daily/{}.md", today);
    let full_path = std::path::Path::new(&*vault_path).join(&relative_path);

    if !full_path.exists() {
        let content = format!(
            "# {}\n\n## Journal\n\n\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
            Local::now().format("%A, %B %d, %Y")
        );
        vault_ops::save_note(&vault_path, &relative_path, &content)?;

        let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        search.index_note(&vault_path, &relative_path, &content).ok();
    }

    Ok(relative_path)
}

#[tauri::command]
pub fn render_markdown(content: String) -> Result<String, String> {
    Ok(md::render_markdown(&content))
}

#[tauri::command]
pub fn search_notes(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.search(&query, 20)
}

#[tauri::command]
pub fn get_vault_path(state: State<AppState>) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(vault_path.clone())
}

#[tauri::command]
pub fn set_vault_path(state: State<AppState>, path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *vault_path = path.clone();

    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.reindex_vault(&path)?;

    if let Ok(mut cache) = state.meta_cache.lock() {
        cache.rebuild(&path);
    }

    Ok(())
}

#[tauri::command]
pub fn create_folder(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::create_folder(&vault_path, &path)
}

#[tauri::command]
pub fn rename_file(state: State<AppState>, old_path: String, new_path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::rename_file(&vault_path, &old_path, &new_path)
}

#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<String>, String> {
    let mut cache = state.meta_cache.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if cache.is_stale(30) {
        let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        cache.rebuild(&vault_path);
    }
    Ok(cache.all_tags())
}

#[tauri::command]
pub fn get_backlinks(state: State<AppState>, note_path: String) -> Result<Vec<String>, String> {
    let mut cache = state.meta_cache.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if cache.is_stale(30) {
        let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        cache.rebuild(&vault_path);
    }
    Ok(cache.find_backlinks(&note_path))
}

#[tauri::command]
pub fn duplicate_note(state: State<AppState>, path: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let content = vault_ops::read_note(&vault_path, &path)?;
    let new_path = if path.ends_with(".md") {
        format!("{} copy.md", path.trim_end_matches(".md"))
    } else {
        format!("{} copy", path)
    };
    vault_ops::save_note(&vault_path, &new_path, &content)?;
    Ok(new_path)
}

// ===== Settings Commands =====

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(settings::load_settings(&vault_path))
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, new_settings: Settings) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    settings::save_settings(&vault_path, &new_settings)
}

#[tauri::command]
pub fn is_first_launch(state: State<AppState>) -> Result<bool, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(settings::is_first_launch(&vault_path))
}

// ===== Encryption Commands =====

#[tauri::command]
pub fn unlock_vault(state: State<AppState>, password: String) -> Result<bool, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let verify_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("vault.key");

    if verify_path.exists() {
        let verify_data = std::fs::read_to_string(&verify_path)
            .map_err(|e| format!("Failed to read vault key: {}", e))?;
        if !encryption::verify_password(&verify_data, &password) {
            return Ok(false);
        }
    }

    let mut pwd = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *pwd = Some(password);

    let mut locked = state.vault_locked.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *locked = false;

    Ok(true)
}

#[tauri::command]
pub fn lock_vault(state: State<AppState>) -> Result<(), String> {
    let mut pwd = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *pwd = None;
    let mut locked = state.vault_locked.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *locked = true;
    Ok(())
}

#[tauri::command]
pub fn is_vault_locked(state: State<AppState>) -> Result<bool, String> {
    let locked = state.vault_locked.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(*locked)
}

#[tauri::command]
pub fn setup_encryption(state: State<AppState>, password: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;

    let verify_content = encryption::encrypt_file_content("OXIDIAN_VAULT_KEY", &password)?;
    let verify_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("vault.key");
    let dir = verify_path.parent().unwrap();
    std::fs::create_dir_all(dir).map_err(|e| format!("Failed to create dir: {}", e))?;
    std::fs::write(&verify_path, verify_content)
        .map_err(|e| format!("Failed to write vault key: {}", e))?;

    let mut pwd = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *pwd = Some(password);
    let mut locked = state.vault_locked.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *locked = false;

    let mut s = settings::load_settings(&vault_path);
    s.vault.encryption_enabled = true;
    settings::save_settings(&vault_path, &s)?;

    Ok(())
}

#[tauri::command]
pub fn change_password(state: State<AppState>, old_password: String, new_password: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let verify_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("vault.key");

    if verify_path.exists() {
        let verify_data = std::fs::read_to_string(&verify_path)
            .map_err(|e| format!("Failed to read vault key: {}", e))?;
        if !encryption::verify_password(&verify_data, &old_password) {
            return Err("Current password is incorrect".to_string());
        }
    }

    for entry in walkdir::WalkDir::new(&*vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(path) {
                if content.starts_with('{') && content.contains("\"salt\"") {
                    match encryption::decrypt_file_content(&content, &old_password) {
                        Ok(plaintext) => {
                            match encryption::encrypt_file_content(&plaintext, &new_password) {
                                Ok(new_encrypted) => {
                                    if let Err(e) = std::fs::write(path, new_encrypted) {
                                        log::error!("Failed to re-encrypt {}: {}", path.display(), e);
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to encrypt {} with new password: {}", path.display(), e);
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("Skipping file {} (not encrypted or wrong format): {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }

    let verify_content = encryption::encrypt_file_content("OXIDIAN_VAULT_KEY", &new_password)?;
    std::fs::write(&verify_path, verify_content)
        .map_err(|e| format!("Failed to write vault key: {}", e))?;

    let mut pwd = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *pwd = Some(new_password);

    Ok(())
}

#[tauri::command]
pub fn disable_encryption(state: State<AppState>) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let password = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;

    let pwd = password.as_ref().ok_or("No password available — vault must be unlocked to disable encryption")?;

    for entry in walkdir::WalkDir::new(&*vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(path) {
                if content.starts_with('{') && content.contains("\"salt\"") {
                    match encryption::decrypt_file_content(&content, pwd) {
                        Ok(plaintext) => {
                            if let Err(e) = std::fs::write(path, &plaintext) {
                                log::error!("Failed to write decrypted {}: {}", path.display(), e);
                            }
                        }
                        Err(e) => {
                            log::warn!("Skipping {} (decrypt failed): {}", path.display(), e);
                        }
                    }
                }
            }
        }
    }

    let verify_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("vault.key");
    if verify_path.exists() {
        std::fs::remove_file(&verify_path).ok();
    }

    let mut s = settings::load_settings(&vault_path);
    s.vault.encryption_enabled = false;
    settings::save_settings(&vault_path, &s)?;

    drop(password);
    let mut pwd_state = state.vault_password.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *pwd_state = None;

    Ok(())
}

#[tauri::command]
pub fn read_file_absolute(state: State<AppState>, path: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let canonical_vault = std::path::Path::new(&*vault_path)
        .canonicalize()
        .map_err(|e| format!("Invalid vault path: {}", e))?;
    let requested = std::path::Path::new(&path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    if !requested.starts_with(&canonical_vault) {
        return Err("Access denied: path outside vault".to_string());
    }

    let ext = requested.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !matches!(ext, "json" | "css" | "js" | "md") {
        return Err(format!("Access denied: .{} files not allowed", ext));
    }

    std::fs::read_to_string(&requested)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn setup_vault(state: State<AppState>, path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create vault: {}", e))?;
    std::fs::create_dir_all(format!("{}/daily", path)).ok();

    let mut vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    *vault_path = path.clone();

    let mut default_settings = Settings::default();
    default_settings.general.vault_path = path.clone();
    settings::save_settings(&path, &default_settings)?;

    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.reindex_vault(&path)?;

    Ok(())
}

// ─── Auto-Update Commands ────────────────────────────────────────────

#[tauri::command]
pub async fn check_update() -> Result<Option<crate::updater::UpdateInfo>, String> {
    let current = crate::updater::get_current_version();
    crate::updater::check_for_updates(&current).await
}

#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let dest = temp_dir.join("oxidian-update-binary");
    let dest_str = dest.to_string_lossy().to_string();

    crate::updater::download_update(&download_url, &dest_str).await?;
    crate::updater::apply_update(&dest_str)?;

    Ok(())
}

#[tauri::command]
pub fn get_current_version() -> String {
    crate::updater::get_current_version()
}

// ===== Markdown Parsing Commands =====

#[tauri::command]
pub fn parse_markdown(content: String) -> Result<String, String> {
    Ok(md::render_markdown(&content))
}

#[tauri::command]
pub fn render_markdown_html(content: String) -> Result<String, String> {
    Ok(md::render_markdown(&content))
}

// ===== Frontmatter Commands =====

#[tauri::command]
pub fn parse_frontmatter(content: String) -> Result<Option<Frontmatter>, String> {
    let (fm, _body) = frontmatter::parse_frontmatter(&content)?;
    Ok(fm)
}

#[tauri::command]
pub fn stringify_frontmatter(fm: Frontmatter, body: String) -> Result<String, String> {
    Ok(frontmatter::serialize_frontmatter(&fm, &body))
}

#[tauri::command]
pub fn get_field(content: String, field: String) -> Result<Option<serde_json::Value>, String> {
    let (fm, _) = frontmatter::parse_frontmatter(&content)?;
    match fm {
        Some(fm) => {
            // Check known fields first, then extra
            match field.as_str() {
                "title" => Ok(fm.title.map(|v| serde_json::Value::String(v))),
                "tags" => Ok(Some(serde_json::to_value(&fm.tags).unwrap_or_default())),
                "aliases" => Ok(Some(serde_json::to_value(&fm.aliases).unwrap_or_default())),
                "created" => Ok(fm.created.map(|v| serde_json::Value::String(v))),
                "modified" => Ok(fm.modified.map(|v| serde_json::Value::String(v))),
                _ => Ok(fm.extra.get(&field).cloned()),
            }
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn set_field(content: String, field: String, value: serde_json::Value) -> Result<String, String> {
    let (fm, body) = frontmatter::parse_frontmatter(&content)?;
    let mut fm = fm.unwrap_or_default();
    match field.as_str() {
        "title" => fm.title = value.as_str().map(|s| s.to_string()),
        "created" => fm.created = value.as_str().map(|s| s.to_string()),
        "modified" => fm.modified = value.as_str().map(|s| s.to_string()),
        _ => { fm.extra.insert(field, value); }
    }
    Ok(frontmatter::serialize_frontmatter(&fm, body))
}

// ===== Links Commands =====

#[tauri::command]
pub fn parse_all_links(content: String) -> Result<Vec<String>, String> {
    Ok(crate::engine::vault::extract_wiki_links(&content))
}

#[tauri::command]
pub fn resolve_link(state: State<AppState>, link: String) -> Result<Vec<crate::engine::links::LinkTarget>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    crate::engine::links::resolve_wikilink(&vault_path, &link)
}

#[tauri::command]
pub fn update_links_on_rename(state: State<AppState>, old_name: String, new_name: String) -> Result<u32, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut count = 0u32;
    for entry in walkdir::WalkDir::new(&*vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(path) {
                let new_content = content.replace(
                    &format!("[[{}]]", old_name),
                    &format!("[[{}]]", new_name),
                );
                if new_content != content {
                    std::fs::write(path, &new_content).map_err(|e| format!("Write error: {}", e))?;
                    count += 1;
                }
            }
        }
    }
    Ok(count)
}

// ===== Search Commands =====

#[tauri::command]
pub fn search_vault(state: State<AppState>, query: String, limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    let search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.search(&query, limit.unwrap_or(20))
}

#[tauri::command]
pub fn fuzzy_search(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    // Use tantivy's search with fuzzy-like behavior (prefix matching via query)
    let fuzzy_query = format!("{}*", query.trim());
    search.search(&fuzzy_query, 20)
}

#[tauri::command]
pub fn search_suggest(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.search(&query, 5)
}

#[tauri::command]
pub fn index_note(state: State<AppState>, path: String, content: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.index_note(&vault_path, &path, &content)
}

#[tauri::command]
pub fn remove_from_index(state: State<AppState>, _path: String) -> Result<(), String> {
    // Re-index the vault without the removed file (tantivy doesn't expose simple delete by path easily)
    // For now, just re-index
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    search.reindex_vault(&vault_path)
}

// ===== Vault Commands =====

#[tauri::command]
pub fn scan_vault(state: State<AppState>) -> Result<Vec<vault_ops::FileNode>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let tree = vault_ops::scan_vault(&vault_path);
    Ok(tree.root)
}

#[tauri::command]
pub fn move_entry(state: State<AppState>, source_path: String, dest_dir: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::move_entry(&vault_path, &source_path, &dest_dir)
}

#[tauri::command]
pub fn trash_entry(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::trash_entry(&vault_path, &path)
}

#[tauri::command]
pub fn get_recent_files(state: State<AppState>) -> Result<Vec<vault_ops::RecentEntry>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(vault_ops::load_recent_files(&vault_path))
}

#[tauri::command]
pub fn add_recent_file(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    vault_ops::add_recent_file(&vault_path, &path)
}

// ===== Settings Validation =====

#[tauri::command]
pub fn load_settings(state: State<AppState>) -> Result<Settings, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(settings::load_settings(&vault_path))
}

#[tauri::command]
pub fn validate_settings(new_settings: Settings) -> Result<Vec<String>, String> {
    Ok(new_settings.validate())
}
