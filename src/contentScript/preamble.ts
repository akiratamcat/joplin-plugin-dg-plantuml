// SPDX-License-Identifier: MIT
// Prepares the source passed to the engine: adds @startuml/@enduml when they
// are omitted, inserts the preamble after the @start line, and maps engine
// line numbers back to the user's line numbers (design 6.1, 7.4, 8.5).

export interface PreambleOptions {
	/** Lines of the selected style preset (empty for plantuml-default / plantuml-dark). */
	presetLines: string[];
	/** Add "skinparam backgroundColor transparent". */
	transparentBackground: boolean;
	/** Font name for "skinparam defaultFontName" (empty: not added). */
	fontFamily: string;
	/** Font size for "skinparam defaultFontSize" (0: not added). */
	fontSizePx: number;
	/** Use the Smetana layout (always true in v1.0: no Graphviz in Joplin). */
	smetana: boolean;
	/** Block option theme=none: no style preamble (Smetana is still added). */
	noStyle: boolean;
}

export interface PreparedSource {
	/** Lines passed to the engine. */
	lines: string[];
	/** Diagram type from the @start line ("uml", "mindmap", "json"...). */
	diagramType: string;
	/** @startuml / @enduml were added because the user omitted them. */
	wrapped: boolean;
	/** 1-based line number (in `lines`) of the @start line. */
	startLine: number;
	/** Number of preamble lines inserted after the @start line. */
	inserted: number;
	/** Number of lines the user wrote. */
	userLineCount: number;
}

const START_RE = /^\s*@start([a-z]+)\b/i;
const LAYOUT_PRAGMA_RE = /^\s*!pragma\s+layout\b/im;

function oneLine(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Builds the preamble lines for a diagram (design 8.5). */
export function buildPreamble(diagramType: string, source: string, opts: PreambleOptions): string[] {
	// Diagram types other than @startuml (json, yaml, mindmap, gantt...) take
	// different style syntax; v1.0 inserts nothing for them (design 8.5).
	if (diagramType !== 'uml') return [];
	const lines: string[] = [];
	if (opts.smetana && !LAYOUT_PRAGMA_RE.test(source)) lines.push('!pragma layout smetana');
	if (opts.noStyle) return lines;
	if (opts.transparentBackground) lines.push('skinparam backgroundColor transparent');
	const font = oneLine(opts.fontFamily);
	if (font) lines.push(`skinparam defaultFontName ${font}`);
	if (Number.isInteger(opts.fontSizePx) && opts.fontSizePx > 0 && opts.fontSizePx <= 200) {
		lines.push(`skinparam defaultFontSize ${opts.fontSizePx}`);
	}
	for (const line of opts.presetLines) lines.push(line);
	return lines;
}

/** Normalises line endings and splits the source into lines. */
export function splitLines(source: string): string[] {
	return source.replace(/\r\n?/g, '\n').split('\n');
}

export function prepareSource(source: string, opts: PreambleOptions): PreparedSource {
	const userLines = splitLines(source);
	let lines = userLines.slice();
	let startIndex = lines.findIndex((l) => START_RE.test(l));
	let wrapped = false;
	if (startIndex < 0) {
		lines = ['@startuml', ...lines, '@enduml'];
		startIndex = 0;
		wrapped = true;
	}
	const m = lines[startIndex].match(START_RE);
	const diagramType = m ? m[1].toLowerCase() : 'uml';
	const preamble = buildPreamble(diagramType, source, opts);
	lines.splice(startIndex + 1, 0, ...preamble);
	return {
		lines,
		diagramType,
		wrapped,
		startLine: startIndex + 1,
		inserted: preamble.length,
		userLineCount: userLines.length,
	};
}

/**
 * Converts a 1-based engine line number to the user's 1-based line number.
 * Returns null when the line is one the plugin added (preamble or wrapper).
 */
export function toUserLine(engineLine: number, prepared: PreparedSource): number | null {
	if (!Number.isInteger(engineLine) || engineLine < 1) return null;
	const offset = prepared.wrapped ? 1 : 0;
	let user: number;
	if (engineLine <= prepared.startLine) {
		user = engineLine - offset;
	} else if (engineLine <= prepared.startLine + prepared.inserted) {
		return null;
	} else {
		user = engineLine - prepared.inserted - offset;
	}
	if (user < 1 || user > prepared.userLineCount) return null;
	return user;
}
