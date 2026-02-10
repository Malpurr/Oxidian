# QA Report: Settings Persistence — 2026-02-11

## Critical Bug Fixed

### BUG: `save_settings` parameter name mismatch (CRITICAL)
- **File:** `src-tauri/src/commands/core_cmds.rs` line 207
- **Issue:** Rust command expected parameter `new_settings` but JS sends `{ settings: ... }`. Tauri matches JSON keys to parameter names, so this caused **every save to fail** with a deserialization error.
- **Fix:** Renamed Rust parameter from `new_settings` to `settings`.
- **Impact:** Without this fix, NO settings changes persisted to disk. Users would lose all changes on restart.

## Architecture Analysis

### Save Flow (verified working after fix)
1. UI change → debounced (500ms) `saveAll()` called
2. `saveAll()` → `updateSettingsFromForm()` reads DOM values into `this.settings`
3. `invoke('save_settings', { settings: this.settings })` → Tauri command
4. Rust `save_settings()` → `serde_json::to_string_pretty()` → writes to `{vault}/.oxidian/settings.json`

### Load Flow (verified working)
1. `invoke('load_settings')` → Rust reads `{vault}/.oxidian/settings.json`
2. `serde_json::from_str::<Settings>()` with `#[serde(default)]` on all fields
3. Returns full `Settings` struct to JS

### Auto-save: ✅ Working
- Every `input` and `change` event triggers debounced `saveAll()` (500ms delay)
- Theme selector clicks call `saveAll()` directly
- Color presets call `saveAll()` directly

## Section-by-Section Verification

| Section | JS→Rust mapping | Round-trip | Notes |
|---------|----------------|------------|-------|
| **General** | ✅ All 5 fields mapped | ✅ | `vault_path` set via browse button separately |
| **Editor** | ✅ All 16 fields mapped | ✅ | `tab_size` parsed via `parseFloat` → works with u32 |
| **Files & Links** | ✅ All 9 fields mapped | ✅ | `use_wikilinks` inverted to `use_markdown_links` |
| **Appearance** | ✅ 7 fields mapped | ⚠️ | `show_inline_title`, `show_tab_title_bar` NOT in form but preserved from loaded object |
| **Hotkeys** | ✅ Separate save path | ✅ | Uses `save_hotkeys`/`load_hotkeys` commands |
| **Core Plugins** | ✅ 16 plugins mapped | ✅ | Uses `toggle_core_plugin` + auto-save |
| **Community Plugins** | ✅ 2 fields mapped | ✅ | `safe_mode` inverted from "enable plugins" checkbox |
| **About** | ✅ Read-only | N/A | No user-editable fields |

## Minor Observations (No Fix Needed)

1. **Dual settings files:** `src-tauri/src/settings.rs` (old/unused) and `src-tauri/src/engine/settings.rs` (active). The old file is dead code — commands import from `engine::settings`.
2. **Extra Rust-only fields** (`vault`, `files`, `plugins`, `remember`, `update`): Not exposed in settings UI but preserved during save because `this.settings` retains them from initial load.
3. **Duplicate command:** Both `get_settings` and `load_settings` exist and do the same thing. JS uses `load_settings`.

## Build Status
- ✅ Rust build: `cargo build --release` — success
- ✅ JS bundle: `esbuild` — success (832.7kb)
