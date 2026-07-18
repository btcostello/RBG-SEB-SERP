import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageQuoteRepository, type KeyValueStorage } from './local-storage-repository';
import { createQuote, type Quote } from '$lib/domain';
import { makeInsured } from '$lib/testing/fixtures';

/** In-memory KeyValueStorage fake so the repository is tested without a DOM. */
class MemoryStorage implements KeyValueStorage {
	private map = new Map<string, string>();
	get length(): number {
		return this.map.size;
	}
	key(index: number): string | null {
		return Array.from(this.map.keys())[index] ?? null;
	}
	getItem(key: string): string | null {
		return this.map.has(key) ? (this.map.get(key) as string) : null;
	}
	setItem(key: string, value: string): void {
		this.map.set(key, value);
	}
	removeItem(key: string): void {
		this.map.delete(key);
	}
}

function makeQuote(id: string, companyName: string): Quote {
	const quote = createQuote({ id, companyName, corporateTaxRate: 0.21 });
	// trailing zeros on the salary must survive the round-trip (AR18)
	quote.census = [makeInsured({ dateOfBirth: '1970-06-15', currentSalary: '162240.00' })];
	return quote;
}

describe('LocalStorageQuoteRepository', () => {
	let repo: LocalStorageQuoteRepository;

	beforeEach(() => {
		repo = new LocalStorageQuoteRepository(new MemoryStorage());
	});

	it('saves and reopens a quote identically, money round-tripping exactly (FR33, NFR11, AR18)', async () => {
		const quote = makeQuote('q1', 'Acme');
		await repo.save(quote);
		const reopened = await repo.get('q1');
		// Deep equality proves every input — including the "162240.00" salary string — is intact.
		expect(reopened).toEqual(quote);
		expect(reopened?.census[0].currentSalary).toBe('162240.00');
	});

	it('returns null for an unknown id', async () => {
		expect(await repo.get('missing')).toBeNull();
	});

	it('lists saved quotes as summaries, sorted by company (FR34)', async () => {
		await repo.save(makeQuote('q1', 'Zenith'));
		await repo.save(makeQuote('q2', 'Acme'));
		const list = await repo.list();
		expect(list).toEqual([
			{ id: 'q2', companyName: 'Acme' },
			{ id: 'q1', companyName: 'Zenith' }
		]);
	});

	it('overwrites a quote saved under the same id', async () => {
		await repo.save(makeQuote('q1', 'Acme'));
		const updated = makeQuote('q1', 'Acme Renamed');
		await repo.save(updated);
		const list = await repo.list();
		expect(list).toHaveLength(1);
		expect(list[0].companyName).toBe('Acme Renamed');
	});

	it('deletes a quote from storage and the list (FR35)', async () => {
		await repo.save(makeQuote('q1', 'Acme'));
		await repo.save(makeQuote('q2', 'Beta'));
		await repo.delete('q1');
		expect(await repo.get('q1')).toBeNull();
		const list = await repo.list();
		expect(list.map((s) => s.id)).toEqual(['q2']);
	});

	it('ignores non-namespaced and corrupt storage entries when listing', async () => {
		const storage = new MemoryStorage();
		storage.setItem('unrelated-key', 'not a quote');
		storage.setItem('schiff-serp:quote:bad', '{ not valid json');
		const r = new LocalStorageQuoteRepository(storage);
		await r.save(makeQuote('q1', 'Acme'));
		const list = await r.list();
		expect(list).toEqual([{ id: 'q1', companyName: 'Acme' }]);
	});
});
