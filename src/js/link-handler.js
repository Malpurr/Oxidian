// Oxidian — Link Handler Module
// Handles Ctrl+Click navigation for wikilinks and external links

const { invoke } = window.__TAURI__.core;

export class LinkHandler {
    constructor(app) {
        this.app = app;
        this.isCtrlPressed = false;
        this.currentHoverElement = null;
        
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                this.isCtrlPressed = true;
                this.updateCursorStyle();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                this.isCtrlPressed = false;
                this.updateCursorStyle();
            }
        });

        document.addEventListener('click', (e) => {
            if (this.isCtrlPressed) {
                this.handleCtrlClick(e);
            }
        });

        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        this.attachPreviewLinkHandlers();
    }

    /**
     * Handle Ctrl+Click events — opens links in a new tab
     */
    async handleCtrlClick(event) {
        const textarea = document.querySelector('.editor-textarea');
        if (event.target === textarea) {
            const link = await this.getLinkAtPosition(textarea, textarea.selectionStart);
            if (link) {
                event.preventDefault();
                this.navigateToLink(link, true);
            }
        }

        const linkElement = event.target.closest('a, .hl-wikilink');
        if (linkElement) {
            event.preventDefault();
            const link = this.extractLinkFromElement(linkElement);
            if (link) {
                this.navigateToLink(link, true);
            }
        }
    }

    /**
     * Handle mouse movement for cursor changes
     */
    async handleMouseMove(event) {
        if (!this.isCtrlPressed) {
            this.currentHoverElement = null;
            return;
        }

        const textarea = document.querySelector('.editor-textarea');
        if (event.target === textarea) {
            const rect = textarea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const position = this.getTextPositionFromCoordinates(textarea, x, y);
            const link = await this.getLinkAtPosition(textarea, position);
            
            if (link && link !== this.currentHoverElement) {
                this.currentHoverElement = link;
                this.showLinkTooltip(link, event.clientX, event.clientY);
                textarea.style.cursor = 'pointer';
            } else if (!link && this.currentHoverElement) {
                this.currentHoverElement = null;
                this.hideLinkTooltip();
                textarea.style.cursor = 'text';
            }
        }

        const linkElement = event.target.closest('a, .hl-wikilink');
        if (linkElement) {
            linkElement.style.cursor = 'pointer';
            const link = this.extractLinkFromElement(linkElement);
            if (link) {
                this.showLinkTooltip(link, event.clientX, event.clientY);
            }
        } else if (this.currentHoverElement) {
            this.hideLinkTooltip();
        }
    }

    /**
     * Get text position from mouse coordinates in textarea
     */
    getTextPositionFromCoordinates(textarea, x, y) {
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseInt(style.lineHeight) || 20;
        const fontSize = parseInt(style.fontSize) || 14;
        const approximateCharWidth = fontSize * 0.6;
        
        const lines = textarea.value.split('\n');
        const approximateLine = Math.floor(y / lineHeight);
        const approximateCol = Math.floor(x / approximateCharWidth);
        
        if (approximateLine >= lines.length) {
            return textarea.value.length;
        }
        
        let position = 0;
        for (let i = 0; i < approximateLine; i++) {
            position += lines[i].length + 1;
        }
        
        position += Math.min(approximateCol, lines[approximateLine]?.length || 0);
        return Math.min(position, textarea.value.length);
    }

    /**
     * Get link at a specific text position via Rust
     */
    async getLinkAtPosition(textarea, position) {
        const content = textarea.value;
        try {
            const link = await invoke('get_link_at_position', { text: content, offset: position });
            return link;
        } catch (err) {
            console.error('Failed to get link at position:', err);
            return null;
        }
    }

    /**
     * Extract link information from DOM element
     */
    extractLinkFromElement(element) {
        if (element.tagName === 'A') {
            return {
                type: 'url',
                target: element.href,
                text: element.textContent
            };
        }
        
        if (element.classList.contains('hl-wikilink')) {
            const text = element.textContent;
            const match = text.match(/\[\[([^\]]+)\]\]/);
            if (match) {
                return {
                    type: 'wikilink',
                    target: match[1],
                    text: text
                };
            }
        }
        
        return null;
    }

    /**
     * Navigate to a link.
     * Ctrl/Cmd+Click opens in a NEW TAB instead of replacing current.
     */
    async navigateToLink(link, openInNewTab = true) {
        try {
            switch (link.type) {
                case 'wikilink':
                    if (openInNewTab) {
                        await this.openNoteInNewTab(link.target);
                    } else {
                        await this.app.navigateToNote(link.target);
                    }
                    break;
                    
                case 'markdown':
                    if (this.isInternalLink(link.target)) {
                        if (openInNewTab) {
                            await this.openNoteInNewTab(link.target);
                        } else {
                            await this.app.navigateToNote(link.target);
                        }
                    } else {
                        this.openExternalLink(link.target);
                    }
                    break;
                    
                case 'url':
                    this.openExternalLink(link.target);
                    break;
            }
        } catch (error) {
            console.error('Failed to navigate to link:', error);
            this.showError(`Failed to open link: ${error.message}`);
        }
    }

    /**
     * Open a note in a new tab. If the note doesn't exist, create it first.
     */
    async openNoteInNewTab(target) {
        let path = target;
        if (!path.endsWith('.md')) path = target + '.md';

        try {
            const resolvedPath = await invoke('resolve_link', { vaultPath: path, link: target });
            if (resolvedPath) {
                path = resolvedPath;
            }
        } catch {
            // resolve_link not available or failed, use original path
        }

        try {
            await invoke('read_note', { path });
        } catch {
            try {
                const content = `# ${target}\n\n`;
                await invoke('save_note', { path, content });
                this.app.sidebar?.refresh();
                this.app.invalidateAutoCompleteCaches?.();
            } catch (createErr) {
                console.error('Failed to create note:', createErr);
                this.showError(`Failed to create note "${target}": ${createErr.message || createErr}`);
                return;
            }
        }

        await this.app.openFile(path);
    }

    /**
     * Check if a link is internal (points to another note)
     */
    isInternalLink(target) {
        return !target.startsWith('http://') && 
               !target.startsWith('https://') && 
               !target.startsWith('mailto:') &&
               !target.startsWith('ftp://');
    }

    /**
     * Open external link
     */
    openExternalLink(url) {
        if (window.__TAURI__) {
            window.__TAURI__.shell.open(url);
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Update cursor style based on Ctrl key state
     */
    updateCursorStyle() {
        const textareas = document.querySelectorAll('.editor-textarea');
        textareas.forEach(textarea => {
            if (this.isCtrlPressed && this.currentHoverElement) {
                textarea.style.cursor = 'pointer';
            } else {
                textarea.style.cursor = 'text';
            }
        });
    }

    /**
     * Show link tooltip
     */
    showLinkTooltip(link, x, y) {
        this.hideLinkTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'link-tooltip';
        tooltip.id = 'link-tooltip';
        
        let tooltipText = '';
        switch (link.type) {
            case 'wikilink':
                tooltipText = `Open note: ${link.target}`;
                break;
            case 'markdown':
                tooltipText = this.isInternalLink(link.target) ? 
                    `Open note: ${link.target}` : 
                    `Open link: ${link.target}`;
                break;
            case 'url':
                tooltipText = `Open: ${link.target}`;
                break;
        }
        
        tooltip.textContent = `Ctrl+Click to ${tooltipText}`;
        
        tooltip.style.position = 'fixed';
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y - 30 + 'px';
        tooltip.style.zIndex = '1000';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => this.hideLinkTooltip(), 3000);
    }

    /**
     * Hide link tooltip
     */
    hideLinkTooltip() {
        const tooltip = document.getElementById('link-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const error = document.createElement('div');
        error.className = 'link-error-toast';
        error.textContent = message;
        error.style.position = 'fixed';
        error.style.top = '20px';
        error.style.right = '20px';
        error.style.zIndex = '1000';
        
        document.body.appendChild(error);
        
        setTimeout(() => {
            if (error.parentNode) {
                error.parentNode.removeChild(error);
            }
        }, 3000);
    }

    /**
     * Attach handlers to preview links
     */
    attachPreviewLinkHandlers() {
        document.addEventListener('DOMContentLoaded', () => {
            this.updatePreviewLinkHandlers();
        });
    }

    /**
     * Update preview link handlers (call after preview update)
     */
    updatePreviewLinkHandlers() {
        const preview = document.querySelector('.preview-content');
        if (!preview) return;
        
        preview.querySelectorAll('a[href^="wikilink:"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (this.isCtrlPressed || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const target = link.getAttribute('href').replace('wikilink:', '');
                    this.app.navigateToNote(target);
                }
            });
        });
        
        preview.querySelectorAll('a[href^="http"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (this.isCtrlPressed || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.openExternalLink(link.href);
                }
            });
        });
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.hideLinkTooltip();
    }
}

/**
 * CSS for link handling
 */
export const LINK_HANDLER_CSS = `
/* Link Tooltip */
.link-tooltip {
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 300px;
    word-wrap: break-word;
    pointer-events: none;
    white-space: nowrap;
}

/* Link Error Toast */
.link-error-toast {
    background: var(--text-red);
    color: white;
    padding: 12px 16px;
    border-radius: var(--radius-md);
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Clickable links in source view */
.editor-textarea:hover {
    position: relative;
}

/* Enhanced wikilink highlighting */
.hl-wikilink {
    color: var(--text-accent);
    cursor: pointer;
    border-bottom: 1px dotted var(--text-accent);
    transition: all var(--transition);
}

.hl-wikilink:hover {
    background: rgba(127, 109, 242, 0.1);
    border-bottom-style: solid;
}

/* Ctrl pressed state */
body.ctrl-pressed .hl-wikilink,
body.ctrl-pressed a {
    cursor: pointer !important;
}
`;
