/**
 * HyperMark Editor Engine — Oxidian Studio
 * 
 * A hybrid-rendered, block-aware Markdown editor that keeps raw Markdown
 * as source-of-truth while showing live-rendered blocks.
 * 
 * Core components:
 *   - RopeBuffer: Piece-table based buffer for O(log n) edits
 *   - BlockSplitter: Incremental Markdown block parser
 *   - HyperMarkEditor: Main editor engine with virtual viewport
 * 
 * @module hypermark
 * @version 0.1.0
 * @author FORGE — Backend Lead, Oxidian Studio
 * @license MIT
 */

// ============================================================================
// SECTION 1: ROPE BUFFER — Piece Table Implementation
// ============================================================================

/**
 * A piece in the piece table. References a span in either the original
 * or add buffer.
 */
class Piece {
  /**
   * @param {'original'|'add'} source - Which buffer this piece references
   * @param {number} start - Start offset in the source buffer
   * @param {number} length - Length of the piece
   * @param {number[]} lineBreaks - Offsets of \n within this piece (relative to start)
   */
  constructor(source, start, length, lineBreaks = []) {
    this.source = source;
    this.start = start;
    this.length = length;
    this.lineBreaks = lineBreaks;
  }

  /**
   * Split this piece at a relative offset.
   * @param {number} offset - Relative offset within this piece
   * @returns {[Piece, Piece]}
   */
  split(offset) {
    const leftBreaks = this.lineBreaks.filter(lb => lb < offset);
    const rightBreaks = this.lineBreaks.filter(lb => lb >= offset).map(lb => lb - offset);
    return [
      new Piece(this.source, this.start, offset, leftBreaks),
      new Piece(this.source, this.start + offset, this.length - offset, rightBreaks),
    ];
  }
}

/**
 * Balanced tree node for the piece table.
 * Implements a treap (tree + heap) for expected O(log n) operations.
 */
class PieceNode {
  /**
   * @param {Piece} piece
   * @param {number} priority - Random priority for treap balancing
   */
  constructor(piece, priority) {
    this.piece = piece;
    this.priority = priority;
    this.left = null;
    this.right = null;
    // Subtree aggregates
    this.size = piece.length;
    this.lineBreakCount = piece.lineBreaks.length;
  }

  update() {
    this.size = this.piece.length
      + (this.left ? this.left.size : 0)
      + (this.right ? this.right.size : 0);
    this.lineBreakCount = this.piece.lineBreaks.length
      + (this.left ? this.left.lineBreakCount : 0)
      + (this.right ? this.right.lineBreakCount : 0);
    return this;
  }
}

/**
 * Treap-based piece table for O(log n) insert/delete operations.
 * The RopeBuffer is the source-of-truth for all document content.
 */
class RopeBuffer {
  /**
   * @param {string} [initialContent='']
   */
  constructor(initialContent = '') {
    /** @private */
    this._original = initialContent;
    /** @private */
    this._add = '';
    /** @private */
    this._root = null;
    /** @private */
    this._length = 0;
    /** @private */
    this._lineCount = 1;
    /** @private */
    this._cachedString = null;
    /** @private */
    this._cacheValid = false;

    if (initialContent.length > 0) {
      const lineBreaks = RopeBuffer._findLineBreaks(initialContent, 0, initialContent.length);
      const piece = new Piece('original', 0, initialContent.length, lineBreaks);
      this._root = new PieceNode(piece, Math.random());
      this._root.update();
      this._length = initialContent.length;
      this._lineCount = lineBreaks.length + 1;
    }
  }

  /** @returns {number} Total document length in characters */
  get length() {
    return this._length;
  }

  /** @returns {number} Total number of lines */
  get lineCount() {
    return this._lineCount;
  }

  /**
   * Find all \n positions in a string slice.
   * @private
   */
  static _findLineBreaks(str, from, to) {
    const breaks = [];
    for (let i = from; i < to; i++) {
      if (str.charCodeAt(i) === 10) breaks.push(i - from);
    }
    return breaks;
  }

  /**
   * Get the buffer text for a piece.
   * @private
   * @param {Piece} piece
   * @returns {string}
   */
  _getText(piece) {
    const buf = piece.source === 'original' ? this._original : this._add;
    return buf.substring(piece.start, piece.start + piece.length);
  }

  // --- Treap operations ---

  /**
   * Split treap by document offset.
   * @private
   * @param {PieceNode|null} node
   * @param {number} offset
   * @returns {[PieceNode|null, PieceNode|null]}
   */
  _split(node, offset) {
    if (!node) return [null, null];

    const leftSize = node.left ? node.left.size : 0;

    if (offset <= leftSize) {
      const [ll, lr] = this._split(node.left, offset);
      node.left = lr;
      node.update();
      return [ll, node];
    } else if (offset >= leftSize + node.piece.length) {
      const [rl, rr] = this._split(node.right, offset - leftSize - node.piece.length);
      node.right = rl;
      node.update();
      return [node, rr];
    } else {
      // Split falls inside this piece
      const pieceOffset = offset - leftSize;
      const [leftPiece, rightPiece] = node.piece.split(pieceOffset);

      const leftNode = new PieceNode(leftPiece, node.priority);
      leftNode.left = node.left;
      leftNode.right = null;
      leftNode.update();

      const rightNode = new PieceNode(rightPiece, Math.random());
      rightNode.left = null;
      rightNode.right = node.right;
      rightNode.update();

      return [leftNode, rightNode];
    }
  }

  /**
   * Merge two treaps.
   * @private
   */
  _merge(left, right) {
    if (!left) return right;
    if (!right) return left;

    if (left.priority > right.priority) {
      left.right = this._merge(left.right, right);
      left.update();
      return left;
    } else {
      right.left = this._merge(left, right.left);
      right.update();
      return right;
    }
  }

  /**
   * Insert text at the given offset.
   * @param {number} offset
   * @param {string} text
   * @returns {RopeBuffer} this (mutates)
   */
  insert(offset, text) {
    if (text.length === 0) return this;
    if (offset < 0 || offset > this._length) {
      throw new RangeError(`Insert offset ${offset} out of range [0, ${this._length}]`);
    }

    this._cacheValid = false;

    const addStart = this._add.length;
    this._add += text;

    const lineBreaks = RopeBuffer._findLineBreaks(text, 0, text.length);
    const piece = new Piece('add', addStart, text.length, lineBreaks);
    const newNode = new PieceNode(piece, Math.random());
    newNode.update();

    const [left, right] = this._split(this._root, offset);
    this._root = this._merge(this._merge(left, newNode), right);

    this._length += text.length;
    this._lineCount += lineBreaks.length;

    return this;
  }

  /**
   * Delete a range of text.
   * @param {number} from - Start offset (inclusive)
   * @param {number} to - End offset (exclusive)
   * @returns {RopeBuffer} this (mutates)
   */
  delete(from, to) {
    if (from >= to) return this;
    if (from < 0 || to > this._length) {
      throw new RangeError(`Delete range [${from}, ${to}) out of bounds [0, ${this._length})`);
    }

    this._cacheValid = false;

    // Count line breaks being deleted
    const deleted = this.slice(from, to);
    let removedBreaks = 0;
    for (let i = 0; i < deleted.length; i++) {
      if (deleted.charCodeAt(i) === 10) removedBreaks++;
    }

    const [left, mid] = this._split(this._root, from);
    const [, right] = this._split(mid, to - from);
    this._root = this._merge(left, right);

    this._length -= (to - from);
    this._lineCount -= removedBreaks;

    return this;
  }

  /**
   * Replace a range with new text.
   * @param {number} from
   * @param {number} to
   * @param {string} text
   * @returns {RopeBuffer}
   */
  replace(from, to, text) {
    this.delete(from, to);
    this.insert(from, text);
    return this;
  }

  /**
   * Extract a substring.
   * @param {number} from
   * @param {number} to
   * @returns {string}
   */
  slice(from, to) {
    if (from >= to) return '';
    const parts = [];
    this._collectSlice(this._root, from, to, 0, parts);
    return parts.join('');
  }

  /**
   * @private
   */
  _collectSlice(node, from, to, base, parts) {
    if (!node || from >= to) return;

    const leftSize = node.left ? node.left.size : 0;
    const nodeStart = base + leftSize;
    const nodeEnd = nodeStart + node.piece.length;

    // Recurse left
    if (from < nodeStart) {
      this._collectSlice(node.left, from, Math.min(to, nodeStart), base, parts);
    }

    // This piece
    if (from < nodeEnd && to > nodeStart) {
      const sliceStart = Math.max(from, nodeStart) - nodeStart;
      const sliceEnd = Math.min(to, nodeEnd) - nodeStart;
      const text = this._getText(node.piece);
      parts.push(text.substring(sliceStart, sliceEnd));
    }

    // Recurse right
    if (to > nodeEnd) {
      this._collectSlice(node.right, Math.max(from, nodeEnd), to, nodeEnd, parts);
    }
  }

  /**
   * Get line information at a given offset.
   * @param {number} offset
   * @returns {{ line: number, col: number, lineStart: number, lineEnd: number }}
   */
  lineAt(offset) {
    const text = this.toString();
    let line = 0;
    let lineStart = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text.charCodeAt(i) === 10) {
        line++;
        lineStart = i + 1;
      }
    }
    let lineEnd = text.indexOf('\n', offset);
    if (lineEnd === -1) lineEnd = text.length;
    return { line, col: offset - lineStart, lineStart, lineEnd };
  }

  /**
   * Get the document offset for a given line and column.
   * @param {number} line - 0-based line number
   * @param {number} col - 0-based column
   * @returns {number}
   */
  offsetAt(line, col) {
    const text = this.toString();
    let currentLine = 0;
    for (let i = 0; i < text.length; i++) {
      if (currentLine === line) return Math.min(i + col, text.length);
      if (text.charCodeAt(i) === 10) currentLine++;
    }
    return text.length;
  }

  /**
   * Serialize the entire buffer to a string.
   * Always returns valid Markdown.
   * @returns {string}
   */
  toString() {
    if (this._cacheValid) return this._cachedString;
    const parts = [];
    this._inorder(this._root, parts);
    this._cachedString = parts.join('');
    this._cacheValid = true;
    return this._cachedString;
  }

  /** @private */
  _inorder(node, parts) {
    if (!node) return;
    this._inorder(node.left, parts);
    parts.push(this._getText(node.piece));
    this._inorder(node.right, parts);
  }

  /**
   * Create a snapshot (shallow clone) for undo history.
   * @returns {string}
   */
  snapshot() {
    return this.toString();
  }
}


// ============================================================================
// SECTION 2: BLOCK SPLITTER — Incremental Markdown Parser
// ============================================================================

/**
 * @typedef {'heading'|'paragraph'|'code_block'|'blockquote'|'list'|'table'|'thematic_break'|'frontmatter'|'math_block'|'callout'|'empty'} BlockType
 */

/**
 * Represents a single Markdown block.
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

/**
 * Splits a Markdown document into blocks.
 * Regex-based first pass. Supports incremental re-parse on edits.
 */
class BlockSplitter {
  constructor() {
    /** @type {Block[]} */
    this.blocks = [];
    /** @private */
    this._idCounter = 0;
    /** @private */
    this._blockIdMap = new Map(); // content-hash -> id for stable IDs
  }

  /** @private */
  _nextId() {
    return 'blk_' + (++this._idCounter);
  }

  /**
   * Full parse of a markdown string into blocks.
   * @param {string} text
   * @returns {Block[]}
   */
  parse(text) {
    this.blocks = this._splitIntoBlocks(text);
    return this.blocks;
  }

  /**
   * Incremental update: re-parses only the affected region.
   * @param {string} text - Full document text after edit
   * @param {number} editFrom - Start offset of the edit
   * @param {number} editTo - End offset of the edit (in new text)
   * @param {number} oldLength - Length of deleted region
   * @returns {Block[]}
   */
  update(text, editFrom, editTo, oldLength) {
    if (this.blocks.length === 0) {
      return this.parse(text);
    }

    // Find which blocks are affected by the edit
    const delta = (editTo - editFrom) - oldLength;
    let firstAffected = -1;
    let lastAffected = -1;

    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      // A block is affected if the edit range overlaps it
      if (b.to > editFrom && b.from < editFrom + oldLength) {
        if (firstAffected === -1) firstAffected = i;
        lastAffected = i;
      }
    }

    // If no block was directly hit, find the block containing editFrom
    if (firstAffected === -1) {
      for (let i = 0; i < this.blocks.length; i++) {
        if (this.blocks[i].from <= editFrom && this.blocks[i].to >= editFrom) {
          firstAffected = i;
          lastAffected = i;
          break;
        }
      }
    }

    // Fallback: full reparse
    if (firstAffected === -1) {
      return this.parse(text);
    }

    // Expand range by one block in each direction for safety
    firstAffected = Math.max(0, firstAffected - 1);
    lastAffected = Math.min(this.blocks.length - 1, lastAffected + 1);

    // Determine the text region to re-parse
    const regionFrom = this.blocks[firstAffected].from;
    const oldRegionTo = this.blocks[lastAffected].to;
    const regionTo = oldRegionTo + delta;

    const regionText = text.substring(regionFrom, regionTo);
    const newBlocks = this._splitIntoBlocks(regionText, regionFrom);

    // Build new block array
    const before = this.blocks.slice(0, firstAffected);
    const after = this.blocks.slice(lastAffected + 1).map(b => {
      return new Block({
        id: b.id,
        type: b.type,
        from: b.from + delta,
        to: b.to + delta,
        content: b.content,
        meta: b.meta,
      });
    });

    this.blocks = [...before, ...newBlocks, ...after];
    return this.blocks;
  }

  /**
   * Split text into blocks. Core parsing logic.
   * @private
   * @param {string} text
   * @param {number} [baseOffset=0]
   * @returns {Block[]}
   */
  _splitIntoBlocks(text, baseOffset = 0) {
    const blocks = [];
    const lines = text.split('\n');
    let i = 0;
    let offset = baseOffset;

    while (i < lines.length) {
      const line = lines[i];
      const lineStart = offset;

      // --- Frontmatter (only at document start) ---
      if (lineStart === 0 && i === 0 && baseOffset === 0 && line.trim() === '---') {
        let end = i + 1;
        while (end < lines.length && lines[end].trim() !== '---') end++;
        if (end < lines.length) end++; // include closing ---
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({
          id: this._nextId(),
          type: 'frontmatter',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: {},
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- Empty line ---
      if (line.trim() === '') {
        offset += line.length + 1;
        i++;
        continue;
      }

      // --- Thematic break ---
      if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
        blocks.push(new Block({
          id: this._nextId(),
          type: 'thematic_break',
          from: lineStart,
          to: lineStart + line.length,
          content: line,
          meta: {},
        }));
        offset += line.length + 1;
        i++;
        continue;
      }

      // --- Heading (ATX) ---
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        blocks.push(new Block({
          id: this._nextId(),
          type: 'heading',
          from: lineStart,
          to: lineStart + line.length,
          content: line,
          meta: { level: headingMatch[1].length, text: headingMatch[2] },
        }));
        offset += line.length + 1;
        i++;
        continue;
      }

      // --- Fenced code block ---
      const codeMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
      if (codeMatch) {
        const fence = codeMatch[1];
        const lang = codeMatch[2].trim();
        let end = i + 1;
        while (end < lines.length) {
          if (lines[end].startsWith(fence.charAt(0).repeat(fence.length)) &&
              lines[end].trim().length <= fence.length + 1) {
            end++;
            break;
          }
          end++;
        }
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({
          id: this._nextId(),
          type: 'code_block',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: { language: lang || null, fence },
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- Math block ($$) ---
      if (line.trim() === '$$') {
        let end = i + 1;
        while (end < lines.length && lines[end].trim() !== '$$') end++;
        if (end < lines.length) end++;
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({
          id: this._nextId(),
          type: 'math_block',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: {},
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- Callout / Blockquote ---
      if (line.startsWith('>')) {
        let end = i;
        while (end < lines.length && (lines[end].startsWith('>') || (lines[end].trim() !== '' && !lines[end].match(/^[#\-\*`~$$|]/) && end > i))) {
          end++;
        }
        const content = lines.slice(i, end).join('\n');
        // Check if it's a callout
        const calloutMatch = content.match(/^>\s*\[!(\w+)\]/);
        if (calloutMatch) {
          blocks.push(new Block({
            id: this._nextId(),
            type: 'callout',
            from: lineStart,
            to: lineStart + content.length,
            content,
            meta: { calloutType: calloutMatch[1].toLowerCase() },
          }));
        } else {
          blocks.push(new Block({
            id: this._nextId(),
            type: 'blockquote',
            from: lineStart,
            to: lineStart + content.length,
            content,
            meta: {},
          }));
        }
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- Table ---
      if (i + 1 < lines.length && lines[i + 1].match(/^\|?[\s\-:|]+\|/)) {
        let end = i;
        while (end < lines.length && (lines[end].includes('|') || lines[end].match(/^\|?[\s\-:|]+\|/))) {
          end++;
        }
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({
          id: this._nextId(),
          type: 'table',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: {},
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- List (ordered or unordered) ---
      const listMatch = line.match(/^(\s*)([-*+]|\d+[.)]) /);
      if (listMatch) {
        let end = i;
        while (end < lines.length) {
          const l = lines[end];
          if (l.trim() === '') {
            // Empty line: continue if next line is a list continuation
            if (end + 1 < lines.length && (lines[end + 1].match(/^(\s*)([-*+]|\d+[.)]) /) || lines[end + 1].match(/^\s{2,}/))) {
              end++;
              continue;
            }
            break;
          }
          if (l.match(/^(\s*)([-*+]|\d+[.)]) /) || l.match(/^\s{2,}\S/)) {
            end++;
            continue;
          }
          break;
        }
        if (end === i) end = i + 1;
        const content = lines.slice(i, end).join('\n');
        const ordered = /^\s*\d+[.)]/.test(line);
        blocks.push(new Block({
          id: this._nextId(),
          type: 'list',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: { ordered },
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
        continue;
      }

      // --- Paragraph (default: collect lines until blank or block start) ---
      {
        let end = i;
        while (end < lines.length) {
          const l = lines[end];
          if (l.trim() === '') break;
          if (end > i) {
            // Check if this line starts a new block type
            if (l.match(/^#{1,6}\s/) || l.match(/^(`{3,}|~{3,})/) ||
                l.startsWith('>') || l.match(/^(\*{3,}|-{3,}|_{3,})\s*$/) ||
                l.match(/^(\s*)([-*+]|\d+[.)]) /) || l.trim() === '$$' ||
                l.trim() === '---') {
              break;
            }
          }
          end++;
        }
        if (end === i) end = i + 1;
        const content = lines.slice(i, end).join('\n');
        blocks.push(new Block({
          id: this._nextId(),
          type: 'paragraph',
          from: lineStart,
          to: lineStart + content.length,
          content,
          meta: {},
        }));
        offset += content.length + (end < lines.length ? 1 : 0);
        i = end;
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

  /**
   * Get blocks visible in a range.
   * @param {number} from
   * @param {number} to
   * @returns {Block[]}
   */
  blocksInRange(from, to) {
    return this.blocks.filter(b => b.to >= from && b.from <= to);
  }
}


// ============================================================================
// SECTION 3: BLOCK RENDERERS — HTML rendering for each block type
// ============================================================================

/**
 * Renders inline Markdown to HTML (bold, italic, code, links, images, etc.)
 * @param {string} text
 * @returns {string}
 */
function renderInline(text) {
  let html = text;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="hm-inline-img" />');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="hm-link">$1</a>');

  // Bold + Italic: ***text*** or ___text___
  html = html.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>');
  html = html.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  html = html.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>');
  html = html.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="hm-inline-code">$1</code>');

  // Highlight: ==text==
  html = html.replace(/==(.+?)==/g, '<mark class="hm-highlight">$1</mark>');

  // Wikilinks: [[page]] or [[page|display]]
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$2</a>');
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$1</a>');

  // Line breaks
  html = html.replace(/  \n/g, '<br>');

  return html;
}

/**
 * Collection of block renderers. Each returns an HTML string.
 */
const BlockRenderers = {

  /**
   * Render a heading block.
   * @param {Block} block
   * @returns {string}
   */
  heading(block) {
    const level = block.meta.level || 1;
    const text = block.content.replace(/^#{1,6}\s+/, '');
    const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    const inlineHtml = renderInline(text);
    return `<h${level} id="${anchor}" class="hm-heading hm-h${level}">${inlineHtml}</h${level}>`;
  },

  /**
   * Render a paragraph block.
   * @param {Block} block
   * @returns {string}
   */
  paragraph(block) {
    return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
  },

  /**
   * Render a code block with syntax highlighting.
   * @param {Block} block
   * @returns {string}
   */
  code_block(block) {
    const lines = block.content.split('\n');
    // Remove fence lines
    const lang = block.meta.language || '';
    const codeLines = lines.slice(1, lines[lines.length - 1].match(/^[`~]/) ? -1 : undefined);
    const code = codeLines.join('\n');
    const highlighted = BlockRenderers._highlightCode(code, lang);

    return `<div class="hm-code-block" data-language="${BlockRenderers._escAttr(lang)}">
      ${lang ? `<div class="hm-code-lang">${BlockRenderers._escHtml(lang)}</div>` : ''}
      <pre class="hm-pre"><code class="hm-code">${highlighted}</code></pre>
    </div>`;
  },

  /**
   * Basic syntax highlighting — detects keywords, strings, comments.
   * @private
   * @param {string} code
   * @param {string} lang
   * @returns {string}
   */
  _highlightCode(code, lang) {
    let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // String highlighting: "..." and '...'
    html = html.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="hm-hl-string">$&</span>');

    // Comment highlighting
    // Single-line comments
    html = html.replace(/(\/\/.*$|#(?!!).*$)/gm, '<span class="hm-hl-comment">$&</span>');
    // Multi-line comments (basic)
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hm-hl-comment">$&</span>');

    // Keywords (common across languages)
    const keywords = [
      'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
      'class', 'import', 'export', 'from', 'default', 'new', 'this', 'super',
      'try', 'catch', 'throw', 'async', 'await', 'yield', 'switch', 'case',
      'break', 'continue', 'typeof', 'instanceof', 'in', 'of', 'do',
      'def', 'self', 'None', 'True', 'False', 'lambda', 'with', 'as',
      'fn', 'pub', 'mod', 'use', 'impl', 'trait', 'struct', 'enum', 'match',
      'int', 'float', 'str', 'bool', 'void', 'null', 'undefined', 'true', 'false',
    ];
    const kwPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    html = html.replace(kwPattern, (m) => {
      // Don't highlight inside already-highlighted spans
      return `<span class="hm-hl-keyword">${m}</span>`;
    });

    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hm-hl-number">$&</span>');

    return html;
  },

  /**
   * Render a blockquote.
   * @param {Block} block
   * @returns {string}
   */
  blockquote(block) {
    const inner = block.content.replace(/^>\s?/gm, '');
    return `<blockquote class="hm-blockquote">
      <div class="hm-bq-bar"></div>
      <div class="hm-bq-content">${renderInline(inner)}</div>
    </blockquote>`;
  },

  /**
   * Render a callout (Obsidian-style).
   * @param {Block} block
   * @returns {string}
   */
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

  /**
   * Render a list (ordered, unordered, with checkbox support).
   * @param {Block} block
   * @returns {string}
   */
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

      // Checkbox support
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

  /**
   * Render a table with zebra striping.
   * @param {Block} block
   * @returns {string}
   */
  table(block) {
    const lines = block.content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;

    const parseRow = (line) => {
      return line.split('|').map(c => c.trim()).filter((_, idx, arr) => {
        // Remove empty first/last from leading/trailing |
        if (idx === 0 && arr[0] === '') return false;
        if (idx === arr.length - 1 && arr[arr.length - 1] === '') return false;
        return true;
      });
    };

    const headers = parseRow(lines[0]);
    // Parse alignment from separator row
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

  /**
   * Render a thematic break.
   * @param {Block} block
   * @returns {string}
   */
  thematic_break(block) {
    return '<hr class="hm-hr" />';
  },

  /**
   * Render frontmatter as a collapsed YAML badge.
   * @param {Block} block
   * @returns {string}
   */
  frontmatter(block) {
    const lines = block.content.split('\n');
    const yamlLines = lines.slice(1, -1).filter(l => l.trim() !== '');
    
    // Don't show anything for empty frontmatter
    if (yamlLines.length === 0) {
      return '';
    }
    
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

  /**
   * Render a math block (basic KaTeX-style).
   * @param {Block} block
   * @returns {string}
   */
  math_block(block) {
    const lines = block.content.split('\n');
    const math = lines.slice(1, -1).join('\n');
    // Basic rendering: just display the math in a styled container
    // Real KaTeX integration would happen via plugin
    return `<div class="hm-math-block">
      <div class="hm-math-content">${BlockRenderers._escHtml(math)}</div>
    </div>`;
  },

  /**
   * Render any block by type.
   * @param {Block} block
   * @returns {string}
   */
  render(block) {
    const renderer = BlockRenderers[block.type];
    if (renderer && typeof renderer === 'function') {
      return renderer(block);
    }
    return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
  },

  /** @private */
  _escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  /** @private */
  _escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};


// ============================================================================
// SECTION 4: TRANSACTION & UNDO/REDO SYSTEM
// ============================================================================

/**
 * Represents a single edit transaction for undo/redo.
 */
class Transaction {
  /**
   * @param {Object} opts
   * @param {'insert'|'delete'|'replace'|'reorder'} opts.type
   * @param {number} opts.offset
   * @param {string} [opts.inserted]
   * @param {string} [opts.deleted]
   * @param {number} opts.timestamp
   */
  constructor({ type, offset, inserted = '', deleted = '', timestamp }) {
    this.type = type;
    this.offset = offset;
    this.inserted = inserted;
    this.deleted = deleted;
    this.timestamp = timestamp || Date.now();
  }

  /**
   * Create the inverse transaction for undo.
   * @returns {Transaction}
   */
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

/**
 * Manages undo/redo history with transaction batching.
 */
class TransactionHistory {
  /**
   * @param {number} [maxSize=500]
   */
  constructor(maxSize = 500) {
    /** @type {Transaction[][]} */
    this._undoStack = [];
    /** @type {Transaction[][]} */
    this._redoStack = [];
    this._maxSize = maxSize;
    this._batchTimeout = 300; // ms — group fast keystrokes
    this._lastPushTime = 0;
    /** @type {Transaction[]} */
    this._currentBatch = [];
  }

  /**
   * Push a transaction. May batch with recent transactions.
   * @param {Transaction} tx
   */
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

    // Clear redo on new edit
    this._redoStack = [];

    // Cap size
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
    }
  }

  /**
   * Flush any pending batch.
   */
  flush() {
    if (this._currentBatch.length > 0) {
      this._undoStack.push([...this._currentBatch]);
      this._currentBatch = [];
    }
  }

  /**
   * Get the next undo batch. Returns null if nothing to undo.
   * @returns {Transaction[]|null}
   */
  undo() {
    this.flush();
    if (this._undoStack.length === 0) return null;
    const batch = this._undoStack.pop();
    this._redoStack.push(batch);
    return batch.slice().reverse().map(tx => tx.invert());
  }

  /**
   * Get the next redo batch. Returns null if nothing to redo.
   * @returns {Transaction[]|null}
   */
  redo() {
    if (this._redoStack.length === 0) return null;
    const batch = this._redoStack.pop();
    this._undoStack.push(batch);
    return batch;
  }

  /**
   * Check if undo is available.
   * @returns {boolean}
   */
  get canUndo() {
    return this._undoStack.length > 0 || this._currentBatch.length > 0;
  }

  /**
   * Check if redo is available.
   * @returns {boolean}
   */
  get canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * Clear all history.
   */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._currentBatch = [];
  }
}


// ============================================================================
// SECTION 5: SLASH COMMAND SYSTEM
// ============================================================================

/**
 * Default slash commands for the HyperMark editor.
 */
const DEFAULT_SLASH_COMMANDS = [
  {
    label: 'Heading 1',
    icon: 'H1',
    description: 'Large heading',
    keywords: ['h1', 'heading', 'title'],
    markdown: '# ',
  },
  {
    label: 'Heading 2',
    icon: 'H2',
    description: 'Medium heading',
    keywords: ['h2', 'heading', 'subtitle'],
    markdown: '## ',
  },
  {
    label: 'Heading 3',
    icon: 'H3',
    description: 'Small heading',
    keywords: ['h3', 'heading'],
    markdown: '### ',
  },
  {
    label: 'Code Block',
    icon: '</>',
    description: 'Fenced code block',
    keywords: ['code', 'fence', 'programming'],
    markdown: '```\n\n```',
    cursorOffset: 4, // after the first newline
  },
  {
    label: 'Quote',
    icon: '❝',
    description: 'Blockquote',
    keywords: ['quote', 'blockquote', 'cite'],
    markdown: '> ',
  },
  {
    label: 'Bullet List',
    icon: '•',
    description: 'Unordered list',
    keywords: ['list', 'bullet', 'unordered', 'ul'],
    markdown: '- ',
  },
  {
    label: 'Numbered List',
    icon: '1.',
    description: 'Ordered list',
    keywords: ['list', 'numbered', 'ordered', 'ol'],
    markdown: '1. ',
  },
  {
    label: 'Task List',
    icon: '☑',
    description: 'Checklist / todo',
    keywords: ['task', 'todo', 'checkbox', 'checklist'],
    markdown: '- [ ] ',
  },
  {
    label: 'Table',
    icon: '▦',
    description: 'Insert a table',
    keywords: ['table', 'grid'],
    markdown: '| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |',
  },
  {
    label: 'Divider',
    icon: '—',
    description: 'Horizontal rule',
    keywords: ['divider', 'hr', 'horizontal', 'rule', 'separator'],
    markdown: '---',
  },
  {
    label: 'Callout',
    icon: '💡',
    description: 'Callout box',
    keywords: ['callout', 'note', 'warning', 'tip', 'admonition'],
    markdown: '> [!note]\n> ',
  },
  {
    label: 'Math Block',
    icon: '∑',
    description: 'LaTeX math block',
    keywords: ['math', 'latex', 'equation', 'formula'],
    markdown: '$$\n\n$$',
    cursorOffset: 3,
  },
];

/**
 * Manages the slash command popup menu.
 */
class SlashCommandMenu {
  /**
   * @param {HTMLElement} container
   * @param {Object[]} commands
   */
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

  /**
   * Show the slash menu near the given position.
   * @param {number} x
   * @param {number} y
   * @param {Function} onSelect - Called with the selected command
   */
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

  /**
   * Hide the slash menu.
   */
  hide() {
    this.visible = false;
    if (this.el) {
      this.el.style.display = 'none';
    }
    this.onSelect = null;
  }

  /**
   * Filter commands based on query text.
   * @param {string} query
   */
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

  /**
   * Navigate selection up.
   */
  up() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
    this._render();
  }

  /**
   * Navigate selection down.
   */
  down() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
    this._render();
  }

  /**
   * Confirm the current selection.
   */
  confirm() {
    if (this.filteredCommands.length === 0) return;
    const cmd = this.filteredCommands[this.selectedIndex];
    if (this.onSelect) this.onSelect(cmd);
    this.hide();
  }

  /** @private */
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

    // Click handlers
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

/**
 * Manages virtualized rendering — only visible blocks are in the DOM.
 */
class VirtualViewport {
  /**
   * @param {HTMLElement} scrollContainer
   * @param {Object} [opts]
   * @param {number} [opts.overscan=3] - Extra blocks above/below viewport
   * @param {number} [opts.estimatedBlockHeight=60]
   */
  constructor(scrollContainer, opts = {}) {
    this.scrollContainer = scrollContainer;
    this.overscan = opts.overscan ?? 3;
    this.estimatedBlockHeight = opts.estimatedBlockHeight ?? 60;

    /** @type {Map<string, number>} block id -> measured height */
    this._measuredHeights = new Map();

    /** @private */
    this._totalHeight = 0;

    /** @private */
    this._blockPositions = []; // { id, top, height }[]
  }

  /**
   * Calculate positions for all blocks.
   * @param {Block[]} blocks
   */
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

  /**
   * Update measured height for a block.
   * @param {string} blockId
   * @param {number} height
   */
  setMeasuredHeight(blockId, height) {
    this._measuredHeights.set(blockId, height);
  }

  /**
   * Get total content height.
   * @returns {number}
   */
  get totalHeight() {
    return this._totalHeight;
  }

  /**
   * Get the visible block indices given current scroll state.
   * @param {number} scrollTop
   * @param {number} viewportHeight
   * @returns {{ startIndex: number, endIndex: number, positions: Object[] }}
   */
  getVisibleRange(scrollTop, viewportHeight) {
    const top = scrollTop;
    const bottom = scrollTop + viewportHeight;

    let startIndex = 0;
    let endIndex = this._blockPositions.length;

    // Binary search for first visible
    let lo = 0, hi = this._blockPositions.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const pos = this._blockPositions[mid];
      if (pos.top + pos.height < top) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    startIndex = Math.max(0, lo - this.overscan);

    // Binary search for last visible
    lo = startIndex;
    hi = this._blockPositions.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const pos = this._blockPositions[mid];
      if (pos.top > bottom) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    endIndex = Math.min(this._blockPositions.length, lo + this.overscan);

    return {
      startIndex,
      endIndex,
      positions: this._blockPositions.slice(startIndex, endIndex),
    };
  }

  /**
   * Get position info for a specific block.
   * @param {string} blockId
   * @returns {Object|null}
   */
  getBlockPosition(blockId) {
    return this._blockPositions.find(p => p.id === blockId) || null;
  }
}


// ============================================================================
// SECTION 7: DRAG & DROP SYSTEM
// ============================================================================

/**
 * Manages block drag & drop reordering.
 */
class BlockDragDrop {
  /**
   * @param {HyperMarkEditor} editor
   */
  constructor(editor) {
    this.editor = editor;
    this.dragging = false;
    this.dragBlockId = null;
    this.dragGhost = null;
    this.dropTarget = null;
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  /**
   * Start dragging a block.
   * @param {string} blockId
   * @param {MouseEvent} event
   */
  start(blockId, event) {
    if (this.editor.config.readOnly) return;

    this.dragging = true;
    this.dragBlockId = blockId;

    // Create ghost element
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

    // Add body class for cursor
    document.body.classList.add('hm-dragging');

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    event.preventDefault();
  }

  /** @private */
  _onMouseMove(event) {
    if (!this.dragging) return;
    this._positionGhost(event);

    // Find drop target
    const blocks = this.editor.splitter.blocks;
    const containerRect = this.editor._contentEl.getBoundingClientRect();
    const y = event.clientY - containerRect.top + this.editor._scrollEl.scrollTop;

    // Clear previous indicators
    this.editor._contentEl.querySelectorAll('.hm-drop-indicator').forEach(el => el.remove());

    // Find which block we're hovering over
    let targetIdx = -1;
    let insertBefore = false;
    for (let i = 0; i < blocks.length; i++) {
      const el = this.editor._getBlockElement(blocks[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const elY = rect.top - containerRect.top + this.editor._scrollEl.scrollTop;
      const midY = elY + rect.height / 2;
      if (y < midY) {
        targetIdx = i;
        insertBefore = true;
        break;
      }
      targetIdx = i;
      insertBefore = false;
    }

    if (targetIdx >= 0 && blocks[targetIdx].id !== this.dragBlockId) {
      this.dropTarget = { index: targetIdx, before: insertBefore };
      // Show drop indicator
      const targetEl = this.editor._getBlockElement(blocks[targetIdx].id);
      if (targetEl) {
        const indicator = document.createElement('div');
        indicator.className = 'hm-drop-indicator';
        if (insertBefore) {
          targetEl.parentElement.insertBefore(indicator, targetEl);
        } else {
          targetEl.parentElement.insertBefore(indicator, targetEl.nextSibling);
        }
      }
    }
  }

  /** @private */
  _onMouseUp(event) {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);

    // Clean up ghost
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Clean up indicators
    this.editor._contentEl.querySelectorAll('.hm-drop-indicator').forEach(el => el.remove());
    document.body.classList.remove('hm-dragging');

    // Perform the reorder
    if (this.dropTarget && this.dragBlockId) {
      this.editor._reorderBlock(this.dragBlockId, this.dropTarget);
    }

    this.dragging = false;
    this.dragBlockId = null;
    this.dropTarget = null;
  }

  /** @private */
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

.hm-editor {
  position: relative;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background: transparent;
  overflow: hidden;
}

.hm-scroll {
  overflow-y: auto;
  height: 100%;
  scroll-behavior: smooth;
}

.hm-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  min-height: 100%;
}

.hm-spacer {
  pointer-events: none;
}

/* --- Block Wrapper --- */
.hm-block-wrapper {
  position: relative;
  padding: 2px 0 2px 28px;
  border-radius: 0;
  cursor: text;
}

.hm-block-wrapper:hover {
  background: transparent;
}

.hm-block-wrapper.hm-block-active {
  background: transparent;
}

/* --- Drag Handle --- */
.hm-drag-handle {
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  opacity: 0;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--hm-muted, #666);
  font-size: 12px;
  transition: opacity 0.15s ease;
  user-select: none;
}

.hm-block-wrapper:hover .hm-drag-handle {
  opacity: 0.3;
}

.hm-drag-handle:hover {
  opacity: 0.7 !important;
  background: rgba(255,255,255,0.05);
}

.hm-drag-ghost {
  border: 2px solid var(--hm-accent, #00d4aa);
  border-radius: 6px;
  background: var(--hm-bg, #1a1a2e);
  padding: 4px;
  max-height: 100px;
  overflow: hidden;
}

.hm-drop-indicator {
  height: 3px;
  background: var(--hm-accent, #00d4aa);
  border-radius: 2px;
  margin: 2px 0;
}

body.hm-dragging {
  cursor: grabbing !important;
  user-select: none;
}

/* --- Active Block Textarea --- */
.hm-block-textarea {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--hm-fg, #e0e0e0);
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  resize: none;
  overflow: hidden;
  padding: 0;
  border-radius: 0;
}

.hm-block-textarea:focus {
  outline: none;
  border: none;
  box-shadow: none;
}

/* --- Headings --- */
.hm-heading { margin: 0.6em 0 0.2em; font-weight: 600; }
.hm-h1 { font-size: 2em; }
.hm-h2 { font-size: 1.5em; }
.hm-h3 { font-size: 1.25em; }
.hm-h4 { font-size: 1.1em; }
.hm-h5 { font-size: 1em; }
.hm-h6 { font-size: 0.9em; color: var(--hm-muted, #999); }

/* --- Paragraphs --- */
.hm-paragraph { margin: 0; }

/* --- Code Blocks --- */
.hm-code-block {
  position: relative;
  margin: 0.8em 0;
  border-radius: 6px;
  background: var(--hm-code-bg, #16213e);
  overflow: hidden;
}

.hm-code-lang {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 11px;
  color: var(--hm-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;
}

.hm-pre {
  margin: 0;
  padding: 1em;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}

.hm-code {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
  color: var(--hm-code-fg, #a9b7c6);
}

.hm-hl-keyword { color: #c678dd; font-weight: 600; }
.hm-hl-string { color: #98c379; }
.hm-hl-comment { color: #5c6370; font-style: italic; }
.hm-hl-number { color: #d19a66; }

/* --- Blockquote --- */
.hm-blockquote {
  position: relative;
  margin: 0.8em 0;
  padding: 0.5em 0 0.5em 1.2em;
  display: flex;
}

.hm-bq-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--hm-accent, #00d4aa);
}

.hm-bq-content {
  color: var(--hm-muted, #bbb);
  font-style: italic;
}

/* --- Callouts --- */
.hm-callout {
  margin: 0.8em 0;
  border-radius: 6px;
  border-left: 4px solid var(--hm-accent, #00d4aa);
  padding: 0.8em 1em;
  background: var(--hm-callout-bg, rgba(0,212,170,0.06));
}

.hm-callout-header {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-weight: 600;
  margin-bottom: 0.3em;
}

.hm-callout-icon { font-size: 1.1em; }
.hm-callout-type { text-transform: capitalize; }
.hm-callout-title { font-weight: 400; color: var(--hm-muted, #bbb); }
.hm-callout-body { color: var(--hm-fg, #e0e0e0); }

.hm-callout-warning { border-left-color: #e2b93d; background: rgba(226,185,61,0.06); }
.hm-callout-danger { border-left-color: #e06c75; background: rgba(224,108,117,0.06); }
.hm-callout-tip { border-left-color: #98c379; background: rgba(152,195,121,0.06); }
.hm-callout-info { border-left-color: #61afef; background: rgba(97,175,239,0.06); }
.hm-callout-bug { border-left-color: #e06c75; background: rgba(224,108,117,0.06); }

/* --- Lists --- */
.hm-list {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.hm-list-item { margin: 0.15em 0; }

.hm-task-item {
  list-style: none;
  margin-left: -1.5em;
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.hm-checkbox {
  margin-top: 0.3em;
  accent-color: var(--hm-accent, #00d4aa);
}

.hm-task-done {
  text-decoration: line-through;
  color: var(--hm-muted, #888);
}

/* --- Tables --- */
.hm-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  font-size: 0.95em;
}

.hm-th {
  border-bottom: 2px solid var(--hm-border, #444);
  padding: 0.5em 0.8em;
  font-weight: 600;
  text-align: left;
}

.hm-td {
  border-bottom: 1px solid var(--hm-border, #333);
  padding: 0.4em 0.8em;
}

.hm-tr-even { background: var(--hm-stripe, rgba(255,255,255,0.02)); }
.hm-tr-odd { background: transparent; }

/* --- Thematic Break --- */
.hm-hr {
  border: none;
  border-top: 2px solid var(--hm-border, #333);
  margin: 1.5em 0;
}

/* --- Frontmatter --- */
.hm-frontmatter {
  margin: 0.3em 0;
  border-radius: 4px;
  background: transparent;
  padding: 0.2em 0;
}

.hm-frontmatter-badge {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.85em;
  user-select: none;
}

.hm-fm-icon { font-size: 1em; }
.hm-fm-label { font-weight: 600; color: var(--hm-accent, #00d4aa); }
.hm-fm-preview { color: var(--hm-muted, #888); }

.hm-fm-content {
  margin-top: 0.5em;
  padding: 0.5em;
  font-size: 0.9em;
}

/* --- Math Block --- */
.hm-math-block {
  margin: 0.8em 0;
  padding: 1em;
  text-align: center;
  background: var(--hm-code-bg, #16213e);
  border-radius: 6px;
}

.hm-math-content {
  font-family: 'KaTeX_Math', 'Times New Roman', serif;
  font-size: 1.2em;
  font-style: italic;
  color: var(--hm-fg, #e0e0e0);
}

/* --- Inline Elements --- */
.hm-inline-code {
  background: var(--hm-code-bg, #16213e);
  padding: 0.15em 0.35em;
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
}

.hm-link {
  color: var(--hm-link, #4fc3f7);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}

.hm-link:hover { border-bottom-color: var(--hm-link, #4fc3f7); }

.hm-wikilink {
  color: var(--hm-accent, #00d4aa);
  text-decoration: none;
  border-bottom: 1px dashed var(--hm-accent, #00d4aa);
}

.hm-highlight {
  background: rgba(255, 255, 0, 0.2);
  padding: 0.1em 0.2em;
  border-radius: 2px;
}

.hm-inline-img {
  max-width: 100%;
  border-radius: 4px;
  margin: 0.3em 0;
}

/* --- Slash Command Menu --- */
.hm-slash-menu {
  position: absolute;
  z-index: 9999;
  background: var(--hm-popover-bg, #1e1e3e);
  border: 1px solid var(--hm-border, #444);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  padding: 4px;
  max-height: 300px;
  overflow-y: auto;
  min-width: 220px;
}

.hm-slash-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}

.hm-slash-item:hover,
.hm-slash-selected {
  background: var(--hm-hover, rgba(255,255,255,0.08));
}

.hm-slash-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hm-code-bg, #16213e);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.hm-slash-text {
  display: flex;
  flex-direction: column;
}

.hm-slash-label {
  font-size: 14px;
  font-weight: 500;
}

.hm-slash-desc {
  font-size: 12px;
  color: var(--hm-muted, #888);
}

.hm-slash-empty {
  padding: 12px;
  text-align: center;
  color: var(--hm-muted, #888);
  font-size: 13px;
}

/* --- Scrollbar --- */
.hm-scroll::-webkit-scrollbar { width: 8px; }
.hm-scroll::-webkit-scrollbar-track { background: transparent; }
.hm-scroll::-webkit-scrollbar-thumb {
  background: var(--hm-muted, #444);
  border-radius: 4px;
}
.hm-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--hm-border, #666);
}
`;

/** @private */
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

/**
 * The main HyperMark editor class.
 * 
 * @example
 * const editor = new HyperMarkEditor(container, {
 *   content: '# Hello\n\nWorld',
 *   onChange: (md) => console.log(md),
 * });
 */
class HyperMarkEditor {
  /**
   * @param {HTMLElement} container - DOM element to mount the editor into
   * @param {Object} [config]
   * @param {string} [config.content=''] - Initial markdown content
   * @param {Function} [config.onChange] - Called when content changes
   * @param {Function} [config.onBlockFocus] - Called when a block is focused
   * @param {Function} [config.onBlockBlur] - Called when a block loses focus
   * @param {boolean} [config.readOnly=false] - Read-only mode
   * @param {boolean} [config.virtualViewport=true] - Enable virtual viewport
   * @param {Object[]} [config.slashCommands] - Extra slash commands
   * @param {number} [config.autoSaveDelay=1000] - Debounce delay for auto-save events
   */
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

    // Core state
    this.buffer = new RopeBuffer(this.config.content);
    this.splitter = new BlockSplitter();
    this.history = new TransactionHistory();

    /** @type {string|null} - ID of the currently focused block */
    this.activeBlockId = null;

    /** @private */
    this._autoSaveTimer = null;

    /** @private */
    this._destroyed = false;

    // Parse initial content
    this.splitter.parse(this.buffer.toString());

    // Build DOM
    this._buildDOM();

    // Systems
    this.viewport = new VirtualViewport(this._scrollEl);
    this.dragDrop = new BlockDragDrop(this);
    this.slashMenu = new SlashCommandMenu(
      this._contentEl,
      [...DEFAULT_SLASH_COMMANDS, ...this.config.slashCommands]
    );

    // Initial render
    this._renderAllBlocks();

    // Event bindings
    this._bindEvents();
  }

  // --- DOM Construction ---

  /** @private */
  _buildDOM() {
    this.container.innerHTML = '';

    // Root editor element
    this._editorEl = document.createElement('div');
    this._editorEl.className = 'hm-editor';
    this._editorEl.setAttribute('role', 'document');
    this._editorEl.setAttribute('aria-label', 'HyperMark Editor');

    // Scroll container
    this._scrollEl = document.createElement('div');
    this._scrollEl.className = 'hm-scroll';

    // Content area
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'hm-content';

    this._scrollEl.appendChild(this._contentEl);
    this._editorEl.appendChild(this._scrollEl);
    this.container.appendChild(this._editorEl);
  }

  // --- Block Rendering ---

  /** @private */
  _renderAllBlocks() {
    const blocks = this.splitter.blocks;

    if (this.config.virtualViewport && blocks.length > 50) {
      this._renderVirtualized(blocks);
    } else {
      this._renderDirect(blocks);
    }
  }

  /**
   * Direct rendering (all blocks in DOM).
   * @private
   */
  _renderDirect(blocks) {
    // Preserve active textarea state
    let activeContent = null;
    let activeCursorPos = null;
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        activeContent = textarea.value;
        activeCursorPos = textarea.selectionStart;
      }
    }

    this._contentEl.innerHTML = '';

    for (const block of blocks) {
      const wrapper = this._createBlockWrapper(block);
      this._contentEl.appendChild(wrapper);
    }

    // Restore active block textarea
    if (this.activeBlockId && activeContent !== null) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        textarea.value = activeContent;
        textarea.selectionStart = activeCursorPos;
        textarea.selectionEnd = activeCursorPos;
        textarea.focus();
      }
    }
  }

  /**
   * Virtualized rendering (only visible blocks in DOM).
   * @private
   */
  _renderVirtualized(blocks) {
    this.viewport.layout(blocks);
    const scrollTop = this._scrollEl.scrollTop;
    const viewportHeight = this._scrollEl.clientHeight;
    const { startIndex, endIndex } = this.viewport.getVisibleRange(scrollTop, viewportHeight);

    this._contentEl.innerHTML = '';

    // Top spacer
    const topSpacer = document.createElement('div');
    topSpacer.className = 'hm-spacer';
    let topHeight = 0;
    for (let i = 0; i < startIndex; i++) {
      topHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
    }
    topSpacer.style.height = topHeight + 'px';
    this._contentEl.appendChild(topSpacer);

    // Visible blocks
    for (let i = startIndex; i < endIndex && i < blocks.length; i++) {
      const wrapper = this._createBlockWrapper(blocks[i]);
      this._contentEl.appendChild(wrapper);
    }

    // Bottom spacer
    const bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'hm-spacer';
    let bottomHeight = 0;
    for (let i = endIndex; i < blocks.length; i++) {
      bottomHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
    }
    bottomSpacer.style.height = bottomHeight + 'px';
    this._contentEl.appendChild(bottomSpacer);
  }

  /**
   * Create a block wrapper element.
   * @private
   * @param {Block} block
   * @returns {HTMLElement}
   */
  _createBlockWrapper(block) {
    const wrapper = document.createElement('div');
    wrapper.className = 'hm-block-wrapper';
    wrapper.dataset.blockId = block.id;
    wrapper.dataset.blockType = block.type;

    // Drag handle
    if (!this.config.readOnly) {
      const handle = document.createElement('div');
      handle.className = 'hm-drag-handle';
      handle.innerHTML = '⠿';
      handle.title = 'Drag to reorder';
      handle.addEventListener('mousedown', (e) => {
        this.dragDrop.start(block.id, e);
      });
      wrapper.appendChild(handle);
    }

    // Content area
    const contentDiv = document.createElement('div');
    contentDiv.className = 'hm-block-content';

    if (this.activeBlockId === block.id && !this.config.readOnly) {
      // Active block: show textarea with raw markdown
      wrapper.classList.add('hm-block-active');
      const textarea = this._createBlockTextarea(block);
      contentDiv.appendChild(textarea);
    } else {
      // Inactive block: rendered HTML
      contentDiv.innerHTML = BlockRenderers.render(block);
    }

    wrapper.appendChild(contentDiv);

    // Click to focus
    if (!this.config.readOnly) {
      wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('.hm-drag-handle')) return;
        if (e.target.closest('.hm-block-textarea')) return;
        this._focusBlock(block.id);
      });
    }

    return wrapper;
  }

  /**
   * Create a textarea for editing a block's raw markdown.
   * @private
   * @param {Block} block
   * @returns {HTMLTextAreaElement}
   */
  _createBlockTextarea(block) {
    const textarea = document.createElement('textarea');
    textarea.className = 'hm-block-textarea';
    textarea.value = block.content;
    textarea.spellcheck = true;
    textarea.setAttribute('data-block-id', block.id);

    // Auto-resize
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    // Events
    textarea.addEventListener('input', () => {
      autoResize();
      this._onBlockEdit(block.id, textarea.value);
    });

    textarea.addEventListener('keydown', (e) => {
      this._onTextareaKeydown(e, block, textarea);
    });

    textarea.addEventListener('blur', (e) => {
      // Don't blur if clicking within the editor
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && this._editorEl.contains(relatedTarget)) return;
      // Delay to allow click events to fire first
      setTimeout(() => {
        if (this.activeBlockId === block.id && !this._destroyed) {
          this._blurBlock();
        }
      }, 150);
    });

    // Auto-resize after mount
    requestAnimationFrame(() => {
      autoResize();
      textarea.focus();
    });

    return textarea;
  }

  // --- Block Focus / Blur ---

  /**
   * Focus a block for editing.
   * @param {string} blockId
   */
  _focusBlock(blockId) {
    if (this.activeBlockId === blockId) return;
    if (this.config.readOnly) return;

    // Blur current
    if (this.activeBlockId) {
      this._commitActiveBlock();
    }

    this.activeBlockId = blockId;

    const block = this.splitter.blocks.find(b => b.id === blockId);
    if (block && this.config.onBlockFocus) {
      this.config.onBlockFocus(block);
    }

    this._renderAllBlocks();

    // Dispatch event
    this.container.dispatchEvent(new CustomEvent('hypermark-block-focus', {
      detail: { blockId, block },
    }));
  }

  /**
   * Blur the active block (commit and re-render as HTML).
   */
  _blurBlock() {
    if (!this.activeBlockId) return;

    const block = this.splitter.blocks.find(b => b.id === this.activeBlockId);
    if (block && this.config.onBlockBlur) {
      this.config.onBlockBlur(block);
    }

    this._commitActiveBlock();
    this.activeBlockId = null;
    this._renderAllBlocks();
  }

  /**
   * Commit changes from the active textarea back to the buffer.
   * @private
   */
  _commitActiveBlock() {
    if (!this.activeBlockId) return;

    const textarea = this._contentEl.querySelector('.hm-block-textarea');
    if (!textarea) return;

    const block = this.splitter.blocks.find(b => b.id === this.activeBlockId);
    if (!block) return;

    const newContent = textarea.value;
    if (newContent === block.content) return;

    // Apply edit to buffer
    this.buffer.replace(block.from, block.to, newContent);

    // Re-parse
    const fullText = this.buffer.toString();
    this.splitter.update(fullText, block.from, block.from + newContent.length, block.to - block.from);

    this._dispatchChange();
  }

  // --- Block Editing ---

  /**
   * Handle content change in a block's textarea.
   * @private
   * @param {string} blockId
   * @param {string} newContent
   */
  _onBlockEdit(blockId, newContent) {
    const block = this.splitter.blocks.find(b => b.id === blockId);
    if (!block) return;

    const oldContent = block.content;
    if (newContent === oldContent) return;

    // Record transaction for undo
    this.history.push(new Transaction({
      type: 'replace',
      offset: block.from,
      inserted: newContent,
      deleted: oldContent,
    }));

    // Update buffer
    this.buffer.replace(block.from, block.to, newContent);

    // Incremental re-parse
    const fullText = this.buffer.toString();
    this.splitter.update(fullText, block.from, block.from + newContent.length, block.to - block.from);

    // Update the block reference (it may have new offsets)
    const updatedBlock = this.splitter.blocks.find(b => b.id === blockId);
    if (updatedBlock) {
      updatedBlock.content = newContent;
    }

    this._dispatchChange();
    this._scheduleAutoSave();

    // Check for slash command trigger
    this._checkSlashTrigger(blockId, newContent);
  }

  /**
   * Check if a slash command should be triggered.
   * @private
   */
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

      // Approximate position (line-based)
      const lines = textBeforeCursor.split('\n');
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
      const y = rect.top - containerRect.top + (lines.length * lineHeight) + this._scrollEl.scrollTop;
      const x = 40;

      this.slashMenu.show(x, y, (cmd) => {
        this._executeSlashCommand(blockId, cmd, lineStart, cursorPos);
      });
      this.slashMenu.filter(query);
    } else if (this.slashMenu.visible) {
      this.slashMenu.hide();
    }
  }

  /**
   * Execute a slash command.
   * @private
   */
  _executeSlashCommand(blockId, command, lineStart, cursorPos) {
    const textarea = this._contentEl.querySelector(`.hm-block-textarea[data-block-id="${blockId}"]`);
    if (!textarea) return;

    const content = textarea.value;
    // Replace the /query with the command's markdown
    const before = content.substring(0, lineStart);
    const after = content.substring(cursorPos);
    const newContent = before + command.markdown + after;

    textarea.value = newContent;

    // Position cursor
    const newPos = lineStart + (command.cursorOffset ?? command.markdown.length);
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;

    // Trigger input event
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  // --- Keyboard Handling ---

  /**
   * Handle keydown in a block textarea.
   * @private
   * @param {KeyboardEvent} e
   * @param {Block} block
   * @param {HTMLTextAreaElement} textarea
   */
  _onTextareaKeydown(e, block, textarea) {
    // Slash menu navigation
    if (this.slashMenu.visible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.slashMenu.down();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.slashMenu.up();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.slashMenu.confirm();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.slashMenu.hide();
        return;
      }
    }

    // Undo: Ctrl+Z
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      this._undo();
      return;
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      e.preventDefault();
      this._redo();
      return;
    }

    // Arrow Up at top of block → focus previous block
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      if (!textBefore.includes('\n')) {
        e.preventDefault();
        this._focusPreviousBlock(block.id);
        return;
      }
    }

    // Arrow Down at bottom of block → focus next block
    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const cursorPos = textarea.selectionStart;
      const textAfter = textarea.value.substring(cursorPos);
      if (!textAfter.includes('\n')) {
        e.preventDefault();
        this._focusNextBlock(block.id);
        return;
      }
    }

    // Enter on empty block → blur (deactivate block)
    if (e.key === 'Enter' && !e.shiftKey) {
      const content = textarea.value.trim();
      if (content === '') {
        e.preventDefault();
        this._blurBlock();
        return;
      }
    }

    // Escape → blur block
    if (e.key === 'Escape') {
      e.preventDefault();
      this._blurBlock();
      return;
    }

    // Tab → insert 2 spaces (in code blocks) or indent
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

    // Backspace at start of block → merge with previous
    if (e.key === 'Backspace' && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
      e.preventDefault();
      this._mergeWithPreviousBlock(block.id);
      return;
    }
  }

  /**
   * Focus the previous block.
   * @private
   * @param {string} currentBlockId
   */
  _focusPreviousBlock(currentBlockId) {
    const blocks = this.splitter.blocks;
    const idx = blocks.findIndex(b => b.id === currentBlockId);
    if (idx > 0) {
      this._focusBlock(blocks[idx - 1].id);
      // Place cursor at end of the previous block's textarea
      requestAnimationFrame(() => {
        const textarea = this._contentEl.querySelector('.hm-block-textarea');
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        }
      });
    }
  }

  /**
   * Focus the next block.
   * @private
   * @param {string} currentBlockId
   */
  _focusNextBlock(currentBlockId) {
    const blocks = this.splitter.blocks;
    const idx = blocks.findIndex(b => b.id === currentBlockId);
    if (idx < blocks.length - 1) {
      this._focusBlock(blocks[idx + 1].id);
      // Place cursor at start
      requestAnimationFrame(() => {
        const textarea = this._contentEl.querySelector('.hm-block-textarea');
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = 0;
        }
      });
    }
  }

  /**
   * Merge current block with the previous one.
   * @private
   * @param {string} blockId
   */
  _mergeWithPreviousBlock(blockId) {
    const blocks = this.splitter.blocks;
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx <= 0) return;

    const prevBlock = blocks[idx - 1];
    const currentBlock = blocks[idx];
    const mergedContent = prevBlock.content + '\n' + currentBlock.content;

    // Replace both blocks in buffer
    this.buffer.replace(prevBlock.from, currentBlock.to, mergedContent);

    // Record transaction
    this.history.push(new Transaction({
      type: 'replace',
      offset: prevBlock.from,
      inserted: mergedContent,
      deleted: this.buffer.slice(prevBlock.from, currentBlock.to),
    }));

    // Re-parse and render
    const fullText = this.buffer.toString();
    this.splitter.parse(fullText);
    this.activeBlockId = null;

    // Focus the merged block
    const newBlocks = this.splitter.blocks;
    if (newBlocks.length > 0) {
      const targetIdx = Math.min(idx - 1, newBlocks.length - 1);
      this._focusBlock(newBlocks[targetIdx].id);
    } else {
      this._renderAllBlocks();
    }

    this._dispatchChange();
  }

  // --- Block Reorder (Drag & Drop) ---

  /**
   * Reorder a block via drag & drop.
   * @private
   * @param {string} blockId
   * @param {{ index: number, before: boolean }} target
   */
  _reorderBlock(blockId, target) {
    const blocks = this.splitter.blocks;
    const sourceIdx = blocks.findIndex(b => b.id === blockId);
    if (sourceIdx === -1) return;

    const sourceBlock = blocks[sourceIdx];
    const sourceContent = sourceBlock.content;

    // Remove from buffer
    let deleteFrom = sourceBlock.from;
    let deleteTo = sourceBlock.to;
    // Include trailing newline if present
    const fullText = this.buffer.toString();
    if (deleteTo < fullText.length && fullText[deleteTo] === '\n') {
      deleteTo++;
    }

    this.buffer.delete(deleteFrom, deleteTo);

    // Re-parse after delete
    this.splitter.parse(this.buffer.toString());

    // Calculate insert position
    let insertIdx = target.index;
    if (sourceIdx < target.index) insertIdx--;
    if (!target.before) insertIdx++;
    insertIdx = Math.max(0, Math.min(insertIdx, this.splitter.blocks.length));

    let insertOffset;
    if (insertIdx >= this.splitter.blocks.length) {
      insertOffset = this.buffer.length;
    } else {
      insertOffset = this.splitter.blocks[insertIdx].from;
    }

    // Insert with surrounding newlines
    let insertText = sourceContent;
    if (insertOffset > 0) {
      const charBefore = this.buffer.slice(insertOffset - 1, insertOffset);
      if (charBefore !== '\n') insertText = '\n' + insertText;
    }
    if (insertOffset < this.buffer.length) {
      const charAfter = this.buffer.slice(insertOffset, insertOffset + 1);
      if (charAfter !== '\n') insertText = insertText + '\n';
    }

    this.buffer.insert(insertOffset, insertText);

    // Re-parse and render
    this.splitter.parse(this.buffer.toString());
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  // --- Undo / Redo ---

  /**
   * Undo the last edit.
   */
  _undo() {
    this._commitActiveBlock();
    const batch = this.history.undo();
    if (!batch) return;

    for (const tx of batch) {
      if (tx.deleted) {
        this.buffer.delete(tx.offset, tx.offset + tx.deleted.length);
      }
      if (tx.inserted) {
        this.buffer.insert(tx.offset, tx.inserted);
      }
    }

    this.splitter.parse(this.buffer.toString());
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  /**
   * Redo the last undone edit.
   */
  _redo() {
    const batch = this.history.redo();
    if (!batch) return;

    for (const tx of batch) {
      if (tx.deleted) {
        this.buffer.delete(tx.offset, tx.offset + tx.deleted.length);
      }
      if (tx.inserted) {
        this.buffer.insert(tx.offset, tx.inserted);
      }
    }

    this.splitter.parse(this.buffer.toString());
    this.activeBlockId = null;
    this._renderAllBlocks();
    this._dispatchChange();
  }

  // --- Events ---

  /** @private */
  _bindEvents() {
    // Click outside blocks → blur
    this._editorEl.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.hm-block-wrapper') && this.activeBlockId) {
        this._blurBlock();
      }
    });

    // Scroll → re-render if virtualized
    if (this.config.virtualViewport) {
      this._scrollEl.addEventListener('scroll', () => {
        if (this.splitter.blocks.length > 50) {
          this._renderVirtualized(this.splitter.blocks);
        }
      });
    }

    // Keyboard shortcuts on editor level
    this._editorEl.addEventListener('keydown', (e) => {
      // Global undo/redo when no block is active
      if (!this.activeBlockId) {
        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          this._undo();
        }
        if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
            (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
          e.preventDefault();
          this._redo();
        }
      }
    });
  }

  /**
   * Dispatch a content change event.
   * @private
   */
  _dispatchChange() {
    const content = this.buffer.toString();

    if (this.config.onChange) {
      this.config.onChange(content);
    }

    this.container.dispatchEvent(new CustomEvent('hypermark-change', {
      detail: { content },
    }));
  }

  /**
   * Schedule an auto-save event.
   * @private
   */
  _scheduleAutoSave() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }
    this._autoSaveTimer = setTimeout(() => {
      this.container.dispatchEvent(new CustomEvent('hypermark-autosave', {
        detail: { content: this.buffer.toString() },
      }));
    }, this.config.autoSaveDelay);
  }

  // --- Helpers ---

  /**
   * Get a block's DOM element.
   * @private
   * @param {string} blockId
   * @returns {HTMLElement|null}
   */
  _getBlockElement(blockId) {
    return this._contentEl.querySelector(`[data-block-id="${blockId}"]`);
  }

  // --- Public API ---

  /**
   * Get the full markdown content.
   * @returns {string}
   */
  getContent() {
    if (this.activeBlockId) {
      this._commitActiveBlock();
    }
    return this.buffer.toString();
  }

  /**
   * Set the entire markdown content.
   * @param {string} markdown
   */
  setContent(markdown) {
    this.activeBlockId = null;
    this.buffer = new RopeBuffer(markdown);
    this.splitter.parse(this.buffer.toString());
    this.history.clear();
    this._renderAllBlocks();
    this._dispatchChange();
  }

  /**
   * Insert text at a given offset.
   * @param {number} offset
   * @param {string} text
   */
  insertAt(offset, text) {
    this.buffer.insert(offset, text);
    this.history.push(new Transaction({
      type: 'insert',
      offset,
      inserted: text,
    }));
    this.splitter.parse(this.buffer.toString());
    this._renderAllBlocks();
    this._dispatchChange();
  }

  /**
   * Focus a specific block by ID.
   * @param {string} blockId
   */
  focusBlock(blockId) {
    this._focusBlock(blockId);
  }

  /**
   * Focus a block by index.
   * @param {number} index
   */
  focusBlockByIndex(index) {
    const block = this.splitter.blocks[index];
    if (block) this._focusBlock(block.id);
  }

  /**
   * Scroll to a block.
   * @param {string} blockId
   */
  scrollToBlock(blockId) {
    const el = this._getBlockElement(blockId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Get all blocks.
   * @returns {Block[]}
   */
  getBlocks() {
    return [...this.splitter.blocks];
  }

  /**
   * Get a block by ID.
   * @param {string} blockId
   * @returns {Block|undefined}
   */
  getBlock(blockId) {
    return this.splitter.blocks.find(b => b.id === blockId);
  }

  /**
   * Set read-only mode.
   * @param {boolean} readOnly
   */
  setReadOnly(readOnly) {
    this.config.readOnly = readOnly;
    if (readOnly && this.activeBlockId) {
      this._blurBlock();
    }
    this._renderAllBlocks();
  }

  /**
   * Register additional slash commands at runtime.
   * @param {Object[]} commands
   */
  registerSlashCommands(commands) {
    this.slashMenu.commands = [...this.slashMenu.commands, ...commands];
  }

  /**
   * Search for text in the document. Returns matching blocks.
   * @param {string} query
   * @returns {{ block: Block, matches: number[] }[]}
   */
  search(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const block of this.splitter.blocks) {
      const lower = block.content.toLowerCase();
      const matches = [];
      let pos = 0;
      while ((pos = lower.indexOf(lowerQuery, pos)) !== -1) {
        matches.push(pos);
        pos += query.length;
      }
      if (matches.length > 0) {
        results.push({ block, matches });
      }
    }

    return results;
  }

  /**
   * Get a table of contents from heading blocks.
   * @returns {{ level: number, text: string, blockId: string, anchor: string }[]}
   */
  getTableOfContents() {
    return this.splitter.blocks
      .filter(b => b.type === 'heading')
      .map(b => ({
        level: b.meta.level,
        text: b.meta.text || b.content.replace(/^#{1,6}\s+/, ''),
        blockId: b.id,
        anchor: (b.meta.text || b.content.replace(/^#{1,6}\s+/, ''))
          .toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      }));
  }

  /**
   * Get word count and other stats.
   * @returns {{ words: number, characters: number, blocks: number, lines: number }}
   */
  getStats() {
    const content = this.buffer.toString();
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return {
      words,
      characters: content.length,
      blocks: this.splitter.blocks.length,
      lines: this.buffer.lineCount,
    };
  }

  /**
   * Insert text at the current cursor position (or end of document).
   * Used by slash commands and toolbar actions in the classic Editor adapter.
   * @param {string} text
   */
  insertAtCursor(text) {
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const value = textarea.value;
        textarea.value = value.substring(0, start) + text + value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return;
      }
    }
    // No active block — append to end
    const offset = this.buffer.length;
    const insertText = (offset > 0 ? '\n' : '') + text;
    this.buffer.insert(offset, insertText);
    this.splitter.parse(this.buffer.toString());
    this._renderAllBlocks();
    this._dispatchChange();
  }

  /**
   * Wrap the current selection with before/after strings.
   * Used by formatting shortcuts (bold, italic, etc.) in the classic Editor adapter.
   * @param {string} before
   * @param {string} after
   */
  wrapSelection(before, after) {
    if (this.activeBlockId) {
      const textarea = this._contentEl.querySelector('.hm-block-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selected = value.substring(start, end) || 'text';
        const replacement = before + selected + after;
        textarea.value = value.substring(0, start) + replacement + value.substring(end);
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + selected.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return;
      }
    }
  }

  /**
   * Destroy the editor and clean up.
   */
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
  RopeBuffer,
  Piece,
  PieceNode,
  Block,
  BlockSplitter,
  BlockRenderers,
  renderInline,
  Transaction,
  TransactionHistory,
  SlashCommandMenu,
  DEFAULT_SLASH_COMMANDS,
  VirtualViewport,
  BlockDragDrop,
  HyperMarkEditor,
};

export default HyperMarkEditor;
