// Oxidian — File Templates Module
// Ctrl+T opens a template picker. Templates live in "templates/" folder in the vault.
// Supports placeholder replacement: {{date}}, {{time}}, {{title}}

const { invoke } = window.__TAURI__.core;

export class TemplateManager {
    constructor(app) {
        this.app = app;

        // Built-in templates (used to seed templates/ folder)
        this.builtinTemplates = [
            {
                name: 'Daily Note',
                filename: 'Daily Note.md',
                content: `# {{title}}

📅 **Date:** {{date}}
⏰ **Time:** {{time}}

---

## 📝 Notes


## ✅ Tasks
- [ ] 

## 💡 Ideas


## 📖 Journal

`
            },
            {
                name: 'Meeting Notes',
                filename: 'Meeting Notes.md',
                content: `# Meeting: {{title}}

📅 **Date:** {{date}}  
⏰ **Time:** {{time}}  
👥 **Attendees:** 

---

## 📋 Agenda
1. 

## 📝 Notes


## ✅ Action Items
- [ ] 

## 📌 Decisions Made


## 📅 Next Meeting

`
            },
            {
                name: 'Project Plan',
                filename: 'Project Plan.md',
                content: `# Project: {{title}}

📅 **Created:** {{date}}  
🎯 **Status:** Planning  
👤 **Owner:** 

---

## 🎯 Objectives


## 📋 Requirements
- [ ] 

## 📅 Timeline
| Phase | Start | End | Status |
|-------|-------|-----|--------|
| Planning | {{date}} | | 🔵 Active |
| Development | | | ⚪ Pending |
| Testing | | | ⚪ Pending |
| Launch | | | ⚪ Pending |

## 📝 Notes


## 🔗 Related Notes

`
            }
        ];
    }

    /**
     * Ensure the templates/ folder exists with default templates.
     */
    async ensureTemplatesFolder() {
        try {
            await invoke('create_folder', { path: 'templates' });
        } catch {
            // folder may already exist
        }

        // Seed built-in templates if they don't exist
        for (const tpl of this.builtinTemplates) {
            const path = `templates/${tpl.filename}`;
            try {
                await invoke('read_note', { path });
                // already exists, skip
            } catch {
                try {
                    await invoke('save_note', { path, content: tpl.content });
                } catch (e) {
                    console.error(`Failed to seed template ${tpl.filename}:`, e);
                }
            }
        }
    }

    /**
     * Get all available templates from the templates/ folder.
     */
    async getTemplates() {
        try {
            const files = await invoke('list_files');
            const templateFolder = files.find(f => f.is_dir && (f.name === 'templates' || f.path === 'templates'));
            if (!templateFolder) return [];

            return (templateFolder.children || [])
                .filter(f => !f.is_dir && f.path.endsWith('.md'))
                .map(f => ({
                    name: f.name.replace(/\.md$/, ''),
                    path: f.path
                }));
        } catch {
            return [];
        }
    }

    /**
     * Apply placeholder replacements to template content.
     */
    replacePlaceholders(content, title) {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        return content
            .replace(/\{\{date\}\}/g, date)
            .replace(/\{\{time\}\}/g, time)
            .replace(/\{\{title\}\}/g, title || 'Untitled');
    }

    /**
     * Show the template picker dialog (Ctrl+T).
     */
    async showPicker() {
        // Remove existing picker
        const existing = document.getElementById('template-picker-overlay');
        if (existing) { existing.remove(); return; }

        await this.ensureTemplatesFolder();
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
     * Create a new note from a template.
     */
    async createFromTemplate(template, noteName) {
        if (!noteName) noteName = 'Untitled';
        if (!noteName.endsWith('.md')) noteName += '.md';

        try {
            const templateContent = await invoke('read_note', { path: template.path });
            const title = noteName.replace(/\.md$/, '');
            const content = this.replacePlaceholders(templateContent, title);

            await invoke('save_note', { path: noteName, content });
            await this.app.openFile(noteName);
            await this.app.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create from template:', err);
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
