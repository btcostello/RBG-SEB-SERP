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
	/**
	 * Numeric cell values, one per column. When present, cells render these (with a "gap" style for
	 * any that are still null); when absent, the whole row renders the "—" placeholder. Lets a wired
	 * sheet (e.g. the 6.5 audit trail) supply data while unbuilt sheets stay placeholders.
	 */
	values?: (string | null)[];
}
