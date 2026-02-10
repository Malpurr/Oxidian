use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;
use serde::Serialize;

const MAX_SNAPSHOTS_DEFAULT: usize = 50;

#[derive(Debug, Serialize, Clone)]
pub struct SnapshotInfo {
    pub timestamp: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct FileSnapshotList {
    pub path: String,
    pub snapshots: Vec<SnapshotInfo>,
}

/// Directory where snapshots live: {vault}/.oxidian/snapshots/
fn snapshots_base(vault_path: &str) -> PathBuf {
    Path::new(vault_path).join(".oxidian").join("snapshots")
}

/// Directory for a specific file's snapshots
fn snapshot_dir(vault_path: &str, relative_path: &str) -> PathBuf {
    snapshots_base(vault_path).join(relative_path)
}

/// Create a snapshot of the current file content before overwriting.
/// Call this BEFORE writing the new content.
pub fn create_snapshot(vault_path: &str, relative_path: &str) -> Result<(), String> {
    let full_path = Path::new(vault_path).join(relative_path);
    if !full_path.exists() {
        return Ok(()); // No previous version to snapshot
    }

    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file for snapshot: {}", e))?;

    let dir = snapshot_dir(vault_path, relative_path);
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create snapshot dir: {}", e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S%.3f").to_string();
    let snapshot_file = dir.join(format!("{}.md", timestamp));

    fs::write(&snapshot_file, &content)
        .map_err(|e| format!("Failed to write snapshot: {}", e))?;

    // Prune old snapshots
    prune_snapshots(&dir, MAX_SNAPSHOTS_DEFAULT)?;

    Ok(())
}

/// List all snapshot timestamps for a given file
pub fn list_snapshots(vault_path: &str, relative_path: &str) -> Result<Vec<SnapshotInfo>, String> {
    let dir = snapshot_dir(vault_path, relative_path);
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut snapshots: Vec<SnapshotInfo> = Vec::new();
    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read snapshot dir: {}", e))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Some(stem) = path.file_stem() {
                let timestamp = stem.to_string_lossy().to_string();
                let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                snapshots.push(SnapshotInfo {
                    timestamp,
                    size_bytes: size,
                });
            }
        }
    }

    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp)); // newest first
    Ok(snapshots)
}

/// Get content of a specific snapshot
pub fn get_snapshot_content(vault_path: &str, relative_path: &str, timestamp: &str) -> Result<String, String> {
    // Validate timestamp to prevent path traversal
    if timestamp.contains("..") || timestamp.contains('/') || timestamp.contains('\\') {
        return Err("Invalid timestamp".to_string());
    }

    let dir = snapshot_dir(vault_path, relative_path);
    let snapshot_file = dir.join(format!("{}.md", timestamp));

    if !snapshot_file.exists() {
        return Err(format!("Snapshot not found: {}", timestamp));
    }

    fs::read_to_string(&snapshot_file)
        .map_err(|e| format!("Failed to read snapshot: {}", e))
}

/// Restore a snapshot — copies snapshot content back to the original file
pub fn restore_snapshot(vault_path: &str, relative_path: &str, timestamp: &str) -> Result<(), String> {
    let content = get_snapshot_content(vault_path, relative_path, timestamp)?;

    // Create a snapshot of the CURRENT version before restoring (so restore is reversible)
    create_snapshot(vault_path, relative_path)?;

    let full_path = Path::new(vault_path).join(relative_path);
    fs::write(&full_path, &content)
        .map_err(|e| format!("Failed to restore snapshot: {}", e))
}

/// List all files that have snapshots
pub fn list_all_snapshot_files(vault_path: &str) -> Result<Vec<String>, String> {
    let base = snapshots_base(vault_path);
    if !base.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();
    collect_snapshot_files(&base, &base, &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_snapshot_files(base: &Path, current: &Path, files: &mut Vec<String>) -> Result<(), String> {
    let entries = fs::read_dir(current)
        .map_err(|e| format!("Failed to read dir: {}", e))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_dir() {
            collect_snapshot_files(base, &path, files)?;
        } else if path.extension().map(|e| e == "md").unwrap_or(false) {
            // This directory's relative path from base = the file's relative path
            if let Some(parent) = path.parent() {
                let rel = parent.strip_prefix(base)
                    .unwrap_or(parent)
                    .to_string_lossy()
                    .to_string();
                if !rel.is_empty() && !files.contains(&rel) {
                    files.push(rel);
                }
            }
        }
    }
    Ok(())
}

/// Remove oldest snapshots if count exceeds max
fn prune_snapshots(dir: &Path, max: usize) -> Result<(), String> {
    let mut entries: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read snapshot dir for pruning: {}", e))?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "md").unwrap_or(false))
        .collect();

    if entries.len() <= max {
        return Ok(());
    }

    // Sort by name (timestamps) — oldest first
    entries.sort();

    let to_remove = entries.len() - max;
    for path in entries.into_iter().take(to_remove) {
        fs::remove_file(&path).ok();
    }

    Ok(())
}
