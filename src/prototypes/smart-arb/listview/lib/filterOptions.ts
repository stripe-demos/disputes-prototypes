import type { FilterDef } from './types';

export const FILTER_DATE_OPS = ['is in the last', 'is equal to', 'is before', 'is after', 'is between'];
export const FILTER_DATE_UNITS = ['days', 'weeks', 'months', 'years'];
export const FILTER_TIMEZONES = ['GMT-8', 'UTC'] as const;
export type FilterTimezone = (typeof FILTER_TIMEZONES)[number];
export const FILTER_VALUE_OPS = ['is equal to', 'is not equal to', 'is greater than', 'is less than', 'contains', 'does not contain'];

/** Filter menu rows: applied filters first, then the rest, narrowed by the search query. */
export function orderFilterDefs(defs: FilterDef[], appliedLabels: Set<string>, query: string): FilterDef[] {
  const q = query.trim().toLowerCase();
  return [
    ...defs.filter(f => appliedLabels.has(f.label)),
    ...defs.filter(f => !appliedLabels.has(f.label)),
  ].filter(f => !q || f.label.toLowerCase().includes(q));
}
