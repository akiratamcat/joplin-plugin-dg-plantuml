// SPDX-License-Identifier: MIT
import joplin from 'api';
import { ContentScriptType } from 'api/types';
import { buildViewerConfig, KEYS, SECTION, SETTINGS } from './settings';
import { MARKDOWN_IT_SCRIPT_ID, ViewerMessage } from './shared/messages';

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection(SECTION, {
			label: 'dg-plantuml',
			iconName: 'fas fa-project-diagram',
			description: 'PlantUML diagrams, rendered by the engine bundled in this plugin. No network access.',
		});
		await joplin.settings.registerSettings(SETTINGS);

		// Renders PlantUML fences in the note viewer (design 5.1, 7.1).
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			MARKDOWN_IT_SCRIPT_ID,
			'./contentScript/markdownItPlugin.js',
		);

		// The viewer script asks for the settings (design 7.2 step 2).
		await joplin.contentScripts.onMessage(MARKDOWN_IT_SCRIPT_ID, async (message: ViewerMessage) => {
			if (message && message.type === 'getConfig') {
				return buildViewerConfig(await joplin.settings.values(Object.values(KEYS)));
			}
			return null;
		});
	},
});
