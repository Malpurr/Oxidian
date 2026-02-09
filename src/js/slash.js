// Oxidian — Slash Commands Menu

const SLASH_COMMANDS = [
    { id: 'h1', label: 'Heading 1', icon: 'H1', insert: '# ', category: 'headings' },
    { id: 'h2', label: 'Heading 2', icon: 'H2', insert: '## ', category: 'headings' },
    { id: 'h3', label: 'Heading 3', icon: 'H3', insert: '### ', category: 'headings' },
    { id: 'h4', label: 'Heading 4', icon: 'H4', insert: '#### ', category: 'headings' },
    { id: 'h5', label: 'Heading 5', icon: 'H5', insert: '##### ', category: 'headings' },
    { id: 'h6', label: 'Heading 6', icon: 'H6', insert: '###### ', category: 'headings' },
    { id: 'bold', label: 'Bold', icon: 'B', wrap: ['**', '**'], category: 'formatting' },
    { id: 'italic', label: 'Italic', icon: 'I', wrap: ['*', '*'], category: 'formatting' },
    { id: 'strikethrough', label: 'Strikethrough', icon: 'S', wrap: ['~~', '~~'], category: 'formatting' },
    { id: 'code', label: 'Inline Code', icon: '<>', wrap: ['`', '`'], category: 'formatting' },
    { id: 'codeblock', label: 'Code Block', icon: '{}', insert: '```\n\n```', cursorOffset: -4, category: 'blocks' },
    { id: 'quote', label: 'Quote', icon: '"', insert: '> ', category: 'blocks' },
    { id: 'bullet', label: 'Bullet List', icon: '•', insert: '- ', category: 'lists' },
    { id: 'numbered', label: 'Numbered List', icon: '1.', insert: '1. ', category: 'lists' },
    { id: 'checkbox', label: 'Checkbox', icon: '☐', insert: '- [ ] ', category: 'lists' },
    { id: 'table', label: 'Table', icon: '⊞', insert: '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| | | |\n', category: 'blocks' },
    { id: 'hr', label: 'Horizontal Rule', icon: '—', insert: '---\n', category: 'blocks' },
    { id: 'image', label: 'Image / Embed', icon: '🖼', insert: '![alt](url)', category: 'media' },
    { id: 'link', label: 'Link', icon: '🔗', insert: '[text](url)', category: 'media' },
    { id: 'wikilink', label: 'Wiki Link', icon: '⟦⟧', wrap: ['[[', ']]'], category: 'media' },
    { id: 'callout', label: 'Callout', icon: '💡', insert: '> [!note]\n> ', category: 'blocks' },
];

export class SlashMenu {
    constructor(app) {
        this.app = app;
        this.el = null;
        this.visible = false;
        this.selectedIndex = 0;
        this.filteredCommands = [...SLASH_COMMANDS];
        this.filterText = '';
        this.textarea = null;
        this.slashStart = -1;

        this.createEl();
    }

    createEl() {
        this.el = document.createElement('div');
        this.el.id = 'slash-menu';
        this.el.className = 'slash-menu hidden';
        document.body.appendChild(this.el);
    }

    /** Called on every input event of the textarea */
    onInput(textarea) {
        this.textarea = textarea;
        const pos = textarea.selectionStart;
        const text = textarea.value;

        // Find if we're in a slash command context
        const beforeCursor = text.substring(0, pos);
        const lastSlash = beforeCursor.lastIndexOf('/');

        if (lastSlash >= 0) {
            // Check if slash is at start of line or after a space
            const charBefore = lastSlash > 0 ? beforeCursor[lastSlash - 1] : '\n';
            if (charBefore === '\n' || charBefore === ' ' || charBefore === '\t' || lastSlash === 0) {
                const filter = beforeCursor.substring(lastSlash + 1);
                // No spaces in filter
                if (!filter.includes(' ') && !filter.includes('\n')) {
                    this.slashStart = lastSlash;
                    this.filterText = filter.toLowerCase();
                    this.filteredCommands = SLASH_COMMANDS.filter(cmd =>
                        cmd.label.toLowerCase().includes(this.filterText) ||
                        cmd.id.includes(this.filterText)
                    );
                    if (this.filteredCommands.length > 0) {
                        this.selectedIndex = 0;
                        this.show(textarea);
                        return;
                    }
                }
            }
        }

        this.hide();
    }

    show(textarea) {
        this.visible = true;
        this.render();

        // Position near cursor
        const pos = this.getCursorPosition(textarea);
        this.el.style.left = pos.x + 'px';
        this.el.style.top = pos.y + 'px';
        this.el.classList.remove('hidden');

        // Adjust if overflowing
        requestAnimationFrame(() => {
            const rect = this.el.getBoundingClientRect();
            if (rect.bottom > window.innerHeight) {
                this.el.style.top = (pos.y - rect.height - 20) + 'px';
            }
            if (rect.right > window.innerWidth) {
                this.el.style.left = (window.innerWidth - rect.width - 10) + 'px';
            }
        });
    }

    hide() {
        this.visible = false;
        this.el.classList.add('hidden');
        this.slashStart = -1;
    }

    render() {
        this.el.innerHTML = '';
        this.filteredCommands.forEach((cmd, i) => {
            const item = document.createElement('div');
            item.className = 'slash-item' + (i === this.selectedIndex ? ' selected' : '');
            item.innerHTML = `<span class="slash-icon">${cmd.icon}</span><span class="slash-label">${cmd.label}</span>`;
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.execute(cmd);
            });
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = i;
                this.render();
            });
            this.el.appendChild(item);
        });
    }

    /** Handle keydown when menu is visible. Returns true if event was consumed. */
    handleKeyDown(e) {
        if (!this.visible) return false;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
            this.render();
            return true;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
            this.render();
            return true;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (this.filteredCommands.length > 0) {
                this.execute(this.filteredCommands[this.selectedIndex]);
            }
            return true;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            this.hide();
            return true;
        }
        return false;
    }

    execute(cmd) {
        if (!this.textarea || this.slashStart < 0) return;

        const pos = this.textarea.selectionStart;
        const value = this.textarea.value;

        // Remove the slash + filter text
        const before = value.substring(0, this.slashStart);
        const after = value.substring(pos);

        if (cmd.wrap) {
            const [pre, post] = cmd.wrap;
            const text = 'text';
            this.textarea.value = before + pre + text + post + after;
            this.textarea.selectionStart = this.slashStart + pre.length;
            this.textarea.selectionEnd = this.slashStart + pre.length + text.length;
        } else if (cmd.insert) {
            this.textarea.value = before + cmd.insert + after;
            let newPos = this.slashStart + cmd.insert.length;
            if (cmd.cursorOffset) newPos += cmd.cursorOffset;
            this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
        }

        this.textarea.focus();
        this.hide();

        // Trigger input event for dirty tracking and preview
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    getCursorPosition(textarea) {
        // Approximate: use textarea position + line calculations
        const rect = textarea.getBoundingClientRect();
        const text = textarea.value.substring(0, textarea.selectionStart);
        const lines = text.split('\n');
        const lineIndex = lines.length - 1;
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(style.lineHeight) || 24;
        const paddingTop = parseFloat(style.paddingTop) || 20;
        const paddingLeft = parseFloat(style.paddingLeft) || 28;

        return {
            x: rect.left + paddingLeft + 20,
            y: rect.top + paddingTop + (lineIndex * lineHeight) - textarea.scrollTop + lineHeight + 4,
        };
    }
}
