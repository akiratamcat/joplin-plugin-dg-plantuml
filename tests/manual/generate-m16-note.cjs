// SPDX-License-Identifier: MIT
/* eslint-disable @typescript-eslint/no-require-imports -- plain Node.js script */
/* global require, process, console */
// Generates tests/manual/m16-large-and-broken.md (M-16: large diagrams and broken input).
// Usage: node tests/manual/generate-m16-note.cjs tests/manual/m16-large-and-broken.md
const fs = require('fs');
const fence = '```';
const block = (title, expect, src) => `## ${title}\n\nExpected: ${expect}\n\n${fence}plantuml\n${src}\n${fence}\n`;

const parts = [
	'# dg-plantuml M-16 test note: large diagrams and broken input\n',
	'Generated for the manual test M-16 (design 16.3). Joplin must not freeze. Each block shows a diagram or an error box within a few seconds.\n',
	block('1. Infinite loop in the preprocessor', 'error box, "Line 3: Infinite loop?"',
		'!$i = 0\n!while $i < 1\n!endwhile\nA -> B'),
	block('2. Endless recursion', 'error box, "Line 2: Fatal parsing error"',
		'!function $f($x)\n!return $f($x)\n!endfunction\nA -> B : $f(1)'),
	block('3. Broken input', 'error box, "Line 1: Syntax Error?"',
		'}{ ][ @@@ <<<>>> ::: --> <-- ;;;'),
	block('4. Only @enduml', 'an empty diagram (nothing visible), no freeze',
		'@enduml'),
	block('5. @startuml without @enduml', 'the diagram A -> B',
		'@startuml\nA -> B'),
	block('6. Deeply nested activity (60 levels)', 'a very tall activity diagram',
		Array.from({ length: 60 }, () => 'if (x) then').join('\n') + '\n:a;\n' + Array.from({ length: 60 }, () => 'endif').join('\n')),
	block('7. Large class diagram (200 classes)', 'a large class diagram. Also type in this block in the Markdown editor: typing must not lag badly',
		Array.from({ length: 200 }, (_, i) => `class C${i}\nC${i} --> C${(i * 7 + 3) % 200}`).join('\n')),
	block('8. Very tall sequence diagram (1000 messages)', 'error box from the engine: "Diagram too large for browser rendering ... (max 8192 ...)"',
		Array.from({ length: 1000 }, (_, i) => `P${i % 40} -> P${(i + 7) % 40} : message ${i}`).join('\n')),
	block('9. One very long line (20,000 characters)', 'error box with an unclear engine message (java.lang.UnsupportedOperationException ...), no freeze',
		'A -> B : ' + 'x'.repeat(20000)),
	block('10. Source over the limit (100,000 characters)', 'error box "The diagram is too large." without calling the engine',
		'A -> B : ' + 'y'.repeat(100001)),
];
fs.writeFileSync(process.argv[2], parts.join('\n'), 'utf8');
console.log('written', fs.statSync(process.argv[2]).size, 'bytes');
