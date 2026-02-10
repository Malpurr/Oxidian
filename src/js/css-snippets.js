// Oxidian — CSS Snippets Module
// Loads .css files from .oxidian/snippets/ (or .obsidian/snippets/), applies as <style> tags.

import { invoke } from './tauri-bridge.js';

export class CSSSnippets {
    constructor(app) {
        this.app = app;
        this.snippets = []; // [{ name, enabled, content }]
        this.styleElements = new Map(); // name → <style> element
        this.settingsKey = 'oxidian-css-snippets-enabled';
    }

    /**
     * Load snippets from vault and apply enabled ones.
     */
    async init() {
        const enabledSet = this._getEnabledSet();

        // Try .oxidian/snippets/ first, then .obsidian/snippets/
        let files = [];
        for (const dir of ['.oxidian/snippets', '.obsidian/snippets']) {
            try {
                const tree = await invoke('list_files_in_dir', { path: dir });
                if (tree && tree.length > 0) {
                    files = tree;
                    break;
                }
            } catch {
                // Directory doesn't exist, try next
            }
        }

        // Also try listing via file tree
        if (files.length === 0) {
            try {
                const fullTree = await this.app.getFileTree();
                const findSnippetsDir = (nodes, path) => {
                    for (const n of (nodes || [])) {
                        const nodePath = n.path || n.name;
                        if (n.children && (nodePath.endsWith('snippets') || nodePath.includes('snippets'))) {
                            return n.children.filter(c => c.name?.endsWith('.css'));
                        }
                        if (n.children) {
                            const found = findSnippetsDir(n.children, nodePath);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                files = findSnippetsDir(fullTree.children || fullTree, '') || [];
            } catch {}
        }

        this.snippets = [];
        for (const f of files) {
            const name = f.name || f.path?.split('/').pop();
            if (!name?.endsWith('.css')) continue;
            const path = f.path || f.name;
            try {
                const content = await invoke('read_note', { path });
                const enabled = enabledSet.has(name);
                this.snippets.push({ name, path, content, enabled });
                if (enabled) this._applySnippet(name, content);
            } catch (err) {
                console.warn(`[CSSSnippets] Failed to load ${name}:`, err);
            }
        }
    }

    /**
     * Toggle a snippet on/off.
     */
    toggle(name) {
        const snippet = this.snippets.find(s => s.name === name);
        if (!snippet) return;

        snippet.enabled = !snippet.enabled;
        if (snippet.enabled) {
            this._applySnippet(name, snippet.content);
        } else {
            this._removeSnippet(name);
        }
        this._saveEnabledSet();
    }

    _applySnippet(name, content) {
        this._removeSnippet(name);
        const style = document.createElement('style');
        style.dataset.snippet = name;
        style.textContent = content;
        document.head.appendChild(style);
        this.styleElements.set(name, style);
    }

    _removeSnippet(name) {
        const existing = this.styleElements.get(name);
        if (existing) {
            existing.remove();
            this.styleElements.delete(name);
        }
    }

    _getEnabledSet() {
        try {
            const stored = localStorage.getItem(this.settingsKey);
            return new Set(stored ? JSON.parse(stored) : []);
        } catch {
            return new Set();
        }
    }

    _saveEnabledSet() {
        const enabled = this.snippets.filter(s => s.enabled).map(s => s.name);
        localStorage.setItem(this.settingsKey, JSON.stringify(enabled));
    }

    /**
     * Get list of snippets for UI.
     */
    getSnippetList() {
        return this.snippets.map(s => ({ name: s.name, enabled: s.enabled }));
    }
}
