/**
 * The IRS's published § 417(e)(3) applicable mortality table for 2024 — Notice 2023-73.
 *
 * A unisex table: under Rev. Rul. 2007-67 the applicable table is a fixed blend of 50 percent of
 * the static male combined rates and 50 percent of the static female combined rates prescribed
 * under § 1.430(h)(3)-1. Ages 0-120, five decimals.
 *
 * A **gold fixture**. `irs-417e.test.ts` checks two separate things against it: that the blending
 * rule is exactly right (blending the IRS's own published male and female rates reproduces all 121
 * of these figures), and that our computed rates carry that rule to within one unit of the last
 * decimal.
 */
// prettier-ignore
export const IRS_417E_2024_PUBLISHED: readonly number[] = [
	/* 0 */ 0.00331, 0.00024, 0.00015, 0.00011, 0.0001, 0.00008, 0.00008, 0.00007, 0.00006, 0.00005,
	/* 10 */ 0.00006, 0.00006, 0.00007, 0.00009, 0.00011, 0.00013, 0.00015, 0.00018, 0.0002, 0.00022,
	/* 20 */ 0.00023, 0.00024, 0.00024, 0.00026, 0.00027, 0.00027, 0.00028, 0.0003, 0.0003, 0.00032,
	/* 30 */ 0.00034, 0.00035, 0.00037, 0.0004, 0.00042, 0.00044, 0.00047, 0.00049, 0.00051, 0.00054,
	/* 40 */ 0.00056, 0.00057, 0.00059, 0.00061, 0.00063, 0.00066, 0.0007, 0.00074, 0.00079, 0.00084,
	/* 50 */ 0.00092, 0.00102, 0.00114, 0.00127, 0.00144, 0.00172, 0.00212, 0.00246, 0.00285, 0.00328,
	/* 60 */ 0.00379, 0.00433, 0.00512, 0.00591, 0.00656, 0.0074, 0.00832, 0.0092, 0.01017, 0.01126,
	/* 70 */ 0.01251, 0.01396, 0.01559, 0.01745, 0.01959, 0.02204, 0.02485, 0.02805, 0.03169, 0.03583,
	/* 80 */ 0.04079, 0.04583, 0.0515, 0.05787, 0.06508, 0.07327, 0.08259, 0.0931, 0.10497, 0.11814,
	/* 90 */ 0.13262, 0.14773, 0.16329, 0.17927, 0.19542, 0.2117, 0.22904, 0.24682, 0.26513, 0.28401,
	/* 100 */ 0.30325, 0.32271, 0.34211, 0.3614, 0.38043, 0.39884, 0.41675, 0.434, 0.45044, 0.46615,
	/* 110 */ 0.47865, 0.48673, 0.49436, 0.49788, 0.49885, 0.49978, 0.4999, 0.49998, 0.5, 0.5,
	/* 120 */ 1,
];
