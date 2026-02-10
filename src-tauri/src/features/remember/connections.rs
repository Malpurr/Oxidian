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
