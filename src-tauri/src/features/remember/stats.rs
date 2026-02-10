// Oxidian — Remember Stats: Statistics computation
// Data stored in .oxidian/remember-stats.json

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

use super::cards::Card;
use super::error::RememberError;
use super::sm2;

const STATS_FILE: &str = ".oxidian/remember-stats.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayStats {
    pub reviewed: u32,
    pub again: u32,
    pub hard: u32,
    pub good: u32,
    pub easy: u32,
}

impl Default for DayStats {
    fn default() -> Self {
        Self { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreakInfo {
    pub current: u32,
    pub best: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsData {
    pub daily: HashMap<String, DayStats>,
    pub streak: StreakInfo,
    pub total_reviews: u64,
}

impl Default for StatsData {
    fn default() -> Self {
        Self {
            daily: HashMap::new(),
            streak: StreakInfo { current: 0, best: 0 },
            total_reviews: 0,
        }
    }
}

/// Computed stats for the dashboard.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputedStats {
    pub total_cards: usize,
    pub total_reviews: u64,
    pub reviewed_today: u32,
    pub due_today: usize,
    pub avg_ease: f64,
    pub mature_cards: usize,
    pub young_cards: usize,
    pub current_streak: u32,
    pub best_streak: u32,
    pub last_30: Vec<DayEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DayEntry {
    pub date: String,
    pub count: u32,
}

// ─── Persistence ─────────────────────────────────────────────────────

fn stats_path(vault_path: &str) -> std::path::PathBuf {
    Path::new(vault_path).join(STATS_FILE)
}

pub fn load_stats(vault_path: &str) -> StatsData {
    let path = stats_path(vault_path);
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(data) = serde_json::from_str(&content) {
                return data;
            }
        }
    }
    StatsData::default()
}

pub fn save_stats(vault_path: &str, data: &StatsData) -> Result<(), RememberError> {
    let path = stats_path(vault_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(RememberError::Io)?;
    }
    let json = serde_json::to_string_pretty(data)
        .map_err(|e| RememberError::Serialization(e.to_string()))?;
    std::fs::write(&path, json).map_err(RememberError::Io)?;
    Ok(())
}

// ─── Core API ────────────────────────────────────────────────────────

/// Record a review event.
pub fn record_review(vault_path: &str, quality_label: &str) -> Result<(), RememberError> {
    let mut data = load_stats(vault_path);
    let today = sm2::today_iso();

    let day = data.daily.entry(today).or_insert_with(DayStats::default);
    day.reviewed += 1;
    match quality_label {
        "again" => day.again += 1,
        "hard" => day.hard += 1,
        "good" => day.good += 1,
        "easy" => day.easy += 1,
        _ => {}
    }

    data.total_reviews += 1;
    update_streak(&mut data);
    save_stats(vault_path, &data)
}

fn update_streak(data: &mut StatsData) {
    let mut streak = 0u32;
    let mut date = chrono::Local::now().date_naive();

    loop {
        let key = date.format("%Y-%m-%d").to_string();
        if let Some(day) = data.daily.get(&key) {
            if day.reviewed > 0 {
                streak += 1;
                date -= chrono::Duration::days(1);
                continue;
            }
        }
        break;
    }

    data.streak.current = streak;
    if streak > data.streak.best {
        data.streak.best = streak;
    }
}

/// Compute dashboard statistics.
pub fn get_computed_stats(vault_path: &str, cards: &[Card]) -> ComputedStats {
    let data = load_stats(vault_path);
    let today = sm2::today_iso();

    let today_data = data.daily.get(&today);
    let reviewed_today = today_data.map(|d| d.reviewed).unwrap_or(0);

    let due_today = cards.iter().filter(|c| c.is_due()).count();

    let mature_cards = cards.iter().filter(|c| c.interval > 21).count();
    let young_cards = cards.iter().filter(|c| c.interval > 0 && c.interval <= 21).count();

    let avg_ease = if cards.is_empty() {
        0.0
    } else {
        let sum: f64 = cards.iter().map(|c| c.ease).sum();
        (sum / cards.len() as f64 * 100.0).round() / 100.0
    };

    // Last 30 days
    let mut last_30 = Vec::with_capacity(30);
    let now = chrono::Local::now().date_naive();
    for i in (0..30).rev() {
        let date = now - chrono::Duration::days(i);
        let key = date.format("%Y-%m-%d").to_string();
        let count = data.daily.get(&key).map(|d| d.reviewed).unwrap_or(0);
        last_30.push(DayEntry { date: key, count });
    }

    ComputedStats {
        total_cards: cards.len(),
        total_reviews: data.total_reviews,
        reviewed_today,
        due_today,
        avg_ease,
        mature_cards,
        young_cards,
        current_streak: data.streak.current,
        best_streak: data.streak.best,
        last_30,
    }
}

/// Get heatmap data for the past year (365 days).
pub fn get_heatmap(vault_path: &str) -> Vec<DayEntry> {
    let data = load_stats(vault_path);
    let now = chrono::Local::now().date_naive();
    let mut entries = Vec::with_capacity(365);

    for i in (0..365).rev() {
        let date = now - chrono::Duration::days(i);
        let key = date.format("%Y-%m-%d").to_string();
        let count = data.daily.get(&key).map(|d| d.reviewed).unwrap_or(0);
        entries.push(DayEntry { date: key, count });
    }

    entries
}
