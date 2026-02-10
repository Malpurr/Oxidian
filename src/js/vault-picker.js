// Oxidian — Vault Picker Module
// Multi-vault support: list, add, remove, switch vaults.

import { invoke } from './tauri-bridge.js';

export class VaultPicker {
    constructor(app) {
        this.app = app;
        this.overlay = null;
    }

    async show() {
        if (this.overlay) { this.hide(); return; }

        let vaults = [];
        try {
            vaults = await invoke('list_vaults');
        } catch (e) {
            console.error('[VaultPicker] Failed to list vaults:', e);
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'command-palette-overlay';
        this.overlay.id = 'vault-picker-overlay';

        const modal = document.createElement('div');
        modal.className = 'command-palette';
        modal.style.maxWidth = '500px';

        modal.innerHTML = `
            <div style="padding:16px 20px;border-bottom:1px solid var(--border-color);">
                <h3 style="margin:0 0 4px;color:var(--text-primary);font-size:16px;">🗄️ Vault Picker</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:12px;">Switch between vaults or add a new one</p>
            </div>
            <div class="vault-picker-list" style="max-height:300px;overflow-y:auto;padding:8px;"></div>
            <div style="padding:12px 16px;border-top:1px solid var(--border-color);display:flex;gap:8px;">
                <button class="vault-picker-btn vault-add-btn" style="flex:1;">📁 Add Existing Vault</button>
                <button class="vault-picker-btn vault-create-btn" style="flex:1;">✨ Create New Vault</button>
            </div>
        `;

        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        const list = modal.querySelector('.vault-picker-list');
        this._renderVaults(list, vaults);

        // Add vault button
        modal.querySelector('.vault-add-btn').addEventListener('click', async () => {
            try {
                // Use Tauri dialog to pick folder
                const { open } = await import('@tauri-apps/plugin-dialog');
                const selected = await open({ directory: true, title: 'Select vault folder' });
                if (selected) {
                    const name = selected.split(/[\\/]/).pop() || 'Vault';
                    await invoke('add_vault', { name, path: selected });
                    // Refresh list
                    const updated = await invoke('list_vaults');
                    this._renderVaults(list, updated);
                }
            } catch (e) {
                // Fallback: prompt for path
                const path = prompt('Enter vault folder path:');
                if (path) {
                    const name = path.split(/[\\/]/).pop() || 'Vault';
                    try {
                        await invoke('add_vault', { name, path });
                        const updated = await invoke('list_vaults');
                        this._renderVaults(list, updated);
                    } catch (err) {
                        this.app.showErrorToast?.('Failed to add vault: ' + err);
                    }
                }
            }
        });

        // Create vault button
        modal.querySelector('.vault-create-btn').addEventListener('click', async () => {
            const name = prompt('New vault name:');
            if (!name) return;
            try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const dir = await open({ directory: true, title: 'Select parent folder for new vault' });
                if (dir) {
                    const vaultPath = dir + '/' + name;
                    await invoke('add_vault', { name, path: vaultPath });
                    await invoke('switch_vault', { path: vaultPath });
                    this.hide();
                    this.app.sidebar?.refresh();
                }
            } catch (e) {
                const path = prompt('Enter parent folder path:');
                if (path) {
                    const vaultPath = path + '/' + name;
                    try {
                        await invoke('add_vault', { name, path: vaultPath });
                        await invoke('switch_vault', { path: vaultPath });
                        this.hide();
                        this.app.sidebar?.refresh();
                    } catch (err) {
                        this.app.showErrorToast?.('Failed to create vault: ' + err);
                    }
                }
            }
        });

        // Close on overlay click
        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        // Close on Escape
        const keyHandler = (e) => {
            if (e.key === 'Escape') { this.hide(); document.removeEventListener('keydown', keyHandler); }
        };
        document.addEventListener('keydown', keyHandler);
    }

    _renderVaults(container, vaults) {
        if (vaults.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No vaults configured yet. Add or create one below.</div>';
            return;
        }

        container.innerHTML = '';
        vaults.forEach(vault => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;padding:10px 12px;border-radius:6px;cursor:pointer;gap:12px;';
            item.className = 'command-palette-item';
            item.innerHTML = `
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this._esc(vault.name)}</div>
                    <div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this._esc(vault.path)}</div>
                </div>
                <button class="vault-open-btn" style="padding:4px 12px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;font-size:12px;">Open</button>
                <button class="vault-remove-btn" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:12px;" title="Remove">×</button>
            `;

            item.querySelector('.vault-open-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await invoke('switch_vault', { path: vault.path });
                    this.hide();
                    this.app.invalidateFileTreeCache?.();
                    this.app.sidebar?.refresh();
                    this.app.loadTags?.();
                } catch (err) {
                    this.app.showErrorToast?.('Failed to switch vault: ' + err);
                }
            });

            item.querySelector('.vault-remove-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await invoke('remove_vault', { name: vault.name });
                    const updated = await invoke('list_vaults');
                    this._renderVaults(container, updated);
                } catch (err) {
                    this.app.showErrorToast?.('Failed to remove vault: ' + err);
                }
            });

            container.appendChild(item);
        });
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    _esc(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}
