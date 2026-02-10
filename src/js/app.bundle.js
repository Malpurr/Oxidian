(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/js/tauri-bridge.js
  var tauri_bridge_exports = {};
  __export(tauri_bridge_exports, {
    invoke: () => invoke,
    whenReady: () => whenReady
  });
  function _checkReady() {
    if (window.__TAURI__?.core?.invoke) {
      _invoke = window.__TAURI__.core.invoke;
      _ready = true;
      _waiters.forEach((resolve) => resolve(_invoke));
      _waiters.length = 0;
      return true;
    }
    return false;
  }
  async function invoke(cmd, args) {
    if (_ready) return _invoke(cmd, args);
    return new Promise((resolve, reject) => {
      _waiters.push((inv) => {
        inv(cmd, args).then(resolve).catch(reject);
      });
    });
  }
  function whenReady() {
    if (_ready) return Promise.resolve();
    return new Promise((resolve) => _waiters.push(() => resolve()));
  }
  var _invoke, _ready, _waiters;
  var init_tauri_bridge = __esm({
    "src/js/tauri-bridge.js"() {
      _invoke = null;
      _ready = false;
      _waiters = [];
      _checkReady();
      if (!_ready) {
        const poll = setInterval(() => {
          if (_checkReady()) clearInterval(poll);
        }, 5);
        setTimeout(() => {
          if (!_ready) {
            console.error("[Oxidian] Tauri IPC bridge not available after 5s");
            clearInterval(poll);
          }
        }, 5e3);
      }
    }
  });

  // src/js/highlight-extension.js
  function buildHighlightDecorations(view) {
    const builder = new import_codemirror_bundle2.RangeSetBuilder();
    const doc = view.state.doc;
    for (const { from, to } of view.visibleRanges) {
      const text = doc.sliceString(from, to);
      const regex = /(?<!=)==(?!=)(.+?)==(?!=)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const start = from + match.index;
        const end = start + match[0].length;
        const contentStart = start + 2;
        const contentEnd = end - 2;
        builder.add(start, contentStart, highlightMarker);
        builder.add(contentStart, contentEnd, highlightMark);
        builder.add(contentEnd, end, highlightMarker);
      }
    }
    return builder.finish();
  }
  function highlightExtension() {
    return [highlightPlugin, highlightTheme];
  }
  var import_codemirror_bundle, import_codemirror_bundle2, highlightMark, highlightMarker, highlightPlugin, highlightTheme;
  var init_highlight_extension = __esm({
    "src/js/highlight-extension.js"() {
      import_codemirror_bundle = __require("./codemirror-bundle.js");
      import_codemirror_bundle2 = __require("./codemirror-bundle.js");
      highlightMark = import_codemirror_bundle.Decoration.mark({
        class: "cm-highlight-mark"
      });
      highlightMarker = import_codemirror_bundle.Decoration.mark({
        class: "cm-highlight-marker"
      });
      highlightPlugin = import_codemirror_bundle.ViewPlugin.fromClass(class {
        constructor(view) {
          this.decorations = buildHighlightDecorations(view);
        }
        update(update) {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = buildHighlightDecorations(update.view);
          }
        }
      }, {
        decorations: (v) => v.decorations
      });
      highlightTheme = import_codemirror_bundle.EditorView.baseTheme({
        ".cm-highlight-mark": {
          backgroundColor: "rgba(249, 226, 175, 0.35)",
          borderRadius: "2px",
          padding: "1px 0"
        },
        ".cm-highlight-marker": {
          color: "var(--text-faint, #6c7086)",
          opacity: "0.5"
        }
      });
    }
  });

  // src/js/codemirror-editor.js
  var codemirror_editor_exports = {};
  __export(codemirror_editor_exports, {
    CodeMirrorEditor: () => CodeMirrorEditor
  });
  function toggleBold(view) {
    return wrapSelection(view, "**", "**");
  }
  function toggleItalic(view) {
    return wrapSelection(view, "*", "*");
  }
  function toggleInlineCode(view) {
    return wrapSelection(view, "`", "`");
  }
  function insertCodeBlock(view) {
    return wrapSelection(view, "```\n", "\n```");
  }
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
      const linkText = "[text](url)";
      dispatch(state.update({
        changes: { from, insert: linkText },
        selection: { anchor: from + 1, head: from + 5 }
      }));
    }
    return true;
  }
  function wrapSelection(view, before, after) {
    const { state, dispatch } = view;
    const { from, to } = state.selection.main;
    const selectedText = state.doc.sliceString(from, to);
    const replacement = before + (selectedText || "text") + after;
    const changes = { from, to, insert: replacement };
    let selection;
    if (selectedText) {
      selection = { anchor: from, head: from + replacement.length };
    } else {
      selection = { anchor: from + before.length, head: from + before.length + 4 };
    }
    dispatch(state.update({ changes, selection }));
    return true;
  }
  var import_codemirror_bundle3, import_codemirror_bundle4, import_codemirror_bundle5, import_codemirror_bundle6, import_codemirror_bundle7, import_codemirror_bundle8, import_codemirror_bundle9, import_codemirror_bundle10, import_codemirror_bundle11, oxidianTheme, oxidianHighlight, markdownKeymap, CodeMirrorEditor, foldKeymap;
  var init_codemirror_editor = __esm({
    "src/js/codemirror-editor.js"() {
      import_codemirror_bundle3 = __require("./codemirror-bundle.js");
      import_codemirror_bundle4 = __require("./codemirror-bundle.js");
      import_codemirror_bundle5 = __require("./codemirror-bundle.js");
      import_codemirror_bundle6 = __require("./codemirror-bundle.js");
      import_codemirror_bundle7 = __require("./codemirror-bundle.js");
      import_codemirror_bundle8 = __require("./codemirror-bundle.js");
      import_codemirror_bundle9 = __require("./codemirror-bundle.js");
      import_codemirror_bundle10 = __require("./codemirror-bundle.js");
      import_codemirror_bundle11 = __require("./codemirror-bundle.js");
      init_highlight_extension();
      oxidianTheme = import_codemirror_bundle4.EditorView.theme({
        "&": {
          color: "#cdd6f4",
          // Main text color
          backgroundColor: "#1e1e2e",
          // Background
          height: "100%",
          fontFamily: "JetBrains Mono, Fira Code, Consolas, Monaco, monospace",
          fontSize: "15px",
          lineHeight: "1.5"
        },
        ".cm-content": {
          padding: "16px",
          caretColor: "#cba6f7",
          // Purple caret
          minHeight: "100%"
        },
        ".cm-focused .cm-cursor": {
          borderLeftColor: "#cba6f7"
          // Purple cursor
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: "#45475a !important"
          // Selection background
        },
        ".cm-focused .cm-selectionBackground": {
          backgroundColor: "#45475a !important"
        },
        ".cm-activeLine": {
          backgroundColor: "#313244"
          // Active line background
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#313244"
        },
        ".cm-gutters": {
          backgroundColor: "#1e1e2e",
          color: "#6c7086",
          // Muted text for line numbers
          border: "none",
          borderRight: "1px solid #313244"
        },
        ".cm-lineNumbers .cm-gutterElement": {
          padding: "0 8px 0 8px",
          minWidth: "40px !important"
        },
        ".cm-foldGutter .cm-gutterElement": {
          padding: "0 4px"
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "#313244",
          border: "1px solid #45475a",
          color: "#a6adc8"
        },
        ".cm-tooltip": {
          backgroundColor: "#313244",
          border: "1px solid #45475a",
          color: "#cdd6f4"
        },
        ".cm-tooltip-autocomplete": {
          backgroundColor: "#313244",
          border: "1px solid #45475a"
        },
        ".cm-completionLabel": {
          color: "#cdd6f4"
        },
        ".cm-completionDetail": {
          color: "#a6adc8"
        },
        ".cm-completionIcon": {
          color: "#cba6f7"
        },
        ".cm-searchMatch": {
          backgroundColor: "#f9e2af",
          color: "#1e1e2e",
          outline: "1px solid #f9e2af"
        },
        ".cm-searchMatch-selected": {
          backgroundColor: "#fab387",
          color: "#1e1e2e"
        }
      }, { dark: true });
      oxidianHighlight = (0, import_codemirror_bundle6.syntaxHighlighting)(import_codemirror_bundle6.HighlightStyle.define([
        { tag: import_codemirror_bundle7.languageTags.heading, color: "#cba6f7", fontWeight: "bold" },
        // Purple headings
        { tag: import_codemirror_bundle7.languageTags.emphasis, color: "#f38ba8", fontStyle: "italic" },
        // Pink italic
        { tag: import_codemirror_bundle7.languageTags.strong, color: "#fab387", fontWeight: "bold" },
        // Orange bold
        { tag: import_codemirror_bundle7.languageTags.strikethrough, color: "#6c7086", textDecoration: "line-through" },
        // Muted strikethrough
        { tag: import_codemirror_bundle7.languageTags.link, color: "#89b4fa" },
        // Blue links
        { tag: import_codemirror_bundle7.languageTags.monospace, color: "#a6e3a1", backgroundColor: "#313244" },
        // Green inline code
        { tag: import_codemirror_bundle7.languageTags.url, color: "#89b4fa", textDecoration: "underline" },
        { tag: import_codemirror_bundle7.languageTags.meta, color: "#74c7ec" },
        // Cyan metadata
        { tag: import_codemirror_bundle7.languageTags.quote, color: "#a6adc8", fontStyle: "italic" },
        // Muted quotes
        { tag: import_codemirror_bundle7.languageTags.list, color: "#cdd6f4" },
        { tag: import_codemirror_bundle7.languageTags.documentMeta, color: "#6c7086" },
        { tag: import_codemirror_bundle7.languageTags.processingInstruction, color: "#74c7ec" },
        { tag: import_codemirror_bundle7.languageTags.separator, color: "#6c7086" },
        { tag: import_codemirror_bundle7.languageTags.labelName, color: "#cba6f7" },
        // Purple for labels
        { tag: import_codemirror_bundle7.languageTags.literal, color: "#a6e3a1" },
        // Green for literals
        { tag: import_codemirror_bundle7.languageTags.inserted, color: "#a6e3a1" },
        { tag: import_codemirror_bundle7.languageTags.deleted, color: "#f38ba8" },
        { tag: import_codemirror_bundle7.languageTags.changed, color: "#fab387" }
      ]));
      markdownKeymap = [
        { key: "Ctrl-b", run: toggleBold, preventDefault: true },
        { key: "Cmd-b", run: toggleBold, preventDefault: true },
        { key: "Ctrl-i", run: toggleItalic, preventDefault: true },
        { key: "Cmd-i", run: toggleItalic, preventDefault: true },
        { key: "Ctrl-k", run: insertLink, preventDefault: true },
        { key: "Cmd-k", run: insertLink, preventDefault: true },
        { key: "Ctrl-Shift-k", run: insertCodeBlock, preventDefault: true },
        { key: "Cmd-Shift-k", run: insertCodeBlock, preventDefault: true },
        { key: "Ctrl-`", run: toggleInlineCode, preventDefault: true },
        { key: "Cmd-`", run: toggleInlineCode, preventDefault: true }
      ];
      CodeMirrorEditor = class {
        constructor(app) {
          this.app = app;
          this.view = null;
          this.container = null;
          this.previewEl = null;
          this.currentPath = null;
          this.renderTimeout = null;
          this.previewVisible = true;
          this.showLineNumbers = localStorage.getItem("oxidian-line-numbers") === "true";
          this.vimMode = false;
          this.lineNumberCompartment = new import_codemirror_bundle3.Compartment();
          this.themeCompartment = new import_codemirror_bundle3.Compartment();
          this.readOnlyCompartment = new import_codemirror_bundle3.Compartment();
          this._cachedContent = "";
        }
        /**
         * Attach the editor to a container element
         */
        attach(container, previewEl) {
          this.destroy();
          this.container = container;
          this.previewEl = previewEl;
          const extensions = [
            // Basic extensions
            (0, import_codemirror_bundle5.markdown)(),
            (0, import_codemirror_bundle6.syntaxHighlighting)(oxidianHighlight),
            import_codemirror_bundle4.EditorView.lineWrapping,
            (0, import_codemirror_bundle8.history)(),
            (0, import_codemirror_bundle6.indentOnInput)(),
            (0, import_codemirror_bundle6.bracketMatching)(),
            (0, import_codemirror_bundle10.closeBrackets)(),
            (0, import_codemirror_bundle10.autocompletion)(),
            (0, import_codemirror_bundle4.rectangularSelection)(),
            (0, import_codemirror_bundle9.highlightSelectionMatches)(),
            (0, import_codemirror_bundle9.search)({ top: true }),
            // Highlight ==text== decoration
            ...highlightExtension(),
            // *** FIX: Compartmentalized extensions ***
            this.lineNumberCompartment.of(
              this.showLineNumbers ? [(0, import_codemirror_bundle4.lineNumbers)(), (0, import_codemirror_bundle4.highlightActiveLineGutter)()] : []
            ),
            this.themeCompartment.of(oxidianTheme),
            this.readOnlyCompartment.of([]),
            // Empty by default, read-only when needed
            // Folding
            (0, import_codemirror_bundle6.codeFolding)(),
            (0, import_codemirror_bundle6.foldGutter)(),
            // Keymaps (order matters - more specific first)
            import_codemirror_bundle4.keymap.of([
              ...markdownKeymap,
              ...import_codemirror_bundle10.completionKeymap,
              ...import_codemirror_bundle10.closeBracketsKeymap,
              ...import_codemirror_bundle8.standardKeymap,
              ...import_codemirror_bundle9.searchKeymap,
              ...import_codemirror_bundle8.historyKeymap,
              ...foldKeymap,
              ...import_codemirror_bundle8.defaultKeymap,
              import_codemirror_bundle8.indentWithTab
            ]),
            // Update listener for content changes
            import_codemirror_bundle4.EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                this._cachedContent = this.view.state.doc.toString();
                this.app.markDirty();
                this.scheduleRender();
                this.updateStats();
                this.app.slashMenu?.onInput(this.view);
              }
              if (update.selectionSet) {
                this.updateCursor();
              }
            }),
            // Custom styling
            import_codemirror_bundle4.EditorView.theme({
              ".cm-editor": {
                height: "100%"
              },
              ".cm-scroller": {
                fontFamily: "inherit"
              }
            })
          ];
          const state = import_codemirror_bundle3.EditorState.create({
            doc: "",
            extensions
          });
          this.view = new import_codemirror_bundle4.EditorView({
            state,
            parent: container
          });
          this.view.contentDOM.addEventListener("blur", () => {
            if (this.app.isDirty) {
              this.app.saveCurrentFile();
            }
          });
          this.view.contentDOM.addEventListener("contextmenu", (e) => {
            this.app.contextMenu?.showEditorMenu(e, this.view);
          });
          return this.view;
        }
        /**
         * Attach HyperMark editor (compatibility method)
         */
        attachHyperMark(hypermark, previewEl) {
          this.previewEl = previewEl;
        }
        /**
         * Set editor content
         */
        setContent(content) {
          if (!this.view) {
            this._cachedContent = content || "";
            return;
          }
          try {
            const transaction = this.view.state.update({
              changes: {
                from: 0,
                to: this.view.state.doc.length,
                insert: content || ""
              }
            });
            this.view.dispatch(transaction);
            this._cachedContent = content || "";
            this.renderPreview();
            this.updateStats();
            this.updateCursor();
            this.view.focus();
            this.view.dispatch({
              effects: import_codemirror_bundle4.EditorView.scrollIntoView(0, { y: "start" })
            });
          } catch (error) {
            console.warn("CodeMirror setContent failed:", error);
            this._cachedContent = content || "";
          }
        }
        /**
         * Get editor content
         */
        getContent() {
          try {
            if (!this.view) {
              return this._cachedContent || "";
            }
            const content = this.view.state.doc.toString();
            if (content) {
              this._cachedContent = content;
            }
            return content || this._cachedContent || "";
          } catch (error) {
            console.warn("CodeMirror getContent failed, using cache:", error);
            return this._cachedContent || "";
          }
        }
        /**
         * Get current selection
         */
        getSelection() {
          if (!this.view) return "";
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
          if (typeof pos === "object" && pos.line !== void 0) {
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
          localStorage.setItem("oxidian-line-numbers", show.toString());
          if (this.view) {
            this.view.dispatch({
              effects: this.lineNumberCompartment.reconfigure(
                show ? [(0, import_codemirror_bundle4.lineNumbers)(), (0, import_codemirror_bundle4.highlightActiveLineGutter)()] : []
              )
            });
          }
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
            const { invoke: invoke2 } = await Promise.resolve().then(() => (init_tauri_bridge(), tauri_bridge_exports));
            const html = await invoke2("render_markdown", { content });
            this.previewEl.innerHTML = html;
          } catch (err) {
            console.error("Render failed:", err);
          }
        }
        /**
         * Toggle preview visibility
         */
        togglePreview() {
          if (!this.previewEl) return;
          const previewPane = this.previewEl.closest(".preview-pane-half");
          if (!previewPane) return;
          this.previewVisible = !this.previewVisible;
          previewPane.style.display = this.previewVisible ? "" : "none";
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
          if (!content) content = "";
          const words = content.trim() ? content.trim().split(/\s+/).length : 0;
          const chars = content.length;
          const readingTime = Math.max(1, Math.ceil(words / 238));
          const wc = document.getElementById("status-word-count");
          const cc = document.getElementById("status-char-count");
          const rt = document.getElementById("status-reading-time");
          if (wc) wc.textContent = `${words} words`;
          if (cc) cc.textContent = `${chars} characters`;
          if (rt) rt.textContent = `${readingTime} min read`;
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
          const el = document.getElementById("status-cursor");
          if (el) el.textContent = `Ln ${lineNum}, Col ${colNum}`;
        }
        /**
         * Sync scroll with preview (if needed)
         */
        syncScroll() {
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
         * Set read-only mode (for Reading View)
         */
        setReadOnly(readOnly) {
          if (!this.view) return;
          this.view.dispatch({
            effects: this.readOnlyCompartment.reconfigure(
              readOnly ? [import_codemirror_bundle4.EditorView.theme({
                "&.cm-editor.cm-focused": {
                  outline: "none"
                },
                ".cm-content": {
                  caretColor: "transparent"
                }
              }), import_codemirror_bundle4.EditorView.editable.of(false)] : []
            )
          });
        }
        /**
         * Change theme dynamically
         */
        changeTheme(theme = oxidianTheme) {
          if (!this.view) return;
          this.view.dispatch({
            effects: this.themeCompartment.reconfigure(theme)
          });
        }
        /**
         * Destroy the editor
         */
        destroy() {
          if (this.view) {
            try {
              this._cachedContent = this.view.state.doc.toString();
              this.view.destroy();
            } catch (error) {
              console.warn("Error during CodeMirror destroy:", error);
            } finally {
              this.view = null;
            }
          }
          clearTimeout(this.renderTimeout);
          this.container = null;
          this.previewEl = null;
        }
      };
      foldKeymap = [
        { key: "Ctrl-Shift-[", run: import_codemirror_bundle6.foldCode },
        { key: "Cmd-Alt-[", run: import_codemirror_bundle6.foldCode },
        { key: "Ctrl-Shift-]", run: import_codemirror_bundle6.unfoldCode },
        { key: "Cmd-Alt-]", run: import_codemirror_bundle6.unfoldCode },
        { key: "Ctrl-Alt-f", run: import_codemirror_bundle6.foldAll },
        { key: "Cmd-Alt-f", run: import_codemirror_bundle6.foldAll },
        { key: "Ctrl-Alt-u", run: import_codemirror_bundle6.unfoldAll },
        { key: "Cmd-Alt-u", run: import_codemirror_bundle6.unfoldAll }
      ];
    }
  });

  // src/js/app.js
  init_tauri_bridge();

  // src/js/editor.js
  init_tauri_bridge();
  var CodeMirrorEditor2 = null;
  var cmLoadAttempted = false;
  async function loadCodeMirror() {
    if (cmLoadAttempted) return CodeMirrorEditor2;
    cmLoadAttempted = true;
    try {
      const module = await Promise.resolve().then(() => (init_codemirror_editor(), codemirror_editor_exports));
      CodeMirrorEditor2 = module.CodeMirrorEditor;
      console.log("\u2705 CodeMirror 6 editor loaded successfully");
    } catch (error) {
      console.warn("\u26A0\uFE0F CodeMirror 6 failed to load, using classic textarea fallback:", error);
      CodeMirrorEditor2 = null;
    }
    return CodeMirrorEditor2;
  }
  var Editor = class {
    constructor(app) {
      this.app = app;
      this.textarea = null;
      this.previewEl = null;
      this.highlightEl = null;
      this.lineNumberEl = null;
      this.renderTimeout = null;
      this.previewVisible = true;
      this.currentPath = null;
      this.showLineNumbers = localStorage.getItem("oxidian-line-numbers") === "true";
      this.useCodeMirror = localStorage.getItem("oxidian-disable-codemirror") !== "true";
      this.cmEditor = null;
      this._cmReady = false;
      this._lastKnownContent = "";
      this._editorReady = false;
      this._hypermark = null;
      this._autoPairs = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "`": "`"
      };
      this._bracketHighlightTimer = null;
      this._abortController = null;
      this._eventListeners = [];
      this._renderQueue = null;
      this._lastRenderContent = "";
      console.log("\u{1F4DD} Editor initialized (CodeMirror loads on first attach)");
    }
    async attach(container, previewEl) {
      this.detach();
      this._hypermark = null;
      this.previewEl = previewEl;
      this._editorReady = false;
      if (this.useCodeMirror && !this._cmReady) {
        const CM = await loadCodeMirror();
        if (CM) {
          this.cmEditor = new CM(this.app);
          this._cmReady = true;
          console.log("\u{1F680} Using CodeMirror 6 editor");
        } else {
          this.useCodeMirror = false;
          console.log("\u{1F4DD} Falling back to classic textarea editor");
        }
      }
      if (this.useCodeMirror && this.cmEditor) {
        try {
          this.cmEditor.destroy();
          const view = this.cmEditor.attach(container, previewEl);
          await this._waitForCodeMirrorReady(view);
          this._editorReady = true;
          console.log("\u2705 CodeMirror editor attached successfully");
          return Promise.resolve();
        } catch (error) {
          console.error("\u274C CodeMirror attach failed, falling back to textarea:", error);
          this.useCodeMirror = false;
          localStorage.setItem("oxidian-disable-codemirror", "true");
        }
      }
      await this.attachClassic(container, previewEl);
      this._editorReady = true;
      return Promise.resolve();
    }
    // *** FIX: Cleanup method to prevent event listener leaks ***
    detach() {
      clearTimeout(this.renderTimeout);
      if (this._renderQueue) {
        cancelIdleCallback(this._renderQueue);
        this._renderQueue = null;
      }
      if (this._abortController) {
        this._abortController.abort();
      }
      this._abortController = new AbortController();
      this.textarea = null;
      this.previewEl = null;
      this.highlightEl = null;
      this.lineNumberEl = null;
      this._hypermark = null;
      this._editorReady = false;
    }
    // *** FIX: Wait for CodeMirror DOM readiness ***
    async _waitForCodeMirrorReady(view) {
      return new Promise((resolve) => {
        if (view && view.dom && view.dom.parentNode) {
          resolve();
          return;
        }
        let attempts = 0;
        const maxAttempts = 50;
        const checkReady = () => {
          attempts++;
          if (view && view.dom && view.dom.parentNode) {
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(checkReady, 100);
          } else {
            console.warn("CodeMirror DOM readiness timeout");
            resolve();
          }
        };
        setTimeout(checkReady, 100);
      });
    }
    async attachClassic(container, previewEl) {
      let textarea = container.querySelector(".editor-textarea");
      if (!textarea) {
        textarea = document.createElement("textarea");
        textarea.className = "editor-textarea";
        textarea.placeholder = "Start writing... (Markdown supported)";
        textarea.spellCheck = true;
        container.appendChild(textarea);
      }
      this.textarea = textarea;
      this.previewEl = previewEl;
      this._setupHighlightOverlay();
      this._setupLineNumbers();
      this.bindEvents();
      return Promise.resolve();
    }
    /** Attach a HyperMarkEditor instance instead of a textarea */
    attachHyperMark(hypermark, previewEl) {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.attachHyperMark(hypermark, previewEl);
        return;
      }
      this.textarea = null;
      this.highlightEl = null;
      this.lineNumberEl = null;
      this._hypermark = hypermark;
      this.previewEl = previewEl;
    }
    /** Create a highlight underlay behind the textarea for syntax coloring */
    _setupHighlightOverlay() {
      return;
    }
    /** Setup line numbers gutter */
    _setupLineNumbers() {
      if (!this.textarea || !this.showLineNumbers) return;
      const parent = this.textarea.parentElement;
      if (!parent) return;
      const gutter = document.createElement("div");
      gutter.className = "editor-line-numbers";
      parent.insertBefore(gutter, parent.firstChild);
      this.lineNumberEl = gutter;
      this.textarea.classList.add("editor-with-line-numbers");
      if (this.highlightEl) this.highlightEl.classList.add("editor-with-line-numbers");
      this._syncLineNumbers();
    }
    /** Toggle line numbers on/off */
    toggleLineNumbers(show) {
      this.showLineNumbers = show;
      localStorage.setItem("oxidian-line-numbers", show.toString());
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.toggleLineNumbers(show);
        return;
      }
      if (!this.textarea) return;
      if (show && !this.lineNumberEl) {
        this._setupLineNumbers();
      } else if (!show && this.lineNumberEl) {
        this.lineNumberEl.remove();
        this.lineNumberEl = null;
        this.textarea.classList.remove("editor-with-line-numbers");
        if (this.highlightEl) this.highlightEl.classList.remove("editor-with-line-numbers");
      }
    }
    /** Sync line numbers with textarea content */
    _syncLineNumbers() {
      if (!this.lineNumberEl || !this.textarea) return;
      const lineCount = this.textarea.value.split("\n").length;
      let html = "";
      for (let i = 1; i <= lineCount; i++) {
        html += `<div class="line-number">${i}</div>`;
      }
      this.lineNumberEl.innerHTML = html;
      this.lineNumberEl.scrollTop = this.textarea.scrollTop;
    }
    /** Sync the highlight overlay with textarea content */
    _syncHighlight() {
      if (!this.highlightEl || !this.textarea) return;
      const text = this.textarea.value;
      this.highlightEl.innerHTML = this._highlightSyntax(text) + "\n";
      this.highlightEl.scrollTop = this.textarea.scrollTop;
      this.highlightEl.scrollLeft = this.textarea.scrollLeft;
    }
    /** Apply syntax highlighting to markdown text */
    _highlightSyntax(text) {
      const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      let result = esc.replace(/(^```(\w*)\n)([\s\S]*?)(^```$)/gm, (match, open, lang, code, close) => {
        const langLabel = lang ? `<span class="hl-code-lang">${lang}</span>` : "";
        return `<span class="hl-code-fence">${open.replace(lang, langLabel)}${this._highlightCode(code)}${close}</span>`;
      });
      result = result.replace(/(?<!`)`([^`\n]+)`(?!`)/g, '<span class="hl-inline-code">`$1`</span>');
      result = result.replace(/^(#{1,6}\s.*)$/gm, (match) => {
        const level = match.match(/^(#{1,6})/)[1].length;
        return `<span class="hl-heading hl-heading-${level}">${match}</span>`;
      });
      result = result.replace(/(\*\*[^*]+\*\*)/g, '<span class="hl-bold">$1</span>');
      result = result.replace(/(?<!\*)(\*[^*\n]+\*)(?!\*)/g, '<span class="hl-italic">$1</span>');
      result = result.replace(/(\[\[[^\]]+\]\])/g, '<span class="hl-wikilink">$1</span>');
      result = result.replace(/((?:^|\s)#[a-zA-Z][\w/-]*)/g, '<span class="hl-tag">$1</span>');
      result = result.replace(/^(&gt;\s?.*)$/gm, '<span class="hl-blockquote">$1</span>');
      result = result.replace(/^([-*_]{3,})$/gm, '<span class="hl-hr">$1</span>');
      result = result.replace(/^(\s*)([-*+]|\d+\.)\s/gm, '$1<span class="hl-list-marker">$2</span> ');
      return result;
    }
    /** Basic syntax highlighting within code blocks */
    _highlightCode(code) {
      let result = code.replace(
        /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|true|false|null|undefined|fn|pub|use|mod|struct|impl|enum|match|self|mut|loop|break|continue|type|interface|extends|def|print|lambda|yield|with|as|in|not|and|or|is)\b/g,
        '<span class="hl-keyword">$1</span>'
      );
      result = result.replace(/(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g, '<span class="hl-string">$1</span>');
      result = result.replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>');
      result = result.replace(/(#.*$)/gm, '<span class="hl-comment">$1</span>');
      result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
      return result;
    }
    bindEvents() {
      if (this.useCodeMirror && this.cmEditor) {
        return;
      }
      if (!this.textarea) return;
      const signal = this._abortController.signal;
      this.textarea.addEventListener("input", () => {
        this.app.markDirty();
        this.scheduleRender();
        this.updateStats();
        this._syncHighlight();
        this._syncLineNumbers();
        this.app.slashMenu?.onInput(this.textarea);
      }, { signal });
      this.textarea.addEventListener("click", () => {
        this.updateCursor();
        this._highlightMatchingBracket();
      }, { signal });
      this.textarea.addEventListener("keyup", (e) => {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          this.updateCursor();
          this._highlightMatchingBracket();
        }
      }, { signal });
      this.textarea.addEventListener("keydown", (e) => this.handleEditorKeys(e), { signal });
      this.textarea.addEventListener("blur", () => {
        if (this.app.isDirty) {
          this.app.saveCurrentFile().catch(() => {
          });
        }
      }, { signal });
      this.textarea.addEventListener("scroll", () => {
        this.syncScroll();
        if (this.highlightEl) {
          this.highlightEl.scrollTop = this.textarea.scrollTop;
          this.highlightEl.scrollLeft = this.textarea.scrollLeft;
        }
        if (this.lineNumberEl) {
          this.lineNumberEl.scrollTop = this.textarea.scrollTop;
        }
      }, { signal });
      this.textarea.addEventListener("contextmenu", (e) => {
        this.app.contextMenu?.showEditorMenu(e, this.textarea);
      }, { signal });
    }
    async setContent(content, retryCount = 0) {
      this._lastKnownContent = content || "";
      try {
        if (!this._editorReady && retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return this.setContent(content, retryCount + 1);
        }
        if (this.useCodeMirror && this.cmEditor) {
          this.cmEditor.setContent(content);
          return;
        }
        if (this._hypermark) {
          this._hypermark.setContent(content);
          this.renderPreview();
          this.updateStatsFromContent(content);
          return;
        }
        if (!this.textarea) {
          if (retryCount < 3) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return this.setContent(content, retryCount + 1);
          }
          console.warn("setContent failed: no textarea available");
          return;
        }
        this.textarea.value = content;
        this.renderPreview();
        this.updateStats();
        this.updateCursor();
        this._syncHighlight();
        this._syncLineNumbers();
        this.textarea.focus();
        this.textarea.scrollTop = 0;
      } catch (error) {
        console.warn(`setContent attempt ${retryCount + 1} failed:`, error);
        if (retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return this.setContent(content, retryCount + 1);
        }
        console.error("setContent failed after 3 retries:", error);
      }
    }
    getContent() {
      let content = "";
      try {
        if (this.useCodeMirror && this.cmEditor) {
          content = this.cmEditor.getContent() || "";
        } else if (this._hypermark) {
          content = this._hypermark.getContent() || "";
        } else if (this.textarea) {
          content = this.textarea.value || "";
        }
        if (content) {
          this._lastKnownContent = content;
        }
        return content || this._lastKnownContent || "";
      } catch (error) {
        console.warn("Error getting content, using cached fallback:", error);
        return this._lastKnownContent || "";
      }
    }
    /** Get current selection */
    getSelection() {
      if (this.useCodeMirror && this.cmEditor) {
        return this.cmEditor.getSelection();
      }
      if (!this.textarea) return "";
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      return this.textarea.value.substring(start, end);
    }
    /** Replace current selection */
    replaceSelection(text) {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.replaceSelection(text);
        return;
      }
      if (!this.textarea) return;
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;
      this.textarea.value = value.substring(0, start) + text + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
      this.app.markDirty();
      this.scheduleRender();
      this._syncHighlight();
      this._syncLineNumbers();
    }
    /** Get cursor position */
    getCursor() {
      if (this.useCodeMirror && this.cmEditor) {
        return this.cmEditor.getCursor();
      }
      if (!this.textarea) return { line: 1, ch: 0 };
      const pos = this.textarea.selectionStart;
      const text = this.textarea.value;
      const lines = text.substring(0, pos).split("\n");
      const line = lines.length;
      const ch = lines[lines.length - 1].length;
      return { line, ch };
    }
    /** Update word/char stats from a content string (used by HyperMark path) */
    updateStatsFromContent(content) {
      if (!content) content = "";
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      const chars = content.length;
      const readingTime = Math.max(1, Math.ceil(words / 238));
      const wc = document.getElementById("status-word-count");
      const cc = document.getElementById("status-char-count");
      const rt = document.getElementById("status-reading-time");
      if (wc) wc.textContent = `${words} words`;
      if (cc) cc.textContent = `${chars} characters`;
      if (rt) rt.textContent = `${readingTime} min read`;
      this.app.updateOutline?.(content);
    }
    scheduleRender() {
      clearTimeout(this.renderTimeout);
      if (this._renderQueue) {
        cancelIdleCallback(this._renderQueue);
        this._renderQueue = null;
      }
      this.renderTimeout = setTimeout(() => {
        this._renderQueue = requestIdleCallback(() => {
          this.renderPreview();
          this._renderQueue = null;
        }, { timeout: 1e3 });
      }, 500);
    }
    async renderPreview() {
      if (this.useCodeMirror && this.cmEditor) {
        await this.cmEditor.renderPreview();
        return;
      }
      if (!this.textarea || !this.previewEl) return;
      const content = this.textarea.value;
      if (content === this._lastRenderContent) {
        return;
      }
      if (!content.trim()) {
        this.previewEl.innerHTML = '<p style="color: var(--text-faint)">Preview will appear here...</p>';
        this._lastRenderContent = content;
        return;
      }
      try {
        const html = await this.app.renderMarkdown(content);
        if (this.previewEl.innerHTML !== html) {
          const scrollTop = this.previewEl.scrollTop;
          this.previewEl.innerHTML = html;
          await this.app.postProcessRendered?.(this.previewEl);
          this.previewEl.scrollTop = scrollTop;
        }
        this._lastRenderContent = content;
      } catch (err) {
        console.error("Render failed:", err);
        this.previewEl.innerHTML = `<div class="render-error" style="color: var(--text-error, #dc2626); padding: 12px; border: 1px solid var(--border-error, #dc2626); border-radius: 4px;">
                <strong>Render Error:</strong> ${err.message || err}
            </div>`;
      }
    }
    togglePreview() {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.togglePreview();
        return;
      }
      if (!this.textarea) return;
      const previewPane = this.previewEl?.closest(".preview-pane-half");
      if (!previewPane) return;
      this.previewVisible = !this.previewVisible;
      previewPane.style.display = this.previewVisible ? "" : "none";
    }
    updateStats() {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.updateStats();
        return;
      }
      if (!this.textarea) return;
      const content = this.textarea.value;
      this.updateStatsFromContent(content);
    }
    updateCursor() {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.updateCursor();
        return;
      }
      if (!this.textarea) return;
      const text = this.textarea.value;
      const pos = this.textarea.selectionStart;
      const lines = text.substring(0, pos).split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      const el = document.getElementById("status-cursor");
      if (el) el.textContent = `Ln ${line}, Col ${col}`;
    }
    syncScroll() {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.syncScroll();
        return;
      }
      if (!this.previewVisible || !this.textarea || !this.previewEl) return;
      const previewPane = this.previewEl.closest(".preview-pane-half");
      if (!previewPane) return;
      const ratio = this.textarea.scrollTop / (this.textarea.scrollHeight - this.textarea.clientHeight || 1);
      previewPane.scrollTop = ratio * (previewPane.scrollHeight - previewPane.clientHeight);
    }
    /** Highlight matching bracket at cursor */
    _highlightMatchingBracket() {
      document.querySelectorAll(".bracket-highlight").forEach((el2) => el2.remove());
      if (!this.textarea) return;
      const pos = this.textarea.selectionStart;
      const text = this.textarea.value;
      const char = text[pos] || "";
      const charBefore = pos > 0 ? text[pos - 1] : "";
      const openBrackets = "([{";
      const closeBrackets2 = ")]}";
      const allBrackets = openBrackets + closeBrackets2;
      let bracketPos = -1;
      let bracketChar = "";
      if (allBrackets.includes(char)) {
        bracketPos = pos;
        bracketChar = char;
      } else if (allBrackets.includes(charBefore)) {
        bracketPos = pos - 1;
        bracketChar = charBefore;
      }
      if (bracketPos === -1) return;
      const isOpen = openBrackets.includes(bracketChar);
      const pairIndex = isOpen ? openBrackets.indexOf(bracketChar) : closeBrackets2.indexOf(bracketChar);
      const matchChar = isOpen ? closeBrackets2[pairIndex] : openBrackets[pairIndex];
      let depth = 0;
      let matchPos = -1;
      if (isOpen) {
        for (let i = bracketPos; i < text.length; i++) {
          if (text[i] === bracketChar) depth++;
          if (text[i] === matchChar) depth--;
          if (depth === 0) {
            matchPos = i;
            break;
          }
        }
      } else {
        for (let i = bracketPos; i >= 0; i--) {
          if (text[i] === bracketChar) depth++;
          if (text[i] === matchChar) depth--;
          if (depth === 0) {
            matchPos = i;
            break;
          }
        }
      }
      if (matchPos === -1) return;
      const el = document.getElementById("status-cursor");
      if (el) {
        const lines = text.substring(0, matchPos).split("\n");
        const matchLine = lines.length;
        const matchCol = lines[lines.length - 1].length + 1;
        el.title = `Matching bracket at Ln ${matchLine}, Col ${matchCol}`;
      }
    }
    /** Insert markdown text at cursor — delegates to CodeMirror or HyperMark if active */
    insertMarkdown(text) {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.insertMarkdown(text);
        return;
      }
      if (this._hypermark) {
        this._hypermark.insertAtCursor(text);
        this.app.markDirty();
        return;
      }
      if (!this.textarea) return;
      const start = this.textarea.selectionStart;
      const value = this.textarea.value;
      this.textarea.value = value.substring(0, start) + text + value.substring(start);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
      this.textarea.focus();
      this.app.markDirty();
      this.scheduleRender();
      this._syncHighlight();
      this._syncLineNumbers();
    }
    wrapSelection(before, after) {
      if (this.useCodeMirror && this.cmEditor) {
        this.cmEditor.wrapSelection(before, after);
        return;
      }
      if (this._hypermark) {
        this._hypermark.wrapSelection(before, after);
        this.app.markDirty();
        return;
      }
      if (!this.textarea) return;
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;
      const selected = value.substring(start, end);
      const replacement = before + (selected || "text") + after;
      this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
      if (selected) {
        this.textarea.selectionStart = start;
        this.textarea.selectionEnd = start + replacement.length;
      } else {
        this.textarea.selectionStart = start + before.length;
        this.textarea.selectionEnd = start + before.length + 4;
      }
      this.textarea.focus();
      this.app.markDirty();
      this.scheduleRender();
      this._syncHighlight();
    }
    // Classic editor keyboard handling (only used for textarea fallback)
    handleEditorKeys(e) {
      if (this.app.slashMenu?.handleKeyDown(e)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        if (e.shiftKey) {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const line = value.substring(lineStart, end);
          const spaces = line.match(/^( {1,2}|\t)/);
          if (spaces) {
            const removed = spaces[0].length;
            this.textarea.value = value.substring(0, lineStart) + line.substring(removed) + value.substring(end);
            this.textarea.selectionStart = Math.max(lineStart, start - removed);
            this.textarea.selectionEnd = Math.max(lineStart, start - removed);
          }
        } else {
          this.textarea.value = value.substring(0, start) + "  " + value.substring(end);
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        }
        this.app.markDirty();
        this.scheduleRender();
        this._syncHighlight();
        this._syncLineNumbers();
        return;
      }
      if (ctrl && e.key === "d") {
        if (document.activeElement !== this.textarea) return;
        e.preventDefault();
        e.stopPropagation();
        const pos = this.textarea.selectionStart;
        const value = this.textarea.value;
        const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
        const lineEnd = value.indexOf("\n", pos);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        const insertPos = lineEnd === -1 ? value.length : lineEnd;
        this.textarea.value = value.substring(0, insertPos) + "\n" + line + value.substring(insertPos);
        this.textarea.selectionStart = this.textarea.selectionEnd = pos + line.length + 1;
        this.app.markDirty();
        this._syncHighlight();
        this._syncLineNumbers();
        return;
      }
      if (ctrl && e.key === "/") {
        if (document.activeElement !== this.textarea) return;
        e.preventDefault();
        e.stopPropagation();
        const pos = this.textarea.selectionStart;
        const value = this.textarea.value;
        const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
        const lineEnd = value.indexOf("\n", pos);
        const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
        const end = lineEnd === -1 ? value.length : lineEnd;
        const commentMatch = line.match(/^(\s*)<!--\s?(.*?)\s?-->$/);
        let newLine, newPos;
        if (commentMatch) {
          newLine = commentMatch[1] + commentMatch[2];
          newPos = lineStart + Math.min(pos - lineStart, newLine.length);
        } else {
          newLine = "<!-- " + line + " -->";
          newPos = pos + 5;
        }
        this.textarea.value = value.substring(0, lineStart) + newLine + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
        this.app.markDirty();
        this._syncHighlight();
        this._syncLineNumbers();
        return;
      }
      if (ctrl && e.key === "b") {
        e.preventDefault();
        this.wrapSelection("**", "**");
        return;
      }
      if (ctrl && e.key === "i") {
        e.preventDefault();
        this.wrapSelection("*", "*");
        return;
      }
      if (ctrl && e.shiftKey && e.key === "X") {
        e.preventDefault();
        this.wrapSelection("~~", "~~");
        return;
      }
      if (ctrl && e.key === "`") {
        e.preventDefault();
        this.wrapSelection("`", "`");
        return;
      }
      if (ctrl && e.shiftKey && e.key === "K") {
        e.preventDefault();
        this.wrapSelection("```\n", "\n```");
        return;
      }
      if (ctrl && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        this.insertLink();
        return;
      }
      if (ctrl && e.key === "h") {
        e.preventDefault();
        this.cycleHeading();
        return;
      }
      if (!ctrl && !e.altKey && this._autoPairs[e.key]) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        const closeChar = this._autoPairs[e.key];
        if (start !== end) {
          e.preventDefault();
          const selected = value.substring(start, end);
          this.textarea.value = value.substring(0, start) + e.key + selected + closeChar + value.substring(end);
          this.textarea.selectionStart = start + 1;
          this.textarea.selectionEnd = end + 1;
          this.app.markDirty();
          this._syncHighlight();
          return;
        }
        if ((e.key === '"' || e.key === "`") && value[start] === e.key) {
          e.preventDefault();
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
          return;
        }
        const closingBrackets = ")]}";
        if (closingBrackets.includes(e.key) && value[start] === e.key) {
          e.preventDefault();
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
          return;
        }
        if (e.key !== "*") {
          e.preventDefault();
          this.textarea.value = value.substring(0, start) + e.key + closeChar + value.substring(end);
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 1;
          this.app.markDirty();
          this._syncHighlight();
          return;
        }
      }
      if (e.key === "Enter" && !ctrl && !e.shiftKey) {
        const pos = this.textarea.selectionStart;
        const value = this.textarea.value;
        const lines = value.substring(0, pos).split("\n");
        const currentLine = lines[lines.length - 1];
        const indent = currentLine.match(/^(\s*)/)[1];
        const checkboxMatch = currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s/);
        const bulletMatch = currentLine.match(/^(\s*)([-*+])\s/);
        const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
        let continuation = null;
        if (checkboxMatch) {
          if (currentLine.match(/^(\s*)([-*+])\s\[[ x]\]\s*$/)) {
            e.preventDefault();
            const lineStart = pos - currentLine.length;
            this.textarea.value = value.substring(0, lineStart) + "\n" + value.substring(pos);
            this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
            this.app.markDirty();
            this.scheduleRender();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
          }
          continuation = `${checkboxMatch[1]}${checkboxMatch[2]} [ ] `;
        } else if (bulletMatch) {
          if (currentLine.match(/^(\s*)([-*+])\s*$/)) {
            e.preventDefault();
            const lineStart = pos - currentLine.length;
            this.textarea.value = value.substring(0, lineStart) + "\n" + value.substring(pos);
            this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
            this.app.markDirty();
            this.scheduleRender();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
          }
          continuation = `${bulletMatch[1]}${bulletMatch[2]} `;
        } else if (numberedMatch) {
          if (currentLine.match(/^(\s*)(\d+)\.\s*$/)) {
            e.preventDefault();
            const lineStart = pos - currentLine.length;
            this.textarea.value = value.substring(0, lineStart) + "\n" + value.substring(pos);
            this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + 1;
            this.app.markDirty();
            this.scheduleRender();
            this._syncHighlight();
            this._syncLineNumbers();
            return;
          }
          const nextNum = parseInt(numberedMatch[2]) + 1;
          continuation = `${numberedMatch[1]}${nextNum}. `;
        }
        if (continuation) {
          e.preventDefault();
          this.textarea.value = value.substring(0, pos) + "\n" + continuation + value.substring(pos);
          const newPos = pos + 1 + continuation.length;
          this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
          this.app.markDirty();
          this.scheduleRender();
          this._syncHighlight();
          this._syncLineNumbers();
        } else if (indent) {
          e.preventDefault();
          this.textarea.value = value.substring(0, pos) + "\n" + indent + value.substring(pos);
          const newPos = pos + 1 + indent.length;
          this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
          this.app.markDirty();
          this.scheduleRender();
          this._syncHighlight();
          this._syncLineNumbers();
        }
      }
    }
    cycleHeading() {
      if (!this.textarea) return;
      const pos = this.textarea.selectionStart;
      const value = this.textarea.value;
      const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
      const lineEnd = value.indexOf("\n", pos);
      const line = value.substring(lineStart, lineEnd === -1 ? value.length : lineEnd);
      const headingMatch = line.match(/^(#{1,6})\s/);
      let newLine;
      if (!headingMatch) {
        newLine = "# " + line;
      } else if (headingMatch[1].length >= 6) {
        newLine = line.replace(/^#{1,6}\s/, "");
      } else {
        newLine = "#" + line;
      }
      const end = lineEnd === -1 ? value.length : lineEnd;
      this.textarea.value = value.substring(0, lineStart) + newLine + value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = lineStart + newLine.length;
      this.app.markDirty();
      this.scheduleRender();
      this._syncHighlight();
      this._syncLineNumbers();
    }
    insertLink() {
      if (!this.textarea) return;
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.textarea.value;
      const selected = value.substring(start, end);
      if (selected) {
        const replacement = `[${selected}](url)`;
        this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
        this.textarea.selectionStart = start + selected.length + 3;
        this.textarea.selectionEnd = start + selected.length + 6;
      } else {
        const replacement = "[text](url)";
        this.textarea.value = value.substring(0, start) + replacement + value.substring(end);
        this.textarea.selectionStart = start + 1;
        this.textarea.selectionEnd = start + 5;
      }
      this.textarea.focus();
      this.app.markDirty();
      this.scheduleRender();
      this._syncHighlight();
    }
  };

  // src/js/sidebar.js
  init_tauri_bridge();
  var Sidebar = class {
    constructor(app) {
      this.app = app;
      this.container = document.getElementById("file-tree");
      this.activePath = null;
      this.openFolders = /* @__PURE__ */ new Set();
    }
    // --- Data Layer (all via Rust) ---
    async refresh() {
      try {
        const tree = await invoke("scan_vault", { path: this.app.vaultPath || "" });
        this.render(tree.children || []);
      } catch (err) {
        console.error("Failed to scan vault:", err);
        this.app?.showErrorToast?.(`Failed to load file list: ${err.message || err}`);
        this.render([]);
      }
    }
    async createFile(path) {
      try {
        await invoke("create_file", { path });
        await this.refresh();
        return true;
      } catch (err) {
        console.error("Failed to create file:", err);
        this.app?.showErrorToast?.(`Failed to create file: ${err.message || err}`);
        return false;
      }
    }
    async createFolder(path) {
      try {
        await invoke("create_folder", { path });
        await this.refresh();
        return true;
      } catch (err) {
        console.error("Failed to create folder:", err);
        this.app?.showErrorToast?.(`Failed to create folder: ${err.message || err}`);
        return false;
      }
    }
    async renameFile(oldPath, newPath) {
      try {
        await invoke("rename_file", { oldPath, newPath });
        await this.refresh();
        return true;
      } catch (err) {
        console.error("Failed to rename file:", err);
        this.app?.showErrorToast?.(`Failed to rename: ${err.message || err}`);
        return false;
      }
    }
    async deleteNote(path) {
      try {
        await invoke("delete_note", { path });
        await this.refresh();
        return true;
      } catch (err) {
        console.error("Failed to delete note:", err);
        this.app?.showErrorToast?.(`Failed to delete: ${err.message || err}`);
        return false;
      }
    }
    async moveEntry(oldPath, newPath) {
      try {
        await invoke("move_entry", { oldPath, newPath });
        await this.refresh();
        return true;
      } catch (err) {
        console.error("Failed to move entry:", err);
        this.app?.showErrorToast?.(`Failed to move: ${err.message || err}`);
        return false;
      }
    }
    async getRecentFiles() {
      try {
        return await invoke("get_recent_files");
      } catch (err) {
        console.error("Failed to get recent files:", err);
        return [];
      }
    }
    async addRecentFile(path) {
      try {
        await invoke("add_recent_file", { path });
      } catch (err) {
        console.error("Failed to add recent file:", err);
      }
    }
    // --- UI Layer (DOM rendering, events) ---
    render(nodes, depth = 0) {
      if (!this.container) {
        console.warn("Sidebar container not found");
        return document.createDocumentFragment();
      }
      if (!Array.isArray(nodes)) {
        console.warn("Invalid nodes data for sidebar render");
        nodes = [];
      }
      if (depth === 0) {
        this.container.innerHTML = "";
      }
      const fragment = document.createDocumentFragment();
      for (const node of nodes) {
        if (!node) continue;
        try {
          if (node.is_dir) {
            fragment.appendChild(this.createFolderNode(node, depth));
          } else {
            fragment.appendChild(this.createFileNode(node, depth));
          }
        } catch (err) {
          console.error("Failed to create tree node:", err, node);
        }
      }
      if (depth === 0) {
        this.container.appendChild(fragment);
        if (nodes.length === 0) {
          const empty = document.createElement("div");
          empty.className = "tree-item";
          empty.style.color = "var(--text-muted)";
          empty.style.fontStyle = "italic";
          empty.innerHTML = '<span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg></span><span class="name">Vault is empty</span>';
          this.container.appendChild(empty);
        }
      }
      return fragment;
    }
    createFolderNode(node, depth) {
      const wrapper = document.createElement("div");
      const item = document.createElement("div");
      item.className = "tree-item";
      item.setAttribute("data-depth", depth);
      item.setAttribute("data-path", node.path);
      const isOpen = this.openFolders.has(node.path);
      const chevronSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
      const folderSvg = isOpen ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="9" y1="13" x2="15" y2="13"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
      item.innerHTML = `<span class="chevron ${isOpen ? "open" : ""}">${chevronSvg}</span><span class="icon folder-icon ${isOpen ? "folder-open" : ""}">${folderSvg}</span><span class="name">${this.escapeHtml(node.name)}</span>`;
      const childContainer = document.createElement("div");
      childContainer.className = `tree-folder-children ${isOpen ? "open" : ""}`;
      for (const child of node.children || []) {
        if (child.is_dir) {
          childContainer.appendChild(this.createFolderNode(child, depth + 1));
        } else {
          childContainer.appendChild(this.createFileNode(child, depth + 1));
        }
      }
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = this.openFolders.has(node.path);
        const iconEl = item.querySelector(".folder-icon");
        if (wasOpen) {
          this.openFolders.delete(node.path);
          childContainer.classList.remove("open");
          item.querySelector(".chevron").classList.remove("open");
          iconEl?.classList.remove("folder-open");
          if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
        } else {
          this.openFolders.add(node.path);
          childContainer.classList.add("open");
          item.querySelector(".chevron").classList.add("open");
          iconEl?.classList.add("folder-open");
          if (iconEl) iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="9" y1="13" x2="15" y2="13"/></svg>';
        }
      });
      item.addEventListener("contextmenu", (e) => {
        this.app.contextMenu.showFileMenu(e, node.path, true);
      });
      wrapper.appendChild(item);
      wrapper.appendChild(childContainer);
      return wrapper;
    }
    createFileNode(node, depth) {
      const item = document.createElement("div");
      item.className = "tree-item";
      item.setAttribute("data-depth", depth);
      item.setAttribute("data-path", node.path);
      if (node.path === this.activePath) {
        item.classList.add("active");
      }
      const icon = this.getFileIconSvg(node.name);
      const displayName = node.name.replace(".md", "");
      item.innerHTML = `<span class="chevron" style="visibility:hidden"><svg width="10" height="10" viewBox="0 0 24 24"></svg></span><span class="icon">${icon}</span><span class="name">${this.escapeHtml(displayName)}</span>`;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.app.openFile(node.path);
      });
      item.addEventListener("contextmenu", (e) => {
        this.app.contextMenu.showFileMenu(e, node.path, false);
      });
      return item;
    }
    getFileIconSvg(name) {
      if (/^\d{4}-\d{2}-\d{2}\.md$/.test(name)) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      }
      if (/\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(name)) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      }
      if (/\.pdf$/i.test(name)) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
      }
      if (/\.(json|yaml|yml|toml|ini|conf)$/i.test(name)) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
      }
      if (/\.canvas$/i.test(name)) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/><path d="M10 6h4M6 10v4M18 10v4M10 18h4"/></svg>';
      }
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    }
    setActive(path) {
      this.activePath = path;
      this.container.querySelectorAll(".tree-item").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-path") === path);
      });
      const parts = path.split("/");
      let current = "";
      let changed = false;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        if (!this.openFolders.has(current)) {
          this.openFolders.add(current);
          changed = true;
        }
      }
      if (changed) this.refresh();
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/search.js
  init_tauri_bridge();
  var Search = class {
    constructor(app) {
      this.app = app;
      this.input = document.getElementById("search-input");
      this.results = document.getElementById("search-results");
      this.searchTimeout = null;
      this.init();
    }
    init() {
      if (!this.input || !this.results) {
        console.error("Search input or results container not found");
        return;
      }
      this.input.addEventListener("input", () => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          const query = this.input.value.trim();
          if (query.length >= 2) {
            this.performSearch(query).catch((err) => {
              console.error("Search error:", err);
            });
          } else if (query.length === 0) {
            this.results.innerHTML = "";
          } else {
            this.showSuggestions(query);
          }
        }, 200);
      });
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = this.results.querySelector(".search-result-item");
          if (first) first.click();
        }
        if (e.key === "Escape") {
          this.input.value = "";
          this.results.innerHTML = "";
        }
      });
    }
    show() {
      this.app.switchSidebarPanel("search");
      setTimeout(() => {
        this.input.focus();
        this.input.select();
      }, 50);
    }
    setQuery(query) {
      this.input.value = query;
    }
    /**
     * Full-text search via Rust backend.
     */
    async performSearch(query) {
      if (!this.results) return;
      try {
        let results;
        if (query.startsWith("#")) {
          const tag = query.slice(1);
          results = await invoke("search_by_tag", { tag });
        } else {
          results = await invoke("search_vault", { query, options: {} });
        }
        this.renderResults(results);
      } catch (err) {
        console.error("Search failed:", err);
        this.app?.showErrorToast?.(`Search failed: ${err.message || err}`);
        this.renderError(err);
      }
    }
    /**
     * Fuzzy search for quick results.
     */
    async performFuzzySearch(query) {
      if (!this.results) return;
      try {
        const results = await invoke("fuzzy_search", { query });
        this.renderResults(results);
      } catch (err) {
        console.error("Fuzzy search failed:", err);
      }
    }
    /**
     * Show search suggestions for short prefixes.
     */
    async showSuggestions(prefix) {
      if (!this.results) return;
      try {
        const suggestions = await invoke("search_suggest", { prefix });
        this.renderSuggestions(suggestions);
      } catch (err) {
      }
    }
    renderResults(results) {
      if (!this.results) return;
      this.results.innerHTML = "";
      if (!Array.isArray(results)) {
        console.warn("Invalid search results data");
        results = [];
      }
      if (results.length === 0) {
        const empty = document.createElement("div");
        empty.className = "search-result-item";
        empty.style.color = "var(--text-muted)";
        empty.textContent = "No results found";
        this.results.appendChild(empty);
        return;
      }
      for (const result of results) {
        if (!result || !result.path) continue;
        try {
          const item = document.createElement("div");
          item.className = "search-result-item";
          item.innerHTML = `
                    <div class="search-result-title">${this.escapeHtml(result.title || result.path)}</div>
                    <div class="search-result-path">${this.escapeHtml(result.path)}</div>
                    <div class="search-result-snippet">${this.escapeHtml(result.snippet || "")}</div>
                `;
          item.addEventListener("click", () => {
            if (this.app?.openFile) {
              this.app.openFile(result.path);
            }
          });
          this.results.appendChild(item);
        } catch (err) {
          console.error("Failed to render search result:", err, result);
        }
      }
    }
    renderSuggestions(suggestions) {
      if (!this.results) return;
      this.results.innerHTML = "";
      if (!Array.isArray(suggestions) || suggestions.length === 0) return;
      for (const suggestion of suggestions) {
        const item = document.createElement("div");
        item.className = "search-result-item search-suggestion";
        item.textContent = suggestion;
        item.addEventListener("click", () => {
          this.input.value = suggestion;
          this.performSearch(suggestion);
        });
        this.results.appendChild(item);
      }
    }
    renderError(err) {
      if (!this.results) return;
      const errDiv = document.createElement("div");
      errDiv.className = "search-result-item";
      errDiv.style.color = "var(--text-error, #dc2626)";
      errDiv.style.padding = "8px 12px";
      errDiv.innerHTML = `
            <div style="font-weight: 500;">Search Error</div>
            <div style="font-size: 0.9em; opacity: 0.8;">${this.escapeHtml(err.message || err.toString())}</div>
        `;
      this.results.innerHTML = "";
      this.results.appendChild(errDiv);
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/tabs.js
  var TabManager = class {
    constructor(app) {
      this.app = app;
      this.tabs = [];
      this.activeTabId = null;
      this.tabList = document.getElementById("tab-list");
      this.tabListRight = null;
      this.nextId = 1;
      this.splitActive = false;
      this.dragState = null;
      this._dropOverlay = null;
      if (!this.tabList) {
        console.error("Tab list container not found");
        return;
      }
      this.initDragDrop();
    }
    openTab(path, title, type = "note", pane = 0) {
      if (!path) {
        console.error("Cannot open tab: path is required");
        return null;
      }
      const existing = this.tabs.find((t) => t.path === path && t.type === type);
      if (existing) {
        if (existing.pane !== pane) {
          existing.pane = pane;
          this.renderTabs();
        }
        this.activateTab(existing.id);
        return existing.id;
      }
      const tab = {
        id: this.nextId++,
        path,
        title: title || path.split("/").pop().replace(".md", ""),
        type,
        dirty: false,
        pane,
        // *** FIX: Add timestamp for better tab ordering ***
        created: Date.now()
      };
      this.tabs.push(tab);
      const maxTabs = 20;
      if (this.tabs.length > maxTabs) {
        const oldTabs = this.tabs.filter((t) => !t.dirty && t.id !== tab.id).sort((a, b) => a.created - b.created);
        if (oldTabs.length > 0) {
          this.closeTab(oldTabs[0].id);
        }
      }
      this.renderTabs();
      this.activateTab(tab.id);
      return tab.id;
    }
    activateTab(id, forceUpdate = false) {
      if (!id && id !== 0) {
        console.warn("Invalid tab ID for activation:", id);
        return;
      }
      const changed = this.activeTabId !== id;
      if (!changed && !forceUpdate) return;
      const tab = this.tabs.find((t) => t.id === id);
      if (!tab) {
        console.warn("Tab not found for activation:", id);
        return;
      }
      this.activeTabId = id;
      this.renderTabs();
      try {
        this.app?.onTabActivated?.(tab);
      } catch (err) {
        console.error("Error in onTabActivated callback:", err);
        this.app?.showErrorToast?.("Failed to activate tab");
      }
    }
    closeTab(id) {
      const idx = this.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const closedTab = this.tabs[idx];
      const wasActive = this.activeTabId === id;
      this.tabs.splice(idx, 1);
      if (this.splitActive && !this.tabs.some((t) => t.pane === 1)) {
        this.unsplit();
      }
      if (wasActive) {
        if (this.tabs.length > 0) {
          const samePane = this.tabs.filter((t) => t.pane === closedTab.pane);
          if (samePane.length > 0) {
            const newIdx = Math.min(idx, samePane.length - 1);
            this.activeTabId = samePane[newIdx].id;
            this.app.onTabActivated(samePane[newIdx]);
          } else {
            const newIdx = Math.min(idx, this.tabs.length - 1);
            this.activeTabId = this.tabs[newIdx].id;
            this.app.onTabActivated(this.tabs[newIdx]);
          }
        } else {
          this.activeTabId = null;
          this.app.onAllTabsClosed();
        }
      }
      this.renderTabs();
    }
    moveTabToPane(tabId, targetPane) {
      const tab = this.tabs.find((t) => t.id === tabId);
      if (!tab) return;
      if (tab.pane === targetPane) return;
      if (targetPane === 1 && !this.splitActive) {
        this.split();
      }
      tab.pane = targetPane;
      if (this.splitActive && !this.tabs.some((t) => t.pane === 1)) {
        this.unsplit();
      } else {
        this.renderTabs();
        this.activateTab(tabId, true);
      }
    }
    split() {
      if (this.splitActive) return;
      this.splitActive = true;
      this.app.createSplitLayout();
      this.renderTabs();
    }
    unsplit() {
      if (!this.splitActive) return;
      this.splitActive = false;
      this.tabs.forEach((t) => t.pane = 0);
      this.app.removeSplitLayout();
      this.renderTabs();
      if (this.tabs.length > 0) {
        this.activateTab(this.tabs[0].id, true);
      }
    }
    markDirty(path) {
      const tab = this.tabs.find((t) => t.path === path && t.type === "note");
      if (tab) {
        tab.dirty = true;
        this.renderTabs();
      }
    }
    markClean(path) {
      const tab = this.tabs.find((t) => t.path === path && t.type === "note");
      if (tab) {
        tab.dirty = false;
        this.renderTabs();
      }
    }
    getActiveTab() {
      return this.tabs.find((t) => t.id === this.activeTabId) || null;
    }
    renderTabs() {
      this.renderTabList(this.tabList, 0);
      if (this.splitActive && this.tabListRight) {
        this.renderTabList(this.tabListRight, 1);
      }
    }
    renderTabList(container, pane) {
      if (!container) return;
      container.innerHTML = "";
      const paneTabs = this.tabs.filter((t) => t.pane === pane);
      for (const tab of paneTabs) {
        const el = document.createElement("div");
        el.className = "tab" + (tab.id === this.activeTabId ? " active" : "");
        el.setAttribute("data-tab-id", tab.id);
        el.setAttribute("draggable", "true");
        const iconSvg = tab.type === "graph" ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M8.5 7.5L15.5 16.5M15.5 7.5L8.5 16.5"/></svg>' : tab.type === "settings" ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        const dirtyDot = tab.dirty ? '<span style="color:var(--text-yellow);margin-left:2px">\u25CF</span>' : "";
        el.innerHTML = `
                <span class="tab-icon">${iconSvg}</span>
                <span class="tab-title">${this.escapeHtml(tab.title)}${dirtyDot}</span>
                <span class="tab-close">\u2715</span>
            `;
        el.addEventListener("click", (e) => {
          if (e.target.closest(".tab-close")) {
            this.closeTab(tab.id);
          } else {
            this.activateTab(tab.id);
          }
        });
        el.addEventListener("mousedown", (e) => {
          if (e.button === 1) {
            e.preventDefault();
            this.closeTab(tab.id);
          }
        });
        el.addEventListener("dragstart", (e) => {
          this.dragState = { tabId: tab.id, fromPane: tab.pane };
          e.dataTransfer.setData("text/plain", tab.id.toString());
          e.dataTransfer.effectAllowed = "move";
          el.classList.add("dragging");
          requestAnimationFrame(() => el.classList.add("drag-ghost"));
        });
        el.addEventListener("dragend", () => {
          el.classList.remove("dragging", "drag-ghost");
          this.dragState = null;
          this._hideDropOverlay();
          this._clearDropIndicators(container);
        });
        el.addEventListener("dragover", (e) => {
          if (!this.dragState) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const rect = el.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          this._clearDropIndicators(container);
          if (e.clientX < midX) {
            el.classList.add("drop-before");
          } else {
            el.classList.add("drop-after");
          }
        });
        el.addEventListener("dragleave", () => {
          el.classList.remove("drop-before", "drop-after");
        });
        el.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.dragState) return;
          const draggedId = this.dragState.tabId;
          const targetId = tab.id;
          if (draggedId === targetId) return;
          const rect = el.getBoundingClientRect();
          const insertBefore = e.clientX < rect.left + rect.width / 2;
          const dragIdx = this.tabs.findIndex((t) => t.id === draggedId);
          const targetIdx = this.tabs.findIndex((t) => t.id === targetId);
          if (dragIdx === -1 || targetIdx === -1) return;
          const [draggedTab] = this.tabs.splice(dragIdx, 1);
          draggedTab.pane = tab.pane;
          let insertIdx = this.tabs.findIndex((t) => t.id === targetId);
          if (!insertBefore) insertIdx++;
          this.tabs.splice(insertIdx, 0, draggedTab);
          this._clearDropIndicators(container);
          this.dragState = null;
          this._hideDropOverlay();
          this.renderTabs();
        });
        container.appendChild(el);
      }
    }
    _clearDropIndicators(container) {
      if (!container) return;
      container.querySelectorAll(".tab").forEach((t) => t.classList.remove("drop-before", "drop-after"));
    }
    _createDropOverlay() {
      if (this._dropOverlay) return this._dropOverlay;
      const overlay = document.createElement("div");
      overlay.className = "split-drop-overlay";
      overlay.innerHTML = `
            <div class="split-drop-zone split-drop-left" data-pane="0">
                <div class="split-drop-label">\u25C0 Left Pane</div>
            </div>
            <div class="split-drop-zone split-drop-right" data-pane="1">
                <div class="split-drop-label">Right Pane \u25B6</div>
            </div>
        `;
      overlay.querySelectorAll(".split-drop-zone").forEach((zone) => {
        zone.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        });
        zone.addEventListener("dragenter", (e) => {
          e.preventDefault();
          zone.classList.add("active");
        });
        zone.addEventListener("dragleave", (e) => {
          if (!zone.contains(e.relatedTarget)) {
            zone.classList.remove("active");
          }
        });
        zone.addEventListener("drop", (e) => {
          e.preventDefault();
          if (!this.dragState) return;
          const targetPane = parseInt(zone.dataset.pane);
          this.moveTabToPane(this.dragState.tabId, targetPane);
          this.dragState = null;
          this._hideDropOverlay();
        });
      });
      this._dropOverlay = overlay;
      return overlay;
    }
    _showDropOverlay() {
      const container = document.getElementById("pane-container");
      if (!container) return;
      const overlay = this._createDropOverlay();
      if (!overlay.parentElement) {
        container.style.position = "relative";
        container.appendChild(overlay);
      }
      overlay.classList.add("visible");
    }
    _hideDropOverlay() {
      if (this._dropOverlay) {
        this._dropOverlay.classList.remove("visible");
        this._dropOverlay.querySelectorAll(".split-drop-zone").forEach((z) => z.classList.remove("active"));
      }
    }
    initDragDrop() {
      const handleDragOver = (e) => {
        if (!this.dragState) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const container = document.getElementById("pane-container");
        if (container && container.contains(e.target) || e.target === container) {
          this._showDropOverlay();
        }
      };
      const handleDragLeave = (e) => {
        if (!this.dragState) return;
        const container = document.getElementById("pane-container");
        if (container && !container.contains(e.relatedTarget)) {
          this._hideDropOverlay();
        }
      };
      const handleDrop = (e) => {
        if (!this.dragState) return;
        this._hideDropOverlay();
        this.dragState = null;
      };
      document.addEventListener("dragover", handleDragOver);
      document.addEventListener("dragleave", handleDragLeave);
      document.addEventListener("drop", handleDrop);
    }
    setRightTabList(el) {
      this.tabListRight = el;
      if (el) this.renderTabs();
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/contextmenu.js
  var ContextMenu = class {
    constructor(app) {
      this.app = app;
      this.el = document.getElementById("context-menu");
      this.currentTarget = null;
      document.addEventListener("click", () => this.hide());
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.hide();
      });
    }
    show(x, y, items) {
      this.el.innerHTML = "";
      for (const item of items) {
        if (item.separator) {
          const sep = document.createElement("div");
          sep.className = "ctx-separator";
          this.el.appendChild(sep);
          continue;
        }
        const row = document.createElement("div");
        row.className = "ctx-item";
        row.innerHTML = `<span>${this.escapeHtml(item.label)}</span>${item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : ""}`;
        row.addEventListener("click", (e) => {
          e.stopPropagation();
          this.hide();
          if (item.action) item.action();
        });
        this.el.appendChild(row);
      }
      this.el.classList.remove("hidden");
      const rect = this.el.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 4;
      const maxY = window.innerHeight - rect.height - 4;
      this.el.style.left = Math.min(x, maxX) + "px";
      this.el.style.top = Math.min(y, maxY) + "px";
    }
    hide() {
      this.el.classList.add("hidden");
    }
    /** Show context menu for a file in the sidebar */
    showFileMenu(e, filePath, isDir) {
      e.preventDefault();
      e.stopPropagation();
      const items = [];
      if (!isDir) {
        items.push({
          label: "Open in New Pane",
          action: () => this.app.openFileInSplit(filePath)
        });
        items.push({ separator: true });
      }
      items.push({
        label: "Rename",
        action: () => this.app.startRename(filePath)
      });
      if (!isDir) {
        items.push({
          label: "Duplicate",
          action: () => this.app.duplicateFile(filePath)
        });
      }
      items.push({
        label: "Copy Path",
        action: () => navigator.clipboard.writeText(filePath)
      });
      items.push({ separator: true });
      items.push({
        label: "Delete",
        action: () => this.app.deleteFile(filePath)
      });
      this.show(e.clientX, e.clientY, items);
    }
    /** Show context menu for the editor */
    showEditorMenu(e, textarea) {
      e.preventDefault();
      const items = [
        { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", action: () => navigator.clipboard.readText().then((t) => document.execCommand("insertText", false, t)).catch(() => {
        }) },
        { separator: true },
        { label: "Bold", shortcut: "Ctrl+B", action: () => this.app.editor.wrapSelection("**", "**") },
        { label: "Italic", shortcut: "Ctrl+I", action: () => this.app.editor.wrapSelection("*", "*") },
        { label: "Code", shortcut: "Ctrl+`", action: () => this.app.editor.wrapSelection("`", "`") },
        { label: "Link", shortcut: "Ctrl+K", action: () => this.app.editor.wrapSelection("[[", "]]") }
      ];
      const selection = window.getSelection()?.toString()?.trim();
      if (selection) {
        items.push({ separator: true });
        items.push({
          label: "\u{1F9E0} Extract to Card",
          shortcut: "Ctrl+Shift+E",
          action: () => this.app.extractToCard()
        });
      }
      this.show(e.clientX, e.clientY, items);
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/graph.js
  init_tauri_bridge();
  var GraphView = class {
    constructor(app, container) {
      this.app = app;
      this.container = container;
      this.canvas = document.createElement("canvas");
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.nodes = [];
      this.edges = [];
      this.nodeMap = {};
      this.animId = null;
      this.dragging = null;
      this.hoveredNode = null;
      this.scale = 1;
      this.panX = 0;
      this.panY = 0;
      this.isPanning = false;
      this.lastMouse = { x: 0, y: 0 };
      this.resize();
      this.bindEvents();
      this.load();
    }
    resize() {
      const rect = this.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + "px";
      this.canvas.style.height = rect.height + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = rect.width;
      this.height = rect.height;
    }
    bindEvents() {
      this._resizeObserver = new ResizeObserver(() => {
        this.resize();
        this.draw();
      });
      this._resizeObserver.observe(this.container);
      this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
      this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
      this.canvas.addEventListener("mouseup", () => this.onMouseUp());
      this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
      this.canvas.addEventListener("dblclick", (e) => this.onDblClick(e));
    }
    /**
     * Load graph data with pre-computed layout from Rust (Fruchterman-Reingold).
     * Returns { nodes: [{id, label, x, y, radius, color, tags}], edges: [{source, target}] }
     */
    async load(filter) {
      try {
        const vaultPath = this.app.vaultPath || "";
        const data = await invoke("compute_graph", { vaultPath, filter: filter || null });
        this.setGraphData(data);
        this.draw();
      } catch (err) {
        console.error("Failed to load graph data:", err);
      }
    }
    /**
     * Set pre-positioned graph data from Rust. No JS layout computation.
     */
    setGraphData(data) {
      this.nodes = (data.nodes || []).map((n) => ({
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        radius: n.radius || 6,
        color: n.color || "#7f6df2",
        tags: n.tags || []
      }));
      this.nodeMap = {};
      this.nodes.forEach((n) => this.nodeMap[n.id] = n);
      this.edges = (data.edges || []).map((e) => ({
        source: this.nodeMap[e.source],
        target: this.nodeMap[e.target]
      })).filter((e) => e.source && e.target);
    }
    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.scale, this.scale);
      ctx.strokeStyle = "rgba(127, 109, 242, 0.25)";
      ctx.lineWidth = 1;
      for (const edge of this.edges) {
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.stroke();
      }
      for (const node of this.nodes) {
        const isHovered = node === this.hoveredNode;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? this._lighten(node.color) : node.color;
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = this._lighten(node.color);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      for (const node of this.nodes) {
        const isHovered = node === this.hoveredNode;
        ctx.fillStyle = isHovered ? "#dcddde" : "rgba(220, 221, 222, 0.7)";
        ctx.fillText(node.label, node.x, node.y + node.radius + 14);
      }
      ctx.restore();
    }
    _lighten(hex) {
      try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const f = 0.3;
        return `rgb(${Math.round(r + (255 - r) * f)}, ${Math.round(g + (255 - g) * f)}, ${Math.round(b + (255 - b) * f)})`;
      } catch {
        return "#a99df5";
      }
    }
    getNodeAt(mx, my) {
      const x = (mx - this.panX) / this.scale;
      const y = (my - this.panY) / this.scale;
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const n = this.nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
          return n;
        }
      }
      return null;
    }
    onMouseDown(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = this.getNodeAt(mx, my);
      if (node) {
        this.dragging = node;
      } else {
        this.isPanning = true;
      }
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }
    onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (this.dragging) {
        const dx = (e.clientX - this.lastMouse.x) / this.scale;
        const dy = (e.clientY - this.lastMouse.y) / this.scale;
        this.dragging.x += dx;
        this.dragging.y += dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.draw();
      } else if (this.isPanning) {
        this.panX += e.clientX - this.lastMouse.x;
        this.panY += e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.draw();
      } else {
        const node = this.getNodeAt(mx, my);
        if (node !== this.hoveredNode) {
          this.hoveredNode = node;
          this.canvas.style.cursor = node ? "pointer" : "grab";
          this.draw();
        }
      }
    }
    onMouseUp() {
      this.dragging = null;
      this.isPanning = false;
    }
    onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      this.scale = Math.max(0.2, Math.min(4, this.scale * factor));
      this.draw();
    }
    onDblClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = this.getNodeAt(mx, my);
      if (node) {
        this.app.openFile(node.id);
      }
    }
    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this._resizeObserver) this._resizeObserver.disconnect();
    }
  };

  // src/js/themes.js
  init_tauri_bridge();
  var BUILT_IN_THEMES = {
    system: "System",
    dark: "Dark",
    light: "Light",
    "high-contrast": "High Contrast",
    nord: "Nord",
    solarized: "Solarized"
  };
  var ThemeManager = class {
    constructor(app) {
      this.app = app;
      this.currentTheme = "system";
      this.systemPreference = this.getSystemPreference();
      this.customStyleEl = null;
      this.mediaQuery = null;
    }
    async init() {
      this.customStyleEl = document.createElement("style");
      this.customStyleEl.id = "custom-theme-style";
      document.head.appendChild(this.customStyleEl);
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.mediaQuery.addEventListener("change", () => {
        this.systemPreference = this.getSystemPreference();
        if (this.currentTheme === "system") {
          this.applyActualTheme(this.systemPreference);
        }
      });
    }
    getSystemPreference() {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(themeName) {
      this.currentTheme = themeName;
      if (themeName === "system") {
        this.applyActualTheme(this.systemPreference);
      } else if (BUILT_IN_THEMES[themeName]) {
        this.applyActualTheme(themeName);
      } else {
        this.loadCustomTheme(themeName);
      }
    }
    applyActualTheme(actualTheme) {
      const root = document.documentElement;
      if (BUILT_IN_THEMES[actualTheme]) {
        this.customStyleEl.textContent = "";
        root.setAttribute("data-theme", actualTheme);
      }
    }
    async loadCustomTheme(name) {
      try {
        const css = await invoke("load_custom_theme", { name });
        this.customStyleEl.textContent = css;
        document.documentElement.setAttribute("data-theme", "custom");
      } catch (err) {
        console.error("Failed to load custom theme:", err);
        this.applyActualTheme("dark");
      }
    }
    setAccentColor(color) {
      document.documentElement.style.setProperty("--text-accent", color);
      const hoverColor = this.lightenColor(color, 10);
      document.documentElement.style.setProperty("--text-accent-hover", hoverColor);
      document.documentElement.style.setProperty("--border-focus", color);
      const selectionColor = this.hexToRgba(color, 0.15);
      document.documentElement.style.setProperty("--bg-selection", selectionColor);
    }
    lightenColor(color, percent) {
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const hsl = this.rgbToHsl(r, g, b);
      hsl[2] = Math.min(1, hsl[2] + percent / 100);
      const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
      return `#${Math.round(rgb[0]).toString(16).padStart(2, "0")}${Math.round(rgb[1]).toString(16).padStart(2, "0")}${Math.round(rgb[2]).toString(16).padStart(2, "0")}`;
    }
    hexToRgba(hex, alpha) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return hex;
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return [h, s, l];
    }
    hslToRgb(h, s, l) {
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p2, q2, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
          if (t < 1 / 2) return q2;
          if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
          return p2;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return [r * 255, g * 255, b * 255];
    }
    getBuiltInThemeNames() {
      return Object.keys(BUILT_IN_THEMES);
    }
    getBuiltInThemeLabels() {
      return BUILT_IN_THEMES;
    }
    async getCustomThemeNames() {
      try {
        return await invoke("list_custom_themes");
      } catch {
        return [];
      }
    }
    getCurrentTheme() {
      return this.currentTheme;
    }
    getSystemPreferenceTheme() {
      return this.systemPreference;
    }
  };

  // src/js/slash.js
  var SLASH_COMMANDS = [
    { id: "h1", label: "Heading 1", icon: "H1", insert: "# ", category: "headings" },
    { id: "h2", label: "Heading 2", icon: "H2", insert: "## ", category: "headings" },
    { id: "h3", label: "Heading 3", icon: "H3", insert: "### ", category: "headings" },
    { id: "h4", label: "Heading 4", icon: "H4", insert: "#### ", category: "headings" },
    { id: "h5", label: "Heading 5", icon: "H5", insert: "##### ", category: "headings" },
    { id: "h6", label: "Heading 6", icon: "H6", insert: "###### ", category: "headings" },
    { id: "bold", label: "Bold", icon: "B", wrap: ["**", "**"], category: "formatting" },
    { id: "italic", label: "Italic", icon: "I", wrap: ["*", "*"], category: "formatting" },
    { id: "strikethrough", label: "Strikethrough", icon: "S", wrap: ["~~", "~~"], category: "formatting" },
    { id: "code", label: "Inline Code", icon: "<>", wrap: ["`", "`"], category: "formatting" },
    { id: "codeblock", label: "Code Block", icon: "{}", insert: "```\n\n```", cursorOffset: -4, category: "blocks" },
    { id: "quote", label: "Quote", icon: '"', insert: "> ", category: "blocks" },
    { id: "bullet", label: "Bullet List", icon: "\u2022", insert: "- ", category: "lists" },
    { id: "numbered", label: "Numbered List", icon: "1.", insert: "1. ", category: "lists" },
    { id: "checkbox", label: "Checkbox", icon: "\u2610", insert: "- [ ] ", category: "lists" },
    { id: "table", label: "Table", icon: "\u229E", insert: "| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| | | |\n", category: "blocks" },
    { id: "hr", label: "Horizontal Rule", icon: "\u2014", insert: "---\n", category: "blocks" },
    { id: "image", label: "Image / Embed", icon: "\u{1F5BC}", insert: "![alt](url)", category: "media" },
    { id: "link", label: "Link", icon: "\u{1F517}", insert: "[text](url)", category: "media" },
    { id: "wikilink", label: "Wiki Link", icon: "\u27E6\u27E7", wrap: ["[[", "]]"], category: "media" },
    { id: "callout", label: "Callout", icon: "\u{1F4A1}", insert: "> [!note]\n> ", category: "blocks" }
  ];
  var SlashMenu = class {
    constructor(app) {
      this.app = app;
      this.el = null;
      this.visible = false;
      this.selectedIndex = 0;
      this.filteredCommands = [...SLASH_COMMANDS];
      this.filterText = "";
      this.textarea = null;
      this.slashStart = -1;
      this.createEl();
    }
    createEl() {
      this.el = document.createElement("div");
      this.el.id = "slash-menu";
      this.el.className = "slash-menu hidden";
      document.body.appendChild(this.el);
    }
    /** Called on every input event of the textarea OR CodeMirror view */
    onInput(editorOrTextarea) {
      this._editor = editorOrTextarea;
      this._isCodeMirror = !!(editorOrTextarea && editorOrTextarea.state && editorOrTextarea.dispatch);
      let pos, text;
      if (this._isCodeMirror) {
        pos = editorOrTextarea.state.selection.main.head;
        text = editorOrTextarea.state.doc.toString();
      } else {
        this.textarea = editorOrTextarea;
        pos = editorOrTextarea.selectionStart;
        text = editorOrTextarea.value;
      }
      const beforeCursor = text.substring(0, pos);
      const lastSlash = beforeCursor.lastIndexOf("/");
      if (lastSlash >= 0) {
        const charBefore = lastSlash > 0 ? beforeCursor[lastSlash - 1] : "\n";
        if (charBefore === "\n" || charBefore === " " || charBefore === "	" || lastSlash === 0) {
          const filter = beforeCursor.substring(lastSlash + 1);
          if (!filter.includes(" ") && !filter.includes("\n")) {
            this.slashStart = lastSlash;
            this.filterText = filter.toLowerCase();
            this.filteredCommands = SLASH_COMMANDS.filter(
              (cmd) => cmd.label.toLowerCase().includes(this.filterText) || cmd.id.includes(this.filterText)
            );
            if (this.filteredCommands.length > 0) {
              this.selectedIndex = 0;
              this.show(editorOrTextarea);
              return;
            }
          }
        }
      }
      this.hide();
    }
    show(editorOrTextarea) {
      this.visible = true;
      this.render();
      const pos = this._isCodeMirror ? this.getCMCursorPosition(editorOrTextarea) : this.getCursorPosition(editorOrTextarea);
      this.el.style.left = pos.x + "px";
      this.el.style.top = pos.y + "px";
      this.el.classList.remove("hidden");
      requestAnimationFrame(() => {
        const rect = this.el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
          this.el.style.top = pos.y - rect.height - 20 + "px";
        }
        if (rect.right > window.innerWidth) {
          this.el.style.left = window.innerWidth - rect.width - 10 + "px";
        }
      });
    }
    hide() {
      this.visible = false;
      this.el.classList.add("hidden");
      this.slashStart = -1;
    }
    render() {
      this.el.innerHTML = "";
      this.filteredCommands.forEach((cmd, i) => {
        const item = document.createElement("div");
        item.className = "slash-item" + (i === this.selectedIndex ? " selected" : "");
        item.innerHTML = `<span class="slash-icon">${cmd.icon}</span><span class="slash-label">${cmd.label}</span>`;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.execute(cmd);
        });
        item.addEventListener("mouseenter", () => {
          this.selectedIndex = i;
          this.render();
        });
        this.el.appendChild(item);
      });
    }
    /** Handle keydown when menu is visible. Returns true if event was consumed. */
    handleKeyDown(e) {
      if (!this.visible) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
        this.render();
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
        this.render();
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.execute(this.filteredCommands[this.selectedIndex]);
        }
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
        return true;
      }
      return false;
    }
    execute(cmd) {
      if (!this._editor || this.slashStart < 0) return;
      if (this._isCodeMirror) {
        const view = this._editor;
        const pos = view.state.selection.main.head;
        if (cmd.wrap) {
          const [pre, post] = cmd.wrap;
          const placeholder = "text";
          view.dispatch({
            changes: { from: this.slashStart, to: pos, insert: pre + placeholder + post },
            selection: { anchor: this.slashStart + pre.length, head: this.slashStart + pre.length + placeholder.length }
          });
        } else if (cmd.insert) {
          let newPos = this.slashStart + cmd.insert.length;
          if (cmd.cursorOffset) newPos += cmd.cursorOffset;
          view.dispatch({
            changes: { from: this.slashStart, to: pos, insert: cmd.insert },
            selection: { anchor: newPos }
          });
        }
        view.focus();
      } else {
        const textarea = this._editor;
        const pos = textarea.selectionStart;
        const value = textarea.value;
        const before = value.substring(0, this.slashStart);
        const after = value.substring(pos);
        if (cmd.wrap) {
          const [pre, post] = cmd.wrap;
          const text = "text";
          textarea.value = before + pre + text + post + after;
          textarea.selectionStart = this.slashStart + pre.length;
          textarea.selectionEnd = this.slashStart + pre.length + text.length;
        } else if (cmd.insert) {
          textarea.value = before + cmd.insert + after;
          let newPos = this.slashStart + cmd.insert.length;
          if (cmd.cursorOffset) newPos += cmd.cursorOffset;
          textarea.selectionStart = textarea.selectionEnd = newPos;
        }
        textarea.focus();
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      this.hide();
    }
    getCMCursorPosition(view) {
      try {
        const pos = view.state.selection.main.head;
        const coords = view.coordsAtPos(pos);
        if (coords) {
          return { x: coords.left, y: coords.bottom + 4 };
        }
      } catch (e) {
      }
      const rect = view.dom.getBoundingClientRect();
      return { x: rect.left + 20, y: rect.top + 40 };
    }
    getCursorPosition(textarea) {
      const rect = textarea.getBoundingClientRect();
      const text = textarea.value.substring(0, textarea.selectionStart);
      const lines = text.split("\n");
      const lineIndex = lines.length - 1;
      const style = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(style.lineHeight) || 24;
      const paddingTop = parseFloat(style.paddingTop) || 20;
      const paddingLeft = parseFloat(style.paddingLeft) || 28;
      return {
        x: rect.left + paddingLeft + 20,
        y: rect.top + paddingTop + lineIndex * lineHeight - textarea.scrollTop + lineHeight + 4
      };
    }
  };

  // src/js/settings.js
  init_tauri_bridge();
  var SettingsPage = class {
    constructor(app) {
      this.app = app;
      this.settings = null;
      this.paneEl = null;
      this.activeSection = "general";
      this.hotkeys = /* @__PURE__ */ new Map();
      this.availableCommands = /* @__PURE__ */ new Map();
    }
    async load() {
      try {
        this.settings = await invoke("load_settings");
        await this.loadHotkeys();
        await this.loadCommands();
      } catch (err) {
        console.error("Failed to load settings:", err);
        this.settings = {
          general: {
            vault_path: "",
            language: "en",
            startup_behavior: "welcome",
            check_for_updates: true,
            auto_update: false,
            developer_mode: false
          },
          editor: {
            font_family: "JetBrains Mono, Fira Code, Consolas, monospace",
            font_size: 15,
            line_height: 1.6,
            tab_size: 4,
            spell_check: true,
            vim_mode: false,
            show_line_numbers: true,
            readable_line_length: false,
            max_line_width: 700,
            strict_line_breaks: false,
            smart_indent: true,
            show_frontmatter: true,
            default_edit_mode: "source",
            auto_pair_brackets: true,
            auto_pair_markdown: true,
            fold_heading: true,
            fold_indent: true
          },
          files_links: {
            default_note_location: "vault_root",
            new_note_location: "",
            new_link_format: "shortest",
            auto_update_internal_links: true,
            detect_all_extensions: true,
            attachment_folder: "attachments",
            always_update_links: true,
            use_markdown_links: false,
            confirm_file_deletion: true
          },
          appearance: {
            theme: "dark",
            accent_color: "#7f6df2",
            interface_font_size: 13,
            interface_font: "default",
            translucent: false,
            custom_css: true,
            native_menus: true,
            show_inline_title: true,
            show_tab_title_bar: true,
            zoom_level: 1
          },
          hotkeys: {},
          core_plugins: {
            file_explorer: true,
            search: true,
            quick_switcher: true,
            graph_view: true,
            backlinks: true,
            outgoing_links: true,
            tag_pane: true,
            page_preview: true,
            starred: true,
            templates: false,
            note_composer: false,
            command_palette: true,
            markdown_importer: false,
            word_count: true,
            open_with_default_app: true,
            file_recovery: true
          },
          community_plugins: {
            safe_mode: false,
            enabled_plugins: [],
            plugin_updates: true,
            browse_plugins: true
          },
          about: {
            version: "1.2.0",
            license: "MIT",
            credits: "Built with Tauri & Rust"
          }
        };
      }
    }
    async loadHotkeys() {
      try {
        const hotkeyData = await invoke("load_hotkeys") || {};
        this.hotkeys = new Map(Object.entries(hotkeyData));
      } catch (err) {
        console.warn("Could not load hotkeys:", err);
        this.hotkeys = /* @__PURE__ */ new Map();
      }
    }
    async loadCommands() {
      try {
        const commands = await invoke("get_available_commands") || [];
        this.availableCommands = /* @__PURE__ */ new Map();
        const defaultCommands = [
          { id: "app:open-settings", name: "Open Settings", category: "App" },
          { id: "app:toggle-theme", name: "Toggle Theme", category: "App" },
          { id: "app:reload-app", name: "Reload App", category: "App" },
          { id: "file:new-note", name: "Create New Note", category: "File" },
          { id: "file:open-file", name: "Open File", category: "File" },
          { id: "file:save", name: "Save Current File", category: "File" },
          { id: "file:save-as", name: "Save As...", category: "File" },
          { id: "file:delete", name: "Delete File", category: "File" },
          { id: "editor:toggle-preview", name: "Toggle Preview", category: "Editor" },
          { id: "editor:toggle-source", name: "Toggle Source Mode", category: "Editor" },
          { id: "editor:bold", name: "Bold", category: "Editor" },
          { id: "editor:italic", name: "Italic", category: "Editor" },
          { id: "editor:strikethrough", name: "Strikethrough", category: "Editor" },
          { id: "editor:code", name: "Inline Code", category: "Editor" },
          { id: "editor:codeblock", name: "Code Block", category: "Editor" },
          { id: "search:global-search", name: "Search in All Files", category: "Search" },
          { id: "search:current-file", name: "Search in Current File", category: "Search" },
          { id: "navigation:quick-switcher", name: "Quick Switcher", category: "Navigation" },
          { id: "navigation:go-back", name: "Navigate Back", category: "Navigation" },
          { id: "navigation:go-forward", name: "Navigate Forward", category: "Navigation" },
          { id: "view:toggle-sidebar", name: "Toggle Sidebar", category: "View" },
          { id: "view:toggle-reading-mode", name: "Toggle Reading Mode", category: "View" }
        ];
        (commands.length > 0 ? commands : defaultCommands).forEach((cmd) => {
          this.availableCommands.set(cmd.id, cmd);
        });
      } catch (err) {
        console.warn("Could not load commands:", err);
      }
    }
    async show(container) {
      await this.load();
      this.paneEl = container;
      container.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className = "settings-page";
      wrapper.innerHTML = this.renderHTML();
      container.appendChild(wrapper);
      this.bindEvents(wrapper);
      this.switchToSection(this.activeSection, wrapper);
      this.initializeSection(this.activeSection);
    }
    renderHTML() {
      return `
            <div class="settings-container">
                <nav class="settings-sidebar">
                    <div class="settings-sidebar-header">
                        <h2>Settings</h2>
                    </div>
                    <div class="settings-nav-section">
                        <button class="settings-nav-item ${this.activeSection === "general" ? "active" : ""}" data-section="general">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                            </svg>
                            <span>General</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "editor" ? "active" : ""}" data-section="editor">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            <span>Editor</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "files-links" ? "active" : ""}" data-section="files-links">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            <span>Files &amp; Links</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "appearance" ? "active" : ""}" data-section="appearance">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="5"/>
                                <line x1="12" y1="1" x2="12" y2="3"/>
                                <line x1="12" y1="21" x2="12" y2="23"/>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                <line x1="1" y1="12" x2="3" y2="12"/>
                                <line x1="21" y1="12" x2="23" y2="12"/>
                            </svg>
                            <span>Appearance</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "hotkeys" ? "active" : ""}" data-section="hotkeys">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="6" width="20" height="12" rx="2"/>
                                <line x1="6" y1="10" x2="6" y2="14"/>
                                <line x1="10" y1="10" x2="10" y2="14"/>
                                <line x1="14" y1="10" x2="14" y2="14"/>
                                <line x1="18" y1="10" x2="18" y2="14"/>
                            </svg>
                            <span>Hotkeys</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "core-plugins" ? "active" : ""}" data-section="core-plugins">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="8" height="8" rx="1"/>
                                <rect x="13" y="3" width="8" height="8" rx="1"/>
                                <rect x="3" y="13" width="8" height="8" rx="1"/>
                                <rect x="13" y="13" width="8" height="8" rx="1"/>
                            </svg>
                            <span>Core plugins</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "community-plugins" ? "active" : ""}" data-section="community-plugins">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                                <path d="M2 12h20"/>
                            </svg>
                            <span>Community plugins</span>
                        </button>
                        <button class="settings-nav-item ${this.activeSection === "about" ? "active" : ""}" data-section="about">
                            <svg class="settings-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 16v-4"/>
                                <path d="M12 8h.01"/>
                            </svg>
                            <span>About</span>
                        </button>
                    </div>
                </nav>
                <main class="settings-content">
                    <div class="settings-sections">
                        ${this.renderGeneralSection()}
                        ${this.renderEditorSection()}
                        ${this.renderFilesLinksSection()}
                        ${this.renderAppearanceSection()}
                        ${this.renderHotkeysSection()}
                        ${this.renderCorePluginsSection()}
                        ${this.renderCommunityPluginsSection()}
                        ${this.renderAboutSection()}
                    </div>
                </main>
            </div>
        `;
    }
    renderGeneralSection() {
      const s = this.settings.general || {};
      return `
            <section class="settings-section" data-section="general">
                <div class="settings-section-header">
                    <h1>General</h1>
                    <p class="settings-section-description">Manage your vault and application preferences</p>
                </div>
                
                <div class="settings-group">
                    <h3>Vault</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Vault location</div>
                            <div class="setting-item-description">Location of your notes vault on disk</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="general-vault-path" value="${this.esc(s.vault_path)}" readonly />
                            <button class="mod-cta" id="btn-browse-vault">Browse</button>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Interface</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Language</div>
                            <div class="setting-item-description">Select the interface language</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="general-language">
                                <option value="en" ${s.language === "en" ? "selected" : ""}>English</option>
                                <option value="de" ${s.language === "de" ? "selected" : ""}>Deutsch</option>
                                <option value="fr" ${s.language === "fr" ? "selected" : ""}>Fran\xE7ais</option>
                                <option value="es" ${s.language === "es" ? "selected" : ""}>Espa\xF1ol</option>
                                <option value="zh" ${s.language === "zh" ? "selected" : ""}>\u4E2D\u6587</option>
                                <option value="ja" ${s.language === "ja" ? "selected" : ""}>\u65E5\u672C\u8A9E</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Start-up behavior</div>
                            <div class="setting-item-description">Choose what to display when opening Oxidian</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="general-startup">
                                <option value="welcome" ${s.startup_behavior === "welcome" ? "selected" : ""}>Show welcome screen</option>
                                <option value="last-session" ${s.startup_behavior === "last-session" ? "selected" : ""}>Restore last session</option>
                                <option value="daily-note" ${s.startup_behavior === "daily-note" ? "selected" : ""}>Open daily note</option>
                                <option value="empty" ${s.startup_behavior === "empty" ? "selected" : ""}>Start with empty workspace</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Updates</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Check for updates</div>
                            <div class="setting-item-description">Automatically check for application updates</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-check-updates" ${s.check_for_updates ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Automatic updates</div>
                            <div class="setting-item-description">Automatically download and install updates</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-auto-update" ${s.auto_update ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Developer mode</div>
                            <div class="setting-item-description">Enable developer tools and debugging features</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="general-dev-mode" ${s.developer_mode ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    renderEditorSection() {
      const s = this.settings.editor || {};
      return `
            <section class="settings-section" data-section="editor">
                <div class="settings-section-header">
                    <h1>Editor</h1>
                    <p class="settings-section-description">Configure your note editing experience</p>
                </div>
                
                <div class="settings-group">
                    <h3>Display</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Font family</div>
                            <div class="setting-item-description">The font used for editing notes</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="editor-font-family" value="${this.esc(s.font_family)}" placeholder="JetBrains Mono, Consolas, monospace" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Font size</div>
                            <div class="setting-item-description">Font size in pixels</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="editor-font-size" min="10" max="36" value="${s.font_size}" />
                                <div class="slider-value">${s.font_size}px</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Line height</div>
                            <div class="setting-item-description">Line spacing multiplier for better readability</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="editor-line-height" min="1.0" max="2.5" step="0.1" value="${s.line_height}" />
                                <div class="slider-value">${s.line_height}</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Show line numbers</div>
                            <div class="setting-item-description">Display line numbers in the editor gutter</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-line-numbers" ${s.show_line_numbers ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Readable line length</div>
                            <div class="setting-item-description">Limit the maximum line width for better readability</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-readable-length" ${s.readable_line_length ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item" data-show-if="editor-readable-length">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Maximum line width</div>
                            <div class="setting-item-description">Maximum width in pixels when readable line length is enabled</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="number" id="editor-max-width" value="${s.max_line_width}" min="400" max="1200" step="50" />
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Behavior</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Tab indent size</div>
                            <div class="setting-item-description">Number of spaces for each tab indentation</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="editor-tab-size">
                                <option value="2" ${s.tab_size === 2 ? "selected" : ""}>2 spaces</option>
                                <option value="4" ${s.tab_size === 4 ? "selected" : ""}>4 spaces</option>
                                <option value="8" ${s.tab_size === 8 ? "selected" : ""}>8 spaces</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default editing mode</div>
                            <div class="setting-item-description">The default editing mode for new notes</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="editor-default-mode">
                                <option value="source" ${s.default_edit_mode === "source" ? "selected" : ""}>Source mode</option>
                                <option value="live-preview" ${s.default_edit_mode === "live-preview" ? "selected" : ""}>Live Preview</option>
                                <option value="reading" ${s.default_edit_mode === "reading" ? "selected" : ""}>Reading mode</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Strict line breaks</div>
                            <div class="setting-item-description">Force line breaks to be respected in preview mode</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-strict-breaks" ${s.strict_line_breaks ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Smart indent lists</div>
                            <div class="setting-item-description">Automatically indent lists and maintain structure</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-smart-indent" ${s.smart_indent ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Auto-pair brackets</div>
                            <div class="setting-item-description">Automatically close brackets, quotes, and parentheses</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-auto-pair-brackets" ${s.auto_pair_brackets ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Auto-pair Markdown formatting</div>
                            <div class="setting-item-description">Automatically close bold, italic, and other markdown formatting</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-auto-pair-markdown" ${s.auto_pair_markdown ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Spell check</div>
                            <div class="setting-item-description">Enable browser spell checking</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-spell-check" ${s.spell_check ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Vim key bindings</div>
                            <div class="setting-item-description">Enable Vim keyboard shortcuts (experimental)</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-vim-mode" ${s.vim_mode ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Show frontmatter</div>
                            <div class="setting-item-description">Display YAML frontmatter in the editor</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-show-frontmatter" ${s.show_frontmatter ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Fold heading</div>
                            <div class="setting-item-description">Allow collapsing sections under headings</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-fold-heading" ${s.fold_heading ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Fold indent</div>
                            <div class="setting-item-description">Allow collapsing indented sections</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="editor-fold-indent" ${s.fold_indent ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    renderFilesLinksSection() {
      const s = this.settings.files_links || this.settings.files || {
        default_note_location: "vault_root",
        new_note_location: "",
        new_link_format: "shortest",
        auto_update_internal_links: true,
        detect_all_extensions: true,
        default_attachment_folder: "attachments",
        confirm_file_delete: true,
        trash_option: "system_trash"
      };
      return `
            <section class="settings-section" data-section="files-links">
                <div class="settings-section-header">
                    <h1>Files &amp; Links</h1>
                    <p class="settings-section-description">Manage how files and links are handled in your vault</p>
                </div>
                
                <div class="settings-group">
                    <h3>File Creation</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default location for new notes</div>
                            <div class="setting-item-description">Where to place newly created notes</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="files-default-location">
                                <option value="vault_root" ${s.default_note_location || s.new_file_location || true ? "selected" : ""}>Vault folder</option>
                                <option value="current_folder" ${s.default_note_location || s.new_file_location || false ? "selected" : ""}>Same folder as current file</option>
                                <option value="specified_folder" ${s.default_note_location || s.new_file_location || false ? "selected" : ""}>In the folder specified below</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item" data-show-if-value="files-default-location:specified_folder">
                        <div class="setting-item-info">
                            <div class="setting-item-name">New note folder</div>
                            <div class="setting-item-description">Folder path for new notes (relative to vault root)</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="files-new-note-location" value="${this.esc(s.new_note_location)}" placeholder="notes/" />
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Links</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">New link format</div>
                            <div class="setting-item-description">How to format new wikilinks</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="files-link-format">
                                <option value="shortest" ${s.new_link_format === "shortest" ? "selected" : ""}>Shortest path when possible</option>
                                <option value="relative" ${s.new_link_format === "relative" ? "selected" : ""}>Relative path to file</option>
                                <option value="absolute" ${s.new_link_format === "absolute" ? "selected" : ""}>Absolute path in vault</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Use [[Wikilinks]]</div>
                            <div class="setting-item-description">Use wikilink format instead of Markdown links</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-use-wikilinks" ${!s.use_markdown_links ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Automatically update internal links</div>
                            <div class="setting-item-description">Update links when renaming or moving files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-auto-update-links" ${s.auto_update_internal_links ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>File Management</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Detect all file extensions</div>
                            <div class="setting-item-description">Include all files in vault, not just markdown files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-detect-extensions" ${s.detect_all_extensions ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Default attachment folder</div>
                            <div class="setting-item-description">Where to place attachments (images, files, etc.)</div>
                        </div>
                        <div class="setting-item-control">
                            <input type="text" id="files-attachment-folder" value="${this.esc(s.attachment_folder)}" placeholder="attachments" />
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Always update links on rename</div>
                            <div class="setting-item-description">Always update links when files are renamed, without asking</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-always-update" ${s.always_update_links ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Confirm file deletion</div>
                            <div class="setting-item-description">Ask for confirmation before deleting files</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="files-confirm-delete" ${s.confirm_file_deletion ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    renderAppearanceSection() {
      const s = this.settings.appearance || {};
      return `
            <section class="settings-section" data-section="appearance">
                <div class="settings-section-header">
                    <h1>Appearance</h1>
                    <p class="settings-section-description">Customize the visual appearance of Oxidian</p>
                </div>
                
                <div class="settings-group">
                    <h3>Theme</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Base color scheme</div>
                            <div class="setting-item-description">Choose between dark and light themes</div>
                        </div>
                        <div class="setting-item-control">
                            <div id="theme-selector" class="theme-selector">
                                <div class="theme-option ${s.theme === "dark" ? "active" : ""}" data-theme="dark">
                                    <div class="theme-preview theme-preview-dark">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Dark</span>
                                </div>
                                <div class="theme-option ${s.theme === "light" ? "active" : ""}" data-theme="light">
                                    <div class="theme-preview theme-preview-light">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Light</span>
                                </div>
                                <div class="theme-option ${s.theme === "system" ? "active" : ""}" data-theme="system">
                                    <div class="theme-preview theme-preview-auto">
                                        <div class="theme-preview-content">
                                            <div class="theme-preview-bar"></div>
                                            <div class="theme-preview-text"></div>
                                            <div class="theme-preview-text short"></div>
                                        </div>
                                    </div>
                                    <span>Adapt to system</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Accent color</div>
                            <div class="setting-item-description">Used for interactive elements and highlights</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="color-picker-wrapper">
                                <input type="color" id="appearance-accent-color" value="${s.accent_color}" />
                                <div class="color-presets">
                                    <button class="color-preset" data-color="#7f6df2" style="background-color: #7f6df2;"></button>
                                    <button class="color-preset" data-color="#6366f1" style="background-color: #6366f1;"></button>
                                    <button class="color-preset" data-color="#8b5cf6" style="background-color: #8b5cf6;"></button>
                                    <button class="color-preset" data-color="#ec4899" style="background-color: #ec4899;"></button>
                                    <button class="color-preset" data-color="#f43f5e" style="background-color: #f43f5e;"></button>
                                    <button class="color-preset" data-color="#06b6d4" style="background-color: #06b6d4;"></button>
                                    <button class="color-preset" data-color="#10b981" style="background-color: #10b981;"></button>
                                    <button class="color-preset" data-color="#f59e0b" style="background-color: #f59e0b;"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Text</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Interface font</div>
                            <div class="setting-item-description">Font used for the interface</div>
                        </div>
                        <div class="setting-item-control">
                            <select id="appearance-interface-font">
                                <option value="default" ${s.interface_font === "default" ? "selected" : ""}>Default</option>
                                <option value="system" ${s.interface_font === "system" ? "selected" : ""}>System font</option>
                                <option value="inter" ${s.interface_font === "inter" ? "selected" : ""}>Inter</option>
                                <option value="roboto" ${s.interface_font === "roboto" ? "selected" : ""}>Roboto</option>
                                <option value="custom" ${s.interface_font === "custom" ? "selected" : ""}>Custom</option>
                            </select>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Interface font size</div>
                            <div class="setting-item-description">Font size for menus and interface elements</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="appearance-font-size" min="10" max="18" value="${s.interface_font_size}" />
                                <div class="slider-value">${s.interface_font_size}px</div>
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Zoom level</div>
                            <div class="setting-item-description">Zoom factor for the entire interface</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="slider-container">
                                <input type="range" id="appearance-zoom" min="0.75" max="2.0" step="0.25" value="${s.zoom_level}" />
                                <div class="slider-value">${Math.round(s.zoom_level * 100)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Window</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Translucent window</div>
                            <div class="setting-item-description">Make the window background semi-transparent</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-translucent" ${s.translucent ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Native menus</div>
                            <div class="setting-item-description">Use the operating system's native menus</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-native-menus" ${s.native_menus ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Advanced</h3>
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">CSS snippets</div>
                            <div class="setting-item-description">Enable custom CSS snippets for advanced customization</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="appearance-custom-css" ${s.custom_css ? "checked" : ""} />
                            </div>
                            <button class="mod-secondary" id="btn-manage-css" ${s.custom_css ? "" : "disabled"}>Manage snippets</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    renderHotkeysSection() {
      return `
            <section class="settings-section" data-section="hotkeys">
                <div class="settings-section-header">
                    <h1>Hotkeys</h1>
                    <p class="settings-section-description">Customize keyboard shortcuts for commands</p>
                </div>
                
                <div class="hotkeys-search">
                    <input type="text" id="hotkeys-search" placeholder="Search hotkeys..." />
                </div>
                
                <div id="hotkeys-list" class="hotkeys-list">
                    ${this.renderHotkeysList()}
                </div>
            </section>
        `;
    }
    renderHotkeysList() {
      const commandsByCategory = /* @__PURE__ */ new Map();
      for (const [commandId, command] of this.availableCommands) {
        const category = command.category || "Other";
        if (!commandsByCategory.has(category)) {
          commandsByCategory.set(category, []);
        }
        commandsByCategory.get(category).push({
          id: commandId,
          name: command.name,
          hotkey: this.hotkeys.get(commandId) || ""
        });
      }
      let html = "";
      for (const [category, commands] of commandsByCategory) {
        html += `
                <div class="hotkey-category">
                    <h3 class="hotkey-category-title">${category}</h3>
                    ${commands.map((cmd) => `
                        <div class="hotkey-item" data-command="${cmd.id}">
                            <div class="hotkey-command">
                                <span class="hotkey-command-name">${this.esc(cmd.name)}</span>
                            </div>
                            <div class="hotkey-binding">
                                <div class="hotkey-keys" data-command="${cmd.id}">
                                    ${cmd.hotkey ? this.renderHotkey(cmd.hotkey) : '<span class="hotkey-none">No hotkey</span>'}
                                </div>
                                <button class="hotkey-edit-btn" data-command="${cmd.id}">Edit</button>
                                ${cmd.hotkey ? `<button class="hotkey-remove-btn" data-command="${cmd.id}">\xD7</button>` : ""}
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
      }
      return html;
    }
    renderHotkey(hotkey) {
      const keys = hotkey.split("+").map((key) => {
        const cleanKey = key.trim();
        const keyMap = {
          "Ctrl": "Ctrl",
          "Cmd": "\u2318",
          "Alt": "Alt",
          "Shift": "\u21E7",
          "Meta": "\u2318",
          "Control": "Ctrl"
        };
        return `<span class="hotkey-key">${keyMap[cleanKey] || cleanKey}</span>`;
      });
      return keys.join('<span class="hotkey-plus">+</span>');
    }
    renderCorePluginsSection() {
      const s = this.settings.core_plugins || this.settings.plugins || {};
      return `
            <section class="settings-section" data-section="core-plugins">
                <div class="settings-section-header">
                    <h1>Core plugins</h1>
                    <p class="settings-section-description">These are built-in plugins that extend Oxidian's functionality</p>
                </div>
                
                <div class="plugins-list">
                    ${Object.entries(s).map(([pluginId, enabled]) => {
        const pluginInfo = this.getCorePluginInfo(pluginId);
        return `
                            <div class="plugin-item ${enabled ? "enabled" : "disabled"}">
                                <div class="plugin-info">
                                    <div class="plugin-name">${pluginInfo.name}</div>
                                    <div class="plugin-description">${pluginInfo.description}</div>
                                </div>
                                <div class="plugin-toggle">
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="core-plugin-${pluginId}" ${enabled ? "checked" : ""} />
                                    </div>
                                </div>
                            </div>
                        `;
      }).join("")}
                </div>
            </section>
        `;
    }
    getCorePluginInfo(pluginId) {
      const pluginInfoMap = {
        file_explorer: { name: "File explorer", description: "Browse files and folders in your vault." },
        search: { name: "Search", description: "Find notes and content across your vault." },
        quick_switcher: { name: "Quick switcher", description: "Jump to any file with a few keystrokes." },
        graph_view: { name: "Graph view", description: "Visualize connections between your notes." },
        backlinks: { name: "Backlinks", description: "See which notes link to the current note." },
        outgoing_links: { name: "Outgoing links", description: "See which notes the current note links to." },
        tag_pane: { name: "Tags", description: "Browse and manage tags in your vault." },
        page_preview: { name: "Page preview", description: "Preview notes when hovering over links." },
        starred: { name: "Starred", description: "Star important notes for quick access." },
        templates: { name: "Templates", description: "Create notes from predefined templates." },
        note_composer: { name: "Note composer", description: "Merge, split, and refactor notes." },
        command_palette: { name: "Command palette", description: "Access all commands from one place." },
        markdown_importer: { name: "Markdown importer", description: "Import markdown files from other apps." },
        word_count: { name: "Word count", description: "Display word and character counts." },
        open_with_default_app: { name: "Open with default app", description: "Open files in external applications." },
        file_recovery: { name: "File recovery", description: "Recover accidentally deleted files." }
      };
      return pluginInfoMap[pluginId] || { name: pluginId, description: "Core plugin functionality." };
    }
    renderCommunityPluginsSection() {
      const s = this.settings.community_plugins || this.settings.plugins || {};
      return `
            <section class="settings-section" data-section="community-plugins">
                <div class="settings-section-header">
                    <h1>Community plugins</h1>
                    <p class="settings-section-description">Plugins made by the community to extend Oxidian</p>
                </div>
                
                <div class="community-plugins-header">
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Turn off safe mode to enable plugins</div>
                            <div class="setting-item-description">Safe mode prevents third-party code from running</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="community-safe-mode" ${!s.safe_mode ? "checked" : ""} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="community-plugins-controls ${s.safe_mode ? "disabled" : ""}">
                    <div class="plugins-actions">
                        <button class="mod-cta" id="btn-browse-plugins" ${s.safe_mode ? "disabled" : ""}>Browse community plugins</button>
                        <button class="mod-secondary" id="btn-install-plugin" ${s.safe_mode ? "disabled" : ""}>Install from folder</button>
                        <button class="mod-secondary" id="btn-reload-plugins" ${s.safe_mode ? "disabled" : ""}>Reload plugins</button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-item-info">
                            <div class="setting-item-name">Check for plugin updates</div>
                            <div class="setting-item-description">Automatically check for updates to installed plugins</div>
                        </div>
                        <div class="setting-item-control">
                            <div class="checkbox-container">
                                <input type="checkbox" id="community-plugin-updates" ${s.plugin_updates ? "checked" : ""} ${s.safe_mode ? "disabled" : ""} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="installed-plugins-list" class="installed-plugins-list">
                    ${this.renderInstalledPlugins()}
                </div>
            </section>
        `;
    }
    renderInstalledPlugins() {
      return `
            <div class="plugins-empty-state">
                <div class="empty-state-icon">\u{1F9E9}</div>
                <h3>No community plugins installed</h3>
                <p>Browse the community plugin directory to discover new ways to extend Oxidian.</p>
            </div>
        `;
    }
    renderAboutSection() {
      const s = this.settings.about || { version: "2.2.0", license: "MIT", credits: "Built with Tauri & Rust" };
      return `
            <section class="settings-section" data-section="about">
                <div class="settings-section-header">
                    <h1>About</h1>
                    <p class="settings-section-description">Information about Oxidian</p>
                </div>
                
                <div class="about-content">
                    <div class="about-logo">
                        <div class="app-icon">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <rect width="64" height="64" rx="12" fill="currentColor" opacity="0.1"/>
                                <path d="M20 44L44 20M20 20L44 44" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                                <circle cx="32" cy="32" r="4" fill="currentColor"/>
                            </svg>
                        </div>
                        <div class="app-info">
                            <h2>Oxidian</h2>
                            <p class="version">Version ${s.version}</p>
                        </div>
                    </div>
                    
                    <div class="about-details">
                        <div class="about-section">
                            <h3>License</h3>
                            <p>${s.license}</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>Built with</h3>
                            <p>${s.credits}</p>
                        </div>
                        
                        <div class="about-section">
                            <h3>System Information</h3>
                            <div class="system-info">
                                <div class="system-item">
                                    <span class="system-label">Platform:</span>
                                    <span class="system-value" id="platform-info">Loading...</span>
                                </div>
                                <div class="system-item">
                                    <span class="system-label">Architecture:</span>
                                    <span class="system-value" id="arch-info">Loading...</span>
                                </div>
                                <div class="system-item">
                                    <span class="system-label">Vault path:</span>
                                    <span class="system-value" id="vault-path-info">${this.esc(this.settings.general.vault_path || "Not set")}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="about-section">
                            <h3>Links</h3>
                            <div class="about-links">
                                <button class="link-button" id="btn-github">GitHub Repository</button>
                                <button class="link-button" id="btn-docs">Documentation</button>
                                <button class="link-button" id="btn-community">Community</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }
    bindEvents(wrapper) {
      wrapper.querySelectorAll(".settings-nav-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.switchToSection(btn.dataset.section, wrapper);
        });
      });
      this.bindGeneralEvents(wrapper);
      this.bindEditorEvents(wrapper);
      this.bindFilesLinksEvents(wrapper);
      this.bindAppearanceEvents(wrapper);
      this.bindHotkeysEvents(wrapper);
      this.bindCorePluginsEvents(wrapper);
      this.bindCommunityPluginsEvents(wrapper);
      this.bindAboutEvents(wrapper);
      const saveDebounce = this.debounce(() => this.saveAll(wrapper), 500);
      wrapper.querySelectorAll("input, select, textarea").forEach((el) => {
        if (!el.hasAttribute("data-no-autosave")) {
          el.addEventListener("change", saveDebounce);
          if (el.type !== "range") {
            el.addEventListener("input", saveDebounce);
          }
        }
      });
      this.setupConditionalVisibility(wrapper);
    }
    switchToSection(sectionName, wrapper) {
      this.activeSection = sectionName;
      wrapper.querySelectorAll(".settings-nav-item").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.section === sectionName);
      });
      wrapper.querySelectorAll(".settings-section").forEach((section) => {
        section.classList.toggle("active", section.dataset.section === sectionName);
      });
    }
    initializeSection(sectionName) {
      if (sectionName === "hotkeys") {
        this.initializeHotkeys();
      } else if (sectionName === "community-plugins") {
        this.loadInstalledPlugins();
      } else if (sectionName === "about") {
        this.loadSystemInfo();
      }
    }
    bindGeneralEvents(wrapper) {
      wrapper.querySelector("#btn-browse-vault")?.addEventListener("click", async () => {
        try {
          const { open } = window.__TAURI__.dialog;
          const selected = await open({ directory: true, multiple: false });
          if (selected) {
            const pathInput = wrapper.querySelector("#general-vault-path");
            pathInput.value = selected;
            this.settings.general.vault_path = selected;
            await this.saveAll(wrapper);
          }
        } catch (err) {
          console.error("Failed to browse vault:", err);
        }
      });
    }
    bindEditorEvents(wrapper) {
      const fontSizeSlider = wrapper.querySelector("#editor-font-size");
      const fontSizeValue = wrapper.querySelector("#editor-font-size + .slider-container .slider-value");
      fontSizeSlider?.addEventListener("input", (e) => {
        fontSizeValue.textContent = e.target.value + "px";
        document.documentElement.style.setProperty("--font-size-editor", e.target.value + "px");
      });
      const lineHeightSlider = wrapper.querySelector("#editor-line-height");
      const lineHeightValue = wrapper.querySelector("#editor-line-height + .slider-container .slider-value");
      lineHeightSlider?.addEventListener("input", (e) => {
        lineHeightValue.textContent = e.target.value;
        document.documentElement.style.setProperty("--line-height-editor", e.target.value);
      });
      const fontFamilyInput = wrapper.querySelector("#editor-font-family");
      fontFamilyInput?.addEventListener("change", (e) => {
        document.documentElement.style.setProperty("--font-editor", e.target.value);
      });
      const lineNumbersToggle = wrapper.querySelector("#editor-line-numbers");
      lineNumbersToggle?.addEventListener("change", (e) => {
        this.app.editor?.toggleLineNumbers?.(e.target.checked);
      });
    }
    bindFilesLinksEvents(wrapper) {
    }
    bindAppearanceEvents(wrapper) {
      wrapper.querySelectorAll(".theme-option").forEach((option) => {
        option.addEventListener("click", () => {
          wrapper.querySelectorAll(".theme-option").forEach((o) => o.classList.remove("active"));
          option.classList.add("active");
          const theme = option.dataset.theme;
          this.settings.appearance.theme = theme;
          this.app.themeManager?.applyTheme(theme);
          this.saveAll(wrapper);
        });
      });
      const accentInput = wrapper.querySelector("#appearance-accent-color");
      accentInput?.addEventListener("change", (e) => {
        this.app.themeManager?.setAccentColor(e.target.value);
      });
      wrapper.querySelectorAll(".color-preset").forEach((preset) => {
        preset.addEventListener("click", () => {
          const color = preset.dataset.color;
          accentInput.value = color;
          this.app.themeManager?.setAccentColor(color);
          this.saveAll(wrapper);
        });
      });
      const fontSizeSlider = wrapper.querySelector("#appearance-font-size");
      const fontSizeValue = wrapper.querySelector("#appearance-font-size + .slider-container .slider-value");
      fontSizeSlider?.addEventListener("input", (e) => {
        fontSizeValue.textContent = e.target.value + "px";
        document.documentElement.style.fontSize = e.target.value + "px";
      });
      const zoomSlider = wrapper.querySelector("#appearance-zoom");
      const zoomValue = wrapper.querySelector("#appearance-zoom + .slider-container .slider-value");
      zoomSlider?.addEventListener("input", (e) => {
        const zoom = parseFloat(e.target.value);
        zoomValue.textContent = Math.round(zoom * 100) + "%";
        document.body.style.zoom = zoom;
      });
      wrapper.querySelector("#btn-manage-css")?.addEventListener("click", () => {
        this.showCSSSnippetsManager();
      });
    }
    bindHotkeysEvents(wrapper) {
      const searchInput = wrapper.querySelector("#hotkeys-search");
      searchInput?.addEventListener("input", (e) => {
        this.filterHotkeys(e.target.value);
      });
      wrapper.addEventListener("click", (e) => {
        if (e.target.classList.contains("hotkey-edit-btn")) {
          const commandId = e.target.dataset.command;
          this.editHotkey(commandId);
        } else if (e.target.classList.contains("hotkey-remove-btn")) {
          const commandId = e.target.dataset.command;
          this.removeHotkey(commandId);
        }
      });
    }
    bindCorePluginsEvents(wrapper) {
      wrapper.querySelectorAll('[id^="core-plugin-"]').forEach((toggle) => {
        toggle.addEventListener("change", async (e) => {
          const pluginId = e.target.id.replace("core-plugin-", "");
          this.settings.core_plugins[pluginId] = e.target.checked;
          try {
            await invoke("toggle_core_plugin", { plugin: pluginId, enabled: e.target.checked });
          } catch (err) {
            console.warn("Could not toggle core plugin:", err);
          }
        });
      });
    }
    bindCommunityPluginsEvents(wrapper) {
      const safeModeToggle = wrapper.querySelector("#community-safe-mode");
      safeModeToggle?.addEventListener("change", (e) => {
        const safeMode = !e.target.checked;
        this.settings.community_plugins.safe_mode = safeMode;
        const controls = wrapper.querySelector(".community-plugins-controls");
        controls?.classList.toggle("disabled", safeMode);
        wrapper.querySelectorAll(".community-plugins-controls button, .community-plugins-controls input").forEach((el) => {
          el.disabled = safeMode;
        });
      });
      wrapper.querySelector("#btn-browse-plugins")?.addEventListener("click", () => {
        this.showPluginBrowser();
      });
      wrapper.querySelector("#btn-install-plugin")?.addEventListener("click", () => {
        this.installPluginFromFolder();
      });
      wrapper.querySelector("#btn-reload-plugins")?.addEventListener("click", () => {
        this.reloadPlugins();
      });
    }
    bindAboutEvents(wrapper) {
      wrapper.querySelector("#btn-github")?.addEventListener("click", () => {
        this.openExternal("https://github.com/your-username/oxidian");
      });
      wrapper.querySelector("#btn-docs")?.addEventListener("click", () => {
        this.openExternal("https://oxidian.dev/docs");
      });
      wrapper.querySelector("#btn-community")?.addEventListener("click", () => {
        this.openExternal("https://discord.gg/oxidian");
      });
    }
    setupConditionalVisibility(wrapper) {
      const conditionalElements = wrapper.querySelectorAll("[data-show-if], [data-show-if-value]");
      conditionalElements.forEach((element) => {
        const condition = element.dataset.showIf || element.dataset.showIfValue;
        if (condition.includes(":")) {
          const [targetId, expectedValue] = condition.split(":");
          const targetElement = wrapper.querySelector("#" + targetId);
          const updateVisibility = () => {
            const isVisible = targetElement && targetElement.value === expectedValue;
            element.style.display = isVisible ? "" : "none";
          };
          targetElement?.addEventListener("change", updateVisibility);
          updateVisibility();
        } else {
          const targetElement = wrapper.querySelector("#" + condition);
          const updateVisibility = () => {
            const isVisible = targetElement && targetElement.checked;
            element.style.display = isVisible ? "" : "none";
          };
          targetElement?.addEventListener("change", updateVisibility);
          updateVisibility();
        }
      });
    }
    async saveAll(wrapper) {
      if (!this.settings) return;
      const formData = new FormData();
      wrapper.querySelectorAll("input, select, textarea").forEach((el) => {
        if (el.name || el.id) {
          const key = el.name || el.id;
          let value = el.type === "checkbox" ? el.checked : el.value;
          if (el.type === "range" || el.type === "number") {
            value = parseFloat(value);
          }
          formData.set(key, value);
        }
      });
      this.updateSettingsFromForm(formData);
      try {
        await invoke("save_settings", { settings: this.settings });
      } catch (err) {
        console.error("Failed to save settings:", err);
        this.app?.showErrorToast?.("Failed to save settings: " + err.message);
      }
    }
    updateSettingsFromForm(formData) {
      this.settings.general.language = formData.get("general-language") || "en";
      this.settings.general.startup_behavior = formData.get("general-startup") || "welcome";
      this.settings.general.check_for_updates = formData.get("general-check-updates") === "true";
      this.settings.general.auto_update = formData.get("general-auto-update") === "true";
      this.settings.general.developer_mode = formData.get("general-dev-mode") === "true";
      this.settings.editor.font_family = formData.get("editor-font-family") || "";
      this.settings.editor.font_size = parseInt(formData.get("editor-font-size")) || 15;
      this.settings.editor.line_height = parseFloat(formData.get("editor-line-height")) || 1.6;
      this.settings.editor.tab_size = parseInt(formData.get("editor-tab-size")) || 4;
      this.settings.editor.show_line_numbers = formData.get("editor-line-numbers") === "true";
      this.settings.editor.readable_line_length = formData.get("editor-readable-length") === "true";
      this.settings.editor.max_line_width = parseInt(formData.get("editor-max-width")) || 700;
      this.settings.editor.default_edit_mode = formData.get("editor-default-mode") || "source";
      this.settings.editor.strict_line_breaks = formData.get("editor-strict-breaks") === "true";
      this.settings.editor.smart_indent = formData.get("editor-smart-indent") === "true";
      this.settings.editor.auto_pair_brackets = formData.get("editor-auto-pair-brackets") === "true";
      this.settings.editor.auto_pair_markdown = formData.get("editor-auto-pair-markdown") === "true";
      this.settings.editor.spell_check = formData.get("editor-spell-check") === "true";
      this.settings.editor.vim_mode = formData.get("editor-vim-mode") === "true";
      this.settings.editor.show_frontmatter = formData.get("editor-show-frontmatter") === "true";
      this.settings.editor.fold_heading = formData.get("editor-fold-heading") === "true";
      this.settings.editor.fold_indent = formData.get("editor-fold-indent") === "true";
      this.settings.files_links.default_note_location = formData.get("files-default-location") || "vault_root";
      this.settings.files_links.new_note_location = formData.get("files-new-note-location") || "";
      this.settings.files_links.new_link_format = formData.get("files-link-format") || "shortest";
      this.settings.files_links.use_markdown_links = formData.get("files-use-wikilinks") !== "true";
      this.settings.files_links.auto_update_internal_links = formData.get("files-auto-update-links") === "true";
      this.settings.files_links.detect_all_extensions = formData.get("files-detect-extensions") === "true";
      this.settings.files_links.attachment_folder = formData.get("files-attachment-folder") || "attachments";
      this.settings.files_links.always_update_links = formData.get("files-always-update") === "true";
      this.settings.files_links.confirm_file_deletion = formData.get("files-confirm-delete") === "true";
      this.settings.appearance.accent_color = formData.get("appearance-accent-color") || "#7f6df2";
      this.settings.appearance.interface_font = formData.get("appearance-interface-font") || "default";
      this.settings.appearance.interface_font_size = parseInt(formData.get("appearance-font-size")) || 13;
      this.settings.appearance.zoom_level = parseFloat(formData.get("appearance-zoom")) || 1;
      this.settings.appearance.translucent = formData.get("appearance-translucent") === "true";
      this.settings.appearance.native_menus = formData.get("appearance-native-menus") === "true";
      this.settings.appearance.custom_css = formData.get("appearance-custom-css") === "true";
      this.settings.community_plugins.safe_mode = formData.get("community-safe-mode") !== "true";
      this.settings.community_plugins.plugin_updates = formData.get("community-plugin-updates") === "true";
    }
    // Utility methods
    debounce(fn, ms) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
      };
    }
    esc(text) {
      const div = document.createElement("div");
      div.textContent = text || "";
      return div.innerHTML;
    }
    async openExternal(url) {
      try {
        await invoke("open_external", { url });
      } catch (err) {
        window.open(url, "_blank");
      }
    }
    // Placeholder methods for advanced functionality
    async editHotkey(commandId) {
      console.log("Edit hotkey for command:", commandId);
    }
    async removeHotkey(commandId) {
      this.hotkeys.delete(commandId);
      await this.saveHotkeys();
      this.refreshHotkeys();
    }
    async saveHotkeys() {
      try {
        await invoke("save_hotkeys", { hotkeys: Object.fromEntries(this.hotkeys) });
      } catch (err) {
        console.error("Failed to save hotkeys:", err);
      }
    }
    filterHotkeys(query) {
    }
    refreshHotkeys() {
    }
    showCSSSnippetsManager() {
    }
    showPluginBrowser() {
    }
    async installPluginFromFolder() {
    }
    async reloadPlugins() {
    }
    async loadInstalledPlugins() {
    }
    async loadSystemInfo() {
      try {
        const platform = await invoke("get_platform_info");
        document.querySelector("#platform-info").textContent = platform.os || "Unknown";
        document.querySelector("#arch-info").textContent = platform.arch || "Unknown";
      } catch (err) {
        console.warn("Could not load system info:", err);
      }
    }
    initializeHotkeys() {
    }
  };

  // src/js/onboarding.js
  init_tauri_bridge();
  var Onboarding = class {
    constructor(app) {
      this.app = app;
      this.el = document.getElementById("onboarding-screen");
      this.step = 0;
      this.vaultPath = "";
      this.enableEncryption = false;
      this.password = "";
    }
    async shouldShow() {
      try {
        return await invoke("is_first_launch");
      } catch {
        return false;
      }
    }
    show() {
      if (!this.el) return;
      this.el.classList.remove("hidden");
      this.step = 0;
      this.render();
    }
    hide() {
      if (!this.el) return;
      this.el.classList.add("hidden");
    }
    render() {
      const steps = [
        this.renderWelcome.bind(this),
        this.renderVaultSetup.bind(this),
        this.renderEncryption.bind(this),
        this.renderTour.bind(this)
      ];
      if (this.step >= steps.length) {
        this.finish();
        return;
      }
      this.el.innerHTML = "";
      const container = document.createElement("div");
      container.className = "onboarding-container";
      const progress = document.createElement("div");
      progress.className = "onboarding-progress";
      for (let i = 0; i < steps.length; i++) {
        const dot = document.createElement("div");
        dot.className = "progress-dot" + (i === this.step ? " active" : "") + (i < this.step ? " done" : "");
        progress.appendChild(dot);
      }
      container.appendChild(progress);
      const content = document.createElement("div");
      content.className = "onboarding-content";
      steps[this.step](content);
      container.appendChild(content);
      this.el.appendChild(container);
    }
    renderWelcome(el) {
      el.innerHTML = `
            <div class="onboarding-icon">\u25C8</div>
            <h1>Welcome to Oxidian</h1>
            <p>An open-source note-taking app built for privacy and performance.</p>
            <p class="text-muted">Let's get you set up in a few quick steps.</p>
            <div class="onboarding-actions">
                <button class="btn-primary btn-lg" id="ob-next">Get Started</button>
            </div>
            <div style="margin-top: 16px;">
                <button class="btn-skip-link" id="ob-skip" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;font-family:var(--font-sans);padding:6px 12px;transition:color 150ms ease;">Skip setup \u2192</button>
            </div>
        `;
      el.querySelector("#ob-next").addEventListener("click", () => {
        this.step++;
        this.render();
      });
      el.querySelector("#ob-skip").addEventListener("click", () => this.finish());
    }
    renderVaultSetup(el) {
      el.innerHTML = `
            <h2>Set Up Your Vault</h2>
            <p>Choose where to store your notes. A vault is just a folder on your computer.</p>
            <div class="onboarding-options">
                <button class="ob-option-card" id="ob-new-vault">
                    <div class="ob-option-icon">\u{1F4C1}</div>
                    <h3>Create New Vault</h3>
                    <p>Start fresh with a new empty vault</p>
                </button>
                <button class="ob-option-card" id="ob-open-vault">
                    <div class="ob-option-icon">\u{1F4C2}</div>
                    <h3>Open Existing Vault</h3>
                    <p>Use an existing folder of notes</p>
                </button>
            </div>
            <div class="onboarding-vault-path" id="ob-vault-path-group" style="display:none">
                <label>Vault Location</label>
                <div class="ob-path-input">
                    <input type="text" id="ob-vault-path" placeholder="Select or type a folder path...">
                    <button class="btn-secondary btn-sm" id="ob-browse">Browse</button>
                </div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" id="ob-back">Back</button>
                    <button class="btn-primary" id="ob-vault-next" disabled>Continue</button>
                </div>
            </div>
        `;
      const pathGroup = el.querySelector("#ob-vault-path-group");
      const pathInput = el.querySelector("#ob-vault-path");
      const nextBtn = el.querySelector("#ob-vault-next");
      const showPathInput = async (isNew) => {
        pathGroup.style.display = "block";
        el.querySelector(".onboarding-options").style.display = "none";
        if (isNew) {
          try {
            const defaultPath = await invoke("get_vault_path");
            pathInput.value = defaultPath;
            this.vaultPath = defaultPath;
            nextBtn.disabled = false;
          } catch {
          }
        }
      };
      el.querySelector("#ob-new-vault").addEventListener("click", () => showPathInput(true));
      el.querySelector("#ob-open-vault").addEventListener("click", () => showPathInput(false));
      pathInput.addEventListener("input", () => {
        this.vaultPath = pathInput.value.trim();
        nextBtn.disabled = !this.vaultPath;
      });
      el.querySelector("#ob-browse")?.addEventListener("click", async () => {
        try {
          const { open } = window.__TAURI__.dialog || {};
          if (open) {
            const selected = await open({ directory: true, title: "Select Vault Folder" });
            if (selected) {
              pathInput.value = selected;
              this.vaultPath = selected;
              nextBtn.disabled = false;
            }
          }
        } catch {
        }
      });
      nextBtn.addEventListener("click", async () => {
        if (this.vaultPath) {
          try {
            await invoke("setup_vault", { path: this.vaultPath });
          } catch (err) {
            console.error(err);
          }
          this.step++;
          this.render();
        }
      });
      el.querySelector("#ob-back")?.addEventListener("click", () => {
        pathGroup.style.display = "none";
        el.querySelector(".onboarding-options").style.display = "flex";
      });
    }
    renderEncryption(el) {
      el.innerHTML = `
            <h2>Vault Security</h2>
            <p>Would you like to encrypt your vault? Your notes will be protected with a master password.</p>
            <div class="onboarding-options">
                <button class="ob-option-card" id="ob-encrypt-yes">
                    <div class="ob-option-icon">\u{1F512}</div>
                    <h3>Enable Encryption</h3>
                    <p>AES-256-GCM encryption with Argon2id</p>
                </button>
                <button class="ob-option-card" id="ob-encrypt-no">
                    <div class="ob-option-icon">\u{1F4DD}</div>
                    <h3>Skip for Now</h3>
                    <p>You can enable this later in Settings</p>
                </button>
            </div>
            <div id="ob-password-group" style="display:none">
                <div class="ob-password-fields">
                    <input type="password" id="ob-password" placeholder="Enter master password...">
                    <input type="password" id="ob-password-confirm" placeholder="Confirm password...">
                    <p class="ob-password-hint text-muted">Use a strong, memorable password. If you forget it, your data cannot be recovered.</p>
                </div>
                <div class="onboarding-actions">
                    <button class="btn-secondary" id="ob-enc-back">Back</button>
                    <button class="btn-primary" id="ob-enc-next">Set Password & Continue</button>
                </div>
            </div>
        `;
      el.querySelector("#ob-encrypt-no").addEventListener("click", () => {
        this.enableEncryption = false;
        this.step++;
        this.render();
      });
      el.querySelector("#ob-encrypt-yes").addEventListener("click", () => {
        el.querySelector(".onboarding-options").style.display = "none";
        el.querySelector("#ob-password-group").style.display = "block";
      });
      el.querySelector("#ob-enc-back")?.addEventListener("click", () => {
        el.querySelector(".onboarding-options").style.display = "flex";
        el.querySelector("#ob-password-group").style.display = "none";
      });
      el.querySelector("#ob-enc-next")?.addEventListener("click", async () => {
        const pwd = el.querySelector("#ob-password").value;
        const confirm2 = el.querySelector("#ob-password-confirm").value;
        if (!pwd) {
          alert("Please enter a password");
          return;
        }
        if (pwd !== confirm2) {
          alert("Passwords do not match");
          return;
        }
        try {
          await invoke("setup_encryption", { password: pwd });
          this.enableEncryption = true;
          this.step++;
          this.render();
        } catch (err) {
          alert("Failed: " + err);
        }
      });
    }
    renderTour(el) {
      el.innerHTML = `
            <h2>You're All Set! \u2728</h2>
            <p>Here's what you can do with Oxidian:</p>
            <div class="tour-features">
                <div class="tour-feature">
                    <span class="tour-icon">\u{1F4DD}</span>
                    <div><strong>Markdown Editor</strong><br><span style="color:var(--text-muted);font-size:12px">Full markdown, live preview, and [[wiki-links]]</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">\u{1F517}</span>
                    <div><strong>Graph View</strong><br><span style="color:var(--text-muted);font-size:12px">Visualize connections between your notes</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">\u{1F50D}</span>
                    <div><strong>Full-Text Search</strong><br><span style="color:var(--text-muted);font-size:12px">Find anything instantly with Ctrl+Shift+F</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">\u{1F4C5}</span>
                    <div><strong>Daily Notes</strong><br><span style="color:var(--text-muted);font-size:12px">Journal with auto-created daily notes (Ctrl+D)</span></div>
                </div>
                <div class="tour-feature">
                    <span class="tour-icon">\u26A1</span>
                    <div><strong>Slash Commands</strong><br><span style="color:var(--text-muted);font-size:12px">Type / in the editor for quick formatting</span></div>
                </div>
            </div>
            <div class="onboarding-actions" style="margin-top:32px">
                <button class="btn-primary btn-lg" id="ob-finish">Start Writing \u2726</button>
            </div>
        `;
      el.querySelector("#ob-finish").addEventListener("click", () => this.finish());
    }
    async finish() {
      if (this.el) {
        this.el.style.transition = "opacity 300ms ease";
        this.el.style.opacity = "0";
        await new Promise((r) => setTimeout(r, 300));
      }
      this.hide();
      if (this.el) this.el.style.opacity = "";
      await this.app.sidebar?.refresh();
      await this.app.loadTags();
    }
  };

  // src/js/plugin-loader.js
  init_tauri_bridge();

  // src/js/obsidian-api.js
  init_tauri_bridge();
  var _warnedStubs = /* @__PURE__ */ new Set();
  function _stubWarn(className, methodName) {
    const key = `${className}.${methodName}`;
    if (!_warnedStubs.has(key)) {
      _warnedStubs.add(key);
      console.warn(`[Oxidian] Stub: ${key} not fully implemented`);
    }
  }
  var apiVersion = "1.7.2";
  var Events = class {
    constructor() {
      this._events = {};
      this._eventRefId = 0;
    }
    on(event, callback, ctx) {
      if (!this._events[event]) this._events[event] = [];
      const ref = { id: ++this._eventRefId, event, callback, ctx };
      this._events[event].push(ref);
      return ref;
    }
    off(event, callback) {
      if (!this._events[event]) return;
      this._events[event] = this._events[event].filter((r) => r.callback !== callback);
    }
    offref(ref) {
      if (ref && ref.event) {
        if (!this._events[ref.event]) return;
        this._events[ref.event] = this._events[ref.event].filter((r) => r.id !== ref.id);
      }
    }
    trigger(event, ...args) {
      if (!this._events[event]) return;
      for (const ref of [...this._events[event]]) {
        try {
          ref.callback.apply(ref.ctx || this, args);
        } catch (e) {
          console.error(`Plugin event error [${event}]:`, e);
        }
      }
    }
    tryTrigger(event, args) {
      try {
        if (this._events[event]) {
          for (const ref of [...this._events[event]]) {
            ref.callback.apply(ref.ctx || this, args || []);
          }
        }
      } catch (e) {
      }
    }
  };
  var Component = class {
    constructor() {
      this._children = [];
      this._loaded = false;
      this._cleanups = [];
      this._eventRefs = [];
      this._domEvents = [];
      this._intervals = [];
    }
    load() {
      if (this._loaded) return;
      this._loaded = true;
      this.onload();
      for (const child of this._children) {
        child.load();
      }
    }
    onload() {
    }
    unload() {
      if (!this._loaded) return;
      this._loaded = false;
      this.onunload();
      for (const child of [...this._children]) {
        child.unload();
      }
      this._children = [];
      for (const cb of this._cleanups) {
        try {
          cb();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      }
      this._cleanups = [];
      for (const ref of this._eventRefs) {
        if (ref && ref.event && ref.id) {
          if (ref._source) ref._source.offref(ref);
        }
      }
      this._eventRefs = [];
      for (const de of this._domEvents) {
        try {
          de.el.removeEventListener(de.type, de.callback, de.options);
        } catch {
        }
      }
      this._domEvents = [];
      for (const id of this._intervals) {
        clearInterval(id);
      }
      this._intervals = [];
    }
    onunload() {
    }
    addChild(component) {
      this._children.push(component);
      if (this._loaded) component.load();
      return component;
    }
    removeChild(component) {
      const idx = this._children.indexOf(component);
      if (idx >= 0) {
        this._children.splice(idx, 1);
        component.unload();
      }
      return component;
    }
    register(cb) {
      this._cleanups.push(cb);
    }
    registerEvent(eventRef) {
      this._eventRefs.push(eventRef);
    }
    registerDomEvent(el, type, callback, options) {
      el.addEventListener(type, callback, options);
      this._domEvents.push({ el, type, callback, options });
    }
    registerInterval(id) {
      this._intervals.push(id);
      return id;
    }
  };
  var TAbstractFile = class {
    constructor(path) {
      this.vault = null;
      this.path = path || "";
      this.name = path ? path.split("/").pop() : "";
      this.parent = null;
    }
  };
  var TFile = class extends TAbstractFile {
    constructor(path, stat) {
      super(path);
      this.basename = this.name.replace(/\.[^.]+$/, "");
      this.extension = (this.name.match(/\.([^.]+)$/) || ["", "md"])[1];
      this.stat = stat || { ctime: Date.now(), mtime: Date.now(), size: 0 };
    }
  };
  var TFolder = class extends TAbstractFile {
    constructor(path) {
      super(path);
      this.children = [];
    }
    isRoot() {
      return !this.path || this.path === "/" || this.path === "";
    }
  };
  var FileSystemAdapter = class {
    constructor(basePath) {
      this._basePath = basePath || "/vault";
    }
    getName() {
      return "filesystem";
    }
    getBasePath() {
      return this._basePath;
    }
    async read(normalizedPath) {
      try {
        return await invoke("read_note", { path: normalizedPath });
      } catch (error) {
        console.error("Failed to read file:", normalizedPath, error);
        throw error;
      }
    }
    async readBinary(normalizedPath) {
      _stubWarn("FileSystemAdapter", "readBinary");
      const text = await this.read(normalizedPath);
      const enc = new TextEncoder();
      return enc.encode(text).buffer;
    }
    async write(normalizedPath, data, options) {
      try {
        return await invoke("save_note", { path: normalizedPath, content: data });
      } catch (error) {
        console.error("Failed to write file:", normalizedPath, error);
        throw error;
      }
    }
    async writeBinary(normalizedPath, data, options) {
      _stubWarn("FileSystemAdapter", "writeBinary");
      const dec = new TextDecoder();
      return this.write(normalizedPath, dec.decode(data), options);
    }
    async append(normalizedPath, data, options) {
      const existing = await this.read(normalizedPath).catch(() => "");
      return this.write(normalizedPath, existing + data, options);
    }
    async process(normalizedPath, fn, options) {
      const data = await this.read(normalizedPath);
      const newData = fn(data);
      await this.write(normalizedPath, newData, options);
      return newData;
    }
    async exists(normalizedPath, sensitive) {
      try {
        const targets = await invoke("resolve_link", { link: normalizedPath });
        return targets && targets.length > 0;
      } catch {
        try {
          await invoke("read_note", { path: normalizedPath });
          return true;
        } catch {
          return false;
        }
      }
    }
    async stat(normalizedPath) {
      try {
        await invoke("read_note", { path: normalizedPath });
        return { type: "file", ctime: Date.now(), mtime: Date.now(), size: 0 };
      } catch {
        return null;
      }
    }
    async list(normalizedPath) {
      try {
        const tree = await invoke("list_files");
        const files = [];
        const folders = [];
        const walk = (nodes) => {
          for (const node of nodes) {
            if (node.is_dir) {
              folders.push(node.path);
              walk(node.children || []);
            } else {
              files.push(node.path);
            }
          }
        };
        walk(tree);
        return { files, folders };
      } catch {
        return { files: [], folders: [] };
      }
    }
    async listAll(normalizedPath) {
      return this.list(normalizedPath);
    }
    async mkdir(normalizedPath) {
      _stubWarn("FileSystemAdapter", "mkdir");
    }
    async trashSystem(normalizedPath) {
      _stubWarn("FileSystemAdapter", "trashSystem");
      return false;
    }
    async trashLocal(normalizedPath) {
      _stubWarn("FileSystemAdapter", "trashLocal");
    }
    async rmdir(normalizedPath, recursive) {
      _stubWarn("FileSystemAdapter", "rmdir");
    }
    async remove(normalizedPath) {
      try {
        return await invoke("delete_note", { path: normalizedPath });
      } catch (error) {
        console.error("Failed to delete file:", normalizedPath, error);
        throw error;
      }
    }
    async rename(normalizedPath, normalizedNewPath) {
      try {
        return await invoke("rename_file", { oldPath: normalizedPath, newPath: normalizedNewPath });
      } catch (error) {
        console.error("Failed to rename file:", normalizedPath, "to", normalizedNewPath, error);
        throw error;
      }
    }
    async copy(normalizedPath, normalizedNewPath) {
      const data = await this.read(normalizedPath);
      await this.write(normalizedNewPath, data);
    }
    getFullPath(normalizedPath) {
      return this._basePath + "/" + normalizedPath;
    }
    getResourcePath(normalizedPath) {
      return this.getFullPath(normalizedPath);
    }
  };
  var Vault = class _Vault extends Events {
    constructor(app) {
      super();
      this._app = app;
      this._fileCache = /* @__PURE__ */ new Map();
      this._folderCache = /* @__PURE__ */ new Map();
      this._contentCache = /* @__PURE__ */ new Map();
      this._vaultName = null;
      this._config = {};
      this.adapter = new FileSystemAdapter();
      this.configDir = ".obsidian";
      invoke("get_vault_path").then((path) => {
        if (path) {
          this.adapter._basePath = path;
          this._vaultName = path.split("/").pop() || "Oxidian Vault";
        }
      }).catch(() => {
      });
    }
    getName() {
      if (this._vaultName) return this._vaultName;
      try {
        const basePath = this.adapter.getBasePath();
        if (basePath) {
          this._vaultName = basePath.split("/").pop() || "Oxidian Vault";
          return this._vaultName;
        }
      } catch {
      }
      return "Oxidian Vault";
    }
    getRoot() {
      const root = new TFolder("");
      root.vault = this;
      this._fileCache.forEach((file, path) => {
        if (!path.includes("/")) root.children.push(file);
      });
      this._folderCache.forEach((folder, path) => {
        if (!path.includes("/")) root.children.push(folder);
      });
      return root;
    }
    getAbstractFileByPath(path) {
      if (!path || path === "" || path === "/") return this.getRoot();
      if (this._fileCache.has(path)) return this._fileCache.get(path);
      if (this._folderCache.has(path)) return this._folderCache.get(path);
      return null;
    }
    getFileByPath(path) {
      const f = this._fileCache.get(path);
      return f instanceof TFile ? f : null;
    }
    getFolderByPath(path) {
      if (!path || path === "" || path === "/") return this.getRoot();
      const f = this._folderCache.get(path);
      return f instanceof TFolder ? f : null;
    }
    getMarkdownFiles() {
      const files = [];
      this._fileCache.forEach((file) => {
        if (file.extension === "md") files.push(file);
      });
      return files;
    }
    getFiles() {
      return Array.from(this._fileCache.values());
    }
    getAllLoadedFiles() {
      return [...this._fileCache.values(), ...this._folderCache.values()];
    }
    async read(file) {
      const path = typeof file === "string" ? file : file.path;
      try {
        const content = await invoke("read_note", { path });
        this._contentCache.set(path, content);
        return content;
      } catch (e) {
        throw new Error(`Failed to read ${path}: ${e}`);
      }
    }
    async cachedRead(file) {
      const path = typeof file === "string" ? file : file.path;
      if (this._contentCache.has(path)) return this._contentCache.get(path);
      return this.read(file);
    }
    async create(path, data = "", options) {
      await invoke("save_note", { path, content: data });
      const file = new TFile(path);
      file.vault = this;
      this._fileCache.set(path, file);
      this._contentCache.set(path, data);
      this.trigger("create", file);
      return file;
    }
    async createFolder(path) {
      _stubWarn("Vault", "createFolder");
      const folder = new TFolder(path);
      folder.vault = this;
      this._folderCache.set(path, folder);
      this.trigger("create", folder);
      return folder;
    }
    async modify(file, data, options) {
      const path = typeof file === "string" ? file : file.path;
      await invoke("save_note", { path, content: data });
      this._contentCache.set(path, data);
      const f = this._fileCache.get(path) || file;
      if (f && f.stat) f.stat.mtime = Date.now();
      this.trigger("modify", f);
    }
    async append(file, data, options) {
      const path = typeof file === "string" ? file : file.path;
      const existing = await this.cachedRead(typeof file === "string" ? { path } : file).catch(() => "");
      await this.modify(file, existing + data, options);
    }
    async process(file, fn, options) {
      const data = await this.read(file);
      const newData = fn(data);
      await this.modify(file, newData, options);
      return newData;
    }
    async rename(file, newPath) {
      const oldPath = typeof file === "string" ? file : file.path;
      await invoke("rename_file", { oldPath, newPath });
      const content = this._contentCache.get(oldPath);
      this._fileCache.delete(oldPath);
      this._contentCache.delete(oldPath);
      const newFile = new TFile(newPath);
      newFile.vault = this;
      this._fileCache.set(newPath, newFile);
      if (content !== void 0) this._contentCache.set(newPath, content);
      this.trigger("rename", newFile, oldPath);
      return newFile;
    }
    async copy(file, newPath) {
      const data = await this.read(file);
      return this.create(newPath, data);
    }
    async delete(file, force) {
      const path = typeof file === "string" ? file : file.path;
      await invoke("delete_note", { path });
      this._fileCache.delete(path);
      this._contentCache.delete(path);
      this.trigger("delete", file);
    }
    async trash(file, system) {
      return this.delete(file, true);
    }
    getConfig(key) {
      return this._config[key];
    }
    setConfig(key, value) {
      this._config[key] = value;
    }
    static recurseChildren(root, cb) {
      cb(root);
      if (root.children) {
        for (const child of root.children) {
          _Vault.recurseChildren(child, cb);
        }
      }
    }
    async _refreshFileCache() {
      try {
        const tree = await invoke("list_files");
        this._fileCache.clear();
        this._folderCache.clear();
        const walk = (nodes, parentPath) => {
          for (const node of nodes) {
            if (node.is_dir) {
              const folder = new TFolder(node.path);
              folder.vault = this;
              this._folderCache.set(node.path, folder);
              walk(node.children || [], node.path);
            } else {
              const file = new TFile(node.path);
              file.vault = this;
              this._fileCache.set(node.path, file);
            }
          }
        };
        walk(tree, "");
      } catch (e) {
        console.error("Failed to refresh file cache:", e);
      }
    }
  };
  var Scope = class {
    constructor(parent) {
      this.parent = parent || null;
      this.keys = [];
    }
    register(modifiers, key, func) {
      const handler = { modifiers: modifiers || [], key, func };
      this.keys.push(handler);
      return handler;
    }
    unregister(handler) {
      const idx = this.keys.indexOf(handler);
      if (idx >= 0) this.keys.splice(idx, 1);
    }
  };
  var Keymap = class {
    constructor() {
      this._scopes = [];
    }
    static isModEvent(evt) {
      return evt ? evt.ctrlKey || evt.metaKey : false;
    }
    static isModifier(evt, modifier) {
      if (!evt) return false;
      switch (modifier) {
        case "Mod":
          return evt.ctrlKey || evt.metaKey;
        case "Ctrl":
          return evt.ctrlKey;
        case "Meta":
          return evt.metaKey;
        case "Shift":
          return evt.shiftKey;
        case "Alt":
          return evt.altKey;
        default:
          return false;
      }
    }
    pushScope(scope) {
      this._scopes.push(scope);
    }
    popScope(scope) {
      const idx = this._scopes.indexOf(scope);
      if (idx >= 0) this._scopes.splice(idx, 1);
    }
  };
  var Editor2 = class {
    constructor() {
      this._lines = [""];
      this._cursor = { line: 0, ch: 0 };
      this._selections = [];
      this.cm = null;
    }
    getValue() {
      return this._lines.join("\n");
    }
    setValue(value) {
      this._lines = (value || "").split("\n");
    }
    getLine(n) {
      return this._lines[n] || "";
    }
    setLine(n, text) {
      while (this._lines.length <= n) this._lines.push("");
      this._lines[n] = text;
    }
    lineCount() {
      return this._lines.length;
    }
    lastLine() {
      return this._lines.length - 1;
    }
    getSelection() {
      if (this._selections.length === 0) return "";
      const sel = this._selections[0];
      return this.getRange(sel.anchor, sel.head);
    }
    getRange(from, to) {
      if (!from || !to) return "";
      if (from.line === to.line) {
        return (this._lines[from.line] || "").substring(from.ch, to.ch);
      }
      const lines = [];
      lines.push((this._lines[from.line] || "").substring(from.ch));
      for (let i = from.line + 1; i < to.line; i++) {
        lines.push(this._lines[i] || "");
      }
      lines.push((this._lines[to.line] || "").substring(0, to.ch));
      return lines.join("\n");
    }
    replaceSelection(replacement) {
      if (this._selections.length === 0) return;
      const sel = this._selections[0];
      const anchor = sel.anchor;
      const head = sel.head;
      let from, to;
      if (anchor.line < head.line || anchor.line === head.line && anchor.ch <= head.ch) {
        from = anchor;
        to = head;
      } else {
        from = head;
        to = anchor;
      }
      this.replaceRange(replacement, from, to);
      const newLines = replacement.split("\n");
      let endLine, endCh;
      if (newLines.length === 1) {
        endLine = from.line;
        endCh = from.ch + newLines[0].length;
      } else {
        endLine = from.line + newLines.length - 1;
        endCh = newLines[newLines.length - 1].length;
      }
      const endPos = { line: endLine, ch: endCh };
      this._cursor = endPos;
      this._selections = [];
    }
    replaceRange(replacement, from, to) {
      if (!from) return;
      if (!to) to = from;
      const repLines = (replacement || "").split("\n");
      const before = (this._lines[from.line] || "").substring(0, from.ch);
      const after = (this._lines[to.line] || "").substring(to.ch);
      if (repLines.length === 1) {
        this._lines[from.line] = before + repLines[0] + after;
        if (to.line > from.line) {
          this._lines.splice(from.line + 1, to.line - from.line);
        }
      } else {
        const newLines = [];
        newLines.push(before + repLines[0]);
        for (let i = 1; i < repLines.length - 1; i++) {
          newLines.push(repLines[i]);
        }
        newLines.push(repLines[repLines.length - 1] + after);
        this._lines.splice(from.line, to.line - from.line + 1, ...newLines);
      }
    }
    getCursor(string) {
      return { ...this._cursor };
    }
    setCursor(posOrLine, ch) {
      if (typeof posOrLine === "number") {
        this._cursor = { line: posOrLine, ch: ch || 0 };
      } else {
        this._cursor = { line: posOrLine.line, ch: posOrLine.ch };
      }
    }
    setSelection(anchor, head) {
      this._selections = [{ anchor, head: head || anchor }];
    }
    listSelections() {
      return this._selections.length > 0 ? this._selections : [{ anchor: this._cursor, head: this._cursor }];
    }
    somethingSelected() {
      if (this._selections.length === 0) return false;
      const s = this._selections[0];
      return s.anchor.line !== s.head.line || s.anchor.ch !== s.head.ch;
    }
    hasFocus() {
      return false;
    }
    focus() {
      _stubWarn("Editor", "focus");
    }
    blur() {
      _stubWarn("Editor", "blur");
    }
    getScrollInfo() {
      return { top: 0, left: 0, clientHeight: 0, clientWidth: 0 };
    }
    scrollTo(x, y) {
      _stubWarn("Editor", "scrollTo");
    }
    scrollIntoView(range, margin) {
      _stubWarn("Editor", "scrollIntoView");
    }
    undo() {
      _stubWarn("Editor", "undo");
    }
    redo() {
      _stubWarn("Editor", "redo");
    }
    exec(command) {
      _stubWarn("Editor", "exec");
    }
    transaction(fn) {
      if (typeof fn === "function") fn();
    }
    posToOffset(pos) {
      let offset = 0;
      for (let i = 0; i < pos.line && i < this._lines.length; i++) {
        offset += this._lines[i].length + 1;
      }
      offset += pos.ch;
      return offset;
    }
    offsetToPos(offset) {
      let remaining = offset;
      for (let i = 0; i < this._lines.length; i++) {
        if (remaining <= this._lines[i].length) {
          return { line: i, ch: remaining };
        }
        remaining -= this._lines[i].length + 1;
      }
      return { line: this._lines.length - 1, ch: this._lines[this._lines.length - 1].length };
    }
    getDoc() {
      return this;
    }
    wordAt(pos) {
      _stubWarn("Editor", "wordAt");
      return { from: pos, to: pos };
    }
  };
  var WorkspaceItem = class extends Events {
    constructor() {
      super();
    }
    getRoot() {
      return this;
    }
    getContainer() {
      return this;
    }
  };
  var WorkspaceSplit = class extends WorkspaceItem {
    constructor() {
      super();
      this.children = [];
    }
  };
  var WorkspaceTabs = class extends WorkspaceItem {
    constructor() {
      super();
      this.children = [];
    }
  };
  var WorkspaceRoot = class extends WorkspaceItem {
    constructor() {
      super();
    }
  };
  var WorkspaceContainer = class extends WorkspaceItem {
    constructor() {
      super();
    }
  };
  var WorkspaceWindow = class extends WorkspaceContainer {
    constructor() {
      super();
      this.win = null;
      this.doc = null;
    }
  };
  var WorkspaceMobileDrawer = class extends WorkspaceItem {
    constructor() {
      super();
    }
  };
  var WorkspaceLeaf = class extends WorkspaceItem {
    constructor(workspace) {
      super();
      this._workspace = workspace;
      this.view = null;
      this.pinned = false;
      this.group = null;
      this.tabHeaderEl = document.createElement("div");
      this.tabHeaderInnerTitleEl = document.createElement("span");
      this.tabHeaderEl.appendChild(this.tabHeaderInnerTitleEl);
    }
    getViewState() {
      return this.view ? { type: this.view.getViewType() } : { type: "empty" };
    }
    async setViewState(state) {
      _stubWarn("WorkspaceLeaf", "setViewState");
    }
    async open(view) {
      this.view = view;
    }
    async openFile(file, openState) {
      if (this._workspace && this._workspace._app) {
        this._workspace._activeFile = file;
        this._workspace.trigger("file-open", file);
      }
    }
    getDisplayText() {
      return this.view?.getDisplayText?.() || "";
    }
    detach() {
      if (this._workspace) {
        this._workspace._leaves = this._workspace._leaves.filter((l) => l !== this);
      }
    }
    setPinned(pinned) {
      this.pinned = pinned;
      this.trigger("pinned-change", pinned);
    }
    setGroup(group) {
      this.group = group;
      this.trigger("group-change", group);
    }
    togglePinned() {
      this.setPinned(!this.pinned);
    }
  };
  var Workspace = class extends Events {
    constructor(app) {
      super();
      this._app = app;
      this._activeFile = null;
      this._leaves = [];
      this._layoutReady = true;
      this.activeLeaf = null;
      this.activeEditor = null;
      this.containerEl = document.body;
      this.leftSplit = new WorkspaceSplit();
      this.rightSplit = new WorkspaceSplit();
      this.leftRibbon = { containerEl: document.createElement("div") };
      this.rightRibbon = { containerEl: document.createElement("div") };
      this.rootSplit = new WorkspaceSplit();
    }
    getActiveFile() {
      return this._activeFile;
    }
    setActiveFile(file) {
      this._activeFile = file;
      this.trigger("file-open", file);
      this.trigger("active-leaf-change", this.activeLeaf || this.getLeaf());
    }
    getLeaf(newLeaf) {
      if (newLeaf === true || newLeaf === "tab" || newLeaf === "split" || newLeaf === "window") {
        const leaf = new WorkspaceLeaf(this);
        this._leaves.push(leaf);
        return leaf;
      }
      if (this._leaves.length === 0) {
        const leaf = new WorkspaceLeaf(this);
        this._leaves.push(leaf);
      }
      return this._leaves[this._leaves.length - 1];
    }
    getMostRecentLeaf(root) {
      return this._leaves.length > 0 ? this._leaves[this._leaves.length - 1] : null;
    }
    getLeftLeaf(split) {
      const leaf = new WorkspaceLeaf(this);
      this._leaves.push(leaf);
      return leaf;
    }
    getRightLeaf(split) {
      const leaf = new WorkspaceLeaf(this);
      this._leaves.push(leaf);
      return leaf;
    }
    getLeavesOfType(type) {
      return this._leaves.filter((l) => l.view?.getViewType?.() === type);
    }
    getActiveViewOfType(type) {
      const leaf = this.activeLeaf || (this._leaves.length > 0 ? this._leaves[0] : null);
      if (leaf?.view instanceof type) return leaf.view;
      for (const l of this._leaves) {
        if (l.view instanceof type) return l.view;
      }
      return null;
    }
    revealLeaf(leaf) {
      this.activeLeaf = leaf;
      this.trigger("active-leaf-change", leaf);
    }
    detachLeavesOfType(type) {
      this._leaves = this._leaves.filter((l) => l.view?.getViewType?.() !== type);
    }
    setActiveLeaf(leaf, params) {
      this.activeLeaf = leaf;
      this.trigger("active-leaf-change", leaf);
    }
    getUnpinnedLeaf(type) {
      for (const leaf of this._leaves) {
        if (!leaf.pinned && (!type || leaf.view?.getViewType?.() === type)) return leaf;
      }
      return this.getLeaf();
    }
    iterateRootLeaves(callback) {
      for (const leaf of this._leaves) {
        callback(leaf);
      }
    }
    iterateAllLeaves(callback) {
      for (const leaf of this._leaves) {
        callback(leaf);
      }
    }
    onLayoutReady(callback) {
      if (this._layoutReady) {
        setTimeout(callback, 0);
      } else {
        this.on("layout-ready", callback);
      }
    }
    requestSaveLayout() {
      _stubWarn("Workspace", "requestSaveLayout");
    }
    changeLayout(layout) {
      _stubWarn("Workspace", "changeLayout");
      return Promise.resolve();
    }
    getLayout() {
      _stubWarn("Workspace", "getLayout");
      return {};
    }
    createLeafInParent(parent, index) {
      const leaf = new WorkspaceLeaf(this);
      this._leaves.push(leaf);
      return leaf;
    }
    splitActiveLeaf(direction) {
      return this.getLeaf(true);
    }
    async openLinkText(linktext, sourcePath, newLeaf, openViewState) {
      _stubWarn("Workspace", "openLinkText");
    }
    openPopoutLeaf(data) {
      return this.getLeaf(true);
    }
    updateOptions() {
      _stubWarn("Workspace", "updateOptions");
    }
  };
  var View = class extends Component {
    constructor(leaf) {
      super();
      this.app = leaf?._workspace?._app || (typeof window !== "undefined" ? window.app : null);
      this.leaf = leaf;
      this.containerEl = document.createElement("div");
      this.icon = "";
      this.navigation = true;
    }
    getViewType() {
      return "";
    }
    getDisplayText() {
      return "";
    }
    getIcon() {
      return this.icon;
    }
    getState() {
      return {};
    }
    setState(state, result) {
      return Promise.resolve();
    }
    onOpen() {
      return Promise.resolve();
    }
    onClose() {
      return Promise.resolve();
    }
    onResize() {
    }
  };
  var ItemView = class extends View {
    constructor(leaf) {
      super(leaf);
      this.contentEl = document.createElement("div");
      this.containerEl.appendChild(this.contentEl);
    }
    addAction(icon, title, callback) {
      const btn = document.createElement("button");
      btn.className = "view-action";
      btn.title = title;
      setIcon(btn, icon);
      btn.addEventListener("click", callback);
      return btn;
    }
    onHeaderMenu(menu) {
    }
  };
  var EditableFileView = class extends ItemView {
    constructor(leaf) {
      super(leaf);
      this.file = null;
    }
    canAcceptExtension(extension) {
      return false;
    }
  };
  var FileView = class extends EditableFileView {
    constructor(leaf) {
      super(leaf);
      this.allowNoFile = false;
    }
    getDisplayText() {
      return this.file?.basename || "";
    }
  };
  var TextFileView = class extends EditableFileView {
    constructor(leaf) {
      super(leaf);
      this.data = "";
      this.requestSave = debounce(() => this.save(), 2e3, true);
    }
    getViewData() {
      return this.data;
    }
    setViewData(data, clear) {
      this.data = data;
    }
    clear() {
      this.data = "";
    }
    async save() {
      if (this.file && this.app?.vault) {
        await this.app.vault.modify(this.file, this.getViewData());
      }
    }
  };
  var MarkdownEditView = class {
    constructor() {
      this.editor = new Editor2();
    }
    clear() {
      this.editor.setValue("");
    }
    get() {
      return this.editor.getValue();
    }
    set(data) {
      this.editor.setValue(data);
    }
  };
  var MarkdownPreviewView = class {
    constructor() {
      this._content = "";
      this._scroll = 0;
      this.containerEl = document.createElement("div");
    }
    clear() {
      this._content = "";
      this.containerEl.innerHTML = "";
    }
    get() {
      return this._content;
    }
    set(data) {
      this._content = data;
    }
    applyScroll(scroll) {
      this._scroll = scroll;
    }
    getScroll() {
      return this._scroll;
    }
    rerender(full) {
      _stubWarn("MarkdownPreviewView", "rerender");
    }
  };
  var MarkdownView = class extends TextFileView {
    constructor(leaf) {
      super(leaf);
      this.editor = new Editor2();
      this.currentMode = new MarkdownEditView();
      this.previewMode = new MarkdownPreviewView();
    }
    getViewType() {
      return "markdown";
    }
    getDisplayText() {
      return this.file?.basename || "";
    }
    getViewData() {
      return this.editor.getValue();
    }
    setViewData(data, clear) {
      this.data = data;
      this.editor.setValue(data);
    }
    clear() {
      this.data = "";
      this.editor.setValue("");
    }
    getMode() {
      return "source";
    }
    showBacklinks() {
      _stubWarn("MarkdownView", "showBacklinks");
    }
  };
  var MetadataCache = class extends Events {
    constructor(app) {
      super();
      this._app = app;
      this._cache = /* @__PURE__ */ new Map();
      this.resolvedLinks = {};
      this.unresolvedLinks = {};
    }
    getFileCache(file) {
      const path = typeof file === "string" ? file : file.path;
      return this._cache.get(path) || null;
    }
    getCache(path) {
      return this._cache.get(path) || null;
    }
    getFirstLinkpathDest(linkpath, sourcePath) {
      if (!this._app?.vault) return null;
      let dest = this._app.vault.getAbstractFileByPath(linkpath);
      if (dest instanceof TFile) return dest;
      dest = this._app.vault.getAbstractFileByPath(linkpath + ".md");
      if (dest instanceof TFile) return dest;
      for (const [p, f] of this._app.vault._fileCache) {
        if (f.basename === linkpath || f.name === linkpath) return f;
      }
      return null;
    }
    /**
     * Get backlinks for a note via Rust backend.
     * Returns a Promise<string[]> of paths linking to the given note.
     */
    async getBacklinksForFile(file) {
      const path = typeof file === "string" ? file : file.path;
      try {
        return await invoke("get_backlinks", { notePath: path });
      } catch (e) {
        console.warn("[MetadataCache] Failed to get backlinks via Rust:", e);
        return [];
      }
    }
    /**
     * Parse frontmatter for a note via Rust backend.
     * Returns a Promise with parsed frontmatter object.
     */
    async getFrontmatter(file) {
      const path = typeof file === "string" ? file : file.path;
      try {
        const content = await this._app.vault.read(file);
        const result = await invoke("parse_frontmatter", { content });
        return result || {};
      } catch (e) {
        console.warn("[MetadataCache] Failed to parse frontmatter via Rust:", e);
        return {};
      }
    }
    /**
     * Resolve a wikilink via Rust backend.
     * Returns a Promise<LinkTarget[]>.
     */
    async resolveLink(link) {
      try {
        return await invoke("resolve_link", { link });
      } catch (e) {
        console.warn("[MetadataCache] Failed to resolve link via Rust:", e);
        return [];
      }
    }
    _updateCache(path, metadata) {
      this._cache.set(path, metadata);
      this.trigger("changed", this._app?.vault?.getAbstractFileByPath(path), "", metadata);
    }
    _deleteCache(path) {
      this._cache.delete(path);
      this.trigger("deleted", this._app?.vault?.getAbstractFileByPath(path));
    }
  };
  var FileManager = class {
    constructor(app) {
      this._app = app;
    }
    getNewFileParent(sourcePath) {
      _stubWarn("FileManager", "getNewFileParent");
      return this._app?.vault?.getRoot() || new TFolder("");
    }
    async renameFile(file, newPath) {
      if (this._app?.vault) {
        return this._app.vault.rename(file, newPath);
      }
    }
    generateMarkdownLink(file, sourcePath, subpath, alias) {
      const path = file.path || file;
      const display = alias || file.basename || path;
      if (subpath) return `[[${path}${subpath}|${display}]]`;
      return `[[${path}|${display}]]`;
    }
    async createNewMarkdownFile(parent, name, content) {
      const path = parent && parent.path ? `${parent.path}/${name}.md` : `${name}.md`;
      if (this._app?.vault) {
        return this._app.vault.create(path, content || "");
      }
    }
    async processFrontMatter(file, fn) {
      if (!this._app?.vault) return;
      const content = await this._app.vault.read(file);
      try {
        const parsed = await invoke("parse_frontmatter", { content });
        let frontmatter = parsed && parsed.fields ? parsed.fields : {};
        fn(frontmatter);
        const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
        const result = await invoke("stringify_frontmatter", { fm: frontmatter, body });
        await this._app.vault.modify(file, result);
      } catch (e) {
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let frontmatter = {};
        if (fmMatch) {
          try {
            frontmatter = parseYaml(fmMatch[1]) || {};
          } catch {
          }
        }
        fn(frontmatter);
        const newFm = stringifyYaml(frontmatter);
        const body = fmMatch ? content.slice(fmMatch[0].length) : content;
        const newContent = `---
${newFm}---${body}`;
        await this._app.vault.modify(file, newContent);
      }
    }
  };
  var App = class {
    constructor() {
      this.keymap = new Keymap();
      this.scope = new Scope();
      this.vault = new Vault(this);
      this.workspace = new Workspace(this);
      this.metadataCache = new MetadataCache(this);
      this.fileManager = new FileManager(this);
      this.lastEvent = null;
      this.plugins = {
        enabledPlugins: /* @__PURE__ */ new Set(),
        plugins: {},
        getPlugin(id) {
          return this.plugins[id] || null;
        },
        manifests: {}
      };
      this.commands = {
        _commands: {},
        addCommand(cmd) {
          this._commands[cmd.id] = cmd;
        },
        removeCommand(id) {
          delete this._commands[id];
        },
        listCommands() {
          return Object.values(this._commands);
        },
        executeCommandById(id) {
          const cmd = this._commands[id];
          if (cmd?.callback) cmd.callback();
          else if (cmd?.checkCallback) cmd.checkCallback(false);
        }
      };
      this.setting = {
        open() {
        },
        openTabById(id) {
        }
      };
    }
    loadLocalStorage(key) {
      try {
        return localStorage.getItem(`oxidian-vault-${key}`);
      } catch {
        return null;
      }
    }
    saveLocalStorage(key, data) {
      try {
        if (data === null) localStorage.removeItem(`oxidian-vault-${key}`);
        else localStorage.setItem(`oxidian-vault-${key}`, typeof data === "string" ? data : JSON.stringify(data));
      } catch {
      }
    }
    isDarkMode() {
      return document.body.classList.contains("theme-dark") || window.matchMedia?.("(prefers-color-scheme: dark)").matches || false;
    }
  };
  var BaseComponent = class {
    constructor() {
      this.disabled = false;
    }
    then(cb) {
      cb(this);
      return this;
    }
    setDisabled(disabled) {
      this.disabled = disabled;
      return this;
    }
  };
  var ValueComponent = class extends BaseComponent {
    constructor() {
      super();
      this._value = void 0;
      this._changeCallbacks = [];
    }
    getValue() {
      return this._value;
    }
    setValue(value) {
      this._value = value;
      return this;
    }
    onChange(callback) {
      this._changeCallbacks.push(callback);
      return this;
    }
    _notifyChange() {
      for (const cb of this._changeCallbacks) {
        try {
          cb(this._value);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
  var TextComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.inputEl = document.createElement("input");
      this.inputEl.type = "text";
      this.inputEl.className = "obsidian-text-input";
      if (containerEl) containerEl.appendChild(this.inputEl);
      this.inputEl.addEventListener("input", () => {
        this._value = this.inputEl.value;
        this._notifyChange();
      });
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(value) {
      this.inputEl.value = value || "";
      this._value = value;
      return this;
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
    onChanged() {
      this._notifyChange();
    }
  };
  var TextAreaComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.inputEl = document.createElement("textarea");
      this.inputEl.className = "obsidian-textarea-input";
      if (containerEl) containerEl.appendChild(this.inputEl);
      this.inputEl.addEventListener("input", () => {
        this._value = this.inputEl.value;
        this._notifyChange();
      });
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(value) {
      this.inputEl.value = value || "";
      this._value = value;
      return this;
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
    onChanged() {
      this._notifyChange();
    }
  };
  var AbstractTextComponent = class extends ValueComponent {
    constructor(inputEl) {
      super();
      this.inputEl = inputEl;
      this.inputEl.addEventListener("input", () => {
        this._value = this.inputEl.value;
        this._notifyChange();
      });
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(value) {
      this.inputEl.value = value || "";
      this._value = value;
      return this;
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
    onChanged() {
      this._notifyChange();
    }
  };
  var ToggleComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.toggleEl = document.createElement("label");
      this.toggleEl.className = "obsidian-toggle checkbox-container";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.tabIndex = 0;
      this.toggleEl.appendChild(input);
      this._input = input;
      if (containerEl) containerEl.appendChild(this.toggleEl);
      input.addEventListener("change", () => {
        this._value = input.checked;
        this.toggleEl.classList.toggle("is-enabled", input.checked);
        this._notifyChange();
      });
    }
    getValue() {
      return this._input.checked;
    }
    setValue(value) {
      this._input.checked = !!value;
      this._value = !!value;
      this.toggleEl.classList.toggle("is-enabled", !!value);
      return this;
    }
    setDisabled(disabled) {
      this._input.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
    setTooltip(tooltip) {
      this.toggleEl.title = tooltip;
      return this;
    }
    onClick() {
      return this;
    }
  };
  var DropdownComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.selectEl = document.createElement("select");
      this.selectEl.className = "dropdown";
      if (containerEl) containerEl.appendChild(this.selectEl);
      this.selectEl.addEventListener("change", () => {
        this._value = this.selectEl.value;
        this._notifyChange();
      });
    }
    addOption(value, display) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = display;
      this.selectEl.appendChild(o);
      return this;
    }
    addOptions(options) {
      for (const [k, v] of Object.entries(options)) {
        this.addOption(k, v);
      }
      return this;
    }
    getValue() {
      return this.selectEl.value;
    }
    setValue(value) {
      this.selectEl.value = value;
      this._value = value;
      return this;
    }
    setDisabled(disabled) {
      this.selectEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var SliderComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.sliderEl = document.createElement("input");
      this.sliderEl.type = "range";
      this.sliderEl.className = "slider";
      if (containerEl) containerEl.appendChild(this.sliderEl);
      this.sliderEl.addEventListener("input", () => {
        this._value = parseFloat(this.sliderEl.value);
        this._notifyChange();
      });
    }
    getValue() {
      return parseFloat(this.sliderEl.value);
    }
    setValue(value) {
      this.sliderEl.value = String(value);
      this._value = value;
      return this;
    }
    setLimits(min, max, step) {
      this.sliderEl.min = String(min);
      this.sliderEl.max = String(max);
      this.sliderEl.step = String(step);
      return this;
    }
    setDynamicTooltip() {
      return this;
    }
    showTooltip() {
      return this;
    }
    setDisabled(disabled) {
      this.sliderEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var ButtonComponent = class extends BaseComponent {
    constructor(containerEl) {
      super();
      this.buttonEl = document.createElement("button");
      this.buttonEl.className = "obsidian-button";
      if (containerEl) containerEl.appendChild(this.buttonEl);
    }
    setButtonText(name) {
      this.buttonEl.textContent = name;
      return this;
    }
    setIcon(icon) {
      setIcon(this.buttonEl, icon);
      return this;
    }
    setCta() {
      this.buttonEl.classList.add("mod-cta");
      return this;
    }
    removeCta() {
      this.buttonEl.classList.remove("mod-cta");
      return this;
    }
    setWarning() {
      this.buttonEl.classList.add("mod-warning");
      return this;
    }
    setTooltip(tooltip, options) {
      this.buttonEl.title = tooltip;
      return this;
    }
    setClass(cls) {
      this.buttonEl.className = cls;
      return this;
    }
    setDisabled(disabled) {
      this.buttonEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
    onClick(callback) {
      this.buttonEl.addEventListener("click", callback);
      return this;
    }
  };
  var ColorComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this._inputEl = document.createElement("input");
      this._inputEl.type = "color";
      this._inputEl.className = "obsidian-color-picker";
      if (containerEl) containerEl.appendChild(this._inputEl);
      this._inputEl.addEventListener("input", () => {
        this._value = this._inputEl.value;
        this._notifyChange();
      });
    }
    getValue() {
      return this._inputEl.value;
    }
    setValue(value) {
      this._inputEl.value = value || "#000000";
      this._value = value;
      return this;
    }
    getValueRgb() {
      const hex = this.getValue().replace("#", "");
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
    getValueHsl() {
      const rgb = this.getValueRgb();
      const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    setValueRgb(rgb) {
      const hex = "#" + [rgb.r, rgb.g, rgb.b].map((c) => c.toString(16).padStart(2, "0")).join("");
      return this.setValue(hex);
    }
    setValueHsl(hsl) {
      _stubWarn("ColorComponent", "setValueHsl");
      return this;
    }
    setDisabled(disabled) {
      this._inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var SearchComponent = class extends BaseComponent {
    constructor(containerEl) {
      super();
      this.containerEl = document.createElement("div");
      this.containerEl.className = "search-input-container";
      this.inputEl = document.createElement("input");
      this.inputEl.type = "search";
      this.inputEl.placeholder = "Search...";
      this.containerEl.appendChild(this.inputEl);
      this._clearButtonEl = document.createElement("button");
      this._clearButtonEl.className = "search-input-clear-button";
      this.containerEl.appendChild(this._clearButtonEl);
      if (containerEl) containerEl.appendChild(this.containerEl);
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(value) {
      this.inputEl.value = value;
      return this;
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    onChange(callback) {
      this.inputEl.addEventListener("input", () => callback(this.inputEl.value));
      return this;
    }
    onChanged() {
    }
    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var MomentFormatComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.inputEl = document.createElement("input");
      this.inputEl.type = "text";
      this.sampleEl = document.createElement("span");
      this.sampleEl.className = "moment-format-sample";
      if (containerEl) {
        containerEl.appendChild(this.inputEl);
        containerEl.appendChild(this.sampleEl);
      }
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(value) {
      this.inputEl.value = value || "";
      return this;
    }
    setDefaultFormat(format) {
      this.inputEl.placeholder = format;
      return this;
    }
    setSampleEl(el) {
      this.sampleEl = el;
      return this;
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    setDisabled(disabled) {
      this.inputEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var ExtraButtonComponent = class extends BaseComponent {
    constructor(containerEl) {
      super();
      this.extraSettingsEl = document.createElement("button");
      this.extraSettingsEl.className = "extra-setting-button clickable-icon";
      if (containerEl) containerEl.appendChild(this.extraSettingsEl);
    }
    setIcon(icon) {
      setIcon(this.extraSettingsEl, icon);
      return this;
    }
    setTooltip(tooltip, options) {
      this.extraSettingsEl.title = tooltip;
      return this;
    }
    onClick(callback) {
      this.extraSettingsEl.addEventListener("click", callback);
      return this;
    }
    setDisabled(disabled) {
      this.extraSettingsEl.disabled = disabled;
      this.disabled = disabled;
      return this;
    }
  };
  var ProgressBarComponent = class extends ValueComponent {
    constructor(containerEl) {
      super();
      this.progressBar = document.createElement("progress");
      if (containerEl) containerEl.appendChild(this.progressBar);
    }
    getValue() {
      return this.progressBar.value;
    }
    setValue(value) {
      this.progressBar.value = value;
      return this;
    }
  };
  var Notice = class {
    constructor(message, timeout) {
      if (timeout === void 0) timeout = 5e3;
      this.noticeEl = document.createElement("div");
      this.noticeEl.className = "notice";
      if (typeof message === "string") {
        this.noticeEl.textContent = message;
      } else if (message instanceof DocumentFragment || message instanceof HTMLElement) {
        this.noticeEl.appendChild(message);
      }
      let container = document.getElementById("obsidian-notice-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "obsidian-notice-container";
        container.className = "notice-container";
        document.body.appendChild(container);
      }
      container.appendChild(this.noticeEl);
      if (timeout > 0) {
        this._timeout = setTimeout(() => this.hide(), timeout);
      }
    }
    setMessage(message) {
      if (typeof message === "string") {
        this.noticeEl.textContent = message;
      } else {
        this.noticeEl.empty?.();
        this.noticeEl.appendChild(message);
      }
      return this;
    }
    hide() {
      if (this._timeout) clearTimeout(this._timeout);
      this.noticeEl.classList.add("fade-out");
      setTimeout(() => {
        try {
          this.noticeEl.remove();
        } catch {
        }
      }, 300);
    }
  };
  var Modal = class {
    constructor(app) {
      this.app = app;
      this.scope = new Scope();
      this.containerEl = document.createElement("div");
      this.containerEl.className = "modal-container";
      this.modalEl = document.createElement("div");
      this.modalEl.className = "modal";
      this.titleEl = document.createElement("div");
      this.titleEl.className = "modal-title";
      this.contentEl = document.createElement("div");
      this.contentEl.className = "modal-content";
      this.closeButtonEl = document.createElement("div");
      this.closeButtonEl.className = "modal-close-button";
      this.closeButtonEl.addEventListener("click", () => this.close());
      this.modalEl.appendChild(this.closeButtonEl);
      this.modalEl.appendChild(this.titleEl);
      this.modalEl.appendChild(this.contentEl);
      this.containerEl.appendChild(this.modalEl);
      this.shouldRestoreSelection = false;
      this.containerEl.addEventListener("click", (e) => {
        if (e.target === this.containerEl) this.close();
      });
    }
    open() {
      document.body.appendChild(this.containerEl);
      document.body.classList.add("modal-open");
      this.onOpen();
    }
    close() {
      this.onClose();
      try {
        this.containerEl.remove();
      } catch {
      }
      document.body.classList.remove("modal-open");
    }
    onOpen() {
    }
    onClose() {
    }
    setTitle(title) {
      this.titleEl.textContent = title;
      return this;
    }
  };
  var PopoverSuggest = class {
    constructor(app, scope) {
      this.app = app;
      this.scope = scope || new Scope();
      this.suggestEl = document.createElement("div");
      this.suggestEl.className = "suggestion-container";
    }
    open() {
      document.body.appendChild(this.suggestEl);
    }
    close() {
      try {
        this.suggestEl.remove();
      } catch {
      }
    }
    renderSuggestion(value, el) {
      el.textContent = String(value);
    }
    selectSuggestion(value, evt) {
    }
  };
  var AbstractInputSuggest = class extends PopoverSuggest {
    constructor(app, textInputEl) {
      super(app);
      this.textInputEl = textInputEl;
      this.limit = 100;
    }
    setValue(value) {
      if (this.textInputEl) this.textInputEl.value = value;
    }
    getValue() {
      return this.textInputEl ? this.textInputEl.value : "";
    }
    getSuggestions(query) {
      return [];
    }
    selectSuggestion(value, evt) {
    }
    onSelect(callback) {
      this._onSelectCb = callback;
      return this;
    }
  };
  var SuggestModal = class extends Modal {
    constructor(app) {
      super(app);
      this.limit = 100;
      this.emptyStateText = "No results found.";
      this.inputEl = document.createElement("input");
      this.inputEl.type = "text";
      this.inputEl.className = "prompt-input";
      this.inputEl.placeholder = "";
      this.resultContainerEl = document.createElement("div");
      this.resultContainerEl.className = "prompt-results";
      this.modalEl.innerHTML = "";
      this.modalEl.appendChild(this.inputEl);
      this.modalEl.appendChild(this.resultContainerEl);
      this.modalEl.classList.add("mod-suggestion");
      this.inputEl.addEventListener("input", () => this._updateSuggestions());
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.close();
        if (e.key === "Enter") {
          const selected = this.resultContainerEl.querySelector(".is-selected");
          if (selected && selected._item !== void 0) {
            this.onChooseSuggestion(selected._item, e);
            this.close();
          }
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const items = Array.from(this.resultContainerEl.children);
          const current = items.findIndex((el) => el.classList.contains("is-selected"));
          const next = e.key === "ArrowDown" ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
          items.forEach((el, i) => el.classList.toggle("is-selected", i === next));
          items[next]?.scrollIntoView({ block: "nearest" });
        }
      });
    }
    getSuggestions(query) {
      return [];
    }
    renderSuggestion(item, el) {
      el.textContent = String(item);
    }
    onChooseSuggestion(item, evt) {
    }
    setPlaceholder(placeholder) {
      this.inputEl.placeholder = placeholder;
      return this;
    }
    setInstructions(instructions) {
      _stubWarn("SuggestModal", "setInstructions");
      return this;
    }
    _updateSuggestions() {
      const query = this.inputEl.value;
      const rawItems = this.getSuggestions(query);
      const doRender = (items) => {
        this.resultContainerEl.innerHTML = "";
        if (!items || items.length === 0) {
          const empty = document.createElement("div");
          empty.className = "suggestion-empty";
          empty.textContent = this.emptyStateText;
          this.resultContainerEl.appendChild(empty);
          return;
        }
        for (let i = 0; i < Math.min(items.length, this.limit || 100); i++) {
          const el = document.createElement("div");
          el.className = "suggestion-item" + (i === 0 ? " is-selected" : "");
          el._item = items[i];
          this.renderSuggestion(items[i], el);
          el.addEventListener("click", (e) => {
            this.onChooseSuggestion(items[i], e);
            this.close();
          });
          el.addEventListener("mouseenter", () => {
            this.resultContainerEl.querySelectorAll(".suggestion-item").forEach((s) => s.classList.remove("is-selected"));
            el.classList.add("is-selected");
          });
          this.resultContainerEl.appendChild(el);
        }
      };
      if (rawItems instanceof Promise) {
        rawItems.then(doRender);
      } else {
        doRender(rawItems);
      }
    }
    open() {
      super.open();
      this.inputEl.focus();
      this._updateSuggestions();
    }
  };
  var FuzzySuggestModal = class extends SuggestModal {
    constructor(app) {
      super(app);
    }
    getItems() {
      return [];
    }
    getItemText(item) {
      return String(item);
    }
    onChooseItem(item, evt) {
    }
    getSuggestions(query) {
      const items = this.getItems();
      if (!query) return items.map((item) => ({ item, match: null }));
      const lq = query.toLowerCase();
      return items.filter((item) => this.getItemText(item).toLowerCase().includes(lq)).map((item) => ({ item, match: fuzzySearch(prepareQuery(query), this.getItemText(item)) }));
    }
    renderSuggestion(result, el) {
      el.textContent = this.getItemText(result.item || result);
    }
    onChooseSuggestion(result, evt) {
      this.onChooseItem(result.item || result, evt);
    }
  };
  var EditorSuggest = class extends PopoverSuggest {
    constructor(app) {
      super(app);
      this.context = null;
      this.limit = 20;
    }
    onTrigger(cursor, editor, file) {
      return null;
    }
    getSuggestions(context) {
      return [];
    }
    renderSuggestion(suggestion, el) {
      el.textContent = String(suggestion);
    }
    selectSuggestion(suggestion, evt) {
    }
  };
  var Menu = class extends Component {
    constructor() {
      super();
      this.items = [];
      this.dom = document.createElement("div");
      this.dom.className = "menu";
      this._onHide = null;
    }
    addItem(callback) {
      const item = new MenuItem();
      callback(item);
      this.items.push(item);
      return this;
    }
    addSeparator() {
      const sep = { _separator: true, dom: document.createElement("div") };
      sep.dom.className = "menu-separator";
      this.items.push(sep);
      return this;
    }
    showAtMouseEvent(event) {
      return this.showAtPosition({ x: event.clientX || event.pageX, y: event.clientY || event.pageY });
    }
    showAtPosition(position) {
      this.dom.innerHTML = "";
      for (const item of this.items) {
        if (item._separator) {
          this.dom.appendChild(item.dom);
        } else {
          this.dom.appendChild(item._render());
        }
      }
      this.dom.style.position = "fixed";
      this.dom.style.left = (position.x || 0) + "px";
      this.dom.style.top = (position.y || 0) + "px";
      this.dom.style.zIndex = "9999";
      document.body.appendChild(this.dom);
      const close = (e) => {
        if (!this.dom.contains(e.target)) {
          this.hide();
          document.removeEventListener("click", close, true);
        }
      };
      setTimeout(() => document.addEventListener("click", close, true), 0);
      return this;
    }
    hide() {
      try {
        this.dom.remove();
      } catch {
      }
      if (this._onHide) this._onHide();
    }
    close() {
      this.hide();
    }
    onHide(callback) {
      this._onHide = callback;
    }
  };
  var MenuItem = class {
    constructor() {
      this._title = "";
      this._icon = "";
      this._callback = null;
      this._checked = false;
      this._disabled = false;
      this._isLabel = false;
      this._section = "";
      this._submenu = null;
    }
    setTitle(title) {
      this._title = title;
      return this;
    }
    setIcon(icon) {
      this._icon = icon;
      return this;
    }
    onClick(callback) {
      this._callback = callback;
      return this;
    }
    setChecked(checked) {
      this._checked = checked;
      return this;
    }
    setDisabled(disabled) {
      this._disabled = disabled;
      return this;
    }
    setIsLabel(isLabel) {
      this._isLabel = isLabel;
      return this;
    }
    setSection(section) {
      this._section = section;
      return this;
    }
    setSubmenu() {
      this._submenu = new Menu();
      return this._submenu;
    }
    _render() {
      const el = document.createElement("div");
      el.className = "menu-item" + (this._disabled ? " is-disabled" : "") + (this._isLabel ? " is-label" : "");
      if (this._icon) {
        const iconEl = document.createElement("span");
        iconEl.className = "menu-item-icon";
        setIcon(iconEl, this._icon);
        el.appendChild(iconEl);
      }
      const titleEl = document.createElement("span");
      titleEl.className = "menu-item-title";
      titleEl.textContent = this._title;
      el.appendChild(titleEl);
      if (this._checked) {
        const checkEl = document.createElement("span");
        checkEl.className = "menu-item-check";
        checkEl.textContent = "\u2713";
        el.appendChild(checkEl);
      }
      if (this._callback && !this._disabled) {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._callback(e);
          const menu = el.closest(".menu");
          if (menu) try {
            menu.remove();
          } catch {
          }
        });
      }
      return el;
    }
  };
  var Setting = class {
    constructor(containerEl) {
      this.settingEl = document.createElement("div");
      this.settingEl.className = "setting-item";
      this.infoEl = document.createElement("div");
      this.infoEl.className = "setting-item-info";
      this.controlEl = document.createElement("div");
      this.controlEl.className = "setting-item-control";
      this.nameEl = document.createElement("div");
      this.nameEl.className = "setting-item-name";
      this.descEl = document.createElement("div");
      this.descEl.className = "setting-item-description";
      this.infoEl.appendChild(this.nameEl);
      this.infoEl.appendChild(this.descEl);
      this.settingEl.appendChild(this.infoEl);
      this.settingEl.appendChild(this.controlEl);
      if (containerEl) containerEl.appendChild(this.settingEl);
      this._components = [];
    }
    setName(name) {
      if (typeof name === "string") this.nameEl.textContent = name;
      else {
        this.nameEl.innerHTML = "";
        this.nameEl.appendChild(name);
      }
      return this;
    }
    setDesc(desc) {
      if (typeof desc === "string") {
        this.descEl.textContent = desc;
      } else if (desc instanceof DocumentFragment || desc instanceof HTMLElement) {
        this.descEl.innerHTML = "";
        this.descEl.appendChild(desc);
      }
      return this;
    }
    setTooltip(tooltip) {
      this.settingEl.title = tooltip;
      return this;
    }
    setHeading() {
      this.settingEl.classList.add("setting-item-heading");
      return this;
    }
    setClass(cls) {
      this.settingEl.classList.add(cls);
      return this;
    }
    setDisabled(disabled) {
      this.settingEl.classList.toggle("is-disabled", disabled);
      return this;
    }
    addText(callback) {
      const comp = new TextComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addTextArea(callback) {
      const comp = new TextAreaComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addToggle(callback) {
      const comp = new ToggleComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addDropdown(callback) {
      const comp = new DropdownComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addSlider(callback) {
      const comp = new SliderComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addButton(callback) {
      const comp = new ButtonComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addColorPicker(callback) {
      const comp = new ColorComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addSearch(callback) {
      const comp = new SearchComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addMomentFormat(callback) {
      const comp = new MomentFormatComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addExtraButton(callback) {
      const comp = new ExtraButtonComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    addProgressBar(callback) {
      const comp = new ProgressBarComponent(this.controlEl);
      this._components.push(comp);
      callback(comp);
      return this;
    }
    then(cb) {
      cb(this);
      return this;
    }
    clear() {
      this.controlEl.innerHTML = "";
      this._components = [];
      return this;
    }
  };
  var SettingTab = class {
    constructor(app) {
      this.app = app;
      this.containerEl = document.createElement("div");
      this.containerEl.className = "vertical-tab-content";
    }
    display() {
    }
    hide() {
      this.containerEl.innerHTML = "";
    }
  };
  var PluginSettingTab = class extends SettingTab {
    constructor(app, plugin) {
      super(app);
      this.plugin = plugin;
    }
  };
  var Plugin = class extends Component {
    constructor(app, manifest) {
      super();
      this.app = app;
      this.manifest = manifest || { id: "", name: "", version: "0.0.0", minAppVersion: "0.0.0", author: "", description: "" };
      this._commands = [];
      this._settingTabs = [];
      this._ribbonIcons = [];
      this._views = {};
      this._postProcessors = [];
      this._stylesheets = [];
      this._statusBarItems = [];
      this._editorExtensions = [];
    }
    addCommand(command) {
      const fullId = `${this.manifest.id}:${command.id}`;
      const cmd = { ...command, id: fullId, _pluginId: this.manifest.id };
      if (cmd.editorCheckCallback && !cmd.callback && !cmd.checkCallback) {
        const origECC = cmd.editorCheckCallback;
        cmd.checkCallback = (checking) => {
          const leaf = this.app?.workspace?.activeLeaf;
          const view = leaf?.view;
          if (view instanceof MarkdownView) {
            return origECC(checking, view.editor, view);
          }
          return false;
        };
      } else if (cmd.editorCallback && !cmd.callback && !cmd.checkCallback) {
        const origEC = cmd.editorCallback;
        cmd.checkCallback = (checking) => {
          const leaf = this.app?.workspace?.activeLeaf;
          const view = leaf?.view;
          if (view instanceof MarkdownView) {
            if (!checking) origEC(view.editor, view);
            return true;
          }
          return false;
        };
      }
      this._commands.push(cmd);
      if (window._oxidianPluginRegistry) {
        window._oxidianPluginRegistry.registerCommand(cmd);
      }
      return cmd;
    }
    addRibbonIcon(icon, title, callback) {
      const el = document.createElement("button");
      el.className = "side-dock-ribbon-action clickable-icon";
      el.setAttribute("aria-label", title);
      el.title = title;
      setIcon(el, icon);
      el.addEventListener("click", callback);
      this._ribbonIcons.push(el);
      const ribbonTop = document.querySelector("#ribbon .ribbon-top");
      if (ribbonTop) ribbonTop.appendChild(el);
      return el;
    }
    addStatusBarItem() {
      const el = document.createElement("span");
      el.className = "status-bar-item plugin-status-bar-item";
      const statusBar = document.getElementById("statusbar");
      const statusRight = statusBar?.querySelector(".status-right");
      if (statusRight) statusRight.appendChild(el);
      this._statusBarItems.push(el);
      return el;
    }
    addSettingTab(tab) {
      this._settingTabs.push(tab);
      if (window._oxidianPluginRegistry) {
        window._oxidianPluginRegistry.registerSettingTab(this.manifest.id, tab);
      }
      return tab;
    }
    registerView(type, viewCreator) {
      this._views[type] = viewCreator;
    }
    registerMarkdownPostProcessor(postProcessor, sortOrder) {
      postProcessor.sortOrder = sortOrder || 0;
      this._postProcessors.push(postProcessor);
      if (window._oxidianPluginRegistry) {
        window._oxidianPluginRegistry.registerPostProcessor(postProcessor);
      }
      return postProcessor;
    }
    registerMarkdownCodeBlockProcessor(language, handler, sortOrder) {
      const pp = (el, ctx) => {
        const codeBlocks = el.querySelectorAll(`code.language-${language}`);
        for (const block of codeBlocks) {
          const pre = block.parentElement;
          if (pre && pre.tagName === "PRE") {
            const container = document.createElement("div");
            pre.replaceWith(container);
            handler(block.textContent || "", container, ctx);
          }
        }
      };
      return this.registerMarkdownPostProcessor(pp, sortOrder);
    }
    registerCodeMirror(callback) {
      _stubWarn("Plugin", "registerCodeMirror");
    }
    registerEditorExtension(extension) {
      this._editorExtensions.push(extension);
    }
    registerObsidianProtocolHandler(action, handler) {
      _stubWarn("Plugin", "registerObsidianProtocolHandler");
    }
    registerEditorSuggest(suggest) {
      _stubWarn("Plugin", "registerEditorSuggest");
    }
    registerHoverLinkSource(id, info) {
      if (window._oxidianPluginRegistry) {
        window._oxidianPluginRegistry.registerHoverLinkSource(id, info);
      }
      return { id, info };
    }
    async loadData() {
      try {
        const data = await invoke("get_plugin_settings", { pluginId: this.manifest.id });
        if (data && typeof data === "object" && Object.keys(data).length === 0) return null;
        return data;
      } catch {
        try {
          const raw = await invoke("get_plugin_data", { pluginId: this.manifest.id });
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      }
    }
    async saveData(data) {
      try {
        await invoke("save_plugin_settings", {
          pluginId: this.manifest.id,
          settings: data
        });
      } catch {
        try {
          await invoke("save_plugin_data", {
            pluginId: this.manifest.id,
            data: JSON.stringify(data, null, 2)
          });
        } catch (e) {
          console.error(`Failed to save plugin data for ${this.manifest.id}:`, e);
        }
      }
    }
    // Override unload to clean up plugin resources
    onunload() {
    }
    _unload() {
      try {
        this.onunload();
      } catch (e) {
        console.error("Plugin onunload error:", e);
      }
      for (const cmd of this._commands) {
        if (window._oxidianPluginRegistry) {
          window._oxidianPluginRegistry.unregisterCommand(cmd.id);
        }
      }
      for (const el of this._ribbonIcons) {
        try {
          el.remove();
        } catch {
        }
      }
      for (const el of this._statusBarItems) {
        try {
          el.remove();
        } catch {
        }
      }
      for (const el of this._stylesheets) {
        try {
          el.remove();
        } catch {
        }
      }
      this._commands = [];
      this._settingTabs = [];
      this._ribbonIcons = [];
      this._postProcessors = [];
      this._statusBarItems = [];
      this._stylesheets = [];
      this._editorExtensions = [];
      this.unload();
    }
  };
  var MarkdownRenderChild = class extends Component {
    constructor(containerEl) {
      super();
      this.containerEl = containerEl;
    }
  };
  var MarkdownRenderer = class _MarkdownRenderer {
    static async render(app, markdown2, el, sourcePath, component) {
      try {
        const html = await invoke("render_markdown", { content: markdown2 });
        el.innerHTML = html;
      } catch {
        el.textContent = markdown2;
      }
      if (component && component instanceof Component) {
      }
    }
    static async renderMarkdown(markdown2, el, sourcePath, component) {
      return _MarkdownRenderer.render(null, markdown2, el, sourcePath, component);
    }
  };
  var MarkdownPreviewRenderer = class {
    static registerPostProcessor(postProcessor, sortOrder) {
      if (window._oxidianPluginRegistry) {
        window._oxidianPluginRegistry.registerPostProcessor(postProcessor);
      }
    }
  };
  var Platform = {
    isDesktop: true,
    isDesktopApp: true,
    isMobile: false,
    isMobileApp: false,
    isIosApp: false,
    isAndroidApp: false,
    isMacOS: typeof navigator !== "undefined" && navigator.platform?.includes("Mac"),
    isWin: typeof navigator !== "undefined" && navigator.platform?.includes("Win"),
    isLinux: typeof navigator !== "undefined" && navigator.platform?.includes("Linux"),
    isSafari: false,
    isPhone: false,
    isTablet: false
  };
  var _builtinIcons = {
    "circle": '<circle cx="12" cy="12" r="10"/>',
    "file-text": '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    "folder": '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
    "settings": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    "search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    "plus": '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    "x": '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    "check": '<polyline points="20 6 9 17 4 12"/>',
    "chevron-right": '<polyline points="9 18 15 12 9 6"/>',
    "chevron-down": '<polyline points="6 9 12 15 18 9"/>',
    "trash": '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    "edit": '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    "copy": '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "link": '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
    "eye": '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    "info": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    "alert-triangle": '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "refresh-cw": '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    "calendar": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    "vault": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="14" r="2"/><path d="M12 12v-4"/>'
  };
  if (!window._oxidianCustomIcons) window._oxidianCustomIcons = {};
  function setIcon(el, iconId) {
    if (!el || !iconId) return;
    const custom = window._oxidianCustomIcons[iconId];
    if (custom) {
      el.innerHTML = custom.startsWith("<svg") ? custom : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${custom}</svg>`;
      return;
    }
    const builtin = _builtinIcons[iconId];
    if (builtin) {
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${builtin}</svg>`;
    } else {
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
    }
  }
  function addIcon(iconId, svgContent) {
    window._oxidianCustomIcons[iconId] = svgContent;
  }
  function getIcon(iconId) {
    const el = document.createElement("span");
    setIcon(el, iconId);
    return el.firstChild || el;
  }
  function getIconIds() {
    const builtinIds = Object.keys(_builtinIcons);
    const customIds = Object.keys(window._oxidianCustomIcons || {});
    return [.../* @__PURE__ */ new Set([...builtinIds, ...customIds])];
  }
  function normalizePath(path) {
    if (!path) return "";
    return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "").replace(/^\.\//, "");
  }
  function debounce(func, wait, resetTimer) {
    let timeout;
    const debounced = function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = void 0;
        func.apply(this, args);
      }, wait);
    };
    debounced.cancel = () => {
      clearTimeout(timeout);
      timeout = void 0;
    };
    return debounced;
  }
  function parseLinktext(linktext) {
    if (!linktext) return { path: "", subpath: "" };
    const hashIndex = linktext.indexOf("#");
    if (hashIndex < 0) return { path: linktext, subpath: "" };
    return { path: linktext.substring(0, hashIndex), subpath: linktext.substring(hashIndex) };
  }
  function getLinkpath(linktext) {
    return parseLinktext(linktext).path;
  }
  function stripHeading(heading) {
    return heading.replace(/^#+\s*/, "");
  }
  function stripHeadingForLink(heading) {
    return stripHeading(heading).replace(/[^\w\s-]/g, "").trim();
  }
  function parseFrontMatterStringArray(frontmatter, key) {
    if (!frontmatter || !key) return null;
    const val = frontmatter[key];
    if (!val) return null;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return null;
  }
  function parseFrontMatterTags(frontmatter) {
    if (!frontmatter) return null;
    const tags = parseFrontMatterStringArray(frontmatter, "tags") || parseFrontMatterStringArray(frontmatter, "tag");
    if (!tags) return null;
    return tags.map((t) => t.startsWith("#") ? t : "#" + t);
  }
  function parseFrontMatterAliases(frontmatter) {
    if (!frontmatter) return null;
    return parseFrontMatterStringArray(frontmatter, "aliases") || parseFrontMatterStringArray(frontmatter, "alias");
  }
  function parseYaml(yaml) {
    if (!yaml || !yaml.trim()) return {};
    const result = {};
    const lines = yaml.split("\n");
    let currentKey = null;
    let currentList = null;
    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const listMatch = trimmed.match(/^(\s+)-\s*(.*)/);
      if (listMatch && currentKey) {
        if (!currentList) {
          currentList = [];
          result[currentKey] = currentList;
        }
        let val = listMatch[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        currentList.push(val);
        continue;
      }
      const kvMatch = trimmed.match(/^([^:]+):\s*(.*)/);
      if (kvMatch) {
        currentKey = kvMatch[1].trim();
        let val = kvMatch[2].trim();
        currentList = null;
        if (!val) {
          result[currentKey] = null;
          continue;
        }
        if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        if (val === "true") {
          result[currentKey] = true;
          continue;
        }
        if (val === "false") {
          result[currentKey] = false;
          continue;
        }
        if (val === "null") {
          result[currentKey] = null;
          continue;
        }
        const num = Number(val);
        if (!isNaN(num) && val !== "") {
          result[currentKey] = num;
          continue;
        }
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            result[currentKey] = JSON.parse(val);
          } catch {
            result[currentKey] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
          }
          continue;
        }
        result[currentKey] = val;
      }
    }
    return result;
  }
  function stringifyYaml(obj) {
    if (!obj || typeof obj !== "object") return "";
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === void 0) {
        lines.push(`${key}:`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${key}: []`);
        } else {
          lines.push(`${key}:`);
          for (const item of value) {
            lines.push(`  - ${typeof item === "string" && item.includes(":") ? `"${item}"` : item}`);
          }
        }
      } else if (typeof value === "object") {
        lines.push(`${key}:`);
        for (const [k2, v2] of Object.entries(value)) {
          lines.push(`  ${k2}: ${v2}`);
        }
      } else if (typeof value === "string" && (value.includes(":") || value.includes("#") || value.includes('"'))) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    return lines.join("\n") + "\n";
  }
  function moment(date) {
    const d = date instanceof Date ? date : date ? new Date(date) : /* @__PURE__ */ new Date();
    if (isNaN(d.getTime())) {
      const invalid = {
        format() {
          return "Invalid date";
        },
        toDate() {
          return d;
        },
        valueOf() {
          return NaN;
        },
        isValid() {
          return false;
        },
        isSame() {
          return false;
        },
        isBefore() {
          return false;
        },
        isAfter() {
          return false;
        },
        add() {
          return invalid;
        },
        subtract() {
          return invalid;
        },
        startOf() {
          return invalid;
        },
        endOf() {
          return invalid;
        },
        clone() {
          return invalid;
        },
        unix() {
          return NaN;
        },
        toISOString() {
          return "";
        },
        locale() {
          return invalid;
        },
        diff() {
          return NaN;
        }
      };
      return invalid;
    }
    const obj = {
      _d: d,
      format(fmt) {
        if (!fmt) return d.toISOString();
        const tokens = {
          "YYYY": () => String(d.getFullYear()),
          "YY": () => String(d.getFullYear()).slice(-2),
          "MMMM": () => d.toLocaleDateString("en", { month: "long" }),
          "MMM": () => d.toLocaleDateString("en", { month: "short" }),
          "MM": () => String(d.getMonth() + 1).padStart(2, "0"),
          "M": () => String(d.getMonth() + 1),
          "dddd": () => d.toLocaleDateString("en", { weekday: "long" }),
          "ddd": () => d.toLocaleDateString("en", { weekday: "short" }),
          "dd": () => d.toLocaleDateString("en", { weekday: "narrow" }),
          "DD": () => String(d.getDate()).padStart(2, "0"),
          "Do": () => String(d.getDate()) + (["th", "st", "nd", "rd"][(d.getDate() % 100 - 20) % 10] || ["th", "st", "nd", "rd"][d.getDate() % 100] || "th"),
          "D": () => String(d.getDate()),
          "HH": () => String(d.getHours()).padStart(2, "0"),
          "H": () => String(d.getHours()),
          "hh": () => String(d.getHours() % 12 || 12).padStart(2, "0"),
          "h": () => String(d.getHours() % 12 || 12),
          "mm": () => String(d.getMinutes()).padStart(2, "0"),
          "ss": () => String(d.getSeconds()).padStart(2, "0"),
          "A": () => d.getHours() >= 12 ? "PM" : "AM",
          "a": () => d.getHours() >= 12 ? "pm" : "am",
          "X": () => String(Math.floor(d.getTime() / 1e3)),
          "x": () => String(d.getTime())
        };
        const tokenPattern = Object.keys(tokens).sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
        const re = new RegExp(tokenPattern, "g");
        return fmt.replace(re, (match) => tokens[match]());
      },
      toDate() {
        return new Date(d);
      },
      valueOf() {
        return d.getTime();
      },
      unix() {
        return Math.floor(d.getTime() / 1e3);
      },
      toISOString() {
        return d.toISOString();
      },
      isValid() {
        return true;
      },
      isSame(other, unit) {
        const o = other instanceof Date ? other : new Date(other?._d || other);
        if (unit === "day" || unit === "date") return d.toDateString() === o.toDateString();
        if (unit === "month") return d.getFullYear() === o.getFullYear() && d.getMonth() === o.getMonth();
        if (unit === "year") return d.getFullYear() === o.getFullYear();
        return d.getTime() === o.getTime();
      },
      isBefore(other, unit) {
        const o = other instanceof Date ? other : new Date(other?._d || other);
        if (unit === "day") return d.toDateString() < o.toDateString();
        return d < o;
      },
      isAfter(other, unit) {
        const o = other instanceof Date ? other : new Date(other?._d || other);
        if (unit === "day") return d.toDateString() > o.toDateString();
        return d > o;
      },
      diff(other, unit) {
        const o = other instanceof Date ? other : new Date(other?._d || other);
        const ms = d.getTime() - o.getTime();
        if (unit === "days" || unit === "day") return Math.floor(ms / 864e5);
        if (unit === "hours" || unit === "hour") return Math.floor(ms / 36e5);
        if (unit === "minutes" || unit === "minute") return Math.floor(ms / 6e4);
        if (unit === "seconds" || unit === "second") return Math.floor(ms / 1e3);
        if (unit === "months" || unit === "month") return (d.getFullYear() - o.getFullYear()) * 12 + (d.getMonth() - o.getMonth());
        if (unit === "years" || unit === "year") return d.getFullYear() - o.getFullYear();
        return ms;
      },
      add(n, unit) {
        const nd = new Date(d);
        if (unit === "days" || unit === "day" || unit === "d") nd.setDate(nd.getDate() + n);
        else if (unit === "months" || unit === "month" || unit === "M") nd.setMonth(nd.getMonth() + n);
        else if (unit === "years" || unit === "year" || unit === "y") nd.setFullYear(nd.getFullYear() + n);
        else if (unit === "hours" || unit === "hour" || unit === "h") nd.setHours(nd.getHours() + n);
        else if (unit === "minutes" || unit === "minute" || unit === "m") nd.setMinutes(nd.getMinutes() + n);
        else if (unit === "seconds" || unit === "second" || unit === "s") nd.setSeconds(nd.getSeconds() + n);
        else if (unit === "weeks" || unit === "week" || unit === "w") nd.setDate(nd.getDate() + n * 7);
        else nd.setDate(nd.getDate() + n);
        return moment(nd);
      },
      subtract(n, unit) {
        return obj.add(-n, unit);
      },
      startOf(unit) {
        if (unit === "day" || unit === "date") return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        if (unit === "month") return moment(new Date(d.getFullYear(), d.getMonth(), 1));
        if (unit === "year") return moment(new Date(d.getFullYear(), 0, 1));
        if (unit === "week") {
          const day = d.getDay();
          const nd = new Date(d);
          nd.setDate(nd.getDate() - day);
          return moment(new Date(nd.getFullYear(), nd.getMonth(), nd.getDate()));
        }
        if (unit === "hour") return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()));
        if (unit === "minute") return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
        return moment(new Date(d));
      },
      endOf(unit) {
        if (unit === "day" || unit === "date") return moment(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
        if (unit === "month") return moment(new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999));
        if (unit === "year") return moment(new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999));
        if (unit === "week") {
          const day = d.getDay();
          const nd = new Date(d);
          nd.setDate(nd.getDate() + (6 - day));
          return moment(new Date(nd.getFullYear(), nd.getMonth(), nd.getDate(), 23, 59, 59, 999));
        }
        return moment(new Date(d));
      },
      clone() {
        return moment(new Date(d));
      },
      locale(loc) {
        return obj;
      },
      year() {
        return d.getFullYear();
      },
      month() {
        return d.getMonth();
      },
      date() {
        return d.getDate();
      },
      day() {
        return d.getDay();
      },
      hour() {
        return d.getHours();
      },
      minute() {
        return d.getMinutes();
      },
      second() {
        return d.getSeconds();
      },
      millisecond() {
        return d.getMilliseconds();
      },
      toString() {
        return d.toString();
      }
    };
    return obj;
  }
  moment.now = () => Date.now();
  moment.unix = (timestamp) => moment(new Date(timestamp * 1e3));
  moment.duration = (value, unit) => {
    let ms = value;
    if (unit === "seconds" || unit === "second" || unit === "s") ms = value * 1e3;
    if (unit === "minutes" || unit === "minute" || unit === "m") ms = value * 6e4;
    if (unit === "hours" || unit === "hour" || unit === "h") ms = value * 36e5;
    if (unit === "days" || unit === "day" || unit === "d") ms = value * 864e5;
    return {
      asMilliseconds() {
        return ms;
      },
      asSeconds() {
        return ms / 1e3;
      },
      asMinutes() {
        return ms / 6e4;
      },
      asHours() {
        return ms / 36e5;
      },
      asDays() {
        return ms / 864e5;
      },
      humanize() {
        return `${Math.round(ms / 1e3)} seconds`;
      }
    };
  };
  moment.locale = () => "en";
  moment.isMoment = (obj) => obj && typeof obj.format === "function" && typeof obj.toDate === "function";
  async function requestUrl(urlOrOptions) {
    const opts = typeof urlOrOptions === "string" ? { url: urlOrOptions } : { ...urlOrOptions };
    const fetchOpts = {
      method: opts.method || "GET",
      headers: opts.headers || {}
    };
    if (opts.body) fetchOpts.body = opts.body;
    if (opts.contentType && fetchOpts.headers) {
      fetchOpts.headers["Content-Type"] = opts.contentType;
    }
    const response = await fetch(opts.url, fetchOpts);
    const arrayBuffer = await response.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    let json;
    try {
      json = JSON.parse(text);
    } catch {
    }
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text,
      json,
      arrayBuffer
    };
  }
  async function request(urlOrOptions) {
    const result = await requestUrl(urlOrOptions);
    return result.text;
  }
  function sanitizeHTMLToDom(html) {
    const template = document.createElement("template");
    template.innerHTML = (html || "").trim();
    return template.content;
  }
  function htmlToMarkdown(html) {
    return (html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<p[^>]*>/gi, "").replace(/<strong>(.*?)<\/strong>/gi, "**$1**").replace(/<b>(.*?)<\/b>/gi, "**$1**").replace(/<em>(.*?)<\/em>/gi, "*$1*").replace(/<i>(.*?)<\/i>/gi, "*$1*").replace(/<code>(.*?)<\/code>/gi, "`$1`").replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)").replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi, (_, level, text) => "#".repeat(Number(level)) + " " + text + "\n").replace(/<li>(.*?)<\/li>/gi, "- $1\n").replace(/<[^>]+>/g, "").trim();
  }
  function hexToArrayBuffer(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  }
  function arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  function prepareQuery(query) {
    if (!query) return { query: "", tokens: [], fuzzy: [] };
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return { query: query.toLowerCase(), tokens, fuzzy: tokens };
  }
  function fuzzySearch(preparedQuery, text) {
    if (!preparedQuery || !text) return null;
    const query = typeof preparedQuery === "string" ? preparedQuery.toLowerCase() : preparedQuery.query;
    if (!query) return { score: 0, matches: [] };
    const lowerText = text.toLowerCase();
    const matches = [];
    let score = 0;
    const idx = lowerText.indexOf(query);
    if (idx >= 0) {
      matches.push([idx, idx + query.length]);
      score = query.length / text.length;
      if (idx === 0) score += 0.1;
      return { score, matches };
    }
    let qi = 0;
    let consecutive = 0;
    for (let ti = 0; ti < lowerText.length && qi < query.length; ti++) {
      if (lowerText[ti] === query[qi]) {
        const start = ti;
        while (ti < lowerText.length && qi < query.length && lowerText[ti] === query[qi]) {
          ti++;
          qi++;
          consecutive++;
        }
        matches.push([start, ti]);
        ti--;
      } else {
        consecutive = 0;
      }
    }
    if (qi < query.length) return null;
    score = qi / text.length * 0.5 + consecutive / query.length * 0.5;
    return { score, matches };
  }
  function prepareFuzzySearch(query) {
    const prepared = prepareQuery(query);
    return (text) => fuzzySearch(prepared, text);
  }
  function sortSearchResults(results) {
    results.sort((a, b) => (b.score || b.match?.score || 0) - (a.score || a.match?.score || 0));
  }
  function renderResults(el, text, result) {
    if (!result || !result.matches || result.matches.length === 0) {
      el.textContent = text;
      return;
    }
    renderMatches(el, text, result.matches);
  }
  function renderMatches(el, text, matches) {
    if (!matches || matches.length === 0) {
      el.textContent = text;
      return;
    }
    el.innerHTML = "";
    let lastEnd = 0;
    for (const [start, end] of matches) {
      if (start > lastEnd) {
        el.appendChild(document.createTextNode(text.substring(lastEnd, start)));
      }
      const highlight = document.createElement("span");
      highlight.className = "suggestion-highlight";
      highlight.textContent = text.substring(start, end);
      el.appendChild(highlight);
      lastEnd = end;
    }
    if (lastEnd < text.length) {
      el.appendChild(document.createTextNode(text.substring(lastEnd)));
    }
  }
  function iterateCacheRefs(cache, cb) {
    if (!cache) return;
    if (cache.links) for (const link of cache.links) cb(link);
    if (cache.embeds) for (const embed of cache.embeds) cb(embed);
  }
  function getAllTags(cache) {
    if (!cache) return [];
    const tags = [];
    if (cache.tags) {
      for (const t of cache.tags) tags.push(t.tag);
    }
    if (cache.frontmatter) {
      const fmTags = parseFrontMatterTags(cache.frontmatter);
      if (fmTags) tags.push(...fmTags);
    }
    return tags;
  }
  function resolveSubpath(cache, subpath) {
    if (!cache || !subpath) return null;
    if (subpath.startsWith("#^")) {
      const blockId = subpath.substring(2);
      if (cache.blocks && cache.blocks[blockId]) {
        return { type: "block", block: cache.blocks[blockId], start: cache.blocks[blockId].position, end: null };
      }
    }
    if (subpath.startsWith("#")) {
      const heading = subpath.substring(1);
      if (cache.headings) {
        for (const h of cache.headings) {
          if (h.heading === heading) {
            return { type: "heading", current: h, start: h.position, end: null };
          }
        }
      }
    }
    return null;
  }
  var HoverPopover = class extends Component {
    constructor(parent, targetEl, waitTime) {
      super();
      this.parent = parent;
      this.targetEl = targetEl;
      this.hoverEl = document.createElement("div");
      this.hoverEl.className = "hover-popover";
      this.state = 0;
    }
  };
  HoverPopover.forParent = function(parent) {
    return null;
  };
  var MarkdownSourceView = class {
    constructor() {
      this.cmEditor = null;
    }
    clear() {
    }
    get() {
      return "";
    }
    set(data) {
    }
  };
  function _applyElOptions(el, o) {
    if (!o || typeof o !== "object") return el;
    if (o.cls) {
      if (Array.isArray(o.cls)) el.className = o.cls.join(" ");
      else el.className = o.cls;
    }
    if (o.text != null) {
      if (typeof o.text === "string") el.textContent = o.text;
      else el.appendChild(o.text);
    }
    if (o.attr) {
      for (const [k, v] of Object.entries(o.attr)) {
        if (v !== void 0 && v !== null && v !== false) el.setAttribute(k, String(v));
      }
    }
    if (o.title) el.title = o.title;
    if (o.value !== void 0) el.value = o.value;
    if (o.type) el.type = o.type;
    if (o.placeholder) el.placeholder = o.placeholder;
    if (o.href) el.href = o.href;
    if (o.parent) o.parent.appendChild(el);
    if (o.prepend && el.parentElement) {
      el.parentElement.insertBefore(el, el.parentElement.firstChild);
    }
    return el;
  }
  function installDomExtensions() {
    if (!Node.prototype.createEl) {
      Node.prototype.createEl = function(tag, o, callback) {
        const el = document.createElement(tag);
        if (typeof o === "string") o = { cls: o };
        _applyElOptions(el, o);
        this.appendChild(el);
        if (typeof callback === "function") callback(el);
        return el;
      };
    }
    if (!Node.prototype.createDiv) {
      Node.prototype.createDiv = function(o, callback) {
        if (typeof o === "string") o = { cls: o };
        return this.createEl("div", o, callback);
      };
    }
    if (!Node.prototype.createSpan) {
      Node.prototype.createSpan = function(o, callback) {
        if (typeof o === "string") o = { cls: o };
        return this.createEl("span", o, callback);
      };
    }
    if (!Node.prototype.createSvg) {
      Node.prototype.createSvg = function(tag, o, callback) {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        if (o && typeof o === "object") {
          if (o.cls) el.setAttribute("class", Array.isArray(o.cls) ? o.cls.join(" ") : o.cls);
          if (o.attr) {
            for (const [k, v] of Object.entries(o.attr)) {
              if (v != null) el.setAttribute(k, String(v));
            }
          }
        }
        this.appendChild(el);
        if (typeof callback === "function") callback(el);
        return el;
      };
    }
    if (!Node.prototype.detach) {
      Node.prototype.detach = function() {
        if (this.parentNode) this.parentNode.removeChild(this);
        return this;
      };
    }
    if (!Node.prototype.empty) {
      Node.prototype.empty = function() {
        while (this.firstChild) this.removeChild(this.firstChild);
        return this;
      };
    }
    if (!Element.prototype.getText) {
      Element.prototype.getText = function() {
        return this.textContent || "";
      };
    }
    if (!Element.prototype.setText) {
      Element.prototype.setText = function(val) {
        if (typeof val === "string") this.textContent = val;
        else {
          this.empty();
          this.appendChild(val);
        }
        return this;
      };
    }
    if (!Element.prototype.addClass) {
      Element.prototype.addClass = function(...classes) {
        this.classList.add(...classes.flat());
        return this;
      };
    }
    if (!Element.prototype.addClasses) {
      Element.prototype.addClasses = function(classes) {
        this.classList.add(...classes);
        return this;
      };
    }
    if (!Element.prototype.removeClass) {
      Element.prototype.removeClass = function(...classes) {
        this.classList.remove(...classes.flat());
        return this;
      };
    }
    if (!Element.prototype.removeClasses) {
      Element.prototype.removeClasses = function(classes) {
        this.classList.remove(...classes);
        return this;
      };
    }
    if (!Element.prototype.toggleClass) {
      Element.prototype.toggleClass = function(cls, value) {
        const classes = Array.isArray(cls) ? cls : [cls];
        for (const c of classes) {
          if (typeof value === "boolean") this.classList.toggle(c, value);
          else this.classList.toggle(c);
        }
        return this;
      };
    }
    if (!Element.prototype.hasClass) {
      Element.prototype.hasClass = function(cls) {
        return this.classList.contains(cls);
      };
    }
    if (!Element.prototype.setAttr) {
      Element.prototype.setAttr = function(name, value) {
        if (value === null || value === void 0) this.removeAttribute(name);
        else this.setAttribute(name, String(value));
      };
    }
    if (!Element.prototype.setAttrs) {
      Element.prototype.setAttrs = function(obj) {
        for (const [k, v] of Object.entries(obj)) this.setAttr(k, v);
      };
    }
    if (!Element.prototype.getAttr) {
      Element.prototype.getAttr = function(name) {
        return this.getAttribute(name);
      };
    }
    if (!Element.prototype.matchParent) {
      Element.prototype.matchParent = function(selector, lastParent) {
        let el = this.parentElement;
        while (el) {
          if (el.matches(selector)) return el;
          if (el === lastParent) break;
          el = el.parentElement;
        }
        return null;
      };
    }
    if (!Element.prototype.getCssPropertyValue) {
      Element.prototype.getCssPropertyValue = function(prop, pseudo) {
        return getComputedStyle(this, pseudo).getPropertyValue(prop);
      };
    }
    if (!Element.prototype.isActiveElement) {
      Element.prototype.isActiveElement = function() {
        return document.activeElement === this;
      };
    }
    if (!Element.prototype.find) {
      Element.prototype.find = function(selector) {
        return this.querySelector(selector);
      };
    }
    if (!Element.prototype.findAll) {
      Element.prototype.findAll = function(selector) {
        return Array.from(this.querySelectorAll(selector));
      };
    }
    if (!Element.prototype.findAllSelf) {
      Element.prototype.findAllSelf = function(selector) {
        const results = this.matches(selector) ? [this] : [];
        return results.concat(Array.from(this.querySelectorAll(selector)));
      };
    }
    if (!HTMLElement.prototype.show) {
      HTMLElement.prototype.show = function() {
        this.style.display = "";
        return this;
      };
    }
    if (!HTMLElement.prototype.hide) {
      HTMLElement.prototype.hide = function() {
        this.style.display = "none";
        return this;
      };
    }
    if (!HTMLElement.prototype.toggle) {
      HTMLElement.prototype.toggle = function(show) {
        if (typeof show === "boolean") this.style.display = show ? "" : "none";
        else this.style.display = this.style.display === "none" ? "" : "none";
        return this;
      };
    }
    if (!HTMLElement.prototype.toggleVisibility) {
      HTMLElement.prototype.toggleVisibility = function(visible) {
        this.style.display = visible ? "" : "none";
        return this;
      };
    }
    if (!HTMLElement.prototype.isShown) {
      HTMLElement.prototype.isShown = function() {
        return this.style.display !== "none" && this.offsetParent !== null;
      };
    }
    if (!HTMLElement.prototype.setCssStyles) {
      HTMLElement.prototype.setCssStyles = function(styles) {
        if (styles) Object.assign(this.style, styles);
        return this;
      };
    }
    if (!HTMLElement.prototype.setCssProps) {
      HTMLElement.prototype.setCssProps = function(props) {
        if (props) {
          for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
        }
        return this;
      };
    }
    if (!HTMLElement.prototype.onClickEvent) {
      HTMLElement.prototype.onClickEvent = function(listener, options) {
        this.addEventListener("click", listener, options);
      };
    }
    if (!HTMLElement.prototype.onNodeInserted) {
      HTMLElement.prototype.onNodeInserted = function(listener, once) {
        const obs = new MutationObserver(() => {
          if (document.contains(this)) {
            listener();
            if (once) obs.disconnect();
          }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        return () => obs.disconnect();
      };
    }
    if (!HTMLElement.prototype.onWindowMigrated) {
      HTMLElement.prototype.onWindowMigrated = function(listener) {
        return () => {
        };
      };
    }
    if (!("doc" in Node.prototype)) {
      Object.defineProperty(Node.prototype, "doc", {
        get() {
          return this.ownerDocument || document;
        },
        configurable: true
      });
    }
    if (!("win" in Node.prototype)) {
      Object.defineProperty(Node.prototype, "win", {
        get() {
          return (this.ownerDocument || document).defaultView || window;
        },
        configurable: true
      });
    }
    if (!("constructorWin" in Node.prototype)) {
      Object.defineProperty(Node.prototype, "constructorWin", {
        get() {
          return (this.ownerDocument || document).defaultView || window;
        },
        configurable: true
      });
    }
    if (!HTMLElement.prototype.on) {
      HTMLElement.prototype.on = function(type, selector, listener, options) {
        if (!this._EVENTS) this._EVENTS = {};
        if (!this._EVENTS[type]) this._EVENTS[type] = [];
        const callback = (evt) => {
          const target = evt.target;
          if (target && target.closest) {
            const delegateTarget = target.closest(selector);
            if (delegateTarget && this.contains(delegateTarget)) {
              listener.call(this, evt, delegateTarget);
            }
          }
        };
        this._EVENTS[type].push({ selector, listener, options, callback });
        this.addEventListener(type, callback, options);
      };
    }
    if (!HTMLElement.prototype.off) {
      HTMLElement.prototype.off = function(type, selector, listener, options) {
        if (!this._EVENTS || !this._EVENTS[type]) return;
        const idx = this._EVENTS[type].findIndex((e) => e.selector === selector && e.listener === listener);
        if (idx >= 0) {
          const entry = this._EVENTS[type][idx];
          this.removeEventListener(type, entry.callback, options);
          this._EVENTS[type].splice(idx, 1);
        }
      };
    }
    if (!HTMLElement.prototype.trigger) {
      HTMLElement.prototype.trigger = function(eventType) {
        this.dispatchEvent(new Event(eventType, { bubbles: true }));
      };
    }
    if (!Document.prototype.on) {
      Document.prototype.on = function(type, selector, listener, options) {
        if (!this._EVENTS) this._EVENTS = {};
        if (!this._EVENTS[type]) this._EVENTS[type] = [];
        const callback = (evt) => {
          const target = evt.target;
          if (target && target.closest) {
            const delegateTarget = target.closest(selector);
            if (delegateTarget) {
              listener.call(this, evt, delegateTarget);
            }
          }
        };
        this._EVENTS[type].push({ selector, listener, options, callback });
        this.addEventListener(type, callback, options);
      };
    }
    if (!Document.prototype.off) {
      Document.prototype.off = function(type, selector, listener, options) {
        if (!this._EVENTS || !this._EVENTS[type]) return;
        const idx = this._EVENTS[type].findIndex((e) => e.selector === selector && e.listener === listener);
        if (idx >= 0) {
          const entry = this._EVENTS[type][idx];
          this.removeEventListener(type, entry.callback, options);
          this._EVENTS[type].splice(idx, 1);
        }
      };
    }
    if (!SVGElement.prototype.setCssStyles) {
      SVGElement.prototype.setCssStyles = function(styles) {
        if (styles) Object.assign(this.style, styles);
        return this;
      };
    }
    if (!SVGElement.prototype.setCssProps) {
      SVGElement.prototype.setCssProps = function(props) {
        if (props) {
          for (const [k, v] of Object.entries(props)) this.style.setProperty(k, v);
        }
        return this;
      };
    }
    if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerWidth")?.get) {
      Object.defineProperty(HTMLElement.prototype, "innerWidth", {
        get() {
          const cs = getComputedStyle(this);
          return this.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        },
        configurable: true
      });
    }
    if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHeight")?.get) {
      Object.defineProperty(HTMLElement.prototype, "innerHeight", {
        get() {
          const cs = getComputedStyle(this);
          return this.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        },
        configurable: true
      });
    }
    if (!Array.prototype.findLastIndex) {
      Array.prototype.findLastIndex = function(predicate) {
        for (let i = this.length - 1; i >= 0; i--) {
          if (predicate(this[i], i, this)) return i;
        }
        return -1;
      };
    }
    if (!Node.prototype.insertAfter) {
      Node.prototype.insertAfter = function(node, child) {
        if (child && child.nextSibling) this.insertBefore(node, child.nextSibling);
        else this.appendChild(node);
        return node;
      };
    }
    if (!Node.prototype.indexOf) {
      Node.prototype.indexOf = function(other) {
        return Array.from(this.childNodes).indexOf(other);
      };
    }
    if (!Node.prototype.setChildrenInPlace) {
      Node.prototype.setChildrenInPlace = function(children) {
        this.empty?.();
        for (const c of children) this.appendChild(c);
      };
    }
    if (!Node.prototype.appendText) {
      Node.prototype.appendText = function(val) {
        this.appendChild(document.createTextNode(val));
      };
    }
    if (!Node.prototype.instanceOf) {
      Node.prototype.instanceOf = function(type) {
        return this instanceof type;
      };
    }
    if (!DocumentFragment.prototype.find) {
      DocumentFragment.prototype.find = function(selector) {
        return this.querySelector(selector);
      };
    }
    if (!DocumentFragment.prototype.findAll) {
      DocumentFragment.prototype.findAll = function(selector) {
        return Array.from(this.querySelectorAll(selector));
      };
    }
    if (!Object.isEmpty) {
      Object.isEmpty = function(obj) {
        if (!obj) return true;
        return Object.keys(obj).length === 0;
      };
    }
    if (!Object.each) {
      Object.each = function(obj, callback, context) {
        for (const key of Object.keys(obj)) {
          if (callback.call(context, obj[key], key) === false) return false;
        }
        return true;
      };
    }
    if (!Array.combine) {
      Array.combine = function(arrays) {
        return [].concat(...arrays);
      };
    }
    if (!Array.prototype.first) {
      Array.prototype.first = function() {
        return this.length > 0 ? this[0] : void 0;
      };
    }
    if (!Array.prototype.last) {
      Array.prototype.last = function() {
        return this.length > 0 ? this[this.length - 1] : void 0;
      };
    }
    if (!Array.prototype.contains) {
      Array.prototype.contains = function(target) {
        return this.includes(target);
      };
    }
    if (!Array.prototype.remove) {
      Array.prototype.remove = function(target) {
        const idx = this.indexOf(target);
        if (idx >= 0) this.splice(idx, 1);
      };
    }
    if (!Array.prototype.shuffle) {
      Array.prototype.shuffle = function() {
        for (let i = this.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
      };
    }
    if (!Array.prototype.unique) {
      Array.prototype.unique = function() {
        return [...new Set(this)];
      };
    }
    if (!Math.clamp) {
      Math.clamp = function(value, min, max) {
        return Math.min(Math.max(value, min), max);
      };
    }
    if (!Math.square) {
      Math.square = function(value) {
        return value * value;
      };
    }
    if (!String.isString) {
      String.isString = function(obj) {
        return typeof obj === "string";
      };
    }
    if (!String.prototype.contains) {
      String.prototype.contains = function(target) {
        return this.includes(target);
      };
    }
    if (!String.prototype.format) {
      String.prototype.format = function(...args) {
        return this.replace(/{(\d+)}/g, (match, num) => args[num] !== void 0 ? args[num] : match);
      };
    }
    if (!Number.isNumber) {
      Number.isNumber = function(obj) {
        return typeof obj === "number" && !isNaN(obj);
      };
    }
    if (typeof window.isBoolean === "undefined") {
      window.isBoolean = function(obj) {
        return typeof obj === "boolean";
      };
    }
    if (typeof window.fish === "undefined") {
      window.fish = function(selector) {
        return document.querySelector(selector);
      };
    }
    if (typeof window.fishAll === "undefined") {
      window.fishAll = function(selector) {
        return Array.from(document.querySelectorAll(selector));
      };
    }
    if (typeof window.sleep === "undefined") {
      window.sleep = function(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };
    }
    if (typeof window.nextFrame === "undefined") {
      window.nextFrame = function() {
        return new Promise((resolve) => requestAnimationFrame(resolve));
      };
    }
    if (typeof window.ajax === "undefined") {
      window.ajax = function(options) {
        const xhr = options.req || new XMLHttpRequest();
        xhr.open(options.method || "GET", options.url);
        if (options.headers) {
          for (const [k, v] of Object.entries(options.headers)) xhr.setRequestHeader(k, v);
        }
        if (options.withCredentials) xhr.withCredentials = true;
        xhr.onload = () => options.success?.(xhr.response, xhr);
        xhr.onerror = (e) => options.error?.(e, xhr);
        xhr.send(options.data || null);
      };
    }
    if (typeof window.ajaxPromise === "undefined") {
      window.ajaxPromise = function(options) {
        return new Promise((resolve, reject) => {
          window.ajax({ ...options, success: resolve, error: reject });
        });
      };
    }
    if (typeof window.ready === "undefined") {
      window.ready = function(fn) {
        if (document.readyState !== "loading") fn();
        else document.addEventListener("DOMContentLoaded", fn);
      };
    }
    if (typeof window.activeWindow === "undefined") {
      window.activeWindow = window;
    }
    if (typeof window.activeDocument === "undefined") {
      window.activeDocument = document;
    }
  }
  function createEl(tag, o, callback) {
    const el = document.createElement(tag);
    if (typeof o === "string") o = { cls: o };
    _applyElOptions(el, o);
    if (typeof o === "function") o(el);
    else if (typeof callback === "function") callback(el);
    return el;
  }
  function createDiv(o, callback) {
    if (typeof o === "string") o = { cls: o };
    return createEl("div", o, callback);
  }
  function createSpan(o, callback) {
    if (typeof o === "string") o = { cls: o };
    return createEl("span", o, callback);
  }
  function createSvg(tag, o, callback) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (o && typeof o === "object") {
      if (o.cls) el.setAttribute("class", Array.isArray(o.cls) ? o.cls.join(" ") : o.cls);
      if (o.attr) {
        for (const [k, v] of Object.entries(o.attr)) {
          if (v != null) el.setAttribute(k, String(v));
        }
      }
    }
    if (typeof callback === "function") callback(el);
    return el;
  }
  function createFragment(callback) {
    const frag = document.createDocumentFragment();
    if (typeof callback === "function") callback(frag);
    return frag;
  }
  window.createEl = createEl;
  window.createDiv = createDiv;
  window.createSpan = createSpan;
  window.createSvg = createSvg;
  window.createFragment = createFragment;
  window.setIcon = setIcon;
  window.getIconIds = getIconIds;
  window.activeDocument = document;
  window.activeWindow = window;
  function requireApiVersion(version) {
    return true;
  }
  var WorkspaceParent = class extends WorkspaceItem {
  };
  var WorkspaceFloating = class extends WorkspaceParent {
    constructor() {
      super();
    }
  };
  var WorkspaceSidedock = class extends WorkspaceParent {
    constructor() {
      super();
    }
  };
  var WorkspaceRibbon = class {
    constructor() {
    }
  };
  var MenuSeparator = class {
    constructor(menu) {
      this.menu = menu;
    }
  };
  var SettingGroup = class {
    constructor(settingEl) {
      this.settingEl = settingEl;
    }
  };
  var SecretComponent = class extends BaseComponent {
    constructor(inputEl) {
      super();
      this.inputEl = inputEl || document.createElement("input");
      this.inputEl.type = "password";
    }
    getValue() {
      return this.inputEl.value;
    }
    setValue(v) {
      this.inputEl.value = v;
      return this;
    }
  };
  var Tasks = class {
    constructor() {
    }
  };
  function parseFrontMatterEntry(frontmatter, key) {
    return frontmatter?.[key] ?? null;
  }
  function removeIcon(iconId) {
  }
  function setTooltip(el, tooltip, options) {
    if (el) el.title = tooltip || "";
  }
  function prepareSimpleSearch(query) {
    const lower = query.toLowerCase();
    return (text) => text.toLowerCase().includes(lower) ? { score: -1, matches: [] } : null;
  }
  function renderMath(source, display) {
    const el = document.createElement("span");
    el.textContent = source;
    return el;
  }
  function finishRenderMath() {
    return Promise.resolve();
  }
  function loadMathJax() {
    return Promise.resolve();
  }
  function loadMermaid() {
    return Promise.resolve();
  }
  function loadPdfJs() {
    return Promise.resolve();
  }
  function loadPrism() {
    return Promise.resolve();
  }
  function isBoolean(obj) {
    return typeof obj === "boolean";
  }
  function fish(selector) {
    return document.querySelector(selector);
  }
  function fishAll(selector) {
    return Array.from(document.querySelectorAll(selector));
  }
  function ajax(options) {
  }
  function ajaxPromise(options) {
    return Promise.resolve("");
  }
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function nextFrame() {
    return new Promise((r) => requestAnimationFrame(r));
  }
  var ObsidianAPI = {
    apiVersion,
    requireApiVersion,
    App,
    Component,
    Events,
    Plugin,
    PluginSettingTab,
    SettingTab,
    TAbstractFile,
    TFile,
    TFolder,
    Vault,
    FileSystemAdapter,
    Workspace,
    WorkspaceLeaf,
    WorkspaceItem,
    WorkspaceParent,
    WorkspaceSplit,
    WorkspaceTabs,
    WorkspaceRoot,
    WorkspaceContainer,
    WorkspaceWindow,
    WorkspaceFloating,
    WorkspaceSidedock,
    WorkspaceMobileDrawer,
    WorkspaceRibbon,
    View,
    ItemView,
    EditableFileView,
    FileView,
    TextFileView,
    MarkdownView,
    MarkdownEditView,
    MarkdownPreviewView,
    MarkdownSourceView,
    Editor: Editor2,
    MetadataCache,
    FileManager,
    Modal,
    SuggestModal,
    FuzzySuggestModal,
    PopoverSuggest,
    AbstractInputSuggest,
    EditorSuggest,
    Notice,
    Menu,
    MenuItem,
    MenuSeparator,
    Setting,
    SettingGroup,
    BaseComponent,
    ValueComponent,
    AbstractTextComponent,
    TextComponent,
    TextAreaComponent,
    ToggleComponent,
    DropdownComponent,
    SliderComponent,
    ButtonComponent,
    ColorComponent,
    SearchComponent,
    MomentFormatComponent,
    ExtraButtonComponent,
    ProgressBarComponent,
    SecretComponent,
    MarkdownRenderer,
    MarkdownPreviewRenderer,
    MarkdownRenderChild,
    Keymap,
    Scope,
    Platform,
    Tasks,
    HoverPopover,
    normalizePath,
    debounce,
    parseLinktext,
    getLinkpath,
    stripHeading,
    stripHeadingForLink,
    parseFrontMatterTags,
    parseFrontMatterAliases,
    parseFrontMatterStringArray,
    parseFrontMatterEntry,
    parseYaml,
    stringifyYaml,
    moment,
    setIcon,
    addIcon,
    removeIcon,
    getIcon,
    getIconIds,
    setTooltip,
    requestUrl,
    request,
    sanitizeHTMLToDom,
    htmlToMarkdown,
    hexToArrayBuffer,
    arrayBufferToHex,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    fuzzySearch,
    prepareQuery,
    prepareFuzzySearch,
    prepareSimpleSearch,
    sortSearchResults,
    renderResults,
    renderMatches,
    renderMath,
    finishRenderMath,
    iterateCacheRefs,
    getAllTags,
    resolveSubpath,
    loadMathJax,
    loadMermaid,
    loadPdfJs,
    loadPrism,
    createEl,
    createDiv,
    createSpan,
    createSvg,
    createFragment,
    isBoolean,
    fish,
    fishAll,
    ajax,
    ajaxPromise,
    ready,
    sleep,
    nextFrame,
    installDomExtensions,
    MarkdownPostProcessor: null,
    MarkdownPostProcessorContext: null,
    ViewCreator: null
  };
  window.ObsidianAPI = ObsidianAPI;
  var obsidian_api_default = ObsidianAPI;

  // src/js/plugin-loader.js
  var PluginRegistry = class {
    constructor() {
      this.commands = /* @__PURE__ */ new Map();
      this.settingTabs = /* @__PURE__ */ new Map();
      this.postProcessors = [];
      this.ribbonIcons = [];
    }
    registerCommand(cmd) {
      this.commands.set(cmd.id, cmd);
    }
    unregisterCommand(id) {
      this.commands.delete(id);
    }
    registerSettingTab(pluginId, tab) {
      this.settingTabs.set(pluginId, tab);
    }
    registerPostProcessor(pp) {
      this.postProcessors.push(pp);
    }
    getAllCommands() {
      return Array.from(this.commands.values());
    }
    executeCommand(id) {
      const cmd = this.commands.get(id);
      if (!cmd) return false;
      if (cmd.callback) {
        cmd.callback();
        return true;
      }
      if (cmd.checkCallback) {
        return cmd.checkCallback(false) !== false;
      }
      return false;
    }
  };
  var PluginLoader = class {
    constructor(oxidianApp) {
      this.oxidianApp = oxidianApp;
      this.obsidianApp = null;
      this.loadedPlugins = /* @__PURE__ */ new Map();
      this.pluginManifests = /* @__PURE__ */ new Map();
      this.enabledPlugins = /* @__PURE__ */ new Set();
      this.registry = new PluginRegistry();
      window._oxidianPluginRegistry = this.registry;
    }
    async init() {
      installDomExtensions();
      window.activeDocument = document;
      window.activeWindow = window;
      if (!window.setIcon) window.setIcon = setIcon;
      if (!window.getIconIds) window.getIconIds = getIconIds;
      this.obsidianApp = new App();
      await this.obsidianApp.vault._refreshFileCache();
      this._wireAppEvents();
      this._registerBuiltinCommands();
      this._initCommandPalette();
      await this.discoverPlugins();
      await this.loadEnabledPlugins();
      console.log(`[PluginLoader] Initialized with ${this.loadedPlugins.size} plugins, ${this.registry.commands.size} commands`);
    }
    _wireAppEvents() {
      const origOpenFile = this.oxidianApp.openFile.bind(this.oxidianApp);
      const self = this;
      this.oxidianApp.openFile = async function(path) {
        await origOpenFile(path);
        const file = new TFile(path);
        self.obsidianApp.workspace.setActiveFile(file);
      };
    }
    _registerBuiltinCommands() {
      const app = this.oxidianApp;
      const builtins = [
        { id: "oxidian:new-note", name: "Create new note", callback: () => app.showNewNoteDialog() },
        { id: "oxidian:daily-note", name: "Open daily note", callback: () => app.openDailyNote() },
        { id: "oxidian:save", name: "Save current file", callback: () => app.saveCurrentFile() },
        { id: "oxidian:search", name: "Search in all notes", callback: () => app.search?.show() },
        { id: "oxidian:graph", name: "Open graph view", callback: () => app.openGraphView() },
        { id: "oxidian:settings", name: "Open settings", callback: () => app.openSettingsTab() },
        { id: "oxidian:toggle-preview", name: "Toggle editor/preview", callback: () => app.editor?.togglePreview() },
        { id: "oxidian:close-tab", name: "Close current tab", callback: () => {
          const t = app.tabManager.getActiveTab();
          if (t) app.tabManager.closeTab(t.id);
        } }
      ];
      for (const cmd of builtins) {
        this.registry.registerCommand(cmd);
      }
    }
    _initCommandPalette() {
      this.oxidianApp.openCommandPalette = () => this.showCommandPalette();
    }
    showCommandPalette() {
      const existing = document.getElementById("command-palette-overlay");
      if (existing) {
        existing.remove();
        return;
      }
      const overlay = document.createElement("div");
      overlay.id = "command-palette-overlay";
      overlay.className = "command-palette-overlay";
      const container = document.createElement("div");
      container.className = "command-palette";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "command-palette-input";
      input.placeholder = "Type a command...";
      const results = document.createElement("div");
      results.className = "command-palette-results";
      container.appendChild(input);
      container.appendChild(results);
      overlay.appendChild(container);
      document.body.appendChild(overlay);
      const allCommands = this.registry.getAllCommands();
      const renderResults2 = (query) => {
        results.innerHTML = "";
        const q = query.toLowerCase();
        const filtered = q ? allCommands.filter((c) => c.name.toLowerCase().includes(q)) : allCommands;
        for (const cmd of filtered.slice(0, 20)) {
          const item = document.createElement("div");
          item.className = "command-palette-item";
          item.innerHTML = `
                    <span class="command-palette-name">${escapeHtml(cmd.name)}</span>
                    ${cmd._pluginId ? `<span class="command-palette-plugin">${escapeHtml(cmd._pluginId)}</span>` : ""}
                `;
          item.addEventListener("click", () => {
            overlay.remove();
            this.registry.executeCommand(cmd.id);
          });
          results.appendChild(item);
        }
        if (filtered.length === 0) {
          results.innerHTML = '<div class="command-palette-empty">No matching commands</div>';
        }
      };
      renderResults2("");
      input.focus();
      input.addEventListener("input", () => renderResults2(input.value));
      let selectedIdx = -1;
      input.addEventListener("keydown", (e) => {
        const items = results.querySelectorAll(".command-palette-item");
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
          items.forEach((it, i) => it.classList.toggle("selected", i === selectedIdx));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIdx = Math.max(selectedIdx - 1, 0);
          items.forEach((it, i) => it.classList.toggle("selected", i === selectedIdx));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (selectedIdx >= 0 && items[selectedIdx]) {
            items[selectedIdx].click();
          } else if (items.length > 0) {
            items[0].click();
          }
        } else if (e.key === "Escape") {
          overlay.remove();
        }
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });
    }
    // ── Plugin Discovery via Rust backend ──────────────────────────────────
    async discoverPlugins() {
      try {
        const manifests = await invoke("discover_plugins");
        for (const m of manifests) {
          this.pluginManifests.set(m.id, m);
        }
      } catch (e) {
        console.warn("[PluginLoader] Failed to discover plugins via Rust registry:", e);
        try {
          const manifests = await invoke("list_obsidian_plugins");
          for (const m of manifests) {
            this.pluginManifests.set(m.id, m);
          }
        } catch (e2) {
          console.warn("[PluginLoader] Fallback discovery also failed:", e2);
        }
      }
      try {
        const enabled = await invoke("get_enabled_plugins");
        this.enabledPlugins = new Set(enabled);
      } catch {
        this.enabledPlugins = /* @__PURE__ */ new Set();
      }
    }
    async loadEnabledPlugins() {
      for (const [id, manifest] of this.pluginManifests) {
        if (this.enabledPlugins.has(id)) {
          await this.loadPlugin(id);
        }
      }
    }
    async loadPlugin(pluginId) {
      if (this.loadedPlugins.has(pluginId)) return;
      const manifest = this.pluginManifests.get(pluginId);
      if (!manifest) {
        console.warn(`[PluginLoader] Unknown plugin: ${pluginId}`);
        return;
      }
      try {
        const mainJs = await invoke("read_plugin_main", { pluginId });
        try {
          const styles = await invoke("read_plugin_styles", { pluginId });
          if (styles) {
            const styleEl = document.createElement("style");
            styleEl.setAttribute("data-plugin", pluginId);
            styleEl.textContent = styles;
            document.head.appendChild(styleEl);
          }
        } catch {
        }
        const pluginInstance = this._createPluginSandbox(mainJs, manifest);
        if (pluginInstance) {
          this.loadedPlugins.set(pluginId, pluginInstance);
          pluginInstance._loaded = true;
          console.log(`[PluginLoader] Loaded plugin: ${manifest.name} v${manifest.version}`);
        }
      } catch (e) {
        console.error(`[PluginLoader] Failed to load plugin ${pluginId}:`, e);
        new Notice(`Failed to load plugin: ${manifest.name} \u2014 ${e.message}`);
      }
    }
    _createPluginSandbox(mainJs, manifest) {
      const moduleExports = {};
      const moduleObj = { exports: moduleExports };
      const requireFn = (moduleName) => {
        if (moduleName === "obsidian") return obsidian_api_default;
        console.warn(`[PluginLoader] Plugin ${manifest.id} tried to require unknown module: ${moduleName}`);
        return {};
      };
      try {
        const wrappedCode = `(function(module, exports, require, app, obsidian) {
${mainJs}
})`;
        const fn = new Function("return " + wrappedCode)();
        fn(moduleObj, moduleExports, requireFn, this.obsidianApp, obsidian_api_default);
        const exports = moduleObj.exports;
        let PluginClass = null;
        if (exports.default && typeof exports.default === "function") {
          PluginClass = exports.default;
        } else if (typeof exports === "function") {
          PluginClass = exports;
        } else {
          for (const key of Object.keys(exports)) {
            if (typeof exports[key] === "function") {
              PluginClass = exports[key];
              break;
            }
          }
        }
        if (!PluginClass) {
          console.warn(`[PluginLoader] No plugin class found in ${manifest.id}`);
          return null;
        }
        const instance = new PluginClass(this.obsidianApp, manifest);
        if (!instance.addCommand) {
          Object.getOwnPropertyNames(Plugin.prototype).forEach((key) => {
            if (!(key in instance)) {
              instance[key] = Plugin.prototype[key].bind(instance);
            }
          });
          if (!instance._commands) instance._commands = [];
          if (!instance._settingTabs) instance._settingTabs = [];
          if (!instance._ribbonIcons) instance._ribbonIcons = [];
          if (!instance._events) instance._events = [];
          if (!instance._postProcessors) instance._postProcessors = [];
          if (!instance._stylesheets) instance._stylesheets = [];
          if (!instance._statusBarItems) instance._statusBarItems = [];
        }
        instance.load();
        return instance;
      } catch (e) {
        console.error(`[PluginLoader] Error evaluating plugin ${manifest.id}:`, e);
        throw e;
      }
    }
    async unloadPlugin(pluginId) {
      const instance = this.loadedPlugins.get(pluginId);
      if (!instance) return;
      try {
        instance._unload();
      } catch (e) {
        console.error(`[PluginLoader] Error unloading ${pluginId}:`, e);
      }
      document.querySelectorAll(`style[data-plugin="${pluginId}"]`).forEach((el) => el.remove());
      this.loadedPlugins.delete(pluginId);
      console.log(`[PluginLoader] Unloaded plugin: ${pluginId}`);
    }
    // ── Enable/Disable via Rust backend ────────────────────────────────────
    async togglePlugin(pluginId, enabled) {
      try {
        if (enabled) {
          await invoke("enable_plugin", { pluginId });
        } else {
          await invoke("disable_plugin", { pluginId });
        }
      } catch (e) {
        console.error(`[PluginLoader] Failed to ${enabled ? "enable" : "disable"} plugin ${pluginId}:`, e);
      }
      if (enabled) {
        this.enabledPlugins.add(pluginId);
        await this.loadPlugin(pluginId);
      } else {
        this.enabledPlugins.delete(pluginId);
        await this.unloadPlugin(pluginId);
      }
    }
    // ── Plugin Settings via Rust backend ───────────────────────────────────
    async getPluginSettings(pluginId) {
      try {
        return await invoke("get_plugin_settings", { pluginId });
      } catch (e) {
        console.warn(`[PluginLoader] Failed to load settings for ${pluginId}:`, e);
        return {};
      }
    }
    async savePluginSettings(pluginId, settings) {
      try {
        await invoke("save_plugin_settings", { pluginId, settings });
      } catch (e) {
        console.error(`[PluginLoader] Failed to save settings for ${pluginId}:`, e);
      }
    }
    isEnabled(pluginId) {
      return this.enabledPlugins.has(pluginId);
    }
    isLoaded(pluginId) {
      return this.loadedPlugins.has(pluginId);
    }
    getPluginSettingTab(pluginId) {
      return this.registry.settingTabs.get(pluginId) || null;
    }
    getObsidianApp() {
      return this.obsidianApp;
    }
    destroy() {
      for (const [id] of this.loadedPlugins) {
        this.unloadPlugin(id);
      }
      this.registry.commands.clear();
      this.registry.settingTabs.clear();
      this.registry.postProcessors = [];
    }
  };
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // src/js/hypermark.js
  init_tauri_bridge();
  var Block = class {
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
  };
  var MarkdownBridge = class {
    constructor() {
      this.blocks = [];
      this._content = "";
      this._idCounter = 0;
    }
    /** @returns {string} */
    get content() {
      return this._content;
    }
    /** @returns {number} */
    get length() {
      return this._content.length;
    }
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
    toString() {
      return this._content;
    }
    /**
     * Parse content via Rust and convert AST JSON to Block[].
     * @private
     * @returns {Promise<Block[]>}
     */
    async _parse() {
      try {
        const ast = await invoke("parse_markdown", { content: this._content });
        this.blocks = (ast || []).map((b) => new Block({
          id: b.id || this._stableId(b.from, b.type),
          type: b.type,
          from: b.from,
          to: b.to,
          content: b.content,
          meta: b.meta || {}
        }));
      } catch (err) {
        console.warn("[HyperMark] Rust parse_markdown failed, using fallback:", err);
        this.blocks = this._fallbackParse(this._content);
      }
      return this.blocks;
    }
    /**
     * Generate a stable ID based on block position and type.
     * @private
     */
    _stableId(from, type) {
      return "blk_" + from + "_" + type;
    }
    /**
     * Minimal JS fallback parser if Rust is unavailable.
     * Only handles basic block splitting — no complex logic.
     * @private
     * @param {string} text
     * @returns {Block[]}
     */
    _fallbackParse(text) {
      if (!text || text.trim() === "") return [];
      const blocks = [];
      const lines = text.split("\n");
      let i = 0, offset = 0;
      while (i < lines.length) {
        const line = lines[i];
        const lineStart = offset;
        if (line.trim() === "") {
          offset += line.length + 1;
          i++;
          continue;
        }
        const hm = line.match(/^(#{1,6})\s+(.*)/);
        if (hm) {
          blocks.push(new Block({ id: this._stableId(lineStart, "heading"), type: "heading", from: lineStart, to: lineStart + line.length, content: line, meta: { level: hm[1].length, text: hm[2] } }));
          offset += line.length + 1;
          i++;
          continue;
        }
        const cm = line.match(/^(`{3,}|~{3,})(.*)$/);
        if (cm) {
          const fence = cm[1];
          const lang = cm[2].trim();
          let end = i + 1;
          while (end < lines.length && !(lines[end].startsWith(fence.charAt(0).repeat(fence.length)) && lines[end].trim().length <= fence.length + 1)) end++;
          if (end < lines.length) end++;
          const content = lines.slice(i, end).join("\n");
          blocks.push(new Block({ id: this._stableId(lineStart, "code_block"), type: "code_block", from: lineStart, to: lineStart + content.length, content, meta: { language: lang || null, fence } }));
          offset += content.length + (end < lines.length ? 1 : 0);
          i = end;
          continue;
        }
        if (line.startsWith(">")) {
          let end = i;
          while (end < lines.length && lines[end].startsWith(">")) end++;
          const content = lines.slice(i, end).join("\n");
          const calloutMatch = content.match(/^>\s*\[!(\w+)\]/);
          const type = calloutMatch ? "callout" : "blockquote";
          const meta = calloutMatch ? { calloutType: calloutMatch[1].toLowerCase() } : {};
          blocks.push(new Block({ id: this._stableId(lineStart, type), type, from: lineStart, to: lineStart + content.length, content, meta }));
          offset += content.length + (end < lines.length ? 1 : 0);
          i = end;
          continue;
        }
        {
          let end = i;
          while (end < lines.length && lines[end].trim() !== "" && !lines[end].match(/^#{1,6}\s/) && !lines[end].match(/^[`~]{3,}/) && !lines[end].startsWith(">")) end++;
          if (end === i) end = i + 1;
          const content = lines.slice(i, end).join("\n");
          blocks.push(new Block({ id: this._stableId(lineStart, "paragraph"), type: "paragraph", from: lineStart, to: lineStart + content.length, content, meta: {} }));
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
  };
  var _renderInlineCache = /* @__PURE__ */ new Map();
  function renderInline(text) {
    if (_renderInlineCache.has(text)) return _renderInlineCache.get(text);
    return renderInlineFallback(text);
  }
  function renderInlineFallback(text) {
    let html = text;
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="hm-inline-img" />');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="hm-link">$1</a>');
    html = html.replace(/\*{3}(.+?)\*{3}/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*{2}(.+?)\*{2}/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
    html = html.replace(/`([^`]+)`/g, '<code class="hm-inline-code">$1</code>');
    html = html.replace(/==(.+?)==/g, '<mark class="hm-highlight">$1</mark>');
    html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$2</a>');
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="#$1" class="hm-wikilink">$1</a>');
    return html;
  }
  var BlockRenderers = {
    heading(block) {
      const level = block.meta.level || 1;
      const text = block.content.replace(/^#{1,6}\s+/, "");
      const anchor = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      const inlineHtml = renderInline(text);
      return `<h${level} id="${anchor}" class="hm-heading hm-h${level}">${inlineHtml}</h${level}>`;
    },
    paragraph(block) {
      return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
    },
    code_block(block) {
      const lines = block.content.split("\n");
      const lang = block.meta.language || "";
      const codeLines = lines.slice(1, lines[lines.length - 1].match(/^[`~]/) ? -1 : void 0);
      const code = codeLines.join("\n");
      const escaped = BlockRenderers._escHtml(code);
      return `<div class="hm-code-block" data-language="${BlockRenderers._escAttr(lang)}">
      ${lang ? `<div class="hm-code-lang">${BlockRenderers._escHtml(lang)}</div>` : ""}
      <pre class="hm-pre"><code class="hm-code">${escaped}</code></pre>
    </div>`;
    },
    blockquote(block) {
      const inner = block.content.replace(/^>\s?/gm, "");
      return `<blockquote class="hm-blockquote">
      <div class="hm-bq-bar"></div>
      <div class="hm-bq-content">${renderInline(inner)}</div>
    </blockquote>`;
    },
    callout(block) {
      const type = block.meta.calloutType || "note";
      const lines = block.content.split("\n");
      const titleLine = lines[0].replace(/^>\s*\[!\w+\]\s*/, "").trim();
      const bodyLines = lines.slice(1).map((l) => l.replace(/^>\s?/, "")).join("\n");
      const icons = {
        note: "\u2139\uFE0F",
        tip: "\u{1F4A1}",
        warning: "\u26A0\uFE0F",
        danger: "\u{1F534}",
        info: "\u2139\uFE0F",
        success: "\u2705",
        question: "\u2753",
        quote: "\u{1F4AC}",
        bug: "\u{1F41B}",
        example: "\u{1F4CB}",
        abstract: "\u{1F4DD}",
        todo: "\u2611\uFE0F",
        failure: "\u274C",
        important: "\u{1F525}"
      };
      const icon = icons[type] || "\u2139\uFE0F";
      return `<div class="hm-callout hm-callout-${BlockRenderers._escAttr(type)}">
      <div class="hm-callout-header">
        <span class="hm-callout-icon">${icon}</span>
        <span class="hm-callout-type">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        ${titleLine ? `<span class="hm-callout-title">${renderInline(titleLine)}</span>` : ""}
      </div>
      ${bodyLines.trim() ? `<div class="hm-callout-body">${renderInline(bodyLines)}</div>` : ""}
    </div>`;
    },
    list(block) {
      const lines = block.content.split("\n");
      const ordered = block.meta.ordered;
      const tag = ordered ? "ol" : "ul";
      let html = `<${tag} class="hm-list hm-list-${ordered ? "ordered" : "unordered"}">`;
      for (const line of lines) {
        if (line.trim() === "") continue;
        const itemMatch = line.match(/^\s*(?:[-*+]|\d+[.)]) (.*)/);
        if (!itemMatch) continue;
        let itemContent = itemMatch[1];
        const checkMatch = itemContent.match(/^\[([ xX])\] (.*)/);
        if (checkMatch) {
          const checked = checkMatch[1] !== " ";
          itemContent = checkMatch[2];
          html += `<li class="hm-list-item hm-task-item">
          <input type="checkbox" class="hm-checkbox" ${checked ? "checked" : ""} disabled />
          <span class="${checked ? "hm-task-done" : ""}">${renderInline(itemContent)}</span>
        </li>`;
        } else {
          html += `<li class="hm-list-item">${renderInline(itemContent)}</li>`;
        }
      }
      html += `</${tag}>`;
      return html;
    },
    table(block) {
      const lines = block.content.split("\n").filter((l) => l.trim());
      if (lines.length < 2) return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
      const parseRow = (line) => {
        return line.split("|").map((c) => c.trim()).filter((_, idx, arr) => {
          if (idx === 0 && arr[0] === "") return false;
          if (idx === arr.length - 1 && arr[arr.length - 1] === "") return false;
          return true;
        });
      };
      const headers = parseRow(lines[0]);
      const separators = parseRow(lines[1]);
      const aligns = separators.map((s) => {
        if (s.startsWith(":") && s.endsWith(":")) return "center";
        if (s.endsWith(":")) return "right";
        return "left";
      });
      let html = '<table class="hm-table"><thead><tr>';
      for (let i = 0; i < headers.length; i++) {
        const align = aligns[i] || "left";
        html += `<th class="hm-th" style="text-align:${align}">${renderInline(headers[i])}</th>`;
      }
      html += "</tr></thead><tbody>";
      for (let r = 2; r < lines.length; r++) {
        const cells = parseRow(lines[r]);
        const rowClass = r % 2 === 0 ? "hm-tr-even" : "hm-tr-odd";
        html += `<tr class="${rowClass}">`;
        for (let c = 0; c < headers.length; c++) {
          const align = aligns[c] || "left";
          const val = cells[c] || "";
          html += `<td class="hm-td" style="text-align:${align}">${renderInline(val)}</td>`;
        }
        html += "</tr>";
      }
      html += "</tbody></table>";
      return html;
    },
    thematic_break(_block) {
      return '<hr class="hm-hr" />';
    },
    frontmatter(block) {
      const lines = block.content.split("\n");
      const yamlLines = lines.slice(1, -1).filter((l) => l.trim() !== "");
      if (yamlLines.length === 0) return "";
      const preview = yamlLines[0];
      return `<details class="hm-frontmatter">
      <summary class="hm-frontmatter-badge">
        <span class="hm-fm-icon">\u{1F4CB}</span>
        <span class="hm-fm-label">Frontmatter</span>
        <span class="hm-fm-preview">${BlockRenderers._escHtml(preview)}${yamlLines.length > 1 ? ` (+${yamlLines.length - 1})` : ""}</span>
      </summary>
      <pre class="hm-fm-content"><code>${BlockRenderers._escHtml(yamlLines.join("\n"))}</code></pre>
    </details>`;
    },
    math_block(block) {
      const lines = block.content.split("\n");
      const math = lines.slice(1, -1).join("\n");
      return `<div class="hm-math-block">
      <div class="hm-math-content">${BlockRenderers._escHtml(math)}</div>
    </div>`;
    },
    render(block) {
      const renderer = BlockRenderers[block.type];
      if (renderer && typeof renderer === "function") {
        return renderer(block);
      }
      return `<p class="hm-paragraph">${renderInline(block.content)}</p>`;
    },
    _escHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    _escAttr(str) {
      return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  };
  var Transaction2 = class _Transaction {
    constructor({ type, offset, inserted = "", deleted = "", timestamp }) {
      this.type = type;
      this.offset = offset;
      this.inserted = inserted;
      this.deleted = deleted;
      this.timestamp = timestamp || Date.now();
    }
    invert() {
      return new _Transaction({
        type: this.type,
        offset: this.offset,
        inserted: this.deleted,
        deleted: this.inserted,
        timestamp: this.timestamp
      });
    }
  };
  var TransactionHistory = class {
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
      return batch.slice().reverse().map((tx) => tx.invert());
    }
    redo() {
      if (this._redoStack.length === 0) return null;
      const batch = this._redoStack.pop();
      this._undoStack.push(batch);
      return batch;
    }
    get canUndo() {
      return this._undoStack.length > 0 || this._currentBatch.length > 0;
    }
    get canRedo() {
      return this._redoStack.length > 0;
    }
    clear() {
      this._undoStack = [];
      this._redoStack = [];
      this._currentBatch = [];
    }
  };
  var DEFAULT_SLASH_COMMANDS = [
    { label: "Heading 1", icon: "H1", description: "Large heading", keywords: ["h1", "heading", "title"], markdown: "# " },
    { label: "Heading 2", icon: "H2", description: "Medium heading", keywords: ["h2", "heading", "subtitle"], markdown: "## " },
    { label: "Heading 3", icon: "H3", description: "Small heading", keywords: ["h3", "heading"], markdown: "### " },
    { label: "Code Block", icon: "</>", description: "Fenced code block", keywords: ["code", "fence", "programming"], markdown: "```\n\n```", cursorOffset: 4 },
    { label: "Quote", icon: "\u275D", description: "Blockquote", keywords: ["quote", "blockquote", "cite"], markdown: "> " },
    { label: "Bullet List", icon: "\u2022", description: "Unordered list", keywords: ["list", "bullet", "unordered", "ul"], markdown: "- " },
    { label: "Numbered List", icon: "1.", description: "Ordered list", keywords: ["list", "numbered", "ordered", "ol"], markdown: "1. " },
    { label: "Task List", icon: "\u2611", description: "Checklist / todo", keywords: ["task", "todo", "checkbox", "checklist"], markdown: "- [ ] " },
    { label: "Table", icon: "\u25A6", description: "Insert a table", keywords: ["table", "grid"], markdown: "| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |" },
    { label: "Divider", icon: "\u2014", description: "Horizontal rule", keywords: ["divider", "hr", "horizontal", "rule", "separator"], markdown: "---" },
    { label: "Callout", icon: "\u{1F4A1}", description: "Callout box", keywords: ["callout", "note", "warning", "tip", "admonition"], markdown: "> [!note]\n> " },
    { label: "Math Block", icon: "\u2211", description: "LaTeX math block", keywords: ["math", "latex", "equation", "formula"], markdown: "$$\n\n$$", cursorOffset: 3 }
  ];
  var SlashCommandMenu = class {
    constructor(container, commands = DEFAULT_SLASH_COMMANDS) {
      this.container = container;
      this.commands = commands;
      this.el = null;
      this.visible = false;
      this.selectedIndex = 0;
      this.filteredCommands = [];
      this.onSelect = null;
      this._query = "";
    }
    show(x, y, onSelect) {
      this.onSelect = onSelect;
      this._query = "";
      this.selectedIndex = 0;
      this.filteredCommands = [...this.commands];
      this.visible = true;
      if (!this.el) {
        this.el = document.createElement("div");
        this.el.className = "hm-slash-menu";
        this.container.appendChild(this.el);
      }
      this.el.style.display = "block";
      this.el.style.left = x + "px";
      this.el.style.top = y + "px";
      this._render();
    }
    hide() {
      this.visible = false;
      if (this.el) this.el.style.display = "none";
      this.onSelect = null;
    }
    filter(query) {
      this._query = query.toLowerCase();
      if (this._query === "") {
        this.filteredCommands = [...this.commands];
      } else {
        this.filteredCommands = this.commands.filter(
          (cmd) => cmd.label.toLowerCase().includes(this._query) || cmd.keywords.some((k) => k.includes(this._query))
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
      let html = "";
      for (let i = 0; i < this.filteredCommands.length; i++) {
        const cmd = this.filteredCommands[i];
        const selected = i === this.selectedIndex ? " hm-slash-selected" : "";
        html += `<div class="hm-slash-item${selected}" data-index="${i}">
        <span class="hm-slash-icon">${cmd.icon}</span>
        <div class="hm-slash-text">
          <span class="hm-slash-label">${cmd.label}</span>
          <span class="hm-slash-desc">${cmd.description}</span>
        </div>
      </div>`;
      }
      this.el.innerHTML = html;
      this.el.querySelectorAll(".hm-slash-item").forEach((item) => {
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          this.selectedIndex = parseInt(item.dataset.index);
          this.confirm();
        });
      });
    }
  };
  var VirtualViewport = class {
    constructor(scrollContainer, opts = {}) {
      this.scrollContainer = scrollContainer;
      this.overscan = opts.overscan ?? 3;
      this.estimatedBlockHeight = opts.estimatedBlockHeight ?? 60;
      this._measuredHeights = /* @__PURE__ */ new Map();
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
    setMeasuredHeight(blockId, height) {
      this._measuredHeights.set(blockId, height);
    }
    get totalHeight() {
      return this._totalHeight;
    }
    getVisibleRange(scrollTop, viewportHeight) {
      const top = scrollTop;
      const bottom = scrollTop + viewportHeight;
      let lo = 0, hi = this._blockPositions.length - 1, startIndex = 0;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (this._blockPositions[mid].top + this._blockPositions[mid].height < top) lo = mid + 1;
        else hi = mid - 1;
      }
      startIndex = Math.max(0, lo - this.overscan);
      lo = startIndex;
      hi = this._blockPositions.length - 1;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (this._blockPositions[mid].top > bottom) hi = mid - 1;
        else lo = mid + 1;
      }
      const endIndex = Math.min(this._blockPositions.length, lo + this.overscan);
      return { startIndex, endIndex, positions: this._blockPositions.slice(startIndex, endIndex) };
    }
    getBlockPosition(blockId) {
      return this._blockPositions.find((p) => p.id === blockId) || null;
    }
  };
  var BlockDragDrop = class {
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
        this.dragGhost.className = "hm-drag-ghost";
        this.dragGhost.style.position = "fixed";
        this.dragGhost.style.width = blockEl.offsetWidth + "px";
        this.dragGhost.style.opacity = "0.7";
        this.dragGhost.style.pointerEvents = "none";
        this.dragGhost.style.zIndex = "10000";
        document.body.appendChild(this.dragGhost);
        this._positionGhost(event);
      }
      document.body.classList.add("hm-dragging");
      document.addEventListener("mousemove", this._onMouseMove);
      document.addEventListener("mouseup", this._onMouseUp);
      event.preventDefault();
    }
    _onMouseMove(event) {
      if (!this.dragging) return;
      this._positionGhost(event);
      const blocks = this.editor.bridge.blocks;
      const containerRect = this.editor._contentEl.getBoundingClientRect();
      const y = event.clientY - containerRect.top + this.editor._scrollEl.scrollTop;
      this.editor._contentEl.querySelectorAll(".hm-drop-indicator").forEach((el) => el.remove());
      let targetIdx = -1, insertBefore = false;
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
        const targetEl = this.editor._getBlockElement(blocks[targetIdx].id);
        if (targetEl) {
          const indicator = document.createElement("div");
          indicator.className = "hm-drop-indicator";
          if (insertBefore) targetEl.parentElement.insertBefore(indicator, targetEl);
          else targetEl.parentElement.insertBefore(indicator, targetEl.nextSibling);
        }
      }
    }
    _onMouseUp(_event) {
      document.removeEventListener("mousemove", this._onMouseMove);
      document.removeEventListener("mouseup", this._onMouseUp);
      if (this.dragGhost) {
        this.dragGhost.remove();
        this.dragGhost = null;
      }
      this.editor._contentEl.querySelectorAll(".hm-drop-indicator").forEach((el) => el.remove());
      document.body.classList.remove("hm-dragging");
      if (this.dropTarget && this.dragBlockId) {
        this.editor._reorderBlock(this.dragBlockId, this.dropTarget);
      }
      this.dragging = false;
      this.dragBlockId = null;
      this.dropTarget = null;
    }
    _positionGhost(event) {
      if (this.dragGhost) {
        this.dragGhost.style.left = event.clientX + 10 + "px";
        this.dragGhost.style.top = event.clientY - 15 + "px";
      }
    }
  };
  var HYPERMARK_STYLES = `
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
  var _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const style = document.createElement("style");
    style.id = "hypermark-styles";
    style.textContent = HYPERMARK_STYLES;
    document.head.appendChild(style);
  }
  var HyperMarkEditor = class {
    constructor(container, config = {}) {
      _injectStyles();
      this.container = container;
      this.config = {
        content: config.content || "",
        onChange: config.onChange || null,
        onBlockFocus: config.onBlockFocus || null,
        onBlockBlur: config.onBlockBlur || null,
        readOnly: config.readOnly || false,
        virtualViewport: config.virtualViewport !== false,
        slashCommands: config.slashCommands || [],
        autoSaveDelay: config.autoSaveDelay ?? 1e3
      };
      this.bridge = new MarkdownBridge();
      this.history = new TransactionHistory();
      this.activeBlockId = null;
      this._autoSaveTimer = null;
      this._destroyed = false;
      this._initPromise = null;
      this._buildDOM();
      this.viewport = new VirtualViewport(this._scrollEl);
      this.dragDrop = new BlockDragDrop(this);
      this.slashMenu = new SlashCommandMenu(
        this._contentEl,
        [...DEFAULT_SLASH_COMMANDS, ...this.config.slashCommands]
      );
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
            id: "blk_0_paragraph",
            type: "paragraph",
            from: 0,
            to: 0,
            content: "",
            meta: {}
          })
        ];
      }
    }
    // --- DOM Construction ---
    _buildDOM() {
      this.container.innerHTML = "";
      this._editorEl = document.createElement("div");
      this._editorEl.className = "hm-editor";
      this._editorEl.setAttribute("role", "document");
      this._editorEl.setAttribute("aria-label", "HyperMark Editor");
      this._scrollEl = document.createElement("div");
      this._scrollEl.className = "hm-scroll";
      this._contentEl = document.createElement("div");
      this._contentEl.className = "hm-content";
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
            const ta = this._contentEl.querySelector(".hm-block-textarea");
            if (ta) {
              ta.selectionStart = ta.selectionEnd = ta.value.length;
              ta.focus();
            }
          });
        }
      };
      this._contentEl.addEventListener("mousedown", this._onContentAreaMouseDown);
      this._scrollEl.addEventListener("mousedown", (e) => {
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
      if (this.activeBlockId && !blocks.find((b) => b.id === this.activeBlockId)) {
        this.activeBlockId = null;
      }
      let activeContent = null, activeCursorPos = null;
      if (this.activeBlockId) {
        const textarea = this._contentEl.querySelector(".hm-block-textarea");
        if (textarea) {
          activeContent = textarea.value;
          activeCursorPos = textarea.selectionStart;
        }
      }
      this._contentEl.innerHTML = "";
      for (const block of blocks) {
        this._contentEl.appendChild(this._createBlockWrapper(block));
      }
      if (this.activeBlockId && activeContent !== null) {
        const textarea = this._contentEl.querySelector(".hm-block-textarea");
        if (textarea) {
          textarea.value = activeContent;
          textarea.selectionStart = activeCursorPos;
          textarea.selectionEnd = activeCursorPos;
          textarea.focus();
        }
      }
    }
    _renderVirtualized(blocks) {
      this.viewport.layout(blocks);
      const scrollTop = this._scrollEl.scrollTop;
      const viewportHeight = this._scrollEl.clientHeight;
      const { startIndex, endIndex } = this.viewport.getVisibleRange(scrollTop, viewportHeight);
      this._contentEl.innerHTML = "";
      const topSpacer = document.createElement("div");
      topSpacer.className = "hm-spacer";
      let topHeight = 0;
      for (let i = 0; i < startIndex; i++) topHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
      topSpacer.style.height = topHeight + "px";
      this._contentEl.appendChild(topSpacer);
      for (let i = startIndex; i < endIndex && i < blocks.length; i++) {
        this._contentEl.appendChild(this._createBlockWrapper(blocks[i]));
      }
      const bottomSpacer = document.createElement("div");
      bottomSpacer.className = "hm-spacer";
      let bottomHeight = 0;
      for (let i = endIndex; i < blocks.length; i++) bottomHeight += this.viewport._blockPositions[i]?.height || this.viewport.estimatedBlockHeight;
      bottomSpacer.style.height = bottomHeight + "px";
      this._contentEl.appendChild(bottomSpacer);
    }
    _createBlockWrapper(block) {
      const wrapper = document.createElement("div");
      wrapper.className = "hm-block-wrapper";
      wrapper.dataset.blockId = block.id;
      wrapper.dataset.blockType = block.type;
      if (!this.config.readOnly) {
        const handle = document.createElement("div");
        handle.className = "hm-drag-handle";
        handle.innerHTML = "\u283F";
        handle.title = "Drag to reorder";
        handle.addEventListener("mousedown", (e) => this.dragDrop.start(block.id, e));
        wrapper.appendChild(handle);
      }
      const contentDiv = document.createElement("div");
      contentDiv.className = "hm-block-content";
      if (this.activeBlockId === block.id && !this.config.readOnly) {
        wrapper.classList.add("hm-block-active");
        contentDiv.appendChild(this._createBlockTextarea(block));
      } else {
        contentDiv.innerHTML = BlockRenderers.render(block);
      }
      wrapper.appendChild(contentDiv);
      if (!this.config.readOnly) {
        wrapper.addEventListener("mousedown", (e) => {
          if (e.target.closest(".hm-drag-handle") || e.target.closest(".hm-block-textarea")) return;
          this._focusBlock(block.id);
        });
      }
      return wrapper;
    }
    _createBlockTextarea(block) {
      const textarea = document.createElement("textarea");
      textarea.className = "hm-block-textarea";
      textarea.value = block.content;
      textarea.spellcheck = true;
      textarea.setAttribute("data-block-id", block.id);
      const autoResize = () => {
        textarea.style.height = "0";
        textarea.style.height = Math.max(textarea.scrollHeight, 24) + "px";
      };
      textarea.addEventListener("input", () => {
        autoResize();
        this._onBlockEdit(block.id, textarea.value);
      });
      textarea.addEventListener("keydown", (e) => this._onTextareaKeydown(e, block, textarea));
      textarea.addEventListener("blur", (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && this._editorEl.contains(relatedTarget)) return;
        setTimeout(() => {
          if (this.activeBlockId === block.id && !this._destroyed) this._blurBlock();
        }, 150);
      });
      requestAnimationFrame(() => {
        autoResize();
        textarea.focus();
      });
      return textarea;
    }
    // --- Block Focus / Blur ---
    _focusBlock(blockId) {
      if (this.activeBlockId === blockId || this.config.readOnly) return;
      const block = this.bridge.blocks.find((b) => b.id === blockId);
      if (!block) return;
      if (this.activeBlockId) this._commitActiveBlock();
      this.activeBlockId = blockId;
      if (this.config.onBlockFocus) this.config.onBlockFocus(block);
      this._renderAllBlocks();
      this.container.dispatchEvent(new CustomEvent("hypermark-block-focus", { detail: { blockId, block } }));
    }
    _blurBlock() {
      if (!this.activeBlockId) return;
      const block = this.bridge.blocks.find((b) => b.id === this.activeBlockId);
      if (block && this.config.onBlockBlur) this.config.onBlockBlur(block);
      this._commitActiveBlock();
      this.activeBlockId = null;
      this._ensureAtLeastOneBlock();
      this._renderAllBlocks();
    }
    _commitActiveBlock() {
      if (!this.activeBlockId) return;
      const textarea = this._contentEl.querySelector(".hm-block-textarea");
      if (!textarea) return;
      let block = this.bridge.blocks.find((b) => b.id === this.activeBlockId);
      if (!block) {
        const taBlockId = textarea.getAttribute("data-block-id");
        if (taBlockId && taBlockId !== this.activeBlockId) {
          block = this.bridge.blocks.find((b) => b.id === taBlockId);
          if (block) this.activeBlockId = taBlockId;
        }
      }
      if (!block) return;
      const newContent = textarea.value;
      if (newContent === block.content) return;
      if (block.from === block.to && this.bridge.length === 0) {
        if (newContent.length > 0) {
          this.bridge._content = newContent;
        }
      } else {
        this.bridge._content = this.bridge._content.substring(0, block.from) + newContent + this.bridge._content.substring(block.to);
      }
      this.bridge._parse().then(() => {
        this._ensureAtLeastOneBlock();
      });
      this._dispatchChange();
    }
    // --- Block Editing ---
    async _onBlockEdit(blockId, newContent) {
      let block = this.bridge.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const oldContent = block.content;
      if (newContent === oldContent) return;
      this.history.push(new Transaction2({
        type: "replace",
        offset: block.from,
        inserted: newContent,
        deleted: oldContent
      }));
      const editFrom = block.from;
      const editOldTo = block.to;
      if (editFrom === editOldTo && this.bridge.length === 0) {
        this.bridge._content = newContent;
      } else {
        this.bridge._content = this.bridge._content.substring(0, editFrom) + newContent + this.bridge._content.substring(editOldTo);
      }
      await this.bridge._parse();
      this._ensureAtLeastOneBlock();
      const updatedBlock = this.bridge.blocks.find((b) => b.id === blockId);
      if (!updatedBlock) {
        const replacement = this.bridge.blockAt(editFrom);
        if (replacement) {
          if (this.activeBlockId === blockId) this.activeBlockId = replacement.id;
          const textarea = this._contentEl.querySelector(`.hm-block-textarea[data-block-id="${blockId}"]`);
          if (textarea) textarea.setAttribute("data-block-id", replacement.id);
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
      const lineStart = textBeforeCursor.lastIndexOf("\n") + 1;
      const lineText = textBeforeCursor.substring(lineStart);
      if (lineText.startsWith("/")) {
        const query = lineText.substring(1);
        const rect = textarea.getBoundingClientRect();
        const containerRect = this._contentEl.getBoundingClientRect();
        const lines = textBeforeCursor.split("\n");
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
        const y = rect.top - containerRect.top + lines.length * lineHeight + this._scrollEl.scrollTop;
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
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
    // --- Keyboard Handling ---
    _onTextareaKeydown(e, block, textarea) {
      if (this.slashMenu.visible) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.slashMenu.down();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this.slashMenu.up();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          this.slashMenu.confirm();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this.slashMenu.hide();
          return;
        }
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        this._undo();
        return;
      }
      if (e.key === "y" && (e.ctrlKey || e.metaKey) || e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        this._redo();
        return;
      }
      if (e.key === "ArrowUp" && !e.shiftKey) {
        const textBefore = textarea.value.substring(0, textarea.selectionStart);
        if (!textBefore.includes("\n")) {
          e.preventDefault();
          this._focusPreviousBlock(block.id);
          return;
        }
      }
      if (e.key === "ArrowDown" && !e.shiftKey) {
        const textAfter = textarea.value.substring(textarea.selectionStart);
        if (!textAfter.includes("\n")) {
          e.preventDefault();
          this._focusNextBlock(block.id);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (block.type === "code_block") return;
        e.preventDefault();
        const cursorPos = textarea.selectionStart;
        const contentBefore = textarea.value.substring(0, cursorPos);
        const contentAfter = textarea.value.substring(cursorPos);
        if (textarea.value.trim() === "" && contentBefore.trim() === "") {
          this._blurBlock();
          return;
        }
        this._splitBlockAtCursor(block, contentBefore, contentAfter);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this._blurBlock();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const indent = block.type === "code_block" ? "  " : "    ";
        textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if (e.key === "Backspace" && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();
        this._mergeWithPreviousBlock(block.id);
        return;
      }
    }
    _focusPreviousBlock(currentBlockId) {
      const blocks = this.bridge.blocks;
      const idx = blocks.findIndex((b) => b.id === currentBlockId);
      if (idx > 0) {
        this._focusBlock(blocks[idx - 1].id);
        requestAnimationFrame(() => {
          const textarea = this._contentEl.querySelector(".hm-block-textarea");
          if (textarea) textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        });
      }
    }
    _focusNextBlock(currentBlockId) {
      const blocks = this.bridge.blocks;
      const idx = blocks.findIndex((b) => b.id === currentBlockId);
      if (idx < blocks.length - 1) {
        this._focusBlock(blocks[idx + 1].id);
        requestAnimationFrame(() => {
          const textarea = this._contentEl.querySelector(".hm-block-textarea");
          if (textarea) textarea.selectionStart = textarea.selectionEnd = 0;
        });
      }
    }
    async _mergeWithPreviousBlock(blockId) {
      const blocks = this.bridge.blocks;
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx <= 0) return;
      const prevBlock = blocks[idx - 1];
      const currentBlock = blocks[idx];
      const mergedContent = prevBlock.content + "\n" + currentBlock.content;
      const originalContent = this.bridge.slice(prevBlock.from, currentBlock.to);
      this.history.push(new Transaction2({ type: "replace", offset: prevBlock.from, inserted: mergedContent, deleted: originalContent }));
      await this.bridge.replace(prevBlock.from, currentBlock.to, mergedContent);
      this._ensureAtLeastOneBlock();
      this.activeBlockId = null;
      const newBlocks = this.bridge.blocks;
      if (newBlocks.length > 0) {
        const targetIdx = Math.min(idx - 1, newBlocks.length - 1);
        const cursorOffset = prevBlock.content.length;
        this._focusBlock(newBlocks[targetIdx].id);
        requestAnimationFrame(() => {
          const ta = this._contentEl.querySelector(".hm-block-textarea");
          if (ta) {
            ta.selectionStart = ta.selectionEnd = cursorOffset;
            ta.focus();
          }
        });
      } else {
        this._renderAllBlocks();
      }
      this._dispatchChange();
    }
    async _splitBlockAtCursor(block, contentBefore, contentAfter) {
      let currentBlock = this.bridge.blocks.find((b) => b.id === block.id);
      if (!currentBlock) currentBlock = this.bridge.blockAt(block.from);
      if (!currentBlock) return;
      const oldContent = currentBlock.content;
      const newBufferContent = contentBefore + "\n" + contentAfter;
      this.history.push(new Transaction2({ type: "replace", offset: currentBlock.from, inserted: newBufferContent, deleted: oldContent }));
      await this.bridge.replace(currentBlock.from, currentBlock.to, newBufferContent);
      this._ensureAtLeastOneBlock();
      const newBlockOffset = currentBlock.from + contentBefore.length + 1;
      let newBlock = this.bridge.blockAt(newBlockOffset);
      if (!newBlock) {
        const blocks = this.bridge.blocks;
        const currentIdx = blocks.findIndex((b) => b.from <= currentBlock.from && b.to >= currentBlock.from);
        if (currentIdx >= 0 && currentIdx + 1 < blocks.length) newBlock = blocks[currentIdx + 1];
      }
      if (!newBlock) newBlock = this.bridge.blockAt(currentBlock.from);
      this.activeBlockId = null;
      if (newBlock) {
        this._focusBlock(newBlock.id);
        requestAnimationFrame(() => {
          const ta = this._contentEl.querySelector(".hm-block-textarea");
          if (ta) {
            ta.selectionStart = ta.selectionEnd = 0;
            ta.focus();
          }
        });
      } else {
        this._renderAllBlocks();
      }
      this._dispatchChange();
    }
    // --- Block Reorder (Drag & Drop) ---
    async _reorderBlock(blockId, target) {
      const blocks = this.bridge.blocks;
      const sourceIdx = blocks.findIndex((b) => b.id === blockId);
      if (sourceIdx === -1) return;
      const sourceBlock = blocks[sourceIdx];
      const sourceContent = sourceBlock.content;
      let deleteFrom = sourceBlock.from;
      let deleteTo = sourceBlock.to;
      const fullText = this.bridge.toString();
      if (deleteTo < fullText.length && fullText[deleteTo] === "\n") deleteTo++;
      await this.bridge.delete(deleteFrom, deleteTo);
      let insertIdx = target.index;
      if (sourceIdx < target.index) insertIdx--;
      if (!target.before) insertIdx++;
      insertIdx = Math.max(0, Math.min(insertIdx, this.bridge.blocks.length));
      let insertOffset;
      if (insertIdx >= this.bridge.blocks.length) insertOffset = this.bridge.length;
      else insertOffset = this.bridge.blocks[insertIdx].from;
      let insertText = sourceContent;
      if (insertOffset > 0 && this.bridge.slice(insertOffset - 1, insertOffset) !== "\n") insertText = "\n" + insertText;
      if (insertOffset < this.bridge.length && this.bridge.slice(insertOffset, insertOffset + 1) !== "\n") insertText = insertText + "\n";
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
      this._editorEl.addEventListener("mousedown", (e) => {
        if (e.target === this._contentEl || e.target === this._scrollEl) return;
        if (!e.target.closest(".hm-block-wrapper") && this.activeBlockId) this._blurBlock();
      });
      if (this.config.virtualViewport) {
        this._scrollEl.addEventListener("scroll", () => {
          if (this.bridge.blocks.length > 50) this._renderVirtualized(this.bridge.blocks);
        });
      }
      this._editorEl.addEventListener("keydown", (e) => {
        if (!this.activeBlockId) {
          if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            e.preventDefault();
            this._undo();
          }
          if (e.key === "y" && (e.ctrlKey || e.metaKey) || e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
            e.preventDefault();
            this._redo();
          }
        }
      });
    }
    _dispatchChange() {
      const content = this.bridge.toString();
      if (this.config.onChange) this.config.onChange(content);
      this.container.dispatchEvent(new CustomEvent("hypermark-change", { detail: { content } }));
    }
    _scheduleAutoSave() {
      if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = setTimeout(() => {
        this.container.dispatchEvent(new CustomEvent("hypermark-autosave", { detail: { content: this.bridge.toString() } }));
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
    async setContent(markdown2) {
      this.activeBlockId = null;
      await this.bridge.setContent(markdown2);
      this._ensureAtLeastOneBlock();
      this.history.clear();
      this._renderAllBlocks();
      this._dispatchChange();
    }
    async insertAt(offset, text) {
      await this.bridge.insert(offset, text);
      this.history.push(new Transaction2({ type: "insert", offset, inserted: text }));
      this._ensureAtLeastOneBlock();
      this._renderAllBlocks();
      this._dispatchChange();
    }
    focusBlock(blockId) {
      this._focusBlock(blockId);
    }
    focusBlockByIndex(index) {
      const block = this.bridge.blocks[index];
      if (block) this._focusBlock(block.id);
    }
    scrollToBlock(blockId) {
      const el = this._getBlockElement(blockId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    getBlocks() {
      return [...this.bridge.blocks];
    }
    getBlock(blockId) {
      return this.bridge.blocks.find((b) => b.id === blockId);
    }
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
      return this.bridge.blocks.map((block) => {
        const lower = block.content.toLowerCase();
        const matches = [];
        let pos = 0;
        while ((pos = lower.indexOf(lowerQuery, pos)) !== -1) {
          matches.push(pos);
          pos += query.length;
        }
        return matches.length > 0 ? { block, matches } : null;
      }).filter(Boolean);
    }
    getTableOfContents() {
      return this.bridge.blocks.filter((b) => b.type === "heading").map((b) => ({
        level: b.meta.level,
        text: b.meta.text || b.content.replace(/^#{1,6}\s+/, ""),
        blockId: b.id,
        anchor: (b.meta.text || b.content.replace(/^#{1,6}\s+/, "")).toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")
      }));
    }
    getStats() {
      const content = this.bridge.toString();
      const words = content.trim() ? content.trim().split(/\s+/).length : 0;
      return { words, characters: content.length, blocks: this.bridge.blocks.length, lines: this.bridge.lineCount };
    }
    insertAtCursor(text) {
      if (this.activeBlockId) {
        const textarea = this._contentEl.querySelector(".hm-block-textarea");
        if (textarea) {
          const start = textarea.selectionStart;
          textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(start);
          textarea.selectionStart = textarea.selectionEnd = start + text.length;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
          return;
        }
      }
      const offset = this.bridge.length;
      const insertText = (offset > 0 ? "\n" : "") + text;
      this.bridge.insert(offset, insertText).then(() => {
        this._renderAllBlocks();
        this._dispatchChange();
      });
    }
    wrapSelection(before, after) {
      if (this.activeBlockId) {
        const textarea = this._contentEl.querySelector(".hm-block-textarea");
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const value = textarea.value;
          const selected = value.substring(start, end) || "text";
          textarea.value = value.substring(0, start) + before + selected + after + value.substring(end);
          textarea.selectionStart = start + before.length;
          textarea.selectionEnd = start + before.length + selected.length;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
        }
      }
    }
    destroy() {
      this._destroyed = true;
      if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
      this.slashMenu.hide();
      this.container.innerHTML = "";
    }
  };

  // src/js/update.js
  init_tauri_bridge();
  var UpdateManager = class {
    constructor(app) {
      this.app = app;
      this.updateInfo = null;
      this.bannerEl = null;
    }
    /**
     * Check for updates on startup (if enabled in settings)
     */
    async checkOnStartup() {
      const checkEnabled = localStorage.getItem("oxidian-update-check") !== "false";
      if (!checkEnabled) return;
      try {
        await this.checkForUpdate(false);
      } catch (e) {
        console.log("[Updater] Startup check failed (offline?):", e);
      }
    }
    /**
     * Check for update and optionally show result even if up-to-date
     */
    async checkForUpdate(showUpToDate = true) {
      try {
        const info = await invoke("check_update");
        if (info) {
          this.updateInfo = info;
          this.showUpdateBanner(info);
          const autoInstall = localStorage.getItem("oxidian-auto-install-updates") === "true";
          if (autoInstall) {
            await this.downloadAndInstall();
          }
        } else if (showUpToDate) {
          this.showNotification("You're on the latest version!", "success");
        }
      } catch (err) {
        console.error("[Updater] Check failed:", err);
        if (showUpToDate) {
          this.showNotification("Failed to check for updates: " + err, "error");
        }
      }
    }
    /**
     * Show update available banner at top of app
     */
    showUpdateBanner(info) {
      this.removeBanner();
      const banner = document.createElement("div");
      banner.className = "update-banner";
      banner.innerHTML = `
            <div class="update-banner-content">
                <span class="update-banner-icon">\u{1F680}</span>
                <span class="update-banner-text">
                    <strong>Oxidian v${this.escHtml(info.version)}</strong> is available!
                </span>
                <button class="update-btn-changelog" title="View changelog">Changelog</button>
                <button class="update-btn-install">Update Now</button>
                <button class="update-btn-later">Later</button>
            </div>
            <div class="update-changelog" style="display:none">
                <pre>${this.escHtml(info.changelog || "No changelog provided.")}</pre>
            </div>
            <div class="update-progress" style="display:none">
                <div class="update-progress-bar"><div class="update-progress-fill"></div></div>
                <span class="update-progress-text">Downloading...</span>
            </div>
        `;
      banner.querySelector(".update-btn-changelog").addEventListener("click", () => {
        const cl = banner.querySelector(".update-changelog");
        cl.style.display = cl.style.display === "none" ? "block" : "none";
      });
      banner.querySelector(".update-btn-install").addEventListener("click", () => {
        this.downloadAndInstall(banner);
      });
      banner.querySelector(".update-btn-later").addEventListener("click", () => {
        this.removeBanner();
      });
      const contentArea = document.getElementById("content-area") || document.getElementById("app") || document.body;
      contentArea.prepend(banner);
      this.bannerEl = banner;
    }
    /**
     * Download and install the update
     */
    async downloadAndInstall(banner) {
      if (!this.updateInfo) return;
      if (!this.updateInfo.download_url) {
        this.showNotification("No download available for your platform. Please download manually from GitHub.", "error");
        return;
      }
      if (banner) {
        const content = banner.querySelector(".update-banner-content");
        const progress = banner.querySelector(".update-progress");
        if (content) content.style.display = "none";
        if (progress) progress.style.display = "flex";
      }
      try {
        await invoke("download_and_install_update", {
          downloadUrl: this.updateInfo.download_url
        });
        this.showRestartDialog();
      } catch (err) {
        console.error("[Updater] Install failed:", err);
        this.showNotification("Update failed: " + err, "error");
        if (banner) {
          const content = banner.querySelector(".update-banner-content");
          const progress = banner.querySelector(".update-progress");
          if (content) content.style.display = "flex";
          if (progress) progress.style.display = "none";
        }
      }
    }
    /**
     * Show restart required dialog
     */
    showRestartDialog() {
      const dialog = document.createElement("div");
      dialog.className = "update-restart-dialog";
      dialog.innerHTML = `
            <div class="update-restart-overlay"></div>
            <div class="update-restart-content">
                <h3>Update Installed</h3>
                <p>Oxidian has been updated. A restart is required to apply changes.</p>
                <div class="update-restart-actions">
                    <button class="update-btn-restart">Restart Now</button>
                    <button class="update-btn-dismiss">Later</button>
                </div>
            </div>
        `;
      dialog.querySelector(".update-btn-restart").addEventListener("click", async () => {
        try {
          const { relaunch } = window.__TAURI__.process;
          await relaunch();
        } catch {
          dialog.querySelector("p").textContent = "Please restart Oxidian manually.";
        }
      });
      dialog.querySelector(".update-btn-dismiss").addEventListener("click", () => {
        dialog.remove();
      });
      dialog.querySelector(".update-restart-overlay").addEventListener("click", () => {
        dialog.remove();
      });
      document.body.appendChild(dialog);
    }
    /**
     * Remove the update banner
     */
    removeBanner() {
      if (this.bannerEl) {
        this.bannerEl.remove();
        this.bannerEl = null;
      }
      document.querySelectorAll(".update-banner").forEach((el) => el.remove());
    }
    /**
     * Show a brief notification
     */
    showNotification(message, type = "info") {
      const notif = document.createElement("div");
      notif.className = `update-notification update-notification-${type}`;
      notif.textContent = message;
      document.body.appendChild(notif);
      setTimeout(() => {
        notif.classList.add("update-notification-hide");
        setTimeout(() => notif.remove(), 300);
      }, 4e3);
    }
    escHtml(text) {
      const div = document.createElement("div");
      div.textContent = text || "";
      return div.innerHTML;
    }
  };

  // src/js/backlinks.js
  init_tauri_bridge();
  var BacklinksManager = class {
    constructor(app) {
      this.app = app;
      this.currentBacklinks = [];
    }
    /**
     * Get all backlinks for a given note path via Rust.
     * Returns Array<{ source: string, snippets: string[] }>
     */
    async getBacklinks(notePath) {
      try {
        const results = await invoke("get_backlinks", { filePath: notePath });
        this.currentBacklinks = results;
        return results;
      } catch (err) {
        console.error("BacklinksManager: failed to get backlinks", err);
        this.currentBacklinks = [];
        return [];
      }
    }
    /**
     * Update the statusbar backlink count and panel if open.
     */
    async updateForNote(notePath) {
      const backlinks = await this.getBacklinks(notePath);
      const countEl = document.getElementById("backlink-count");
      if (countEl) {
        countEl.textContent = `${backlinks.length} backlink${backlinks.length !== 1 ? "s" : ""}`;
      }
      if (this.app.backlinksPanelOpen) {
        this.renderPanel(backlinks);
      }
    }
    /**
     * Render the backlinks panel with context snippets.
     */
    renderPanel(backlinks) {
      const list = document.querySelector("#backlinks-panel .backlinks-panel-list");
      if (!list) return;
      if (!backlinks || backlinks.length === 0) {
        list.innerHTML = '<div class="backlink-panel-empty">No backlinks found</div>';
        return;
      }
      list.innerHTML = "";
      backlinks.forEach(({ source, snippets }) => {
        const item = document.createElement("div");
        item.className = "backlink-panel-item";
        const name = source.replace(/\.md$/, "").split("/").pop();
        const folder = source.includes("/") ? source.substring(0, source.lastIndexOf("/")) : "";
        const header = document.createElement("div");
        header.className = "backlink-item-header";
        header.innerHTML = `
                <span class="backlink-item-icon">\u{1F4C4}</span>
                <span class="backlink-item-name">${this._escapeHtml(name)}</span>
                ${folder ? `<span class="backlink-item-folder">${this._escapeHtml(folder)}</span>` : ""}
            `;
        header.style.cursor = "pointer";
        header.addEventListener("click", () => this.app.openFile(source));
        item.appendChild(header);
        if (snippets && snippets.length > 0) {
          const snippetContainer = document.createElement("div");
          snippetContainer.className = "backlink-snippets";
          snippets.slice(0, 3).forEach((s) => {
            const snippetEl = document.createElement("div");
            snippetEl.className = "backlink-snippet";
            const highlighted = s.replace(/\[\[([^\]]+)\]\]/g, "<mark>$1</mark>");
            snippetEl.innerHTML = highlighted;
            snippetEl.addEventListener("click", () => this.app.openFile(source));
            snippetContainer.appendChild(snippetEl);
          });
          item.appendChild(snippetContainer);
        }
        list.appendChild(item);
      });
    }
    /**
     * Invalidate is now a no-op since Rust manages the index.
     */
    invalidate() {
    }
    // --- Helpers ---
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/templates.js
  init_tauri_bridge();
  var TemplateManager = class {
    constructor(app) {
      this.app = app;
    }
    /**
     * Get all available templates from Rust backend.
     */
    async getTemplates() {
      try {
        return await invoke("list_templates", { vaultPath: this.app.vaultPath || "" });
      } catch (err) {
        console.error("Failed to list templates:", err);
        return [];
      }
    }
    /**
     * Show the template picker dialog (Ctrl+T).
     */
    async showPicker() {
      const existing = document.getElementById("template-picker-overlay");
      if (existing) {
        existing.remove();
        return;
      }
      const templates = await this.getTemplates();
      const overlay = document.createElement("div");
      overlay.id = "template-picker-overlay";
      overlay.className = "command-palette-overlay";
      const palette = document.createElement("div");
      palette.className = "command-palette";
      const input = document.createElement("input");
      input.className = "command-palette-input";
      input.placeholder = "Choose a template...";
      input.autocomplete = "off";
      const results = document.createElement("div");
      results.className = "command-palette-results";
      const noteNameWrap = document.createElement("div");
      noteNameWrap.className = "template-note-name-wrap";
      noteNameWrap.style.display = "none";
      noteNameWrap.innerHTML = `
            <div style="padding: 8px 12px; font-size: 12px; color: var(--text-secondary);">Note name:</div>
            <input class="command-palette-input template-note-name" placeholder="Enter note name..." autocomplete="off">
        `;
      palette.appendChild(input);
      palette.appendChild(results);
      palette.appendChild(noteNameWrap);
      overlay.appendChild(palette);
      document.body.appendChild(overlay);
      let selectedIndex = 0;
      let filtered = [...templates];
      let selectedTemplate = null;
      const render = () => {
        results.innerHTML = "";
        if (filtered.length === 0) {
          results.innerHTML = '<div class="command-palette-empty">No templates found</div>';
          return;
        }
        filtered.forEach((tpl, i) => {
          const item = document.createElement("div");
          item.className = "command-palette-item" + (i === selectedIndex ? " selected" : "");
          item.innerHTML = `
                    <span class="command-palette-name">\u{1F4C4} ${this._escapeHtml(tpl.name)}</span>
                `;
          item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            selectedIndex = i;
            selectTemplate(filtered[i]);
          });
          item.addEventListener("mouseenter", () => {
            selectedIndex = i;
            render();
          });
          results.appendChild(item);
        });
      };
      const selectTemplate = (tpl) => {
        selectedTemplate = tpl;
        input.style.display = "none";
        results.style.display = "none";
        noteNameWrap.style.display = "block";
        const noteInput = noteNameWrap.querySelector(".template-note-name");
        noteInput.focus();
        noteInput.addEventListener("keydown", async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            await this.createFromTemplate(selectedTemplate, noteInput.value.trim());
            overlay.remove();
          } else if (e.key === "Escape") {
            overlay.remove();
          }
        });
      };
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        filtered = templates.filter((t) => t.name.toLowerCase().includes(q));
        selectedIndex = 0;
        render();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
          render();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
          render();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filtered[selectedIndex]) selectTemplate(filtered[selectedIndex]);
        } else if (e.key === "Escape") {
          overlay.remove();
        }
      });
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      render();
      input.focus();
    }
    /**
     * Create a new note from a template via Rust backend.
     */
    async createFromTemplate(template, noteName) {
      if (!noteName) noteName = "Untitled";
      try {
        const result = await invoke("apply_template", {
          templatePath: template.path,
          title: noteName
        });
        const path = result.path || result;
        await this.app.openFile(path);
        await this.app.sidebar?.refresh();
      } catch (err) {
        console.error("Failed to create from template:", err);
        this.app.showErrorToast?.(`Failed to apply template: ${err.message || err}`);
      }
    }
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/quickswitcher.js
  init_tauri_bridge();
  var QuickSwitcher = class {
    constructor(app) {
      this.app = app;
    }
    /**
     * Show the Quick Switcher overlay.
     */
    async show() {
      const existing = document.getElementById("quick-switcher-overlay");
      if (existing) {
        existing.remove();
        return;
      }
      const overlay = document.createElement("div");
      overlay.id = "quick-switcher-overlay";
      overlay.className = "command-palette-overlay";
      const switcher = document.createElement("div");
      switcher.className = "command-palette quick-switcher";
      const input = document.createElement("input");
      input.className = "command-palette-input";
      input.placeholder = "Quick switch \u2014 type to search notes...";
      input.autocomplete = "off";
      const body = document.createElement("div");
      body.className = "quick-switcher-body";
      const results = document.createElement("div");
      results.className = "command-palette-results quick-switcher-results";
      const preview = document.createElement("div");
      preview.className = "quick-switcher-preview";
      preview.innerHTML = '<div class="quick-switcher-preview-empty">Select a note to preview</div>';
      body.appendChild(results);
      body.appendChild(preview);
      switcher.appendChild(input);
      switcher.appendChild(body);
      overlay.appendChild(switcher);
      document.body.appendChild(overlay);
      let selectedIndex = 0;
      let filtered = await this._getInitialList();
      const renderList = () => {
        results.innerHTML = "";
        if (filtered.length === 0) {
          results.innerHTML = '<div class="command-palette-empty">No matching notes</div>';
          preview.innerHTML = '<div class="quick-switcher-preview-empty">No match</div>';
          return;
        }
        filtered.forEach((item, i) => {
          const el = document.createElement("div");
          el.className = "command-palette-item" + (i === selectedIndex ? " selected" : "");
          const name = item.path.replace(/\.md$/, "").split("/").pop();
          const folder = item.path.includes("/") ? item.path.substring(0, item.path.lastIndexOf("/")) : "";
          el.innerHTML = `
                    <span class="command-palette-name">${item.recent ? "\u{1F550} " : ""}${this._escapeHtml(name)}</span>
                    ${folder ? `<span class="command-palette-shortcut">${this._escapeHtml(folder)}</span>` : ""}
                `;
          el.addEventListener("mousedown", (e) => {
            e.preventDefault();
            overlay.remove();
            this.app.openFile(item.path);
          });
          el.addEventListener("mouseenter", () => {
            selectedIndex = i;
            renderList();
            this._loadPreview(item.path, preview);
          });
          results.appendChild(el);
        });
        if (filtered[selectedIndex]) {
          this._loadPreview(filtered[selectedIndex].path, preview);
        }
      };
      let searchTimeout = null;
      input.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          const q = input.value.trim();
          if (!q) {
            filtered = await this._getInitialList();
          } else {
            try {
              const rustResults = await invoke("fuzzy_search", { query: q });
              filtered = (rustResults || []).slice(0, 50).map((r) => ({
                path: r.path,
                score: r.score || 0,
                recent: this._isRecentFile(r.path)
              }));
            } catch (err) {
              console.error("Fuzzy search failed:", err);
              filtered = [];
            }
          }
          selectedIndex = 0;
          renderList();
        }, 100);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % Math.max(1, filtered.length);
          renderList();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + filtered.length) % Math.max(1, filtered.length);
          renderList();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (!filtered[selectedIndex]) return;
          overlay.remove();
          if (e.ctrlKey || e.metaKey) {
            this.app.openFileInSplit(filtered[selectedIndex].path);
          } else {
            this.app.openFile(filtered[selectedIndex].path);
          }
        } else if (e.key === "Escape") {
          overlay.remove();
        }
      });
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      renderList();
      input.focus();
    }
    /**
     * Get initial list: recent files first, then all files (via Rust).
     */
    async _getInitialList() {
      try {
        const allFiles = await invoke("fuzzy_search", { query: "" });
        const recent = (this.app.recentFiles || []).slice(0, 5);
        const recentSet = new Set(recent);
        const items = [];
        for (const path of recent) {
          items.push({ path, score: 0, recent: true });
        }
        for (const r of allFiles || []) {
          if (!recentSet.has(r.path)) {
            items.push({ path: r.path, score: 0, recent: false });
          }
        }
        return items.slice(0, 50);
      } catch {
        return [];
      }
    }
    _isRecentFile(path) {
      return (this.app.recentFiles || []).includes(path);
    }
    async _loadPreview(path, previewEl) {
      try {
        const content = await invoke("read_note", { path });
        const words = content.split(/\s+/).slice(0, 500).join(" ");
        const html = await this.app.renderMarkdown(words);
        const stats = this._getContentStats(content);
        const metadata = `
                <div class="quick-switcher-preview-meta">
                    <span>${stats.words} words</span>
                    <span>${stats.lines} lines</span>
                    <span>${this._formatFileSize(content.length)}</span>
                    ${this._isRecentFile(path) ? '<span class="recent-badge">Recent</span>' : ""}
                </div>
            `;
        previewEl.innerHTML = `
                <div class="quick-switcher-preview-header">
                    <h4>${path.replace(".md", "").split("/").pop()}</h4>
                    <span class="quick-switcher-preview-path">${path}</span>
                </div>
                ${metadata}
                <div class="quick-switcher-preview-content">${html}</div>
            `;
      } catch (error) {
        previewEl.innerHTML = `
                <div class="quick-switcher-preview-empty">
                    Failed to load preview: ${error.message}
                </div>
            `;
      }
    }
    _getContentStats(content) {
      const lines = content.split("\n").length;
      const words = content.split(/\s+/).filter((w) => w.length > 0).length;
      return { lines, words };
    }
    _formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
      return Math.round(bytes / (1024 * 1024)) + " MB";
    }
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/callouts.js
  var CalloutProcessor = class {
    constructor() {
      this.calloutTypes = {
        note: { icon: "\u2139\uFE0F", color: "var(--callout-note,     #448aff)", label: "Note" },
        info: { icon: "\u2139\uFE0F", color: "var(--callout-info,     #448aff)", label: "Info" },
        warning: { icon: "\u26A0\uFE0F", color: "var(--callout-warning,  #ff9100)", label: "Warning" },
        caution: { icon: "\u26A0\uFE0F", color: "var(--callout-warning,  #ff9100)", label: "Caution" },
        danger: { icon: "\u{1F534}", color: "var(--callout-danger,   #ff5252)", label: "Danger" },
        error: { icon: "\u{1F534}", color: "var(--callout-danger,   #ff5252)", label: "Error" },
        tip: { icon: "\u{1F4A1}", color: "var(--callout-tip,      #00c853)", label: "Tip" },
        hint: { icon: "\u{1F4A1}", color: "var(--callout-tip,      #00c853)", label: "Hint" },
        example: { icon: "\u{1F4CB}", color: "var(--callout-example,  #7c4dff)", label: "Example" },
        todo: { icon: "\u2611\uFE0F", color: "var(--callout-todo,     #448aff)", label: "Todo" },
        abstract: { icon: "\u{1F4D1}", color: "var(--callout-abstract, #00b0ff)", label: "Abstract" },
        summary: { icon: "\u{1F4D1}", color: "var(--callout-abstract, #00b0ff)", label: "Summary" },
        quote: { icon: "\u{1F4AC}", color: "var(--callout-quote,    #9e9e9e)", label: "Quote" },
        bug: { icon: "\u{1F41B}", color: "var(--callout-bug,      #ff5252)", label: "Bug" },
        success: { icon: "\u2705", color: "var(--callout-success,  #00c853)", label: "Success" },
        failure: { icon: "\u274C", color: "var(--callout-failure,  #ff5252)", label: "Failure" },
        question: { icon: "\u2753", color: "var(--callout-question, #ff9100)", label: "Question" }
      };
    }
    /**
     * Render a callout from a Rust AST block.
     * Called by BlockRenderers or directly when processing AST blocks.
     * 
     * @param {Object} block - Block with type 'callout' and meta.calloutType
     * @param {string} block.content - Raw markdown content
     * @param {Object} block.meta - { calloutType: string, collapsible?: boolean }
     * @returns {HTMLElement} Callout DOM element
     */
    renderFromBlock(block) {
      const typeName = (block.meta?.calloutType || "note").toLowerCase();
      const config = this.calloutTypes[typeName] || this.calloutTypes.note;
      const collapsible = block.meta?.collapsible || false;
      const lines = block.content.split("\n");
      const firstLine = lines[0] || "";
      const titleMatch = firstLine.match(/^>\s*\[!\w+\]([+-])?\s*(.*)/);
      const title = titleMatch?.[2]?.trim() || config.label;
      const isCollapsed = titleMatch?.[1] === "-";
      const bodyLines = lines.slice(1).map((l) => l.replace(/^>\s?/, ""));
      const bodyText = bodyLines.join("\n").trim();
      return this._buildCalloutElement(typeName, config, title, bodyText, collapsible || !!titleMatch?.[1], isCollapsed);
    }
    /**
     * Build callout DOM element.
     * @private
     */
    _buildCalloutElement(typeName, config, title, bodyText, collapsible, isCollapsed) {
      const callout = document.createElement("div");
      callout.className = `callout callout-${typeName}`;
      callout.style.cssText = `
            border-left: 4px solid ${config.color};
            background: color-mix(in srgb, ${config.color} 8%, var(--bg-primary, #1e1e2e));
            border-radius: 6px;
            padding: 0;
            margin: 12px 0;
            overflow: hidden;
        `;
      const header = document.createElement("div");
      header.className = "callout-header";
      header.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-weight: 600;
            color: ${config.color};
            background: color-mix(in srgb, ${config.color} 12%, transparent);
            ${collapsible ? "cursor: pointer;" : ""}
        `;
      header.innerHTML = `<span class="callout-icon">${config.icon}</span><span class="callout-title">${this._escapeHtml(title)}</span>`;
      if (collapsible) {
        const chevron = document.createElement("span");
        chevron.className = "callout-chevron";
        chevron.style.cssText = `margin-left: auto; transition: transform 0.2s ease; font-size: 12px;`;
        chevron.textContent = "\u25B6";
        if (!isCollapsed) chevron.style.transform = "rotate(90deg)";
        header.appendChild(chevron);
      }
      const body = document.createElement("div");
      body.className = "callout-body";
      body.style.cssText = `
            padding: 8px 12px 12px;
            color: var(--text-primary, #cdd6f4);
            ${isCollapsed ? "display: none;" : ""}
        `;
      if (bodyText) {
        const p = document.createElement("p");
        p.textContent = bodyText;
        body.appendChild(p);
      }
      if (collapsible) {
        header.addEventListener("click", () => {
          const isHidden = body.style.display === "none";
          body.style.display = isHidden ? "" : "none";
          const chevron = header.querySelector(".callout-chevron");
          if (chevron) chevron.style.transform = isHidden ? "rotate(90deg)" : "";
        });
      }
      callout.appendChild(header);
      if (bodyText) callout.appendChild(body);
      return callout;
    }
    /**
     * Process rendered HTML to transform blockquotes containing [!type] into callout boxes.
     * Legacy path — used when processing already-rendered HTML (not from AST).
     * @param {string} html - The rendered HTML from markdown
     * @returns {string} HTML with callout blocks
     */
    process(html) {
      const container = document.createElement("div");
      container.innerHTML = html;
      this.processElement(container);
      return container.innerHTML;
    }
    /**
     * Process callouts in an already-mounted DOM element (for live preview).
     */
    processElement(el) {
      const blockquotes = el.querySelectorAll("blockquote");
      for (const bq of blockquotes) {
        this._transformBlockquote(bq);
      }
    }
    _transformBlockquote(bq) {
      const firstChild = bq.querySelector("p") || bq.firstElementChild;
      if (!firstChild) return;
      const text = firstChild.innerHTML;
      const match = text.match(/^\[!(\w+)\]([+-])?\s*(.*)/);
      if (!match) return;
      const typeName = match[1].toLowerCase();
      const collapsible = !!match[2];
      const isCollapsed = match[2] === "-";
      const customTitle = match[3]?.trim();
      const config = this.calloutTypes[typeName];
      if (!config) return;
      const title = customTitle || config.label;
      const children = Array.from(bq.childNodes);
      let bodyHtml = "";
      let skippedFirst = false;
      for (const child of children) {
        if (!skippedFirst && child === firstChild) {
          const remaining = text.replace(/^\[!\w+\][+-]?\s*.*?(?:<br\s*\/?>|$)/, "").trim();
          if (remaining) bodyHtml += `<p>${remaining}</p>`;
          skippedFirst = true;
          continue;
        }
        if (child.outerHTML) bodyHtml += child.outerHTML;
        else if (child.textContent?.trim()) bodyHtml += child.textContent;
      }
      const calloutEl = this._buildCalloutElement(typeName, config, title, "", collapsible, isCollapsed);
      if (bodyHtml) {
        const body = calloutEl.querySelector(".callout-body") || document.createElement("div");
        body.className = "callout-body";
        body.style.cssText = `padding: 8px 12px 12px; color: var(--text-primary, #cdd6f4); ${isCollapsed ? "display: none;" : ""}`;
        body.innerHTML = bodyHtml;
        if (!calloutEl.querySelector(".callout-body")) calloutEl.appendChild(body);
      }
      bq.replaceWith(calloutEl);
    }
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/mermaid-renderer.js
  var MermaidRenderer = class {
    constructor() {
      this.loaded = false;
      this.loading = false;
      this.mermaidApi = null;
      this.renderQueue = [];
      this.idCounter = 0;
    }
    /**
     * Lazy-load mermaid.js from CDN.
     */
    async ensureLoaded() {
      if (this.loaded) return;
      if (this.loading) {
        return new Promise((resolve) => {
          const check = setInterval(() => {
            if (this.loaded) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
      }
      this.loading = true;
      try {
        await this._loadScript("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js");
        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: this._detectTheme(),
            securityLevel: "loose",
            fontFamily: "var(--font-editor, monospace)"
          });
          this.mermaidApi = window.mermaid;
          this.loaded = true;
        }
      } catch (err) {
        console.error("MermaidRenderer: failed to load mermaid.js", err);
      }
      this.loading = false;
    }
    /**
     * Process HTML to find mermaid code blocks and render them as diagrams.
     * Call this on rendered markdown HTML (as DOM element).
     */
    async processElement(el) {
      const codeBlocks = el.querySelectorAll("pre > code.language-mermaid");
      if (codeBlocks.length === 0) return;
      await this.ensureLoaded();
      if (!this.mermaidApi) return;
      for (const code of codeBlocks) {
        const pre = code.parentElement;
        const definition = code.textContent.trim();
        if (!definition) continue;
        const container = document.createElement("div");
        container.className = "mermaid-diagram";
        container.style.cssText = `
                display: flex;
                justify-content: center;
                padding: 16px;
                margin: 12px 0;
                background: var(--bg-secondary, #181825);
                border-radius: 8px;
                border: 1px solid var(--border-color, #313244);
                overflow-x: auto;
            `;
        try {
          const id = `mermaid-${Date.now()}-${this.idCounter++}`;
          const { svg } = await this.mermaidApi.render(id, definition);
          container.innerHTML = svg;
        } catch (err) {
          container.innerHTML = `
                    <div class="mermaid-error" style="color: var(--text-red, #f38ba8); padding: 12px; font-size: 13px;">
                        <strong>Mermaid Error:</strong> ${this._escapeHtml(err.message || String(err))}
                        <pre style="margin-top: 8px; font-size: 12px; opacity: 0.7;">${this._escapeHtml(definition.substring(0, 200))}</pre>
                    </div>
                `;
        }
        pre.replaceWith(container);
      }
    }
    /**
     * Process an HTML string (finds mermaid blocks, renders, returns modified HTML).
     * For cases where we need string-based processing.
     */
    async processHtml(html) {
      const container = document.createElement("div");
      container.innerHTML = html;
      await this.processElement(container);
      return container.innerHTML;
    }
    _detectTheme() {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg-primary")?.trim();
      if (bg) {
        const r = parseInt(bg.slice(1, 3), 16) || 0;
        const g = parseInt(bg.slice(3, 5), 16) || 0;
        const b = parseInt(bg.slice(5, 7), 16) || 0;
        if ((r + g + b) / 3 < 128) return "dark";
      }
      return document.body.classList.contains("theme-light") ? "default" : "dark";
    }
    _loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/find-replace.js
  var FindReplace = class {
    constructor(app) {
      this.app = app;
      this.isVisible = false;
      this.overlay = null;
      this.findInput = null;
      this.replaceInput = null;
      this.matchCount = 0;
      this.currentMatch = -1;
      this.matches = [];
      this.originalContent = "";
      this.caseSensitive = false;
      this.useRegex = false;
      this.highlightElements = [];
      this.isReplaceMode = false;
    }
    /**
     * Show the find bar (Ctrl+F)
     */
    showFind() {
      if (this.isVisible) {
        this.focusInput();
        return;
      }
      this.isReplaceMode = false;
      this._createOverlay();
      this._positionOverlay();
      this.isVisible = true;
      this.focusInput();
    }
    /**
     * Show the find & replace bar (Ctrl+H)
     */
    showFindReplace() {
      if (this.isVisible && this.isReplaceMode) {
        this.focusInput();
        return;
      }
      this.isReplaceMode = true;
      this._createOverlay();
      this._positionOverlay();
      this.isVisible = true;
      this.focusInput();
    }
    /**
     * Hide the find bar
     */
    hide() {
      if (!this.isVisible) return;
      this._clearHighlights();
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.isVisible = false;
      this.matches = [];
      this.currentMatch = -1;
      this.matchCount = 0;
      this._focusEditor();
    }
    /**
     * Create the find/replace overlay UI
     */
    _createOverlay() {
      this.hide();
      this.overlay = document.createElement("div");
      this.overlay.className = "find-replace-overlay";
      const container = document.createElement("div");
      container.className = "find-replace-container";
      const findRow = document.createElement("div");
      findRow.className = "find-replace-row";
      this.findInput = document.createElement("input");
      this.findInput.className = "find-replace-input find-input";
      this.findInput.placeholder = "Find";
      this.findInput.type = "text";
      const findControls = document.createElement("div");
      findControls.className = "find-replace-controls";
      const matchCounter = document.createElement("span");
      matchCounter.className = "find-match-count";
      matchCounter.textContent = "";
      const prevBtn = document.createElement("button");
      prevBtn.className = "find-replace-btn find-prev-btn";
      prevBtn.innerHTML = "\u2191";
      prevBtn.title = "Previous match (Shift+Enter)";
      prevBtn.onclick = () => this.findPrevious();
      const nextBtn = document.createElement("button");
      nextBtn.className = "find-replace-btn find-next-btn";
      nextBtn.innerHTML = "\u2193";
      nextBtn.title = "Next match (Enter)";
      nextBtn.onclick = () => this.findNext();
      const caseBtn = document.createElement("button");
      caseBtn.className = "find-replace-btn find-case-btn";
      caseBtn.innerHTML = "Aa";
      caseBtn.title = "Match Case";
      caseBtn.onclick = () => this.toggleCaseSensitive();
      const regexBtn = document.createElement("button");
      regexBtn.className = "find-replace-btn find-regex-btn";
      regexBtn.innerHTML = ".*";
      regexBtn.title = "Use Regular Expression";
      regexBtn.onclick = () => this.toggleRegex();
      const closeBtn = document.createElement("button");
      closeBtn.className = "find-replace-btn find-close-btn";
      closeBtn.innerHTML = "\xD7";
      closeBtn.title = "Close (Escape)";
      closeBtn.onclick = () => this.hide();
      findControls.appendChild(matchCounter);
      findControls.appendChild(prevBtn);
      findControls.appendChild(nextBtn);
      findControls.appendChild(caseBtn);
      findControls.appendChild(regexBtn);
      findControls.appendChild(closeBtn);
      findRow.appendChild(this.findInput);
      findRow.appendChild(findControls);
      container.appendChild(findRow);
      if (this.isReplaceMode) {
        const replaceRow = document.createElement("div");
        replaceRow.className = "find-replace-row";
        this.replaceInput = document.createElement("input");
        this.replaceInput.className = "find-replace-input replace-input";
        this.replaceInput.placeholder = "Replace";
        this.replaceInput.type = "text";
        const replaceControls = document.createElement("div");
        replaceControls.className = "find-replace-controls";
        const replaceBtn = document.createElement("button");
        replaceBtn.className = "find-replace-btn replace-btn";
        replaceBtn.innerHTML = "Replace";
        replaceBtn.onclick = () => this.replaceNext();
        const replaceAllBtn = document.createElement("button");
        replaceAllBtn.className = "find-replace-btn replace-all-btn";
        replaceAllBtn.innerHTML = "Replace All";
        replaceAllBtn.onclick = () => this.replaceAll();
        replaceControls.appendChild(replaceBtn);
        replaceControls.appendChild(replaceAllBtn);
        replaceRow.appendChild(this.replaceInput);
        replaceRow.appendChild(replaceControls);
        container.appendChild(replaceRow);
      }
      this.overlay.appendChild(container);
      this._bindEvents();
    }
    /**
     * Position the overlay at the top of the editor
     */
    _positionOverlay() {
      const editorWrapper = document.querySelector(".editor-wrapper");
      if (!editorWrapper) return;
      editorWrapper.appendChild(this.overlay);
    }
    /**
     * Bind event handlers
     */
    _bindEvents() {
      if (!this.findInput) return;
      this.findInput.addEventListener("input", () => this._onFindInput());
      this.findInput.addEventListener("keydown", (e) => this._onKeyDown(e));
      if (this.replaceInput) {
        this.replaceInput.addEventListener("keydown", (e) => this._onKeyDown(e));
      }
    }
    /**
     * Handle find input changes
     */
    _onFindInput() {
      const query = this.findInput.value;
      if (query.length === 0) {
        this._clearHighlights();
        this._updateMatchCount();
        return;
      }
      this._performFind(query);
    }
    /**
     * Handle keyboard events in the find bar
     */
    _onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      } else if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      }
    }
    /**
     * Perform the actual find operation
     */
    _performFind(query) {
      if (!query) return;
      this._clearHighlights();
      this.matches = [];
      const content = this._getEditorContent();
      if (!content) return;
      try {
        let regex;
        if (this.useRegex) {
          const flags = this.caseSensitive ? "g" : "gi";
          regex = new RegExp(query, flags);
        } else {
          const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const flags = this.caseSensitive ? "g" : "gi";
          regex = new RegExp(escapedQuery, flags);
        }
        let match;
        while ((match = regex.exec(content)) !== null) {
          this.matches.push({
            index: match.index,
            length: match[0].length,
            text: match[0]
          });
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
        this.matchCount = this.matches.length;
        this.currentMatch = this.matches.length > 0 ? 0 : -1;
        this._highlightMatches();
        this._updateMatchCount();
        if (this.matches.length > 0) {
          this._scrollToMatch(0);
        }
      } catch (error) {
        this.matches = [];
        this.matchCount = 0;
        this.currentMatch = -1;
        this._updateMatchCount();
      }
    }
    /**
     * Get content from the current editor
     */
    _getEditorContent() {
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        return this.app.editor.cmEditor.getContent();
      }
      if (this.app.hypermarkEditor) {
        return this.app.hypermarkEditor.getContent();
      }
      const textarea = document.querySelector(".editor-textarea");
      if (textarea) {
        return textarea.value;
      }
      return "";
    }
    /**
     * Highlight all matches in the editor
     */
    _highlightMatches() {
      if (this.matches.length === 0) return;
      const textarea = document.querySelector(".editor-textarea");
      if (textarea) {
        this._highlightInTextarea(textarea);
      }
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        this.app.editor.cmEditor.highlightMatches(this.matches, this.currentMatch);
      }
    }
    /**
     * Highlight matches in textarea using overlay
     */
    _highlightInTextarea(textarea) {
      if (this.currentMatch >= 0 && this.currentMatch < this.matches.length) {
        const match = this.matches[this.currentMatch];
        textarea.focus();
        textarea.setSelectionRange(match.index, match.index + match.length);
      }
    }
    /**
     * Clear all highlights
     */
    _clearHighlights() {
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        this.app.editor.cmEditor.clearHighlights();
      }
      this.highlightElements.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      this.highlightElements = [];
    }
    /**
     * Update the match count display
     */
    _updateMatchCount() {
      const counter = this.overlay?.querySelector(".find-match-count");
      if (!counter) return;
      if (this.matchCount === 0) {
        counter.textContent = "No matches";
        counter.className = "find-match-count no-matches";
      } else {
        counter.textContent = `${this.currentMatch + 1} of ${this.matchCount}`;
        counter.className = "find-match-count";
      }
    }
    /**
     * Move to next match
     */
    findNext() {
      if (this.matches.length === 0) return;
      this.currentMatch = (this.currentMatch + 1) % this.matches.length;
      this._scrollToMatch(this.currentMatch);
      this._highlightMatches();
      this._updateMatchCount();
    }
    /**
     * Move to previous match
     */
    findPrevious() {
      if (this.matches.length === 0) return;
      this.currentMatch = this.currentMatch <= 0 ? this.matches.length - 1 : this.currentMatch - 1;
      this._scrollToMatch(this.currentMatch);
      this._highlightMatches();
      this._updateMatchCount();
    }
    /**
     * Scroll to a specific match
     */
    _scrollToMatch(index) {
      if (index < 0 || index >= this.matches.length) return;
      const match = this.matches[index];
      const textarea = document.querySelector(".editor-textarea");
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(match.index, match.index + match.length);
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
        const textBeforeMatch = textarea.value.substring(0, match.index);
        const lines = textBeforeMatch.split("\n").length;
        const scrollTop = Math.max(0, (lines - 5) * lineHeight);
        textarea.scrollTop = scrollTop;
      }
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        this.app.editor.cmEditor.scrollToMatch(index);
      }
    }
    /**
     * Replace the current match
     */
    replaceNext() {
      if (!this.isReplaceMode || this.currentMatch < 0 || this.currentMatch >= this.matches.length) return;
      const replaceText = this.replaceInput.value;
      const match = this.matches[this.currentMatch];
      this._replaceAtPosition(match.index, match.length, replaceText);
      const lengthDiff = replaceText.length - match.length;
      for (let i = this.currentMatch + 1; i < this.matches.length; i++) {
        this.matches[i].index += lengthDiff;
      }
      this.matches.splice(this.currentMatch, 1);
      this.matchCount--;
      if (this.currentMatch >= this.matches.length) {
        this.currentMatch = this.matches.length - 1;
      }
      this._highlightMatches();
      this._updateMatchCount();
      if (this.matches.length > 0) {
        this.findNext();
      }
    }
    /**
     * Replace all matches
     */
    replaceAll() {
      if (!this.isReplaceMode || this.matches.length === 0) return;
      const replaceText = this.replaceInput.value;
      let content = this._getEditorContent();
      for (let i = this.matches.length - 1; i >= 0; i--) {
        const match = this.matches[i];
        content = content.substring(0, match.index) + replaceText + content.substring(match.index + match.length);
      }
      this._setEditorContent(content);
      this.matches = [];
      this.matchCount = 0;
      this.currentMatch = -1;
      this._clearHighlights();
      this._updateMatchCount();
    }
    /**
     * Replace text at a specific position
     */
    _replaceAtPosition(index, length, replacement) {
      const content = this._getEditorContent();
      const newContent = content.substring(0, index) + replacement + content.substring(index + length);
      this._setEditorContent(newContent);
    }
    /**
     * Set content in the current editor
     */
    _setEditorContent(content) {
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        this.app.editor.cmEditor.setContent(content);
        return;
      }
      if (this.app.hypermarkEditor) {
        this.app.hypermarkEditor.setContent(content);
        return;
      }
      const textarea = document.querySelector(".editor-textarea");
      if (textarea) {
        textarea.value = content;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    /**
     * Toggle case sensitive search
     */
    toggleCaseSensitive() {
      this.caseSensitive = !this.caseSensitive;
      const btn = this.overlay?.querySelector(".find-case-btn");
      if (btn) {
        btn.classList.toggle("active", this.caseSensitive);
      }
      if (this.findInput && this.findInput.value) {
        this._performFind(this.findInput.value);
      }
    }
    /**
     * Toggle regex search
     */
    toggleRegex() {
      this.useRegex = !this.useRegex;
      const btn = this.overlay?.querySelector(".find-regex-btn");
      if (btn) {
        btn.classList.toggle("active", this.useRegex);
      }
      if (this.findInput && this.findInput.value) {
        this._performFind(this.findInput.value);
      }
    }
    /**
     * Focus the find input
     */
    focusInput() {
      if (this.findInput) {
        this.findInput.focus();
        this.findInput.select();
      }
    }
    /**
     * Return focus to the editor
     */
    _focusEditor() {
      const textarea = document.querySelector(".editor-textarea");
      if (textarea) {
        textarea.focus();
      }
      if (this.app.editor && this.app.editor.cmEditor && this.app.editor.useCodeMirror) {
        this.app.editor.cmEditor.focus();
      }
    }
  };

  // src/js/embeds.js
  init_tauri_bridge();
  var EmbedProcessor = class {
    constructor(app) {
      this.app = app;
      this.embedCache = /* @__PURE__ */ new Map();
      this.maxEmbedDepth = 3;
    }
    /**
     * Process embeds in markdown content via Rust.
     * Rust handles: regex scanning, path resolution, recursive embed resolution.
     * JS handles: wrapping resolved content with DOM/HTML.
     * 
     * @param {string} content - The markdown content
     * @param {string} currentPath - Current file path for relative resolution
     * @param {number} embedDepth - Current embedding depth
     * @returns {Promise<string>} Processed content with embeds rendered
     */
    async processEmbeds(content, currentPath = null, embedDepth = 0) {
      if (embedDepth >= this.maxEmbedDepth) {
        return content;
      }
      try {
        const result = await invoke("resolve_embeds", {
          content,
          currentPath: currentPath || "",
          maxDepth: this.maxEmbedDepth - embedDepth
        });
        if (result.processed) {
          let processedContent = result.processed;
          for (const embed of result.embeds || []) {
            if (embed.error) {
              const errorHtml = this.renderEmbedError(embed, embed.error);
              processedContent = processedContent.replace(embed.placeholder || embed.fullMatch, errorHtml);
            } else if (embed.content != null) {
              const wrappedHtml = this.wrapEmbedContent(embed.content, embed, embedDepth + (embed.depth || 0));
              processedContent = processedContent.replace(embed.placeholder || embed.fullMatch, wrappedHtml);
            }
          }
          return processedContent;
        }
        return this._processEmbedsFromMetadata(content, result.embeds || [], embedDepth);
      } catch (err) {
        console.warn("[Embeds] Rust resolve_embeds failed, using fallback:", err);
        return this._fallbackProcessEmbeds(content, currentPath, embedDepth);
      }
    }
    /**
     * Process embeds when Rust returns metadata but not fully processed content.
     * @private
     */
    _processEmbedsFromMetadata(content, embeds, embedDepth) {
      let processedContent = content;
      for (const embed of [...embeds].reverse()) {
        try {
          if (embed.error) {
            const errorHtml = this.renderEmbedError(embed, embed.error);
            processedContent = processedContent.substring(0, embed.index) + errorHtml + processedContent.substring(embed.index + embed.fullMatch.length);
          } else {
            const wrappedHtml = this.wrapEmbedContent(
              embed.content || "",
              embed,
              embedDepth + (embed.depth || 0)
            );
            processedContent = processedContent.substring(0, embed.index) + wrappedHtml + processedContent.substring(embed.index + embed.fullMatch.length);
          }
        } catch (error) {
          console.error("Failed to process embed:", embed.fullMatch, error);
          const errorHtml = this.renderEmbedError(embed, error.message);
          processedContent = processedContent.substring(0, embed.index) + errorHtml + processedContent.substring(embed.index + embed.fullMatch.length);
        }
      }
      return processedContent;
    }
    /**
     * Fallback: JS-side embed processing if Rust is unavailable.
     * @private
     */
    async _fallbackProcessEmbeds(content, currentPath, embedDepth) {
      const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
      let processedContent = content;
      const embeds = [];
      let match;
      while ((match = embedRegex.exec(content)) !== null) {
        embeds.push({
          fullMatch: match[0],
          notePath: match[1].trim(),
          heading: match[2]?.trim(),
          index: match.index
        });
      }
      for (const embed of embeds.reverse()) {
        try {
          let fullPath = embed.notePath;
          if (!fullPath.endsWith(".md")) fullPath += ".md";
          const noteContent = await invoke("read_note", { path: fullPath });
          let contentToEmbed = embed.heading ? this._extractSection(noteContent, embed.heading) : this._stripFrontmatter(noteContent);
          if (contentToEmbed && embedDepth + 1 < this.maxEmbedDepth) {
            contentToEmbed = await this._fallbackProcessEmbeds(contentToEmbed, fullPath, embedDepth + 1);
          }
          const wrappedHtml = this.wrapEmbedContent(contentToEmbed, embed, embedDepth);
          processedContent = processedContent.substring(0, embed.index) + wrappedHtml + processedContent.substring(embed.index + embed.fullMatch.length);
        } catch (error) {
          const errorHtml = this.renderEmbedError(embed, error.message);
          processedContent = processedContent.substring(0, embed.index) + errorHtml + processedContent.substring(embed.index + embed.fullMatch.length);
        }
      }
      return processedContent;
    }
    /** @private */
    _extractSection(content, targetHeading) {
      const lines = content.split("\n");
      let inTarget = false, targetLevel = null;
      const sectionLines = [];
      for (const line of lines) {
        const hm = line.trim().match(/^(#{1,6})\s+(.+)/);
        if (hm) {
          if (!inTarget) {
            if (hm[2].trim().toLowerCase() === targetHeading.toLowerCase()) {
              inTarget = true;
              targetLevel = hm[1].length;
              sectionLines.push(line);
              continue;
            }
          } else if (hm[1].length <= targetLevel) break;
        }
        if (inTarget) sectionLines.push(line);
      }
      if (!inTarget) throw new Error(`Heading "${targetHeading}" not found`);
      return sectionLines.join("\n");
    }
    /** @private */
    _stripFrontmatter(content) {
      if (!content.startsWith("---\n")) return content;
      const lines = content.split("\n");
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "---") return lines.slice(i + 1).join("\n").trim();
      }
      return content;
    }
    /**
     * Wrap embedded content with visual styling.
     */
    wrapEmbedContent(content, embed, embedDepth) {
      if (!content || content.trim() === "") {
        return this.renderEmbedError(embed, "No content found");
      }
      const depthClass = `embed-depth-${Math.min(embedDepth, 2)}`;
      const sourceInfo = embed.heading ? `${embed.notePath}#${embed.heading}` : embed.notePath;
      return `
<div class="embedded-content ${depthClass}" data-source="${this.escapeHtml(sourceInfo)}">
    <div class="embed-header">
        <span class="embed-source">${this.escapeHtml(sourceInfo)}</span>
        <button class="embed-open-btn" onclick="window.navigateToNote('${embed.notePath}')" title="Open in new tab">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
        </button>
    </div>
    <div class="embed-content">
        ${content}
    </div>
</div>`;
    }
    /**
     * Render embed error placeholder.
     */
    renderEmbedError(embed, errorMessage) {
      const sourceInfo = embed.heading ? `${embed.notePath}#${embed.heading}` : embed.notePath;
      return `
<div class="embedded-content embed-error" data-source="${this.escapeHtml(sourceInfo)}">
    <div class="embed-header">
        <span class="embed-source">${this.escapeHtml(sourceInfo)}</span>
        <span class="embed-error-indicator">!</span>
    </div>
    <div class="embed-content">
        <div class="embed-error-message">
            <strong>Embed Error:</strong> ${this.escapeHtml(errorMessage)}
        </div>
        <div class="embed-create-suggestion">
            <button class="embed-create-btn" onclick="window.navigateToNote('${embed.notePath}')">
                Create "${this.escapeHtml(embed.notePath)}"
            </button>
        </div>
    </div>
</div>`;
    }
    clearCache() {
      this.embedCache.clear();
    }
    invalidateCache(path) {
      for (const key of [...this.embedCache.keys()]) {
        if (key.startsWith(path)) this.embedCache.delete(key);
      }
    }
    /**
     * Get all embedded references in a document via Rust AST.
     */
    async getEmbedReferences(content) {
      try {
        const ast = await invoke("parse_markdown", { content });
        const refs = [];
        for (const block of ast || []) {
          if (block.meta?.embeds) {
            for (const embed of block.meta.embeds) {
              let fullPath = embed.path || embed.notePath;
              if (fullPath && !fullPath.endsWith(".md")) fullPath += ".md";
              refs.push({ path: fullPath, heading: embed.heading, display: embed.display || `![[${embed.path}]]` });
            }
          }
        }
        if (refs.length > 0) return refs;
      } catch {
      }
      const embedRegex = /!\[\[([^\]]+?)(?:#([^\]]+?))?\]\]/g;
      const references = [];
      let match;
      while ((match = embedRegex.exec(content)) !== null) {
        let fullPath = match[1].trim();
        if (!fullPath.endsWith(".md")) fullPath += ".md";
        references.push({ path: fullPath, heading: match[2]?.trim(), display: match[0] });
      }
      return references;
    }
    async onContentChange(path, _content) {
      this.invalidateCache(path);
      if (this.app.backlinksManager) {
        await this.app.backlinksManager.updateEmbedReferences(path);
      }
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/frontmatter.js
  init_tauri_bridge();
  var FrontmatterProcessor = class {
    constructor(app) {
      this.app = app;
    }
    /**
     * Parse frontmatter from markdown content
     * @param {string} content - The markdown content
     * @returns {Object} { frontmatter, content, hasFrontmatter }
     */
    async parseFrontmatter(content) {
      try {
        const result = await invoke("parse_frontmatter", { content });
        if (result === null || result === void 0) {
          return {
            frontmatter: {},
            content,
            hasFrontmatter: false
          };
        }
        return {
          frontmatter: result,
          content: content.replace(/^---[\s\S]*?---\n?/, ""),
          hasFrontmatter: true
        };
      } catch (error) {
        console.error("Failed to parse frontmatter:", error);
        return {
          frontmatter: {},
          content,
          hasFrontmatter: false
        };
      }
    }
    /**
     * Convert frontmatter object back to YAML string
     */
    async stringifyFrontmatter(frontmatter) {
      if (!frontmatter || Object.keys(frontmatter).length === 0) {
        return "";
      }
      try {
        return await invoke("stringify_frontmatter", { data: frontmatter });
      } catch (error) {
        console.error("Failed to stringify frontmatter:", error);
        return "";
      }
    }
    /**
     * Render frontmatter as HTML table for preview
     */
    renderFrontmatterPreview(frontmatter, error = null) {
      if (error) {
        return `
<div class="frontmatter-preview error">
    <div class="frontmatter-header">
        <span class="frontmatter-title">\u26A0\uFE0F Frontmatter (Error)</span>
    </div>
    <div class="frontmatter-error">
        <strong>YAML Error:</strong> ${this.escapeHtml(error)}
    </div>
</div>`;
      }
      if (!frontmatter || Object.keys(frontmatter).filter((k) => !k.startsWith("_")).length === 0) {
        return "";
      }
      let tableRows = "";
      for (const [key, value] of Object.entries(frontmatter)) {
        if (key.startsWith("_")) continue;
        let displayValue;
        if (Array.isArray(value)) {
          displayValue = value.map((item) => `<span class="frontmatter-tag">${this.escapeHtml(String(item))}</span>`).join(" ");
        } else if (typeof value === "boolean") {
          displayValue = `<span class="frontmatter-boolean ${value ? "true" : "false"}">${value}</span>`;
        } else if (key.toLowerCase().includes("date") && this.isValidDate(value)) {
          displayValue = `<span class="frontmatter-date">${this.formatDate(value)}</span>`;
        } else if (typeof value === "string" && value.startsWith("http")) {
          displayValue = `<a href="${value}" target="_blank" class="frontmatter-link">${this.escapeHtml(value)}</a>`;
        } else {
          displayValue = this.escapeHtml(String(value));
        }
        tableRows += `
<tr class="frontmatter-row">
    <td class="frontmatter-key">${this.escapeHtml(key)}</td>
    <td class="frontmatter-value">${displayValue}</td>
</tr>`;
      }
      return `
<div class="frontmatter-preview">
    <div class="frontmatter-header">
        <span class="frontmatter-title">\u{1F4CB} Properties</span>
        <button class="frontmatter-edit-btn" onclick="window.oxidianApp?.editFrontmatter?.()" title="Edit Properties">
            \u270F\uFE0F
        </button>
    </div>
    <table class="frontmatter-table">
        ${tableRows}
    </table>
</div>`;
    }
    /**
     * Process markdown content to render frontmatter in preview
     */
    async processContent(content) {
      const parsed = await this.parseFrontmatter(content);
      if (!parsed.hasFrontmatter) {
        return content;
      }
      const previewHtml = this.renderFrontmatterPreview(parsed.frontmatter, parsed.error);
      return previewHtml + "\n\n" + parsed.content;
    }
    /**
     * Check if a string represents a valid date
     */
    isValidDate(value) {
      if (typeof value !== "string") return false;
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
        /^\d{2}\/\d{2}\/\d{4}$/
      ];
      return datePatterns.some((pattern) => pattern.test(value)) && !isNaN(Date.parse(value));
    }
    /**
     * Format date for display
     */
    formatDate(value) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      } catch {
        return value;
      }
    }
    /**
     * Show frontmatter edit dialog
     */
    async showFrontmatterEditor(content) {
      const parsed = await this.parseFrontmatter(content);
      const dialog = document.createElement("div");
      dialog.className = "frontmatter-editor-overlay";
      const container = document.createElement("div");
      container.className = "frontmatter-editor-container";
      const header = document.createElement("div");
      header.className = "frontmatter-editor-header";
      header.innerHTML = `
            <h3>Edit Properties</h3>
            <button class="frontmatter-close-btn" onclick="this.closest('.frontmatter-editor-overlay').remove()">\xD7</button>
        `;
      const editor = document.createElement("div");
      editor.className = "frontmatter-editor-content";
      const commonFields = this.createCommonFields(parsed.frontmatter);
      let yamlString = "";
      try {
        yamlString = await this.stringifyFrontmatter(parsed.frontmatter);
      } catch (e) {
        console.error("Failed to stringify for editor:", e);
      }
      const yamlEditor = document.createElement("div");
      yamlEditor.className = "frontmatter-yaml-section";
      yamlEditor.innerHTML = `
            <h4>YAML Source</h4>
            <textarea class="frontmatter-yaml-editor" rows="8" placeholder="---">${yamlString}</textarea>
            <div class="frontmatter-yaml-info">Advanced users: Edit YAML directly</div>
        `;
      const footer = document.createElement("div");
      footer.className = "frontmatter-editor-footer";
      footer.innerHTML = `
            <button class="frontmatter-cancel-btn">Cancel</button>
            <button class="frontmatter-save-btn">Save Changes</button>
        `;
      editor.appendChild(commonFields);
      editor.appendChild(yamlEditor);
      container.appendChild(header);
      container.appendChild(editor);
      container.appendChild(footer);
      dialog.appendChild(container);
      dialog.querySelector(".frontmatter-cancel-btn").onclick = () => dialog.remove();
      dialog.querySelector(".frontmatter-save-btn").onclick = () => this.saveFrontmatter(dialog, content);
      dialog.onclick = (e) => {
        if (e.target === dialog) dialog.remove();
      };
      const handleKeydown = (e) => {
        if (e.key === "Escape") {
          dialog.remove();
          document.removeEventListener("keydown", handleKeydown);
        }
      };
      document.addEventListener("keydown", handleKeydown);
      document.body.appendChild(dialog);
      const firstInput = dialog.querySelector("input, textarea");
      if (firstInput) firstInput.focus();
    }
    /**
     * Create common property fields
     */
    createCommonFields(frontmatter) {
      const container = document.createElement("div");
      container.className = "frontmatter-common-fields";
      const fields = [
        { key: "title", label: "Title", type: "text", placeholder: "Note title" },
        { key: "date", label: "Date", type: "date" },
        { key: "tags", label: "Tags", type: "tags", placeholder: "tag1, tag2, tag3" },
        { key: "aliases", label: "Aliases", type: "list", placeholder: "alias1, alias2" },
        { key: "author", label: "Author", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] }
      ];
      const fieldsHtml = fields.map((field) => {
        const value = frontmatter[field.key];
        let inputHtml = "";
        switch (field.type) {
          case "text":
          case "date":
            inputHtml = `<input type="${field.type}" name="${field.key}" value="${this.escapeHtml(String(value || ""))}" placeholder="${field.placeholder || ""}">`;
            break;
          case "tags":
          case "list":
            const arrayValue = Array.isArray(value) ? value.join(", ") : value || "";
            inputHtml = `<input type="text" name="${field.key}" value="${this.escapeHtml(arrayValue)}" placeholder="${field.placeholder || ""}" data-type="${field.type}">`;
            break;
          case "select":
            const options = field.options.map(
              (opt) => `<option value="${opt}" ${value === opt ? "selected" : ""}>${opt}</option>`
            ).join("");
            inputHtml = `<select name="${field.key}"><option value="">Select...</option>${options}</select>`;
            break;
        }
        return `
                <div class="frontmatter-field">
                    <label class="frontmatter-field-label">${field.label}</label>
                    ${inputHtml}
                </div>
            `;
      }).join("");
      container.innerHTML = `
            <h4>Common Properties</h4>
            <div class="frontmatter-fields-grid">
                ${fieldsHtml}
            </div>
        `;
      return container;
    }
    /**
     * Save frontmatter changes
     */
    async saveFrontmatter(dialog, originalContent) {
      try {
        const frontmatter = {};
        dialog.querySelectorAll("input, select").forEach((input) => {
          const name = input.name;
          let value = input.value.trim();
          if (!value) return;
          if (input.dataset.type === "tags" || input.dataset.type === "list") {
            frontmatter[name] = value.split(",").map((item) => item.trim()).filter((item) => item);
          } else if (input.type === "date") {
            frontmatter[name] = value;
          } else {
            frontmatter[name] = value;
          }
        });
        const yamlSource = dialog.querySelector(".frontmatter-yaml-editor").value.trim();
        if (yamlSource) {
          try {
            const yamlData = await invoke("parse_frontmatter", { content: "---\n" + yamlSource + "\n---\n" });
            if (yamlData.frontmatter) {
              Object.assign(frontmatter, yamlData.frontmatter);
            }
          } catch (yamlError) {
            alert("YAML source contains errors. Please fix or clear it.");
            return;
          }
        }
        const parsed = await this.parseFrontmatter(originalContent);
        let newContent = "";
        if (Object.keys(frontmatter).length > 0) {
          const yamlString = await this.stringifyFrontmatter(frontmatter);
          newContent = "---\n" + yamlString + "\n---\n";
        }
        newContent += parsed.content;
        this.app.editor.setContent(newContent);
        this.app.markDirty();
        dialog.remove();
      } catch (error) {
        console.error("Error saving frontmatter:", error);
        alert("Error saving changes: " + error.message);
      }
    }
    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/link-handler.js
  init_tauri_bridge();
  var LinkHandler = class {
    constructor(app) {
      this.app = app;
      this.isCtrlPressed = false;
      this.currentHoverElement = null;
      this.init();
    }
    init() {
      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
          this.isCtrlPressed = true;
          this.updateCursorStyle();
        }
      });
      document.addEventListener("keyup", (e) => {
        if (!e.ctrlKey && !e.metaKey) {
          this.isCtrlPressed = false;
          this.updateCursorStyle();
        }
      });
      document.addEventListener("click", (e) => {
        if (this.isCtrlPressed) {
          this.handleCtrlClick(e);
        }
      });
      document.addEventListener("mousemove", (e) => {
        this.handleMouseMove(e);
      });
      this.attachPreviewLinkHandlers();
    }
    /**
     * Handle Ctrl+Click events — opens links in a new tab
     */
    async handleCtrlClick(event) {
      const textarea = document.querySelector(".editor-textarea");
      if (event.target === textarea) {
        const link = await this.getLinkAtPosition(textarea, textarea.selectionStart);
        if (link) {
          event.preventDefault();
          this.navigateToLink(link, true);
        }
      }
      const linkElement = event.target.closest("a, .hl-wikilink");
      if (linkElement) {
        event.preventDefault();
        const link = this.extractLinkFromElement(linkElement);
        if (link) {
          this.navigateToLink(link, true);
        }
      }
    }
    /**
     * Handle mouse movement for cursor changes
     */
    async handleMouseMove(event) {
      if (!this.isCtrlPressed) {
        this.currentHoverElement = null;
        return;
      }
      const textarea = document.querySelector(".editor-textarea");
      if (event.target === textarea) {
        const rect = textarea.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const position = this.getTextPositionFromCoordinates(textarea, x, y);
        const link = await this.getLinkAtPosition(textarea, position);
        if (link && link !== this.currentHoverElement) {
          this.currentHoverElement = link;
          this.showLinkTooltip(link, event.clientX, event.clientY);
          textarea.style.cursor = "pointer";
        } else if (!link && this.currentHoverElement) {
          this.currentHoverElement = null;
          this.hideLinkTooltip();
          textarea.style.cursor = "text";
        }
      }
      const linkElement = event.target.closest("a, .hl-wikilink");
      if (linkElement) {
        linkElement.style.cursor = "pointer";
        const link = this.extractLinkFromElement(linkElement);
        if (link) {
          this.showLinkTooltip(link, event.clientX, event.clientY);
        }
      } else if (this.currentHoverElement) {
        this.hideLinkTooltip();
      }
    }
    /**
     * Get text position from mouse coordinates in textarea
     */
    getTextPositionFromCoordinates(textarea, x, y) {
      const style = window.getComputedStyle(textarea);
      const lineHeight = parseInt(style.lineHeight) || 20;
      const fontSize = parseInt(style.fontSize) || 14;
      const approximateCharWidth = fontSize * 0.6;
      const lines = textarea.value.split("\n");
      const approximateLine = Math.floor(y / lineHeight);
      const approximateCol = Math.floor(x / approximateCharWidth);
      if (approximateLine >= lines.length) {
        return textarea.value.length;
      }
      let position = 0;
      for (let i = 0; i < approximateLine; i++) {
        position += lines[i].length + 1;
      }
      position += Math.min(approximateCol, lines[approximateLine]?.length || 0);
      return Math.min(position, textarea.value.length);
    }
    /**
     * Get link at a specific text position via Rust
     */
    async getLinkAtPosition(textarea, position) {
      const content = textarea.value;
      try {
        const link = await invoke("get_link_at_position", { text: content, offset: position });
        return link;
      } catch (err) {
        console.error("Failed to get link at position:", err);
        return null;
      }
    }
    /**
     * Extract link information from DOM element
     */
    extractLinkFromElement(element) {
      if (element.tagName === "A") {
        return {
          type: "url",
          target: element.href,
          text: element.textContent
        };
      }
      if (element.classList.contains("hl-wikilink")) {
        const text = element.textContent;
        const match = text.match(/\[\[([^\]]+)\]\]/);
        if (match) {
          return {
            type: "wikilink",
            target: match[1],
            text
          };
        }
      }
      return null;
    }
    /**
     * Navigate to a link.
     * Ctrl/Cmd+Click opens in a NEW TAB instead of replacing current.
     */
    async navigateToLink(link, openInNewTab = true) {
      try {
        switch (link.type) {
          case "wikilink":
            if (openInNewTab) {
              await this.openNoteInNewTab(link.target);
            } else {
              await this.app.navigateToNote(link.target);
            }
            break;
          case "markdown":
            if (this.isInternalLink(link.target)) {
              if (openInNewTab) {
                await this.openNoteInNewTab(link.target);
              } else {
                await this.app.navigateToNote(link.target);
              }
            } else {
              this.openExternalLink(link.target);
            }
            break;
          case "url":
            this.openExternalLink(link.target);
            break;
        }
      } catch (error) {
        console.error("Failed to navigate to link:", error);
        this.showError(`Failed to open link: ${error.message}`);
      }
    }
    /**
     * Open a note in a new tab. If the note doesn't exist, create it first.
     */
    async openNoteInNewTab(target) {
      let path = target;
      if (!path.endsWith(".md")) path = target + ".md";
      try {
        const resolvedPath = await invoke("resolve_link", { vaultPath: path, link: target });
        if (resolvedPath) {
          path = resolvedPath;
        }
      } catch {
      }
      try {
        await invoke("read_note", { path });
      } catch {
        try {
          const content = `# ${target}

`;
          await invoke("save_note", { path, content });
          this.app.sidebar?.refresh();
          this.app.invalidateAutoCompleteCaches?.();
        } catch (createErr) {
          console.error("Failed to create note:", createErr);
          this.showError(`Failed to create note "${target}": ${createErr.message || createErr}`);
          return;
        }
      }
      await this.app.openFile(path);
    }
    /**
     * Check if a link is internal (points to another note)
     */
    isInternalLink(target) {
      return !target.startsWith("http://") && !target.startsWith("https://") && !target.startsWith("mailto:") && !target.startsWith("ftp://");
    }
    /**
     * Open external link
     */
    openExternalLink(url) {
      if (window.__TAURI__) {
        window.__TAURI__.shell.open(url);
      } else {
        window.open(url, "_blank");
      }
    }
    /**
     * Update cursor style based on Ctrl key state
     */
    updateCursorStyle() {
      const textareas = document.querySelectorAll(".editor-textarea");
      textareas.forEach((textarea) => {
        if (this.isCtrlPressed && this.currentHoverElement) {
          textarea.style.cursor = "pointer";
        } else {
          textarea.style.cursor = "text";
        }
      });
    }
    /**
     * Show link tooltip
     */
    showLinkTooltip(link, x, y) {
      this.hideLinkTooltip();
      const tooltip = document.createElement("div");
      tooltip.className = "link-tooltip";
      tooltip.id = "link-tooltip";
      let tooltipText = "";
      switch (link.type) {
        case "wikilink":
          tooltipText = `Open note: ${link.target}`;
          break;
        case "markdown":
          tooltipText = this.isInternalLink(link.target) ? `Open note: ${link.target}` : `Open link: ${link.target}`;
          break;
        case "url":
          tooltipText = `Open: ${link.target}`;
          break;
      }
      tooltip.textContent = `Ctrl+Click to ${tooltipText}`;
      tooltip.style.position = "fixed";
      tooltip.style.left = x + 10 + "px";
      tooltip.style.top = y - 30 + "px";
      tooltip.style.zIndex = "1000";
      document.body.appendChild(tooltip);
      setTimeout(() => this.hideLinkTooltip(), 3e3);
    }
    /**
     * Hide link tooltip
     */
    hideLinkTooltip() {
      const tooltip = document.getElementById("link-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
    }
    /**
     * Show error message
     */
    showError(message) {
      const error = document.createElement("div");
      error.className = "link-error-toast";
      error.textContent = message;
      error.style.position = "fixed";
      error.style.top = "20px";
      error.style.right = "20px";
      error.style.zIndex = "1000";
      document.body.appendChild(error);
      setTimeout(() => {
        if (error.parentNode) {
          error.parentNode.removeChild(error);
        }
      }, 3e3);
    }
    /**
     * Attach handlers to preview links
     */
    attachPreviewLinkHandlers() {
      document.addEventListener("DOMContentLoaded", () => {
        this.updatePreviewLinkHandlers();
      });
    }
    /**
     * Update preview link handlers (call after preview update)
     */
    updatePreviewLinkHandlers() {
      const preview = document.querySelector(".preview-content");
      if (!preview) return;
      preview.querySelectorAll('a[href^="wikilink:"]').forEach((link) => {
        link.addEventListener("click", (e) => {
          if (this.isCtrlPressed || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const target = link.getAttribute("href").replace("wikilink:", "");
            this.app.navigateToNote(target);
          }
        });
      });
      preview.querySelectorAll('a[href^="http"]').forEach((link) => {
        link.addEventListener("click", (e) => {
          if (this.isCtrlPressed || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.openExternalLink(link.href);
          }
        });
      });
    }
    /**
     * Cleanup method
     */
    destroy() {
      this.hideLinkTooltip();
    }
  };

  // src/js/nav-history.js
  init_tauri_bridge();
  var NavHistory = class {
    constructor(app) {
      this.app = app;
      this._navigating = false;
      this.init();
    }
    init() {
      this.addNavButtons();
    }
    /**
     * Push a new path onto the history stack (via Rust).
     */
    async push(path) {
      if (this._navigating) return;
      if (!path || path.startsWith("__")) return;
      try {
        await invoke("nav_push", { path });
        await this.updateButtons();
      } catch (err) {
        console.error("[NavHistory] Failed to push:", err);
      }
    }
    /**
     * Navigate back (via Rust).
     */
    async goBack() {
      try {
        const path = await invoke("nav_go_back");
        if (path) {
          await this._navigateTo(path);
        }
      } catch (err) {
        console.error("[NavHistory] Failed to go back:", err);
      }
    }
    /**
     * Navigate forward (via Rust).
     */
    async goForward() {
      try {
        const path = await invoke("nav_go_forward");
        if (path) {
          await this._navigateTo(path);
        }
      } catch (err) {
        console.error("[NavHistory] Failed to go forward:", err);
      }
    }
    async _navigateTo(path) {
      this._navigating = true;
      try {
        await this.app.openFile(path);
      } catch (err) {
        console.error("[NavHistory] Failed to navigate:", err);
      } finally {
        this._navigating = false;
        await this.updateButtons();
      }
    }
    /**
     * Add nav buttons to the tab bar.
     */
    addNavButtons() {
      const tabBar = document.getElementById("tab-bar");
      if (!tabBar) return;
      const navContainer = document.createElement("div");
      navContainer.className = "nav-history-buttons";
      navContainer.id = "nav-history-buttons";
      navContainer.innerHTML = `
            <button class="nav-btn nav-back" id="nav-back-btn" title="Back (Cmd+Alt+Left)" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>
            <button class="nav-btn nav-forward" id="nav-forward-btn" title="Forward (Cmd+Alt+Right)" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
      tabBar.insertBefore(navContainer, tabBar.firstChild);
      document.getElementById("nav-back-btn")?.addEventListener("click", () => this.goBack());
      document.getElementById("nav-forward-btn")?.addEventListener("click", () => this.goForward());
    }
    async updateButtons() {
      const backBtn = document.getElementById("nav-back-btn");
      const fwdBtn = document.getElementById("nav-forward-btn");
      if (backBtn) backBtn.disabled = false;
      if (fwdBtn) fwdBtn.disabled = false;
    }
  };

  // src/js/live-preview.js
  init_tauri_bridge();
  var LivePreview = class {
    constructor(app) {
      this.app = app;
      this.editor = null;
      this.previewContainer = null;
      this.isActive = false;
      this._renderTimer = null;
      this._lastContent = "";
      this._cursorLine = -1;
    }
    /**
     * Enable live preview mode
     * @param {HTMLElement} container - Editor container
     * @param {object} editor - Editor instance
     */
    enable(container, editor) {
      this.editor = editor;
      this.isActive = true;
      container.innerHTML = `
            <div class="live-preview-wrapper">
                <div class="live-preview-editor">
                    <textarea class="editor-textarea" placeholder="Start writing... (Markdown supported)" spellcheck="true"></textarea>
                </div>
                <div class="live-preview-divider"></div>
                <div class="live-preview-rendered">
                    <div class="preview-content"></div>
                </div>
            </div>
        `;
      const textarea = container.querySelector(".editor-textarea");
      this.previewContainer = container.querySelector(".preview-content");
      textarea.addEventListener("input", () => this.onInput(textarea));
      textarea.addEventListener("selectionchange", () => this.onCursorMove(textarea));
      textarea.addEventListener("keyup", () => this.onCursorMove(textarea));
      textarea.addEventListener("click", () => this.onCursorMove(textarea));
      return textarea;
    }
    /**
     * Alternative: True live preview in single pane (CodeMirror style)
     */
    enableInPlace(container, editor) {
      this.editor = editor;
      this.isActive = true;
      return this.enable(container, editor);
    }
    disable() {
      this.isActive = false;
      this.editor = null;
      this.previewContainer = null;
      clearTimeout(this._renderTimer);
    }
    onInput(textarea) {
      if (!this.isActive) return;
      clearTimeout(this._renderTimer);
      this._renderTimer = setTimeout(() => {
        this.renderLivePreview(textarea.value, this.getCurrentLineNumber(textarea));
      }, 150);
    }
    onCursorMove(textarea) {
      if (!this.isActive) return;
      const currentLine = this.getCurrentLineNumber(textarea);
      if (currentLine !== this._cursorLine) {
        this._cursorLine = currentLine;
        this.renderLivePreview(textarea.value, currentLine);
      }
    }
    getCurrentLineNumber(textarea) {
      const pos = textarea.selectionStart;
      const text = textarea.value;
      return text.substring(0, pos).split("\n").length;
    }
    /**
     * Render live preview — Rust renders markdown to HTML,
     * JS handles cursor-line raw display and DOM insertion.
     */
    async renderLivePreview(content, cursorLine) {
      if (!this.previewContainer || content === this._lastContent) return;
      try {
        const lines = content.split("\n");
        const renderParts = [];
        let rawLineHtml = null;
        const mdLines = [];
        for (let i = 0; i < lines.length; i++) {
          const lineNum = i + 1;
          if (lineNum === cursorLine) {
            renderParts.push({ type: "raw", line: lines[i] });
            mdLines.push("");
          } else {
            renderParts.push({ type: "md", lineIndex: i });
            mdLines.push(lines[i]);
          }
        }
        const html = await invoke("render_markdown_html", { content: mdLines.join("\n") });
        const renderedLines = html.split("\n");
        let finalHtml = "";
        for (const part of renderParts) {
          if (part.type === "raw") {
            finalHtml += `<div class="live-preview-raw-line">${this.escapeHtml(part.line)}</div>
`;
          }
        }
        this.previewContainer.innerHTML = html;
        if (cursorLine > 0 && cursorLine <= lines.length) {
          const rawDiv = document.createElement("div");
          rawDiv.className = "live-preview-raw-line";
          rawDiv.textContent = lines[cursorLine - 1];
          const children = Array.from(this.previewContainer.children);
          if (children.length >= cursorLine) {
            this.previewContainer.insertBefore(rawDiv, children[cursorLine - 1]);
          } else {
            this.previewContainer.appendChild(rawDiv);
          }
        }
        this._lastContent = content;
      } catch (err) {
        console.error("Live preview render error:", err);
        try {
          const html = await this.app.renderMarkdown(content);
          this.previewContainer.innerHTML = html;
          this._lastContent = content;
        } catch (fallbackErr) {
          this.previewContainer.innerHTML = `<div class="render-error">Preview Error: ${err.message}</div>`;
        }
      }
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    setContent(content) {
      this._lastContent = "";
      if (this.isActive && this.editor?.textarea) {
        this.renderLivePreview(content, 1);
      }
    }
  };

  // src/js/wikilinks.js
  init_tauri_bridge();
  var WikilinksAutoComplete = class {
    constructor(app) {
      this.app = app;
      this.popup = null;
      this.isActive = false;
      this.allNotes = [];
      this.filteredNotes = [];
      this.selectedIndex = 0;
      this.triggerPos = -1;
      this.currentTextarea = null;
      this._notesCache = null;
      this._cacheTime = 0;
    }
    /**
     * Initialize wikilinks auto-complete for a textarea
     */
    attachTo(textarea) {
      if (!textarea) return;
      textarea.addEventListener("input", (e) => this.onInput(e));
      textarea.addEventListener("keydown", (e) => this.onKeyDown(e));
      textarea.addEventListener("blur", () => this.hidePopup());
      textarea.addEventListener("click", () => {
        if (this.isActive && !this.isAtWikilink(textarea)) {
          this.hidePopup();
        }
      });
    }
    async onInput(e) {
      const textarea = e.target;
      this.currentTextarea = textarea;
      const pos = textarea.selectionStart;
      const text = textarea.value;
      if (text.substring(pos - 2, pos) === "[[") {
        this.triggerPos = pos - 2;
        await this.showWikilinkPopup(textarea);
        return;
      }
      if (this.isActive) {
        const query = this.getCurrentQuery(text, pos);
        if (query === null) {
          this.hidePopup();
        } else {
          await this.updateFilter(query);
        }
      }
    }
    onKeyDown(e) {
      if (!this.isActive) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredNotes.length - 1);
          this.updatePopupSelection();
          break;
        case "ArrowUp":
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this.updatePopupSelection();
          break;
        case "Enter":
          e.preventDefault();
          this.insertSelectedNote();
          break;
        case "Escape":
          e.preventDefault();
          this.hidePopup();
          break;
      }
    }
    getCurrentQuery(text, pos) {
      let startPos = -1;
      for (let i = pos - 1; i >= 0; i--) {
        if (text.substring(i, i + 2) === "[[") {
          startPos = i;
          break;
        }
        if (text[i] === "\n" || text[i] === "]") {
          return null;
        }
      }
      if (startPos === -1) return null;
      const query = text.substring(startPos + 2, pos);
      if (query.includes("]]")) return null;
      return query;
    }
    isAtWikilink(textarea) {
      const pos = textarea.selectionStart;
      const query = this.getCurrentQuery(textarea.value, pos);
      return query !== null;
    }
    async showWikilinkPopup(textarea) {
      await this.loadAllNotes();
      this.isActive = true;
      this.selectedIndex = 0;
      this.filteredNotes = [...this.allNotes];
      this.createPopup(textarea);
      this.updatePopupContent();
      this.positionPopup(textarea);
    }
    async loadAllNotes() {
      const now = Date.now();
      if (this._notesCache && now - this._cacheTime < 5e3) {
        this.allNotes = this._notesCache;
        return;
      }
      try {
        const tree = await invoke("list_files");
        const flatFiles = [];
        const walk = (nodes) => {
          if (!Array.isArray(nodes)) return;
          for (const node of nodes) {
            if (node.is_dir) {
              walk(node.children || []);
            } else if (node.path && node.path.endsWith(".md")) {
              flatFiles.push(node);
            }
          }
        };
        walk(tree);
        this.allNotes = flatFiles.map((file) => ({
          name: file.path.replace(".md", "").split("/").pop(),
          path: file.path,
          fullPath: file.path
        })).sort((a, b) => a.name.localeCompare(b.name));
        this._notesCache = this.allNotes;
        this._cacheTime = now;
      } catch (err) {
        console.error("Failed to load notes for wikilinks:", err);
        this.allNotes = [];
      }
    }
    async updateFilter(query) {
      if (!query) {
        this.filteredNotes = [...this.allNotes];
      } else {
        try {
          const results = await invoke("fuzzy_match_files", { query });
          this.filteredNotes = results.map((r) => ({
            name: r.path.replace(".md", "").split("/").pop(),
            path: r.path,
            fullPath: r.path
          }));
        } catch (err) {
          console.error("Failed to fuzzy match files:", err);
          const lowerQuery = query.toLowerCase();
          this.filteredNotes = this.allNotes.filter(
            (note) => note.name.toLowerCase().includes(lowerQuery)
          );
        }
      }
      this.selectedIndex = 0;
      this.updatePopupContent();
    }
    createPopup(textarea) {
      if (this.popup) {
        this.popup.remove();
      }
      this.popup = document.createElement("div");
      this.popup.className = "wikilink-popup";
      this.popup.innerHTML = `
            <div class="wikilink-popup-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                Link to note
            </div>
            <div class="wikilink-popup-list"></div>
            <div class="wikilink-popup-footer">
                <kbd>\u2191\u2193</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Cancel
            </div>
        `;
      document.body.appendChild(this.popup);
      this.popup.addEventListener("mousedown", (e) => {
        const item = e.target.closest(".wikilink-item");
        if (item) {
          const index = parseInt(item.dataset.index);
          this.selectedIndex = index;
          this.insertSelectedNote();
        }
      });
    }
    updatePopupContent() {
      if (!this.popup) return;
      const listEl = this.popup.querySelector(".wikilink-popup-list");
      if (this.filteredNotes.length === 0) {
        listEl.innerHTML = '<div class="wikilink-no-results">No notes found</div>';
        return;
      }
      const items = this.filteredNotes.slice(0, 10).map((note, index) => {
        const isSelected = index === this.selectedIndex;
        return `
                <div class="wikilink-item ${isSelected ? "selected" : ""}" data-index="${index}">
                    <div class="wikilink-item-name">${this.highlightMatch(note.name)}</div>
                    <div class="wikilink-item-path">${note.fullPath}</div>
                </div>
            `;
      }).join("");
      listEl.innerHTML = items;
    }
    highlightMatch(text) {
      const query = this.getCurrentQuery(this.currentTextarea.value, this.currentTextarea.selectionStart);
      if (!query) return this.escapeHtml(text);
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return this.escapeHtml(text).replace(regex, "<mark>$1</mark>");
    }
    updatePopupSelection() {
      if (!this.popup) return;
      const items = this.popup.querySelectorAll(".wikilink-item");
      items.forEach((item, index) => {
        item.classList.toggle("selected", index === this.selectedIndex);
      });
      const selectedItem = items[this.selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
    positionPopup(textarea) {
      if (!this.popup) return;
      const rect = textarea.getBoundingClientRect();
      const textareaStyle = window.getComputedStyle(textarea);
      const lineHeight = parseInt(textareaStyle.lineHeight) || 20;
      const pos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, pos);
      const lines = textBefore.split("\n");
      const currentLineIndex = lines.length - 1;
      const top = rect.top + currentLineIndex * lineHeight + lineHeight + 5;
      const left = rect.left + 10;
      this.popup.style.position = "fixed";
      this.popup.style.top = `${top}px`;
      this.popup.style.left = `${left}px`;
      this.popup.style.zIndex = "10000";
      const popupRect = this.popup.getBoundingClientRect();
      if (popupRect.bottom > window.innerHeight) {
        this.popup.style.top = `${rect.top - popupRect.height - 5}px`;
      }
    }
    insertSelectedNote() {
      if (!this.currentTextarea || this.selectedIndex >= this.filteredNotes.length) return;
      const selectedNote = this.filteredNotes[this.selectedIndex];
      const pos = this.currentTextarea.selectionStart;
      const text = this.currentTextarea.value;
      let startPos = this.triggerPos;
      if (startPos === -1) {
        for (let i = pos - 1; i >= 0; i--) {
          if (text.substring(i, i + 2) === "[[") {
            startPos = i;
            break;
          }
        }
      }
      if (startPos === -1) {
        this.hidePopup();
        return;
      }
      const replacement = `[[${selectedNote.name}]]`;
      this.currentTextarea.value = text.substring(0, startPos) + replacement + text.substring(pos);
      const newPos = startPos + replacement.length;
      this.currentTextarea.selectionStart = newPos;
      this.currentTextarea.selectionEnd = newPos;
      this.app.markDirty();
      this.currentTextarea.focus();
      this.hidePopup();
    }
    hidePopup() {
      if (this.popup) {
        this.popup.remove();
        this.popup = null;
      }
      this.isActive = false;
      this.triggerPos = -1;
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    invalidateCache() {
      this._notesCache = null;
      this._cacheTime = 0;
    }
  };

  // src/js/tag-autocomplete.js
  init_tauri_bridge();
  var TagAutoComplete = class {
    constructor(app) {
      this.app = app;
      this.popup = null;
      this.isActive = false;
      this.filteredTags = [];
      this.selectedIndex = 0;
      this.triggerPos = -1;
      this.currentTextarea = null;
    }
    /**
     * Initialize tag auto-complete for a textarea
     */
    attachTo(textarea) {
      if (!textarea) return;
      textarea.addEventListener("input", (e) => this.onInput(e));
      textarea.addEventListener("keydown", (e) => this.onKeyDown(e));
      textarea.addEventListener("blur", () => this.hidePopup());
      textarea.addEventListener("click", () => {
        if (this.isActive && !this.isAtTag(textarea)) {
          this.hidePopup();
        }
      });
    }
    async onInput(e) {
      const textarea = e.target;
      this.currentTextarea = textarea;
      const pos = textarea.selectionStart;
      const text = textarea.value;
      if (text[pos - 1] === "#" && this.isStartOfTag(text, pos - 1)) {
        this.triggerPos = pos - 1;
        await this.showTagPopup(textarea);
        return;
      }
      if (this.isActive) {
        const query = this.getCurrentQuery(text, pos);
        if (query === null) {
          this.hidePopup();
        } else {
          await this.updateFilter(query);
        }
      }
    }
    onKeyDown(e) {
      if (!this.isActive) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredTags.length - 1);
          this.updatePopupSelection();
          break;
        case "ArrowUp":
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
          this.updatePopupSelection();
          break;
        case "Enter":
          e.preventDefault();
          this.insertSelectedTag();
          break;
        case "Escape":
          e.preventDefault();
          this.hidePopup();
          break;
        case " ":
        case "Tab":
          this.hidePopup();
          break;
      }
    }
    isStartOfTag(text, pos) {
      if (pos === 0) return true;
      const charBefore = text[pos - 1];
      return /\s/.test(charBefore);
    }
    getCurrentQuery(text, pos) {
      let startPos = -1;
      for (let i = pos - 1; i >= 0; i--) {
        if (text[i] === "#") {
          startPos = i;
          break;
        }
        if (/\s/.test(text[i])) {
          return null;
        }
      }
      if (startPos === -1) return null;
      if (!this.isStartOfTag(text, startPos)) return null;
      const query = text.substring(startPos + 1, pos);
      if (/\s/.test(query)) return null;
      return query;
    }
    isAtTag(textarea) {
      const pos = textarea.selectionStart;
      const query = this.getCurrentQuery(textarea.value, pos);
      return query !== null;
    }
    async showTagPopup(textarea) {
      try {
        const tags = await invoke("get_all_tags");
        this.filteredTags = (tags || []).sort((a, b) => a.localeCompare(b));
      } catch (err) {
        console.error("Failed to load tags:", err);
        this.filteredTags = [];
      }
      this.isActive = true;
      this.selectedIndex = 0;
      this.createPopup(textarea);
      this.updatePopupContent();
      this.positionPopup(textarea);
    }
    async updateFilter(query) {
      if (!query) {
        try {
          const tags = await invoke("get_all_tags");
          this.filteredTags = (tags || []).sort((a, b) => a.localeCompare(b));
        } catch {
          this.filteredTags = [];
        }
      } else {
        try {
          this.filteredTags = await invoke("search_tags", { prefix: query });
        } catch {
          this.filteredTags = [];
        }
      }
      this.selectedIndex = 0;
      this.updatePopupContent();
    }
    createPopup(textarea) {
      if (this.popup) {
        this.popup.remove();
      }
      this.popup = document.createElement("div");
      this.popup.className = "tag-popup";
      this.popup.innerHTML = `
            <div class="tag-popup-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                Insert tag
            </div>
            <div class="tag-popup-list"></div>
            <div class="tag-popup-footer">
                <kbd>\u2191\u2193</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Cancel
            </div>
        `;
      document.body.appendChild(this.popup);
      this.popup.addEventListener("mousedown", (e) => {
        const item = e.target.closest(".tag-item");
        if (item) {
          const index = parseInt(item.dataset.index);
          this.selectedIndex = index;
          this.insertSelectedTag();
        }
      });
    }
    updatePopupContent() {
      if (!this.popup) return;
      const listEl = this.popup.querySelector(".tag-popup-list");
      if (this.filteredTags.length === 0) {
        listEl.innerHTML = '<div class="tag-no-results">No tags found</div>';
        return;
      }
      const items = this.filteredTags.slice(0, 10).map((tag, index) => {
        const isSelected = index === this.selectedIndex;
        return `
                <div class="tag-item ${isSelected ? "selected" : ""}" data-index="${index}">
                    <div class="tag-item-name">#${this.highlightMatch(tag)}</div>
                </div>
            `;
      }).join("");
      listEl.innerHTML = items;
    }
    highlightMatch(text) {
      const query = this.getCurrentQuery(this.currentTextarea.value, this.currentTextarea.selectionStart);
      if (!query) return this.escapeHtml(text);
      const regex = new RegExp(`^(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return this.escapeHtml(text).replace(regex, "<mark>$1</mark>");
    }
    updatePopupSelection() {
      if (!this.popup) return;
      const items = this.popup.querySelectorAll(".tag-item");
      items.forEach((item, index) => {
        item.classList.toggle("selected", index === this.selectedIndex);
      });
      const selectedItem = items[this.selectedIndex];
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest" });
      }
    }
    positionPopup(textarea) {
      if (!this.popup) return;
      const rect = textarea.getBoundingClientRect();
      const textareaStyle = window.getComputedStyle(textarea);
      const lineHeight = parseInt(textareaStyle.lineHeight) || 20;
      const pos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, pos);
      const lines = textBefore.split("\n");
      const currentLineIndex = lines.length - 1;
      const top = rect.top + currentLineIndex * lineHeight + lineHeight + 5;
      const left = rect.left + 10;
      this.popup.style.position = "fixed";
      this.popup.style.top = `${top}px`;
      this.popup.style.left = `${left}px`;
      this.popup.style.zIndex = "10000";
      const popupRect = this.popup.getBoundingClientRect();
      if (popupRect.bottom > window.innerHeight) {
        this.popup.style.top = `${rect.top - popupRect.height - 5}px`;
      }
      if (popupRect.right > window.innerWidth) {
        this.popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
      }
    }
    insertSelectedTag() {
      if (!this.currentTextarea || this.selectedIndex >= this.filteredTags.length) return;
      const selectedTag = this.filteredTags[this.selectedIndex];
      const pos = this.currentTextarea.selectionStart;
      const text = this.currentTextarea.value;
      let startPos = this.triggerPos;
      if (startPos === -1) {
        for (let i = pos - 1; i >= 0; i--) {
          if (text[i] === "#") {
            startPos = i;
            break;
          }
          if (/\s/.test(text[i])) break;
        }
      }
      if (startPos === -1) {
        this.hidePopup();
        return;
      }
      const replacement = `#${selectedTag}`;
      this.currentTextarea.value = text.substring(0, startPos) + replacement + text.substring(pos);
      const newPos = startPos + replacement.length;
      this.currentTextarea.selectionStart = newPos;
      this.currentTextarea.selectionEnd = newPos;
      this.app.markDirty();
      this.currentTextarea.focus();
      this.hidePopup();
    }
    hidePopup() {
      if (this.popup) {
        this.popup.remove();
        this.popup = null;
      }
      this.isActive = false;
      this.triggerPos = -1;
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/drag-drop.js
  init_tauri_bridge();
  var DragDrop = class {
    constructor(app) {
      this.app = app;
      this.dragOverlay = null;
      this.isDragging = false;
    }
    /**
     * Initialize drag & drop for editor
     */
    initEditor(container) {
      if (!container) return;
      this.createDragOverlay(container);
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        container.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      container.addEventListener("dragenter", (e) => this.onDragEnter(e, container));
      container.addEventListener("dragover", (e) => this.onDragOver(e));
      container.addEventListener("dragleave", (e) => this.onDragLeave(e, container));
      container.addEventListener("drop", (e) => this.onDrop(e, container));
    }
    createDragOverlay(container) {
      const overlay = document.createElement("div");
      overlay.className = "drag-drop-overlay hidden";
      overlay.innerHTML = `
            <div class="drag-drop-message">
                <div class="drag-drop-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                </div>
                <div class="drag-drop-text">
                    <div class="drag-drop-primary">Drop files to insert links</div>
                    <div class="drag-drop-secondary">Images \u2192 ![](path), Notes \u2192 [[note]], Others \u2192 [name](path)</div>
                </div>
            </div>
        `;
      container.appendChild(overlay);
      this.dragOverlay = overlay;
    }
    onDragEnter(e, container) {
      if (!this.hasFiles(e)) return;
      this.isDragging = true;
      if (this.dragOverlay) {
        this.dragOverlay.classList.remove("hidden");
      }
    }
    onDragOver(e) {
      if (!this.hasFiles(e)) return;
      e.dataTransfer.dropEffect = "copy";
    }
    onDragLeave(e, container) {
      if (!this.hasFiles(e)) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
        this.isDragging = false;
        if (this.dragOverlay) {
          this.dragOverlay.classList.add("hidden");
        }
      }
    }
    async onDrop(e, container) {
      if (!this.hasFiles(e)) return;
      this.isDragging = false;
      if (this.dragOverlay) {
        this.dragOverlay.classList.add("hidden");
      }
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      const textarea = container.querySelector(".editor-textarea");
      if (!textarea) {
        console.error("No textarea found in container");
        return;
      }
      for (const file of files) {
        await this.processDroppedFile(file, textarea);
      }
    }
    async processDroppedFile(file, textarea) {
      try {
        const filePath = file.path || file.name;
        let insertText = "";
        if (this.isImageFile(file.name)) {
          const altText = this.getFileBaseName(file.name);
          insertText = `![${altText}](${filePath})`;
        } else if (this.isMarkdownFile(file.name)) {
          const noteName = this.getFileBaseName(file.name);
          insertText = `[[${noteName}]]`;
        } else {
          const fileName = file.name;
          insertText = `[${fileName}](${filePath})`;
        }
        this.insertAtCursor(textarea, insertText);
      } catch (err) {
        console.error("Failed to process dropped file:", err);
        this.app.showErrorToast?.(`Failed to process file: ${file.name}`);
      }
    }
    insertAtCursor(textarea, text) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + text + value.substring(end);
      textarea.value = newValue;
      const newPos = start + text.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      this.app.markDirty();
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
    hasFiles(e) {
      return e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes("Files");
    }
    isImageFile(filename) {
      const ext = this.getFileExtension(filename).toLowerCase();
      return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
    }
    isMarkdownFile(filename) {
      const ext = this.getFileExtension(filename).toLowerCase();
      return ext === "md";
    }
    getFileExtension(filename) {
      const lastDot = filename.lastIndexOf(".");
      return lastDot === -1 ? "" : filename.substring(lastDot + 1);
    }
    getFileBaseName(filename) {
      const lastDot = filename.lastIndexOf(".");
      const lastSlash = filename.lastIndexOf("/");
      const start = lastSlash + 1;
      const end = lastDot === -1 ? filename.length : lastDot;
      return filename.substring(start, end);
    }
    /**
     * Initialize drag & drop for file explorer
     */
    initFileExplorer(container) {
      if (!container) return;
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const target = e.target.closest(".file-tree-item");
        if (target && this.isFolder(target)) {
          target.classList.add("drag-over");
          e.dataTransfer.dropEffect = "move";
        }
      });
      container.addEventListener("dragleave", (e) => {
        const target = e.target.closest(".file-tree-item");
        if (target) {
          target.classList.remove("drag-over");
        }
      });
      container.addEventListener("drop", async (e) => {
        e.preventDefault();
        const target = e.target.closest(".file-tree-item");
        if (target) {
          target.classList.remove("drag-over");
          if (this.isFolder(target)) {
            await this.handleFileExplorerDrop(e, target);
          }
        }
      });
      this.makeFileItemsDraggable(container);
    }
    makeFileItemsDraggable(container) {
      const items = container.querySelectorAll(".file-tree-item[data-path]");
      items.forEach((item) => {
        if (!this.isFolder(item)) {
          item.draggable = true;
          item.addEventListener("dragstart", (e) => {
            const path = item.dataset.path;
            e.dataTransfer.setData("text/oxidian-file-path", path);
            e.dataTransfer.effectAllowed = "move";
          });
        }
      });
    }
    async handleFileExplorerDrop(e, folderItem) {
      const filePath = e.dataTransfer.getData("text/oxidian-file-path");
      if (!filePath) return;
      const targetFolder = folderItem.dataset.path || "";
      const fileName = filePath.split("/").pop();
      const newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
      if (filePath === newPath) return;
      try {
        await invoke("move_file", {
          oldPath: filePath,
          newPath
        });
        await this.app.sidebar?.refresh();
        if (this.app.currentFile === filePath) {
          this.app.currentFile = newPath;
          this.app.updateBreadcrumb(newPath);
        }
      } catch (err) {
        console.error("Failed to move file:", err);
        this.app.showErrorToast?.(`Failed to move file: ${err.message}`);
      }
    }
    isFolder(item) {
      return item.classList.contains("folder") || item.classList.contains("file-tree-folder");
    }
    destroy() {
      this.isDragging = false;
      if (this.dragOverlay) {
        this.dragOverlay.remove();
        this.dragOverlay = null;
      }
    }
  };

  // src/js/multiple-cursors.js
  var MultipleCursors = class {
    constructor(app) {
      this.app = app;
      this.textarea = null;
      this.selections = [];
      this.isActive = false;
      this.originalSelection = null;
      this.searchTerm = "";
      this._overlays = [];
    }
    /**
     * Initialize multiple cursors for a textarea
     */
    attachTo(textarea) {
      if (!textarea) return;
      this.textarea = textarea;
      textarea.addEventListener("keydown", (e) => this.onKeyDown(e));
      textarea.addEventListener("click", () => this.clear());
      textarea.addEventListener("blur", () => this.clear());
    }
    onKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "d" && document.activeElement === this.textarea) {
        e.preventDefault();
        e.stopPropagation();
        this.selectNextOccurrence();
      } else if (this.isActive && this.shouldHandleKey(e)) {
        e.preventDefault();
        this.handleMultiCursorInput(e);
      }
    }
    selectNextOccurrence() {
      if (!this.textarea) return;
      const currentSelection = this.getCurrentSelection();
      if (!this.isActive) {
        this.initMultiCursor(currentSelection);
      } else {
        this.addNextOccurrence();
      }
    }
    initMultiCursor(selection) {
      if (!selection.text.trim()) {
        const wordBounds = this.getCurrentWordBounds();
        if (!wordBounds) return;
        this.textarea.selectionStart = wordBounds.start;
        this.textarea.selectionEnd = wordBounds.end;
        selection = this.getCurrentSelection();
      }
      this.searchTerm = selection.text;
      this.originalSelection = { ...selection };
      this.selections = [selection];
      this.isActive = true;
      this.addNextOccurrence();
      this.updateVisualCursors();
    }
    addNextOccurrence() {
      if (!this.searchTerm) return;
      const text = this.textarea.value;
      const lastSelection = this.selections[this.selections.length - 1];
      const searchStart = lastSelection.end;
      const nextIndex = text.indexOf(this.searchTerm, searchStart);
      if (nextIndex === -1) {
        const wrapIndex = text.indexOf(this.searchTerm, 0);
        if (wrapIndex !== -1 && wrapIndex < this.originalSelection.start) {
          this.addSelection(wrapIndex, wrapIndex + this.searchTerm.length);
        }
      } else {
        this.addSelection(nextIndex, nextIndex + this.searchTerm.length);
      }
      this.updateVisualCursors();
    }
    addSelection(start, end) {
      const overlaps = this.selections.some(
        (sel) => start >= sel.start && start < sel.end || end > sel.start && end <= sel.end || start <= sel.start && end >= sel.end
      );
      if (!overlaps) {
        this.selections.push({ start, end, text: this.searchTerm });
      }
    }
    getCurrentSelection() {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const text = this.textarea.value.substring(start, end);
      return { start, end, text };
    }
    getCurrentWordBounds() {
      const pos = this.textarea.selectionStart;
      const text = this.textarea.value;
      let start = pos;
      let end = pos;
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }
      if (start === end) return null;
      return { start, end };
    }
    shouldHandleKey(e) {
      const typingKeys = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      const deletionKeys = ["Backspace", "Delete"];
      const navigationKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      return typingKeys || deletionKeys.includes(e.key) || navigationKeys.includes(e.key) && !e.shiftKey;
    }
    handleMultiCursorInput(e) {
      if (e.key === "Escape") {
        this.clear();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
        this.clear();
        return;
      }
      let newText = this.textarea.value;
      let offset = 0;
      const sortedSelections = [...this.selections].sort((a, b) => b.start - a.start);
      for (const selection of sortedSelections) {
        const adjustedStart = selection.start + offset;
        const adjustedEnd = selection.end + offset;
        if (e.key === "Backspace") {
          if (adjustedStart === adjustedEnd && adjustedStart > 0) {
            newText = newText.substring(0, adjustedStart - 1) + newText.substring(adjustedStart);
            offset -= 1;
          } else if (adjustedStart < adjustedEnd) {
            newText = newText.substring(0, adjustedStart) + newText.substring(adjustedEnd);
            offset -= adjustedEnd - adjustedStart;
          }
        } else if (e.key === "Delete") {
          if (adjustedStart === adjustedEnd && adjustedStart < newText.length) {
            newText = newText.substring(0, adjustedStart) + newText.substring(adjustedStart + 1);
          } else if (adjustedStart < adjustedEnd) {
            newText = newText.substring(0, adjustedStart) + newText.substring(adjustedEnd);
            offset -= adjustedEnd - adjustedStart;
          }
        } else if (e.key.length === 1) {
          newText = newText.substring(0, adjustedStart) + e.key + newText.substring(adjustedEnd);
          offset += 1 - (adjustedEnd - adjustedStart);
        }
      }
      this.textarea.value = newText;
      this.app.markDirty();
      this.textarea.dispatchEvent(new Event("input", { bubbles: true }));
      this.clear();
    }
    updateVisualCursors() {
      this.clearOverlays();
      if (!this.isActive || this.selections.length <= 1) return;
      const container = this.textarea.parentElement;
      if (!container) return;
      this.selections.forEach((selection, index) => {
        if (index === 0) return;
        const overlay = this.createCursorOverlay(selection);
        if (overlay) {
          container.appendChild(overlay);
          this._overlays.push(overlay);
        }
      });
    }
    createCursorOverlay(selection) {
      const overlay = document.createElement("div");
      overlay.className = "multi-cursor-overlay";
      const textBefore = this.textarea.value.substring(0, selection.start);
      const lines = textBefore.split("\n");
      const line = lines.length - 1;
      const column = lines[lines.length - 1].length;
      const lineHeight = 20;
      const charWidth = 8;
      overlay.style.position = "absolute";
      overlay.style.top = `${line * lineHeight}px`;
      overlay.style.left = `${column * charWidth}px`;
      overlay.style.width = "2px";
      overlay.style.height = `${lineHeight}px`;
      overlay.style.background = "var(--accent-color, #007acc)";
      overlay.style.zIndex = "10";
      overlay.style.pointerEvents = "none";
      return overlay;
    }
    clearOverlays() {
      this._overlays.forEach((overlay) => {
        if (overlay.parentElement) {
          overlay.parentElement.removeChild(overlay);
        }
      });
      this._overlays = [];
    }
    clear() {
      this.isActive = false;
      this.selections = [];
      this.searchTerm = "";
      this.originalSelection = null;
      this.clearOverlays();
    }
    destroy() {
      this.clear();
      this.textarea = null;
    }
  };

  // src/js/properties-panel.js
  init_tauri_bridge();
  var PropertiesPanel = class {
    constructor(app) {
      this.app = app;
      this.panel = null;
      this.isExpanded = localStorage.getItem("oxidian-properties-expanded") === "true";
      this.textarea = null;
      this.properties = {};
      this.isUpdating = false;
    }
    /**
     * Initialize properties panel for editor container
     */
    init(container) {
      if (!container) return;
      this.createPanel(container);
      this.bindEvents();
    }
    createPanel(container) {
      const panel = document.createElement("div");
      panel.className = `properties-panel ${this.isExpanded ? "expanded" : "collapsed"}`;
      panel.innerHTML = `
            <div class="properties-header" role="button" tabindex="0">
                <div class="properties-toggle">
                    <svg class="properties-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    <span class="properties-title">Properties</span>
                    <span class="properties-count">0</span>
                </div>
                <div class="properties-actions">
                    <button class="properties-add-btn" title="Add Property" type="button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="properties-content">
                <div class="properties-list"></div>
                <div class="properties-empty">
                    <p>No properties in this note</p>
                    <p class="properties-help">Add frontmatter by clicking the + button or typing --- at the start of the note</p>
                </div>
            </div>
        `;
      container.insertBefore(panel, container.firstChild);
      this.panel = panel;
    }
    bindEvents() {
      if (!this.panel) return;
      const header = this.panel.querySelector(".properties-header");
      header.addEventListener("click", () => this.toggle());
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggle();
        }
      });
      const addBtn = this.panel.querySelector(".properties-add-btn");
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.addProperty();
      });
    }
    toggle() {
      this.isExpanded = !this.isExpanded;
      localStorage.setItem("oxidian-properties-expanded", this.isExpanded.toString());
      this.panel.classList.toggle("expanded", this.isExpanded);
      this.panel.classList.toggle("collapsed", !this.isExpanded);
      const chevron = this.panel.querySelector(".properties-chevron");
      chevron.style.transform = this.isExpanded ? "rotate(0deg)" : "rotate(-90deg)";
    }
    /**
     * Attach to a textarea to sync properties
     */
    attachTo(textarea) {
      if (!textarea) return;
      this.textarea = textarea;
      this.parsePropertiesFromContent(textarea.value);
      textarea.addEventListener("input", () => {
        if (!this.isUpdating) {
          this.parsePropertiesFromContent(textarea.value);
        }
      });
    }
    async parsePropertiesFromContent(content) {
      this.properties = {};
      try {
        const result = await invoke("parse_frontmatter", { content });
        if (result && result.frontmatter && typeof result.frontmatter === "object") {
          for (const [key, value] of Object.entries(result.frontmatter)) {
            this.properties[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
          }
        }
      } catch (err) {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          try {
            const lines = match[1].split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith("#")) continue;
              const colonIndex = trimmed.indexOf(":");
              if (colonIndex === -1) continue;
              const key = trimmed.substring(0, colonIndex).trim();
              let value = trimmed.substring(colonIndex + 1).trim();
              if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
              }
              this.properties[key] = value;
            }
          } catch (parseErr) {
            console.warn("Failed to parse YAML frontmatter:", parseErr);
          }
        }
      }
      this.updatePanelContent();
    }
    updatePanelContent() {
      if (!this.panel) return;
      const count = Object.keys(this.properties).length;
      const countEl = this.panel.querySelector(".properties-count");
      countEl.textContent = count.toString();
      const listEl = this.panel.querySelector(".properties-list");
      const emptyEl = this.panel.querySelector(".properties-empty");
      if (count === 0) {
        listEl.innerHTML = "";
        emptyEl.style.display = "block";
      } else {
        emptyEl.style.display = "none";
        listEl.innerHTML = this.renderPropertiesList();
        this.bindPropertyEvents();
      }
    }
    renderPropertiesList() {
      return Object.entries(this.properties).map(([key, value]) => `
            <div class="property-item" data-key="${this.escapeHtml(key)}">
                <div class="property-key">
                    <input type="text" class="property-key-input" value="${this.escapeHtml(key)}" placeholder="Property name">
                </div>
                <div class="property-value">
                    <input type="text" class="property-value-input" value="${this.escapeHtml(value)}" placeholder="Property value">
                </div>
                <div class="property-actions">
                    <button class="property-delete-btn" title="Delete Property" type="button">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join("");
    }
    bindPropertyEvents() {
      if (!this.panel) return;
      this.panel.querySelectorAll(".property-key-input").forEach((input) => {
        input.addEventListener("blur", () => this.onPropertyKeyChange(input));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            input.blur();
          }
        });
      });
      this.panel.querySelectorAll(".property-value-input").forEach((input) => {
        input.addEventListener("blur", () => this.onPropertyValueChange(input));
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            input.blur();
          }
        });
      });
      this.panel.querySelectorAll(".property-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => this.onDeleteProperty(btn));
      });
    }
    onPropertyKeyChange(input) {
      const item = input.closest(".property-item");
      const oldKey = item.dataset.key;
      const newKey = input.value.trim();
      if (!newKey || newKey === oldKey) {
        input.value = oldKey;
        return;
      }
      if (this.properties.hasOwnProperty(newKey)) {
        input.value = oldKey;
        return;
      }
      const value = this.properties[oldKey];
      delete this.properties[oldKey];
      this.properties[newKey] = value;
      item.dataset.key = newKey;
      this.updateContentFromProperties();
    }
    onPropertyValueChange(input) {
      const item = input.closest(".property-item");
      const key = item.dataset.key;
      const newValue = input.value;
      this.properties[key] = newValue;
      this.updateContentFromProperties();
    }
    onDeleteProperty(btn) {
      const item = btn.closest(".property-item");
      const key = item.dataset.key;
      delete this.properties[key];
      item.remove();
      this.updatePanelContent();
      this.updateContentFromProperties();
    }
    addProperty() {
      let counter = 1;
      let key = "property";
      while (this.properties.hasOwnProperty(key)) {
        key = `property${counter}`;
        counter++;
      }
      this.properties[key] = "";
      this.updatePanelContent();
      setTimeout(() => {
        const newInput = this.panel.querySelector(`[data-key="${key}"] .property-key-input`);
        if (newInput) {
          newInput.focus();
          newInput.select();
        }
      }, 50);
    }
    async updateContentFromProperties() {
      if (!this.textarea || this.isUpdating) return;
      this.isUpdating = true;
      const content = this.textarea.value;
      const count = Object.keys(this.properties).length;
      if (count === 0) {
        const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
        this.textarea.value = withoutFrontmatter;
      } else {
        let newFrontmatter;
        try {
          newFrontmatter = await invoke("stringify_frontmatter", { frontmatter: this.properties });
        } catch {
          const yamlLines = ["---"];
          for (const [key, value] of Object.entries(this.properties)) {
            let yamlValue = value;
            if (typeof yamlValue === "string" && (/[:#\[\]{}|>]/.test(yamlValue) || yamlValue.trim() !== yamlValue)) {
              yamlValue = `"${yamlValue.replace(/"/g, '\\"')}"`;
            }
            yamlLines.push(`${key}: ${yamlValue}`);
          }
          yamlLines.push("---");
          newFrontmatter = yamlLines.join("\n") + "\n";
        }
        const existingMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
        if (existingMatch) {
          this.textarea.value = content.replace(existingMatch[0], newFrontmatter);
        } else {
          this.textarea.value = newFrontmatter + content;
        }
      }
      this.textarea.dispatchEvent(new Event("input", { bubbles: true }));
      this.app.markDirty();
      this.isUpdating = false;
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    destroy() {
      if (this.panel) {
        this.panel.remove();
        this.panel = null;
      }
      this.textarea = null;
      this.properties = {};
    }
  };

  // src/js/hover-preview.js
  init_tauri_bridge();
  var HoverPreview = class {
    constructor(app) {
      this.app = app;
      this.popup = null;
      this.currentLink = null;
      this.hoverTimer = null;
      this.isVisible = false;
      this.cache = /* @__PURE__ */ new Map();
      this._boundHandlers = {
        mouseover: (e) => this.onMouseOver(e),
        mouseout: (e) => this.onMouseOut(e),
        keydown: (e) => this.onKeyDown(e)
      };
    }
    /**
     * Initialize hover preview for a container
     */
    init(container) {
      if (!container) return;
      this.destroy();
      container.addEventListener("mouseover", this._boundHandlers.mouseover);
      container.addEventListener("mouseout", this._boundHandlers.mouseout);
      document.addEventListener("keydown", this._boundHandlers.keydown);
      this.container = container;
    }
    onMouseOver(e) {
      const link = this.findWikilink(e.target);
      if (!link) {
        this.hidePreview();
        return;
      }
      clearTimeout(this.hoverTimer);
      if (this.currentLink !== link.href) {
        this.currentLink = link.href;
        this.hoverTimer = setTimeout(() => {
          this.showPreview(link, e.clientX, e.clientY);
        }, 500);
      }
    }
    onMouseOut(e) {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && this.popup && this.popup.contains(relatedTarget)) {
        return;
      }
      const link = this.findWikilink(e.relatedTarget);
      if (link && link.href === this.currentLink) {
        return;
      }
      clearTimeout(this.hoverTimer);
      this.scheduleHide();
    }
    onKeyDown(e) {
      if (e.key === "Escape") {
        this.hidePreview();
      } else if (this.isVisible && e.ctrlKey) {
        if (this.popup) {
          this.popup.classList.add("extended");
        }
      }
    }
    findWikilink(element) {
      if (!element) return null;
      if (element.classList?.contains("wikilink") || element.textContent?.match(/\[\[.+?\]\]/)) {
        return this.parseWikilink(element);
      }
      let parent = element.parentElement;
      while (parent && parent !== this.container) {
        if (parent.classList?.contains("wikilink") || parent.textContent?.match(/\[\[.+?\]\]/)) {
          return this.parseWikilink(parent);
        }
        parent = parent.parentElement;
      }
      const text = element.textContent || "";
      const wikilinkMatch = text.match(/\[\[([^\]]+)\]\]/);
      if (wikilinkMatch) {
        return {
          element,
          href: wikilinkMatch[1].trim(),
          display: wikilinkMatch[1].trim()
        };
      }
      return null;
    }
    parseWikilink(element) {
      if (!element) return null;
      const text = element.textContent || "";
      const match = text.match(/\[\[([^\]]+)\]\]/);
      if (match) {
        const linkText = match[1].trim();
        const parts = linkText.split("|");
        const href = parts[0].trim();
        const display = parts[1]?.trim() || href;
        return {
          element,
          href,
          display
        };
      }
      return null;
    }
    async showPreview(link, x, y) {
      if (!link?.href) return;
      try {
        const content = await this.loadNoteContent(link.href);
        if (!content) {
          this.showNotFoundPreview(link, x, y);
          return;
        }
        this.createPreviewPopup(link, content, x, y);
        this.isVisible = true;
      } catch (err) {
        console.error("Failed to load preview:", err);
        this.showErrorPreview(link, err.message, x, y);
      }
    }
    async loadNoteContent(noteName) {
      if (this.cache.has(noteName)) {
        const cached = this.cache.get(noteName);
        if (Date.now() - cached.time < 3e4) {
          return cached.content;
        }
      }
      try {
        const possiblePaths = [
          `${noteName}.md`,
          `${noteName}`,
          noteName.endsWith(".md") ? noteName : null
        ].filter(Boolean);
        let content = null;
        for (const path of possiblePaths) {
          try {
            content = await invoke("read_note", { path });
            break;
          } catch (err) {
            continue;
          }
        }
        if (content !== null) {
          this.cache.set(noteName, {
            content,
            time: Date.now()
          });
          if (this.cache.size > 50) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
          }
        }
        return content;
      } catch (err) {
        console.error("Failed to load note for preview:", err);
        return null;
      }
    }
    createPreviewPopup(link, content, x, y) {
      this.hidePreview();
      const truncatedContent = this.truncateContent(content);
      const popup = document.createElement("div");
      popup.className = "hover-preview-popup";
      popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
                <div class="hover-preview-actions">
                    <button class="hover-preview-open" title="Open note">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </button>
                    <button class="hover-preview-close" title="Close">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="hover-preview-content">
                <div class="loading">Loading...</div>
            </div>
            <div class="hover-preview-footer">
                <span class="hover-preview-hint">Ctrl+hover for extended view</span>
            </div>
        `;
      document.body.appendChild(popup);
      this.popup = popup;
      this.positionPopup(popup, x, y);
      this.renderPreviewContent(truncatedContent);
      this.bindPopupEvents(link);
      popup.addEventListener("mouseenter", () => {
        clearTimeout(this.hoverTimer);
      });
      popup.addEventListener("mouseleave", () => {
        this.scheduleHide();
      });
    }
    async renderPreviewContent(content) {
      if (!this.popup) return;
      const contentEl = this.popup.querySelector(".hover-preview-content");
      try {
        let html;
        try {
          html = await invoke("render_markdown_html", { content });
        } catch {
          html = await this.app.renderMarkdown?.(content);
        }
        if (!html) {
          contentEl.innerHTML = `<p style="color: var(--text-faint)">Empty note</p>`;
          return;
        }
        contentEl.innerHTML = html;
        await this.app.postProcessRendered?.(contentEl);
      } catch (err) {
        contentEl.innerHTML = `<div class="preview-error">Failed to render preview: ${err.message}</div>`;
      }
    }
    truncateContent(content, maxLines = 15) {
      const lines = content.split("\n");
      let startLine = 0;
      if (lines[0] === "---") {
        const endIndex = lines.findIndex((line, i) => i > 0 && line === "---");
        if (endIndex !== -1) {
          startLine = endIndex + 1;
        }
      }
      const relevantLines = lines.slice(startLine, startLine + maxLines);
      let result = relevantLines.join("\n").trim();
      if (lines.length > startLine + maxLines) {
        result += "\n\n...";
      }
      return result;
    }
    showNotFoundPreview(link, x, y) {
      this.hidePreview();
      const popup = document.createElement("div");
      popup.className = "hover-preview-popup not-found";
      popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
            </div>
            <div class="hover-preview-content">
                <div class="preview-not-found">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <p>Note not found</p>
                    <button class="create-note-btn" data-note="${this.escapeHtml(link.href)}">Create note</button>
                </div>
            </div>
        `;
      document.body.appendChild(popup);
      this.popup = popup;
      this.positionPopup(popup, x, y);
      popup.querySelector(".create-note-btn")?.addEventListener("click", () => {
        this.createNote(link.href);
      });
      this.isVisible = true;
    }
    showErrorPreview(link, errorMessage, x, y) {
      this.hidePreview();
      const popup = document.createElement("div");
      popup.className = "hover-preview-popup error";
      popup.innerHTML = `
            <div class="hover-preview-header">
                <div class="hover-preview-title">${this.escapeHtml(link.display)}</div>
            </div>
            <div class="hover-preview-content">
                <div class="preview-error">
                    <p>Error loading preview:</p>
                    <code>${this.escapeHtml(errorMessage)}</code>
                </div>
            </div>
        `;
      document.body.appendChild(popup);
      this.popup = popup;
      this.positionPopup(popup, x, y);
      this.isVisible = true;
    }
    bindPopupEvents(link) {
      if (!this.popup) return;
      const openBtn = this.popup.querySelector(".hover-preview-open");
      openBtn?.addEventListener("click", () => {
        this.openNote(link.href);
      });
      const closeBtn = this.popup.querySelector(".hover-preview-close");
      closeBtn?.addEventListener("click", () => {
        this.hidePreview();
      });
    }
    positionPopup(popup, x, y) {
      const rect = popup.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = x + 10;
      let top = y + 10;
      if (left + rect.width > viewportWidth) {
        left = x - rect.width - 10;
      }
      if (top + rect.height > viewportHeight) {
        top = y - rect.height - 10;
      }
      left = Math.max(10, Math.min(left, viewportWidth - rect.width - 10));
      top = Math.max(10, Math.min(top, viewportHeight - rect.height - 10));
      popup.style.position = "fixed";
      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.style.zIndex = "10000";
    }
    scheduleHide() {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = setTimeout(() => {
        this.hidePreview();
      }, 300);
    }
    hidePreview() {
      clearTimeout(this.hoverTimer);
      if (this.popup) {
        this.popup.remove();
        this.popup = null;
      }
      this.currentLink = null;
      this.isVisible = false;
    }
    async openNote(noteName) {
      this.hidePreview();
      try {
        await this.app.navigateToNote(noteName);
      } catch (err) {
        console.error("Failed to open note:", err);
      }
    }
    async createNote(noteName) {
      this.hidePreview();
      try {
        await this.app.navigateToNote(noteName);
      } catch (err) {
        console.error("Failed to create note:", err);
      }
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    destroy() {
      this.hidePreview();
      if (this.container) {
        this.container.removeEventListener("mouseover", this._boundHandlers.mouseover);
        this.container.removeEventListener("mouseout", this._boundHandlers.mouseout);
        this.container = null;
      }
      document.removeEventListener("keydown", this._boundHandlers.keydown);
      this.cache.clear();
    }
  };

  // src/js/canvas.js
  init_tauri_bridge();
  var Canvas = class {
    constructor(app) {
      this.app = app;
      this.container = null;
      this.canvas = null;
      this.ctx = null;
      this.nodes = /* @__PURE__ */ new Map();
      this.connections = /* @__PURE__ */ new Map();
      this.selectedNode = null;
      this.draggedNode = null;
      this.dragOffset = { x: 0, y: 0 };
      this.viewport = { x: 0, y: 0, zoom: 1 };
      this.isConnecting = false;
      this.connectionStart = null;
      this._animationFrame = null;
      this._canvasPath = null;
    }
    init(container) {
      if (!container) return;
      this.container = container;
      this.createCanvasUI();
      this.bindEvents();
      this.startRenderLoop();
    }
    // --- Data: Load/Save via Rust ---
    async loadCanvas(path) {
      try {
        this._canvasPath = path;
        const data = await invoke("load_canvas", { path });
        this._applyCanvasData(data);
      } catch (err) {
        console.error("Failed to load canvas:", err);
      }
    }
    async saveCanvas() {
      const data = {
        nodes: Array.from(this.nodes.values()),
        connections: Array.from(this.connections.values()),
        viewport: this.viewport
      };
      try {
        const path = this._canvasPath || `canvas-${Date.now()}.canvas`;
        await invoke("save_canvas", { path, data });
        this._canvasPath = path;
        console.log(`Canvas saved: ${path}`);
      } catch (err) {
        console.error("Failed to save canvas:", err);
      }
    }
    _applyCanvasData(data) {
      this.nodes.clear();
      this.connections.clear();
      if (this.nodesContainer) this.nodesContainer.innerHTML = "";
      if (data.nodes) {
        for (const n of data.nodes) {
          this.nodes.set(n.id, n);
          this.createNodeElement(n);
        }
      }
      if (data.connections) {
        for (const c of data.connections) {
          this.connections.set(c.id || `${c.from}-${c.to}`, c);
        }
      }
      if (data.viewport) {
        this.viewport = { ...this.viewport, ...data.viewport };
      }
    }
    // --- Node CRUD via Rust ---
    async addNoteCard() {
      const pos = this.getMousePosition();
      try {
        const node = await invoke("canvas_add_node", {
          canvasPath: this._canvasPath,
          nodeType: "note",
          x: pos.x - 100,
          y: pos.y - 75,
          width: 200,
          height: 150,
          content: "New Note"
        });
        this.nodes.set(node.id, node);
        this.createNodeElement(node);
      } catch (err) {
        console.error("Failed to add note card:", err);
      }
    }
    async addTextBox() {
      const pos = this.getMousePosition();
      try {
        const node = await invoke("canvas_add_node", {
          canvasPath: this._canvasPath,
          nodeType: "text",
          x: pos.x - 100,
          y: pos.y - 50,
          width: 200,
          height: 100,
          content: "Text Box"
        });
        this.nodes.set(node.id, node);
        this.createNodeElement(node);
      } catch (err) {
        console.error("Failed to add text box:", err);
      }
    }
    async addGroup() {
      const pos = this.getMousePosition();
      try {
        const node = await invoke("canvas_add_node", {
          canvasPath: this._canvasPath,
          nodeType: "group",
          x: pos.x - 150,
          y: pos.y - 100,
          width: 300,
          height: 200,
          content: "Group"
        });
        this.nodes.set(node.id, node);
        this.createNodeElement(node);
      } catch (err) {
        console.error("Failed to add group:", err);
      }
    }
    async moveNode(nodeId, x, y) {
      const node = this.nodes.get(nodeId);
      if (!node) return;
      node.x = x;
      node.y = y;
      this.updateNodeElement(node);
      try {
        await invoke("canvas_move_node", {
          canvasPath: this._canvasPath,
          nodeId,
          x,
          y
        });
      } catch (err) {
        console.error("Failed to move node:", err);
      }
    }
    async deleteNode(nodeId) {
      const element = this.nodesContainer?.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) element.remove();
      this.nodes.delete(nodeId);
      this.connections.forEach((connection, id) => {
        if (connection.from === nodeId || connection.to === nodeId) {
          this.connections.delete(id);
        }
      });
      if (this.selectedNode?.id === nodeId) {
        this.selectedNode = null;
      }
      try {
        await invoke("canvas_delete_node", {
          canvasPath: this._canvasPath,
          nodeId
        });
      } catch (err) {
        console.error("Failed to delete node:", err);
      }
    }
    async addConnection(fromId, toId) {
      try {
        const conn = await invoke("canvas_add_edge", {
          canvasPath: this._canvasPath,
          from: fromId,
          to: toId
        });
        this.connections.set(conn.id || `${fromId}-${toId}`, conn);
      } catch (err) {
        console.error("Failed to add connection:", err);
      }
    }
    // --- UI Creation (unchanged) ---
    createCanvasUI() {
      this.container.innerHTML = `
            <div class="canvas-wrapper">
                <div class="canvas-toolbar">
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-add-note" title="Add Note Card">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="12" y1="18" x2="12" y2="12"/>
                                <line x1="9" y1="15" x2="15" y2="15"/>
                            </svg>
                            Add Note
                        </button>
                        <button class="canvas-btn" id="canvas-add-text" title="Add Text Box">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="4 7 4 4 20 4 20 7"/>
                                <line x1="9" y1="20" x2="15" y2="20"/>
                                <line x1="12" y1="4" x2="12" y2="20"/>
                            </svg>
                            Add Text
                        </button>
                        <button class="canvas-btn" id="canvas-add-group" title="Add Group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <rect x="7" y="7" width="10" height="10" rx="1" ry="1"/>
                            </svg>
                            Add Group
                        </button>
                    </div>
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-zoom-in" title="Zoom In">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                                <line x1="11" y1="8" x2="11" y2="14"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </button>
                        <button class="canvas-btn" id="canvas-zoom-out" title="Zoom Out">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                                <line x1="8" y1="11" x2="14" y2="11"/>
                            </svg>
                        </button>
                        <button class="canvas-btn" id="canvas-fit" title="Fit to Screen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
                            </svg>
                        </button>
                    </div>
                    <div class="canvas-toolbar-group">
                        <button class="canvas-btn" id="canvas-save" title="Save Canvas">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Save
                        </button>
                    </div>
                </div>
                <div class="canvas-viewport">
                    <canvas class="canvas-main" width="800" height="600"></canvas>
                    <div class="canvas-nodes"></div>
                </div>
                <div class="canvas-minimap">
                    <canvas class="canvas-minimap-canvas" width="200" height="150"></canvas>
                </div>
            </div>
        `;
      this.canvas = this.container.querySelector(".canvas-main");
      this.ctx = this.canvas.getContext("2d");
      this.nodesContainer = this.container.querySelector(".canvas-nodes");
      this.resizeCanvas();
    }
    bindEvents() {
      if (!this.container) return;
      document.getElementById("canvas-add-note")?.addEventListener("click", () => this.addNoteCard());
      document.getElementById("canvas-add-text")?.addEventListener("click", () => this.addTextBox());
      document.getElementById("canvas-add-group")?.addEventListener("click", () => this.addGroup());
      document.getElementById("canvas-zoom-in")?.addEventListener("click", () => this.zoomIn());
      document.getElementById("canvas-zoom-out")?.addEventListener("click", () => this.zoomOut());
      document.getElementById("canvas-fit")?.addEventListener("click", () => this.fitToScreen());
      document.getElementById("canvas-save")?.addEventListener("click", () => this.saveCanvas());
      this.canvas.addEventListener("mousedown", (e) => this.onCanvasMouseDown(e));
      this.canvas.addEventListener("wheel", (e) => this.onCanvasWheel(e));
      this.canvas.addEventListener("dblclick", (e) => this.onCanvasDoubleClick(e));
      this._boundMouseMove = (e) => this.onCanvasMouseMove(e);
      this._boundMouseUp = (e) => this.onCanvasMouseUp(e);
      document.addEventListener("mousemove", this._boundMouseMove);
      document.addEventListener("mouseup", this._boundMouseUp);
      this._boundTouchMove = (e) => {
        if (this.draggedNode) {
          e.preventDefault();
          this.onCanvasMouseMove(e.touches[0]);
        }
      };
      this._boundTouchEnd = (e) => this.onCanvasMouseUp(e);
      document.addEventListener("touchmove", this._boundTouchMove, { passive: false });
      document.addEventListener("touchend", this._boundTouchEnd);
      window.addEventListener("resize", () => this.resizeCanvas());
      this._boundKeyDown = (e) => this.onKeyDown(e);
      document.addEventListener("keydown", this._boundKeyDown);
    }
    resizeCanvas() {
      if (!this.canvas) return;
      const rect = this.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.ctx.scale(dpr, dpr);
    }
    startRenderLoop() {
      const render = () => {
        this.render();
        this._animationFrame = requestAnimationFrame(render);
      };
      render();
    }
    stopRenderLoop() {
      if (this._animationFrame) {
        cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
      }
    }
    render() {
      if (!this.ctx || !this.canvas) return;
      const { width, height } = this.canvas;
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.save();
      this.ctx.translate(this.viewport.x, this.viewport.y);
      this.ctx.scale(this.viewport.zoom, this.viewport.zoom);
      this.drawGrid();
      this.drawConnections();
      if (this.isConnecting && this.connectionStart) {
        this.drawConnectionPreview();
      }
      this.ctx.restore();
    }
    drawGrid() {
      const gridSize = 20;
      const { width, height } = this.canvas;
      this.ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(width, y);
      }
      this.ctx.stroke();
    }
    drawConnections() {
      this.connections.forEach((connection) => {
        const fromNode = this.nodes.get(connection.from);
        const toNode = this.nodes.get(connection.to);
        if (!fromNode || !toNode) return;
        const fromPoint = this.getConnectionPoint(fromNode, "output");
        const toPoint = this.getConnectionPoint(toNode, "input");
        this.drawConnection(fromPoint, toPoint);
      });
    }
    drawConnection(from, to) {
      const controlOffset = 50;
      this.ctx.strokeStyle = "#007acc";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.bezierCurveTo(
        from.x + controlOffset,
        from.y,
        to.x - controlOffset,
        to.y,
        to.x,
        to.y
      );
      this.ctx.stroke();
      this.drawArrow(to.x, to.y, Math.PI);
    }
    drawArrow(x, y, angle) {
      const size = 8;
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      this.ctx.fillStyle = "#007acc";
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(-size, -size / 2);
      this.ctx.lineTo(-size, size / 2);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
    drawConnectionPreview() {
      if (!this.connectionStart) return;
      const mousePos = this.getMousePosition();
      this.ctx.strokeStyle = "rgba(0, 122, 204, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.connectionStart.x, this.connectionStart.y);
      this.ctx.lineTo(mousePos.x, mousePos.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    getConnectionPoint(node, type) {
      const centerY = node.y + node.height / 2;
      if (type === "output") {
        return { x: node.x + node.width, y: centerY };
      } else {
        return { x: node.x, y: centerY };
      }
    }
    createNodeElement(node) {
      const element = document.createElement("div");
      element.className = `canvas-node canvas-node-${node.type}`;
      element.dataset.nodeId = node.id;
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      element.style.width = `${node.width}px`;
      element.style.height = `${node.height}px`;
      if (node.type === "note") {
        element.innerHTML = `
                <div class="canvas-node-header">
                    <div class="canvas-node-title">${this.escapeHtml(node.content)}</div>
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-connect" title="Connect">\u27F7</button>
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">\u2715</button>
                    </div>
                </div>
                <div class="canvas-node-content">
                    <div class="canvas-node-preview">Click to select a note...</div>
                </div>
            `;
      } else if (node.type === "text") {
        element.innerHTML = `
                <div class="canvas-node-header">
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-connect" title="Connect">\u27F7</button>
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">\u2715</button>
                    </div>
                </div>
                <textarea class="canvas-text-content" placeholder="Enter text...">${this.escapeHtml(node.content)}</textarea>
            `;
      } else if (node.type === "group") {
        element.innerHTML = `
                <div class="canvas-node-header">
                    <input class="canvas-group-title" value="${this.escapeHtml(node.content)}" placeholder="Group name">
                    <div class="canvas-node-actions">
                        <button class="canvas-node-btn canvas-node-delete" title="Delete">\u2715</button>
                    </div>
                </div>
            `;
        element.style.backgroundColor = node.color || "rgba(0, 122, 204, 0.1)";
      }
      this.bindNodeEvents(element, node);
      this.nodesContainer.appendChild(element);
    }
    bindNodeEvents(element, node) {
      element.addEventListener("mousedown", (e) => {
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
        this.onNodeMouseDown(e, node);
      });
      element.addEventListener("touchstart", (e) => {
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
        e.preventDefault();
        this.onNodeMouseDown(e.touches[0], node);
      }, { passive: false });
      const connectBtn = element.querySelector(".canvas-node-connect");
      connectBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.startConnection(node);
      });
      const deleteBtn = element.querySelector(".canvas-node-delete");
      deleteBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteNode(node.id);
      });
      if (node.type === "text") {
        const textarea = element.querySelector(".canvas-text-content");
        textarea?.addEventListener("input", (e) => {
          node.content = e.target.value;
        });
      } else if (node.type === "group") {
        const titleInput = element.querySelector(".canvas-group-title");
        titleInput?.addEventListener("input", (e) => {
          node.content = e.target.value;
        });
      }
    }
    // --- Event handlers ---
    onCanvasMouseDown(e) {
      this.selectedNode = null;
    }
    onCanvasMouseMove(e) {
      if (this.draggedNode) {
        const mousePos = this.getMousePosition(e);
        this.draggedNode.x = mousePos.x - this.dragOffset.x;
        this.draggedNode.y = mousePos.y - this.dragOffset.y;
        this.updateNodeElement(this.draggedNode);
      }
    }
    onCanvasMouseUp(e) {
      if (this.draggedNode) {
        this.moveNode(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y);
      }
      this.draggedNode = null;
      if (this.isConnecting) {
        this.isConnecting = false;
        this.connectionStart = null;
      }
    }
    onCanvasWheel(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const mousePos = this.getMousePosition(e);
      this.viewport.zoom *= delta;
      this.viewport.zoom = Math.max(0.1, Math.min(3, this.viewport.zoom));
      this.viewport.x = mousePos.x - (mousePos.x - this.viewport.x) * delta;
      this.viewport.y = mousePos.y - (mousePos.y - this.viewport.y) * delta;
    }
    onCanvasDoubleClick(e) {
      this.addNoteCard();
    }
    onNodeMouseDown(e, node) {
      if (e.stopPropagation) e.stopPropagation();
      this.selectedNode = node;
      this.draggedNode = node;
      const mousePos = this.getMousePosition(e);
      this.dragOffset.x = mousePos.x - node.x;
      this.dragOffset.y = mousePos.y - node.y;
    }
    onKeyDown(e) {
      if (e.key === "Delete" && this.selectedNode) {
        this.deleteNode(this.selectedNode.id);
      }
    }
    // --- Utility ---
    getMousePosition(e) {
      if (!e) return { x: 400, y: 300 };
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - this.viewport.x) / this.viewport.zoom,
        y: (e.clientY - rect.top - this.viewport.y) / this.viewport.zoom
      };
    }
    updateNodeElement(node) {
      const element = this.nodesContainer?.querySelector(`[data-node-id="${node.id}"]`);
      if (element) {
        element.style.left = `${node.x}px`;
        element.style.top = `${node.y}px`;
      }
    }
    startConnection(node) {
      this.isConnecting = true;
      this.connectionStart = this.getConnectionPoint(node, "output");
      this.connectionStart.nodeId = node.id;
    }
    zoomIn() {
      this.viewport.zoom = Math.min(3, this.viewport.zoom * 1.2);
    }
    zoomOut() {
      this.viewport.zoom = Math.max(0.1, this.viewport.zoom / 1.2);
    }
    fitToScreen() {
      if (this.nodes.size === 0) {
        this.viewport = { x: 0, y: 0, zoom: 1 };
        return;
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.nodes.forEach((node) => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
      });
      const padding = 50;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;
      const scaleX = this.canvas.width / contentWidth;
      const scaleY = this.canvas.height / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      this.viewport.zoom = scale;
      this.viewport.x = (this.canvas.width - contentWidth * scale) / 2 - minX * scale + padding * scale;
      this.viewport.y = (this.canvas.height - contentHeight * scale) / 2 - minY * scale + padding * scale;
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    destroy() {
      this.stopRenderLoop();
      if (this._boundKeyDown) {
        document.removeEventListener("keydown", this._boundKeyDown);
        this._boundKeyDown = null;
      }
      if (this._boundMouseMove) {
        document.removeEventListener("mousemove", this._boundMouseMove);
        this._boundMouseMove = null;
      }
      if (this._boundMouseUp) {
        document.removeEventListener("mouseup", this._boundMouseUp);
        this._boundMouseUp = null;
      }
      if (this._boundTouchMove) {
        document.removeEventListener("touchmove", this._boundTouchMove);
        this._boundTouchMove = null;
      }
      if (this._boundTouchEnd) {
        document.removeEventListener("touchend", this._boundTouchEnd);
        this._boundTouchEnd = null;
      }
      this.nodes.clear();
      this.connections.clear();
      this.selectedNode = null;
      this.draggedNode = null;
      this.container = null;
    }
  };

  // src/js/command-palette.js
  var CommandPalette = class {
    constructor(app) {
      this.app = app;
      this.overlay = null;
      this.selectedIndex = 0;
      this.filtered = [];
    }
    /**
     * Build the full command registry.
     */
    _getCommands() {
      const app = this.app;
      return [
        // File operations
        { name: "New Note", shortcut: "Ctrl+N", cat: "File", action: () => app.showNewNoteDialog() },
        { name: "Open Daily Note", shortcut: "Ctrl+D", cat: "File", action: () => app.openDailyNote() },
        { name: "Save Current File", shortcut: "Ctrl+S", cat: "File", action: () => app.saveCurrentFile() },
        { name: "New Folder", cat: "File", action: () => app.createNewFolder() },
        { name: "Delete Current File", cat: "File", action: () => {
          if (app.currentFile) app.deleteFile(app.currentFile);
        } },
        { name: "Duplicate Current File", cat: "File", action: () => {
          if (app.currentFile) app.duplicateFile(app.currentFile);
        } },
        { name: "Rename Current File", cat: "File", action: () => {
          if (app.currentFile) app.startRename(app.currentFile);
        } },
        // Navigation
        { name: "Quick Switcher", shortcut: "Ctrl+O", cat: "Navigate", action: () => app.quickSwitcher.show() },
        { name: "Search Notes", shortcut: "Ctrl+Shift+F", cat: "Navigate", action: () => app.search.show() },
        { name: "Find in File", shortcut: "Ctrl+F", cat: "Navigate", action: () => app.findReplace?.showFind() },
        { name: "Find and Replace", shortcut: "Ctrl+H", cat: "Navigate", action: () => app.findReplace?.showFindReplace() },
        { name: "Open Graph View", cat: "Navigate", action: () => app.openGraphView() },
        { name: "Open Canvas", cat: "Navigate", action: () => app.openCanvasView() },
        // Editor
        { name: "Toggle Bold", shortcut: "Ctrl+B", cat: "Editor", action: () => this._editorWrap("**", "**") },
        { name: "Toggle Italic", shortcut: "Ctrl+I", cat: "Editor", action: () => this._editorWrap("*", "*") },
        { name: "Toggle Strikethrough", cat: "Editor", action: () => this._editorWrap("~~", "~~") },
        { name: "Toggle Highlight", cat: "Editor", action: () => this._editorWrap("==", "==") },
        { name: "Toggle Inline Code", shortcut: "Ctrl+`", cat: "Editor", action: () => this._editorWrap("`", "`") },
        { name: "Insert Code Block", shortcut: "Ctrl+Shift+K", cat: "Editor", action: () => this._editorWrap("```\n", "\n```") },
        { name: "Insert Link", shortcut: "Ctrl+K", cat: "Editor", action: () => this._editorInsert("[text](url)") },
        { name: "Insert Wiki Link", cat: "Editor", action: () => this._editorInsert("[[]]") },
        { name: "Insert Horizontal Rule", cat: "Editor", action: () => this._editorInsert("\n---\n") },
        { name: "Insert Blockquote", cat: "Editor", action: () => this._editorWrap("> ", "") },
        { name: "Insert Checkbox", cat: "Editor", action: () => this._editorInsert("- [ ] ") },
        { name: "Insert Template", shortcut: "Ctrl+T", cat: "Editor", action: () => app.templateManager?.showPicker() },
        // View
        { name: "Cycle View Mode", shortcut: "Ctrl+E", cat: "View", action: () => app.cycleViewMode() },
        { name: "Toggle Backlinks Panel", cat: "View", action: () => app.toggleBacklinksPanel() },
        { name: "Toggle Focus Mode", shortcut: "Ctrl+Shift+D", cat: "View", action: () => app.toggleFocusMode() },
        { name: "Switch to Classic Editor", cat: "View", action: () => app.setEditorMode("classic") },
        { name: "Switch to HyperMark Editor", cat: "View", action: () => app.setEditorMode("hypermark") },
        // Organisation
        { name: "Toggle Bookmark", cat: "Organize", action: () => app.toggleBookmark() },
        { name: "Open Settings", shortcut: "Ctrl+,", cat: "Settings", action: () => app.openSettingsTab() },
        { name: "Refresh File Explorer", cat: "Navigate", action: () => app.sidebar?.refresh() }
      ];
    }
    /**
     * Helper: wrap selection in the active editor
     */
    _editorWrap(before, after) {
      const app = this.app;
      if (app.hypermarkEditor) {
        app.hypermarkEditor.wrapSelection?.(before, after);
      } else if (app.editor) {
        app.editor.wrapSelection(before, after);
      }
    }
    _editorInsert(text) {
      const app = this.app;
      if (app.editor) {
        app.editor.insertMarkdown(text);
      }
    }
    /**
     * Simple fuzzy match — returns score or null.
     */
    _fuzzy(query, target) {
      const q = query.toLowerCase();
      const t = target.toLowerCase();
      if (t.includes(q)) {
        return t.indexOf(q) === 0 ? 0 : 5;
      }
      let qi = 0;
      let score = 0;
      for (let i = 0; i < t.length && qi < q.length; i++) {
        if (t[i] === q[qi]) {
          qi++;
        } else {
          score++;
        }
      }
      return qi === q.length ? score + 10 : null;
    }
    /**
     * Show the command palette.
     */
    show() {
      if (this.overlay) {
        this.hide();
        return;
      }
      const commands = this._getCommands();
      this.overlay = document.createElement("div");
      this.overlay.id = "command-palette-overlay";
      this.overlay.className = "command-palette-overlay";
      const palette = document.createElement("div");
      palette.className = "command-palette";
      const input = document.createElement("input");
      input.className = "command-palette-input";
      input.placeholder = "Type a command\u2026";
      input.autocomplete = "off";
      const results = document.createElement("div");
      results.className = "command-palette-results";
      palette.appendChild(input);
      palette.appendChild(results);
      this.overlay.appendChild(palette);
      document.body.appendChild(this.overlay);
      this.selectedIndex = 0;
      this.filtered = [...commands];
      const render = () => {
        results.innerHTML = "";
        if (this.filtered.length === 0) {
          results.innerHTML = '<div class="command-palette-empty">No matching commands</div>';
          return;
        }
        this.filtered.forEach((cmd, i) => {
          const item = document.createElement("div");
          item.className = "command-palette-item" + (i === this.selectedIndex ? " selected" : "");
          const catHtml = cmd.cat ? `<span class="command-palette-cat">${cmd.cat}</span>` : "";
          const shortcutHtml = cmd.shortcut ? `<span class="command-palette-shortcut">${cmd.shortcut}</span>` : "";
          item.innerHTML = `${catHtml}<span class="command-palette-name">${this._escapeHtml(cmd.name)}</span>${shortcutHtml}`;
          item.addEventListener("mousedown", (e) => {
            e.preventDefault();
            this.hide();
            cmd.action();
          });
          item.addEventListener("mouseenter", () => {
            this.selectedIndex = i;
            render();
          });
          results.appendChild(item);
        });
        const sel = results.querySelector(".command-palette-item.selected");
        if (sel) sel.scrollIntoView({ block: "nearest" });
      };
      input.addEventListener("input", () => {
        const q = input.value.trim();
        if (!q) {
          this.filtered = [...commands];
        } else {
          this.filtered = commands.map((cmd) => {
            const score = this._fuzzy(q, cmd.name);
            return score !== null ? { ...cmd, _score: score } : null;
          }).filter(Boolean).sort((a, b) => a._score - b._score);
        }
        this.selectedIndex = 0;
        render();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.filtered.length);
          render();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % Math.max(1, this.filtered.length);
          render();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (this.filtered[this.selectedIndex]) {
            const cmd = this.filtered[this.selectedIndex];
            this.hide();
            cmd.action();
          }
        } else if (e.key === "Escape") {
          this.hide();
        }
      });
      this.overlay.addEventListener("mousedown", (e) => {
        if (e.target === this.overlay) this.hide();
      });
      render();
      input.focus();
    }
    hide() {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
    }
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/js/bookmarks.js
  init_tauri_bridge();
  var BookmarksManager = class {
    constructor(app) {
      this.app = app;
      this._initContextMenuIntegration();
      this._initStarButton();
    }
    // --- Data Layer (all via Rust) ---
    async listBookmarks() {
      try {
        return await invoke("list_bookmarks");
      } catch (err) {
        console.error("Failed to list bookmarks:", err);
        return [];
      }
    }
    async addBookmark(path) {
      try {
        await invoke("add_bookmark", { path });
        this.refresh();
      } catch (err) {
        console.error("Failed to add bookmark:", err);
      }
    }
    async removeBookmark(path) {
      try {
        await invoke("remove_bookmark", { path });
        this.refresh();
      } catch (err) {
        console.error("Failed to remove bookmark:", err);
      }
    }
    async reorderBookmarks(paths) {
      try {
        await invoke("reorder_bookmarks", { paths });
      } catch (err) {
        console.error("Failed to reorder bookmarks:", err);
      }
    }
    async toggleBookmark(path) {
      const bookmarks = await this.listBookmarks();
      if (bookmarks.includes(path)) {
        await this.removeBookmark(path);
      } else {
        await this.addBookmark(path);
      }
    }
    async isBookmarked(path) {
      const bookmarks = await this.listBookmarks();
      return bookmarks.includes(path);
    }
    // --- UI Layer (DOM, events) ---
    /**
     * Add "Toggle Bookmark" to the file-tree context menu entries.
     */
    _initContextMenuIntegration() {
      const fileTree = document.getElementById("file-tree");
      if (!fileTree) return;
      fileTree.addEventListener("contextmenu", (e) => {
        const item = e.target.closest(".tree-item[data-path]");
        if (!item) return;
        const path = item.dataset.path;
        if (!path || !path.endsWith(".md")) return;
        setTimeout(async () => {
          const menu = document.getElementById("context-menu") || document.querySelector(".context-menu");
          if (!menu) return;
          if (menu.querySelector('[data-action="toggle-bookmark"]')) return;
          const bookmarked = await this.isBookmarked(path);
          const label = bookmarked ? "Remove Bookmark" : "Add to Bookmarks";
          const sep = document.createElement("div");
          sep.className = "context-menu-sep";
          menu.appendChild(sep);
          const bmItem = document.createElement("div");
          bmItem.className = "context-menu-item";
          bmItem.dataset.action = "toggle-bookmark";
          bmItem.innerHTML = `<span class="icon">\u2B50</span> ${label}`;
          bmItem.addEventListener("click", () => {
            this.toggleBookmark(path);
            this.app.contextMenu?.hide();
          });
          menu.appendChild(bmItem);
        }, 0);
      });
    }
    /**
     * Wire up the star button (#btn-bookmark-current) in the sidebar header.
     */
    _initStarButton() {
      const btn = document.getElementById("btn-bookmark-current");
      if (!btn) return;
      const bc = document.getElementById("breadcrumb-path");
      if (bc) {
        const observer = new MutationObserver(() => this._updateStarState());
        observer.observe(bc, { childList: true, subtree: true });
      }
      this._updateStarState();
    }
    /**
     * Update the star button's active state based on current file.
     */
    async _updateStarState() {
      const btn = document.getElementById("btn-bookmark-current");
      if (!btn) return;
      const bookmarked = this.app.currentFile ? await this.isBookmarked(this.app.currentFile) : false;
      btn.classList.toggle("active", bookmarked);
      btn.title = bookmarked ? "Remove bookmark" : "Bookmark current note";
      const svg = btn.querySelector("svg");
      if (svg) {
        const path = svg.querySelector("path");
        if (path) {
          path.setAttribute("fill", bookmarked ? "currentColor" : "none");
        }
      }
    }
    /**
     * Refresh bookmark panel and star state.
     */
    refresh() {
      this.app.renderBookmarks?.();
      this._updateStarState();
    }
  };

  // src/js/daily-notes.js
  init_tauri_bridge();
  var DailyNotes = class {
    constructor(app) {
      this.app = app;
      this._initRibbonButton();
    }
    /**
     * Wire the existing ribbon daily-note button.
     */
    _initRibbonButton() {
      const btn = document.querySelector('.ribbon-btn[data-action="daily"]');
      if (btn) {
        btn.title = "Daily Note (Ctrl+D)";
      }
    }
    /**
     * Open (or create) today's daily note via Rust backend.
     */
    async open() {
      try {
        const result = await invoke("create_daily_note", {
          vaultPath: this.app.vaultPath || "",
          template: null
        });
        const path = result.path || result;
        await this.app.openFile(path);
        await this.app.sidebar?.refresh();
      } catch (err) {
        console.error("[DailyNotes] Failed to create daily note:", err);
        this.app.showErrorToast?.(`Failed to create daily note: ${err.message || err}`);
      }
    }
  };

  // src/js/remember.js
  init_tauri_bridge();
  var Remember = class {
    constructor(app) {
      this.app = app;
      this.cards = [];
      this.sources = [];
      this.loaded = false;
      this._lastLoadTime = 0;
      this.init();
    }
    async init() {
      await this.loadAll();
    }
    /** Called from app.openRememberDashboard() */
    openDashboard() {
      this.app.switchSidebarPanel("remember");
      if (this.app.rememberDashboard) {
        this.app.rememberDashboard.show();
      } else {
        this.refreshDashboard();
      }
    }
    // ===== Data Loading (via Rust) =====
    async loadAll() {
      try {
        const [cards, sources] = await Promise.all([
          invoke("remember_load_cards"),
          invoke("remember_load_sources")
        ]);
        this.cards = cards;
        this.sources = sources;
        this.loaded = true;
      } catch (err) {
        console.error("[Remember] Failed to load data:", err);
        this.cards = [];
        this.sources = [];
        this.loaded = true;
      }
    }
    // ===== Public API (used by other modules) =====
    getCards() {
      return this.cards;
    }
    getSources() {
      return this.sources;
    }
    async getDueCards() {
      try {
        return await invoke("remember_get_due_cards");
      } catch (err) {
        console.error("[Remember] Failed to get due cards:", err);
        return [];
      }
    }
    async forceReload() {
      this.loaded = false;
      this._lastLoadTime = 0;
      await this.loadAll();
    }
    async refreshDashboard() {
      const now = Date.now();
      if (!this.loaded || now - this._lastLoadTime > 3e4) {
        await this.loadAll();
        this._lastLoadTime = now;
      }
      const container = document.getElementById("remember-dashboard");
      if (!container) return;
      let due;
      try {
        due = await invoke("remember_get_due_cards");
      } catch (_) {
        due = [];
      }
      const randomCard = this.cards.length > 0 ? this.cards[Math.floor(Math.random() * this.cards.length)] : null;
      const all = [...this.cards.map((c) => ({ ...c, _isCard: true })), ...this.sources.map((s) => ({ ...s, _isCard: false }))].sort((a, b) => {
        const da = a.created || "";
        const db = b.created || "";
        return db.localeCompare(da);
      });
      const recent = all.slice(0, 5);
      container.innerHTML = "";
      const dueSection = document.createElement("div");
      dueSection.className = "remember-section remember-due";
      dueSection.innerHTML = `
            <div class="remember-due-count">Heute f\xE4llig: <strong>${due.length}</strong> Karten</div>
            <button class="remember-btn remember-btn-primary" id="remember-start-review" ${due.length === 0 ? "disabled" : ""}>
                \u25B6 Start Review
            </button>
        `;
      container.appendChild(dueSection);
      dueSection.querySelector("#remember-start-review")?.addEventListener("click", () => {
        if (this.app.rememberReview?.startReview) {
          this.app.rememberReview.startReview(due);
        } else {
          this.app.showErrorToast?.("Review module not loaded yet");
        }
      });
      if (randomCard) {
        const highlightSection = document.createElement("div");
        highlightSection.className = "remember-section remember-highlight";
        const preview = randomCard.back?.length > 200 ? randomCard.back.substring(0, 200) + "\u2026" : randomCard.back || "";
        highlightSection.innerHTML = `
                <div class="remember-section-title">\u{1F4A1} Zuf\xE4lliges Highlight</div>
                <div class="remember-highlight-card" data-path="${this.escapeAttr(randomCard.path)}">
                    <div class="remember-highlight-name">${this.escapeHtml(randomCard.front)}</div>
                    <div class="remember-highlight-preview">${this.escapeHtml(preview)}</div>
                    ${randomCard.source ? `<div class="remember-highlight-source">\u{1F4D6} ${this.escapeHtml(String(randomCard.source))}</div>` : ""}
                </div>
            `;
        container.appendChild(highlightSection);
        highlightSection.querySelector(".remember-highlight-card")?.addEventListener("click", () => {
          this.app.openFile(randomCard.path);
        });
      }
      if (recent.length > 0) {
        const recentSection = document.createElement("div");
        recentSection.className = "remember-section remember-recent";
        let recentHtml = '<div class="remember-section-title">\u{1F550} K\xFCrzlich hinzugef\xFCgt</div><div class="remember-recent-list">';
        for (const item of recent) {
          const isCard = item._isCard;
          const icon = isCard ? "\u{1F0CF}" : "\u{1F4D6}";
          const name = isCard ? item.front : item.title || item.path;
          recentHtml += `<div class="remember-recent-item" data-path="${this.escapeAttr(item.path)}">
                    <span class="remember-recent-icon">${icon}</span>
                    <span class="remember-recent-name">${this.escapeHtml(name)}</span>
                </div>`;
        }
        recentHtml += "</div>";
        recentSection.innerHTML = recentHtml;
        container.appendChild(recentSection);
        recentSection.querySelectorAll(".remember-recent-item").forEach((el) => {
          el.addEventListener("click", () => {
            this.app.openFile(el.dataset.path);
          });
        });
      }
      if (this.cards.length === 0 && this.sources.length === 0) {
        const empty = document.createElement("div");
        empty.className = "remember-empty";
        empty.innerHTML = `
                <div style="font-size: 2em; margin-bottom: 8px;">\u{1F9E0}</div>
                <div>Noch keine Karten oder Quellen.</div>
                <div style="margin-top: 4px; opacity: 0.7; font-size: 0.9em;">Erstelle Dateien in <code>Cards/</code> oder <code>Sources/</code> um zu starten.</div>
            `;
        container.appendChild(empty);
      }
    }
    // ===== Utilities =====
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    escapeAttr(text) {
      return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
  };

  // src/js/remember-dashboard.js
  init_tauri_bridge();
  var DASHBOARD_STYLES_ID = "remember-dashboard-styles";
  function _relativeTime(dateStr) {
    if (!dateStr) return "";
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 6e4);
    if (diffMin < 1) return "gerade eben";
    if (diffMin < 60) return `vor ${diffMin} Minute${diffMin !== 1 ? "n" : ""}`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Stunde${diffH !== 1 ? "n" : ""}`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "gestern";
    if (diffD < 7) return `vor ${diffD} Tagen`;
    if (diffD < 30) return `vor ${Math.floor(diffD / 7)} Woche${Math.floor(diffD / 7) !== 1 ? "n" : ""}`;
    return dateStr;
  }
  var RememberDashboard = class {
    constructor(app) {
      this.app = app;
      this._injectStyles();
    }
    async show() {
      const remember = this.app.remember;
      if (!remember) return;
      await remember.loadAll();
      const cards = remember.getCards?.() || [];
      const sources = remember.getSources?.() || [];
      let dueCards;
      try {
        dueCards = await invoke("remember_get_due_cards");
      } catch (_) {
        dueCards = [];
      }
      let stats = null;
      try {
        stats = await invoke("remember_get_stats");
      } catch (err) {
        console.warn("[RememberDashboard] Stats unavailable:", err);
      }
      const container = this._getContentArea();
      if (!container) return;
      container.innerHTML = "";
      container.className = "remember-main-dashboard";
      if (cards.length === 0 && sources.length === 0) {
        container.appendChild(this._renderOnboarding());
        return;
      }
      container.appendChild(this._renderHeader(stats, dueCards));
      if (cards.length > 0) {
        container.appendChild(this._renderHighlight(cards));
      }
      container.appendChild(this._renderRecentActivity(cards, sources));
      if (stats) {
        container.appendChild(this._renderStatsOverview(stats, cards, sources));
      }
      const reading = sources.filter((s) => {
        const status = typeof s.status === "object" ? Object.keys(s.status)[0] : s.status;
        return status === "reading";
      });
      if (reading.length > 0) {
        container.appendChild(this._renderSourcesInProgress(reading, cards));
      }
    }
    _getContentArea() {
      const app = this.app;
      if (app.isDirty && app.currentFile) app.saveCurrentFile();
      app.hideWelcome();
      app.updateBreadcrumb?.("");
      const paneContainer = document.getElementById("pane-container");
      if (!paneContainer) return null;
      if (app.graphView) {
        app.graphView.destroy();
        app.graphView = null;
      }
      const leftPane = document.getElementById("left-pane");
      if (leftPane) leftPane.remove();
      if (!app.tabManager?.splitActive) {
        const overlay = paneContainer.querySelector(".split-drop-overlay");
        paneContainer.innerHTML = "";
        if (overlay) paneContainer.appendChild(overlay);
      }
      const pane = document.createElement("div");
      pane.className = "pane";
      pane.id = "left-pane";
      pane.style.overflow = "auto";
      const inner = document.createElement("div");
      inner.className = "remember-main-dashboard";
      pane.appendChild(inner);
      paneContainer.insertBefore(pane, paneContainer.firstChild);
      return inner;
    }
    _renderHeader(stats, dueCards) {
      const streak = stats?.current_streak ?? 0;
      const dueCount = dueCards.length;
      const section = document.createElement("div");
      section.className = "rd-header";
      section.innerHTML = `
            <div class="rd-header-top">
                <div class="rd-streak">
                    <span class="rd-streak-fire">\u{1F525}</span>
                    <span class="rd-streak-num">${streak}</span>
                    <span class="rd-streak-label">Tage Streak</span>
                </div>
                <div class="rd-due-badge ${dueCount > 0 ? "rd-due-active" : ""}">
                    ${dueCount} Karte${dueCount !== 1 ? "n" : ""} f\xE4llig heute
                </div>
            </div>
            <button class="rd-start-review ${dueCount > 0 ? "rd-pulse" : ""}" ${dueCount === 0 ? "disabled" : ""}>
                \u25B6 Start Review
            </button>
        `;
      section.querySelector(".rd-start-review")?.addEventListener("click", () => {
        if (this.app.rememberReview?.startReview) {
          this.app.rememberReview.startReview(dueCards);
        } else {
          this.app.showErrorToast?.("Review-Modul nicht geladen");
        }
      });
      return section;
    }
    _renderHighlight(cards) {
      const section = document.createElement("div");
      section.className = "rd-section";
      const renderCard = () => {
        const card = cards[Math.floor(Math.random() * cards.length)];
        const quote = card.back || "";
        const source = card.source ? String(card.source).replace(/^\[\[|\]\]$/g, "") : null;
        section.innerHTML = `
                <div class="rd-section-title">\u{1F4A1} Highlight of the Day</div>
                <div class="rd-highlight">
                    <div class="rd-highlight-body">
                        <div class="rd-highlight-title">${this._esc(card.front)}</div>
                        <div class="rd-highlight-text">${this._esc(quote.length > 300 ? quote.substring(0, 300) + "\u2026" : quote)}</div>
                        ${source ? `<div class="rd-highlight-source">\u{1F4D6} ${this._esc(source)}</div>` : ""}
                    </div>
                    <div class="rd-highlight-actions">
                        <button class="rd-btn-secondary rd-show-another">Show another</button>
                        <button class="rd-btn-ghost rd-open-card">Open Card \u2192</button>
                    </div>
                </div>
            `;
        section.querySelector(".rd-show-another")?.addEventListener("click", renderCard);
        section.querySelector(".rd-open-card")?.addEventListener("click", () => {
          this.app.openFile(card.path);
        });
      };
      renderCard();
      return section;
    }
    _renderRecentActivity(cards, sources) {
      const section = document.createElement("div");
      section.className = "rd-section";
      const activities = [];
      for (const c of cards) {
        if (c.created) activities.push({ type: "card_created", name: c.front, date: c.created, path: c.path, icon: "\u{1F0CF}" });
        if (c.last_review) activities.push({ type: "review", name: c.front, date: c.last_review, path: c.path, icon: "\u2705" });
      }
      for (const s of sources) {
        if (s.started) activities.push({ type: "source_added", name: s.title, date: s.started, path: s.path, icon: "\u{1F4D6}" });
      }
      activities.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      const recent = activities.slice(0, 10);
      const labels = {
        card_created: "Karte erstellt",
        review: "Review abgeschlossen",
        source_added: "Quelle hinzugef\xFCgt"
      };
      section.innerHTML = `
            <div class="rd-section-title">\u{1F550} Letzte Aktivit\xE4ten</div>
            ${recent.length === 0 ? '<div class="rd-empty-hint">Noch keine Aktivit\xE4ten</div>' : `<div class="rd-timeline">
                    ${recent.map((a) => `
                        <div class="rd-timeline-item" data-path="${this._escAttr(a.path)}">
                            <span class="rd-timeline-icon">${a.icon}</span>
                            <div class="rd-timeline-content">
                                <span class="rd-timeline-action">${labels[a.type] || a.type}</span>
                                <span class="rd-timeline-name">${this._esc(a.name)}</span>
                            </div>
                            <span class="rd-timeline-time">${_relativeTime(a.date)}</span>
                        </div>
                    `).join("")}
                </div>`}
        `;
      section.querySelectorAll(".rd-timeline-item").forEach((el) => {
        el.addEventListener("click", () => this.app.openFile(el.dataset.path));
      });
      return section;
    }
    _renderStatsOverview(stats, cards, sources) {
      const section = document.createElement("div");
      section.className = "rd-section";
      const retentionRate = stats.total_reviews > 0 ? Math.round((1 - stats.due_today / Math.max(1, stats.total_cards)) * 100) + "%" : "\u2014";
      const tagCounts = {};
      for (const c of cards) {
        if (Array.isArray(c.tags)) {
          c.tags.forEach((t) => {
            if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
          });
        }
      }
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const heatDays = (stats.last_30 || []).slice(-28);
      section.innerHTML = `
            <div class="rd-section-title">\u{1F4CA} Statistiken</div>
            <div class="rd-stats-grid">
                <div class="rd-stat-card"><div class="rd-stat-value">${stats.total_cards}</div><div class="rd-stat-label">Karten</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${sources.length}</div><div class="rd-stat-label">Quellen</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${stats.reviewed_today}</div><div class="rd-stat-label">Reviews heute</div></div>
                <div class="rd-stat-card"><div class="rd-stat-value">${retentionRate}</div><div class="rd-stat-label">Retention</div></div>
            </div>

            <div class="rd-mini-heatmap">
                ${heatDays.map((d) => {
        const lvl = d.count === 0 ? 0 : d.count <= 3 ? 1 : d.count <= 7 ? 2 : d.count <= 15 ? 3 : 4;
        return `<div class="rd-hm-cell rd-hm-${lvl}" title="${d.date}: ${d.count} reviews"></div>`;
      }).join("")}
            </div>

            ${topTags.length > 0 ? `
                <div class="rd-top-tags">
                    ${topTags.map(
        ([tag, count]) => `<span class="rd-tag-badge" data-tag="${this._escAttr(tag)}">#${this._esc(tag)} <small>${count}</small></span>`
      ).join("")}
                </div>
            ` : ""}
        `;
      section.querySelectorAll(".rd-tag-badge").forEach((el) => {
        el.addEventListener("click", () => this.app.searchByTag?.(el.dataset.tag));
      });
      return section;
    }
    _renderSourcesInProgress(readingSources, allCards) {
      const section = document.createElement("div");
      section.className = "rd-section";
      section.innerHTML = `
            <div class="rd-section-title">\u{1F4D6} Aktive Quellen</div>
            <div class="rd-sources-list">
                ${readingSources.map((s) => {
        const title = s.title || "Untitled";
        const author = s.author || "";
        const highlights = allCards.filter((c) => String(c.source || "").includes(title)).length;
        return `
                        <div class="rd-source-item" data-path="${this._escAttr(s.path)}">
                            <div class="rd-source-info">
                                <div class="rd-source-title">${this._esc(title)}</div>
                                ${author ? `<div class="rd-source-author">${this._esc(author)}</div>` : ""}
                            </div>
                            <div class="rd-source-progress">
                                <span class="rd-source-count">${highlights} Highlight${highlights !== 1 ? "s" : ""}</span>
                            </div>
                        </div>
                    `;
      }).join("")}
            </div>
        `;
      section.querySelectorAll(".rd-source-item").forEach((el) => {
        el.addEventListener("click", () => this.app.openFile(el.dataset.path));
      });
      return section;
    }
    _renderOnboarding() {
      const section = document.createElement("div");
      section.className = "rd-onboarding";
      section.innerHTML = `
            <div class="rd-onboarding-icon">\u{1F9E0}</div>
            <h2 class="rd-onboarding-title">Willkommen bei Remember</h2>
            <p class="rd-onboarding-subtitle">Dein pers\xF6nliches Knowledge-Retention-System.<br>Nie wieder vergessen, was du gelesen hast.</p>

            <div class="rd-onboarding-steps">
                <div class="rd-step"><div class="rd-step-num">1</div><div class="rd-step-content"><strong>Quelle hinzuf\xFCgen</strong><p>Erstelle eine Datei in <code>Sources/</code> mit Frontmatter (Titel, Autor, Status).</p></div></div>
                <div class="rd-step"><div class="rd-step-num">2</div><div class="rd-step-content"><strong>Highlights extrahieren</strong><p>Markiere wichtige Stellen und klicke "Extract to Card" um Karteikarten zu erstellen.</p></div></div>
                <div class="rd-step"><div class="rd-step-num">3</div><div class="rd-step-content"><strong>T\xE4glich reviewen</strong><p>Spaced Repetition sorgt daf\xFCr, dass du Wissen langfristig beh\xE4ltst. \u{1F525}</p></div></div>
            </div>

            <button class="rd-start-review rd-onboarding-cta" id="rd-onboarding-create">
                + Erste Quelle hinzuf\xFCgen
            </button>
        `;
      section.querySelector("#rd-onboarding-create")?.addEventListener("click", () => {
        this.app.switchSidebarPanel?.("remember");
        if (this.app.rememberSources?.showCreateForm) {
          this.app.rememberSources.showCreateForm();
        }
      });
      return section;
    }
    _esc(text) {
      const d = document.createElement("div");
      d.textContent = text || "";
      return d.innerHTML;
    }
    _escAttr(text) {
      return (text || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    _injectStyles() {
      if (document.getElementById(DASHBOARD_STYLES_ID)) return;
      const style = document.createElement("style");
      style.id = DASHBOARD_STYLES_ID;
      style.textContent = `
.remember-main-dashboard { max-width: 720px; margin: 0 auto; padding: 32px 24px; font-family: var(--font-interface, -apple-system, BlinkMacSystemFont, sans-serif); color: var(--text-normal, #dcddde); }
.rd-header { margin-bottom: 28px; }
.rd-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.rd-streak { display: flex; align-items: baseline; gap: 8px; }
.rd-streak-fire { font-size: 36px; line-height: 1; }
.rd-streak-num { font-size: 42px; font-weight: 800; color: var(--text-accent, #f59e0b); line-height: 1; }
.rd-streak-label { font-size: 14px; opacity: 0.5; }
.rd-due-badge { padding: 6px 14px; border-radius: 20px; background: var(--background-secondary, #1e1e2e); font-size: 13px; font-weight: 600; opacity: 0.6; }
.rd-due-badge.rd-due-active { background: rgba(0, 188, 212, 0.15); color: #00e5ff; opacity: 1; }
.rd-start-review { width: 100%; padding: 14px; border: none; border-radius: 10px; background: linear-gradient(135deg, #00bcd4, #00acc1); color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; letter-spacing: 0.5px; }
.rd-start-review:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,188,212,0.3); }
.rd-start-review:disabled { opacity: 0.35; cursor: default; }
.rd-pulse { animation: rd-pulse-anim 2s ease-in-out infinite; }
@keyframes rd-pulse-anim { 0%, 100% { box-shadow: 0 0 0 0 rgba(0,188,212,0.4); } 50% { box-shadow: 0 0 0 10px rgba(0,188,212,0); } }
.rd-section { margin-bottom: 28px; }
.rd-section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.45; margin-bottom: 12px; font-weight: 600; }
.rd-highlight { background: var(--background-secondary, #1e1e2e); border-radius: 12px; padding: 20px; border-left: 3px solid var(--text-accent, #7c3aed); }
.rd-highlight-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.rd-highlight-text { font-size: 14px; line-height: 1.6; opacity: 0.8; margin-bottom: 10px; white-space: pre-wrap; }
.rd-highlight-source { font-size: 12px; opacity: 0.5; }
.rd-highlight-actions { display: flex; gap: 8px; margin-top: 14px; }
.rd-btn-secondary { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--background-modifier-border, #333); background: transparent; color: var(--text-normal, #ccc); font-size: 12px; cursor: pointer; transition: background 0.15s; }
.rd-btn-secondary:hover { background: var(--background-modifier-hover, #ffffff10); }
.rd-btn-ghost { padding: 6px 14px; border: none; background: transparent; color: var(--text-accent, #7c3aed); font-size: 12px; cursor: pointer; }
.rd-btn-ghost:hover { text-decoration: underline; }
.rd-timeline { display: flex; flex-direction: column; gap: 2px; }
.rd-timeline-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.rd-timeline-item:hover { background: var(--background-secondary, #1e1e2e); }
.rd-timeline-icon { font-size: 16px; flex-shrink: 0; }
.rd-timeline-content { flex: 1; min-width: 0; }
.rd-timeline-action { font-size: 11px; opacity: 0.5; display: block; }
.rd-timeline-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.rd-timeline-time { font-size: 11px; opacity: 0.4; flex-shrink: 0; white-space: nowrap; }
.rd-empty-hint { font-size: 13px; opacity: 0.4; padding: 8px 0; }
.rd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.rd-stat-card { text-align: center; padding: 14px 8px; background: var(--background-secondary, #1e1e2e); border-radius: 10px; }
.rd-stat-value { font-size: 22px; font-weight: 700; color: var(--text-normal, #e0e0e0); }
.rd-stat-label { font-size: 11px; opacity: 0.45; margin-top: 4px; }
.rd-mini-heatmap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 14px; }
.rd-hm-cell { aspect-ratio: 1; border-radius: 3px; }
.rd-hm-0 { background: var(--background-secondary, #161b22); }
.rd-hm-1 { background: #0e4429; }
.rd-hm-2 { background: #006d32; }
.rd-hm-3 { background: #26a641; }
.rd-hm-4 { background: #39d353; }
.rd-top-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.rd-tag-badge { padding: 4px 10px; border-radius: 12px; background: var(--background-modifier-hover, #ffffff10); font-size: 12px; cursor: pointer; transition: background 0.15s; }
.rd-tag-badge:hover { background: rgba(124, 58, 237, 0.2); }
.rd-tag-badge small { opacity: 0.5; margin-left: 4px; }
.rd-sources-list { display: flex; flex-direction: column; gap: 4px; }
.rd-source-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
.rd-source-item:hover { background: var(--background-secondary, #1e1e2e); }
.rd-source-title { font-size: 14px; font-weight: 600; }
.rd-source-author { font-size: 12px; opacity: 0.5; }
.rd-source-count { font-size: 12px; opacity: 0.6; padding: 3px 10px; background: var(--background-modifier-hover, #ffffff08); border-radius: 10px; }
.rd-onboarding { text-align: center; padding: 60px 20px; }
.rd-onboarding-icon { font-size: 64px; margin-bottom: 16px; }
.rd-onboarding-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; }
.rd-onboarding-subtitle { font-size: 14px; opacity: 0.6; line-height: 1.6; margin: 0 0 32px; }
.rd-onboarding-steps { text-align: left; max-width: 400px; margin: 0 auto 32px; display: flex; flex-direction: column; gap: 16px; }
.rd-step { display: flex; gap: 14px; align-items: flex-start; }
.rd-step-num { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #00bcd4, #00acc1); color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rd-step-content strong { display: block; font-size: 14px; margin-bottom: 2px; }
.rd-step-content p { margin: 0; font-size: 13px; opacity: 0.6; line-height: 1.5; }
.rd-step-content code { background: var(--background-secondary, #1e1e2e); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
.rd-onboarding-cta { max-width: 300px; margin: 0 auto; }
`;
      document.head.appendChild(style);
    }
  };
  window.RememberDashboard = RememberDashboard;

  // src/js/remember-extract.js
  init_tauri_bridge();
  var RememberExtract = class {
    constructor(app) {
      this.app = app;
      this._boundKeydown = this._onKeydown.bind(this);
      this.init();
    }
    init() {
      document.addEventListener("keydown", this._boundKeydown);
      this._patchEditorContextMenu();
    }
    // ===== Context Menu Integration =====
    _patchEditorContextMenu() {
      const cm = this.app.contextMenu;
      if (!cm) return;
      const origShow = cm.showEditorMenu.bind(cm);
      cm.showEditorMenu = (e, textarea) => {
        e.preventDefault();
        const sel = this.app.editor?.getSelection?.() || "";
        const items = [
          { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
          { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
          { label: "Paste", shortcut: "Ctrl+V", action: () => navigator.clipboard.readText().then((t) => document.execCommand("insertText", false, t)).catch(() => {
          }) },
          { separator: true },
          { label: "Bold", shortcut: "Ctrl+B", action: () => this.app.editor.wrapSelection("**", "**") },
          { label: "Italic", shortcut: "Ctrl+I", action: () => this.app.editor.wrapSelection("*", "*") },
          { label: "Code", shortcut: "Ctrl+`", action: () => this.app.editor.wrapSelection("`", "`") },
          { label: "Link", shortcut: "Ctrl+K", action: () => this.app.editor.wrapSelection("[[", "]]") }
        ];
        if (sel.trim()) {
          items.push({ separator: true });
          items.push({
            label: "\u{1F0CF} Extract to Card",
            shortcut: "\u2318\u21E7E",
            action: () => this.extractSelection()
          });
        }
        const content = this.app.editor?.getContent?.() || "";
        if (content.split("\n").some((l) => l.trimStart().startsWith(">"))) {
          if (!sel.trim()) items.push({ separator: true });
          items.push({
            label: "\u{1F4CB} Bulk Extract Highlights",
            action: () => this.showBulkExtract()
          });
        }
        cm.show(e.clientX, e.clientY, items);
      };
    }
    // ===== Keyboard Shortcut =====
    _onKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        this.extractSelection();
      }
    }
    // ===== Extract Selection → Show Dialog =====
    extractSelection() {
      const sel = this.app.editor?.getSelection?.() || "";
      if (!sel.trim()) {
        this.app.showNotice?.("Select text first to extract a card.");
        return;
      }
      this._showExtractDialog(sel.trim());
    }
    // ===== Extract Dialog =====
    async _showExtractDialog(backText, opts = {}) {
      document.getElementById("remember-extract-overlay")?.remove();
      const sourceFile = this.app.currentFile || "";
      const sourceLink = sourceFile ? `[[${sourceFile.replace(/\.md$/, "")}]]` : "";
      let allTags = [];
      try {
        allTags = await invoke("get_tags");
        allTags.sort((a, b) => a.localeCompare(b));
      } catch (_) {
      }
      const overlay = document.createElement("div");
      overlay.id = "remember-extract-overlay";
      overlay.className = "command-palette-overlay";
      overlay.innerHTML = `
            <div class="remember-extract-dialog">
                <div class="remember-extract-header">\u{1F0CF} Extract to Card</div>

                <label class="remember-extract-label">Front (Question / Idea)</label>
                <input type="text" class="remember-extract-input" id="re-front" placeholder="What's the key idea?" autofocus />

                <label class="remember-extract-label">Back (Answer / Content)</label>
                <textarea class="remember-extract-textarea" id="re-back" rows="5">${this._escapeHtml(backText)}</textarea>

                <label class="remember-extract-label">Source</label>
                <input type="text" class="remember-extract-input" id="re-source" value="${this._escapeAttr(sourceLink)}" />

                <label class="remember-extract-label">Tags</label>
                <div class="remember-extract-tags-wrap">
                    <input type="text" class="remember-extract-input" id="re-tags" placeholder="Add tags\u2026" autocomplete="off" />
                    <div class="remember-extract-tag-suggestions hidden" id="re-tag-suggestions"></div>
                    <div class="remember-extract-tag-list" id="re-tag-list"></div>
                </div>

                <div class="remember-extract-actions">
                    <button class="remember-btn" id="re-cancel">Cancel</button>
                    <button class="remember-btn remember-btn-primary" id="re-save">Save Card</button>
                </div>
            </div>
        `;
      document.body.appendChild(overlay);
      const frontInput = overlay.querySelector("#re-front");
      const backInput = overlay.querySelector("#re-back");
      const sourceInput = overlay.querySelector("#re-source");
      const tagsInput = overlay.querySelector("#re-tags");
      const suggestionsEl = overlay.querySelector("#re-tag-suggestions");
      const tagListEl = overlay.querySelector("#re-tag-list");
      const selectedTags = new Set(opts.tags || []);
      const renderTags = () => {
        tagListEl.innerHTML = "";
        for (const tag of selectedTags) {
          const chip = document.createElement("span");
          chip.className = "remember-extract-tag-chip";
          chip.textContent = tag;
          chip.addEventListener("click", () => {
            selectedTags.delete(tag);
            renderTags();
          });
          tagListEl.appendChild(chip);
        }
      };
      renderTags();
      tagsInput.addEventListener("input", () => {
        const q = tagsInput.value.trim().toLowerCase();
        if (!q) {
          suggestionsEl.classList.add("hidden");
          return;
        }
        const matches = allTags.filter((t) => t.toLowerCase().includes(q) && !selectedTags.has(t)).slice(0, 8);
        if (!matches.length) {
          suggestionsEl.classList.add("hidden");
          return;
        }
        suggestionsEl.innerHTML = "";
        suggestionsEl.classList.remove("hidden");
        for (const m of matches) {
          const item = document.createElement("div");
          item.className = "remember-extract-tag-suggestion";
          item.textContent = m;
          item.addEventListener("mousedown", (ev) => {
            ev.preventDefault();
            selectedTags.add(m);
            tagsInput.value = "";
            suggestionsEl.classList.add("hidden");
            renderTags();
          });
          suggestionsEl.appendChild(item);
        }
      });
      tagsInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && tagsInput.value.trim()) {
          e.preventDefault();
          selectedTags.add(tagsInput.value.trim());
          tagsInput.value = "";
          suggestionsEl.classList.add("hidden");
          renderTags();
        }
      });
      const save = async () => {
        const front = frontInput.value.trim();
        const back = backInput.value.trim();
        if (!front) {
          frontInput.focus();
          frontInput.classList.add("remember-extract-error");
          return;
        }
        frontInput.classList.remove("remember-extract-error");
        const source = sourceInput.value.trim();
        const tags = [...selectedTags];
        try {
          await invoke("remember_create_card", {
            input: { front, back, source, tags, existing_path: null }
          });
        } catch (err) {
          console.error("[RememberExtract] Failed to create card:", err);
          this.app.showNotice?.("Failed to create card: " + err);
          return;
        }
        if (backText && sourceFile) {
          await this._markExtracted(backText);
        }
        overlay.remove();
        this.app.showNotice?.(`Card created: ${front}`);
        if (this.app.remember) await this.app.remember.loadAll();
      };
      overlay.querySelector("#re-save").addEventListener("click", save);
      overlay.querySelector("#re-cancel").addEventListener("click", () => overlay.remove());
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") overlay.remove();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
      });
      frontInput.focus();
    }
    // ===== Highlight Marker =====
    async _markExtracted(highlightText) {
      try {
        let content = this.app.editor?.getContent?.() || "";
        if (!content) return;
        const marker = " <!-- extracted -->";
        const lines = content.split("\n");
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(highlightText.split("\n")[0].trim()) && !line.includes("<!-- extracted -->")) {
            lines[i] = line + marker;
            changed = true;
            break;
          }
        }
        if (changed) {
          const newContent = lines.join("\n");
          this.app.editor?.setContent?.(newContent);
          this.app.isDirty = true;
          this.app.saveCurrentFile?.();
        }
      } catch (err) {
        console.warn("[RememberExtract] Could not mark highlight:", err);
      }
    }
    // ===== Bulk Extract =====
    async showBulkExtract() {
      const content = this.app.editor?.getContent?.() || "";
      if (!content) return;
      const sourceFile = this.app.currentFile || "";
      const sourceLink = sourceFile ? `[[${sourceFile.replace(/\.md$/, "")}]]` : "";
      const highlights = [];
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith(">")) {
          const text = line.replace(/^\s*>\s*/, "").trim();
          if (!text) continue;
          const extracted = line.includes("<!-- extracted -->");
          highlights.push({ text, line: i, extracted });
        }
      }
      if (!highlights.length) {
        this.app.showNotice?.("No blockquote highlights found in this note.");
        return;
      }
      document.getElementById("remember-bulk-overlay")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "remember-bulk-overlay";
      overlay.className = "command-palette-overlay";
      overlay.innerHTML = `
            <div class="remember-extract-dialog remember-bulk-dialog">
                <div class="remember-extract-header">\u{1F4CB} Bulk Extract Highlights</div>
                <div class="remember-extract-label">${highlights.length} highlights found in ${this._escapeHtml(sourceFile || "current note")}</div>
                <div class="remember-bulk-list" id="re-bulk-list"></div>
                <div class="remember-extract-actions">
                    <button class="remember-btn" id="re-bulk-cancel">Cancel</button>
                    <button class="remember-btn remember-btn-primary" id="re-bulk-extract">Extract Selected</button>
                </div>
            </div>
        `;
      document.body.appendChild(overlay);
      const listEl = overlay.querySelector("#re-bulk-list");
      const selected = /* @__PURE__ */ new Set();
      for (const h of highlights) {
        const row = document.createElement("label");
        row.className = "remember-bulk-item" + (h.extracted ? " remember-bulk-extracted" : "");
        row.innerHTML = `
                <input type="checkbox" ${h.extracted ? "disabled" : ""} data-line="${h.line}" />
                <span class="remember-bulk-text">${this._escapeHtml(h.text)}</span>
                ${h.extracted ? '<span class="remember-bulk-badge">\u2713 extracted</span>' : ""}
            `;
        const cb = row.querySelector("input");
        cb.addEventListener("change", () => {
          if (cb.checked) selected.add(h);
          else selected.delete(h);
        });
        listEl.appendChild(row);
      }
      overlay.querySelector("#re-bulk-extract").addEventListener("click", async () => {
        if (!selected.size) {
          this.app.showNotice?.("Select at least one highlight.");
          return;
        }
        overlay.remove();
        const items = [...selected];
        for (let i = 0; i < items.length; i++) {
          await this._showBulkItemDialog(items[i].text, sourceLink, i + 1, items.length);
        }
      });
      overlay.querySelector("#re-bulk-cancel").addEventListener("click", () => overlay.remove());
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") overlay.remove();
      });
    }
    _showBulkItemDialog(backText, sourceLink, index, total) {
      return new Promise((resolve) => {
        this._showExtractDialog(backText, {});
        requestAnimationFrame(() => {
          const header = document.querySelector(".remember-extract-header");
          if (header) header.textContent = `\u{1F0CF} Extract Card ${index}/${total}`;
          const sourceInput = document.querySelector("#re-source");
          if (sourceInput) sourceInput.value = sourceLink;
          const obs = new MutationObserver(() => {
            if (!document.getElementById("remember-extract-overlay")) {
              obs.disconnect();
              resolve();
            }
          });
          obs.observe(document.body, { childList: true });
        });
      });
    }
    // ===== Utilities =====
    _escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    _escapeAttr(text) {
      return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    destroy() {
      document.removeEventListener("keydown", this._boundKeydown);
    }
  };

  // src/js/remember-sources.js
  init_tauri_bridge();
  var SOURCE_TYPES = [
    { value: "book", label: "Book", icon: "\u{1F4D6}" },
    { value: "article", label: "Article", icon: "\u{1F4C4}" },
    { value: "video", label: "Video", icon: "\u{1F3AC}" },
    { value: "podcast", label: "Podcast", icon: "\u{1F399}\uFE0F" }
  ];
  var STATUS_OPTIONS = [
    { value: "want_to_read", label: "Will lesen", icon: "\u{1F4CB}" },
    { value: "reading", label: "Lese ich", icon: "\u{1F4D6}" },
    { value: "finished", label: "Gelesen", icon: "\u2705" }
  ];
  var STATUS_ORDER = { reading: 0, want_to_read: 1, finished: 2 };
  var RememberSources = class {
    constructor(app) {
      this.app = app;
      this.sources = [];
      this.filterType = "all";
      this.editingSource = null;
      this.panelEl = null;
    }
    showCreateForm() {
      const container = this.panelEl || document.getElementById("remember-dashboard");
      if (container) {
        this.show(container).then(() => {
          const overlay = container.querySelector(".rs-form-overlay");
          if (overlay) this.renderForm(overlay, null);
        });
      }
    }
    async show(container) {
      this.panelEl = container;
      await this.loadSources();
      this.render();
    }
    // ── Data layer (via Rust) ───────────────────────────────────
    async loadSources() {
      try {
        const sources = await invoke("remember_load_sources");
        this.sources = sources.sort(
          (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
        );
      } catch (err) {
        console.error("[RememberSources] Failed to load:", err);
        this.sources = [];
      }
    }
    async saveSource(data, existingPath) {
      const input = {
        title: data.title,
        author: data.author || "",
        source_type: data.source_type || "book",
        status: data.status || "want_to_read",
        rating: data.rating || 0,
        notes: data.notes || "",
        existing_path: existingPath || null
      };
      await invoke("remember_create_source", { input });
    }
    async deleteSource(path) {
      await invoke("remember_delete_source", { sourcePath: path });
    }
    // ── Rendering ───────────────────────────────────────────────
    render() {
      if (!this.panelEl) return;
      this.panelEl.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "remember-sources";
      wrap.innerHTML = `
            <div class="rs-header">
                <h2>\u{1F4DA} Sources</h2>
                <button class="rs-btn rs-btn-primary" data-action="add">+ Add Source</button>
            </div>
            <div class="rs-filters">
                <button class="rs-filter-btn ${this.filterType === "all" ? "active" : ""}" data-filter="all">All</button>
                ${SOURCE_TYPES.map((t) => `<button class="rs-filter-btn ${this.filterType === t.value ? "active" : ""}" data-filter="${t.value}">${t.icon} ${t.label}</button>`).join("")}
            </div>
            <div class="rs-list"></div>
            <div class="rs-form-overlay" style="display:none"></div>
        `;
      this.panelEl.appendChild(wrap);
      this.renderList(wrap.querySelector(".rs-list"));
      this.bindMainEvents(wrap);
    }
    renderList(container) {
      const filtered = this.filterType === "all" ? this.sources : this.sources.filter((s) => s.source_type === this.filterType);
      if (!filtered.length) {
        container.innerHTML = `<div class="rs-empty">No sources yet. Add your first one!</div>`;
        return;
      }
      let currentStatus = null;
      let html = "";
      for (const s of filtered) {
        const status = typeof s.status === "object" ? Object.keys(s.status)[0] : s.status;
        if (status !== currentStatus) {
          currentStatus = status;
          const label = STATUS_OPTIONS.find((o) => o.value === status);
          html += `<div class="rs-status-group">${label ? label.icon + " " + label.label : status}</div>`;
        }
        const sourceType = typeof s.source_type === "object" ? Object.keys(s.source_type)[0] : s.source_type;
        const typeInfo = SOURCE_TYPES.find((t) => t.value === sourceType) || { icon: "\u{1F4C4}", label: sourceType };
        const stars = "\u2605".repeat(s.rating || 0) + "\u2606".repeat(5 - (s.rating || 0));
        html += `
                <div class="rs-card" data-path="${this.esc(s.path)}">
                    <div class="rs-card-main">
                        <span class="rs-card-type" title="${typeInfo.label}">${typeInfo.icon}</span>
                        <div class="rs-card-info">
                            <div class="rs-card-title">${this.esc(s.title)}</div>
                            <div class="rs-card-author">${this.esc(s.author || "")}</div>
                        </div>
                        <div class="rs-card-rating">${stars}</div>
                    </div>
                    <div class="rs-card-actions">
                        <button class="rs-btn-sm" data-action="edit" data-path="${this.esc(s.path)}" title="Edit">\u270F\uFE0F</button>
                        <button class="rs-btn-sm" data-action="open" data-path="${this.esc(s.path)}" title="Open Note">\u{1F4DD}</button>
                        <button class="rs-btn-sm rs-btn-danger" data-action="delete" data-path="${this.esc(s.path)}" title="Delete">\u{1F5D1}\uFE0F</button>
                    </div>
                </div>`;
      }
      container.innerHTML = html;
    }
    renderForm(overlay, source) {
      const isEdit = !!source;
      const sourceType = source ? typeof source.source_type === "object" ? Object.keys(source.source_type)[0] : source.source_type : "";
      const status = source ? typeof source.status === "object" ? Object.keys(source.status)[0] : source.status : "";
      overlay.style.display = "flex";
      overlay.innerHTML = `
            <div class="rs-form">
                <h3>${isEdit ? "Edit Source" : "Add Source"}</h3>
                <label>Title<input type="text" id="rs-title" value="${this.esc(source?.title || "")}" placeholder="e.g. Courage Is Calling" /></label>
                <label>Author<input type="text" id="rs-author" value="${this.esc(source?.author || "")}" placeholder="e.g. Ryan Holiday" /></label>
                <label>Type
                    <select id="rs-type">
                        ${SOURCE_TYPES.map((t) => `<option value="${t.value}" ${sourceType === t.value ? "selected" : ""}>${t.icon} ${t.label}</option>`).join("")}
                    </select>
                </label>
                <label>Status
                    <select id="rs-status">
                        ${STATUS_OPTIONS.map((o) => `<option value="${o.value}" ${status === o.value ? "selected" : ""}>${o.icon} ${o.label}</option>`).join("")}
                    </select>
                </label>
                <label>Rating
                    <div class="rs-star-picker" id="rs-rating">
                        ${[1, 2, 3, 4, 5].map((n) => `<span class="rs-star ${(source?.rating || 0) >= n ? "active" : ""}" data-val="${n}">\u2605</span>`).join("")}
                    </div>
                </label>
                <label>Notes<textarea id="rs-notes" rows="3" placeholder="Initial notes...">${this.esc(source?.body?.replace(/^#\s*Highlights & Notes\s*\n*/, "") || "")}</textarea></label>
                <div class="rs-form-actions">
                    <button class="rs-btn" data-action="cancel">Cancel</button>
                    <button class="rs-btn rs-btn-primary" data-action="save">Save</button>
                </div>
            </div>`;
      this.bindFormEvents(overlay, source);
    }
    // ── Events ──────────────────────────────────────────────────
    bindMainEvents(wrap) {
      wrap.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const path = btn.dataset.path;
        const overlay = wrap.querySelector(".rs-form-overlay");
        if (action === "add") {
          this.editingSource = null;
          this.renderForm(overlay, null);
        } else if (action === "edit") {
          const src = this.sources.find((s) => s.path === path);
          if (src) {
            this.editingSource = path;
            this.renderForm(overlay, src);
          }
        } else if (action === "delete") {
          if (confirm(`Delete source "${this.sources.find((s) => s.path === path)?.title}"?`)) {
            await this.deleteSource(path);
            await this.loadSources();
            this.render();
          }
        } else if (action === "open") {
          this.app?.openFile?.(path);
        }
      });
      wrap.querySelectorAll(".rs-filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.filterType = btn.dataset.filter;
          this.render();
        });
      });
    }
    bindFormEvents(overlay, source) {
      let rating = source?.rating || 0;
      overlay.querySelectorAll(".rs-star").forEach((star) => {
        star.addEventListener("click", () => {
          rating = parseInt(star.dataset.val, 10);
          overlay.querySelectorAll(".rs-star").forEach((s) => {
            s.classList.toggle("active", parseInt(s.dataset.val, 10) <= rating);
          });
        });
      });
      overlay.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "cancel") {
          overlay.style.display = "none";
          return;
        }
        if (btn.dataset.action === "save") {
          const title = overlay.querySelector("#rs-title").value.trim();
          if (!title) {
            overlay.querySelector("#rs-title").focus();
            return;
          }
          const data = {
            title,
            author: overlay.querySelector("#rs-author").value.trim(),
            source_type: overlay.querySelector("#rs-type").value,
            status: overlay.querySelector("#rs-status").value,
            rating,
            notes: overlay.querySelector("#rs-notes").value.trim()
          };
          try {
            await this.saveSource(data, this.editingSource);
            overlay.style.display = "none";
            await this.loadSources();
            this.render();
          } catch (err) {
            console.error("[RememberSources] Save failed:", err);
            alert("Failed to save source: " + err);
          }
        }
      });
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.style.display = "none";
      });
      setTimeout(() => overlay.querySelector("#rs-title")?.focus(), 50);
    }
    esc(str) {
      if (!str) return "";
      const d = document.createElement("div");
      d.textContent = str;
      return d.innerHTML;
    }
  };

  // src/js/remember-cards.js
  init_tauri_bridge();
  var RememberCards = class {
    constructor(app) {
      this.app = app;
      this.cards = [];
      this._browserEl = null;
      this._creatorEl = null;
    }
    // ── CRUD (via Rust) ────────────────────────────────────────────────
    async loadAll() {
      try {
        this.cards = await invoke("remember_load_cards");
      } catch (err) {
        console.error("[RememberCards] Failed to load:", err);
        this.cards = [];
      }
      return this.cards;
    }
    async saveCard({ front, back, source, tags, existingPath }) {
      const tagsArr = Array.isArray(tags) ? tags : (tags || "").split(",").map((t) => t.trim()).filter(Boolean);
      const input = {
        front,
        back: back || "",
        source: source || "",
        tags: tagsArr,
        existing_path: existingPath || null
      };
      const card = await invoke("remember_create_card", { input });
      return card.path;
    }
    async deleteCard(path) {
      await invoke("remember_delete_card", { cardPath: path });
      this.cards = this.cards.filter((c) => c.path !== path);
    }
    // ── Sources helper (for dropdown) ──────────────────────────────────
    async listSources() {
      try {
        const sources = await invoke("remember_load_sources");
        return sources.map((s) => s.title);
      } catch (_) {
        return [];
      }
    }
    // ── Card Creator UI ────────────────────────────────────────────────
    async openCreator(prefill = {}) {
      this.closeCreator();
      const sources = await this.listSources();
      const overlay = document.createElement("div");
      overlay.className = "remember-modal-overlay";
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeCreator();
      });
      const modal = document.createElement("div");
      modal.className = "remember-modal remember-card-creator";
      const isEdit = !!prefill.existingPath;
      modal.innerHTML = `
            <h2>${isEdit ? "Edit Card" : "New Card"}</h2>
            <label>Front (Question / Idea)
                <input type="text" id="rc-front" placeholder="What is stoicism?" value="" />
            </label>
            <label>Back (Answer / Explanation)
                <textarea id="rc-back" rows="5" placeholder="The philosophy of\u2026"></textarea>
            </label>
            <label>Source
                <div class="rc-source-row">
                    <select id="rc-source-select">
                        <option value="">\u2014 none \u2014</option>
                        ${sources.map((s) => `<option value="[[${s}]]">[[${s}]]</option>`).join("")}
                        <option value="__custom__">Custom [[link]]\u2026</option>
                    </select>
                    <input type="text" id="rc-source-custom" placeholder="[[Source Name]]" style="display:none" />
                </div>
            </label>
            <label>Tags (comma-separated)
                <input type="text" id="rc-tags" placeholder="stoicism, courage" value="" />
            </label>
            <div class="rc-buttons">
                <button id="rc-cancel" class="btn-secondary">Cancel</button>
                <button id="rc-save" class="btn-primary">${isEdit ? "Update" : "Save"}</button>
            </div>
        `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      this._creatorEl = overlay;
      const frontInput = modal.querySelector("#rc-front");
      const backInput = modal.querySelector("#rc-back");
      const sourceSelect = modal.querySelector("#rc-source-select");
      const sourceCustom = modal.querySelector("#rc-source-custom");
      const tagsInput = modal.querySelector("#rc-tags");
      if (prefill.front) frontInput.value = prefill.front;
      if (prefill.back) backInput.value = prefill.back;
      if (prefill.tags) tagsInput.value = Array.isArray(prefill.tags) ? prefill.tags.join(", ") : prefill.tags;
      if (prefill.source) {
        const opt = Array.from(sourceSelect.options).find((o) => o.value === prefill.source);
        if (opt) {
          sourceSelect.value = prefill.source;
        } else {
          sourceSelect.value = "__custom__";
          sourceCustom.style.display = "";
          sourceCustom.value = prefill.source;
        }
      }
      sourceSelect.addEventListener("change", () => {
        sourceCustom.style.display = sourceSelect.value === "__custom__" ? "" : "none";
      });
      modal.querySelector("#rc-cancel").addEventListener("click", () => this.closeCreator());
      modal.querySelector("#rc-save").addEventListener("click", async () => {
        const front = frontInput.value.trim();
        const back = backInput.value.trim();
        if (!front) {
          frontInput.focus();
          return;
        }
        const source = sourceSelect.value === "__custom__" ? sourceCustom.value.trim() : sourceSelect.value;
        const tags = tagsInput.value;
        await this.saveCard({
          front,
          back,
          source,
          tags,
          existingPath: prefill.existingPath
        });
        this.closeCreator();
        if (this._browserEl) this.openBrowser(this._browserEl.parentElement);
      });
      frontInput.focus();
    }
    closeCreator() {
      if (this._creatorEl) {
        this._creatorEl.remove();
        this._creatorEl = null;
      }
    }
    // ── Extract to Card (from editor selection) ────────────────────────
    extractToCard() {
      let selectedText = "";
      const editor = this.app?.editor;
      if (editor) {
        const cm = editor.cm || editor;
        if (cm?.state) {
          const sel = cm.state.selection?.main;
          if (sel && sel.from !== sel.to) {
            selectedText = cm.state.doc.sliceString(sel.from, sel.to);
          }
        }
      }
      if (!selectedText) {
        selectedText = window.getSelection()?.toString() || "";
      }
      const currentFile = this.app?.currentFile || "";
      const sourceName = currentFile.replace(/\.md$/, "").replace(/^.*\//, "");
      const source = sourceName ? `[[${sourceName}]]` : "";
      this.openCreator({
        back: selectedText.trim(),
        source
      });
    }
    // ── Card Browser UI ────────────────────────────────────────────────
    async openBrowser(container) {
      if (!container) return;
      await this.loadAll();
      const el = document.createElement("div");
      el.className = "remember-card-browser";
      const allTags = /* @__PURE__ */ new Set();
      const allSources = /* @__PURE__ */ new Set();
      for (const c of this.cards) {
        if (Array.isArray(c.tags)) c.tags.forEach((t) => allTags.add(t));
        if (c.source) allSources.add(c.source);
      }
      el.innerHTML = `
            <div class="rcb-toolbar">
                <button class="btn-primary rcb-new-card">+ New Card</button>
                <select class="rcb-filter-tag">
                    <option value="">All Tags</option>
                    ${[...allTags].sort().map((t) => `<option value="${t}">${t}</option>`).join("")}
                </select>
                <select class="rcb-filter-source">
                    <option value="">All Sources</option>
                    ${[...allSources].sort().map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>
            </div>
            <div class="rcb-list"></div>
        `;
      container.innerHTML = "";
      container.appendChild(el);
      this._browserEl = el;
      const listEl = el.querySelector(".rcb-list");
      const tagFilter = el.querySelector(".rcb-filter-tag");
      const sourceFilter = el.querySelector(".rcb-filter-source");
      const renderList = () => {
        const ftag = tagFilter.value;
        const fsrc = sourceFilter.value;
        const filtered = this.cards.filter((c) => {
          if (ftag) {
            const tags = Array.isArray(c.tags) ? c.tags : [c.tags];
            if (!tags.includes(ftag)) return false;
          }
          if (fsrc && c.source !== fsrc) return false;
          return true;
        });
        listEl.innerHTML = filtered.length === 0 ? '<div class="rcb-empty">No cards found.</div>' : filtered.map((c) => `
                    <div class="rcb-card" data-path="${c.path}">
                        <div class="rcb-card-front">${this._escHtml(c.front)}</div>
                        <div class="rcb-card-meta">
                            ${c.source ? `<span class="rcb-source">${this._escHtml(c.source)}</span>` : ""}
                            ${Array.isArray(c.tags) ? c.tags.map((t) => `<span class="rcb-tag">${this._escHtml(t)}</span>`).join("") : ""}
                        </div>
                        <div class="rcb-card-actions">
                            <button class="rcb-edit" data-path="${c.path}" title="Edit">\u270F\uFE0F</button>
                            <button class="rcb-delete" data-path="${c.path}" title="Delete">\u{1F5D1}\uFE0F</button>
                        </div>
                    </div>
                `).join("");
      };
      renderList();
      tagFilter.addEventListener("change", renderList);
      sourceFilter.addEventListener("change", renderList);
      el.querySelector(".rcb-new-card").addEventListener("click", () => this.openCreator());
      listEl.addEventListener("click", async (e) => {
        const editBtn = e.target.closest(".rcb-edit");
        const deleteBtn = e.target.closest(".rcb-delete");
        if (editBtn) {
          const card = this.cards.find((c) => c.path === editBtn.dataset.path);
          if (card) {
            this.openCreator({
              front: card.front,
              back: card.back,
              source: card.source,
              tags: card.tags,
              existingPath: card.path
            });
          }
        } else if (deleteBtn) {
          const path = deleteBtn.dataset.path;
          if (confirm(`Delete card "${path}"?`)) {
            await this.deleteCard(path);
            renderList();
          }
        }
      });
    }
    _escHtml(s) {
      if (!s) return "";
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };

  // src/js/remember-review.js
  init_tauri_bridge();
  var ReviewSession = class {
    constructor(app, cards) {
      this.app = app;
      this.cards = cards;
      this.currentIndex = 0;
      this.showingAnswer = false;
      this.results = { again: 0, hard: 0, good: 0, easy: 0 };
      this.qualityOptions = [];
      this.container = null;
      this._keyHandler = null;
    }
    async start() {
      const contentArea = document.getElementById("content-area");
      if (!contentArea) {
        console.error("[Remember] No #content-area found");
        return;
      }
      try {
        this.qualityOptions = await invoke("remember_quality_options");
      } catch (_) {
        this.qualityOptions = [
          { quality: 0, label: "Again", color: "#e74c3c", key: "1" },
          { quality: 1, label: "Hard", color: "#e67e22", key: "2" },
          { quality: 2, label: "Good", color: "#27ae60", key: "3" },
          { quality: 3, label: "Easy", color: "#3498db", key: "4" }
        ];
      }
      this._savedContent = contentArea.innerHTML;
      this.container = document.createElement("div");
      this.container.className = "remember-review-session";
      contentArea.innerHTML = "";
      contentArea.appendChild(this.container);
      this._keyHandler = (e) => this._handleKey(e);
      document.addEventListener("keydown", this._keyHandler);
      this._renderCard();
    }
    _handleKey(e) {
      if (!this.showingAnswer) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          this._showAnswer();
        }
      } else {
        const idx = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
        if (idx !== -1 && idx < this.qualityOptions.length) {
          e.preventDefault();
          this._rate(this.qualityOptions[idx].quality);
        }
      }
    }
    _renderCard() {
      const card = this.cards[this.currentIndex];
      const total = this.cards.length;
      const num = this.currentIndex + 1;
      const pct = Math.round(this.currentIndex / total * 100);
      this.container.innerHTML = `
            <div class="rr-progress">
                <div class="rr-progress-bar">
                    <div class="rr-progress-fill" style="width: ${pct}%"></div>
                </div>
                <span class="rr-progress-text">Karte ${num}/${total}</span>
            </div>
            <div class="rr-card">
                <div class="rr-card-front">
                    <div class="rr-card-label">FRAGE</div>
                    <div class="rr-card-content">${escapeHtml2(card.front)}</div>
                </div>
                <div class="rr-card-back" style="display:none">
                    <div class="rr-card-label">ANTWORT</div>
                    <div class="rr-card-content rr-answer-content">${renderMarkdownSimple(card.back)}</div>
                </div>
                <div class="rr-actions">
                    <button class="rr-btn rr-btn-show" onclick="window._reviewSession._showAnswer()">
                        Antwort zeigen <span class="rr-shortcut">Space</span>
                    </button>
                </div>
            </div>
            <div class="rr-card-meta">
                ${card.path.replace("Cards/", "").replace(".md", "")}
            </div>
        `;
      this.showingAnswer = false;
    }
    _showAnswer() {
      this.showingAnswer = true;
      const backEl = this.container.querySelector(".rr-card-back");
      const actionsEl = this.container.querySelector(".rr-actions");
      if (backEl) backEl.style.display = "block";
      if (actionsEl) actionsEl.innerHTML = this._renderRatingButtons();
    }
    _renderRatingButtons() {
      return this.qualityOptions.map((q) => `
            <button class="rr-btn rr-btn-rate" style="background:${q.color}"
                    onclick="window._reviewSession._rate(${q.quality})">
                ${q.label} <span class="rr-shortcut">${q.key}</span>
            </button>
        `).join("");
    }
    async _rate(quality) {
      const card = this.cards[this.currentIndex];
      const labels = ["again", "hard", "good", "easy"];
      if (labels[quality]) this.results[labels[quality]]++;
      try {
        await invoke("remember_review_card", { cardPath: card.path, quality });
      } catch (e) {
        console.error("[Remember] Failed to review card:", e);
      }
      this.currentIndex++;
      if (this.currentIndex >= this.cards.length) {
        this._showSummary();
      } else {
        this._renderCard();
      }
    }
    _showSummary() {
      const total = this.cards.length;
      const { again, hard, good, easy } = this.results;
      this.container.innerHTML = `
            <div class="rr-summary">
                <div class="rr-summary-icon">\u{1F389}</div>
                <h2>Review abgeschlossen!</h2>
                <div class="rr-summary-total">${total} Karten reviewed</div>
                <div class="rr-summary-breakdown">
                    ${again ? `<div class="rr-stat" style="color:#e74c3c">Again: ${again}</div>` : ""}
                    ${hard ? `<div class="rr-stat" style="color:#e67e22">Hard: ${hard}</div>` : ""}
                    ${good ? `<div class="rr-stat" style="color:#27ae60">Good: ${good}</div>` : ""}
                    ${easy ? `<div class="rr-stat" style="color:#3498db">Easy: ${easy}</div>` : ""}
                </div>
                <button class="rr-btn rr-btn-show" onclick="window._reviewSession.close()">
                    Zur\xFCck
                </button>
            </div>
        `;
      if (this._keyHandler) {
        document.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
      }
    }
    close() {
      if (this._keyHandler) {
        document.removeEventListener("keydown", this._keyHandler);
        this._keyHandler = null;
      }
      window._reviewSession = null;
      const contentArea = document.getElementById("content-area");
      if (contentArea && this._savedContent) {
        contentArea.innerHTML = this._savedContent;
      }
    }
  };
  function renderMarkdownSimple(text) {
    return escapeHtml2(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code>$1</code>").replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>").replace(/\n/g, "<br>");
  }
  function escapeHtml2(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectReviewStyles() {
    if (document.getElementById("remember-review-styles")) return;
    const style = document.createElement("style");
    style.id = "remember-review-styles";
    style.textContent = `
        .remember-review-session {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; padding: 2rem;
            font-family: var(--font-text, -apple-system, BlinkMacSystemFont, sans-serif);
            color: var(--text-normal, #dcddde); background: var(--background-primary, #1e1e1e);
        }
        .rr-progress { width: 100%; max-width: 600px; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
        .rr-progress-bar { flex: 1; height: 6px; background: var(--background-modifier-border, #333); border-radius: 3px; overflow: hidden; }
        .rr-progress-fill { height: 100%; background: var(--interactive-accent, #7c3aed); border-radius: 3px; transition: width 0.3s ease; }
        .rr-progress-text { font-size: 0.85rem; color: var(--text-muted, #888); white-space: nowrap; }
        .rr-card { width: 100%; max-width: 600px; background: var(--background-secondary, #262626); border-radius: 12px; padding: 2.5rem 2rem; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
        .rr-card-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted, #888); margin-bottom: 0.75rem; }
        .rr-card-front .rr-card-content { font-size: 1.4rem; font-weight: 600; line-height: 1.5; }
        .rr-card-back { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--background-modifier-border, #333); }
        .rr-answer-content { font-size: 1.1rem; line-height: 1.7; }
        .rr-answer-content blockquote { border-left: 3px solid var(--interactive-accent, #7c3aed); padding-left: 1rem; margin: 0.5rem 0; color: var(--text-muted, #aaa); font-style: italic; }
        .rr-answer-content code { background: var(--background-primary, #1e1e1e); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
        .rr-actions { display: flex; gap: 0.75rem; margin-top: 2rem; justify-content: center; flex-wrap: wrap; }
        .rr-btn { border: none; border-radius: 8px; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; color: #fff; transition: opacity 0.15s, transform 0.1s; }
        .rr-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .rr-btn:active { transform: translateY(0); }
        .rr-btn-show { background: var(--interactive-accent, #7c3aed); min-width: 200px; }
        .rr-btn-rate { min-width: 100px; }
        .rr-shortcut { font-size: 0.7rem; opacity: 0.6; margin-left: 0.3rem; }
        .rr-card-meta { margin-top: 1.5rem; font-size: 0.8rem; color: var(--text-faint, #666); text-align: center; }
        .rr-overdue { background: rgba(231, 76, 60, 0.2); color: #e74c3c; padding: 0.15em 0.5em; border-radius: 4px; margin-left: 0.5rem; font-size: 0.75rem; }
        .rr-summary { text-align: center; }
        .rr-summary-icon { font-size: 3rem; margin-bottom: 1rem; }
        .rr-summary h2 { margin: 0 0 0.5rem; font-size: 1.6rem; }
        .rr-summary-total { font-size: 1.1rem; color: var(--text-muted, #888); margin-bottom: 1.5rem; }
        .rr-summary-breakdown { display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 2rem; flex-wrap: wrap; }
        .rr-stat { font-size: 1.1rem; font-weight: 600; }
    `;
    document.head.appendChild(style);
  }
  async function startReviewSession(app) {
    injectReviewStyles();
    let cards;
    try {
      cards = await invoke("remember_get_due_cards");
    } catch (err) {
      console.error("[Remember] Failed to get due cards:", err);
      cards = [];
    }
    if (cards.length === 0) {
      const contentArea = document.getElementById("content-area");
      if (contentArea) {
        const msg = document.createElement("div");
        msg.className = "remember-review-session";
        msg.innerHTML = `
                <div class="rr-summary">
                    <div class="rr-summary-icon">\u2705</div>
                    <h2>Keine Karten f\xE4llig!</h2>
                    <div class="rr-summary-total">Alle Reviews sind erledigt. Komm sp\xE4ter wieder.</div>
                </div>
            `;
        contentArea.innerHTML = "";
        contentArea.appendChild(msg);
      }
      return null;
    }
    const session = new ReviewSession(app, cards);
    window._reviewSession = session;
    await session.start();
    return session;
  }
  var RememberReview = (() => {
    injectReviewStyles();
    console.log("[Remember] Review module loaded");
    return {
      startReviewSession,
      ReviewSession
    };
  })();

  // src/js/app.js
  window._moduleLoaded = true;
  var OxidianApp = class {
    constructor() {
      this.currentFile = null;
      this.isDirty = false;
      this.editor = null;
      this.sidebar = null;
      this.search = null;
      this.tabManager = null;
      this.contextMenu = null;
      this.graphView = null;
      this.themeManager = null;
      this.slashMenu = null;
      this.settingsPage = null;
      this.onboarding = null;
      this.pluginLoader = null;
      this.updateManager = null;
      this.backlinksManager = null;
      this.templateManager = null;
      this.quickSwitcher = null;
      this.calloutProcessor = null;
      this.mermaidRenderer = null;
      this.findReplace = null;
      this.embedProcessor = null;
      this.frontmatterProcessor = null;
      this.linkHandler = null;
      this.splitPanes = [];
      this.hypermarkEditor = null;
      this.editorMode = localStorage.getItem("oxidian-editor-mode") || "classic";
      this.livePreview = null;
      this.wikilinksAutoComplete = null;
      this.tagAutoComplete = null;
      this.dragDrop = null;
      this.multipleCursors = null;
      this.folding = null;
      this.propertiesPanel = null;
      this.hoverPreview = null;
      this.canvas = null;
      this.navHistory = null;
      this.commandPalette = null;
      this.bookmarksManagerModule = null;
      this.dailyNotes = null;
      this.focusMode = false;
      this.bookmarks = JSON.parse(localStorage.getItem("oxidian-bookmarks") || "[]");
      this.recentFiles = JSON.parse(localStorage.getItem("oxidian-recent") || "[]");
      this.viewMode = "live-preview";
      this.backlinksPanelOpen = false;
      this.rightEditor = null;
      this.rightFile = null;
      this.rightDirty = false;
      this._autoSaveTimer = null;
      this._fileOperationMutex = false;
      this._saveQueue = [];
      this._currentSavePromise = null;
      this._errorToastContainer = null;
      this.init();
    }
    async init() {
      const safeInit = (name, factory) => {
        try {
          return factory();
        } catch (err) {
          console.error(`[Oxidian] Init "${name}" failed:`, err);
          return null;
        }
      };
      this.editor = safeInit("Editor", () => new Editor(this));
      this.contextMenu = safeInit("ContextMenu", () => new ContextMenu(this));
      this.tabManager = safeInit("TabManager", () => new TabManager(this));
      this.sidebar = safeInit("Sidebar", () => new Sidebar(this));
      this.search = safeInit("Search", () => new Search(this));
      this.themeManager = safeInit("ThemeManager", () => new ThemeManager(this));
      this.slashMenu = safeInit("SlashMenu", () => new SlashMenu(this));
      this.settingsPage = safeInit("SettingsPage", () => new SettingsPage(this));
      this.onboarding = safeInit("Onboarding", () => new Onboarding(this));
      this.updateManager = safeInit("UpdateManager", () => new UpdateManager(this));
      this.backlinksManager = safeInit("BacklinksManager", () => new BacklinksManager(this));
      this.templateManager = safeInit("TemplateManager", () => new TemplateManager(this));
      this.quickSwitcher = safeInit("QuickSwitcher", () => new QuickSwitcher(this));
      this.calloutProcessor = safeInit("CalloutProcessor", () => new CalloutProcessor());
      this.mermaidRenderer = safeInit("MermaidRenderer", () => new MermaidRenderer());
      this.findReplace = safeInit("FindReplace", () => new FindReplace(this));
      this.embedProcessor = safeInit("EmbedProcessor", () => new EmbedProcessor(this));
      this.frontmatterProcessor = safeInit("FrontmatterProcessor", () => new FrontmatterProcessor(this));
      this.linkHandler = safeInit("LinkHandler", () => new LinkHandler(this));
      const safeInitModule = (name, factory) => {
        try {
          return factory();
        } catch (err) {
          console.error(`[Oxidian] Failed to initialize module "${name}":`, err);
          return null;
        }
      };
      this.livePreview = safeInitModule("LivePreview", () => new LivePreview(this));
      this.wikilinksAutoComplete = safeInitModule("WikilinksAutoComplete", () => new WikilinksAutoComplete(this));
      this.tagAutoComplete = safeInitModule("TagAutoComplete", () => new TagAutoComplete(this));
      this.dragDrop = safeInitModule("DragDrop", () => new DragDrop(this));
      this.multipleCursors = safeInitModule("MultipleCursors", () => new MultipleCursors(this));
      this.folding = null;
      this.propertiesPanel = safeInitModule("PropertiesPanel", () => new PropertiesPanel(this));
      this.hoverPreview = safeInitModule("HoverPreview", () => new HoverPreview(this));
      this.canvas = safeInitModule("Canvas", () => new Canvas(this));
      this.navHistory = safeInitModule("NavHistory", () => new NavHistory(this));
      this.commandPalette = safeInitModule("CommandPalette", () => new CommandPalette(this));
      this.bookmarksManagerModule = safeInitModule("BookmarksManager", () => new BookmarksManager(this));
      this.dailyNotes = safeInitModule("DailyNotes", () => new DailyNotes(this));
      this.remember = null;
      this.rememberDashboard = null;
      this.rememberExtract = null;
      this.rememberSources = null;
      this.rememberCards = null;
      this._rememberInitialized = false;
      this.rememberReview = {
        startReview: (dueCards) => startReviewSession(this)
      };
      this._fileTreeCache = null;
      this._fileTreeCacheTime = 0;
      this._fileTreeCacheTTL = 5e3;
      try {
        await this.themeManager?.init();
      } catch (e) {
        console.error("[Oxidian] themeManager.init failed:", e);
      }
      try {
        await this.applySettings();
      } catch (e) {
        console.error("[Oxidian] applySettings failed:", e);
      }
      window.navigateToNote = (target) => this.navigateToNote(target);
      window.searchByTag = (tag) => this.searchByTag(tag);
      const ribbonButtons = document.querySelectorAll(".ribbon-btn[data-panel]");
      if (ribbonButtons) {
        ribbonButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            this.switchSidebarPanel(btn.dataset.panel);
            const allRibbonBtns = document.querySelectorAll(".ribbon-btn[data-panel]");
            if (allRibbonBtns) allRibbonBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            if (btn.dataset.panel === "remember") {
              this.initRemember().then(() => {
                if (this.rememberDashboard) {
                  this.rememberDashboard.show();
                } else if (this.remember) {
                  this.remember.refreshDashboard();
                }
              });
            }
          });
        });
      }
      document.querySelector('.ribbon-btn[data-action="graph"]')?.addEventListener("click", () => this.openGraphView());
      document.querySelector('.ribbon-btn[data-action="canvas"]')?.addEventListener("click", () => this.openCanvasView());
      document.querySelector('.ribbon-btn[data-action="daily"]')?.addEventListener("click", () => this.openDailyNote());
      document.querySelector('.ribbon-btn[data-action="settings"]')?.addEventListener("click", () => this.openSettingsPage());
      document.querySelector('.ribbon-btn[data-action="focus"]')?.addEventListener("click", () => this.toggleFocusMode());
      document.getElementById("btn-view-mode")?.addEventListener("click", () => this.cycleViewMode());
      document.getElementById("btn-backlinks")?.addEventListener("click", () => this.toggleBacklinksPanel());
      document.getElementById("btn-more-options")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleMoreOptions();
      });
      document.getElementById("btn-close-backlinks")?.addEventListener("click", () => this.toggleBacklinksPanel(false));
      document.getElementById("more-options-menu")?.addEventListener("click", (e) => {
        const item = e.target.closest(".dropdown-item");
        if (!item || item.classList.contains("disabled")) return;
        this.handleMoreOption(item.dataset.action);
        document.getElementById("more-options-menu")?.classList.add("hidden");
      });
      document.addEventListener("click", () => {
        document.getElementById("more-options-menu")?.classList.add("hidden");
      });
      document.getElementById("btn-bookmark-current")?.addEventListener("click", () => this.toggleBookmark());
      try {
        this.renderBookmarks();
      } catch (e) {
        console.error("[Oxidian] renderBookmarks failed:", e);
      }
      document.getElementById("btn-clear-recent")?.addEventListener("click", () => {
        this.recentFiles = [];
        localStorage.setItem("oxidian-recent", "[]");
        this.renderRecentFiles();
      });
      try {
        this.renderRecentFiles();
      } catch (e) {
        console.error("[Oxidian] renderRecentFiles failed:", e);
      }
      document.getElementById("btn-new-note")?.addEventListener("click", () => this.showNewNoteDialog());
      document.getElementById("btn-new-folder")?.addEventListener("click", () => this.createNewFolder());
      document.getElementById("btn-refresh")?.addEventListener("click", () => this.sidebar.refresh());
      document.getElementById("btn-welcome-daily")?.addEventListener("click", () => this.openDailyNote());
      document.getElementById("btn-welcome-new")?.addEventListener("click", () => this.showNewNoteDialog());
      document.getElementById("btn-dialog-cancel")?.addEventListener("click", () => this.hideNewNoteDialog());
      document.getElementById("btn-dialog-create")?.addEventListener("click", () => this.createNewNote());
      document.getElementById("new-note-name")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.createNewNote();
        if (e.key === "Escape") this.hideNewNoteDialog();
      });
      document.getElementById("btn-folder-cancel")?.addEventListener("click", () => this.hideNewFolderDialog());
      document.getElementById("btn-folder-create")?.addEventListener("click", () => this.createNewFolderFromDialog());
      document.getElementById("new-folder-name")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.createNewFolderFromDialog();
        if (e.key === "Escape") this.hideNewFolderDialog();
      });
      document.addEventListener("keydown", (e) => this.handleKeyboard(e));
      try {
        this.initSidebarResize();
      } catch (e) {
        console.error("[Oxidian] initSidebarResize failed:", e);
      }
      window.addEventListener("beforeunload", (e) => {
        if (this.isDirty && this.currentFile || this.rightDirty && this.rightFile) {
          if (this.isDirty && this.currentFile) this.saveCurrentFile();
          if (this.rightDirty && this.rightFile) this.saveRightPaneFile();
          e.preventDefault();
          e.returnValue = "";
        }
      });
      try {
        const firstLaunch = await this.onboarding?.shouldShow();
        if (firstLaunch) {
          this.onboarding.show();
        } else {
          await this.checkVaultLock();
        }
      } catch (e) {
        console.error("[Oxidian] onboarding check failed:", e);
      }
      try {
        await this.sidebar?.refresh();
      } catch (e) {
        console.error("[Oxidian] sidebar refresh failed:", e);
      }
      try {
        await this.loadTags();
      } catch (e) {
        console.error("[Oxidian] loadTags failed:", e);
      }
      this.initFileExplorerDragDrop();
      try {
        this.pluginLoader = new PluginLoader(this);
        await this.pluginLoader.init();
      } catch (e) {
        console.error("Failed to initialize plugin loader:", e);
      }
      this.updateManager.checkOnStartup();
      if (window.location.hash === "#remember") {
        this.openRememberDashboard();
      }
      window.addEventListener("hashchange", () => {
        if (window.location.hash === "#remember") {
          this.openRememberDashboard();
        }
      });
    }
    // PERF FIX: Cached file tree — reduces 12+ IPC calls to 1 per 5s
    async getFileTree() {
      const now = Date.now();
      if (this._fileTreeCache && now - this._fileTreeCacheTime < this._fileTreeCacheTTL) {
        return this._fileTreeCache;
      }
      this._fileTreeCache = await invoke("list_files");
      this._fileTreeCacheTime = now;
      return this._fileTreeCache;
    }
    invalidateFileTreeCache() {
      this._fileTreeCache = null;
      this._fileTreeCacheTime = 0;
    }
    // PERF FIX: Lazy-init Remember system
    async initRemember() {
      if (this._rememberInitialized) return;
      this._rememberInitialized = true;
      const safeInitModule = (name, factory) => {
        try {
          return factory();
        } catch (err) {
          console.error(`[Oxidian] Failed to initialize module "${name}":`, err);
          return null;
        }
      };
      console.log("[Oxidian] Lazy-loading Remember system...");
      this.remember = safeInitModule("Remember", () => new Remember(this));
      this.rememberDashboard = safeInitModule("RememberDashboard", () => new RememberDashboard(this));
      this.rememberExtract = safeInitModule("RememberExtract", () => new RememberExtract(this));
      this.rememberSources = safeInitModule("RememberSources", () => new RememberSources(this));
      this.rememberCards = safeInitModule("RememberCards", () => new RememberCards(this));
    }
    async applySettings() {
      try {
        const settings = await invoke("get_settings");
        this.themeManager.applyTheme(settings.appearance.theme);
        if (settings.appearance.accent_color) {
          this.themeManager.setAccentColor(settings.appearance.accent_color);
        }
        document.documentElement.style.setProperty("--font-size-editor", settings.editor.font_size + "px");
        document.documentElement.style.setProperty("--font-editor", settings.editor.font_family);
        document.documentElement.style.fontSize = settings.appearance.interface_font_size + "px";
      } catch (err) {
        console.error("Failed to apply settings:", err);
      }
    }
    async checkVaultLock() {
      try {
        const locked = await invoke("is_vault_locked");
        if (locked) {
          this.showPasswordPrompt();
        }
      } catch {
      }
    }
    showPasswordPrompt() {
      const overlay = document.getElementById("password-dialog");
      if (overlay) {
        overlay.classList.remove("hidden");
        const input = overlay.querySelector("#vault-password-input");
        input?.focus();
      }
    }
    hidePasswordPrompt() {
      const overlay = document.getElementById("password-dialog");
      if (overlay) overlay.classList.add("hidden");
    }
    // ===== Tab callbacks =====
    onTabActivated(tab) {
      const pane = tab.pane || 0;
      if (tab.type === "note") {
        if (tab.viewMode) {
          this.viewMode = tab.viewMode;
        } else {
          tab.viewMode = this.viewMode;
        }
        this.updateViewModeButton();
        this.showEditorPane(tab.path, pane);
      } else if (tab.type === "graph") {
        this.showGraphPane(pane);
      } else if (tab.type === "settings") {
        this.showSettingsPane(pane);
      } else if (tab.type === "canvas") {
        this.showCanvasPane(pane);
      } else if (tab.type === "remember") {
        this.showRememberPane(pane);
      }
    }
    onAllTabsClosed() {
      this.currentFile = null;
      this.showWelcome();
      this.clearPanes();
      this.updateBreadcrumb("");
    }
    // ===== File Operations =====
    async openFile(path) {
      if (this._fileOperationMutex) {
        console.warn("File operation already in progress, ignoring openFile call for:", path);
        return;
      }
      this._fileOperationMutex = true;
      try {
        clearTimeout(this._autoSaveTimer);
        if (this.isDirty && this.currentFile) {
          await this.saveCurrentFile();
        }
        let content;
        try {
          content = await invoke("read_note", { path });
        } catch (error) {
          console.error("Failed to read note:", path, error);
          return;
        }
        const title = path.split("/").pop().replace(".md", "");
        this.tabManager.openTab(path, title, "note");
        this.currentFile = path;
        this.isDirty = false;
        this.addRecentFile(path);
        this.navHistory?.push(path);
        await this.ensureEditorPane();
        this.editor.setContent(content);
        this.sidebar.setActive(path);
        this.hideWelcome();
        this.updateBreadcrumb(path);
        this.loadBacklinks(path);
      } catch (err) {
        console.error("Failed to open file:", err);
        this.showErrorToast(`Failed to open file "${path}": ${err.message || err}`);
      } finally {
        this._fileOperationMutex = false;
      }
    }
    async openFileInSplit(path) {
      try {
        const content = await invoke("read_note", { path });
        const title = path.split("/").pop().replace(".md", "");
        if (!this.tabManager.splitActive) {
          this.tabManager.split();
        }
        this.tabManager.openTab(path, title, "note", 1);
        this.showFileInRightPane(path, content);
      } catch (err) {
        console.error("Failed to open in split:", err);
      }
    }
    async showEditorPane(path, pane = 0) {
      if (pane === 0) {
        if (path === this.currentFile) {
          await this.ensureEditorPane();
          return;
        }
        this.loadFileIntoLeftPane(path);
      } else {
        invoke("read_note", { path }).then((content) => {
          this.showFileInRightPane(path, content);
        }).catch(console.error);
      }
    }
    async loadFileIntoLeftPane(path) {
      clearTimeout(this._autoSaveTimer);
      if (this.isDirty && this.currentFile) {
        await this.saveCurrentFile();
      }
      try {
        const content = await invoke("read_note", { path });
        this.currentFile = path;
        this.isDirty = false;
        this.navHistory?.push(path);
        await this.ensureEditorPane();
        this.editor.setContent(content);
        this.sidebar.setActive(path);
        this.hideWelcome();
        this.updateBreadcrumb(path);
        this.loadBacklinks(path);
      } catch (err) {
        console.error("Failed to load file into left pane:", err);
      }
    }
    showFileInRightPane(path, content) {
      this.rightFile = path;
      const rightPane = document.getElementById("right-pane");
      if (!rightPane) return;
      let textarea = rightPane.querySelector(".editor-textarea");
      let preview = rightPane.querySelector(".preview-content");
      if (textarea) {
        textarea.value = content;
        invoke("render_markdown", { content }).then((html) => {
          if (preview) {
            const isUserContent = content.includes("<script") || content.includes("javascript:");
            if (isUserContent) {
              preview.textContent = "Potentially unsafe content blocked. Please review.";
            } else {
              preview.innerHTML = html;
            }
          }
        }).catch((error) => {
          console.error("Failed to render markdown:", error);
          if (preview) preview.textContent = "Error rendering markdown";
        });
      }
    }
    async saveCurrentFile() {
      if (!this.currentFile || !this.isDirty) return;
      return new Promise((resolve, reject) => {
        this._saveQueue.push({ resolve, reject, file: this.currentFile });
        this._processSaveQueue();
      });
    }
    async _processSaveQueue() {
      if (this._currentSavePromise || this._saveQueue.length === 0) return;
      const { resolve, reject, file } = this._saveQueue.shift();
      this._currentSavePromise = this._performSave(file).then((result) => {
        resolve(result);
        this._currentSavePromise = null;
        this._processSaveQueue();
      }).catch((err) => {
        reject(err);
        this._currentSavePromise = null;
        this._processSaveQueue();
      });
    }
    async _performSave(filePath) {
      if (!filePath || !this.isDirty || this.currentFile !== filePath) return;
      try {
        this.isDirty = false;
        this.tabManager.markClean(filePath);
        const content = this.editor.getContent();
        try {
          await invoke("save_note", { path: filePath, content });
          this.backlinksManager?.invalidate();
        } catch (error) {
          console.error("Failed to save note:", filePath, error);
          throw error;
        }
      } catch (err) {
        this.isDirty = true;
        this.tabManager.markDirty(filePath);
        console.error("Failed to save:", err);
        this.showErrorToast(`Failed to save "${filePath}": ${err.message || err}`);
        throw err;
      }
    }
    async saveRightPaneFile() {
      if (!this.rightFile || !this.rightDirty) return;
      const rightPane = document.getElementById("right-pane");
      if (!rightPane) return;
      const textarea = rightPane.querySelector(".editor-textarea");
      if (!textarea) return;
      try {
        await invoke("save_note", { path: this.rightFile, content: textarea.value });
        this.rightDirty = false;
        this.tabManager.markClean(this.rightFile);
      } catch (err) {
        console.error("Failed to save right pane:", err);
      }
    }
    async openDailyNote() {
      if (this.dailyNotes) {
        return this.dailyNotes.open();
      }
      try {
        const path = await invoke("create_daily_note");
        await this.openFile(path);
        await this.sidebar.refresh();
      } catch (err) {
        console.error("Failed to create daily note:", err);
        this.showErrorToast(`Failed to create daily note: ${err.message || err}`);
      }
    }
    async navigateToNote(target) {
      let path = target;
      if (!path.endsWith(".md")) path = target + ".md";
      try {
        await invoke("read_note", { path });
        await this.openFile(path);
      } catch (readErr) {
        try {
          const content = `# ${target}

`;
          await invoke("save_note", { path, content });
          await this.openFile(path);
          await this.sidebar.refresh();
        } catch (createErr) {
          console.error("Failed to create note:", createErr);
          this.showErrorToast(`Failed to create note "${target}": ${createErr.message || createErr}`);
        }
      }
    }
    async searchByTag(tag) {
      this.search.show();
      this.search.setQuery(`#${tag}`);
      await this.search.performSearch(`#${tag}`);
    }
    // ===== UI =====
    markDirty() {
      if (!this.isDirty) {
        this.isDirty = true;
        if (this.currentFile) {
          this.tabManager.markDirty(this.currentFile);
        }
      }
      clearTimeout(this._autoSaveTimer);
      this._autoSaveTimer = setTimeout(() => {
        if (this.isDirty && this.currentFile) {
          this.saveCurrentFile().catch(() => {
          });
        }
      }, 2e3);
    }
    // *** FIX: Error toast system for user feedback ***
    showErrorToast(message) {
      if (!this._errorToastContainer) {
        this._errorToastContainer = document.createElement("div");
        this._errorToastContainer.id = "error-toast-container";
        this._errorToastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
        document.body.appendChild(this._errorToastContainer);
      }
      const toast = document.createElement("div");
      toast.className = "error-toast";
      toast.style.cssText = `
            background: var(--bg-error, #dc2626);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 8px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto;
            cursor: pointer;
            animation: slideIn 0.3s ease-out;
        `;
      toast.textContent = message;
      toast.addEventListener("click", () => {
        toast.style.animation = "slideOut 0.3s ease-in";
        setTimeout(() => toast.remove(), 300);
      });
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = "slideOut 0.3s ease-in";
          setTimeout(() => toast.remove(), 300);
        }
      }, 5e3);
      this._errorToastContainer.appendChild(toast);
    }
    hideWelcome() {
      document.getElementById("welcome-screen").classList.add("hidden");
    }
    showWelcome() {
      document.getElementById("welcome-screen").classList.remove("hidden");
    }
    updateBreadcrumb(path) {
      const bc = document.getElementById("breadcrumb-path");
      if (!bc) return;
      if (!path) {
        bc.innerHTML = "";
        return;
      }
      const parts = path.replace(".md", "").split("/");
      bc.innerHTML = parts.map((p, i) => {
        const sep = i < parts.length - 1 ? '<span class="breadcrumb-sep">\u203A</span>' : "";
        return `<span class="breadcrumb-item">${this.escapeHtml(p)}</span>${sep}`;
      }).join("");
    }
    // ===== Pane Management =====
    async ensureEditorPane() {
      const container = document.getElementById("pane-container");
      const leftPane = document.getElementById("left-pane");
      if (leftPane && (leftPane.querySelector(".editor-wrapper") || leftPane.querySelector(".hypermark-editor"))) {
        this.applyViewMode();
        return;
      }
      if (leftPane) {
        leftPane.remove();
      } else if (!this.tabManager.splitActive) {
        const overlay = container.querySelector(".split-drop-overlay");
        container.innerHTML = "";
        if (overlay) container.appendChild(overlay);
      }
      if (this.graphView) {
        this.graphView.destroy();
        this.graphView = null;
      }
      const pane = document.createElement("div");
      pane.className = "pane";
      pane.id = "left-pane";
      if (this.viewMode === "source" || this.editorMode === "classic") {
        pane.innerHTML = `
                <div class="editor-wrapper">
                    <div class="editor-pane-half">
                        <textarea class="editor-textarea" placeholder="Start writing... (Markdown supported)" spellcheck="true"></textarea>
                    </div>
                </div>
            `;
        container.insertBefore(pane, container.firstChild);
        const textarea = pane.querySelector(".editor-textarea");
        await this.editor.attach(textarea, null);
        this.attachObsidianFeatures(pane, textarea);
      } else {
        pane.innerHTML = `
                <div class="editor-wrapper" style="display:flex;flex:1;overflow:hidden;">
                    <div class="editor-pane-half" style="flex:1;display:flex;overflow:hidden;">
                        <div class="hypermark-editor" id="hypermark-root"></div>
                    </div>
                </div>
            `;
        container.insertBefore(pane, container.firstChild);
        const hmRoot = pane.querySelector("#hypermark-root");
        if (this.hypermarkEditor) {
          this.hypermarkEditor.destroy?.();
        }
        this.hypermarkEditor = new HyperMarkEditor(hmRoot, {
          onChange: (content) => {
            this.markDirty();
            this.editor.updateStatsFromContent?.(content);
            this.updateOutline?.(content);
          }
        });
        this.editor.attachHyperMark(this.hypermarkEditor, null);
        this.attachObsidianFeatures(pane, null, this.hypermarkEditor);
      }
      this.applyViewMode();
    }
    /** Switch editor mode between 'classic' and 'hypermark'. Reopens current file. */
    async setEditorMode(mode) {
      if (mode === this.editorMode) return;
      this.editorMode = mode;
      localStorage.setItem("oxidian-editor-mode", mode);
      if (mode === "classic") {
        this.viewMode = "source";
      } else {
        this.viewMode = "live-preview";
      }
      const content = this.editor.getContent?.() || "";
      const leftPane = document.getElementById("left-pane");
      if (leftPane) leftPane.remove();
      if (this.hypermarkEditor) {
        this.hypermarkEditor.destroy?.();
        this.hypermarkEditor = null;
      }
      await this.ensureEditorPane();
      if (content) {
        await new Promise((r) => setTimeout(r, 50));
        this.editor.setContent(content);
      }
      this.updateViewModeButton();
    }
    createSplitLayout() {
      const container = document.getElementById("pane-container");
      if (document.getElementById("split-handle")) return;
      const handle = document.createElement("div");
      handle.className = "pane-split-handle";
      handle.id = "split-handle";
      container.appendChild(handle);
      const rightPane = document.createElement("div");
      rightPane.className = "pane";
      rightPane.id = "right-pane";
      rightPane.innerHTML = `
            <div class="split-pane-wrapper">
                <div class="split-tab-bar" id="right-tab-bar">
                    <div class="tab-list-right" id="tab-list-right"></div>
                </div>
                <div class="editor-wrapper">
                    <div class="editor-pane-half">
                        <textarea class="editor-textarea" placeholder="Drag a tab here..." spellcheck="true"></textarea>
                    </div>
                    <div class="preview-pane-half">
                        <div class="preview-content"></div>
                    </div>
                </div>
            </div>
        `;
      container.appendChild(rightPane);
      const rightTabList = rightPane.querySelector("#tab-list-right");
      this.tabManager.setRightTabList(rightTabList);
      const rightTextarea = rightPane.querySelector(".editor-textarea");
      const rightPreview = rightPane.querySelector(".preview-content");
      let rightSaveTimer = null;
      rightTextarea.addEventListener("input", () => {
        const content = rightTextarea.value;
        invoke("render_markdown", { content }).then((html) => {
          rightPreview.innerHTML = html;
        }).catch((error) => {
          console.error("Failed to render markdown in right pane:", error);
          rightPreview.innerHTML = "<p>Error rendering markdown</p>";
        });
        this.rightDirty = true;
        if (this.rightFile) this.tabManager.markDirty(this.rightFile);
        clearTimeout(rightSaveTimer);
        rightSaveTimer = setTimeout(() => {
          this.saveRightPaneFile();
        }, 2e3);
      });
      rightTextarea.addEventListener("blur", () => {
        if (this.rightDirty) this.saveRightPaneFile();
      });
      this.initSplitResize(handle);
    }
    removeSplitLayout() {
      if (this._splitResizeCleanup) {
        this._splitResizeCleanup();
        this._splitResizeCleanup = null;
      }
      const handle = document.getElementById("split-handle");
      const rightPane = document.getElementById("right-pane");
      if (handle) handle.remove();
      if (rightPane) rightPane.remove();
      this.tabManager.setRightTabList(null);
      this.rightFile = null;
      const leftPane = document.getElementById("left-pane");
      if (leftPane) leftPane.style.flex = "";
    }
    clearPanes() {
      const container = document.getElementById("pane-container");
      if (this.graphView) {
        this.graphView.destroy();
        this.graphView = null;
      }
      const overlay = container.querySelector(".split-drop-overlay");
      container.innerHTML = "";
      if (overlay) container.appendChild(overlay);
    }
    // ===== Graph View =====
    openGraphView() {
      this.tabManager.openTab("__graph__", "Graph View", "graph");
    }
    showGraphPane(pane = 0) {
      if (this.isDirty && this.currentFile) {
        this.saveCurrentFile();
      }
      this.hideWelcome();
      this.updateBreadcrumb("");
      if (pane === 0 && !this.tabManager.splitActive) {
        this.clearPanes();
        const container = document.getElementById("pane-container");
        const graphDiv = document.createElement("div");
        graphDiv.className = "pane graph-pane";
        graphDiv.id = "left-pane";
        container.insertBefore(graphDiv, container.firstChild);
        this.graphView = new GraphView(this, graphDiv);
      } else {
        const paneId = pane === 0 ? "left-pane" : "right-pane";
        let paneEl = document.getElementById(paneId);
        if (paneEl) {
          paneEl.innerHTML = "";
          paneEl.className = "pane graph-pane";
        }
        if (paneEl) {
          this.graphView = new GraphView(this, paneEl);
        }
      }
    }
    // ===== Settings =====
    openSettingsTab() {
      this.openSettingsPage();
    }
    async openSettingsPage() {
      this.hideWelcome();
      this.clearPanes();
      const container = document.getElementById("pane-container");
      const settingsDiv = document.createElement("div");
      settingsDiv.className = "pane settings-fullpage";
      settingsDiv.id = "left-pane";
      container.insertBefore(settingsDiv, container.firstChild);
      try {
        await this.settingsPage.show(settingsDiv);
      } catch (err) {
        console.error("Failed to show settings:", err);
        settingsDiv.innerHTML = `<div style="padding:40px;color:var(--text-secondary);">
                <h2>\u2699\uFE0F Settings</h2>
                <p>Error: ${err?.message || err}</p>
            </div>`;
      }
    }
    async showSettingsPane(pane = 0) {
      if (this.isDirty && this.currentFile) {
        this.saveCurrentFile();
      }
      this.hideWelcome();
      this.updateBreadcrumb("");
      try {
        if (pane === 0 && !this.tabManager.splitActive) {
          this.clearPanes();
          const container = document.getElementById("pane-container");
          const settingsDiv = document.createElement("div");
          settingsDiv.className = "pane settings-pane";
          settingsDiv.id = "left-pane";
          container.insertBefore(settingsDiv, container.firstChild);
          await this.settingsPage.show(settingsDiv);
        } else {
          const paneId = pane === 0 ? "left-pane" : "right-pane";
          let paneEl = document.getElementById(paneId);
          if (paneEl) {
            paneEl.innerHTML = "";
            paneEl.className = "pane settings-pane";
            await this.settingsPage.show(paneEl);
          }
        }
      } catch (err) {
        console.error("Failed to show settings:", err);
        const container = document.getElementById("pane-container");
        const leftPane = document.getElementById("left-pane") || container?.firstChild;
        if (leftPane) {
          leftPane.innerHTML = `<div style="padding:40px;color:var(--text-secondary);">
                    <h2 style="color:var(--text-primary);margin-bottom:16px;">\u2699\uFE0F Settings</h2>
                    <p>Settings could not be loaded. Error: ${err?.message || err}</p>
                </div>`;
        }
      }
    }
    showSettings() {
      this.openSettingsTab();
    }
    hideSettings() {
      const settingsDialog = document.getElementById("settings-dialog");
      if (settingsDialog) settingsDialog.classList.add("hidden");
    }
    // ===== New Note Dialog =====
    showNewNoteDialog() {
      const dialog = document.getElementById("new-note-dialog");
      const input = document.getElementById("new-note-name");
      dialog.classList.remove("hidden");
      input.value = "";
      input.focus();
    }
    hideNewNoteDialog() {
      document.getElementById("new-note-dialog").classList.add("hidden");
    }
    async createNewNote() {
      const input = document.getElementById("new-note-name");
      if (!input) {
        this.showErrorToast("Note name input not found");
        return;
      }
      let name = input.value.trim();
      if (!name) return;
      if (!name.endsWith(".md")) name += ".md";
      const content = `# ${name.replace(".md", "")}

`;
      try {
        await invoke("save_note", { path: name, content });
        this.hideNewNoteDialog();
        await this.openFile(name);
        await this.sidebar.refresh();
      } catch (err) {
        console.error("Failed to create note:", err);
        this.showErrorToast(`Failed to create note "${name}": ${err.message || err}`);
      }
    }
    async createNewFolder() {
      this.showNewFolderDialog();
    }
    showNewFolderDialog() {
      const dialog = document.getElementById("new-folder-dialog");
      const input = document.getElementById("new-folder-name");
      if (!dialog || !input) return;
      dialog.classList.remove("hidden");
      input.value = "";
      input.focus();
    }
    hideNewFolderDialog() {
      const dialog = document.getElementById("new-folder-dialog");
      if (dialog) dialog.classList.add("hidden");
    }
    async createNewFolderFromDialog() {
      const input = document.getElementById("new-folder-name");
      if (!input) {
        this.showErrorToast("Folder name input not found");
        return;
      }
      const name = input.value.trim();
      if (!name) return;
      try {
        await invoke("create_folder", { path: name });
        this.hideNewFolderDialog();
        await this.sidebar.refresh();
      } catch (err) {
        console.error("Failed to create folder:", err);
        this.showErrorToast(`Failed to create folder "${name}": ${err.message || err}`);
      }
    }
    // ===== File Operations (context menu) =====
    async deleteFile(path) {
      if (!confirm(`Delete "${path}"?`)) return;
      try {
        await invoke("delete_note", { path });
        const tab = this.tabManager.tabs.find((t) => t.path === path);
        if (tab) this.tabManager.closeTab(tab.id);
        await this.sidebar.refresh();
      } catch (err) {
        console.error("Failed to delete:", err);
        this.showErrorToast(`Failed to delete "${path}": ${err.message || err}`);
      }
    }
    async duplicateFile(path) {
      try {
        const newPath = await invoke("duplicate_note", { path });
        await this.sidebar.refresh();
        await this.openFile(newPath);
      } catch (err) {
        console.error("Failed to duplicate:", err);
      }
    }
    async startRename(path) {
      const item = this.sidebar.container.querySelector(`[data-path="${path}"]`);
      if (!item) return;
      const nameSpan = item.querySelector(".name");
      const oldName = nameSpan.textContent;
      const input = document.createElement("input");
      input.className = "rename-input";
      input.value = oldName;
      nameSpan.replaceWith(input);
      input.focus();
      input.select();
      const finish = async () => {
        let newName = input.value.trim();
        if (!newName || newName === oldName) {
          input.replaceWith(nameSpan);
          return;
        }
        const parts = path.split("/");
        parts[parts.length - 1] = newName.endsWith(".md") ? newName : newName + ".md";
        const newPath = parts.join("/");
        try {
          await invoke("rename_file", { oldPath: path, newPath });
          const oldNoteName = path.replace(".md", "").split("/").pop();
          const newNoteName = newPath.replace(".md", "").split("/").pop();
          if (oldNoteName !== newNoteName) {
            await this.updateInternalLinks(oldNoteName, newNoteName);
          }
          await this.sidebar.refresh();
          const tab = this.tabManager.tabs.find((t) => t.path === path);
          if (tab) {
            tab.path = newPath;
            tab.title = newName.replace(".md", "");
            this.tabManager.renderTabs();
          }
          if (this.currentFile === path) {
            this.currentFile = newPath;
            this.updateBreadcrumb(newPath);
          }
          this.navHistory?.renamePath(path, newPath);
          const bmIdx = this.bookmarks.indexOf(path);
          if (bmIdx >= 0) {
            this.bookmarks[bmIdx] = newPath;
            localStorage.setItem("oxidian-bookmarks", JSON.stringify(this.bookmarks));
            this.renderBookmarks();
          }
          const rfIdx = this.recentFiles.indexOf(path);
          if (rfIdx >= 0) {
            this.recentFiles[rfIdx] = newPath;
            localStorage.setItem("oxidian-recent", JSON.stringify(this.recentFiles));
            this.renderRecentFiles();
          }
          this.invalidateAutoCompleteCaches();
        } catch (err) {
          console.error("Rename failed:", err);
          input.replaceWith(nameSpan);
        }
      };
      input.addEventListener("blur", finish);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        }
        if (e.key === "Escape") {
          input.value = oldName;
          input.blur();
        }
      });
    }
    // ===== Auto-Update Internal Links =====
    /**
     * After renaming a note, update all [[wikilinks]] across the vault via Rust.
     */
    async updateInternalLinks(oldName, newName) {
      try {
        const result = await invoke("update_links_on_rename", { oldName, newName });
        const updatedCount = result?.updated_count || 0;
        if (updatedCount > 0) {
          console.log(`[LinkUpdate] Updated [[${oldName}]] \u2192 [[${newName}]] in ${updatedCount} file(s)`);
          if (this.currentFile) {
            try {
              const refreshed = await invoke("read_note", { path: this.currentFile });
              this.editor.setContent(refreshed);
              this.isDirty = false;
            } catch {
            }
          }
        }
      } catch (err) {
        console.error("[LinkUpdate] Failed to update internal links:", err);
      }
    }
    // ===== Tags =====
    async loadTags() {
      try {
        const tags = await invoke("get_tags");
        const container = document.getElementById("tags-list");
        container.innerHTML = "";
        tags.forEach((tag) => {
          const pill = document.createElement("span");
          pill.className = "tag-pill";
          pill.textContent = `#${tag}`;
          pill.addEventListener("click", () => this.searchByTag(tag));
          container.appendChild(pill);
        });
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    }
    // ===== Backlinks =====
    async loadBacklinks(path) {
      try {
        await this.backlinksManager.updateForNote(path);
      } catch (err) {
        console.error("Failed to load backlinks:", err);
      }
    }
    // ===== Sidebar Panel Switching =====
    switchSidebarPanel(name) {
      document.querySelectorAll(".sidebar-panel").forEach((p) => p.classList.remove("active"));
      const panel = document.getElementById(`panel-${name}`);
      if (panel) panel.classList.add("active");
      document.querySelectorAll(".ribbon-btn[data-panel]").forEach((b) => {
        b.classList.toggle("active", b.dataset.panel === name);
      });
      if (name === "outline" && this.editor?.textarea) {
        this.updateOutline(this.editor.textarea.value);
      }
      const sidebar = document.getElementById("sidebar");
      if (name === "settings") {
        this.loadSettingsInSidebar();
      } else if (sidebar) {
        sidebar.classList.remove("settings-active");
      }
    }
    async loadSettingsInSidebar() {
      const container = document.getElementById("settings-sidebar-container");
      if (!container) return;
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("settings-active");
      if (container.dataset.loaded !== "true") {
        container.dataset.loaded = "true";
        try {
          await this.settingsPage.show(container);
        } catch (err) {
          console.error("Failed to load settings in sidebar:", err);
          container.innerHTML = `<div style="padding:16px;color:var(--text-secondary);">
                    <p>\u2699\uFE0F Settings could not be loaded.</p>
                    <p style="font-size:12px;margin-top:8px;">${err?.message || err}</p>
                </div>`;
        }
      }
    }
    // ===== Sidebar Resize =====
    initSidebarResize() {
      const handle = document.getElementById("sidebar-resize");
      const sidebar = document.getElementById("sidebar");
      const ribbon = document.getElementById("ribbon");
      let isResizing = false;
      const onSidebarResizeMove = (e) => {
        if (!isResizing) return;
        const ribbonW = ribbon.getBoundingClientRect().width;
        const newWidth = Math.max(180, Math.min(500, e.clientX - ribbonW));
        sidebar.style.width = `${newWidth}px`;
      };
      const onSidebarResizeUp = () => {
        if (isResizing) {
          isResizing = false;
          handle.classList.remove("active");
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      };
      handle.addEventListener("mousedown", (e) => {
        isResizing = true;
        handle.classList.add("active");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });
      document.addEventListener("mousemove", onSidebarResizeMove);
      document.addEventListener("mouseup", onSidebarResizeUp);
    }
    initSplitResize(handle) {
      let isResizing = false;
      handle.addEventListener("mousedown", (e) => {
        isResizing = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      });
      const mousemove = (e) => {
        if (!isResizing) return;
        const container = document.getElementById("pane-container");
        const rect = container.getBoundingClientRect();
        const panes = container.querySelectorAll(".pane");
        if (panes.length < 2) return;
        const ratio = (e.clientX - rect.left) / rect.width;
        panes[0].style.flex = `${ratio}`;
        panes[1].style.flex = `${1 - ratio}`;
      };
      const mouseup = () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      };
      document.addEventListener("mousemove", mousemove);
      document.addEventListener("mouseup", mouseup);
      this._splitResizeCleanup = () => {
        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseup);
      };
    }
    // ===== Keyboard Shortcuts =====
    handleKeyboard(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (this.handleNewFeatureShortcuts(e)) {
        return;
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        this.saveCurrentFile();
      } else if (ctrl && e.key === "n") {
        e.preventDefault();
        this.showNewNoteDialog();
      } else if (ctrl && e.key === "p") {
        e.preventDefault();
        if (this.commandPalette) {
          this.commandPalette.show();
        } else {
          this.quickSwitcher.show();
        }
      } else if (ctrl && e.key === "o") {
        e.preventDefault();
        this.quickSwitcher.show();
      } else if (ctrl && e.key === "t") {
        e.preventDefault();
        this.templateManager.showPicker();
      } else if (ctrl && e.key === "f" && !e.shiftKey) {
        const isInEditor = document.activeElement?.classList?.contains("editor-textarea") || document.querySelector(".hypermark-editor") || this.currentFile;
        e.preventDefault();
        if (isInEditor) {
          this.findReplace.showFind();
        } else {
          this.search.show();
        }
      } else if (ctrl && e.key === "h") {
        const isInEditor = document.activeElement?.classList?.contains("editor-textarea") || document.querySelector(".hypermark-editor") || this.currentFile;
        e.preventDefault();
        if (isInEditor) {
          this.findReplace.showFindReplace();
        }
      } else if (ctrl && e.shiftKey && e.key === "F") {
        e.preventDefault();
        this.search.show();
      } else if (ctrl && e.key === "d" && document.activeElement?.classList?.contains("editor-textarea")) {
        return;
      } else if (ctrl && e.key === "d") {
        e.preventDefault();
        this.openDailyNote();
      } else if (ctrl && e.key === "e") {
        e.preventDefault();
        this.cycleViewMode();
      } else if (ctrl && e.key === "w") {
        e.preventDefault();
        const active = this.tabManager.getActiveTab();
        if (active) this.tabManager.closeTab(active.id);
      } else if (ctrl && e.key === ",") {
        e.preventDefault();
        this.openSettingsTab();
      } else if (ctrl && e.shiftKey && e.key === "D") {
        e.preventDefault();
        this.toggleFocusMode();
      } else if (ctrl && e.key === "]") {
        e.preventDefault();
        this.indentSelection();
      } else if (ctrl && e.key === "[") {
        e.preventDefault();
        this.outdentSelection();
      } else if (e.key === "Escape") {
        this.hideNewNoteDialog();
        this.hideNewFolderDialog();
        this.hideSettings();
        this.contextMenu.hide();
        this.slashMenu?.hide();
        this.findReplace?.hide();
        const palette = document.getElementById("command-palette-overlay");
        if (palette) palette.remove();
        const qs = document.getElementById("quick-switcher-overlay");
        if (qs) qs.remove();
        const tp = document.getElementById("template-picker-overlay");
        if (tp) tp.remove();
      }
    }
    // ===== Focus Mode =====
    toggleFocusMode() {
      this.focusMode = !this.focusMode;
      const ribbon = document.getElementById("ribbon");
      const sidebar = document.getElementById("sidebar");
      const sidebarResize = document.getElementById("sidebar-resize");
      const tabBar = document.getElementById("tab-bar");
      const breadcrumb = document.getElementById("breadcrumb-bar");
      const statusbar = document.getElementById("statusbar");
      const focusBtn = document.querySelector('.ribbon-btn[data-action="focus"]');
      if (this.focusMode) {
        ribbon?.classList.add("hidden");
        sidebar?.classList.add("hidden");
        sidebarResize?.classList.add("hidden");
        tabBar?.classList.add("hidden");
        breadcrumb?.classList.add("hidden");
        statusbar?.classList.add("hidden");
        focusBtn?.classList.add("active");
      } else {
        ribbon?.classList.remove("hidden");
        sidebar?.classList.remove("hidden");
        sidebarResize?.classList.remove("hidden");
        tabBar?.classList.remove("hidden");
        breadcrumb?.classList.remove("hidden");
        statusbar?.classList.remove("hidden");
        focusBtn?.classList.remove("active");
      }
    }
    // ===== Text Editing Utilities =====
    /**
     * Indent the selected text or current line
     */
    indentSelection() {
      const textarea = document.querySelector(".editor-textarea");
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = textarea.value;
      const beforeSelection = content.substring(0, start);
      const selectedText = content.substring(start, end);
      const afterSelection = content.substring(end);
      if (start === end) {
        const lineStart = beforeSelection.lastIndexOf("\n") + 1;
        const lineEnd = content.indexOf("\n", start);
        const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
        const lineContent = content.substring(lineStart, actualLineEnd);
        const indentedLine = "    " + lineContent;
        textarea.value = content.substring(0, lineStart) + indentedLine + content.substring(actualLineEnd);
        textarea.selectionStart = start + 4;
        textarea.selectionEnd = start + 4;
      } else {
        const lines = selectedText.split("\n");
        const indentedLines = lines.map((line) => "    " + line);
        const indentedText = indentedLines.join("\n");
        textarea.value = beforeSelection + indentedText + afterSelection;
        textarea.selectionStart = start;
        textarea.selectionEnd = start + indentedText.length;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
    /**
     * Outdent the selected text or current line
     */
    outdentSelection() {
      const textarea = document.querySelector(".editor-textarea");
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = textarea.value;
      const beforeSelection = content.substring(0, start);
      const selectedText = content.substring(start, end);
      const afterSelection = content.substring(end);
      if (start === end) {
        const lineStart = beforeSelection.lastIndexOf("\n") + 1;
        const lineEnd = content.indexOf("\n", start);
        const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;
        const lineContent = content.substring(lineStart, actualLineEnd);
        let outdentedLine = lineContent;
        let removedChars = 0;
        if (lineContent.startsWith("    ")) {
          outdentedLine = lineContent.substring(4);
          removedChars = 4;
        } else if (lineContent.startsWith("	")) {
          outdentedLine = lineContent.substring(1);
          removedChars = 1;
        } else if (lineContent.startsWith("  ")) {
          outdentedLine = lineContent.substring(2);
          removedChars = 2;
        } else if (lineContent.startsWith(" ")) {
          outdentedLine = lineContent.substring(1);
          removedChars = 1;
        }
        textarea.value = content.substring(0, lineStart) + outdentedLine + content.substring(actualLineEnd);
        textarea.selectionStart = Math.max(lineStart, start - removedChars);
        textarea.selectionEnd = Math.max(lineStart, start - removedChars);
      } else {
        const lines = selectedText.split("\n");
        let totalRemoved = 0;
        const outdentedLines = lines.map((line) => {
          let outdentedLine = line;
          let removedChars = 0;
          if (line.startsWith("    ")) {
            outdentedLine = line.substring(4);
            removedChars = 4;
          } else if (line.startsWith("	")) {
            outdentedLine = line.substring(1);
            removedChars = 1;
          } else if (line.startsWith("  ")) {
            outdentedLine = line.substring(2);
            removedChars = 2;
          } else if (line.startsWith(" ")) {
            outdentedLine = line.substring(1);
            removedChars = 1;
          }
          totalRemoved += removedChars;
          return outdentedLine;
        });
        const outdentedText = outdentedLines.join("\n");
        textarea.value = beforeSelection + outdentedText + afterSelection;
        textarea.selectionStart = start;
        textarea.selectionEnd = start + outdentedText.length;
      }
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
    // ===== Bookmarks =====
    toggleBookmark(path) {
      const file = path || this.currentFile;
      if (!file) return;
      const idx = this.bookmarks.indexOf(file);
      if (idx >= 0) {
        this.bookmarks.splice(idx, 1);
      } else {
        this.bookmarks.unshift(file);
      }
      localStorage.setItem("oxidian-bookmarks", JSON.stringify(this.bookmarks));
      this.renderBookmarks();
    }
    renderBookmarks() {
      const list = document.getElementById("bookmarks-list");
      if (!list) return;
      if (this.bookmarks.length === 0) {
        list.innerHTML = "";
        list.className = "empty-panel-message";
        list.textContent = "No bookmarks yet. Click + to bookmark current note.";
        return;
      }
      list.className = "bookmarks-items";
      list.innerHTML = "";
      this.bookmarks.forEach((path) => {
        const item = document.createElement("div");
        item.className = "tree-item bookmark-item";
        const name = path.replace(".md", "").split("/").pop();
        item.innerHTML = `
                <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></span>
                <span class="name">${this.escapeHtml(name)}</span>
                <span class="bookmark-remove" title="Remove bookmark">\xD7</span>
            `;
        item.querySelector(".name").addEventListener("click", () => this.openFile(path));
        item.querySelector(".bookmark-remove").addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleBookmark(path);
        });
        list.appendChild(item);
      });
    }
    // ===== Recent Files =====
    addRecentFile(path) {
      if (!path || path.startsWith("__")) return;
      this.recentFiles = this.recentFiles.filter((p) => p !== path);
      this.recentFiles.unshift(path);
      if (this.recentFiles.length > 20) this.recentFiles.length = 20;
      localStorage.setItem("oxidian-recent", JSON.stringify(this.recentFiles));
      this.renderRecentFiles();
    }
    renderRecentFiles() {
      const list = document.getElementById("recent-list");
      if (!list) return;
      if (this.recentFiles.length === 0) {
        list.innerHTML = "";
        list.className = "empty-panel-message";
        list.textContent = "No recent files";
        return;
      }
      list.className = "recent-items";
      list.innerHTML = "";
      this.recentFiles.forEach((path) => {
        const item = document.createElement("div");
        item.className = "tree-item recent-item";
        const name = path.replace(".md", "").split("/").pop();
        const folder = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
        item.innerHTML = `
                <span class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                <span class="name">${this.escapeHtml(name)}</span>
                ${folder ? `<span class="recent-folder">${this.escapeHtml(folder)}</span>` : ""}
            `;
        item.addEventListener("click", () => this.openFile(path));
        list.appendChild(item);
      });
    }
    // ===== Outline / Table of Contents =====
    updateOutline(content) {
      const list = document.getElementById("outline-list");
      if (!list) return;
      const panel = document.getElementById("panel-outline");
      if (!panel || !panel.classList.contains("active")) return;
      const headings = [];
      const lines = (content || "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(#{1,6})\s+(.+)/);
        if (match) {
          headings.push({ level: match[1].length, text: match[2].replace(/[#*`\[\]]/g, ""), line: i });
        }
      }
      if (headings.length === 0) {
        list.className = "empty-panel-message";
        list.textContent = "No headings found";
        return;
      }
      list.className = "outline-items";
      list.innerHTML = "";
      headings.forEach((h) => {
        const item = document.createElement("div");
        item.className = "outline-item";
        item.style.paddingLeft = `${(h.level - 1) * 16 + 12}px`;
        item.innerHTML = `<span class="outline-h-level">H${h.level}</span> ${this.escapeHtml(h.text)}`;
        item.addEventListener("click", () => {
          if (this.hypermarkEditor) {
            const blocks = this.hypermarkEditor.getBlocks();
            const headingBlocks = blocks.filter((b) => b.type === "heading");
            const target = headingBlocks.find((b) => {
              const text = (b.meta?.text || b.content.replace(/^#{1,6}\s+/, "")).replace(/[#*`\[\]]/g, "");
              return text === h.text;
            });
            if (target) {
              this.hypermarkEditor.focusBlock(target.id);
              this.hypermarkEditor.scrollToBlock(target.id);
            }
            return;
          }
          if (!this.editor?.textarea) return;
          const ta = this.editor.textarea;
          const lines2 = ta.value.split("\n");
          let pos = 0;
          for (let i = 0; i < h.line && i < lines2.length; i++) {
            pos += lines2[i].length + 1;
          }
          ta.selectionStart = ta.selectionEnd = pos;
          ta.focus();
          const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
          ta.scrollTop = h.line * lineHeight - ta.clientHeight / 3;
        });
        list.appendChild(item);
      });
    }
    // ===== Command Palette =====
    // Handled by CommandPalette module (command-palette.js)
    // ===== View Mode =====
    async cycleViewMode() {
      const modes = ["live-preview", "source", "reading"];
      const idx = modes.indexOf(this.viewMode);
      const newMode = modes[(idx + 1) % modes.length];
      this.viewMode = newMode;
      const tab = this.tabManager.getActiveTab();
      if (tab) tab.viewMode = this.viewMode;
      this.applyViewMode();
      this.updateViewModeButton();
    }
    applyViewMode() {
      const pane = document.getElementById("left-pane");
      if (!pane) return;
      pane.classList.remove("live-preview-mode", "source-mode", "reading-mode");
      pane.classList.add(`${this.viewMode}-mode`);
      const editorWrapper = pane.querySelector(".editor-wrapper");
      if (this.viewMode === "reading") {
        if (editorWrapper) editorWrapper.style.display = "none";
        let readingView = pane.querySelector(".reading-view");
        if (!readingView) {
          readingView = document.createElement("div");
          readingView.className = "reading-view preview-content";
          readingView.style.cssText = "flex:1;overflow:auto;padding:24px 32px;";
          pane.appendChild(readingView);
        }
        readingView.style.display = "block";
        const content = this.editor.getContent();
        if (content && content.trim()) {
          this.renderMarkdown(content).then((html) => {
            readingView.innerHTML = html;
            this.mermaidRenderer?.processElement?.(readingView);
          }).catch(() => {
          });
        } else {
          readingView.innerHTML = '<p style="color: var(--text-faint)">Start writing to see a preview</p>';
        }
      } else {
        if (editorWrapper) editorWrapper.style.display = "";
        const readingView = pane.querySelector(".reading-view");
        if (readingView) readingView.style.display = "none";
        this.editor.focus?.();
      }
      this.updateViewModeButton();
    }
    updateViewModeButton() {
      const btn = document.getElementById("btn-view-mode");
      if (!btn) return;
      const label = btn.querySelector(".view-mode-label");
      const labels = { "live-preview": "Live Preview", "source": "Source", "reading": "Reading" };
      if (label) label.textContent = labels[this.viewMode] || "Live Preview";
    }
    // ===== Backlinks Panel =====
    toggleBacklinksPanel(force) {
      this.backlinksPanelOpen = force !== void 0 ? force : !this.backlinksPanelOpen;
      const panel = document.getElementById("backlinks-panel");
      const btn = document.getElementById("btn-backlinks");
      if (panel) panel.classList.toggle("hidden", !this.backlinksPanelOpen);
      if (btn) btn.classList.toggle("active", this.backlinksPanelOpen);
      if (this.backlinksPanelOpen && this.currentFile) {
        this.loadBacklinksPanel(this.currentFile);
      }
    }
    async loadBacklinksPanel(path) {
      try {
        const backlinks = await this.backlinksManager.getBacklinks(path);
        this.backlinksManager.renderPanel(backlinks);
      } catch (err) {
        console.error("Failed to load backlinks panel:", err);
      }
    }
    // ===== More Options Dropdown =====
    toggleMoreOptions() {
      const menu = document.getElementById("more-options-menu");
      if (menu) menu.classList.toggle("hidden");
    }
    async handleMoreOption(action) {
      if (!this.currentFile && action !== "word-count") return;
      switch (action) {
        case "open-in-new-pane":
          if (this.currentFile) this.openFileInSplit(this.currentFile);
          break;
        case "copy-path":
          if (this.currentFile) {
            try {
              await navigator.clipboard.writeText(this.currentFile);
            } catch {
            }
          }
          break;
        case "rename-file":
          if (this.currentFile) this.startRename(this.currentFile);
          break;
        case "delete-file":
          if (this.currentFile) this.deleteFile(this.currentFile);
          break;
        case "pin-tab": {
          const tab = this.tabManager.getActiveTab();
          if (tab) tab.pinned = !tab.pinned;
          break;
        }
        case "word-count": {
          const content = this.editor.getContent();
          const words = content.trim() ? content.trim().split(/\s+/).length : 0;
          const chars = content.length;
          const lines = content.split("\n").length;
          alert(`Words: ${words}
Characters: ${chars}
Lines: ${lines}`);
          break;
        }
        case "export-html": {
          const content = this.editor.getContent();
          try {
            const html = await this.renderMarkdown(content);
            const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.currentFile}</title></head><body>${html}</body></html>`], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (this.currentFile || "note").replace(".md", ".html");
            a.click();
            URL.revokeObjectURL(url);
          } catch {
          }
          break;
        }
        case "export-pdf":
          break;
      }
    }
    /**
     * Render markdown to HTML with callout and mermaid post-processing.
     * *** FIX: Added proper error handling ***
     */
    async renderMarkdown(content, currentPath = null) {
      try {
        let processedContent = content;
        if (this.frontmatterProcessor) {
          processedContent = await this.frontmatterProcessor.processContent(content);
        }
        if (this.embedProcessor) {
          processedContent = await this.embedProcessor.processEmbeds(processedContent, currentPath || this.currentFile);
        }
        const html = await invoke("render_markdown", { content: processedContent });
        const processed = this.calloutProcessor?.process(html) || html;
        return processed;
      } catch (err) {
        console.error("Failed to render markdown:", err);
        return `<div class="render-error" style="color: var(--text-error, #dc2626); padding: 12px; border: 1px solid var(--border-error, #dc2626); border-radius: 4px;">
                <strong>Render Error:</strong> ${this.escapeHtml(err.message || err.toString())}
            </div>`;
      }
    }
    /**
     * Post-process a DOM element for mermaid diagrams (async, in-place).
     */
    async postProcessRendered(el) {
      this.calloutProcessor.processElement(el);
      await this.mermaidRenderer.processElement(el);
    }
    /**
     * Edit frontmatter for the current file
     */
    editFrontmatter() {
      if (!this.currentFile) return;
      const content = this.editor.getContent();
      if (this.frontmatterProcessor) {
        this.frontmatterProcessor.showFrontmatterEditor(content);
      }
    }
    // ===== Remember Integration =====
    openRememberDashboard() {
      try {
        if (this.remember && this.remember.openDashboard) {
          this.remember.openDashboard();
        } else {
          this.switchSidebarPanel("remember");
        }
      } catch (err) {
        console.error("[Remember] Failed to open dashboard:", err);
      }
    }
    extractToCard() {
      if (this.rememberExtract) {
        this.rememberExtract.extractSelection();
      }
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    // ===== NEW OBSIDIAN CORE FEATURES INTEGRATION =====
    /**
     * Attach all Obsidian core features to an editor pane
     */
    attachObsidianFeatures(pane, textarea, hypermarkEditor = null) {
      const safeAttach = (name, fn) => {
        try {
          fn();
        } catch (err) {
          console.error(`[Oxidian] Failed to attach feature "${name}":`, err);
        }
      };
      safeAttach("PropertiesPanel", () => {
        if (this.propertiesPanel) {
          this.propertiesPanel.init(pane);
          if (textarea) this.propertiesPanel.attachTo(textarea);
        }
      });
      safeAttach("DragDrop", () => {
        if (this.dragDrop && pane) this.dragDrop.initEditor(pane);
      });
      if (textarea) {
        safeAttach("WikilinksAutoComplete", () => {
          if (this.wikilinksAutoComplete) this.wikilinksAutoComplete.attachTo(textarea);
        });
        safeAttach("TagAutoComplete", () => {
          if (this.tagAutoComplete) this.tagAutoComplete.attachTo(textarea);
        });
        safeAttach("MultipleCursors", () => {
          if (this.multipleCursors) this.multipleCursors.attachTo(textarea);
        });
      }
      safeAttach("HoverPreview", () => {
        if (this.hoverPreview && pane) this.hoverPreview.init(pane);
      });
      console.log("\u2705 Obsidian core features attached");
    }
    /**
     * Open Canvas view
     */
    openCanvasView() {
      this.tabManager.openTab("__canvas__", "Canvas", "canvas");
    }
    /**
     * Show canvas in a pane
     */
    showCanvasPane(pane = 0) {
      if (this.isDirty && this.currentFile) {
        this.saveCurrentFile();
      }
      this.hideWelcome();
      this.updateBreadcrumb("");
      if (pane === 0 && !this.tabManager.splitActive) {
        this.clearPanes();
        const container = document.getElementById("pane-container");
        const canvasDiv = document.createElement("div");
        canvasDiv.className = "pane canvas-pane";
        canvasDiv.id = "left-pane";
        container.insertBefore(canvasDiv, container.firstChild);
        this.canvas.init(canvasDiv);
      } else {
        const paneId = pane === 0 ? "left-pane" : "right-pane";
        let paneEl = document.getElementById(paneId);
        if (paneEl) {
          paneEl.innerHTML = "";
          paneEl.className = "pane canvas-pane";
          this.canvas.init(paneEl);
        }
      }
    }
    /**
     * Show Remember dashboard in a pane
     */
    showRememberPane(pane = 0) {
      if (this.isDirty && this.currentFile) {
        this.saveCurrentFile();
      }
      this.hideWelcome();
      this.updateBreadcrumb("");
      if (pane === 0 && !this.tabManager.splitActive) {
        this.clearPanes();
        const container = document.getElementById("pane-container");
        const rememberDiv = document.createElement("div");
        rememberDiv.className = "pane remember-pane";
        rememberDiv.id = "left-pane";
        container.insertBefore(rememberDiv, container.firstChild);
        if (this.rememberDashboard) {
          this.rememberDashboard.show();
        } else if (this.remember) {
          this.remember.refreshDashboard();
        }
      }
    }
    /**
     * Enhanced keyboard shortcuts for new features
     */
    handleNewFeatureShortcuts(e) {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      if (ctrl && shift && e.key === "R") {
        e.preventDefault();
        this.openRememberDashboard();
        return true;
      }
      if (ctrl && shift && e.key === "E") {
        e.preventDefault();
        this.extractToCard();
        return true;
      }
      if (ctrl && alt && e.key === "ArrowLeft") {
        e.preventDefault();
        this.navHistory?.goBack();
        return true;
      }
      if (ctrl && alt && e.key === "ArrowRight") {
        e.preventDefault();
        this.navHistory?.goForward();
        return true;
      }
      return false;
    }
    /**
     * Initialize File Explorer drag & drop
     */
    initFileExplorerDragDrop() {
      const fileTreeContainer = document.getElementById("file-tree");
      if (this.dragDrop && fileTreeContainer) {
        this.dragDrop.initFileExplorer(fileTreeContainer);
      }
    }
    /**
     * Invalidate autocomplete caches when files/tags change
     */
    invalidateAutoCompleteCaches() {
      this.wikilinksAutoComplete?.invalidateCache();
      this.tagAutoComplete?.invalidateCache();
    }
  };
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      window.oxidianApp = new OxidianApp();
      window.app = window.oxidianApp;
    } catch (e) {
      console.error("[Oxidian] FATAL: App initialization failed:", e);
      const ws = document.getElementById("welcome-screen");
      if (ws) {
        const errDiv = document.createElement("div");
        errDiv.style.cssText = "color:#f38ba8;font-size:12px;margin-top:16px;padding:12px;background:rgba(243,139,168,0.1);border-radius:8px;text-align:left;max-width:400px;margin-left:auto;margin-right:auto;";
        errDiv.textContent = "Init error: " + e.message + ". Check DevTools console (Ctrl+Shift+I).";
        ws.querySelector(".welcome-content")?.appendChild(errDiv);
      }
    }
  });
})();
