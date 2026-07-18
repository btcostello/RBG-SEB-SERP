<script lang="ts">
	/**
	 * 1.2 The objective — why the prospect company is putting a SERP in place. Prose page
	 * personalized with the plan population figures.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell
	{report}
	eyebrow="Part 1 · The recommendation"
	title="The objective"
	sub="Why {report.companyName} is putting this plan in place."
	pageNo="1.2"
>
	<p class="lead">
		Qualified retirement plans cap what the company can offer its most valuable people. A SERP fills
		that gap for a hand-picked group — rewarding tenure, restoring lost retirement income, and
		giving the company a set of &ldquo;golden handcuffs&rdquo; it fully controls.
	</p>

	<p>
		This proposal covers <strong>{report.numSerp} executive{report.numSerp === 1 ? '' : 's'}</strong
		>
		with combined recognized salary of <strong>{report.coveredPayroll}</strong> and an average age
		of
		<strong>{report.averageAge ?? '—'}</strong>. Participation is limited to a &ldquo;top-hat&rdquo;
		group — a select band of key management and highly compensated employees, as ERISA defines it —
		so the plan stays exempt from the funding and nondiscrimination rules that constrain qualified
		plans.
	</p>

	<p>A defined-benefit design was chosen deliberately. It gives the company:</p>
	<ul class="clean">
		<li>
			<strong>Full control of the benefit structure</strong> — the benefit percentage and retirement timing
			are set by the company, and can differ by executive.
		</li>
		<li>
			<strong>Retention leverage</strong> — the benefit is tied to final average salary and continued
			service, so leaving early forfeits real value.
		</li>
		<li>
			<strong>Predictable, deductible cost</strong> — benefits are deducted when paid, and the informal
			COLI financing is designed to recover that cost.
		</li>
	</ul>

	<p>
		The pages that follow set out the benefit design (1.3) and the cost-recovery financing (1.4).
		All supporting schedules — assumptions, census, projections, and policy design — are in Part 2,
		and Part 3 explains the mechanics for readers new to SERPs and COLI.
	</p>
</PageShell>
