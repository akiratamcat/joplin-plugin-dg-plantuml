// SPDX-License-Identifier: MIT
// Test helpers: CSS that loads an external URL, put into every place of the
// PlantUML source where a user writes a colour, a font or other text that
// could reach the SVG (design 12, 16.4). Three forms:
// - "url":  a CSS url() as the whole value
// - "attr": a declaration added after ";" (style attributes)
// - "rule": a rule added after "}" (<style> elements)
// Each place gets its own URL, so a failing test names the place.
// With @plantuml/core 1.2026.10 the engine drops these values or reports an
// error (checked for 1.0.1); the test guards later engine versions.

export type InjectionForm = 'url' | 'attr' | 'rule';
export const INJECTION_FORMS: InjectionForm[] = ['url', 'attr', 'rule'];

/** Diagrams with "P" where the injected value goes. */
export const INJECTION_PLACES: Record<string, string> = {
	'skinparam backgroundColor': 'skinparam backgroundColor P\nA -> B',
	'skinparam defaultFontName': 'skinparam defaultFontName P\nA -> B : hi',
	'skinparam defaultFontName (quoted)': 'skinparam defaultFontName "P"\nA -> B : hi',
	'skinparam defaultFontColor': 'skinparam defaultFontColor P\nA -> B : hi',
	'skinparam classBackgroundColor': 'skinparam classBackgroundColor P\nclass A',
	'skinparam ArrowColor': 'skinparam ArrowColor P\nA -> B',
	'skinparam activityFontName': 'skinparam activityFontName P\nstart\n:step;\nstop',
	'style BackGroundColor': '<style>\nroot {\n BackGroundColor P\n}\n</style>\nA -> B',
	'style FontName': '<style>\nroot {\n FontName P\n}\n</style>\nA -> B : hi',
	'style FontColor': '<style>\nroot {\n FontColor P\n}\n</style>\nA -> B : hi',
	'style LineColor': '<style>\nroot {\n LineColor P\n}\n</style>\nA -> B',
	'style class': '<style>\nclassDiagram {\n class {\n  BackGroundColor P\n  FontName P\n }\n}\n</style>\nclass A',
	'style json': '@startjson\n<style>\njsonDiagram { node { BackGroundColor P } }\n</style>\n{"a": 1}\n@endjson',
	'creole font': 'A -> B : <font:P>hi</font>',
	'creole font face': 'A -> B : <font face="P">hi</font>',
	'creole font color': 'A -> B : <font color="P">hi</font>',
	'creole color': 'A -> B : <color:P>hi</color>',
	'creole back': 'A -> B : <back:P>hi</back>',
	'creole underline': 'A -> B : <u:P>hi</u>',
	'creole strike': 'A -> B : <s:P>hi</s>',
	'creole wave': 'A -> B : <w:P>hi</w>',
	'title font': 'title <font:P>T</font>\nA -> B',
	'element colour': 'class A #P',
	'element line colour': 'class A ##P',
	'note colour': 'note "n" as N #P',
	'gradient': 'class A #red/P',
	'mind map node': '@startmindmap\n*[#P] root\n@endmindmap',
	'activity colour': 'start\n#P:step;\nstop',
	'gantt colour': '@startgantt\n[T] lasts 2 days\n[T] is colored in P\n@endgantt',
	'salt colour': '@startsalt\n{ <color:P>x</color> }\n@endsalt',
	'stereotype': 'class A <<P>>',
	'link': 'A -> B : [[P link]]',
	'svgLinkTarget': 'skinparam svgLinkTarget P\nA -> B : [[https://example.org x]]',
	'image': 'A -> B : <img:P>',
};

export function payload(form: InjectionForm, place: string): string {
	const url = `https://example.com/${encodeURIComponent(place)}.png`;
	if (form === 'url') return `url(${url})`;
	if (form === 'attr') return `red;mask-image:image-set('${url}' 1x);cursor:image-set("${url}" 1x),auto`;
	return `red;}svg{mask-image:image-set('${url}' 1x)}.x{fill:red`;
}

/** The diagram of `place` with the injected value. */
export function injectedSource(place: string, form: InjectionForm): string {
	return INJECTION_PLACES[place].split('P').join(payload(form, place));
}
