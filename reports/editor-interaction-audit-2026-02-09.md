# Editor Interaction Audit — 2026-02-09
**QA Tester:** #2 (Subagent)  
**Files Reviewed:** `hypermark.js`, `editor.js`, `app.js`, `index.html`, `slash.js`, `style.css`

## Test Results

| # | Test Case | Result | Notes |
|---|-----------|--------|-------|
| 1 | New Note → Editor opens, cursor ready | ✅ PASS | `createNewNote` → `openFile` → `ensureEditorPane` → `setContent` → `focus()` |
| 2 | Text tippen → korrekt | ✅ PASS | HyperMark: textarea per block. Classic: standard textarea. Both fire `markDirty`. |
| 3 | Enter → neue Zeile | ✅ PASS | Classic: auto-continues lists. HyperMark: native textarea Enter. |
| 4 | Mehrere Absätze | ✅ PASS | BlockSplitter correctly splits paragraphs on blank lines. |
| 5 | `# Heading` → rendered | ✅ PASS | On blur, `_blurBlock` re-renders block via `BlockRenderers.heading()`. |
| 6 | `**bold**`, `*italic*` | ✅ PASS | `renderInline()` handles bold, italic, bold+italic, strikethrough. |
| 7 | ` ```code``` ` → Code Block | ✅ PASS | `BlockRenderers.code_block()` with syntax highlighting. |
| 8 | Slash Commands `/` | ✅ PASS | Both modes: HyperMark has `SlashCommandMenu`, classic has `SlashMenu` from `slash.js`. |
| 9 | Click rendered block → edit mode | ✅ PASS | `mousedown` on wrapper → `_focusBlock()` → re-renders with textarea. |
| 10 | Click empty area | 🐛 **FIXED** | See Bug #1 and #2 below. |
| 11 | Ctrl+Z Undo | 🐛 **FIXED** | Core undo works, but `_mergeWithPreviousBlock` had wrong transaction. See Bug #3. |
| 12 | Ctrl+S Save | ✅ PASS | `handleKeyboard` → `saveCurrentFile()`. Also: auto-save after 2s debounce. |
| 13 | Tab wechseln + zurück | ✅ PASS | `onTabActivated` → `loadFileIntoLeftPane` saves dirty first, re-reads from disk. |
| 14 | Ctrl+E View Mode Toggle | ✅ PASS | Cycles `live-preview` → `source` → `reading`. Rebuilds editor pane each time. |
| 15 | Source Mode | ✅ PASS | Raw textarea, no preview pane (CSS `.source-mode .preview-pane-half { display: none }`). |
| 16 | Reading Mode | ✅ PASS | Editor hidden, `.reading-view` shown with Tauri-rendered HTML. Not editable. |

## Bugs Found & Fixed

### Bug #1: `splitter.reparse()` — Method Does Not Exist
**File:** `src/js/hypermark.js` — `_buildDOM()` click handler  
**Severity:** 🔴 Critical (crash on click)  
**Problem:** When clicking empty content area with no blocks, code called `this.splitter.reparse(this.buffer)`. `BlockSplitter` has no `reparse` method — only `parse(text)`.  
**Fix:** Changed to `this.splitter.parse(this.buffer.toString())`.

### Bug #2: `_activateBlock()` — Method Does Not Exist
**File:** `src/js/hypermark.js` — `_buildDOM()` click handler  
**Severity:** 🔴 Critical (crash on click)  
**Problem:** Code called `this._activateBlock(0)` (with index) and `this._activateBlock(lastIdx)`. No such method exists. The correct method is `_focusBlock(blockId)`.  
**Fix:** 
- Empty doc: `this._focusBlock(this.splitter.blocks[0].id)`
- Non-empty: `this._focusBlock(lastBlock.id)` + `requestAnimationFrame` to set cursor position (textarea exists only after render).

### Bug #3: Undo Transaction Recorded After Buffer Mutation
**File:** `src/js/hypermark.js` — `_mergeWithPreviousBlock()`  
**Severity:** 🟡 Medium (undo produces wrong result after block merge)  
**Problem:** `buffer.replace()` was called before the transaction was recorded. The `deleted` field captured already-modified buffer content via `this.buffer.slice(prevBlock.from, currentBlock.to)`.  
**Fix:** Capture `originalContent` via `buffer.slice()` BEFORE calling `buffer.replace()`, then use it in the transaction.

## Architecture Notes

- **Dual editor engine**: Classic (textarea + highlight backdrop) and HyperMark (block-based). Controlled by `editorMode` in localStorage.
- **View modes**: `live-preview` (HyperMark), `source` (raw textarea), `reading` (rendered, non-editable). Pane is fully rebuilt on mode switch.
- **Auto-save**: 2s debounce in `app.js`, plus `blur` save. HyperMark also has its own `autoSaveDelay` (1s) dispatching `hypermark-autosave` events (currently unused by app).
- **Undo**: HyperMark has own `TransactionHistory` with 300ms batching. Classic relies on native textarea undo.
