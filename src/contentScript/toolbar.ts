// SPDX-License-Identifier: MIT
// Toolbar of a diagram (design 11): copy SVG / PNG, save SVG / PNG, copy the
// source. Shown when the mouse is over the diagram, when a button has the
// keyboard focus, or after a tap on the diagram (no hover-only UI).
import { Translator } from '../i18n/gettext';

/** What the toolbar asks for. The viewer sends them to the main script. */
export interface DiagramActions {
	copyText(text: string, what: 'svg' | 'source'): void;
	copyImage(svg: string, dark: boolean): void;
	saveSvg(svg: string, index: number): void;
	savePng(svg: string, dark: boolean, index: number): void;
	openLink(href: string): void;
}

export interface ToolbarTarget {
	/** Sanitised SVG markup of the diagram. */
	svg: string;
	/** PlantUML source as the user wrote it. */
	source: string;
	/** The diagram uses dark colours (for the PNG background). */
	dark: boolean;
	/** 1-based position of the diagram in the note. */
	index: number;
}

export const TOOLBAR_CLASS = 'joplin-plantuml-toolbar';

// 16x16 icons, drawn with the text colour (stroke="currentColor").
const ICONS: Record<string, string> = {
	copy: '<rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>',
	image: '<rect x="2" y="3" width="12" height="10" rx="1"/><circle cx="6" cy="7" r="1.2"/><path d="M14 11l-4-4-6 6"/>',
	save: '<path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10"/>',
	code: '<path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/>',
};

function icon(name: string, label: string): string {
	return `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg><span class="joplin-plantuml-tool-label">${label}</span>`;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Builds the toolbar for a diagram. */
export function buildToolbar(doc: Document, t: Translator, target: ToolbarTarget, actions: DiagramActions): HTMLElement {
	const bar = doc.createElement('div');
	bar.className = TOOLBAR_CLASS;
	bar.setAttribute('role', 'toolbar');
	bar.setAttribute('aria-label', t._('Diagram tools'));
	const buttons: [string, string, string, () => void][] = [
		['copy-svg', 'copy', t._('Copy SVG'), () => actions.copyText(target.svg, 'svg')],
		['copy-png', 'image', t._('Copy PNG'), () => actions.copyImage(target.svg, target.dark)],
		['save-svg', 'save', t._('Save SVG'), () => actions.saveSvg(target.svg, target.index)],
		['save-png', 'save', t._('Save PNG'), () => actions.savePng(target.svg, target.dark, target.index)],
		['copy-source', 'code', t._('Copy PlantUML source'), () => actions.copyText(target.source, 'source')],
	];
	for (const [id, iconName, label, run] of buttons) {
		const button = doc.createElement('button');
		button.type = 'button';
		button.className = `joplin-plantuml-tool joplin-plantuml-tool-${id}`;
		button.setAttribute('aria-label', label);
		button.title = label;
		button.innerHTML = icon(iconName, escapeHtml(label));
		button.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			run();
		});
		bar.appendChild(button);
	}
	return bar;
}
