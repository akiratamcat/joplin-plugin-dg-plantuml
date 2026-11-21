// SPDX-License-Identifier: MIT
import MarkdownIt from 'markdown-it';
import contentScript from '../src/contentScript/markdownItPlugin';

function render(markdown: string): string {
	const md = new MarkdownIt();
	contentScript(null).plugin(md, {});
	return md.render(markdown);
}

/** Attributes of the pre.joplin-source element, decoded like a browser does. */
function sourceAttrs(html: string) {
	const m = html.match(/<pre class="joplin-source" data-joplin-language="([^"]*)" data-joplin-source-open="([^"]*)" data-joplin-source-close="([^"]*)">([\s\S]*?)<\/pre>/);
	if (!m) throw new Error(`no joplin-source in ${html}`);
	const decode = (s: string) => s.replace(/&#10;/g, '\n').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
	return { language: decode(m[1]), open: decode(m[2]), close: decode(m[3]), source: decode(m[4]) };
}

describe('markdownItPlugin', () => {
	test('a plantuml fence becomes a joplin-editable block', () => {
		const html = render('```plantuml\nAlice -> Bob\n```\n');
		expect(html).toMatch(/^<div class="joplin-editable joplin-plantuml">/);
		expect(html).toMatch(/<div class="joplin-plantuml-output" aria-busy="true">/);
		expect(sourceAttrs(html)).toEqual({
			language: 'plantuml',
			open: '```plantuml\n',
			close: '\n```',
			source: 'Alice -> Bob',
		});
	});

	test('open + source + close rebuilds the original block (no extra blank line)', () => {
		const original = '````plantuml theme=dark\n@startuml\nA -> B\n\n@enduml\n````';
		const a = sourceAttrs(render(`${original}\n`));
		expect(a.open + a.source + a.close).toBe(original);
	});

	test('the info string with block options is kept for the edit dialog', () => {
		const a = sourceAttrs(render('```puml theme=dark align=left\nA -> B\n```\n'));
		expect(a.language).toBe('puml theme=dark align=left');
	});

	test('tilde fences and longer fences', () => {
		expect(sourceAttrs(render('~~~plantuml\nA -> B\n~~~\n')).close).toBe('\n~~~');
		const a = sourceAttrs(render('````PlantUML\nnote right\n```\ninside\n```\nend note\n````\n'));
		expect(a.source).toBe('note right\n```\ninside\n```\nend note');
	});

	test('the source is escaped', () => {
		const html = render('```plantuml\nA -> B : <b>"x" & y</b>\n```\n');
		expect(html).not.toMatch(/<b>/);
		expect(sourceAttrs(html).source).toBe('A -> B : <b>"x" & y</b>');
	});

	test('a quote in the info string cannot break out of the attribute', () => {
		const html = render('```plantuml x="><script>alert(1)</script>\nA\n```\n');
		expect(html).not.toMatch(/<script/);
	});

	test('other fences are left to the default rule', () => {
		const html = render('```js\nlet a = 1;\n```\n');
		expect(html).toBe('<pre><code class="language-js">let a = 1;\n</code></pre>\n');
	});

	test('extra language names from the settings', () => {
		const md = new MarkdownIt();
		contentScript(null).plugin(md, { settingValue: (key: string) => (key === 'plantuml.fenceAliases' ? 'uml, diagram' : '') });
		expect(md.render('```uml\nA -> B\n```\n')).toMatch(/joplin-plantuml/);
		expect(md.render('```Diagram\nA -> B\n```\n')).toMatch(/joplin-plantuml/);
		expect(md.render('```js\nx\n```\n')).not.toMatch(/joplin-plantuml/);
	});

	test('a failing settingValue does not break rendering', () => {
		const md = new MarkdownIt();
		contentScript(null).plugin(md, { settingValue: () => { throw new Error('no settings'); } });
		expect(md.render('```plantuml\nA\n```\n')).toMatch(/joplin-plantuml/);
	});

	test('assets', () => {
		expect(contentScript(null).assets()).toEqual([{ name: 'plantuml.css' }, { name: 'viewer.js' }]);
	});
});
