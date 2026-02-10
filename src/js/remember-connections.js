// Oxidian — Smart Connections Module (Remember System)
// All computation (keyword extraction, similarity, cross-source) done in Rust.
// JS only renders UI.

const { invoke } = window.__TAURI__.core;

export class SmartConnections {
    constructor(app) {
        this.app = app;
    }

    // ─── Data API (via Rust) ─────────────────────────────────────────

    async findRelated(cardPath, limit = 10) {
        try {
            return await invoke('remember_find_related', { cardPath, limit });
        } catch (err) {
            console.error('[SmartConnections] findRelated failed:', err);
            return [];
        }
    }

    async findAutoLinkSuggestions(cardPath) {
        try {
            return await invoke('remember_find_auto_links', { cardPath });
        } catch (err) {
            console.error('[SmartConnections] findAutoLinks failed:', err);
            return [];
        }
    }

    async insertLink(cardPath, linkTitle, position, matchLength) {
        try {
            await invoke('remember_insert_link', { cardPath, linkTitle, position, matchLength });
        } catch (err) {
            console.error('[SmartConnections] insertLink failed:', err);
        }
    }

    async discoverCrossSourceConnections() {
        try {
            return await invoke('remember_cross_source');
        } catch (err) {
            console.error('[SmartConnections] crossSource failed:', err);
            return [];
        }
    }

    async getConnectionStats() {
        try {
            return await invoke('remember_connection_stats');
        } catch (err) {
            console.error('[SmartConnections] connectionStats failed:', err);
            return { most_connected: [], orphans: [], total_cards: 0, total_connections: 0 };
        }
    }

    // ─── UI Rendering ────────────────────────────────────────────────

    async renderRelatedPanel(cardPath) {
        const container = document.createElement('div');
        container.className = 'smart-connections-panel';

        const header = document.createElement('div');
        header.className = 'smart-connections-header';
        header.innerHTML = '<span class="smart-connections-icon">🔗</span> Verwandte Karten';
        container.appendChild(header);

        const content = document.createElement('div');
        content.className = 'smart-connections-content';
        content.innerHTML = '<div class="smart-connections-loading">Suche Verbindungen...</div>';
        container.appendChild(content);

        this._loadRelatedContent(cardPath, content);

        return container;
    }

    async _loadRelatedContent(cardPath, container) {
        try {
            const [related, suggestions, crossSource] = await Promise.all([
                this.findRelated(cardPath, 8),
                this.findAutoLinkSuggestions(cardPath),
                this._getCrossSourceForCard(cardPath),
            ]);

            container.innerHTML = '';

            if (related.length > 0) {
                const section = this._createSection('Verwandte Karten', 'related');
                for (const item of related) {
                    const el = document.createElement('div');
                    el.className = 'smart-connection-item';
                    el.innerHTML = `
                        <span class="smart-connection-title" data-path="${this._esc(item.path)}">${this._esc(item.title)}</span>
                        <span class="smart-connection-reasons">${this._esc(item.reason || '')}</span>
                        <span class="smart-connection-score">${item.score}</span>
                    `;
                    el.querySelector('.smart-connection-title').addEventListener('click', () => {
                        this.app.openFile(item.path);
                    });
                    section.appendChild(el);
                }
                container.appendChild(section);
            }

            if (suggestions.length > 0) {
                const section = this._createSection('Link-Vorschläge', 'suggestions');
                for (const sug of suggestions) {
                    const el = document.createElement('div');
                    el.className = 'smart-connection-suggestion';
                    el.innerHTML = `
                        <span>Meinst du <strong>[[${this._esc(sug.card_title)}]]</strong>?</span>
                        <button class="smart-connection-link-btn" title="Link einfügen">+</button>
                    `;
                    el.querySelector('button').addEventListener('click', async (e) => {
                        await this.insertLink(cardPath, sug.card_title, sug.position, sug.match_length);
                        e.target.closest('.smart-connection-suggestion').remove();
                        if (this.app.refreshEditor) this.app.refreshEditor();
                    });
                    section.appendChild(el);
                }
                container.appendChild(section);
            }

            if (crossSource.length > 0) {
                const section = this._createSection('Quellen-Verbindungen', 'cross-source');
                for (const conn of crossSource) {
                    const other = conn.card_a.path === cardPath ? conn.card_b : conn.card_a;
                    const el = document.createElement('div');
                    el.className = 'smart-connection-cross';
                    el.innerHTML = `
                        <span class="smart-connection-title" data-path="${this._esc(other.path)}">${this._esc(other.title)}</span>
                        <span class="smart-connection-source">aus ${this._esc(other.source)}</span>
                        <span class="smart-connection-reasons">Tags: ${this._esc(conn.shared_tags?.join(', ') || '')}</span>
                    `;
                    el.querySelector('.smart-connection-title').addEventListener('click', () => {
                        this.app.openFile(other.path);
                    });
                    section.appendChild(el);
                }
                container.appendChild(section);
            }

            if (related.length === 0 && suggestions.length === 0 && crossSource.length === 0) {
                container.innerHTML = '<div class="smart-connections-empty">Keine Verbindungen gefunden.</div>';
            }

        } catch (err) {
            console.error('[SmartConnections] Render error:', err);
            container.innerHTML = '<div class="smart-connections-error">Fehler beim Laden.</div>';
        }
    }

    async renderStatsWidget() {
        const container = document.createElement('div');
        container.className = 'smart-connections-stats';

        try {
            const stats = await this.getConnectionStats();

            let html = `
                <div class="stats-summary">
                    <div class="stat-box"><span class="stat-num">${stats.total_cards}</span><span class="stat-label">Karten</span></div>
                    <div class="stat-box"><span class="stat-num">${stats.total_connections}</span><span class="stat-label">Verbindungen</span></div>
                    <div class="stat-box"><span class="stat-num">${stats.orphans?.length || 0}</span><span class="stat-label">Waisen</span></div>
                </div>
            `;

            if (stats.most_connected?.length > 0) {
                html += '<div class="stats-top-list"><h4>Top vernetzte Karten</h4><ul>';
                for (const entry of stats.most_connected.slice(0, 10)) {
                    html += `<li><span class="stats-card-title" data-path="${this._esc(entry.path)}">${this._esc(entry.title)}</span> <span class="stats-count">${entry.connections}</span></li>`;
                }
                html += '</ul></div>';
            }

            if (stats.orphans?.length > 0) {
                html += `<div class="stats-orphans"><h4>🏝️ Waisen (${stats.orphans.length})</h4><ul>`;
                for (const entry of stats.orphans.slice(0, 10)) {
                    html += `<li><span class="stats-card-title" data-path="${this._esc(entry.path)}">${this._esc(entry.title)}</span></li>`;
                }
                if (stats.orphans.length > 10) {
                    html += `<li class="stats-more">...und ${stats.orphans.length - 10} weitere</li>`;
                }
                html += '</ul></div>';
            }

            container.innerHTML = html;

            container.querySelectorAll('.stats-card-title').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => this.app.openFile(el.dataset.path));
            });

        } catch (err) {
            console.error('[SmartConnections] Stats error:', err);
            container.innerHTML = '<div class="smart-connections-error">Stats konnten nicht geladen werden.</div>';
        }

        return container;
    }

    // ─── Private Helpers ─────────────────────────────────────────────

    async _getCrossSourceForCard(cardPath) {
        const all = await this.discoverCrossSourceConnections();
        return all.filter(c => c.card_a?.path === cardPath || c.card_b?.path === cardPath).slice(0, 5);
    }

    _createSection(title, className) {
        const section = document.createElement('div');
        section.className = `smart-connections-section smart-connections-${className}`;
        const h = document.createElement('h4');
        h.textContent = title;
        section.appendChild(h);
        return section;
    }

    _esc(str) {
        const div = document.createElement('span');
        div.textContent = str;
        return div.innerHTML;
    }
}
