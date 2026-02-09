// Oxidian — Live Preview Implementation
// TRUE Live Preview: Render markdown WHILE typing, cursor line shows raw markdown

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
        
        // Create split view layout
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
        
        // Set up event listeners
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
        
        // This would need CodeMirror decorations/widgets
        // For now, fall back to split view
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
        }, 150); // Fast response for live feel
    }

    onCursorMove(textarea) {
        if (!this.isActive) return;
        
        const currentLine = this.getCurrentLineNumber(textarea);
        if (currentLine !== this._cursorLine) {
            this._cursorLine = currentLine;
            // Re-render to highlight current line
            this.renderLivePreview(textarea.value, currentLine);
        }
    }

    getCurrentLineNumber(textarea) {
        const pos = textarea.selectionStart;
        const text = textarea.value;
        return text.substring(0, pos).split('\n').length;
    }

    async renderLivePreview(content, cursorLine) {
        if (!this.previewContainer || content === this._lastContent) return;
        
        try {
            const lines = content.split('\n');
            let modifiedContent = '';
            
            // Process each line
            lines.forEach((line, index) => {
                const lineNum = index + 1;
                if (lineNum === cursorLine) {
                    // Current line: show raw markdown with special styling
                    modifiedContent += `<div class="live-preview-raw-line">${this.escapeHtml(line)}</div>\n`;
                } else {
                    // Other lines: render as markdown
                    modifiedContent += line + '\n';
                }
            });

            // Render the modified content
            const html = await this.app.renderMarkdown(modifiedContent);
            this.previewContainer.innerHTML = html;
            
            this._lastContent = content;
        } catch (err) {
            console.error('Live preview render error:', err);
            this.previewContainer.innerHTML = `<div class="render-error">Preview Error: ${err.message}</div>`;
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