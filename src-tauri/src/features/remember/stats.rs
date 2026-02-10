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

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    fn create_test_cards() -> Vec<Card> {
        vec![
            Card {
                path: "card1.md".to_string(),
                front: "Question 1".to_string(),
                back: "Answer 1".to_string(),
                tags: vec!["test".to_string()],
                source: "test".to_string(),
                next_review: chrono::Local::now().format("%Y-%m-%d").to_string(), // Due today
                last_review: "2024-01-01".to_string(),
                review_count: 1,
                interval: 1,
                ease: 2.5,
                repetitions: 1,
                created: "2024-01-01".to_string(),
            },
            Card {
                path: "card2.md".to_string(),
                front: "Question 2".to_string(),
                back: "Answer 2".to_string(),
                tags: vec!["test".to_string()],
                source: "test".to_string(),
                next_review: "2099-12-31".to_string(), // Future date
                last_review: "2024-01-01".to_string(),
                review_count: 5,
                interval: 30, // Mature card
                ease: 2.8,
                repetitions: 5,
                created: "2024-01-01".to_string(),
            },
            Card {
                path: "card3.md".to_string(),
                front: "Question 3".to_string(),
                back: "Answer 3".to_string(),
                tags: vec!["test".to_string()],
                source: "test".to_string(),
                next_review: "2099-12-31".to_string(),
                last_review: "2024-01-01".to_string(),
                review_count: 2,
                interval: 7, // Young card
                ease: 2.3,
                repetitions: 2,
                created: "2024-01-01".to_string(),
            },
        ]
    }

    #[test]
    fn test_day_stats_default() {
        let stats = DayStats::default();
        assert_eq!(stats.reviewed, 0);
        assert_eq!(stats.again, 0);
        assert_eq!(stats.hard, 0);
        assert_eq!(stats.good, 0);
        assert_eq!(stats.easy, 0);
    }

    #[test]
    fn test_day_stats_structure() {
        let stats = DayStats {
            reviewed: 10,
            again: 2,
            hard: 1,
            good: 5,
            easy: 2,
        };

        assert_eq!(stats.reviewed, 10);
        assert_eq!(stats.again, 2);
        assert_eq!(stats.hard, 1);
        assert_eq!(stats.good, 5);
        assert_eq!(stats.easy, 2);
    }

    #[test]
    fn test_streak_info_structure() {
        let streak = StreakInfo {
            current: 5,
            best: 12,
        };

        assert_eq!(streak.current, 5);
        assert_eq!(streak.best, 12);
    }

    #[test]
    fn test_stats_data_default() {
        let data = StatsData::default();
        assert!(data.daily.is_empty());
        assert_eq!(data.streak.current, 0);
        assert_eq!(data.streak.best, 0);
        assert_eq!(data.total_reviews, 0);
    }

    #[test]
    fn test_day_entry_structure() {
        let entry = DayEntry {
            date: "2024-01-15".to_string(),
            count: 5,
        };

        assert_eq!(entry.date, "2024-01-15");
        assert_eq!(entry.count, 5);
    }

    #[test]
    fn test_load_stats_nonexistent_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let stats = load_stats(vault_path);
        // Should return default stats when file doesn't exist
        assert!(stats.daily.is_empty());
        assert_eq!(stats.total_reviews, 0);
        assert_eq!(stats.streak.current, 0);
    }

    #[test]
    fn test_save_and_load_stats() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let mut data = StatsData::default();
        data.total_reviews = 42;
        data.streak.current = 5;
        data.streak.best = 10;
        data.daily.insert("2024-01-15".to_string(), DayStats {
            reviewed: 3,
            again: 0,
            hard: 1,
            good: 2,
            easy: 0,
        });

        // Save stats
        let result = save_stats(vault_path, &data);
        assert!(result.is_ok());

        // Load stats back
        let loaded = load_stats(vault_path);
        assert_eq!(loaded.total_reviews, 42);
        assert_eq!(loaded.streak.current, 5);
        assert_eq!(loaded.streak.best, 10);
        assert_eq!(loaded.daily.len(), 1);
        
        let day_stats = loaded.daily.get("2024-01-15").unwrap();
        assert_eq!(day_stats.reviewed, 3);
        assert_eq!(day_stats.good, 2);
    }

    #[test]
    fn test_stats_path_creation() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let data = StatsData::default();
        let result = save_stats(vault_path, &data);
        assert!(result.is_ok());

        // Check that the .oxidian directory was created
        let oxidian_dir = temp_dir.path().join(".oxidian");
        assert!(oxidian_dir.exists());

        // Check that the stats file was created
        let stats_file = oxidian_dir.join("remember-stats.json");
        assert!(stats_file.exists());
    }

    #[test]
    fn test_record_review() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        // Record some reviews
        let result = record_review(vault_path, "good");
        assert!(result.is_ok());

        let result = record_review(vault_path, "again");
        assert!(result.is_ok());

        let result = record_review(vault_path, "easy");
        assert!(result.is_ok());

        // Load stats and verify
        let data = load_stats(vault_path);
        assert_eq!(data.total_reviews, 3);

        let today = sm2::today_iso();
        let today_stats = data.daily.get(&today).unwrap();
        assert_eq!(today_stats.reviewed, 3);
        assert_eq!(today_stats.good, 1);
        assert_eq!(today_stats.again, 1);
        assert_eq!(today_stats.easy, 1);
        assert_eq!(today_stats.hard, 0);
    }

    #[test]
    fn test_record_review_unknown_quality() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let result = record_review(vault_path, "unknown_quality");
        assert!(result.is_ok());

        let data = load_stats(vault_path);
        assert_eq!(data.total_reviews, 1);

        let today = sm2::today_iso();
        let today_stats = data.daily.get(&today).unwrap();
        assert_eq!(today_stats.reviewed, 1);
        // All quality counters should be 0 for unknown quality
        assert_eq!(today_stats.good + today_stats.again + today_stats.hard + today_stats.easy, 0);
    }

    #[test]
    fn test_get_computed_stats() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        // Record some reviews for today
        record_review(vault_path, "good").unwrap();
        record_review(vault_path, "easy").unwrap();

        let cards = create_test_cards();
        let stats = get_computed_stats(vault_path, &cards);

        assert_eq!(stats.total_cards, 3);
        assert_eq!(stats.total_reviews, 2);
        assert_eq!(stats.reviewed_today, 2);
        assert_eq!(stats.due_today, 1); // Only card1 is due
        assert_eq!(stats.mature_cards, 1); // card2 with interval > 21
        assert_eq!(stats.young_cards, 1); // card3 with interval 7
        assert!(stats.avg_ease > 0.0);
        assert_eq!(stats.last_30.len(), 30);
    }

    #[test]
    fn test_get_computed_stats_empty_cards() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let empty_cards = vec![];
        let stats = get_computed_stats(vault_path, &empty_cards);

        assert_eq!(stats.total_cards, 0);
        assert_eq!(stats.due_today, 0);
        assert_eq!(stats.mature_cards, 0);
        assert_eq!(stats.young_cards, 0);
        assert_eq!(stats.avg_ease, 0.0);
    }

    #[test]
    fn test_get_computed_stats_average_ease() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let cards = vec![
            Card {
                path: "card1.md".to_string(),
                front: "Q1".to_string(),
                back: "A1".to_string(),
                tags: vec![],
                source: "test".to_string(),
                next_review: "2099-12-31".to_string(),
                last_review: "2024-01-01".to_string(),
                review_count: 1,
                interval: 1,
                ease: 2.0,
                repetitions: 1,
                created: "2024-01-01".to_string(),
            },
            Card {
                path: "card2.md".to_string(),
                front: "Q2".to_string(),
                back: "A2".to_string(),
                tags: vec![],
                source: "test".to_string(),
                next_review: "2099-12-31".to_string(),
                last_review: "2024-01-01".to_string(),
                review_count: 1,
                interval: 1,
                ease: 3.0,
                repetitions: 1,
                created: "2024-01-01".to_string(),
            },
        ];

        let stats = get_computed_stats(vault_path, &cards);
        assert_eq!(stats.avg_ease, 2.5); // (2.0 + 3.0) / 2 = 2.5
    }

    #[test]
    fn test_get_heatmap() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        // Record some reviews
        record_review(vault_path, "good").unwrap();
        record_review(vault_path, "good").unwrap();

        let heatmap = get_heatmap(vault_path);
        assert_eq!(heatmap.len(), 365);

        // Today should have 2 reviews
        let today_entry = heatmap.last().unwrap();
        assert_eq!(today_entry.count, 2);

        // All entries should have dates
        for entry in &heatmap {
            assert!(!entry.date.is_empty());
            assert!(entry.date.len() == 10); // YYYY-MM-DD format
        }
    }

    #[test]
    fn test_update_streak_calculation() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        // Record reviews for consecutive days (simulate)
        let mut data = StatsData::default();
        let today = chrono::Local::now().date_naive();
        
        // Add reviews for today and yesterday
        let today_str = today.format("%Y-%m-%d").to_string();
        let yesterday_str = (today - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
        
        data.daily.insert(today_str, DayStats { reviewed: 3, ..Default::default() });
        data.daily.insert(yesterday_str, DayStats { reviewed: 2, ..Default::default() });
        
        update_streak(&mut data);
        
        // Should calculate a streak of 2 days
        assert_eq!(data.streak.current, 2);
        assert_eq!(data.streak.best, 2);
    }

    #[test]
    fn test_update_streak_broken() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path().to_str().unwrap();

        let mut data = StatsData::default();
        let today = chrono::Local::now().date_naive();
        
        // Add review for today but not yesterday (broken streak)
        let today_str = today.format("%Y-%m-%d").to_string();
        data.daily.insert(today_str, DayStats { reviewed: 1, ..Default::default() });
        
        update_streak(&mut data);
        
        // Should only count today
        assert_eq!(data.streak.current, 1);
    }

    #[test]
    fn test_serialization_computed_stats() {
        let stats = ComputedStats {
            total_cards: 10,
            total_reviews: 100,
            reviewed_today: 5,
            due_today: 3,
            avg_ease: 2.5,
            mature_cards: 7,
            young_cards: 2,
            current_streak: 5,
            best_streak: 12,
            last_30: vec![DayEntry { date: "2024-01-15".to_string(), count: 3 }],
        };

        let serialized = serde_json::to_string(&stats).expect("Should serialize");
        assert!(serialized.contains("\"total_cards\":10"));
        assert!(serialized.contains("\"avg_ease\":2.5"));

        let deserialized: ComputedStats = serde_json::from_str(&serialized).expect("Should deserialize");
        assert_eq!(deserialized.total_cards, stats.total_cards);
        assert_eq!(deserialized.avg_ease, stats.avg_ease);
        assert_eq!(deserialized.last_30.len(), 1);
    }

    #[test]
    fn test_load_stats_corrupted_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let vault_path = temp_dir.path();
        
        // Create .oxidian directory and write corrupted JSON
        let oxidian_dir = vault_path.join(".oxidian");
        fs::create_dir_all(&oxidian_dir).unwrap();
        fs::write(oxidian_dir.join("remember-stats.json"), "invalid json").unwrap();

        let vault_str = vault_path.to_str().unwrap();
        let stats = load_stats(vault_str);
        
        // Should return default stats for corrupted file
        assert!(stats.daily.is_empty());
        assert_eq!(stats.total_reviews, 0);
    }
}
