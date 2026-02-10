use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// ─── Settings version for migrations ─────────────────────────────────

const SETTINGS_VERSION: u32 = 2;

// ─── Top-level Settings ──────────────────────────────────────────────

/// The main settings struct. All sub-structs use `#[serde(default)]` so that
/// adding new fields never breaks deserialization of older configs.
/// This struct is sent to/from the JS frontend via Tauri commands.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    /// Internal version — used for migration between schema changes.
    #[serde(default = "default_version")]
    pub version: u32,

    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(default)]
    pub editor: EditorSettings,
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub vault: VaultSettings,
    #[serde(default)]
    pub files: FilesSettings,
    #[serde(default)]
    pub plugins: PluginsSettings,
    #[serde(default)]
    pub remember: RememberSettings,
    #[serde(default)]
    pub update: UpdateSettings,
}

fn default_version() -> u32 {
    SETTINGS_VERSION
}

// ─── General ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralSettings {
    #[serde(default = "default_vault_path")]
    pub vault_path: String,
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default = "default_startup_behavior")]
    pub startup_behavior: String,
    #[serde(default = "default_true")]
    pub auto_save: bool,
    #[serde(default = "default_auto_save_interval")]
    pub auto_save_interval: u32,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            vault_path: default_vault_path(),
            language: "en".into(),
            startup_behavior: "welcome".into(),
            auto_save: true,
            auto_save_interval: 5,
        }
    }
}

fn default_vault_path() -> String {
    crate::engine::vault::default_vault_path()
}
fn default_language() -> String {
    "en".into()
}
fn default_startup_behavior() -> String {
    "welcome".into()
}
fn default_auto_save_interval() -> u32 {
    5
}

// ─── Editor ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorSettings {
    #[serde(default = "default_font_family")]
    pub font_family: String,
    #[serde(default = "default_font_size")]
    pub font_size: u32,
    #[serde(default = "default_line_height")]
    pub line_height: f64,
    #[serde(default = "default_tab_size")]
    pub tab_size: u32,
    #[serde(default = "default_true")]
    pub spell_check: bool,
    #[serde(default)]
    pub vim_mode: bool,
    #[serde(default = "default_true")]
    pub line_numbers: bool,
    #[serde(default = "default_true")]
    pub word_wrap: bool,
}

impl Default for EditorSettings {
    fn default() -> Self {
        Self {
            font_family: default_font_family(),
            font_size: 15,
            line_height: 1.7,
            tab_size: 4,
            spell_check: true,
            vim_mode: false,
            line_numbers: true,
            word_wrap: true,
        }
    }
}

fn default_font_family() -> String {
    "JetBrains Mono, Fira Code, Consolas, monospace".into()
}
fn default_font_size() -> u32 {
    15
}
fn default_line_height() -> f64 {
    1.7
}
fn default_tab_size() -> u32 {
    4
}

// ─── Appearance ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppearanceSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent_color")]
    pub accent_color: String,
    #[serde(default = "default_interface_font_size")]
    pub interface_font_size: u32,
    #[serde(default = "default_true")]
    pub show_status_bar: bool,
    #[serde(default = "default_true")]
    pub show_line_numbers: bool,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            accent_color: "#7f6df2".into(),
            interface_font_size: 13,
            show_status_bar: true,
            show_line_numbers: true,
        }
    }
}

fn default_theme() -> String {
    "dark".into()
}
fn default_accent_color() -> String {
    "#7f6df2".into()
}
fn default_interface_font_size() -> u32 {
    13
}

// ─── Vault ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultSettings {
    #[serde(default)]
    pub encryption_enabled: bool,
    #[serde(default)]
    pub auto_backup: bool,
    #[serde(default = "default_true")]
    pub auto_pair_brackets: bool,
    #[serde(default = "default_true")]
    pub auto_pair_markdown: bool,
    #[serde(default = "default_view_mode")]
    pub default_view_mode: String,
    #[serde(default)]
    pub strict_line_breaks: bool,
}

impl Default for VaultSettings {
    fn default() -> Self {
        Self {
            encryption_enabled: false,
            auto_backup: false,
            auto_pair_brackets: true,
            auto_pair_markdown: true,
            default_view_mode: "edit".into(),
            strict_line_breaks: false,
        }
    }
}

fn default_view_mode() -> String {
    "edit".into()
}

// ─── Files ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilesSettings {
    #[serde(default = "default_deleted_behavior")]
    pub deleted_files_behavior: String,
    #[serde(default = "default_attachment_folder")]
    pub attachment_folder: String,
    #[serde(default = "default_new_file_location")]
    pub new_file_location: String,
}

impl Default for FilesSettings {
    fn default() -> Self {
        Self {
            deleted_files_behavior: "trash".into(),
            attachment_folder: "attachments".into(),
            new_file_location: "root".into(),
        }
    }
}

fn default_deleted_behavior() -> String {
    "trash".into()
}
fn default_attachment_folder() -> String {
    "attachments".into()
}
fn default_new_file_location() -> String {
    "root".into()
}

// ─── Plugins ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginsSettings {
    #[serde(default)]
    pub enabled_plugins: Vec<String>,
    #[serde(default)]
    pub plugin_settings: HashMap<String, serde_json::Value>,
}

impl Default for PluginsSettings {
    fn default() -> Self {
        Self {
            enabled_plugins: vec![],
            plugin_settings: HashMap::new(),
        }
    }
}

// ─── Remember (spaced repetition) ────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RememberSettings {
    #[serde(default)]
    pub daily_review_reminder: bool,
    #[serde(default = "default_cards_per_session")]
    pub cards_per_session: u32,
    #[serde(default = "default_quality")]
    pub default_quality: u32,
}

impl Default for RememberSettings {
    fn default() -> Self {
        Self {
            daily_review_reminder: false,
            cards_per_session: 20,
            default_quality: 3,
        }
    }
}

fn default_cards_per_session() -> u32 {
    20
}
fn default_quality() -> u32 {
    3
}

// ─── Update ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateSettings {
    #[serde(default = "default_true")]
    pub auto_check: bool,
    #[serde(default = "default_check_interval")]
    pub check_interval: u32,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            auto_check: true,
            check_interval: 86400,
        }
    }
}

fn default_check_interval() -> u32 {
    86400
}

// ─── Shared default helpers ──────────────────────────────────────────

fn default_true() -> bool {
    true
}

// ─── Settings impl ───────────────────────────────────────────────────

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: SETTINGS_VERSION,
            general: GeneralSettings::default(),
            editor: EditorSettings::default(),
            appearance: AppearanceSettings::default(),
            vault: VaultSettings::default(),
            files: FilesSettings::default(),
            plugins: PluginsSettings::default(),
            remember: RememberSettings::default(),
            update: UpdateSettings::default(),
        }
    }
}

impl Settings {
    /// Sensible defaults (alias for Default).
    pub fn get_default() -> Self {
        Self::default()
    }

    /// Validate constraints. Returns a list of issues (empty = valid).
    pub fn validate(&self) -> Vec<String> {
        let mut issues = Vec::new();

        if self.editor.font_size < 8 || self.editor.font_size > 48 {
            issues.push("editor.font_size must be between 8 and 48".into());
        }
        if self.editor.line_height < 1.0 || self.editor.line_height > 3.0 {
            issues.push("editor.line_height must be between 1.0 and 3.0".into());
        }
        if !matches!(self.editor.tab_size, 2 | 4 | 8) {
            issues.push("editor.tab_size must be 2, 4, or 8".into());
        }
        if self.appearance.interface_font_size < 10 || self.appearance.interface_font_size > 24 {
            issues.push("appearance.interface_font_size must be between 10 and 24".into());
        }
        if self.general.auto_save_interval == 0 {
            issues.push("general.auto_save_interval must be > 0".into());
        }
        if self.remember.cards_per_session == 0 {
            issues.push("remember.cards_per_session must be > 0".into());
        }
        if self.remember.default_quality > 5 {
            issues.push("remember.default_quality must be 0-5".into());
        }
        if !matches!(
            self.files.deleted_files_behavior.as_str(),
            "trash" | "delete" | "system-trash"
        ) {
            issues.push("files.deleted_files_behavior must be trash, delete, or system-trash".into());
        }
        if !matches!(
            self.files.new_file_location.as_str(),
            "root" | "current" | "folder"
        ) {
            issues.push("files.new_file_location must be root, current, or folder".into());
        }
        if !matches!(
            self.vault.default_view_mode.as_str(),
            "edit" | "preview" | "split"
        ) {
            issues.push("vault.default_view_mode must be edit, preview, or split".into());
        }

        issues
    }

    /// Merge a partial JSON update into the current settings.
    /// Only overwrites fields present in `partial`.
    pub fn merge(&mut self, partial: &serde_json::Value) {
        if let Ok(base_val) = serde_json::to_value(&*self) {
            if let Some(merged) = merge_json(&base_val, partial) {
                if let Ok(updated) = serde_json::from_value::<Settings>(merged) {
                    *self = updated;
                }
            }
        }
    }

    /// Migrate from older versions to current.
    pub fn migrate(&mut self) {
        // v1 → v2: added files, remember, update sections (handled by #[serde(default)])
        // Just bump the version number.
        if self.version < SETTINGS_VERSION {
            self.version = SETTINGS_VERSION;
        }
    }
}

/// Deep-merge two JSON values. `patch` values overwrite `base`.
fn merge_json(base: &serde_json::Value, patch: &serde_json::Value) -> Option<serde_json::Value> {
    match (base, patch) {
        (serde_json::Value::Object(b), serde_json::Value::Object(p)) => {
            let mut result = b.clone();
            for (key, val) in p {
                if let Some(existing) = b.get(key) {
                    if let Some(merged) = merge_json(existing, val) {
                        result.insert(key.clone(), merged);
                    }
                } else {
                    result.insert(key.clone(), val.clone());
                }
            }
            Some(serde_json::Value::Object(result))
        }
        (_, patch) => Some(patch.clone()),
    }
}

// ─── File I/O ────────────────────────────────────────────────────────

pub fn settings_path(vault_path: &str) -> String {
    Path::new(vault_path)
        .join(".oxidian")
        .join("settings.json")
        .to_string_lossy()
        .to_string()
}

pub fn load_settings(vault_path: &str) -> Settings {
    let path = settings_path(vault_path);
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(mut settings) = serde_json::from_str::<Settings>(&content) {
            settings.migrate();
            return settings;
        }
    }
    Settings::default()
}

pub fn save_settings(vault_path: &str, settings: &Settings) -> Result<(), String> {
    let path = settings_path(vault_path);
    let dir = Path::new(&path).parent().unwrap();
    fs::create_dir_all(dir).map_err(|e| format!("Failed to create .oxidian dir: {}", e))?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))
}

pub fn is_first_launch(vault_path: &str) -> bool {
    !Path::new(&settings_path(vault_path)).exists()
}

// ─── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_default_settings() {
        let s = Settings::default();
        assert_eq!(s.version, SETTINGS_VERSION);
        assert_eq!(s.general.language, "en");
        assert_eq!(s.editor.font_size, 15);
        assert_eq!(s.appearance.theme, "dark");
        assert!(s.vault.auto_pair_brackets);
        assert_eq!(s.files.deleted_files_behavior, "trash");
        assert_eq!(s.remember.cards_per_session, 20);
        assert!(s.update.auto_check);
    }

    #[test]
    fn test_validate_ok() {
        let s = Settings::default();
        assert!(s.validate().is_empty());
    }

    #[test]
    fn test_validate_bad_font_size() {
        let mut s = Settings::default();
        s.editor.font_size = 2;
        let issues = s.validate();
        assert!(!issues.is_empty());
        assert!(issues[0].contains("font_size"));
    }

    #[test]
    fn test_validate_bad_tab_size() {
        let mut s = Settings::default();
        s.editor.tab_size = 3;
        assert!(!s.validate().is_empty());
    }

    #[test]
    fn test_validate_bad_deleted_behavior() {
        let mut s = Settings::default();
        s.files.deleted_files_behavior = "yeet".into();
        assert!(!s.validate().is_empty());
    }

    #[test]
    fn test_save_and_load() {
        let dir = TempDir::new().unwrap();
        let vp = dir.path().to_str().unwrap();

        let mut s = Settings::default();
        s.general.language = "de".into();
        s.editor.font_size = 18;
        s.remember.cards_per_session = 30;
        save_settings(vp, &s).unwrap();

        let loaded = load_settings(vp);
        assert_eq!(loaded.general.language, "de");
        assert_eq!(loaded.editor.font_size, 18);
        assert_eq!(loaded.remember.cards_per_session, 30);
    }

    #[test]
    fn test_load_missing_returns_default() {
        let dir = TempDir::new().unwrap();
        let s = load_settings(dir.path().to_str().unwrap());
        assert_eq!(s.general.language, "en");
    }

    #[test]
    fn test_is_first_launch() {
        let dir = TempDir::new().unwrap();
        let vp = dir.path().to_str().unwrap();
        assert!(is_first_launch(vp));
        save_settings(vp, &Settings::default()).unwrap();
        assert!(!is_first_launch(vp));
    }

    #[test]
    fn test_merge_partial() {
        let mut s = Settings::default();
        let patch = serde_json::json!({
            "editor": { "font_size": 20 },
            "appearance": { "theme": "nord" }
        });
        s.merge(&patch);
        assert_eq!(s.editor.font_size, 20);
        assert_eq!(s.appearance.theme, "nord");
        // Untouched fields remain default
        assert_eq!(s.editor.tab_size, 4);
        assert_eq!(s.general.language, "en");
    }

    #[test]
    fn test_migration_bumps_version() {
        let mut s = Settings::default();
        s.version = 1;
        s.migrate();
        assert_eq!(s.version, SETTINGS_VERSION);
    }

    #[test]
    fn test_deserialize_old_format_with_missing_fields() {
        // Simulates loading a v1 config that lacks new sections
        let json = r##"{
            "general": { "vault_path": "/tmp/test", "language": "en", "startup_behavior": "welcome" },
            "editor": { "font_family": "mono", "font_size": 14, "line_height": 1.5, "tab_size": 2, "spell_check": false, "vim_mode": true },
            "appearance": { "theme": "light", "accent_color": "#ff0000", "interface_font_size": 14 },
            "vault": { "encryption_enabled": false, "auto_backup": true },
            "plugins": { "enabled_plugins": ["abc"] }
        }"##;

        let s: Settings = serde_json::from_str(json).unwrap();
        // New fields get defaults
        assert_eq!(s.files.deleted_files_behavior, "trash");
        assert_eq!(s.remember.cards_per_session, 20);
        assert!(s.update.auto_check);
        // Old fields preserved
        assert_eq!(s.editor.font_size, 14);
        assert!(s.editor.vim_mode);
        assert!(s.vault.auto_backup);
        assert_eq!(s.plugins.enabled_plugins, vec!["abc"]);
    }

    #[test]
    fn test_roundtrip_serialization() {
        let s = Settings::default();
        let json = serde_json::to_string(&s).unwrap();
        let s2: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(s.editor.font_size, s2.editor.font_size);
        assert_eq!(s.appearance.theme, s2.appearance.theme);
        assert_eq!(s.files.deleted_files_behavior, s2.files.deleted_files_behavior);
    }

    #[test]
    fn test_merge_json_deep() {
        let base = serde_json::json!({"a": {"b": 1, "c": 2}, "d": 3});
        let patch = serde_json::json!({"a": {"b": 10}});
        let result = merge_json(&base, &patch).unwrap();
        assert_eq!(result["a"]["b"], 10);
        assert_eq!(result["a"]["c"], 2);
        assert_eq!(result["d"], 3);
    }

    #[test]
    fn test_plugin_settings_hashmap() {
        let mut s = Settings::default();
        s.plugins.plugin_settings.insert(
            "my-plugin".into(),
            serde_json::json!({"key": "value", "num": 42}),
        );
        let json = serde_json::to_string(&s).unwrap();
        let s2: Settings = serde_json::from_str(&json).unwrap();
        assert_eq!(
            s2.plugins.plugin_settings["my-plugin"]["key"],
            "value"
        );
    }
}
