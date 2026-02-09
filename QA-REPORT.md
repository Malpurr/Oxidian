# Oxidian QA Report

**Date:** 2026-02-09  
**Reviewer:** QA Subagent  
**Scope:** Full source code review (Rust backend, JS frontend, HTML, CSS)

---

## Critical Bugs (Fixed)

### CRIT-1: `create_snippet` panics on multi-byte UTF-8 content
- **File:** `src-tauri/src/search.rs` → `create_snippet()`
- **Description:** The function finds a byte position in `body.to_lowercase()` and uses it to slice the original `body`. Since `to_lowercase()` can change byte lengths (e.g., `ß` → `ss`, Turkish `İ` → `i`), byte positions from the lowercased string don't correspond to valid char boundaries in the original, causing a **panic** on `body[start..end]`.
- **Impact:** App crashes whenever search results contain non-ASCII text near the match.
- **Fix applied:** Rewrote to use char-level indexing, converting back to byte positions safely.

### CRIT-2: `change_password` doesn't re-encrypt existing notes
- **File:** `src-tauri/src/commands.rs` → `change_password()`
- **Description:** When changing the vault password, only the `vault.key` verification file was re-encrypted. All existing encrypted `.md` files remained encrypted with the OLD password, making them permanently unreadable after password change.
- **Impact:** Complete data loss of all encrypted notes after password change.
- **Fix applied:** Added a loop that walks all `.md` files, decrypts with old password, re-encrypts with new password.

### CRIT-3: Path traversal vulnerability in vault operations
- **File:** `src-tauri/src/vault.rs` → `read_note`, `save_note`, `delete_note`, `create_folder`, `rename_file`
- **Description:** All vault file operations join `vault_path` with a user-supplied relative path without checking for `../` sequences. A malicious plugin or crafted wiki-link could read, write, or delete files outside the vault (e.g., `../../etc/passwd`).
- **Impact:** Security vulnerability — arbitrary file read/write/delete on the host system.
- **Fix applied:** Added `validate_path()` function that canonicalizes paths and verifies they stay within the vault root.

### CRIT-4: `moment()` shim format token ordering
- **File:** `src/js/obsidian-api.js` → `moment().format()`
- **Description:** Format tokens were replaced in wrong order: `'MM'` before `'MMM'`/`'MMMM'`, and `'ddd'` before `'dddd'`. This means `'MMMM'` (full month name) would be partially consumed by `'MM'` (month number), producing garbage like `"01uary"` instead of `"January"`.
- **Impact:** Any Obsidian plugin using `moment().format('MMMM')` or `moment().format('dddd')` gets corrupted date strings.
- **Fix applied:** Reordered replacements from longest to shortest tokens.

---

## Critical Bugs (Not Fixed — Requires Design Decision)

### CRIT-5: `read_file_absolute` exposes arbitrary file system read
- **File:** `src-tauri/src/commands.rs` → `read_file_absolute()`
- **Description:** This Tauri command reads any file on the system by absolute path. It's used by the plugin installer to read `manifest.json`, but it's callable by any JS code (including loaded plugins). A malicious plugin could read `~/.ssh/id_rsa`, `/etc/shadow`, etc.
- **Suggested fix:** Either remove this command and use Tauri's FS plugin with scoped paths, or restrict it to only read from known safe directories (e.g., only `.json` files, or only paths the user explicitly selected via dialog).

### CRIT-6: Disabling encryption doesn't decrypt existing files
- **File:** `src/js/settings.js` → encryption toggle handler
- **Description:** When the encryption toggle is turned OFF, the setting `encryption_enabled` is saved as `false`, but existing encrypted files are NOT decrypted. They remain as JSON blobs with `{salt, nonce, data}` and become unreadable since the app no longer attempts decryption.
- **Suggested fix:** When disabling encryption, decrypt all files with the current password first (similar to how `change_password` now re-encrypts).

---

## Minor Bugs

### MIN-1: All Mutex `.lock().unwrap()` calls can cascade panic
- **File:** `src-tauri/src/commands.rs` — every command function
- **Description:** If any mutex is poisoned (due to a panic while holding it), all subsequent `.unwrap()` calls on that mutex will also panic, crashing the entire app. Should use `.lock().map_err()` or `.lock().unwrap_or_else()`.
- **Suggested fix:** Replace `.lock().unwrap()` with `.lock().map_err(|e| format!("Lock poisoned: {}", e))?` for Tauri commands that return `Result`.

### MIN-2: `index_note` allocates 50MB writer per save
- **File:** `src-tauri/src/search.rs` → `index_note()`
- **Description:** Each call to `index_note()` creates a new `IndexWriter` with a 50MB heap budget. This is called on every note save, which is wasteful for single-document updates.
- **Suggested fix:** Keep a persistent `IndexWriter` in the `SearchIndex` struct (behind a `Mutex`) and reuse it, or reduce the budget to 3-5MB for single-note indexing.

### MIN-3: Search with special characters crashes query parser
- **File:** `src-tauri/src/search.rs` → `search()`
- **Description:** Tantivy's query parser uses Lucene-like syntax where characters like `[`, `]`, `{`, `}`, `(`, `)`, `~`, `^`, `"`, `:` are special. User input is passed directly to `parse_query()` without escaping. Searching for `[[wikilink]]` or `#tag` will produce a parse error.
- **Suggested fix:** Escape special characters in the query string before passing to tantivy, or catch the parse error and fall back to a simple term query.

### MIN-4: Right split pane editor changes are never saved
- **File:** `src/js/app.js` → `createSplitLayout()`, `showFileInRightPane()`
- **Description:** The right pane textarea has an `input` event listener for preview updates, but no mechanism to save changes. There's no `blur` save handler, no dirty tracking for the right pane, and `saveCurrentFile()` only saves the left pane's content.
- **Suggested fix:** Create a secondary editor instance for the right pane with its own save/dirty tracking, or at minimum add a save handler.

### MIN-5: `navigateToNote` doesn't search through vault for wiki-link targets
- **File:** `src/js/app.js` → `navigateToNote()`
- **Description:** Wiki-links like `[[My Note]]` are resolved by directly trying `My Note.md` as a path. If the note is in a subfolder (e.g., `notes/My Note.md`), the link won't resolve and instead creates a new file at the root called `My Note.md`.
- **Suggested fix:** Search the file tree for a file matching the target name before creating a new file.

### MIN-6: `sidebar.setActive()` triggers full tree re-render on folder expansion
- **File:** `src/js/sidebar.js` → `setActive()`
- **Description:** When a file is in a collapsed folder, `setActive()` adds the parent paths to `openFolders` and calls `this.refresh()` which fetches the file list from Rust and completely re-renders the tree. This causes visible flicker and scroll position loss.
- **Suggested fix:** Instead of `refresh()`, directly toggle the CSS class on the existing folder DOM elements.

### MIN-7: Custom theme previews are missing
- **File:** `src/js/settings.js` → `renderThemeGrid()`
- **Description:** Theme preview cards use CSS classes like `.theme-preview-dark`, `.theme-preview-light`, etc. Custom themes don't have corresponding preview classes and show blank preview boxes.
- **Suggested fix:** Generate a dynamic preview from the theme's CSS variables, or show a generic "Custom" preview.

### MIN-8: `moment()` shim `add()`/`subtract()` only handle days
- **File:** `src/js/obsidian-api.js` → `moment().add()`, `moment().subtract()`
- **Description:** The `unit` parameter is ignored — `add(1, 'month')` and `add(1, 'year')` both add 1 day instead.
- **Suggested fix:** Handle common units: `'days'`, `'months'`, `'years'`, `'hours'`, `'minutes'`.

### MIN-9: `moment()` shim `isSame()` only compares date strings
- **File:** `src/js/obsidian-api.js` → `moment().isSame()`
- **Description:** `isSame(other, unit)` ignores the `unit` parameter and always compares full date strings. `isSame(other, 'month')` should compare year+month, not exact date.
- **Suggested fix:** Implement unit-aware comparison.

### MIN-10: Encryption detection in `read_note` is fragile
- **File:** `src-tauri/src/commands.rs` → `read_note()`
- **Description:** Encrypted files are detected by checking `content.starts_with('{') && content.contains("\"salt\"")`. A regular markdown file that starts with `{` and contains the word `"salt"` in its content would be mistakenly treated as encrypted.
- **Suggested fix:** Use a more specific marker, like checking for all three fields `{salt, nonce, data}` together, or add a magic header.

### MIN-11: `escapeHtml` is duplicated across 6 files
- **Files:** `app.js`, `sidebar.js`, `contextmenu.js`, `search.js`, `tabs.js`, `settings.js`
- **Description:** The same `escapeHtml` helper is copy-pasted in every module, creating a DOM element each call.
- **Suggested fix:** Export a shared utility from a `utils.js` module.

---

## UX Improvements

### UX-1: Onboarding "Open Existing Vault" creates a new vault at the selected path
- **File:** `src/js/onboarding.js` → `renderVaultSetup()`
- **Description:** Both "Create New Vault" and "Open Existing Vault" ultimately call `setup_vault`, which creates directories and writes default settings. For an existing vault (e.g., an Obsidian vault), this overwrites any existing `.oxidian/settings.json`.
- **Suggested fix:** For "Open Existing Vault", use `set_vault_path` instead of `setup_vault`, and only write settings if they don't already exist.

### UX-2: No confirmation or progress indicator for password change
- **File:** `src/js/settings.js` → password change handler
- **Description:** Changing the password (which now re-encrypts all files) could take a long time on large vaults. The UI just blocks with a synchronous `prompt()` dialog chain and `alert()`.
- **Suggested fix:** Show a progress bar/spinner during re-encryption. Don't use `prompt()` — create a proper dialog with password fields.

### UX-3: `prompt()` and `confirm()` used for critical operations
- **Files:** `src/js/settings.js`, `src/js/app.js`
- **Description:** Native browser `prompt()`, `confirm()`, and `alert()` are used for: setting encryption password, confirming deletion, creating folders, changing passwords. These look out of place in a desktop app and can't be styled.
- **Suggested fix:** Create custom dialog components matching the existing dialog style (like `new-note-dialog`).

### UX-4: No auto-save / save indicator
- **Description:** Files are saved on blur and on Ctrl+S, but there's no periodic auto-save. If the app crashes, unsaved changes are lost. The dirty indicator (yellow dot) is subtle.
- **Suggested fix:** Add periodic auto-save (e.g., every 30 seconds when dirty), and show a more visible "Unsaved" indicator or a toast on save.

### UX-5: Vim mode setting exists but has no implementation
- **File:** `src/js/settings.js` → "Vim Mode (experimental)" toggle
- **Description:** The setting is saved and loaded, but no code ever reads `settings.editor.vim_mode` to enable vim keybindings. The textarea is a plain HTML textarea that can't support vim mode.
- **Suggested fix:** Either implement basic vim mode (hjkl navigation, i/a/o for insert, ESC for normal) or label it as "Coming Soon" and disable the toggle.

### UX-6: No keyboard shortcut for command palette in welcome screen
- **Description:** Ctrl+P opens the command palette, which is great. But the welcome screen's shortcut list doesn't mention it.
- **Suggested fix:** Add `Ctrl+P — Command Palette` to the welcome screen shortcuts.

### UX-7: Tab size setting doesn't affect the editor
- **File:** `src/js/editor.js` → `handleEditorKeys()`
- **Description:** Tab key always inserts `\t`. The `tab_size` setting is saved but never applied — the editor should insert spaces according to the setting, or at least set the CSS `tab-size` property.
- **Suggested fix:** Read `tab_size` from settings and insert that many spaces (or use CSS `tab-size` for display).

### UX-8: Spell check toggle doesn't apply in real-time
- **File:** `src/js/settings.js`, `src/js/app.js`
- **Description:** The `spell_check` setting is saved but never applied to the textarea's `spellcheck` attribute. The textarea has `spellcheck="true"` hardcoded in the HTML.
- **Suggested fix:** In `applySettings()`, also set `this.editor.textarea.spellcheck = settings.editor.spell_check`.

### UX-9: Line height setting doesn't apply to editor
- **Description:** `line_height` is saved in settings but only `font_size` and `font_family` are applied in `applySettings()`. The CSS `line-height: 1.7` is hardcoded.
- **Suggested fix:** Apply line height via CSS variable in `applySettings()`.

---

## Missing Features (Referenced but not implemented)

### MISS-1: Auto backup
- **Description:** `auto_backup` setting exists in `VaultSettings` but no backup logic is implemented anywhere.

### MISS-2: Language/i18n
- **Description:** Language setting (`en`, `de`, `fr`) exists in settings but no i18n system is implemented. All strings are hardcoded in English.

### MISS-3: Startup behavior
- **Description:** `startup_behavior` setting (`welcome`, `last-session`, `daily-note`) exists but is never read on startup. The app always shows the welcome screen or onboarding.

### MISS-4: Bookmarks
- **Description:** The bookmarks panel (`panel-bookmarks`) exists in the UI with a placeholder "No bookmarks yet" but there's no way to add, remove, or persist bookmarks.

### MISS-5: WASM Plugin System
- **Description:** `src-tauri/src/plugin.rs` defines a full WASM plugin trait and manager, but the WASM runtime (wasmtime) is only shown as a comment. The `list_plugins` command creates a `PluginManager` but only discovers JSON manifests, never loads WASM.

### MISS-6: Checkbox toggle in preview
- **Description:** `markdown.rs` adds `class="task-checkbox"` to checkboxes and removes `disabled`, but no JS handler is attached to toggle checkboxes in the preview and sync the change back to the editor source.

---

## Tauri Command / JS Invoke Audit

All `invoke()` calls in JS match registered Tauri commands in `main.rs`. Parameter names match between JS and Rust (using camelCase in JS → snake_case in Rust, which Tauri auto-converts).

| JS `invoke()` call | Rust command | Match? |
|---|---|---|
| `read_note({path})` | `read_note(path: String)` | ✅ |
| `save_note({path, content})` | `save_note(path: String, content: String)` | ✅ |
| `delete_note({path})` | `delete_note(path: String)` | ✅ |
| `list_files` | `list_files()` | ✅ |
| `create_daily_note` | `create_daily_note()` | ✅ |
| `render_markdown({content})` | `render_markdown(content: String)` | ✅ |
| `search_notes({query})` | `search_notes(query: String)` | ✅ |
| `get_vault_path` | `get_vault_path()` | ✅ |
| `set_vault_path({path})` | `set_vault_path(path: String)` | ✅ |
| `create_folder({path})` | `create_folder(path: String)` | ✅ |
| `rename_file({oldPath, newPath})` | `rename_file(old_path, new_path)` | ✅ |
| `get_tags` | `get_tags()` | ✅ |
| `get_backlinks({notePath})` | `get_backlinks(note_path: String)` | ✅ |
| `get_graph_data` | `get_graph_data()` | ✅ |
| `duplicate_note({path})` | `duplicate_note(path: String)` | ✅ |
| `get_settings` | `get_settings()` | ✅ |
| `save_settings({newSettings})` | `save_settings(new_settings: Settings)` | ✅ |
| `is_first_launch` | `is_first_launch()` | ✅ |
| `unlock_vault({password})` | `unlock_vault(password: String)` | ✅ |
| `lock_vault` | `lock_vault()` | ✅ |
| `is_vault_locked` | `is_vault_locked()` | ✅ |
| `setup_encryption({password})` | `setup_encryption(password: String)` | ✅ |
| `change_password({oldPassword, newPassword})` | `change_password(old_password, new_password)` | ✅ |
| `list_plugins` | `list_plugins()` | ✅ |
| `list_obsidian_plugins` | `list_obsidian_plugins()` | ✅ |
| `read_plugin_main({pluginId})` | `read_plugin_main(plugin_id: String)` | ✅ |
| `read_plugin_styles({pluginId})` | `read_plugin_styles(plugin_id: String)` | ✅ |
| `toggle_plugin({pluginId, enabled})` | `toggle_plugin(plugin_id, enabled)` | ✅ |
| `get_enabled_plugins` | `get_enabled_plugins()` | ✅ |
| `get_plugin_data({pluginId})` | `get_plugin_data(plugin_id: String)` | ✅ |
| `save_plugin_data({pluginId, data})` | `save_plugin_data(plugin_id, data)` | ✅ |
| `list_custom_themes` | `list_custom_themes()` | ✅ |
| `load_custom_theme({name})` | `load_custom_theme(name: String)` | ✅ |
| `setup_vault({path})` | `setup_vault(path: String)` | ✅ |
| `install_plugin({sourcePath, pluginId})` | `install_plugin(source_path, plugin_id)` | ✅ |
| `read_file_absolute({path})` | `read_file_absolute(path: String)` | ✅ |

All 32 commands match. ✅

---

## CSS Class Audit

All CSS classes referenced by JS (`classList.add/remove/toggle`, `className`, `querySelector`) are defined in `style.css`. No orphaned references found.

---

## Summary

| Category | Count |
|---|---|
| Critical bugs (fixed) | 4 |
| Critical bugs (needs decision) | 2 |
| Minor bugs | 11 |
| UX improvements | 9 |
| Missing features | 6 |

**Overall Assessment:** The app has a solid architecture and impressive feature set for a v0.2.0. The Obsidian plugin compatibility shim is ambitious and well-structured. The main concerns are:
1. **Security** — path traversal and arbitrary file read need attention
2. **Encryption** — the lifecycle (enable/disable/change password) has edge cases that can cause data loss
3. **Right pane** — split view is visually implemented but the right pane can't save edits
4. **Settings** — several settings are saved but never applied (vim mode, spell check, line height, tab size, startup behavior)
