// Oxidian — Settings Page (opens as a tab)
// UI-only: rendering, form handling, theme preview
// All data/logic via Rust invoke()
const { invoke } = window.__TAURI__.core;

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.settings = null;
        this.paneEl = null;
    }

    async load() {
        try {
            this.settings = await invoke('load_settings');
        } catch (err) {
            console.error('Failed to load settings:', err);
            // Fallback: Rust should provide defaults, but if invoke fails entirely use minimal defaults
            this.settings = {
                general: { vault_path: '', language: 'en', startup_behavior: 'welcome' },
                editor: { font_family: 'JetBrains Mono, Fira Code, Consolas, monospace', font_size: 15, line_height: 1.7, tab_size: 4, spell_check: true, vim_mode: false },
                appearance: { theme: 'dark', accent_color: '#7f6df2', interface_font_size: 13 },
                vault: { encryption_enabled: false, auto_backup: false },
                plugins: { enabled_plugins: [] },
            };
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
    }

    renderHTML() {
        const s = this.settings;
        return `
            <div class="settings-header">
                <h1>Settings</h1>
            </div>
            <div class="settings-body">
                <nav class="settings-nav">
                    <button class="settings-nav-item active" data-section="general">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                        General
                    </button>
                    <button class="settings-nav-item" data-section="editor">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editor
                    </button>
                    <button class="settings-nav-item" data-section="appearance">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        Appearance
                    </button>
                    <button class="settings-nav-item" data-section="vault-settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        Vault
                    </button>
                    <button class="settings-nav-item" data-section="plugins">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>
                        Plugins
                    </button>
                    <button class="settings-nav-item" data-section="updates">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        Updates
                    </button>
                </nav>
                <div class="settings-content">
                    <!-- General -->
                    <div class="settings-section active" id="section-general">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> General</h2>
                        <div class="setting-row">
                            <div class="setting-info"><label>Vault Path</label><p>Location of your notes vault</p></div>
                            <div class="setting-control"><input type="text" id="set-vault-path" value="${this.esc(s.general.vault_path)}" readonly><button class="btn-secondary btn-sm" id="btn-browse-vault">Browse</button></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Language</label><p>Interface language</p></div>
                            <div class="setting-control">
                                <select id="set-language"><option value="en" ${s.general.language === 'en' ? 'selected' : ''}>English</option><option value="de" ${s.general.language === 'de' ? 'selected' : ''}>Deutsch</option><option value="fr" ${s.general.language === 'fr' ? 'selected' : ''}>Français</option></select>
                            </div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Startup Behavior</label><p>What to show when Oxidian starts</p></div>
                            <div class="setting-control">
                                <select id="set-startup"><option value="welcome" ${s.general.startup_behavior === 'welcome' ? 'selected' : ''}>Welcome Screen</option><option value="last-session" ${s.general.startup_behavior === 'last-session' ? 'selected' : ''}>Last Session</option><option value="daily-note" ${s.general.startup_behavior === 'daily-note' ? 'selected' : ''}>Daily Note</option></select>
                            </div>
                        </div>
                    </div>

                    <!-- Editor -->
                    <div class="settings-section" id="section-editor">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editor</h2>
                        <div class="setting-row">
                            <div class="setting-info"><label>Font Family</label><p>Editor font</p></div>
                            <div class="setting-control"><input type="text" id="set-font-family" value="${this.esc(s.editor.font_family)}"></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Font Size</label><p>Editor font size in pixels</p></div>
                            <div class="setting-control"><input type="range" id="set-font-size" min="10" max="28" value="${s.editor.font_size}"><span id="set-font-size-val">${s.editor.font_size}px</span></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Line Height</label><p>Line spacing multiplier</p></div>
                            <div class="setting-control"><input type="range" id="set-line-height" min="1.0" max="2.5" step="0.1" value="${s.editor.line_height}"><span id="set-line-height-val">${s.editor.line_height}</span></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Tab Size</label><p>Number of spaces per tab</p></div>
                            <div class="setting-control"><select id="set-tab-size"><option value="2" ${s.editor.tab_size === 2 ? 'selected' : ''}>2</option><option value="4" ${s.editor.tab_size === 4 ? 'selected' : ''}>4</option><option value="8" ${s.editor.tab_size === 8 ? 'selected' : ''}>8</option></select></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Spell Check</label><p>Enable browser spell checking</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-spellcheck" ${s.editor.spell_check ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Vim Mode</label><p>Enable Vim keybindings (experimental)</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-vim" ${s.editor.vim_mode ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Editor Engine</label><p>Choose your editing experience</p></div>
                            <div class="setting-control">
                                <select id="set-editor-mode">
                                    <option value="classic" ${(this.app.editorMode === 'classic') ? 'selected' : ''}>Classic</option>
                                    <option value="hypermark" ${(this.app.editorMode === 'hypermark') ? 'selected' : ''}>HyperMark (Experimental)</option>
                                </select>
                            </div>
                        </div>
                        <div class="setting-row" id="row-hypermark-warning" style="display:${this.app.editorMode === 'hypermark' ? 'flex' : 'none'}">
                            <div class="setting-info" style="flex:1">
                                <p style="color: var(--text-yellow); font-size: 12px;">⚠️ HyperMark ist ein block-basierter Editor und kann instabil sein. Bei Problemen wechsle zurück zu Classic.</p>
                            </div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Show Line Numbers</label><p>Display line numbers in the classic editor</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-line-numbers" ${localStorage.getItem('oxidian-line-numbers') === 'true' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                    </div>

                    <!-- Appearance -->
                    <div class="settings-section" id="section-appearance">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> Appearance</h2>
                        <div class="setting-row">
                            <div class="setting-info"><label>Theme</label><p>Choose a color theme</p></div>
                            <div class="setting-control">
                                <div class="theme-grid" id="theme-grid"></div>
                            </div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Accent Color</label><p>Primary accent color</p></div>
                            <div class="setting-control"><input type="color" id="set-accent" value="${s.appearance.accent_color}"></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Interface Font Size</label><p>UI font size in pixels</p></div>
                            <div class="setting-control"><input type="range" id="set-ui-font-size" min="11" max="18" value="${s.appearance.interface_font_size}"><span id="set-ui-font-size-val">${s.appearance.interface_font_size}px</span></div>
                        </div>
                    </div>

                    <!-- Vault -->
                    <div class="settings-section" id="section-vault-settings">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Vault</h2>
                        <div class="setting-row">
                            <div class="setting-info"><label>Encryption</label><p>Encrypt vault files with AES-256-GCM</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-encryption" ${s.vault.encryption_enabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                        <div class="setting-row" id="row-change-password" style="display:${s.vault.encryption_enabled ? 'flex' : 'none'}">
                            <div class="setting-info"><label>Change Password</label><p>Update your vault encryption password</p></div>
                            <div class="setting-control"><button class="btn-secondary btn-sm" id="btn-change-password">Change Password</button></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Auto Backup</label><p>Automatically backup vault periodically</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-backup" ${s.vault.auto_backup ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                    </div>

                    <!-- Plugins -->
                    <div class="settings-section" id="section-plugins">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg> Plugins</h2>
                        <div id="plugins-list" class="plugins-list"><p class="text-muted">Loading plugins...</p></div>
                        <button class="btn-secondary" id="btn-load-plugin" style="margin-top:12px">Load Plugin</button>
                    </div>

                    <!-- Updates -->
                    <div class="settings-section" id="section-updates">
                        <h2><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Updates</h2>
                        <div class="setting-row">
                            <div class="setting-info"><label>Current Version</label><p id="current-version-display">v1.1.2</p></div>
                            <div class="setting-control"><button class="btn-secondary btn-sm" id="btn-check-update">Check Now</button></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Check for updates on startup</label><p>Automatically check for new versions when Oxidian starts</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-update-check" ${localStorage.getItem('oxidian-update-check') !== 'false' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                        <div class="setting-row">
                            <div class="setting-info"><label>Auto-install updates</label><p>Automatically download and install updates (requires restart)</p></div>
                            <div class="setting-control"><label class="toggle"><input type="checkbox" id="set-auto-install" ${localStorage.getItem('oxidian-auto-install-updates') === 'true' ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
                        </div>
                        <div id="update-status" class="text-muted" style="padding:8px 0;font-size:13px"></div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents(wrapper) {
        // Nav
        wrapper.querySelectorAll('.settings-nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                wrapper.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
                wrapper.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
                btn.classList.add('active');
                const section = wrapper.querySelector(`#section-${btn.dataset.section}`);
                if (section) section.classList.add('active');
            });
        });

        // Theme grid
        this.renderThemeGrid(wrapper);

        // Live preview bindings
        const fontSizeRange = wrapper.querySelector('#set-font-size');
        fontSizeRange?.addEventListener('input', (e) => {
            wrapper.querySelector('#set-font-size-val').textContent = e.target.value + 'px';
            document.documentElement.style.setProperty('--font-size-editor', e.target.value + 'px');
        });

        const lineHeightRange = wrapper.querySelector('#set-line-height');
        lineHeightRange?.addEventListener('input', (e) => {
            wrapper.querySelector('#set-line-height-val').textContent = e.target.value;
        });

        const uiFontRange = wrapper.querySelector('#set-ui-font-size');
        uiFontRange?.addEventListener('input', (e) => {
            wrapper.querySelector('#set-ui-font-size-val').textContent = e.target.value + 'px';
            document.documentElement.style.fontSize = e.target.value + 'px';
        });

        const accentInput = wrapper.querySelector('#set-accent');
        accentInput?.addEventListener('input', (e) => {
            this.app.themeManager?.setAccentColor(e.target.value);
        });

        const fontFamilyInput = wrapper.querySelector('#set-font-family');
        fontFamilyInput?.addEventListener('change', (e) => {
            document.documentElement.style.setProperty('--font-editor', e.target.value);
        });

        const editorModeSelect = wrapper.querySelector('#set-editor-mode');
        editorModeSelect?.addEventListener('change', (e) => {
            this.app.setEditorMode(e.target.value);
            const warning = wrapper.querySelector('#row-hypermark-warning');
            if (warning) warning.style.display = e.target.value === 'hypermark' ? 'flex' : 'none';
        });

        const lineNumToggle = wrapper.querySelector('#set-line-numbers');
        lineNumToggle?.addEventListener('change', (e) => {
            localStorage.setItem('oxidian-line-numbers', e.target.checked ? 'true' : 'false');
            this.app.editor?.toggleLineNumbers?.(e.target.checked);
        });

        // Encryption toggle
        const encToggle = wrapper.querySelector('#set-encryption');
        encToggle?.addEventListener('change', async (e) => {
            const row = wrapper.querySelector('#row-change-password');
            if (e.target.checked) {
                const pwd = prompt('Set vault encryption password:');
                if (!pwd) { e.target.checked = false; return; }
                const confirmPwd = prompt('Confirm password:');
                if (pwd !== confirmPwd) { alert('Passwords do not match'); e.target.checked = false; return; }
                try {
                    await invoke('setup_encryption', { password: pwd });
                    row.style.display = 'flex';
                } catch (err) { alert('Failed: ' + err); e.target.checked = false; }
            } else {
                if (!confirm('Disabling encryption will decrypt all vault files. Continue?')) {
                    e.target.checked = true;
                    return;
                }
                try {
                    await invoke('disable_encryption');
                    row.style.display = 'none';
                } catch (err) {
                    alert('Failed to disable encryption: ' + err);
                    e.target.checked = true;
                }
            }
        });

        // Change password
        wrapper.querySelector('#btn-change-password')?.addEventListener('click', async () => {
            const oldPwd = prompt('Current password:');
            if (!oldPwd) return;
            const newPwd = prompt('New password:');
            if (!newPwd) return;
            const confirmPwd = prompt('Confirm new password:');
            if (newPwd !== confirmPwd) { alert('Passwords do not match'); return; }
            try {
                await invoke('change_password', { oldPassword: oldPwd, newPassword: newPwd });
                alert('Password changed successfully');
            } catch (err) { alert('Failed: ' + err); }
        });

        // Load plugins
        this.loadPluginsList(wrapper);

        // Load Plugin button
        wrapper.querySelector('#btn-load-plugin')?.addEventListener('click', async () => {
            try {
                const { open } = window.__TAURI__.dialog;
                const selected = await open({ directory: true, multiple: false, title: 'Select Obsidian Plugin Folder' });
                if (!selected) return;

                const path = typeof selected === 'string' ? selected : selected.path;

                let manifest;
                try {
                    const sep = path.includes('\\') ? '\\' : '/';
                    const manifestStr = await invoke('read_file_absolute', { path: path + sep + 'manifest.json' });
                    manifest = JSON.parse(manifestStr);
                } catch (e) {
                    console.error('Plugin manifest error:', e);
                    alert('No valid manifest.json found in selected folder. Make sure this is an Obsidian plugin.');
                    return;
                }

                const pluginId = manifest.id;

                try {
                    await invoke('install_plugin', { sourcePath: path, pluginId: pluginId });
                } catch (e) {
                    console.error('Install error:', e);
                    alert(`Plugin "${manifest.name}" found! Copy the folder to your vault's .obsidian/plugins/${pluginId}/ and restart.`);
                    return;
                }

                alert(`Plugin "${manifest.name}" installed! Enable it in the list below.`);
                this.loadPluginsList(wrapper);
            } catch (err) {
                alert('To install a plugin:\n1. Download the plugin (manifest.json + main.js)\n2. Place it in your vault\'s .obsidian/plugins/<plugin-id>/ folder\n3. Restart Oxidian or refresh the plugin list');
            }
        });

        // Update settings
        wrapper.querySelector('#set-update-check')?.addEventListener('change', (e) => {
            localStorage.setItem('oxidian-update-check', e.target.checked ? 'true' : 'false');
        });
        wrapper.querySelector('#set-auto-install')?.addEventListener('change', (e) => {
            localStorage.setItem('oxidian-auto-install-updates', e.target.checked ? 'true' : 'false');
        });
        wrapper.querySelector('#btn-check-update')?.addEventListener('click', async () => {
            const statusEl = wrapper.querySelector('#update-status');
            if (statusEl) statusEl.textContent = 'Checking for updates...';
            if (this.app.updateManager) {
                await this.app.updateManager.checkForUpdate(true);
                if (statusEl && !this.app.updateManager.updateInfo) {
                    statusEl.textContent = 'You\'re on the latest version!';
                } else if (statusEl && this.app.updateManager.updateInfo) {
                    statusEl.textContent = `Update available: v${this.app.updateManager.updateInfo.version}`;
                }
            }
        });

        // Load current version
        (async () => {
            try {
                const ver = await invoke('get_current_version');
                const el = wrapper.querySelector('#current-version-display');
                if (el) el.textContent = 'v' + ver;
            } catch {}
        })();

        // Auto-save on any change with validation
        const saveDebounce = this.debounce(() => this.saveAll(wrapper), 500);
        wrapper.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', saveDebounce);
            el.addEventListener('input', saveDebounce);
        });
    }

    async renderThemeGrid(wrapper) {
        const grid = wrapper.querySelector('#theme-grid');
        if (!grid) return;

        const themeLabels = this.app.themeManager?.getBuiltInThemeLabels() || {
            'system': 'System',
            'dark': 'Dark',
            'light': 'Light',
            'high-contrast': 'High Contrast',
            'nord': 'Nord',
            'solarized': 'Solarized'
        };

        let customThemes = [];
        try {
            customThemes = await this.app.themeManager?.getCustomThemeNames() || [];
        } catch {}

        grid.innerHTML = '';

        for (const [themeKey, themeLabel] of Object.entries(themeLabels)) {
            const card = document.createElement('div');
            card.className = 'theme-card' + (themeKey === this.settings.appearance.theme ? ' active' : '');

            let previewClass = themeKey;
            if (themeKey === 'system') {
                const systemPref = this.app.themeManager?.getSystemPreferenceTheme() || 'dark';
                previewClass = systemPref;
                card.classList.add('system-theme');
            }

            card.innerHTML = `
                <div class="theme-preview theme-preview-${previewClass}">
                    ${themeKey === 'system' ? '<span class="system-indicator">⚙</span>' : ''}
                </div>
                <span>${themeLabel}</span>
            `;

            card.addEventListener('click', () => {
                grid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.settings.appearance.theme = themeKey;
                this.app.themeManager?.applyTheme(themeKey);
                this.saveAll(wrapper);
            });
            grid.appendChild(card);
        }

        for (const name of customThemes) {
            const card = document.createElement('div');
            card.className = 'theme-card' + (name === this.settings.appearance.theme ? ' active' : '');
            card.innerHTML = `
                <div class="theme-preview theme-preview-custom">
                    <span class="custom-indicator">◉</span>
                </div>
                <span>${name.charAt(0).toUpperCase() + name.slice(1)}</span>
            `;
            card.addEventListener('click', () => {
                grid.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.settings.appearance.theme = name;
                this.app.themeManager?.applyTheme(name);
                this.saveAll(wrapper);
            });
            grid.appendChild(card);
        }
    }

    async loadPluginsList(wrapper) {
        const list = wrapper.querySelector('#plugins-list');
        const loader = this.app.pluginLoader;

        try {
            const obsidianPlugins = await invoke('list_obsidian_plugins');
            let legacyPlugins = [];
            try { legacyPlugins = await invoke('list_plugins'); } catch {}

            const hasAny = obsidianPlugins.length > 0 || legacyPlugins.length > 0;

            if (!hasAny) {
                list.innerHTML = `
                    <p class="text-muted">No plugins installed.</p>
                    <p class="text-muted" style="font-size:12px;margin-top:4px">
                        Place Obsidian community plugins in <code>.obsidian/plugins/</code><br>
                        or native plugins in <code>.oxidian/plugins/</code>
                    </p>
                `;
                return;
            }

            list.innerHTML = '';

            if (obsidianPlugins.length > 0) {
                const header = document.createElement('div');
                header.className = 'plugins-section-header';
                header.innerHTML = '<h3 style="margin:0 0 8px;font-size:13px;color:var(--text-secondary)">Community Plugins (Obsidian-compatible)</h3>';
                list.appendChild(header);

                for (const p of obsidianPlugins) {
                    const item = document.createElement('div');
                    item.className = 'plugin-item';
                    const isEnabled = loader ? loader.isEnabled(p.id) : false;
                    item.innerHTML = `
                        <div class="plugin-info">
                            <span class="plugin-name">${this.esc(p.name)} <span class="plugin-version">v${this.esc(p.version)}</span></span>
                            <span class="plugin-desc">${this.esc(p.description)}</span>
                            <span class="plugin-author">by ${this.esc(p.author)}</span>
                        </div>
                        <div class="plugin-controls">
                            <label class="toggle"><input type="checkbox" data-obsidian-plugin="${this.esc(p.id)}" ${isEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
                        </div>
                    `;

                    const toggle = item.querySelector(`[data-obsidian-plugin="${this.esc(p.id)}"]`);
                    toggle?.addEventListener('change', async (e) => {
                        if (loader) {
                            await loader.togglePlugin(p.id, e.target.checked);
                        }
                    });

                    if (loader && loader.isLoaded(p.id)) {
                        const settingsTab = loader.getPluginSettingTab(p.id);
                        if (settingsTab) {
                            const settingsBtn = document.createElement('button');
                            settingsBtn.className = 'btn-secondary btn-sm';
                            settingsBtn.textContent = '⚙';
                            settingsBtn.title = 'Plugin Settings';
                            settingsBtn.style.marginLeft = '8px';
                            settingsBtn.addEventListener('click', () => {
                                this.showPluginSettings(p.id, p.name, settingsTab);
                            });
                            item.querySelector('.plugin-controls')?.appendChild(settingsBtn);
                        }
                    }

                    list.appendChild(item);
                }
            }

            if (legacyPlugins.length > 0) {
                const header = document.createElement('div');
                header.className = 'plugins-section-header';
                header.innerHTML = '<h3 style="margin:12px 0 8px;font-size:13px;color:var(--text-secondary)">Native Plugins</h3>';
                list.appendChild(header);

                for (const p of legacyPlugins) {
                    const item = document.createElement('div');
                    item.className = 'plugin-item';
                    const isEnabled = this.settings.plugins.enabled_plugins.includes(p.id);
                    item.innerHTML = `
                        <div class="plugin-info">
                            <span class="plugin-name">${this.esc(p.name)} <span class="plugin-version">v${this.esc(p.version)}</span></span>
                            <span class="plugin-desc">${this.esc(p.description)}</span>
                            <span class="plugin-author">by ${this.esc(p.author)}</span>
                        </div>
                        <label class="toggle"><input type="checkbox" data-plugin="${this.esc(p.id)}" ${isEnabled ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    `;
                    list.appendChild(item);
                }
            }
        } catch (err) {
            console.error('Failed to load plugins:', err);
            list.innerHTML = '<p class="text-muted">Failed to load plugins</p>';
        }
    }

    showPluginSettings(pluginId, pluginName, settingsTab) {
        const existing = this.paneEl?.querySelector('.plugin-settings-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.className = 'plugin-settings-panel';
        panel.innerHTML = `
            <div class="plugin-settings-header">
                <button class="btn-secondary btn-sm plugin-settings-back">← Back</button>
                <h3>${this.esc(pluginName)} Settings</h3>
            </div>
            <div class="plugin-settings-content"></div>
        `;

        const content = panel.querySelector('.plugin-settings-content');
        settingsTab.containerEl = content;

        panel.querySelector('.plugin-settings-back')?.addEventListener('click', () => {
            panel.remove();
        });

        try {
            settingsTab.display();
        } catch (e) {
            content.innerHTML = `<p class="text-muted">Failed to load plugin settings: ${e.message}</p>`;
        }

        this.paneEl?.querySelector('.settings-content')?.appendChild(panel);
    }

    async saveAll(wrapper) {
        if (!this.settings) return;

        this.settings.general.language = wrapper.querySelector('#set-language')?.value || 'en';
        this.settings.general.startup_behavior = wrapper.querySelector('#set-startup')?.value || 'welcome';
        this.settings.editor.font_family = wrapper.querySelector('#set-font-family')?.value || '';
        this.settings.editor.font_size = parseInt(wrapper.querySelector('#set-font-size')?.value) || 15;
        this.settings.editor.line_height = parseFloat(wrapper.querySelector('#set-line-height')?.value) || 1.7;
        this.settings.editor.tab_size = parseInt(wrapper.querySelector('#set-tab-size')?.value) || 4;
        this.settings.editor.spell_check = wrapper.querySelector('#set-spellcheck')?.checked ?? true;
        this.settings.editor.vim_mode = wrapper.querySelector('#set-vim')?.checked ?? false;
        this.settings.appearance.accent_color = wrapper.querySelector('#set-accent')?.value || '#7f6df2';
        this.settings.appearance.interface_font_size = parseInt(wrapper.querySelector('#set-ui-font-size')?.value) || 13;
        this.settings.vault.encryption_enabled = wrapper.querySelector('#set-encryption')?.checked ?? false;
        this.settings.vault.auto_backup = wrapper.querySelector('#set-backup')?.checked ?? false;

        const pluginToggles = wrapper.querySelectorAll('[data-plugin]');
        this.settings.plugins.enabled_plugins = [];
        pluginToggles.forEach(el => {
            if (el.checked) this.settings.plugins.enabled_plugins.push(el.dataset.plugin);
        });

        // Validate before saving
        try {
            const validation = await invoke('validate_settings', { settings: this.settings });
            if (validation && !validation.valid) {
                console.warn('Settings validation failed:', validation.errors);
                this.app?.showErrorToast?.(`Invalid settings: ${validation.errors?.join(', ') || 'Unknown error'}`);
                return;
            }
        } catch (err) {
            // Validation command may not exist yet — proceed with save
            console.debug('Settings validation skipped:', err);
        }

        try {
            await invoke('save_settings', { settings: this.settings });
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    }

    debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    esc(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}
