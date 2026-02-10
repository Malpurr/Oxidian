// Oxidian — Remember Cards: Card struct, CRUD, YAML frontmatter
// Cards stored as Markdown files in Cards/ folder with YAML frontmatter.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

use super::sm2;
use super::error::RememberError;

const CARDS_FOLDER: &str = "Cards";

/// A spaced-repetition flashcard.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub path: String,
    pub front: String,
    pub back: String,
    pub source: String,
    pub tags: Vec<String>,
    pub interval: u32,
    pub ease: f64,
    pub next_review: String,
    pub last_review: String,
    pub review_count: u32,
    pub repetitions: u32,
    pub created: String,
}

/// Parameters for creating/updating a card.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardInput {
    pub front: String,
    pub back: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub existing_path: Option<String>,
}

impl Card {
    /// Build markdown content with YAML frontmatter for this card.
    pub fn to_markdown(&self) -> String {
        let tags_yaml = if self.tags.is_empty() {
            "[]".to_string()
        } else {
            format!("[{}]", self.tags.join(", "))
        };
        let source_yaml = if self.source.is_empty() {
            "\"\"".to_string()
        } else {
            format!("\"{}\"", self.source)
        };
        let last_review = if self.last_review.is_empty() {
            "null".to_string()
        } else {
            self.last_review.clone()
        };

        format!(
            "---\ntype: card\nsource: {}\ntags: {}\ninterval: {}\nease: {}\nnext_review: {}\nlast_review: {}\nreview_count: {}\nrepetitions: {}\ncreated: {}\n---\n# {}\n\n{}\n",
            source_yaml, tags_yaml, self.interval, self.ease,
            self.next_review, last_review, self.review_count,
            self.repetitions, self.created, self.front, self.back,
        )
    }

    /// Parse a Card from markdown content + file path.
    pub fn from_markdown(path: &str, content: &str) -> Result<Self, RememberError> {
        let (fm_opt, body) = crate::engine::frontmatter::parse_frontmatter(content)
            .map_err(|e| RememberError::InvalidCard(format!("{}: frontmatter parse error: {}", path, e)))?;

        // Convert engine Frontmatter to HashMap for compatibility
        let meta: HashMap<String, String> = if let Some(fm) = fm_opt {
            let mut m = HashMap::new();
            if let Some(ref t) = fm.title { m.insert("title".to_string(), t.clone()); }
            for (k, v) in &fm.extra {
                m.insert(k.clone(), match v {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Null => "null".to_string(),
                    other => other.to_string().trim_matches('"').to_string(),
                });
            }
            // Also handle tags specially
            if !fm.tags.is_empty() {
                m.insert("tags".to_string(), format!("[{}]", fm.tags.join(", ")));
            }
            m
        } else {
            HashMap::new()
        };

        if meta.get("type").map(|s| s.as_str()) != Some("card") {
            return Err(RememberError::InvalidCard(format!(
                "{}: not a card (type={:?})", path, meta.get("type")
            )));
        }

        let (front, back) = parse_card_body(body);
        let tags = parse_tags(meta.get("tags").map(|s| s.as_str()).unwrap_or(""));
        let source = meta.get("source").map(|s| s.trim_matches('"').to_string()).unwrap_or_default();

        Ok(Card {
            path: path.to_string(),
            front, back, source, tags,
            interval: parse_u32(&meta, "interval", 0),
            ease: parse_f64(&meta, "ease", 2.5),
            next_review: meta.get("next_review").cloned().unwrap_or_default(),
            last_review: meta.get("last_review").filter(|s| s.as_str() != "null").cloned().unwrap_or_default(),
            review_count: parse_u32(&meta, "review_count", 0),
            repetitions: parse_u32(&meta, "repetitions", 0),
            created: meta.get("created").cloned().unwrap_or_else(sm2::today_iso),
        })
    }

    pub fn is_due(&self) -> bool {
        if self.next_review.is_empty() { return true; }
        self.next_review <= sm2::today_iso()
    }

    pub fn overdue_days(&self) -> i64 {
        if self.next_review.is_empty() { return 0; }
        let today = chrono::Local::now().date_naive();
        if let Ok(nr) = chrono::NaiveDate::parse_from_str(&self.next_review, "%Y-%m-%d") {
            (today - nr).num_days().max(0)
        } else { 0 }
    }
}

// ─── Card Manager (filesystem operations) ───────────────────────────

pub fn load_all_cards(vault_path: &str) -> Result<Vec<Card>, RememberError> {
    let cards_dir = Path::new(vault_path).join(CARDS_FOLDER);
    if !cards_dir.exists() { return Ok(Vec::new()); }

    let mut cards = Vec::new();
    for entry in walkdir::WalkDir::new(&cards_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() || path.extension().map(|e| e != "md").unwrap_or(true) { continue; }
        let relative = path.strip_prefix(vault_path).unwrap_or(path).to_string_lossy().replace('\\', "/");
        if let Ok(content) = std::fs::read_to_string(path) {
            if let Ok(card) = Card::from_markdown(&relative, &content) {
                cards.push(card);
            }
        }
    }
    Ok(cards)
}

pub fn save_card(vault_path: &str, card: &Card) -> Result<String, RememberError> {
    let cards_dir = Path::new(vault_path).join(CARDS_FOLDER);
    std::fs::create_dir_all(&cards_dir).map_err(RememberError::Io)?;
    let full_path = Path::new(vault_path).join(&card.path);
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(RememberError::Io)?;
    }
    std::fs::write(&full_path, card.to_markdown()).map_err(RememberError::Io)?;
    Ok(card.path.clone())
}

pub fn create_card(vault_path: &str, input: &CardInput) -> Result<Card, RememberError> {
    let today = sm2::today_iso();
    let tomorrow = sm2::next_review_date(1);
    let path = match &input.existing_path {
        Some(p) => p.clone(),
        None => format!("{}/{}.md", CARDS_FOLDER, slugify(&input.front)),
    };
    let card = Card {
        path, front: input.front.clone(), back: input.back.clone(),
        source: input.source.clone(), tags: input.tags.clone(),
        interval: 0, ease: 2.5, next_review: tomorrow,
        last_review: String::new(), review_count: 0, repetitions: 0,
        created: today,
    };
    save_card(vault_path, &card)?;
    Ok(card)
}

pub fn delete_card(vault_path: &str, card_path: &str) -> Result<(), RememberError> {
    let full_path = Path::new(vault_path).join(card_path);
    if full_path.exists() { std::fs::remove_file(&full_path).map_err(RememberError::Io)?; }
    Ok(())
}

pub fn review_card(vault_path: &str, card: &mut Card, quality: u8) -> Result<sm2::Sm2Result, RememberError> {
    let result = sm2::sm2_review(quality, card.repetitions, card.interval, card.ease);
    card.interval = result.interval;
    card.ease = result.ease_factor;
    card.repetitions = result.repetitions;
    card.next_review = sm2::next_review_date(result.interval);
    card.last_review = sm2::today_iso();
    card.review_count += 1;
    save_card(vault_path, card)?;
    Ok(result)
}

pub fn get_due_cards(vault_path: &str) -> Result<Vec<Card>, RememberError> {
    let mut cards = load_all_cards(vault_path)?;
    cards.retain(|c| c.is_due());
    cards.sort_by(|a, b| {
        b.overdue_days().cmp(&a.overdue_days())
            .then(a.ease.partial_cmp(&b.ease).unwrap_or(std::cmp::Ordering::Equal))
    });
    Ok(cards)
}

// ─── Helpers ─────────────────────────────────────────────────────────

fn slugify(text: &str) -> String {
    text.to_lowercase().trim()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c }
             else if c.is_whitespace() { '-' } else { '\0' })
        .filter(|c| *c != '\0')
        .collect::<String>()
        .split('-').filter(|s| !s.is_empty()).collect::<Vec<_>>().join("-")
        .chars().take(80).collect()
}

fn parse_frontmatter(content: &str) -> (HashMap<String, String>, String) {
    let mut meta = HashMap::new();
    if !content.starts_with("---") { return (meta, content.to_string()); }
    let rest = &content[3..];
    let end = match rest.find("\n---") { Some(p) => p, None => return (meta, content.to_string()) };
    let yaml = &rest[..end];
    let body = &rest[end + 4..];
    let body = body.strip_prefix('\n').unwrap_or(body);

    for line in yaml.lines() {
        let line = line.trim();
        if let Some(colon) = line.find(':') {
            let key = line[..colon].trim().to_string();
            let val = line[colon + 1..].trim().to_string();
            let val = val.strip_prefix('"').and_then(|s| s.strip_suffix('"')).unwrap_or(&val).to_string();
            meta.insert(key, val);
        }
    }
    (meta, body.to_string())
}

fn parse_card_body(body: &str) -> (String, String) {
    let mut front = String::new();
    let mut back_lines = Vec::new();
    let mut found = false;
    for line in body.lines() {
        if !found && line.starts_with('#') {
            front = line.trim_start_matches('#').trim().to_string();
            found = true;
            continue;
        }
        if found { back_lines.push(line); }
    }
    let back = back_lines.join("\n").trim().to_string();
    if front.is_empty() && back.is_empty() {
        let lines: Vec<&str> = body.lines().collect();
        (lines.first().unwrap_or(&"").to_string(),
         lines.get(1..).map(|s| s.join("\n")).unwrap_or_default().trim().to_string())
    } else { (front, back) }
}

fn parse_tags(val: &str) -> Vec<String> {
    let val = val.trim();
    if val.starts_with('[') && val.ends_with(']') {
        val[1..val.len()-1].split(',')
            .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
            .filter(|s| !s.is_empty()).collect()
    } else if val.is_empty() || val == "[]" { Vec::new() }
    else { vec![val.to_string()] }
}

fn parse_u32(meta: &HashMap<String, String>, key: &str, default: u32) -> u32 {
    meta.get(key).and_then(|s| s.parse().ok()).unwrap_or(default)
}

fn parse_f64(meta: &HashMap<String, String>, key: &str, default: f64) -> f64 {
    meta.get(key).and_then(|s| s.parse().ok()).unwrap_or(default)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_card_roundtrip() {
        let card = Card {
            path: "Cards/test.md".into(), front: "What is stoicism?".into(),
            back: "A philosophy of endurance.".into(), source: "[[Meditations]]".into(),
            tags: vec!["philosophy".into(), "stoicism".into()],
            interval: 6, ease: 2.5, next_review: "2026-02-15".into(),
            last_review: "2026-02-10".into(), review_count: 3, repetitions: 3,
            created: "2026-02-01".into(),
        };
        let md = card.to_markdown();
        let parsed = Card::from_markdown("Cards/test.md", &md).unwrap();
        assert_eq!(parsed.front, "What is stoicism?");
        assert_eq!(parsed.back, "A philosophy of endurance.");
        assert_eq!(parsed.source, "[[Meditations]]");
        assert_eq!(parsed.tags, vec!["philosophy", "stoicism"]);
        assert_eq!(parsed.interval, 6);
        assert!((parsed.ease - 2.5).abs() < 0.01);
        assert_eq!(parsed.review_count, 3);
    }

    #[test]
    fn test_parse_empty_tags() {
        let content = "---\ntype: card\ntags: []\nease: 2.5\ninterval: 0\nnext_review: 2026-02-11\nlast_review: null\nreview_count: 0\nrepetitions: 0\ncreated: 2026-02-10\nsource: \"\"\n---\n# Test\n\nBody\n";
        let card = Card::from_markdown("Cards/test.md", content).unwrap();
        assert!(card.tags.is_empty());
        assert_eq!(card.front, "Test");
        assert_eq!(card.back, "Body");
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World!"), "hello-world");
        assert_eq!(slugify("  multiple   spaces  "), "multiple-spaces");
    }

    #[test]
    fn test_not_a_card() {
        let content = "---\ntype: source\ntitle: \"test\"\n---\n# Test\n";
        assert!(Card::from_markdown("Sources/test.md", content).is_err());
    }
}
