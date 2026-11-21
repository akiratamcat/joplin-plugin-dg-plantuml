// SPDX-License-Identifier: MIT
/* global require, process */
// Prints the release notes of a version, English first and Japanese after it:
// the "bundled engine, no network access" statement (design 21.7), then the
// version's section of CHANGELOG.md; the same in Japanese from CHANGELOG.ja.md.
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

const STATEMENT_JA = [
	'> **描画エンジン内蔵・外部通信なし**',
	'> PlantUML の描画エンジンをプラグインに内蔵しています。',
	'> PlantUML の公開サーバーなどの外部サーバーは使わず、プラグインはネットワーク通信を一切行いません。',
	'> 図は手元で描画され、ノートの内容が本プラグインによって外部に送られることはありません。オフラインでも動作します。',
].join('\n');

/** The "## [version]" section of a changelog, without its heading. */
function section(file) {
	const changelog = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8').replace(/\r\n/g, '\n');
	const lines = changelog.split('\n');
	const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
	if (start < 0) throw new Error(`${file} has no section for ${version}`);
	let end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
	if (end < 0) end = lines.length;
	return lines.slice(start + 1, end).join('\n').trim();
}

const en = section('CHANGELOG.md');
const ja = section('CHANGELOG.ja.md');
process.stdout.write(`## English\n\n${STATEMENT}\n\n${en}\n\n---\n\n## 日本語\n\n${STATEMENT_JA}\n\n${ja}\n`);
