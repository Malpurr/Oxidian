// Oxidian — Accessibility & Keyboard Navigation Module

(function () {
  'use strict';

  // ===== Detect keyboard vs mouse user =====
  let usingKeyboard = false;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      usingKeyboard = true;
      document.body.classList.add('keyboard-nav');
      document.body.classList.remove('mouse-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    usingKeyboard = false;
    document.body.classList.add('mouse-nav');
    document.body.classList.remove('keyboard-nav');
  });

  // ===== Modal / Overlay Management =====
  const MODAL_IDS = [
    'command-palette-overlay',
    'quick-switcher-overlay',
    'settings-overlay',
  ];

  function getOpenModal() {
    for (const id of MODAL_IDS) {
      const el = document.getElementById(id);
      if (el && !el.hidden) return el;
    }
    return null;
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    // Return focus to previously focused element
    const prev = modal._previousFocus;
    if (prev && prev.focus) {
      prev.focus();
    }
  }

  function openModal(modal) {
    if (!modal) return;
    modal._previousFocus = document.activeElement;
    modal.hidden = false;
    modal.removeAttribute('aria-hidden');
    // Focus first input or first focusable
    const input = modal.querySelector('input, [tabindex="0"]');
    if (input) {
      requestAnimationFrame(() => input.focus());
    }
  }

  // ===== Focus Trap =====
  function trapFocus(modal, e) {
    const focusable = modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ===== Global Keyboard Shortcuts =====
  document.addEventListener('keydown', (e) => {
    const modal = getOpenModal();

    // Escape closes any open modal
    if (e.key === 'Escape') {
      if (modal) {
        e.preventDefault();
        e.stopPropagation();
        closeModal(modal);
        return;
      }
      // Also close sidebar on mobile
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('is-open')) {
        sidebar.classList.remove('is-open');
        document.querySelector('.sidebar-backdrop')?.classList.remove('is-visible');
        return;
      }
      // Close right panel
      const rightPanel = document.getElementById('right-panel');
      if (rightPanel && !rightPanel.hidden) {
        rightPanel.hidden = true;
        return;
      }
    }

    // Focus trap in modals
    if (e.key === 'Tab' && modal) {
      trapFocus(modal, e);
      return;
    }

    // Ctrl/Cmd+P — Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      const overlay = document.getElementById('command-palette-overlay');
      if (overlay) {
        if (overlay.hidden) {
          openModal(overlay);
        } else {
          closeModal(overlay);
        }
      }
      return;
    }

    // Ctrl/Cmd+O — Quick Switcher
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      const overlay = document.getElementById('quick-switcher-overlay');
      if (overlay) {
        if (overlay.hidden) {
          openModal(overlay);
        } else {
          closeModal(overlay);
        }
      }
      return;
    }

    // Ctrl/Cmd+, — Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      const overlay = document.getElementById('settings-overlay');
      if (overlay) {
        if (overlay.hidden) {
          openModal(overlay);
        } else {
          closeModal(overlay);
        }
      }
      return;
    }

    // Ctrl/Cmd+B — Toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
      return;
    }
  });

  // ===== Sidebar Toggle (mobile) =====
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (!sidebar) return;

    const isOpen = sidebar.classList.toggle('is-open');
    backdrop?.classList.toggle('is-visible', isOpen);

    if (isOpen) {
      const tree = document.getElementById('file-tree');
      if (tree) tree.focus();
    }
  }

  // Close sidebar on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target?.classList.contains('sidebar-backdrop')) {
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList.remove('is-open');
      e.target.classList.remove('is-visible');
    }
  });

  // Close modals on overlay click
  for (const id of MODAL_IDS) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    }
  }

  // ===== File Tree Arrow Key Navigation =====
  function setupFileTreeNavigation() {
    const tree = document.getElementById('file-tree');
    if (!tree) return;

    tree.addEventListener('keydown', (e) => {
      const items = Array.from(tree.querySelectorAll('.tree-item'));
      if (items.length === 0) return;

      // Find currently focused item
      const focused = document.activeElement?.closest('.tree-item');
      let idx = focused ? items.indexOf(focused) : -1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          idx = Math.min(idx + 1, items.length - 1);
          items[idx]?.focus();
          break;

        case 'ArrowUp':
          e.preventDefault();
          idx = Math.max(idx - 1, 0);
          items[idx]?.focus();
          break;

        case 'ArrowRight': {
          e.preventDefault();
          // Expand folder or move to first child
          if (focused) {
            const chevron = focused.querySelector('.chevron');
            const children = focused.nextElementSibling;
            if (children?.classList.contains('tree-folder-children') && !children.classList.contains('open')) {
              focused.click(); // expand
            } else if (children?.classList.contains('open')) {
              const firstChild = children.querySelector('.tree-item');
              firstChild?.focus();
            }
          }
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          // Collapse folder or move to parent
          if (focused) {
            const parent = focused.closest('.tree-folder-children');
            if (parent?.classList.contains('open')) {
              const parentItem = parent.previousElementSibling;
              if (parentItem?.classList.contains('tree-item')) {
                // If this is a folder and it's open, collapse it first
                const children = focused.nextElementSibling;
                if (children?.classList.contains('tree-folder-children') && children.classList.contains('open')) {
                  focused.click(); // collapse
                } else {
                  parentItem.focus();
                }
              }
            }
          }
          break;
        }

        case 'Enter':
        case ' ':
          e.preventDefault();
          focused?.click();
          break;

        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          break;

        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    });

    // Make tree items focusable
    const observer = new MutationObserver(() => {
      tree.querySelectorAll('.tree-item').forEach((item) => {
        if (!item.hasAttribute('tabindex')) {
          item.setAttribute('tabindex', '-1');
          item.setAttribute('role', 'treeitem');
        }
        // Mark folders with aria-expanded
        const children = item.nextElementSibling;
        if (children?.classList.contains('tree-folder-children')) {
          item.setAttribute('aria-expanded', children.classList.contains('open') ? 'true' : 'false');
        }
      });
    });

    observer.observe(tree, { childList: true, subtree: true });
    // Run once on init
    observer.takeRecords();
    tree.querySelectorAll('.tree-item').forEach((item) => {
      item.setAttribute('tabindex', '-1');
      item.setAttribute('role', 'treeitem');
      const children = item.nextElementSibling;
      if (children?.classList.contains('tree-folder-children')) {
        item.setAttribute('aria-expanded', children.classList.contains('open') ? 'true' : 'false');
      }
    });
  }

  // ===== Tab Bar Keyboard Navigation =====
  function setupTabNavigation() {
    const tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;

    tabBar.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabBar.querySelectorAll('[role="tab"]'));
      if (tabs.length === 0) return;

      const focused = document.activeElement;
      let idx = tabs.indexOf(focused);

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          idx = (idx + 1) % tabs.length;
          tabs[idx]?.focus();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          idx = (idx - 1 + tabs.length) % tabs.length;
          tabs[idx]?.focus();
          break;

        case 'Home':
          e.preventDefault();
          tabs[0]?.focus();
          break;

        case 'End':
          e.preventDefault();
          tabs[tabs.length - 1]?.focus();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          focused?.click();
          break;

        case 'Delete':
        case 'Backspace':
          // Close tab
          e.preventDefault();
          const closeBtn = focused?.querySelector('.tab-close');
          closeBtn?.click();
          break;
      }
    });
  }

  // ===== Listbox Navigation (Command Palette / Quick Switcher results) =====
  function setupListboxNavigation(inputId, listboxId) {
    const input = document.getElementById(inputId);
    const listbox = document.getElementById(listboxId);
    if (!input || !listbox) return;

    input.addEventListener('keydown', (e) => {
      const options = Array.from(listbox.querySelectorAll('[role="option"]'));
      if (options.length === 0) return;

      const active = listbox.querySelector('[aria-selected="true"]');
      let idx = active ? options.indexOf(active) : -1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (active) active.setAttribute('aria-selected', 'false');
          idx = Math.min(idx + 1, options.length - 1);
          options[idx]?.setAttribute('aria-selected', 'true');
          options[idx]?.scrollIntoView({ block: 'nearest' });
          input.setAttribute('aria-activedescendant', options[idx]?.id || '');
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (active) active.setAttribute('aria-selected', 'false');
          idx = Math.max(idx - 1, 0);
          options[idx]?.setAttribute('aria-selected', 'true');
          options[idx]?.scrollIntoView({ block: 'nearest' });
          input.setAttribute('aria-activedescendant', options[idx]?.id || '');
          break;

        case 'Enter':
          e.preventDefault();
          if (active) active.click();
          break;
      }
    });
  }

  // ===== Panel Cycling (F6 or Ctrl+`) =====
  const PANEL_ORDER = ['ribbon', 'sidebar', 'tab-bar', 'editor-container', 'right-panel', 'status-bar'];

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F6' || (e.ctrlKey && e.key === '`')) {
      if (getOpenModal()) return; // don't cycle when modal open

      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;

      // Find current panel
      let currentIdx = -1;
      for (let i = 0; i < PANEL_ORDER.length; i++) {
        const panel = document.getElementById(PANEL_ORDER[i]);
        if (panel?.contains(document.activeElement)) {
          currentIdx = i;
          break;
        }
      }

      // Find next visible panel
      for (let step = 1; step <= PANEL_ORDER.length; step++) {
        const nextIdx = (currentIdx + direction * step + PANEL_ORDER.length) % PANEL_ORDER.length;
        const panel = document.getElementById(PANEL_ORDER[nextIdx]);
        if (panel && !panel.hidden && panel.offsetParent !== null) {
          const focusTarget = panel.querySelector('[tabindex="0"], input, button, [role="treeitem"]') || panel;
          focusTarget.focus();
          break;
        }
      }
    }
  });

  // ===== Init =====
  function init() {
    setupFileTreeNavigation();
    setupTabNavigation();
    setupListboxNavigation('command-palette-input', 'command-palette-results');
    setupListboxNavigation('quick-switcher-input', 'quick-switcher-results');

    // Insert sidebar backdrop for mobile
    if (!document.querySelector('.sidebar-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.getElementById('app')?.prepend(backdrop);
    }

    // Wire hamburger / sidebar toggle button
    const filesBtn = document.getElementById('btn-files');
    if (filesBtn) {
      filesBtn.addEventListener('click', toggleSidebar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.OxidianA11y = { openModal, closeModal, toggleSidebar };
})();
