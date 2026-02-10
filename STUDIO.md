# Oxidian Studio v2 — Functional Organization

_Inspired by Steve Jobs' Apple: organized by expertise, not products._

## 🏢 Org Structure

```
                    ┌─────────────┐
                    │   CLAWY     │
                    │   (CTO)     │
                    └──────┬──────┘
          ┌────────┬───────┼───────┬────────┐
          │        │       │       │        │
    ┌─────┴──┐ ┌───┴───┐ ┌┴────┐ ┌┴─────┐ ┌┴──────┐
    │ QA &   │ │ UI/UX │ │Core │ │Perf &│ │Plugin │
    │Testing │ │Design │ │Eng. │ │Sec.  │ │Compat │
    └────────┘ └───────┘ └─────┘ └──────┘ └───────┘
```

## 📋 Departments

### 1. QA & Testing (Quality Assurance)
- **Mission:** Every feature works. No exceptions.
- **Scope:** Unit tests, integration tests, E2E, plugin compat testing
- **Skills used:** test-patterns, debug-pro

### 2. UI/UX Design
- **Mission:** Obsidian-level polish. Users notice no difference.
- **Scope:** CSS, layout, animations, accessibility, design review
- **Skills used:** human-optimized-frontend, ui-ux-pro-max
- **Feedback:** UX Reviewer checks ALL visual changes before merge

### 3. Core Engineering
- **Mission:** Rust backend + JS frontend feature parity with Obsidian
- **Scope:** Markdown engine, vault ops, settings, editor, all features
- **Skills used:** senior-architect, api-dev

### 4. Performance & Security
- **Mission:** Fast startup, low memory, no vulnerabilities
- **Scope:** Profiling, bundle size, memory leaks, XSS, CSP
- **Skills used:** perf-profiler, debug-pro

### 5. Plugin Compatibility
- **Mission:** Real Obsidian plugins work in Oxidian
- **Scope:** API shim testing, community plugin loading, error handling
- **Skills used:** test-patterns

## 🔄 Feedback System

### Agent Output Protocol
Every sub-agent MUST:
1. Write changes to workspace files
2. Run tests (`cargo test`) before finishing
3. Create a summary in `reports/YYYY-MM-DD-{dept}-{task}.md`
4. Report: what changed, what was tested, what's still TODO

### Review Chain
1. Agent finishes work → writes report
2. CTO (Clawy) reviews report
3. If UI/CSS changes → UX Reviewer agent checks
4. Marcel gets consolidated update

### Quality Gates
- ❌ No "done" without test evidence
- ❌ No CSS changes without UX review
- ❌ No Rust changes without `cargo test` pass
- ✅ All reports in `reports/` directory

## 📊 Current Sprint: "The Great Polish"

### Wave 1 — Parallel (NOW)
| Dept | Agent | Task |
|------|-------|------|
| QA | test-lead | Complete test suite for ALL Rust modules |
| UI/UX | design-lead | Massive UI redesign based on research |
| Core | obsidian-parity | Feature parity with Obsidian (from beginner guide) |
| Perf & Sec | perf-sec-lead | Performance audit + security hardening |
| Plugin | plugin-tester | Test 7 real Obsidian community plugins |

### Wave 2 — Review
| Dept | Agent | Task |
|------|-------|------|
| UI/UX | ux-reviewer | Review ALL Wave 1 UI changes |
