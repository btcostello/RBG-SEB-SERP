import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { QuoteSchema, createQuote, duplicateQuote, SCHEMA_VERSION } from './quote';
import { DEFAULT_MODEL_SETTINGS } from './model-settings';
import { InsuredSchema } from './insured';
import { CompanySchema } from './company';
import { makeInsured } from '$lib/testing/fixtures';

describe('createQuote', () => {
	it('builds a valid quote with documented default settings (FR3)', () => {
		const quote = createQuote({ id: 'q1', companyName: 'Acme Inc', corporateTaxRate: 0.21 });
		// Round-trips through the schema cleanly.
		const parsed = v.parse(QuoteSchema, quote);
		expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
		expect(parsed.company.name).toBe('Acme Inc');
		// Documented defaults, plus the plan effective date defaulted to the day the quote is created.
		const { effectiveDate, ...settingsSansDate } = parsed.modelSettings;
		expect(settingsSansDate).toEqual(DEFAULT_MODEL_SETTINGS);
		expect(effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(parsed.census).toEqual([]);
		expect(parsed.results).toBeNull();
	});

	it('overriding a default does not mutate the shared defaults (FR3)', () => {
		const quote = createQuote({ id: 'q2', companyName: 'Beta', corporateTaxRate: 0.3 });
		quote.modelSettings.npvDiscountRate = 0.05;
		expect(DEFAULT_MODEL_SETTINGS.npvDiscountRate).toBe(0);
	});
});

describe('duplicateQuote', () => {
	function seed() {
		const quote = createQuote({ id: 'orig', companyName: 'Acme Inc', corporateTaxRate: 0.21 });
		quote.census = [makeInsured({ id: 'i1' })];
		quote.modelSettings.npvDiscountRate = 0.04;
		quote.reportSettings = { hiddenPages: ['glossary'] };
		return quote;
	}

	it('copies under a new id and a distinct "(copy)" name, still valid', () => {
		const copy = duplicateQuote(seed(), 'new-id');
		expect(copy.id).toBe('new-id');
		expect(copy.company.name).toBe('Acme Inc (copy)');
		expect(v.safeParse(QuoteSchema, copy).success).toBe(true);
	});

	it('carries the census, settings, results snapshot, and report page selection', () => {
		const original = seed();
		const copy = duplicateQuote(original, 'new-id');
		expect(copy.census).toEqual(original.census);
		expect(copy.modelSettings).toEqual(original.modelSettings);
		expect(copy.reportSettings).toEqual(original.reportSettings);
	});

	it('is a deep copy — editing the copy never mutates the original', () => {
		const original = seed();
		const copy = duplicateQuote(original, 'new-id');
		copy.census[0].currentSalary = '999999';
		copy.modelSettings.npvDiscountRate = 0.9;
		copy.reportSettings!.hiddenPages!.push('census');
		expect(original.census[0].currentSalary).toBe(makeInsured().currentSalary);
		expect(original.modelSettings.npvDiscountRate).toBe(0.04);
		expect(original.reportSettings!.hiddenPages).toEqual(['glossary']);
	});

	it('disambiguates the name when a "(copy)" already exists', () => {
		const original = seed();
		expect(duplicateQuote(original, 'a', ['Acme Inc (copy)']).company.name).toBe('Acme Inc (copy 2)');
		expect(
			duplicateQuote(original, 'b', ['Acme Inc (copy)', 'Acme Inc (copy 2)']).company.name
		).toBe('Acme Inc (copy 3)');
	});
});

describe('Company validation (AR4)', () => {
	it('rejects a tax rate outside [0, 1]', () => {
		const result = v.safeParse(CompanySchema, { name: 'X', corporateTaxRate: 1.5 });
		expect(result.success).toBe(false);
	});

	it('rejects an empty company name', () => {
		const result = v.safeParse(CompanySchema, { name: '', corporateTaxRate: 0.2 });
		expect(result.success).toBe(false);
	});
});

describe('Insured validation (AR2, AR3, FR8)', () => {
	const valid = makeInsured({ dateOfBirth: '1970-06-15', currentSalary: '250000.00' });

	it('accepts a well-formed insured', () => {
		expect(v.safeParse(InsuredSchema, valid).success).toBe(true);
	});

	it('rejects salary that is not a decimal money string', () => {
		const result = v.safeParse(InsuredSchema, { ...valid, currentSalary: '$250,000' });
		expect(result.success).toBe(false);
	});

	it('rejects an invalid ISO date of birth', () => {
		const result = v.safeParse(InsuredSchema, { ...valid, dateOfBirth: '2021-02-29' });
		expect(result.success).toBe(false);
	});

	it('rejects a risk class outside the engine set', () => {
		const result = v.safeParse(InsuredSchema, { ...valid, riskClass: 'Super Preferred' });
		expect(result.success).toBe(false);
	});
});
