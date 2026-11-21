// SPDX-License-Identifier: MIT
// Plugin settings (design 9) and the config the viewer gets from them.
// The labels are English until stage 3 (i18n).
import { SettingItem, SettingItemType } from 'api/types';
import { DEFAULT_VIEWER_CONFIG, PresetConfig, ViewerConfig } from './contentScript/viewerConfig';
import { BUILTIN_THEMES, DARK_THEMES, LIGHT_THEMES } from './presets/builtinThemes';
import { JOPLIN_LIGHT_LINES } from './presets/joplinLight';
import { hashString } from './shared/hash';

export const SECTION = 'dgPlantuml';

export const KEYS = {
	themeMode: 'plantuml.themeMode',
	lightPreset: 'plantuml.lightPreset',
	darkPreset: 'plantuml.darkPreset',
	transparentBackground: 'plantuml.transparentBackground',
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

function builtinOptions(names: string[]): Record<string, string> {
	return Object.fromEntries(names.map((name) => [`builtin:${name}`, `PlantUML theme: ${BUILTIN_THEMES[name]}`]));
}

/**
 * Preset IDs offered for each theme (design 8.4). Only the built-in themes
 * that are readable on that kind of page are offered (LIGHT_THEMES /
 * DARK_THEMES). Any builtin:<name> still works if it is set (resolvePreset).
 */
export const LIGHT_PRESETS: Record<string, string> = {
	'plantuml-default': 'PlantUML standard (light colours, default)',
	'joplin-light': 'Joplin light (light colours)',
	...builtinOptions(LIGHT_THEMES),
	custom: 'Custom (preamble below)',
};

export const DARK_PRESETS: Record<string, string> = {
	'plantuml-dark': 'PlantUML dark (dark colours, default)',
	'plantuml-default': 'PlantUML standard (light colours)',
	...builtinOptions(DARK_THEMES),
	custom: 'Custom (preamble below)',
};

const d = DEFAULT_VIEWER_CONFIG;

export const SETTINGS: Record<string, SettingItem> = {
	[KEYS.themeMode]: {
		section: SECTION,
		public: true,
		type: SettingItemType.String,
		isEnum: true,
		value: 'auto',
		options: { auto: 'Auto (follow Joplin\'s theme)', light: 'Light', dark: 'Dark' },
		label: 'Diagram theme',
		description: 'Auto chooses the light or dark style from the background of the note viewer.',
	},
	[KEYS.lightPreset]: {
		section: SECTION,
		public: true,
		type: SettingItemType.String,
		isEnum: true,
		value: 'plantuml-default',
		options: LIGHT_PRESETS,
		label: 'Style for the light theme',
		description: 'Used on a light note viewer. Dark colours on a light page are hard to read.',
	},
	[KEYS.darkPreset]: {
		section: SECTION,
		public: true,
		type: SettingItemType.String,
		isEnum: true,
		value: 'plantuml-dark',
		options: DARK_PRESETS,
		label: 'Style for the dark theme',
		description: 'Used on a dark note viewer. Light colours on a dark page are hard to read.',
	},
	[KEYS.transparentBackground]: {
		section: SECTION,
		public: true,
		type: SettingItemType.Bool,
		value: d.transparentBackground,
		label: 'Transparent diagram background',
	},
	[KEYS.matchNoteFontSize]: {
		section: SECTION,
		public: true,
		type: SettingItemType.Bool,
		value: d.matchNoteFontSize,
		label: 'Match the font size of the note',
		description: 'Uses the font size of the note text as the base font size of diagrams.',
	},
	[KEYS.minFontSizePx]: {
		section: SECTION,
		public: true,
		type: SettingItemType.Int,
		value: d.minFontSizePx,
		minimum: 0,
		maximum: 100,
		step: 1,
		label: 'Minimum font size when scaled down (px)',
		description: 'Wide diagrams are not scaled down below this font size; they scroll sideways instead. 0: no limit.',
	},
	[KEYS.lightCustomPreamble]: {
		section: SECTION,
		public: true,
		advanced: true,
		type: SettingItemType.String,
		value: '',
		label: 'Custom preamble for the light theme',
		description: 'Used when the light style is "Custom". PlantUML lines added after @startuml. Write \\n between lines.',
	},
	[KEYS.darkCustomPreamble]: {
		section: SECTION,
		public: true,
		advanced: true,
		type: SettingItemType.String,
		value: '',
		label: 'Custom preamble for the dark theme',
		description: 'Used when the dark style is "Custom". PlantUML lines added after @startuml. Write \\n between lines.',
	},
	[KEYS.fontFamily]: {
		section: SECTION,
		public: true,
		advanced: true,
		type: SettingItemType.String,
		value: d.fontFamily,
		label: 'Diagram font',
		description: 'Font name for diagrams. Empty: the default font.',
	},
	[KEYS.fenceAliases]: {
		section: SECTION,
		public: true,
		advanced: true,
		type: SettingItemType.String,
		value: '',
		label: 'Other language names',
		description: 'Code block languages that are also drawn as PlantUML, separated by commas. "plantuml" and "puml" always work.',
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
		label: 'Time limit per diagram (ms)',
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
		label: 'Maximum source length (characters)',
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
		label: 'Number of diagrams kept in the cache',
	},
};

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

/** Builds the viewer config from the setting values (keys of KEYS). */
export function buildViewerConfig(values: Record<string, unknown>): ViewerConfig {
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
		renderTimeoutMs: typeof values[KEYS.renderTimeoutMs] === 'number' ? values[KEYS.renderTimeoutMs] as number : d.renderTimeoutMs,
		maxSourceLength: typeof values[KEYS.maxSourceLength] === 'number' ? values[KEYS.maxSourceLength] as number : d.maxSourceLength,
		cacheSize: typeof values[KEYS.cacheSize] === 'number' ? values[KEYS.cacheSize] as number : d.cacheSize,
		debounceMs: d.debounceMs,
		settingsVersion: '',
	};
	// Any change of the settings gives a new version, so cached diagrams are drawn again.
	config.settingsVersion = hashString(JSON.stringify({ ...config, settingsVersion: '' }));
	return config;
}
