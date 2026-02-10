# Deep Test Report: Settings — All Sections
**Date:** 2026-02-10  
**Tester:** Subagent deep-settings  
**Scope:** Every Settings section, every option — code analysis + screenshot verification  

---

## Executive Summary

| Section | UI Renders | Values Load | Save Works | Apply Works | Bugs Found |
|---------|-----------|-------------|------------|-------------|------------|
| General | ✅ | ✅ | ⚠️ | ⚠️ | 2 |
| Editor | ✅ | ⚠️ | ⚠️ | ⚠️ | 4 |
| Files & Links | ✅ | 🔴 | 🔴 | ⚠️ | 3 |
| Appearance | ✅ | ✅ | ✅ | ⚠️ | 2 |
| Hotkeys | ✅ | 🔴 | ⚠️ | 🔴 | 4 |
| Core Plugins | ✅ | 🔴 | ⚠️ | ⚠️ | 3 |
| Community Plugins | ✅ | ⚠️ | ⚠️ | 🔴 | 3 |
| About | ✅ | ⚠️ | N/A | N/A | 2 |

**Total Bugs: 23** (7 critical, 9 medium, 7 low)

---

## 🔴 CRITICAL: Frontend ↔ Backend Schema Mismatch

The **#1 issue** across all sections: The JS frontend (`settings.js`) and the Rust backend (`settings.rs`) use **different data structures**.

### Frontend (JS) expects:
```
settings.general.check_for_updates
settings.general.auto_update
settings.general.developer_mode
settings.files_links.* (flat object with ~9 fields)
settings.core_plugins.file_explorer (16 boolean fields)
settings.community_plugins.safe_mode / enabled_plugins / plugin_updates
settings.about.version / license / credits
settings.hotkeys (object)
```

### Backend (Rust) has:
```
settings.general (vault_path, language, startup_behavior, auto_save, auto_save_interval)
settings.files (deleted_files_behavior, attachment_folder, new_file_location)  
settings.plugins (enabled_plugins: Vec<String>, plugin_settings: HashMap)
settings.vault (encryption_enabled, auto_backup, auto_pair_brackets, ...)
settings.update (auto_check, check_interval)
settings.remember (daily_review_reminder, cards_per_session, ...)
— NO about section
— NO core_plugins section
— NO community_plugins section
— NO hotkeys section
— NO files_links section (it's just "files")
```

**Impact:** When `invoke('save_settings')` sends the frontend's `settings` object to Rust, fields that don't exist in the Rust struct are **silently dropped**. On reload, those settings revert to defaults. This affects ~60% of all settings options.

---

## Section-by-Section Analysis

### 1. General

| Option | UI | Load | Save | Apply | Status |
|--------|-----|------|------|-------|--------|
| Vault Path | ✅ text + Browse | ✅ | ✅ | ✅ | OK |
| Language | ✅ dropdown (6 langs) | ✅ | ✅ | 🔴 No i18n system | **BUG-G1** |
| Startup Behavior | ✅ dropdown (4 options) | ✅ | ✅ | ⚠️ Not verified | OK |
| Check for Updates | ✅ checkbox | ⚠️ | 🔴 | 🔴 | **BUG-G2** |
| Auto Update | ✅ checkbox | ⚠️ | 🔴 | 🔴 | **BUG-G2** |
| Developer Mode | ✅ checkbox | ⚠️ | 🔴 | 🔴 | **BUG-G2** |

**BUG-G1 (Medium):** Language dropdown renders but no i18n/localization system exists. Changing language has no effect on UI text.

**BUG-G2 (Critical):** `check_for_updates`, `auto_update`, and `developer_mode` exist only in JS fallback defaults. The Rust `GeneralSettings` struct has NO corresponding fields. These are saved to Rust but silently dropped on deserialization. On reload → back to defaults.

**Screenshot confirms:** Vault path shows `/root/.oxidian/vault`, Browse button present, Language shows "English", Startup shows "Show welcome screen". All render correctly.

---

### 2. Editor

| Option | UI | Load | Save | Apply | Status |
|--------|-----|------|------|-------|--------|
| Font Family | ✅ text input | ✅ | ⚠️ | ✅ CSS var | OK |
| Font Size | ✅ slider 10-36 | ✅ | ⚠️ | ✅ CSS var | OK |
| Line Height | ✅ slider 1.0-2.5 | ⚠️ | ⚠️ | ✅ CSS var | **BUG-E1** |
| Show Line Numbers | ✅ checkbox | ⚠️ | ⚠️ | ✅ | **BUG-E2** |
| Readable Line Length | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |
| Max Line Width | ✅ number (conditional) | ⚠️ | 🔴 | — | **BUG-E3** |
| Tab Size | ✅ dropdown 2/4/8 | ✅ | ✅ | ⚠️ | OK |
| Default Edit Mode | ✅ dropdown | ⚠️ | 🔴 | — | **BUG-E3** |
| Strict Line Breaks | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |
| Smart Indent | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |
| Auto-pair Brackets | ✅ checkbox | ✅* | ✅* | — | *via vault.auto_pair_brackets |
| Auto-pair Markdown | ✅ checkbox | ✅* | ✅* | — | *via vault.auto_pair_markdown |
| Spell Check | ✅ checkbox | ✅ | ✅ | ⚠️ | OK |
| Vim Mode | ✅ checkbox | ✅ | ✅ | ⚠️ | OK |
| Show Frontmatter | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |
| Fold Heading | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |
| Fold Indent | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-E3** |

**BUG-E1 (Low):** Rust default `line_height = 1.7`, JS fallback `line_height = 1.6`. Mismatch on first load when backend returns 1.7 but slider was coded with 1.6 as default comment.

**BUG-E2 (Medium):** JS uses `show_line_numbers`, Rust uses `line_numbers`. Field name mismatch → value won't round-trip correctly through serde unless the Rust struct has `#[serde(alias)]`.

**BUG-E3 (Critical):** The following editor fields have **NO Rust backend equivalent**: `readable_line_length`, `max_line_width`, `default_edit_mode`, `strict_line_breaks`, `smart_indent`, `show_frontmatter`, `fold_heading`, `fold_indent`. They exist only in the JS fallback. Saving sends them to Rust where they're ignored.

**BUG-E4 (Medium):** Slider value display bug — `fontSizeValue` selector is `#editor-font-size + .slider-container .slider-value` but the `.slider-value` is a **sibling of the range input**, not a child of a next sibling. The `+` combinator targets the wrong element. The value label won't update on drag. Same issue for line-height slider.

**Screenshot confirms:** Font family shows "JetBrains Mono, Fira Code", Font size slider at 15px, Line height at 1.7, Line numbers checkbox **unchecked** (despite default being `true` — indicates possible load issue).

---

### 3. Files & Links

| Option | UI | Load | Save | Apply | Status |
|--------|-----|------|------|-------|--------|
| Default Note Location | ✅ dropdown | 🔴 | 🔴 | — | **BUG-F1** |
| New Note Folder | ✅ conditional text | ⚠️ | 🔴 | — | **BUG-F1** |
| New Link Format | ✅ dropdown | ⚠️ | 🔴 | — | **BUG-F1** |
| Use Wikilinks | ✅ checkbox (inverted) | ⚠️ | 🔴 | — | **BUG-F1** |
| Auto-update Links | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-F1** |
| Detect All Extensions | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-F1** |
| Attachment Folder | ✅ text input | ✅ | ✅ | — | OK |
| Always Update Links | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-F1** |
| Confirm File Deletion | ✅ checkbox | ⚠️ | 🔴 | — | **BUG-F1** |

**BUG-F1 (Critical):** JS uses `settings.files_links` with 9 fields. Rust has `settings.files` with only 3 fields (`deleted_files_behavior`, `attachment_folder`, `new_file_location`). 6 of 9 options have no backend storage.

**BUG-F2 (Medium):** The default-location dropdown `selected` logic has a JS evaluation bug:
```js
${s.default_note_location || s.new_file_location || 'vault_root' === 'vault_root' ? 'selected' : ''}
```
Due to operator precedence, `'vault_root' === 'vault_root'` evaluates first to `true`, so `s.default_note_location || s.new_file_location || true` is always truthy → **ALL three options get `selected`**. The browser picks the last one. This means "Vault folder" is never correctly pre-selected unless it's the only option.

**BUG-F3 (Low):** The fallback in `renderFilesLinksSection` tries both `this.settings.files_links` and `this.settings.files`, but the property names differ (`default_note_location` vs `new_file_location`), causing inconsistent behavior depending on which path is taken.

---

### 4. Appearance

| Option | UI | Load | Save | Apply | Status |
|--------|-----|------|------|-------|--------|
| Theme (Dark/Light/System) | ✅ visual selector | ✅ | ✅ | ✅ via themeManager | OK |
| Accent Color | ✅ color picker + 8 presets | ✅ | ✅ | ✅ via themeManager | OK |
| Interface Font | ✅ dropdown (5 options) | ⚠️ | 🔴 | 🔴 | **BUG-A1** |
| Interface Font Size | ✅ slider 10-18 | ✅ | ✅ | ✅ root fontSize | OK |
| Zoom Level | ✅ slider 75%-200% | ✅ | ✅ | ✅ body.style.zoom | OK |
| Translucent Window | ✅ checkbox | ⚠️ | 🔴 | 🔴 | **BUG-A2** |
| Native Menus | ✅ checkbox | ⚠️ | 🔴 | 🔴 | **BUG-A2** |
| CSS Snippets | ✅ checkbox + Manage button | ⚠️ | 🔴 | 🔴 | **BUG-A2** |

**BUG-A1 (Medium):** `interface_font` exists in JS but NOT in Rust's `AppearanceSettings`. Also, selecting a font doesn't apply it — no CSS variable update in `bindAppearanceEvents`.

**BUG-A2 (Low):** `translucent`, `native_menus`, `custom_css`, `show_inline_title`, `show_tab_title_bar` — none exist in Rust backend. Only `theme`, `accent_color`, `interface_font_size`, `show_status_bar`, `show_line_numbers` are in the Rust struct.

**Screenshot confirms:** Theme selector shows Dark/Light/System with visual previews. Accent color picker with 8 presets. Interface font dropdown. All render beautifully.

---

### 5. Hotkeys

| Feature | Status | Issue |
|---------|--------|-------|
| Search bar | ✅ Renders | **BUG-H1**: `filterHotkeys()` is empty stub |
| Command list | 🔴 Empty | **BUG-H2** |
| Edit button | ✅ Renders | **BUG-H3**: `editHotkey()` is console.log only |
| Remove button | ✅ Renders | ⚠️ Works in memory, save untested |
| Hotkey recording | 🔴 Missing | **BUG-H4** |

**BUG-H1 (Medium):** `filterHotkeys(query)` method body is empty. Search does nothing.

**BUG-H2 (Critical):** Screenshot shows **completely empty hotkeys list** — only the search bar. The `load_hotkeys` and `get_available_commands` Tauri commands likely don't exist in the backend (no corresponding Rust handlers found in settings.rs). The JS fallback `defaultCommands` list has 22 commands, but they only load if `invoke('get_available_commands')` fails AND the catch block reaches the fallback. The `loadCommands` catch logs a warning but the `availableCommands` map stays empty because it's initialized before the try block but the default population only happens inside try.

Wait — re-reading: the default commands ARE inside the try block after the catch. Actually no: the defaults are used as fallback `(commands.length > 0 ? commands : defaultCommands)`. If `invoke` throws, the catch runs and returns, so defaultCommands are never set. **The availableCommands Map stays empty → no hotkeys render.**

**BUG-H3 (Low):** `editHotkey()` only does `console.log`. No recording dialog exists.

**BUG-H4 (Medium):** No hotkey recording UI exists at all. Users can't actually set hotkeys.

**Screenshot confirms:** Hotkeys section shows only "Search hotkeys..." input. The list below is completely empty.

---

### 6. Core Plugins

| Feature | Status | Issue |
|---------|--------|-------|
| Plugin list | 🔴 Wrong data | **BUG-CP1** |
| Toggle checkboxes | ✅ Render | ⚠️ |
| Plugin descriptions | 🔴 Wrong | **BUG-CP2** |
| Save state | ⚠️ | **BUG-CP3** |

**BUG-CP1 (Critical):** The JS code does `this.settings.core_plugins || this.settings.plugins`. When backend returns data, `settings.plugins` is `{ enabled_plugins: [], plugin_settings: {} }`. The `Object.entries()` iterates over `enabled_plugins` (an array) and `plugin_settings` (an object), not boolean toggles. Screenshot confirms: shows **"enabled_plugins"** and **"plugin_settings"** as plugin names with generic "Core plugin functionality." description instead of the 16 expected plugins (file_explorer, search, etc.).

**BUG-CP2 (Medium):** Because the plugin IDs are `enabled_plugins` and `plugin_settings` (the Rust field names), `getCorePluginInfo()` returns the fallback `{ name: pluginId, description: 'Core plugin functionality.' }` for both.

**BUG-CP3 (Medium):** `invoke('toggle_core_plugin')` is called but likely no corresponding Rust command exists.

**Screenshot confirms:** Shows only 2 items: "enabled_plugins" and "plugin_settings" — both checked, both with generic descriptions. This is completely broken.

---

### 7. Community Plugins

| Feature | Status | Issue |
|---------|--------|-------|
| Safe Mode toggle | ✅ | ⚠️ Inverted logic correct |
| Browse button | ✅ Renders | **BUG-COM1** |
| Install from folder | ✅ Renders | **BUG-COM1** |
| Reload plugins | ✅ Renders | **BUG-COM1** |
| Plugin updates checkbox | ✅ | 🔴 **BUG-COM2** |
| Installed plugins list | ✅ Empty state | OK |

**BUG-COM1 (Medium):** All three buttons (`showPluginBrowser`, `installPluginFromFolder`, `reloadPlugins`) are empty stubs. No functionality.

**BUG-COM2 (Critical):** JS reads `settings.community_plugins.plugin_updates` but Rust has no such field. The checkbox state won't persist.

**BUG-COM3 (Low):** Screenshot shows "Check for plugin updates" checkbox is **unchecked** even though JS default is `plugin_updates: true`. Indicates the backend returned data without this field → defaulted to `false`.

**Screenshot confirms:** Safe mode toggle on, 3 action buttons visible, plugin updates unchecked, empty plugin list with 🧩 icon.

---

### 8. About

| Feature | Status | Issue |
|---------|--------|-------|
| App icon + name | ✅ | OK |
| Version | ✅ Shows "2.2.0" | **BUG-AB1** |
| License | ✅ "MIT" | OK |
| Built with | ✅ "Built with Tauri & Rust" | OK |
| Platform info | 🔴 "Loading..." | **BUG-AB2** |
| Architecture info | 🔴 "Loading..." | **BUG-AB2** |
| Vault path | ✅ | OK |
| GitHub link | ✅ Button | ⚠️ Points to placeholder URL |
| Docs link | ✅ Button | ⚠️ Points to placeholder URL |
| Community link | ✅ Button | ⚠️ Points to placeholder URL |

**BUG-AB1 (Low):** Rust backend has NO `about` section. Version "2.2.0" comes from JS hardcoded fallback `{ version: "2.2.0" }`, while the `settings` fallback says "1.2.0". Inconsistency — the `renderAboutSection` overrides with "2.2.0".

**BUG-AB2 (Medium):** Platform and Architecture permanently show "Loading...". `invoke('get_platform_info')` likely has no backend handler. The `loadSystemInfo` is only called when `initializeSection('about')` runs, but `initializeSection` is only called for the **initially active section** (general). Navigating to About doesn't trigger it.

**Screenshot confirms:** Version 2.2.0, License MIT, Platform "Loading...", Architecture "Loading...".

---

## Bug Priority Summary

### 🔴 Critical (7)
| ID | Section | Description |
|----|---------|-------------|
| SCHEMA | All | Frontend/Backend schema mismatch — ~60% of settings don't persist |
| BUG-G2 | General | check_for_updates, auto_update, developer_mode not in Rust |
| BUG-E3 | Editor | 8 editor options have no Rust backend fields |
| BUG-F1 | Files | 6 of 9 Files & Links options not in Rust |
| BUG-H2 | Hotkeys | Hotkey list empty — commands never load (catch swallows fallback) |
| BUG-CP1 | Core Plugins | Shows Rust field names instead of actual plugins |
| BUG-COM2 | Community | plugin_updates field not in Rust |

### 🟡 Medium (9)
| ID | Section | Description |
|----|---------|-------------|
| BUG-G1 | General | Language dropdown non-functional (no i18n) |
| BUG-E2 | Editor | `show_line_numbers` vs `line_numbers` field name mismatch |
| BUG-E4 | Editor | Slider value label CSS selector broken — won't update |
| BUG-F2 | Files | Dropdown `selected` logic operator precedence bug |
| BUG-H1 | Hotkeys | Search filter is empty stub |
| BUG-H4 | Hotkeys | No hotkey recording UI |
| BUG-A1 | Appearance | interface_font not in Rust, no apply logic |
| BUG-CP2 | Core Plugins | Wrong descriptions (fallback for unknown IDs) |
| BUG-AB2 | About | Platform/Arch stuck on "Loading..." |

### 🟢 Low (7)
| ID | Section | Description |
|----|---------|-------------|
| BUG-E1 | Editor | line_height default mismatch (1.7 vs 1.6) |
| BUG-F3 | Files | Inconsistent fallback property names |
| BUG-A2 | Appearance | translucent, native_menus, custom_css not in Rust |
| BUG-H3 | Hotkeys | editHotkey() is console.log only |
| BUG-CP3 | Core Plugins | toggle_core_plugin command likely missing |
| BUG-COM1 | Community | All 3 action buttons are stubs |
| BUG-COM3 | Community | plugin_updates shows unchecked despite true default |
| BUG-AB1 | About | Version inconsistency (1.2.0 vs 2.2.0 in different places) |

---

## Recommended Fix Priority

### Phase 1: Fix the Schema (blocks everything)
1. **Align Rust `Settings` struct with JS expectations** — add missing fields to Rust structs OR restructure JS to match Rust
2. Specifically: add `files_links`, `core_plugins`, `community_plugins`, `about`, `hotkeys` sections to Rust
3. Or: refactor JS to use `settings.files`, `settings.plugins`, `settings.vault` etc.

### Phase 2: Fix Broken Features
4. Fix Core Plugins rendering — iterate over a known plugin list, not `Object.entries(settings.plugins)`
5. Fix Hotkeys — move `defaultCommands` into `loadCommands` catch block, or initialize outside try
6. Fix `initializeSection` — call it on every section switch, not just initial
7. Fix slider value label selectors
8. Fix Files & Links dropdown `selected` operator precedence

### Phase 3: Implement Stubs
9. Implement `filterHotkeys`, `editHotkey` (recording dialog), hotkey persistence
10. Implement community plugin browser/install/reload
11. Implement language/i18n system
12. Add `get_platform_info` Rust command
