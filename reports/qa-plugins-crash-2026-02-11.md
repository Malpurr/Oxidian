# QA Report: Plugin System Crashes — 2026-02-11

**Tester:** QA Tester #2  
**Status:** ✅ ALL FIXED  
**Build:** ✅ Compiles & bundles clean

## Bugs Fixed

### 1. `fetch_community_plugin_list` command not found
**Root cause:** Function existed in `src-tauri/src/plugin/loader.rs` as a plain async fn, but was never exposed as a Tauri command or registered in the invoke handler.  
**Fix:** Added `#[tauri::command] pub async fn fetch_community_plugin_list()` wrapper in `plugin_cmds.rs` that delegates to `loader::fetch_community_plugin_list()`. Registered in `main.rs`.

### 2. `install_community_plugin` command not found
**Root cause:** The JS plugin browser called `invoke('install_community_plugin', { pluginId })` but no such Tauri command existed.  
**Fix:** Added `#[tauri::command] pub async fn install_community_plugin()` in `plugin_cmds.rs`. It fetches the community list, finds the plugin's repo, then calls `loader::download_plugin()`. Registered in `main.rs`. Fixed `Send` issue by cloning vault_path before async boundary.

### 3. Crash on "Install from folder"
**Root cause:** `installPluginFromFolder()` called `invoke('read_file_raw', ...)` which doesn't exist. The correct command is `read_file_absolute`.  
**Fix:** Changed to `invoke('read_file_absolute', { path: manifestPath })`. Added success toast.

### 4. Crash on "Reload plugins"
**Root cause:** `reloadPlugins()` had no try/catch — any error in `pluginLoader.destroy()` or `.init()` would crash.  
**Fix:** Wrapped in try/catch with error toast. Added success toast.

## Files Modified
- `src-tauri/src/commands/plugin_cmds.rs` — Added `fetch_community_plugin_list` and `install_community_plugin` commands
- `src-tauri/src/main.rs` — Registered both new commands in invoke_handler
- `src/js/settings.js` — Fixed `read_file_raw` → `read_file_absolute`, added try/catch to `reloadPlugins()`

## Command Registration Audit
All plugin commands in `plugin_cmds.rs` are now registered in `main.rs`:
- ✅ list_plugins
- ✅ list_obsidian_plugins
- ✅ read_plugin_main
- ✅ read_plugin_styles
- ✅ toggle_plugin
- ✅ toggle_core_plugin
- ✅ get_enabled_plugins
- ✅ get_plugin_data
- ✅ save_plugin_data
- ✅ install_plugin
- ✅ discover_plugins
- ✅ enable_plugin
- ✅ disable_plugin
- ✅ get_plugin_settings
- ✅ save_plugin_settings
- ✅ fetch_community_plugin_list *(NEW)*
- ✅ install_community_plugin *(NEW)*
