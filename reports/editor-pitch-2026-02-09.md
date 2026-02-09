# HyperMark — Der Editor der dritten Kategorie

**Oxidian Studio | Pitch Deck | 2026-02-09**

---

## Das Problem

Markdown-Editoren gibt es in zwei Geschmacksrichtungen:

1. **Textarea/Code-Editor** (VS Code, alte Obsidian) → Man sieht Syntax, nicht das Ergebnis
2. **WYSIWYG** (Notion, TipTap) → Man sieht das Ergebnis, verliert aber die Markdown-Kontrolle

Beide sind Kompromisse. Obsidian's Live-Preview ist der beste Versuch bisher — aber es ist ein Hack: CM6 Decorations die Syntax verstecken. Fragil, limitiert, nicht block-aware.

## Die Lösung: HyperMark

**Edit Markdown. See Rich. Simultaneously.**

```
  Gerenderte Blöcke          Fokussierter Block
  ┌─────────────────┐        ┌─────────────────┐
  │ # Überschrift    │        │ ## Ich tippe h|  │  ← Raw Markdown
  │                  │        │                  │     mit Cursor
  │ Fetter **Text**  │        └─────────────────┘
  │ mit [Links](url) │
  │                  │        Verlasse ich den Block?
  │ > Schönes Zitat  │        → Sofort gerendert! ✨
  └─────────────────┘
```

- **Unfokussierte Blöcke:** Echt gerendert als HTML (nicht "dekorierter Text")
- **Fokussierter Block:** CodeMirror 6 mit voller Markdown-Syntax
- **Transition:** 100ms, nahtlos animiert
- **Source of Truth:** Immer reines Markdown auf Disk. Immer.

## Die 5 Superkräfte

### 1. 🧊 Block-Aware Markdown
Notion-UX (Drag & Drop, Slash-Commands, Block-Menüs) — aber die Datei bleibt Markdown.

### 2. 🤖 AI-Native
Ghost-Text Completions wie Cursor. Inline. Streaming. Tab zum Akzeptieren. Kein Nachdenken nötig.

### 3. ⌨️ Keyboard-First, Vim-Ready
Alles per Tastatur. Vim als First-Class Plugin, nicht als Hack.

### 4. 🔌 Plugin-Everything
Jede Ebene hookbar: Parsing → Block-Rendering → Editor → Commands → UI. Custom Block-Types in 20 Zeilen Code.

### 5. 🚀 10.000+ Zeilen, 60fps
Virtual Viewport (nur sichtbare Blöcke im DOM). Tree-sitter WASM für inkrementelles Parsing. CM6 Instance Pooling.

## Tech Stack

| Kern | Technologie |
|---|---|
| Datenstruktur | Rope Buffer (O(log n) edits) |
| Parsing | tree-sitter-markdown (WASM, inkrementell) |
| Aktiver Block | CodeMirror 6 (recycled) |
| Preview | markdown-it → HTML |
| Viewport | Custom Virtual Scroller |
| Plugins | Event Bus + Hooks |
| AI | Streaming InlineSuggestion Provider |

## Was uns abhebt

| | Obsidian | Notion | Typora | **Oxidian** |
|---|---|---|---|---|
| Echtes Markdown | ✅ | ❌ | ✅ | ✅ |
| Block-UX | ❌ | ✅ | ❌ | ✅ |
| Echtes Inline-Preview | 🟡 | ✅ | ✅ | ✅ |
| AI-Native | ❌ | 🟡 | ❌ | ✅ |
| Vim | 🟡 | ❌ | ❌ | ✅ |
| Plugin System | ✅ | ❌ | ❌ | ✅ |
| Open Source | ❌ | ❌ | ❌ | ✅ |
| Performance 10k+ | ✅ | 🟡 | 🟡 | ✅ |

## Timeline

| Phase | Dauer | Deliverable |
|---|---|---|
| PoC | 1 Woche | Rope + Tree-sitter + Dual Render |
| Alpha | 3 Wochen | Plugins, Slash, Vim, AI |
| Beta | 2 Wochen | Polish, Mobile, Perf |
| Launch | 1 Woche | Migration, Docs |
| **Gesamt** | **7 Wochen** | |

## Der Satz

> *"The best editor is one where you forget you're editing markdown — but your files never forget they ARE markdown."*

---

**Vollständiges Design-Dokument:** `editor-revolution-2026-02-09.md`
