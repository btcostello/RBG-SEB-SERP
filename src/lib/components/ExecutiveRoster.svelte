<script lang="ts">
	/**
	 * ExecutiveRoster — a readable summary of the census with the full spreadsheet grid one toggle
	 * away. Leads with something scannable (name · role · age · salary) instead of a wall of cells;
	 * all editing (add / paste / remove / per-field) happens in the grid, revealed on demand.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { ageNearestBirthday } from '$lib/dates/age';
	import { wholeDollars } from '$lib/report/report-data';
	import CensusEditor from './CensusEditor.svelte';

	let showGrid = $state(false);

	function todayIso(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const census = $derived(quoteStore.current?.census ?? []);

	function roleLabel(membership: string): string {
		if (membership === 'BOTH') return 'SERP + COLI';
		if (membership === 'SERP') return 'SERP only';
		return 'COLI only';
	}
</script>

<div class="roster-wrap">
	<div class="roster-head">
		<h3>Executives <span class="count">{census.length}</span></h3>
		<button type="button" class="grid-toggle" onclick={() => (showGrid = !showGrid)}>
			{showGrid ? 'Hide grid' : 'Edit in grid'}
			<span class="caret" class:open={showGrid}>▾</span>
		</button>
	</div>

	{#if census.length === 0}
		<p class="empty">No executives yet — open the grid to add them, or paste a block from a spreadsheet.</p>
	{:else}
		<ul class="roster">
			{#each census as insured (insured.id)}
				<li class="person">
					<span class="nm">{insured.firstName} {insured.lastName}</span>
					<span class="sal">{wholeDollars(insured.currentSalary)}</span>
					<span class="meta">
						<span class="role">{roleLabel(insured.planMembership)}</span>
						· age {ageNearestBirthday(insured.dateOfBirth, todayIso())} · retires {insured.retirementAge}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if showGrid}
		<div class="grid-panel">
			<CensusEditor />
		</div>
	{/if}
</div>

<style>
	.roster-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.roster-head h3 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.2rem;
		margin: 0;
	}
	.roster-head .count {
		font-family: var(--sans);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--muted);
		margin-left: 0.35rem;
	}
	.grid-toggle {
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent-deep);
		background: none;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.grid-toggle:hover {
		color: var(--bronze-deep);
	}
	.caret {
		transition: transform 0.15s ease;
		font-size: 0.7em;
	}
	.caret.open {
		transform: rotate(180deg);
	}

	.empty {
		font-size: 0.88rem;
		color: var(--muted);
		margin: 0;
	}

	ul.roster {
		list-style: none;
		margin: 0;
		padding: 0;
		columns: 2;
		column-gap: 2.5rem;
	}
	@media (max-width: 700px) {
		ul.roster {
			columns: 1;
		}
	}
	.person {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: baseline;
		gap: 0.05rem 0.75rem;
		padding: 0.6rem 0;
		border-top: 1px solid var(--line-soft);
		break-inside: avoid;
	}
	.person .nm {
		font-family: var(--serif);
		font-size: 1rem;
		font-weight: 600;
	}
	.person .sal {
		font-variant-numeric: tabular-nums;
		color: var(--ink-soft);
		text-align: right;
		font-size: 0.9rem;
	}
	.person .meta {
		grid-column: 1 / -1;
		font-size: 0.76rem;
		color: var(--muted);
	}
	.person .meta .role {
		color: var(--accent-deep);
		font-weight: 600;
	}

	.grid-panel {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
		overflow-x: auto;
	}
</style>
