# Oxidian UI/UX Review — Full Analysis
**Date:** 2026-02-10  
**Reviewer:** Senior UI/UX Designer  
**Version:** Oxidian 2.2.0  
**Benchmark:** Obsidian (Gold Standard)  
**Screenshots analyzed:** 19 (01-onboarding through 19-daily-note)  
**CSS analyzed:** `src/css/style.css` (7210 lines)

---

## Executive Summary

Oxidian delivers a **surprisingly competent** Obsidian clone with solid dark theme foundations, good structural layout, and thoughtful micro-interactions. The CSS is well-organized with a proper design token system. However, several inconsistencies, spacing issues, and missing polish prevent it from matching Obsidian's refined feel.

**Design Score: 6.5 / 10**

---

## 1. Layout & Spacing

### Positives
- **Three-column layout** (ribbon/sidebar/content) matches Obsidian's proven pattern perfectly (screenshots 02, 04, 18)
- **CSS custom properties** for dimensions (`--ribbon-width: 44px`, `--sidebar-width: 260px`) enable consistency
- **Resizable sidebar** with proper min/max constraints (180px–500px)

### Problems

#### P1 — Properties panel has no clear boundary with editor
**Screenshots:** 04, 19  
**Issue:** The PROPERTIES panel (left column) and editor area have no visual separator. The properties panel floats ambiguously next to the editor content, creating confusion about content ownership.  
**Selector:** `.editor-pane-half`  
**Fix:**
```css
/* Add right border to properties panel area */
.hypermark-editor {
    border-left: 1px solid var(--border-color);
}
```

#### P2 — Editor content not vertically centered for empty states
**Screenshots:** 04, 19  
**Issue:** When a note is nearly empty, the placeholder text sits at the very top. Obsidian centers welcome content more gracefully.  
**Selector:** `.editor-textarea`, `.hypermark-editor`  
**Fix:**
```css
.editor-textarea {
    padding-top: 48px; /* was 32px — needs more breathing room */
}
```

#### P3 — Inconsistent settings sidebar width across screenshots
**Screenshots:** 05-11  
**Issue:** The settings nav sidebar changes width between screenshots (05 shows ~160px, 08 shows ~200px, 11 shows ~200px). Obsidian keeps this consistent at exactly 220px.  
**Selector:** `.settings-nav`  
**Fix:**
```css
.settings-nav {
    width: 200px; /* was 180px — lock it */
    min-width: 200px;
    max-width: 200px;
}
```

#### P4 — Tab bar height too cramped
**Screenshots:** 04, 17-19  
**Issue:** `--tab-height: 36px` is 2px shorter than Obsidian's 38px. Combined with text, feels tight.  
**Selector:** `:root`  
**Fix:**
```css
:root {
    --tab-height: 38px;
}
```

#### P5 — Status bar too thin
**Screenshots:** 02, 04, 18-19  
**Issue:** `--statusbar-height: 24px` is minimal. Obsidian uses 26px with better vertical centering.  
**Selector:** `:root`, `#statusbar`  
**Fix:**
```css
:root {
    --statusbar-height: 26px;
}
```

---

## 2. Typografie

### Positives
- Good font stack with system fonts fallback
- Mono font for editor (JetBrains Mono) is excellent
- Typography scale is defined via custom properties

### Problems

#### P6 — Settings page headers are too large
**Screenshots:** 05-11  
**Issue:** Section titles like "General", "Editor", "Appearance" render at ~32px (h1 with `var(--text-xl)`). Obsidian uses ~20px for settings section headers. The oversized headers waste vertical space and feel "website-like" rather than "app-like".  
**Selector:** `.settings-section-header h1`, settings section `h2`  
**Fix:**
```css
.settings-section-header h1 {
    font-size: 22px; /* was var(--text-xl) = 32px */
    font-weight: 600;
}

.settings-section h2 {
    font-size: 16px; /* was 18px */
}
```

#### P7 — Panel title letter-spacing too wide
**Screenshots:** 02, 13-16, 18  
**Issue:** `.panel-title` uses `letter-spacing: 1.2px` which is excessive for 11px text. Makes "EXPLORER", "SEARCH", "OUTLINE" look artificially spread.  
**Selector:** `.panel-title`  
**Fix:**
```css
.panel-title {
    letter-spacing: 0.8px; /* was 1.2px */
}
```

#### P8 — "Vault is empty" text lacks hierarchy
**Screenshots:** 02, 18, 19  
**Issue:** The "Vault is empty" message in the file tree uses the same `--text-sm` (13px) as file names. Should be smaller/more muted to feel like a placeholder rather than content.  
**Selector:** `.empty-panel-message`  
**Fix:**
```css
.empty-panel-message {
    font-size: 11px;
    color: var(--text-faint);
    padding: 24px 12px;
}
```

#### P9 — Command palette item text lacks weight differentiation
**Screenshot:** 12  
**Issue:** Command names and category badges both feel visually flat. Obsidian makes command names bolder.  
**Selector:** `.command-palette-name`  
**Fix:**
```css
.command-palette-name {
    font-weight: 500; /* add medium weight */
}
```

---

## 3. Farben & Kontrast

### Positives
- **Catppuccin-inspired palette** is visually appealing and modern
- **Three themes** (dark, light, high-contrast) with proper token override
- **Accent color** (#7f6df2) is distinctive and consistent
- `::selection` color properly themed

### Problems

#### P10 — Core plugins cards use jarring green
**Screenshot:** 09  
**Issue:** The `.plugin-item.enabled` uses a bright green border/background (`--success-500` / green tint) that clashes with the purple accent palette. Obsidian uses a subtle toggle — not colored cards.  
**Selector:** `.plugin-item.enabled`  
**Fix:**
```css
.plugin-item.enabled {
    border-color: var(--border-light); /* remove green border */
    background: var(--bg-surface); /* neutral background */
}
```

#### P11 — Community plugins warning box uses yellow that fails WCAG
**Screenshot:** 10  
**Issue:** The yellow-bordered "Turn off safe mode" box has yellow text on dark background. Yellow (#f9e2af) on dark (#1e1e2e) has only ~8:1 contrast for large text — fine. But the checkbox toggle uses the same accent purple which gets lost.  
**Selector:** `.community-plugins-header`  
**Fix:**
```css
.community-plugins-header {
    border-color: var(--text-yellow);
    background: rgba(249, 226, 175, 0.06); /* was 0.1 — too strong */
    border-width: 1px; /* ensure 1px not 2px */
    border-radius: var(--radius-lg);
}
```

#### P12 — Breadcrumb text contrast too low
**Screenshots:** 04, 19  
**Issue:** Breadcrumb text uses `--text-muted` (#686a6e) on `--bg-primary` (#1e1e2e). Contrast ratio is ~3.2:1 — **fails WCAG AA** for normal text (needs 4.5:1).  
**Selector:** `.breadcrumb-item`, `#breadcrumb-bar`  
**Fix:**
```css
.breadcrumb-item {
    color: var(--text-secondary); /* #a9aaab — gives ~5.8:1 */
}

.breadcrumb-item:last-child {
    color: var(--text-primary);
}
```

#### P13 — Status bar text fails WCAG AA
**Screenshots:** All with status bar visible  
**Issue:** `--text-muted` (#686a6e) on `--bg-tertiary` (#141419) = ~3.8:1 contrast. Fails AA.  
**Selector:** `#statusbar`  
**Fix:**
```css
#statusbar {
    color: var(--text-secondary); /* bump to #a9aaab */
}
```

#### P14 — Graph View shows a white flash/rectangle
**Screenshots:** 17, 18  
**Issue:** The graph view tab shows a white/light-colored rectangle at the top-left of the content area. This appears to be an unthemed canvas or loading artifact. Obsidian's graph view uses a fully dark canvas background.  
**Selector:** `.graph-pane canvas`, `.graph-pane`  
**Fix:**
```css
.graph-pane {
    background: var(--bg-primary);
}

.graph-pane canvas {
    background: var(--bg-primary) !important;
}
```

---

## 4. Interaktionsmuster

### Positives
- **Spring animations** (`--transition-spring`) add personality
- **Hover states** on ribbon buttons, tree items, tabs all well-defined
- **Active press states** with `scale(0.95)` provide feedback
- **Dialog entry animations** use proper cubic-bezier curves
- **Tab dirty indicator** with pulsing dot is a nice touch

### Problems

#### P15 — Settings panel opens inline without transition
**Screenshots:** 05-11  
**Issue:** The settings panel renders inside the content area below the tab bar, replacing the editor. There's no transition — it just appears. Obsidian uses a proper modal overlay for settings. The inline approach is valid but needs at least a fade-in.  
**Selector:** `.settings-pane`  
**Fix:**
```css
.settings-pane {
    animation: settings-fade-in 200ms ease;
}

@keyframes settings-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

#### P16 — Ribbon tooltip appears as native browser tooltip
**Screenshots:** 05 (Settings tooltip), 17 (Graph View tooltip), 19 (Daily Note tooltip)  
**Issue:** Ribbon button tooltips appear as OS-level tooltips (small black rectangle, bottom-left). Obsidian uses custom styled tooltips that appear to the right of the ribbon with proper theming.  
**Selector:** `.ribbon-btn[title]`  
**Fix:**
```css
/* Suppress native tooltip, add custom one */
.ribbon-btn {
    position: relative;
}

.ribbon-btn::after {
    content: attr(aria-label);
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%);
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition);
    box-shadow: var(--shadow-md);
    z-index: 100;
}

.ribbon-btn:hover::after {
    opacity: 1;
}
```

#### P17 — No loading skeleton for "Loading..." states
**Screenshot:** 11  
**Issue:** About page shows "Loading..." text for Platform and Architecture. Should use a shimmer skeleton or at least a spinner.  
**Selector:** `.system-value`  
**Fix:**
```css
.system-value-loading {
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-hover) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
    color: transparent;
    min-width: 80px;
    display: inline-block;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

---

## 5. Konsistenz

### Positives
- Color tokens used consistently across components
- Border radius system (`--radius-sm/md/lg/xl`) applied consistently
- Transition system (`--transition`, `--transition-fast`, `--transition-smooth`) standardized

### Problems

#### P18 — Sidebar panel title inconsistent between panels
**Screenshots:** 02 vs 13 vs 14 vs 15 vs 16  
**Issue:** EXPLORER (02) shows action buttons (new file, new folder, refresh). SEARCH (13) shows search input. BOOKMARKS (14) shows nothing extra. OUTLINE (15) shows nothing. RECENT FILES (16) shows nothing. The visual header treatment varies — some panels feel polished while others feel empty/unfinished.  
**Selector:** `.sidebar-panel-header`  
**Fix:**
```css
.sidebar-panel-header {
    min-height: 36px; /* guarantee consistent header height */
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--border-color); /* add separator */
}
```

#### P19 — Onboarding screen vs main app visual disconnection
**Screenshots:** 01 vs 02  
**Issue:** Onboarding (01) is a centered full-screen welcome with progress dots. The jump to the full app layout (02) is jarring — completely different visual language. Obsidian's onboarding is a quick vault picker, not a multi-step wizard.  
**Selector:** `.onboarding-overlay`  
**Note:** This is more of a UX architecture issue than CSS. The onboarding progress dots suggest 4 steps, which is too many for a note-taking app. Recommend reducing to: vault selection → done.

#### P20 — "New Note" dialog is barebones
**Screenshot:** 03  
**Issue:** The dialog has a single text input and two buttons. No icon, no file type hint, no folder picker. Obsidian's Ctrl+N immediately creates the file in the editor — no dialog needed. The dialog approach adds friction.  
**Selector:** `.dialog`  
**Fix (visual improvement only):**
```css
.dialog h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px; /* was 15px */
}

.dialog h3::before {
    content: '📄';
    font-size: 18px;
}
```

---

## 6. Obsidian-Vergleich

### Was Obsidian besser macht:
1. **No dialog for new notes** — Ctrl+N creates instantly in editor
2. **Settings as modal overlay** — doesn't replace content area
3. **Custom tooltips** everywhere — never falls back to native
4. **Graph view** fully themed with interactive controls panel
5. **Plugin cards** use toggles, not colored state cards
6. **Breadcrumb path** is clickable with dropdown for each segment
7. **Empty states** are more descriptive with action hints
8. **Tab system** has group management and stacking
9. **Status bar** items are interactive (clicking word count, etc.)
10. **Consistent 8px grid** — Obsidian is meticulous about alignment

### Was Oxidian anders/besser macht:
1. **✅ Daily Note button on welcome screen** — immediate access, good for journaling workflow
2. **✅ PROPERTIES panel with counter badge** — cleaner than Obsidian's frontmatter display
3. **✅ Color accent presets in settings** (screenshot 07) — beautiful preset circles
4. **✅ Tag pills in sidebar** — more visual than Obsidian's text-only tag list
5. **✅ Spring animations** — more personality than Obsidian's conservative transitions
6. **✅ Open source / MIT** — Obsidian is proprietary

### Was Oxidian anders macht (neutral/schlecht):
1. **Inline settings instead of modal** — uses content area space, settings persist behind tabs
2. **4-step onboarding wizard** — overengineered for the task
3. **Plugin system shows internal names** (screenshot 09: "enabled_plugins", "plugin_settings") — looks like debug data, not user-facing names

---

## Design Score Breakdown

| Category | Score | Notes |
|----------|-------|-------|
| Layout & Spacing | 7/10 | Good structure, some alignment issues |
| Typography | 6/10 | Scale defined but headers oversized in settings |
| Colors & Contrast | 6/10 | Beautiful palette, WCAG failures in muted text |
| Interactions | 7/10 | Good animations, native tooltips hurt polish |
| Consistency | 6/10 | Token system good, but panel headers vary |
| Obsidian Parity | 7/10 | Solid clone, missing modal settings & graph |

**Overall: 6.5 / 10**

---

## Top 20 Änderungen nach Impact

| # | Impact | Problem | Screenshot | Fix Summary |
|---|--------|---------|------------|-------------|
| 1 | 🔴 Critical | Breadcrumb text fails WCAG AA (3.2:1) | 04, 19 | Change `.breadcrumb-item` to `--text-secondary` |
| 2 | 🔴 Critical | Status bar text fails WCAG AA (3.8:1) | All | Change `#statusbar` color to `--text-secondary` |
| 3 | 🔴 Critical | Graph view white flash/rectangle | 17, 18 | Force `background: var(--bg-primary)` on canvas |
| 4 | 🟠 High | Core plugins jarring green cards | 09 | Remove green border, use neutral styling |
| 5 | 🟠 High | Plugin names show internal IDs | 09 | Use human-readable names (JS change) |
| 6 | 🟠 High | Native browser tooltips on ribbon | 05, 17, 19 | Implement CSS custom tooltips |
| 7 | 🟠 High | Settings headers oversized (32px) | 05-11 | Reduce to 22px |
| 8 | 🟠 High | Settings sidebar width inconsistent | 05-11 | Lock to `200px` with min/max |
| 9 | 🟡 Medium | New Note dialog adds friction | 03 | Consider inline creation like Obsidian |
| 10 | 🟡 Medium | No loading skeleton for system info | 11 | Add shimmer animation |
| 11 | 🟡 Medium | Community plugins yellow box too strong | 10 | Reduce background opacity to 0.06 |
| 12 | 🟡 Medium | Panel title letter-spacing too wide | 02, 13-16 | Reduce from 1.2px to 0.8px |
| 13 | 🟡 Medium | Sidebar panel headers inconsistent | 02-16 | Add `min-height` and border-bottom |
| 14 | 🟡 Medium | Tab bar height too cramped | All | Increase from 36px to 38px |
| 15 | 🟡 Medium | Status bar too thin | All | Increase from 24px to 26px |
| 16 | 🟡 Medium | Settings panel no entry transition | 05-11 | Add fade-in animation |
| 17 | 🟢 Low | "Vault is empty" lacks hierarchy | 02, 18 | Reduce to 11px, use `--text-faint` |
| 18 | 🟢 Low | Command palette text needs weight | 12 | Add `font-weight: 500` to names |
| 19 | 🟢 Low | Editor top padding too tight | 04, 19 | Increase from 32px to 48px |
| 20 | 🟢 Low | Onboarding wizard overengineered | 01 | Reduce to 1-2 steps max |

---

## CSS Variable Audit

### Undefined variables referenced in CSS:
The CSS references several design token variables that are **not defined** in `:root`:
- `--space-1` through `--space-12` (used in settings panel, plugins)
- `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`
- `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`
- `--line-height-normal`, `--line-height-relaxed`
- `--letter-spacing-wide`
- `--duration-200`, `--ease-out`
- `--neutral-0` through `--neutral-900`
- `--primary-50` through `--primary-600`
- `--success-50`, `--success-500`
- `--warning-50`, `--warning-500`
- `--error-500`
- `--focus-ring`
- `--shadow-md` (used in newer sections but may collide)

**This is a significant bug.** The comprehensive settings panel (lines ~2800+) uses an entirely different design token system than the original theme. This means many settings styles **silently fall back to browser defaults**, explaining visual inconsistencies in the settings panels.

**Recommended fix:** Either define all missing tokens in `:root`, or refactor the settings CSS to use the existing token system (`--text-sm`, `--bg-surface`, etc.).

---

## Conclusion

Oxidian is a **promising early-stage clone** with a strong foundation. The Catppuccin-inspired color system and animation library give it personality. The biggest wins would come from:

1. **Fixing WCAG contrast failures** (items 1-2) — accessibility is non-negotiable
2. **Resolving undefined CSS variables** — the settings panel is partially broken
3. **Visual polish on plugin/settings pages** — these are where power users spend time
4. **Custom tooltips** — eliminating native fallbacks is the single biggest "feel" improvement

With these 20 fixes applied, the score would realistically move to **7.5-8/10**.
