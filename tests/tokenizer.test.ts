// SPDX-License-Identifier: MIT
import { tokenizeLine, tokenizeLines } from '../src/shared/tokenizer';

/** "kind:text" of each token. */
function kinds(line: string, inBlockComment = false): string[] {
	return tokenizeLine(line, { inBlockComment }).tokens.map((t) => `${t.kind}:${line.slice(t.from, t.to)}`);
}

describe('tokenizeLine (design 7.7)', () => {
	test('start and end tags', () => {
		expect(kinds('@startuml')).toEqual(['tag:@startuml']);
		expect(kinds('@endmindmap')).toEqual(['tag:@endmindmap']);
	});

	test('keywords, any case, whole words only', () => {
		expect(kinds('participant Alice as A')).toEqual(['keyword:participant', 'keyword:as']);
		expect(kinds('Class Foo')).toEqual(['keyword:Class']);
		expect(kinds('participants classic')).toEqual([]);
	});

	test('preprocessor directives', () => {
		expect(kinds('!theme cyborg')).toEqual(['preprocessor:!theme']);
		expect(kinds('  !include <C4/C4_Container>')).toEqual(['preprocessor:!include']);
		expect(kinds('!define X 1')).toEqual(['preprocessor:!define']);
	});

	test('line and block comments', () => {
		expect(kinds("' a comment")).toEqual(["comment:' a comment"]);
		expect(kinds("  ' indented")).toEqual(["comment:' indented"]);
		expect(kinds("A -> B /' note '/ C")).toEqual(['arrow:->', "comment:/' note '/"]);
	});

	test('block comments over several lines', () => {
		const tokens = tokenizeLines(["start /' begin", 'middle line', "end '/ stop"]);
		expect(tokens.map((line) => line.map((t) => t.kind))).toEqual([['keyword', 'comment'], ['comment'], ['comment', 'keyword']]);
	});

	test('strings', () => {
		expect(kinds('participant "Web server" as W')).toEqual(['keyword:participant', 'string:"Web server"', 'keyword:as']);
	});

	test.each([
		['A -> B', '->'],
		['A --> B', '-->'],
		['A <|-- B', '<|--'],
		['A ..> B', '..>'],
		['A *-- B', '*--'],
		['A o-- B', 'o--'],
		['A -[#red]-> B', '-[#red]->'],
		['A <-> B', '<->'],
		['A -- B', '--'],
	])('arrow in %s', (line, arrow) => {
		expect(kinds(line)).toContain(`arrow:${arrow}`);
	});

	test('a hyphen inside a word is not an arrow', () => {
		expect(kinds('node my-node')).toEqual(['keyword:node']);
	});

	test('colours', () => {
		expect(kinds('skinparam ArrowColor #FF0000')).toEqual(['keyword:skinparam', 'color:#FF0000']);
		expect(kinds('class Foo #LightBlue')).toEqual(['keyword:class', 'color:#LightBlue']);
	});

	test('the label after ":" is not coloured', () => {
		expect(kinds('Alice -> Bob : class note #red -> end')).toEqual(['arrow:->']);
		expect(kinds('note right of A : as if')).toEqual(['keyword:note', 'keyword:right', 'keyword:of']);
	});

	test('empty line and plain text', () => {
		expect(kinds('')).toEqual([]);
		expect(kinds('Alice')).toEqual([]);
	});

	test('tokens are sorted and do not overlap', () => {
		for (const line of ['participant "A -> B" as X #red', "@startuml /' x '/ !theme", 'A -[#blue]-> B : hi']) {
			const { tokens } = tokenizeLine(line);
			for (let i = 1; i < tokens.length; i++) expect(tokens[i].from).toBeGreaterThanOrEqual(tokens[i - 1].to);
		}
	});
});

describe('names and arrows without spaces', () => {
	test('A-->B and A->B', () => {
		expect(kinds('A-->B')).toEqual(['arrow:-->']);
		expect(kinds('A->B')).toEqual(['arrow:->']);
	});
});
