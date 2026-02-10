// Oxidian — Canvas/Whiteboard
// Notes als Karten anordnen mit Drag & Drop und Verbindungslinien.
// Daten-Persistenz und CRUD via Rust invoke(), UI/Rendering bleibt JS.

import { invoke } from './tauri-bridge.js';

export class Canvas {
    constructor(app) {
        this.app = app;
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.viewport = { x: 0, y: 0, zoom: 1 };
        this.isConnecting = false;
        this.connectionStart = null;
        this._animationFrame = null;
        this._canvasPath = null; // Path of the currently loaded .canvas file
    }

    init(container) {
        if (!container) return;
        this.container = container;
        this.createCanvasUI();
        this.bindEvents();
        this.startRenderLoop();
    }

    // --- Data: Load/Save via Rust ---

    async loadCanvas(path) {
        try {
            this._canvasPath = path;
            const data = await invoke('load_canvas', { path });
            this._applyCanvasData(data);
        } catch (err) {
            console.error('Failed to load canvas:', err);
        }
    }

    async saveCanvas() {
        const data = {
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values()),
            viewport: this.viewport,
        };

        try {
            const path = this._canvasPath || `canvas-${Date.now()}.canvas`;
            await invoke('save_canvas', { path, data });
            this._canvasPath = path;
            console.log(`Canvas saved: ${path}`);
        } catch (err) {
            console.error('Failed to save canvas:', err);
        }
    }

    _applyCanvasData(data) {
        this.nodes.clear();
        this.connections.clear();

        // Remove existing DOM nodes
        if (this.nodesContainer) this.nodesContainer.innerHTML = '';

        if (data.nodes) {
            for (const n of data.nodes) {
                this.nodes.set(n.id, n);
                this.createNodeElement(n);
            }
        }
        if (data.connections) {
            for (const c of data.connections) {
                this.connections.set(c.id || `${c.from}-${c.to}`, c);
            }
        }
        if (data.viewport) {
            this.viewport = { ...this.viewport, ...data.viewport };
        }
    }

    // --- Node CRUD via Rust ---

    async addNoteCard() {
        const pos = this.getMousePosition();
        try {
            const node = await invoke('canvas_add_node', {
                canvasPath: this._canvasPath,
                nodeType: 'note',
                x: pos.x - 100,
                y: pos.y - 75,
                width: 200,
                height: 150,
                content: 'New Note',
            });
            this.nodes.set(node.id, node);
            this.createNodeElement(node);
        } catch (err) {
            console.error('Failed to add note card:', err);
        }
    }

    async addTextBox() {
        const pos = this.getMousePosition();
        try {
            const node = await invoke('canvas_add_node', {
                canvasPath: this._canvasPath,
                nodeType: 'text',
                x: pos.x - 100,
                y: pos.y - 50,
                width: 200,
                height: 100,
                content: 'Text Box',
            });
            this.nodes.set(node.id, node);
            this.createNodeElement(node);
        } catch (err) {
            console.error('Failed to add text box:', err);
        }
    }

    async addGroup() {
        const pos = this.getMousePosition();
        try {
            const node = await invoke('canvas_add_node', {
                canvasPath: this._canvasPath,
                nodeType: 'group',
                x: pos.x - 150,
                y: pos.y - 100,
                width: 300,
                height: 200,
                content: 'Group',
            });
            this.nodes.set(node.id, node);
            this.createNodeElement(node);
        } catch (err) {
            console.error('Failed to add group:', err);
        }
    }

    async moveNode(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        node.x = x;
        node.y = y;
        this.updateNodeElement(node);
        try {
            await invoke('canvas_move_node', {
                canvasPath: this._canvasPath,
                nodeId,
                x,
                y,
            });
        } catch (err) {
            console.error('Failed to move node:', err);
        }
    }

    async deleteNode(nodeId) {
        const element = this.nodesContainer?.querySelector(`[data-node-id="${nodeId}"]`);
        if (element) element.remove();

        this.nodes.delete(nodeId);

        // Remove connections to/from this node
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                this.connections.delete(id);
            }
        });

        if (this.selectedNode?.id === nodeId) {
            this.selectedNode = null;
        }

        try {
            await invoke('canvas_delete_node', {
                canvasPath: this._canvasPath,
                nodeId,
            });
        } catch (err) {
            console.error('Failed to delete node:', err);
        }
    }

    async addConnection(fromId, toId) {
        try {
            const conn = await invoke('canvas_add_edge', {
                canvasPath: this._canvasPath,
                from: fromId,
                to: toId,
            });
            this.connections.set(conn.id || `${fromId}-${toId}`, conn);
        } catch (err) {
            console.error('Failed to add connection:', err);
        }
    }

    // --- UI Creation (unchanged) ---

    createCanvasUI() {
        this.container.innerHTML = `
            <div class="canvas-wrapper">
                <div class="canvas-toolbar">
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-add-note" title="Add Note Card">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="12" y1="18" x2="12" y2="12"/>
                                <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                            Add Note
                        </button>
                        <button class="canvas-btn" id="canvas-add-text" title="Add Text Box">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="4 7 4 4 20 4 20 7"/>
                                <line x1="9" y1="20" x2="15" y2="20"/>
                                <line x1="12" y1="4" x2="12" y2="20"/>
                            </svg>
                            Add Text
                        </button>
                        <button class="canvas-btn" id="canvas-add-group" title="Add Group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <rect x="7" y="7" width="10" height="10" rx="1" ry="1"/>
                            </svg>
                            Add Group
                        </button>
                    </div>
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-zoom-in" title="Zoom In">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                                <line x1="11" y1="8" x2="11" y2="14"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </button>
                        <button class="canvas-btn" id="canvas-zoom-out" title="Zoom Out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </button>
                        <button class="canvas-btn" id="canvas-fit" title="Fit to Screen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
                            </svg>
                        </button>
                    </div>
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-save" title="Save Canvas">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
                <div class="canvas-viewport">
                    <canvas class="canvas-main" width="800" height="600"></canvas>
                    <div class="canvas-nodes"></div>
                </div>
                <div class="canvas-minimap">
                    <canvas class="canvas-minimap-canvas" width="200" height="150"></canvas>
                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('.canvas-main');
        this.ctx = this.canvas.getContext('2d');
        this.nodesContainer = this.container.querySelector('.canvas-nodes');
        this.resizeCanvas();
    }

    bindEvents() {
        if (!this.container) return;

        document.getElementById('canvas-add-note')?.addEventListener('click', () => this.addNoteCard());
        document.getElementById('canvas-add-text')?.addEventListener('click', () => this.addTextBox());
        document.getElementById('canvas-add-group')?.addEventListener('click', () => this.addGroup());
        document.getElementById('canvas-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('canvas-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('canvas-fit')?.addEventListener('click', () => this.fitToScreen());
        document.getElementById('canvas-save')?.addEventListener('click', () => this.saveCanvas());

        this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.canvas.addEventListener('wheel', (e) => this.onCanvasWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.onCanvasDoubleClick(e));

        this._boundMouseMove = (e) => this.onCanvasMouseMove(e);
        this._boundMouseUp = (e) => this.onCanvasMouseUp(e);
        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);

        this._boundTouchMove = (e) => {
            if (this.draggedNode) {
                e.preventDefault();
                this.onCanvasMouseMove(e.touches[0]);
            }
        };
        this._boundTouchEnd = (e) => this.onCanvasMouseUp(e);
        document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        document.addEventListener('touchend', this._boundTouchEnd);

        window.addEventListener('resize', () => this.resizeCanvas());

        this._boundKeyDown = (e) => this.onKeyDown(e);
        document.addEventListener('keydown', this._boundKeyDown);
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);
    }

    startRenderLoop() {
        const render = () => {
            this.render();
            this._animationFrame = requestAnimationFrame(render);
        };
        render();
    }

    stopRenderLoop() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.save();
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
        this.drawGrid();
        this.drawConnections();
        if (this.isConnecting && this.connectionStart) {
            this.drawConnectionPreview();
        }
        this.ctx.restore();
    }

    drawGrid() {
        const gridSize = 20;
        const { width, height } = this.canvas;
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x < width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
        this.ctx.stroke();
    }

    drawConnections() {
        this.connections.forEach(connection => {
            const fromNode = this.nodes.get(connection.from);
            const toNode = this.nodes.get(connection.to);
            if (!fromNode || !toNode) return;
            const fromPoint = this.getConnectionPoint(fromNode, 'output');
            const toPoint = this.getConnectionPoint(toNode, 'input');
            this.drawConnection(fromPoint, toPoint);
        });
    }

    drawConnection(from, to) {
        const controlOffset = 50;
        this.ctx.strokeStyle = '#007acc';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.bezierCurveTo(
            from.x + controlOffset, from.y,
            to.x - controlOffset, to.y,
            to.x, to.y
        );
        this.ctx.stroke();
        this.drawArrow(to.x, to.y, Math.PI);
    }

    drawArrow(x, y, angle) {
        const size = 8;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#007acc';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-size, -size / 2);
        this.ctx.lineTo(-size, size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawConnectionPreview() {
        if (!this.connectionStart) return;
        const mousePos = this.getMousePosition();
        this.ctx.strokeStyle = 'rgba(0, 122, 204, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.connectionStart.x, this.connectionStart.y);
        this.ctx.lineTo(mousePos.x, mousePos.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    getConnectionPoint(node, type) {
        const centerY = node.y + node.height / 2;
        if (type === 'output') {
            return { x: node.x + node.width, y: centerY };
        } else {
            return { x: node.x, y: centerY };
        }
    }

    createNodeElement(node) {
        const element = document.createElement('div');
        element.className = `canvas-node canvas-node-${node.type}`;
        element.dataset.nodeId = node.id;
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
        element.style.width = `${node.width}px`;
        element.style.height = `${node.height}px`;

        if (node.type === 'note') {
            element.innerHTML = `
                <div class="canvas-node-header">
                    <div class="canvas-node-title">${this.escapeHtml(node.content)}</div>
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-connect" title="Connect">⟷</button>
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">✕</button>
                    </div>
                </div>
                <div class="canvas-node-content">
                    <div class="canvas-node-preview">Click to select a note...</div>
                </div>
            `;
        } else if (node.type === 'text') {
            element.innerHTML = `
                <div class="canvas-node-header">
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-connect" title="Connect">⟷</button>
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">✕</button>
                    </div>
                </div>
                <textarea class="canvas-text-content" placeholder="Enter text...">${this.escapeHtml(node.content)}</textarea>
            `;
        } else if (node.type === 'group') {
            element.innerHTML = `
                <div class="canvas-node-header">
                    <input class="canvas-group-title" value="${this.escapeHtml(node.content)}" placeholder="Group name">
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">✕</button>
                    </div>
                </div>
            `;
            element.style.backgroundColor = node.color || 'rgba(0, 122, 204, 0.1)';
        }

        this.bindNodeEvents(element, node);
        this.nodesContainer.appendChild(element);
    }

    bindNodeEvents(element, node) {
        element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            this.onNodeMouseDown(e, node);
        });
        element.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            e.preventDefault();
            this.onNodeMouseDown(e.touches[0], node);
        }, { passive: false });

        const connectBtn = element.querySelector('.canvas-node-connect');
        connectBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startConnection(node);
        });

        const deleteBtn = element.querySelector('.canvas-node-delete');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(node.id);
        });

        if (node.type === 'text') {
            const textarea = element.querySelector('.canvas-text-content');
            textarea?.addEventListener('input', (e) => {
                node.content = e.target.value;
            });
        } else if (node.type === 'group') {
            const titleInput = element.querySelector('.canvas-group-title');
            titleInput?.addEventListener('input', (e) => {
                node.content = e.target.value;
            });
        }
    }

    // --- Event handlers ---

    onCanvasMouseDown(e) {
        this.selectedNode = null;
    }

    onCanvasMouseMove(e) {
        if (this.draggedNode) {
            const mousePos = this.getMousePosition(e);
            this.draggedNode.x = mousePos.x - this.dragOffset.x;
            this.draggedNode.y = mousePos.y - this.dragOffset.y;
            this.updateNodeElement(this.draggedNode);
        }
    }

    onCanvasMouseUp(e) {
        if (this.draggedNode) {
            // Persist position to Rust
            this.moveNode(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y);
        }
        this.draggedNode = null;
        if (this.isConnecting) {
            this.isConnecting = false;
            this.connectionStart = null;
        }
    }

    onCanvasWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const mousePos = this.getMousePosition(e);
        this.viewport.zoom *= delta;
        this.viewport.zoom = Math.max(0.1, Math.min(3, this.viewport.zoom));
        this.viewport.x = mousePos.x - (mousePos.x - this.viewport.x) * delta;
        this.viewport.y = mousePos.y - (mousePos.y - this.viewport.y) * delta;
    }

    onCanvasDoubleClick(e) {
        this.addNoteCard();
    }

    onNodeMouseDown(e, node) {
        if (e.stopPropagation) e.stopPropagation();
        this.selectedNode = node;
        this.draggedNode = node;
        const mousePos = this.getMousePosition(e);
        this.dragOffset.x = mousePos.x - node.x;
        this.dragOffset.y = mousePos.y - node.y;
    }

    onKeyDown(e) {
        if (e.key === 'Delete' && this.selectedNode) {
            this.deleteNode(this.selectedNode.id);
        }
    }

    // --- Utility ---

    getMousePosition(e) {
        if (!e) return { x: 400, y: 300 };
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.viewport.x) / this.viewport.zoom,
            y: (e.clientY - rect.top - this.viewport.y) / this.viewport.zoom,
        };
    }

    updateNodeElement(node) {
        const element = this.nodesContainer?.querySelector(`[data-node-id="${node.id}"]`);
        if (element) {
            element.style.left = `${node.x}px`;
            element.style.top = `${node.y}px`;
        }
    }

    startConnection(node) {
        this.isConnecting = true;
        this.connectionStart = this.getConnectionPoint(node, 'output');
        this.connectionStart.nodeId = node.id;
    }

    zoomIn() {
        this.viewport.zoom = Math.min(3, this.viewport.zoom * 1.2);
    }

    zoomOut() {
        this.viewport.zoom = Math.max(0.1, this.viewport.zoom / 1.2);
    }

    fitToScreen() {
        if (this.nodes.size === 0) {
            this.viewport = { x: 0, y: 0, zoom: 1 };
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });
        const padding = 50;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        const scaleX = this.canvas.width / contentWidth;
        const scaleY = this.canvas.height / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        this.viewport.zoom = scale;
        this.viewport.x = (this.canvas.width - contentWidth * scale) / 2 - minX * scale + padding * scale;
        this.viewport.y = (this.canvas.height - contentHeight * scale) / 2 - minY * scale + padding * scale;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        this.stopRenderLoop();
        if (this._boundKeyDown) {
            document.removeEventListener('keydown', this._boundKeyDown);
            this._boundKeyDown = null;
        }
        if (this._boundMouseMove) {
            document.removeEventListener('mousemove', this._boundMouseMove);
            this._boundMouseMove = null;
        }
        if (this._boundMouseUp) {
            document.removeEventListener('mouseup', this._boundMouseUp);
            this._boundMouseUp = null;
        }
        if (this._boundTouchMove) {
            document.removeEventListener('touchmove', this._boundTouchMove);
            this._boundTouchMove = null;
        }
        if (this._boundTouchEnd) {
            document.removeEventListener('touchend', this._boundTouchEnd);
            this._boundTouchEnd = null;
        }
        this.nodes.clear();
        this.connections.clear();
        this.selectedNode = null;
        this.draggedNode = null;
        this.container = null;
    }
}
