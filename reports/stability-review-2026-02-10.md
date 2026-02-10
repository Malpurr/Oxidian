# Stability Review — 2026-02-10

**Reviewer:** Studio Lead (Stability Sprint)  
**Version:** v1.3.5  
**Problem:** Marcel reported buttons/files not working. 9 untested modules (3152 LOC) were added by a previous agent.

---

## 🔴 Critical Bugs Found & Fixed

### 1. Missing closing brace in ribbon button handler (app.js)
**Impact:** SYNTAX-LEVEL BUG — the `if (ribbonButtons)` block was never properly closed due to mismatched braces and bad indentation. This caused all subsequent button bindings to be swallowed inside the if-block, and potentially caused a parse error depending on the JS engine's tolerance. **This is likely the root cause of Marcel's "buttons not working" report.**

**Fix:** Corrected brace structure and indentation in the ribbon button forEach/addEventListener block.

### 2. No error isolation for new modules (app.js `init()`)
**Impact:** If ANY of the 9 new modules threw during construction, the entire `init()` method would abort — no sidebar, no editor, no tabs, nothing. Complete app death.

**Fix:** Wrapped every new module constructor in `safeInitModule()` with individual try/catch. A failing module now logs an error and returns null instead of crashing the app.

### 3. Wikilinks `loadAllNotes()` — wrong data structure (wikilinks.js)
**Impact:** `invoke('list_files')` returns a **tree** (nodes with `children`), but the code treated it as a flat array with `.filter()`. Result: wikilink autocomplete always empty, no `[[` suggestions ever worked.

**Fix:** Added tree-walking function to flatten the file tree before filtering.

---

## 🟡 Modules Disabled

### 4. Folding module — DISABLED (folding.js)
**Reason:** The folding implementation is **destructive**. It literally replaces textarea content with fold markers like `⋯ 5 lines hidden ⋯`. If the user saves while folded, **real content is permanently lost**. The unfold logic also has offset tracking bugs in `updateTextarea()` that would corrupt content.

**Action:** Module disabled (constructor commented out), keyboard shortcuts disabled. Needs complete rewrite using CodeMirror decorations or a non-destructive overlay approach before re-enabling.

---

## 🟢 Modules Reviewed — Acceptable

| Module | Status | Notes |
|--------|--------|-------|
| **live-preview.js** | ✅ Stable | Not actively used (HyperMark handles live preview). Safe as-is. |
| **wikilinks.js** | ✅ Fixed | Tree-walking fix applied. Logic is sound. |
| **tag-autocomplete.js** | ✅ Stable | Clean implementation, proper popup lifecycle. |
| **drag-drop.js** | ✅ Stable | Good null checks, proper event handling. |
| **multiple-cursors.js** | ⚠️ Acceptable | Offset math in multi-edit mode is fragile but clears after each edit. Low risk since feature is rarely used. |
| **properties-panel.js** | ⚠️ Acceptable | Basic YAML parser won't handle nested/array values. OK for simple frontmatter. |
| **hover-preview.js** | ✅ Stable | Good caching, proper cleanup in destroy(). |
| **canvas.js** | ⚠️ Fixed | Added keydown listener cleanup on destroy. Continuous render loop is wasteful but not a crash risk. |

---

## 🔧 Additional Hardening Applied

### 5. Per-feature try/catch in `attachObsidianFeatures()` (app.js)
Previously had a single try/catch around all feature attachments. Now each feature attachment is individually wrapped — one failure won't prevent others from loading.

### 6. Canvas document-level event listener cleanup (canvas.js)
The canvas module added a `keydown` listener to `document` but never removed it on destroy. Fixed: stored bound handler reference and remove in `destroy()`.

---

## Summary

| Category | Count |
|----------|-------|
| Critical bugs fixed | 3 |
| Modules disabled | 1 (folding) |
| Modules stable | 5 |
| Modules acceptable with caveats | 3 |
| New features added | 0 |

**Root cause of Marcel's bug:** Mismatched braces in ribbon button handler (issue #1), compounded by no error isolation for new modules (issue #2).

**Recommendation:** Build and test v1.3.6 with these fixes before any new feature work.
