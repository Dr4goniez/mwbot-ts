import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{ files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
	tseslint.configs.recommended,
	{ files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
	{ files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
	{ files: ["**/*.md"], plugins: { markdown }, language: "markdown/gfm", extends: ["markdown/recommended"] },
	{
		plugins: {
			'@stylistic': stylistic,
		},
		languageOptions: {
			ecmaVersion: 2022,
		},
		rules: {
			"no-control-regex": "off",
			"no-unused-vars": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					"argsIgnorePattern": "^_",
					"varsIgnorePattern": "^_",
					"caughtErrorsIgnorePattern": "^_",
				},
			],
			"@stylistic/comma-dangle": ["warn", {
				"arrays": "always-multiline",
				"objects": "always-multiline",
				"imports": "always-multiline",
				"exports": "always-multiline",
				"functions": "never",
				"importAttributes": "always-multiline",
				"dynamicImports": "always-multiline",
				"enums": "always-multiline",
				"generics": "always-multiline",
				"tuples": "always-multiline",
			}],
			"@stylistic/indent": ["warn", "tab", {
				"flatTernaryExpressions": true,
			}],
			"@stylistic/no-trailing-spaces": "warn",
			"json/no-empty-keys": "off",
		},
	},
	{
		ignores: [
			"dist/**",
			"docs/**",
			"src/test/**",
			"tsconfig.json",
		],
	},
]);
