// Oxidian — Link Handler Module
// Handles Ctrl+Click navigation for wikilinks and external links

export class LinkHandler {
    constructor(app) {
        this.app = app;
        this.isCtrlPressed = false;
        this.currentHoverElement = null;
        this.linkDetectionRegex = {
            wikilink: /\[\[([^\]]+)\]\]/g,
            markdown: /\[([^\]]+)\]\(([^)]+)\)/g,
            url: /(https?:\/\/[^\s]+)/g
        };
        
        this.init();
    }

    init() {
        // Track Ctrl key state
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

        // Handle clicks on editor
        document.addEventListener('click', (e) => {
            if (this.isCtrlPressed) {
                this.handleCtrlClick(e);
            }
        });

        // Handle mouse move for cursor changes
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Handle clicks on preview links
        this.attachPreviewLinkHandlers();
    }

    /**
     * Handle Ctrl+Click events
     */
    handleCtrlClick(event) {
        // Check if we're in an editor textarea
        const textarea = document.querySelector('.editor-textarea');
        if (event.target === textarea) {
            const link = this.getLinkAtPosition(textarea, textarea.selectionStart);
            if (link) {
                event.preventDefault();
                this.navigateToLink(link);
            }
        }

        // Check if we're clicking on a preview link
        const linkElement = event.target.closest('a, .hl-wikilink');
        if (linkElement) {
            event.preventDefault();
            const link = this.extractLinkFromElement(linkElement);
            if (link) {
                this.navigateToLink(link);
            }
        }
    }

    /**
     * Handle mouse movement for cursor changes
     */
    handleMouseMove(event) {
        if (!this.isCtrlPressed) {
            this.currentHoverElement = null;
            return;
        }

        // Check if we're over a textarea
        const textarea = document.querySelector('.editor-textarea');
        if (event.target === textarea) {
            const rect = textarea.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const position = this.getTextPositionFromCoordinates(textarea, x, y);
            const link = this.getLinkAtPosition(textarea, position);
            
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

        // Check preview links
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
        // This is a simplified approach - in reality, this requires more complex calculations
        // involving line height, character width, etc.
        const style = window.getComputedStyle(textarea);
        const lineHeight = parseInt(style.lineHeight) || 20;
        const fontSize = parseInt(style.fontSize) || 14;
        const approximateCharWidth = fontSize * 0.6; // Rough approximation
        
        const lines = textarea.value.split('\n');
        const approximateLine = Math.floor(y / lineHeight);
        const approximateCol = Math.floor(x / approximateCharWidth);
        
        if (approximateLine >= lines.length) {
            return textarea.value.length;
        }
        
        let position = 0;
        for (let i = 0; i < approximateLine; i++) {
            position += lines[i].length + 1; // +1 for newline
        }
        
        position += Math.min(approximateCol, lines[approximateLine]?.length || 0);
        return Math.min(position, textarea.value.length);
    }

    /**
     * Get link at a specific text position
     */
    getLinkAtPosition(textarea, position) {
        const content = textarea.value;
        const links = this.findAllLinks(content);
        
        for (const link of links) {
            if (position >= link.start && position <= link.end) {
                return link;
            }
        }
        
        return null;
    }

    /**
     * Find all links in content
     */
    findAllLinks(content) {
        const links = [];
        
        // Find wikilinks
        let match;
        this.linkDetectionRegex.wikilink.lastIndex = 0;
        while ((match = this.linkDetectionRegex.wikilink.exec(content)) !== null) {
            links.push({
                type: 'wikilink',
                text: match[0],
                target: match[1],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // Find markdown links
        this.linkDetectionRegex.markdown.lastIndex = 0;
        while ((match = this.linkDetectionRegex.markdown.exec(content)) !== null) {
            links.push({
                type: 'markdown',
                text: match[0],
                title: match[1],
                target: match[2],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // Find plain URLs
        this.linkDetectionRegex.url.lastIndex = 0;
        while ((match = this.linkDetectionRegex.url.exec(content)) !== null) {
            // Skip if this URL is already part of a markdown link
            const isPartOfMarkdownLink = links.some(link => 
                link.type === 'markdown' && 
                match.index >= link.start && 
                match.index + match[0].length <= link.end
            );
            
            if (!isPartOfMarkdownLink) {
                links.push({
                    type: 'url',
                    text: match[0],
                    target: match[1],
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        }
        
        return links.sort((a, b) => a.start - b.start);
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
     * Navigate to a link
     */
    async navigateToLink(link) {
        try {
            switch (link.type) {
                case 'wikilink':
                    await this.app.navigateToNote(link.target);
                    break;
                    
                case 'markdown':
                    if (this.isInternalLink(link.target)) {
                        await this.app.navigateToNote(link.target);
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
            // Show user-friendly error
            this.showError(`Failed to open link: ${error.message}`);
        }
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
            // Tauri environment - open in default browser
            window.__TAURI__.shell.open(url);
        } else {
            // Regular web environment
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
        this.hideLinkTooltip(); // Remove existing tooltip
        
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
        
        // Position tooltip
        tooltip.style.position = 'fixed';
        tooltip.style.left = x + 10 + 'px';
        tooltip.style.top = y - 30 + 'px';
        tooltip.style.zIndex = '1000';
        
        document.body.appendChild(tooltip);
        
        // Auto-hide after 3 seconds
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
        // Create temporary error message
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
        // This will be called when the preview is updated
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
        
        // Handle wikilinks in preview
        preview.querySelectorAll('a[href^="wikilink:"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (this.isCtrlPressed || e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const target = link.getAttribute('href').replace('wikilink:', '');
                    this.app.navigateToNote(target);
                }
            });
        });
        
        // Handle external links in preview
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
        // Remove event listeners if needed
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