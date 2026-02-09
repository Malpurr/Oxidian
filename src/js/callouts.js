// Oxidian — Callout Blocks Module
// Post-processes rendered HTML to convert Obsidian-style callouts:
//   > [!note] Title  →  styled callout box
// Supports: note, warning, danger, tip, example, info, todo, abstract, quote, bug, success, failure, question

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
     * Process rendered HTML to transform blockquotes containing [!type] into callout boxes.
     * @param {string} html - The rendered HTML from markdown
     * @returns {string} HTML with callout blocks
     */
    process(html) {
        const container = document.createElement('div');
        container.innerHTML = html;

        const blockquotes = container.querySelectorAll('blockquote');
        for (const bq of blockquotes) {
            this._transformBlockquote(bq);
        }

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
        // Check if first paragraph starts with [!type]
        const firstChild = bq.querySelector('p') || bq.firstElementChild;
        if (!firstChild) return;

        const text = firstChild.innerHTML;
        const match = text.match(/^\[!(\w+)\]\s*(.*)/);
        if (!match) return;

        const typeName = match[1].toLowerCase();
        const customTitle = match[2]?.trim();
        const config = this.calloutTypes[typeName];
        if (!config) return;

        const title = customTitle || config.label;

        // Build callout structure
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
        `;
        header.innerHTML = `<span class="callout-icon">${config.icon}</span><span class="callout-title">${this._escapeHtml(title)}</span>`;

        const body = document.createElement('div');
        body.className = 'callout-body';
        body.style.cssText = `
            padding: 8px 12px 12px;
            color: var(--text-primary, #cdd6f4);
        `;

        // Move remaining content (skip the first paragraph with [!type])
        const children = Array.from(bq.childNodes);
        let skippedFirst = false;
        for (const child of children) {
            if (!skippedFirst && child === firstChild) {
                // If there's remaining text after the [!type] line in the first <p>, keep it
                const remaining = text.replace(/^\[!\w+\]\s*.*?(?:<br\s*\/?>|$)/, '').trim();
                if (remaining) {
                    const p = document.createElement('p');
                    p.innerHTML = remaining;
                    body.appendChild(p);
                }
                skippedFirst = true;
                continue;
            }
            body.appendChild(child.cloneNode(true));
        }

        callout.appendChild(header);
        if (body.childNodes.length > 0) {
            callout.appendChild(body);
        }

        bq.replaceWith(callout);
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
