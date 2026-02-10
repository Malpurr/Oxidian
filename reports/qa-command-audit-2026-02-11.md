# QA Command Registration Audit — 2026-02-11

## Summary

**Build status: ✅ PASS** (zero errors, zero warnings after fix)

### Finding 1: All existing `#[tauri::command]` functions WERE registered

Contrary to initial concern, every Rust command that existed was already in the `invoke_handler`. The `fetch_community_plugin_list` was already registered.

### Finding 2: 15 commands invoked from JS had NO Rust implementation

These commands were called via `invoke()` in JavaScript but had no corresponding `#[tauri::command]` function:

| Command | JS Source | Status |
|---------|-----------|--------|
| `canvas_add_edge` | canvas.js | ✅ Implemented |
| `fuzzy_match_files` | wikilinks.js | ✅ Implemented |
| `get_available_commands` | settings.js | ✅ Implemented (returns []) |
| `get_link_at_position` | link-handler.js | ✅ Implemented |
| `list_files_in_dir` | css-snippets.js | ✅ Implemented |
| `load_hotkeys` | settings.js | ✅ Implemented |
| `move_file` | drag-drop.js | ✅ Implemented |
| `nav_state` | nav-history.js | ✅ Implemented |
| `open_external` | settings.js | ✅ Implemented (platform-specific) |
| `read_file_text` | remember-import.js | ✅ Implemented |
| `render_inline` | hypermark.js | ✅ Implemented |
| `resolve_embeds` | embeds.js | ✅ Implemented |
| `save_binary` | app.js | ✅ Implemented |
| `save_hotkeys` | settings.js | ✅ Implemented |
| `search_by_tag` | search.js | ✅ Implemented |

### Files Modified

- `src-tauri/src/commands/core_cmds.rs` — Added 13 commands
- `src-tauri/src/commands/feature_cmds.rs` — Added 4 commands (nav_state, canvas_add_edge, search_by_tag, resolve_embeds)
- `src-tauri/src/main.rs` — Registered all 15 new commands in invoke_handler

### Stats

- **Total registered commands:** 128 (was 113)
- **Total `#[tauri::command]` functions:** 128
- **JS `invoke()` calls without backend:** 0 (was 15)
- **Unregistered commands:** 0
