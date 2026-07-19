/**
 * Glossary content (source `I1 Glossary.pdf`, Appendix H.1–H.5).
 *
 * Static definitions, reproduced verbatim, with one exception: the salary-increase rate in the
 * first definition is a plan assumption, so it reads from the model ("Varies" when participants
 * differ, per the shared rule). Everything else is fixed text.
 *
 * Built as a function of the report rather than a constant so that one dynamic value does not
 * force the whole glossary into component markup.
 */
import type { ReportModel } from '../../report-data';

export interface GlossaryEntry {
	term: string;
	definition: string;
}

export interface GlossarySheet {
	/** e.g. "Glossary for Page 3.2". */
	title: string;
	/** e.g. "Appendix H.1". */
	pageNo: string;
	entries: GlossaryEntry[];
}

export function glossarySheets(report: ReportModel): GlossarySheet[] {
	// The only non-static value on these pages — see the module note.
	const salaryScale = report.planSpecs.salaryScale;

	return [
		{
			title: 'Glossary for Page 3.2',
			pageNo: 'Appendix H.1',
			entries: [
				{
					term: 'Salary at Retirement Age',
					definition: `A projection based on the participant's current salary with assumed ${salaryScale} per year salary increases`
				},
				{
					term: '5-Year Final Average Salary (FAS)',
					definition: 'The average of the projected highest consecutive five years of salary'
				},
				{
					term: 'Initial Pre-Retirement Survivor Benefits',
					definition:
						"A Participant's total current survivor benefit based on current salary, assuming death occurs in the current plan year"
				},
				{
					term: 'Final Pre-Retirement Survivor Benefits',
					definition:
						"A Participant's total survivor benefit assuming death occurs in the year prior to retirement, based on projected Salary at Retirement Age"
				},
				{
					term: 'Annual SERP Percent FAS',
					definition:
						'The percentage (as determined by Plan provisions) by which FAS is multiplied, to determine the annual Plan retirement benefit'
				},
				{
					term: 'Annual SERP Benefit',
					definition:
						'FAS multiplied by Annual SERP Percent of FAS to determine the amount of the annual Plan retirement benefit'
				},
				{
					term: 'Total SERP Benefits to Life Expectancy',
					definition:
						"Total SERP benefits projected to be paid between Normal Retirement Age and the Participant's assumed Life Expectancy"
				}
			]
		},
		{
			title: 'Glossary for Pages 5.2-1 through 5.2-4',
			pageNo: 'Appendix H.2',
			entries: [
				{
					term: 'Pre-Tax SERP Earnings Impact',
					definition: 'The annual expense the Company would accrue for the SERP program'
				},
				{
					term: 'Benefit Tax Deduction',
					definition: 'The tax benefit to the Company of deducting the amount in Column 1'
				},
				{
					term: 'Net SERP Earnings Impact',
					definition:
						'The after-tax expense to the Company for the SERP (Column 1 minus Column 2)'
				},
				{
					term: 'Hypothetical COLI Earnings Impact',
					definition:
						'The projected earnings the Company would reflect from its COLI asset (net increase in cash surrender value plus net death benefits received minus premiums paid)'
				},
				{
					term: 'Combined Earnings Impact',
					definition:
						'Net SERP Earnings Impact less Hypothetical COLI Earnings Impact (Column 3 minus Column 4)'
				}
			]
		},
		{
			title: 'Glossary for Page 6.5',
			pageNo: 'Appendix H.3',
			entries: [
				{
					term: 'Service Cost',
					definition: "Accrual of current year's cost of providing SERP benefit"
				},
				{
					term: 'Prior Service Cost Level Amortization',
					definition:
						'Cost of SERP benefit attributable to service prior to the adoption of the Plan, being amortized on a level basis over average remaining working life'
				},
				{ term: 'Interest Accrual', definition: 'Interest on accrued SERP expense' },
				{
					term: 'Total Pension Cost',
					definition: 'Total SERP expense for the year (Columns 1, 2 & 3)'
				},
				{ term: 'Gross Benefit Payment', definition: 'The SERP benefit paid during the year' },
				{
					term: 'Annual Unfunded Accrued Pension Cost',
					definition:
						'The annual pension cost that is considered for accounting purposes as "unfunded" (Column 4 minus Column 5)'
				},
				{
					term: 'EOY Unfunded Accrued Pension Cost',
					definition: 'The cumulative Unfunded Accrued Pension Cost at year-end (EOY)'
				},
				{
					term: 'BOY Unrecognized Prior Service Cost',
					definition:
						'The cost of the SERP benefit attributable to service prior to the adoption of the Plan, which at the beginning of the year (BOY) had not yet been charged to income'
				},
				{
					term: 'EOY Unrecognized Prior Service Cost',
					definition:
						'The cost of the SERP benefit attributable to service prior to the adoption of the Plan, which at the end of the year (EOY) had not yet been charged to income'
				}
			]
		},
		{
			title: 'Glossary for Appendix B',
			pageNo: 'Appendix H.4',
			entries: [
				{
					term: 'Total Survivor Benefit Payable',
					definition:
						"The total amount payable to a Participant's designated beneficiary if Participant died either in the Current Year, or in the year prior to Normal Retirement Age (NRA minus 1). See Page 3.2."
				},
				{
					term: 'After-tax Total Survivor Benefit Payable',
					definition:
						'The after-tax cost to the Company of paying the Survivor Benefit (the total Survivor Benefit less the tax benefit of deducting that amount)'
				},
				{
					term: 'COLI Face Amount Cost Recovery Option',
					definition:
						'The projected death benefit payable on the death of the named Participant, both in the current year and in the year prior to Normal Retirement Age, assuming the Company adopted Cost Recovery, Option 1'
				},
				{
					term: 'COLI Face Amount Policy Funding Option',
					definition:
						'The projected death benefit payable on the death of the named Participant, both in the current year and in the year prior to Normal Retirement Age, assuming the Company adopted Policy Funding, Option 2'
				},
				{
					term: 'Ratio of COLI Face Amount to After-tax Survivor Benefit',
					definition:
						"Comparison of (1) the amount that would be received upon the death of a participant to (2) the Company's after-tax survivor benefit liability (1 divided by 2)"
				}
			]
		},
		{
			title: 'Glossary for Appendix C',
			pageNo: 'Appendix H.5',
			entries: [
				{
					term: 'Gross Benefits Payable',
					definition: 'Total SERP benefits payable by the Company during the year'
				},
				{
					term: 'Benefit Tax Deduction',
					definition:
						'The tax benefit to the Company of deducting the Gross Benefits Payable amount in Column 1'
				},
				{
					term: 'Net Benefits Paid',
					definition:
						'The after-tax cost to the Company of paying the benefits (Column 1 minus Column 2)'
				},
				{
					term: 'Net Benefits Paid from Company Assets',
					definition: "The Net Benefits Paid from the Company's own cash resources"
				},
				{
					term: 'Net Benefits Paid from COLI Assets',
					definition:
						'Option 1 — none, as COLI values are assumed not used to generate cash to pay benefits. Option 2 — the amounts assumed borrowed or withdrawn from COLI assets to pay Net Benefits'
				},
				{ term: 'COLI Premiums', definition: 'The amount of COLI premiums paid' },
				{
					term: 'COLI Death Proceeds Received',
					definition:
						'The amount received by the Company upon the death of an insured, based upon assumed Life Expectancy'
				},
				{
					term: 'COLI Loans and Withdrawals',
					definition:
						'Option 1 — none, as COLI values are assumed not used to generate cash to pay benefits. Option 2 — the amounts assumed borrowed or withdrawn from COLI assets to pay benefits'
				},
				{
					term: 'COLI Cash Surrender Value',
					definition:
						'The amount that would be received by the Company if all COLI policies were surrendered'
				},
				{
					term: 'COLI Face Amount',
					definition:
						'The total death benefits payable on the COLI policies if all insureds were to die during that year'
				}
			]
		}
	];
}
