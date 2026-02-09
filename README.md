# Oxidian

An open-source note-taking and daily journaling app inspired by Obsidian.
Built with Tauri v2, Rust, and vanilla web technologies.

![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Markdown Editor** with live preview (powered by pulldown-cmark)
- **Daily Notes / Journaling** — auto-creates `YYYY-MM-DD.md` files
- **Wiki-links** `[[like this]]` with click-to-navigate
- **Tags** `#tag` support with highlighting
- **Full-text Search** across your vault (powered by Tantivy)
- **File/Folder Tree** sidebar for vault navigation
- **Plugin System** (WASM-based architecture)
- **Dark Theme** — clean, modern aesthetic
- **File-based Vault** — plain `.md` files, no lock-in

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop App | Tauri v2 |
| Backend | Rust |
| Frontend | Vanilla HTML/CSS/JS |
| Markdown | pulldown-cmark |
| Search | Tantivy |
| Plugins | WASM (wasmtime) |

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- System dependencies for Tauri: see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

### Build & Run

```bash
# Install JS dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Vault

By default, Oxidian stores notes in `~/.oxidian/vault/`. You can change this in settings.

## Project Structure

```
oxidian/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs     # Tauri app entry
│   │   ├── commands.rs  # Tauri IPC commands
│   │   ├── search.rs    # Tantivy full-text search
│   │   ├── markdown.rs  # Markdown rendering
│   │   ├── vault.rs     # File/vault operations
│   │   └── plugin.rs    # WASM plugin system
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                # Frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js      # Main application logic
│       ├── editor.js   # Editor component
│       ├── sidebar.js  # File tree sidebar
│       └── search.js   # Search UI
├── plugins/            # Example WASM plugin
├── package.json
├── LICENSE
└── README.md
```

## Plugin System

Oxidian supports WASM-based plugins. Plugins implement the `OxidianPlugin` trait:

```rust
pub trait OxidianPlugin {
    fn name(&self) -> String;
    fn version(&self) -> String;
    fn on_load(&mut self);
    fn on_note_open(&mut self, path: &str, content: &str) -> Option<String>;
    fn on_note_save(&mut self, path: &str, content: &str) -> Option<String>;
    fn on_render(&mut self, html: &str) -> Option<String>;
}
```

See `plugins/example-plugin/` for a reference implementation.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT — see [LICENSE](LICENSE) for details.
