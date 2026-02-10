// Oxidian — Templates Feature
// Template folder scanning, variable replacement, apply template to new note.

use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateInfo {
    pub name: String,   // display name (filename without .md)
    pub path: String,   // relative path within vault
}

pub struct TemplateManager {
    vault_path: String,
    folder: String,
}

impl TemplateManager {
    pub fn new(vault_path: &str, folder: &str) -> Self {
        TemplateManager {
            vault_path: vault_path.to_string(),
            folder: folder.to_string(),
        }
    }

    fn folder_abs(&self) -> std::path::PathBuf {
        Path::new(&self.vault_path).join(&self.folder)
    }

    /// Ensure the templates folder exists.
    pub fn ensure_folder(&self) -> Result<(), String> {
        fs::create_dir_all(self.folder_abs()).map_err(|e| e.to_string())
    }

    /// Scan the template folder for all .md files.
    pub fn list_templates(&self) -> Vec<TemplateInfo> {
        let folder = self.folder_abs();
        if !folder.exists() {
            return vec![];
        }

        let mut templates = Vec::new();
        Self::scan_dir(&folder, &self.vault_path, &mut templates);
        templates.sort_by(|a, b| a.name.cmp(&b.name));
        templates
    }

    fn scan_dir(dir: &Path, vault_root: &str, out: &mut Vec<TemplateInfo>) {
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                Self::scan_dir(&path, vault_root, out);
            } else if path.extension().map(|e| e == "md").unwrap_or(false) {
                let name = path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let relative = path.strip_prefix(vault_root)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .to_string();
                out.push(TemplateInfo { name, path: relative });
            }
        }
    }

    /// Read a template file's content.
    pub fn read_template(&self, relative_path: &str) -> Result<String, String> {
        let abs = Path::new(&self.vault_path).join(relative_path);
        fs::read_to_string(&abs).map_err(|e| format!("Failed to read template: {}", e))
    }

    /// Apply template variables and return processed content.
    pub fn apply_template(&self, template_path: &str, title: &str) -> Result<String, String> {
        let raw = self.read_template(template_path)?;
        Ok(replace_variables(&raw, title))
    }

    /// Create a new note from a template.
    /// Returns the relative path of the created note.
    pub fn create_from_template(
        &self,
        template_path: &str,
        note_name: &str,
        dest_folder: Option<&str>,
    ) -> Result<String, String> {
        let content = self.apply_template(template_path, note_name)?;

        let filename = if note_name.ends_with(".md") {
            note_name.to_string()
        } else {
            format!("{}.md", note_name)
        };

        let relative = match dest_folder {
            Some(folder) if !folder.is_empty() => format!("{}/{}", folder, filename),
            _ => filename,
        };

        let abs = Path::new(&self.vault_path).join(&relative);
        if let Some(parent) = abs.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        fs::write(&abs, &content).map_err(|e| format!("Failed to create note: {}", e))?;

        Ok(relative)
    }

    /// Seed built-in templates if the folder is empty.
    pub fn seed_builtin_templates(&self) -> Result<Vec<String>, String> {
        self.ensure_folder()?;

        let existing = self.list_templates();
        if !existing.is_empty() {
            return Ok(vec![]);
        }

        let mut created = Vec::new();

        for (name, content) in BUILTIN_TEMPLATES {
            let path = Path::new(&self.vault_path)
                .join(&self.folder)
                .join(name);
            if !path.exists() {
                fs::write(&path, content).map_err(|e| e.to_string())?;
                created.push(name.to_string());
            }
        }

        Ok(created)
    }

    pub fn set_vault_path(&mut self, path: &str) {
        self.vault_path = path.to_string();
    }

    pub fn set_folder(&mut self, folder: &str) {
        self.folder = folder.to_string();
    }
}

/// Replace template variables in content.
pub fn replace_variables(content: &str, title: &str) -> String {
    let now = Local::now();
    let date = now.format("%Y-%m-%d").to_string();
    let time = now.format("%H:%M").to_string();

    content
        .replace("{{date}}", &date)
        .replace("{{time}}", &time)
        .replace("{{title}}", title)
}

const BUILTIN_TEMPLATES: &[(&str, &str)] = &[
    ("Daily Note.md", "# {{title}}\n\n📅 **Date:** {{date}}\n⏰ **Time:** {{time}}\n\n---\n\n## 📝 Notes\n\n\n## ✅ Tasks\n- [ ] \n\n## 💡 Ideas\n\n\n## 📖 Journal\n\n"),
    ("Meeting Notes.md", "# Meeting: {{title}}\n\n📅 **Date:** {{date}}\n⏰ **Time:** {{time}}\n👥 **Attendees:** \n\n---\n\n## 📋 Agenda\n1. \n\n## 📝 Notes\n\n\n## ✅ Action Items\n- [ ] \n\n## 📌 Decisions Made\n\n\n## 📅 Next Meeting\n\n"),
    ("Project Plan.md", "# Project: {{title}}\n\n📅 **Created:** {{date}}\n🎯 **Status:** Planning\n👤 **Owner:** \n\n---\n\n## 🎯 Objectives\n\n\n## 📋 Requirements\n- [ ] \n\n## 📝 Notes\n\n"),
];

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, TemplateManager) {
        let tmp = TempDir::new().unwrap();
        let vault = tmp.path().to_string_lossy().to_string();
        let tm = TemplateManager::new(&vault, "templates");
        (tmp, tm)
    }

    #[test]
    fn test_list_empty() {
        let (_tmp, tm) = setup();
        assert!(tm.list_templates().is_empty());
    }

    #[test]
    fn test_seed_and_list() {
        let (_tmp, tm) = setup();
        let created = tm.seed_builtin_templates().unwrap();
        assert_eq!(created.len(), 3);

        let templates = tm.list_templates();
        assert_eq!(templates.len(), 3);

        // Should be sorted by name
        let names: Vec<&str> = templates.iter().map(|t| t.name.as_str()).collect();
        assert!(names.contains(&"Daily Note"));
        assert!(names.contains(&"Meeting Notes"));
        assert!(names.contains(&"Project Plan"));
    }

    #[test]
    fn test_seed_idempotent() {
        let (_tmp, tm) = setup();
        tm.seed_builtin_templates().unwrap();
        let created2 = tm.seed_builtin_templates().unwrap();
        assert!(created2.is_empty()); // already seeded, no new creations
    }

    #[test]
    fn test_replace_variables() {
        let content = "# {{title}}\nDate: {{date}}\nTime: {{time}}";
        let result = replace_variables(content, "My Note");
        assert!(result.contains("# My Note"));
        assert!(!result.contains("{{date}}"));
        assert!(!result.contains("{{time}}"));
        assert!(!result.contains("{{title}}"));
    }

    #[test]
    fn test_apply_template() {
        let (tmp, tm) = setup();
        tm.ensure_folder().unwrap();
        fs::write(
            tmp.path().join("templates/test.md"),
            "# {{title}}\n\nCreated on {{date}}"
        ).unwrap();

        let content = tm.apply_template("templates/test.md", "Test Note").unwrap();
        assert!(content.contains("# Test Note"));
        assert!(!content.contains("{{title}}"));
        assert!(!content.contains("{{date}}"));
    }

    #[test]
    fn test_create_from_template() {
        let (tmp, tm) = setup();
        tm.seed_builtin_templates().unwrap();

        let templates = tm.list_templates();
        let daily = templates.iter().find(|t| t.name == "Daily Note").unwrap();

        let path = tm.create_from_template(&daily.path, "2025-01-01", None).unwrap();
        assert_eq!(path, "2025-01-01.md");
        assert!(tmp.path().join("2025-01-01.md").exists());

        let content = fs::read_to_string(tmp.path().join("2025-01-01.md")).unwrap();
        assert!(content.contains("# 2025-01-01"));
    }

    #[test]
    fn test_create_in_subfolder() {
        let (tmp, tm) = setup();
        tm.seed_builtin_templates().unwrap();
        let templates = tm.list_templates();
        let daily = &templates[0];

        let path = tm.create_from_template(&daily.path, "mynote", Some("subfolder")).unwrap();
        assert_eq!(path, "subfolder/mynote.md");
        assert!(tmp.path().join("subfolder/mynote.md").exists());
    }

    #[test]
    fn test_read_nonexistent_template() {
        let (_tmp, tm) = setup();
        assert!(tm.read_template("nonexistent.md").is_err());
    }

    #[test]
    fn test_nested_template_scan() {
        let (tmp, tm) = setup();
        let sub = tmp.path().join("templates/sub");
        fs::create_dir_all(&sub).unwrap();
        fs::write(sub.join("nested.md"), "# Nested").unwrap();
        fs::write(tmp.path().join("templates/top.md"), "# Top").unwrap();

        let templates = tm.list_templates();
        assert_eq!(templates.len(), 2);
    }
}
