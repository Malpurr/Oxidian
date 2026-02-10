# Oxidian v2.2.0 — Full End-User Review
**Perspektive:** Obsidian Power-User (täglich PKM, Daily Notes, Linking, Plugins)  
**Datum:** 2026-02-10  
**Analysiert:** 19 Screenshots (01-onboarding bis 19-daily-note)

---

## 1. Erster Eindruck — Würde ich wechseln?

**Kurz: Nein. Noch nicht.**

Oxidian sieht auf den ersten Blick vertraut aus — Dark Theme, lila Akzentfarbe, Left Sidebar mit Icons. Als Obsidian-User fühle ich mich sofort "zu Hause", was gut ist. Das Onboarding ist sauber (4-Step-Wizard mit Skip-Option), die Welcome-Page zeigt Quick Actions. Der Live-Preview-Editor existiert, Properties-Panel ist da, Status Bar mit Backlinks/Wordcount ebenfalls.

**Aber:** Die Vertrautheit ist oberflächlich. Unter der Haube fehlt fast alles, was meinen Workflow ausmacht. Es fühlt sich an wie Obsidian v0.6 — die Grundstruktur steht, aber die Tiefe fehlt. Als Tech-Demo: beeindruckend. Als Daily Driver: unmöglich.

**Positiv:**
- Tauri + Rust = deutlich kleiner und schneller als Electron
- Open Source (MIT) — das ist ein echtes Argument vs. Obsidians proprietärem Core
- Sauberes UI, keine hässlichen Kompromisse
- Properties-Panel von Anfang an dabei
- Daily Notes mit `daily/YYYY-MM-DD` Ordnerstruktur

---

## 2. Feature-Parität — Was kann Obsidian, was hier fehlt?

### Editor
- **Kein sichtbarer Source Mode** — Nur Live Preview. Wo ist Raw Markdown?
- **Kein Reading Mode** — Drei-Modi-System (Source/Live/Reading) fehlt komplett
- **Keine Toolbar/Formatting Bar** — Kein Button für Bold, Italic, Links. Alles blind tippen
- **Keine Callouts/Admonitions** — Unklar ob unterstützt
- **Kein Embed-Support** — `![[note]]` oder `![[image.png]]` nicht sichtbar
- **Keine Canvas** — Obsidians visuelles Board fehlt komplett

### Linking & Navigation
- **Kein `[[wikilink]]`-Autocomplete sichtbar** — Der Kern von Obsidian. Tippe ich `[[` und bekomme Vorschläge? Unklar
- **Keine Backlinks-Panel** — Status Bar zeigt "0 backlinks", aber kein dediziertes Panel
- **Keine Unlinked Mentions** — Obsidians Killer-Feature für Entdeckung
- **Kein Hover-Preview** — `Ctrl+Hover` über Links zeigt keinen Preview

### Graph View
- **Leer und funktionslos** — Keine Filter, keine Farben, keine Gruppen, kein Zoom-UI, keine lokale Graph-View
- Graph scheint nur als leere Canvas zu existieren

### Search
- **Nur Textfeld** — Keine Regex, kein `path:`, `tag:`, `file:` Operatoren
- **Keine Suchfilter** (Case-Sensitive, Match-Whole-Word)
- **Kein Search & Replace** (global)

### Plugins
- **Core Plugins: 2 Stück** mit kryptischen Namen (`enabled_plugins`, `plugin_settings`) — vs. Obsidians ~25 Core Plugins
- **Community Plugins: 0** — Infrastruktur existiert (Browse, Install from folder, Safe Mode), aber kein Ökosystem
- **Kein Dataview** — Deal-Breaker für viele Power-User
- **Kein Templater** — Nur leere Daily Notes ohne Template

### Settings
- **Hotkeys: Leer** — Nur Suchfeld, keine konfigurierbaren Shortcuts sichtbar. Obsidian hat ~300+
- **Files & Links Settings** — Existiert als Menüpunkt, nicht analysiert
- **Kein Vim-Mode** erwähnt
- **Kein Custom CSS/Themes** — Nur Accent-Color und Light/Dark

### Workspace
- **Keine Split Panes** — Kein Seite-an-Seite-Editing sichtbar
- **Keine Tabs-Gruppen** — Tabs existieren, aber kein Tab-Stacking oder Pinning
- **Kein Workspace-Saving** — Layouts speichern und laden

---

## 3. Workflow-Test — Mein täglicher Flow

| Schritt | Obsidian | Oxidian | Urteil |
|---------|----------|---------|--------|
| **Daily Note öffnen** | `Ctrl+D` oder Calendar-Plugin | `Ctrl+D` ✅ | ✅ Funktioniert |
| **Template einfügen** | Templater → Auto-Insert | Keine Templates | ❌ Blank Page |
| **Schreiben** | Live Preview + Toolbar | Live Preview, kein Toolbar | ⚠️ Basics ja |
| **Linking (`[[`)** | Autocomplete mit Fuzzy-Search | Unklar ob Autocomplete existiert | ❓ Kritisch |
| **Tags setzen** | `#tag` + Tag-Pane | Tag-Section existiert (leer) | ⚠️ Unklar |
| **Quick Switcher** | `Ctrl+O` mit Fuzzy-Match | `Ctrl+O` existiert | ⚠️ Nicht getestet |
| **Suchen** | `Ctrl+Shift+F` + Operatoren | `Ctrl+Shift+F` nur Textfeld | ⚠️ Zu simpel |
| **Backlinks reviewen** | Dediziertes Panel | Nur Zahl in Status Bar | ❌ Unbrauchbar |
| **Graph explorieren** | Filter + Farben + Gruppen | Leere Canvas | ❌ Nutzlos |

**Ergebnis:** Ich komme bis "Schreiben", dann bricht der Flow. Linking-Autocomplete ist unklar, Templates fehlen, Backlinks-Review ist unmöglich. **Vielleicht 30% meines Workflows abgedeckt.**

---

## 4. Settings — Vollständig und verständlich?

**Verständlich: Ja.** Klare Sprache, logische Gruppierung, sauberes UI.

**Vollständig: Nein.**

- **General:** Vault-Pfad, Sprache, Startup-Behavior — OK, aber minimal
- **Editor:** Font, Font-Size, Line-Height, Line Numbers, Readable Line Length — Basics. Kein Vim-Mode, kein Smart-Indent, kein Auto-Pair-Brackets, kein Spell-Check
- **Appearance:** Dark/Light/System + Accent Color + Interface Font — Kein Custom CSS, keine Themes
- **Hotkeys:** Komplett leer. Nur eine Suchleiste ohne Ergebnisse. Das ist ein Showstopper
- **Core Plugins:** 2 mit generischen Beschreibungen — nicht hilfreich
- **Community Plugins:** Infrastruktur da, Ökosystem nicht
- **About:** Version, License, Built-With — Standard

**Obsidian hat ~50+ Editor-Settings allein.** Oxidian hat ~5.

---

## 5. Muscle Memory — Shortcuts

| Shortcut | Obsidian | Oxidian | Status |
|----------|----------|---------|--------|
| `Ctrl+N` | Neue Note | Neue Note | ✅ |
| `Ctrl+D` | Daily Note | Daily Note | ✅ |
| `Ctrl+S` | Speichern | Speichern | ✅ |
| `Ctrl+O` | Quick Switcher | Quick Switcher | ✅ |
| `Ctrl+Shift+F` | Globale Suche | Globale Suche | ✅ |
| `Ctrl+F` | Find in File | Find in File | ✅ |
| `Ctrl+P` | Command Palette | ❓ Nicht im Palette sichtbar | ❌ |
| `Ctrl+E` | Toggle Edit/Preview | ❓ | ❌ |
| `Ctrl+G` | Graph View | ❓ | ❌ |
| `Ctrl+B/I/K` | Bold/Italic/Link | ❓ | ❌ |
| `Ctrl+L` | Toggle Checkbox | ❓ | ❌ |
| `Ctrl+Shift+]` | Indent | ❓ | ❌ |

**Ergebnis:** Die Grundlagen stimmen (6 von ~30 wichtigen Shortcuts). Aber die Hotkeys-Seite ist leer — ich kann nichts anpassen. Für einen Power-User der Custom-Bindings hat: inakzeptabel.

---

## 6. Deal-Breaker — Was schickt mich sofort zurück?

1. **🔴 Kein funktionierendes `[[wikilink]]`-Autocomplete** — Ohne das ist es kein PKM-Tool. Es ist Notepad mit Theme.

2. **🔴 Kein Plugin-Ökosystem** — Ich brauche Dataview, Templater, Calendar, Kanban, Tasks. Zero Community Plugins = Zero Workflow.

3. **🔴 Hotkeys nicht konfigurierbar** — Die Seite ist leer. Ich kann NICHTS anpassen.

4. **🔴 Keine Templates für Daily Notes** — Eine leere Seite pro Tag ist nutzlos. Mein Daily Note Template hat 6 Sections, Datums-Variablen, und Links.

5. **🟡 Kein Backlinks-Panel** — Ich brauche das für mein Weekly Review. Nur eine Zahl in der Status Bar reicht nicht.

---

## Top-15 Feature-Gaps (Obsidian → Oxidian)

Sortiert nach Wichtigkeit für den durchschnittlichen Power-User:

| # | Feature | Warum kritisch | Betrifft |
|---|---------|---------------|----------|
| **1** | **`[[Wikilink]]`-Autocomplete mit Fuzzy-Search** | DAS Kern-Feature. Ohne Autocomplete kein Zettelkasten, kein PKM, kein Linking-Workflow. | Linking |
| **2** | **Plugin-Ökosystem (Dataview, Templater, Tasks, Calendar)** | Power-User leben von Plugins. 1700+ in Obsidian vs. 0 in Oxidian. | Extensibility |
| **3** | **Konfigurierbare Hotkeys** | Seite existiert, ist aber leer. Power-User passen ALLES an. | Productivity |
| **4** | **Templates (insbesondere für Daily Notes)** | Leere Daily Notes = nutzlos. Brauche Variablen (`{{date}}`, `{{title}}`), Sections, Auto-Links. | Daily Workflow |
| **5** | **Backlinks-Panel (inkl. Unlinked Mentions)** | Backlinks sind die zweite Hälfte des Bi-Directional-Linking-Versprechens. Status-Bar-Zahl reicht nicht. | Knowledge Discovery |
| **6** | **Graph View mit Filtern, Farben, Gruppen** | Aktuell eine leere Canvas. Brauche: Node-Filter, Tag-Farben, Orphan-Highlighting, Local Graph. | Visualization |
| **7** | **Source Mode / Reading Mode** | Nur Live Preview reicht nicht. Source Mode für YAML-Frontmatter-Editing, Reading Mode für Review. | Editor |
| **8** | **Split Panes / Multi-Window** | Side-by-Side-Editing ist essentiell. Quellnote links, Zielnote rechts. | Workspace |
| **9** | **Search Operatoren (`path:`, `tag:`, `file:`, Regex)** | Einfache Textsuche skaliert nicht bei 1000+ Notes. | Search |
| **10** | **Custom CSS / Themes** | Obsidian hat 200+ Community Themes. Oxidian nur Accent-Color. | Personalization |
| **11** | **Embed-Syntax (`![[note]]`, `![[image.png]]`)** | Transclusion ist ein Core-Feature für MOCs und Dashboards. | Content Composition |
| **12** | **Callouts / Admonitions** | `> [!info]` Blöcke sind Standard in jedem modernen PKM-Setup. | Formatting |
| **13** | **Tag-Pane mit Hierarchischen Tags** | Tags existieren laut UI, aber kein Pane zum Browsen. Nested Tags (`#project/oxidian`) unklar. | Organization |
| **14** | **Canvas (Visual Board)** | Obsidian Canvas für Brainstorming, Projektplanung, Visual Thinking. | Creative Workflow |
| **15** | **Vim-Keybindings** | ~20% der Power-User nutzen Vim-Mode. Kein Hinweis auf Support. | Editor |

---

## Gesamtbewertung

| Kategorie | Score (1-10) | Kommentar |
|-----------|:---:|-----------|
| Erster Eindruck | **7** | Sieht gut aus, fühlt sich modern an |
| Feature-Parität | **2** | ~15-20% von Obsidian abgedeckt |
| Workflow-Abdeckung | **3** | Basics ja, alles darüber hinaus nein |
| Settings | **3** | Struktur gut, Inhalt dünn |
| Muscle Memory | **4** | 6 Core-Shortcuts stimmen |
| Stabilität/Performance | **?** | Nicht testbar via Screenshots |
| **Gesamt** | **3/10** | Vielversprechend, aber nicht nutzbar als Daily Driver |

## Fazit

Oxidian ist ein **vielversprechendes Fundament** — Tauri/Rust statt Electron, MIT-Lizenz, sauberes UI. Für v2.2.0 ist die Basis solide: Editor funktioniert, Dark/Light Theme, Daily Notes, Properties-Panel, Tab-System.

**Aber als Obsidian-Replacement? Nicht mal annähernd.** Es fehlt fast alles, was Obsidian zu einem PKM-Tool statt einem Markdown-Editor macht. Die fehlenden Wikilink-Autocomplete, Templates, Backlinks-Panel, und konfigurierbaren Hotkeys machen es für Power-User unbrauchbar.

**Meine Empfehlung:** Ich beobachte das Projekt. Wenn Items 1-5 der Feature-Gap-Liste implementiert sind, teste ich erneut. Bis dahin bleibt Obsidian mein Daily Driver.

**Wechsel-Trigger:** `[[`-Autocomplete + Templates + Backlinks-Panel + Plugin-API = erneuter Test.
