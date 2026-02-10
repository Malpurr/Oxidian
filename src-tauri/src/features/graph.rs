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
