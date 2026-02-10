# Deep Test Report: Editor + Slash Commands + Markdown
**Date:** 2026-02-10  
**Tester:** Subagent deep-editor  
**Scope:** Editor, Slash Commands, Markdown Rendering, Frontmatter, Live Preview, Keyboard Shortcuts

---

## 1. Slash Commands

### 1.1 Registrierte Commands

**Zwei getrennte Slash-Command-Systeme existieren:**

#### A) `slash.js` — SlashMenu (Classic/CodeMirror Editor)
Datei: `src/js/slash.js`, Zeile 3–22

| ID | Label | Typ | Kategorie |
|---|---|---|---|
| h1–h6 | Heading 1–6 | insert | headings |
| bold | Bold | wrap `**` | formatting |
| italic | Italic | wrap `*` | formatting |
| strikethrough | Strikethrough | wrap `~~` | formatting |
| code | Inline Code | wrap `` ` `` | formatting |
| codeblock | Code Block | insert | blocks |
| quote | Quote | insert `> ` | blocks |
| bullet | Bullet List | insert `- ` | lists |
| numbered | Numbered List | insert `1. ` | lists |
| checkbox | Checkbox | insert `- [ ] ` | lists |
| table | Table | insert | blocks |
| hr | Horizontal Rule | insert `---` | blocks |
| image | Image / Embed | insert `![alt](url)` | media |
| link | Link | insert `[text](url)` | media |
| wikilink | Wiki Link | wrap `[[` `]]` | media |
| callout | Callout | insert `> [!note]\n> ` | blocks |

**21 Commands total.**

#### B) `hypermark.js` — SlashCommandMenu (HyperMark/Live Preview Editor)
Datei: `src/js/hypermark.js`, `DEFAULT_SLASH_COMMANDS` (Zeile ~570)

| Label | Icon | Markdown |
|---|---|---|
| Heading 1–3 | H1/H2/H3 | `# ` / `## ` / `### ` |
| Code Block | `</>` | ` ```\n\n``` ` |
| Quote | ❝ | `> ` |
| Bullet List | • | `- ` |
| Numbered List | 1. | `1. ` |
| Task List | ☑ | `- [ ] ` |
| Table | ▦ | Full table template |
| Divider | — | `---` |
| Callout | 💡 | `> [!note]\n> ` |
| Math Block | ∑ | `$$\n\n$$` |

**12 Commands total.**

### 1.2 Trigger-Mechanismus

**slash.js** (`SlashMenu.onInput`, Zeile 58–86):
- Triggered on every `input` event (textarea oder CodeMirror view)
- Prüft ob `/` am Zeilenanfang oder nach Whitespace steht
- Filter: kein Space/Newline im Query erlaubt
- ✅ **Funktioniert korrekt** — saubere Erkennung

**hypermark.js** (`_checkSlashTrigger`, Zeile ~843):
- Triggered innerhalb von `_onBlockEdit`
- Prüft `lineText.startsWith('/')`
- ✅ **Funktioniert korrekt**

### 1.3 Dropdown-Anzeige

**slash.js**: Positionierung über `getCursorPosition()` (textarea) oder `getCMCursorPosition()` (CodeMirror mit `coordsAtPos`). Overflow-Korrektur via `requestAnimationFrame`.
- ✅ **Funktioniert**

**hypermark.js**: Positionierung relativ zum textarea im Block.
- ⚠️ **Potentielles Problem**: Y-Berechnung basiert auf `lines.length * lineHeight`, was bei wrapped Lines ungenau sein kann.

### 1.4 Fehlende Commands vs Obsidian

| Obsidian Command | slash.js | hypermark.js | Status |
|---|---|---|---|
| Heading 4–6 | ✅ | ❌ | **Fehlt in HyperMark** |
| Bold/Italic/Strikethrough | ✅ | ❌ | **Fehlt in HyperMark** |
| Inline Code | ✅ | ❌ | **Fehlt in HyperMark** |
| Image/Embed | ✅ | ❌ | **Fehlt in HyperMark** |
| Link | ✅ | ❌ | **Fehlt in HyperMark** |
| Wiki Link | ✅ | ❌ | **Fehlt in HyperMark** |
| Math Block | ❌ | ✅ | **Fehlt in slash.js** |
| Mermaid Diagram | ❌ | ❌ | **Fehlt überall** |
| Embed (`![[...]]`) | ❌ | ❌ | **Fehlt überall** |
| Toggle/Folding | ❌ | ❌ | **Fehlt überall** |
| Date/Time insert | ❌ | ❌ | **Fehlt überall** |
| Template insert | ❌ | ❌ | **Fehlt** (TemplateManager existiert aber kein Slash-Command) |

### 1.5 Konkrete Fixes

1. **HyperMark Slash Commands angleichen**: `DEFAULT_SLASH_COMMANDS` in hypermark.js um H4–H6, Bold, Italic, Strikethrough, Code, Image, Link, Wikilink erweitern.
2. **Math Block in slash.js hinzufügen**: `{ id: 'math', label: 'Math Block', icon: '∑', insert: '$$\\n\\n$$', cursorOffset: -3, category: 'blocks' }`
3. **Template Slash Command**: `{ id: 'template', label: 'Insert Template', icon: '📄', action: () => app.templateManager.showPicker(), category: 'blocks' }` — benötigt `action`-Support in execute().

---

## 2. Markdown Rendering

### 2.1 Rendering-Pipeline

Zwei Pfade:

1. **Rust Backend** (`invoke('render_markdown', { content })`) → HTML — Hauptpfad für Preview
2. **HyperMark JS Fallback** (`renderInlineFallback` in hypermark.js, Zeile ~305) — wenn Rust fehlschlägt

### 2.2 Feature-Matrix

| Feature | Rust render | HyperMark Fallback | HyperMark Block Renderer | Status |
|---|---|---|---|---|
| H1–H6 | ✅ (Rust) | ❌ (nur inline) | ✅ `BlockRenderers.heading` | ✅ |
| Bold `**text**` | ✅ | ✅ regex | ✅ inline | ✅ |
| Italic `*text*` | ✅ | ✅ regex | ✅ inline | ✅ |
| Strikethrough `~~text~~` | ✅ | ✅ regex | ✅ inline | ✅ |
| Inline Code `` `code` `` | ✅ | ✅ regex | ✅ inline | ✅ |
| Links `[text](url)` | ✅ | ✅ regex | ✅ inline | ✅ |
| Images `![alt](url)` | ✅ | ✅ regex | ✅ inline | ✅ |
| Wikilinks `[[note]]` | ✅ | ✅ regex (mit `\|` alias) | ✅ inline | ✅ |
| Tables | ✅ | ❌ | ✅ `BlockRenderers.table` | ✅ |
| Blockquotes | ✅ | ❌ | ✅ `BlockRenderers.blockquote` | ✅ |
| Unordered Lists | ✅ | ❌ | ✅ `BlockRenderers.list` | ✅ |
| Ordered Lists | ✅ | ❌ | ✅ `BlockRenderers.list` | ✅ |
| Checkboxes `- [ ]` | ✅ | ❌ | ✅ `BlockRenderers.list` (task) | ✅ |
| Code Blocks | ✅ | ❌ | ✅ `BlockRenderers.code_block` | ✅ |
| Horizontal Rule | ✅ | ❌ | ✅ `BlockRenderers.thematic_break` | ✅ |
| **Highlights `==text==`** | ❓ Rust-abhängig | ✅ `<mark>` regex | ✅ `.hm-highlight` | ⚠️ |
| **Callouts `> [!type]`** | Teilweise | ❌ | ✅ `BlockRenderers.callout` | ✅ |
| **Math (LaTeX) `$$...$$`** | ❓ Rust-abhängig | ❌ | ✅ `BlockRenderers.math_block` (nur escaped text, **kein KaTeX**) | ⚠️ |
| **Mermaid** | ❌ | ❌ | ❌ (code block, kein render) | ⚠️ |
| Footnotes `[^1]` | ❌ (Rust) | ❌ | ❌ | ✅ via `_processFootnotes` in app.js |
| Frontmatter | ✅ | ❌ | ✅ `BlockRenderers.frontmatter` | ✅ |

### 2.3 Probleme & Fixes

#### ⚠️ Highlights (`==text==`)
- **CodeMirror**: ✅ Eigene Extension in `highlight-extension.js` — decoriert `==text==` im Editor
- **Rust Render**: Unbekannt ob Rust `==` als `<mark>` rendert. Falls nicht, wird es im Preview nicht angezeigt.
- **HyperMark Inline Fallback**: ✅ `html.replace(/==(.+?)==/g, '<mark class="hm-highlight">$1</mark>')`
- **Fix**: Sicherstellen dass `render_markdown` in Rust `==text==` → `<mark>` konvertiert. Falls nicht, Post-Processing in `renderMarkdown()` in app.js hinzufügen.

#### ⚠️ Math (LaTeX)
- **HyperMark**: Rendert Math-Blöcke nur als escaped Text in `.hm-math-content` — **kein KaTeX/MathJax Rendering**
- **CSS**: `font-family: 'KaTeX_Math', serif` — rein kosmetisch
- **Fix**: KaTeX einbinden und in `BlockRenderers.math_block` + Post-Processing `katex.renderToString()` aufrufen. Auch inline `$...$` unterstützen.

#### ⚠️ Mermaid
- `MermaidRenderer` Klasse existiert und wird in `postProcessRendered()` aufgerufen
- Funktioniert nur für den Preview-Pfad (Rust render → HTML → DOM → `processElement`)
- **Im HyperMark-Editor**: Code-Blöcke mit `mermaid` Language werden als normaler Code angezeigt, nicht gerendert
- **Fix**: In HyperMark `_renderDirect`, nach DOM-Erstellung, `mermaidRenderer.processElement()` aufrufen.

---

## 3. Editor Features

### 3.1 Undo/Redo

| Editor | Mechanismus | Status |
|---|---|---|
| **CodeMirror 6** | `history()` Extension + `historyKeymap` (Ctrl+Z/Ctrl+Y) | ✅ Funktioniert |
| **Classic Textarea** | Browser-native Undo (kein custom History) | ✅ Browser-basiert |
| **HyperMark** | Custom `TransactionHistory` Klasse (Zeile ~430) mit Batch-Support | ✅ Funktioniert |

### 3.2 Auto-Indent

| Editor | Mechanismus | Status |
|---|---|---|
| **CodeMirror 6** | `indentOnInput()` Extension | ✅ |
| **Classic Textarea** | Custom in `handleEditorKeys` — Enter preserviert Leading Whitespace (Zeile ~490 editor.js) | ✅ |
| **HyperMark** | Tab-Key fügt 2/4 Spaces ein (Zeile ~1348 hypermark.js), aber **kein Auto-Indent bei Enter** | ⚠️ |

**Fix HyperMark**: In `_onTextareaKeydown` bei Enter die Indent-Logik aus editor.js portieren.

### 3.3 Auto-Pair Brackets

| Editor | Mechanismus | Status |
|---|---|---|
| **CodeMirror 6** | `closeBrackets()` + `closeBracketsKeymap` | ✅ |
| **Classic Textarea** | Custom `_autoPairs` Map: `()`, `[]`, `{}`, `""`, `` `` `` (Zeile ~47 editor.js) + handleEditorKeys (Zeile ~470) | ✅ |
| **HyperMark** | ❌ **Nicht implementiert** | ❌ |

**Fix HyperMark**: Auto-pair Logic in `_onTextareaKeydown` hinzufügen.

### 3.4 Line Numbers

| Editor | Mechanismus | Status |
|---|---|---|
| **CodeMirror 6** | `lineNumbers()` via Compartment, toggle über `toggleLineNumbers()` | ✅ |
| **Classic Textarea** | Custom `_setupLineNumbers()` — DOM-Gutter-Overlay | ✅ |
| **HyperMark** | ❌ **Nicht implementiert** (Block-basiert) | ❌ |

### 3.5 Word Wrap

| Editor | Status |
|---|---|
| **CodeMirror 6** | `EditorView.lineWrapping` Extension ✅ |
| **Classic Textarea** | CSS `word-wrap` auf `<textarea>` (default browser) ✅ |
| **HyperMark** | Block-textareas auto-resize, wrapping via CSS ✅ |

### 3.6 Spell Check

| Editor | Status |
|---|---|
| **CodeMirror 6** | ❌ **Nicht aktiviert** — `spellcheck` Attribut nicht gesetzt auf `.cm-content` |
| **Classic Textarea** | `spellcheck="true"` ✅ |
| **HyperMark** | `textarea.spellcheck = true` ✅ |

**Fix CodeMirror**: Add `EditorView.contentAttributes.of({ spellcheck: "true" })` to extensions array in `codemirror-editor.js`.

---

## 4. Frontmatter / Properties

### 4.1 YAML Parsing
- **Datei**: `src/js/frontmatter.js` — `FrontmatterProcessor`
- Parsing via Rust: `invoke('parse_frontmatter', { content })`
- Fallback: Keiner im FrontmatterProcessor (nur error return)
- **PropertiesPanel** (`properties-panel.js`, Zeile ~128): Hat JS-Fallback-Parser (regex-basiert) falls Rust fehlschlägt
- ✅ **Funktioniert** (abhängig von Rust Backend)

### 4.2 Property Panel
- **Datei**: `src/js/properties-panel.js` — `PropertiesPanel`
- Wird in `attachObsidianFeatures()` initialisiert (app.js Zeile ~2260)
- Klappbar (expand/collapse), persistent in localStorage
- Features:
  - Key-Value-Eingabefelder mit Inline-Editing ✅
  - Add Property Button ✅
  - Delete Property Button ✅
  - Key-Rename mit Duplikat-Check ✅
  - Bidirektionale Sync: Panel → Textarea und Textarea → Panel ✅
  - YAML Serialisierung via Rust (`stringify_frontmatter`) mit JS-Fallback ✅
- ⚠️ **Problem**: Nur für Classic Textarea angebunden (`attachTo(textarea)`). Im CodeMirror-Modus wird kein `textarea` übergeben → Panel bleibt leer.
- **Fix**: In `attachObsidianFeatures()`, wenn CodeMirror aktiv, den CM6 Content-Change-Listener nutzen statt textarea events.

### 4.3 Frontmatter Editor Dialog
- **Datei**: `src/js/frontmatter.js`, `showFrontmatterEditor()` (Zeile ~147)
- Vollständiger Modal-Dialog mit:
  - Common Fields (title, date, tags, aliases, author, status) ✅
  - Raw YAML Editor ✅
  - Save/Cancel ✅
- Aufruf über `window.oxidianApp.editFrontmatter()` oder Preview-Button ✅

---

## 5. Live Preview / View Mode Switching

### 5.1 View Modes

Drei Modi: `live-preview`, `source`, `reading` (app.js `cycleViewMode`, Zeile ~1957)

| Modus | Verhalten | Status |
|---|---|---|
| **live-preview** | HyperMark Editor (Block-basiert, inline-gerendert) | ✅ |
| **source** | Raw Textarea (Classic) oder CodeMirror 6 | ✅ |
| **reading** | Read-only rendered HTML | ✅ |

### 5.2 Switching-Mechanismus

- `Ctrl+E` triggert `cycleViewMode()` ✅
- View-Mode-Button in Toolbar: `btn-view-mode` → `cycleViewMode()` ✅
- Per-Tab-Persistenz: `tab.viewMode` gespeichert ✅
- `applyViewMode()` toggelt CSS-Klassen und zeigt/versteckt Editor/Reading-View ✅

### 5.3 Probleme

1. **Editor-Wechsel bei Mode-Change**: `applyViewMode()` wechselt **nicht** zwischen CodeMirror und HyperMark. Es toggelt nur CSS-Klassen. Der tatsächliche Editor wird in `ensureEditorPane()` basierend auf `editorMode` erstellt.
   - `live-preview` → HyperMark (wenn `editorMode === 'hypermark'`)
   - `source` → Textarea/CodeMirror (wenn `editorMode === 'classic'`)
   - **Problem**: Wenn `editorMode === 'hypermark'` und man zu `source` wechselt, wird der HyperMark-Editor nicht gegen einen Textarea-Editor ausgetauscht — nur CSS-Klasse ändert sich.
   - **Fix**: In `cycleViewMode()`, bei Wechsel zu `source` automatisch `setEditorMode('classic')` und bei Wechsel zu `live-preview` `setEditorMode('hypermark')` aufrufen.

2. **Reading View**: Funktioniert korrekt — Editor wird hidden, rendered HTML wird angezeigt. ✅

3. **LivePreview Klasse** (`live-preview.js`): Existiert als separate Side-by-Side Preview-Implementierung, wird aber **nirgends aktiv genutzt**. Die tatsächliche Live-Preview ist HyperMark.

---

## 6. Keyboard Shortcuts

### 6.1 Global Shortcuts (app.js `handleKeyboard`, Zeile ~1756)

| Shortcut | Aktion | Code-Stelle | Status |
|---|---|---|---|
| Ctrl+S | Save | app.js:1764 | ✅ |
| Ctrl+N | New Note | app.js:1767 | ✅ |
| Ctrl+P | Command Palette / Quick Switcher | app.js:1770 | ✅ |
| Ctrl+O | Quick Switcher | app.js:1776 | ✅ |
| Ctrl+T | Template Picker | app.js:1779 | ✅ |
| Ctrl+F | Find in File | app.js:1782 | ✅ |
| Ctrl+H | Find & Replace | app.js:1793 | ✅ |
| Ctrl+Shift+F | Global Search | app.js:1802 | ✅ |
| Ctrl+D | Daily Note (wenn nicht in Editor) | app.js:1810 | ✅ |
| Ctrl+E | Cycle View Mode | app.js:1814 | ✅ |
| Ctrl+W | Close Tab | app.js:1818 | ✅ |
| Ctrl+, | Settings | app.js:1822 | ✅ |
| Ctrl+Shift+D | Focus Mode | app.js:1826 | ✅ |
| Ctrl+] / Ctrl+[ | Indent/Outdent | app.js:1829 | ✅ |
| Ctrl+Alt+← / → | Nav History Back/Forward | app.js:2279 | ✅ |
| Escape | Close dialogs | app.js:1837 | ✅ |

### 6.2 Editor Shortcuts

#### CodeMirror 6 (codemirror-editor.js `markdownKeymap`, Zeile ~240)

| Shortcut | Aktion | Status |
|---|---|---|
| Ctrl+B | Bold `**` | ✅ |
| Ctrl+I | Italic `*` | ✅ |
| Ctrl+K | Insert Link | ✅ |
| Ctrl+` | Inline Code | ✅ |
| Ctrl+Shift+K | Code Block | ✅ |
| Ctrl+Z | Undo | ✅ (historyKeymap) |
| Ctrl+Y / Ctrl+Shift+Z | Redo | ✅ |
| Tab | Indent | ✅ (indentWithTab) |
| Ctrl+Shift+[ / ] | Fold/Unfold | ✅ |

#### Classic Textarea (editor.js `handleEditorKeys`, Zeile ~428)

| Shortcut | Aktion | Status |
|---|---|---|
| Ctrl+B | Bold `**` | ✅ |
| Ctrl+I | Italic `*` | ✅ |
| Ctrl+K | Insert Link | ✅ |
| Ctrl+` | Inline Code | ✅ |
| Ctrl+Shift+K | Code Block | ✅ |
| Ctrl+Shift+X | Strikethrough `~~` | ✅ |
| Ctrl+H | Cycle Heading | ✅ |
| Ctrl+D | Duplicate Line | ✅ |
| Ctrl+/ | Toggle Comment | ✅ |
| Tab | Insert 2 Spaces | ✅ |
| Shift+Tab | Outdent | ✅ |
| Enter | Auto-indent + List Continuation | ✅ |

#### HyperMark (hypermark.js `_onTextareaKeydown`)

| Shortcut | Aktion | Status |
|---|---|---|
| Ctrl+Z | Undo | ✅ |
| Ctrl+Y / Ctrl+Shift+Z | Redo | ✅ |
| Tab | Indent (2/4 spaces) | ✅ |
| Enter | Split Block | ✅ |
| Backspace (at pos 0) | Merge with Previous | ✅ |
| ArrowUp/Down | Navigate Blocks | ✅ |
| **Ctrl+B** | Bold | ❌ **Fehlt** |
| **Ctrl+I** | Italic | ❌ **Fehlt** |
| **Ctrl+K** | Link | ❌ **Fehlt** |

**Fix HyperMark**: Formatting-Shortcuts in `_onTextareaKeydown` hinzufügen:
```js
if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); this.wrapSelection('**', '**'); return; }
if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); this.wrapSelection('*', '*'); return; }
if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); /* insertLink logic */ return; }
```

### 6.3 Fehlende Shortcuts vs Obsidian

| Shortcut | Obsidian | Oxidian | Status |
|---|---|---|---|
| Ctrl+Shift+V | Paste Plain Text | ❌ | **Fehlt** |
| Ctrl+Enter | Toggle Checkbox | ❌ | **Fehlt** |
| Ctrl+Shift+] | Increase heading level | ❌ | **Fehlt** (Ctrl+H cycles) |
| Ctrl+L | Toggle bullet list | ❌ | **Fehlt** |
| Alt+↑/↓ | Move line up/down | ❌ (CM6 hat es) | Nur CodeMirror |

**Fix Paste Plain Text** (app.js `handleKeyboard`):
```js
if (ctrl && e.shiftKey && e.key === 'V') {
    e.preventDefault();
    navigator.clipboard.readText().then(text => {
        this.editor.replaceSelection(text);
    });
    return;
}
```

---

## 7. Zusammenfassung der kritischsten Probleme

### 🔴 Kritisch (Funktionalität fehlt)
1. **HyperMark: Keine Ctrl+B/I/K Shortcuts** — Basis-Formatting nicht per Tastatur möglich
2. **HyperMark: Keine Auto-Pair Brackets** — Konsistenz-Problem zwischen Editoren
3. **Math/LaTeX: Kein echtes Rendering** — nur escaped Text, kein KaTeX
4. **Properties Panel: Funktioniert nicht mit CodeMirror** — nur textarea-basiert

### 🟡 Wichtig (Inkonsistenzen)
5. **Slash Commands nicht synchron** — slash.js hat 21, hypermark.js hat 12 Commands
6. **View Mode Switching: Kein Editor-Wechsel** — CSS-only Toggle, Editor-Typ bleibt gleich
7. **CodeMirror: Kein Spellcheck** — `spellcheck` Attribut fehlt
8. **LivePreview Klasse unbenutzt** — toter Code in `live-preview.js`

### 🟢 Funktioniert gut
9. Slash Command Trigger/Filter/Execution ✅
10. Markdown Rendering (Rust-basiert) ✅
11. Frontmatter Parsing + Editor Dialog ✅
12. CodeMirror 6 Integration (Syntax Highlighting, Undo/Redo, Line Numbers) ✅
13. Classic Textarea Fallback (Auto-Indent, List Continuation, Bracket Matching) ✅
14. Reading View ✅
15. Callout Processing ✅
16. `==highlight==` in CodeMirror (custom Extension) ✅
17. Wikilink Autocomplete in CodeMirror ✅
18. Footnotes Post-Processing ✅
