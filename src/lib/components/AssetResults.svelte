<script lang="ts">
	/**
	 * COLI asset-design results (FR20, FR21).
	 * Surfaces, per designed policy: funding option, face, solved premium, year-1 account value /
	 * CSV / death benefit, the compliance + feasibility flags, and the guideline premiums.
	 *
	 * A run designs several options per participant, so rows are keyed by participant AND option —
	 * `insuredId` alone is no longer unique.
	 */
	import { runState } from '$lib/stores/run-state.svelte';
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { formatMoneyDisplay } from '$lib/money/money';
	import { listFundingStrategies } from '$lib/funding';

	function nameFor(insuredId: string): string {
		const insured = quoteStore.current?.census.find((c) => c.id === insuredId);
		return insured ? `${insured.firstName} ${insured.lastName}` : insuredId;
	}

	const labelById = new Map(listFundingStrategies().map((s) => [s.id, s.label]));
	const optionLabel = (id: string): string => labelById.get(id) ?? id;

	const yesNo = (value: boolean): string => (value ? 'Yes' : 'No');
</script>

{#if runState.status === 'done' && runState.designed.length > 0}
	<section>
		<h2>COLI asset design</h2>
		<table>
			<thead>
				<tr>
					<th>Participant</th>
					<th>Funding option</th>
					<th>Face</th>
					<th>Solved premium</th>
					<th>Acct value (yr 1)</th>
					<th>CSV (yr 1)</th>
					<th>Death benefit (yr 1)</th>
					<th>GPT</th>
					<th>MEC</th>
					<th>Solve</th>
					<th>Lapses</th>
					<th>Guideline (single / level A / level B)</th>
				</tr>
			</thead>
			<tbody>
				{#each runState.designed as policy (`${policy.insuredId}:${policy.strategyId}`)}
					{@const ill = policy.illustration}
					{@const y1 = ill.years[0]}
					{@const infeasible = ill.solve != null && !ill.solve.feasible}
					<tr>
						<td>{nameFor(policy.insuredId)}</td>
						<td>{optionLabel(policy.strategyId)}</td>
						<td class="num">{formatMoneyDisplay(policy.faceAmount)}</td>
						<td class="num">{formatMoneyDisplay(ill.solvedAnnualPremium)}</td>
						<td class="num">{y1 ? formatMoneyDisplay(y1.accountValue) : '—'}</td>
						<td class="num">{y1 ? formatMoneyDisplay(y1.cashSurrenderValue) : '—'}</td>
						<td class="num">{y1 ? formatMoneyDisplay(y1.deathBenefit) : '—'}</td>
						<td class:flag={ill.gptAdjusted}>{yesNo(ill.gptAdjusted)}</td>
						<td class:flag={ill.mecAdjusted}>{yesNo(ill.mecAdjusted)}</td>
						<!-- An infeasible solve still returns 200 with a best effort, so say so. -->
						<td class:flag={infeasible}>
							{ill.solve == null ? '—' : infeasible ? 'Infeasible' : 'OK'}
						</td>
						<td class="num">{ill.lapseYear ?? '—'}</td>
						<td class="num">
							{formatMoneyDisplay(ill.guideline.singlePremium)} / {formatMoneyDisplay(
								ill.guideline.levelPremiumA
							)} / {formatMoneyDisplay(ill.guideline.levelPremiumB)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}

<style>
	section {
		margin-top: 1.5rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.85rem;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.flag {
		color: #7a4f01;
		font-weight: 600;
	}
</style>
