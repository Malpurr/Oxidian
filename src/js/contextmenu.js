// Oxidian — Context Menu
export class ContextMenu {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById('context-menu');
        this.currentTarget = null;

        // Close on click outside or escape
        document.addEventListener('click', () => this.hide());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }

    show(x, y, items) {
        this.el.innerHTML = '';
        for (const item of items) {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'ctx-separator';
                this.el.appendChild(sep);
                continue;
            }
            const row = document.createElement('div');
            row.className = 'ctx-item';
            row.innerHTML = `<span>${this.escapeHtml(item.label)}</span>${item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : ''}`;
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hide();
                if (item.action) item.action();
            });
            this.el.appendChild(row);
        }

        // Position, keep within viewport
        this.el.classList.remove('hidden');
        // Set transform-origin to cursor position for scale-in animation
        this.el.style.setProperty('--ctx-origin-x', '0px');
        this.el.style.setProperty('--ctx-origin-y', '0px');
        const rect = this.el.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 4;
        const maxY = window.innerHeight - rect.height - 4;
        this.el.style.left = Math.min(x, maxX) + 'px';
        this.el.style.top = Math.min(y, maxY) + 'px';
        // Re-trigger animation
        this.el.style.animation = 'none';
        this.el.offsetHeight; // force reflow
        this.el.style.animation = '';
    }

    hide() {
        this.el.classList.add('hidden');
    }

    /** Show context menu for a file in the sidebar */
    showFileMenu(e, filePath, isDir) {
        e.preventDefault();
        e.stopPropagation();

        const items = [];
        if (!isDir) {
            items.push({
                label: 'Open in New Pane',
                action: () => this.app.openFileInSplit(filePath)
            });
            items.push({ separator: true });
        }
        items.push({
            label: 'Rename',
            action: () => this.app.startRename(filePath)
        });
        if (!isDir) {
            items.push({
                label: 'Duplicate',
                action: () => this.app.duplicateFile(filePath)
            });
        }
        items.push({
            label: 'Copy Path',
            action: () => navigator.clipboard.writeText(filePath)
        });
        items.push({ separator: true });
        items.push({
            label: 'Delete',
            action: () => this.app.deleteFile(filePath)
        });

        this.show(e.clientX, e.clientY, items);
    }

    /** Show context menu for the editor */
    showEditorMenu(e, textarea) {
        e.preventDefault();
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

        // Add "Extract to Card" if text is selected
        const selection = window.getSelection()?.toString()?.trim();
        if (selection) {
            items.push({ separator: true });
            items.push({
                label: '🧠 Extract to Card',
                shortcut: 'Ctrl+Shift+E',
                action: () => this.app.extractToCard()
            });
            items.push({
                label: '📝 Extract to New Note',
                action: () => this.app.extractSelectionToNote()
            });
        }

        this.show(e.clientX, e.clientY, items);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
