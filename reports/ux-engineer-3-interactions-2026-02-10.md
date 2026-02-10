# UX Engineer #3 — Interaction & Motion Design Report

**Date:** 2026-02-10  
**Engineer:** Interaction & Motion Design Architect  
**Files Modified:** `src/css/animations.css` (full rewrite), `src/css/style.css` (notice container fix), `src/js/app.js` (interaction utilities), `src/js/contextmenu.js` (origin-aware animation), `src/js/app.bundle.js` (rebundled)

---

## Summary

Complete overhaul of `animations.css` and addition of interaction utilities to bring Oxidian's feel from "functional" to "polished native app." All changes respect `prefers-reduced-motion`.

## Changes

### 1. CSS Animations (`animations.css` — full rewrite)

**Keyframes library:**
- `fadeIn`, `fadeOut`, `slideInRight`, `slideInLeft`, `slideInUp`, `slideInDown`
- `slideOutRight`, `slideOutLeft`, `slideOutUp`, `slideOutDown`
- `scaleIn`, `scaleOut`, `pulse`, `shake`, `spin`, `shimmer`

**Utility classes:**
- `.animate-fade-in`, `.animate-slide-in-right`, `.animate-scale-in`, `.animate-pulse`, `.animate-shake`, `.animate-spin`
- `.stagger-children` — auto-staggers child animations (40ms intervals, up to 8 children)

### 2. Micro-interactions

- **Button press:** `scale(0.98)` on `:active` with 60ms snap-back (all buttons, welcome-btn, mod-cta, etc.)
- **Button hover glow:** Primary buttons get accent-colored `box-shadow` glow on hover
- **Icon buttons:** `scale(1.05)` hover, `scale(0.95)` active
- **Toggle switches:** Spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) on slide, accent glow when checked
- **Checkbox:** Scale-in animation on check
- **Input focus:** Border glow + outer ring (`box-shadow: 0 0 0 3px` accent at 12% opacity + 12px ambient glow)
- **Tooltip system:** CSS-only via `[data-tooltip]` attribute — 150ms delay, 200ms fade, positioned above element

### 3. Context Menu

- **Origin-aware scale-in:** Uses CSS custom properties `--ctx-origin-x/y` set from JS click position
- Animation re-triggers on each show via reflow trick
- 120ms `cubic-bezier(0.4, 0, 0.2, 1)` entrance

### 4. Modal Open/Close

- **Backdrop:** `fadeIn` 150ms + `blur(8px)` backdrop-filter
- **Modal body:** `scale(0.95→1)` + `translateY(8px→0)` with spring easing (250ms)
- **Exit classes:** `.closing` on overlay and dialog for reverse animation

### 5. Notice/Toast System

- **Repositioned** container from bottom-right to **top-right** (matches user expectations)
- **Slide-in:** `translateX(100%)` → `translateX(0)` with spring easing (300ms)
- **Auto-dismiss slide-out:** Reverse animation on `.fade-out`
- Error toasts use same treatment

### 6. Page Transitions

- **Tab content switch:** Pane crossfade (opacity 0→1, 150ms)
- **Tab indicator:** `scaleX(0→1)` animation on active tab underline
- **Sidebar panel switch:** `opacity + translateY(4px)` fade (150ms)
- **Settings section switch:** Directional slide via `.slide-left` / `.slide-right` classes
- **Welcome screen:** Smooth opacity + scale transition on hide

### 7. Drag & Drop Polish

- **File tree:** `.dragging` (opacity 0.4 + scale 0.98), `.drop-target-above/below` (accent indicator line), `.drop-target-inside` (accent background)
- **Tabs:** `.dragging` (opacity 0.5 + scale 0.95), `.drop-target` (inset accent ring)

### 8. Scroll & Loading

- `scroll-behavior: smooth` on html
- **Skeleton loading:** `.skeleton`, `.skeleton-line`, `.skeleton-circle` with shimmer animation
- `.skeleton-line.short` (60%) and `.skeleton-line.medium` (80%) variants

### 9. Focus & Keyboard Navigation

- **Focus ring:** `:focus-visible` with 2px accent outline, 2px offset (all interactive elements)
- **Skip-to-content link:** Hidden until focused, slides to top-left
- **Focus trap (JS):** `trapFocus()` utility for modals — traps Tab/Shift+Tab, auto-focuses first element, returns cleanup function
- **Keyboard shortcuts overlay:** `Ctrl+/` opens full shortcut reference panel with all shortcuts organized by group

### 10. Folder Collapse/Expand

- CSS Grid-based collapse: `grid-template-rows: 0fr → 1fr` with 200ms transition (smooth height animation without JS measurements)

### 11. Accessibility

- `@media (prefers-reduced-motion: reduce)` — all animations reduced to 0.01ms, skeleton shimmer disabled, essential state transitions kept at 1ms
- Skip-to-content link for screen readers

## JS Changes

### `app.js`
- Added `trapFocus(container)` — reusable focus trap returning cleanup function
- Added `showKeyboardShortcuts()` — creates overlay with organized shortcut reference
- Added `Ctrl+/` to keyboard handler
- Exported utilities as `window._trapFocus` and `window._showKeyboardShortcuts`

### `contextmenu.js`
- Sets `--ctx-origin-x/y` CSS custom properties on show for origin-aware animation
- Re-triggers animation via reflow on each show

### `style.css`
- Fixed `#obsidian-notice-container` position from `bottom: 40px` to `top: 20px` and `column-reverse` to `column`

## Build

Bundle rebuilt successfully: `src/js/app.bundle.js` (824.2kb)

## Design Principles Applied

- **Timing:** 120-300ms range for all animations (perceptually instant but visible)
- **Easing:** `ease-out` for entrances, `ease` for exits, spring for emphasis
- **Hierarchy:** Motion reinforces importance (modals > menus > buttons)
- **Restraint:** No decorative loops, no idle animations, no novelty motion
- **Accessibility:** Full `prefers-reduced-motion` support
