// Oxidian — Live Preview Implementation
// Refactored: Markdown rendering delegated to Rust via invoke().
// JS retains: CM6 Decorations, Widget rendering, DOM layout, event handling.

const { invoke } = window.__TAURI__.core;

export class LivePreview {
    constructor(app) {
        this.app = app;
        this.editor = null;
        this.previewContainer = null;
        this.isActive = false;
        this._renderTimer = null;
        this._lastContent = '';
        this._cursorLine = -1;
    }

    /**
     * Enable live preview mode
     * @param {HTMLElement} container - Editor container
     * @param {object} editor - Editor instance
     */
    enable(container, editor) {
        this.editor = editor;
        this.isActive = true;
        
        container.innerHTML = `
            <div class="live-preview-wrapper">
                <div class="live-preview-editor">
                    <textarea class="editor-textarea" placeholder="Start writing... (Markdown supported)" spellcheck="true"></textarea>
                </div>
                <div class="live-preview-divider"></div>
                <div class="live-preview-rendered">
                    <div class="preview-content"></div>
                </div>
            </div>
        `;

        const textarea = container.querySelector('.editor-textarea');
        this.previewContainer = container.querySelector('.preview-content');
        
        textarea.addEventListener('input', () => this.onInput(textarea));
        textarea.addEventListener('selectionchange', () => this.onCursorMove(textarea));
        textarea.addEventListener('keyup', () => this.onCursorMove(textarea));
        textarea.addEventListener('click', () => this.onCursorMove(textarea));

        return textarea;
    }

    /**
     * Alternative: True live preview in single pane (CodeMirror style)
     */
    enableInPlace(container, editor) {
        this.editor = editor;
        this.isActive = true;
        return this.enable(container, editor);
    }

    disable() {
        this.isActive = false;
        this.editor = null;
        this.previewContainer = null;
        clearTimeout(this._renderTimer);
    }

    onInput(textarea) {
        if (!this.isActive) return;
        
        clearTimeout(this._renderTimer);
        this._renderTimer = setTimeout(() => {
            this.renderLivePreview(textarea.value, this.getCurrentLineNumber(textarea));
        }, 150);
    }

    onCursorMove(textarea) {
        if (!this.isActive) return;
        
        const currentLine = this.getCurrentLineNumber(textarea);
        if (currentLine !== this._cursorLine) {
            this._cursorLine = currentLine;
            this.renderLivePreview(textarea.value, currentLine);
        }
    }

    getCurrentLineNumber(textarea) {
        const pos = textarea.selectionStart;
        const text = textarea.value;
        return text.substring(0, pos).split('\n').length;
    }

    /**
     * Render live preview — Rust renders markdown to HTML,
     * JS handles cursor-line raw display and DOM insertion.
     */
    async renderLivePreview(content, cursorLine) {
        if (!this.previewContainer || content === this._lastContent) return;
        
        try {
            const lines = content.split('\n');
            
            // Build content: current cursor line stays raw, rest gets rendered
            const renderParts = [];
            let rawLineHtml = null;
            
            // Collect non-cursor lines for Rust rendering
            const mdLines = [];
            for (let i = 0; i < lines.length; i++) {
                const lineNum = i + 1;
                if (lineNum === cursorLine) {
                    // Mark position for raw line insertion
                    renderParts.push({ type: 'raw', line: lines[i] });
                    mdLines.push(''); // placeholder to keep line numbers aligned
                } else {
                    renderParts.push({ type: 'md', lineIndex: i });
                    mdLines.push(lines[i]);
                }
            }

            // Render all non-cursor content via Rust
            const html = await invoke('render_markdown_html', { content: mdLines.join('\n') });

            // Build final output: inject raw cursor line
            const renderedLines = html.split('\n');
            let finalHtml = '';
            
            for (const part of renderParts) {
                if (part.type === 'raw') {
                    finalHtml += `<div class="live-preview-raw-line">${this.escapeHtml(part.line)}</div>\n`;
                }
            }

            // Use the full rendered HTML (cursor line was blanked out)
            // Replace the placeholder with rendered content
            this.previewContainer.innerHTML = html;
            
            // Insert raw line indicator at cursor position
            if (cursorLine > 0 && cursorLine <= lines.length) {
                const rawDiv = document.createElement('div');
                rawDiv.className = 'live-preview-raw-line';
                rawDiv.textContent = lines[cursorLine - 1];
                
                // Find approximate insertion point in rendered DOM
                const children = Array.from(this.previewContainer.children);
                if (children.length >= cursorLine) {
                    this.previewContainer.insertBefore(rawDiv, children[cursorLine - 1]);
                } else {
                    this.previewContainer.appendChild(rawDiv);
                }
            }
            
            this._lastContent = content;
        } catch (err) {
            console.error('Live preview render error:', err);
            // Fallback: use app.renderMarkdown if available
            try {
                const html = await this.app.renderMarkdown(content);
                this.previewContainer.innerHTML = html;
                this._lastContent = content;
            } catch (fallbackErr) {
                this.previewContainer.innerHTML = `<div class="render-error">Preview Error: ${err.message}</div>`;
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setContent(content) {
        this._lastContent = '';
        if (this.isActive && this.editor?.textarea) {
            this.renderLivePreview(content, 1);
        }
    }
}
