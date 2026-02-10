// Oxidian — Embeds/Transclusion Module
// Refactored: Embed detection/resolution delegated to Rust via invoke().
// JS retains: Embed DOM rendering (wrapEmbedContent, renderEmbedError), click handlers, cache management.

import { invoke } from './tauri-bridge.js';

export class EmbedProcessor {
    constructor(app) {
        this.app = app;
        this.embedCache = new Map();
        this.maxEmbedDepth = 3;
    }

    /**
     * Process embeds in markdown content via Rust.
     * Rust handles: regex scanning, path resolution, recursive embed resolution.
     * JS handles: wrapping resolved content with DOM/HTML.
     * 
     * @param {string} content - The markdown content
     * @param {string} currentPath - Current file path for relative resolution
     * @param {number} embedDepth - Current embedding depth
     * @returns {Promise<string>} Processed content with embeds rendered
     */
    async processEmbeds(content, currentPath = null, embedDepth = 0) {
        if (embedDepth >= this.maxEmbedDepth) {
            return content;
        }

        try {
            // Rust resolves all embeds: finds ![[...]] patterns, reads files,
            // extracts sections, strips frontmatter, handles recursion.
            // Returns: { processed: string, embeds: [{ fullMatch, notePath, heading, content, error }] }
            const result = await invoke('resolve_embeds', {
                content,
                currentPath: currentPath || '',
                maxDepth: this.maxEmbedDepth - embedDepth,
            });

            // If Rust returns fully processed content, use it directly
            if (result.processed) {
                // Wrap each embed with our DOM styling
                let processedContent = result.processed;
                for (const embed of (result.embeds || [])) {
                    if (embed.error) {
                        const errorHtml = this.renderEmbedError(embed, embed.error);
                        processedContent = processedContent.replace(embed.placeholder || embed.fullMatch, errorHtml);
                    } else if (embed.content != null) {
                        const wrappedHtml = this.wrapEmbedContent(embed.content, embed, embedDepth + (embed.depth || 0));
                        processedContent = processedContent.replace(embed.placeholder || embed.fullMatch, wrappedHtml);
                    }
                }
                return processedContent;
            }

            // Fallback: Rust returned just embed metadata, JS does the wrapping
            return this._processEmbedsFromMetadata(content, result.embeds || [], embedDepth);

        } catch (err) {
            console.warn('[Embeds] Rust resolve_embeds failed, using fallback:', err);
            return this._fallbackProcessEmbeds(content, currentPath, embedDepth);
        }
    }

    /**
     * Process embeds when Rust returns metadata but not fully processed content.
     * @private
     */
    _processEmbedsFromMetadata(content, embeds, embedDepth) {
        let processedContent = content;

        // Process in reverse order to maintain indices
        for (const embed of [...embeds].reverse()) {
            try {
                if (embed.error) {
                    const errorHtml = this.renderEmbedError(embed, embed.error);
                    processedContent = processedContent.substring(0, embed.index) +
                        errorHtml +
                        processedContent.substring(embed.index + embed.fullMatch.length);
                } else {
                    const wrappedHtml = this.wrapEmbedContent(
                        embed.content || '',
                        embed,
                        embedDepth + (embed.depth || 0)
                    );
                    processedContent = processedContent.substring(0, embed.index) +
                        wrappedHtml +
                        processedContent.substring(embed.index + embed.fullMatch.length);
                }
            } catch (error) {
                console.error('Failed to process embed:', embed.fullMatch, error);
                const errorHtml = this.renderEmbedError(embed, error.message);
                processedContent = processedContent.substring(0, embed.index) +
                    errorHtml +
                    processedContent.substring(embed.index + embed.fullMatch.length);
            }
        }

        return processedContent;
    }

    /**
     * Fallback: JS-side embed processing if Rust is unavailable.
     * @private
     */
    async _fallbackProcessEmbeds(content, currentPath, embedDepth) {
        const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
        let processedContent = content;
        const embeds = [];

        let match;
        while ((match = embedRegex.exec(content)) !== null) {
            embeds.push({
                fullMatch: match[0],
                notePath: match[1].trim(),
                heading: match[2]?.trim(),
                index: match.index,
            });
        }

        for (const embed of embeds.reverse()) {
            try {
                let fullPath = embed.notePath;
                if (!fullPath.endsWith('.md')) fullPath += '.md';

                const noteContent = await invoke('read_note', { path: fullPath });
                let contentToEmbed = embed.heading
                    ? this._extractSection(noteContent, embed.heading)
                    : this._stripFrontmatter(noteContent);

                if (contentToEmbed && embedDepth + 1 < this.maxEmbedDepth) {
                    contentToEmbed = await this._fallbackProcessEmbeds(contentToEmbed, fullPath, embedDepth + 1);
                }

                const wrappedHtml = this.wrapEmbedContent(contentToEmbed, embed, embedDepth);
                processedContent = processedContent.substring(0, embed.index) +
                    wrappedHtml +
                    processedContent.substring(embed.index + embed.fullMatch.length);
            } catch (error) {
                const errorHtml = this.renderEmbedError(embed, error.message);
                processedContent = processedContent.substring(0, embed.index) +
                    errorHtml +
                    processedContent.substring(embed.index + embed.fullMatch.length);
            }
        }

        return processedContent;
    }

    /** @private */
    _extractSection(content, targetHeading) {
        const lines = content.split('\n');
        let inTarget = false, targetLevel = null;
        const sectionLines = [];

        for (const line of lines) {
            const hm = line.trim().match(/^(#{1,6})\s+(.+)/);
            if (hm) {
                if (!inTarget) {
                    if (hm[2].trim().toLowerCase() === targetHeading.toLowerCase()) {
                        inTarget = true; targetLevel = hm[1].length; sectionLines.push(line); continue;
                    }
                } else if (hm[1].length <= targetLevel) break;
            }
            if (inTarget) sectionLines.push(line);
        }

        if (!inTarget) throw new Error(`Heading "${targetHeading}" not found`);
        return sectionLines.join('\n');
    }

    /** @private */
    _stripFrontmatter(content) {
        if (!content.startsWith('---\n')) return content;
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') return lines.slice(i + 1).join('\n').trim();
        }
        return content;
    }

    /**
     * Wrap embedded content with visual styling.
     */
    wrapEmbedContent(content, embed, embedDepth) {
        if (!content || content.trim() === '') {
            return this.renderEmbedError(embed, 'No content found');
        }

        const depthClass = `embed-depth-${Math.min(embedDepth, 2)}`;
        const sourceInfo = embed.heading
            ? `${embed.notePath}#${embed.heading}`
            : embed.notePath;

        return `
<div class="embedded-content ${depthClass}" data-source="${this.escapeHtml(sourceInfo)}">
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
     * Render embed error placeholder.
     */
    renderEmbedError(embed, errorMessage) {
        const sourceInfo = embed.heading
            ? `${embed.notePath}#${embed.heading}`
            : embed.notePath;

        return `
<div class="embedded-content embed-error" data-source="${this.escapeHtml(sourceInfo)}">
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
                Create "${this.escapeHtml(embed.notePath)}"
            </button>
        </div>
    </div>
</div>`;
    }

    clearCache() { this.embedCache.clear(); }

    invalidateCache(path) {
        for (const key of [...this.embedCache.keys()]) {
            if (key.startsWith(path)) this.embedCache.delete(key);
        }
    }

    /**
     * Get all embedded references in a document via Rust AST.
     */
    async getEmbedReferences(content) {
        try {
            // Rust parses and returns embed references from AST
            const ast = await invoke('parse_markdown', { content });
            const refs = [];
            for (const block of (ast || [])) {
                if (block.meta?.embeds) {
                    for (const embed of block.meta.embeds) {
                        let fullPath = embed.path || embed.notePath;
                        if (fullPath && !fullPath.endsWith('.md')) fullPath += '.md';
                        refs.push({ path: fullPath, heading: embed.heading, display: embed.display || `![[${embed.path}]]` });
                    }
                }
            }
            if (refs.length > 0) return refs;
        } catch {
            // Fall through to regex fallback
        }

        // Fallback: regex
        const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
        const references = [];
        let match;
        while ((match = embedRegex.exec(content)) !== null) {
            let fullPath = match[1].trim();
            if (!fullPath.endsWith('.md')) fullPath += '.md';
            references.push({ path: fullPath, heading: match[2]?.trim(), display: match[0] });
        }
        return references;
    }

    async onContentChange(path, _content) {
        this.invalidateCache(path);
        if (this.app.backlinksManager) {
            await this.app.backlinksManager.updateEmbedReferences(path);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * CSS for embed styling
 */
export const EMBED_CSS = `
.embedded-content { border: 1px solid var(--border-color); border-radius: var(--radius-md); margin: 16px 0; background: var(--bg-secondary); overflow: hidden; }
.embed-depth-0 { border-left: 3px solid var(--text-accent); }
.embed-depth-1 { border-left: 3px solid var(--text-blue); margin-left: 12px; }
.embed-depth-2 { border-left: 3px solid var(--text-green); margin-left: 24px; }
.embed-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); font-size: 12px; }
.embed-source { color: var(--text-muted); font-family: var(--font-mono); }
.embed-open-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: var(--radius-sm); transition: color var(--transition); }
.embed-open-btn:hover { color: var(--text-accent); }
.embed-content { padding: 12px; line-height: 1.6; }
.embed-content h1, .embed-content h2, .embed-content h3, .embed-content h4, .embed-content h5, .embed-content h6 { margin-top: 0; }
.embed-content p:first-child { margin-top: 0; }
.embed-content p:last-child { margin-bottom: 0; }
.embed-error { border-color: var(--text-red); background: rgba(243, 139, 168, 0.05); }
.embed-error-indicator { color: var(--text-red); font-weight: bold; }
.embed-error-message { color: var(--text-red); font-size: 13px; margin-bottom: 8px; }
.embed-create-suggestion { margin-top: 8px; }
.embed-create-btn { background: var(--text-accent); color: white; border: none; padding: 4px 8px; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; transition: background var(--transition); }
.embed-create-btn:hover { background: var(--text-accent-hover); }
.embedded-content .embedded-content { margin: 8px 0; border-width: 1px; }
`;
