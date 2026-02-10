// Oxidian — Graph View (Canvas-based, layout computed in Rust)
import { invoke } from './tauri-bridge.js';

export class GraphView {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.nodeMap = {};
        this.animId = null;
        this.dragging = null;
        this.hoveredNode = null;
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastMouse = { x: 0, y: 0 };

        this.resize();
        this.bindEvents();
        this.load();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = rect.width;
        this.height = rect.height;
    }

    bindEvents() {
        this._resizeObserver = new ResizeObserver(() => {
            this.resize();
            this.draw();
        });
        this._resizeObserver.observe(this.container);

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));
    }

    /**
     * Load graph data with pre-computed layout from Rust (Fruchterman-Reingold).
     * Returns { nodes: [{id, label, x, y, radius, color, tags}], edges: [{source, target}] }
     */
    async load(filter) {
        try {
            const vaultPath = this.app.vaultPath || '';
            const data = await invoke('compute_graph', { vaultPath, filter: filter || null });
            this.setGraphData(data);
            this.draw();
        } catch (err) {
            console.error('Failed to load graph data:', err);
        }
    }

    /**
     * Set pre-positioned graph data from Rust. No JS layout computation.
     */
    setGraphData(data) {
        this.nodes = (data.nodes || []).map(n => ({
            id: n.id,
            label: n.label,
            x: n.x,
            y: n.y,
            radius: n.radius || 6,
            color: n.color || '#7f6df2',
            tags: n.tags || [],
        }));

        this.nodeMap = {};
        this.nodes.forEach(n => this.nodeMap[n.id] = n);

        this.edges = (data.edges || []).map(e => ({
            source: this.nodeMap[e.source],
            target: this.nodeMap[e.target],
        })).filter(e => e.source && e.target);
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.scale, this.scale);

        // Edges
        ctx.strokeStyle = 'rgba(127, 109, 242, 0.25)';
        ctx.lineWidth = 1;
        for (const edge of this.edges) {
            ctx.beginPath();
            ctx.moveTo(edge.source.x, edge.source.y);
            ctx.lineTo(edge.target.x, edge.target.y);
            ctx.stroke();
        }

        // Nodes
        for (const node of this.nodes) {
            const isHovered = node === this.hoveredNode;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fillStyle = isHovered ? this._lighten(node.color) : node.color;
            ctx.fill();
            if (isHovered) {
                ctx.strokeStyle = this._lighten(node.color);
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        // Labels
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        for (const node of this.nodes) {
            const isHovered = node === this.hoveredNode;
            ctx.fillStyle = isHovered ? '#dcddde' : 'rgba(220, 221, 222, 0.7)';
            ctx.fillText(node.label, node.x, node.y + node.radius + 14);
        }

        ctx.restore();
    }

    _lighten(hex) {
        // Simple lighten for hover — shift towards white
        try {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const f = 0.3;
            return `rgb(${Math.round(r + (255 - r) * f)}, ${Math.round(g + (255 - g) * f)}, ${Math.round(b + (255 - b) * f)})`;
        } catch {
            return '#a99df5';
        }
    }

    getNodeAt(mx, my) {
        const x = (mx - this.panX) / this.scale;
        const y = (my - this.panY) / this.scale;
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const dx = n.x - x;
            const dy = n.y - y;
            if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
                return n;
            }
        }
        return null;
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const node = this.getNodeAt(mx, my);

        if (node) {
            this.dragging = node;
        } else {
            this.isPanning = true;
        }
        this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this.dragging) {
            const dx = (e.clientX - this.lastMouse.x) / this.scale;
            const dy = (e.clientY - this.lastMouse.y) / this.scale;
            this.dragging.x += dx;
            this.dragging.y += dy;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.draw();
        } else if (this.isPanning) {
            this.panX += e.clientX - this.lastMouse.x;
            this.panY += e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.draw();
        } else {
            const node = this.getNodeAt(mx, my);
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                this.canvas.style.cursor = node ? 'pointer' : 'grab';
                this.draw();
            }
        }
    }

    onMouseUp() {
        this.dragging = null;
        this.isPanning = false;
    }

    onWheel(e) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        this.scale = Math.max(0.2, Math.min(4, this.scale * factor));
        this.draw();
    }

    onDblClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const node = this.getNodeAt(mx, my);
        if (node) {
            this.app.openFile(node.id);
        }
    }

    destroy() {
        if (this.animId) cancelAnimationFrame(this.animId);
        if (this._resizeObserver) this._resizeObserver.disconnect();
    }
}
