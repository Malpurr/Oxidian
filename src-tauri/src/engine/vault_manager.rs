use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultInfo {
    pub name: String,
    pub path: String,
    pub last_opened: Option<String>,
}

fn vaults_file() -> PathBuf {
    match dirs::home_dir() {
        Some(home) => home.join(".oxidian").join("vaults.json"),
        None => {
            // Fallback for Android — will be overridden at runtime via OXIDIAN_BASE_DIR
            PathBuf::from("/data/local/tmp/.oxidian/vaults.json")
        }
    }
}

/// Set a custom base directory for vault manager storage (called on mobile).
static VAULTS_BASE: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

pub fn set_vaults_base(base: PathBuf) {
    let _ = VAULTS_BASE.set(base);
}

fn vaults_file_resolved() -> PathBuf {
    if let Some(base) = VAULTS_BASE.get() {
        base.join("vaults.json")
    } else {
        vaults_file()
    }
}

pub fn list_vaults() -> Vec<VaultInfo> {
    let path = vaults_file_resolved();
    if !path.exists() {
        return Vec::new();
    }
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

pub fn save_vaults(vaults: &[VaultInfo]) -> Result<(), String> {
    let path = vaults_file_resolved();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(vaults).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&path, data).map_err(|e| format!("Write error: {}", e))
}

pub fn add_vault(name: &str, path: &str) -> Result<(), String> {
    let mut vaults = list_vaults();
    // Don't add duplicates
    if vaults.iter().any(|v| v.path == path) {
        return Ok(());
    }
    vaults.push(VaultInfo {
        name: name.to_string(),
        path: path.to_string(),
        last_opened: None,
    });
    save_vaults(&vaults)
}

pub fn remove_vault(name: &str) -> Result<(), String> {
    let mut vaults = list_vaults();
    vaults.retain(|v| v.name != name);
    save_vaults(&vaults)
}

pub fn touch_vault(path: &str) -> Result<(), String> {
    let mut vaults = list_vaults();
    if let Some(v) = vaults.iter_mut().find(|v| v.path == path) {
        v.last_opened = Some(chrono::Local::now().to_rfc3339());
    }
    save_vaults(&vaults)
}
