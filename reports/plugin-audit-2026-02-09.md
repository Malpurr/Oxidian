# Plugin Compatibility Audit — 2026-02-09

## Files Reviewed
- `src/js/obsidian-api.js` (~3500 lines, complete read)
- `src/js/plugin-loader.js` (~300 lines, complete read)
- Reference: `obsidian.d.ts` from `obsidianmd/obsidian-api` (GitHub master)

## Issues Found & Fixed

### 🔴 CRITICAL — Fixed

#### 1. `Plugin.addCommand()` ignores `editorCallback` / `editorCheckCallback`
**Problem:** Many plugins use `editorCallback` or `editorCheckCallback` to register editor-specific commands. The shim only handled `callback` and `checkCallback`. Commands with editor callbacks were registered but could never execute.

**Fix:** Added wrapper logic in `Plugin.addCommand()` that wraps `editorCallback`/`editorCheckCallback` into `checkCallback`, checking if the active view is a `MarkdownView` and passing `editor`/`view` accordingly.

#### 2. `PluginLoader._createPluginSandbox()` calls `onload()` instead of `load()`
**Problem:** Called `instance.onload()` directly, bypassing `Component.load()`. This means:
- `_loaded` flag was never set to `true`
- Child components were never loaded
- `registerEvent`/`registerDomEvent` lifecycle management was broken

**Fix:** Changed to `instance.load()`.

#### 3. `Editor.replaceSelection()` and `Editor.replaceRange()` were no-ops
**Problem:** Both methods just called `_stubWarn()` and did nothing. These are **essential** for any plugin that modifies text (templating plugins, formatters, snippet inserters, etc.).

**Fix:** Implemented full multi-line replace logic for both methods, with proper cursor positioning after `replaceSelection`.

#### 4. `MarkdownView` extended `ItemView` instead of `TextFileView`
**Problem:** Per the official API, `MarkdownView extends TextFileView`. This broke `instanceof TextFileView` checks and meant `MarkdownView` lacked `file`, `data`, `requestSave`, `getViewData`, `setViewData`, `clear`, `save` methods.

**Fix:** Changed to `class MarkdownView extends TextFileView` and added `getViewData()`, `setViewData()`, `clear()` implementations that delegate to the Editor.

### 🟡 IMPORTANT — Fixed

#### 5. Missing `Node.prototype.doc`, `.win`, `.constructorWin`
**Problem:** Obsidian's global API adds `doc`, `win`, and `constructorWin` properties to `Node.prototype`. Some plugins use `el.doc` or `el.win` for cross-window compatibility.

**Fix:** Added `Object.defineProperty` getters returning `ownerDocument`/`defaultView`.

#### 6. Missing `HTMLElement.on()`/`.off()` delegated event system
**Problem:** Obsidian's DOM extends `HTMLElement` with `.on(type, selector, listener)` for event delegation, and `.off()` to detach. Many plugins use this (e.g., for handling clicks on specific child elements). Completely missing.

**Fix:** Implemented delegated event system using `_EVENTS` storage, `closest()` for delegation, and proper cleanup on `.off()`.

#### 7. Missing `HTMLElement.trigger()`
**Problem:** Official API has `HTMLElement.trigger(eventType)` to dispatch events. Missing entirely.

**Fix:** Added implementation using `dispatchEvent(new Event(...))`.

#### 8. Missing `Document.on()`/`.off()` delegated events
**Problem:** Same delegated event pattern as HTMLElement, but for Document. Used by some plugins.

**Fix:** Implemented with same pattern.

#### 9. Missing `SVGElement.setCssStyles()`/`.setCssProps()`
**Problem:** Official API extends SVGElement with these methods. Missing entirely.

**Fix:** Added both methods.

#### 10. Missing `HTMLElement.innerWidth`/`.innerHeight` (without padding)
**Problem:** Official API adds readonly `innerWidth`/`innerHeight` properties that return element width/height minus padding. Missing.

**Fix:** Added via `Object.defineProperty` with computed style calculation.

#### 11. `Node.prototype.detach`/`.empty` were on `Element.prototype` instead of `Node.prototype`
**Problem:** Official API puts `detach()` and `empty()` on `Node.prototype`, not `Element.prototype`. Some plugins call these on non-Element nodes (e.g., DocumentFragment).

**Fix:** Moved to `Node.prototype`.

#### 12. Missing `Array.prototype.findLastIndex` polyfill
**Problem:** Official API declares `findLastIndex` on Array (since 1.4.4). While modern browsers have it natively, it should be ensured.

**Fix:** Added polyfill.

### ⚠️ DOM Extensions Safety — VERIFIED ✅
DOM prototype overrides (`installDomExtensions()`) are properly guarded:
- Defined as a function, NOT auto-executed on import
- Called explicitly from `PluginLoader.init()` before any plugins load
- All extensions use `if (!X.prototype.method)` guards to avoid double-install
- Comment at bottom of file confirms: "Do NOT auto-install"

### 📋 Working Correctly (Verified)

| Feature | Status | Notes |
|---------|--------|-------|
| Plugin Settings Tabs | ✅ Works | `PluginSettingTab` → `addSettingTab()` → registry. `Setting` class with all UI components (Text, Toggle, Dropdown, Slider, Button, Color, Search, MomentFormat, ExtraButton, ProgressBar) properly creates DOM. |
| Command Registration | ✅ Works (after fix) | `addCommand()` now handles all 4 callback types. Registry stores/executes properly. |
| Event System (on/off/trigger) | ✅ Works | `Events` class has proper `on`, `off`, `offref`, `trigger`, `tryTrigger`. Context binding works. EventRef cleanup in Component.unload works. |
| Workspace.getActiveFile() | ✅ Works | Returns `_activeFile`, set via `setActiveFile()` which is wired from PluginLoader. |
| MarkdownView / Editor API | ✅ Works (after fix) | Editor has getValue/setValue, getLine/setLine, getCursor/setCursor, getSelection, replaceSelection, replaceRange, posToOffset/offsetToPos, getRange, transaction, getDoc. |
| Vault.read() / Vault.modify() | ✅ Works | Both delegate to Tauri `invoke`, update caches, fire events properly. `cachedRead`, `create`, `rename`, `delete`, `trash`, `process`, `append` all functional. |
| Notice | ✅ Works | Creates DOM, auto-removes with timeout, supports fragments. |
| Modal / SuggestModal / FuzzySuggestModal | ✅ Works | Full keyboard navigation, fuzzy search, click outside to close. |
| Menu / MenuItem | ✅ Works | Context menus with icons, separators, submenus, auto-close. |
| Plugin loadData/saveData | ✅ Works | JSON serialization via Tauri invoke. |
| moment() stub | ✅ Adequate | Covers format, add/subtract, diff, startOf/endOf, isSame/isBefore/isAfter, duration. Static methods (now, unix, duration, locale, isMoment). |
| requestUrl / request | ✅ Works | Uses fetch API. |
| Icon system | ✅ Works | Built-in Lucide icons, addIcon/getIcon/setIcon/getIconIds. |
| normalizePath / debounce / YAML | ✅ Works | parseYaml/stringifyYaml handle common cases. |

### 🔵 Known Stubs (Low Priority)

These are stubbed with warnings and won't crash plugins, but won't do anything:
- `FileSystemAdapter.mkdir`, `trashSystem`, `trashLocal`, `rmdir` — need Tauri backend
- `Vault.createFolder` — needs Tauri backend for real folder creation
- `Editor.focus`, `blur`, `scrollTo`, `scrollIntoView`, `undo`, `redo`, `exec` — need CodeMirror integration
- `Plugin.registerCodeMirror`, `registerEditorSuggest`, `registerObsidianProtocolHandler` — advanced features
- `Workspace.openLinkText`, `changeLayout`, `getLayout` — need deep integration

### 📊 Summary

| Category | Found | Fixed | Remaining Stubs |
|----------|-------|-------|-----------------|
| Critical bugs | 4 | 4 | 0 |
| Important missing APIs | 8 | 8 | 0 |
| Low-priority stubs | ~15 | 0 | ~15 |

**Overall assessment:** After fixes, the plugin API shim should support the vast majority of community plugins that use standard APIs (settings, commands, vault read/write, editor manipulation, UI components). The main gaps are in advanced CodeMirror integration and some filesystem operations.
