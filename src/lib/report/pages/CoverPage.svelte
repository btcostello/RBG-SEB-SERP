<script lang="ts">
	/**
	 * Cover page (FR28) — full-bleed dark petrol sheet with a copper spine: firm line and
	 * confidential mark up top, the program title as the centerpiece, and the client name
	 * anchored at the foot. Registered in the report registry (FR31).
	 */
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<div class="cover">
	<div class="cover-top">
		<span>Schiff · Executive Benefits</span>
		<span class="conf">Confidential</span>
	</div>

	<div class="cover-main">
		<p class="kicker">Nonqualified defined benefit plan</p>
		<h1>Supplemental Executive<br />Retirement Plan</h1>
		<p class="subtitle">
			A retention and cost-recovery strategy for your key executives, informally financed with
			company-owned life insurance (COLI).
		</p>
	</div>

	<div class="cover-client">
		<span class="lbl">Prepared for</span>
		<div class="name">{report.companyName}</div>
	</div>

	<div class="cover-meta">
		<p class="note">
			For presentation to company management. Not for distribution to plan participants.
		</p>
		<div class="date">{report.runDate}</div>
	</div>
</div>
