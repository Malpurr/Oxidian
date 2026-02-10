// Oxidian — Callout Blocks Module
// Refactored: Callout type detection comes from Rust AST (block.type === 'callout', block.meta.calloutType).
// JS retains: All DOM rendering, icon mapping, styling, collapse animation.
// For post-render HTML processing (legacy path), processElement() still works on live DOM.

export class CalloutProcessor {
    constructor() {
        this.calloutTypes = {
            note:     { icon: 'ℹ️',  color: 'var(--callout-note,     #448aff)', label: 'Note' },
            info:     { icon: 'ℹ️',  color: 'var(--callout-info,     #448aff)', label: 'Info' },
            warning:  { icon: '⚠️',  color: 'var(--callout-warning,  #ff9100)', label: 'Warning' },
            caution:  { icon: '⚠️',  color: 'var(--callout-warning,  #ff9100)', label: 'Caution' },
            danger:   { icon: '🔴', color: 'var(--callout-danger,   #ff5252)', label: 'Danger' },
            error:    { icon: '🔴', color: 'var(--callout-danger,   #ff5252)', label: 'Error' },
            tip:      { icon: '💡', color: 'var(--callout-tip,      #00c853)', label: 'Tip' },
            hint:     { icon: '💡', color: 'var(--callout-tip,      #00c853)', label: 'Hint' },
            example:  { icon: '📋', color: 'var(--callout-example,  #7c4dff)', label: 'Example' },
            todo:     { icon: '☑️',  color: 'var(--callout-todo,     #448aff)', label: 'Todo' },
            abstract: { icon: '📑', color: 'var(--callout-abstract, #00b0ff)', label: 'Abstract' },
            summary:  { icon: '📑', color: 'var(--callout-abstract, #00b0ff)', label: 'Summary' },
            quote:    { icon: '💬', color: 'var(--callout-quote,    #9e9e9e)', label: 'Quote' },
            bug:      { icon: '🐛', color: 'var(--callout-bug,      #ff5252)', label: 'Bug' },
            success:  { icon: '✅', color: 'var(--callout-success,  #00c853)', label: 'Success' },
            failure:  { icon: '❌', color: 'var(--callout-failure,  #ff5252)', label: 'Failure' },
            question: { icon: '❓', color: 'var(--callout-question, #ff9100)', label: 'Question' },
        };
    }

    /**
     * Render a callout from a Rust AST block.
     * Called by BlockRenderers or directly when processing AST blocks.
     * 
     * @param {Object} block - Block with type 'callout' and meta.calloutType
     * @param {string} block.content - Raw markdown content
     * @param {Object} block.meta - { calloutType: string, collapsible?: boolean }
     * @returns {HTMLElement} Callout DOM element
     */
    renderFromBlock(block) {
        const typeName = (block.meta?.calloutType || 'note').toLowerCase();
        const config = this.calloutTypes[typeName] || this.calloutTypes.note;
        const collapsible = block.meta?.collapsible || false;

        // Parse title and body from raw content
        const lines = block.content.split('\n');
        const firstLine = lines[0] || '';
        const titleMatch = firstLine.match(/^>\s*\[!\w+\]([+-])?\s*(.*)/);
        const title = titleMatch?.[2]?.trim() || config.label;
        const isCollapsed = titleMatch?.[1] === '-';
        const bodyLines = lines.slice(1).map(l => l.replace(/^>\s?/, ''));
        const bodyText = bodyLines.join('\n').trim();

        return this._buildCalloutElement(typeName, config, title, bodyText, collapsible || !!titleMatch?.[1], isCollapsed);
    }

    /**
     * Build callout DOM element.
     * @private
     */
    _buildCalloutElement(typeName, config, title, bodyText, collapsible, isCollapsed) {
        const callout = document.createElement('div');
        callout.className = `callout callout-${typeName}`;
        callout.style.cssText = `
            border-left: 4px solid ${config.color};
            background: color-mix(in srgb, ${config.color} 8%, var(--bg-primary, #1e1e2e));
            border-radius: 6px;
            padding: 0;
            margin: 12px 0;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.className = 'callout-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-weight: 600;
            color: ${config.color};
            background: color-mix(in srgb, ${config.color} 12%, transparent);
            ${collapsible ? 'cursor: pointer;' : ''}
        `;
        header.innerHTML = `<span class="callout-icon">${config.icon}</span><span class="callout-title">${this._escapeHtml(title)}</span>`;

        if (collapsible) {
            const chevron = document.createElement('span');
            chevron.className = 'callout-chevron';
            chevron.style.cssText = `margin-left: auto; transition: transform 0.2s ease; font-size: 12px;`;
            chevron.textContent = '▶';
            if (!isCollapsed) chevron.style.transform = 'rotate(90deg)';
            header.appendChild(chevron);
        }

        const body = document.createElement('div');
        body.className = 'callout-body';
        body.style.cssText = `
            padding: 8px 12px 12px;
            color: var(--text-primary, #cdd6f4);
            ${isCollapsed ? 'display: none;' : ''}
        `;

        if (bodyText) {
            const p = document.createElement('p');
            p.textContent = bodyText;
            body.appendChild(p);
        }

        // Collapse animation
        if (collapsible) {
            header.addEventListener('click', () => {
                const isHidden = body.style.display === 'none';
                body.style.display = isHidden ? '' : 'none';
                const chevron = header.querySelector('.callout-chevron');
                if (chevron) chevron.style.transform = isHidden ? 'rotate(90deg)' : '';
            });
        }

        callout.appendChild(header);
        if (bodyText) callout.appendChild(body);
        return callout;
    }

    /**
     * Process rendered HTML to transform blockquotes containing [!type] into callout boxes.
     * Legacy path — used when processing already-rendered HTML (not from AST).
     * @param {string} html - The rendered HTML from markdown
     * @returns {string} HTML with callout blocks
     */
    process(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        this.processElement(container);
        return container.innerHTML;
    }

    /**
     * Process callouts in an already-mounted DOM element (for live preview).
     */
    processElement(el) {
        const blockquotes = el.querySelectorAll('blockquote');
        for (const bq of blockquotes) {
            this._transformBlockquote(bq);
        }
    }

    _transformBlockquote(bq) {
        const firstChild = bq.querySelector('p') || bq.firstElementChild;
        if (!firstChild) return;

        const text = firstChild.innerHTML;
        const match = text.match(/^\[!(\w+)\]([+-])?\s*(.*)/);
        if (!match) return;

        const typeName = match[1].toLowerCase();
        const collapsible = !!match[2];
        const isCollapsed = match[2] === '-';
        const customTitle = match[3]?.trim();
        const config = this.calloutTypes[typeName];
        if (!config) return;

        const title = customTitle || config.label;

        // Collect body content
        const children = Array.from(bq.childNodes);
        let bodyHtml = '';
        let skippedFirst = false;
        for (const child of children) {
            if (!skippedFirst && child === firstChild) {
                const remaining = text.replace(/^\[!\w+\][+-]?\s*.*?(?:<br\s*\/?>|$)/, '').trim();
                if (remaining) bodyHtml += `<p>${remaining}</p>`;
                skippedFirst = true;
                continue;
            }
            if (child.outerHTML) bodyHtml += child.outerHTML;
            else if (child.textContent?.trim()) bodyHtml += child.textContent;
        }

        const calloutEl = this._buildCalloutElement(typeName, config, title, '', collapsible, isCollapsed);
        if (bodyHtml) {
            const body = calloutEl.querySelector('.callout-body') || document.createElement('div');
            body.className = 'callout-body';
            body.style.cssText = `padding: 8px 12px 12px; color: var(--text-primary, #cdd6f4); ${isCollapsed ? 'display: none;' : ''}`;
            body.innerHTML = bodyHtml;
            if (!calloutEl.querySelector('.callout-body')) calloutEl.appendChild(body);
        }

        bq.replaceWith(calloutEl);
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
