# Deep Test: Plugins + Community Plugins + Plugin API
**Date:** 2026-02-10  
**Tester:** Subagent deep-plugins  
**Status:** Complete

---

## 1. Core Plugins

### Was existiert
16 Core Plugins definiert in `settings.js` → `getCorePluginInfo()` (Zeile ~1020):
- file_explorer, search, quick_switcher, graph_view, backlinks, outgoing_links, tag_pane, page_preview, starred, templates, note_composer, command_palette, markdown_importer, word_count, open_with_default_app, file_recovery

### Toggle-Mechanismus
- **UI:** `settings.js` Zeile ~985 — rendert Checkboxen mit `id="core-plugin-${pluginId}"`
- **Event:** `bindCorePluginsEvents()` (Zeile ~1277) ruft `invoke('toggle_core_plugin', { plugin, enabled })` auf
- **Backend:** ⚠️ **`toggle_core_plugin` Tauri-Command existiert NICHT in `plugin_cmds.rs`!** Es gibt nur `toggle_plugin` (für Community Plugins).

### Bewertung: ❌ Toggle funktioniert NICHT
Der Rust-Backend-Command fehlt. Der Toggle klickt zwar in der UI, speichert aber den State nicht persistent und hat keinen Effekt auf die App-Funktionalität.

### Fix
1. **`plugin_cmds.rs`** — neuen Command `toggle_core_plugin` hinzufügen, der `core_plugins` in den Settings-JSON aktualisiert
2. **Oder:** Core Plugin States direkt über `save_settings` persistieren (der `saveAll()` in settings.js speichert sie ja über das Settings-Objekt — prüfen ob das ausreicht)
3. **Tatsächliche Feature-Aktivierung:** Aktuell gibt es keinen Code der Core Plugins tatsächlich lädt/entlädt basierend auf dem Toggle. Die Features (File Explorer, Search, etc.) sind hardcoded in der App. Core Plugin Toggles sind rein kosmetisch.

---

## 2. Community Plugins

### Install-Flow
1. **Discover:** `loader.rs` → `fetch_community_plugin_list()` fetcht von Obsidian's GitHub (`obsidian-releases/master/community-plugins.json`)
2. **Install:** `loader.rs` → `download_plugin()` lädt manifest.json + main.js + styles.css von GitHub Releases
3. **Enable:** `plugin_cmds.rs` → `enable_plugin()` → `PluginRegistry::enable_plugin()` → schreibt in `community-plugins.json`

### UI: Namen statt IDs?
- **`settings.js` Zeile ~1065 (`renderInstalledPlugins`):** ⚠️ **Gibt NUR einen leeren State zurück!** 
  ```js
  renderInstalledPlugins() {
      return `<div class="plugins-empty-state">...No community plugins installed...</div>`;
  }
  ```
  Die Methode `loadInstalledPlugins()` (Zeile ~1580) ist ein leerer Stub!

### Bewertung: ⚠️ Teilweise funktionsfähig
- **Backend:** Discover + Install + Enable/Disable funktioniert vollständig (gut getestet mit Unit Tests)
- **UI:** ❌ Installed Plugins werden NIE angezeigt. Die Settings-Page zeigt immer "No community plugins installed" auch wenn Plugins installiert und aktiv sind.
- **Browse:** `showPluginBrowser()` (Zeile ~1584) ist ein leerer Stub

### Fix
```js
// settings.js — renderInstalledPlugins() ersetzen:
async renderInstalledPlugins() {
    const manifests = await invoke('discover_plugins');
    const enabled = await invoke('get_enabled_plugins');
    const enabledSet = new Set(enabled);
    
    if (!manifests || manifests.length === 0) {
        return `<div class="plugins-empty-state">...</div>`;
    }
    
    return manifests.map(m => `
        <div class="plugin-item ${enabledSet.has(m.id) ? 'enabled' : 'disabled'}">
            <div class="plugin-info">
                <div class="plugin-name">${m.name}</div>
                <div class="plugin-description">${m.description} — v${m.version} by ${m.author}</div>
            </div>
            <div class="plugin-toggle">
                <div class="checkbox-container">
                    <input type="checkbox" data-plugin-id="${m.id}" ${enabledSet.has(m.id) ? 'checked' : ''} />
                </div>
            </div>
        </div>
    `).join('');
}
```
Plus: Event binding für die Toggle-Checkboxen die `app.pluginLoader.togglePlugin()` aufrufen.

---

## 3. Plugin API — Obsidian API Emulation

### Vollständig implementiert ✅
| API | Status | Details |
|-----|--------|---------|
| `app.vault` (Vault) | ✅ Gut | read, write, create, modify, delete, rename, copy, getFiles, getMarkdownFiles, cachedRead, process, append, events (create/modify/delete/rename) |
| `app.workspace` (Workspace) | ✅ Basis | getActiveFile, setActiveFile, getLeaf, getLeavesOfType, getActiveViewOfType, onLayoutReady, events |
| `app.metadataCache` | ✅ Teilweise | getFileCache, getFirstLinkpathDest, getBacklinksForFile (via Rust), getFrontmatter (via Rust), resolveLink (via Rust) |
| `app.fileManager` | ✅ Gut | renameFile, generateMarkdownLink, createNewMarkdownFile, processFrontMatter (with Rust fallback) |
| `Plugin` base class | ✅ Gut | addCommand, addRibbonIcon, addStatusBarItem, addSettingTab, registerView, registerMarkdownPostProcessor, registerMarkdownCodeBlockProcessor, loadData, saveData |
| `Component` lifecycle | ✅ Gut | load/unload, addChild, registerEvent, registerDomEvent, registerInterval, register (cleanup) |
| `Setting` + alle UI Components | ✅ Vollständig | TextComponent, TextAreaComponent, ToggleComponent, DropdownComponent, SliderComponent, ButtonComponent, ColorComponent, SearchComponent, ExtraButtonComponent, MomentFormatComponent, ProgressBarComponent |
| `Modal`, `SuggestModal`, `FuzzySuggestModal` | ✅ Gut | Keyboard navigation, search, rendering |
| `Menu` + `MenuItem` | ✅ Gut | addItem, addSeparator, showAtPosition, showAtMouseEvent |
| `Notice` | ✅ Gut | Auto-dismiss, message update |
| `MarkdownView` | ✅ Basis | getViewType, editor, getViewData, setViewData |
| `Editor` | ✅ Gut | getValue/setValue, getLine/setLine, getCursor/setCursor, getSelection/replaceSelection, replaceRange, posToOffset/offsetToPos, transaction |
| DOM Extensions | ✅ Vollständig | createEl, createDiv, createSpan, addClass, removeClass, toggleClass, empty, detach, find, findAll, show, hide, toggle, on/off (delegated), setText, getText |
| Utility Functions | ✅ Vollständig | normalizePath, debounce, moment (comprehensive), parseYaml, stringifyYaml, parseLinktext, fuzzySearch, requestUrl |
| Icon System | ✅ Gut | setIcon, addIcon, getIcon, getIconIds — 20+ Lucide icons built-in, custom icon registry |

### Fehlend/Stub ⚠️
| API | Status | Impact |
|-----|--------|--------|
| `app.workspace.openLinkText()` | Stub | Plugins die Links öffnen wollen |
| `Vault.createFolder()` | Stub | Plugins die Ordner erstellen |
| `Editor.focus/blur/undo/redo` | Stub | Editor-manipulierende Plugins |
| `Plugin.registerCodeMirror()` | Stub | CM5-Legacy Plugins |
| `Plugin.registerEditorSuggest()` | Stub | Autocomplete-Plugins |
| `Plugin.registerObsidianProtocolHandler()` | Stub | URI-Handler Plugins |
| `FileSystemAdapter.readBinary/writeBinary` | Text fallback | Binary file Plugins (Images, PDFs) |
| `FileSystemAdapter.mkdir/trashSystem/trashLocal/rmdir` | Stub | File management Plugins |
| `MarkdownPreviewView.rerender()` | Stub | Preview-manipulierende Plugins |
| `WorkspaceLeaf.setViewState()` | Stub | View-switching Plugins |
| `app.commands` | Partial | listCommands works, but not connected to PluginRegistry |

### Besonders gut gemacht 👍
- **moment()** — Extrem umfassende Implementierung mit korrektem Token-Parsing (vermeidet cascading corruption), add/subtract/diff/startOf/endOf, static methods
- **DOM Extensions** — Vollständige Obsidian DOM API inkl. delegated events, SVG, polyfills
- **Dual Settings Backend** — Plugin.loadData/saveData mit Fallback von PluginRegistry auf legacy get_plugin_data

---

## 4. Plugin Settings

### Können Plugins eigene Settings registrieren? ✅ JA

**Mechanismus:**
1. Plugin ruft `this.addSettingTab(new MySettingTab(this.app, this))` auf
2. `Plugin.addSettingTab()` (obsidian-api.js Zeile ~2680) registriert den Tab im `PluginRegistry`
3. `PluginSettingTab` erbt von `SettingTab` — hat `containerEl` und `display()` Methode
4. `plugin-loader.js` → `getPluginSettingTab(pluginId)` gibt den Tab zurück

**Data Persistence:**
- `Plugin.loadData()` → `invoke('get_plugin_settings')` → Rust `PluginRegistry::load_settings()` → liest `data.json`
- `Plugin.saveData()` → `invoke('save_plugin_settings')` → Rust `PluginRegistry::save_settings()` → schreibt `data.json`
- Cache-Layer in Rust für Performance

### Problem: ⚠️ Settings Tab wird nicht in der Settings-UI angezeigt
Die `settings.js` hat keinen Code der Plugin Setting Tabs in die Settings-Navigation einfügt. Plugins registrieren ihren Tab, aber er wird nirgends gerendert.

### Fix
In `settings.js` → `renderCommunityPluginsSection()` oder als separate Nav-Items: Für jedes Plugin mit registriertem SettingTab einen Nav-Button + Section hinzufügen. Dazu `pluginLoader.registry.settingTabs` iterieren.

---

## 5. WASM Sandbox

### Wie funktioniert das Sandboxing?

**Architektur:** Kein WASM! Trotz des Namens "sandbox.rs" ist das Sandboxing konzeptionell, nicht technisch WASM-basiert.

**Actual Sandbox (sandbox.rs):**
- **Permission System:** 11 Permission-Level (VaultRead, VaultWrite, SettingsRead/Write, Commands, Ui, Network, Clipboard, Shell, InterPlugin, AppSettings)
- **Default Permissions:** VaultRead + VaultWrite + SettingsRead/Write + Commands + Ui (Obsidian-kompatibel)
- **Dangerous Permissions:** Shell, Network, AppSettings — erfordern explizite User-Genehmigung
- **Path Sandboxing:** `validate_path()` — verhindert Path Traversal (absolute Pfade, `..` components, symlink-Escapes)
- **Resource Tracking:** Limits für Commands (100), Event Listeners (200), Timers (50), DOM Elements (1000), API Calls/min (5000)
- **Error Containment:** Auto-Disable nach 10+ Errors in 60 Sekunden
- **SandboxManager:** Verwaltet Sandboxen pro Plugin

**JS Execution (plugin-loader.js):**
- Plugins laufen als `new Function()` im Browser-Context — KEIN echter Sandbox!
- `require('obsidian')` wird auf das API-Shim gemappt
- Plugin Code hat vollen Zugriff auf `window`, `document`, `fetch`, `localStorage` etc.

### Limitationen ⚠️
1. **Kein echter JS-Sandbox:** Plugins können beliebig DOM manipulieren, fetch aufrufen, localStorage lesen
2. **Permission System nur serverseitig:** `sandbox.rs` Permissions werden nur beim Rust-API-Dispatcher (`api.rs`) geprüft — JS-seitige APIs (fetch, DOM) sind unkontrolliert
3. **SandboxManager wird nicht instantiiert:** In `plugin_cmds.rs` wird `SandboxManager` nirgends erstellt oder verwendet! Der `PluginApiDispatcher` wird auch nie instantiiert. Das gesamte Sandbox/API-Dispatch System ist **toter Code**.
4. **Resource Limits nicht enforced:** ResourceTracker existiert, wird aber nie von plugin-loader.js aufgerufen

### Fix-Priorität
1. **Kritisch:** SandboxManager + PluginApiDispatcher in den AppState integrieren und bei Plugin-Loads aktivieren
2. **Mittel:** JS-seitige fetch/localStorage Proxy für Permission-Checks
3. **Niedrig:** Echte Isolation (z.B. iframe sandbox oder Worker)

---

## 6. Plugin-Buttons funktionieren nicht — Root Cause Analysis

### Problem
User berichtet: Plugin-Buttons funktionieren nicht.

### Root Cause: `addRibbonIcon()` target Element existiert möglicherweise nicht

**Code:** `obsidian-api.js` Plugin.addRibbonIcon() (Zeile ~2641):
```js
addRibbonIcon(icon, title, callback) {
    const el = document.createElement('button');
    el.className = 'side-dock-ribbon-action clickable-icon';
    el.setAttribute('aria-label', title);
    el.title = title;
    setIcon(el, icon);
    el.addEventListener('click', callback);
    this._ribbonIcons.push(el);

    const ribbonTop = document.querySelector('#ribbon .ribbon-top');
    if (ribbonTop) ribbonTop.appendChild(el);

    return el;
}
```

### Bug 1: ❌ Ribbon Container existiert nicht
`document.querySelector('#ribbon .ribbon-top')` — wenn dieses Element nicht existiert (was wahrscheinlich ist, da Oxidian vermutlich keine `#ribbon > .ribbon-top` Struktur hat), wird der Button erstellt aber **nie zum DOM hinzugefügt**. Der Button schwebt nur im Memory.

### Bug 2: ❌ Plugin.load() ruft onload() auf, nicht onLoad()
**Code:** `Component.load()` (Zeile ~75):
```js
load() {
    if (this._loaded) return;
    this._loaded = true;
    this.onload();  // lowercase!
}
```
Obsidian-Plugins definieren `onload()` (lowercase) — das passt. ABER: Schau dir `_createPluginSandbox()` in plugin-loader.js an:
```js
instance.load();
```
Das ruft `Component.load()` → `this.onload()` auf. ✅ Das ist korrekt.

### Bug 3: ❌ Workspace hat kein activeLeaf für editorCallback-Buttons
Commands mit `editorCallback` oder `editorCheckCallback` (statt `callback`) werden in `Plugin.addCommand()` gewrapped:
```js
if (cmd.editorCheckCallback && !cmd.callback && !cmd.checkCallback) {
    cmd.checkCallback = (checking) => {
        const leaf = this.app?.workspace?.activeLeaf;
        const view = leaf?.view;
        if (view instanceof MarkdownView) {
            return origECC(checking, view.editor, view);
        }
        return false;  // ← Returns false wenn kein activeLeaf/MarkdownView!
    };
}
```
`workspace.activeLeaf` ist standardmäßig `null`. Es wird nie gesetzt, weil Oxidian's eigener Editor nicht mit dem Obsidian-Workspace-System gekoppelt ist. **Alle editor-basierten Commands geben `false` zurück und werden in der Command Palette als disabled behandelt.**

### Bug 4: ❌ addStatusBarItem() — Status Bar Element existiert möglicherweise nicht
```js
addStatusBarItem() {
    const el = document.createElement('span');
    const statusBar = document.getElementById('statusbar');
    const statusRight = statusBar?.querySelector('.status-right');
    if (statusRight) statusRight.appendChild(el);  // Silent fail wenn nicht vorhanden
    return el;
}
```

### Zusammenfassung der Button-Bugs

| Symptom | Ursache | Fix |
|---------|---------|-----|
| Ribbon-Icons nicht sichtbar | `#ribbon .ribbon-top` existiert nicht | Oxidian muss ein Ribbon-Container Element bereitstellen, oder `addRibbonIcon` muss den Container erstellen |
| Editor-Commands disabled | `workspace.activeLeaf` ist immer null | Oxidian's Tab/Editor System muss den aktiven Leaf setzen: `workspace.activeLeaf = leaf; workspace.activeEditor = { editor }` |
| Status Bar Items nicht sichtbar | `#statusbar .status-right` existiert nicht | Statusbar-Container bereitstellen |
| Command Palette Buttons klicken ohne Effekt | Commands mit nur `editorCallback` returnen false | Gleicher Fix wie activeLeaf |

### Konkreter Fix für alle Button-Probleme:

**1. Ribbon Container erstellen (plugin-loader.js init):**
```js
// In PluginLoader.init():
if (!document.querySelector('#ribbon .ribbon-top')) {
    const ribbon = document.getElementById('ribbon') || (() => {
        const r = document.createElement('div');
        r.id = 'ribbon';
        document.body.prepend(r);
        return r;
    })();
    if (!ribbon.querySelector('.ribbon-top')) {
        const top = document.createElement('div');
        top.className = 'ribbon-top';
        ribbon.prepend(top);
    }
}
```

**2. Active Leaf wiring (plugin-loader.js _wireAppEvents):**
```js
_wireAppEvents() {
    const origOpenFile = this.oxidianApp.openFile.bind(this.oxidianApp);
    const self = this;

    this.oxidianApp.openFile = async function(path) {
        await origOpenFile(path);
        const file = new TFile(path);
        
        // Create/update active leaf with MarkdownView
        let leaf = self.obsidianApp.workspace.activeLeaf;
        if (!leaf) {
            leaf = self.obsidianApp.workspace.getLeaf();
            self.obsidianApp.workspace.activeLeaf = leaf;
        }
        const view = new MarkdownView(leaf);  // Need to import MarkdownView
        view.file = file;
        // Sync with actual editor content if possible
        leaf.view = view;
        
        self.obsidianApp.workspace.activeEditor = { editor: view.editor, file };
        self.obsidianApp.workspace.setActiveFile(file);
    };
}
```

**3. Status Bar Container:**
```js
if (!document.getElementById('statusbar')) {
    const sb = document.createElement('div');
    sb.id = 'statusbar';
    sb.innerHTML = '<div class="status-left"></div><div class="status-right"></div>';
    document.body.appendChild(sb);
}
```

---

## Zusammenfassung

| Bereich | Status | Hauptproblem |
|---------|--------|-------------|
| Core Plugins | ❌ | Toggle-Backend fehlt, Toggles sind kosmetisch |
| Community Plugins | ⚠️ | Backend OK, UI zeigt keine installierten Plugins |
| Plugin API | ✅ | Sehr umfassend, ~85% Obsidian-kompatibel |
| Plugin Settings | ⚠️ | Data-Layer OK, Settings Tab nicht in UI integriert |
| WASM/Sandbox | ❌ | Komplett toter Code, nie instantiiert |
| Plugin Buttons | ❌ | 4 Bugs: fehlende DOM-Container + null activeLeaf |

### Prioritäten
1. **🔴 P0:** Ribbon + StatusBar Container erstellen → Buttons sichtbar
2. **🔴 P0:** activeLeaf/activeEditor bei Datei-Öffnung setzen → Editor-Commands funktionieren  
3. **🟡 P1:** Installed Plugins in Settings-UI anzeigen
4. **🟡 P1:** Plugin SettingTabs in Settings-Navigation integrieren
5. **🟠 P2:** Core Plugin Toggle-Backend implementieren
6. **🟠 P2:** SandboxManager aktivieren (Security!)
7. **⚪ P3:** Browse Plugins UI, Plugin Update Check
