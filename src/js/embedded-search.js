// Oxidian — Embedded Search Queries
// Detects ```search or ```query code blocks in reading view and renders results inline.

import { invoke } from './tauri-bridge.js';

export class EmbeddedSearch {
    constructor(app) {
        this.app = app;
    }

    /**
     * Process rendered HTML to replace search/query code blocks with live results.
     * Call this as a post-processor after markdown rendering.
     * @param {HTMLElement} container - The rendered content container
     */
    async processContainer(container) {
        const codeBlocks = container.querySelectorAll('pre > code.language-search, pre > code.language-query');
        
        for (const codeEl of codeBlocks) {
            const pre = codeEl.parentElement;
            const query = codeEl.textContent.trim();
            if (!query) continue;

            const resultDiv = document.createElement('div');
            resultDiv.className = 'embedded-search-results';
            resultDiv.dataset.query = query;
            resultDiv.innerHTML = `
                <div class="embedded-search-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span class="embedded-search-query">${this.escapeHtml(query)}</span>
                    <span class="embedded-search-loading">searching…</span>
                </div>
                <div class="embedded-search-body"></div>
            `;

            pre.replaceWith(resultDiv);

            // Execute search
            try {
                const results = await this.executeSearch(query);
                this.renderResults(resultDiv, results, query);
            } catch (err) {
                const body = resultDiv.querySelector('.embedded-search-body');
                body.innerHTML = `<div class="embedded-search-error">Search failed: ${this.escapeHtml(err.message || String(err))}</div>`;
                resultDiv.querySelector('.embedded-search-loading').remove();
            }
        }
    }

    /**
     * Execute a search query, supporting Obsidian-style operators.
     */
    async executeSearch(query) {
        // Parse operators: tag:#foo, path:folder, file:name, plain text
        // For now, pass directly to search_vault which handles basic text search.
        // We transform tag: queries into text searches for the tag.
        let searchQuery = query;

        // Handle tag: operator — search for the literal tag text
        searchQuery = searchQuery.replace(/tag:([#\w\/-]+)/g, (_, tag) => {
            return tag.startsWith('#') ? tag : `#${tag}`;
        });

        // Handle file: operator — search by filename
        searchQuery = searchQuery.replace(/file:(\S+)/g, (_, name) => name);

        // Handle path: operator — search by path
        searchQuery = searchQuery.replace(/path:(\S+)/g, (_, p) => p);

        const results = await invoke('search_vault', { query: searchQuery, limit: 20 });
        return results || [];
    }

    renderResults(container, results, query) {
        const body = container.querySelector('.embedded-search-body');
        const loading = container.querySelector('.embedded-search-loading');
        if (loading) loading.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;

        if (results.length === 0) {
            body.innerHTML = '<div class="embedded-search-empty">No results found</div>';
            return;
        }

        const html = results.map(r => `
            <div class="embedded-search-item" data-path="${this.escapeHtml(r.path)}">
                <div class="embedded-search-item-title" onclick="window.navigateToNote('${this.escapeHtml(r.path)}')">
                    ${this.escapeHtml(r.title || r.path)}
                </div>
                ${r.snippet ? `<div class="embedded-search-item-snippet">${this.escapeHtml(r.snippet)}</div>` : ''}
            </div>
        `).join('');

        body.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const EMBEDDED_SEARCH_CSS = `
.embedded-search-results {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin: 16px 0;
    background: var(--bg-secondary);
    overflow: hidden;
}
.embedded-search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    font-size: 12px;
    color: var(--text-muted);
}
.embedded-search-query {
    font-family: var(--font-mono);
    color: var(--text-accent);
}
.embedded-search-loading {
    margin-left: auto;
    font-style: italic;
}
.embedded-search-body {
    padding: 8px 12px;
    max-height: 400px;
    overflow-y: auto;
}
.embedded-search-item {
    padding: 6px 0;
    border-bottom: 1px solid var(--border-color);
}
.embedded-search-item:last-child { border-bottom: none; }
.embedded-search-item-title {
    color: var(--text-accent);
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
}
.embedded-search-item-title:hover { text-decoration: underline; }
.embedded-search-item-snippet {
    color: var(--text-muted);
    font-size: 12px;
    margin-top: 2px;
    line-height: 1.4;
}
.embedded-search-empty, .embedded-search-error {
    color: var(--text-muted);
    font-style: italic;
    font-size: 13px;
    padding: 8px 0;
}
.embedded-search-error { color: var(--text-red); }
`;
