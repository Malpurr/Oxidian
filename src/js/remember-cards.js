// Oxidian — Remember Cards Module
// Card CRUD via Rust backend, UI-only in JS
const { invoke } = window.__TAURI__.core;

export class RememberCards {
    constructor(app) {
        this.app = app;
        this.cards = [];
        this._browserEl = null;
        this._creatorEl = null;
    }

    // ── CRUD (via Rust) ────────────────────────────────────────────────

    async loadAll() {
        try {
            this.cards = await invoke('remember_load_cards');
        } catch (err) {
            console.error('[RememberCards] Failed to load:', err);
            this.cards = [];
        }
        return this.cards;
    }

    async saveCard({ front, back, source, tags, existingPath }) {
        const tagsArr = Array.isArray(tags)
            ? tags
            : (tags || '').split(',').map(t => t.trim()).filter(Boolean);

        const input = {
            front,
            back: back || '',
            source: source || '',
            tags: tagsArr,
            existing_path: existingPath || null,
        };

        const card = await invoke('remember_create_card', { input });
        return card.path;
    }

    async deleteCard(path) {
        await invoke('remember_delete_card', { cardPath: path });
        this.cards = this.cards.filter(c => c.path !== path);
    }

    // ── Sources helper (for dropdown) ──────────────────────────────────

    async listSources() {
        try {
            const sources = await invoke('remember_load_sources');
            return sources.map(s => s.title);
        } catch (_) { return []; }
    }

    // ── Card Creator UI ────────────────────────────────────────────────

    async openCreator(prefill = {}) {
        this.closeCreator();
        const sources = await this.listSources();
        const overlay = document.createElement('div');
        overlay.className = 'remember-modal-overlay';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeCreator(); });

        const modal = document.createElement('div');
        modal.className = 'remember-modal remember-card-creator';
        const isEdit = !!prefill.existingPath;

        modal.innerHTML = `
            <h2>${isEdit ? 'Edit Card' : 'New Card'}</h2>
            <label>Front (Question / Idea)
                <input type="text" id="rc-front" placeholder="What is stoicism?" value="" />
            </label>
            <label>Back (Answer / Explanation)
                <textarea id="rc-back" rows="5" placeholder="The philosophy of…"></textarea>
            </label>
            <label>Source
                <div class="rc-source-row">
                    <select id="rc-source-select">
                        <option value="">— none —</option>
                        ${sources.map(s => `<option value="[[${s}]]">[[${s}]]</option>`).join('')}
                        <option value="__custom__">Custom [[link]]…</option>
                    </select>
                    <input type="text" id="rc-source-custom" placeholder="[[Source Name]]" style="display:none" />
                </div>
            </label>
            <label>Tags (comma-separated)
                <input type="text" id="rc-tags" placeholder="stoicism, courage" value="" />
            </label>
            <div class="rc-buttons">
                <button id="rc-cancel" class="btn-secondary">Cancel</button>
                <button id="rc-save" class="btn-primary">${isEdit ? 'Update' : 'Save'}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this._creatorEl = overlay;

        const frontInput = modal.querySelector('#rc-front');
        const backInput = modal.querySelector('#rc-back');
        const sourceSelect = modal.querySelector('#rc-source-select');
        const sourceCustom = modal.querySelector('#rc-source-custom');
        const tagsInput = modal.querySelector('#rc-tags');

        if (prefill.front) frontInput.value = prefill.front;
        if (prefill.back) backInput.value = prefill.back;
        if (prefill.tags) tagsInput.value = Array.isArray(prefill.tags) ? prefill.tags.join(', ') : prefill.tags;
        if (prefill.source) {
            const opt = Array.from(sourceSelect.options).find(o => o.value === prefill.source);
            if (opt) { sourceSelect.value = prefill.source; }
            else { sourceSelect.value = '__custom__'; sourceCustom.style.display = ''; sourceCustom.value = prefill.source; }
        }

        sourceSelect.addEventListener('change', () => {
            sourceCustom.style.display = sourceSelect.value === '__custom__' ? '' : 'none';
        });

        modal.querySelector('#rc-cancel').addEventListener('click', () => this.closeCreator());
        modal.querySelector('#rc-save').addEventListener('click', async () => {
            const front = frontInput.value.trim();
            const back = backInput.value.trim();
            if (!front) { frontInput.focus(); return; }
            const source = sourceSelect.value === '__custom__' ? sourceCustom.value.trim() : sourceSelect.value;
            const tags = tagsInput.value;
            await this.saveCard({
                front, back, source, tags,
                existingPath: prefill.existingPath,
            });
            this.closeCreator();
            if (this._browserEl) this.openBrowser(this._browserEl.parentElement);
        });

        frontInput.focus();
    }

    closeCreator() {
        if (this._creatorEl) {
            this._creatorEl.remove();
            this._creatorEl = null;
        }
    }

    // ── Extract to Card (from editor selection) ────────────────────────

    extractToCard() {
        let selectedText = '';
        const editor = this.app?.editor;
        if (editor) {
            const cm = editor.cm || editor;
            if (cm?.state) {
                const sel = cm.state.selection?.main;
                if (sel && sel.from !== sel.to) {
                    selectedText = cm.state.doc.sliceString(sel.from, sel.to);
                }
            }
        }
        if (!selectedText) {
            selectedText = window.getSelection()?.toString() || '';
        }

        const currentFile = this.app?.currentFile || '';
        const sourceName = currentFile.replace(/\.md$/, '').replace(/^.*\//, '');
        const source = sourceName ? `[[${sourceName}]]` : '';

        this.openCreator({
            back: selectedText.trim(),
            source,
        });
    }

    // ── Card Browser UI ────────────────────────────────────────────────

    async openBrowser(container) {
        if (!container) return;
        await this.loadAll();

        const el = document.createElement('div');
        el.className = 'remember-card-browser';

        const allTags = new Set();
        const allSources = new Set();
        for (const c of this.cards) {
            if (Array.isArray(c.tags)) c.tags.forEach(t => allTags.add(t));
            if (c.source) allSources.add(c.source);
        }

        el.innerHTML = `
            <div class="rcb-toolbar">
                <button class="btn-primary rcb-new-card">+ New Card</button>
                <select class="rcb-filter-tag">
                    <option value="">All Tags</option>
                    ${[...allTags].sort().map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <select class="rcb-filter-source">
                    <option value="">All Sources</option>
                    ${[...allSources].sort().map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>
            <div class="rcb-list"></div>
        `;

        container.innerHTML = '';
        container.appendChild(el);
        this._browserEl = el;

        const listEl = el.querySelector('.rcb-list');
        const tagFilter = el.querySelector('.rcb-filter-tag');
        const sourceFilter = el.querySelector('.rcb-filter-source');

        const renderList = () => {
            const ftag = tagFilter.value;
            const fsrc = sourceFilter.value;
            const filtered = this.cards.filter(c => {
                if (ftag) {
                    const tags = Array.isArray(c.tags) ? c.tags : [c.tags];
                    if (!tags.includes(ftag)) return false;
                }
                if (fsrc && c.source !== fsrc) return false;
                return true;
            });
            listEl.innerHTML = filtered.length === 0
                ? '<div class="rcb-empty">No cards found.</div>'
                : filtered.map(c => `
                    <div class="rcb-card" data-path="${c.path}">
                        <div class="rcb-card-front">${this._escHtml(c.front)}</div>
                        <div class="rcb-card-meta">
                            ${c.source ? `<span class="rcb-source">${this._escHtml(c.source)}</span>` : ''}
                            ${Array.isArray(c.tags) ? c.tags.map(t => `<span class="rcb-tag">${this._escHtml(t)}</span>`).join('') : ''}
                        </div>
                        <div class="rcb-card-actions">
                            <button class="rcb-edit" data-path="${c.path}" title="Edit">✏️</button>
                            <button class="rcb-delete" data-path="${c.path}" title="Delete">🗑️</button>
                        </div>
                    </div>
                `).join('');
        };

        renderList();
        tagFilter.addEventListener('change', renderList);
        sourceFilter.addEventListener('change', renderList);

        el.querySelector('.rcb-new-card').addEventListener('click', () => this.openCreator());

        listEl.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.rcb-edit');
            const deleteBtn = e.target.closest('.rcb-delete');
            if (editBtn) {
                const card = this.cards.find(c => c.path === editBtn.dataset.path);
                if (card) {
                    this.openCreator({
                        front: card.front,
                        back: card.back,
                        source: card.source,
                        tags: card.tags,
                        existingPath: card.path,
                    });
                }
            } else if (deleteBtn) {
                const path = deleteBtn.dataset.path;
                if (confirm(`Delete card "${path}"?`)) {
                    await this.deleteCard(path);
                    renderList();
                }
            }
        });
    }

    _escHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

export function safeInitModule(app) {
    try {
        return new RememberCards(app);
    } catch (err) {
        console.error('[Oxidian] Failed to initialize RememberCards:', err);
        return null;
    }
}
