# 🔴 Critical QA Report — Oxidian Studio
**Date:** 2026-02-09  
**QA Lead:** BREAKER  
**Scope:** Full application audit — all 15 test areas  
**Status:** 7 bugs found, 7 bugs fixed

---

## Executive Summary

Die App hat eine solide Architektur, aber **7 Bugs** haben die Nutzererfahrung beeinträchtigt. Alle wurden direkt im Code gefixt. Die kritischsten: Command Palette fehlte komplett, HyperMark-Editor hatte keine Formatting-Shortcuts, und es gab keinen UI-Toggle für den Editor-Modus.

---

## Test Results

### ✅ 1. Neue Note erstellen
**Status: PASS**  
- `createNewNote()` erstellt sauber eine Note mit `# {name}\n\n` als Content
- Kein "Frontmatter empty" — Frontmatter wird nur angezeigt wenn tatsächlich `---` vorhanden
- Dialog öffnet/schließt korrekt, Enter/Escape funktionieren

### ✅ 2. Text tippen
**Status: PASS**  
- Classic Mode: Textarea mit debounced Preview (200ms) — responsive
- HyperMark Mode: Piece-table Buffer (RopeBuffer) mit O(log n) Edits
- Auto-continue für Listen (bullet, numbered, checkbox) funktioniert korrekt

### ✅ 3. Headings (H1-H6)
**Status: PASS**  
- Classic: Highlight-Overlay rendert Headings korrekt mit `.hl-heading`
- HyperMark: BlockRenderers.heading() erzeugt `<h1>`-`<h6>` mit Anchor-Links
- Heading-Cycling mit Ctrl+H funktioniert (nur Classic)

### ✅ 4. Code Blocks
**Status: PASS**  
- Fenced code blocks (```` ``` ````) werden korrekt geparsed
- Syntax highlighting für Keywords, Strings, Comments, Numbers vorhanden
- Language-Label oben rechts im Block

### 🐛 5. Links und Wiki-Links — HyperMark Formatting
**Status: BUG FIXED**  
**Bug:** `insertAtCursor()` und `wrapSelection()` fehlten in HyperMarkEditor. Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+K (Link) und Slash-Commands für Wiki-Links waren in HyperMark-Modus komplett broken.  
**Fix:** `insertAtCursor()` und `wrapSelection()` als Public-API-Methoden zu HyperMarkEditor hinzugefügt (`hypermark.js`, Section 9). Beide arbeiten mit dem aktiven Block-Textarea.  
**File:** `src/js/hypermark.js`

### ✅ 6. Split Pane
**Status: PASS**  
- Kein "Ha" oder Random-Text gefunden
- Split-Handle (3px breit) funktioniert korrekt
- Tab-Drag zwischen Panes via Drop-Overlay
- Auto-unsplit wenn rechte Pane leer
- Rechte Pane hat eigenen Auto-Save Timer

### ✅ 7. Sidebar
**Status: PASS (all panels)**  
- **File Tree:** Ordner auf/zuklappen, Icons korrekt (Daily, Image, PDF, JSON, Canvas)
- **Bookmarks:** Add/Remove funktioniert, localStorage-Persistenz
- **Recent:** Maximal 20 Einträge, Clear-Button vorhanden
- **Outline:** Heading-Erkennung korrekt, Indentation nach Level

### 🐛 7b. Outline — HyperMark Click Navigation
**Status: BUG FIXED**  
**Bug:** Outline-Items klicken versuchte `this.editor.textarea` zu nutzen, was in HyperMark-Modus `null` ist → Click tat nichts.  
**Fix:** HyperMark-Branch hinzugefügt: Findet Heading-Block per Text-Match und nutzt `focusBlock()` + `scrollToBlock()`.  
**File:** `src/js/app.js` → `updateOutline()`

### 🐛 8. Settings — Editor Mode Toggle
**Status: BUG FIXED**  
**Bug:** Kein UI-Element um zwischen Classic und HyperMark Editor zu wechseln. `editorMode` war nur via localStorage oder Code änderbar.  
**Fix:** Select-Dropdown "Editor Engine" in Settings → Editor Section hinzugefügt. Wechsel triggert `app.setEditorMode()` mit Live-Reload.  
**File:** `src/js/settings.js`

### 🐛 8b. Settings — Dark Theme Konsistenz (Light Mode)
**Status: BUG FIXED**  
**Bug:** `color-scheme: dark` war hardcoded in CSS. Beim Wechsel zu Light-Theme blieben native Scrollbars, Inputs und Checkboxen dunkel.  
**Fix:** `ThemeManager.applyTheme()` setzt jetzt dynamisch `document.documentElement.style.colorScheme` basierend auf Theme-Name.  
**File:** `src/js/themes.js`

### ✅ 9. Search
**Status: PASS**  
- Debounced Input (250ms), min 2 Zeichen
- Backend `search_notes` über SearchIndex
- Results mit Title, Path, Snippet
- Enter → öffnet erstes Ergebnis
- Tag-Suche via `#tag` Click funktioniert

### ✅ 10. Tabs
**Status: PASS**  
- Öffnen, Wechseln, Schließen funktioniert
- Middle-Click schließt Tab
- Dirty-Indicator (●) bei ungespeicherten Änderungen
- Drag & Drop Reorder innerhalb gleicher Pane
- Split-Pane Tab-Migration via Drop-Zones

### ✅ 11. Graph View
**Status: PASS**  
- Canvas-basierte Force-Directed Layout
- Zoom (Mausrad), Pan (Drag), Node-Drag
- Doppelklick → öffnet Note
- Hover-Highlight mit Label
- ResizeObserver für Container-Änderungen

### 🐛 12. Command Palette (Ctrl+P)
**Status: BUG FIXED**  
**Bug:** Command Palette war **komplett nicht implementiert**. CSS existierte (`.command-palette-*`), aber kein JS-Code. Ctrl+P hatte keinen Handler. Welcome-Screen erwähnte es nicht.  
**Fix:**  
1. `handleKeyboard()` → Ctrl+P Handler hinzugefügt  
2. `openCommandPalette()` komplett implementiert mit:
   - Fuzzy-Filter über alle Commands
   - Keyboard-Navigation (Arrow Up/Down, Enter, Escape)
   - Mouse-Hover Selection
   - Shortcut-Anzeige rechts (`.command-palette-shortcut` CSS hinzugefügt)
   - Includes: New Note, Daily Note, Save, Search, Graph, Settings, Focus Mode, Editor Mode Switch
3. Welcome-Screen: `Ctrl+P Command Palette` zu Shortcuts hinzugefügt  
**Files:** `src/js/app.js`, `src/index.html`, `src/css/style.css`

### ✅ 13. Keyboard Shortcuts
**Status: PASS (nach Fixes)**  
| Shortcut | Funktion | Status |
|----------|----------|--------|
| Ctrl+S | Save | ✅ |
| Ctrl+N | New Note | ✅ |
| Ctrl+P | Command Palette | ✅ (neu) |
| Ctrl+D | Daily Note | ✅ |
| Ctrl+E | Toggle Preview | ✅ |
| Ctrl+W | Close Tab | ✅ |
| Ctrl+, | Settings | ✅ |
| Ctrl+Shift+D | Focus Mode | ✅ |
| Ctrl+Shift+F | Search | ✅ |
| Ctrl+B/I/` | Bold/Italic/Code | ✅ (HyperMark jetzt auch) |
| Ctrl+H | Cycle Heading | ✅ (Classic) |
| Ctrl+K | Insert Link | ✅ |
| Escape | Close dialogs/palette | ✅ |

### ✅ 14. Auto-Save
**Status: PASS**  
- Debounced Timer: 2000ms nach letztem Edit (`_autoSaveTimer`)
- Linke Pane: `markDirty()` → `setTimeout(saveCurrentFile, 2000)`
- Rechte Pane: Eigener Timer in `createSplitLayout()`
- Blur-Event: Sofortiges Save bei Focus-Verlust
- `beforeunload`: Best-effort Save + Browser-Confirmation

### ✅ 15. Editor Mode Toggle
**Status: PASS (nach Fix)**  
- Classic Mode: Textarea + Live Preview + Syntax Highlight Overlay
- HyperMark Mode: Block-Editor mit Piece-Table, Drag & Drop, Virtual Viewport
- Toggle via Settings oder Command Palette
- `setEditorMode()` preserved Content beim Wechsel

---

## Summary of All Fixes

| # | Bug | Severity | File(s) | Status |
|---|-----|----------|---------|--------|
| 1 | Command Palette missing | 🔴 Critical | `app.js`, `index.html`, `style.css` | ✅ Fixed |
| 2 | HyperMark `insertAtCursor`/`wrapSelection` missing | 🔴 Critical | `hypermark.js` | ✅ Fixed |
| 3 | No Editor Mode Toggle UI | 🟡 Major | `settings.js` | ✅ Fixed |
| 4 | Outline click broken in HyperMark | 🟡 Major | `app.js` | ✅ Fixed |
| 5 | `color-scheme` not updating with theme | 🟡 Major | `themes.js` | ✅ Fixed |
| 6 | `Ctrl+P` welcome screen missing | 🟢 Minor | `index.html` | ✅ Fixed |
| 7 | `.command-palette-shortcut` CSS missing | 🟢 Minor | `style.css` | ✅ Fixed |

---

## Verdict

**Vor dem Fix:** 3 kritische Features broken (Command Palette, HyperMark Formatting, Editor Toggle).  
**Nach dem Fix:** Alle 15 Testbereiche PASS. App fühlt sich wie Obsidian an — smooth, responsive, keine Artefakte.

**Empfehlung:** ✅ Ready for next build cycle.

---
*Report generated by BREAKER — QA Lead, Oxidian Studio*
