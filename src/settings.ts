// SPDX-License-Identifier: MIT
// Plugin settings (design 9) and the config the viewer gets from them.
// Labels, descriptions and option names are translated (design 10).
import { SettingItem, SettingItemType } from 'api/types';
import { DEFAULT_VIEWER_CONFIG, PresetConfig, ViewerConfig } from './contentScript/viewerConfig';
import { Catalog, ENGLISH, Translator } from './i18n/gettext';
import { BUILTIN_THEMES, DARK_THEMES, LIGHT_THEMES } from './presets/builtinThemes';
import { JOPLIN_LIGHT_LINES } from './presets/joplinLight';
import { hashString } from './shared/hash';

export const SECTION = 'dgPlantuml';

export const KEYS = {
	themeMode: 'plantuml.themeMode',
	lightPreset: 'plantuml.lightPreset',
	darkPreset: 'plantuml.darkPreset',
	transparentBackground: 'plantuml.transparentBackground',
	showToolbar: 'plantuml.showToolbar',
	matchNoteFontSize: 'plantuml.matchNoteFontSize',
	minFontSizePx: 'plantuml.minFontSizePx',
	lightCustomPreamble: 'plantuml.lightCustomPreamble',
	darkCustomPreamble: 'plantuml.darkCustomPreamble',
	fontFamily: 'plantuml.fontFamily',
	fenceAliases: 'plantuml.fenceAliases',
	renderTimeoutMs: 'plantuml.renderTimeoutMs',
	maxSourceLength: 'plantuml.maxSourceLength',
	cacheSize: 'plantuml.cacheSize',
} as const;

function builtinOptions(t: Translator, names: string[]): Record<string, string> {
	return Object.fromEntries(names.map((name) => [
		`builtin:${name}`,
		// TRANSLATORS: {name} is the name of a built-in PlantUML theme, for example "Cyborg". Theme names are not translated.
		t._('PlantUML theme: {name}', { name: BUILTIN_THEMES[name] }),
	]));
}

/**
 * Preset IDs offered for the light theme (design 8.4). Only the built-in
 * themes that are readable on a light page are offered (LIGHT_THEMES). Any
 * builtin:<name> still works if it is set (resolvePreset).
 */
export function lightPresets(t: Translator = ENGLISH): Record<string, string> {
	return {
		// TRANSLATORS: Name of a diagram style. "PlantUML" is not translated.
		'plantuml-default': t._('PlantUML standard (light colours, default)'),
		// TRANSLATORS: Name of a diagram style. "Joplin" is not translated.
		'joplin-light': t._('Joplin light (light colours)'),
		...builtinOptions(t, LIGHT_THEMES),
		custom: t._('Custom (preamble below)'),
	};
}

/** Preset IDs offered for the dark theme (design 8.4). */
export function darkPresets(t: Translator = ENGLISH): Record<string, string> {
	return {
		// TRANSLATORS: Name of a diagram style. "PlantUML" is not translated.
		'plantuml-dark': t._('PlantUML dark (dark colours, default)'),
		// TRANSLATORS: Name of a diagram style. "PlantUML" is not translated.
		'plantuml-default': t._('PlantUML standard (light colours)'),
		...builtinOptions(t, DARK_THEMES),
		custom: t._('Custom (preamble below)'),
	};
}

/** English option names (for tests and the defaults). */
export const LIGHT_PRESETS = lightPresets();
export const DARK_PRESETS = darkPresets();

const d = DEFAULT_VIEWER_CONFIG;

/** The settings of design 9, in the language of t. */
export function settingItems(t: Translator = ENGLISH): Record<string, SettingItem> {
	return {
		[KEYS.themeMode]: {
			section: SECTION,
			public: true,
			type: SettingItemType.String,
			isEnum: true,
			value: 'auto',
			options: {
				auto: t._('Auto (follow Joplin\'s theme)'),
				// TRANSLATORS: A value of the setting "Diagram theme".
				light: t.pgettext('Diagram theme', 'Light'),
				// TRANSLATORS: A value of the setting "Diagram theme".
				dark: t.pgettext('Diagram theme', 'Dark'),
			},
			label: t._('PlantUML diagram theme'),
			description: t._('When set to "Auto", the light or dark style is chosen automatically from the background of the note viewer.'),
		},
		[KEYS.lightPreset]: {
			section: SECTION,
			public: true,
			type: SettingItemType.String,
			isEnum: true,
			value: 'plantuml-default',
			options: lightPresets(t),
			label: t._('Style for the light theme'),
			description: t._('Used on a light note viewer. Dark colours on a light page are hard to read.'),
		},
		[KEYS.darkPreset]: {
			section: SECTION,
			public: true,
			type: SettingItemType.String,
			isEnum: true,
			value: 'plantuml-dark',
			options: darkPresets(t),
			label: t._('Style for the dark theme'),
			description: t._('Used on a dark note viewer. Light colours on a dark page are hard to read.'),
		},
		[KEYS.transparentBackground]: {
			section: SECTION,
			public: true,
			type: SettingItemType.Bool,
			value: d.transparentBackground,
			label: t._('Transparent diagram background'),
		},
		[KEYS.showToolbar]: {
			section: SECTION,
			public: true,
			type: SettingItemType.Bool,
			value: d.showToolbar,
			label: t._('Show the diagram toolbar'),
			description: t._('Buttons to copy or save a diagram, shown when the mouse is over it or after a tap on it.'),
		},
		[KEYS.matchNoteFontSize]: {
			section: SECTION,
			public: true,
			type: SettingItemType.Bool,
			value: d.matchNoteFontSize,
			label: t._('Match the font size of the note'),
			description: t._('Uses the font size of the note text as the base font size of diagrams.'),
		},
		[KEYS.minFontSizePx]: {
			section: SECTION,
			public: true,
			type: SettingItemType.Int,
			value: d.minFontSizePx,
			minimum: 0,
			maximum: 100,
			step: 1,
			label: t._('Minimum font size when scaled down (px)'),
			description: t._('Wide diagrams are not scaled down below this font size; they scroll sideways instead. 0: no limit.'),
		},
		[KEYS.lightCustomPreamble]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.String,
			value: '',
			label: t._('Custom preamble for the light theme'),
			// TRANSLATORS: "@startuml" and "\n" are written as they are. "\n" is a backslash followed by the letter n.
			description: t._('Used when the light style is "Custom". PlantUML lines added after @startuml. Write \\n between lines.'),
		},
		[KEYS.darkCustomPreamble]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.String,
			value: '',
			label: t._('Custom preamble for the dark theme'),
			// TRANSLATORS: "@startuml" and "\n" are written as they are. "\n" is a backslash followed by the letter n.
			description: t._('Used when the dark style is "Custom". PlantUML lines added after @startuml. Write \\n between lines.'),
		},
		[KEYS.fontFamily]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.String,
			value: d.fontFamily,
			label: t._('Font used in diagrams'),
			description: t._('Name of the font used in diagrams. Empty: the default font.'),
		},
		[KEYS.fenceAliases]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.String,
			value: '',
			label: t._('Other language names'),
			// TRANSLATORS: The info string is the text right after the opening fence of a code block, as in ```plantuml. "plantuml" and "puml" are language names and are not translated.
			description: t._('Info strings (language names) of code fences that are drawn as PlantUML diagrams. Separate several language names with commas. "plantuml" and "puml" always work.'),
		},
		[KEYS.renderTimeoutMs]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.Int,
			value: d.renderTimeoutMs,
			minimum: 1000,
			maximum: 600000,
			step: 1000,
			label: t._('Time limit per diagram (ms)'),
		},
		[KEYS.maxSourceLength]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.Int,
			value: d.maxSourceLength,
			minimum: 1000,
			maximum: 10000000,
			step: 1000,
			label: t._('Maximum source length (characters)'),
		},
		[KEYS.cacheSize]: {
			section: SECTION,
			public: true,
			advanced: true,
			type: SettingItemType.Int,
			value: d.cacheSize,
			minimum: 1,
			maximum: 10000,
			step: 1,
			label: t._('Number of diagrams held in the cache'),
		},
	};
}

/** English settings (for tests and the defaults). */
export const SETTINGS = settingItems();

/** Section of the settings screen, in the language of t. */
export function settingsSection(t: Translator = ENGLISH) {
	return {
		label: 'dg-plantuml',
		iconName: 'fas fa-project-diagram',
		description: t._('A plugin that renders PlantUML. The PlantUML rendering engine is built in, and the plugin makes no network connections to the outside.'),
	};
}

/** Locale and translations the viewer needs (design 10.4). */
export interface ViewerLanguage {
	locale: string;
	catalog: Catalog;
}

/**
 * Lines of a custom preamble. The settings screen has one-line inputs, so
 * "\n" (backslash + n) separates lines; real line breaks work too.
 */
export function parseCustomPreamble(text: string): string[] {
	return text
		.split(/\\n|\r\n|\r|\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

/** Preset of a theme (design 8.4). Unknown IDs fall back to the default of the theme. */
export function resolvePreset(id: string, customText: string, theme: 'light' | 'dark'): PresetConfig {
	switch (id) {
	case 'plantuml-default':
		return { lines: [], engineDark: false };
	case 'plantuml-dark':
		return { lines: [], engineDark: true };
	case 'joplin-light':
		return { lines: JOPLIN_LIGHT_LINES.slice(), engineDark: false };
	case 'custom':
		return { lines: parseCustomPreamble(customText), engineDark: false };
	default:
		if (id.startsWith('builtin:') && Object.prototype.hasOwnProperty.call(BUILTIN_THEMES, id.slice(8))) {
			return { lines: [], engineDark: false, theme: id.slice(8) };
		}
		return theme === 'dark' ? { lines: [], engineDark: true } : { lines: [], engineDark: false };
	}
}

function str(v: unknown, fallback: string): string {
	return typeof v === 'string' ? v : fallback;
}

/**
 * Builds the viewer config from the setting values (keys of KEYS) and the
 * language of the viewer (design 10.4).
 */
export function buildViewerConfig(values: Record<string, unknown>, language: ViewerLanguage = { locale: 'en', catalog: {} }): ViewerConfig {
	const config: ViewerConfig = {
		themeMode: (['auto', 'light', 'dark'] as const).find((m) => m === values[KEYS.themeMode]) || d.themeMode,
		presets: {
			light: resolvePreset(str(values[KEYS.lightPreset], 'plantuml-default'), str(values[KEYS.lightCustomPreamble], ''), 'light'),
			dark: resolvePreset(str(values[KEYS.darkPreset], 'plantuml-dark'), str(values[KEYS.darkCustomPreamble], ''), 'dark'),
		},
		transparentBackground: typeof values[KEYS.transparentBackground] === 'boolean' ? values[KEYS.transparentBackground] as boolean : d.transparentBackground,
		fontFamily: str(values[KEYS.fontFamily], d.fontFamily).trim(),
		matchNoteFontSize: typeof values[KEYS.matchNoteFontSize] === 'boolean' ? values[KEYS.matchNoteFontSize] as boolean : d.matchNoteFontSize,
		minFontSizePx: typeof values[KEYS.minFontSizePx] === 'number' ? values[KEYS.minFontSizePx] as number : d.minFontSizePx,
		showToolbar: typeof values[KEYS.showToolbar] === 'boolean' ? values[KEYS.showToolbar] as boolean : d.showToolbar,
		renderTimeoutMs: typeof values[KEYS.renderTimeoutMs] === 'number' ? values[KEYS.renderTimeoutMs] as number : d.renderTimeoutMs,
		maxSourceLength: typeof values[KEYS.maxSourceLength] === 'number' ? values[KEYS.maxSourceLength] as number : d.maxSourceLength,
		cacheSize: typeof values[KEYS.cacheSize] === 'number' ? values[KEYS.cacheSize] as number : d.cacheSize,
		debounceMs: d.debounceMs,
		locale: language.locale,
		catalog: language.catalog,
		settingsVersion: '',
	};
	// Any change of the settings gives a new version, so cached diagrams are drawn
	// again. The catalog follows the locale, so only the locale is hashed.
	config.settingsVersion = hashString(JSON.stringify({ ...config, catalog: undefined, settingsVersion: '' }));
	return config;
}
