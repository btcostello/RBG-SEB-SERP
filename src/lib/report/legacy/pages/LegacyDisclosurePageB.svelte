<script lang="ts">
	/** Legacy Report — A4 Disclosure, page 2 of 2 (paragraphs 6–8). Source: "A4 Disclosure.pdf". */
	import type { ReportModel } from '../../report-data';
	import DisclosureSheet from './DisclosureSheet.svelte';
	import { DISCLOSURE_PARAGRAPHS, DISCLOSURE_SPLIT } from './disclosure-text';

	let { report }: { report: ReportModel } = $props();
	const paragraphs = DISCLOSURE_PARAGRAPHS.slice(DISCLOSURE_SPLIT);
</script>

<DisclosureSheet {report} heading="Disclosure (continued)" {paragraphs} />
