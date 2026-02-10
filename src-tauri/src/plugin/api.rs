//! Obsidian API Bridge
//!
//! Maps Obsidian API calls from JS plugins to Rust backend functions.
//! Provides the event system for bidirectional communication between
//! the Rust backend and JS plugin runtime.
//!
//! Architecture:
//! - JS plugins call `window.__TAURI__.core.invoke("plugin_api_call", {...})`
//! - This module dispatches those calls through the sandbox permission system
//! - Results flow back to JS as command return values
//! - Events flow from Rust → JS via Tauri's event emission

use super::sandbox::{Permission, SandboxManager};
use super::{PluginError, PluginEvent, PluginRegistry};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::{Arc, Mutex};

// ─── API Request/Response Types ──────────────────────────────────────────────

/// An API call from a JS plugin to the Rust backend
#[derive(Debug, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum PluginApiCall {
    // ── Vault Operations ─────────────────────────────────
    #[serde(rename = "vault.read")]
    VaultRead { path: String },
    #[serde(rename = "vault.write")]
    VaultWrite { path: String, content: String },
    #[serde(rename = "vault.create")]
    VaultCreate { path: String, content: String },
    #[serde(rename = "vault.delete")]
    VaultDelete { path: String },
    #[serde(rename = "vault.rename")]
    VaultRename { old_path: String, new_path: String },
    #[serde(rename = "vault.exists")]
    VaultExists { path: String },
    #[serde(rename = "vault.list")]
    VaultList { path: String },
    #[serde(rename = "vault.stat")]
    VaultStat { path: String },

    // ── Plugin Settings ──────────────────────────────────
    #[serde(rename = "settings.load")]
    SettingsLoad,
    #[serde(rename = "settings.save")]
    SettingsSave { data: serde_json::Value },

    // ── Events ───────────────────────────────────────────
    #[serde(rename = "events.subscribe")]
    EventsSubscribe { event_name: String },
    #[serde(rename = "events.unsubscribe")]
    EventsUnsubscribe { event_name: String },
    #[serde(rename = "events.emit")]
    EventsEmit {
        event_name: String,
        data: serde_json::Value,
    },

    // ── Metadata ─────────────────────────────────────────
    #[serde(rename = "metadata.get_tags")]
    MetadataGetTags { path: String },
    #[serde(rename = "metadata.get_links")]
    MetadataGetLinks { path: String },
    #[serde(rename = "metadata.get_backlinks")]
    MetadataGetBacklinks { path: String },
    #[serde(rename = "metadata.get_frontmatter")]
    MetadataGetFrontmatter { path: String },

    // ── App Info ─────────────────────────────────────────
    #[serde(rename = "app.get_vault_name")]
    AppGetVaultName,
    #[serde(rename = "app.get_vault_path")]
    AppGetVaultPath,
}

/// Response from a plugin API call
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum PluginApiResponse {
    String(String),
    Bool(bool),
    Json(serde_json::Value),
    FileList(Vec<FileEntry>),
    FileStat(FileStat),
    Null,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStat {
    pub size: u64,
    pub ctime: u64,
    pub mtime: u64,
    pub is_dir: bool,
}

// ─── API Dispatcher ──────────────────────────────────────────────────────────

/// Dispatches plugin API calls with permission checking and path sandboxing
pub struct PluginApiDispatcher {
    vault_path: String,
    sandbox_manager: Arc<SandboxManager>,
    registry: Arc<PluginRegistry>,
}

impl PluginApiDispatcher {
    pub fn new(
        vault_path: &str,
        sandbox_manager: Arc<SandboxManager>,
        registry: Arc<PluginRegistry>,
    ) -> Self {
        Self {
            vault_path: vault_path.to_string(),
            sandbox_manager,
            registry,
        }
    }

    /// Dispatch an API call from a plugin
    pub fn dispatch(
        &self,
        plugin_id: &str,
        call: PluginApiCall,
    ) -> Result<PluginApiResponse, PluginError> {
        match call {
            // ── Vault Read Operations ────────────────────────
            PluginApiCall::VaultRead { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let content = std::fs::read_to_string(&full_path)
                    .map_err(|e| PluginError::Io(format!("reading {path}: {e}")))?;
                Ok(PluginApiResponse::String(content))
            }

            PluginApiCall::VaultExists { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                Ok(PluginApiResponse::Bool(full_path.exists()))
            }

            PluginApiCall::VaultStat { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let meta = std::fs::metadata(&full_path)
                    .map_err(|e| PluginError::Io(format!("stat {path}: {e}")))?;
                let stat = FileStat {
                    size: meta.len(),
                    ctime: meta
                        .created()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                    mtime: meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                    is_dir: meta.is_dir(),
                };
                Ok(PluginApiResponse::FileStat(stat))
            }

            PluginApiCall::VaultList { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let entries = std::fs::read_dir(&full_path)
                    .map_err(|e| PluginError::Io(format!("listing {path}: {e}")))?;
                let files: Vec<FileEntry> = entries
                    .filter_map(|e| e.ok())
                    .map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        let is_dir = e.file_type().map(|t| t.is_dir()).unwrap_or(false);
                        let entry_path = if path.is_empty() {
                            name.clone()
                        } else {
                            format!("{}/{}", path, name)
                        };
                        FileEntry {
                            path: entry_path,
                            name,
                            is_dir,
                        }
                    })
                    .collect();
                Ok(PluginApiResponse::FileList(files))
            }

            // ── Vault Write Operations ───────────────────────
            PluginApiCall::VaultWrite { path, content } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultWrite)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                std::fs::write(&full_path, content)
                    .map_err(|e| PluginError::Io(format!("writing {path}: {e}")))?;
                Ok(PluginApiResponse::Null)
            }

            PluginApiCall::VaultCreate { path, content } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultWrite)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                if let Some(parent) = full_path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| PluginError::Io(format!("creating dirs for {path}: {e}")))?;
                }
                std::fs::write(&full_path, content)
                    .map_err(|e| PluginError::Io(format!("creating {path}: {e}")))?;
                Ok(PluginApiResponse::Null)
            }

            PluginApiCall::VaultDelete { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultWrite)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                if full_path.is_dir() {
                    std::fs::remove_dir_all(&full_path)
                        .map_err(|e| PluginError::Io(format!("deleting {path}: {e}")))?;
                } else {
                    std::fs::remove_file(&full_path)
                        .map_err(|e| PluginError::Io(format!("deleting {path}: {e}")))?;
                }
                Ok(PluginApiResponse::Null)
            }

            PluginApiCall::VaultRename {
                old_path,
                new_path,
            } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultWrite)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_old = self
                    .sandbox_manager
                    .validate_path(plugin_id, &old_path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_new = self
                    .sandbox_manager
                    .validate_path(plugin_id, &new_path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                if let Some(parent) = full_new.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| PluginError::Io(format!("creating dirs: {e}")))?;
                }
                std::fs::rename(&full_old, &full_new)
                    .map_err(|e| PluginError::Io(format!("renaming: {e}")))?;
                Ok(PluginApiResponse::Null)
            }

            // ── Settings ─────────────────────────────────────
            PluginApiCall::SettingsLoad => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::SettingsRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let data = self.registry.load_settings(plugin_id)?;
                Ok(PluginApiResponse::Json(data))
            }

            PluginApiCall::SettingsSave { data } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::SettingsWrite)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                self.registry.save_settings(plugin_id, data)?;
                Ok(PluginApiResponse::Null)
            }

            // ── Events ───────────────────────────────────────
            PluginApiCall::EventsSubscribe { event_name } => {
                self.registry.subscribe(plugin_id, &event_name);
                Ok(PluginApiResponse::Null)
            }

            PluginApiCall::EventsUnsubscribe { event_name: _ } => {
                // Individual event unsubscribe not tracked per-event;
                // full unsubscribe happens on unload
                Ok(PluginApiResponse::Null)
            }

            PluginApiCall::EventsEmit { event_name, data } => {
                // Plugin emits a custom event that other plugins can listen to
                let _event = PluginEvent::Custom {
                    plugin_id: plugin_id.to_string(),
                    event_name: event_name.clone(),
                    data: data.clone(),
                };
                // In a full implementation, this would be emitted via Tauri's event system
                // to all subscribed plugins. For now we just acknowledge it.
                Ok(PluginApiResponse::Null)
            }

            // ── Metadata ─────────────────────────────────────
            PluginApiCall::MetadataGetTags { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let content = std::fs::read_to_string(&full_path)
                    .map_err(|e| PluginError::Io(format!("reading {path}: {e}")))?;
                let tags = extract_tags(&content);
                Ok(PluginApiResponse::Json(serde_json::to_value(tags).unwrap()))
            }

            PluginApiCall::MetadataGetLinks { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let content = std::fs::read_to_string(&full_path)
                    .map_err(|e| PluginError::Io(format!("reading {path}: {e}")))?;
                let links = extract_wikilinks(&content);
                Ok(PluginApiResponse::Json(serde_json::to_value(links).unwrap()))
            }

            PluginApiCall::MetadataGetBacklinks { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                // Walk vault to find files linking to `path`
                let target_name = Path::new(&path)
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                let mut backlinks = Vec::new();
                let vault = Path::new(&self.vault_path);
                if let Ok(walker) = walkdir_vault(vault) {
                    for entry in walker {
                        if let Ok(content) = std::fs::read_to_string(entry.path()) {
                            let links = extract_wikilinks(&content);
                            if links.iter().any(|l| l == &target_name) {
                                if let Ok(rel) = entry.path().strip_prefix(vault) {
                                    backlinks.push(rel.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
                Ok(PluginApiResponse::Json(
                    serde_json::to_value(backlinks).unwrap(),
                ))
            }

            PluginApiCall::MetadataGetFrontmatter { path } => {
                self.sandbox_manager
                    .check_permission(plugin_id, Permission::VaultRead)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let full_path = self
                    .sandbox_manager
                    .validate_path(plugin_id, &path)
                    .map_err(|v| PluginError::PermissionDenied(v.to_string()))?;
                let content = std::fs::read_to_string(&full_path)
                    .map_err(|e| PluginError::Io(format!("reading {path}: {e}")))?;
                let frontmatter = extract_frontmatter(&content);
                Ok(PluginApiResponse::Json(frontmatter))
            }

            // ── App Info ─────────────────────────────────────
            PluginApiCall::AppGetVaultName => {
                let name = Path::new(&self.vault_path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                Ok(PluginApiResponse::String(name))
            }

            PluginApiCall::AppGetVaultPath => {
                // Only return the vault name, not the full system path (security)
                let name = Path::new(&self.vault_path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                Ok(PluginApiResponse::String(name))
            }
        }
    }
}

// ─── Event Emitter ───────────────────────────────────────────────────────────

/// Manages event emission from Rust to JS plugins via Tauri events
pub struct PluginEventEmitter {
    /// Pending events to be picked up by the frontend
    pending: Mutex<Vec<(String, PluginEvent)>>,
}

impl PluginEventEmitter {
    pub fn new() -> Self {
        Self {
            pending: Mutex::new(Vec::new()),
        }
    }

    /// Emit an event to all subscribed plugins
    pub fn emit(&self, registry: &PluginRegistry, event: PluginEvent) {
        let event_name = match &event {
            PluginEvent::FileCreated { .. } => "file-created",
            PluginEvent::FileModified { .. } => "file-modified",
            PluginEvent::FileDeleted { .. } => "file-deleted",
            PluginEvent::FileRenamed { .. } => "file-renamed",
            PluginEvent::LayoutChanged => "layout-changed",
            PluginEvent::ActiveFileChanged { .. } => "active-file-changed",
            PluginEvent::Custom { event_name, .. } => event_name.as_str(),
        };

        let subscribers = registry.get_subscribers(event_name);
        let mut pending = self.pending.lock().unwrap();
        for plugin_id in subscribers {
            pending.push((plugin_id, event.clone()));
        }
    }

    /// Drain pending events for a specific plugin (called from JS polling)
    pub fn drain_for_plugin(&self, plugin_id: &str) -> Vec<PluginEvent> {
        let mut pending = self.pending.lock().unwrap();
        let mut events = Vec::new();
        pending.retain(|(id, event): &(String, PluginEvent)| {
            if id == plugin_id {
                events.push(event.clone());
                false
            } else {
                true
            }
        });
        events
    }

    /// Drain all pending events (for batch emission via Tauri event)
    pub fn drain_all(&self) -> Vec<(String, PluginEvent)> {
        let mut pending = self.pending.lock().unwrap();
        std::mem::take(&mut *pending)
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Extract #tags from markdown content
fn extract_tags(content: &str) -> Vec<String> {
    let mut tags = Vec::new();
    // Frontmatter tags
    if let Some(fm) = extract_frontmatter_raw(content) {
        for line in fm.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("- ") && !trimmed.contains(':') {
                let tag = trimmed.trim_start_matches("- ").trim();
                if !tag.is_empty() {
                    tags.push(format!("#{tag}"));
                }
            }
        }
    }
    // Inline tags
    for word in content.split_whitespace() {
        if word.starts_with('#') && word.len() > 1 && !word.starts_with("##") {
            let tag = word.trim_end_matches(|c: char| c.is_ascii_punctuation() && c != '/' && c != '-' && c != '_');
            if tag.len() > 1 {
                tags.push(tag.to_string());
            }
        }
    }
    tags.sort();
    tags.dedup();
    tags
}

/// Extract [[wikilinks]] from markdown content
fn extract_wikilinks(content: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut chars = content.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '[' {
            if chars.peek() == Some(&'[') {
                chars.next();
                let mut link = String::new();
                for c2 in chars.by_ref() {
                    if c2 == ']' {
                        break;
                    }
                    link.push(c2);
                }
                // Handle [[target|display]] — take the target part
                let target = link.split('|').next().unwrap_or("").trim().to_string();
                // Handle [[target#heading]] — take just the target
                let target = target.split('#').next().unwrap_or("").trim().to_string();
                if !target.is_empty() {
                    links.push(target);
                }
            }
        }
    }
    links.sort();
    links.dedup();
    links
}

/// Extract YAML frontmatter as raw string
fn extract_frontmatter_raw(content: &str) -> Option<String> {
    if !content.starts_with("---") {
        return None;
    }
    let rest = &content[3..];
    if let Some(end) = rest.find("\n---") {
        Some(rest[..end].to_string())
    } else {
        None
    }
}

/// Extract frontmatter as JSON value (simple key: value parsing)
fn extract_frontmatter(content: &str) -> serde_json::Value {
    let raw = match extract_frontmatter_raw(content) {
        Some(r) => r,
        None => return serde_json::Value::Object(Default::default()),
    };

    let mut map = serde_json::Map::new();
    let mut current_key: Option<String> = None;
    let mut list_values: Vec<String> = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("- ") {
            // List item
            let val = trimmed.trim_start_matches("- ").trim().to_string();
            list_values.push(val);
            continue;
        }

        // Flush any pending list
        if let Some(key) = current_key.take() {
            if !list_values.is_empty() {
                map.insert(
                    key,
                    serde_json::Value::Array(
                        list_values.drain(..).map(serde_json::Value::String).collect(),
                    ),
                );
            }
        }

        if let Some((key, value)) = trimmed.split_once(':') {
            let key = key.trim().to_string();
            let value = value.trim();
            if value.is_empty() {
                // Could be a list following
                current_key = Some(key);
            } else {
                map.insert(key, serde_json::Value::String(value.to_string()));
            }
        }
    }

    // Flush final list
    if let Some(key) = current_key {
        if !list_values.is_empty() {
            map.insert(
                key,
                serde_json::Value::Array(
                    list_values.into_iter().map(serde_json::Value::String).collect(),
                ),
            );
        }
    }

    serde_json::Value::Object(map)
}

/// Walk vault markdown files
fn walkdir_vault(vault_path: &Path) -> Result<Vec<walkdir::DirEntry>, PluginError> {
    let entries: Vec<_> = walkdir::WalkDir::new(vault_path)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !(e.file_type().is_dir() && name.starts_with('.'))
        })
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path()
                    .extension()
                    .map(|ext| ext == "md")
                    .unwrap_or(false)
        })
        .collect();
    Ok(entries)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tags() {
        let content = "# Title\nSome text #tag1 and #tag2/nested more #tag1\n";
        let tags = extract_tags(content);
        assert!(tags.contains(&"#tag1".to_string()));
        assert!(tags.contains(&"#tag2/nested".to_string()));
        // No duplicates
        assert_eq!(tags.iter().filter(|t| *t == "#tag1").count(), 1);
    }

    #[test]
    fn test_extract_tags_no_headings() {
        let content = "## Heading\n### Another\n#real-tag\n";
        let tags = extract_tags(content);
        assert!(!tags.iter().any(|t| t.contains("Heading")));
        assert!(tags.contains(&"#real-tag".to_string()));
    }

    #[test]
    fn test_extract_wikilinks() {
        let content = "See [[Page A]] and [[Page B|display text]] and [[Page C#heading]]\n";
        let links = extract_wikilinks(content);
        assert!(links.contains(&"Page A".to_string()));
        assert!(links.contains(&"Page B".to_string()));
        assert!(links.contains(&"Page C".to_string()));
        assert_eq!(links.len(), 3);
    }

    #[test]
    fn test_extract_frontmatter() {
        let content = "---\ntitle: My Note\ntags:\n- tag1\n- tag2\nauthor: Alice\n---\n# Content\n";
        let fm = extract_frontmatter(content);
        assert_eq!(fm["title"], "My Note");
        assert_eq!(fm["author"], "Alice");
        let tags = fm["tags"].as_array().unwrap();
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0], "tag1");
    }

    #[test]
    fn test_extract_frontmatter_empty() {
        let content = "# No frontmatter\nJust content\n";
        let fm = extract_frontmatter(content);
        assert!(fm.as_object().unwrap().is_empty());
    }

    #[test]
    fn test_event_emitter() {
        let emitter = PluginEventEmitter::new();

        let vault = tempfile::TempDir::new().unwrap();
        let registry = PluginRegistry::new(vault.path());

        // Subscribe plugin to events
        registry.subscribe("plugin-a", "file-created");

        // Emit event
        emitter.emit(
            &registry,
            PluginEvent::FileCreated {
                path: "test.md".into(),
            },
        );

        // Drain
        let events = emitter.drain_for_plugin("plugin-a");
        assert_eq!(events.len(), 1);

        // Should be empty now
        let events = emitter.drain_for_plugin("plugin-a");
        assert!(events.is_empty());
    }

    #[test]
    fn test_event_emitter_drain_all() {
        let emitter = PluginEventEmitter::new();
        let vault = tempfile::TempDir::new().unwrap();
        let registry = PluginRegistry::new(vault.path());

        registry.subscribe("a", "file-created");
        registry.subscribe("b", "file-created");

        emitter.emit(
            &registry,
            PluginEvent::FileCreated {
                path: "test.md".into(),
            },
        );

        let all = emitter.drain_all();
        assert_eq!(all.len(), 2);
        assert!(emitter.drain_all().is_empty());
    }

    #[test]
    fn test_dispatcher_vault_read() {
        let vault = tempfile::TempDir::new().unwrap();
        std::fs::write(vault.path().join("test.md"), "hello world").unwrap();

        let sandbox_mgr = Arc::new(SandboxManager::new(vault.path()));
        let registry = Arc::new(PluginRegistry::new(vault.path()));
        sandbox_mgr.create_sandbox("test-plugin").unwrap();

        let dispatcher = PluginApiDispatcher::new(
            &vault.path().to_string_lossy(),
            sandbox_mgr,
            registry,
        );

        let result = dispatcher
            .dispatch("test-plugin", PluginApiCall::VaultRead { path: "test.md".into() })
            .unwrap();

        match result {
            PluginApiResponse::String(s) => assert_eq!(s, "hello world"),
            _ => panic!("expected String response"),
        }
    }

    #[test]
    fn test_dispatcher_vault_write() {
        let vault = tempfile::TempDir::new().unwrap();

        let sandbox_mgr = Arc::new(SandboxManager::new(vault.path()));
        let registry = Arc::new(PluginRegistry::new(vault.path()));
        sandbox_mgr.create_sandbox("test-plugin").unwrap();

        let dispatcher = PluginApiDispatcher::new(
            &vault.path().to_string_lossy(),
            sandbox_mgr,
            registry,
        );

        dispatcher
            .dispatch(
                "test-plugin",
                PluginApiCall::VaultWrite {
                    path: "new.md".into(),
                    content: "new content".into(),
                },
            )
            .unwrap();

        let content = std::fs::read_to_string(vault.path().join("new.md")).unwrap();
        assert_eq!(content, "new content");
    }

    #[test]
    fn test_dispatcher_permission_denied() {
        let vault = tempfile::TempDir::new().unwrap();

        let sandbox_mgr = Arc::new(SandboxManager::new(vault.path()));
        let registry = Arc::new(PluginRegistry::new(vault.path()));
        // No sandbox created → permission denied

        let dispatcher = PluginApiDispatcher::new(
            &vault.path().to_string_lossy(),
            sandbox_mgr,
            registry,
        );

        let result = dispatcher.dispatch(
            "unknown-plugin",
            PluginApiCall::VaultRead { path: "test.md".into() },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatcher_path_traversal() {
        let vault = tempfile::TempDir::new().unwrap();

        let sandbox_mgr = Arc::new(SandboxManager::new(vault.path()));
        let registry = Arc::new(PluginRegistry::new(vault.path()));
        sandbox_mgr.create_sandbox("evil-plugin").unwrap();

        let dispatcher = PluginApiDispatcher::new(
            &vault.path().to_string_lossy(),
            sandbox_mgr,
            registry,
        );

        let result = dispatcher.dispatch(
            "evil-plugin",
            PluginApiCall::VaultRead {
                path: "../../../etc/passwd".into(),
            },
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_dispatcher_settings() {
        let vault = tempfile::TempDir::new().unwrap();
        std::fs::create_dir_all(vault.path().join(".obsidian/plugins/my-plugin")).unwrap();
        std::fs::write(
            vault.path().join(".obsidian/plugins/my-plugin/manifest.json"),
            r#"{"id":"my-plugin","name":"My","version":"1.0.0"}"#,
        )
        .unwrap();

        let sandbox_mgr = Arc::new(SandboxManager::new(vault.path()));
        let registry = Arc::new(PluginRegistry::new(vault.path()));
        registry.discover_all().unwrap();
        sandbox_mgr.create_sandbox("my-plugin").unwrap();

        let dispatcher = PluginApiDispatcher::new(
            &vault.path().to_string_lossy(),
            sandbox_mgr,
            registry,
        );

        // Save settings
        dispatcher
            .dispatch(
                "my-plugin",
                PluginApiCall::SettingsSave {
                    data: serde_json::json!({"theme": "dark"}),
                },
            )
            .unwrap();

        // Load settings
        let result = dispatcher
            .dispatch("my-plugin", PluginApiCall::SettingsLoad)
            .unwrap();

        match result {
            PluginApiResponse::Json(v) => assert_eq!(v["theme"], "dark"),
            _ => panic!("expected Json response"),
        }
    }
}
