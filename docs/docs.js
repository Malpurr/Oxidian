// Oxidian Documentation — Shared JavaScript

(function() {
  'use strict';

  // ===== Internationalization (i18n) System =====
  const translations = {
    en: {
      'Documentation Hub': 'Documentation Hub',
      'Getting Started': 'Getting Started',
      'User Guide': 'User Guide',
      'Features': 'Features',
      'Architecture': 'Architecture',
      'Developer Guide': 'Developer Guide',
      'Plugin API': 'Plugin API',
      'API Reference': 'API Reference',
      'Plugins': 'Plugins',
      'Building from Source': 'Building from Source',
      'Troubleshooting': 'Troubleshooting',
      'Changelog': 'Changelog',
      'Home': 'Home',
      'Releases': 'Releases',
      'Search docs...': 'Search docs...',
      'Guides': 'Guides',
      'Reference': 'Reference',
      'Documentation': 'Documentation',
      'Everything you need to know about Oxidian': 'Everything you need to know about Oxidian — the blazing-fast, open-source, Rust-powered note-taking app.',
      'Quick Links': 'Quick Links',
      'About Oxidian': 'About Oxidian',
      'No results found': 'No results found'
    },
    de: {
      'Documentation Hub': 'Dokumentationszentrum',
      'Getting Started': 'Erste Schritte',
      'User Guide': 'Benutzerhandbuch',
      'Features': 'Funktionen',
      'Architecture': 'Architektur',
      'Developer Guide': 'Entwicklerhandbuch',
      'Plugin API': 'Plugin API',
      'API Reference': 'API-Referenz',
      'Plugins': 'Plugins',
      'Building from Source': 'Aus Quellcode erstellen',
      'Troubleshooting': 'Fehlerbehebung',
      'Changelog': 'Änderungsprotokoll',
      'Home': 'Startseite',
      'Releases': 'Versionen',
      'Search docs...': 'Dokumentation durchsuchen...',
      'Guides': 'Anleitungen',
      'Reference': 'Referenz',
      'Documentation': 'Dokumentation',
      'Everything you need to know about Oxidian': 'Alles, was Sie über Oxidian wissen müssen — die blitzschnelle, quelloffene, Rust-basierte Notiz-App.',
      'Quick Links': 'Schnellzugriff',
      'About Oxidian': 'Über Oxidian',
      'No results found': 'Keine Ergebnisse gefunden'
    },
    es: {
      'Documentation Hub': 'Centro de Documentación',
      'Getting Started': 'Primeros Pasos',
      'User Guide': 'Guía del Usuario',
      'Features': 'Características',
      'Architecture': 'Arquitectura',
      'Developer Guide': 'Guía del Desarrollador',
      'Plugin API': 'API de Plugins',
      'API Reference': 'Referencia de API',
      'Plugins': 'Plugins',
      'Building from Source': 'Compilar desde Código Fuente',
      'Troubleshooting': 'Solución de Problemas',
      'Changelog': 'Registro de Cambios',
      'Home': 'Inicio',
      'Releases': 'Versiones',
      'Search docs...': 'Buscar documentos...',
      'Guides': 'Guías',
      'Reference': 'Referencia',
      'Documentation': 'Documentación',
      'Everything you need to know about Oxidian': 'Todo lo que necesitas saber sobre Oxidian — la aplicación de notas ultrarrápida, de código abierto y construida con Rust.',
      'Quick Links': 'Enlaces Rápidos',
      'About Oxidian': 'Acerca de Oxidian',
      'No results found': 'No se encontraron resultados'
    },
    fr: {
      'Documentation Hub': 'Centre de Documentation',
      'Getting Started': 'Premiers Pas',
      'User Guide': 'Guide Utilisateur',
      'Features': 'Fonctionnalités',
      'Architecture': 'Architecture',
      'Developer Guide': 'Guide du Développeur',
      'Plugin API': 'API des Plugins',
      'API Reference': 'Référence API',
      'Plugins': 'Plugins',
      'Building from Source': 'Compiler depuis les Sources',
      'Troubleshooting': 'Dépannage',
      'Changelog': 'Journal des Modifications',
      'Home': 'Accueil',
      'Releases': 'Versions',
      'Search docs...': 'Rechercher dans la doc...',
      'Guides': 'Guides',
      'Reference': 'Référence',
      'Documentation': 'Documentation',
      'Everything you need to know about Oxidian': 'Tout ce que vous devez savoir sur Oxidian — l\'application de prise de notes ultra-rapide, open-source et construite avec Rust.',
      'Quick Links': 'Liens Rapides',
      'About Oxidian': 'À Propos d\'Oxidian',
      'No results found': 'Aucun résultat trouvé'
    },
    ja: {
      'Documentation Hub': 'ドキュメントハブ',
      'Getting Started': 'はじめに',
      'User Guide': 'ユーザーガイド',
      'Features': '機能',
      'Architecture': 'アーキテクチャ',
      'Developer Guide': '開発者ガイド',
      'Plugin API': 'プラグインAPI',
      'API Reference': 'APIリファレンス',
      'Plugins': 'プラグイン',
      'Building from Source': 'ソースからビルド',
      'Troubleshooting': 'トラブルシューティング',
      'Changelog': '変更履歴',
      'Home': 'ホーム',
      'Releases': 'リリース',
      'Search docs...': 'ドキュメントを検索...',
      'Guides': 'ガイド',
      'Reference': 'リファレンス',
      'Documentation': 'ドキュメント',
      'Everything you need to know about Oxidian': 'Oxidianについて知っておくべきすべて — 高速でオープンソースのRust製ノートアプリ。',
      'Quick Links': 'クイックリンク',
      'About Oxidian': 'Oxidianについて',
      'No results found': '結果が見つかりません'
    },
    zh: {
      'Documentation Hub': '文档中心',
      'Getting Started': '入门指南',
      'User Guide': '用户指南',
      'Features': '功能特性',
      'Architecture': '架构',
      'Developer Guide': '开发者指南',
      'Plugin API': '插件API',
      'API Reference': 'API参考',
      'Plugins': '插件',
      'Building from Source': '从源码构建',
      'Troubleshooting': '故障排除',
      'Changelog': '更新日志',
      'Home': '首页',
      'Releases': '版本',
      'Search docs...': '搜索文档...',
      'Guides': '指南',
      'Reference': '参考',
      'Documentation': '文档',
      'Everything you need to know about Oxidian': '关于Oxidian您需要了解的一切 — 快如闪电、开源、基于Rust的笔记应用。',
      'Quick Links': '快速链接',
      'About Oxidian': '关于Oxidian',
      'No results found': '未找到结果'
    }
  };

  // Get current language from localStorage or default to English
  let currentLanguage = localStorage.getItem('oxidian-docs-lang') || 'en';

  // Language names for the dropdown
  const languageNames = {
    en: 'English',
    de: 'Deutsch',
    es: 'Español',
    fr: 'Français',
    ja: '日本語',
    zh: '中文'
  };

  // Translation function
  function t(key) {
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
  }

  // Apply translations to elements with data-i18n attributes
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = t(key);
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update document title if it contains translatable content
    const titleElement = document.querySelector('title');
    if (titleElement) {
      const title = titleElement.textContent;
      if (title.includes('Documentation') && currentLanguage !== 'en') {
        titleElement.textContent = title.replace('Documentation', t('Documentation'));
      }
    }
  }

  // Create and initialize language dropdown
  function initLanguageDropdown() {
    const topnavRight = document.querySelector('.topnav-right');
    if (!topnavRight) return;

    // Create language dropdown HTML
    const langDropdownHTML = `
      <div class="language-dropdown">
        <button class="language-btn" aria-label="Select language">
          <span class="lang-icon">🌐</span>
          <span class="lang-name">${languageNames[currentLanguage]}</span>
          <svg class="lang-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="language-menu">
          ${Object.entries(languageNames).map(([code, name]) => 
            `<button class="language-option${code === currentLanguage ? ' active' : ''}" data-lang="${code}">
              <span class="lang-flag">${code === 'en' ? '🇺🇸' : code === 'de' ? '🇩🇪' : code === 'es' ? '🇪🇸' : code === 'fr' ? '🇫🇷' : code === 'ja' ? '🇯🇵' : '🇨🇳'}</span>
              <span class="lang-label">${name}</span>
            </button>`
          ).join('')}
        </div>
      </div>
    `;

    // Insert before the GitHub link
    const githubLink = topnavRight.querySelector('.topnav-github');
    if (githubLink) {
      githubLink.insertAdjacentHTML('beforebegin', langDropdownHTML);
    } else {
      topnavRight.insertAdjacentHTML('beforeend', langDropdownHTML);
    }

    // Add event listeners
    const langBtn = document.querySelector('.language-btn');
    const langMenu = document.querySelector('.language-menu');
    const langDropdown = document.querySelector('.language-dropdown');

    if (langBtn && langMenu) {
      // Toggle dropdown
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('open');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        langDropdown.classList.remove('open');
      });

      // Language selection
      document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', (e) => {
          const newLang = e.currentTarget.getAttribute('data-lang');
          if (newLang !== currentLanguage) {
            switchLanguage(newLang);
          }
          langDropdown.classList.remove('open');
        });
      });
    }
  }

  // Switch language
  function switchLanguage(newLang) {
    currentLanguage = newLang;
    localStorage.setItem('oxidian-docs-lang', newLang);
    
    // Update dropdown display
    const langName = document.querySelector('.lang-name');
    if (langName) {
      langName.textContent = languageNames[newLang];
    }

    // Update active state in dropdown
    document.querySelectorAll('.language-option').forEach(option => {
      option.classList.toggle('active', option.getAttribute('data-lang') === newLang);
    });

    // Apply translations
    applyTranslations();
  }

  // Initialize i18n system
  function initI18n() {
    initLanguageDropdown();
    applyTranslations();
  }

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }

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
