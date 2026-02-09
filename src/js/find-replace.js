// Oxidian — Find & Replace Module
// Ctrl+F overlay for in-file search, similar to VS Code/Obsidian

export class FindReplace {
    constructor(app) {
        this.app = app;
        this.isVisible = false;
        this.overlay = null;
        this.findInput = null;
        this.replaceInput = null;
        this.matchCount = 0;
        this.currentMatch = -1;
        this.matches = [];
        this.originalContent = '';
        this.caseSensitive = false;
        this.useRegex = false;
        this.highlightElements = [];
        
        // Options
        this.isReplaceMode = false;
    }

    /**
     * Show the find bar (Ctrl+F)
     */
    showFind() {
        if (this.isVisible) {
            this.focusInput();
            return;
        }
        
        this.isReplaceMode = false;
        this._createOverlay();
        this._positionOverlay();
        this.isVisible = true;
        this.focusInput();
    }

    /**
     * Show the find & replace bar (Ctrl+H)
     */
    showFindReplace() {
        if (this.isVisible && this.isReplaceMode) {
            this.focusInput();
            return;
        }
        
        this.isReplaceMode = true;
        this._createOverlay();
        this._positionOverlay();
        this.isVisible = true;
        this.focusInput();
    }

    /**
     * Hide the find bar
     */
    hide() {
        if (!this.isVisible) return;
        
        this._clearHighlights();
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.isVisible = false;
        this.matches = [];
        this.currentMatch = -1;
        this.matchCount = 0;
        
        // Return focus to editor
        this._focusEditor();
    }

    /**
     * Create the find/replace overlay UI
     */
    _createOverlay() {
        this.hide(); // Remove existing first
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'find-replace-overlay';
        
        const container = document.createElement('div');
        container.className = 'find-replace-container';
        
        // Find row
        const findRow = document.createElement('div');
        findRow.className = 'find-replace-row';
        
        this.findInput = document.createElement('input');
        this.findInput.className = 'find-replace-input find-input';
        this.findInput.placeholder = 'Find';
        this.findInput.type = 'text';
        
        const findControls = document.createElement('div');
        findControls.className = 'find-replace-controls';
        
        // Match count
        const matchCounter = document.createElement('span');
        matchCounter.className = 'find-match-count';
        matchCounter.textContent = '';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'find-replace-btn find-prev-btn';
        prevBtn.innerHTML = '↑';
        prevBtn.title = 'Previous match (Shift+Enter)';
        prevBtn.onclick = () => this.findPrevious();
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'find-replace-btn find-next-btn';
        nextBtn.innerHTML = '↓';
        nextBtn.title = 'Next match (Enter)';
        nextBtn.onclick = () => this.findNext();
        
        // Case sensitive toggle
        const caseBtn = document.createElement('button');
        caseBtn.className = 'find-replace-btn find-case-btn';
        caseBtn.innerHTML = 'Aa';
        caseBtn.title = 'Match Case';
        caseBtn.onclick = () => this.toggleCaseSensitive();
        
        // Regex toggle
        const regexBtn = document.createElement('button');
        regexBtn.className = 'find-replace-btn find-regex-btn';
        regexBtn.innerHTML = '.*';
        regexBtn.title = 'Use Regular Expression';
        regexBtn.onclick = () => this.toggleRegex();
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'find-replace-btn find-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close (Escape)';
        closeBtn.onclick = () => this.hide();
        
        findControls.appendChild(matchCounter);
        findControls.appendChild(prevBtn);
        findControls.appendChild(nextBtn);
        findControls.appendChild(caseBtn);
        findControls.appendChild(regexBtn);
        findControls.appendChild(closeBtn);
        
        findRow.appendChild(this.findInput);
        findRow.appendChild(findControls);
        container.appendChild(findRow);
        
        // Replace row (if in replace mode)
        if (this.isReplaceMode) {
            const replaceRow = document.createElement('div');
            replaceRow.className = 'find-replace-row';
            
            this.replaceInput = document.createElement('input');
            this.replaceInput.className = 'find-replace-input replace-input';
            this.replaceInput.placeholder = 'Replace';
            this.replaceInput.type = 'text';
            
            const replaceControls = document.createElement('div');
            replaceControls.className = 'find-replace-controls';
            
            // Replace button
            const replaceBtn = document.createElement('button');
            replaceBtn.className = 'find-replace-btn replace-btn';
            replaceBtn.innerHTML = 'Replace';
            replaceBtn.onclick = () => this.replaceNext();
            
            // Replace All button
            const replaceAllBtn = document.createElement('button');
            replaceAllBtn.className = 'find-replace-btn replace-all-btn';
            replaceAllBtn.innerHTML = 'Replace All';
            replaceAllBtn.onclick = () => this.replaceAll();
            
            replaceControls.appendChild(replaceBtn);
            replaceControls.appendChild(replaceAllBtn);
            
            replaceRow.appendChild(this.replaceInput);
            replaceRow.appendChild(replaceControls);
            container.appendChild(replaceRow);
        }
        
        this.overlay.appendChild(container);
        
        // Event listeners
        this._bindEvents();
    }

    /**
     * Position the overlay at the top of the editor
     */
    _positionOverlay() {
        const editorWrapper = document.querySelector('.editor-wrapper');
        if (!editorWrapper) return;
        
        editorWrapper.appendChild(this.overlay);
    }

    /**
     * Bind event handlers
     */
    _bindEvents() {
        if (!this.findInput) return;
        
        // Input events
        this.findInput.addEventListener('input', () => this._onFindInput());
        this.findInput.addEventListener('keydown', (e) => this._onKeyDown(e));
        
        if (this.replaceInput) {
            this.replaceInput.addEventListener('keydown', (e) => this._onKeyDown(e));
        }
    }

    /**
     * Handle find input changes
     */
    _onFindInput() {
        const query = this.findInput.value;
        if (query.length === 0) {
            this._clearHighlights();
            this._updateMatchCount();
            return;
        }
        
        this._performFind(query);
    }

    /**
     * Handle keyboard events in the find bar
     */
    _onKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.hide();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                this.findPrevious();
            } else {
                this.findNext();
            }
        } else if (e.key === 'F3') {
            e.preventDefault();
            if (e.shiftKey) {
                this.findPrevious();
            } else {
                this.findNext();
            }
        }
    }

    /**
     * Perform the actual find operation
     */
    _performFind(query) {
        if (!query) return;
        
        this._clearHighlights();
        this.matches = [];
        
        const content = this._getEditorContent();
        if (!content) return;
        
        try {
            let regex;
            if (this.useRegex) {
                const flags = this.caseSensitive ? 'g' : 'gi';
                regex = new RegExp(query, flags);
            } else {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const flags = this.caseSensitive ? 'g' : 'gi';
                regex = new RegExp(escapedQuery, flags);
            }
            
            let match;
            while ((match = regex.exec(content)) !== null) {
                this.matches.push({
                    index: match.index,
                    length: match[0].length,
                    text: match[0]
                });
                
                // Prevent infinite loop with zero-width matches
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
            
            this.matchCount = this.matches.length;
            this.currentMatch = this.matches.length > 0 ? 0 : -1;
            
            this._highlightMatches();
            this._updateMatchCount();
            
            if (this.matches.length > 0) {
                this._scrollToMatch(0);
            }
            
        } catch (error) {
            // Invalid regex - clear results
            this.matches = [];
            this.matchCount = 0;
            this.currentMatch = -1;
            this._updateMatchCount();
        }
    }

    /**
     * Get content from the current editor
     */
    _getEditorContent() {
        // Try CodeMirror first
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            return this.app.editor.cmEditor.getContent();
        }
        
        // Try HyperMark editor
        if (this.app.hypermarkEditor) {
            return this.app.hypermarkEditor.getContent();
        }
        
        // Fallback to textarea
        const textarea = document.querySelector('.editor-textarea');
        if (textarea) {
            return textarea.value;
        }
        
        return '';
    }

    /**
     * Highlight all matches in the editor
     */
    _highlightMatches() {
        if (this.matches.length === 0) return;
        
        // For textarea editor, use overlay highlighting
        const textarea = document.querySelector('.editor-textarea');
        if (textarea) {
            this._highlightInTextarea(textarea);
        }
        
        // For CodeMirror, use its highlighting API
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            this.app.editor.cmEditor.highlightMatches(this.matches, this.currentMatch);
        }
    }

    /**
     * Highlight matches in textarea using overlay
     */
    _highlightInTextarea(textarea) {
        // This is a simplified approach - in a real implementation,
        // you'd need to create an overlay with precise positioning
        // For now, we'll use selection to show the current match
        if (this.currentMatch >= 0 && this.currentMatch < this.matches.length) {
            const match = this.matches[this.currentMatch];
            textarea.focus();
            textarea.setSelectionRange(match.index, match.index + match.length);
        }
    }

    /**
     * Clear all highlights
     */
    _clearHighlights() {
        // Clear CodeMirror highlights
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            this.app.editor.cmEditor.clearHighlights();
        }
        
        this.highlightElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
        this.highlightElements = [];
    }

    /**
     * Update the match count display
     */
    _updateMatchCount() {
        const counter = this.overlay?.querySelector('.find-match-count');
        if (!counter) return;
        
        if (this.matchCount === 0) {
            counter.textContent = 'No matches';
            counter.className = 'find-match-count no-matches';
        } else {
            counter.textContent = `${this.currentMatch + 1} of ${this.matchCount}`;
            counter.className = 'find-match-count';
        }
    }

    /**
     * Move to next match
     */
    findNext() {
        if (this.matches.length === 0) return;
        
        this.currentMatch = (this.currentMatch + 1) % this.matches.length;
        this._scrollToMatch(this.currentMatch);
        this._highlightMatches();
        this._updateMatchCount();
    }

    /**
     * Move to previous match
     */
    findPrevious() {
        if (this.matches.length === 0) return;
        
        this.currentMatch = this.currentMatch <= 0 ? this.matches.length - 1 : this.currentMatch - 1;
        this._scrollToMatch(this.currentMatch);
        this._highlightMatches();
        this._updateMatchCount();
    }

    /**
     * Scroll to a specific match
     */
    _scrollToMatch(index) {
        if (index < 0 || index >= this.matches.length) return;
        
        const match = this.matches[index];
        
        // Scroll textarea to match
        const textarea = document.querySelector('.editor-textarea');
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(match.index, match.index + match.length);
            
            // Scroll into view
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
            const textBeforeMatch = textarea.value.substring(0, match.index);
            const lines = textBeforeMatch.split('\n').length;
            const scrollTop = Math.max(0, (lines - 5) * lineHeight);
            textarea.scrollTop = scrollTop;
        }
        
        // For CodeMirror
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            this.app.editor.cmEditor.scrollToMatch(index);
        }
    }

    /**
     * Replace the current match
     */
    replaceNext() {
        if (!this.isReplaceMode || this.currentMatch < 0 || this.currentMatch >= this.matches.length) return;
        
        const replaceText = this.replaceInput.value;
        const match = this.matches[this.currentMatch];
        
        // Replace in editor
        this._replaceAtPosition(match.index, match.length, replaceText);
        
        // Update match positions (all matches after this one shift)
        const lengthDiff = replaceText.length - match.length;
        for (let i = this.currentMatch + 1; i < this.matches.length; i++) {
            this.matches[i].index += lengthDiff;
        }
        
        // Remove the replaced match and update current position
        this.matches.splice(this.currentMatch, 1);
        this.matchCount--;
        
        if (this.currentMatch >= this.matches.length) {
            this.currentMatch = this.matches.length - 1;
        }
        
        this._highlightMatches();
        this._updateMatchCount();
        
        // Move to next match
        if (this.matches.length > 0) {
            this.findNext();
        }
    }

    /**
     * Replace all matches
     */
    replaceAll() {
        if (!this.isReplaceMode || this.matches.length === 0) return;
        
        const replaceText = this.replaceInput.value;
        let content = this._getEditorContent();
        
        // Replace from end to beginning to maintain indices
        for (let i = this.matches.length - 1; i >= 0; i--) {
            const match = this.matches[i];
            content = content.substring(0, match.index) + replaceText + content.substring(match.index + match.length);
        }
        
        // Set the new content
        this._setEditorContent(content);
        
        // Clear matches and update UI
        this.matches = [];
        this.matchCount = 0;
        this.currentMatch = -1;
        this._clearHighlights();
        this._updateMatchCount();
    }

    /**
     * Replace text at a specific position
     */
    _replaceAtPosition(index, length, replacement) {
        const content = this._getEditorContent();
        const newContent = content.substring(0, index) + replacement + content.substring(index + length);
        this._setEditorContent(newContent);
    }

    /**
     * Set content in the current editor
     */
    _setEditorContent(content) {
        // Try CodeMirror first
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            this.app.editor.cmEditor.setContent(content);
            return;
        }
        
        // Try HyperMark editor
        if (this.app.hypermarkEditor) {
            this.app.hypermarkEditor.setContent(content);
            return;
        }
        
        // Fallback to textarea
        const textarea = document.querySelector('.editor-textarea');
        if (textarea) {
            textarea.value = content;
            // Trigger input event to update app state
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Toggle case sensitive search
     */
    toggleCaseSensitive() {
        this.caseSensitive = !this.caseSensitive;
        const btn = this.overlay?.querySelector('.find-case-btn');
        if (btn) {
            btn.classList.toggle('active', this.caseSensitive);
        }
        
        // Re-run search if there's a query
        if (this.findInput && this.findInput.value) {
            this._performFind(this.findInput.value);
        }
    }

    /**
     * Toggle regex search
     */
    toggleRegex() {
        this.useRegex = !this.useRegex;
        const btn = this.overlay?.querySelector('.find-regex-btn');
        if (btn) {
            btn.classList.toggle('active', this.useRegex);
        }
        
        // Re-run search if there's a query
        if (this.findInput && this.findInput.value) {
            this._performFind(this.findInput.value);
        }
    }

    /**
     * Focus the find input
     */
    focusInput() {
        if (this.findInput) {
            this.findInput.focus();
            this.findInput.select();
        }
    }

    /**
     * Return focus to the editor
     */
    _focusEditor() {
        const textarea = document.querySelector('.editor-textarea');
        if (textarea) {
            textarea.focus();
        }
        
        if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
            this.app.editor.cmEditor.focus();
        }
    }
}