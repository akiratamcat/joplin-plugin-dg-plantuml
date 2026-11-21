// SPDX-License-Identifier: MIT
import { ActionDeps, ActionState, decodePngDataUrl, handleAction, isAllowedLink, safeFileName } from '../src/actions';
import { ENGLISH } from '../src/i18n/gettext';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

function setup(existing: string[] = [], folder: string | null = 'C:\\diagrams') {
	const log: string[] = [];
	const files: Record<string, string | Uint8Array> = {};
	const toasts: [string, string][] = [];
	const deps: ActionDeps = {
		t: ENGLISH,
		writeText: async (text) => { log.push(`text:${text}`); },
		writeImage: async (dataUrl) => { log.push(`image:${dataUrl.slice(0, 22)}`); },
		chooseFolder: async (defaultPath) => { log.push(`folder:${defaultPath || ''}`); return folder; },
		exists: async (path) => existing.includes(path) || path in files,
		writeFile: async (path, data) => { files[path] = data; },
		joinPath: (f, n) => `${f}\\${n}`,
		noteTitle: async () => 'My: note?',
		openItem: async (href) => { log.push(`open:${href}`); },
		toast: async (message, kind) => { toasts.push([kind, message]); },
	};
	return { deps, log, files, toasts, state: {} as ActionState };
}

describe('isAllowedLink', () => {
	test.each([
		[':/0123456789abcdef0123456789abcdef', true],
		[':/0123456789abcdef0123456789abcdef#section', true],
		['https://example.com/a?b=c', true],
		['http://example.com/', true],
		['mailto:someone@example.com', true],
		[':/short', false],
		['file:///C:/Windows/system32/calc.exe', false],
		['javascript:alert(1)', false],
		['joplin://x', false],
		['', false],
	])('%s -> %s', (href, ok) => {
		expect(isAllowedLink(href)).toBe(ok);
	});
});

describe('safeFileName', () => {
	test('forbidden characters are replaced', () => {
		expect(safeFileName('My: note?')).toBe('My_ note_');
		expect(safeFileName('a/b\\c<d>e|f"g*h')).toBe('a_b_c_d_e_f_g_h');
	});

	test('empty, dots only and device names fall back to "plantuml"', () => {
		expect(safeFileName('')).toBe('plantuml');
		expect(safeFileName(' ... ')).toBe('plantuml');
		expect(safeFileName('CON')).toBe('plantuml');
	});

	test('long titles are cut', () => {
		expect(safeFileName('x'.repeat(200))).toHaveLength(80);
	});
});

describe('decodePngDataUrl', () => {
	test('PNG data URLs only', () => {
		expect(Array.from(decodePngDataUrl(PNG) || [])).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(decodePngDataUrl('data:image/svg+xml;base64,AAAA')).toBeNull();
		expect(decodePngDataUrl('data:image/png;base64,<script>')).toBeNull();
	});
});

describe('handleAction', () => {
	test('copy text and image', async () => {
		const { deps, log, toasts, state } = setup();
		expect(await handleAction({ type: 'copyText', text: '<svg/>', what: 'svg' }, deps, state)).toEqual({ ok: true });
		expect(await handleAction({ type: 'copyText', text: 'A -> B', what: 'source' }, deps, state)).toEqual({ ok: true });
		expect(await handleAction({ type: 'copyImage', dataUrl: PNG }, deps, state)).toEqual({ ok: true });
		expect(log).toEqual(['text:<svg/>', 'text:A -> B', 'image:data:image/png;base64,']);
		expect(toasts.map((x) => x[1])).toEqual(['Copied the SVG.', 'Copied the PlantUML source.', 'Copied the image (PNG).']);
	});

	test('a copy that fails shows an error toast', async () => {
		const { deps, toasts, state } = setup();
		deps.writeText = async () => { throw new Error('no clipboard'); };
		expect(await handleAction({ type: 'copyText', text: 'x', what: 'svg' }, deps, state)).toEqual({ ok: false, error: 'no clipboard' });
		expect(toasts).toEqual([['error', 'Could not copy: no clipboard']]);
	});

	test('bad image data is refused without touching the clipboard', async () => {
		const { deps, log, state } = setup();
		expect(await handleAction({ type: 'copyImage', dataUrl: 'data:text/html,<b>' }, deps, state)).toMatchObject({ ok: false });
		expect(log).toEqual([]);
	});

	test('save SVG: file name from the note title and the position, XML declaration added', async () => {
		const { deps, files, toasts, state } = setup();
		const result = await handleAction({ type: 'saveFile', kind: 'svg', data: '<svg xmlns="http://www.w3.org/2000/svg"/>', index: 2 }, deps, state);
		expect(result).toEqual({ ok: true, path: 'C:\\diagrams\\My_ note_-2.svg' });
		expect(files['C:\\diagrams\\My_ note_-2.svg']).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>');
		expect(toasts).toEqual([['success', 'Saved: C:\\diagrams\\My_ note_-2.svg']]);
		expect(state.lastFolder).toBe('C:\\diagrams');
	});

	test('save PNG never overwrites: -2, -3... are added', async () => {
		const { deps, files, state } = setup(['C:\\diagrams\\My_ note_-1.png', 'C:\\diagrams\\My_ note_-1-2.png']);
		const result = await handleAction({ type: 'saveFile', kind: 'png', data: PNG, index: 1 }, deps, state);
		expect(result).toEqual({ ok: true, path: 'C:\\diagrams\\My_ note_-1-3.png' });
		expect(files['C:\\diagrams\\My_ note_-1-3.png']).toBeInstanceOf(Uint8Array);
	});

	test('the folder dialog starts in the last folder; cancelling saves nothing', async () => {
		const first = setup();
		await handleAction({ type: 'saveFile', kind: 'svg', data: '<svg/>', index: 1 }, first.deps, first.state);
		await handleAction({ type: 'saveFile', kind: 'svg', data: '<svg/>', index: 1 }, first.deps, first.state);
		expect(first.log).toEqual(['folder:', 'folder:C:\\diagrams']);

		const cancelled = setup([], null);
		expect(await handleAction({ type: 'saveFile', kind: 'svg', data: '<svg/>', index: 1 }, cancelled.deps, cancelled.state)).toEqual({ ok: false, cancelled: true });
		expect(cancelled.files).toEqual({});
		expect(cancelled.toasts).toEqual([]);
	});

	test('data that is not an SVG or a PNG is refused before the dialog', async () => {
		const { deps, log, state } = setup();
		expect(await handleAction({ type: 'saveFile', kind: 'svg', data: '<html></html>', index: 1 }, deps, state)).toMatchObject({ ok: false });
		expect(await handleAction({ type: 'saveFile', kind: 'png', data: 'not a png', index: 1 }, deps, state)).toMatchObject({ ok: false });
		expect(log).toEqual([]);
	});

	test('links: allowed ones are opened with openItem, others refused with a toast', async () => {
		const { deps, log, toasts, state } = setup();
		expect(await handleAction({ type: 'openLink', href: ':/0123456789abcdef0123456789abcdef' }, deps, state)).toEqual({ ok: true });
		expect(await handleAction({ type: 'openLink', href: 'file:///etc/passwd' }, deps, state)).toMatchObject({ ok: false });
		expect(log).toEqual(['open::/0123456789abcdef0123456789abcdef']);
		expect(toasts).toEqual([['error', 'This link cannot be opened: file:///etc/passwd']]);
	});

	test('getConfig is not an action', async () => {
		const { deps, state } = setup();
		expect(await handleAction({ type: 'getConfig' }, deps, state)).toBeNull();
	});
});
