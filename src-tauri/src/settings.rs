use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub general: GeneralSettings,
    pub editor: EditorSettings,
    pub appearance: AppearanceSettings,
    pub vault: VaultSettings,
    pub plugins: PluginsSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralSettings {
    pub vault_path: String,
    pub language: String,
    pub startup_behavior: String, // "last-session", "welcome", "daily-note"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorSettings {
    pub font_family: String,
    pub font_size: u32,
    pub line_height: f64,
    pub tab_size: u32,
    pub spell_check: bool,
    pub vim_mode: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppearanceSettings {
    pub theme: String,           // "dark", "light", "nord", "solarized", or custom name
    pub accent_color: String,    // hex color
    pub interface_font_size: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultSettings {
    pub encryption_enabled: bool,
    pub auto_backup: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginsSettings {
    pub enabled_plugins: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        let vault_path = crate::vault::default_vault_path();
        Settings {
            general: GeneralSettings {
                vault_path,
                language: "en".to_string(),
                startup_behavior: "welcome".to_string(),
            },
            editor: EditorSettings {
                font_family: "JetBrains Mono, Fira Code, Consolas, monospace".to_string(),
                font_size: 15,
                line_height: 1.7,
                tab_size: 4,
                spell_check: true,
                vim_mode: false,
            },
            appearance: AppearanceSettings {
                theme: "dark".to_string(),
                accent_color: "#7f6df2".to_string(),
                interface_font_size: 13,
            },
            vault: VaultSettings {
                encryption_enabled: false,
                auto_backup: false,
            },
            plugins: PluginsSettings {
                enabled_plugins: vec![],
            },
        }
    }
}

/// Get the settings file path for a vault
pub fn settings_path(vault_path: &str) -> String {
    let p = Path::new(vault_path).join(".oxidian").join("settings.json");
    p.to_string_lossy().to_string()
}

/// Load settings from the vault's .oxidian/settings.json
pub fn load_settings(vault_path: &str) -> Settings {
    let path = settings_path(vault_path);
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<Settings>(&content) {
            return settings;
        }
    }
    Settings::default()
}

/// Save settings to the vault's .oxidian/settings.json
pub fn save_settings(vault_path: &str, settings: &Settings) -> Result<(), String> {
    let path = settings_path(vault_path);
    let dir = Path::new(&path).parent().unwrap();
    fs::create_dir_all(dir).map_err(|e| format!("Failed to create .oxidian dir: {}", e))?;

    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))
}

/// Check if this is first launch (no settings file exists)
pub fn is_first_launch(vault_path: &str) -> bool {
    !Path::new(&settings_path(vault_path)).exists()
}
