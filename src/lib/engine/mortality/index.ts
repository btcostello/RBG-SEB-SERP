/**
 * Mortality — table data, single-life survival math, and group aggregation.
 *
 * Layered so each piece is usable on its own:
 *
 *   pri-2012-white-collar.ts  the rates
 *   table.ts                  lookup + which table applies at a given age
 *   life-table.ts             one life: l(x), deaths, tPx, life expectancy
 *   cohort.ts                 many lives: expected deaths / survivors per year
 *   scale-mp-2021-adjusted-2024.ts   the IRS mortality improvement scale
 *   irs-base-2012.ts          the IRS base rates (§ 1.430(h)(3)-1(d), 2012 base)
 *   improvement.ts            projecting a base rate forward to a valuation year
 *   irs-static.ts             the IRS static-table construction for a valuation year
 *
 * Everything is pure, deterministic and discrete on integer ages — see the module headers for the
 * recursion and the one place a within-year assumption appears
 * (`completeLifeExpectancy`).
 *
 * The IRS basis — base tables, improvement scale and static construction — is loaded and verified
 * against the regulation's own published figures, but **nothing in the engine reads it yet**: the
 * lookup above is still unprojected Pri-2012 white collar. Re-pointing it is the next step.
 * See DATA-GAPS.md item 2.
 */
export {
	DEFAULT_RETIREMENT_AGE,
	MORTALITY_BASES,
	PRI_2012_WHITE_COLLAR,
	SUPPORTED_RETIREMENT_AGES,
	ageRange,
	assertSupportedRetirementAge,
	basisForAge,
	mortalityRate,
	rateForAge,
	terminalAge,
	type AgeRange,
	type MortalityBasis,
	type MortalitySeries,
	type MortalityTableData
} from './table';

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
