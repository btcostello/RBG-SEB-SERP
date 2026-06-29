<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { schemaStore } from '$lib/stores/schema.svelte';

	let { children } = $props();

	// Discover and cache the engine schema once at app start (FR22). Non-blocking.
	onMount(() => {
		void schemaStore.load();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if schemaStore.usingFallback && schemaStore.notice}
	<div class="schema-notice" role="status">{schemaStore.notice}</div>
{/if}

<nav class="app-nav">
	<a href="/">Setup</a>
	<a href="/report">Report</a>
</nav>

{@render children()}

<style>
	.schema-notice {
		background: #fff4e5;
		border-bottom: 1px solid #f0c36d;
		color: #7a4f01;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		text-align: center;
	}
	.app-nav {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e2e2e2;
	}
	.app-nav a {
		text-decoration: none;
		font-weight: 600;
		color: #1a3a7a;
	}

	/* The report nav is screen-only; print shows just the report pages (refined in Story 4.5). */
	@media print {
		.app-nav,
		.schema-notice {
			display: none;
		}
	}
</style>
