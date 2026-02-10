# Oxidian — Feature-Parity mit Obsidian (aus Video-Analyse)

Quelle: https://youtu.be/z4AbijUCoKU
Analysiert: 2026-02-10

## Legende
- ✅ = Haben wir schon (Modul existiert)
- 🔧 = Teilweise implementiert / braucht Fixes
- ❌ = Fehlt komplett — MUSS implementiert werden

---

## Vault & Dateisystem
- ✅ Vault = lokaler Ordner mit Markdown-Dateien
- ✅ File-Sidebar mit Notizen-Liste (`sidebar.js`)
- ✅ Neue Notiz erstellen
- ✅ Ordner erstellen & verwalten
- 🔧 Sortierung (Dateiname, Änderungsdatum, etc.) — prüfen ob vollständig
- ❌ **Auto-Reveal: Aktuelle Datei im Sidebar automatisch highlighten/scrollen**
- ✅ Ordner auf-/zuklappen

## Navigation & Tabs
- ✅ Tabs (`tabs.js`)
- ❌ **Cmd/Ctrl-Click auf Note → in neuem Tab öffnen**
- ❌ **Drag & Drop Tabs in Split-Panels / Multitasking-Layout**
- ✅ Quick Switcher Cmd+O (`quickswitcher.js`)
- ❌ **Vorwärts/Rückwärts-Navigation (Cmd+Alt+Left/Right)**
- ✅ Find on Page Cmd+F (`find-replace.js`)
- ❌ **Cmd+T neuer Tab, Cmd+W Tab schließen**

## Linking & Connections
- ✅ Wiki-Links mit [[doppelte Klammern]] (`wikilinks.js`)
- ✅ Graph View (`graph.js`)
- ✅ Backlinks Panel (`backlinks.js`)
- ❌ **Placeholder-Notes: Verlinkte aber noch nicht erstellte Notizen als blasse Punkte im Graph**
- ❌ **Auto-Update interner Links bei Umbenennung einer Notiz** (KRITISCH!)
- ❌ **Cmd-Click auf [[nicht existierende Note]] → automatisch erstellen**

## Formatierung (Markdown)
- ✅ Bold, Italic (CodeMirror)
- ✅ Headings (#, ##, ###)
- ✅ Strikethrough (~~text~~)
- ❌ **Highlight (==text==)**
- ✅ Blockquote (>)
- ✅ Bullet Lists, Numbered Lists
- ✅ Checklisten (- [ ])
- ✅ Horizontal Rule (---)
- ✅ Code inline + Code Blocks
- ✅ Externe Links [text](url)

## Embedding & Media
- ✅ Note Embedding ![[note]] (`embeds.js`)
- ✅ Bilder einbetten
- ✅ Drag & Drop für Bilder/Dateien (`drag-drop.js`)
- ❌ **PDF-Einbettung/Vorschau**
- ❌ **Audio Recorder / Voice Memos**
- ❌ **YouTube Video Embeds**
- ❌ **Tweet Embeds**

## Organisation
- ✅ Tags mit # (`tag-autocomplete.js`)
- ❌ **Bookmarks / Favoriten (Sterne-System für wichtige Notizen)**
- ✅ Vault-weite Suche (`search.js`)
- ❌ **Daily Notes (Tages-Notiz mit Datum automatisch erstellen)**
- ✅ Templates (`templates.js`)

## Properties & Metadata
- ✅ Properties/Frontmatter Panel (`properties-panel.js`, `frontmatter.js`)
- ❌ **Property-Types: Date, Checkbox, Links, Numbers, Text — mit UI-Picker**
- ❌ **Bases: Datenbank-Ansichten für Notizen (Obsidians neues Killer-Feature)**

## Visuals
- ✅ Canvas/Whiteboard (`canvas.js`)
- ✅ Themes (`themes.js`) — 6 Themes
- ✅ Tabellen
- ❌ **Command Palette (Cmd+P) mit Fuzzy-Search über alle Aktionen**
- ✅ Hover Preview (`hover-preview.js`)

## Settings
- ❌ **Attachments-Ordner konfigurierbar (Standard-Ordner für Bilder/Dateien)**
- ✅ Settings Panel (`settings.js`)

---

## Priorität für Studio-Agents

### P0 — Muss sofort (Obsidian-Switcher merken den Unterschied)
1. Auto-Update interner Links bei Umbenennung
2. Cmd-Click → Note in neuem Tab / nicht existierende Note erstellen
3. Vorwärts/Rückwärts-Navigation
4. Command Palette (Cmd+P)
5. Highlight ==text== Support
6. Bookmarks/Favoriten
7. Daily Notes

### P1 — Wichtig (nächste Woche)
8. Placeholder-Notes im Graph
9. Tab-Shortcuts (Cmd+T, Cmd+W)
10. Auto-Reveal aktuelle Datei im Sidebar
11. Attachments-Ordner konfigurierbar
12. Property-Types mit UI-Picker

### P1.5 — Aus Video 2 (Zettelkasten-Workflow)
13. **Graph View: Farbcodierte Nodes** — Verschiedene Farben je nach Ordner/Notiz-Typ (z.B. orange = Literaturnotizen, blau = Evergreen)
14. **Zettelkasten Starter-Template** — Vorgefertigte Ordnerstruktur: Fleeting Notes, Reference Notes, Evergreen Notes + Index-Seite
15. **Index/MOC (Maps of Content)** — Spezielle Notiz als Einstiegspunkt die andere Notizen nach Themen gruppiert verlinkt

### P2 — Nice to have
16. YouTube/Tweet Embeds
17. PDF-Vorschau
18. Audio Recorder
19. Split-Panel Drag & Drop
20. Bases (Datenbank-Feature)
21. Readwise-Integration (Kindle Highlights importieren)
