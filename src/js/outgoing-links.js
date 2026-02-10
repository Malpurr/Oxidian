// Oxidian — Outgoing Links Panel
// Parses current note for [[wikilinks]] and [text](url) links, displays in sidebar.

export class OutgoingLinks {
    constructor(app) {
        this.app = app;
    }

    /**
     * Update the outgoing links panel with links from the given content.
     */
    update(content) {
        const panel = document.getElementById('panel-outgoing-links');
        if (!panel) return;

        const list = panel.querySelector('.outgoing-links-list');
        if (!list) return;

        if (!content || !content.trim()) {
            list.innerHTML = '<div class="empty-panel-message">No note open</div>';
            return;
        }

        const links = this._extractLinks(content);

        if (links.length === 0) {
            list.innerHTML = '<div class="empty-panel-message">No outgoing links</div>';
            return;
        }

        list.innerHTML = '';
        for (const link of links) {
            const item = document.createElement('div');
            item.className = 'outgoing-link-item';
            item.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.5;">
                    ${link.type === 'wiki' 
                        ? '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
                        : '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>'}
                </svg>
                <span class="outgoing-link-text">${this._escapeHtml(link.display)}</span>
            `;
            item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;border-radius:4px;font-size:13px;';
            item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover)');
            item.addEventListener('mouseleave', () => item.style.background = '');
            item.addEventListener('click', () => {
                if (link.type === 'wiki') {
                    this.app.navigateToNote(link.target);
                } else {
                    window.open(link.target, '_blank');
                }
            });
            list.appendChild(item);
        }
    }

    /**
     * Extract all links from markdown content.
     */
    _extractLinks(content) {
        const links = [];
        const seen = new Set();

        // Wikilinks: [[target]] or [[target|display]]
        const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let m;
        while ((m = wikiRegex.exec(content)) !== null) {
            // Skip embeds (preceded by !)
            if (m.index > 0 && content[m.index - 1] === '!') continue;
            const target = m[1].trim();
            const display = m[2]?.trim() || target;
            const key = `wiki:${target}`;
            if (!seen.has(key)) {
                seen.add(key);
                links.push({ type: 'wiki', target, display });
            }
        }

        // Markdown links: [text](url) — skip images ![...](...) 
        const mdRegex = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
        while ((m = mdRegex.exec(content)) !== null) {
            const display = m[1].trim();
            const target = m[2].trim();
            const key = `md:${target}`;
            if (!seen.has(key)) {
                seen.add(key);
                links.push({ type: 'md', target, display });
            }
        }

        return links;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
