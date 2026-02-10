// Oxidian — Wikilinks Auto-Complete
// Type [[ → Shows popup with all notes, filter as you type

const { invoke } = window.__TAURI__.core;

export class WikilinksAutoComplete {
    constructor(app) {
        this.app = app;
        this.popup = null;
        this.isActive = false;
        this.allNotes = [];
        this.filteredNotes = [];
        this.selectedIndex = 0;
        this.triggerPos = -1;
        this.currentTextarea = null;
        this._notesCache = null;
        this._cacheTime = 0;
    }

    /**
     * Initialize wikilinks auto-complete for a textarea
     */
    attachTo(textarea) {
        if (!textarea) return;
        
        textarea.addEventListener('input', (e) => this.onInput(e));
        textarea.addEventListener('keydown', (e) => this.onKeyDown(e));
        textarea.addEventListener('blur', () => this.hidePopup());
        
        // Also handle clicks to hide popup
        textarea.addEventListener('click', () => {
            if (this.isActive && !this.isAtWikilink(textarea)) {
                this.hidePopup();
            }
        });
    }

    async onInput(e) {
        const textarea = e.target;
        this.currentTextarea = textarea;
        
        const pos = textarea.selectionStart;
        const text = textarea.value;
        
        // Check if we just typed '[[' 
        if (text.substring(pos - 2, pos) === '[[') {
            this.triggerPos = pos - 2;
            await this.showWikilinkPopup(textarea);
            return;
        }
        
        // If popup is open, update filter
        if (this.isActive) {
            const query = this.getCurrentQuery(text, pos);
            if (query === null) {
                // We're no longer in a wikilink
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
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredNotes.length - 1);
                this.updatePopupSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.updatePopupSelection();
                break;
                
            case 'Enter':
                e.preventDefault();
                this.insertSelectedNote();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hidePopup();
                break;
        }
    }

    getCurrentQuery(text, pos) {
        // Find the [[ before cursor
        let startPos = -1;
        for (let i = pos - 1; i >= 0; i--) {
            if (text.substring(i, i + 2) === '[[') {
                startPos = i;
                break;
            }
            if (text[i] === '\n' || text[i] === ']') {
                // Line break or closing bracket - not in wikilink
                return null;
            }
        }
        
        if (startPos === -1) return null;
        
        // Extract query between [[ and cursor
        const query = text.substring(startPos + 2, pos);
        
        // Make sure we haven't closed the wikilink
        if (query.includes(']]')) return null;
        
        return query;
    }

    isAtWikilink(textarea) {
        const pos = textarea.selectionStart;
        const query = this.getCurrentQuery(textarea.value, pos);
        return query !== null;
    }

    async showWikilinkPopup(textarea) {
        await this.loadAllNotes();
        
        this.isActive = true;
        this.selectedIndex = 0;
        this.filteredNotes = [...this.allNotes];
        
        this.createPopup(textarea);
        this.updatePopupContent();
        this.positionPopup(textarea);
    }

    async loadAllNotes() {
        const now = Date.now();
        // Cache for 5 seconds
        if (this._notesCache && (now - this._cacheTime) < 5000) {
            this.allNotes = this._notesCache;
            return;
        }
        
        try {
            const tree = await invoke('list_files');
            // list_files returns a tree structure — flatten it
            const flatFiles = [];
            const walk = (nodes) => {
                if (!Array.isArray(nodes)) return;
                for (const node of nodes) {
                    if (node.is_dir) {
                        walk(node.children || []);
                    } else if (node.path && node.path.endsWith('.md')) {
                        flatFiles.push(node);
                    }
                }
            };
            walk(tree);
            this.allNotes = flatFiles
                .map(file => ({
                    name: file.path.replace('.md', '').split('/').pop(),
                    path: file.path,
                    fullPath: file.path
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            
            this._notesCache = this.allNotes;
            this._cacheTime = now;
        } catch (err) {
            console.error('Failed to load notes for wikilinks:', err);
            this.allNotes = [];
        }
    }

    updateFilter(query) {
        if (!query) {
            this.filteredNotes = [...this.allNotes];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredNotes = this.allNotes.filter(note => 
                note.name.toLowerCase().includes(lowerQuery)
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
        this.popup.className = 'wikilink-popup';
        this.popup.innerHTML = `
            <div class="wikilink-popup-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                Link to note
            </div>
            <div class="wikilink-popup-list"></div>
            <div class="wikilink-popup-footer">
                <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Cancel
            </div>
        `;
        
        document.body.appendChild(this.popup);
        
        // Add click handlers
        this.popup.addEventListener('mousedown', (e) => {
            const item = e.target.closest('.wikilink-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                this.selectedIndex = index;
                this.insertSelectedNote();
            }
        });
    }

    updatePopupContent() {
        if (!this.popup) return;
        
        const listEl = this.popup.querySelector('.wikilink-popup-list');
        
        if (this.filteredNotes.length === 0) {
            listEl.innerHTML = '<div class="wikilink-no-results">No notes found</div>';
            return;
        }
        
        const items = this.filteredNotes.slice(0, 10).map((note, index) => {
            const isSelected = index === this.selectedIndex;
            return `
                <div class="wikilink-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                    <div class="wikilink-item-name">${this.highlightMatch(note.name)}</div>
                    <div class="wikilink-item-path">${note.fullPath}</div>
                </div>
            `;
        }).join('');
        
        listEl.innerHTML = items;
    }

    highlightMatch(text) {
        const query = this.getCurrentQuery(this.currentTextarea.value, this.currentTextarea.selectionStart);
        if (!query) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    updatePopupSelection() {
        if (!this.popup) return;
        
        const items = this.popup.querySelectorAll('.wikilink-item');
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
        
        // Calculate rough cursor position (simplified)
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
    }

    insertSelectedNote() {
        if (!this.currentTextarea || this.selectedIndex >= this.filteredNotes.length) return;
        
        const selectedNote = this.filteredNotes[this.selectedIndex];
        const pos = this.currentTextarea.selectionStart;
        const text = this.currentTextarea.value;
        
        // Find the [[ before cursor
        let startPos = this.triggerPos;
        if (startPos === -1) {
            // Fallback: search backwards
            for (let i = pos - 1; i >= 0; i--) {
                if (text.substring(i, i + 2) === '[[') {
                    startPos = i;
                    break;
                }
            }
        }
        
        if (startPos === -1) {
            this.hidePopup();
            return;
        }
        
        // Replace from [[ to cursor with [[NoteName]]
        const replacement = `[[${selectedNote.name}]]`;
        this.currentTextarea.value = text.substring(0, startPos) + replacement + text.substring(pos);
        
        // Position cursor after ]]
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

    // Clear cache when files change
    invalidateCache() {
        this._notesCache = null;
        this._cacheTime = 0;
    }
}