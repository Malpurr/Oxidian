//! Plugin Loader
//!
//! Discovers plugins on disk, downloads from community registry,
//! handles version checking, dependency resolution, and hot-reload.

use super::{PluginEntry, PluginError, PluginManifest};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::path::{Path, PathBuf};

// ─── Plugin Discovery ────────────────────────────────────────────────────────

/// Detailed info about a discovered plugin on disk
#[derive(Debug, Clone, Serialize)]
pub struct DiscoveredPlugin {
    pub manifest: PluginManifest,
    pub dir: PathBuf,
    pub has_main_js: bool,
    pub has_styles_css: bool,
    pub has_data_json: bool,
    pub size_bytes: u64,
}

/// Discover all plugins in a vault's .obsidian/plugins/ directory
pub fn discover_plugins_on_disk(vault_path: &Path) -> Result<Vec<DiscoveredPlugin>, PluginError> {
    let plugins_dir = vault_path.join(".obsidian").join("plugins");
    if !plugins_dir.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&plugins_dir)
        .map_err(|e| PluginError::Io(format!("reading plugins dir: {e}")))?;

    let mut discovered = Vec::new();

    for entry in entries.filter_map(|e: Result<std::fs::DirEntry, std::io::Error>| e.ok()) {
        let dir = entry.path();
        if !dir.is_dir() {
            continue;
        }

        let manifest_path = dir.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }

        match PluginManifest::from_file(&manifest_path) {
            Ok(manifest) => {
                if manifest.validate().is_err() {
                    continue;
                }

                let has_main_js = dir.join("main.js").exists();
                let has_styles_css = dir.join("styles.css").exists();
                let has_data_json = dir.join("data.json").exists();

                // Calculate total size
                let size_bytes = calc_dir_size(&dir);

                discovered.push(DiscoveredPlugin {
                    manifest,
                    dir,
                    has_main_js,
                    has_styles_css,
                    has_data_json,
                    size_bytes,
                });
            }
            Err(e) => {
                log::warn!("Skipping plugin at {}: {e}", dir.display());
            }
        }
    }

    Ok(discovered)
}

/// Read a plugin's main.js content
pub fn read_plugin_main(vault_path: &Path, plugin_id: &str) -> Result<String, PluginError> {
    let path = vault_path
        .join(".obsidian")
        .join("plugins")
        .join(plugin_id)
        .join("main.js");
    std::fs::read_to_string(&path)
        .map_err(|e| PluginError::Io(format!("reading main.js for {plugin_id}: {e}")))
}

/// Read a plugin's styles.css content (returns empty string if not found)
pub fn read_plugin_styles(vault_path: &Path, plugin_id: &str) -> Result<String, PluginError> {
    let path = vault_path
        .join(".obsidian")
        .join("plugins")
        .join(plugin_id)
        .join("styles.css");
    if !path.exists() {
        return Ok(String::new());
    }
    std::fs::read_to_string(&path)
        .map_err(|e| PluginError::Io(format!("reading styles.css for {plugin_id}: {e}")))
}

// ─── Version Checking ────────────────────────────────────────────────────────

/// Simple semver comparison (major.minor.patch)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SemVer {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

impl SemVer {
    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.trim().split('.').collect();
        if parts.len() < 2 {
            return None;
        }
        Some(Self {
            major: parts[0].parse().ok()?,
            minor: parts[1].parse().ok()?,
            patch: parts.get(2).and_then(|p| p.parse().ok()).unwrap_or(0),
        })
    }

    pub fn satisfies(&self, requirement: &str) -> bool {
        let req = requirement.trim();
        if req.starts_with(">=") {
            if let Some(v) = SemVer::parse(&req[2..]) {
                return self >= &v;
            }
        } else if req.starts_with('>') {
            if let Some(v) = SemVer::parse(&req[1..]) {
                return self > &v;
            }
        } else if req.starts_with("<=") {
            if let Some(v) = SemVer::parse(&req[2..]) {
                return self <= &v;
            }
        } else if req.starts_with('<') {
            if let Some(v) = SemVer::parse(&req[1..]) {
                return self < &v;
            }
        } else if req.starts_with('^') {
            // ^1.2.3 means >=1.2.3 <2.0.0
            if let Some(v) = SemVer::parse(&req[1..]) {
                return self >= &v
                    && self.major == v.major
                    && (self.major > 0 || self.minor == v.minor);
            }
        } else if req.starts_with('~') {
            // ~1.2.3 means >=1.2.3 <1.3.0
            if let Some(v) = SemVer::parse(&req[1..]) {
                return self >= &v && self.major == v.major && self.minor == v.minor;
            }
        } else if let Some(v) = SemVer::parse(req) {
            return self == &v;
        }
        // If we can't parse, accept
        true
    }
}

impl PartialOrd for SemVer {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for SemVer {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.major
            .cmp(&other.major)
            .then(self.minor.cmp(&other.minor))
            .then(self.patch.cmp(&other.patch))
    }
}

/// Check if a plugin version is compatible with a requirement
pub fn check_version(version: &str, requirement: &str) -> bool {
    match SemVer::parse(version) {
        Some(v) => v.satisfies(requirement),
        None => true, // Can't parse → accept
    }
}

// ─── Dependency Resolution ───────────────────────────────────────────────────

/// Result of dependency resolution
#[derive(Debug, Clone)]
pub struct LoadOrder {
    /// Plugins in the order they should be loaded
    pub order: Vec<String>,
    /// Missing dependencies: (plugin_id, missing_dep_id)
    pub missing: Vec<(String, String)>,
    /// Circular dependency chains detected
    pub circular: Vec<Vec<String>>,
}

/// Resolve plugin load order via topological sort
pub fn resolve_load_order(plugins: &[PluginEntry]) -> LoadOrder {
    let available: HashMap<&str, &PluginEntry> =
        plugins.iter().map(|p| (p.manifest.id.as_str(), p)).collect();

    // Build adjacency list (plugin -> dependencies)
    let mut deps: HashMap<&str, Vec<&str>> = HashMap::new();
    let mut missing = Vec::new();

    for plugin in plugins {
        let mut plugin_deps = Vec::new();
        for dep_id in plugin.manifest.dependencies.keys() {
            if available.contains_key(dep_id.as_str()) {
                plugin_deps.push(dep_id.as_str());
            } else {
                missing.push((plugin.manifest.id.clone(), dep_id.clone()));
            }
        }
        deps.insert(plugin.manifest.id.as_str(), plugin_deps);
    }

    // Kahn's algorithm for topological sort
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    for id in available.keys() {
        in_degree.insert(id, 0);
    }
    // Edge: dependency -> dependent. So dependent's in-degree increases per dependency.
    for (plugin_id, d) in &deps {
        *in_degree.entry(plugin_id).or_insert(0) += d.len();
    }

    let mut queue: VecDeque<&str> = VecDeque::new();
    for (id, &degree) in &in_degree {
        if degree == 0 {
            queue.push_back(id);
        }
    }

    let mut order = Vec::new();
    let mut visited = HashSet::new();

    // Build reverse map: dependency -> dependents (who depends on me)
    let mut reverse: HashMap<&str, Vec<&str>> = HashMap::new();
    for (plugin_id, d) in &deps {
        for dep in d {
            reverse.entry(*dep).or_default().push(plugin_id);
        }
    }

    while let Some(id) = queue.pop_front() {
        order.push(id.to_string());
        visited.insert(id);
        // Nodes that depend on `id` get their in-degree reduced
        if let Some(dependents) = reverse.get(id) {
            for dependent in dependents {
                if let Some(deg) = in_degree.get_mut(dependent) {
                    *deg = deg.saturating_sub(1);
                    if *deg == 0 && !visited.contains(dependent) {
                        queue.push_back(dependent);
                    }
                }
            }
        }
    }

    // Detect circular dependencies (nodes not in result)
    let circular: Vec<Vec<String>> = if order.len() < available.len() {
        let remaining: Vec<String> = available
            .keys()
            .filter(|id| !visited.contains(**id))
            .map(|id| id.to_string())
            .collect();
        if remaining.is_empty() {
            vec![]
        } else {
            vec![remaining]
        }
    } else {
        vec![]
    };

    LoadOrder {
        order,
        missing,
        circular,
    }
}

// ─── Community Registry Download ─────────────────────────────────────────────

/// Community plugin registry entry (Obsidian-compatible format)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommunityPlugin {
    pub id: String,
    pub name: String,
    pub author: String,
    pub description: String,
    pub repo: String,
}

/// Fetch the community plugin list from Obsidian's registry
pub async fn fetch_community_plugin_list() -> Result<Vec<CommunityPlugin>, PluginError> {
    let url = "https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json";
    let response = reqwest::get(url)
        .await
        .map_err(|e| PluginError::Registry(format!("fetching community list: {e}")))?;
    let plugins: Vec<CommunityPlugin> = response
        .json::<Vec<CommunityPlugin>>()
        .await
        .map_err(|e| PluginError::Registry(format!("parsing community list: {e}")))?;
    Ok(plugins)
}

/// Download and install a plugin from its GitHub repo
pub async fn download_plugin(
    vault_path: &Path,
    repo: &str,
    version: Option<&str>,
) -> Result<PluginManifest, PluginError> {
    let version_tag = version.unwrap_or("latest");

    // Determine release URL
    let release_url = if version_tag == "latest" {
        format!("https://api.github.com/repos/{repo}/releases/latest")
    } else {
        format!("https://api.github.com/repos/{repo}/releases/tags/{version_tag}")
    };

    let client = reqwest::Client::new();
    let release: serde_json::Value = client
        .get(&release_url)
        .header("User-Agent", "Oxidian")
        .send()
        .await
        .map_err(|e| PluginError::Registry(format!("fetching release: {e}")))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| PluginError::Registry(format!("parsing release: {e}")))?;

    let assets = release["assets"]
        .as_array()
        .ok_or_else(|| PluginError::Registry("no assets in release".into()))?;

    // Download manifest.json, main.js, and optionally styles.css
    let mut manifest_data = None;
    let mut main_js_data = None;
    let mut styles_css_data = None;

    for asset in assets {
        let name = asset["name"].as_str().unwrap_or("");
        let download_url = asset["browser_download_url"]
            .as_str()
            .ok_or_else(|| PluginError::Registry("missing download URL".into()))?;

        let data = client
            .get(download_url)
            .header("User-Agent", "Oxidian")
            .send()
            .await
            .map_err(|e| PluginError::Registry(format!("downloading {name}: {e}")))?
            .bytes()
            .await
            .map_err(|e| PluginError::Registry(format!("reading {name}: {e}")))?;

        match name {
            "manifest.json" => manifest_data = Some(data),
            "main.js" => main_js_data = Some(data),
            "styles.css" => styles_css_data = Some(data),
            _ => {}
        }
    }

    let manifest_bytes =
        manifest_data.ok_or_else(|| PluginError::Registry("manifest.json not in release".into()))?;
    let main_bytes =
        main_js_data.ok_or_else(|| PluginError::Registry("main.js not in release".into()))?;

    let manifest = PluginManifest::from_json(&manifest_bytes)?;
    manifest.validate()?;

    // Install to vault
    let plugin_dir = vault_path
        .join(".obsidian")
        .join("plugins")
        .join(&manifest.id);
    std::fs::create_dir_all(&plugin_dir)
        .map_err(|e| PluginError::Io(format!("creating plugin dir: {e}")))?;

    std::fs::write(plugin_dir.join("manifest.json"), &manifest_bytes)
        .map_err(|e| PluginError::Io(format!("writing manifest.json: {e}")))?;
    std::fs::write(plugin_dir.join("main.js"), &main_bytes)
        .map_err(|e| PluginError::Io(format!("writing main.js: {e}")))?;

    if let Some(styles) = styles_css_data {
        std::fs::write(plugin_dir.join("styles.css"), &styles)
            .map_err(|e| PluginError::Io(format!("writing styles.css: {e}")))?;
    }

    Ok(manifest)
}

/// Remove a plugin from disk
pub fn uninstall_plugin(vault_path: &Path, plugin_id: &str) -> Result<(), PluginError> {
    let plugin_dir = vault_path
        .join(".obsidian")
        .join("plugins")
        .join(plugin_id);
    if !plugin_dir.exists() {
        return Err(PluginError::NotFound(plugin_id.into()));
    }
    std::fs::remove_dir_all(&plugin_dir)
        .map_err(|e| PluginError::Io(format!("removing plugin dir: {e}")))?;
    Ok(())
}

// ─── Hot Reload ──────────────────────────────────────────────────────────────

/// Tracks file changes for hot-reload
pub struct HotReloadWatcher {
    /// Plugin dirs being watched, keyed by plugin_id
    watched: HashMap<String, WatchedPlugin>,
}

#[derive(Debug)]
struct WatchedPlugin {
    dir: PathBuf,
    last_main_js_hash: u64,
    last_styles_hash: u64,
    last_manifest_hash: u64,
}

impl HotReloadWatcher {
    pub fn new() -> Self {
        Self {
            watched: HashMap::new(),
        }
    }

    /// Start watching a plugin directory for changes
    pub fn watch(&mut self, plugin_id: &str, dir: &Path) {
        let main_hash = hash_file_quick(&dir.join("main.js"));
        let styles_hash = hash_file_quick(&dir.join("styles.css"));
        let manifest_hash = hash_file_quick(&dir.join("manifest.json"));

        self.watched.insert(
            plugin_id.to_string(),
            WatchedPlugin {
                dir: dir.to_path_buf(),
                last_main_js_hash: main_hash,
                last_styles_hash: styles_hash,
                last_manifest_hash: manifest_hash,
            },
        );
    }

    /// Stop watching a plugin
    pub fn unwatch(&mut self, plugin_id: &str) {
        self.watched.remove(plugin_id);
    }

    /// Check all watched plugins for changes. Returns list of plugin ids that changed.
    pub fn check_changes(&mut self) -> Vec<HotReloadChange> {
        let mut changes = Vec::new();

        for (id, watched) in &mut self.watched {
            let new_main = hash_file_quick(&watched.dir.join("main.js"));
            let new_styles = hash_file_quick(&watched.dir.join("styles.css"));
            let new_manifest = hash_file_quick(&watched.dir.join("manifest.json"));

            let mut changed = false;
            let mut what = Vec::new();

            if new_main != watched.last_main_js_hash {
                watched.last_main_js_hash = new_main;
                changed = true;
                what.push("main.js");
            }
            if new_styles != watched.last_styles_hash {
                watched.last_styles_hash = new_styles;
                changed = true;
                what.push("styles.css");
            }
            if new_manifest != watched.last_manifest_hash {
                watched.last_manifest_hash = new_manifest;
                changed = true;
                what.push("manifest.json");
            }

            if changed {
                changes.push(HotReloadChange {
                    plugin_id: id.clone(),
                    changed_files: what.into_iter().map(String::from).collect(),
                });
            }
        }

        changes
    }
}

/// A detected hot-reload change
#[derive(Debug, Clone, Serialize)]
pub struct HotReloadChange {
    pub plugin_id: String,
    pub changed_files: Vec<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn calc_dir_size(dir: &Path) -> u64 {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

/// Quick hash of a file's contents for change detection (not cryptographic)
fn hash_file_quick(path: &Path) -> u64 {
    use std::hash::{Hash, Hasher};
    match std::fs::read(path) {
        Ok(data) => {
            let mut hasher = std::collections::hash_map::DefaultHasher::new();
            data.hash(&mut hasher);
            hasher.finish()
        }
        Err(_) => 0,
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin::PluginState;
    use std::fs;
    use tempfile::TempDir;

    fn setup_vault() -> TempDir {
        let tmp = TempDir::new().unwrap();
        let dir = tmp
            .path()
            .join(".obsidian")
            .join("plugins")
            .join("test-plugin");
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("manifest.json"),
            r#"{"id":"test-plugin","name":"Test","version":"1.0.0"}"#,
        )
        .unwrap();
        fs::write(dir.join("main.js"), "console.log('hello');").unwrap();
        fs::write(dir.join("styles.css"), ".test { color: red; }").unwrap();
        tmp
    }

    #[test]
    fn test_discover_plugins_on_disk() {
        let vault = setup_vault();
        let discovered = discover_plugins_on_disk(vault.path()).unwrap();
        assert_eq!(discovered.len(), 1);
        assert_eq!(discovered[0].manifest.id, "test-plugin");
        assert!(discovered[0].has_main_js);
        assert!(discovered[0].has_styles_css);
        assert!(!discovered[0].has_data_json);
        assert!(discovered[0].size_bytes > 0);
    }

    #[test]
    fn test_read_plugin_main() {
        let vault = setup_vault();
        let content = read_plugin_main(vault.path(), "test-plugin").unwrap();
        assert_eq!(content, "console.log('hello');");
    }

    #[test]
    fn test_read_plugin_styles() {
        let vault = setup_vault();
        let content = read_plugin_styles(vault.path(), "test-plugin").unwrap();
        assert_eq!(content, ".test { color: red; }");
    }

    #[test]
    fn test_read_plugin_styles_missing() {
        let vault = setup_vault();
        // Remove styles.css
        fs::remove_file(
            vault
                .path()
                .join(".obsidian/plugins/test-plugin/styles.css"),
        )
        .unwrap();
        let content = read_plugin_styles(vault.path(), "test-plugin").unwrap();
        assert!(content.is_empty());
    }

    #[test]
    fn test_semver_parse() {
        let v = SemVer::parse("1.2.3").unwrap();
        assert_eq!(v, SemVer { major: 1, minor: 2, patch: 3 });

        let v = SemVer::parse("0.15").unwrap();
        assert_eq!(v, SemVer { major: 0, minor: 15, patch: 0 });

        assert!(SemVer::parse("").is_none());
        assert!(SemVer::parse("abc").is_none());
    }

    #[test]
    fn test_semver_satisfies() {
        let v = SemVer::parse("1.5.0").unwrap();
        assert!(v.satisfies(">=1.0.0"));
        assert!(v.satisfies(">=1.5.0"));
        assert!(!v.satisfies(">=2.0.0"));
        assert!(v.satisfies("<2.0.0"));
        assert!(!v.satisfies("<1.0.0"));
        assert!(v.satisfies("^1.0.0"));
        assert!(!v.satisfies("^2.0.0"));
        assert!(v.satisfies("~1.5.0"));
        assert!(!v.satisfies("~1.4.0"));
        assert!(v.satisfies("1.5.0"));
        assert!(!v.satisfies("1.4.0"));
    }

    #[test]
    fn test_check_version() {
        assert!(check_version("1.5.0", ">=1.0.0"));
        assert!(!check_version("0.9.0", ">=1.0.0"));
    }

    #[test]
    fn test_resolve_load_order_no_deps() {
        let plugins = vec![
            PluginEntry {
                manifest: PluginManifest {
                    id: "a".into(),
                    name: "A".into(),
                    version: "1.0.0".into(),
                    description: String::new(),
                    author: String::new(),
                    author_url: None,
                    min_app_version: String::new(),
                    is_desktop_only: false,
                    permissions: vec![],
                    dependencies: HashMap::new(),
                },
                state: PluginState::Enabled,
                dir: PathBuf::new(),
                error: None,
            },
            PluginEntry {
                manifest: PluginManifest {
                    id: "b".into(),
                    name: "B".into(),
                    version: "1.0.0".into(),
                    description: String::new(),
                    author: String::new(),
                    author_url: None,
                    min_app_version: String::new(),
                    is_desktop_only: false,
                    permissions: vec![],
                    dependencies: HashMap::new(),
                },
                state: PluginState::Enabled,
                dir: PathBuf::new(),
                error: None,
            },
        ];

        let result = resolve_load_order(&plugins);
        assert_eq!(result.order.len(), 2);
        assert!(result.missing.is_empty());
        assert!(result.circular.is_empty());
    }

    #[test]
    fn test_resolve_load_order_with_deps() {
        let mut deps = HashMap::new();
        deps.insert("a".to_string(), ">=1.0.0".to_string());

        let plugins = vec![
            PluginEntry {
                manifest: PluginManifest {
                    id: "a".into(),
                    name: "A".into(),
                    version: "1.0.0".into(),
                    description: String::new(),
                    author: String::new(),
                    author_url: None,
                    min_app_version: String::new(),
                    is_desktop_only: false,
                    permissions: vec![],
                    dependencies: HashMap::new(),
                },
                state: PluginState::Enabled,
                dir: PathBuf::new(),
                error: None,
            },
            PluginEntry {
                manifest: PluginManifest {
                    id: "b".into(),
                    name: "B".into(),
                    version: "1.0.0".into(),
                    description: String::new(),
                    author: String::new(),
                    author_url: None,
                    min_app_version: String::new(),
                    is_desktop_only: false,
                    permissions: vec![],
                    dependencies: deps,
                },
                state: PluginState::Enabled,
                dir: PathBuf::new(),
                error: None,
            },
        ];

        let result = resolve_load_order(&plugins);
        assert_eq!(result.order.len(), 2);
        // a should come before b (b depends on a)
        let a_idx = result.order.iter().position(|x| x == "a").unwrap();
        let b_idx = result.order.iter().position(|x| x == "b").unwrap();
        assert!(a_idx < b_idx);
    }

    #[test]
    fn test_resolve_missing_dependency() {
        let mut deps = HashMap::new();
        deps.insert("nonexistent".to_string(), ">=1.0.0".to_string());

        let plugins = vec![PluginEntry {
            manifest: PluginManifest {
                id: "a".into(),
                name: "A".into(),
                version: "1.0.0".into(),
                description: String::new(),
                author: String::new(),
                author_url: None,
                min_app_version: String::new(),
                is_desktop_only: false,
                permissions: vec![],
                dependencies: deps,
            },
            state: PluginState::Enabled,
            dir: PathBuf::new(),
            error: None,
        }];

        let result = resolve_load_order(&plugins);
        assert_eq!(result.missing.len(), 1);
        assert_eq!(result.missing[0].1, "nonexistent");
    }

    #[test]
    fn test_hot_reload_watcher() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path().join("test-plugin");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("main.js"), "v1").unwrap();
        fs::write(dir.join("manifest.json"), "{}").unwrap();

        let mut watcher = HotReloadWatcher::new();
        watcher.watch("test-plugin", &dir);

        // No changes initially
        let changes = watcher.check_changes();
        assert!(changes.is_empty());

        // Modify main.js
        fs::write(dir.join("main.js"), "v2").unwrap();
        let changes = watcher.check_changes();
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].plugin_id, "test-plugin");
        assert!(changes[0].changed_files.contains(&"main.js".to_string()));

        // No changes after re-check
        let changes = watcher.check_changes();
        assert!(changes.is_empty());
    }

    #[test]
    fn test_uninstall_plugin() {
        let vault = setup_vault();
        assert!(vault
            .path()
            .join(".obsidian/plugins/test-plugin")
            .exists());
        uninstall_plugin(vault.path(), "test-plugin").unwrap();
        assert!(!vault
            .path()
            .join(".obsidian/plugins/test-plugin")
            .exists());
    }

    #[test]
    fn test_uninstall_nonexistent() {
        let vault = setup_vault();
        let result = uninstall_plugin(vault.path(), "nonexistent");
        assert!(matches!(result, Err(PluginError::NotFound(_))));
    }
}
