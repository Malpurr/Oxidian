# Oxidian Editor Revolution — Design Document

**Autoren:** SCOUT (Research Lead) & FORGE (Backend Lead)  
**Datum:** 2026-02-09  
**Status:** DRAFT v1.0  
**Codename:** *HyperMark*

---

## Executive Summary

Oxidian braucht einen Editor der dritte Kategorie: weder textarea noch WYSIWYG. **HyperMark** ist ein hybrid-rendered, block-aware Markdown-Editor der rohes Markdown als Source-of-Truth behält, aber inline live-gerenderte Blöcke zeigt — mit AI-first Completions, Slash-Commands und Plugin-Hooks an jeder Stelle.

Die Kernidee: **Der User sieht gerenderten Content, aber editiert Markdown.** Beim Fokus auf einen Block sieht man die Markdown-Syntax. Beim Verlassen rendert der Block sofort. Kein Split-View. Kein Modus-Wechsel. Fließend.

---

## 1. Analyse existierender Editor-Frameworks

### 1.1 CodeMirror 6 (Obsidian, Overleaf)

**Architektur:** Funktionaler State + imperativer View. Immutable document model. Extension-System via Facets/StateFields/ViewPlugins.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Exzellente Performance (virtualisiertes Rendering) | Kein echtes Block-Konzept — zeilenbasiert |
| Modulares Extension-System | Steile Lernkurve für Extensions |
| Syntax-Highlighting via Lezer-Parser | Live-Preview erfordert aufwändige Decorations |
| Mobil & Accessibility gut | Kein natives WYSIWYG — alles custom |
| Bewährt (Obsidian, Replit, Chrome DevTools) | Document-Model ist plain text, kein Schema |

**Obsidian-Lektion:** Obsidian baut Live-Preview als CM6-Plugin. Es funktioniert, aber die Komplexität ist enorm — hunderte Decorations die den Text visuell transformieren. Fragil bei Edge-Cases.

### 1.2 ProseMirror / TipTap

**Architektur:** Schema-basiertes Document-Model (ähnlich DOM). Transactions für State-Updates. TipTap = DX-Wrapper um ProseMirror.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Echtes strukturiertes Dokument-Modell | Markdown ist Serialisierung, nicht Source-of-Truth |
| Collaborative Editing (Y.js) built-in ready | Roundtrip Markdown→Schema→Markdown verliert Formatting |
| Rich inline editing natürlich | Performance bei sehr großen Docs mäßig |
| Riesiges Plugin-Ökosystem (TipTap) | Kein Vim-Mode out-of-the-box |
| Block-Konzept nativ | Schema-Migrations können breaking sein |

**Kritischer Punkt:** ProseMirror/TipTap konvertieren Markdown in ein internes Schema. Das bedeutet: **Markdown-Fidelity geht verloren.** Für Oxidian inakzeptabel — wir sind ein Markdown-first Tool.

### 1.3 Monaco Editor (VS Code)

**Architektur:** Monolithischer Code-Editor. TextModel mit Line-Array. Dekorationen via Provider-APIs.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Extrem ausgereift | Riesige Bundle-Size (~2MB+) |
| IntelliSense/Autocomplete erstklassig | Für Code optimiert, nicht für Prosa |
| Multi-Cursor, Find/Replace | Kein Block-Konzept |
| Vim-Extension existiert | Overkill für Markdown-Editing |
| Web Worker für Parsing | Mobile Support schlecht |

**Fazit:** Zu schwergewichtig und code-fokussiert. Aber die Autocomplete-Architektur (Inline Suggestions Provider) ist ein Vorbild für AI-Completions.

### 1.4 Milkdown

**Architektur:** Plugin-driven WYSIWYG auf ProseMirror. Alles ist ein Plugin — sogar der Parser.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Radikal modulare Plugin-Architektur | Baut auf ProseMirror → gleiche Markdown-Roundtrip-Probleme |
| Headless (kein festes UI) | Kleines Ökosystem |
| Markdown-Parser als Plugin austauschbar | Performance nicht getestet bei 10k+ Zeilen |
| Schöne API | Wenig Production-Einsatz |

### 1.5 BlockNote

**Architektur:** Block-basiert wie Notion. Jeder Absatz ist ein "Block" mit Typ und Props. Baut auf TipTap/ProseMirror.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Block-basiertes UX natürlich | Markdown ist nur Export-Format |
| Drag & Drop Blöcke | Nicht wirklich Markdown-native |
| Slash-Commands built-in | Gebunden an React |
| Moderne UX (Notion-feel) | Kein Vim-Mode |

**Lektion:** Das Block-UX ist hervorragend. Aber die Entkopplung von Markdown ist ein No-Go für Oxidian.

### 1.6 Lexical (Meta)

**Architektur:** Extensible text editor framework. EditorState als immutable Snapshot. Node-basiertes Document Model. Double-buffering für Updates.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Sehr performant (minimale DOM-Updates) | Noch relativ jung |
| Framework-agnostisch im Kern | Markdown-Support via Plugin, nicht nativ |
| Gute Accessibility | Weniger Extensions als ProseMirror |
| Modernes API-Design | Block-Konzept vorhanden aber simpel |
| React-first aber adaptierbar | Documentation lückenhaft |

### 1.7 Zed Editor Ansatz

**Architektur:** GPU-gerendert via GPUI. Tree-sitter für inkrementelles Parsing. Rope-Datenstruktur. Rust-native.

| ✅ Stärken | ❌ Schwächen |
|---|---|
| Absurd schnell (GPU-rendered) | Nicht Web-basiert |
| Tree-sitter = perfektes inkrementelles Parsing | Eigene UI-Framework Abhängigkeit |
| Rope = O(log n) für alle Operationen | Nicht direkt übertragbar auf Browser |
| CRDTs für Collaboration nativ | Desktop-only |

**Inspiration:** Die Kombination Rope + Tree-sitter + GPU ist das Ideal. Wir können Tree-sitter (WASM) und Rope-ähnliche Strukturen im Browser nutzen.

---

## 2. Synthese: Was wir von jedem lernen

| Framework | Was wir übernehmen |
|---|---|
| CodeMirror 6 | Funktionaler State, Virtualisiertes Rendering, Facet-System |
| ProseMirror | Structured Transactions, Collaboration-Ready |
| Monaco | Inline Suggestion Provider Architektur für AI |
| BlockNote | Block-UX, Slash-Commands, Drag&Drop |
| Milkdown | Radikal modulare Plugin-Architektur |
| Lexical | Double-buffering, Immutable Snapshots |
| Zed | Tree-sitter WASM, Rope-inspirierte Datenstruktur |

---

## 3. HyperMark — Die neue Architektur

### 3.1 Kernprinzip: "Edit Markdown, See Rich"

```
┌─────────────────────────────────────────────────┐
│  Was der User sieht:                            │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ # Mein Dokument              ← gerendert │  │
│  │                                           │  │
│  │ Dies ist ein Absatz mit **bold** und      │  │
│  │ [Links](url) die man sieht.  ← gerendert │  │
│  │                                           │  │
│  │ ```python                     ← rendered  │  │
│  │ def hello():                  │ mit       │  │
│  │     print("world")           │ Syntax-HL │  │
│  │ ```                           ← rendered  │  │
│  │                                           │  │
│  │ > Ein Blockquote mit Styling  ← gerendert │  │
│  │                                           │  │
│  │ ## Fokussierter Block         ← RAW MD!   │  │ ◄── Cursor ist hier
│  │                                           │  │
│  │ Noch ein Absatz               ← gerendert │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Source-of-Truth: immer reines Markdown-File    │
└─────────────────────────────────────────────────┘
```

**Das Prinzip:** 
- Blöcke OHNE Fokus: gerendert (Rich Preview)
- Block MIT Fokus: zeigt rohes Markdown
- Transition ist animiert und nahtlos
- Die Datei auf Disk ist IMMER valides Markdown

### 3.2 Architektur-Diagramm

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HYPERMARK EDITOR                              │
│                                                                      │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
│  │  Markdown    │     │   Block      │     │   Render Engine      │  │
│  │  Rope Buffer │────▶│   Splitter   │────▶│                      │  │
│  │  (Source of  │     │  (tree-sitter│     │  Focused: CodeMirror │  │
│  │   Truth)     │     │   WASM)      │     │  Blurred: Markdoc/   │  │
│  │              │     │              │     │          Custom HTML  │  │
│  └──────┬───────┘     └──────────────┘     └──────────┬───────────┘  │
│         │                                             │              │
│         │  ┌──────────────────────────────────────┐   │              │
│         │  │          Plugin Bus                  │   │              │
│         │  │                                      │   │              │
│         │  │  ┌─────────┐ ┌────────┐ ┌────────┐  │   │              │
│         │  │  │Slash-Cmd│ │  AI    │ │ Vim    │  │   │              │
│         │  │  │ Plugin  │ │Complete│ │ Plugin │  │   │              │
│         │  │  └─────────┘ └────────┘ └────────┘  │   │              │
│         │  │  ┌─────────┐ ┌────────┐ ┌────────┐  │   │              │
│         │  │  │Collab   │ │ Theme  │ │ Custom │  │   │              │
│         │  │  │ Plugin  │ │ Plugin │ │ Plugin │  │   │              │
│         │  │  └─────────┘ └────────┘ └────────┘  │   │              │
│         │  └──────────────────────────────────────┘   │              │
│         │                                             │              │
│  ┌──────▼─────────────────────────────────────────────▼───────────┐  │
│  │                     Virtual Viewport                           │  │
│  │  (nur sichtbare Blöcke werden gerendert — wie CM6)            │  │
│  │                                                                │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │  │
│  │  │Block 1 │ │Block 2 │ │Block 3 │ │Block 4 │ │Block 5 │ ... │  │
│  │  │rendered│ │rendered│ │ ACTIVE │ │rendered│ │rendered│     │  │
│  │  │  HTML  │ │  HTML  │ │  CM6   │ │  HTML  │ │  HTML  │     │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  State Manager (Immutable, Functional à la CM6)               │  │
│  │  EditorState → Transaction → NewState                          │  │
│  │  Undo/Redo via Transaction History                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Kern-Komponenten

#### A) Markdown Rope Buffer

Die Datenstruktur die das gesamte Dokument hält. Inspiriert von Zed's Rope:

```typescript
interface RopeBuffer {
  // O(log n) Operationen
  insert(offset: number, text: string): RopeBuffer;  // immutable
  delete(from: number, to: number): RopeBuffer;
  slice(from: number, to: number): string;
  
  // Schnelle Queries
  lineAt(offset: number): Line;
  offsetAt(line: number, col: number): number;
  
  // Gesamtlänge
  readonly length: number;
  readonly lineCount: number;
  
  // Serialisierung — IMMER valides Markdown
  toString(): string;
}
```

Implementierung: Balanced B-tree of chunks (à la Piece Table / Rope hybrid). In JavaScript via WASM-Modul für Performance-kritische Ops oder als reines TS mit optimierter Chunk-Größe (~1KB Blätter).

#### B) Block Splitter (Tree-sitter WASM)

Nutzt `tree-sitter-markdown` (WASM-kompiliert) für inkrementelles Parsing:

```typescript
interface BlockSplitter {
  // Inkrementelles Parse bei Edits
  parse(buffer: RopeBuffer): BlockTree;
  update(edit: Edit, buffer: RopeBuffer): BlockTree;
  
  // Block-Queries
  blockAt(offset: number): Block;
  blocksInRange(from: number, to: number): Block[];
}

interface Block {
  id: string;              // Stabile ID für Animations
  type: BlockType;         // heading | paragraph | code | quote | list | table | ...
  from: number;            // Start-Offset im Rope
  to: number;              // End-Offset
  children?: Block[];      // Für verschachtelte Strukturen
  metadata: BlockMeta;     // Level, Language, etc.
}

type BlockType = 
  | 'heading' | 'paragraph' | 'code_block' | 'blockquote'
  | 'list' | 'list_item' | 'table' | 'thematic_break'
  | 'html_block' | 'link_definition' | 'frontmatter'
  | 'math_block' | 'callout' | 'embed';
```

**Warum Tree-sitter:** Inkrementelles Parsing in O(log n * edit_size). Bei einem Edit in Zeile 500 wird nicht das ganze Dokument neu geparst. Perfekt für 10.000+ Zeilen.

#### C) Dual Render Engine

Das Herzstück von HyperMark:

```typescript
interface RenderEngine {
  // Für den aktiven Block: volle CodeMirror 6 Instanz
  activateBlock(block: Block): CMEditorView;
  
  // Für inaktive Blöcke: leichtgewichtiges HTML-Rendering
  renderBlock(block: Block, markdown: string): HTMLElement;
  
  // Transition zwischen Modi
  transitionToActive(block: Block): Animation;
  transitionToRendered(block: Block): Animation;
}
```

**Aktiver Block:** Eine minimale CodeMirror 6 Instanz mit:
- Markdown Syntax-Highlighting (Lezer)
- Inline-Completions (AI)
- Vim-Keybindings (optional)
- Alle Cursor-Features (Multi-Cursor, Selection)

**Inaktive Blöcke:** Pre-gerendetes HTML via schnellem Markdown→HTML Renderer (z.B. `markdown-it` oder Custom). Kein contentEditable, kein Editor-Overhead. Nur DOM-Nodes mit Click-Handler.

**Transition:** Beim Klick auf einen gerenderten Block:
1. Fade-out des HTML (50ms)
2. CM6-Instanz wird an der Stelle eingesetzt
3. Cursor wird positioniert
4. Fade-in (50ms)

Beim Verlassen (Klick woanders, Tab, Escape):
1. Markdown aus CM6 wird in den Rope geschrieben
2. Block wird neu gerendert als HTML
3. CM6-Instanz wird recycelt (Object Pool)

#### D) Virtual Viewport

Nur sichtbare Blöcke werden im DOM gehalten:

```typescript
interface VirtualViewport {
  // Berechnet welche Blöcke sichtbar sind
  visibleBlocks(scrollTop: number, viewportHeight: number): Block[];
  
  // Höhen-Schätzung für nicht-gerenderte Blöcke
  estimateHeight(block: Block): number;
  
  // Scroll-Position halten bei Block-Änderungen
  anchorScroll(anchor: Block, offsetInBlock: number): void;
}
```

Bei einem 10.000-Zeilen-Dokument (~500 Blöcke) sind typischerweise 15-30 Blöcke sichtbar. Nur diese existieren im DOM. Rest sind Platzhalter mit geschätzter Höhe.

### 3.4 Plugin-System

Inspiriert von Milkdown's Radikalität und CM6's Facets:

```typescript
// Plugin-Definition
interface HyperMarkPlugin {
  name: string;
  
  // Lifecycle Hooks
  onLoad?(ctx: PluginContext): void | Promise<void>;
  onUnload?(ctx: PluginContext): void;
  
  // State Hooks
  stateFields?: StateFieldSpec[];          // Eigene State-Felder
  transactions?: TransactionFilter[];       // Transactions filtern/modifizieren
  
  // Block Hooks
  blockRenderers?: Record<string, BlockRenderer>;  // Custom Block-Types rendern
  blockDecorators?: BlockDecorator[];              // Blöcke dekorieren
  
  // Editor Hooks (für aktiven CM6-Block)
  cmExtensions?: Extension[];             // CM6 Extensions injizieren
  completionSources?: CompletionSource[]; // Autocomplete-Quellen
  
  // Command Hooks
  commands?: Record<string, Command>;     // Eigene Commands registrieren
  keybindings?: Keybinding[];             // Keyboard Shortcuts
  slashCommands?: SlashCommand[];         // Slash-Menu Einträge
  
  // UI Hooks
  toolbarItems?: ToolbarItem[];           // Toolbar erweitern
  sidePanels?: SidePanel[];               // Side-Panels registrieren
  statusBarItems?: StatusBarItem[];       // Statusbar erweitern
}

// Slash-Command Beispiel
const tablePlugin: HyperMarkPlugin = {
  name: 'table',
  slashCommands: [{
    label: 'Table',
    icon: '📊',
    description: 'Insert a table',
    execute(ctx) {
      ctx.insertMarkdown('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n');
    }
  }],
  blockRenderers: {
    table: (block, md) => renderInteractiveTable(md)
  }
};
```

### 3.5 AI Integration (First-Class)

```typescript
// AI Provider Interface
interface AIProvider {
  // Inline Completion (Cursor-style)
  complete(context: CompletionContext): AsyncIterable<string>;
  
  // Block-Level Operations
  transformBlock(block: Block, instruction: string): AsyncIterable<string>;
  
  // Document-Level
  chat(messages: ChatMessage[], docContext: string): AsyncIterable<string>;
}

// Ghost Text (wie Cursor/Copilot)
interface InlineCompletion {
  // Zeigt grauen Ghost-Text nach dem Cursor
  suggestion: string;
  
  // Tab zum Akzeptieren
  accept(): void;
  
  // Wort-weise akzeptieren
  acceptWord(): void;
  
  // Escape zum Verwerfen
  dismiss(): void;
}

// AI Plugin
const aiPlugin: HyperMarkPlugin = {
  name: 'ai',
  cmExtensions: [inlineCompletionExtension()],
  commands: {
    'ai:complete': (ctx) => ctx.ai.triggerCompletion(),
    'ai:transform': (ctx) => ctx.ai.showTransformUI(),
    'ai:chat': (ctx) => ctx.ai.openSideChat(),
  },
  keybindings: [
    { key: 'Tab', command: 'ai:acceptCompletion', when: 'hasGhostText' },
    { key: 'Ctrl-Shift-i', command: 'ai:transform' },
  ],
  slashCommands: [{
    label: 'AI Write',
    icon: '🤖',
    description: 'Let AI continue writing',
    execute: (ctx) => ctx.ai.continueWriting()
  }]
};
```

### 3.6 Vim Mode

```typescript
const vimPlugin: HyperMarkPlugin = {
  name: 'vim',
  cmExtensions: [vim()],  // CM6 vim extension
  
  // Erweitert um Block-Navigation
  commands: {
    'vim:nextBlock': (ctx) => {
      // } in Vim — springt zum nächsten Block
      const next = ctx.blocks.next(ctx.activeBlock);
      if (next) ctx.focusBlock(next);
    },
    'vim:prevBlock': (ctx) => {
      const prev = ctx.blocks.prev(ctx.activeBlock);
      if (prev) ctx.focusBlock(prev);
    }
  },
  
  // Statusbar zeigt Vim-Mode
  statusBarItems: [{
    position: 'left',
    render: (state) => state.vim?.mode ?? 'NORMAL'
  }]
};
```

---

## 4. Technologie-Entscheidungen

| Komponente | Technologie | Begründung |
|---|---|---|
| **Datenstruktur** | Custom Rope (TypeScript) | O(log n) Edits, immutable Snapshots, einfacher als WASM für v1 |
| **Block-Parsing** | tree-sitter-markdown (WASM) | Inkrementell, battle-tested, exakte Markdown-Grammatik |
| **Aktiver Block** | CodeMirror 6 (recycled instances) | Best-in-class Code/Text-Editor, Extensions ecosystem |
| **Inaktive Blöcke** | markdown-it → DOM | Schnell, erweiterbar, CommonMark compliant |
| **Virtualisierung** | Custom (inspiriert von CM6 viewport) | Tailored für Block-Layout statt Zeilen |
| **State Management** | Immutable State + Transactions (eigenes) | CM6-inspiriert, aber auf Block-Level |
| **Plugin System** | Custom Event Bus + Hooks | Maximal flexibel, kein Framework-Lock-in |
| **AI Completions** | Custom InlineSuggestion (wie Monaco) | Framework-agnostisch, streambares Interface |
| **Collaboration** | Y.js + Custom Binding | Standard für CRDT-basierte Echtzeit-Collab |
| **UI Framework** | Svelte 5 (oder Solid.js) | Minimaler Overhead, Reactive, kein VDOM |
| **Build** | Vite + esbuild | Schnellstes DX |

### Warum NICHT einfach CodeMirror 6 für alles?

Obsidian macht genau das — und es funktioniert. Aber:

1. **Block-Konzept fehlt:** CM6 ist zeilenbasiert. Block-Features (Drag&Drop, Block-Menüs) müssen aufwändig gehackt werden.
2. **Live-Preview ist fragil:** Obsidian's Live-Preview nutzt CM6 Decorations die den visuellen Output transformieren. Das ist komplex und fehleranfällig.
3. **Performance:** Ein gerendeter HTML-Block ist schneller als ein CM6-Block mit Decorations die Markdown verstecken.
4. **UX:** Ein echt gerendeter Block sieht besser aus als ein "dekorierter" Text-Block.

### Warum NICHT ProseMirror/TipTap?

1. **Markdown-Fidelity:** ProseMirror konvertiert Markdown in ein Schema. Roundtrips verlieren Formatierung (extra Leerzeilen, Indent-Styles, etc.)
2. **Oxidian ist Markdown-first:** Die Datei auf Disk MUSS 1:1 das sein was der User geschrieben hat.

### Die HyperMark-Lösung: Das Beste beider Welten

- **Von CM6:** Den aktiven Block als echten Code-Editor (mit all seinen Features)
- **Von ProseMirror:** Die Idee des strukturierten Dokuments (aber via tree-sitter, nicht Schema)
- **Von BlockNote:** Block-UX (Drag&Drop, Slash-Commands)
- **Von Zed:** Performance-Prinzipien (nur rendern was sichtbar ist, inkrementelles Parsing)

---

## 5. Performance-Analyse

### Ziel: 10.000+ Zeilen flüssig (60fps scrolling)

| Operation | Naiver Ansatz | HyperMark |
|---|---|---|
| Dokument öffnen | Parse alles, render alles | Parse alles (tree-sitter: <50ms), render nur Viewport (~20 Blöcke) |
| Tippen (Keystroke) | Re-parse + re-render alles | Update Rope O(log n), inkrementelles re-parse (nur betroffene Blöcke), re-render nur aktiven Block |
| Scrollen | Alle Blöcke im DOM | Virtual: nur ~20 Blöcke im DOM, Rest sind height-Platzhalter |
| Block wechseln | Neuen Editor erstellen | CM6-Instanz recyclen aus Pool (0ms creation) |
| AI Completion | - | Streamed in aktiven CM6-Block, kein Re-render anderer Blöcke |

### Benchmark-Ziele

| Metrik | Ziel |
|---|---|
| Time to Interactive (10k Zeilen) | < 200ms |
| Keystroke Latency | < 16ms (60fps) |
| Scroll FPS | 60fps konstant |
| Block-Focus Transition | < 100ms |
| Memory (10k Zeilen) | < 50MB |
| Bundle Size (Core) | < 200KB gzipped |

---

## 6. API Design — Developer Experience

### 6.1 Editor erstellen

```typescript
import { createEditor } from '@oxidian/hypermark';
import { vim, ai, slashCommands, collaboration } from '@oxidian/hypermark/plugins';

const editor = createEditor({
  // Container
  parent: document.getElementById('editor')!,
  
  // Initialer Content
  content: '# Hello World\n\nStart writing...',
  
  // Plugins
  plugins: [
    slashCommands(),
    ai({ provider: openaiProvider }),
    vim({ enabled: false }),  // User kann togglen
    collaboration({ room: 'doc-123', provider: yjsProvider }),
  ],
  
  // Callbacks
  onChange(content: string) {
    // content ist IMMER valides Markdown
    saveToFile(content);
  },
  
  onBlockChange(block: Block, action: 'focus' | 'blur' | 'edit') {
    // Block-Level Events
  },
});

// Programmatic API
editor.getContent();           // string (Markdown)
editor.setContent(md);         // Ersetzt alles
editor.insertAt(offset, text); // Einfügen
editor.focusBlock(blockId);    // Block fokussieren
editor.scrollToBlock(blockId); // Scrollen
editor.registerPlugin(plugin); // Runtime Plugin-Registrierung
editor.destroy();              // Cleanup
```

### 6.2 Custom Block Renderer

```typescript
import { defineBlockRenderer } from '@oxidian/hypermark';

// Beispiel: Mermaid-Diagramme inline rendern
const mermaidRenderer = defineBlockRenderer({
  type: 'code_block',
  match: (block) => block.metadata.language === 'mermaid',
  
  render(block, markdown) {
    const el = document.createElement('div');
    el.className = 'mermaid-preview';
    mermaid.render(`mermaid-${block.id}`, markdown, el);
    return el;
  },
  
  // Optional: Interaktiver Rendered-Modus
  interactive: true,
  onInteract(el, block) {
    // z.B. Zoom, Pan für Diagramme
  }
});
```

### 6.3 Custom Slash Command

```typescript
import { defineSlashCommand } from '@oxidian/hypermark';

const dateCommand = defineSlashCommand({
  label: 'Today',
  icon: '📅',
  description: 'Insert today\'s date',
  keywords: ['date', 'today', 'now'],
  execute(ctx) {
    const today = new Date().toISOString().split('T')[0];
    ctx.insertMarkdown(today);
  }
});
```

### 6.4 Theming

```typescript
import { defineTheme } from '@oxidian/hypermark';

const darkTheme = defineTheme({
  name: 'oxidian-dark',
  colors: {
    bg: '#1a1a2e',
    fg: '#e0e0e0',
    accent: '#00d4aa',
    selection: '#00d4aa33',
    cursor: '#00d4aa',
    
    // Block-spezifisch
    heading: '#ffffff',
    code: { bg: '#16213e', fg: '#a9b7c6' },
    blockquote: { border: '#00d4aa', bg: '#00d4aa11' },
    link: '#4fc3f7',
  },
  
  // CM6 Theme für aktiven Block
  cmTheme: myCodeMirrorTheme,
  
  // Transitions
  blockFocusTransition: 'opacity 100ms ease-out',
});
```

---

## 7. Migration vom textarea-Editor

### Phase 1: Parallel-Modus (2 Wochen)

```
┌─────────────────────────┐
│  Settings:              │
│  [x] New Editor (Beta)  │
│  [ ] Classic textarea   │
└─────────────────────────┘
```

- HyperMark als opt-in neben bestehendem textarea
- Feature-Parity Checklist:
  - [x] Basic Markdown editing
  - [x] Syntax highlighting
  - [x] Keybindings (standard)
  - [x] Search & Replace
  - [x] Undo/Redo
  - [ ] Alle existierenden Shortcuts

### Phase 2: Feature-Übertroffen (2 Wochen)

- Slash-Commands aktiv
- Block-Navigation
- Inline Preview
- AI Completions (wenn konfiguriert)
- HyperMark wird Default, textarea wird "Legacy Mode"

### Phase 3: Legacy Entfernen (1 Woche)

- textarea-Code entfernen
- Migration-Guide für Plugin-Autoren (falls vorhanden)
- Performance-Optimierung & Bug-Fixing

### Gesamt-Timeline: ~5 Wochen

---

## 8. Was Oxidian BESSER macht als alle anderen

### vs. Obsidian
| Obsidian | Oxidian HyperMark |
|---|---|
| CM6 mit komplexen Decorations | Echte Dual-Render (HTML + CM6) |
| Live-Preview ist "verstecktes Markdown" | Live-Preview ist echtes Rendering |
| Monolithischer Editor | Block-basiert mit Drag&Drop |
| Plugin-System über CM6 Extensions | Plugin-System auf Editor + Block + Command Level |
| AI via Community-Plugins | AI als First-Class Feature |

### vs. Notion
| Notion | Oxidian HyperMark |
|---|---|
| Proprietäres Format | Reines Markdown auf Disk |
| Block-basiert (kein Markdown) | Block-basiert UND Markdown |
| Cloud-only | Local-first |
| Kein Vim Mode | Vim als First-Class Plugin |
| Keine Custom Renderer | Alles customizable |

### vs. Typora
| Typora | Oxidian HyperMark |
|---|---|
| WYSIWYG (versteckt Syntax komplett) | Fokussierter Block zeigt Syntax |
| Keine Plugins | Voll erweiterbar |
| Keine AI | AI-ready |
| Closed Source | Open Source (Oxidian) |
| Kein Block-Konzept | Block-basiert |

### vs. VS Code + Markdown
| VS Code | Oxidian HyperMark |
|---|---|
| Split-View (Editor + Preview) | Inline Preview (kein Split nötig) |
| Code-Editor-UX | Writing-focused UX |
| Riesige Bundle Size | Leichtgewichtig |
| Kein Block-Konzept | Block-basiert |

### Oxidian's Unique Selling Points

1. **"Markdown Superfluid"** — Fließender Übergang zwischen Schreiben und Lesen, ohne Modus-Wechsel
2. **Block-Aware Markdown** — Block-UX (Notion) + Markdown-Fidelity (Obsidian) erstmals vereint
3. **AI-Native** — Nicht nachträglich angeflanscht, sondern im Kern designt
4. **Plugin-Everything** — Jede Ebene ist hookbar: Parse → Render → Edit → Command → UI
5. **Performance by Design** — Virtualisiert + inkrementell von Tag 1

---

## 9. Risiken & Mitigierung

| Risiko | Wahrscheinlichkeit | Impact | Mitigierung |
|---|---|---|---|
| CM6 Instance Recycling ist buggy | Mittel | Hoch | Fallback: neue Instance erstellen (etwas langsamer) |
| Tree-sitter WASM zu groß | Niedrig | Mittel | Lazy Loading, oder Custom Markdown-Parser als Fallback |
| Block-Transition flackert | Mittel | Mittel | Übergangslose Positionierung via absolute positioning + transform |
| Markdown-Roundtrip Probleme | Niedrig | Hoch | Source-of-Truth ist immer der Rope Buffer, nie die gerenderte Version |
| Mobile Performance | Mittel | Mittel | Vereinfachter Modus: weniger Blöcke im Viewport, kein CM6 recycling |

---

## 10. Nächste Schritte

1. **Proof of Concept** (1 Woche): Rope Buffer + Tree-sitter Splitting + CM6 in einem Block + HTML für Rest
2. **Alpha** (3 Wochen): Plugin System, Slash Commands, Vim, Basic AI
3. **Beta** (2 Wochen): Polishing, Performance-Optimierung, Mobile
4. **Release** (1 Woche): Migration, Docs, Launch

**Gesamte geschätzte Entwicklungszeit: 7 Wochen**

---

*"The best editor is one where you forget you're editing markdown — but your files never forget they ARE markdown."*

— SCOUT & FORGE, Oxidian Studio
