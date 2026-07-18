<script lang="ts">
	/**
	 * 3.1 How SERPs work — static educational reference prose (from the presentation
	 * template draft); no computed data.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell {report} eyebrow="Part 3 · Reference" title="How SERPs work" pageNo="3.1">
	<div class="reftext">
		<p>
			A SERP is a <strong>nonqualified, unfunded</strong> plan designed to provide supplemental retirement
			and/or survivor benefits to a select group of key management or highly compensated employees. Because
			it is nonqualified, it is not entitled to special tax treatment — but neither is it bound by the
			coverage, funding, and nondiscrimination rules that constrain qualified plans.
		</p>
		<p>
			<strong>Unfunded</strong> means no assets are placed beyond the reach of the employer's general
			creditors. The employer may informally set aside assets, including COLI, to finance the benefits,
			so long as the participant's claim is no greater than that of a general creditor.
		</p>
		<p>
			SERPs require no IRS qualification; a one-time notification letter to the Department of Labor
			generally satisfies ERISA. The employer deducts benefit payments when made to a participant
			[IRC 404(a)(5)] or their survivors [IRC 162]. Benefits are ordinary income to the retiree [IRC
			61(a)]; survivor benefits are income in respect of a decedent [IRC 691(a)].
		</p>
		<p class="small">
			This overview is educational and not tax or legal advice. Consult your own advisors.
		</p>
	</div>
</PageShell>
