// Oxidian — Frontmatter Processor
// Handles YAML frontmatter parsing and rendering

export class FrontmatterProcessor {
    constructor(app) {
        this.app = app;
    }

    /**
     * Parse frontmatter from markdown content
     * @param {string} content - The markdown content
     * @returns {Object} { frontmatter, content, hasfrontmatter }
     */
    parseFrontmatter(content) {
        if (!content.startsWith('---\n')) {
            return {
                frontmatter: {},
                content: content,
                hasfrontmatter: false
            };
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

        if (endIndex === -1) {
            return {
                frontmatter: {},
                content: content,
                hasfrontmatter: false
            };
        }

        const frontmatterYaml = lines.slice(1, endIndex).join('\n');
        const contentWithoutFrontmatter = lines.slice(endIndex + 1).join('\n');

        let frontmatter = {};
        try {
            frontmatter = this.parseYaml(frontmatterYaml);
        } catch (error) {
            console.error('Failed to parse frontmatter YAML:', error);
            // Return invalid frontmatter as text
            return {
                frontmatter: { _error: error.message, _raw: frontmatterYaml },
                content: contentWithoutFrontmatter,
                hasFoundmatter: true,
                error: error.message
            };
        }

        return {
            frontmatter,
            content: contentWithoutFrontmatter,
            hasFoundmatter: true
        };
    }

    /**
     * Simple YAML parser for basic frontmatter
     * This is a simplified parser - for production use a proper YAML library
     */
    parseYaml(yamlString) {
        const result = {};
        const lines = yamlString.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Handle simple key: value pairs
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;

            const key = trimmed.substring(0, colonIndex).trim();
            let value = trimmed.substring(colonIndex + 1).trim();

            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Handle arrays (simple format: [item1, item2, item3])
            if (value.startsWith('[') && value.endsWith(']')) {
                const arrayContent = value.slice(1, -1);
                if (arrayContent.trim()) {
                    result[key] = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
                } else {
                    result[key] = [];
                }
                continue;
            }

            // Handle multi-line arrays (- item format)
            if (value === '' && key) {
                // Look ahead for array items
                const arrayItems = [];
                let nextLineIndex = lines.indexOf(line) + 1;
                
                while (nextLineIndex < lines.length) {
                    const nextLine = lines[nextLineIndex].trim();
                    if (nextLine.startsWith('- ')) {
                        arrayItems.push(nextLine.substring(2).trim());
                        nextLineIndex++;
                    } else if (nextLine === '' || nextLine.startsWith('#')) {
                        nextLineIndex++;
                    } else {
                        break;
                    }
                }
                
                if (arrayItems.length > 0) {
                    result[key] = arrayItems;
                    continue;
                }
            }

            // Handle booleans
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Handle numbers
            else if (/^\d+$/.test(value)) value = parseInt(value, 10);
            else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);

            result[key] = value;
        }

        return result;
    }

    /**
     * Convert frontmatter object back to YAML string
     */
    stringifyFrontmatter(frontmatter) {
        if (!frontmatter || Object.keys(frontmatter).length === 0) {
            return '';
        }

        const lines = [];
        for (const [key, value] of Object.entries(frontmatter)) {
            if (key.startsWith('_')) continue; // Skip internal properties

            if (Array.isArray(value)) {
                if (value.length === 0) {
                    lines.push(`${key}: []`);
                } else if (value.every(item => typeof item === 'string' && !item.includes('\n'))) {
                    // Inline array format
                    const quotedItems = value.map(item => 
                        item.includes(' ') || item.includes(':') || item.includes('#') ? `"${item}"` : item
                    );
                    lines.push(`${key}: [${quotedItems.join(', ')}]`);
                } else {
                    // Multi-line array format
                    lines.push(`${key}:`);
                    for (const item of value) {
                        lines.push(`  - ${typeof item === 'string' && (item.includes(' ') || item.includes(':') || item.includes('#')) ? `"${item}"` : item}`);
                    }
                }
            } else if (typeof value === 'string' && (value.includes('\n') || value.includes(':') || value.includes('#') || value.includes(' '))) {
                lines.push(`${key}: "${value}"`);
            } else {
                lines.push(`${key}: ${value}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Render frontmatter as HTML table for preview
     */
    renderFrontmatterPreview(frontmatter, error = null) {
        if (error) {
            return `
<div class="frontmatter-preview error">
    <div class="frontmatter-header">
        <span class="frontmatter-title">⚠️ Frontmatter (Error)</span>
    </div>
    <div class="frontmatter-error">
        <strong>YAML Error:</strong> ${this.escapeHtml(error)}
    </div>
</div>`;
        }

        if (!frontmatter || Object.keys(frontmatter).filter(k => !k.startsWith('_')).length === 0) {
            return '';
        }

        let tableRows = '';
        for (const [key, value] of Object.entries(frontmatter)) {
            if (key.startsWith('_')) continue;

            let displayValue;
            if (Array.isArray(value)) {
                displayValue = value.map(item => `<span class="frontmatter-tag">${this.escapeHtml(String(item))}</span>`).join(' ');
            } else if (typeof value === 'boolean') {
                displayValue = `<span class="frontmatter-boolean ${value ? 'true' : 'false'}">${value}</span>`;
            } else if (key.toLowerCase().includes('date') && this.isValidDate(value)) {
                displayValue = `<span class="frontmatter-date">${this.formatDate(value)}</span>`;
            } else if (typeof value === 'string' && value.startsWith('http')) {
                displayValue = `<a href="${value}" target="_blank" class="frontmatter-link">${this.escapeHtml(value)}</a>`;
            } else {
                displayValue = this.escapeHtml(String(value));
            }

            tableRows += `
<tr class="frontmatter-row">
    <td class="frontmatter-key">${this.escapeHtml(key)}</td>
    <td class="frontmatter-value">${displayValue}</td>
</tr>`;
        }

        return `
<div class="frontmatter-preview">
    <div class="frontmatter-header">
        <span class="frontmatter-title">📋 Properties</span>
        <button class="frontmatter-edit-btn" onclick="window.oxidianApp?.editFrontmatter?.()" title="Edit Properties">
            ✏️
        </button>
    </div>
    <table class="frontmatter-table">
        ${tableRows}
    </table>
</div>`;
    }

    /**
     * Process markdown content to render frontmatter in preview
     */
    processContent(content) {
        const parsed = this.parseFrontmatter(content);
        
        if (!parsed.hasFoundmatter) {
            return content;
        }

        const previewHtml = this.renderFrontmatterPreview(parsed.frontmatter, parsed.error);
        return previewHtml + '\n\n' + parsed.content;
    }

    /**
     * Check if a string represents a valid date
     */
    isValidDate(value) {
        if (typeof value !== 'string') return false;
        
        // Check common date formats
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // YYYY-MM-DDTHH:MM
            /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
        ];

        return datePatterns.some(pattern => pattern.test(value)) && !isNaN(Date.parse(value));
    }

    /**
     * Format date for display
     */
    formatDate(value) {
        try {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return value;
        }
    }

    /**
     * Show frontmatter edit dialog
     */
    showFrontmatterEditor(content) {
        const parsed = this.parseFrontmatter(content);
        
        const dialog = document.createElement('div');
        dialog.className = 'frontmatter-editor-overlay';
        
        const container = document.createElement('div');
        container.className = 'frontmatter-editor-container';
        
        const header = document.createElement('div');
        header.className = 'frontmatter-editor-header';
        header.innerHTML = `
            <h3>Edit Properties</h3>
            <button class="frontmatter-close-btn" onclick="this.closest('.frontmatter-editor-overlay').remove()">×</button>
        `;
        
        const editor = document.createElement('div');
        editor.className = 'frontmatter-editor-content';
        
        // Create form fields for common properties
        const commonFields = this.createCommonFields(parsed.frontmatter);
        
        // YAML source editor
        const yamlEditor = document.createElement('div');
        yamlEditor.className = 'frontmatter-yaml-section';
        yamlEditor.innerHTML = `
            <h4>YAML Source</h4>
            <textarea class="frontmatter-yaml-editor" rows="8" placeholder="---">${this.stringifyFrontmatter(parsed.frontmatter)}</textarea>
            <div class="frontmatter-yaml-info">Advanced users: Edit YAML directly</div>
        `;
        
        const footer = document.createElement('div');
        footer.className = 'frontmatter-editor-footer';
        footer.innerHTML = `
            <button class="frontmatter-cancel-btn">Cancel</button>
            <button class="frontmatter-save-btn">Save Changes</button>
        `;
        
        editor.appendChild(commonFields);
        editor.appendChild(yamlEditor);
        container.appendChild(header);
        container.appendChild(editor);
        container.appendChild(footer);
        dialog.appendChild(container);
        
        // Event listeners
        dialog.querySelector('.frontmatter-cancel-btn').onclick = () => dialog.remove();
        dialog.querySelector('.frontmatter-save-btn').onclick = () => this.saveFrontmatter(dialog, content);
        
        // Close on outside click
        dialog.onclick = (e) => {
            if (e.target === dialog) dialog.remove();
        };
        
        // Close on Escape
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        document.body.appendChild(dialog);
        
        // Focus first input
        const firstInput = dialog.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    }

    /**
     * Create common property fields
     */
    createCommonFields(frontmatter) {
        const container = document.createElement('div');
        container.className = 'frontmatter-common-fields';
        
        const fields = [
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Note title' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'tag1, tag2, tag3' },
            { key: 'aliases', label: 'Aliases', type: 'list', placeholder: 'alias1, alias2' },
            { key: 'author', label: 'Author', type: 'text' },
            { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'archived'] },
        ];

        const fieldsHtml = fields.map(field => {
            const value = frontmatter[field.key];
            let inputHtml = '';

            switch (field.type) {
                case 'text':
                case 'date':
                    inputHtml = `<input type="${field.type}" name="${field.key}" value="${this.escapeHtml(String(value || ''))}" placeholder="${field.placeholder || ''}">`;
                    break;
                case 'tags':
                case 'list':
                    const arrayValue = Array.isArray(value) ? value.join(', ') : (value || '');
                    inputHtml = `<input type="text" name="${field.key}" value="${this.escapeHtml(arrayValue)}" placeholder="${field.placeholder || ''}" data-type="${field.type}">`;
                    break;
                case 'select':
                    const options = field.options.map(opt => 
                        `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
                    ).join('');
                    inputHtml = `<select name="${field.key}"><option value="">Select...</option>${options}</select>`;
                    break;
            }

            return `
                <div class="frontmatter-field">
                    <label class="frontmatter-field-label">${field.label}</label>
                    ${inputHtml}
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <h4>Common Properties</h4>
            <div class="frontmatter-fields-grid">
                ${fieldsHtml}
            </div>
        `;

        return container;
    }

    /**
     * Save frontmatter changes
     */
    saveFrontmatter(dialog, originalContent) {
        try {
            // Get values from form
            const frontmatter = {};
            const formData = new FormData();
            
            dialog.querySelectorAll('input, select').forEach(input => {
                const name = input.name;
                let value = input.value.trim();
                
                if (!value) return; // Skip empty values
                
                if (input.dataset.type === 'tags' || input.dataset.type === 'list') {
                    // Convert comma-separated to array
                    frontmatter[name] = value.split(',').map(item => item.trim()).filter(item => item);
                } else if (input.type === 'date') {
                    frontmatter[name] = value;
                } else {
                    frontmatter[name] = value;
                }
            });

            // Also get YAML source
            const yamlSource = dialog.querySelector('.frontmatter-yaml-editor').value.trim();
            if (yamlSource) {
                try {
                    const yamlData = this.parseYaml(yamlSource);
                    Object.assign(frontmatter, yamlData);
                } catch (yamlError) {
                    alert('YAML source contains errors. Please fix or clear it.');
                    return;
                }
            }

            // Build new content
            const parsed = this.parseFrontmatter(originalContent);
            let newContent = '';
            
            if (Object.keys(frontmatter).length > 0) {
                newContent = '---\n' + this.stringifyFrontmatter(frontmatter) + '\n---\n';
            }
            
            newContent += parsed.content;

            // Update editor
            this.app.editor.setContent(newContent);
            this.app.markDirty();
            
            dialog.remove();
            
        } catch (error) {
            console.error('Error saving frontmatter:', error);
            alert('Error saving changes: ' + error.message);
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
 * CSS for frontmatter styling
 */
export const FRONTMATTER_CSS = `
/* Frontmatter Preview */
.frontmatter-preview {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin: 0 0 20px 0;
    background: var(--bg-secondary);
    overflow: hidden;
}

.frontmatter-preview.error {
    border-color: var(--text-red);
    background: rgba(243, 139, 168, 0.05);
}

.frontmatter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
}

.frontmatter-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
}

.frontmatter-edit-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    font-size: 11px;
}

.frontmatter-edit-btn:hover {
    color: var(--text-accent);
    background: var(--bg-hover);
}

.frontmatter-table {
    width: 100%;
    border-collapse: collapse;
}

.frontmatter-row:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
}

.frontmatter-key,
.frontmatter-value {
    padding: 8px 12px;
    vertical-align: top;
}

.frontmatter-key {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    width: 120px;
    font-weight: 600;
}

.frontmatter-value {
    color: var(--text-primary);
    font-size: 13px;
}

.frontmatter-tag {
    display: inline-block;
    background: var(--text-accent);
    color: white;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    margin-right: 4px;
    margin-bottom: 2px;
}

.frontmatter-boolean.true {
    color: var(--text-green);
}

.frontmatter-boolean.false {
    color: var(--text-red);
}

.frontmatter-date {
    color: var(--text-blue);
}

.frontmatter-link {
    color: var(--text-accent);
    text-decoration: none;
}

.frontmatter-link:hover {
    text-decoration: underline;
}

.frontmatter-error {
    padding: 12px;
    color: var(--text-red);
    font-size: 13px;
}

/* Frontmatter Editor */
.frontmatter-editor-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.frontmatter-editor-container {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.frontmatter-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.frontmatter-editor-header h3 {
    margin: 0;
    color: var(--text-primary);
}

.frontmatter-close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.frontmatter-close-btn:hover {
    color: var(--text-red);
}

.frontmatter-editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.frontmatter-common-fields h4 {
    margin: 0 0 16px 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.frontmatter-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.frontmatter-field-label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
}

.frontmatter-field input,
.frontmatter-field select {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 13px;
}

.frontmatter-field input:focus,
.frontmatter-field select:focus {
    outline: none;
    border-color: var(--text-accent);
}

.frontmatter-yaml-section {
    border-top: 1px solid var(--border-color);
    padding-top: 20px;
}

.frontmatter-yaml-section h4 {
    margin: 0 0 12px 0;
    color: var(--text-secondary);
    font-size: 14px;
}

.frontmatter-yaml-editor {
    width: 100%;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 13px;
    resize: vertical;
    min-height: 120px;
}

.frontmatter-yaml-info {
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-muted);
}

.frontmatter-editor-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-color);
}

.frontmatter-cancel-btn,
.frontmatter-save-btn {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
    border: none;
}

.frontmatter-cancel-btn {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.frontmatter-cancel-btn:hover {
    background: var(--bg-hover);
}

.frontmatter-save-btn {
    background: var(--text-accent);
    color: white;
}

.frontmatter-save-btn:hover {
    background: var(--text-accent-hover);
}
`;