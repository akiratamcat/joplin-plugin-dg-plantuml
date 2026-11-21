// SPDX-License-Identifier: MIT
// Markdown editor content script (CodeMirror 6): colours PlantUML code inside
// PlantUML fences (design 7.7). Only the visible part of the document is
// decorated. The colours come from the editor's own highlight style (the
// classes it uses for keywords, strings...), so they follow Joplin's editor
// theme; kinds the style has no colour for get a fallback colour.
//
// The @codemirror/* and @lezer/* packages are provided by Joplin at run time
// (webpack externals), not bundled.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { highlightRanges } from '../shared/editorHighlight';
import { EditorConfigMessage, EditorConfig } from '../shared/messages';
import { TokenKind } from '../shared/tokenizer';

interface Context {
	postMessage(message: unknown): Promise<unknown>;
}

export default (context: Context) => ({
	plugin: async (codeMirrorWrapper: any) => {
		if (!codeMirrorWrapper || !codeMirrorWrapper.cm6) return; // only CodeMirror 6
		const { ViewPlugin, Decoration, EditorView } = require('@codemirror/view');
		const { RangeSetBuilder } = require('@codemirror/state');
		const { highlightingFor } = require('@codemirror/language');
		const { tags } = require('@lezer/highlight');

		let config: EditorConfig = { enabled: true, aliases: [] };
		try {
			const answer = await context.postMessage({ type: 'getEditorConfig' } as EditorConfigMessage) as EditorConfig | null;
			if (answer && typeof answer.enabled === 'boolean') config = { enabled: answer.enabled, aliases: Array.isArray(answer.aliases) ? answer.aliases : [] };
		} catch {
			// Defaults: highlighting on, no extra language names.
		}
		if (!config.enabled) return;

		const TAGS: Record<TokenKind, any[]> = {
			tag: [tags.keyword],
			keyword: [tags.keyword],
			preprocessor: [tags.processingInstruction, tags.meta],
			comment: [tags.comment],
			string: [tags.string],
			arrow: [tags.operator],
			color: [tags.color, tags.atom],
		};

		/** Class of each kind in the current highlight style, or a fallback class. */
		function classes(state: any): Record<TokenKind, string> {
			const out = {} as Record<TokenKind, string>;
			for (const kind of Object.keys(TAGS) as TokenKind[]) {
				let cls: string | null = null;
				for (const tag of TAGS[kind]) {
					cls = highlightingFor(state, [tag]);
					if (cls) break;
				}
				out[kind] = `dg-pu-${kind} ${cls || `dg-pu-fallback-${kind}`}`;
			}
			return out;
		}

		const marks = new Map<string, any>();
		const mark = (cls: string) => {
			let m = marks.get(cls);
			if (!m) {
				m = Decoration.mark({ class: cls });
				marks.set(cls, m);
			}
			return m;
		};

		function build(view: any) {
			const builder = new RangeSetBuilder();
			const doc = view.state.doc;
			const visible = view.visibleRanges as { from: number; to: number }[];
			if (!visible.length) return builder.finish();
			const first = doc.lineAt(visible[0].from).number;
			const last = doc.lineAt(visible[visible.length - 1].to).number;
			const cls = classes(view.state);
			const ranges = highlightRanges({ lines: doc.lines, text: (n: number) => doc.line(n).text }, first, last, config.aliases);
			for (const r of ranges) {
				const line = doc.line(r.line);
				builder.add(line.from + r.from, line.from + r.to, mark(cls[r.kind]));
			}
			return builder.finish();
		}

		const highlighter = ViewPlugin.fromClass(class {
			decorations: any;
			constructor(view: any) { this.decorations = build(view); }
			update(u: any) {
				// A reconfiguration may change the editor theme and so the classes.
				if (u.docChanged || u.viewportChanged || u.transactions.some((tr: any) => tr.reconfigured)) this.decorations = build(u.view);
			}
		}, { decorations: (v: any) => v.decorations });

		// Start and end tags are bold. The fallback colours are used only when
		// the editor's highlight style has no colour for that kind.
		const theme = EditorView.baseTheme({
			'.dg-pu-tag': { fontWeight: 'bold' },
			'.dg-pu-fallback-tag, .dg-pu-fallback-keyword': { color: '#4078f2' },
			'.dg-pu-fallback-preprocessor': { color: '#c18401' },
			'.dg-pu-fallback-comment': { color: '#8a8a8a', fontStyle: 'italic' },
			'.dg-pu-fallback-string': { color: '#50a14f' },
			'.dg-pu-fallback-arrow': { color: '#e45649' },
			'.dg-pu-fallback-color': { color: '#986801' },
			'&dark .dg-pu-fallback-tag, &dark .dg-pu-fallback-keyword': { color: '#61afef' },
			'&dark .dg-pu-fallback-preprocessor': { color: '#e5c07b' },
			'&dark .dg-pu-fallback-comment': { color: '#7f848e' },
			'&dark .dg-pu-fallback-string': { color: '#98c379' },
			'&dark .dg-pu-fallback-arrow': { color: '#e06c75' },
			'&dark .dg-pu-fallback-color': { color: '#d19a66' },
		});

		codeMirrorWrapper.addExtension([highlighter, theme]);
	},
});
