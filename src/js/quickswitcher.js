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
     * Enhanced fuzzy match with better scoring.
     * Returns score object or null for no match.
     */
    fuzzyMatch(query, target) {
        const q = query.toLowerCase();
        const t = target.toLowerCase();
        const filename = target.split('/').pop().replace('.md', '').toLowerCase();

        if (!q || q.length === 0) {
            return { score: 0, matches: [], isExact: false, isFilenameMatch: false };
        }

        // Exact matches get highest priority
        if (t.includes(q)) {
            const index = t.indexOf(q);
            return {
                score: index === 0 ? 1 : (filename.includes(q) ? 5 : 10),
                matches: [{ start: index, end: index + q.length }],
                isExact: true,
                isFilenameMatch: filename.includes(q)
            };
        }

        // Fuzzy matching
        const matches = [];
        let queryIndex = 0;
        let score = 0;
        let consecutiveMatches = 0;
        let lastMatchIndex = -1;

        for (let i = 0; i < t.length && queryIndex < q.length; i++) {
            if (t[i] === q[queryIndex]) {
                matches.push({ start: i, end: i + 1 });

                // Bonus for consecutive matches
                if (i === lastMatchIndex + 1) {
                    consecutiveMatches++;
                    score -= consecutiveMatches * 2; // Bonus gets bigger
                } else {
                    consecutiveMatches = 0;
                    // Penalty for gaps (but smaller for word boundaries)
                    const gap = lastMatchIndex >= 0 ? i - lastMatchIndex - 1 : 0;
                    const isWordBoundary = lastMatchIndex >= 0 && 
                        (t[lastMatchIndex + 1] === '/' || t[lastMatchIndex + 1] === ' ' || t[lastMatchIndex + 1] === '-');
                    score += gap * (isWordBoundary ? 0.5 : 1);
                }

                // Bonus for matching at word start
                if (i === 0 || t[i - 1] === '/' || t[i - 1] === ' ' || t[i - 1] === '-') {
                    score -= 5;
                }

                // Bonus for filename matches
                if (filename.includes(q[queryIndex])) {
                    score -= 2;
                }

                lastMatchIndex = i;
                queryIndex++;
            }
        }

        // Must match all query characters
        if (queryIndex < q.length) {
            return null;
        }

        // Additional scoring factors
        const filenameMatch = this.fuzzyMatchString(q, filename);
        if (filenameMatch && filenameMatch.score < score) {
            score = filenameMatch.score - 10; // Bonus for filename match
        }

        return {
            score: score + target.length * 0.1, // Small penalty for longer paths
            matches,
            isExact: false,
            isFilenameMatch: filename.includes(q)
        };
    }

    /**
     * Helper for fuzzy matching a single string
     */
    fuzzyMatchString(query, target) {
        const q = query.toLowerCase();
        const t = target.toLowerCase();
        let score = 0;
        let queryIndex = 0;

        for (let i = 0; i < t.length && queryIndex < q.length; i++) {
            if (t[i] === q[queryIndex]) {
                queryIndex++;
            } else {
                score++;
            }
        }

        return queryIndex === q.length ? { score } : null;
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
                    .map(path => {
                        const match = this.fuzzyMatch(q, path);
                        return match ? { 
                            path, 
                            score: match.score,
                            matchInfo: match,
                            recent: this._isRecentFile(path)
                        } : null;
                    })
                    .filter(item => item !== null)
                    .sort((a, b) => {
                        // Recent files get priority boost
                        const aScore = a.score - (a.recent ? 50 : 0);
                        const bScore = b.score - (b.recent ? 50 : 0);
                        
                        // Exact matches get highest priority
                        if (a.matchInfo.isExact && !b.matchInfo.isExact) return -1;
                        if (!a.matchInfo.isExact && b.matchInfo.isExact) return 1;
                        
                        // Filename matches get priority over path matches
                        if (a.matchInfo.isFilenameMatch && !b.matchInfo.isFilenameMatch) return -1;
                        if (!a.matchInfo.isFilenameMatch && b.matchInfo.isFilenameMatch) return 1;
                        
                        return aScore - bScore;
                    })
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
     * Check if a file is in the recent files list
     */
    _isRecentFile(path) {
        return (this.app.recentFiles || []).includes(path);
    }

    /**
     * Load a note preview into the preview pane with enhanced content.
     */
    async _loadPreview(path, previewEl) {
        try {
            const content = await invoke('read_note', { path });
            
            // Get first 500 words for preview
            const words = content.split(/\s+/).slice(0, 500).join(' ');
            
            // Process with app's markdown renderer for consistency
            const html = await this.app.renderMarkdown(words);
            
            // Add metadata
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

    /**
     * Get basic content statistics
     */
    _getContentStats(content) {
        const lines = content.split('\n').length;
        const words = content.split(/\s+/).filter(word => word.length > 0).length;
        return { lines, words };
    }

    /**
     * Format file size in human readable format
     */
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
