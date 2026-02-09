# Oxidian — User Test Report

**Tester:** Demanding End-User Simulation  
**Date:** 2026-02-09  
**Version:** Source review + static analysis  
**Goal:** Evaluate if Oxidian can replace Obsidian for daily use

---

## Workflow 1: First Launch & Onboarding

**Verdict: ⚠️ PARTIAL**

### What Works
- 4-step wizard: Welcome → Vault Setup → Encryption → Tour — well-structured
- Progress dots show current step clearly
- "Create New Vault" pre-fills default path (`~/.oxidian/vault/`)
- "Open Existing Vault" with Browse button
- Encryption setup with password confirmation + Argon2id/AES-256-GCM — solid crypto
- Tour page gives useful feature overview
- `is_first_launch` correctly checks for settings file existence

### What's Broken
- **No Cancel/Skip button on the onboarding overlay** — User cannot dismiss the wizard to just explore the app. The overlay covers everything and only the "Get Started" / step buttons can advance. If a user doesn't want to configure anything, they're stuck.
  - **File:** `src/js/onboarding.js` — `renderWelcome()` has no skip/close action
  - **Fix:** Add a "Skip Setup" link or × close button

- **Browse button depends on `window.__TAURI__.dialog`** — If the Tauri dialog plugin isn't properly initialized, clicking Browse silently fails with no user feedback (caught by empty catch block).
  - **File:** `src/js/onboarding.js`, line ~95 (`try { const { open } = window.__TAURI__.dialog || {}; ...`)
  - **Fix:** Show error message if dialog API unavailable

- **"Open Existing Vault" path input stays readonly** — User cannot type a path manually; they must use Browse. On Linux, native file dialogs can be flaky.
  - **File:** `src/js/onboarding.js` — `<input type="text" id="ob-vault-path" readonly>`
  - **Fix:** Remove `readonly` attribute

### What's Confusing
- "Create New Vault" vs "Open Existing Vault" both end up at the same path picker UI — the flow doesn't differentiate clearly after selection
- No mention of what encryption actually means for the user's workflow (will they need to enter password every launch?)

### Suggested Fix
Add a close/skip button to the onboarding overlay. Remove `readonly` from vault path input. Add error feedback for Browse failures.

---

## Workflow 2: Daily Note-Taking

**Verdict: ⚠️ PARTIAL**

### What Works
- Ctrl+D creates daily note at `daily/YYYY-MM-DD.md` with nice template (Journal, Tasks, Notes sections)
- Calendar icon in ribbon sidebar also triggers daily note
- Welcome screen has "Open Today's Daily Note" button
- Markdown rendering: headings, lists, bold, italic, code blocks, tables, footnotes, strikethrough, tasklists all work via pulldown-cmark
- Wiki-links `[[like this]]` render as clickable links in preview with syntax `[[target|display text]]`
- Wiki-link clicks call `window.navigateToNote()` which creates the note if it doesn't exist — good Obsidian-like behavior
- Tags `#tag` render as clickable pills in preview, clicking searches by tag
- Tags collected from all vault files and displayed in sidebar
- Status bar shows word count, character count, cursor position — nice touch
- Auto-continue lists (bullets, numbers, checkboxes) on Enter — great UX
- Editor supports Tab/Shift+Tab for indentation

### What's Broken
- **❌ NO AUTO-SAVE — DATA LOSS RISK** — Content is only saved on:
  1. Explicit Ctrl+S
  2. Textarea blur event (clicking away from editor)
  3. Before opening another file
  
  If the app crashes while typing, or if the user closes the window without clicking away, **all unsaved content is lost**. This is the #1 critical issue.
  - **File:** `src/js/editor.js`, line ~30 — `blur` handler calls `saveCurrentFile()`
  - **File:** `src/js/app.js` — `markDirty()` only sets a flag, never triggers a timed save
  - **Fix:** Add debounced auto-save (e.g., 2 seconds after last keystroke)

- **Preview scroll sync is approximate** — Uses simple ratio-based sync which doesn't account for different content heights (images, code blocks, tables expand in preview but not in textarea)
  - **File:** `src/js/editor.js`, `syncScroll()` method
  - Not critical but noticeable

- **Heading cycle (Ctrl+H) wraps at H4 instead of H6** — Code checks `headingMatch[1].length >= 4` to remove heading, but H5 and H6 are skipped
  - **File:** `src/js/editor.js`, `cycleHeading()` method, line `if (headingMatch[1].length >= 4)`
  - **Fix:** Change to `>= 6`

### What's Confusing
- No visual indicator that the file is unsaved besides a tiny yellow dot on the tab — easy to miss
- No "unsaved changes" warning when closing the app window

### Suggested Fix
Implement debounced auto-save. Fix heading cycle limit. Add window close warning.

---

## Workflow 3: File Management

**Verdict: ⚠️ PARTIAL**

### What Works
- Create new note via Ctrl+N or sidebar button — dialog with name input, auto-appends `.md`
- Create folder via sidebar button — uses `prompt()` dialog
- Rename via right-click context menu — inline rename with input field, good UX
- Delete via right-click — with confirmation dialog
- Duplicate note — creates "filename copy.md", opens it immediately
- Copy path via right-click — copies relative path to clipboard
- Sidebar tree auto-refreshes after operations
- File tree sorts folders before files, alphabetically
- Sidebar resize handle works for adjusting width
- Folder expand/collapse with chevron animation
- Auto-expand parent folders when a file is activated

### What's Broken
- **❌ No file MOVE functionality** — Cannot drag files between folders, no "Move to..." option in context menu. This is a basic file management feature.
  - **File:** `src/js/contextmenu.js` — `showFileMenu()` doesn't include a Move option
  - **File:** `src-tauri/src/commands.rs` / `vault.rs` — No move_file command exists (only rename, which could be used for moves)
  - **Fix:** Add "Move to Folder" context menu item using the existing `rename_file` backend command

- **Copy Path copies relative path, not absolute** — `navigator.clipboard.writeText(filePath)` writes relative paths like `notes/test.md` instead of the full vault path. Users typically expect absolute paths when copying.
  - **File:** `src/js/contextmenu.js`, Copy Path action
  - **Fix:** Prepend vault path, or offer both options

- **Create Folder uses browser `prompt()`** — Looks terrible in a desktop app, breaks the design language. Every other dialog uses custom UI.
  - **File:** `src/js/app.js`, `createNewFolder()` method
  - **Fix:** Create a proper dialog like the new note dialog

- **Rename doesn't update open tabs** — If you rename a file that's open in a tab, the tab title and path update via `this.currentFile = newPath`, but the tab object in `TabManager.tabs` still has the old path. Subsequent saves could fail.
  - **File:** `src/js/app.js`, `startRename()` finish handler updates `this.currentFile` but doesn't update `this.tabManager.tabs`
  - **Fix:** Add `tabManager.updateTabPath(oldPath, newPath)` method

- **Delete doesn't handle deleting folders** — `delete_note` in `vault.rs` uses `fs::remove_file()` which won't delete directories. Context menu shows Delete for folders but it'll error.
  - **File:** `src-tauri/src/vault.rs`, `delete_note()` function
  - **Fix:** Check if path is directory and use `fs::remove_dir_all()`

### What's Confusing
- No drag-and-drop reordering or moving in the file tree
- Right-click on a folder shows "Delete" but folders may contain files — no warning about recursive delete

### Suggested Fix
Add move functionality. Fix rename tab sync. Implement folder deletion. Replace `prompt()` with custom dialog.

---

## Workflow 4: Split Panes

**Verdict: ⚠️ PARTIAL**

### What Works
- "Open in New Pane" context menu option creates split layout
- Split handle for resizing panes
- Drag tabs between left/right panes via drop overlay zones
- Tab management tracks which pane each tab belongs to
- Auto-unsplit when right pane has no more tabs
- Middle-click closes tabs

### What's Broken
- **❌ Right pane edits are NEVER SAVED** — The right pane textarea has an `input` listener that only renders markdown preview. There's no dirty tracking, no save mechanism, no integration with the app's save system. Any edits made in the right pane are silently lost.
  - **File:** `src/js/app.js`, `createSplitLayout()` — right pane textarea handler only calls `invoke('render_markdown', ...)`, never `save_note`
  - **Fix:** Create a second Editor instance for the right pane, or share the same save infrastructure

- **Right pane has no backlinks section** — Only the left pane's editor wrapper includes `.backlinks-section`
  - **File:** `src/js/app.js`, `createSplitLayout()` — right pane HTML template missing backlinks

- **Graph view in split pane doesn't coexist well** — Opening graph replaces pane content and sets pane class to `graph-pane`, but if you then switch to a note tab in the same pane, the graph canvas isn't cleaned up (the pane class isn't reset)
  - **File:** `src/js/app.js`, `showGraphPane()` — sets `paneEl.className = 'pane graph-pane'` but `ensureEditorPane()` doesn't reset this class

### What's Confusing
- No visual indicator that you can drag tabs to split — the drop overlay only appears during drag
- Can't open the same note in both panes for reference

### Suggested Fix
Implement full editor functionality for the right pane. Clean up graph pane state transitions.

---

## Workflow 5: Search

**Verdict: ⚠️ PARTIAL**

### What Works
- Full-text search powered by Tantivy — fast and capable
- Search results show title, file path, and content snippet with context
- Click result to open the file
- Ctrl+Shift+F focuses search panel
- Debounced search input (250ms) — good UX
- Enter key opens first result
- Escape clears search

### What's Broken
- **❌ Tag search crashes Tantivy** — When clicking a tag pill or using `searchByTag()`, the query `#tagname` is passed directly to Tantivy's `QueryParser.parse_query()`. The `#` character is not a valid Tantivy query syntax character and will cause a parse error, returning "Search error" to the user.
  - **File:** `src/js/app.js`, `searchByTag()` sends `#${tag}` → `src/js/search.js` → `invoke('search_notes', { query })` → `src-tauri/src/search.rs`, `QueryParser::parse_query(query_str)` 
  - **Fix:** Strip `#` prefix before sending to search, or escape it, or use a dedicated tag search command

- **Search index writer is extremely expensive** — Every single note save creates a new `IndexWriter` with a 50MB memory arena (`self.index.writer(50_000_000)`). For rapid saves (auto-save every 2 seconds), this creates and destroys massive allocations constantly. Could cause memory pressure and lock contention.
  - **File:** `src-tauri/src/search.rs`, `index_note()` method
  - **Fix:** Keep a persistent writer in AppState, or use a much smaller buffer for single-doc updates

- **Search doesn't highlight matching terms in snippets** — Snippets are plain text, making it hard to see where the match occurred

### What's Confusing
- Minimum 2 characters to trigger search — some single-character searches might be useful
- No indication of total result count

### Suggested Fix
Escape/strip `#` in tag queries. Optimize index writer allocation. Add match highlighting.

---

## Workflow 6: Graph View

**Verdict: ✅ PASS (with minor issues)**

### What Works
- Canvas-based force-directed graph with repulsion, attraction, center pull
- Nodes sized by connection count (radius increases)
- Smooth animation with 300 iterations of simulation
- Zoom (scroll wheel), pan (click-drag background), drag individual nodes
- Hover shows cursor change and highlighted node
- Double-click node navigates to the note
- ResizeObserver handles container resizing
- Labels displayed below nodes
- Edge colors match theme accent

### What's Broken
- **Graph doesn't update in real-time** — Adding a new wiki-link to a note and switching to graph view shows stale data until the graph tab is closed and reopened. The graph loads data once on construction.
  - **File:** `src/js/graph.js`, `load()` only called in constructor
  - **Fix:** Add a refresh method or reload data when graph tab is activated

- **Single-click on node does nothing** — Only double-click navigates. Users expect single-click navigation like in Obsidian's graph.
  - **File:** `src/js/graph.js` — `onDblClick` exists but no `onClick` navigation
  - Minor UX preference

- **Graph performance with large vaults** — O(n²) repulsion calculation in `simulateStep()`. With 500+ notes, this could be sluggish. No level-of-detail or culling.
  - **File:** `src/js/graph.js`, `simulateStep()` nested loop
  - Not critical for small vaults

### What's Confusing
- No legend or controls on the graph view
- No way to filter/search within the graph

### Suggested Fix
Add graph data refresh on tab activation. Consider single-click navigation.

---

## Workflow 7: Plugins

**Verdict: ⚠️ PARTIAL**

### What Works
- Obsidian-compatible plugin API (`obsidian-api.js`) is remarkably comprehensive:
  - `Plugin`, `App`, `Vault`, `Workspace`, `TFile`, `TFolder` classes
  - `Notice`, `Modal`, `FuzzySuggestModal`, `SuggestModal`, `Menu`, `MenuItem` UI components
  - `Setting`, `PluginSettingTab` for plugin settings
  - `MarkdownRenderer`, `Component`, `Events` base classes
  - DOM extensions (`createEl`, `createDiv`, `empty`, `detach`, `addClass`, etc.)
  - `moment()` stub, `requestUrl()`, `htmlToMarkdown()`, icon system with Lucide icons
  - `Platform` detection object
  - `Keymap`, `Scope` utilities
  - `EditorSuggest`, `ItemView` base classes
- Plugin sandboxing via `new Function()` with `require('obsidian')` → API shim
- Plugin enable/disable persisted in `.obsidian/community-plugins.json`
- Plugin data persistence via `loadData()`/`saveData()` → `data.json`
- Plugin styles loaded from `styles.css`
- Command palette (Ctrl+P) integrates plugin commands
- Ribbon icons from plugins rendered correctly
- Status bar items from plugins supported
- Settings page has plugin toggle with version/author info
- Install plugin from folder with manifest validation

### What's Broken
- **`vault.getName()` has circular reference potential** — The method tries `this._app?.vault?.adapter?.getBasePath?.()` which references itself. In practice it works because `_vaultName` is set by the constructor's async call, but if called before that resolves, it could return 'Oxidian Vault' incorrectly.
  - **File:** `src/js/obsidian-api.js`, `Vault.getName()` method

- **`moment()` stub is very limited** — Only supports basic format tokens. Many plugins use `moment().locale()`, `moment.duration()`, `moment().diff()`, etc. which will crash.
  - **File:** `src/js/obsidian-api.js`, `moment()` function
  - **Fix:** Bundle the actual moment.js library, or implement more methods

- **`MetadataCache` is mostly empty** — `getFileCache()` always returns null since `_cache` is never populated. Plugins that rely on metadata cache (most non-trivial ones) will get null results.
  - **File:** `src/js/obsidian-api.js`, `MetadataCache` class
  - **Fix:** Populate cache when files are loaded/saved

- **`registerEditorExtension` is a no-op** — Plugins that rely on CodeMirror extensions (many do) will silently fail
  - **File:** `src/js/obsidian-api.js`, `Plugin.registerEditorExtension()` — comment says "stub"

### Plugin Compatibility: obsidian-vault-name (gapmiss)
- This plugin calls `this.app.vault.getName()` — **SUPPORTED** ✅
- It uses `addStatusBarItem()` — **SUPPORTED** ✅
- It uses `Plugin.onload()/onunload()` — **SUPPORTED** ✅
- It may use `this.app.workspace.on('layout-change', ...)` — **SUPPORTED** (Events system) ✅
- **Verdict: Should work**

### What's Confusing
- Two plugin systems (legacy WASM `.oxidian/plugins/` and Obsidian-compatible `.obsidian/plugins/`) — confusing for users
- No plugin marketplace or download mechanism built in

### Suggested Fix
Improve `moment()` stub. Populate MetadataCache. Consider dropping legacy WASM plugin system for simplicity.

---

## Workflow 8: Settings

**Verdict: ✅ PASS**

### What Works
- Settings opens as a tab (Ctrl+, or ribbon icon) — modern UX
- Sidebar navigation: General, Editor, Appearance, Vault, Plugins
- Live preview for font size, line height, UI font size, accent color, font family
- Theme grid with visual previews for Dark, Light, Nord, Solarized
- Custom themes loadable from `.oxidian/themes/*.css`
- Encryption toggle with password setup
- Change Password with old/new/confirm flow and re-encryption of all vault files
- Auto-backup toggle
- Spell check toggle
- Vim mode toggle (experimental)
- Startup behavior (Welcome/Last Session/Daily Note)
- Language selector (EN/DE/FR)
- All settings auto-saved with 500ms debounce
- Settings persist to `.oxidian/settings.json`
- Settings applied on app startup via `applySettings()`

### What's Broken
- **Vault path "Browse" button same issue as onboarding** — depends on Tauri dialog API, fails silently
- **Language/startup behavior settings not actually implemented** — The values are saved but never read/used by the app
  - **File:** `src/js/app.js` — `applySettings()` only applies theme, accent_color, font_size, font_family, and interface_font_size. No startup behavior or language switching.
- **Vim mode toggle does nothing** — Saved but never read
  - No Vim keybinding implementation exists

### What's Confusing
- Settings show "Vim Mode (experimental)" but it's completely non-functional — misleading

### Suggested Fix
Implement startup behavior. Add i18n system for language. Either implement Vim mode or remove the toggle.

---

## Workflow 9: Keyboard Shortcuts

**Verdict: ✅ PASS (with one fix needed)**

### What Works
- **Ctrl+N** — New note dialog ✅
- **Ctrl+S** — Save current file ✅
- **Ctrl+P** — Command palette with fuzzy search, keyboard navigation ✅
- **Ctrl+B** — Bold (**text**) ✅
- **Ctrl+I** — Italic (*text*) ✅
- **Ctrl+D** — Daily note ✅
- **Ctrl+E** — Toggle preview pane visibility ✅
- **Ctrl+Shift+F** — Focus search panel ✅
- **Ctrl+W** — Close active tab ✅
- **Ctrl+,** — Open settings ✅
- **Ctrl+`** — Inline code ✅
- **Ctrl+Shift+X** — Strikethrough ✅
- **Ctrl+Shift+K** — Code block ✅
- **Ctrl+H** — Cycle heading level ✅
- **/** — Slash commands menu ✅
- **Escape** — Close dialogs, palette, context menu, slash menu ✅
- **Tab/Shift+Tab** — Indent/outdent ✅
- **Enter** — Auto-continue lists ✅

### What's Broken
- **Ctrl+K creates wiki-link `[[]]` instead of markdown link** — In Obsidian, Ctrl+K inserts a markdown link `[text](url)`. Users switching from Obsidian will be confused.
  - **File:** `src/js/editor.js`, `handleEditorKeys()` — `if (ctrl && !e.shiftKey && e.key === 'k')` wraps with `[[`, `]]`
  - **Fix:** Change Ctrl+K to insert `[text](url)` and add Ctrl+[[ for wiki-links (or use Ctrl+Shift+L)

### What's Confusing
- Welcome screen shows Ctrl+P shortcut for command palette but no explanation of what the command palette is

### Suggested Fix
Fix Ctrl+K behavior to match Obsidian convention.

---

## Workflow 10: Edge Cases

**Verdict: ⚠️ PARTIAL**

### What Works
- **Empty vault** — Sidebar shows "Vault is empty" message with icon, welcome screen displays correctly ✅
- **Unicode content** — Rust's String is UTF-8 native, JavaScript handles Unicode well. German umlauts (ÄÖÜ), Japanese (日本語), emoji (🎉) in note content will work ✅
- **Path traversal protection** — `validate_path()` in `vault.rs` checks for `..` and ensures paths stay within vault ✅
- **Hidden files filtered** — `.hidden` files and `.search_index` directory excluded from file tree ✅

### What's Broken
- **❌ Special characters in filenames may cause issues** — No filename sanitization exists. A user creating a note named `my/note` or `note<>:` will cause OS-level file creation errors that propagate as generic error messages.
  - **File:** `src-tauri/src/vault.rs`, `save_note()` — accepts any path string, no sanitization
  - **Fix:** Sanitize filenames (strip `/\:*?"<>|`, replace with underscores)

- **❌ Multiple rapid saves cause index writer contention** — `index_note()` creates a new 50MB `IndexWriter` for each save. Tantivy writers hold a lock on the index directory. Rapid saves (typing fast with auto-save) could cause "Failed to create index writer" errors when the previous writer hasn't finished committing.
  - **File:** `src-tauri/src/search.rs`, `index_note()` method
  - **Fix:** Use a single persistent writer or queue saves

- **Very long notes (1000+ lines)** — The textarea-based editor has no virtualization. All content is in a single `<textarea>` element. For very long notes, the markdown preview re-render (200ms debounce) will process the entire document each time. With a 10,000-line note, this could cause noticeable lag.
  - Not critical for typical use, but Obsidian handles this better with CodeMirror 6

- **No Tauri window close handler** — The app doesn't intercept the window close event to save dirty files. `beforeunload` equivalent isn't set up.
  - **File:** `src/js/app.js` — no `window.addEventListener('beforeunload', ...)` or Tauri close handler

### Suggested Fix
Add filename sanitization. Optimize search index writer. Add window close save handler.

---

## Overall Usability Ratings

| Category | Score | Notes |
|----------|-------|-------|
| **First Impression** | 8/10 | Beautiful Obsidian-like dark theme, clean layout, professional feel. Onboarding wizard is welcoming. |
| **Daily Usability** | 5/10 | The lack of auto-save is a dealbreaker. Right pane data loss is dangerous. Tag search is broken. These prevent daily use. |
| **Feature Completeness vs Obsidian** | 6/10 | Core features present: editor, preview, wiki-links, tags, graph, search, themes, plugins. Missing: file moving, canvas, WYSIWYG mode, link autocomplete, templates, sync. |
| **Performance Expectations** | 7/10 | Rust/Tauri backend should be fast. Tantivy search is excellent. But textarea editor will struggle with large files, and index writer allocation is wasteful. |
| **Plugin Compatibility** | 7/10 | Impressively comprehensive Obsidian API shim. Simple plugins will work. Complex ones needing CodeMirror, full MetadataCache, or advanced moment.js will fail. |
| **Overall Recommendation** | 6/10 | A promising Obsidian alternative with solid architecture. Fix the critical data loss bugs and it becomes genuinely usable. |

---

## Critical Fixes Applied

### Fix 1: Auto-Save with Debounce (DATA LOSS PREVENTION)
**File:** `src/js/app.js`  
Added a 2-second debounced auto-save that triggers after each edit. Also added `beforeunload` handler.

### Fix 2: Right Pane Save Integration
**File:** `src/js/app.js`  
Right pane textarea input now tracks dirty state and triggers saves for `rightFile`.

### Fix 3: Tag Search Query Escaping
**File:** `src-tauri/src/search.rs`  
Strip `#` from search queries before passing to Tantivy.

### Fix 4: Rename Updates Tab Path
**File:** `src/js/app.js`  
After rename, update the tab entry's path and title in TabManager.

### Fix 5: Heading Cycle Limit
**File:** `src/js/editor.js`  
Changed heading cycle threshold from 4 to 6 so all heading levels are reachable.

### Fix 6: Filename Sanitization
**File:** `src-tauri/src/vault.rs`  
Added `sanitize_filename()` to strip dangerous characters from filenames.

### Fix 7: Ctrl+K → Markdown Link (not wiki-link)
**File:** `src/js/editor.js`  
Changed Ctrl+K to insert `[text](url)`. Ctrl+Shift+K now does code block (unchanged).

### Fix 8: Onboarding Vault Path Editable
**File:** `src/js/onboarding.js`  
Removed `readonly` from vault path input so users can type paths manually.

### Fix 9: Window Close Save Handler
**File:** `src/js/app.js`  
Added `beforeunload` event handler to save dirty files before closing.

### Fix 10: Folder Deletion Support
**File:** `src-tauri/src/vault.rs`  
`delete_note` now checks if path is a directory and uses `remove_dir_all` accordingly.

---

*Report generated by automated code review and static analysis.*
