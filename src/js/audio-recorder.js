// Oxidian — Audio Recorder Module
// Records audio via Web Audio API (MediaRecorder) and saves to vault attachments.

import { invoke } from './tauri-bridge.js';

export class AudioRecorder {
    constructor(app) {
        this.app = app;
        this.mediaRecorder = null;
        this.chunks = [];
        this.recording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.ribbonBtn = null;
        this.statusIndicator = null;
        this.timerEl = null;

        this._createRibbonButton();
        this._createStatusIndicator();
    }

    _createRibbonButton() {
        const ribbonBottom = document.querySelector('.ribbon-bottom');
        if (!ribbonBottom) return;

        const btn = document.createElement('button');
        btn.className = 'ribbon-btn';
        btn.dataset.action = 'audio-record';
        btn.title = 'Start/Stop Audio Recording';
        btn.innerHTML = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>`;
        btn.addEventListener('click', () => this.toggle());

        // Insert before settings button
        const settingsBtn = ribbonBottom.querySelector('[data-action="settings"]');
        if (settingsBtn) {
            ribbonBottom.insertBefore(btn, settingsBtn);
        } else {
            ribbonBottom.appendChild(btn);
        }
        this.ribbonBtn = btn;
    }

    _createStatusIndicator() {
        const statusbar = document.getElementById('statusbar');
        if (!statusbar) return;

        const indicator = document.createElement('div');
        indicator.className = 'audio-recorder-status';
        indicator.style.display = 'none';
        indicator.innerHTML = `
            <span class="audio-recorder-dot"></span>
            <span class="audio-recorder-timer">00:00</span>
        `;
        statusbar.prepend(indicator);
        this.statusIndicator = indicator;
        this.timerEl = indicator.querySelector('.audio-recorder-timer');
    }

    async toggle() {
        if (this.recording) {
            await this.stop();
        } else {
            await this.start();
        }
    }

    async start() {
        if (this.recording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Determine best supported mime type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.chunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
                await this._saveRecording(mimeType);
            };

            this.mediaRecorder.start(1000); // collect chunks every second
            this.recording = true;
            this.startTime = Date.now();

            // UI updates
            this.ribbonBtn?.classList.add('audio-recording');
            if (this.statusIndicator) this.statusIndicator.style.display = 'flex';
            this._startTimer();

        } catch (err) {
            console.error('Audio recording failed:', err);
            // Show notification
            if (this.app.showNotice) {
                this.app.showNotice('Failed to access microphone: ' + err.message, 'error');
            }
        }
    }

    async stop() {
        if (!this.recording || !this.mediaRecorder) return;
        this.recording = false;
        this.mediaRecorder.stop();

        // UI updates
        this.ribbonBtn?.classList.remove('audio-recording');
        if (this.statusIndicator) this.statusIndicator.style.display = 'none';
        this._stopTimer();
    }

    _startTimer() {
        this._updateTimer();
        this.timerInterval = setInterval(() => this._updateTimer(), 1000);
    }

    _stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    _updateTimer() {
        if (!this.startTime || !this.timerEl) return;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        this.timerEl.textContent = `${mins}:${secs}`;
    }

    async _saveRecording(mimeType) {
        const blob = new Blob(this.chunks, { type: mimeType });
        const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'wav';

        // Generate filename
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const filename = `Recording ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.${ext}`;

        // Get attachment folder from settings
        let attachmentFolder = 'attachments';
        try {
            const settings = await invoke('get_settings');
            if (settings?.files?.attachment_folder) {
                attachmentFolder = settings.files.attachment_folder;
            }
        } catch (e) {
            console.warn('Could not load settings for attachment folder, using default');
        }

        const relativePath = `${attachmentFolder}/${filename}`;

        // Convert blob to base64
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        try {
            await invoke('save_binary_file', {
                relativePath: relativePath,
                base64Data: base64
            });

            // Auto-insert embed link at cursor
            this._insertEmbed(filename);

            if (this.app.showNotice) {
                this.app.showNotice(`Recording saved: ${filename}`);
            }
        } catch (err) {
            console.error('Failed to save recording:', err);
            if (this.app.showNotice) {
                this.app.showNotice('Failed to save recording: ' + err, 'error');
            }
        }
    }

    _insertEmbed(filename) {
        // Insert ![[filename]] at cursor in current editor
        const embed = `![[${filename}]]`;
        try {
            if (this.app.hypermarkEditor?.view) {
                const view = this.app.hypermarkEditor.view;
                const pos = view.state.selection.main.head;
                view.dispatch({
                    changes: { from: pos, insert: embed + '\n' }
                });
            } else if (this.app.editor?.cm) {
                const cm = this.app.editor.cm;
                const pos = cm.state.selection.main.head;
                cm.dispatch({
                    changes: { from: pos, insert: embed + '\n' }
                });
            }
        } catch (e) {
            console.warn('Could not auto-insert recording embed:', e);
        }
    }

    isRecording() {
        return this.recording;
    }

    destroy() {
        this.stop();
        this.ribbonBtn?.remove();
        this.statusIndicator?.remove();
    }
}
