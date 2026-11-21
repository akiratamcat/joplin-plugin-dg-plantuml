// SPDX-License-Identifier: MIT
import { highlightRanges } from '../src/shared/editorHighlight';

function doc(text: string) {
	const lines = text.split('\n');
	const read: number[] = [];
	return {
		source: { lines: lines.length, text: (n: number) => { read.push(n); return lines[n - 1]; } },
		read,
		lines,
	};
}

/** "line:kind:text" of each range. */
function show(text: string, first = 1, last = 1000, aliases: string[] = []): string[] {
	const d = doc(text);
	return highlightRanges(d.source, first, last, aliases).map((r) => `${r.line}:${r.kind}:${d.lines[r.line - 1].slice(r.from, r.to)}`);
}

describe('highlightRanges (design 7.7)', () => {
	const note = [
		'# Title with class and -> words', // 1
		'```plantuml', // 2
		'participant A', // 3
		'A -> B', // 4
		'```', // 5
		'```js', // 6
		'class X {}', // 7
		'```', // 8
	].join('\n');

	test('only the lines inside PlantUML fences', () => {
		expect(show(note)).toEqual(['3:keyword:participant', '4:arrow:->']);
	});

	test('extra language names, tildes and longer fences', () => {
		expect(show('~~~uml\nclass A\n~~~', 1, 99, ['uml'])).toEqual(['2:keyword:class']);
		expect(show('````plantuml theme=dark\n```\nclass A\n````\nclass B')).toEqual(['3:keyword:class']);
		expect(show('```PUML\nclass A\n```')).toEqual(['2:keyword:class']);
	});

	test('only the visible lines get ranges, but a comment that starts above is known', () => {
		const text = ["```plantuml", "/' start", 'still comment', "'/ class A", 'class B', '```'].join('\n');
		expect(show(text, 3, 5)).toEqual(['3:comment:still comment', "4:comment:'/", '4:keyword:class', '5:keyword:class']);
	});

	test('lines after the last visible line are not read', () => {
		const d = doc(['```plantuml', 'class A', 'class B', 'class C', '```'].join('\n'));
		highlightRanges(d.source, 1, 3);
		expect(Math.max(...d.read)).toBe(3);
	});

	test('an unclosed fence colours to the end', () => {
		expect(show('```plantuml\nclass A')).toEqual(['2:keyword:class']);
	});
});
