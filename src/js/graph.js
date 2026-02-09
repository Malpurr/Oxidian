// Oxidian — Graph View (Canvas-based force-directed layout)
const { invoke } = window.__TAURI__.core;

export class GraphView {
    constructor(app, container) {
        this.app = app;
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.edges = [];
        this.animId = null;
        this.dragging = null;
        this.hoveredNode = null;
        this.offsetX = 0;
        this.offsetY = 0;
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
        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(this.container);

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));
    }

    async load() {
        try {
            const data = await invoke('get_graph_data');
            this.initFromData(data);
            this.startSimulation();
        } catch (err) {
            console.error('Failed to load graph data:', err);
        }
    }

    initFromData(data) {
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.nodes = data.nodes.map((n, i) => {
            const angle = (2 * Math.PI * i) / data.nodes.length;
            const r = Math.min(this.width, this.height) * 0.3;
            return {
                id: n.id,
                name: n.name,
                x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
                y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
                vx: 0,
                vy: 0,
                radius: 6,
            };
        });

        const nodeMap = {};
        this.nodes.forEach(n => nodeMap[n.id] = n);

        this.edges = [];
        for (const e of data.edges) {
            const s = nodeMap[e.source];
            const t = nodeMap[e.target];
            if (s && t) {
                this.edges.push({ source: s, target: t });
                // Increase radius for connected nodes
                s.radius = Math.min(12, s.radius + 0.5);
                t.radius = Math.min(12, t.radius + 0.5);
            }
        }
    }

    startSimulation() {
        let iterations = 0;
        const maxIterations = 300;

        const tick = () => {
            if (iterations < maxIterations) {
                this.simulateStep(0.9 - (iterations / maxIterations) * 0.8);
            }
            this.draw();
            iterations++;
            this.animId = requestAnimationFrame(tick);
        };
        tick();
    }

    simulateStep(alpha) {
        const repulsion = 800;
        const attraction = 0.005;
        const centerPull = 0.01;
        const damping = 0.85;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Repulsion between all nodes
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                let force = (repulsion * alpha) / (dist * dist);
                let fx = (dx / dist) * force;
                let fy = (dy / dist) * force;
                a.vx -= fx;
                a.vy -= fy;
                b.vx += fx;
                b.vy += fy;
            }
        }

        // Attraction along edges
        for (const edge of this.edges) {
            let dx = edge.target.x - edge.source.x;
            let dy = edge.target.y - edge.source.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = dist * attraction * alpha;
            let fx = (dx / dist) * force;
            let fy = (dy / dist) * force;
            edge.source.vx += fx;
            edge.source.vy += fy;
            edge.target.vx -= fx;
            edge.target.vy -= fy;
        }

        // Center pull + velocity update
        for (const node of this.nodes) {
            if (this.dragging === node) continue;
            node.vx += (cx - node.x) * centerPull * alpha;
            node.vy += (cy - node.y) * centerPull * alpha;
            node.vx *= damping;
            node.vy *= damping;
            node.x += node.vx;
            node.y += node.vy;
        }
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
            ctx.fillStyle = isHovered ? '#8b7cf3' : '#7f6df2';
            ctx.fill();
            if (isHovered) {
                ctx.strokeStyle = '#a99df5';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Labels
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        for (const node of this.nodes) {
            const isHovered = node === this.hoveredNode;
            ctx.fillStyle = isHovered ? '#dcddde' : 'rgba(220, 221, 222, 0.7)';
            ctx.fillText(node.name, node.x, node.y + node.radius + 14);
        }

        ctx.restore();
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
            this.dragging.vx = 0;
            this.dragging.vy = 0;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        } else if (this.isPanning) {
            this.panX += e.clientX - this.lastMouse.x;
            this.panY += e.clientY - this.lastMouse.y;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        } else {
            const node = this.getNodeAt(mx, my);
            this.hoveredNode = node;
            this.canvas.style.cursor = node ? 'pointer' : 'grab';
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
