<script lang="ts">
	/**
	 * Legacy Report — F2 COLI Accounting Entry Worksheet (section page 6.4).
	 * Placeholder — see DATA-GAPS.md.
	 *
	 * One entry block per funding option, labels taken from the funding registry so the page stays
	 * in step with the options the app designs.
	 *
	 * ⚠ The source sheet carries **only Options 1 and 2**, so that is what is reproduced here.
	 * Whether Options 3 and 4 belong on continuation sheets is an open question in DATA-GAPS.md —
	 * rendering all four overflows the page, which is itself a hint that the source splits them.
	 */
	import { REPORT_FUNDING_OPTIONS, type ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import type { SheetRow } from './accounting-sheet-types';
	import { accountingPeriods, debitCreditColumns } from './accounting-periods';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(debitCreditColumns(accountingPeriods(report.legacyRefDate)));

	/** The same four entry lines repeat under each option. */
	const entryRows = (): SheetRow[] => [
		{ label: 'To record annual life insurance policy changes', note: '', indent: false },
		{ label: 'Life Insurance — Cash Surrender Value (Change)', indent: true },
		{ label: 'Life Insurance — Revenue (non-taxable)', indent: true },
		{ label: 'Cash (premium)', indent: true },
		{ label: 'To record receipt of life insurance death benefits' },
		{ label: 'Cash', indent: true },
		{ label: 'Life Insurance — Cash Surrender Value', indent: true },
		{ label: 'Life Insurance — Gain on Receipt of Death Benefit (non-taxable)', indent: true }
	];
	const SOURCE_OPTIONS = REPORT_FUNDING_OPTIONS.slice(0, 2);
	const rows = $derived(
		SOURCE_OPTIONS.flatMap((option): SheetRow[] => [
			{ label: `Option ${option.number} — ${option.label}`, heading: true },
			...entryRows()
		])
	);
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.4"
	title="COLI Accounting Entry Worksheet — Calendar Year — Consolidated"
	{columns}
	{rows}
	notes={[
		'This worksheet provides suggested accounting entries but should not be considered tax or accounting advice.',
		'Life Insurance (COLI) Accounting Treatment — Insurance is accounted for independently of the SERP, in accordance with the "Cash Surrender Value" method of accounting (FASB ASC 325-30). Under this Standard, each year the net difference between that year\'s premium payment, cash surrender value change, and net death proceeds received is charged or credited to the employer\'s earnings. The cash surrender value recorded for the life insurance contract is adjusted accordingly. Premium payments are not deductible, while both cash surrender value increases and death proceeds are non-taxable.'
	]}
/>
