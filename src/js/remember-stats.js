/**
 * Oxidian — Remember Stats Module
 * All computation done in Rust. JS only renders UI.
 */

import { invoke } from './tauri-bridge.js';

class RememberStats {
    constructor(app) {
        this.app = app;
    }

    async init() {
        // No-op — stats are loaded on demand from Rust
    }

    // ── UI Rendering ──────────────────────────────────────────

    async render(container) {
        let stats;
        try {
            stats = await invoke('remember_get_stats');
        } catch (err) {
            console.error('[RememberStats] Failed to load stats:', err);
            container.innerHTML = '<div class="rs-stats">Stats konnten nicht geladen werden.</div>';
            return;
        }

        let heatmapData;
        try {
            heatmapData = await invoke('remember_get_heatmap');
        } catch (_) {
            heatmapData = [];
        }

        container.innerHTML = '';

        if (!document.getElementById('remember-stats-styles')) {
            const style = document.createElement('style');
            style.id = 'remember-stats-styles';
            style.textContent = this._getCSS();
            document.head.appendChild(style);
        }

        const wrap = document.createElement('div');
        wrap.className = 'rs-stats';

        wrap.appendChild(this._renderStreak(stats));
        wrap.appendChild(this._renderStatsGrid(stats));
        wrap.appendChild(this._renderBarChart(stats.last_30 || []));
        wrap.appendChild(this._renderHeatmap(heatmapData));

        container.appendChild(wrap);
    }

    _renderStreak(stats) {
        const el = document.createElement('div');
        el.className = 'rs-streak';
        el.innerHTML = `<span class="rs-streak-flame">🔥</span><span class="rs-streak-num">${stats.current_streak}</span><span class="rs-streak-label">day streak</span>`;
        return el;
    }

    _renderStatsGrid(stats) {
        const el = document.createElement('div');
        el.className = 'rs-grid';
        const items = [
            ['Total Cards', stats.total_cards],
            ['Total Reviews', stats.total_reviews],
            ['Due Today', stats.due_today],
            ['Avg Ease', stats.avg_ease.toFixed(2)],
            ['Mature', stats.mature_cards],
            ['Young', stats.young_cards],
            ['Current Streak', `${stats.current_streak}d`],
            ['Best Streak', `${stats.best_streak}d`],
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
            return `<div class="rs-bar" title="${d.date}: ${d.count}" style="--h:${pct}%"></div>`;
        }).join('');
        el.appendChild(chart);
        return el;
    }

    _renderHeatmap(heatmapData) {
        const el = document.createElement('div');
        el.className = 'rs-heatmap-section';

        const label = document.createElement('div');
        label.className = 'rs-section-title';
        label.textContent = 'Review Activity';
        el.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'rs-heatmap';

        grid.innerHTML = heatmapData.map(c => {
            const lvl = this._heatLevel(c.count);
            return `<div class="rs-hm-cell rs-hm-${lvl}" title="${c.date}: ${c.count}"></div>`;
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
.rs-streak { display: flex; align-items: center; gap: 6px; padding: 8px 12px; margin-bottom: 8px; background: var(--background-secondary, #1e1e2e); border-radius: 8px; }
.rs-streak-flame { font-size: 22px; }
.rs-streak-num { font-size: 24px; font-weight: 700; color: var(--text-accent, #f59e0b); }
.rs-streak-label { font-size: 12px; opacity: 0.6; }
.rs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
.rs-stat { text-align: center; padding: 6px 2px; background: var(--background-secondary, #1e1e2e); border-radius: 6px; }
.rs-stat-val { font-size: 15px; font-weight: 600; color: var(--text-normal, #e0e0e0); }
.rs-stat-label { font-size: 10px; opacity: 0.5; margin-top: 2px; }
.rs-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; margin-bottom: 4px; }
.rs-barchart-section { margin-bottom: 10px; }
.rs-barchart { display: flex; align-items: flex-end; gap: 1px; height: 48px; }
.rs-bar { flex: 1; min-width: 0; background: var(--text-accent, #7c3aed); border-radius: 1px 1px 0 0; height: var(--h, 0%); transition: height 0.2s; }
.rs-bar:hover { opacity: 0.7; }
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

window.RememberStats = RememberStats;
