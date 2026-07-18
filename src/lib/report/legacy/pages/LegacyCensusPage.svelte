<script lang="ts">
	/**
	 * Legacy Report — C1 SERP Plan Census (source: "C1 Census.pdf"), section page 3.1.
	 *
	 * Per-participant census with age and years of service computed as of the plan effective date
	 * (report.legacyCensus). Totals show SERP/COLI counts and total recognized salary. "*" marks a
	 * SERP participant for whom COLI is not purchased.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const rows = $derived(report.legacyCensus);
</script>

<LegacyPageShell {report} pageNo="3.1">
	<div class="census">
		<div class="c-head">
			<div class="company">{report.companyName}</div>
			<h1>SERP Plan Census</h1>
		</div>

		<table>
			<thead>
				<tr>
					<th></th>
					<th class="txt">Participant</th>
					<th>Gender</th>
					<th>Smoker</th>
					<th>Date of Birth</th>
					<th>Nearest Age</th>
					<th>Date of Hire</th>
					<th>Years of Service</th>
					<th>Current Recognized Salary</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.index)}
					<tr>
						<td>{row.index}</td>
						<td class="txt">{row.name}{row.serpNotColi ? ' *' : ''}</td>
						<td>{row.gender}</td>
						<td>{row.smoker}</td>
						<td>{row.dateOfBirth}</td>
						<td>{row.age}</td>
						<td>{row.dateOfHire}</td>
						<td>{row.serviceYears}</td>
						<td class="num">{row.salary}</td>
					</tr>
				{/each}
				<tr class="tot">
					<td></td>
					<td class="txt">{report.numSerp} SERP Participants</td>
					<td colspan="6" class="txt sub">{report.numColi} COLI Participants</td>
					<td class="num">{report.legacyCensusSalaryTotal}</td>
				</tr>
			</tbody>
		</table>

		<div class="notes">
			<div class="nh">Notes &amp; Assumptions:</div>
			<ul>
				<li>Age calculated to nearest birthday, based on plan effective date of {report.legacyAsOfDisplay}.</li>
				<li>Years of service calculated to nearest whole year.</li>
				<li>Participant data as of {report.legacyAsOfDisplay}, submitted by {report.companyName}.</li>
				<li>
					Plan participation for retirement benefits is generally limited to a ‘top hat’ group, as
					defined by ERISA, to include a select group of key management or highly compensated
					employees.
				</li>
				<li>
					* Denotes individuals participating in SERP, but for whom COLI has not been or will not be
					purchased.
				</li>
			</ul>
		</div>
	</div>
</LegacyPageShell>

<style>
	.c-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.c-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.c-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 16pt;
	}
	table {
		font-size: 8pt;
	}
	th,
	td {
		padding: 3px 6px;
	}
	thead th {
		font-size: 6.8pt;
	}
	.tot .sub {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 8pt;
		color: var(--ink-soft);
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
