// SPDX-License-Identifier: MIT
import { PreambleOptions, buildPreamble, prepareSource, splitLines, toUserLine } from '../src/contentScript/preamble';

const base: PreambleOptions = {
	presetLines: [],
	transparentBackground: false,
	fontFamily: '',
	fontSizePx: 0,
	smetana: true,
	noStyle: false,
};

describe('buildPreamble', () => {
	test('Smetana is always added for @startuml', () => {
		expect(buildPreamble('uml', 'A -> B', base)).toEqual(['!pragma layout smetana']);
	});

	test('no Smetana when the user chose a layout', () => {
		expect(buildPreamble('uml', '@startuml\n  !pragma layout elk\n@enduml', base)).toEqual([]);
	});

	test('style lines in order: background, font, size, preset', () => {
		const opts = { ...base, transparentBackground: true, fontFamily: 'Noto Sans\nJP', fontSizePx: 16, presetLines: ['skinparam ArrowColor #888'] };
		expect(buildPreamble('uml', '', opts)).toEqual([
			'!pragma layout smetana',
			'skinparam backgroundColor transparent',
			'skinparam defaultFontName Noto Sans JP',
			'skinparam defaultFontSize 16',
			'skinparam ArrowColor #888',
		]);
	});

	test('invalid font sizes are not added', () => {
		expect(buildPreamble('uml', '', { ...base, fontSizePx: 0 })).toEqual(['!pragma layout smetana']);
		expect(buildPreamble('uml', '', { ...base, fontSizePx: 12.5 })).toEqual(['!pragma layout smetana']);
		expect(buildPreamble('uml', '', { ...base, fontSizePx: 1000 })).toEqual(['!pragma layout smetana']);
	});

	test('theme=none: only Smetana', () => {
		expect(buildPreamble('uml', '', { ...base, noStyle: true, transparentBackground: true, presetLines: ['x'] })).toEqual(['!pragma layout smetana']);
	});

	test('other diagram types get no preamble', () => {
		expect(buildPreamble('json', '', { ...base, transparentBackground: true })).toEqual([]);
		expect(buildPreamble('mindmap', '', { ...base, transparentBackground: true })).toEqual([]);
	});
});

describe('prepareSource', () => {
	test('inserts the preamble right after the @start line', () => {
		const p = prepareSource('@startuml\nA -> B\n@enduml', base);
		expect(p.lines).toEqual(['@startuml', '!pragma layout smetana', 'A -> B', '@enduml']);
		expect(p).toMatchObject({ diagramType: 'uml', wrapped: false, startLine: 1, inserted: 1, userLineCount: 3 });
	});

	test('adds @startuml / @enduml when omitted', () => {
		const p = prepareSource('A -> B\nB -> A', base);
		expect(p.lines).toEqual(['@startuml', '!pragma layout smetana', 'A -> B', 'B -> A', '@enduml']);
		expect(p).toMatchObject({ wrapped: true, startLine: 1, inserted: 1, userLineCount: 2 });
	});

	test('lines before @startuml are kept', () => {
		const p = prepareSource("' comment\n@startuml\nA -> B\n@enduml", base);
		expect(p.lines).toEqual(["' comment", '@startuml', '!pragma layout smetana', 'A -> B', '@enduml']);
		expect(p.startLine).toBe(2);
	});

	test('other @start types are passed as they are', () => {
		const p = prepareSource('@startjson\n{"a": 1}\n@endjson', base);
		expect(p.lines).toEqual(['@startjson', '{"a": 1}', '@endjson']);
		expect(p).toMatchObject({ diagramType: 'json', inserted: 0 });
	});

	test('CRLF line endings are normalised', () => {
		expect(splitLines('a\r\nb\rc')).toEqual(['a', 'b', 'c']);
	});
});

describe('toUserLine', () => {
	test('lines before, inside and after the preamble', () => {
		const p = prepareSource('@startuml\nA -> B\nbad line\n@enduml', { ...base, transparentBackground: true });
		// engine: 1 @startuml, 2-3 preamble, 4 A -> B, 5 bad line, 6 @enduml
		expect(toUserLine(1, p)).toBe(1);
		expect(toUserLine(2, p)).toBeNull();
		expect(toUserLine(3, p)).toBeNull();
		expect(toUserLine(4, p)).toBe(2);
		expect(toUserLine(5, p)).toBe(3);
		expect(toUserLine(6, p)).toBe(4);
		expect(toUserLine(7, p)).toBeNull();
	});

	test('the shift seen in Joplin (stage 0): engine line 3 is the user line 2', () => {
		const p = prepareSource('@startuml\n!include <C4/C4_Container>\n@enduml', base);
		expect(toUserLine(3, p)).toBe(2);
	});

	test('omitted @startuml: the added wrapper lines map to null', () => {
		const p = prepareSource('A -> B\nbad', base);
		// engine: 1 @startuml (added), 2 preamble, 3 A -> B, 4 bad, 5 @enduml (added)
		expect(toUserLine(1, p)).toBeNull();
		expect(toUserLine(2, p)).toBeNull();
		expect(toUserLine(3, p)).toBe(1);
		expect(toUserLine(4, p)).toBe(2);
		expect(toUserLine(5, p)).toBeNull();
	});

	test('invalid input', () => {
		const p = prepareSource('A', base);
		expect(toUserLine(0, p)).toBeNull();
		expect(toUserLine(NaN, p)).toBeNull();
	});
});
