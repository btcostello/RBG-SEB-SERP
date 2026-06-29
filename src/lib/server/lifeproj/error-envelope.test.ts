import { describe, it, expect } from 'vitest';
import { toErrorEnvelope } from './error-envelope';
import {
	LifeprojAuthError,
	LifeprojConnectivityError,
	LifeprojProjectionError,
	LifeprojValidationError
} from './errors';

describe('toErrorEnvelope (AR7, NFR9)', () => {
	it('maps a validation error to 400 with details', () => {
		const details = [{ field: 'gender', message: 'must be one of M, F' }];
		const { status, body } = toErrorEnvelope(new LifeprojValidationError(details));
		expect(status).toBe(400);
		expect(body.error.kind).toBe('validation');
		expect(body.error.details).toEqual(details);
	});

	it('maps an auth error to 401', () => {
		const { status, body } = toErrorEnvelope(new LifeprojAuthError());
		expect(status).toBe(401);
		expect(body.error.kind).toBe('auth');
	});

	it('maps a projection error to 422 with the message', () => {
		const { status, body } = toErrorEnvelope(new LifeprojProjectionError('rate miss'));
		expect(status).toBe(422);
		expect(body.error.kind).toBe('projection');
		expect(body.error.message).toBe('rate miss');
	});

	it('maps a connectivity error to 504', () => {
		const { status, body } = toErrorEnvelope(new LifeprojConnectivityError('timeout'));
		expect(status).toBe(504);
		expect(body.error.kind).toBe('connectivity');
	});

	it('collapses an unknown error to a generic 500 without leaking internals', () => {
		const { status, body } = toErrorEnvelope(new Error('secret stack detail'));
		expect(status).toBe(500);
		expect(body.error.kind).toBe('internal');
		expect(body.error.message).not.toContain('secret');
	});
});
