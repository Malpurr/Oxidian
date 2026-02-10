# CSS Fix Batch 1 — 2026-02-10

## Problem 1: Undefinierte CSS-Variablen
**Status:** ✅ Kein Fix nötig  
**Analyse:** `design-tokens.css` wird in `index.html` (Zeile 7) VOR `style.css` geladen. Alle `--space-*`, `--primary-*`, `--neutral-*` etc. sind in `:root` definiert und resolven korrekt. Zusätzlich existiert `design-tokens-compatibility.css` (Zeile 8) als Bridge-Layer. Die Variablen sind verfügbar — style.css überschreibt einige semantische Vars (z.B. `--bg-primary`) mit Hardcoded-Werten, was gewollt ist (style.css = authoritative theme).

## Problem 2: WCAG Kontrast-Failure `--text-muted`
**Status:** ✅ Gefixt  
**Datei:** `style.css` `:root`  
**Vorher:** `--text-muted: #686a6e` (~3.2:1 gegen `#1e1e2e`)  
**Nachher:** `--text-muted: #9ca3af` (~5.4:1 gegen `#1e1e2e` — WCAG AA konform)  
**Betrifft:** Status bar, panel titles, breadcrumbs, muted labels

## Problem 3: Graph View Canvas Flash
**Status:** ✅ Gefixt  
**Datei:** `style.css` Zeile ~1383  
**Fix:** `background: var(--bg-primary);` zu `.graph-pane canvas` hinzugefügt  
**Effekt:** Canvas hat sofort den Theme-Background, kein weißer Flash mehr

## Problem 4: Ribbon Active-State
**Status:** ✅ Gefixt  
**Datei:** `style.css` Zeile ~607  
**Vorher:** `background: rgba(127, 109, 242, 0.12)` (hardcoded)  
**Nachher:** `background: rgba(var(--accent-rgb), 0.15)` (token-basiert, etwas subtiler sichtbar)  
**Zusätzlich:** `--accent-rgb: 127, 109, 242` in `:root` definiert für flexible Alpha-Compositing
