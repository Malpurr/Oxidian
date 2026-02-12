/**
 * Oxidian Mobile Support v3.1
 * Clean rewrite — no duplicate bottom nav, sidebar = full-screen overlay
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
    this.editorToolbar = null;
    this.SWIPE_THRESHOLD = 50;
    this.EDGE_ZONE = 30;
    this.LONG_PRESS_DURATION = 500;

    this.detect();
    if (this.isTouch) {
      this.init();
    }
  }

  detect() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.isMobile = this.isTouch && window.innerWidth < 768;

    if (this.isTouch) document.body.classList.add('is-touch');
    if (this.isMobile) document.body.classList.add('is-mobile');

    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = this.isTouch && window.innerWidth < 768;
      document.body.classList.toggle('is-mobile', this.isMobile);
      if (wasMobile && !this.isMobile) this.closeSidebar();
    });
  }

  init() {
    this.initSwipeGestures();
    this.initLongPress();
    this.preventDoubleTapZoom();
    this.initFloatingEditorToolbar();
    this.initKeyboardDetection();
    this.initSidebarAutoClose();
    this.ensureSidebarStartsClosed();
    // NOTE: We do NOT call initMobileRibbon() — the static HTML #mobile-bottom-nav
    // is the single source of truth. No JS-created duplicate.
  }

  // --- Sidebar ---
  openSidebar() {
    document.body.classList.add('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
    // Remove collapsed so CSS transition works
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('collapsed');
  }

  closeSidebar() {
    document.body.classList.remove('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
  }

  ensureSidebarStartsClosed() {
    document.body.classList.remove('sidebar-mobile-open');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
  }

  // Auto-close sidebar when a file is tapped
  initSidebarAutoClose() {
    document.addEventListener('click', (e) => {
      const treeItem = e.target.closest('.tree-item, .tree-item-name, .tree-item-inner');
      if (treeItem && document.body.classList.contains('sidebar-mobile-open')) {
        setTimeout(() => this.closeSidebar(), 150);
      }
    });
  }

  // --- Swipe Gestures ---
  initSwipeGestures() {
    let tracking = false;

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeStartTime = Date.now();
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

      if (dt > 300 || Math.abs(dy) > Math.abs(dx)) return;

      if (dx > this.SWIPE_THRESHOLD && this.swipeStartX < this.EDGE_ZONE) {
        this.openSidebar();
      } else if (dx < -this.SWIPE_THRESHOLD && document.body.classList.contains('sidebar-mobile-open')) {
        this.closeSidebar();
      }
    }, { passive: true });
  }

  // --- Long Press ---
  initLongPress() {
    document.addEventListener('touchstart', (e) => {
      const fileItem = e.target.closest('.file-tree-item, .file-item, [data-path]');
      if (!fileItem) return;

      this.longPressTimer = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        const fakeEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        fileItem.dispatchEvent(fakeEvent);
        if (navigator.vibrate) navigator.vibrate(50);
      }, this.LONG_PRESS_DURATION);
    }, { passive: false });

    const cancel = () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };
    document.addEventListener('touchmove', cancel, { passive: true });
    document.addEventListener('touchend', cancel, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
  }

  // --- Double Tap Zoom Prevention ---
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

  // --- Floating Editor Toolbar ---
  initFloatingEditorToolbar() {
    if (!this.isMobile) return;

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

        if (action === 'undo') { document.execCommand('undo'); return; }
        if (action === 'redo') { document.execCommand('redo'); return; }

        const textarea = document.querySelector('.editor-textarea:focus, .editor-textarea');
        if (!textarea) return;
        textarea.focus();

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);

        if (wrap && selected) {
          textarea.setRangeText(insert + selected + insert, start, end, 'select');
        } else if (wrap) {
          textarea.setRangeText(insert + insert, start, end, 'end');
          textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        } else {
          textarea.setRangeText(insert, start, end, 'end');
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });

      this.editorToolbar.appendChild(btn);
    });

    document.body.appendChild(this.editorToolbar);
  }

  // --- Keyboard Detection ---
  initKeyboardDetection() {
    if (!this.isMobile) return;

    if (window.visualViewport) {
      let initialHeight = window.visualViewport.height;
      const KEYBOARD_THRESHOLD = 150;

      const onResize = () => {
        const diff = initialHeight - window.visualViewport.height;
        const keyboardOpen = diff > KEYBOARD_THRESHOLD;
        const activeEl = document.activeElement;
        const isEditorFocused = activeEl && (
          activeEl.classList.contains('editor-textarea') ||
          activeEl.closest('.editor-pane-half, .cm-editor')
        );

        if (this.editorToolbar) {
          if (keyboardOpen && isEditorFocused) {
            this.editorToolbar.style.bottom = `${diff}px`;
            this.editorToolbar.classList.add('visible');
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

      window.addEventListener('orientationchange', () => {
        setTimeout(() => { initialHeight = window.visualViewport.height; }, 500);
      });
    } else {
      // Fallback
      document.addEventListener('focusin', (e) => {
        if (e.target.classList?.contains('editor-textarea') || e.target.closest?.('.cm-editor')) {
          if (this.editorToolbar) this.editorToolbar.classList.add('visible');
        }
      });
      document.addEventListener('focusout', (e) => {
        if (e.target.classList?.contains('editor-textarea') || e.target.closest?.('.cm-editor')) {
          setTimeout(() => {
            const ae = document.activeElement;
            if (this.editorToolbar && !ae?.classList?.contains('editor-textarea') && !ae?.closest?.('.cm-editor')) {
              this.editorToolbar.classList.remove('visible');
            }
          }, 200);
        }
      });
    }
  }
}
