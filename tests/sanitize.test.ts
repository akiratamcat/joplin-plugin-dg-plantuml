/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import { cleanStyle, hasExternalUrl, isSafeCss, isSafeCssValue, sanitizeSvg } from '../src/contentScript/sanitize';

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
		// Nothing of the engine's own CSS is removed.
		expect(count(out, /\sstyle="/g)).toBe(count(svg, /\sstyle="/g));
		expect(count(out, /\sfill="/g)).toBe(count(svg, /\sfill="/g));
	});
});

describe('CSS that could load a file (design 12)', () => {
	const EXT = 'https://example.com/x.png';

	test('hasExternalUrl: url() other than url(#id), and escapes or comments with "("', () => {
		expect(hasExternalUrl(`url(${EXT})`)).toBe(true);
		expect(hasExternalUrl(`URL( '${EXT}' )`)).toBe(true);
		expect(hasExternalUrl('url(#g1)')).toBe(false);
		expect(hasExternalUrl('u\\72 l(x)')).toBe(true);
		expect(hasExternalUrl('/**/url(x)')).toBe(true);
		expect(hasExternalUrl('#FF0000')).toBe(false);
	});

	test('isSafeCssValue: only functions that load nothing', () => {
		for (const ok of ['#181818', 'rgb(1, 2, 3)', 'rgba(1,2,3,0.5)', 'hsl(0 0% 0%)', 'url(#f1)', 'white-space: pre', 'translate(1px, 2px) scale(2)', 'Arial, sans-serif']) {
			expect([ok, isSafeCssValue(ok)]).toEqual([ok, true]);
		}
		for (const bad of [`url(${EXT})`, `image-set("${EXT}" 1x)`, `-webkit-image-set("${EXT}" 1x)`, `image("${EXT}")`, 'cross-fade(a, b)', 'element(#x)', 'paint(x)', 'var(--x)', 'a\\28 b', 'a /* x */ b']) {
			expect([bad, isSafeCssValue(bad)]).toEqual([bad, false]);
		}
	});

	test('cleanStyle keeps the declarations that load nothing', () => {
		expect(cleanStyle('white-space: pre')).toBe('white-space: pre');
		expect(cleanStyle(`stroke:#181818;stroke-width:1;mask-image:image-set('${EXT}' 1x);`)).toBe('stroke:#181818;stroke-width:1');
		expect(cleanStyle(`cursor:image-set('${EXT}' 1x),auto`)).toBe('');
		expect(cleanStyle('background-color: rgb(255, 255, 255)')).toBe('background-color: rgb(255, 255, 255)');
	});

	test('isSafeCss: no @import, no function that loads', () => {
		expect(isSafeCss('.a { fill: red; }')).toBe(true);
		expect(isSafeCss('@import "x.css";')).toBe(false);
		expect(isSafeCss(`svg { background-image: image-set("${EXT}" 1x) }`)).toBe(false);
	});

	test('sanitizeSvg removes CSS that could load a file and keeps the rest', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
			+ `<style>svg { background-image: image-set("${EXT}" 1x) }</style>`
			+ `<rect fill="url(${EXT})" stroke="url(#g)" width="1" height="1"/>`
			+ `<rect fill="#FF0000" cursor="image-set('${EXT}' 1x), auto" filter="url(${EXT}#f)" width="1" height="1"/>`
			+ `<text style="white-space: pre;mask-image:image-set('${EXT}' 1x)" font-family="Arial">t</text>`
			+ `<text style="cursor:image-set('${EXT}' 1x),auto">u</text>`
			+ `<image href="${EXT}" width="1" height="1"/><image xlink:href="data:image/png;base64,AAAA" width="1" height="1"/>`
			+ '<a href="https://example.org/"><text>link</text></a>'
			+ '</svg>';
		const out = sanitizeSvg(svg);
		expect(out).not.toContain('example.com/x.png');
		expect(out).not.toMatch(/image-set/);
		expect(out).toMatch(/<rect fill="none" stroke="url\(#g\)"/);
		expect(out).toMatch(/<rect fill="#FF0000" width/);
		expect(out).toMatch(/<text style="white-space: pre" font-family="Arial">t</);
		expect(out).toMatch(/<text>u</);
		expect(out).toContain('data:image/png;base64,AAAA');
		expect(out).toContain('href="https://example.org/"');
	});
});
