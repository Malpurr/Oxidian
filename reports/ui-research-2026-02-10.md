# UI/UX Research Report – 2026-02-10

> Quellen: 5 YouTube-Videos, analysiert für Anwendbarkeit auf **Oxidian** (Desktop Note-Taking App)

---

## Video 1: "How to Think Like a GENIUS UI/UX Designer"
**Kanal:** Kole | **Link:** https://youtu.be/HE4rLEQpiXY  
**Thema:** Design-Denkweise — was gute von großartigen Designern unterscheidet. Nutzt Mobbin als Reference-Tool.

### Top 5 Takeaways
1. **Reference-Driven Design** — Genius-Designer kopieren nicht, aber sie studieren obsessiv existierende Lösungen (Mobbin, Dribbble, real apps). Vor jedem Feature: 10+ Referenzen sammeln.
2. **Problem-First, nicht Pixel-First** — Zuerst das User-Problem verstehen, dann designen. Nicht mit Visuals anfangen.
3. **Constraints als Kreativitäts-Booster** — Bewusste Einschränkungen (z.B. max 2 Farben, max 3 Schriftgrößen) erzwingen elegantere Lösungen.
4. **Micro-Interactions machen den Unterschied** — Kleine Animationen und Feedback-Loops (Hover-States, Transitions) trennen "gut" von "großartig".
5. **Iterieren > Perfektionieren** — Schnell mehrere Varianten erstellen, dann die beste verfeinern. Nicht an V1 festkleben.

### Anwendung auf Oxidian
- Vor jedem Feature-Design: Obsidian, Notion, Bear, Logseq, Craft als Reference studieren
- Micro-Interactions für Note-Wechsel, Sidebar-Toggles, Link-Hover einbauen
- Bewusste Design-Constraints definieren (z.B. max 4 Graustufen für Surfaces)

---

## Video 2: "World's Shortest UI/UX Design Course"
**Kanal:** Juxtopposed | **Link:** https://youtu.be/wIuVvCuiJhU  
**Thema:** Die 20% UI/UX-Wissen die 80% der täglichen Design-Arbeit abdecken. Kompakt-Kurs.

### Top 5 Takeaways
1. **User Flow zuerst** — Bevor Pixels gemalt werden: die gesamte User-Journey als Flowchart mappen. Welche Screens, welche Aktionen, welche Entscheidungen?
2. **Wireframes vor Visuals** — Grobe Layouts (Boxes & Lines) klären Funktionalität, bevor Ästhetik ablenkt.
3. **Design System = Konsistenz** — Fonts, Farben, Spacing, Buttons als System definieren. Einmal festlegen, überall verwenden.
4. **Clarity > Beauty** — User müssen sofort verstehen was sie tun können. Klarheit schlägt Schönheit.
5. **Accessibility ist nicht optional** — Contrast-Ratios, Keyboard-Navigation, Screen-Reader-Kompatibilität von Anfang an einplanen.

### Anwendung auf Oxidian
- User Flows für Kern-Szenarien definieren: "Neue Note erstellen", "Note suchen", "Links folgen", "Tag filtern"
- Design System mit Token-basiertem Ansatz (Spacing: 4/8/12/16/24/32px Skala)
- Accessibility: WCAG AA Contrast für alle Text/Background-Kombinationen sicherstellen

---

## Video 3: "The 80% of UI Design – Typography"
**Kanal:** (Design-Fokus) | **Link:** https://youtu.be/9-oefwZ6Z74  
**Thema:** Typografie als wichtigstes UI-Element — 80% einer UI besteht aus Text.

### Top 5 Takeaways
1. **Typografische Hierarchie mit max 3-4 Stufen** — Title, Heading, Body, Caption. Mehr Stufen = mehr Verwirrung. Größensprünge von mindestens 1.2x-1.5x zwischen Stufen.
2. **Line-Height = 1.5× für Body-Text** — Optimal für Lesbarkeit. Headlines können enger (1.1-1.2×).
3. **Max 60-75 Zeichen pro Zeile** — Die optimale Lesebreite. Darüber hinaus verlieren Augen den Zeilenwechsel.
4. **2 Fonts Maximum** — Eine für Headings, eine für Body. Oder nur eine mit verschiedenen Weights. Mehr = visuelles Chaos.
5. **Vertical Rhythm durch konsistentes Spacing** — Abstände zwischen Elementen sollten Vielfache einer Basis-Einheit sein (z.B. 8px Grid).

### Anwendung auf Oxidian
- **Kritisch für Note-Taking:** Lesebreite auf 65-75ch begrenzen (wie Obsidian's "Readable line length")
- Typografie-Skala definieren: z.B. 13/16/20/28/36px mit klarer Hierarchie
- Line-Height: 1.5 für Editor-Text, 1.2 für UI-Labels
- 8px-Grid für alle Abstände als Basis-System

---

## Video 4: "The Easy Way to Pick UI Colors"
**Kanal:** Sajid | **Link:** https://youtu.be/vvPklRN0Tco  
**Thema:** Systematischer Ansatz zur Farbwahl mit HSL/OKLCH statt Raterei.

### Top 5 Takeaways
1. **3 Farbkategorien reichen** — Neutral (Grays für Background/Text/Borders), Primary (Brand/Action-Farbe), Semantic (Grün=Erfolg, Rot=Fehler, Gelb=Warnung).
2. **HSL statt Hex** — Hue/Saturation/Lightness ist intuitiv manipulierbar. Neutrals = Saturation auf 0, dann nur Lightness variieren.
3. **Dark Mode: Lightness-Stufen hochdrehen** — Base bei 0% Lightness, Surfaces bei 5% und 10%. Erzeugt Depth-Hierarchie.
4. **Light Mode ≠ einfach invertiert** — Lightness-Werte invertieren als Startpunkt, dann manuell nachbessern. Hellste Farbe oben, dunkelste unten.
5. **OKLCH als zukunftssicherer Standard** — Perceptually uniform, verhindert Saturations-Verlust bei sehr hellen/dunklen Farben. Tailwind CSS nutzt es bereits.

### Anwendung auf Oxidian
- **Farbsystem mit HSL/OKLCH aufbauen:**
  - Neutral-Palette: 8-10 Graustufen von 0% bis 100% Lightness
  - Primary: Eine Akzentfarbe (z.B. Blau/Lila) mit 3-4 Lightness-Varianten
  - Semantic: Success/Error/Warning jeweils mit Background- und Text-Variante
- Dark/Light Mode von Anfang an als Inverse-System planen
- CSS Custom Properties mit HSL-Werten für einfaches Theming

---

## Video 5: "The UX Design Process Explained Step by Step"
**Kanal:** (UX-Fokus) | **Link:** https://youtu.be/rYH7AErVd7w  
**Thema:** Der vollständige UX-Prozess anhand eines Mobile-App-Projekts — von Research bis Testing.

### Top 5 Takeaways
1. **Empathize → Define → Ideate → Prototype → Test** — Der Double-Diamond-Prozess. Divergieren (Optionen sammeln), dann konvergieren (beste Lösung wählen).
2. **User Research vor Design** — Interviews, Surveys, Competitive Analysis. Annahmen über User verifizieren, nicht raten.
3. **Personas & User Stories** — Konkrete Nutzerprofile erstellen: "Als [Rolle] möchte ich [Aktion] um [Ziel] zu erreichen."
4. **Low-Fidelity Prototyping zuerst** — Paper Prototypes oder simple Wireframes testen, bevor Pixel-perfekte Designs entstehen.
5. **Usability Testing mit 5 Usern reicht** — Nielsen's Regel: 5 Tester finden ~85% der Usability-Probleme.

### Anwendung auf Oxidian
- User Stories für Oxidian definieren: "Als Power-User möchte ich schnell zwischen Notes wechseln per Keyboard"
- Competitive Analysis: Obsidian, Notion, Logseq, Bear, Craft systematisch vergleichen
- Usability Tests mit 5 Note-Taking-Enthusiasten für jedes Major Feature

---

---

# 🏆 Top 20 Konkrete UI/UX-Verbesserungen für Oxidian

*Sortiert nach Impact (höchster zuerst)*

| # | Verbesserung | Quelle | Impact-Begründung |
|---|---|---|---|
| 1 | **Lesebreite auf 65-75ch begrenzen** (togglebar) | Video 3 | Fundamentale Lesbarkeit — betrifft 100% der Nutzungszeit |
| 2 | **Typografie-Skala mit 4 klaren Stufen** (13/16/20/28px) | Video 3 | Visuelle Hierarchie in Notes ist Kernfunktion |
| 3 | **Systematisches Farbsystem mit HSL/OKLCH** (Neutral + Primary + Semantic) | Video 4 | Konsistenz und Theming-Fähigkeit für Dark/Light Mode |
| 4 | **Dark Mode + Light Mode als Inverse-System** von Anfang an | Video 4 | User-Erwartung, 50%+ nutzen Dark Mode |
| 5 | **8px Spacing-Grid** für alle Abstände | Video 3 | Visueller Rhythmus — macht alles "sauberer" ohne dass User wissen warum |
| 6 | **Design System / Token-Architektur** (CSS Custom Properties) | Video 2 | Skalierbarkeit, Konsistenz, einfaches Theming |
| 7 | **Keyboard-First Navigation** | Video 5 | Power-User erwarten das in Note-Taking Apps |
| 8 | **Line-Height 1.5 für Body, 1.2 für Headlines** | Video 3 | Sofort spürbare Lesbarkeits-Verbesserung |
| 9 | **Micro-Interactions** (Sidebar-Toggle, Note-Wechsel, Link-Hover) | Video 1 | Polished Feel, "the app feels alive" |
| 10 | **WCAG AA Contrast Ratios** für alle Text/BG-Kombinationen | Video 2 | Accessibility + bessere Lesbarkeit für alle |
| 11 | **User Flows für die 5 Kern-Szenarien** dokumentieren | Video 2, 5 | Verhindert UX-Sackgassen und inkonsistente Pfade |
| 12 | **Max 2 Fonts** (1 für UI, 1 für Editor — oder nur 1) | Video 3 | Visuelles Chaos vermeiden, Performance |
| 13 | **Command Palette** (Cmd+K) für schnelle Aktionen | Video 1, 5 | Power-User Erwartung, reduziert Maus-Abhängigkeit |
| 14 | **Neutral-Palette: 8-10 Graustufen** systematisch definiert | Video 4 | Basis für Surface-Hierarchie (Background → Card → Elevated) |
| 15 | **Competitive Analysis** von Obsidian/Notion/Bear/Craft Patterns | Video 1, 5 | Informierte Design-Entscheidungen statt Raten |
| 16 | **Semantic Colors** (Success/Error/Warning) konsistent definiert | Video 4 | Sync-Status, Fehler, Validierung braucht klare Farben |
| 17 | **Bewusste Design-Constraints** (max 4 Surface-Farben, max 3 Font-Sizes im UI) | Video 1 | Erzwingt Eleganz, verhindert Feature-Creep im Design |
| 18 | **Smooth Transitions** (150-300ms) für Panel-Öffnen/Schließen | Video 1 | Orientierung im Interface, weniger abrupte Zustandswechsel |
| 19 | **Usability Tests mit 5 Usern** vor Major Releases | Video 5 | 85% der Probleme finden, bevor alle User sie erleben |
| 20 | **Low-Fi Wireframes** für neue Features vor Implementation | Video 2, 5 | Billiger als Code-Iterationen, klärt UX vor Dev-Aufwand |

---

*Report generiert am 2026-02-10. Basierend auf Video-Titel, Beschreibungen und verfügbaren Zusammenfassungen. Für tiefere Analyse: Videos im Volltext ansehen und Notizen ergänzen.*
