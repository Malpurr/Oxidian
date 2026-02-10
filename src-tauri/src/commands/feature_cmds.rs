use crate::state::AppState;
use crate::features::graph;
use crate::features::canvas::Canvas;

fn validate_canvas_path(path: &str) -> Result<(), String> {
    if path.contains("..") || path.starts_with('/') || path.starts_with('\\') {
        return Err("Invalid canvas path".to_string());
    }
    Ok(())
}
use crate::features::bookmarks::Bookmark;
use crate::features::daily_notes::{DailyNotes, DailyNotesConfig};
use crate::features::templates::{TemplateManager, TemplateInfo};
use crate::features::tags::TagEntry;
use serde::Serialize;
use tauri::State;

// ===== Graph =====

#[derive(Debug, Serialize)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Serialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[tauri::command]
pub fn get_graph_data(state: State<AppState>) -> Result<GraphData, String> {
    let mut cache = state.meta_cache.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if cache.is_stale(30) {
        let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        cache.rebuild(&vault_path);
    }

    let gd = graph::compute_graph(&cache);

    Ok(GraphData {
        nodes: gd.nodes.into_iter().map(|n| GraphNode { id: n.id, name: n.name }).collect(),
        edges: gd.edges.into_iter().map(|e| GraphEdge { source: e.source, target: e.target }).collect(),
    })
}

#[tauri::command]
pub fn compute_graph(state: State<AppState>) -> Result<GraphData, String> {
    get_graph_data(state)
}

// ===== Theme Commands =====

#[tauri::command]
pub fn list_custom_themes(state: State<AppState>) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let themes_dir = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("themes");

    if !themes_dir.exists() {
        return Ok(vec![]);
    }

    let mut themes = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&themes_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".css") {
                themes.push(name.trim_end_matches(".css").to_string());
            }
        }
    }
    Ok(themes)
}

#[tauri::command]
pub fn load_custom_theme(state: State<AppState>, name: String) -> Result<String, String> {
    if name.contains('/') || name.contains('\\') || name.contains("..") || name.is_empty() {
        return Err("Invalid theme name".to_string());
    }
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let theme_path = std::path::Path::new(&*vault_path)
        .join(".oxidian")
        .join("themes")
        .join(format!("{}.css", name));

    std::fs::read_to_string(&theme_path)
        .map_err(|e| format!("Failed to load theme: {}", e))
}

// ===== Canvas Commands =====

#[tauri::command]
pub fn load_canvas(state: State<AppState>, path: String) -> Result<Canvas, String> {
    validate_canvas_path(&path)?;
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let full_path = std::path::Path::new(&*vault_path).join(&path);
    Canvas::load(&full_path)
}

#[tauri::command]
pub fn save_canvas(state: State<AppState>, path: String, canvas: Canvas) -> Result<(), String> {
    validate_canvas_path(&path)?;
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let full_path = std::path::Path::new(&*vault_path).join(&path);
    canvas.save(&full_path)
}

#[tauri::command]
pub fn canvas_add_node(
    state: State<AppState>,
    path: String,
    node_type: String,
    x: f64, y: f64, width: f64, height: f64,
    text: Option<String>,
    file: Option<String>,
    url: Option<String>,
    label: Option<String>,
) -> Result<String, String> {
    validate_canvas_path(&path)?;
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let full_path = std::path::Path::new(&*vault_path).join(&path);
    let mut canvas = if full_path.exists() { Canvas::load(&full_path)? } else { Canvas::new() };

    let id = match node_type.as_str() {
        "text" => canvas.add_text_node(x, y, width, height, text.as_deref().unwrap_or("")),
        "file" => canvas.add_file_node(x, y, width, height, file.as_deref().unwrap_or(""), None),
        "link" => canvas.add_link_node(x, y, width, height, url.as_deref().unwrap_or("")),
        "group" => canvas.add_group_node(x, y, width, height, label.as_deref()),
        _ => return Err(format!("Unknown node type: {}", node_type)),
    };

    canvas.save(&full_path)?;
    Ok(id)
}

#[tauri::command]
pub fn canvas_move_node(state: State<AppState>, path: String, node_id: String, x: f64, y: f64) -> Result<bool, String> {
    validate_canvas_path(&path)?;
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let full_path = std::path::Path::new(&*vault_path).join(&path);
    let mut canvas = Canvas::load(&full_path)?;
    let result = canvas.move_node(&node_id, x, y);
    canvas.save(&full_path)?;
    Ok(result)
}

#[tauri::command]
pub fn canvas_delete_node(state: State<AppState>, path: String, node_id: String) -> Result<bool, String> {
    validate_canvas_path(&path)?;
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let full_path = std::path::Path::new(&*vault_path).join(&path);
    let mut canvas = Canvas::load(&full_path)?;
    let result = canvas.delete_node(&node_id);
    canvas.save(&full_path)?;
    Ok(result)
}

// ===== Bookmarks Commands =====

#[tauri::command]
pub fn list_bookmarks(state: State<AppState>) -> Result<Vec<Bookmark>, String> {
    let bm = state.bookmarks.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(bm.list().to_vec())
}

#[tauri::command]
pub fn add_bookmark(state: State<AppState>, path: String) -> Result<bool, String> {
    let mut bm = state.bookmarks.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let added = bm.add(&path);
    if added { bm.save()?; }
    Ok(added)
}

#[tauri::command]
pub fn remove_bookmark(state: State<AppState>, path: String) -> Result<bool, String> {
    let mut bm = state.bookmarks.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let removed = bm.remove(&path);
    if removed { bm.save()?; }
    Ok(removed)
}

#[tauri::command]
pub fn reorder_bookmarks(state: State<AppState>, from_index: usize, to_index: usize) -> Result<(), String> {
    let mut bm = state.bookmarks.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    bm.reorder(from_index, to_index)?;
    bm.save()
}

// ===== Daily Notes =====

#[tauri::command]
pub fn create_daily_note_v2(state: State<AppState>) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let dn = DailyNotes::new(&vault_path, DailyNotesConfig::default());
    let (path, _content) = dn.open_today()?;
    Ok(path)
}

// ===== Templates =====

#[tauri::command]
pub fn list_templates(state: State<AppState>) -> Result<Vec<TemplateInfo>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let tm = TemplateManager::new(&vault_path, "templates");
    Ok(tm.list_templates())
}

#[tauri::command]
pub fn apply_template(state: State<AppState>, template_path: String, title: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let tm = TemplateManager::new(&vault_path, "templates");
    tm.apply_template(&template_path, &title)
}

// ===== Tags =====

#[tauri::command]
pub fn get_all_tags(state: State<AppState>) -> Result<Vec<TagEntry>, String> {
    let mut idx = state.tag_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if idx.tag_count() == 0 {
        let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        idx.build_from_vault(&vault_path);
    }
    Ok(idx.all_tag_entries())
}

#[tauri::command]
pub fn search_tags(state: State<AppState>, query: String) -> Result<Vec<String>, String> {
    let idx = state.tag_index.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(idx.search(&query))
}

// ===== File Recovery =====

use crate::features::file_recovery;

#[derive(Debug, Serialize)]
pub struct SnapshotInfo {
    pub timestamp: String,
    pub size_bytes: u64,
}

#[tauri::command]
pub fn create_file_snapshot(state: State<AppState>, path: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    file_recovery::create_snapshot(&vault_path, &path)
}

#[tauri::command]
pub fn list_file_snapshots(state: State<AppState>, path: String) -> Result<Vec<SnapshotInfo>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    let snapshots = file_recovery::list_snapshots(&vault_path, &path)?;
    Ok(snapshots.into_iter().map(|s| SnapshotInfo {
        timestamp: s.timestamp,
        size_bytes: s.size_bytes,
    }).collect())
}

#[tauri::command]
pub fn get_snapshot_content(state: State<AppState>, path: String, timestamp: String) -> Result<String, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    file_recovery::get_snapshot_content(&vault_path, &path, &timestamp)
}

#[tauri::command]
pub fn restore_file_snapshot(state: State<AppState>, path: String, timestamp: String) -> Result<(), String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    file_recovery::restore_snapshot(&vault_path, &path, &timestamp)
}

#[tauri::command]
pub fn list_all_snapshot_files(state: State<AppState>) -> Result<Vec<String>, String> {
    let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    file_recovery::list_all_snapshot_files(&vault_path)
}

// ===== Local Graph =====

#[derive(Debug, Serialize)]
pub struct LocalGraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub center_node: String,
}

#[tauri::command]
pub fn get_local_graph(state: State<AppState>, path: String, depth: Option<usize>) -> Result<LocalGraphData, String> {
    let mut cache = state.meta_cache.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    if cache.is_stale(30) {
        let vault_path = state.vault_path.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        cache.rebuild(&vault_path);
    }

    let max_depth = depth.unwrap_or(1).min(3);
    let full_graph = graph::compute_graph(&cache);

    // BFS from the center node to collect nodes within depth
    let mut visited = std::collections::HashSet::new();
    let mut queue = std::collections::VecDeque::new();
    visited.insert(path.clone());
    queue.push_back((path.clone(), 0usize));

    // Build adjacency from full graph edges (bidirectional)
    let mut adj: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for edge in &full_graph.edges {
        adj.entry(edge.source.clone()).or_default().push(edge.target.clone());
        adj.entry(edge.target.clone()).or_default().push(edge.source.clone());
    }

    while let Some((node, d)) = queue.pop_front() {
        if d >= max_depth {
            continue;
        }
        if let Some(neighbors) = adj.get(&node) {
            for neighbor in neighbors {
                if visited.insert(neighbor.clone()) {
                    queue.push_back((neighbor.clone(), d + 1));
                }
            }
        }
    }

    let nodes: Vec<GraphNode> = full_graph.nodes.into_iter()
        .filter(|n| visited.contains(&n.id))
        .map(|n| GraphNode { id: n.id, name: n.name })
        .collect();

    let node_ids: std::collections::HashSet<&String> = nodes.iter().map(|n| &n.id).collect();
    let edges: Vec<GraphEdge> = full_graph.edges.into_iter()
        .filter(|e| node_ids.contains(&e.source) && node_ids.contains(&e.target))
        .map(|e| GraphEdge { source: e.source, target: e.target })
        .collect();

    Ok(LocalGraphData {
        nodes,
        edges,
        center_node: path,
    })
}

// ===== Navigation History =====

#[tauri::command]
pub fn nav_push(state: State<AppState>, path: String) -> Result<(), String> {
    let mut nav = state.nav_history.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    nav.push(&path);
    Ok(())
}

#[tauri::command]
pub fn nav_go_back(state: State<AppState>) -> Result<Option<String>, String> {
    let mut nav = state.nav_history.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(nav.go_back().map(|s| s.to_string()))
}

#[tauri::command]
pub fn nav_go_forward(state: State<AppState>) -> Result<Option<String>, String> {
    let mut nav = state.nav_history.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(nav.go_forward().map(|s| s.to_string()))
}

#[tauri::command]
pub fn nav_current(state: State<AppState>) -> Result<Option<String>, String> {
    let nav = state.nav_history.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(nav.current().map(|s| s.to_string()))
}
