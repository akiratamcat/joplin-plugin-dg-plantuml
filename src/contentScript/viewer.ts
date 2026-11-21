// SPDX-License-Identifier: MIT
// Viewer script (an asset of the Markdown-it plugin). Runs in the note viewer
// and renders the PlantUML blocks (design 7.2). Built as a classic browser
// script by webpack.viewer.js.
import { MARKDOWN_IT_SCRIPT_ID } from '../shared/messages';
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
