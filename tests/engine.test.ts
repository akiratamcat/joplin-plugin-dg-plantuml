// SPDX-License-Identifier: MIT
// The real engine is exercised by the rendering tests in a browser. These
// tests check the loading order, the loaders and the result handling with a
// fake engine module.
import * as fs from 'fs';
import * as path from 'path';
import { classifySvg, ENGINE_VERSION, PlantUmlEngine, RESET_LINES } from '../src/contentScript/engine';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', 'engine', name), 'utf8');

type Render = (lines: string[], ok: (svg: string) => void, err: (m: unknown) => void, opts?: { dark?: boolean }) => void;

function setup(render: Render = (_l, ok) => ok('<svg><text>A</text></svg>')) {
	const win: Record<string, unknown> = {};
	const loaded: string[] = [];
	const engine = new PlantUmlEngine({
		baseUrl: 'file:///plugin/engine/',
		win: win as unknown as Window,
		loadScript: async (url) => { loaded.push(url); },
		importModule: async (url) => { loaded.push(url); return { renderToString: render }; },
	});
	return { engine, win, loaded };
}

describe('PlantUmlEngine', () => {
	test('loads themes.js before the engine, once', async () => {
		const { engine, loaded } = setup();
		await Promise.all([engine.init(), engine.init()]);
		expect(loaded).toEqual(['file:///plugin/engine/themes.js', 'file:///plugin/engine/plantuml.js']);
		expect(engine.version).toBe(ENGINE_VERSION);
	});

	test('the standard library loader gives only the bundled emoji and icon files', async () => {
		const { engine, win, loaded } = setup();
		await engine.init();
		const loader = win.PLANTUML_STDLIB_LOADER as (url: string, ok: () => void, err: (m: string) => void) => boolean;

		const okEmoji = jest.fn();
		loader('emoji.js', okEmoji, jest.fn());
		await new Promise((r) => setTimeout(r, 0));
		expect(okEmoji).toHaveBeenCalled();
		expect(loaded).toContain('file:///plugin/engine/emoji.js');

		const err = jest.fn();
		loader('C4/C4_Container.puml', jest.fn(), err);
		loader('https://example.com/x.puml', jest.fn(), err);
		loader('../plantuml.js', jest.fn(), err);
		expect(err).toHaveBeenCalledTimes(3);
		expect(loaded).toHaveLength(3); // themes.js, plantuml.js, emoji.js
	});

	test('the file loader always fails', async () => {
		const { engine, win } = setup();
		await engine.init();
		const ok = jest.fn();
		const err = jest.fn();
		(win.PLANTUML_FILE_LOADER as (p: string, f: string, ok: () => void, err: (m: string) => void) => void)('/etc/passwd', '', ok, err);
		expect(ok).not.toHaveBeenCalled();
		expect(err).toHaveBeenCalled();
	});

	test('resets the engine state, then passes the lines and the dark option', async () => {
		const render = jest.fn<void, Parameters<Render>>((_l, ok) => ok('<svg/>'));
		const { engine } = setup(render);
		await engine.init();
		await engine.renderSvg('@startuml\r\nA -> B\n@enduml', { timeoutMs: 1000, dark: true });
		expect(render.mock.calls).toHaveLength(2);
		expect(render.mock.calls[0][0]).toEqual(RESET_LINES);
		expect(render.mock.calls[1][0]).toEqual(['@startuml', 'A -> B', '@enduml']);
		expect(render.mock.calls[1][3]).toEqual({ dark: true });
	});

	test('a failing reset does not change the result', async () => {
		const render: Render = (lines, ok) => {
			if (lines === RESET_LINES) throw new Error('reset failed');
			ok('<svg><text>A</text></svg>');
		};
		const { engine } = setup(render);
		await engine.init();
		expect(await engine.renderSvg('A', { timeoutMs: 1000, dark: false })).toEqual({ ok: true, svg: '<svg><text>A</text></svg>' });
	});

	test('error image, onError, exception and timeout', async () => {
		const svg = fixture('16-syntax-error.svg');
		const cases: [Render, object][] = [
			[(_l, ok) => ok(svg), { ok: false, reason: 'syntax', line: 3 }],
			[(_l, _ok, err) => err('bad'), { ok: false, reason: 'engine', message: 'bad' }],
			[() => { throw new Error('boom'); }, { ok: false, reason: 'crash', message: 'boom' }],
			[() => undefined, { ok: false, reason: 'timeout' }],
		];
		for (const [render, expected] of cases) {
			const { engine } = setup(render);
			await engine.init();
			expect(await engine.renderSvg('A', { timeoutMs: 20, dark: false })).toMatchObject(expected);
		}
	});

	test('not initialised', async () => {
		const { engine } = setup();
		expect(await engine.renderSvg('A', { timeoutMs: 20, dark: false })).toMatchObject({ ok: false, reason: 'engine' });
	});

	test('a module without renderToString fails to load', async () => {
		const engine = new PlantUmlEngine({
			baseUrl: '',
			win: {} as Window,
			loadScript: async () => undefined,
			importModule: async () => ({}),
		});
		await expect(engine.init()).rejects.toThrow(/renderToString/);
	});
});

describe('classifySvg', () => {
	test('normal diagram, error, crash', () => {
		expect(classifySvg(fixture('01-sequence.svg')).ok).toBe(true);
		expect(classifySvg(fixture('13-stdlib-c4.svg'))).toEqual({ ok: false, reason: 'syntax', line: 2, message: 'cannot include <C4/C4_Container>' });
		expect(classifySvg(fixture('02-class-graphviz-crash.svg'))).toMatchObject({ ok: false, reason: 'crash' });
	});
});
