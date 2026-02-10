# Oxidian v2.5 — UI/UX Review
**Datum:** 2026-02-10  
**Maßstab:** Obsidian Desktop (Dark Theme)  
**Screenshots:** 6 Screens (Welcome, Home, Settings, Search, New Note, Command Palette)

---

## Executive Summary

Oxidian v2.5 hat eine solide Grundstruktur mit erkennbarer Obsidian-Inspiration. Die Hauptprobleme sind:
1. **Settings als Tab statt Modal** — fundamentaler UX-Fehler
2. **Settings Content fehlt** — nur Navigation, keine Optionen (außer Hotkeys)
3. **Command Palette Typografie kaputt** — Category und Command-Name kleben zusammen
4. **Debug-Badges in Production** — "JS OK" / "MODULES FAILED" sichtbar
5. **Inkonsistente Spacing** — kein durchgängiges 8px-Grid

**Gesamtbewertung: 5/10** — Funktional, aber weit von Obsidian-Qualität entfernt.

---

## 1. Layout & Spacing

### 1.1 Welcome Screen (ui-1)
| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Vertikale Zentrierung | Exakt zentriert | Leicht nach oben verschoben (~35% statt 50%) | ⚠️ |
| Content-Breite | Max 480px | Unkontrolliert, scheint OK (~600px) | ✅ |
| Step-Indicator | Keiner (Obsidian hat kein Onboarding) | Dot-Stepper oben — gutes Pattern | ✅ |
| Button-Spacing | — | "Get Started" zu "Skip setup" = ~16px, OK | ✅ |

**Fix:**
```css
/* Vertikale Zentrierung verbessern */
.welcome-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh; /* statt fester Positionierung */
}
```

### 1.2 Home Screen (ui-2)
| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Sidebar-Breite | ~250px, resizable | ~280px, unklar ob resizable | ✅ |
| Icon-Sidebar links | 36px breit, 8px padding | ~44px, Icons gut platziert | ✅ |
| Content-Zentrierung | Leer = nichts anzeigen | Home-Tab mit CTA-Buttons | ✅ Gut! |
| Button-Stack Spacing | — | ~8px gap zwischen Buttons | ✅ |
| "QUICK TIPS" Section | Keine | Keyboard-Shortcuts angezeigt — nice | ✅ |
| "TAGS" Section unten | — | Leer, nimmt Platz weg | ⚠️ |

**Fix:**
```css
/* TAGS Section ausblenden wenn leer */
.sidebar-tags:empty,
.sidebar-tags:has(> :only-child:empty) {
  display: none;
}
```

### 1.3 Settings (ui-3, ui-4, ui-5)
**🔴 KRITISCH: Fundamentaler Layout-Fehler**

| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Container | Fullscreen Modal-Overlay | Tab im Editor-Bereich | ❌ |
| Layout | Sidebar links (240px) + Content rechts (flex) | Nur Sidebar zentriert, kein Content-Panel | ❌ |
| Schließen | X-Button oben rechts / Escape | Tab schließen | ⚠️ |
| Content | Jede Section hat Optionen | "General" = LEER, nur Hotkeys hat Content | ❌ |

**Das ist der größte UX-Fehler.** Details → Abschnitt 5.

### 1.4 Command Palette (ui-6)
| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Position | Oben zentriert, ~50% Breite | Zentriert, gute Breite | ✅ |
| Overlay | Dimmed Background | Dimmed Background | ✅ |
| Max-Height | ~60vh mit Scroll | Scheint unbegrenzt | ⚠️ |
| Item-Height | ~36px konsistent | ~40px, OK | ✅ |

---

## 2. Typografie

### 2.1 Allgemein
| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Body Font | Inter / System | Scheint System-Font, OK | ✅ |
| Body Size | 16px | ~16px | ✅ |
| Heading "Settings" | 24px, font-weight 700 | ~28px, bold — etwas zu groß | ⚠️ |
| Nav Items | 14px, 400 weight | ~14px, scheint OK | ✅ |

### 2.2 Command Palette — 🔴 KAPUTT
**Problem:** Category-Label und Command-Name sind zusammengeklebt ohne Trennung.

Beispiele aus Screenshot:
- `FileNew Note` statt `File → New Note`
- `FileOpen Daily Note` statt `File → Open Daily Note`  
- `FileSave Current File` statt `File → Save Current File`
- `NavigateQuick Switcher` statt `Navigate → Quick Switcher`

**Obsidian macht:** Category als farbigen Badge/Tag VOR dem Command-Namen, mit klarem Spacing.

**Fix:**
```css
/* Command Palette: Category von Command-Name trennen */
.command-palette-item .command-category {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.command-palette-item .command-name {
  /* Sicherstellen, dass es ein separates Element ist */
  margin-left: 4px;
}
```

**Oder im HTML/Template:**
```html
<!-- VORHER (vermutlich): -->
<span>{category}{name}</span>

<!-- NACHHER: -->
<span class="command-category">{category}</span>
<span class="command-name">{name}</span>
```

### 2.3 Shortcut-Badges (Home Screen)
- `Ctrl+P`, `Ctrl+N`, `/` als Badges — gut!
- Aber: Badge-Hintergrund ist zu dunkel, kaum von Background zu unterscheiden
- Obsidian's `kbd` Tags: Heller Hintergrund, klarer Border

**Fix:**
```css
.keyboard-shortcut kbd,
.quick-tip-key {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
}
```

---

## 3. Farben & Kontrast

### 3.1 Dark Theme Palette
| Element | Obsidian | Oxidian | Bewertung |
|---------|----------|---------|-----------|
| Background (main) | `#1e1e1e` | `#1a1a2e` (leicht bläulich) | ✅ Eigenständig, OK |
| Sidebar BG | `#262626` | `#1e1e3a` (dunkler, bläulich) | ✅ |
| Accent Color | `#7c5cff` (konfigurierbar) | `#7c5cff` (Lila/Violet) | ✅ |
| Text Primary | `#dcddde` | ~`#e0e0e0` | ✅ |
| Text Secondary | `#999` | ~`#888` | ⚠️ Etwas zu dunkel |
| Active Nav Item | Subtle highlight | Voller Accent-BG (`#7c5cff`) | ⚠️ Zu aggressiv |

### 3.2 WCAG Kontrast-Check
| Kombination | Ratio (geschätzt) | WCAG AA | WCAG AAA |
|------------|-------------------|---------|----------|
| Primary Text auf Main BG | ~12:1 | ✅ | ✅ |
| Secondary Text auf Main BG | ~5:1 | ✅ | ❌ |
| Accent auf Dark BG | ~4.8:1 | ✅ | ❌ |
| Nav Item auf Accent BG | ~7:1 | ✅ | ✅ |

**Insgesamt OK für Dark Theme.** Sekundärtext könnte heller sein.

### 3.3 Active Nav Highlight
**Obsidian:** Subtiler Background-Shift (`rgba(255,255,255,0.05)`) + linker Accent-Border  
**Oxidian:** Voller `#7c5cff` Background auf dem aktiven Item — zu laut

**Fix:**
```css
.settings-nav-item.active {
  background: rgba(124, 92, 255, 0.15); /* statt solid */
  border-left: 2px solid var(--accent-color);
  color: var(--text-normal);
}

.settings-nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

### 3.4 Debug-Badges entfernen
**🔴 "JS OK ✓ (inline)" und "MODULES FAILED ✗"** sind auf JEDEM Screenshot sichtbar (oben rechts, grün/rot). Das sind offensichtlich Debug-Indicators die in Production nicht sichtbar sein sollten.

**Fix:**
```css
/* Sofort: Debug-Badges verstecken */
.debug-status-badge,
[data-debug-indicator] {
  display: none !important;
}
```
Besser: Im Code hinter ein `DEV`/`DEBUG` Flag setzen.

---

## 4. Interaktionsmuster

### 4.1 Buttons
| Aspekt | Obsidian | Oxidian | Bewertung |
|--------|----------|---------|-----------|
| Primary Button | Accent-BG, 6px radius, subtle shadow | Accent-BG (`#7c5cff`), rounded | ✅ |
| Secondary Button | Ghost/Outline | Darker BG, kein Outline | ⚠️ |
| Button Height | 32-36px | ~40-44px (etwas zu groß) | ⚠️ |

**Fix:**
```css
.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--text-normal);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.25);
}
```

### 4.2 Icon-Sidebar (links)
- Icons gut erkennbar, gute Größe (~20px)
- Aktives Icon hat Accent-Hintergrund — **zu aggressiv** (gleicher Fehler wie Settings-Nav)
- Tooltip "Settings" erscheint unten links — sollte rechts neben Icon sein

**Fix:**
```css
.sidebar-icon.active {
  background: rgba(124, 92, 255, 0.2);
  border-radius: 6px;
}

.sidebar-icon-tooltip {
  /* Rechts positionieren statt unten */
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
}
```

### 4.3 Tab Bar
- "Settings" Tab mit Zahnrad-Icon — gut
- "+" Button zum neuen Tab — gut
- Back/Forward Navigation (`← →`) in der Toolbar — gut
- Aber: Edit-Icon rechts oben (Stift) — Zweck unklar

---

## 5. Settings UX — 🔴 Kritischer Bereich

### 5.1 Aktueller Zustand
1. Settings öffnet als **Tab** im Editor-Bereich
2. Zeigt nur eine **Sidebar-Navigation** (General, Editor, Files & Links, etc.)
3. **KEIN Content-Panel** rechts — "General" ist ausgewählt aber rechts ist LEER
4. Nur **Hotkeys** hat tatsächlichen Content (ui-5: "Customize keyboard shortcuts" + Search)
5. Sidebar nimmt ~200px ein, zentriert in einem ~700px Bereich — verschwendeter Platz

### 5.2 Wie Obsidian es macht
```
┌──────────────────────────────────────────────────┐
│ Settings                                    [X]  │
├──────────────┬───────────────────────────────────┤
│              │                                   │
│  General     │  General                          │
│  Editor      │  ─────────                        │
│  Files       │                                   │
│  Appearance  │  Language: [English ▼]             │
│  Hotkeys     │                                   │
│  Core plug.  │  ☐ Auto-update                    │
│  Comm. plug. │                                   │
│  About       │  Vault name: [My Vault]           │
│              │                                   │
│              │  ... more options ...              │
│              │                                   │
└──────────────┴───────────────────────────────────┘
```

- **Fullscreen Modal** — überlagert alles, klare Fokussierung
- **2-Column Layout** — Navigation links (240px), Content rechts (flex)
- **Jede Section hat Content** — Toggles, Dropdowns, Inputs
- **Escape / X** schließt → zurück zum Editor

### 5.3 Empfohlene Architektur-Änderung

**Option A (Empfohlen): Fullscreen Modal**
```css
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--background-primary);
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
}

.settings-modal-header {
  grid-column: 1 / -1;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-nav {
  padding: 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
}

.settings-content {
  padding: 24px 40px;
  overflow-y: auto;
  max-width: 800px;
}
```

**Option B: Tab beibehalten, aber 2-Column Layout fixen**
```css
.settings-tab-content {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100%;
  gap: 0;
}

.settings-tab-nav {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px;
}

.settings-tab-panel {
  padding: 24px 32px;
  overflow-y: auto;
}
```

### 5.4 Fehlende Settings-Content Panels
Jede Section braucht echten Content. Minimum für v2.5:

| Section | Minimum Content |
|---------|----------------|
| **General** | Vault-Pfad anzeigen, Sprache, Auto-Save Toggle |
| **Editor** | Font Size Slider, Line Height, Tab Size, Vim Mode Toggle |
| **Files & Links** | Default Location for new Notes, Attachment Folder |
| **Appearance** | Theme Toggle (Light/Dark), Accent Color Picker, Font Family |
| **Hotkeys** | ✅ Bereits vorhanden |
| **Core plugins** | Liste mit Toggles |
| **Community plugins** | Placeholder mit "Coming soon" |
| **About** | Version, Links zu GitHub, License |

---

## 6. Screen-by-Screen Fixes (Priorität)

### P0 — Sofort fixen
1. **Debug-Badges entfernen** — auf jedem Screenshot sichtbar
2. **Command Palette Typografie** — Category+Name zusammengeklebt
3. **Settings Content-Panels** — mindestens General + About implementieren

### P1 — Nächstes Release
4. **Settings als Modal** statt Tab (oder zumindest 2-Column Layout)
5. **Active-State Highlights abschwächen** — Accent zu aggressiv
6. **Sekundärtext-Kontrast erhöhen** — `#999` statt `#888`

### P2 — Polish
7. **Welcome Screen vertikal zentrieren**
8. **Tooltip-Positionierung** (rechts statt unten)
9. **Button-Sizing** auf 36px normalisieren
10. **TAGS Section** im Sidebar ausblenden wenn leer

---

## 7. Zusammenfassung der CSS-Änderungen

### Datei: `styles/settings.css` (oder equivalent)
```css
/* Settings → Modal statt Tab */
.settings-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg-primary);
  display: grid;
  grid-template-columns: 240px 1fr;
}

/* Active Nav: subtiler */
.settings-nav-item.active {
  background: rgba(124, 92, 255, 0.15);
  border-left: 2px solid var(--accent);
}
```

### Datei: `styles/command-palette.css`
```css
/* Category Badge vom Command-Name trennen */
.command-item .category {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11px;
  text-transform: uppercase;
}
```

### Datei: `styles/global.css`
```css
/* Debug-Badges nur in Dev */
.debug-badge { display: none; }

/* Sekundärtext heller */
:root {
  --text-muted: #a0a0a0; /* statt #888 */
}

/* Sidebar Icons: subtilerer Active-State */
.nav-icon.active {
  background: rgba(124, 92, 255, 0.2);
}
```

---

## 8. Was Oxidian GUT macht (Obsidian-Vergleich)

- ✅ **Home Tab mit CTAs** — Obsidian zeigt nichts bei leerem Vault, Oxidian hat Welcome + Quick Tips
- ✅ **Onboarding Flow** — Obsidian hat keinen Step-by-Step Wizard
- ✅ **Icon-Sidebar** — Optisch nahe an Obsidian, erkennbare Icons
- ✅ **Dark Theme Farbpalette** — Der bläuliche Ton gibt Oxidian Eigenständigkeit
- ✅ **Status Bar** — Backlinks, Word Count, Line/Col — wie Obsidian
- ✅ **Command Palette Position & Overlay** — Korrekt implementiert
- ✅ **Tab-Bar** — Funktional, Close/New Buttons vorhanden

---

*Report generiert: 2026-02-10 22:51 CET*  
*Reviewer: AI UI/UX Subagent*  
*Nächste Review: Nach Implementation der P0-Fixes*
