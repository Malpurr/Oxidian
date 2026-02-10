// Oxidian — Bookmarks / Favoriten Module
// UI-only: star toggle, context menu integration, bookmark panel
// All data/logic via Rust invoke()
const { invoke } = window.__TAURI__.core;

export class BookmarksManager {
    constructor(app) {
        this.app = app;
        this._initContextMenuIntegration();
        this._initStarButton();
    }

    // --- Data Layer (all via Rust) ---

    async listBookmarks() {
        try {
            return await invoke('list_bookmarks');
        } catch (err) {
            console.error('Failed to list bookmarks:', err);
            return [];
        }
    }

    async addBookmark(path) {
        try {
            await invoke('add_bookmark', { path });
            this.refresh();
        } catch (err) {
            console.error('Failed to add bookmark:', err);
        }
    }

    async removeBookmark(path) {
        try {
            await invoke('remove_bookmark', { path });
            this.refresh();
        } catch (err) {
            console.error('Failed to remove bookmark:', err);
        }
    }

    async reorderBookmarks(paths) {
        try {
            await invoke('reorder_bookmarks', { paths });
        } catch (err) {
            console.error('Failed to reorder bookmarks:', err);
        }
    }

    async toggleBookmark(path) {
        const bookmarks = await this.listBookmarks();
        if (bookmarks.includes(path)) {
            await this.removeBookmark(path);
        } else {
            await this.addBookmark(path);
        }
    }

    async isBookmarked(path) {
        const bookmarks = await this.listBookmarks();
        return bookmarks.includes(path);
    }

    // --- UI Layer (DOM, events) ---

    /**
     * Add "Toggle Bookmark" to the file-tree context menu entries.
     */
    _initContextMenuIntegration() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;

        fileTree.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.tree-item[data-path]');
            if (!item) return;
            const path = item.dataset.path;
            if (!path || !path.endsWith('.md')) return;

            setTimeout(async () => {
                const menu = document.getElementById('context-menu') || document.querySelector('.context-menu');
                if (!menu) return;

                if (menu.querySelector('[data-action="toggle-bookmark"]')) return;

                const bookmarked = await this.isBookmarked(path);
                const label = bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks';

                const sep = document.createElement('div');
                sep.className = 'context-menu-sep';
                menu.appendChild(sep);

                const bmItem = document.createElement('div');
                bmItem.className = 'context-menu-item';
                bmItem.dataset.action = 'toggle-bookmark';
                bmItem.innerHTML = `<span class="icon">⭐</span> ${label}`;
                bmItem.addEventListener('click', () => {
                    this.toggleBookmark(path);
                    this.app.contextMenu?.hide();
                });
                menu.appendChild(bmItem);
            }, 0);
        });
    }

    /**
     * Wire up the star button (#btn-bookmark-current) in the sidebar header.
     */
    _initStarButton() {
        const btn = document.getElementById('btn-bookmark-current');
        if (!btn) return;

        const bc = document.getElementById('breadcrumb-path');
        if (bc) {
            const observer = new MutationObserver(() => this._updateStarState());
            observer.observe(bc, { childList: true, subtree: true });
        }

        this._updateStarState();
    }

    /**
     * Update the star button's active state based on current file.
     */
    async _updateStarState() {
        const btn = document.getElementById('btn-bookmark-current');
        if (!btn) return;

        const bookmarked = this.app.currentFile ? await this.isBookmarked(this.app.currentFile) : false;
        btn.classList.toggle('active', bookmarked);
        btn.title = bookmarked ? 'Remove bookmark' : 'Bookmark current note';

        const svg = btn.querySelector('svg');
        if (svg) {
            const path = svg.querySelector('path');
            if (path) {
                path.setAttribute('fill', bookmarked ? 'currentColor' : 'none');
            }
        }
    }

    /**
     * Refresh bookmark panel and star state.
     */
    refresh() {
        this.app.renderBookmarks?.();
        this._updateStarState();
    }
}
