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
