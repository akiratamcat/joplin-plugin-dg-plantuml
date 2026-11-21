// SPDX-License-Identifier: MIT
// Rendering tests (design 16.1) and the network check in a browser (16.4 (2)).
// Needs the built plugin: run with `npm run test:render` (builds first).
import * as fs from 'fs';
import * as path from 'path';
import { Browser } from 'playwright-core';
import { countPatterns, FORBIDDEN_PATTERNS } from '../helpers/networkPatterns';
import { buildViewerConfig, KEYS } from '../../src/settings';
import { Catalog } from '../../src/i18n/gettext';
import catalogs from '../../src/i18n/catalog/catalogs.json';
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
	// Right after class-like diagrams: the engine used to take it for a class diagram (RESET_LINES in engine.ts).
	{
		name: 'sequence after class-like diagrams',
		source: Array.from({ length: 20 }, (_, i) => `P${i % 10} -> P${(i + 3) % 10} : message ${i}`).join('\n'),
		texts: ['message 0', 'message 19'],
	},
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

	test('each diagram renders the same alone as after the others (no engine state leaks)', async () => {
		for (const [i, c] of DIAGRAMS.entries()) {
			const alone = await renderNote(browser, fence(c.source, c.info));
			expect([c.name, alone.blocks[0].svgMarkup]).toEqual([c.name, run.blocks[i].svgMarkup]);
		}
	});

	test('the sequence diagram after class-like diagrams is a sequence diagram', () => {
		const block = run.blocks[DIAGRAMS.findIndex((c) => c.name === 'sequence after class-like diagrams')];
		const viewBox = (block.svgMarkup.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/) || []).slice(1).map(Number);
		expect(viewBox[1]).toBeGreaterThan(viewBox[0]); // 20 messages: taller than wide
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
		const dark = await renderNote(browser, note, { colors: { bg: 'rgb(29, 32, 36)', fg: '#dddddd' } });
		expectNoNetwork(dark);
		expect(dark.blocks.map((b) => backdrop(b.classes))).toEqual([null, null, 'light', 'light']);
		expect(dark.blocks[0].svgMarkup).toBe(light.blocks[1].svgMarkup); // auto on dark = theme=dark
		expect(dark.blocks[2].svgMarkup).toBe(light.blocks[0].svgMarkup); // theme=light = auto on light
	});
});

describe('settings from the main script (getConfig)', () => {
	const note = fence('Alice -> Bob : x');

	test('the viewer uses the settings it gets', async () => {
		const defaults = await renderNote(browser, note);
		const darkTheme = await renderNote(browser, `${fence('Alice -> Bob : x', 'plantuml theme=dark')}`);
		const config = buildViewerConfig({ [KEYS.themeMode]: 'dark', [KEYS.lightPreset]: 'plantuml-default', [KEYS.darkPreset]: 'plantuml-dark' });
		const run = await renderNote(browser, note, { config });
		expectNoNetwork(run);
		// themeMode=dark on a light page: the dark output, with a backdrop.
		expect(run.blocks[0].svgMarkup).toBe(darkTheme.blocks[0].svgMarkup);
		expect(run.blocks[0].svgMarkup).not.toBe(defaults.blocks[0].svgMarkup);
		expect(run.blocks[0].classes).toContain('joplin-plantuml-backdrop-dark');
		expect(run.settingsVersion).toBe(config.settingsVersion);
		expect(run.messages).toContainEqual({ id: 'dgPlantumlMarkdownIt', message: { type: 'getConfig' } });
		expect(run.console.filter((m) => /could not get the settings/.test(m))).toEqual([]);
	});

	test('a custom preamble is used', async () => {
		const config = buildViewerConfig({ [KEYS.lightPreset]: 'custom', [KEYS.lightCustomPreamble]: 'skinparam ParticipantBackgroundColor #FF0000' });
		const run = await renderNote(browser, note, { config });
		expect(run.blocks[0].svgMarkup).toMatch(/fill="#FF0000"/i);
	});

	test('preset joplin-light: Joplin colours, meaningful colours kept', async () => {
		const config = buildViewerConfig({ [KEYS.lightPreset]: 'joplin-light' });
		const activity = fence('start\n:Step;\nstop');
		const cls = fence('class Customer\ninterface Payable');
		const run = await renderNote(browser, `${note}\n\n${activity}\n\n${cls}`, { config });
		expectNoNetwork(run);
		expect(run.blocks.map((b) => b.state)).toEqual(['done', 'done', 'done']);
		expect(run.blocks[0].svgMarkup).toMatch(/fill="#32373F"/); // text colour
		expect(run.blocks[0].svgMarkup).toMatch(/fill="#F4F5F6"/); // participants
		expect(run.blocks[1].svgMarkup).toMatch(/fill="#222222"/); // start node stays filled
		expect(run.blocks[2].svgMarkup).toMatch(/fill="#ADD1B2"/); // class icon colour
	});

	test('"transparent background" wins over a background in the preset', async () => {
		const custom = { [KEYS.lightPreset]: 'custom', [KEYS.lightCustomPreamble]: 'skinparam backgroundColor #FFAAAA' };
		const on = await renderNote(browser, note, { config: buildViewerConfig({ ...custom, [KEYS.transparentBackground]: true }) });
		const off = await renderNote(browser, note, { config: buildViewerConfig({ ...custom, [KEYS.transparentBackground]: false }) });
		// The viewer writes the size into the style, so the browser may write the colour as rgb().
		const pink = /#FFAAAA|rgb\(255, 170, 170\)/i;
		expect(on.blocks[0].svgMarkup).not.toMatch(pink);
		expect(off.blocks[0].svgMarkup).toMatch(pink);
	});

	test('built-in theme (builtin:<name>) for the light and the dark theme', async () => {
		const defaults = await renderNote(browser, note);
		for (const [key, colors] of [[KEYS.lightPreset, undefined], [KEYS.darkPreset, { bg: 'rgb(29, 32, 36)', fg: '#dddddd' }]] as const) {
			const run = await renderNote(browser, note, { config: buildViewerConfig({ [key]: 'builtin:cerulean' }), colors });
			expectNoNetwork(run);
			expect(run.blocks[0].state).toBe('done');
			expect(run.blocks[0].svgMarkup).not.toBe(defaults.blocks[0].svgMarkup);
		}
	});

	test('messages in the language sent by the main script (design 10.4)', async () => {
		const ja = (catalogs as Record<string, Catalog>).ja;
		const run = await renderNote(browser, fence('@startuml\nAlice -> Bob\nthis is bad\n@enduml'), { config: buildViewerConfig({}, { locale: 'ja', catalog: ja }) });
		expect(run.blocks[0].errorTitle).toBe(ja['PlantUML error'][0]);
		expect(run.blocks[0].errorMessage).toMatch(/^3 行目: Syntax Error/);
	});

	test('a broken answer falls back to the defaults', async () => {
		const defaults = await renderNote(browser, note);
		const run = await renderNote(browser, note, { config: { themeMode: 42, presets: 'x' } });
		expectNoNetwork(run);
		expect(run.blocks[0].state).toBe('done');
		expect(run.blocks[0].svgMarkup).toBe(defaults.blocks[0].svgMarkup);
	});
});

describe('font size (design 8.7)', () => {
	// 24 participants: much wider than the pane.
	const wide = fence(Array.from({ length: 24 }, (_, i) => `Participant${i} -> Participant${i + 1} : message ${i}`).join('\n'));
	const narrow = fence('Alice -> Bob : hi');
	const smallestFont = (svgMarkup: string) => Math.min(...(svgMarkup.match(/font-size="([\d.]+)"/g) || []).map((m) => parseFloat(m.slice(11))));

	test('the base font size follows the note text', async () => {
		const run = await renderNote(browser, narrow, { bodyFontSize: '20px' });
		expect(run.blocks[0].svgMarkup).toMatch(/font-size="20"/);
		const off = await renderNote(browser, narrow, { bodyFontSize: '20px', config: buildViewerConfig({ [KEYS.matchNoteFontSize]: false }) });
		expect(off.blocks[0].svgMarkup).not.toMatch(/font-size="20"/);
	});

	test('other diagram types follow the note text too (design 8.5, table of diagram types)', async () => {
		const sources = [
			'@startmindmap\n* root\n** child\n@endmindmap',
			'@startjson\n{"name": "dg"}\n@endjson',
			"@startgantt\n[Design] lasts 5 days\n@endgantt",
			'@startwbs\n* Project\n** Design\n@endwbs',
		];
		const run = await renderNote(browser, sources.map((s) => fence(s)).join('\n\n'), { bodyFontSize: '20px' });
		expectNoNetwork(run);
		for (const b of run.blocks) {
			expect(b.state).toBe('done');
			expect(b.svgMarkup).toMatch(/font-size="20"/);
		}
	});

	test('error line numbers in other diagram types with a preamble', async () => {
		const run = await renderNote(browser, [
			fence('@startmindmap\n* root\nnot a node\n@endmindmap'),
			// (Broken JSON is not an error for the engine: it draws "Your data does not sound like JSON data".)
			fence('@startwbs\n* Project\nnot a node\n@endwbs'),
		].join('\n\n'), { bodyFontSize: '20px' });
		expect(run.blocks.map((b) => b.state)).toEqual(['error', 'error']);
		expect(run.blocks[0].errorMessage).toMatch(/^Line 3: /);
		expect(run.blocks[1].errorMessage).toMatch(/^Line 3: /);
	});

	test('a narrow diagram keeps its natural size', async () => {
		const run = await renderNote(browser, narrow);
		expect(run.blocks[0].scale).toBe(1);
		expect(run.blocks[0].scrolls).toBe(false);
	});

	test('a wide diagram is scaled down, but its text stays at least at the minimum size and it scrolls', async () => {
		const run = await renderNote(browser, wide, { width: 600 });
		expectNoNetwork(run);
		const b = run.blocks[0];
		const scale = b.scale as number;
		expect(scale).toBeLessThan(1);
		expect(smallestFont(b.svgMarkup) * scale).toBeGreaterThanOrEqual(11 - 0.05);
		expect(b.svgWidth as number).toBeGreaterThan(b.outputWidth);
		expect(b.scrolls).toBe(true);
	});

	test('minimum 0: the wide diagram fits the pane', async () => {
		const run = await renderNote(browser, wide, { width: 600, config: buildViewerConfig({ [KEYS.minFontSizePx]: 0 }) });
		const b = run.blocks[0];
		expect(Math.abs((b.svgWidth as number) - b.outputWidth)).toBeLessThanOrEqual(1);
		expect(b.scrolls).toBe(false);
	});

	test('when the pane gets narrower, the diagram is fitted again', async () => {
		const config = buildViewerConfig({ [KEYS.minFontSizePx]: 0 });
		const run = await renderNote(browser, wide, { width: 900, resizeTo: 500, config });
		const b = run.blocks[0];
		expect(b.outputWidth).toBeLessThan(500);
		expect(Math.abs((b.svgWidth as number) - b.outputWidth)).toBeLessThanOrEqual(1);
	});
});

describe('toolbar and links (design 11)', () => {
	type Posted = { id: string; message: { type: string; [k: string]: unknown } };
	const config = buildViewerConfig({});

	test('copy PNG sends a real PNG made with a canvas; the dark style gets a dark background', async () => {
		let png = '';
		const run = await renderNote(browser, fence('Alice -> Bob : hi', 'plantuml theme=dark'), {
			config,
			afterRender: async (page) => {
				await page.hover('.joplin-plantuml');
				await page.click('.joplin-plantuml-tool-copy-png');
				await page.waitForFunction(() => ((window as unknown as { __messages: Posted[] }).__messages || []).some((m) => m.message.type === 'copyImage'), undefined, { timeout: 10000 });
				png = await page.evaluate(() => String(((window as unknown as { __messages: Posted[] }).__messages.find((m) => m.message.type === 'copyImage') as Posted).message.dataUrl));
				// Colour of the top-left pixel of the PNG.
				const pixel = await page.evaluate((url) => new Promise<number[]>((resolve) => {
					const img = new Image();
					img.onload = () => {
						const c = document.createElement('canvas');
						c.width = img.width;
						c.height = img.height;
						const ctx = c.getContext('2d') as CanvasRenderingContext2D;
						ctx.drawImage(img, 0, 0);
						resolve(Array.from(ctx.getImageData(0, 0, 1, 1).data));
					};
					img.src = url;
				}), png);
				expect(pixel).toEqual([0x18, 0x18, 0x18, 255]);
			},
		});
		expectNoNetwork(run);
		expect(png).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
	});

	test('the other buttons send the SVG, the source and the position', async () => {
		const run = await renderNote(browser, `${fence('X')}\n\n${fence('Alice -> Bob : hi')}`, {
			config,
			afterRender: async (page) => {
				const second = (await page.$$('.joplin-plantuml'))[1];
				await second.hover();
				for (const name of ['copy-svg', 'save-svg', 'copy-source']) await (await second.$(`.joplin-plantuml-tool-${name}`))?.click();
			},
		});
		const actions = (run.messages as Posted[]).filter((m) => m.message.type !== 'getConfig').map((m) => m.message);
		expect(actions.map((m) => [m.type, m.what || m.kind, m.index])).toEqual([['copyText', 'svg', undefined], ['saveFile', 'svg', 2], ['copyText', 'source', undefined]]);
		expect(String(actions[0].text)).toMatch(/^<svg[\s>]/);
		expect(actions[2].text).toBe('Alice -> Bob : hi');
	});

	test('a link in a diagram is handed to the main script; the page does not navigate', async () => {
		const run = await renderNote(browser, fence('Alice -> Bob : [[:/0123456789abcdef0123456789abcdef note]]'), {
			config,
			afterRender: async (page) => {
				await page.click('.joplin-plantuml-output svg a');
				await page.waitForTimeout(300);
			},
		});
		expect(run.url).toBe('http://render.test/');
		const links = (run.messages as Posted[]).filter((m) => m.message.type === 'openLink').map((m) => m.message.href);
		expect(links).toEqual([':/0123456789abcdef0123456789abcdef']);
	});

	test('a tap on the diagram shows the toolbar; the toolbar is hidden otherwise', async () => {
		let before = '';
		let after = '';
		await renderNote(browser, fence('Alice -> Bob'), {
			config,
			afterRender: async (page) => {
				const opacity = () => page.$eval('.joplin-plantuml-toolbar', (el) => getComputedStyle(el).opacity);
				await page.mouse.move(0, 0);
				await page.waitForTimeout(250);
				before = await opacity();
				await page.click('.joplin-plantuml-output svg', { position: { x: 5, y: 5 } });
				await page.mouse.move(0, 0);
				await page.waitForTimeout(250);
				after = await opacity();
			},
		});
		expect(before).toBe('0');
		expect(after).toBe('1');
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
	test('every license comment kept in the built viewer is in THIRD_PARTY_NOTICES.md (design 20.4)', () => {
		const kept = fs.readFileSync(path.join(DIST, 'viewer.js.LICENSE.txt'), 'utf8');
		const notices = fs.readFileSync(path.join(DIST, '..', 'THIRD_PARTY_NOTICES.md'), 'utf8');
		const names = (kept.match(/\/\*!\s*(?:@license\s+)?([A-Za-z][\w.-]*)/g) || []).map((m) => m.replace(/\/\*!\s*(@license\s+)?/, ''));
		expect(names).toEqual(['DOMPurify', 'regenerator-runtime']);
		for (const name of names) expect(notices).toContain(`## ${name}`);
	});

	test.each(['LICENSE', 'THIRD_PARTY_NOTICES.md', 'contentScript/engine/LICENSE'])('the package includes %s', (file) => {
		const built = fs.readFileSync(path.join(DIST, '..', file), 'utf8');
		const source = fs.readFileSync(path.join(DIST, '..', '..', file === 'contentScript/engine/LICENSE' ? 'vendor/plantuml/LICENSE' : file), 'utf8');
		expect(built).toBe(source);
	});

	test.each(['index.js', 'contentScript/markdownItPlugin.js', 'contentScript/viewer.js'])('%s has no network API', (file) => {
		const found = countPatterns(fs.readFileSync(path.join(DIST, '..', file), 'utf8'));
		for (const name of FORBIDDEN_PATTERNS) expect(found[name]).toBeUndefined();
	});
});
