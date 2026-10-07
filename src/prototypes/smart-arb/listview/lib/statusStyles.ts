import type { StatusStyle } from './types';

/**
 * Canonical status badge styles — source of truth is /m2-template/tab1.
 * Import `S` in any config that defines a statusMap; never write raw hex values.
 *
 * success  — positive / enabled / paid / won
 * warning  — needs attention / pending / past due / free trial
 * critical — failed / lost / destructive outcome
 * default  — neutral / inactive / closed / archived / off
 * info     — informational / in-progress / open (blue)
 */
export const S: Record<string, StatusStyle> = {
  success:  { background: '#eafcdd', color: '#217005', outline: '1px solid #a8f170' },
  warning:  { background: '#fdf8c9', color: '#b13600', outline: '1px solid #fbd992' },
  critical: { background: '#fef4f6', color: '#c0123c', outline: '1px solid #fbd3dc' },
  default:  { background: 'var(--neutral-25)', color: 'var(--neutral-600)', outline: '1px solid var(--neutral-100)' },
  info:     { background: '#E2FBFE', color: '#045AD0', outline: '1px solid #A7E7FC' },
};
