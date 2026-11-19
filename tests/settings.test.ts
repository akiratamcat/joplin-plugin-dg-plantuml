// SPDX-License-Identifier: MIT
import { buildViewerConfig, KEYS, parseCustomPreamble, resolvePreset, SETTINGS } from '../src/settings';
import { DEFAULT_VIEWER_CONFIG, normalizeConfig } from '../src/contentScript/viewerConfig';

/** Setting values as Joplin returns them, from the defaults of SETTINGS. */
function defaults(): Record<string, unknown> {
	return Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.value]));
}

describe('SETTINGS', () => {
	test('every key is registered once, in the plugin section', () => {
		expect(Object.keys(SETTINGS).sort()).toEqual(Object.values(KEYS).sort());
		for (const item of Object.values(SETTINGS)) {
			expect(item.section).toBe('dgPlantuml');
			expect(item.public).toBe(true);
			expect(item.label.length).toBeGreaterThan(0);
		}
	});

	test('enum defaults are among the options', () => {
		for (const item of Object.values(SETTINGS)) {
			if (item.isEnum) expect(Object.keys(item.options || {})).toContain(item.value);
		}
	});

	test('the default settings give the viewer defaults (design 9, D-08)', () => {
		const config = buildViewerConfig(defaults());
		expect({ ...config, settingsVersion: '' }).toEqual({ ...DEFAULT_VIEWER_CONFIG, settingsVersion: '' });
	});
});

describe('buildViewerConfig', () => {
	test('any change gives a new settings version; the same values the same one', () => {
		const base = buildViewerConfig(defaults());
		expect(buildViewerConfig(defaults()).settingsVersion).toBe(base.settingsVersion);
		for (const [key, value] of [[KEYS.themeMode, 'dark'], [KEYS.transparentBackground, false], [KEYS.minFontSizePx, 0], [KEYS.fontFamily, 'Noto Sans']] as const) {
			expect(buildViewerConfig({ ...defaults(), [key]: value }).settingsVersion).not.toBe(base.settingsVersion);
		}
	});

	test('custom presets', () => {
		const config = buildViewerConfig({
			...defaults(),
			[KEYS.lightPreset]: 'custom',
			[KEYS.lightCustomPreamble]: 'skinparam ArrowColor #888\\nskinparam shadowing false',
			[KEYS.darkPreset]: 'custom',
			[KEYS.darkCustomPreamble]: '',
		});
		expect(config.presets.light).toEqual({ lines: ['skinparam ArrowColor #888', 'skinparam shadowing false'], engineDark: false });
		expect(config.presets.dark).toEqual({ lines: [], engineDark: false });
	});

	test('wrong types fall back to the defaults', () => {
		const config = buildViewerConfig({ [KEYS.themeMode]: 'blue', [KEYS.cacheSize]: 'many', [KEYS.fontFamily]: 3 });
		expect(config.themeMode).toBe('auto');
		expect(config.cacheSize).toBe(DEFAULT_VIEWER_CONFIG.cacheSize);
		expect(config.fontFamily).toBe('');
	});
});

describe('parseCustomPreamble / resolvePreset', () => {
	test('\\n (backslash n) and real line breaks separate lines; blank lines are dropped', () => {
		expect(parseCustomPreamble('a\\nb\n c \r\n\\n')).toEqual(['a', 'b', 'c']);
		expect(parseCustomPreamble('')).toEqual([]);
	});

	test('presets', () => {
		expect(resolvePreset('plantuml-default', '', 'dark')).toEqual({ lines: [], engineDark: false });
		expect(resolvePreset('plantuml-dark', '', 'light')).toEqual({ lines: [], engineDark: true });
		expect(resolvePreset('unknown', '', 'light')).toEqual({ lines: [], engineDark: false });
		expect(resolvePreset('unknown', '', 'dark')).toEqual({ lines: [], engineDark: true });
	});
});

describe('normalizeConfig', () => {
	test('a valid config is kept', () => {
		const config = buildViewerConfig({ ...defaults(), [KEYS.themeMode]: 'light' });
		expect(normalizeConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
	});

	test('bad values are replaced by the defaults', () => {
		const config = normalizeConfig({
			themeMode: 'x', presets: { light: { lines: ['ok', 3], engineDark: 'no' } }, minFontSizePx: -1,
			renderTimeoutMs: 1.5, cacheSize: 0, settingsVersion: 7,
		});
		expect(config.themeMode).toBe('auto');
		expect(config.presets.light).toEqual({ lines: ['ok'], engineDark: false });
		expect(config.presets.dark).toEqual(DEFAULT_VIEWER_CONFIG.presets.dark);
		expect(config.minFontSizePx).toBe(DEFAULT_VIEWER_CONFIG.minFontSizePx);
		expect(config.renderTimeoutMs).toBe(DEFAULT_VIEWER_CONFIG.renderTimeoutMs);
		expect(config.cacheSize).toBe(DEFAULT_VIEWER_CONFIG.cacheSize);
		expect(config.settingsVersion).toBe(DEFAULT_VIEWER_CONFIG.settingsVersion);
		expect(normalizeConfig(null)).toEqual(DEFAULT_VIEWER_CONFIG);
	});
});
