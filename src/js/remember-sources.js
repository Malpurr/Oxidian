// Oxidian — Remember Sources: Quellen-Manager (Books, Articles, Videos, Podcasts)
// All data ops via Rust backend
import { invoke } from './tauri-bridge.js';

const SOURCE_TYPES = [
    { value: 'book', label: 'Book', icon: '📖' },
    { value: 'article', label: 'Article', icon: '📄' },
    { value: 'video', label: 'Video', icon: '🎬' },
    { value: 'podcast', label: 'Podcast', icon: '🎙️' },
];

const STATUS_OPTIONS = [
    { value: 'want_to_read', label: 'Will lesen', icon: '📋' },
    { value: 'reading', label: 'Lese ich', icon: '📖' },
    { value: 'finished', label: 'Gelesen', icon: '✅' },
];

const STATUS_ORDER = { reading: 0, want_to_read: 1, finished: 2 };

export class RememberSources {
    constructor(app) {
        this.app = app;
        this.sources = [];
        this.filterType = 'all';
        this.editingSource = null;
        this.panelEl = null;
    }

    showCreateForm() {
        const container = this.panelEl || document.getElementById('remember-dashboard');
        if (container) {
            this.show(container).then(() => {
                const overlay = container.querySelector('.rs-form-overlay');
                if (overlay) this.renderForm(overlay, null);
            });
        }
    }

    async show(container) {
        this.panelEl = container;
        await this.loadSources();
        this.render();
    }

    // ── Data layer (via Rust) ───────────────────────────────────

    async loadSources() {
        try {
            const sources = await invoke('remember_load_sources');
            this.sources = sources.sort((a, b) =>
                (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
            );
        } catch (err) {
            console.error('[RememberSources] Failed to load:', err);
            this.sources = [];
        }
    }

    async saveSource(data, existingPath) {
        const input = {
            title: data.title,
            author: data.author || '',
            source_type: data.source_type || 'book',
            status: data.status || 'want_to_read',
            rating: data.rating || 0,
            notes: data.notes || '',
            existing_path: existingPath || null,
        };

        await invoke('remember_create_source', { input });
    }

    async deleteSource(path) {
        await invoke('remember_delete_source', { sourcePath: path });
    }

    // ── Rendering ───────────────────────────────────────────────

    render() {
        if (!this.panelEl) return;
        this.panelEl.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.className = 'remember-sources';
        wrap.innerHTML = `
            <div class="rs-header">
                <h2>📚 Sources</h2>
                <button class="rs-btn rs-btn-primary" data-action="add">+ Add Source</button>
            </div>
            <div class="rs-filters">
                <button class="rs-filter-btn ${this.filterType === 'all' ? 'active' : ''}" data-filter="all">All</button>
                ${SOURCE_TYPES.map(t => `<button class="rs-filter-btn ${this.filterType === t.value ? 'active' : ''}" data-filter="${t.value}">${t.icon} ${t.label}</button>`).join('')}
            </div>
            <div class="rs-list"></div>
            <div class="rs-form-overlay" style="display:none"></div>
        `;
        this.panelEl.appendChild(wrap);

        this.renderList(wrap.querySelector('.rs-list'));
        this.bindMainEvents(wrap);
    }

    renderList(container) {
        const filtered = this.filterType === 'all'
            ? this.sources
            : this.sources.filter(s => s.source_type === this.filterType);

        if (!filtered.length) {
            container.innerHTML = `<div class="rs-empty">No sources yet. Add your first one!</div>`;
            return;
        }

        let currentStatus = null;
        let html = '';
        for (const s of filtered) {
            const status = typeof s.status === 'object' ? Object.keys(s.status)[0] : s.status;
            if (status !== currentStatus) {
                currentStatus = status;
                const label = STATUS_OPTIONS.find(o => o.value === status);
                html += `<div class="rs-status-group">${label ? label.icon + ' ' + label.label : status}</div>`;
            }
            const sourceType = typeof s.source_type === 'object' ? Object.keys(s.source_type)[0] : s.source_type;
            const typeInfo = SOURCE_TYPES.find(t => t.value === sourceType) || { icon: '📄', label: sourceType };
            const stars = '★'.repeat(s.rating || 0) + '☆'.repeat(5 - (s.rating || 0));
            html += `
                <div class="rs-card" data-path="${this.esc(s.path)}">
                    <div class="rs-card-main">
                        <span class="rs-card-type" title="${typeInfo.label}">${typeInfo.icon}</span>
                        <div class="rs-card-info">
                            <div class="rs-card-title">${this.esc(s.title)}</div>
                            <div class="rs-card-author">${this.esc(s.author || '')}</div>
                        </div>
                        <div class="rs-card-rating">${stars}</div>
                    </div>
                    <div class="rs-card-actions">
                        <button class="rs-btn-sm" data-action="edit" data-path="${this.esc(s.path)}" title="Edit">✏️</button>
                        <button class="rs-btn-sm" data-action="open" data-path="${this.esc(s.path)}" title="Open Note">📝</button>
                        <button class="rs-btn-sm rs-btn-danger" data-action="delete" data-path="${this.esc(s.path)}" title="Delete">🗑️</button>
                    </div>
                </div>`;
        }
        container.innerHTML = html;
    }

    renderForm(overlay, source) {
        const isEdit = !!source;
        const sourceType = source ? (typeof source.source_type === 'object' ? Object.keys(source.source_type)[0] : source.source_type) : '';
        const status = source ? (typeof source.status === 'object' ? Object.keys(source.status)[0] : source.status) : '';

        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="rs-form">
                <h3>${isEdit ? 'Edit Source' : 'Add Source'}</h3>
                <label>Title<input type="text" id="rs-title" value="${this.esc(source?.title || '')}" placeholder="e.g. Courage Is Calling" /></label>
                <label>Author<input type="text" id="rs-author" value="${this.esc(source?.author || '')}" placeholder="e.g. Ryan Holiday" /></label>
                <label>Type
                    <select id="rs-type">
                        ${SOURCE_TYPES.map(t => `<option value="${t.value}" ${sourceType === t.value ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
                    </select>
                </label>
                <label>Status
                    <select id="rs-status">
                        ${STATUS_OPTIONS.map(o => `<option value="${o.value}" ${status === o.value ? 'selected' : ''}>${o.icon} ${o.label}</option>`).join('')}
                    </select>
                </label>
                <label>Rating
                    <div class="rs-star-picker" id="rs-rating">
                        ${[1,2,3,4,5].map(n => `<span class="rs-star ${(source?.rating || 0) >= n ? 'active' : ''}" data-val="${n}">★</span>`).join('')}
                    </div>
                </label>
                <label>Notes<textarea id="rs-notes" rows="3" placeholder="Initial notes...">${this.esc(source?.body?.replace(/^#\s*Highlights & Notes\s*\n*/, '') || '')}</textarea></label>
                <div class="rs-form-actions">
                    <button class="rs-btn" data-action="cancel">Cancel</button>
                    <button class="rs-btn rs-btn-primary" data-action="save">Save</button>
                </div>
            </div>`;

        this.bindFormEvents(overlay, source);
    }

    // ── Events ──────────────────────────────────────────────────

    bindMainEvents(wrap) {
        wrap.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const path = btn.dataset.path;
            const overlay = wrap.querySelector('.rs-form-overlay');

            if (action === 'add') {
                this.editingSource = null;
                this.renderForm(overlay, null);
            } else if (action === 'edit') {
                const src = this.sources.find(s => s.path === path);
                if (src) { this.editingSource = path; this.renderForm(overlay, src); }
            } else if (action === 'delete') {
                if (confirm(`Delete source "${this.sources.find(s => s.path === path)?.title}"?`)) {
                    await this.deleteSource(path);
                    await this.loadSources();
                    this.render();
                }
            } else if (action === 'open') {
                this.app?.openFile?.(path);
            }
        });

        wrap.querySelectorAll('.rs-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterType = btn.dataset.filter;
                this.render();
            });
        });
    }

    bindFormEvents(overlay, source) {
        let rating = source?.rating || 0;

        const stars = overlay.querySelectorAll('.rs-star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                rating = parseInt(star.dataset.val, 10);
                stars.forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.val, 10) <= rating);
                });
            });
            star.addEventListener('mouseenter', () => {
                const hoverVal = parseInt(star.dataset.val, 10);
                stars.forEach(s => {
                    s.classList.toggle('hover', parseInt(s.dataset.val, 10) <= hoverVal);
                });
            });
            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hover'));
            });
        });

        overlay.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            if (btn.dataset.action === 'cancel') {
                overlay.style.display = 'none';
                return;
            }

            if (btn.dataset.action === 'save') {
                const title = overlay.querySelector('#rs-title').value.trim();
                if (!title) { overlay.querySelector('#rs-title').focus(); return; }

                const data = {
                    title,
                    author: overlay.querySelector('#rs-author').value.trim(),
                    source_type: overlay.querySelector('#rs-type').value,
                    status: overlay.querySelector('#rs-status').value,
                    rating,
                    notes: overlay.querySelector('#rs-notes').value.trim(),
                };

                try {
                    await this.saveSource(data, this.editingSource);
                    overlay.style.display = 'none';
                    await this.loadSources();
                    this.render();
                } catch (err) {
                    console.error('[RememberSources] Save failed:', err);
                    alert('Failed to save source: ' + err);
                }
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });

        setTimeout(() => overlay.querySelector('#rs-title')?.focus(), 50);
    }

    esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}
