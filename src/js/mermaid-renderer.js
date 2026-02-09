// Oxidian — Mermaid Diagram Renderer
// Lazy-loads mermaid.js from CDN and renders ```mermaid code blocks as diagrams.

export class MermaidRenderer {
    constructor() {
        this.loaded = false;
        this.loading = false;
        this.mermaidApi = null;
        this.renderQueue = [];
        this.idCounter = 0;
    }

    /**
     * Lazy-load mermaid.js from CDN.
     */
    async ensureLoaded() {
        if (this.loaded) return;
        if (this.loading) {
            // Wait for ongoing load
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (this.loaded) { clearInterval(check); resolve(); }
                }, 100);
            });
        }

        this.loading = true;
        try {
            await this._loadScript('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js');
            if (window.mermaid) {
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: this._detectTheme(),
                    securityLevel: 'loose',
                    fontFamily: 'var(--font-editor, monospace)',
                });
                this.mermaidApi = window.mermaid;
                this.loaded = true;
            }
        } catch (err) {
            console.error('MermaidRenderer: failed to load mermaid.js', err);
        }
        this.loading = false;
    }

    /**
     * Process HTML to find mermaid code blocks and render them as diagrams.
     * Call this on rendered markdown HTML (as DOM element).
     */
    async processElement(el) {
        // Find <code class="language-mermaid"> inside <pre>
        const codeBlocks = el.querySelectorAll('pre > code.language-mermaid');
        if (codeBlocks.length === 0) return;

        await this.ensureLoaded();
        if (!this.mermaidApi) return;

        for (const code of codeBlocks) {
            const pre = code.parentElement;
            const definition = code.textContent.trim();
            if (!definition) continue;

            const container = document.createElement('div');
            container.className = 'mermaid-diagram';
            container.style.cssText = `
                display: flex;
                justify-content: center;
                padding: 16px;
                margin: 12px 0;
                background: var(--bg-secondary, #181825);
                border-radius: 8px;
                border: 1px solid var(--border-color, #313244);
                overflow-x: auto;
            `;

            try {
                const id = `mermaid-${Date.now()}-${this.idCounter++}`;
                const { svg } = await this.mermaidApi.render(id, definition);
                container.innerHTML = svg;
            } catch (err) {
                container.innerHTML = `
                    <div class="mermaid-error" style="color: var(--text-red, #f38ba8); padding: 12px; font-size: 13px;">
                        <strong>Mermaid Error:</strong> ${this._escapeHtml(err.message || String(err))}
                        <pre style="margin-top: 8px; font-size: 12px; opacity: 0.7;">${this._escapeHtml(definition.substring(0, 200))}</pre>
                    </div>
                `;
            }

            pre.replaceWith(container);
        }
    }

    /**
     * Process an HTML string (finds mermaid blocks, renders, returns modified HTML).
     * For cases where we need string-based processing.
     */
    async processHtml(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        await this.processElement(container);
        return container.innerHTML;
    }

    _detectTheme() {
        // Check if dark mode
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')?.trim();
        if (bg) {
            // Simple heuristic: if background is dark, use dark theme
            const r = parseInt(bg.slice(1, 3), 16) || 0;
            const g = parseInt(bg.slice(3, 5), 16) || 0;
            const b = parseInt(bg.slice(5, 7), 16) || 0;
            if ((r + g + b) / 3 < 128) return 'dark';
        }
        return document.body.classList.contains('theme-light') ? 'default' : 'dark';
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
