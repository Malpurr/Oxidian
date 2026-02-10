// Oxidian — Remember Import: Import external highlights from Kindle, Readwise, Markdown, Plain Text
// Parsing and import execution done in Rust backend. JS handles UI only.

const { invoke } = window.__TAURI__.core;

function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export class RememberImport {
    constructor(app) {
        this.app = app;
        this.panelEl = null;
        this.pendingEntries = [];
        this.selectedFormat = 'kindle';
        this.sourceName = '';
    }

    async show(container) {
        this.panelEl = container;
        this.pendingEntries = [];
        this.render();
    }

    // ── Rendering ───────────────────────────────────────────────

    render() {
        if (!this.panelEl) return;

        this.panelEl.innerHTML = `
            <div class="remember-import">
                <div class="remember-import-header">
                    <h3>📥 Import Highlights</h3>
                </div>

                <div class="remember-import-format">
                    <label>Format:</label>
                    <select id="import-format-select">
                        <option value="kindle" ${this.selectedFormat === 'kindle' ? 'selected' : ''}>Kindle (My Clippings.txt)</option>
                        <option value="readwise" ${this.selectedFormat === 'readwise' ? 'selected' : ''}>Readwise CSV</option>
                        <option value="markdown" ${this.selectedFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
                        <option value="text" ${this.selectedFormat === 'text' ? 'selected' : ''}>Plain Text (paste)</option>
                    </select>
                </div>

                <div id="import-dropzone" class="remember-import-dropzone">
                    <div class="dropzone-content">
                        <span class="dropzone-icon">📂</span>
                        <p>Drag & drop file here</p>
                        <p class="dropzone-sub">or <button id="import-file-btn" class="btn-link">browse files</button></p>
                    </div>
                </div>

                <div id="import-text-area" class="remember-import-textarea" style="display:none;">
                    <textarea id="import-paste-text" placeholder="Paste highlights — one per line…" rows="8"></textarea>
                    <div class="remember-import-source-row">
                        <label>Source:</label>
                        <input id="import-source-name" type="text" placeholder="Book / Article title" value="${escHtml(this.sourceName)}" />
                    </div>
                    <button id="import-parse-text-btn" class="btn-primary btn-sm">Parse</button>
                </div>

                <div id="import-preview" class="remember-import-preview" style="display:none;">
                    <div class="import-preview-header">
                        <span id="import-preview-count"></span>
                        <div class="import-preview-actions">
                            <button id="import-select-all" class="btn-sm">Select All</button>
                            <button id="import-select-none" class="btn-sm">Select None</button>
                        </div>
                    </div>
                    <div id="import-preview-list" class="import-preview-list"></div>
                    <button id="import-execute-btn" class="btn-primary">Import Cards</button>
                </div>

                <div id="import-result" class="remember-import-result" style="display:none;"></div>
            </div>
        `;

        this._bindEvents();
        this._updateVisibility();
    }

    _bindEvents() {
        const formatSel = this.panelEl.querySelector('#import-format-select');
        formatSel?.addEventListener('change', (e) => {
            this.selectedFormat = e.target.value;
            this.pendingEntries = [];
            this._updateVisibility();
        });

        this.panelEl.querySelector('#import-file-btn')?.addEventListener('click', () => this._pickFile());

        const dropzone = this.panelEl.querySelector('#import-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); this._handleDrop(e); });
        }

        this.panelEl.querySelector('#import-parse-text-btn')?.addEventListener('click', () => this._parseTextArea());

        this.panelEl.querySelector('#import-source-name')?.addEventListener('input', (e) => {
            this.sourceName = e.target.value;
        });

        this.panelEl.querySelector('#import-select-all')?.addEventListener('click', () => this._toggleAll(true));
        this.panelEl.querySelector('#import-select-none')?.addEventListener('click', () => this._toggleAll(false));

        this.panelEl.querySelector('#import-execute-btn')?.addEventListener('click', () => this._executeImport());
    }

    _updateVisibility() {
        const dropzone = this.panelEl.querySelector('#import-dropzone');
        const textArea = this.panelEl.querySelector('#import-text-area');
        const preview = this.panelEl.querySelector('#import-preview');

        if (this.selectedFormat === 'text') {
            dropzone.style.display = 'none';
            textArea.style.display = '';
        } else {
            dropzone.style.display = '';
            textArea.style.display = 'none';
        }

        if (this.pendingEntries.length > 0) {
            preview.style.display = '';
            this._renderPreview();
        } else {
            preview.style.display = 'none';
        }
    }

    // ── File Handling ───────────────────────────────────────────

    async _pickFile() {
        try {
            let dialog;
            try {
                dialog = window.__TAURI__.dialog;
            } catch (_) {
                dialog = await import('@tauri-apps/plugin-dialog');
            }

            const filters = this.selectedFormat === 'kindle'
                ? [{ name: 'Text', extensions: ['txt'] }]
                : this.selectedFormat === 'readwise'
                    ? [{ name: 'CSV', extensions: ['csv'] }]
                    : [{ name: 'Markdown', extensions: ['md', 'txt'] }];

            const selected = await dialog.open({ filters, multiple: false });
            if (!selected) return;

            const filePath = typeof selected === 'string' ? selected : selected.path;
            if (!filePath) return;

            await this._readAndParse(filePath);
        } catch (err) {
            console.error('[RememberImport] File pick failed:', err);
            this._showResult(`❌ Failed to open file: ${err.message || err}`, true);
        }
    }

    async _handleDrop(e) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            const text = await file.text();
            await this._parseContent(text, file.name);
            return;
        }
    }

    async _readAndParse(filePath) {
        try {
            let content;
            try {
                content = await invoke('read_file_text', { path: filePath });
            } catch (_) {
                try {
                    const fs = window.__TAURI__.fs || await import('@tauri-apps/plugin-fs');
                    const bytes = await fs.readFile(filePath);
                    content = new TextDecoder().decode(bytes);
                } catch (e2) {
                    content = await invoke('read_note', { path: filePath });
                }
            }

            const filename = filePath.split(/[/\\]/).pop() || 'import';
            await this._parseContent(content, filename);
        } catch (err) {
            console.error('[RememberImport] Read failed:', err);
            this._showResult(`❌ Failed to read file: ${err.message || err}`, true);
        }
    }

    async _parseContent(text, filename) {
        try {
            // Parse via Rust backend
            const entries = await invoke('remember_import_parse', {
                content: text,
                format: this.selectedFormat,
                filename,
            });

            this.pendingEntries = entries.map((e, i) => ({ ...e, selected: true, id: i }));
            this._updateVisibility();

            if (entries.length === 0) {
                this._showResult('⚠️ No highlights found in this file.', true);
            }
        } catch (err) {
            console.error('[RememberImport] Parse failed:', err);
            this._showResult(`❌ Parse failed: ${err.message || err}`, true);
        }
    }

    async _parseTextArea() {
        const textarea = this.panelEl.querySelector('#import-paste-text');
        const text = textarea?.value || '';
        if (!text.trim()) return;

        await this._parseContent(text, this.sourceName || 'Imported Notes');
    }

    // ── Preview ─────────────────────────────────────────────────

    _renderPreview() {
        const list = this.panelEl.querySelector('#import-preview-list');
        const countEl = this.panelEl.querySelector('#import-preview-count');
        if (!list) return;

        const selected = this.pendingEntries.filter(e => e.selected).length;
        const total = this.pendingEntries.length;
        countEl.textContent = `${selected} / ${total} highlights selected`;

        const groups = {};
        for (const entry of this.pendingEntries) {
            const key = entry.title || 'Unknown Source';
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry);
        }

        let html = '';
        for (const [source, items] of Object.entries(groups)) {
            html += `<div class="import-group">
                <div class="import-group-title">📖 ${escHtml(source)}${items[0]?.author ? ` — ${escHtml(items[0].author)}` : ''}</div>`;
            for (const item of items) {
                const preview = item.highlight.length > 150 ? item.highlight.slice(0, 150) + '…' : item.highlight;
                html += `<label class="import-item ${item.selected ? 'selected' : ''}">
                    <input type="checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''} />
                    <span class="import-item-text">${escHtml(preview)}</span>
                    ${item.location ? `<span class="import-item-loc">${escHtml(item.location)}</span>` : ''}
                </label>`;
            }
            html += '</div>';
        }

        list.innerHTML = html;

        const btn = this.panelEl.querySelector('#import-execute-btn');
        if (btn) btn.textContent = `Import ${selected} Card${selected !== 1 ? 's' : ''}`;

        list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const entry = this.pendingEntries.find(en => en.id === id);
                if (entry) {
                    entry.selected = e.target.checked;
                    e.target.closest('.import-item')?.classList.toggle('selected', entry.selected);
                }
                this._updateCounts();
            });
        });
    }

    _updateCounts() {
        const selected = this.pendingEntries.filter(e => e.selected).length;
        const total = this.pendingEntries.length;
        const countEl = this.panelEl.querySelector('#import-preview-count');
        if (countEl) countEl.textContent = `${selected} / ${total} highlights selected`;
        const btn = this.panelEl.querySelector('#import-execute-btn');
        if (btn) btn.textContent = `Import ${selected} Card${selected !== 1 ? 's' : ''}`;
    }

    _toggleAll(state) {
        this.pendingEntries.forEach(e => e.selected = state);
        this._renderPreview();
    }

    // ── Execute Import (via Rust) ───────────────────────────────

    async _executeImport() {
        const toImport = this.pendingEntries.filter(e => e.selected);
        if (toImport.length === 0) return;

        const btn = this.panelEl.querySelector('#import-execute-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

        try {
            const result = await invoke('remember_import_execute', {
                entries: toImport.map(e => ({
                    title: e.title,
                    author: e.author || '',
                    highlight: e.highlight,
                    note: e.note || '',
                    location: e.location || '',
                    date: e.date || '',
                })),
                defaultSource: this.sourceName || null,
            });

            this._showResult(
                `✅ Imported ${result.cards_created} card${result.cards_created !== 1 ? 's' : ''} from ${result.sources_created} new source${result.sources_created !== 1 ? 's' : ''}.`,
                false
            );
            this.pendingEntries = [];
            const preview = this.panelEl.querySelector('#import-preview');
            if (preview) preview.style.display = 'none';

        } catch (err) {
            console.error('[RememberImport] Import failed:', err);
            this._showResult(`❌ Import failed: ${err.message || err}`, true);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Import Cards'; }
        }
    }

    // ── Result Message ──────────────────────────────────────────

    _showResult(message, isError) {
        const el = this.panelEl.querySelector('#import-result');
        if (!el) return;
        el.style.display = '';
        el.className = `remember-import-result ${isError ? 'error' : 'success'}`;
        el.textContent = message;
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

export function safeInitModule(app) {
    try {
        return new RememberImport(app);
    } catch (err) {
        console.error('[Oxidian] Failed to initialize RememberImport:', err);
        return null;
    }
}
