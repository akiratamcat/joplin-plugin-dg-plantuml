// Builds an HTML gallery of the built-in themes, rendered by the real viewer
// on a light page (light style) and a dark page (dark style).
// Not a test: run with  npx jest -c jest.render.config.js --testRegex 'themeGallery\.probe\.ts$'
// Output: the file given in the environment variable GALLERY_OUT.
import * as fs from 'fs';
import { BUILTIN_THEMES } from '../../src/presets/builtinThemes';
import { buildViewerConfig, KEYS } from '../../src/settings';
import { launchBrowser, renderNote } from './renderPage';

const fence = (s: string) => '```plantuml\n' + s + '\n```';
const NOTE = [
	fence('actor User\nparticipant "Web server" as W\nUser -> W : request\nW --> User : response\nnote right of W : a note'),
	fence('class Customer {\n  +name : String\n}\ninterface Payable\nenum Status\nCustomer ..|> Payable\nCustomer --> Status'),
	fence('start\n:Step one;\nif (ok?) then (yes)\n  :Done;\nelse (no)\n  :Retry;\nendif\nstop'),
	fence('@startmindmap\n* root\n** child one\n** child two\n@endmindmap'),
].join('\n\n');

const LIGHT = { bg: '#ffffff', fg: '#222222' };
const DARK = { bg: 'rgb(29, 32, 36)', fg: '#dddddd' };

test('theme gallery', async () => {
	const out = process.env.GALLERY_OUT;
	if (!out) throw new Error('set GALLERY_OUT');
	const browser = await launchBrowser();
	const cell = async (preset: Record<string, string>, colors: typeof LIGHT) => {
		const run = await renderNote(browser, NOTE, { config: buildViewerConfig(preset), colors, width: 1400 });
		const parts = run.blocks.map((b) => (b.state === 'done' ? b.svgMarkup : `<div class="err">${b.errorTitle} ${b.errorMessage}</div>`));
		return `<div class="cell" style="background:${colors.bg};color:${colors.fg}">${parts.map((p) => `<div class="d">${p}</div>`).join('')}</div>`;
	};
	const rows: string[] = [];
	rows.push(`<h2>Reference: default styles</h2><div class="row">${await cell({ [KEYS.lightPreset]: 'plantuml-default' }, LIGHT)}${await cell({ [KEYS.darkPreset]: 'plantuml-dark' }, DARK)}</div>`);
	let n = 0;
	for (const [name, label] of Object.entries(BUILTIN_THEMES)) {
		n++;
		const light = await cell({ [KEYS.lightPreset]: `builtin:${name}` }, LIGHT);
		const dark = await cell({ [KEYS.darkPreset]: `builtin:${name}` }, DARK);
		rows.push(`<h2 id="${name}">${n}. ${label} <code>${name}</code></h2><div class="row">${light}${dark}</div>`);
	}
	await browser.close();
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>dg-plantuml built-in themes</title>
<style>
body { font-family: sans-serif; margin: 16px; background: #f0f0f0; }
h2 { margin: 24px 0 8px; font-size: 18px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cell { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; padding: 12px; border: 1px solid #ccc; }
.d svg { max-width: 100%; height: auto; }
.head { position: sticky; top: 0; background: #f0f0f0; padding: 4px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-weight: bold; }
.err { color: #c00; }
</style></head><body>
<h1>dg-plantuml: built-in themes (${n})</h1>
<p>Left: chosen as "Style for the light theme", on a light note viewer. Right: chosen as "Style for the dark theme", on a dark note viewer. Transparent background on, font size 16.</p>
<div class="head"><div>Light page (light style)</div><div>Dark page (dark style)</div></div>
${rows.join('\n')}
</body></html>`;
	fs.writeFileSync(out, html, 'utf8');
	console.log(`written ${out} (${Math.round(html.length / 1024)} KB, ${n} themes)`);
}, 900000);
