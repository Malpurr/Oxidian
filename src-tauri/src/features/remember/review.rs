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
