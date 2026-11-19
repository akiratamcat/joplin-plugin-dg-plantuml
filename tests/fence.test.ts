// SPDX-License-Identifier: MIT
import { isCloseFence, isPlantUmlLanguage, matchOpenFence, parseAliases, parseInfo } from '../src/shared/fence';

describe('isPlantUmlLanguage', () => {
	test('default names, any case', () => {
		expect(isPlantUmlLanguage('plantuml')).toBe(true);
		expect(isPlantUmlLanguage('PlantUML')).toBe(true);
		expect(isPlantUmlLanguage('puml')).toBe(true);
		expect(isPlantUmlLanguage('mermaid')).toBe(false);
		expect(isPlantUmlLanguage('')).toBe(false);
	});

	test('aliases from the settings', () => {
		const aliases = parseAliases(' UML, diagram ,, bad name, ok-1 ');
		expect(aliases).toEqual(['uml', 'diagram', 'ok-1']);
		expect(isPlantUmlLanguage('Uml', aliases)).toBe(true);
		expect(isPlantUmlLanguage('bad', aliases)).toBe(false);
	});
});

describe('parseInfo', () => {
	test('language only', () => {
		expect(parseInfo('plantuml')).toEqual({ language: 'plantuml', options: {} });
		expect(parseInfo('  PUML  ')).toEqual({ language: 'puml', options: {} });
		expect(parseInfo('')).toEqual({ language: '', options: {} });
	});

	test('known options with valid values', () => {
		expect(parseInfo('plantuml theme=dark align=left')).toEqual({ language: 'plantuml', options: { theme: 'dark', align: 'left' } });
		expect(parseInfo('plantuml THEME=None')).toEqual({ language: 'plantuml', options: { theme: 'none' } });
	});

	test('unknown options and invalid values are ignored', () => {
		expect(parseInfo('plantuml theme=blue size=3 align=middle foo')).toEqual({ language: 'plantuml', options: {} });
	});
});

describe('matchOpenFence / isCloseFence', () => {
	test('three or more backticks or tildes', () => {
		expect(matchOpenFence('```plantuml')).toEqual({ marker: '```', info: 'plantuml' });
		expect(matchOpenFence('````plantuml theme=dark')).toEqual({ marker: '````', info: 'plantuml theme=dark' });
		expect(matchOpenFence('~~~~~ puml')).toEqual({ marker: '~~~~~', info: 'puml' });
		expect(matchOpenFence('``plantuml')).toBeNull();
	});

	test('indentation up to three spaces', () => {
		expect(matchOpenFence('   ```plantuml')).not.toBeNull();
		expect(matchOpenFence('    ```plantuml')).toBeNull();
	});

	test('a backtick fence info string must not contain a backtick', () => {
		expect(matchOpenFence('```plant`uml')).toBeNull();
		expect(matchOpenFence('~~~plant`uml')).not.toBeNull();
	});

	test('close fence: same character, at least as long, nothing after it', () => {
		const open = matchOpenFence('````plantuml');
		if (!open) throw new Error('no fence');
		expect(isCloseFence('````', open)).toBe(true);
		expect(isCloseFence('`````  ', open)).toBe(true);
		expect(isCloseFence('```', open)).toBe(false); // shorter: ``` inside a ```` block
		expect(isCloseFence('~~~~', open)).toBe(false);
		expect(isCloseFence('```` x', open)).toBe(false);
	});
});
