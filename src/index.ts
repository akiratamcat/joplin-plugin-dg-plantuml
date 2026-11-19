// SPDX-License-Identifier: MIT
import joplin from 'api';
import { ContentScriptType } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		// Renders PlantUML fences in the note viewer (design 5.1, 7.1).
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'dgPlantumlMarkdownIt',
			'./contentScript/markdownItPlugin.js',
		);
	},
});
