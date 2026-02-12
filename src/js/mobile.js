/**
 * Oxidian Mobile Touch Interactions
 * Handles touch gestures, mobile detection, and adaptive UI for Android/mobile
 */

export class MobileSupport {
  constructor(app) {
    this.app = app;
    this.isMobile = false;
    this.isTouch = false;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeStartTime = 0;
    this.longPressTimer = null;
    this.SWIPE_THRESHOLD = 50;
    this.EDGE_ZONE = 30; // px from left edge for swipe-to-open
    this.LONG_PRESS_DURATION = 500;

    this.detect();
    if (this.isTouch) {
      this.init();
    }
  }

  detect() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobile = this.isTouch && window.innerWidth < 768;

    if (this.isTouch) {
      document.body.classList.add('is-touch');
    }
    if (this.isMobile) {
      document.body.classList.add('is-mobile');
    }

    // Re-evaluate on resize (orientation change)
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = this.isTouch && window.innerWidth < 768;
      document.body.classList.toggle('is-mobile', this.isMobile);
      
      // Close sidebar on orientation change to desktop
      if (wasMobile && !this.isMobile) {
        document.body.classList.remove('sidebar-mobile-open');
      }
    });
  }

  init() {
    this.initSwipeGestures();
    this.initLongPress();
    this.disableHoverOnTouch();
    this.initMobileRibbon();
    this.preventDoubleTapZoom();
    this.initFloatingEditorToolbar();
    this.initKeyboardDetection();
    this.initSidebarAutoClose();
    this.ensureSidebarStartsClosed();
  }

  // Close sidebar when a file/note is tapped
  initSidebarAutoClose() {
    document.addEventListener('click', (e) => {
      const treeItem = e.target.closest('.tree-item, .tree-item-name, .tree-item-inner');
      if (treeItem && document.body.classList.contains('sidebar-mobile-open')) {
        setTimeout(() => this.closeSidebar(), 150);
      }
    });
  }

  // Ensure sidebar starts closed on mobile
  ensureSidebarStartsClosed() {
    document.body.classList.remove('sidebar-mobile-open');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('collapsed');
    }
  }

  // === Swipe Gestures ===
  initSwipeGestures() {
    let tracking = false;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeStartTime = Date.now();
      
      // Only track swipes from edge zone or when sidebar is open
      tracking = this.swipeStartX < this.EDGE_ZONE || 
                 document.body.classList.contains('sidebar-mobile-open');
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!tracking || e.changedTouches.length !== 1) return;
      tracking = false;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.swipeStartX;
      const dy = touch.clientY - this.swipeStartY;
      const dt = Date.now() - this.swipeStartTime;

      // Must be fast and horizontal
      if (dt > 300 || Math.abs(dy) > Math.abs(dx)) return;

      if (dx > this.SWIPE_THRESHOLD && this.swipeStartX < this.EDGE_ZONE) {
        this.openSidebar();
      } else if (dx < -this.SWIPE_THRESHOLD && document.body.classList.contains('sidebar-mobile-open')) {
        this.closeSidebar();
      }
    }, { passive: true });
  }

  openSidebar() {
    document.body.classList.add('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'true');
    }
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
  }

  closeSidebar() {
    document.body.classList.remove('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
  }

  // === Long Press for Context Menu ===
  initLongPress() {
    document.addEventListener('touchstart', (e) => {
      const fileItem = e.target.closest('.file-tree-item, .file-item, [data-path]');
      if (!fileItem) return;

      this.longPressTimer = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        
        // Trigger context menu via app
        if (this.app && this.app.contextMenu) {
          const path = fileItem.dataset.path || fileItem.getAttribute('data-path');
          if (path) {
            // Simulate right-click event for context menu
            const fakeEvent = new MouseEvent('contextmenu', {
              bubbles: true,
              clientX: touch.clientX,
              clientY: touch.clientY
            });
            fileItem.dispatchEvent(fakeEvent);
          }
        }
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, this.LONG_PRESS_DURATION);
    }, { passive: false });

    // Cancel long press on move or end
    const cancelLongPress = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    document.addEventListener('touchmove', cancelLongPress, { passive: true });
    document.addEventListener('touchend', cancelLongPress, { passive: true });
    document.addEventListener('touchcancel', cancelLongPress, { passive: true });
  }

  // === Disable Hover-Only Interactions ===
  disableHoverOnTouch() {
    // The .is-touch class on body lets CSS handle this via:
    // .is-touch .hover-only { display: none; }
    // No JS hover simulation needed — CSS handles it
  }

  // === Mobile Bottom Ribbon ===
  initMobileRibbon() {
    if (!this.isMobile) return;

    // Create bottom ribbon for mobile (most-used actions)
    const ribbon = document.createElement('nav');
    ribbon.id = 'mobile-ribbon';
    ribbon.className = 'mobile-ribbon';
    ribbon.setAttribute('role', 'navigation');
    ribbon.setAttribute('aria-label', 'Quick actions');

    const actions = [
      { icon: '📁', action: 'explorer', label: 'Files' },
      { icon: '🔍', action: 'search', label: 'Search' },
      { icon: '📝', action: 'new-note', label: 'New' },
      { icon: '📅', action: 'daily', label: 'Daily' },
      { icon: '⚙️', action: 'settings', label: 'Settings' },
    ];

    actions.forEach(({ icon, action, label }) => {
      const btn = document.createElement('button');
      btn.className = 'mobile-ribbon-btn';
      btn.dataset.action = action;
      btn.setAttribute('aria-label', label);
      btn.innerHTML = `<span class="mobile-ribbon-icon">${icon}</span><span class="mobile-ribbon-label">${label}</span>`;
      btn.addEventListener('click', () => this.handleMobileRibbonAction(action));
      ribbon.appendChild(btn);
    });

    document.body.appendChild(ribbon);
  }

  handleMobileRibbonAction(action) {
    switch (action) {
      case 'explorer':
        this.openSidebar();
        if (this.app.switchSidebarPanel) this.app.switchSidebarPanel('explorer');
        break;
      case 'search':
        this.openSidebar();
        if (this.app.switchSidebarPanel) this.app.switchSidebarPanel('search');
        break;
      case 'new-note':
        if (this.app.showNewNoteDialog) this.app.showNewNoteDialog();
        break;
      case 'daily':
        if (this.app.openDailyNote) this.app.openDailyNote();
        break;
      case 'settings':
        if (this.app.openSettingsPage) this.app.openSettingsPage();
        break;
    }
  }

  // === Prevent double-tap zoom on buttons ===
  preventDoubleTapZoom() {
    let lastTapTime = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTapTime < 300 && e.target.closest('button, .btn, .icon-btn, .ribbon-btn')) {
        e.preventDefault();
      }
      lastTapTime = now;
    }, { passive: false });
  }

  // === Floating Markdown Editor Toolbar ===
  initFloatingEditorToolbar() {
    if (!this.isMobile) return;

    // Create toolbar element
    this.editorToolbar = document.createElement('div');
    this.editorToolbar.className = 'mobile-editor-toolbar';
    this.editorToolbar.setAttribute('role', 'toolbar');
    this.editorToolbar.setAttribute('aria-label', 'Markdown formatting');

    const actions = [
      { label: 'Bold', icon: 'B', insert: '**', wrap: true },
      { label: 'Italic', icon: 'I', insert: '_', wrap: true, style: 'font-style:italic' },
      { label: 'Heading', icon: 'H', insert: '# ', wrap: false },
      { label: 'sep' },
      { label: 'Link', icon: '🔗', insert: '[](url)', wrap: false },
      { label: 'Code', icon: '`', insert: '`', wrap: true, style: 'font-family:monospace' },
      { label: 'List', icon: '•', insert: '- ', wrap: false },
      { label: 'Task', icon: '☐', insert: '- [ ] ', wrap: false },
      { label: 'sep' },
      { label: 'Quote', icon: '❝', insert: '> ', wrap: false },
      { label: 'Strikethrough', icon: 'S̶', insert: '~~', wrap: true },
      { label: 'sep' },
      { label: 'Tab', icon: '⇥', insert: '\t', wrap: false },
      { label: 'Undo', icon: '↩', action: 'undo' },
      { label: 'Redo', icon: '↪', action: 'redo' },
    ];

    actions.forEach(({ label, icon, insert, wrap, style, action }) => {
      if (label === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'toolbar-separator';
        this.editorToolbar.appendChild(sep);
        return;
      }

      const btn = document.createElement('button');
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.textContent = icon;
      if (style) btn.style.cssText = style;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(5);

        if (action === 'undo') {
          document.execCommand('undo');
          return;
        }
        if (action === 'redo') {
          document.execCommand('redo');
          return;
        }

        // Find active textarea
        const textarea = document.querySelector('.editor-textarea:focus, .editor-textarea');
        if (!textarea) return;
        textarea.focus();

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        if (wrap && selected) {
          // Wrap selection
          const newText = insert + selected + insert;
          textarea.setRangeText(newText, start, end, 'select');
        } else if (wrap && !selected) {
          // Insert pair and place cursor inside
          textarea.setRangeText(insert + insert, start, end, 'end');
          textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        } else {
          // Insert at cursor (line-level commands like # or -)
          textarea.setRangeText(insert, start, end, 'end');
        }

        // Trigger input event for app to pick up changes
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });

      this.editorToolbar.appendChild(btn);
    });

    document.body.appendChild(this.editorToolbar);
  }

  // === Keyboard Detection ===
  // Show/hide floating toolbar when virtual keyboard opens/closes
  initKeyboardDetection() {
    if (!this.isMobile) return;

    // Use visualViewport API for reliable keyboard detection
    if (window.visualViewport) {
      let initialHeight = window.visualViewport.height;
      const KEYBOARD_THRESHOLD = 150; // pixels

      const onResize = () => {
        const currentHeight = window.visualViewport.height;
        const diff = initialHeight - currentHeight;
        const keyboardOpen = diff > KEYBOARD_THRESHOLD;
        const activeEl = document.activeElement;
        const isEditorFocused = activeEl && (
          activeEl.classList.contains('editor-textarea') ||
          activeEl.closest('.editor-pane-half')
        );

        if (this.editorToolbar) {
          if (keyboardOpen && isEditorFocused) {
            // Position toolbar just above keyboard
            this.editorToolbar.style.bottom = `${diff}px`;
            this.editorToolbar.classList.add('visible');
            // Hide bottom nav when keyboard is open
            const bottomNav = document.getElementById('mobile-bottom-nav');
            if (bottomNav) bottomNav.style.display = 'none';
          } else {
            this.editorToolbar.classList.remove('visible');
            const bottomNav = document.getElementById('mobile-bottom-nav');
            if (bottomNav) bottomNav.style.display = '';
          }
        }
      };

      window.visualViewport.addEventListener('resize', onResize);
      window.visualViewport.addEventListener('scroll', onResize);

      // Update initial height on orientation change
      window.addEventListener('orientationchange', () => {
        setTimeout(() => { initialHeight = window.visualViewport.height; }, 500);
      });
    } else {
      // Fallback: listen for focus/blur on textareas
      document.addEventListener('focusin', (e) => {
        if (e.target.classList?.contains('editor-textarea')) {
          if (this.editorToolbar) {
            this.editorToolbar.classList.add('visible');
          }
        }
      });
      document.addEventListener('focusout', (e) => {
        if (e.target.classList?.contains('editor-textarea')) {
          setTimeout(() => {
            if (this.editorToolbar && !document.activeElement?.classList?.contains('editor-textarea')) {
              this.editorToolbar.classList.remove('visible');
            }
          }, 200);
        }
      });
    }
  }
}
