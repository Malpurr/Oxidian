// Oxidian — Remember Sources: Quellen-Manager (Books, Articles, Videos, Podcasts)
const { invoke } = window.__TAURI__.core;

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

const SOURCES_DIR = 'Sources';

export class RememberSources {
    constructor(app) {
        this.app = app;
        this.sources = [];
        this.filterType = 'all';
        this.editingSource = null; // path of source being edited
        this.panelEl = null;
    }

    // ── Public API ──────────────────────────────────────────────

    /** Convenience: show the sources panel in the sidebar remember-dashboard container and open create form */
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
        await this.ensureSourcesDir();
        await this.loadSources();
        this.render();
    }

    // ── Data layer ──────────────────────────────────────────────

    async ensureSourcesDir() {
        try {
            await invoke('list_files');
            // The directory will be created on first save if needed
        } catch (_) { /* ignore */ }
    }

    async loadSources() {
        this.sources = [];
        try {
            const tree = await invoke('list_files');
            const sourceFiles = this.findSourceFiles(tree);
            for (const path of sourceFiles) {
                try {
                    const content = await invoke('read_note', { path });
                    const source = this.parseSource(path, content);
                    if (source) this.sources.push(source);
                } catch (e) {
                    console.warn(`[RememberSources] Failed to read ${path}:`, e);
                }
            }
            this.sources.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
        } catch (err) {
            console.error('[RememberSources] Failed to list files:', err);
        }
    }

    /** Walk file tree and collect .md paths under Sources/ */
    findSourceFiles(tree, prefix = '') {
        const paths = [];
        if (!tree) return paths;
        const items = Array.isArray(tree) ? tree : (tree.children || []);
        for (const item of items) {
            const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.children) {
                paths.push(...this.findSourceFiles(item, itemPath));
            } else if (itemPath.startsWith(SOURCES_DIR + '/') && itemPath.endsWith('.md')) {
                paths.push(itemPath);
            }
        }
        return paths;
    }

    parseSource(path, content) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;
        const fm = {};
        for (const line of match[1].split('\n')) {
            const m = line.match(/^(\w+):\s*(.+)$/);
            if (m) {
                let val = m[2].trim();
                if (val === 'null') val = null;
                else if (val === 'true') val = true;
                else if (val === 'false') val = false;
                else if (/^\d+$/.test(val)) val = parseInt(val, 10);
                else val = val.replace(/^["']|["']$/g, '');
                fm[m[1]] = val;
            }
        }
        if (fm.type !== 'source') return null;
        const body = content.slice(match[0].length).trim();
        return { path, ...fm, body };
    }

    async saveSource(data, existingPath) {
        const filename = data.title.replace(/[\\/:*?"<>|]/g, '_').trim();
        const path = existingPath || `${SOURCES_DIR}/${filename}.md`;
        const today = new Date().toISOString().slice(0, 10);

        const frontmatter = [
            '---',
            'type: source',
            `title: "${data.title}"`,
            `author: "${data.author || ''}"`,
            `source_type: ${data.source_type}`,
            `status: ${data.status}`,
            `rating: ${data.rating || 0}`,
            `started: ${data.status !== 'want_to_read' ? (data.started || today) : 'null'}`,
            `finished: ${data.status === 'finished' ? (data.finished || today) : 'null'}`,
            '---',
        ].join('\n');

        const body = data.body != null ? data.body : `\n# Highlights & Notes\n\n${data.notes || ''}`;
        const content = frontmatter + '\n' + body;

        await invoke('save_note', { path, content });

        // If title changed and we had a different path, delete old file
        if (existingPath && existingPath !== path) {
            try { await invoke('delete_note', { path: existingPath }); } catch (_) {}
        }
        return path;
    }

    async deleteSource(path) {
        await invoke('delete_note', { path });
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
            if (s.status !== currentStatus) {
                currentStatus = s.status;
                const label = STATUS_OPTIONS.find(o => o.value === s.status);
                html += `<div class="rs-status-group">${label ? label.icon + ' ' + label.label : s.status}</div>`;
            }
            const typeInfo = SOURCE_TYPES.find(t => t.value === s.source_type) || { icon: '📄', label: s.source_type };
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
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="rs-form">
                <h3>${isEdit ? 'Edit Source' : 'Add Source'}</h3>
                <label>Title<input type="text" id="rs-title" value="${this.esc(source?.title || '')}" placeholder="e.g. Courage Is Calling" /></label>
                <label>Author<input type="text" id="rs-author" value="${this.esc(source?.author || '')}" placeholder="e.g. Ryan Holiday" /></label>
                <label>Type
                    <select id="rs-type">
                        ${SOURCE_TYPES.map(t => `<option value="${t.value}" ${source?.source_type === t.value ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
                    </select>
                </label>
                <label>Status
                    <select id="rs-status">
                        ${STATUS_OPTIONS.map(o => `<option value="${o.value}" ${source?.status === o.value ? 'selected' : ''}>${o.icon} ${o.label}</option>`).join('')}
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

        // Filter buttons
        wrap.querySelectorAll('.rs-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterType = btn.dataset.filter;
                this.render();
            });
        });
    }

    bindFormEvents(overlay, source) {
        let rating = source?.rating || 0;

        // Star picker
        overlay.querySelectorAll('.rs-star').forEach(star => {
            star.addEventListener('click', () => {
                rating = parseInt(star.dataset.val, 10);
                overlay.querySelectorAll('.rs-star').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.val, 10) <= rating);
                });
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
                    started: source?.started || null,
                    finished: source?.finished || null,
                    body: source ? source.body : null,
                };

                // If editing, preserve original body (don't overwrite highlights)
                if (source) {
                    data.body = source.body;
                }

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

        // Close on overlay background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });

        // Focus title
        setTimeout(() => overlay.querySelector('#rs-title')?.focus(), 50);
    }

    // ── Helpers ──────────────────────────────────────────────────

    esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}
