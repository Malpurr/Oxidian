// Oxidian — Quick Switcher Module
// Fuzzy search via Rust invoke(), UI/keyboard-nav stays JS.

import { invoke } from './tauri-bridge.js';

export class QuickSwitcher {
    constructor(app) {
        this.app = app;
    }

    /**
     * Show the Quick Switcher overlay.
     */
    async show() {
        // Remove existing
        const existing = document.getElementById('quick-switcher-overlay');
        if (existing) { existing.remove(); return; }

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
        let filtered = await this._getInitialList();

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
            if (filtered[selectedIndex]) {
                this._loadPreview(filtered[selectedIndex].path, preview);
            }
        };

        let searchTimeout = null;
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                const q = input.value.trim();
                if (!q) {
                    filtered = await this._getInitialList();
                } else {
                    // Fuzzy search via Rust — returns scored + sorted results
                    try {
                        const rustResults = await invoke('fuzzy_search', { query: q });
                        filtered = (rustResults || []).slice(0, 50).map(r => ({
                            path: r.path,
                            score: r.score || 0,
                            recent: this._isRecentFile(r.path),
                        }));
                    } catch (err) {
                        console.error('Fuzzy search failed:', err);
                        filtered = [];
                    }
                }
                selectedIndex = 0;
                renderList();
            }, 100);
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
     * Get initial list: recent files first, then all files (via Rust).
     */
    async _getInitialList() {
        try {
            // Empty query fuzzy_search returns all files sorted
            const allFiles = await invoke('fuzzy_search', { query: '' });
            const recent = (this.app.recentFiles || []).slice(0, 5);
            const recentSet = new Set(recent);
            const items = [];

            // Recent files first
            for (const path of recent) {
                items.push({ path, score: 0, recent: true });
            }

            // Then remaining files
            for (const r of (allFiles || [])) {
                if (!recentSet.has(r.path)) {
                    items.push({ path: r.path, score: 0, recent: false });
                }
            }

            return items.slice(0, 50);
        } catch {
            return [];
        }
    }

    _isRecentFile(path) {
        return (this.app.recentFiles || []).includes(path);
    }

    async _loadPreview(path, previewEl) {
        try {
            const content = await invoke('read_note', { path });
            const words = content.split(/\s+/).slice(0, 500).join(' ');
            const html = await this.app.renderMarkdown(words);

            const stats = this._getContentStats(content);
            const metadata = `
                <div class="quick-switcher-preview-meta">
                    <span>${stats.words} words</span>
                    <span>${stats.lines} lines</span>
                    <span>${this._formatFileSize(content.length)}</span>
                    ${this._isRecentFile(path) ? '<span class="recent-badge">Recent</span>' : ''}
                </div>
            `;

            previewEl.innerHTML = `
                <div class="quick-switcher-preview-header">
                    <h4>${path.replace('.md', '').split('/').pop()}</h4>
                    <span class="quick-switcher-preview-path">${path}</span>
                </div>
                ${metadata}
                <div class="quick-switcher-preview-content">${html}</div>
            `;
        } catch (error) {
            previewEl.innerHTML = `
                <div class="quick-switcher-preview-empty">
                    Failed to load preview: ${error.message}
                </div>
            `;
        }
    }

    _getContentStats(content) {
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(w => w.length > 0).length;
        return { lines, words };
    }

    _formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
