//! WASM Plugin System for Oxidian
//! 
//! Plugins are compiled to WASM and loaded at runtime. They can hook into
//! various lifecycle events to extend Oxidian's functionality.
//!
//! ## Plugin Interface (WIT-like specification)
//!
//! Plugins export the following functions:
//! - `plugin_name() -> string` — Returns the plugin name
//! - `plugin_version() -> string` — Returns the plugin version
//! - `on_load()` — Called when the plugin is loaded
//! - `on_note_open(path: string, content: string) -> option<string>` — Called when a note is opened
//! - `on_note_save(path: string, content: string) -> option<string>` — Called before a note is saved
//! - `on_render(html: string) -> option<string>` — Called after markdown is rendered to HTML

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Represents the interface that all Oxidian plugins must implement.
/// This trait defines the contract for WASM plugins.
pub trait OxidianPlugin: Send + Sync {
    /// Returns the plugin's display name
    fn name(&self) -> String;
    
    /// Returns the plugin's version string
    fn version(&self) -> String;
    
    /// Called when the plugin is first loaded.
    /// Use this for initialization.
    fn on_load(&mut self) {}
    
    /// Called when the plugin is being unloaded.
    /// Use this for cleanup.
    fn on_unload(&mut self) {}
    
    /// Called when a note is opened.
    /// Return Some(modified_content) to transform the content, or None to pass through.
    fn on_note_open(&mut self, _path: &str, _content: &str) -> Option<String> {
        None
    }
    
    /// Called before a note is saved.
    /// Return Some(modified_content) to transform the content, or None to pass through.
    fn on_note_save(&mut self, _path: &str, _content: &str) -> Option<String> {
        None
    }
    
    /// Called after markdown is rendered to HTML.
    /// Return Some(modified_html) to transform the output, or None to pass through.
    fn on_render(&mut self, _html: &str) -> Option<String> {
        None
    }
    
    /// Called when a custom command is invoked from the frontend.
    /// Returns a JSON string response.
    fn on_command(&mut self, _command: &str, _args: &str) -> Option<String> {
        None
    }
}

/// Plugin metadata stored in the plugin manifest
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub wasm_file: String,
    pub permissions: Vec<String>,
}

/// Manages loaded plugins
pub struct PluginManager {
    plugins: Vec<LoadedPlugin>,
    plugin_dir: String,
}

struct LoadedPlugin {
    manifest: PluginManifest,
    enabled: bool,
    // In a full implementation, this would hold the WASM instance
    // instance: Option<wasmtime::Instance>,
}

impl PluginManager {
    pub fn new(plugin_dir: &str) -> Self {
        PluginManager {
            plugins: Vec::new(),
            plugin_dir: plugin_dir.to_string(),
        }
    }
    
    /// Discover and load plugins from the plugin directory
    pub fn discover_plugins(&mut self) -> Result<Vec<PluginManifest>, String> {
        let dir = Path::new(&self.plugin_dir);
        if !dir.exists() {
            return Ok(vec![]);
        }
        
        let mut manifests = Vec::new();
        
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let manifest_path = entry.path().join("plugin.json");
                if manifest_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&content) {
                            manifests.push(manifest.clone());
                            self.plugins.push(LoadedPlugin {
                                manifest,
                                enabled: true,
                            });
                        }
                    }
                }
            }
        }
        
        Ok(manifests)
    }
    
    /// Get list of loaded plugins
    pub fn list_plugins(&self) -> Vec<&PluginManifest> {
        self.plugins.iter().map(|p| &p.manifest).collect()
    }
    
    /// Enable or disable a plugin
    pub fn set_enabled(&mut self, plugin_id: &str, enabled: bool) -> Result<(), String> {
        for plugin in &mut self.plugins {
            if plugin.manifest.id == plugin_id {
                plugin.enabled = enabled;
                return Ok(());
            }
        }
        Err(format!("Plugin not found: {}", plugin_id))
    }
    
    /// Run on_note_open hooks for all enabled plugins
    pub fn run_on_note_open(&self, _path: &str, content: &str) -> String {
        // In a full WASM implementation, this would call each plugin's exported function
        // For now, return the content unchanged
        content.to_string()
    }
    
    /// Run on_note_save hooks for all enabled plugins
    pub fn run_on_note_save(&self, _path: &str, content: &str) -> String {
        content.to_string()
    }
    
    /// Run on_render hooks for all enabled plugins
    pub fn run_on_render(&self, html: &str) -> String {
        html.to_string()
    }
}

// Example: Loading a WASM plugin with wasmtime (architecture reference)
//
// ```rust,no_run
// use wasmtime::*;
// 
// fn load_wasm_plugin(wasm_path: &str) -> Result<(), Box<dyn std::error::Error>> {
//     let engine = Engine::default();
//     let module = Module::from_file(&engine, wasm_path)?;
//     let mut store = Store::new(&engine, ());
//     let linker = Linker::new(&engine);
//     
//     let instance = linker.instantiate(&mut store, &module)?;
//     
//     let on_load = instance.get_typed_func::<(), ()>(&mut store, "on_load")?;
//     on_load.call(&mut store, ())?;
//     
//     Ok(())
// }
// ```
