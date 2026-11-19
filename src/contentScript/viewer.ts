// SPDX-License-Identifier: MIT
// Viewer script (an asset of the Markdown-it plugin). Runs in the note viewer
// and renders the PlantUML blocks (design 7.2). Built as a classic browser
// script by webpack.viewer.js.
import { ViewerController } from './controller';
import { importModuleNative, loadScriptElement, PlantUmlEngine } from './engine';
import { sanitizeSvg } from './sanitize';
import { isDarkBackground } from './theme';
import { DEFAULT_VIEWER_CONFIG } from './viewerConfig';

declare global {
	interface Window {
		__dgPlantumlViewer?: ViewerController;
	}
}

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
	});
	window.__dgPlantumlViewer = controller;

	const check = () => {
		if (controller.hasNewBlocks()) controller.update();
	};
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
