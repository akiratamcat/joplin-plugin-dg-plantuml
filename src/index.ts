// SPDX-License-Identifier: MIT
import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { Catalog, resolveLocale, Translator } from './i18n/gettext';
import catalogs from './i18n/catalog/catalogs.json';
import { buildViewerConfig, KEYS, SECTION, settingItems, settingsSection, ViewerLanguage } from './settings';
import { MARKDOWN_IT_SCRIPT_ID, ViewerMessage } from './shared/messages';

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

		// The viewer script asks for the settings and its translations (design 7.2 step 2, 10.4).
		await joplin.contentScripts.onMessage(MARKDOWN_IT_SCRIPT_ID, async (message: ViewerMessage) => {
			if (message && message.type === 'getConfig') {
				return buildViewerConfig(await joplin.settings.values(Object.values(KEYS)), language);
			}
			return null;
		});
	},
});
