<script lang="ts">
	/**
	 * Legacy Report — A3 Title page (source: "A3 TitlePage.pdf").
	 *
	 * The client name over a centered plan-title masthead (SERP financed with COLI), followed by
	 * the two standard disclosure paragraphs. Company name is data-driven (report.companyName);
	 * the title lines and disclosure text are fixed boilerplate reproduced verbatim from source.
	 */
	import type { ReportModel } from '../../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<div class="legacy-title">
	<div class="masthead">
		<div class="company">{report.companyName}</div>
		<h1>Supplemental Executive Retirement Plan</h1>
		<p class="paren">(SERP)</p>
		<p class="fin">Financed with</p>
		<h2>Company-Owned Life Insurance</h2>
		<p class="paren">(COLI)</p>
	</div>

	<div class="disclosure">
		<p>
			The information contained in this analysis is based solely upon data, documents,
			assumptions, and other information furnished by the employer, and the analysis is subject
			to change based upon actual experience. COLI and BOLI products presented herein are
			intended to demonstrate the general impact of products utilized. Details regarding specific
			insurance products are subject to illustrations and actual underwriting of participants. See
			Disclosure for policy assumptions and policy illustrations for more details.
		</p>
		<p>
			Nothing contained herein is, or should be construed as, legal, tax, or accounting advice,
			nor was it intended nor can it be used for the purpose of avoiding penalties under the
			Internal Revenue Code or applicable state or local tax provisions. This communication was
			written to support the promotion or marketing of the matters or transactions addressed
			herein, and clients should always consult with their independent professional advisors to
			seek advice on the applicability of this information to their particular circumstances.
		</p>
	</div>
</div>

<style>
	.legacy-title {
		flex: 1;
		display: flex;
		flex-direction: column;
		color: var(--ink);
	}
	.masthead {
		text-align: center;
		margin-top: 0.5in;
	}
	.masthead .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 17pt;
		margin-bottom: 0.55in;
	}
	.masthead h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 20pt;
		line-height: 1.15;
		text-transform: uppercase;
		letter-spacing: 0.01em;
		margin: 0 0 4px;
	}
	.masthead h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 18pt;
		line-height: 1.15;
		text-transform: uppercase;
		letter-spacing: 0.01em;
		margin: 0 0 4px;
	}
	.masthead .paren {
		font-family: var(--serif);
		font-size: 13pt;
		color: var(--ink-soft);
		margin: 0 0 10px;
	}
	.masthead .fin {
		font-family: var(--serif);
		font-size: 13pt;
		color: var(--ink-soft);
		margin: 6px 0 10px;
	}
	.disclosure {
		margin-top: 0.9in;
		max-width: 6in;
		margin-left: auto;
		margin-right: auto;
	}
	.disclosure p {
		font-family: var(--sans);
		font-size: 9pt;
		line-height: 1.55;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 12px;
	}
</style>
