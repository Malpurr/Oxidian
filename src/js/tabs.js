// Oxidian — Tab Management with Split Pane Support
export class TabManager {
    constructor(app) {
        this.app = app;
        this.tabs = []; // { id, path, title, type:'note'|'graph'|'settings', dirty, pane:0|1 }
        this.activeTabId = null;
        this.tabList = document.getElementById('tab-list');
        this.tabListRight = null; // created on split
        this.nextId = 1;
        this.splitActive = false;
        this.dragState = null;
        this._dropOverlay = null;

        this.initDragDrop();
    }

    openTab(path, title, type = 'note', pane = 0) {
        const existing = this.tabs.find(t => t.path === path && t.type === type);
        if (existing) {
            this.activateTab(existing.id);
            return existing.id;
        }

        const tab = {
            id: this.nextId++,
            path,
            title: title || path.split('/').pop().replace('.md', ''),
            type,
            dirty: false,
            pane,
        };
        this.tabs.push(tab);
        this.renderTabs();
        this.activateTab(tab.id);
        return tab.id;
    }

    activateTab(id, forceUpdate = false) {
        const changed = this.activeTabId !== id;
        if (!changed && !forceUpdate) return;
        this.activeTabId = id;
        this.renderTabs();

        const tab = this.tabs.find(t => t.id === id);
        if (!tab) return;
        this.app.onTabActivated(tab);
    }

    closeTab(id) {
        const idx = this.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;

        const closedTab = this.tabs[idx];
        const wasActive = this.activeTabId === id;
        this.tabs.splice(idx, 1);

        // If no tabs in right pane, unsplit
        if (this.splitActive && !this.tabs.some(t => t.pane === 1)) {
            this.unsplit();
        }

        if (wasActive) {
            if (this.tabs.length > 0) {
                // Prefer a tab in the same pane
                const samePane = this.tabs.filter(t => t.pane === closedTab.pane);
                if (samePane.length > 0) {
                    const newIdx = Math.min(idx, samePane.length - 1);
                    this.activeTabId = samePane[newIdx].id;
                    this.app.onTabActivated(samePane[newIdx]);
                } else {
                    const newIdx = Math.min(idx, this.tabs.length - 1);
                    this.activeTabId = this.tabs[newIdx].id;
                    this.app.onTabActivated(this.tabs[newIdx]);
                }
            } else {
                this.activeTabId = null;
                this.app.onAllTabsClosed();
            }
        }
        this.renderTabs();
    }

    moveTabToPane(tabId, targetPane) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        if (tab.pane === targetPane) return;

        if (targetPane === 1 && !this.splitActive) {
            this.split();
        }

        tab.pane = targetPane;

        // Auto-unsplit if right pane is now empty
        if (this.splitActive && !this.tabs.some(t => t.pane === 1)) {
            this.unsplit();
        } else {
            this.renderTabs();
            this.activateTab(tabId, true);
        }
    }

    split() {
        if (this.splitActive) return;
        this.splitActive = true;
        this.app.createSplitLayout();
        this.renderTabs();
    }

    unsplit() {
        if (!this.splitActive) return;
        this.splitActive = false;
        // Move all tabs to pane 0
        this.tabs.forEach(t => t.pane = 0);
        this.app.removeSplitLayout();
        this.renderTabs();

        // Activate first tab after unsplit
        if (this.tabs.length > 0) {
            this.activateTab(this.tabs[0].id, true);
        }
    }

    markDirty(path) {
        const tab = this.tabs.find(t => t.path === path && t.type === 'note');
        if (tab) { tab.dirty = true; this.renderTabs(); }
    }

    markClean(path) {
        const tab = this.tabs.find(t => t.path === path && t.type === 'note');
        if (tab) { tab.dirty = false; this.renderTabs(); }
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId) || null;
    }

    renderTabs() {
        // Left pane tabs
        this.renderTabList(this.tabList, 0);

        // Right pane tabs
        if (this.splitActive && this.tabListRight) {
            this.renderTabList(this.tabListRight, 1);
        }
    }

    renderTabList(container, pane) {
        if (!container) return;
        container.innerHTML = '';
        const paneTabs = this.tabs.filter(t => t.pane === pane);

        for (const tab of paneTabs) {
            const el = document.createElement('div');
            el.className = 'tab' + (tab.id === this.activeTabId ? ' active' : '');
            el.setAttribute('data-tab-id', tab.id);
            el.setAttribute('draggable', 'true');

            const iconSvg = tab.type === 'graph'
                ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M8.5 7.5L15.5 16.5M15.5 7.5L8.5 16.5"/></svg>'
                : tab.type === 'settings'
                ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
                : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

            const dirtyDot = tab.dirty ? '<span style="color:var(--text-yellow);margin-left:2px">●</span>' : '';

            el.innerHTML = `
                <span class="tab-icon">${iconSvg}</span>
                <span class="tab-title">${this.escapeHtml(tab.title)}${dirtyDot}</span>
                <span class="tab-close">✕</span>
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.tab-close')) {
                    this.closeTab(tab.id);
                } else {
                    this.activateTab(tab.id);
                }
            });

            el.addEventListener('mousedown', (e) => {
                if (e.button === 1) { e.preventDefault(); this.closeTab(tab.id); }
            });

            // Drag events — tab reorder within same pane + split pane support
            el.addEventListener('dragstart', (e) => {
                this.dragState = { tabId: tab.id, fromPane: tab.pane };
                e.dataTransfer.setData('text/plain', tab.id.toString());
                e.dataTransfer.effectAllowed = 'move';
                el.classList.add('dragging');
                // Brief delay so the browser captures the ghost first
                requestAnimationFrame(() => el.classList.add('drag-ghost'));
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('dragging', 'drag-ghost');
                this.dragState = null;
                this._hideDropOverlay();
                this._clearDropIndicators(container);
            });

            el.addEventListener('dragover', (e) => {
                if (!this.dragState) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                // Show insertion indicator
                const rect = el.getBoundingClientRect();
                const midX = rect.left + rect.width / 2;
                this._clearDropIndicators(container);
                if (e.clientX < midX) {
                    el.classList.add('drop-before');
                } else {
                    el.classList.add('drop-after');
                }
            });

            el.addEventListener('dragleave', () => {
                el.classList.remove('drop-before', 'drop-after');
            });

            el.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.dragState) return;
                const draggedId = this.dragState.tabId;
                const targetId = tab.id;
                if (draggedId === targetId) return;

                // Determine position
                const rect = el.getBoundingClientRect();
                const insertBefore = e.clientX < rect.left + rect.width / 2;

                // Reorder within the tabs array
                const dragIdx = this.tabs.findIndex(t => t.id === draggedId);
                const targetIdx = this.tabs.findIndex(t => t.id === targetId);
                if (dragIdx === -1 || targetIdx === -1) return;

                const [draggedTab] = this.tabs.splice(dragIdx, 1);
                // If dragging to a different pane, move it
                draggedTab.pane = tab.pane;
                let insertIdx = this.tabs.findIndex(t => t.id === targetId);
                if (!insertBefore) insertIdx++;
                this.tabs.splice(insertIdx, 0, draggedTab);

                this._clearDropIndicators(container);
                this.dragState = null;
                this._hideDropOverlay();
                this.renderTabs();
            });

            container.appendChild(el);
        }
    }

    _clearDropIndicators(container) {
        if (!container) return;
        container.querySelectorAll('.tab').forEach(t => t.classList.remove('drop-before', 'drop-after'));
    }

    _createDropOverlay() {
        if (this._dropOverlay) return this._dropOverlay;

        const overlay = document.createElement('div');
        overlay.className = 'split-drop-overlay';
        overlay.innerHTML = `
            <div class="split-drop-zone split-drop-left" data-pane="0">
                <div class="split-drop-label">◀ Left Pane</div>
            </div>
            <div class="split-drop-zone split-drop-right" data-pane="1">
                <div class="split-drop-label">Right Pane ▶</div>
            </div>
        `;

        // Prevent default on zones to allow drop
        overlay.querySelectorAll('.split-drop-zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            zone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                zone.classList.add('active');
            });
            zone.addEventListener('dragleave', (e) => {
                // Only remove if leaving the zone itself (not entering a child)
                if (!zone.contains(e.relatedTarget)) {
                    zone.classList.remove('active');
                }
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!this.dragState) return;
                const targetPane = parseInt(zone.dataset.pane);
                this.moveTabToPane(this.dragState.tabId, targetPane);
                this.dragState = null;
                this._hideDropOverlay();
            });
        });

        this._dropOverlay = overlay;
        return overlay;
    }

    _showDropOverlay() {
        const container = document.getElementById('pane-container');
        if (!container) return;
        const overlay = this._createDropOverlay();
        if (!overlay.parentElement) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        overlay.classList.add('visible');
    }

    _hideDropOverlay() {
        if (this._dropOverlay) {
            this._dropOverlay.classList.remove('visible');
            this._dropOverlay.querySelectorAll('.split-drop-zone').forEach(z => z.classList.remove('active'));
        }
    }

    initDragDrop() {
        const handleDragOver = (e) => {
            if (!this.dragState) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            // Show drop overlay on the pane container
            const container = document.getElementById('pane-container');
            if (container && container.contains(e.target) || e.target === container) {
                this._showDropOverlay();
            }
        };

        const handleDragLeave = (e) => {
            if (!this.dragState) return;
            const container = document.getElementById('pane-container');
            // Hide overlay when leaving the pane container entirely
            if (container && !container.contains(e.relatedTarget)) {
                this._hideDropOverlay();
            }
        };

        const handleDrop = (e) => {
            // Drop on the overlay zones is handled by zone event listeners
            // This is a fallback for drops outside the zones
            if (!this.dragState) return;
            this._hideDropOverlay();
            this.dragState = null;
        };

        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('drop', handleDrop);
    }

    setRightTabList(el) {
        this.tabListRight = el;
        if (el) this.renderTabs();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
