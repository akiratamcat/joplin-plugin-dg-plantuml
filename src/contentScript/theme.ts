// SPDX-License-Identifier: MIT
// Light / dark detection from the note viewer's background colour (design 8.2).

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Parses the rgb()/rgba() strings that getComputedStyle returns. */
export function parseCssColor(value: string): Rgba | null {
	const m = value.trim().match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
	if (!m) return null;
	let a = 1;
	if (m[4] !== undefined) a = m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
	const rgba = { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
	return Object.values(rgba).every(Number.isFinite) ? rgba : null;
}

/** WCAG relative luminance (0: black, 1: white). */
export function relativeLuminance(c: Rgba): number {
	const lin = (v: number) => {
		const s = Math.min(255, Math.max(0, v)) / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** Luminance of a middle grey (CIE L* = 50). Darker backgrounds are dark. */
export const DARK_THRESHOLD = 0.18;

/**
 * True when the colour is a dark background. Transparent or unknown colours
 * return null, so that the caller can look at the parent element.
 */
export function isDarkColor(value: string): boolean | null {
	const c = parseCssColor(value);
	if (!c || c.a === 0) return null;
	return relativeLuminance(c) < DARK_THRESHOLD;
}

/** True when the note viewer has a dark background (body, then html). Unknown: light. */
export function isDarkBackground(doc: Document): boolean {
	const view = doc.defaultView;
	if (!view) return false;
	for (const el of [doc.body, doc.documentElement]) {
		if (!el) continue;
		const dark = isDarkColor(view.getComputedStyle(el).backgroundColor);
		if (dark !== null) return dark;
	}
	return false;
}
