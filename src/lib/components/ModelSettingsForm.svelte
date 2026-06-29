<script lang="ts">
	/**
	 * ModelSettingsForm — edit the active quote's model settings (FR2).
	 * Documented defaults are pre-populated by createQuote (FR3); overrides persist on this
	 * quote only. Each field validates against ModelSettingsSchema with field-level errors
	 * (AR4); valid changes commit immutably to the active quote store (AR12).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { ModelSettingsSchema, fieldErrors, toNumberOrNaN, type ModelSettings } from '$lib/domain';

	const settings = quoteStore.current?.modelSettings;

	// One string field per setting (raw input). Empty -> NaN so it fails validation.
	let retirementAge = $state(settings ? String(settings.retirementAge) : '');
	let assumedDeathBenefitAge = $state(settings ? String(settings.assumedDeathBenefitAge) : '');
	let benefitWaitingPeriod = $state(settings ? String(settings.benefitWaitingPeriod) : '');
	let salaryGrowthRate = $state(settings ? String(settings.salaryGrowthRate) : '');
	let npvDiscountRate = $state(settings ? String(settings.npvDiscountRate) : '');
	let fasAveragingPeriod = $state(settings ? String(settings.fasAveragingPeriod) : '');

	const num = toNumberOrNaN;

	const candidate = $derived<ModelSettings>({
		retirementAge: num(retirementAge),
		assumedDeathBenefitAge: num(assumedDeathBenefitAge),
		benefitWaitingPeriod: num(benefitWaitingPeriod),
		salaryGrowthRate: num(salaryGrowthRate),
		npvDiscountRate: num(npvDiscountRate),
		fasAveragingPeriod: num(fasAveragingPeriod)
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
			key: 'retirementAge',
			label: 'Retirement age',
			value: () => retirementAge,
			set: (v) => (retirementAge = v),
			step: '1'
		},
		{
			key: 'assumedDeathBenefitAge',
			label: 'Assumed death-benefit age',
			value: () => assumedDeathBenefitAge,
			set: (v) => (assumedDeathBenefitAge = v),
			step: '1'
		},
		{
			key: 'benefitWaitingPeriod',
			label: 'Benefit waiting period (years)',
			value: () => benefitWaitingPeriod,
			set: (v) => (benefitWaitingPeriod = v),
			step: '1'
		},
		{
			key: 'salaryGrowthRate',
			label: 'Salary growth rate',
			value: () => salaryGrowthRate,
			set: (v) => (salaryGrowthRate = v),
			step: '0.01'
		},
		{
			key: 'npvDiscountRate',
			label: 'NPV discount rate (0–1)',
			value: () => npvDiscountRate,
			set: (v) => (npvDiscountRate = v),
			step: '0.01'
		},
		{
			key: 'fasAveragingPeriod',
			label: 'FAS averaging period (years)',
			value: () => fasAveragingPeriod,
			set: (v) => (fasAveragingPeriod = v),
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
