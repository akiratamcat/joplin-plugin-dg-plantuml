/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
import { displayScale, fitSvg, noteFontSizePx, smallestFontSize, svgSize } from '../src/contentScript/fontSize';

function svg(markup: string): SVGElement {
	const div = document.createElement('div');
	div.innerHTML = markup;
	return div.firstElementChild as SVGElement;
}

describe('displayScale (design 8.7 (2))', () => {
	test.each([
		// width, available, smallest font, minimum, expected
		['fits: natural size', 300, 600, 12, 11, 1],
		['too wide: scaled to the pane', 1200, 600, 24, 11, 0.5],
		['too wide, text would get below the minimum: limited, scrolls', 1200, 600, 14, 11, 11 / 14],
		['minimum 0: no limit', 1200, 600, 14, 0, 0.5],
		['no text: scaled to the pane', 1200, 600, null, 11, 0.5],
		['small text on purpose: never enlarged', 300, 600, 8, 11, 1],
		['small text on purpose in a wide diagram: not above 1', 1200, 600, 8, 11, 1],
		['unknown pane width: natural size', 1200, 0, 14, 11, 1],
	] as const)('%s', (_name, width, available, smallest, min, expected) => {
		expect(displayScale(width, available, smallest, min)).toBeCloseTo(expected, 6);
	});
});

describe('svgSize / smallestFontSize', () => {
	test('size from width/height, or from the viewBox', () => {
		expect(svgSize(svg('<svg width="107" height="134" viewBox="0 0 107 134"></svg>'))).toEqual({ width: 107, height: 134 });
		expect(svgSize(svg('<svg viewBox="0 0 50 20"></svg>'))).toEqual({ width: 50, height: 20 });
		expect(svgSize(svg('<svg></svg>'))).toBeNull();
	});

	test('smallest font size from attributes and inline styles', () => {
		expect(smallestFontSize(svg('<svg><text font-size="14">a</text><text font-size="11">b</text><text style="font-size: 9px">c</text></svg>'))).toBe(9);
		expect(smallestFontSize(svg('<svg><rect/></svg>'))).toBeNull();
	});
});

describe('fitSvg', () => {
	test('sets the width and the height', () => {
		const el = svg('<svg width="1200" height="300"><text font-size="24">a</text></svg>');
		expect(fitSvg(el, 600, 11)).toBe(0.5);
		expect(el.style.width).toBe('600px');
		expect(el.style.height).toBe('150px');
		expect(el.getAttribute('data-plantuml-scale')).toBe('0.5');
	});
});

describe('noteFontSizePx', () => {
	afterEach(() => { document.body.style.fontSize = ''; });

	test('rounded px of the body', () => {
		document.body.style.fontSize = '15.4px';
		expect(noteFontSizePx(document)).toBe(15);
	});
});
