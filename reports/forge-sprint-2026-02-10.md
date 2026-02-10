# FORGE Sprint Report — 2026-02-10

## Version: 1.3.5 → 1.3.6

## Changes

### 1. 🔴 VaultMetaCache — Eliminates Full Vault Walks (CRITICAL PERF)

**Problem:** `get_tags`, `get_backlinks`, and `get_graph_data` each did a full vault walk reading every `.md` file on every call. For a vault with 500 notes, that's 500+ file reads per request — called frequently from the UI (sidebar, backlinks panel, graph view).

**Fix:** New `VaultMetaCache` in `main.rs`:
- Built once at startup (tags + wiki-links extracted per file)
- Incrementally updated on `save_note` and `delete_note` 
- Auto-rebuilds if stale (>30s) on `get_tags`/`get_backlinks`/`get_graph_data`
- `get_graph_data` now reads from cache instead of re-reading every file

**Impact:** `get_tags`: O(1) instead of O(n files). `get_backlinks`: O(n entries) in-memory instead of O(n file reads). `get_graph_data`: same. Estimated **10-100x faster** for vaults with 100+ notes.

### 2. 🟡 Static Regex Compilation (vault.rs)

**Problem:** `extract_tags()` and `extract_wiki_links()` recompiled their regex on every call. These are called for every file during indexing, cache building, and content analysis.

**Fix:** Replaced with `std::sync::LazyLock` static regexes — compiled once, reused forever.

**Impact:** Eliminates regex compilation overhead on every save/index operation.

### 3. Version Bump → 1.3.6

## Build

- ✅ Compiled successfully (release profile, 33.5s)
- ✅ Stripped binary: 19MB
- ✅ Package: `/tmp/oxidian-latest.tar.gz` (7.4MB)

## Files Changed

- `src-tauri/src/main.rs` — Added `VaultMetaCache` struct + initialization
- `src-tauri/src/vault.rs` — Static regex with `LazyLock`
- `src-tauri/src/commands.rs` — `get_tags`, `get_backlinks`, `get_graph_data` use cache; `save_note`/`delete_note` update cache
- `src-tauri/Cargo.toml` — Version 1.3.6
