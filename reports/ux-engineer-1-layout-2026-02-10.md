# UX Engineer #1 — Layout & Navigation Overhaul Report
**Date:** 2026-02-10  
**Engineer:** Layout & Navigation Architect  
**Files Modified:** `src/css/style.css`, `src/css/design-tokens.css`

---

## Summary

Comprehensive overhaul of Oxidian's layout, navigation, and spatial design to achieve a premium feel inspired by Linear.app, Raycast, and Arc browser.

## Changes Made

### 1. Design Tokens (`design-tokens.css`)
- **Ribbon width**: 44px → 48px (more breathing room for icons)
- **Sidebar**: Added `--sidebar-width-min` (200px), `--sidebar-width-max` (480px), `--sidebar-width-collapsed` (0px)
- **Added**: `--content-max-width: 720px` for optimal reading width (~65-75 chars)
- **Added**: `--sidebar-collapse-duration` (250ms) and `--sidebar-collapse-ease` for smooth collapse animation

### 2. Ribbon (`style.css`)
- **Icon sizing**: 36px → 34px buttons with `--radius-md` (less bubbly, more refined)
- **Transitions**: Explicit `150ms ease-out` for color/background/transform (no more `all`)
- **Active indicator**: Replaced circular glow with **left-edge bar** (3px accent line with scale-in animation) — Linear-style
- **Removed**: `border-radius: 50%` on hover/active (cleaner rectangular feel)
- **Added**: Visual separator between top and bottom ribbon groups via `::before` pseudo-element
- **Padding**: Increased to 10px vertical for better spacing

### 3. Sidebar
- **Collapsible**: Added `.collapsed` class with smooth `width` + `opacity` transition (250ms ease)
- **Panel transitions**: Replaced opacity fade with `translateX(-6px)` slide-in animation (200ms)
- **Min/max widths**: Now use design tokens for consistency
- **Tree items**: 
  - Active state uses subtle accent-tinted background (`rgba(accent, 0.1)`) instead of heavy `bg-active`
  - Removed border transitions (unnecessary)
  - Increased horizontal margin (4px → 6px)

### 4. Resize Handle
- **Width**: 3px → 5px hit target with visual indicator via `::after` pseudo-element
- **Hover state**: Shows a 32px → 48px accent-colored pill in center (not full-width highlight)
- **Added**: `.snapping` class for snap-point feedback

### 5. Tab Bar (Major Overhaul)
- **Layout**: Removed `align-items: flex-end` — tabs now stretch full height
- **Tab list**: Now independently scrollable with `scroll-behavior: smooth`
- **New tab button**: Moved outside scroll area, fixed width with border separator
- **Tab styling**:
  - Removed rounded top corners and margin gaps
  - Font size: 13px → 12px, more compact
  - Max width: 240px → 200px
  - Active: Uses `bg-primary` (content area color) for seamless connection
  - Active indicator: Full-width bottom 2px accent line (not inset)
  - Hover: No more `translateY(-1px)` lift (distracting)
- **Pinned tabs**: Collapsed to 40px icon-only with hidden title/close/dirty
- **Drag reorder**: Added `.drag-over-left` / `.drag-over-right` with inset box-shadow indicators
- **Close button**: `margin-right: -4px` for tighter layout

### 6. Content Area
- **Editor/Preview padding**: 32px/40px → 40px/48px (more generous)
- **Max width**: Uses `--content-max-width` (720px) token
- **Reading view**: Added `margin: 0 auto` for proper centering + smooth scroll
- **Preview pane**: Added `scroll-behavior: smooth`
- **Tab switch**: Subtle 150ms opacity fade animation on content area

### 7. Status Bar
- **Color**: `text-muted` → `text-faint` (more subtle, less competing)
- **Item hover**: Added `padding: 2px 6px` + `border-radius` + `background: bg-hover` on hover
- **Letter spacing**: Added `0.01em` for slightly airier feel
- **Gap**: 14px → 12px between items

### 8. Breadcrumb Bar
- **Nav buttons**: Added explicit styling with 24px hit targets, proper disabled state (opacity 0.3)
- **Color**: `text-muted` → `text-faint` for subtlety

### 9. Transitions & Motion (Global)
- **All hover states**: Standardized to `150ms ease-out`
- **Active press**: `scale(0.92)` with 60ms for snappy tactile feel
- **Panel open**: 200ms ease-out slide-in animation
- **Sidebar collapse**: 250ms ease (width + opacity)
- **Ribbon indicator**: `scaleY` animation on active state change
- **Removed**: `transform: scale(1.05)` on ribbon hover (too playful for premium feel)
- **Removed**: `box-shadow` on tab hover (noise reduction)

## Design Philosophy

- **Restraint over spectacle**: Removed bouncy/scale effects in favor of subtle color/opacity shifts
- **Consistent timing**: 150ms for micro-interactions, 200ms for panels, 250ms for layout shifts
- **Accent economy**: Active indicators use thin lines, not glowing backgrounds
- **Content-first**: 720px max-width, generous padding, smooth scrolling
- **Reduced visual noise**: Fewer borders, subtler colors in status/breadcrumb bars

## Build Status
✅ esbuild bundle successful (823.9kb)
