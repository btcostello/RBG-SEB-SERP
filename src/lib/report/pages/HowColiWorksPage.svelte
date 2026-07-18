<script lang="ts">
	/**
	 * 3.2 How COLI works — static educational reference prose (from the presentation
	 * template draft); no computed data.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell {report} eyebrow="Part 3 · Reference" title="How COLI works" pageNo="3.2">
	<div class="reftext">
		<p>
			The employer buys life insurance on a select group of executives, owns the policies, pays the
			premiums, and is the sole beneficiary. On the death of an insured, the employer receives the
			proceeds — generally free of federal income tax [IRC 101(a)(1)].
		</p>
		<p>
			COLI is a funding vehicle that can be designed to: provide <strong>cost recovery</strong> as
			mortality occurs; provide the <strong>funding wherewithal</strong> for benefit commitments when
			due; protect against the risk of premature deaths; and offset the financial-statement impact of
			accruing the benefit.
		</p>
		<p>
			Premiums are not deductible [IRC 264(a)(1)], but policy cash surrender values are carried as a
			balance-sheet asset. The net annual charge or credit to earnings is the difference between
			premium paid, change in cash surrender value, and death proceeds received.
		</p>
		<p class="small">
			Values shown throughout are hypothetical and not guaranteed. Read the product and fund
			prospectuses before investing.
		</p>
	</div>
</PageShell>
