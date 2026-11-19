// SPDX-License-Identifier: MIT
// Markdown-it content script: turns PlantUML fences into a placeholder that
// the viewer script renders (design 7.1). The HTML follows the structure
// Joplin uses for its own code blocks and Mermaid (joplin-editable +
// pre.joplin-source), so that the Rich Text editor shows and edits the
// source with Joplin's standard dialog without losing it.
import { isPlantUmlLanguage, parseInfo } from '../shared/fence';

/* eslint-disable @typescript-eslint/no-explicit-any -- markdown-it is untyped here */

export function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface FenceToken {
	info: string;
	markup: string;
	content: string;
}

/** HTML of one PlantUML block. */
export function renderBlock(token: FenceToken): string {
	const info = (token.info || '').trim();
	// Same as Joplin's own code blocks: the last newline of the content goes to
	// the close fence ("&#10;" + fence). Joplin's edit dialog rebuilds the block
	// as open + source + close, so keeping the newline in the source would add
	// a blank line on every edit (design 7.1).
	const source = token.content.replace(/\n$/, '');
	return [
		'<div class="joplin-editable joplin-plantuml">',
		'<pre class="joplin-source"',
		` data-joplin-language="${escapeHtml(info)}"`,
		` data-joplin-source-open="${escapeHtml(token.markup + info)}&#10;"`,
		` data-joplin-source-close="&#10;${escapeHtml(token.markup)}">`,
		escapeHtml(source),
		'</pre>',
		'<div class="joplin-plantuml-output" aria-busy="true"><span class="joplin-plantuml-status"></span></div>',
		'</div>\n',
	].join('');
}

export default function(_context: unknown) {
	return {
		plugin: function(markdownIt: any, _options: unknown) {
			const defaultRender = markdownIt.renderer.rules.fence || function(tokens: any, idx: number, options: any, env: any, self: any) {
				return self.renderToken(tokens, idx, options, env, self);
			};
			markdownIt.renderer.rules.fence = function(tokens: any, idx: number, options: any, env: any, self: any) {
				const token = tokens[idx];
				if (!isPlantUmlLanguage(parseInfo(token.info || '').language)) {
					return defaultRender(tokens, idx, options, env, self);
				}
				return renderBlock(token);
			};
		},
		assets: function() {
			return [
				{ name: 'plantuml.css' },
				{ name: 'viewer.js' },
			];
		},
	};
}
