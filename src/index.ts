// SPDX-License-Identifier: MIT
import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		// Content scripts are registered in a later step of stage 1.
	},
});
