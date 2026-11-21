// SPDX-License-Identifier: MIT
// SVG -> PNG in the viewer (design 11, "Copy PNG" / "Save PNG").
import { svgSize } from './fontSize';

export interface PngOptions {
	/** Pixels per SVG unit (2 gives a sharp image on high-density screens). */
	scale: number;
	/** Background colour; the engine draws none, and a transparent PNG of a dark diagram is unreadable on a light page. */
	background: string;
}

/** Natural size of an SVG string, or null. */
export function svgStringSize(svg: string, doc: Document): { width: number; height: number } | null {
	const container = doc.createElement('div');
	container.innerHTML = svg;
	const el = container.querySelector('svg');
	return el ? svgSize(el) : null;
}

/** An SVG string with explicit width and height, so that it can be drawn as an image. */
export function standaloneSvg(svg: string, size: { width: number; height: number }): string {
	let out = svg;
	if (!/^<svg[^>]*\swidth=/.test(out)) out = out.replace(/^<svg/, `<svg width="${size.width}"`);
	if (!/^<svg[^>]*\sheight=/.test(out)) out = out.replace(/^<svg/, `<svg height="${size.height}"`);
	if (!/^<svg[^>]*\sxmlns=/.test(out)) out = out.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
	return out;
}

/** Draws the SVG on a canvas and returns a PNG data URL. */
export function svgToPng(svg: string, doc: Document, opts: PngOptions): Promise<string> {
	const size = svgStringSize(svg, doc);
	if (!size) return Promise.reject(new Error('The diagram has no size.'));
	const view = doc.defaultView;
	if (!view) return Promise.reject(new Error('No window.'));
	return new Promise((resolve, reject) => {
		const img = new view.Image();
		img.onload = () => {
			try {
				const canvas = doc.createElement('canvas');
				canvas.width = Math.ceil(size.width * opts.scale);
				canvas.height = Math.ceil(size.height * opts.scale);
				const ctx = canvas.getContext('2d');
				if (!ctx) throw new Error('No canvas.');
				ctx.fillStyle = opts.background;
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL('image/png'));
			} catch (e) {
				reject(e);
			}
		};
		img.onerror = () => reject(new Error('The diagram could not be drawn as an image.'));
		img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneSvg(svg.trim(), size))}`;
	});
}
