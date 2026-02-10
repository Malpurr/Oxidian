# 📋 Changelog

All notable changes to Oxidian are documented here.

---

## [1.4.0] — 2026-02-10

### ✨ Added
- 🧠 **Remember — Knowledge Retention System**
  - Sources Manager — track books, articles, podcasts, videos with status & ratings
  - Flashcard system — extract highlights into atomic front/back cards
  - Spaced Repetition engine (SM-2 algorithm) with daily review sessions
  - Review Dashboard — due cards, streak tracking, retention stats, daily highlight
  - Smart Connections — discover links between cards and notes
  - Import functionality — bring in existing flashcards from CSV
- ⌘ **Command Palette** (`Ctrl+P`) — access any action instantly with fuzzy search
- ⭐ **Bookmarks** — star notes for quick access via sidebar tab
- 📅 **Daily Notes** — auto-created journal entries (`Ctrl+Alt+D`)
- 🔄 **Navigation History** — back/forward through visited notes (`Ctrl+Alt+←/→`)
- 🔗 **Auto-Link Update** — wiki-links update automatically when renaming files
- ✨ **Highlight support** — `==highlighted text==` rendered in editor and preview
- 🏷️ **Tag Autocomplete** — suggestions as you type `#`
- 📝 **Slash Commands** — type `/` for inline actions
- 📄 **Templates** — create notes from reusable templates
- 🖱️ **Hover Preview** — preview linked notes on hover
- 📊 **Properties Panel** — view and edit frontmatter visually

---

## [1.3.0] — 2026-02-09

### ✨ Added
- 🎨 **Theme system** — dark/light mode with custom CSS support
- 🧩 **Plugin Explorer** — browse, search, and install Obsidian community plugins
- 📊 **Status Bar** — backlinks count, word count, characters, reading time, Ln/Col
- 👁️ **View Modes** — Live Preview / Source / Reading (`Ctrl+E`)
- 🖼️ **Canvas** — infinite spatial canvas for visual thinking
- 📞 **Callout blocks** — rich admonitions with multiple types
- 🧜 **Mermaid diagram rendering** — inline diagram support
- 🔍 **Find & Replace** — in-document search (`Ctrl+F`, `Ctrl+H`)
- ✍️ **Multiple Cursors** — multi-cursor editing support

### 🔧 Improved
- Editor stability and performance
- Plugin API shim compatibility

---

## [1.2.0] — 2026-02-08

### ✨ Added
- 🔀 **Split Panes** — edit multiple notes side-by-side
- 🔐 **Encrypted Notes** — AES-256-GCM per-note encryption
- 🔄 **Auto-Updater** — checks GitHub Releases, download progress, auto-restart
- 📊 **Graph View** — interactive network visualization of vault connections
- 🗂️ **Tab system** — open multiple notes in tabs
- ↩️ **Backlinks Panel** — see all notes linking to the current one

### 🔧 Improved
- File tree performance with large vaults
- Search indexing speed

---

## [1.1.0] — 2026-02-06

### ✨ Added
- 🧩 **Obsidian Plugin Compatibility** — 3,500+ line API shim
- 🏷️ **Tags** — `#tag` support with search integration
- 🔗 **Wiki-links** — `[[link]]` with click-to-navigate
- 📂 **File/Folder Tree** — sidebar navigation with drag & drop
- ⚙️ **Settings UI** — configurable editor options
- 📝 **Frontmatter support** — YAML metadata parsing

### 🔧 Improved
- Markdown rendering accuracy
- Startup performance

---

## [1.0.0] — 2026-02-04

### 🎉 Initial Release
- 📝 **Markdown Editor** with live preview (pulldown-cmark)
- 🔍 **Full-text Search** powered by Tantivy
- 📂 Basic file management
- 🎨 Dark theme
- 🚀 ~16MB binary — no Electron, no bloat
- Built with **Tauri v2** and **Rust**

---

<p align="center">
  <sub>Oxidian — Made with 🦀 Rust and ☕ by machines that don't sleep</sub>
</p>
