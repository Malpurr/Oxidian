// Oxidian — Remember Review: Review session management

use serde::{Deserialize, Serialize};

use super::cards::{self, Card};

use super::stats;
use super::error::RememberError;

/// Summary of a completed review session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewSummary {
    pub total: usize,
    pub again: usize,
    pub hard: usize,
    pub okay: usize,
    pub good: usize,
    pub easy: usize,
    pub perfect: usize,
}

/// A single review result for a card.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewResult {
    pub card_path: String,
    pub quality: u8,
    pub new_interval: u32,
    pub new_ease: f64,
    pub next_review: String,
}

/// Quality label mapping (SM-2 scale 0-5).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityOption {
    pub quality: u8,
    pub label: String,
    pub color: String,
    pub key: String,
}

/// Get the quality options for the review UI.
pub fn quality_options() -> Vec<QualityOption> {
    vec![
        QualityOption { quality: 0, label: "Blackout".into(), color: "#e74c3c".into(), key: "1".into() },
        QualityOption { quality: 1, label: "Wrong".into(), color: "#e74c3c".into(), key: "2".into() },
        QualityOption { quality: 2, label: "Almost".into(), color: "#e67e22".into(), key: "3".into() },
        QualityOption { quality: 3, label: "Hard".into(), color: "#f39c12".into(), key: "4".into() },
        QualityOption { quality: 4, label: "Good".into(), color: "#27ae60".into(), key: "5".into() },
        QualityOption { quality: 5, label: "Easy".into(), color: "#3498db".into(), key: "6".into() },
    ]
}

/// Get cards due for review today.
pub fn get_review_queue(vault_path: &str) -> Result<Vec<Card>, RememberError> {
    cards::get_due_cards(vault_path)
}

/// Review a single card with the given quality (0-5).
pub fn review_card(vault_path: &str, card_path: &str, quality: u8) -> Result<ReviewResult, RememberError> {
    let all_cards = cards::load_all_cards(vault_path)?;
    let mut card = all_cards.into_iter().find(|c| c.path == card_path)
        .ok_or_else(|| RememberError::CardNotFound(card_path.to_string()))?;

    let result = cards::review_card(vault_path, &mut card, quality)?;

    // Record in stats
    let quality_label = match quality {
        0 | 1 => "again", 2 | 3 => "hard", 4 => "good", 5 => "easy", _ => "good",
    };
    if let Err(e) = stats::record_review(vault_path, quality_label) {
        log::warn!("Failed to record review stat: {}", e);
    }

    Ok(ReviewResult {
        card_path: card.path, quality, new_interval: result.interval,
        new_ease: result.ease_factor, next_review: card.next_review,
    })
}

/// Batch review: process multiple cards at once.
pub fn batch_review(vault_path: &str, reviews: Vec<(String, u8)>) -> Result<ReviewSummary, RememberError> {
    let mut summary = ReviewSummary { total: reviews.len(), again: 0, hard: 0, okay: 0, good: 0, easy: 0, perfect: 0 };
    for (card_path, quality) in reviews {
        review_card(vault_path, &card_path, quality)?;
        match quality {
            0 | 1 => summary.again += 1,
            2 => summary.hard += 1,
            3 => summary.okay += 1,
            4 => summary.good += 1,
            5 => { summary.easy += 1; summary.perfect += 1; },
            _ => summary.good += 1,
        }
    }
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    fn create_test_vault_with_review_cards() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        // Create a card due for review (today's date)
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let card_due = format!(r#"---
front: What is Rust?
back: A systems programming language
tags: [programming]
next_review: {}
interval: 1
ease_factor: 2.5
repetitions: 1
---"#, today);
        
        let card_not_due = r#"---
front: Future card
back: This card is not due yet
tags: [future]
next_review: 2099-12-31
interval: 30
ease_factor: 2.5
repetitions: 3
---"#;
        
        fs::write(vault_path.join("due_card.md"), card_due).unwrap();
        fs::write(vault_path.join("future_card.md"), card_not_due).unwrap();
        
        temp_dir
    }

    #[test]
    fn test_review_summary_structure() {
        let summary = ReviewSummary {
            total: 10,
            again: 1,
            hard: 2,
            okay: 3,
            good: 3,
            easy: 1,
            perfect: 1,
        };
        
        assert_eq!(summary.total, 10);
        assert_eq!(summary.again, 1);
        assert_eq!(summary.hard, 2);
        assert_eq!(summary.okay, 3);
        assert_eq!(summary.good, 3);
        assert_eq!(summary.easy, 1);
        assert_eq!(summary.perfect, 1);
    }

    #[test]
    fn test_review_result_structure() {
        let result = ReviewResult {
            card_path: "test.md".to_string(),
            quality: 4,
            new_interval: 7,
            new_ease: 2.6,
            next_review: "2024-01-15".to_string(),
        };
        
        assert_eq!(result.card_path, "test.md");
        assert_eq!(result.quality, 4);
        assert_eq!(result.new_interval, 7);
        assert_eq!(result.new_ease, 2.6);
        assert_eq!(result.next_review, "2024-01-15");
    }

    #[test]
    fn test_quality_option_structure() {
        let option = QualityOption {
            quality: 4,
            label: "Good".to_string(),
            color: "#27ae60".to_string(),
            key: "5".to_string(),
        };
        
        assert_eq!(option.quality, 4);
        assert_eq!(option.label, "Good");
        assert_eq!(option.color, "#27ae60");
        assert_eq!(option.key, "5");
    }

    #[test]
    fn test_quality_options_complete() {
        let options = quality_options();
        
        assert_eq!(options.len(), 6); // Should have 6 options (0-5)
        
        // Check that we have all quality levels 0-5
        for i in 0..=5 {
            assert!(options.iter().any(|opt| opt.quality == i));
        }
        
        // Check specific properties of some options
        let blackout = options.iter().find(|o| o.quality == 0).unwrap();
        assert_eq!(blackout.label, "Blackout");
        assert_eq!(blackout.key, "1");
        
        let easy = options.iter().find(|o| o.quality == 5).unwrap();
        assert_eq!(easy.label, "Easy");
        assert_eq!(easy.key, "6");
    }

    #[test]
    fn test_quality_options_colors() {
        let options = quality_options();
        
        // Check that colors are valid hex codes
        for option in &options {
            assert!(option.color.starts_with('#'));
            assert_eq!(option.color.len(), 7); // #RRGGBB format
        }
        
        // Check color progression (bad to good)
        let blackout_color = options.iter().find(|o| o.quality == 0).unwrap().color.clone();
        let easy_color = options.iter().find(|o| o.quality == 5).unwrap().color.clone();
        
        assert_eq!(blackout_color, "#e74c3c"); // Red for bad
        assert_eq!(easy_color, "#3498db"); // Blue for easy
    }

    #[test]
    fn test_quality_options_keys_unique() {
        let options = quality_options();
        let keys: Vec<_> = options.iter().map(|o| &o.key).collect();
        let mut unique_keys = keys.clone();
        unique_keys.sort();
        unique_keys.dedup();
        
        // All keys should be unique
        assert_eq!(keys.len(), unique_keys.len());
    }

    #[test]
    fn test_get_review_queue() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = get_review_queue(vault_path);
        assert!(result.is_ok());
        
        let queue = result.unwrap();
        // Should include cards that are due
        assert!(!queue.is_empty());
        
        // The due card should be in the queue
        assert!(queue.iter().any(|c| c.path == "due_card.md"));
    }

    #[test]
    fn test_get_review_queue_empty() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();
        
        let result = get_review_queue(vault_path);
        assert!(result.is_ok());
        
        let queue = result.unwrap();
        assert!(queue.is_empty());
    }

    #[test]
    fn test_review_card_basic() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = review_card(vault_path, "due_card.md", 4); // Good quality
        assert!(result.is_ok());
        
        let review_result = result.unwrap();
        assert_eq!(review_result.card_path, "due_card.md");
        assert_eq!(review_result.quality, 4);
        assert!(review_result.new_interval > 1); // Should increase interval
        assert!(!review_result.next_review.is_empty());
    }

    #[test]
    fn test_review_card_nonexistent() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = review_card(vault_path, "nonexistent.md", 4);
        assert!(result.is_err());
        
        if let Err(RememberError::CardNotFound(path)) = result {
            assert_eq!(path, "nonexistent.md");
        } else {
            panic!("Expected CardNotFound error");
        }
    }

    #[test]
    fn test_review_card_quality_range() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        // Test different quality levels
        for quality in 0..=5 {
            // We need a fresh card for each test due to SM-2 state changes
            let card_name = format!("test_card_{}.md", quality);
            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            let card_content = format!(r#"---
front: Test question {}
back: Test answer
tags: [test]
next_review: {}
interval: 1
ease_factor: 2.5
repetitions: 1
---"#, quality, today);
            
            fs::write(temp_vault.path().join(&card_name), card_content).unwrap();
            
            let result = review_card(vault_path, &card_name, quality);
            assert!(result.is_ok(), "Failed for quality {}", quality);
            
            let review_result = result.unwrap();
            assert_eq!(review_result.quality, quality);
        }
    }

    #[test]
    fn test_batch_review_empty() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let result = batch_review(vault_path, vec![]);
        assert!(result.is_ok());
        
        let summary = result.unwrap();
        assert_eq!(summary.total, 0);
        assert_eq!(summary.again, 0);
        assert_eq!(summary.good, 0);
    }

    #[test]
    fn test_batch_review_single_card() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let reviews = vec![("due_card.md".to_string(), 4)];
        let result = batch_review(vault_path, reviews);
        assert!(result.is_ok());
        
        let summary = result.unwrap();
        assert_eq!(summary.total, 1);
        assert_eq!(summary.good, 1);
        assert_eq!(summary.again, 0);
    }

    #[test]
    fn test_batch_review_multiple_cards() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        // Create additional cards for batch review
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        for i in 1..=3 {
            let card_content = format!(r#"---
front: Test question {}
back: Test answer
tags: [test]
next_review: {}
interval: 1
ease_factor: 2.5
repetitions: 1
---"#, i, today);
            
            fs::write(temp_vault.path().join(&format!("batch_card_{}.md", i)), card_content).unwrap();
        }
        
        let reviews = vec![
            ("batch_card_1.md".to_string(), 1), // Again
            ("batch_card_2.md".to_string(), 3), // Okay
            ("batch_card_3.md".to_string(), 5), // Easy (also perfect)
        ];
        
        let result = batch_review(vault_path, reviews);
        assert!(result.is_ok());
        
        let summary = result.unwrap();
        assert_eq!(summary.total, 3);
        assert_eq!(summary.again, 1);
        assert_eq!(summary.okay, 1);
        assert_eq!(summary.easy, 1);
        assert_eq!(summary.perfect, 1); // Quality 5 counts as perfect
    }

    #[test]
    fn test_batch_review_quality_distribution() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        // Create cards for each quality level
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut reviews = Vec::new();
        
        for quality in 0..=5 {
            let card_name = format!("quality_{}.md", quality);
            let card_content = format!(r#"---
front: Quality {} card
back: Test answer
tags: [test]
next_review: {}
interval: 1
ease_factor: 2.5
repetitions: 1
---"#, quality, today);
            
            fs::write(temp_vault.path().join(&card_name), card_content).unwrap();
            reviews.push((card_name, quality));
        }
        
        let result = batch_review(vault_path, reviews);
        assert!(result.is_ok());
        
        let summary = result.unwrap();
        assert_eq!(summary.total, 6);
        assert_eq!(summary.again, 2); // Quality 0, 1
        assert_eq!(summary.hard, 1);  // Quality 2
        assert_eq!(summary.okay, 1);  // Quality 3
        assert_eq!(summary.good, 1);  // Quality 4
        assert_eq!(summary.easy, 1);  // Quality 5
        assert_eq!(summary.perfect, 1); // Only quality 5 counts as perfect
    }

    #[test]
    fn test_batch_review_invalid_card() {
        let temp_vault = create_test_vault_with_review_cards();
        let vault_path = temp_vault.path().to_str().unwrap();
        
        let reviews = vec![("nonexistent.md".to_string(), 4)];
        let result = batch_review(vault_path, reviews);
        assert!(result.is_err());
    }

    #[test]
    fn test_serialization_review_summary() {
        let summary = ReviewSummary {
            total: 5,
            again: 1,
            hard: 1,
            okay: 1,
            good: 1,
            easy: 1,
            perfect: 1,
        };
        
        let serialized = serde_json::to_string(&summary).expect("Should serialize");
        assert!(serialized.contains("\"total\":5"));
        assert!(serialized.contains("\"perfect\":1"));
        
        let deserialized: ReviewSummary = serde_json::from_str(&serialized).expect("Should deserialize");
        assert_eq!(deserialized.total, summary.total);
        assert_eq!(deserialized.perfect, summary.perfect);
    }

    #[test]
    fn test_serialization_quality_option() {
        let option = QualityOption {
            quality: 4,
            label: "Good".to_string(),
            color: "#27ae60".to_string(),
            key: "5".to_string(),
        };
        
        let serialized = serde_json::to_string(&option).expect("Should serialize");
        let deserialized: QualityOption = serde_json::from_str(&serialized).expect("Should deserialize");
        
        assert_eq!(deserialized.quality, option.quality);
        assert_eq!(deserialized.label, option.label);
        assert_eq!(deserialized.color, option.color);
        assert_eq!(deserialized.key, option.key);
    }
}
