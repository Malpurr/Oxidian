# FORGE Sprint Report — 2026-02-09b

**Agent:** FORGE (Backend Lead)  
**Duration:** 20-min sprint  
**Date:** 2026-02-09 12:18 CET

---

## 1. CRIT-6 FIX: Disabling encryption now decrypts existing files ✅

**Problem:** Toggling encryption OFF in settings only flipped the `encryption_enabled` flag. Existing encrypted files (JSON blobs with `{salt, nonce, data}`) remained encrypted and became permanently unreadable.

**Changes:**

### `src-tauri/src/commands.rs` — New `disable_encryption` command
- Walks all `.md` files in the vault
- Decrypts each encrypted file using the stored password
- Writes plaintext back to disk
- Removes `vault.key` verification file
- Updates settings to `encryption_enabled: false`
- Clears stored password from AppState
- Returns error if vault is locked (no password available)

### `src-tauri/src/main.rs` — Registered new command
- Added `commands::disable_encryption` to the `invoke_handler` macro

### `src/js/settings.js` — Updated encryption toggle OFF handler
- Added confirmation dialog before disabling
- Calls `invoke('disable_encryption')` instead of just saving the setting
- Rolls back toggle on failure

---

## 2. Warnings Fixed: Unused variables in plugin.rs ✅

### `src-tauri/src/plugin.rs`
- `run_on_note_open(path, ...)` → `run_on_note_open(_path, ...)`
- `run_on_note_save(path, ...)` → `run_on_note_save(_path, ...)`
- `run_on_render` left without underscore (parameter is used)

---

## 3. Error Handling Audit ✅

All Tauri commands in `commands.rs` already use proper error handling:
- Every `Mutex::lock()` uses `.map_err(|e| format!("Lock poisoned: {}", e))?` — **good**, no `.unwrap()` on mutexes
- All file I/O operations propagate errors via `?` or `.map_err()`
- The new `disable_encryption` command follows the same pattern
- `read_file_absolute` has path validation (canonicalize + starts_with check)

**No issues found** — error handling is consistent across all 33 commands.

---

## 4. Performance: Removed unnecessary allocation in `save_note` ✅

### `src-tauri/src/commands.rs` — `save_note()`
- **Before:** `content.clone()` was called even when encryption was disabled (allocating a full copy of the note content for nothing)
- **After:** Restructured to call `vault::save_note()` directly with `&content` when no encryption needed — zero-copy path for the common case
- Encrypted path still allocates (unavoidable — encrypted output is a different string)

---

## Summary

| Priority | Status | Impact |
|----------|--------|--------|
| CRIT-6: Disable encryption decrypts files | ✅ Fixed | Prevents data loss |
| Unused variable warnings in plugin.rs | ✅ Fixed | Clean compile |
| Error handling audit | ✅ Verified | All commands safe |
| save_note unnecessary clone | ✅ Fixed | Less allocation on every save |
