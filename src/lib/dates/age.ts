/**
 * Centralized date / age utility (AR3, NFR4).
 *
 * All age and duration math in the system goes through here so the actuarial timing
 * convention is applied identically everywhere. The single convention is **age nearest
 * birthday**: a person's age is the age at whichever birthday (the last one or the next
 * one) is closest to the as-of date.
 *
 * Dates are date-only ISO strings `YYYY-MM-DD` (no time, no timezone). All arithmetic uses
 * UTC to avoid timezone/DST drift.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface DateParts {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
}

/** Predicate: is `value` a well-formed, real `YYYY-MM-DD` calendar date? */
export function isValidIsoDate(value: string): boolean {
	const parts = tryParseIsoDate(value);
	return parts !== null;
}

function tryParseIsoDate(value: string): DateParts | null {
	const match = ISO_DATE_RE.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	// Reject impossible months/days and normalize-rollover (e.g. 2021-02-29 -> Mar 1).
	const utc = Date.UTC(year, month - 1, day);
	const d = new Date(utc);
	if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
		return null;
	}
	return { year, month, day };
}

function parseIsoDateOrThrow(value: string, label: string): DateParts {
	const parts = tryParseIsoDate(value);
	if (!parts) {
		throw new Error(
			`${label} must be a valid ISO date (YYYY-MM-DD), got: ${JSON.stringify(value)}`
		);
	}
	return parts;
}

/** Build a UTC millisecond timestamp for a birthday in a given year. */
function birthdayUtc(birth: DateParts, year: number): number {
	// Feb 29 birthdays in a non-leap year fall back to Feb 28 (standard actuarial handling).
	const isFeb29 = birth.month === 2 && birth.day === 29;
	const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	const day = isFeb29 && !leap ? 28 : birth.day;
	return Date.UTC(year, birth.month - 1, day);
}

/**
 * Age nearest birthday: the age at the birthday closest to `asOf`.
 *
 * Computes completed years since birth, then checks whether `asOf` is closer to the next
 * birthday than to the most recent one. If it is (or is exactly halfway), the age rounds up.
 *
 * @param dateOfBirth ISO `YYYY-MM-DD`
 * @param asOf        ISO `YYYY-MM-DD` (the valuation date)
 * @returns integer age nearest birthday
 */
export function ageNearestBirthday(dateOfBirth: string, asOf: string): number {
	const dob = parseIsoDateOrThrow(dateOfBirth, 'dateOfBirth');
	const at = parseIsoDateOrThrow(asOf, 'asOf');

	const asOfUtc = Date.UTC(at.year, at.month - 1, at.day);

	// Most recent birthday on or before asOf, and the next birthday after it.
	const birthdayThisYear = birthdayUtc(dob, at.year);
	let completedYears: number;
	let lastBirthdayUtc: number;
	let nextBirthdayUtc: number;

	if (birthdayThisYear <= asOfUtc) {
		lastBirthdayUtc = birthdayThisYear;
		nextBirthdayUtc = birthdayUtc(dob, at.year + 1);
		completedYears = at.year - dob.year;
	} else {
		lastBirthdayUtc = birthdayUtc(dob, at.year - 1);
		nextBirthdayUtc = birthdayThisYear;
		completedYears = at.year - dob.year - 1;
	}

	const daysSinceLast = asOfUtc - lastBirthdayUtc;
	const daysToNext = nextBirthdayUtc - asOfUtc;

	// Closer to the next birthday (or exactly halfway) -> round up to the next age.
	return daysToNext <= daysSinceLast ? completedYears + 1 : completedYears;
}

/**
 * Whole-year difference (completed years) between two ISO dates, `to - from`.
 * Used for tenure/duration where calendar completed years (not nearest-birthday rounding)
 * is the right measure.
 */
export function completedYearsBetween(from: string, to: string): number {
	const a = parseIsoDateOrThrow(from, 'from');
	const b = parseIsoDateOrThrow(to, 'to');
	let years = b.year - a.year;
	const beforeAnniversary = b.month < a.month || (b.month === a.month && b.day < a.day);
	if (beforeAnniversary) years -= 1;
	return years;
}
