// SPDX-License-Identifier: MIT
// PlantUML tokenizer for syntax highlighting (design 7.7): used by the
// Markdown editor and by the line excerpt of the viewer's error box (7.4).
// It only needs to be good enough for colours; it does not parse PlantUML.

export type TokenKind = 'tag' | 'keyword' | 'preprocessor' | 'comment' | 'string' | 'arrow' | 'color';

export interface Token {
	/** Offsets in the line. */
	from: number;
	to: number;
	kind: TokenKind;
}

export interface TokenizerState {
	/** Inside a /' ... '/ comment that continues on the next line. */
	inBlockComment: boolean;
}

export const INITIAL_STATE: TokenizerState = { inBlockComment: false };

/** Common PlantUML keywords (design 7.7). */
export const KEYWORDS = new Set([
	// participants and elements
	'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue',
	'class', 'interface', 'abstract', 'enum', 'annotation', 'struct', 'protocol', 'exception', 'metaclass', 'stereotype',
	'package', 'namespace', 'node', 'component', 'usecase', 'rectangle', 'cloud', 'artifact', 'folder', 'frame',
	'file', 'card', 'storage', 'agent', 'stack', 'hexagon', 'person', 'label', 'object', 'map', 'json', 'state',
	// structure
	'note', 'end', 'as', 'of', 'on', 'over', 'left', 'right', 'top', 'bottom', 'up', 'down', 'link', 'across',
	'together', 'is', 'extends', 'implements',
	// sequence
	'activate', 'deactivate', 'destroy', 'create', 'return', 'autonumber', 'autoactivate', 'newpage', 'box', 'ref',
	'alt', 'else', 'opt', 'loop', 'par', 'par2', 'break', 'critical', 'group',
	// activity
	'start', 'stop', 'kill', 'detach', 'if', 'then', 'elseif', 'endif', 'while', 'endwhile', 'repeat', 'backward',
	'fork', 'again', 'split', 'merge', 'switch', 'case', 'endswitch', 'partition', 'swimlane',
	// diagram
	'title', 'header', 'footer', 'legend', 'caption', 'skinparam', 'hide', 'show', 'remove', 'restore', 'scale',
	'direction', 'to', 'mainframe', 'allowmixing', 'set', 'namespaceseparator',
]);

const ARROW_RE = /(<<|<\|?|[*o#x+}^])?(-+|\.+|=+|~+)(\[[^\]]*\])?(-+|\.+|=+|~+)?(\|?>>?|[*o#x+{^]|\\\\|\/\/)?/y;

function isWordChar(c: string | undefined): boolean {
	return !!c && /[A-Za-z0-9_$]/.test(c);
}

/**
 * Tokens of one line, and the state for the next line. Text after a ":" (a
 * message or a label) is not coloured, except that strings and comments are
 * still recognised before it.
 */
export function tokenizeLine(text: string, state: TokenizerState = INITIAL_STATE): { tokens: Token[]; state: TokenizerState } {
	const tokens: Token[] = [];
	let i = 0;
	let inBlockComment = state.inBlockComment;
	const n = text.length;

	if (inBlockComment) {
		const end = text.indexOf('\'/');
		if (end < 0) return { tokens: n ? [{ from: 0, to: n, kind: 'comment' }] : [], state: { inBlockComment: true } };
		tokens.push({ from: 0, to: end + 2, kind: 'comment' });
		i = end + 2;
		inBlockComment = false;
	}

	// A line comment starts with ' (after spaces).
	const lead = /^\s*/.exec(text.slice(i));
	const first = i + (lead ? lead[0].length : 0);
	if (text[first] === '\'' && text[first + 1] !== '/') {
		tokens.push({ from: first, to: n, kind: 'comment' });
		return { tokens, state: { inBlockComment: false } };
	}
	// Preprocessor directive at the start: !include, !theme, !define, !if...
	if (text[first] === '!' && /[a-z]/i.test(text[first + 1] || '')) {
		const m = /^![a-z_]+/i.exec(text.slice(first));
		if (m) {
			tokens.push({ from: first, to: first + m[0].length, kind: 'preprocessor' });
			i = first + m[0].length;
		}
	}

	while (i < n) {
		const c = text[i];
		// Block comment /' ... '/
		if (c === '/' && text[i + 1] === '\'') {
			const end = text.indexOf('\'/', i + 2);
			if (end < 0) {
				tokens.push({ from: i, to: n, kind: 'comment' });
				return { tokens, state: { inBlockComment: true } };
			}
			tokens.push({ from: i, to: end + 2, kind: 'comment' });
			i = end + 2;
			continue;
		}
		if (c === '"') {
			const end = text.indexOf('"', i + 1);
			const to = end < 0 ? n : end + 1;
			tokens.push({ from: i, to, kind: 'string' });
			i = to;
			continue;
		}
		// A label or message: the rest of the line is not coloured.
		if (c === ':' && text[i + 1] !== ':' && text[i - 1] !== ':') break;
		if (c === '@' && (i === 0 || !isWordChar(text[i - 1]))) {
			const m = /^@(start|end)[a-z]+/i.exec(text.slice(i));
			if (m) {
				tokens.push({ from: i, to: i + m[0].length, kind: 'tag' });
				i += m[0].length;
				continue;
			}
		}
		if (c === '#' && (i === 0 || !isWordChar(text[i - 1]))) {
			const m = /^#([0-9A-Fa-f]{3,8}|[A-Za-z]+)\b/.exec(text.slice(i));
			if (m) {
				tokens.push({ from: i, to: i + m[0].length, kind: 'color' });
				i += m[0].length;
				continue;
			}
		}
		if (/[-.=~<*o#x+}^]/.test(c) && !(isWordChar(c) && isWordChar(text[i - 1]))) {
			ARROW_RE.lastIndex = i;
			const m = ARROW_RE.exec(text);
			if (m) {
				const body = (m[2] || '') + (m[4] || '');
				const hasHead = !!(m[1] || m[5]);
				// "--", "->", "<|--", "..>": an arrow needs a head or a body of two characters.
				const word = /^[ox]$/.test(m[1] || '') && isWordChar(text[i - 1]);
				if (!word && (hasHead || body.length >= 2) && m[0].length >= 2 && !(m[1] && /[ox]/.test(m[1]) && !body)) {
					tokens.push({ from: i, to: i + m[0].length, kind: 'arrow' });
					i += m[0].length;
					continue;
				}
			}
		}
		if (/[A-Za-z_]/.test(c) && !isWordChar(text[i - 1])) {
			// Names may contain hyphens (my-node); "A-->B" still ends the name at "--".
			const m = /^[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*/.exec(text.slice(i));
			if (m) {
				if (KEYWORDS.has(m[0].toLowerCase())) tokens.push({ from: i, to: i + m[0].length, kind: 'keyword' });
				i += m[0].length;
				continue;
			}
		}
		i++;
	}
	return { tokens, state: { inBlockComment } };
}

/** Tokens of several lines (the state is carried from line to line). */
export function tokenizeLines(lines: string[]): Token[][] {
	let state = INITIAL_STATE;
	return lines.map((line) => {
		const r = tokenizeLine(line, state);
		state = r.state;
		return r.tokens;
	});
}
