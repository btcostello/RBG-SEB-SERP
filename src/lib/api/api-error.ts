/**
 * Client-side error for BFF calls. Mirrors the server error envelope
 * `{ error: { kind, message, details? } }` so the UI can discriminate on `kind` (NFR9).
 */
export type ApiErrorKind = 'validation' | 'auth' | 'projection' | 'connectivity' | 'internal';

export interface ApiFieldIssue {
	field: string;
	message: string;
}

export class ApiError extends Error {
	constructor(
		public readonly kind: ApiErrorKind,
		message: string,
		public readonly status: number,
		public readonly details?: ApiFieldIssue[]
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/** Build an ApiError from a non-OK BFF response, reading its error envelope if present. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		// non-JSON error body
	}
	const envelope = (
		body as { error?: { kind?: string; message?: string; details?: ApiFieldIssue[] } }
	)?.error;
	if (envelope && typeof envelope.kind === 'string') {
		return new ApiError(
			envelope.kind as ApiErrorKind,
			envelope.message ?? 'Request failed',
			response.status,
			envelope.details
		);
	}
	return new ApiError('internal', `Request failed (HTTP ${response.status})`, response.status);
}
