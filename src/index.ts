// SPDX-License-Identifier: MIT
import joplin from 'api';
import { ContentScriptType, ToastType } from 'api/types';
import { ActionDeps, ActionState, handleAction } from './actions';
import { Catalog, resolveLocale, Translator } from './i18n/gettext';
import catalogs from './i18n/catalog/catalogs.json';
import { buildViewerConfig, KEYS, SECTION, settingItems, settingsSection, ViewerLanguage } from './settings';
import { MARKDOWN_IT_SCRIPT_ID, ViewerMessage } from './shared/messages';

/** Joins a folder and a file name with the folder's own separator (no Node.js path module in the plugin). */
function joinPath(folder: string, name: string): string {
	const sep = folder.includes('\\') && !folder.includes('/') ? '\\' : '/';
	return /[\\/]$/.test(folder) ? `${folder}${name}` : `${folder}${sep}${name}`;
}

const TOAST_TYPES = { info: ToastType.Info, success: ToastType.Success, error: ToastType.Error };

joplin.plugins.register({
	onStart: async function() {
		// The display language of Joplin. Joplin asks for a restart when it
		// changes, so it is read once (design 10.3).
		const locale = resolveLocale(String(await joplin.settings.globalValue('locale') || ''), ['en', ...Object.keys(catalogs)]);
		const catalog: Catalog = (catalogs as Record<string, Catalog>)[locale] || {};
		const t = new Translator(locale, catalog);
		const language: ViewerLanguage = { locale, catalog };

		await joplin.settings.registerSection(SECTION, settingsSection(t));
		await joplin.settings.registerSettings(settingItems(t));

		// Renders PlantUML fences in the note viewer (design 5.1, 7.1).
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			MARKDOWN_IT_SCRIPT_ID,
			'./contentScript/markdownItPlugin.js',
		);

		// Toolbar and link actions (design 11), through the Joplin API.
		const fs = joplin.require('fs-extra');
		const deps: ActionDeps = {
			t,
			writeText: (text) => joplin.clipboard.writeText(text),
			writeImage: (dataUrl) => joplin.clipboard.writeImage(dataUrl),
			chooseFolder: async (defaultPath) => {
				const chosen = await joplin.views.dialogs.showOpenDialog({
					title: t._('Choose a folder to save the diagram in'),
					properties: ['openDirectory', 'createDirectory'],
					...(defaultPath ? { defaultPath } : {}),
				});
				return chosen && chosen.length ? chosen[0] : null;
			},
			exists: (path) => fs.pathExists(path),
			writeFile: (path, data) => fs.writeFile(path, data),
			joinPath,
			noteTitle: async () => {
				const note = await joplin.workspace.selectedNote();
				return note && note.title ? String(note.title) : '';
			},
			openItem: async (href) => { await joplin.commands.execute('openItem', href); },
			toast: (message, kind) => joplin.views.dialogs.showToast({ message, type: TOAST_TYPES[kind], duration: 4000 }),
		};
		const state: ActionState = {};

		// Messages of the viewer script (design 7.2 step 2, 10.4, 11).
		await joplin.contentScripts.onMessage(MARKDOWN_IT_SCRIPT_ID, async (message: ViewerMessage) => {
			if (!message || typeof message !== 'object') return null;
			if (message.type === 'getConfig') {
				return buildViewerConfig(await joplin.settings.values(Object.values(KEYS)), language);
			}
			return handleAction(message, deps, state);
		});
	},
});
