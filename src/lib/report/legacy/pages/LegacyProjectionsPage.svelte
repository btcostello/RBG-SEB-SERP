<script lang="ts">
	/**
	 * Legacy Report — C1 Plan Participant Summary – Projections (source: "C1 Census.pdf"),
	 * section page 3.2.
	 *
	 * Projection table (report.legacyProjections). Age / service / age-at-retirement /
	 * service-at-retirement / % FAS are computed. FAS, annual SERP benefit, and total SERP benefit
	 * come from a completed run (else "—"). Salary-at-retirement and initial survivor benefit are
	 * not yet computed (tracked as gaps → "—").
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const rows = $derived(report.legacyProjections);
	const cell = (v: string | null) => v ?? '—';
</script>

<LegacyPageShell {report} pageNo="3.2" pageNoSide="right">
	<div class="proj">
		<div class="p-head">
			<div class="company">{report.companyName}</div>
			<h1>Plan Participant Summary — Projections</h1>
		</div>

		<table>
			<thead>
				<tr>
					<th></th>
					<th class="txt">Participant</th>
					<th>Age</th>
					<th>Service Yrs</th>
					<th>Age at Ret.</th>
					<th>Svc Yrs at Ret.</th>
					<th>Salary at Ret.</th>
					<th>5-Yr Final Avg Salary</th>
					<th>Initial Pre-Ret Survivor Benefit</th>
					<th>Annual SERP % FAS</th>
					<th>Annual SERP Benefit</th>
					<th>Total SERP Benefit to Life Exp.</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.index)}
					<tr>
						<td>{row.index}</td>
						<td class="txt">{row.name}</td>
						<td>{row.age}</td>
						<td>{row.serviceYears}</td>
						<td>{row.ageAtRetirement}</td>
						<td>{row.serviceYearsAtRetirement}</td>
						<td class="num" class:gap={!row.salaryAtRetirement}>{cell(row.salaryAtRetirement)}</td>
						<td class="num" class:gap={!row.finalAvgSalary}>{cell(row.finalAvgSalary)}</td>
						<td class="num" class:gap={!row.initialSurvivorBenefit}>{cell(row.initialSurvivorBenefit)}</td>
						<td>{row.percentFas}</td>
						<td class="num" class:gap={!row.annualSerpBenefit}>{cell(row.annualSerpBenefit)}</td>
						<td class="num" class:gap={!row.totalSerpBenefit}>{cell(row.totalSerpBenefit)}</td>
					</tr>
				{/each}
				<tr class="tot">
					<td></td>
					<td class="txt">{report.numSerp} SERP Participants</td>
					<td colspan="9"></td>
					<td class="num" class:gap={!report.legacySerpBenefitTotal}>{cell(report.legacySerpBenefitTotal)}</td>
				</tr>
			</tbody>
		</table>

		<div class="notes">
			<div class="nh">Notes &amp; Assumptions:</div>
			<ul>
				<li>
					Initial Pre-retirement Survivor Benefit calculation assumes death in current year.
					Projected Final Pre-retirement Survivor Benefit calculation assumes death in year prior to
					projected retirement age.
				</li>
				<li>
					Projected Total Retirement Benefit calculation assumes death at later of life expectancy
					or end of maximum retirement benefit period (if applicable).
				</li>
				<li>Average annual growth in salary assumed to be {report.planSpecs.salaryScale}.</li>
			</ul>
		</div>
	</div>
</LegacyPageShell>

<style>
	.p-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.p-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.p-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15pt;
	}
	table {
		font-size: 7.2pt;
	}
	th,
	td {
		padding: 3px 4px;
	}
	thead th {
		font-size: 6.3pt;
		vertical-align: bottom;
	}
	td.gap {
		color: var(--line);
	}
	.notes {
		margin-top: 14px;
	}
	.notes .nh {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 8.5pt;
		margin-bottom: 5px;
	}
	.notes ul {
		margin: 0;
		padding-left: 16px;
	}
	.notes li {
		font-family: var(--sans);
		font-size: 8pt;
		line-height: 1.45;
		color: var(--muted);
		margin-bottom: 3px;
	}
</style>
