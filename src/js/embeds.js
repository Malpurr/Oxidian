// Oxidian — Embeds/Transclusion Module
// Handles ![[note]] and ![[note#heading]] syntax for inline content embedding

const { invoke } = window.__TAURI__.core;

export class EmbedProcessor {
    constructor(app) {
        this.app = app;
        this.embedCache = new Map(); // Cache for embedded content
        this.maxEmbedDepth = 3; // Prevent infinite recursion
        this.currentEmbedDepth = 0;
    }

    /**
     * Process embeds in markdown content
     * @param {string} content - The markdown content
     * @param {string} currentPath - Current file path for relative resolution
     * @param {number} embedDepth - Current embedding depth
     * @returns {string} Processed content with embeds rendered
     */
    async processEmbeds(content, currentPath = null, embedDepth = 0) {
        if (embedDepth >= this.maxEmbedDepth) {
            return content;
        }

        this.currentEmbedDepth = embedDepth;

        // Match embed patterns: ![[note]] or ![[note#heading]]
        const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
        let processedContent = content;
        const embeds = [];

        // Find all embeds
        let match;
        while ((match = embedRegex.exec(content)) !== null) {
            embeds.push({
                fullMatch: match[0],
                notePath: match[1].trim(),
                heading: match[2]?.trim(),
                index: match.index
            });
        }

        // Process embeds in reverse order to maintain indices
        for (const embed of embeds.reverse()) {
            try {
                const embeddedContent = await this.renderEmbed(embed, currentPath, embedDepth + 1);
                processedContent = processedContent.substring(0, embed.index) +
                                embeddedContent +
                                processedContent.substring(embed.index + embed.fullMatch.length);
            } catch (error) {
                console.error('Failed to process embed:', embed.fullMatch, error);
                // Replace with error placeholder
                const errorContent = this.renderEmbedError(embed, error.message);
                processedContent = processedContent.substring(0, embed.index) +
                                errorContent +
                                processedContent.substring(embed.index + embed.fullMatch.length);
            }
        }

        return processedContent;
    }

    /**
     * Render a single embed
     */
    async renderEmbed(embed, currentPath, embedDepth) {
        const { notePath, heading } = embed;
        
        // Normalize path
        let fullPath = notePath;
        if (!fullPath.endsWith('.md')) {
            fullPath = fullPath + '.md';
        }

        // Check cache first
        const cacheKey = `${fullPath}#${heading || ''}`;
        if (this.embedCache.has(cacheKey)) {
            return this.wrapEmbedContent(this.embedCache.get(cacheKey), embed, embedDepth);
        }

        try {
            // Read the note content
            const noteContent = await invoke('read_note', { path: fullPath });
            
            let contentToEmbed;
            
            if (heading) {
                // Extract specific section
                contentToEmbed = this.extractSection(noteContent, heading);
            } else {
                // Embed entire note (excluding frontmatter)
                contentToEmbed = this.stripFrontmatter(noteContent);
            }

            // Recursively process embeds in the embedded content
            if (contentToEmbed && embedDepth < this.maxEmbedDepth) {
                contentToEmbed = await this.processEmbeds(contentToEmbed, fullPath, embedDepth);
            }

            // Cache the result
            this.embedCache.set(cacheKey, contentToEmbed);

            return this.wrapEmbedContent(contentToEmbed, embed, embedDepth);

        } catch (error) {
            // Note doesn't exist or can't be read
            throw new Error(`Could not embed "${notePath}": ${error.message}`);
        }
    }

    /**
     * Extract a specific section from markdown content
     */
    extractSection(content, targetHeading) {
        const lines = content.split('\n');
        let inTargetSection = false;
        let targetLevel = null;
        const sectionLines = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if this is a heading
            const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const headingText = headingMatch[2].trim();
                
                if (!inTargetSection) {
                    // Look for our target heading
                    if (headingText.toLowerCase() === targetHeading.toLowerCase()) {
                        inTargetSection = true;
                        targetLevel = level;
                        sectionLines.push(line);
                        continue;
                    }
                } else {
                    // We're in the target section - check if we've hit a same-level or higher heading
                    if (level <= targetLevel) {
                        break; // End of our section
                    }
                }
            }
            
            if (inTargetSection) {
                sectionLines.push(line);
            }
        }

        if (!inTargetSection) {
            throw new Error(`Heading "${targetHeading}" not found`);
        }

        return sectionLines.join('\n');
    }

    /**
     * Remove YAML frontmatter from content
     */
    stripFrontmatter(content) {
        if (!content.startsWith('---\n')) {
            return content;
        }

        const lines = content.split('\n');
        let endIndex = -1;
        
        // Find the closing ---
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                endIndex = i;
                break;
            }
        }

        if (endIndex > 0) {
            return lines.slice(endIndex + 1).join('\n').trim();
        }

        return content;
    }

    /**
     * Wrap embedded content with visual styling
     */
    wrapEmbedContent(content, embed, embedDepth) {
        if (!content || content.trim() === '') {
            return this.renderEmbedError(embed, 'No content found');
        }

        const depthClass = `embed-depth-${embedDepth}`;
        const sourceInfo = embed.heading ? 
            `${embed.notePath}#${embed.heading}` : 
            embed.notePath;

        return `
<div class="embedded-content ${depthClass}" data-source="${sourceInfo}">
    <div class="embed-header">
        <span class="embed-source">${this.escapeHtml(sourceInfo)}</span>
        <button class="embed-open-btn" onclick="window.navigateToNote('${embed.notePath}')" title="Open in new tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
        </button>
    </div>
    <div class="embed-content">
        ${content}
    </div>
</div>`;
    }

    /**
     * Render embed error placeholder
     */
    renderEmbedError(embed, errorMessage) {
        const sourceInfo = embed.heading ? 
            `${embed.notePath}#${embed.heading}` : 
            embed.notePath;

        return `
<div class="embedded-content embed-error" data-source="${sourceInfo}">
    <div class="embed-header">
        <span class="embed-source">${this.escapeHtml(sourceInfo)}</span>
        <span class="embed-error-indicator">!</span>
    </div>
    <div class="embed-content">
        <div class="embed-error-message">
            <strong>Embed Error:</strong> ${this.escapeHtml(errorMessage)}
        </div>
        <div class="embed-create-suggestion">
            <button class="embed-create-btn" onclick="window.navigateToNote('${embed.notePath}')">
                Create "${embed.notePath}"
            </button>
        </div>
    </div>
</div>`;
    }

    /**
     * Clear embed cache
     */
    clearCache() {
        this.embedCache.clear();
    }

    /**
     * Invalidate cache for specific path
     */
    invalidateCache(path) {
        const keysToRemove = [];
        for (const key of this.embedCache.keys()) {
            if (key.startsWith(path)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => this.embedCache.delete(key));
    }

    /**
     * Get all embedded references in a document
     */
    getEmbedReferences(content) {
        const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
        const references = [];

        let match;
        while ((match = embedRegex.exec(content)) !== null) {
            let fullPath = match[1].trim();
            if (!fullPath.endsWith('.md')) {
                fullPath = fullPath + '.md';
            }

            references.push({
                path: fullPath,
                heading: match[2]?.trim(),
                display: match[0]
            });
        }

        return references;
    }

    /**
     * Update embeds when content changes
     */
    async onContentChange(path, content) {
        // Invalidate cache for this file
        this.invalidateCache(path);
        
        // Update backlinks if any files embed this one
        if (this.app.backlinksManager) {
            await this.app.backlinksManager.updateEmbedReferences(path);
        }
    }

    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * CSS for embed styling (to be added to style.css)
 */
export const EMBED_CSS = `
/* Embedded Content */
.embedded-content {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin: 16px 0;
    background: var(--bg-secondary);
    overflow: hidden;
}

.embed-depth-0 {
    border-left: 3px solid var(--text-accent);
}

.embed-depth-1 {
    border-left: 3px solid var(--text-blue);
    margin-left: 12px;
}

.embed-depth-2 {
    border-left: 3px solid var(--text-green);
    margin-left: 24px;
}

.embed-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    font-size: 12px;
}

.embed-source {
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.embed-open-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: var(--radius-sm);
    transition: color var(--transition);
}

.embed-open-btn:hover {
    color: var(--text-accent);
}

.embed-content {
    padding: 12px;
    line-height: 1.6;
}

/* Nested content adjustments */
.embed-content h1,
.embed-content h2,
.embed-content h3,
.embed-content h4,
.embed-content h5,
.embed-content h6 {
    margin-top: 0;
}

.embed-content p:first-child {
    margin-top: 0;
}

.embed-content p:last-child {
    margin-bottom: 0;
}

/* Error states */
.embed-error {
    border-color: var(--text-red);
    background: rgba(243, 139, 168, 0.05);
}

.embed-error-indicator {
    color: var(--text-red);
    font-weight: bold;
}

.embed-error-message {
    color: var(--text-red);
    font-size: 13px;
    margin-bottom: 8px;
}

.embed-create-suggestion {
    margin-top: 8px;
}

.embed-create-btn {
    background: var(--text-accent);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    cursor: pointer;
    transition: background var(--transition);
}

.embed-create-btn:hover {
    background: var(--text-accent-hover);
}

/* Reduce nesting visual weight */
.embedded-content .embedded-content {
    margin: 8px 0;
    border-width: 1px;
}
`;