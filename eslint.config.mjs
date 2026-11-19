// ESLint flat config (design 21.3: lint / type check).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['api/**', 'dist/**', 'publish/**', 'vendor/**', 'spike/**', 'coverage/**', 'node_modules/**', '*.config.js', 'webpack.config.js'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
);
