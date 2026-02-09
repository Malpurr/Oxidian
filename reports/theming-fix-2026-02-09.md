# Theming Fix Report — 2026-02-09

## Problem
Settings page had white/light input boxes, selects, and buttons that didn't match the dark theme. Native form controls rendered with OS light defaults.

## Root Cause
1. **Missing `color-scheme: dark`** — Without this CSS property, browsers render native form controls (range sliders, color pickers, checkboxes, scrollbars) with light OS defaults regardless of custom styling.
2. **Range inputs unstyled** — `input[type="range"]` had no custom track/thumb styling, falling back to browser defaults (white/light).
3. **Color inputs unstyled** — `input[type="color"]` swatch wrapper used browser defaults.

## Fixes Applied

### 1. `color-scheme: dark` on `<html>` (style.css)
- Added `html { color-scheme: dark; }` — This is the **single most impactful fix**. It tells the browser to render ALL native form controls in dark mode, including:
  - Range slider tracks and thumbs
  - Select dropdown native popups
  - Color picker dialogs
  - Scrollbars (on systems using overlay scrollbars)
  - Date/time pickers if any
  - Checkboxes and radio buttons outside custom toggles

### 2. Custom Range Input Styling (style.css)
- Full webkit + moz track and thumb styling with accent-colored thumbs
- Hover scale effect on thumb
- Consistent dark track color using `--bg-active`

### 3. Custom Color Input Styling (style.css)
- Dark background and border matching other form controls
- Clean swatch rendering without browser chrome

## Audit Results — All Screens

### ✅ Settings Page
- **Vault Path input** — Already styled via `.setting-control input[type="text"]` + global reset ✓
- **Browse button** — Uses `.btn-secondary.btn-sm` → dark surface bg ✓
- **Language dropdown** — Global `select` reset + `.setting-control select` ✓
- **Startup Behavior dropdown** — Same as above ✓
- **Font Family input** — `.setting-control input[type="text"]` ✓
- **Font Size / Line Height / UI Font Size ranges** — Now custom styled ✓
- **Tab Size select** — Global select reset ✓
- **Spell Check / Vim Mode toggles** — Custom `.toggle` component ✓
- **Theme cards** — `.theme-card` with dark styling ✓
- **Accent Color picker** — Now custom styled + color-scheme: dark ✓
- **Encryption toggle** — Custom `.toggle` ✓
- **Change Password button** — `.btn-secondary` ✓
- **Auto Backup toggle** — Custom `.toggle` ✓
- **Load Plugin button** — `.btn-secondary` ✓
- **Plugin toggles** — Custom `.toggle` ✓

### ✅ Dialogs & Modals
- **New Note dialog** — `.dialog input[type="text"]` with dark styling ✓
- **New Folder dialog** — Same ✓
- **Password dialog** — Explicit dark styling in `#password-dialog` section ✓
- **Settings dialog (legacy)** — `.dialog` base styling ✓
- **Obsidian Modal** — `.obsidian-modal` with dark bg ✓
- **Command Palette** — `.command-palette` dark styling ✓

### ✅ Context Menus
- **Right-click menu** — `.context-menu` dark bg ✓
- **Slash commands menu** — `.slash-menu` dark bg ✓
- **Obsidian Menu** — `.obsidian-menu` dark bg ✓

### ✅ Onboarding
- **All onboarding inputs** — `.ob-path-input input`, `.ob-password-fields input` dark styled ✓
- **Option cards** — `.ob-option-card` dark surface ✓

### ✅ Editor & Preview
- **Editor textarea** — Direct dark styling ✓
- **Search input** — `#search-input` dark styled ✓

### ✅ Other Elements
- **Obsidian API controls** — `.obsidian-text-input`, `.obsidian-dropdown`, `.obsidian-button` all dark ✓
- **Notices** — `.obsidian-notice` dark surface ✓
- **Status bar** — Dark bg ✓

## Summary
- **3 changes** in `style.css`
- **0 white/light elements** remaining
- All form controls, dialogs, modals, menus, and interactive elements confirmed dark-themed
