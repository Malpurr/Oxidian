// CodeMirror 6 Editor - Drop-in replacement for the classic editor
import {
  EditorState,
  StateField,
  StateEffect,
  Transaction
} from './codemirror-bundle.js';

import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  ViewUpdate
} from './codemirror-bundle.js';

import {
  markdown,
  markdownLanguage
} from './codemirror-bundle.js';

import {
  syntaxHighlighting,
  HighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  codeFolding,
  foldCode,
  unfoldCode,
  foldAll,
  unfoldAll
} from './codemirror-bundle.js';

import {
  languageTags
} from './codemirror-bundle.js';

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  standardKeymap,
  insertTab,
  indentMore,
  indentLess,
  toggleComment,
  cursorLineBoundaryBackward,
  cursorLineBoundaryForward,
  selectAll,
  cursorDocStart,
  cursorDocEnd,
  selectLine,
  deleteLine,
  moveLineUp,
  moveLineDown,
  copyLineUp,
  copyLineDown
} from './codemirror-bundle.js';

import {
  searchKeymap,
  search,
  findNext,
  findPrevious,
  gotoLine,
  highlightSelectionMatches
} from './codemirror-bundle.js';

import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap
} from './codemirror-bundle.js';

import {
  oneDark
} from './codemirror-bundle.js';

/**
 * Custom Oxidian Dark Theme - matches the app's catppuccin-inspired theme
 */
const oxidianTheme = EditorView.theme({
  '&': {
    color: '#cdd6f4', // Main text color
    backgroundColor: '#1e1e2e', // Background
    height: '100%',
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace',
    fontSize: '15px',
    lineHeight: '1.5'
  },
  '.cm-content': {
    padding: '16px',
    caretColor: '#cba6f7', // Purple caret
    minHeight: '100%'
  },
  '.cm-focused .cm-cursor': {
    borderLeftColor: '#cba6f7' // Purple cursor
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#45475a !important' // Selection background
  },
  '.cm-focused .cm-selectionBackground': {
    backgroundColor: '#45475a !important'
  },
  '.cm-activeLine': {
    backgroundColor: '#313244' // Active line background
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#313244'
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e2e',
    color: '#6c7086', // Muted text for line numbers
    border: 'none',
    borderRight: '1px solid #313244'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 8px',
    minWidth: '40px !important'
  },
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 4px'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    color: '#a6adc8'
  },
  '.cm-tooltip': {
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    color: '#cdd6f4'
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: '#313244',
    border: '1px solid #45475a'
  },
  '.cm-completionLabel': {
    color: '#cdd6f4'
  },
  '.cm-completionDetail': {
    color: '#a6adc8'
  },
  '.cm-completionIcon': {
    color: '#cba6f7'
  },
  '.cm-searchMatch': {
    backgroundColor: '#f9e2af',
    color: '#1e1e2e',
    outline: '1px solid #f9e2af'
  },
  '.cm-searchMatch-selected': {
    backgroundColor: '#fab387',
    color: '#1e1e2e'
  }
}, { dark: true });

/**
 * Custom syntax highlighting for Markdown (Catppuccin-inspired)
 */
const oxidianHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: languageTags.heading, color: '#cba6f7', fontWeight: 'bold' }, // Purple headings
  { tag: languageTags.emphasis, color: '#f38ba8', fontStyle: 'italic' }, // Pink italic
  { tag: languageTags.strong, color: '#fab387', fontWeight: 'bold' }, // Orange bold
  { tag: languageTags.strikethrough, color: '#6c7086', textDecoration: 'line-through' }, // Muted strikethrough
  { tag: languageTags.link, color: '#89b4fa' }, // Blue links
  { tag: languageTags.monospace, color: '#a6e3a1', backgroundColor: '#313244' }, // Green inline code
  { tag: languageTags.url, color: '#89b4fa', textDecoration: 'underline' },
  { tag: languageTags.meta, color: '#74c7ec' }, // Cyan metadata
  { tag: languageTags.quote, color: '#a6adc8', fontStyle: 'italic' }, // Muted quotes
  { tag: languageTags.list, color: '#cdd6f4' },
  { tag: languageTags.documentMeta, color: '#6c7086' },
  { tag: languageTags.processingInstruction, color: '#74c7ec' },
  { tag: languageTags.separator, color: '#6c7086' },
  { tag: languageTags.labelName, color: '#cba6f7' }, // Purple for labels
  { tag: languageTags.literal, color: '#a6e3a1' }, // Green for literals
  { tag: languageTags.inserted, color: '#a6e3a1' },
  { tag: languageTags.deleted, color: '#f38ba8' },
  { tag: languageTags.changed, color: '#fab387' }
]));

/**
 * Custom markdown shortcuts for Oxidian
 */
const markdownKeymap = [
  { key: 'Ctrl-b', run: toggleBold, preventDefault: true },
  { key: 'Cmd-b', run: toggleBold, preventDefault: true },
  { key: 'Ctrl-i', run: toggleItalic, preventDefault: true },
  { key: 'Cmd-i', run: toggleItalic, preventDefault: true },
  { key: 'Ctrl-k', run: insertLink, preventDefault: true },
  { key: 'Cmd-k', run: insertLink, preventDefault: true },
  { key: 'Ctrl-Shift-k', run: insertCodeBlock, preventDefault: true },
  { key: 'Cmd-Shift-k', run: insertCodeBlock, preventDefault: true },
  { key: 'Ctrl-`', run: toggleInlineCode, preventDefault: true },
  { key: 'Cmd-`', run: toggleInlineCode, preventDefault: true }
];

/**
 * Toggle bold formatting
 */
function toggleBold(view) {
  return wrapSelection(view, '**', '**');
}

/**
 * Toggle italic formatting
 */
function toggleItalic(view) {
  return wrapSelection(view, '*', '*');
}

/**
 * Toggle inline code
 */
function toggleInlineCode(view) {
  return wrapSelection(view, '`', '`');
}

/**
 * Insert code block
 */
function insertCodeBlock(view) {
  return wrapSelection(view, '```\n', '\n```');
}

/**
 * Insert link
 */
function insertLink(view) {
  const { state, dispatch } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  
  if (selectedText) {
    const linkText = `[${selectedText}](url)`;
    dispatch(state.update({
      changes: { from, to, insert: linkText },
      selection: { anchor: from + selectedText.length + 3, head: from + selectedText.length + 6 }
    }));
  } else {
    const linkText = '[text](url)';
    dispatch(state.update({
      changes: { from, insert: linkText },
      selection: { anchor: from + 1, head: from + 5 }
    }));
  }
  return true;
}

/**
 * Wrap selection with before/after text
 */
function wrapSelection(view, before, after) {
  const { state, dispatch } = view;
  const { from, to } = state.selection.main;
  const selectedText = state.doc.sliceString(from, to);
  
  const replacement = before + (selectedText || 'text') + after;
  const changes = { from, to, insert: replacement };
  
  let selection;
  if (selectedText) {
    // Keep selection around the original text
    selection = { anchor: from, head: from + replacement.length };
  } else {
    // Select the placeholder text
    selection = { anchor: from + before.length, head: from + before.length + 4 };
  }
  
  dispatch(state.update({ changes, selection }));
  return true;
}

/**
 * CodeMirror 6 Editor Class - Drop-in replacement for the classic editor
 */
export class CodeMirrorEditor {
  constructor(app) {
    this.app = app;
    this.view = null;
    this.container = null;
    this.previewEl = null;
    this.currentPath = null;
    this.renderTimeout = null;
    this.previewVisible = true;
    this.showLineNumbers = localStorage.getItem('oxidian-line-numbers') === 'true';
    this.vimMode = false; // Could be enabled later
  }

  /**
   * Attach the editor to a container element
   */
  attach(container, previewEl) {
    this.container = container;
    this.previewEl = previewEl;
    
    // Create CodeMirror extensions
    const extensions = [
      // Basic extensions
      markdown(),
      syntaxHighlighting(oxidianHighlight),
      oxidianTheme,
      EditorView.lineWrapping,
      history(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      highlightSelectionMatches(),
      search({ top: true }),
      
      // Optional line numbers
      ...(this.showLineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
      
      // Folding
      codeFolding(),
      foldGutter(),
      
      // Keymaps (order matters - more specific first)
      keymap.of([
        ...markdownKeymap,
        ...completionKeymap,
        ...closeBracketsKeymap,
        ...standardKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...defaultKeymap,
        indentWithTab
      ]),
      
      // Update listener for content changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.app.markDirty();
          this.scheduleRender();
          this.updateStats();
          
          // Notify slash menu
          this.app.slashMenu?.onInput(this.view);
        }
        
        if (update.selectionSet) {
          this.updateCursor();
        }
      }),
      
      // Custom styling
      EditorView.theme({
        '.cm-editor': {
          height: '100%'
        },
        '.cm-scroller': {
          fontFamily: 'inherit'
        }
      })
    ];
    
    // Create the editor state
    const state = EditorState.create({
      doc: '',
      extensions
    });
    
    // Create the editor view
    this.view = new EditorView({
      state,
      parent: container
    });
    
    // Handle blur event for auto-save
    this.view.contentDOM.addEventListener('blur', () => {
      if (this.app.isDirty) {
        this.app.saveCurrentFile();
      }
    });
    
    // Handle context menu
    this.view.contentDOM.addEventListener('contextmenu', (e) => {
      this.app.contextMenu.showEditorMenu(e, this.view);
    });
    
    return this.view;
  }

  /**
   * Attach HyperMark editor (compatibility method)
   */
  attachHyperMark(hypermark, previewEl) {
    // This is a compatibility method - CodeMirror handles everything internally
    this.previewEl = previewEl;
  }

  /**
   * Set editor content
   */
  setContent(content) {
    if (!this.view) return;
    
    const transaction = this.view.state.update({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
    
    this.view.dispatch(transaction);
    this.renderPreview();
    this.updateStats();
    this.updateCursor();
    this.view.focus();
    
    // Scroll to top
    this.view.dispatch({
      effects: EditorView.scrollIntoView(0, { y: 'start' })
    });
  }

  /**
   * Get editor content
   */
  getContent() {
    return this.view ? this.view.state.doc.toString() : '';
  }

  /**
   * Get current selection
   */
  getSelection() {
    if (!this.view) return '';
    const { from, to } = this.view.state.selection.main;
    return this.view.state.doc.sliceString(from, to);
  }

  /**
   * Replace current selection
   */
  replaceSelection(text) {
    if (!this.view) return;
    
    const { from, to } = this.view.state.selection.main;
    this.view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length }
    });
  }

  /**
   * Get cursor position
   */
  getCursor() {
    if (!this.view) return { line: 1, ch: 0 };
    
    const pos = this.view.state.selection.main.head;
    const line = this.view.state.doc.lineAt(pos);
    return {
      line: line.number,
      ch: pos - line.from
    };
  }

  /**
   * Set cursor position
   */
  setCursor(pos) {
    if (!this.view) return;
    
    let offset;
    if (typeof pos === 'object' && pos.line !== undefined) {
      // Convert line/ch to offset
      const line = this.view.state.doc.line(pos.line);
      offset = line.from + (pos.ch || 0);
    } else {
      offset = pos;
    }
    
    this.view.dispatch({
      selection: { anchor: offset }
    });
  }

  /**
   * Insert text at cursor
   */
  insertMarkdown(text) {
    if (!this.view) return;
    
    const pos = this.view.state.selection.main.head;
    this.view.dispatch({
      changes: { from: pos, insert: text },
      selection: { anchor: pos + text.length }
    });
    
    this.view.focus();
    this.app.markDirty();
    this.scheduleRender();
  }

  /**
   * Wrap selection with before/after text
   */
  wrapSelection(before, after) {
    if (!this.view) return;
    wrapSelection(this.view, before, after);
    this.app.markDirty();
    this.scheduleRender();
  }

  /**
   * Toggle line numbers
   */
  toggleLineNumbers(show) {
    this.showLineNumbers = show;
    localStorage.setItem('oxidian-line-numbers', show.toString());
    
    // For now, require a restart to apply line numbers
    // TODO: Could be improved with compartments
    console.log('Line numbers toggled. Restart required to apply changes.');
  }

  /**
   * Schedule preview rendering
   */
  scheduleRender() {
    clearTimeout(this.renderTimeout);
    this.renderTimeout = setTimeout(() => this.renderPreview(), 200);
  }

  /**
   * Render markdown preview
   */
  async renderPreview() {
    if (!this.previewEl) return;
    
    const content = this.getContent();
    if (!content.trim()) {
      this.previewEl.innerHTML = '<p style="color: var(--text-faint)">Preview will appear here...</p>';
      return;
    }
    
    try {
      const { invoke } = window.__TAURI__.core;
      const html = await invoke('render_markdown', { content });
      this.previewEl.innerHTML = html;
    } catch (err) {
      console.error('Render failed:', err);
    }
  }

  /**
   * Toggle preview visibility
   */
  togglePreview() {
    if (!this.previewEl) return;
    
    const previewPane = this.previewEl.closest('.preview-pane-half');
    if (!previewPane) return;

    this.previewVisible = !this.previewVisible;
    previewPane.style.display = this.previewVisible ? '' : 'none';
  }

  /**
   * Update word/character statistics
   */
  updateStats() {
    const content = this.getContent();
    this.updateStatsFromContent(content);
  }

  /**
   * Update stats from content string
   */
  updateStatsFromContent(content) {
    if (!content) content = '';
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    const readingTime = Math.max(1, Math.ceil(words / 238));

    const wc = document.getElementById('status-word-count');
    const cc = document.getElementById('status-char-count');
    const rt = document.getElementById('status-reading-time');
    if (wc) wc.textContent = `${words} words`;
    if (cc) cc.textContent = `${chars} characters`;
    if (rt) rt.textContent = `${readingTime} min read`;

    // Update outline panel if visible
    this.app.updateOutline?.(content);
  }

  /**
   * Update cursor position display
   */
  updateCursor() {
    if (!this.view) return;
    
    const pos = this.view.state.selection.main.head;
    const line = this.view.state.doc.lineAt(pos);
    const lineNum = line.number;
    const colNum = pos - line.from + 1;

    const el = document.getElementById('status-cursor');
    if (el) el.textContent = `Ln ${lineNum}, Col ${colNum}`;
  }

  /**
   * Sync scroll with preview (if needed)
   */
  syncScroll() {
    // CodeMirror handles its own scrolling
    // This is kept for API compatibility
  }

  /**
   * Focus the editor
   */
  focus() {
    if (this.view) {
      this.view.focus();
    }
  }

  /**
   * Destroy the editor
   */
  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
    
    clearTimeout(this.renderTimeout);
    this.container = null;
    this.previewEl = null;
  }
}

// Keymap for folding
const foldKeymap = [
  { key: 'Ctrl-Shift-[', run: foldCode },
  { key: 'Cmd-Alt-[', run: foldCode },
  { key: 'Ctrl-Shift-]', run: unfoldCode },
  { key: 'Cmd-Alt-]', run: unfoldCode },
  { key: 'Ctrl-Alt-f', run: foldAll },
  { key: 'Cmd-Alt-f', run: foldAll },
  { key: 'Ctrl-Alt-u', run: unfoldAll },
  { key: 'Cmd-Alt-u', run: unfoldAll }
];