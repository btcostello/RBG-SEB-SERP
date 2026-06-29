import { describe, it, expect } from 'vitest';
import { toRunFailure, runFailureHeadline } from './errors';
import { ApiError } from '$lib/api/api-error';

describe('toRunFailure (FR25)', () => {
	it('preserves the kind, message, and details of an ApiError', () => {
		const apiError = new ApiError('validation', 'Invalid design request', 400, [
			{ field: 'gender', message: 'required' }
		]);
		expect(toRunFailure(apiError)).toEqual({
			kind: 'validation',
			message: 'Invalid design request',
			details: [{ field: 'gender', message: 'required' }]
		});
	});

	it('maps a connectivity ApiError', () => {
		expect(toRunFailure(new ApiError('connectivity', 'timeout', 0)).kind).toBe('connectivity');
	});

	it('collapses an unknown error to internal with a fallback message', () => {
		expect(toRunFailure({})).toEqual({
			kind: 'internal',
			message: 'The run failed',
			details: undefined
		});
		expect(toRunFailure(new Error('boom'))).toMatchObject({ kind: 'internal', message: 'boom' });
	});
});

describe('runFailureHeadline', () => {
	it('gives a clear reason per kind', () => {
		expect(runFailureHeadline('connectivity')).toMatch(/reach the engine/i);
		expect(runFailureHeadline('auth')).toMatch(/authentication/i);
		expect(runFailureHeadline('internal')).toBe('Run failed');
	});
});
