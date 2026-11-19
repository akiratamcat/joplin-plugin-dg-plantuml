// SPDX-License-Identifier: MIT
// Settings the viewer uses (design 7.2 step 2, 9). The main script builds
// them from the plugin settings and sends them as the answer to getConfig.
// The defaults are used until the answer arrives, and when there is no main
// script (for example in the rendering tests).

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface PresetConfig {
	/** Preamble lines of the preset (empty for plantuml-default / plantuml-dark). */
	lines: string[];
	/** Use the engine's dark option (plantuml-dark). */
	engineDark: boolean;
	/** Built-in PlantUML theme (!theme) of a builtin:<name> preset. */
	theme?: string;
}

export interface ViewerConfig {
	themeMode: ThemeMode;
	presets: { light: PresetConfig; dark: PresetConfig };
	transparentBackground: boolean;
	fontFamily: string;
	/** Use the note's font size as the diagram's base font size (design 8.7 (1)). */
	matchNoteFontSize: boolean;
	/** Smallest font size when a diagram is scaled down. 0: no limit (design 8.7 (2)). */
	minFontSizePx: number;
	renderTimeoutMs: number;
	maxSourceLength: number;
	cacheSize: number;
	/** Delay before rendering a block that is being edited (design 7.3). */
	debounceMs: number;
	/** Changes when any setting changes. Part of the cache key. */
	settingsVersion: string;
}

/** Defaults of design chapter 9 (D-08). */
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
	themeMode: 'auto',
	presets: {
		light: { lines: [], engineDark: false }, // plantuml-default
		dark: { lines: [], engineDark: true }, // plantuml-dark
	},
	transparentBackground: true,
	fontFamily: '',
	matchNoteFontSize: true,
	minFontSizePx: 11,
	renderTimeoutMs: 10000,
	maxSourceLength: 100000,
	cacheSize: 100,
	debounceMs: 300,
	settingsVersion: 'default',
};

/** Names of built-in themes: lower case letters, digits and hyphens. */
export const THEME_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

function intIn(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function preset(value: unknown, fallback: PresetConfig): PresetConfig {
	const v = value as Partial<PresetConfig> | null;
	if (!v || typeof v !== 'object') return fallback;
	const lines = Array.isArray(v.lines) ? v.lines.filter((l): l is string => typeof l === 'string') : fallback.lines;
	const result: PresetConfig = { lines, engineDark: typeof v.engineDark === 'boolean' ? v.engineDark : fallback.engineDark };
	if (typeof v.theme === 'string' && THEME_NAME_RE.test(v.theme)) result.theme = v.theme;
	return result;
}

/**
 * Checks a config received from the main script. Values that are missing or
 * out of range are replaced by the defaults, so a bad answer cannot break
 * the viewer.
 */
export function normalizeConfig(raw: unknown): ViewerConfig {
	const d = DEFAULT_VIEWER_CONFIG;
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const presets = (r.presets && typeof r.presets === 'object' ? r.presets : {}) as Record<string, unknown>;
	return {
		themeMode: r.themeMode === 'light' || r.themeMode === 'dark' || r.themeMode === 'auto' ? r.themeMode : d.themeMode,
		presets: { light: preset(presets.light, d.presets.light), dark: preset(presets.dark, d.presets.dark) },
		transparentBackground: typeof r.transparentBackground === 'boolean' ? r.transparentBackground : d.transparentBackground,
		fontFamily: typeof r.fontFamily === 'string' ? r.fontFamily : d.fontFamily,
		matchNoteFontSize: typeof r.matchNoteFontSize === 'boolean' ? r.matchNoteFontSize : d.matchNoteFontSize,
		minFontSizePx: intIn(r.minFontSizePx, 0, 100, d.minFontSizePx),
		renderTimeoutMs: intIn(r.renderTimeoutMs, 1000, 600000, d.renderTimeoutMs),
		maxSourceLength: intIn(r.maxSourceLength, 1000, 10000000, d.maxSourceLength),
		cacheSize: intIn(r.cacheSize, 1, 10000, d.cacheSize),
		debounceMs: intIn(r.debounceMs, 0, 5000, d.debounceMs),
		settingsVersion: typeof r.settingsVersion === 'string' ? r.settingsVersion : d.settingsVersion,
	};
}
