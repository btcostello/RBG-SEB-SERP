/**
 * Row/column shapes for {@link LegacyAccountingSheet}. They live outside the component because
 * a Svelte 5 runes-mode instance script cannot export types — `export` there declares a prop.
 */

export interface SheetColumn {
	label: string;
	/** Optional group header spanning consecutive columns that share it (e.g. a period). */
	group?: string;
	/** Second line of the group header (e.g. the period's date range). */
	groupSub?: string;
}

export interface SheetRow {
	label: string;
	/** Sub-label rendered under the main one (the source's "To record …" lines). */
	note?: string;
	indent?: boolean;
	strong?: boolean;
	/** A heading row that spans the table (e.g. "Initial Entries"). */
	heading?: boolean;
}
