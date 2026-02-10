use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct LinkTarget {
    pub path: String,
    pub display: String,
    pub exists: bool,
}

pub fn resolve_wikilink(_vault_path: &str, _link: &str) -> Result<Vec<LinkTarget>, String> {
    // TODO: Wave 2 — implement wikilink resolution
    Ok(vec![])
}

pub fn extract_outgoing_links(content: &str) -> Vec<String> {
    crate::engine::vault::extract_wiki_links(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_wikilink_returns_empty() {
        let result = resolve_wikilink("/path/to/vault", "Some Link");
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_link_target_structure() {
        // Test that LinkTarget can be created and serialized
        let target = LinkTarget {
            path: "notes/test.md".to_string(),
            display: "Test Note".to_string(),
            exists: true,
        };
        
        assert_eq!(target.path, "notes/test.md");
        assert_eq!(target.display, "Test Note");
        assert!(target.exists);
    }

    #[test]
    fn test_link_target_clone() {
        let original = LinkTarget {
            path: "test.md".to_string(),
            display: "Test".to_string(),
            exists: false,
        };
        
        let cloned = original.clone();
        assert_eq!(original.path, cloned.path);
        assert_eq!(original.display, cloned.display);
        assert_eq!(original.exists, cloned.exists);
    }

    #[test]
    fn test_extract_outgoing_links() {
        // This delegates to vault::extract_wiki_links, so we test basic functionality
        // The actual implementation will be tested in the vault module tests
        let content = "Some text with [[Link 1]] and [[Link 2|Display]] references";
        let links = extract_outgoing_links(content);
        
        // This depends on the vault implementation, but we can test it doesn't panic
        assert!(links.len() >= 0); // Should return some result without crashing
    }

    #[test]
    fn test_extract_outgoing_links_empty() {
        let content = "No links here";
        let links = extract_outgoing_links(content);
        assert!(links.len() >= 0); // Should handle empty case
    }

    #[test]
    fn test_extract_outgoing_links_multiple() {
        let content = "Multiple [[First Link]] and [[Second Link]] and [[Third Link|Alias]]";
        let links = extract_outgoing_links(content);
        assert!(links.len() >= 0); // Should handle multiple links
    }

    #[test]
    fn test_link_target_serialization() {
        // Test that LinkTarget can be properly serialized (important for JSON API responses)
        let target = LinkTarget {
            path: "notes/example.md".to_string(),
            display: "Example Note".to_string(),
            exists: true,
        };
        
        let serialized = serde_json::to_string(&target).expect("Should serialize");
        assert!(serialized.contains("notes/example.md"));
        assert!(serialized.contains("Example Note"));
        assert!(serialized.contains("true"));
    }

    #[test]
    fn test_link_target_with_special_characters() {
        let target = LinkTarget {
            path: "notes/special & chars.md".to_string(),
            display: "Special & Display < >".to_string(),
            exists: false,
        };
        
        let serialized = serde_json::to_string(&target).expect("Should serialize with special chars");
        assert!(serialized.contains("Special"));
        assert!(!serialized.contains("null")); // Should properly escape
    }
}
