<script lang="ts">
	/**
	 * Legacy Report — B1 SERP Actuarial Modeling System (source: "B1 SERP AMS.pdf"), page 1.2.
	 *
	 * Static overview of the ExecNav modeling system: centered title, two paragraphs, a lead-in
	 * with a bulleted list of what the system illustrates, and a closing paragraph. Only the
	 * footer date is data-driven (via LegacyPageShell). Footer mirrors page 1.1 (page no. right).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();

	const ILLUSTRATES: string[] = [
		'Individual participant pre- and post-retirement benefits',
		'Year-by-year liability-asset matching analyses',
		'Year-by-year company cash flow analyses',
		"Year-by-year accounting impact on the Company's earnings statement",
		"Year-by-year accounting impact on the Company's balance sheet",
		'Funding alternative analyses',
		'Suggested accounting journal entries and associated financial statement notes',
		'Year-by-year audit trails',
		'Detailed supporting schedules'
	];
</script>

<LegacyPageShell {report} pageNo="1.2" pageNoSide="right">
	<div class="ams">
		<h1 class="ams-title">SERP Actuarial Modeling System</h1>

		<p>
			Schiff Executive Benefits has developed a unique and proprietary management tool and
			actuarial modeling system called ExecNav, which aids in designing and administering
			non-qualified defined benefit Supplemental Executive Retirement Programs (SERPs).
		</p>
		<p>
			This system typically applies to all eligible employee SERP participants within
			C-corporations, and eligible employee participants in pass-through entities (e.g.,
			S-corporations, partnerships, LLPs and LLCs). It can also be used to support partner or
			member capital account obligations as well as ESOP shareholder redemptions.
		</p>
		<p>
			Based on the plan design and actuarial assumptions developed by Schiff Executive Benefits
			and the client, the SERP system illustrates:
		</p>

		<ul class="ams-list">
			{#each ILLUSTRATES as item, i (i)}
				<li>{item}</li>
			{/each}
		</ul>

		<p>
			ExecNav provides the Company a dynamic tool to help management and the board of directors
			design the most appropriate SERP arrangements to meet specific company objectives in an
			efficient and cost-effective manner.
		</p>
	</div>
</LegacyPageShell>

<style>
	.ams-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 17pt;
		text-align: center;
		margin-bottom: 20px;
	}
	.ams p {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.55;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 12px;
	}
	.ams-list {
		list-style: none;
		margin: 0 0 12px;
		padding: 0 0 0 16px;
	}
	.ams-list li {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.5;
		color: var(--ink-soft);
		padding: 2px 0;
	}
	.ams-list li::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		border: 1.2px solid var(--bronze);
		margin-right: 11px;
		vertical-align: 0.09em;
	}
</style>
