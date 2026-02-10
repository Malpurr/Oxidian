// Oxidian — Search Component
// Search logic via Rust invoke(), UI/rendering stays JS.
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
        if (!this.input || !this.results) {
            console.error('Search input or results container not found');
            return;
        }

        this.input.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                const query = this.input.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query).catch(err => {
                        console.error('Search error:', err);
                    });
                } else if (query.length === 0) {
                    this.results.innerHTML = '';
                } else {
                    // 1 char: show suggestions
                    this.showSuggestions(query);
                }
            }, 200);
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

    /**
     * Full-text search via Rust backend.
     */
    async performSearch(query) {
        if (!this.results) return;

        try {
            // Detect tag search: queries starting with # use tag search
            let results;
            if (query.startsWith('#')) {
                const tag = query.slice(1);
                results = await invoke('search_by_tag', { tag });
            } else {
                results = await invoke('search_vault', { query, options: {} });
            }
            this.renderResults(results);
        } catch (err) {
            console.error('Search failed:', err);
            this.app?.showErrorToast?.(`Search failed: ${err.message || err}`);
            this.renderError(err);
        }
    }

    /**
     * Fuzzy search for quick results.
     */
    async performFuzzySearch(query) {
        if (!this.results) return;
        try {
            const results = await invoke('fuzzy_search', { query });
            this.renderResults(results);
        } catch (err) {
            console.error('Fuzzy search failed:', err);
        }
    }

    /**
     * Show search suggestions for short prefixes.
     */
    async showSuggestions(prefix) {
        if (!this.results) return;
        try {
            const suggestions = await invoke('search_suggest', { prefix });
            this.renderSuggestions(suggestions);
        } catch (err) {
            // Silently ignore suggestion errors
        }
    }

    renderResults(results) {
        if (!this.results) return;
        this.results.innerHTML = '';

        if (!Array.isArray(results)) {
            console.warn('Invalid search results data');
            results = [];
        }

        if (results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'search-result-item';
            empty.style.color = 'var(--text-muted)';
            empty.textContent = 'No results found';
            this.results.appendChild(empty);
            return;
        }

        for (const result of results) {
            if (!result || !result.path) continue;

            try {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="search-result-title">${this.escapeHtml(result.title || result.path)}</div>
                    <div class="search-result-path">${this.escapeHtml(result.path)}</div>
                    <div class="search-result-snippet">${this.escapeHtml(result.snippet || '')}</div>
                `;
                item.addEventListener('click', () => {
                    if (this.app?.openFile) {
                        this.app.openFile(result.path);
                    }
                });
                this.results.appendChild(item);
            } catch (err) {
                console.error('Failed to render search result:', err, result);
            }
        }
    }

    renderSuggestions(suggestions) {
        if (!this.results) return;
        this.results.innerHTML = '';

        if (!Array.isArray(suggestions) || suggestions.length === 0) return;

        for (const suggestion of suggestions) {
            const item = document.createElement('div');
            item.className = 'search-result-item search-suggestion';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                this.input.value = suggestion;
                this.performSearch(suggestion);
            });
            this.results.appendChild(item);
        }
    }

    renderError(err) {
        if (!this.results) return;
        const errDiv = document.createElement('div');
        errDiv.className = 'search-result-item';
        errDiv.style.color = 'var(--text-error, #dc2626)';
        errDiv.style.padding = '8px 12px';
        errDiv.innerHTML = `
            <div style="font-weight: 500;">Search Error</div>
            <div style="font-size: 0.9em; opacity: 0.8;">${this.escapeHtml(err.message || err.toString())}</div>
        `;
        this.results.innerHTML = '';
        this.results.appendChild(errDiv);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
