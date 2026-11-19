// SPDX-License-Identifier: MIT
// Uses real SVG output of @plantuml/core 1.2026.10 saved in tests/fixtures/engine.
import * as fs from 'fs';
import * as path from 'path';
import { parseEngineError, svgTexts } from '../src/contentScript/engineError';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', 'engine', name), 'utf8');

describe('parseEngineError', () => {
	test('syntax error', () => {
		expect(parseEngineError(fixture('16-syntax-error.svg'))).toEqual({
			line: 3,
			message: 'Syntax Error? (Assumed diagram type: sequence)',
			crashed: false,
		});
	});

	test('standard library blocked by the plugin', () => {
		expect(parseEngineError(fixture('13-stdlib-c4.svg'))).toEqual({
			line: 2,
			message: 'cannot include <C4/C4_Container>',
			crashed: false,
		});
	});

	test('engine crash (Graphviz without WebAssembly)', () => {
		const e = parseEngineError(fixture('02-class-graphviz-crash.svg'));
		expect(e).not.toBeNull();
		expect(e?.crashed).toBe(true);
		expect(e?.line).toBeNull();
		expect(e?.message).toMatch(/RootCause|Exception|Error/);
	});

	test.each(['01-sequence.svg', '02-class-smetana.svg', '10-cjk-sequence.svg'])('normal diagram %s is not an error', (name) => {
		expect(parseEngineError(fixture(name))).toBeNull();
	});

	test('a diagram that only shows the marker text is not an error', () => {
		const svg = '<svg><text>Alice</text><text>[From textarea (line 2) ]</text></svg>';
		expect(parseEngineError(svg)).toBeNull();
	});
});

describe('svgTexts', () => {
	test('decodes entities and strips inner tags', () => {
		expect(svgTexts('<svg><text x="1">a &lt;b&gt; &amp; &#65;&#x42;</text><text><tspan>c</tspan></text></svg>')).toEqual(['a <b> & AB', 'c']);
	});
});
