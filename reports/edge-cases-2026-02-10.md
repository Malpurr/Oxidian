# Edge Cases Audit — 2026-02-10

## 1. Lange Dateinamen (200+ Zeichen)

### Status: ✅ Mostly handled, **4 fixes applied**

**Already OK:**
- `.tree-item` — had `overflow: hidden; text-overflow: ellipsis` (missing `white-space: nowrap` though)
- `.tab .tab-title` — had `overflow: hidden; text-overflow: ellipsis` + `max-width: 200px` on `.tab`

**Fixed:**
1. **`.tree-item .name`** — Added `white-space: nowrap; min-width: 0` (was missing, ellipsis wouldn't trigger without nowrap)
2. **`.command-palette-name`** — Added `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0`
3. **`.command-palette-item`** — Added `min-width: 0; overflow: hidden` (flex child needs min-width: 0 for ellipsis)
4. **`.wikilink-item-name` + `.wikilink-item-path`** — Added `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`

## 2. Leerer Vault

### Status: ✅ Handled

- **Sidebar**: Shows "Vault is empty" placeholder when `nodes.length === 0` ✅
- **Quick Switcher**: Shows "No matching notes" when empty ✅
- **Wikilinks popup**: Shows "No notes found" when empty ✅
- **Backend `build_file_tree`**: Returns empty `vec![]` if root doesn't exist ✅
- **Graph View**: Would show empty graph (no nodes/edges) — acceptable

## 3. Viele Dateien (1000+)

### Status: ⚠️ No virtualization, but mitigated

- **Sidebar**: Renders full DOM tree. For 1000+ files this means 1000+ DOM nodes. **Not virtualized.**
  - Mitigation: Only `.md` files shown, folders collapse children
- **Quick Switcher**: `.slice(0, 50)` limits rendered results ✅
- **Wikilinks popup**: `.slice(0, 10)` limits rendered results ✅
- **Graph View**: All nodes loaded into D3 force simulation — could be slow with 1000+ nodes

**Recommendation**: For sidebar, consider lazy-loading collapsed folders (only render children when opened). Full virtualization (e.g., virtual scroll) would be a bigger refactor.

## 4. Sonderzeichen (Umlaute, Emojis, Klammern, Leerzeichen)

### Status: ✅ Works

- **Wiki-Links regex**: `\[\[([^\]]+)\]\]` — matches any character except `]`, so umlauts (ä,ö,ü), emojis, spaces, parentheses all work ✅
- **`sanitize_filename`** in vault.rs: Preserves Unicode (ä,ö,ü, emojis). Only strips `< > : " / \ | ? *` and control chars ✅
- **Backlink matching**: Compares by `file_stem` string — works with any Unicode ✅
- **HTML escaping**: All modules use `escapeHtml()` via `textContent` → safe against XSS from special chars ✅

**Minor note**: Emojis in filenames work on macOS/Linux but may cause issues on Windows (NTFS). Not an app-level problem.

## 5. Fehlende Ordner (Cards/, Sources/)

### Status: ✅ Handled

- **`save_note`** creates parent directories via `fs::create_dir_all(parent)` ✅
- **`build_file_tree`** returns empty vec if root doesn't exist ✅
- **`create_daily_note`** creates `daily/` folder if missing ✅
- **`setup_vault`** creates vault root + `daily/` ✅

The app won't crash on missing folders. Notes saved to non-existent paths auto-create the directory structure.

## 6. Concurrent Saves

### Status: ✅ Handled

- **Save queue**: `_saveQueue` array + `_processSaveQueue()` serializes saves ✅
- **Debounced auto-save**: `clearTimeout(this._autoSaveTimer)` prevents burst saves ✅
- **Optimistic UI**: `isDirty` set to false immediately, re-set on error ✅
- **Backend**: Rust `save_note` is synchronous file write (atomic per call) ✅

**Minor risk**: Multiple `save_note` calls for different files from right pane (line 599) bypass the queue and call `invoke('save_note')` directly. Low risk since split pane saves are less frequent.

## 7. Responsive (800px, 1024px, 1920px)

### Status: ✅ Adequate

- **768px breakpoint**: Adjusts sidebar width, theme grid ✅
- **Sidebar**: `min-width: 200px; max-width: 400px` constrains ✅
- **1200px+**: Wider editor padding ✅
- **1400px+**: Wider modals ✅
- **Quick Switcher preview**: Hidden below 640px ✅
- **Tabs**: `max-width: 200px; min-width: 80px` with `flex-shrink: 0` — works but tab bar can overflow. `overflow: hidden` on tab container handles this ✅

**No 800px-specific breakpoint** exists, but the 768px breakpoint covers it. Layout works at all three target widths.

---

## Summary of Changes Made

| File | Change |
|------|--------|
| `src/css/style.css` | `.tree-item .name`: added `white-space: nowrap; min-width: 0` |
| `src/css/style.css` | `.command-palette-name`: added ellipsis overflow handling |
| `src/css/style.css` | `.command-palette-item`: added `min-width: 0; overflow: hidden` |
| `src/css/obsidian-features.css` | `.wikilink-item-name` + `.wikilink-item-path`: added ellipsis overflow |

## Remaining Recommendations (Non-Critical)

1. **Sidebar virtualization** for 1000+ file vaults (significant effort)
2. **Graph view** node limit or level-of-detail for large vaults
3. **Right pane saves** should go through the save queue
