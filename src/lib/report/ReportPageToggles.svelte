<script lang="ts">
	/**
	 * Sticky, screen-only control for turning report pages on/off. Shared by the formal `/report`
	 * and the `/report/legacy` document — each passes its own ordered page list and a `report` key.
	 *
	 * The hidden set lives on the active quote (persists on save/reopen); this component reads and
	 * writes it through the store, so the report view re-renders the moment a box is toggled. Marked
	 * `no-print` so it never appears in the exported PDF.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';

	let { pages, report }: { pages: { id: string; title: string }[]; report: 'main' | 'legacy' } =
		$props();

	// The hidden-id set for this report, read reactively off the quote (absent ⇒ nothing hidden).
	const hidden = $derived.by(() => {
		const s = quoteStore.current?.reportSettings;
		const ids = report === 'legacy' ? s?.hiddenLegacyPages : s?.hiddenPages;
		return new Set(ids ?? []);
	});

	const visibleCount = $derived(pages.filter((p) => !hidden.has(p.id)).length);

	/** Show or hide one page, writing the recomputed hidden set back to the quote. */
	function setVisible(id: string, visible: boolean): void {
		const next = new Set(hidden);
		if (visible) next.delete(id);
		else next.add(id);
		// Preserve registry order in the stored array for stable serialization / diffs.
		quoteStore.setHiddenReportPages(
			report,
			pages.filter((p) => next.has(p.id)).map((p) => p.id)
		);
	}

	function showAll(): void {
		quoteStore.setHiddenReportPages(report, []);
	}

	function hideAll(): void {
		quoteStore.setHiddenReportPages(
			report,
			pages.map((p) => p.id)
		);
	}
</script>

<details class="page-toggles no-print">
	<summary>
		<span class="label">Pages</span>
		<span class="count">{visibleCount} of {pages.length} shown</span>
		<span class="chev" aria-hidden="true">▾</span>
	</summary>
	<div class="menu">
		<div class="menu-actions">
			<button type="button" onclick={showAll} disabled={visibleCount === pages.length}>
				Show all
			</button>
			<button type="button" onclick={hideAll} disabled={visibleCount === 0}>Hide all</button>
		</div>
		<ul>
			{#each pages as page (page.id)}
				<li>
					<label>
						<input
							type="checkbox"
							checked={!hidden.has(page.id)}
							onchange={(e) => setVisible(page.id, e.currentTarget.checked)}
						/>
						<span>{page.title}</span>
					</label>
				</li>
			{/each}
		</ul>
	</div>
</details>

<style>
	.page-toggles {
		position: sticky;
		top: 0.75rem;
		z-index: 20;
		width: max-content;
		max-width: 22rem;
		margin: 0 auto 1.25rem;
		background: #0e2530;
		color: #fff;
		border: 1px solid #0e2530;
		border-bottom: 2px solid #b98a45;
		border-radius: 3px;
		box-shadow: 0 6px 20px rgba(14, 37, 48, 0.25);
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
	}
	summary {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.6rem 1rem;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary .label {
		font-weight: 600;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	summary .count {
		font-size: 0.78rem;
		color: #9db7c1;
	}
	summary .chev {
		margin-left: auto;
		font-size: 0.7rem;
		color: #b98a45;
		transition: transform 0.15s ease;
	}
	.page-toggles[open] summary .chev {
		transform: rotate(180deg);
	}
	.menu {
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		padding: 0.6rem 0.75rem 0.75rem;
	}
	.menu-actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.menu-actions button {
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: #0e2530;
		background: #cbd5c0;
		border: 0;
		border-radius: 3px;
		padding: 0.3rem 0.7rem;
		cursor: pointer;
	}
	.menu-actions button:hover:not(:disabled) {
		background: #b98a45;
		color: #fff;
	}
	.menu-actions button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 60vh;
		overflow-y: auto;
	}
	li {
		margin: 0;
	}
	label {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.28rem 0.35rem;
		font-size: 0.82rem;
		border-radius: 3px;
		cursor: pointer;
	}
	label:hover {
		background: rgba(255, 255, 255, 0.06);
	}
	label input {
		accent-color: #b98a45;
		width: 0.95rem;
		height: 0.95rem;
		flex: 0 0 auto;
	}
	label span {
		color: #e7eef1;
	}
	/* A hidden page reads dimmed in the list. */
	label:has(input:not(:checked)) span {
		color: #7d97a1;
	}
</style>
