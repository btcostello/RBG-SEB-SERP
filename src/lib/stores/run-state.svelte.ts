/**
 * Run state store (FR27, NFR7, AR12).
 *
 * Drives the single-action run: status transitions `idle → computing → designing → done`
 * (or `failed`), exposes `progress` (completed/total) for the indicator, and keeps the
 * designed policies for live display. Wires the pure orchestrator to the BFF client and the
 * quote store; it never mutates inputs (a failed run leaves the quote intact for re-run).
 */
import { runModel, type DesignedPolicy, type RunStatus } from '$lib/orchestrator/run';
import { validateRun, type RunValidationIssue } from '$lib/orchestrator/validate-run';
import { assembleResults } from '$lib/engine/results-mapping';
import { postIllustration } from '$lib/api/illustration-client';
import { toRunFailure, type RunFailure } from '$lib/domain';
import { quoteStore } from './quote.svelte';
import { schemaStore } from './schema.svelte';

function today(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

class RunStateStore {
	status = $state<RunStatus>('idle');
	progress = $state<{ completed: number; total: number }>({ completed: 0, total: 0 });
	/** Specific, typed failure reason (FR25) — null unless the last run failed. */
	error = $state<RunFailure | null>(null);
	/** Pre-run contract violations (FR24); when non-empty the run does not start. */
	validationIssues = $state<RunValidationIssue[]>([]);
	/** Designed COLI policies from the last successful run (for live results display). */
	designed = $state<DesignedPolicy[]>([]);

	/** Run-level abort controller — aborts in-flight + remaining calls on fail-fast. */
	#controller: AbortController | null = null;

	get isRunning(): boolean {
		return this.status === 'computing' || this.status === 'designing';
	}

	/** Cancel an in-flight run (fail-fast). */
	cancel(): void {
		this.#controller?.abort();
	}

	/** Trigger the whole-model run for the active quote. */
	async start(): Promise<void> {
		const quote = quoteStore.current;
		if (!quote || this.isRunning) return;

		this.error = null;
		this.designed = [];
		this.progress = { completed: 0, total: 0 };

		// Pre-run validation against the engine contract — the run does not start on a violation.
		const issues = validateRun({ quote, asOf: today(), riskClasses: schemaStore.riskClasses });
		this.validationIssues = issues;
		if (issues.length > 0) {
			this.status = 'idle';
			return;
		}

		const controller = new AbortController();
		this.#controller = controller;

		try {
			const output = await runModel({
				quote,
				asOf: today(),
				illustrate: (request, signal) => postIllustration(request, { signal }),
				signal: controller.signal,
				onStatus: (status) => {
					this.status = status;
				},
				onProgress: (completed, total) => {
					this.progress = { completed, total };
				}
			});

			// Only on full success do results populate — a failed run produces no partial output.
			this.designed = output.designed;
			quoteStore.setResults(
				assembleResults({
					liability: output.liability,
					totalDeathBenefit: output.totalDeathBenefit,
					designed: output.designed
				})
			);
			this.status = 'done';
		} catch (error) {
			// Whole-run fail-fast: abort anything in flight, set a specific reason, no partial output.
			controller.abort();
			this.designed = [];
			this.status = 'failed';
			this.error = toRunFailure(error);
		} finally {
			this.#controller = null;
		}
	}

	reset(): void {
		this.status = 'idle';
		this.progress = { completed: 0, total: 0 };
		this.error = null;
		this.validationIssues = [];
		this.designed = [];
	}
}

export const runState = new RunStateStore();
