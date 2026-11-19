// SPDX-License-Identifier: MIT
// Package checks (design 16.1, 21.2): manifest.json and package.json agree.
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8'));

describe('package metadata', () => {
	test('manifest and package.json have the same version', () => {
		expect(manifest.version).toBe(pkg.version);
	});

	test('npm package name follows the Joplin plugin repository rules', () => {
		expect(pkg.name).toBe('joplin-plugin-dg-plantuml');
		expect(pkg.name).toMatch(/^joplin-plugin-[a-z0-9-]+$/);
		expect(pkg.keywords).toContain('joplin-plugin');
		expect(pkg.files).toContain('publish');
	});

	test('manifest has the decided ID, name and minimum version', () => {
		expect(manifest.id).toBe('io.github.akiratamcat.dg-plantuml');
		expect(manifest.name).toBe('dg-plantuml');
		expect(manifest.app_min_version).toBe('3.1');
	});

	test('no e-mail address in public metadata', () => {
		const text = JSON.stringify({ pkg, manifest });
		expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
	});
});
