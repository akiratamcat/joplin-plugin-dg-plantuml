// SPDX-License-Identifier: MIT
// Sanitises the engine's SVG before it is inserted into the note viewer
// (design 12): removes <script>, on* attributes and javascript: URLs.
import createDOMPurify from 'dompurify';

type Purifier = ReturnType<typeof createDOMPurify>;
let purifier: Purifier | null = null;
let purifierWindow: Window | null = null;

function getPurifier(win: Window): Purifier {
	if (!purifier || purifierWindow !== win) {
		// DOMPurify's factory takes a window-like object.
		purifier = createDOMPurify(win as unknown as Parameters<typeof createDOMPurify>[0]);
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
