// Oxidian — Daily Notes Feature
// Create daily note from template, configurable format/folder, open today's note.

use chrono::{Local, NaiveDate};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
pub struct DailyNotesConfig {
    pub folder: String,           // e.g. "Calendar"
    pub date_format: String,      // strftime format, e.g. "%Y-%m-%d"
    pub template_path: String,    // relative path to template file, or empty
    pub auto_create_folder: bool,
}

impl Default for DailyNotesConfig {
    fn default() -> Self {
        DailyNotesConfig {
            folder: "Calendar".to_string(),
            date_format: "%Y-%m-%d".to_string(),
            template_path: String::new(),
            auto_create_folder: true,
        }
    }
}

pub struct DailyNotes {
    vault_path: String,
    config: DailyNotesConfig,
}

impl DailyNotes {
    pub fn new(vault_path: &str, config: DailyNotesConfig) -> Self {
        DailyNotes {
            vault_path: vault_path.to_string(),
            config,
        }
    }

    /// Get the relative path for today's daily note.
    pub fn today_path(&self) -> String {
        let date_str = Local::now().format(&self.config.date_format).to_string();
        if self.config.folder.is_empty() {
            format!("{}.md", date_str)
        } else {
            format!("{}/{}.md", self.config.folder, date_str)
        }
    }

    /// Get the relative path for a specific date's daily note.
    pub fn path_for_date(&self, date: NaiveDate) -> String {
        let date_str = date.format(&self.config.date_format).to_string();
        if self.config.folder.is_empty() {
            format!("{}.md", date_str)
        } else {
            format!("{}/{}.md", self.config.folder, date_str)
        }
    }

    /// Check if today's daily note already exists.
    pub fn today_exists(&self) -> bool {
        let path = Path::new(&self.vault_path).join(self.today_path());
        path.exists()
    }

    /// Open (or create) today's daily note.
    /// Returns the relative path and the content (if newly created).
    pub fn open_today(&self) -> Result<(String, Option<String>), String> {
        let relative = self.today_path();
        let abs = Path::new(&self.vault_path).join(&relative);

        if abs.exists() {
            return Ok((relative, None));
        }

        // Ensure folder exists
        if self.config.auto_create_folder {
            if let Some(parent) = abs.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create folder: {}", e))?;
            }
        }

        let content = self.generate_content()?;
        fs::write(&abs, &content).map_err(|e| format!("Failed to create daily note: {}", e))?;

        Ok((relative, Some(content)))
    }

    /// Generate content for a new daily note.
    fn generate_content(&self) -> Result<String, String> {
        let now = Local::now();
        let date_str = now.format(&self.config.date_format).to_string();
        let _day_name = now.format("%A").to_string();
        let full_date = now.format("%A, %B %d, %Y").to_string();
        let time_str = now.format("%H:%M").to_string();

        // Try loading template
        if !self.config.template_path.is_empty() {
            let template_abs = Path::new(&self.vault_path).join(&self.config.template_path);
            if let Ok(template) = fs::read_to_string(&template_abs) {
                return Ok(replace_template_vars(&template, &date_str, &time_str, &date_str));
            }
        }

        // Default template
        Ok(format!(
            "# {}\n\n**{}**\n\n---\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
            date_str, full_date
        ))
    }

    /// List all existing daily notes (sorted by date, newest first).
    pub fn list_all(&self) -> Vec<String> {
        let folder_abs = if self.config.folder.is_empty() {
            Path::new(&self.vault_path).to_path_buf()
        } else {
            Path::new(&self.vault_path).join(&self.config.folder)
        };

        if !folder_abs.exists() {
            return vec![];
        }

        let mut notes: Vec<String> = fs::read_dir(&folder_abs)
            .map(|entries| {
                entries.filter_map(|e| e.ok())
                    .filter(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        name.ends_with(".md") && is_date_filename(&name)
                    })
                    .map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if self.config.folder.is_empty() {
                            name
                        } else {
                            format!("{}/{}", self.config.folder, name)
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        notes.sort_by(|a, b| b.cmp(a)); // newest first
        notes
    }

    pub fn set_config(&mut self, config: DailyNotesConfig) {
        self.config = config;
    }

    pub fn set_vault_path(&mut self, path: &str) {
        self.vault_path = path.to_string();
    }
}

/// Check if a filename looks like a date-based note (YYYY-MM-DD.md or similar).
fn is_date_filename(name: &str) -> bool {
    let stem = name.trim_end_matches(".md");
    // Accept common date formats
    stem.len() >= 8 && stem.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
}

/// Replace template variables.
pub fn replace_template_vars(content: &str, date: &str, time: &str, title: &str) -> String {
    content
        .replace("{{date}}", date)
        .replace("{{time}}", time)
        .replace("{{title}}", title)
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, DailyNotes) {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let dn = DailyNotes::new(&vault, DailyNotesConfig::default());
        (tmp, dn)
    }

    #[test]
    fn test_today_path() {
        let (_tmp, dn) = setup();
        let path = dn.today_path();
        assert!(path.starts_with("Calendar/"));
        assert!(path.ends_with(".md"));
        // Should contain today's date
        let today = Local::now().format("%Y-%m-%d").to_string();
        assert!(path.contains(&today));
    }

    #[test]
    fn test_today_path_empty_folder() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let config = DailyNotesConfig {
            folder: String::new(),
            ..Default::default()
        };
        let dn = DailyNotes::new(&vault, config);
        let path = dn.today_path();
        assert!(!path.contains('/'));
        assert!(path.ends_with(".md"));
    }

    #[test]
    fn test_path_for_date() {
        let (_tmp, dn) = setup();
        let date = NaiveDate::from_ymd_opt(2025, 12, 25).unwrap();
        let path = dn.path_for_date(date);
        assert_eq!(path, "Calendar/2025-12-25.md");
    }

    #[test]
    fn test_open_today_creates() {
        let (_tmp, dn) = setup();
        assert!(!dn.today_exists());

        let (_path, content) = dn.open_today().unwrap();
        assert!(content.is_some());  // was created
        assert!(dn.today_exists());

        // Second call should not create again
        let (_, content2) = dn.open_today().unwrap();
        assert!(content2.is_none());  // already exists
    }

    #[test]
    fn test_open_today_with_template() {
        let (tmp, _) = setup();
        let vault = tmp.path().to_string_lossy().to_string();

        // Create template
        fs::create_dir_all(tmp.path().join("templates")).unwrap();
        fs::write(
            tmp.path().join("templates/daily.md"),
            "# Daily: {{title}}\n\nDate: {{date}}\nTime: {{time}}\n"
        ).unwrap();

        let config = DailyNotesConfig {
            template_path: "templates/daily.md".to_string(),
            ..Default::default()
        };
        let dn = DailyNotes::new(&vault, config);

        let (_, content) = dn.open_today().unwrap();
        let content = content.unwrap();
        assert!(content.contains("# Daily:"));
        assert!(content.contains("Date:"));
        assert!(!content.contains("{{date}}"));
    }

    #[test]
    fn test_list_all() {
        let (tmp, dn) = setup();
        let cal = tmp.path().join("Calendar");
        fs::create_dir_all(&cal).unwrap();
        fs::write(cal.join("2025-01-01.md"), "# Jan 1").unwrap();
        fs::write(cal.join("2025-01-15.md"), "# Jan 15").unwrap();
        fs::write(cal.join("2025-02-01.md"), "# Feb 1").unwrap();
        fs::write(cal.join("not-a-date.md"), "# Something").unwrap();

        let all = dn.list_all();
        assert_eq!(all.len(), 3);
        // Should be newest first
        assert_eq!(all[0], "Calendar/2025-02-01.md");
        assert_eq!(all[1], "Calendar/2025-01-15.md");
        assert_eq!(all[2], "Calendar/2025-01-01.md");
    }

    #[test]
    fn test_default_content() {
        let (_tmp, dn) = setup();
        let (_, content) = dn.open_today().unwrap();
        let content = content.unwrap();
        assert!(content.starts_with("# "));
        assert!(content.contains("## Tasks"));
        assert!(content.contains("## Notes"));
    }

    #[test]
    fn test_replace_template_vars() {
        let tpl = "Title: {{title}}\nDate: {{date}}\nTime: {{time}}";
        let result = replace_template_vars(tpl, "2025-01-01", "14:30", "My Note");
        assert_eq!(result, "Title: My Note\nDate: 2025-01-01\nTime: 14:30");
    }

    #[test]
    fn test_custom_date_format() {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let config = DailyNotesConfig {
            date_format: "%d.%m.%Y".to_string(),
            ..Default::default()
        };
        let dn = DailyNotes::new(&vault, config);
        let path = dn.today_path();
        // Should use DD.MM.YYYY format
        let today = Local::now().format("%d.%m.%Y").to_string();
        assert!(path.contains(&today));
    }

    #[test]
    fn test_is_date_filename() {
        assert!(is_date_filename("2025-01-01.md"));
        assert!(is_date_filename("20250101.md"));
        assert!(is_date_filename("01.01.2025.md"));
        assert!(!is_date_filename("not-a-date.md"));
        assert!(!is_date_filename("readme.md"));
    }
}
