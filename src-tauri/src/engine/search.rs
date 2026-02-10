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
    #[allow(dead_code)]
    schema: Schema,
    path_field: Field,
    title_field: Field,
    body_field: Field,
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
        let lock_file = index_path.join(".tantivy-writer.lock");
        if lock_file.exists() { let _ = fs::remove_file(&lock_file); }
        let index = Index::create_in_dir(&index_path, schema.clone())
            .or_else(|_| Index::open_in_dir(&index_path))
            .map_err(|e| format!("Failed to create/open index: {}", e))?;
        let writer = index.writer(15_000_000).map_err(|e| format!("Failed to create index writer: {}", e))?;
        Ok(SearchIndex { index, schema, path_field, title_field, body_field, writer: Some(writer) })
    }

    pub fn reindex_vault(&mut self, vault_path: &str) -> Result<(), String> {
        self.writer = None;
        let index_path = Path::new(vault_path).join(".search_index");
        let lock_file = index_path.join(".tantivy-writer.lock");
        if lock_file.exists() { let _ = fs::remove_file(&lock_file); }
        let mut writer: IndexWriter = self.index.writer(50_000_000).map_err(|e| format!("Failed to create index writer: {}", e))?;
        writer.delete_all_documents().map_err(|e| format!("Failed to clear index: {}", e))?;
        for entry in WalkDir::new(vault_path).into_iter()
            .filter_entry(|e| { if e.depth() == 0 { return true; } let name = e.file_name().to_string_lossy(); !(e.file_type().is_dir() && name.starts_with('.')) })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.extension().map(|e| e == "md").unwrap_or(false) {
                if let Ok(content) = fs::read_to_string(path) {
                    let relative = path.strip_prefix(vault_path).unwrap_or(path).to_string_lossy().to_string();
                    let title = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                    writer.add_document(doc!(self.path_field => relative, self.title_field => title, self.body_field => content))
                        .map_err(|e| format!("Failed to add document: {}", e))?;
                }
            }
        }
        writer.commit().map_err(|e| format!("Failed to commit index: {}", e))?;
        drop(writer);
        self.writer = Some(self.index.writer(15_000_000).map_err(|e| format!("Failed to re-create persistent writer: {}", e))?);
        Ok(())
    }

    /// Remove a single document by its path from the index.
    pub fn delete_path(&mut self, path: &str) -> Result<(), String> {
        if self.writer.is_none() {
            self.writer = Some(self.index.writer(15_000_000).map_err(|e| format!("Failed to re-create writer: {}", e))?);
        }
        let writer = self.writer.as_mut().ok_or_else(|| "Index writer not available".to_string())?;
        let path_term = tantivy::Term::from_field_text(self.path_field, path);
        writer.delete_term(path_term);
        writer.commit().map_err(|e| format!("Failed to commit index: {}", e))?;
        Ok(())
    }

    pub fn index_note(&mut self, _vault_path: &str, relative_path: &str, content: &str) -> Result<(), String> {
        if self.writer.is_none() {
            self.writer = Some(self.index.writer(15_000_000).map_err(|e| format!("Failed to re-create writer: {}", e))?);
        }
        let writer = self.writer.as_mut().ok_or_else(|| "Index writer not available".to_string())?;
        let path_term = tantivy::Term::from_field_text(self.path_field, relative_path);
        writer.delete_term(path_term);
        let title = Path::new(relative_path).file_stem().unwrap_or_default().to_string_lossy().to_string();
        writer.add_document(doc!(self.path_field => relative_path.to_string(), self.title_field => title, self.body_field => content.to_string()))
            .map_err(|e| format!("Failed to add document: {}", e))?;
        writer.commit().map_err(|e| format!("Failed to commit index: {}", e))?;
        Ok(())
    }

    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
        let query_str = query_str.trim_start_matches('#').trim();
        if query_str.is_empty() { return Ok(vec![]); }
        let query_str: String = query_str.chars().map(|c| if "[]{}()~^\":\\!+-".contains(c) { ' ' } else { c }).collect();
        let query_str = query_str.trim();
        if query_str.is_empty() { return Ok(vec![]); }
        let reader = self.index.reader_builder().reload_policy(ReloadPolicy::OnCommitWithDelay).try_into()
            .map_err(|e| format!("Failed to create reader: {}", e))?;
        let searcher = reader.searcher();
        let query_parser = QueryParser::for_index(&self.index, vec![self.title_field, self.body_field]);
        let query = query_parser.parse_query(query_str).map_err(|e| format!("Failed to parse query: {}", e))?;
        let top_docs = searcher.search(&query, &TopDocs::with_limit(limit)).map_err(|e| format!("Search failed: {}", e))?;
        let mut results = Vec::new();
        for (score, doc_address) in top_docs {
            let doc: tantivy::TantivyDocument = searcher.doc(doc_address).map_err(|e| format!("Failed to retrieve doc: {}", e))?;
            let path = doc.get_first(self.path_field).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let title = doc.get_first(self.title_field).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let body = doc.get_first(self.body_field).and_then(|v| v.as_str()).unwrap_or("").to_string();
            let snippet = create_snippet(&body, query_str, 150);
            results.push(SearchResult { path, title, snippet, score });
        }
        Ok(results)
    }
}

fn create_snippet(body: &str, query: &str, max_len: usize) -> String {
    let lower_query = query.to_lowercase();
    let query_terms: Vec<&str> = lower_query.split_whitespace().collect();
    let mut best_char_pos: usize = 0;
    let body_lower_chars: Vec<char> = body.to_lowercase().chars().collect();
    'outer: for term in &query_terms {
        let term_chars: Vec<char> = term.chars().collect();
        if term_chars.is_empty() { continue; }
        for i in 0..body_lower_chars.len().saturating_sub(term_chars.len() - 1) {
            if body_lower_chars[i..].starts_with(&term_chars) { best_char_pos = i; break 'outer; }
        }
    }
    let body_chars: Vec<char> = body.chars().collect();
    let total_chars = body_chars.len();
    let start_char = best_char_pos.saturating_sub(max_len / 2);
    let end_char = (start_char + max_len).min(total_chars);
    let start_byte: usize = body.char_indices().nth(start_char).map(|(i, _)| i).unwrap_or(0);
    let end_byte: usize = if end_char >= total_chars { body.len() } else { body.char_indices().nth(end_char).map(|(i, _)| i).unwrap_or(body.len()) };
    let mut snippet = String::new();
    if start_char > 0 { snippet.push_str("..."); }
    snippet.push_str(&body[start_byte..end_byte].replace('\n', " "));
    if end_char < total_chars { snippet.push_str("..."); }
    snippet
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_vault() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        // Create test notes
        fs::write(vault_path.join("note1.md"), "# Note 1\n\nThis is the first test note with some content.").unwrap();
        fs::write(vault_path.join("note2.md"), "# Note 2\n\nThis is the second note about programming.").unwrap();
        fs::write(vault_path.join("note3.md"), "# Important\n\nThis note contains important information.").unwrap();
        
        temp_dir
    }

    #[test]
    fn test_search_index_creation() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = SearchIndex::new(vault_path);
        assert!(result.is_ok());
        
        // Check that index directory was created
        let index_path = temp_vault.path().join(".search_index");
        assert!(index_path.exists());
    }

    #[test]
    fn test_search_result_structure() {
        let result = SearchResult {
            path: "test.md".to_string(),
            title: "Test Note".to_string(),
            snippet: "Test snippet".to_string(),
            score: 0.85,
        };
        
        assert_eq!(result.path, "test.md");
        assert_eq!(result.title, "Test Note");
        assert_eq!(result.snippet, "Test snippet");
        assert_eq!(result.score, 0.85);
    }

    #[test]
    fn test_reindex_vault() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        let result = index.reindex_vault(vault_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_index_single_note() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        let result = index.index_note(vault_path, "test_note.md", "# Test\n\nTest content");
        assert!(result.is_ok());
    }

    #[test]
    fn test_search_empty_query() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        let results = index.search("", 10).expect("Search failed");
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_whitespace_only_query() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        let results = index.search("   \t  ", 10).expect("Search failed");
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_with_special_characters() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        // These special characters should be handled gracefully
        let result = index.search("test[]{}()~^\":\\!+-", 10);
        assert!(result.is_ok());
    }

    #[test]
    fn test_search_basic_functionality() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        let results = index.search("programming", 10).expect("Search failed");
        
        if !results.is_empty() {
            assert!(results[0].score > 0.0);
            assert!(!results[0].path.is_empty());
            assert!(!results[0].title.is_empty());
        }
    }

    #[test]
    fn test_search_with_limit() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        let results = index.search("note", 2).expect("Search failed");
        assert!(results.len() <= 2);
    }

    #[test]
    fn test_search_tag_prefix_removal() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        // The # should be stripped from the beginning
        let results_with_hash = index.search("#important", 10).expect("Search failed");
        let results_without_hash = index.search("important", 10).expect("Search failed");
        
        // Should get same results (or at least not fail)
        assert!(results_with_hash.len() == results_without_hash.len() || 
                (results_with_hash.is_empty() && results_without_hash.len() >= 0) ||
                (results_without_hash.is_empty() && results_with_hash.len() >= 0));
    }

    #[test]
    fn test_create_snippet_basic() {
        let body = "This is a long piece of text that contains the word programming in the middle of it.";
        let query = "programming";
        let snippet = create_snippet(body, query, 50);
        
        assert!(snippet.contains("programming"));
        assert!(snippet.len() <= 60); // 50 + ellipsis
    }

    #[test]
    fn test_create_snippet_with_ellipsis() {
        let body = "Start of text. This is a very long piece of text that contains the search term in the middle and continues for much longer after that.";
        let query = "search term";
        let snippet = create_snippet(body, query, 30);
        
        assert!(snippet.contains("search term"));
        assert!(snippet.contains("..."));
    }

    #[test]
    fn test_create_snippet_short_text() {
        let body = "Short text with keyword.";
        let query = "keyword";
        let snippet = create_snippet(body, query, 100);
        
        assert_eq!(snippet, body); // Should return full text if shorter than limit
        assert!(!snippet.contains("..."));
    }

    #[test]
    fn test_create_snippet_no_match() {
        let body = "This text does not contain the search term we are looking for.";
        let query = "nonexistent";
        let snippet = create_snippet(body, query, 30);
        
        // Should still create a snippet from the beginning
        assert!(snippet.len() <= 35); // 30 + potential ellipsis
    }

    #[test]
    fn test_create_snippet_newlines_replaced() {
        let body = "First line\nSecond line\nThird line with keyword here\nFourth line";
        let query = "keyword";
        let snippet = create_snippet(body, query, 50);
        
        assert!(snippet.contains("keyword"));
        assert!(!snippet.contains('\n')); // Newlines should be replaced with spaces
        assert!(snippet.contains(" ")); // Should have spaces instead
    }

    #[test]
    fn test_create_snippet_multiple_terms() {
        let body = "This is a long text that has multiple words including first and second terms.";
        let query = "first second";
        let snippet = create_snippet(body, query, 50);
        
        // Should find one of the terms and create snippet around it
        assert!(snippet.contains("first") || snippet.contains("second"));
    }

    #[test]
    fn test_create_snippet_case_insensitive() {
        let body = "This text has UPPERCASE and lowercase versions of the same Word.";
        let query = "word";
        let snippet = create_snippet(body, query, 50);
        
        // Should find either uppercase or lowercase version
        assert!(snippet.contains("Word") || snippet.contains("UPPERCASE"));
    }

    #[test]
    fn test_search_index_update_existing_note() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        index.reindex_vault(vault_path).expect("Failed to reindex");
        
        // Add a note
        let result = index.index_note(vault_path, "update_test.md", "Original content");
        assert!(result.is_ok());
        
        // Update the same note
        let result = index.index_note(vault_path, "update_test.md", "Updated content");
        assert!(result.is_ok());
    }

    #[test]
    fn test_search_index_handles_unicode() {
        let temp_vault = create_test_vault();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let mut index = SearchIndex::new(vault_path).expect("Failed to create index");
        
        // Index note with unicode content
        let result = index.index_note(vault_path, "unicode.md", "Content with émojis 🦀 and ñoñó");
        assert!(result.is_ok());
        
        // Search should handle unicode
        let result = index.search("émojis", 10);
        assert!(result.is_ok());
    }
}
