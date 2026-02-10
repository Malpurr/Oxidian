//! Integration tests for Oxidian — testing module collaboration.

use std::fs;
use tempfile::TempDir;

// ─── 1. Markdown → Frontmatter ──────────────────────────────────────

#[test]
fn test_markdown_with_frontmatter() {
    let content = "---\ntitle: My Note\ntags: [rust, test]\naliases: [mn]\ncreated: \"2025-01-01\"\n---\n\n# Hello World\n\nSome body text.";

    let (fm, body) = oxidian::engine::frontmatter::parse_frontmatter(content).unwrap();
    let fm = fm.expect("frontmatter should be present");

    assert_eq!(fm.title.as_deref(), Some("My Note"));
    assert_eq!(fm.tags, vec!["rust".to_string(), "test".to_string()]);
    assert_eq!(fm.aliases, vec!["mn".to_string()]);
    assert_eq!(fm.created.as_deref(), Some("2025-01-01"));

    // Body should be the markdown after the frontmatter
    assert!(body.contains("# Hello World"));
    assert!(body.contains("Some body text."));
    assert!(!body.contains("---"));

    // Render the body as HTML
    let html = oxidian::engine::markdown::render_markdown(body);
    assert!(html.contains("<h1>Hello World</h1>"));
    assert!(html.contains("Some body text."));
}

#[test]
fn test_markdown_without_frontmatter() {
    let content = "# Just Markdown\n\nNo frontmatter here.";
    let (fm, body) = oxidian::engine::frontmatter::parse_frontmatter(content).unwrap();
    assert!(fm.is_none());
    assert_eq!(body, content);
}

#[test]
fn test_frontmatter_roundtrip() {
    let mut fm = oxidian::engine::frontmatter::Frontmatter::default();
    fm.title = Some("Roundtrip".to_string());
    fm.tags = vec!["a".to_string(), "b".to_string()];

    let body = "# Content\n\nHello.";
    let serialized = oxidian::engine::frontmatter::serialize_frontmatter(&fm, body);

    let (parsed_fm, parsed_body) = oxidian::engine::frontmatter::parse_frontmatter(&serialized).unwrap();
    let parsed_fm = parsed_fm.expect("should parse back");
    assert_eq!(parsed_fm.title.as_deref(), Some("Roundtrip"));
    assert_eq!(parsed_fm.tags, vec!["a", "b"]);
    assert!(parsed_body.contains("# Content"));
}

// ─── 2. Markdown → Links ────────────────────────────────────────────

#[test]
fn test_extract_wikilinks_from_markdown() {
    let content = "# My Note\n\nSee [[Other Note]] and [[Folder/Deep Note|alias]].\n\nAlso [[Third]].";
    let links = oxidian::engine::links::extract_outgoing_links(content);

    assert!(links.contains(&"Other Note".to_string()));
    assert!(links.contains(&"Third".to_string()));
    // extract_wiki_links captures the full content inside [[...]]
    assert!(links.iter().any(|l| l.contains("Deep Note") || l.contains("Folder/Deep Note")));
}

#[test]
fn test_wikilinks_rendered_as_html() {
    let content = "Click [[MyNote]] to navigate.";
    let html = oxidian::engine::markdown::render_markdown(content);
    assert!(html.contains("wiki-link"));
    assert!(html.contains("data-target=\"MyNote\""));
    assert!(html.contains("MyNote"));
}

#[test]
fn test_wikilinks_with_alias() {
    let content = "See [[Target|Display Text]] here.";
    let html = oxidian::engine::markdown::render_markdown(content);
    assert!(html.contains("data-target=\"Target\""));
    assert!(html.contains("Display Text"));
}

// ─── 3. Vault → Search ──────────────────────────────────────────────

#[test]
fn test_vault_search_integration() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    // Create notes
    fs::write(tmp.path().join("rust-guide.md"), "# Rust Guide\n\nRust is a systems programming language focused on safety.").unwrap();
    fs::write(tmp.path().join("python-guide.md"), "# Python Guide\n\nPython is great for scripting and data science.").unwrap();
    fs::write(tmp.path().join("cooking.md"), "# Cooking\n\nHow to make pasta with tomato sauce.").unwrap();

    // Build search index
    let mut index = oxidian::engine::search::SearchIndex::new(&vault).unwrap();
    index.reindex_vault(&vault).unwrap();

    // Search for "rust"
    let results = index.search("rust", 10).unwrap();
    assert!(!results.is_empty(), "Should find results for 'rust'");
    assert!(results.iter().any(|r| r.path.contains("rust-guide")));

    // Search for "pasta"
    let results = index.search("pasta", 10).unwrap();
    assert!(results.iter().any(|r| r.path.contains("cooking")));

    // Search for something not present
    let results = index.search("quantum_physics_xyz", 10).unwrap();
    assert!(results.is_empty());
}

#[test]
fn test_vault_incremental_index() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    fs::write(tmp.path().join("note1.md"), "# First Note\n\nOriginal content.").unwrap();

    let mut index = oxidian::engine::search::SearchIndex::new(&vault).unwrap();
    index.reindex_vault(&vault).unwrap();

    // Add a new note and index it incrementally
    let new_content = "# Second Note\n\nThis note is about quantum mechanics.";
    fs::write(tmp.path().join("note2.md"), new_content).unwrap();
    index.index_note(&vault, "note2.md", new_content).unwrap();

    let results = index.search("quantum", 10).unwrap();
    assert!(!results.is_empty());
}

// ─── 4. Remember Flow ───────────────────────────────────────────────

#[test]
fn test_remember_create_review_stats() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    // Create Cards directory
    fs::create_dir_all(tmp.path().join("Cards")).unwrap();
    fs::create_dir_all(tmp.path().join(".oxidian")).unwrap();

    // Create a card
    let input = oxidian::features::remember::cards::CardInput {
        front: "What is Rust?".to_string(),
        back: "A systems programming language.".to_string(),
        source: "Rust Book".to_string(),
        tags: vec!["rust".to_string(), "programming".to_string()],
        existing_path: None,
    };
    let card = oxidian::features::remember::cards::create_card(&vault, &input).unwrap();
    assert_eq!(card.front, "What is Rust?");
    assert_eq!(card.back, "A systems programming language.");
    assert_eq!(card.interval, 0);
    assert!(card.ease > 2.0); // Default SM-2 ease

    // Card should be loadable
    let all = oxidian::features::remember::cards::load_all_cards(&vault).unwrap();
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].front, "What is Rust?");

    // SM-2: Review with quality=5 (easy)
    let result = oxidian::features::remember::sm2::sm2_review(5, 0, 0, card.ease);
    assert_eq!(result.repetitions, 1);
    assert_eq!(result.interval, 1); // First correct → 1 day
    assert!(result.ease_factor >= 2.5);

    // Second review
    let result2 = oxidian::features::remember::sm2::sm2_review(5, result.repetitions, result.interval, result.ease_factor);
    assert_eq!(result2.repetitions, 2);
    assert_eq!(result2.interval, 6); // Second correct → 6 days

    // Third review
    let result3 = oxidian::features::remember::sm2::sm2_review(4, result2.repetitions, result2.interval, result2.ease_factor);
    assert_eq!(result3.repetitions, 3);
    assert!(result3.interval > 6); // Should grow

    // Failed review resets
    let failed = oxidian::features::remember::sm2::sm2_review(1, result3.repetitions, result3.interval, result3.ease_factor);
    assert_eq!(failed.repetitions, 0);
    assert_eq!(failed.interval, 1);

    // Record stats
    oxidian::features::remember::stats::record_review(&vault, "easy").unwrap();
    oxidian::features::remember::stats::record_review(&vault, "good").unwrap();
    oxidian::features::remember::stats::record_review(&vault, "again").unwrap();

    let stats_data = oxidian::features::remember::stats::load_stats(&vault);
    assert_eq!(stats_data.total_reviews, 3);

    // Computed stats
    let computed = oxidian::features::remember::stats::get_computed_stats(&vault, &all);
    assert_eq!(computed.total_cards, 1);
    assert_eq!(computed.total_reviews, 3);
    assert!(computed.reviewed_today >= 3);
}

// ─── 5. Graph ────────────────────────────────────────────────────────

#[test]
fn test_graph_from_linked_notes() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    fs::write(tmp.path().join("note-a.md"), "# Note A\n\nLinks to [[note-b]] and [[note-c]].").unwrap();
    fs::write(tmp.path().join("note-b.md"), "# Note B\n\nLinks back to [[note-a]].").unwrap();
    fs::write(tmp.path().join("note-c.md"), "# Note C\n\nStandalone note.").unwrap();
    fs::write(tmp.path().join("orphan.md"), "# Orphan\n\nNo links here.").unwrap();

    // Build meta cache
    let mut cache = oxidian::state::VaultMetaCache::new();
    cache.rebuild(&vault);

    // Compute graph
    let graph = oxidian::features::graph::compute_graph(&cache);

    // All 4 notes should be nodes
    assert_eq!(graph.nodes.len(), 4);
    let node_ids: Vec<&str> = graph.nodes.iter().map(|n| n.id.as_str()).collect();
    assert!(node_ids.iter().any(|id| id.contains("note-a")));
    assert!(node_ids.iter().any(|id| id.contains("note-b")));
    assert!(node_ids.iter().any(|id| id.contains("note-c")));
    assert!(node_ids.iter().any(|id| id.contains("orphan")));

    // note-a links to note-b and note-c → at least 2 edges from note-a
    let edges_from_a: Vec<_> = graph.edges.iter()
        .filter(|e| e.source.contains("note-a"))
        .collect();
    assert!(edges_from_a.len() >= 2, "note-a should have at least 2 outgoing edges, got {}", edges_from_a.len());

    // note-b links to note-a → at least 1 edge
    let edges_from_b: Vec<_> = graph.edges.iter()
        .filter(|e| e.source.contains("note-b"))
        .collect();
    assert!(!edges_from_b.is_empty());
}

// ─── 6. Settings ─────────────────────────────────────────────────────

#[test]
fn test_settings_lifecycle() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();
    fs::create_dir_all(tmp.path().join(".oxidian")).unwrap();

    // Load defaults (no file exists yet)
    let mut settings = oxidian::engine::settings::load_settings(&vault);
    assert_eq!(settings.version, 2);
    assert!(settings.general.auto_save);
    assert_eq!(settings.general.language, "en");

    // Modify
    settings.general.language = "de".to_string();
    settings.editor.font_size = 18;
    settings.appearance.theme = "dark".to_string();

    // Save
    oxidian::engine::settings::save_settings(&vault, &settings).unwrap();

    // Reload and verify
    let reloaded = oxidian::engine::settings::load_settings(&vault);
    assert_eq!(reloaded.general.language, "de");
    assert_eq!(reloaded.editor.font_size, 18);
    assert_eq!(reloaded.appearance.theme, "dark");
    // Unchanged fields should keep defaults
    assert!(reloaded.general.auto_save);
}

// ─── 7. Bookmarks ───────────────────────────────────────────────────

#[test]
fn test_bookmarks_full_lifecycle() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    // Create some note files
    fs::write(tmp.path().join("alpha.md"), "# Alpha").unwrap();
    fs::write(tmp.path().join("beta.md"), "# Beta").unwrap();
    fs::write(tmp.path().join("gamma.md"), "# Gamma").unwrap();

    let mut bm = oxidian::features::bookmarks::BookmarkManager::new(&vault);

    // Add
    assert!(bm.add("alpha.md"));
    assert!(bm.add("beta.md"));
    assert!(bm.add("gamma.md"));
    assert_eq!(bm.list().len(), 3);

    // Reorder: move gamma (index 2) to front (index 0)
    bm.reorder(2, 0).unwrap();
    assert_eq!(bm.list()[0].path, "gamma.md");
    assert_eq!(bm.list()[1].path, "alpha.md");
    assert_eq!(bm.list()[2].path, "beta.md");

    // Remove middle
    assert!(bm.remove("alpha.md"));
    assert_eq!(bm.list().len(), 2);
    assert_eq!(bm.list()[0].path, "gamma.md");
    assert_eq!(bm.list()[1].path, "beta.md");

    // Save and reload
    bm.save().unwrap();
    let bm2 = oxidian::features::bookmarks::BookmarkManager::new(&vault);
    assert_eq!(bm2.list().len(), 2);
    assert_eq!(bm2.list()[0].path, "gamma.md");
}

// ─── 8. Daily Notes ─────────────────────────────────────────────────

#[test]
fn test_daily_notes_with_template() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    // Create template
    fs::create_dir_all(tmp.path().join("templates")).unwrap();
    fs::write(
        tmp.path().join("templates/daily.md"),
        "# {{title}}\n\nDate: {{date}}\nTime: {{time}}\n\n## Journal\n\n"
    ).unwrap();

    let config = oxidian::features::daily_notes::DailyNotesConfig {
        folder: "Journal".to_string(),
        date_format: "%Y-%m-%d".to_string(),
        template_path: "templates/daily.md".to_string(),
        auto_create_folder: true,
    };
    let dn = oxidian::features::daily_notes::DailyNotes::new(&vault, config);

    // Create today's note
    let (path, content) = dn.open_today().unwrap();
    assert!(path.starts_with("Journal/"));
    assert!(path.ends_with(".md"));

    let content = content.expect("should have created new content");
    // Template variables should be replaced
    assert!(!content.contains("{{date}}"));
    assert!(!content.contains("{{time}}"));
    assert!(!content.contains("{{title}}"));
    assert!(content.contains("## Journal"));

    // Verify file exists on disk
    let abs_path = tmp.path().join(&path);
    assert!(abs_path.exists());

    // Opening again should not create new content
    let (_, content2) = dn.open_today().unwrap();
    assert!(content2.is_none());
}

#[test]
fn test_daily_notes_default_template() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    let dn = oxidian::features::daily_notes::DailyNotes::new(
        &vault,
        oxidian::features::daily_notes::DailyNotesConfig::default(),
    );

    let (_, content) = dn.open_today().unwrap();
    let content = content.unwrap();
    assert!(content.contains("## Tasks"));
    assert!(content.contains("## Notes"));
}

// ─── 9. Tags ─────────────────────────────────────────────────────────

#[test]
fn test_tags_scan_and_search() {
    let tmp = TempDir::new().unwrap();
    let vault = tmp.path().to_string_lossy().to_string();

    fs::write(tmp.path().join("dev.md"), "# Dev\n\n#rust #programming #rust/async").unwrap();
    fs::write(tmp.path().join("web.md"), "# Web\n\n#javascript #programming #web/react").unwrap();
    fs::write(tmp.path().join("personal.md"), "# Personal\n\n#journal #health").unwrap();

    let mut idx = oxidian::features::tags::TagIndex::new();
    idx.build_from_vault(&vault);

    // All tags
    let all = idx.all_tags();
    assert!(all.contains(&"rust".to_string()));
    assert!(all.contains(&"programming".to_string()));
    assert!(all.contains(&"javascript".to_string()));
    assert!(all.contains(&"journal".to_string()));
    assert!(all.contains(&"rust/async".to_string()));

    // Prefix search
    let rust_tags = idx.autocomplete("rust");
    assert!(rust_tags.contains(&"rust".to_string()));
    assert!(rust_tags.contains(&"rust/async".to_string()));
    assert!(!rust_tags.contains(&"javascript".to_string()));

    // Prefix search (case-insensitive)
    let prog = idx.autocomplete("Prog");
    assert!(prog.contains(&"programming".to_string()));

    // Files for tag
    let prog_files = idx.files_for_tag("programming");
    assert!(prog_files.contains(&"dev.md".to_string()));
    assert!(prog_files.contains(&"web.md".to_string()));
    assert!(!prog_files.contains(&"personal.md".to_string()));

    // Tag count
    assert!(idx.tag_count() >= 7); // rust, programming, rust/async, javascript, web, web/react, journal, health
}
