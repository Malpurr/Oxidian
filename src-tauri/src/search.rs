use std::fs;
use std::path::Path;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexWriter, ReloadPolicy};
use walkdir::WalkDir;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f32,
}

pub struct SearchIndex {
    index: Index,
    schema: Schema,
    path_field: Field,
    title_field: Field,
    body_field: Field,
    /// Persistent writer for single-note updates (avoids alloc/dealloc per save)
    writer: Option<IndexWriter>,
}

impl SearchIndex {
    pub fn new(vault_path: &str) -> Result<Self, String> {
        let mut schema_builder = Schema::builder();
        
        let path_field = schema_builder.add_text_field("path", STRING | STORED);
        let title_field = schema_builder.add_text_field("title", TEXT | STORED);
        let body_field = schema_builder.add_text_field("body", TEXT | STORED);
        
        let schema = schema_builder.build();
        
        let index_path = Path::new(vault_path).join(".search_index");
        fs::create_dir_all(&index_path).map_err(|e| format!("Failed to create index dir: {}", e))?;
        
        let index = Index::create_in_dir(&index_path, schema.clone())
            .or_else(|_| Index::open_in_dir(&index_path))
            .map_err(|e| format!("Failed to create/open index: {}", e))?;
        
        let writer = index.writer(3_000_000)
            .map_err(|e| format!("Failed to create index writer: {}", e))?;

        Ok(SearchIndex {
            index,
            schema,
            path_field,
            title_field,
            body_field,
            writer: Some(writer),
        })
    }
    
    /// Reindex the entire vault
    pub fn reindex_vault(&mut self, vault_path: &str) -> Result<(), String> {
        // Drop persistent writer before creating a bulk writer
        self.writer = None;

        let mut writer: IndexWriter = self.index
            .writer(50_000_000)
            .map_err(|e| format!("Failed to create index writer: {}", e))?;
        
        // Clear existing index
        writer.delete_all_documents()
            .map_err(|e| format!("Failed to clear index: {}", e))?;
        
        for entry in WalkDir::new(vault_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(path) {
                    let relative = path.strip_prefix(vault_path)
                        .unwrap_or(path)
                        .to_string_lossy()
                        .to_string();
                    
                    let title = path.file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    
                    writer.add_document(doc!(
                        self.path_field => relative,
                        self.title_field => title,
                        self.body_field => content,
                    )).map_err(|e| format!("Failed to add document: {}", e))?;
                }
            }
        }
        
        writer.commit().map_err(|e| format!("Failed to commit index: {}", e))?;

        // Re-create persistent writer for single-note updates
        self.writer = Some(self.index.writer(3_000_000)
            .map_err(|e| format!("Failed to re-create persistent writer: {}", e))?);
        
        Ok(())
    }
    
    /// Index a single note — reuses persistent writer to avoid alloc overhead
    pub fn index_note(&mut self, _vault_path: &str, relative_path: &str, content: &str) -> Result<(), String> {
        let writer = self.writer.as_mut()
            .ok_or_else(|| "Index writer not available".to_string())?;
        
        // Delete old version
        let path_term = tantivy::Term::from_field_text(self.path_field, relative_path);
        writer.delete_term(path_term);
        
        let title = Path::new(relative_path)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        writer.add_document(doc!(
            self.path_field => relative_path.to_string(),
            self.title_field => title,
            self.body_field => content.to_string(),
        )).map_err(|e| format!("Failed to add document: {}", e))?;
        
        writer.commit().map_err(|e| format!("Failed to commit index: {}", e))?;
        
        Ok(())
    }
    
    /// Search the index
    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
        // Strip leading # from tag searches
        let query_str = query_str.trim_start_matches('#');
        let query_str = query_str.trim();
        if query_str.is_empty() {
            return Ok(vec![]);
        }
        // Escape Tantivy/Lucene special characters to prevent query parse errors
        let query_str: String = query_str.chars().map(|c| {
            if "[]{}()~^\":\\!+-".contains(c) {
                ' '  // replace special chars with space (acts as OR between terms)
            } else {
                c
            }
        }).collect();
        let query_str = query_str.trim();
        if query_str.is_empty() {
            return Ok(vec![]);
        }
        let reader = self.index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()
            .map_err(|e| format!("Failed to create reader: {}", e))?;
        
        let searcher = reader.searcher();
        
        let query_parser = QueryParser::for_index(
            &self.index,
            vec![self.title_field, self.body_field],
        );
        
        let query = query_parser
            .parse_query(query_str)
            .map_err(|e| format!("Failed to parse query: {}", e))?;
        
        let top_docs = searcher
            .search(&query, &TopDocs::with_limit(limit))
            .map_err(|e| format!("Search failed: {}", e))?;
        
        let mut results = Vec::new();
        
        for (score, doc_address) in top_docs {
            let doc: tantivy::TantivyDocument = searcher.doc(doc_address)
                .map_err(|e| format!("Failed to retrieve doc: {}", e))?;
            
            let path = doc.get_first(self.path_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let title = doc.get_first(self.title_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let body = doc.get_first(self.body_field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            // Create snippet from body
            let snippet = create_snippet(&body, query_str, 150);
            
            results.push(SearchResult {
                path,
                title,
                snippet,
                score,
            });
        }
        
        Ok(results)
    }
}

/// Create a text snippet around the query match
fn create_snippet(body: &str, query: &str, max_len: usize) -> String {
    let lower_query = query.to_lowercase();
    
    // Find the first query term in the body (using char indices for safety)
    let query_terms: Vec<&str> = lower_query.split_whitespace().collect();
    let mut best_char_pos: usize = 0;
    
    // Search in the original body (case-insensitive char-by-char) to avoid
    // byte-position mismatch between lowercased and original strings
    let body_chars: Vec<char> = body.chars().collect();
    let body_lower_chars: Vec<char> = body.to_lowercase().chars().collect();
    
    'outer: for term in &query_terms {
        let term_chars: Vec<char> = term.chars().collect();
        if term_chars.is_empty() { continue; }
        for i in 0..body_lower_chars.len().saturating_sub(term_chars.len() - 1) {
            if body_lower_chars[i..].starts_with(&term_chars) {
                best_char_pos = i;
                break 'outer;
            }
        }
    }
    
    // Work in char positions, then convert back to byte ranges
    let total_chars = body_chars.len();
    let start_char = best_char_pos.saturating_sub(max_len / 2);
    let end_char = (start_char + max_len).min(total_chars);
    
    // Convert char positions to byte positions safely
    let start_byte: usize = body.char_indices().nth(start_char).map(|(i, _)| i).unwrap_or(0);
    let end_byte: usize = if end_char >= total_chars {
        body.len()
    } else {
        body.char_indices().nth(end_char).map(|(i, _)| i).unwrap_or(body.len())
    };
    
    let mut snippet = String::new();
    if start_char > 0 {
        snippet.push_str("...");
    }
    snippet.push_str(&body[start_byte..end_byte].replace('\n', " "));
    if end_char < total_chars {
        snippet.push_str("...");
    }
    
    snippet
}
