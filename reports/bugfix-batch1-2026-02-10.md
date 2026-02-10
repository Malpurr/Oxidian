# Bugfix Batch 1 — 2026-02-10

## BUG 1: Explorer zeigt "Vault is empty" obwohl Notes existieren
**Files:** `src/js/app.js`
**Root cause:** File tree cache not invalidated before `sidebar.refresh()` after note creation.
**Fix:** Added `this.invalidateFileTreeCache()` before `sidebar.refresh()` in `createNewNote()` and `navigateToNote()` (create branch). Ensures the sidebar gets fresh data from the backend.

## BUG 2: Tab dirty-dot sofort nach Erstellung
**Files:** `src/js/app.js`
**Root cause:** `editor.setContent()` inside `openFile()` triggers the input event handler → `markDirty()`, so `isDirty` becomes `true` immediately after creating a note.
**Fix:** Added explicit `this.isDirty = false` + `this.tabManager.markClean(name)` after `openFile()` in both `createNewNote()` and `navigateToNote()`.

## BUG 3: Status bar zeigt Werte ohne offenes File
**Files:** `src/js/app.js`
**Root cause:** `onAllTabsClosed()` didn't clear the status bar elements, so stale "1 min read · 0 words" remained visible.
**Fix:** Added `clearStatusBar()` method that sets word/char counts to empty and reading time to "No file open". Called from `onAllTabsClosed()`.

## BUG 4: Settings Checkbox-Werte werden falsch gelesen (alle Booleans → false)
**Files:** `src/js/settings.js`
**Root cause:** `updateSettingsFromForm()` used `FormData` as intermediary, which coerces booleans to strings via `.toString()`. The comparison `formData.get('x') === 'true'` is fragile across browsers.
**Fix:** Rewrote `updateSettingsFromForm()` to read directly from DOM using `el.checked` for checkboxes and `el.value` for other inputs via helper functions `getCheckbox()`, `getVal()`, `getNum()`. Eliminates the FormData string coercion entirely.

## BUG 5: Create-Button enabled bei leerem Input
**Files:** `src/js/app.js`
**Fix:**
- Added `input` event listener on `#new-note-name` that toggles `#btn-dialog-create.disabled` based on whether input is empty.
- `showNewNoteDialog()` now sets `createBtn.disabled = true` on open (since input starts empty).
