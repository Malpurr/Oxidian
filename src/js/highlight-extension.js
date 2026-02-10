// Oxidian — Highlight ==text== Extension for CodeMirror 6
// Decorates ==text== with a yellow highlight background in the editor.

import {
    EditorView,
    Decoration,
    ViewPlugin,
    WidgetType
} from './codemirror-bundle.js';

import {
    RangeSetBuilder
} from './codemirror-bundle.js';

/**
 * Decoration for the highlighted text content (between == markers).
 */
const highlightMark = Decoration.mark({
    class: 'cm-highlight-mark'
});

/**
 * Decoration for the == markers themselves (dimmed).
 */
const highlightMarker = Decoration.mark({
    class: 'cm-highlight-marker'
});

/**
 * Build decorations for all ==text== occurrences in the visible ranges.
 */
function buildHighlightDecorations(view) {
    const builder = new RangeSetBuilder();
    const doc = view.state.doc;

    for (const { from, to } of view.visibleRanges) {
        const text = doc.sliceString(from, to);
        // Match ==...== but not ===
        const regex = /(?<!=)==(?!=)(.+?)==(?!=)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            const contentStart = start + 2;
            const contentEnd = end - 2;

            // Opening ==
            builder.add(start, contentStart, highlightMarker);
            // Content
            builder.add(contentStart, contentEnd, highlightMark);
            // Closing ==
            builder.add(contentEnd, end, highlightMarker);
        }
    }

    return builder.finish();
}

/**
 * ViewPlugin that manages highlight decorations.
 */
const highlightPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
        this.decorations = buildHighlightDecorations(view);
    }

    update(update) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = buildHighlightDecorations(update.view);
        }
    }
}, {
    decorations: v => v.decorations
});

/**
 * Theme for highlight decorations.
 */
const highlightTheme = EditorView.baseTheme({
    '.cm-highlight-mark': {
        backgroundColor: 'rgba(249, 226, 175, 0.35)',
        borderRadius: '2px',
        padding: '1px 0'
    },
    '.cm-highlight-marker': {
        color: 'var(--text-faint, #6c7086)',
        opacity: '0.5'
    }
});

/**
 * Export the full extension array to be added to CodeMirror.
 */
export function highlightExtension() {
    return [highlightPlugin, highlightTheme];
}
