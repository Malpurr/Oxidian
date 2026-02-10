// Oxidian — Daily Notes Module
// Creates / opens a daily note (YYYY-MM-DD.md) inside a "Calendar" folder.
// Falls back gracefully if the Tauri backend `create_daily_note` command exists,
// otherwise handles creation purely on the frontend via save_note.

const { invoke } = window.__TAURI__.core;

export class DailyNotes {
    constructor(app) {
        this.app = app;
        this.folder = 'Calendar';
        this._initRibbonButton();
    }

    /**
     * Wire the existing ribbon daily-note button (data-action="daily")
     * and also add a keyboard shortcut hint.
     */
    _initRibbonButton() {
        const btn = document.querySelector('.ribbon-btn[data-action="daily"]');
        if (btn) {
            btn.title = 'Daily Note (Ctrl+D)';
        }
    }

    /**
     * Format today's date as YYYY-MM-DD.
     */
    _today() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /**
     * Open (or create) today's daily note.
     */
    async open() {
        const date = this._today();
        const path = `${this.folder}/${date}.md`;

        // Try reading first — if exists, just open
        try {
            await invoke('read_note', { path });
            await this.app.openFile(path);
            return;
        } catch (_) {
            // Doesn't exist yet — create it
        }

        // Ensure Calendar folder exists
        try {
            await invoke('create_folder', { path: this.folder });
        } catch (_) {
            // Folder may already exist — that's fine
        }

        // Create the daily note with a template
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[new Date().getDay()];
        const content = `# ${date}\n\n**${dayName}**\n\n---\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;

        try {
            await invoke('save_note', { path, content });
            await this.app.openFile(path);
            await this.app.sidebar?.refresh();
        } catch (err) {
            console.error('[DailyNotes] Failed to create daily note:', err);
            this.app.showErrorToast?.(`Failed to create daily note: ${err.message || err}`);
        }
    }
}
