/**
 * Discovered engine schema store (FR22, AR10/M-1).
 *
 * On app start the client fetches `/api/schema` (same-origin BFF) once and caches the
 * reconciled enums/defaults for the session. The risk-class options feed the census UI so it
 * stays in lockstep with the engine instead of drifting from hardcoded values.
 *
 * If `/schema` is unreachable, the store falls back to the six seeded risk classes + documented
 * defaults and exposes a non-blocking notice — the app stays fully usable (AR10/M-1).
 *
 * The exact `/schema` JSON shape is not contractually fixed (the doc says "trust /schema"), so
 * `extractRiskClasses` searches the payload tolerantly for the health/risk-class enum rather
 * than assuming a fixed path.
 */
import { fetchSchema } from '$lib/api/schema-client';
import { RISK_CLASSES } from '$lib/domain';

const KNOWN_RISK_CLASSES = new Set<string>(RISK_CLASSES);

/** Heuristic: a string array that is (or overlaps) the engine's risk-class enum. */
function looksLikeRiskClasses(value: unknown[]): boolean {
	return (
		value.length > 0 &&
		value.every((item) => typeof item === 'string') &&
		value.some((item) => KNOWN_RISK_CLASSES.has(item as string) || /tobacco/i.test(item as string))
	);
}

/** Recursively find the risk-class enum anywhere in the schema payload. */
export function extractRiskClasses(raw: unknown): string[] | null {
	let found: string[] | null = null;
	const visit = (node: unknown): void => {
		if (found) return;
		if (Array.isArray(node)) {
			if (looksLikeRiskClasses(node)) {
				found = node as string[];
				return;
			}
			node.forEach(visit);
		} else if (node && typeof node === 'object') {
			for (const value of Object.values(node as Record<string, unknown>)) visit(value);
		}
	};
	visit(raw);
	return found;
}

/** Best-effort: pull a top-level `defaults` object if the schema exposes one. */
export function extractDefaults(raw: unknown): Record<string, unknown> | null {
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const defaults = (raw as Record<string, unknown>).defaults;
		if (defaults && typeof defaults === 'object' && !Array.isArray(defaults)) {
			return defaults as Record<string, unknown>;
		}
	}
	return null;
}

export type SchemaStatus = 'idle' | 'loading' | 'ready' | 'fallback';

export class SchemaStore {
	status = $state<SchemaStatus>('idle');
	notice = $state<string | null>(null);
	/** Reconciled risk classes (engine-discovered) or the seeded fallback. Always populated. */
	riskClasses = $state<string[]>([...RISK_CLASSES]);
	defaults = $state<Record<string, unknown> | null>(null);
	raw = $state<unknown>(null);

	get usingFallback(): boolean {
		return this.status === 'fallback';
	}

	/** Fetch and reconcile the schema once per session. Idempotent. */
	async load(options: { fetch?: typeof fetch } = {}): Promise<void> {
		if (this.status === 'loading' || this.status === 'ready') return;
		this.status = 'loading';
		try {
			const raw = await fetchSchema(options);
			this.raw = raw;
			const discovered = extractRiskClasses(raw);
			this.riskClasses = discovered && discovered.length > 0 ? discovered : [...RISK_CLASSES];
			this.defaults = extractDefaults(raw);
			this.status = 'ready';
			this.notice = null;
		} catch {
			// Non-blocking fallback (AR10/M-1): keep working with seeded values + a notice.
			this.riskClasses = [...RISK_CLASSES];
			this.status = 'fallback';
			this.notice = 'Could not reach the engine schema — using built-in risk classes and defaults.';
		}
	}

	/** Reset to initial state (tests / forced refresh). */
	reset(): void {
		this.status = 'idle';
		this.notice = null;
		this.riskClasses = [...RISK_CLASSES];
		this.defaults = null;
		this.raw = null;
	}
}

export const schemaStore = new SchemaStore();
