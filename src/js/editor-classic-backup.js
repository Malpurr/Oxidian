// Oxidian — Editor Component (Enhanced Classic Editor)
import { invoke } from './tauri-bridge.js';

export class Editor {
    constructor(app) {
        this.app = app;
        this.textarea = null;
        this.previewEl = null;
        this.highlightEl = null;
        this.lineNumberEl = null;
        this.renderTimeout = null;
        this.previewVisible = true;
        this.currentPath = null;
        this.showLineNumbers = localStorage.getItem('oxidian-line-numbers') === 'true';
        // HyperMark integration
        this._hypermark = null;
        // Auto-close pairs
        this._autoPairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            '`': '`',
        };
        // Matching bracket highlight state
        this._bracketHighlightTimer = null;
    }

    attach(textarea, previewEl) {
        this._hypermark = null;
        this.textarea = textarea;
        this.previewEl = previewEl;
        this._setupHighlightOverlay();
        this._setupLineNumbers();
        this.bindEvents();
    }

    /** Attach a HyperMarkEditor instance instead of a textarea */
    attachHyperMark(hypermark, previewEl) {
        this.textarea = null;
        this.highlightEl = null;
        this.lineNumberEl = null;
        this._hypermark = hypermark;
        this.previewEl = previewEl;
    }

    /** Create a highlight underlay behind the textarea for syntax coloring */
    _setupHighlightOverlay() {
        // DISABLED — overlay causes garbled double-text rendering.
        // Will be replaced by CodeMirror 6 integration.
        return;
    }

    /** Setup line numbers gutter */
    _setupLineNumbers() {
        if (!this.textarea || !this.showLineNumbers) return;
        const parent = this.textarea.parentElement;
        if (!parent) return;

        const gutter = document.createElement('div');
        gutter.className = 'editor-line-numbers';
        parent.insertBefore(gutter, parent.firstChild);
        this.lineNumberEl = gutter;

        // Add padding to textarea/highlight for gutter
        this.textarea.classList.add('editor-with-line-numbers');
        if (this.highlightEl) this.highlightEl.classList.add('editor-with-line-numbers');

        this._syncLineNumbers();
    }

    /** Toggle line numbers on/off */
    toggleLineNumbers(show) {
        this.showLineNumbers = show;
        if (!this.textarea) return;

        if (show && !this.lineNumberEl) {
            this._setupLineNumbers();
        } else if (!show && this.lineNumberEl) {
            this.lineNumberEl.remove();
            this.lineNumberEl = null;
            this.textarea.classList.remove('editor-with-line-numbers');
            if (this.highlightEl) this.highlightEl.classList.remove('editor-with-line-numbers');
        }
    }

    /** Sync line numbers with textarea content */
    _syncLineNumbers() {
        if (!this.lineNumberEl || !this.textarea) return;
        const lineCount = this.textarea.value.split('\n').length;
        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            html += `<div class="line-number">${i}</div>`;
        }
        this.lineNumberEl.innerHTML = html;
        this.lineNumberEl.scrollTop = this.textarea.scrollTop;
    }

    /** Sync the highlight overlay with textarea content */
    _syncHighlight() {
        if (!this.highlightEl || !this.textarea) return;
        const text = this.textarea.value;
        this.highlightEl.innerHTML = this._highlightSyntax(text) + '\n';
        this.highlightEl.scrollTop = this.textarea.scrollTop;
        this.highlightEl.scrollLeft = this.textarea.scrollLeft;
    }

    /** Apply syntax highlighting to markdown text */
    _highlightSyntax(text) {
        // Escape HTML first
        const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Highlight fenced code blocks
        let result = esc.replace(/(^```(\w*)\n)([\s\S]*?)(^```$)/gm, (match, open, lang, code, close) => {
            const langLabel = lang ? `<span class="hl-code-lang">${lang}</span>` : '';
            return `<span class="hl-code-fence">${open.replace(lang, langLabel)}${this._highlightCode(code)}${close}</span>`;
        });

        // Highlight inline code (but not inside fenced blocks — simplified)
        result = result.replace(/(?<!`)`([^`\n]+)`(?!`)/g, '<span class="hl-inline-code">`$1`</span>');

        // Highlight headings
        result = result.replace(/^(#{1,6}\s.*)$/gm, (match) => {
            const level = match.match(/^(#{1,6})/)[1].length;
            return `<span class="hl-heading hl-heading-${level}">${match}</span>`;
        });

        // Highlight bold
        result = result.replace(/(\*\*[^*]+\*\*)/g, '<span class="hl-bold">$1</span>');

        // Highlight italic (single *)
        result = result.replace(/(?<!\*)(\*[^*\n]+\*)(?!\*)/g, '<span class="hl-italic">$1</span>');

        // Highlight wiki-links
        result = result.replace(/(\[\[[^\]]+\]\])/g, '<span class="hl-wikilink">$1</span>');

        // Highlight tags
        result = result.replace(/((?:^|\s)#[a-zA-Z][\w/-]*)/g, '<span class="hl-tag">$1</span>');

        // Highlight blockquotes
        result = result.replace(/^(&gt;\s?.*)$/gm, '<span class="hl-blockquote">$1</span>');

        // Highlight horizontal rules
        result = result.replace(/^([-*_]{3,})$/gm, '<span class="hl-hr">$1</span>');

        // Highlight list markers
        result = result.replace(/^(\s*)([-*+]|\d+\.)\s/gm, '$1<span class="hl-list-marker">$2</span> ');

        return result;
    }

    /** Basic syntax highlighting within code blocks */
    _highlightCode(code) {
        // Keywords
        let result = code.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|true|false|null|undefined|fn|pub|use|mod|struct|impl|enum|match|self|mut|loop|break|continue|type|interface|extends|def|print|lambda|yield|with|as|in|not|and|or|is)\b/g,
            '<span class="hl-keyword">$1</span>');

        // Strings
        result = result.replace(/(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g, '<span class="hl-string">$1</span>');

        // Comments (// and #)
        result = result.replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>');
        result = result.replace(/(#.*$)/gm, '<span class="hl-comment">$1</span>');

        // Numbers
        result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');

        return result;
    }

    bindEvents() {
        if (!this.textarea) return;

        this.textarea.addEventListener('input', () => {
            this.app.markDirty();
            this.scheduleRender();
            this.updateStats();
            this._syncHighlight();
            this._syncLineNumbers();
            // Notify slash menu
            this.app.slashMenu?.onInput(this.textarea);
        });

        this.textarea.addEventListener('click', () => {
            this.updateCursor();
            this._highlightMatchingBracket();
        });
        this.textarea.addEventListener('keyup', (e) => {
            // Don't update on modifier-only keys
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                this.updateCursor();
                this._highlightMatchingBracket();
            }
        });

        this.textarea.addEventListener('keydown', (e) => this.handleEditorKeys(e));

        this.textarea.addEventListener('blur', () => {
            if (this.app.isDirty) {
                this.app.saveCurrentFile();
            }
        });

        this.textarea.addEventListener('scroll', () => {
            this.syncScroll();
            if (this.highlightEl) {
                this.highlightEl.scrollTop = this.textarea.scrollTop;
                this.highlightEl.scrollLeft = this.textarea.scrollLeft;
            }
            if (this.lineNumberEl) {
                this.lineNumberEl.scrollTop = this.textarea.scrollTop;
            }
        });

        this.textarea.addEventListener('contextmenu', (e) => {
            this.app.contextMenu.showEditorMenu(e, this.textarea);
        });
    }

    setContent(content) {
        if (this._hypermark) {
            this._hypermark.setContent(content);
            this.renderPreview();
            this.updateStatsFromContent(content);
            return;
        }
        if (!this.textarea) return;
        this.textarea.value = content;
        this.renderPreview();
        this.updateStats();
        this.updateCursor();
        this._syncHighlight();
        this._syncLineNumbers();
        this.textarea.focus();
        this.textarea.scrollTop = 0;
    }

    getContent() {
        if (this._hypermark) return this._hypermark.getContent();
        return this.textarea ? this.textarea.value : '';
    }

    /** Update word/char stats from a content string (used by HyperMark path) */
    updateStatsFromContent(content) {
        if (!content) content = '';
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        const readingTime = Math.max(1, Math.ceil(words / 238));

        const wc = document.getElementById('status-word-count');
        const cc = document.getElementById('status-char-count');
        const rt = document.getElementById('status-reading-time');
        if (wc) wc.textContent = `${words} words`;
        if (cc) cc.textContent = `${chars} characters`;
        if (rt) rt.textContent = `${readingTime} min read`;

        this.app.updateOutline?.(content);
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
        const readingTime = Math.max(1, Math.ceil(words / 238));

        const wc = document.getElementById('status-word-count');
        const cc = document.getElementById('status-char-count');
        const rt = document.getElementById('status-reading-time');
        if (wc) wc.textContent = `${words} words`;
        if (cc) cc.textContent = `${chars} characters`;
        if (rt) rt.textContent = `${readingTime} min read`;

        // Update outline panel if visible
        this.app.updateOutline?.(content);
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

    /** Highlight matching bracket at cursor */
    _highlightMatchingBracket() {
        // Remove previous highlights
        document.querySelectorAll('.bracket-highlight').forEach(el => el.remove());
        if (!this.textarea) return;

        const pos = this.textarea.selectionStart;
        const text = this.textarea.value;
        const char = text[pos] || '';
        const charBefore = pos > 0 ? text[pos - 1] : '';

        const openBrackets = '([{';
        const closeBrackets = ')]}';
        const allBrackets = openBrackets + closeBrackets;

        let bracketPos = -1;
        let bracketChar = '';

        if (allBrackets.includes(char)) {
            bracketPos = pos;
            bracketChar = char;
        } else if (allBrackets.includes(charBefore)) {
            bracketPos = pos - 1;
            bracketChar = charBefore;
        }

        if (bracketPos === -1) return;

        const isOpen = openBrackets.includes(bracketChar);
        const pairIndex = isOpen ? openBrackets.indexOf(bracketChar) : closeBrackets.indexOf(bracketChar);
        const matchChar = isOpen ? closeBrackets[pairIndex] : openBrackets[pairIndex];

        // Search for matching bracket
        let depth = 0;
        let matchPos = -1;

        if (isOpen) {
            for (let i = bracketPos; i < text.length; i++) {
                if (text[i] === bracketChar) depth++;
                if (text[i] === matchChar) depth--;
                if (depth === 0) { matchPos = i; break; }
            }
        } else {
            for (let i = bracketPos; i >= 0; i--) {
                if (text[i] === bracketChar) depth++;
                if (text[i] === matchChar) depth--;
                if (depth === 0) { matchPos = i; break; }
            }
        }

        if (matchPos === -1) return;

        // Visual indication via status bar (lightweight, no DOM overlay on textarea)
        const el = document.getElementById('status-cursor');
        if (el) {
            const lines = text.substring(0, matchPos).split('\n');
            const matchLine = lines.length;
            const matchCol = lines[lines.length - 1].length + 1;
            el.title = `Matching bracket at Ln ${matchLine}, Col ${matchCol}`;
        }
    }

    handleEditorKeys(e) {
        // Let slash menu handle keys first
        if (this.app.slashMenu?.handleKeyDown(e)) return;

        const ctrl = e.ctrlKey || e.metaKey;

        // Tab key: insert 2 spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const value = this.textarea.value;

            if (e.shiftKey) {
                // Outdent
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const line = value.substring(lineStart, end);
                const spaces = line.match(/^( {1,2}|\t)/);
                if (spaces) {
                    const removed = spaces[0].length;
                    this.textarea.value = value.substring(0, lineStart) + line.substring(removed) + value.substring(end);
                    this.textarea.selectionStart = Math.max(lineStart, start - removed);
                    this.textarea.selectionEnd = Math.max(lineStart, start - removed);
                }
            } else {
                // Insert 2 spaces
                this.textarea.value = value.substring(0, start) + '  ' + value.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
            }
            this.app.markDirty();
            this.scheduleRender();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
        }

        // Ctrl+D: Duplicate line
        if (ctrl && e.key === 'd') {
            // Don't override app-level Ctrl+D (daily note) — use editor-specific check
            // Only duplicate if textarea is focused
            if (document.activeElement !== this.textarea) return;
            e.preventDefault();
            e.stopPropagation();
            const pos = this.textarea.selectionStart;
            const value = this.textarea.value;
            const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
            const lineEnd = value.indexOf('\n', pos);
            const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
            const insertPos = lineEnd === -1 ? value.length : lineEnd;
            this.textarea.value = value.substring(0, insertPos) + '\n' + line + value.substring(insertPos);
            this.textarea.selectionStart = this.textarea.selectionEnd = pos + line.length + 1;
            this.app.markDirty();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
        }

        // Ctrl+/: Toggle HTML comment on line
        if (ctrl && e.key === '/') {
            if (document.activeElement !== this.textarea) return;
            e.preventDefault();
            e.stopPropagation();
            const pos = this.textarea.selectionStart;
            const value = this.textarea.value;
            const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
            const lineEnd = value.indexOf('\n', pos);
            const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
            const end = lineEnd === -1 ? value.length : lineEnd;

            // Check if already commented
            const commentMatch = line.match(/^(\s*)<!--\s?(.*?)\s?-->$/);
            let newLine, newPos;
            if (commentMatch) {
                // Uncomment
                newLine = commentMatch[1] + commentMatch[2];
                newPos = lineStart + Math.min(pos - lineStart, newLine.length);
            } else {
                // Comment
                newLine = '<!-- ' + line + ' -->';
                newPos = pos + 5; // offset for "<!-- "
            }
            this.textarea.value = value.substring(0, lineStart) + newLine + value.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
            this.app.markDirty();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
        }

        if (ctrl && e.key === 'b') { e.preventDefault(); this.wrapSelection('**', '**'); return; }
        if (ctrl && e.key === 'i') { e.preventDefault(); this.wrapSelection('*', '*'); return; }
        if (ctrl && e.shiftKey && e.key === 'X') { e.preventDefault(); this.wrapSelection('~~', '~~'); return; }
        if (ctrl && e.key === '`') { e.preventDefault(); this.wrapSelection('`', '`'); return; }
        if (ctrl && e.shiftKey && e.key === 'K') { e.preventDefault(); this.wrapSelection('```\n', '\n```'); return; }
        if (ctrl && !e.shiftKey && e.key === 'k') { e.preventDefault(); this.insertLink(); return; }
        if (ctrl && e.key === 'h') { e.preventDefault(); this.cycleHeading(); return; }

        // Auto-close brackets/quotes
        if (!ctrl && !e.altKey && this._autoPairs[e.key]) {
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const value = this.textarea.value;
            const closeChar = this._autoPairs[e.key];

            // Special handling for ** (bold)
            if (e.key === '*') {
                // Don't auto-close single *, let it type naturally
                // We handle ** via looking at previous char
            }

            if (start !== end) {
                // Wrap selection
                e.preventDefault();
                const selected = value.substring(start, end);
                this.textarea.value = value.substring(0, start) + e.key + selected + closeChar + value.substring(end);
                this.textarea.selectionStart = start + 1;
                this.textarea.selectionEnd = end + 1;
                this.app.markDirty();
                this._syncHighlight();
                return;
            }

            // For quotes/backticks: skip if next char is the same
            if ((e.key === '"' || e.key === '`') && value[start] === e.key) {
                e.preventDefault();
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                return;
            }

            // For closing brackets: skip if next char matches
            const closingBrackets = ')]}';
            if (closingBrackets.includes(e.key) && value[start] === e.key) {
                e.preventDefault();
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                return;
            }

            // Auto-insert closing char (not for * alone)
            if (e.key !== '*') {
                e.preventDefault();
                this.textarea.value = value.substring(0, start) + e.key + closeChar + value.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                this.app.markDirty();
                this._syncHighlight();
                return;
            }
        }

        // Skip over auto-inserted closing characters
        if (!ctrl && !e.altKey) {
            const closingChars = ')]}';
            if (closingChars.includes(e.key)) {
                const start = this.textarea.selectionStart;
                const value = this.textarea.value;
                if (value[start] === e.key) {
                    e.preventDefault();
                    this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
                    return;
                }
            }
        }

        // Enter: auto-indent + continue lists
        if (e.key === 'Enter' && !ctrl && !e.shiftKey) {
            const pos = this.textarea.selectionStart;
            const value = this.textarea.value;
            const lines = value.substring(0, pos).split('\n');
            const currentLine = lines[lines.length - 1];

            // Get leading whitespace for auto-indent
            const indent = currentLine.match(/^(\s*)/)[1];

            const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s/);
            const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
            const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);

            let continuation = null;

            if (checkboxMatch) {
                if (currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = value.substring(0, lineStart) + '\n' + value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); this._syncHighlight(); this._syncLineNumbers(); return;
                }
                continuation = `${checkboxMatch[1]}${checkboxMatch[2]} [ ] `;
            } else if (bulletMatch) {
                if (currentLine.match(/^(\s*)([-*+])\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = value.substring(0, lineStart) + '\n' + value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); this._syncHighlight(); this._syncLineNumbers(); return;
                }
                continuation = `${bulletMatch[1]}${bulletMatch[2]} `;
            } else if (numberedMatch) {
                if (currentLine.match(/^(\s*)(\d+)\.\s*$/)) {
                    e.preventDefault();
                    const lineStart = pos - currentLine.length;
                    this.textarea.value = value.substring(0, lineStart) + '\n' + value.substring(pos);
                    this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
                    this.app.markDirty(); this.scheduleRender(); this._syncHighlight(); this._syncLineNumbers(); return;
                }
                const nextNum = parseInt(numberedMatch[2]) + 1;
                continuation = `${numberedMatch[1]}${nextNum}. `;
            }

            if (continuation) {
                e.preventDefault();
                this.textarea.value = value.substring(0, pos) + '\n' + continuation + value.substring(pos);
                const newPos = pos + 1 + continuation.length;
                this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
                this.app.markDirty();
                this.scheduleRender();
                this._syncHighlight();
                this._syncLineNumbers();
            } else if (indent) {
                // Auto-indent: preserve leading whitespace
                e.preventDefault();
                this.textarea.value = value.substring(0, pos) + '\n' + indent + value.substring(pos);
                const newPos = pos + 1 + indent.length;
                this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
                this.app.markDirty();
                this.scheduleRender();
                this._syncHighlight();
                this._syncLineNumbers();
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
        this._syncHighlight();
        this._syncLineNumbers();
    }

    insertLink() {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const selected = value.substring(start, end);

        if (selected) {
            const replacement = `[${selected}](url)`;
            this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
            this.textarea.selectionStart = start + selected.length + 3;
            this.textarea.selectionEnd = start + selected.length + 6;
        } else {
            const replacement = '[text](url)';
            this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
            this.textarea.selectionStart = start + 1;
            this.textarea.selectionEnd = start + 5;
        }

        this.textarea.focus();
        this.app.markDirty();
        this.scheduleRender();
        this._syncHighlight();
    }

    /** Insert markdown text at cursor — delegates to HyperMark if active */
    insertMarkdown(text) {
        if (this._hypermark) {
            this._hypermark.insertAtCursor(text);
            this.app.markDirty();
            return;
        }
        if (!this.textarea) return;
        const start = this.textarea.selectionStart;
        const value = this.textarea.value;
        this.textarea.value = value.substring(0, start) + text + value.substring(start);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        this.textarea.focus();
        this.app.markDirty();
        this.scheduleRender();
        this._syncHighlight();
        this._syncLineNumbers();
    }

    wrapSelection(before, after) {
        if (this._hypermark) {
            this._hypermark.wrapSelection(before, after);
            this.app.markDirty();
            return;
        }
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
        this._syncHighlight();
    }
}
