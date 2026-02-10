use crate::state::AppState;
use serde::Serialize;
use tauri::State;

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
pub fn list_plugins(state: State<AppState>) -> Result<Vec<crate::plugin::LegacyManifest>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let plugin_dir = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("plugins");
    let mut manager = crate::plugin::PluginManager::new(&plugin_dir.to_string_lossy());
    manager.discover_plugins()
}

#[tauri::command]
pub fn list_obsidian_plugins(state: State<AppState>) -> Result<Vec<ObsidianPluginManifest>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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

#[tauri::command]
pub fn install_plugin(state: State<AppState>, source_path: String, plugin_id: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
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

// ===== Plugin Settings (uses PluginRegistry) =====

#[tauri::command]
pub fn get_plugin_settings(state: State<AppState>, plugin_id: String) -> Result<serde_json::Value, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let registry = crate::plugin::PluginRegistry::new(std::path::Path::new(&*vault_path));
    registry.discover_all().map_err(|e| e.to_string())?;
    registry.load_settings(&plugin_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_plugin_settings(state: State<AppState>, plugin_id: String, settings: serde_json::Value) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let registry = crate::plugin::PluginRegistry::new(std::path::Path::new(&*vault_path));
    registry.save_settings(&plugin_id, settings).map_err(|e| e.to_string())
}

// ===== New Plugin Commands =====

#[tauri::command]
pub fn discover_plugins(state: State<AppState>) -> Result<Vec<crate::plugin::PluginManifest>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let registry = crate::plugin::PluginRegistry::new(std::path::Path::new(&*vault_path));
    registry.discover_all().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn enable_plugin(state: State<AppState>, plugin_id: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let registry = crate::plugin::PluginRegistry::new(std::path::Path::new(&*vault_path));
    registry.discover_all().map_err(|e| e.to_string())?;
    let new_state = registry.enable_plugin(&plugin_id).map_err(|e| e.to_string())?;
    Ok(format!("{:?}", new_state))
}

#[tauri::command]
pub fn disable_plugin(state: State<AppState>, plugin_id: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let registry = crate::plugin::PluginRegistry::new(std::path::Path::new(&*vault_path));
    registry.discover_all().map_err(|e| e.to_string())?;
    let new_state = registry.disable_plugin(&plugin_id).map_err(|e| e.to_string())?;
    Ok(format!("{:?}", new_state))
}
