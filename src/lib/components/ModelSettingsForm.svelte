<script lang="ts">
	/**
	 * ModelSettingsForm — edit the active quote's plan-level model settings (FR2).
	 *
	 * Timing and salary assumptions are now per-participant (edited in the census grid). What
	 * remains plan-level is the NPV discount rate. Documented defaults are pre-populated by
	 * createQuote (FR3); the override persists on this quote only. Validates against
	 * ModelSettingsSchema with field-level errors (AR4) and commits immutably (AR12).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import {
		ModelSettingsSchema,
		MORTALITY_TABLES,
		PRODUCT_TYPES,
		fieldErrors,
		toNumberOrNaN,
		type ModelSettings,
		type MortalityTable,
		type ProductType
	} from '$lib/domain';

	const settings = quoteStore.current?.modelSettings;

	// One string field per numeric setting (raw input). Empty -> NaN so it fails validation.
	let npvDiscountRate = $state(settings ? String(settings.npvDiscountRate) : '');
	let creditingRate = $state(settings ? String(settings.creditingRate) : '');
	let mortalityTable = $state<MortalityTable>(settings?.mortalityTable ?? 'RP-2012U');
	// Absent means the engine's own default (VUL), so an existing quote saved before this field
	// existed keeps behaving as it did until the operator picks one.
	let productType = $state<ProductType>(settings?.productType ?? 'IUL');
	let effectiveDate = $state(settings?.effectiveDate ?? '');
	let premiumYears = $state(settings?.premiumYears != null ? String(settings.premiumYears) : '');

	const num = toNumberOrNaN;

	const candidate = $derived<ModelSettings>({
		npvDiscountRate: num(npvDiscountRate),
		creditingRate: num(creditingRate),
		mortalityTable,
		productType,
		// Optional: an empty picker means "not set" (undefined), which is valid.
		effectiveDate: effectiveDate || undefined,
		premiumYears: premiumYears.trim() === '' ? undefined : num(premiumYears)
	});
	const errors = $derived(fieldErrors(ModelSettingsSchema, candidate));

	function commit() {
		if (Object.keys(errors).length === 0) {
			quoteStore.updateModelSettings(candidate);
		}
	}

	const fields: {
		key: keyof ModelSettings;
		label: string;
		value: () => string;
		set: (v: string) => void;
		step: string;
	}[] = [
		{
			key: 'npvDiscountRate',
			label: 'NPV discount rate (0–1)',
			value: () => npvDiscountRate,
			set: (v) => (npvDiscountRate = v),
			step: '0.01'
		},
		{
			key: 'creditingRate',
			label: 'Crediting rate (0–1)',
			value: () => creditingRate,
			set: (v) => (creditingRate = v),
			step: '0.0001'
		},
		{
			key: 'premiumYears',
			label: 'Number of premium years',
			value: () => premiumYears,
			set: (v) => (premiumYears = v),
			step: '1'
		}
	];
</script>

<fieldset>
	<legend>Model settings</legend>

	{#each fields as field (field.key)}
		<label>
			<span>{field.label}</span>
			<input
				type="number"
				step={field.step}
				value={field.value()}
				oninput={(e) => {
					field.set(e.currentTarget.value);
					commit();
				}}
				aria-invalid={!!errors[field.key]}
			/>
			{#if errors[field.key]}<span class="error">{errors[field.key]}</span>{/if}
		</label>
	{/each}

	<label>
		<span>Plan effective date</span>
		<input
			type="date"
			value={effectiveDate}
			oninput={(e) => {
				effectiveDate = e.currentTarget.value;
				commit();
			}}
			aria-invalid={!!errors.effectiveDate}
		/>
		{#if errors.effectiveDate}<span class="error">{errors.effectiveDate}</span>{/if}
	</label>

	<label>
		<span>COLI product type</span>
		<select bind:value={productType} onchange={commit} aria-invalid={!!errors.productType}>
			{#each PRODUCT_TYPES as type (type)}<option value={type}>{type}</option>{/each}
		</select>
		{#if errors.productType}<span class="error">{errors.productType}</span>{/if}
	</label>

	<label>
		<span>Mortality table</span>
		<select bind:value={mortalityTable} onchange={commit} aria-invalid={!!errors.mortalityTable}>
			{#each MORTALITY_TABLES as table (table)}<option value={table}>{table}</option>{/each}
		</select>
		{#if errors.mortalityTable}<span class="error">{errors.mortalityTable}</span>{/if}
	</label>
</fieldset>

<style>
	fieldset {
		display: grid;
		gap: 0.85rem;
		border: 1px solid var(--line);
		border-radius: 2px;
		background: var(--paper);
		padding: 0.5rem 1.1rem 1.1rem;
		margin: 0;
	}
	legend {
		font-family: var(--sans);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		padding: 0 0.4rem;
	}
	label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--ink-soft);
	}
	input,
	select {
		width: 100%;
		max-width: 20rem;
	}
	input[type='number'],
	input[type='date'] {
		max-width: 11rem;
	}
	.error {
		color: var(--warn-tx);
		font-size: 0.8rem;
	}
</style>
