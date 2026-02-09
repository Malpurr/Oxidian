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
        // *** FIX: Null safety checks ***
        if (!this.input || !this.results) {
            console.error('Search input or results container not found');
            return;
        }

        this.input.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            // *** FIX: Improved debouncing - shorter delay for better UX ***
            this.searchTimeout = setTimeout(() => {
                const query = this.input.value.trim();
                if (query.length >= 2) {
                    this.performSearch(query).catch(err => {
                        console.error('Search error:', err);
                    });
                } else {
                    this.results.innerHTML = '';
                }
            }, 200); // Reduced from 250ms to 200ms
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
        // *** FIX: Null safety check ***
        if (!this.results) return;
        
        try {
            const results = await invoke('search_notes', { query });
            this.renderResults(results);
        } catch (err) {
            console.error('Search failed:', err);
            
            // *** FIX: Better error handling and user feedback ***
            this.app?.showErrorToast?.(`Search failed: ${err.message || err}`);
            
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
    }

    renderResults(results) {
        // *** FIX: Null safety check ***
        if (!this.results) return;
        
        this.results.innerHTML = '';

        // *** FIX: Ensure results is an array ***
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
            // *** FIX: Skip invalid results ***
            if (!result || !result.path) {
                console.warn('Invalid search result:', result);
                continue;
            }
            
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
                // Continue with other results
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
