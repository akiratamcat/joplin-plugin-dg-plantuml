// SPDX-License-Identifier: MIT
// Actions the viewer asks the main script to do (design 11): copy to the
// clipboard, save an image to a file, open a link of a diagram. The Joplin API
// is reached through ActionDeps, so that the logic can be tested.
import { Translator } from './i18n/gettext';
import { ActionResult, ViewerMessage } from './shared/messages';

export interface ActionDeps {
	t: Translator;
	writeText(text: string): Promise<void>;
	writeImage(dataUrl: string): Promise<void>;
	/** Lets the user choose a folder. Null when cancelled. */
	chooseFolder(defaultPath: string | undefined): Promise<string | null>;
	exists(path: string): Promise<boolean>;
	writeFile(path: string, data: string | Uint8Array): Promise<void>;
	joinPath(folder: string, name: string): string;
	/** Title of the selected note ('' when there is none). */
	noteTitle(): Promise<string>;
	/** Joplin's command "openItem": opens a note for ":/id", or an external URL. */
	openItem(href: string): Promise<void>;
	toast(message: string, kind: 'info' | 'success' | 'error'): Promise<void>;
}

/** Remembered between actions while Joplin runs. */
export interface ActionState {
	lastFolder?: string;
}

/** Largest text or image the viewer may send (bytes of the string). */
export const MAX_DATA_LENGTH = 50 * 1024 * 1024;

const NOTE_LINK_RE = /^:\/[0-9a-fA-F]{32}(#[^\s]*)?$/;
const PNG_DATA_URL_RE = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Links of a diagram that may be opened: Joplin notes (":/" and a 32-digit ID)
 * and http, https and mailto URLs. Other schemes (file:, javascript:...) are
 * refused, so that a diagram cannot open local files or programs.
 */
export function isAllowedLink(href: string): boolean {
	if (typeof href !== 'string' || href.length > 2048) return false;
	if (NOTE_LINK_RE.test(href)) return true;
	return /^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(href);
}

/** A file name made from a note title: no characters that file systems forbid. */
export function safeFileName(title: string): string {
	const name = (title || '')
		// Control characters are not allowed in file names either, so they are matched on purpose.
		// eslint-disable-next-line no-control-regex
		.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^[. ]+|[. ]+$/g, '')
		.slice(0, 80)
		.trim();
	// Names Windows reserves for devices.
	if (!name || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name)) return 'plantuml';
	return name;
}

/** Bytes of a PNG data URL, or null when it is not one. */
export function decodePngDataUrl(dataUrl: string): Uint8Array | null {
	const m = PNG_DATA_URL_RE.exec(dataUrl);
	if (!m) return null;
	const binary = atob(m[1]);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function message(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Handles an action message. Unknown messages give null (getConfig is handled elsewhere). */
export async function handleAction(msg: ViewerMessage, deps: ActionDeps, state: ActionState): Promise<ActionResult | null> {
	const t = deps.t;
	switch (msg.type) {
	case 'copyText': {
		if (typeof msg.text !== 'string' || msg.text.length > MAX_DATA_LENGTH) return { ok: false, error: 'bad text' };
		try {
			await deps.writeText(msg.text);
			await deps.toast(msg.what === 'svg' ? t._('Copied the SVG.') : t._('Copied the PlantUML source.'), 'success');
			return { ok: true };
		} catch (e) {
			await deps.toast(t._('Could not copy: {error}', { error: message(e) }), 'error');
			return { ok: false, error: message(e) };
		}
	}
	case 'copyImage': {
		if (typeof msg.dataUrl !== 'string' || msg.dataUrl.length > MAX_DATA_LENGTH || !PNG_DATA_URL_RE.test(msg.dataUrl)) {
			return { ok: false, error: 'bad image' };
		}
		try {
			await deps.writeImage(msg.dataUrl);
			await deps.toast(t._('Copied the image (PNG).'), 'success');
			return { ok: true };
		} catch (e) {
			await deps.toast(t._('Could not copy: {error}', { error: message(e) }), 'error');
			return { ok: false, error: message(e) };
		}
	}
	case 'saveFile': {
		if (typeof msg.data !== 'string' || msg.data.length > MAX_DATA_LENGTH) return { ok: false, error: 'bad data' };
		let data: string | Uint8Array;
		if (msg.kind === 'svg') {
			if (!/^\s*(<\?xml[^>]*>\s*)?<svg[\s/>]/.test(msg.data)) return { ok: false, error: 'bad svg' };
			data = msg.data.startsWith('<?xml') ? msg.data : `<?xml version="1.0" encoding="UTF-8"?>\n${msg.data}`;
		} else if (msg.kind === 'png') {
			const bytes = decodePngDataUrl(msg.data);
			if (!bytes) return { ok: false, error: 'bad png' };
			data = bytes;
		} else {
			return { ok: false, error: 'bad kind' };
		}
		try {
			const folder = await deps.chooseFolder(state.lastFolder);
			if (!folder) return { ok: false, cancelled: true };
			state.lastFolder = folder;
			const base = `${safeFileName(await deps.noteTitle())}-${Number.isInteger(msg.index) && msg.index > 0 ? msg.index : 1}`;
			// Never overwrite: add -2, -3... when the name is taken.
			let path = deps.joinPath(folder, `${base}.${msg.kind}`);
			for (let n = 2; await deps.exists(path); n++) {
				if (n > 999) throw new Error('too many files with the same name');
				path = deps.joinPath(folder, `${base}-${n}.${msg.kind}`);
			}
			await deps.writeFile(path, data);
			await deps.toast(t._('Saved: {path}', { path }), 'success');
			return { ok: true, path };
		} catch (e) {
			await deps.toast(t._('Could not save: {error}', { error: message(e) }), 'error');
			return { ok: false, error: message(e) };
		}
	}
	case 'openLink': {
		if (!isAllowedLink(msg.href)) {
			await deps.toast(t._('This link cannot be opened: {href}', { href: String(msg.href).slice(0, 200) }), 'error');
			return { ok: false, error: 'link not allowed' };
		}
		try {
			await deps.openItem(msg.href);
			return { ok: true };
		} catch (e) {
			return { ok: false, error: message(e) };
		}
	}
	default:
		return null;
	}
}
