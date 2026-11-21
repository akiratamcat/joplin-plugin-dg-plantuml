// SPDX-License-Identifier: MIT
// Test page for the rendering tests (design 16.1, 16.4 (2)): the built viewer
// script and engine (dist/contentScript) in headless Chrome, with every
// request outside the test's own files blocked and recorded.
import * as fs from 'fs';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import { Browser, BrowserContext, chromium, Page } from 'playwright-core';
import contentScript from '../../src/contentScript/markdownItPlugin';

export const ROOT = path.join(__dirname, '..', '..');
export const DIST = path.join(ROOT, 'dist', 'contentScript');
const ORIGIN = 'http://render.test';

// Close to the note viewer of Joplin 3.7.22 (no 'wasm-unsafe-eval', no workers),
// plus connect-src 'none' so that any request is reported.
const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data:",
	"font-src 'self' data:",
	"connect-src 'none'",
	"worker-src 'none'",
	"child-src 'none'",
].join('; ');

export function renderMarkdown(markdown: string): string {
	const md = new MarkdownIt();
	contentScript(null).plugin(md, {});
	return md.render(markdown);
}

export function launchBrowser(): Promise<Browser> {
	// The installed Chrome is used (no browser download). DG_CHROME_PATH can
	// point to another Chromium build.
	const executablePath = process.env.DG_CHROME_PATH;
	return chromium.launch(executablePath ? { executablePath, headless: true } : { channel: 'chrome', headless: true });
}

export interface RenderedBlock {
	state: string | null;
	classes: string;
	svg: boolean;
	svgMarkup: string;
	texts: string;
	errorTitle: string;
	errorMessage: string;
	note: string;
	/** Scale the viewer applied to the diagram (design 8.7), or null. */
	scale: number | null;
	/** Displayed width of the diagram in px, or null. */
	svgWidth: number | null;
	/** Width of the output (the pane for the diagram) in px. */
	outputWidth: number;
	/** The output scrolls sideways. */
	scrolls: boolean;
}

export interface PageRun {
	blocks: RenderedBlock[];
	/** Requests to anything but the test's own files. */
	blocked: string[];
	/** The test's own files that were served (paths). */
	served: string[];
	cspViolations: string[];
	pageErrors: string[];
	console: string[];
	/** Messages the page posted to the fake main script. */
	messages: unknown[];
	/** Settings version the viewer uses at the end. */
	settingsVersion: string | null;
	/** URL of the page at the end (a followed link would change it). */
	url: string;
}

const TYPES: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css' };

async function openContext(browser: Browser, html: string, run: PageRun, width: number): Promise<BrowserContext> {
	const context = await browser.newContext({ viewport: { width, height: 800 } });
	await context.route('**/*', (route) => {
		const url = new URL(route.request().url());
		if (url.origin === ORIGIN) {
			if (url.pathname === '/') return route.fulfill({ status: 200, body: html, contentType: 'text/html; charset=utf-8' });
			const file = path.join(DIST, decodeURIComponent(url.pathname));
			if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
				run.served.push(url.pathname);
				return route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
			}
		}
		run.blocked.push(url.href);
		return route.abort();
	});
	return context;
}

async function waitForBlocks(page: Page): Promise<void> {
	await page.waitForFunction(
		() => document.querySelectorAll('.joplin-plantuml').length > 0
			&& !document.querySelector('.joplin-plantuml-output:not([data-plantuml-state]), .joplin-plantuml-output[data-plantuml-state="pending"]'),
		undefined,
		{ timeout: 60000, polling: 100 },
	);
}

export interface RenderOptions {
	colors?: { bg: string; fg: string };
	/**
	 * Answer of a fake main script to getConfig (window.webviewApi, as in
	 * Joplin). Without it there is no webviewApi and the viewer uses its defaults.
	 */
	config?: unknown;
	/** Width of the browser window (default 900). */
	width?: number;
	/** Font size of the note text (body), e.g. '20px'. */
	bodyFontSize?: string;
	/** After rendering, resize the window to this width and wait for the diagrams to refit. */
	resizeTo?: number;
	/** Interactions with the page after rendering (clicks...), before the results are collected. */
	afterRender?: (page: Page) => Promise<void>;
}

/** Renders a note in a page. */
export async function renderNote(browser: Browser, markdown: string, options: RenderOptions = {}): Promise<PageRun> {
	const colors = options.colors || { bg: '#ffffff', fg: '#222222' };
	const run: PageRun = { blocks: [], blocked: [], served: [], cspViolations: [], pageErrors: [], console: [], messages: [], settingsVersion: null, url: '' };
	const html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<link rel="icon" href="data:,">
<link rel="stylesheet" href="plantuml.css">
<style>body { background: ${colors.bg}; color: ${colors.fg};${options.bodyFontSize ? ` font-size: ${options.bodyFontSize};` : ''} }</style>
</head><body>${renderMarkdown(markdown)}
<script src="viewer.js"></script></body></html>`;
	const context = await openContext(browser, html, run, options.width || 900);
	try {
		const page = await context.newPage();
		await page.addInitScript(() => {
			document.addEventListener('securitypolicyviolation', (e) => {
				const w = window as unknown as { __csp: string[] };
				(w.__csp = w.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`);
			});
		});
		if (options.config !== undefined) {
			await page.addInitScript((config) => {
				const w = window as unknown as { webviewApi: unknown; __messages: unknown[] };
				w.__messages = [];
				// No async/await here: this function runs in the page as it is, and the
				// TypeScript helpers for async functions do not exist there.
				w.webviewApi = {
					postMessage: (id: string, message: { type?: string }) => {
						w.__messages.push({ id, message });
						return Promise.resolve(id === 'dgPlantumlMarkdownIt' && message && message.type === 'getConfig' ? config : null);
					},
				};
			}, options.config);
		}
		page.on('pageerror', (e) => run.pageErrors.push(e.message));
		page.on('console', (m) => run.console.push(`${m.type()}: ${m.text()}`));
		await page.goto(`${ORIGIN}/`);
		// Everything the page needs has been loaded: from now on, the page is offline too.
		await context.setOffline(true);
		await waitForBlocks(page);
		if (options.resizeTo) {
			const before = await page.evaluate(() => Array.from(document.querySelectorAll('.joplin-plantuml-output > svg')).map((s) => (s as SVGElement).style.width).join());
			await page.setViewportSize({ width: options.resizeTo, height: 800 });
			await page.waitForFunction((b) => Array.from(document.querySelectorAll('.joplin-plantuml-output > svg')).map((s) => (s as SVGElement).style.width).join() !== b, before, { timeout: 5000, polling: 50 }).catch(() => undefined);
		}
		if (options.afterRender) await options.afterRender(page);
		run.url = page.url();
		run.cspViolations = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp || []);
		run.messages = await page.evaluate(() => (window as unknown as { __messages?: unknown[] }).__messages || []);
		run.settingsVersion = await page.evaluate(() => {
			const v = (window as unknown as { __dgPlantumlViewer?: { settingsVersion: string } }).__dgPlantumlViewer;
			return v ? v.settingsVersion : null;
		});
		run.blocks = await page.evaluate(() => Array.from(document.querySelectorAll('.joplin-plantuml')).map((el) => {
			const out = el.querySelector('.joplin-plantuml-output');
			const svg = out ? out.querySelector(':scope > svg') : null;
			const text = (sel: string) => (el.querySelector(sel) || { textContent: '' }).textContent || '';
			return {
				state: out ? out.getAttribute('data-plantuml-state') : null,
				classes: el.className,
				svg: !!svg,
				svgMarkup: svg ? svg.outerHTML : '',
				texts: svg ? Array.from(svg.querySelectorAll('text')).map((t) => t.textContent).join('|') : '',
				errorTitle: text('.joplin-plantuml-error-title'),
				errorMessage: text('.joplin-plantuml-error-message'),
				note: text('.joplin-plantuml-note'),
				scale: svg && svg.getAttribute('data-plantuml-scale') ? Number(svg.getAttribute('data-plantuml-scale')) : null,
				svgWidth: svg && (svg as SVGElement).style.width ? parseFloat((svg as SVGElement).style.width) : null,
				outputWidth: out ? (out as HTMLElement).clientWidth : 0,
				scrolls: out ? (out as HTMLElement).scrollWidth > (out as HTMLElement).clientWidth + 1 : false,
			};
		}));
	} finally {
		await context.close();
	}
	return run;
}
