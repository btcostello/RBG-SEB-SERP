<script lang="ts">
	/**
	 * Legacy Report — B5 Plan Specifications & Actuarial Assumptions Overview
	 * (source: "B5 Plan Specs Details.pdf"), section page 2.4.
	 *
	 * A spec sheet: four plan-level rate rows, several labelled criteria/method sections, and the
	 * retirement-age / salary-scale assumptions. Data-driven via report.planSpecs (rates from
	 * corporate tax / NPV discount / crediting; NRA=retirementAge, ERA=NRA−5, salary scale=growth,
	 * each showing "Varies" when participants differ). Plan Effective Date has no input yet (gap).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const ps = $derived(report.planSpecs);

	/** "age 65" for a uniform value, or "varies" (lowercase, reads naturally mid-sentence). */
	const agePhrase = (v: string) => (v === 'Varies' ? 'varies' : `age ${v}`);
</script>

<LegacyPageShell {report} pageNo="2.4" pageNoSide="right">
	<div class="specs">
		<div class="sp-head">
			<div class="company">{report.companyName}</div>
			<h1>Plan Specifications and Actuarial Assumptions Overview</h1>
		</div>

		<div class="kv-block">
			<div class="kv">
				<span class="k">Plan Effective Date:</span>
				<span class="v">
					{#if ps.effectiveDate}{ps.effectiveDate}{:else}<span class="tbd">— not set —</span>{/if}
				</span>
			</div>
			<div class="kv">
				<span class="k">Long-Term Marginal Tax Rate:</span>
				<span class="v">{ps.longTermTaxRate}</span>
			</div>
			<div class="kv">
				<span class="k">Accounting Liability Interest Discount Rate:</span>
				<span class="v">{ps.accountingLiabilityDiscountRate}</span>
			</div>
			<div class="kv">
				<span class="k">Assumed Hypothetical COLI Net Rate of Return:</span>
				<span class="v">{ps.coliNetRateOfReturn}</span>
			</div>
		</div>

		<div class="item">
			<div class="lbl">Participation Criteria:</div>
			<ol class="lettered">
				<li>Individual selection as determined by the Board of Directors</li>
				<li>
					Participation for retirement benefits limited to a “top hat” group, defined by ERISA as a
					select group of key management or highly compensated employees
				</li>
			</ol>
		</div>

		<div class="item">
			<div class="lbl">Accounting Accrual Method:</div>
			<div class="txt">Financial Accounting Standards Board Accounting Standards Codification:</div>
			<ol class="lettered">
				<li>FASB ASC 715-30</li>
				<li>FASB ASC 740-10</li>
			</ol>
		</div>

		<div class="item">
			<div class="lbl">COLI Accounting Method:</div>
			<div class="txt">FASB ASC 325-30</div>
		</div>

		<div class="item">
			<div class="lbl">Mortality Assumption:</div>
			<ol class="lettered">
				<li>Mortality at Life Expectancy (generally age 84), for benefit and insurance computations</li>
				<li>Mortality Table used pursuant to IRC 417(e), for accounting liability &amp; other calculations</li>
			</ol>
		</div>

		<div class="item">
			<div class="lbl">Normal Retirement Age (NRA):</div>
			<div class="txt">Generally {agePhrase(ps.nra)} with no less than five years of plan participation</div>
		</div>

		<div class="item">
			<div class="lbl">Early Retirement Age (ERA):</div>
			<div class="txt">
				Typically {agePhrase(ps.era)} with ten years of service, and five years of plan participation
			</div>
		</div>

		<div class="item">
			<div class="lbl">Average Annual Growth in Salary (Salary Scale):</div>
			<div class="txt">{ps.salaryScale} per year compounded to retirement</div>
		</div>

		<div class="item">
			<div class="lbl">COLI Marginal Alternative Minimum Tax (AMT) Rate:</div>
			<div class="txt">Not Applicable</div>
		</div>

		<div class="item">
			<div class="lbl">COLI Products:</div>
			<div class="txt">
				This model is presented using hypothetical pricing reflecting products available in the
				marketplace and is intended to demonstrate the general impact of products utilized. Details
				regarding specific life insurance products are subject to illustrations and actual
				underwriting of participants. The hypothetical rates and values shown are not guaranteed.
			</div>
		</div>
	</div>
</LegacyPageShell>

<style>
	.sp-head {
		text-align: center;
		margin-bottom: 14px;
	}
	.sp-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 5px;
	}
	.sp-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15.5pt;
	}
	.kv-block {
		border-top: 1.5px solid var(--ink);
		border-bottom: 1.5px solid var(--ink);
		padding: 6px 0;
		margin-bottom: 14px;
	}
	.kv {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		padding: 2.5px 0;
		font-family: var(--sans);
		font-size: 9.5pt;
		color: var(--ink-soft);
	}
	.kv .v {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.tbd {
		font-style: italic;
		font-weight: 400;
		color: var(--warn-tx);
	}
	.item {
		margin-bottom: 9px;
	}
	.item .lbl {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 9.5pt;
		color: var(--ink);
	}
	.item .txt {
		font-family: var(--sans);
		font-size: 9.3pt;
		line-height: 1.45;
		color: var(--ink-soft);
		padding-left: 22px;
		margin-top: 1px;
	}
	.lettered {
		margin: 1px 0 0;
		padding-left: 40px;
	}
	.lettered li {
		font-family: var(--sans);
		font-size: 9.3pt;
		line-height: 1.45;
		color: var(--ink-soft);
		padding: 1px 0;
	}
	.lettered {
		list-style: lower-alpha;
	}
</style>
