// Oxidian — Drag & Drop Files
// Drag files into editor → insert as links, images as ![](path), notes as [[note]]

import { invoke } from './tauri-bridge.js';

export class DragDrop {
    constructor(app) {
        this.app = app;
        this.dragOverlay = null;
        this.isDragging = false;
    }

    /**
     * Initialize drag & drop for editor
     */
    initEditor(container) {
        if (!container) return;

        // Create drag overlay
        this.createDragOverlay(container);

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            container.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Show/hide overlay
        container.addEventListener('dragenter', (e) => this.onDragEnter(e, container));
        container.addEventListener('dragover', (e) => this.onDragOver(e));
        container.addEventListener('dragleave', (e) => this.onDragLeave(e, container));
        container.addEventListener('drop', (e) => this.onDrop(e, container));
    }

    createDragOverlay(container) {
        const overlay = document.createElement('div');
        overlay.className = 'drag-drop-overlay hidden';
        overlay.innerHTML = `
            <div class="drag-drop-message">
                <div class="drag-drop-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                </div>
                <div class="drag-drop-text">
                    <div class="drag-drop-primary">Drop files to insert links</div>
                    <div class="drag-drop-secondary">Images → ![](path), Notes → [[note]], Others → [name](path)</div>
                </div>
            </div>
        `;
        
        container.appendChild(overlay);
        this.dragOverlay = overlay;
    }

    onDragEnter(e, container) {
        // Only show overlay for file drags
        if (!this.hasFiles(e)) return;
        
        this.isDragging = true;
        if (this.dragOverlay) {
            this.dragOverlay.classList.remove('hidden');
        }
    }

    onDragOver(e) {
        if (!this.hasFiles(e)) return;
        
        // Visual feedback
        e.dataTransfer.dropEffect = 'copy';
    }

    onDragLeave(e, container) {
        if (!this.hasFiles(e)) return;
        
        // Only hide if we're leaving the container entirely
        const rect = container.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            this.isDragging = false;
            if (this.dragOverlay) {
                this.dragOverlay.classList.add('hidden');
            }
        }
    }

    async onDrop(e, container) {
        if (!this.hasFiles(e)) return;
        
        this.isDragging = false;
        if (this.dragOverlay) {
            this.dragOverlay.classList.add('hidden');
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Find the textarea in the container
        const textarea = container.querySelector('.editor-textarea');
        if (!textarea) {
            console.error('No textarea found in container');
            return;
        }

        // Process files
        for (const file of files) {
            await this.processDroppedFile(file, textarea);
        }
    }

    async processDroppedFile(file, textarea) {
        try {
            const filePath = file.path || file.name; // Tauri provides file.path
            
            let insertText = '';
            
            if (this.isImageFile(file.name)) {
                // Image: ![alt](path)
                const altText = this.getFileBaseName(file.name);
                insertText = `![${altText}](${filePath})`;
            } else if (this.isMarkdownFile(file.name)) {
                // Markdown note: [[note name]]
                const noteName = this.getFileBaseName(file.name);
                insertText = `[[${noteName}]]`;
            } else {
                // Other files: [name](path)
                const fileName = file.name;
                insertText = `[${fileName}](${filePath})`;
            }
            
            // Insert at cursor position
            this.insertAtCursor(textarea, insertText);
            
        } catch (err) {
            console.error('Failed to process dropped file:', err);
            this.app.showErrorToast?.(`Failed to process file: ${file.name}`);
        }
    }

    insertAtCursor(textarea, text) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        
        // Insert text
        const newValue = value.substring(0, start) + text + value.substring(end);
        textarea.value = newValue;
        
        // Update cursor position
        const newPos = start + text.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        
        // Mark dirty and trigger events
        this.app.markDirty();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }

    hasFiles(e) {
        return e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files');
    }

    isImageFile(filename) {
        const ext = this.getFileExtension(filename).toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    }

    isMarkdownFile(filename) {
        const ext = this.getFileExtension(filename).toLowerCase();
        return ext === 'md';
    }

    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.substring(lastDot + 1);
    }

    getFileBaseName(filename) {
        const lastDot = filename.lastIndexOf('.');
        const lastSlash = filename.lastIndexOf('/');
        const start = lastSlash + 1;
        const end = lastDot === -1 ? filename.length : lastDot;
        return filename.substring(start, end);
    }

    /**
     * Initialize drag & drop for file explorer
     */
    initFileExplorer(container) {
        if (!container) return;

        // Allow drop on file tree items
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.file-tree-item');
            if (target && this.isFolder(target)) {
                target.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
        });

        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.file-tree-item');
            if (target) {
                target.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.file-tree-item');
            if (target) {
                target.classList.remove('drag-over');
                if (this.isFolder(target)) {
                    await this.handleFileExplorerDrop(e, target);
                }
            }
        });

        // Make file items draggable
        this.makeFileItemsDraggable(container);
    }

    makeFileItemsDraggable(container) {
        const items = container.querySelectorAll('.file-tree-item[data-path]');
        items.forEach(item => {
            if (!this.isFolder(item)) {
                item.draggable = true;
                item.addEventListener('dragstart', (e) => {
                    const path = item.dataset.path;
                    e.dataTransfer.setData('text/oxidian-file-path', path);
                    e.dataTransfer.effectAllowed = 'move';
                });
            }
        });
    }

    async handleFileExplorerDrop(e, folderItem) {
        const filePath = e.dataTransfer.getData('text/oxidian-file-path');
        if (!filePath) return;

        const targetFolder = folderItem.dataset.path || '';
        const fileName = filePath.split('/').pop();
        const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

        if (filePath === newPath) return; // Same location

        try {
            await invoke('move_file', { 
                oldPath: filePath, 
                newPath: newPath 
            });
            
            // Refresh sidebar to show changes
            await this.app.sidebar?.refresh();
            
            // Update current file path if it was moved
            if (this.app.currentFile === filePath) {
                this.app.currentFile = newPath;
                this.app.updateBreadcrumb(newPath);
            }
            
        } catch (err) {
            console.error('Failed to move file:', err);
            this.app.showErrorToast?.(`Failed to move file: ${err.message}`);
        }
    }

    isFolder(item) {
        return item.classList.contains('folder') || item.classList.contains('file-tree-folder');
    }

    destroy() {
        this.isDragging = false;
        if (this.dragOverlay) {
            this.dragOverlay.remove();
            this.dragOverlay = null;
        }
    }
}