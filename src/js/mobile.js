/**
 * Oxidian Mobile Support v4.0 — Extreme Redesign
 * Splash screen, swipe gestures, app bar, welcome dashboard
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
    this.SWIPE_MAX_TIME = 300;

    this.detect();
    if (this.isTouch) {
      this.init();
    }
    // Splash screen runs for everyone
    this.initSplashScreen();
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
    this.initBackButton();
    this.ensureSidebarStartsClosed();
    this.initGlobalErrorHandler();
    this.initAppBar();
    this.initBottomNavPill();
    this.initSidebarCloseBtn();
    this.initWelcomeScreen();
    this.initReadingProgress();
    this.initScrollToTop();
  }

  // --- Splash Screen ---
  initSplashScreen() {
    // Auto-dismiss after 1500ms
    setTimeout(() => {
      document.body.classList.add('splash-done');
    }, 1500);
  }

  // --- App Bar ---
  initAppBar() {
    const appBar = document.getElementById('mobile-app-bar');
    const leftBtn = document.getElementById('appbar-left-btn');
    const editToggle = document.getElementById('appbar-edit-toggle');
    const moreBtn = document.getElementById('appbar-more');

    if (leftBtn) {
      leftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(5);
        this.openSidebar();
      });
    }

    if (editToggle) {
      editToggle.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(5);
        // Toggle view mode via app
        const btn = document.getElementById('btn-view-mode');
        if (btn) btn.click();
      });
    }

    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(5);
        const btn = document.getElementById('btn-more-options');
        if (btn) btn.click();
      });
    }
  }

  // Update app bar title when note changes
  updateAppBarTitle(title) {
    const titleEl = document.getElementById('appbar-title');
    const appBar = document.getElementById('mobile-app-bar');
    if (titleEl) {
      titleEl.textContent = title || 'Oxidian';
    }
    if (appBar) {
      appBar.classList.toggle('has-note', !!title);
    }
  }

  // --- Bottom Nav Pill ---
  initBottomNavPill() {
    const nav = document.getElementById('mobile-bottom-nav');
    const pill = document.getElementById('bottom-nav-pill');
    if (!nav || !pill) return;

    const updatePill = () => {
      const active = nav.querySelector('.mobile-ribbon-btn.active');
      if (!active) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = active.getBoundingClientRect();
      const x = btnRect.left - navRect.left + (btnRect.width - 64) / 2;
      pill.style.transform = `translateX(${x}px)`;
    };

    // Initial position
    requestAnimationFrame(updatePill);

    // Update on click (the existing click handler sets .active)
    nav.addEventListener('click', () => {
      requestAnimationFrame(() => requestAnimationFrame(updatePill));
    });
  }

  // --- Sidebar Close Button ---
  initSidebarCloseBtn() {
    const btn = document.getElementById('sidebar-close-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(5);
        this.closeSidebar();
      });
    }
  }

  // --- Welcome Screen ---
  initWelcomeScreen() {
    // Set greeting based on time
    const greetingEl = document.getElementById('welcome-greeting');
    if (greetingEl) {
      const h = new Date().getHours();
      let greeting;
      if (h < 5) greeting = 'Good night';
      else if (h < 12) greeting = 'Good morning';
      else if (h < 18) greeting = 'Good afternoon';
      else greeting = 'Good evening';
      greetingEl.textContent = greeting;
    }

    // Random note button
    const randomBtn = document.getElementById('btn-welcome-random');
    if (randomBtn) {
      randomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(10);
        if (window.app?.openRandomNote) window.app.openRandomNote();
      });
    }
  }

  // --- Reading Progress Bar ---
  initReadingProgress() {
    const bar = document.getElementById('reading-progress-bar');
    if (!bar) return;

    const update = () => {
      // Find the active scrollable area
      const reading = document.querySelector('.pane.reading-mode .reading-view');
      const editor = document.querySelector('.editor-textarea');
      const el = reading || editor;
      if (!el) { bar.style.width = '0%'; return; }

      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 0) { bar.style.width = '0%'; return; }
      const pct = Math.min(100, (scrollTop / scrollHeight) * 100);
      bar.style.width = pct + '%';
    };

    // Attach to scroll events on content area
    document.addEventListener('scroll', update, true);
    setInterval(update, 500); // fallback
  }

  // --- Scroll to Top (tap status bar area) ---
  initScrollToTop() {
    const appBar = document.getElementById('mobile-app-bar');
    if (!appBar) return;

    let tapCount = 0;
    let tapTimer = null;

    appBar.addEventListener('click', (e) => {
      // Only on title area (not buttons)
      if (e.target.closest('.appbar-btn')) return;
      
      tapCount++;
      if (tapCount === 2) {
        tapCount = 0;
        clearTimeout(tapTimer);
        // Scroll to top
        const reading = document.querySelector('.pane.reading-mode .reading-view');
        const editor = document.querySelector('.editor-textarea');
        const el = reading || editor;
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        tapTimer = setTimeout(() => { tapCount = 0; }, 300);
      }
    });
  }

  // --- Sidebar ---
  openSidebar() {
    document.body.classList.add('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) { sidebar.classList.remove('collapsed'); sidebar.classList.remove('hidden'); }
    if (this.isMobile && !this._sidebarHistoryPushed) {
      history.pushState({ sidebarOpen: true }, '');
      this._sidebarHistoryPushed = true;
    }
  }

  closeSidebar() {
    document.body.classList.remove('sidebar-mobile-open');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
    this._sidebarHistoryPushed = false;
  }

  ensureSidebarStartsClosed() {
    document.body.classList.remove('sidebar-mobile-open');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');
  }

  initSidebarAutoClose() {
    document.addEventListener('click', (e) => {
      const treeItem = e.target.closest('[data-path], .tree-item, .tree-item-name, .tree-item-inner');
      if (treeItem && document.body.classList.contains('sidebar-mobile-open')) {
        setTimeout(() => this.closeSidebar(), 150);
      }
    });
  }

  // --- Swipe Gestures (Enhanced) ---
  initSwipeGestures() {
    let tracking = false;
    let editorSwipe = false;
    const indicator = document.getElementById('swipe-edge-indicator');

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.swipeStartTime = Date.now();

      const isEdge = this.swipeStartX < this.EDGE_ZONE;
      const isSidebarOpen = document.body.classList.contains('sidebar-mobile-open');
      const isEditor = !!e.target.closest('#editor-area, #pane-container, .reading-view, .editor-textarea');

      tracking = isEdge || isSidebarOpen;
      editorSwipe = !isEdge && !isSidebarOpen && isEditor;

      if (isEdge && indicator) {
        indicator.classList.add('active');
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!tracking && !editorSwipe) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - this.swipeStartX;

      // Show edge indicator intensity
      if (tracking && indicator && this.swipeStartX < this.EDGE_ZONE && dx > 0) {
        const intensity = Math.min(1, dx / 100);
        indicator.style.opacity = intensity;
        indicator.style.width = (4 + intensity * 4) + 'px';
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      // Hide indicator
      if (indicator) {
        indicator.classList.remove('active');
        indicator.style.opacity = '';
        indicator.style.width = '';
      }

      if (!tracking && !editorSwipe) return;
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.swipeStartX;
      const dy = touch.clientY - this.swipeStartY;
      const dt = Date.now() - this.swipeStartTime;

      const isTracking = tracking;
      tracking = false;
      const isEditorSwipe = editorSwipe;
      editorSwipe = false;

      if (dt > this.SWIPE_MAX_TIME || Math.abs(dy) > Math.abs(dx)) return;

      if (isTracking) {
        if (dx > this.SWIPE_THRESHOLD && this.swipeStartX < this.EDGE_ZONE) {
          this.openSidebar();
        } else if (dx < -this.SWIPE_THRESHOLD && document.body.classList.contains('sidebar-mobile-open')) {
          this.closeSidebar();
        }
      } else if (isEditorSwipe) {
        // Navigate between notes
        if (dx < -this.SWIPE_THRESHOLD) {
          // Swipe left = forward
          const fwdBtn = document.getElementById('btn-nav-forward');
          if (fwdBtn && !fwdBtn.disabled) fwdBtn.click();
        } else if (dx > this.SWIPE_THRESHOLD) {
          // Swipe right = back
          const backBtn = document.getElementById('btn-nav-back');
          if (backBtn && !backBtn.disabled) backBtn.click();
        }
      }
    }, { passive: true });
  }

  // --- Back Button (Android) ---
  initBackButton() {
    this._sidebarHistoryPushed = false;
    window.addEventListener('popstate', () => {
      if (document.body.classList.contains('sidebar-mobile-open')) {
        this.closeSidebar();
      }
    });
  }

  // --- Global Error Handler ---
  initGlobalErrorHandler() {
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[Oxidian] Unhandled promise rejection:', e.reason);
    });
  }

  // --- Long Press ---
  initLongPress() {
    let longPressTouch = null;
    document.addEventListener('touchstart', (e) => {
      const fileItem = e.target.closest('.file-tree-item, .file-item, [data-path]');
      if (!fileItem) return;

      if (e.touches[0]) {
        longPressTouch = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      this.longPressTimer = setTimeout(() => {
        const fakeEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: longPressTouch?.clientX || 0,
          clientY: longPressTouch?.clientY || 0
        });
        fileItem.dispatchEvent(fakeEvent);
        if (navigator.vibrate) navigator.vibrate(50);
        longPressTouch = null;
      }, this.LONG_PRESS_DURATION);
    }, { passive: true });

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

        if (action === 'undo') {
          document.dispatchEvent(new CustomEvent('oxidian:editor-action', { detail: { action: 'undo' } }));
          document.execCommand('undo');
          return;
        }
        if (action === 'redo') {
          document.dispatchEvent(new CustomEvent('oxidian:editor-action', { detail: { action: 'redo' } }));
          document.execCommand('redo');
          return;
        }

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
      let _rafPending = false;

      const onResize = () => {
        if (_rafPending) return;
        _rafPending = true;
        requestAnimationFrame(() => {
          _rafPending = false;
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
        });
      };

      window.visualViewport.addEventListener('resize', onResize);
      window.visualViewport.addEventListener('scroll', onResize);

      window.addEventListener('orientationchange', () => {
        const updateHeight = () => {
          initialHeight = window.visualViewport.height;
          window.visualViewport.removeEventListener('resize', updateHeight);
        };
        window.visualViewport.addEventListener('resize', updateHeight);
        setTimeout(() => {
          window.visualViewport.removeEventListener('resize', updateHeight);
          initialHeight = window.visualViewport.height;
        }, 1000);
      });
    } else {
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
