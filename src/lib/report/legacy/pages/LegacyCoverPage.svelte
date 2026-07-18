<script lang="ts">
	/**
	 * Legacy Report — A1 Cover (source: "A1 Cover.pdf").
	 *
	 * Reproduces the source cover's simple centered layout: a plan-type label, the program
	 * title stack, the client name, the confidential mark and presentation notice, and the
	 * valuation date anchored bottom-right. Company name and date are data-driven; the rest is
	 * fixed boilerplate. Rendered with the report typography for house consistency.
	 */
	import type { ReportModel } from '../../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<div class="legacy-cover">
	<p class="doc-label">DB SERP</p>

	<div class="title-block">
		<p class="pre">Nonqualified Defined Benefit</p>
		<h1>Supplemental Executive<br />Retirement Plan</h1>
		<p class="paren">(SERP)</p>
		<p class="fin">Financed with COLI</p>
	</div>

	<div class="client">{report.companyName}</div>

	<p class="confidential">Confidential</p>

	<div class="notice">
		<p>For Presentation to Company Management</p>
		<p>Not for Distribution to Plan Participants</p>
	</div>

	<div class="cover-date">{report.runDate}</div>
</div>

<style>
	.legacy-cover {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		color: var(--ink);
	}
	.doc-label {
		font-family: var(--sans);
		font-size: 9pt;
		font-weight: 600;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0.2in 0 0;
	}
	.title-block {
		margin-top: 1.6in;
	}
	.title-block .pre {
		font-family: var(--serif);
		font-size: 14pt;
		color: var(--ink-soft);
		margin: 0 0 6px;
	}
	.title-block h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 30pt;
		line-height: 1.12;
		letter-spacing: -0.01em;
		margin: 0 0 12px;
	}
	.title-block .paren {
		font-family: var(--serif);
		font-size: 14pt;
		color: var(--ink-soft);
		margin: 0 0 2px;
	}
	.title-block .fin {
		font-family: var(--serif);
		font-size: 14pt;
		color: var(--ink-soft);
		margin: 0;
	}
	.client {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 20pt;
		margin-top: 1.1in;
	}
	.confidential {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 10pt;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--warn-tx);
		margin: 0.5in 0 0.35in;
	}
	.notice {
		font-family: var(--sans);
		font-size: 10pt;
		color: var(--ink-soft);
		line-height: 1.5;
	}
	.notice p {
		margin: 0;
	}
	.cover-date {
		margin-top: auto;
		width: 100%;
		text-align: right;
		font-family: var(--serif);
		font-size: 12pt;
		color: var(--ink);
	}
</style>
