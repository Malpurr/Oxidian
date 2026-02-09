// CodeMirror 6 entry point for bundling
// This file exports all CodeMirror modules that we need

export {
  EditorState,
  Compartment,
  Transaction,
  EditorSelection,
  SelectionRange,
  StateField,
  StateEffect,
  Text
} from '@codemirror/state';

export {
  EditorView,
  ViewUpdate,
  Decoration,
  ViewPlugin,
  WidgetType,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor
} from '@codemirror/view';

export {
  markdown,
  markdownLanguage
} from '@codemirror/lang-markdown';

export {
  Language,
  LanguageSupport,
  LanguageDescription,
  syntaxHighlighting,
  HighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  indentUnit,
  codeFolding,
  foldService,
  foldCode,
  unfoldCode,
  foldAll,
  unfoldAll
} from '@codemirror/language';

export {
  tags as languageTags
} from '@lezer/highlight';

export {
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
  copyLineDown,
  selectParentSyntax,
  simplifySelection
} from '@codemirror/commands';

export {
  searchKeymap,
  search,
  findNext,
  findPrevious,
  selectMatches,
  selectSelectionMatches,
  highlightSelectionMatches,
  replaceNext,
  replaceAll,
  gotoLine,
  SearchQuery
} from '@codemirror/search';

export {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  completionStatus,
  acceptCompletion,
  startCompletion,
  snippetCompletion
} from '@codemirror/autocomplete';

export {
  oneDark
} from '@codemirror/theme-one-dark';