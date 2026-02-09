// Oxidian — Settings Page (opens as a tab)
const { invoke } = window.__TAURI__.core;

export class SettingsPage {
    constructor(app) {
        this.app = app;
        this.settings = null;
        this.paneEl = null;
    }

    async load() {
        try {
            this.settings = await invoke('get_settings');
        } catch (err) {
            console.error('Failed to load settings:', err);
            this.settings = this.defaultSettings();
        }
    }

    defaultSettings() {
        return {
            general: { vault_path: '', language: 'en', startup_behavior: 'welcome' },
            editor: { font_family: 'JetBrains Mono, Fira Code, Consolas, monospace', font_size: 15, line_height: 1.7, tab_size: 4, spell_check: true, vim_mode: false },
            appearance: { theme: 'dark', accent_color: '#7f6df2', interface_font_size: 13 },
            vault: { encryption_enabled: false, auto_backup: false },
            plugins: { enabled_plugins: [] },
        };
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
                    <button class="settings-nav-item active" data-section="general">General</button>
                    <button class="settings-nav-item" data-section="editor">Editor</button>
                    <button class="settings-nav-item" data-section="appearance">Appearance</button>
                    <button class="settings-nav-item" data-section="vault-settings">Vault</button>
                    <button class="settings-nav-item" data-section="plugins">Plugins</button>
                </nav>
                <div class="settings-content">
                    <!-- General -->
                    <div class="settings-section active" id="section-general">
                        <h2>General</h2>
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
                        <h2>Editor</h2>
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
                    </div>

                    <!-- Appearance -->
                    <div class="settings-section" id="section-appearance">
                        <h2>Appearance</h2>
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
                        <h2>Vault</h2>
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
                        <h2>Plugins</h2>
                        <div id="plugins-list" class="plugins-list"><p class="text-muted">Loading plugins...</p></div>
                        <button class="btn-secondary" id="btn-load-plugin" style="margin-top:12px">Load Plugin</button>
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

        // Encryption toggle
        const encToggle = wrapper.querySelector('#set-encryption');
        encToggle?.addEventListener('change', async (e) => {
            const row = wrapper.querySelector('#row-change-password');
            if (e.target.checked) {
                const pwd = prompt('Set vault encryption password:');
                if (!pwd) { e.target.checked = false; return; }
                const confirm = prompt('Confirm password:');
                if (pwd !== confirm) { alert('Passwords do not match'); e.target.checked = false; return; }
                try {
                    await invoke('setup_encryption', { password: pwd });
                    row.style.display = 'flex';
                } catch (err) { alert('Failed: ' + err); e.target.checked = false; }
            } else {
                row.style.display = 'none';
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

        // Load Plugin button — open file picker to install a plugin folder
        wrapper.querySelector('#btn-load-plugin')?.addEventListener('click', async () => {
            try {
                const { open } = window.__TAURI__.dialog;
                const selected = await open({ directory: true, multiple: false, title: 'Select Obsidian Plugin Folder' });
                if (!selected) return;

                // Read manifest from selected folder
                const { readTextFile, copyFile, mkdir, exists } = window.__TAURI__.fs;
                const path = typeof selected === 'string' ? selected : selected.path;
                
                // Try to get plugin id from manifest
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

                // Copy plugin to vault's .obsidian/plugins/
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
                // If dialog API not available, show manual instructions
                alert('To install a plugin:\n1. Download the plugin (manifest.json + main.js)\n2. Place it in your vault\'s .obsidian/plugins/<plugin-id>/ folder\n3. Restart Oxidian or refresh the plugin list');
            }
        });

        // Auto-save on any change
        const saveDebounce = this.debounce(() => this.saveAll(wrapper), 500);
        wrapper.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', saveDebounce);
            el.addEventListener('input', saveDebounce);
        });
    }

    async renderThemeGrid(wrapper) {
        const grid = wrapper.querySelector('#theme-grid');
        if (!grid) return;

        const builtIn = this.app.themeManager?.getBuiltInThemeNames() || ['dark', 'light', 'nord', 'solarized'];
        let customThemes = [];
        try { customThemes = await invoke('list_custom_themes'); } catch {}

        const allThemes = [...builtIn, ...customThemes];
        grid.innerHTML = '';

        for (const name of allThemes) {
            const card = document.createElement('div');
            card.className = 'theme-card' + (name === this.settings.appearance.theme ? ' active' : '');
            card.innerHTML = `<div class="theme-preview theme-preview-${name}"></div><span>${name.charAt(0).toUpperCase() + name.slice(1)}</span>`;
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
            // Load Obsidian-compatible plugins
            const obsidianPlugins = await invoke('list_obsidian_plugins');
            // Load legacy plugins
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

            // Obsidian-compatible plugins section
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

                    // Wire toggle
                    const toggle = item.querySelector(`[data-obsidian-plugin="${this.esc(p.id)}"]`);
                    toggle?.addEventListener('change', async (e) => {
                        if (loader) {
                            await loader.togglePlugin(p.id, e.target.checked);
                        }
                    });

                    // Settings button if plugin has a settings tab
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

            // Legacy plugins section
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
        // Show plugin settings in a modal-like panel
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

        // Collect enabled plugins
        const pluginToggles = wrapper.querySelectorAll('[data-plugin]');
        this.settings.plugins.enabled_plugins = [];
        pluginToggles.forEach(el => {
            if (el.checked) this.settings.plugins.enabled_plugins.push(el.dataset.plugin);
        });

        try {
            await invoke('save_settings', { newSettings: this.settings });
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
