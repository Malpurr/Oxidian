// Oxidian — Knowledge Retention System ("Remember")
// Main module: Sidebar tab, dashboard, card loading & YAML parsing
const { invoke } = window.__TAURI__.core;

export class Remember {
    constructor(app) {
        this.app = app;
        this.cards = [];
        this.sources = [];
        this.loaded = false;

        this.init();
    }

    async init() {
        await this.ensureFolders();
        await this.loadAll();
    }

    /** Called from app.openRememberDashboard() */
    openDashboard() {
        this.app.switchSidebarPanel('remember');
        if (this.app.rememberDashboard) {
            this.app.rememberDashboard.show();
        } else {
            this.refreshDashboard();
        }
    }

    // ===== Folder Setup =====

    async ensureFolders() {
        for (const folder of ['Cards', 'Sources']) {
            try {
                await invoke('create_folder', { path: folder });
            } catch (e) {
                // Folder likely already exists
            }
        }
    }

    // ===== Data Loading =====

    async loadAll() {
        try {
            const [cards, sources] = await Promise.all([
                this._loadFolder('Cards'),
                this._loadFolder('Sources'),
            ]);
            this.cards = cards;
            this.sources = sources;
            this.loaded = true;
        } catch (err) {
            console.error('[Remember] Failed to load data:', err);
            this.cards = [];
            this.sources = [];
            this.loaded = true;
        }
    }

    async _loadFolder(folder) {
        const items = [];
        try {
            const tree = await invoke('list_files');
            const dir = this._findDir(tree, folder);
            if (!dir || !dir.children) return items;

            for (const child of dir.children) {
                if (child.is_dir || !child.name.endsWith('.md')) continue;
                try {
                    const content = await invoke('read_note', { path: child.path });
                    const meta = this.parseFrontmatter(content);
                    items.push({
                        path: child.path,
                        name: child.name.replace('.md', ''),
                        content,
                        meta,
                    });
                } catch (e) {
                    console.warn(`[Remember] Could not read ${child.path}:`, e);
                }
            }
        } catch (e) {
            console.warn(`[Remember] Could not list ${folder}:`, e);
        }
        return items;
    }

    _findDir(nodes, name) {
        if (!Array.isArray(nodes)) return null;
        for (const n of nodes) {
            if (n.is_dir && n.name === name) return n;
            if (n.is_dir && n.children) {
                const found = this._findDir(n.children, name);
                if (found) return found;
            }
        }
        return null;
    }

    // ===== YAML Frontmatter Parser =====

    parseFrontmatter(content) {
        if (!content || !content.startsWith('---')) return {};
        const end = content.indexOf('\n---', 3);
        if (end === -1) return {};
        const yaml = content.substring(4, end);
        const meta = {};
        for (const line of yaml.split('\n')) {
            const colon = line.indexOf(':');
            if (colon === -1) continue;
            const key = line.substring(0, colon).trim();
            let val = line.substring(colon + 1).trim();
            // Strip quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            // Parse arrays like [tag1, tag2]
            if (val.startsWith('[') && val.endsWith(']')) {
                val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            }
            meta[key] = val;
        }
        return meta;
    }

    // ===== Public API (used by other modules) =====

    getCards() {
        return this.cards;
    }

    getSources() {
        return this.sources;
    }

    getDueCards() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return this.cards.filter(c => {
            const nr = c.meta?.next_review;
            if (!nr) return true; // No review date = due
            return nr <= today;
        });
    }

    // ===== Dashboard Rendering =====

    // PERF FIX: Force reload for explicit user action
    async forceReload() {
        this.loaded = false;
        this._lastLoadTime = 0;
        await this.loadAll();
    }

    async refreshDashboard() {
        // PERF FIX: Use cached data if loaded within last 30s, not always-reload
        const now = Date.now();
        if (!this.loaded || (now - (this._lastLoadTime || 0)) > 30000) {
            await this.loadAll();
            this._lastLoadTime = now;
        }

        const container = document.getElementById('remember-dashboard');
        if (!container) return;

        const due = this.getDueCards();
        const randomCard = this.cards.length > 0
            ? this.cards[Math.floor(Math.random() * this.cards.length)]
            : null;

        // Recent: merge cards + sources, sort by created date descending, take 5
        const all = [...this.cards, ...this.sources].sort((a, b) => {
            const da = a.meta?.created || '';
            const db = b.meta?.created || '';
            return db.localeCompare(da);
        });
        const recent = all.slice(0, 5);

        container.innerHTML = '';

        // === Due Section ===
        const dueSection = document.createElement('div');
        dueSection.className = 'remember-section remember-due';
        dueSection.innerHTML = `
            <div class="remember-due-count">Heute fällig: <strong>${due.length}</strong> Karten</div>
            <button class="remember-btn remember-btn-primary" id="remember-start-review" ${due.length === 0 ? 'disabled' : ''}>
                ▶ Start Review
            </button>
        `;
        container.appendChild(dueSection);

        dueSection.querySelector('#remember-start-review')?.addEventListener('click', () => {
            // Will be handled by remember-review.js
            if (this.app.rememberReview?.startReview) {
                this.app.rememberReview.startReview(due);
            } else {
                this.app.showErrorToast?.('Review module not loaded yet');
            }
        });

        // === Highlight Section ===
        if (randomCard) {
            const highlightSection = document.createElement('div');
            highlightSection.className = 'remember-section remember-highlight';

            // Extract body (after frontmatter)
            let body = randomCard.content;
            if (body.startsWith('---')) {
                const endIdx = body.indexOf('\n---', 3);
                if (endIdx !== -1) body = body.substring(endIdx + 4).trim();
            }
            // Take first 200 chars
            const preview = body.length > 200 ? body.substring(0, 200) + '…' : body;

            highlightSection.innerHTML = `
                <div class="remember-section-title">💡 Zufälliges Highlight</div>
                <div class="remember-highlight-card" data-path="${this.escapeAttr(randomCard.path)}">
                    <div class="remember-highlight-name">${this.escapeHtml(randomCard.name)}</div>
                    <div class="remember-highlight-preview">${this.escapeHtml(preview)}</div>
                    ${randomCard.meta?.source ? `<div class="remember-highlight-source">📖 ${this.escapeHtml(String(randomCard.meta.source))}</div>` : ''}
                </div>
            `;
            container.appendChild(highlightSection);

            highlightSection.querySelector('.remember-highlight-card')?.addEventListener('click', () => {
                this.app.openFile(randomCard.path);
            });
        }

        // === Recent Section ===
        if (recent.length > 0) {
            const recentSection = document.createElement('div');
            recentSection.className = 'remember-section remember-recent';

            let recentHtml = '<div class="remember-section-title">🕐 Kürzlich hinzugefügt</div><div class="remember-recent-list">';
            for (const item of recent) {
                const isCard = item.path.startsWith('Cards/');
                const icon = isCard ? '🃏' : '📖';
                recentHtml += `<div class="remember-recent-item" data-path="${this.escapeAttr(item.path)}">
                    <span class="remember-recent-icon">${icon}</span>
                    <span class="remember-recent-name">${this.escapeHtml(item.name)}</span>
                </div>`;
            }
            recentHtml += '</div>';
            recentSection.innerHTML = recentHtml;
            container.appendChild(recentSection);

            recentSection.querySelectorAll('.remember-recent-item').forEach(el => {
                el.addEventListener('click', () => {
                    this.app.openFile(el.dataset.path);
                });
            });
        }

        // === Empty State ===
        if (this.cards.length === 0 && this.sources.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'remember-empty';
            empty.innerHTML = `
                <div style="font-size: 2em; margin-bottom: 8px;">🧠</div>
                <div>Noch keine Karten oder Quellen.</div>
                <div style="margin-top: 4px; opacity: 0.7; font-size: 0.9em;">Erstelle Dateien in <code>Cards/</code> oder <code>Sources/</code> um zu starten.</div>
            `;
            container.appendChild(empty);
        }
    }

    // ===== Utilities =====

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}
