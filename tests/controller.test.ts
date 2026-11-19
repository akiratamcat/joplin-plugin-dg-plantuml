/**
 * @jest-environment jsdom
 */
// SPDX-License-Identifier: MIT
import contentScript from '../src/contentScript/markdownItPlugin';
import MarkdownIt from 'markdown-it';
import { countDiagrams, isSimilarSource, ViewerController } from '../src/contentScript/controller';
import { RenderEngine, RenderOptions, RenderResult } from '../src/contentScript/engine';
import { DEFAULT_VIEWER_CONFIG, ViewerConfig } from '../src/contentScript/viewerConfig';

class FakeEngine implements RenderEngine {
	readonly name = 'fake';
	readonly version = 'test';
	calls: { source: string; opts: RenderOptions }[] = [];
	inits = 0;
	failInit = false;
	result: (source: string) => RenderResult = (source) => ({ ok: true, svg: `<svg data-src="${encodeURIComponent(source)}"><text>ok</text></svg>` });

	async init() {
		this.inits++;
		if (this.failInit) throw new Error('no engine');
	}

	async renderSvg(source: string, opts: RenderOptions) {
		this.calls.push({ source, opts });
		return this.result(source);
	}
}

/** Puts the Markdown-it output of `markdown` into the page, like Joplin does. */
function setNote(markdown: string) {
	const md = new MarkdownIt();
	contentScript(null).plugin(md, {});
	document.body.innerHTML = md.render(markdown);
}

function setup(config: Partial<ViewerConfig> = {}, dark = false, noteFont = 0) {
	const engine = new FakeEngine();
	const timers: { fn: () => void; ms: number }[] = [];
	const errors: unknown[][] = [];
	const controller = new ViewerController({
		doc: document,
		engine,
		config: { ...DEFAULT_VIEWER_CONFIG, ...config },
		sanitize: (svg) => svg.replace(/<script[\s\S]*?<\/script>/g, ''),
		isDark: () => dark,
		noteFontSize: () => noteFont,
		setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
		clearTimer: () => { timers.length = 0; },
		logError: (...args) => { errors.push(args); },
	});
	/** Runs the pending timer and waits for the rendering. */
	const flush = async () => {
		while (timers.length) {
			const t = timers.shift();
			if (t) t.fn();
			await new Promise((r) => setTimeout(r, 0));
		}
	};
	return { engine, controller, timers, errors, flush };
}

const outputs = () => Array.from(document.querySelectorAll('.joplin-plantuml-output'));

describe('ViewerController', () => {
	test('renders each block with the preamble and inserts the SVG', async () => {
		setNote('```plantuml\nA -> B\n```\n\ntext\n\n```puml\n@startuml\nC -> D\n@enduml\n```\n');
		const { engine, controller, timers, flush } = setup();
		controller.update();
		expect(timers[0].ms).toBe(0); // a new note: no delay
		expect(outputs()[0].textContent).toBe('Loading the PlantUML engine…');
		await flush();
		expect(engine.inits).toBe(1);
		expect(engine.calls.map((c) => c.source)).toEqual([
			'@startuml\n!pragma layout smetana\nskinparam backgroundColor transparent\nA -> B\n@enduml',
			'@startuml\n!pragma layout smetana\nskinparam backgroundColor transparent\nC -> D\n@enduml',
		]);
		expect(outputs().map((o) => o.querySelector('svg') !== null)).toEqual([true, true]);
		expect(outputs()[0].hasAttribute('aria-busy')).toBe(false);
		expect(controller.hasNewBlocks()).toBe(false);
	});

	test('the same diagram comes from the cache, without the engine', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		setNote('```plantuml\nA -> B\n```\n'); // Joplin replaces the HTML on every update
		controller.update();
		expect(outputs()[0].querySelector('svg')).not.toBeNull(); // shown at once
		await flush();
		expect(engine.calls).toHaveLength(1);
	});

	test('theme: auto follows the background, block options and fixed modes win', async () => {
		const cases: [Partial<ViewerConfig>, boolean, string, boolean, boolean][] = [
			// config, dark background, info, engine dark, transparent line
			[{}, false, 'plantuml', false, true],
			[{}, true, 'plantuml', true, true],
			[{}, true, 'plantuml theme=light', false, true],
			[{}, false, 'plantuml theme=dark', true, true],
			[{ themeMode: 'light' }, true, 'plantuml', false, true],
			[{}, true, 'plantuml theme=none', false, false],
		];
		for (const [config, dark, info, engineDark, transparent] of cases) {
			setNote(`\`\`\`${info}\nA -> B\n\`\`\`\n`);
			const { engine, controller, flush } = setup(config, dark);
			controller.update();
			await flush();
			expect(engine.calls[0].opts.dark).toBe(engineDark);
			expect(engine.calls[0].source.includes('backgroundColor transparent')).toBe(transparent);
			expect(engine.calls[0].source).toMatch(/!pragma layout smetana/);
		}
	});

	test('align option', () => {
		setNote('```plantuml align=left\nA\n```\n');
		const { controller } = setup();
		controller.update();
		expect(document.querySelector('.joplin-plantuml')?.classList.contains('joplin-plantuml-align-left')).toBe(true);
	});

	test('backdrop only when the diagram and the page differ in lightness', () => {
		const cases: [Partial<ViewerConfig>, boolean, string, string | null][] = [
			// config, dark page, info, backdrop
			[{}, false, 'plantuml', null],
			[{}, true, 'plantuml', null],
			[{}, false, 'plantuml theme=dark', 'dark'],
			[{}, true, 'plantuml theme=light', 'light'],
			[{}, true, 'plantuml theme=none', 'light'],
			[{}, false, 'plantuml theme=none', null],
			[{ themeMode: 'dark' }, false, 'plantuml', 'dark'],
		];
		for (const [config, dark, info, backdrop] of cases) {
			setNote(`\`\`\`${info}\nA -> B\n\`\`\`\n`);
			const { controller } = setup(config, dark);
			controller.update();
			const cls = document.querySelector('.joplin-plantuml')?.classList;
			expect([cls?.contains('joplin-plantuml-backdrop-light'), cls?.contains('joplin-plantuml-backdrop-dark')])
				.toEqual([backdrop === 'light', backdrop === 'dark']);
		}
	});

	test('while editing, the previous diagram stays (dimmed) and rendering waits', async () => {
		const { engine, controller, timers, flush } = setup();
		setNote('```plantuml\nAlice -> Bob : hello\n```\n');
		controller.update();
		await flush();
		setNote('```plantuml\nAlice -> Bob : hello!\n```\n');
		controller.update();
		expect(timers[0].ms).toBe(300);
		const stale = outputs()[0].querySelector('.joplin-plantuml-stale svg');
		expect(stale?.getAttribute('data-src')).toBe(encodeURIComponent(engine.calls[0].source));
		await flush();
		expect(engine.calls).toHaveLength(2);
		expect(outputs()[0].querySelector('.joplin-plantuml-stale')).toBeNull();
	});

	test('a different diagram at the same position (another note) does not show the old one', async () => {
		const { controller, timers, flush } = setup();
		setNote('```plantuml\nAlice -> Bob : hello\n```\n');
		controller.update();
		await flush();
		setNote('```plantuml\nclass Order\nclass Customer\nCustomer --> Order\n```\n');
		controller.update();
		expect(timers[0].ms).toBe(0);
		expect(outputs()[0].querySelector('.joplin-plantuml-stale')).toBeNull();
	});

	test('fast typing: only the latest source is rendered', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nAlice -> Bob : hi\n```\n');
		controller.update();
		await flush();
		for (const text of ['hi!', 'hi!!', 'hi!!!']) {
			setNote(`\`\`\`plantuml\nAlice -> Bob : ${text}\n\`\`\`\n`);
			controller.update();
		}
		await flush();
		expect(engine.calls.map((c) => c.source.split('\n')[3])).toEqual(['Alice -> Bob : hi', 'Alice -> Bob : hi!!!']);
	});

	test('syntax error: message, user line number and the line excerpt', async () => {
		const { engine, controller, flush } = setup();
		// engine: 1 @startuml, 2-3 preamble, 4 A -> B, 5 bad line
		engine.result = () => ({ ok: false, reason: 'syntax', message: 'Syntax Error?', line: 5 });
		setNote('```plantuml\n@startuml\nA -> B\nbad line\n@enduml\n```\n');
		controller.update();
		await flush();
		const box = document.querySelector('.joplin-plantuml-error');
		expect(box?.getAttribute('role')).toBe('alert');
		expect(box?.querySelector('.joplin-plantuml-error-message')?.textContent).toBe('Line 3: Syntax Error?');
		expect(box?.querySelector('.joplin-plantuml-error-excerpt')?.textContent).toBe('3bad line');
		expect(document.querySelector('.joplin-plantuml-output')?.getAttribute('data-plantuml-state')).toBe('error');
	});

	test('an error while editing keeps the previous diagram under the error box', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nAlice -> Bob : hello\n```\n');
		controller.update();
		await flush();
		engine.result = () => ({ ok: false, reason: 'syntax', message: 'Syntax Error?', line: 4 });
		setNote('```plantuml\nAlice -> Bob : hello\nx\n```\n');
		controller.update();
		await flush();
		const out = outputs()[0];
		expect(out.children[0].className).toBe('joplin-plantuml-error');
		expect(out.children[1].className).toBe('joplin-plantuml-stale');
	});

	test('error text from the engine is inserted as text, not HTML', async () => {
		const { engine, controller, flush } = setup();
		engine.result = () => ({ ok: false, reason: 'syntax', message: '<img src=x onerror=alert(1)>', line: 3 });
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		expect(document.querySelector('.joplin-plantuml-error img')).toBeNull();
	});

	test('timeout, crash, engine load failure', async () => {
		for (const [result, title] of [
			[{ ok: false, reason: 'timeout', message: 'too long' }, 'Rendering timed out.'],
			[{ ok: false, reason: 'crash', message: 'RootCause x' }, 'The PlantUML engine crashed.'],
		] as [RenderResult, string][]) {
			const { engine, controller, flush } = setup();
			engine.result = () => result;
			setNote('```plantuml\nA -> B\n```\n');
			controller.update();
			await flush();
			expect(document.querySelector('.joplin-plantuml-error-title')?.textContent).toBe(title);
		}
		const { engine, controller, flush, errors } = setup();
		engine.failInit = true;
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		expect(document.querySelector('.joplin-plantuml-error-title')?.textContent).toBe('Could not load the PlantUML engine.');
		expect(engine.calls).toHaveLength(0);
		expect(errors).toHaveLength(1);
	});

	test('a source longer than the limit is not rendered', async () => {
		const { engine, controller, flush } = setup({ maxSourceLength: 10 });
		setNote('```plantuml\nAlice -> Bob : hello\n```\n');
		controller.update();
		await flush();
		expect(engine.calls).toHaveLength(0);
		expect(document.querySelector('.joplin-plantuml-error-title')?.textContent).toBe('The diagram is too large.');
	});

	test('several diagrams in one block: a note is shown', async () => {
		const { controller, flush } = setup();
		setNote('```plantuml\n@startuml\nA -> B\n@enduml\n@startuml\nC -> D\n@enduml\n```\n');
		controller.update();
		await flush();
		expect(document.querySelector('.joplin-plantuml-note')?.textContent).toBe('Only the first diagram in this block is shown.');
	});

	test('Rich Text edit dialog: the block element stays, its inner HTML is replaced', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		const block = document.querySelector('.joplin-plantuml') as HTMLElement;
		// Joplin's useEditDialog: editable.innerHTML = editableInnerHtml(result.html)
		const md = new MarkdownIt();
		contentScript(null).plugin(md, {});
		const fresh = document.createElement('div');
		fresh.innerHTML = md.render('```plantuml\nA -> B\n```\n');
		block.innerHTML = (fresh.firstElementChild as HTMLElement).innerHTML;
		expect(controller.hasNewBlocks()).toBe(true);
		controller.update();
		await flush();
		expect(block.querySelector('.joplin-plantuml-output > svg')).not.toBeNull();
		expect(block.querySelector('.joplin-plantuml-status')).toBeNull();
		expect(engine.calls).toHaveLength(1); // unchanged source: from the cache
	});

	test('blocks removed before rendering are skipped', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		document.body.innerHTML = '';
		await flush();
		expect(engine.calls).toHaveLength(0);
	});

	test('new settings: the blocks are drawn again with them', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		controller.setConfig({ ...DEFAULT_VIEWER_CONFIG, transparentBackground: false, settingsVersion: 'v2' });
		expect(controller.settingsVersion).toBe('v2');
		// The previous diagram stays while the block renders again.
		expect(outputs()[0].querySelector('.joplin-plantuml-stale svg')).not.toBeNull();
		await flush();
		expect(engine.calls).toHaveLength(2);
		expect(engine.calls[1].source).not.toMatch(/backgroundColor transparent/);
		expect(outputs()[0].querySelector(':scope > svg')).not.toBeNull();
	});

	test('the same settings again: nothing is drawn again', async () => {
		const { engine, controller, flush } = setup();
		setNote('```plantuml\nA -> B\n```\n');
		controller.update();
		await flush();
		controller.setConfig({ ...DEFAULT_VIEWER_CONFIG });
		await flush();
		expect(engine.calls).toHaveLength(1);
	});
});

describe('font size (design 8.7)', () => {
	test('the note font size becomes the base font size of the diagram', async () => {
		setNote('```plantuml\nA -> B\n```\n');
		const { engine, controller, flush } = setup({}, false, 15);
		controller.update();
		await flush();
		expect(engine.calls[0].source).toMatch(/^skinparam defaultFontSize 15$/m);
	});

	test('not when the setting is off, or the size is unknown', async () => {
		for (const [config, font] of [[{ matchNoteFontSize: false }, 15], [{}, 0]] as const) {
			setNote('```plantuml\nA -> B\n```\n');
			const { engine, controller, flush } = setup(config, false, font);
			controller.update();
			await flush();
			expect(engine.calls[0].source).not.toMatch(/defaultFontSize/);
		}
	});
});

describe('helpers', () => {
	test('isSimilarSource', () => {
		expect(isSimilarSource('Alice -> Bob : hi', 'Alice -> Bob : hi!')).toBe(true);
		expect(isSimilarSource('Alice -> Bob', 'class Order\nclass Customer')).toBe(false);
		expect(isSimilarSource('', '')).toBe(true);
	});

	test('countDiagrams', () => {
		expect(countDiagrams('A -> B')).toBe(0);
		expect(countDiagrams('@startuml\nA\n@enduml\n @startmindmap\n* a\n@endmindmap')).toBe(2);
	});
});
