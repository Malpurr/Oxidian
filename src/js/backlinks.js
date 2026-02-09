// Oxidian — Enhanced Backlinks Module
// Scans all notes for [[wiki-links]] pointing to the current note,
// shows count in statusbar, and provides a rich panel with context snippets.

const { invoke } = window.__TAURI__.core;

export class BacklinksManager {
    constructor(app) {
        this.app = app;
        this.cache = new Map(); // path → { links: Set<target>, content: string }
        this.currentBacklinks = [];
    }

    /**
     * Build/refresh the backlink index by scanning all vault files.
     * Returns a Map<targetName, Array<{source, snippets}>>
     */
    async buildIndex() {
        this.cache.clear();
        try {
            const files = await invoke('list_files');
            const mdFiles = this._collectMdFiles(files);
            const wikiLinkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

            for (const filePath of mdFiles) {
                try {
                    const content = await invoke('read_note', { path: filePath });
                    const links = new Set();
                    let match;
                    while ((match = wikiLinkRe.exec(content)) !== null) {
                        links.add(match[1].trim());
                    }
                    this.cache.set(filePath, { links, content });
                } catch {
                    // skip unreadable files
                }
            }
        } catch (err) {
            console.error('BacklinksManager: failed to build index', err);
        }
    }

    /**
     * Find all backlinks for a given note path.
     * Returns Array<{ source: string, snippets: string[] }>
     */
    async getBacklinks(notePath) {
        // Rebuild index if empty (first call or after refresh)
        if (this.cache.size === 0) {
            await this.buildIndex();
        }

        const noteName = notePath.replace(/\.md$/, '').split('/').pop();
        const results = [];

        for (const [sourcePath, { links, content }] of this.cache) {
            if (sourcePath === notePath) continue;
            if (!links.has(noteName) && !links.has(notePath) && !links.has(notePath.replace(/\.md$/, ''))) continue;

            // Extract context snippets (lines containing the link)
            const snippets = [];
            const lines = content.split('\n');
            const linkRe = new RegExp(`\\[\\[${this._escapeRegex(noteName)}(\\|[^\\]]+)?\\]\\]`, 'gi');
            for (let i = 0; i < lines.length; i++) {
                if (linkRe.test(lines[i])) {
                    // Grab surrounding context (1 line before, the line, 1 line after)
                    const start = Math.max(0, i - 1);
                    const end = Math.min(lines.length - 1, i + 1);
                    const snippet = lines.slice(start, end + 1).join('\n').trim();
                    if (snippet) snippets.push(snippet);
                }
                linkRe.lastIndex = 0;
            }

            results.push({ source: sourcePath, snippets });
        }

        this.currentBacklinks = results;
        return results;
    }

    /**
     * Update the statusbar backlink count and panel if open.
     */
    async updateForNote(notePath) {
        const backlinks = await this.getBacklinks(notePath);
        const countEl = document.getElementById('backlink-count');
        if (countEl) {
            countEl.textContent = `${backlinks.length} backlink${backlinks.length !== 1 ? 's' : ''}`;
        }

        if (this.app.backlinksPanelOpen) {
            this.renderPanel(backlinks);
        }
    }

    /**
     * Render the backlinks panel with context snippets.
     */
    renderPanel(backlinks) {
        const list = document.querySelector('#backlinks-panel .backlinks-panel-list');
        if (!list) return;

        if (!backlinks || backlinks.length === 0) {
            list.innerHTML = '<div class="backlink-panel-empty">No backlinks found</div>';
            return;
        }

        list.innerHTML = '';
        backlinks.forEach(({ source, snippets }) => {
            const item = document.createElement('div');
            item.className = 'backlink-panel-item';

            const name = source.replace(/\.md$/, '').split('/').pop();
            const folder = source.includes('/') ? source.substring(0, source.lastIndexOf('/')) : '';

            const header = document.createElement('div');
            header.className = 'backlink-item-header';
            header.innerHTML = `
                <span class="backlink-item-icon">📄</span>
                <span class="backlink-item-name">${this._escapeHtml(name)}</span>
                ${folder ? `<span class="backlink-item-folder">${this._escapeHtml(folder)}</span>` : ''}
            `;
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => this.app.openFile(source));
            item.appendChild(header);

            if (snippets.length > 0) {
                const snippetContainer = document.createElement('div');
                snippetContainer.className = 'backlink-snippets';
                snippets.slice(0, 3).forEach(s => {
                    const snippetEl = document.createElement('div');
                    snippetEl.className = 'backlink-snippet';
                    // Highlight the wiki-link in the snippet
                    const highlighted = s.replace(/\[\[([^\]]+)\]\]/g, '<mark>$1</mark>');
                    snippetEl.innerHTML = highlighted;
                    snippetEl.addEventListener('click', () => this.app.openFile(source));
                    snippetContainer.appendChild(snippetEl);
                });
                item.appendChild(snippetContainer);
            }

            list.appendChild(item);
        });
    }

    /**
     * Invalidate cache so next call rebuilds the index.
     */
    invalidate() {
        this.cache.clear();
    }

    // --- Helpers ---

    _collectMdFiles(fileNodes) {
        const result = [];
        const walk = (nodes) => {
            for (const node of nodes) {
                if (node.is_dir) {
                    walk(node.children || []);
                } else if (node.path && node.path.endsWith('.md')) {
                    result.push(node.path);
                }
            }
        };
        walk(fileNodes);
        return result;
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
