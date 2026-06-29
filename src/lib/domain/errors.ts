/**
 * Typed run failure (FR25, NFR9/NFR10).
 *
 * A whole-run failure carries a specific, discriminated reason so the operator sees a clear
 * message (and the UI can react per kind). Built from an `ApiError` (or any thrown error) at
 * the run boundary; unknown errors collapse to `internal` without leaking internals.
 */
export type RunFailureKind = 'validation' | 'auth' | 'projection' | 'connectivity' | 'internal';

export interface RunFailureDetail {
	field: string;
	message: string;
}

export interface RunFailure {
	kind: RunFailureKind;
	message: string;
	details?: RunFailureDetail[];
}

const RUN_FAILURE_KINDS: ReadonlySet<string> = new Set([
	'validation',
	'auth',
	'projection',
	'connectivity',
	'internal'
]);

/** Map any thrown error (typically an `ApiError`) to a typed RunFailure. */
export function toRunFailure(error: unknown): RunFailure {
	const candidate = error as { kind?: unknown; message?: unknown; details?: RunFailureDetail[] };
	const kind: RunFailureKind =
		typeof candidate?.kind === 'string' && RUN_FAILURE_KINDS.has(candidate.kind)
			? (candidate.kind as RunFailureKind)
			: 'internal';
	const message =
		typeof candidate?.message === 'string' && candidate.message.length > 0
			? candidate.message
			: 'The run failed';
	return { kind, message, details: candidate?.details };
}

/** A human prefix for a failure kind, for surfacing a clear reason in the UI. */
export function runFailureHeadline(kind: RunFailureKind): string {
	switch (kind) {
		case 'validation':
			return 'Invalid input';
		case 'auth':
			return 'Authentication failed';
		case 'projection':
			return 'The engine could not complete the projection';
		case 'connectivity':
			return 'Could not reach the engine';
		default:
			return 'Run failed';
	}
}
