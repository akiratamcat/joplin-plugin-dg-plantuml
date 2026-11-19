// SPDX-License-Identifier: MIT
// Code patterns that can make network requests (design 16.4 (1)).
import * as fs from 'fs';
import * as path from 'path';

export const NETWORK_PATTERNS: Record<string, RegExp> = {
	fetch: /\bfetch\(/g,
	XMLHttpRequest: /XMLHttpRequest/g,
	WebSocket: /WebSocket/g,
	EventSource: /EventSource/g,
	sendBeacon: /sendBeacon/g,
	importScripts: /importScripts/g,
	Worker: /new Worker\b/g,
	// Elements that load a URL given in src/href.
	createElement: /createElement\(\s*['"](?:script|img|iframe|link|audio|video|source|embed|object)['"]/g,
	dynamicImport: /\bimport\(/g,
};

/** Patterns that must never appear, not even with a reason. */
export const FORBIDDEN_PATTERNS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'importScripts', 'Worker'];

export function countPatterns(text: string): Record<string, number> {
	const found: Record<string, number> = {};
	for (const [name, re] of Object.entries(NETWORK_PATTERNS)) {
		const n = (text.match(re) || []).length;
		if (n) found[name] = n;
	}
	return found;
}

export const ROOT = path.join(__dirname, '..', '..');

/** Files under `dir` (relative to the repository root) with one of the extensions. */
export function listFiles(dir: string, exts: string[]): string[] {
	const out: string[] = [];
	const walk = (rel: string) => {
		for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
			const child = `${rel}/${entry.name}`;
			if (entry.isDirectory()) walk(child);
			else if (exts.some((e) => entry.name.endsWith(e))) out.push(child);
		}
	};
	walk(dir);
	return out.sort();
}

export interface AllowEntry {
	count: number;
	reason: string;
}

export type Allowlist = Record<string, Record<string, AllowEntry>>;

export function readAllowlist(): Allowlist {
	return JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'network-allowlist.json'), 'utf8')).files;
}
