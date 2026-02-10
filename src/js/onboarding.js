// Oxidian — First-Time Setup / Onboarding Wizard
import { invoke } from './tauri-bridge.js';

export class Onboarding {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById('onboarding-screen');
        this.step = 0;
        this.vaultPath = '';
        this.enableEncryption = false;
        this.password = '';
    }

    async shouldShow() {
        try {
            return await invoke('is_first_launch');
        } catch {
            return false;
        }
    }

    show() {
        if (!this.el) return;
        this.el.classList.remove('hidden');
        this.step = 0;
        this.render();
    }

    hide() {
        if (!this.el) return;
        this.el.classList.add('hidden');
    }

    render() {
        const steps = [
            this.renderWelcome.bind(this),
            this.renderVaultSetup.bind(this),
            this.renderEncryption.bind(this),
            this.renderTour.bind(this),
        ];

        if (this.step >= steps.length) {
            this.finish();
            return;
        }

        this.el.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'onboarding-container';

        // Progress indicator
        const progress = document.createElement('div');
        progress.className = 'onboarding-progress';
        for (let i = 0; i < steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'progress-dot' + (i === this.step ? ' active' : '') + (i < this.step ? ' done' : '');
            progress.appendChild(dot);
        }
        container.appendChild(progress);

        const content = document.createElement('div');
        content.className = 'onboarding-content';
        steps[this.step](content);
        container.appendChild(content);

        this.el.appendChild(container);
    }

    renderWelcome(el) {
        el.innerHTML = `
            <div class="onboarding-icon">◈</div>
            <h1>Welcome to Oxidian</h1>
            <p>An open-source note-taking app built for privacy and performance.</p>
            <p class="text-muted">Let's get you set up in a few quick steps.</p>
            <div class="onboarding-actions">
                <button class="btn-primary btn-lg" id="ob-next">Get Started</button>
            </div>
            <div style="margin-top: 16px;">
                <button class="btn-skip-link" id="ob-skip" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-family:var(--font-sans);padding:6px 12px;transition:color 150ms ease;">Skip setup →</button>
            </div>
        `;
        el.querySelector('#ob-next').addEventListener('click', () => { this.step++; this.render(); });
        el.querySelector('#ob-skip').addEventListener('click', () => this.finish());
    }

    renderVaultSetup(el) {
        el.innerHTML = `
            <h2>Set Up Your Vault</h2>
            <p>Choose where to store your notes. A vault is just a folder on your computer.</p>
            <div class="onboarding-options">
                <button class="ob-option-card" id="ob-new-vault">
                    <div class="ob-option-icon">📁</div>
                    <h3>Create New Vault</h3>
                    <p>Start fresh with a new empty vault</p>
                </button>
                <button class="ob-option-card" id="ob-open-vault">
                    <div class="ob-option-icon">📂</div>
                    <h3>Open Existing Vault</h3>
                    <p>Use an existing folder of notes</p>
                </button>
            </div>
            <div class="onboarding-vault-path" id="ob-vault-path-group" style="display:none">
                <label>Vault Location</label>
                <div class="ob-path-input">
                    <input type="text" id="ob-vault-path" placeholder="Select or type a folder path...">
                    <button class="btn-secondary btn-sm" id="ob-browse">Browse</button>
                </div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" id="ob-back">Back</button>
                    <button class="btn-primary" id="ob-vault-next" disabled>Continue</button>
                </div>
            </div>
        `;

        const pathGroup = el.querySelector('#ob-vault-path-group');
        const pathInput = el.querySelector('#ob-vault-path');
        const nextBtn = el.querySelector('#ob-vault-next');

        const showPathInput = async (isNew) => {
            pathGroup.style.display = 'block';
            el.querySelector('.onboarding-options').style.display = 'none';
            // Use default path for new vault
            if (isNew) {
                try {
                    const defaultPath = await invoke('get_vault_path');
                    pathInput.value = defaultPath;
                    this.vaultPath = defaultPath;
                    nextBtn.disabled = false;
                } catch {}
            }
        };

        el.querySelector('#ob-new-vault').addEventListener('click', () => showPathInput(true));
        el.querySelector('#ob-open-vault').addEventListener('click', () => showPathInput(false));

        // Allow manual path entry
        pathInput.addEventListener('input', () => {
            this.vaultPath = pathInput.value.trim();
            nextBtn.disabled = !this.vaultPath;
        });

        el.querySelector('#ob-browse')?.addEventListener('click', async () => {
            try {
                const { open } = window.__TAURI__.dialog || {};
                if (open) {
                    const selected = await open({ directory: true, title: 'Select Vault Folder' });
                    if (selected) {
                        pathInput.value = selected;
                        this.vaultPath = selected;
                        nextBtn.disabled = false;
                    }
                }
            } catch {}
        });

        nextBtn.addEventListener('click', async () => {
            if (this.vaultPath) {
                try {
                    await invoke('setup_vault', { path: this.vaultPath });
                } catch (err) { console.error(err); }
                this.step++;
                this.render();
            }
        });

        el.querySelector('#ob-back')?.addEventListener('click', () => {
            pathGroup.style.display = 'none';
            el.querySelector('.onboarding-options').style.display = 'flex';
        });
    }

    renderEncryption(el) {
        el.innerHTML = `
            <h2>Vault Security</h2>
            <p>Would you like to encrypt your vault? Your notes will be protected with a master password.</p>
            <div class="onboarding-options">
                <button class="ob-option-card" id="ob-encrypt-yes">
                    <div class="ob-option-icon">🔒</div>
                    <h3>Enable Encryption</h3>
                    <p>AES-256-GCM encryption with Argon2id</p>
                </button>
                <button class="ob-option-card" id="ob-encrypt-no">
                    <div class="ob-option-icon">📝</div>
                    <h3>Skip for Now</h3>
                    <p>You can enable this later in Settings</p>
                </button>
            </div>
            <div id="ob-password-group" style="display:none">
                <div class="ob-password-fields">
                    <input type="password" id="ob-password" placeholder="Enter master password...">
                    <input type="password" id="ob-password-confirm" placeholder="Confirm password...">
                    <p class="ob-password-hint text-muted">Use a strong, memorable password. If you forget it, your data cannot be recovered.</p>
                </div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" id="ob-enc-back">Back</button>
                    <button class="btn-primary" id="ob-enc-next">Set Password & Continue</button>
                </div>
            </div>
        `;

        el.querySelector('#ob-encrypt-no').addEventListener('click', () => {
            this.enableEncryption = false;
            this.step++;
            this.render();
        });

        el.querySelector('#ob-encrypt-yes').addEventListener('click', () => {
            el.querySelector('.onboarding-options').style.display = 'none';
            el.querySelector('#ob-password-group').style.display = 'block';
        });

        el.querySelector('#ob-enc-back')?.addEventListener('click', () => {
            el.querySelector('.onboarding-options').style.display = 'flex';
            el.querySelector('#ob-password-group').style.display = 'none';
        });

        el.querySelector('#ob-enc-next')?.addEventListener('click', async () => {
            const pwd = el.querySelector('#ob-password').value;
            const confirm = el.querySelector('#ob-password-confirm').value;
            if (!pwd) { alert('Please enter a password'); return; }
            if (pwd !== confirm) { alert('Passwords do not match'); return; }
            try {
                await invoke('setup_encryption', { password: pwd });
                this.enableEncryption = true;
                this.step++;
                this.render();
            } catch (err) { alert('Failed: ' + err); }
        });
    }

    renderTour(el) {
        el.innerHTML = `
            <h2>You're All Set! ✨</h2>
            <p>Here's what you can do with Oxidian:</p>
            <div class="tour-features">
                <div class="tour-feature">
                    <span class="tour-icon">📝</span>
                    <div><strong>Markdown Editor</strong><br><span style="color:var(--text-muted);font-size:12px">Full markdown, live preview, and [[wiki-links]]</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">🔗</span>
                    <div><strong>Graph View</strong><br><span style="color:var(--text-muted);font-size:12px">Visualize connections between your notes</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">🔍</span>
                    <div><strong>Full-Text Search</strong><br><span style="color:var(--text-muted);font-size:12px">Find anything instantly with Ctrl+Shift+F</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">📅</span>
                    <div><strong>Daily Notes</strong><br><span style="color:var(--text-muted);font-size:12px">Journal with auto-created daily notes (Ctrl+D)</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">⚡</span>
                    <div><strong>Slash Commands</strong><br><span style="color:var(--text-muted);font-size:12px">Type / in the editor for quick formatting</span></div>
                </div>
            </div>
            <div class="onboarding-actions" style="margin-top:32px">
                <button class="btn-primary btn-lg" id="ob-finish">Start Writing ✦</button>
            </div>
        `;

        el.querySelector('#ob-finish').addEventListener('click', () => this.finish());
    }

    async finish() {
        // Smooth fade-out
        if (this.el) {
            this.el.style.transition = 'opacity 300ms ease';
            this.el.style.opacity = '0';
            await new Promise(r => setTimeout(r, 300));
        }
        this.hide();
        if (this.el) this.el.style.opacity = '';
        await this.app.sidebar?.refresh();
        await this.app.loadTags();
    }
}
