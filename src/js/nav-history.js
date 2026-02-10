// Oxidian — Navigation History (Forward/Back)
// Tracks note navigation and provides Cmd+Alt+Left/Right shortcuts

export class NavHistory {
    constructor(app) {
        this.app = app;
        this.stack = [];      // Array of file paths
        this.currentIndex = -1;
        this._navigating = false; // Prevent push during back/forward navigation

        this.init();
    }

    init() {
        this.addNavButtons();
    }

    /**
     * Push a new path onto the history stack.
     * Called every time a note is opened (except during back/forward nav).
     */
    push(path) {
        if (this._navigating) return;
        if (!path || path.startsWith('__')) return;

        // If we're not at the end, truncate forward history
        if (this.currentIndex < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.currentIndex + 1);
        }

        // Don't push duplicate consecutive entries
        if (this.stack.length > 0 && this.stack[this.currentIndex] === path) return;

        this.stack.push(path);
        this.currentIndex = this.stack.length - 1;

        // Limit stack size
        if (this.stack.length > 100) {
            this.stack.shift();
            this.currentIndex--;
        }

        this.updateButtons();
    }

    /**
     * Navigate back
     */
    async goBack() {
        if (this.currentIndex <= 0) return;
        this.currentIndex--;
        await this._navigateTo(this.stack[this.currentIndex]);
    }

    /**
     * Navigate forward
     */
    async goForward() {
        if (this.currentIndex >= this.stack.length - 1) return;
        this.currentIndex++;
        await this._navigateTo(this.stack[this.currentIndex]);
    }

    async _navigateTo(path) {
        this._navigating = true;
        try {
            await this.app.openFile(path);
        } catch (err) {
            console.error('[NavHistory] Failed to navigate:', err);
        } finally {
            this._navigating = false;
            this.updateButtons();
        }
    }

    get canGoBack() {
        return this.currentIndex > 0;
    }

    get canGoForward() {
        return this.currentIndex < this.stack.length - 1;
    }

    /**
     * Update a path in the history (e.g. after rename)
     */
    renamePath(oldPath, newPath) {
        for (let i = 0; i < this.stack.length; i++) {
            if (this.stack[i] === oldPath) {
                this.stack[i] = newPath;
            }
        }
    }

    /**
     * Add nav buttons to the ribbon or titlebar
     */
    addNavButtons() {
        // Insert nav buttons before the tab bar
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

        // Insert before tab-list inside tab-bar
        tabBar.insertBefore(navContainer, tabBar.firstChild);

        document.getElementById('nav-back-btn')?.addEventListener('click', () => this.goBack());
        document.getElementById('nav-forward-btn')?.addEventListener('click', () => this.goForward());
    }

    updateButtons() {
        const backBtn = document.getElementById('nav-back-btn');
        const fwdBtn = document.getElementById('nav-forward-btn');
        if (backBtn) backBtn.disabled = !this.canGoBack;
        if (fwdBtn) fwdBtn.disabled = !this.canGoForward;
    }
}
