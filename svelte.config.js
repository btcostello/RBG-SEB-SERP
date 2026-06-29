import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	// Project-wide Svelte 5 runes ($state/$derived/$effect) — see architecture "State via Svelte 5 runes".
	compilerOptions: {
		runes: true
	},

	kit: {
		// @sveltejs/adapter-node produces a runnable Node server in build/ (`node build`).
		adapter: adapter()
	}
};

export default config;
