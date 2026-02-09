// Oxidian — Sidebar / File Tree Component
const { invoke } = window.__TAURI__.core;

export class Sidebar {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('file-tree');
        this.activePath = null;
        this.openFolders = new Set();
    }

    async refresh() {
        try {
            const files = await invoke('list_files');
            this.render(files);
        } catch (err) {
            console.error('Failed to list files:', err);
        }
    }

    render(nodes, depth = 0) {
        if (depth === 0) {
            this.container.innerHTML = '';
        }

        const fragment = document.createDocumentFragment();

        for (const node of nodes) {
            if (node.is_dir) {
                fragment.appendChild(this.createFolderNode(node, depth));
            } else {
                fragment.appendChild(this.createFileNode(node, depth));
            }
        }

        if (depth === 0) {
            this.container.appendChild(fragment);

            if (nodes.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'tree-item';
                empty.style.color = 'var(--text-muted)';
                empty.style.fontStyle = 'italic';
                empty.innerHTML = '<span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></span><span class="name">Vault is empty</span>';
                this.container.appendChild(empty);
            }
        }

        return fragment;
    }

    createFolderNode(node, depth) {
        const wrapper = document.createElement('div');

        const item = document.createElement('div');
        item.className = 'tree-item';
        item.setAttribute('data-depth', depth);
        item.setAttribute('data-path', node.path);

        const isOpen = this.openFolders.has(node.path);
        const chevronSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
        const folderSvg = isOpen
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';

        item.innerHTML = `<span class="chevron ${isOpen ? 'open' : ''}">${chevronSvg}</span><span class="icon">${folderSvg}</span><span class="name">${this.escapeHtml(node.name)}</span>`;

        const childContainer = document.createElement('div');
        childContainer.className = `tree-folder-children ${isOpen ? 'open' : ''}`;

        for (const child of node.children) {
            if (child.is_dir) {
                childContainer.appendChild(this.createFolderNode(child, depth + 1));
            } else {
                childContainer.appendChild(this.createFileNode(child, depth + 1));
            }
        }

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = this.openFolders.has(node.path);
            if (wasOpen) {
                this.openFolders.delete(node.path);
                childContainer.classList.remove('open');
                item.querySelector('.chevron').classList.remove('open');
            } else {
                this.openFolders.add(node.path);
                childContainer.classList.add('open');
                item.querySelector('.chevron').classList.add('open');
            }
        });

        item.addEventListener('contextmenu', (e) => {
            this.app.contextMenu.showFileMenu(e, node.path, true);
        });

        wrapper.appendChild(item);
        wrapper.appendChild(childContainer);
        return wrapper;
    }

    createFileNode(node, depth) {
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.setAttribute('data-depth', depth);
        item.setAttribute('data-path', node.path);

        if (node.path === this.activePath) {
            item.classList.add('active');
        }

        const icon = this.getFileIconSvg(node.name);
        const displayName = node.name.replace('.md', '');

        // Spacer for chevron alignment
        item.innerHTML = `<span class="chevron" style="visibility:hidden"><svg width="10" height="10" viewBox="0 0 24 24"></svg></span><span class="icon">${icon}</span><span class="name">${this.escapeHtml(displayName)}</span>`;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.openFile(node.path);
        });

        item.addEventListener('contextmenu', (e) => {
            this.app.contextMenu.showFileMenu(e, node.path, false);
        });

        return item;
    }

    getFileIconSvg(name) {
        if (/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) {
            return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
        }
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }

    setActive(path) {
        this.activePath = path;

        this.container.querySelectorAll('.tree-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-path') === path);
        });

        // Auto-expand parent folders
        const parts = path.split('/');
        let current = '';
        let changed = false;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current ? `${current}/${parts[i]}` : parts[i];
            if (!this.openFolders.has(current)) {
                this.openFolders.add(current);
                changed = true;
            }
        }
        if (changed) this.refresh();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
