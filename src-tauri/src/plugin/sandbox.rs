//! Plugin Sandbox
//!
//! Isolation strategy for Obsidian-compatible JS plugins running in the frontend.
//! Since plugins execute as JS in the webview, this module provides:
//! - API permission levels (what Tauri commands a plugin can invoke)
//! - Resource limits (memory, CPU time tracking)
//! - Error containment (one plugin crash doesn't kill the app)
//! - Path sandboxing (plugins can only access vault files)

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ─── Permission System ───────────────────────────────────────────────────────

/// Permission levels for plugin API access
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Permission {
    /// Read files in the vault
    VaultRead,
    /// Write/create/delete files in the vault
    VaultWrite,
    /// Read plugin's own data.json
    SettingsRead,
    /// Write plugin's own data.json
    SettingsWrite,
    /// Register commands in the command palette
    Commands,
    /// Add UI elements (ribbon icons, status bar, views)
    Ui,
    /// Access network (fetch URLs)
    Network,
    /// Access clipboard
    Clipboard,
    /// Execute shell commands (DANGEROUS — requires explicit user approval)
    Shell,
    /// Access other plugins' APIs
    InterPlugin,
    /// Modify app settings
    AppSettings,
}

impl Permission {
    /// Parse permission from string (as used in manifest.json)
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "vault-read" => Some(Self::VaultRead),
            "vault-write" => Some(Self::VaultWrite),
            "settings-read" => Some(Self::SettingsRead),
            "settings-write" => Some(Self::SettingsWrite),
            "commands" => Some(Self::Commands),
            "ui" => Some(Self::Ui),
            "network" => Some(Self::Network),
            "clipboard" => Some(Self::Clipboard),
            "shell" => Some(Self::Shell),
            "inter-plugin" => Some(Self::InterPlugin),
            "app-settings" => Some(Self::AppSettings),
            _ => None,
        }
    }

    /// Default permissions granted to all plugins (Obsidian-compatible behavior)
    pub fn defaults() -> HashSet<Self> {
        [
            Self::VaultRead,
            Self::VaultWrite,
            Self::SettingsRead,
            Self::SettingsWrite,
            Self::Commands,
            Self::Ui,
        ]
        .into_iter()
        .collect()
    }

    /// Permissions that require explicit user approval
    pub fn is_dangerous(&self) -> bool {
        matches!(self, Self::Shell | Self::Network | Self::AppSettings)
    }
}

// ─── Plugin Sandbox Context ──────────────────────────────────────────────────

/// Per-plugin sandbox state
#[derive(Debug)]
pub struct PluginSandbox {
    pub plugin_id: String,
    /// Granted permissions
    pub permissions: HashSet<Permission>,
    /// Vault root for path validation
    vault_path: PathBuf,
    /// Resource tracking
    pub resources: ResourceTracker,
    /// Error log
    pub errors: Vec<PluginErrorRecord>,
    /// Max errors before auto-disable
    pub max_errors: usize,
}

impl PluginSandbox {
    pub fn new(plugin_id: &str, vault_path: &Path, permissions: HashSet<Permission>) -> Self {
        Self {
            plugin_id: plugin_id.to_string(),
            permissions,
            vault_path: vault_path.to_path_buf(),
            resources: ResourceTracker::new(),
            errors: Vec::new(),
            max_errors: 50,
        }
    }

    /// Create a sandbox with default (Obsidian-compatible) permissions
    pub fn with_defaults(plugin_id: &str, vault_path: &Path) -> Self {
        Self::new(plugin_id, vault_path, Permission::defaults())
    }

    /// Check if a permission is granted
    pub fn has_permission(&self, perm: Permission) -> bool {
        self.permissions.contains(&perm)
    }

    /// Grant an additional permission
    pub fn grant(&mut self, perm: Permission) {
        self.permissions.insert(perm);
    }

    /// Revoke a permission
    pub fn revoke(&mut self, perm: Permission) {
        self.permissions.remove(&perm);
    }

    /// Validate that a file path is within the vault (prevents path traversal)
    pub fn validate_path(&self, path: &str) -> Result<PathBuf, SandboxViolation> {
        let normalized = Path::new(path);

        // Reject absolute paths
        if normalized.is_absolute() {
            return Err(SandboxViolation::PathTraversal {
                plugin_id: self.plugin_id.clone(),
                path: path.to_string(),
            });
        }

        // Reject .. components
        for component in normalized.components() {
            if let std::path::Component::ParentDir = component {
                return Err(SandboxViolation::PathTraversal {
                    plugin_id: self.plugin_id.clone(),
                    path: path.to_string(),
                });
            }
        }

        let full_path = self.vault_path.join(normalized);

        // Ensure resolved path is still under vault
        let canonical_vault = self.vault_path.canonicalize().unwrap_or(self.vault_path.clone());
        let canonical_target = full_path.canonicalize().unwrap_or(full_path.clone());

        if !canonical_target.starts_with(&canonical_vault) {
            return Err(SandboxViolation::PathTraversal {
                plugin_id: self.plugin_id.clone(),
                path: path.to_string(),
            });
        }

        Ok(full_path)
    }

    /// Check permission for an API call, returning error if denied
    pub fn check_permission(&self, perm: Permission) -> Result<(), SandboxViolation> {
        if self.has_permission(perm) {
            Ok(())
        } else {
            Err(SandboxViolation::PermissionDenied {
                plugin_id: self.plugin_id.clone(),
                permission: perm,
            })
        }
    }

    /// Record an error from this plugin
    pub fn record_error(&mut self, error: String) {
        self.errors.push(PluginErrorRecord {
            timestamp: Instant::now(),
            message: error,
        });
        // Keep only last max_errors
        if self.errors.len() > self.max_errors {
            self.errors.drain(0..self.errors.len() - self.max_errors);
        }
    }

    /// Check if plugin should be auto-disabled due to too many errors
    pub fn should_auto_disable(&self) -> bool {
        if self.errors.len() < 10 {
            return false;
        }
        // If 10+ errors in the last 60 seconds, auto-disable
        let cutoff = Instant::now() - Duration::from_secs(60);
        let recent = self.errors.iter().filter(|e| e.timestamp > cutoff).count();
        recent >= 10
    }

    /// Get error count
    pub fn error_count(&self) -> usize {
        self.errors.len()
    }
}

// ─── Sandbox Violations ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub enum SandboxViolation {
    PermissionDenied {
        plugin_id: String,
        permission: Permission,
    },
    PathTraversal {
        plugin_id: String,
        path: String,
    },
    ResourceLimit {
        plugin_id: String,
        resource: String,
        limit: u64,
        actual: u64,
    },
}

impl std::fmt::Display for SandboxViolation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::PermissionDenied {
                plugin_id,
                permission,
            } => write!(f, "plugin '{plugin_id}' denied permission {permission:?}"),
            Self::PathTraversal { plugin_id, path } => {
                write!(f, "plugin '{plugin_id}' path traversal attempt: {path}")
            }
            Self::ResourceLimit {
                plugin_id,
                resource,
                limit,
                actual,
            } => write!(
                f,
                "plugin '{plugin_id}' exceeded {resource} limit ({actual}/{limit})"
            ),
        }
    }
}

// ─── Resource Tracking ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct PluginErrorRecord {
    #[serde(skip)]
    pub timestamp: Instant,
    pub message: String,
}

/// Tracks resource usage for a plugin
#[derive(Debug)]
pub struct ResourceTracker {
    /// Number of registered commands
    pub command_count: u32,
    /// Number of registered event listeners
    pub event_listener_count: u32,
    /// Number of active intervals/timeouts
    pub timer_count: u32,
    /// Number of DOM elements created
    pub dom_element_count: u32,
    /// Cumulative API calls
    pub api_call_count: u64,
    /// Limits
    pub limits: ResourceLimits,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_commands: u32,
    pub max_event_listeners: u32,
    pub max_timers: u32,
    pub max_dom_elements: u32,
    pub max_api_calls_per_minute: u64,
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            max_commands: 100,
            max_event_listeners: 200,
            max_timers: 50,
            max_dom_elements: 1000,
            max_api_calls_per_minute: 5000,
        }
    }
}

impl ResourceTracker {
    pub fn new() -> Self {
        Self {
            command_count: 0,
            event_listener_count: 0,
            timer_count: 0,
            dom_element_count: 0,
            api_call_count: 0,
            limits: ResourceLimits::default(),
        }
    }

    pub fn with_limits(limits: ResourceLimits) -> Self {
        Self {
            limits,
            ..Self::new()
        }
    }

    pub fn check_command_limit(&self) -> Result<(), SandboxViolation> {
        if self.command_count >= self.limits.max_commands {
            return Err(SandboxViolation::ResourceLimit {
                plugin_id: String::new(), // Caller fills this in
                resource: "commands".into(),
                limit: self.limits.max_commands as u64,
                actual: self.command_count as u64,
            });
        }
        Ok(())
    }

    pub fn check_event_listener_limit(&self) -> Result<(), SandboxViolation> {
        if self.event_listener_count >= self.limits.max_event_listeners {
            return Err(SandboxViolation::ResourceLimit {
                plugin_id: String::new(),
                resource: "event_listeners".into(),
                limit: self.limits.max_event_listeners as u64,
                actual: self.event_listener_count as u64,
            });
        }
        Ok(())
    }

    pub fn check_timer_limit(&self) -> Result<(), SandboxViolation> {
        if self.timer_count >= self.limits.max_timers {
            return Err(SandboxViolation::ResourceLimit {
                plugin_id: String::new(),
                resource: "timers".into(),
                limit: self.limits.max_timers as u64,
                actual: self.timer_count as u64,
            });
        }
        Ok(())
    }
}

// ─── Sandbox Manager ─────────────────────────────────────────────────────────

/// Manages sandboxes for all loaded plugins
pub struct SandboxManager {
    inner: Mutex<SandboxManagerInner>,
}

struct SandboxManagerInner {
    sandboxes: HashMap<String, PluginSandbox>,
    vault_path: PathBuf,
    /// Global violation log
    violations: Vec<SandboxViolation>,
}

impl SandboxManager {
    pub fn new(vault_path: &Path) -> Self {
        Self {
            inner: Mutex::new(SandboxManagerInner {
                sandboxes: HashMap::new(),
                vault_path: vault_path.to_path_buf(),
                violations: Vec::new(),
            }),
        }
    }

    /// Create a sandbox for a plugin with default permissions
    pub fn create_sandbox(&self, plugin_id: &str) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        let sandbox = PluginSandbox::with_defaults(plugin_id, &inner.vault_path);
        inner.sandboxes.insert(plugin_id.to_string(), sandbox);
        Ok(())
    }

    /// Create a sandbox with specific permissions
    pub fn create_sandbox_with_permissions(
        &self,
        plugin_id: &str,
        permissions: HashSet<Permission>,
    ) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|e| e.to_string())?;
        let sandbox = PluginSandbox::new(plugin_id, &inner.vault_path, permissions);
        inner.sandboxes.insert(plugin_id.to_string(), sandbox);
        Ok(())
    }

    /// Remove a plugin's sandbox
    pub fn remove_sandbox(&self, plugin_id: &str) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.sandboxes.remove(plugin_id);
        }
    }

    /// Check if a plugin has a specific permission
    pub fn check_permission(
        &self,
        plugin_id: &str,
        perm: Permission,
    ) -> Result<(), SandboxViolation> {
        let inner = self.inner.lock().unwrap();
        match inner.sandboxes.get(plugin_id) {
            Some(sandbox) => sandbox.check_permission(perm),
            None => Err(SandboxViolation::PermissionDenied {
                plugin_id: plugin_id.to_string(),
                permission: perm,
            }),
        }
    }

    /// Validate a file path for a plugin
    pub fn validate_path(&self, plugin_id: &str, path: &str) -> Result<PathBuf, SandboxViolation> {
        let inner = self.inner.lock().unwrap();
        match inner.sandboxes.get(plugin_id) {
            Some(sandbox) => sandbox.validate_path(path),
            None => Err(SandboxViolation::PermissionDenied {
                plugin_id: plugin_id.to_string(),
                permission: Permission::VaultRead,
            }),
        }
    }

    /// Record an error from a plugin, returns true if plugin should be auto-disabled
    pub fn record_error(&self, plugin_id: &str, error: String) -> bool {
        let mut inner = self.inner.lock().unwrap();
        if let Some(sandbox) = inner.sandboxes.get_mut(plugin_id) {
            sandbox.record_error(error);
            sandbox.should_auto_disable()
        } else {
            false
        }
    }

    /// Record a sandbox violation
    pub fn record_violation(&self, violation: SandboxViolation) {
        if let Ok(mut inner) = self.inner.lock() {
            log::warn!("Sandbox violation: {violation}");
            inner.violations.push(violation);
            // Keep last 1000 violations
            if inner.violations.len() > 1000 {
                let len = inner.violations.len();
                inner.violations.drain(0..len - 1000);
            }
        }
    }

    /// Get recent violations
    pub fn get_violations(&self, limit: usize) -> Vec<SandboxViolation> {
        let inner = self.inner.lock().unwrap();
        inner
            .violations
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Get error count for a plugin
    pub fn get_error_count(&self, plugin_id: &str) -> usize {
        let inner = self.inner.lock().unwrap();
        inner
            .sandboxes
            .get(plugin_id)
            .map(|s| s.error_count())
            .unwrap_or(0)
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn test_vault() -> TempDir {
        let tmp = TempDir::new().unwrap();
        std::fs::create_dir_all(tmp.path().join("notes")).unwrap();
        std::fs::write(tmp.path().join("notes/test.md"), "hello").unwrap();
        tmp
    }

    #[test]
    fn test_default_permissions() {
        let defaults = Permission::defaults();
        assert!(defaults.contains(&Permission::VaultRead));
        assert!(defaults.contains(&Permission::VaultWrite));
        assert!(defaults.contains(&Permission::Commands));
        assert!(!defaults.contains(&Permission::Shell));
        assert!(!defaults.contains(&Permission::Network));
    }

    #[test]
    fn test_permission_check() {
        let vault = test_vault();
        let sandbox = PluginSandbox::with_defaults("test", vault.path());
        assert!(sandbox.check_permission(Permission::VaultRead).is_ok());
        assert!(sandbox.check_permission(Permission::Shell).is_err());
    }

    #[test]
    fn test_path_validation_normal() {
        let vault = test_vault();
        let sandbox = PluginSandbox::with_defaults("test", vault.path());
        assert!(sandbox.validate_path("notes/test.md").is_ok());
    }

    #[test]
    fn test_path_validation_traversal() {
        let vault = test_vault();
        let sandbox = PluginSandbox::with_defaults("test", vault.path());
        assert!(sandbox.validate_path("../../../etc/passwd").is_err());
        assert!(sandbox.validate_path("/etc/passwd").is_err());
    }

    #[test]
    fn test_path_validation_dotdot() {
        let vault = test_vault();
        let sandbox = PluginSandbox::with_defaults("test", vault.path());
        assert!(sandbox.validate_path("notes/../notes/test.md").is_err());
    }

    #[test]
    fn test_grant_revoke() {
        let vault = test_vault();
        let mut sandbox = PluginSandbox::with_defaults("test", vault.path());
        assert!(!sandbox.has_permission(Permission::Network));
        sandbox.grant(Permission::Network);
        assert!(sandbox.has_permission(Permission::Network));
        sandbox.revoke(Permission::Network);
        assert!(!sandbox.has_permission(Permission::Network));
    }

    #[test]
    fn test_error_recording() {
        let vault = test_vault();
        let mut sandbox = PluginSandbox::with_defaults("test", vault.path());
        for i in 0..5 {
            sandbox.record_error(format!("error {i}"));
        }
        assert_eq!(sandbox.error_count(), 5);
        assert!(!sandbox.should_auto_disable());
    }

    #[test]
    fn test_auto_disable_on_many_errors() {
        let vault = test_vault();
        let mut sandbox = PluginSandbox::with_defaults("test", vault.path());
        for i in 0..15 {
            sandbox.record_error(format!("rapid error {i}"));
        }
        assert!(sandbox.should_auto_disable());
    }

    #[test]
    fn test_resource_limits() {
        let tracker = ResourceTracker::new();
        assert!(tracker.check_command_limit().is_ok());

        let mut tracker = ResourceTracker::with_limits(ResourceLimits {
            max_commands: 2,
            ..Default::default()
        });
        tracker.command_count = 2;
        assert!(tracker.check_command_limit().is_err());
    }

    #[test]
    fn test_sandbox_manager() {
        let vault = test_vault();
        let mgr = SandboxManager::new(vault.path());

        mgr.create_sandbox("plugin-a").unwrap();
        assert!(mgr
            .check_permission("plugin-a", Permission::VaultRead)
            .is_ok());
        assert!(mgr
            .check_permission("plugin-a", Permission::Shell)
            .is_err());
        assert!(mgr
            .check_permission("unknown", Permission::VaultRead)
            .is_err());

        mgr.remove_sandbox("plugin-a");
        assert!(mgr
            .check_permission("plugin-a", Permission::VaultRead)
            .is_err());
    }

    #[test]
    fn test_sandbox_manager_violations() {
        let vault = test_vault();
        let mgr = SandboxManager::new(vault.path());

        mgr.record_violation(SandboxViolation::PathTraversal {
            plugin_id: "bad-plugin".into(),
            path: "../etc/passwd".into(),
        });

        let violations = mgr.get_violations(10);
        assert_eq!(violations.len(), 1);
    }

    #[test]
    fn test_dangerous_permissions() {
        assert!(Permission::Shell.is_dangerous());
        assert!(Permission::Network.is_dangerous());
        assert!(!Permission::VaultRead.is_dangerous());
        assert!(!Permission::Commands.is_dangerous());
    }

    #[test]
    fn test_permission_from_str() {
        assert_eq!(Permission::from_str("vault-read"), Some(Permission::VaultRead));
        assert_eq!(Permission::from_str("shell"), Some(Permission::Shell));
        assert_eq!(Permission::from_str("unknown"), None);
    }
}
