// Oxidian — Remember: Highlight-to-Card Extraction System
// Extract selected text or blockquotes into spaced-repetition cards.
// Card creation via Rust backend.

const { invoke } = window.__TAURI__.core;

export class RememberExtract {
    constructor(app) {
        this.app = app;
        this._boundKeydown = this._onKeydown.bind(this);
        this.init();
    }

    init() {
        document.addEventListener('keydown', this._boundKeydown);
        this._patchEditorContextMenu();
    }

    // ===== Context Menu Integration =====

    _patchEditorContextMenu() {
        const cm = this.app.contextMenu;
        if (!cm) return;

        const origShow = cm.showEditorMenu.bind(cm);
        cm.showEditorMenu = (e, textarea) => {
            e.preventDefault();

            const sel = this.app.editor?.getSelection?.() || '';

            const items = [
                { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
                { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
                { label: 'Paste', shortcut: 'Ctrl+V', action: () => navigator.clipboard.readText().then(t => document.execCommand('insertText', false, t)).catch(() => {}) },
                { separator: true },
                { label: 'Bold', shortcut: 'Ctrl+B', action: () => this.app.editor.wrapSelection('**', '**') },
                { label: 'Italic', shortcut: 'Ctrl+I', action: () => this.app.editor.wrapSelection('*', '*') },
                { label: 'Code', shortcut: 'Ctrl+`', action: () => this.app.editor.wrapSelection('`', '`') },
                { label: 'Link', shortcut: 'Ctrl+K', action: () => this.app.editor.wrapSelection('[[', ']]') },
            ];

            if (sel.trim()) {
                items.push({ separator: true });
                items.push({
                    label: '🃏 Extract to Card',
                    shortcut: '⌘⇧E',
                    action: () => this.extractSelection()
                });
            }

            const content = this.app.editor?.getContent?.() || '';
            if (content.split('\n').some(l => l.trimStart().startsWith('>'))) {
                if (!sel.trim()) items.push({ separator: true });
                items.push({
                    label: '📋 Bulk Extract Highlights',
                    action: () => this.showBulkExtract()
                });
            }

            cm.show(e.clientX, e.clientY, items);
        };
    }

    // ===== Keyboard Shortcut =====

    _onKeydown(e) {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            this.extractSelection();
        }
    }

    // ===== Extract Selection → Show Dialog =====

    extractSelection() {
        const sel = this.app.editor?.getSelection?.() || '';
        if (!sel.trim()) {
            this.app.showNotice?.('Select text first to extract a card.');
            return;
        }
        this._showExtractDialog(sel.trim());
    }

    // ===== Extract Dialog =====

    async _showExtractDialog(backText, opts = {}) {
        document.getElementById('remember-extract-overlay')?.remove();

        const sourceFile = this.app.currentFile || '';
        const sourceLink = sourceFile ? `[[${sourceFile.replace(/\.md$/, '')}]]` : '';

        let allTags = [];
        try {
            allTags = await invoke('get_tags');
            allTags.sort((a, b) => a.localeCompare(b));
        } catch (_) {}

        const overlay = document.createElement('div');
        overlay.id = 'remember-extract-overlay';
        overlay.className = 'command-palette-overlay';

        overlay.innerHTML = `
            <div class="remember-extract-dialog">
                <div class="remember-extract-header">🃏 Extract to Card</div>

                <label class="remember-extract-label">Front (Question / Idea)</label>
                <input type="text" class="remember-extract-input" id="re-front" placeholder="What's the key idea?" autofocus />

                <label class="remember-extract-label">Back (Answer / Content)</label>
                <textarea class="remember-extract-textarea" id="re-back" rows="5">${this._escapeHtml(backText)}</textarea>

                <label class="remember-extract-label">Source</label>
                <input type="text" class="remember-extract-input" id="re-source" value="${this._escapeAttr(sourceLink)}" />

                <label class="remember-extract-label">Tags</label>
                <div class="remember-extract-tags-wrap">
                    <input type="text" class="remember-extract-input" id="re-tags" placeholder="Add tags…" autocomplete="off" />
                    <div class="remember-extract-tag-suggestions hidden" id="re-tag-suggestions"></div>
                    <div class="remember-extract-tag-list" id="re-tag-list"></div>
                </div>

                <div class="remember-extract-actions">
                    <button class="remember-btn" id="re-cancel">Cancel</button>
                    <button class="remember-btn remember-btn-primary" id="re-save">Save Card</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const frontInput = overlay.querySelector('#re-front');
        const backInput = overlay.querySelector('#re-back');
        const sourceInput = overlay.querySelector('#re-source');
        const tagsInput = overlay.querySelector('#re-tags');
        const suggestionsEl = overlay.querySelector('#re-tag-suggestions');
        const tagListEl = overlay.querySelector('#re-tag-list');
        const selectedTags = new Set(opts.tags || []);

        const renderTags = () => {
            tagListEl.innerHTML = '';
            for (const tag of selectedTags) {
                const chip = document.createElement('span');
                chip.className = 'remember-extract-tag-chip';
                chip.textContent = tag;
                chip.addEventListener('click', () => { selectedTags.delete(tag); renderTags(); });
                tagListEl.appendChild(chip);
            }
        };
        renderTags();

        tagsInput.addEventListener('input', () => {
            const q = tagsInput.value.trim().toLowerCase();
            if (!q) { suggestionsEl.classList.add('hidden'); return; }
            const matches = allTags.filter(t => t.toLowerCase().includes(q) && !selectedTags.has(t)).slice(0, 8);
            if (!matches.length) { suggestionsEl.classList.add('hidden'); return; }
            suggestionsEl.innerHTML = '';
            suggestionsEl.classList.remove('hidden');
            for (const m of matches) {
                const item = document.createElement('div');
                item.className = 'remember-extract-tag-suggestion';
                item.textContent = m;
                item.addEventListener('mousedown', (ev) => {
                    ev.preventDefault();
                    selectedTags.add(m);
                    tagsInput.value = '';
                    suggestionsEl.classList.add('hidden');
                    renderTags();
                });
                suggestionsEl.appendChild(item);
            }
        });

        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && tagsInput.value.trim()) {
                e.preventDefault();
                selectedTags.add(tagsInput.value.trim());
                tagsInput.value = '';
                suggestionsEl.classList.add('hidden');
                renderTags();
            }
        });

        const save = async () => {
            const front = frontInput.value.trim();
            const back = backInput.value.trim();
            if (!front) { frontInput.focus(); frontInput.classList.add('remember-extract-error'); return; }
            frontInput.classList.remove('remember-extract-error');

            const source = sourceInput.value.trim();
            const tags = [...selectedTags];

            // Create card via Rust
            try {
                await invoke('remember_create_card', {
                    input: { front, back, source, tags, existing_path: null }
                });
            } catch (err) {
                console.error('[RememberExtract] Failed to create card:', err);
                this.app.showNotice?.('Failed to create card: ' + err);
                return;
            }

            if (backText && sourceFile) {
                await this._markExtracted(backText);
            }

            overlay.remove();
            this.app.showNotice?.(`Card created: ${front}`);

            if (this.app.remember) await this.app.remember.loadAll();
        };

        overlay.querySelector('#re-save').addEventListener('click', save);
        overlay.querySelector('#re-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') overlay.remove();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        });

        frontInput.focus();
    }

    // ===== Highlight Marker =====

    async _markExtracted(highlightText) {
        try {
            let content = this.app.editor?.getContent?.() || '';
            if (!content) return;

            const marker = ' <!-- extracted -->';
            const lines = content.split('\n');
            let changed = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes(highlightText.split('\n')[0].trim()) && !line.includes('<!-- extracted -->')) {
                    lines[i] = line + marker;
                    changed = true;
                    break;
                }
            }

            if (changed) {
                const newContent = lines.join('\n');
                this.app.editor?.setContent?.(newContent);
                this.app.isDirty = true;
                this.app.saveCurrentFile?.();
            }
        } catch (err) {
            console.warn('[RememberExtract] Could not mark highlight:', err);
        }
    }

    // ===== Bulk Extract =====

    async showBulkExtract() {
        const content = this.app.editor?.getContent?.() || '';
        if (!content) return;

        const sourceFile = this.app.currentFile || '';
        const sourceLink = sourceFile ? `[[${sourceFile.replace(/\.md$/, '')}]]` : '';

        const highlights = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trimStart().startsWith('>')) {
                const text = line.replace(/^\s*>\s*/, '').trim();
                if (!text) continue;
                const extracted = line.includes('<!-- extracted -->');
                highlights.push({ text, line: i, extracted });
            }
        }

        if (!highlights.length) {
            this.app.showNotice?.('No blockquote highlights found in this note.');
            return;
        }

        document.getElementById('remember-bulk-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'remember-bulk-overlay';
        overlay.className = 'command-palette-overlay';

        overlay.innerHTML = `
            <div class="remember-extract-dialog remember-bulk-dialog">
                <div class="remember-extract-header">📋 Bulk Extract Highlights</div>
                <div class="remember-extract-label">${highlights.length} highlights found in ${this._escapeHtml(sourceFile || 'current note')}</div>
                <div class="remember-bulk-list" id="re-bulk-list"></div>
                <div class="remember-extract-actions">
                    <button class="remember-btn" id="re-bulk-cancel">Cancel</button>
                    <button class="remember-btn remember-btn-primary" id="re-bulk-extract">Extract Selected</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const listEl = overlay.querySelector('#re-bulk-list');
        const selected = new Set();

        for (const h of highlights) {
            const row = document.createElement('label');
            row.className = 'remember-bulk-item' + (h.extracted ? ' remember-bulk-extracted' : '');
            row.innerHTML = `
                <input type="checkbox" ${h.extracted ? 'disabled' : ''} data-line="${h.line}" />
                <span class="remember-bulk-text">${this._escapeHtml(h.text)}</span>
                ${h.extracted ? '<span class="remember-bulk-badge">✓ extracted</span>' : ''}
            `;
            const cb = row.querySelector('input');
            cb.addEventListener('change', () => {
                if (cb.checked) selected.add(h);
                else selected.delete(h);
            });
            listEl.appendChild(row);
        }

        overlay.querySelector('#re-bulk-extract').addEventListener('click', async () => {
            if (!selected.size) {
                this.app.showNotice?.('Select at least one highlight.');
                return;
            }
            overlay.remove();

            const items = [...selected];
            for (let i = 0; i < items.length; i++) {
                await this._showBulkItemDialog(items[i].text, sourceLink, i + 1, items.length);
            }
        });

        overlay.querySelector('#re-bulk-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
    }

    _showBulkItemDialog(backText, sourceLink, index, total) {
        return new Promise((resolve) => {
            this._showExtractDialog(backText, {});

            requestAnimationFrame(() => {
                const header = document.querySelector('.remember-extract-header');
                if (header) header.textContent = `🃏 Extract Card ${index}/${total}`;
                const sourceInput = document.querySelector('#re-source');
                if (sourceInput) sourceInput.value = sourceLink;

                const obs = new MutationObserver(() => {
                    if (!document.getElementById('remember-extract-overlay')) {
                        obs.disconnect();
                        resolve();
                    }
                });
                obs.observe(document.body, { childList: true });
            });
        });
    }

    // ===== Utilities =====

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    destroy() {
        document.removeEventListener('keydown', this._boundKeydown);
    }
}
