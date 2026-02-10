// Oxidian — Workspaces Module
// Save and restore layout presets: open tabs, sidebar state, active panel, view mode.

import { invoke } from './tauri-bridge.js';

export class Workspaces {
    constructor(app) {
        this.app = app;
    }

    /**
     * Capture the current layout state
     */
    _captureState() {
        const app = this.app;
        const tabs = (app.tabManager?.tabs || []).map(t => ({
            path: t.path,
            title: t.title,
            type: t.type,
            pane: t.pane || 0,
            viewMode: t.viewMode || 'live-preview',
            active: t === app.tabManager?.getActiveTab(),
        }));

        // Sidebar state
        const sidebar = document.getElementById('sidebar');
        const activePanel = document.querySelector('.sidebar-panel.active');
        const sidebarState = {
            visible: sidebar ? !sidebar.classList.contains('hidden') : true,
            width: sidebar?.style.width || '',
            activePanel: activePanel?.id?.replace('panel-', '') || 'files',
        };

        return {
            tabs,
            sidebar: sidebarState,
            viewMode: app.viewMode || 'live-preview',
            editorMode: app.editorMode || 'classic',
            splitActive: app.tabManager?.splitActive || false,
            focusMode: app.focusMode || false,
            currentFile: app.currentFile || null,
        };
    }

    /**
     * Save current layout as a named workspace
     */
    async save(name) {
        if (!name) {
            name = prompt('Workspace name:');
            if (!name) return;
        }
        const state = this._captureState();
        const data = JSON.stringify(state, null, 2);
        try {
            await invoke('save_workspace', { name, data });
            console.log(`[Workspaces] Saved workspace "${name}"`);
        } catch (e) {
            console.error('[Workspaces] Save failed:', e);
            this.app.showErrorToast?.('Failed to save workspace: ' + e);
        }
    }

    /**
     * Load and restore a named workspace
     */
    async load(name) {
        try {
            const data = await invoke('load_workspace', { name });
            const state = JSON.parse(data);
            await this._restoreState(state);
            console.log(`[Workspaces] Loaded workspace "${name}"`);
        } catch (e) {
            console.error('[Workspaces] Load failed:', e);
            this.app.showErrorToast?.('Failed to load workspace: ' + e);
        }
    }

    /**
     * Restore layout from state object
     */
    async _restoreState(state) {
        const app = this.app;

        // Close all current tabs
        if (app.tabManager) {
            const tabIds = app.tabManager.tabs.map(t => t.id);
            tabIds.forEach(id => app.tabManager.closeTab(id));
        }

        // Restore sidebar
        if (state.sidebar) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                if (state.sidebar.visible === false) {
                    sidebar.classList.add('hidden');
                } else {
                    sidebar.classList.remove('hidden');
                }
                if (state.sidebar.width) sidebar.style.width = state.sidebar.width;
            }
            if (state.sidebar.activePanel) {
                app.switchSidebarPanel?.(state.sidebar.activePanel);
            }
        }

        // Restore editor/view mode
        if (state.editorMode) app.editorMode = state.editorMode;
        if (state.viewMode) app.viewMode = state.viewMode;

        // Restore focus mode
        if (state.focusMode && !app.focusMode) app.toggleFocusMode?.();
        if (!state.focusMode && app.focusMode) app.toggleFocusMode?.();

        // Restore split if needed
        if (state.splitActive && !app.tabManager?.splitActive) {
            app.tabManager?.split?.();
        }

        // Restore tabs
        let activeTab = null;
        for (const tab of (state.tabs || [])) {
            if (tab.type === 'note' && tab.path) {
                try {
                    if (tab.active) {
                        await app.openFile(tab.path);
                        activeTab = tab;
                    } else {
                        app.tabManager?.openTab(tab.path, tab.title, 'note', tab.pane || 0);
                    }
                } catch (e) {
                    console.warn(`[Workspaces] Failed to restore tab ${tab.path}:`, e);
                }
            } else if (tab.type === 'graph') {
                app.openGraphView?.();
            } else if (tab.type === 'settings') {
                app.openSettingsPage?.();
            }
        }

        // Open active file last
        if (activeTab) {
            await app.openFile(activeTab.path);
        } else if (state.currentFile) {
            await app.openFile(state.currentFile);
        }
    }

    /**
     * List all saved workspaces
     */
    async list() {
        try {
            return await invoke('list_workspaces');
        } catch (e) {
            console.error('[Workspaces] List failed:', e);
            return [];
        }
    }

    /**
     * Delete a workspace
     */
    async delete(name) {
        try {
            await invoke('delete_workspace', { name });
        } catch (e) {
            console.error('[Workspaces] Delete failed:', e);
            this.app.showErrorToast?.('Failed to delete workspace: ' + e);
        }
    }

    /**
     * Show workspace manager modal
     */
    async showManager() {
        const names = await this.list();

        const overlay = document.createElement('div');
        overlay.className = 'command-palette-overlay';
        overlay.id = 'workspace-manager-overlay';

        const modal = document.createElement('div');
        modal.className = 'command-palette';
        modal.style.maxWidth = '450px';

        const renderList = async () => {
            const updatedNames = await this.list();
            let listHtml = '';
            if (updatedNames.length === 0) {
                listHtml = '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No saved workspaces</div>';
            } else {
                listHtml = updatedNames.map(n => `
                    <div class="command-palette-item workspace-item" data-name="${this._esc(n)}" style="display:flex;align-items:center;padding:10px 12px;gap:8px;">
                        <span style="flex:1;color:var(--text-primary);">📐 ${this._esc(n)}</span>
                        <button class="ws-load-btn" data-name="${this._esc(n)}" style="padding:3px 10px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;font-size:12px;">Load</button>
                        <button class="ws-delete-btn" data-name="${this._esc(n)}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);cursor:pointer;font-size:12px;">×</button>
                    </div>
                `).join('');
            }

            modal.innerHTML = `
                <div style="padding:16px 20px;border-bottom:1px solid var(--border-color);">
                    <h3 style="margin:0;color:var(--text-primary);font-size:16px;">📐 Workspaces</h3>
                </div>
                <div class="ws-list" style="max-height:300px;overflow-y:auto;padding:8px;">${listHtml}</div>
                <div style="padding:12px 16px;border-top:1px solid var(--border-color);">
                    <button class="ws-save-btn" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;">💾 Save Current Layout</button>
                </div>
            `;

            // Bind events
            modal.querySelectorAll('.ws-load-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    overlay.remove();
                    await this.load(btn.dataset.name);
                });
            });

            modal.querySelectorAll('.ws-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.delete(btn.dataset.name);
                    await renderList();
                });
            });

            modal.querySelector('.ws-save-btn').addEventListener('click', async () => {
                const name = prompt('Workspace name:');
                if (name) {
                    await this.save(name);
                    await renderList();
                }
            });
        };

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        await renderList();

        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const keyHandler = (e) => {
            if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', keyHandler); }
        };
        document.addEventListener('keydown', keyHandler);
    }

    _esc(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}
