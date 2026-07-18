<script lang="ts">
	/**
	 * 3.3 Accounting treatment — static educational reference prose (from the presentation
	 * template draft); no computed data.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell {report} eyebrow="Part 3 · Reference" title="Accounting treatment" pageNo="3.3">
	<div class="reftext">
		<h3 class="section-h" style="margin-top:0">The SERP liability</h3>
		<p>
			Accounting for qualified and nonqualified pension benefits falls under FASB ASC 715-30. The
			present value of future benefit payments — the unfunded Projected Benefit Obligation — is
			recognized as a liability, affecting both the earnings statement and balance sheet. A deferred
			tax asset is recorded under ASC 740-10 for the future tax benefit of those payments.
		</p>
		<h3 class="section-h">The COLI asset</h3>
		<p>
			COLI is accounted for separately under ASC 325-30 using the cash-surrender-value method. Each
			year the net of premium paid, change in cash surrender value, and death proceeds is charged or
			credited to earnings. Because coverage is expected to be held until death, no deferred tax
			liability on the insurance gains is generally recorded.
		</p>
		<p class="small">
			Illustrative only; not tax, accounting, or legal advice. The company should use its own
			projected effective tax rate.
		</p>
	</div>
</PageShell>
