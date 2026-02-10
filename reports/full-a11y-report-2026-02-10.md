# Oxidian — Full Accessibility & Standards Report

**Date:** 2026-02-10  
**Tester:** Automated A11y Audit  
**Scope:** `index.html`, `style.css`, `responsive.css`, visual screenshots  
**Standard:** WCAG 2.1 AA

---

## Executive Summary

Oxidian demonstrates **strong accessibility foundations**. The app uses semantic HTML5 landmarks (`nav`, `main`, `aside`, `footer`), ARIA attributes on dialogs and interactive elements, a skip-link, `.sr-only` labels, `:focus-visible` styles, a high-contrast theme, and `prefers-reduced-motion` support. The codebase is well above average for an Electron/Tauri app.

**Overall Grade: B+** — Solid fundamentals with a handful of issues to fix.

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Major | 6 |
| Minor | 8 |

---

## 1. HTML Semantik

### ✅ What's Good
- Correct use of `<nav>`, `<aside>`, `<main>`, `<footer>` landmarks
- `role="navigation"`, `role="complementary"`, `role="main"`, `role="contentinfo"` explicitly set
- All dialogs have `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- `<button>` elements used correctly (not `<div>` clickable hacks)
- `lang="en"` set on `<html>`

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 1.1 | Skip-link is placed **at the end of `<body>`** instead of being the first focusable element | **Major** | 2.4.1 Bypass Blocks | Move `<a href="#content-area" class="skip-link">` to immediately after `<body>` opening tag |
| 1.2 | Dropdown menu items (`<div class="dropdown-item">`) are non-semantic — not buttons or links | **Major** | 4.1.2 Name, Role, Value | Change to `<button class="dropdown-item">` or add `role="menuitem"` + `tabindex="0"` |
| 1.3 | Context menu (`#context-menu`) is dynamically populated — needs `role="menu"` and items need `role="menuitem"` | **Major** | 4.1.2 | Add `role="menu"` to `#context-menu`, ensure JS-generated items have `role="menuitem"` |
| 1.4 | `#tab-new-btn` content is just `+` — no accessible label | **Minor** | 4.1.2 | Add `aria-label="New Tab"` (already has `title`, but `aria-label` is more reliable) |
| 1.5 | `#btn-nav-back` / `#btn-nav-forward` use `←`/`→` text — fine visually but add `aria-label="Navigate back"` / `"Navigate forward"` for clarity | **Minor** | 4.1.2 | Add `aria-label` attributes |
| 1.6 | Duplicate `aria-hidden="true"` on hamburger SVG | **Minor** | N/A | Remove one of the duplicate `aria-hidden="true"` attributes on the mobile menu SVG |

---

## 2. ARIA Labels

### ✅ What's Good
- All landmark regions have `aria-label` (e.g., "Main navigation", "Sidebar panels", "Editor content", "Status bar")
- Search input has both `<label class="sr-only">` and `aria-label`
- Dialog inputs have `aria-label` and `sr-only` labels
- Mobile menu button has `aria-label`, `aria-expanded`, `aria-controls`
- All decorative SVGs have `aria-hidden="true"`

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 2.1 | Ribbon buttons (File Explorer, Search, etc.) rely only on `title` — **no `aria-label`** | **Major** | 4.1.2 Name, Role, Value | Add `aria-label` matching the `title` text to each `.ribbon-btn` |
| 2.2 | Icon buttons (`.icon-btn`) like New Note, Refresh rely only on `title` | **Major** | 4.1.2 | Add `aria-label` to each `.icon-btn` |
| 2.3 | `#tab-list` should be a `role="tablist"` with tabs having `role="tab"` and `aria-selected` | **Major** | 4.1.2 | Implement WAI-ARIA Tabs pattern on the tab bar |
| 2.4 | View toolbar buttons (view mode, backlinks, more options) lack `aria-label` | **Minor** | 4.1.2 | Add `aria-label` to each `.view-toolbar-btn` |
| 2.5 | `#more-options-menu` dropdown needs `aria-expanded` on trigger button | **Minor** | 4.1.2 | Toggle `aria-expanded` on `#btn-more-options` when menu opens/closes |

---

## 3. Keyboard Navigation

### ✅ What's Good
- `:focus-visible` styles defined globally with clear 2px accent outline
- Escape key closes mobile sidebar and dialogs
- Focus returns to menu button after closing mobile sidebar
- Skip-link exists (needs repositioning — see 1.1)
- `prefers-reduced-motion: reduce` disables animations

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 3.1 | **Focus trap missing in dialogs** — When a dialog opens, focus should be trapped within it until closed | **Critical** | 2.4.3 Focus Order, 2.1.2 No Keyboard Trap | Implement focus trapping: on dialog open, move focus to first input; on Tab from last element, cycle to first; on close, return focus to trigger element |
| 3.2 | Dropdown menu items (`<div>`) are not keyboard-navigable — no `tabindex`, no arrow key support | **Major** | 2.1.1 Keyboard | Add `tabindex="0"`, implement arrow key navigation for `#more-options-menu` and context menus |
| 3.3 | File tree items (`.tree-item`) — unclear if keyboard navigation (arrow keys, Enter to open) is implemented | **Minor** | 2.1.1 | Ensure tree items are focusable with `role="treeitem"` and support arrow key navigation (WAI-ARIA Tree pattern) |
| 3.4 | Sidebar resize handle has no keyboard alternative | **Minor** | 2.1.1 | Either make handle focusable with arrow key resizing, or provide a keyboard shortcut for sidebar width |

---

## 4. Farbkontrast (Color Contrast)

### Analysis — Dark Theme (Default)

| Element | Foreground | Background | Ratio | Pass? |
|---------|-----------|------------|-------|-------|
| Primary text (`#dcddde` on `#1e1e2e`) | #dcddde | #1e1e2e | **11.2:1** | ✅ AA |
| Secondary text (`#a9aaab` on `#1e1e2e`) | #a9aaab | #1e1e2e | **7.2:1** | ✅ AA |
| Muted text (`#686a6e` on `#1e1e2e`) | #686a6e | #1e1e2e | **3.5:1** | ⚠️ Fails AA for body text (needs 4.5:1), passes for large text |
| Faint text (`#4a4c50` on `#1e1e2e`) | #4a4c50 | #1e1e2e | **2.1:1** | ❌ Fails AA |
| Accent (`#7f6df2` on `#1e1e2e`) | #7f6df2 | #1e1e2e | **4.8:1** | ✅ AA |
| Link color (`#89b4fa` on `#1e1e2e`) | #89b4fa | #1e1e2e | **7.8:1** | ✅ AA |
| Status bar text (`#686a6e` on `#141419`) | #686a6e | #141419 | **3.8:1** | ⚠️ Fails AA body |

### Analysis — Light Theme

| Element | Foreground | Background | Ratio | Pass? |
|---------|-----------|------------|-------|-------|
| Primary text (`#2e2e3a` on `#ffffff`) | #2e2e3a | #ffffff | **13.5:1** | ✅ AA |
| Muted text (`#8a8a9a` on `#ffffff`) | #8a8a9a | #ffffff | **3.5:1** | ⚠️ Fails AA body |
| Faint text (`#b0b0c0` on `#ffffff`) | #b0b0c0 | #ffffff | **2.1:1** | ❌ Fails AA |

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 4.1 | `--text-muted` (#686a6e dark / #8a8a9a light) used for informational text fails 4.5:1 | **Major** | 1.4.3 Contrast (Minimum) | Lighten to `#8a8c90` (dark) / darken to `#737385` (light) for ≥4.5:1 |
| 4.2 | `--text-faint` (#4a4c50 dark / #b0b0c0 light) at ~2:1 fails even for large text | **Minor** | 1.4.3 | Acceptable if used **only** for decorative/non-essential elements (separators, disabled states). Verify no informational content uses `--text-faint` |
| 4.3 | Status bar muted text on darker background — borderline | **Minor** | 1.4.3 | Use `--text-secondary` for status bar content or lighten `--text-muted` |

### ✅ High Contrast Theme
The `high-contrast` theme uses pure white on black (#ffffff on #000000 = 21:1) — **excellent**.

---

## 5. Screen Reader Compatibility

### ✅ What's Good
- Landmarks properly labeled → screen reader users can jump between nav/main/sidebar/footer
- Dialogs have `aria-modal="true"` + `aria-labelledby` → announced correctly
- SVG icons marked `aria-hidden="true"` → not read aloud
- `.sr-only` class correctly implemented for visual-hide-but-screen-reader-visible labels
- Welcome screen buttons have visible text + icons (icons hidden from SR)

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 5.1 | Tab bar not using ARIA tabs pattern — screen reader won't understand tab switching | **Major** | 4.1.2 | See issue 2.3 |
| 5.2 | File tree needs `role="tree"` / `role="treeitem"` / `aria-expanded` for folders | **Minor** | 4.1.2 | Add WAI-ARIA tree roles to JS-generated file tree items |
| 5.3 | Live region for status updates missing — word count/cursor position changes aren't announced | **Minor** | 4.1.3 Status Messages | Add `aria-live="polite"` to `#status-word-count` or a dedicated live region |
| 5.4 | `#bookmarks-list` and similar panels with "No bookmarks yet" — add `role="status"` or `aria-live` for dynamic content changes | **Minor** | 4.1.3 | Add `aria-live="polite"` to dynamically-updating panel containers |

---

## 6. Responsive Design

### ✅ What's Good
- Comprehensive responsive CSS with breakpoints at 480, 640, 768, 1024, 1280, 1536px
- Mobile: ribbon hidden, sidebar becomes slide-out drawer with overlay
- Hamburger menu with proper ARIA attributes
- `prefers-reduced-motion` respected
- `prefers-contrast: high` media query exists
- Touch targets appear adequate (36px ribbon buttons, 28px min tree items)
- Editor max-width 750px for readability on wide screens

### ⚠️ Issues

| # | Issue | Severity | WCAG | Fix |
|---|-------|----------|------|-----|
| 6.1 | No visible text zoom support tested — ensure layout works at 200% zoom | **Minor** | 1.4.4 Resize Text | Test with `font-size: 200%` and fix any overflow/clipping |
| 6.2 | `overflow: hidden` on `html, body` may cause content clipping at high zoom | **Minor** | 1.4.10 Reflow | Consider `overflow-y: auto` for outer containers when zoomed |

---

## Priority Fix List

### 🔴 Critical (Fix Immediately)
1. **Focus trap in dialogs** (3.1) — Users can tab outside modal dialogs, breaking keyboard navigation and potentially interacting with hidden content

### 🟠 Major (Fix Soon)
2. **Skip-link position** (1.1) — Move to first element in `<body>`
3. **Dropdown items not semantic** (1.2, 3.2) — Convert to buttons with keyboard support
4. **Ribbon/icon buttons need `aria-label`** (2.1, 2.2) — `title` alone insufficient for screen readers
5. **Tab bar needs ARIA tabs pattern** (2.3, 5.1) — `role="tablist"` / `role="tab"` / `aria-selected`
6. **Context menu needs ARIA roles** (1.3) — `role="menu"` / `role="menuitem"`
7. **`--text-muted` contrast** (4.1) — Bump to ≥4.5:1

### 🟡 Minor (Nice to Have)
8-15. Various label improvements, live regions, tree widget roles, zoom testing

---

## Positive Highlights 🌟

The codebase already demonstrates strong a11y awareness:
- ✅ Skip-link (just needs repositioning)
- ✅ `.sr-only` utility class, correctly implemented
- ✅ `aria-hidden="true"` on all decorative SVGs
- ✅ `:focus-visible` with clear accent outlines
- ✅ `prefers-reduced-motion` and `prefers-contrast: high` support
- ✅ High-contrast theme built in
- ✅ Semantic HTML landmarks throughout
- ✅ Mobile drawer with proper `aria-expanded` / `aria-controls`
- ✅ Dialog ARIA attributes complete
- ✅ `color-scheme: dark/light` correctly set

This is significantly better than most comparable apps. The critical fix (dialog focus trapping) and the major fixes are straightforward to implement.
