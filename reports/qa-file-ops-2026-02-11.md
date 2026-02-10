# QA Report: File Operations — 2026-02-11

**Tester:** QA Tester #1 (File Operations)  
**Status:** ✅ All bugs fixed, build successful

---

## Bug #1 — CRITICAL: File Explorer Always Shows "Vault is empty"

**Symptom:** Sidebar always displays "Vault is empty" even when files exist.

**Root Cause:** `sidebar.js:refresh()` called `invoke('scan_vault', { path: ... })` and then accessed `tree.children`. However, the Rust `scan_vault` command returns `Vec<FileNode>` (a flat array), NOT an object with a `children` property. So `tree.children` was always `undefined`, rendering an empty list.

Additionally, the command was passed a `{ path }` argument it doesn't accept (Rust signature: `fn scan_vault(state: State<AppState>)` — no path param). While Tauri v2 ignores extra args, this was still incorrect.

**Fix:** Changed to `invoke('scan_vault')` (no args) and `Array.isArray(tree) ? tree : (tree.children || [])` to handle the array response correctly.

**File:** `src/js/sidebar.js` line ~9

---

## Bug #2 — CRITICAL: `create_file` Command Does Not Exist

**Symptom:** `sidebar.createFile(path)` calls `invoke('create_file', { path })`, but no `create_file` Tauri command is registered in `main.rs` or defined in any `*_cmds.rs` file. This would throw an IPC error at runtime.

**Root Cause:** The command was never implemented in Rust. The `app.js` `createNewNote()` method correctly uses `invoke('save_note', ...)` instead, but the sidebar had a broken method.

**Fix:** Changed `sidebar.createFile()` to use `invoke('save_note', { path, content })` with auto-generated heading content, matching `app.js` behavior.

**File:** `src/js/sidebar.js` line ~14

---

## Bug #3 — `move_entry` Parameter Mismatch

**Symptom:** Moving files via drag-and-drop would fail silently.

**Root Cause:** `sidebar.moveEntry(oldPath, newPath)` sends `{ oldPath, newPath }` to Tauri. Tauri v2's camelCase→snake_case conversion maps these to `old_path` and `new_path`. But the Rust command expects `source_path` and `dest_dir`. Parameter name mismatch = deserialization failure.

**Fix:** Changed to `invoke('move_entry', { sourcePath: oldPath, destDir: newPath })` which correctly maps to `source_path` / `dest_dir`.

**File:** `src/js/sidebar.js` line ~42

---

## Bug #4 — Missing "Reveal in File Manager" Context Menu Option

**Symptom:** No way to open a file's location in the system file manager from the right-click context menu.

**Root Cause:** The option was simply never added to `contextmenu.js:showFileMenu()`.

**Fix:** Added "Reveal in File Manager" menu item using `window.__TAURI__.shell.open()` (the `tauri-plugin-shell` is already configured in `Cargo.toml`, `main.rs`, and `capabilities/default.json`). Opens parent directory for files, or the directory itself for folders.

**File:** `src/js/contextmenu.js` line ~47

---

## Verified Working (No Bugs Found)

| Feature | Status | Notes |
|---------|--------|-------|
| **Save note (Ctrl+S)** | ✅ | Properly queued saves, optimistic UI with rollback |
| **Auto-save** | ✅ | 2s debounced timer, only saves dirty files |
| **Create folder** | ✅ | `create_folder` Rust command exists and is registered |
| **Rename file** | ✅ | `rename_file` command works, updates search index and links |
| **Delete note** | ✅ | `delete_note` command works, cleans up cache and index |
| **Duplicate note** | ✅ | `duplicate_note` properly handles name collisions |
| **Create new note (dialog)** | ✅ | Uses `save_note` correctly, refreshes sidebar |
| **Tauri bridge** | ✅ | Proper polling for `__TAURI__` readiness with timeout |

---

## Build Status

```
✅ cargo build --release — Success (32s)
✅ esbuild bundle — Success (17ms, 831KB)
```
