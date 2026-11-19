// SPDX-License-Identifier: MIT
// Rendering tests (design 16.1) and the network check in a browser (16.4 (2)).
// Needs the built plugin: run with `npm run test:render` (builds first).
import * as fs from 'fs';
import * as path from 'path';
import { Browser } from 'playwright-core';
import { countPatterns, FORBIDDEN_PATTERNS } from '../helpers/networkPatterns';
import { DIST, launchBrowser, PageRun, renderNote } from './renderPage';

interface DiagramCase {
	name: string;
	info?: string;
	source: string;
	/** Texts that must appear in the SVG. */
	texts: string[];
}

interface ErrorCase {
	name: string;
	source: string;
	line: number | null;
	message: RegExp;
}

// Representative diagrams of design 16.1. Without @startuml unless needed.
const DIAGRAMS: DiagramCase[] = [
	{ name: 'sequence', source: 'Alice -> Bob : hello\nBob --> Alice : hi', texts: ['Alice', 'Bob', 'hello', 'hi'] },
	{ name: 'class', source: 'class Customer {\n  +name : String\n}\nclass Order\nCustomer "1" --> "*" Order', texts: ['Customer', 'Order', 'name : String'] },
	{ name: 'use case', source: 'actor User\nUser --> (Log in)', texts: ['User', 'Log in'] },
	{ name: 'activity', source: 'start\n:Step one;\nif (ok?) then (yes)\n  :Done;\nendif\nstop', texts: ['Step one', 'Done'] },
	{ name: 'state', source: '[*] --> Idle\nIdle --> Running : start\nRunning --> [*]', texts: ['Idle', 'Running'] },
	{ name: 'component', source: '[Web] --> [API]\n[API] --> [Database]', texts: ['Web', 'API', 'Database'] },
	{ name: 'mind map', source: '@startmindmap\n* root\n** child one\n** child two\n@endmindmap', texts: ['root', 'child one', 'child two'] },
	{ name: 'gantt', source: "@startgantt\n[Design] lasts 5 days\n[Build] lasts 10 days\n[Build] starts at [Design]'s end\n@endgantt", texts: ['Design', 'Build'] },
	{ name: 'json', source: '@startjson\n{"name": "dg", "tags": ["a", "b"]}\n@endjson', texts: ['name', 'dg'] },
	{ name: 'CJK', source: '利用者 -> サーバー : 注文する\nサーバー --> 利用者 : 完成了 / 완료', texts: ['利用者', 'サーバー', '注文する', '완료'] },
	{ name: 'emoji (loaded on use)', source: 'Alice -> Bob : <:smile:>', texts: ['Alice', 'Bob'] },
	{ name: 'built-in theme', source: '!theme cerulean\nAlice -> Bob : themed', texts: ['Alice', 'themed'] },
	{ name: 'four backticks', info: 'plantuml', source: 'note over Alice\n  ```\n  inside\n  ```\nend note', texts: ['inside'] },
];

const ERRORS: ErrorCase[] = [
	{ name: 'syntax error', source: '@startuml\nAlice -> Bob\nthis is bad\n@enduml', line: 3, message: /Syntax Error/ },
	{ name: 'standard library', source: '!include <C4/C4_Container>\nA -> B', line: 1, message: /cannot include/ },
	{ name: 'local file', source: 'A -> B\n!include common.puml', line: 2, message: /cannot include|common\.puml/ },
	{ name: 'URL', source: '!includeurl https://example.com/x.puml\nA -> B', line: 1, message: /cannot include https:\/\/example\.com\/x\.puml/ },
];

function fence(source: string, info = 'plantuml'): string {
	const marker = source.includes('```') ? '````' : '```';
	return `${marker}${info}\n${source}\n${marker}`;
}

function expectNoNetwork(run: PageRun) {
	expect(run.blocked).toEqual([]);
	expect(run.cspViolations).toEqual([]);
	expect(run.pageErrors).toEqual([]);
}

let browser: Browser;

beforeAll(async () => {
	if (!fs.existsSync(path.join(DIST, 'viewer.js'))) throw new Error('dist/ is missing: run `npm run test:render` (it builds first).');
	browser = await launchBrowser();
});

afterAll(async () => {
	if (browser) await browser.close();
});

describe('rendering in a browser without network', () => {
	let run: PageRun;

	beforeAll(async () => {
		const note = [...DIAGRAMS.map((c) => fence(c.source, c.info)), ...ERRORS.map((c) => fence(c.source))].join('\n\ntext\n\n');
		run = await renderNote(browser, note);
	});

	test('no request leaves the page, no CSP violation, no page error', () => {
		expectNoNetwork(run);
		expect(run.blocks).toHaveLength(DIAGRAMS.length + ERRORS.length);
	});

	test('the engine files come from the plugin, emoji only when used', () => {
		expect(run.served).toEqual(expect.arrayContaining(['/viewer.js', '/plantuml.css', '/engine/themes.js', '/engine/plantuml.js', '/engine/emoji.js']));
		expect(run.served).not.toContain('/engine/openiconic.js');
	});

	test.each(DIAGRAMS.map((c, i) => [c.name, i] as const))('%s', (_name, i) => {
		const block = run.blocks[i];
		expect(block.state).toBe('done');
		expect(block.svg).toBe(true);
		for (const text of DIAGRAMS[i].texts) expect(block.texts).toContain(text);
		expect(block.errorTitle).toBe('');
	});

	test.each(ERRORS.map((c, i) => [c.name, i] as const))('error: %s', (_name, i) => {
		const block = run.blocks[DIAGRAMS.length + i];
		const c = ERRORS[i];
		expect(block.state).toBe('error');
		expect(block.svg).toBe(false);
		expect(block.errorTitle).toBe('PlantUML error');
		if (c.line !== null) expect(block.errorMessage).toMatch(new RegExp(`^Line ${c.line}: `));
		expect(block.errorMessage).toMatch(c.message);
	});
});

describe('theme', () => {
	const note = ['', ' theme=dark', ' theme=light', ' theme=none'].map((opt) => fence('Alice -> Bob : x', `plantuml${opt}`)).join('\n\n');
	const backdrop = (classes: string) => (classes.match(/joplin-plantuml-backdrop-(light|dark)/) || [null, null])[1];

	test('light page', async () => {
		const run = await renderNote(browser, note);
		expectNoNetwork(run);
		expect(run.blocks.map((b) => b.state)).toEqual(['done', 'done', 'done', 'done']);
		expect(run.blocks.map((b) => backdrop(b.classes))).toEqual([null, 'dark', null, null]);
		expect(run.blocks[0].svgMarkup).not.toBe(run.blocks[1].svgMarkup); // dark output differs
	});

	test('dark page: auto uses the dark output', async () => {
		const light = await renderNote(browser, note);
		const dark = await renderNote(browser, note, { bg: 'rgb(29, 32, 36)', fg: '#dddddd' });
		expectNoNetwork(dark);
		expect(dark.blocks.map((b) => backdrop(b.classes))).toEqual([null, null, 'light', 'light']);
		expect(dark.blocks[0].svgMarkup).toBe(light.blocks[1].svgMarkup); // auto on dark = theme=dark
		expect(dark.blocks[2].svgMarkup).toBe(light.blocks[0].svgMarkup); // theme=light = auto on light
	});
});

describe('the checks themselves', () => {
	// If these fail, the network checks above could pass without checking anything.
	test('a request to another site is reported by the CSP', async () => {
		const run = await renderNote(browser, `${fence('A -> B')}\n\n![x](https://example.com/x.png)\n`);
		expect(run.cspViolations).toEqual(['img-src https://example.com/x.png']);
	});

	test('a request outside the test files is blocked and recorded', async () => {
		const run = await renderNote(browser, `${fence('A -> B')}\n\n![x](/not-a-test-file.png)\n`);
		expect(run.blocked).toEqual(['http://render.test/not-a-test-file.png']);
	});
});

describe('built files (static check)', () => {
	test.each(['index.js', 'contentScript/markdownItPlugin.js', 'contentScript/viewer.js'])('%s has no network API', (file) => {
		const found = countPatterns(fs.readFileSync(path.join(DIST, '..', file), 'utf8'));
		for (const name of FORBIDDEN_PATTERNS) expect(found[name]).toBeUndefined();
	});
});
