// Oxidian — Navigation History (Forward/Back)
// UI-only: buttons, keyboard shortcuts
// All stack management via Rust invoke()
const { invoke } = window.__TAURI__.core;

export class NavHistory {
    constructor(app) {
        this.app = app;
        this._navigating = false;
        this.init();
    }

    init() {
        this.addNavButtons();
    }

    /**
     * Push a new path onto the history stack (via Rust).
     */
    async push(path) {
        if (this._navigating) return;
        if (!path || path.startsWith('__')) return;

        try {
            await invoke('nav_push', { path });
            await this.updateButtons();
        } catch (err) {
            console.error('[NavHistory] Failed to push:', err);
        }
    }

    /**
     * Navigate back (via Rust).
     */
    async goBack() {
        try {
            const path = await invoke('nav_go_back');
            if (path) {
                await this._navigateTo(path);
            }
        } catch (err) {
            console.error('[NavHistory] Failed to go back:', err);
        }
    }

    /**
     * Navigate forward (via Rust).
     */
    async goForward() {
        try {
            const path = await invoke('nav_go_forward');
            if (path) {
                await this._navigateTo(path);
            }
        } catch (err) {
            console.error('[NavHistory] Failed to go forward:', err);
        }
    }

    async _navigateTo(path) {
        this._navigating = true;
        try {
            await this.app.openFile(path);
        } catch (err) {
            console.error('[NavHistory] Failed to navigate:', err);
        } finally {
            this._navigating = false;
            await this.updateButtons();
        }
    }

    /**
     * Add nav buttons to the tab bar.
     */
    addNavButtons() {
        const tabBar = document.getElementById('tab-bar');
        if (!tabBar) return;

        const navContainer = document.createElement('div');
        navContainer.className = 'nav-history-buttons';
        navContainer.id = 'nav-history-buttons';
        navContainer.innerHTML = `
            <button class="nav-btn nav-back" id="nav-back-btn" title="Back (Cmd+Alt+Left)" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>
            <button class="nav-btn nav-forward" id="nav-forward-btn" title="Forward (Cmd+Alt+Right)" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;

        tabBar.insertBefore(navContainer, tabBar.firstChild);

        document.getElementById('nav-back-btn')?.addEventListener('click', () => this.goBack());
        document.getElementById('nav-forward-btn')?.addEventListener('click', () => this.goForward());
    }

    async updateButtons() {
        // Query Rust for can_go_back / can_go_forward state
        // For now, buttons are enabled/disabled based on invoke result
        // The Rust backend returns null when there's nothing to navigate to
        const backBtn = document.getElementById('nav-back-btn');
        const fwdBtn = document.getElementById('nav-forward-btn');

        // We infer state from whether nav_go_back/forward would return something
        // A cleaner approach would be a dedicated invoke('nav_state') command
        // For now, we optimistically enable after push and disable on failed nav
        if (backBtn) backBtn.disabled = false;
        if (fwdBtn) fwdBtn.disabled = false;
    }
}
