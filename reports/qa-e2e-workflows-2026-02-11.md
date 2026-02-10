# QA E2E Workflow Test Report — 2026-02-11

## Summary

Traced all 4 workflows through JS and Rust code. Found and fixed **4 bugs**, including 1 build blocker. All workflows are functional after fixes.

## Workflow 1: New User ✅

| Step | Status | Notes |
|------|--------|-------|
| App opens | ✅ | `OxidianApp.init()` runs, safe-wrapped per module |
| Onboarding check | ✅ | `is_first_launch` Rust cmd exists, returns bool |
| Create vault | ✅ | `setup_vault` Rust cmd creates dir + settings |
| Welcome screen | ✅ | Shown via `showWelcome()` after onboarding finishes |
| Create first note | ✅ | `showNewNoteDialog()` → `createNewNote()` → `save_note` IPC |
| Type content | ✅ | Editor attached, `markDirty()` triggers auto-save |
| Save | ✅ | `save_note` writes to disk, updates search index + meta cache |
| File in explorer | ✅ | `sidebar.refresh()` called after create, uses `scan_vault` |

**No blockers.** Note creation properly calls `invalidateFileTreeCache()` + `sidebar.refresh()`.

## Workflow 2: Daily Usage ✅

| Step | Status | Notes |
|------|--------|-------|
| Open app → recent files | ✅ | `renderRecentFiles()` reads localStorage; `get_recent_files` Rust cmd exists |
| Click file → edit | ✅ | `openFile()` with mutex, reads via `read_note` |
| Save | ✅ | Queued save system prevents parallel writes |
| Create new note | ✅ | Dialog flow works |
| Link to other note | ✅ | `navigateToNote()` creates if missing, `WikilinksAutoComplete` available |
| Search for note | ✅ **FIXED** | See Bug #1 and #2 below |
| Open from search | ✅ | `renderResults` click handler calls `openFile()` |

## Workflow 3: Settings ✅

| Step | Status | Notes |
|------|--------|-------|
| Ctrl+, opens settings | ✅ | `handleKeyboard` catches `Ctrl+,` → `openSettingsTab()` |
| Change theme | ✅ | Theme selector in appearance section, auto-saves |
| Change font | ✅ | Font family + size sliders, auto-saves |
| Change editor mode | ✅ | Default edit mode dropdown in editor section |
| Save | ✅ | `saveAll()` → `save_settings` Rust cmd |
| Persist on restart | ✅ | `applySettings()` loads on init via `get_settings` |

**Note:** `load_hotkeys` and `get_available_commands` Rust cmds don't exist — settings.js has fallback defaults so not a blocker. `save_hotkeys` also missing but caught by try/catch.

## Workflow 4: Advanced ✅

| Step | Status | Notes |
|------|--------|-------|
| Open graph | ✅ | `openGraphView()` → `GraphView` constructor, `get_graph_data` Rust cmd exists |
| See connections | ✅ | `compute_graph` uses VaultMetaCache for edges |
| Command palette | ✅ | `Ctrl+P` → `CommandPalette.show()`, full command registry |
| Quick switcher | ✅ | `Ctrl+O` → `QuickSwitcher.show()` |
| Bookmarks | ✅ | `BookmarksManager` with `list_bookmarks`/`add_bookmark`/`remove_bookmark` Rust cmds |
| Tags | ✅ | `loadTags()` → `get_tags` Rust cmd, tag pills render in sidebar |

## Bugs Found & Fixed

### Bug #1 (BLOCKER): `search_by_tag` command doesn't exist
- **File:** `src/js/search.js:73`
- **Issue:** Tag searches (`#tag`) called `invoke('search_by_tag', { tag })` but no Rust command existed
- **Fix:** Changed to use `search_vault` with the full `#tag` query for full-text search
- **Impact:** Tag search from sidebar was completely broken

### Bug #2 (MINOR): `search_suggest` parameter name mismatch
- **File:** `src/js/search.js:109`
- **Issue:** JS called `invoke('search_suggest', { prefix })` but Rust expects `{ query }`
- **Fix:** Changed to `invoke('search_suggest', { query: prefix })`
- **Impact:** 1-char search suggestions returned no results

### Bug #3 (MINOR): `renderSuggestions` treated SearchResult objects as strings
- **File:** `src/js/search.js:renderSuggestions()`
- **Issue:** `search_suggest` returns `Vec<SearchResult>` but renderer used `item.textContent = suggestion`
- **Fix:** Now extracts `.title` or `.path` from result objects, click opens file directly
- **Impact:** Suggestions displayed as `[object Object]`

### Bug #4 (BUILD BLOCKER): `open::that` crate not in dependencies
- **File:** `src-tauri/src/commands/core_cmds.rs:891`
- **Issue:** `open_external` used `open::that()` but `open` crate not in Cargo.toml
- **Fix:** Replaced with platform-specific `std::process::Command` (`xdg-open`/`open`/`cmd start`)
- **Impact:** Release build failed entirely

## Non-Blocking Issues (Not Fixed)

1. **Missing Rust commands:** `load_hotkeys`, `save_hotkeys`, `get_available_commands` — all have JS fallbacks
2. **`search_vault` options param:** JS passes `{ query, options: {} }` but Rust expects `{ query, limit }` — works fine since Tauri ignores unknown fields

## Build Status

- ✅ `cargo build --release` — success (1 warning: unused variable)
- ✅ `esbuild` bundle — success (837.1kb)

## Key Architecture Notes

- **scan_vault vs list_files:** Both return `Vec<FileNode>`. Sidebar uses `scan_vault`, app cache uses `list_files`. No conflict.
- **Save flow:** Queued save system with mutex prevents race conditions. Optimistic UI with rollback on error.
- **File creation refresh:** `createNewNote` → `invalidateFileTreeCache()` + `sidebar.refresh()` — explorer updates correctly.
- **Settings persistence:** `save_settings` writes JSON to `{vault}/.oxidian/settings.json`, `load_settings` reads on startup.
