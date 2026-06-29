/**
 * Domain layer barrel — shared types + Valibot schemas (client-safe).
 *
 * The Valibot schema is the single source of truth for every validated shape; types are
 * derived via `v.InferOutput` and re-exported here. No `snake_case`, no money-as-number.
 */
export * from './value-objects';
export * from './validate';
export * from './risk-class';
export * from './company';
export * from './model-settings';
export * from './insured';
export * from './results';
export * from './quote';
