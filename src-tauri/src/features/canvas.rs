// Oxidian — Canvas data model (Obsidian .canvas format compatible)
//
// Implements load/save/CRUD for .canvas files using Obsidian's JSON format.
// See: https://jsoncanvas.org/ and Obsidian's canvas spec.

use serde::{Deserialize, Serialize};
use std::path::Path;

// ─── Obsidian .canvas format types ──────────────────────────────────────────

/// Root canvas file structure — matches Obsidian's .canvas JSON exactly
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Canvas {
    pub nodes: Vec<CanvasNode>,
    pub edges: Vec<CanvasEdge>,
}

/// A node on the canvas. The `type` field determines which fields are used.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasNode {
    pub id: String,
    /// x position
    pub x: f64,
    /// y position
    pub y: f64,
    pub width: f64,
    pub height: f64,
    /// Node type: "text", "file", "link", "group"
    #[serde(rename = "type")]
    pub node_type: CanvasNodeType,

    // ── Type-specific fields (all optional, present based on node_type) ──

    /// Text content (for "text" nodes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// File path relative to vault (for "file" nodes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,

    /// Sub-path within file, e.g. heading reference (for "file" nodes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subpath: Option<String>,

    /// URL (for "link" nodes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Color: "1"-"6" (preset) or "#hexcolor" (for any node type)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,

    /// Label/title for group nodes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    /// Background style for group nodes (default if absent)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "backgroundStyle")]
    pub background_style: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CanvasNodeType {
    Text,
    File,
    Link,
    Group,
}

/// An edge connecting two nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasEdge {
    pub id: String,
    /// Source node id
    #[serde(rename = "fromNode")]
    pub from_node: String,
    /// Source side: "top", "right", "bottom", "left" (optional)
    #[serde(rename = "fromSide", skip_serializing_if = "Option::is_none")]
    pub from_side: Option<CanvasSide>,
    /// Source end: "none" or "arrow" (optional)
    #[serde(rename = "fromEnd", skip_serializing_if = "Option::is_none")]
    pub from_end: Option<CanvasEnd>,
    /// Target node id
    #[serde(rename = "toNode")]
    pub to_node: String,
    /// Target side
    #[serde(rename = "toSide", skip_serializing_if = "Option::is_none")]
    pub to_side: Option<CanvasSide>,
    /// Target end: "none" or "arrow"
    #[serde(rename = "toEnd", skip_serializing_if = "Option::is_none")]
    pub to_end: Option<CanvasEnd>,

    /// Edge color
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,

    /// Edge label
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CanvasSide {
    Top,
    Right,
    Bottom,
    Left,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CanvasEnd {
    None,
    Arrow,
}

// ─── Viewport state (stored separately, not part of .canvas file) ───────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasViewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

impl Default for CanvasViewport {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0, zoom: 1.0 }
    }
}

// ─── Canvas operations ──────────────────────────────────────────────────────

impl Canvas {
    /// Create an empty canvas
    pub fn new() -> Self {
        Self::default()
    }

    /// Load a .canvas file from disk
    pub fn load(path: &Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read canvas file: {}", e))?;

        // Handle empty files
        if content.trim().is_empty() {
            return Ok(Self::new());
        }

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse canvas JSON: {}", e))
    }

    /// Save the canvas to a .canvas file
    pub fn save(&self, path: &Path) -> Result<(), String> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize canvas: {}", e))?;

        std::fs::write(path, json)
            .map_err(|e| format!("Failed to write canvas file: {}", e))
    }

    /// Serialize to JSON string
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize canvas: {}", e))
    }

    /// Deserialize from JSON string
    pub fn from_json(json: &str) -> Result<Self, String> {
        if json.trim().is_empty() {
            return Ok(Self::new());
        }
        serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse canvas JSON: {}", e))
    }

    // ── Node CRUD ───────────────────────────────────────────────────────

    /// Generate a unique node ID (16-char hex, matching Obsidian's format)
    pub fn generate_id() -> String {
        uuid::Uuid::new_v4().to_string().replace('-', "")[..16].to_string()
    }

    /// Add a text node
    pub fn add_text_node(&mut self, x: f64, y: f64, width: f64, height: f64, text: &str) -> String {
        let id = Self::generate_id();
        self.nodes.push(CanvasNode {
            id: id.clone(),
            x,
            y,
            width,
            height,
            node_type: CanvasNodeType::Text,
            text: Some(text.to_string()),
            file: None,
            subpath: None,
            url: None,
            color: None,
            label: None,
            background_style: None,
        });
        id
    }

    /// Add a file node (embed a vault file on the canvas)
    pub fn add_file_node(&mut self, x: f64, y: f64, width: f64, height: f64, file: &str, subpath: Option<&str>) -> String {
        let id = Self::generate_id();
        self.nodes.push(CanvasNode {
            id: id.clone(),
            x,
            y,
            width,
            height,
            node_type: CanvasNodeType::File,
            text: None,
            file: Some(file.to_string()),
            subpath: subpath.map(|s| s.to_string()),
            url: None,
            color: None,
            label: None,
            background_style: None,
        });
        id
    }

    /// Add a link node (embed a URL on the canvas)
    pub fn add_link_node(&mut self, x: f64, y: f64, width: f64, height: f64, url: &str) -> String {
        let id = Self::generate_id();
        self.nodes.push(CanvasNode {
            id: id.clone(),
            x,
            y,
            width,
            height,
            node_type: CanvasNodeType::Link,
            text: None,
            file: None,
            subpath: None,
            url: Some(url.to_string()),
            color: None,
            label: None,
            background_style: None,
        });
        id
    }

    /// Add a group node
    pub fn add_group_node(&mut self, x: f64, y: f64, width: f64, height: f64, label: Option<&str>) -> String {
        let id = Self::generate_id();
        self.nodes.push(CanvasNode {
            id: id.clone(),
            x,
            y,
            width,
            height,
            node_type: CanvasNodeType::Group,
            text: None,
            file: None,
            subpath: None,
            url: None,
            color: None,
            label: label.map(|s| s.to_string()),
            background_style: None,
        });
        id
    }

    /// Get a node by id
    pub fn get_node(&self, id: &str) -> Option<&CanvasNode> {
        self.nodes.iter().find(|n| n.id == id)
    }

    /// Get a mutable node by id
    pub fn get_node_mut(&mut self, id: &str) -> Option<&mut CanvasNode> {
        self.nodes.iter_mut().find(|n| n.id == id)
    }

    /// Update a node's position
    pub fn move_node(&mut self, id: &str, x: f64, y: f64) -> bool {
        if let Some(node) = self.get_node_mut(id) {
            node.x = x;
            node.y = y;
            true
        } else {
            false
        }
    }

    /// Resize a node
    pub fn resize_node(&mut self, id: &str, width: f64, height: f64) -> bool {
        if let Some(node) = self.get_node_mut(id) {
            node.width = width;
            node.height = height;
            true
        } else {
            false
        }
    }

    /// Set node color
    pub fn set_node_color(&mut self, id: &str, color: Option<&str>) -> bool {
        if let Some(node) = self.get_node_mut(id) {
            node.color = color.map(|s| s.to_string());
            true
        } else {
            false
        }
    }

    /// Update text content (for text nodes)
    pub fn set_node_text(&mut self, id: &str, text: &str) -> bool {
        if let Some(node) = self.get_node_mut(id) {
            node.text = Some(text.to_string());
            true
        } else {
            false
        }
    }

    /// Delete a node and all connected edges
    pub fn delete_node(&mut self, id: &str) -> bool {
        let before = self.nodes.len();
        self.nodes.retain(|n| n.id != id);
        if self.nodes.len() < before {
            // Remove connected edges
            self.edges.retain(|e| e.from_node != id && e.to_node != id);
            true
        } else {
            false
        }
    }

    // ── Edge CRUD ───────────────────────────────────────────────────────

    /// Add an edge between two nodes
    pub fn add_edge(
        &mut self,
        from_node: &str,
        to_node: &str,
        from_side: Option<CanvasSide>,
        to_side: Option<CanvasSide>,
        label: Option<&str>,
    ) -> String {
        let id = Self::generate_id();
        self.edges.push(CanvasEdge {
            id: id.clone(),
            from_node: from_node.to_string(),
            from_side,
            from_end: None,
            to_node: to_node.to_string(),
            to_side,
            to_end: Some(CanvasEnd::Arrow),
            color: None,
            label: label.map(|s| s.to_string()),
        });
        id
    }

    /// Get an edge by id
    pub fn get_edge(&self, id: &str) -> Option<&CanvasEdge> {
        self.edges.iter().find(|e| e.id == id)
    }

    /// Get a mutable edge by id
    pub fn get_edge_mut(&mut self, id: &str) -> Option<&mut CanvasEdge> {
        self.edges.iter_mut().find(|e| e.id == id)
    }

    /// Set edge label
    pub fn set_edge_label(&mut self, id: &str, label: Option<&str>) -> bool {
        if let Some(edge) = self.get_edge_mut(id) {
            edge.label = label.map(|s| s.to_string());
            true
        } else {
            false
        }
    }

    /// Set edge color
    pub fn set_edge_color(&mut self, id: &str, color: Option<&str>) -> bool {
        if let Some(edge) = self.get_edge_mut(id) {
            edge.color = color.map(|s| s.to_string());
            true
        } else {
            false
        }
    }

    /// Delete an edge
    pub fn delete_edge(&mut self, id: &str) -> bool {
        let before = self.edges.len();
        self.edges.retain(|e| e.id != id);
        self.edges.len() < before
    }

    // ── Query helpers ───────────────────────────────────────────────────

    /// Get all edges connected to a node
    pub fn edges_for_node(&self, node_id: &str) -> Vec<&CanvasEdge> {
        self.edges.iter()
            .filter(|e| e.from_node == node_id || e.to_node == node_id)
            .collect()
    }

    /// Get all nodes of a specific type
    pub fn nodes_of_type(&self, node_type: CanvasNodeType) -> Vec<&CanvasNode> {
        self.nodes.iter()
            .filter(|n| n.node_type == node_type)
            .collect()
    }

    /// Find nodes within a bounding box (for group membership, viewport culling)
    pub fn nodes_in_rect(&self, x: f64, y: f64, w: f64, h: f64) -> Vec<&CanvasNode> {
        self.nodes.iter()
            .filter(|n| {
                n.x >= x && n.y >= y
                    && n.x + n.width <= x + w
                    && n.y + n.height <= y + h
            })
            .collect()
    }

    /// Get nodes contained within a group node
    pub fn nodes_in_group(&self, group_id: &str) -> Vec<&CanvasNode> {
        if let Some(group) = self.get_node(group_id) {
            if group.node_type != CanvasNodeType::Group {
                return vec![];
            }
            self.nodes.iter()
                .filter(|n| {
                    n.id != group_id
                        && n.x >= group.x
                        && n.y >= group.y
                        && n.x + n.width <= group.x + group.width
                        && n.y + n.height <= group.y + group.height
                })
                .collect()
        } else {
            vec![]
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    

    #[test]
    fn test_empty_canvas() {
        let canvas = Canvas::new();
        assert!(canvas.nodes.is_empty());
        assert!(canvas.edges.is_empty());
    }

    #[test]
    fn test_add_text_node() {
        let mut canvas = Canvas::new();
        let id = canvas.add_text_node(100.0, 200.0, 250.0, 60.0, "Hello world");

        assert_eq!(canvas.nodes.len(), 1);
        let node = canvas.get_node(&id).unwrap();
        assert_eq!(node.node_type, CanvasNodeType::Text);
        assert_eq!(node.text.as_deref(), Some("Hello world"));
        assert_eq!(node.x, 100.0);
        assert_eq!(node.y, 200.0);
    }

    #[test]
    fn test_add_file_node() {
        let mut canvas = Canvas::new();
        let id = canvas.add_file_node(0.0, 0.0, 400.0, 300.0, "notes/my-note.md", Some("#heading"));

        let node = canvas.get_node(&id).unwrap();
        assert_eq!(node.node_type, CanvasNodeType::File);
        assert_eq!(node.file.as_deref(), Some("notes/my-note.md"));
        assert_eq!(node.subpath.as_deref(), Some("#heading"));
    }

    #[test]
    fn test_add_link_node() {
        let mut canvas = Canvas::new();
        let id = canvas.add_link_node(50.0, 50.0, 400.0, 300.0, "https://example.com");

        let node = canvas.get_node(&id).unwrap();
        assert_eq!(node.node_type, CanvasNodeType::Link);
        assert_eq!(node.url.as_deref(), Some("https://example.com"));
    }

    #[test]
    fn test_add_group_node() {
        let mut canvas = Canvas::new();
        let id = canvas.add_group_node(-100.0, -100.0, 500.0, 400.0, Some("My Group"));

        let node = canvas.get_node(&id).unwrap();
        assert_eq!(node.node_type, CanvasNodeType::Group);
        assert_eq!(node.label.as_deref(), Some("My Group"));
    }

    #[test]
    fn test_add_edge() {
        let mut canvas = Canvas::new();
        let n1 = canvas.add_text_node(0.0, 0.0, 200.0, 100.0, "Node 1");
        let n2 = canvas.add_text_node(300.0, 0.0, 200.0, 100.0, "Node 2");
        let eid = canvas.add_edge(&n1, &n2, Some(CanvasSide::Right), Some(CanvasSide::Left), Some("relates to"));

        assert_eq!(canvas.edges.len(), 1);
        let edge = canvas.get_edge(&eid).unwrap();
        assert_eq!(edge.from_node, n1);
        assert_eq!(edge.to_node, n2);
        assert_eq!(edge.label.as_deref(), Some("relates to"));
        assert_eq!(edge.from_side, Some(CanvasSide::Right));
        assert_eq!(edge.to_side, Some(CanvasSide::Left));
        assert_eq!(edge.to_end, Some(CanvasEnd::Arrow));
    }

    #[test]
    fn test_delete_node_removes_edges() {
        let mut canvas = Canvas::new();
        let n1 = canvas.add_text_node(0.0, 0.0, 100.0, 100.0, "A");
        let n2 = canvas.add_text_node(200.0, 0.0, 100.0, 100.0, "B");
        let n3 = canvas.add_text_node(400.0, 0.0, 100.0, 100.0, "C");
        canvas.add_edge(&n1, &n2, None, None, None);
        canvas.add_edge(&n2, &n3, None, None, None);

        assert_eq!(canvas.edges.len(), 2);
        canvas.delete_node(&n2);
        assert_eq!(canvas.nodes.len(), 2);
        assert_eq!(canvas.edges.len(), 0, "Edges connected to deleted node should be removed");
    }

    #[test]
    fn test_move_and_resize() {
        let mut canvas = Canvas::new();
        let id = canvas.add_text_node(0.0, 0.0, 100.0, 50.0, "test");

        canvas.move_node(&id, 500.0, 300.0);
        canvas.resize_node(&id, 200.0, 150.0);

        let node = canvas.get_node(&id).unwrap();
        assert_eq!(node.x, 500.0);
        assert_eq!(node.y, 300.0);
        assert_eq!(node.width, 200.0);
        assert_eq!(node.height, 150.0);
    }

    #[test]
    fn test_set_color() {
        let mut canvas = Canvas::new();
        let nid = canvas.add_text_node(0.0, 0.0, 100.0, 50.0, "colored");
        canvas.set_node_color(&nid, Some("1"));
        assert_eq!(canvas.get_node(&nid).unwrap().color.as_deref(), Some("1"));

        canvas.set_node_color(&nid, Some("#ff0000"));
        assert_eq!(canvas.get_node(&nid).unwrap().color.as_deref(), Some("#ff0000"));
    }

    #[test]
    fn test_json_roundtrip() {
        let mut canvas = Canvas::new();
        let n1 = canvas.add_text_node(10.0, 20.0, 250.0, 60.0, "Hello **world**");
        let n2 = canvas.add_file_node(300.0, 20.0, 400.0, 400.0, "daily/2024-01-01.md", None);
        let n3 = canvas.add_link_node(10.0, 200.0, 400.0, 300.0, "https://obsidian.md");
        let g = canvas.add_group_node(-50.0, -50.0, 800.0, 600.0, Some("Everything"));
        canvas.add_edge(&n1, &n2, Some(CanvasSide::Right), Some(CanvasSide::Left), Some("references"));
        canvas.set_node_color(&n1, Some("4"));

        let json = canvas.to_json().unwrap();
        let loaded = Canvas::from_json(&json).unwrap();

        assert_eq!(loaded.nodes.len(), 4);
        assert_eq!(loaded.edges.len(), 1);

        // Verify text node
        let text_node = loaded.get_node(&n1).unwrap();
        assert_eq!(text_node.node_type, CanvasNodeType::Text);
        assert_eq!(text_node.text.as_deref(), Some("Hello **world**"));
        assert_eq!(text_node.color.as_deref(), Some("4"));

        // Verify file node
        let file_node = loaded.get_node(&n2).unwrap();
        assert_eq!(file_node.file.as_deref(), Some("daily/2024-01-01.md"));

        // Verify link node
        let link_node = loaded.get_node(&n3).unwrap();
        assert_eq!(link_node.url.as_deref(), Some("https://obsidian.md"));

        // Verify group
        let group_node = loaded.get_node(&g).unwrap();
        assert_eq!(group_node.label.as_deref(), Some("Everything"));

        // Verify edge
        let edge = &loaded.edges[0];
        assert_eq!(edge.label.as_deref(), Some("references"));
        assert_eq!(edge.from_side, Some(CanvasSide::Right));
    }

    #[test]
    fn test_obsidian_format_compatibility() {
        // Parse a real Obsidian .canvas JSON
        let obsidian_json = r#"{
            "nodes": [
                {"id":"abc123def456ab12","type":"text","x":-200,"y":-120,"width":250,"height":60,"text":"Some **markdown** text"},
                {"id":"1234567890abcdef","type":"file","x":100,"y":-120,"width":400,"height":400,"file":"My Note.md"},
                {"id":"fedcba0987654321","type":"link","x":-200,"y":100,"width":400,"height":300,"url":"https://obsidian.md"},
                {"id":"group00000000001","type":"group","x":-300,"y":-200,"width":800,"height":600,"label":"My Group","color":"1"}
            ],
            "edges": [
                {"id":"edge000000000001","fromNode":"abc123def456ab12","fromSide":"right","toNode":"1234567890abcdef","toSide":"left","toEnd":"arrow","label":"links to"}
            ]
        }"#;

        let canvas = Canvas::from_json(obsidian_json).unwrap();
        assert_eq!(canvas.nodes.len(), 4);
        assert_eq!(canvas.edges.len(), 1);

        // Text node
        let text = canvas.get_node("abc123def456ab12").unwrap();
        assert_eq!(text.node_type, CanvasNodeType::Text);
        assert_eq!(text.text.as_deref(), Some("Some **markdown** text"));

        // File node
        let file = canvas.get_node("1234567890abcdef").unwrap();
        assert_eq!(file.node_type, CanvasNodeType::File);
        assert_eq!(file.file.as_deref(), Some("My Note.md"));

        // Link node
        let link = canvas.get_node("fedcba0987654321").unwrap();
        assert_eq!(link.node_type, CanvasNodeType::Link);

        // Group with color
        let group = canvas.get_node("group00000000001").unwrap();
        assert_eq!(group.node_type, CanvasNodeType::Group);
        assert_eq!(group.color.as_deref(), Some("1"));

        // Edge
        let edge = &canvas.edges[0];
        assert_eq!(edge.from_side, Some(CanvasSide::Right));
        assert_eq!(edge.to_side, Some(CanvasSide::Left));
        assert_eq!(edge.to_end, Some(CanvasEnd::Arrow));
        assert_eq!(edge.label.as_deref(), Some("links to"));

        // Re-serialize and verify it's valid JSON that Obsidian could parse back
        let reserialized = canvas.to_json().unwrap();
        let reparsed = Canvas::from_json(&reserialized).unwrap();
        assert_eq!(reparsed.nodes.len(), 4);
        assert_eq!(reparsed.edges.len(), 1);
    }

    #[test]
    fn test_save_and_load_file() {
        let dir = std::env::temp_dir().join("oxidian_canvas_test");
        std::fs::create_dir_all(&dir).ok();
        let path = dir.join("test.canvas");

        let mut canvas = Canvas::new();
        canvas.add_text_node(0.0, 0.0, 200.0, 100.0, "Saved node");
        canvas.save(&path).unwrap();

        let loaded = Canvas::load(&path).unwrap();
        assert_eq!(loaded.nodes.len(), 1);
        assert_eq!(loaded.nodes[0].text.as_deref(), Some("Saved node"));

        // Cleanup
        std::fs::remove_file(&path).ok();
        std::fs::remove_dir(&dir).ok();
    }

    #[test]
    fn test_empty_file_loads_as_empty_canvas() {
        let dir = std::env::temp_dir().join("oxidian_canvas_test2");
        std::fs::create_dir_all(&dir).ok();
        let path = dir.join("empty.canvas");
        std::fs::write(&path, "").unwrap();

        let canvas = Canvas::load(&path).unwrap();
        assert!(canvas.nodes.is_empty());

        std::fs::remove_file(&path).ok();
        std::fs::remove_dir(&dir).ok();
    }

    #[test]
    fn test_nodes_in_group() {
        let mut canvas = Canvas::new();
        let g = canvas.add_group_node(0.0, 0.0, 500.0, 500.0, Some("Container"));
        let inside = canvas.add_text_node(10.0, 10.0, 100.0, 50.0, "Inside");
        let outside = canvas.add_text_node(600.0, 600.0, 100.0, 50.0, "Outside");
        let partial = canvas.add_text_node(450.0, 450.0, 100.0, 100.0, "Partial overlap");

        let members = canvas.nodes_in_group(&g);
        let member_ids: Vec<&str> = members.iter().map(|n| n.id.as_str()).collect();
        assert!(member_ids.contains(&inside.as_str()));
        assert!(!member_ids.contains(&outside.as_str()));
        assert!(!member_ids.contains(&partial.as_str()), "Partially overlapping node should not be in group");
    }

    #[test]
    fn test_edges_for_node() {
        let mut canvas = Canvas::new();
        let n1 = canvas.add_text_node(0.0, 0.0, 100.0, 50.0, "A");
        let n2 = canvas.add_text_node(200.0, 0.0, 100.0, 50.0, "B");
        let n3 = canvas.add_text_node(400.0, 0.0, 100.0, 50.0, "C");
        canvas.add_edge(&n1, &n2, None, None, None);
        canvas.add_edge(&n1, &n3, None, None, None);
        canvas.add_edge(&n2, &n3, None, None, None);

        assert_eq!(canvas.edges_for_node(&n1).len(), 2);
        assert_eq!(canvas.edges_for_node(&n2).len(), 2);
        assert_eq!(canvas.edges_for_node(&n3).len(), 2);
    }

    #[test]
    fn test_nodes_of_type() {
        let mut canvas = Canvas::new();
        canvas.add_text_node(0.0, 0.0, 100.0, 50.0, "T1");
        canvas.add_text_node(0.0, 100.0, 100.0, 50.0, "T2");
        canvas.add_file_node(200.0, 0.0, 100.0, 100.0, "note.md", None);
        canvas.add_group_node(0.0, 0.0, 500.0, 500.0, None);

        assert_eq!(canvas.nodes_of_type(CanvasNodeType::Text).len(), 2);
        assert_eq!(canvas.nodes_of_type(CanvasNodeType::File).len(), 1);
        assert_eq!(canvas.nodes_of_type(CanvasNodeType::Group).len(), 1);
        assert_eq!(canvas.nodes_of_type(CanvasNodeType::Link).len(), 0);
    }

    #[test]
    fn test_generate_id_uniqueness() {
        let ids: Vec<String> = (0..100).map(|_| Canvas::generate_id()).collect();
        let unique: std::collections::HashSet<&str> = ids.iter().map(|s| s.as_str()).collect();
        assert_eq!(unique.len(), 100, "All generated IDs should be unique");
        assert!(ids.iter().all(|id| id.len() == 16), "IDs should be 16 chars");
    }
}
