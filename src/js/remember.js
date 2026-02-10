// Oxidian — Knowledge Retention System ("Remember")
// Main module: Sidebar tab, dashboard, card loading via Rust backend
const { invoke } = window.__TAURI__.core;

export class Remember {
    constructor(app) {
        this.app = app;
        this.cards = [];
        this.sources = [];
        this.loaded = false;
        this._lastLoadTime = 0;

        this.init();
    }

    async init() {
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

    // ===== Data Loading (via Rust) =====

    async loadAll() {
        try {
            const [cards, sources] = await Promise.all([
                invoke('remember_load_cards'),
                invoke('remember_load_sources'),
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

    // ===== Public API (used by other modules) =====

    getCards() {
        return this.cards;
    }

    getSources() {
        return this.sources;
    }

    async getDueCards() {
        try {
            return await invoke('remember_get_due_cards');
        } catch (err) {
            console.error('[Remember] Failed to get due cards:', err);
            return [];
        }
    }

    async forceReload() {
        this.loaded = false;
        this._lastLoadTime = 0;
        await this.loadAll();
    }

    async refreshDashboard() {
        const now = Date.now();
        if (!this.loaded || (now - this._lastLoadTime) > 30000) {
            await this.loadAll();
            this._lastLoadTime = now;
        }

        const container = document.getElementById('remember-dashboard');
        if (!container) return;

        let due;
        try {
            due = await invoke('remember_get_due_cards');
        } catch (_) {
            due = [];
        }

        const randomCard = this.cards.length > 0
            ? this.cards[Math.floor(Math.random() * this.cards.length)]
            : null;

        // Recent: merge cards + sources, sort by created date descending, take 5
        const all = [...this.cards.map(c => ({ ...c, _isCard: true })), ...this.sources.map(s => ({ ...s, _isCard: false }))].sort((a, b) => {
            const da = a.created || '';
            const db = b.created || '';
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

            const preview = randomCard.back?.length > 200
                ? randomCard.back.substring(0, 200) + '…'
                : (randomCard.back || '');

            highlightSection.innerHTML = `
                <div class="remember-section-title">💡 Zufälliges Highlight</div>
                <div class="remember-highlight-card" data-path="${this.escapeAttr(randomCard.path)}">
                    <div class="remember-highlight-name">${this.escapeHtml(randomCard.front)}</div>
                    <div class="remember-highlight-preview">${this.escapeHtml(preview)}</div>
                    ${randomCard.source ? `<div class="remember-highlight-source">📖 ${this.escapeHtml(String(randomCard.source))}</div>` : ''}
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
                const isCard = item._isCard;
                const icon = isCard ? '🃏' : '📖';
                const name = isCard ? item.front : (item.title || item.path);
                recentHtml += `<div class="remember-recent-item" data-path="${this.escapeAttr(item.path)}">
                    <span class="remember-recent-icon">${icon}</span>
                    <span class="remember-recent-name">${this.escapeHtml(name)}</span>
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
