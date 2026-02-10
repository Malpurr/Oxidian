// Oxidian — Note Composer Module
// Extract selection to new note, merge notes
import { invoke } from './tauri-bridge.js';

export class NoteComposer {
    constructor(app) {
        this.app = app;
    }

    /**
     * Extract selected text to a new note, replacing selection with [[link]]
     */
    async extractSelectionToNote() {
        const selection = this.app.editor?.getSelection?.();
        if (!selection || selection.trim().length === 0) {
            this.app.showErrorToast('No text selected. Select text first to extract.');
            return;
        }

        const noteName = prompt('New note name for extracted text:');
        if (!noteName || noteName.trim().length === 0) return;

        const sanitized = noteName.trim().replace(/\.md$/, '');
        const newPath = sanitized + '.md';

        try {
            // Check if note already exists
            try {
                await invoke('read_note', { path: newPath });
                if (!confirm(`Note "${sanitized}" already exists. Overwrite?`)) return;
            } catch { /* doesn't exist, good */ }

            await invoke('save_note', { path: newPath, content: `# ${sanitized}\n\n${selection}` });
            this.app.editor.replaceSelection(`[[${sanitized}]]`);
            this.app.isDirty = true;
            await this.app.saveCurrentFile();
            this.app.sidebar?.refresh();
            this.app.invalidateFileTreeCache();
        } catch (err) {
            console.error('[NoteComposer] Extract failed:', err);
            this.app.showErrorToast('Failed to extract selection: ' + (err.message || err));
        }
    }

    /**
     * Show merge note picker — select a note to merge into the current note
     */
    async mergeNotes() {
        if (!this.app.currentFile) {
            this.app.showErrorToast('No file open. Open a note first.');
            return;
        }

        // Create a simple picker modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:var(--bg-primary,#1e1e2e);border-radius:12px;padding:24px;width:450px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

        modal.innerHTML = `
            <h3 style="margin:0 0 12px;color:var(--text-primary,#cdd6f4);">Merge Note Into Current</h3>
            <input type="text" placeholder="Search notes..." style="width:100%;padding:8px 12px;border:1px solid var(--border-color,#45475a);border-radius:6px;background:var(--bg-secondary,#313244);color:var(--text-primary,#cdd6f4);margin-bottom:8px;box-sizing:border-box;" id="merge-search">
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <label style="color:var(--text-secondary,#a6adc8);font-size:13px;display:flex;align-items:center;gap:4px;">
                    <input type="radio" name="merge-pos" value="append" checked> Append
                </label>
                <label style="color:var(--text-secondary,#a6adc8);font-size:13px;display:flex;align-items:center;gap:4px;">
                    <input type="radio" name="merge-pos" value="prepend"> Prepend
                </label>
            </div>
            <div id="merge-results" style="overflow-y:auto;flex:1;max-height:300px;"></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const searchInput = modal.querySelector('#merge-search');
        const resultsDiv = modal.querySelector('#merge-results');

        const close = () => overlay.remove();
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
        });

        // Load files
        let files = [];
        try {
            const tree = await this.app.getFileTree();
            files = this._flattenTree(tree).filter(f => f.endsWith('.md') && f !== this.app.currentFile);
        } catch { files = []; }

        const renderResults = (query) => {
            const q = query.toLowerCase();
            const filtered = q ? files.filter(f => f.toLowerCase().includes(q)) : files;
            resultsDiv.innerHTML = '';
            for (const file of filtered.slice(0, 50)) {
                const item = document.createElement('div');
                item.style.cssText = 'padding:8px 12px;cursor:pointer;border-radius:4px;color:var(--text-primary,#cdd6f4);font-size:14px;';
                item.textContent = file.replace('.md', '');
                item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover,#45475a)');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.addEventListener('click', () => this._doMerge(file, modal.querySelector('input[name="merge-pos"]:checked').value, close));
                resultsDiv.appendChild(item);
            }
        };

        searchInput.addEventListener('input', () => renderResults(searchInput.value));
        searchInput.focus();
        renderResults('');
    }

    async _doMerge(sourcePath, position, closeFn) {
        try {
            const sourceContent = await invoke('read_note', { path: sourcePath });
            const currentContent = this.app.editor.getContent();

            const merged = position === 'prepend'
                ? sourceContent + '\n\n' + currentContent
                : currentContent + '\n\n' + sourceContent;

            this.app.editor.setContent(merged);
            this.app.isDirty = true;
            await this.app.saveCurrentFile();
            closeFn();
        } catch (err) {
            console.error('[NoteComposer] Merge failed:', err);
            this.app.showErrorToast('Failed to merge: ' + (err.message || err));
        }
    }

    _flattenTree(tree) {
        const result = [];
        const walk = (nodes) => {
            if (!Array.isArray(nodes)) return;
            for (const node of nodes) {
                if (node.is_dir) {
                    walk(node.children || []);
                } else {
                    result.push(node.path);
                }
            }
        };
        walk(Array.isArray(tree) ? tree : [tree]);
        return result;
    }
}
