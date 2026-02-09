// Oxidian — Main Application Module
const { invoke } = window.__TAURI__.core;

import { Editor } from './editor.js';
import { Sidebar } from './sidebar.js';
import { Search } from './search.js';
import { TabManager } from './tabs.js';
import { ContextMenu } from './contextmenu.js';
import { GraphView } from './graph.js';
import { ThemeManager } from './themes.js';
import { SlashMenu } from './slash.js';
import { SettingsPage } from './settings.js';
import { Onboarding } from './onboarding.js';
import { PluginLoader } from './plugin-loader.js';
import { HyperMarkEditor } from './hypermark.js';

class OxidianApp {
    constructor() {
        this.currentFile = null;
        this.isDirty = false;
        this.editor = null;
        this.sidebar = null;
        this.search = null;
        this.tabManager = null;
        this.contextMenu = null;
        this.graphView = null;
        this.themeManager = null;
        this.slashMenu = null;
        this.settingsPage = null;
        this.onboarding = null;
        this.pluginLoader = null;
        this.splitPanes = [];
        this.hypermarkEditor = null;
        this.editorMode = localStorage.getItem('oxidian-editor-mode') || 'hypermark'; // 'classic' | 'hypermark'

        // Feature state
        this.focusMode = false;
        this.bookmarks = JSON.parse(localStorage.getItem('oxidian-bookmarks') || '[]');
        this.recentFiles = JSON.parse(localStorage.getItem('oxidian-recent') || '[]');

        // Split pane state
        this.rightEditor = null;
        this.rightFile = null;
        this.rightDirty = false;

        // Auto-save timer
        this._autoSaveTimer = null;

        this.init();
    }

    async init() {
        // Initialize components
        this.editor = new Editor(this);
        this.contextMenu = new ContextMenu(this);
        this.tabManager = new TabManager(this);
        this.sidebar = new Sidebar(this);
        this.search = new Search(this);
        this.themeManager = new ThemeManager(this);
        this.slashMenu = new SlashMenu(this);
        this.settingsPage = new SettingsPage(this);
        this.onboarding = new Onboarding(this);

        await this.themeManager.init();

        // Load and apply settings
        await this.applySettings();

        // Global navigation
        window.navigateToNote = (target) => this.navigateToNote(target);
        window.searchByTag = (tag) => this.searchByTag(tag);

        // Ribbon buttons
        document.querySelectorAll('.ribbon-btn[data-panel]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSidebarPanel(btn.dataset.panel);
                document.querySelectorAll('.ribbon-btn[data-panel]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.querySelector('.ribbon-btn[data-action="graph"]')?.addEventListener('click', () => this.openGraphView());
        document.querySelector('.ribbon-btn[data-action="daily"]')?.addEventListener('click', () => this.openDailyNote());
        document.querySelector('.ribbon-btn[data-action="settings"]')?.addEventListener('click', () => this.openSettingsTab());
        document.querySelector('.ribbon-btn[data-action="focus"]')?.addEventListener('click', () => this.toggleFocusMode());

        // Bookmarks
        document.getElementById('btn-bookmark-current')?.addEventListener('click', () => this.toggleBookmark());
        this.renderBookmarks();

        // Recent files
        document.getElementById('btn-clear-recent')?.addEventListener('click', () => { this.recentFiles = []; localStorage.setItem('oxidian-recent', '[]'); this.renderRecentFiles(); });
        this.renderRecentFiles();

        // Sidebar buttons
        document.getElementById('btn-new-note').addEventListener('click', () => this.showNewNoteDialog());
        document.getElementById('btn-new-folder').addEventListener('click', () => this.createNewFolder());
        document.getElementById('btn-refresh').addEventListener('click', () => this.sidebar.refresh());

        // Welcome screen
        document.getElementById('btn-welcome-daily').addEventListener('click', () => this.openDailyNote());
        document.getElementById('btn-welcome-new').addEventListener('click', () => this.showNewNoteDialog());

        // New note dialog
        document.getElementById('btn-dialog-cancel').addEventListener('click', () => this.hideNewNoteDialog());
        document.getElementById('btn-dialog-create').addEventListener('click', () => this.createNewNote());
        document.getElementById('new-note-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.createNewNote();
            if (e.key === 'Escape') this.hideNewNoteDialog();
        });

        // New folder dialog
        document.getElementById('btn-folder-cancel')?.addEventListener('click', () => this.hideNewFolderDialog());
        document.getElementById('btn-folder-create')?.addEventListener('click', () => this.createNewFolderFromDialog());
        document.getElementById('new-folder-name')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.createNewFolderFromDialog();
            if (e.key === 'Escape') this.hideNewFolderDialog();
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Sidebar resize
        this.initSidebarResize();

        // Window close handler — save dirty files before exit
        window.addEventListener('beforeunload', (e) => {
            if ((this.isDirty && this.currentFile) || (this.rightDirty && this.rightFile)) {
                // saveCurrentFile() is async and won't complete before the page unloads.
                // Fire it anyway (best-effort) and trigger the browser's confirmation dialog
                // to give the save a chance to complete.
                if (this.isDirty && this.currentFile) this.saveCurrentFile();
                if (this.rightDirty && this.rightFile) this.saveRightPaneFile();
                e.preventDefault();
                e.returnValue = '';
            }
        });

        // Check for first launch / onboarding
        const firstLaunch = await this.onboarding.shouldShow();
        if (firstLaunch) {
            this.onboarding.show();
        } else {
            // Check if vault is encrypted and needs unlocking
            await this.checkVaultLock();
        }

        // Load initial data
        await this.sidebar.refresh();
        await this.loadTags();

        // Initialize plugin loader
        try {
            this.pluginLoader = new PluginLoader(this);
            await this.pluginLoader.init();
        } catch (e) {
            console.error('Failed to initialize plugin loader:', e);
        }
    }

    async applySettings() {
        try {
            const settings = await invoke('get_settings');
            // Apply theme
            this.themeManager.applyTheme(settings.appearance.theme);
            if (settings.appearance.accent_color) {
                this.themeManager.setAccentColor(settings.appearance.accent_color);
            }
            // Apply editor settings
            document.documentElement.style.setProperty('--font-size-editor', settings.editor.font_size + 'px');
            document.documentElement.style.setProperty('--font-editor', settings.editor.font_family);
            document.documentElement.style.fontSize = settings.appearance.interface_font_size + 'px';
        } catch (err) {
            console.error('Failed to apply settings:', err);
        }
    }

    async checkVaultLock() {
        try {
            const locked = await invoke('is_vault_locked');
            if (locked) {
                this.showPasswordPrompt();
            }
        } catch {}
    }

    showPasswordPrompt() {
        const overlay = document.getElementById('password-dialog');
        if (overlay) {
            overlay.classList.remove('hidden');
            const input = overlay.querySelector('#vault-password-input');
            input?.focus();
        }
    }

    hidePasswordPrompt() {
        const overlay = document.getElementById('password-dialog');
        if (overlay) overlay.classList.add('hidden');
    }

    // ===== Tab callbacks =====

    onTabActivated(tab) {
        const pane = tab.pane || 0;
        if (tab.type === 'note') {
            this.showEditorPane(tab.path, pane);
        } else if (tab.type === 'graph') {
            this.showGraphPane(pane);
        } else if (tab.type === 'settings') {
            this.showSettingsPane(pane);
        }
    }

    onAllTabsClosed() {
        this.currentFile = null;
        this.showWelcome();
        this.clearPanes();
        this.updateBreadcrumb('');
    }

    // ===== File Operations =====

    async openFile(path) {
        // Cancel pending auto-save timer from previous file
        clearTimeout(this._autoSaveTimer);
        if (this.isDirty && this.currentFile) {
            await this.saveCurrentFile();
        }

        try {
            const content = await invoke('read_note', { path });
            const title = path.split('/').pop().replace('.md', '');
            this.tabManager.openTab(path, title, 'note');
            this.currentFile = path;
            this.isDirty = false;
            this.addRecentFile(path);

            this.ensureEditorPane();
            this.editor.setContent(content);
            this.sidebar.setActive(path);
            this.hideWelcome();
            this.updateBreadcrumb(path);
            this.loadBacklinks(path);
        } catch (err) {
            console.error('Failed to open file:', err);
        }
    }

    async openFileInSplit(path) {
        try {
            const content = await invoke('read_note', { path });
            const title = path.split('/').pop().replace('.md', '');

            if (!this.tabManager.splitActive) {
                this.tabManager.split();
            }
            this.tabManager.openTab(path, title, 'note', 1);
            this.showFileInRightPane(path, content);
        } catch (err) {
            console.error('Failed to open in split:', err);
        }
    }

    showEditorPane(path, pane = 0) {
        if (pane === 0) {
            if (path === this.currentFile) {
                this.ensureEditorPane();
                return;
            }
            this.loadFileIntoLeftPane(path);
        } else {
            // Right pane
            invoke('read_note', { path }).then(content => {
                this.showFileInRightPane(path, content);
            }).catch(console.error);
        }
    }

    async loadFileIntoLeftPane(path) {
        // Cancel pending auto-save timer from previous file
        clearTimeout(this._autoSaveTimer);
        if (this.isDirty && this.currentFile) {
            await this.saveCurrentFile();
        }
        try {
            const content = await invoke('read_note', { path });
            this.currentFile = path;
            this.isDirty = false;
            this.ensureEditorPane();
            this.editor.setContent(content);
            this.sidebar.setActive(path);
            this.hideWelcome();
            this.updateBreadcrumb(path);
            this.loadBacklinks(path);
        } catch (err) {
            console.error('Failed to load file into left pane:', err);
        }
    }

    showFileInRightPane(path, content) {
        this.rightFile = path;
        const rightPane = document.getElementById('right-pane');
        if (!rightPane) return;

        let textarea = rightPane.querySelector('.editor-textarea');
        let preview = rightPane.querySelector('.preview-content');
        if (textarea) {
            textarea.value = content;
            invoke('render_markdown', { content }).then(html => {
                if (preview) preview.innerHTML = html;
            });
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile || !this.isDirty) return;

        try {
            const content = this.editor.getContent();
            await invoke('save_note', { path: this.currentFile, content });
            this.isDirty = false;
            this.tabManager.markClean(this.currentFile);
        } catch (err) {
            console.error('Failed to save:', err);
        }
    }

    async saveRightPaneFile() {
        if (!this.rightFile || !this.rightDirty) return;
        const rightPane = document.getElementById('right-pane');
        if (!rightPane) return;
        const textarea = rightPane.querySelector('.editor-textarea');
        if (!textarea) return;
        try {
            await invoke('save_note', { path: this.rightFile, content: textarea.value });
            this.rightDirty = false;
            this.tabManager.markClean(this.rightFile);
        } catch (err) {
            console.error('Failed to save right pane:', err);
        }
    }

    async openDailyNote() {
        try {
            const path = await invoke('create_daily_note');
            await this.openFile(path);
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create daily note:', err);
        }
    }

    async navigateToNote(target) {
        let path = target;
        if (!path.endsWith('.md')) path = target + '.md';

        try {
            await invoke('read_note', { path });
            await this.openFile(path);
        } catch {
            const content = `# ${target}\n\n`;
            await invoke('save_note', { path, content });
            await this.openFile(path);
            await this.sidebar.refresh();
        }
    }

    async searchByTag(tag) {
        this.search.show();
        this.search.setQuery(`#${tag}`);
        await this.search.performSearch(`#${tag}`);
    }

    // ===== UI =====

    markDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            if (this.currentFile) {
                this.tabManager.markDirty(this.currentFile);
            }
        }
        // Debounced auto-save: save 2 seconds after last edit
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => {
            if (this.isDirty && this.currentFile) {
                this.saveCurrentFile();
            }
        }, 2000);
    }

    hideWelcome() {
        document.getElementById('welcome-screen').classList.add('hidden');
    }

    showWelcome() {
        document.getElementById('welcome-screen').classList.remove('hidden');
    }

    updateBreadcrumb(path) {
        const bc = document.getElementById('breadcrumb-path');
        if (!path) { bc.innerHTML = ''; return; }
        const parts = path.replace('.md', '').split('/');
        bc.innerHTML = parts.map((p, i) => {
            const sep = i < parts.length - 1 ? '<span class="breadcrumb-sep">›</span>' : '';
            return `<span class="breadcrumb-item">${this.escapeHtml(p)}</span>${sep}`;
        }).join('');
    }

    // ===== Pane Management =====

    ensureEditorPane() {
        const container = document.getElementById('pane-container');

        // Check if left pane already has an editor
        const leftPane = document.getElementById('left-pane');
        if (leftPane && (leftPane.querySelector('.editor-wrapper') || leftPane.querySelector('.hypermark-editor'))) return;

        // Remove non-editor content from left pane (graph, settings) without touching right pane
        if (leftPane) {
            leftPane.remove();
        } else if (!this.tabManager.splitActive) {
            const overlay = container.querySelector('.split-drop-overlay');
            container.innerHTML = '';
            if (overlay) container.appendChild(overlay);
        }

        // Destroy graph if it was in the left pane
        if (this.graphView) {
            this.graphView.destroy();
            this.graphView = null;
        }

        const pane = document.createElement('div');
        pane.className = 'pane';
        pane.id = 'left-pane';

        if (this.editorMode === 'hypermark') {
            // HyperMark block editor
            pane.innerHTML = `
                <div class="editor-wrapper" style="display:flex;flex:1;overflow:hidden;">
                    <div class="editor-pane-half" style="flex:1;display:flex;overflow:hidden;">
                        <div class="hypermark-editor" id="hypermark-root"></div>
                    </div>
                    <div class="preview-pane-half">
                        <div class="preview-content"></div>
                        <div class="backlinks-section hidden">
                            <h3>Backlinks</h3>
                            <div class="backlinks-list"></div>
                        </div>
                    </div>
                </div>
            `;
            container.insertBefore(pane, container.firstChild);

            const hmRoot = pane.querySelector('#hypermark-root');
            const preview = pane.querySelector('.preview-content');

            // Destroy old hypermark instance if any
            if (this.hypermarkEditor) {
                this.hypermarkEditor.destroy?.();
            }
            this.hypermarkEditor = new HyperMarkEditor(hmRoot, {
                onChange: (content) => {
                    this.markDirty();
                    // Update preview pane
                    if (preview && content.trim()) {
                        invoke('render_markdown', { content }).then(html => {
                            preview.innerHTML = html;
                        }).catch(() => {});
                    } else if (preview) {
                        preview.innerHTML = '<p style="color: var(--text-faint)">Preview will appear here...</p>';
                    }
                    // Update outline & stats
                    this.editor.updateStatsFromContent?.(content);
                    this.updateOutline?.(content);
                },
            });

            // Also attach the classic editor adapter (for getContent/stats)
            this.editor.attachHyperMark(this.hypermarkEditor, preview);
        } else {
            // Classic textarea editor
            pane.innerHTML = `
                <div class="editor-wrapper">
                    <div class="editor-pane-half">
                        <textarea class="editor-textarea" placeholder="Start writing... (Markdown supported)" spellcheck="true"></textarea>
                    </div>
                    <div class="preview-pane-half">
                        <div class="preview-content"></div>
                        <div class="backlinks-section hidden">
                            <h3>Backlinks</h3>
                            <div class="backlinks-list"></div>
                        </div>
                    </div>
                </div>
            `;
            container.insertBefore(pane, container.firstChild);

            const textarea = pane.querySelector('.editor-textarea');
            const preview = pane.querySelector('.preview-content');
            this.editor.attach(textarea, preview);
        }
    }

    /** Switch editor mode between 'classic' and 'hypermark'. Reopens current file. */
    setEditorMode(mode) {
        if (mode === this.editorMode) return;
        this.editorMode = mode;
        localStorage.setItem('oxidian-editor-mode', mode);

        // Force re-create editor pane with current content
        const content = this.editor.getContent();
        const leftPane = document.getElementById('left-pane');
        if (leftPane) leftPane.remove();
        if (this.hypermarkEditor) {
            this.hypermarkEditor.destroy?.();
            this.hypermarkEditor = null;
        }
        this.ensureEditorPane();
        if (content) {
            this.editor.setContent(content);
        }
    }

    createSplitLayout() {
        const container = document.getElementById('pane-container');

        // Don't duplicate
        if (document.getElementById('split-handle')) return;

        // Add split handle
        const handle = document.createElement('div');
        handle.className = 'pane-split-handle';
        handle.id = 'split-handle';
        container.appendChild(handle);

        // Right pane
        const rightPane = document.createElement('div');
        rightPane.className = 'pane';
        rightPane.id = 'right-pane';
        rightPane.innerHTML = `
            <div class="split-pane-wrapper">
                <div class="split-tab-bar" id="right-tab-bar">
                    <div class="tab-list-right" id="tab-list-right"></div>
                </div>
                <div class="editor-wrapper">
                    <div class="editor-pane-half">
                        <textarea class="editor-textarea" placeholder="Drag a tab here..." spellcheck="true"></textarea>
                    </div>
                    <div class="preview-pane-half">
                        <div class="preview-content"></div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(rightPane);

        // Set up right tab list reference in TabManager
        const rightTabList = rightPane.querySelector('#tab-list-right');
        this.tabManager.setRightTabList(rightTabList);

        // Right pane textarea events (with save support)
        const rightTextarea = rightPane.querySelector('.editor-textarea');
        const rightPreview = rightPane.querySelector('.preview-content');
        let rightSaveTimer = null;
        rightTextarea.addEventListener('input', () => {
            const content = rightTextarea.value;
            invoke('render_markdown', { content }).then(html => {
                rightPreview.innerHTML = html;
            });
            // Mark right pane dirty and auto-save
            this.rightDirty = true;
            if (this.rightFile) this.tabManager.markDirty(this.rightFile);
            clearTimeout(rightSaveTimer);
            rightSaveTimer = setTimeout(() => {
                this.saveRightPaneFile();
            }, 2000);
        });
        rightTextarea.addEventListener('blur', () => {
            if (this.rightDirty) this.saveRightPaneFile();
        });

        this.initSplitResize(handle);
    }

    removeSplitLayout() {
        const handle = document.getElementById('split-handle');
        const rightPane = document.getElementById('right-pane');
        if (handle) handle.remove();
        if (rightPane) rightPane.remove();
        this.tabManager.setRightTabList(null);
        this.rightFile = null;

        // Reset left pane flex
        const leftPane = document.getElementById('left-pane');
        if (leftPane) leftPane.style.flex = '';
    }

    clearPanes() {
        const container = document.getElementById('pane-container');
        if (this.graphView) {
            this.graphView.destroy();
            this.graphView = null;
        }
        // Preserve the drop overlay if it exists
        const overlay = container.querySelector('.split-drop-overlay');
        container.innerHTML = '';
        if (overlay) container.appendChild(overlay);
    }

    // ===== Graph View =====

    openGraphView() {
        this.tabManager.openTab('__graph__', 'Graph View', 'graph');
    }

    showGraphPane(pane = 0) {
        if (this.isDirty && this.currentFile) {
            this.saveCurrentFile();
        }

        this.hideWelcome();
        this.updateBreadcrumb('');

        if (pane === 0 && !this.tabManager.splitActive) {
            this.clearPanes();
            const container = document.getElementById('pane-container');
            const graphDiv = document.createElement('div');
            graphDiv.className = 'pane graph-pane';
            graphDiv.id = 'left-pane';
            container.insertBefore(graphDiv, container.firstChild);
            this.graphView = new GraphView(this, graphDiv);
        } else {
            // In split mode, replace the appropriate pane content
            const paneId = pane === 0 ? 'left-pane' : 'right-pane';
            let paneEl = document.getElementById(paneId);
            if (paneEl) {
                paneEl.innerHTML = '';
                paneEl.className = 'pane graph-pane';
            }
            if (paneEl) {
                this.graphView = new GraphView(this, paneEl);
            }
        }
    }

    // ===== Settings =====

    openSettingsTab() {
        this.tabManager.openTab('__settings__', 'Settings', 'settings');
    }

    showSettingsPane(pane = 0) {
        if (this.isDirty && this.currentFile) {
            this.saveCurrentFile();
        }

        this.hideWelcome();
        this.updateBreadcrumb('');

        if (pane === 0 && !this.tabManager.splitActive) {
            this.clearPanes();
            const container = document.getElementById('pane-container');
            const settingsDiv = document.createElement('div');
            settingsDiv.className = 'pane settings-pane';
            settingsDiv.id = 'left-pane';
            container.insertBefore(settingsDiv, container.firstChild);
            this.settingsPage.show(settingsDiv);
        } else {
            const paneId = pane === 0 ? 'left-pane' : 'right-pane';
            let paneEl = document.getElementById(paneId);
            if (paneEl) {
                paneEl.innerHTML = '';
                paneEl.className = 'pane settings-pane';
                this.settingsPage.show(paneEl);
            }
        }
    }

    showSettings() {
        this.openSettingsTab();
    }

    hideSettings() {
        // Legacy — now settings is a tab, closing it closes the tab
        const settingsDialog = document.getElementById('settings-dialog');
        if (settingsDialog) settingsDialog.classList.add('hidden');
    }

    // ===== New Note Dialog =====

    showNewNoteDialog() {
        const dialog = document.getElementById('new-note-dialog');
        const input = document.getElementById('new-note-name');
        dialog.classList.remove('hidden');
        input.value = '';
        input.focus();
    }

    hideNewNoteDialog() {
        document.getElementById('new-note-dialog').classList.add('hidden');
    }

    async createNewNote() {
        const input = document.getElementById('new-note-name');
        let name = input.value.trim();
        if (!name) return;
        if (!name.endsWith('.md')) name += '.md';

        const content = `# ${name.replace('.md', '')}\n\n`;

        try {
            await invoke('save_note', { path: name, content });
            this.hideNewNoteDialog();
            await this.openFile(name);
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    }

    async createNewFolder() {
        this.showNewFolderDialog();
    }

    showNewFolderDialog() {
        const dialog = document.getElementById('new-folder-dialog');
        const input = document.getElementById('new-folder-name');
        if (!dialog || !input) return;
        dialog.classList.remove('hidden');
        input.value = '';
        input.focus();
    }

    hideNewFolderDialog() {
        const dialog = document.getElementById('new-folder-dialog');
        if (dialog) dialog.classList.add('hidden');
    }

    async createNewFolderFromDialog() {
        const input = document.getElementById('new-folder-name');
        const name = input?.value.trim();
        if (!name) return;
        try {
            await invoke('create_folder', { path: name });
            this.hideNewFolderDialog();
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create folder:', err);
        }
    }

    // ===== File Operations (context menu) =====

    async deleteFile(path) {
        if (!confirm(`Delete "${path}"?`)) return;
        try {
            await invoke('delete_note', { path });
            const tab = this.tabManager.tabs.find(t => t.path === path);
            if (tab) this.tabManager.closeTab(tab.id);
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    }

    async duplicateFile(path) {
        try {
            const newPath = await invoke('duplicate_note', { path });
            await this.sidebar.refresh();
            await this.openFile(newPath);
        } catch (err) {
            console.error('Failed to duplicate:', err);
        }
    }

    startRename(path) {
        const item = this.sidebar.container.querySelector(`[data-path="${path}"]`);
        if (!item) return;

        const nameSpan = item.querySelector('.name');
        const oldName = nameSpan.textContent;
        const input = document.createElement('input');
        input.className = 'rename-input';
        input.value = oldName;

        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        const finish = async () => {
            let newName = input.value.trim();
            if (!newName || newName === oldName) {
                input.replaceWith(nameSpan);
                return;
            }

            const parts = path.split('/');
            parts[parts.length - 1] = newName.endsWith('.md') ? newName : newName + '.md';
            const newPath = parts.join('/');

            try {
                await invoke('rename_file', { oldPath: path, newPath });
                await this.sidebar.refresh();
                // Update tab entry
                const tab = this.tabManager.tabs.find(t => t.path === path);
                if (tab) {
                    tab.path = newPath;
                    tab.title = newName.replace('.md', '');
                    this.tabManager.renderTabs();
                }
                if (this.currentFile === path) {
                    this.currentFile = newPath;
                    this.updateBreadcrumb(newPath);
                }
            } catch (err) {
                console.error('Rename failed:', err);
                input.replaceWith(nameSpan);
            }
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = oldName; input.blur(); }
        });
    }

    // ===== Tags =====

    async loadTags() {
        try {
            const tags = await invoke('get_tags');
            const container = document.getElementById('tags-list');
            container.innerHTML = '';

            tags.forEach(tag => {
                const pill = document.createElement('span');
                pill.className = 'tag-pill';
                pill.textContent = `#${tag}`;
                pill.addEventListener('click', () => this.searchByTag(tag));
                container.appendChild(pill);
            });
        } catch (err) {
            console.error('Failed to load tags:', err);
        }
    }

    // ===== Backlinks =====

    async loadBacklinks(path) {
        try {
            const backlinks = await invoke('get_backlinks', { notePath: path });
            const count = document.getElementById('backlink-count');
            if (count) count.textContent = `${backlinks.length} backlinks`;

            const container = document.getElementById('pane-container');
            const section = container.querySelector('.backlinks-section');
            const list = container.querySelector('.backlinks-list');
            if (!section || !list) return;

            if (backlinks.length === 0) { section.classList.add('hidden'); return; }

            section.classList.remove('hidden');
            list.innerHTML = '';

            backlinks.forEach(link => {
                const item = document.createElement('div');
                item.className = 'backlink-item';
                item.textContent = link.replace('.md', '');
                item.addEventListener('click', () => this.openFile(link));
                list.appendChild(item);
            });
        } catch (err) {
            console.error('Failed to load backlinks:', err);
        }
    }

    // ===== Sidebar Panel Switching =====

    switchSidebarPanel(name) {
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`panel-${name}`);
        if (panel) panel.classList.add('active');

        document.querySelectorAll('.ribbon-btn[data-panel]').forEach(b => {
            b.classList.toggle('active', b.dataset.panel === name);
        });

        // Refresh outline when switching to it
        if (name === 'outline' && this.editor?.textarea) {
            this.updateOutline(this.editor.textarea.value);
        }
    }

    // ===== Sidebar Resize =====

    initSidebarResize() {
        const handle = document.getElementById('sidebar-resize');
        const sidebar = document.getElementById('sidebar');
        const ribbon = document.getElementById('ribbon');
        let isResizing = false;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            handle.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const ribbonW = ribbon.getBoundingClientRect().width;
            const newWidth = Math.max(180, Math.min(500, e.clientX - ribbonW));
            sidebar.style.width = `${newWidth}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    initSplitResize(handle) {
        let isResizing = false;
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        const mousemove = (e) => {
            if (!isResizing) return;
            const container = document.getElementById('pane-container');
            const rect = container.getBoundingClientRect();
            const panes = container.querySelectorAll('.pane');
            if (panes.length < 2) return;
            const ratio = (e.clientX - rect.left) / rect.width;
            panes[0].style.flex = `${ratio}`;
            panes[1].style.flex = `${1 - ratio}`;
        };

        const mouseup = () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    }

    // ===== Keyboard Shortcuts =====

    handleKeyboard(e) {
        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && e.key === 's') {
            e.preventDefault();
            this.saveCurrentFile();
        } else if (ctrl && e.key === 'n') {
            e.preventDefault();
            this.showNewNoteDialog();
        } else if (ctrl && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.search.show();
        } else if (ctrl && e.key === 'd') {
            e.preventDefault();
            this.openDailyNote();
        } else if (ctrl && e.key === 'e') {
            e.preventDefault();
            this.editor.togglePreview();
        } else if (ctrl && e.key === 'w') {
            e.preventDefault();
            const active = this.tabManager.getActiveTab();
            if (active) this.tabManager.closeTab(active.id);
        } else if (ctrl && e.key === ',') {
            e.preventDefault();
            this.openSettingsTab();
        } else if (ctrl && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            this.toggleFocusMode();
        } else if (e.key === 'Escape') {
            this.hideNewNoteDialog();
            this.hideNewFolderDialog();
            this.hideSettings();
            this.contextMenu.hide();
            this.slashMenu?.hide();
            // Close command palette if open
            const palette = document.getElementById('command-palette-overlay');
            if (palette) palette.remove();
        }
    }

    // ===== Focus Mode =====

    toggleFocusMode() {
        this.focusMode = !this.focusMode;
        const ribbon = document.getElementById('ribbon');
        const sidebar = document.getElementById('sidebar');
        const sidebarResize = document.getElementById('sidebar-resize');
        const tabBar = document.getElementById('tab-bar');
        const breadcrumb = document.getElementById('breadcrumb-bar');
        const statusbar = document.getElementById('statusbar');
        const focusBtn = document.querySelector('.ribbon-btn[data-action="focus"]');

        if (this.focusMode) {
            ribbon?.classList.add('hidden');
            sidebar?.classList.add('hidden');
            sidebarResize?.classList.add('hidden');
            tabBar?.classList.add('hidden');
            breadcrumb?.classList.add('hidden');
            statusbar?.classList.add('hidden');
            focusBtn?.classList.add('active');
        } else {
            ribbon?.classList.remove('hidden');
            sidebar?.classList.remove('hidden');
            sidebarResize?.classList.remove('hidden');
            tabBar?.classList.remove('hidden');
            breadcrumb?.classList.remove('hidden');
            statusbar?.classList.remove('hidden');
            focusBtn?.classList.remove('active');
        }
    }

    // ===== Bookmarks =====

    toggleBookmark(path) {
        const file = path || this.currentFile;
        if (!file) return;
        const idx = this.bookmarks.indexOf(file);
        if (idx >= 0) {
            this.bookmarks.splice(idx, 1);
        } else {
            this.bookmarks.unshift(file);
        }
        localStorage.setItem('oxidian-bookmarks', JSON.stringify(this.bookmarks));
        this.renderBookmarks();
    }

    renderBookmarks() {
        const list = document.getElementById('bookmarks-list');
        if (!list) return;
        if (this.bookmarks.length === 0) {
            list.innerHTML = '';
            list.className = 'empty-panel-message';
            list.textContent = 'No bookmarks yet. Click + to bookmark current note.';
            return;
        }
        list.className = 'bookmarks-items';
        list.innerHTML = '';
        this.bookmarks.forEach(path => {
            const item = document.createElement('div');
            item.className = 'tree-item bookmark-item';
            const name = path.replace('.md', '').split('/').pop();
            item.innerHTML = `
                <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></span>
                <span class="name">${this.escapeHtml(name)}</span>
                <span class="bookmark-remove" title="Remove bookmark">×</span>
            `;
            item.querySelector('.name').addEventListener('click', () => this.openFile(path));
            item.querySelector('.bookmark-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBookmark(path);
            });
            list.appendChild(item);
        });
    }

    // ===== Recent Files =====

    addRecentFile(path) {
        if (!path || path.startsWith('__')) return;
        this.recentFiles = this.recentFiles.filter(p => p !== path);
        this.recentFiles.unshift(path);
        if (this.recentFiles.length > 20) this.recentFiles.length = 20;
        localStorage.setItem('oxidian-recent', JSON.stringify(this.recentFiles));
        this.renderRecentFiles();
    }

    renderRecentFiles() {
        const list = document.getElementById('recent-list');
        if (!list) return;
        if (this.recentFiles.length === 0) {
            list.innerHTML = '';
            list.className = 'empty-panel-message';
            list.textContent = 'No recent files';
            return;
        }
        list.className = 'recent-items';
        list.innerHTML = '';
        this.recentFiles.forEach(path => {
            const item = document.createElement('div');
            item.className = 'tree-item recent-item';
            const name = path.replace('.md', '').split('/').pop();
            const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
            item.innerHTML = `
                <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                <span class="name">${this.escapeHtml(name)}</span>
                ${folder ? `<span class="recent-folder">${this.escapeHtml(folder)}</span>` : ''}
            `;
            item.addEventListener('click', () => this.openFile(path));
            list.appendChild(item);
        });
    }

    // ===== Outline / Table of Contents =====

    updateOutline(content) {
        const list = document.getElementById('outline-list');
        if (!list) return;
        const panel = document.getElementById('panel-outline');
        if (!panel || !panel.classList.contains('active')) return;

        const headings = [];
        const lines = (content || '').split('\n');
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(#{1,6})\s+(.+)/);
            if (match) {
                headings.push({ level: match[1].length, text: match[2].replace(/[#*`\[\]]/g, ''), line: i });
            }
        }

        if (headings.length === 0) {
            list.className = 'empty-panel-message';
            list.textContent = 'No headings found';
            return;
        }

        list.className = 'outline-items';
        list.innerHTML = '';
        headings.forEach(h => {
            const item = document.createElement('div');
            item.className = 'outline-item';
            item.style.paddingLeft = `${(h.level - 1) * 16 + 12}px`;
            item.innerHTML = `<span class="outline-h-level">H${h.level}</span> ${this.escapeHtml(h.text)}`;
            item.addEventListener('click', () => {
                if (!this.editor?.textarea) return;
                const ta = this.editor.textarea;
                const lines = ta.value.split('\n');
                let pos = 0;
                for (let i = 0; i < h.line && i < lines.length; i++) {
                    pos += lines[i].length + 1;
                }
                ta.selectionStart = ta.selectionEnd = pos;
                ta.focus();
                // Scroll textarea to the heading
                const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
                ta.scrollTop = h.line * lineHeight - ta.clientHeight / 3;
            });
            list.appendChild(item);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new OxidianApp();
});
