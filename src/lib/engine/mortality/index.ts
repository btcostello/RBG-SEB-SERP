/**
 * Mortality — table data, single-life survival math, and group aggregation.
 *
 * Layered so each piece is usable on its own:
 *
 *   irs-base-2012.ts          the IRS base rates (§ 1.430(h)(3)-1(d), 2012 base)
 *   irs-static.ts             the IRS static-table construction for a valuation year
 *   table.ts                  lookup + which table applies at a given age
 *   pri-2012-white-collar.ts  the former basis, retained for comparison only
 *   life-table.ts             one life: l(x), deaths, tPx, life expectancy
 *   cohort.ts                 many lives: expected deaths / survivors per year
 *   scale-mp-2021-adjusted-2024.ts   the IRS mortality improvement scale
 *   improvement.ts            projecting a base rate forward to a valuation year
 *
 * Everything is pure, deterministic and discrete on integer ages — see the module headers for the
 * recursion and the one place a within-year assumption appears
 * (`completeLifeExpectancy`).
 *
 * The basis is the **IRS static mortality tables**: the § 1.430(h)(3)-1(d) base tables projected
 * with the 2024 Adjusted Scale MP-2021 under § 1.430(h)(3)-1(c)(3). Because a static table is
 * rebuilt each calendar year, **every rate lookup takes a valuation year** — from the plan
 * effective date (operator decision, 2026-09-20). See DATA-GAPS.md item 2.
 */
export {
	DEFAULT_RETIREMENT_AGE,
	MORTALITY_BASES,
	SUPPORTED_RETIREMENT_AGES,
	TABLE_AGE_RANGE,
	ageRange,
	assertSupportedRetirementAge,
	basisForAge,
	mortalityRate,
	rateForAge,
	staticSeries,
	terminalAge,
	type AgeRange,
	type MortalityBasis
} from './table';

/**
 * The Pri-2012 white collar rates, kept for comparison only. They are **not** the engine's basis
 * — see the header above — and nothing in the engine reads them.
 */
export {
	PRI_2012_WHITE_COLLAR,
	type MortalitySeries,
	type MortalityTableData
} from './pri-2012-white-collar';

export {
	completeLifeExpectancy,
	curtateLifeExpectancy,
	lifeTable,
	survivalProbability,
	type LifeTableOptions,
	type LifeTableRow
} from './life-table';

export {
	actuarialDeaths,
	expectedSurvivors,
	lifeExpectancyDeaths,
	type CohortMember,
	type DeathSeries
} from './cohort';

export {
	IMPROVEMENT_END_AGE,
	IMPROVEMENT_END_YEAR,
	IMPROVEMENT_START_AGE,
	IMPROVEMENT_START_YEAR,
	SCALE_MP_2021_ADJUSTED_2024,
	cumulativeImprovementFactor,
	improvementRate,
	projectRate,
	type ImprovementScaleData,
	type ImprovementSeries,
	type ProjectionYears
} from './improvement';

export {
	IRS_BASES,
	IRS_BASE_END_AGE,
	IRS_BASE_START_AGE,
	IRS_BASE_TABLES_2012,
	IRS_BASE_YEAR,
	irsBaseRate,
	irsCombinedStaticRate,
	irsStaticRate,
	projectionPeriod,
	type IrsBaseSeries,
	type IrsBaseTableData,
	type IrsBasis
} from './irs-static';
