// Oxidian — Tag Auto-Complete
// Type # → Shows popup with all existing tags, filter as you type

const { invoke } = window.__TAURI__.core;

export class TagAutoComplete {
    constructor(app) {
        this.app = app;
        this.popup = null;
        this.isActive = false;
        this.allTags = [];
        this.filteredTags = [];
        this.selectedIndex = 0;
        this.triggerPos = -1;
        this.currentTextarea = null;
        this._tagsCache = null;
        this._cacheTime = 0;
    }

    /**
     * Initialize tag auto-complete for a textarea
     */
    attachTo(textarea) {
        if (!textarea) return;
        
        textarea.addEventListener('input', (e) => this.onInput(e));
        textarea.addEventListener('keydown', (e) => this.onKeyDown(e));
        textarea.addEventListener('blur', () => this.hidePopup());
        
        textarea.addEventListener('click', () => {
            if (this.isActive && !this.isAtTag(textarea)) {
                this.hidePopup();
            }
        });
    }

    async onInput(e) {
        const textarea = e.target;
        this.currentTextarea = textarea;
        
        const pos = textarea.selectionStart;
        const text = textarea.value;
        const charBefore = pos > 0 ? text[pos - 1] : '';
        
        // Check if we just typed '#' at start of word
        if (text[pos - 1] === '#' && this.isStartOfTag(text, pos - 1)) {
            this.triggerPos = pos - 1;
            await this.showTagPopup(textarea);
            return;
        }
        
        // If popup is open, update filter
        if (this.isActive) {
            const query = this.getCurrentQuery(text, pos);
            if (query === null) {
                // We're no longer in a tag
                this.hidePopup();
            } else {
                this.updateFilter(query);
            }
        }
    }

    onKeyDown(e) {
        if (!this.isActive) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredTags.length - 1);
                this.updatePopupSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.updatePopupSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                this.insertSelectedTag();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hidePopup();
                break;
                
            case ' ':
            case 'Tab':
                // Space or tab ends tag completion
                this.hidePopup();
                break;
        }
    }

    isStartOfTag(text, pos) {
        // Check if # is at start of line or after whitespace
        if (pos === 0) return true;
        const charBefore = text[pos - 1];
        return /\s/.test(charBefore);
    }

    getCurrentQuery(text, pos) {
        // Find the # before cursor
        let startPos = -1;
        for (let i = pos - 1; i >= 0; i--) {
            if (text[i] === '#') {
                startPos = i;
                break;
            }
            if (/\s/.test(text[i])) {
                // Whitespace - not in tag
                return null;
            }
        }
        
        if (startPos === -1) return null;
        
        // Make sure it's at start of word
        if (!this.isStartOfTag(text, startPos)) return null;
        
        // Extract query between # and cursor
        const query = text.substring(startPos + 1, pos);
        
        // Make sure we haven't ended the tag with whitespace
        if (/\s/.test(query)) return null;
        
        return query;
    }

    isAtTag(textarea) {
        const pos = textarea.selectionStart;
        const query = this.getCurrentQuery(textarea.value, pos);
        return query !== null;
    }

    async showTagPopup(textarea) {
        await this.loadAllTags();
        
        this.isActive = true;
        this.selectedIndex = 0;
        this.filteredTags = [...this.allTags];
        
        this.createPopup(textarea);
        this.updatePopupContent();
        this.positionPopup(textarea);
    }

    async loadAllTags() {
        const now = Date.now();
        // Cache for 10 seconds
        if (this._tagsCache && (now - this._cacheTime) < 10000) {
            this.allTags = this._tagsCache;
            return;
        }
        
        try {
            const tags = await invoke('get_tags');
            this.allTags = tags.sort((a, b) => a.localeCompare(b));
            
            this._tagsCache = this.allTags;
            this._cacheTime = now;
        } catch (err) {
            console.error('Failed to load tags:', err);
            this.allTags = [];
        }
    }

    updateFilter(query) {
        if (!query) {
            this.filteredTags = [...this.allTags];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredTags = this.allTags.filter(tag => 
                tag.toLowerCase().startsWith(lowerQuery)
            );
        }
        
        this.selectedIndex = 0;
        this.updatePopupContent();
    }

    createPopup(textarea) {
        if (this.popup) {
            this.popup.remove();
        }
        
        this.popup = document.createElement('div');
        this.popup.className = 'tag-popup';
        this.popup.innerHTML = `
            <div class="tag-popup-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                Insert tag
            </div>
            <div class="tag-popup-list"></div>
            <div class="tag-popup-footer">
                <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Cancel
            </div>
        `;
        
        document.body.appendChild(this.popup);
        
        // Add click handlers
        this.popup.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.tag-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                this.selectedIndex = index;
                this.insertSelectedTag();
            }
        });
    }

    updatePopupContent() {
        if (!this.popup) return;
        
        const listEl = this.popup.querySelector('.tag-popup-list');
        
        if (this.filteredTags.length === 0) {
            listEl.innerHTML = '<div class="tag-no-results">No tags found</div>';
            return;
        }
        
        const items = this.filteredTags.slice(0, 10).map((tag, index) => {
            const isSelected = index === this.selectedIndex;
            return `
                <div class="tag-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                    <div class="tag-item-name">#${this.highlightMatch(tag)}</div>
                </div>
            `;
        }).join('');
        
        listEl.innerHTML = items;
    }

    highlightMatch(text) {
        const query = this.getCurrentQuery(this.currentTextarea.value, this.currentTextarea.selectionStart);
        if (!query) return this.escapeHtml(text);
        
        const regex = new RegExp(`^(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    updatePopupSelection() {
        if (!this.popup) return;
        
        const items = this.popup.querySelectorAll('.tag-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
        
        // Scroll selected item into view
        const selectedItem = items[this.selectedIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }

    positionPopup(textarea) {
        if (!this.popup) return;
        
        // Get cursor position
        const rect = textarea.getBoundingClientRect();
        const textareaStyle = window.getComputedStyle(textarea);
        const lineHeight = parseInt(textareaStyle.lineHeight) || 20;
        
        // Calculate rough cursor position
        const pos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, pos);
        const lines = textBefore.split('\n');
        const currentLineIndex = lines.length - 1;
        
        const top = rect.top + (currentLineIndex * lineHeight) + lineHeight + 5;
        const left = rect.left + 10;
        
        this.popup.style.position = 'fixed';
        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
        this.popup.style.zIndex = '10000';
        
        // Make sure it's visible
        const popupRect = this.popup.getBoundingClientRect();
        if (popupRect.bottom > window.innerHeight) {
            this.popup.style.top = `${rect.top - popupRect.height - 5}px`;
        }
        if (popupRect.right > window.innerWidth) {
            this.popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
        }
    }

    insertSelectedTag() {
        if (!this.currentTextarea || this.selectedIndex >= this.filteredTags.length) return;
        
        const selectedTag = this.filteredTags[this.selectedIndex];
        const pos = this.currentTextarea.selectionStart;
        const text = this.currentTextarea.value;
        
        // Find the # before cursor
        let startPos = this.triggerPos;
        if (startPos === -1) {
            // Fallback: search backwards
            for (let i = pos - 1; i >= 0; i--) {
                if (text[i] === '#') {
                    startPos = i;
                    break;
                }
                if (/\s/.test(text[i])) break;
            }
        }
        
        if (startPos === -1) {
            this.hidePopup();
            return;
        }
        
        // Replace from # to cursor with #tag
        const replacement = `#${selectedTag}`;
        this.currentTextarea.value = text.substring(0, startPos) + replacement + text.substring(pos);
        
        // Position cursor after tag
        const newPos = startPos + replacement.length;
        this.currentTextarea.selectionStart = newPos;
        this.currentTextarea.selectionEnd = newPos;
        
        // Mark dirty and focus
        this.app.markDirty();
        this.currentTextarea.focus();
        
        this.hidePopup();
    }

    hidePopup() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        this.isActive = false;
        this.triggerPos = -1;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Clear cache when tags change
    invalidateCache() {
        this._tagsCache = null;
        this._cacheTime = 0;
    }
}