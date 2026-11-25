// SPDX-License-Identifier: MIT
// Sanitises the engine's SVG before it is inserted into the note viewer
// (design 12): removes <script>, on* attributes and javascript: URLs, and
// every CSS value that could load a file.
import createDOMPurify from 'dompurify';

type Purifier = ReturnType<typeof createDOMPurify>;
let purifier: Purifier | null = null;
let purifierWindow: Window | null = null;

/**
 * True when a value has a CSS url() that does not point inside the document
 * (url(#id)). A backslash or a comment opener together with a "(" counts as
 * external too: CSS escapes (u\72 l(...)) or comments could hide a url().
 */
export function hasExternalUrl(value: string): boolean {
	const re = /url\s*\(\s*(['"]?)([^)'"]*)/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(value)) !== null) {
		if (!/^#[A-Za-z0-9_.:-]*$/.test(m[2].trim())) return true;
	}
	return /\\|\/\*/.test(value) && /\(/.test(value);
}

/** CSS functions that load nothing (url() is checked by hasExternalUrl). */
const SAFE_FUNCTIONS = new Set([
	'rgb', 'rgba', 'hsl', 'hsla', 'url',
	'matrix', 'translate', 'translatex', 'translatey', 'scale', 'scalex', 'scaley', 'rotate', 'skew', 'skewx', 'skewy',
]);

/**
 * True when a CSS value loads nothing: no external url(), no other function
 * than SAFE_FUNCTIONS, no escape and no comment. Every way to load a file in
 * CSS needs a function (url(), image-set(), image()...), so allowing only
 * known functions also stops the ones not listed anywhere. The engine checks
 * colours itself and writes only rgb() (checked with 335 diagrams, 1.0.1):
 * this is a second line of defence for later engine versions (design 12).
 */
export function isSafeCssValue(value: string): boolean {
	if (hasExternalUrl(value) || /\\|\/\*/.test(value)) return false;
	const re = /([A-Za-z-]*)\s*\(/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(value)) !== null) {
		if (!SAFE_FUNCTIONS.has(m[1].toLowerCase())) return false;
	}
	return true;
}

/**
 * A style attribute without the declarations that could load a file, or ''
 * when none is left. A value written into style="..." as it is, such as
 * "red;mask-image:image-set('https://...' 1x)", would add a declaration.
 */
export function cleanStyle(value: string): string {
	return value.split(';').map((d) => d.trim())
		.filter((d) => /^[A-Za-z-]+\s*:/.test(d) && isSafeCssValue(d))
		.join(';');
}

/**
 * True when the text of a <style> element loads nothing. The engine writes
 * no <style> (1.0.1); @import loads a file without a function.
 */
export function isSafeCss(css: string): boolean {
	return !/@import/i.test(css) && isSafeCssValue(css);
}

/** Presentation attributes whose CSS value can be an image or a reference. */
const CSS_ATTRIBUTES = new Set(['fill', 'stroke', 'cursor', 'mask', 'filter', 'clip-path', 'marker-start', 'marker-mid', 'marker-end']);

function getPurifier(win: Window): Purifier {
	if (!purifier || purifierWindow !== win) {
		// DOMPurify's factory takes a window-like object.
		const p = createDOMPurify(win as unknown as Parameters<typeof createDOMPurify>[0]);
		p.addHook('uponSanitizeAttribute', (node, data) => {
			const name = data.attrName;
			const value = String(data.attrValue);
			// The style attribute keeps only the declarations that load nothing.
			if (name === 'style') {
				const style = cleanStyle(value);
				if (style === '') data.keepAttr = false;
				else data.attrValue = style;
				return;
			}
			if (CSS_ATTRIBUTES.has(name) && !isSafeCssValue(value)) {
				// Without fill, SVG paints black: paint nothing instead.
				if (name === 'fill' || name === 'stroke') data.attrValue = 'none';
				else data.keepAttr = false;
				return;
			}
			// An <image> may only show a data: image. Links (<a href>) stay: they
			// load nothing until clicked, and the viewer hands them to the main script.
			if ((name === 'href' || name === 'xlink:href') && String(node.nodeName).toLowerCase() === 'image'
				&& !/^data:image\//i.test(value.trim())) {
				data.keepAttr = false;
			}
		});
		// A <style> element that could load a file is emptied.
		p.addHook('uponSanitizeElement', (node, data) => {
			if (data.tagName === 'style' && !isSafeCss(node.textContent ?? '')) node.textContent = '';
		});
		purifier = p;
		purifierWindow = win;
	}
	return purifier;
}

/** Returns a sanitised copy of `svg` (an SVG document as a string). */
export function sanitizeSvg(svg: string, win: Window = window): string {
	return getPurifier(win).sanitize(svg, {
		USE_PROFILES: { svg: true, svgFilters: true },
		// PlantUML writes links as <a href> / <a xlink:href>; keep them, but only
		// with safe URLs (DOMPurify drops javascript: and similar by default).
		ADD_ATTR: ['target'],
	}) as string;
}
