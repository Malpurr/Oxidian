// Oxidian — Complete Obsidian Plugin API Compatibility Shim
// Provides the 'obsidian' module API so real Obsidian community plugins can run in Oxidian.
// This is a comprehensive implementation covering the full obsidian.d.ts API surface.

import { invoke } from './tauri-bridge.js';

// ===== Stub warning tracker =====
const _warnedStubs = new Set();
function _stubWarn(className, methodName) {
    const key = `${className}.${methodName}`;
    if (!_warnedStubs.has(key)) {
        _warnedStubs.add(key);
        console.warn(`[Oxidian] Stub: ${key} not fully implemented`);
    }
}

// ===== API Version =====
const apiVersion = '1.7.2';

// ===== EventRef type =====
// EventRef is just { id, event, callback } — a reference for detaching

// ===== Events =====
class Events {
    constructor() {
        this._events = {};
        this._eventRefId = 0;
    }

    on(event, callback, ctx) {
        if (!this._events[event]) this._events[event] = [];
        const ref = { id: ++this._eventRefId, event, callback, ctx };
        this._events[event].push(ref);
        return ref;
    }

    off(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(r => r.callback !== callback);
    }

    offref(ref) {
        if (ref && ref.event) {
            if (!this._events[ref.event]) return;
            this._events[ref.event] = this._events[ref.event].filter(r => r.id !== ref.id);
        }
    }

    trigger(event, ...args) {
        if (!this._events[event]) return;
        for (const ref of [...this._events[event]]) {
            try {
                ref.callback.apply(ref.ctx || this, args);
            } catch (e) {
                console.error(`Plugin event error [${event}]:`, e);
            }
        }
    }

    tryTrigger(event, args) {
        try {
            if (this._events[event]) {
                for (const ref of [...this._events[event]]) {
                    ref.callback.apply(ref.ctx || this, args || []);
                }
            }
        } catch (e) { /* swallow */ }
    }
}

// ===== Component =====
class Component {
    constructor() {
        this._children = [];
        this._loaded = false;
        this._cleanups = [];
        this._eventRefs = [];
        this._domEvents = [];
        this._intervals = [];
    }

    load() {
        if (this._loaded) return;
        this._loaded = true;
        this.onload();
        for (const child of this._children) {
            child.load();
        }
    }

    onload() {}

    unload() {
        if (!this._loaded) return;
        this._loaded = false;
        this.onunload();
        // Unload children
        for (const child of [...this._children]) {
            child.unload();
        }
        this._children = [];
        // Run cleanups
        for (const cb of this._cleanups) {
            try { cb(); } catch (e) { console.error('Cleanup error:', e); }
        }
        this._cleanups = [];
        // Detach event refs
        for (const ref of this._eventRefs) {
            if (ref && ref.event && ref.id) {
                // If we stored the source Events object, offref it
                if (ref._source) ref._source.offref(ref);
            }
        }
        this._eventRefs = [];
        // Remove DOM events
        for (const de of this._domEvents) {
            try { de.el.removeEventListener(de.type, de.callback, de.options); } catch {}
        }
        this._domEvents = [];
        // Clear intervals
        for (const id of this._intervals) {
            clearInterval(id);
        }
        this._intervals = [];
    }

    onunload() {}

    addChild(component) {
        this._children.push(component);
        if (this._loaded) component.load();
        return component;
    }

    removeChild(component) {
        const idx = this._children.indexOf(component);
        if (idx >= 0) {
            this._children.splice(idx, 1);
            component.unload();
        }
        return component;
    }

    register(cb) {
        this._cleanups.push(cb);
    }

    registerEvent(eventRef) {
        this._eventRefs.push(eventRef);
    }

    registerDomEvent(el, type, callback, options) {
        el.addEventListener(type, callback, options);
        this._domEvents.push({ el, type, callback, options });
    }

    registerInterval(id) {
        this._intervals.push(id);
        return id;
    }
}

// ===== TAbstractFile / TFile / TFolder =====
class TAbstractFile {
    constructor(path) {
        this.vault = null;
        this.path = path || '';
        this.name = path ? path.split('/').pop() : '';
        this.parent = null;
    }
}

class TFile extends TAbstractFile {
    constructor(path, stat) {
        super(path);
        this.basename = this.name.replace(/\.[^.]+$/, '');
        this.extension = (this.name.match(/\.([^.]+)$/) || ['', 'md'])[1];
        this.stat = stat || { ctime: Date.now(), mtime: Date.now(), size: 0 };
    }
}

class TFolder extends TAbstractFile {
    constructor(path) {
        super(path);
        this.children = [];
    }

    isRoot() {
        return !this.path || this.path === '/' || this.path === '';
    }
}

// ===== FileSystemAdapter =====
class FileSystemAdapter {
    constructor(basePath) {
        this._basePath = basePath || '/vault';
    }

    getName() { return 'filesystem'; }
    getBasePath() { return this._basePath; }

    async read(normalizedPath) {
        try {
            return await invoke('read_note', { path: normalizedPath });
        } catch (error) {
            console.error('Failed to read file:', normalizedPath, error);
            throw error;
        }
    }

    async readBinary(normalizedPath) {
        _stubWarn('FileSystemAdapter', 'readBinary');
        const text = await this.read(normalizedPath);
        const enc = new TextEncoder();
        return enc.encode(text).buffer;
    }

    async write(normalizedPath, data, options) {
        try {
            return await invoke('save_note', { path: normalizedPath, content: data });
        } catch (error) {
            console.error('Failed to write file:', normalizedPath, error);
            throw error;
        }
    }

    async writeBinary(normalizedPath, data, options) {
        _stubWarn('FileSystemAdapter', 'writeBinary');
        const dec = new TextDecoder();
        return this.write(normalizedPath, dec.decode(data), options);
    }

    async append(normalizedPath, data, options) {
        const existing = await this.read(normalizedPath).catch(() => '');
        return this.write(normalizedPath, existing + data, options);
    }

    async process(normalizedPath, fn, options) {
        const data = await this.read(normalizedPath);
        const newData = fn(data);
        await this.write(normalizedPath, newData, options);
        return newData;
    }

    async exists(normalizedPath, sensitive) {
        try {
            // Try resolve_link first — lightweight check via Rust
            const targets = await invoke('resolve_link', { link: normalizedPath });
            return targets && targets.length > 0;
        } catch {
            // Fallback: attempt read
            try {
                await invoke('read_note', { path: normalizedPath });
                return true;
            } catch {
                return false;
            }
        }
    }

    async stat(normalizedPath) {
        try {
            await invoke('read_note', { path: normalizedPath });
            return { type: 'file', ctime: Date.now(), mtime: Date.now(), size: 0 };
        } catch {
            return null;
        }
    }

    async list(normalizedPath) {
        try {
            const tree = await invoke('list_files');
            const files = [];
            const folders = [];
            const walk = (nodes) => {
                for (const node of nodes) {
                    if (node.is_dir) { folders.push(node.path); walk(node.children || []); }
                    else { files.push(node.path); }
                }
            };
            walk(tree);
            return { files, folders };
        } catch {
            return { files: [], folders: [] };
        }
    }

    async listAll(normalizedPath) {
        return this.list(normalizedPath);
    }

    async mkdir(normalizedPath) {
        _stubWarn('FileSystemAdapter', 'mkdir');
    }

    async trashSystem(normalizedPath) {
        _stubWarn('FileSystemAdapter', 'trashSystem');
        return false;
    }

    async trashLocal(normalizedPath) {
        _stubWarn('FileSystemAdapter', 'trashLocal');
    }

    async rmdir(normalizedPath, recursive) {
        _stubWarn('FileSystemAdapter', 'rmdir');
    }

    async remove(normalizedPath) {
        try {
            return await invoke('delete_note', { path: normalizedPath });
        } catch (error) {
            console.error('Failed to delete file:', normalizedPath, error);
            throw error;
        }
    }

    async rename(normalizedPath, normalizedNewPath) {
        try {
            return await invoke('rename_file', { oldPath: normalizedPath, newPath: normalizedNewPath });
        } catch (error) {
            console.error('Failed to rename file:', normalizedPath, 'to', normalizedNewPath, error);
            throw error;
        }
    }

    async copy(normalizedPath, normalizedNewPath) {
        const data = await this.read(normalizedPath);
        await this.write(normalizedNewPath, data);
    }

    getFullPath(normalizedPath) {
        return this._basePath + '/' + normalizedPath;
    }

    getResourcePath(normalizedPath) {
        return this.getFullPath(normalizedPath);
    }
}

// ===== Vault =====
class Vault extends Events {
    constructor(app) {
        super();
        this._app = app;
        this._fileCache = new Map();
        this._folderCache = new Map();
        this._contentCache = new Map();
        this._vaultName = null;
        this._config = {};
        this.adapter = new FileSystemAdapter();
        this.configDir = '.obsidian';

        invoke('get_vault_path').then(path => {
            if (path) {
                this.adapter._basePath = path;
                this._vaultName = path.split('/').pop() || 'Oxidian Vault';
            }
        }).catch(() => {});
    }

    getName() {
        if (this._vaultName) return this._vaultName;
        try {
            const basePath = this.adapter.getBasePath();
            if (basePath) {
                this._vaultName = basePath.split('/').pop() || 'Oxidian Vault';
                return this._vaultName;
            }
        } catch {}
        return 'Oxidian Vault';
    }

    getRoot() {
        const root = new TFolder('');
        root.vault = this;
        this._fileCache.forEach((file, path) => {
            if (!path.includes('/')) root.children.push(file);
        });
        this._folderCache.forEach((folder, path) => {
            if (!path.includes('/')) root.children.push(folder);
        });
        return root;
    }

    getAbstractFileByPath(path) {
        if (!path || path === '' || path === '/') return this.getRoot();
        if (this._fileCache.has(path)) return this._fileCache.get(path);
        if (this._folderCache.has(path)) return this._folderCache.get(path);
        return null;
    }

    getFileByPath(path) {
        const f = this._fileCache.get(path);
        return f instanceof TFile ? f : null;
    }

    getFolderByPath(path) {
        if (!path || path === '' || path === '/') return this.getRoot();
        const f = this._folderCache.get(path);
        return f instanceof TFolder ? f : null;
    }

    getMarkdownFiles() {
        const files = [];
        this._fileCache.forEach(file => {
            if (file.extension === 'md') files.push(file);
        });
        return files;
    }

    getFiles() {
        return Array.from(this._fileCache.values());
    }

    getAllLoadedFiles() {
        return [...this._fileCache.values(), ...this._folderCache.values()];
    }

    async read(file) {
        const path = typeof file === 'string' ? file : file.path;
        try {
            const content = await invoke('read_note', { path });
            this._contentCache.set(path, content);
            return content;
        } catch (e) {
            throw new Error(`Failed to read ${path}: ${e}`);
        }
    }

    async cachedRead(file) {
        const path = typeof file === 'string' ? file : file.path;
        if (this._contentCache.has(path)) return this._contentCache.get(path);
        return this.read(file);
    }

    async create(path, data = '', options) {
        await invoke('save_note', { path, content: data });
        const file = new TFile(path);
        file.vault = this;
        this._fileCache.set(path, file);
        this._contentCache.set(path, data);
        this.trigger('create', file);
        return file;
    }

    async createFolder(path) {
        _stubWarn('Vault', 'createFolder');
        const folder = new TFolder(path);
        folder.vault = this;
        this._folderCache.set(path, folder);
        this.trigger('create', folder);
        return folder;
    }

    async modify(file, data, options) {
        const path = typeof file === 'string' ? file : file.path;
        await invoke('save_note', { path, content: data });
        this._contentCache.set(path, data);
        const f = this._fileCache.get(path) || file;
        if (f && f.stat) f.stat.mtime = Date.now();
        this.trigger('modify', f);
    }

    async append(file, data, options) {
        const path = typeof file === 'string' ? file : file.path;
        const existing = await this.cachedRead(typeof file === 'string' ? { path } : file).catch(() => '');
        await this.modify(file, existing + data, options);
    }

    async process(file, fn, options) {
        const data = await this.read(file);
        const newData = fn(data);
        await this.modify(file, newData, options);
        return newData;
    }

    async rename(file, newPath) {
        const oldPath = typeof file === 'string' ? file : file.path;
        await invoke('rename_file', { oldPath, newPath });
        const content = this._contentCache.get(oldPath);
        this._fileCache.delete(oldPath);
        this._contentCache.delete(oldPath);
        const newFile = new TFile(newPath);
        newFile.vault = this;
        this._fileCache.set(newPath, newFile);
        if (content !== undefined) this._contentCache.set(newPath, content);
        this.trigger('rename', newFile, oldPath);
        return newFile;
    }

    async copy(file, newPath) {
        const data = await this.read(file);
        return this.create(newPath, data);
    }

    async delete(file, force) {
        const path = typeof file === 'string' ? file : file.path;
        await invoke('delete_note', { path });
        this._fileCache.delete(path);
        this._contentCache.delete(path);
        this.trigger('delete', file);
    }

    async trash(file, system) {
        return this.delete(file, true);
    }

    getConfig(key) {
        return this._config[key];
    }

    setConfig(key, value) {
        this._config[key] = value;
    }

    static recurseChildren(root, cb) {
        cb(root);
        if (root.children) {
            for (const child of root.children) {
                Vault.recurseChildren(child, cb);
            }
        }
    }

    async _refreshFileCache() {
        try {
            const tree = await invoke('list_files');
            this._fileCache.clear();
            this._folderCache.clear();
            const walk = (nodes, parentPath) => {
                for (const node of nodes) {
                    if (node.is_dir) {
                        const folder = new TFolder(node.path);
                        folder.vault = this;
                        this._folderCache.set(node.path, folder);
                        walk(node.children || [], node.path);
                    } else {
                        const file = new TFile(node.path);
                        file.vault = this;
                        this._fileCache.set(node.path, file);
                    }
                }
            };
            walk(tree, '');
        } catch (e) {
            console.error('Failed to refresh file cache:', e);
        }
    }
}

// ===== Scope =====
class Scope {
    constructor(parent) {
        this.parent = parent || null;
        this.keys = [];
    }

    register(modifiers, key, func) {
        const handler = { modifiers: modifiers || [], key, func };
        this.keys.push(handler);
        return handler;
    }

    unregister(handler) {
        const idx = this.keys.indexOf(handler);
        if (idx >= 0) this.keys.splice(idx, 1);
    }
}

// ===== Keymap =====
class Keymap {
    constructor() {
        this._scopes = [];
    }

    static isModEvent(evt) {
        return evt ? (evt.ctrlKey || evt.metaKey) : false;
    }

    static isModifier(evt, modifier) {
        if (!evt) return false;
        switch (modifier) {
            case 'Mod': return evt.ctrlKey || evt.metaKey;
            case 'Ctrl': return evt.ctrlKey;
            case 'Meta': return evt.metaKey;
            case 'Shift': return evt.shiftKey;
            case 'Alt': return evt.altKey;
            default: return false;
        }
    }

    pushScope(scope) {
        this._scopes.push(scope);
    }

    popScope(scope) {
        const idx = this._scopes.indexOf(scope);
        if (idx >= 0) this._scopes.splice(idx, 1);
    }
}

// ===== Editor =====
class Editor {
    constructor() {
        this._lines = [''];
        this._cursor = { line: 0, ch: 0 };
        this._selections = [];
        this.cm = null; // CodeMirror reference stub
    }

    getValue() { return this._lines.join('\n'); }
    setValue(value) { this._lines = (value || '').split('\n'); }

    getLine(n) { return this._lines[n] || ''; }
    setLine(n, text) {
        while (this._lines.length <= n) this._lines.push('');
        this._lines[n] = text;
    }

    lineCount() { return this._lines.length; }
    lastLine() { return this._lines.length - 1; }

    getSelection() {
        if (this._selections.length === 0) return '';
        const sel = this._selections[0];
        return this.getRange(sel.anchor, sel.head);
    }

    getRange(from, to) {
        if (!from || !to) return '';
        if (from.line === to.line) {
            return (this._lines[from.line] || '').substring(from.ch, to.ch);
        }
        const lines = [];
        lines.push((this._lines[from.line] || '').substring(from.ch));
        for (let i = from.line + 1; i < to.line; i++) {
            lines.push(this._lines[i] || '');
        }
        lines.push((this._lines[to.line] || '').substring(0, to.ch));
        return lines.join('\n');
    }

    replaceSelection(replacement) {
        if (this._selections.length === 0) return;
        const sel = this._selections[0];
        const anchor = sel.anchor;
        const head = sel.head;
        // Normalize from/to
        let from, to;
        if (anchor.line < head.line || (anchor.line === head.line && anchor.ch <= head.ch)) {
            from = anchor; to = head;
        } else {
            from = head; to = anchor;
        }
        this.replaceRange(replacement, from, to);
        // Move cursor to end of replacement
        const newLines = replacement.split('\n');
        let endLine, endCh;
        if (newLines.length === 1) {
            endLine = from.line;
            endCh = from.ch + newLines[0].length;
        } else {
            endLine = from.line + newLines.length - 1;
            endCh = newLines[newLines.length - 1].length;
        }
        const endPos = { line: endLine, ch: endCh };
        this._cursor = endPos;
        this._selections = [];
    }

    replaceRange(replacement, from, to) {
        if (!from) return;
        if (!to) to = from;
        const repLines = (replacement || '').split('\n');
        const before = (this._lines[from.line] || '').substring(0, from.ch);
        const after = (this._lines[to.line] || '').substring(to.ch);

        if (repLines.length === 1) {
            this._lines[from.line] = before + repLines[0] + after;
            // Remove lines between from and to
            if (to.line > from.line) {
                this._lines.splice(from.line + 1, to.line - from.line);
            }
        } else {
            const newLines = [];
            newLines.push(before + repLines[0]);
            for (let i = 1; i < repLines.length - 1; i++) {
                newLines.push(repLines[i]);
            }
            newLines.push(repLines[repLines.length - 1] + after);
            this._lines.splice(from.line, to.line - from.line + 1, ...newLines);
        }
    }

    getCursor(string) {
        return { ...this._cursor };
    }

    setCursor(posOrLine, ch) {
        if (typeof posOrLine === 'number') {
            this._cursor = { line: posOrLine, ch: ch || 0 };
        } else {
            this._cursor = { line: posOrLine.line, ch: posOrLine.ch };
        }
    }

    setSelection(anchor, head) {
        this._selections = [{ anchor, head: head || anchor }];
    }

    listSelections() {
        return this._selections.length > 0 ? this._selections : [{ anchor: this._cursor, head: this._cursor }];
    }

    somethingSelected() {
        if (this._selections.length === 0) return false;
        const s = this._selections[0];
        return s.anchor.line !== s.head.line || s.anchor.ch !== s.head.ch;
    }

    hasFocus() { return false; }
    focus() { _stubWarn('Editor', 'focus'); }
    blur() { _stubWarn('Editor', 'blur'); }

    getScrollInfo() { return { top: 0, left: 0, clientHeight: 0, clientWidth: 0 }; }
    scrollTo(x, y) { _stubWarn('Editor', 'scrollTo'); }
    scrollIntoView(range, margin) { _stubWarn('Editor', 'scrollIntoView'); }

    undo() { _stubWarn('Editor', 'undo'); }
    redo() { _stubWarn('Editor', 'redo'); }

    exec(command) { _stubWarn('Editor', 'exec'); }

    transaction(fn) {
        if (typeof fn === 'function') fn();
    }

    posToOffset(pos) {
        let offset = 0;
        for (let i = 0; i < pos.line && i < this._lines.length; i++) {
            offset += this._lines[i].length + 1;
        }
        offset += pos.ch;
        return offset;
    }

    offsetToPos(offset) {
        let remaining = offset;
        for (let i = 0; i < this._lines.length; i++) {
            if (remaining <= this._lines[i].length) {
                return { line: i, ch: remaining };
            }
            remaining -= this._lines[i].length + 1;
        }
        return { line: this._lines.length - 1, ch: this._lines[this._lines.length - 1].length };
    }

    getDoc() { return this; }

    wordAt(pos) {
        _stubWarn('Editor', 'wordAt');
        return { from: pos, to: pos };
    }
}

// ===== WorkspaceItem / WorkspaceSplit / WorkspaceTabs / WorkspaceRoot / WorkspaceContainer =====
class WorkspaceItem extends Events {
    constructor() {
        super();
    }
    getRoot() { return this; }
    getContainer() { return this; }
}

class WorkspaceSplit extends WorkspaceItem {
    constructor() {
        super();
        this.children = [];
    }
}

class WorkspaceTabs extends WorkspaceItem {
    constructor() {
        super();
        this.children = [];
    }
}

class WorkspaceRoot extends WorkspaceItem {
    constructor() {
        super();
    }
}

class WorkspaceContainer extends WorkspaceItem {
    constructor() {
        super();
    }
}

class WorkspaceWindow extends WorkspaceContainer {
    constructor() {
        super();
        this.win = null;
        this.doc = null;
    }
}

class WorkspaceMobileDrawer extends WorkspaceItem {
    constructor() { super(); }
}

// ===== WorkspaceLeaf =====
class WorkspaceLeaf extends WorkspaceItem {
    constructor(workspace) {
        super();
        this._workspace = workspace;
        this.view = null;
        this.pinned = false;
        this.group = null;
        this.tabHeaderEl = document.createElement('div');
        this.tabHeaderInnerTitleEl = document.createElement('span');
        this.tabHeaderEl.appendChild(this.tabHeaderInnerTitleEl);
    }

    getViewState() {
        return this.view ? { type: this.view.getViewType() } : { type: 'empty' };
    }

    async setViewState(state) {
        _stubWarn('WorkspaceLeaf', 'setViewState');
    }

    async open(view) {
        this.view = view;
    }

    async openFile(file, openState) {
        if (this._workspace && this._workspace._app) {
            // Set the active file
            this._workspace._activeFile = file;
            this._workspace.trigger('file-open', file);
        }
    }

    getDisplayText() {
        return this.view?.getDisplayText?.() || '';
    }

    detach() {
        if (this._workspace) {
            this._workspace._leaves = this._workspace._leaves.filter(l => l !== this);
        }
    }

    setPinned(pinned) {
        this.pinned = pinned;
        this.trigger('pinned-change', pinned);
    }

    setGroup(group) {
        this.group = group;
        this.trigger('group-change', group);
    }

    togglePinned() {
        this.setPinned(!this.pinned);
    }
}

// ===== Workspace =====
class Workspace extends Events {
    constructor(app) {
        super();
        this._app = app;
        this._activeFile = null;
        this._leaves = [];
        this._layoutReady = true;
        this.activeLeaf = null;
        this.activeEditor = null;
        this.containerEl = document.body;
        this.leftSplit = new WorkspaceSplit();
        this.rightSplit = new WorkspaceSplit();
        this.leftRibbon = { containerEl: document.createElement('div') };
        this.rightRibbon = { containerEl: document.createElement('div') };
        this.rootSplit = new WorkspaceSplit();
    }

    getActiveFile() {
        return this._activeFile;
    }

    setActiveFile(file) {
        this._activeFile = file;
        this.trigger('file-open', file);
        this.trigger('active-leaf-change', this.activeLeaf || this.getLeaf());
    }

    getLeaf(newLeaf) {
        if (newLeaf === true || newLeaf === 'tab' || newLeaf === 'split' || newLeaf === 'window') {
            const leaf = new WorkspaceLeaf(this);
            this._leaves.push(leaf);
            return leaf;
        }
        if (this._leaves.length === 0) {
            const leaf = new WorkspaceLeaf(this);
            this._leaves.push(leaf);
        }
        return this._leaves[this._leaves.length - 1];
    }

    getMostRecentLeaf(root) {
        return this._leaves.length > 0 ? this._leaves[this._leaves.length - 1] : null;
    }

    getLeftLeaf(split) {
        const leaf = new WorkspaceLeaf(this);
        this._leaves.push(leaf);
        return leaf;
    }

    getRightLeaf(split) {
        const leaf = new WorkspaceLeaf(this);
        this._leaves.push(leaf);
        return leaf;
    }

    getLeavesOfType(type) {
        return this._leaves.filter(l => l.view?.getViewType?.() === type);
    }

    getActiveViewOfType(type) {
        const leaf = this.activeLeaf || (this._leaves.length > 0 ? this._leaves[0] : null);
        if (leaf?.view instanceof type) return leaf.view;
        // Also check all leaves
        for (const l of this._leaves) {
            if (l.view instanceof type) return l.view;
        }
        return null;
    }

    revealLeaf(leaf) {
        this.activeLeaf = leaf;
        this.trigger('active-leaf-change', leaf);
    }

    detachLeavesOfType(type) {
        this._leaves = this._leaves.filter(l => l.view?.getViewType?.() !== type);
    }

    setActiveLeaf(leaf, params) {
        this.activeLeaf = leaf;
        this.trigger('active-leaf-change', leaf);
    }

    getUnpinnedLeaf(type) {
        for (const leaf of this._leaves) {
            if (!leaf.pinned && (!type || leaf.view?.getViewType?.() === type)) return leaf;
        }
        return this.getLeaf();
    }

    iterateRootLeaves(callback) {
        for (const leaf of this._leaves) {
            callback(leaf);
        }
    }

    iterateAllLeaves(callback) {
        for (const leaf of this._leaves) {
            callback(leaf);
        }
    }

    onLayoutReady(callback) {
        if (this._layoutReady) {
            setTimeout(callback, 0);
        } else {
            this.on('layout-ready', callback);
        }
    }

    requestSaveLayout() {
        _stubWarn('Workspace', 'requestSaveLayout');
    }

    changeLayout(layout) {
        _stubWarn('Workspace', 'changeLayout');
        return Promise.resolve();
    }

    getLayout() {
        _stubWarn('Workspace', 'getLayout');
        return {};
    }

    createLeafInParent(parent, index) {
        const leaf = new WorkspaceLeaf(this);
        this._leaves.push(leaf);
        return leaf;
    }

    splitActiveLeaf(direction) {
        return this.getLeaf(true);
    }

    async openLinkText(linktext, sourcePath, newLeaf, openViewState) {
        _stubWarn('Workspace', 'openLinkText');
    }

    openPopoutLeaf(data) {
        return this.getLeaf(true);
    }

    updateOptions() {
        _stubWarn('Workspace', 'updateOptions');
    }
}

// ===== View =====
class View extends Component {
    constructor(leaf) {
        super();
        this.app = leaf?._workspace?._app || (typeof window !== 'undefined' ? window.app : null);
        this.leaf = leaf;
        this.containerEl = document.createElement('div');
        this.icon = '';
        this.navigation = true;
    }

    getViewType() { return ''; }
    getDisplayText() { return ''; }
    getIcon() { return this.icon; }

    getState() { return {}; }
    setState(state, result) { return Promise.resolve(); }

    onOpen() { return Promise.resolve(); }
    onClose() { return Promise.resolve(); }
    onResize() {}
}

// ===== ItemView =====
class ItemView extends View {
    constructor(leaf) {
        super(leaf);
        this.contentEl = document.createElement('div');
        this.containerEl.appendChild(this.contentEl);
    }

    addAction(icon, title, callback) {
        const btn = document.createElement('button');
        btn.className = 'view-action';
        btn.title = title;
        setIcon(btn, icon);
        btn.addEventListener('click', callback);
        return btn;
    }

    onHeaderMenu(menu) {}
}

// ===== EditableFileView / FileView / TextFileView =====
class EditableFileView extends ItemView {
    constructor(leaf) {
        super(leaf);
        this.file = null;
    }
    canAcceptExtension(extension) { return false; }
}

class FileView extends EditableFileView {
    constructor(leaf) {
        super(leaf);
        this.allowNoFile = false;
    }
    getDisplayText() { return this.file?.basename || ''; }
}

class TextFileView extends EditableFileView {
    constructor(leaf) {
        super(leaf);
        this.data = '';
        this.requestSave = debounce(() => this.save(), 2000, true);
    }

    getViewData() { return this.data; }
    setViewData(data, clear) { this.data = data; }
    clear() { this.data = ''; }

    async save() {
        if (this.file && this.app?.vault) {
            await this.app.vault.modify(this.file, this.getViewData());
        }
    }
}

// ===== MarkdownEditView / MarkdownPreviewView =====
class MarkdownEditView {
    constructor() {
        this.editor = new Editor();
    }
    clear() { this.editor.setValue(''); }
    get() { return this.editor.getValue(); }
    set(data) { this.editor.setValue(data); }
}

class MarkdownPreviewView {
    constructor() {
        this._content = '';
        this._scroll = 0;
        this.containerEl = document.createElement('div');
    }
    clear() { this._content = ''; this.containerEl.innerHTML = ''; }
    get() { return this._content; }
    set(data) {
        this._content = data;
        // Render markdown would happen here
    }
    applyScroll(scroll) { this._scroll = scroll; }
    getScroll() { return this._scroll; }
    rerender(full) { _stubWarn('MarkdownPreviewView', 'rerender'); }
}

// ===== MarkdownView =====
class MarkdownView extends TextFileView {
    constructor(leaf) {
        super(leaf);
        this.editor = new Editor();
        this.currentMode = new MarkdownEditView();
        this.previewMode = new MarkdownPreviewView();
    }

    getViewType() { return 'markdown'; }

    getDisplayText() {
        return this.file?.basename || '';
    }

    getViewData() {
        return this.editor.getValue();
    }

    setViewData(data, clear) {
        this.data = data;
        this.editor.setValue(data);
    }

    clear() {
        this.data = '';
        this.editor.setValue('');
    }

    getMode() {
        return 'source'; // 'source' | 'preview'
    }

    showBacklinks() {
        _stubWarn('MarkdownView', 'showBacklinks');
    }
}

// ===== MarkdownFileInfo interface =====
// This is just a duck type; MarkdownView satisfies it.

// ===== MetadataCache =====
class MetadataCache extends Events {
    constructor(app) {
        super();
        this._app = app;
        this._cache = new Map();
        this.resolvedLinks = {};
        this.unresolvedLinks = {};
    }

    getFileCache(file) {
        const path = typeof file === 'string' ? file : file.path;
        return this._cache.get(path) || null;
    }

    getCache(path) {
        return this._cache.get(path) || null;
    }

    getFirstLinkpathDest(linkpath, sourcePath) {
        if (!this._app?.vault) return null;
        let dest = this._app.vault.getAbstractFileByPath(linkpath);
        if (dest instanceof TFile) return dest;
        dest = this._app.vault.getAbstractFileByPath(linkpath + '.md');
        if (dest instanceof TFile) return dest;
        // Search all files
        for (const [p, f] of this._app.vault._fileCache) {
            if (f.basename === linkpath || f.name === linkpath) return f;
        }
        return null;
    }

    /**
     * Get backlinks for a note via Rust backend.
     * Returns a Promise<string[]> of paths linking to the given note.
     */
    async getBacklinksForFile(file) {
        const path = typeof file === 'string' ? file : file.path;
        try {
            return await invoke('get_backlinks', { notePath: path });
        } catch (e) {
            console.warn('[MetadataCache] Failed to get backlinks via Rust:', e);
            return [];
        }
    }

    /**
     * Parse frontmatter for a note via Rust backend.
     * Returns a Promise with parsed frontmatter object.
     */
    async getFrontmatter(file) {
        const path = typeof file === 'string' ? file : file.path;
        try {
            const content = await this._app.vault.read(file);
            const result = await invoke('parse_frontmatter', { content });
            return result || {};
        } catch (e) {
            console.warn('[MetadataCache] Failed to parse frontmatter via Rust:', e);
            return {};
        }
    }

    /**
     * Resolve a wikilink via Rust backend.
     * Returns a Promise<LinkTarget[]>.
     */
    async resolveLink(link) {
        try {
            return await invoke('resolve_link', { link });
        } catch (e) {
            console.warn('[MetadataCache] Failed to resolve link via Rust:', e);
            return [];
        }
    }

    _updateCache(path, metadata) {
        this._cache.set(path, metadata);
        this.trigger('changed', this._app?.vault?.getAbstractFileByPath(path), '', metadata);
    }

    _deleteCache(path) {
        this._cache.delete(path);
        this.trigger('deleted', this._app?.vault?.getAbstractFileByPath(path));
    }
}

// ===== FileManager =====
class FileManager {
    constructor(app) {
        this._app = app;
    }

    getNewFileParent(sourcePath) {
        _stubWarn('FileManager', 'getNewFileParent');
        return this._app?.vault?.getRoot() || new TFolder('');
    }

    async renameFile(file, newPath) {
        if (this._app?.vault) {
            return this._app.vault.rename(file, newPath);
        }
    }

    generateMarkdownLink(file, sourcePath, subpath, alias) {
        const path = file.path || file;
        const display = alias || file.basename || path;
        if (subpath) return `[[${path}${subpath}|${display}]]`;
        return `[[${path}|${display}]]`;
    }

    async createNewMarkdownFile(parent, name, content) {
        const path = parent && parent.path ? `${parent.path}/${name}.md` : `${name}.md`;
        if (this._app?.vault) {
            return this._app.vault.create(path, content || '');
        }
    }

    async processFrontMatter(file, fn) {
        if (!this._app?.vault) return;
        const content = await this._app.vault.read(file);

        // Use Rust backend for frontmatter parsing when available
        try {
            const parsed = await invoke('parse_frontmatter', { content });
            let frontmatter = (parsed && parsed.fields) ? parsed.fields : {};
            fn(frontmatter);
            // Use Rust backend to reconstruct the document
            const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
            const result = await invoke('stringify_frontmatter', { fm: frontmatter, body });
            await this._app.vault.modify(file, result);
        } catch (e) {
            // Fallback to JS-based parsing if Rust commands unavailable
            const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
            let frontmatter = {};
            if (fmMatch) {
                try { frontmatter = parseYaml(fmMatch[1]) || {}; } catch {}
            }
            fn(frontmatter);
            const newFm = stringifyYaml(frontmatter);
            const body = fmMatch ? content.slice(fmMatch[0].length) : content;
            const newContent = `---\n${newFm}---${body}`;
            await this._app.vault.modify(file, newContent);
        }
    }
}

// ===== App =====
class App {
    constructor() {
        this.keymap = new Keymap();
        this.scope = new Scope();
        this.vault = new Vault(this);
        this.workspace = new Workspace(this);
        this.metadataCache = new MetadataCache(this);
        this.fileManager = new FileManager(this);
        this.lastEvent = null;
        this.plugins = {
            enabledPlugins: new Set(),
            plugins: {},
            getPlugin(id) { return this.plugins[id] || null; },
            manifests: {},
        };
        this.commands = {
            _commands: {},
            addCommand(cmd) { this._commands[cmd.id] = cmd; },
            removeCommand(id) { delete this._commands[id]; },
            listCommands() { return Object.values(this._commands); },
            executeCommandById(id) {
                const cmd = this._commands[id];
                if (cmd?.callback) cmd.callback();
                else if (cmd?.checkCallback) cmd.checkCallback(false);
            }
        };
        this.setting = {
            open() {},
            openTabById(id) {}
        };
    }

    loadLocalStorage(key) {
        try { return localStorage.getItem(`oxidian-vault-${key}`); } catch { return null; }
    }

    saveLocalStorage(key, data) {
        try {
            if (data === null) localStorage.removeItem(`oxidian-vault-${key}`);
            else localStorage.setItem(`oxidian-vault-${key}`, typeof data === 'string' ? data : JSON.stringify(data));
        } catch {}
    }

    isDarkMode() {
        return document.body.classList.contains('theme-dark') ||
               window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
    }
}

// ===== UI Components: BaseComponent / ValueComponent =====
class BaseComponent {
    constructor() {
        this.disabled = false;
    }

    then(cb) {
        cb(this);
        return this;
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        return this;
    }
}

class ValueComponent extends BaseComponent {
    constructor() {
        super();
        this._value = undefined;
        this._changeCallbacks = [];
    }

    getValue() { return this._value; }
    setValue(value) { this._value = value; return this; }

    onChange(callback) {
        this._changeCallbacks.push(callback);
        return this;
    }

    _notifyChange() {
        for (const cb of this._changeCallbacks) {
            try { cb(this._value); } catch (e) { console.error(e); }
        }
    }
}

// ===== TextComponent =====
class TextComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'obsidian-text-input';
        if (containerEl) containerEl.appendChild(this.inputEl);
        this.inputEl.addEventListener('input', () => {
            this._value = this.inputEl.value;
            this._notifyChange();
        });
    }

    getValue() { return this.inputEl.value; }
    setValue(value) { this.inputEl.value = value || ''; this._value = value; return this; }
    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    setDisabled(disabled) { this.inputEl.disabled = disabled; this.disabled = disabled; return this; }
    onChanged() { this._notifyChange(); }
}

// ===== TextAreaComponent =====
class TextAreaComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.inputEl = document.createElement('textarea');
        this.inputEl.className = 'obsidian-textarea-input';
        if (containerEl) containerEl.appendChild(this.inputEl);
        this.inputEl.addEventListener('input', () => {
            this._value = this.inputEl.value;
            this._notifyChange();
        });
    }

    getValue() { return this.inputEl.value; }
    setValue(value) { this.inputEl.value = value || ''; this._value = value; return this; }
    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    setDisabled(disabled) { this.inputEl.disabled = disabled; this.disabled = disabled; return this; }
    onChanged() { this._notifyChange(); }
}

// ===== AbstractTextComponent =====
class AbstractTextComponent extends ValueComponent {
    constructor(inputEl) {
        super();
        this.inputEl = inputEl;
        this.inputEl.addEventListener('input', () => {
            this._value = this.inputEl.value;
            this._notifyChange();
        });
    }
    getValue() { return this.inputEl.value; }
    setValue(value) { this.inputEl.value = value || ''; this._value = value; return this; }
    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    setDisabled(disabled) { this.inputEl.disabled = disabled; this.disabled = disabled; return this; }
    onChanged() { this._notifyChange(); }
}

// ===== ToggleComponent =====
class ToggleComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.toggleEl = document.createElement('label');
        this.toggleEl.className = 'obsidian-toggle checkbox-container';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.tabIndex = 0;
        this.toggleEl.appendChild(input);
        this._input = input;
        if (containerEl) containerEl.appendChild(this.toggleEl);
        input.addEventListener('change', () => {
            this._value = input.checked;
            this.toggleEl.classList.toggle('is-enabled', input.checked);
            this._notifyChange();
        });
    }

    getValue() { return this._input.checked; }
    setValue(value) {
        this._input.checked = !!value;
        this._value = !!value;
        this.toggleEl.classList.toggle('is-enabled', !!value);
        return this;
    }
    setDisabled(disabled) { this._input.disabled = disabled; this.disabled = disabled; return this; }
    setTooltip(tooltip) { this.toggleEl.title = tooltip; return this; }
    onClick() { return this; }
}

// ===== DropdownComponent =====
class DropdownComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.selectEl = document.createElement('select');
        this.selectEl.className = 'dropdown';
        if (containerEl) containerEl.appendChild(this.selectEl);
        this.selectEl.addEventListener('change', () => {
            this._value = this.selectEl.value;
            this._notifyChange();
        });
    }

    addOption(value, display) {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = display;
        this.selectEl.appendChild(o);
        return this;
    }

    addOptions(options) {
        for (const [k, v] of Object.entries(options)) {
            this.addOption(k, v);
        }
        return this;
    }

    getValue() { return this.selectEl.value; }
    setValue(value) { this.selectEl.value = value; this._value = value; return this; }
    setDisabled(disabled) { this.selectEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== SliderComponent =====
class SliderComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.sliderEl = document.createElement('input');
        this.sliderEl.type = 'range';
        this.sliderEl.className = 'slider';
        if (containerEl) containerEl.appendChild(this.sliderEl);
        this.sliderEl.addEventListener('input', () => {
            this._value = parseFloat(this.sliderEl.value);
            this._notifyChange();
        });
    }

    getValue() { return parseFloat(this.sliderEl.value); }
    setValue(value) { this.sliderEl.value = String(value); this._value = value; return this; }
    setLimits(min, max, step) {
        this.sliderEl.min = String(min);
        this.sliderEl.max = String(max);
        this.sliderEl.step = String(step);
        return this;
    }
    setDynamicTooltip() { return this; }
    showTooltip() { return this; }
    setDisabled(disabled) { this.sliderEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== ButtonComponent =====
class ButtonComponent extends BaseComponent {
    constructor(containerEl) {
        super();
        this.buttonEl = document.createElement('button');
        this.buttonEl.className = 'obsidian-button';
        if (containerEl) containerEl.appendChild(this.buttonEl);
    }

    setButtonText(name) { this.buttonEl.textContent = name; return this; }
    setIcon(icon) { setIcon(this.buttonEl, icon); return this; }
    setCta() { this.buttonEl.classList.add('mod-cta'); return this; }
    removeCta() { this.buttonEl.classList.remove('mod-cta'); return this; }
    setWarning() { this.buttonEl.classList.add('mod-warning'); return this; }
    setTooltip(tooltip, options) { this.buttonEl.title = tooltip; return this; }
    setClass(cls) { this.buttonEl.className = cls; return this; }
    setDisabled(disabled) { this.buttonEl.disabled = disabled; this.disabled = disabled; return this; }
    onClick(callback) { this.buttonEl.addEventListener('click', callback); return this; }
}

// ===== ColorComponent =====
class ColorComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this._inputEl = document.createElement('input');
        this._inputEl.type = 'color';
        this._inputEl.className = 'obsidian-color-picker';
        if (containerEl) containerEl.appendChild(this._inputEl);
        this._inputEl.addEventListener('input', () => {
            this._value = this._inputEl.value;
            this._notifyChange();
        });
    }

    getValue() { return this._inputEl.value; }
    setValue(value) { this._inputEl.value = value || '#000000'; this._value = value; return this; }
    getValueRgb() {
        const hex = this.getValue().replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    }
    getValueHsl() {
        const rgb = this.getValueRgb();
        const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    setValueRgb(rgb) {
        const hex = '#' + [rgb.r, rgb.g, rgb.b].map(c => c.toString(16).padStart(2, '0')).join('');
        return this.setValue(hex);
    }
    setValueHsl(hsl) {
        _stubWarn('ColorComponent', 'setValueHsl');
        return this;
    }
    setDisabled(disabled) { this._inputEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== SearchComponent =====
class SearchComponent extends BaseComponent {
    constructor(containerEl) {
        super();
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'search-input-container';
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'search';
        this.inputEl.placeholder = 'Search...';
        this.containerEl.appendChild(this.inputEl);
        this._clearButtonEl = document.createElement('button');
        this._clearButtonEl.className = 'search-input-clear-button';
        this.containerEl.appendChild(this._clearButtonEl);
        if (containerEl) containerEl.appendChild(this.containerEl);
    }

    getValue() { return this.inputEl.value; }
    setValue(value) { this.inputEl.value = value; return this; }
    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    onChange(callback) { this.inputEl.addEventListener('input', () => callback(this.inputEl.value)); return this; }
    onChanged() {}
    setDisabled(disabled) { this.inputEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== MomentFormatComponent =====
class MomentFormatComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.sampleEl = document.createElement('span');
        this.sampleEl.className = 'moment-format-sample';
        if (containerEl) {
            containerEl.appendChild(this.inputEl);
            containerEl.appendChild(this.sampleEl);
        }
    }

    getValue() { return this.inputEl.value; }
    setValue(value) { this.inputEl.value = value || ''; return this; }
    setDefaultFormat(format) { this.inputEl.placeholder = format; return this; }
    setSampleEl(el) { this.sampleEl = el; return this; }
    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    setDisabled(disabled) { this.inputEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== ExtraButtonComponent =====
class ExtraButtonComponent extends BaseComponent {
    constructor(containerEl) {
        super();
        this.extraSettingsEl = document.createElement('button');
        this.extraSettingsEl.className = 'extra-setting-button clickable-icon';
        if (containerEl) containerEl.appendChild(this.extraSettingsEl);
    }

    setIcon(icon) { setIcon(this.extraSettingsEl, icon); return this; }
    setTooltip(tooltip, options) { this.extraSettingsEl.title = tooltip; return this; }
    onClick(callback) { this.extraSettingsEl.addEventListener('click', callback); return this; }
    setDisabled(disabled) { this.extraSettingsEl.disabled = disabled; this.disabled = disabled; return this; }
}

// ===== ProgressBarComponent =====
class ProgressBarComponent extends ValueComponent {
    constructor(containerEl) {
        super();
        this.progressBar = document.createElement('progress');
        if (containerEl) containerEl.appendChild(this.progressBar);
    }
    getValue() { return this.progressBar.value; }
    setValue(value) { this.progressBar.value = value; return this; }
}

// ===== Notice =====
class Notice {
    constructor(message, timeout) {
        if (timeout === undefined) timeout = 5000;
        this.noticeEl = document.createElement('div');
        this.noticeEl.className = 'notice';

        if (typeof message === 'string') {
            this.noticeEl.textContent = message;
        } else if (message instanceof DocumentFragment || message instanceof HTMLElement) {
            this.noticeEl.appendChild(message);
        }

        let container = document.getElementById('obsidian-notice-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'obsidian-notice-container';
            container.className = 'notice-container';
            document.body.appendChild(container);
        }
        container.appendChild(this.noticeEl);

        if (timeout > 0) {
            this._timeout = setTimeout(() => this.hide(), timeout);
        }
    }

    setMessage(message) {
        if (typeof message === 'string') {
            this.noticeEl.textContent = message;
        } else {
            this.noticeEl.empty?.();
            this.noticeEl.appendChild(message);
        }
        return this;
    }

    hide() {
        if (this._timeout) clearTimeout(this._timeout);
        this.noticeEl.classList.add('fade-out');
        setTimeout(() => {
            try { this.noticeEl.remove(); } catch {}
        }, 300);
    }
}

// ===== Modal =====
class Modal {
    constructor(app) {
        this.app = app;
        this.scope = new Scope();
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'modal-container';
        this.modalEl = document.createElement('div');
        this.modalEl.className = 'modal';
        this.titleEl = document.createElement('div');
        this.titleEl.className = 'modal-title';
        this.contentEl = document.createElement('div');
        this.contentEl.className = 'modal-content';
        this.closeButtonEl = document.createElement('div');
        this.closeButtonEl.className = 'modal-close-button';
        this.closeButtonEl.addEventListener('click', () => this.close());

        this.modalEl.appendChild(this.closeButtonEl);
        this.modalEl.appendChild(this.titleEl);
        this.modalEl.appendChild(this.contentEl);
        this.containerEl.appendChild(this.modalEl);

        this.shouldRestoreSelection = false;

        // Click outside to close
        this.containerEl.addEventListener('click', (e) => {
            if (e.target === this.containerEl) this.close();
        });
    }

    open() {
        document.body.appendChild(this.containerEl);
        document.body.classList.add('modal-open');
        this.onOpen();
    }

    close() {
        this.onClose();
        try { this.containerEl.remove(); } catch {}
        document.body.classList.remove('modal-open');
    }

    onOpen() {}
    onClose() {}

    setTitle(title) {
        this.titleEl.textContent = title;
        return this;
    }
}

// ===== PopoverSuggest =====
class PopoverSuggest {
    constructor(app, scope) {
        this.app = app;
        this.scope = scope || new Scope();
        this.suggestEl = document.createElement('div');
        this.suggestEl.className = 'suggestion-container';
    }

    open() {
        document.body.appendChild(this.suggestEl);
    }

    close() {
        try { this.suggestEl.remove(); } catch {}
    }

    renderSuggestion(value, el) {
        el.textContent = String(value);
    }

    selectSuggestion(value, evt) {}
}

// ===== AbstractInputSuggest =====
class AbstractInputSuggest extends PopoverSuggest {
    constructor(app, textInputEl) {
        super(app);
        this.textInputEl = textInputEl;
        this.limit = 100;
    }

    setValue(value) {
        if (this.textInputEl) this.textInputEl.value = value;
    }

    getValue() {
        return this.textInputEl ? this.textInputEl.value : '';
    }

    getSuggestions(query) { return []; }

    selectSuggestion(value, evt) {}

    onSelect(callback) {
        this._onSelectCb = callback;
        return this;
    }
}

// ===== SuggestModal =====
class SuggestModal extends Modal {
    constructor(app) {
        super(app);
        this.limit = 100;
        this.emptyStateText = 'No results found.';
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.className = 'prompt-input';
        this.inputEl.placeholder = '';
        this.resultContainerEl = document.createElement('div');
        this.resultContainerEl.className = 'prompt-results';
        // Reorder: input on top, then results, replace title/content layout
        this.modalEl.innerHTML = '';
        this.modalEl.appendChild(this.inputEl);
        this.modalEl.appendChild(this.resultContainerEl);
        this.modalEl.classList.add('mod-suggestion');

        this.inputEl.addEventListener('input', () => this._updateSuggestions());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
            if (e.key === 'Enter') {
                const selected = this.resultContainerEl.querySelector('.is-selected');
                if (selected && selected._item !== undefined) {
                    this.onChooseSuggestion(selected._item, e);
                    this.close();
                }
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const items = Array.from(this.resultContainerEl.children);
                const current = items.findIndex(el => el.classList.contains('is-selected'));
                const next = e.key === 'ArrowDown'
                    ? Math.min(current + 1, items.length - 1)
                    : Math.max(current - 1, 0);
                items.forEach((el, i) => el.classList.toggle('is-selected', i === next));
                items[next]?.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    getSuggestions(query) { return []; }
    renderSuggestion(item, el) { el.textContent = String(item); }
    onChooseSuggestion(item, evt) {}

    setPlaceholder(placeholder) { this.inputEl.placeholder = placeholder; return this; }
    setInstructions(instructions) {
        // instructions is array of { command, purpose }
        _stubWarn('SuggestModal', 'setInstructions');
        return this;
    }

    _updateSuggestions() {
        const query = this.inputEl.value;
        const rawItems = this.getSuggestions(query);
        const doRender = (items) => {
            this.resultContainerEl.innerHTML = '';
            if (!items || items.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'suggestion-empty';
                empty.textContent = this.emptyStateText;
                this.resultContainerEl.appendChild(empty);
                return;
            }
            for (let i = 0; i < Math.min(items.length, this.limit || 100); i++) {
                const el = document.createElement('div');
                el.className = 'suggestion-item' + (i === 0 ? ' is-selected' : '');
                el._item = items[i];
                this.renderSuggestion(items[i], el);
                el.addEventListener('click', (e) => {
                    this.onChooseSuggestion(items[i], e);
                    this.close();
                });
                el.addEventListener('mouseenter', () => {
                    this.resultContainerEl.querySelectorAll('.suggestion-item').forEach(s => s.classList.remove('is-selected'));
                    el.classList.add('is-selected');
                });
                this.resultContainerEl.appendChild(el);
            }
        };

        if (rawItems instanceof Promise) {
            rawItems.then(doRender);
        } else {
            doRender(rawItems);
        }
    }

    open() {
        super.open();
        this.inputEl.focus();
        this._updateSuggestions();
    }
}

// ===== FuzzySuggestModal =====
class FuzzySuggestModal extends SuggestModal {
    constructor(app) {
        super(app);
    }

    getItems() { return []; }
    getItemText(item) { return String(item); }
    onChooseItem(item, evt) {}

    getSuggestions(query) {
        const items = this.getItems();
        if (!query) return items.map(item => ({ item, match: null }));
        const lq = query.toLowerCase();
        return items
            .filter(item => this.getItemText(item).toLowerCase().includes(lq))
            .map(item => ({ item, match: fuzzySearch(prepareQuery(query), this.getItemText(item)) }));
    }

    renderSuggestion(result, el) {
        el.textContent = this.getItemText(result.item || result);
    }

    onChooseSuggestion(result, evt) {
        this.onChooseItem(result.item || result, evt);
    }
}

// ===== EditorSuggest =====
class EditorSuggest extends PopoverSuggest {
    constructor(app) {
        super(app);
        this.context = null;
        this.limit = 20;
    }

    onTrigger(cursor, editor, file) { return null; }
    getSuggestions(context) { return []; }
    renderSuggestion(suggestion, el) { el.textContent = String(suggestion); }
    selectSuggestion(suggestion, evt) {}
}

// ===== Menu =====
class Menu extends Component {
    constructor() {
        super();
        this.items = [];
        this.dom = document.createElement('div');
        this.dom.className = 'menu';
        this._onHide = null;
    }

    addItem(callback) {
        const item = new MenuItem();
        callback(item);
        this.items.push(item);
        return this;
    }

    addSeparator() {
        const sep = { _separator: true, dom: document.createElement('div') };
        sep.dom.className = 'menu-separator';
        this.items.push(sep);
        return this;
    }

    showAtMouseEvent(event) {
        return this.showAtPosition({ x: event.clientX || event.pageX, y: event.clientY || event.pageY });
    }

    showAtPosition(position) {
        this.dom.innerHTML = '';
        for (const item of this.items) {
            if (item._separator) {
                this.dom.appendChild(item.dom);
            } else {
                this.dom.appendChild(item._render());
            }
        }
        this.dom.style.position = 'fixed';
        this.dom.style.left = (position.x || 0) + 'px';
        this.dom.style.top = (position.y || 0) + 'px';
        this.dom.style.zIndex = '9999';
        document.body.appendChild(this.dom);

        const close = (e) => {
            if (!this.dom.contains(e.target)) {
                this.hide();
                document.removeEventListener('click', close, true);
            }
        };
        setTimeout(() => document.addEventListener('click', close, true), 0);
        return this;
    }

    hide() {
        try { this.dom.remove(); } catch {}
        if (this._onHide) this._onHide();
    }

    close() { this.hide(); }

    onHide(callback) {
        this._onHide = callback;
    }
}

// ===== MenuItem =====
class MenuItem {
    constructor() {
        this._title = '';
        this._icon = '';
        this._callback = null;
        this._checked = false;
        this._disabled = false;
        this._isLabel = false;
        this._section = '';
        this._submenu = null;
    }

    setTitle(title) { this._title = title; return this; }
    setIcon(icon) { this._icon = icon; return this; }
    onClick(callback) { this._callback = callback; return this; }
    setChecked(checked) { this._checked = checked; return this; }
    setDisabled(disabled) { this._disabled = disabled; return this; }
    setIsLabel(isLabel) { this._isLabel = isLabel; return this; }
    setSection(section) { this._section = section; return this; }
    setSubmenu() {
        this._submenu = new Menu();
        return this._submenu;
    }

    _render() {
        const el = document.createElement('div');
        el.className = 'menu-item' + (this._disabled ? ' is-disabled' : '') + (this._isLabel ? ' is-label' : '');
        if (this._icon) {
            const iconEl = document.createElement('span');
            iconEl.className = 'menu-item-icon';
            setIcon(iconEl, this._icon);
            el.appendChild(iconEl);
        }
        const titleEl = document.createElement('span');
        titleEl.className = 'menu-item-title';
        titleEl.textContent = this._title;
        el.appendChild(titleEl);
        if (this._checked) {
            const checkEl = document.createElement('span');
            checkEl.className = 'menu-item-check';
            checkEl.textContent = '✓';
            el.appendChild(checkEl);
        }
        if (this._callback && !this._disabled) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._callback(e);
                // Auto-close parent menu
                const menu = el.closest('.menu');
                if (menu) try { menu.remove(); } catch {}
            });
        }
        return el;
    }
}

// ===== Setting =====
class Setting {
    constructor(containerEl) {
        this.settingEl = document.createElement('div');
        this.settingEl.className = 'setting-item';
        this.infoEl = document.createElement('div');
        this.infoEl.className = 'setting-item-info';
        this.controlEl = document.createElement('div');
        this.controlEl.className = 'setting-item-control';
        this.nameEl = document.createElement('div');
        this.nameEl.className = 'setting-item-name';
        this.descEl = document.createElement('div');
        this.descEl.className = 'setting-item-description';
        this.infoEl.appendChild(this.nameEl);
        this.infoEl.appendChild(this.descEl);
        this.settingEl.appendChild(this.infoEl);
        this.settingEl.appendChild(this.controlEl);
        if (containerEl) containerEl.appendChild(this.settingEl);
        this._components = [];
    }

    setName(name) {
        if (typeof name === 'string') this.nameEl.textContent = name;
        else { this.nameEl.innerHTML = ''; this.nameEl.appendChild(name); }
        return this;
    }

    setDesc(desc) {
        if (typeof desc === 'string') {
            this.descEl.textContent = desc;
        } else if (desc instanceof DocumentFragment || desc instanceof HTMLElement) {
            this.descEl.innerHTML = '';
            this.descEl.appendChild(desc);
        }
        return this;
    }

    setTooltip(tooltip) {
        this.settingEl.title = tooltip;
        return this;
    }

    setHeading() {
        this.settingEl.classList.add('setting-item-heading');
        return this;
    }

    setClass(cls) {
        this.settingEl.classList.add(cls);
        return this;
    }

    setDisabled(disabled) {
        this.settingEl.classList.toggle('is-disabled', disabled);
        return this;
    }

    addText(callback) {
        const comp = new TextComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addTextArea(callback) {
        const comp = new TextAreaComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addToggle(callback) {
        const comp = new ToggleComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addDropdown(callback) {
        const comp = new DropdownComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addSlider(callback) {
        const comp = new SliderComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addButton(callback) {
        const comp = new ButtonComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addColorPicker(callback) {
        const comp = new ColorComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addSearch(callback) {
        const comp = new SearchComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addMomentFormat(callback) {
        const comp = new MomentFormatComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addExtraButton(callback) {
        const comp = new ExtraButtonComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    addProgressBar(callback) {
        const comp = new ProgressBarComponent(this.controlEl);
        this._components.push(comp);
        callback(comp);
        return this;
    }

    then(cb) {
        cb(this);
        return this;
    }

    clear() {
        this.controlEl.innerHTML = '';
        this._components = [];
        return this;
    }
}

// ===== SettingTab / PluginSettingTab =====
class SettingTab {
    constructor(app) {
        this.app = app;
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'vertical-tab-content';
    }

    display() {}

    hide() {
        this.containerEl.innerHTML = '';
    }
}

class PluginSettingTab extends SettingTab {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
}

// ===== Plugin =====
class Plugin extends Component {
    constructor(app, manifest) {
        super();
        this.app = app;
        this.manifest = manifest || { id: '', name: '', version: '0.0.0', minAppVersion: '0.0.0', author: '', description: '' };
        this._commands = [];
        this._settingTabs = [];
        this._ribbonIcons = [];
        this._views = {};
        this._postProcessors = [];
        this._stylesheets = [];
        this._statusBarItems = [];
        this._editorExtensions = [];
    }

    addCommand(command) {
        const fullId = `${this.manifest.id}:${command.id}`;
        const cmd = { ...command, id: fullId, _pluginId: this.manifest.id };

        // Wrap editorCallback / editorCheckCallback into callback / checkCallback
        // so the command palette can execute them
        if (cmd.editorCheckCallback && !cmd.callback && !cmd.checkCallback) {
            const origECC = cmd.editorCheckCallback;
            cmd.checkCallback = (checking) => {
                const leaf = this.app?.workspace?.activeLeaf;
                const view = leaf?.view;
                if (view instanceof MarkdownView) {
                    return origECC(checking, view.editor, view);
                }
                return false;
            };
        } else if (cmd.editorCallback && !cmd.callback && !cmd.checkCallback) {
            const origEC = cmd.editorCallback;
            cmd.checkCallback = (checking) => {
                const leaf = this.app?.workspace?.activeLeaf;
                const view = leaf?.view;
                if (view instanceof MarkdownView) {
                    if (!checking) origEC(view.editor, view);
                    return true;
                }
                return false;
            };
        }

        this._commands.push(cmd);
        if (window._oxidianPluginRegistry) {
            window._oxidianPluginRegistry.registerCommand(cmd);
        }
        return cmd;
    }

    addRibbonIcon(icon, title, callback) {
        const el = document.createElement('button');
        el.className = 'side-dock-ribbon-action clickable-icon';
        el.setAttribute('aria-label', title);
        el.title = title;
        setIcon(el, icon);
        el.addEventListener('click', callback);
        this._ribbonIcons.push(el);

        const ribbonTop = document.querySelector('#ribbon .ribbon-top');
        if (ribbonTop) ribbonTop.appendChild(el);

        return el;
    }

    addStatusBarItem() {
        const el = document.createElement('span');
        el.className = 'status-bar-item plugin-status-bar-item';
        const statusBar = document.getElementById('statusbar');
        const statusRight = statusBar?.querySelector('.status-right');
        if (statusRight) statusRight.appendChild(el);
        this._statusBarItems.push(el);
        return el;
    }

    addSettingTab(tab) {
        this._settingTabs.push(tab);
        if (window._oxidianPluginRegistry) {
            window._oxidianPluginRegistry.registerSettingTab(this.manifest.id, tab);
        }
        return tab;
    }

    registerView(type, viewCreator) {
        this._views[type] = viewCreator;
    }

    registerMarkdownPostProcessor(postProcessor, sortOrder) {
        postProcessor.sortOrder = sortOrder || 0;
        this._postProcessors.push(postProcessor);
        if (window._oxidianPluginRegistry) {
            window._oxidianPluginRegistry.registerPostProcessor(postProcessor);
        }
        return postProcessor;
    }

    registerMarkdownCodeBlockProcessor(language, handler, sortOrder) {
        const pp = (el, ctx) => {
            const codeBlocks = el.querySelectorAll(`code.language-${language}`);
            for (const block of codeBlocks) {
                const pre = block.parentElement;
                if (pre && pre.tagName === 'PRE') {
                    const container = document.createElement('div');
                    pre.replaceWith(container);
                    handler(block.textContent || '', container, ctx);
                }
            }
        };
        return this.registerMarkdownPostProcessor(pp, sortOrder);
    }

    registerCodeMirror(callback) {
        _stubWarn('Plugin', 'registerCodeMirror');
    }

    registerEditorExtension(extension) {
        this._editorExtensions.push(extension);
    }

    registerObsidianProtocolHandler(action, handler) {
        _stubWarn('Plugin', 'registerObsidianProtocolHandler');
    }

    registerEditorSuggest(suggest) {
        _stubWarn('Plugin', 'registerEditorSuggest');
    }

    registerHoverLinkSource(id, info) {
        // Register a hover link source for providing hover previews
        // This is used by plugins like Kanban to provide custom hover content
        if (window._oxidianPluginRegistry) {
            window._oxidianPluginRegistry.registerHoverLinkSource(id, info);
        }
        return { id, info };
    }

    async loadData() {
        try {
            // Primary: use Rust PluginRegistry settings (returns parsed JSON directly)
            const data = await invoke('get_plugin_settings', { pluginId: this.manifest.id });
            // If empty object from fresh install, return null for compat
            if (data && typeof data === 'object' && Object.keys(data).length === 0) return null;
            return data;
        } catch {
            // Fallback: legacy command (returns raw string)
            try {
                const raw = await invoke('get_plugin_data', { pluginId: this.manifest.id });
                return raw ? JSON.parse(raw) : null;
            } catch {
                return null;
            }
        }
    }

    async saveData(data) {
        try {
            // Primary: use Rust PluginRegistry settings (accepts JSON value directly)
            await invoke('save_plugin_settings', {
                pluginId: this.manifest.id,
                settings: data,
            });
        } catch {
            // Fallback: legacy command (accepts string)
            try {
                await invoke('save_plugin_data', {
                    pluginId: this.manifest.id,
                    data: JSON.stringify(data, null, 2),
                });
            } catch (e) {
                console.error(`Failed to save plugin data for ${this.manifest.id}:`, e);
            }
        }
    }

    // Override unload to clean up plugin resources
    onunload() {}

    _unload() {
        try { this.onunload(); } catch (e) { console.error('Plugin onunload error:', e); }

        for (const cmd of this._commands) {
            if (window._oxidianPluginRegistry) {
                window._oxidianPluginRegistry.unregisterCommand(cmd.id);
            }
        }
        for (const el of this._ribbonIcons) { try { el.remove(); } catch {} }
        for (const el of this._statusBarItems) { try { el.remove(); } catch {} }
        for (const el of this._stylesheets) { try { el.remove(); } catch {} }

        this._commands = [];
        this._settingTabs = [];
        this._ribbonIcons = [];
        this._postProcessors = [];
        this._statusBarItems = [];
        this._stylesheets = [];
        this._editorExtensions = [];

        // Call Component.unload for cleanups
        this.unload();
    }
}

// ===== Markdown =====
class MarkdownRenderChild extends Component {
    constructor(containerEl) {
        super();
        this.containerEl = containerEl;
    }
}

class MarkdownRenderer {
    static async render(app, markdown, el, sourcePath, component) {
        try {
            const html = await invoke('render_markdown', { content: markdown });
            el.innerHTML = html;
        } catch {
            el.textContent = markdown;
        }
        if (component && component instanceof Component) {
            // component lifecycle tie-in would happen here
        }
    }

    static async renderMarkdown(markdown, el, sourcePath, component) {
        return MarkdownRenderer.render(null, markdown, el, sourcePath, component);
    }
}

class MarkdownPreviewRenderer {
    static registerPostProcessor(postProcessor, sortOrder) {
        if (window._oxidianPluginRegistry) {
            window._oxidianPluginRegistry.registerPostProcessor(postProcessor);
        }
    }
}

// ===== Platform =====
const Platform = {
    isDesktop: true,
    isDesktopApp: true,
    isMobile: false,
    isMobileApp: false,
    isIosApp: false,
    isAndroidApp: false,
    isMacOS: typeof navigator !== 'undefined' && navigator.platform?.includes('Mac'),
    isWin: typeof navigator !== 'undefined' && navigator.platform?.includes('Win'),
    isLinux: typeof navigator !== 'undefined' && navigator.platform?.includes('Linux'),
    isSafari: false,
    isPhone: false,
    isTablet: false,
};

// ===== Icon registry with basic Lucide icons =====
const _builtinIcons = {
    'circle': '<circle cx="12" cy="12" r="10"/>',
    'file-text': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    'folder': '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'check': '<polyline points="20 6 9 17 4 12"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    'edit': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    'copy': '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'link': '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
    'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'vault': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="14" r="2"/><path d="M12 12v-4"/>',
};

if (!window._oxidianCustomIcons) window._oxidianCustomIcons = {};

function setIcon(el, iconId) {
    if (!el || !iconId) return;
    const custom = window._oxidianCustomIcons[iconId];
    if (custom) {
        el.innerHTML = custom.startsWith('<svg') ? custom : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${custom}</svg>`;
        return;
    }
    const builtin = _builtinIcons[iconId];
    if (builtin) {
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${builtin}</svg>`;
    } else {
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    }
}

function addIcon(iconId, svgContent) {
    window._oxidianCustomIcons[iconId] = svgContent;
}

function getIcon(iconId) {
    const el = document.createElement('span');
    setIcon(el, iconId);
    return el.firstChild || el;
}

function getIconIds() {
    const builtinIds = Object.keys(_builtinIcons);
    const customIds = Object.keys(window._oxidianCustomIcons || {});
    return [...new Set([...builtinIds, ...customIds])];
}

// ===== Utility Functions =====

function normalizePath(path) {
    if (!path) return '';
    return path
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\/|\/$/g, '')
        .replace(/^\.\//, '');
}

function debounce(func, wait, resetTimer) {
    let timeout;
    const debounced = function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = undefined;
            func.apply(this, args);
        }, wait);
    };
    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = undefined;
    };
    return debounced;
}

function parseLinktext(linktext) {
    if (!linktext) return { path: '', subpath: '' };
    const hashIndex = linktext.indexOf('#');
    if (hashIndex < 0) return { path: linktext, subpath: '' };
    return { path: linktext.substring(0, hashIndex), subpath: linktext.substring(hashIndex) };
}

function getLinkpath(linktext) {
    return parseLinktext(linktext).path;
}

function stripHeading(heading) {
    return heading.replace(/^#+\s*/, '');
}

function stripHeadingForLink(heading) {
    return stripHeading(heading).replace(/[^\w\s-]/g, '').trim();
}

function parseFrontMatterStringArray(frontmatter, key) {
    if (!frontmatter || !key) return null;
    const val = frontmatter[key];
    if (!val) return null;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return null;
}

function parseFrontMatterTags(frontmatter) {
    if (!frontmatter) return null;
    const tags = parseFrontMatterStringArray(frontmatter, 'tags') ||
                 parseFrontMatterStringArray(frontmatter, 'tag');
    if (!tags) return null;
    return tags.map(t => t.startsWith('#') ? t : '#' + t);
}

function parseFrontMatterAliases(frontmatter) {
    if (!frontmatter) return null;
    return parseFrontMatterStringArray(frontmatter, 'aliases') ||
           parseFrontMatterStringArray(frontmatter, 'alias');
}

function parseYaml(yaml) {
    if (!yaml || !yaml.trim()) return {};
    // Simple YAML parser for common cases
    const result = {};
    const lines = yaml.split('\n');
    let currentKey = null;
    let currentList = null;

    for (const line of lines) {
        const trimmed = line.trimEnd();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // List item
        const listMatch = trimmed.match(/^(\s+)-\s*(.*)/);
        if (listMatch && currentKey) {
            if (!currentList) {
                currentList = [];
                result[currentKey] = currentList;
            }
            let val = listMatch[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            currentList.push(val);
            continue;
        }

        // Key: value
        const kvMatch = trimmed.match(/^([^:]+):\s*(.*)/);
        if (kvMatch) {
            currentKey = kvMatch[1].trim();
            let val = kvMatch[2].trim();
            currentList = null;

            if (!val) {
                result[currentKey] = null;
                continue;
            }

            // Remove quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }

            // Boolean
            if (val === 'true') { result[currentKey] = true; continue; }
            if (val === 'false') { result[currentKey] = false; continue; }
            if (val === 'null') { result[currentKey] = null; continue; }

            // Number
            const num = Number(val);
            if (!isNaN(num) && val !== '') { result[currentKey] = num; continue; }

            // Inline list
            if (val.startsWith('[') && val.endsWith(']')) {
                try {
                    result[currentKey] = JSON.parse(val);
                } catch {
                    result[currentKey] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
                }
                continue;
            }

            result[currentKey] = val;
        }
    }
    return result;
}

function stringifyYaml(obj) {
    if (!obj || typeof obj !== 'object') return '';
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            lines.push(`${key}:`);
        } else if (Array.isArray(value)) {
            if (value.length === 0) {
                lines.push(`${key}: []`);
            } else {
                lines.push(`${key}:`);
                for (const item of value) {
                    lines.push(`  - ${typeof item === 'string' && item.includes(':') ? `"${item}"` : item}`);
                }
            }
        } else if (typeof value === 'object') {
            lines.push(`${key}:`);
            for (const [k2, v2] of Object.entries(value)) {
                lines.push(`  ${k2}: ${v2}`);
            }
        } else if (typeof value === 'string' && (value.includes(':') || value.includes('#') || value.includes('"'))) {
            lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else {
            lines.push(`${key}: ${value}`);
        }
    }
    return lines.join('\n') + '\n';
}

// moment stub
function moment(date) {
    const d = date instanceof Date ? date : (date ? new Date(date) : new Date());
    if (isNaN(d.getTime())) {
        // Invalid date
        const invalid = {
            format() { return 'Invalid date'; },
            toDate() { return d; },
            valueOf() { return NaN; },
            isValid() { return false; },
            isSame() { return false; },
            isBefore() { return false; },
            isAfter() { return false; },
            add() { return invalid; },
            subtract() { return invalid; },
            startOf() { return invalid; },
            endOf() { return invalid; },
            clone() { return invalid; },
            unix() { return NaN; },
            toISOString() { return ''; },
            locale() { return invalid; },
            diff() { return NaN; },
        };
        return invalid;
    }

    const obj = {
        _d: d,
        format(fmt) {
            if (!fmt) return d.toISOString();
            // Single-pass token replacement to avoid cascading corruption
            // (e.g. MMMM→"March" then M→"3" corrupting to "3arch")
            const tokens = {
                'YYYY': () => String(d.getFullYear()),
                'YY':   () => String(d.getFullYear()).slice(-2),
                'MMMM': () => d.toLocaleDateString('en', { month: 'long' }),
                'MMM':  () => d.toLocaleDateString('en', { month: 'short' }),
                'MM':   () => String(d.getMonth() + 1).padStart(2, '0'),
                'M':    () => String(d.getMonth() + 1),
                'dddd': () => d.toLocaleDateString('en', { weekday: 'long' }),
                'ddd':  () => d.toLocaleDateString('en', { weekday: 'short' }),
                'dd':   () => d.toLocaleDateString('en', { weekday: 'narrow' }),
                'DD':   () => String(d.getDate()).padStart(2, '0'),
                'Do':   () => String(d.getDate()) + (['th','st','nd','rd'][(d.getDate()%100-20)%10] || ['th','st','nd','rd'][d.getDate()%100] || 'th'),
                'D':    () => String(d.getDate()),
                'HH':   () => String(d.getHours()).padStart(2, '0'),
                'H':    () => String(d.getHours()),
                'hh':   () => String(d.getHours() % 12 || 12).padStart(2, '0'),
                'h':    () => String(d.getHours() % 12 || 12),
                'mm':   () => String(d.getMinutes()).padStart(2, '0'),
                'ss':   () => String(d.getSeconds()).padStart(2, '0'),
                'A':    () => d.getHours() >= 12 ? 'PM' : 'AM',
                'a':    () => d.getHours() >= 12 ? 'pm' : 'am',
                'X':    () => String(Math.floor(d.getTime() / 1000)),
                'x':    () => String(d.getTime()),
            };
            // Build regex matching longest tokens first
            const tokenPattern = Object.keys(tokens)
                .sort((a, b) => b.length - a.length)
                .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            const re = new RegExp(tokenPattern, 'g');
            return fmt.replace(re, (match) => tokens[match]());
        },
        toDate() { return new Date(d); },
        valueOf() { return d.getTime(); },
        unix() { return Math.floor(d.getTime() / 1000); },
        toISOString() { return d.toISOString(); },
        isValid() { return true; },
        isSame(other, unit) {
            const o = other instanceof Date ? other : new Date(other?._d || other);
            if (unit === 'day' || unit === 'date') return d.toDateString() === o.toDateString();
            if (unit === 'month') return d.getFullYear() === o.getFullYear() && d.getMonth() === o.getMonth();
            if (unit === 'year') return d.getFullYear() === o.getFullYear();
            return d.getTime() === o.getTime();
        },
        isBefore(other, unit) {
            const o = other instanceof Date ? other : new Date(other?._d || other);
            if (unit === 'day') return d.toDateString() < o.toDateString();
            return d < o;
        },
        isAfter(other, unit) {
            const o = other instanceof Date ? other : new Date(other?._d || other);
            if (unit === 'day') return d.toDateString() > o.toDateString();
            return d > o;
        },
        diff(other, unit) {
            const o = other instanceof Date ? other : new Date(other?._d || other);
            const ms = d.getTime() - o.getTime();
            if (unit === 'days' || unit === 'day') return Math.floor(ms / 86400000);
            if (unit === 'hours' || unit === 'hour') return Math.floor(ms / 3600000);
            if (unit === 'minutes' || unit === 'minute') return Math.floor(ms / 60000);
            if (unit === 'seconds' || unit === 'second') return Math.floor(ms / 1000);
            if (unit === 'months' || unit === 'month') return (d.getFullYear() - o.getFullYear()) * 12 + (d.getMonth() - o.getMonth());
            if (unit === 'years' || unit === 'year') return d.getFullYear() - o.getFullYear();
            return ms;
        },
        add(n, unit) {
            const nd = new Date(d);
            if (unit === 'days' || unit === 'day' || unit === 'd') nd.setDate(nd.getDate() + n);
            else if (unit === 'months' || unit === 'month' || unit === 'M') nd.setMonth(nd.getMonth() + n);
            else if (unit === 'years' || unit === 'year' || unit === 'y') nd.setFullYear(nd.getFullYear() + n);
            else if (unit === 'hours' || unit === 'hour' || unit === 'h') nd.setHours(nd.getHours() + n);
            else if (unit === 'minutes' || unit === 'minute' || unit === 'm') nd.setMinutes(nd.getMinutes() + n);
            else if (unit === 'seconds' || unit === 'second' || unit === 's') nd.setSeconds(nd.getSeconds() + n);
            else if (unit === 'weeks' || unit === 'week' || unit === 'w') nd.setDate(nd.getDate() + n * 7);
            else nd.setDate(nd.getDate() + n);
            return moment(nd);
        },
        subtract(n, unit) { return obj.add(-n, unit); },
        startOf(unit) {
            if (unit === 'day' || unit === 'date') return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
            if (unit === 'month') return moment(new Date(d.getFullYear(), d.getMonth(), 1));
            if (unit === 'year') return moment(new Date(d.getFullYear(), 0, 1));
            if (unit === 'week') {
                const day = d.getDay();
                const nd = new Date(d);
                nd.setDate(nd.getDate() - day);
                return moment(new Date(nd.getFullYear(), nd.getMonth(), nd.getDate()));
            }
            if (unit === 'hour') return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()));
            if (unit === 'minute') return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
            return moment(new Date(d));
        },
        endOf(unit) {
            if (unit === 'day' || unit === 'date') return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
            if (unit === 'month') return moment(new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999));
            if (unit === 'year') return moment(new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999));
            if (unit === 'week') {
                const day = d.getDay();
                const nd = new Date(d);
                nd.setDate(nd.getDate() + (6 - day));
                return moment(new Date(nd.getFullYear(), nd.getMonth(), nd.getDate(), 23, 59, 59, 999));
            }
            return moment(new Date(d));
        },
        clone() { return moment(new Date(d)); },
        locale(loc) { return obj; },
        year() { return d.getFullYear(); },
        month() { return d.getMonth(); },
        date() { return d.getDate(); },
        day() { return d.getDay(); },
        hour() { return d.getHours(); },
        minute() { return d.getMinutes(); },
        second() { return d.getSeconds(); },
        millisecond() { return d.getMilliseconds(); },
        toString() { return d.toString(); },
    };
    return obj;
}

// Static methods on moment
moment.now = () => Date.now();
moment.unix = (timestamp) => moment(new Date(timestamp * 1000));
moment.duration = (value, unit) => {
    let ms = value;
    if (unit === 'seconds' || unit === 'second' || unit === 's') ms = value * 1000;
    if (unit === 'minutes' || unit === 'minute' || unit === 'm') ms = value * 60000;
    if (unit === 'hours' || unit === 'hour' || unit === 'h') ms = value * 3600000;
    if (unit === 'days' || unit === 'day' || unit === 'd') ms = value * 86400000;
    return {
        asMilliseconds() { return ms; },
        asSeconds() { return ms / 1000; },
        asMinutes() { return ms / 60000; },
        asHours() { return ms / 3600000; },
        asDays() { return ms / 86400000; },
        humanize() { return `${Math.round(ms / 1000)} seconds`; },
    };
};
moment.locale = () => 'en';
moment.isMoment = (obj) => obj && typeof obj.format === 'function' && typeof obj.toDate === 'function';

// ===== requestUrl / request =====
async function requestUrl(urlOrOptions) {
    const opts = typeof urlOrOptions === 'string' ? { url: urlOrOptions } : { ...urlOrOptions };
    const fetchOpts = {
        method: opts.method || 'GET',
        headers: opts.headers || {},
    };
    if (opts.body) fetchOpts.body = opts.body;
    if (opts.contentType && fetchOpts.headers) {
        fetchOpts.headers['Content-Type'] = opts.contentType;
    }

    const response = await fetch(opts.url, fetchOpts);
    const arrayBuffer = await response.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    let json;
    try { json = JSON.parse(text); } catch {}

    return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text,
        json,
        arrayBuffer,
    };
}

async function request(urlOrOptions) {
    const result = await requestUrl(urlOrOptions);
    return result.text;
}

// ===== HTML / DOM utilities =====
function sanitizeHTMLToDom(html) {
    const template = document.createElement('template');
    template.innerHTML = (html || '').trim();
    return template.content;
}

function htmlToMarkdown(html) {
    return (html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => '#'.repeat(Number(level)) + ' ' + text + '\n')
        .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]+>/g, '')
        .trim();
}

// ===== Buffer conversion utilities =====
function hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
}

function arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ===== Search utilities =====
function prepareQuery(query) {
    if (!query) return { query: '', tokens: [], fuzzy: [] };
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return { query: query.toLowerCase(), tokens, fuzzy: tokens };
}

function fuzzySearch(preparedQuery, text) {
    if (!preparedQuery || !text) return null;
    const query = typeof preparedQuery === 'string' ? preparedQuery.toLowerCase() : preparedQuery.query;
    if (!query) return { score: 0, matches: [] };
    const lowerText = text.toLowerCase();
    const matches = [];
    let score = 0;

    // Simple substring matching
    const idx = lowerText.indexOf(query);
    if (idx >= 0) {
        matches.push([idx, idx + query.length]);
        score = query.length / text.length;
        // Bonus for start
        if (idx === 0) score += 0.1;
        return { score, matches };
    }

    // Fuzzy character matching
    let qi = 0;
    let consecutive = 0;
    for (let ti = 0; ti < lowerText.length && qi < query.length; ti++) {
        if (lowerText[ti] === query[qi]) {
            const start = ti;
            while (ti < lowerText.length && qi < query.length && lowerText[ti] === query[qi]) {
                ti++;
                qi++;
                consecutive++;
            }
            matches.push([start, ti]);
            ti--; // compensate for the loop increment
        } else {
            consecutive = 0;
        }
    }

    if (qi < query.length) return null;
    score = (qi / text.length) * 0.5 + (consecutive / query.length) * 0.5;
    return { score, matches };
}

function prepareFuzzySearch(query) {
    const prepared = prepareQuery(query);
    return (text) => fuzzySearch(prepared, text);
}

function sortSearchResults(results) {
    results.sort((a, b) => (b.score || b.match?.score || 0) - (a.score || a.match?.score || 0));
}

function renderResults(el, text, result) {
    if (!result || !result.matches || result.matches.length === 0) {
        el.textContent = text;
        return;
    }
    renderMatches(el, text, result.matches);
}

function renderMatches(el, text, matches) {
    if (!matches || matches.length === 0) {
        el.textContent = text;
        return;
    }
    el.innerHTML = '';
    let lastEnd = 0;
    for (const [start, end] of matches) {
        if (start > lastEnd) {
            el.appendChild(document.createTextNode(text.substring(lastEnd, start)));
        }
        const highlight = document.createElement('span');
        highlight.className = 'suggestion-highlight';
        highlight.textContent = text.substring(start, end);
        el.appendChild(highlight);
        lastEnd = end;
    }
    if (lastEnd < text.length) {
        el.appendChild(document.createTextNode(text.substring(lastEnd)));
    }
}

// ===== Cache utility functions =====
function iterateCacheRefs(cache, cb) {
    if (!cache) return;
    if (cache.links) for (const link of cache.links) cb(link);
    if (cache.embeds) for (const embed of cache.embeds) cb(embed);
}

function getAllTags(cache) {
    if (!cache) return [];
    const tags = [];
    if (cache.tags) {
        for (const t of cache.tags) tags.push(t.tag);
    }
    if (cache.frontmatter) {
        const fmTags = parseFrontMatterTags(cache.frontmatter);
        if (fmTags) tags.push(...fmTags);
    }
    return tags;
}

function resolveSubpath(cache, subpath) {
    if (!cache || !subpath) return null;
    if (subpath.startsWith('#^')) {
        // Block reference
        const blockId = subpath.substring(2);
        if (cache.blocks && cache.blocks[blockId]) {
            return { type: 'block', block: cache.blocks[blockId], start: cache.blocks[blockId].position, end: null };
        }
    }
    if (subpath.startsWith('#')) {
        // Heading reference
        const heading = subpath.substring(1);
        if (cache.headings) {
            for (const h of cache.headings) {
                if (h.heading === heading) {
                    return { type: 'heading', current: h, start: h.position, end: null };
                }
            }
        }
    }
    return null;
}

// ===== HoverPopover =====
class HoverPopover extends Component {
    constructor(parent, targetEl, waitTime) {
        super();
        this.parent = parent;
        this.targetEl = targetEl;
        this.hoverEl = document.createElement('div');
        this.hoverEl.className = 'hover-popover';
        this.state = 0; // HoverPopover.State
    }
}
HoverPopover.forParent = function(parent) { return null; };

// ===== Miscellaneous stubs =====
class MarkdownSourceView {
    constructor() { this.cmEditor = null; }
    clear() {}
    get() { return ''; }
    set(data) {}
}

class HoverParent {
    constructor() { this.hoverPopover = null; }
}

// ===== DOM Extensions =====
function _applyElOptions(el, o) {
    if (!o || typeof o !== 'object') return el;
    if (o.cls) {
        if (Array.isArray(o.cls)) el.className = o.cls.join(' ');
        else el.className = o.cls;
    }
    if (o.text != null) {
        if (typeof o.text === 'string') el.textContent = o.text;
        else el.appendChild(o.text);
    }
    if (o.attr) {
        for (const [k, v] of Object.entries(o.attr)) {
            if (v !== undefined && v !== null && v !== false) el.setAttribute(k, String(v));
        }
    }
    if (o.title) el.title = o.title;
    if (o.value !== undefined) el.value = o.value;
    if (o.type) el.type = o.type;
    if (o.placeholder) el.placeholder = o.placeholder;
    if (o.href) el.href = o.href;
    if (o.parent) o.parent.appendChild(el);
    if (o.prepend && el.parentElement) {
        el.parentElement.insertBefore(el, el.parentElement.firstChild);
    }
    return el;
}

function installDomExtensions() {
    // Node.prototype extensions
    if (!Node.prototype.createEl) {
        Node.prototype.createEl = function(tag, o, callback) {
            const el = document.createElement(tag);
            if (typeof o === 'string') o = { cls: o };
            _applyElOptions(el, o);
            this.appendChild(el);
            if (typeof callback === 'function') callback(el);
            return el;
        };
    }
    if (!Node.prototype.createDiv) {
        Node.prototype.createDiv = function(o, callback) {
            if (typeof o === 'string') o = { cls: o };
            return this.createEl('div', o, callback);
        };
    }
    if (!Node.prototype.createSpan) {
        Node.prototype.createSpan = function(o, callback) {
            if (typeof o === 'string') o = { cls: o };
            return this.createEl('span', o, callback);
        };
    }
    if (!Node.prototype.createSvg) {
        Node.prototype.createSvg = function(tag, o, callback) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
            if (o && typeof o === 'object') {
                if (o.cls) el.setAttribute('class', Array.isArray(o.cls) ? o.cls.join(' ') : o.cls);
                if (o.attr) {
                    for (const [k, v] of Object.entries(o.attr)) {
                        if (v != null) el.setAttribute(k, String(v));
                    }
                }
            }
            this.appendChild(el);
            if (typeof callback === 'function') callback(el);
            return el;
        };
    }

    // Node.prototype.detach / .empty (official API puts these on Node)
    if (!Node.prototype.detach) {
        Node.prototype.detach = function() {
            if (this.parentNode) this.parentNode.removeChild(this);
            return this;
        };
    }
    if (!Node.prototype.empty) {
        Node.prototype.empty = function() {
            while (this.firstChild) this.removeChild(this.firstChild);
            return this;
        };
    }

    // Element.prototype
    if (!Element.prototype.getText) {
        Element.prototype.getText = function() { return this.textContent || ''; };
    }
    if (!Element.prototype.setText) {
        Element.prototype.setText = function(val) {
            if (typeof val === 'string') this.textContent = val;
            else { this.empty(); this.appendChild(val); }
            return this;
        };
    }
    if (!Element.prototype.addClass) {
        Element.prototype.addClass = function(...classes) {
            this.classList.add(...classes.flat());
            return this;
        };
    }
    if (!Element.prototype.addClasses) {
        Element.prototype.addClasses = function(classes) {
            this.classList.add(...classes);
            return this;
        };
    }
    if (!Element.prototype.removeClass) {
        Element.prototype.removeClass = function(...classes) {
            this.classList.remove(...classes.flat());
            return this;
        };
    }
    if (!Element.prototype.removeClasses) {
        Element.prototype.removeClasses = function(classes) {
            this.classList.remove(...classes);
            return this;
        };
    }
    if (!Element.prototype.toggleClass) {
        Element.prototype.toggleClass = function(cls, value) {
            const classes = Array.isArray(cls) ? cls : [cls];
            for (const c of classes) {
                if (typeof value === 'boolean') this.classList.toggle(c, value);
                else this.classList.toggle(c);
            }
            return this;
        };
    }
    if (!Element.prototype.hasClass) {
        Element.prototype.hasClass = function(cls) { return this.classList.contains(cls); };
    }
    if (!Element.prototype.setAttr) {
        Element.prototype.setAttr = function(name, value) {
            if (value === null || value === undefined) this.removeAttribute(name);
            else this.setAttribute(name, String(value));
        };
    }
    if (!Element.prototype.setAttrs) {
        Element.prototype.setAttrs = function(obj) {
            for (const [k, v] of Object.entries(obj)) this.setAttr(k, v);
        };
    }
    if (!Element.prototype.getAttr) {
        Element.prototype.getAttr = function(name) { return this.getAttribute(name); };
    }
    if (!Element.prototype.matchParent) {
        Element.prototype.matchParent = function(selector, lastParent) {
            let el = this.parentElement;
            while (el) {
                if (el.matches(selector)) return el;
                if (el === lastParent) break;
                el = el.parentElement;
            }
            return null;
        };
    }
    if (!Element.prototype.getCssPropertyValue) {
        Element.prototype.getCssPropertyValue = function(prop, pseudo) {
            return getComputedStyle(this, pseudo).getPropertyValue(prop);
        };
    }
    if (!Element.prototype.isActiveElement) {
        Element.prototype.isActiveElement = function() { return document.activeElement === this; };
    }
    if (!Element.prototype.find) {
        Element.prototype.find = function(selector) { return this.querySelector(selector); };
    }
    if (!Element.prototype.findAll) {
        Element.prototype.findAll = function(selector) { return Array.from(this.querySelectorAll(selector)); };
    }
    if (!Element.prototype.findAllSelf) {
        Element.prototype.findAllSelf = function(selector) {
            const results = this.matches(selector) ? [this] : [];
            return results.concat(Array.from(this.querySelectorAll(selector)));
        };
    }

    // HTMLElement extensions
    if (!HTMLElement.prototype.show) {
        HTMLElement.prototype.show = function() { this.style.display = ''; return this; };
    }
    if (!HTMLElement.prototype.hide) {
        HTMLElement.prototype.hide = function() { this.style.display = 'none'; return this; };
    }
    if (!HTMLElement.prototype.toggle) {
        HTMLElement.prototype.toggle = function(show) {
            if (typeof show === 'boolean') this.style.display = show ? '' : 'none';
            else this.style.display = this.style.display === 'none' ? '' : 'none';
            return this;
        };
    }
    if (!HTMLElement.prototype.toggleVisibility) {
        HTMLElement.prototype.toggleVisibility = function(visible) {
            this.style.display = visible ? '' : 'none';
            return this;
        };
    }
    if (!HTMLElement.prototype.isShown) {
        HTMLElement.prototype.isShown = function() {
            return this.style.display !== 'none' && this.offsetParent !== null;
        };
    }
    if (!HTMLElement.prototype.setCssStyles) {
        HTMLElement.prototype.setCssStyles = function(styles) {
            if (styles) Object.assign(this.style, styles);
            return this;
        };
    }
    if (!HTMLElement.prototype.setCssProps) {
        HTMLElement.prototype.setCssProps = function(props) {
            if (props) {
                for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
            }
            return this;
        };
    }
    if (!HTMLElement.prototype.onClickEvent) {
        HTMLElement.prototype.onClickEvent = function(listener, options) {
            this.addEventListener('click', listener, options);
        };
    }
    if (!HTMLElement.prototype.onNodeInserted) {
        HTMLElement.prototype.onNodeInserted = function(listener, once) {
            const obs = new MutationObserver(() => {
                if (document.contains(this)) {
                    listener();
                    if (once) obs.disconnect();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
            return () => obs.disconnect();
        };
    }
    if (!HTMLElement.prototype.onWindowMigrated) {
        HTMLElement.prototype.onWindowMigrated = function(listener) { return () => {}; };
    }

    // Node.prototype.doc / .win / .constructorWin
    if (!('doc' in Node.prototype)) {
        Object.defineProperty(Node.prototype, 'doc', {
            get() { return this.ownerDocument || document; },
            configurable: true,
        });
    }
    if (!('win' in Node.prototype)) {
        Object.defineProperty(Node.prototype, 'win', {
            get() { return (this.ownerDocument || document).defaultView || window; },
            configurable: true,
        });
    }
    if (!('constructorWin' in Node.prototype)) {
        Object.defineProperty(Node.prototype, 'constructorWin', {
            get() { return (this.ownerDocument || document).defaultView || window; },
            configurable: true,
        });
    }

    // HTMLElement.prototype.on / .off (delegated event system)
    if (!HTMLElement.prototype.on) {
        HTMLElement.prototype.on = function(type, selector, listener, options) {
            if (!this._EVENTS) this._EVENTS = {};
            if (!this._EVENTS[type]) this._EVENTS[type] = [];
            const callback = (evt) => {
                const target = evt.target;
                if (target && target.closest) {
                    const delegateTarget = target.closest(selector);
                    if (delegateTarget && this.contains(delegateTarget)) {
                        listener.call(this, evt, delegateTarget);
                    }
                }
            };
            this._EVENTS[type].push({ selector, listener, options, callback });
            this.addEventListener(type, callback, options);
        };
    }
    if (!HTMLElement.prototype.off) {
        HTMLElement.prototype.off = function(type, selector, listener, options) {
            if (!this._EVENTS || !this._EVENTS[type]) return;
            const idx = this._EVENTS[type].findIndex(e => e.selector === selector && e.listener === listener);
            if (idx >= 0) {
                const entry = this._EVENTS[type][idx];
                this.removeEventListener(type, entry.callback, options);
                this._EVENTS[type].splice(idx, 1);
            }
        };
    }
    if (!HTMLElement.prototype.trigger) {
        HTMLElement.prototype.trigger = function(eventType) {
            this.dispatchEvent(new Event(eventType, { bubbles: true }));
        };
    }

    // Document.prototype.on / .off (delegated event system)
    if (!Document.prototype.on) {
        Document.prototype.on = function(type, selector, listener, options) {
            if (!this._EVENTS) this._EVENTS = {};
            if (!this._EVENTS[type]) this._EVENTS[type] = [];
            const callback = (evt) => {
                const target = evt.target;
                if (target && target.closest) {
                    const delegateTarget = target.closest(selector);
                    if (delegateTarget) {
                        listener.call(this, evt, delegateTarget);
                    }
                }
            };
            this._EVENTS[type].push({ selector, listener, options, callback });
            this.addEventListener(type, callback, options);
        };
    }
    if (!Document.prototype.off) {
        Document.prototype.off = function(type, selector, listener, options) {
            if (!this._EVENTS || !this._EVENTS[type]) return;
            const idx = this._EVENTS[type].findIndex(e => e.selector === selector && e.listener === listener);
            if (idx >= 0) {
                const entry = this._EVENTS[type][idx];
                this.removeEventListener(type, entry.callback, options);
                this._EVENTS[type].splice(idx, 1);
            }
        };
    }

    // SVGElement extensions
    if (!SVGElement.prototype.setCssStyles) {
        SVGElement.prototype.setCssStyles = function(styles) {
            if (styles) Object.assign(this.style, styles);
            return this;
        };
    }
    if (!SVGElement.prototype.setCssProps) {
        SVGElement.prototype.setCssProps = function(props) {
            if (props) {
                for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
            }
            return this;
        };
    }

    // HTMLElement innerWidth / innerHeight (without padding)
    if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerWidth')?.get) {
        Object.defineProperty(HTMLElement.prototype, 'innerWidth', {
            get() {
                const cs = getComputedStyle(this);
                return this.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            },
            configurable: true,
        });
    }
    if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHeight')?.get) {
        Object.defineProperty(HTMLElement.prototype, 'innerHeight', {
            get() {
                const cs = getComputedStyle(this);
                return this.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            },
            configurable: true,
        });
    }

    // Array.prototype.findLastIndex polyfill
    if (!Array.prototype.findLastIndex) {
        Array.prototype.findLastIndex = function(predicate) {
            for (let i = this.length - 1; i >= 0; i--) {
                if (predicate(this[i], i, this)) return i;
            }
            return -1;
        };
    }

    // Node.prototype extras
    if (!Node.prototype.insertAfter) {
        Node.prototype.insertAfter = function(node, child) {
            if (child && child.nextSibling) this.insertBefore(node, child.nextSibling);
            else this.appendChild(node);
            return node;
        };
    }
    if (!Node.prototype.indexOf) {
        Node.prototype.indexOf = function(other) {
            return Array.from(this.childNodes).indexOf(other);
        };
    }
    if (!Node.prototype.setChildrenInPlace) {
        Node.prototype.setChildrenInPlace = function(children) {
            this.empty?.();
            for (const c of children) this.appendChild(c);
        };
    }
    if (!Node.prototype.appendText) {
        Node.prototype.appendText = function(val) {
            this.appendChild(document.createTextNode(val));
        };
    }
    if (!Node.prototype.instanceOf) {
        Node.prototype.instanceOf = function(type) {
            return this instanceof type;
        };
    }

    // DocumentFragment extensions
    if (!DocumentFragment.prototype.find) {
        DocumentFragment.prototype.find = function(selector) { return this.querySelector(selector); };
    }
    if (!DocumentFragment.prototype.findAll) {
        DocumentFragment.prototype.findAll = function(selector) { return Array.from(this.querySelectorAll(selector)); };
    }

    // Object/Array/Math/String polyfills that Obsidian expects
    if (!Object.isEmpty) {
        Object.isEmpty = function(obj) {
            if (!obj) return true;
            return Object.keys(obj).length === 0;
        };
    }
    if (!Object.each) {
        Object.each = function(obj, callback, context) {
            for (const key of Object.keys(obj)) {
                if (callback.call(context, obj[key], key) === false) return false;
            }
            return true;
        };
    }
    if (!Array.combine) {
        Array.combine = function(arrays) {
            return [].concat(...arrays);
        };
    }
    if (!Array.prototype.first) {
        Array.prototype.first = function() { return this.length > 0 ? this[0] : undefined; };
    }
    if (!Array.prototype.last) {
        Array.prototype.last = function() { return this.length > 0 ? this[this.length - 1] : undefined; };
    }
    if (!Array.prototype.contains) {
        Array.prototype.contains = function(target) { return this.includes(target); };
    }
    if (!Array.prototype.remove) {
        Array.prototype.remove = function(target) {
            const idx = this.indexOf(target);
            if (idx >= 0) this.splice(idx, 1);
        };
    }
    if (!Array.prototype.shuffle) {
        Array.prototype.shuffle = function() {
            for (let i = this.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this[i], this[j]] = [this[j], this[i]];
            }
            return this;
        };
    }
    if (!Array.prototype.unique) {
        Array.prototype.unique = function() { return [...new Set(this)]; };
    }
    if (!Math.clamp) {
        Math.clamp = function(value, min, max) { return Math.min(Math.max(value, min), max); };
    }
    if (!Math.square) {
        Math.square = function(value) { return value * value; };
    }
    if (!String.isString) {
        String.isString = function(obj) { return typeof obj === 'string'; };
    }
    if (!String.prototype.contains) {
        String.prototype.contains = function(target) { return this.includes(target); };
    }
    if (!String.prototype.format) {
        String.prototype.format = function(...args) {
            return this.replace(/{(\d+)}/g, (match, num) => args[num] !== undefined ? args[num] : match);
        };
    }
    if (!Number.isNumber) {
        Number.isNumber = function(obj) { return typeof obj === 'number' && !isNaN(obj); };
    }

    // Global functions
    if (typeof window.isBoolean === 'undefined') {
        window.isBoolean = function(obj) { return typeof obj === 'boolean'; };
    }
    if (typeof window.fish === 'undefined') {
        window.fish = function(selector) { return document.querySelector(selector); };
    }
    if (typeof window.fishAll === 'undefined') {
        window.fishAll = function(selector) { return Array.from(document.querySelectorAll(selector)); };
    }
    if (typeof window.sleep === 'undefined') {
        window.sleep = function(ms) { return new Promise(resolve => setTimeout(resolve, ms)); };
    }
    if (typeof window.nextFrame === 'undefined') {
        window.nextFrame = function() { return new Promise(resolve => requestAnimationFrame(resolve)); };
    }
    if (typeof window.ajax === 'undefined') {
        window.ajax = function(options) {
            const xhr = options.req || new XMLHttpRequest();
            xhr.open(options.method || 'GET', options.url);
            if (options.headers) {
                for (const [k, v] of Object.entries(options.headers)) xhr.setRequestHeader(k, v);
            }
            if (options.withCredentials) xhr.withCredentials = true;
            xhr.onload = () => options.success?.(xhr.response, xhr);
            xhr.onerror = (e) => options.error?.(e, xhr);
            xhr.send(options.data || null);
        };
    }
    if (typeof window.ajaxPromise === 'undefined') {
        window.ajaxPromise = function(options) {
            return new Promise((resolve, reject) => {
                window.ajax({ ...options, success: resolve, error: reject });
            });
        };
    }
    if (typeof window.ready === 'undefined') {
        window.ready = function(fn) {
            if (document.readyState !== 'loading') fn();
            else document.addEventListener('DOMContentLoaded', fn);
        };
    }
    if (typeof window.activeWindow === 'undefined') {
        window.activeWindow = window;
    }
    if (typeof window.activeDocument === 'undefined') {
        window.activeDocument = document;
    }
}

// ===== Global Element Creators =====
function createEl(tag, o, callback) {
    const el = document.createElement(tag);
    if (typeof o === 'string') o = { cls: o };
    _applyElOptions(el, o);
    if (typeof o === 'function') o(el);
    else if (typeof callback === 'function') callback(el);
    return el;
}

function createDiv(o, callback) {
    if (typeof o === 'string') o = { cls: o };
    return createEl('div', o, callback);
}

function createSpan(o, callback) {
    if (typeof o === 'string') o = { cls: o };
    return createEl('span', o, callback);
}

function createSvg(tag, o, callback) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (o && typeof o === 'object') {
        if (o.cls) el.setAttribute('class', Array.isArray(o.cls) ? o.cls.join(' ') : o.cls);
        if (o.attr) {
            for (const [k, v] of Object.entries(o.attr)) {
                if (v != null) el.setAttribute(k, String(v));
            }
        }
    }
    if (typeof callback === 'function') callback(el);
    return el;
}

function createFragment(callback) {
    const frag = document.createDocumentFragment();
    if (typeof callback === 'function') callback(frag);
    return frag;
}

// DOM extensions are installed on-demand by plugin-loader via installDomExtensions()
// Do NOT auto-install — the toggle/show/hide overrides can conflict with app UI code.

// Set global functions
window.createEl = createEl;
window.createDiv = createDiv;
window.createSpan = createSpan;
window.createSvg = createSvg;
window.createFragment = createFragment;
window.setIcon = setIcon;
window.getIconIds = getIconIds;
window.activeDocument = document;
window.activeWindow = window;

// ===== Stubs for exported names that need module-level declarations =====
function requireApiVersion(version) { return true; }
class WorkspaceParent extends WorkspaceItem {}
class WorkspaceFloating extends WorkspaceParent { constructor() { super(); } }
class WorkspaceSidedock extends WorkspaceParent { constructor() { super(); } }
class WorkspaceRibbon { constructor() {} }
class MenuSeparator { constructor(menu) { this.menu = menu; } }
class SettingGroup { constructor(settingEl) { this.settingEl = settingEl; } }
class SecretComponent extends BaseComponent { constructor(inputEl) { super(); this.inputEl = inputEl || document.createElement('input'); this.inputEl.type = 'password'; } getValue() { return this.inputEl.value; } setValue(v) { this.inputEl.value = v; return this; } }
class Tasks { constructor() {} }
function parseFrontMatterEntry(frontmatter, key) { return frontmatter?.[key] ?? null; }
function removeIcon(iconId) { /* no-op stub */ }
function setTooltip(el, tooltip, options) { if (el) el.title = tooltip || ''; }
function prepareSimpleSearch(query) { const lower = query.toLowerCase(); return (text) => text.toLowerCase().includes(lower) ? { score: -1, matches: [] } : null; }
function renderMath(source, display) { const el = document.createElement('span'); el.textContent = source; return el; }
function finishRenderMath() { return Promise.resolve(); }
function loadMathJax() { return Promise.resolve(); }
function loadMermaid() { return Promise.resolve(); }
function loadPdfJs() { return Promise.resolve(); }
function loadPrism() { return Promise.resolve(); }
function isBoolean(obj) { return typeof obj === 'boolean'; }
function fish(selector) { return document.querySelector(selector); }
function fishAll(selector) { return Array.from(document.querySelectorAll(selector)); }
function ajax(options) { /* no-op stub */ }
function ajaxPromise(options) { return Promise.resolve(''); }
function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function nextFrame() { return new Promise(r => requestAnimationFrame(r)); }

// ===== Export all as the 'obsidian' module =====
const ObsidianAPI = {
    apiVersion, requireApiVersion,
    App, Component, Events, Plugin, PluginSettingTab, SettingTab,
    TAbstractFile, TFile, TFolder, Vault, FileSystemAdapter,
    Workspace, WorkspaceLeaf, WorkspaceItem, WorkspaceParent, WorkspaceSplit, WorkspaceTabs,
    WorkspaceRoot, WorkspaceContainer, WorkspaceWindow, WorkspaceFloating,
    WorkspaceSidedock, WorkspaceMobileDrawer, WorkspaceRibbon,
    View, ItemView, EditableFileView, FileView, TextFileView,
    MarkdownView, MarkdownEditView, MarkdownPreviewView, MarkdownSourceView,
    Editor, MetadataCache, FileManager,
    Modal, SuggestModal, FuzzySuggestModal, PopoverSuggest, AbstractInputSuggest,
    EditorSuggest, Notice, Menu, MenuItem, MenuSeparator, Setting, SettingGroup,
    BaseComponent, ValueComponent, AbstractTextComponent,
    TextComponent, TextAreaComponent, ToggleComponent, DropdownComponent,
    SliderComponent, ButtonComponent, ColorComponent, SearchComponent,
    MomentFormatComponent, ExtraButtonComponent, ProgressBarComponent, SecretComponent,
    MarkdownRenderer, MarkdownPreviewRenderer, MarkdownRenderChild,
    Keymap, Scope, Platform, Tasks,
    HoverPopover,
    normalizePath, debounce, parseLinktext, getLinkpath,
    stripHeading, stripHeadingForLink,
    parseFrontMatterTags, parseFrontMatterAliases, parseFrontMatterStringArray, parseFrontMatterEntry,
    parseYaml, stringifyYaml, moment,
    setIcon, addIcon, removeIcon, getIcon, getIconIds, setTooltip,
    requestUrl, request, sanitizeHTMLToDom, htmlToMarkdown,
    hexToArrayBuffer, arrayBufferToHex, arrayBufferToBase64, base64ToArrayBuffer,
    fuzzySearch, prepareQuery, prepareFuzzySearch, prepareSimpleSearch, sortSearchResults,
    renderResults, renderMatches, renderMath, finishRenderMath,
    iterateCacheRefs, getAllTags, resolveSubpath,
    loadMathJax, loadMermaid, loadPdfJs, loadPrism,
    createEl, createDiv, createSpan, createSvg, createFragment,
    isBoolean, fish, fishAll, ajax, ajaxPromise, ready, sleep, nextFrame,
    installDomExtensions,
    MarkdownPostProcessor: null, MarkdownPostProcessorContext: null, ViewCreator: null,
};

window.ObsidianAPI = ObsidianAPI;

export default ObsidianAPI;
export {
    apiVersion, requireApiVersion,
    App, Component, Events, Plugin, PluginSettingTab, SettingTab,
    TAbstractFile, TFile, TFolder, Vault, FileSystemAdapter,
    Workspace, WorkspaceLeaf, WorkspaceItem, WorkspaceParent, WorkspaceSplit, WorkspaceTabs,
    WorkspaceRoot, WorkspaceContainer, WorkspaceWindow, WorkspaceFloating,
    WorkspaceSidedock, WorkspaceMobileDrawer, WorkspaceRibbon,
    View, ItemView, EditableFileView, FileView, TextFileView,
    MarkdownView, MarkdownEditView, MarkdownPreviewView, MarkdownSourceView,
    Editor, MetadataCache, FileManager,
    Modal, SuggestModal, FuzzySuggestModal, PopoverSuggest, AbstractInputSuggest,
    EditorSuggest, Notice, Menu, MenuItem, MenuSeparator, Setting, SettingGroup,
    BaseComponent, ValueComponent, AbstractTextComponent,
    TextComponent, TextAreaComponent, ToggleComponent, DropdownComponent,
    SliderComponent, ButtonComponent, ColorComponent, SearchComponent,
    MomentFormatComponent, ExtraButtonComponent, ProgressBarComponent, SecretComponent,
    MarkdownRenderer, MarkdownPreviewRenderer, MarkdownRenderChild,
    Keymap, Scope, Platform, Tasks,
    HoverPopover,
    normalizePath, debounce, parseLinktext, getLinkpath,
    stripHeading, stripHeadingForLink,
    parseFrontMatterTags, parseFrontMatterAliases, parseFrontMatterStringArray, parseFrontMatterEntry,
    parseYaml, stringifyYaml, moment,
    setIcon, addIcon, removeIcon, getIcon, getIconIds, setTooltip,
    requestUrl, request, sanitizeHTMLToDom, htmlToMarkdown,
    hexToArrayBuffer, arrayBufferToHex, arrayBufferToBase64, base64ToArrayBuffer,
    fuzzySearch, prepareQuery, prepareFuzzySearch, prepareSimpleSearch, sortSearchResults,
    renderResults, renderMatches, renderMath, finishRenderMath,
    iterateCacheRefs, getAllTags, resolveSubpath,
    loadMathJax, loadMermaid, loadPdfJs, loadPrism,
    createEl, createDiv, createSpan, createSvg, createFragment,
    isBoolean, fish, fishAll, ajax, ajaxPromise, ready, sleep, nextFrame,
    installDomExtensions,
};