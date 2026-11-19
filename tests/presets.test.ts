// SPDX-License-Identifier: MIT
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { BUILTIN_THEMES } from '../src/presets/builtinThemes';
import { JOPLIN_LIGHT_LINES } from '../src/presets/joplinLight';
import { buildPreamble } from '../src/contentScript/preamble';
import { normalizeConfig } from '../src/contentScript/viewerConfig';
import { DARK_PRESETS, LIGHT_PRESETS, resolvePreset } from '../src/settings';

describe('built-in themes', () => {
	test('the list matches the bundled themes.js (regenerate it when the engine is updated)', () => {
		const context: Record<string, unknown> = {};
		context.globalThis = context;
		vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'vendor', 'plantuml', 'themes.js'), 'utf8'), context);
		const themes = context.PLANTUML_THEMES as Record<string, string>;
		const expected = Object.fromEntries(Object.keys(themes).filter((k) => k !== '_none_').sort().map((k) => {
			const m = themes[k].match(/^display_name:\s*(.*)$/m);
			return [k, m ? m[1].trim() : k];
		}));
		expect(BUILTIN_THEMES).toEqual(expected);
	});

	test('offered for both themes', () => {
		for (const name of Object.keys(BUILTIN_THEMES)) {
			expect(LIGHT_PRESETS).toHaveProperty(`builtin:${name}`);
			expect(DARK_PRESETS).toHaveProperty(`builtin:${name}`);
		}
	});
});

describe('resolvePreset', () => {
	test('joplin-light', () => {
		expect(resolvePreset('joplin-light', '', 'light')).toEqual({ lines: JOPLIN_LIGHT_LINES, engineDark: false });
	});

	test('builtin:<name>', () => {
		expect(resolvePreset('builtin:cerulean', '', 'light')).toEqual({ lines: [], engineDark: false, theme: 'cerulean' });
		// Unknown names fall back to the default of the theme.
		expect(resolvePreset('builtin:no-such-theme', '', 'dark')).toEqual({ lines: [], engineDark: true });
		expect(resolvePreset('builtin:__proto__', '', 'light')).toEqual({ lines: [], engineDark: false });
	});
});

describe('the !theme line', () => {
	const base = { presetLines: ['skinparam x y'], transparentBackground: true, fontFamily: 'Noto Sans', fontSizePx: 14, smetana: true, noStyle: false };

	test('right after the Smetana line, before the preset lines and the settings that must win over it', () => {
		expect(buildPreamble('uml', '', { ...base, presetTheme: 'cerulean' })).toEqual([
			'!pragma layout smetana',
			'!theme cerulean',
			'skinparam x y',
			'skinparam backgroundColor transparent',
			'skinparam defaultFontName Noto Sans',
			'skinparam defaultFontSize 14',
		]);
	});

	test('not with theme=none, and not with a bad name', () => {
		expect(buildPreamble('uml', '', { ...base, presetTheme: 'cerulean', noStyle: true })).toEqual(['!pragma layout smetana']);
		expect(buildPreamble('uml', '', { ...base, presetTheme: 'x\n!include y' })).not.toContain('!include y');
		expect(buildPreamble('uml', '', { ...base, presetTheme: 'x\n!include y' }).join('\n')).not.toMatch(/!theme/);
	});

	test('the viewer drops bad theme names it receives', () => {
		const config = normalizeConfig({ presets: { light: { lines: [], engineDark: false, theme: 'cerulean' }, dark: { lines: [], engineDark: true, theme: 'a b' } } });
		expect(config.presets.light.theme).toBe('cerulean');
		expect(config.presets.dark.theme).toBeUndefined();
	});
});
