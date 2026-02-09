# Oxidian QA Report

**Last Updated:** 2026-02-09 (Sprint B)  
**Reviewers:** QA Scout (Sprint A), BREAKER (Sprint B)  
**Scope:** Full source code review (Rust backend, JS frontend, HTML, CSS)

---

## Sprint History

| Sprint | Date | Reviewer | Bugs Fixed | Reports |
|---|---|---|---|---|
| A | 2026-02-09 | Scout | 4 critical, 2 design flagged | `reports/scout-2026-02-09.md` |
| B | 2026-02-09 | BREAKER | 5 (1 security, 1 critical, 1 data-loss, 2 UX) | `reports/breaker-sprint-2026-02-09b.md` |

---

## Current Open Issues

### Security
- **DESIGN-1:** Encrypted file detection is heuristic-based (`starts_with('{')` + `contains("salt")`). Risk of misidentifying plaintext files as encrypted. **Needs magic prefix or per-file manifest.**
- **DESIGN-2:** `read_file_absolute` command readable by any loaded plugin within vault scope. **Consider removing or further restricting.**

### Code Quality / Missing Features
- 6× duplicated `escapeHtml()` across JS modules
- Vim mode toggle has no implementation
- `tab_size`, `spell_check`, `line_height` settings saved but never applied
- `startup_behavior` setting never read on startup
- Bookmarks panel is non-functional (UI shell only)
- Auto backup setting has no implementation
- Language/i18n setting has no implementation
- WASM plugin system defined in Rust but runtime never loaded

---

## Resolved Issues (All Sprints)

### Sprint A Fixes
- ✅ UTF-8 `create_snippet` panic on multi-byte text
- ✅ `change_password` now re-encrypts all vault files
- ✅ Path traversal via `../` in vault operations (validate_path added)
- ✅ `moment()` format token ordering (longest-first)
- ✅ 50MB writer allocation per note save → persistent 15MB writer
- ✅ Special characters crash Tantivy query parser → escaped
- ✅ Right split pane can now save edits
- ✅ `moment().add/subtract` handles all time units
- ✅ `moment().isSame` respects unit parameter
- ✅ `disable_encryption` command added (decrypts all files)

### Sprint B Fixes
- ✅ **XSS via wiki-link targets** in markdown rendering (HTML/JS injection)
- ✅ **`debounce()` in obsidian-api.js** was broken for standard usage (plugins affected)
- ✅ **Search index traversed hidden directories** (.oxidian, .obsidian, etc.)
- ✅ **`beforeunload` data loss** — async save couldn't complete; now shows confirmation dialog
- ✅ **Vault unlock didn't refresh UI** — sidebar/tags now reload after password entry

---

## Tauri Command Audit

All 33 JS `invoke()` calls match registered Rust commands. Parameter names auto-convert (camelCase → snake_case). ✅

---

## Overall Assessment

The app is solid for v0.2.0. Critical security and data-loss issues from Sprint A are resolved. Sprint B closed the remaining XSS hole and plugin-compat debounce bug. Main remaining work is:
1. **Encrypted file detection** hardening (design decision needed)
2. **Settings that don't apply** (tab_size, spell_check, line_height, vim_mode, startup_behavior)
3. **Bookmarks** feature (UI exists, no backend)
4. **Code dedup** (escapeHtml and other shared utils)
