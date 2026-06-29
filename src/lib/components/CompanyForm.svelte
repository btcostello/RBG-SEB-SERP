<script lang="ts">
	/**
	 * CompanyForm — edit the active quote's company name and corporate tax rate (FR1).
	 * Validates each field against the Valibot CompanySchema and surfaces field-level
	 * errors (AR4). Valid changes are committed immutably to the active quote store (AR12).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { CompanySchema, fieldErrors, toNumberOrNaN } from '$lib/domain';

	let name = $state(quoteStore.current?.company.name ?? '');
	let taxRateStr = $state(
		quoteStore.current ? String(quoteStore.current.company.corporateTaxRate) : ''
	);

	// Build a candidate Company from the raw inputs. Empty tax rate -> NaN so it fails
	// validation rather than silently coercing to 0.
	const candidate = $derived({
		name,
		corporateTaxRate: toNumberOrNaN(taxRateStr)
	});
	const errors = $derived(fieldErrors(CompanySchema, candidate));

	function commit() {
		if (Object.keys(errors).length === 0) {
			quoteStore.updateCompany({
				name: candidate.name,
				corporateTaxRate: candidate.corporateTaxRate
			});
		}
	}
</script>

<fieldset>
	<legend>Company</legend>

	<label>
		<span>Company name</span>
		<input type="text" bind:value={name} oninput={commit} aria-invalid={!!errors.name} />
		{#if errors.name}<span class="error">{errors.name}</span>{/if}
	</label>

	<label>
		<span>Corporate tax rate (0–1)</span>
		<input
			type="number"
			step="0.01"
			min="0"
			max="1"
			bind:value={taxRateStr}
			oninput={commit}
			aria-invalid={!!errors.corporateTaxRate}
		/>
		{#if errors.corporateTaxRate}<span class="error">{errors.corporateTaxRate}</span>{/if}
	</label>
</fieldset>

<style>
	fieldset {
		display: grid;
		gap: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 1rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
	}
	.error {
		color: #b00020;
		font-size: 0.85rem;
	}
</style>
