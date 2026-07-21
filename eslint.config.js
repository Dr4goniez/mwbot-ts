import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	{ files: ['**/*.{js,mjs,cjs,ts,mts,cts}'], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.node } },
	tseslint.configs.recommended,
	stylistic.configs.recommended,
	{ files: ['**/*.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] },
	{ files: ['**/*.jsonc'], plugins: { json }, language: 'json/jsonc', extends: ['json/recommended'] },
	{ files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
	{
		plugins: {
			'@stylistic': stylistic,
		},
		languageOptions: {
			ecmaVersion: 2022,
		},
		rules: {
			'no-control-regex': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'@stylistic/arrow-parens': ['error', 'always'],
			'@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
			'@stylistic/comma-dangle': ['error', {
				arrays: 'always-multiline',
				objects: 'always-multiline',
				imports: 'always-multiline',
				exports: 'always-multiline',
				functions: 'never',
				importAttributes: 'always-multiline',
				dynamicImports: 'always-multiline',
				enums: 'always-multiline',
				generics: 'always-multiline',
				tuples: 'always-multiline',
			}],
			'@stylistic/indent': ['error', 'tab', {
				flatTernaryExpressions: true,
			}],
			'@stylistic/indent-binary-ops': ['error', 'tab'],
			'@stylistic/padded-blocks': ['error', { classes: 'start' }],
			'@stylistic/lines-between-class-members': 'off',
			'@stylistic/member-delimiter-style': [
				'error',
				{
					multiline: {
						delimiter: 'semi',
						requireLast: true,
					},
					singleline: {
						delimiter: 'semi',
						requireLast: false,
					},
					multilineDetection: 'brackets',
				},
			],
			'@stylistic/multiline-ternary': 'off',
			'@stylistic/no-extra-semi': 'error',
			'@stylistic/no-tabs': ['error', { allowIndentationTabs: true }],
			'@stylistic/no-trailing-spaces': 'error',
			'@stylistic/operator-linebreak': [
				'error',
				'after',
				{
					overrides: {
						'?': 'before',
						':': 'ignore',
						'|': 'before',
					},
				},
			],
			'@stylistic/quote-props': ['error', 'as-needed'],
			'@stylistic/semi': ['error', 'always'],
			'json/no-empty-keys': 'off',
		},
	},
	{
		ignores: [
			'dist/**',
			'docs/**',
			'tsconfig.json',
		],
	},
]);
