// Rendering tests in headless Chrome (design 16.1, 16.4 (2)).
// Run with `npm run test:render`, which builds the plugin first.
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/render'],
	testTimeout: 120000,
};
