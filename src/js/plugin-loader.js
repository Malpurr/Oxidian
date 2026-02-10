// Oxidian — Obsidian Plugin Loader
// Loads real Obsidian community plugins from .obsidian/plugins/
// Refactored: Plugin discovery, enable/disable, settings → Rust backend via invoke()
import { invoke } from './tauri-bridge.js';

import ObsidianAPI, { App, Plugin, Notice, TFile, MarkdownView, WorkspaceLeaf, installDomExtensions, setIcon, getIconIds } from './obsidian-api.js';

class PluginRegistry {
    constructor() {
        this.commands = new Map();      // id -> command
        this.settingTabs = new Map();   // pluginId -> tab
        this.postProcessors = [];
        this.ribbonIcons = [];
    }

    registerCommand(cmd) {
        this.commands.set(cmd.id, cmd);
    }

    unregisterCommand(id) {
        this.commands.delete(id);
    }

    registerSettingTab(pluginId, tab) {
        this.settingTabs.set(pluginId, tab);
    }

    registerPostProcessor(pp) {
        this.postProcessors.push(pp);
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }

    executeCommand(id) {
        const cmd = this.commands.get(id);
        if (!cmd) return false;
        if (cmd.callback) {
            cmd.callback();
            return true;
        }
        if (cmd.checkCallback) {
            return cmd.checkCallback(false) !== false;
        }
        return false;
    }
}

export class PluginLoader {
    constructor(oxidianApp) {
        this.oxidianApp = oxidianApp;
        this.obsidianApp = null;
        this.loadedPlugins = new Map(); // id -> plugin instance
        this.pluginManifests = new Map(); // id -> manifest
        this.enabledPlugins = new Set();
        this.registry = new PluginRegistry();

        // Global registry for Plugin base class to use
        window._oxidianPluginRegistry = this.registry;
    }

    async init() {
        // Ensure DOM extensions are installed before plugins load
        installDomExtensions();

        // Ensure global functions are available
        window.activeDocument = document;
        window.activeWindow = window;
        if (!window.setIcon) window.setIcon = setIcon;
        if (!window.getIconIds) window.getIconIds = getIconIds;

        // Ensure ribbon .ribbon-top exists (defensive — plugins use it for addRibbonIcon)
        const ribbon = document.getElementById('ribbon');
        if (ribbon && !ribbon.querySelector('.ribbon-top')) {
            const ribbonTop = document.createElement('div');
            ribbonTop.className = 'ribbon-top';
            ribbon.prepend(ribbonTop);
        }

        // Ensure statusbar .status-right exists (defensive — plugins use it for addStatusBarItem)
        const statusbar = document.getElementById('statusbar');
        if (statusbar && !statusbar.querySelector('.status-right')) {
            const statusRight = document.createElement('div');
            statusRight.className = 'status-right';
            statusbar.appendChild(statusRight);
        }

        // Create the Obsidian App object that plugins will use
        this.obsidianApp = new App();

        // Populate vault file cache
        await this.obsidianApp.vault._refreshFileCache();

        // Wire up workspace active file tracking
        this._wireAppEvents();

        // Add built-in commands
        this._registerBuiltinCommands();

        // Init command palette keyboard shortcut
        this._initCommandPalette();

        // Discover and load enabled plugins via Rust backend
        await this.discoverPlugins();
        await this.loadEnabledPlugins();

        console.log(`[PluginLoader] Initialized with ${this.loadedPlugins.size} plugins, ${this.registry.commands.size} commands`);
    }

    _wireAppEvents() {
        const origOpenFile = this.oxidianApp.openFile.bind(this.oxidianApp);
        const self = this;

        this.oxidianApp.openFile = async function (path) {
            await origOpenFile(path);
            const file = new TFile(path);
            self._updateActiveLeaf(file);
        };

        // Hook into tab activation to keep activeLeaf in sync
        const origOnTabActivated = this.oxidianApp.onTabActivated.bind(this.oxidianApp);
        this.oxidianApp.onTabActivated = function (tab) {
            origOnTabActivated(tab);
            if (tab.type === 'note' && tab.path) {
                const file = new TFile(tab.path);
                self._updateActiveLeaf(file);
            }
        };
    }

    /**
     * Update workspace.activeLeaf and workspace.activeEditor so plugins
     * that rely on them (e.g. editorCallback commands) work correctly.
     */
    _updateActiveLeaf(file) {
        const workspace = this.obsidianApp.workspace;

        // Get or create a leaf
        let leaf = workspace.activeLeaf;
        if (!leaf) {
            leaf = workspace.getLeaf();
        }

        // Create a MarkdownView with an Editor wired to the real CodeMirror content
        const view = new MarkdownView(leaf);
        view.file = file;

        // Try to sync editor content from the real Oxidian editor
        if (this.oxidianApp.editor) {
            const content = this.oxidianApp.editor.getContent?.() || '';
            view.editor.setValue(content);
        }

        leaf.view = view;
        workspace.activeLeaf = leaf;
        workspace.activeEditor = { editor: view.editor, file };
        workspace._activeFile = file;
        workspace.trigger('file-open', file);
        workspace.trigger('active-leaf-change', leaf);
    }

    _registerBuiltinCommands() {
        const app = this.oxidianApp;

        const builtins = [
            { id: 'oxidian:new-note', name: 'Create new note', callback: () => app.showNewNoteDialog() },
            { id: 'oxidian:daily-note', name: 'Open daily note', callback: () => app.openDailyNote() },
            { id: 'oxidian:save', name: 'Save current file', callback: () => app.saveCurrentFile() },
            { id: 'oxidian:search', name: 'Search in all notes', callback: () => app.search?.show() },
            { id: 'oxidian:graph', name: 'Open graph view', callback: () => app.openGraphView() },
            { id: 'oxidian:settings', name: 'Open settings', callback: () => app.openSettingsTab() },
            { id: 'oxidian:toggle-preview', name: 'Toggle editor/preview', callback: () => app.editor?.togglePreview() },
            { id: 'oxidian:close-tab', name: 'Close current tab', callback: () => { const t = app.tabManager.getActiveTab(); if (t) app.tabManager.closeTab(t.id); } },
        ];

        for (const cmd of builtins) {
            this.registry.registerCommand(cmd);
        }
    }

    _initCommandPalette() {
        this.oxidianApp.openCommandPalette = () => this.showCommandPalette();
    }

    showCommandPalette() {
        // Remove existing palette if open
        const existing = document.getElementById('command-palette-overlay');
        if (existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'command-palette-overlay';
        overlay.className = 'command-palette-overlay';

        const container = document.createElement('div');
        container.className = 'command-palette';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'command-palette-input';
        input.placeholder = 'Type a command...';

        const results = document.createElement('div');
        results.className = 'command-palette-results';

        container.appendChild(input);
        container.appendChild(results);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        const allCommands = this.registry.getAllCommands();

        const renderResults = (query) => {
            results.innerHTML = '';
            const q = query.toLowerCase();
            const filtered = q
                ? allCommands.filter(c => c.name.toLowerCase().includes(q))
                : allCommands;

            for (const cmd of filtered.slice(0, 20)) {
                const item = document.createElement('div');
                item.className = 'command-palette-item';
                item.innerHTML = `
                    <span class="command-palette-name">${escapeHtml(cmd.name)}</span>
                    ${cmd._pluginId ? `<span class="command-palette-plugin">${escapeHtml(cmd._pluginId)}</span>` : ''}
                `;
                item.addEventListener('click', () => {
                    overlay.remove();
                    this.registry.executeCommand(cmd.id);
                });
                results.appendChild(item);
            }

            if (filtered.length === 0) {
                results.innerHTML = '<div class="command-palette-empty">No matching commands</div>';
            }
        };

        renderResults('');
        input.focus();

        input.addEventListener('input', () => renderResults(input.value));

        // Keyboard navigation
        let selectedIdx = -1;
        input.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('.command-palette-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
                items.forEach((it, i) => it.classList.toggle('selected', i === selectedIdx));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIdx = Math.max(selectedIdx - 1, 0);
                items.forEach((it, i) => it.classList.toggle('selected', i === selectedIdx));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIdx >= 0 && items[selectedIdx]) {
                    items[selectedIdx].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            } else if (e.key === 'Escape') {
                overlay.remove();
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ── Plugin Discovery via Rust backend ──────────────────────────────────
    async discoverPlugins() {
        try {
            // Use Rust PluginRegistry for discovery (reads manifests, validates, checks enabled state)
            const manifests = await invoke('discover_plugins');
            for (const m of manifests) {
                this.pluginManifests.set(m.id, m);
            }
        } catch (e) {
            console.warn('[PluginLoader] Failed to discover plugins via Rust registry:', e);
            // Fallback to legacy command
            try {
                const manifests = await invoke('list_obsidian_plugins');
                for (const m of manifests) {
                    this.pluginManifests.set(m.id, m);
                }
            } catch (e2) {
                console.warn('[PluginLoader] Fallback discovery also failed:', e2);
            }
        }

        // Load enabled plugins list from Rust backend
        try {
            const enabled = await invoke('get_enabled_plugins');
            this.enabledPlugins = new Set(enabled);
        } catch {
            this.enabledPlugins = new Set();
        }
    }

    async loadEnabledPlugins() {
        for (const [id, manifest] of this.pluginManifests) {
            if (this.enabledPlugins.has(id)) {
                await this.loadPlugin(id);
            }
        }
    }

    async loadPlugin(pluginId) {
        if (this.loadedPlugins.has(pluginId)) return; // already loaded

        const manifest = this.pluginManifests.get(pluginId);
        if (!manifest) {
            console.warn(`[PluginLoader] Unknown plugin: ${pluginId}`);
            return;
        }

        try {
            // Read main.js via Rust backend
            const mainJs = await invoke('read_plugin_main', { pluginId });

            // Read styles.css via Rust backend (optional)
            try {
                const styles = await invoke('read_plugin_styles', { pluginId });
                if (styles) {
                    const styleEl = document.createElement('style');
                    styleEl.setAttribute('data-plugin', pluginId);
                    styleEl.textContent = styles;
                    document.head.appendChild(styleEl);
                }
            } catch {} // styles.css is optional

            // Create sandboxed module environment (JS execution stays in browser)
            const pluginInstance = this._createPluginSandbox(mainJs, manifest);

            if (pluginInstance) {
                this.loadedPlugins.set(pluginId, pluginInstance);
                pluginInstance._loaded = true;
                console.log(`[PluginLoader] Loaded plugin: ${manifest.name} v${manifest.version}`);
            }
        } catch (e) {
            console.error(`[PluginLoader] Failed to load plugin ${pluginId}:`, e);
            new Notice(`Failed to load plugin: ${manifest.name} — ${e.message}`);
        }
    }

    _createPluginSandbox(mainJs, manifest) {
        const moduleExports = {};
        const moduleObj = { exports: moduleExports };

        const requireFn = (moduleName) => {
            if (moduleName === 'obsidian') return ObsidianAPI;
            console.warn(`[PluginLoader] Plugin ${manifest.id} tried to require unknown module: ${moduleName}`);
            return {};
        };

        try {
            const wrappedCode = `(function(module, exports, require, app, obsidian) {\n${mainJs}\n})`;
            const fn = new Function('return ' + wrappedCode)();
            fn(moduleObj, moduleExports, requireFn, this.obsidianApp, ObsidianAPI);

            const exports = moduleObj.exports;
            let PluginClass = null;

            if (exports.default && typeof exports.default === 'function') {
                PluginClass = exports.default;
            } else if (typeof exports === 'function') {
                PluginClass = exports;
            } else {
                for (const key of Object.keys(exports)) {
                    if (typeof exports[key] === 'function') {
                        PluginClass = exports[key];
                        break;
                    }
                }
            }

            if (!PluginClass) {
                console.warn(`[PluginLoader] No plugin class found in ${manifest.id}`);
                return null;
            }

            const instance = new PluginClass(this.obsidianApp, manifest);

            // Ensure it inherits Plugin methods if the class doesn't properly extend
            if (!instance.addCommand) {
                Object.getOwnPropertyNames(Plugin.prototype).forEach(key => {
                    if (!(key in instance)) {
                        instance[key] = Plugin.prototype[key].bind(instance);
                    }
                });
                if (!instance._commands) instance._commands = [];
                if (!instance._settingTabs) instance._settingTabs = [];
                if (!instance._ribbonIcons) instance._ribbonIcons = [];
                if (!instance._events) instance._events = [];
                if (!instance._postProcessors) instance._postProcessors = [];
                if (!instance._stylesheets) instance._stylesheets = [];
                if (!instance._statusBarItems) instance._statusBarItems = [];
            }

            instance.load();

            return instance;
        } catch (e) {
            console.error(`[PluginLoader] Error evaluating plugin ${manifest.id}:`, e);
            throw e;
        }
    }

    async unloadPlugin(pluginId) {
        const instance = this.loadedPlugins.get(pluginId);
        if (!instance) return;

        try {
            instance._unload();
        } catch (e) {
            console.error(`[PluginLoader] Error unloading ${pluginId}:`, e);
        }

        // Remove stylesheets
        document.querySelectorAll(`style[data-plugin="${pluginId}"]`).forEach(el => el.remove());

        this.loadedPlugins.delete(pluginId);
        console.log(`[PluginLoader] Unloaded plugin: ${pluginId}`);
    }

    // ── Enable/Disable via Rust backend ────────────────────────────────────
    async togglePlugin(pluginId, enabled) {
        try {
            if (enabled) {
                await invoke('enable_plugin', { pluginId });
            } else {
                await invoke('disable_plugin', { pluginId });
            }
        } catch (e) {
            console.error(`[PluginLoader] Failed to ${enabled ? 'enable' : 'disable'} plugin ${pluginId}:`, e);
        }

        if (enabled) {
            this.enabledPlugins.add(pluginId);
            await this.loadPlugin(pluginId);
        } else {
            this.enabledPlugins.delete(pluginId);
            await this.unloadPlugin(pluginId);
        }
    }

    // ── Plugin Settings via Rust backend ───────────────────────────────────
    async getPluginSettings(pluginId) {
        try {
            return await invoke('get_plugin_settings', { pluginId });
        } catch (e) {
            console.warn(`[PluginLoader] Failed to load settings for ${pluginId}:`, e);
            return {};
        }
    }

    async savePluginSettings(pluginId, settings) {
        try {
            await invoke('save_plugin_settings', { pluginId, settings });
        } catch (e) {
            console.error(`[PluginLoader] Failed to save settings for ${pluginId}:`, e);
        }
    }

    isEnabled(pluginId) {
        return this.enabledPlugins.has(pluginId);
    }

    isLoaded(pluginId) {
        return this.loadedPlugins.has(pluginId);
    }

    getPluginSettingTab(pluginId) {
        return this.registry.settingTabs.get(pluginId) || null;
    }

    getObsidianApp() {
        return this.obsidianApp;
    }

    destroy() {
        for (const [id] of this.loadedPlugins) {
            this.unloadPlugin(id);
        }
        this.registry.commands.clear();
        this.registry.settingTabs.clear();
        this.registry.postProcessors = [];
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export { PluginRegistry };
