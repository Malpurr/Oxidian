# BREAKER Sprint Report — 2026-02-09b

**QA Lead:** BREAKER  
**Sprint Duration:** 20 min  
**Scope:** Full source code review, all .rs/.js/.css/.html  
**Previous Report:** scout-2026-02-09.md (many issues already fixed since then)

---

## Bugs Found & Fixed

### 🔴 SEC-1: XSS via Wiki-Link Targets in Markdown Rendering
- **File:** `src-tauri/src/markdown.rs` → `preprocess_wiki_links()`
- **Severity:** SECURITY
- **Description:** Wiki-link targets (`[[target]]`) were interpolated directly into HTML attributes and `onclick` JS without escaping. A crafted note containing `[[' onclick=alert(document.cookie) ']]` would execute arbitrary JavaScript. Attack vector: malicious shared notes or Obsidian vault imports.
- **Fix:** Added HTML entity escaping (`&`, `"`, `<`, `>`) and JS string escaping (`'`, `\`) for both `target` and `display` values before interpolation.

### 🔴 BUG-2: `debounce()` in Obsidian API Shim Was Broken
- **File:** `src/js/obsidian-api.js` → `debounce()`
- **Severity:** CRITICAL (plugin compatibility)
- **Description:** When `resetTimer` was falsy (the default), the debounce function would return early if a timeout was already pending, meaning the callback was never rescheduled. Standard debounce should clear+reset the timer on every call. This broke any Obsidian plugin using `debounce()` without the third argument — the callback would fire only once.
- **Fix:** Simplified to always `clearTimeout` + reschedule. The `resetTimer` parameter was a broken abstraction that doesn't match Obsidian's actual API.

### 🟡 BUG-3: Search Index Indexed Hidden Directories
- **File:** `src-tauri/src/search.rs` → `reindex_vault()`
- **Severity:** MINOR (UX)
- **Description:** `WalkDir` traversed `.oxidian/`, `.obsidian/`, and `.search_index/` directories, indexing `settings.json`, plugin `main.js` files, and other internal files. These appeared in search results.
- **Fix:** Added `filter_entry()` to skip directories starting with `.`, preventing descent into hidden dirs entirely.

### 🟡 BUG-4: Data Loss on Window Close (`beforeunload`)
- **File:** `src/js/app.js` → `beforeunload` handler
- **Severity:** DATA LOSS
- **Description:** `saveCurrentFile()` is async (Tauri `invoke` returns a Promise) but `beforeunload` is synchronous — the browser doesn't wait for the save to complete. If you close the window with unsaved changes, the save fires but may not complete before the process exits.
- **Fix:** Added `e.preventDefault()` + `e.returnValue = ''` to trigger the browser's "Leave page?" confirmation dialog, giving the async save time to complete. Combined with the existing 2-second auto-save timer, the data loss window is now very small.

### 🟡 BUG-5: Vault Unlock Didn't Refresh UI State
- **File:** `src/index.html` → password unlock handler
- **Severity:** UX
- **Description:** After successfully unlocking an encrypted vault, the password dialog was hidden but the sidebar and tags weren't refreshed. Tags extracted from encrypted files (which show as JSON blobs) would be wrong until the user manually refreshed.
- **Fix:** Added `sidebar.refresh()` and `loadTags()` calls after successful unlock.

---

## Bugs Found — NOT Fixed (Need Design Decision)

### 🔴 DESIGN-1: Encrypted File Detection Is Heuristic-Based
- **Files:** `commands.rs` → `read_note()`, `change_password()`, `disable_encryption()`
- **Description:** Encrypted files are detected by `content.starts_with('{') && content.contains("\"salt\"")`. A markdown file starting with `{` that mentions the word "salt" would be misidentified. This could cause data corruption (attempting to decrypt a plaintext file).
- **Recommendation:** Use a magic prefix (e.g., `OXIDIAN_ENC:`) followed by the JSON, or store encryption state per-file in a manifest.

### 🟡 DESIGN-2: `read_file_absolute` Allows Reading Any .md/.js/.json/.css in Vault
- **File:** `commands.rs` → `read_file_absolute()`
- **Description:** While restricted to the vault directory and safe extensions, this command is callable by any loaded Obsidian plugin. A malicious plugin could read other users' notes or config files within the vault. The command exists only for the plugin installer to read `manifest.json`.
- **Recommendation:** Remove this command and use Tauri's dialog API to return file contents directly from the selection dialog.

---

## Audit: Previous Report Issues Status

| Previous Issue | Status |
|---|---|
| CRIT-1: UTF-8 snippet panic | ✅ Fixed (char-level indexing) |
| CRIT-2: change_password didn't re-encrypt | ✅ Fixed (walks all .md files) |
| CRIT-3: Path traversal | ✅ Fixed (validate_path added) |
| CRIT-4: moment() format token ordering | ✅ Fixed (longest-first) |
| CRIT-5: read_file_absolute | ⚠️ Partially fixed (extension+path restriction) |
| CRIT-6: Disable encryption doesn't decrypt | ✅ Fixed (disable_encryption command added) |
| MIN-2: 50MB writer per save | ✅ Fixed (persistent 15MB writer) |
| MIN-3: Special chars crash search | ✅ Fixed (chars escaped) |
| MIN-4: Right pane can't save | ✅ Fixed (save handler added) |
| MIN-8: moment add/subtract only days | ✅ Fixed (handles all units) |
| MIN-9: moment isSame ignores unit | ✅ Fixed (unit-aware comparison) |

---

## New Issues Observed (Not Bugs, But Noteworthy)

1. **6 duplicated `escapeHtml` functions** across JS modules — should be a shared util
2. **Vim mode toggle** in settings has no implementation — should be labeled "Coming Soon" or removed
3. **`tab_size` setting** is saved but editor always inserts `\t` — should respect the setting
4. **`spell_check` setting** is saved but textarea has `spellcheck="true"` hardcoded
5. **`line_height` setting** is saved but not applied via CSS variable
6. **`startup_behavior` setting** is never read on app startup
7. **Bookmarks panel** exists in UI but is completely non-functional

---

## Summary

| Category | Count |
|---|---|
| Security bugs fixed | 1 |
| Critical bugs fixed | 1 |
| Data loss bugs fixed | 1 |
| UX bugs fixed | 2 |
| Design issues (unfixed, need decision) | 2 |
| Code quality observations | 7 |

**Overall:** The codebase is in much better shape than the previous report. The previous critical issues (path traversal, encryption lifecycle, UTF-8 panics) have all been properly addressed. The new fixes target a real XSS vector, a plugin-breaking debounce bug, and quality-of-life issues. No build attempted per CTO instructions.
