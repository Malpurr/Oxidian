/**
 * Oxidian — Remember Stats Module
 * Streak counter, retention heatmap, stats dashboard
 * Data stored in .oxidian/remember-stats.json
 */

class RememberStats {
    constructor(app) {
        this.app = app;
        this.statsPath = '.oxidian/remember-stats.json';
        this.data = null;
        this._loaded = false;
    }

    async init() {
        await this._load();
    }

    // ── Data Persistence ──────────────────────────────────────

    async _load() {
        if (this._loaded) return;
        const { readTextFile, exists, mkdir } = window.__TAURI__.fs;
        try {
            const dirExists = await exists('.oxidian', { baseDir: 11 });
            if (!dirExists) await mkdir('.oxidian', { baseDir: 11 });

            const fileExists = await exists(this.statsPath, { baseDir: 11 });
            if (fileExists) {
                const raw = await readTextFile(this.statsPath, { baseDir: 11 });
                this.data = JSON.parse(raw);
            } else {
                this.data = this._defaultData();
                await this._save();
            }
        } catch (err) {
            console.error('[RememberStats] Load failed:', err);
            this.data = this._defaultData();
        }
        this._loaded = true;
    }

    async _save() {
        const { writeTextFile } = window.__TAURI__.fs;
        try {
            await writeTextFile(this.statsPath, JSON.stringify(this.data, null, 2), { baseDir: 11 });
        } catch (err) {
            console.error('[RememberStats] Save failed:', err);
        }
    }

    _defaultData() {
        return {
            daily: {},
            streak: { current: 0, best: 0 },
            total_reviews: 0
        };
    }

    // ── Core API ──────────────────────────────────────────────

    _today() {
        return new Date().toISOString().slice(0, 10);
    }

    /**
     * Record a review. Called by remember-review.js after each card rating.
     * @param {string} quality - 'again' | 'hard' | 'good' | 'easy'
     */
    async recordReview(quality) {
        await this._load();
        const today = this._today();

        if (!this.data.daily[today]) {
            this.data.daily[today] = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };
        }

        this.data.daily[today].reviewed++;
        if (this.data.daily[today][quality] !== undefined) {
            this.data.daily[today][quality]++;
        }

        this.data.total_reviews++;
        this._updateStreak();
        await this._save();
    }

    _updateStreak() {
        let streak = 0;
        const d = new Date();
        while (true) {
            const key = d.toISOString().slice(0, 10);
            if (this.data.daily[key] && this.data.daily[key].reviewed > 0) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }
        this.data.streak.current = streak;
        if (streak > this.data.streak.best) {
            this.data.streak.best = streak;
        }
    }

    /**
     * Get all stats for the dashboard.
     * @param {Array} allCards - Array of card objects with { interval, ease, next_review }
     * @returns {object}
     */
    async getStats(allCards = []) {
        await this._load();

        const today = this._today();
        const todayData = this.data.daily[today] || { reviewed: 0 };

        const matureCards = allCards.filter(c => (c.interval || 0) > 21).length;
        const youngCards = allCards.filter(c => (c.interval || 0) > 0 && (c.interval || 0) <= 21).length;
        const dueToday = allCards.filter(c => c.next_review && c.next_review <= today).length;

        let avgEase = 0;
        if (allCards.length > 0) {
            avgEase = allCards.reduce((sum, c) => sum + (c.ease || 2.5), 0) / allCards.length;
        }

        // Last 30 days review counts
        const last30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const entry = this.data.daily[key];
            last30.push({ date: key, count: entry ? entry.reviewed : 0 });
        }

        return {
            totalCards: allCards.length,
            totalReviews: this.data.total_reviews,
            reviewedToday: todayData.reviewed,
            dueToday,
            avgEase: Math.round(avgEase * 100) / 100,
            matureCards,
            youngCards,
            currentStreak: this.data.streak.current,
            bestStreak: this.data.streak.best,
            last30
        };
    }

    // ── UI Rendering ──────────────────────────────────────────

    /**
     * Render the full stats section into a container element.
     * @param {HTMLElement} container
     * @param {Array} allCards
     */
    async render(container, allCards = []) {
        const stats = await this.getStats(allCards);
        container.innerHTML = '';

        // Inject scoped styles once
        if (!document.getElementById('remember-stats-styles')) {
            const style = document.createElement('style');
            style.id = 'remember-stats-styles';
            style.textContent = this._getCSS();
            document.head.appendChild(style);
        }

        const wrap = document.createElement('div');
        wrap.className = 'rs-stats';

        // Streak
        wrap.appendChild(this._renderStreak(stats));

        // Stats grid
        wrap.appendChild(this._renderStatsGrid(stats));

        // Mini bar chart (last 30 days)
        wrap.appendChild(this._renderBarChart(stats.last30));

        // Heatmap
        wrap.appendChild(this._renderHeatmap());

        container.appendChild(wrap);
    }

    _renderStreak(stats) {
        const el = document.createElement('div');
        el.className = 'rs-streak';
        el.innerHTML = `<span class="rs-streak-flame">🔥</span><span class="rs-streak-num">${stats.currentStreak}</span><span class="rs-streak-label">day streak</span>`;
        return el;
    }

    _renderStatsGrid(stats) {
        const el = document.createElement('div');
        el.className = 'rs-grid';
        const items = [
            ['Total Cards', stats.totalCards],
            ['Total Reviews', stats.totalReviews],
            ['Due Today', stats.dueToday],
            ['Avg Ease', stats.avgEase.toFixed(2)],
            ['Mature', stats.matureCards],
            ['Young', stats.youngCards],
            ['Current Streak', `${stats.currentStreak}d`],
            ['Best Streak', `${stats.bestStreak}d`],
        ];
        el.innerHTML = items.map(([label, val]) =>
            `<div class="rs-stat"><div class="rs-stat-val">${val}</div><div class="rs-stat-label">${label}</div></div>`
        ).join('');
        return el;
    }

    _renderBarChart(last30) {
        const el = document.createElement('div');
        el.className = 'rs-barchart-section';

        const max = Math.max(1, ...last30.map(d => d.count));

        const label = document.createElement('div');
        label.className = 'rs-section-title';
        label.textContent = 'Reviews (last 30 days)';
        el.appendChild(label);

        const chart = document.createElement('div');
        chart.className = 'rs-barchart';
        chart.innerHTML = last30.map(d => {
            const pct = (d.count / max) * 100;
            const title = `${d.date}: ${d.count}`;
            return `<div class="rs-bar" title="${title}" style="--h:${pct}%"></div>`;
        }).join('');
        el.appendChild(chart);
        return el;
    }

    _renderHeatmap() {
        const el = document.createElement('div');
        el.className = 'rs-heatmap-section';

        const label = document.createElement('div');
        label.className = 'rs-section-title';
        label.textContent = 'Review Activity';
        el.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'rs-heatmap';

        // Build 52 weeks × 7 days grid ending today
        const today = new Date();
        // Find the end of the current week (Saturday) to align columns
        const endDate = new Date(today);

        // Go back 52*7 - 1 days from today's weekday-aligned start
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (52 * 7 - 1) - startDate.getDay());

        const d = new Date(startDate);
        const cells = [];

        for (let i = 0; i < 52 * 7; i++) {
            const key = d.toISOString().slice(0, 10);
            const entry = this.data.daily[key];
            const count = entry ? entry.reviewed : 0;
            const isFuture = d > today;
            cells.push({ key, count, future: isFuture });
            d.setDate(d.getDate() + 1);
        }

        grid.innerHTML = cells.map(c => {
            const lvl = c.future ? 'future' : this._heatLevel(c.count);
            return `<div class="rs-hm-cell rs-hm-${lvl}" title="${c.key}: ${c.count}"></div>`;
        }).join('');

        el.appendChild(grid);
        return el;
    }

    _heatLevel(count) {
        if (count === 0) return '0';
        if (count <= 3) return '1';
        if (count <= 7) return '2';
        if (count <= 15) return '3';
        return '4';
    }

    _getCSS() {
        return `
.rs-stats { padding: 8px 0; font-size: 13px; color: var(--text-normal, #ccc); }

/* Streak */
.rs-streak { display: flex; align-items: center; gap: 6px; padding: 8px 12px; margin-bottom: 8px; background: var(--background-secondary, #1e1e2e); border-radius: 8px; }
.rs-streak-flame { font-size: 22px; }
.rs-streak-num { font-size: 24px; font-weight: 700; color: var(--text-accent, #f59e0b); }
.rs-streak-label { font-size: 12px; opacity: 0.6; }

/* Stats Grid */
.rs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
.rs-stat { text-align: center; padding: 6px 2px; background: var(--background-secondary, #1e1e2e); border-radius: 6px; }
.rs-stat-val { font-size: 15px; font-weight: 600; color: var(--text-normal, #e0e0e0); }
.rs-stat-label { font-size: 10px; opacity: 0.5; margin-top: 2px; }

/* Section title */
.rs-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; margin-bottom: 4px; }

/* Bar Chart */
.rs-barchart-section { margin-bottom: 10px; }
.rs-barchart { display: flex; align-items: flex-end; gap: 1px; height: 48px; }
.rs-bar { flex: 1; min-width: 0; background: var(--text-accent, #7c3aed); border-radius: 1px 1px 0 0; height: var(--h, 0%); transition: height 0.2s; }
.rs-bar:hover { opacity: 0.7; }

/* Heatmap */
.rs-heatmap-section { margin-bottom: 8px; }
.rs-heatmap { display: grid; grid-template-rows: repeat(7, 1fr); grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; }
.rs-hm-cell { aspect-ratio: 1; border-radius: 2px; min-width: 0; }
.rs-hm-0 { background: var(--background-secondary, #161b22); }
.rs-hm-1 { background: #0e4429; }
.rs-hm-2 { background: #006d32; }
.rs-hm-3 { background: #26a641; }
.rs-hm-4 { background: #39d353; }
.rs-hm-future { background: transparent; }
`;
    }
}

// Export for safeInitModule pattern
window.RememberStats = RememberStats;
