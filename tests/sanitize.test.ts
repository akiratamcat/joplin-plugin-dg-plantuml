/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeSvg } from '../src/contentScript/sanitize';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', 'engine', name), 'utf8');

describe('sanitizeSvg', () => {
	test('removes script elements and event handlers', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onload="alert(2)" width="10" height="10"/><text onclick="x()">t</text></svg>';
		const out = sanitizeSvg(svg);
		expect(out).not.toMatch(/<script/i);
		expect(out).not.toMatch(/onload|onclick|alert/i);
		expect(out).toMatch(/<rect/);
		expect(out).toMatch(/>t</);
	});

	test('removes javascript: links but keeps safe links', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
			+ '<a href="javascript:alert(1)"><text>bad</text></a>'
			+ '<a xlink:href="javascript:alert(2)"><text>bad2</text></a>'
			+ '<a href="https://example.com/"><text>web</text></a>'
			+ '<a href=":/0123456789abcdef0123456789abcdef"><text>note</text></a>'
			+ '</svg>';
		const out = sanitizeSvg(svg);
		expect(out).not.toMatch(/javascript:/i);
		expect(out).toMatch(/href="https:\/\/example\.com\/"/);
		expect(out).toMatch(/href=":\/0123456789abcdef0123456789abcdef"/);
	});

	test.each(['01-sequence.svg', '02-class-smetana.svg', '10-cjk-sequence.svg'])('keeps the drawing of a real diagram %s', (name) => {
		const svg = fixture(name);
		const out = sanitizeSvg(svg);
		const count = (s: string, re: RegExp) => (s.match(re) || []).length;
		expect(count(out, /<text\b/g)).toBe(count(svg, /<text\b/g));
		expect(count(out, /<(rect|path|line|polygon|ellipse)\b/g)).toBe(count(svg, /<(rect|path|line|polygon|ellipse)\b/g));
		expect(out).toMatch(/viewBox=/);
	});
});
