// Oxidian — Smart Connections Module (Remember System)
// Finds related cards, suggests auto-links, discovers cross-source connections,
// and provides connection statistics for the dashboard.

const { invoke } = window.__TAURI__.core;

/**
 * @typedef {Object} CardMeta
 * @property {string} path - File path
 * @property {string} title - Card title (filename without .md)
 * @property {string} content - Raw markdown content
 * @property {string[]} tags - Frontmatter tags
 * @property {string} source - Source reference (e.g. "[[Book Title]]")
 * @property {string[]} keywords - Extracted keywords from title + content
 * @property {Set<string>} outLinks - Outgoing [[wiki-links]]
 */

export class SmartConnections {
    constructor(app) {
        this.app = app;
        /** @type {Map<string, CardMeta>} */
        this.cardIndex = new Map();
        /** @type {Map<string, CardMeta>} */
        this.sourceIndex = new Map();
        this._indexBuilt = false;

        // Stop-words to exclude from keyword matching
        this._stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'it', 'as', 'be', 'was', 'are', 'been',
            'this', 'that', 'from', 'not', 'has', 'have', 'had', 'will', 'would',
            'can', 'could', 'should', 'may', 'might', 'do', 'does', 'did',
            'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'in',
            'auf', 'an', 'zu', 'für', 'von', 'mit', 'ist', 'es', 'als', 'aus',
            'nicht', 'hat', 'haben', 'wird', 'kann', 'wenn', 'man', 'nach',
            'sich', 'auch', 'nur', 'noch', 'wie', 'was', 'den', 'dem', 'des',
            'ich', 'du', 'er', 'sie', 'wir', 'ihr', 'so', 'über', 'sehr',
        ]);
    }

    // ─── Index Building ──────────────────────────────────────────────

    /**
     * Build the full card + source index by scanning the vault.
     */
    async buildIndex() {
        this.cardIndex.clear();
        this.sourceIndex.clear();

        try {
            const files = await invoke('list_files');
            const mdFiles = this._collectMdFiles(files);

            for (const filePath of mdFiles) {
                try {
                    const content = await invoke('read_note', { path: filePath });
                    const meta = this._parseFile(filePath, content);
                    if (!meta) continue;

                    if (filePath.startsWith('Cards/') || meta.type === 'card') {
                        this.cardIndex.set(filePath, meta);
                    } else if (filePath.startsWith('Sources/') || meta.type === 'source') {
                        this.sourceIndex.set(filePath, meta);
                    } else {
                        // Index everything — connections can span the vault
                        this.cardIndex.set(filePath, meta);
                    }
                } catch { /* skip unreadable */ }
            }

            this._indexBuilt = true;
        } catch (err) {
            console.error('[SmartConnections] Failed to build index:', err);
        }
    }

    /**
     * Ensure the index is built; rebuild if not.
     */
    async ensureIndex() {
        if (!this._indexBuilt) await this.buildIndex();
    }

    /** Invalidate the index so it rebuilds on next query. */
    invalidate() {
        this._indexBuilt = false;
    }

    // ─── Related Cards Finder ────────────────────────────────────────

    /**
     * Find cards related to the given card path.
     * Returns sorted by relevance score (descending).
     * @param {string} cardPath
     * @param {number} [limit=10]
     * @returns {Promise<Array<{path: string, title: string, score: number, reasons: string[]}>>}
     */
    async findRelated(cardPath, limit = 10) {
        await this.ensureIndex();

        const card = this.cardIndex.get(cardPath);
        if (!card) return [];

        const results = [];

        for (const [otherPath, other] of this.cardIndex) {
            if (otherPath === cardPath) continue;

            let score = 0;
            const reasons = [];

            // 1) Shared tags (strongest signal)
            const sharedTags = card.tags.filter(t => other.tags.includes(t));
            if (sharedTags.length > 0) {
                score += sharedTags.length * 3;
                reasons.push(`Tags: ${sharedTags.join(', ')}`);
            }

            // 2) Keyword overlap in title/content
            const sharedKeywords = this._intersect(card.keywords, other.keywords);
            if (sharedKeywords.length > 0) {
                score += Math.min(sharedKeywords.length, 5); // cap at 5
                reasons.push(`Keywords: ${sharedKeywords.slice(0, 5).join(', ')}`);
            }

            // 3) Direct link between cards
            if (card.outLinks.has(other.title) || other.outLinks.has(card.title)) {
                score += 2;
                reasons.push('Direkt verlinkt');
            }

            // 4) Same source
            if (card.source && other.source && card.source === other.source) {
                score += 2;
                reasons.push(`Gleiche Quelle: ${card.source}`);
            }

            if (score > 0) {
                results.push({ path: otherPath, title: other.title, score, reasons });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    // ─── Auto-Link Suggestions ───────────────────────────────────────

    /**
     * Scan a card's content for words matching other card titles.
     * Returns suggestions for unlinked mentions.
     * @param {string} cardPath
     * @returns {Promise<Array<{cardTitle: string, cardPath: string, matchedText: string, position: number}>>}
     */
    async findAutoLinkSuggestions(cardPath) {
        await this.ensureIndex();

        const card = this.cardIndex.get(cardPath);
        if (!card) return [];

        const suggestions = [];
        const contentLower = card.content.toLowerCase();

        for (const [otherPath, other] of this.cardIndex) {
            if (otherPath === cardPath) continue;
            if (other.title.length < 3) continue; // skip very short titles

            const titleLower = other.title.toLowerCase();

            // Skip if already linked
            if (card.outLinks.has(other.title)) continue;

            // Search for title as whole word in content
            const regex = new RegExp(`\\b${this._escapeRegex(titleLower)}\\b`, 'gi');
            let match;
            while ((match = regex.exec(contentLower)) !== null) {
                // Make sure it's not inside an existing [[link]]
                const before = card.content.substring(Math.max(0, match.index - 2), match.index);
                if (before.endsWith('[[')) continue;

                suggestions.push({
                    cardTitle: other.title,
                    cardPath: otherPath,
                    matchedText: card.content.substring(match.index, match.index + match[0].length),
                    position: match.index,
                });
                break; // one suggestion per card
            }
        }

        return suggestions;
    }

    /**
     * Insert a [[wiki-link]] at the given position in the card's content.
     * @param {string} cardPath
     * @param {string} linkTitle - Title to link to
     * @param {number} position - Character offset
     * @param {number} matchLength - Length of matched text to replace
     */
    async insertLink(cardPath, linkTitle, position, matchLength) {
        try {
            const content = await invoke('read_note', { path: cardPath });
            const before = content.substring(0, position);
            const after = content.substring(position + matchLength);
            const newContent = `${before}[[${linkTitle}]]${after}`;
            await invoke('save_note', { path: cardPath, content: newContent });

            // Update the index entry
            const meta = this.cardIndex.get(cardPath);
            if (meta) {
                meta.content = newContent;
                meta.outLinks.add(linkTitle);
            }
        } catch (err) {
            console.error('[SmartConnections] Failed to insert link:', err);
        }
    }

    // ─── Cross-Source Discovery ──────────────────────────────────────

    /**
     * Find connections between cards from different sources that share tags.
     * Returns pairs of cards with their shared tags.
     * @returns {Promise<Array<{cardA: {path,title,source}, cardB: {path,title,source}, sharedTags: string[]}>>}
     */
    async discoverCrossSourceConnections() {
        await this.ensureIndex();

        const cardsBySource = new Map();

        // Group cards by source
        for (const [path, meta] of this.cardIndex) {
            if (!meta.source) continue;
            if (!cardsBySource.has(meta.source)) {
                cardsBySource.set(meta.source, []);
            }
            cardsBySource.get(meta.source).push({ path, ...meta });
        }

        const sources = [...cardsBySource.keys()];
        const connections = [];

        // Compare cards across different sources
        for (let i = 0; i < sources.length; i++) {
            for (let j = i + 1; j < sources.length; j++) {
                const cardsA = cardsBySource.get(sources[i]);
                const cardsB = cardsBySource.get(sources[j]);

                for (const a of cardsA) {
                    for (const b of cardsB) {
                        const shared = a.tags.filter(t => b.tags.includes(t));
                        if (shared.length > 0) {
                            connections.push({
                                cardA: { path: a.path, title: a.title, source: a.source },
                                cardB: { path: b.path, title: b.title, source: b.source },
                                sharedTags: shared,
                            });
                        }
                    }
                }
            }
        }

        // Sort by number of shared tags
        connections.sort((a, b) => b.sharedTags.length - a.sharedTags.length);
        return connections;
    }

    // ─── Connection Stats ────────────────────────────────────────────

    /**
     * Compute connectivity statistics for all cards.
     * @returns {Promise<{mostConnected: Array, orphans: Array, totalCards: number, totalConnections: number}>}
     */
    async getConnectionStats() {
        await this.ensureIndex();

        /** @type {Map<string, number>} path → connection count */
        const connectionCount = new Map();

        // Initialize
        for (const path of this.cardIndex.keys()) {
            connectionCount.set(path, 0);
        }

        // Count outgoing links that resolve to indexed cards
        for (const [path, meta] of this.cardIndex) {
            for (const linkTarget of meta.outLinks) {
                // Find target card
                const targetPath = this._resolveLink(linkTarget);
                if (targetPath && targetPath !== path) {
                    connectionCount.set(path, (connectionCount.get(path) || 0) + 1);
                    connectionCount.set(targetPath, (connectionCount.get(targetPath) || 0) + 1);
                }
            }

            // Count shared-tag connections (lighter weight)
            for (const [otherPath, other] of this.cardIndex) {
                if (otherPath <= path) continue; // avoid double-counting
                const shared = meta.tags.filter(t => other.tags.includes(t));
                if (shared.length > 0) {
                    connectionCount.set(path, (connectionCount.get(path) || 0) + 1);
                    connectionCount.set(otherPath, (connectionCount.get(otherPath) || 0) + 1);
                }
            }
        }

        // Build results
        const entries = [...connectionCount.entries()].map(([path, count]) => ({
            path,
            title: this.cardIndex.get(path)?.title || path,
            connections: count,
        }));

        entries.sort((a, b) => b.connections - a.connections);

        const orphans = entries.filter(e => e.connections === 0);
        const totalConnections = entries.reduce((sum, e) => sum + e.connections, 0) / 2; // each counted twice

        return {
            mostConnected: entries.slice(0, 20),
            orphans,
            totalCards: this.cardIndex.size,
            totalConnections: Math.round(totalConnections),
        };
    }

    /**
     * Export stats as a markdown list for the dashboard.
     * @returns {Promise<string>}
     */
    async exportStatsMarkdown() {
        const stats = await this.getConnectionStats();
        const lines = [
            `# Connection Stats`,
            ``,
            `**Karten gesamt:** ${stats.totalCards}`,
            `**Verbindungen gesamt:** ${stats.totalConnections}`,
            ``,
            `## 🔗 Meistvernetzte Karten`,
            ``,
        ];

        for (const entry of stats.mostConnected) {
            lines.push(`- **[[${entry.title}]]** — ${entry.connections} Verbindungen`);
        }

        if (stats.orphans.length > 0) {
            lines.push(``, `## 🏝️ Waisen (keine Verbindungen)`, ``);
            for (const entry of stats.orphans) {
                lines.push(`- [[${entry.title}]]`);
            }
        }

        return lines.join('\n');
    }

    // ─── UI Rendering ────────────────────────────────────────────────

    /**
     * Render the "Related Cards" panel for the currently open card.
     * Meant to be inserted into a sidebar or below the editor.
     * @param {string} cardPath
     * @returns {Promise<HTMLElement>}
     */
    async renderRelatedPanel(cardPath) {
        const container = document.createElement('div');
        container.className = 'smart-connections-panel';

        // Header
        const header = document.createElement('div');
        header.className = 'smart-connections-header';
        header.innerHTML = '<span class="smart-connections-icon">🔗</span> Verwandte Karten';
        container.appendChild(header);

        const content = document.createElement('div');
        content.className = 'smart-connections-content';
        content.innerHTML = '<div class="smart-connections-loading">Suche Verbindungen...</div>';
        container.appendChild(content);

        // Load async
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

            // Related cards
            if (related.length > 0) {
                const section = this._createSection('Verwandte Karten', 'related');
                for (const item of related) {
                    const el = document.createElement('div');
                    el.className = 'smart-connection-item';
                    el.innerHTML = `
                        <span class="smart-connection-title" data-path="${this._esc(item.path)}">${this._esc(item.title)}</span>
                        <span class="smart-connection-reasons">${this._esc(item.reasons.join(' · '))}</span>
                        <span class="smart-connection-score">${item.score}</span>
                    `;
                    el.querySelector('.smart-connection-title').addEventListener('click', () => {
                        this.app.openFile(item.path);
                    });
                    section.appendChild(el);
                }
                container.appendChild(section);
            }

            // Auto-link suggestions
            if (suggestions.length > 0) {
                const section = this._createSection('Link-Vorschläge', 'suggestions');
                for (const sug of suggestions) {
                    const el = document.createElement('div');
                    el.className = 'smart-connection-suggestion';
                    el.innerHTML = `
                        <span>Meinst du <strong>[[${this._esc(sug.cardTitle)}]]</strong>?</span>
                        <button class="smart-connection-link-btn" title="Link einfügen">+</button>
                    `;
                    el.querySelector('button').addEventListener('click', async (e) => {
                        await this.insertLink(cardPath, sug.cardTitle, sug.position, sug.matchedText.length);
                        e.target.closest('.smart-connection-suggestion').remove();
                        if (this.app.refreshEditor) this.app.refreshEditor();
                    });
                    section.appendChild(el);
                }
                container.appendChild(section);
            }

            // Cross-source discoveries
            if (crossSource.length > 0) {
                const section = this._createSection('Quellen-Verbindungen', 'cross-source');
                for (const conn of crossSource) {
                    const other = conn.cardA.path === cardPath ? conn.cardB : conn.cardA;
                    const el = document.createElement('div');
                    el.className = 'smart-connection-cross';
                    el.innerHTML = `
                        <span class="smart-connection-title" data-path="${this._esc(other.path)}">${this._esc(other.title)}</span>
                        <span class="smart-connection-source">aus ${this._esc(other.source)}</span>
                        <span class="smart-connection-reasons">Tags: ${this._esc(conn.sharedTags.join(', '))}</span>
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

    /**
     * Render connection stats as an HTML element for the dashboard.
     * @returns {Promise<HTMLElement>}
     */
    async renderStatsWidget() {
        const container = document.createElement('div');
        container.className = 'smart-connections-stats';

        try {
            const stats = await this.getConnectionStats();

            let html = `
                <div class="stats-summary">
                    <div class="stat-box"><span class="stat-num">${stats.totalCards}</span><span class="stat-label">Karten</span></div>
                    <div class="stat-box"><span class="stat-num">${stats.totalConnections}</span><span class="stat-label">Verbindungen</span></div>
                    <div class="stat-box"><span class="stat-num">${stats.orphans.length}</span><span class="stat-label">Waisen</span></div>
                </div>
            `;

            if (stats.mostConnected.length > 0) {
                html += '<div class="stats-top-list"><h4>Top vernetzte Karten</h4><ul>';
                for (const entry of stats.mostConnected.slice(0, 10)) {
                    html += `<li><span class="stats-card-title" data-path="${this._esc(entry.path)}">${this._esc(entry.title)}</span> <span class="stats-count">${entry.connections}</span></li>`;
                }
                html += '</ul></div>';
            }

            if (stats.orphans.length > 0) {
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

            // Attach click handlers
            container.querySelectorAll('.stats-card-title').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => {
                    this.app.openFile(el.dataset.path);
                });
            });

        } catch (err) {
            console.error('[SmartConnections] Stats error:', err);
            container.innerHTML = '<div class="smart-connections-error">Stats konnten nicht geladen werden.</div>';
        }

        return container;
    }

    // ─── Private Helpers ─────────────────────────────────────────────

    _collectMdFiles(tree, prefix = '') {
        const results = [];
        if (!tree) return results;
        const items = Array.isArray(tree) ? tree : (tree.children || []);
        for (const item of items) {
            const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.children) {
                results.push(...this._collectMdFiles(item, fullPath));
            } else if (item.name.endsWith('.md')) {
                results.push(fullPath);
            }
        }
        return results;
    }

    _parseFile(filePath, content) {
        const title = filePath.replace(/\.md$/, '').split('/').pop();
        const fm = this._parseFrontmatter(content);
        const tags = Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === 'string' ? [fm.tags] : []);
        const source = fm.source || '';
        const type = fm.type || '';

        // Extract [[wiki-links]]
        const outLinks = new Set();
        const linkRe = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let m;
        while ((m = linkRe.exec(content)) !== null) {
            outLinks.add(m[1].trim());
        }

        // Extract keywords from title + content (stripped of frontmatter/links)
        const cleanContent = content
            .replace(/^---[\s\S]*?---/, '') // remove frontmatter
            .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1') // flatten links
            .replace(/[#*>`~_\-\[\](){}|]/g, ' '); // remove md syntax

        const keywords = this._extractKeywords(`${title} ${cleanContent}`);

        return { path: filePath, title, content, tags, source, type, keywords, outLinks };
    }

    _parseFrontmatter(content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return {};
        const fm = {};
        const lines = match[1].split('\n');
        for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) continue;
            const key = line.substring(0, colonIdx).trim();
            let val = line.substring(colonIdx + 1).trim();
            // Parse arrays: [a, b, c]
            if (val.startsWith('[') && val.endsWith(']')) {
                val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            }
            // Strip quotes
            if (typeof val === 'string') {
                val = val.replace(/^["']|["']$/g, '');
            }
            fm[key] = val;
        }
        return fm;
    }

    _extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^a-zäöüß0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !this._stopWords.has(w));

        // Deduplicate
        return [...new Set(words)];
    }

    _intersect(a, b) {
        const setB = new Set(b);
        return a.filter(x => setB.has(x));
    }

    _resolveLink(linkTarget) {
        // Try to find a card whose title matches the link target
        for (const [path, meta] of this.cardIndex) {
            if (meta.title === linkTarget || path === linkTarget || path === `${linkTarget}.md`) {
                return path;
            }
        }
        return null;
    }

    async _getCrossSourceForCard(cardPath) {
        const card = this.cardIndex.get(cardPath);
        if (!card || !card.source) return [];

        const all = await this.discoverCrossSourceConnections();
        return all.filter(c => c.cardA.path === cardPath || c.cardB.path === cardPath).slice(0, 5);
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

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
