// Unit tests run in Node. Tests that need a DOM declare
// `@jest-environment jsdom` in a docblock at the top of the file.
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests'],
	moduleNameMapper: {
		'^api$': '<rootDir>/api',
		'^api/(.*)$': '<rootDir>/api/$1',
	},
};
