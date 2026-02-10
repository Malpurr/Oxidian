# Features Batch 1 — 2026-02-10

## Implemented Features

### Feature 1: Random Note ✅
- **Ribbon button** added to `ribbon-bottom` in `index.html` (shuffle icon)
- **Method** `openRandomNote()` in `OxidianApp` — uses `getFileTree()`, recursively collects all `.md` files, picks random one
- **Command Palette** entry: "Open Random Note" (Navigate category)
- **Wiring**: `data-action="random"` ribbon button → `openRandomNote()`

### Feature 2: Note Composer (Extract Selection) ✅
- **Method** `extractSelectionToNote()` in `OxidianApp`
  - Gets selection via `editor.getSelection()`
  - Prompts for new note name
  - Saves selection as new note via `invoke('save_note')`
  - Replaces selection with `[[link]]` via `editor.replaceSelection()`
  - Auto-saves current file, refreshes sidebar
- **Context menu**: "📝 Extract to New Note" appears when text is selected (contextmenu.js)
- **Command Palette** entry: "Extract Selection to New Note" (Editor category)

### Feature 3: Footnotes ✅
- **Method** `_processFootnotes(html, rawMarkdown)` in `OxidianApp`
  - Parses `[^id]: definition` from raw markdown
  - Replaces `[^id]` inline references with `<sup>` superscript links
  - Removes definition paragraphs from rendered HTML
  - Appends `<section class="footnotes">` block with ordered list + backref links
- **Integrated** into `renderMarkdown()` pipeline (after callout processing)
- **CSS** in `obsidian-features.css`: styled footnote refs, footnote section, backref links

### Feature 4: Audio Recorder ✅
- **Toolbar button** added to `#view-toolbar` in `index.html` (microphone icon)
- **Methods** `startAudioRecording()` / `stopAudioRecording()` / `_updateAudioRecorderUI()`
  - Uses `navigator.mediaDevices.getUserMedia({ audio: true })`
  - Records via `MediaRecorder` API to webm
  - Saves to `recordings/recording-{timestamp}.webm`
  - Inserts `![[filename]]` embed link into editor
  - Toggle behavior: click to start, click again to stop
- **CSS**: recording state pulse animation on button
- **Command Palette** entries: "Record Audio" / "Stop Audio Recording"

## Files Modified
| File | Changes |
|------|---------|
| `src/js/app.js` | +4 methods, footnote processor, audio recorder, ribbon/toolbar wiring |
| `src/js/command-palette.js` | +4 commands (random, extract, record, stop) |
| `src/js/contextmenu.js` | +1 context menu item (Extract to New Note) |
| `src/index.html` | +1 ribbon button (random), +1 toolbar button (audio) |
| `src/css/obsidian-features.css` | +footnotes CSS, +audio recorder CSS |

## Syntax Verification
All modified JS files pass `node -c` syntax check — no errors.
