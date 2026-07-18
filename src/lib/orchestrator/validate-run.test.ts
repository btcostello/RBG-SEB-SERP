import { describe, it, expect } from 'vitest';
import { validateRun } from './validate-run';
import { createQuote, RISK_CLASSES, type Insured, type Quote } from '$lib/domain';
import { makeInsured } from '$lib/testing/fixtures';

const ENGINE_RISK_CLASSES = [...RISK_CLASSES];
const asOf = '2027-06-15';

function insured(overrides: Partial<Insured> = {}): Insured {
	return makeInsured({
		dateOfBirth: '1975-06-15',
		currentSalary: '200000',
		planMembership: 'BOTH',
		...overrides
	});
}

function quoteWith(census: Insured[]): Quote {
	const quote = createQuote({ id: 'q', companyName: 'Acme', corporateTaxRate: 0.21 });
	quote.census = census;
	return quote;
}

describe('validateRun (FR24)', () => {
	it('returns no issues for a contract-valid quote', () => {
		const issues = validateRun({
			quote: quoteWith([insured()]),
			asOf,
			riskClasses: ENGINE_RISK_CLASSES
		});
		expect(issues).toEqual([]);
	});

	it('flags a risk class the engine does not accept (with the insured label)', () => {
		const quote = quoteWith([insured()]);
		// Force an off-contract value past the seeded schema.
		(quote.census[0] as { riskClass: string }).riskClass = 'Super Preferred';
		const issues = validateRun({ quote, asOf, riskClasses: ENGINE_RISK_CLASSES });
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ field: 'riskClass', label: 'Jane Doe' });
	});

	it('reconciles against the discovered set, not just the seeded one', () => {
		// Discovered set omits "Standard Tobacco"; an insured using it is now invalid.
		const quote = quoteWith([insured({ riskClass: 'Standard Tobacco' })]);
		const issues = validateRun({
			quote,
			asOf,
			riskClasses: ['Preferred Best Non Tobacco', 'Standard Non Tobacco']
		});
		expect(issues.some((i) => i.field === 'riskClass')).toBe(true);
	});

	it('requires at least one COLI participant', () => {
		const issues = validateRun({
			quote: quoteWith([insured({ planMembership: 'SERP' })]),
			asOf,
			riskClasses: ENGINE_RISK_CLASSES
		});
		expect(issues.some((i) => i.field === 'census')).toBe(true);
	});

	it('flags an issue age outside the engine range', () => {
		// DOB far in the future of asOf -> negative age.
		const issues = validateRun({
			quote: quoteWith([insured({ dateOfBirth: '2030-01-01' })]),
			asOf,
			riskClasses: ENGINE_RISK_CLASSES
		});
		expect(issues.some((i) => i.field === 'dateOfBirth')).toBe(true);
	});

	it('flags a participant whose life expectancy is below the retirement age', () => {
		const quote = quoteWith([insured({ retirementAge: 90, lifeExpectancy: 84 })]);
		const issues = validateRun({ quote, asOf, riskClasses: ENGINE_RISK_CLASSES });
		expect(issues.some((i) => i.field === 'lifeExpectancy')).toBe(true);
	});
});
