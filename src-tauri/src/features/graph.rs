use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub group: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

/// Compute full graph data from the vault meta cache
pub fn compute_graph(cache: &crate::state::VaultMetaCache) -> GraphData {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    let all_files: Vec<(String, String)> = cache.entries.keys()
        .map(|path| {
            let name = std::path::Path::new(path)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            (path.clone(), name)
        })
        .collect();

    for (path, name) in &all_files {
        nodes.push(GraphNode {
            id: path.clone(),
            name: name.clone(),
            group: None,
        });
    }

    for (path, _) in &all_files {
        if let Some((_, links)) = cache.entries.get(path) {
            for link in links {
                let target = link.split('|').next().unwrap_or(link);
                if let Some((target_path, _)) = all_files.iter().find(|(_, name)| {
                    name == target || target.ends_with(&format!("/{}", name))
                }) {
                    edges.push(GraphEdge {
                        source: path.clone(),
                        target: target_path.clone(),
                    });
                }
            }
        }
    }

    GraphData { nodes, edges }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::state::VaultMetaCache;

    fn create_test_cache() -> VaultMetaCache {
        let mut cache = VaultMetaCache {
            entries: HashMap::new(),
            built_at: None,
        };
        
        // Add some test entries with links
        cache.entries.insert(
            "note1.md".to_string(), 
            (Vec::new(), vec!["note2".to_string(), "note3".to_string()])
        );
        cache.entries.insert(
            "note2.md".to_string(), 
            (Vec::new(), vec!["note1".to_string()])
        );
        cache.entries.insert(
            "note3.md".to_string(), 
            (Vec::new(), Vec::new())
        );
        cache.entries.insert(
            "orphan.md".to_string(), 
            (Vec::new(), Vec::new())
        );
        
        cache
    }

    #[test]
    fn test_graph_node_creation() {
        let node = GraphNode {
            id: "test.md".to_string(),
            name: "Test Note".to_string(),
            group: Some("category".to_string()),
        };
        
        assert_eq!(node.id, "test.md");
        assert_eq!(node.name, "Test Note");
        assert_eq!(node.group, Some("category".to_string()));
    }

    #[test]
    fn test_graph_node_without_group() {
        let node = GraphNode {
            id: "test.md".to_string(),
            name: "Test".to_string(),
            group: None,
        };
        
        assert_eq!(node.id, "test.md");
        assert!(node.group.is_none());
    }

    #[test]
    fn test_graph_edge_creation() {
        let edge = GraphEdge {
            source: "source.md".to_string(),
            target: "target.md".to_string(),
        };
        
        assert_eq!(edge.source, "source.md");
        assert_eq!(edge.target, "target.md");
    }

    #[test]
    fn test_graph_data_structure() {
        let nodes = vec![
            GraphNode {
                id: "1".to_string(),
                name: "Node 1".to_string(),
                group: None,
            },
            GraphNode {
                id: "2".to_string(),
                name: "Node 2".to_string(),
                group: None,
            },
        ];
        
        let edges = vec![
            GraphEdge {
                source: "1".to_string(),
                target: "2".to_string(),
            }
        ];
        
        let graph = GraphData { nodes, edges };
        
        assert_eq!(graph.nodes.len(), 2);
        assert_eq!(graph.edges.len(), 1);
        assert_eq!(graph.nodes[0].id, "1");
        assert_eq!(graph.edges[0].source, "1");
        assert_eq!(graph.edges[0].target, "2");
    }

    #[test]
    fn test_compute_graph_basic() {
        let cache = create_test_cache();
        let graph = compute_graph(&cache);
        
        // Should create nodes for all files
        assert_eq!(graph.nodes.len(), 4);
        
        // Check node names are extracted from file paths
        let node_names: Vec<&String> = graph.nodes.iter().map(|n| &n.name).collect();
        assert!(node_names.contains(&&"note1".to_string()));
        assert!(node_names.contains(&&"note2".to_string()));
        assert!(node_names.contains(&&"note3".to_string()));
        assert!(node_names.contains(&&"orphan".to_string()));
    }

    #[test]
    fn test_compute_graph_edges() {
        let cache = create_test_cache();
        let graph = compute_graph(&cache);
        
        // Should create edges based on links
        // note1 links to note2 and note3
        // note2 links to note1
        let source_paths: Vec<&String> = graph.edges.iter().map(|e| &e.source).collect();
        assert!(source_paths.contains(&&"note1.md".to_string()));
        assert!(source_paths.contains(&&"note2.md".to_string()));
    }

    #[test]
    fn test_compute_graph_orphan_nodes() {
        let cache = create_test_cache();
        let graph = compute_graph(&cache);
        
        // Orphan nodes (no links) should still appear in the graph
        let node_ids: Vec<&String> = graph.nodes.iter().map(|n| &n.id).collect();
        assert!(node_ids.contains(&&"orphan.md".to_string()));
        
        // But should not be source of any edges
        let orphan_edges: Vec<&GraphEdge> = graph.edges.iter()
            .filter(|e| e.source == "orphan.md")
            .collect();
        assert!(orphan_edges.is_empty());
    }

    #[test]
    fn test_compute_graph_empty_cache() {
        let empty_cache = VaultMetaCache {
            entries: HashMap::new(),
            built_at: None,
        };
        let graph = compute_graph(&empty_cache);
        
        assert!(graph.nodes.is_empty());
        assert!(graph.edges.is_empty());
    }

    #[test]
    fn test_compute_graph_link_resolution() {
        let mut cache = VaultMetaCache {
            entries: HashMap::new(),
            built_at: None,
        };
        
        // Add files with specific link patterns
        cache.entries.insert(
            "folder/deep_note.md".to_string(),
            (Vec::new(), vec!["target".to_string(), "deep_note".to_string()]) // Self-reference and target
        );
        cache.entries.insert(
            "target.md".to_string(),
            (Vec::new(), Vec::new())
        );
        
        let graph = compute_graph(&cache);
        
        // Should create proper edges
        let target_edges: Vec<&GraphEdge> = graph.edges.iter()
            .filter(|e| e.target == "target.md")
            .collect();
        assert!(!target_edges.is_empty());
    }

    #[test]
    fn test_compute_graph_with_aliases() {
        let mut cache = VaultMetaCache {
            entries: HashMap::new(),
            built_at: None,
        };
        
        // Test links with aliases (pipe syntax)
        cache.entries.insert(
            "source.md".to_string(),
            (Vec::new(), vec!["target|Display Name".to_string()])
        );
        cache.entries.insert(
            "target.md".to_string(),
            (Vec::new(), Vec::new())
        );
        
        let graph = compute_graph(&cache);
        
        // Should resolve the link target correctly (before the pipe)
        let edges_to_target: Vec<&GraphEdge> = graph.edges.iter()
            .filter(|e| e.target == "target.md")
            .collect();
        assert!(!edges_to_target.is_empty());
    }

    #[test]
    fn test_compute_graph_bidirectional_links() {
        let mut cache = VaultMetaCache {
            entries: HashMap::new(),
            built_at: None,
        };
        
        // Create bidirectional links
        cache.entries.insert(
            "a.md".to_string(),
            (Vec::new(), vec!["b".to_string()])
        );
        cache.entries.insert(
            "b.md".to_string(),
            (Vec::new(), vec!["a".to_string()])
        );
        
        let graph = compute_graph(&cache);
        
        // Should have edges in both directions
        assert_eq!(graph.edges.len(), 2);
        
        let a_to_b = graph.edges.iter().any(|e| e.source == "a.md" && e.target == "b.md");
        let b_to_a = graph.edges.iter().any(|e| e.source == "b.md" && e.target == "a.md");
        
        assert!(a_to_b);
        assert!(b_to_a);
    }

    #[test]
    fn test_graph_node_clone() {
        let original = GraphNode {
            id: "test.md".to_string(),
            name: "Test".to_string(),
            group: Some("group".to_string()),
        };
        
        let cloned = original.clone();
        assert_eq!(original.id, cloned.id);
        assert_eq!(original.name, cloned.name);
        assert_eq!(original.group, cloned.group);
    }

    #[test]
    fn test_graph_edge_clone() {
        let original = GraphEdge {
            source: "a.md".to_string(),
            target: "b.md".to_string(),
        };
        
        let cloned = original.clone();
        assert_eq!(original.source, cloned.source);
        assert_eq!(original.target, cloned.target);
    }

    #[test]
    fn test_graph_serialization() {
        let graph = GraphData {
            nodes: vec![
                GraphNode {
                    id: "test.md".to_string(),
                    name: "Test".to_string(),
                    group: None,
                }
            ],
            edges: vec![
                GraphEdge {
                    source: "a.md".to_string(),
                    target: "b.md".to_string(),
                }
            ],
        };
        
        let serialized = serde_json::to_string(&graph).expect("Should serialize");
        assert!(serialized.contains("test.md"));
        assert!(serialized.contains("Test"));
        assert!(serialized.contains("a.md"));
        assert!(serialized.contains("b.md"));
    }
}
