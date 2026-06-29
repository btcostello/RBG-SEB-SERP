import { describe, it, expect, beforeEach } from 'vitest';
import { quoteStore } from './quote.svelte';
import { DEFAULT_MODEL_SETTINGS } from '$lib/domain';

// Note: file is named *.store.test.ts (not *.svelte.test.ts) so it runs in the node "server"
// vitest project. Importing the runes module compiles fine; reading state is non-reactive here.

describe('quoteStore', () => {
	beforeEach(() => {
		quoteStore.close();
	});

	it('starts with no active quote', () => {
		expect(quoteStore.current).toBeNull();
		expect(quoteStore.hasQuote).toBe(false);
	});

	it('creates a quote held in the store with documented defaults (FR1, FR3)', () => {
		quoteStore.create({ companyName: 'Acme', corporateTaxRate: 0.21 });
		expect(quoteStore.hasQuote).toBe(true);
		expect(quoteStore.current?.company).toEqual({ name: 'Acme', corporateTaxRate: 0.21 });
		expect(quoteStore.current?.modelSettings).toEqual(DEFAULT_MODEL_SETTINGS);
		expect(quoteStore.current?.census).toEqual([]);
		expect(quoteStore.current?.results).toBeNull();
	});

	it('updates company immutably (AR12)', () => {
		quoteStore.create({ companyName: 'Acme', corporateTaxRate: 0.21 });
		const before = quoteStore.current;
		quoteStore.updateCompany({ corporateTaxRate: 0.3 });
		expect(quoteStore.current?.company.corporateTaxRate).toBe(0.3);
		expect(quoteStore.current?.company.name).toBe('Acme');
		// reassigned, not mutated
		expect(quoteStore.current).not.toBe(before);
	});

	it('overriding a model setting does not affect the shared defaults (FR3)', () => {
		quoteStore.create({ companyName: 'Acme', corporateTaxRate: 0.21 });
		quoteStore.updateModelSettings({ salaryGrowthRate: 0.05 });
		expect(quoteStore.current?.modelSettings.salaryGrowthRate).toBe(0.05);
		// other settings untouched; the documented default constant is unchanged
		expect(quoteStore.current?.modelSettings.npvDiscountRate).toBe(0);
		expect(DEFAULT_MODEL_SETTINGS.salaryGrowthRate).toBe(0.03);
	});

	it('keeps overrides isolated between two quotes (FR3)', () => {
		quoteStore.create({ companyName: 'First', corporateTaxRate: 0.21 });
		quoteStore.updateModelSettings({ retirementAge: 70 });
		const firstRetirement = quoteStore.current?.modelSettings.retirementAge;

		quoteStore.create({ companyName: 'Second', corporateTaxRate: 0.25 });
		expect(firstRetirement).toBe(70);
		// the fresh quote gets the documented default, not the previous override
		expect(quoteStore.current?.modelSettings.retirementAge).toBe(
			DEFAULT_MODEL_SETTINGS.retirementAge
		);
	});

	it('ignores updates when no quote is active', () => {
		expect(() => quoteStore.updateCompany({ name: 'X' })).not.toThrow();
		expect(quoteStore.current).toBeNull();
	});
});

describe('quoteStore census mutations (Story 1.4)', () => {
	const draft = {
		firstName: 'Jane',
		lastName: 'Doe',
		gender: 'F' as const,
		dateOfBirth: '1970-06-15',
		dateOfHire: '2005-01-01',
		currentSalary: '250000.00',
		benefitPercentage: 0.6,
		riskClass: 'Standard Non Tobacco' as const,
		planMembership: 'BOTH' as const
	};

	beforeEach(() => {
		quoteStore.close();
		quoteStore.create({ companyName: 'Acme', corporateTaxRate: 0.21 });
	});

	it('adds an insured and assigns a stable id (FR5)', () => {
		const added = quoteStore.addInsured(draft);
		expect(added.id).toBeTruthy();
		expect(quoteStore.current?.census).toHaveLength(1);
		expect(quoteStore.current?.census[0]).toEqual({ ...draft, id: added.id });
	});

	it('updates an insured immutably without touching others (FR5, AR12)', () => {
		const a = quoteStore.addInsured(draft);
		const b = quoteStore.addInsured({ ...draft, firstName: 'John', lastName: 'Smith' });
		const before = quoteStore.current?.census;

		quoteStore.updateInsured(a.id, { currentSalary: '300000.00' });

		expect(quoteStore.current?.census).not.toBe(before);
		expect(quoteStore.current?.census.find((i) => i.id === a.id)?.currentSalary).toBe('300000.00');
		// the other insured is unchanged
		expect(quoteStore.current?.census.find((i) => i.id === b.id)?.firstName).toBe('John');
	});

	it('removes an insured immediately (FR5)', () => {
		const a = quoteStore.addInsured(draft);
		const b = quoteStore.addInsured({ ...draft, firstName: 'John' });
		quoteStore.removeInsured(a.id);
		expect(quoteStore.current?.census).toHaveLength(1);
		expect(quoteStore.current?.census[0].id).toBe(b.id);
	});
});
