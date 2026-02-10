// Oxidian — Hover Preview
// Hover über [[Link]] → zeigt Preview der verlinkten Note

const { invoke } = window.__TAURI__.core;

export class HoverPreview {
    constructor(app) {
        this.app = app;
        this.popup = null;
        this.currentLink = null;
        this.hoverTimer = null;
        this.isVisible = false;
        this.cache = new Map();
        this._boundHandlers = {
            mouseover: (e) => this.onMouseOver(e),
            mouseout: (e) => this.onMouseOut(e),
            keydown: (e) => this.onKeyDown(e)
        };
    }

    /**
     * Initialize hover preview for a container
     */
    init(container) {
        if (!container) return;

        // Remove existing listeners
        this.destroy();

        // Add event listeners
        container.addEventListener('mouseover', this._boundHandlers.mouseover);
        container.addEventListener('mouseout', this._boundHandlers.mouseout);
        document.addEventListener('keydown', this._boundHandlers.keydown);

        this.container = container;
    }

    onMouseOver(e) {
        const link = this.findWikilink(e.target);
        if (!link) {
            this.hidePreview();
            return;
        }

        // Clear any pending timer
        clearTimeout(this.hoverTimer);

        // Check if it's a different link
        if (this.currentLink !== link.href) {
            this.currentLink = link.href;
            
            // Show preview after short delay
            this.hoverTimer = setTimeout(() => {
                this.showPreview(link, e.clientX, e.clientY);
            }, 500);
        }
    }

    onMouseOut(e) {
        // Check if we're moving to the preview popup
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && this.popup && this.popup.contains(relatedTarget)) {
            return; // Don't hide when moving to popup
        }

        // Check if we're still over a wikilink
        const link = this.findWikilink(e.relatedTarget);
        if (link && link.href === this.currentLink) {
            return; // Still over same link
        }

        clearTimeout(this.hoverTimer);
        this.scheduleHide();
    }

    onKeyDown(e) {
        if (e.key === 'Escape') {
            this.hidePreview();
        } else if (this.isVisible && e.ctrlKey) {
            // Ctrl+hover shows extended preview
            if (this.popup) {
                this.popup.classList.add('extended');
            }
        }
    }

    findWikilink(element) {
        if (!element) return null;

        // Check if element itself is a wikilink
        if (element.classList?.contains('wikilink') || element.textContent?.match(/\[\[.+?\]\]/)) {
            return this.parseWikilink(element);
        }

        // Check parent elements
        let parent = element.parentElement;
        while (parent && parent !== this.container) {
            if (parent.classList?.contains('wikilink') || parent.textContent?.match(/\[\[.+?\]\]/)) {
                return this.parseWikilink(parent);
            }
            parent = parent.parentElement;
        }

        // Check if element contains wikilink text
        const text = element.textContent || '';
        const wikilinkMatch = text.match(/\[\[([^\]]+)\]\]/);
        if (wikilinkMatch) {
            return {
                element: element,
                href: wikilinkMatch[1].trim(),
                display: wikilinkMatch[1].trim()
            };
        }

        return null;
    }

    parseWikilink(element) {
        if (!element) return null;

        const text = element.textContent || '';
        const match = text.match(/\[\[([^\]]+)\]\]/);
        
        if (match) {
            const linkText = match[1].trim();
            const parts = linkText.split('|');
            const href = parts[0].trim();
            const display = parts[1]?.trim() || href;
            
            return {
                element: element,
                href: href,
                display: display
            };
        }

        return null;
    }

    async showPreview(link, x, y) {
        if (!link?.href) return;

        try {
            const content = await this.loadNoteContent(link.href);
            if (!content) {
                this.showNotFoundPreview(link, x, y);
                return;
            }

            this.createPreviewPopup(link, content, x, y);
            this.isVisible = true;

        } catch (err) {
            console.error('Failed to load preview:', err);
            this.showErrorPreview(link, err.message, x, y);
        }
    }

    async loadNoteContent(noteName) {
        // Check cache first
        if (this.cache.has(noteName)) {
            const cached = this.cache.get(noteName);
            // Cache for 30 seconds
            if (Date.now() - cached.time < 30000) {
                return cached.content;
            }
        }

        try {
            // Try different file extensions
            const possiblePaths = [
                `${noteName}.md`,
                `${noteName}`,
                noteName.endsWith('.md') ? noteName : null
            ].filter(Boolean);

            let content = null;
            for (const path of possiblePaths) {
                try {
                    content = await invoke('read_note', { path });
                    break;
                } catch (err) {
                    // Try next path
                    continue;
                }
            }

            if (content !== null) {
                // Cache the result
                this.cache.set(noteName, {
                    content: content,
                    time: Date.now()
                });
                
                // Limit cache size
                if (this.cache.size > 50) {
                    const oldestKey = this.cache.keys().next().value;
                    this.cache.delete(oldestKey);
                }
            }

            return content;

        } catch (err) {
            console.error('Failed to load note for preview:', err);
            return null;
        }
    }

    createPreviewPopup(link, content, x, y) {
        this.hidePreview();

        // Truncate content for preview (first few paragraphs)
        const truncatedContent = this.truncateContent(content);
        
        const popup = document.createElement('div');
        popup.className = 'hover-preview-popup';
        popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
                <div class="hover-preview-actions">
                    <button class="hover-preview-open" title="Open note">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </button>
                    <button class="hover-preview-close" title="Close">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="hover-preview-content">
                <div class="loading">Loading...</div>
            </div>
            <div class="hover-preview-footer">
                <span class="hover-preview-hint">Ctrl+hover for extended view</span>
            </div>
        `;

        document.body.appendChild(popup);
        this.popup = popup;

        // Position popup
        this.positionPopup(popup, x, y);

        // Render content
        this.renderPreviewContent(truncatedContent);

        // Bind events
        this.bindPopupEvents(link);

        // Prevent popup from hiding when hovering over it
        popup.addEventListener('mouseenter', () => {
            clearTimeout(this.hoverTimer);
        });
        
        popup.addEventListener('mouseleave', () => {
            this.scheduleHide();
        });
    }

    async renderPreviewContent(content) {
        if (!this.popup) return;

        const contentEl = this.popup.querySelector('.hover-preview-content');
        
        try {
            // Use Rust render_markdown_html directly for hover previews (faster, no embed/frontmatter processing needed)
            let html;
            try {
                html = await invoke('render_markdown_html', { content });
            } catch {
                // Fallback to app's full render pipeline
                html = await this.app.renderMarkdown?.(content);
            }
            
            if (!html) {
                contentEl.innerHTML = `<p style="color: var(--text-faint)">Empty note</p>`;
                return;
            }
            
            contentEl.innerHTML = html;
            
            // Process any special elements
            await this.app.postProcessRendered?.(contentEl);
            
        } catch (err) {
            contentEl.innerHTML = `<div class="preview-error">Failed to render preview: ${err.message}</div>`;
        }
    }

    truncateContent(content, maxLines = 15) {
        const lines = content.split('\n');
        
        // Remove frontmatter
        let startLine = 0;
        if (lines[0] === '---') {
            const endIndex = lines.findIndex((line, i) => i > 0 && line === '---');
            if (endIndex !== -1) {
                startLine = endIndex + 1;
            }
        }
        
        const relevantLines = lines.slice(startLine, startLine + maxLines);
        let result = relevantLines.join('\n').trim();
        
        if (lines.length > startLine + maxLines) {
            result += '\n\n...';
        }
        
        return result;
    }

    showNotFoundPreview(link, x, y) {
        this.hidePreview();

        const popup = document.createElement('div');
        popup.className = 'hover-preview-popup not-found';
        popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
            </div>
            <div class="hover-preview-content">
                <div class="preview-not-found">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <p>Note not found</p>
                    <button class="create-note-btn" data-note="${this.escapeHtml(link.href)}">Create note</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        this.popup = popup;
        this.positionPopup(popup, x, y);

        // Bind create button
        popup.querySelector('.create-note-btn')?.addEventListener('click', () => {
            this.createNote(link.href);
        });

        this.isVisible = true;
    }

    showErrorPreview(link, errorMessage, x, y) {
        this.hidePreview();

        const popup = document.createElement('div');
        popup.className = 'hover-preview-popup error';
        popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
            </div>
            <div class="hover-preview-content">
                <div class="preview-error">
                    <p>Error loading preview:</p>
                    <code>${this.escapeHtml(errorMessage)}</code>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        this.popup = popup;
        this.positionPopup(popup, x, y);
        this.isVisible = true;
    }

    bindPopupEvents(link) {
        if (!this.popup) return;

        // Open note button
        const openBtn = this.popup.querySelector('.hover-preview-open');
        openBtn?.addEventListener('click', () => {
            this.openNote(link.href);
        });

        // Close button
        const closeBtn = this.popup.querySelector('.hover-preview-close');
        closeBtn?.addEventListener('click', () => {
            this.hidePreview();
        });
    }

    positionPopup(popup, x, y) {
        const rect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + 10;
        let top = y + 10;

        // Ensure popup stays within viewport
        if (left + rect.width > viewportWidth) {
            left = x - rect.width - 10;
        }
        if (top + rect.height > viewportHeight) {
            top = y - rect.height - 10;
        }

        // Ensure minimum distance from edges
        left = Math.max(10, Math.min(left, viewportWidth - rect.width - 10));
        top = Math.max(10, Math.min(top, viewportHeight - rect.height - 10));

        popup.style.position = 'fixed';
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.zIndex = '10000';
    }

    scheduleHide() {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
            this.hidePreview();
        }, 300);
    }

    hidePreview() {
        clearTimeout(this.hoverTimer);
        
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        
        this.currentLink = null;
        this.isVisible = false;
    }

    async openNote(noteName) {
        this.hidePreview();
        
        try {
            await this.app.navigateToNote(noteName);
        } catch (err) {
            console.error('Failed to open note:', err);
        }
    }

    async createNote(noteName) {
        this.hidePreview();
        
        try {
            await this.app.navigateToNote(noteName); // This will create the note if it doesn't exist
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.hidePreview();
        
        if (this.container) {
            this.container.removeEventListener('mouseover', this._boundHandlers.mouseover);
            this.container.removeEventListener('mouseout', this._boundHandlers.mouseout);
            this.container = null;
        }
        
        document.removeEventListener('keydown', this._boundHandlers.keydown);
        
        this.cache.clear();
    }
}