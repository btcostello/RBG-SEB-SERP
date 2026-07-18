<script lang="ts">
	/**
	 * 3.4 Glossary — terms used throughout the proposal, in the order a reader meets them.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const terms: { term: string; def: string }[] = [
		{
			term: 'SERP',
			def: 'Supplemental Executive Retirement Plan — a nonqualified, unfunded defined-benefit promise to a select group of key executives.'
		},
		{
			term: 'COLI',
			def: 'Company-owned life insurance — policies the company owns and is beneficiary of, purchased on insured executives to informally finance the plan.'
		},
		{
			term: 'Top-hat group',
			def: 'A select group of management or highly compensated employees; limiting participation to this group exempts the plan from most ERISA funding rules.'
		},
		{
			term: 'Final average salary (FAS)',
			def: 'The average of the final projected salary years before retirement (the averaging period is a plan specification, page 2.1).'
		},
		{
			term: 'Benefit percentage',
			def: 'The fraction of final average salary paid as the annual retirement benefit; set per executive.'
		},
		{
			term: 'Recognized salary',
			def: 'The current annual salary the plan recognizes for an executive, projected forward at the salary scale.'
		},
		{
			term: 'Benefit stream',
			def: 'The year-by-year schedule of level annual benefit payments, from the first payment age through the assumed benefit age.'
		},
		{
			term: 'Total benefit cost',
			def: 'The sum of all projected benefit payments to a participant (or across the plan), before tax deductions.'
		},
		{
			term: 'Net present value (NPV)',
			def: 'Projected benefit payments discounted to the valuation date at the plan discount rate.'
		},
		{
			term: 'Cost recovery',
			def: 'A COLI sizing strategy: face amounts are set so tax-free death proceeds reimburse the company for the after-tax cost of the benefits it paid.'
		},
		{
			term: 'Face amount',
			def: "A policy's stated death benefit at issue."
		},
		{
			term: 'Cash surrender value (CSV)',
			def: 'What the policy would pay if surrendered — the account value less any surrender charges; carried as a balance-sheet asset.'
		},
		{
			term: 'Net surrender value at 100',
			def: 'The premium-solve target: each policy is funded so its net surrender value is $1,000 at age 100, keeping coverage in force for life.'
		},
		{
			term: 'GPT',
			def: 'Guideline Premium Test — an IRC §7702 limit on premiums relative to the death benefit for the contract to qualify as life insurance.'
		},
		{
			term: 'MEC',
			def: 'Modified Endowment Contract — a policy funded faster than the IRC §7702A 7-pay limit, which loses favorable tax treatment on lifetime distributions.'
		},
		{
			term: 'Risk class',
			def: "The carrier's underwriting classification for an insured, which drives policy pricing."
		}
	];
</script>

<PageShell
	{report}
	eyebrow="Part 3 · Reference"
	title="Glossary"
	sub="Terms used throughout this proposal."
	pageNo="3.4"
>
	<div class="gloss">
		{#each terms as entry (entry.term)}
			<div class="term">{entry.term}</div>
			<div class="def">{entry.def}</div>
		{/each}
	</div>
</PageShell>
