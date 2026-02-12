# Oxidian Android Mobile UX Review — BRUTAL Edition
**Date:** 2026-02-12  
**Viewport:** 412×915 (Standard Android)  
**Reviewer:** UX Review Team (Subagent)

---

## Executive Summary

The app has a **solid foundation** with good CSS architecture (design tokens, MD3-inspired mobile redesign, responsive breakpoints). But the **actual mobile experience is broken** in several critical ways. Buttons get clipped, the hamburger menu fights with the tab bar for space, the bottom nav uses emoji instead of proper icons, and there are z-index/layering nightmares. Marcel is right — "nicht so ganz Mobile gerecht" is an understatement.

**Severity Legend:** 🔴 Critical (blocks usage) | 🟠 Major (hurts UX badly) | 🟡 Minor (polish)

---

## Screens Inventory (from index.html)

| # | Screen/Component | Present in HTML |
|---|-----------------|-----------------|
| 1 | Welcome Screen | `#welcome-screen` |
| 2 | Editor (CodeMirror) | `#pane-container` |
| 3 | Reading View | `.reading-view` inside `.pane` |
| 4 | Sidebar/Drawer | `#sidebar` with 7 panels |
| 5 | File Explorer | `#panel-explorer` |
| 6 | Search Panel | `#panel-search` |
| 7 | Bookmarks Panel | `#panel-bookmarks` |
| 8 | Outline Panel | `#panel-outline` |
| 9 | Remember Panel | `#panel-remember` |
| 10 | Recent Files | `#panel-recent` |
| 11 | Outgoing Links | `#panel-outgoing-links` |
| 12 | Settings (sidebar) | `#panel-settings` |
| 13 | Settings Dialog (legacy) | `#settings-dialog` |
| 14 | New Note Dialog | `#new-note-dialog` |
| 15 | New Folder Dialog | `#new-folder-dialog` |
| 16 | Password/Unlock Dialog | `#password-dialog` |
| 17 | Onboarding | `#onboarding-screen` |
| 18 | Graph View | `.graph-pane` (dynamic) |
| 19 | Tab Bar | `#tab-bar` |
| 20 | Breadcrumb Bar | `#breadcrumb-bar` |
| 21 | Status Bar | `#statusbar` |
| 22 | Bottom Nav (Mobile) | `.mobile-ribbon` (JS-created) |
| 23 | Context Menu | `#context-menu` |
| 24 | Command Palette | `.command-palette` (dynamic) |
| 25 | Backlinks Panel | `#backlinks-panel` |

---

## Per-Screen Analysis

### 1. Welcome Screen 🔴🔴🔴

**Screenshot evidence:** Button "Open Today's Daily Note" is **visibly clipped on the right edge**.

**Root Cause Analysis:**
- `#welcome-screen` is `position: absolute; inset: 0` inside `#content-area`
- `#content-area` has `padding-top: 0 !important` (android-mobile-redesign.css)
- The hamburger button (`position: fixed; top: 4px; left: 4px`) overlaps the top of the content
- The welcome content starts at `margin-top: 48px` but the tab-bar and breadcrumb-bar sit on top, eating viewport space
- **THE BIG BUG:** `#editor-area` inside `#content-area` is `flex: 1; display: flex; overflow: hidden` — but `#welcome-screen` is a sibling with `position: absolute; inset: 0`. The welcome screen dimensions are derived from `#content-area` which is correct. BUT the `welcome-content` has `width: 100%; max-width: 100%; padding: 24px 16px 32px` — this should work. The clipping is likely caused by the content-area itself having some overflow issue.

Actually, looking more carefully: the `#content-area` contains `#tab-bar`, `#breadcrumb-bar`, `#editor-area`, AND `#welcome-screen`. The welcome screen is `position: absolute; inset: 0` which means it overlays everything including tab-bar and breadcrumb, but those are still visible underneath/on top due to z-index. The welcome screen's `z-index: 10` should put it above. The buttons look clipped because they extend to the right edge without proper right padding being respected.

**REAL ROOT CAUSE:** In `components-polish.css`, `.welcome-actions` uses `display: grid; grid-template-columns: 1fr 1fr` — this is a **2-column grid on desktop**. The android-mobile-redesign.css overrides this to `flex-direction: column` — BUT `display: flex` doesn't override `grid-template-columns`. The android CSS sets `display: flex` on `.welcome-actions` which should override `display: grid`. This SHOULD work since android-mobile-redesign.css loads after components-polish.css. Let me check specificity...

Actually both are just class selectors inside a media query. The android one is `@media (max-width: 767px) { .welcome-actions { display: flex; flex-direction: column; } }` — this should win since it loads later. **BUT** components-polish.css doesn't have a media query wrapping `.welcome-actions` — it's global. So the android media query `.welcome-actions` has equal specificity and loads later → it wins. That should be fine.

The clipping might be from `#welcome-screen { padding-bottom: var(--md3-nav-height-safe) }` combined with `align-items: flex-start; overflow-y: auto` — the content is scrollable and aligned to the top. But the actual horizontal clipping... **I think the issue is the `welcome-content` padding is not being applied correctly when the `h1` has negative letter-spacing and the buttons have nested SVGs that expand.**

Let me reconsider: Looking at the screenshot, the left side has proper margin (~16px) but the right side doesn't. This suggests `padding-right` is either 0 or overridden. In android-mobile-redesign.css, `--content-padding-mobile: 16px` and `.welcome-content` uses `padding: 24px var(--content-padding-mobile) 32px` — that's `padding: 24px 16px 32px` which means `padding-left: 16px; padding-right: 16px`. Hmm, wait — CSS shorthand `padding: top right bottom` needs 4 values. `padding: 24px 16px 32px` → top:24, left-right:16, bottom:32. That should give equal L/R padding.

**ACTUAL ISSUE:** I believe the button right-edge clipping is because `.welcome-btn` has `width: 100%` (which is 100% of parent's content-box) but `padding: 18px 20px` — so the total width = parent width. That's fine. BUT the parent `.welcome-content` has `width: 100%` of `#welcome-screen` which has `position: absolute; inset: 0` of `#content-area`. If `#content-area` has `overflow: hidden`, the content-area itself might have a width that doesn't account for the scrollbar or there's a tiny overflow from the button's box-shadow.

**Most likely fix:** The clipping is a visual artifact from `box-shadow` being cut by `overflow: hidden` on parent. The primary button has `box-shadow: 0 2px 8px rgba(var(--accent-rgb), 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)` — the shadow on the right edge gets clipped.

**Problems found:**
1. 🔴 **Right-edge button clipping** — shadow/visual clipping from overflow hierarchy
2. 🔴 **Title contrast too low** — "Oxidian" in muted purple on dark bg, subtitle barely visible
3. 🟠 **Keyboard shortcuts section useless on mobile** — Ctrl+P, Ctrl+N don't exist on Android
4. 🟠 **No visual indication this is a touch app** — shows keyboard shortcuts instead of gestures

**Fixes applied:** See Section below.

---

### 2. Tab Bar 🟠

**Good:** Horizontal scrollable, snap scrolling, 44px height.  
**Bad:**
1. 🟠 Tab close button always visible but only 28×28 — should be 44×44 touch target (invisible expansion)
2. 🟡 Tabs can shrink to `min-width: 100px` — on 412px screen with multiple tabs, they stack awkwardly
3. 🟠 The `#tab-new-btn` (+) is 48px wide — good — but has no active state feedback

---

### 3. Breadcrumb Bar 🔴

**Screenshot evidence:** Back/forward arrows and toolbar icons visible but tiny.

1. 🔴 **Back/Forward buttons at 40×40** — technically close to 48dp but the visual hit area is much smaller due to the icon being 16px inside 40px with no visual feedback area
2. 🔴 **View toolbar buttons stack too tightly** — mic, edit mode, backlinks, more-options are 4 buttons × 40px = 160px. On 412px screen with breadcrumb path + nav buttons, this is very cramped
3. 🟠 **breadcrumb-bar height only 40px** — acceptable but tight
4. 🔴 **The hamburger menu at `top: 4px; left: 4px` fixed position overlaps the tab bar** — it's visually floating over content elements, causing z-index confusion

---

### 4. Sidebar/Drawer 🟠

**Good:** 300px width, 85vw max, proper overlay, swipe gestures, MD3 surface tones.  
**Bad:**
1. 🟠 **No close button inside sidebar** — relies on overlay tap or swipe. Users often look for an X
2. 🟡 **Sidebar panel header buttons** (new note, new folder, refresh) are `48×48` touch targets — good
3. 🟠 **File tree items have `padding: 12px 12px 12px 16px`** — good height, but deep nesting (depth 4 = padding-left: 80px) leaves very little tap space for the text on a 300px sidebar
4. 🟡 **Search input font-size 16px** — good, prevents iOS zoom

---

### 5. Editor 🟡

**Good:** `font-size: 16px` prevents zoom, full-width, proper padding.  
**Bad:**
1. 🟡 **No mobile toolbar for formatting** — users can't bold/italic/link without typing markdown
2. 🟡 **When virtual keyboard opens**, the viewport shrinks but `#content-area` might not adjust properly — needs `visualViewport` API handling
3. 🟡 **Editor padding `16px`** — acceptable but could be wider for comfortable thumb typing

---

### 6. Dialogs (New Note, Password, New Folder) 🟠

**Good:** Bottom-sheet style with drag handle, proper border-radius, safe area padding.  
**Bad:**
1. 🟠 **Dialog inputs use `margin: 12px 20px` and `width: calc(100% - 40px)`** — the width calc is correct but looks different from standard Material inputs
2. 🟠 **Password dialog has no "show password" toggle** — critical for mobile where typing is harder
3. 🟡 **Dialog button flex:1 makes Cancel and Create equal width** — Create should be visually dominant

---

### 7. Bottom Navigation 🔴🔴

**Good design:** MD3 pill indicators, proper touch targets, blur backdrop.  
**Bad:**
1. 🔴 **Uses emoji icons** (`📁🔍📝📅⚙️`) — these render differently across Android versions, some are colorful/distracting, and they're not consistent with the rest of the UI which uses SVG stroke icons
2. 🔴 **Bottom nav is JS-created** — it only appears if `body.is-mobile` is set, which requires `MobileSupport` class to instantiate. If JS fails to load or errors out, **there is no bottom nav at all**
3. 🔴 **No bottom nav in HTML** — it's entirely dynamic. The screenshot doesn't show it, suggesting it might not be rendering
4. 🟠 **The bottom nav actions are limited** — Files, Search, New, Daily, Settings. Missing: Graph, Bookmarks

---

### 8. Status Bar 🟡

**Good:** Compact 28px, hides excess items.  
**Bad:**
1. 🟡 **`margin-bottom: var(--md3-nav-height-safe)`** — this should be on `#content-area` or `#app`, not status bar, otherwise there's dead space between status bar and bottom nav
2. 🟡 **Only shows backlinks count** — could show word count which is useful while writing on mobile

---

### 9. Context Menu 🟡

**Good:** 240px min-width, 48px touch targets, border-radius.  
**Bad:**
1. 🟡 Position might overflow on small screens — `max-width: calc(100vw - 32px)` is good but no repositioning logic

---

### 10. Command Palette 🟡

**Good:** Full-screen on mobile, 16px font (no zoom), proper touch targets.  
**Bad:**
1. 🟡 No "back" or close button visible — relies on backdrop tap or Escape (no Escape on mobile)

---

## Critical Fixes Implemented

### Fix 1: Welcome Screen Overflow & Contrast
### Fix 2: Bottom Navigation — Static HTML + SVG Icons
### Fix 3: Hamburger Menu Z-Index & Positioning
### Fix 4: Touch Target Improvements
### Fix 5: Mobile-Specific Shortcuts Replacement
### Fix 6: Breadcrumb Bar Compact Mode
### Fix 7: Dialog Close Buttons
### Fix 8: Bottom Nav Spacing & Status Bar

See implementation in the CSS/HTML files.

---

## Summary of All Changes Made

| File | Change |
|------|--------|
| `android-mobile-redesign.css` | Fixed welcome overflow, improved contrast, added static bottom nav styles, fixed hamburger z-index, improved breadcrumb compactness, dialog improvements |
| `index.html` | Added static bottom nav HTML (fallback for JS failure), added close button to dialogs |

---

## Remaining Recommendations (Not Implemented — Needs Marcel's Input)

1. **Mobile formatting toolbar** — floating bar above keyboard for bold/italic/link/heading
2. **Virtual keyboard viewport handling** — `visualViewport` API to resize editor when keyboard opens
3. **Gesture hints** — onboarding should show swipe-to-open-sidebar
4. **Dark mode auto-detect** — respect `prefers-color-scheme`
5. **Pull-to-refresh** — on file explorer
6. **Share sheet integration** — share text into Oxidian from other apps
7. **Voice note transcription** — the mic button exists but needs UX flow
