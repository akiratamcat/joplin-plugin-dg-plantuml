// SPDX-License-Identifier: MIT
// SVG cache of the viewer (design 7.3): least-recently-used, fixed size.
import { hashString } from '../shared/hash';

export class LruCache<V> {
	private readonly map = new Map<string, V>();

	constructor(private limit: number) {
		if (!Number.isInteger(limit) || limit < 1) throw new Error('cache limit must be a positive integer');
	}

	get size(): number {
		return this.map.size;
	}

	get(key: string): V | undefined {
		const value = this.map.get(key);
		if (value === undefined) return undefined;
		// Move to the most recently used position.
		this.map.delete(key);
		this.map.set(key, value);
		return value;
	}

	set(key: string, value: V): void {
		if (this.map.has(key)) this.map.delete(key);
		this.map.set(key, value);
		while (this.map.size > this.limit) {
			const oldest = this.map.keys().next().value as string;
			this.map.delete(oldest);
		}
	}

	setLimit(limit: number): void {
		if (!Number.isInteger(limit) || limit < 1) throw new Error('cache limit must be a positive integer');
		this.limit = limit;
		while (this.map.size > this.limit) this.map.delete(this.map.keys().next().value as string);
	}

	clear(): void {
		this.map.clear();
	}
}

export interface CacheKeyParts {
	source: string;
	/** Effective theme: 'light' or 'dark'. */
	theme: string;
	/** Preamble lines joined by newlines. */
	preamble: string;
	baseFontSizePx: number;
	settingsVersion: number;
	engineVersion: string;
}

/** Cache key of a diagram (design 7.2 step 4). */
export function cacheKey(parts: CacheKeyParts): string {
	return hashString([
		parts.engineVersion,
		String(parts.settingsVersion),
		parts.theme,
		String(parts.baseFontSizePx),
		parts.preamble,
		parts.source,
	].join('\u0000'));
}
