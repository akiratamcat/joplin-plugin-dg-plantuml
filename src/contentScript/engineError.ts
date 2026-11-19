// SPDX-License-Identifier: MIT
// Reads errors out of the SVG the engine returns (design 7.4).
//
// The engine reports syntax errors and failed !include as an SVG that draws
// the error, not through onError. The SVG is XML text, so the error is read
// from the text of its <text> elements. No image analysis is involved.

export interface EngineError {
	/** 1-based line number in the source passed to the engine, or null. */
	line: number | null;
	message: string;
	/** True when the engine itself crashed (not a problem in the diagram). */
	crashed: boolean;
}

const ENTITY: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: '\'' };

function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
		if (code[0] === '#') {
			const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
			return Number.isFinite(n) ? String.fromCodePoint(n) : all;
		}
		const v = ENTITY[code.toLowerCase()];
		return v === undefined ? all : v;
	});
}

/** Text content of each <text> element, in document order. */
export function svgTexts(svg: string): string[] {
	const out: string[] = [];
	const re = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(svg))) out.push(decodeEntities(m[1].replace(/<[^>]+>/g, '')));
	return out;
}

const LINE_RE = /^\[From [^\]]*\(line (\d+)\)\s*\]$/;

/**
 * Returns the error when `svg` is an engine error image, otherwise null.
 * A normal diagram is never taken for an error: the error layout (a version
 * header, then the "[From ... (line N) ]" marker) must match exactly.
 */
export function parseEngineError(svg: string): EngineError | null {
	const texts = svgTexts(svg);
	if (texts.length === 0) return null;

	if (texts[0].trim() === 'An error has occurred!' && texts.some((t) => /has crashed/.test(t))) {
		const cause = texts.find((t) => /RootCause|Exception|Error:/.test(t));
		return { line: null, message: oneLine(cause || 'PlantUML has crashed.'), crashed: true };
	}

	if (texts.length < 2 || !/^PlantUML version\b/.test(texts[0].trim())) return null;
	const m = texts[1].trim().match(LINE_RE);
	if (!m) return null;
	const rest = texts.slice(2).map((t) => t.trim()).filter((t) => t.length > 0);
	const message = rest.length ? rest[rest.length - 1] : '';
	return { line: Number(m[1]), message: oneLine(message), crashed: false };
}

function oneLine(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
