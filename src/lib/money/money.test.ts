import { describe, it, expect } from 'vitest';
import {
	money,
	parseMoney,
	serializeMoney,
	formatMoney,
	formatMoneyDisplay,
	roundToCents,
	toCents,
	isMoneyString,
	ZERO
} from './money';

describe('money round-trip (AR18)', () => {
	// The persistence contract: Big -> string -> Big must reproduce the exact value, so a
	// reopened quote is identical to what was saved. Trailing zeros and high-precision
	// fractions must survive losslessly.
	const cases = [
		'0',
		'0.00',
		'162240.00',
		'100000',
		'0.1',
		'0.2',
		'0.3',
		'999999999.999',
		'-50.25'
	];

	it.each(cases)('serialize -> parse is exactly equal for %s', (input) => {
		const original = money(input);
		const roundTripped = parseMoney(serializeMoney(original));
		expect(roundTripped.eq(original)).toBe(true);
	});

	it('does not lose precision through addition (no float drift)', () => {
		// 0.1 + 0.2 === 0.3 exactly with big.js (would be 0.30000000000000004 as JS floats)
		const sum = money('0.1').plus(money('0.2'));
		expect(sum.eq(money('0.3'))).toBe(true);
		expect(serializeMoney(sum)).toBe('0.3');
	});
});

describe('half-up rounding policy', () => {
	it('rounds a half-cent up (away from zero)', () => {
		expect(formatMoney(money('2.005'))).toBe('2.01');
		expect(formatMoney(money('2.015'))).toBe('2.02');
	});

	it('rounds negative halves away from zero', () => {
		expect(formatMoney(money('-2.005'))).toBe('-2.01');
	});

	it('roundToCents returns a Big rounded to two places', () => {
		expect(roundToCents(money('1.235')).toString()).toBe('1.24');
	});
});

describe('formatMoney', () => {
	it('formats to fixed cents by default', () => {
		expect(formatMoney(money('162240'))).toBe('162240.00');
		expect(formatMoney(ZERO)).toBe('0.00');
	});

	it('honors an explicit decimal-places argument', () => {
		expect(formatMoney(money('3.14159'), 4)).toBe('3.1416');
	});
});

describe('formatMoneyDisplay', () => {
	it('adds thousands separators while keeping exact cents', () => {
		expect(formatMoneyDisplay(money('162240'))).toBe('162,240.00');
		expect(formatMoneyDisplay(money('1234567.5'))).toBe('1,234,567.50');
		expect(formatMoneyDisplay(money('999'))).toBe('999.00');
		expect(formatMoneyDisplay(ZERO)).toBe('0.00');
	});

	it('accepts a canonical money string (the shape carried on Results)', () => {
		expect(formatMoneyDisplay('162240.00')).toBe('162,240.00');
	});

	it('handles negatives', () => {
		expect(formatMoneyDisplay(money('-1234567.89'))).toBe('-1,234,567.89');
	});
});

describe('toCents', () => {
	it('converts dollars to integer cents (half-up)', () => {
		expect(toCents(money('162240.00'))).toBe(16224000);
		expect(toCents(money('1.005'))).toBe(101);
	});
});

describe('isMoneyString', () => {
	it('accepts valid decimal strings', () => {
		expect(isMoneyString('100000.00')).toBe(true);
		expect(isMoneyString('0')).toBe(true);
		expect(isMoneyString('-5.5')).toBe(true);
	});

	it('rejects non-numeric strings', () => {
		expect(isMoneyString('')).toBe(false);
		expect(isMoneyString('abc')).toBe(false);
		expect(isMoneyString('1,000')).toBe(false);
		expect(isMoneyString('$100')).toBe(false);
	});
});
