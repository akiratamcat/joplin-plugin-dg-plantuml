// SPDX-License-Identifier: MIT
// npm run notices (design 20.4): builds THIRD_PARTY_NOTICES.md from the
// license files of what the plugin package contains: the PlantUML engine in
// vendor/plantuml (with the Twemoji and Open Iconic data) and DOMPurify (with
// the regenerator-runtime helper inside its build). Run it after updating
// the engine or DOMPurify; scripts/check-licenses.mjs checks that the
// committed file is up to date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NOTICES_FILE = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const fence = '```';

/** Version of the vendored engine, from vendor/plantuml/SOURCE.md. */
export function engineVersion() {
	// The "| Version | 1.2026.10 |" row of the table in SOURCE.md.
	const m = /^\|\s*Version\s*\|\s*([0-9]+\.[0-9]+\.[0-9]+)\s*\|/m.exec(read('vendor/plantuml/SOURCE.md'));
	if (!m) throw new Error('engine version not found in vendor/plantuml/SOURCE.md');
	return m[1];
}

const mit = (copyright) => `MIT License

${copyright}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export function buildNotices() {
	const dompurifyVersion = JSON.parse(read('node_modules/dompurify/package.json')).version;
	const engine = engineVersion();
	return `# Third-party notices

dg-plantuml (MIT License, see \`LICENSE\`) bundles the third-party software
below in its plugin package (\`.jpl\`). Their licenses and notices follow.

| Component | Version | License | Where |
| --------- | ------- | ------- | ----- |
| PlantUML (\`@plantuml/core\`) | ${engine} | MIT | \`engine/plantuml.js\`, \`engine/themes.js\` |
| Twemoji graphics (in \`@plantuml/core\`) | as bundled in ${engine} | CC-BY 4.0 | \`engine/emoji.js\` |
| Open Iconic (in \`@plantuml/core\`) | as bundled in ${engine} | MIT | \`engine/openiconic.js\` |
| DOMPurify | ${dompurifyVersion} | Apache-2.0 OR MPL-2.0 (used under Apache-2.0) | \`viewer.js\` |
| regenerator-runtime (inside DOMPurify) | as bundled in DOMPurify ${dompurifyVersion} | MIT | \`viewer.js\` |

---

## PlantUML

Source: https://plantuml.com/ , npm package \`@plantuml/core\` ${engine}.
The engine files are included unchanged. The license file shipped with the
package follows (also included as \`engine/LICENSE\`).

${fence}text
${read('vendor/plantuml/LICENSE')}
${fence}

---

## Twemoji graphics

The emoji graphics in \`engine/emoji.js\` come from Twemoji, converted to SVG
path data by the PlantUML project.

Copyright 2019 Twitter, Inc and other contributors.
Graphics licensed under CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/
Project: https://github.com/twitter/twemoji

---

## Open Iconic

The icons in \`engine/openiconic.js\` come from Open Iconic
(https://github.com/iconic/open-iconic), converted to SVG path data by the
PlantUML project.

${fence}text
${mit('Copyright (c) 2014 Waybury')}
${fence}

---

## DOMPurify

Source: https://github.com/cure53/DOMPurify , version ${dompurifyVersion}.
Copyright (c) Cure53 and other contributors.
DOMPurify is dual-licensed under the Apache License 2.0 and the Mozilla Public
License 2.0. dg-plantuml uses it under the Apache License 2.0, whose text follows.

${fence}text
${read('node_modules/dompurify/LICENSE')}
${fence}

---

## regenerator-runtime

Included in the DOMPurify distribution files.

${fence}text
${mit('Copyright (c) 2014-present, Facebook, Inc.')}
${fence}
`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	fs.writeFileSync(NOTICES_FILE, buildNotices(), 'utf8');
	console.log(`${path.relative(ROOT, NOTICES_FILE)} written`);
}
