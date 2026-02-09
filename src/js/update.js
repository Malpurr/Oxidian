// Oxidian — Auto-Update Module
const { invoke } = window.__TAURI__.core;

export class UpdateManager {
    constructor(app) {
        this.app = app;
        this.updateInfo = null;
        this.bannerEl = null;
    }

    /**
     * Check for updates on startup (if enabled in settings)
     */
    async checkOnStartup() {
        const checkEnabled = localStorage.getItem('oxidian-update-check') !== 'false'; // default ON
        if (!checkEnabled) return;

        try {
            await this.checkForUpdate(false);
        } catch (e) {
            console.log('[Updater] Startup check failed (offline?):', e);
        }
    }

    /**
     * Check for update and optionally show result even if up-to-date
     */
    async checkForUpdate(showUpToDate = true) {
        try {
            const info = await invoke('check_update');
            if (info) {
                this.updateInfo = info;
                this.showUpdateBanner(info);

                // Auto-install if setting is on
                const autoInstall = localStorage.getItem('oxidian-auto-install-updates') === 'true';
                if (autoInstall) {
                    await this.downloadAndInstall();
                }
            } else if (showUpToDate) {
                this.showNotification('You\'re on the latest version!', 'success');
            }
        } catch (err) {
            console.error('[Updater] Check failed:', err);
            if (showUpToDate) {
                this.showNotification('Failed to check for updates: ' + err, 'error');
            }
        }
    }

    /**
     * Show update available banner at top of app
     */
    showUpdateBanner(info) {
        this.removeBanner();

        const banner = document.createElement('div');
        banner.className = 'update-banner';
        banner.innerHTML = `
            <div class="update-banner-content">
                <span class="update-banner-icon">🚀</span>
                <span class="update-banner-text">
                    <strong>Oxidian v${this.escHtml(info.version)}</strong> is available!
                </span>
                <button class="update-btn-changelog" title="View changelog">Changelog</button>
                <button class="update-btn-install">Update Now</button>
                <button class="update-btn-later">Later</button>
            </div>
            <div class="update-changelog" style="display:none">
                <pre>${this.escHtml(info.changelog || 'No changelog provided.')}</pre>
            </div>
            <div class="update-progress" style="display:none">
                <div class="update-progress-bar"><div class="update-progress-fill"></div></div>
                <span class="update-progress-text">Downloading...</span>
            </div>
        `;

        // Events
        banner.querySelector('.update-btn-changelog').addEventListener('click', () => {
            const cl = banner.querySelector('.update-changelog');
            cl.style.display = cl.style.display === 'none' ? 'block' : 'none';
        });

        banner.querySelector('.update-btn-install').addEventListener('click', () => {
            this.downloadAndInstall(banner);
        });

        banner.querySelector('.update-btn-later').addEventListener('click', () => {
            this.removeBanner();
        });

        // Insert at top of app
        const appContainer = document.querySelector('.app-container') || document.body;
        appContainer.prepend(banner);
        this.bannerEl = banner;
    }

    /**
     * Download and install the update
     */
    async downloadAndInstall(banner) {
        if (!this.updateInfo) return;

        // Show progress
        if (banner) {
            const content = banner.querySelector('.update-banner-content');
            const progress = banner.querySelector('.update-progress');
            if (content) content.style.display = 'none';
            if (progress) progress.style.display = 'flex';
        }

        try {
            await invoke('download_and_install_update', {
                downloadUrl: this.updateInfo.download_url
            });
            // If we get here, restart didn't happen (shouldn't normally reach)
            this.showRestartDialog();
        } catch (err) {
            console.error('[Updater] Install failed:', err);
            this.showNotification('Update failed: ' + err, 'error');

            // Restore banner
            if (banner) {
                const content = banner.querySelector('.update-banner-content');
                const progress = banner.querySelector('.update-progress');
                if (content) content.style.display = 'flex';
                if (progress) progress.style.display = 'none';
            }
        }
    }

    /**
     * Show restart required dialog
     */
    showRestartDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'update-restart-dialog';
        dialog.innerHTML = `
            <div class="update-restart-overlay"></div>
            <div class="update-restart-content">
                <h3>Update Installed</h3>
                <p>Oxidian has been updated. A restart is required to apply changes.</p>
                <div class="update-restart-actions">
                    <button class="update-btn-restart">Restart Now</button>
                    <button class="update-btn-dismiss">Later</button>
                </div>
            </div>
        `;

        dialog.querySelector('.update-btn-restart').addEventListener('click', async () => {
            try {
                // Use Tauri's process API to restart if available
                const { relaunch } = window.__TAURI__.process;
                await relaunch();
            } catch {
                dialog.querySelector('p').textContent = 'Please restart Oxidian manually.';
            }
        });

        dialog.querySelector('.update-btn-dismiss').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.querySelector('.update-restart-overlay').addEventListener('click', () => {
            dialog.remove();
        });

        document.body.appendChild(dialog);
    }

    /**
     * Remove the update banner
     */
    removeBanner() {
        if (this.bannerEl) {
            this.bannerEl.remove();
            this.bannerEl = null;
        }
        document.querySelectorAll('.update-banner').forEach(el => el.remove());
    }

    /**
     * Show a brief notification
     */
    showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `update-notification update-notification-${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('update-notification-hide');
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    escHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}
