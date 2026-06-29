/**
 * Run state store (FR27, NFR7, AR12).
 *
 * Drives the single-action run: status transitions `idle → computing → designing → done`
 * (or `failed`), exposes `progress` (completed/total) for the indicator, and keeps the
 * designed policies for live display. Wires the pure orchestrator to the BFF client and the
 * quote store; it never mutates inputs (a failed run leaves the quote intact for re-run).
 */
import { runModel, type DesignedPolicy, type RunStatus } from '$lib/orchestrator/run';
import { assembleResults } from '$lib/engine/results-mapping';
import { postIllustration } from '$lib/api/illustration-client';
import { quoteStore } from './quote.svelte';

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
	error = $state<{ kind: string; message: string } | null>(null);
	/** Designed COLI policies from the last successful run (for live results display). */
	designed = $state<DesignedPolicy[]>([]);

	get isRunning(): boolean {
		return this.status === 'computing' || this.status === 'designing';
	}

	/** Trigger the whole-model run for the active quote. */
	async start(): Promise<void> {
		const quote = quoteStore.current;
		if (!quote || this.isRunning) return;

		this.error = null;
		this.designed = [];
		this.progress = { completed: 0, total: 0 };

		try {
			const output = await runModel({
				quote,
				asOf: today(),
				illustrate: (request, signal) => postIllustration(request, { signal }),
				onStatus: (status) => {
					this.status = status;
				},
				onProgress: (completed, total) => {
					this.progress = { completed, total };
				}
			});

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
			this.status = 'failed';
			this.error = {
				kind: (error as { kind?: string }).kind ?? 'internal',
				message: (error as Error).message ?? 'Run failed'
			};
		}
	}

	reset(): void {
		this.status = 'idle';
		this.progress = { completed: 0, total: 0 };
		this.error = null;
		this.designed = [];
	}
}

export const runState = new RunStateStore();
