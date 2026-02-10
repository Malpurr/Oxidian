// Oxidian — File Templates Module
// UI-only: template picker dialog, keyboard nav, filter
// All template scanning and application via Rust invoke()
const { invoke } = window.__TAURI__.core;

export class TemplateManager {
    constructor(app) {
        this.app = app;
    }

    /**
     * Get all available templates from Rust backend.
     */
    async getTemplates() {
        try {
            return await invoke('list_templates', { vaultPath: this.app.vaultPath || '' });
        } catch (err) {
            console.error('Failed to list templates:', err);
            return [];
        }
    }

    /**
     * Show the template picker dialog (Ctrl+T).
     */
    async showPicker() {
        // Remove existing picker
        const existing = document.getElementById('template-picker-overlay');
        if (existing) { existing.remove(); return; }

        const templates = await this.getTemplates();

        const overlay = document.createElement('div');
        overlay.id = 'template-picker-overlay';
        overlay.className = 'command-palette-overlay';

        const palette = document.createElement('div');
        palette.className = 'command-palette';

        const input = document.createElement('input');
        input.className = 'command-palette-input';
        input.placeholder = 'Choose a template...';
        input.autocomplete = 'off';

        const results = document.createElement('div');
        results.className = 'command-palette-results';

        // Note name input (shown after template selection)
        const noteNameWrap = document.createElement('div');
        noteNameWrap.className = 'template-note-name-wrap';
        noteNameWrap.style.display = 'none';
        noteNameWrap.innerHTML = `
            <div style="padding: 8px 12px; font-size: 12px; color: var(--text-secondary);">Note name:</div>
            <input class="command-palette-input template-note-name" placeholder="Enter note name..." autocomplete="off">
        `;

        palette.appendChild(input);
        palette.appendChild(results);
        palette.appendChild(noteNameWrap);
        overlay.appendChild(palette);
        document.body.appendChild(overlay);

        let selectedIndex = 0;
        let filtered = [...templates];
        let selectedTemplate = null;

        const render = () => {
            results.innerHTML = '';
            if (filtered.length === 0) {
                results.innerHTML = '<div class="command-palette-empty">No templates found</div>';
                return;
            }
            filtered.forEach((tpl, i) => {
                const item = document.createElement('div');
                item.className = 'command-palette-item' + (i === selectedIndex ? ' selected' : '');
                item.innerHTML = `
                    <span class="command-palette-name">📄 ${this._escapeHtml(tpl.name)}</span>
                `;
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectedIndex = i;
                    selectTemplate(filtered[i]);
                });
                item.addEventListener('mouseenter', () => {
                    selectedIndex = i;
                    render();
                });
                results.appendChild(item);
            });
        };

        const selectTemplate = (tpl) => {
            selectedTemplate = tpl;
            input.style.display = 'none';
            results.style.display = 'none';
            noteNameWrap.style.display = 'block';
            const noteInput = noteNameWrap.querySelector('.template-note-name');
            noteInput.focus();

            noteInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await this.createFromTemplate(selectedTemplate, noteInput.value.trim());
                    overlay.remove();
                } else if (e.key === 'Escape') {
                    overlay.remove();
                }
            });
        };

        input.addEventListener('input', () => {
            const q = input.value.toLowerCase();
            filtered = templates.filter(t => t.name.toLowerCase().includes(q));
            selectedIndex = 0;
            render();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length); render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
            else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIndex]) selectTemplate(filtered[selectedIndex]); }
            else if (e.key === 'Escape') { overlay.remove(); }
        });

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        render();
        input.focus();
    }

    /**
     * Create a new note from a template via Rust backend.
     */
    async createFromTemplate(template, noteName) {
        if (!noteName) noteName = 'Untitled';

        try {
            const result = await invoke('apply_template', {
                templatePath: template.path,
                title: noteName
            });

            const path = result.path || result;
            await this.app.openFile(path);
            await this.app.sidebar?.refresh();
        } catch (err) {
            console.error('Failed to create from template:', err);
            this.app.showErrorToast?.(`Failed to apply template: ${err.message || err}`);
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
