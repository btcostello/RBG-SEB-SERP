<script lang="ts">
	/**
	 * Ledgers ("/ledgers") — the year-by-year illustrated values behind each funding option.
	 *
	 * Pick a funding option and a subject: any single policy, or the composite of every policy
	 * designed under that option. The table is the illustration as the engine returned it —
	 * premium, account value, surrender value, death benefit, one row per policy year.
	 *
	 * Reads the saved results on the quote rather than the live run state, so a reopened quote
	 * shows its ledgers without re-running the model.
	 *
	 * The per-policy compliance flags used to live in the "COLI asset design" table on the setup
	 * screen. That table is gone; the flags moved here, onto the policy they describe, so a capped
	 * or infeasible design cannot be read as a clean one.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { listFundingStrategies } from '$lib/funding';
	import { formatMoneyDisplay } from '$lib/money/money';
	import {
		COMPOSITE_ID,
		designFor,
		hasDesigns,
		ledgerFor,
		ledgerTotals,
		hasDistributions,
		subjectsFor
	} from '$lib/ledger/ledger';

	const options = listFundingStrategies();

	let selectedOptionId = $state(options[0]?.id ?? '');
	let selectedSubjectId = $state(COMPOSITE_ID);

	const quote = $derived(quoteStore.current);
	const results = $derived(quote?.results ?? null);

	function nameFor(insuredId: string): string {
		const insured = quote?.census.find((c) => c.id === insuredId);
		return insured ? `${insured.firstName} ${insured.lastName}`.trim() || insuredId : insuredId;
	}

	/** Options that actually have illustrated policies — the rest are offered but disabled. */
	const availableOptionIds = $derived(
		new Set(results ? options.filter((o) => hasDesigns(results, o.id)).map((o) => o.id) : [])
	);

	const subjects = $derived(results ? subjectsFor(results, selectedOptionId, nameFor) : []);

	// Switching option can invalidate the subject: a COLI-only participant is designed for Option 1
	// only, so their id does not exist under Options 2-4. Fall back to the first subject offered.
	const activeSubjectId = $derived(
		subjects.some((s) => s.id === selectedSubjectId) ? selectedSubjectId : (subjects[0]?.id ?? '')
	);

	const rows = $derived(results ? ledgerFor(results, selectedOptionId, activeSubjectId) : []);
	const totals = $derived(ledgerTotals(rows));
	const isComposite = $derived(activeSubjectId === COMPOSITE_ID);
	/**
	 * Whether to show the withdrawal / loan / loan-balance columns. Driven by the data rather than
	 * by the option id: Options 2 and 4 distribute the SERP benefit out of the policy and Options 1
	 * and 3 do not, so this shows the columns exactly where there is something in them.
	 */
	const distributing = $derived(hasDistributions(rows));

	/** The design behind a single-policy ledger — the source of the flags strip. */
	const design = $derived.by(() => {
		if (!results || isComposite) return undefined;
		const participant = results.perParticipant.find((p) => p.insuredId === activeSubjectId);
		return participant ? designFor(participant, selectedOptionId) : undefined;
	});

	/** Years in which the number of contributing policies changes — where a composite steps down. */
	const dropYears = $derived(
		rows
			.filter((row, i) => i > 0 && row.policyCount < rows[i - 1].policyCount)
			.map((row) => row.policyYear)
	);
</script>

<svelte:head><title>SERP-PLUS — Ledgers</title></svelte:head>

<main>
	<header class="head">
		<p class="eyebrow">Illustrated values</p>
		<h1>Ledgers</h1>
		{#if quote}
			<p class="sub">{quote.company.name}</p>
		{/if}
	</header>

	{#if !quote}
		<p class="empty">No quote yet. <a href="/">Create one</a> to design policies.</p>
	{:else if !results || availableOptionIds.size === 0}
		<p class="empty">
			No illustrated policies yet. <a href="/">Run the model</a> to design the COLI funding, then the
			year-by-year ledgers appear here.
		</p>
	{:else}
		<div class="controls">
			<div class="control">
				<span class="label" id="opt-label">Funding option</span>
				<div class="segmented" role="group" aria-labelledby="opt-label">
					{#each options as option (option.id)}
						<button
							type="button"
							class="seg"
							class:on={option.id === selectedOptionId}
							disabled={!availableOptionIds.has(option.id)}
							aria-pressed={option.id === selectedOptionId}
							title={availableOptionIds.has(option.id)
								? option.label
								: `${option.label} — nothing designed under this option`}
							onclick={() => (selectedOptionId = option.id)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="control">
				<label class="label" for="subject">Policy</label>
				<!--
					Bound to the ACTIVE subject, not the selected one. When switching option drops the
					selected policy, `activeSubjectId` falls back to the first subject — binding the
					selection instead would leave the control showing a policy the table is not rendering.
				-->
				<select
					id="subject"
					value={activeSubjectId}
					onchange={(event) => (selectedSubjectId = event.currentTarget.value)}
				>
					{#each subjects as subject (subject.id)}
						<option value={subject.id}>{subject.label}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if rows.length === 0}
			<p class="empty">Nothing is designed under this funding option.</p>
		{:else}
			<div class="facts">
				<div class="fact">
					<span class="k">Years illustrated</span><span class="v">{totals.years}</span>
				</div>
				<div class="fact">
					<span class="k">Total premium</span>
					<span class="v">{formatMoneyDisplay(totals.totalPremium)}</span>
				</div>
				{#if distributing}
					<div class="fact">
						<span class="k">Total distributed</span>
						<span class="v">{formatMoneyDisplay(totals.totalDistribution)}</span>
					</div>
				{/if}
				{#if isComposite}
					<div class="fact">
						<span class="k">Policies</span><span class="v">{totals.policyCount}</span>
					</div>
				{:else if design}
					<div class="fact">
						<span class="k">Face amount</span>
						<span class="v">{formatMoneyDisplay(design.faceAmount)}</span>
					</div>
					<div class="fact">
						<span class="k">First-year premium</span>
						<span class="v">{formatMoneyDisplay(design.firstYearPremium)}</span>
					</div>
				{/if}
			</div>

			{#if design}
				{@const flags = [
					design.solveFeasible === false ? 'Solve infeasible' : null,
					design.gptAdjusted ? 'GPT-adjusted premium' : null,
					design.mecAdjusted ? 'MEC-adjusted premium' : null,
					design.lapseYear != null ? `Lapses in policy year ${design.lapseYear}` : null
				].filter((f) => f !== null)}
				{#if flags.length > 0}
					<p class="flags">
						{#each flags as flag (flag)}<span class="flag">{flag}</span>{/each}
					</p>
				{/if}
			{/if}

			{#if isComposite && dropYears.length > 0}
				<p class="note">
					Policies stop contributing as they lapse — the totals step down in policy year
					{dropYears.join(', ')}. The <span class="nowrap">“Policies”</span> column shows how many were
					still illustrating.
				</p>
			{/if}

			{#if distributing}
				<p class="note">
					This option funds the SERP benefit out of the policy. Cash comes out as a withdrawal while
					basis lasts and as a loan after that, so the account value falls through the distribution
					years by design. <strong>Net death benefit</strong> is what the company actually collects —
					the insurer repays the loan out of the proceeds, and the loan was already received as a distribution
					while the insured was alive.
				</p>
			{/if}

			<table>
				<thead>
					<tr>
						<th class="yr">Policy year</th>
						<th class="yr">{isComposite ? 'Policies' : 'Age'}</th>
						<th class="num">Premium</th>
						{#if distributing}
							<th class="num">Withdrawal</th>
							<th class="num">Loan</th>
							<th class="num">Loan balance</th>
						{/if}
						<th class="num">Account value</th>
						<th class="num">Surrender value</th>
						<th class="num">Death benefit</th>
						{#if distributing}
							<th class="num">Net death benefit</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.policyYear)}
						<tr>
							<td class="yr">{row.policyYear}</td>
							<td class="yr">{isComposite ? row.policyCount : (row.age ?? '—')}</td>
							<td class="num">{formatMoneyDisplay(row.premium)}</td>
							{#if distributing}
								<td class="num out">{formatMoneyDisplay(row.withdrawal)}</td>
								<td class="num out">{formatMoneyDisplay(row.loan)}</td>
								<td class="num">{formatMoneyDisplay(row.loanBalance)}</td>
							{/if}
							<td class="num">{formatMoneyDisplay(row.accountValue)}</td>
							<td class="num">{formatMoneyDisplay(row.cashSurrenderValue)}</td>
							<td class="num">{formatMoneyDisplay(row.deathBenefit)}</td>
							{#if distributing}
								<td class="num net">{formatMoneyDisplay(row.netDeathBenefit)}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<td class="yr">Total</td>
						<td class="yr"></td>
						<td class="num">{formatMoneyDisplay(totals.totalPremium)}</td>
						{#if distributing}
							<td class="num out">{formatMoneyDisplay(totals.totalWithdrawal)}</td>
							<td class="num out">{formatMoneyDisplay(totals.totalLoan)}</td>
							<!-- A running balance has no total; summing it down the years would be nonsense. -->
							<td class="num"></td>
						{/if}
						<td class="num" colspan={distributing ? 4 : 3}></td>
					</tr>
				</tfoot>
			</table>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 68rem;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}
	.head {
		margin-bottom: 1.75rem;
	}
	.eyebrow {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 0.3rem;
	}
	h1 {
		font-family: var(--serif);
		font-size: 1.6rem;
		color: var(--ink);
		margin: 0;
	}
	.sub {
		margin: 0.25rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.empty {
		color: var(--muted);
		font-size: 0.92rem;
		background: var(--fill);
		border: 1px solid var(--line-soft);
		padding: 1rem 1.15rem;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1.75rem;
		align-items: flex-end;
		margin-bottom: 1.5rem;
	}
	.control {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.segmented {
		display: flex;
		flex-wrap: wrap;
		border: 1px solid var(--line);
		background: var(--paper);
	}
	.seg {
		font: inherit;
		font-size: 0.8rem;
		padding: 0.45rem 0.85rem;
		background: none;
		border: 0;
		border-right: 1px solid var(--line);
		color: var(--ink-soft);
		cursor: pointer;
	}
	.seg:last-child {
		border-right: 0;
	}
	.seg:hover:not(:disabled) {
		background: var(--fill);
	}
	.seg.on {
		background: var(--ink);
		color: #fff;
	}
	.seg:disabled {
		color: var(--line);
		cursor: not-allowed;
	}
	select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--line);
		background: var(--paper);
		color: var(--ink);
		min-width: 16rem;
	}
	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		padding: 0.85rem 1.15rem;
		background: var(--fill);
		border: 1px solid var(--line-soft);
		margin-bottom: 1rem;
	}
	.fact {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.fact .k {
		font-size: 0.66rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.fact .v {
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
		color: var(--ink);
	}
	.flags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 0 1rem;
	}
	.flag {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--warn-tx);
		background: #fdf3e7;
		border: 1px solid var(--bronze);
		padding: 0.2rem 0.55rem;
	}
	.note {
		font-size: 0.82rem;
		color: var(--muted);
		margin: 0 0 1rem;
	}
	.nowrap {
		white-space: nowrap;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.85rem;
		background: var(--paper);
	}
	th,
	td {
		border: 1px solid var(--line-soft);
		padding: 0.35rem 0.7rem;
	}
	thead th {
		background: var(--ink);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-align: right;
		border-color: var(--ink);
	}
	thead th.yr {
		text-align: left;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	/* Cash leaving the policy — distinguished from the values that stay in it. */
	.out {
		color: var(--accent-deep);
	}
	/* The figure the company actually collects. */
	.net {
		font-weight: 600;
	}
	.yr {
		text-align: left;
		font-variant-numeric: tabular-nums;
	}
	tbody tr:nth-child(even) {
		background: #fafcfc;
	}
	tfoot td {
		font-weight: 700;
		background: var(--fill);
		border-top: 2px solid var(--ink);
	}
</style>
