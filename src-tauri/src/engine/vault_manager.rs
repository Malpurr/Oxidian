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
    let home = dirs::home_dir().expect("Could not find home directory");
    home.join(".oxidian").join("vaults.json")
}

pub fn list_vaults() -> Vec<VaultInfo> {
    let path = vaults_file();
    if !path.exists() {
        return Vec::new();
    }
    match fs::read_to_string(&path) {
        Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

pub fn save_vaults(vaults: &[VaultInfo]) -> Result<(), String> {
    let path = vaults_file();
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
