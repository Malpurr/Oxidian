use crate::encryption;
use crate::settings::{self, Settings};
use crate::vault;
use crate::markdown;
use crate::search::SearchResult;
use crate::AppState;
use chrono::Local;
use serde::Serialize;
use tauri::State;

#[tauri::command]
pub fn read_note(state: State<AppState>, path: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let password = state.vault_password.lock().unwrap();
    let settings = settings::load_settings(&vault_path);

    let content = vault::read_note(&vault_path, &path)?;

    // If encryption is enabled and we have a password, try to decrypt
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
    let vault_path = state.vault_path.lock().unwrap();
    let password = state.vault_password.lock().unwrap();
    let settings = settings::load_settings(&vault_path);

    let save_content = if settings.vault.encryption_enabled {
        if let Some(ref pwd) = *password {
            encryption::encrypt_file_content(&content, pwd)?
        } else {
            content.clone()
        }
    } else {
        content.clone()
    };

    vault::save_note(&vault_path, &path, &save_content)?;

    // Update search index with plaintext
    let search = state.search_index.lock().unwrap();
    search.index_note(&vault_path, &path, &content)?;

    Ok(())
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    vault::delete_note(&vault_path, &path)
}

#[tauri::command]
pub fn list_files(state: State<AppState>) -> Result<Vec<vault::FileNode>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(vault::build_file_tree(&vault_path))
}

#[tauri::command]
pub fn create_daily_note(state: State<AppState>) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let today = Local::now().format("%Y-%m-%d").to_string();
    let relative_path = format!("daily/{}.md", today);
    let full_path = std::path::Path::new(&*vault_path).join(&relative_path);

    if !full_path.exists() {
        let content = format!(
            "# {}\n\n## Journal\n\n\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
            Local::now().format("%A, %B %d, %Y")
        );
        vault::save_note(&vault_path, &relative_path, &content)?;

        let search = state.search_index.lock().unwrap();
        search.index_note(&vault_path, &relative_path, &content).ok();
    }

    Ok(relative_path)
}

#[tauri::command]
pub fn render_markdown(content: String) -> Result<String, String> {
    Ok(markdown::render_markdown(&content))
}

#[tauri::command]
pub fn search_notes(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let search = state.search_index.lock().unwrap();
    search.search(&query, 20)
}

#[tauri::command]
pub fn get_vault_path(state: State<AppState>) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(vault_path.clone())
}

#[tauri::command]
pub fn set_vault_path(state: State<AppState>, path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;

    let mut vault_path = state.vault_path.lock().unwrap();
    *vault_path = path.clone();

    let mut search = state.search_index.lock().unwrap();
    search.reindex_vault(&path)?;

    Ok(())
}

#[tauri::command]
pub fn create_folder(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    vault::create_folder(&vault_path, &path)
}

#[tauri::command]
pub fn rename_file(state: State<AppState>, old_path: String, new_path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    vault::rename_file(&vault_path, &old_path, &new_path)
}

#[tauri::command]
pub fn get_tags(state: State<AppState>) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(vault::collect_all_tags(&vault_path))
}

#[tauri::command]
pub fn get_backlinks(state: State<AppState>, note_path: String) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(vault::find_backlinks(&vault_path, &note_path))
}

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[tauri::command]
pub fn get_graph_data(state: State<AppState>) -> Result<GraphData, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let files = vault::build_file_tree(&vault_path);

    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    fn collect_files(file_nodes: &[vault::FileNode], result: &mut Vec<(String, String)>) {
        for node in file_nodes {
            if node.is_dir {
                collect_files(&node.children, result);
            } else {
                let name = node.name.trim_end_matches(".md").to_string();
                result.push((node.path.clone(), name));
            }
        }
    }

    let mut all_files = Vec::new();
    collect_files(&files, &mut all_files);

    for (path, name) in &all_files {
        nodes.push(GraphNode {
            id: path.clone(),
            name: name.clone(),
        });
    }

    for (path, _) in &all_files {
        if let Ok(content) = vault::read_note(&vault_path, path) {
            let links = vault::extract_wiki_links(&content);
            for link in links {
                if let Some((target_path, _)) = all_files.iter().find(|(_, name)| {
                    name == &link || link.ends_with(&format!("/{}", name))
                }) {
                    edges.push(GraphEdge {
                        source: path.clone(),
                        target: target_path.clone(),
                    });
                }
            }
        }
    }

    Ok(GraphData { nodes, edges })
}

#[tauri::command]
pub fn duplicate_note(state: State<AppState>, path: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let content = vault::read_note(&vault_path, &path)?;
    let new_path = if path.ends_with(".md") {
        format!("{} copy.md", path.trim_end_matches(".md"))
    } else {
        format!("{} copy", path)
    };
    vault::save_note(&vault_path, &new_path, &content)?;
    Ok(new_path)
}

// ===== Settings Commands =====

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(settings::load_settings(&vault_path))
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, new_settings: Settings) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    settings::save_settings(&vault_path, &new_settings)
}

#[tauri::command]
pub fn is_first_launch(state: State<AppState>) -> Result<bool, String> {
    let vault_path = state.vault_path.lock().unwrap();
    Ok(settings::is_first_launch(&vault_path))
}

// ===== Encryption Commands =====

#[tauri::command]
pub fn unlock_vault(state: State<AppState>, password: String) -> Result<bool, String> {
    let vault_path = state.vault_path.lock().unwrap();
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

    let mut pwd = state.vault_password.lock().unwrap();
    *pwd = Some(password);

    let mut locked = state.vault_locked.lock().unwrap();
    *locked = false;

    Ok(true)
}

#[tauri::command]
pub fn lock_vault(state: State<AppState>) -> Result<(), String> {
    let mut pwd = state.vault_password.lock().unwrap();
    *pwd = None;
    let mut locked = state.vault_locked.lock().unwrap();
    *locked = true;
    Ok(())
}

#[tauri::command]
pub fn is_vault_locked(state: State<AppState>) -> Result<bool, String> {
    let locked = state.vault_locked.lock().unwrap();
    Ok(*locked)
}

#[tauri::command]
pub fn setup_encryption(state: State<AppState>, password: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();

    // Create a verification file: encrypt a known string with the password
    let verify_content = encryption::encrypt_file_content("OXIDIAN_VAULT_KEY", &password)?;
    let verify_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("vault.key");
    let dir = verify_path.parent().unwrap();
    std::fs::create_dir_all(dir).map_err(|e| format!("Failed to create dir: {}", e))?;
    std::fs::write(&verify_path, verify_content)
        .map_err(|e| format!("Failed to write vault key: {}", e))?;

    // Store password in state
    let mut pwd = state.vault_password.lock().unwrap();
    *pwd = Some(password);
    let mut locked = state.vault_locked.lock().unwrap();
    *locked = false;

    // Update settings
    let mut settings = settings::load_settings(&vault_path);
    settings.vault.encryption_enabled = true;
    settings::save_settings(&vault_path, &settings)?;

    Ok(())
}

#[tauri::command]
pub fn change_password(state: State<AppState>, old_password: String, new_password: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
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

    // Re-encrypt ALL existing encrypted notes with the new password
    for entry in walkdir::WalkDir::new(&*vault_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(content) = std::fs::read_to_string(path) {
                // Check if this file is encrypted (JSON with salt field)
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

    // Re-encrypt the verification file
    let verify_content = encryption::encrypt_file_content("OXIDIAN_VAULT_KEY", &new_password)?;
    std::fs::write(&verify_path, verify_content)
        .map_err(|e| format!("Failed to write vault key: {}", e))?;

    // Update stored password
    let mut pwd = state.vault_password.lock().unwrap();
    *pwd = Some(new_password);

    Ok(())
}

// ===== Plugin Commands (legacy .oxidian/plugins/) =====

#[tauri::command]
pub fn list_plugins(state: State<AppState>) -> Result<Vec<crate::plugin::PluginManifest>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let plugin_dir = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("plugins");
    let mut manager = crate::plugin::PluginManager::new(&plugin_dir.to_string_lossy());
    manager.discover_plugins()
}

// ===== Obsidian-Compatible Plugin Commands (.obsidian/plugins/) =====

#[derive(Debug, Serialize)]
pub struct ObsidianPluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    #[serde(rename = "minAppVersion")]
    pub min_app_version: String,
}

#[tauri::command]
pub fn list_obsidian_plugins(state: State<AppState>) -> Result<Vec<ObsidianPluginManifest>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let plugins_dir = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins");

    if !plugins_dir.exists() {
        return Ok(vec![]);
    }

    let mut manifests = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let manifest_path = entry.path().join("manifest.json");
            if manifest_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                    if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&content) {
                        manifests.push(ObsidianPluginManifest {
                            id: manifest["id"].as_str().unwrap_or("").to_string(),
                            name: manifest["name"].as_str().unwrap_or("Unknown").to_string(),
                            version: manifest["version"].as_str().unwrap_or("0.0.0").to_string(),
                            description: manifest["description"].as_str().unwrap_or("").to_string(),
                            author: manifest["author"].as_str().unwrap_or("Unknown").to_string(),
                            min_app_version: manifest["minAppVersion"].as_str().unwrap_or("0.0.0").to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(manifests)
}

#[tauri::command]
pub fn read_plugin_main(state: State<AppState>, plugin_id: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let main_path = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins")
        .join(&plugin_id)
        .join("main.js");

    std::fs::read_to_string(&main_path)
        .map_err(|e| format!("Failed to read plugin main.js: {}", e))
}

#[tauri::command]
pub fn read_plugin_styles(state: State<AppState>, plugin_id: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let styles_path = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins")
        .join(&plugin_id)
        .join("styles.css");

    if !styles_path.exists() {
        return Ok(String::new());
    }

    std::fs::read_to_string(&styles_path)
        .map_err(|e| format!("Failed to read plugin styles.css: {}", e))
}

#[tauri::command]
pub fn toggle_plugin(state: State<AppState>, plugin_id: String, enabled: bool) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    let community_plugins_path = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("community-plugins.json");

    let mut plugins: Vec<String> = if community_plugins_path.exists() {
        let content = std::fs::read_to_string(&community_plugins_path)
            .map_err(|e| format!("Failed to read community-plugins.json: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    if enabled {
        if !plugins.contains(&plugin_id) {
            plugins.push(plugin_id);
        }
    } else {
        plugins.retain(|p| p != &plugin_id);
    }

    // Ensure .obsidian directory exists
    let obsidian_dir = std::path::Path::new(&*vault_path).join(".obsidian");
    std::fs::create_dir_all(&obsidian_dir)
        .map_err(|e| format!("Failed to create .obsidian dir: {}", e))?;

    let content = serde_json::to_string_pretty(&plugins)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    std::fs::write(&community_plugins_path, content)
        .map_err(|e| format!("Failed to write community-plugins.json: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_enabled_plugins(state: State<AppState>) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let community_plugins_path = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("community-plugins.json");

    if !community_plugins_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&community_plugins_path)
        .map_err(|e| format!("Failed to read community-plugins.json: {}", e))?;
    let plugins: Vec<String> = serde_json::from_str(&content).unwrap_or_default();
    Ok(plugins)
}

#[tauri::command]
pub fn get_plugin_data(state: State<AppState>, plugin_id: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let data_path = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins")
        .join(&plugin_id)
        .join("data.json");

    if !data_path.exists() {
        return Ok(String::new());
    }

    std::fs::read_to_string(&data_path)
        .map_err(|e| format!("Failed to read plugin data.json: {}", e))
}

#[tauri::command]
pub fn save_plugin_data(state: State<AppState>, plugin_id: String, data: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    let plugin_dir = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins")
        .join(&plugin_id);

    std::fs::create_dir_all(&plugin_dir)
        .map_err(|e| format!("Failed to create plugin dir: {}", e))?;

    let data_path = plugin_dir.join("data.json");
    std::fs::write(&data_path, data)
        .map_err(|e| format!("Failed to write plugin data.json: {}", e))?;

    Ok(())
}

// ===== Theme Commands =====

#[tauri::command]
pub fn list_custom_themes(state: State<AppState>) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let themes_dir = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("themes");

    if !themes_dir.exists() {
        return Ok(vec![]);
    }

    let mut themes = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&themes_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".css") {
                themes.push(name.trim_end_matches(".css").to_string());
            }
        }
    }
    Ok(themes)
}

#[tauri::command]
pub fn load_custom_theme(state: State<AppState>, name: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().unwrap();
    let theme_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("themes")
        .join(format!("{}.css", name));

    std::fs::read_to_string(&theme_path)
        .map_err(|e| format!("Failed to load theme: {}", e))
}

// ===== Plugin Install Command =====

#[tauri::command]
pub fn install_plugin(state: State<AppState>, source_path: String, plugin_id: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().unwrap();
    let dest_dir = std::path::Path::new(&*vault_path)
        .join(".obsidian")
        .join("plugins")
        .join(&plugin_id);

    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Failed to create plugin dir: {}", e))?;

    let source = std::path::Path::new(&source_path);
    if !source.is_dir() {
        return Err("Source path is not a directory".to_string());
    }

    // Copy all files from source to dest
    for entry in walkdir::WalkDir::new(source).min_depth(1).max_depth(1) {
        let entry = entry.map_err(|e| format!("Walk error: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        let dest_file = dest_dir.join(&file_name);

        if entry.file_type().is_file() {
            std::fs::copy(entry.path(), &dest_file)
                .map_err(|e| format!("Failed to copy {}: {}", file_name, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn read_file_absolute(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

// ===== Vault Setup Command =====

#[tauri::command]
pub fn setup_vault(state: State<AppState>, path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create vault: {}", e))?;
    std::fs::create_dir_all(format!("{}/daily", path)).ok();

    let mut vault_path = state.vault_path.lock().unwrap();
    *vault_path = path.clone();

    // Create default settings
    let mut default_settings = Settings::default();
    default_settings.general.vault_path = path.clone();
    settings::save_settings(&path, &default_settings)?;

    // Reindex
    let mut search = state.search_index.lock().unwrap();
    search.reindex_vault(&path)?;

    Ok(())
}
