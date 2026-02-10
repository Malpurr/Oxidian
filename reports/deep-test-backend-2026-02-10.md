# Oxidian Backend Audit — 2026-02-10

**Scope:** All Rust Tauri commands, engine modules, features, state management  
**Files reviewed:** 18 source files, ~80+ Tauri commands  
**Auditor:** Backend Subagent

---

## Executive Summary

The backend is well-structured with good separation of concerns. Path sanitization exists and SM-2 is correctly implemented. However, there are **critical security gaps**, **race conditions**, **blocking I/O on the main thread**, and **missing search index updates** that need attention.

**Findings:** 4 Critical, 8 High, 12 Medium, 6 Low

---

## 🔴 CRITICAL (4)

### C1: `resolve_wikilink` panics with `todo!()` — shipped dead code
- **File:** `engine/links.rs:8`
- **Severity:** CRITICAL
- **Issue:** `resolve_wikilink()` uses `todo!()` which will **panic and crash the app** if called from the frontend via `resolve_link` command.
- **Fix:** Either implement it or return `Ok(vec![])` with a warning. Never ship `todo!()` behind a Tauri command.

```rust
pub fn resolve_wikilink(_vault_path: &str, _link: &str) -> Result<Vec<LinkTarget>, String> {
    // FIXME: Return empty for now instead of crashing
    Ok(vec![])
}
```

### C2: Plugin commands have NO path sanitization — directory traversal
- **File:** `commands/plugin_cmds.rs:67-78` (`read_plugin_main`), `plugin_cmds.rs:80-93` (`read_plugin_styles`), `plugin_cmds.rs:153-169` (`get_plugin_data`, `save_plugin_data`)
- **Severity:** CRITICAL
- **Issue:** `plugin_id` parameter is used directly in path construction with `.join(&plugin_id)`. A malicious `plugin_id` like `../../.ssh` could read arbitrary files.
- **Fix:** Sanitize `plugin_id` — reject any value containing `/`, `\`, or `..`:

```rust
fn validate_plugin_id(id: &str) -> Result<(), String> {
    if id.contains('/') || id.contains('\\') || id.contains("..") || id.is_empty() {
        return Err("Invalid plugin ID".to_string());
    }
    Ok(())
}
```

### C3: `change_password` has no atomicity — partial re-encryption leaves vault corrupted
- **File:** `commands/core_cmds.rs:176-217`
- **Severity:** CRITICAL
- **Issue:** If the process crashes mid-way through re-encrypting files, some files will be encrypted with the old password and some with the new one. The vault becomes **unrecoverable**.
- **Fix:** Two-phase approach:
  1. First pass: re-encrypt all files to temp files (`.md.tmp`)
  2. Second pass: atomically rename all `.md.tmp` → `.md`
  3. Only then update the vault key file

### C4: `disable_encryption` same atomicity problem
- **File:** `commands/core_cmds.rs:220-264`
- **Severity:** CRITICAL
- **Issue:** Same as C3 — partial decryption on crash = data loss.
- **Fix:** Same two-phase rename approach.

---

## 🟠 HIGH (8)

### H1: `delete_note` doesn't remove from search index
- **File:** `commands/core_cmds.rs:43-52`
- **Severity:** HIGH
- **Issue:** `delete_note` updates `meta_cache` but does NOT remove from `search_index`. Deleted notes will appear in search results.
- **Fix:** Add search index cleanup:

```rust
let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
search.reindex_vault(&vault_path)?; // or implement delete_by_path
```

### H2: `remove_from_index` does a full reindex — O(n) for single delete
- **File:** `commands/core_cmds.rs:315-320`
- **Severity:** HIGH
- **Issue:** Comment says "tantivy doesn't expose simple delete" but it does — `delete_term` is already used in `index_note`. The current implementation reindexes the entire vault for every single delete.
- **Fix:**

```rust
pub fn remove_from_index(state: State<AppState>, path: String) -> Result<(), String> {
    let mut search = state.search_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let path_term = tantivy::Term::from_field_text(search.path_field, &path);
    if let Some(writer) = search.writer.as_mut() {
        writer.delete_term(path_term);
        writer.commit().map_err(|e| format!("Commit error: {}", e))?;
    }
    Ok(())
}
```

### H3: `rename_file` doesn't update search index, bookmarks, nav history, or tag index
- **File:** `commands/core_cmds.rs:116-119`
- **Severity:** HIGH
- **Issue:** Renaming a file only does the filesystem rename. The search index, bookmarks, nav_history, and tag_index all have stale entries.
- **Fix:** After rename, call:
  - `search.reindex_vault()` or delete old + index new
  - `bookmarks.rename_path(old, new)`
  - `nav_history.rename_path(old, new)`
  - `tag_index.rename_file(old, new)`

### H4: `trash_entry` doesn't update search index or meta_cache
- **File:** `commands/core_cmds.rs:332-335`
- **Severity:** HIGH
- **Issue:** Trashed files remain in the search index and meta cache.
- **Fix:** After trashing, remove from both caches.

### H5: All Tauri commands are synchronous — blocking the main thread
- **File:** All command files
- **Severity:** HIGH
- **Issue:** Every command is `pub fn` (sync), not `pub async fn`. Tauri runs sync commands on the main thread. Operations like `scan_vault`, `reindex_vault`, `change_password`, `disable_encryption` walk the entire filesystem and will **freeze the UI** for large vaults.
- **Fix:** Mark heavy operations as `async` and use `tauri::async_runtime::spawn_blocking`:

```rust
#[tauri::command]
pub async fn scan_vault(state: State<'_, AppState>) -> Result<Vec<FileNode>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock: {}", e))?.clone();
    tauri::async_runtime::spawn_blocking(move || {
        vault_ops::scan_vault(&vault_path).root
    }).await.map_err(|e| format!("Task failed: {}", e))
}
```

### H6: Multiple Mutex locks in sequence — potential deadlocks
- **File:** `commands/core_cmds.rs` (multiple functions), `feature_cmds.rs:29-35`
- **Severity:** HIGH
- **Issue:** Functions like `get_tags`, `get_backlinks`, `get_graph_data` acquire `meta_cache` lock, then while holding it, acquire `vault_path` lock. Other functions acquire `vault_path` first, then `meta_cache`. This inconsistent lock ordering can deadlock.
- **Fix:** Always acquire locks in the same order: `vault_path` → `search_index` → `meta_cache` → others. Or clone `vault_path` first and drop the lock before acquiring others.

### H7: `load_custom_theme` — no path sanitization on theme name
- **File:** `commands/feature_cmds.rs:56-63`
- **Severity:** HIGH
- **Issue:** `name` parameter goes directly into `.join(format!("{}.css", name))`. A name like `../../etc/passwd` could read arbitrary files (even though `.css` is appended, `../../../.oxidian/settings` works).
- **Fix:** Validate theme name contains no path separators or `..`.

### H8: `canvas_add_node` / `load_canvas` / `save_canvas` — no path sanitization
- **File:** `commands/feature_cmds.rs:68-120`
- **Severity:** HIGH
- **Issue:** The `path` parameter is joined directly with vault path. No `validate_path()` call.
- **Fix:** Use `vault_ops::validate_path()` (which already exists) for all canvas operations.

---

## 🟡 MEDIUM (12)

### M1: `save_note` with encryption — silent fallback to plaintext
- **File:** `commands/core_cmds.rs:29-38`
- **Severity:** MEDIUM
- **Issue:** If `encryption_enabled` is true but no password is set, the note is saved in **plaintext** without warning the user.
- **Fix:** Return an error instead:

```rust
if settings.vault.encryption_enabled && password.is_none() {
    return Err("Vault is locked — cannot save encrypted note".to_string());
}
```

### M2: `read_note` with encryption — encrypted content returned as-is if vault is locked
- **File:** `commands/core_cmds.rs:15-24`
- **Severity:** MEDIUM
- **Issue:** If vault is locked (no password), encrypted content (raw JSON) is returned to the frontend which will display gibberish.
- **Fix:** Check if content looks encrypted and return an error if no password is available.

### M3: Settings migration is a no-op
- **File:** `engine/settings.rs:283-287`
- **Severity:** MEDIUM
- **Issue:** `migrate()` only bumps the version number. No actual field migration logic. If a field's *semantics* change between versions, old values persist unchanged.
- **Fix:** Add actual migration logic per version bump. Current approach works for additive changes only (thanks to `#[serde(default)]`).

### M4: `update_links_on_rename` — naive string replacement
- **File:** `commands/core_cmds.rs:269-290`
- **Severity:** MEDIUM
- **Issue:** Uses simple `content.replace(&format!("[[{}]]", old_name), ...)` which:
  - Misses aliased links: `[[old_name|display]]`
  - Misses links with paths: `[[folder/old_name]]`
  - Could match inside code blocks or frontmatter
- **Fix:** Use regex: `\[\[([^|\]]*\/)?old_name(\|[^\]]+)?\]\]`

### M5: `duplicate_note` doesn't check if copy already exists
- **File:** `commands/core_cmds.rs:132-143`
- **Severity:** MEDIUM
- **Issue:** `"note copy.md"` overwrites if it already exists. Multiple duplicates overwrite each other.
- **Fix:** Append incrementing number: `note copy 2.md`, `note copy 3.md`, etc.

### M6: Tags extracted inside code blocks and frontmatter
- **File:** `engine/vault.rs:70-74` (TAG_RE)
- **Severity:** MEDIUM
- **Issue:** The regex `(?:^|\s)#([a-zA-Z]...)` matches tags inside fenced code blocks, inline code, and YAML frontmatter. This produces false positives.
- **Fix:** Strip code blocks and frontmatter before extraction, or use a state machine parser.

### M7: `search_index.index_note` commits on every single save
- **File:** `engine/search.rs:63`
- **Severity:** MEDIUM (Performance)
- **Issue:** Every `index_note` call does a `writer.commit()`. For rapid saves (auto-save every 5s), this creates excessive I/O and can cause tantivy to create many small segment files.
- **Fix:** Batch commits or use a debounced commit (commit at most once per second).

### M8: `VaultMetaCache` staleness check uses wall clock — 30s is aggressive
- **File:** `state.rs:19-23`
- **Severity:** MEDIUM (Performance)
- **Issue:** `is_stale(30)` means the cache rebuilds every 30s when accessed. `rebuild()` walks the ENTIRE vault reading every `.md` file. For a 1000-note vault, this is ~1s of I/O every 30 seconds.
- **Fix:** Increase to 300s or use the file watcher to invalidate the cache instead of time-based staleness.

### M9: Cards frontmatter parser is custom, not YAML-aware
- **File:** `features/remember/cards.rs:120-140`
- **Severity:** MEDIUM
- **Issue:** The custom `parse_frontmatter` uses line-by-line key:value parsing. Multi-line YAML values, nested objects, or quoted strings with colons will break. The engine's `frontmatter.rs` uses `serde_yaml` properly — why not reuse it?
- **Fix:** Use `crate::engine::frontmatter::parse_frontmatter` instead of the custom parser.

### M10: `remember_review_card` reloads all cards to find one
- **File:** `features/remember/review.rs:55-57`
- **Severity:** MEDIUM (Performance)
- **Issue:** `review_card` calls `load_all_cards` (walks filesystem, reads all files), then finds the one card. This is O(n) per review.
- **Fix:** Load the single card file directly by path.

### M11: `discover_cross_source` is O(n²)
- **File:** `features/remember/connections.rs:80-97`
- **Severity:** MEDIUM (Performance)
- **Issue:** Nested loop comparing all card pairs. For 1000 cards, that's 500K comparisons.
- **Fix:** Build tag→cards index first, then iterate by tag for O(n·k) where k = avg tags per card.

### M12: `install_plugin` — no validation of source directory content
- **File:** `commands/plugin_cmds.rs:178-197`
- **Severity:** MEDIUM
- **Issue:** Copies arbitrary files from `source_path` into the plugins directory without checking file types, sizes, or whether `source_path` is actually a plugin.
- **Fix:** Validate that `manifest.json` exists in source. Limit allowed file extensions. Check total size.

---

## 🟢 LOW (6)

### L1: `fuzzy_search` isn't actually fuzzy
- **File:** `commands/core_cmds.rs:299-303`
- **Severity:** LOW
- **Issue:** Appends `*` for prefix matching, not actual fuzzy/Levenshtein search.
- **Fix:** Use tantivy's `FuzzyTermQuery` or document the limitation.

### L2: Dead `ObsidianPluginManifest` struct in plugin_cmds
- **File:** `commands/plugin_cmds.rs:5-13`
- **Severity:** LOW
- **Issue:** `ObsidianPluginManifest` is defined but `list_obsidian_plugins` constructs it manually from JSON values. The struct could be used with `serde_json::from_str` directly.
- **Fix:** Derive `Deserialize` and use `serde_json::from_str::<ObsidianPluginManifest>`.

### L3: `create_daily_note` hardcodes "daily/" folder
- **File:** `commands/core_cmds.rs:61-78`
- **Severity:** LOW
- **Issue:** Daily notes folder is hardcoded to `daily/`. Not configurable via settings.
- **Fix:** Read from `DailyNotesConfig` (which already exists in the features module).

### L4: `parse_markdown` and `render_markdown_html` are duplicates of `render_markdown`
- **File:** `commands/core_cmds.rs:249-256`
- **Severity:** LOW
- **Issue:** Three commands (`render_markdown`, `parse_markdown`, `render_markdown_html`) all call the same `md::render_markdown()`.
- **Fix:** Deprecate two, keep one.

### L5: `Regex::new` called on every `preprocess_wiki_links` / `preprocess_tags` call
- **File:** `engine/markdown.rs:10,19`
- **Severity:** LOW (Performance)
- **Issue:** Regex is compiled on every render call. Should be `LazyLock` like in vault.rs.
- **Fix:** Use `static LazyLock<Regex>`.

### L6: `RememberState` in `features/remember/mod.rs` is defined but never used
- **File:** `features/remember/mod.rs:15-25`
- **Severity:** LOW
- **Issue:** `RememberState` with `Mutex<Vec<Card>>` and `Mutex<Vec<Source>>` is defined but never added to `AppState` or used by any command.
- **Fix:** Either integrate it (for caching) or remove the dead code.

---

## ✅ What's Done Well

1. **Path validation in vault ops** — `validate_path()` correctly uses `canonicalize()` + `starts_with()` to prevent traversal
2. **`read_file_absolute`** has proper vault-boundary check and extension whitelist
3. **SM-2 algorithm** — Correct implementation matching the original SuperMemo SM-2 spec (verified formula, boundary conditions, EF minimum)
4. **Settings schema** — Excellent use of `#[serde(default)]` for forward-compatible deserialization
5. **Error handling** — Consistent `Result<T, String>` pattern throughout, proper `map_err` chains
6. **Trash with collision avoidance** — Timestamp suffix prevents overwrites
7. **Search index** — Proper delete-then-add for updates, special character sanitization in queries
8. **BookmarkManager** — Legacy format migration, prune_missing, rename tracking
9. **NavHistory** — Proper forward-truncation, max size enforcement, skip internal paths
10. **Canvas** — Full Obsidian `.canvas` format compatibility with proper serde

---

## 🔧 Plugin Security Assessment

The plugin system has **NO sandbox**:
- `read_plugin_main` returns raw JS to the frontend (presumably for eval)
- `install_plugin` copies arbitrary files
- `save_plugin_data` / `get_plugin_data` write/read arbitrary JSON
- No WASM isolation exists — plugins run as JS in the webview context
- **Risk:** A malicious plugin can access the full Tauri API surface

**Recommendation:** At minimum, validate plugin manifests and restrict IPC access per-plugin.

---

## Priority Fix Order

1. **C1** — One-line fix, prevents crash
2. **C2** — Add `validate_plugin_id()`, ~10 lines
3. **H1/H3/H4** — Search index consistency (prevents user-visible bugs)
4. **H6** — Lock ordering (prevents hangs)
5. **C3/C4** — Atomic re-encryption (prevents data loss)
6. **H5** — Async commands (prevents UI freeze)
7. **H7/H8** — Path sanitization for themes/canvas
8. **M1/M2** — Encryption state handling
