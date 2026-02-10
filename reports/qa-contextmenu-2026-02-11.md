# QA Report: Context Menu & Navigation — 2026-02-11

## Summary
Added "Reveal in File Manager" Rust command + wired it into context menu. Added missing folder context menu items (New Note, New Subfolder).

## Changes Made

### 1. New Rust Command: `reveal_in_file_manager`
**File:** `src-tauri/src/commands/core_cmds.rs`
- Added `reveal_in_file_manager(path)` command
- Resolves relative path against vault path
- Opens parent directory for files, directory itself for folders
- Platform-specific: `xdg-open` (Linux), `open` (macOS), `explorer` (Windows)
- Registered in `src-tauri/src/main.rs`

### 2. Context Menu: "Reveal in File Manager" Fixed
**File:** `src/js/contextmenu.js`
- **Before:** Used `window.__TAURI__.shell.open()` — broken because `@tauri-apps/plugin-shell` JS package not installed, so `window.__TAURI__.shell` is undefined at runtime
- **After:** Uses `invoke('reveal_in_file_manager', { path })` — calls the Rust backend directly
- Added `import { invoke } from './tauri-bridge.js'`

### 3. Context Menu: Added Folder-Specific Items
**File:** `src/js/contextmenu.js`
- Added "New Note" option for directories → calls `app.createNewFileInFolder(path)`
- Added "New Subfolder" option for directories → calls `app.createNewSubfolder(path)`

### 4. New App Methods
**File:** `src/js/app.js`
- `createNewFileInFolder(folderPath)` — prompts for name, creates `.md` file in folder, opens it
- `createNewSubfolder(folderPath)` — prompts for name, creates subfolder

## Context Menu Items Audit

### File Context Menu
| Item | Status | Notes |
|------|--------|-------|
| Open in New Pane | ✅ | Calls `openFileInSplit()` |
| Rename | ✅ | Calls `startRename()` → `invoke('rename_file')` |
| Duplicate | ✅ | Calls `duplicateFile()` → `invoke('duplicate_note')` |
| Copy Path | ✅ | Uses `navigator.clipboard.writeText()` |
| Reveal in File Manager | ✅ FIXED | Now uses Rust command |
| Delete | ✅ | Calls `deleteFile()` → `invoke('delete_note')` |

### Folder Context Menu
| Item | Status | Notes |
|------|--------|-------|
| New Note | ✅ NEW | Creates note in folder |
| New Subfolder | ✅ NEW | Creates subfolder |
| Rename | ✅ | Calls `startRename()` |
| Copy Path | ✅ | Clipboard |
| Reveal in File Manager | ✅ FIXED | Rust command |
| Delete | ✅ | Calls `deleteFile()` |

## Build
- ✅ `cargo build --release` — success
- ✅ `esbuild` bundle — 837.1kb
