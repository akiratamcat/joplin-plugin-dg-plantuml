// SPDX-License-Identifier: MIT
// Fence and info-string handling shared by the Markdown-it plugin, the viewer
// and the editor highlighting (design 6.1, 6.2).

/** Language names that are always treated as PlantUML. */
export const DEFAULT_LANGUAGES = ['plantuml', 'puml'];

export type ThemeOption = 'light' | 'dark' | 'none';
export type AlignOption = 'left' | 'center' | 'right';

export interface BlockOptions {
	theme?: ThemeOption;
	align?: AlignOption;
}

export interface ParsedInfo {
	/** First word of the info string, lower case ('' when empty). */
	language: string;
	/** Known block options with valid values. Unknown options are ignored. */
	options: BlockOptions;
}

/**
 * Parses aliases written in the settings ("uml, diagram" -> ['uml', 'diagram']).
 * Invalid names are dropped.
 */
export function parseAliases(text: string): string[] {
	return text
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => /^[a-z0-9_+-]+$/.test(s));
}

/** True when `language` (any case) is PlantUML: a default name or an alias. */
export function isPlantUmlLanguage(language: string, aliases: string[] = []): boolean {
	const lang = language.toLowerCase();
	return DEFAULT_LANGUAGES.includes(lang) || aliases.includes(lang);
}

/**
 * Parses a Markdown-it info string such as "plantuml theme=dark align=left".
 * Option values that are not allowed are ignored (design 6.2).
 */
export function parseInfo(info: string): ParsedInfo {
	const words = info.trim().split(/\s+/).filter((w) => w.length > 0);
	const language = (words.shift() || '').toLowerCase();
	const options: BlockOptions = {};
	for (const word of words) {
		const m = word.match(/^([a-z]+)=(.*)$/i);
		if (!m) continue;
		const key = m[1].toLowerCase();
		const value = m[2].toLowerCase();
		if (key === 'theme' && (value === 'light' || value === 'dark' || value === 'none')) options.theme = value;
		if (key === 'align' && (value === 'left' || value === 'center' || value === 'right')) options.align = value;
	}
	return { language, options };
}

export interface OpenFence {
	/** The fence characters, e.g. "```" or "~~~~". */
	marker: string;
	info: string;
}

/**
 * Matches an opening code fence line (CommonMark): up to 3 spaces of
 * indentation, then 3 or more backticks or tildes. A backtick fence's info
 * string must not contain a backtick.
 */
export function matchOpenFence(line: string): OpenFence | null {
	const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
	if (!m) return null;
	const marker = m[1];
	const info = m[2];
	if (marker[0] === '`' && info.includes('`')) return null;
	return { marker, info: info.trim() };
}

/**
 * True when `line` closes a block opened with `open`: same character, at least
 * as long, and nothing but spaces after it (CommonMark).
 */
export function isCloseFence(line: string, open: OpenFence): boolean {
	const m = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
	if (!m) return false;
	return m[1][0] === open.marker[0] && m[1].length >= open.marker.length;
}
