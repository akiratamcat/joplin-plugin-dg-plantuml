// SPDX-License-Identifier: MIT
// Third-party software bundled in the plugin package (design 20.2, 20.4),
// shown on the settings screen so that users can see it in Joplin.
// scripts/check-licenses.mjs checks that the versions match
// vendor/plantuml/SOURCE.md and the installed DOMPurify. The full license
// texts are in THIRD_PARTY_NOTICES.md (also inside the .jpl).

export interface ThirdPartyComponent {
	name: string;
	version: string;
	license: string;
	url: string;
}

export const THIRD_PARTY: ThirdPartyComponent[] = [
	{ name: 'PlantUML (@plantuml/core)', version: '1.2026.10', license: 'MIT', url: 'https://plantuml.com/' },
	{ name: 'Twemoji graphics', version: 'in PlantUML 1.2026.10', license: 'CC-BY 4.0', url: 'https://github.com/twitter/twemoji' },
	{ name: 'Open Iconic', version: 'in PlantUML 1.2026.10', license: 'MIT', url: 'https://github.com/iconic/open-iconic' },
	{ name: 'DOMPurify', version: '3.4.17', license: 'Apache-2.0', url: 'https://github.com/cure53/DOMPurify' },
	{ name: 'regenerator-runtime', version: 'in DOMPurify 3.4.17', license: 'MIT', url: 'https://github.com/facebook/regenerator' },
];

/** One line per component: "PlantUML (@plantuml/core) 1.2026.10 - MIT - https://plantuml.com/". */
export function thirdPartyLines(): string[] {
	return THIRD_PARTY.map((c) => `${c.name} ${c.version} - ${c.license} - ${c.url}`);
}
