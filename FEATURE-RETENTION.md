# Oxidian — Knowledge Retention System ("Remember")

## Konzept
Neue Sidebar-Seite "Remember" (Gehirn-Icon 🧠) die das Problem aus dem Video löst:
**"Ich lese Bücher/Artikel und vergesse alles."**

Kombination aus Ryan Holiday's Notecard-System + Spaced Repetition + Obsidian-Style.

## Sidebar-Integration
- Neuer Tab in der linken Sidebar neben Files/Search/Graph/Bookmarks
- Icon: 🧠 oder Gehirn-SVG
- Eigener Panel-Bereich der den Main Content nicht ersetzt

---

## Features

### 1. Reading List & Quellen-Manager
- Bücher/Artikel/Podcasts/Videos als Quellen erfassen
- Felder: Titel, Autor, Typ (Buch/Artikel/Video/Podcast), Status (Lese ich/Gelesen/Will lesen), Rating
- Jede Quelle bekommt automatisch eine "Literature Note" (.md Datei im `Sources/` Ordner)
- Progress-Tracking: Wie viel gelesen, wann angefangen/fertig

### 2. Highlight & Extract System
- In jeder Literature Note: Highlights/Zitate sammeln
- Button "→ Extract to Card" — macht aus einem Highlight eine eigene Atomic Note (Karteikarte)
- Karteikarten landen im `Cards/` Ordner
- Jede Karte hat: Idee (Vorderseite), Erklärung (Rückseite), Quelle, Tags, Schwierigkeitsgrad

### 3. Spaced Repetition Engine
- Algorithmus basierend auf SM-2 (wie Anki)
- Jede Karte hat: Interval, EaseFactor, NextReview Datum
- Tägliche Review-Session: Zeigt fällige Karten
- Bewertung: Again (0) / Hard (1) / Good (2) / Easy (3)
- Karten die man oft vergisst kommen häufiger
- Stats: Streak, Total Reviews, Retention Rate

### 4. Daily Review Dashboard (Die Hauptansicht)
- "Heute fällig: X Karten" — großer Start-Review-Button
- Karten-Ansicht: Frage → Klick → Antwort → Bewertung
- Random Highlight des Tages (wie Readwise)
- Letzte Quellen / Kürzlich hinzugefügt
- Retention-Statistiken (Heatmap wie GitHub Contributions)

### 5. Themen & Kategorien
- Tags/Themen für Karten: Philosophie, Psychologie, Business, etc.
- Filtere Review nach Thema
- Cluster-Ansicht: Welche Themen haben die meisten Karten?

### 6. Smart Connections
- Wenn eine neue Karte erstellt wird: Zeige verwandte existierende Karten
- "Diese Idee ist verwandt mit..." → automatisch [[Link]] vorschlagen
- Integration mit Graph View: Karten als eigener Node-Typ

---

## Technische Umsetzung

### Dateien
- `src/js/remember.js` — Hauptmodul, Sidebar-Panel, UI
- `src/js/remember-sources.js` — Quellen-Manager (CRUD für Bücher/Artikel)
- `src/js/remember-cards.js` — Karteikarten-System (Create, Edit, Delete)
- `src/js/remember-review.js` — Spaced Repetition Engine + Review UI
- `src/js/remember-stats.js` — Statistiken, Heatmap, Streak
- `src/js/remember-dashboard.js` — Dashboard/Hauptansicht
- `src/css/remember.css` — Styling für alle Remember-Komponenten

### Daten-Speicherung
- Alles in Markdown-Dateien (Obsidian-kompatibel!)
- Sources: `Sources/Buchname.md` mit YAML Frontmatter (author, type, status, rating, started, finished)
- Cards: `Cards/Idee-Titel.md` mit Frontmatter (source, tags, interval, ease, next_review, created)
- Config: `.oxidian/remember-config.json` (daily card limit, review time, theme)
- Stats: `.oxidian/remember-stats.json` (streaks, total reviews, per-day history)

### Frontmatter-Schema für Cards
```yaml
---
type: card
source: "[[Courage Is Calling]]"
tags: [stoicism, courage]
interval: 4
ease: 2.5
next_review: 2026-02-14
last_review: 2026-02-10
review_count: 3
created: 2026-02-10
---
# Die Idee (Vorderseite)

Erklärung, Kontext, eigene Gedanken (Rückseite)

> "Original Zitat aus dem Buch" — Autor
```

### UI Design (Obsidian-Style)
- Dark theme, gleiche Farben wie restliches Oxidian
- Karten: Rounded corners, subtle shadow, flip-animation
- Review: Vollbild-mäßig im Content-Bereich, große lesbare Schrift
- Stats: CSS-Grid Heatmap, Streak-Counter mit Flamme 🔥
- Smooth transitions, keine externen UI-Libraries
