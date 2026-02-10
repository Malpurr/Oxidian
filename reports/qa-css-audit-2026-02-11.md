# CSS Deep Audit Report — 2026-02-11
**QA Tester #12**

## Summary
Audited 8 CSS files + index.html. Found **significant issues** across all categories. Applied critical fixes; remaining items documented for follow-up.

---

## Fixes Applied

### 1. ✅ Import Order Fixed (index.html)
**Before (WRONG):**
```
design-tokens → design-tokens-compatibility → animations → responsive → style → obsidian-features → remember → components-polish
```
**After (CORRECT):**
```
design-tokens → style → components-polish → animations → obsidian-features → remember → responsive
```
- `responsive.css` was loading before `style.css` (breaking base styles)
- `design-tokens-compatibility.css` was loading before `style.css` (circular refs)

### 2. ✅ Removed design-tokens-compatibility.css
This file was actively harmful:
- **Circular references**: `--bg-primary: var(--bg-primary)`, `--bg-secondary: var(--bg-secondary)` etc.
- **56 `!important` declarations** causing specificity wars
- **Conflicting overrides**: changed `body` font-size, dialog padding/radius, icon sizes
- **Used `oklch()`** with limited browser support
- Its useful aliases have been moved into design-tokens.css `:root`

### 3. ✅ Missing CSS Variables Added to design-tokens.css
Added to `:root` (dark) and `[data-theme="light"]`:
- `--accent-color`, `--accent-color-hover`, `--accent-color-alpha`
- `--bg-accent`, `--bg-error`, `--text-error`
- `--text-normal`, `--accent`, `--color-tag`, `--color-red`
- `--font-monospace`, `--background-modifier-border`
- `--sidebar-width-min`, `--sidebar-width-max`
- `--sidebar-collapse-duration`, `--sidebar-collapse-ease`
- `--content-max-width`

### 4. ✅ Duplicate Scrollbar Removed from style.css
style.css had **two** scrollbar definitions (10px then 6px). Removed the second duplicate; components-polish.css final 6px definition wins.

---

## Remaining Issues (Need Follow-up)

### Duplicate Rules (Same Selector, Multiple Files)

| Selector | Files | Priority Winner |
|----------|-------|-----------------|
| `.command-palette-*` (overlay, input, results, item, etc.) | style.css, components-polish.css | components-polish ✓ |
| `.dialog-overlay`, `.dialog` | style.css, components-polish.css | components-polish ✓ |
| `.context-menu`, `.ctx-item` | style.css, components-polish.css | components-polish ✓ |
| `.settings-container`, `.settings-sidebar`, `.settings-nav-item` | style.css, components-polish.css | Conflicting! |
| `.search-result-*` | style.css, components-polish.css | components-polish ✓ |
| `.welcome-*` (screen, content, btn, shortcuts) | style.css, components-polish.css | components-polish ✓ |
| `.dropdown-menu`, `.dropdown-item` | style.css, components-polish.css | components-polish ✓ |
| `.btn-primary`, `.btn-secondary` | style.css, components-polish.css | components-polish ✓ |
| `#statusbar` | style.css, components-polish.css | components-polish ✓ |
| `.tab` | style.css, components-polish.css | components-polish ✓ |
| `*:focus-visible` | style.css, components-polish.css, animations.css | Last wins (animations) |
| `.tree-item` | style.css, components-polish.css | **Conflict**: different active indicator |
| `.sidebar-panel` | style.css (`display:none`), animations.css (`opacity:0`) | **Conflict** |
| `#obsidian-notice-container` | style.css, animations.css | animations.css ✓ |
| `@keyframes fadeIn` | animations.css, obsidian-features.css | **Different definitions!** |
| `select` | style.css (defined twice) | Second definition ✓ |
| `.checkbox-container` | style.css (checkbox), components-polish.css (toggle switch) | **Breaking conflict** |

**Recommendation:** Remove duplicate selectors from style.css for all items where components-polish.css provides the polished version. ~200 lines can be safely removed.

### Conflicting Values (Critical)

1. **`.settings-nav-item.active`**:
   - style.css: `background: var(--primary-500); color: white` (solid accent bg)
   - components-polish.css: `background: rgba(var(--accent-rgb), 0.12); color: var(--text-accent)` (subtle bg)
   - **Winner:** components-polish (loads later) ✓

2. **`.sidebar-panel` visibility model**:
   - style.css: `display: none` / `.active { display: flex }`
   - animations.css: `opacity: 0; pointer-events: none` / `.active { opacity: 1 }`
   - **Issue:** Both approaches active simultaneously. The `display:none` in style.css prevents opacity transitions from working.
   - **Fix needed:** Remove `display:none` from style.css `.sidebar-panel`, rely on animations.css opacity approach.

3. **`.tree-item.active` indicator**:
   - style.css: Uses `::before` pseudo-element (2px accent bar on left)
   - components-polish.css: Uses `border-left: 2px solid` + hides `::before`
   - **Winner:** components-polish ✓ (explicitly removes old approach)

4. **`.checkbox-container input[type="checkbox"]`**:
   - style.css: 18×18px checkbox with `✓` pseudo-content
   - components-polish.css: 40×22px toggle switch with sliding circle
   - **Winner:** components-polish (loads later), but style.css version may be needed for actual checkboxes (not toggles). **Needs refactoring.**

### Z-Index Chaos (Not Using Design Tokens)

Design tokens define z-indexes up to `--z-toast: 1080`, but all overlay components use hardcoded values:

| Component | Current z-index | Should Use |
|-----------|----------------|------------|
| `.wikilink-popup` | 10000 | `--z-popover` (1060) |
| `.tag-popup` | 10000 | `--z-popover` (1060) |
| `.hover-preview-popup` | 10000 | `--z-popover` (1060) |
| `.command-palette-overlay` | 10000 | `--z-modal` (1050) |
| `#obsidian-notice-container` | 10001 | `--z-toast` (1080) |
| `.obsidian-modal-overlay` | 10002 | `--z-modal` (1050) |
| `.obsidian-menu` | 10003 | `--z-popover` (1060) |
| `.onboarding-overlay` | 500 | `--z-modal` (1050) |
| `.slash-menu` | 400 | `--z-popover` (1060) |

**Recommendation:** Migrate all to token system. Current hardcoded values work but defeat the purpose of the token system.

### Variables Still Referenced but Not in Tokens

These have inline fallbacks so they won't break, but should be formalized:
- `--bg-secondary` fallbacks in remember.css (e.g., `#1e1e2e`) — works fine
- Several `var(--x, fallback)` patterns in animations.css — works fine

### obsidian-features.css Quality Issues

This file uses an older variable naming convention (`--accent-color` instead of `--text-accent`, `--bg-accent` instead of `rgba(...)`, `--font-editor` instead of `--font-mono`). Now that we've added aliases in design-tokens.css these all resolve, but ideally this file should be updated to use the canonical token names.

---

## File Size Summary

| File | Purpose | Lines (approx) |
|------|---------|-------|
| design-tokens.css | Tokens, themes | ~280 |
| style.css | Base + components | ~7200 |
| components-polish.css | Premium overrides | ~550 |
| animations.css | Motion | ~500 |
| obsidian-features.css | Feature-specific | ~600 |
| remember.css | Remember system | ~900 |
| responsive.css | Breakpoints | ~350 |

**style.css is massive (7200 lines)** and contains both base styles and component definitions that are later overridden by components-polish.css. A future refactor should split it into smaller files and remove the ~200 lines of duplicate rules.

---

## Priority Actions

1. **P0 (Done):** Fixed import order, removed compatibility layer, added missing vars
2. **P1:** Fix `.sidebar-panel` display/opacity conflict (prevents panel transitions)
3. **P1:** Refactor `.checkbox-container` — separate checkbox vs toggle switch styles
4. **P2:** Remove ~200 lines of duplicate rules from style.css
5. **P2:** Migrate z-indexes to design token system
6. **P3:** Update obsidian-features.css to use canonical variable names
7. **P3:** Split style.css into logical sub-files
