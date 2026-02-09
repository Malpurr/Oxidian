# Oxidian QA Report

**Last Updated:** 2026-02-09 (Sprint C)  
**Reviewers:** QA Scout (Sprint A), BREAKER (Sprint B + C)  
**Scope:** Full source code review (Rust backend, JS frontend, HTML, CSS)

---

## Sprint History

| Sprint | Date | Reviewer | Bugs Fixed | Reports |
|---|---|---|---|---|
| A | 2026-02-09 | Scout | 4 critical, 2 design flagged | `reports/scout-2026-02-09.md` |
| B | 2026-02-09 | BREAKER | 5 (1 security, 1 critical, 1 data-loss, 2 UX) | `reports/breaker-sprint-2026-02-09b.md` |
| C | 2026-02-09 | BREAKER | 4 (1 critical, 1 data-integrity, 1 XSS, 1 UX) | this report |

---

## Current Open Issues

### Security
- **DESIGN-1:** Encrypted file detection is heuristic-based (`starts_with('{')` + `contains("salt")`). Risk of misidentifying plaintext files as encrypted. **Needs magic prefix or per-file manifest.**
- **DESIGN-2:** `read_file_absolute` command readable by any loaded plugin within vault scope (allows .js/.json/.css/.md). **Consider removing or further restricting.**

### Code Quality / Missing Features
- 6× duplicated `escapeHtml()` across JS modules (app.js, tabs.js, search.js, sidebar.js, contextmenu.js, plugin-loader.js) — **extract to shared util**
- Vim mode toggle has no implementation
- `tab_size`, `spell_check`, `line_height` settings saved but never applied to editor
- `startup_behavior` setting never read on startup
- Bookmarks panel is non-functional (UI shell only — localStorage works but no backend persistence)
- Auto backup setting has no implementation
- Language/i18n setting has no implementation
- WASM plugin system defined in Rust but runtime never loaded (wasmtime commented out)
- Editor highlight backdrop tag regex `#[a-zA-Z][\w/-]*` fires inside fenced code blocks (cosmetic — affects highlight layer only, not rendered preview)
- `moment().isBefore/isAfter` with `unit='day'` uses string comparison of `toDateString()` which is locale-dependent and unreliable for ordering

### UX Nits
- Ctrl+K in editor creates `[text](url)` but Ctrl+K in context menu creates `[[wiki-link]]` — inconsistent
- No keyboard shortcut hint shown for Ctrl+P (command palette)
- Focus mode hides ribbon but there's no way to exit focus mode without knowing the shortcut (Ctrl+Shift+D)

---

## Resolved Issues (All Sprints)

### Sprint A Fixes
- ✅ UTF-8 `create_snippet` panic on multi-byte text
- ✅ `change_password` now re-encrypts all vault files
- ✅ Path traversal via `../` in vault operations (validate_path added)
- ✅ `moment()` format token ordering (longest-first) — **partially fixed, see Sprint C**
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

### Sprint C Fixes
- ✅ **`moment().format()` cascading token corruption** — Sequential `.replace()` calls caused earlier replacements to be corrupted by later ones (e.g. `format('MMMM')` for March → "March" → `replace('M', '3')` → "3arch"). Also `replace('a', 'pm')` corrupted day names like "Monday" → "Mondpmy". **Fixed with single-pass regex replacement.** CRITICAL for plugins using Templater, Daily Notes, etc.
- ✅ **Auto-save timer race on file switch** — Pending 2-second auto-save timer from file A was not cleared when switching to file B. Could cause redundant saves or confusing dirty state during async overlap. Timer now cleared in `openFile()` and `loadFileIntoLeftPane()`.
- ✅ **XSS in search error display** — Error messages were injected via `innerHTML` template literal without escaping. Now uses `textContent` via DOM API.
- ✅ **Right pane dirty indicator never shown** — Right pane set `this.rightDirty = true` but never called `tabManager.markDirty()`, so the tab's ● indicator never appeared. Also `tabManager.markClean()` was missing after right pane save. Both added.

---

## Tauri Command Audit

All 33 JS `invoke()` calls match registered Rust commands. Parameter names auto-convert (camelCase → snake_case). ✅

---

## Simulated User Workflow Results (Sprint C)

| # | Workflow | Result | Issues Found |
|---|---|---|---|
| 1 | **Onboarding** | ✅ PASS | Clean flow, skip button works, encryption setup tested |
| 2 | **Create/Edit Notes** | ✅ PASS | Auto-save, markdown preview, dirty indicators all working |
| 3 | **Full-Text Search** | ✅ PASS | XSS fixed, special chars handled, tag search works |
| 4 | **Plugin Loading** | ⚠️ WARN | Works but `read_file_absolute` overly permissive (DESIGN-2) |
| 5 | **Split Panes** | ✅ PASS | Dirty indicator now shows, save works both panes |
| 6 | **Graph View** | ✅ PASS | Force layout, zoom/pan, double-click opens note |
| 7 | **Settings** | ⚠️ WARN | Settings save correctly but tab_size/spell_check/line_height/vim_mode never applied |
| 8 | **Keyboard Shortcuts** | ✅ PASS | All shortcuts work, command palette (Ctrl+P) functional |
| 9 | **Edge Cases** | ✅ PASS | Path traversal blocked, Unicode handled, empty vault OK |
| 10 | **Performance** | ✅ PASS | Persistent 15MB search writer, 200ms render debounce, 2s auto-save |

---

## Overall Assessment

The app is solid for v0.2.0. All critical security and data-loss bugs from Sprints A-C are resolved. The `moment().format()` fix in Sprint C is particularly important — it was silently corrupting date strings for any plugin using complex format patterns (Templater, Calendar, etc.).

**Remaining priority work:**
1. **Settings that don't apply** (tab_size, spell_check, line_height, vim_mode, startup_behavior) — users see toggles that do nothing
2. **`escapeHtml` dedup** — 6 identical copies, extract to shared module
3. **Encrypted file detection** hardening (DESIGN-1)
4. **Bookmarks** feature completion (UI exists, partially works via localStorage)
5. **`moment().isBefore/isAfter`** day comparison uses unreliable string ordering
