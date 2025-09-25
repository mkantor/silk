/**
 * Children & attribute values where `value[trusted] === true` are considered
 * safe to emit without escaping.
 */
export const trusted = Symbol('trusted')
export type PossiblyTrusted = { [trusted]?: true }
export type Trusted = { readonly [trusted]: true }
