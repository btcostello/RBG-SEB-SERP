/**
 * Typed, discriminated error model for the lifeproj adapter (NFR9, AR8).
 *
 * Each maps to a distinct API failure mode so callers can handle them distinctly:
 *   400 validation_failed → LifeprojValidationError(details[])
 *   401 unauthorized      → LifeprojAuthError
 *   422 projection_failed → LifeprojProjectionError(message)
 *   timeout/unreachable   → LifeprojConnectivityError
 */

/** A single field-level validation problem from the engine. */
export interface FieldIssue {
	field: string;
	message: string;
}

export class LifeprojValidationError extends Error {
	readonly kind = 'validation' as const;
	constructor(public readonly details: FieldIssue[]) {
		super('lifeproj rejected the request (validation_failed)');
		this.name = 'LifeprojValidationError';
	}
}

export class LifeprojAuthError extends Error {
	readonly kind = 'auth' as const;
	constructor() {
		super('lifeproj authentication failed (unauthorized)');
		this.name = 'LifeprojAuthError';
	}
}

export class LifeprojProjectionError extends Error {
	readonly kind = 'projection' as const;
	constructor(message: string) {
		super(message);
		this.name = 'LifeprojProjectionError';
	}
}

export class LifeprojConnectivityError extends Error {
	readonly kind = 'connectivity' as const;
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'LifeprojConnectivityError';
	}
}

/** Discriminated union of every adapter error (discriminate on `.kind`). */
export type LifeprojError =
	LifeprojValidationError | LifeprojAuthError | LifeprojProjectionError | LifeprojConnectivityError;

/** Type guard: is this one of the adapter's typed errors? */
export function isLifeprojError(error: unknown): error is LifeprojError {
	return (
		error instanceof LifeprojValidationError ||
		error instanceof LifeprojAuthError ||
		error instanceof LifeprojProjectionError ||
		error instanceof LifeprojConnectivityError
	);
}
