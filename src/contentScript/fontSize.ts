// SPDX-License-Identifier: MIT
// Font size of diagrams (design 8.7):
// (1) the base font size follows the note text, and
// (2) a wide diagram is scaled down to the pane width, but not so far that its
//     smallest text gets below the minimum font size; then it scrolls sideways.

/** Font size of the note text in px (rounded), or 0 when unknown. */
export function noteFontSizePx(doc: Document): number {
	const view = doc.defaultView;
	if (!view || !doc.body) return 0;
	const px = parseFloat(view.getComputedStyle(doc.body).fontSize);
	return Number.isFinite(px) && px > 0 ? Math.round(px) : 0;
}

/**
 * Display scale of a diagram (design 8.7 (2)).
 * @param width natural width of the SVG (1 unit = 1 CSS px)
 * @param available width of the pane for the diagram
 * @param smallestFont smallest font size in the SVG, or null when it has no text
 * @param minFont minimum font size in px; 0 means no limit
 */
export function displayScale(width: number, available: number, smallestFont: number | null, minFont: number): number {
	if (!(width > 0) || !(available > 0)) return 1;
	let scale = Math.min(1, available / width);
	if (minFont > 0 && smallestFont !== null && smallestFont > 0 && smallestFont * scale < minFont) {
		// Never enlarge: a diagram whose text is small on purpose stays as it is.
		scale = Math.max(scale, Math.min(1, minFont / smallestFont));
	}
	return scale;
}

/** Natural size of an SVG from its width/height attributes, or its viewBox. */
export function svgSize(svg: Element): { width: number; height: number } | null {
	const w = parseFloat(svg.getAttribute('width') || '');
	const h = parseFloat(svg.getAttribute('height') || '');
	if (w > 0 && h > 0) return { width: w, height: h };
	const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
	if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: vb[2], height: vb[3] };
	return null;
}

/** Smallest font-size of the text in an SVG (attribute or inline style), or null. */
export function smallestFontSize(svg: Element): number | null {
	let smallest: number | null = null;
	svg.querySelectorAll('text, tspan').forEach((el) => {
		const attr = el.getAttribute('font-size');
		const style = /font-size:\s*([\d.]+)/.exec(el.getAttribute('style') || '');
		const size = parseFloat(attr || (style ? style[1] : ''));
		if (size > 0 && (smallest === null || size < smallest)) smallest = size;
	});
	return smallest;
}

/**
 * Sizes an SVG for the pane: the width is set explicitly, the height follows.
 * Returns the scale that was applied.
 */
export function fitSvg(svg: SVGElement, available: number, minFont: number): number {
	const size = svgSize(svg);
	if (!size) return 1;
	const scale = displayScale(size.width, available, smallestFontSize(svg), minFont);
	svg.style.width = `${round2(size.width * scale)}px`;
	svg.style.height = `${round2(size.height * scale)}px`;
	svg.setAttribute('data-plantuml-scale', String(round2(scale)));
	return scale;
}

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}
