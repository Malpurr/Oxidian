# Oxidian v2.0 — The Great Rust Rewrite 🦀

## Mission
Rewrite >50% of JS logic into Rust. Frontend becomes a thin UI layer. Rust handles ALL data, logic, parsing, and computation.

## Current State
- 56,361 lines JS (51 files)
- 2,185 lines Rust (9 files)
- Target: ~20k lines JS (UI only) + ~15k lines Rust (all logic)

## What Moves to Rust

### Phase 1 — Core Engine (CRITICAL)
| Module | JS File(s) | Lines | Rust Module | Priority |
|--------|-----------|-------|-------------|----------|
| Markdown Parser | hypermark.js | ~2500 | `markdown.rs` (expand) | P0 |
| Frontmatter | frontmatter.js | ~400 | `frontmatter.rs` | P0 |
| Wikilink Resolution | wikilinks.js, link-handler.js | ~800 | `links.rs` | P0 |
| Search Engine | search.js | ~600 | `search.rs` (expand) | P0 |
| Vault Operations | sidebar.js (file ops) | ~500 | `vault.rs` (expand) | P0 |
| Settings | settings.js (logic) | ~800 | `settings.rs` (expand) | P0 |

### Phase 2 — Features
| Module | JS File(s) | Lines | Rust Module | Priority |
|--------|-----------|-------|-------------|----------|
| Remember/SM-2 | remember*.js (9 files) | ~5000 | `remember/mod.rs` | P1 |
| Graph Computation | graph.js (data) | ~1000 | `graph.rs` | P1 |
| Canvas Data | canvas.js (data model) | ~1500 | `canvas.rs` | P1 |
| Backlinks | backlinks.js | ~400 | `backlinks.rs` | P1 |
| Bookmarks | bookmarks.js | ~300 | `bookmarks.rs` | P1 |
| Daily Notes | daily-notes.js | ~200 | `daily_notes.rs` | P1 |
| Templates | templates.js | ~300 | `templates.rs` | P1 |
| Tags | tag-autocomplete.js | ~300 | `tags.rs` | P1 |
| Nav History | nav-history.js | ~200 | `nav_history.rs` | P1 |

### Phase 3 — Advanced
| Module | JS File(s) | Lines | Rust Module | Priority |
|--------|-----------|-------|-------------|----------|
| Plugin Loader | plugin-loader.js, obsidian-api.js | ~4500 | `plugin/mod.rs` (expand) | P2 |
| Encryption | (already Rust) | - | `encryption.rs` | Done |
| Updater | update.js → Rust | ~300 | `updater.rs` (expand) | P2 |
| Callouts | callouts.js | ~200 | `callouts.rs` | P2 |
| Embeds | embeds.js | ~300 | `embeds.rs` | P2 |
| Mermaid | mermaid-renderer.js | ~200 | stays JS (needs DOM) | - |
| Find/Replace | find-replace.js | ~400 | stays JS (CM6) | - |

### Stays in JS (UI-only)
- `app.js` — App shell, DOM orchestration
- `codemirror-*.js` — Editor UI (CodeMirror 6 is JS)
- `contextmenu.js` — DOM context menus
- `drag-drop.js` — DOM drag/drop
- `hover-preview.js` — DOM hover
- `live-preview.js` — CM6 decorations
- `multiple-cursors.js` — CM6 feature
- `highlight-extension.js` — CM6 extension
- `onboarding.js` — UI flow
- `quickswitcher.js` — UI (data from Rust)
- `command-palette.js` — UI (commands from Rust)
- `tabs.js` — DOM tab management
- `themes.js` — CSS switching
- `slash.js` — UI slash commands
- `properties-panel.js` — DOM panel
- `folding.js` — CM6 folding

## Company Structure

### C-Suite
- **CTO** — Architecture decisions, Rust module design, IPC protocol
- **VP Engineering** — Code quality, testing, integration

### Department 1: Core Engine (15 agents)
- Lead + 14 engineers
- Markdown parser, frontmatter, wikilinks, vault ops
- Owns: `src-tauri/src/core/`

### Department 2: Features (15 agents)
- Lead + 14 engineers
- Remember, Graph, Canvas, Backlinks, Bookmarks, Daily Notes, Templates
- Owns: `src-tauri/src/features/`

### Department 3: Plugin System (10 agents)
- Lead + 9 engineers
- Plugin loader, Obsidian API compatibility, sandbox
- Owns: `src-tauri/src/plugin/`

### Department 4: Frontend Slim-Down (15 agents)
- Lead + 14 engineers
- Refactor JS to call Rust via Tauri invoke
- Remove logic, keep only UI rendering
- Owns: `src/js/`

### Department 5: Testing & QA (10 agents)
- Lead + 9 engineers
- Unit tests (Rust), integration tests, E2E
- Owns: `tests/`

### Department 6: Performance (5 agents)
- Lead + 4 engineers
- Benchmarks, memory profiling, startup optimization
- Owns: `benches/`

### Department 7: DevOps & Build (5 agents)
- Lead + 4 engineers
- CI/CD, cross-platform builds, release pipeline
- Owns: `.github/`, `build/`

### Department 8: Documentation (5 agents)
- Lead + 4 engineers
- API docs, architecture docs, user guide updates
- Owns: `docs/`

## IPC Protocol Design
All Rust↔JS communication via Tauri invoke:
```rust
#[tauri::command]
fn parse_markdown(content: &str) -> Result<ParsedDocument, String>

#[tauri::command]  
fn resolve_wikilinks(vault_path: &str, link: &str) -> Result<Vec<LinkTarget>, String>

#[tauri::command]
fn compute_graph(vault_path: &str) -> Result<GraphData, String>

#[tauri::command]
fn sm2_review(card_path: &str, quality: u8) -> Result<ReviewResult, String>
```

Frontend calls:
```javascript
const parsed = await invoke('parse_markdown', { content });
const graph = await invoke('compute_graph', { vaultPath });
```

## Wave Deployment
- **Wave 1** (now): CTO + Department Leads (8 agents) — Architecture & module scaffolding
- **Wave 2** (after Wave 1): Core Engine + Features (30 agents) — Rust implementation
- **Wave 3** (after Wave 2): Frontend + Plugin (25 agents) — JS refactor + plugin system
- **Wave 4** (after Wave 3): QA + Performance + DevOps + Docs (25 agents) — Polish
- **Wave 5** (final): Integration testing, bug fixes (12 agents)

Total: ~100 agents across 5 waves
