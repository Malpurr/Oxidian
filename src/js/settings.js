// Oxidian — Comprehensive Settings Panel (Obsidian-inspired)
// Fully redesigned settings with professional sidebar navigation and all sections

import { invoke } from './tauri-bridge.js';

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.settings = null;
        this.paneEl = null;
        this.activeSection = 'general';
        this.hotkeys = new Map();
        this.availableCommands = new Map();
    }

    async load() {
        try {
            this.settings = await invoke('load_settings');
            await this.loadHotkeys();
            await this.loadCommands();
        } catch (err) {
            console.error('Failed to load settings:', err);
            // Comprehensive fallback settings
            this.settings = {
                general: {
                    vault_path: '',
                    language: 'en',
                    startup_behavior: 'welcome',
                    check_for_updates: true,
                    auto_update: false,
                    developer_mode: false
                },
                editor: {
                    font_family: 'JetBrains Mono, Fira Code, Consolas, monospace',
                    font_size: 15,
                    line_height: 1.6,
                    tab_size: 4,
                    spell_check: true,
                    vim_mode: false,
                    show_line_numbers: true,
                    readable_line_length: false,
                    max_line_width: 700,
                    strict_line_breaks: false,
                    smart_indent: true,
                    show_frontmatter: true,
                    default_edit_mode: 'source',
                    auto_pair_brackets: true,
                    auto_pair_markdown: true,
                    fold_heading: true,
                    fold_indent: true
                },
                files_links: {
                    default_note_location: 'vault_root',
                    new_note_location: '',
                    new_link_format: 'shortest',
                    auto_update_internal_links: true,
                    detect_all_extensions: true,
                    attachment_folder: 'attachments',
                    always_update_links: true,
                    use_markdown_links: false,
                    confirm_file_deletion: true
                },
                appearance: {
                    theme: 'dark',
                    accent_color: '#7f6df2',
                    interface_font_size: 13,
                    interface_font: 'default',
                    translucent: false,
                    custom_css: true,
                    native_menus: true,
                    show_inline_title: true,
                    show_tab_title_bar: true,
                    zoom_level: 1.0
                },
                hotkeys: {},
                core_plugins: {
                    file_explorer: true,
                    search: true,
                    quick_switcher: true,
                    graph_view: true,
                    backlinks: true,
                    outgoing_links: true,
                    tag_pane: true,
                    page_preview: true,
                    starred: true,
                    templates: false,
                    note_composer: false,
                    command_palette: true,
                    markdown_importer: false,
                    word_count: true,
                    open_with_default_app: true,
                    file_recovery: true
                },
                community_plugins: {
                    safe_mode: false,
                    enabled_plugins: [],
                    plugin_updates: true,
                    browse_plugins: true
                },
                about: {
                    version: '1.2.0',
                    license: 'MIT',
                    credits: 'Built with Tauri & Rust'
                }
            };
        }
    }

    async loadHotkeys() {
        try {
            const hotkeyData = await invoke('load_hotkeys') || {};
            this.hotkeys = new Map(Object.entries(hotkeyData));
        } catch (err) {
            console.warn('Could not load hotkeys:', err);
            this.hotkeys = new Map();
        }
    }

    async loadCommands() {
        try {
            const commands = await invoke('get_available_commands') || [];
            this.availableCommands = new Map();
            
            // Default command set
            const defaultCommands = [
                { id: 'app:open-settings', name: 'Open Settings', category: 'App' },
                { id: 'app:toggle-theme', name: 'Toggle Theme', category: 'App' },
                { id: 'app:reload-app', name: 'Reload App', category: 'App' },
                { id: 'file:new-note', name: 'Create New Note', category: 'File' },
                { id: 'file:open-file', name: 'Open File', category: 'File' },
                { id: 'file:save', name: 'Save Current File', category: 'File' },
                { id: 'file:save-as', name: 'Save As...', category: 'File' },
                { id: 'file:delete', name: 'Delete File', category: 'File' },
                { id: 'editor:toggle-preview', name: 'Toggle Preview', category: 'Editor' },
                { id: 'editor:toggle-source', name: 'Toggle Source Mode', category: 'Editor' },
                { id: 'editor:bold', name: 'Bold', category: 'Editor' },
                { id: 'editor:italic', name: 'Italic', category: 'Editor' },
                { id: 'editor:strikethrough', name: 'Strikethrough', category: 'Editor' },
                { id: 'editor:code', name: 'Inline Code', category: 'Editor' },
                { id: 'editor:codeblock', name: 'Code Block', category: 'Editor' },
                { id: 'search:global-search', name: 'Search in All Files', category: 'Search' },
                { id: 'search:current-file', name: 'Search in Current File', category: 'Search' },
                { id: 'navigation:quick-switcher', name: 'Quick Switcher', category: 'Navigation' },
                { id: 'navigation:go-back', name: 'Navigate Back', category: 'Navigation' },
                { id: 'navigation:go-forward', name: 'Navigate Forward', category: 'Navigation' },
                { id: 'view:toggle-sidebar', name: 'Toggle Sidebar', category: 'View' },
                { id: 'view:toggle-reading-mode', name: 'Toggle Reading Mode', category: 'View' }
            ];
            
            (commands.length > 0 ? commands : defaultCommands).forEach(cmd => {
                this.availableCommands.set(cmd.id, cmd);
            });
        } catch (err) {
            console.warn('Could not load commands, using defaults:', err);
            const defaultCommands = [
                { id: 'app:open-settings', name: 'Open Settings', category: 'App' },
                { id: 'app:toggle-theme', name: 'Toggle Theme', category: 'App' },
                { id: 'app:reload-app', name: 'Reload App', category: 'App' },
                { id: 'file:new-note', name: 'Create New Note', category: 'File' },
                { id: 'file:open-file', name: 'Open File', category: 'File' },
                { id: 'file:save', name: 'Save Current File', category: 'File' },
                { id: 'file:save-as', name: 'Save As...', category: 'File' },
                { id: 'file:delete', name: 'Delete File', category: 'File' },
                { id: 'editor:toggle-preview', name: 'Toggle Preview', category: 'Editor' },
                { id: 'editor:toggle-source', name: 'Toggle Source Mode', category: 'Editor' },
                { id: 'editor:bold', name: 'Bold', category: 'Editor' },
                { id: 'editor:italic', name: 'Italic', category: 'Editor' },
                { id: 'editor:strikethrough', name: 'Strikethrough', category: 'Editor' },
                { id: 'editor:code', name: 'Inline Code', category: 'Editor' },
                { id: 'editor:codeblock', name: 'Code Block', category: 'Editor' },
                { id: 'search:global-search', name: 'Search in All Files', category: 'Search' },
                { id: 'search:current-file', name: 'Search in Current File', category: 'Search' },
                { id: 'navigation:quick-switcher', name: 'Quick Switcher', category: 'Navigation' },
                { id: 'navigation:go-back', name: 'Navigate Back', category: 'Navigation' },
                { id: 'navigation:go-forward', name: 'Navigate Forward', category: 'Navigation' },
                { id: 'view:toggle-sidebar', name: 'Toggle Sidebar', category: 'View' },
                { id: 'view:toggle-reading-mode', name: 'Toggle Reading Mode', category: 'View' }
            ];
            this.availableCommands = new Map();
            defaultCommands.forEach(cmd => {
                this.availableCommands.set(cmd.id, cmd);
            });
        }
    }

    async show(container) {
        await this.load();
        this.paneEl = container;
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'settings-page';
        wrapper.innerHTML = this.renderHTML();
        container.appendChild(wrapper);

        this.bindEvents(wrapper);
        this._renderPluginSettingTabs(wrapper);
        this.switchToSection(this.activeSection, wrapper);
        this.initializeSection(this.activeSection);
    }

    renderHTML() {
        return `
            <div class="settings-container">
                <nav class="settings-sidebar">
                    <div class="settings-sidebar-header">
                        <h2>Settings</h2>
                    </div>
                    <div class="settings-nav-section">
                        <button class="settings-nav-item ${this.activeSection === 'general' ? 'active' : ''}" data-section="general">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                            </svg>
                            <span>General</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'editor' ? 'active' : ''}" data-section="editor">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            <span>Editor</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'files-links' ? 'active' : ''}" data-section="files-links">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            <span>Files &amp; Links</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'appearance' ? 'active' : ''}" data-section="appearance">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="5"/>
                                <line x1="12" y1="1" x2="12" y2="3"/>
                                <line x1="12" y1="21" x2="12" y2="23"/>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                <line x1="1" y1="12" x2="3" y2="12"/>
                                <line x1="21" y1="12" x2="23" y2="12"/>
                            </svg>
                            <span>Appearance</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'hotkeys' ? 'active' : ''}" data-section="hotkeys">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="6" width="20" height="12" rx="2"/>
                                <line x1="6" y1="10" x2="6" y2="14"/>
                                <line x1="10" y1="10" x2="10" y2="14"/>
                                <line x1="14" y1="10" x2="14" y2="14"/>
                                <line x1="18" y1="10" x2="18" y2="14"/>
                            </svg>
                            <span>Hotkeys</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'core-plugins' ? 'active' : ''}" data-section="core-plugins">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="8" height="8" rx="1"/>
                                <rect x="13" y="3" width="8" height="8" rx="1"/>
                                <rect x="3" y="13" width="8" height="8" rx="1"/>
                                <rect x="13" y="13" width="8" height="8" rx="1"/>
                            </svg>
                            <span>Core plugins</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'community-plugins' ? 'active' : ''}" data-section="community-plugins">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                                <path d="M2 12h20"/>
                            </svg>
                            <span>Community plugins</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === 'about' ? 'active' : ''}" data-section="about">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4"/>
                                <path d="M12 8h.01"/>
                            </svg>
                            <span>About</span>
                        </button>
                    </div>
                </nav>
                <main class="settings-content">
                    <div class="settings-sections">
                        ${this.renderGeneralSection()}
                        ${this.renderEditorSection()}
                        ${this.renderFilesLinksSection()}
                        ${this.renderAppearanceSection()}
                        ${this.renderHotkeysSection()}
                        ${this.renderCorePluginsSection()}
                        ${this.renderCommunityPluginsSection()}
                        ${this.renderAboutSection()}
                    </div>
                </main>
            </div>
        `;
    }

    renderGeneralSection() {
        const s = this.settings.general || {};
        return `
            <section class="settings-section" data-section="general">
                <div class="settings-section-header">
                    <h1>General</h1>
                    <p class="settings-section-description">Manage your vault and application preferences</p>
                </div>
                
                <div class="settings-group">
                    <h3>Vault</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Vault location</div>
                            <div class="setting-item-description">Location of your notes vault on disk</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="general-vault-path" value="${this.esc(s.vault_path)}" readonly />
                            <button class="mod-cta" id="btn-browse-vault">Browse</button>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Interface</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Language</div>
                            <div class="setting-item-description">Select the interface language</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="general-language">
                                <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
                                <option value="de" ${s.language === 'de' ? 'selected' : ''}>Deutsch</option>
                                <option value="fr" ${s.language === 'fr' ? 'selected' : ''}>Français</option>
                                <option value="es" ${s.language === 'es' ? 'selected' : ''}>Español</option>
                                <option value="zh" ${s.language === 'zh' ? 'selected' : ''}>中文</option>
                                <option value="ja" ${s.language === 'ja' ? 'selected' : ''}>日本語</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Start-up behavior</div>
                            <div class="setting-item-description">Choose what to display when opening Oxidian</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="general-startup">
                                <option value="welcome" ${s.startup_behavior === 'welcome' ? 'selected' : ''}>Show welcome screen</option>
                                <option value="last-session" ${s.startup_behavior === 'last-session' ? 'selected' : ''}>Restore last session</option>
                                <option value="daily-note" ${s.startup_behavior === 'daily-note' ? 'selected' : ''}>Open daily note</option>
                                <option value="empty" ${s.startup_behavior === 'empty' ? 'selected' : ''}>Start with empty workspace</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Updates</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Check for updates</div>
                            <div class="setting-item-description">Automatically check for application updates</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-check-updates" ${s.check_for_updates ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Automatic updates</div>
                            <div class="setting-item-description">Automatically download and install updates</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-auto-update" ${s.auto_update ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Developer mode</div>
                            <div class="setting-item-description">Enable developer tools and debugging features</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-dev-mode" ${s.developer_mode ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderEditorSection() {
        const s = this.settings.editor || {};
        return `
            <section class="settings-section" data-section="editor">
                <div class="settings-section-header">
                    <h1>Editor</h1>
                    <p class="settings-section-description">Configure your note editing experience</p>
                </div>
                
                <div class="settings-group">
                    <h3>Display</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Font family</div>
                            <div class="setting-item-description">The font used for editing notes</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="editor-font-family" value="${this.esc(s.font_family)}" placeholder="JetBrains Mono, Consolas, monospace" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Font size</div>
                            <div class="setting-item-description">Font size in pixels</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="editor-font-size" min="10" max="36" value="${s.font_size}" />
                                <div class="slider-value">${s.font_size}px</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Line height</div>
                            <div class="setting-item-description">Line spacing multiplier for better readability</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="editor-line-height" min="1.0" max="2.5" step="0.1" value="${s.line_height}" />
                                <div class="slider-value">${s.line_height}</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Show line numbers</div>
                            <div class="setting-item-description">Display line numbers in the editor gutter</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-line-numbers" ${s.show_line_numbers ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Readable line length</div>
                            <div class="setting-item-description">Limit the maximum line width for better readability</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-readable-length" ${s.readable_line_length ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item" data-show-if="editor-readable-length">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Maximum line width</div>
                            <div class="setting-item-description">Maximum width in pixels when readable line length is enabled</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="number" id="editor-max-width" value="${s.max_line_width}" min="400" max="1200" step="50" />
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Behavior</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Tab indent size</div>
                            <div class="setting-item-description">Number of spaces for each tab indentation</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="editor-tab-size">
                                <option value="2" ${s.tab_size === 2 ? 'selected' : ''}>2 spaces</option>
                                <option value="4" ${s.tab_size === 4 ? 'selected' : ''}>4 spaces</option>
                                <option value="8" ${s.tab_size === 8 ? 'selected' : ''}>8 spaces</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default editing mode</div>
                            <div class="setting-item-description">The default editing mode for new notes</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="editor-default-mode">
                                <option value="source" ${s.default_edit_mode === 'source' ? 'selected' : ''}>Source mode</option>
                                <option value="live-preview" ${s.default_edit_mode === 'live-preview' ? 'selected' : ''}>Live Preview</option>
                                <option value="reading" ${s.default_edit_mode === 'reading' ? 'selected' : ''}>Reading mode</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Strict line breaks</div>
                            <div class="setting-item-description">Force line breaks to be respected in preview mode</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-strict-breaks" ${s.strict_line_breaks ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Smart indent lists</div>
                            <div class="setting-item-description">Automatically indent lists and maintain structure</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-smart-indent" ${s.smart_indent ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Auto-pair brackets</div>
                            <div class="setting-item-description">Automatically close brackets, quotes, and parentheses</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-auto-pair-brackets" ${s.auto_pair_brackets ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Auto-pair Markdown formatting</div>
                            <div class="setting-item-description">Automatically close bold, italic, and other markdown formatting</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-auto-pair-markdown" ${s.auto_pair_markdown ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Spell check</div>
                            <div class="setting-item-description">Enable browser spell checking</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-spell-check" ${s.spell_check ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Vim key bindings</div>
                            <div class="setting-item-description">Enable Vim keyboard shortcuts (experimental)</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-vim-mode" ${s.vim_mode ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Show frontmatter</div>
                            <div class="setting-item-description">Display YAML frontmatter in the editor</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-show-frontmatter" ${s.show_frontmatter ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Fold heading</div>
                            <div class="setting-item-description">Allow collapsing sections under headings</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-fold-heading" ${s.fold_heading ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Fold indent</div>
                            <div class="setting-item-description">Allow collapsing indented sections</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-fold-indent" ${s.fold_indent ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderFilesLinksSection() {
        const s = this.settings.files_links || this.settings.files || {
            default_note_location: 'vault_root',
            new_note_location: '',
            new_link_format: 'shortest',
            auto_update_internal_links: true,
            detect_all_extensions: true,
            default_attachment_folder: 'attachments',
            confirm_file_delete: true,
            trash_option: 'system_trash'
        };
        return `
            <section class="settings-section" data-section="files-links">
                <div class="settings-section-header">
                    <h1>Files &amp; Links</h1>
                    <p class="settings-section-description">Manage how files and links are handled in your vault</p>
                </div>
                
                <div class="settings-group">
                    <h3>File Creation</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default location for new notes</div>
                            <div class="setting-item-description">Where to place newly created notes</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="files-default-location">
                                <option value="vault_root" ${(s.default_note_location || s.new_file_location || 'vault_root') === 'vault_root' ? 'selected' : ''}>Vault folder</option>
                                <option value="current_folder" ${(s.default_note_location || s.new_file_location || 'vault_root') === 'current_folder' ? 'selected' : ''}>Same folder as current file</option>
                                <option value="specified_folder" ${(s.default_note_location || s.new_file_location || 'vault_root') === 'specified_folder' ? 'selected' : ''}>In the folder specified below</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item" data-show-if-value="files-default-location:specified_folder">
                        <div class="setting-item-info">
                            <div class="setting-item-name">New note folder</div>
                            <div class="setting-item-description">Folder path for new notes (relative to vault root)</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="files-new-note-location" value="${this.esc(s.new_note_location)}" placeholder="notes/" />
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Links</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">New link format</div>
                            <div class="setting-item-description">How to format new wikilinks</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="files-link-format">
                                <option value="shortest" ${s.new_link_format === 'shortest' ? 'selected' : ''}>Shortest path when possible</option>
                                <option value="relative" ${s.new_link_format === 'relative' ? 'selected' : ''}>Relative path to file</option>
                                <option value="absolute" ${s.new_link_format === 'absolute' ? 'selected' : ''}>Absolute path in vault</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Use [[Wikilinks]]</div>
                            <div class="setting-item-description">Use wikilink format instead of Markdown links</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-use-wikilinks" ${!s.use_markdown_links ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Automatically update internal links</div>
                            <div class="setting-item-description">Update links when renaming or moving files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-auto-update-links" ${s.auto_update_internal_links ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>File Management</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Detect all file extensions</div>
                            <div class="setting-item-description">Include all files in vault, not just markdown files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-detect-extensions" ${s.detect_all_extensions ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default attachment folder</div>
                            <div class="setting-item-description">Where to place attachments (images, files, etc.)</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="files-attachment-folder" value="${this.esc(s.attachment_folder)}" placeholder="attachments" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Always update links on rename</div>
                            <div class="setting-item-description">Always update links when files are renamed, without asking</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-always-update" ${s.always_update_links ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Confirm file deletion</div>
                            <div class="setting-item-description">Ask for confirmation before deleting files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-confirm-delete" ${s.confirm_file_deletion ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderAppearanceSection() {
        const s = this.settings.appearance || {};
        return `
            <section class="settings-section" data-section="appearance">
                <div class="settings-section-header">
                    <h1>Appearance</h1>
                    <p class="settings-section-description">Customize the visual appearance of Oxidian</p>
                </div>
                
                <div class="settings-group">
                    <h3>Theme</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Base color scheme</div>
                            <div class="setting-item-description">Choose between dark and light themes</div>
                        </div>
                        <div class="setting-item-control">
                            <div id="theme-selector" class="theme-selector">
                                <div class="theme-option ${s.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                                    <div class="theme-preview theme-preview-dark">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Dark</span>
                                </div>
                                <div class="theme-option ${s.theme === 'light' ? 'active' : ''}" data-theme="light">
                                    <div class="theme-preview theme-preview-light">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Light</span>
                                </div>
                                <div class="theme-option ${s.theme === 'system' ? 'active' : ''}" data-theme="system">
                                    <div class="theme-preview theme-preview-auto">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Adapt to system</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Accent color</div>
                            <div class="setting-item-description">Used for interactive elements and highlights</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="color-picker-wrapper">
                                <input type="color" id="appearance-accent-color" value="${s.accent_color}" />
                                <div class="color-presets">
                                    <button class="color-preset" data-color="#7f6df2" style="background-color: #7f6df2;"></button>
                                    <button class="color-preset" data-color="#6366f1" style="background-color: #6366f1;"></button>
                                    <button class="color-preset" data-color="#8b5cf6" style="background-color: #8b5cf6;"></button>
                                    <button class="color-preset" data-color="#ec4899" style="background-color: #ec4899;"></button>
                                    <button class="color-preset" data-color="#f43f5e" style="background-color: #f43f5e;"></button>
                                    <button class="color-preset" data-color="#06b6d4" style="background-color: #06b6d4;"></button>
                                    <button class="color-preset" data-color="#10b981" style="background-color: #10b981;"></button>
                                    <button class="color-preset" data-color="#f59e0b" style="background-color: #f59e0b;"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Text</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Interface font</div>
                            <div class="setting-item-description">Font used for the interface</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="appearance-interface-font">
                                <option value="default" ${s.interface_font === 'default' ? 'selected' : ''}>Default</option>
                                <option value="system" ${s.interface_font === 'system' ? 'selected' : ''}>System font</option>
                                <option value="inter" ${s.interface_font === 'inter' ? 'selected' : ''}>Inter</option>
                                <option value="roboto" ${s.interface_font === 'roboto' ? 'selected' : ''}>Roboto</option>
                                <option value="custom" ${s.interface_font === 'custom' ? 'selected' : ''}>Custom</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Interface font size</div>
                            <div class="setting-item-description">Font size for menus and interface elements</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="appearance-font-size" min="10" max="18" value="${s.interface_font_size}" />
                                <div class="slider-value">${s.interface_font_size}px</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Zoom level</div>
                            <div class="setting-item-description">Zoom factor for the entire interface</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="appearance-zoom" min="0.75" max="2.0" step="0.25" value="${s.zoom_level}" />
                                <div class="slider-value">${Math.round(s.zoom_level * 100)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Window</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Translucent window</div>
                            <div class="setting-item-description">Make the window background semi-transparent</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-translucent" ${s.translucent ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Native menus</div>
                            <div class="setting-item-description">Use the operating system's native menus</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-native-menus" ${s.native_menus ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">CSS snippets</div>
                            <div class="setting-item-description">Enable custom CSS snippets for advanced customization</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-custom-css" ${s.custom_css ? 'checked' : ''} />
                            </div>
                            <button class="mod-secondary" id="btn-manage-css" ${s.custom_css ? '' : 'disabled'}>Manage snippets</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderHotkeysSection() {
        return `
            <section class="settings-section" data-section="hotkeys">
                <div class="settings-section-header">
                    <h1>Hotkeys</h1>
                    <p class="settings-section-description">Customize keyboard shortcuts for commands</p>
                </div>
                
                <div class="hotkeys-search">
                    <input type="text" id="hotkeys-search" placeholder="Search hotkeys..." />
                </div>
                
                <div id="hotkeys-list" class="hotkeys-list">
                    ${this.renderHotkeysList()}
                </div>
            </section>
        `;
    }

    renderHotkeysList() {
        const commandsByCategory = new Map();
        
        for (const [commandId, command] of this.availableCommands) {
            const category = command.category || 'Other';
            if (!commandsByCategory.has(category)) {
                commandsByCategory.set(category, []);
            }
            commandsByCategory.get(category).push({
                id: commandId,
                name: command.name,
                hotkey: this.hotkeys.get(commandId) || ''
            });
        }

        let html = '';
        for (const [category, commands] of commandsByCategory) {
            html += `
                <div class="hotkey-category">
                    <h3 class="hotkey-category-title">${category}</h3>
                    ${commands.map(cmd => `
                        <div class="hotkey-item" data-command="${cmd.id}">
                            <div class="hotkey-command">
                                <span class="hotkey-command-name">${this.esc(cmd.name)}</span>
                            </div>
                            <div class="hotkey-binding">
                                <div class="hotkey-keys" data-command="${cmd.id}">
                                    ${cmd.hotkey ? this.renderHotkey(cmd.hotkey) : '<span class="hotkey-none">No hotkey</span>'}
                                </div>
                                <button class="hotkey-edit-btn" data-command="${cmd.id}">Edit</button>
                                ${cmd.hotkey ? `<button class="hotkey-remove-btn" data-command="${cmd.id}">×</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return html;
    }

    renderHotkey(hotkey) {
        const keys = hotkey.split('+').map(key => {
            const cleanKey = key.trim();
            const keyMap = {
                'Ctrl': 'Ctrl',
                'Cmd': '⌘',
                'Alt': 'Alt',
                'Shift': '⇧',
                'Meta': '⌘',
                'Control': 'Ctrl'
            };
            return `<span class="hotkey-key">${keyMap[cleanKey] || cleanKey}</span>`;
        });
        return keys.join('<span class="hotkey-plus">+</span>');
    }

    renderCorePluginsSection() {
        // BUG-CP1 FIX: Use getCorePluginInfo() master list instead of iterating settings.plugins
        const pluginIds = [
            'file_explorer', 'search', 'quick_switcher', 'graph_view',
            'backlinks', 'outgoing_links', 'tag_pane', 'page_preview',
            'starred', 'templates', 'note_composer', 'command_palette',
            'markdown_importer', 'word_count', 'open_with_default_app', 'file_recovery'
        ];
        const s = this.settings.core_plugins || {};
        return `
            <section class="settings-section" data-section="core-plugins">
                <div class="settings-section-header">
                    <h1>Core plugins</h1>
                    <p class="settings-section-description">These are built-in plugins that extend Oxidian's functionality</p>
                </div>
                
                <div class="plugins-list">
                    ${pluginIds.map(pluginId => {
                        const enabled = s[pluginId] !== undefined ? s[pluginId] : true;
                        const pluginInfo = this.getCorePluginInfo(pluginId);
                        return `
                            <div class="plugin-item ${enabled ? 'enabled' : 'disabled'}">
                                <div class="plugin-info">
                                    <div class="plugin-name">${pluginInfo.name}</div>
                                    <div class="plugin-description">${pluginInfo.description}</div>
                                </div>
                                <div class="plugin-toggle">
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="core-plugin-${pluginId}" ${enabled ? 'checked' : ''} />
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `;
    }

    getCorePluginInfo(pluginId) {
        const pluginInfoMap = {
            file_explorer: { name: 'File explorer', description: 'Browse files and folders in your vault.' },
            search: { name: 'Search', description: 'Find notes and content across your vault.' },
            quick_switcher: { name: 'Quick switcher', description: 'Jump to any file with a few keystrokes.' },
            graph_view: { name: 'Graph view', description: 'Visualize connections between your notes.' },
            backlinks: { name: 'Backlinks', description: 'See which notes link to the current note.' },
            outgoing_links: { name: 'Outgoing links', description: 'See which notes the current note links to.' },
            tag_pane: { name: 'Tags', description: 'Browse and manage tags in your vault.' },
            page_preview: { name: 'Page preview', description: 'Preview notes when hovering over links.' },
            starred: { name: 'Starred', description: 'Star important notes for quick access.' },
            templates: { name: 'Templates', description: 'Create notes from predefined templates.' },
            note_composer: { name: 'Note composer', description: 'Merge, split, and refactor notes.' },
            command_palette: { name: 'Command palette', description: 'Access all commands from one place.' },
            markdown_importer: { name: 'Markdown importer', description: 'Import markdown files from other apps.' },
            word_count: { name: 'Word count', description: 'Display word and character counts.' },
            open_with_default_app: { name: 'Open with default app', description: 'Open files in external applications.' },
            file_recovery: { name: 'File recovery', description: 'Recover accidentally deleted files.' }
        };
        
        return pluginInfoMap[pluginId] || { name: pluginId, description: 'Core plugin functionality.' };
    }

    renderCommunityPluginsSection() {
        const s = this.settings.community_plugins || this.settings.plugins || {};
        return `
            <section class="settings-section" data-section="community-plugins">
                <div class="settings-section-header">
                    <h1>Community plugins</h1>
                    <p class="settings-section-description">Plugins made by the community to extend Oxidian</p>
                </div>
                
                <div class="community-plugins-header">
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Turn off safe mode to enable plugins</div>
                            <div class="setting-item-description">Safe mode prevents third-party code from running</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="community-safe-mode" ${!s.safe_mode ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="community-plugins-controls ${s.safe_mode ? 'disabled' : ''}">
                    <div class="plugins-actions">
                        <button class="mod-cta" id="btn-browse-plugins" ${s.safe_mode ? 'disabled' : ''}>Browse community plugins</button>
                        <button class="mod-secondary" id="btn-install-plugin" ${s.safe_mode ? 'disabled' : ''}>Install from folder</button>
                        <button class="mod-secondary" id="btn-reload-plugins" ${s.safe_mode ? 'disabled' : ''}>Reload plugins</button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Check for plugin updates</div>
                            <div class="setting-item-description">Automatically check for updates to installed plugins</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="community-plugin-updates" ${s.plugin_updates ? 'checked' : ''} ${s.safe_mode ? 'disabled' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="installed-plugins-list" class="installed-plugins-list">
                    ${this.renderInstalledPlugins()}
                </div>
            </section>
        `;
    }

    renderInstalledPlugins() {
        // Initial placeholder — real data loaded async via loadInstalledPlugins()
        return `<div class="plugins-loading">Loading plugins...</div>`;
    }

    renderAboutSection() {
        const s = this.settings.about || { version: "2.2.0", license: "MIT", credits: "Built with Tauri & Rust" };
        return `
            <section class="settings-section" data-section="about">
                <div class="settings-section-header">
                    <h1>About</h1>
                    <p class="settings-section-description">Information about Oxidian</p>
                </div>
                
                <div class="about-content">
                    <div class="about-logo">
                        <div class="app-icon">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <rect width="64" height="64" rx="12" fill="currentColor" opacity="0.1"/>
                                <path d="M20 44L44 20M20 20L44 44" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                                <circle cx="32" cy="32" r="4" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="app-info">
                            <h2>Oxidian</h2>
                            <p class="version">Version ${s.version}</p>
                        </div>
                    </div>
                    
                    <div class="about-details">
                        <div class="about-section">
                            <h3>License</h3>
                            <p>${s.license}</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>Built with</h3>
                            <p>${s.credits}</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>System Information</h3>
                            <div class="system-info">
                                <div class="system-item">
                                    <span class="system-label">Platform:</span>
                                    <span class="system-value" id="platform-info">Loading...</span>
                                </div>
                                <div class="system-item">
                                    <span class="system-label">Architecture:</span>
                                    <span class="system-value" id="arch-info">Loading...</span>
                                </div>
                                <div class="system-item">
                                    <span class="system-label">Vault path:</span>
                                    <span class="system-value" id="vault-path-info">${this.esc(this.settings.general.vault_path || 'Not set')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="about-section">
                            <h3>Links</h3>
                            <div class="about-links">
                                <button class="link-button" id="btn-github">GitHub Repository</button>
                                <button class="link-button" id="btn-docs">Documentation</button>
                                <button class="link-button" id="btn-community">Community</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    bindEvents(wrapper) {
        // Navigation
        wrapper.querySelectorAll('.settings-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchToSection(btn.dataset.section, wrapper);
            });
        });

        // General settings
        this.bindGeneralEvents(wrapper);
        this.bindEditorEvents(wrapper);
        this.bindFilesLinksEvents(wrapper);
        this.bindAppearanceEvents(wrapper);
        this.bindHotkeysEvents(wrapper);
        this.bindCorePluginsEvents(wrapper);
        this.bindCommunityPluginsEvents(wrapper);
        this.bindAboutEvents(wrapper);

        // Auto-save with debouncing
        const saveDebounce = this.debounce(() => this.saveAll(wrapper), 500);
        wrapper.querySelectorAll('input, select, textarea').forEach(el => {
            if (!el.hasAttribute('data-no-autosave')) {
                el.addEventListener('change', saveDebounce);
                if (el.type !== 'range') {
                    el.addEventListener('input', saveDebounce);
                }
            }
        });

        // Conditional visibility
        this.setupConditionalVisibility(wrapper);
    }

    switchToSection(sectionName, wrapper) {
        this.activeSection = sectionName;
        
        // Update navigation
        wrapper.querySelectorAll('.settings-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
        
        // Update content
        wrapper.querySelectorAll('.settings-section').forEach(section => {
            section.classList.toggle('active', section.dataset.section === sectionName);
        });

        // BUG-AB2 FIX: Always initialize section when navigating to it
        this.initializeSection(sectionName);
    }

    initializeSection(sectionName) {
        // Always load installed plugins list (async, non-blocking)
        this.loadInstalledPlugins();

        // Initialize specific section functionality
        if (sectionName === 'hotkeys') {
            this.initializeHotkeys();
        } else if (sectionName === 'about') {
            this.loadSystemInfo();
        }
    }

    bindGeneralEvents(wrapper) {
        wrapper.querySelector('#btn-browse-vault')?.addEventListener('click', async () => {
            try {
                const { open } = window.__TAURI__.dialog;
                const selected = await open({ directory: true, multiple: false });
                if (selected) {
                    const pathInput = wrapper.querySelector('#general-vault-path');
                    pathInput.value = selected;
                    this.settings.general.vault_path = selected;
                    await this.saveAll(wrapper);
                }
            } catch (err) {
                console.error('Failed to browse vault:', err);
            }
        });
    }

    bindEditorEvents(wrapper) {
        // Font size slider — BUG-E4 FIX: use sibling selector within same .slider-container
        const fontSizeSlider = wrapper.querySelector('#editor-font-size');
        const fontSizeValue = fontSizeSlider?.parentElement?.querySelector('.slider-value');
        fontSizeSlider?.addEventListener('input', (e) => {
            if (fontSizeValue) fontSizeValue.textContent = e.target.value + 'px';
            document.documentElement.style.setProperty('--font-size-editor', e.target.value + 'px');
        });

        // Line height slider — BUG-E4 FIX
        const lineHeightSlider = wrapper.querySelector('#editor-line-height');
        const lineHeightValue = lineHeightSlider?.parentElement?.querySelector('.slider-value');
        lineHeightSlider?.addEventListener('input', (e) => {
            if (lineHeightValue) lineHeightValue.textContent = e.target.value;
            document.documentElement.style.setProperty('--line-height-editor', e.target.value);
        });

        // Font family
        const fontFamilyInput = wrapper.querySelector('#editor-font-family');
        fontFamilyInput?.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--font-editor', e.target.value);
        });

        // Line numbers
        const lineNumbersToggle = wrapper.querySelector('#editor-line-numbers');
        lineNumbersToggle?.addEventListener('change', (e) => {
            this.app.editor?.toggleLineNumbers?.(e.target.checked);
        });
    }

    bindFilesLinksEvents(wrapper) {
        // No special events needed yet
    }

    bindAppearanceEvents(wrapper) {
        // Theme selector
        wrapper.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                wrapper.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                const theme = option.dataset.theme;
                this.settings.appearance.theme = theme;
                this.app.themeManager?.applyTheme(theme);
                this.saveAll(wrapper);
            });
        });

        // Accent color
        const accentInput = wrapper.querySelector('#appearance-accent-color');
        accentInput?.addEventListener('change', (e) => {
            this.app.themeManager?.setAccentColor(e.target.value);
        });

        // BUG-A1 FIX: Apply interface font CSS variable on change
        const interfaceFontSelect = wrapper.querySelector('#appearance-interface-font');
        interfaceFontSelect?.addEventListener('change', (e) => {
            const fontMap = {
                'default': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                'system': 'system-ui, sans-serif',
                'inter': '"Inter", sans-serif',
                'roboto': '"Roboto", sans-serif',
                'custom': 'inherit'
            };
            const fontValue = fontMap[e.target.value] || fontMap['default'];
            document.documentElement.style.setProperty('--font-interface', fontValue);
            this.settings.appearance.interface_font = e.target.value;
        });

        // Color presets
        wrapper.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                accentInput.value = color;
                this.app.themeManager?.setAccentColor(color);
                this.saveAll(wrapper);
            });
        });

        // Interface font size — BUG-E4 FIX
        const ifontSizeSlider = wrapper.querySelector('#appearance-font-size');
        const ifontSizeValue = ifontSizeSlider?.parentElement?.querySelector('.slider-value');
        ifontSizeSlider?.addEventListener('input', (e) => {
            if (ifontSizeValue) ifontSizeValue.textContent = e.target.value + 'px';
            document.documentElement.style.fontSize = e.target.value + 'px';
        });

        // Zoom level — BUG-E4 FIX
        const zoomSlider = wrapper.querySelector('#appearance-zoom');
        const zoomValue = zoomSlider?.parentElement?.querySelector('.slider-value');
        zoomSlider?.addEventListener('input', (e) => {
            const zoom = parseFloat(e.target.value);
            if (zoomValue) zoomValue.textContent = Math.round(zoom * 100) + '%';
            document.body.style.zoom = zoom;
        });

        // CSS snippets
        wrapper.querySelector('#btn-manage-css')?.addEventListener('click', () => {
            // Open CSS snippets manager
            this.showCSSSnippetsManager();
        });
    }

    bindHotkeysEvents(wrapper) {
        // Search functionality
        const searchInput = wrapper.querySelector('#hotkeys-search');
        searchInput?.addEventListener('input', (e) => {
            this.filterHotkeys(e.target.value);
        });

        // Edit buttons
        wrapper.addEventListener('click', (e) => {
            if (e.target.classList.contains('hotkey-edit-btn')) {
                const commandId = e.target.dataset.command;
                this.editHotkey(commandId);
            } else if (e.target.classList.contains('hotkey-remove-btn')) {
                const commandId = e.target.dataset.command;
                this.removeHotkey(commandId);
            }
        });
    }

    bindCorePluginsEvents(wrapper) {
        // Plugin toggles
        wrapper.querySelectorAll('[id^="core-plugin-"]').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const pluginId = e.target.id.replace('core-plugin-', '');
                this.settings.core_plugins[pluginId] = e.target.checked;
                
                // Notify app about plugin state change
                try {
                    await invoke('toggle_core_plugin', { plugin: pluginId, enabled: e.target.checked });
                } catch (err) {
                    console.warn('Could not toggle core plugin:', err);
                }
            });
        });
    }

    bindCommunityPluginsEvents(wrapper) {
        // Safe mode toggle
        const safeModeToggle = wrapper.querySelector('#community-safe-mode');
        safeModeToggle?.addEventListener('change', (e) => {
            const safeMode = !e.target.checked;
            this.settings.community_plugins.safe_mode = safeMode;
            
            // Update UI state
            const controls = wrapper.querySelector('.community-plugins-controls');
            controls?.classList.toggle('disabled', safeMode);
            
            // Disable/enable controls
            wrapper.querySelectorAll('.community-plugins-controls button, .community-plugins-controls input').forEach(el => {
                el.disabled = safeMode;
            });
        });

        // Plugin management buttons
        wrapper.querySelector('#btn-browse-plugins')?.addEventListener('click', () => {
            this.showPluginBrowser();
        });

        wrapper.querySelector('#btn-install-plugin')?.addEventListener('click', () => {
            this.installPluginFromFolder();
        });

        wrapper.querySelector('#btn-reload-plugins')?.addEventListener('click', () => {
            this.reloadPlugins();
        });
    }

    bindAboutEvents(wrapper) {
        // Link buttons
        wrapper.querySelector('#btn-github')?.addEventListener('click', () => {
            this.openExternal('https://github.com/your-username/oxidian');
        });

        wrapper.querySelector('#btn-docs')?.addEventListener('click', () => {
            this.openExternal('https://oxidian.dev/docs');
        });

        wrapper.querySelector('#btn-community')?.addEventListener('click', () => {
            this.openExternal('https://discord.gg/oxidian');
        });
    }

    setupConditionalVisibility(wrapper) {
        // Show/hide elements based on other settings
        const conditionalElements = wrapper.querySelectorAll('[data-show-if], [data-show-if-value]');
        
        conditionalElements.forEach(element => {
            const condition = element.dataset.showIf || element.dataset.showIfValue;
            if (condition.includes(':')) {
                // Conditional based on specific value
                const [targetId, expectedValue] = condition.split(':');
                const targetElement = wrapper.querySelector('#' + targetId);
                
                const updateVisibility = () => {
                    const isVisible = targetElement && targetElement.value === expectedValue;
                    element.style.display = isVisible ? '' : 'none';
                };
                
                targetElement?.addEventListener('change', updateVisibility);
                updateVisibility();
            } else {
                // Conditional based on boolean state
                const targetElement = wrapper.querySelector('#' + condition);
                
                const updateVisibility = () => {
                    const isVisible = targetElement && targetElement.checked;
                    element.style.display = isVisible ? '' : 'none';
                };
                
                targetElement?.addEventListener('change', updateVisibility);
                updateVisibility();
            }
        });
    }

    async saveAll(wrapper) {
        if (!this.settings) return;

        // Collect all settings from the form
        const formData = new FormData();
        wrapper.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.name || el.id) {
                const key = el.name || el.id;
                let value = el.type === 'checkbox' ? el.checked : el.value;
                if (el.type === 'range' || el.type === 'number') {
                    value = parseFloat(value);
                }
                formData.set(key, value);
            }
        });

        // Update settings object
        this.updateSettingsFromForm(formData);

        try {
            await invoke('save_settings', { settings: this.settings });
        } catch (err) {
            console.error('Failed to save settings:', err);
            this.app?.showErrorToast?.('Failed to save settings: ' + err.message);
        }
    }

    updateSettingsFromForm(formData) {
        // BUG FIX: Read checkbox values directly from DOM using .checked instead of
        // relying on FormData string coercion (which converts booleans to "true"/"false"
        // strings unreliably across browsers)
        const getCheckbox = (id) => {
            const el = this.paneEl?.querySelector('#' + id);
            return el ? el.checked : false;
        };
        const getVal = (id, fallback) => {
            const el = this.paneEl?.querySelector('#' + id);
            return el ? el.value : (fallback || '');
        };
        const getNum = (id, fallback) => {
            return parseFloat(getVal(id, fallback)) || fallback;
        };

        // General
        this.settings.general.language = getVal('general-language', 'en');
        this.settings.general.startup_behavior = getVal('general-startup', 'welcome');
        this.settings.general.check_for_updates = getCheckbox('general-check-updates');
        this.settings.general.auto_update = getCheckbox('general-auto-update');
        this.settings.general.developer_mode = getCheckbox('general-dev-mode');

        // Editor
        this.settings.editor.font_family = getVal('editor-font-family', '');
        this.settings.editor.font_size = getNum('editor-font-size', 15);
        this.settings.editor.line_height = getNum('editor-line-height', 1.6);
        this.settings.editor.tab_size = getNum('editor-tab-size', 4);
        this.settings.editor.show_line_numbers = getCheckbox('editor-line-numbers');
        this.settings.editor.readable_line_length = getCheckbox('editor-readable-length');
        this.settings.editor.max_line_width = getNum('editor-max-width', 700);
        this.settings.editor.default_edit_mode = getVal('editor-default-mode', 'source');
        this.settings.editor.strict_line_breaks = getCheckbox('editor-strict-breaks');
        this.settings.editor.smart_indent = getCheckbox('editor-smart-indent');
        this.settings.editor.auto_pair_brackets = getCheckbox('editor-auto-pair-brackets');
        this.settings.editor.auto_pair_markdown = getCheckbox('editor-auto-pair-markdown');
        this.settings.editor.spell_check = getCheckbox('editor-spell-check');
        this.settings.editor.vim_mode = getCheckbox('editor-vim-mode');
        this.settings.editor.show_frontmatter = getCheckbox('editor-show-frontmatter');
        this.settings.editor.fold_heading = getCheckbox('editor-fold-heading');
        this.settings.editor.fold_indent = getCheckbox('editor-fold-indent');

        // Files & Links
        this.settings.files_links.default_note_location = getVal('files-default-location', 'vault_root');
        this.settings.files_links.new_note_location = getVal('files-new-note-location', '');
        this.settings.files_links.new_link_format = getVal('files-link-format', 'shortest');
        this.settings.files_links.use_markdown_links = !getCheckbox('files-use-wikilinks');
        this.settings.files_links.auto_update_internal_links = getCheckbox('files-auto-update-links');
        this.settings.files_links.detect_all_extensions = getCheckbox('files-detect-extensions');
        this.settings.files_links.attachment_folder = getVal('files-attachment-folder', 'attachments');
        this.settings.files_links.always_update_links = getCheckbox('files-always-update');
        this.settings.files_links.confirm_file_deletion = getCheckbox('files-confirm-delete');

        // Appearance
        this.settings.appearance.accent_color = getVal('appearance-accent-color', '#7f6df2');
        this.settings.appearance.interface_font = getVal('appearance-interface-font', 'default');
        this.settings.appearance.interface_font_size = getNum('appearance-font-size', 13);
        this.settings.appearance.zoom_level = getNum('appearance-zoom', 1.0);
        this.settings.appearance.translucent = getCheckbox('appearance-translucent');
        this.settings.appearance.native_menus = getCheckbox('appearance-native-menus');
        this.settings.appearance.custom_css = getCheckbox('appearance-custom-css');

        // Community Plugins
        this.settings.community_plugins.safe_mode = !getCheckbox('community-safe-mode');
        this.settings.community_plugins.plugin_updates = getCheckbox('community-plugin-updates');
    }

    // Utility methods
    debounce(fn, ms) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), ms);
        };
    }

    esc(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    async openExternal(url) {
        try {
            await invoke('open_external', { url });
        } catch (err) {
            window.open(url, '_blank');
        }
    }

    // Placeholder methods for advanced functionality
    async editHotkey(commandId) {
        console.log('Edit hotkey for command:', commandId);
        // Implementation would show hotkey recording dialog
    }

    async removeHotkey(commandId) {
        this.hotkeys.delete(commandId);
        await this.saveHotkeys();
        this.refreshHotkeys();
    }

    async saveHotkeys() {
        try {
            await invoke('save_hotkeys', { hotkeys: Object.fromEntries(this.hotkeys) });
        } catch (err) {
            console.error('Failed to save hotkeys:', err);
        }
    }

    filterHotkeys(query) {
        const normalizedQuery = (query || '').toLowerCase().trim();
        const hotkeyItems = this.paneEl?.querySelectorAll('.hotkey-item') || [];
        const categories = this.paneEl?.querySelectorAll('.hotkey-category') || [];

        hotkeyItems.forEach(item => {
            const commandName = item.querySelector('.hotkey-command-name')?.textContent?.toLowerCase() || '';
            const commandId = item.dataset.command || '';
            const matches = !normalizedQuery || commandName.includes(normalizedQuery) || commandId.includes(normalizedQuery);
            item.style.display = matches ? '' : 'none';
        });

        // Hide empty categories
        categories.forEach(cat => {
            const visibleItems = cat.querySelectorAll('.hotkey-item:not([style*="display: none"])');
            cat.style.display = visibleItems.length > 0 ? '' : 'none';
        });
    }

    refreshHotkeys() {
        // Implementation would refresh the hotkeys display
    }

    showCSSSnippetsManager() {
        const snippets = this.app.cssSnippets;
        if (!snippets) {
            alert('CSS Snippets module not available.');
            return;
        }

        const list = snippets.getSnippetList();
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.id = 'css-snippets-overlay';

        const listHtml = list.length === 0
            ? '<div style="padding:20px;text-align:center;color:var(--text-secondary);">No CSS snippets found.<br><small>Place <code>.css</code> files in <code>.oxidian/snippets/</code> or <code>.obsidian/snippets/</code></small></div>'
            : list.map(s => `
                <div class="snippet-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border-color);">
                    <span style="font-size:13px;">${s.name}</span>
                    <label class="toggle-switch" style="position:relative;width:36px;height:20px;display:inline-block;">
                        <input type="checkbox" data-snippet="${s.name}" ${s.enabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                        <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${s.enabled ? 'var(--text-accent)' : 'var(--bg-tertiary)'};border-radius:10px;transition:.2s;"></span>
                    </label>
                </div>
            `).join('');

        overlay.innerHTML = `
            <div class="dialog" style="max-width:400px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="margin:0;">CSS Snippets</h3>
                    <button class="icon-btn" id="btn-close-snippets" title="Close">✕</button>
                </div>
                <div style="max-height:300px;overflow-y:auto;">${listHtml}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#btn-close-snippets').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelectorAll('input[data-snippet]').forEach(input => {
            input.addEventListener('change', (e) => {
                snippets.toggle(e.target.dataset.snippet);
                // Update visual toggle
                const span = e.target.nextElementSibling;
                if (span) span.style.background = e.target.checked ? 'var(--text-accent)' : 'var(--bg-tertiary)';
            });
        });
    }

    async showPluginBrowser() {
        // Show a modal/overlay with community plugins
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.id = 'plugin-browser-overlay';
        overlay.innerHTML = `
            <div class="dialog dialog-lg" style="max-width:700px;max-height:80vh;display:flex;flex-direction:column;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="margin:0;">Community Plugins</h3>
                    <button class="icon-btn" id="btn-close-plugin-browser" title="Close">✕</button>
                </div>
                <input type="text" id="plugin-browser-search" placeholder="Search plugins..." style="margin-bottom:12px;" />
                <div id="plugin-browser-results" style="flex:1;overflow-y:auto;">
                    <div style="text-align:center;padding:20px;color:var(--text-secondary);">Loading community plugins...</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#btn-close-plugin-browser').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const resultsEl = overlay.querySelector('#plugin-browser-results');
        const searchEl = overlay.querySelector('#plugin-browser-search');

        let allPlugins = [];
        try {
            allPlugins = await invoke('fetch_community_plugin_list');
        } catch (err) {
            resultsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary);">
                <p>Could not load community plugins.</p>
                <p style="font-size:12px;opacity:0.7;">${this.esc(String(err))}</p>
            </div>`;
            return;
        }

        const renderList = (plugins) => {
            if (!plugins || plugins.length === 0) {
                resultsEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary);">No plugins found.</div>`;
                return;
            }
            resultsEl.innerHTML = plugins.slice(0, 50).map(p => `
                <div class="plugin-item" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <div style="font-weight:600;">${this.esc(p.name || p.id)}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">${this.esc(p.author || 'Unknown')} · v${this.esc(p.version || '?')}</div>
                            <div style="font-size:13px;margin-top:4px;">${this.esc(p.description || '')}</div>
                        </div>
                        <button class="mod-cta plugin-install-btn" data-plugin-id="${this.esc(p.id)}" style="flex-shrink:0;margin-left:12px;">Install</button>
                    </div>
                </div>
            `).join('');

            resultsEl.querySelectorAll('.plugin-install-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const pluginId = btn.dataset.pluginId;
                    btn.disabled = true;
                    btn.textContent = 'Installing...';
                    try {
                        await invoke('install_community_plugin', { pluginId });
                        btn.textContent = 'Installed';
                        this.loadInstalledPlugins();
                    } catch (err) {
                        btn.textContent = 'Failed';
                        console.error('Failed to install plugin:', err);
                    }
                });
            });
        };

        renderList(allPlugins);

        searchEl.addEventListener('input', () => {
            const q = searchEl.value.toLowerCase();
            if (!q) { renderList(allPlugins); return; }
            const filtered = allPlugins.filter(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.id || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
            renderList(filtered);
        });
    }

    async installPluginFromFolder() {
        try {
            const { open } = window.__TAURI__.dialog;
            const selected = await open({ directory: true, multiple: false });
            if (selected) {
                // Try to read manifest.json from the folder
                const manifestPath = selected + '/manifest.json';
                try {
                    const content = await invoke('read_file_absolute', { path: manifestPath });
                    const manifest = JSON.parse(content);
                    await invoke('install_plugin', { sourcePath: selected, pluginId: manifest.id });
                    this.loadInstalledPlugins();
                    this.app?.showToast?.('Plugin installed successfully');
                } catch (err) {
                    console.error('Failed to install plugin from folder:', err);
                    this.app?.showErrorToast?.('Failed to install plugin: ' + String(err));
                }
            }
        } catch (err) {
            console.error('Failed to browse for plugin folder:', err);
        }
    }

    async reloadPlugins() {
        try {
            if (this.app?.pluginLoader) {
                this.app.pluginLoader.destroy();
                await this.app.pluginLoader.init();
                this.loadInstalledPlugins();
                this.app?.showToast?.('Plugins reloaded');
            }
        } catch (err) {
            console.error('Failed to reload plugins:', err);
            this.app?.showErrorToast?.('Failed to reload plugins: ' + String(err));
        }
    }

    async loadInstalledPlugins() {
        const container = document.getElementById('installed-plugins-list');
        if (!container) return;

        let manifests = [];
        let enabledSet = new Set();

        try {
            manifests = await invoke('discover_plugins');
        } catch {
            try {
                manifests = await invoke('list_obsidian_plugins');
            } catch {
                manifests = [];
            }
        }

        try {
            const enabled = await invoke('get_enabled_plugins');
            enabledSet = new Set(enabled);
        } catch {}

        if (!manifests || manifests.length === 0) {
            container.innerHTML = `
                <div class="plugins-empty-state">
                    <div class="empty-state-icon">🧩</div>
                    <h3>No community plugins installed</h3>
                    <p>Browse the community plugin directory to discover new ways to extend Oxidian.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = manifests.map(m => {
            const isEnabled = enabledSet.has(m.id);
            return `
                <div class="plugin-item ${isEnabled ? 'enabled' : 'disabled'}">
                    <div class="plugin-info">
                        <div class="plugin-name">${this.esc(m.name || m.id)}</div>
                        <div class="plugin-description">${this.esc(m.description || '')} <span style="opacity:0.6;">v${this.esc(m.version || '?')} by ${this.esc(m.author || 'Unknown')}</span></div>
                    </div>
                    <div class="plugin-toggle">
                        <div class="checkbox-container">
                            <input type="checkbox" data-plugin-id="${this.esc(m.id)}" ${isEnabled ? 'checked' : ''} />
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Bind toggle events
        container.querySelectorAll('input[data-plugin-id]').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const pluginId = e.target.dataset.pluginId;
                const enabled = e.target.checked;
                if (this.app?.pluginLoader) {
                    await this.app.pluginLoader.togglePlugin(pluginId, enabled);
                } else {
                    try {
                        await invoke('toggle_plugin', { pluginId, enabled });
                    } catch (err) {
                        console.error('Failed to toggle plugin:', err);
                    }
                }
            });
        });
    }

    _renderPluginSettingTabs(wrapper) {
        // Add plugin SettingTabs (registered via addSettingTab) as extra nav items & sections
        const pluginLoader = this.app?.pluginLoader;
        if (!pluginLoader?.registry?.settingTabs) return;

        const navSection = wrapper.querySelector('.settings-nav-section');
        const sectionsContainer = wrapper.querySelector('.settings-sections');
        if (!navSection || !sectionsContainer) return;

        for (const [pluginId, tab] of pluginLoader.registry.settingTabs) {
            const manifest = pluginLoader.pluginManifests.get(pluginId);
            const displayName = manifest?.name || pluginId;
            const sectionId = `plugin-settings-${pluginId}`;

            // Add nav button
            const navBtn = document.createElement('button');
            navBtn.className = 'settings-nav-item';
            navBtn.dataset.section = sectionId;
            navBtn.innerHTML = `
                <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8m-4-4h8"/>
                </svg>
                <span>${this.esc(displayName)}</span>
            `;
            navBtn.addEventListener('click', () => {
                this.switchToSection(sectionId, wrapper);
                // Render plugin settings on first open
                if (!tab._rendered) {
                    tab._rendered = true;
                    tab.containerEl.innerHTML = '';
                    try { tab.display(); } catch (e) { 
                        console.error(`[Settings] Plugin settings error for ${pluginId}:`, e);
                        tab.containerEl.innerHTML = `<p style="color:var(--text-error);">Error loading settings: ${e.message}</p>`;
                    }
                }
            });
            navSection.appendChild(navBtn);

            // Add section
            const section = document.createElement('section');
            section.className = 'settings-section';
            section.dataset.section = sectionId;
            section.innerHTML = `
                <div class="settings-section-header">
                    <h1>${this.esc(displayName)}</h1>
                    <p class="settings-section-description">Settings for the ${this.esc(displayName)} plugin</p>
                </div>
            `;
            section.appendChild(tab.containerEl);
            sectionsContainer.appendChild(section);
        }
    }

    async loadSystemInfo() {
        try {
            const platform = await invoke('get_platform_info');
            document.querySelector('#platform-info').textContent = platform.os || 'Unknown';
            document.querySelector('#arch-info').textContent = platform.arch || 'Unknown';
        } catch (err) {
            console.warn('Could not load system info:', err);
        }
    }

    initializeHotkeys() {
        // Implementation would initialize hotkeys functionality
    }
}