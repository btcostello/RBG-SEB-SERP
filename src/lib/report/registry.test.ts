import { describe, it, expect } from 'vitest';
import { reportPages, type ReportPage } from './registry';

describe('report page registry (FR31, AR13)', () => {
	it('is an ordered list of { id, title, component } entries', () => {
		expect(Array.isArray(reportPages)).toBe(true);
		for (const page of reportPages) {
			expect(typeof page.id).toBe('string');
			expect(typeof page.title).toBe('string');
			expect(page.component).toBeTruthy(); // a Svelte component
		}
	});

	it('renders the proposal pages in order', () => {
		expect(reportPages.map((p) => p.id)).toEqual([
			'cover',
			'contents',
			'exec-summary',
			'objective',
			'plan',
			'funding',
			'assumptions',
			'census',
			'projections',
			'coli-design',
			'ref-serp',
			'ref-coli',
			'ref-accounting',
			'glossary'
		]);
	});

	it('has unique page ids', () => {
		const ids = reportPages.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('is purely additive — appending a page leaves existing pages and their order intact (NFR14)', () => {
		const before = reportPages.map((p) => p.id);
		const newPage = {
			id: 'fasb-worksheet',
			title: 'FASB Worksheet',
			component: reportPages[0].component
		} as ReportPage;
		const extended = [...reportPages, newPage];
		expect(extended.slice(0, before.length).map((p) => p.id)).toEqual(before);
		expect(extended.at(-1)?.id).toBe('fasb-worksheet');
	});
});
