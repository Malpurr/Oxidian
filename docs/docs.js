// Oxidian Documentation — Shared JavaScript

(function() {
  'use strict';

  // ===== Copy button for code blocks =====
  document.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    const btn = wrapper.querySelector('.copy-btn');
    const code = wrapper.querySelector('pre code');
    if (!btn || !code) return;

    btn.addEventListener('click', () => {
      const text = code.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });

  // ===== Mobile sidebar toggle =====
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.docs-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('visible');
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('visible');
      });
    }
  }

  // ===== Active sidebar link highlight =====
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ===== Scroll spy for section headings =====
  const headings = document.querySelectorAll('.docs-article h2[id], .docs-article h3[id]');
  const sublinks = document.querySelectorAll('.sidebar-sublink');

  if (headings.length > 0 && sublinks.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sublinks.forEach(l => l.classList.remove('active'));
          const match = document.querySelector(`.sidebar-sublink[href="#${entry.target.id}"]`);
          if (match) match.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    headings.forEach(h => observer.observe(h));
  }

  // ===== Documentation Search =====
  const searchInput = document.querySelector('.topnav-search input');
  const searchResults = document.querySelector('.search-results-dropdown');

  // Search index — built from data attributes on the page
  const searchIndex = [];

  // Gather all searchable sections from the current page
  document.querySelectorAll('.docs-article h2[id], .docs-article h3[id]').forEach(h => {
    const id = h.id;
    const text = h.textContent.replace(/#/g, '').trim();
    // Get next sibling text content as context
    let context = '';
    let el = h.nextElementSibling;
    while (el && !el.matches('h2, h3')) {
      context += ' ' + el.textContent;
      el = el.nextElementSibling;
      if (context.length > 200) break;
    }
    searchIndex.push({ title: text, id: id, context: context.trim().substring(0, 150), page: currentPage });
  });

  // Also add cross-page entries
  const pages = [
    { file: 'getting-started.html', title: 'Getting Started', sections: ['Installation', 'First Launch', 'Creating Notes', 'Markdown', 'Wiki-Links', 'Tags', 'Daily Notes', 'Keyboard Shortcuts', 'Slash Commands', 'Command Palette'] },
    { file: 'features.html', title: 'Features', sections: ['Split Panes', 'Graph View', 'Full-Text Search', 'File Management', 'Encrypted Vaults', 'Themes', 'Settings'] },
    { file: 'plugins.html', title: 'Plugins', sections: ['Plugin Compatibility', 'Installing Plugins', 'Supported APIs', 'Limitations', 'Tested Plugins'] },
    { file: 'troubleshooting.html', title: 'Troubleshooting', sections: ['App Won\'t Start', 'NixOS Issues', 'Plugin Problems', 'Encryption Issues', 'Search Issues'] },
    { file: 'building.html', title: 'Building from Source', sections: ['Prerequisites', 'Build Steps', 'Development Mode', 'Contributing'] },
  ];

  pages.forEach(page => {
    if (page.file !== currentPage) {
      searchIndex.push({ title: page.title, id: '', context: page.sections.join(', '), page: page.file });
      page.sections.forEach(sec => {
        const id = sec.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        searchIndex.push({ title: sec, id: id, context: `Section in ${page.title}`, page: page.file });
      });
    }
  });

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) {
        searchResults.classList.remove('visible');
        return;
      }

      const matches = searchIndex.filter(item =>
        item.title.toLowerCase().includes(q) || item.context.toLowerCase().includes(q)
      ).slice(0, 8);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-title" style="color:var(--text-muted)">No results found</span></div>';
      } else {
        searchResults.innerHTML = matches.map(m => {
          const href = m.page + (m.id ? '#' + m.id : '');
          return `<a href="${href}" class="search-result-item">
            <div class="search-result-title">${escapeHtml(m.title)}</div>
            <div class="search-result-section">${escapeHtml(m.context.substring(0, 80))}</div>
          </a>`;
        }).join('');
      }

      searchResults.classList.add('visible');
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => searchResults.classList.remove('visible'), 200);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchResults.classList.remove('visible');
        searchInput.blur();
      }
    });
  }

  // ===== Anchor link smooth scroll =====
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').substring(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      }
    });
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
