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
	<span class="brand">SERP <span>Pro</span></span>
	<div class="links">
		<a href="/">Setup</a>
		<a href="/report">Report</a>
		<a href="/report/legacy">Legacy Report</a>
	</div>
</nav>

{@render children()}

<style>
	.schema-notice {
		background: #fdf3e7;
		border-bottom: 1px solid var(--bronze);
		color: var(--warn-tx);
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		text-align: center;
	}
	.app-nav {
		display: flex;
		align-items: baseline;
		gap: 1.75rem;
		padding: 0.85rem 1.5rem;
		background: var(--ink);
		border-bottom: 2px solid var(--bronze);
	}
	.app-nav .brand {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.05rem;
		color: #fff;
		letter-spacing: 0.01em;
	}
	.app-nav .brand span {
		color: var(--bronze);
	}
	.app-nav .links {
		display: flex;
		gap: 1.25rem;
	}
	.app-nav a {
		text-decoration: none;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #9db7c1;
		padding-bottom: 2px;
		border-bottom: 2px solid transparent;
		transition:
			color 0.12s ease,
			border-color 0.12s ease;
	}
	.app-nav a:hover {
		color: #fff;
		border-bottom-color: var(--bronze);
	}

	/* The report nav is screen-only; print shows just the report pages. */
	@media print {
		.app-nav,
		.schema-notice {
			display: none;
		}
	}
</style>
