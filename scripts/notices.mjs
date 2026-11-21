// SPDX-License-Identifier: MIT
// npm run notices (design 20.4): builds THIRD_PARTY_NOTICES.md (English) and
// THIRD_PARTY_NOTICES.ja.md (Japanese) from the license files of what the
// plugin package contains: the PlantUML engine in vendor/plantuml (with the
// Twemoji and Open Iconic data) and DOMPurify (with the regenerator-runtime
// helper inside its build). The license texts themselves stay in English in
// both files. Run it after updating the engine or DOMPurify;
// scripts/check-licenses.mjs checks that the committed files are up to date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NOTICES_FILE = path.join(ROOT, 'THIRD_PARTY_NOTICES.md');
export const NOTICES_FILE_JA = path.join(ROOT, 'THIRD_PARTY_NOTICES.ja.md');

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

/** Versions of the bundled components. */
export function versions() {
	return {
		engine: engineVersion(),
		dompurify: JSON.parse(read('node_modules/dompurify/package.json')).version,
	};
}

/** Header and component table of THIRD_PARTY_NOTICES.md. */
function headerEn({ engine, dompurify }) {
	return `# Third-party notices

[日本語](THIRD_PARTY_NOTICES.ja.md)

dg-plantuml (MIT License, see \`LICENSE\`) bundles the third-party software
below in its plugin package (\`.jpl\`). Their licenses and notices follow.

| Component | Version | License | Website | Where |
| --------- | ------- | ------- | ------- | ----- |
| PlantUML (\`@plantuml/core\`) | ${engine} | MIT | <https://plantuml.com/> | \`engine/plantuml.js\`, \`engine/themes.js\` |
| Twemoji graphics (in \`@plantuml/core\`) | as bundled in ${engine} | CC-BY 4.0 | <https://github.com/twitter/twemoji> | \`engine/emoji.js\` |
| Open Iconic (in \`@plantuml/core\`) | as bundled in ${engine} | MIT | <https://github.com/iconic/open-iconic> | \`engine/openiconic.js\` |
| DOMPurify | ${dompurify} | Apache-2.0 OR MPL-2.0 (used under Apache-2.0) | <https://github.com/cure53/DOMPurify> | \`viewer.js\` |
| regenerator-runtime (inside DOMPurify) | as bundled in DOMPurify ${dompurify} | MIT | <https://github.com/facebook/regenerator> | \`viewer.js\` |

---

`;
}

/** Header and component table of THIRD_PARTY_NOTICES.ja.md. */
function headerJa({ engine, dompurify }) {
	return `# 外部のソフトウェアのライセンス表示

[English](THIRD_PARTY_NOTICES.md)

dg-plantuml（MIT ライセンス。\`LICENSE\` を参照）は、プラグインのパッケージ（\`.jpl\`）に
次の外部のソフトウェアを同梱しています。それぞれのライセンスと著作権表示を以下に載せます。
ライセンスの文面は、原文（英語）のまま載せています。

| 名称 | バージョン | ライセンス | 公式サイト | 同梱しているファイル |
| ---- | ---------- | ---------- | ---------- | -------------------- |
| PlantUML（\`@plantuml/core\`） | ${engine} | MIT | <https://plantuml.com/> | \`engine/plantuml.js\`、\`engine/themes.js\` |
| Twemoji の画像（\`@plantuml/core\` に含まれる） | ${engine} に含まれるもの | CC-BY 4.0 | <https://github.com/twitter/twemoji> | \`engine/emoji.js\` |
| Open Iconic（\`@plantuml/core\` に含まれる） | ${engine} に含まれるもの | MIT | <https://github.com/iconic/open-iconic> | \`engine/openiconic.js\` |
| DOMPurify | ${dompurify} | Apache-2.0 または MPL-2.0（Apache-2.0 を選択して利用） | <https://github.com/cure53/DOMPurify> | \`viewer.js\` |
| regenerator-runtime（DOMPurify に含まれる） | DOMPurify ${dompurify} に含まれるもの | MIT | <https://github.com/facebook/regenerator> | \`viewer.js\` |

以下の各節の説明は英語版と同じ内容です（英語のまま載せています）。

---

`;
}

/** License sections, shared by both files. */
function sections({ engine, dompurify: dompurifyVersion }) {
	return `## PlantUML

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

export function buildNotices() {
	const v = versions();
	return headerEn(v) + sections(v);
}

export function buildNoticesJa() {
	const v = versions();
	return headerJa(v) + sections(v);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	fs.writeFileSync(NOTICES_FILE, buildNotices(), 'utf8');
	fs.writeFileSync(NOTICES_FILE_JA, buildNoticesJa(), 'utf8');
	console.log(`${path.relative(ROOT, NOTICES_FILE)} and ${path.relative(ROOT, NOTICES_FILE_JA)} written`);
}
