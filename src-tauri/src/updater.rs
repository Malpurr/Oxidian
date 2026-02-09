use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

const GITHUB_API_URL: &str = "https://api.github.com/repos/Malpurr/Oxidian/releases/latest";
const CURRENT_VERSION: &str = "1.1.2";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub download_url: String,
    pub changelog: String,
    pub published_at: String,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    browser_download_url: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GitHubAsset>,
}

/// Parse a semver string like "v1.2.3" or "1.2.3" into (major, minor, patch)
fn parse_semver(version: &str) -> Option<(u64, u64, u64)> {
    let v = version.trim_start_matches('v');
    let parts: Vec<&str> = v.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    Some((
        parts[0].parse().ok()?,
        parts[1].parse().ok()?,
        parts[2].parse().ok()?,
    ))
}

/// Returns true if `latest` is newer than `current`
fn is_newer(current: &str, latest: &str) -> bool {
    match (parse_semver(current), parse_semver(latest)) {
        (Some(c), Some(l)) => l > c,
        _ => false,
    }
}

/// Determine the appropriate asset name for the current platform
fn platform_asset_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "oxidian-windows"
    } else if cfg!(target_os = "macos") {
        "oxidian-macos"
    } else {
        "oxidian-linux"
    }
}

/// Check GitHub releases for a newer version
pub async fn check_for_updates(current_version: &str) -> Result<Option<UpdateInfo>, String> {
    let client = reqwest::Client::builder()
        .user_agent("Oxidian-Updater/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(GITHUB_API_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release info: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub API returned status: {}",
            response.status()
        ));
    }

    let release: GitHubRelease = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse release JSON: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();

    if !is_newer(current_version, &latest_version) {
        return Ok(None);
    }

    // Find matching asset for this platform
    let asset_prefix = platform_asset_name();
    let download_url = release
        .assets
        .iter()
        .find(|a| a.name.to_lowercase().contains(asset_prefix))
        .map(|a| a.browser_download_url.clone())
        .unwrap_or_default();

    Ok(Some(UpdateInfo {
        version: latest_version,
        download_url,
        changelog: release.body.unwrap_or_default(),
        published_at: release.published_at.unwrap_or_default(),
    }))
}

/// Download update binary to destination path
pub async fn download_update(url: &str, dest: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("No download URL available for this platform".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("Oxidian-Updater/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download update: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read download bytes: {}", e))?;

    // Ensure parent directory exists
    if let Some(parent) = Path::new(dest).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(dest, &bytes).map_err(|e| format!("Failed to write update file: {}", e))?;

    // Set executable permission on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(dest, fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    Ok(())
}

/// Replace current binary with the downloaded update and restart
pub fn apply_update(binary_path: &str) -> Result<(), String> {
    let current_exe =
        std::env::current_exe().map_err(|e| format!("Failed to get current exe path: {}", e))?;

    let backup_path = current_exe.with_extension("bak");

    // Backup current binary
    fs::rename(&current_exe, &backup_path)
        .map_err(|e| format!("Failed to backup current binary: {}", e))?;

    // Move new binary into place
    fs::rename(binary_path, &current_exe).map_err(|e| {
        // Restore backup on failure
        let _ = fs::rename(&backup_path, &current_exe);
        format!("Failed to replace binary: {}", e)
    })?;

    // Restart: spawn the new binary and exit
    std::process::Command::new(&current_exe)
        .spawn()
        .map_err(|e| format!("Failed to restart: {}", e))?;

    std::process::exit(0);
}

/// Get current application version
pub fn get_current_version() -> String {
    CURRENT_VERSION.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_semver() {
        assert_eq!(parse_semver("1.0.1"), Some((1, 0, 1)));
        assert_eq!(parse_semver("v2.3.4"), Some((2, 3, 4)));
        assert_eq!(parse_semver("invalid"), None);
    }

    #[test]
    fn test_is_newer() {
        assert!(is_newer("1.0.0", "1.0.1"));
        assert!(is_newer("1.0.1", "1.1.0"));
        assert!(is_newer("1.0.1", "2.0.0"));
        assert!(!is_newer("1.0.1", "1.0.1"));
        assert!(!is_newer("1.0.1", "1.0.0"));
    }
}
