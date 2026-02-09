// Oxidian — Search Component
const { invoke } = window.__TAURI__.core;

export class Search {
    constructor(app) {
        this.app = app;
        this.input = document.getElementById('search-input');
        this.results = document.getElementById('search-results');
        this.searchTimeout = null;

        this.init();
    }

    init() {
        this.input.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                const query = this.input.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query);
                } else {
                    this.results.innerHTML = '';
                }
            }, 250);
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const first = this.results.querySelector('.search-result-item');
                if (first) first.click();
            }
            if (e.key === 'Escape') {
                this.input.value = '';
                this.results.innerHTML = '';
            }
        });
    }

    /** Show the search panel in sidebar */
    show() {
        this.app.switchSidebarPanel('search');
        setTimeout(() => {
            this.input.focus();
            this.input.select();
        }, 50);
    }

    setQuery(query) {
        this.input.value = query;
    }

    async performSearch(query) {
        try {
            const results = await invoke('search_notes', { query });
            this.renderResults(results);
        } catch (err) {
            console.error('Search failed:', err);
            this.results.innerHTML = `<div class="search-result-item" style="color: var(--text-muted)">Search error: ${err}</div>`;
        }
    }

    renderResults(results) {
        this.results.innerHTML = '';

        if (results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'search-result-item';
            empty.style.color = 'var(--text-muted)';
            empty.textContent = 'No results found';
            this.results.appendChild(empty);
            return;
        }

        for (const result of results) {
            const item = document.createElement('div');
            item.className = 'search-result-item';

            item.innerHTML = `
                <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                <div class="search-result-path">${this.escapeHtml(result.path)}</div>
                <div class="search-result-snippet">${this.escapeHtml(result.snippet)}</div>
            `;

            item.addEventListener('click', () => {
                this.app.openFile(result.path);
            });

            this.results.appendChild(item);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
