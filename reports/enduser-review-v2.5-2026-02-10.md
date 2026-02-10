# Oxidian v2.5 — Enduser Review (2026-02-10)

> Perspektive: Normaler Obsidian-User, kein Entwickler. Schreibt Notizen, Tagebuch, organisiert Wissen.

---

## 1. Erste Reaktionen pro Screen

### Welcome Screen (Erster Start)
Sieht clean aus, der dunkle Look gefällt mir. Der Stepper oben (4 Dots) zeigt mir, dass ein kurzes Setup kommt — gut. "Skip setup" ist auch da, perfekt. **ABER:** Oben rechts klebt ein grünes "JS OK" und ein rotes "MODULES FAILED" Badge. Das sieht nach Debug-Info aus und macht mich sofort nervös. Ist die App kaputt? Bin ich Beta-Tester? Das gehört da nicht hin.

### Home Screen
Das fühlt sich vertraut an! Sidebar links mit Explorer, Search, Bookmarks — kenne ich von Obsidian. "Open Today's Daily Note" und "Create New Note" sind genau die zwei Dinge die ich zuerst machen will. Die Quick Tips unten (Ctrl+P, Ctrl+N, /) sind hilfreich. "Vault is empty" im Explorer ist klar. **Positiv:** Ich weiß sofort was ich tun kann. **Negativ:** Die Debug-Badges sind immer noch da.

### Settings
Die Kategorien (General, Editor, Files & Links, Appearance, Hotkeys, Core plugins, Community plugins, About) sind 1:1 wie Obsidian — das ist gut, fühlt sich vertraut an. **Problem:** Wenn ich auf "General" klicke, ist rechts NICHTS. Komplett leer. Das fühlt sich kaputt an. Ich erwarte hier Einstellungen wie Sprache, Vault-Pfad, Auto-Save etc.

### Search
Search-Panel links öffnet sich mit "Search notes..." Placeholder. Sieht standard aus. Gleichzeitig sind die Settings noch offen im Hauptbereich — das ist etwas verwirrend, zwei Kontexte gleichzeitig.

### Hotkeys Settings (Screenshot 5 — "Neue Notiz" laut Aufgabe)
Hotkeys-Sektion funktioniert! Hier sehe ich tatsächlich Content rechts: "Customize keyboard shortcuts for commands" mit einer Suchleiste. Das ist einer der wenigen Settings-Tabs der was anzeigt. Gut.

### Command Palette
Ctrl+P öffnet eine Command Palette — sehr Obsidian-like! **Problem:** Die Formatierung ist kaputt. Ich sehe "FileNew Note", "FileOpen Daily Note", "FileSave Current File" — das Wort "File" klebt direkt am Command-Namen ohne Leerzeichen oder visuelle Trennung. Das sieht unprofessionell aus. Sollte sein: Kategorie-Tag links, Command-Name rechts, sauber getrennt.

---

## 2. Bewertung aus User-Perspektive

### Erster Eindruck: Würde ich die App weiter benutzen?
**Jein.** Das Layout und die Grundstruktur überzeugen mich — das ist klar eine Obsidian-Alternative und ich finde mich sofort zurecht. Aber die Debug-Badges und die leeren Settings schreien "Alpha-Software". Ich würde es im Auge behalten, aber noch nicht meinen Vault migrieren.

### Vertrautheit: Fühlt sich das an wie Obsidian?
**Ja, erstaunlich gut.** Die Sidebar-Icons, die Settings-Kategorien, die Command Palette, die Keyboard Shortcuts — alles vertraut. Der dunkle Theme mit den lila Akzenten ist geschmackvoll. Was irritiert: Die Debug-Overlays zerstören die Illusion sofort.

### Onboarding: Wizard hilfreich oder überflüssig?
**Hilfreich**, wenn er funktioniert. Der 4-Step Wizard mit "Get Started" und "Skip setup" ist genau richtig. Nicht zu lang, nicht aufdringlich. Ob die Steps selbst gut sind, kann ich nicht beurteilen (nur den ersten Screen gesehen).

### Navigation: Finde ich mich zurecht?
**Ja.** Die linke Sidebar mit den Icon-Buttons ist intuitiv. Explorer, Search, Bookmarks, Outline, History, Graph, Tags, Calendar, Settings — alles wo ich es erwarte. Die Tab-Leiste oben funktioniert. Einzige Verwirrung: Search öffnet links ein Panel, aber der Hauptbereich bleibt auf dem vorherigen Tab.

### Settings: Was erwarte ich?
Ich erwarte, dass jede Kategorie Einstellungen zeigt. Aktuell ist "General" komplett leer — das ist der erste Tab den jeder anklickt. Ich erwarte dort: Vault-Pfad, Sprache, Auto-Save Intervall, Startup-Verhalten, Default-Notiz-Ordner. Leere Settings = App fühlt sich unfertig an.

### Deal-Breaker: Was schickt mich zurück zu Obsidian?
1. **Kein funktionierender Editor** — wenn ich nicht flüssig Markdown schreiben kann mit Live-Preview, bin ich weg
2. **Kein Vault-Import** — ich habe 500+ Notizen, die müssen einfach funktionieren
3. **Debug-Badges in Production** — das signalisiert "nicht bereit für echte User"
4. **Leere Settings** — wenn ich nichts konfigurieren kann, fehlt mir Kontrolle
5. **Fehlende `[[Wikilinks]]`** — das ist DAS Killer-Feature von Obsidian

---

## 3. Top-10 Verbesserungen nach Impact

| # | Verbesserung | Impact | Warum |
|---|-------------|--------|-------|
| **1** | **Debug-Badges entfernen** (JS OK / MODULES FAILED) | 🔴 Kritisch | Jeder User sieht das zuerst. Zerstört Vertrauen sofort. Sieht nach kaputter Software aus. |
| **2** | **Settings mit echtem Content füllen** (besonders "General") | 🔴 Kritisch | Leere Settings = App fühlt sich unfertig an. User brauchen Kontrolle über Basics. |
| **3** | **Command Palette Formatierung fixen** ("FileNew Note" → "File: New Note") | 🟠 Hoch | Die Palette ist ein Power-Feature. Kaputte Formatierung macht sie unbrauchbar für schnelle Navigation. |
| **4** | **Vault-Import / "Open existing vault" Option** | 🟠 Hoch | Kein Obsidian-User startet bei Null. Der wichtigste Onboarding-Schritt ist "Zeig mir meine existierenden Notizen". |
| **5** | **Editor mit Live-Preview sicherstellen** | 🟠 Hoch | Konnte ich nicht testen, aber das ist der Kern der App. Ohne flüssigen Editor kein Wechsel. |
| **6** | **Settings als Modal/Overlay statt Tab** | 🟡 Mittel | In Obsidian sind Settings ein Modal-Overlay, kein Tab. Als Tab bleiben sie versehentlich offen und nehmen Platz weg. |
| **7** | **Search-Ergebnisse im Hauptbereich anzeigen** | 🟡 Mittel | Aktuell öffnet Search links ein schmales Panel. Ergebnisse brauchen mehr Platz — Full-Text-Vorschau wie in Obsidian. |
| **8** | **Statusbar unten besser nutzen** | 🟡 Mittel | "0 backlinks · 1 min read · 0 words" ist gut, aber auf dem Home-Screen irrelevant. Kontextabhängig machen. |
| **9** | **Home-Screen: "Recent Notes" Sektion hinzufügen** | 🟢 Nice | Nach dem ersten Tag will ich meine letzten Notizen sehen, nicht nur "Create New Note". |
| **10** | **Onboarding: Vault-Pfad wählen im Wizard** | 🟢 Nice | Der Wizard sollte fragen: "Hast du schon einen Vault? → Ordner wählen" statt nur einen leeren Vault zu erstellen. |

---

## Fazit

Oxidian v2.5 hat eine **solide Grundstruktur** die sich für Obsidian-User sofort vertraut anfühlt. Das Layout, die Navigation und die Grundkonzepte stimmen. Die App ist aber klar noch in einem **Early-Alpha-Zustand**: Debug-Overlays, leere Settings, kaputte Text-Formatierung in der Command Palette.

**Für einen Obsidian-Wechsler ist die App noch nicht bereit.** Die Top-3 Fixes (Debug-Badges weg, Settings füllen, Command Palette fixen) würden den Eindruck drastisch verbessern. Der Vault-Import ist der Schlüssel zur Adoption — ohne den probiert kein existierender Obsidian-User die App ernsthaft aus.

**Gesamtnote: 5/10** — Vielversprechend, aber noch nicht alltagstauglich.
