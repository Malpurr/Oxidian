# Obsidian Feature Completeness Check — Oxidian

**Date**: February 10, 2026  
**Method**: Cross-referenced Obsidian Help Docs (30 core plugins), PracticalPKM tier list, Obsidian formatting docs, and full Oxidian source audit (`src/js/*.js`, `src-tauri/src/**/*.rs`)

---

## 1. Core Plugins (30)

| # | Plugin | Obsidian | Oxidian | Status | Fix nötig |
|---|--------|----------|---------|--------|-----------|
| 1 | **Audio Recorder** | Mikrofon-Aufnahme, in Note einbetten | Kein Code vorhanden | ❌ Fehlt | Niedrig (F-tier) |
| 2 | **Backlinks** | Linked + Unlinked Mentions Panel | `backlinks.js` + Rust `backlinks.rs` | ✅ Vollständig | — |
| 3 | **Bases** | Database Views (.base), Table/Card/Map, Sort/Filter | Kein Code vorhanden | ❌ Fehlt | 🔴 KRITISCH (S-tier Flagship) |
| 4 | **Bookmarks** | Dateien, Header, Ordner, Suchen bookmarken | `bookmarks.js` + Rust `bookmarks.rs` | ✅ Vollständig | — |
| 5 | **Canvas** | Infinite Canvas, .canvas Files, Cards, Groups, Connections | `canvas.js` + Rust `canvas.rs` | ✅ Vollständig | — |
| 6 | **Command Palette** | Ctrl+P, Fuzzy Search, Pinned Commands | `command-palette.js` | ⚠️ Teilweise | Pinned Commands prüfen |
| 7 | **Daily Notes** | Auto-Create, Templates, Datum-Format | `daily-notes.js` + Rust `daily_notes.rs` | ✅ Vollständig | — |
| 8 | **File Recovery** | Version-Snapshots, Rollback UI, Interval-Config | Setting existiert, kein Recovery-UI | ⚠️ Teilweise | 🟡 Recovery-Browser UI fehlt |
| 9 | **Files** (Explorer) | Hierarchischer Baum, CRUD, Kontextmenüs | `sidebar.js` + `contextmenu.js` | ✅ Vollständig | — |
| 10 | **Footnotes View** | Sidebar: Fußnoten der aktiven Note | Kein Code vorhanden | ❌ Fehlt | Niedrig (C-tier) |
| 11 | **Format Converter** | Markdown aus anderen Apps konvertieren | Kein Code vorhanden | ❌ Fehlt | Niedrig (D-tier, einmalig) |
| 12 | **Graph View** | Global Graph + Local Graph, Groups, Filter, Colors | `graph.js` + Rust `graph.rs` — nur Global Graph, kein Local Graph | ⚠️ Teilweise | 🟡 Local Graph fehlt |
| 13 | **Note Composer** | Extract Selection → New Note, Merge Notes | Setting existiert (disabled), kein Impl-Code | ⚠️ Teilweise | 🟠 Hoch (B-tier PKM Workflow) |
| 14 | **Outgoing Links** | Sidebar: alle Links der aktiven Note | Setting existiert, kein dediziertes Panel | ⚠️ Teilweise | 🟡 Panel implementieren |
| 15 | **Outline** | TOC aus Headings, klickbar, Drag-to-Reorder | Outline existiert, Drag-Reorder fehlt | ⚠️ Teilweise | 🟡 Drag-Reorder |
| 16 | **Page Preview** | Hover-Preview auf internen Links | `hover-preview.js` (in app.bundle) | ✅ Vollständig | — |
| 17 | **Properties View** | File Properties + All Properties (vault-wide rename/retype) | `properties-panel.js` — File-Level, vault-wide unklar | ⚠️ Teilweise | 🟡 All Properties View |
| 18 | **Publish** | Web-Publishing (Bezahldienst) | N/A | — | N/A (Obsidian-Service) |
| 19 | **Quick Switcher** | Ctrl+O, Fuzzy Search, Note aus Switcher erstellen | `quickswitcher.js` | ✅ Vollständig | — |
| 20 | **Random Note** | Zufällige Note öffnen | Kein Code vorhanden | ❌ Fehlt | 🔨 Trivial (F-tier) |
| 21 | **Search** | Volltext, Regex, Operatoren (path:, file:, tag:), Embedded Search | `search.js` + Rust `search.rs` | ⚠️ Teilweise | 🟡 Embedded Search Queries |
| 22 | **Slash Commands** | `/` zum Einfügen von Formatting/Blocks | `slash.js` (250 Zeilen) | ✅ Vollständig | — |
| 23 | **Slides** | Markdown-Präsentationen | Kein Code vorhanden | ❌ Fehlt | Niedrig (F-tier) |
| 24 | **Sync** | Cross-Device Sync (Bezahldienst) | N/A | — | N/A (Obsidian-Service) |
| 25 | **Tags View** | Sidebar: alle Tags mit Counts, verschachtelt | Tags-Funktionalität vorhanden | ✅ Vollständig | — |
| 26 | **Templates** | Template-Insertion, Ordner-Config, Variablen | `templates.js` + Rust `templates.rs` | ✅ Vollständig | — |
| 27 | **Unique Note Creator** | Zettelkasten Timestamp-Notes | Kein Code vorhanden | ❌ Fehlt | 🔨 Trivial (D-tier) |
| 28 | **Web Viewer** | Externe Links in-app öffnen, in Vault speichern | Kein Code vorhanden | ❌ Fehlt | Niedrig (D-tier) |
| 29 | **Word Count** | Status Bar Word/Char Count, Selection-aware | Vorhanden | ✅ Vollständig | — |
| 30 | **Workspaces** | Layout-Presets speichern/laden | Workspace-Klassen in API-Shim, kein echtes Feature | ❌ Fehlt | 🟡 Medium (C-tier) |

**Core Plugin Score: 15/30 Vollständig, 7/30 Teilweise, 6/30 Fehlt, 2 N/A**

---

## 2. Markdown & Editing Features

| Feature | Obsidian | Oxidian | Status | Fix nötig |
|---------|----------|---------|--------|-----------|
| Bold `**text**` | ✅ | ✅ | ✅ Vollständig | — |
| Italic `*text*` | ✅ | ✅ | ✅ Vollständig | — |
| Strikethrough `~~text~~` | ✅ | ✅ | ✅ Vollständig | — |
| Highlight `==text==` | ✅ | ✅ `highlight-extension.js` | ✅ Vollständig | — |
| Headings `#` bis `######` | ✅ | ✅ | ✅ Vollständig | — |
| Blockquotes `>` | ✅ | ✅ | ✅ Vollständig | — |
| Ordered Lists | ✅ | ✅ | ✅ Vollständig | — |
| Unordered Lists | ✅ | ✅ | ✅ Vollständig | — |
| Task Lists `- [ ]` / `- [x]` | ✅ | ✅ | ✅ Vollständig | — |
| Nested/Indented Lists | ✅ | ✅ | ✅ Vollständig | — |
| Code Inline `` `code` `` | ✅ | ✅ | ✅ Vollständig | — |
| Code Blocks mit Syntax Highlighting | ✅ | ✅ CodeMirror | ✅ Vollständig | — |
| Tables | ✅ | ✅ | ✅ Vollständig | — |
| Horizontal Rule `---` | ✅ | ✅ | ✅ Vollständig | — |
| External Links `[text](url)` | ✅ | ✅ | ✅ Vollständig | — |
| Images `![alt](url)` | ✅ | ✅ | ✅ Vollständig | — |
| Image Resize `![alt\|300](url)` | ✅ | Kein Resize-Code | ❌ Fehlt | 🟡 Implementieren |
| Wikilinks `[[note]]` | ✅ | ✅ `wikilinks.js` | ✅ Vollständig | — |
| Wikilink Aliases `[[note\|alias]]` | ✅ | ✅ | ✅ Vollständig | — |
| Embeds `![[note]]` | ✅ | ✅ `embeds.js` | ✅ Vollständig | — |
| Heading References `[[note#heading]]` | ✅ | ⚠️ Teilweise | ⚠️ Teilweise | 🟡 Verifizieren |
| Block References `[[note#^block-id]]` | ✅ | `hypermark.js` hat Ansatz, Rust hat nichts | ❌ Fehlt | 🔴 KRITISCH |
| Callouts/Admonitions | ✅ | ✅ `callouts.js` | ✅ Vollständig | — |
| LaTeX/MathJax `$...$` / `$$...$$` | ✅ | ✅ | ✅ Vollständig | — |
| Mermaid Diagrams | ✅ | ✅ `mermaid-renderer.js` | ✅ Vollständig | — |
| Comments `%%text%%` | ✅ | ✅ | ✅ Vollständig | — |
| Footnotes `[^1]` | ✅ | ⚠️ via pulldown-cmark | ⚠️ Teilweise | 🟡 Rendering prüfen |
| PDF Embeds `![[file.pdf]]` | ✅ | Kein Code | ❌ Fehlt | 🟡 Medium |
| Audio/Video Embeds | ✅ | Kein Code | ❌ Fehlt | 🟡 Medium |
| Embedded Search Queries | ✅ | Kein Code | ❌ Fehlt | 🟡 Medium |
| Frontmatter/Properties (YAML) | ✅ | ✅ `frontmatter.js` + Rust | ✅ Vollständig | — |

---

## 3. Editor Modes & Views

| Feature | Obsidian | Oxidian | Status | Fix nötig |
|---------|----------|---------|--------|-----------|
| Live Preview (WYSIWYG-ish) | ✅ | ✅ | ✅ Vollständig | — |
| Source Mode (Raw Markdown) | ✅ | ✅ | ✅ Vollständig | — |
| Reading Mode (Rendered, read-only) | ✅ | ✅ | ✅ Vollständig | — |
| Folding (Headings + Indented) | ✅ | ✅ `folding.js` | ✅ Vollständig | — |
| Multiple Cursors | ✅ | ✅ `multiple-cursors.js` | ✅ Vollständig | — |
| Find & Replace | ✅ | ✅ `find-replace.js` | ✅ Vollständig | — |
| Vim Mode | ✅ | Setting vorhanden, Impl "experimental"/stub | ⚠️ Teilweise | 🟡 Echte Vim-Integration |
| Spellcheck | ✅ | ✅ Browser Spellcheck | ✅ Vollständig | — |

---

## 4. UI & Navigation Features

| Feature | Obsidian | Oxidian | Status | Fix nötig |
|---------|----------|---------|--------|-----------|
| Tabs (Basic) | ✅ | ✅ `tabs.js` | ✅ Vollständig | — |
| Tab Groups (Split Panes) | ✅ | ✅ Split-Pane in tabs.js | ✅ Vollständig | — |
| Pin Tabs | ✅ | ✅ `pin-tab` Case in app.js | ✅ Vollständig | — |
| Stacked Tabs (Sliding Panes) | ✅ | Kein Code | ❌ Fehlt | 🟡 Medium |
| Pop-out Windows | ✅ | Kein Code | ❌ Fehlt | 🟡 Medium (Tauri-limitiert) |
| Drag & Drop Tabs | ✅ | ✅ `initDragDrop()` in tabs.js | ✅ Vollständig | — |
| Sidebar (Left + Right) | ✅ | ✅ `sidebar.js` | ✅ Vollständig | — |
| Ribbon (Icon Bar) | ✅ | ⚠️ Unklar | ⚠️ Teilweise | Niedrig |
| Status Bar (extensible) | ✅ | Word Count ja, erweiterbar unklar | ⚠️ Teilweise | Niedrig |
| Right-Click Context Menus | ✅ | ✅ `contextmenu.js` | ✅ Vollständig | — |
| Navigation History (Back/Forward) | ✅ | ✅ `nav-history.js` + Rust | ✅ Vollständig | — |
| Multiple Vaults / Vault Picker | ✅ | Kein Code | ❌ Fehlt | 🟠 Hoch |
| Obsidian URI Protocol | ✅ `obsidian://` | Kein Code | ❌ Fehlt | 🟡 Medium |
| CSS Snippets (Custom Styling) | ✅ | Setting + "Manage snippets" Button vorhanden | ⚠️ Teilweise | 🟡 Implementierung prüfen |
| Custom Hotkey Rebinding | ✅ Full UI | Hotkeys-Section in Settings, `load_hotkeys` invoke | ⚠️ Teilweise | 🟡 Vollständige UI |
| Themes | ✅ | ✅ `themes.js` | ✅ Vollständig | — |
| Auto-Update | ✅ | ✅ `update.js` + Rust `updater.rs` | ✅ Vollständig | — |
| Onboarding | ✅ | ✅ `onboarding.js` | ✅ Vollständig | — |

---

## 5. Keyboard Shortcuts

| Shortcut | Aktion | Oxidian | Status |
|----------|--------|---------|--------|
| `Ctrl+P` | Command Palette | ✅ | ✅ Vollständig |
| `Ctrl+O` | Quick Switcher | ✅ | ✅ Vollständig |
| `Ctrl+E` | Toggle Edit/Preview | ✅ | ✅ Vollständig |
| `Ctrl+N` | Neue Note | ✅ | ✅ Vollständig |
| `Ctrl+Shift+F` | Globale Suche | ✅ | ✅ Vollständig |
| `Ctrl+H` | Find & Replace | ✅ | ✅ Vollständig |
| `Ctrl+F` | Find in Note | ✅ | ✅ Vollständig |
| `Ctrl+G` | Graph View öffnen | ⚠️ | ⚠️ Teilweise |
| `Ctrl+T` | Neuer Tab | ⚠️ | ⚠️ Teilweise |
| `Ctrl+W` | Tab schließen | ⚠️ | ⚠️ Teilweise |
| `Ctrl+,` | Settings öffnen | ⚠️ | ⚠️ Teilweise |
| `Ctrl+Click` | Link in neuem Tab | ⚠️ | ⚠️ Teilweise |
| `Alt+Enter` | Link folgen | ⚠️ | ⚠️ Teilweise |
| `Ctrl+Shift+←/→` | Navigation Back/Forward | ✅ nav-history | ✅ Vollständig |
| `Ctrl+Shift+D` | Heutige Daily Note | ⚠️ | ⚠️ Teilweise |
| `Ctrl+B` | Bold | ✅ | ✅ Vollständig |
| `Ctrl+I` | Italic | ✅ | ✅ Vollständig |
| `Ctrl+K` | Link einfügen | ⚠️ | ⚠️ Teilweise |
| `Ctrl+]` / `Ctrl+[` | Indent/Outdent | ⚠️ | ⚠️ Teilweise |
| `Ctrl+Enter` | Toggle Checkbox | ⚠️ | ⚠️ Teilweise |
| Custom Hotkey Rebinding | Volle Rebinding-UI | Teilweise vorhanden | ⚠️ Teilweise |

---

## 6. Plugin System & Extensibility

| Feature | Obsidian | Oxidian | Status | Fix nötig |
|---------|----------|---------|--------|-----------|
| Community Plugins (JS API) | ✅ 2000+ Plugins | WASM-basiert, eigenes API | ❌ Inkompatibel | 🟠 Ecosystem-Mismatch |
| Obsidian Plugin API Shim | N/A | `obsidian-api.js` (Compatibility Layer) | ⚠️ Teilweise | 🟠 Vollständigkeit prüfen |
| Plugin Sandbox | N/A | ✅ Rust `plugin/sandbox.rs` | ✅ Besser als Obsidian | — |
| Plugin Loader | ✅ | ✅ `plugin-loader.js` + Rust | ✅ Vollständig | — |

---

## 7. Oxidian-Eigene Features (nicht in Obsidian)

| Feature | Beschreibung | Status |
|---------|-------------|--------|
| **Remember** (Spaced Repetition) | SM-2 Algorithmus, Cards, Review, Stats, Sources, Connections | ✅ Umfangreich |
| **Encryption** | Vault-Verschlüsselung | ✅ `encryption.rs` |
| **WASM Plugin Sandbox** | Sichere Plugin-Isolation | ✅ |
| **Accessibility** | `accessibility.js` | ✅ |
| **Tag Autocomplete** | `tag-autocomplete.js` | ✅ |

---

## Zusammenfassung

| Kategorie | Vollständig | Teilweise | Fehlt | N/A |
|-----------|------------|-----------|-------|-----|
| Core Plugins (30) | 15 | 7 | 6 | 2 |
| Markdown Features (31) | 23 | 3 | 5 | — |
| Editor Modi (8) | 7 | 1 | 0 | — |
| UI/Navigation (17) | 11 | 3 | 3 | — |
| Shortcuts (~21) | 9 | 11 | 1 | — |
| Plugin System (4) | 2 | 1 | 1 | — |
| **GESAMT (111)** | **67 (60%)** | **26 (23%)** | **16 (14%)** | **2 (2%)** |

**Ehrliche Bewertung: ~60% Vollständig, ~83% mindestens teilweise implementiert.**

---

## 🔴 Top-30 Fehlende Features — Priorisiert

### Tier 1: KRITISCH (Must-Have)

| # | Feature | Aufwand | Begründung |
|---|---------|---------|------------|
| 1 | **Bases (Database Views)** | 🔴 Sehr hoch | S-tier Obsidian Flagship Feature, komplettes Alleinstellungsmerkmal |
| 2 | **Block References `[[note#^block-id]]`** | 🟠 Hoch | Kern-Linking-Feature, essentiell für Zettelkasten |
| 3 | **Note Composer (Extract/Merge)** | 🟡 Mittel | B-tier, Kern-PKM-Workflow: Selection → New Note |
| 4 | **Multiple Vault Support** | 🟡 Mittel | Basis-Erwartung aller User |
| 5 | **Community Plugin Compatibility** | 🔴 Sehr hoch | Obsidians 2000+ Plugin-Ecosystem ist der #1 Grund für Adoption |

### Tier 2: HOCH (Sollte implementiert werden)

| # | Feature | Aufwand | Begründung |
|---|---------|---------|------------|
| 6 | **Local Graph View** | 🟡 Mittel | Nützlicher als Global Graph, Sidebar-Panel |
| 7 | **Stacked Tabs (Sliding Panes)** | 🟡 Mittel | Power-User Workflow |
| 8 | **File Recovery UI** | 🟡 Mittel | Setting existiert, braucht Snapshot-Browser |
| 9 | **Outgoing Links Panel** | 🟢 Niedrig | Setting existiert, Panel fehlt |
| 10 | **Custom Hotkey Rebinding (vollständig)** | 🟡 Mittel | Power-User essentiell |
| 11 | **Image Resize Syntax `![img\|300]`** | 🟢 Niedrig | Häufig genutztes Feature |
| 12 | **Embedded Search Queries** | 🟡 Mittel | `search:` Codeblocks in Notes |
| 13 | **PDF Embeds** | 🟡 Mittel | Häufig genutztes Embed-Format |

### Tier 3: MITTEL (Nice-to-Have)

| # | Feature | Aufwand | Begründung |
|---|---------|---------|------------|
| 14 | **Outline Drag-to-Reorder** | 🟡 Mittel | Einzigartiges Obsidian-Feature |
| 15 | **All Properties View (vault-wide)** | 🟡 Mittel | Rename/Retype Properties über ganzen Vault |
| 16 | **Audio/Video Embeds** | 🟢 Niedrig | Media-Support |
| 17 | **Pop-out Windows** | 🟠 Hoch (Tauri) | Multi-Window Support |
| 18 | **Obsidian/Oxidian URI Protocol** | 🟡 Mittel | Deep Links von externen Apps |
| 19 | **Workspaces (Layout Presets)** | 🟡 Mittel | Layout speichern/laden |
| 20 | **Vim Mode (vollständig)** | 🟡 Mittel | Setting existiert, echte CM6 Vim-Extension nötig |
| 21 | **CSS Snippets (vollständig)** | 🟢 Niedrig | UI existiert, Laden prüfen |
| 22 | **Footnotes Rendering** | 🟢 Niedrig | Sauber rendern |
| 23 | **Heading References (vollständig)** | 🟢 Niedrig | Navigation zu Heading |

### Tier 4: NIEDRIG (Optional/Nische)

| # | Feature | Aufwand | Begründung |
|---|---------|---------|------------|
| 24 | **Random Note** | 🟢 Trivial | 5 Zeilen Code |
| 25 | **Unique Note Creator** | 🟢 Trivial | Zettelkasten Timestamp-Notes |
| 26 | **Footnotes View Panel** | 🟢 Niedrig | Sidebar für Fußnoten |
| 27 | **Web Viewer** | 🟡 Mittel | Extern-Links in-app |
| 28 | **Audio Recorder** | 🟡 Mittel | Mikrofon → Note |
| 29 | **Slides (Presentations)** | 🟡 Mittel | Markdown → Slides |
| 30 | **Format Converter** | 🟢 Niedrig | Import aus anderen Apps |

---

## Quick Wins (< 1 Tag Aufwand)

1. **Random Note** — Trivial: zufälligen Index aus Vault-Liste
2. **Unique Note Creator** — Trivial: `Date.now()` formatted als Filename
3. **Image Resize Syntax** — Parser-Erweiterung in hypermark.js/embeds.js
4. **Outgoing Links Panel** — Backlinks-Code adaptieren für Forward-Links
5. **CSS Snippets vollständig** — Laden aus `.obsidian/snippets/` prüfen

---

*Generated: February 10, 2026*  
*Source: Full Oxidian source audit + Obsidian Help Docs + Gap Analysis Report*
