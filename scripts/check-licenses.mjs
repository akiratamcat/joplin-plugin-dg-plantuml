// SPDX-License-Identifier: MIT
// npm run licenses:check (design 20.4):
//   1. every package that can end up in the plugin (the non-dev packages of
//      package-lock.json) has a license from the allowlist,
//   2. THIRD_PARTY_NOTICES.md is what npm run notices makes now (so a new
//      version of DOMPurify or of the engine is not forgotten),
//   3. the engine version is the same in vendor/plantuml/SOURCE.md and in
//      src/contentScript/engine.ts (part of the cache key).
// The PlantUML engine is not an npm dependency; its license is checked by
// hand when it is updated (design 20.3, vendor/plantuml/SOURCE.md).
import fs from 'node:fs';
import path from 'node:path';
import { buildNotices, engineVersion, NOTICES_FILE, ROOT } from './notices.mjs';

/** Licenses allowed in the plugin package (design 20.4). An "A OR B" expression needs one allowed choice. */
const ALLOWED = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'Apache-2.0', 'MPL-2.0'];

const problems = [];

function allowed(license) {
	if (typeof license !== 'string' || !license) return false;
	const expr = license.replace(/[()]/g, '').trim();
	return expr.split(/\s+OR\s+/i).some((choice) => ALLOWED.includes(choice.trim()));
}

// 1. Licenses of the non-dev packages.
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const shipped = Object.entries(lock.packages || {}).filter(([name, info]) => name && !info.dev);
for (const [name, info] of shipped) {
	const label = `${name.replace(/^node_modules\//, '')}@${info.version}`;
	if (!allowed(info.license)) problems.push(`${label}: license "${info.license}" is not in the allowlist`);
	else console.log(`${label}: ${info.license}`);
}

// 2. THIRD_PARTY_NOTICES.md is up to date.
const committed = fs.readFileSync(NOTICES_FILE, 'utf8').replace(/\r\n/g, '\n');
if (committed !== buildNotices()) problems.push('THIRD_PARTY_NOTICES.md is out of date: run npm run notices');

// 3. Engine version in SOURCE.md and engine.ts.
const source = fs.readFileSync(path.join(ROOT, 'src', 'contentScript', 'engine.ts'), 'utf8');
const m = /ENGINE_VERSION = '([^']+)'/.exec(source);
if (!m || m[1] !== engineVersion()) problems.push(`engine version differs: SOURCE.md ${engineVersion()}, engine.ts ${m ? m[1] : 'not found'}`);

if (problems.length) {
	for (const p of problems) console.error(`problem: ${p}`);
	process.exit(1);
}
console.log('licenses check: OK');
