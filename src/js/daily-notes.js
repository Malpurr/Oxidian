// Oxidian — Daily Notes Module
// UI-only: ribbon button, date picker
// All creation logic via Rust invoke()
const { invoke } = window.__TAURI__.core;

export class DailyNotes {
    constructor(app) {
        this.app = app;
        this._initRibbonButton();
    }

    /**
     * Wire the existing ribbon daily-note button.
     */
    _initRibbonButton() {
        const btn = document.querySelector('.ribbon-btn[data-action="daily"]');
        if (btn) {
            btn.title = 'Daily Note (Ctrl+D)';
        }
    }

    /**
     * Open (or create) today's daily note via Rust backend.
     */
    async open() {
        try {
            const result = await invoke('create_daily_note', {
                vaultPath: this.app.vaultPath || '',
                template: null
            });

            // result contains the path of the created/existing daily note
            const path = result.path || result;
            await this.app.openFile(path);
            await this.app.sidebar?.refresh();
        } catch (err) {
            console.error('[DailyNotes] Failed to create daily note:', err);
            this.app.showErrorToast?.(`Failed to create daily note: ${err.message || err}`);
        }
    }
}
