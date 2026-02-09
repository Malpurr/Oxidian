// Oxidian — Quick Switcher Module
// Enhanced Ctrl+P with fuzzy search, recent files, and preview.

const { invoke } = window.__TAURI__.core;

export class QuickSwitcher {
    constructor(app) {
        this.app = app;
        this.allFiles = [];
    }

    /**
     * Collect all .md file paths from the vault.
     */
    async refreshFileList() {
        try {
            const files = await invoke('list_files');
            this.allFiles = [];
            this._collectMdFiles(files, this.allFiles);
        } catch {
            this.allFiles = [];
        }
    }

    _collectMdFiles(nodes, result) {
        for (const node of nodes) {
            if (node.is_dir) {
                this._collectMdFiles(node.children || [], result);
            } else if (node.path && node.path.endsWith('.md')) {
                result.push(node.path);
            }
        }
    }

    /**
     * Simple fuzzy match: all chars of query appear in order in target.
     * Returns score (lower = better) or -1 for no match.
     */
    fuzzyMatch(query, target) {
        const q = query.toLowerCase();
        const t = target.toLowerCase();

        // Exact substring match gets best score
        const subIdx = t.indexOf(q);
        if (subIdx !== -1) return subIdx;

        // Fuzzy: chars in order
        let qi = 0;
        let score = 0;
        let lastMatch = -1;
        for (let ti = 0; ti < t.length && qi < q.length; ti++) {
            if (t[ti] === q[qi]) {
                // Penalize gaps
                if (lastMatch !== -1) score += (ti - lastMatch - 1);
                lastMatch = ti;
                qi++;
            }
        }
        return qi === q.length ? score + 100 : -1; // +100 to rank below substring matches
    }

    /**
     * Show the Quick Switcher overlay.
     */
    async show() {
        // Remove existing
        const existing = document.getElementById('quick-switcher-overlay');
        if (existing) { existing.remove(); return; }

        await this.refreshFileList();

        const overlay = document.createElement('div');
        overlay.id = 'quick-switcher-overlay';
        overlay.className = 'command-palette-overlay';

        const switcher = document.createElement('div');
        switcher.className = 'command-palette quick-switcher';

        const input = document.createElement('input');
        input.className = 'command-palette-input';
        input.placeholder = 'Quick switch — type to search notes...';
        input.autocomplete = 'off';

        const body = document.createElement('div');
        body.className = 'quick-switcher-body';

        const results = document.createElement('div');
        results.className = 'command-palette-results quick-switcher-results';

        const preview = document.createElement('div');
        preview.className = 'quick-switcher-preview';
        preview.innerHTML = '<div class="quick-switcher-preview-empty">Select a note to preview</div>';

        body.appendChild(results);
        body.appendChild(preview);
        switcher.appendChild(input);
        switcher.appendChild(body);
        overlay.appendChild(switcher);
        document.body.appendChild(overlay);

        let selectedIndex = 0;
        let filtered = this._getInitialList();

        const renderList = () => {
            results.innerHTML = '';
            if (filtered.length === 0) {
                results.innerHTML = '<div class="command-palette-empty">No matching notes</div>';
                preview.innerHTML = '<div class="quick-switcher-preview-empty">No match</div>';
                return;
            }
            filtered.forEach((item, i) => {
                const el = document.createElement('div');
                el.className = 'command-palette-item' + (i === selectedIndex ? ' selected' : '');
                const name = item.path.replace(/\.md$/, '').split('/').pop();
                const folder = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
                el.innerHTML = `
                    <span class="command-palette-name">${item.recent ? '🕐 ' : ''}${this._escapeHtml(name)}</span>
                    ${folder ? `<span class="command-palette-shortcut">${this._escapeHtml(folder)}</span>` : ''}
                `;
                el.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    overlay.remove();
                    this.app.openFile(item.path);
                });
                el.addEventListener('mouseenter', () => {
                    selectedIndex = i;
                    renderList();
                    this._loadPreview(item.path, preview);
                });
                results.appendChild(el);
            });
            // Load preview for selected item
            if (filtered[selectedIndex]) {
                this._loadPreview(filtered[selectedIndex].path, preview);
            }
        };

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (!q) {
                filtered = this._getInitialList();
            } else {
                filtered = this.allFiles
                    .map(path => ({ path, score: this.fuzzyMatch(q, path) }))
                    .filter(item => item.score !== -1)
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 50);
            }
            selectedIndex = 0;
            renderList();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
                renderList();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
                renderList();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (!filtered[selectedIndex]) return;
                overlay.remove();
                if (e.ctrlKey || e.metaKey) {
                    // Ctrl+Enter → open in split/new tab
                    this.app.openFileInSplit(filtered[selectedIndex].path);
                } else {
                    this.app.openFile(filtered[selectedIndex].path);
                }
            } else if (e.key === 'Escape') {
                overlay.remove();
            }
        });

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        renderList();
        input.focus();
    }

    /**
     * Get initial list: recent files first, then all files.
     */
    _getInitialList() {
        const recent = (this.app.recentFiles || []).slice(0, 5);
        const recentSet = new Set(recent);
        const items = [];

        // Recent files first
        for (const path of recent) {
            if (this.allFiles.includes(path)) {
                items.push({ path, score: 0, recent: true });
            }
        }

        // Then remaining files alphabetically
        for (const path of this.allFiles.sort()) {
            if (!recentSet.has(path)) {
                items.push({ path, score: 0, recent: false });
            }
        }

        return items.slice(0, 50);
    }

    /**
     * Load a note preview into the preview pane.
     */
    async _loadPreview(path, previewEl) {
        try {
            const content = await invoke('read_note', { path });
            const html = await invoke('render_markdown', { content: content.substring(0, 2000) });
            previewEl.innerHTML = `<div class="quick-switcher-preview-content">${html}</div>`;
        } catch {
            previewEl.innerHTML = '<div class="quick-switcher-preview-empty">Failed to load preview</div>';
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
