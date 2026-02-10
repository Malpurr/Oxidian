/**
 * Oxidian — Remember Daily Review Dashboard
 * All stats come from Rust backend. JS only renders UI.
 */

import { invoke } from './tauri-bridge.js';

const DASHBOARD_STYLES_ID = 'remember-dashboard-styles';

function _relativeTime(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return `vor ${diffMin} Minute${diffMin !== 1 ? 'n' : ''}`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Stunde${diffH !== 1 ? 'n' : ''}`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'gestern';
    if (diffD < 7) return `vor ${diffD} Tagen`;
    if (diffD < 30) return `vor ${Math.floor(diffD / 7)} Woche${Math.floor(diffD / 7) !== 1 ? 'n' : ''}`;
    return dateStr;
}

export class RememberDashboard {
    constructor(app) {
        this.app = app;
        this._injectStyles();
    }

    async show() {
        const remember = this.app.remember;
        if (!remember) return;

        // Reload data from Rust
        await remember.loadAll();

        const cards = remember.getCards?.() || [];
        const sources = remember.getSources?.() || [];

        let dueCards;
        try {
            dueCards = await invoke('remember_get_due_cards');
        } catch (_) {
            dueCards = [];
        }

        // Load stats from Rust
        let stats = null;
        try {
            stats = await invoke('remember_get_stats');
        } catch (err) {
            console.warn('[RememberDashboard] Stats unavailable:', err);
        }

        const container = this._getContentArea();
        if (!container) return;

        container.innerHTML = '';
        container.className = 'remember-main-dashboard';

        if (cards.length === 0 && sources.length === 0) {
            container.appendChild(this._renderOnboarding());
            return;
        }

        container.appendChild(this._renderHeader(stats, dueCards));

        if (cards.length > 0) {
            container.appendChild(this._renderHighlight(cards));
        }

        container.appendChild(this._renderRecentActivity(cards, sources));

        if (stats) {
            container.appendChild(this._renderStatsOverview(stats, cards, sources));
        }

        const reading = sources.filter(s => {
            const status = typeof s.status === 'object' ? Object.keys(s.status)[0] : s.status;
            return status === 'reading';
        });
        if (reading.length > 0) {
            container.appendChild(this._renderSourcesInProgress(reading, cards));
        }
    }

    _getContentArea() {
        const app = this.app;
        if (app.isDirty && app.currentFile) app.saveCurrentFile();
        app.hideWelcome();
        app.updateBreadcrumb?.('');

        const paneContainer = document.getElementById('pane-container');
        if (!paneContainer) return null;

        if (app.graphView) { app.graphView.destroy(); app.graphView = null; }

        const leftPane = document.getElementById('left-pane');
        if (leftPane) leftPane.remove();

        if (!app.tabManager?.splitActive) {
            const overlay = paneContainer.querySelector('.split-drop-overlay');
            paneContainer.innerHTML = '';
            if (overlay) paneContainer.appendChild(overlay);
        }

        const pane = document.createElement('div');
        pane.className = 'pane';
        pane.id = 'left-pane';
        pane.style.overflow = 'auto';

        const inner = document.createElement('div');
        inner.className = 'remember-main-dashboard';
        pane.appendChild(inner);
        paneContainer.insertBefore(pane, paneContainer.firstChild);

        return inner;
    }

    _renderHeader(stats, dueCards) {
        const streak = stats?.current_streak ?? 0;
        const dueCount = dueCards.length;

        const section = document.createElement('div');
        section.className = 'rd-header';

        section.innerHTML = `
            <div class="rd-header-top">
                <div class="rd-streak">
                    <span class="rd-streak-fire">🔥</span>
                    <span class="rd-streak-num">${streak}</span>
                    <span class="rd-streak-label">Tage Streak</span>
                </div>
                <div class="rd-due-badge ${dueCount > 0 ? 'rd-due-active' : ''}">
                    ${dueCount} Karte${dueCount !== 1 ? 'n' : ''} fällig heute
                </div>
            </div>
            <button class="rd-start-review ${dueCount > 0 ? 'rd-pulse' : ''}" ${dueCount === 0 ? 'disabled' : ''}>
                ▶ Start Review
            </button>
        `;

        section.querySelector('.rd-start-review')?.addEventListener('click', () => {
            if (this.app.rememberReview?.startReview) {
                this.app.rememberReview.startReview(dueCards);
            } else {
                this.app.showErrorToast?.('Review-Modul nicht geladen');
            }
        });

        return section;
    }

    _renderHighlight(cards) {
        const section = document.createElement('div');
        section.className = 'rd-section';

        const renderCard = () => {
            const card = cards[Math.floor(Math.random() * cards.length)];
            const quote = card.back || '';
            const source = card.source ? String(card.source).replace(/^\[\[|\]\]$/g, '') : null;

            section.innerHTML = `
                <div class="rd-section-title">💡 Highlight of the Day</div>
                <div class="rd-highlight">
                    <div class="rd-highlight-body">
                        <div class="rd-highlight-title">${this._esc(card.front)}</div>
                        <div class="rd-highlight-text">${this._esc(quote.length > 300 ? quote.substring(0, 300) + '…' : quote)}</div>
                        ${source ? `<div class="rd-highlight-source">📖 ${this._esc(source)}</div>` : ''}
                    </div>
                    <div class="rd-highlight-actions">
                        <button class="rd-btn-secondary rd-show-another">Show another</button>
                        <button class="rd-btn-ghost rd-open-card">Open Card →</button>
                    </div>
                </div>
            `;

            section.querySelector('.rd-show-another')?.addEventListener('click', renderCard);
            section.querySelector('.rd-open-card')?.addEventListener('click', () => {
                this.app.openFile(card.path);
            });
        };

        renderCard();
        return section;
    }

    _renderRecentActivity(cards, sources) {
        const section = document.createElement('div');
        section.className = 'rd-section';

        const activities = [];

        for (const c of cards) {
            if (c.created) activities.push({ type: 'card_created', name: c.front, date: c.created, path: c.path, icon: '🃏' });
            if (c.last_review) activities.push({ type: 'review', name: c.front, date: c.last_review, path: c.path, icon: '✅' });
        }
        for (const s of sources) {
            if (s.started) activities.push({ type: 'source_added', name: s.title, date: s.started, path: s.path, icon: '📖' });
        }

        activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const recent = activities.slice(0, 10);

        const labels = {
            card_created: 'Karte erstellt',
            review: 'Review abgeschlossen',
            source_added: 'Quelle hinzugefügt'
        };

        section.innerHTML = `
            <div class="rd-section-title">🕐 Letzte Aktivitäten</div>
            ${recent.length === 0
                ? '<div class="rd-empty-hint">Noch keine Aktivitäten</div>'
                : `<div class="rd-timeline">
                    ${recent.map(a => `
                        <div class="rd-timeline-item" data-path="${this._escAttr(a.path)}">
                            <span class="rd-timeline-icon">${a.icon}</span>
                            <div class="rd-timeline-content">
                                <span class="rd-timeline-action">${labels[a.type] || a.type}</span>
                                <span class="rd-timeline-name">${this._esc(a.name)}</span>
                            </div>
                            <span class="rd-timeline-time">${_relativeTime(a.date)}</span>
                        </div>
                    `).join('')}
                </div>`
            }
        `;

        section.querySelectorAll('.rd-timeline-item').forEach(el => {
            el.addEventListener('click', () => this.app.openFile(el.dataset.path));
        });

        return section;
    }

    _renderStatsOverview(stats, cards, sources) {
        const section = document.createElement('div');
        section.className = 'rd-section';

        const retentionRate = stats.total_reviews > 0
            ? Math.round((1 - (stats.due_today / Math.max(1, stats.total_cards))) * 100) + '%'
            : '—';

        const tagCounts = {};
        for (const c of cards) {
            if (Array.isArray(c.tags)) {
                c.tags.forEach(t => { if (t) tagCounts[t] = (tagCounts[t] || 0) + 1; });
            }
        }
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const heatDays = (stats.last_30 || []).slice(-28);

        section.innerHTML = `
            <div class="rd-section-title">📊 Statistiken</div>
            <div class="rd-stats-grid">
                <div class="rd-stat-card"><div class="rd-stat-value">${stats.total_cards}</div><div class="rd-stat-label">Karten</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${sources.length}</div><div class="rd-stat-label">Quellen</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${stats.reviewed_today}</div><div class="rd-stat-label">Reviews heute</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${retentionRate}</div><div class="rd-stat-label">Retention</div></div>
            </div>

            <div class="rd-mini-heatmap">
                ${heatDays.map(d => {
                    const lvl = d.count === 0 ? 0 : d.count <= 3 ? 1 : d.count <= 7 ? 2 : d.count <= 15 ? 3 : 4;
                    return `<div class="rd-hm-cell rd-hm-${lvl}" title="${d.date}: ${d.count} reviews"></div>`;
                }).join('')}
            </div>

            ${topTags.length > 0 ? `
                <div class="rd-top-tags">
                    ${topTags.map(([tag, count]) =>
                        `<span class="rd-tag-badge" data-tag="${this._escAttr(tag)}">#${this._esc(tag)} <small>${count}</small></span>`
                    ).join('')}
                </div>
            ` : ''}
        `;

        section.querySelectorAll('.rd-tag-badge').forEach(el => {
            el.addEventListener('click', () => this.app.searchByTag?.(el.dataset.tag));
        });

        return section;
    }

    _renderSourcesInProgress(readingSources, allCards) {
        const section = document.createElement('div');
        section.className = 'rd-section';

        section.innerHTML = `
            <div class="rd-section-title">📖 Aktive Quellen</div>
            <div class="rd-sources-list">
                ${readingSources.map(s => {
                    const title = s.title || 'Untitled';
                    const author = s.author || '';
                    const highlights = allCards.filter(c => String(c.source || '').includes(title)).length;

                    return `
                        <div class="rd-source-item" data-path="${this._escAttr(s.path)}">
                            <div class="rd-source-info">
                                <div class="rd-source-title">${this._esc(title)}</div>
                                ${author ? `<div class="rd-source-author">${this._esc(author)}</div>` : ''}
                            </div>
                            <div class="rd-source-progress">
                                <span class="rd-source-count">${highlights} Highlight${highlights !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        section.querySelectorAll('.rd-source-item').forEach(el => {
            el.addEventListener('click', () => this.app.openFile(el.dataset.path));
        });

        return section;
    }

    _renderOnboarding() {
        const section = document.createElement('div');
        section.className = 'rd-onboarding';

        section.innerHTML = `
            <div class="rd-onboarding-icon">🧠</div>
            <h2 class="rd-onboarding-title">Willkommen bei Remember</h2>
            <p class="rd-onboarding-subtitle">Dein persönliches Knowledge-Retention-System.<br>Nie wieder vergessen, was du gelesen hast.</p>

            <div class="rd-onboarding-steps">
                <div class="rd-step"><div class="rd-step-num">1</div><div class="rd-step-content"><strong>Quelle hinzufügen</strong><p>Erstelle eine Datei in <code>Sources/</code> mit Frontmatter (Titel, Autor, Status).</p></div></div>
                <div class="rd-step"><div class="rd-step-num">2</div><div class="rd-step-content"><strong>Highlights extrahieren</strong><p>Markiere wichtige Stellen und klicke "Extract to Card" um Karteikarten zu erstellen.</p></div></div>
                <div class="rd-step"><div class="rd-step-num">3</div><div class="rd-step-content"><strong>Täglich reviewen</strong><p>Spaced Repetition sorgt dafür, dass du Wissen langfristig behältst. 🔥</p></div></div>
            </div>

            <button class="rd-start-review rd-onboarding-cta" id="rd-onboarding-create">
                + Erste Quelle hinzufügen
            </button>
        `;

        section.querySelector('#rd-onboarding-create')?.addEventListener('click', () => {
            this.app.switchSidebarPanel?.('remember');
            if (this.app.rememberSources?.showCreateForm) {
                this.app.rememberSources.showCreateForm();
            }
        });

        return section;
    }

    _esc(text) {
        const d = document.createElement('div');
        d.textContent = text || '';
        return d.innerHTML;
    }

    _escAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    _injectStyles() {
        if (document.getElementById(DASHBOARD_STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = DASHBOARD_STYLES_ID;
        style.textContent = `
.remember-main-dashboard { max-width: 720px; margin: 0 auto; padding: 32px 24px; font-family: var(--font-interface, -apple-system, BlinkMacSystemFont, sans-serif); color: var(--text-normal, #dcddde); }
.rd-header { margin-bottom: 28px; }
.rd-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.rd-streak { display: flex; align-items: baseline; gap: 8px; }
.rd-streak-fire { font-size: 36px; line-height: 1; }
.rd-streak-num { font-size: 42px; font-weight: 800; color: var(--text-accent, #f59e0b); line-height: 1; }
.rd-streak-label { font-size: 14px; opacity: 0.5; }
.rd-due-badge { padding: 6px 14px; border-radius: 20px; background: var(--background-secondary, #1e1e2e); font-size: 13px; font-weight: 600; opacity: 0.6; }
.rd-due-badge.rd-due-active { background: rgba(0, 188, 212, 0.15); color: #00e5ff; opacity: 1; }
.rd-start-review { width: 100%; padding: 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #00bcd4, #00acc1); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; letter-spacing: 0.5px; }
.rd-start-review:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,188,212,0.3); }
.rd-start-review:disabled { opacity: 0.35; cursor: default; }
.rd-pulse { animation: rd-pulse-anim 2s ease-in-out infinite; }
@keyframes rd-pulse-anim { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,188,212,0.4); } 50% { box-shadow: 0 0 0 10px rgba(0,188,212,0); } }
.rd-section { margin-bottom: 28px; }
.rd-section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.45; margin-bottom: 12px; font-weight: 600; }
.rd-highlight { background: var(--background-secondary, #1e1e2e); border-radius: 12px; padding: 20px; border-left: 3px solid var(--text-accent, #7c3aed); }
.rd-highlight-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.rd-highlight-text { font-size: 14px; line-height: 1.6; opacity: 0.8; margin-bottom: 10px; white-space: pre-wrap; }
.rd-highlight-source { font-size: 12px; opacity: 0.5; }
.rd-highlight-actions { display: flex; gap: 8px; margin-top: 14px; }
.rd-btn-secondary { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #333); background: transparent; color: var(--text-normal, #ccc); font-size: 12px; cursor: pointer; transition: background 0.15s; }
.rd-btn-secondary:hover { background: var(--background-modifier-hover, #ffffff10); }
.rd-btn-ghost { padding: 6px 14px; border: none; background: transparent; color: var(--text-accent, #7c3aed); font-size: 12px; cursor: pointer; }
.rd-btn-ghost:hover { text-decoration: underline; }
.rd-timeline { display: flex; flex-direction: column; gap: 2px; }
.rd-timeline-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.rd-timeline-item:hover { background: var(--background-secondary, #1e1e2e); }
.rd-timeline-icon { font-size: 16px; flex-shrink: 0; }
.rd-timeline-content { flex: 1; min-width: 0; }
.rd-timeline-action { font-size: 11px; opacity: 0.5; display: block; }
.rd-timeline-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.rd-timeline-time { font-size: 11px; opacity: 0.4; flex-shrink: 0; white-space: nowrap; }
.rd-empty-hint { font-size: 13px; opacity: 0.4; padding: 8px 0; }
.rd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.rd-stat-card { text-align: center; padding: 14px 8px; background: var(--background-secondary, #1e1e2e); border-radius: 10px; }
.rd-stat-value { font-size: 22px; font-weight: 700; color: var(--text-normal, #e0e0e0); }
.rd-stat-label { font-size: 11px; opacity: 0.45; margin-top: 4px; }
.rd-mini-heatmap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 14px; }
.rd-hm-cell { aspect-ratio: 1; border-radius: 3px; }
.rd-hm-0 { background: var(--background-secondary, #161b22); }
.rd-hm-1 { background: #0e4429; }
.rd-hm-2 { background: #006d32; }
.rd-hm-3 { background: #26a641; }
.rd-hm-4 { background: #39d353; }
.rd-top-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.rd-tag-badge { padding: 4px 10px; border-radius: 12px; background: var(--background-modifier-hover, #ffffff10); font-size: 12px; cursor: pointer; transition: background 0.15s; }
.rd-tag-badge:hover { background: rgba(124, 58, 237, 0.2); }
.rd-tag-badge small { opacity: 0.5; margin-left: 4px; }
.rd-sources-list { display: flex; flex-direction: column; gap: 4px; }
.rd-source-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.rd-source-item:hover { background: var(--background-secondary, #1e1e2e); }
.rd-source-title { font-size: 14px; font-weight: 600; }
.rd-source-author { font-size: 12px; opacity: 0.5; }
.rd-source-count { font-size: 12px; opacity: 0.6; padding: 3px 10px; background: var(--background-modifier-hover, #ffffff08); border-radius: 10px; }
.rd-onboarding { text-align: center; padding: 60px 20px; }
.rd-onboarding-icon { font-size: 64px; margin-bottom: 16px; }
.rd-onboarding-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
.rd-onboarding-subtitle { font-size: 14px; opacity: 0.6; line-height: 1.6; margin: 0 0 32px; }
.rd-onboarding-steps { text-align: left; max-width: 400px; margin: 0 auto 32px; display: flex; flex-direction: column; gap: 16px; }
.rd-step { display: flex; gap: 14px; align-items: flex-start; }
.rd-step-num { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #00bcd4, #00acc1); color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rd-step-content strong { display: block; font-size: 14px; margin-bottom: 2px; }
.rd-step-content p { margin: 0; font-size: 13px; opacity: 0.6; line-height: 1.5; }
.rd-step-content code { background: var(--background-secondary, #1e1e2e); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
.rd-onboarding-cta { max-width: 300px; margin: 0 auto; }
`;
        document.head.appendChild(style);
    }
}

window.RememberDashboard = RememberDashboard;
