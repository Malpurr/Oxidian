// Oxidian — Remember Connections: Related cards, auto-linking, cross-source discovery

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::cards;
use super::error::RememberError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedCard {
    pub path: String,
    pub front: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoLinkSuggestion {
    pub title: String,
    pub position: usize,
    pub match_length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStats {
    pub total_cards: usize,
    pub linked_cards: usize,
    pub orphan_cards: usize,
    pub avg_links_per_card: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossSourceConnection {
    pub card_a: String,
    pub card_b: String,
    pub shared_tags: Vec<String>,
}

/// Find cards related to the given card by shared tags/source.
pub fn find_related(vault_path: &str, card_path: &str, limit: usize) -> Result<Vec<RelatedCard>, RememberError> {
    let all_cards = cards::load_all_cards(vault_path)?;
    let target = all_cards.iter().find(|c| c.path == card_path)
        .ok_or_else(|| RememberError::CardNotFound(card_path.to_string()))?;

    let mut scored: Vec<RelatedCard> = all_cards.iter()
        .filter(|c| c.path != card_path)
        .map(|c| {
            let mut score = 0.0;
            // Shared tags
            let shared = c.tags.iter().filter(|t| target.tags.contains(t)).count();
            score += shared as f64 * 2.0;
            // Same source
            if !c.source.is_empty() && c.source == target.source {
                score += 3.0;
            }
            RelatedCard { path: c.path.clone(), front: c.front.clone(), score }
        })
        .filter(|r| r.score > 0.0)
        .collect();

    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(limit);
    Ok(scored)
}

/// Find potential wiki-link targets in a card's back text.
pub fn find_auto_links(vault_path: &str, card_path: &str) -> Result<Vec<AutoLinkSuggestion>, RememberError> {
    let all_cards = cards::load_all_cards(vault_path)?;
    let target = all_cards.iter().find(|c| c.path == card_path)
        .ok_or_else(|| RememberError::CardNotFound(card_path.to_string()))?;

    let back_lower = target.back.to_lowercase();
    let mut suggestions = Vec::new();

    for card in &all_cards {
        if card.path == card_path { continue; }
        let front_lower = card.front.to_lowercase();
        if front_lower.len() < 3 { continue; }
        if let Some(pos) = back_lower.find(&front_lower) {
            suggestions.push(AutoLinkSuggestion {
                title: card.front.clone(),
                position: pos,
                match_length: card.front.len(),
            });
        }
    }

    Ok(suggestions)
}

/// Get connection statistics for the card collection.
pub fn get_connection_stats(vault_path: &str) -> Result<ConnectionStats, RememberError> {
    let all_cards = cards::load_all_cards(vault_path)?;
    let total = all_cards.len();
    let linked = all_cards.iter().filter(|c| !c.source.is_empty() || !c.tags.is_empty()).count();
    let total_links: usize = all_cards.iter().map(|c| c.tags.len() + if c.source.is_empty() { 0 } else { 1 }).sum();
    let avg = if total > 0 { total_links as f64 / total as f64 } else { 0.0 };

    Ok(ConnectionStats {
        total_cards: total,
        linked_cards: linked,
        orphan_cards: total - linked,
        avg_links_per_card: (avg * 100.0).round() / 100.0,
    })
}

/// Discover connections between cards from different sources sharing tags.
pub fn discover_cross_source(vault_path: &str) -> Result<Vec<CrossSourceConnection>, RememberError> {
    let all_cards = cards::load_all_cards(vault_path)?;
    let mut connections = Vec::new();

    for (i, a) in all_cards.iter().enumerate() {
        for b in all_cards.iter().skip(i + 1) {
            if a.source == b.source && !a.source.is_empty() { continue; }
            let shared: Vec<String> = a.tags.iter()
                .filter(|t| b.tags.contains(t))
                .cloned()
                .collect();
            if !shared.is_empty() {
                connections.push(CrossSourceConnection {
                    card_a: a.path.clone(),
                    card_b: b.path.clone(),
                    shared_tags: shared,
                });
            }
        }
    }

    Ok(connections)
}

/// Insert a wiki-link into a card's content at the given position.
pub fn insert_link(vault_path: &str, card_path: &str, link_title: &str, position: usize, match_length: usize) -> Result<(), RememberError> {
    let full_path = Path::new(vault_path).join(card_path);
    let content = std::fs::read_to_string(&full_path).map_err(RememberError::Io)?;

    if position + match_length > content.len() {
        return Err(RememberError::InvalidCard("Position out of bounds".to_string()));
    }

    let new_content = format!(
        "{}[[{}]]{}",
        &content[..position],
        link_title,
        &content[position + match_length..]
    );

    std::fs::write(&full_path, new_content).map_err(RememberError::Io)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    fn create_test_vault_with_cards() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        // Create some test cards
        let card1 = r#"---
front: What is Rust?
back: A systems programming language
tags: [programming, rust, systems]
source: book1
---"#;
        
        let card2 = r#"---
front: What is memory safety?
back: Protection against buffer overflows
tags: [programming, safety]
source: book2
---"#;
        
        let card3 = r#"---
front: What is JavaScript?
back: A web programming language
tags: [programming, web]
source: book1
---"#;
        
        let card4 = r#"---
front: Database normalization
back: Process of organizing data in a database
tags: [database, design]
source: course1
---"#;

        fs::write(vault_path.join("card1.md"), card1).unwrap();
        fs::write(vault_path.join("card2.md"), card2).unwrap();
        fs::write(vault_path.join("card3.md"), card3).unwrap();
        fs::write(vault_path.join("card4.md"), card4).unwrap();
        
        temp_dir
    }

    #[test]
    fn test_related_card_structure() {
        let related = RelatedCard {
            path: "test.md".to_string(),
            front: "Test Question".to_string(),
            score: 5.5,
        };
        
        assert_eq!(related.path, "test.md");
        assert_eq!(related.front, "Test Question");
        assert_eq!(related.score, 5.5);
    }

    #[test]
    fn test_auto_link_suggestion_structure() {
        let suggestion = AutoLinkSuggestion {
            title: "Test Link".to_string(),
            position: 10,
            match_length: 5,
        };
        
        assert_eq!(suggestion.title, "Test Link");
        assert_eq!(suggestion.position, 10);
        assert_eq!(suggestion.match_length, 5);
    }

    #[test]
    fn test_connection_stats_structure() {
        let stats = ConnectionStats {
            total_cards: 100,
            linked_cards: 80,
            orphan_cards: 20,
            avg_links_per_card: 2.5,
        };
        
        assert_eq!(stats.total_cards, 100);
        assert_eq!(stats.linked_cards, 80);
        assert_eq!(stats.orphan_cards, 20);
        assert_eq!(stats.avg_links_per_card, 2.5);
    }

    #[test]
    fn test_cross_source_connection_structure() {
        let connection = CrossSourceConnection {
            card_a: "card1.md".to_string(),
            card_b: "card2.md".to_string(),
            shared_tags: vec!["programming".to_string(), "rust".to_string()],
        };
        
        assert_eq!(connection.card_a, "card1.md");
        assert_eq!(connection.card_b, "card2.md");
        assert_eq!(connection.shared_tags.len(), 2);
    }

    #[test]
    fn test_find_related_by_tags() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        // Find cards related to card1 (rust programming)
        let result = find_related(vault_path, "card1.md", 10);
        assert!(result.is_ok());
        
        let related = result.unwrap();
        // Should find card2 and card3 (both have "programming" tag)
        assert!(related.len() >= 1);
        
        // Check that scores are calculated correctly
        let programming_matches: Vec<_> = related.iter()
            .filter(|r| r.path == "card2.md" || r.path == "card3.md")
            .collect();
        assert!(!programming_matches.is_empty());
    }

    #[test]
    fn test_find_related_by_source() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = find_related(vault_path, "card1.md", 10);
        assert!(result.is_ok());
        
        let related = result.unwrap();
        // card3 should have higher score because it shares both tags and source with card1
        let card3_match = related.iter().find(|r| r.path == "card3.md");
        if let Some(card3) = card3_match {
            assert!(card3.score >= 3.0); // Should get points for same source
        }
    }

    #[test]
    fn test_find_related_nonexistent_card() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = find_related(vault_path, "nonexistent.md", 10);
        assert!(result.is_err());
        
        if let Err(RememberError::CardNotFound(path)) = result {
            assert_eq!(path, "nonexistent.md");
        } else {
            panic!("Expected CardNotFound error");
        }
    }

    #[test]
    fn test_find_related_with_limit() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = find_related(vault_path, "card1.md", 1);
        assert!(result.is_ok());
        
        let related = result.unwrap();
        assert!(related.len() <= 1);
    }

    #[test]
    fn test_find_auto_links() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        // Create cards with specific content for auto-linking
        let card1 = r#"---
front: Programming concept
back: Understanding memory safety is crucial for systems programming
tags: [programming]
---"#;
        
        let card2 = r#"---
front: memory safety
back: Protection against buffer overflows
tags: [safety]
---"#;
        
        fs::write(vault_path.join("card1.md"), card1).unwrap();
        fs::write(vault_path.join("card2.md"), card2).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = find_auto_links(vault_str, "card1.md");
        assert!(result.is_ok());
        
        let suggestions = result.unwrap();
        // Should find "memory safety" in card1's back text
        let memory_safety_match = suggestions.iter()
            .find(|s| s.title == "memory safety");
        assert!(memory_safety_match.is_some());
    }

    #[test]
    fn test_find_auto_links_case_insensitive() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        let card1 = r#"---
front: Programming concept
back: MEMORY SAFETY is important
tags: [programming]
---"#;
        
        let card2 = r#"---
front: memory safety
back: Protection
tags: [safety]
---"#;
        
        fs::write(vault_path.join("card1.md"), card1).unwrap();
        fs::write(vault_path.join("card2.md"), card2).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = find_auto_links(vault_str, "card1.md");
        assert!(result.is_ok());
        
        let suggestions = result.unwrap();
        assert!(!suggestions.is_empty());
    }

    #[test]
    fn test_find_auto_links_short_titles_ignored() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        let card1 = r#"---
front: Test
back: This is a test
tags: []
---"#;
        
        let card2 = r#"---
front: is
back: Definition
tags: []
---"#;
        
        fs::write(vault_path.join("card1.md"), card1).unwrap();
        fs::write(vault_path.join("card2.md"), card2).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = find_auto_links(vault_str, "card1.md");
        assert!(result.is_ok());
        
        let suggestions = result.unwrap();
        // "is" should be ignored because it's less than 3 characters
        assert!(suggestions.is_empty());
    }

    #[test]
    fn test_get_connection_stats() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = get_connection_stats(vault_path);
        assert!(result.is_ok());
        
        let stats = result.unwrap();
        assert_eq!(stats.total_cards, 4);
        assert!(stats.linked_cards > 0); // All cards have tags/sources
        assert!(stats.orphan_cards < stats.total_cards);
        assert!(stats.avg_links_per_card > 0.0);
    }

    #[test]
    fn test_get_connection_stats_empty_vault() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();
        
        let result = get_connection_stats(vault_path);
        assert!(result.is_ok());
        
        let stats = result.unwrap();
        assert_eq!(stats.total_cards, 0);
        assert_eq!(stats.linked_cards, 0);
        assert_eq!(stats.orphan_cards, 0);
        assert_eq!(stats.avg_links_per_card, 0.0);
    }

    #[test]
    fn test_discover_cross_source() {
        let temp_vault = create_test_vault_with_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = discover_cross_source(vault_path);
        assert!(result.is_ok());
        
        let connections = result.unwrap();
        // Should find connections between cards from different sources sharing tags
        let programming_connections: Vec<_> = connections.iter()
            .filter(|c| c.shared_tags.contains(&"programming".to_string()))
            .collect();
        assert!(!programming_connections.is_empty());
    }

    #[test]
    fn test_discover_cross_source_no_shared_tags() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        let card1 = r#"---
front: Question 1
back: Answer 1
tags: [unique1]
source: source1
---"#;
        
        let card2 = r#"---
front: Question 2
back: Answer 2
tags: [unique2]
source: source2
---"#;
        
        fs::write(vault_path.join("card1.md"), card1).unwrap();
        fs::write(vault_path.join("card2.md"), card2).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = discover_cross_source(vault_str);
        assert!(result.is_ok());
        
        let connections = result.unwrap();
        assert!(connections.is_empty());
    }

    #[test]
    fn test_insert_link() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        let card_content = r#"---
front: Question
back: This is about memory safety
tags: []
---"#;
        
        fs::write(vault_path.join("test.md"), card_content).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = insert_link(vault_str, "test.md", "Memory Safety", 56, 13); // Replace "memory safety"
        assert!(result.is_ok());
        
        let new_content = fs::read_to_string(vault_path.join("test.md")).unwrap();
        assert!(new_content.contains("[[Memory Safety]]"));
        assert!(!new_content.contains("memory safety"));
    }

    #[test]
    fn test_insert_link_out_of_bounds() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        let card_content = "Short content";
        fs::write(vault_path.join("test.md"), card_content).unwrap();
        
        let vault_str = vault_path.to_str().unwrap();
        let result = insert_link(vault_str, "test.md", "Link", 100, 5);
        assert!(result.is_err());
        
        if let Err(RememberError::InvalidCard(_)) = result {
            // Expected error
        } else {
            panic!("Expected InvalidCard error");
        }
    }

    #[test]
    fn test_insert_link_nonexistent_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_str = temp_dir.path().to_str().unwrap();
        
        let result = insert_link(vault_str, "nonexistent.md", "Link", 0, 5);
        assert!(result.is_err());
        
        if let Err(RememberError::Io(_)) = result {
            // Expected IO error
        } else {
            panic!("Expected IO error");
        }
    }
}
