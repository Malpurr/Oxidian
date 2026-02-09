// Oxidian — Properties/Frontmatter Panel
// Klappbarer Bereich oben im Editor zeigt YAML Frontmatter als editierbare Key-Value Felder

export class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.panel = null;
        this.isExpanded = localStorage.getItem('oxidian-properties-expanded') === 'true';
        this.textarea = null;
        this.properties = {};
        this.isUpdating = false;
    }

    /**
     * Initialize properties panel for editor container
     */
    init(container) {
        if (!container) return;

        this.createPanel(container);
        this.bindEvents();
    }

    createPanel(container) {
        // Create panel at the top of editor
        const panel = document.createElement('div');
        panel.className = `properties-panel ${this.isExpanded ? 'expanded' : 'collapsed'}`;
        panel.innerHTML = `
            <div class="properties-header" role="button" tabindex="0">
                <div class="properties-toggle">
                    <svg class="properties-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <span class="properties-title">Properties</span>
                    <span class="properties-count">0</span>
                </div>
                <div class="properties-actions">
                    <button class="properties-add-btn" title="Add Property" type="button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="properties-content">
                <div class="properties-list"></div>
                <div class="properties-empty">
                    <p>No properties in this note</p>
                    <p class="properties-help">Add frontmatter by clicking the + button or typing --- at the start of the note</p>
                </div>
            </div>
        `;

        // Insert at top of container
        container.insertBefore(panel, container.firstChild);
        this.panel = panel;
    }

    bindEvents() {
        if (!this.panel) return;

        // Toggle panel
        const header = this.panel.querySelector('.properties-header');
        header.addEventListener('click', () => this.toggle());
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Add property button
        const addBtn = this.panel.querySelector('.properties-add-btn');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addProperty();
        });
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
        localStorage.setItem('oxidian-properties-expanded', this.isExpanded.toString());
        
        this.panel.classList.toggle('expanded', this.isExpanded);
        this.panel.classList.toggle('collapsed', !this.isExpanded);
        
        // Update chevron
        const chevron = this.panel.querySelector('.properties-chevron');
        chevron.style.transform = this.isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
    }

    /**
     * Attach to a textarea to sync properties
     */
    attachTo(textarea) {
        if (!textarea) return;

        this.textarea = textarea;
        
        // Parse existing content
        this.parsePropertiesFromContent(textarea.value);
        
        // Listen for content changes
        textarea.addEventListener('input', () => {
            if (!this.isUpdating) {
                this.parsePropertiesFromContent(textarea.value);
            }
        });
    }

    parsePropertiesFromContent(content) {
        this.properties = {};
        
        // Check for YAML frontmatter
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
            const yamlString = match[1];
            
            try {
                // Simple YAML parser (basic key: value pairs)
                const lines = yamlString.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    
                    const colonIndex = trimmed.indexOf(':');
                    if (colonIndex === -1) continue;
                    
                    const key = trimmed.substring(0, colonIndex).trim();
                    let value = trimmed.substring(colonIndex + 1).trim();
                    
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    
                    this.properties[key] = value;
                }
            } catch (err) {
                console.warn('Failed to parse YAML frontmatter:', err);
            }
        }
        
        this.updatePanelContent();
    }

    updatePanelContent() {
        if (!this.panel) return;

        const count = Object.keys(this.properties).length;
        const countEl = this.panel.querySelector('.properties-count');
        countEl.textContent = count.toString();

        const listEl = this.panel.querySelector('.properties-list');
        const emptyEl = this.panel.querySelector('.properties-empty');

        if (count === 0) {
            listEl.innerHTML = '';
            emptyEl.style.display = 'block';
        } else {
            emptyEl.style.display = 'none';
            listEl.innerHTML = this.renderPropertiesList();
            this.bindPropertyEvents();
        }
    }

    renderPropertiesList() {
        return Object.entries(this.properties).map(([key, value]) => `
            <div class="property-item" data-key="${this.escapeHtml(key)}">
                <div class="property-key">
                    <input type="text" class="property-key-input" value="${this.escapeHtml(key)}" placeholder="Property name">
                </div>
                <div class="property-value">
                    <input type="text" class="property-value-input" value="${this.escapeHtml(value)}" placeholder="Property value">
                </div>
                <div class="property-actions">
                    <button class="property-delete-btn" title="Delete Property" type="button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    bindPropertyEvents() {
        if (!this.panel) return;

        // Key input changes
        this.panel.querySelectorAll('.property-key-input').forEach(input => {
            input.addEventListener('blur', () => this.onPropertyKeyChange(input));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });

        // Value input changes
        this.panel.querySelectorAll('.property-value-input').forEach(input => {
            input.addEventListener('blur', () => this.onPropertyValueChange(input));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });

        // Delete buttons
        this.panel.querySelectorAll('.property-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.onDeleteProperty(btn));
        });
    }

    onPropertyKeyChange(input) {
        const item = input.closest('.property-item');
        const oldKey = item.dataset.key;
        const newKey = input.value.trim();
        
        if (!newKey || newKey === oldKey) {
            input.value = oldKey; // Revert
            return;
        }
        
        // Check for duplicate keys
        if (this.properties.hasOwnProperty(newKey)) {
            input.value = oldKey; // Revert
            return;
        }
        
        // Update properties
        const value = this.properties[oldKey];
        delete this.properties[oldKey];
        this.properties[newKey] = value;
        
        // Update DOM
        item.dataset.key = newKey;
        
        this.updateContentFromProperties();
    }

    onPropertyValueChange(input) {
        const item = input.closest('.property-item');
        const key = item.dataset.key;
        const newValue = input.value;
        
        this.properties[key] = newValue;
        this.updateContentFromProperties();
    }

    onDeleteProperty(btn) {
        const item = btn.closest('.property-item');
        const key = item.dataset.key;
        
        delete this.properties[key];
        item.remove();
        
        this.updatePanelContent();
        this.updateContentFromProperties();
    }

    addProperty() {
        // Generate unique key
        let counter = 1;
        let key = 'property';
        while (this.properties.hasOwnProperty(key)) {
            key = `property${counter}`;
            counter++;
        }
        
        this.properties[key] = '';
        this.updatePanelContent();
        
        // Focus the new key input
        setTimeout(() => {
            const newInput = this.panel.querySelector(`[data-key="${key}"] .property-key-input`);
            if (newInput) {
                newInput.focus();
                newInput.select();
            }
        }, 50);
    }

    updateContentFromProperties() {
        if (!this.textarea || this.isUpdating) return;
        
        this.isUpdating = true;
        
        const content = this.textarea.value;
        const count = Object.keys(this.properties).length;
        
        if (count === 0) {
            // Remove frontmatter
            const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
            this.textarea.value = withoutFrontmatter;
        } else {
            // Generate YAML
            const yamlLines = ['---'];
            for (const [key, value] of Object.entries(this.properties)) {
                let yamlValue = value;
                // Quote values that contain special characters
                if (typeof yamlValue === 'string' && (/[:#\[\]{}|>]/.test(yamlValue) || yamlValue.trim() !== yamlValue)) {
                    yamlValue = `"${yamlValue.replace(/"/g, '\\"')}"`;
                }
                yamlLines.push(`${key}: ${yamlValue}`);
            }
            yamlLines.push('---');
            
            const newFrontmatter = yamlLines.join('\n') + '\n';
            
            // Replace or add frontmatter
            const existingMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
            if (existingMatch) {
                this.textarea.value = content.replace(existingMatch[0], newFrontmatter);
            } else {
                this.textarea.value = newFrontmatter + content;
            }
        }
        
        // Trigger events
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        this.app.markDirty();
        
        this.isUpdating = false;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
        this.textarea = null;
        this.properties = {};
    }
}