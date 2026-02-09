// Oxidian — Editor Component
const { invoke } = window.__TAURI__.core;

export class Editor {
    constructor(app) {
        this.app = app;
        this.textarea = null;
        this.previewEl = null;
        this.renderTimeout = null;
        this.previewVisible = true;
        this.currentPath = null;
    }

    attach(textarea, previewEl) {
        this.textarea = textarea;
        this.previewEl = previewEl;
        this.bindEvents();
    }

    bindEvents() {
        if (!this.textarea) return;

        this.textarea.addEventListener('input', () => {
            this.app.markDirty();
            this.scheduleRender();
            this.updateStats();
            // Notify slash menu
            this.app.slashMenu?.onInput(this.textarea);
        });

        this.textarea.addEventListener('click', () => this.updateCursor());
        this.textarea.addEventListener('keyup', () => this.updateCursor());

        this.textarea.addEventListener('keydown', (e) => this.handleEditorKeys(e));

        this.textarea.addEventListener('blur', () => {
            if (this.app.isDirty) {
                this.app.saveCurrentFile();
            }
        });

        this.textarea.addEventListener('scroll', () => this.syncScroll());

        this.textarea.addEventListener('contextmenu', (e) => {
            this.app.contextMenu.showEditorMenu(e, this.textarea);
        });
    }

    setContent(content) {
        if (!this.textarea) return;
        this.textarea.value = content;
        this.renderPreview();
        this.updateStats();
        this.updateCursor();
        this.textarea.focus();
        this.textarea.scrollTop = 0;
    }

    getContent() {
        return this.textarea ? this.textarea.value : '';
    }

    scheduleRender() {
        clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => this.renderPreview(), 200);
    }

    async renderPreview() {
        if (!this.textarea || !this.previewEl) return;
        const content = this.textarea.value;
        if (!content.trim()) {
            this.previewEl.innerHTML = '<p style="color: var(--text-faint)">Preview will appear here...</p>';
            return;
        }
        try {
            const html = await invoke('render_markdown', { content });
            this.previewEl.innerHTML = html;
        } catch (err) {
            console.error('Render failed:', err);
        }
    }

    togglePreview() {
        if (!this.textarea) return;
        const previewPane = this.previewEl?.closest('.preview-pane-half');
        if (!previewPane) return;

        this.previewVisible = !this.previewVisible;
        previewPane.style.display = this.previewVisible ? '' : 'none';
    }

    updateStats() {
        if (!this.textarea) return;
        const content = this.textarea.value;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;

        const wc = document.getElementById('status-word-count');
        const cc = document.getElementById('status-char-count');
        if (wc) wc.textContent = `${words} words`;
        if (cc) cc.textContent = `${chars} characters`;
    }

    updateCursor() {
        if (!this.textarea) return;
        const text = this.textarea.value;
        const pos = this.textarea.selectionStart;
        const lines = text.substring(0, pos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;

        const el = document.getElementById('status-cursor');
        if (el) el.textContent = `Ln ${line}, Col ${col}`;
    }

    syncScroll() {
        if (!this.previewVisible || !this.textarea || !this.previewEl) return;
        const previewPane = this.previewEl.closest('.preview-pane-half');
        if (!previewPane) return;

        const ratio = this.textarea.scrollTop /
            (this.textarea.scrollHeight - this.textarea.clientHeight || 1);
        previewPane.scrollTop = ratio *
            (previewPane.scrollHeight - previewPane.clientHeight);
    }

    handleEditorKeys(e) {
        // Let slash menu handle keys first
        if (this.app.slashMenu?.handleKeyDown(e)) return;

        const ctrl = e.ctrlKey || e.metaKey;

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const value = this.textarea.value;

            if (e.shiftKey) {
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const line = value.substring(lineStart, end);
                if (line.startsWith('\t') || line.startsWith('    ')) {
                    const removed = line.startsWith('\t') ? 1 : Math.min(4, line.search(/\S/));
                    this.textarea.value = value.substring(0, lineStart) + line.substring(removed) + value.substring(end);
                    this.textarea.selectionStart = start - removed;
                    this.textarea.selectionEnd = start - removed;
                }
            } else {
                this.textarea.value = value.substring(0, start) + '\t' + value.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
            }
            this.app.markDirty();
            this.scheduleRender();
            return;
        }

        if (ctrl && e.key === 'b') { e.preventDefault(); this.wrapSelection('**', '**'); return; }
        if (ctrl && e.key === 'i') { e.preventDefault(); this.wrapSelection('*', '*'); return; }
        if (ctrl && e.shiftKey && e.key === 'X') { e.preventDefault(); this.wrapSelection('~~', '~~'); return; }
        if (ctrl && e.key === '`') { e.preventDefault(); this.wrapSelection('`', '`'); return; }
        if (ctrl && e.shiftKey && e.key === 'K') { e.preventDefault(); this.wrapSelection('```\n', '\n```'); return; }
        if (ctrl && !e.shiftKey && e.key === 'k') { e.preventDefault(); this.insertLink(); return; }
        if (ctrl && e.key === 'h') { e.preventDefault(); this.cycleHeading(); return; }

        // Enter: auto-continue lists
        if (e.key === 'Enter' && !ctrl && !e.shiftKey) {
            const pos = this.textarea.selectionStart;
            const lines = this.textarea.value.substring(0, pos).split('\n');
            const currentLine = lines[lines.length - 1];

            const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s/);
            const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
            const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);

            let continuation = null;

            if (checkboxMatch) {
                if (currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = this.textarea.value.substring(0, lineStart) + '\n' + this.textarea.value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); return;
                }
                continuation = `${checkboxMatch[1]}${checkboxMatch[2]} [ ] `;
            } else if (bulletMatch) {
                if (currentLine.match(/^(\s*)([-*+])\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = this.textarea.value.substring(0, lineStart) + '\n' + this.textarea.value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); return;
                }
                continuation = `${bulletMatch[1]}${bulletMatch[2]} `;
            } else if (numberedMatch) {
                if (currentLine.match(/^(\s*)(\d+)\.\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = this.textarea.value.substring(0, lineStart) + '\n' + this.textarea.value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); return;
                }
                const nextNum = parseInt(numberedMatch[2]) + 1;
                continuation = `${numberedMatch[1]}${nextNum}. `;
            }

            if (continuation) {
                e.preventDefault();
                const value = this.textarea.value;
                this.textarea.value = value.substring(0, pos) + '\n' + continuation + value.substring(pos);
                const newPos = pos + 1 + continuation.length;
                this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
                this.app.markDirty();
                this.scheduleRender();
            }
        }
    }

    cycleHeading() {
        const pos = this.textarea.selectionStart;
        const value = this.textarea.value;
        const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
        const lineEnd = value.indexOf('\n', pos);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);

        const headingMatch = line.match(/^(#{1,6})\s/);
        let newLine;
        if (!headingMatch) {
            newLine = '# ' + line;
        } else if (headingMatch[1].length >= 6) {
            newLine = line.replace(/^#{1,6}\s/, '');
        } else {
            newLine = '#' + line;
        }

        const end = lineEnd === -1 ? value.length : lineEnd;
        this.textarea.value = value.substring(0, lineStart) + newLine + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + newLine.length;
        this.app.markDirty();
        this.scheduleRender();
    }

    insertLink() {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);

        if (selected) {
            // Wrap selected text as link text
            const replacement = `[${selected}](url)`;
            this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
            // Select "url" for easy replacement
            this.textarea.selectionStart = start + selected.length + 3;
            this.textarea.selectionEnd = start + selected.length + 6;
        } else {
            const replacement = '[text](url)';
            this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
            // Select "text" for easy replacement
            this.textarea.selectionStart = start + 1;
            this.textarea.selectionEnd = start + 5;
        }

        this.textarea.focus();
        this.app.markDirty();
        this.scheduleRender();
    }

    wrapSelection(before, after) {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);

        const replacement = before + (selected || 'text') + after;
        this.textarea.value = value.substring(0, start) + replacement + value.substring(end);

        if (selected) {
            this.textarea.selectionStart = start;
            this.textarea.selectionEnd = start + replacement.length;
        } else {
            this.textarea.selectionStart = start + before.length;
            this.textarea.selectionEnd = start + before.length + 4;
        }

        this.textarea.focus();
        this.app.markDirty();
        this.scheduleRender();
    }
}
