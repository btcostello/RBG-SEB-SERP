/**
 * Risk class (a.k.a. `health`) — the engine's accepted underwriting classes.
 *
 * Seeded here from the `lifeproj` contract (the six exact `health` strings). In Epic 3 the
 * set is reconciled against the live `/schema` endpoint; until then these seeded values are
 * authoritative (AR10/M-1). The strings must match the engine EXACTLY — they cross the wire.
 */
import * as v from 'valibot';

export const RISK_CLASSES = [
	'Preferred Best Non Tobacco',
	'Preferred Non Tobacco',
	'Standard Plus Non Tobacco',
	'Standard Non Tobacco',
	'Preferred Tobacco',
	'Standard Tobacco'
] as const;

export const RiskClassSchema = v.picklist(RISK_CLASSES, 'Select a valid risk class');
export type RiskClass = v.InferOutput<typeof RiskClassSchema>;
