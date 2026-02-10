// Oxidian — Command Palette Module (Cmd+P)
// Fuzzy-search modal over all available actions, Obsidian-style.

export class CommandPalette {
    constructor(app) {
        this.app = app;
        this.overlay = null;
        this.selectedIndex = 0;
        this.filtered = [];
    }

    /**
     * Build the full command registry.
     */
    _getCommands() {
        const app = this.app;
        return [
            // File operations
            { name: 'New Note', shortcut: 'Ctrl+N', cat: 'File', action: () => app.showNewNoteDialog() },
            { name: 'Open Daily Note', shortcut: 'Ctrl+D', cat: 'File', action: () => app.openDailyNote() },
            { name: 'Save Current File', shortcut: 'Ctrl+S', cat: 'File', action: () => app.saveCurrentFile() },
            { name: 'New Folder', cat: 'File', action: () => app.createNewFolder() },
            { name: 'Delete Current File', cat: 'File', action: () => { if (app.currentFile) app.deleteFile(app.currentFile); } },
            { name: 'Duplicate Current File', cat: 'File', action: () => { if (app.currentFile) app.duplicateFile(app.currentFile); } },
            { name: 'Rename Current File', cat: 'File', action: () => { if (app.currentFile) app.startRename(app.currentFile); } },

            // Navigation
            { name: 'Quick Switcher', shortcut: 'Ctrl+O', cat: 'Navigate', action: () => app.quickSwitcher.show() },
            { name: 'Search Notes', shortcut: 'Ctrl+Shift+F', cat: 'Navigate', action: () => app.search.show() },
            { name: 'Find in File', shortcut: 'Ctrl+F', cat: 'Navigate', action: () => app.findReplace?.showFind() },
            { name: 'Find and Replace', shortcut: 'Ctrl+H', cat: 'Navigate', action: () => app.findReplace?.showFindReplace() },
            { name: 'Open Graph View', cat: 'Navigate', action: () => app.openGraphView() },
            { name: 'Open Canvas', cat: 'Navigate', action: () => app.openCanvasView() },

            // Editor
            { name: 'Toggle Bold', shortcut: 'Ctrl+B', cat: 'Editor', action: () => this._editorWrap('**', '**') },
            { name: 'Toggle Italic', shortcut: 'Ctrl+I', cat: 'Editor', action: () => this._editorWrap('*', '*') },
            { name: 'Toggle Strikethrough', cat: 'Editor', action: () => this._editorWrap('~~', '~~') },
            { name: 'Toggle Highlight', cat: 'Editor', action: () => this._editorWrap('==', '==') },
            { name: 'Toggle Inline Code', shortcut: 'Ctrl+`', cat: 'Editor', action: () => this._editorWrap('`', '`') },
            { name: 'Insert Code Block', shortcut: 'Ctrl+Shift+K', cat: 'Editor', action: () => this._editorWrap('```\n', '\n```') },
            { name: 'Insert Link', shortcut: 'Ctrl+K', cat: 'Editor', action: () => this._editorInsert('[text](url)') },
            { name: 'Insert Wiki Link', cat: 'Editor', action: () => this._editorInsert('[[]]') },
            { name: 'Insert Horizontal Rule', cat: 'Editor', action: () => this._editorInsert('\n---\n') },
            { name: 'Insert Blockquote', cat: 'Editor', action: () => this._editorWrap('> ', '') },
            { name: 'Insert Checkbox', cat: 'Editor', action: () => this._editorInsert('- [ ] ') },
            { name: 'Insert Template', shortcut: 'Ctrl+T', cat: 'Editor', action: () => app.templateManager?.showPicker() },

            // View
            { name: 'Cycle View Mode', shortcut: 'Ctrl+E', cat: 'View', action: () => app.cycleViewMode() },
            { name: 'Toggle Backlinks Panel', cat: 'View', action: () => app.toggleBacklinksPanel() },
            { name: 'Toggle Focus Mode', shortcut: 'Ctrl+Shift+D', cat: 'View', action: () => app.toggleFocusMode() },
            { name: 'Switch to Classic Editor', cat: 'View', action: () => app.setEditorMode('classic') },
            { name: 'Switch to HyperMark Editor', cat: 'View', action: () => app.setEditorMode('hypermark') },

            // New Features
            { name: 'Open Random Note', cat: 'Navigate', action: () => app.openRandomNote() },
            { name: 'Create unique note', cat: 'File', action: () => app.createUniqueNote() },
            { name: 'Extract Selection to New Note', shortcut: 'Ctrl+Shift+E', cat: 'Editor', action: () => app.noteComposer ? app.noteComposer.extractSelectionToNote() : app.extractSelectionToNote() },
            { name: 'Merge Notes', cat: 'Editor', action: () => app.noteComposer?.mergeNotes() },
            { name: 'Show File Recovery', cat: 'Navigate', action: () => app.fileRecovery?.show() },
            { name: 'Open Local Graph', cat: 'Navigate', action: () => app.openLocalGraph() },
            { name: 'Record Audio', cat: 'Editor', action: () => app.startAudioRecording() },
            { name: 'Stop Audio Recording', cat: 'Editor', action: () => app.stopAudioRecording() },

            // Organisation
            { name: 'Toggle Bookmark', cat: 'Organize', action: () => app.toggleBookmark() },
            { name: 'Open Settings', shortcut: 'Ctrl+,', cat: 'Settings', action: () => app.openSettingsTab() },
            { name: 'Refresh File Explorer', cat: 'Navigate', action: () => app.sidebar?.refresh() },

            // Vault management
            { name: 'Switch Vault', cat: 'Vault', action: () => app.vaultPicker?.show() },
            { name: 'Open Vault Picker', cat: 'Vault', action: () => app.vaultPicker?.show() },

            // Workspaces
            { name: 'Save Workspace', cat: 'Workspace', action: () => app.workspaces?.save() },
            { name: 'Load Workspace', cat: 'Workspace', action: () => app.workspaces?.showManager() },
            { name: 'Manage Workspaces', cat: 'Workspace', action: () => app.workspaces?.showManager() },

            // Additional shortcuts
            { name: 'Open Graph View', shortcut: 'Ctrl+G', cat: 'Navigate', action: () => app.openGraphView() },
            { name: 'New Tab', shortcut: 'Ctrl+T', cat: 'File', action: () => app.showNewNoteDialog() },
            { name: 'Close Tab', shortcut: 'Ctrl+W', cat: 'File', action: () => { const t = app.tabManager?.getActiveTab(); if (t) app.tabManager.closeTab(t.id); } },
            { name: 'Open Daily Note', shortcut: 'Ctrl+Shift+D', cat: 'File', action: () => app.openDailyNote() },
            { name: 'Insert Link', shortcut: 'Ctrl+K', cat: 'Editor', action: () => app.insertLink() },
            { name: 'Toggle Checkbox', shortcut: 'Ctrl+Enter', cat: 'Editor', action: () => app.toggleCheckbox() },
            { name: 'Follow Link Under Cursor', shortcut: 'Alt+Enter', cat: 'Editor', action: () => app.followLinkUnderCursor() },
            { name: 'Indent', shortcut: 'Ctrl+]', cat: 'Editor', action: () => app.indentSelection() },
            { name: 'Outdent', shortcut: 'Ctrl+[', cat: 'Editor', action: () => app.outdentSelection() },

            // Audio Recorder
            { name: 'Start/Stop audio recording', cat: 'Audio', action: () => app.audioRecorder?.toggle() },
        ];
    }

    /**
     * Helper: wrap selection in the active editor
     */
    _editorWrap(before, after) {
        const app = this.app;
        if (app.hypermarkEditor) {
            // HyperMark — try wrapSelection if available
            app.hypermarkEditor.wrapSelection?.(before, after);
        } else if (app.editor) {
            app.editor.wrapSelection(before, after);
        }
    }

    _editorInsert(text) {
        const app = this.app;
        if (app.editor) {
            app.editor.insertMarkdown(text);
        }
    }

    /**
     * Simple fuzzy match — returns score or null.
     */
    _fuzzy(query, target) {
        const q = query.toLowerCase();
        const t = target.toLowerCase();

        // Substring match — best score
        if (t.includes(q)) {
            return t.indexOf(q) === 0 ? 0 : 5;
        }

        // Character-by-character fuzzy
        let qi = 0;
        let score = 0;
        for (let i = 0; i < t.length && qi < q.length; i++) {
            if (t[i] === q[qi]) {
                qi++;
            } else {
                score++;
            }
        }
        return qi === q.length ? score + 10 : null;
    }

    /**
     * Show the command palette.
     */
    show() {
        // Toggle off if already open
        if (this.overlay) { this.hide(); return; }

        const commands = this._getCommands();

        this.overlay = document.createElement('div');
        this.overlay.id = 'command-palette-overlay';
        this.overlay.className = 'command-palette-overlay';

        const palette = document.createElement('div');
        palette.className = 'command-palette';

        const input = document.createElement('input');
        input.className = 'command-palette-input';
        input.placeholder = 'Type a command…';
        input.autocomplete = 'off';

        const results = document.createElement('div');
        results.className = 'command-palette-results';

        palette.appendChild(input);
        palette.appendChild(results);
        this.overlay.appendChild(palette);
        document.body.appendChild(this.overlay);

        this.selectedIndex = 0;
        this.filtered = [...commands];

        const render = () => {
            results.innerHTML = '';
            if (this.filtered.length === 0) {
                results.innerHTML = '<div class="command-palette-empty">No matching commands</div>';
                return;
            }
            this.filtered.forEach((cmd, i) => {
                const item = document.createElement('div');
                item.className = 'command-palette-item' + (i === this.selectedIndex ? ' selected' : '');
                const catHtml = cmd.cat ? `<span class="command-palette-cat">${cmd.cat}</span>` : '';
                const shortcutHtml = cmd.shortcut ? `<span class="command-palette-shortcut">${cmd.shortcut}</span>` : '';
                const nameHtml = input.value.trim()
                    ? this._highlightMatch(cmd.name, input.value.trim())
                    : this._escapeHtml(cmd.name);
                item.innerHTML = `${catHtml}<span class="command-palette-name">${nameHtml}</span>${shortcutHtml}`;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.hide();
                    cmd.action();
                });
                item.addEventListener('mouseenter', () => {
                    this.selectedIndex = i;
                    render();
                });
                results.appendChild(item);
            });

            // Ensure selected is scrolled into view
            const sel = results.querySelector('.command-palette-item.selected');
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        };

        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (!q) {
                this.filtered = [...commands];
            } else {
                this.filtered = commands
                    .map(cmd => {
                        const score = this._fuzzy(q, cmd.name);
                        return score !== null ? { ...cmd, _score: score } : null;
                    })
                    .filter(Boolean)
                    .sort((a, b) => a._score - b._score);
            }
            this.selectedIndex = 0;
            render();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.filtered.length);
                render();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % Math.max(1, this.filtered.length);
                render();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.filtered[this.selectedIndex]) {
                    const cmd = this.filtered[this.selectedIndex];
                    this.hide();
                    cmd.action();
                }
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });

        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        render();
        input.focus();
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Highlight fuzzy matched characters in bold.
     */
    _highlightMatch(text, query) {
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        
        // Substring match — highlight the substring
        const idx = t.indexOf(q);
        if (idx !== -1) {
            const before = this._escapeHtml(text.slice(0, idx));
            const match = this._escapeHtml(text.slice(idx, idx + q.length));
            const after = this._escapeHtml(text.slice(idx + q.length));
            return `${before}<mark>${match}</mark>${after}`;
        }
        
        // Character-by-character fuzzy highlight
        let result = '';
        let qi = 0;
        for (let i = 0; i < text.length; i++) {
            if (qi < q.length && text[i].toLowerCase() === q[qi]) {
                result += `<mark>${this._escapeHtml(text[i])}</mark>`;
                qi++;
            } else {
                result += this._escapeHtml(text[i]);
            }
        }
        return result;
    }
}
