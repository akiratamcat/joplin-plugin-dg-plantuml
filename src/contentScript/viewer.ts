// SPDX-License-Identifier: MIT
// Viewer script (an asset of the Markdown-it plugin). Runs in the note viewer
// and renders the PlantUML blocks (design 7.2). Built as a classic browser
// script by webpack.viewer.js.
import { MARKDOWN_IT_SCRIPT_ID, ViewerMessage } from '../shared/messages';
import { svgToPng } from './image';
import { DiagramActions } from './toolbar';
import { ViewerController } from './controller';
import { importModuleNative, loadScriptElement, PlantUmlEngine } from './engine';
import { sanitizeSvg } from './sanitize';
import { noteFontSizePx } from './fontSize';
import { isDarkBackground } from './theme';
import { DEFAULT_VIEWER_CONFIG, normalizeConfig, ViewerConfig } from './viewerConfig';

interface WebviewApi {
	postMessage(contentScriptId: string, message: unknown): Promise<unknown>;
}

declare global {
	interface Window {
		__dgPlantumlViewer?: ViewerController;
		webviewApi?: WebviewApi;
	}
}

/** How long the first rendering waits for the settings before it uses the defaults. */
const FIRST_CONFIG_TIMEOUT_MS = 2000;

/** URL of this script's folder, taken while the script runs. */
function scriptBaseUrl(): string {
	let src = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : '';
	if (!src) {
		const scripts = Array.from(document.getElementsByTagName('script'));
		const me = scripts.find((s) => /\/viewer\.js(?:[?#]|$)/.test(s.src));
		src = me ? me.src : '';
	}
	return src.replace(/[^/]*$/, '');
}

/** Asks the main script for the settings. Null when there is no main script or it fails. */
async function fetchConfig(): Promise<ViewerConfig | null> {
	const api = window.webviewApi;
	if (!api || typeof api.postMessage !== 'function') return null;
	try {
		const answer = await api.postMessage(MARKDOWN_IT_SCRIPT_ID, { type: 'getConfig' });
		return answer ? normalizeConfig(answer) : null;
	} catch (e) {
		console.warn('dg-plantuml: could not get the settings, using the defaults.', e);
		return null;
	}
}

/** Sends an action to the main script. The main script shows the result as a toast. */
function post(message: ViewerMessage): void {
	const api = window.webviewApi;
	if (!api || typeof api.postMessage !== 'function') return;
	api.postMessage(MARKDOWN_IT_SCRIPT_ID, message).catch((e: unknown) => console.warn('dg-plantuml:', e));
}

/** PNG background: the engine draws none, so dark diagrams get a dark one (design 8.5). */
const PNG_BACKGROUND = { light: '#ffffff', dark: '#181818' };

function png(svg: string, dark: boolean): Promise<string> {
	return svgToPng(svg, document, { scale: 2, background: dark ? PNG_BACKGROUND.dark : PNG_BACKGROUND.light });
}

/** Toolbar and link actions (design 11), done by the main script. */
const actions: DiagramActions = {
	copyText: (text, what) => post({ type: 'copyText', text, what }),
	copyImage: (svg, dark) => {
		png(svg, dark).then((dataUrl) => post({ type: 'copyImage', dataUrl }), (e: unknown) => console.warn('dg-plantuml: PNG failed', e));
	},
	saveSvg: (svg, index) => post({ type: 'saveFile', kind: 'svg', data: svg, index }),
	savePng: (svg, dark, index) => {
		png(svg, dark).then((dataUrl) => post({ type: 'saveFile', kind: 'png', data: dataUrl, index }), (e: unknown) => console.warn('dg-plantuml: PNG failed', e));
	},
	openLink: (href) => post({ type: 'openLink', href }),
};

/**
 * Links in diagrams ([[link]] in PlantUML) are <a target="_top"> in the SVG.
 * Followed as they are, they would replace the note viewer. They are handed
 * to the main script instead, which opens them as Joplin opens note links.
 */
function handleLinkClick(event: MouseEvent): void {
	const target = event.target as Element | null;
	const link = target && typeof target.closest === 'function' ? target.closest('.joplin-plantuml-output a') : null;
	if (!link) return;
	event.preventDefault();
	event.stopPropagation();
	const href = link.getAttribute('href') || link.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
	if (href) actions.openLink(href);
}

/** A tap on a diagram shows its toolbar (touch screens have no hover, design 11). */
function handleDiagramTap(event: MouseEvent): void {
	const target = event.target as Element | null;
	if (!target || typeof target.closest !== 'function' || target.closest('a, button')) return;
	const block = target.closest('.joplin-plantuml');
	if (!block || !block.querySelector(':scope > .joplin-plantuml-toolbar')) return;
	document.querySelectorAll('.joplin-plantuml-tools-open').forEach((el) => { if (el !== block) el.classList.remove('joplin-plantuml-tools-open'); });
	block.classList.toggle('joplin-plantuml-tools-open');
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
	return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function start(): void {
	// Joplin may run the asset again; one controller per page is enough.
	if (window.__dgPlantumlViewer) return;
	const baseUrl = scriptBaseUrl();
	const engine = new PlantUmlEngine({
		baseUrl: `${baseUrl}engine/`,
		win: window,
		loadScript: (url) => loadScriptElement(document, url),
		importModule: importModuleNative,
	});
	const controller = new ViewerController({
		doc: document,
		engine,
		config: DEFAULT_VIEWER_CONFIG,
		sanitize: (svg) => sanitizeSvg(svg, window),
		isDark: () => isDarkBackground(document),
		noteFontSize: () => noteFontSizePx(document),
		actions,
	});
	window.__dgPlantumlViewer = controller;

	let ready = false;
	let asking = false;
	// Later updates render at once with the settings at hand, then check in the
	// background whether the settings changed (V-10). Waiting for the answer
	// first would delay even diagrams that come from the cache.
	const refreshConfig = () => {
		if (asking) return;
		asking = true;
		void fetchConfig().then((config) => {
			asking = false;
			if (config) controller.setConfig(config);
		});
	};
	const check = () => {
		if (!ready || !controller.hasNewBlocks()) return;
		controller.update();
		refreshConfig();
	};

	// The first rendering waits for the settings, so that diagrams are not drawn
	// twice (with the defaults, then with the user's settings).
	void withTimeout(fetchConfig(), FIRST_CONFIG_TIMEOUT_MS, null).then((config) => {
		if (config) controller.setConfig(config);
		ready = true;
		check();
	});

	document.addEventListener('click', handleLinkClick, true);
	document.addEventListener('click', handleDiagramTap);
	document.addEventListener('joplin-noteDidUpdate', check);
	// Backup for pages that do not send joplin-noteDidUpdate (design 7.2 step 1).
	const observe = () => {
		if (!document.body) return;
		new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
		check();
	};
	if (document.body) observe();
	else document.addEventListener('DOMContentLoaded', observe);
}

start();
