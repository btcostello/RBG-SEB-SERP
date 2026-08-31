/**
 * Pri-2012 Private Retirement Plans Mortality Tables — **White Collar**, amount-weighted.
 *
 * Source: Society of Actuaries, `pri-2012-mortality-tables-amount.xlsx`, "White Collar" sheet.
 * Transcribed mechanically from that workbook; the published table is stated to five decimals and
 * the workbook's stored doubles round to five decimals with zero error, so these are exact.
 *
 * ## What the three bases are
 *
 * - `employee` — active/terminated-vested members. Ages **18–80**.
 * - `retiree` — healthy annuitants (the workbook's "Retiree" column). Ages **50–120**.
 * - `contingentSurvivor` — surviving beneficiaries after the primary member's death, developed
 *   solely from beneficiary experience. Ages **50–120**. Per the workbook's own note, the male
 *   contingent-survivor rates are identical to the Total Dataset table.
 *
 * Each series is a contiguous run from `startAge`, and both annuitant bases terminate at
 * q(120) = 1.0. The employee series stops at 80 — it does **not** run to the terminal age, so a
 * caller projecting past 80 must switch bases rather than reading off the end.
 *
 * ## Two things this table is not
 *
 * 1. **No improvement scale.** These are *base* rates for 2012. Pri-2012 is normally projected
 *    with an MP improvement scale; that scale is a separate dataset and is not in this workbook.
 *    Nothing here is projected to a valuation year.
 * 2. **Amount-weighted, not headcount.** Appropriate for weighting by benefit amount; the
 *    headcount-weighted variant is a different workbook.
 *
 * Note also that the source proposal PDFs use **RP-2000 white collar with scale AA**, a different
 * table — see DATA-GAPS.md. This module is the operator's chosen replacement, not a reproduction
 * of the sample report's basis.
 */
import type { Gender } from '$lib/domain/insured';

/** The three population bases the white-collar table publishes. */
export const MORTALITY_BASES = ['employee', 'retiree', 'contingentSurvivor'] as const;
export type MortalityBasis = (typeof MORTALITY_BASES)[number];

/** One contiguous, age-indexed run of annual mortality rates q(x). */
export interface MortalitySeries {
	/** Age of `q[0]`. The run is contiguous — `q[i]` is the rate at `startAge + i`. */
	readonly startAge: number;
	/** Annual probability of death at each age, from `startAge` upward. */
	readonly q: readonly number[];
}

export type MortalityTableData = Readonly<
	Record<Gender, Readonly<Record<MortalityBasis, MortalitySeries>>>
>;

/**
 * Pri-2012 white collar, amount-weighted. Keyed by the actuarial-boundary `Gender` ("M"/"F") so
 * it lines up with per-participant census data; the census "Unisex" basis has no column here and
 * would need an explicit blend.
 */
// Laid out ten rates per line, each row labelled with its starting age. Left unformatted on
// purpose: reflowing to one value per line pushes the age labels onto the wrong element.
// prettier-ignore
export const PRI_2012_WHITE_COLLAR: MortalityTableData = {
	M: {
		employee: {
			startAge: 18,
			q: [
				/*  18 */ 0.00036, 0.00041, 0.00043, 0.00044, 0.00043, 0.00043, 0.00043, 0.00042, 0.00042, 0.00042,
				/*  28 */ 0.00042, 0.00042, 0.00042, 0.00043, 0.00044, 0.00045, 0.00046, 0.00047, 0.00049, 0.00051,
				/*  38 */ 0.00053, 0.00055, 0.00057,  0.0006, 0.00063, 0.00067, 0.00071, 0.00076, 0.00081, 0.00088,
				/*  48 */ 0.00095, 0.00104, 0.00114, 0.00125, 0.00137, 0.00151, 0.00166, 0.00182, 0.00199, 0.00219,
				/*  58 */  0.0024, 0.00262, 0.00287, 0.00313, 0.00342, 0.00374, 0.00408, 0.00445, 0.00497, 0.00556,
				/*  68 */ 0.00621, 0.00695, 0.00777, 0.00868, 0.00971, 0.01085, 0.01213, 0.01356, 0.01516, 0.01694,
				/*  78 */ 0.01894, 0.02118, 0.02367
			]
		},
		retiree: {
			startAge: 50,
			q: [
				/*  50 */ 0.00366, 0.00385, 0.00406, 0.00429, 0.00453,  0.0048, 0.00511, 0.00543, 0.00575, 0.00606,
				/*  60 */ 0.00634, 0.00659, 0.00686, 0.00717, 0.00758, 0.00812, 0.00867, 0.00931,  0.0101, 0.01114,
				/*  70 */ 0.01246, 0.01409, 0.01601, 0.01822, 0.02072, 0.02346, 0.02641, 0.02963, 0.03326, 0.03747,
				/*  80 */ 0.04237, 0.04801, 0.05443, 0.06168, 0.06996, 0.07952, 0.09061, 0.10321, 0.11712, 0.13193,
				/*  90 */  0.1474,  0.1638, 0.18125, 0.19971, 0.21904, 0.23903, 0.25941, 0.27993, 0.30031, 0.32036,
				/* 100 */ 0.33996,  0.3591, 0.37794, 0.39633, 0.41415, 0.43131, 0.44771, 0.46329,   0.478, 0.49181,
				/* 110 */     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,
				/* 120 */     1.0
			]
		},
		contingentSurvivor: {
			startAge: 50,
			q: [
				/*  50 */ 0.01494, 0.01517, 0.01549, 0.01589, 0.01635, 0.01688, 0.01748, 0.01814, 0.01886, 0.01965,
				/*  60 */  0.0205, 0.02141,  0.0224, 0.02347, 0.02464, 0.02591, 0.02729, 0.02879, 0.03044, 0.03223,
				/*  70 */ 0.03419, 0.03633, 0.03867, 0.04123, 0.04404, 0.04712,  0.0505, 0.05423, 0.05833, 0.06284,
				/*  80 */ 0.06783, 0.07334, 0.07943, 0.08618, 0.09367, 0.10199, 0.11123, 0.12153, 0.13305, 0.14758,
				/*  90 */ 0.16324, 0.17958, 0.19631,  0.2133, 0.23049,  0.2479, 0.26559, 0.28363, 0.30206, 0.32087,
				/* 100 */ 0.33996,  0.3591, 0.37794, 0.39633, 0.41415, 0.43131, 0.44771, 0.46329,   0.478, 0.49181,
				/* 110 */     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,
				/* 120 */     1.0
			]
		}
	},
	F: {
		employee: {
			startAge: 18,
			q: [
				/*  18 */ 0.00014, 0.00014, 0.00014, 0.00014, 0.00015, 0.00017, 0.00018, 0.00018, 0.00018, 0.00018,
				/*  28 */ 0.00018, 0.00019, 0.00019,  0.0002, 0.00021, 0.00023, 0.00024, 0.00026, 0.00028, 0.00031,
				/*  38 */ 0.00033, 0.00036, 0.00039, 0.00043, 0.00046,  0.0005, 0.00055, 0.00059, 0.00065,  0.0007,
				/*  48 */ 0.00076, 0.00083,  0.0009, 0.00098, 0.00106, 0.00115, 0.00125, 0.00136, 0.00147,  0.0016,
				/*  58 */ 0.00174, 0.00189, 0.00205, 0.00223, 0.00242, 0.00263, 0.00285,  0.0031, 0.00348, 0.00392,
				/*  68 */ 0.00441, 0.00496, 0.00558, 0.00628, 0.00706, 0.00795, 0.00894, 0.01006, 0.01131, 0.01273,
				/*  78 */ 0.01432, 0.01611, 0.01812
			]
		},
		retiree: {
			startAge: 50,
			q: [
				/*  50 */ 0.00224, 0.00241,  0.0026,  0.0028, 0.00302, 0.00325, 0.00351, 0.00378, 0.00408,  0.0044,
				/*  60 */ 0.00474, 0.00518, 0.00567, 0.00619, 0.00677,  0.0074, 0.00809, 0.00885,  0.0097, 0.01064,
				/*  70 */  0.0117,  0.0129, 0.01425,  0.0158, 0.01756, 0.01958, 0.02189, 0.02452, 0.02754, 0.03099,
				/*  80 */ 0.03492, 0.03941, 0.04451, 0.05029, 0.05682, 0.06419,  0.0725, 0.08185,  0.0924, 0.10428,
				/*  90 */ 0.11771, 0.13223, 0.14748, 0.16264, 0.17864, 0.19539, 0.21279, 0.23075, 0.24917, 0.26794,
				/* 100 */ 0.28698, 0.30619, 0.32549, 0.34472, 0.36375, 0.38243, 0.40065, 0.41828, 0.43522, 0.45139,
				/* 110 */ 0.46673,  0.4812, 0.49477,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,
				/* 120 */     1.0
			]
		},
		contingentSurvivor: {
			startAge: 50,
			q: [
				/*  50 */ 0.00494, 0.00519, 0.00547, 0.00577, 0.00608, 0.00642, 0.00679, 0.00718,  0.0076, 0.00805,
				/*  60 */ 0.00853, 0.00893, 0.00937, 0.00984, 0.01036, 0.01094, 0.01158,  0.0123, 0.01311, 0.01402,
				/*  70 */ 0.01505, 0.01622, 0.01756,  0.0191, 0.02087, 0.02293, 0.02531, 0.02806, 0.03119, 0.03469,
				/*  80 */ 0.03853, 0.04276, 0.04748, 0.05285, 0.05907, 0.06627, 0.07451, 0.08381, 0.09417, 0.10564,
				/*  90 */ 0.11827, 0.13223, 0.14748, 0.16264, 0.17864, 0.19539, 0.21279, 0.23075, 0.24917, 0.26794,
				/* 100 */ 0.28698, 0.30619, 0.32549, 0.34472, 0.36375, 0.38243, 0.40065, 0.41828, 0.43522, 0.45139,
				/* 110 */ 0.46673,  0.4812, 0.49477,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,     0.5,
				/* 120 */     1.0
			]
		}
	}
};
