# Rust Backend Audit — Oxidian Android App (v3.2)

**Date:** 2026-02-12  
**Auditor:** Clawy (automated)  
**Scope:** `src-tauri/src/` — all Rust source files, `Cargo.toml`, `tauri.conf.json`

---

## Summary

| Severity | Count |
|----------|-------|
| **P0 — Critical** | 3 |
| **P1 — High** | 5 |
| **P2 — Medium** | 4 |
| **P3 — Low** | 3 |

---

## P0 — Critical

### P0-1: `dirs::home_dir()` still used in 3 non-mobile code paths (fallback reached on Android)

**Files:**
- `src/vault.rs:9` — `default_vault_path()`
- `src/engine/vault.rs:69` — `default_vault_path()`
- `src/engine/vault_manager.rs:13` — `vaults_file()`

**Description:** While `lib.rs` correctly uses `app.path().app_data_dir()` on mobile via `#[cfg(mobile)]`, the `default_vault_path()` functions still call `dirs::home_dir()` which returns `None` on Android. The fallback path `/data/local/tmp/.oxidian/vault` is **world-readable** on most Android devices — any app can read vault data. Additionally, `/data/local/tmp` may not be writable on non-rooted devices.

**Impact:** Data written to world-readable location; app may crash on non-rooted devices.

**Fix:** The `default_vault_path()` functions should never be called on Android. Add compile-time guards:

```rust
// vault.rs and engine/vault.rs
pub fn default_vault_path() -> String {
    #[cfg(target_os = "android")]
    {
        // Must be set via app_data_dir at startup; panic if reached
        panic!("default_vault_path() must not be called on Android — use vault_path_with_base()");
    }
    #[cfg(not(target_os = "android"))]
    {
        dirs::home_dir()
            .map(|home| home.join(".oxidian").join("vault").to_string_lossy().to_string())
            .unwrap_or_else(|| {
                log::error!("home_dir() unavailable");
                "/tmp/.oxidian/vault".to_string()
            })
    }
}
```

### P0-2: `Settings::default()` calls `default_vault_path()` unconditionally

**File:** `src/settings.rs:55` — `impl Default for Settings`

**Description:** `Settings::default()` calls `crate::vault::default_vault_path()` which hits the Android-unsafe path. This is invoked from `load_settings()` when no settings file exists (first launch).

**Impact:** First launch on Android gets wrong vault path or panics.

**Fix:** Accept vault_path as parameter instead of calling default:
```rust
impl Settings {
    pub fn with_vault_path(vault_path: String) -> Self {
        Settings {
            general: GeneralSettings {
                vault_path,
                ..Default::default()
            },
            ..Default::default()
        }
    }
}
```

### P0-3: `download_and_install_update` — self-update on Android will crash/corrupt

**File:** `src/commands/core_cmds.rs:446-455`

**Description:** `apply_update()` calls `std::env::current_exe()`, renames the binary, and spawns a new process. On Android:
1. The app runs within the Android runtime — there's no standalone binary to replace
2. `current_exe()` may return the zygote or app_process path
3. `std::process::Command::new().spawn()` can't restart an Android app
4. `std::process::exit(0)` kills the app without proper lifecycle

**Impact:** Corrupts app installation or crashes.

**Fix:** Gate the entire updater behind `#[cfg(desktop)]`:
```rust
#[tauri::command]
pub async fn download_and_install_update(download_url: String) -> Result<(), String> {
    #[cfg(not(desktop))]
    return Err("Self-update is not available on mobile".to_string());
    
    #[cfg(desktop)]
    {
        let temp_dir = std::env::temp_dir();
        // ... existing code
    }
}
```

---

## P1 — High

### P1-1: `reveal_in_file_manager` — no Android handler, silent no-op

**File:** `src/commands/core_cmds.rs:590-613`

**Description:** `reveal_in_file_manager` has `#[cfg(target_os = "linux/macos/windows")]` blocks but no Android handler. On Android, the function silently does nothing (no `#[cfg]` matches). Should use Android intent to open a file manager, or return an error.

**Severity:** P1 — Feature silently broken on Android.

**Fix:** Add Android block or return error:
```rust
#[cfg(target_os = "android")]
return Err("File manager reveal not supported on Android".to_string());
```

### P1-2: `open_external` — no Android handler

**File:** `src/commands/core_cmds.rs:641-655`

**Description:** Same pattern — `xdg-open`/`open`/`explorer` but no Android. `std::process::Command` with `xdg-open` will fail on Android. Should use Tauri's shell plugin `open` API instead.

**Severity:** P1 — Links don't open on Android.

**Fix:**
```rust
#[cfg(target_os = "android")]
return Err("Use frontend window.open() or Tauri shell plugin for Android".to_string());
```
Better: use `tauri_plugin_shell::ShellExt` to open URLs cross-platform.

### P1-3: `tauri-plugin-shell` included but shell access is dangerous on Android

**File:** `Cargo.toml:22`, `lib.rs:200`

**Description:** `tauri-plugin-shell` is initialized globally. On Android, shell commands could interact with the Linux layer in unexpected ways. The `open_external` command spawns `xdg-open` which doesn't exist.

**Severity:** P1 — Should be gated to desktop only, or use shell plugin's `open` API.

### P1-4: `SearchIndex::new()` panic on failure kills Android app

**File:** `src/lib.rs:223-226`

**Description:**
```rust
let search_index = SearchIndex::new(&vault_path)
    .unwrap_or_else(|e| {
        log::error!("Failed to initialize search index: {}", e);
        panic!("Search index init failed: {}", e);
    });
```
If the search index directory can't be created (permissions, disk full), the app panics. On Android, this shows as a native crash with no user-friendly error.

**Severity:** P1 — App crashes instead of degrading gracefully.

**Fix:** Fall back to in-memory index or disable search:
```rust
let search_index = SearchIndex::new(&vault_path)
    .unwrap_or_else(|e| {
        log::error!("Search index init failed, using fallback: {}", e);
        SearchIndex::in_memory().expect("In-memory search must work")
    });
```

### P1-5: `notify` file watcher — `macos_fsevent` feature enabled, no Android equivalent

**File:** `Cargo.toml:19` — `notify = { version = "7", features = ["macos_fsevent"] }`

**Description:** The `notify` crate's `RecommendedWatcher` on Android uses inotify, which may not work on all Android file systems (especially external/virtual storage). More critically, file watching is started in `core/vault.rs:start_watcher()` using `std::sync::mpsc` which blocks a thread — on Android this wastes limited resources.

**Severity:** P1 — File watcher may silently fail or waste resources on Android.

**Fix:** Consider disabling file watcher on Android and using manual refresh, or verify inotify works on target storage.

---

## P2 — Medium

### P2-1: `window.unwrap()` on desktop only — safe but fragile

**File:** `src/lib.rs:263`

```rust
#[cfg(desktop)]
{
    let window = app.get_webview_window("main").unwrap();
    window.set_title("Oxidian").ok();
}
```

**Description:** Correctly gated behind `#[cfg(desktop)]`, but `unwrap()` will panic if window name changes.

**Fix:** Use `if let Some(window) = ...`

### P2-2: `tauri-plugin-dialog` — file picker dialogs don't work on Android without extra setup

**File:** `Cargo.toml:15`, `lib.rs:198`

**Description:** `tauri-plugin-dialog` is initialized. File open/save dialogs may not work on Android without proper Android manifest permissions and SAF (Storage Access Framework) integration. If the frontend invokes file dialogs, they'll fail silently or crash.

**Severity:** P2 — Depends on whether dialogs are actually used.

### P2-3: Blocking I/O in synchronous Tauri commands

**Files:** Most commands in `core_cmds.rs`

**Description:** Commands like `list_files`, `get_tags`, `get_backlinks`, `scan_vault`, `fuzzy_match_files` perform synchronous file I/O. Tauri v2 runs sync commands on a thread pool, so this won't block the UI thread — but on Android with slower storage, these can take significantly longer and the thread pool may become saturated.

**Severity:** P2 — Performance degradation on large vaults.

**Fix:** Consider making heavy operations async, or adding vault size limits for mobile.

### P2-4: Full vault walk on metadata rebuild

**Files:** `src/state.rs:28` (`VaultMetaCache::rebuild`), `src/lib.rs:237`

**Description:** At startup, the app does:
1. `SearchIndex::new()` + `reindex_vault()` — walks all files, indexes with tantivy
2. `meta_cache.rebuild()` — walks all files again
3. `tag_index.build_from_vault()` — walks all files again

Three full vault walks on startup. On a 1000+ note vault on Android with slow flash storage, this could take 10+ seconds.

**Severity:** P2 — Slow startup on mobile.

**Fix:** Consolidate into a single walk, or lazy-load on first access.

---

## P3 — Low

### P3-1: `CURRENT_VERSION` hardcoded as `"1.3.5"` in updater

**File:** `src/updater.rs:6`

**Description:** `const CURRENT_VERSION: &str = "1.3.5"` doesn't match `Cargo.toml` version `"2.0.0"` or `tauri.conf.json` version `"2.0.0"`. Update checks will always think an update is available.

**Severity:** P3 — Cosmetic/UX issue; updater is desktop-only anyway.

**Fix:** Read from `env!("CARGO_PKG_VERSION")` instead.

### P3-2: `change_password` — `.with_extension("")` to strip `.tmp` is fragile

**File:** `src/commands/core_cmds.rs:309`

**Description:** `path.with_extension("")` on `foo.md.tmp` produces `foo.md` — this works but only because the extension is exactly `.tmp`. If any file has multiple dots (e.g., `v2.0.notes.md.tmp`), it still works correctly since `with_extension("")` only strips the last extension. Safe but worth a comment.

### P3-3: Encryption deps only in `[target.'cfg(target_os = "android")'.dependencies]`

**File:** `Cargo.toml:29-35`

**Description:** `aes-gcm`, `argon2`, `rand`, `base64` are only listed under Android dependencies, but `encryption.rs` uses them unconditionally. This means desktop builds will fail to compile if encryption features are used.

**Wait** — this is actually a **build issue**. If `encryption.rs` is compiled on desktop, it needs these deps. Let me re-check...

`encryption.rs` uses `aes_gcm`, `argon2`, `base64`, `rand` — these are listed ONLY under `[target.'cfg(target_os = "android")'.dependencies]`. **This means desktop builds should fail.**

**Re-severity: P1** — unless these deps are also pulled in transitively or there's conditional compilation I'm not seeing.

**Fix:** Move encryption deps to `[dependencies]` (not target-specific), or gate `encryption.rs` behind `#[cfg(target_os = "android")]`.

---

## Updated Summary (after re-evaluation)

| Severity | Count |
|----------|-------|
| **P0 — Critical** | 3 |
| **P1 — High** | 6 (P3-3 upgraded) |
| **P2 — Medium** | 4 |
| **P3 — Low** | 2 |

---

## Fixes Applied

### Fix for P0-1: Compile-time guard on `default_vault_path()`

**Files to change:**
- `src/vault.rs` — `default_vault_path()`
- `src/engine/vault.rs` — `default_vault_path()`
- `src/engine/vault_manager.rs` — `vaults_file()`

See P0-1 above for code.

### Fix for P0-3: Gate updater to desktop

**File:** `src/commands/core_cmds.rs`

Add at top of `download_and_install_update` and `apply_update`:
```rust
#[cfg(not(desktop))]
return Err("Self-update not available on mobile".to_string());
```

### Fix for P1-4: Graceful search index failure

Replace panic with fallback in `src/lib.rs:223-226`.

### Fix for P3-3→P1: Move encryption deps to global

In `Cargo.toml`, move `aes-gcm`, `argon2`, `rand`, `base64` from `[target.'cfg(target_os = "android")'.dependencies]` to `[dependencies]`.

---

## Security Notes

- **No unsafe blocks found** ✅
- **No hardcoded credentials or keys** ✅
- **Path traversal protection** exists via `validate_path()` in both `vault.rs` and `core/vault.rs` ✅
- **CSP policy** properly configured in `tauri.conf.json` ✅
- **Plugin sandbox** exists for WASM plugins ✅
- **Encryption** uses Argon2id + AES-256-GCM — solid choices ✅
- `read_file_absolute` has proper path validation and extension allowlist ✅

## Android-Specific Recommendations

1. **Test on non-rooted device** — several fallback paths assume `/data/local/tmp` is writable
2. **Add Android manifest permissions** for storage access if needed
3. **Consider lazy initialization** — 3 full vault walks at startup is expensive on mobile
4. **Disable self-updater UI** on mobile (use Play Store updates instead)
5. **Test `notify` file watcher** on Android — inotify may not fire on all storage types
