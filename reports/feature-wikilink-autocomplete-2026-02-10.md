# Feature: Wiki-Link Autocomplete (`[[`)

**Date:** 2026-02-10  
**Status:** ✅ Implemented (both classic textarea + CodeMirror 6)

## Summary

The wiki-link autocomplete feature was **already partially implemented** in `src/js/wikilinks.js` for classic textarea mode. However, it **did not work with CodeMirror 6** (the default editor), since CM6 replaces the textarea DOM element and the old event listeners never fire.

### What was done

**Fixed: CodeMirror 6 integration** (`src/js/codemirror-editor.js`):
- Added `wikilinkCompletion` — an async CM6 completion source that triggers when `[[` is detected
- Uses `invoke('list_files')` with a 5-second cache to fetch all vault notes
- Filters notes by query typed after `[[`
- On selection, inserts `notename]]` (completing the wikilink syntax)
- Registered via `autocompletion({ override: [wikilinkCompletion] })`

### How it works

| Editor Mode | Mechanism |
|---|---|
| **Classic textarea** | `WikilinksAutoComplete` class in `wikilinks.js` — custom popup via DOM |
| **CodeMirror 6** | Native CM6 `autocompletion` extension with `wikilinkCompletion` source |

### User Flow
1. User types `[[` in the editor
2. Dropdown appears with all `.md` files from the vault
3. Typing filters the list (e.g., `[[dai` shows "daily-note")
4. Arrow keys navigate, Enter/Click selects
5. Selected note is inserted as `[[note-name]]`
6. Escape closes the dropdown

### Files Modified
- `src/js/codemirror-editor.js` — Added wikilink completion source + `invoke` import

### Files Already Existing (no changes needed)
- `src/js/wikilinks.js` — Classic textarea autocomplete (346 lines, fully functional)
- `src/css/obsidian-features.css` — Popup styles for classic mode
- `src/js/app.js` — Already imports, initializes, and attaches `WikilinksAutoComplete`
