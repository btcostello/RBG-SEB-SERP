/**
 * Pre-run validation against the engine contract (FR24, AR4).
 *
 * Checks the census and model settings against the lifeproj contract BEFORE any call, so
 * avoidable errors are caught up front with specific, field-level messages. Risk classes are
 * validated against the discovered engine set (passed in from the schema store), so this stays
 * in lockstep with the engine rather than the seeded enum.
 *
 * Pure and store-free, so it is unit-testable; the run-state store calls it and refuses to
 * start the run when any issue is returned.
 */
import { ageNearestBirthday, isValidIsoDate } from '$lib/dates/age';
import { isColiParticipant, type Quote } from '$lib/domain';
import { isMoneyString } from '$lib/money/money';

export interface RunValidationIssue {
	/** The insured this issue belongs to, if any (for highlighting). */
	insuredId?: string;
	/** Human label for the row the issue concerns (e.g. "Jane Doe" or "Model settings"). */
	label: string;
	/** The offending field. */
	field: string;
	message: string;
}

export interface ValidateRunParams {
	quote: Quote;
	/** Valuation date, ISO YYYY-MM-DD (issue age is taken nearest-birthday as of this date). */
	asOf: string;
	/** The engine's accepted risk classes (discovered schema, or seeded fallback). */
	riskClasses: string[];
}

// The engine accepts issue ages 0–120 (per the lifeproj contract).
const ENGINE_MIN_AGE = 0;
const ENGINE_MAX_AGE = 120;

/** Returns the list of contract violations; an empty list means the quote is ready to run. */
export function validateRun(params: ValidateRunParams): RunValidationIssue[] {
	const { quote, asOf, riskClasses } = params;
	const issues: RunValidationIssue[] = [];
	const allowedRiskClasses = new Set(riskClasses);

	for (const insured of quote.census) {
		const label = `${insured.firstName} ${insured.lastName}`.trim() || insured.id;
		const report = (field: string, message: string) =>
			issues.push({ insuredId: insured.id, label, field, message });

		if (!isValidIsoDate(insured.dateOfBirth)) {
			report('dateOfBirth', 'Date of birth is not a valid date');
		} else {
			const issueAge = ageNearestBirthday(insured.dateOfBirth, asOf);
			if (issueAge < ENGINE_MIN_AGE || issueAge > ENGINE_MAX_AGE) {
				report(
					'dateOfBirth',
					`Issue age ${issueAge} is outside the engine's accepted range (${ENGINE_MIN_AGE}–${ENGINE_MAX_AGE})`
				);
			}
		}
		if (insured.gender !== 'M' && insured.gender !== 'F') {
			report('gender', 'Gender must be M or F');
		}
		if (!allowedRiskClasses.has(insured.riskClass)) {
			report('riskClass', `Risk class "${insured.riskClass}" is not accepted by the engine`);
		}
		if (!isMoneyString(insured.currentSalary)) {
			report('currentSalary', 'Salary is not a valid amount');
		}
	}

	// Run readiness: there must be a COLI participant to design a policy for.
	if (quote.census.filter(isColiParticipant).length === 0) {
		issues.push({
			label: 'Census',
			field: 'census',
			message: 'Add at least one COLI participant before running'
		});
	}

	// Settings sanity against the contract.
	const settings = quote.modelSettings;
	if (settings.retirementAge > settings.assumedDeathBenefitAge) {
		issues.push({
			label: 'Model settings',
			field: 'assumedDeathBenefitAge',
			message: 'Assumed death age must be at least the retirement age'
		});
	}

	return issues;
}
