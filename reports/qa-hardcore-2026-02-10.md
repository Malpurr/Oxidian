# QA Hardcore Bug Report — 2026-02-10

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH | 9 |
| MEDIUM | 10 |
| LOW | 6 |

---

## CRITICAL

### BUG-001: Canvas — Text/Nodes stick to mouse, cannot be dropped
**File:** `src/js/canvas.js` ~Line 290-310
**Description:** `mouseup` is only listened on the `<canvas>` element, but `mousemove` and the drag state are set when clicking on DOM node elements (`.canvas-node`). The node drag starts in `onNodeMouseDown()` (line 307) which sets `this.draggedNode`, but `mouseup` on the `<canvas>` element won't fire when the mouse is released **over a DOM node element** (which sits on top of the canvas in `.canvas-nodes`). The `onCanvasMouseUp` handler (line 297) only resets `this.draggedNode = null` — but it never fires because the mouse is over the node div, not the canvas.

Additionally, `mousemove` is only on the canvas element, so dragging won't even track correctly when the cursor moves over other DOM nodes.

**Fix:**
```js
// In bindEvents(), change canvas events to document-level or viewport-level:
const viewport = this.container.querySelector('.canvas-viewport');
viewport.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
viewport.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
// OR use document-level listeners:
document.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
document.addEventListener('mouseup', (e) => { this.draggedNode = null; });
```

### BUG-002: Canvas — No `mouseup` listener on node elements at all
**File:** `src/js/canvas.js` — `bindNodeEvents()` ~Line 275
**Description:** `bindNodeEvents` adds `mousedown` but never adds `mouseup`. Combined with BUG-001, once a drag starts, there is literally no code path that can reset `draggedNode` if the mouse is released over a node element.

**Fix:** Add `mouseup` to document in `bindEvents()` as shown in BUG-001 fix.

### BUG-003: remember-review.js — `window._reviewSession` used via inline `onclick` but never reliably set before first render
**File:** `src/js/remember-review.js` ~Line 178, 196, 213
**Description:** `_renderCard()` uses `onclick="window._reviewSession._showAnswer()"` in the HTML template, and `_renderRatingButtons()` uses `onclick="window._reviewSession._rate(${q.quality})"`. But `window._reviewSession` is only set in `startReviewSession()` (line 253), NOT in the `ReviewSession.start()` method. If `ReviewSession` is instantiated and `start()` is called directly (as the sidebar button does via `this.app.rememberReview.startReview(due)`), `window._reviewSession` is never set, causing `TypeError: Cannot read properties of null`.

**Fix:** Set `window._reviewSession = this;` at the beginning of `ReviewSession.start()`.

### BUG-004: remember-import.js — Uses `write_note` instead of `save_note`
**File:** `src/js/remember-import.js` ~Line 310, 330, 337
**Description:** The import module calls `invoke('write_note', ...)` but all other modules use `invoke('save_note', ...)`. If the Tauri backend only exposes `save_note`, all imports will fail silently or throw.

**Fix:** Replace all `invoke('write_note', ...)` with `invoke('save_note', ...)`.

---

## HIGH

### BUG-005: remember-review.js — SM-2 ease calculation incorrect for quality=0
**File:** `src/js/remember-review.js` ~Line 25-27
**Description:** SM-2 maps quality 0-3 (Again/Hard/Good/Easy), but the ease formula uses `(3 - quality)`:
```js
newEase = ease + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
```
For quality=0 (Again): `0.1 - 3*(0.08 + 3*0.02) = 0.1 - 3*0.14 = 0.1 - 0.42 = -0.32`. So ease drops by 0.32 every failure. For quality=1 (Hard): drop is -0.15. For quality=2 (Good): change is +0.0. For quality=3 (Easy): change is +0.1.

The **standard SM-2** uses quality 0-5, not 0-3. With this 0-3 mapping, "Good" (quality=2) gives **zero ease change**, which means ease never increases for "Good" ratings. Over time, ease will only decrease (on fails) and the `1.3` floor will be hit quickly. Cards will become permanently hard.

**Fix:** Remap quality to SM-2 scale: Again=0→0, Hard=1→2, Good=2→3, Easy=3→5. Or adjust the formula coefficients for a 0-3 scale.

### BUG-006: remember.js — Sidebar panel never becomes visible
**File:** `src/js/remember.js` ~Line 47-52
**Description:** `switchSidebarPanel('remember')` is called but there's no guarantee the app's `switchSidebarPanel` method knows about `panel-remember`. The panel is injected into `.sidebar-panels` or `#sidebar`, but `switchSidebarPanel` likely toggles visibility based on known panel IDs. The panel will remain `display: none` unless the app's panel switcher is aware of it.

Also: The panel has `class="sidebar-panel"` but no `style="display:none"` — it might always be visible, overlapping other panels.

**Fix:** Either register the panel with `this.app.registerSidebarPanel('remember')` or manually handle visibility in the click handler:
```js
document.querySelectorAll('.sidebar-panel').forEach(p => p.style.display = 'none');
document.getElementById('panel-remember').style.display = '';
```

### BUG-007: remember-review.js — `startReview` not exported as expected by remember.js
**File:** `src/js/remember-review.js` / `src/js/remember.js` ~Line 161
**Description:** `remember.js` calls `this.app.rememberReview?.startReview(due)`, expecting a `startReview` method. But `remember-review.js` exports `startReviewSession` (a standalone async function), not a class with a `startReview` method. The module's default export `RememberReview` is a plain object `{ sm2, getDueCards, startReviewSession, ... }`. There is no `startReview` property — the call will always fail.

**Fix:** Either rename `startReviewSession` to `startReview` in the export, or update the call site to use `this.app.rememberReview?.startReviewSession?.(this.app)`.

### BUG-008: Canvas — `resizeCanvas` applies DPR scale on every call without resetting
**File:** `src/js/canvas.js` ~Line 135-144
**Description:** `this.ctx.scale(dpr, dpr)` is called every time `resizeCanvas()` fires. But `ctx.scale()` is cumulative — it multiplies onto the existing transform matrix. On window resize events, the scale will compound: `dpr^2`, `dpr^3`, etc., causing rendering to blow up or shrink to nothing.

**Fix:** Reset the transform before scaling:
```js
this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

### BUG-009: Canvas — Render loop runs permanently even when canvas is not visible
**File:** `src/js/canvas.js` ~Line 147-153
**Description:** `startRenderLoop()` creates an infinite `requestAnimationFrame` loop. There's a `stopRenderLoop()` method but nothing calls it except `destroy()`. If the user navigates away from the canvas view without destroying it, this loop runs forever — a continuous performance drain/memory leak.

**Fix:** Stop the render loop when the canvas container is hidden or removed from the DOM. Use `IntersectionObserver` or call `stopRenderLoop()` from the parent's navigation logic.

### BUG-010: remember-stats.js — Uses `window.__TAURI__.fs` directly instead of invoke
**File:** `src/js/remember-stats.js` ~Line 24-37
**Description:** All other modules use `invoke('read_note', ...)` / `invoke('save_note', ...)`. But `remember-stats.js` uses `window.__TAURI__.fs.readTextFile/writeTextFile/exists/mkdir` directly with `baseDir: 11`. This is a different API surface that may not be available (Tauri v2 plugin-fs must be explicitly included), and the `baseDir: 11` magic number (AppData) points to a completely different location than the vault.

**Fix:** Use `invoke` calls consistent with other modules, or store stats inside the vault (e.g., `.oxidian/remember-stats.json` relative to vault root via `invoke('save_note', ...)`).

### BUG-011: remember-extract.js — `_showBulkItemDialog` has broken async flow
**File:** `src/js/remember-extract.js` ~Line 228-248
**Description:** `_showBulkItemDialog` calls `this._showExtractDialog(backText, {}).then?.(() => {})` but `_showExtractDialog` is `async` and doesn't return a meaningful value — it just creates DOM. The `MutationObserver` approach to detect overlay removal is fragile and will break if the overlay ID changes or if two dialogs are opened.

Also: `_showExtractDialog` is called with `opts = {}` but the function signature expects `(backText, opts = {})` and uses `opts.tags` — this works but the source link is not passed through, so the subsequent `requestAnimationFrame` hack to set the source input is a race condition.

**Fix:** Refactor `_showExtractDialog` to return a Promise that resolves on save/cancel. Remove the `MutationObserver` hack.

### BUG-012: Canvas — `isConnecting` state never gets reset
**File:** `src/js/canvas.js` ~Line 350-353
**Description:** `startConnection()` sets `this.isConnecting = true`, but there is no code anywhere that sets it back to `false` or completes the connection. The connection preview line will draw forever. There's no click handler to finish the connection on another node, and no Escape handler to cancel it.

**Fix:** Add connection completion logic in `onCanvasMouseUp` (check if mouse is over a node) and add Escape key handling to cancel. Reset `isConnecting = false` in both cases.

### BUG-013: Canvas — `drawConnectionPreview` calls `getMousePosition()` without event
**File:** `src/js/canvas.js` ~Line 202
**Description:** `drawConnectionPreview()` calls `this.getMousePosition()` with no argument. Without an event, `getMousePosition()` returns the hardcoded fallback `{ x: 400, y: 300 }`. The connection preview line will always point to (400, 300) instead of following the mouse.

**Fix:** Track the last known mouse position in `onCanvasMouseMove` and use it in `drawConnectionPreview`:
```js
this._lastMousePos = this.getMousePosition(e); // in onCanvasMouseMove
```

---

## MEDIUM

### BUG-014: remember.js — Race condition in constructor
**File:** `src/js/remember.js` ~Line 8-12
**Description:** `init()` is called in the constructor and is async. `loadAll()` runs before the constructor returns. Any code that does `const r = new Remember(app); r.getCards()` will get an empty array because loading hasn't finished yet. The `loaded` flag exists but nothing awaits it.

**Fix:** Don't call `init()` in constructor. Have the caller do `const r = new Remember(app); await r.init();`.

### BUG-015: remember.js — `refreshDashboard` always calls `loadAll()` twice
**File:** `src/js/remember.js` ~Line 139-140
**Description:**
```js
if (!this.loaded) await this.loadAll();
else await this.loadAll(); // Always refresh on panel open
```
Both branches do the same thing. The comment says "always refresh" but the if/else is pointless code.

**Fix:** Just call `await this.loadAll()` directly.

### BUG-016: remember-review.js — `parseFrontmatter` regex won't match `\r\n` line endings
**File:** `src/js/remember-review.js` ~Line 45
**Description:** The regex `^---\n([\s\S]*?)\n---\n?([\s\S]*)$` uses literal `\n`. Files with Windows line endings (`\r\n`) won't match, returning the entire content as body with empty frontmatter. Cards won't be recognized as type=card.

**Fix:** Use `\r?\n` or normalize line endings first: `content = content.replace(/\r\n/g, '\n')`.

### BUG-017: remember-cards.js — `parseFrontmatter` converts numeric strings including dates
**File:** `src/js/remember-cards.js` ~Line 35-36
**Description:** `if (!isNaN(val) && val !== null && val !== '') val = Number(val);` — But date strings like `2026-02-10` pass `isNaN()` test (returns `true`, so they're NOT converted). However, the `null` string check `if (val === 'null') val = null;` happens before the number check, so `review_count: 0` becomes `0` (number) which is falsy. When used as `card.frontmatter.review_count || 0` in remember-review.js, a card with 0 reviews stays at 0 — OK, but `interval: 0` becomes falsy and `card.frontmatter.interval || 0` works by accident.

Actually the real issue: `ease: 2.5` is correctly parsed as number, but `next_review: 2026-02-10` — `Number("2026-02-10")` is NaN, so it stays string. This is correct by accident. But `rating: 0` → Number(0) → falsy, could cause bugs downstream.

**Severity note:** Marking MEDIUM because it works by accident for the common cases.

**Fix:** Be explicit about which fields are numeric instead of auto-converting.

### BUG-018: remember-connections.js — O(n²) comparison in `getConnectionStats` and `discoverCrossSourceConnections`
**File:** `src/js/remember-connections.js` ~Line 190-200, 155-175
**Description:** `getConnectionStats` iterates all cards × all cards for tag comparison. With 1000 cards, that's 500K+ comparisons per call. `discoverCrossSourceConnections` also does source×source×cards×cards. For a large vault this will freeze the UI.

**Fix:** Pre-build a tag→cards index for O(n) lookups instead of O(n²) brute force.

### BUG-019: remember-extract.js — Context menu completely replaces original
**File:** `src/js/remember-extract.js` ~Line 35-70
**Description:** `_patchEditorContextMenu` saves `origShow` but never calls it — the original context menu is completely replaced with a hardcoded set of items. Any other modules that add context menu items will be lost.

**Fix:** Call `origShow(e, textarea)` and then append the extract items, or use the app's context menu extension API if available.

### BUG-020: remember-dashboard.js — Destroys left-pane and graph on every show()
**File:** `src/js/remember-dashboard.js` ~Line 115-130
**Description:** `_getContentArea()` removes `#left-pane`, destroys `graphView`, and clears `paneContainer.innerHTML`. This is destructive — if the user had an unsaved file open in a tab, the editor DOM is gone. The `isDirty` check only saves the *current* file, not all dirty tabs.

**Fix:** Use a non-destructive approach — hide existing panes and show the dashboard, or use the tab system to open the dashboard as a tab.

### BUG-021: remember-review.js — `_savedContent` restored via innerHTML destroys event listeners
**File:** `src/js/remember-review.js` ~Line 233-239
**Description:** `close()` restores `contentArea.innerHTML = this._savedContent`. But `_savedContent` was captured as `contentArea.innerHTML` (a string). Restoring it destroys all event listeners that were bound to the original DOM elements. The editor, tabs, and any interactive elements will be dead.

**Fix:** Save and restore DOM nodes instead of innerHTML, or navigate back to the previous view through the app's routing system.

### BUG-022: remember-sources.js — `parseSource` regex too strict
**File:** `src/js/remember-sources.js` ~Line 90
**Description:** `line.match(/^(\w+):\s*(.+)$/)` requires `\w+` for keys. YAML keys with hyphens (e.g., `source_type`) work because `_` matches `\w`, but keys like `last-review` won't match. Also, it requires at least one character after `:`, so empty values like `finished:` (without value) will be skipped entirely.

**Fix:** Use a more permissive regex: `/^([\w-]+):\s*(.*)$/`.

### BUG-023: remember-extract.js — `_showExtractDialog` calls `invoke('get_tags')` which may not exist
**File:** `src/js/remember-extract.js` ~Line 100
**Description:** `await invoke('get_tags')` — no other module references this command. If the Tauri backend doesn't expose `get_tags`, this will throw. The try/catch catches it, but the UX is degraded (no tag autocomplete) silently.

**Fix:** Fall back to extracting tags from loaded cards' frontmatter instead of relying on a potentially missing backend command.

---

## LOW

### BUG-024: Canvas — `escapeHtml` via DOM in tight render loop
**File:** `src/js/canvas.js` ~Line 376-379
**Description:** `escapeHtml` creates a DOM element on every call. In `createNodeElement` this is fine, but if used in the render loop it would be a performance issue. Currently it's only used in node creation, so LOW severity.

**Fix:** Use string replacement: `text.replace(/&/g,'&amp;').replace(/</g,'&lt;')...`

### BUG-025: remember.js — `escapeHtml` via DOM creates unnecessary garbage
**File:** `src/js/remember.js` ~Line 211-214
**Description:** Same pattern as BUG-024. Creates a `div` element per call for HTML escaping. Works correctly but creates GC pressure during dashboard rendering.

**Fix:** Use string-based escaping.

### BUG-026: remember-stats.js — Heatmap date alignment may be off by one
**File:** `src/js/remember-stats.js` ~Line 153-157
**Description:** `startDate.setDate(startDate.getDate() - (52 * 7 - 1) - startDate.getDay())` subtracts `getDay()` which is the day of the week (0=Sunday). But the `endDate` is never adjusted. The grid might have empty cells at the end or miss today's cell depending on the day of the week.

**Fix:** Verify grid alignment with explicit tests; ensure today is always the last cell.

### BUG-027: remember-import.js — `_showResult` timeout never cleared
**File:** `src/js/remember-import.js` ~Line 344-349
**Description:** `setTimeout(() => { el.style.display = 'none'; }, 5000)` — if `_showResult` is called multiple times rapidly, old timeouts will still fire and hide the current message prematurely.

**Fix:** Store the timeout ID and clear it before setting a new one.

### BUG-028: remember-review.js — `renderMarkdownSimple` applies escaping before markdown parsing
**File:** `src/js/remember-review.js` ~Line 221-227
**Description:** `escapeHtml(text)` is called first, then regex-based markdown parsing runs on the escaped text. This means `**bold**` becomes `**bold**` in HTML, and then the regex replaces it correctly. This works by coincidence, but `<code>` content inside backticks could produce double-escaped entities: `&amp;amp;` etc.

**Fix:** Parse markdown first, then escape only non-markup text.

### BUG-029: remember-sources.js — Form overlay click handler fires twice
**File:** `src/js/remember-sources.js` ~Line 245, 260
**Description:** `bindFormEvents` adds a click handler to the overlay for save/cancel buttons. `bindMainEvents` also delegates clicks on the same wrapper. The form overlay is inside the wrapper, so clicks on form buttons may trigger both handlers. The `data-action="cancel"` from the form could potentially conflict.

**Fix:** Use `e.stopPropagation()` in `bindFormEvents` or use different action names.

---

## Architecture Notes (Not Bugs, But Risks)

1. **No module coordination:** Each `remember-*.js` file has its own `parseFrontmatter` implementation with slightly different behavior (number coercion, array parsing, quote handling). This will cause subtle data inconsistencies.

2. **Event listener cleanup:** `remember.js` and `remember-dashboard.js` add event listeners to dynamically created elements but never track or remove them. Since elements are replaced on refresh (via `innerHTML = ''`), old listeners are GC'd with the DOM nodes — this is OK, but `document`-level listeners (keyboard shortcuts in `remember-extract.js`, `canvas.js`) need explicit cleanup.

3. **No mutex/lock on file writes:** Multiple modules can call `invoke('save_note', ...)` on the same file concurrently (e.g., review + auto-save). Last write wins with no merge.
