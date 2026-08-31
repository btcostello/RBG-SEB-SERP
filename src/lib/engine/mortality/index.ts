/**
 * Mortality — table data, single-life survival math, and group aggregation.
 *
 * Layered so each piece is usable on its own:
 *
 *   pri-2012-white-collar.ts  the rates
 *   table.ts                  lookup + which table applies at a given age
 *   life-table.ts             one life: l(x), deaths, tPx, life expectancy
 *   cohort.ts                 many lives: expected deaths / survivors per year
 *
 * Everything is pure, deterministic and discrete on integer ages — see the module headers for the
 * recursion and the one place a within-year assumption appears
 * (`completeLifeExpectancy`).
 *
 * Still outstanding (DATA-GAPS.md item 2): these are unprojected 2012 base rates. Pri-2012 is
 * normally projected with an MP improvement scale, which is a separate SOA dataset and is not
 * loaded. Nothing here projects rates forward to a valuation year.
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
