# QA Report: Slash Commands & Editor — 2026-02-11

## Bugs Found & Fixed

### 1. Slash commands not working in CodeMirror mode (FIXED)
**Root cause:** CodeMirror 6 captures all keydown events internally. The slash menu's `onInput()` was correctly called on content changes (via `EditorView.updateListener`), so the menu **appeared** when typing `/`. However, navigation keys (ArrowUp/Down, Enter, Tab, Escape) were consumed by CodeMirror and never reached the slash menu's `handleKeyDown()`.

**Fix:** Added `EditorView.domEventHandlers({ keydown })` to `src/js/codemirror-editor.js` that forwards keydown events to `slashMenu.handleKeyDown()` before CodeMirror processes them.

### 2. Slash commands in classic textarea mode — OK ✅
Already wired correctly:
- `editor.js:349` — `slashMenu.onInput(this.textarea)` on input events
- `editor.js:777` — `slashMenu.handleKeyDown(e)` in `handleEditorKeys`

### 3. Slash commands in HyperMark mode — OK ✅
HyperMark has its own built-in `SlashCommandMenu` class with full keyboard navigation. Independent of `slash.js`.

### 4. Ctrl+S save — OK ✅
`app.js:handleKeyboard` correctly intercepts `Ctrl+S` → calls `saveCurrentFile()`.

### 5. Editor content syncing to Rust backend — OK ✅
- `markDirty()` is called on every content change (all modes)
- Auto-save fires after 2s debounce via `_autoSaveTimer`
- `saveCurrentFile()` → `_performSave()` → `invoke('save_note', { path, content })`
- Save queue prevents parallel saves (race condition fix already present)

## Changes Made

| File | Change |
|------|--------|
| `src/js/codemirror-editor.js` | Added `EditorView.domEventHandlers` for slash menu keydown interception |
| `src/js/app.bundle.js` | Rebundled |

## No Issues Found With
- SlashMenu initialization (`safeInit('SlashMenu', ...)` in app.js)
- Slash menu DOM element creation
- Slash menu positioning (both textarea and CodeMirror cursor coords)
- Command execution (both insert and wrap modes)
- Save queue / mutex system
