// Oxidian — Multiple Cursors (Ctrl+D)
// Select next occurrence of word, enable multi-cursor editing

export class MultipleCursors {
    constructor(app) {
        this.app = app;
        this.textarea = null;
        this.selections = [];
        this.isActive = false;
        this.originalSelection = null;
        this.searchTerm = '';
        this._overlays = [];
    }

    /**
     * Initialize multiple cursors for a textarea
     */
    attachTo(textarea) {
        if (!textarea) return;
        
        this.textarea = textarea;
        
        // Listen for Ctrl+D
        textarea.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Clear multi-cursor on click or blur
        textarea.addEventListener('click', () => this.clear());
        textarea.addEventListener('blur', () => this.clear());
    }

    onKeyDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        
        if (ctrl && e.key === 'd' && document.activeElement === this.textarea) {
            // Only handle if textarea is focused (prevent conflict with app's Ctrl+D)
            e.preventDefault();
            e.stopPropagation();
            this.selectNextOccurrence();
        } else if (this.isActive && this.shouldHandleKey(e)) {
            e.preventDefault();
            this.handleMultiCursorInput(e);
        }
    }

    selectNextOccurrence() {
        if (!this.textarea) return;
        
        const currentSelection = this.getCurrentSelection();
        
        if (!this.isActive) {
            // First Ctrl+D: find current word and setup multi-cursor
            this.initMultiCursor(currentSelection);
        } else {
            // Subsequent Ctrl+D: find next occurrence
            this.addNextOccurrence();
        }
    }

    initMultiCursor(selection) {
        if (!selection.text.trim()) {
            // No text selected, select current word
            const wordBounds = this.getCurrentWordBounds();
            if (!wordBounds) return;
            
            this.textarea.selectionStart = wordBounds.start;
            this.textarea.selectionEnd = wordBounds.end;
            selection = this.getCurrentSelection();
        }
        
        this.searchTerm = selection.text;
        this.originalSelection = { ...selection };
        this.selections = [selection];
        this.isActive = true;
        
        // Find and add next occurrence
        this.addNextOccurrence();
        
        this.updateVisualCursors();
    }

    addNextOccurrence() {
        if (!this.searchTerm) return;
        
        const text = this.textarea.value;
        const lastSelection = this.selections[this.selections.length - 1];
        
        // Search for next occurrence after the last selection
        const searchStart = lastSelection.end;
        const nextIndex = text.indexOf(this.searchTerm, searchStart);
        
        if (nextIndex === -1) {
            // Wrap around to beginning
            const wrapIndex = text.indexOf(this.searchTerm, 0);
            if (wrapIndex !== -1 && wrapIndex < this.originalSelection.start) {
                this.addSelection(wrapIndex, wrapIndex + this.searchTerm.length);
            }
        } else {
            this.addSelection(nextIndex, nextIndex + this.searchTerm.length);
        }
        
        this.updateVisualCursors();
    }

    addSelection(start, end) {
        // Check if this selection overlaps with existing ones
        const overlaps = this.selections.some(sel => 
            (start >= sel.start && start < sel.end) || 
            (end > sel.start && end <= sel.end) ||
            (start <= sel.start && end >= sel.end)
        );
        
        if (!overlaps) {
            this.selections.push({ start, end, text: this.searchTerm });
        }
    }

    getCurrentSelection() {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const text = this.textarea.value.substring(start, end);
        return { start, end, text };
    }

    getCurrentWordBounds() {
        const pos = this.textarea.selectionStart;
        const text = this.textarea.value;
        
        // Find word boundaries
        let start = pos;
        let end = pos;
        
        // Go backwards to find start of word
        while (start > 0 && /\w/.test(text[start - 1])) {
            start--;
        }
        
        // Go forwards to find end of word
        while (end < text.length && /\w/.test(text[end])) {
            end++;
        }
        
        if (start === end) return null; // No word found
        
        return { start, end };
    }

    shouldHandleKey(e) {
        // Handle typing and deletion keys in multi-cursor mode
        const typingKeys = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        const deletionKeys = ['Backspace', 'Delete'];
        const navigationKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        
        return typingKeys || deletionKeys.includes(e.key) || (navigationKeys.includes(e.key) && !e.shiftKey);
    }

    handleMultiCursorInput(e) {
        if (e.key === 'Escape') {
            this.clear();
            return;
        }
        
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
            // Navigation clears multi-cursor
            this.clear();
            return;
        }
        
        let newText = this.textarea.value;
        let offset = 0;
        
        // Sort selections by position (reverse order for offset calculation)
        const sortedSelections = [...this.selections].sort((a, b) => b.start - a.start);
        
        for (const selection of sortedSelections) {
            const adjustedStart = selection.start + offset;
            const adjustedEnd = selection.end + offset;
            
            if (e.key === 'Backspace') {
                if (adjustedStart === adjustedEnd && adjustedStart > 0) {
                    // Delete one character before cursor
                    newText = newText.substring(0, adjustedStart - 1) + newText.substring(adjustedStart);
                    offset -= 1;
                } else if (adjustedStart < adjustedEnd) {
                    // Delete selection
                    newText = newText.substring(0, adjustedStart) + newText.substring(adjustedEnd);
                    offset -= (adjustedEnd - adjustedStart);
                }
            } else if (e.key === 'Delete') {
                if (adjustedStart === adjustedEnd && adjustedStart < newText.length) {
                    // Delete one character after cursor
                    newText = newText.substring(0, adjustedStart) + newText.substring(adjustedStart + 1);
                } else if (adjustedStart < adjustedEnd) {
                    // Delete selection
                    newText = newText.substring(0, adjustedStart) + newText.substring(adjustedEnd);
                    offset -= (adjustedEnd - adjustedStart);
                }
            } else if (e.key.length === 1) {
                // Insert character
                newText = newText.substring(0, adjustedStart) + e.key + newText.substring(adjustedEnd);
                offset += 1 - (adjustedEnd - adjustedStart);
            }
        }
        
        // Update textarea content
        this.textarea.value = newText;
        
        // Mark dirty and trigger events
        this.app.markDirty();
        this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Clear multi-cursor after modification
        this.clear();
    }

    updateVisualCursors() {
        // Clear previous overlays
        this.clearOverlays();
        
        if (!this.isActive || this.selections.length <= 1) return;
        
        // Create visual indicators for each cursor
        const container = this.textarea.parentElement;
        if (!container) return;
        
        this.selections.forEach((selection, index) => {
            if (index === 0) return; // Skip first selection (it's the main one)
            
            const overlay = this.createCursorOverlay(selection);
            if (overlay) {
                container.appendChild(overlay);
                this._overlays.push(overlay);
            }
        });
    }

    createCursorOverlay(selection) {
        const overlay = document.createElement('div');
        overlay.className = 'multi-cursor-overlay';
        
        // Calculate position (simplified - would need more precise positioning in reality)
        const textBefore = this.textarea.value.substring(0, selection.start);
        const lines = textBefore.split('\n');
        const line = lines.length - 1;
        const column = lines[lines.length - 1].length;
        
        // Rough positioning
        const lineHeight = 20; // Would need to get from computed style
        const charWidth = 8;   // Rough estimate
        
        overlay.style.position = 'absolute';
        overlay.style.top = `${line * lineHeight}px`;
        overlay.style.left = `${column * charWidth}px`;
        overlay.style.width = '2px';
        overlay.style.height = `${lineHeight}px`;
        overlay.style.background = 'var(--accent-color, #007acc)';
        overlay.style.zIndex = '10';
        overlay.style.pointerEvents = 'none';
        
        return overlay;
    }

    clearOverlays() {
        this._overlays.forEach(overlay => {
            if (overlay.parentElement) {
                overlay.parentElement.removeChild(overlay);
            }
        });
        this._overlays = [];
    }

    clear() {
        this.isActive = false;
        this.selections = [];
        this.searchTerm = '';
        this.originalSelection = null;
        this.clearOverlays();
    }

    destroy() {
        this.clear();
        this.textarea = null;
    }
}