/**
 * HyperMark Editor Engine — Oxidian Studio
 * 
 * A hybrid-rendered, block-aware Markdown editor that keeps raw Markdown
 * as source-of-truth while showing live-rendered blocks.
 * 
 * Refactored: Parsing delegated to Rust via Tauri invoke().
 * JS retains: Block rendering (DOM), CodeMirror integration, cursor tracking,
 * viewport management, drag & drop, slash commands, undo/redo.
 * 
 * @module hypermark
 * @version 0.2.0
 */

const { invoke } = window.__TAURI__.core;

// ============================================================================
// SECTION 1: BLOCK MODEL (shared with Rust AST output)
// ============================================================================

/**
 * @typedef {'heading'|'paragraph'|'code_block'|'blockquote'|'list'|'table'|'thematic_break'|'frontmatter'|'math_block'|'callout'|'empty'} BlockType
 */

/**
 * Represents a single Markdown block.
 * Constructed from Rust AST JSON or locally for virtual blocks.
 */
class Block {
  /**
   * @param {Object} opts
   * @param {string} opts.id
   * @param {BlockType} opts.type
   * @param {number} opts.from - Start offset in the document
   * @param {number} opts.to - End offset (exclusive)
   * @param {string} opts.content - Raw markdown of this block
   * @param {Object} [opts.meta] - Metadata (level, language, etc.)
   */
  constructor({ id, type, from, to, content, meta = {} }) {
    this.id = id;
    this.type = type;
    this.from = from;
    this.to = to;
    this.content = content;
    this.meta = meta;
  }
}

// ============================================================================
// SECTION 2: RUST BRIDGE — Parse via invoke()
// ============================================================================

/**
 * Thin wrapper around Rust markdown parsing.
 * Replaces RopeBuffer + BlockSplitter._splitIntoBlocks.
 */
class MarkdownBridge {
  constructor() {
    /** @type {Block[]} */
    this.blocks = [];
    /** @type {string} */
    this._content = '';
    /** @private */
    this._idCounter = 0;
  }

  /** @returns {string} */
  get content() { return this._content; }

  /** @returns {number} */
  get length() { return this._content.length; }

  /** @returns {number} */
  get lineCount() {
    if (this._content.length === 0) return 1;
    let count = 1;
    for (let i = 0; i < this._content.length; i++) {
      if (this._content.charCodeAt(i) === 10) count++;
    }
    return count;
  }

  /**
   * Set content and parse via Rust.
   * @param {string} text
   * @returns {Promise<Block[]>}
   */
  async setContent(text) {
    this._content = text;
    return this._parse();
  }

  /**
   * Insert text at offset and re-parse.
   * @param {number} offset
   * @param {string} text
   * @returns {Promise<Block[]>}
   */
  async insert(offset, text) {
    this._content = this._content.substring(0, offset) + text + this._content.substring(offset);
    return this._parse();
  }

  /**
   * Delete a range and re-parse.
   * @param {number} from
   * @param {number} to
   * @returns {Promise<Block[]>}
   */
  async delete(from, to) {
    this._content = this._content.substring(0, from) + this._content.substring(to);
    return this._parse();
  }

  /**
   * Replace a range with new text and re-parse.
   * @param {number} from
   * @param {number} to
   * @param {string} text
   * @returns {Promise<Block[]>}
   */
  async replace(from, to, text) {
    this._content = this._content.substring(0, from) + text + this._content.substring(to);
    return this._parse();
  }

  /**
   * Extract a substring.
   * @param {number} from
   * @param {number} to
   * @returns {string}
   */
  slice(from, to) {
    return this._content.substring(from, to);
  }

  /** @returns {string} */
  toString() { return this._content; }

  /**
   * Parse content via Rust and convert AST JSON to Block[].
   * @private
   * @returns {Promise<Block[]>}
   */
  async _parse() {
    try {
      const ast = await invoke('parse_markdown', { content: this._content });
      // ast is expected as an array of block objects from Rust:
      // [{ id, type, from, to, content, meta }, ...]
      this.blocks = (ast || []).map(b => new Block({
        id: b.id || this._stableId(b.from, b.type),
        type: b.type,
        from: b.from,
        to: b.to,
        content: b.content,
        meta: b.meta || {},
      }));
    } catch (err) {
      console.warn('[HyperMark] Rust parse_markdown failed, using fallback:', err);
      this.blocks = this._fallbackParse(this._content);
    }
    return this.blocks;
  }

  /**
   * Generate a stable ID based on block position and type.
   * @private
   */
  _stableId(from, type) {
    return 'blk_' + from + '_' + type;
  }

  /**
   * Minimal JS fallback parser if Rust is unavailable.
   * Only handles basic block splitting — no complex logic.
   * @private
   * @param {string} text
   * @returns {Block[]}
   */
  _fallbackParse(text) {
    if (!text || text.trim() === '') return [];
    const blocks = [];
    const lines = text.split('\n');
    let i = 0, offset = 0;

    while (i < lines.length) {
      const line = lines[i];
      const lineStart = offset;

      if (line.trim() === '') { offset += line.length + 1; i++; continue; }

      // Heading
      const hm = line.match(/^(#{1,6})\s+(.*)/);
      if (hm) {
        blocks.push(new Block({ id: this._stableId(lineStart, 'heading'), type: 'heading', from: lineStart, to: lineStart + line.length, content: line, meta: { level: hm[1].length, text: hm[2] } }));
        offset += line.length + 1; i++; continue;
      }

      // Fenced code block
      const cm = line.match(/^(`{3,}|~{3,})(.*)$/);
      if (cm) {
        const fence = cm[1]; const lang = cm[2].trim(); let end = i + 1;
        while (end < lines.length && !(lines[end].startsWith(fence.charAt(0).repeat(fence.length)) && lines[end].trim().length <= fence.length + 1)) end++;
        if (end < lines.length) end++;
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({ id: this._stableId(lineStart, 'code_block'), type: 'code_block', from: lineStart, to: lineStart + content.length, content, meta: { language: lang || null, fence } }));
        offset += content.length + (end < lines.length ? 1 : 0); i = end; continue;
      }

      // Blockquote / callout
      if (line.startsWith('>')) {
        let end = i;
        while (end < lines.length && lines[end].startsWith('>')) end++;
        const content = lines.slice(i, end).join('\n');
        const calloutMatch = content.match(/^>\s*\[!(\w+)\]/);
        const type = calloutMatch ? 'callout' : 'blockquote';
        const meta = calloutMatch ? { calloutType: calloutMatch[1].toLowerCase() } : {};
        blocks.push(new Block({ id: this._stableId(lineStart, type), type, from: lineStart, to: lineStart + content.length, content, meta }));
        offset += content.length + (end < lines.length ? 1 : 0); i = end; continue;
      }

      // Default paragraph
      {
        let end = i;
        while (end < lines.length && lines[end].trim() !== '' && !lines[end].match(/^#{1,6}\s/) && !lines[end].match(/^[`~]{3,}/) && !lines[end].startsWith('>')) end++;
        if (end === i) end = i + 1;
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({ id: this._stableId(lineStart, 'paragraph'), type: 'paragraph', from: lineStart, to: lineStart + content.length, content, meta: {} }));
        offset += content.length + (end < lines.length ? 1 : 0); i = end;
      }
    }
    return blocks;
  }

  /**
   * Get the block at a given document offset.
   * @param {number} offset
   * @returns {Block|null}
   */
  blockAt(offset) {
    for (const b of this.blocks) {
      if (offset >= b.from && offset <= b.to) return b;
    }
    return null;
  }
}


// ============================================================================
// SECTION 3: BLOCK RENDERERS — HTML rendering for each block type
// ============================================================================

/**
 * Renders inline Markdown to HTML via Rust.
 * Falls back to basic regex if invoke fails.
 * @param {string} text
 * @returns {string}
 */
let _renderInlineCache = new Map();

async function renderInlineAsync(text) {
  if (_renderInlineCache.has(text)) return _renderInlineCache.get(text);
  try {
    const html = await invoke('render_inline', { text });
    _renderInlineCache.set(text, html);
    return html;
  } catch {
    return renderInlineFallback(text);
  }
}

/**
 * Synchronous fallback for inline rendering (used in block renderers).
 * @param {string} text
 * @returns {string}
 */
function renderInline(text) {
  if (_renderInlineCache.has(text)) return _renderInlineCache.get(text);
  return renderInlineFallback(text);
}

/** @private Minimal inline renderer as fallback */
function renderInlineFallback(text) {
  let html = text;
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="hm-inline-img" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="hm-link">$1</a>');
  html = html.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  html = html.replace(/`([^`]+)`/g, '<code class="hm-inline-code">$1</code>');
  html = html.replace(/==(.+?)==/g, '<mark class="hm-highlight">$1</mark>');
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$2</a>');
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$1</a>');
  return html;
}

/**
 * Collection of block renderers. Each returns an HTML string.
 */
const BlockRenderers = {

  heading(block) {
    const level = block.meta.level || 1;
    const text = block.content.replace(/^#{1,6}\s+/, '');
    const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const inlineHtml = renderInline(text);
    return `<h${level} id="${anchor}" class="hm-heading hm-h${level}">${inlineHtml}</h${level}>`;
  },

  paragraph(block) {
    return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
  },

  code_block(block) {
    const lines = block.content.split('\n');
    const lang = block.meta.language || '';
    const codeLines = lines.slice(1, lines[lines.length - 1].match(/^[`~]/) ? -1 : undefined);
    const code = codeLines.join('\n');
    const escaped = BlockRenderers._escHtml(code);

    return `<div class="hm-code-block" data-language="${BlockRenderers._escAttr(lang)}">
      ${lang ? `<div class="hm-code-lang">${BlockRenderers._escHtml(lang)}</div>` : ''}
      <pre class="hm-pre"><code class="hm-code">${escaped}</code></pre>
    </div>`;
  },

  blockquote(block) {
    const inner = block.content.replace(/^>\s?/gm, '');
    return `<blockquote class="hm-blockquote">
      <div class="hm-bq-bar"></div>
      <div class="hm-bq-content">${renderInline(inner)}</div>
    </blockquote>`;
  },

  callout(block) {
    const type = block.meta.calloutType || 'note';
    const lines = block.content.split('\n');
    const titleLine = lines[0].replace(/^>\s*\[!\w+\]\s*/, '').trim();
    const bodyLines = lines.slice(1).map(l => l.replace(/^>\s?/, '')).join('\n');

    const icons = {
      note: 'ℹ️', tip: '💡', warning: '⚠️', danger: '🔴', info: 'ℹ️',
      success: '✅', question: '❓', quote: '💬', bug: '🐛', example: '📋',
      abstract: '📝', todo: '☑️', failure: '❌', important: '🔥',
    };
    const icon = icons[type] || 'ℹ️';

    return `<div class="hm-callout hm-callout-${BlockRenderers._escAttr(type)}">
      <div class="hm-callout-header">
        <span class="hm-callout-icon">${icon}</span>
        <span class="hm-callout-type">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        ${titleLine ? `<span class="hm-callout-title">${renderInline(titleLine)}</span>` : ''}
      </div>
      ${bodyLines.trim() ? `<div class="hm-callout-body">${renderInline(bodyLines)}</div>` : ''}
    </div>`;
  },

  list(block) {
    const lines = block.content.split('\n');
    const ordered = block.meta.ordered;
    const tag = ordered ? 'ol' : 'ul';
    let html = `<${tag} class="hm-list hm-list-${ordered ? 'ordered' : 'unordered'}">`;

    for (const line of lines) {
      if (line.trim() === '') continue;
      const itemMatch = line.match(/^\s*(?:[-*+]|\d+[.)]) (.*)/);
      if (!itemMatch) continue;
      let itemContent = itemMatch[1];

      const checkMatch = itemContent.match(/^\[([ xX])\] (.*)/);
      if (checkMatch) {
        const checked = checkMatch[1] !== ' ';
        itemContent = checkMatch[2];
        html += `<li class="hm-list-item hm-task-item">
          <input type="checkbox" class="hm-checkbox" ${checked ? 'checked' : ''} disabled />
          <span class="${checked ? 'hm-task-done' : ''}">${renderInline(itemContent)}</span>
        </li>`;
      } else {
        html += `<li class="hm-list-item">${renderInline(itemContent)}</li>`;
      }
    }

    html += `</${tag}>`;
    return html;
  },

  table(block) {
    const lines = block.content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;

    const parseRow = (line) => {
      return line.split('|').map(c => c.trim()).filter((_, idx, arr) => {
        if (idx === 0 && arr[0] === '') return false;
        if (idx === arr.length - 1 && arr[arr.length - 1] === '') return false;
        return true;
      });
    };

    const headers = parseRow(lines[0]);
    const separators = parseRow(lines[1]);
    const aligns = separators.map(s => {
      if (s.startsWith(':') && s.endsWith(':')) return 'center';
      if (s.endsWith(':')) return 'right';
      return 'left';
    });

    let html = '<table class="hm-table"><thead><tr>';
    for (let i = 0; i < headers.length; i++) {
      const align = aligns[i] || 'left';
      html += `<th class="hm-th" style="text-align:${align}">${renderInline(headers[i])}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 2; r < lines.length; r++) {
      const cells = parseRow(lines[r]);
      const rowClass = r % 2 === 0 ? 'hm-tr-even' : 'hm-tr-odd';
      html += `<tr class="${rowClass}">`;
      for (let c = 0; c < headers.length; c++) {
        const align = aligns[c] || 'left';
        const val = cells[c] || '';
        html += `<td class="hm-td" style="text-align:${align}">${renderInline(val)}</td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
  },

  thematic_break(_block) {
    return '<hr class="hm-hr" />';
  },

  frontmatter(block) {
    const lines = block.content.split('\n');
    const yamlLines = lines.slice(1, -1).filter(l => l.trim() !== '');
    if (yamlLines.length === 0) return '';
    const preview = yamlLines[0];

    return `<details class="hm-frontmatter">
      <summary class="hm-frontmatter-badge">
        <span class="hm-fm-icon">📋</span>
        <span class="hm-fm-label">Frontmatter</span>
        <span class="hm-fm-preview">${BlockRenderers._escHtml(preview)}${yamlLines.length > 1 ? ` (+${yamlLines.length - 1})` : ''}</span>
      </summary>
      <pre class="hm-fm-content"><code>${BlockRenderers._escHtml(yamlLines.join('\n'))}</code></pre>
    </details>`;
  },

  math_block(block) {
    const lines = block.content.split('\n');
    const math = lines.slice(1, -1).join('\n');
    return `<div class="hm-math-block">
      <div class="hm-math-content">${BlockRenderers._escHtml(math)}</div>
    </div>`;
  },

  render(block) {
    const renderer = BlockRenderers[block.type];
    if (renderer && typeof renderer === 'function') {
      return renderer(block);
    }
    return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
  },

  _escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};


// ============================================================================
// SECTION 4: TRANSACTION & UNDO/REDO SYSTEM
// ============================================================================

class Transaction {
  constructor({ type, offset, inserted = '', deleted = '', timestamp }) {
    this.type = type;
    this.offset = offset;
    this.inserted = inserted;
    this.deleted = deleted;
    this.timestamp = timestamp || Date.now();
  }

  invert() {
    return new Transaction({
      type: this.type,
      offset: this.offset,
      inserted: this.deleted,
      deleted: this.inserted,
      timestamp: this.timestamp,
    });
  }
}

class TransactionHistory {
  constructor(maxSize = 500) {
    this._undoStack = [];
    this._redoStack = [];
    this._maxSize = maxSize;
    this._batchTimeout = 300;
    this._lastPushTime = 0;
    this._currentBatch = [];
  }

  push(tx) {
    const now = Date.now();
    if (now - this._lastPushTime < this._batchTimeout && this._currentBatch.length > 0) {
      this._currentBatch.push(tx);
    } else {
      if (this._currentBatch.length > 0) {
        this._undoStack.push([...this._currentBatch]);
      }
      this._currentBatch = [tx];
    }
    this._lastPushTime = now;
    this._redoStack = [];
    if (this._undoStack.length > this._maxSize) this._undoStack.shift();
  }

  flush() {
    if (this._currentBatch.length > 0) {
      this._undoStack.push([...this._currentBatch]);
      this._currentBatch = [];
    }
  }

  undo() {
    this.flush();
    if (this._undoStack.length === 0) return null;
    const batch = this._undoStack.pop();
    this._redoStack.push(batch);
    return batch.slice().reverse().map(tx => tx.invert());
  }

  redo() {
    if (this._redoStack.length === 0) return null;
    const batch = this._redoStack.pop();
    this._undoStack.push(batch);
    return batch;
  }

  get canUndo() { return this._undoStack.length > 0 || this._currentBatch.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._currentBatch = [];
  }
}


// ============================================================================
// SECTION 5: SLASH COMMAND SYSTEM
// ============================================================================

const DEFAULT_SLASH_COMMANDS = [
  { label: 'Heading 1', icon: 'H1', description: 'Large heading', keywords: ['h1', 'heading', 'title'], markdown: '# ' },
  { label: 'Heading 2', icon: 'H2', description: 'Medium heading', keywords: ['h2', 'heading', 'subtitle'], markdown: '## ' },
  { label: 'Heading 3', icon: 'H3', description: 'Small heading', keywords: ['h3', 'heading'], markdown: '### ' },
  { label: 'Code Block', icon: '</>', description: 'Fenced code block', keywords: ['code', 'fence', 'programming'], markdown: '```\n\n```', cursorOffset: 4 },
  { label: 'Quote', icon: '❝', description: 'Blockquote', keywords: ['quote', 'blockquote', 'cite'], markdown: '> ' },
  { label: 'Bullet List', icon: '•', description: 'Unordered list', keywords: ['list', 'bullet', 'unordered', 'ul'], markdown: '- ' },
  { label: 'Numbered List', icon: '1.', description: 'Ordered list', keywords: ['list', 'numbered', 'ordered', 'ol'], markdown: '1. ' },
  { label: 'Task List', icon: '☑', description: 'Checklist / todo', keywords: ['task', 'todo', 'checkbox', 'checklist'], markdown: '- [ ] ' },
  { label: 'Table', icon: '▦', description: 'Insert a table', keywords: ['table', 'grid'], markdown: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |' },
  { label: 'Divider', icon: '—', description: 'Horizontal rule', keywords: ['divider', 'hr', 'horizontal', 'rule', 'separator'], markdown: '---' },
  { label: 'Callout', icon: '💡', description: 'Callout box', keywords: ['callout', 'note', 'warning', 'tip', 'admonition'], markdown: '> [!note]\n> ' },
  { label: 'Math Block', icon: '∑', description: 'LaTeX math block', keywords: ['math', 'latex', 'equation', 'formula'], markdown: '$$\n\n$$', cursorOffset: 3 },
];

class SlashCommandMenu {
  constructor(container, commands = DEFAULT_SLASH_COMMANDS) {
    this.container = container;
    this.commands = commands;
    this.el = null;
    this.visible = false;
    this.selectedIndex = 0;
    this.filteredCommands = [];
    this.onSelect = null;
    this._query = '';
  }

  show(x, y, onSelect) {
    this.onSelect = onSelect;
    this._query = '';
    this.selectedIndex = 0;
    this.filteredCommands = [...this.commands];
    this.visible = true;

    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'hm-slash-menu';
      this.container.appendChild(this.el);
    }

    this.el.style.display = 'block';
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
    this._render();
  }

  hide() {
    this.visible = false;
    if (this.el) this.el.style.display = 'none';
    this.onSelect = null;
  }

  filter(query) {
    this._query = query.toLowerCase();
    if (this._query === '') {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd =>
        cmd.label.toLowerCase().includes(this._query) ||
        cmd.keywords.some(k => k.includes(this._query))
      );
    }
    this.selectedIndex = 0;
    this._render();
  }

  up() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
    this._render();
  }

  down() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
    this._render();
  }

  confirm() {
    if (this.filteredCommands.length === 0) return;
    const cmd = this.filteredCommands[this.selectedIndex];
    if (this.onSelect) this.onSelect(cmd);
    this.hide();
  }

  _render() {
    if (!this.el) return;
    if (this.filteredCommands.length === 0) {
      this.el.innerHTML = '<div class="hm-slash-empty">No commands found</div>';
      return;
    }

    let html = '';
    for (let i = 0; i < this.filteredCommands.length; i++) {
      const cmd = this.filteredCommands[i];
      const selected = i === this.selectedIndex ? ' hm-slash-selected' : '';
      html += `<div class="hm-slash-item${selected}" data-index="${i}">
        <span class="hm-slash-icon">${cmd.icon}</span>
        <div class="hm-slash-text">
          <span class="hm-slash-label">${cmd.label}</span>
          <span class="hm-slash-desc">${cmd.description}</span>
        </div>
      </div>`;
    }
    this.el.innerHTML = html;

    this.el.querySelectorAll('.hm-slash-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectedIndex = parseInt(item.dataset.index);
        this.confirm();
      });
    });
  }
}


// ============================================================================
// SECTION 6: VIRTUAL VIEWPORT
// ============================================================================

class VirtualViewport {
  constructor(scrollContainer, opts = {}) {
    this.scrollContainer = scrollContainer;
    this.overscan = opts.overscan ?? 3;
    this.estimatedBlockHeight = opts.estimatedBlockHeight ?? 60;
    this._measuredHeights = new Map();
    this._totalHeight = 0;
    this._blockPositions = [];
  }

  layout(blocks) {
    this._blockPositions = [];
    let top = 0;
    for (const block of blocks) {
      const height = this._measuredHeights.get(block.id) || this.estimatedBlockHeight;
      this._blockPositions.push({ id: block.id, top, height });
      top += height;
    }
    this._totalHeight = top;
  }

  setMeasuredHeight(blockId, height) { this._measuredHeights.set(blockId, height); }
  get totalHeight() { return this._totalHeight; }

  getVisibleRange(scrollTop, viewportHeight) {
    const top = scrollTop;
    const bottom = scrollTop + viewportHeight;

    let lo = 0, hi = this._blockPositions.length - 1, startIndex = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this._blockPositions[mid].top + this._blockPositions[mid].height < top) lo = mid + 1;
      else hi = mid - 1;
    }
    startIndex = Math.max(0, lo - this.overscan);

    lo = startIndex; hi = this._blockPositions.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this._blockPositions[mid].top > bottom) hi = mid - 1;
      else lo = mid + 1;
    }
    const endIndex = Math.min(this._blockPositions.length, lo + this.overscan);

    return { startIndex, endIndex, positions: this._blockPositions.slice(startIndex, endIndex) };
  }

  getBlockPosition(blockId) {
    return this._blockPositions.find(p => p.id === blockId) || null;
  }
}


// ============================================================================
// SECTION 7: DRAG & DROP SYSTEM
// ============================================================================

class BlockDragDrop {
  constructor(editor) {
    this.editor = editor;
    this.dragging = false;
    this.dragBlockId = null;
    this.dragGhost = null;
    this.dropTarget = null;
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  start(blockId, event) {
    if (this.editor.config.readOnly) return;
    this.dragging = true;
    this.dragBlockId = blockId;

    const blockEl = this.editor._getBlockElement(blockId);
    if (blockEl) {
      this.dragGhost = blockEl.cloneNode(true);
      this.dragGhost.className = 'hm-drag-ghost';
      this.dragGhost.style.position = 'fixed';
      this.dragGhost.style.width = blockEl.offsetWidth + 'px';
      this.dragGhost.style.opacity = '0.7';
      this.dragGhost.style.pointerEvents = 'none';
      this.dragGhost.style.zIndex = '10000';
      document.body.appendChild(this.dragGhost);
      this._positionGhost(event);
    }

    document.body.classList.add('hm-dragging');
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    event.preventDefault();
  }

  _onMouseMove(event) {
    if (!this.dragging) return;
    this._positionGhost(event);

    const blocks = this.editor.bridge.blocks;
    const containerRect = this.editor._contentEl.getBoundingClientRect();
    const y = event.clientY - containerRect.top + this.editor._scrollEl.scrollTop;

    this.editor._contentEl.querySelectorAll('.hm-drop-indicator').forEach(el => el.remove());

    let targetIdx = -1, insertBefore = false;
    for (let i = 0; i < blocks.length; i++) {
      const el = this.editor._getBlockElement(blocks[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const elY = rect.top - containerRect.top + this.editor._scrollEl.scrollTop;
      const midY = elY + rect.height / 2;
      if (y < midY) { targetIdx = i; insertBefore = true; break; }
      targetIdx = i; insertBefore = false;
    }

    if (targetIdx >= 0 && blocks[targetIdx].id !== this.dragBlockId) {
      this.dropTarget = { index: targetIdx, before: insertBefore };
      const targetEl = this.editor._getBlockElement(blocks[targetIdx].id);
      if (targetEl) {
        const indicator = document.createElement('div');
        indicator.className = 'hm-drop-indicator';
        if (insertBefore) targetEl.parentElement.insertBefore(indicator, targetEl);
        else targetEl.parentElement.insertBefore(indicator, targetEl.nextSibling);
      }
    }
  }

  _onMouseUp(_event) {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);

    if (this.dragGhost) { this.dragGhost.remove(); this.dragGhost = null; }
    this.editor._contentEl.querySelectorAll('.hm-drop-indicator').forEach(el => el.remove());
    document.body.classList.remove('hm-dragging');

    if (this.dropTarget && this.dragBlockId) {
      this.editor._reorderBlock(this.dragBlockId, this.dropTarget);
    }

    this.dragging = false;
    this.dragBlockId = null;
    this.dropTarget = null;
  }

  _positionGhost(event) {
    if (this.dragGhost) {
      this.dragGhost.style.left = (event.clientX + 10) + 'px';
      this.dragGhost.style.top = (event.clientY - 15) + 'px';
    }
  }
}


// ============================================================================
// SECTION 8: CSS STYLES (injected at runtime)
// ============================================================================

const HYPERMARK_STYLES = `
/* === HyperMark Editor Styles === */
.hm-editor { position: relative; font-family: inherit; font-size: inherit; line-height: inherit; color: inherit; background: transparent; overflow: hidden; }
.hm-scroll { overflow-y: auto; height: 100%; scroll-behavior: smooth; }
.hm-content { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; min-height: 100%; padding-bottom: 60vh; cursor: text; }
.hm-spacer { pointer-events: none; }
.hm-block-wrapper { position: relative; padding: 2px 0 2px 28px; border-radius: 0; cursor: text; }
.hm-block-wrapper:hover { background: transparent; }
.hm-block-wrapper.hm-block-active { background: transparent; }
.hm-drag-handle { position: absolute; left: 2px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; opacity: 0; cursor: grab; display: flex; align-items: center; justify-content: center; border-radius: 3px; color: var(--hm-muted, #666); font-size: 12px; transition: opacity 0.15s ease; user-select: none; }
.hm-block-wrapper:hover .hm-drag-handle { opacity: 0.3; }
.hm-drag-handle:hover { opacity: 0.7 !important; background: rgba(255,255,255,0.05); }
.hm-drag-ghost { border: 2px solid var(--hm-accent, #00d4aa); border-radius: 6px; background: var(--hm-bg, #1a1a2e); padding: 4px; max-height: 100px; overflow: hidden; }
.hm-drop-indicator { height: 3px; background: var(--hm-accent, #00d4aa); border-radius: 2px; margin: 2px 0; }
body.hm-dragging { cursor: grabbing !important; user-select: none; }
.hm-block-textarea { width: 100%; border: none; outline: none; background: transparent; color: var(--hm-fg, #e0e0e0); font-family: inherit; font-size: inherit; line-height: inherit; resize: none; overflow: hidden; padding: 0; border-radius: 0; }
.hm-block-textarea:focus { outline: none; border: none; box-shadow: none; }
.hm-heading { margin: 0.6em 0 0.2em; font-weight: 600; }
.hm-h1 { font-size: 2em; } .hm-h2 { font-size: 1.5em; } .hm-h3 { font-size: 1.25em; } .hm-h4 { font-size: 1.1em; } .hm-h5 { font-size: 1em; } .hm-h6 { font-size: 0.9em; color: var(--hm-muted, #999); }
.hm-paragraph { margin: 0; }
.hm-code-block { position: relative; margin: 0.8em 0; border-radius: 6px; background: var(--hm-code-bg, #16213e); overflow: hidden; }
.hm-code-lang { position: absolute; top: 6px; right: 10px; font-size: 11px; color: var(--hm-muted, #888); text-transform: uppercase; letter-spacing: 0.05em; user-select: none; }
.hm-pre { margin: 0; padding: 1em; overflow-x: auto; font-size: 14px; line-height: 1.5; }
.hm-code { font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace; color: var(--hm-code-fg, #a9b7c6); }
.hm-hl-keyword { color: #c678dd; font-weight: 600; } .hm-hl-string { color: #98c379; } .hm-hl-comment { color: #5c6370; font-style: italic; } .hm-hl-number { color: #d19a66; }
.hm-blockquote { position: relative; margin: 0.8em 0; padding: 0.5em 0 0.5em 1.2em; display: flex; }
.hm-bq-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 2px; background: var(--hm-accent, #00d4aa); }
.hm-bq-content { color: var(--hm-muted, #bbb); font-style: italic; }
.hm-callout { margin: 0.8em 0; border-radius: 6px; border-left: 4px solid var(--hm-accent, #00d4aa); padding: 0.8em 1em; background: var(--hm-callout-bg, rgba(0,212,170,0.06)); }
.hm-callout-header { display: flex; align-items: center; gap: 0.5em; font-weight: 600; margin-bottom: 0.3em; }
.hm-callout-icon { font-size: 1.1em; } .hm-callout-type { text-transform: capitalize; } .hm-callout-title { font-weight: 400; color: var(--hm-muted, #bbb); } .hm-callout-body { color: var(--hm-fg, #e0e0e0); }
.hm-callout-warning { border-left-color: #e2b93d; background: rgba(226,185,61,0.06); }
.hm-callout-danger { border-left-color: #e06c75; background: rgba(224,108,117,0.06); }
.hm-callout-tip { border-left-color: #98c379; background: rgba(152,195,121,0.06); }
.hm-callout-info { border-left-color: #61afef; background: rgba(97,175,239,0.06); }
.hm-callout-bug { border-left-color: #e06c75; background: rgba(224,108,117,0.06); }
.hm-list { margin: 0.5em 0; padding-left: 1.5em; }
.hm-list-item { margin: 0.15em 0; }
.hm-task-item { list-style: none; margin-left: -1.5em; display: flex; align-items: flex-start; gap: 0.5em; }
.hm-checkbox { margin-top: 0.3em; accent-color: var(--hm-accent, #00d4aa); }
.hm-task-done { text-decoration: line-through; color: var(--hm-muted, #888); }
.hm-table { width: 100%; border-collapse: collapse; margin: 0.8em 0; font-size: 0.95em; }
.hm-th { border-bottom: 2px solid var(--hm-border, #444); padding: 0.5em 0.8em; font-weight: 600; text-align: left; }
.hm-td { border-bottom: 1px solid var(--hm-border, #333); padding: 0.4em 0.8em; }
.hm-tr-even { background: var(--hm-stripe, rgba(255,255,255,0.02)); } .hm-tr-odd { background: transparent; }
.hm-hr { border: none; border-top: 2px solid var(--hm-border, #333); margin: 1.5em 0; }
.hm-frontmatter { margin: 0.3em 0; border-radius: 4px; background: transparent; padding: 0.2em 0; }
.hm-frontmatter-badge { cursor: pointer; display: flex; align-items: center; gap: 0.5em; font-size: 0.85em; user-select: none; }
.hm-fm-icon { font-size: 1em; } .hm-fm-label { font-weight: 600; color: var(--hm-accent, #00d4aa); } .hm-fm-preview { color: var(--hm-muted, #888); }
.hm-fm-content { margin-top: 0.5em; padding: 0.5em; font-size: 0.9em; }
.hm-math-block { margin: 0.8em 0; padding: 1em; text-align: center; background: var(--hm-code-bg, #16213e); border-radius: 6px; }
.hm-math-content { font-family: 'KaTeX_Math', 'Times New Roman', serif; font-size: 1.2em; font-style: italic; color: var(--hm-fg, #e0e0e0); }
.hm-inline-code { background: var(--hm-code-bg, #16213e); padding: 0.15em 0.35em; border-radius: 3px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9em; }
.hm-link { color: var(--hm-link, #4fc3f7); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
.hm-link:hover { border-bottom-color: var(--hm-link, #4fc3f7); }
.hm-wikilink { color: var(--hm-accent, #00d4aa); text-decoration: none; border-bottom: 1px dashed var(--hm-accent, #00d4aa); }
.hm-highlight { background: rgba(255, 255, 0, 0.2); padding: 0.1em 0.2em; border-radius: 2px; }
.hm-inline-img { max-width: 100%; border-radius: 4px; margin: 0.3em 0; }
.hm-slash-menu { position: absolute; z-index: 9999; background: var(--hm-popover-bg, #1e1e3e); border: 1px solid var(--hm-border, #444); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); padding: 4px; max-height: 300px; overflow-y: auto; min-width: 220px; }
.hm-slash-item { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: background 0.1s; }
.hm-slash-item:hover, .hm-slash-selected { background: var(--hm-hover, rgba(255,255,255,0.08)); }
.hm-slash-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--hm-code-bg, #16213e); border-radius: 4px; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.hm-slash-text { display: flex; flex-direction: column; }
.hm-slash-label { font-size: 14px; font-weight: 500; }
.hm-slash-desc { font-size: 12px; color: var(--hm-muted, #888); }
.hm-slash-empty { padding: 12px; text-align: center; color: var(--hm-muted, #888); font-size: 13px; }
.hm-scroll::-webkit-scrollbar { width: 8px; }
.hm-scroll::-webkit-scrollbar-track { background: transparent; }
.hm-scroll::-webkit-scrollbar-thumb { background: var(--hm-muted, #444); border-radius: 4px; }
.hm-scroll::-webkit-scrollbar-thumb:hover { background: var(--hm-border, #666); }
`;

let _stylesInjected = false;
function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'hypermark-styles';
  style.textContent = HYPERMARK_STYLES;
  document.head.appendChild(style);
}


// ============================================================================
// SECTION 9: HYPERMARK EDITOR — Main Engine
// ============================================================================

class HyperMarkEditor {
  constructor(container, config = {}) {
    _injectStyles();

    this.container = container;
    this.config = {
      content: config.content || '',
      onChange: config.onChange || null,
      onBlockFocus: config.onBlockFocus || null,
      onBlockBlur: config.onBlockBlur || null,
      readOnly: config.readOnly || false,
      virtualViewport: config.virtualViewport !== false,
      slashCommands: config.slashCommands || [],
      autoSaveDelay: config.autoSaveDelay ?? 1000,
    };

    // Core state — MarkdownBridge replaces RopeBuffer + BlockSplitter
    this.bridge = new MarkdownBridge();
    this.history = new TransactionHistory();

    this.activeBlockId = null;
    this._autoSaveTimer = null;
    this._destroyed = false;
    this._initPromise = null;

    // Build DOM first (sync)
    this._buildDOM();

    // Systems
    this.viewport = new VirtualViewport(this._scrollEl);
    this.dragDrop = new BlockDragDrop(this);
    this.slashMenu = new SlashCommandMenu(
      this._contentEl,
      [...DEFAULT_SLASH_COMMANDS, ...this.config.slashCommands]
    );

    // Initialize: parse via Rust (async)
    this._initPromise = this._init();

    this._bindEvents();
  }

  /**
   * Async initialization: parse initial content via Rust.
   * @private
   */
  async _init() {
    await this.bridge.setContent(this.config.content);
    this._ensureAtLeastOneBlock();
    this._renderAllBlocks();
  }

  /**
   * Wait for editor to be ready (initial parse complete).
   * @returns {Promise<void>}
   */
  async ready() {
    return this._initPromise;
  }

  // --- Ensure Document Has Blocks ---

  _ensureAtLeastOneBlock() {
    if (this.bridge.blocks.length === 0) {
      this.bridge.blocks = [
        new Block({
          id: 'blk_0_paragraph',
          type: 'paragraph',
          from: 0,
          to: 0,
          content: '',
          meta: {},
        }),
      ];
    }
  }

  // --- DOM Construction ---

  _buildDOM() {
    this.container.innerHTML = '';

    this._editorEl = document.createElement('div');
    this._editorEl.className = 'hm-editor';
    this._editorEl.setAttribute('role', 'document');
    this._editorEl.setAttribute('aria-label', 'HyperMark Editor');

    this._scrollEl = document.createElement('div');
    this._scrollEl.className = 'hm-scroll';

    this._contentEl = document.createElement('div');
    this._contentEl.className = 'hm-content';

    this._scrollEl.appendChild(this._contentEl);
    this._editorEl.appendChild(this._scrollEl);
    this.container.appendChild(this._editorEl);

    this._onContentAreaMouseDown = (e) => {
      if (e.target === this._contentEl || e.target === this._scrollEl) {
        e.preventDefault();
        this._ensureAtLeastOneBlock();
        const blocks = this.bridge.blocks;
        if (blocks.length === 0) return;
        const lastBlock = blocks[blocks.length - 1];
        this._focusBlock(lastBlock.id);
        requestAnimationFrame(() => {
          const ta = this._contentEl.querySelector('.hm-block-textarea');
          if (ta) { ta.selectionStart = ta.selectionEnd = ta.value.length; ta.focus(); }
        });
      }
    };
    this._contentEl.addEventListener('mousedown', this._onContentAreaMouseDown);
    this._scrollEl.addEventListener('mousedown', (e) => {
      if (e.target === this._scrollEl) this._onContentAreaMouseDown(e);
    });
  }

  // --- Block Rendering ---

  _renderAllBlocks() {
    const blocks = this.bridge.blocks;
    if (this.config.virtualViewport && blocks.length > 50) {
      this._renderVirtualized(blocks);
    } else {
      this._renderDirect(blocks);
    }
  }

  _renderDirect(blocks) {
    if (this.activeBlockId && !blocks.find(b => b.id === this.activeBlockId)) {
      this.activeBlockId = null;
    }

    let activeContent = null, activeCursorPos = null;
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) { activeContent = textarea.value; activeCursorPos = textarea.selectionStart; }
    }

    this._contentEl.innerHTML = '';
    for (const block of blocks) {
      this._contentEl.appendChild(this._createBlockWrapper(block));
    }

    if (this.activeBlockId && activeContent !== null) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) { textarea.value = activeContent; textarea.selectionStart = activeCursorPos; textarea.selectionEnd = activeCursorPos; textarea.focus(); }
    }
  }

  _renderVirtualized(blocks) {
    this.viewport.layout(blocks);
    const scrollTop = this._scrollEl.scrollTop;
    const viewportHeight = this._scrollEl.clientHeight;
    const { startIndex, endIndex } = this.viewport.getVisibleRange(scrollTop, viewportHeight);

    this._contentEl.innerHTML = '';

    const topSpacer = document.createElement('div');
    topSpacer.className = 'hm-spacer';
    let topHeight = 0;
    for (let i = 0; i < startIndex; i++) topHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
    topSpacer.style.height = topHeight + 'px';
    this._contentEl.appendChild(topSpacer);

    for (let i = startIndex; i < endIndex && i < blocks.length; i++) {
      this._contentEl.appendChild(this._createBlockWrapper(blocks[i]));
    }

    const bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'hm-spacer';
    let bottomHeight = 0;
    for (let i = endIndex; i < blocks.length; i++) bottomHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
    bottomSpacer.style.height = bottomHeight + 'px';
    this._contentEl.appendChild(bottomSpacer);
  }

  _createBlockWrapper(block) {
    const wrapper = document.createElement('div');
    wrapper.className = 'hm-block-wrapper';
    wrapper.dataset.blockId = block.id;
    wrapper.dataset.blockType = block.type;

    if (!this.config.readOnly) {
      const handle = document.createElement('div');
      handle.className = 'hm-drag-handle';
      handle.innerHTML = '⠿';
      handle.title = 'Drag to reorder';
      handle.addEventListener('mousedown', (e) => this.dragDrop.start(block.id, e));
      wrapper.appendChild(handle);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'hm-block-content';

    if (this.activeBlockId === block.id && !this.config.readOnly) {
      wrapper.classList.add('hm-block-active');
      contentDiv.appendChild(this._createBlockTextarea(block));
    } else {
      contentDiv.innerHTML = BlockRenderers.render(block);
    }

    wrapper.appendChild(contentDiv);

    if (!this.config.readOnly) {
      wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('.hm-drag-handle') || e.target.closest('.hm-block-textarea')) return;
        this._focusBlock(block.id);
      });
    }

    return wrapper;
  }

  _createBlockTextarea(block) {
    const textarea = document.createElement('textarea');
    textarea.className = 'hm-block-textarea';
    textarea.value = block.content;
    textarea.spellcheck = true;
    textarea.setAttribute('data-block-id', block.id);

    const autoResize = () => {
      textarea.style.height = '0';
      textarea.style.height = Math.max(textarea.scrollHeight, 24) + 'px';
    };

    textarea.addEventListener('input', () => { autoResize(); this._onBlockEdit(block.id, textarea.value); });
    textarea.addEventListener('keydown', (e) => this._onTextareaKeydown(e, block, textarea));
    textarea.addEventListener('blur', (e) => {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && this._editorEl.contains(relatedTarget)) return;
      setTimeout(() => { if (this.activeBlockId === block.id && !this._destroyed) this._blurBlock(); }, 150);
    });

    requestAnimationFrame(() => { autoResize(); textarea.focus(); });
    return textarea;
  }

  // --- Block Focus / Blur ---

  _focusBlock(blockId) {
    if (this.activeBlockId === blockId || this.config.readOnly) return;

    const block = this.bridge.blocks.find(b => b.id === blockId);
    if (!block) return;

    if (this.activeBlockId) this._commitActiveBlock();

    this.activeBlockId = blockId;
    if (this.config.onBlockFocus) this.config.onBlockFocus(block);
    this._renderAllBlocks();

    this.container.dispatchEvent(new CustomEvent('hypermark-block-focus', { detail: { blockId, block } }));
  }

  _blurBlock() {
    if (!this.activeBlockId) return;

    const block = this.bridge.blocks.find(b => b.id === this.activeBlockId);
    if (block && this.config.onBlockBlur) this.config.onBlockBlur(block);

    this._commitActiveBlock();
    this.activeBlockId = null;
    this._ensureAtLeastOneBlock();
    this._renderAllBlocks();
  }

  _commitActiveBlock() {
    if (!this.activeBlockId) return;

    const textarea = this._contentEl.querySelector('.hm-block-textarea');
    if (!textarea) return;

    let block = this.bridge.blocks.find(b => b.id === this.activeBlockId);
    if (!block) {
      const taBlockId = textarea.getAttribute('data-block-id');
      if (taBlockId && taBlockId !== this.activeBlockId) {
        block = this.bridge.blocks.find(b => b.id === taBlockId);
        if (block) this.activeBlockId = taBlockId;
      }
    }
    if (!block) return;

    const newContent = textarea.value;
    if (newContent === block.content) return;

    // Synchronous content update, async re-parse
    if (block.from === block.to && this.bridge.length === 0) {
      if (newContent.length > 0) {
        this.bridge._content = newContent;
      }
    } else {
      this.bridge._content = this.bridge._content.substring(0, block.from) + newContent + this.bridge._content.substring(block.to);
    }

    // Fire async re-parse (non-blocking for commit)
    this.bridge._parse().then(() => {
      this._ensureAtLeastOneBlock();
    });

    this._dispatchChange();
  }

  // --- Block Editing ---

  async _onBlockEdit(blockId, newContent) {
    let block = this.bridge.blocks.find(b => b.id === blockId);
    if (!block) return;

    const oldContent = block.content;
    if (newContent === oldContent) return;

    this.history.push(new Transaction({
      type: 'replace',
      offset: block.from,
      inserted: newContent,
      deleted: oldContent,
    }));

    const editFrom = block.from;
    const editOldTo = block.to;

    // Update content string
    if (editFrom === editOldTo && this.bridge.length === 0) {
      this.bridge._content = newContent;
    } else {
      this.bridge._content = this.bridge._content.substring(0, editFrom) + newContent + this.bridge._content.substring(editOldTo);
    }

    // Re-parse via Rust
    await this.bridge._parse();
    this._ensureAtLeastOneBlock();

    // Update activeBlockId if block ID changed
    const updatedBlock = this.bridge.blocks.find(b => b.id === blockId);
    if (!updatedBlock) {
      const replacement = this.bridge.blockAt(editFrom);
      if (replacement) {
        if (this.activeBlockId === blockId) this.activeBlockId = replacement.id;
        const textarea = this._contentEl.querySelector(`.hm-block-textarea[data-block-id="${blockId}"]`);
        if (textarea) textarea.setAttribute('data-block-id', replacement.id);
      }
    }

    this._dispatchChange();
    this._scheduleAutoSave();
    this._checkSlashTrigger(this.activeBlockId || blockId, newContent);
  }

  _checkSlashTrigger(blockId, content) {
    const textarea = this._contentEl.querySelector(`.hm-block-textarea[data-block-id="${blockId}"]`);
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const lineText = textBeforeCursor.substring(lineStart);

    if (lineText.startsWith('/')) {
      const query = lineText.substring(1);
      const rect = textarea.getBoundingClientRect();
      const containerRect = this._contentEl.getBoundingClientRect();
      const lines = textBeforeCursor.split('\n');
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
      const y = rect.top - containerRect.top + (lines.length * lineHeight) + this._scrollEl.scrollTop;

      this.slashMenu.show(40, y, (cmd) => this._executeSlashCommand(blockId, cmd, lineStart, cursorPos));
      this.slashMenu.filter(query);
    } else if (this.slashMenu.visible) {
      this.slashMenu.hide();
    }
  }

  _executeSlashCommand(blockId, command, lineStart, cursorPos) {
    const textarea = this._contentEl.querySelector(`.hm-block-textarea[data-block-id="${blockId}"]`);
    if (!textarea) return;

    const content = textarea.value;
    const before = content.substring(0, lineStart);
    const after = content.substring(cursorPos);
    textarea.value = before + command.markdown + after;

    const newPos = lineStart + (command.cursorOffset ?? command.markdown.length);
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // --- Keyboard Handling ---

  _onTextareaKeydown(e, block, textarea) {
    if (this.slashMenu.visible) {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.slashMenu.down(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.slashMenu.up(); return; }
      if (e.key === 'Enter') { e.preventDefault(); this.slashMenu.confirm(); return; }
      if (e.key === 'Escape') { e.preventDefault(); this.slashMenu.hide(); return; }
    }

    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); this._undo(); return; }
    if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); this._redo(); return; }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const textBefore = textarea.value.substring(0, textarea.selectionStart);
      if (!textBefore.includes('\n')) { e.preventDefault(); this._focusPreviousBlock(block.id); return; }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const textAfter = textarea.value.substring(textarea.selectionStart);
      if (!textAfter.includes('\n')) { e.preventDefault(); this._focusNextBlock(block.id); return; }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code_block') return;
      e.preventDefault();
      const cursorPos = textarea.selectionStart;
      const contentBefore = textarea.value.substring(0, cursorPos);
      const contentAfter = textarea.value.substring(cursorPos);
      if (textarea.value.trim() === '' && contentBefore.trim() === '') { this._blurBlock(); return; }
      this._splitBlockAtCursor(block, contentBefore, contentAfter);
      return;
    }

    if (e.key === 'Escape') { e.preventDefault(); this._blurBlock(); return; }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = block.type === 'code_block' ? '  ' : '    ';
      textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (e.key === 'Backspace' && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
      e.preventDefault();
      this._mergeWithPreviousBlock(block.id);
      return;
    }
  }

  _focusPreviousBlock(currentBlockId) {
    const blocks = this.bridge.blocks;
    const idx = blocks.findIndex(b => b.id === currentBlockId);
    if (idx > 0) {
      this._focusBlock(blocks[idx - 1].id);
      requestAnimationFrame(() => {
        const textarea = this._contentEl.querySelector('.hm-block-textarea');
        if (textarea) textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      });
    }
  }

  _focusNextBlock(currentBlockId) {
    const blocks = this.bridge.blocks;
    const idx = blocks.findIndex(b => b.id === currentBlockId);
    if (idx < blocks.length - 1) {
      this._focusBlock(blocks[idx + 1].id);
      requestAnimationFrame(() => {
        const textarea = this._contentEl.querySelector('.hm-block-textarea');
        if (textarea) textarea.selectionStart = textarea.selectionEnd = 0;
      });
    }
  }

  async _mergeWithPreviousBlock(blockId) {
    const blocks = this.bridge.blocks;
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx <= 0) return;

    const prevBlock = blocks[idx - 1];
    const currentBlock = blocks[idx];
    const mergedContent = prevBlock.content + '\n' + currentBlock.content;

    const originalContent = this.bridge.slice(prevBlock.from, currentBlock.to);
    this.history.push(new Transaction({ type: 'replace', offset: prevBlock.from, inserted: mergedContent, deleted: originalContent }));

    await this.bridge.replace(prevBlock.from, currentBlock.to, mergedContent);
    this._ensureAtLeastOneBlock();
    this.activeBlockId = null;

    const newBlocks = this.bridge.blocks;
    if (newBlocks.length > 0) {
      const targetIdx = Math.min(idx - 1, newBlocks.length - 1);
      const cursorOffset = prevBlock.content.length;
      this._focusBlock(newBlocks[targetIdx].id);
      requestAnimationFrame(() => {
        const ta = this._contentEl.querySelector('.hm-block-textarea');
        if (ta) { ta.selectionStart = ta.selectionEnd = cursorOffset; ta.focus(); }
      });
    } else {
      this._renderAllBlocks();
    }

    this._dispatchChange();
  }

  async _splitBlockAtCursor(block, contentBefore, contentAfter) {
    let currentBlock = this.bridge.blocks.find(b => b.id === block.id);
    if (!currentBlock) currentBlock = this.bridge.blockAt(block.from);
    if (!currentBlock) return;

    const oldContent = currentBlock.content;
    const newBufferContent = contentBefore + '\n' + contentAfter;

    this.history.push(new Transaction({ type: 'replace', offset: currentBlock.from, inserted: newBufferContent, deleted: oldContent }));

    await this.bridge.replace(currentBlock.from, currentBlock.to, newBufferContent);
    this._ensureAtLeastOneBlock();

    const newBlockOffset = currentBlock.from + contentBefore.length + 1;
    let newBlock = this.bridge.blockAt(newBlockOffset);

    if (!newBlock) {
      const blocks = this.bridge.blocks;
      const currentIdx = blocks.findIndex(b => b.from <= currentBlock.from && b.to >= currentBlock.from);
      if (currentIdx >= 0 && currentIdx + 1 < blocks.length) newBlock = blocks[currentIdx + 1];
    }

    if (!newBlock) newBlock = this.bridge.blockAt(currentBlock.from);

    this.activeBlockId = null;

    if (newBlock) {
      this._focusBlock(newBlock.id);
      requestAnimationFrame(() => {
        const ta = this._contentEl.querySelector('.hm-block-textarea');
        if (ta) { ta.selectionStart = ta.selectionEnd = 0; ta.focus(); }
      });
    } else {
      this._renderAllBlocks();
    }

    this._dispatchChange();
  }

  // --- Block Reorder (Drag & Drop) ---

  async _reorderBlock(blockId, target) {
    const blocks = this.bridge.blocks;
    const sourceIdx = blocks.findIndex(b => b.id === blockId);
    if (sourceIdx === -1) return;

    const sourceBlock = blocks[sourceIdx];
    const sourceContent = sourceBlock.content;

    let deleteFrom = sourceBlock.from;
    let deleteTo = sourceBlock.to;
    const fullText = this.bridge.toString();
    if (deleteTo < fullText.length && fullText[deleteTo] === '\n') deleteTo++;

    await this.bridge.delete(deleteFrom, deleteTo);

    let insertIdx = target.index;
    if (sourceIdx < target.index) insertIdx--;
    if (!target.before) insertIdx++;
    insertIdx = Math.max(0, Math.min(insertIdx, this.bridge.blocks.length));

    let insertOffset;
    if (insertIdx >= this.bridge.blocks.length) insertOffset = this.bridge.length;
    else insertOffset = this.bridge.blocks[insertIdx].from;

    let insertText = sourceContent;
    if (insertOffset > 0 && this.bridge.slice(insertOffset - 1, insertOffset) !== '\n') insertText = '\n' + insertText;
    if (insertOffset < this.bridge.length && this.bridge.slice(insertOffset, insertOffset + 1) !== '\n') insertText = insertText + '\n';

    await this.bridge.insert(insertOffset, insertText);
    this._ensureAtLeastOneBlock();
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  // --- Undo / Redo ---

  async _undo() {
    this._commitActiveBlock();
    const batch = this.history.undo();
    if (!batch) return;

    for (const tx of batch) {
      if (tx.deleted) {
        this.bridge._content = this.bridge._content.substring(0, tx.offset) + this.bridge._content.substring(tx.offset + tx.deleted.length);
      }
      if (tx.inserted) {
        this.bridge._content = this.bridge._content.substring(0, tx.offset) + tx.inserted + this.bridge._content.substring(tx.offset);
      }
    }

    await this.bridge._parse();
    this._ensureAtLeastOneBlock();
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  async _redo() {
    const batch = this.history.redo();
    if (!batch) return;

    for (const tx of batch) {
      if (tx.deleted) {
        this.bridge._content = this.bridge._content.substring(0, tx.offset) + this.bridge._content.substring(tx.offset + tx.deleted.length);
      }
      if (tx.inserted) {
        this.bridge._content = this.bridge._content.substring(0, tx.offset) + tx.inserted + this.bridge._content.substring(tx.offset);
      }
    }

    await this.bridge._parse();
    this._ensureAtLeastOneBlock();
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  // --- Events ---

  _bindEvents() {
    this._editorEl.addEventListener('mousedown', (e) => {
      if (e.target === this._contentEl || e.target === this._scrollEl) return;
      if (!e.target.closest('.hm-block-wrapper') && this.activeBlockId) this._blurBlock();
    });

    if (this.config.virtualViewport) {
      this._scrollEl.addEventListener('scroll', () => {
        if (this.bridge.blocks.length > 50) this._renderVirtualized(this.bridge.blocks);
      });
    }

    this._editorEl.addEventListener('keydown', (e) => {
      if (!this.activeBlockId) {
        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); this._undo(); }
        if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) { e.preventDefault(); this._redo(); }
      }
    });
  }

  _dispatchChange() {
    const content = this.bridge.toString();
    if (this.config.onChange) this.config.onChange(content);
    this.container.dispatchEvent(new CustomEvent('hypermark-change', { detail: { content } }));
  }

  _scheduleAutoSave() {
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this.container.dispatchEvent(new CustomEvent('hypermark-autosave', { detail: { content: this.bridge.toString() } }));
    }, this.config.autoSaveDelay);
  }

  _getBlockElement(blockId) {
    return this._contentEl.querySelector(`[data-block-id="${blockId}"]`);
  }

  // --- Public API ---

  getContent() {
    if (this.activeBlockId) this._commitActiveBlock();
    return this.bridge.toString();
  }

  async setContent(markdown) {
    this.activeBlockId = null;
    await this.bridge.setContent(markdown);
    this._ensureAtLeastOneBlock();
    this.history.clear();
    this._renderAllBlocks();
    this._dispatchChange();
  }

  async insertAt(offset, text) {
    await this.bridge.insert(offset, text);
    this.history.push(new Transaction({ type: 'insert', offset, inserted: text }));
    this._ensureAtLeastOneBlock();
    this._renderAllBlocks();
    this._dispatchChange();
  }

  focusBlock(blockId) { this._focusBlock(blockId); }

  focusBlockByIndex(index) {
    const block = this.bridge.blocks[index];
    if (block) this._focusBlock(block.id);
  }

  scrollToBlock(blockId) {
    const el = this._getBlockElement(blockId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  getBlocks() { return [...this.bridge.blocks]; }
  getBlock(blockId) { return this.bridge.blocks.find(b => b.id === blockId); }

  setReadOnly(readOnly) {
    this.config.readOnly = readOnly;
    if (readOnly && this.activeBlockId) this._blurBlock();
    this._renderAllBlocks();
  }

  registerSlashCommands(commands) {
    this.slashMenu.commands = [...this.slashMenu.commands, ...commands];
  }

  search(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return this.bridge.blocks
      .map(block => {
        const lower = block.content.toLowerCase();
        const matches = [];
        let pos = 0;
        while ((pos = lower.indexOf(lowerQuery, pos)) !== -1) { matches.push(pos); pos += query.length; }
        return matches.length > 0 ? { block, matches } : null;
      })
      .filter(Boolean);
  }

  getTableOfContents() {
    return this.bridge.blocks
      .filter(b => b.type === 'heading')
      .map(b => ({
        level: b.meta.level,
        text: b.meta.text || b.content.replace(/^#{1,6}\s+/, ''),
        blockId: b.id,
        anchor: (b.meta.text || b.content.replace(/^#{1,6}\s+/, '')).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      }));
  }

  getStats() {
    const content = this.bridge.toString();
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { words, characters: content.length, blocks: this.bridge.blocks.length, lines: this.bridge.lineCount };
  }

  insertAtCursor(text) {
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return;
      }
    }
    const offset = this.bridge.length;
    const insertText = (offset > 0 ? '\n' : '') + text;
    this.bridge.insert(offset, insertText).then(() => {
      this._renderAllBlocks();
      this._dispatchChange();
    });
  }

  wrapSelection(before, after) {
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selected = value.substring(start, end) || 'text';
        textarea.value = value.substring(0, start) + before + selected + after + value.substring(end);
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + selected.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
    }
  }

  destroy() {
    this._destroyed = true;
    if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
    this.slashMenu.hide();
    this.container.innerHTML = '';
  }
}


// ============================================================================
// SECTION 10: ES MODULE EXPORTS
// ============================================================================

export {
  Block,
  MarkdownBridge,
  BlockRenderers,
  renderInline,
  renderInlineAsync,
  Transaction,
  TransactionHistory,
  SlashCommandMenu,
  DEFAULT_SLASH_COMMANDS,
  VirtualViewport,
  BlockDragDrop,
  HyperMarkEditor,
};

export default HyperMarkEditor;
