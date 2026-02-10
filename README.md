<p align="center">
  <img src="assets/logo.png" alt="Oxidian Logo" width="200"/>
</p>

<h1 align="center">Oxidian</h1>

<p align="center">
  <strong>The open-source Obsidian alternative, built in Rust.</strong><br/>
  Fast. Private. Extensible. No Electron.
</p>

<p align="center">
  <a href="https://malpurr.github.io/Oxidian/"><img src="https://img.shields.io/badge/website-oxidian-7c3aed?style=for-the-badge" alt="Website"/></a>
  <a href="https://malpurr.github.io/Oxidian/docs/"><img src="https://img.shields.io/badge/docs-read-blue?style=for-the-badge" alt="Docs"/></a>
  <img src="https://img.shields.io/badge/version-1.4.0-orange?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"/>
  <img src="https://img.shields.io/badge/built%20with-Rust%20%2B%20Tauri-f97316?style=for-the-badge" alt="Built with Rust"/>
</p>

---

## ✨ Features

### 📝 Editor
- **Markdown Editor** with live preview (CodeMirror 6 + pulldown-cmark)
- **View Modes** — Live Preview / Source / Reading (`Ctrl+E`)
- **Split Panes** — edit multiple notes side-by-side
- **Highlight Support** — `==highlighted text==` rendering
- **Find & Replace** — in-document search (`Ctrl+F`)
- **Multiple Cursors** — multi-cursor editing
- **Callouts** — rich callout/admonition blocks
- **Mermaid Diagrams** — rendered inline
- **Frontmatter** — YAML metadata support

### 🔗 Linking & Navigation
- **Wiki-links** — `[[like this]]` with click-to-navigate
- **Backlinks Panel** — see every note linking to the current one
- **Graph View** — visualize your entire knowledge network
- **Auto-Link Update** — links automatically update when you rename files
- **Navigation History** — go back/forward through your note history (`Ctrl+Alt+←/→`)
- **Hover Preview** — preview linked notes on hover

### 🧠 Remember — Knowledge Retention System
- **Sources Manager** — track books, articles, podcasts, videos with status & ratings
- **Flashcards** — extract highlights into atomic cards (front/back)
- **Spaced Repetition** — SM-2 algorithm with daily review sessions
- **Review Dashboard** — daily due cards, streak tracking, retention stats
- **Smart Connections** — discover links between your cards and notes
- **Import** — bring in existing flashcards or highlights

### 📂 Organization
- **File/Folder Tree** — full sidebar navigation
- **Tags** — `#tag` support with search
- **Bookmarks** — star your most important notes for quick access
- **Daily Notes** — auto-created journal entries (`Ctrl+Alt+D`)
- **Templates** — create notes from reusable templates

### 🔍 Search & Commands
- **Full-text Search** across your vault (Tantivy engine)
- **Command Palette** — access any action instantly (`Ctrl+P`)
- **Quick Switcher** — jump to any note by name
- **Slash Commands** — type `/` for inline actions
- **Tag Autocomplete** — suggestions as you type

### 🎨 Appearance
- **Themes** — dark/light with custom CSS support
- **Status Bar** — backlinks, word count, characters, reading time, Ln/Col

### 🔒 Security & Privacy
- **Encrypted Notes** — AES-256-GCM encryption
- **Fully Local** — your data never leaves your machine

### 🧩 Extensibility
- **Obsidian Plugin Compatibility** — runs real community plugins via 3,500+ line API shim
- **Plugin Explorer** — browse, search, and install community plugins from within the app
- **Canvas** — infinite canvas for visual thinking

### 🚀 Performance
- **~16MB binary** — no Electron, no bloat
- **Auto-Updater** — checks GitHub Releases with download progress and auto-restart

---

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop App | **Tauri v2** |
| Backend | **Rust** |
| Frontend | Vanilla HTML/CSS/JS |
| Editor Engine | **CodeMirror 6** |
| Markdown | pulldown-cmark |
| Search | Tantivy |
| Plugins | JS (Obsidian-compatible API shim) |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Malpurr/Oxidian.git
cd Oxidian

# Install dependencies
npm install

# Development
npm run tauri dev

# Production build
npm run tauri build
```

> **NixOS users:** See [Building from Source](https://malpurr.github.io/Oxidian/docs/building.html) for FHS environment setup.

## 📖 Documentation

- **[User Guide](docs/USER-GUIDE.md)** — complete guide to all features
- **[Changelog](docs/CHANGELOG.md)** — version history

## 🧩 Plugin Compatibility

Oxidian ships with a **3,500+ line Obsidian API shim** that lets you run real Obsidian community plugins:

- Command palette integration
- Settings tabs
- Markdown post-processing
- Event system (file open/save/delete)
- Vault API, Workspace API, MetadataCache

```javascript
// Plugins just work™
class MyPlugin extends Plugin {
  onload() {
    this.addCommand({
      id: 'my-command',
      name: 'Do Something',
      callback: () => console.log('Hello from Oxidian!')
    });
  }
}
```

## 📁 Project Structure

```
oxidian/
├── src-tauri/           # Rust backend
│   └── src/
│       ├── main.rs      # Tauri entry
│       ├── commands.rs   # IPC commands
│       ├── search.rs     # Tantivy search
│       ├── vault.rs      # File operations
│       ├── encryption.rs # AES-256-GCM
│       └── settings.rs   # App settings
├── src/                 # Frontend
│   ├── js/
│   │   ├── app.js       # Core app
│   │   ├── codemirror-editor.js  # CodeMirror 6 editor
│   │   ├── remember.js  # Knowledge retention system
│   │   ├── command-palette.js    # Command palette
│   │   ├── canvas.js    # Infinite canvas
│   │   ├── graph.js     # Graph view
│   │   ├── tabs.js      # Tab system
│   │   ├── settings.js  # Settings UI
│   │   ├── plugin-loader.js
│   │   └── obsidian-api.js  # 3500+ line API shim
│   └── css/style.css
└── assets/
    └── logo.png
```

## 🏢 Built by Oxidian Studio

Oxidian is developed by **Oxidian Studio** — a team of AI agents working daily to build the best open-source note-taking app.

| Role | Agent | Focus |
|------|-------|-------|
| CEO | Marcel | Vision & Direction |
| CTO | Clawy | Architecture & Coordination |
| Research | Scout | Competitive Analysis |
| Backend | Forge | Rust & Performance |
| Frontend | Pixel | UI/UX |
| QA | Breaker | Testing & Bugs |
| Docs | Scribe | Documentation |

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Made with 🦀 Rust and ☕ by machines that don't sleep</sub>
</p>
