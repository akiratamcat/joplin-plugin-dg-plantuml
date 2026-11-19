// SPDX-License-Identifier: MIT
// Loads and calls the bundled PlantUML engine (@plantuml/core) in the note
// viewer (design 7.5, 7.6, 12).
//
// - themes.js is loaded first: it registers the !theme definitions, so the
//   engine never tries to fetch them.
// - The standard library loader only gives the bundled emoji.js and
//   openiconic.js; every other request fails. No file loader is given access
//   to anything: it always fails. The plugin never makes network requests.
import { parseEngineError } from './engineError';
import { splitLines } from './preamble';

/** Version of the vendored engine (vendor/plantuml/SOURCE.md). Part of the cache key. */
export const ENGINE_VERSION = '1.2026.10';

/** Files the standard library loader may give to the engine (design 7.5). */
export const BUNDLED_LIBRARY_FILES = ['emoji.js', 'openiconic.js'];

export interface RenderOptions {
	timeoutMs: number;
	/** The engine's dark option (preset plantuml-dark, design 8.4). */
	dark: boolean;
}

export type RenderFailure = 'syntax' | 'crash' | 'timeout' | 'engine';

export type RenderResult =
	| { ok: true; svg: string }
	| { ok: false; reason: RenderFailure; message: string; /** 1-based line in the source passed to the engine. */ line?: number };

/** Engine interface (design 7.6), so that the engine build can be replaced. */
export interface RenderEngine {
	readonly name: string;
	readonly version: string;
	init(): Promise<void>;
	renderSvg(source: string, opts: RenderOptions): Promise<RenderResult>;
}

interface PlantUmlModule {
	renderToString(
		lines: string[],
		onSuccess: (svg: string) => void,
		onError: (message: unknown) => void,
		options?: { dark?: boolean },
	): void;
}

type Done = () => void;
type Fail = (message: string) => void;

interface EngineWindow {
	PLANTUML_STDLIB_LOADER?: (url: string, ok: Done, err: Fail) => boolean;
	PLANTUML_FILE_LOADER?: (path: string, from: string, ok: (text: string) => void, err: Fail) => void;
}

export interface PlantUmlEngineDeps {
	/** URL of the folder that holds plantuml.js, themes.js... (ends with "/"). */
	baseUrl: string;
	win: Window;
	/** Loads a classic script. */
	loadScript: (url: string) => Promise<void>;
	/** Loads an ES module (the engine). */
	importModule: (url: string) => Promise<unknown>;
}

/** Loads a classic script with a <script> element. */
export function loadScriptElement(doc: Document, url: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const s = doc.createElement('script');
		s.src = url;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error(`Could not load ${url}`));
		doc.head.appendChild(s);
	});
}

/** Native dynamic import of an ES module (kept as is by webpack). */
export function importModuleNative(url: string): Promise<unknown> {
	return import(/* webpackIgnore: true */ url);
}

export class PlantUmlEngine implements RenderEngine {
	readonly name = 'plantuml-teavm';
	readonly version = ENGINE_VERSION;
	private mod: PlantUmlModule | null = null;
	private initPromise: Promise<void> | null = null;

	constructor(private readonly deps: PlantUmlEngineDeps) {}

	init(): Promise<void> {
		if (!this.initPromise) this.initPromise = this.load();
		return this.initPromise;
	}

	private async load(): Promise<void> {
		this.installLoaders();
		await this.deps.loadScript(`${this.deps.baseUrl}themes.js`);
		const mod = await this.deps.importModule(`${this.deps.baseUrl}plantuml.js`) as Partial<PlantUmlModule>;
		if (!mod || typeof mod.renderToString !== 'function') throw new Error('plantuml.js has no renderToString');
		this.mod = mod as PlantUmlModule;
	}

	private installLoaders(): void {
		const w = this.deps.win as unknown as EngineWindow;
		w.PLANTUML_STDLIB_LOADER = (url, ok, err) => {
			if (BUNDLED_LIBRARY_FILES.includes(url)) {
				this.deps.loadScript(`${this.deps.baseUrl}${url}`).then(() => ok(), (e: Error) => err(e.message));
			} else {
				err(`The PlantUML standard library is not available: ${url}`);
			}
			return true;
		};
		w.PLANTUML_FILE_LOADER = (path, _from, _ok, err) => {
			err(`File access is not available: ${path}`);
		};
	}

	renderSvg(source: string, opts: RenderOptions): Promise<RenderResult> {
		const mod = this.mod;
		if (!mod) return Promise.resolve({ ok: false, reason: 'engine', message: 'The PlantUML engine is not loaded.' });
		return new Promise((resolve) => {
			let settled = false;
			const finish = (r: RenderResult) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(r);
			};
			const timer = setTimeout(() => {
				finish({ ok: false, reason: 'timeout', message: `Rendering took longer than ${opts.timeoutMs} ms.` });
			}, opts.timeoutMs);
			try {
				mod.renderToString(
					splitLines(source),
					(svg) => finish(classifySvg(svg)),
					(message) => finish({ ok: false, reason: 'engine', message: String(message) }),
					{ dark: opts.dark },
				);
			} catch (e) {
				finish({ ok: false, reason: 'crash', message: e instanceof Error ? e.message : String(e) });
			}
		});
	}
}

/** The engine returns errors as an SVG that draws them (design 7.4). */
export function classifySvg(svg: string): RenderResult {
	const error = parseEngineError(svg);
	if (!error) return { ok: true, svg };
	if (error.crashed) return { ok: false, reason: 'crash', message: error.message };
	return { ok: false, reason: 'syntax', message: error.message, line: error.line === null ? undefined : error.line };
}
