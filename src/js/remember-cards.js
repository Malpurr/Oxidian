// Oxidian — Remember Cards Module
// Karteikarten-System: Create, Edit, Delete, Browse, Extract-to-Card
// Uses Tauri invoke API for file operations.

const { invoke } = window.__TAURI__.core;

const CARDS_FOLDER = 'Cards';

// ── Helpers ────────────────────────────────────────────────────────────

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function parseFrontmatter(content) {
    const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { meta: {}, body: content };
    const meta = {};
    for (const line of m[1].split('\n')) {
        const idx = line.indexOf(':');
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        // Parse arrays like [a, b]
        if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
        }
        // Strip quotes
        if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        if (val === 'null') val = null;
        if (!isNaN(val) && val !== null && val !== '') val = Number(val);
        meta[key] = val;
    }
    return { meta, body: m[2] };
}

function buildCardMarkdown({ front, back, source, tags, interval, ease, next_review, last_review, review_count, created }) {
    const tagsArr = Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const tagsYaml = `[${tagsArr.join(', ')}]`;
    const srcYaml = source ? `"${source}"` : '""';
    return `---
type: card
source: ${srcYaml}
tags: ${tagsYaml}
interval: ${interval ?? 1}
ease: ${ease ?? 2.5}
next_review: ${next_review ?? tomorrowISO()}
last_review: ${last_review ?? 'null'}
review_count: ${review_count ?? 0}
created: ${created ?? todayISO()}
---
# ${front}

${back}
`.trimEnd() + '\n';
}

// ── CardsManager ───────────────────────────────────────────────────────

export class RememberCards {
    constructor(app) {
        this.app = app;
        this.cards = [];          // cached card list
        this._browserEl = null;   // card browser container
        this._creatorEl = null;   // card creator modal
    }

    // ── CRUD ───────────────────────────────────────────────────────────

    async ensureFolder() {
        try {
            await invoke('create_folder', { path: CARDS_FOLDER });
        } catch (_) { /* already exists */ }
    }

    async loadAll() {
        await this.ensureFolder();
        const tree = await invoke('list_files');
        const cardFiles = this._findCardFiles(tree);
        const cards = [];
        for (const path of cardFiles) {
            try {
                const content = await invoke('read_note', { path });
                const { meta, body } = parseFrontmatter(content);
                if (meta.type !== 'card') continue;
                const heading = body.match(/^#\s+(.+)$/m);
                const front = heading ? heading[1].trim() : path;
                const back = body.replace(/^#\s+.+\n?/, '').trim();
                cards.push({ path, front, back, ...meta });
            } catch (_) { /* skip unreadable */ }
        }
        this.cards = cards;
        return cards;
    }

    _findCardFiles(node, prefix = '') {
        const files = [];
        if (!node) return files;
        if (Array.isArray(node)) {
            for (const n of node) files.push(...this._findCardFiles(n, prefix));
            return files;
        }
        const name = node.name || '';
        const fullPath = prefix ? `${prefix}/${name}` : name;
        if (node.children) {
            if (name === CARDS_FOLDER || fullPath.startsWith(CARDS_FOLDER)) {
                for (const child of node.children) {
                    files.push(...this._findCardFiles(child, fullPath));
                }
            } else {
                for (const child of node.children) {
                    files.push(...this._findCardFiles(child, fullPath));
                }
            }
        } else if (name.endsWith('.md') && fullPath.startsWith(CARDS_FOLDER + '/')) {
            files.push(fullPath);
        }
        return files;
    }

    async saveCard({ front, back, source, tags, interval, ease, next_review, last_review, review_count, created, existingPath }) {
        await this.ensureFolder();
        const md = buildCardMarkdown({ front, back, source, tags, interval, ease, next_review, last_review, review_count, created });
        const path = existingPath || `${CARDS_FOLDER}/${slugify(front)}.md`;
        await invoke('save_note', { path, content: md });
        return path;
    }

    async deleteCard(path) {
        await invoke('delete_note', { path });
        this.cards = this.cards.filter(c => c.path !== path);
    }

    // ── Sources helper (for dropdown) ──────────────────────────────────

    async listSources() {
        try {
            const tree = await invoke('list_files');
            return this._findSourceFiles(tree);
        } catch (_) { return []; }
    }

    _findSourceFiles(node, prefix = '') {
        const files = [];
        if (!node) return files;
        if (Array.isArray(node)) {
            for (const n of node) files.push(...this._findSourceFiles(n, prefix));
            return files;
        }
        const name = node.name || '';
        const fullPath = prefix ? `${prefix}/${name}` : name;
        if (node.children) {
            for (const child of node.children) {
                files.push(...this._findSourceFiles(child, fullPath));
            }
        } else if (name.endsWith('.md') && fullPath.startsWith('Sources/')) {
            files.push(name.replace(/\.md$/, ''));
        }
        return files;
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

        // Fill values
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
                interval: prefill.interval,
                ease: prefill.ease,
                next_review: prefill.next_review,
                last_review: prefill.last_review,
                review_count: prefill.review_count,
                created: prefill.created,
                existingPath: prefill.existingPath,
            });
            this.closeCreator();
            // Refresh browser if open
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
            // CodeMirror 6 style
            const cm = editor.cm || editor;
            if (cm?.state) {
                const sel = cm.state.selection?.main;
                if (sel && sel.from !== sel.to) {
                    selectedText = cm.state.doc.sliceString(sel.from, sel.to);
                }
            }
        }
        // Fallback: window selection
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

        // Collect all tags and sources for filters
        const allTags = new Set();
        const allSources = new Set();
        for (const c of this.cards) {
            if (Array.isArray(c.tags)) c.tags.forEach(t => allTags.add(t));
            else if (c.tags) allTags.add(c.tags);
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
                        interval: card.interval,
                        ease: card.ease,
                        next_review: card.next_review,
                        last_review: card.last_review,
                        review_count: card.review_count,
                        created: card.created,
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

// ── Safe Init Wrapper ──────────────────────────────────────────────────

export function safeInitModule(app) {
    try {
        return new RememberCards(app);
    } catch (err) {
        console.error('[Oxidian] Failed to initialize RememberCards:', err);
        return null;
    }
}
