<script lang="ts">
	/**
	 * Interactive Report ("/report/interactive") — the web-native proposal, structured as a
	 * buyer's decision journey. Each section answers ONE question a purchaser asks, plainly, and
	 * each answer removes a reason to say no: problem → people → promise → cost → choice → books →
	 * risk → decision. Unlike the internal workspace, this carries the persuasive editorial voice.
	 *
	 * Reads the derived ReportModel from the active quote; the funding section is interactive
	 * (pick an option to see its numbers). Populates only after a run.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { deriveReport, REPORT_FUNDING_OPTIONS } from '$lib/report/report-data';

	function todayIso(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const report = $derived(quoteStore.current ? deriveReport(quoteStore.current, todayIso()) : null);
	const hasResults = $derived(report?.hasResults === true);

	// The funding options that were actually designed and are feasible (have a premium to show).
	const options = $derived.by(() => {
		if (!report) return [];
		return REPORT_FUNDING_OPTIONS.map((o) => {
			const totals = report.fundingOptions[o.id];
			const flow = report.cashFlowByOption[o.id];
			return {
				id: o.id,
				number: o.number,
				label: o.label,
				premium: totals?.premium ?? null,
				avgFace: totals?.averageFace ?? null,
				costRecovery: flow?.costRecovery ?? null,
				designed: !!totals && (totals.infeasibleCount ?? 0) === 0
			};
		}).filter((o) => o.designed);
	});

	let selectedId = $state<string | null>(null);
	const selected = $derived(options.find((o) => o.id === selectedId) ?? options[0] ?? null);

	// Parse a "1,234%" or "$1,234" string to a number for the bar widths.
	function pctNum(s: string | null): number {
		if (!s) return 0;
		return Number(s.replace(/[^0-9.-]/g, '')) || 0;
	}
</script>

<svelte:head><title>SERP Pro — Interactive Report</title></svelte:head>

{#if !report || !hasResults}
	<main class="empty">
		<p class="eyebrow">Interactive Report</p>
		<h1>Nothing to show yet</h1>
		<p class="lede">Run the model on a quote, then come back to walk the proposal.</p>
		<a class="back" href="/">← Back to the workspace</a>
	</main>
{:else}
	<div class="ir">
		<div class="ir-nav no-print">
			<span class="brand">SERP&nbsp;<b>Pro</b></span>
			<a class="back" href="/">← Workspace</a>
		</div>

		<!-- 1 · OPENING -->
		<section class="scene cover">
			<p class="kicker">Prepared for</p>
			<h1 class="client">{report.companyName}</h1>
			<p class="thesis">
				A retirement benefit that keeps your most important people — funded in a way that,
				at the end, largely pays for itself.
			</p>
			<p class="asof">{report.runDate}</p>
		</section>

		<!-- 2 · WHY -->
		<section class="scene">
			<p class="q-eyebrow">The objective</p>
			<h2 class="q">Why put this in place?</h2>
			<p class="body">
				{report.companyName} relies on
				<b>{report.numSerp} key {report.numSerp === 1 ? 'executive' : 'executives'}</b>
				earning a combined {report.coveredPayroll} in recognized salary. A Supplemental Executive
				Retirement Plan rewards them for staying — a promise of retirement income above their
				qualified plans — without the cost and testing of a broad-based program.
			</p>
		</section>

		<!-- 3 · WHO -->
		<section class="scene">
			<p class="q-eyebrow">The people</p>
			<h2 class="q">Who is covered?</h2>
			<p class="body">The plan is written for these individuals — the ones you most need to retain.</p>
			<ul class="people">
				{#each report.samples as s (s.insuredId)}
					<li>
						<span class="pn">{s.name}</span>
						<span class="pd">age {s.age} · retires {s.retirementAge} · {s.benefitPercent} of final pay</span>
						<span class="pb">{s.annualBenefit}<small>/yr benefit</small></span>
					</li>
				{/each}
			</ul>
			{#if report.numSerp > report.samples.length}
				<p class="foot">…and {report.numSerp - report.samples.length} more, detailed in the census.</p>
			{/if}
		</section>

		<!-- 4 · PROMISE -->
		<section class="scene">
			<p class="q-eyebrow">The promise</p>
			<h2 class="q">What will we owe them?</h2>
			<div class="promise">
				<div class="p-big">
					<div class="n">{report.netPresentValue}</div>
					<div class="l">present value of the promise today</div>
				</div>
				<p class="body">
					Over the life of the plan the company expects to pay
					<b>{report.totalBenefitCost}</b> in benefits — roughly {report.payoutYears} years of
					income beginning at age {report.firstPaymentAge} for each executive. In today's dollars,
					discounted at {report.settings.npvDiscountRate ? (report.settings.npvDiscountRate * 100).toFixed(2) : '0'}%,
					that obligation is <b>{report.netPresentValue}</b>.
				</p>
			</div>
		</section>

		<!-- 5 · COST (the turn) -->
		<section class="scene highlight">
			<p class="q-eyebrow gold">The cost</p>
			<h2 class="q">What does it actually cost us?</h2>
			<div class="cost">
				<div class="c-fig">
					<div class="n">{report.afterTaxCost}</div>
					<div class="l">after-tax cost to deliver the full benefit</div>
				</div>
				{#if selected?.costRecovery}
					<p class="aside">
						But the company is not simply spending it. The corporate-owned life insurance that
						funds the plan returns the program's cost at each executive's passing — a projected
						<b>{selected.costRecovery} recovered</b> under the {selected.label} design.
					</p>
				{/if}
			</div>
		</section>

		<!-- 6 · CHOICE (interactive) -->
		<section class="scene">
			<p class="q-eyebrow">The choice</p>
			<h2 class="q">How should we fund it?</h2>
			<p class="body">
				Four structures deliver the same promise; they differ in how the policies hold cash, how
				the benefit is paid, and how much of the cost comes back. Select one to see its numbers.
			</p>

			<div class="opts">
				{#each options as o (o.id)}
					<button
						type="button"
						class="opt"
						class:active={selected?.id === o.id}
						onclick={() => (selectedId = o.id)}
					>
						<span class="oi">{o.number}</span>
						<span class="ol">{o.label}</span>
						{#if o.costRecovery}<span class="orc">{o.costRecovery}<small>recovery</small></span>{/if}
					</button>
				{/each}
			</div>

			{#if selected}
				<div class="opt-detail">
					<div class="od-fig">
						<div class="n">{selected.premium ?? '—'}</div>
						<div class="l">Annual premium</div>
					</div>
					<div class="od-fig">
						<div class="n">{selected.avgFace ?? '—'}</div>
						<div class="l">Average policy face</div>
					</div>
					<div class="od-fig">
						<div class="n rec">{selected.costRecovery ?? '—'}</div>
						<div class="l">Cost recovered</div>
						<div class="track"><span class="bar" style="width: {Math.min(100, pctNum(selected.costRecovery))}%"></span></div>
					</div>
				</div>
			{/if}
		</section>

		<!-- 7 · BOOKS -->
		<section class="scene">
			<p class="q-eyebrow">The books</p>
			<h2 class="q">How does it hit our financials?</h2>
			<p class="body">
				The SERP obligation accrues as a pension expense under ASC 715-30, offset by a deferred
				tax benefit; the COLI is carried at cash-surrender value under ASC 325-30, with its growth
				and death proceeds credited to earnings. The net effect is an early expense that the
				policy earnings recover over time — laid out year by year in the detailed report.
			</p>
		</section>

		<!-- 8 · RISK -->
		<section class="scene">
			<p class="q-eyebrow">The safeguards</p>
			<h2 class="q">What if an executive dies early — or outlives the plan?</h2>
			<p class="body">
				If an executive dies before retiring, the policy death benefit covers the plan's
				pre-retirement survivor obligation to their family. If they live well beyond life
				expectancy, the designs are structured to stay in force and keep paying — the funding is
				sized to the promise, not to a single assumed date.
			</p>
		</section>

		<!-- 9 · DECISION -->
		<section class="scene close">
			<p class="q-eyebrow gold">The decision</p>
			<h2 class="q">Where this leaves {report.companyName}.</h2>
			<div class="summary">
				<div class="s-row"><span>Executives retained</span><b>{report.numSerp}</b></div>
				<div class="s-row"><span>Benefit promised (today's value)</span><b>{report.netPresentValue}</b></div>
				<div class="s-row"><span>After-tax cost</span><b>{report.afterTaxCost}</b></div>
				{#if selected?.costRecovery}<div class="s-row"><span>Cost recovered · {selected.label}</span><b>{selected.costRecovery}</b></div>{/if}
			</div>
			<p class="thesis small">
				A meaningful benefit for the people who matter most — at a net cost the company largely
				earns back.
			</p>
			<div class="cta no-print">
				<a class="btn" href="/report">View the printed proposal</a>
				<a class="btn ghost" href="/report/legacy">See the full record</a>
			</div>
		</section>
	</div>
{/if}

<style>
	.ir {
		--gold: var(--bronze);
		--gold-deep: var(--bronze-deep);
		background: var(--canvas, #f0eee8);
		color: var(--ink);
		font-family: var(--sans);
	}
	.ir-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
	}
	.ir-nav .brand {
		font-family: var(--serif);
		font-weight: 700;
		font-size: 1.05rem;
	}
	.ir-nav .brand b {
		color: var(--gold);
	}
	.ir-nav .back {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink-soft);
		text-decoration: none;
	}

	.scene {
		max-width: 42rem;
		margin: 0 auto;
		padding: 5rem 1.75rem;
		border-bottom: 1px solid var(--line-soft);
	}
	.q-eyebrow {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--gold-deep);
		margin: 0 0 1rem;
	}
	.q-eyebrow.gold {
		color: var(--gold-deep);
	}
	h2.q {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 2rem;
		line-height: 1.12;
		letter-spacing: -0.01em;
		margin: 0 0 1.5rem;
		text-wrap: balance;
	}
	.body {
		font-size: 1.06rem;
		line-height: 1.65;
		color: var(--ink-soft);
		margin: 0;
	}
	.body b {
		color: var(--ink);
		font-weight: 600;
	}

	/* cover */
	.cover {
		text-align: center;
		padding: 7rem 1.75rem 6rem;
	}
	.cover .kicker {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--gold-deep);
		margin: 0 0 1rem;
	}
	.cover .client {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 3.2rem;
		line-height: 1.05;
		letter-spacing: -0.02em;
		margin: 0 0 1.75rem;
		text-wrap: balance;
	}
	.thesis {
		font-family: var(--serif);
		font-size: 1.4rem;
		font-style: italic;
		line-height: 1.5;
		color: var(--ink-soft);
		margin: 0 auto;
		max-width: 30rem;
	}
	.thesis.small {
		font-size: 1.15rem;
		margin-top: 2rem;
	}
	.cover .asof {
		margin-top: 2.5rem;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	/* people */
	ul.people {
		list-style: none;
		margin: 1.75rem 0 0;
		padding: 0;
	}
	ul.people li {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: baseline;
		gap: 0.15rem 1rem;
		padding: 1rem 0;
		border-top: 1px solid var(--line);
	}
	.pn {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.2rem;
	}
	.pd {
		grid-column: 1;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.pb {
		grid-row: 1 / 3;
		grid-column: 2;
		align-self: center;
		font-family: var(--serif);
		font-weight: 700;
		font-size: 1.3rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.pb small {
		display: block;
		font-family: var(--sans);
		font-weight: 500;
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
	}
	.foot {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 1rem 0 0;
		font-style: italic;
	}

	/* promise + cost figures */
	.promise,
	.cost {
		display: grid;
		gap: 1.75rem;
	}
	.p-big .n,
	.c-fig .n {
		font-family: var(--serif);
		font-weight: 700;
		font-size: 3.4rem;
		line-height: 1;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
	}
	.p-big .l,
	.c-fig .l {
		font-size: 0.92rem;
		color: var(--ink-soft);
		margin-top: 0.5rem;
	}
	.highlight {
		background: var(--paper);
	}
	.aside {
		font-family: var(--serif);
		font-style: italic;
		font-size: 1.28rem;
		line-height: 1.55;
		color: var(--ink);
		border-left: 3px solid var(--gold);
		padding: 0.25rem 0 0.25rem 1.4rem;
		margin: 0;
	}
	.aside b {
		font-style: normal;
		color: var(--pos-tx, #356b2f);
	}

	/* option selector */
	.opts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
		gap: 0.75rem;
		margin: 2rem 0 0;
	}
	.opt {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		text-align: left;
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 2px;
		padding: 0.9rem 1rem;
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			box-shadow 0.12s ease;
	}
	.opt:hover {
		border-color: var(--ink-soft);
	}
	.opt.active {
		border-color: var(--gold);
		border-top: 2.5px solid var(--gold);
		box-shadow: 0 2px 12px rgba(16, 38, 47, 0.08);
	}
	.opt .oi {
		font-family: var(--serif);
		font-weight: 700;
		color: var(--gold-deep);
	}
	.opt .ol {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 0.98rem;
		line-height: 1.2;
	}
	.opt .orc {
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
	}
	.opt .orc small {
		font-weight: 500;
		color: var(--muted);
		margin-left: 0.3rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: 0.6rem;
	}
	.opt-detail {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		margin-top: 1.75rem;
		padding-top: 1.75rem;
		border-top: 2px solid var(--ink);
	}
	@media (max-width: 560px) {
		.opt-detail {
			grid-template-columns: 1fr;
			gap: 1.1rem;
		}
	}
	.od-fig .n {
		font-family: var(--serif);
		font-weight: 700;
		font-size: 1.9rem;
		font-variant-numeric: tabular-nums;
	}
	.od-fig .n.rec {
		color: var(--accent-deep);
	}
	.od-fig .l {
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
		margin-top: 0.35rem;
	}
	.od-fig .track {
		height: 6px;
		background: var(--line-soft);
		border-radius: 1px;
		margin-top: 0.6rem;
		overflow: hidden;
	}
	.od-fig .bar {
		display: block;
		height: 100%;
		background: var(--accent);
	}

	/* decision */
	.close {
		text-align: center;
		border-bottom: none;
		padding-bottom: 6rem;
	}
	.summary {
		max-width: 30rem;
		margin: 0 auto;
		text-align: left;
	}
	.s-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		padding: 0.85rem 0;
		border-top: 1px solid var(--line);
		font-size: 0.95rem;
		color: var(--ink-soft);
	}
	.s-row b {
		font-family: var(--serif);
		font-size: 1.2rem;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.cta {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 2.5rem;
		flex-wrap: wrap;
	}
	.btn {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		padding: 0.7rem 1.5rem;
		border-radius: 2px;
		background: var(--ink);
		color: #fff;
		border: 1px solid var(--ink);
	}
	.btn.ghost {
		background: transparent;
		color: var(--ink-soft);
		border-color: var(--line);
	}

	/* empty state */
	main.empty {
		max-width: 40rem;
		margin: 0 auto;
		padding: 5rem 1.5rem;
		text-align: center;
		color: var(--ink-soft);
	}
	main.empty .eyebrow {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--bronze-deep);
	}
	main.empty h1 {
		font-family: var(--serif);
		font-size: 2rem;
		color: var(--ink);
		margin: 0.5rem 0 0.75rem;
	}
	main.empty .back {
		display: inline-block;
		margin-top: 1.5rem;
		color: var(--accent-deep);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.85rem;
	}
</style>
