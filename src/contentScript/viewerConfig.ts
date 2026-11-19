// SPDX-License-Identifier: MIT
// Settings the viewer uses. Stage 1 (MVP) uses the defaults below; stage 2
// gets them from the main script (getConfig, design 7.2 step 2).

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface PresetConfig {
	/** Preamble lines of the preset (empty for plantuml-default / plantuml-dark). */
	lines: string[];
	/** Use the engine's dark option (plantuml-dark). */
	engineDark: boolean;
}

export interface ViewerConfig {
	themeMode: ThemeMode;
	presets: { light: PresetConfig; dark: PresetConfig };
	transparentBackground: boolean;
	fontFamily: string;
	renderTimeoutMs: number;
	maxSourceLength: number;
	cacheSize: number;
	/** Delay before rendering a block that is being edited (design 7.3). */
	debounceMs: number;
	/** Increases when the settings change. Part of the cache key. */
	settingsVersion: number;
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
	renderTimeoutMs: 10000,
	maxSourceLength: 100000,
	cacheSize: 100,
	debounceMs: 300,
	settingsVersion: 0,
};
