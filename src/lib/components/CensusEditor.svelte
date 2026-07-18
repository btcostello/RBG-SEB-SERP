<script lang="ts">
	/**
	 * CensusEditor — spreadsheet-style census entry (Story 1.4, FR5–FR10).
	 *
	 * Replaces the single add/edit form with an inline-editable grid so the operator can enter
	 * many executives at once. The grid is fully described by the `columns` config below, and
	 * columns are organised into groups. A "Show advanced columns" toggle reveals the
	 * non-essential (defaulted) groups, so the layout scales cleanly as more per-exec parameters
	 * are added — up to the ~40-column advanced case — without the grid becoming unusable:
	 * appending a config entry with `advanced: true` renders, validates, and imports it with no
	 * template changes. Rows can also be pasted straight from Excel / Google Sheets (TSV or CSV),
	 * mapped by header when present or positionally otherwise.
	 *
	 * Every edit flows through the active quote store immutably (AR12); each cell validates
	 * against InsuredDraftSchema for a per-row completeness signal (AR4), and pre-run contract
	 * issues (validateRun) are surfaced inline so nothing invalid is hidden behind a collapsed
	 * column group.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { schemaStore } from '$lib/stores/schema.svelte';
	import { runState } from '$lib/stores/run-state.svelte';
	import {
		InsuredDraftSchema,
		fieldErrors,
		riskClassForSmoker,
		CENSUS_GENDERS,
		SMOKERS,
		SERVICE_BASES,
		PLAN_MEMBERSHIPS,
		type RiskClass,
		type Insured,
		type InsuredDraft
	} from '$lib/domain';
	import type { RunValidationIssue } from '$lib/orchestrator/validate-run';

	// Risk-class options reconcile with the engine's discovered schema (FR8, FR22),
	// falling back to the seeded set when the schema is unreachable.
	const riskClassOptions = $derived(schemaStore.riskClasses as RiskClass[]);
	const census = $derived(quoteStore.current?.census ?? []);

	type ColType = 'text' | 'money' | 'date' | 'number' | 'select';
	interface Column {
		key: keyof InsuredDraft;
		label: string;
		group: string;
		advanced: boolean;
		type: ColType;
		/** Static option list, or the sentinel 'risk' to pull the live risk-class set. */
		options?: readonly string[] | 'risk';
		align?: 'right';
		/** Step for a numeric cell (default '0.01'); integer fields use '1'. */
		step?: string;
		/** Extra header spellings recognised on paste (label & key are always matched). */
		aliases?: string[];
	}

	// The single source of truth for the grid. Each per-participant input is one entry; adding a
	// column is just adding a row here — it renders, validates against the draft schema, and
	// imports on paste automatically. `advanced: true` tucks a group behind the toggle, which is
	// what lets the layout carry the full ~26-field set without becoming unusable.
	const columns: Column[] = [
		// Essentials — always visible for fast multi-exec entry.
		{ key: 'firstName', label: 'First name', group: 'Executive', advanced: false, type: 'text', aliases: ['first', 'fname'] },
		{ key: 'lastName', label: 'Last name', group: 'Executive', advanced: false, type: 'text', aliases: ['last', 'lname', 'surname'] },
		{ key: 'gender', label: 'Gender', group: 'Executive', advanced: false, type: 'select', options: CENSUS_GENDERS, aliases: ['sex'] },
		{ key: 'smoker', label: 'Smoker', group: 'Executive', advanced: false, type: 'select', options: SMOKERS, aliases: ['tobacco', 'smoker status'] },
		{ key: 'planMembership', label: 'COLI / SERP', group: 'Plan', advanced: false, type: 'select', options: PLAN_MEMBERSHIPS, aliases: ['plan', 'membership', 'participation'] },
		{ key: 'dateOfBirth', label: 'Birth date', group: 'Dates', advanced: false, type: 'date', aliases: ['dob', 'birth', 'birthdate'] },
		{ key: 'dateOfHire', label: 'Hire date', group: 'Dates', advanced: false, type: 'date', aliases: ['doh', 'hire', 'hire date'] },
		{ key: 'currentSalary', label: 'Recognized salary', group: 'Compensation', advanced: false, type: 'money', align: 'right', aliases: ['recognized salary', 'salary', 'comp', 'pay'] },

		// Benefit terms.
		{ key: 'retirementAge', label: 'Retirement age', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['retire age', 'nra'] },
		{ key: 'benefitWaitingPeriod', label: 'Min waiting period', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['waiting period', 'minimum waiting period', 'waiting'] },
		{ key: 'minBenefitYears', label: 'Min benefit years', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['minimum benefit years'] },
		{ key: 'maxBenefitYears', label: 'Max benefit years', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['maximum benefit years'] },
		{ key: 'lifeExpectancy', label: 'Life expectancy', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['death age', 'assumed death age'] },
		{ key: 'colaScale', label: 'Benefit COLA', group: 'Benefit terms', advanced: true, type: 'number', align: 'right', aliases: ['cola', 'cola scale', 'benefit cola scale'] },

		// Fixed benefit.
		{ key: 'benefitAmount', label: 'Benefit amount', group: 'Fixed benefit', advanced: true, type: 'money', align: 'right', aliases: ['fixed benefit', 'flat benefit'] },

		// Salary-based assumptions (feed final average salary).
		{ key: 'salaryGrowthRate', label: 'Salary growth', group: 'Salary-based', advanced: true, type: 'number', align: 'right', aliases: ['salary growth rate', 'growth'] },
		{ key: 'fasAveragingPeriod', label: 'Years FAS', group: 'Salary-based', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['years fas', 'fas years', 'averaging period'] },

		// Fixed-percentage benefit.
		{ key: 'benefitPercentage', label: 'Percent of FAS', group: '% of FAS', advanced: true, type: 'number', align: 'right', aliases: ['percent of fas', 'benefit', 'benefit %', 'fas %'] },

		// Unit-credit benefit.
		{ key: 'unitCredit', label: 'Unit credit', group: 'Unit credit', advanced: true, type: 'number', align: 'right', aliases: ['unit credit %'] },
		{ key: 'serviceBasis', label: 'Service basis', group: 'Unit credit', advanced: true, type: 'select', options: SERVICE_BASES, aliases: ['future service / all years', 'future service'] },

		// Survivor benefit.
		{ key: 'survivorTier1Pct', label: 'Survivor % T1', group: 'Survivor benefit', advanced: true, type: 'number', align: 'right', aliases: ['survivor benefit % tier 1', 'survivor tier 1 %'] },
		{ key: 'survivorTier1Years', label: 'Years T1', group: 'Survivor benefit', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['years tier 1'] },
		{ key: 'survivorTier2Pct', label: 'Survivor % T2', group: 'Survivor benefit', advanced: true, type: 'number', align: 'right', aliases: ['survivor benefit % tier 2', 'survivor tier 2 %'] },
		{ key: 'survivorTier2Years', label: 'Years T2', group: 'Survivor benefit', advanced: true, type: 'number', align: 'right', step: '1', aliases: ['years tier 2'] },

		// Underwriting override — normally derived from Smoker; edit here for fine control.
		{ key: 'riskClass', label: 'Risk class (override)', group: 'Underwriting', advanced: true, type: 'select', options: 'risk', aliases: ['risk', 'health', 'risk class'] }
	];

	const advancedKeys = columns.filter((c) => c.advanced).map((c) => c.key);

	/** Header spelling → column key, for mapping pasted spreadsheet columns. */
	const headerLookup = new Map<string, keyof InsuredDraft>();
	for (const col of columns) {
		headerLookup.set(col.label.toLowerCase(), col.key);
		headerLookup.set(col.key.toLowerCase(), col.key);
		for (const alias of col.aliases ?? []) headerLookup.set(alias.toLowerCase(), col.key);
	}
	const columnByKey = new Map(columns.map((c) => [c.key, c]));

	// --- Column visibility (the advanced-columns toggle) ---
	let showAdvanced = $state(false);

	/** A blank executive, pre-filled with the documented per-participant defaults (FR5–FR9). */
	function newRow(): InsuredDraft {
		return {
			firstName: 'First',
			lastName: 'Last',
			gender: 'Male',
			smoker: 'Nonsmoker',
			planMembership: 'BOTH',
			dateOfBirth: '1980-01-01',
			dateOfHire: '2020-01-01',
			retirementAge: 65,
			benefitWaitingPeriod: 5,
			minBenefitYears: 5,
			maxBenefitYears: 20,
			lifeExpectancy: 84,
			colaScale: 0,
			benefitAmount: '0',
			currentSalary: '150000',
			salaryGrowthRate: 0.03,
			fasAveragingPeriod: 5,
			benefitPercentage: 0.6,
			unitCredit: 0,
			serviceBasis: 'All Years',
			survivorTier1Pct: 1,
			survivorTier1Years: 1,
			survivorTier2Pct: 0.5,
			survivorTier2Years: 2,
			riskClass: 'Standard Non Tobacco'
		};
	}

	function draftOf(insured: Insured): InsuredDraft {
		const { id: _id, ...rest } = insured;
		return rest;
	}

	function optionsFor(col: Column): readonly string[] {
		return col.options === 'risk' ? riskClassOptions : (col.options ?? []);
	}

	// Per-row field errors, keyed by insured id, for the completeness indicator and cell styling.
	const rowErrors = $derived.by(() => {
		const map = new Map<string, Record<string, string>>();
		for (const insured of census) map.set(insured.id, fieldErrors(InsuredDraftSchema, draftOf(insured)));
		return map;
	});

	// If any advanced cell holds an actual (non-empty) invalid value, the advanced columns stay
	// visible no matter the toggle — an error must never hide behind a collapsed group.
	const advancedHasError = $derived.by(() => {
		for (const insured of census) {
			const errs = rowErrors.get(insured.id);
			if (!errs) continue;
			for (const key of advancedKeys) {
				if (errs[key] && String((insured as Record<string, unknown>)[key] ?? '') !== '') return true;
			}
		}
		return false;
	});
	const advancedVisible = $derived(showAdvanced || advancedHasError);
	const visibleColumns = $derived(columns.filter((c) => !c.advanced || advancedVisible));

	// Contiguous group spans across the currently-visible columns, for the grouped header row.
	const groupSpans = $derived.by(() => {
		const spans: { name: string; advanced: boolean; span: number }[] = [];
		for (const col of visibleColumns) {
			const last = spans[spans.length - 1];
			if (last && last.name === col.group) last.span++;
			else spans.push({ name: col.group, advanced: col.advanced, span: 1 });
		}
		return spans;
	});

	// Pre-run contract issues (FR24), grouped by insured so each row can surface its own.
	const issuesByInsured = $derived.by(() => {
		const map = new Map<string, RunValidationIssue[]>();
		for (const issue of runState.validationIssues) {
			if (!issue.insuredId) continue;
			const list = map.get(issue.insuredId) ?? [];
			list.push(issue);
			map.set(issue.insuredId, list);
		}
		return map;
	});

	/** Human-readable problems for a row (schema completeness + pre-run contract issues). */
	function rowProblems(insured: Insured): string[] {
		const errs = rowErrors.get(insured.id) ?? {};
		const messages: string[] = [];
		for (const col of columns) if (errs[col.key]) messages.push(`${col.label}: ${errs[col.key]}`);
		for (const issue of issuesByInsured.get(insured.id) ?? []) messages.push(issue.message);
		return messages;
	}

	/** A cell shows as invalid only once it holds a non-empty bad value (empty = "unfilled", quiet). */
	function cellInvalid(insured: Insured, col: Column): boolean {
		const errs = rowErrors.get(insured.id);
		if (!errs || !errs[col.key]) return false;
		return String((insured as Record<string, unknown>)[col.key] ?? '') !== '';
	}

	// --- Mutations (all immutable via the store, AR12) ---
	function setField(insured: Insured, col: Column, raw: string) {
		const value: string | number = col.type === 'number' ? (raw === '' ? Number.NaN : Number(raw)) : raw;
		// Smoker drives the engine risk class (unless the operator overrides it directly).
		if (col.key === 'smoker') {
			quoteStore.updateInsured(insured.id, {
				smoker: value as Insured['smoker'],
				riskClass: riskClassForSmoker(value as Insured['smoker'])
			});
			return;
		}
		quoteStore.updateInsured(insured.id, { [col.key]: value } as Partial<Insured>);
	}

	/** On blur, strip separators from a money cell so "250,000" or "$250,000" become valid (AR2). */
	function normalizeMoney(insured: Insured, col: Column, raw: string) {
		const cleaned = raw.replace(/[$,\s]/g, '');
		if (cleaned !== raw) quoteStore.updateInsured(insured.id, { [col.key]: cleaned } as Partial<Insured>);
	}

	function addRow() {
		quoteStore.addInsured(newRow());
	}

	function duplicate(insured: Insured) {
		quoteStore.addInsured(draftOf(insured));
	}

	function remove(id: string) {
		quoteStore.removeInsured(id);
	}

	// --- Paste-from-spreadsheet import ---
	let showPaste = $state(false);
	let pasteText = $state('');
	let pasteMessage = $state('');

	function normalizeDate(raw: string): string {
		const s = raw.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
		// Best-effort US-style M/D/Y (the common spreadsheet export) → ISO.
		const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
		if (m) {
			let [, mo, d, y] = m;
			if (y.length === 2) y = (Number(y) > 50 ? '19' : '20') + y;
			return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
		}
		return s;
	}

	function matchOption(col: Column, raw: string): string {
		const s = raw.trim();
		if (col.key === 'gender') {
			const u = s.toUpperCase();
			if (u.startsWith('F')) return 'Female';
			if (u.startsWith('U')) return 'Unisex';
			if (u.startsWith('M')) return 'Male';
			return s;
		}
		const hit = optionsFor(col).find((o) => o.toLowerCase() === s.toLowerCase());
		return hit ?? s;
	}

	/** Coerce one pasted cell string into the value shape the column stores. */
	function coerceValue(col: Column, raw: string): string | number {
		const s = raw.trim();
		switch (col.type) {
			case 'number': {
				if (s.endsWith('%')) {
					const n = Number(s.slice(0, -1).trim());
					return Number.isFinite(n) ? n / 100 : Number.NaN;
				}
				const n = Number(s.replace(/,/g, ''));
				return Number.isFinite(n) ? n : Number.NaN;
			}
			case 'money':
				return s.replace(/[$,\s]/g, '');
			case 'date':
				return normalizeDate(s);
			case 'select':
				return matchOption(col, s);
			default:
				return s;
		}
	}

	/** Parse pasted TSV/CSV into census rows. Returns how many were added. */
	function applyPaste(text: string): number {
		const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
		if (lines.length === 0) return 0;

		const delimiter = lines[0].includes('\t') ? '\t' : ',';
		const grid = lines.map((l) => l.split(delimiter).map((c) => c.trim()));

		// Treat the first line as a header when ≥2 of its cells match a known column name.
		const firstLower = grid[0].map((c) => c.toLowerCase());
		const mapped = firstLower.map((h) => headerLookup.get(h));
		const hasHeader = mapped.filter(Boolean).length >= Math.min(2, firstLower.length);

		const colOrder: (Column | undefined)[] = hasHeader
			? mapped.map((key) => (key ? columnByKey.get(key) : undefined))
			: columns.slice();
		const dataRows = hasHeader ? grid.slice(1) : grid;

		let added = 0;
		for (const cells of dataRows) {
			if (cells.every((c) => c === '')) continue;
			const draft = newRow();
			const providedKeys = new Set<string>();
			cells.forEach((cell, i) => {
				const col = colOrder[i];
				if (!col || cell === '') return;
				(draft as Record<string, unknown>)[col.key] = coerceValue(col, cell);
				providedKeys.add(col.key);
			});
			// If Smoker was given but risk class wasn't, derive risk class from it (grid parity).
			if (providedKeys.has('smoker') && !providedKeys.has('riskClass')) {
				draft.riskClass = riskClassForSmoker(draft.smoker);
			}
			quoteStore.addInsured(draft);
			added++;
		}
		return added;
	}

	function submitPaste() {
		const n = applyPaste(pasteText);
		if (n > 0) {
			pasteMessage = `Added ${n} executive${n === 1 ? '' : 's'}.`;
			pasteText = '';
			showAdvanced = true; // reveal advanced columns so pasted values are visible
			showPaste = false;
		} else {
			pasteMessage = 'Nothing to import — check the pasted rows.';
		}
	}
</script>

<section>
	<div class="toolbar">
		<div class="titles">
			<h3>Executives <span class="count">{census.length}</span></h3>
			<p class="hint">Edit inline, add rows, or paste a block from Excel / Google Sheets.</p>
		</div>
		<div class="tools">
			<button type="button" class="primary" onclick={addRow}>+ Add executive</button>
			<button type="button" onclick={() => (showPaste = !showPaste)} aria-expanded={showPaste}>
				Paste rows…
			</button>
			<button
				type="button"
				class="ghost"
				aria-pressed={advancedVisible}
				disabled={advancedHasError}
				title={advancedHasError
					? 'Advanced columns contain errors and stay visible'
					: 'Show or hide the advanced per-executive columns'}
				onclick={() => (showAdvanced = !showAdvanced)}
			>
				{advancedVisible ? 'Hide' : 'Show'} advanced columns
			</button>
		</div>
	</div>

	{#if showPaste}
		<div class="paste">
			<label for="paste-box">Paste rows (tab- or comma-separated; a header row is auto-detected)</label>
			<textarea
				id="paste-box"
				rows="4"
				bind:value={pasteText}
				placeholder={'First name\tLast name\tDate of birth\tDate of hire\tSalary\nJane\tDoe\t1975-04-12\t2008-06-01\t250000'}
			></textarea>
			<div class="paste-actions">
				<button type="button" class="primary" onclick={submitPaste} disabled={pasteText.trim() === ''}>
					Import rows
				</button>
				<button type="button" onclick={() => { showPaste = false; pasteMessage = ''; }}>Cancel</button>
				{#if pasteMessage}<span class="paste-msg">{pasteMessage}</span>{/if}
			</div>
		</div>
	{/if}

	<div class="table-wrap">
		<table>
			<thead>
				<tr class="group-row">
					<th class="rownum" rowspan="2"><span class="sr">Row</span></th>
					{#each groupSpans as g (g.name)}
						<th class="group" class:advanced={g.advanced} colspan={g.span}>{g.name}</th>
					{/each}
					<th class="actions-col" rowspan="2">Actions</th>
				</tr>
				<tr>
					{#each visibleColumns as col (col.key)}
						<th class:advanced={col.advanced} class:num={col.align === 'right'}>{col.label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if census.length === 0}
					<tr>
						<td class="empty" colspan={visibleColumns.length + 2}>
							No executives yet. Add a row or paste from a spreadsheet.
						</td>
					</tr>
				{:else}
					{#each census as insured, i (insured.id)}
						{@const problems = rowProblems(insured)}
						<tr class:row-invalid={problems.length > 0}>
							<td class="rownum">
								<span class="idx">{i + 1}</span>
								<span
									class="status"
									class:ok={problems.length === 0}
									title={problems.length ? problems.join('\n') : 'Complete'}
								>
									{problems.length === 0 ? '✓' : '!'}
								</span>
							</td>
							{#each visibleColumns as col (col.key)}
								<td
									class:num={col.align === 'right'}
									class:advanced={col.advanced}
									class:cell-invalid={cellInvalid(insured, col)}
								>
									{#if col.type === 'select'}
										<select
											value={insured[col.key]}
											aria-label={`${col.label} for row ${i + 1}`}
											onchange={(e) => setField(insured, col, e.currentTarget.value)}
										>
											{#each optionsFor(col) as opt (opt)}<option value={opt}>{opt}</option>{/each}
										</select>
									{:else if col.type === 'money'}
										<input
											type="text"
											inputmode="decimal"
											autocomplete="off"
											name={`salary-${i}`}
											data-1p-ignore
											data-lpignore="true"
											value={insured[col.key]}
											aria-label={`${col.label} for row ${i + 1}`}
											oninput={(e) => setField(insured, col, e.currentTarget.value)}
											onblur={(e) => normalizeMoney(insured, col, e.currentTarget.value)}
										/>
									{:else if col.type === 'number'}
										<input
											type="number"
											step={col.step ?? '0.01'}
											min="0"
											value={insured[col.key]}
											aria-label={`${col.label} for row ${i + 1}`}
											oninput={(e) => setField(insured, col, e.currentTarget.value)}
										/>
									{:else if col.type === 'date'}
										<input
											type="date"
											value={insured[col.key]}
											aria-label={`${col.label} for row ${i + 1}`}
											oninput={(e) => setField(insured, col, e.currentTarget.value)}
										/>
									{:else}
										<input
											type="text"
											value={insured[col.key]}
											aria-label={`${col.label} for row ${i + 1}`}
											oninput={(e) => setField(insured, col, e.currentTarget.value)}
										/>
									{/if}
								</td>
							{/each}
							<td class="actions-col">
								<button type="button" class="ghost" title="Duplicate" onclick={() => duplicate(insured)}>⧉</button>
								<button type="button" class="ghost danger" title="Remove" onclick={() => remove(insured.id)}>✕</button>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<div class="footer">
		<button type="button" class="ghost" onclick={addRow}>+ Add executive</button>
	</div>
</section>

<style>
	section {
		display: grid;
		gap: 0.75rem;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.titles h3 {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.count {
		font-size: 0.8rem;
		font-weight: 600;
		color: #475569;
		background: #eef2f7;
		border-radius: 999px;
		padding: 0.05rem 0.5rem;
	}
	.hint {
		margin: 0.15rem 0 0;
		color: #64748b;
		font-size: 0.85rem;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	button {
		font: inherit;
		padding: 0.4rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		background: #fff;
		cursor: pointer;
	}
	button:hover {
		border-color: #94a3b8;
	}
	button.primary {
		background: #1e40af;
		border-color: #1e40af;
		color: #fff;
	}
	button.primary:hover {
		background: #1c3aa0;
	}
	button.ghost {
		background: transparent;
		border-color: transparent;
		color: #334155;
	}
	button.ghost:hover {
		background: #eef2f7;
	}
	button.ghost.danger:hover {
		background: #fde8e8;
		color: #b00020;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.paste {
		display: grid;
		gap: 0.4rem;
		padding: 0.75rem;
		border: 1px solid #dbe3ec;
		border-radius: 8px;
		background: #f8fafc;
	}
	.paste label {
		font-size: 0.85rem;
		color: #475569;
	}
	.paste textarea {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.85rem;
		padding: 0.5rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		resize: vertical;
	}
	.paste-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.paste-msg {
		font-size: 0.85rem;
		color: #475569;
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}
	table {
		border-collapse: separate;
		border-spacing: 0;
		width: 100%;
		font-size: 0.9rem;
	}
	th,
	td {
		border-right: 1px solid #eef2f7;
		border-bottom: 1px solid #eef2f7;
		text-align: left;
		white-space: nowrap;
	}
	thead th {
		background: #f1f5f9;
		font-weight: 600;
		color: #334155;
		padding: 0.4rem 0.6rem;
		position: sticky;
		top: 0;
	}
	th.group {
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.72rem;
		color: #64748b;
		background: #e8eef6;
	}
	th.group.advanced,
	th.advanced {
		background: #eef0fb;
	}
	th.num {
		text-align: right;
	}

	/* Cells hold edge-to-edge inputs so the grid reads like a spreadsheet. */
	tbody td {
		padding: 0;
	}
	tbody td.advanced {
		background: #fafaff;
	}
	td input,
	td select {
		width: 100%;
		box-sizing: border-box;
		border: 0;
		background: transparent;
		font: inherit;
		padding: 0.4rem 0.55rem;
		color: #0f172a;
	}
	td.num input {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	td input:focus,
	td select:focus {
		outline: 2px solid #1e40af;
		outline-offset: -2px;
		background: #fff;
	}
	td.cell-invalid {
		box-shadow: inset 0 0 0 2px #e11d48;
	}
	tr.row-invalid td.rownum {
		background: #fff5f6;
	}

	.rownum {
		position: sticky;
		left: 0;
		z-index: 2;
		background: #f8fafc;
		padding: 0.3rem 0.5rem;
		text-align: center;
		min-width: 3rem;
	}
	thead th.rownum {
		z-index: 3;
	}
	.rownum .idx {
		color: #94a3b8;
		font-variant-numeric: tabular-nums;
		margin-right: 0.35rem;
	}
	.status {
		display: inline-block;
		width: 1.15rem;
		height: 1.15rem;
		line-height: 1.15rem;
		border-radius: 50%;
		font-size: 0.72rem;
		font-weight: 700;
		color: #fff;
		background: #e11d48;
	}
	.status.ok {
		background: #16a34a;
	}

	.actions-col {
		text-align: center;
		padding: 0 0.25rem;
	}
	.actions-col button {
		padding: 0.2rem 0.4rem;
		font-size: 0.9rem;
	}

	.empty {
		padding: 1.25rem;
		text-align: center;
		color: #94a3b8;
	}
	.footer {
		display: flex;
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
