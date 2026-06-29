/**
 * Company — the prospect company a quote is built for (FR1).
 */
import * as v from 'valibot';
import { RateSchema } from './value-objects';

export const CompanySchema = v.object({
	/** Prospect company name; personalizes the proposal report. */
	name: v.pipe(v.string(), v.nonEmpty('Company name is required')),
	/** Corporate tax rate as a ratio in [0, 1] (e.g. 0.21 for 21%). Drives the tax-adjusted DB. */
	corporateTaxRate: RateSchema
});

export type Company = v.InferOutput<typeof CompanySchema>;
