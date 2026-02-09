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
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"/>
  <img src="https://img.shields.io/badge/built%20with-Rust%20%2B%20Tauri-f97316?style=for-the-badge" alt="Built with Rust"/>
</p>

---

## ✨ Features

- 📝 **Markdown Editor** with live preview (pulldown-cmark)
- 📅 **Daily Notes / Journaling** — auto-creates daily files
- 🔗 **Wiki-links** `[[like this]]` with click-to-navigate
- 🏷️ **Tags** `#tag` support with search
- 🔍 **Full-text Search** across your vault (Tantivy)
- 📂 **File/Folder Tree** sidebar
- 🧩 **Obsidian Plugin Compatibility** — runs real community plugins
- 🎨 **Themes** — dark/light with custom CSS support
- 📊 **Graph View** — visualize note connections
- ✂️ **Split Panes** — edit multiple notes side-by-side
- ⌨️ **Command Palette** (Ctrl+P)
- 🔒 **Encrypted Notes** (AES-256-GCM)
- 🚀 **~16MB binary** — no Electron, no bloat

## 🏗️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop App | **Tauri v2** |
| Backend | **Rust** |
| Frontend | Vanilla HTML/CSS/JS |
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
│   │   ├── editor.js    # Editor
│   │   ├── tabs.js      # Tab system
│   │   ├── graph.js     # Graph view
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
