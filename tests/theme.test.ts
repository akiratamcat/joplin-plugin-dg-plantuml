/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
import { isDarkBackground, isDarkColor, parseCssColor } from '../src/contentScript/theme';

describe('parseCssColor', () => {
	test('rgb and rgba forms', () => {
		expect(parseCssColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
		expect(parseCssColor('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
		expect(parseCssColor('rgb(1 2 3 / 50%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
		expect(parseCssColor('transparent')).toBeNull();
		expect(parseCssColor('')).toBeNull();
	});
});

describe('isDarkColor', () => {
	test.each([
		['white (Joplin Light)', 'rgb(255, 255, 255)', false],
		['Solarized Light', 'rgb(253, 246, 227)', false],
		['Joplin Dark', 'rgb(29, 32, 36)', true],
		['Solarized Dark', 'rgb(0, 43, 54)', true],
		['Dracula', 'rgb(40, 42, 54)', true],
	])('%s', (_name, color, dark) => {
		expect(isDarkColor(color)).toBe(dark);
	});

	test('transparent or unknown: null', () => {
		expect(isDarkColor('rgba(0, 0, 0, 0)')).toBeNull();
		expect(isDarkColor('inherit')).toBeNull();
	});
});

describe('isDarkBackground', () => {
	afterEach(() => {
		document.body.style.backgroundColor = '';
		document.documentElement.style.backgroundColor = '';
	});

	test('uses the body background', () => {
		document.body.style.backgroundColor = 'rgb(29, 32, 36)';
		expect(isDarkBackground(document)).toBe(true);
	});

	test('a transparent body falls back to html', () => {
		document.documentElement.style.backgroundColor = 'rgb(0, 43, 54)';
		expect(isDarkBackground(document)).toBe(true);
	});

	test('unknown: light', () => {
		expect(isDarkBackground(document)).toBe(false);
	});
});
