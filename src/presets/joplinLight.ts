// SPDX-License-Identifier: MIT
// Preset joplin-light (design 8.4): PlantUML's standard look with the text and
// line colours of Joplin's light theme. Only the text, the lines, sequence
// diagram participants and notes are changed. Start and end nodes, class
// icons and other colours that carry meaning are kept.
export const JOPLIN_LIGHT_LINES = [
	'<style>',
	'root {',
	'  FontColor #32373F',
	'  LineColor #5F6B7A',
	'}',
	'participant {',
	'  BackGroundColor #F4F5F6',
	'}',
	'actor {',
	'  BackGroundColor #F4F5F6',
	'}',
	'note {',
	'  BackGroundColor #FFF8DC',
	'  LineColor #C9B458',
	'}',
	'</style>',
	'skinparam shadowing false',
];
