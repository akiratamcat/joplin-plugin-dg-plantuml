// SPDX-License-Identifier: MIT
import { CacheKeyParts, LruCache, cacheKey } from '../src/contentScript/cache';
import { hashString } from '../src/shared/hash';

describe('LruCache', () => {
	test('evicts the least recently used entry', () => {
		const c = new LruCache<string>(2);
		c.set('a', '1');
		c.set('b', '2');
		expect(c.get('a')).toBe('1'); // a is now the most recent
		c.set('c', '3');
		expect(c.get('b')).toBeUndefined();
		expect(c.get('a')).toBe('1');
		expect(c.get('c')).toBe('3');
		expect(c.size).toBe(2);
	});

	test('updating a key does not grow the cache', () => {
		const c = new LruCache<number>(2);
		c.set('a', 1);
		c.set('a', 2);
		expect(c.size).toBe(1);
		expect(c.get('a')).toBe(2);
	});

	test('a smaller limit drops old entries', () => {
		const c = new LruCache<number>(3);
		c.set('a', 1);
		c.set('b', 2);
		c.set('c', 3);
		c.setLimit(1);
		expect(c.size).toBe(1);
		expect(c.get('c')).toBe(3);
	});

	test('invalid limits are rejected', () => {
		expect(() => new LruCache(0)).toThrow();
		expect(() => new LruCache(1.5)).toThrow();
	});
});

describe('cacheKey', () => {
	const parts: CacheKeyParts = { source: 'A -> B', theme: 'light', preamble: '!pragma layout smetana', baseFontSizePx: 16, settingsVersion: 1, engineVersion: '1.2026.10' };

	test('same parts give the same key', () => {
		expect(cacheKey(parts)).toBe(cacheKey({ ...parts }));
	});

	test.each([
		['source', { source: 'A -> C' }],
		['theme', { theme: 'dark' }],
		['preamble', { preamble: '' }],
		['font size', { baseFontSizePx: 14 }],
		['settings version', { settingsVersion: 2 }],
		['engine version', { engineVersion: '1.2026.11' }],
	])('a different %s gives a different key', (_name, change) => {
		expect(cacheKey({ ...parts, ...change })).not.toBe(cacheKey(parts));
	});
});

describe('hashString', () => {
	test('stable, fixed-length hex', () => {
		expect(hashString('abc')).toBe(hashString('abc'));
		expect(hashString('abc')).not.toBe(hashString('abd'));
		expect(hashString('')).toMatch(/^[0-9a-f]{14}$/);
		expect(hashString('日本語')).toMatch(/^[0-9a-f]{14}$/);
	});
});
