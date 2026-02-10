// Oxidian — Remember Import: Import external highlights from Kindle, Readwise, Markdown, Plain Text
// Uses Tauri dialog + fs APIs for file picking and reading.

const { invoke } = window.__TAURI__.core;

const CARDS_FOLDER = 'Cards';
const SOURCES_FOLDER = 'Sources';

// ── Helpers ────────────────────────────────────────────────────────────

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSourceMarkdown({ title, author, type, status }) {
    return `---
type: source
title: "${title}"
author: "${author || 'Unknown'}"
source_type: ${type || 'book'}
status: ${status || 'finished'}
started: ${todayISO()}
finished: ${todayISO()}
rating: 0
---
# ${title}

${author ? `**Author:** ${author}\n` : ''}
## Highlights

_Imported on ${todayISO()}_
`.trimEnd() + '\n';
}

function buildCardMarkdown({ front, back, source, tags }) {
    const tagsYaml = Array.isArray(tags) && tags.length ? `[${tags.join(', ')}]` : '[]';
    const srcYaml = source ? `"[[${source}]]"` : '""';
    return `---
type: card
source: ${srcYaml}
tags: ${tagsYaml}
interval: 1
ease: 2.5
next_review: ${tomorrowISO()}
last_review: null
review_count: 0
created: ${todayISO()}
---
# ${front}

${back}
`.trimEnd() + '\n';
}

// ── Parsers ────────────────────────────────────────────────────────────

/** Parse Kindle "My Clippings.txt" format */
function parseKindleClippings(text) {
    const entries = [];
    // Kindle clippings are separated by "=========="
    const blocks = text.split('==========').map(b => b.trim()).filter(Boolean);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) continue;

        // Line 1: Title (Author)
        const titleLine = lines[0];
        let title = titleLine;
        let author = '';
        const authorMatch = titleLine.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (authorMatch) {
            title = authorMatch[1].trim();
            author = authorMatch[2].trim();
        }

        // Line 2: metadata — "- Your Highlight on Location 123-125 | Added on ..."
        const metaLine = lines[1];
        let location = '';
        let date = '';
        const locMatch = metaLine.match(/Location\s+([\d-]+)/i);
        if (locMatch) location = locMatch[1];
        const pageMatch = metaLine.match(/page\s+(\d+)/i);
        if (!location && pageMatch) location = `p.${pageMatch[1]}`;
        const dateMatch = metaLine.match(/Added on\s+(.+)$/i);
        if (dateMatch) date = dateMatch[1].trim();

        // Skip bookmarks (no highlight text)
        if (metaLine.match(/Your Bookmark/i)) continue;
        // Skip notes-only for now (no highlight text body)
        const isNote = !!metaLine.match(/Your Note/i);

        // Lines 3+: the highlight text
        const highlight = lines.slice(2).join('\n').trim();
        if (!highlight) continue;

        entries.push({ title, author, highlight, location, date, isNote });
    }

    return entries;
}

/** Parse Readwise CSV export */
function parseReadwiseCSV(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    // Parse header
    const header = parseCSVLine(lines[0]);
    const colMap = {};
    header.forEach((h, i) => { colMap[h.trim().toLowerCase()] = i; });

    const titleIdx = colMap['title'] ?? colMap['book title'] ?? -1;
    const authorIdx = colMap['author'] ?? colMap['book author'] ?? -1;
    const highlightIdx = colMap['highlight'] ?? colMap['text'] ?? -1;
    const noteIdx = colMap['note'] ?? -1;
    const locationIdx = colMap['location'] ?? -1;
    const dateIdx = colMap['date'] ?? colMap['highlighted at'] ?? -1;

    if (highlightIdx === -1) return [];

    const entries = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        const highlight = (cols[highlightIdx] || '').trim();
        if (!highlight) continue;

        entries.push({
            title: (cols[titleIdx] || 'Unknown Source').trim(),
            author: (cols[authorIdx] || '').trim(),
            highlight,
            note: (cols[noteIdx] || '').trim(),
            location: (cols[locationIdx] || '').trim(),
            date: (cols[dateIdx] || '').trim(),
        });
    }
    return entries;
}

/** Simple CSV line parser (handles quoted fields) */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

/** Parse Markdown file — extract blockquotes as highlight candidates */
function parseMarkdownHighlights(text, filename) {
    const title = filename.replace(/\.md$/i, '');
    const entries = [];

    const lines = text.split('\n');
    let currentQuote = [];

    for (const line of lines) {
        if (line.trimStart().startsWith('>')) {
            currentQuote.push(line.trimStart().replace(/^>\s?/, ''));
        } else {
            if (currentQuote.length > 0) {
                const highlight = currentQuote.join('\n').trim();
                if (highlight) {
                    entries.push({ title, author: '', highlight, location: '', date: '' });
                }
                currentQuote = [];
            }
        }
    }
    // Flush last quote
    if (currentQuote.length > 0) {
        const highlight = currentQuote.join('\n').trim();
        if (highlight) {
            entries.push({ title, author: '', highlight, location: '', date: '' });
        }
    }

    return entries;
}

/** Parse plain text — one highlight per line */
function parsePlainText(text) {
    return text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(highlight => ({
            title: '',
            author: '',
            highlight,
            location: '',
            date: '',
        }));
}

// ── Import Manager ─────────────────────────────────────────────────────

export class RememberImport {
    constructor(app) {
        this.app = app;
        this.panelEl = null;
        this.pendingEntries = [];
        this.selectedFormat = 'kindle';
        this.sourceName = '';
    }

    // ── Public API ──────────────────────────────────────────────

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

        // File picker button
        this.panelEl.querySelector('#import-file-btn')?.addEventListener('click', () => this._pickFile());

        // Drag & drop
        const dropzone = this.panelEl.querySelector('#import-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); this._handleDrop(e); });
        }

        // Plain text parse
        this.panelEl.querySelector('#import-parse-text-btn')?.addEventListener('click', () => this._parseTextArea());

        // Source name
        this.panelEl.querySelector('#import-source-name')?.addEventListener('input', (e) => {
            this.sourceName = e.target.value;
        });

        // Select all / none
        this.panelEl.querySelector('#import-select-all')?.addEventListener('click', () => this._toggleAll(true));
        this.panelEl.querySelector('#import-select-none')?.addEventListener('click', () => this._toggleAll(false));

        // Execute import
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
            // Use Tauri dialog API
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
        // Try to get file from drop event
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            const text = await file.text();
            this._parseContent(text, file.name);
            return;
        }
    }

    async _readAndParse(filePath) {
        try {
            // Use Tauri fs to read file
            let content;
            try {
                // Try invoke-based read
                content = await invoke('read_file_text', { path: filePath });
            } catch (_) {
                // Fallback: try plugin-fs
                try {
                    const fs = window.__TAURI__.fs || await import('@tauri-apps/plugin-fs');
                    const bytes = await fs.readFile(filePath);
                    content = new TextDecoder().decode(bytes);
                } catch (e2) {
                    // Last resort: read_note with full path
                    content = await invoke('read_note', { path: filePath });
                }
            }

            const filename = filePath.split(/[/\\]/).pop() || 'import';
            this._parseContent(content, filename);
        } catch (err) {
            console.error('[RememberImport] Read failed:', err);
            this._showResult(`❌ Failed to read file: ${err.message || err}`, true);
        }
    }

    _parseContent(text, filename) {
        let entries = [];

        switch (this.selectedFormat) {
            case 'kindle':
                entries = parseKindleClippings(text);
                break;
            case 'readwise':
                entries = parseReadwiseCSV(text);
                break;
            case 'markdown':
                entries = parseMarkdownHighlights(text, filename);
                break;
            case 'text':
                entries = parsePlainText(text);
                break;
        }

        // Mark all as selected by default
        this.pendingEntries = entries.map((e, i) => ({ ...e, selected: true, id: i }));
        this._updateVisibility();

        if (entries.length === 0) {
            this._showResult('⚠️ No highlights found in this file.', true);
        }
    }

    _parseTextArea() {
        const textarea = this.panelEl.querySelector('#import-paste-text');
        const text = textarea?.value || '';
        if (!text.trim()) return;

        const sourceName = this.sourceName || 'Imported Notes';
        let entries = parsePlainText(text);
        entries = entries.map(e => ({ ...e, title: sourceName }));
        this.pendingEntries = entries.map((e, i) => ({ ...e, selected: true, id: i }));
        this._updateVisibility();
    }

    // ── Preview ─────────────────────────────────────────────────

    _renderPreview() {
        const list = this.panelEl.querySelector('#import-preview-list');
        const countEl = this.panelEl.querySelector('#import-preview-count');
        if (!list) return;

        const selected = this.pendingEntries.filter(e => e.selected).length;
        const total = this.pendingEntries.length;
        countEl.textContent = `${selected} / ${total} highlights selected`;

        // Group by source title
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

        // Update import button
        const btn = this.panelEl.querySelector('#import-execute-btn');
        if (btn) btn.textContent = `Import ${selected} Card${selected !== 1 ? 's' : ''}`;

        // Bind checkboxes
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

    // ── Execute Import ──────────────────────────────────────────

    async _executeImport() {
        const toImport = this.pendingEntries.filter(e => e.selected);
        if (toImport.length === 0) return;

        const btn = this.panelEl.querySelector('#import-execute-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

        try {
            // Group by source
            const groups = {};
            for (const entry of toImport) {
                const key = entry.title || 'Imported Notes';
                if (!groups[key]) groups[key] = { author: entry.author || '', entries: [] };
                groups[key].entries.push(entry);
            }

            let cardsCreated = 0;
            let sourcesCreated = 0;

            for (const [title, group] of Object.entries(groups)) {
                // Ensure source file exists
                const sourceSlug = slugify(title) || 'imported';
                const sourcePath = `${SOURCES_FOLDER}/${sourceSlug}.md`;

                try {
                    await invoke('read_note', { path: sourcePath });
                } catch (_) {
                    // Source doesn't exist — create it
                    const sourceMd = buildSourceMarkdown({ title, author: group.author, type: 'book', status: 'finished' });
                    await invoke('write_note', { path: sourcePath, content: sourceMd });
                    sourcesCreated++;
                }

                // Create card for each highlight
                for (const entry of group.entries) {
                    const front = entry.highlight.length > 80
                        ? entry.highlight.slice(0, 80) + '…'
                        : entry.highlight;
                    const back = entry.highlight +
                        (entry.note ? `\n\n_Note: ${entry.note}_` : '') +
                        (entry.location ? `\n\n_Location: ${entry.location}_` : '');

                    const cardSlug = slugify(front) || `card-${Date.now()}-${cardsCreated}`;
                    const cardPath = `${CARDS_FOLDER}/${cardSlug}.md`;

                    const cardMd = buildCardMarkdown({
                        front,
                        back,
                        source: sourceSlug,
                        tags: ['imported'],
                    });

                    try {
                        await invoke('write_note', { path: cardPath, content: cardMd });
                        cardsCreated++;
                    } catch (err) {
                        // Try with timestamp suffix to avoid conflicts
                        const fallbackPath = `${CARDS_FOLDER}/${cardSlug}-${Date.now()}.md`;
                        await invoke('write_note', { path: fallbackPath, content: cardMd });
                        cardsCreated++;
                    }
                }
            }

            this._showResult(`✅ Imported ${cardsCreated} card${cardsCreated !== 1 ? 's' : ''} from ${sourcesCreated + Object.keys(groups).length - sourcesCreated} source${Object.keys(groups).length !== 1 ? 's' : ''}.`, false);
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

// ── Safe Init Wrapper ──────────────────────────────────────────────────

export function safeInitModule(app) {
    try {
        return new RememberImport(app);
    } catch (err) {
        console.error('[Oxidian] Failed to initialize RememberImport:', err);
        return null;
    }
}
