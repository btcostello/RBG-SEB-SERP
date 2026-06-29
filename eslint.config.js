import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			// Plain static internal links (<a href="/report">) are intentional in this app;
			// SvelteKit's resolve() is unnecessary for these fixed routes.
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// $lib/server boundary (architecture: "Server-Only Boundary").
		// SvelteKit already fails the build if server-only code reaches the client bundle;
		// this rule surfaces the same violation at lint time with a clear message.
		// It applies to client-reachable modules only — server-side modules (below) are
		// excluded so they may freely import each other.
		files: ['src/**/*.{ts,js,svelte}'],
		ignores: [
			'src/lib/server/**',
			'src/hooks.server.ts',
			'src/**/+server.ts',
			'src/**/*.server.ts'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/server', '$lib/server/**', '**/lib/server/**'],
							message:
								'Server-only code ($lib/server) must not be imported into client-reachable modules — it would leak the lifeproj API key into the browser bundle.'
						}
					]
				}
			]
		}
	}
);
