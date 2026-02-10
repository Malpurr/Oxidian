// Oxidian Documentation — Shared JavaScript

(function() {
  'use strict';

  // ===== Internationalization (i18n) System =====
  const translations = {
    en: {
      'Documentation Hub': 'Documentation Hub', 'Getting Started': 'Getting Started', 'User Guide': 'User Guide', 'Features': 'Features', 'Architecture': 'Architecture', 'Developer Guide': 'Developer Guide', 'Plugin API': 'Plugin API', 'API Reference': 'API Reference', 'Plugins': 'Plugins', 'Building from Source': 'Building from Source', 'Troubleshooting': 'Troubleshooting', 'Changelog': 'Changelog', 'Home': 'Home', 'Releases': 'Releases', 'Search docs...': 'Search docs...', 'Guides': 'Guides', 'Reference': 'Reference', 'Documentation': 'Documentation', 'Everything you need to know about Oxidian': 'Everything you need to know about Oxidian — the blazing-fast, open-source, Rust-powered note-taking app.', 'Quick Links': 'Quick Links', 'About Oxidian': 'About Oxidian', 'No results found': 'No results found', 'Support': 'Support',
      'card.getting-started.title': 'Getting Started', 'card.getting-started.desc': 'Install Oxidian, set up your vault, learn the basics of note-taking, keyboard shortcuts, and slash commands.',
      'card.features.title': 'Features', 'card.features.desc': 'Explore split panes, graph view, full-text search, encrypted vaults, themes, and the settings page.',
      'card.plugins.title': 'Plugins', 'card.plugins.desc': 'Learn how Oxidian runs real Obsidian community plugins, which APIs are supported, and how to install them.',
      'card.troubleshooting.title': 'Troubleshooting', 'card.troubleshooting.desc': 'Solutions for common issues — startup problems, NixOS quirks, plugin errors, encryption, and more.',
      'card.building.title': 'Building from Source', 'card.building.desc': 'Clone the repo, install dependencies, build Oxidian, and contribute to the project.',
      'card.github.title': 'GitHub Repository', 'card.github.desc': 'Browse the source code, open issues, submit pull requests, and star the project.',
      'card.shortcuts.title': 'Keyboard Shortcuts', 'card.shortcuts.desc': 'Full list of shortcuts for power users.',
      'card.markdown.title': 'Markdown Guide', 'card.markdown.desc': 'All supported markdown syntax.',
      'card.encryption.title': 'Encryption Setup', 'card.encryption.desc': 'Protect your vault with AES-256.',
      'card.graph.title': 'Graph View', 'card.graph.desc': 'Visualize your note connections.',
      'about.intro': 'Oxidian is a free, open-source note-taking application built with Rust and Tauri. It\'s designed as an alternative to Obsidian with a focus on performance, privacy, and extensibility.',
      'about.highlights': 'Key highlights:', 'about.rust': 'Rust-powered backend — Blazing fast file operations, search (Tantivy), and encryption (AES-256-GCM)', 'about.plugins': 'Obsidian plugin compatibility — Run real Obsidian community plugins without modification', 'about.encryption': 'Encrypted vaults — AES-256-GCM encryption with Argon2id key derivation', 'about.local': 'Local-first — Your notes are plain markdown files stored on your machine', 'about.license': 'MIT licensed — Fully open source, forever free', 'about.callout': 'New to Oxidian? Start with the Getting Started guide. You\'ll be taking notes in under 5 minutes.'
    },
    de: {
      'Documentation Hub': 'Dokumentationszentrum', 'Getting Started': 'Erste Schritte', 'User Guide': 'Benutzerhandbuch', 'Features': 'Funktionen', 'Architecture': 'Architektur', 'Developer Guide': 'Entwicklerhandbuch', 'Plugin API': 'Plugin API', 'API Reference': 'API-Referenz', 'Plugins': 'Plugins', 'Building from Source': 'Aus Quellcode erstellen', 'Troubleshooting': 'Fehlerbehebung', 'Changelog': 'Änderungsprotokoll', 'Home': 'Startseite', 'Releases': 'Versionen', 'Search docs...': 'Dokumentation durchsuchen...', 'Guides': 'Anleitungen', 'Reference': 'Referenz', 'Documentation': 'Dokumentation', 'Everything you need to know about Oxidian': 'Alles, was du über Oxidian wissen musst — die blitzschnelle, quelloffene, Rust-basierte Notiz-App.', 'Quick Links': 'Schnellzugriff', 'About Oxidian': 'Über Oxidian', 'No results found': 'Keine Ergebnisse gefunden', 'Support': 'Hilfe',
      'card.getting-started.title': 'Erste Schritte', 'card.getting-started.desc': 'Oxidian installieren, Vault einrichten, Grundlagen des Notizenmachens, Tastenkürzel und Slash-Befehle lernen.',
      'card.features.title': 'Funktionen', 'card.features.desc': 'Geteilte Ansichten, Graph-Ansicht, Volltextsuche, verschlüsselte Vaults, Themes und Einstellungen entdecken.',
      'card.plugins.title': 'Plugins', 'card.plugins.desc': 'Erfahre, wie Oxidian echte Obsidian-Community-Plugins ausführt, welche APIs unterstützt werden und wie du sie installierst.',
      'card.troubleshooting.title': 'Fehlerbehebung', 'card.troubleshooting.desc': 'Lösungen für häufige Probleme — Startprobleme, NixOS-Eigenheiten, Plugin-Fehler, Verschlüsselung und mehr.',
      'card.building.title': 'Aus Quellcode erstellen', 'card.building.desc': 'Repository klonen, Abhängigkeiten installieren, Oxidian bauen und zum Projekt beitragen.',
      'card.github.title': 'GitHub Repository', 'card.github.desc': 'Quellcode durchstöbern, Issues erstellen, Pull Requests einreichen und das Projekt mit einem Stern markieren.',
      'card.shortcuts.title': 'Tastenkürzel', 'card.shortcuts.desc': 'Vollständige Liste der Tastenkürzel für Power-User.',
      'card.markdown.title': 'Markdown-Anleitung', 'card.markdown.desc': 'Alle unterstützten Markdown-Syntaxen.',
      'card.encryption.title': 'Verschlüsselung einrichten', 'card.encryption.desc': 'Schütze deinen Vault mit AES-256.',
      'card.graph.title': 'Graph-Ansicht', 'card.graph.desc': 'Visualisiere deine Notiz-Verbindungen.',
      'about.intro': 'Oxidian ist eine kostenlose, quelloffene Notiz-App, gebaut mit Rust und Tauri. Sie wurde als Alternative zu Obsidian entwickelt — mit Fokus auf Performance, Privatsphäre und Erweiterbarkeit.',
      'about.highlights': 'Highlights:', 'about.rust': 'Rust-Backend — Blitzschnelle Dateioperationen, Suche (Tantivy) und Verschlüsselung (AES-256-GCM)', 'about.plugins': 'Obsidian-Plugin-Kompatibilität — Echte Obsidian-Community-Plugins ohne Änderung ausführen', 'about.encryption': 'Verschlüsselte Vaults — AES-256-GCM mit Argon2id-Schlüsselableitung', 'about.local': 'Local-first — Deine Notizen sind Markdown-Dateien auf deinem Computer', 'about.license': 'MIT-Lizenz — Komplett Open Source, für immer kostenlos', 'about.callout': 'Neu bei Oxidian? Starte mit der Erste-Schritte-Anleitung. In unter 5 Minuten bist du bereit.'
    },
    es: {
      'Documentation Hub': 'Centro de Documentación', 'Getting Started': 'Primeros Pasos', 'User Guide': 'Guía del Usuario', 'Features': 'Características', 'Architecture': 'Arquitectura', 'Developer Guide': 'Guía del Desarrollador', 'Plugin API': 'API de Plugins', 'API Reference': 'Referencia de API', 'Plugins': 'Plugins', 'Building from Source': 'Compilar desde Código Fuente', 'Troubleshooting': 'Solución de Problemas', 'Changelog': 'Registro de Cambios', 'Home': 'Inicio', 'Releases': 'Versiones', 'Search docs...': 'Buscar documentos...', 'Guides': 'Guías', 'Reference': 'Referencia', 'Documentation': 'Documentación', 'Everything you need to know about Oxidian': 'Todo lo que necesitas saber sobre Oxidian — la app de notas ultrarrápida, de código abierto, construida con Rust.', 'Quick Links': 'Enlaces Rápidos', 'About Oxidian': 'Acerca de Oxidian', 'No results found': 'No se encontraron resultados', 'Support': 'Soporte',
      'card.getting-started.title': 'Primeros Pasos', 'card.getting-started.desc': 'Instala Oxidian, configura tu vault, aprende los básicos de tomar notas, atajos de teclado y comandos slash.',
      'card.features.title': 'Características', 'card.features.desc': 'Explora paneles divididos, vista de grafo, búsqueda de texto completo, vaults encriptados, temas y configuración.',
      'card.plugins.title': 'Plugins', 'card.plugins.desc': 'Aprende cómo Oxidian ejecuta plugins reales de la comunidad Obsidian, qué APIs se soportan y cómo instalarlos.',
      'card.troubleshooting.title': 'Solución de Problemas', 'card.troubleshooting.desc': 'Soluciones para problemas comunes — inicio, NixOS, errores de plugins, encriptación y más.',
      'card.building.title': 'Compilar desde Código Fuente', 'card.building.desc': 'Clona el repo, instala dependencias, compila Oxidian y contribuye al proyecto.',
      'card.github.title': 'Repositorio GitHub', 'card.github.desc': 'Explora el código fuente, crea issues, envía pull requests y dale una estrella al proyecto.',
      'card.shortcuts.title': 'Atajos de Teclado', 'card.shortcuts.desc': 'Lista completa de atajos para usuarios avanzados.',
      'card.markdown.title': 'Guía Markdown', 'card.markdown.desc': 'Toda la sintaxis markdown soportada.',
      'card.encryption.title': 'Configurar Encriptación', 'card.encryption.desc': 'Protege tu vault con AES-256.',
      'card.graph.title': 'Vista de Grafo', 'card.graph.desc': 'Visualiza las conexiones de tus notas.',
      'about.intro': 'Oxidian es una aplicación de notas gratuita y de código abierto construida con Rust y Tauri. Diseñada como alternativa a Obsidian con enfoque en rendimiento, privacidad y extensibilidad.',
      'about.highlights': 'Destacados:', 'about.rust': 'Backend Rust — Operaciones de archivo ultrarrápidas, búsqueda (Tantivy) y encriptación (AES-256-GCM)', 'about.plugins': 'Compatibilidad con plugins Obsidian — Ejecuta plugins reales sin modificación', 'about.encryption': 'Vaults encriptados — AES-256-GCM con derivación de clave Argon2id', 'about.local': 'Local-first — Tus notas son archivos markdown en tu máquina', 'about.license': 'Licencia MIT — Completamente open source, siempre gratuito', 'about.callout': '¿Nuevo en Oxidian? Empieza con la guía de Primeros Pasos. Estarás tomando notas en menos de 5 minutos.'
    },
    fr: {
      'Documentation Hub': 'Centre de Documentation', 'Getting Started': 'Premiers Pas', 'User Guide': 'Guide Utilisateur', 'Features': 'Fonctionnalités', 'Architecture': 'Architecture', 'Developer Guide': 'Guide du Développeur', 'Plugin API': 'API des Plugins', 'API Reference': 'Référence API', 'Plugins': 'Plugins', 'Building from Source': 'Compiler depuis les Sources', 'Troubleshooting': 'Dépannage', 'Changelog': 'Journal des Modifications', 'Home': 'Accueil', 'Releases': 'Versions', 'Search docs...': 'Rechercher dans la doc...', 'Guides': 'Guides', 'Reference': 'Référence', 'Documentation': 'Documentation', 'Everything you need to know about Oxidian': 'Tout ce que vous devez savoir sur Oxidian — l\'app de prise de notes ultra-rapide, open-source, construite avec Rust.', 'Quick Links': 'Liens Rapides', 'About Oxidian': 'À Propos d\'Oxidian', 'No results found': 'Aucun résultat trouvé', 'Support': 'Aide',
      'card.getting-started.title': 'Premiers Pas', 'card.getting-started.desc': 'Installez Oxidian, configurez votre vault, apprenez les bases de la prise de notes, raccourcis clavier et commandes slash.',
      'card.features.title': 'Fonctionnalités', 'card.features.desc': 'Découvrez les panneaux divisés, la vue graphe, la recherche plein texte, les vaults chiffrés, les thèmes et les paramètres.',
      'card.plugins.title': 'Plugins', 'card.plugins.desc': 'Découvrez comment Oxidian exécute les vrais plugins communautaires Obsidian, quelles APIs sont supportées et comment les installer.',
      'card.troubleshooting.title': 'Dépannage', 'card.troubleshooting.desc': 'Solutions aux problèmes courants — démarrage, NixOS, erreurs de plugins, chiffrement et plus.',
      'card.building.title': 'Compiler depuis les Sources', 'card.building.desc': 'Clonez le repo, installez les dépendances, compilez Oxidian et contribuez au projet.',
      'card.github.title': 'Dépôt GitHub', 'card.github.desc': 'Parcourez le code source, ouvrez des issues, soumettez des pull requests et ajoutez une étoile.',
      'card.shortcuts.title': 'Raccourcis Clavier', 'card.shortcuts.desc': 'Liste complète des raccourcis pour utilisateurs avancés.',
      'card.markdown.title': 'Guide Markdown', 'card.markdown.desc': 'Toute la syntaxe markdown supportée.',
      'card.encryption.title': 'Configurer le Chiffrement', 'card.encryption.desc': 'Protégez votre vault avec AES-256.',
      'card.graph.title': 'Vue Graphe', 'card.graph.desc': 'Visualisez les connexions entre vos notes.',
      'about.intro': 'Oxidian est une application de prise de notes gratuite et open-source, construite avec Rust et Tauri. Conçue comme alternative à Obsidian avec un focus sur la performance, la vie privée et l\'extensibilité.',
      'about.highlights': 'Points forts :', 'about.rust': 'Backend Rust — Opérations fichier ultra-rapides, recherche (Tantivy) et chiffrement (AES-256-GCM)', 'about.plugins': 'Compatibilité plugins Obsidian — Exécutez les vrais plugins sans modification', 'about.encryption': 'Vaults chiffrés — AES-256-GCM avec dérivation de clé Argon2id', 'about.local': 'Local-first — Vos notes sont des fichiers markdown sur votre machine', 'about.license': 'Licence MIT — Complètement open source, gratuit pour toujours', 'about.callout': 'Nouveau sur Oxidian ? Commencez par le guide Premiers Pas. Vous prendrez des notes en moins de 5 minutes.'
    },
    ja: {
      'Documentation Hub': 'ドキュメントハブ', 'Getting Started': 'はじめに', 'User Guide': 'ユーザーガイド', 'Features': '機能', 'Architecture': 'アーキテクチャ', 'Developer Guide': '開発者ガイド', 'Plugin API': 'プラグインAPI', 'API Reference': 'APIリファレンス', 'Plugins': 'プラグイン', 'Building from Source': 'ソースからビルド', 'Troubleshooting': 'トラブルシューティング', 'Changelog': '変更履歴', 'Home': 'ホーム', 'Releases': 'リリース', 'Search docs...': 'ドキュメントを検索...', 'Guides': 'ガイド', 'Reference': 'リファレンス', 'Documentation': 'ドキュメント', 'Everything you need to know about Oxidian': 'Oxidianについて知っておくべきすべて — 高速でオープンソースのRust製ノートアプリ。', 'Quick Links': 'クイックリンク', 'About Oxidian': 'Oxidianについて', 'No results found': '結果が見つかりません', 'Support': 'サポート',
      'card.getting-started.title': 'はじめに', 'card.getting-started.desc': 'Oxidianをインストールし、Vaultを設定、ノート作成の基本、キーボードショートカット、スラッシュコマンドを学びましょう。',
      'card.features.title': '機能', 'card.features.desc': '分割ペイン、グラフビュー、全文検索、暗号化Vault、テーマ、設定ページを探索しましょう。',
      'card.plugins.title': 'プラグイン', 'card.plugins.desc': 'Oxidianが本物のObsidianコミュニティプラグインをどう実行するか、どのAPIがサポートされるか、インストール方法を学びましょう。',
      'card.troubleshooting.title': 'トラブルシューティング', 'card.troubleshooting.desc': 'よくある問題の解決策 — 起動問題、NixOS、プラグインエラー、暗号化など。',
      'card.building.title': 'ソースからビルド', 'card.building.desc': 'リポジトリをクローンし、依存関係をインストール、Oxidianをビルドしてプロジェクトに貢献。',
      'card.github.title': 'GitHubリポジトリ', 'card.github.desc': 'ソースコードを閲覧、Issueを作成、Pull Requestを送信、スターを付けましょう。',
      'card.shortcuts.title': 'キーボードショートカット', 'card.shortcuts.desc': 'パワーユーザー向けショートカット一覧。',
      'card.markdown.title': 'Markdownガイド', 'card.markdown.desc': 'サポートされるMarkdown構文すべて。',
      'card.encryption.title': '暗号化の設定', 'card.encryption.desc': 'AES-256でVaultを保護。',
      'card.graph.title': 'グラフビュー', 'card.graph.desc': 'ノートのつながりを視覚化。',
      'about.intro': 'Oxidianは、RustとTauriで構築された無料のオープンソースノートアプリです。パフォーマンス、プライバシー、拡張性に焦点を当てたObsidianの代替として設計されています。',
      'about.highlights': 'ハイライト：', 'about.rust': 'Rustバックエンド — 超高速ファイル操作、検索(Tantivy)、暗号化(AES-256-GCM)', 'about.plugins': 'Obsidianプラグイン互換性 — 変更なしで本物のプラグインを実行', 'about.encryption': '暗号化Vault — Argon2id鍵導出によるAES-256-GCM', 'about.local': 'ローカルファースト — ノートはマシン上のMarkdownファイル', 'about.license': 'MITライセンス — 完全オープンソース、永久無料', 'about.callout': 'Oxidian初めて？はじめにガイドから始めましょう。5分以内にノートが取れます。'
    },
    zh: {
      'Documentation Hub': '文档中心', 'Getting Started': '入门指南', 'User Guide': '用户指南', 'Features': '功能特性', 'Architecture': '架构', 'Developer Guide': '开发者指南', 'Plugin API': '插件API', 'API Reference': 'API参考', 'Plugins': '插件', 'Building from Source': '从源码构建', 'Troubleshooting': '故障排除', 'Changelog': '更新日志', 'Home': '首页', 'Releases': '版本', 'Search docs...': '搜索文档...', 'Guides': '指南', 'Reference': '参考', 'Documentation': '文档', 'Everything you need to know about Oxidian': '关于Oxidian您需要了解的一切 — 快如闪电、开源、基于Rust的笔记应用。', 'Quick Links': '快速链接', 'About Oxidian': '关于Oxidian', 'No results found': '未找到结果', 'Support': '支持',
      'card.getting-started.title': '入门指南', 'card.getting-started.desc': '安装Oxidian，设置Vault，学习笔记基础、键盘快捷键和斜杠命令。',
      'card.features.title': '功能特性', 'card.features.desc': '探索分栏视图、图谱视图、全文搜索、加密Vault、主题和设置页面。',
      'card.plugins.title': '插件', 'card.plugins.desc': '了解Oxidian如何运行真正的Obsidian社区插件、支持哪些API以及如何安装。',
      'card.troubleshooting.title': '故障排除', 'card.troubleshooting.desc': '常见问题解决方案 — 启动问题、NixOS、插件错误、加密等。',
      'card.building.title': '从源码构建', 'card.building.desc': '克隆仓库、安装依赖、构建Oxidian并为项目做贡献。',
      'card.github.title': 'GitHub仓库', 'card.github.desc': '浏览源代码、创建Issue、提交Pull Request、给项目加星。',
      'card.shortcuts.title': '键盘快捷键', 'card.shortcuts.desc': '高级用户完整快捷键列表。',
      'card.markdown.title': 'Markdown指南', 'card.markdown.desc': '所有支持的Markdown语法。',
      'card.encryption.title': '配置加密', 'card.encryption.desc': '用AES-256保护你的Vault。',
      'card.graph.title': '图谱视图', 'card.graph.desc': '可视化你的笔记连接。',
      'about.intro': 'Oxidian是一款用Rust和Tauri构建的免费开源笔记应用。它被设计为Obsidian的替代品，专注于性能、隐私和可扩展性。',
      'about.highlights': '亮点：', 'about.rust': 'Rust后端 — 超快文件操作、搜索(Tantivy)和加密(AES-256-GCM)', 'about.plugins': 'Obsidian插件兼容 — 无需修改即可运行真正的社区插件', 'about.encryption': '加密Vault — 使用Argon2id密钥派生的AES-256-GCM', 'about.local': '本地优先 — 你的笔记是存储在本机的Markdown文件', 'about.license': 'MIT许可证 — 完全开源，永久免费', 'about.callout': '初次使用Oxidian？从入门指南开始，5分钟内即可开始记笔记。'
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
