<script lang="ts">
	/**
	 * WorkspaceResults — the internal-tool results dashboard on the setup screen.
	 *
	 * Restrained by design (the salesmanship lives in the interactive report / proposals): clear
	 * figures, a neutral funding-option comparison, and links to the three deliverables. SERP
	 * liability is shown LIVE from the liability store (recomputes as inputs change); the COLI
	 * funding figures come from a completed run via the derived report model. Per-policy diagnostics
	 * sit behind a disclosure so the surface stays calm.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { liability } from '$lib/stores/liability.svelte';
	import { runState } from '$lib/stores/run-state.svelte';
	import { Big } from '$lib/money/money';
	import { deriveReport, wholeDollars, REPORT_FUNDING_OPTIONS } from '$lib/report/report-data';
	import AssetResults from './AssetResults.svelte';

	function todayIso(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const report = $derived(quoteStore.current ? deriveReport(quoteStore.current, todayIso()) : null);
	const live = $derived(liability.results);
	const taxRate = $derived(quoteStore.current?.company.corporateTaxRate ?? 0);

	// Live SERP liability figures (recompute as census / settings change).
	const pv = $derived(live ? wholeDollars(live.aggregate.netPresentValue) : '—');
	const undiscounted = $derived(live ? wholeDollars(live.aggregate.totalBenefitCost) : '—');
	const afterTax = $derived(
		live ? wholeDollars(new Big(live.aggregate.totalBenefitCost).times(new Big(1).minus(taxRate))) : '—'
	);

	interface OptionRow {
		number: number;
		label: string;
		premium: string;
		avgFace: string;
		costRecovery: string;
		status: 'feasible' | 'review' | 'none';
	}

	const fundingRows = $derived.by((): OptionRow[] => {
		if (!report) return [];
		return REPORT_FUNDING_OPTIONS.map((option) => {
			const totals = report.fundingOptions[option.id];
			const flow = report.cashFlowByOption[option.id];
			const infeasible = totals?.infeasibleCount ?? 0;
			return {
				number: option.number,
				label: option.label,
				premium: totals?.premium ?? '—',
				avgFace: totals?.averageFace ?? '—',
				costRecovery: flow?.costRecovery ?? '—',
				status: !totals ? 'none' : infeasible > 0 ? 'review' : 'feasible'
			};
		});
	});
</script>

{#if report}
	<div class="ws-results">
		<!-- SERP liability — live -->
		<section class="ws-sec">
			<p class="ws-eyebrow">SERP liability</p>
			<div class="figrow">
				<div class="fig">
					<div class="n">{pv}</div>
					<div class="l">Present value <span>at {(quoteStore.current!.modelSettings.npvDiscountRate * 100).toFixed(2)}%</span></div>
				</div>
				<div class="fig">
					<div class="n">{undiscounted}</div>
					<div class="l">Total promised <span>undiscounted</span></div>
				</div>
				<div class="fig">
					<div class="n">{afterTax}</div>
					<div class="l">After-tax cost <span>net of {(taxRate * 100).toFixed(0)}%</span></div>
				</div>
				<div class="fig">
					<div class="n">{report.coveredPayroll}</div>
					<div class="l">Covered payroll <span>{report.numSerp} SERP · {report.numColi} COLI</span></div>
				</div>
			</div>
		</section>

		<!-- COLI funding — post-run -->
		<section class="ws-sec">
			<div class="sec-head">
				<p class="ws-eyebrow">COLI funding</p>
				{#if report.hasResults}
					<span class="stamp">All four options designed</span>
				{/if}
			</div>
			{#if report.hasResults}
				<table class="funding">
					<thead>
						<tr>
							<th>Option</th>
							<th>Premium / yr</th>
							<th>Avg face</th>
							<th>Cost recovery</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each fundingRows as row (row.number)}
							<tr>
								<td class="opt">{row.number}. {row.label}</td>
								<td class="num">{row.premium}</td>
								<td class="num">{row.avgFace}</td>
								<td class="num">{row.costRecovery}</td>
								<td>
									{#if row.status === 'feasible'}
										<span class="chip ok">Feasible</span>
									{:else if row.status === 'review'}
										<span class="chip warn">Review</span>
									{:else}
										<span class="chip none">Not designed</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="prompt">
					Run the model to design the COLI funding across all four options — premium, face, and
					cost recovery per structure.
				</p>
			{/if}
		</section>

		<!-- Deliverables -->
		<section class="ws-sec">
			<p class="ws-eyebrow">Reports</p>
			<div class="deliverables">
				<a class="deliv" class:disabled={!report.hasResults} href="/report/interactive">
					<span class="kind">Explore on screen</span>
					<span class="h">Interactive Report</span>
					<span class="d">Walk a buyer through the decision, option by option.</span>
					<span class="go">Open →</span>
				</a>
				<a class="deliv" class:disabled={!report.hasResults} href="/report">
					<span class="kind">Client-ready · PDF</span>
					<span class="h">Streamlined Proposal</span>
					<span class="d">The concise, page-accurate client proposal.</span>
					<span class="go">Open →</span>
				</a>
				<a class="deliv" href="/report/legacy">
					<span class="kind">Full record · PDF</span>
					<span class="h">Detailed Report</span>
					<span class="d">The complete actuarial &amp; accounting workbook.</span>
					<span class="go">Open →</span>
				</a>
			</div>
			{#if !report.hasResults}
				<p class="deliv-note">The two proposals populate once you run the model.</p>
			{/if}
		</section>

		<!-- Per-policy detail (advanced) -->
		{#if runState.status === 'done' && runState.designed.length > 0}
			<details class="advanced">
				<summary>Per-policy detail &amp; compliance flags</summary>
				<div class="advanced-body"><AssetResults /></div>
			</details>
		{/if}
	</div>
{/if}

<style>
	.ws-results {
		display: flex;
		flex-direction: column;
		gap: 2.75rem;
	}
	.ws-eyebrow {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 1.1rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid var(--line);
		position: relative;
	}
	.ws-eyebrow::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -1px;
		width: 40px;
		height: 2px;
		background: var(--bronze);
	}
	.sec-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}
	.sec-head .ws-eyebrow {
		flex: 1;
	}
	.stamp {
		font-size: 0.72rem;
		color: var(--muted);
		white-space: nowrap;
		padding-bottom: 0.55rem;
	}

	/* live liability figures */
	.figrow {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.75rem;
	}
	@media (max-width: 720px) {
		.figrow {
			grid-template-columns: repeat(2, 1fr);
			gap: 1.5rem 1.75rem;
		}
	}
	.fig .n {
		font-family: var(--serif);
		font-weight: 700;
		font-size: 1.7rem;
		line-height: 1.1;
		letter-spacing: -0.01em;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
	}
	.fig .l {
		font-size: 0.82rem;
		color: var(--ink-soft);
		margin-top: 0.4rem;
	}
	.fig .l span {
		display: block;
		font-size: 0.72rem;
		color: var(--muted);
	}

	/* funding comparison */
	table.funding {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	table.funding thead th {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		text-align: right;
		padding: 0 0.7rem 0.6rem;
		border-bottom: 1.5px solid var(--ink);
	}
	table.funding thead th:first-child,
	table.funding tbody td.opt {
		text-align: left;
	}
	table.funding tbody td {
		padding: 0.8rem 0.7rem;
		border-bottom: 1px solid var(--line-soft);
		text-align: right;
	}
	table.funding tbody tr:last-child td {
		border-bottom: none;
	}
	td.opt {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1rem;
	}
	.chip {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.16rem 0.5rem;
		border-radius: 2px;
	}
	.chip.ok {
		color: var(--ink-soft);
		border: 1px solid var(--line);
	}
	.chip.warn {
		color: var(--warn-tx);
		border: 1px solid #d8b39c;
		background: #f8eee7;
	}
	.chip.none {
		color: var(--muted);
	}
	.prompt {
		font-size: 0.9rem;
		color: var(--ink-soft);
		background: var(--fill);
		border-left: 3px solid var(--accent);
		padding: 0.9rem 1.1rem;
		margin: 0;
	}

	/* deliverables */
	.deliverables {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}
	@media (max-width: 760px) {
		.deliverables {
			grid-template-columns: 1fr;
		}
	}
	.deliv {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		background: var(--paper);
		border: 1px solid var(--line);
		border-top: 2.5px solid var(--ink);
		padding: 1.25rem 1.35rem 1.4rem;
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.12s ease;
	}
	.deliv:hover {
		box-shadow: 0 2px 14px rgba(14, 37, 48, 0.08);
	}
	.deliv.disabled {
		pointer-events: none;
		opacity: 0.5;
	}
	.deliv .kind {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: var(--bronze-deep);
	}
	.deliv .h {
		font-family: var(--serif);
		font-size: 1.2rem;
		font-weight: 600;
	}
	.deliv .d {
		font-size: 0.82rem;
		color: var(--ink-soft);
		flex: 1;
	}
	.deliv .go {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent-deep);
		margin-top: 0.3rem;
	}
	.deliv-note {
		font-size: 0.76rem;
		color: var(--muted);
		margin: 0.9rem 0 0;
	}

	/* advanced disclosure */
	.advanced summary {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
		cursor: pointer;
		padding: 0.6rem 0;
		border-top: 1px solid var(--line);
	}
	.advanced summary:hover {
		color: var(--ink);
	}
	.advanced-body {
		overflow-x: auto;
		padding-top: 0.5rem;
	}
</style>
