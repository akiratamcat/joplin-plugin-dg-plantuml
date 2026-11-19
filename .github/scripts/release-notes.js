// SPDX-License-Identifier: MIT
/* global require, process */
// Prints the release notes of a version: the "bundled engine, no network
// access" statement (design 21.7), then the version's section of CHANGELOG.md.
// Usage: node .github/scripts/release-notes.js 1.2.3
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) throw new Error('usage: release-notes.js <version>');

const STATEMENT = [
	'> **Bundled engine, no network access.**',
	'> The PlantUML rendering engine is bundled inside this plugin.',
	'> No external server (such as the public PlantUML server) is used, and the plugin',
	'> makes no network requests. Your diagrams are rendered locally, and the plugin',
	'> never sends your notes anywhere. It works fully offline.',
].join('\n');

const changelog = fs.readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const lines = changelog.split('\n');
const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
if (start < 0) throw new Error(`CHANGELOG.md has no section for ${version}`);
let end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
if (end < 0) end = lines.length;

process.stdout.write(`${STATEMENT}\n\n${lines.slice(start + 1, end).join('\n').trim()}\n`);
