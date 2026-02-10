# QA Report — Oxidian v2.5
**Date:** 2026-02-10  
**Tester:** Automated QA (Subagent)  
**Platform:** Tauri v2, WebKitGTK (Linux)

---

## 🔴 Kritische Bugs

### BUG-001: Settings-Sections laden nicht — Content-Bereich leer
**Priorität:** P0 — Blocker  
**Screenshots:** ui-3-settings.png, ui-4-search.png  
**Dateien:** `src/js/settings.js` (Zeile ~169), `src/css/style.css` (Zeile 3280-3284)

**Beschreibung:**  
Beim Öffnen der Settings wird der Nav-Sidebar korrekt gerendert ("General" ist highlighted), aber der Content-Bereich rechts ist komplett leer. Erst beim Klick auf "Hotkeys" erscheint Content (sichtbar in ui-5-newnote.png).

**Root Cause:**  
In `settings.js`, Methode `show()` (Zeile ~169): Es wird `initializeSection(this.activeSection)` aufgerufen, aber **nicht** `switchToSection()`. Die `renderHTML()`-Methode rendert alle `<section class="settings-section" data-section="...">` **ohne** die CSS-Klasse `active`. Die CSS-Regel `settings-section { display: none; }` (style.css Zeile 3280) versteckt alle Sections. Nur `switchToSection()` fügt `.active` hinzu — wird aber erst bei Klick auf Nav-Items ausgelöst.

**Fix:**
```javascript
// settings.js, show() method, nach Zeile 169:
async show(container) {
    await this.load();
    this.paneEl = container;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'settings-page';
    wrapper.innerHTML = this.renderHTML();
    container.appendChild(wrapper);

    this.bindEvents(wrapper);
    this.switchToSection(this.activeSection, wrapper);  // ← FIX: statt initializeSection
    this.initializeSection(this.activeSection);
}
```

---

### BUG-002: "MODULES FAILED ✗" Debug-Badge in Production UI
**Priorität:** P1  
**Screenshots:** Alle Screenshots (ui-1 bis ui-6)

**Beschreibung:**  
In der oberen rechten Ecke werden zwei Debug-Badges angezeigt: "JS OK ✓ (inline)" (grün) und "MODULES FAILED ✗" (rot). Diese sind in allen Views sichtbar und überdecken teilweise UI-Elemente.

**Probleme:**
1. Debug-Overlay sollte nicht in Production sichtbar sein
2. "MODULES FAILED" deutet auf ein echtes Ladeproblem der ES-Module hin (`app.bundle.js`)
3. Badges überdecken den View-Toolbar-Bereich (sichtbar in ui-3)

**Fix:**
- Debug-Badges hinter einem `developer_mode`-Flag verstecken
- Root Cause für Module-Failure untersuchen (WebKitGTK ES-Module-Support?)

---

### BUG-003: Settings öffnet als Tab statt Modal
**Priorität:** P1  
**Screenshots:** ui-3-settings.png  
**Dateien:** `src/js/app.js` (Zeile 1048)

**Beschreibung:**  
Settings öffnet als Tab in der Tab-Bar mit Navigation-Buttons (←/→) und einem "+" Button. In Obsidian öffnet Settings als Fullscreen-Modal-Overlay. Das aktuelle Verhalten ist verwirrend weil:
- Man sieht weiterhin Sidebar + Statusbar (irrelevant für Settings)
- Es gibt Back/Forward-Navigation die für Settings keinen Sinn macht
- Tab kann neben anderen Tabs geöffnet bleiben

**Fix:**  
Settings als Modal-Overlay implementieren (ähnlich `#new-note-dialog`), das über die gesamte Content-Area liegt, mit eigenem Close-Button (Escape oder X).

---

## 🟡 UI Bugs

### BUG-004: Command Palette — Kategorie-Labels kleben an Command-Namen
**Priorität:** P2  
**Screenshot:** ui-6-cmdpalette.png

**Beschreibung:**  
In der Command Palette sind Kategorie-Präfixe ("File", "Navigate") direkt ohne Leerzeichen am Command-Namen angeklebt:
- "FileNew Note" statt "File → New Note"
- "FileOpen Daily Note" statt "File → Open Daily Note"  
- "NavigateQuick Switcher" statt "Navigate → Quick Switcher"

**Fix:**  
Separator zwischen Kategorie und Command einfügen (z.B. ` → ` oder CSS `margin-right` auf das Category-Badge).

---

### BUG-005: Settings-Sidebar hat nur linke Spalte — kein Content-Bereich sichtbar
**Priorität:** P2 (hängt mit BUG-001 zusammen)  
**Screenshot:** ui-3-settings.png

**Beschreibung:**  
Die Settings-Page zeigt nur die Navigation (links, ~200px breit, zentriert im Content-Bereich). Der gesamte rechte Bereich ist leer/schwarz. Das Layout wirkt kaputt — die Nav-Sidebar sollte links anliegen und der Content rechts den verbleibenden Platz füllen.

**Vermutung:** Möglicherweise rendert die `.settings-container` kein korrektes Flexbox/Grid-Layout, oder der Container bekommt nicht die volle Breite im Tab-Modus.

---

### BUG-006: Statusbar zeigt statische Werte auf Welcome Screen
**Priorität:** P3  
**Screenshot:** ui-2-home.png

**Beschreibung:**  
Die Statusbar zeigt "1 min read · 0 words · 0 characters · Ln 1, Col 1" obwohl kein Dokument geöffnet ist (Welcome Screen). Der Statusbar sollte entweder leer sein oder ausgeblendet werden wenn kein Editor aktiv ist.

---

### BUG-007: Sidebar zeigt "Vault is empty" als File-Tree-Eintrag
**Priorität:** P3  
**Screenshot:** ui-2-home.png

**Beschreibung:**  
Im Explorer-Panel steht "📁 Vault is empty" als einzelner Eintrag. Das ist funktional korrekt, aber es gibt kein visuelles Affordance (z.B. "Click here to create your first note" oder einen Button). Der leere State könnte besser gestaltet sein.

---

## 🟠 UX Probleme

### UX-001: Kein sichtbarer "New Note" Dialog in Screenshots
**Screenshot:** ui-5-newnote.png zeigt eigentlich die Settings (Hotkeys-Section), nicht einen New-Note-Dialog.

**Hinweis:** Die Screenshot-Benennung "ui-5-newnote.png" scheint falsch — das Bild zeigt die Settings mit der Hotkeys-Section aktiv. Entweder der Screenshot ist falsch benannt oder der New-Note-Flow wurde nicht korrekt aufgenommen.

---

### UX-002: Onboarding zeigt Module-Error — User sieht "MODULES FAILED"
**Priorität:** P1  
**Screenshot:** ui-1-welcome.png

**Beschreibung:**  
Das allererste was ein neuer User sieht ist "MODULES FAILED ✗" in rot. Das erweckt sofort den Eindruck dass die App kaputt ist. Kritisch für First Impression.

---

### UX-003: Search-Sidebar bleibt aktiv wenn Settings-Tab geöffnet
**Screenshot:** ui-4-search.png

**Beschreibung:**  
Wenn man vom Search-Panel aus die Settings öffnet, bleibt das Search-Panel in der Sidebar aktiv (mit leerem Search-Input). Die Sidebar ist für Settings irrelevant — sie sollte entweder ausgeblendet oder auf den Explorer zurückgesetzt werden.

---

### UX-004: Tags-Section am unteren Sidebar-Rand ohne Inhalt
**Screenshot:** ui-2-home.png

**Beschreibung:**  
Die "TAGS" Section am unteren Rand der Sidebar ist sichtbar aber leer. Bei leerem Vault wäre es besser, diese Section komplett auszublenden.

---

## 📊 Zusammenfassung

| Kategorie | Anzahl | Höchste Prio |
|-----------|--------|-------------|
| Kritisch  | 3      | P0          |
| UI Bugs   | 4      | P2          |
| UX Issues | 4      | P1          |

### Top-3 Fixes nach Impact:

1. **BUG-001** (P0): `switchToSection()` in `show()` aufrufen → 1-Zeilen-Fix, behebt Settings komplett
2. **BUG-002** (P1): Debug-Badges entfernen/verstecken → betrifft First Impression
3. **BUG-004** (P2): Command Palette Kategorie-Spacing → einfacher CSS/Template-Fix
