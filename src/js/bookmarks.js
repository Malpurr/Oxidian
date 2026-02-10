// Oxidian — Bookmarks / Favoriten Module
// Enhances the existing bookmarks panel with star toggle, context menu integration,
// and persistent storage. Works with the bookmarks infrastructure already in app.js.

export class BookmarksManager {
    constructor(app) {
        this.app = app;
        this._initContextMenuIntegration();
        this._initStarButton();
    }

    /**
     * Add "Toggle Bookmark" to the file-tree context menu entries.
     * Listens for right-click on sidebar file items.
     */
    _initContextMenuIntegration() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;

        fileTree.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.tree-item[data-path]');
            if (!item) return;
            const path = item.dataset.path;
            if (!path || !path.endsWith('.md')) return;

            // Defer — let the existing contextMenu build first, then inject our item
            setTimeout(() => {
                const menu = document.getElementById('context-menu') || document.querySelector('.context-menu');
                if (!menu) return;

                // Avoid duplicates
                if (menu.querySelector('[data-action="toggle-bookmark"]')) return;

                const isBookmarked = (this.app.bookmarks || []).includes(path);
                const label = isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks';

                const sep = document.createElement('div');
                sep.className = 'context-menu-sep';
                menu.appendChild(sep);

                const bmItem = document.createElement('div');
                bmItem.className = 'context-menu-item';
                bmItem.dataset.action = 'toggle-bookmark';
                bmItem.innerHTML = `<span class="icon">⭐</span> ${label}`;
                bmItem.addEventListener('click', () => {
                    this.app.toggleBookmark(path);
                    this.app.contextMenu?.hide();
                });
                menu.appendChild(bmItem);
            }, 0);
        });
    }

    /**
     * Wire up the existing star button (#btn-bookmark-current) in the sidebar header
     * to also show visual feedback.
     */
    _initStarButton() {
        const btn = document.getElementById('btn-bookmark-current');
        if (!btn) return;

        // Update star icon state whenever the current file changes
        const origOpenFile = this.app.openFile.bind(this.app);
        const self = this;

        // Use a MutationObserver on breadcrumb to detect file changes
        const bc = document.getElementById('breadcrumb-path');
        if (bc) {
            const observer = new MutationObserver(() => self._updateStarState());
            observer.observe(bc, { childList: true, subtree: true });
        }

        this._updateStarState();
    }

    /**
     * Update the star button's active state based on current file.
     */
    _updateStarState() {
        const btn = document.getElementById('btn-bookmark-current');
        if (!btn) return;

        const isBookmarked = this.app.currentFile && (this.app.bookmarks || []).includes(this.app.currentFile);
        btn.classList.toggle('active', !!isBookmarked);
        btn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark current note';

        // Update icon fill
        const svg = btn.querySelector('svg');
        if (svg) {
            const path = svg.querySelector('path');
            if (path) {
                path.setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
            }
        }
    }

    /**
     * Override renderBookmarks to also update star state.
     */
    refresh() {
        this.app.renderBookmarks();
        this._updateStarState();
    }
}
