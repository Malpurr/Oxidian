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
import { UpdateManager } from './update.js';
import { BacklinksManager } from './backlinks.js';
import { TemplateManager } from './templates.js';
import { QuickSwitcher } from './quickswitcher.js';
import { CalloutProcessor } from './callouts.js';
import { MermaidRenderer } from './mermaid-renderer.js';
import { FindReplace } from './find-replace.js';
import { EmbedProcessor } from './embeds.js';
import { FrontmatterProcessor } from './frontmatter.js';
import { LinkHandler } from './link-handler.js';
import { NavHistory } from './nav-history.js';

// NEW OBSIDIAN CORE FEATURES
import { LivePreview } from './live-preview.js';
import { WikilinksAutoComplete } from './wikilinks.js';
import { TagAutoComplete } from './tag-autocomplete.js';
import { DragDrop } from './drag-drop.js';
import { MultipleCursors } from './multiple-cursors.js';
import { Folding } from './folding.js';
import { PropertiesPanel } from './properties-panel.js';
import { HoverPreview } from './hover-preview.js';
import { Canvas } from './canvas.js';
import { CommandPalette } from './command-palette.js';
import { BookmarksManager } from './bookmarks.js';
import { DailyNotes } from './daily-notes.js';
import { Remember } from './remember.js';
import { RememberDashboard } from './remember-dashboard.js';
import { RememberExtract } from './remember-extract.js';
import { RememberSources } from './remember-sources.js';
import { RememberCards } from './remember-cards.js';
import { startReviewSession } from './remember-review.js';

// DOM Safety Helpers
function safeGetElement(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element not found: ${id}`);
    return el;
}

function safeQuerySelector(selector) {
    const el = document.querySelector(selector);
    if (!el) console.warn(`Element not found: ${selector}`);
    return el;
}

function safeQuerySelectorAll(selector) {
    return document.querySelectorAll(selector) || [];
}

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
        this.updateManager = null;
        this.backlinksManager = null;
        this.templateManager = null;
        this.quickSwitcher = null;
        this.calloutProcessor = null;
        this.mermaidRenderer = null;
        this.findReplace = null;
        this.embedProcessor = null;
        this.frontmatterProcessor = null;
        this.linkHandler = null;
        this.splitPanes = [];
        this.hypermarkEditor = null;
        this.editorMode = localStorage.getItem('oxidian-editor-mode') || 'classic'; // 'classic' | 'hypermark'

        // NEW OBSIDIAN CORE FEATURES
        this.livePreview = null;
        this.wikilinksAutoComplete = null;
        this.tagAutoComplete = null;
        this.dragDrop = null;
        this.multipleCursors = null;
        this.folding = null;
        this.propertiesPanel = null;
        this.hoverPreview = null;
        this.canvas = null;
        this.navHistory = null;
        this.commandPalette = null;
        this.bookmarksManagerModule = null;
        this.dailyNotes = null;

        // Feature state
        this.focusMode = false;
        this.bookmarks = JSON.parse(localStorage.getItem('oxidian-bookmarks') || '[]');
        this.recentFiles = JSON.parse(localStorage.getItem('oxidian-recent') || '[]');

        // View mode per tab: 'live-preview' | 'source' | 'reading'
        this.viewMode = 'live-preview';
        this.backlinksPanelOpen = false;

        // Split pane state
        this.rightEditor = null;
        this.rightFile = null;
        this.rightDirty = false;

        // Auto-save timer
        this._autoSaveTimer = null;

        // *** RACE CONDITION FIXES ***
        this._fileOperationMutex = false; // Simple mutex to prevent concurrent openFile calls
        this._saveQueue = []; // Queue for save operations to prevent parallel saves
        this._currentSavePromise = null; // Track ongoing save operation

        // *** ERROR HANDLING ***
        this._errorToastContainer = null; // For user error notifications

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
        this.updateManager = new UpdateManager(this);
        this.backlinksManager = new BacklinksManager(this);
        this.templateManager = new TemplateManager(this);
        this.quickSwitcher = new QuickSwitcher(this);
        this.calloutProcessor = new CalloutProcessor();
        this.mermaidRenderer = new MermaidRenderer();
        this.findReplace = new FindReplace(this);
        this.embedProcessor = new EmbedProcessor(this);
        this.frontmatterProcessor = new FrontmatterProcessor(this);
        this.linkHandler = new LinkHandler(this);

        // Initialize NEW OBSIDIAN CORE FEATURES (each wrapped in try/catch for stability)
        const safeInitModule = (name, factory) => {
            try {
                return factory();
            } catch (err) {
                console.error(`[Oxidian] Failed to initialize module "${name}":`, err);
                return null;
            }
        };

        this.livePreview = safeInitModule('LivePreview', () => new LivePreview(this));
        this.wikilinksAutoComplete = safeInitModule('WikilinksAutoComplete', () => new WikilinksAutoComplete(this));
        this.tagAutoComplete = safeInitModule('TagAutoComplete', () => new TagAutoComplete(this));
        this.dragDrop = safeInitModule('DragDrop', () => new DragDrop(this));
        this.multipleCursors = safeInitModule('MultipleCursors', () => new MultipleCursors(this));
        // DISABLED: Folding module is destructive — replaces content with fold markers, data loss risk on save
        // this.folding = safeInitModule('Folding', () => new Folding(this));
        this.folding = null;
        this.propertiesPanel = safeInitModule('PropertiesPanel', () => new PropertiesPanel(this));
        this.hoverPreview = safeInitModule('HoverPreview', () => new HoverPreview(this));
        this.canvas = safeInitModule('Canvas', () => new Canvas(this));
        this.navHistory = safeInitModule('NavHistory', () => new NavHistory(this));
        this.commandPalette = safeInitModule('CommandPalette', () => new CommandPalette(this));
        this.bookmarksManagerModule = safeInitModule('BookmarksManager', () => new BookmarksManager(this));
        this.dailyNotes = safeInitModule('DailyNotes', () => new DailyNotes(this));
        // PERF: Lazy-load Remember system — only init when Remember tab is opened
        // This saves ~100+ IPC calls on startup (reading all Cards/ and Sources/)
        this.remember = null;
        this.rememberDashboard = null;
        this.rememberExtract = null;
        this.rememberSources = null;
        this.rememberCards = null;
        this._rememberInitialized = false;
        this.rememberReview = {
            startReview: (dueCards) => startReviewSession(this)
        };

        // PERF: File tree cache — avoids 12+ independent list_files IPC calls
        this._fileTreeCache = null;
        this._fileTreeCacheTime = 0;
        this._fileTreeCacheTTL = 5000; // 5 seconds

        await this.themeManager.init();

        // Load and apply settings
        await this.applySettings();

        // Global navigation
        window.navigateToNote = (target) => this.navigateToNote(target);
        window.searchByTag = (tag) => this.searchByTag(tag);

        // Ribbon buttons
        const ribbonButtons = document.querySelectorAll('.ribbon-btn[data-panel]');
        if (ribbonButtons) {
            ribbonButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.switchSidebarPanel(btn.dataset.panel);
                    const allRibbonBtns = document.querySelectorAll('.ribbon-btn[data-panel]');
                    if (allRibbonBtns) allRibbonBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Remember panel: lazy-init then show dashboard
                    if (btn.dataset.panel === 'remember') {
                        this.initRemember().then(() => {
                            if (this.rememberDashboard) {
                                this.rememberDashboard.show();
                            } else if (this.remember) {
                                this.remember.refreshDashboard();
                            }
                        });
                    }
                });
            });
        }

        document.querySelector('.ribbon-btn[data-action="graph"]')?.addEventListener('click', () => this.openGraphView());
        document.querySelector('.ribbon-btn[data-action="canvas"]')?.addEventListener('click', () => this.openCanvasView());
        document.querySelector('.ribbon-btn[data-action="daily"]')?.addEventListener('click', () => this.openDailyNote());
        document.querySelector('.ribbon-btn[data-action="settings"]')?.addEventListener('click', () => this.openSettingsTab());
        document.querySelector('.ribbon-btn[data-action="focus"]')?.addEventListener('click', () => this.toggleFocusMode());

        // View toolbar buttons
        document.getElementById('btn-view-mode')?.addEventListener('click', () => this.cycleViewMode());
        document.getElementById('btn-backlinks')?.addEventListener('click', () => this.toggleBacklinksPanel());
        document.getElementById('btn-more-options')?.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMoreOptions(); });
        document.getElementById('btn-close-backlinks')?.addEventListener('click', () => this.toggleBacklinksPanel(false));

        // More options menu actions
        document.getElementById('more-options-menu')?.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item || item.classList.contains('disabled')) return;
            this.handleMoreOption(item.dataset.action);
            document.getElementById('more-options-menu')?.classList.add('hidden');
        });

        // Close dropdown on outside click
        document.addEventListener('click', () => {
            document.getElementById('more-options-menu')?.classList.add('hidden');
        });

        // Bookmarks
        document.getElementById('btn-bookmark-current')?.addEventListener('click', () => this.toggleBookmark());
        this.renderBookmarks();

        // Recent files
        document.getElementById('btn-clear-recent')?.addEventListener('click', () => { this.recentFiles = []; localStorage.setItem('oxidian-recent', '[]'); this.renderRecentFiles(); });
        this.renderRecentFiles();

        // Sidebar buttons
        document.getElementById('btn-new-note')?.addEventListener('click', () => this.showNewNoteDialog());
        document.getElementById('btn-new-folder')?.addEventListener('click', () => this.createNewFolder());
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.sidebar.refresh());

        // Welcome screen
        document.getElementById('btn-welcome-daily')?.addEventListener('click', () => this.openDailyNote());
        document.getElementById('btn-welcome-new')?.addEventListener('click', () => this.showNewNoteDialog());

        // New note dialog
        document.getElementById('btn-dialog-cancel')?.addEventListener('click', () => this.hideNewNoteDialog());
        document.getElementById('btn-dialog-create')?.addEventListener('click', () => this.createNewNote());
        document.getElementById('new-note-name')?.addEventListener('keydown', (e) => {
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
        
        // Initialize File Explorer drag & drop after sidebar is loaded
        this.initFileExplorerDragDrop();

        // Initialize plugin loader
        try {
            this.pluginLoader = new PluginLoader(this);
            await this.pluginLoader.init();
        } catch (e) {
            console.error('Failed to initialize plugin loader:', e);
        }

        // Check for updates (non-blocking)
        this.updateManager.checkOnStartup();

        // Hash-based routing
        if (window.location.hash === '#remember') {
            this.openRememberDashboard();
        }
        window.addEventListener('hashchange', () => {
            if (window.location.hash === '#remember') {
                this.openRememberDashboard();
            }
        });
    }

    // PERF FIX: Cached file tree — reduces 12+ IPC calls to 1 per 5s
    async getFileTree() {
        const now = Date.now();
        if (this._fileTreeCache && (now - this._fileTreeCacheTime) < this._fileTreeCacheTTL) {
            return this._fileTreeCache;
        }
        this._fileTreeCache = await invoke('list_files');
        this._fileTreeCacheTime = now;
        return this._fileTreeCache;
    }

    invalidateFileTreeCache() {
        this._fileTreeCache = null;
        this._fileTreeCacheTime = 0;
    }

    // PERF FIX: Lazy-init Remember system
    async initRemember() {
        if (this._rememberInitialized) return;
        this._rememberInitialized = true;

        const safeInitModule = (name, factory) => {
            try { return factory(); } catch (err) {
                console.error(`[Oxidian] Failed to initialize module "${name}":`, err);
                return null;
            }
        };

        console.log('[Oxidian] Lazy-loading Remember system...');
        this.remember = safeInitModule('Remember', () => new Remember(this));
        this.rememberDashboard = safeInitModule('RememberDashboard', () => new RememberDashboard(this));
        this.rememberExtract = safeInitModule('RememberExtract', () => new RememberExtract(this));
        this.rememberSources = safeInitModule('RememberSources', () => new RememberSources(this));
        this.rememberCards = safeInitModule('RememberCards', () => new RememberCards(this));
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
            // Restore per-tab view mode
            if (tab.viewMode) {
                this.viewMode = tab.viewMode;
            } else {
                tab.viewMode = this.viewMode;
            }
            this.updateViewModeButton();
            this.showEditorPane(tab.path, pane);
        } else if (tab.type === 'graph') {
            this.showGraphPane(pane);
        } else if (tab.type === 'settings') {
            this.showSettingsPane(pane);
        } else if (tab.type === 'canvas') {
            this.showCanvasPane(pane);
        } else if (tab.type === 'remember') {
            this.showRememberPane(pane);
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
        // *** FIX: Prevent race conditions with mutex ***
        if (this._fileOperationMutex) {
            console.warn('File operation already in progress, ignoring openFile call for:', path);
            return;
        }
        
        this._fileOperationMutex = true;
        
        try {
            // Cancel pending auto-save timer from previous file
            clearTimeout(this._autoSaveTimer);
            if (this.isDirty && this.currentFile) {
                await this.saveCurrentFile();
            }

            // Read file content BEFORE setting currentFile (race condition fix)
            let content;
            try {
                content = await invoke('read_note', { path });
            } catch (error) {
                console.error('Failed to read note:', path, error);
                return;
            }
            
            // *** FIX: Only set currentFile AFTER successful load ***
            const title = path.split('/').pop().replace('.md', '');
            this.tabManager.openTab(path, title, 'note');
            
            // Set state only after successful operations
            this.currentFile = path;
            this.isDirty = false;
            this.addRecentFile(path);
            this.navHistory?.push(path);

            await this.ensureEditorPane();
            this.editor.setContent(content);
            this.sidebar.setActive(path);
            this.hideWelcome();
            this.updateBreadcrumb(path);
            this.loadBacklinks(path);
            
        } catch (err) {
            console.error('Failed to open file:', err);
            // *** FIX: Show error to user instead of silent failure ***
            this.showErrorToast(`Failed to open file "${path}": ${err.message || err}`);
        } finally {
            // *** FIX: Always release mutex ***
            this._fileOperationMutex = false;
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

    async showEditorPane(path, pane = 0) {
        if (pane === 0) {
            if (path === this.currentFile) {
                await this.ensureEditorPane();
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
            this.navHistory?.push(path);
            await this.ensureEditorPane();
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
                // TODO: Use proper HTML sanitization like DOMPurify for production
                if (preview) {
                    // Temporary safety measure - escape HTML for demonstration
                    const isUserContent = content.includes('<script') || content.includes('javascript:');
                    if (isUserContent) {
                        preview.textContent = 'Potentially unsafe content blocked. Please review.';
                    } else {
                        preview.innerHTML = html;
                    }
                }
            }).catch(error => {
                console.error('Failed to render markdown:', error);
                if (preview) preview.textContent = 'Error rendering markdown';
            });
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile || !this.isDirty) return;

        // *** FIX: Queue save operations to prevent parallel saves ***
        return new Promise((resolve, reject) => {
            this._saveQueue.push({ resolve, reject, file: this.currentFile });
            this._processSaveQueue();
        });
    }

    async _processSaveQueue() {
        if (this._currentSavePromise || this._saveQueue.length === 0) return;

        const { resolve, reject, file } = this._saveQueue.shift();
        
        this._currentSavePromise = this._performSave(file)
            .then((result) => {
                resolve(result);
                this._currentSavePromise = null;
                this._processSaveQueue(); // Process next in queue
            })
            .catch((err) => {
                reject(err);
                this._currentSavePromise = null;
                this._processSaveQueue(); // Process next in queue
            });
    }

    async _performSave(filePath) {
        if (!filePath || !this.isDirty || this.currentFile !== filePath) return;

        try {
            // *** FIX: Optimistic UI - mark as saved immediately ***
            this.isDirty = false;
            this.tabManager.markClean(filePath);
            
            const content = this.editor.getContent();
            try {
                await invoke('save_note', { path: filePath, content });
                
                // Invalidate backlinks after successful save
                this.backlinksManager?.invalidate();
            } catch (error) {
                console.error('Failed to save note:', filePath, error);
                throw error; // Re-throw so caller can handle
            }
            
        } catch (err) {
            // *** FIX: Rollback optimistic UI on error ***
            this.isDirty = true;
            this.tabManager.markDirty(filePath);
            
            console.error('Failed to save:', err);
            this.showErrorToast(`Failed to save "${filePath}": ${err.message || err}`);
            throw err; // Re-throw for promise rejection
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
        // Use DailyNotes module if available (frontend-based, with Calendar folder)
        if (this.dailyNotes) {
            return this.dailyNotes.open();
        }
        // Fallback to Tauri backend command
        try {
            const path = await invoke('create_daily_note');
            await this.openFile(path);
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create daily note:', err);
            this.showErrorToast(`Failed to create daily note: ${err.message || err}`);
        }
    }

    async navigateToNote(target) {
        let path = target;
        if (!path.endsWith('.md')) path = target + '.md';

        try {
            await invoke('read_note', { path });
            await this.openFile(path);
        } catch (readErr) {
            // File doesn't exist, create it
            try {
                const content = `# ${target}\n\n`;
                await invoke('save_note', { path, content });
                await this.openFile(path);
                await this.sidebar.refresh();
            } catch (createErr) {
                console.error('Failed to create note:', createErr);
                this.showErrorToast(`Failed to create note "${target}": ${createErr.message || createErr}`);
            }
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
        // *** FIX: Improved auto-save - only after meaningful edits, not every keystroke ***
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = setTimeout(() => {
            if (this.isDirty && this.currentFile) {
                this.saveCurrentFile().catch(() => {
                    // Error already handled in _performSave, just prevent unhandled promise rejection
                });
            }
        }, 2000); // Keep 2s interval as specified
    }

    // *** FIX: Error toast system for user feedback ***
    showErrorToast(message) {
        if (!this._errorToastContainer) {
            this._errorToastContainer = document.createElement('div');
            this._errorToastContainer.id = 'error-toast-container';
            this._errorToastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(this._errorToastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.style.cssText = `
            background: var(--bg-error, #dc2626);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 8px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto;
            cursor: pointer;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);

        this._errorToastContainer.appendChild(toast);
    }

    hideWelcome() {
        document.getElementById('welcome-screen').classList.add('hidden');
    }

    showWelcome() {
        document.getElementById('welcome-screen').classList.remove('hidden');
    }

    updateBreadcrumb(path) {
        const bc = document.getElementById('breadcrumb-path');
        // *** FIX: Null safety check ***
        if (!bc) return;
        
        if (!path) { 
            bc.innerHTML = ''; 
            return; 
        }
        
        const parts = path.replace('.md', '').split('/');
        bc.innerHTML = parts.map((p, i) => {
            const sep = i < parts.length - 1 ? '<span class="breadcrumb-sep">›</span>' : '';
            return `<span class="breadcrumb-item">${this.escapeHtml(p)}</span>${sep}`;
        }).join('');
    }

    // ===== Pane Management =====

    async ensureEditorPane() {
        const container = document.getElementById('pane-container');

        // Check if left pane already has an editor
        const leftPane = document.getElementById('left-pane');
        if (leftPane && (leftPane.querySelector('.editor-wrapper') || leftPane.querySelector('.hypermark-editor'))) {
            this.applyViewMode();
            return;
        }

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

        if (this.viewMode === 'source' || this.editorMode === 'classic') {
            // Source mode: raw textarea only, no preview pane
            pane.innerHTML = `
                <div class="editor-wrapper">
                    <div class="editor-pane-half">
                        <textarea class="editor-textarea" placeholder="Start writing... (Markdown supported)" spellcheck="true"></textarea>
                    </div>
                </div>
            `;
            container.insertBefore(pane, container.firstChild);

            const textarea = pane.querySelector('.editor-textarea');
            await this.editor.attach(textarea, null);
            
            // Attach NEW OBSIDIAN CORE FEATURES to textarea
            this.attachObsidianFeatures(pane, textarea);
        } else {
            // HyperMark (live preview) — single pane, NO side preview
            pane.innerHTML = `
                <div class="editor-wrapper" style="display:flex;flex:1;overflow:hidden;">
                    <div class="editor-pane-half" style="flex:1;display:flex;overflow:hidden;">
                        <div class="hypermark-editor" id="hypermark-root"></div>
                    </div>
                </div>
            `;
            container.insertBefore(pane, container.firstChild);

            const hmRoot = pane.querySelector('#hypermark-root');

            // Destroy old hypermark instance if any
            if (this.hypermarkEditor) {
                this.hypermarkEditor.destroy?.();
            }
            this.hypermarkEditor = new HyperMarkEditor(hmRoot, {
                onChange: (content) => {
                    this.markDirty();
                    // Update outline & stats
                    this.editor.updateStatsFromContent?.(content);
                    this.updateOutline?.(content);
                },
            });

            // Also attach the classic editor adapter (for getContent/stats)
            this.editor.attachHyperMark(this.hypermarkEditor, null);
            
            // Attach NEW OBSIDIAN CORE FEATURES to hypermark editor
            this.attachObsidianFeatures(pane, null, this.hypermarkEditor);
        }

        this.applyViewMode();
    }

    /** Switch editor mode between 'classic' and 'hypermark'. Reopens current file. */
    async setEditorMode(mode) {
        if (mode === this.editorMode) return;
        this.editorMode = mode;
        localStorage.setItem('oxidian-editor-mode', mode);

        // When switching to classic, force source mode; when switching to hypermark, force live-preview
        if (mode === 'classic') {
            this.viewMode = 'source';
        } else {
            this.viewMode = 'live-preview';
        }

        // SAVE content BEFORE destroying anything
        const content = this.editor.getContent?.() || '';
        const leftPane = document.getElementById('left-pane');
        if (leftPane) leftPane.remove();
        if (this.hypermarkEditor) {
            this.hypermarkEditor.destroy?.();
            this.hypermarkEditor = null;
        }
        await this.ensureEditorPane();
        if (content) {
            await new Promise(r => setTimeout(r, 50));
            this.editor.setContent(content);
        }
        this.updateViewModeButton();
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
            }).catch(error => {
                console.error('Failed to render markdown in right pane:', error);
                rightPreview.innerHTML = '<p>Error rendering markdown</p>';
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
        // Clean up split resize event listeners
        if (this._splitResizeCleanup) {
            this._splitResizeCleanup();
            this._splitResizeCleanup = null;
        }
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
        if (!input) {
            this.showErrorToast('Note name input not found');
            return;
        }
        
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
            this.showErrorToast(`Failed to create note "${name}": ${err.message || err}`);
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
        if (!input) {
            this.showErrorToast('Folder name input not found');
            return;
        }
        
        const name = input.value.trim();
        if (!name) return;
        
        try {
            await invoke('create_folder', { path: name });
            this.hideNewFolderDialog();
            await this.sidebar.refresh();
        } catch (err) {
            console.error('Failed to create folder:', err);
            this.showErrorToast(`Failed to create folder "${name}": ${err.message || err}`);
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
            this.showErrorToast(`Failed to delete "${path}": ${err.message || err}`);
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

    async startRename(path) {
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

                // Auto-update internal [[links]] in all other notes
                const oldNoteName = path.replace('.md', '').split('/').pop();
                const newNoteName = newPath.replace('.md', '').split('/').pop();
                if (oldNoteName !== newNoteName) {
                    await this.updateInternalLinks(oldNoteName, newNoteName);
                }

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
                // Update nav history
                this.navHistory?.renamePath(path, newPath);
                // Update bookmarks
                const bmIdx = this.bookmarks.indexOf(path);
                if (bmIdx >= 0) {
                    this.bookmarks[bmIdx] = newPath;
                    localStorage.setItem('oxidian-bookmarks', JSON.stringify(this.bookmarks));
                    this.renderBookmarks();
                }
                // Update recent files
                const rfIdx = this.recentFiles.indexOf(path);
                if (rfIdx >= 0) {
                    this.recentFiles[rfIdx] = newPath;
                    localStorage.setItem('oxidian-recent', JSON.stringify(this.recentFiles));
                    this.renderRecentFiles();
                }
                // Invalidate caches
                this.invalidateAutoCompleteCaches();
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

    // ===== Auto-Update Internal Links =====

    /**
     * After renaming a note, update all [[wikilinks]] across the vault via Rust.
     */
    async updateInternalLinks(oldName, newName) {
        try {
            const result = await invoke('update_links_on_rename', { oldName, newName });
            const updatedCount = result?.updated_count || 0;

            if (updatedCount > 0) {
                console.log(`[LinkUpdate] Updated [[${oldName}]] → [[${newName}]] in ${updatedCount} file(s)`);

                // If the currently open file was affected, refresh editor content
                if (this.currentFile) {
                    try {
                        const refreshed = await invoke('read_note', { path: this.currentFile });
                        this.editor.setContent(refreshed);
                        this.isDirty = false;
                    } catch { /* file may not exist anymore */ }
                }
            }
        } catch (err) {
            console.error('[LinkUpdate] Failed to update internal links:', err);
        }
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
            await this.backlinksManager.updateForNote(path);
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

        // PERF FIX: Use named handlers so they could be removed if needed
        const onSidebarResizeMove = (e) => {
            if (!isResizing) return;
            const ribbonW = ribbon.getBoundingClientRect().width;
            const newWidth = Math.max(180, Math.min(500, e.clientX - ribbonW));
            sidebar.style.width = `${newWidth}px`;
        };

        const onSidebarResizeUp = () => {
            if (isResizing) {
                isResizing = false;
                handle.classList.remove('active');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            handle.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', onSidebarResizeMove);
        document.addEventListener('mouseup', onSidebarResizeUp);
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

        // Store references for cleanup when split is removed
        this._splitResizeCleanup = () => {
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };
    }

    // ===== Keyboard Shortcuts =====

    handleKeyboard(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        
        // Try new feature shortcuts first
        if (this.handleNewFeatureShortcuts(e)) {
            return;
        }

        if (ctrl && e.key === 's') {
            e.preventDefault();
            this.saveCurrentFile();
        } else if (ctrl && e.key === 'n') {
            e.preventDefault();
            this.showNewNoteDialog();
        } else if (ctrl && e.key === 'p') {
            e.preventDefault();
            if (this.commandPalette) {
                this.commandPalette.show();
            } else {
                this.quickSwitcher.show();
            }
        } else if (ctrl && e.key === 'o') {
            e.preventDefault();
            this.quickSwitcher.show();
        } else if (ctrl && e.key === 't') {
            e.preventDefault();
            this.templateManager.showPicker();
        } else if (ctrl && e.key === 'f' && !e.shiftKey) {
            // Check if we're in an editor context for in-file find
            const isInEditor = document.activeElement?.classList?.contains('editor-textarea') || 
                             document.querySelector('.hypermark-editor') ||
                             this.currentFile;
            
            e.preventDefault();
            if (isInEditor) {
                this.findReplace.showFind();
            } else {
                this.search.show(); // Fallback to global search
            }
        } else if (ctrl && e.key === 'h') {
            // Find & Replace (Ctrl+H)
            const isInEditor = document.activeElement?.classList?.contains('editor-textarea') || 
                             document.querySelector('.hypermark-editor') ||
                             this.currentFile;
            
            e.preventDefault();
            if (isInEditor) {
                this.findReplace.showFindReplace();
            }
        } else if (ctrl && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            this.search.show();
        } else if (ctrl && e.key === 'd' && document.activeElement?.classList?.contains('editor-textarea')) {
            // Let editor handle Ctrl+D (duplicate line) when textarea focused
            return;
        } else if (ctrl && e.key === 'd') {
            e.preventDefault();
            this.openDailyNote();
        } else if (ctrl && e.key === 'e') {
            e.preventDefault();
            this.cycleViewMode();
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
        } else if (ctrl && e.key === ']') {
            // Indent (Ctrl+])
            e.preventDefault();
            this.indentSelection();
        } else if (ctrl && e.key === '[') {
            // Outdent (Ctrl+[)
            e.preventDefault();
            this.outdentSelection();
        } else if (e.key === 'Escape') {
            this.hideNewNoteDialog();
            this.hideNewFolderDialog();
            this.hideSettings();
            this.contextMenu.hide();
            this.slashMenu?.hide();
            this.findReplace?.hide();
            // Close command palette / quick switcher / template picker if open
            const palette = document.getElementById('command-palette-overlay');
            if (palette) palette.remove();
            const qs = document.getElementById('quick-switcher-overlay');
            if (qs) qs.remove();
            const tp = document.getElementById('template-picker-overlay');
            if (tp) tp.remove();
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

    // ===== Text Editing Utilities =====

    /**
     * Indent the selected text or current line
     */
    indentSelection() {
        const textarea = document.querySelector('.editor-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = textarea.value;
        
        // Get selected text or current line
        const beforeSelection = content.substring(0, start);
        const selectedText = content.substring(start, end);
        const afterSelection = content.substring(end);
        
        // If no selection, work with current line
        if (start === end) {
            // Find line boundaries
            const lineStart = beforeSelection.lastIndexOf('\n') + 1;
            const lineEnd = content.indexOf('\n', start);
            const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
            
            // Indent the current line
            const lineContent = content.substring(lineStart, actualLineEnd);
            const indentedLine = '    ' + lineContent; // 4 spaces
            
            textarea.value = content.substring(0, lineStart) + indentedLine + content.substring(actualLineEnd);
            textarea.selectionStart = start + 4;
            textarea.selectionEnd = start + 4;
        } else {
            // Indent all selected lines
            const lines = selectedText.split('\n');
            const indentedLines = lines.map(line => '    ' + line);
            const indentedText = indentedLines.join('\n');
            
            textarea.value = beforeSelection + indentedText + afterSelection;
            textarea.selectionStart = start;
            textarea.selectionEnd = start + indentedText.length;
        }
        
        // Trigger input event to mark dirty
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }

    /**
     * Outdent the selected text or current line
     */
    outdentSelection() {
        const textarea = document.querySelector('.editor-textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = textarea.value;
        
        // Get selected text or current line
        const beforeSelection = content.substring(0, start);
        const selectedText = content.substring(start, end);
        const afterSelection = content.substring(end);
        
        // If no selection, work with current line
        if (start === end) {
            // Find line boundaries
            const lineStart = beforeSelection.lastIndexOf('\n') + 1;
            const lineEnd = content.indexOf('\n', start);
            const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
            
            // Outdent the current line
            const lineContent = content.substring(lineStart, actualLineEnd);
            let outdentedLine = lineContent;
            let removedChars = 0;
            
            // Remove up to 4 spaces or 1 tab
            if (lineContent.startsWith('    ')) {
                outdentedLine = lineContent.substring(4);
                removedChars = 4;
            } else if (lineContent.startsWith('\t')) {
                outdentedLine = lineContent.substring(1);
                removedChars = 1;
            } else if (lineContent.startsWith('  ')) {
                outdentedLine = lineContent.substring(2);
                removedChars = 2;
            } else if (lineContent.startsWith(' ')) {
                outdentedLine = lineContent.substring(1);
                removedChars = 1;
            }
            
            textarea.value = content.substring(0, lineStart) + outdentedLine + content.substring(actualLineEnd);
            textarea.selectionStart = Math.max(lineStart, start - removedChars);
            textarea.selectionEnd = Math.max(lineStart, start - removedChars);
        } else {
            // Outdent all selected lines
            const lines = selectedText.split('\n');
            let totalRemoved = 0;
            
            const outdentedLines = lines.map(line => {
                let outdentedLine = line;
                let removedChars = 0;
                
                if (line.startsWith('    ')) {
                    outdentedLine = line.substring(4);
                    removedChars = 4;
                } else if (line.startsWith('\t')) {
                    outdentedLine = line.substring(1);
                    removedChars = 1;
                } else if (line.startsWith('  ')) {
                    outdentedLine = line.substring(2);
                    removedChars = 2;
                } else if (line.startsWith(' ')) {
                    outdentedLine = line.substring(1);
                    removedChars = 1;
                }
                
                totalRemoved += removedChars;
                return outdentedLine;
            });
            
            const outdentedText = outdentedLines.join('\n');
            
            textarea.value = beforeSelection + outdentedText + afterSelection;
            textarea.selectionStart = start;
            textarea.selectionEnd = start + outdentedText.length;
        }
        
        // Trigger input event to mark dirty
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
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
                // HyperMark mode: find the heading block and focus it
                if (this.hypermarkEditor) {
                    const blocks = this.hypermarkEditor.getBlocks();
                    const headingBlocks = blocks.filter(b => b.type === 'heading');
                    // Match by heading text
                    const target = headingBlocks.find(b => {
                        const text = (b.meta?.text || b.content.replace(/^#{1,6}\s+/, '')).replace(/[#*`\[\]]/g, '');
                        return text === h.text;
                    });
                    if (target) {
                        this.hypermarkEditor.focusBlock(target.id);
                        this.hypermarkEditor.scrollToBlock(target.id);
                    }
                    return;
                }
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

    // ===== Command Palette =====
    // Handled by CommandPalette module (command-palette.js)

    // ===== View Mode =====

    async cycleViewMode() {
        const modes = ['live-preview', 'source', 'reading'];
        const idx = modes.indexOf(this.viewMode);
        const newMode = modes[(idx + 1) % modes.length];

        this.viewMode = newMode;

        // Store view mode on current tab
        const tab = this.tabManager.getActiveTab();
        if (tab) tab.viewMode = this.viewMode;

        // DO NOT rebuild editor pane — just toggle visibility + reading view
        this.applyViewMode();
        this.updateViewModeButton();
    }

    applyViewMode() {
        const pane = document.getElementById('left-pane');
        if (!pane) return;

        pane.classList.remove('live-preview-mode', 'source-mode', 'reading-mode');
        pane.classList.add(`${this.viewMode}-mode`);

        // Show/hide editor vs reading view
        const editorWrapper = pane.querySelector('.editor-wrapper');

        if (this.viewMode === 'reading') {
            // Hide editor, show rendered reading view
            if (editorWrapper) editorWrapper.style.display = 'none';
            
            let readingView = pane.querySelector('.reading-view');
            if (!readingView) {
                readingView = document.createElement('div');
                readingView.className = 'reading-view preview-content';
                readingView.style.cssText = 'flex:1;overflow:auto;padding:24px 32px;';
                pane.appendChild(readingView);
            }
            readingView.style.display = 'block';
            
            // Get content from editor (still in DOM, just hidden)
            const content = this.editor.getContent();
            if (content && content.trim()) {
                this.renderMarkdown(content).then(html => {
                    readingView.innerHTML = html;
                    this.mermaidRenderer?.processElement?.(readingView);
                }).catch(() => {});
            } else {
                readingView.innerHTML = '<p style="color: var(--text-faint)">Start writing to see a preview</p>';
            }
        } else {
            // Show editor, hide reading view
            if (editorWrapper) editorWrapper.style.display = '';
            const readingView = pane.querySelector('.reading-view');
            if (readingView) readingView.style.display = 'none';
            
            // Re-focus editor
            this.editor.focus?.();
        }

        this.updateViewModeButton();
    }

    updateViewModeButton() {
        const btn = document.getElementById('btn-view-mode');
        if (!btn) return;
        const label = btn.querySelector('.view-mode-label');
        const labels = { 'live-preview': 'Live Preview', 'source': 'Source', 'reading': 'Reading' };
        if (label) label.textContent = labels[this.viewMode] || 'Live Preview';
    }

    // ===== Backlinks Panel =====

    toggleBacklinksPanel(force) {
        this.backlinksPanelOpen = force !== undefined ? force : !this.backlinksPanelOpen;
        const panel = document.getElementById('backlinks-panel');
        const btn = document.getElementById('btn-backlinks');
        if (panel) panel.classList.toggle('hidden', !this.backlinksPanelOpen);
        if (btn) btn.classList.toggle('active', this.backlinksPanelOpen);

        if (this.backlinksPanelOpen && this.currentFile) {
            this.loadBacklinksPanel(this.currentFile);
        }
    }

    async loadBacklinksPanel(path) {
        try {
            const backlinks = await this.backlinksManager.getBacklinks(path);
            this.backlinksManager.renderPanel(backlinks);
        } catch (err) {
            console.error('Failed to load backlinks panel:', err);
        }
    }

    // ===== More Options Dropdown =====

    toggleMoreOptions() {
        const menu = document.getElementById('more-options-menu');
        if (menu) menu.classList.toggle('hidden');
    }

    async handleMoreOption(action) {
        if (!this.currentFile && action !== 'word-count') return;

        switch (action) {
            case 'open-in-new-pane':
                if (this.currentFile) this.openFileInSplit(this.currentFile);
                break;
            case 'copy-path':
                if (this.currentFile) {
                    try { await navigator.clipboard.writeText(this.currentFile); } catch {}
                }
                break;
            case 'rename-file':
                if (this.currentFile) this.startRename(this.currentFile);
                break;
            case 'delete-file':
                if (this.currentFile) this.deleteFile(this.currentFile);
                break;
            case 'pin-tab': {
                const tab = this.tabManager.getActiveTab();
                if (tab) tab.pinned = !tab.pinned;
                break;
            }
            case 'word-count': {
                const content = this.editor.getContent();
                const words = content.trim() ? content.trim().split(/\s+/).length : 0;
                const chars = content.length;
                const lines = content.split('\n').length;
                alert(`Words: ${words}\nCharacters: ${chars}\nLines: ${lines}`);
                break;
            }
            case 'export-html': {
                const content = this.editor.getContent();
                try {
                    const html = await this.renderMarkdown(content);
                    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.currentFile}</title></head><body>${html}</body></html>`], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = (this.currentFile || 'note').replace('.md', '.html');
                    a.click();
                    URL.revokeObjectURL(url);
                } catch {}
                break;
            }
            case 'export-pdf':
                // Placeholder
                break;
        }
    }

    /**
     * Render markdown to HTML with callout and mermaid post-processing.
     * *** FIX: Added proper error handling ***
     */
    async renderMarkdown(content, currentPath = null) {
        try {
            // Process frontmatter first (extract and render preview)
            let processedContent = content;
            if (this.frontmatterProcessor) {
                processedContent = await this.frontmatterProcessor.processContent(content);
            }

            // Process embeds (after frontmatter)
            if (this.embedProcessor) {
                processedContent = await this.embedProcessor.processEmbeds(processedContent, currentPath || this.currentFile);
            }
            
            const html = await invoke('render_markdown', { content: processedContent });
            // Apply callout processing
            const processed = this.calloutProcessor?.process(html) || html;
            return processed;
        } catch (err) {
            console.error('Failed to render markdown:', err);
            // Return fallback content instead of throwing
            return `<div class="render-error" style="color: var(--text-error, #dc2626); padding: 12px; border: 1px solid var(--border-error, #dc2626); border-radius: 4px;">
                <strong>Render Error:</strong> ${this.escapeHtml(err.message || err.toString())}
            </div>`;
        }
    }

    /**
     * Post-process a DOM element for mermaid diagrams (async, in-place).
     */
    async postProcessRendered(el) {
        // Callouts on DOM
        this.calloutProcessor.processElement(el);
        // Mermaid diagrams
        await this.mermaidRenderer.processElement(el);
    }

    /**
     * Edit frontmatter for the current file
     */
    editFrontmatter() {
        if (!this.currentFile) return;
        
        const content = this.editor.getContent();
        if (this.frontmatterProcessor) {
            this.frontmatterProcessor.showFrontmatterEditor(content);
        }
    }

    // ===== Remember Integration =====

    openRememberDashboard() {
        try {
            if (this.remember && this.remember.openDashboard) {
                this.remember.openDashboard();
            } else {
                // Fallback: switch to remember sidebar panel
                this.switchSidebarPanel('remember');
            }
        } catch (err) {
            console.error('[Remember] Failed to open dashboard:', err);
        }
    }

    extractToCard() {
        if (this.rememberExtract) {
            this.rememberExtract.extractSelection();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== NEW OBSIDIAN CORE FEATURES INTEGRATION =====

    /**
     * Attach all Obsidian core features to an editor pane
     */
    attachObsidianFeatures(pane, textarea, hypermarkEditor = null) {
        const safeAttach = (name, fn) => {
            try { fn(); } catch (err) {
                console.error(`[Oxidian] Failed to attach feature "${name}":`, err);
            }
        };

        // 1. Properties Panel
        safeAttach('PropertiesPanel', () => {
            if (this.propertiesPanel) {
                this.propertiesPanel.init(pane);
                if (textarea) this.propertiesPanel.attachTo(textarea);
            }
        });

        // 2. Drag & Drop
        safeAttach('DragDrop', () => {
            if (this.dragDrop && pane) this.dragDrop.initEditor(pane);
        });

        if (textarea) {
            // 3. Wikilinks Auto-Complete
            safeAttach('WikilinksAutoComplete', () => {
                if (this.wikilinksAutoComplete) this.wikilinksAutoComplete.attachTo(textarea);
            });

            // 4. Tag Auto-Complete
            safeAttach('TagAutoComplete', () => {
                if (this.tagAutoComplete) this.tagAutoComplete.attachTo(textarea);
            });

            // 5. Multiple Cursors
            safeAttach('MultipleCursors', () => {
                if (this.multipleCursors) this.multipleCursors.attachTo(textarea);
            });

            // 6. Folding — DISABLED for stability
        }

        // 7. Hover Preview
        safeAttach('HoverPreview', () => {
            if (this.hoverPreview && pane) this.hoverPreview.init(pane);
        });

        console.log('✅ Obsidian core features attached');
    }

    /**
     * Open Canvas view
     */
    openCanvasView() {
        this.tabManager.openTab('__canvas__', 'Canvas', 'canvas');
    }

    /**
     * Show canvas in a pane
     */
    showCanvasPane(pane = 0) {
        if (this.isDirty && this.currentFile) {
            this.saveCurrentFile();
        }

        this.hideWelcome();
        this.updateBreadcrumb('');

        if (pane === 0 && !this.tabManager.splitActive) {
            this.clearPanes();
            const container = document.getElementById('pane-container');
            const canvasDiv = document.createElement('div');
            canvasDiv.className = 'pane canvas-pane';
            canvasDiv.id = 'left-pane';
            container.insertBefore(canvasDiv, container.firstChild);
            this.canvas.init(canvasDiv);
        } else {
            const paneId = pane === 0 ? 'left-pane' : 'right-pane';
            let paneEl = document.getElementById(paneId);
            if (paneEl) {
                paneEl.innerHTML = '';
                paneEl.className = 'pane canvas-pane';
                this.canvas.init(paneEl);
            }
        }
    }

    /**
     * Show Remember dashboard in a pane
     */
    showRememberPane(pane = 0) {
        if (this.isDirty && this.currentFile) {
            this.saveCurrentFile();
        }

        this.hideWelcome();
        this.updateBreadcrumb('');

        if (pane === 0 && !this.tabManager.splitActive) {
            this.clearPanes();
            const container = document.getElementById('pane-container');
            const rememberDiv = document.createElement('div');
            rememberDiv.className = 'pane remember-pane';
            rememberDiv.id = 'left-pane';
            container.insertBefore(rememberDiv, container.firstChild);
            if (this.rememberDashboard) {
                this.rememberDashboard.show();
            } else if (this.remember) {
                this.remember.refreshDashboard();
            }
        }
    }

    /**
     * Enhanced keyboard shortcuts for new features
     */
    handleNewFeatureShortcuts(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        
        const alt = e.altKey;

        // Remember Dashboard: Cmd+Shift+R
        if (ctrl && shift && e.key === 'R') {
            e.preventDefault();
            this.openRememberDashboard();
            return true;
        }

        // Extract to Card: Cmd+Shift+E
        if (ctrl && shift && e.key === 'E') {
            e.preventDefault();
            this.extractToCard();
            return true;
        }

        // Navigation history: Cmd+Alt+Left/Right
        if (ctrl && alt && e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navHistory?.goBack();
            return true;
        }
        if (ctrl && alt && e.key === 'ArrowRight') {
            e.preventDefault();
            this.navHistory?.goForward();
            return true;
        }

        return false; // Not handled
    }

    /**
     * Initialize File Explorer drag & drop
     */
    initFileExplorerDragDrop() {
        const fileTreeContainer = document.getElementById('file-tree');
        if (this.dragDrop && fileTreeContainer) {
            this.dragDrop.initFileExplorer(fileTreeContainer);
        }
    }

    /**
     * Invalidate autocomplete caches when files/tags change
     */
    invalidateAutoCompleteCaches() {
        this.wikilinksAutoComplete?.invalidateCache();
        this.tagAutoComplete?.invalidateCache();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.oxidianApp = new OxidianApp();
    window.app = window.oxidianApp; // Backward compatibility
});
