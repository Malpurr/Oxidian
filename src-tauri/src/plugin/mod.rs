//! Oxidian Plugin System
//!
//! Manages Obsidian-compatible JS plugins loaded from `.obsidian/plugins/`.

pub mod api;
pub mod loader;
pub mod sandbox;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

// ─── Manifest ────────────────────────────────────────────────────────────────

/// Obsidian-compatible plugin manifest (manifest.json)
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub author_url: Option<String>,
    #[serde(default)]
    pub min_app_version: String,
    #[serde(default)]
    pub is_desktop_only: bool,
    #[serde(default)]
    pub permissions: Vec<String>,
    #[serde(default)]
    pub dependencies: HashMap<String, String>,
}

impl PluginManifest {
    pub fn from_json(data: &[u8]) -> Result<Self, PluginError> {
        serde_json::from_slice(data).map_err(|e| PluginError::ManifestParse(e.to_string()))
    }

    pub fn from_file(path: &Path) -> Result<Self, PluginError> {
        let data = std::fs::read(path)
            .map_err(|e| PluginError::Io(format!("reading {}: {}", path.display(), e)))?;
        Self::from_json(&data)
    }

    pub fn validate(&self) -> Result<(), PluginError> {
        if self.id.is_empty() {
            return Err(PluginError::ManifestParse("missing 'id'".into()));
        }
        if self.name.is_empty() {
            return Err(PluginError::ManifestParse("missing 'name'".into()));
        }
        if self.version.is_empty() {
            return Err(PluginError::ManifestParse("missing 'version'".into()));
        }
        if !self.id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
            return Err(PluginError::ManifestParse(format!(
                "invalid plugin id '{}': only alphanumeric, hyphens, underscores allowed",
                self.id
            )));
        }
        Ok(())
    }
}

// ─── Plugin State ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PluginState {
    Installed,
    Enabled,
    Disabled,
    Error,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginEntry {
    pub manifest: PluginManifest,
    pub state: PluginState,
    pub dir: PathBuf,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PluginError {
    ManifestParse(String),
    NotFound(String),
    AlreadyLoaded(String),
    DependencyMissing { plugin: String, dependency: String },
    PermissionDenied(String),
    Io(String),
    Sandbox(String),
    Registry(String),
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ManifestParse(e) => write!(f, "manifest parse error: {e}"),
            Self::NotFound(id) => write!(f, "plugin not found: {id}"),
            Self::AlreadyLoaded(id) => write!(f, "plugin already loaded: {id}"),
            Self::DependencyMissing { plugin, dependency } => {
                write!(f, "plugin {plugin} requires {dependency}")
            }
            Self::PermissionDenied(msg) => write!(f, "permission denied: {msg}"),
            Self::Io(e) => write!(f, "I/O error: {e}"),
            Self::Sandbox(e) => write!(f, "sandbox error: {e}"),
            Self::Registry(e) => write!(f, "registry error: {e}"),
        }
    }
}

impl std::error::Error for PluginError {}

// ─── Event System ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum PluginEvent {
    FileCreated { path: String },
    FileModified { path: String },
    FileDeleted { path: String },
    FileRenamed { old_path: String, new_path: String },
    LayoutChanged,
    ActiveFileChanged { path: Option<String> },
    Custom { plugin_id: String, event_name: String, data: serde_json::Value },
}

// ─── Plugin Registry ─────────────────────────────────────────────────────────

pub struct PluginRegistry {
    inner: Mutex<RegistryInner>,
}

struct RegistryInner {
    plugins_dir: PathBuf,
    plugins: HashMap<String, PluginEntry>,
    enabled_ids: Vec<String>,
    event_subscriptions: HashMap<String, Vec<String>>,
    settings_cache: HashMap<String, serde_json::Value>,
}

impl PluginRegistry {
    pub fn new(vault_path: &Path) -> Self {
        let plugins_dir = vault_path.join(".obsidian").join("plugins");
        Self {
            inner: Mutex::new(RegistryInner {
                plugins_dir,
                plugins: HashMap::new(),
                enabled_ids: Vec::new(),
                event_subscriptions: HashMap::new(),
                settings_cache: HashMap::new(),
            }),
        }
    }

    pub fn set_vault_path(&self, vault_path: &Path) {
        let mut inner = self.inner.lock().unwrap();
        inner.plugins_dir = vault_path.join(".obsidian").join("plugins");
        inner.plugins.clear();
        inner.enabled_ids.clear();
        inner.event_subscriptions.clear();
        inner.settings_cache.clear();
    }

    pub fn discover_all(&self) -> Result<Vec<PluginManifest>, PluginError> {
        let mut inner = self.inner.lock().unwrap();
        inner.plugins.clear();

        if !inner.plugins_dir.exists() {
            return Ok(vec![]);
        }

        inner.enabled_ids = Self::read_enabled_list(&inner.plugins_dir)?;

        let entries = std::fs::read_dir(&inner.plugins_dir)
            .map_err(|e| PluginError::Io(format!("reading plugins dir: {e}")))?;

        let mut manifests = Vec::new();

        for entry in entries.filter_map(|e| e.ok()) {
            let dir = entry.path();
            if !dir.is_dir() { continue; }

            let manifest_path = dir.join("manifest.json");
            if !manifest_path.exists() { continue; }

            match PluginManifest::from_file(&manifest_path) {
                Ok(manifest) => {
                    if manifest.validate().is_err() { continue; }
                    let id = manifest.id.clone();
                    let state = if inner.enabled_ids.contains(&id) {
                        PluginState::Enabled
                    } else {
                        PluginState::Disabled
                    };
                    manifests.push(manifest.clone());
                    inner.plugins.insert(id, PluginEntry { manifest, state, dir, error: None });
                }
                Err(e) => {
                    log::warn!("Failed to parse manifest at {}: {e}", dir.display());
                }
            }
        }

        Ok(manifests)
    }

    pub fn list_plugins(&self) -> Vec<PluginEntry> {
        let inner = self.inner.lock().unwrap();
        inner.plugins.values().cloned().collect()
    }

    pub fn get_plugin(&self, plugin_id: &str) -> Option<PluginEntry> {
        let inner = self.inner.lock().unwrap();
        inner.plugins.get(plugin_id).cloned()
    }

    pub fn get_enabled_ids(&self) -> Vec<String> {
        let inner = self.inner.lock().unwrap();
        inner.enabled_ids.clone()
    }

    pub fn enable_plugin(&self, plugin_id: &str) -> Result<PluginState, PluginError> {
        let mut inner = self.inner.lock().unwrap();

        // Check dependencies first (immutable borrow only)
        let deps = inner.plugins.get(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.into()))?
            .manifest.dependencies.clone();
        for (dep_id, _version) in &deps {
            if !inner.enabled_ids.contains(dep_id) {
                return Err(PluginError::DependencyMissing {
                    plugin: plugin_id.into(),
                    dependency: dep_id.clone(),
                });
            }
        }

        // Now mutate
        let entry = inner.plugins.get_mut(plugin_id).unwrap();
        entry.state = PluginState::Enabled;
        entry.error = None;
        if !inner.enabled_ids.contains(&plugin_id.to_string()) {
            inner.enabled_ids.push(plugin_id.to_string());
        }
        Self::write_enabled_list(&inner.plugins_dir, &inner.enabled_ids)?;
        Ok(PluginState::Enabled)
    }

    pub fn disable_plugin(&self, plugin_id: &str) -> Result<PluginState, PluginError> {
        let mut inner = self.inner.lock().unwrap();
        let entry = inner.plugins.get_mut(plugin_id)
            .ok_or_else(|| PluginError::NotFound(plugin_id.into()))?;

        entry.state = PluginState::Disabled;
        inner.enabled_ids.retain(|id| id != plugin_id);
        Self::write_enabled_list(&inner.plugins_dir, &inner.enabled_ids)?;
        Ok(PluginState::Disabled)
    }

    pub fn set_error(&self, plugin_id: &str, error: String) {
        let mut inner = self.inner.lock().unwrap();
        if let Some(entry) = inner.plugins.get_mut(plugin_id) {
            entry.state = PluginState::Error;
            entry.error = Some(error);
        }
    }

    pub fn load_settings(&self, plugin_id: &str) -> Result<serde_json::Value, PluginError> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(cached) = inner.settings_cache.get(plugin_id) {
            return Ok(cached.clone());
        }

        let data_path = inner.plugins_dir.join(plugin_id).join("data.json");
        let value = if data_path.exists() {
            let content = std::fs::read_to_string(&data_path)
                .map_err(|e| PluginError::Io(format!("reading data.json: {e}")))?;
            serde_json::from_str(&content).unwrap_or(serde_json::Value::Object(Default::default()))
        } else {
            serde_json::Value::Object(Default::default())
        };

        inner.settings_cache.insert(plugin_id.to_string(), value.clone());
        Ok(value)
    }

    pub fn save_settings(&self, plugin_id: &str, data: serde_json::Value) -> Result<(), PluginError> {
        let mut inner = self.inner.lock().unwrap();
        let plugin_dir = inner.plugins_dir.join(plugin_id);
        std::fs::create_dir_all(&plugin_dir)
            .map_err(|e| PluginError::Io(format!("creating plugin dir: {e}")))?;

        let data_path = plugin_dir.join("data.json");
        let content = serde_json::to_string_pretty(&data)
            .map_err(|e| PluginError::Io(format!("serializing data.json: {e}")))?;
        std::fs::write(&data_path, content)
            .map_err(|e| PluginError::Io(format!("writing data.json: {e}")))?;

        inner.settings_cache.insert(plugin_id.to_string(), data);
        Ok(())
    }

    pub fn clear_settings_cache(&self) {
        let mut inner = self.inner.lock().unwrap();
        inner.settings_cache.clear();
    }

    pub fn subscribe(&self, plugin_id: &str, event_name: &str) {
        let mut inner = self.inner.lock().unwrap();
        inner.event_subscriptions.entry(event_name.to_string()).or_default().push(plugin_id.to_string());
    }

    pub fn unsubscribe_all(&self, plugin_id: &str) {
        let mut inner = self.inner.lock().unwrap();
        for subs in inner.event_subscriptions.values_mut() {
            subs.retain(|id| id != plugin_id);
        }
    }

    pub fn get_subscribers(&self, event_name: &str) -> Vec<String> {
        let inner = self.inner.lock().unwrap();
        inner.event_subscriptions.get(event_name).cloned().unwrap_or_default()
    }

    fn read_enabled_list(plugins_dir: &Path) -> Result<Vec<String>, PluginError> {
        let path = plugins_dir.parent().unwrap_or(plugins_dir).join("community-plugins.json");
        if !path.exists() { return Ok(Vec::new()); }
        let content = std::fs::read_to_string(&path)
            .map_err(|e| PluginError::Io(format!("reading community-plugins.json: {e}")))?;
        Ok(serde_json::from_str(&content).unwrap_or_default())
    }

    fn write_enabled_list(plugins_dir: &Path, enabled: &[String]) -> Result<(), PluginError> {
        let obsidian_dir = plugins_dir.parent().unwrap_or(plugins_dir);
        std::fs::create_dir_all(obsidian_dir)
            .map_err(|e| PluginError::Io(format!("creating .obsidian dir: {e}")))?;
        let path = obsidian_dir.join("community-plugins.json");
        let content = serde_json::to_string_pretty(enabled)
            .map_err(|e| PluginError::Io(format!("serializing: {e}")))?;
        std::fs::write(&path, content)
            .map_err(|e| PluginError::Io(format!("writing community-plugins.json: {e}")))?;
        Ok(())
    }
}

// ─── Legacy PluginManager for existing commands.rs compatibility ─────────────

pub struct PluginManager {
    plugins: Vec<LoadedPlugin>,
    plugin_dir: String,
}

struct LoadedPlugin {
    #[allow(dead_code)]
    manifest: LegacyManifest,
    #[allow(dead_code)]
    enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LegacyManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub wasm_file: String,
    pub permissions: Vec<String>,
}

impl PluginManager {
    pub fn new(plugin_dir: &str) -> Self {
        PluginManager {
            plugins: Vec::new(),
            plugin_dir: plugin_dir.to_string(),
        }
    }

    pub fn discover_plugins(&mut self) -> Result<Vec<LegacyManifest>, String> {
        let dir = std::path::Path::new(&self.plugin_dir);
        if !dir.exists() { return Ok(vec![]); }

        let mut manifests = Vec::new();
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let manifest_path = entry.path().join("plugin.json");
                if manifest_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<LegacyManifest>(&content) {
                            manifests.push(manifest.clone());
                            self.plugins.push(LoadedPlugin { manifest, enabled: true });
                        }
                    }
                }
            }
        }
        Ok(manifests)
    }
}

// ─── Legacy trait ────────────────────────────────────────────────────────────

pub trait OxidianPlugin: Send + Sync {
    fn name(&self) -> String;
    fn version(&self) -> String;
    fn on_load(&mut self) {}
    fn on_unload(&mut self) {}
    fn on_note_open(&mut self, _path: &str, _content: &str) -> Option<String> { None }
    fn on_note_save(&mut self, _path: &str, _content: &str) -> Option<String> { None }
    fn on_render(&mut self, _html: &str) -> Option<String> { None }
    fn on_command(&mut self, _command: &str, _args: &str) -> Option<String> { None }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn make_test_vault() -> tempfile::TempDir {
        let tmp = tempfile::TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join(".obsidian").join("plugins")).unwrap();
        tmp
    }

    fn write_manifest(vault: &Path, id: &str, name: &str, version: &str) {
        let dir = vault.join(".obsidian").join("plugins").join(id);
        fs::create_dir_all(&dir).unwrap();
        let manifest = serde_json::json!({
            "id": id, "name": name, "version": version,
            "description": "Test", "author": "Test", "minAppVersion": "0.15.0"
        });
        fs::write(dir.join("manifest.json"), manifest.to_string()).unwrap();
        fs::write(dir.join("main.js"), "// empty").unwrap();
    }

    #[test]
    fn test_manifest_parse() {
        let json = br#"{"id":"test-plugin","name":"Test","version":"1.0.0","description":"A test","author":"Me","minAppVersion":"0.15.0"}"#;
        let m = PluginManifest::from_json(json).unwrap();
        assert_eq!(m.id, "test-plugin");
        assert_eq!(m.version, "1.0.0");
    }

    #[test]
    fn test_manifest_validate_empty_id() {
        let m = PluginManifest::from_json(br#"{"id":"","name":"Test","version":"1.0.0"}"#).unwrap();
        assert!(m.validate().is_err());
    }

    #[test]
    fn test_manifest_validate_bad_chars() {
        let m = PluginManifest::from_json(br#"{"id":"bad/id","name":"Test","version":"1.0.0"}"#).unwrap();
        assert!(m.validate().is_err());
    }

    #[test]
    fn test_discover_plugins() {
        let vault = make_test_vault();
        write_manifest(vault.path(), "plugin-a", "Plugin A", "1.0.0");
        write_manifest(vault.path(), "plugin-b", "Plugin B", "2.0.0");

        let registry = PluginRegistry::new(vault.path());
        let manifests = registry.discover_all().unwrap();
        assert_eq!(manifests.len(), 2);
        assert!(registry.list_plugins().iter().all(|p| p.state == PluginState::Disabled));
    }

    #[test]
    fn test_enable_disable() {
        let vault = make_test_vault();
        write_manifest(vault.path(), "test-plugin", "Test", "1.0.0");

        let registry = PluginRegistry::new(vault.path());
        registry.discover_all().unwrap();

        assert_eq!(registry.enable_plugin("test-plugin").unwrap(), PluginState::Enabled);
        assert!(registry.get_enabled_ids().contains(&"test-plugin".to_string()));

        assert_eq!(registry.disable_plugin("test-plugin").unwrap(), PluginState::Disabled);
        assert!(!registry.get_enabled_ids().contains(&"test-plugin".to_string()));
    }

    #[test]
    fn test_settings_storage() {
        let vault = make_test_vault();
        write_manifest(vault.path(), "my-plugin", "My Plugin", "1.0.0");

        let registry = PluginRegistry::new(vault.path());
        registry.discover_all().unwrap();

        let data = serde_json::json!({"key": "value", "count": 42});
        registry.save_settings("my-plugin", data.clone()).unwrap();
        assert_eq!(registry.load_settings("my-plugin").unwrap(), data);

        registry.clear_settings_cache();
        assert_eq!(registry.load_settings("my-plugin").unwrap(), data);
    }

    #[test]
    fn test_event_subscriptions() {
        let vault = make_test_vault();
        let registry = PluginRegistry::new(vault.path());

        registry.subscribe("a", "file-created");
        registry.subscribe("b", "file-created");
        assert_eq!(registry.get_subscribers("file-created").len(), 2);

        registry.unsubscribe_all("a");
        assert_eq!(registry.get_subscribers("file-created").len(), 1);
    }

    #[test]
    fn test_dependency_check() {
        let vault = make_test_vault();
        let dir = vault.path().join(".obsidian/plugins/child");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("manifest.json"), r#"{"id":"child","name":"Child","version":"1.0.0","dependencies":{"parent":">=1.0.0"}}"#).unwrap();

        let registry = PluginRegistry::new(vault.path());
        registry.discover_all().unwrap();
        assert!(matches!(registry.enable_plugin("child"), Err(PluginError::DependencyMissing { .. })));
    }

    #[test]
    fn test_set_error() {
        let vault = make_test_vault();
        write_manifest(vault.path(), "bad", "Bad", "1.0.0");

        let registry = PluginRegistry::new(vault.path());
        registry.discover_all().unwrap();
        registry.set_error("bad", "crashed".into());

        let e = registry.get_plugin("bad").unwrap();
        assert_eq!(e.state, PluginState::Error);
        assert_eq!(e.error.as_deref(), Some("crashed"));
    }
}
