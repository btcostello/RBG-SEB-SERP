/**
 * Map a thrown adapter error to the BFF error envelope + pass-through HTTP status (AR7, NFR9).
 *
 * Envelope shape mirrors lifeproj's own `{ error, details[] }` so the client mapping is 1:1:
 *   { error: { kind, message, details? } }
 * Status codes pass through: 400 validation, 401 auth, 422 projection, 504 connectivity.
 * Unknown errors collapse to a generic 500 with no internal detail leaked.
 */
import type { FieldIssue } from './errors';
import {
	LifeprojAuthError,
	LifeprojConnectivityError,
	LifeprojProjectionError,
	LifeprojValidationError
} from './errors';

export interface ErrorEnvelope {
	error: {
		kind: 'validation' | 'auth' | 'projection' | 'connectivity' | 'internal';
		message: string;
		details?: FieldIssue[];
	};
}

export function toErrorEnvelope(error: unknown): { status: number; body: ErrorEnvelope } {
	if (error instanceof LifeprojValidationError) {
		return {
			status: 400,
			body: { error: { kind: 'validation', message: error.message, details: error.details } }
		};
	}
	if (error instanceof LifeprojAuthError) {
		return { status: 401, body: { error: { kind: 'auth', message: error.message } } };
	}
	if (error instanceof LifeprojProjectionError) {
		return { status: 422, body: { error: { kind: 'projection', message: error.message } } };
	}
	if (error instanceof LifeprojConnectivityError) {
		return { status: 504, body: { error: { kind: 'connectivity', message: error.message } } };
	}
	// Never leak internals (stack/keys) for unexpected errors.
	return {
		status: 500,
		body: { error: { kind: 'internal', message: 'Unexpected server error' } }
	};
}
