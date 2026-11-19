// SPDX-License-Identifier: MIT
// Static check that the plugin code and the bundled engine contain no code
// that makes network requests (design 16.4 (1)). Known places are listed in
// tests/network-allowlist.json with the reason why they are safe.
import * as fs from 'fs';
import * as path from 'path';
import { countPatterns, FORBIDDEN_PATTERNS, listFiles, readAllowlist, ROOT } from './helpers/networkPatterns';

const files = [...listFiles('src', ['.ts', '.js']), ...listFiles('vendor/plantuml', ['.js'])];
const allowlist = readAllowlist();

describe('no network code (static check)', () => {
	test('there are files to check', () => {
		expect(files).toContain('vendor/plantuml/plantuml.js');
		expect(files).toContain('src/contentScript/viewer.ts');
	});

	test.each(files)('%s', (file) => {
		const found = countPatterns(fs.readFileSync(path.join(ROOT, file), 'utf8'));
		const allowed = Object.fromEntries(Object.entries(allowlist[file] || {}).map(([k, v]) => [k, v.count]));
		expect(found).toEqual(allowed);
	});

	test('the allowlist has reasons and no forbidden API', () => {
		for (const [file, entries] of Object.entries(allowlist)) {
			expect(files).toContain(file);
			for (const [name, entry] of Object.entries(entries)) {
				expect(FORBIDDEN_PATTERNS).not.toContain(name);
				expect(entry.reason.length).toBeGreaterThan(20);
			}
		}
	});

	test('the patterns find what they should', () => {
		expect(countPatterns('fetch("x"); new XMLHttpRequest(); document.createElement("img"); import(u)'))
			.toEqual({ fetch: 1, XMLHttpRequest: 1, createElement: 1, dynamicImport: 1 });
	});
});
