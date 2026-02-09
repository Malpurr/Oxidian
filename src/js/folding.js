// Oxidian — Code/Section Folding
// Ctrl+Shift+[ → Fold All, Ctrl+Shift+] → Unfold All

export class Folding {
    constructor(app) {
        this.app = app;
        this.foldedSections = new Map(); // line -> { start, end, originalText }
        this.textarea = null;
        this.isActive = false;
    }

    /**
     * Initialize folding for a textarea
     */
    attachTo(textarea) {
        if (!textarea) return;
        
        this.textarea = textarea;
        
        // Listen for fold/unfold keyboard shortcuts
        textarea.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        
        if (ctrl && shift && e.key === '[') {
            // Fold All
            e.preventDefault();
            this.foldAll();
        } else if (ctrl && shift && e.key === ']') {
            // Unfold All  
            e.preventDefault();
            this.unfoldAll();
        }
    }

    /**
     * Fold all foldable sections
     */
    foldAll() {
        if (!this.textarea) return;
        
        const content = this.textarea.value;
        const foldableRegions = this.findFoldableRegions(content);
        
        // Clear existing folds
        this.unfoldAll();
        
        // Apply new folds (from bottom to top to preserve line numbers)
        foldableRegions.reverse().forEach(region => {
            this.foldRegion(region);
        });
        
        this.updateTextarea();
    }

    /**
     * Unfold all folded sections
     */
    unfoldAll() {
        if (!this.textarea) return;
        
        // Restore all folded sections
        const sortedLines = Array.from(this.foldedSections.keys()).sort((a, b) => a - b);
        
        for (const lineNum of sortedLines) {
            this.unfoldRegion(lineNum);
        }
        
        this.foldedSections.clear();
        this.updateTextarea();
    }

    /**
     * Find all regions that can be folded
     */
    findFoldableRegions(content) {
        const lines = content.split('\n');
        const regions = [];
        
        // Find markdown headers and their content
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            
            if (headerMatch) {
                const headerLevel = headerMatch[1].length;
                const headerText = headerMatch[2];
                const startLine = i;
                
                // Find end of this section (next header of same or higher level)
                let endLine = lines.length - 1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    const nextHeader = nextLine.match(/^(#{1,6})\s+.+$/);
                    
                    if (nextHeader && nextHeader[1].length <= headerLevel) {
                        endLine = j - 1;
                        break;
                    }
                }
                
                // Only fold if there's content to fold
                if (endLine > startLine) {
                    regions.push({
                        type: 'header',
                        level: headerLevel,
                        title: headerText,
                        startLine,
                        endLine,
                        foldStartLine: startLine + 1, // Don't fold the header itself
                        foldEndLine: endLine
                    });
                }
            }
        }
        
        // Find code blocks
        let inCodeBlock = false;
        let codeBlockStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // Start of code block
                    inCodeBlock = true;
                    codeBlockStart = i;
                } else {
                    // End of code block
                    inCodeBlock = false;
                    if (i > codeBlockStart + 1) { // Has content to fold
                        regions.push({
                            type: 'codeblock',
                            startLine: codeBlockStart,
                            endLine: i,
                            foldStartLine: codeBlockStart + 1,
                            foldEndLine: i - 1
                        });
                    }
                }
            }
        }
        
        // Find lists (simple implementation)
        let inList = false;
        let listStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isListItem = /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
            
            if (isListItem && !inList) {
                inList = true;
                listStart = i;
            } else if (!isListItem && line.trim() !== '' && inList) {
                // End of list
                inList = false;
                if (i > listStart + 2) { // At least 3 items to be worth folding
                    regions.push({
                        type: 'list',
                        startLine: listStart,
                        endLine: i - 1,
                        foldStartLine: listStart + 1,
                        foldEndLine: i - 1
                    });
                }
            }
        }
        
        return regions;
    }

    /**
     * Fold a specific region
     */
    foldRegion(region) {
        const lines = this.textarea.value.split('\n');
        
        // Create folded representation
        let foldedText = '';
        const linesToFold = region.foldEndLine - region.foldStartLine + 1;
        
        switch (region.type) {
            case 'header':
                foldedText = `    ⋯ ${linesToFold} lines hidden ⋯`;
                break;
            case 'codeblock':
                foldedText = `    ⋯ ${linesToFold} lines of code ⋯`;
                break;
            case 'list':
                foldedText = `    ⋯ ${linesToFold} list items ⋯`;
                break;
            default:
                foldedText = `    ⋯ ${linesToFold} lines ⋯`;
        }
        
        // Store original content
        const originalLines = lines.slice(region.foldStartLine, region.foldEndLine + 1);
        this.foldedSections.set(region.foldStartLine, {
            ...region,
            originalLines,
            foldedText
        });
    }

    /**
     * Unfold a specific region
     */
    unfoldRegion(lineNum) {
        const foldData = this.foldedSections.get(lineNum);
        if (foldData) {
            this.foldedSections.delete(lineNum);
            return foldData;
        }
        return null;
    }

    /**
     * Update textarea with folded content
     */
    updateTextarea() {
        if (!this.textarea) return;
        
        const lines = this.textarea.value.split('\n');
        const cursorPos = this.textarea.selectionStart;
        
        // Build new content with folds applied
        const newLines = [];
        let currentLine = 0;
        
        while (currentLine < lines.length) {
            const foldData = this.foldedSections.get(currentLine);
            
            if (foldData) {
                // Add lines before the fold
                for (let i = 0; i < currentLine; i++) {
                    if (i >= newLines.length) {
                        newLines.push(lines[i]);
                    }
                }
                
                // Add the fold marker
                newLines.push(foldData.foldedText);
                
                // Skip the folded lines
                currentLine = foldData.foldEndLine + 1;
            } else {
                newLines.push(lines[currentLine]);
                currentLine++;
            }
        }
        
        // Update textarea (preserve cursor as much as possible)
        const newContent = newLines.join('\n');
        if (newContent !== this.textarea.value) {
            this.textarea.value = newContent;
            
            // Try to restore cursor position
            const newCursorPos = Math.min(cursorPos, newContent.length);
            this.textarea.selectionStart = newCursorPos;
            this.textarea.selectionEnd = newCursorPos;
            
            // Trigger events
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Check if a line is a fold marker
     */
    isFoldMarker(line) {
        return /^\s*⋯.*⋯\s*$/.test(line);
    }

    /**
     * Handle click on fold marker to unfold
     */
    onTextareaClick(e) {
        if (!this.textarea) return;
        
        const pos = this.textarea.selectionStart;
        const lines = this.textarea.value.split('\n');
        
        // Find which line was clicked
        let charCount = 0;
        let clickedLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for newline
            if (pos >= charCount && pos < charCount + lineLength) {
                clickedLine = i;
                break;
            }
            charCount += lineLength;
        }
        
        if (clickedLine !== -1 && this.isFoldMarker(lines[clickedLine])) {
            // Find and unfold the corresponding section
            for (const [foldLine, foldData] of this.foldedSections.entries()) {
                // This is a simplified check - in reality we'd need better tracking
                if (Math.abs(foldLine - clickedLine) < 5) {
                    this.unfoldRegion(foldLine);
                    this.updateTextarea();
                    break;
                }
            }
        }
    }

    /**
     * Initialize click handler for folded sections
     */
    initClickHandler() {
        if (this.textarea) {
            this.textarea.addEventListener('click', (e) => this.onTextareaClick(e));
        }
    }

    destroy() {
        this.unfoldAll();
        this.textarea = null;
    }
}