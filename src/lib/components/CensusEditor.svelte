<script lang="ts">
	/**
	 * CensusEditor — add, edit, remove, and review executives (Story 1.4, FR5–FR10).
	 *
	 * One form doubles as add/edit: with no `editingId` it adds a new insured (the store
	 * assigns the id); in edit mode it patches the selected insured. All changes go through
	 * the active quote store immutably (AR12). Fields validate against InsuredDraftSchema with
	 * field-level messages (AR4). The table below reviews every participant (FR10).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { schemaStore } from '$lib/stores/schema.svelte';
	import {
		InsuredDraftSchema,
		fieldErrors,
		toNumberOrNaN,
		GENDERS,
		PLAN_MEMBERSHIPS,
		type Gender,
		type RiskClass,
		type PlanMembership,
		type Insured
	} from '$lib/domain';
	import { formatMoneyDisplay } from '$lib/money/money';

	// Risk-class options reconcile with the engine's discovered schema (FR8, FR22),
	// falling back to the seeded set when the schema is unreachable.
	const riskClassOptions = $derived(schemaStore.riskClasses as RiskClass[]);

	const census = $derived(quoteStore.current?.census ?? []);

	// --- Form state (raw inputs) ---
	let editingId = $state<string | null>(null);
	let firstName = $state('');
	let lastName = $state('');
	let gender = $state<Gender>('M');
	let dateOfBirth = $state('');
	let dateOfHire = $state('');
	let currentSalary = $state('');
	let benefitPctStr = $state('');
	let riskClass = $state<RiskClass>('Standard Non Tobacco');
	let planMembership = $state<PlanMembership>('SERP');

	const draft = $derived({
		firstName,
		lastName,
		gender,
		dateOfBirth,
		dateOfHire,
		currentSalary,
		benefitPercentage: toNumberOrNaN(benefitPctStr),
		riskClass,
		planMembership
	});
	const errors = $derived(fieldErrors(InsuredDraftSchema, draft));
	const isValid = $derived(Object.keys(errors).length === 0);

	function reset() {
		editingId = null;
		firstName = '';
		lastName = '';
		gender = 'M';
		dateOfBirth = '';
		dateOfHire = '';
		currentSalary = '';
		benefitPctStr = '';
		riskClass = 'Standard Non Tobacco';
		planMembership = 'SERP';
	}

	function submit() {
		if (!isValid) return;
		if (editingId) {
			quoteStore.updateInsured(editingId, draft);
		} else {
			quoteStore.addInsured(draft);
		}
		reset();
	}

	function startEdit(insured: Insured) {
		editingId = insured.id;
		firstName = insured.firstName;
		lastName = insured.lastName;
		gender = insured.gender;
		dateOfBirth = insured.dateOfBirth;
		dateOfHire = insured.dateOfHire;
		currentSalary = insured.currentSalary;
		benefitPctStr = String(insured.benefitPercentage);
		riskClass = insured.riskClass;
		planMembership = insured.planMembership;
	}

	function remove(id: string) {
		if (editingId === id) reset();
		quoteStore.removeInsured(id);
	}

	/** Format a stored decimal-string salary for display with thousands separators (AR2). */
	function displaySalary(value: string): string {
		return formatMoneyDisplay(value);
	}
</script>

<section>
	<h3>{editingId ? 'Edit executive' : 'Add executive'}</h3>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<div class="grid">
			<label>
				<span>First name</span>
				<input type="text" bind:value={firstName} aria-invalid={!!errors.firstName} />
				{#if errors.firstName && firstName !== ''}<span class="error">{errors.firstName}</span>{/if}
			</label>
			<label>
				<span>Last name</span>
				<input type="text" bind:value={lastName} aria-invalid={!!errors.lastName} />
				{#if errors.lastName && lastName !== ''}<span class="error">{errors.lastName}</span>{/if}
			</label>
			<label>
				<span>Gender</span>
				<select bind:value={gender}>
					{#each GENDERS as g (g)}<option value={g}>{g}</option>{/each}
				</select>
			</label>
			<label>
				<span>Date of birth</span>
				<input type="date" bind:value={dateOfBirth} aria-invalid={!!errors.dateOfBirth} />
				{#if errors.dateOfBirth && dateOfBirth !== ''}
					<span class="error">{errors.dateOfBirth}</span>
				{/if}
			</label>
			<label>
				<span>Date of hire</span>
				<input type="date" bind:value={dateOfHire} aria-invalid={!!errors.dateOfHire} />
				{#if errors.dateOfHire && dateOfHire !== ''}
					<span class="error">{errors.dateOfHire}</span>
				{/if}
			</label>
			<label>
				<span>Current salary</span>
				<input
					type="text"
					inputmode="decimal"
					bind:value={currentSalary}
					aria-invalid={!!errors.currentSalary}
				/>
				{#if errors.currentSalary && currentSalary !== ''}
					<span class="error">{errors.currentSalary}</span>
				{/if}
			</label>
			<label>
				<span>Benefit (% of FAS, e.g. 0.6)</span>
				<input
					type="number"
					step="0.01"
					min="0"
					bind:value={benefitPctStr}
					aria-invalid={!!errors.benefitPercentage}
				/>
				{#if errors.benefitPercentage && benefitPctStr !== ''}
					<span class="error">{errors.benefitPercentage}</span>
				{/if}
			</label>
			<label>
				<span>Risk class</span>
				<select bind:value={riskClass}>
					{#each riskClassOptions as rc (rc)}<option value={rc}>{rc}</option>{/each}
				</select>
			</label>
			<label>
				<span>Plan membership</span>
				<select bind:value={planMembership}>
					{#each PLAN_MEMBERSHIPS as pm (pm)}<option value={pm}>{pm}</option>{/each}
				</select>
			</label>
		</div>
		<div class="actions">
			<button type="submit" disabled={!isValid}
				>{editingId ? 'Save changes' : 'Add executive'}</button
			>
			{#if editingId}<button type="button" onclick={reset}>Cancel</button>{/if}
		</div>
	</form>

	<h3>Census ({census.length})</h3>
	{#if census.length === 0}
		<p class="empty">No executives yet. Add one above.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Gender</th>
					<th>DOB</th>
					<th>Hire</th>
					<th>Salary</th>
					<th>Benefit %</th>
					<th>Risk class</th>
					<th>Plan</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each census as insured (insured.id)}
					<tr>
						<td>{insured.firstName} {insured.lastName}</td>
						<td>{insured.gender}</td>
						<td>{insured.dateOfBirth}</td>
						<td>{insured.dateOfHire}</td>
						<td class="num">{displaySalary(insured.currentSalary)}</td>
						<td class="num">{insured.benefitPercentage}</td>
						<td>{insured.riskClass}</td>
						<td>{insured.planMembership}</td>
						<td>
							<button type="button" onclick={() => startEdit(insured)}>Edit</button>
							<button type="button" onclick={() => remove(insured.id)}>Remove</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	section {
		display: grid;
		gap: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.75rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.error {
		color: #b00020;
		font-size: 0.85rem;
	}
	.empty {
		color: #666;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.9rem;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
