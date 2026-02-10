// Oxidian — File Recovery Module
// Browse and restore previous versions of notes
import { invoke } from './tauri-bridge.js';

export class FileRecovery {
    constructor(app) {
        this.app = app;
        this.overlay = null;
    }

    async show() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'file-recovery-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const modal = document.createElement('div');
        modal.style.cssText = 'background:var(--bg-primary,#1e1e2e);border-radius:12px;padding:24px;width:700px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="margin:0;color:var(--text-primary,#cdd6f4);">📂 File Recovery</h3>
                <button id="fr-close" style="background:none;border:none;color:var(--text-secondary,#a6adc8);font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="display:flex;flex:1;overflow:hidden;gap:16px;min-height:0;">
                <div id="fr-file-list" style="width:200px;overflow-y:auto;border-right:1px solid var(--border-color,#45475a);padding-right:12px;"></div>
                <div id="fr-timeline" style="width:180px;overflow-y:auto;border-right:1px solid var(--border-color,#45475a);padding-right:12px;display:none;"></div>
                <div id="fr-preview" style="flex:1;overflow-y:auto;display:none;flex-direction:column;"></div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.overlay = overlay;

        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.hide(); });
        modal.querySelector('#fr-close').addEventListener('click', () => this.hide());
        document.addEventListener('keydown', this._escHandler = (e) => { if (e.key === 'Escape') this.hide(); });

        await this._loadFileList(modal);
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
            this._escHandler = null;
        }
    }

    async _loadFileList(modal) {
        const listDiv = modal.querySelector('#fr-file-list');
        try {
            const files = await invoke('list_all_snapshot_files');
            if (files.length === 0) {
                listDiv.innerHTML = '<div style="color:var(--text-secondary,#a6adc8);font-size:13px;padding:8px;">No snapshots yet. Snapshots are created automatically on each save.</div>';
                return;
            }

            for (const file of files) {
                const item = document.createElement('div');
                item.style.cssText = 'padding:6px 8px;cursor:pointer;border-radius:4px;color:var(--text-primary,#cdd6f4);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                item.textContent = file.replace('.md', '');
                item.title = file;
                item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover,#45475a)');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.addEventListener('click', () => this._loadTimeline(modal, file));
                listDiv.appendChild(item);
            }
        } catch (err) {
            listDiv.innerHTML = `<div style="color:var(--text-error,#f38ba8);font-size:13px;padding:8px;">Error: ${err}</div>`;
        }
    }

    async _loadTimeline(modal, filePath) {
        const timelineDiv = modal.querySelector('#fr-timeline');
        const previewDiv = modal.querySelector('#fr-preview');
        timelineDiv.style.display = 'block';
        previewDiv.style.display = 'none';
        timelineDiv.innerHTML = '<div style="color:var(--text-secondary);padding:8px;font-size:12px;">Loading...</div>';

        try {
            const snapshots = await invoke('list_file_snapshots', { path: filePath });
            timelineDiv.innerHTML = `<div style="font-size:11px;color:var(--text-secondary,#a6adc8);margin-bottom:8px;font-weight:600;">${filePath}</div>`;

            if (snapshots.length === 0) {
                timelineDiv.innerHTML += '<div style="color:var(--text-secondary);font-size:12px;">No snapshots.</div>';
                return;
            }

            for (const snap of snapshots) {
                const item = document.createElement('div');
                item.style.cssText = 'padding:5px 8px;cursor:pointer;border-radius:4px;color:var(--text-primary,#cdd6f4);font-size:12px;';
                item.textContent = this._formatTimestamp(snap.timestamp);
                item.title = `${snap.size_bytes} bytes`;
                item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover,#45475a)');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.addEventListener('click', () => this._showPreview(modal, filePath, snap.timestamp));
                timelineDiv.appendChild(item);
            }
        } catch (err) {
            timelineDiv.innerHTML = `<div style="color:var(--text-error,#f38ba8);font-size:12px;padding:8px;">Error: ${err}</div>`;
        }
    }

    async _showPreview(modal, filePath, timestamp) {
        const previewDiv = modal.querySelector('#fr-preview');
        previewDiv.style.display = 'flex';
        previewDiv.innerHTML = '<div style="color:var(--text-secondary);padding:8px;font-size:12px;">Loading...</div>';

        try {
            const content = await invoke('get_snapshot_content', { path: filePath, timestamp });

            previewDiv.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:12px;color:var(--text-secondary,#a6adc8);">${this._formatTimestamp(timestamp)}</span>
                    <button id="fr-restore-btn" style="padding:4px 12px;background:var(--accent-color,#7f6df2);color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;">Restore</button>
                </div>
                <pre style="flex:1;overflow:auto;background:var(--bg-secondary,#313244);padding:12px;border-radius:6px;color:var(--text-primary,#cdd6f4);font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;margin:0;">${this._escapeHtml(content)}</pre>
            `;

            previewDiv.querySelector('#fr-restore-btn').addEventListener('click', async () => {
                if (!confirm(`Restore "${filePath}" to version from ${this._formatTimestamp(timestamp)}?\nA snapshot of the current version will be created first.`)) return;
                try {
                    await invoke('restore_file_snapshot', { path: filePath, timestamp });
                    // Reload if currently open
                    if (this.app.currentFile === filePath) {
                        const newContent = await invoke('read_note', { path: filePath });
                        this.app.editor.setContent(newContent);
                        this.app.isDirty = false;
                        this.app.tabManager?.markClean(filePath);
                    }
                    this.hide();
                } catch (err) {
                    this.app.showErrorToast('Restore failed: ' + (err.message || err));
                }
            });
        } catch (err) {
            previewDiv.innerHTML = `<div style="color:var(--text-error,#f38ba8);font-size:12px;padding:8px;">Error: ${err}</div>`;
        }
    }

    _formatTimestamp(ts) {
        // Format: 20260210_235959.123 → 2026-02-10 23:59:59
        try {
            const date = ts.substring(0, 8);
            const time = ts.substring(9, 15);
            return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)} ${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(4, 6)}`;
        } catch {
            return ts;
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
