// SPDX-License-Identifier: MIT
import { CONTEXT_SEPARATOR, format, PLURAL_RULES, resolveLocale, SUPPORTED_LOCALES, Translator } from '../src/i18n/gettext';

describe('resolveLocale (design 10.3)', () => {
	test.each([
		['ja_JP', 'ja'],
		['en_GB', 'en'],
		['zh_CN', 'zh_CN'],
		['zh_TW', 'zh_TW'],
		['zh_HK', 'zh_TW'],
		['zh_SG', 'zh_CN'],
		['pt_BR', 'pt_BR'],
		['pt_PT', 'pt_BR'],
		['fr_CA', 'fr'],
		['de', 'de'],
		['ru_RU', 'ru'],
		['ko-KR', 'ko'],
		['nl_NL', 'en'],
		['', 'en'],
	])('%s -> %s', (input, expected) => {
		expect(resolveLocale(input)).toBe(expected);
	});

	test('only available locales are chosen', () => {
		expect(resolveLocale('ja_JP', ['en'])).toBe('en');
	});
});

describe('format', () => {
	test('named placeholders', () => {
		expect(format('Line {line}: {message}', { line: 3, message: 'bad' })).toBe('Line 3: bad');
		expect(format('{a} {unknown}', { a: 1 })).toBe('1 {unknown}');
		expect(format('no params')).toBe('no params');
	});
});

describe('Translator', () => {
	const ja = new Translator('ja', {
		'PlantUML error': ['PlantUML のエラー'],
		'Line {line}: {message}': ['{line} 行目: {message}'],
		'{count} character': ['{count} 文字'],
		'Empty translation': [''],
		[`Diagram theme${CONTEXT_SEPARATOR}Light`]: ['ライト'],
	});

	test('_ translates, and keeps English when there is no translation', () => {
		expect(ja._('PlantUML error')).toBe('PlantUML のエラー');
		expect(ja._('Line {line}: {message}', { line: 2, message: 'x' })).toBe('2 行目: x');
		expect(ja._('Not translated {x}', { x: 1 })).toBe('Not translated 1');
		expect(ja._('Empty translation')).toBe('Empty translation');
	});

	test('ngettext with one plural form', () => {
		expect(ja.ngettext('{count} character', '{count} characters', 5)).toBe('5 文字');
	});

	test('ngettext: English and Russian forms', () => {
		const en = new Translator('en', null);
		expect(en.ngettext('{count} character', '{count} characters', 1)).toBe('1 character');
		expect(en.ngettext('{count} character', '{count} characters', 0)).toBe('0 characters');
		const ru = new Translator('ru', { '{count} character': ['{count} символ', '{count} символа', '{count} символов'] });
		expect([1, 2, 5, 11, 21, 22, 25].map((n) => ru.ngettext('{count} character', '{count} characters', n))).toEqual([
			'1 символ', '2 символа', '5 символов', '11 символов', '21 символ', '22 символа', '25 символов',
		]);
	});

	test('French and Brazilian Portuguese treat 0 as singular', () => {
		expect(PLURAL_RULES.fr.index(0)).toBe(0);
		expect(PLURAL_RULES.pt_BR.index(0)).toBe(0);
		expect(PLURAL_RULES.de.index(0)).toBe(1);
	});

	test('pgettext', () => {
		expect(ja.pgettext('Diagram theme', 'Light')).toBe('ライト');
		expect(ja.pgettext('Other', 'Light')).toBe('Light');
	});

	test('every supported locale has a plural rule', () => {
		for (const locale of SUPPORTED_LOCALES) expect(PLURAL_RULES[locale]).toBeDefined();
	});
});
