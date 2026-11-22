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

	test('manifest icons are PNG files in the repository (paths from the repository root)', () => {
		expect(Object.keys(manifest.icons).sort()).toEqual(['128', '16', '32', '48']);
		for (const [size, file] of Object.entries<string>(manifest.icons)) {
			const data = fs.readFileSync(path.join(root, file));
			// PNG signature, then the IHDR width and height.
			expect(data.subarray(1, 4).toString('latin1')).toBe('PNG');
			expect(data.readUInt32BE(16)).toBe(Number(size));
			expect(data.readUInt32BE(20)).toBe(Number(size));
		}
	});

	test('manifest screenshots are PNG files in the repository, each with a label', () => {
		expect(manifest.screenshots.length).toBeGreaterThan(0);
		for (const shot of manifest.screenshots as { src: string; label: string }[]) {
			expect(shot.label).toBeTruthy();
			expect(fs.readFileSync(path.join(root, shot.src)).subarray(1, 4).toString('latin1')).toBe('PNG');
		}
	});

	test('no e-mail address in public metadata', () => {
		const text = JSON.stringify({ pkg, manifest });
		expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
	});
});
