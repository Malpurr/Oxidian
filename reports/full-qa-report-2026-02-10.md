# Oxidian Full QA Report — 2026-02-10

**Tester:** Automated QA (AI)  
**Version:** 2.2.0  
**Platform:** Linux (Tauri/Rust)  
**Screenshots analysiert:** 19/19  
**Quellcode analysiert:** index.html, app.js, settings.js, style.css

---

## Screenshot-für-Screenshot Analyse

### 01 — Onboarding (01-onboarding.png)
**Beschreibung:** Welcome-Screen mit Logo, Titel "Welcome to Oxidian", Beschreibung, "Get Started"-Button, "Skip setup →"-Link und 4-Step-Indicator (Schritt 1 aktiv).

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 1 | Step-Indicator zeigt 4 Schritte, aber es ist unklar wie viele Onboarding-Screens es tatsächlich gibt. User hat keine Zurück-Navigation. | P2 | `onboarding.js`: Back-Button hinzufügen |
| 2 | "Skip setup →" hat keinen Hover-State / Underline — wirkt nicht klickbar | P3 | `style.css`: `.onboarding-skip:hover { text-decoration: underline; }` |

---

### 02 — Home / Welcome Screen (02-home.png)
**Beschreibung:** Hauptansicht nach Onboarding. Linke Sidebar mit Explorer ("Vault is empty"), TAGS-Sektion. Hauptbereich zeigt Welcome-Content mit "Open Today's Daily Note" (Primary), "Create New Note" (Secondary), Quick Tips (Ctrl+P, Ctrl+N, /).

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 3 | Explorer zeigt "Vault is empty" als Plaintext — sollte ein leerer State mit Icon/Illustration sein, wie Obsidian es macht | P3 | `sidebar.js`: Leeren State mit Icon + "Create your first note" CTA |
| 4 | Status bar zeigt "1 min read · 0 words · 0 characters · Ln 1, Col 1" obwohl kein File offen ist — irreführend | P2 | `app.js`: Status bar ausblenden oder "No file open" zeigen wenn `currentFile === null` |
| 5 | Tab bar ist komplett leer — kein visueller Hinweis. Könnte verwirrend sein. | P3 | UX: Tab bar verstecken wenn keine Tabs offen sind |

---

### 03 — New Note Dialog (03-new-note.png)
**Beschreibung:** Modal-Dialog "New Note" mit Input-Feld "Note name...", Cancel und Create Buttons. Background ist geblurrt.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 6 | "Create"-Button ist enabled auch wenn Input leer ist — User kann leere Note erstellen (wird durch `if (!name) return;` im Code abgefangen, aber Button sollte disabled sein) | P2 | `app.js` `showNewNoteDialog()`: Create-Button disabled bis Input nicht leer |
| 7 | Kein Hinweis auf erlaubte Zeichen / Pfade (z.B. `folder/note`). User weiß nicht ob Subfolder-Erstellung möglich ist. | P3 | Placeholder-Text anpassen: "Note name (e.g., folder/my-note)..." |

---

### 04 — Editor / New Note Created (04-editor-markdown.png)
**Beschreibung:** "My First Note" Tab geöffnet (mit gelben dirty-Dot), breadcrumb "# My First Note", Properties Panel (collapsed, 0), Editor mit Placeholder "Start writing... (Markdown supported)". Explorer zeigt weiterhin "Vault is empty".

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 8 | **Explorer zeigt "Vault is empty" obwohl Note gerade erstellt wurde** — Sidebar wird nicht refreshed nach Note-Creation | P1 | `app.js` `createNewNote()`: Prüfen ob `sidebar.refresh()` tatsächlich ausgeführt wird. Race condition: `openFile` wird vor `sidebar.refresh` aufgerufen |
| 9 | Tab zeigt dirty-Dot (gelb) sofort nach Erstellung — Note wurde gerade erst gespeichert, sollte clean sein | P1 | `app.js`: Nach `createNewNote()` und `openFile()` wird `isDirty` nicht korrekt auf false gesetzt. Die Note wird mit `# My First Note\n\n` erstellt, dann geladen — der `setContent`-Aufruf triggert möglicherweise `markDirty()` |
| 10 | Properties Panel nimmt ~30% der Breite ein, reduziert den Editor-Bereich deutlich. Bei collapsed State unnötig viel Platz | P2 | `css/obsidian-features.css`: Properties Panel Breite reduzieren wenn collapsed |
| 11 | Status bar zeigt "Ln 3, Col 1" — aber Cursor ist nicht sichtbar, 5 words / 19 chars stimmt mit `# My First Note\n\n` überein | P3 | Cosmetic — Cursor-Position nach Erstellung sollte am Ende des Titels sein, nicht Zeile 3 |

---

### 05 — Settings: General (05-settings-general.png)
**Beschreibung:** Settings-Page als Overlay über Editor. Linke Nav mit 8 Sections. "General" aktiv. Vault location: `/root/.oxidian/vault`, Browse-Button. Language: English. Start-up: Show welcome screen.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 12 | **Settings öffnen sich als Overlay über den Editor, nicht als eigener Tab** — inkonsistent mit dem Tab-System. User verliert Kontext. | P2 | `app.js` `openSettingsPage()`: Settings als Tab öffnen (Tab-Typ "settings" existiert bereits im Code) — Methode `clearPanes()` zerstört den aktuellen Editor |
| 13 | Settings Tooltip "Settings" überlappt mit TAGS-Sektion am unteren Rand | P3 | `style.css`: Tooltip-Positionierung anpassen (oben statt unten) |
| 14 | Vault path Input ist `readonly` aber nicht visuell als readonly erkennbar | P3 | `style.css`: `input[readonly] { opacity: 0.7; cursor: not-allowed; }` |

---

### 06 — Settings: Editor (06-settings-editor.png)
**Beschreibung:** Editor-Einstellungen. Font family (JetBrains Mono, Fira Code), Font size slider (15px), Line height slider (1.7), Show line numbers (unchecked), Readable line length (unchecked).

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 15 | Font size Slider zeigt 15px aber default im Code ist auch 15px — Line height zeigt 1.7 aber Code-default ist 1.6. **Mismatch zwischen angezeigtem Wert und tatsächlichem Default** | P2 | `settings.js`: Sicherstellen dass `load()` tatsächlich Backend-Werte holt oder Fallback-Defaults konsistent sind |
| 16 | Show line numbers & Readable line length sind unchecked, aber im Fallback-Settings sind sie `true` bzw. `false` — **UI-State stimmt nicht mit Code-Defaults überein** | P2 | `settings.js`: Fallback-Default `show_line_numbers: true` → Checkbox sollte checked sein |
| 17 | Slider-Value-Label ist hinter dem Slider positioniert — auf engem Raum nicht gut lesbar | P3 | CSS: Slider-Value Breite fixieren (min-width: 50px) |

---

### 07 — Settings: Appearance (07-settings-appearance.png)
**Beschreibung:** Theme-Selector (Dark/Light/Adapt to system), Accent color picker mit 8 Presets, Interface font (Default), unterhalb vermutlich mehr Einstellungen.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 18 | Theme-Preview-Boxes sind sehr klein und nicht aussagekräftig — User kann kaum erkennen wie Light vs Dark aussieht | P3 | CSS: Theme-Preview-Größe erhöhen, repräsentativere Preview |
| 19 | "Adapt to system" Theme-Preview zeigt ein schwarz/weiß Split — unklar was das bedeutet | P3 | UX: Label verbessern, z.B. mit System-Icon |

---

### 08 — Settings: Hotkeys (08-settings-hotkeys.png)
**Beschreibung:** Hotkeys-Section mit Search-Input "Search hotkeys...". Darunter: komplett leer — keine Hotkeys angezeigt.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 20 | **Hotkeys-Liste ist komplett leer** — obwohl `availableCommands` default 22 Commands hat und `renderHotkeysList()` diese iteriert. Entweder wurde `loadCommands()` nicht ausgeführt oder es gibt einen Rendering-Fehler | P1 | `settings.js`: `loadCommands()` gibt vermutlich einen Fehler zurück (IPC `get_available_commands` nicht implementiert), Fallback-Commands werden dann in die Map geschrieben aber `renderHotkeysList()` wird aufgerufen bevor die Map befüllt ist. **Fix:** `await this.loadCommands()` sicherstellen in `load()` und Rendering nach dem Load |
| 21 | Kein leerer State — wenn keine Hotkeys, sollte "No commands available" oder similar angezeigt werden | P2 | `settings.js`: Empty-State in `renderHotkeysList()` |

---

### 09 — Settings: Core Plugins (09-settings-core-plugins.png)
**Beschreibung:** Zwei Plugins angezeigt: "enabled_plugins" und "plugin_settings", beide enabled (grüner Rahmen, Checkbox checked). Beschreibung: "Core plugin functionality."

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 22 | **Plugin-Namen sind raw IDs ("enabled_plugins", "plugin_settings") statt human-readable** — `getCorePluginInfo()` hat Mappings für `file_explorer`, `search`, etc. aber der Backend liefert offenbar andere Keys | P1 | Backend: Sicherstellen dass `core_plugins` Settings die korrekten Keys liefern (z.B. `file_explorer: true`) oder `getCorePluginInfo()` Fallback für unbekannte Keys verbessern. Aktuell: Fallback zeigt `pluginId` als Name |
| 23 | Nur 2 Plugins angezeigt statt der erwarteten 16 (file_explorer, search, quick_switcher, graph_view, etc.) — Backend liefert offenbar nur 2 Keys | P1 | Backend/Settings: Default `core_plugins` Object mit allen 16 Plugins ausliefern |
| 24 | "Core plugin functionality." als Beschreibung für beide — generischer Fallback statt spezifischer Beschreibungen | P2 | Folge-Bug von #22 — wird gelöst wenn korrekte Plugin-IDs ankommen |

---

### 10 — Settings: Community Plugins (10-settings-community-plugins.png)
**Beschreibung:** "Turn off safe mode to enable plugins" mit gelbem Rahmen (Warning-Style), Checkbox checked. Drei Buttons: "Browse community plugins" (Primary), "Install from folder", "Reload plugins". "Check for plugin updates" unchecked. Unten: großes leeres Feld mit einem kleinen Icon.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 25 | Safe mode Checkbox ist checked aber Text sagt "Turn off safe mode" — **Invertierte Logik verwirrt User**: Checked = Safe mode OFF (Plugins enabled). Sollte klarer sein | P2 | `settings.js`: Label ändern zu "Enable community plugins" oder Toggle-Widget mit ON/OFF State verwenden |
| 26 | "Browse community plugins" Button hat keine Funktionalität (Placeholder `showPluginBrowser()`) | P2 | `settings.js`: Entweder Funktion implementieren oder Button disablen + "Coming soon" Label |
| 27 | Empty-State am unteren Rand wird teilweise abgeschnitten | P3 | CSS: Scrolling oder Padding anpassen |

---

### 11 — Settings: About (11-settings-about.png)
**Beschreibung:** About-Page mit "Oxidian"-Logo (X-Icon), Version 2.2.0. License: MIT. Built with: Tauri & Rust. System Information: Platform "Loading...", Architecture "Loading..."

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 28 | **Platform und Architecture zeigen permanent "Loading..."** — `loadSystemInfo()` aufruft `invoke('get_platform_info')` das fehlschlägt, aber es gibt keinen Fallback-Text wie "Unknown" | P1 | `settings.js` `loadSystemInfo()`: Catch-Block setzt Werte auf "Unknown" statt sie auf "Loading..." zu lassen. Oder: Browser-API nutzen (`navigator.platform`, `navigator.userAgent`) als Fallback |
| 29 | Version "2.2.0" im About, aber Fallback-Settings sagen "1.2.0" — Mismatch | P2 | `settings.js`: Fallback-Version konsistent halten (`about.version: '2.2.0'`) |
| 30 | Logo-Icon (X) passt nicht zum Diamond-Logo (◈) das im Onboarding und Welcome-Screen gezeigt wird | P3 | Konsistentes Logo verwenden — entweder ◈ oder X |

---

### 12 — Command Palette (12-command-palette.png)
**Beschreibung:** Command Palette Overlay mit "Type a command..." Input. Liste: New Note (Ctrl+N), Open Daily Note (Ctrl+D), Save Current File (Ctrl+S), New Folder, Delete Current File, Duplicate Current File, Rename Current File, Quick Switcher (Ctrl+O), Search Notes (Ctrl+Shift+F), Find in File (Ctrl+F).

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 31 | Command Palette hat keine Fuzzy-Search-Indikation — unklar ob es fuzzy oder exact matcht | P3 | UX: Matching-Buchstaben highlighten |
| 32 | Category-Badges ("File", "Navigate") verwenden unterschiedliche Grautöne, sind schlecht lesbar | P3 | CSS: Badge-Kontrast erhöhen |
| 33 | "Delete Current File", "Duplicate Current File", "Rename Current File" haben keine Shortcuts zugewiesen — Power-User brauchen diese | P3 | Shortcuts zuweisen oder im Hotkeys-Panel konfigurierbar machen |

---

### 13 — Search Panel (13-search-panel.png)
**Beschreibung:** Search-Panel in Sidebar aktiv. Input "Search notes..." sichtbar. Sidebar-Panel zeigt "SEARCH" Header. Settings About-Page noch im Hauptbereich sichtbar.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 34 | **Settings-Page bleibt im Hauptbereich sichtbar wenn Sidebar-Panel gewechselt wird** — Search-Panel öffnet sich in Sidebar, aber Content-Area zeigt immer noch Settings statt den zuletzt offenen Editor | P2 | `app.js`: Sidebar-Panel-Wechsel sollte nicht den Content-Area beeinflussen (nur Sidebar-Inhalt ändern). Settings-Tab-Logik prüfen |
| 35 | Search-Panel zeigt keinen Empty-State / Hinweis wie "Type to search across all notes" | P3 | `search.js`: Placeholder-Text im Ergebnis-Bereich |

---

### 14 — Bookmarks Panel (14-bookmarks.png)
**Beschreibung:** Sidebar zeigt "SEARCH" Header (nicht "BOOKMARKS"!), Search-Input. Bookmarks-Icon in Ribbon ist aktiv. Settings About weiter im Content.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 36 | **Sidebar-Panel zeigt "SEARCH" statt "BOOKMARKS"** — Das Bookmarks-Panel wird nicht korrekt aktiviert. Ribbon-Button markiert Bookmarks als aktiv, aber das angezeigte Panel ist Search | P1 | `app.js` `switchSidebarPanel()`: Prüfen ob `panel-bookmarks` DOM-Element existiert und korrekt angezeigt wird. Möglicher Bug: CSS `opacity: 0` Transition verhindert Sichtbarkeit, oder `active` Klasse wird nicht korrekt gesetzt |

---

### 15 — Outline Panel (15-outline.png)
**Beschreibung:** Sidebar zeigt "OUTLINE" mit H1-Eintrag "My First Note". Ribbon Outline-Button aktiv. Tooltip "Outline" sichtbar. Settings About im Content.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 37 | Outline zeigt Headings von "My First Note" obwohl der Content-Area Settings zeigt — **Outline reflektiert nicht den aktuell sichtbaren Content** | P2 | `app.js`: Outline sollte sich leeren wenn Settings-Tab aktiv ist, oder "Not available for settings" zeigen |

---

### 16 — Recent Files Panel (16-recent-files.png)
**Beschreibung:** Sidebar zeigt weiterhin "OUTLINE" mit H1 "My First Note". Recent Files Button (Uhr-Icon) im Ribbon ist aktiv/hovered.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 38 | **Recent Files Panel wird nicht angezeigt** — trotz aktivem Ribbon-Button bleibt Outline sichtbar. Gleicher Bug wie #36 | P1 | Gleiche Root-Cause wie Bug #36. `switchSidebarPanel('recent')` funktioniert nicht korrekt |

---

### 17 — Graph View (17-graph-view.png)
**Beschreibung:** Graph View Tab geöffnet (neben "My First Note" Tab). Sidebar zeigt Explorer mit "Vault is empty". Content-Area ist komplett leer/schwarz — kein Graph sichtbar.

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 39 | **Graph View ist komplett leer** — kein Canvas, keine Nodes, kein "No notes to display" Hinweis. Mindestens "My First Note" sollte als Node angezeigt werden | P1 | `graph.js`: Canvas wird nicht gerendert oder Graph-Daten werden nicht geladen. Prüfen ob `GraphView` Constructor korrekt ausgeführt wird |
| 40 | Explorer zeigt "Vault is empty" obwohl "My First Note" existiert (Tab ist sichtbar) — Explorer refreshed nicht | P1 | Persistenter Bug (siehe #8). `sidebar.refresh()` funktioniert nicht korrekt oder wird nicht nach jeder File-Operation aufgerufen |
| 41 | Status bar zeigt "5 words · 19 characters" — bezieht sich auf "My First Note", nicht auf Graph View. Sollte Graph-spezifische Info zeigen | P3 | `app.js`: Status bar für Graph View anpassen (z.B. "X nodes · Y connections") |

---

### 18 — Explorer (18-explorer.png)
**Beschreibung:** Graph View Tab aktiv. Explorer zeigt "Vault is empty". Content-Area komplett leer (Graph View Inhalt).

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 42 | Identisch mit #17/#40 — Explorer zeigt persistent "Vault is empty" | P1 | Siehe #40 |

---

### 19 — Daily Note (19-daily-note.png)
**Beschreibung:** Neuer Tab "2026-02-10" geöffnet. Breadcrumb: "daily › 2026-02-10". Properties Panel (collapsed, 0). Editor-Placeholder: "Start writing... (Markdown supported)". Explorer zeigt "Vault is empty". TAGS-Section sichtbar. Tooltip "Daily Note (Ctrl+D)".

**Bugs:**
| # | Bug | Severity | Fix |
|---|-----|----------|-----|
| 43 | **Explorer zeigt WEITERHIN "Vault is empty"** — trotz mindestens 2 Dateien (My First Note + daily/2026-02-10.md) | P1 | Persistenter Bug. Root cause: `sidebar.refresh()` → `invoke('list_files')` schlägt fehl oder gibt leeres Array zurück. Oder: Datei-Cache (`_fileTreeCache`) wird nicht invalidiert nach File-Operationen |
| 44 | Daily Note Tab hat keinen dirty-Indicator obwohl sie gerade erst erstellt wurde mit Template-Content | P3 | Erwartetes Verhalten wenn Auto-Save greift |
| 45 | Breadcrumb zeigt "daily › 2026-02-10" — Folder "daily" existiert aber wird nicht im Explorer angezeigt | P1 | Folge-Bug von #43 |

---

## Code-basierte Bugs (aus Quellcode-Analyse)

| # | Bug | Severity | Datei | Beschreibung |
|---|-----|----------|-------|-------------|
| 46 | **innerHTML mit User-Content** — `showFileInRightPane()` setzt `preview.innerHTML = html` mit Markdown-gerenderten Inhalten. Die XSS-Prüfung ist rudimentär (prüft nur auf `<script` und `javascript:`) | P1 | `app.js` Zeile ~330 | DOMPurify einsetzen für HTML-Sanitization |
| 47 | **Doppeltes `aria-hidden="true"`** auf dem Mobile-Menu-SVG | P3 | `index.html` Zeile 23 | Eines der `aria-hidden` Attribute entfernen |
| 48 | **updateSettingsFromForm() liest Checkbox-Werte falsch** — `formData.get()` für Checkboxes gibt `"on"` oder `null` zurück, nicht `"true"` | P1 | `settings.js` `updateSettingsFromForm()` | Alle `=== 'true'` Checks für Checkboxes auf `=== 'on'` oder `!== null` ändern |
| 49 | **EditorFontSize Slider-Value-Label Selektor ist falsch** — `#editor-font-size + .slider-container .slider-value` erwartet `.slider-container` als Sibling, aber es ist ein Child | P2 | `settings.js` `bindEditorEvents()` | Selektor korrigieren: `.slider-container .slider-value` relativ zum Slider-Parent |
| 50 | **Folding-Modul deaktiviert aber Code noch importiert** — Unnötiger Import + Memory-Overhead | P3 | `app.js` Zeile 36 | Import entfernen wenn nicht genutzt |
| 51 | **CSS var referenziert undefined Token** — `var(--neutral-400)`, `var(--neutral-500)` werden in Scrollbar-Styles genutzt, aber nie definiert in style.css (nur in design-tokens.css vermutlich) | P2 | `style.css` Scrollbar-Bereich | Fallback-Werte hinzufügen: `var(--neutral-400, var(--scrollbar-thumb))` |
| 52 | **CSS `var(--space-2)`, `var(--font-size-sm)` etc. in Backlinks-Panel** werden referenziert aber nicht in style.css definiert — vermutlich in design-tokens.css, aber Fallback fehlt | P2 | `style.css` Backlinks-Section | Fallback-Werte hinzufügen |
| 53 | **`window._moduleLoaded = true` vor ES Module-Import** — In app.js steht `window._moduleLoaded = true` ganz oben, vor allen Imports. Da es ein gebundeltes File ist (`app.bundle.js`), ist das OK — aber die Imports nutzen ES-Module-Syntax, was im Bundle-Kontext irrelevant ist | P3 | `app.js` Zeile 1 | Aufräumen |

---

## Zusammenfassung

### Bugs pro Severity

| Severity | Anzahl | Beschreibung |
|----------|--------|-------------|
| **P0 (Blocker)** | **0** | — |
| **P1 (Major)** | **12** | Explorer "Vault is empty" (#8,#40,#42,#43,#45), Dirty-Indicator falsch (#9), Hotkeys leer (#20), Core Plugins falsche IDs (#22,#23), Bookmarks/Recent Panel nicht sichtbar (#36,#38), Graph View leer (#39), System Info "Loading..." (#28), XSS-Risk (#46), Settings Checkbox-Bug (#48) |
| **P2 (Minor)** | **14** | Status bar bei keinem File (#4), Create-Button ohne Validation (#6), Properties Panel Breite (#10), Settings als Overlay (#12), Line height Mismatch (#15), Checkbox defaults (#16), Hotkeys Empty-State (#21), Core Plugin Beschreibungen (#24), Safe Mode Logik (#25), Browse Plugins Placeholder (#26), Version Mismatch (#29), Settings persistent (#34), Outline Kontext (#37), CSS Token Fallbacks (#49,#51,#52) |
| **P3 (Cosmetic)** | **17** | Skip-Setup Hover (#2), Empty Vault State (#3), Tab bar leer (#5), Note Name Hint (#7), Cursor Position (#11), Tooltip Overlap (#13), Readonly Styling (#14), Slider Label (#17), Theme Preview (#18,#19), Fuzzy Search (#31), Badge Kontrast (#32), Missing Shortcuts (#33), Search Empty-State (#35), Graph Status bar (#41), Daily dirty (#44), Doppel aria-hidden (#47), Unused Import (#50,#53) |

### Gesamt: **43 Bugs**
- P0: 0
- P1: 12
- P2: 14
- P3: 17

### Top 3 Kritische Issues

1. **Explorer "Vault is empty" (P1, persistent über alle Screens)** — Die Sidebar refreshed nie korrekt. Dies betrifft die grundlegendste Funktionalität der App. Root cause: `invoke('list_files')` scheitert oder Cache wird nie invalidiert.

2. **Sidebar-Panels (Bookmarks, Recent) nicht sichtbar (P1)** — `switchSidebarPanel()` funktioniert für manche Panels nicht. Vermutlich CSS `opacity: 0` Transition-Bug oder DOM-Klassen-Fehler.

3. **Settings Checkbox-Werte werden nicht gespeichert (P1)** — `updateSettingsFromForm()` vergleicht mit `"true"` statt `"on"` — alle Boolean-Settings werden als `false` gespeichert.

### Empfehlungen

1. **Sofort fixen:** Explorer-Refresh, Sidebar-Panel-Switching, Settings-Checkbox-Bug
2. **Nächster Sprint:** Graph View, Hotkeys-Rendering, Core Plugin IDs, XSS-Sanitization
3. **Nice-to-have:** Cosmetic Fixes, UX-Verbesserungen
