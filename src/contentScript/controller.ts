// SPDX-License-Identifier: MIT
// Rendering flow of the viewer (design 7.2, 7.3, 7.4): finds the PlantUML
// blocks, uses the cache, keeps the previous diagram while a block is being
// edited, renders one block at a time and shows errors.
import { cacheKey, LruCache } from './cache';
import { RenderEngine, RenderResult } from './engine';
import { PreparedSource, prepareSource, splitLines, toUserLine } from './preamble';
import { PresetConfig, ViewerConfig } from './viewerConfig';
import { parseInfo } from '../shared/fence';

export const BLOCK_SELECTOR = '.joplin-plantuml';
const OUTPUT_SELECTOR = '.joplin-plantuml-output';
// The state is kept on the output element, not on the block: after the Rich
// Text editor's edit dialog, Joplin keeps the block element and replaces only
// its inner HTML, and the new content must be rendered again.
const STATE_ATTR = 'data-plantuml-state';

/** What is shown for a diagram. Stored in the cache. */
export type DiagramView =
	| { kind: 'svg'; svg: string }
	| { kind: 'error'; title: string; message: string; /** User's line number. */ line: number | null };

interface Job {
	el: HTMLElement;
	index: number;
	source: string;
	key: string;
	prepared: PreparedSource;
	engineDark: boolean;
}

export interface ControllerDeps {
	doc: Document;
	engine: RenderEngine;
	config: ViewerConfig;
	/** Sanitises the engine's SVG (design 12). */
	sanitize: (svg: string) => string;
	/** True when the viewer background is dark (design 8.2). */
	isDark: () => boolean;
	setTimer?: (fn: () => void, ms: number) => unknown;
	clearTimer?: (handle: unknown) => void;
	logError?: (...args: unknown[]) => void;
}

/**
 * True when `b` looks like an edit of `a`: the common start and end cover at
 * least half of the text. Used to decide whether the previous diagram at the
 * same position may be shown while the new one renders.
 */
export function isSimilarSource(a: string, b: string): boolean {
	if (a === b) return true;
	const max = Math.max(a.length, b.length);
	const min = Math.min(a.length, b.length);
	let prefix = 0;
	while (prefix < min && a[prefix] === b[prefix]) prefix++;
	let suffix = 0;
	while (suffix < min - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
	return (prefix + suffix) / max >= 0.5;
}

/** Number of diagrams in a block (lines that start with @start). */
export function countDiagrams(source: string): number {
	return splitLines(source).filter((l) => /^\s*@start[a-z]+\b/i.test(l)).length;
}

export class ViewerController {
	private config: ViewerConfig;
	private readonly cache: LruCache<DiagramView>;
	private readonly queue: Job[] = [];
	/** Last successful diagram at each block position. */
	private readonly lastGood = new Map<number, { source: string; svg: string }>();
	private timer: unknown = null;
	private running = false;
	private engineReady = false;
	private engineFailed: string | null = null;
	private readonly setTimer: (fn: () => void, ms: number) => unknown;
	private readonly clearTimer: (handle: unknown) => void;
	private readonly logError: (...args: unknown[]) => void;

	constructor(private readonly deps: ControllerDeps) {
		this.config = deps.config;
		this.cache = new LruCache<DiagramView>(deps.config.cacheSize);
		this.setTimer = deps.setTimer || ((fn, ms) => setTimeout(fn, ms));
		this.clearTimer = deps.clearTimer || ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
		this.logError = deps.logError || ((...args) => console.error('dg-plantuml:', ...args));
	}

	get settingsVersion(): string {
		return this.config.settingsVersion;
	}

	/**
	 * Uses new settings. When they differ from the current ones, every block
	 * is drawn again (the cache key contains the settings version, design 7.2).
	 */
	setConfig(config: ViewerConfig): void {
		if (config.settingsVersion === this.config.settingsVersion) return;
		this.config = config;
		this.cache.setLimit(config.cacheSize);
		this.deps.doc.querySelectorAll(`${BLOCK_SELECTOR} > ${OUTPUT_SELECTOR}[${STATE_ATTR}]`).forEach((out) => out.removeAttribute(STATE_ATTR));
		this.update();
	}

	/** True when the page has blocks that have not been handled yet. */
	hasNewBlocks(): boolean {
		return !!this.deps.doc.querySelector(`${BLOCK_SELECTOR} > ${OUTPUT_SELECTOR}:not([${STATE_ATTR}])`);
	}

	/** Handles new blocks. Safe to call many times (events, MutationObserver). */
	update(): void {
		const blocks = Array.from(this.deps.doc.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
		let dark: boolean | null = null;
		let queued = false;
		let edited = false;
		blocks.forEach((el, index) => {
			if (this.output(el).hasAttribute(STATE_ATTR)) return;
			if (dark === null) dark = this.deps.isDark();
			const job = this.makeJob(el, index, dark);
			const cached = this.cache.get(job.key);
			if (cached) {
				this.show(job, cached);
				return;
			}
			this.output(el).setAttribute(STATE_ATTR, 'pending');
			if (job.source.length > this.config.maxSourceLength) {
				const view: DiagramView = {
					kind: 'error',
					title: 'The diagram is too large.',
					message: `The source has ${job.source.length} characters. The limit is ${this.config.maxSourceLength}.`,
					line: null,
				};
				this.show(job, view);
				return;
			}
			if (this.showPrevious(job)) edited = true;
			else this.setStatus(job.el, this.statusText());
			// Older requests for the same position are no longer needed.
			for (let i = this.queue.length - 1; i >= 0; i--) {
				if (this.queue[i].index === index || !this.queue[i].el.isConnected) this.queue.splice(i, 1);
			}
			this.queue.push(job);
			queued = true;
		});
		if (queued) this.schedule(edited ? this.config.debounceMs : 0);
	}

	private makeJob(el: HTMLElement, index: number, dark: boolean): Job {
		const config = this.config;
		const pre = el.querySelector('pre.joplin-source');
		const source = pre ? pre.textContent || '' : '';
		const options = parseInfo(pre ? pre.getAttribute('data-joplin-language') || '' : '').options;
		const theme = options.theme || (config.themeMode === 'auto' ? (dark ? 'dark' : 'light') : config.themeMode);
		const preset: PresetConfig = theme === 'none' ? { lines: [], engineDark: false } : config.presets[theme];
		const prepared = prepareSource(source, {
			presetLines: preset.lines,
			presetTheme: preset.theme,
			transparentBackground: config.transparentBackground,
			fontFamily: config.fontFamily,
			fontSizePx: 0,
			smetana: true,
			noStyle: theme === 'none',
		});
		el.classList.remove('joplin-plantuml-align-left', 'joplin-plantuml-align-right');
		if (options.align === 'left' || options.align === 'right') el.classList.add(`joplin-plantuml-align-${options.align}`);
		// A dark diagram on a light page (or the other way round) is hard to read,
		// because the engine draws no background. Put a backdrop behind it.
		const diagramDark = theme === 'dark';
		el.classList.remove('joplin-plantuml-backdrop-light', 'joplin-plantuml-backdrop-dark');
		if (diagramDark !== dark) el.classList.add(diagramDark ? 'joplin-plantuml-backdrop-dark' : 'joplin-plantuml-backdrop-light');
		const preamble = prepared.lines.slice(prepared.startLine, prepared.startLine + prepared.inserted).join('\n');
		const key = cacheKey({
			source,
			theme: `${theme}${preset.engineDark ? '+engine-dark' : ''}`,
			preamble,
			baseFontSizePx: 0,
			settingsVersion: config.settingsVersion,
			engineVersion: this.deps.engine.version,
		});
		return { el, index, source, key, prepared, engineDark: preset.engineDark };
	}

	private statusText(): string {
		return this.engineReady ? 'Rendering…' : 'Loading the PlantUML engine…';
	}

	private output(el: HTMLElement): HTMLElement {
		let out = el.querySelector<HTMLElement>(OUTPUT_SELECTOR);
		if (!out) {
			out = this.deps.doc.createElement('div');
			out.className = 'joplin-plantuml-output';
			el.appendChild(out);
		}
		return out;
	}

	private setStatus(el: HTMLElement, text: string): void {
		const out = this.output(el);
		let status = out.querySelector('.joplin-plantuml-status');
		if (!status) {
			status = this.deps.doc.createElement('span');
			status.className = 'joplin-plantuml-status';
			out.replaceChildren(status);
		}
		status.textContent = text;
		out.setAttribute('aria-busy', 'true');
	}

	private previousFor(job: Job): { source: string; svg: string } | null {
		const prev = this.lastGood.get(job.index);
		return prev && isSimilarSource(prev.source, job.source) ? prev : null;
	}

	/** Shows the previous diagram at the same position, dimmed (design 7.3). */
	private showPrevious(job: Job): boolean {
		const prev = this.previousFor(job);
		if (!prev) return false;
		const out = this.output(job.el);
		out.replaceChildren(this.staleNode(prev.svg));
		out.setAttribute('aria-busy', 'true');
		return true;
	}

	private staleNode(svg: string): HTMLElement {
		const stale = this.deps.doc.createElement('div');
		stale.className = 'joplin-plantuml-stale';
		stale.innerHTML = svg;
		return stale;
	}

	private schedule(ms: number): void {
		if (this.timer !== null) this.clearTimer(this.timer);
		this.timer = this.setTimer(() => {
			this.timer = null;
			void this.drain();
		}, ms);
	}

	/** Renders the queued blocks one at a time. */
	async drain(): Promise<void> {
		if (this.running) return;
		this.running = true;
		try {
			await this.initEngine();
			let job: Job | undefined;
			while ((job = this.queue.shift())) {
				if (!job.el.isConnected) continue;
				let view = this.cache.get(job.key);
				if (!view) {
					view = await this.render(job);
					this.cache.set(job.key, view);
				}
				if (job.el.isConnected) this.show(job, view);
			}
		} finally {
			this.running = false;
		}
		// Blocks queued while the last one was rendering.
		if (this.queue.length && this.timer === null) this.schedule(0);
	}

	private async initEngine(): Promise<void> {
		if (this.engineReady || this.engineFailed !== null) return;
		try {
			await this.deps.engine.init();
			this.engineReady = true;
			for (const job of this.queue) {
				if (job.el.querySelector('.joplin-plantuml-status')) this.setStatus(job.el, this.statusText());
			}
		} catch (e) {
			this.engineFailed = e instanceof Error ? e.message : String(e);
			this.logError('could not load the PlantUML engine:', e);
		}
	}

	private async render(job: Job): Promise<DiagramView> {
		if (this.engineFailed !== null) {
			return { kind: 'error', title: 'Could not load the PlantUML engine.', message: 'See the developer tools console for details.', line: null };
		}
		let result: RenderResult;
		try {
			result = await this.deps.engine.renderSvg(job.prepared.lines.join('\n'), {
				timeoutMs: this.config.renderTimeoutMs,
				dark: job.engineDark,
			});
		} catch (e) {
			this.logError('rendering failed:', e);
			result = { ok: false, reason: 'crash', message: e instanceof Error ? e.message : String(e) };
		}
		if (result.ok) return { kind: 'svg', svg: this.deps.sanitize(result.svg) };
		switch (result.reason) {
		case 'syntax':
			return {
				kind: 'error',
				title: 'PlantUML error',
				message: result.message,
				line: result.line === undefined ? null : toUserLine(result.line, job.prepared),
			};
		case 'timeout':
			return { kind: 'error', title: 'Rendering timed out.', message: result.message, line: null };
		case 'crash':
			this.logError('the PlantUML engine crashed:', result.message);
			return { kind: 'error', title: 'The PlantUML engine crashed.', message: result.message, line: null };
		default:
			return { kind: 'error', title: 'PlantUML error', message: result.message, line: null };
		}
	}

	private show(job: Job, view: DiagramView): void {
		const out = this.output(job.el);
		out.removeAttribute('aria-busy');
		out.setAttribute(STATE_ATTR, view.kind === 'svg' ? 'done' : 'error');
		if (view.kind === 'svg') {
			out.innerHTML = view.svg;
			this.lastGood.set(job.index, { source: job.source, svg: view.svg });
			if (countDiagrams(job.source) > 1) {
				out.appendChild(this.note('Only the first diagram in this block is shown.'));
			}
			return;
		}
		const nodes: Node[] = [this.errorBox(job, view)];
		// Keep the previous diagram under the error while the block is being
		// edited, so that the height does not jump on every typing error.
		const prev = this.previousFor(job);
		if (prev) nodes.push(this.staleNode(prev.svg));
		out.replaceChildren(...nodes);
	}

	private note(text: string): HTMLElement {
		const div = this.deps.doc.createElement('div');
		div.className = 'joplin-plantuml-note';
		div.textContent = text;
		return div;
	}

	private errorBox(job: Job, view: Extract<DiagramView, { kind: 'error' }>): HTMLElement {
		const doc = this.deps.doc;
		const box = doc.createElement('div');
		box.className = 'joplin-plantuml-error';
		box.setAttribute('role', 'alert');
		const title = doc.createElement('div');
		title.className = 'joplin-plantuml-error-title';
		title.textContent = view.title;
		box.appendChild(title);
		if (view.message || view.line !== null) {
			const message = doc.createElement('div');
			message.className = 'joplin-plantuml-error-message';
			message.textContent = view.line !== null ? `Line ${view.line}: ${view.message}` : view.message;
			box.appendChild(message);
		}
		if (view.line !== null) {
			const text = splitLines(job.source)[view.line - 1];
			if (text !== undefined) {
				const pre = doc.createElement('pre');
				pre.className = 'joplin-plantuml-error-excerpt';
				const num = doc.createElement('span');
				num.className = 'joplin-plantuml-error-line';
				num.textContent = String(view.line);
				pre.append(num, doc.createTextNode(text));
				box.appendChild(pre);
			}
		}
		return box;
	}
}
