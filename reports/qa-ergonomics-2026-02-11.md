# QA Ergonomics & Efficiency Audit — 2026-02-11

## Summary
Audited keyboard shortcuts, auto-save, quick actions, error recovery, loading states, undo/redo, and tab management. Found and fixed **7 issues**.

## Findings & Fixes

### 1. Keyboard Shortcuts

| Shortcut | Status | Notes |
|----------|--------|-------|
| Ctrl+S | ✅ Wired | Saves current file |
| Ctrl+N | ✅ Wired | New note dialog |
| Ctrl+P | ✅ Wired | Command palette (falls back to quick switcher) |
| Ctrl+O | ✅ Wired | Quick switcher |
| Ctrl+E | ✅ Wired | Cycle view mode |
| Ctrl+B | 🔧 **FIXED** | **Was missing.** Added bold toggle (wrap `**`) |
| Ctrl+I | 🔧 **FIXED** | **Was missing.** Added italic toggle (wrap `*`) |
| Ctrl+K | ✅ Wired | Insert/wrap link |
| Ctrl+G | ✅ Wired | Graph view |
| Ctrl+T | 🔧 **FIXED** | **Was duplicate of Ctrl+N.** Changed to open quick switcher (new tab) |
| Ctrl+W | ✅ Wired | Close active tab |
| Ctrl+F | ✅ Wired | Find in file |
| Ctrl+H | ✅ Wired | Find & replace |
| Ctrl+, | ✅ Wired | Settings |
| Ctrl+/ | ✅ Wired | Keyboard shortcuts overlay |
| Ctrl+D | ✅ Wired | Daily note / duplicate line (context-dependent) |
| Ctrl+Shift+D | ✅ Wired | Daily note (explicit) |
| Ctrl+Shift+R | ✅ Wired | Remember dashboard |
| Ctrl+Shift+E | ✅ Wired | Extract selection to new note |
| Ctrl+Alt+←/→ | ✅ Wired | Navigation history |
| Escape | ✅ Wired | Close all dialogs/menus |

**No conflicts found** after fixes. `wrapSelection()` method added supporting classic textarea, CodeMirror 6, and HyperMark modes with toggle behavior.

### 2. Auto-save
- ✅ **Implemented** with 2s debounce in `markDirty()`
- ✅ Timer cleared when switching files
- ✅ Save queue prevents parallel saves
- ✅ Optimistic UI with rollback on error

### 3. Quick Actions

| Action | Clicks | Shortcut | Pass? |
|--------|--------|----------|-------|
| Create note | 2 (btn + dialog) | Ctrl+N | ✅ |
| Search | 1 | Ctrl+F / Ctrl+Shift+F | ✅ |
| Switch file | 1 | Ctrl+O / Ctrl+T | ✅ |
| Settings | 2 (ribbon) | Ctrl+, | ✅ |
| Graph view | 1 | Ctrl+G | ✅ |
| Daily note | 1 | Ctrl+D | ✅ |

All common actions ≤2 clicks or 1 shortcut. ✅

### 4. Error Recovery
- ✅ `showErrorToast()` system exists for user-facing errors
- ✅ Most `invoke()` calls wrapped in try/catch
- ✅ Save failure rolls back optimistic UI (isDirty + tab indicator)
- ✅ File-not-found on `navigateToNote` creates the file automatically
- 🔧 **FIXED**: Added global `unhandledrejection` handler to prevent silent failures

### 5. Loading States
- 🔧 **FIXED**: Added save indicator in status bar (`Saving...` → `Saved` → auto-clear after 2s, or `Save failed!`)
- ⚠️ No loading indicator for vault scanning (sidebar refresh) — acceptable since it's fast via Tauri IPC
- ⚠️ No loading indicator for plugin loading — plugins load async on startup, non-blocking

### 6. Undo/Redo
- ✅ Ctrl+Z works in classic textarea mode (browser native)
- ✅ Ctrl+Z works in CodeMirror 6 mode (CM built-in undo)
- ✅ Ctrl+Z works in HyperMark mode (ContentEditable native)
- No custom undo stack needed — all editor modes handle it natively

### 7. Tab Management
- ✅ Tab reorder via drag & drop (already implemented)
- ✅ Middle-click to close tab
- ✅ Split pane support with drag between panes
- 🔧 **FIXED**: Added right-click context menu on tabs with:
  - **Close** — close this tab
  - **Close Others** — close all except this tab
  - **Close All** — close all tabs
  - **Move to Right/Left Pane** — split pane management
- Added `closeAllTabs()` and `closeOtherTabs(keepId)` methods to `TabManager`

## Files Modified
- `src/js/app.js` — Bold/italic shortcuts, wrapSelection(), save indicator, Ctrl+T fix, unhandled rejection handler, updated shortcuts overlay
- `src/js/tabs.js` — Tab context menu, closeAllTabs(), closeOtherTabs()
- `src/js/app.bundle.js` — Rebuilt (835.6kb)

## Build
```
npx esbuild src/js/app.js --bundle --format=iife --outfile=src/js/app.bundle.js --external:./codemirror-bundle.js
# ⚡ Done in 14ms — 835.6kb
```
