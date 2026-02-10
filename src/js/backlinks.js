// Oxidian — Enhanced Backlinks Module
// Loads backlinks from Rust backend and renders them in a panel.

const { invoke } = window.__TAURI__.core;

export class BacklinksManager {
    constructor(app) {
        this.app = app;
        this.currentBacklinks = [];
    }

    /**
     * Get all backlinks for a given note path via Rust.
     * Returns Array<{ source: string, snippets: string[] }>
     */
    async getBacklinks(notePath) {
        try {
            const results = await invoke('get_backlinks', { filePath: notePath });
            this.currentBacklinks = results;
            return results;
        } catch (err) {
            console.error('BacklinksManager: failed to get backlinks', err);
            this.currentBacklinks = [];
            return [];
        }
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

            if (snippets && snippets.length > 0) {
                const snippetContainer = document.createElement('div');
                snippetContainer.className = 'backlink-snippets';
                snippets.slice(0, 3).forEach(s => {
                    const snippetEl = document.createElement('div');
                    snippetEl.className = 'backlink-snippet';
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
     * Invalidate is now a no-op since Rust manages the index.
     */
    invalidate() {
        // Rust backend handles index invalidation
    }

    // --- Helpers ---

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
