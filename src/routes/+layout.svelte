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
</style>
