# Obsidian vs Oxidian — Gap Analysis Report

**Date**: February 10, 2026  
**Sources**: Obsidian Help Docs, PracticalPKM Core Plugin Tier List (all 30 core plugins), Wikipedia, Oxidian source code audit  
**Video**: "Master Obsidian in 2.5 Hours" (DOy4dTLBHBQ) — transcript not extractable, analysis based on comprehensive docs  
**Method**: Cross-referenced all 30 Obsidian core plugins + non-plugin features against Oxidian `/src/js/` files and Rust backend

---

## Executive Summary

The existing FEATURE-CHECKLIST.md claims "100% parity" with 20 features. **This is misleading.** Obsidian has **30 core plugins** plus significant non-plugin features. Oxidian is missing **~12 core plugins entirely** and has **partial implementations** for several others. The claimed "20 features" conflate some plugins and omit many.

---

## Complete Obsidian Feature Inventory

### A. Core Plugins (30 total in Obsidian v1.11.x)

| # | Plugin | Obsidian Beschreibung | Oxidian Status | Gap Severity |
|---|--------|----------------------|----------------|-------------|
| 1 | **Audio Recorder** | Record audio via microphone, embed in note | ❌ **MISSING** | Low — F-tier in Obsidian |
| 2 | **Backlinks** | Linked/unlinked mentions panel in sidebar | ✅ Implemented | — |
| 3 | **Bases** | Database-like views (.base files), table/card/map views, sort/filter by properties | ❌ **MISSING** | 🔴 **CRITICAL** — S-tier, Obsidian's flagship new feature |
| 4 | **Bookmarks** | Bookmark files, headers, folders, searches, blocks; folder groups | ✅ Implemented | — |
| 5 | **Canvas** | Infinite canvas, .canvas files, text/file/link cards, groups, connections | ✅ Implemented | — |
| 6 | **Command Palette** | Ctrl+P, fuzzy search, pinned commands, recent-first ordering | ✅ Implemented | ⚠️ Minor: pinned commands feature unclear |
| 7 | **Daily Notes** | Auto-create daily note, template, date format config | ✅ Implemented | — |
| 8 | **File Recovery** | Version history snapshots, rollback, configurable interval/retention | ⚠️ **PARTIAL** — setting exists but no actual recovery UI | 🟡 Medium |
| 9 | **Files** (File Explorer) | Hierarchical tree view, CRUD, context menus | ✅ Implemented | — |
| 10 | **Footnotes View** | Sidebar view of footnotes for active note | ❌ **MISSING** | Low — C-tier |
| 11 | **Format Converter** | Convert imported markdown from other apps | ❌ **MISSING** | Low — D-tier, one-time use |
| 12 | **Graph View** | Global graph + **Local Graph**, groups, colors, filters | ⚠️ **PARTIAL** — global graph exists, **Local Graph unclear** | 🟡 Medium |
| 13 | **Note Composer** | Extract selection → new note, merge notes, link/embed result | ⚠️ **PARTIAL** — setting exists (`note_composer: false` default!), no dedicated implementation file | 🟠 High — B-tier, core PKM workflow |
| 14 | **Outgoing Links** | Sidebar panel showing all links from active note | ⚠️ **PARTIAL** — setting reference exists, no dedicated panel | 🟡 Medium |
| 15 | **Outline** | TOC from headings, clickable, **drag to reorder sections** | ✅ Implemented | ⚠️ Drag-to-reorder sections likely missing |
| 16 | **Page Preview** | Hover preview on internal links (with Cmd modifier option) | ✅ `hover-preview.js` exists | — |
| 17 | **Properties View** | Sidebar: File properties + All Properties (rename/retype across vault) | ⚠️ **PARTIAL** — `properties-panel.js` exists, **All Properties vault-wide view unclear** | 🟡 Medium |
| 18 | **Publish** | Publish notes to web (paid service) | ❌ **MISSING** (not applicable for clone) | N/A — paid Obsidian service |
| 19 | **Quick Switcher** | Ctrl+O, fuzzy file search, create note from switcher | ✅ Implemented | — |
| 20 | **Random Note** | Open random note from vault | ❌ **MISSING** | Low — F-tier |
| 21 | **Search** | Full-text, regex, operators (path:, file:, tag:), **embedded search queries** | ✅ Implemented | ⚠️ Embedded search queries in notes unclear |
| 22 | **Slash Commands** | Type `/` to insert formatting/blocks | ✅ `slash.js` (250 lines) | — |
| 23 | **Slides** | Markdown presentations | ❌ **MISSING** | Low — F-tier |
| 24 | **Sync** | Cross-device sync (paid service) | ❌ **MISSING** (not applicable) | N/A — paid Obsidian service |
| 25 | **Tags View** | Sidebar: all tags with counts, nested, click to search | ✅ Implemented | — |
| 26 | **Templates** | Template insertion, folder config, variables | ✅ Implemented | — |
| 27 | **Unique Note Creator** | Zettelkasten-style timestamp-named notes | ❌ **MISSING** | Low — D-tier |
| 28 | **Web Viewer** | Open external links in Obsidian, save to vault | ❌ **MISSING** | Low — D-tier |
| 29 | **Word Count** | Status bar word/char count, selection-aware | ✅ Implemented | — |
| 30 | **Workspaces** | Save/load layout presets (open tabs, sidebar state) | ❌ **MISSING** | 🟡 Medium — C-tier but useful |

### B. Non-Plugin Core Features

| Feature | Obsidian | Oxidian Status | Gap |
|---------|----------|---------------|-----|
| **Live Preview mode** | WYSIWYG-ish markdown editing | ✅ | — |
| **Source mode** | Raw markdown | ✅ | — |
| **Reading mode** | Rendered, non-editable | ✅ | — |
| **Tab management** | Multiple tabs, tab groups, pin tabs, move to new window | ⚠️ Tabs exist, **tab groups/pin/new window missing** | 🟠 High |
| **Stacked tabs** | Open notes in sliding panes | ❌ **MISSING** | 🟡 Medium |
| **Obsidian URI protocol** | `obsidian://` deep links to vaults/notes/actions | ❌ **MISSING** | 🟡 Medium |
| **Vim key bindings** | Optional Vim mode in editor | ❌ **MISSING** (no evidence in source) | 🟡 Medium |
| **Custom hotkey binding** | Rebind any command to any key | ⚠️ Unclear if user-configurable | 🟡 Medium |
| **CSS Snippets** | Custom CSS files for styling | ❌ **MISSING** | 🟡 Medium |
| **Community plugins API** | Load third-party JS plugins | ⚠️ WASM plugin system exists, **not Obsidian JS API compatible** | 🟠 High (ecosystem) |
| **Mobile app** | iOS + Android | ❌ Desktop only (Tauri) | 🔴 Long-term critical |
| **Pop-out windows** | Detach tabs into separate windows | ❌ **MISSING** | 🟡 Medium |
| **Drag & drop tabs** | Between panes and windows | ⚠️ Partial | 🟡 Medium |
| **Ribbon** (left sidebar icons) | Customizable icon bar for quick actions | ⚠️ Unclear | Low |
| **Status bar** | Bottom bar with word count, plugins can add items | ⚠️ Word count exists, extensible status bar unclear | Low |
| **Right-click context menus** (rich) | File explorer, editor, tabs all have context menus | ⚠️ `contextmenu.js` exists | — |
| **Multiple vaults** | Switch between vaults, vault picker | ❌ **MISSING** | 🟠 High |
| **Vault migration/import** | Importer plugin for Notion, Evernote, etc. | ❌ **MISSING** | 🟡 Medium |
| **Spellcheck** | Built-in spellcheck | ❌ Unclear | Low |
| **Find & Replace** | In-note Ctrl+H | ✅ `find-replace.js` | — |
| **Folding** | Fold headings and indented content | ✅ `folding.js` | — |
| **Mermaid diagrams** | Render mermaid code blocks | ✅ `mermaid-renderer.js` | — |
| **Multiple cursors** | Multi-cursor editing | ✅ `multiple-cursors.js` | — |
| **Auto-update** | In-app update mechanism | ✅ `update.js` | — |
| **Onboarding** | New user walkthrough | ✅ `onboarding.js` | — |

### C. Markdown/Editing Features

| Feature | Obsidian | Oxidian |
|---------|----------|---------|
| Wikilinks `[[]]` | ✅ | ✅ |
| Embeds `![[]]` | ✅ | ✅ |
| Aliases `[[note\|alias]]` | ✅ | ✅ |
| Block references `[[note#^block]]` | ✅ | ❌ **MISSING** — 🟠 High |
| Heading references `[[note#heading]]` | ✅ | ⚠️ Likely partial |
| Callouts (admonitions) | ✅ | ✅ |
| LaTeX/MathJax | ✅ | ✅ |
| Highlight `==text==` | ✅ | ✅ |
| Comments `%%text%%` | ✅ | ✅ |
| Footnotes `[^1]` | ✅ | ⚠️ Rendering likely via pulldown-cmark |
| Tables | ✅ | ✅ |
| Task lists `- [ ]` / `- [x]` | ✅ | ✅ |
| Nested/indented lists | ✅ | ✅ |
| Code blocks with syntax highlighting | ✅ | ✅ (CodeMirror) |
| Image embeds (resize `![alt\|300]`) | ✅ | ⚠️ Resize syntax unclear |
| PDF embeds | ✅ | ❌ **MISSING** |
| Audio/Video embeds | ✅ | ❌ **MISSING** |
| Dataview-style inline fields | Community plugin | N/A |

### D. Keyboard Shortcuts (Obsidian Defaults)

| Shortcut | Action | Oxidian |
|----------|--------|---------|
| `Ctrl+P` | Command Palette | ✅ |
| `Ctrl+O` | Quick Switcher | ✅ |
| `Ctrl+E` | Toggle Edit/Preview | ✅ |
| `Ctrl+N` | New note | ✅ |
| `Ctrl+Shift+F` | Global search | ✅ |
| `Ctrl+H` | Find & Replace | ✅ |
| `Ctrl+F` | Find in note | ✅ |
| `Ctrl+G` | Open Graph view | ⚠️ |
| `Ctrl+T` | New tab | ⚠️ (may be used for templates) |
| `Ctrl+W` | Close tab | ⚠️ |
| `Ctrl+,` | Settings | ⚠️ |
| `Ctrl+Click` | Open link in new tab | ⚠️ |
| `Alt+Enter` | Follow link under cursor | ⚠️ |
| `Ctrl+Shift+Left/Right` | Navigate back/forward | ⚠️ `nav-history.js` exists |
| `Ctrl+Shift+D` | Open today's daily note | ⚠️ |
| `Ctrl+Shift+I` | Dev tools | N/A (Tauri) |
| Custom hotkey rebinding | Full rebinding UI in settings | ❌ **MISSING** |

---

## 🔴 Critical Gaps (Must Fix)

### 1. **Bases** (Database Views) — COMPLETELY MISSING
- Obsidian's flagship feature since late 2024
- .base file format with table, card, map views
- Sort, filter, group notes by properties
- Replaces community Dataview plugin
- **Impact**: Major competitive gap, S-tier plugin

### 2. **Block References** (`[[note#^block-id]]`) — MISSING
- Core Obsidian linking feature
- Essential for Zettelkasten and granular linking
- Required for Note Composer to work properly
- **Impact**: Limits linking granularity

### 3. **Multiple Vaults** — MISSING
- Users expect to manage multiple vaults
- Vault picker on startup
- **Impact**: Limits multi-project workflows

### 4. **Tab Groups / Pin Tabs / Stacked Tabs** — MISSING
- Obsidian's tab system is significantly more advanced
- Tab groups, pinning, stacking, pop-out windows
- **Impact**: Power user workflows limited

---

## 🟠 High Priority Gaps

### 5. **Note Composer** — NOT FUNCTIONAL
- Setting exists but disabled by default, no implementation
- Extract selection → new note (with auto-link)
- Merge notes
- **Critical for atomic note-taking workflow**

### 6. **Local Graph View** — UNCLEAR
- Obsidian has both Global Graph AND Local Graph (active note's connections)
- Local Graph is arguably more useful than Global
- Needs sidebar panel integration

### 7. **Community Plugin Compatibility**
- Oxidian uses WASM plugins, Obsidian uses JS plugins
- Obsidian has 2000+ community plugins
- Complete ecosystem mismatch
- **The "Obsidian plugin compatibility layer" claim needs verification**

---

## 🟡 Medium Priority Gaps

| # | Feature | Notes |
|---|---------|-------|
| 8 | **File Recovery UI** | Setting exists but no actual snapshot browser/restore UI |
| 9 | **Workspaces** | Save/load layout presets |
| 10 | **Outgoing Links panel** | Sidebar view of forward links |
| 11 | **Properties View — All Properties** | Vault-wide property manager (rename/retype) |
| 12 | **Obsidian URI protocol** | `obsidian://` deep links |
| 13 | **Vim mode** | Optional Vim keybindings |
| 14 | **CSS Snippets** | User custom CSS loading |
| 15 | **Custom hotkey rebinding** | Full rebinding UI |
| 16 | **Stacked tabs** | Sliding panes |
| 17 | **Pop-out windows** | Detach tabs |
| 18 | **Embedded search queries** | `search:` code blocks in notes |
| 19 | **Image resize syntax** | `![[img.png|300]]` |
| 20 | **PDF/Audio/Video embeds** | Media file rendering |

---

## ✅ Low Priority / N/A Gaps

| Feature | Reason |
|---------|--------|
| Audio Recorder | F-tier, rarely used |
| Random Note | F-tier, rarely used |
| Slides | F-tier, bad presentations |
| Format Converter | D-tier, one-time use |
| Unique Note Creator | D-tier, niche Zettelkasten |
| Web Viewer | D-tier, recent addition |
| Footnotes View | C-tier, writer-specific |
| Publish | Paid Obsidian service, N/A |
| Sync | Paid Obsidian service, N/A |
| Mobile | Different platform entirely |

---

## Outline Drag-to-Reorder

Obsidian's Outline plugin allows **dragging headers to reorder entire sections** in the note. This is a unique and powerful feature that Oxidian's outline likely doesn't support.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Obsidian Core Plugins | 30 |
| Oxidian Fully Implemented | ~16 |
| Oxidian Partially Implemented | ~6 |
| Completely Missing (excluding N/A) | ~8 |
| **True Parity** | **~53%** (not 100% as claimed) |

### Non-Plugin Features
| Category | Count |
|----------|-------|
| Non-plugin features checked | 25 |
| Implemented | ~15 |
| Missing/Partial | ~10 |

---

## Recommendations (Priority Order)

1. **🔴 Implement Bases** — This is Obsidian's biggest new feature and complete differentiator
2. **🔴 Implement Block References** — Core linking feature missing
3. **🟠 Implement Note Composer** — Extract/merge notes workflow
4. **🟠 Fix Multiple Vault support** — Users expect this
5. **🟠 Add Local Graph** — More useful than global graph
6. **🟠 Advanced Tab Management** — Tab groups, pin, stack, pop-out
7. **🟡 File Recovery UI** — Actual snapshot browser
8. **🟡 Workspaces** — Layout presets
9. **🟡 Custom Hotkey Rebinding** — Power user essential
10. **🟡 CSS Snippets** — Theming flexibility

---

## Correcting the Record

The FEATURE-CHECKLIST.md claiming "✅ COMPLETE - All 20 core features implemented" and "OXIDIAN HAS ACHIEVED COMPLETE OBSIDIAN PARITY" is **inaccurate**:

- Obsidian has **30** core plugins, not 20
- **Bases** (S-tier, Obsidian's flagship) is completely missing
- **Note Composer** exists only as a disabled setting
- **File Recovery** has no UI
- Several "Excellent" ratings are unverifiable
- Block references, a core Obsidian linking feature, are missing
- Advanced tab management features are missing
- Multiple vault support is missing

**Honest assessment: Oxidian has ~53-60% of Obsidian's core functionality implemented, with strong basics but significant gaps in advanced features.**

---

*Generated: February 10, 2026*
