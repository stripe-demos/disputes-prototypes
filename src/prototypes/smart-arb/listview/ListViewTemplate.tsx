'use client';

import './listview-engine.css';
import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, memo, startTransition, Fragment } from 'react';
import { flushSync, createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { usePrototype } from './contexts/PrototypeContext';
import type { PageConfig, ColumnDef, TabConfig, FilterDef, PageAction } from './lib/types';
import { COLUMN_SIZE_PX } from './lib/types';
import { MobileList, MobilePageActions, useIsMobile } from './mobile/MobileListView';
import { MobileViewsMenu, type EditableView } from './mobile/MobileViewsMenu';
import { MobileFilterSheet } from './mobile/MobileFilterSheet';
import { STACKED_LAYER_ATTR } from './mobile/MobilePopover';
import { sheetHeightBelow } from './mobile/BottomSheet';
import { FILTER_DATE_OPS, FILTER_DATE_UNITS, FILTER_TIMEZONES, FILTER_VALUE_OPS, orderFilterDefs } from './lib/filterOptions';
import { groupMenuItems, menuRowTone } from './lib/menuGroups';
import { CardIcon } from '../../../icons/SailCardIcons';

// Default transition for all animations
const DEFAULT_TRANSITION = 'all 250ms cubic-bezier(0.2, 0, 0.1, 1)';

/** Maximum auto-measured width for Fit columns before they clip. */
const FIT_MAX_WIDTH = 280;

/**
 * Resolves a column's default pixel width.
 * Returns 0 for Fit columns — a sentinel meaning "auto-size to content".
 * Fit is the default for any column without an explicit defaultWidth or non-Fit defaultSize.
 * Once the user drags to resize a Fit column it becomes a normal fixed-pixel width.
 */
const colDefaultWidth = (c: ColumnDef): number => {
  if (c.defaultWidth != null) return c.defaultWidth;
  if (c.defaultSize && c.defaultSize !== 'Fit') return COLUMN_SIZE_PX[c.defaultSize];
  return 0; // Fit (auto-size to content, capped at FIT_MAX_WIDTH)
};

/** Case-insensitive substring search — the expected behaviour for a data table searchbox. */
const substringMatch = (text: string, query: string): boolean =>
  text.toLowerCase().includes(query.toLowerCase());

function highlightSearchText(value: unknown, query: string): React.ReactNode {
  const text = String(value ?? '');
  const term = query.trim();
  if (term.length < 3) return text;

  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = lowerText.indexOf(lowerTerm);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) parts.push(text.slice(cursor, matchIndex));
    parts.push(
      <mark key={`${matchIndex}-${cursor}`} style={{ background: '#FCEEB5', color: 'inherit', padding: 0 }}>
        {text.slice(matchIndex, matchIndex + term.length)}
      </mark>,
    );
    cursor = matchIndex + term.length;
    matchIndex = lowerText.indexOf(lowerTerm, cursor);
  }

  if (parts.length === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

const WRAP_CELL_MAX_LINES = 5;

/** Single-line ellipsis or multi-line wrap clamped to five lines. */
const cellTextStyle = (wrapCells: boolean): React.CSSProperties =>
  wrapCells
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: WRAP_CELL_MAX_LINES,
        overflow: 'hidden',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }
    : {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };

const DOT_SCALE_DOT_CENTERS = [4, 18, 32, 46, 60] as const;
const DOT_SCALE_DASH_SEGMENTS: [number, number][] = [[0, 8], [14, 22], [28, 36], [42, 50], [56, 64]];

const APP_ICON_DROP_SHADOW =
  'drop-shadow(0px 2px 5px rgba(48, 49, 61, 0.08)) drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.12))';

const APP_ICON_CONTAINER_STYLE: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  background: '#FFFFFF',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  filter: APP_ICON_DROP_SHADOW,
};

function getAppIconSrc(colId: string, colDef: ColumnDef | undefined, row: Record<string, unknown>): string {
  const imageKey = colDef?.dataKeys?.['image'] ?? `${colId}-image`;
  return String(row[imageKey] ?? colDef?.iconSrc ?? '/m2/icons/product16.svg');
}

function isDotScaleDashValue(val: unknown): boolean {
  const s = String(val).trim();
  return s === '—' || s === '–' || s === '-';
}

function parseDotScaleFilledCount(val: unknown): number | null {
  if (isDotScaleDashValue(val)) return null;
  const n = parseInt(String(val).trim().replace(/%/g, ''), 10);
  if (Number.isNaN(n)) return null;
  return Math.round((Math.max(0, Math.min(100, n)) / 100) * DOT_SCALE_DOT_CENTERS.length);
}

function DotScaleCell({ value, style }: { value: unknown; style?: React.CSSProperties }) {
  const filledCount = parseDotScaleFilledCount(value);
  const populated = filledCount !== null;
  return (
    <div
      style={{ width: 64, height: 8, flexShrink: 0, ...style }}
      role="img"
      aria-label={populated ? String(value) : 'No data'}
    >
      <svg width="64" height="8" viewBox="0 0 64 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        {populated ? (
          DOT_SCALE_DOT_CENTERS.map((cx, i) =>
            i < filledCount! ? (
              <circle key={i} cx={cx} cy={4} r={4} fill="#533AFD" />
            ) : (
              <circle key={i} cx={cx} cy={4} r={3.5} stroke="#C0CAD8" />
            ),
          )
        ) : (
          DOT_SCALE_DASH_SEGMENTS.map(([x1, x2], i) => (
            <path key={i} d={`M${x1} 4H${x2}`} stroke="#F1F6FC" />
          ))
        )}
      </svg>
    </div>
  );
}

/**
 * Resolves the actual data-row keys that should be searched for a given column.
 * Columns with custom `dataKeys` (e.g. `subtext`) store content under different
 * keys from the column ID, so we must look those up explicitly.
 */
function getSearchKeys(col: { id: string; type: string; dataKeys?: Record<string, string> }): string[] {
  switch (col.type) {
    case 'subtext': {
      const main = col.dataKeys?.['amount'] ?? `${col.id}-amt`;
      const sub  = col.dataKeys?.['sub']    ?? `${col.id}-sub`;
      return [main, sub];
    }
    case 'currency':
      return [col.dataKeys?.['value'] ?? col.id];
    default:
      return [col.id];
  }
}

/** Measures the minimum column width needed to fully show the header label. */
const getColMinWidth = (colId: string, colLabels: Record<string, string>): number => {
  const text = colLabels[colId] ?? colId;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 60;
  ctx.font = '600 12px "SF Pro Text", system-ui, -apple-system, sans-serif';
  const textWidth = ctx.measureText(text).width;
  return Math.ceil(textWidth) + 32; // 16px padding on each side
};

interface ViewChip {
  id: string;
  label: string;
  count?: string;
  selected: boolean;
}

interface FilterChip {
  id: string;
  filterName: string;
  /** Defaults to 'multi-select' when reading old localStorage data */
  filterType?: 'date' | 'single-select' | 'multi-select' | 'value';
  selectedValues: string[];
  // date-specific
  dateOp?: string;
  dateVal?: string;
  dateUnit?: string;
  dateTz?: string;
  // value-specific
  valueOp?: string;
  valueInput?: string;
}

// ─── Filter helpers ──────────────────────────────────────────────────────────

function dateUnitToMs(n: number, unit: string): number {
  switch (unit) {
    case 'days':   return n * 86_400_000;
    case 'weeks':  return n * 7 * 86_400_000;
    case 'months': return n * 30 * 86_400_000;
    case 'years':  return n * 365 * 86_400_000;
    default:       return 0;
  }
}

/** Middle-truncated ID for the page-header copy chip (matches List Views Figma). */
function truncateMiddleId(s: string, headChars = 14, tailChars = 5): string {
  if (s.length <= headChars + tailChars + 3) return s;
  return `${s.slice(0, headChars)}...${s.slice(-tailChars)}`;
}

function PageHeaderCopyIdField({ fullId }: { fullId: string }) {
  const [phase, setPhase] = useState<'idle' | 'copied'>('idle');
  const [hover, setHover] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTipPos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullId).catch(() => {});
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('copied');
    timerRef.current = setTimeout(() => setPhase('idle'), 1500);
    updateTipPos();
  };

  const showTooltip = hover;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={fullId}
        onClick={handleCopy}
        onMouseEnter={() => {
          setHover(true);
          updateTipPos();
        }}
        onMouseMove={updateTipPos}
        onMouseLeave={() => setHover(false)}
        className="flex cursor-pointer items-center gap-[8px] rounded-[6px] border border-solid px-[8px] py-[4px]"
        style={{
          background: 'var(--neutral-25)',
          borderColor: hover ? 'var(--neutral-100)' : 'var(--neutral-50)',
          maxWidth: 'min(280px, 38vw)',
          flexShrink: 1,
          minWidth: 0,
          transition: 'border-color 100ms cubic-bezier(0.2, 0, 0.1, 1)',
        }}
      >
        <span
          className="min-w-0 truncate text-[14px] leading-5 tracking-[-0.15px]"
          style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', color: 'var(--neutral-600)', fontWeight: 400 }}
        >
          {truncateMiddleId(fullId)}
        </span>
        <div style={{ position: 'relative', width: '12px', height: '12px', flexShrink: 0 }}>
          <AnimatePresence mode="sync" initial={false}>
            {phase === 'copied' ? (
              <motion.span
                key="check"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M11.6021 1.67472C11.8681 1.92097 11.884 2.33617 11.6378 2.60211L4.60654 10.1959C4.47921 10.3334 4.29916 10.4099 4.11178 10.4061C3.9244 10.4023 3.74757 10.3186 3.62589 10.1761L0.344642 6.33233C0.109325 6.05667 0.142027 5.64245 0.417684 5.40713C0.693341 5.17182 1.10757 5.20452 1.34288 5.48017L4.14493 8.76258L10.6747 1.71039C10.921 1.44445 11.3362 1.42848 11.6021 1.67472Z" style={{ fill: 'var(--neutral-700)' }} />
                </svg>
              </motion.span>
            ) : (
              <motion.span
                key="clipboard"
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img src="/m2/icons/clipboard12.svg" alt="" style={{ width: '12px', height: '12px', display: 'block', flexShrink: 0 }} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </button>
      {typeof document !== 'undefined' && showTooltip && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltipPos.y,
          left: tooltipPos.x,
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
        >
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0.1, 1] }}
            style={{
              background: 'var(--neutral-700)',
              borderRadius: '4px',
              padding: '4px 8px',
              whiteSpace: 'nowrap',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              fontSize: '14px',
              lineHeight: '20px',
              letterSpacing: '-0.15px',
              color: 'white',
              boxShadow: '0px 2px 5px 0px rgba(64,68,82,0.08), 0px 3px 9px 0px rgba(64,68,82,0.08)',
            }}
          >
            {phase === 'copied' ? 'Copied' : 'Copy to clipboard'}
          </motion.div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Parses amounts like "$1,200.00", "€18,340.00" or 42; returns NaN for non-numeric text such as IDs or "–". */
function parseFilterNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[$€£¥,\s]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/**
 * Applies an array of FilterChips to a set of rows.
 * Rows must include machine-readable companion fields:
 *   - `<filterId>-ts`  (Unix ms timestamp) for date filters
 *   - `<filterId>-raw` (number)            for value filters
 * If a companion field is absent, that filter passes the row through unchanged.
 */
function applyFilterChips(
  rows: { row: Record<string, unknown>; originalIndex: number }[],
  chips: FilterChip[],
): { row: Record<string, unknown>; originalIndex: number }[] {
  if (chips.length === 0) return rows;
  return rows.filter(({ row }) =>
    chips.every(fc => {
      const type = fc.filterType ?? 'multi-select';

      if (type === 'multi-select' || type === 'single-select') {
        const val = String(row[fc.id] ?? '');
        return fc.selectedValues.includes(val);
      }

      if (type === 'date') {
        const ts = row[`${fc.id}-ts`] as number | undefined;
        if (ts == null || !fc.dateVal?.trim()) return true;
        const n = parseInt(fc.dateVal, 10);
        if (isNaN(n) || n <= 0) return true;
        const offset = dateUnitToMs(n, fc.dateUnit ?? 'days');
        const now = Date.now();
        const threshold = now - offset;
        switch (fc.dateOp) {
          case 'is in the last': return ts >= threshold;
          case 'is before':      return ts < threshold;
          case 'is after':       return ts > threshold;
          case 'is equal to': {
            // "exactly N units ago" — match within one day window
            return ts >= threshold && ts < threshold + 86_400_000;
          }
          default: return true;
        }
      }

      if (type === 'value') {
        const input = fc.valueInput?.trim();
        if (!input) return true;
        const rawKey = `${fc.id}-raw`;
        if (!(fc.id in row) && !(rawKey in row)) return true;
        const text = String(row[fc.id] ?? '').toLowerCase();
        const needle = input.toLowerCase();
        // Prefer the raw numeric companion field; fall back to parsing the display string
        const rowVal = row[rawKey] != null ? Number(row[rawKey]) : parseFilterNumber(row[fc.id]);
        const inputVal = parseFilterNumber(input);
        const numeric = !isNaN(rowVal) && !isNaN(inputVal);
        switch (fc.valueOp ?? 'is equal to') {
          case 'is equal to':      return numeric ? rowVal === inputVal : text === needle;
          case 'is not equal to':  return numeric ? rowVal !== inputVal : text !== needle;
          case 'is greater than':  return isNaN(inputVal) || rowVal > inputVal;
          case 'is less than':     return isNaN(inputVal) || rowVal < inputVal;
          case 'contains':         return text.includes(needle);
          case 'does not contain': return !text.includes(needle);
          default: return true;
        }
      }

      return true;
    }),
  );
}

/** Returns the human-readable value portion of a filter chip label */
function filterChipValue(chip: FilterChip): string {
  const type = chip.filterType ?? 'multi-select';
  if (type === 'date') {
    return [chip.dateOp, chip.dateVal, chip.dateUnit].filter(Boolean).join(' ');
  }
  if (type === 'value') {
    return [chip.valueOp, chip.valueInput].filter(Boolean).join(' ');
  }
  if (chip.selectedValues.length > 2) {
    return `${chip.selectedValues.length} selected`;
  }
  return chip.selectedValues.join(', ');
}

// ─── Fallback defaults (used when config doesn't override) ───────────────────
const DEFAULT_VIEW_CHIPS: ViewChip[] = [
  { id: '1', label: 'All',            selected: true  },
  { id: '2', label: 'Pre-defined view 1', selected: false },
  { id: '3', label: 'Pre-defined view 2', selected: false },
  { id: '4', label: 'Pre-defined view 3', selected: false },
];
const DEFAULT_PINNED_IDS = ['1', '2', '3', '4'];

function lsGet<T>(key: string): T | null {
  try { const v = typeof window !== 'undefined' ? localStorage.getItem(key) : null; return v ? JSON.parse(v) : null; } catch { return null; }
}
/** Guarantee the 'all' chip is always at index 0, regardless of saved order. */
function ensureAllFirst(chips: ViewChip[]): ViewChip[] {
  const allChip = chips.find(c => c.id === 'all');
  if (!allChip) return chips;
  return [allChip, ...chips.filter(c => c.id !== 'all')];
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / SSR */ }
}

// ─── Memoised table row ────────────────────────────────────────────────────────
// Defined outside ListViewTemplate so React.memo works correctly — the component
// identity is stable across re-renders of the parent.

type TableRowData = Record<string, unknown>;

const DEFAULT_STATUS_STYLE: React.CSSProperties = {
  background: 'var(--neutral-25)', color: 'var(--neutral-600)', outline: '1px solid var(--neutral-100)',
};

// Measure text width using an offscreen canvas (font must match cell typography)
let _measureCtx: CanvasRenderingContext2D | null = null;
function measureText(text: string, font: string): number {
  if (typeof document === 'undefined') return 0;
  if (!_measureCtx) {
    const canvas = document.createElement('canvas');
    _measureCtx = canvas.getContext('2d');
  }
  if (!_measureCtx) return 0;
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}

const AGG_LIST_FONT = '14px "SF Pro Text", system-ui, -apple-system, sans-serif';
const AGG_BADGE_FONT = '12px "SF Pro Text", system-ui, -apple-system, sans-serif';
const AGG_LIST_SEP = ', ';
const AGG_LIST_SEP_COLOR = 'var(--neutral-600)';
const AGG_BADGE_BEFORE_SEP = ', ';

function renderAggListItems(items: string[]): React.ReactNode {
  return items.map((item, i) => (
    <Fragment key={`${i}-${item}`}>
      {i > 0 && <span style={{ color: AGG_LIST_SEP_COLOR }}>{AGG_LIST_SEP}</span>}
      {item}
    </Fragment>
  ));
}

// Given all agg items and available pixel width, return [visibleItems, hiddenCount]
function computeAggVisible(items: string[], availableWidth: number): [string[], number] {
  const FONT = AGG_LIST_FONT;
  const GAP = 4;       // gap between text and badge
  const BADGE_PADDING = 12; // 6px left + 6px right
  const sepW = measureText(AGG_LIST_SEP, FONT);

  // Estimate badge width for "+N" (N = number of hidden items)
  const badgeWidth = (n: number) => measureText(`+${n}`, FONT) + BADGE_PADDING + 2; // +2 for border

  let usedWidth = 0;
  let visible: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemW = measureText(items[i], FONT);
    const remaining = items.length - i - 1;
    // If this is not the last item, we might still need a badge after it
    const badgeW = remaining > 0 ? GAP + badgeWidth(remaining) : 0;
    const separatorW = i > 0 ? sepW : 0;
    const needed = separatorW + itemW + badgeW;

    if (usedWidth + needed <= availableWidth) {
      usedWidth += separatorW + itemW;
      visible.push(items[i]);
    } else {
      // Can't fit this item — back up and check if the badge fits for the remaining + this item
      const hiddenCount = items.length - i;
      // If we have at least one visible item, show badge
      if (visible.length > 0) {
        return [visible, hiddenCount];
      }
      // Nothing fit yet (first label + reserved "+N" width often overflows narrow columns).
      // Never show only "+N" with zero visible labels: always keep at least this item; the cell
      // truncates with ellipsis and the badge counts the rest (or +0 for one oversize label).
      const rest = items.length - i - 1;
      return [[items[i]], Math.max(0, rest)];
    }
  }

  return [visible, 0];
}

function aggBadgeWidth(hiddenCount: number): number {
  return measureText(`+${hiddenCount}`, AGG_BADGE_FONT) + 12 + 2; // padding + border allowance
}

function aggItemTokens(items: string[]): { width: number }[] {
  const tokens: { width: number }[] = [];
  items.forEach((item, i) => {
    if (i > 0) tokens.push({ width: measureText(AGG_LIST_SEP, AGG_LIST_FONT) });
    tokens.push({ width: measureText(item, AGG_LIST_FONT) });
  });
  return tokens;
}

function countTokenLines(tokens: { width: number }[], maxWidth: number): number {
  if (tokens.length === 0) return 0;
  if (maxWidth <= 0) return 1;
  let lines = 1;
  let lineW = 0;
  for (const { width } of tokens) {
    if (lineW > 0 && lineW + width > maxWidth) {
      lines++;
      lineW = width;
    } else {
      lineW += width;
    }
  }
  return lines;
}

// Multi-line agg list: fit items within maxLines, reserving inline ", +N" badge width.
function computeAggVisibleWrapped(
  items: string[],
  availableWidth: number,
  maxLines = WRAP_CELL_MAX_LINES,
): [string[], number] {
  if (items.length === 0) return [[], 0];

  if (countTokenLines(aggItemTokens(items), availableWidth) <= maxLines) {
    return [items, 0];
  }

  for (let visibleCount = items.length - 1; visibleCount >= 1; visibleCount--) {
    const hiddenCount = items.length - visibleCount;
    const tokens = [
      ...aggItemTokens(items.slice(0, visibleCount)),
      { width: measureText(AGG_BADGE_BEFORE_SEP, AGG_LIST_FONT) },
      { width: aggBadgeWidth(hiddenCount) },
    ];
    if (countTokenLines(tokens, availableWidth) <= maxLines) {
      return [items.slice(0, visibleCount), hiddenCount];
    }
  }

  const hiddenCount = items.length - 1;
  const singleTokens = [
    ...aggItemTokens([items[0]]),
    { width: measureText(AGG_BADGE_BEFORE_SEP, AGG_LIST_FONT) },
    { width: aggBadgeWidth(hiddenCount) },
  ];
  if (countTokenLines(singleTokens, availableWidth) <= maxLines) {
    return [[items[0]], hiddenCount];
  }

  return [[items[0]], items.length - 1];
}

interface TableRowProps {
  row: TableRowData;
  originalIndex: number;
  isSelected: boolean;
  prevSelected: boolean;
  nextSelected: boolean;
  isLastRow: boolean;
  isZebra: boolean;
  isSkeletonLoading: boolean;
  dragColId: string | null;
  columnOrder: string[];
  visibleColumns: Set<string>;
  wrapCells: boolean;
  onToggleSelect: (i: number) => void;
  hasSelectionRef: React.RefObject<boolean>;
  onRowClick: (e: React.MouseEvent, i: number) => void;
  onRowOpen?: (row: TableRowData) => void;
  frozenColumns: Set<string>;
  columnWidths: Record<string, number>;
  columnDragStyle: 'ui' | 'glass';
  columnDefs: ColumnDef[];
  rowActions: { label: string; color: string }[];
  bulkSelectCheckboxes: boolean;
  searchQuery: string;
}

function MoreMenuItem({ label, color, onClose }: { label: string; color: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="menu-hover-row"
      data-tone={menuRowTone(color)}
      style={{
        ['--menu-row-radius' as string]: '6px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '14px',
        lineHeight: '20px',
        letterSpacing: '-0.15px',
        color,
        transition: 'background 100ms',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}

/**
 * Renders a list of menu items, automatically splitting them into groups when an
 * item carries a `group` field. The first group has no divider; subsequent groups
 * get a top-border separator + label row — matching the view-management popover style.
 */
function renderMoreMenuItems(
  items: Array<{ label: string; color: string; group?: string }>,
  onClose: () => void,
) {
  const sections = groupMenuItems(items);

  return (
    <>
      {sections.map((section, sIdx) => (
        <div
          key={sIdx}
          style={sIdx > 0 ? { borderTop: '1px solid #D8DEE4', marginTop: '4px', paddingTop: '4px' } : undefined}
        >
          {section.label && (
            <div style={{
              padding: '6px 10px',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: '20px',
              color: 'var(--neutral-800)',
              userSelect: 'none',
            }}>
              {section.label}
            </div>
          )}
          {section.items.map(item => (
            <MoreMenuItem key={item.label} label={item.label} color={item.color} onClose={onClose} />
          ))}
        </div>
      ))}
    </>
  );
}

const TableRow = memo(function TableRow({
  row, originalIndex, isSelected, prevSelected, nextSelected, isLastRow,
  isZebra, isSkeletonLoading, dragColId, columnOrder, visibleColumns,
  wrapCells, onToggleSelect, hasSelectionRef, onRowClick, onRowOpen, frozenColumns, columnWidths, columnDragStyle,
  columnDefs, rowActions, bulkSelectCheckboxes, searchQuery,
}: TableRowProps) {
  const [idCopyPhase, setIdCopyPhase] = useState<'idle' | 'copied'>('idle');
  const [idIconHover, setIdIconHover] = useState(false);
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [linkHover, setLinkHover] = useState(false);
  const [infoTextHover, setInfoTextHover] = useState(false);
  const idCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [idTooltipPos, setIdTooltipPos] = useState({ x: 0, y: 0 });
  const idChipRef = useRef<HTMLButtonElement>(null);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuPos, setMoreMenuPos] = useState({ top: 0, right: 0 });
  const [moreMenuHover, setMoreMenuHover] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);


  const [infoTooltipVisible, setInfoTooltipVisible] = useState(false);
  const [infoTooltipPos, setInfoTooltipPos] = useState({ x: 0, y: 0 });
  const infoIconRef = useRef<HTMLSpanElement>(null);
  const infoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showInfoTooltip = () => {
    if (infoHideTimerRef.current) clearTimeout(infoHideTimerRef.current);
    if (!infoIconRef.current) return;
    const rect = infoIconRef.current.getBoundingClientRect();
    setInfoTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    setInfoTooltipVisible(true);
  };

  const scheduleHideInfoTooltip = () => {
    infoHideTimerRef.current = setTimeout(() => setInfoTooltipVisible(false), 80);
  };

  const handleIdCopy = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {});
    if (idCopyTimerRef.current) clearTimeout(idCopyTimerRef.current);
    setIdCopyPhase('copied');
    idCopyTimerRef.current = setTimeout(() => {
      setIdCopyPhase('idle');
    }, 1500);
  };

  const openMoreMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!moreButtonRef.current) return;
    const rect = moreButtonRef.current.getBoundingClientRect();
    setMoreMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMoreMenuOpen(true);
  };

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node) &&
        moreButtonRef.current && !moreButtonRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreMenuOpen]);

  const isRowActive = isRowHovered || moreMenuOpen;

  const rowBgType = isSelected ? 'selected' : 'white';
  // Only round corners on selected rows; regular rows are flat (border provides visual separation)
  const tlr = (isSelected && !prevSelected) ? '8px' : '0px';
  const blr = (isSelected && !nextSelected) ? '8px' : '0px';
  const trr = (isSelected && !prevSelected) ? '8px' : '0px';
  const brr = (isSelected && !nextSelected) ? '8px' : '0px';

  const cellBg: React.CSSProperties = {
    borderBottom: isLastRow
      ? 'none'
      : isSelected
        ? (nextSelected ? '1px solid #F7F5FD' : '1px solid white')
        : '1px solid var(--neutral-50)',
    verticalAlign: 'middle',
  };
  const truncBg: React.CSSProperties = {
    ...cellBg,
    overflow: 'hidden',
    verticalAlign: 'middle',
    ...(wrapCells
      ? {}
      : { textOverflow: isSkeletonLoading ? 'clip' : 'ellipsis', whiteSpace: 'nowrap' }),
  };
  const wrapOrTruncBg: React.CSSProperties = truncBg;
  const textClamp = cellTextStyle(wrapCells);
  const flexAlign = 'center';
  const firstCellStyle: React.CSSProperties = { ...cellBg, borderTopLeftRadius: tlr, borderBottomLeftRadius: blr, position: 'sticky', left: 0, zIndex: 2 };
  const lastCellStyle:  React.CSSProperties = { ...cellBg, borderTopRightRadius: trr, borderBottomRightRadius: brr };

  return (
    <>
    <tr
      data-row-bg={rowBgType}
      className={`${wrapCells ? '' : 'h-[44px]'}${!isSelected ? ' row-hoverable' : ''}${moreMenuOpen ? ' row-force-hover' : ''}${onRowOpen ? ' cursor-pointer' : ''}`}
      onMouseEnter={() => setIsRowHovered(true)}
      onMouseLeave={() => setIsRowHovered(false)}
      onMouseDown={e => { if (bulkSelectCheckboxes && hasSelectionRef.current && (e.metaKey || e.ctrlKey || e.shiftKey)) e.preventDefault(); }}
      onClick={e => {
        if (bulkSelectCheckboxes && hasSelectionRef.current && (e.metaKey || e.ctrlKey || e.shiftKey)) {
          onRowClick(e, originalIndex);
          return;
        }
        onRowOpen?.(row);
      }}
    >
      {bulkSelectCheckboxes && (
      <td style={{ ...firstCellStyle, width: '40px', height: '40px', padding: 0, verticalAlign: 'middle' }}>
        {/* L1: white blocker */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: (isRowActive && !isSelected) ? '-1px' : 0, width: '12px', background: 'white', pointerEvents: 'none' }} />
        {/* L2: perma rounded cap — always visible, carries row bg + rounded corners */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: (isRowActive && !isSelected) ? '-1px' : 0, width: '12px', background: 'var(--bg)', borderRadius: isSelected ? `${tlr} 0 0 ${blr}` : '8px 0 0 8px', pointerEvents: 'none' }} />
        {/* L3: gradient scrim — scaleX-compressed to ~8px cap by default, expands on scroll */}
        <div className="left-scrim" style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '88px', borderRadius: isSelected ? `${tlr} 0 0 ${blr}` : '8px 0 0 8px', pointerEvents: 'none' }} />
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {isSkeletonLoading ? (
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'white', border: '1px solid #F5F6F8' }} />
          ) : (
            <img
              src={isSelected ? '/m2/icons/checkboxSelected.svg' : '/m2/icons/checkboxPassive.svg'}
              alt={isSelected ? 'Selected' : 'Unselected'}
              style={{ width: '16px', height: '16px', display: 'block', flexShrink: 0, cursor: 'pointer' }}
              onMouseDown={e => { if (hasSelectionRef.current && (e.metaKey || e.ctrlKey || e.shiftKey)) e.preventDefault(); }}
              onClick={e => {
                e.stopPropagation();
                if (hasSelectionRef.current && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                  onRowClick(e, originalIndex);
                } else {
                  onToggleSelect(originalIndex);
                }
              }}
            />
          )}
        </div>
      </td>
      )}

      {isSkeletonLoading ? (
        /* Skeleton: one cell spanning all columns */
        <td colSpan={100} style={{ ...lastCellStyle, position: 'relative' }}>
          <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '160px', height: '16px', borderRadius: '6px', background: '#F8F9FB', pointerEvents: 'none' }} />
        </td>
      ) : (
      <>
      {(() => {
        const firstVisibleColId = columnOrder.find(id => visibleColumns.has(id));
        // Only the rightmost frozen column gets the right-side separator border.
        const lastFrozenColId = [...columnOrder].reverse().find(id => visibleColumns.has(id) && frozenColumns.has(id));
        return columnOrder.flatMap(colId => {
        if (!visibleColumns.has(colId)) return [];
        const isFirstCol = colId === firstVisibleColId;
        const draggedOpacity = 0;
        const contentFade: React.CSSProperties = {
          opacity: dragColId === colId ? draggedOpacity : 1,
          transition: dragColId === colId ? 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)' : 'opacity 200ms cubic-bezier(0.2, 0, 0.1, 1)',
        };

        // Frozen column positioning uses CSS custom properties set on the <table> element
        // (--fl-{colId}) rather than inline computed values. This lets column-drag update
        // all frozen positions with a single DOM write instead of a full React re-render.
        const isFrozen = frozenColumns.has(colId);
        const frozenBorderRight = (isFrozen && colId === lastFrozenColId) ? '1px solid #E0E6EF' : undefined;
        const stickyBase: React.CSSProperties = isFrozen
          ? { position: 'sticky', left: `var(--fl-${colId})`, zIndex: 2 }
          : {};

        const colDef = columnDefs.find(c => c.id === colId);
        const cellVal = row[colId];
        const isCellEmpty = cellVal === '' || cellVal === null || cellVal === undefined;
        const renderSearchableText = (value: unknown) =>
          colDef?.searchable ? highlightSearchText(value, searchQuery) : String(value ?? '');
        const nullSpan = <span style={{ ...contentFade, color: 'var(--neutral-400)' }}>–</span>;
        switch (colDef?.type ?? colId) {
          case 'icon-box': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: isSelected ? (isRowHovered ? '#E0D9FB' : '#EFECFC') : isRowActive ? 'var(--neutral-50)' : 'var(--neutral-25)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'none' }}>
                    <img src={colDef?.iconSrc ?? '/m2/icons/product16.svg'} alt="" style={{ width: '16px', height: '16px' }} />
                  </div>
                  <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>
                </div>
              )}
            </td>,
          ];
          case 'image': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src="/m2/icons/whiteTee.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>
                </div>
              )}
            </td>,
          ];
          case 'app-icon': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '12px' }}>
                  <div style={APP_ICON_CONTAINER_STYLE}>
                    <img
                      src={getAppIconSrc(colId, colDef, row)}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                  <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>
                </div>
              )}
            </td>,
          ];
          case 'inline-icon': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '6px' }}>
                  <img src={colDef?.iconSrc ?? '/m2/icons/product16.svg'} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>
                </div>
              )}
            </td>,
          ];
          case 'link': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <span
                  style={{ ...contentFade, fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...textClamp, textDecoration: 'underline', textDecorationColor: linkHover ? 'var(--neutral-900)' : 'var(--neutral-300)', cursor: 'pointer' }}
                  className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]"
                  onMouseEnter={() => setLinkHover(true)}
                  onMouseLeave={() => setLinkHover(false)}
                >{renderSearchableText(cellVal)}</span>
              )}
            </td>,
          ];
          case 'currency': {
            const valKey  = colDef?.dataKeys?.['value'] ?? colId;
            const codeKey = colDef?.dataKeys?.['code']  ?? `${colId}-code`;
            const isCurrencyEmpty = row[valKey] === '' || row[valKey] === null || row[valKey] === undefined;
            return [
              <td key={`${colId}-val`} data-col-id={colId} className="pl-[16px] pr-[4px] text-right" style={{ ...truncBg, position: 'relative', ...stickyBase }}>
                {isCurrencyEmpty ? nullSpan : (
                  <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, justifyContent: 'flex-end' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(row[valKey])}</span>
                  </div>
                )}
              </td>,
              <td key={`${colId}-code`} data-col-id={colId} className="pl-[4px] pr-[16px] text-right" style={{ ...cellBg, ...(isFrozen ? { position: 'sticky', left: `var(--fl-${colId}-code)`, zIndex: 2, borderRight: frozenBorderRight } : {}) }}>
                {isCurrencyEmpty ? null : (
                  <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: 0, ...textClamp }} className="text-[14px] font-normal leading-5 text-[color:var(--neutral-600)]">{String(row[codeKey] ?? '')}</span>
                  </div>
                )}
              </td>,
            ];
          }
          case 'color-coded': {
            const valKey = colDef?.dataKeys?.['value']    ?? colId;
            const posKey = colDef?.dataKeys?.['positive'] ?? `${colId.replace('color-coded', 'color')}-positive`;
            const isPos  = Boolean(row[posKey]);
            const isColorCodedEmpty = row[valKey] === '' || row[valKey] === null || row[valKey] === undefined;
            return [
              <td key={colId} data-col-id={colId} className="px-[16px] text-right" style={{ ...truncBg, ...stickyBase, borderRight: frozenBorderRight }}>
                {isColorCodedEmpty ? nullSpan : <span style={{ ...contentFade, fontVariantNumeric: 'tabular-nums', fontWeight: isFirstCol ? 600 : 400, color: isPos ? '#1A5C1F' : '#991B1B', ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px]">{isPos ? '+' : '-'}{renderSearchableText(row[valKey])}</span>}
              </td>,
            ];
          }
          case 'numerical': return [
            <td key={colId} data-col-id={colId} className="px-[16px] text-right" style={{ ...truncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <span style={{ ...contentFade, fontVariantNumeric: 'tabular-nums', fontWeight: isFirstCol ? 600 : 400, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>}
            </td>,
          ];
          case 'status': {
            const statusVal   = String(row[colId] ?? '');
            const styleKey    = colDef?.dataKeys?.['styleKey'];
            const styleVal    = styleKey ? String(row[styleKey] ?? statusVal) : statusVal;
            const badgeStyle  = colDef?.statusMap?.[styleVal] ?? DEFAULT_STATUS_STYLE;
            return [
              <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...cellBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <span className="text-[12px] font-normal inline-flex items-center" style={{ height: '20px', borderRadius: '4px', padding: '2px 6px', whiteSpace: 'nowrap', ...badgeStyle, ...contentFade }}>{renderSearchableText(statusVal)}</span>}
              </td>,
            ];
          }
          case 'color-text': {
            const colorTextVal = String(row[colId] ?? '');
            const colorTextColor = colDef?.statusMap?.[colorTextVal]?.color ?? 'var(--neutral-900)';
            return [
              <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...cellBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <span className="text-[14px] leading-5 tracking-[-0.15px]" style={{ ...contentFade, fontWeight: isFirstCol ? 600 : 400, color: colorTextColor, ...textClamp }}>{renderSearchableText(colorTextVal)}</span>}
              </td>,
            ];
          }
          case 'brand-icon': {
            const secondaryKey = colDef?.dataKeys?.['secondary'] ?? `${colId}-secondary`;
            const hasSecondary = Boolean(row[secondaryKey]);
            const secondaryIconSrc = colDef?.secondaryIconSrc ?? '/m2/icons/link.svg';
            const brandKey = colDef?.dataKeys?.['brand'];
            const brandName = brandKey ? row[brandKey] : undefined;
            // Prepend extra bullets to compensate for the missing secondary icon (16px + 4px gap)
            // so the numbers always line up regardless of icon count.
            const brandDisplayVal = hasSecondary ? String(cellVal) : `•••${String(cellVal)}`;
            return [
              <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
                {isCellEmpty ? nullSpan : (
                  <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {hasSecondary && <img src={secondaryIconSrc} alt="" style={{ flexShrink: 0, display: 'block' }} />}
                      {brandName ? (
                        <CardIcon name={brandName} size="small" />
                      ) : (
                        <img src={colDef?.iconSrc ?? '/m2/icons/brandIcon16.svg'} alt="" style={{ flexShrink: 0, display: 'block' }} />
                      )}
                    </div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: isFirstCol ? 600 : 400, paddingLeft: hasSecondary ? 0 : 1, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(brandDisplayVal)}</span>
                  </div>
                )}
              </td>,
            ];
          }
          case 'location': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '6px' }}>
                  <img src={colDef?.iconSrc ?? '/m2/icons/usIcon16.svg'} alt="" style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '2px' }} />
                  <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...(wrapCells ? { flex: 1 } : {}), ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>
                </div>
              )}
            </td>,
          ];
          case 'dot-scale': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...cellBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <DotScaleCell value={cellVal} style={contentFade} />}
            </td>,
          ];
          case 'id': {
            const showTooltip = idIconHover && !dragColId;
            return [
              <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...truncBg, ...stickyBase, borderRight: frozenBorderRight }}>
                <div style={{ ...contentFade, display: 'flex', alignItems: 'center' }}>
                  <button
                    ref={idChipRef}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: isSelected ? (isRowHovered ? '#E0D9FB' : '#EFECFC') : 'var(--neutral-25)',
                      border: `1px solid ${isSelected ? (isRowHovered ? '#E0D9FB' : '#EFECFC') : (idIconHover ? 'var(--neutral-100)' : 'var(--neutral-50)')}`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      transition: 'none',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (!idChipRef.current) return;
                      const rect = idChipRef.current.getBoundingClientRect();
                      setIdTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                      handleIdCopy(String(row[colId] ?? ''));
                    }}
                    onMouseEnter={() => {
                      setIdIconHover(true);
                      if (!idChipRef.current) return;
                      const rect = idChipRef.current.getBoundingClientRect();
                      setIdTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                    }}
                    onMouseLeave={() => setIdIconHover(false)}
                  >
                    <span
                      style={{ fontWeight: isFirstCol ? 600 : 400, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'clip', whiteSpace: 'nowrap' }}
                    >{renderSearchableText(row[colId])}</span>
                    {/* Icon slot — crossfades between clipboard and check */}
                    <div style={{ position: 'relative', width: '12px', height: '12px', flexShrink: 0 }}>
                      <AnimatePresence mode="sync" initial={false}>
                        {idCopyPhase === 'copied' ? (
                          <motion.span
                            key="check"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
                            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" clipRule="evenodd" d="M11.6021 1.67472C11.8681 1.92097 11.884 2.33617 11.6378 2.60211L4.60654 10.1959C4.47921 10.3334 4.29916 10.4099 4.11178 10.4061C3.9244 10.4023 3.74757 10.3186 3.62589 10.1761L0.344642 6.33233C0.109325 6.05667 0.142027 5.64245 0.417684 5.40713C0.693341 5.17182 1.10757 5.20452 1.34288 5.48017L4.14493 8.76258L10.6747 1.71039C10.921 1.44445 11.3362 1.42848 11.6021 1.67472Z" style={{ fill: 'var(--neutral-700)' }}/>
                            </svg>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="clipboard"
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
                            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <img src="/m2/icons/clipboard12.svg" alt="" style={{ width: '12px', height: '12px', display: 'block', flexShrink: 0 }} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                </div>
                {/* Tooltip — rendered inline but positioned fixed via portal */}
                {typeof document !== 'undefined' && showTooltip && createPortal(
                  <div style={{
                    position: 'fixed',
                    top: idTooltipPos.y,
                    left: idTooltipPos.x,
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    pointerEvents: 'none',
                  }}>
                    <motion.div
                      key={idCopyPhase}
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15, ease: [0.2, 0, 0.1, 1] }}
                      style={{
                        background: 'var(--neutral-700)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        whiteSpace: 'nowrap',
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        fontSize: '14px',
                        lineHeight: '20px',
                        letterSpacing: '-0.15px',
                        color: 'white',
                        boxShadow: '0px 2px 5px 0px rgba(64,68,82,0.08), 0px 3px 9px 0px rgba(64,68,82,0.08)',
                      }}
                    >
                      {idCopyPhase === 'copied' ? 'Copied' : 'Copy to clipboard'}
                    </motion.div>
                  </div>,
                  document.body
                )}
              </td>,
            ];
          }
          case 'date': return [
            <td key={colId} data-col-id={colId} colSpan={2} className="pl-[16px] pr-[16px] text-left" style={{ ...truncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <span style={{ ...contentFade, fontWeight: isFirstCol ? 600 : 400, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>}
            </td>,
          ];
          case 'agg-list': {
            const listKey = colDef?.dataKeys?.['list'] ?? `${colId.replace('agg-list', 'agg')}-all`;
            const aggItems = Array.isArray(row[listKey]) ? (row[listKey] as string[]) : [];
            const cellPadding = 32; // 16px left + 16px right
            const availW = (columnWidths[colId] || 200) - cellPadding; // 0 = Fit sentinel, fall back to 200
            const [aggVisible, aggHidden] = wrapCells
              ? computeAggVisibleWrapped(aggItems, availW)
              : computeAggVisible(aggItems, availW);
            const aggBadgeStyle: React.CSSProperties = {
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '16px',
              color: 'var(--neutral-600)',
              whiteSpace: 'nowrap',
              background: isSelected ? (isRowHovered ? '#E0D9FB' : '#EFECFC') : (isRowHovered ? 'var(--neutral-50)' : 'var(--neutral-25)'),
            };
            const aggBadge = aggHidden > 0 ? (
              <span style={aggBadgeStyle}>+{aggHidden}</span>
            ) : null;
            return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...(wrapCells ? wrapOrTruncBg : { ...cellBg, overflow: 'hidden' }), ...stickyBase, borderRight: frozenBorderRight }}>
              {aggItems.length === 0 ? nullSpan : wrapCells ? (
                <span
                  style={{
                    ...contentFade,
                    fontWeight: isFirstCol ? 600 : 400,
                    minWidth: 0,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    maxHeight: WRAP_CELL_MAX_LINES * 20,
                    overflow: 'hidden',
                  }}
                  className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]"
                >
                  {renderAggListItems(aggVisible)}
                  {aggBadge && <><span style={{ color: AGG_LIST_SEP_COLOR }}>{AGG_BADGE_BEFORE_SEP}</span>{aggBadge}</>}
                </span>
              ) : (
                <div style={{ ...contentFade, display: 'flex', alignItems: flexAlign, gap: '4px', overflow: 'hidden' }}>
                  {aggVisible.length > 0 && (
                    <span style={{ fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderAggListItems(aggVisible)}</span>
                  )}
                  {aggBadge}
                </div>
              )}
            </td>,
          ];}
          case 'subtext': {
            const amtKey = colDef?.dataKeys?.['amount'] ?? `${colId}-amt`;
            const subKey = colDef?.dataKeys?.['sub']    ?? `${colId}-sub`;
            const isSubtextEmpty = row[amtKey] === '' || row[amtKey] === null || row[amtKey] === undefined;
            return [
              <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
                {isSubtextEmpty ? nullSpan : (
                  <div style={{ ...contentFade, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, lineHeight: 1, minWidth: 0 }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: isFirstCol ? 600 : 400, minWidth: 0, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(row[amtKey])}</span>
                    <span className="text-[12px] leading-4" style={{ color: 'var(--neutral-600)', minWidth: 0, ...textClamp }}>{renderSearchableText(row[subKey])}</span>
                  </div>
                )}
              </td>,
            ];
          }
          case 'basic-text':
          case 'metadata': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...truncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <span style={{ ...contentFade, fontWeight: isFirstCol ? 600 : 400, ...textClamp }} className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]">{renderSearchableText(cellVal)}</span>}
            </td>,
          ];
          case 'more-info': return [
            <td key={colId} data-col-id={colId} className="px-[16px]" style={{ ...wrapOrTruncBg, ...stickyBase, borderRight: frozenBorderRight }}>
              {isCellEmpty ? nullSpan : <div style={{ ...contentFade, display: 'flex', alignItems: 'center' }}>
                <span
                  ref={infoIconRef}
                  style={{
                    fontWeight: isFirstCol ? 600 : 400,
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: infoTextHover ? 'var(--neutral-900)' : 'var(--neutral-300)',
                    textUnderlineOffset: '3px',
                    cursor: 'default',
                    minWidth: 0,
                    ...textClamp,
                  }}
                  className="text-[14px] leading-5 tracking-[-0.15px] text-[color:var(--neutral-900)]"
                  onMouseEnter={() => { setInfoTextHover(true); showInfoTooltip(); }}
                  onMouseLeave={() => { setInfoTextHover(false); scheduleHideInfoTooltip(); }}
                >{renderSearchableText(cellVal)}</span>
              </div>}
              {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                  {infoTooltipVisible && (
                    <div key="info-tip" style={{ position: 'fixed', top: infoTooltipPos.y, left: infoTooltipPos.x, transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none', width: 'max-content', maxWidth: '300px' }}>
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97, transition: { duration: 0.1, ease: [0.2, 0, 0.1, 1] } }}
                        transition={{ duration: 0.15, ease: [0.2, 0, 0.1, 1] }}
                        onMouseEnter={() => { if (infoHideTimerRef.current) clearTimeout(infoHideTimerRef.current); }}
                        onMouseLeave={scheduleHideInfoTooltip}
                        style={{
                          transformOrigin: 'top center',
                          pointerEvents: 'auto',
                          background: 'white',
                          border: '1px solid var(--neutral-100)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          boxShadow: '0px 2px 5px 0px rgba(64,68,82,0.08), 0px 3px 9px 0px rgba(64,68,82,0.08)',
                          maxWidth: '300px',
                          fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        }}
                      >
                        <div style={{
                          fontSize: '14px', fontWeight: 400, lineHeight: '20px',
                          letterSpacing: '-0.15px', color: 'var(--neutral-900)',
                          display: '-webkit-box', WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}>
                          {String(row[colDef?.dataKeys?.['tooltip'] ?? `${colId}-tooltip`] ?? '<Additional info>')}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>,
                document.body
              )}
            </td>,
          ];
          default: return [];
        }
        });
      })()}

      {/* True filler — absorbs remaining table width so data columns stay at exact pixel widths */}
      <td style={{ ...cellBg }} />
      {/* Sticky right endcap — must be last cell so it sits at the far right edge */}
      <td style={{ ...lastCellStyle, backgroundColor: 'transparent', position: 'sticky', right: 0, zIndex: 2 }}>
        {/* L1: white blocker */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: (isRowActive && !isSelected) ? '-1px' : 0, width: '12px', background: 'white', pointerEvents: 'none' }} />
        {/* L2: perma rounded cap — always visible, carries row bg + rounded corners */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: (isRowActive && !isSelected) ? '-1px' : 0, width: '12px', background: 'var(--bg)', borderRadius: isSelected ? `0 ${trr} ${brr} 0` : '0 8px 8px 0', pointerEvents: 'none' }} />
        {/* L3: gradient scrim — scaleX-compressed to ~8px cap by default, expands on scroll/hover */}
        <div className="right-scrim" style={{ position: 'absolute', right: '8px', top: 0, bottom: 0, width: '88px', borderRadius: isSelected ? `0 ${trr} ${brr} 0` : '0 8px 8px 0', pointerEvents: 'none' }} />
        {(rowActions ?? []).length > 0 && (
        <div className="more-icon-container" style={{ position: 'absolute', right: '12px', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <button
            ref={moreButtonRef}
            style={{
              width: '28px', height: '28px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: moreMenuOpen || moreMenuHover ? '#EBEEF1' : 'none',
              borderRadius: '6px',
              transition: 'background 150ms',
            }}
            onMouseEnter={() => setMoreMenuHover(true)}
            onMouseLeave={() => setMoreMenuHover(false)}
            onClick={openMoreMenu}
          >
            <img src="/m2/icons/more-16.svg" alt="More" style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
        )}
      </td>
      </>
      )}
    </tr>
    {/* More menu */}
    {typeof document !== 'undefined' && moreMenuOpen && createPortal(
      <div
        ref={moreMenuRef}
        style={{
          position: 'fixed',
          top: moreMenuPos.top,
          right: moreMenuPos.right,
          zIndex: 10000,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0px 15px 35px 0px rgba(48,49,61,0.08), 0px 5px 15px 0px rgba(0,0,0,0.12)',
          border: '1px solid #D8DEE4',
          padding: '4px',
          width: 'max-content',
          minWidth: '120px',
          maxWidth: '320px',
          fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
          animation: 'popoverIn 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
          transformOrigin: 'top right',
        }}
      >
        {renderMoreMenuItems(rowActions, () => setMoreMenuOpen(false))}
      </div>,
      document.body
    )}
    </>
  );
});

// Literal neutral-50/100/900 hexes: framer-motion can't interpolate var() inside box-shadow.
const CHIP_SHADOW_UNSELECTED = '0px 0px 0px 1px #ECF1F6, 0px 2px 3px 0px rgba(33,37,44,0)';
const CHIP_SHADOW_HOVER      = '0px 0px 0px 1px #D4DEE9, 0px 2px 3px 0px rgba(33,37,44,0)';
const CHIP_SHADOW_SELECTED   = '0px 0px 0px 2px #1A2C44, 0px 2px 3px 0px rgba(33,37,44,0.16)';
const CHIP_SHADOW_TRANSITION = { duration: 0.15, ease: [0.2, 0, 0.1, 1] as const };

/** Dark action bars (dirty-view tooltip, bulk action bar). */
const ACTION_BAR_BG     = 'var(--neutral-800)';
const ACTION_BAR_STROKE = 'var(--neutral-700)';

function DirtyChipTooltip({
  changeCount,
  anchorEl,
  onSave,
  onClear,
  onMouseEnter,
  onMouseLeave,
}: {
  changeCount: number;
  anchorEl: HTMLElement | null;
  onSave?: () => void;
  onClear: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchorEl || !tipRef.current) return;
    const place = () => {
      if (!anchorEl || !tipRef.current) return;
      const r = anchorEl.getBoundingClientRect();
      const tw = tipRef.current.offsetWidth;
      const left = Math.max(8, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 8));
      setPos({ top: r.bottom + 8, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorEl, changeCount, onSave]);

  if (typeof document === 'undefined' || !anchorEl) return null;

  return createPortal(
    <div
      ref={tipRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        paddingLeft: 16,
        background: ACTION_BAR_BG,
        borderRadius: 6,
        boxShadow: '0px 5px 15px 0px rgba(0,0,0,0.12), 0px 15px 35px 0px rgba(48,49,61,0.08)',
        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        paddingRight: 16,
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '20px',
        letterSpacing: '-0.15px',
        color: '#fff',
      }}>
        {changeCount === 1 ? '1 change' : `${changeCount} changes`}
      </span>
      <span aria-hidden style={{ width: 1.5, height: 12, background: ACTION_BAR_STROKE, flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          className="lv-dirty-tip-btn"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClear(); }}
        >
          Clear
        </button>
        {onSave && (
          <button
            type="button"
            className="lv-dirty-tip-btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSave(); }}
          >
            Save
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

const ViewChipButton = memo(function ViewChipButton({
  chip,
  isDragging,
  onMouseDown,
  onClick,
  dirty = false,
  changeCount = 0,
  onSave,
  onClear,
}: {
  chip: ViewChip;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  dirty?: boolean;
  changeCount?: number;
  onSave?: () => void;
  onClear?: () => void;
}) {
  const [scope, animateChip] = useAnimate<HTMLButtonElement>();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous selected state so we only animate on genuine changes, not re-renders
  const prevSelectedRef = useRef<boolean | null>(null);

  const openTooltip = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    if (dirty) setTooltipOpen(true);
  };
  const scheduleCloseTooltip = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setTooltipOpen(false), 120);
  };
  useEffect(() => { if (!dirty) setTooltipOpen(false); }, [dirty]);
  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  // Set initial box-shadow synchronously before paint — no animation
  useLayoutEffect(() => {
    if (!scope.current) return;
    scope.current.style.boxShadow = chip.selected ? CHIP_SHADOW_SELECTED : CHIP_SHADOW_UNSELECTED;
    prevSelectedRef.current = chip.selected;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate only when chip.selected genuinely changes (not on re-renders from parent)
  useEffect(() => {
    if (!scope.current || prevSelectedRef.current === chip.selected) return;
    prevSelectedRef.current = chip.selected;
    animateChip(scope.current, {
      boxShadow: chip.selected ? CHIP_SHADOW_SELECTED : CHIP_SHADOW_UNSELECTED,
    }, CHIP_SHADOW_TRANSITION);
  }, [chip.selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      ref={wrapRef}
      style={{ display: 'block', width: '100%' }}
      onMouseEnter={openTooltip}
      onMouseLeave={scheduleCloseTooltip}
    >
    <button
      ref={scope}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onMouseEnter={() => {
        if (!chip.selected && scope.current)
          animateChip(scope.current, { boxShadow: CHIP_SHADOW_HOVER }, CHIP_SHADOW_TRANSITION);
      }}
      onMouseLeave={() => {
        if (scope.current)
          animateChip(scope.current, {
            boxShadow: chip.selected ? CHIP_SHADOW_SELECTED : CHIP_SHADOW_UNSELECTED,
          }, CHIP_SHADOW_TRANSITION);
      }}
      className="relative flex rounded-[8px] bg-white cursor-pointer"
      style={{
        width: '100%',
        opacity: isDragging ? 0 : 1,
        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: 'var(--lv-chip-py, 10px) var(--lv-chip-px, 14px)' }}>
        <span
          suppressHydrationWarning
          className={`text-[14px] font-semibold leading-[20px] tracking-[-0.15px] shrink-0 ${
            chip.selected ? 'text-[color:var(--neutral-900)]' : 'text-[color:var(--neutral-600)]'
          }`}
        >
          {chip.label}
        </span>
        {chip.count && (
          <span
            className={`text-[14px] font-normal leading-[20px] tracking-[-0.15px] shrink-0 ${
              chip.selected ? 'text-[color:var(--neutral-900)]' : 'text-[color:var(--neutral-600)]'
            }`}
          >
            {chip.count}
          </span>
        )}
        {dirty && (
          <span
            aria-label="Unsaved changes"
            style={{ width: 8, height: 8, borderRadius: '50%', background: '#6DC9FC', flexShrink: 0 }}
          />
        )}
      </div>
    </button>
    {dirty && tooltipOpen && onClear && (
      <DirtyChipTooltip
        changeCount={changeCount}
        anchorEl={wrapRef.current}
        onSave={onSave}
        onClear={onClear}
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleCloseTooltip}
      />
    )}
    </span>
  );
});

// ─── Page component ────────────────────────────────────────────────────────────

/**
 * Merges saved column visibility with the current tab's column definitions.
 * - Columns that no longer exist in the config are dropped.
 * - Columns that are new (not in the saved state) are added using their `defaultVisible` setting.
 * This makes saved state resilient to config changes (column additions/removals/renames).
 */
function mergeVisibleColumns(savedVisible: string[], tabCols: TabConfig['columns']): Set<string> {
  const currentIds = new Set(tabCols.map(c => c.id));
  const savedSet = new Set(savedVisible);
  const valid = savedVisible.filter(id => currentIds.has(id));
  const added = tabCols.filter(c => !savedSet.has(c.id) && c.defaultVisible !== false).map(c => c.id);
  return new Set([...valid, ...added]);
}

/**
 * Merges saved column widths with defaults for any new columns not in the saved state.
 */
function mergeColumnWidths(
  savedWidths: Record<string, number>,
  tabCols: TabConfig['columns'],
): Record<string, number> {
  const defaults = Object.fromEntries(tabCols.map(c => [c.id, colDefaultWidth(c)]));
  return { ...defaults, ...savedWidths };
}

function getTabDefaultChips(tab: TabConfig): ViewChip[] {
  // "All" is always the first chip and is never part of defaultViewChips.
  // allViewConfig lets a tab set default sort/columns for it without polluting the named chip list.
  const allChip: ViewChip = { id: 'all', label: 'All', selected: false, ...(tab.allViewConfig ?? {}) };

  // Guard against stale configs that may have placed 'all' inside defaultViewChips.
  const namedChips = (tab.defaultViewChips ?? []).filter(c => c.id !== 'all');
  const base: ViewChip[] = namedChips.length > 0
    ? (namedChips as ViewChip[])
    : DEFAULT_VIEW_CHIPS.filter(c => c.id !== '1');

  return [allChip, ...base].map((c, i) => ({ ...c, selected: i === 0 }));
}

export default function ListViewTemplate({
  config,
  /** If provided, tab clicks push `<basePath>/<tabId>` to the browser URL. */
  basePath,
  /** Tab ID to activate on mount (and when it changes via browser navigation). */
  initialTabId,
  /** When provided, clicking a row (outside the checkbox/more-menu) calls this with the row data. */
  onRowOpen,
}: {
  config: PageConfig;
  basePath?: string;
  initialTabId?: string;
  onRowOpen?: (row: Record<string, unknown>) => void;
}) {
  const [activeTabIdx, setActiveTabIdx] = useState(() => {
    if (!initialTabId) return 0;
    const idx = config.tabs.findIndex(t => t.tabId === initialTabId);
    return idx >= 0 ? idx : 0;
  });

  // Handle browser back/forward when basePath routing is active.
  // Tab clicks use history.pushState (no Next.js navigation), so we must
  // listen for popstate ourselves to keep the tab in sync.
  useEffect(() => {
    if (!basePath) return;
    const handlePop = () => {
      const seg = window.location.pathname.startsWith(`${basePath}/`)
        ? window.location.pathname.slice(basePath.length + 1).split('/')[0]
        : '';
      const idx = config.tabs.findIndex(t => t.tabId === seg);
      if (idx >= 0) setActiveTabIdx(idx);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [basePath, config.tabs]); // eslint-disable-line react-hooks/exhaustive-deps
  const isMobile = useIsMobile();
  const [analyzeTooltipVisible, setAnalyzeTooltipVisible] = useState(false);
  const [analyzeHovered, setAnalyzeHovered] = useState(false);
  const [analyzeTooltipPos, setAnalyzeTooltipPos] = useState({ top: 0, left: 0 });
  const analyzeBtnRef = useRef<HTMLButtonElement>(null);
  const [exportTooltipVisible, setExportTooltipVisible] = useState(false);
  const [exportHovered, setExportHovered] = useState(false);
  const [exportTooltipPos, setExportTooltipPos] = useState({ top: 0, left: 0 });
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [createHovered, setCreateHovered] = useState(false);
  const [pageActionsOverflowOpen, setPageActionsOverflowOpen] = useState(false);
  const [promotedActionHovered, setPromotedActionHovered] = useState(false);
  const [pageActionsOverflowPos, setPageActionsOverflowPos] = useState({ top: 0, right: 0 });
  const [pageActionsOverflowHover, setPageActionsOverflowHover] = useState(false);
  const [moreTooltipPos, setMoreTooltipPos] = useState({ top: 0, left: 0 });
  const pageActionsOverflowBtnRef = useRef<HTMLButtonElement>(null);
  const pageActionsOverflowMenuRef = useRef<HTMLDivElement>(null);
  const activeTab = config.tabs[activeTabIdx];
  const bulkSelectCheckboxes = activeTab.bulkSelectCheckboxes !== false;
  const CHECKBOX_COL_WIDTH = bulkSelectCheckboxes ? 40 : 0;

  // 'all' is always the first pinned chip — never let config or localStorage move it.
  const withAllFirst = (ids: string[]): string[] => ['all', ...ids.filter(id => id !== 'all')];

  const defaultViewChips: ViewChip[] = getTabDefaultChips(activeTab);
  const stripeDefaultViewIds = new Set(defaultViewChips.map(chip => chip.id));
  const isStripeDefaultView = (chipId: string) => stripeDefaultViewIds.has(chipId);
  const defaultPinnedIds: string[] = withAllFirst(activeTab.defaultPinnedIds ?? defaultViewChips.map(c => c.id));
  // The first (primary) chip acts as "All" — it is always pinned and not draggable.
  const primaryChipId = defaultViewChips[0]?.id ?? '';

  const LS = {
    chips:   `${config.pageId}-${activeTab.tabId}-list-chips`,
    pinned:  `${config.pageId}-${activeTab.tabId}-pinned-ids`,
    configs: `${config.pageId}-${activeTab.tabId}-chip-configs`,
    default: `${config.pageId}-${activeTab.tabId}-default-chip`,
  };

  // Defaults only on the first render so SSR and hydration match. Saved chips
  // are restored in the mount layout effect before paint.
  const [viewChips, setViewChips] = useState<ViewChip[]>(() =>
    defaultViewChips.map(c => ({ ...c, selected: c.id === (defaultViewChips[0]?.id ?? '1') }))
  );
  // Tracks which tab index the current viewChips/pinnedViewIds state belongs to.
  // When activeTabIdx differs, it means we're in the stale intermediate render
  // before useLayoutEffect corrects the chip state — use tab defaults directly
  // so AnimatePresence sees the correct chip IDs from the very first render.
  const [viewChipsTabIdx, setViewChipsTabIdx] = useState(activeTabIdx);
  // Stays true through render #2 and Framer Motion's async rAF so exit/enter
  // animations are fully suppressed during a tab switch.
  const [suppressTabAnim, setSuppressTabAnim] = useState(false);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [trigramFeedbackVisible, setTrigramFeedbackVisible] = useState(false);
  const [trigramBackspacedFromSearch, setTrigramBackspacedFromSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [hoveredChipId, setHoveredChipId] = useState<string | null>(null);
  const [dragChipId, setDragChipId] = useState<string | null>(null);
  const [defaultChipId, setDefaultChipId] = useState<string>(() => defaultViewChips[0]?.id ?? '');
  const [plusMenu, setPlusMenu] = useState<{ top: number; left: number; center: number } | null>(null);
  const [editViewsOpen, setEditViewsOpen] = useState(false);
  const [editRowHoverId, setEditRowHoverId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ chipId: string; top: number; left: number; center: number } | null>(null);
  const [resetConfirm, setResetConfirm] = useState<{ top: number; left: number; center: number } | null>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const confirmPopoverRef = useRef<HTMLDivElement>(null);
  const [pinnedViewIds, setPinnedViewIds] = useState<Set<string>>(() => new Set(defaultPinnedIds));

  // tabSwitchPending: true during render #1 (before the layout effect settles state).
  // suppressTabAnim: true during render #2 and Framer Motion's async rAF (set in
  //   the layout effect alongside state resets, cleared after 2 rAFs).
  // suppressAnim: the single source of truth — used everywhere animation suppression
  //   is needed during a tab switch.
  const tabSwitchPending = viewChipsTabIdx !== activeTabIdx;
  const suppressAnim = tabSwitchPending || suppressTabAnim;

  // During a tab switch use the incoming tab's defaults for chip/pinned data
  // so chip enter/exit animations stay stable across the switch.
  const displayViewChips = suppressAnim ? getTabDefaultChips(activeTab) : viewChips;
  const displayPinnedIds = suppressAnim
    ? new Set(withAllFirst(activeTab.defaultPinnedIds ?? getTabDefaultChips(activeTab).map((c) => c.id)))
    : pinnedViewIds;
  const [chipContextMenu, setChipContextMenu] = useState<{ chipId: string; x: number; y: number } | null>(null);
  const chipContextMenuRef = useRef<HTMLDivElement>(null);
  const [chipRenameId, setChipRenameId] = useState<string | null>(null);
  const [chipRenameValue, setChipRenameValue] = useState('');
  const [chipRenameFromWidth, setChipRenameFromWidth] = useState<number | null>(null);
  const [chipRenamePhase, setChipRenamePhase] = useState<'naming' | 'committing' | null>(null);
  const [chipRenameStartShadow, setChipRenameStartShadow] = useState(CHIP_SHADOW_SELECTED);
  const chipRenameInputRef = useRef<HTMLInputElement>(null);
  const chipRenameContainerRef = useRef<HTMLDivElement>(null);
  const [renameChipId, setRenameChipId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const skipRenameCommitRef = useRef(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [chipFilterAnchor, setChipFilterAnchor] = useState<{ left: number; top: number; height: number } | null>(null);
  const [isFilterBtnHovered, setIsFilterBtnHovered] = useState(false);
  const [showScrollGradient, setShowScrollGradient] = useState(false);
  const [showTopScrollGradient, setShowTopScrollGradient] = useState(false);
  const [currentPage, setCurrentPage] = useState<'main' | 'subpage'>('main');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [filterChips, setFilterChips] = useState<FilterChip[]>([]);
  // Per-type filter input state (populated when opening a subpage)
  const [filterDateOp, setFilterDateOp] = useState('is in the last');
  const [filterDateVal, setFilterDateVal] = useState('');
  const [filterDateUnit, setFilterDateUnit] = useState('days');
  const [filterDateTz, setFilterDateTz] = useState<'GMT-8' | 'UTC'>('GMT-8');
  const [filterSingleVal, setFilterSingleVal] = useState('');
  const [filterValueOp, setFilterValueOp] = useState('is equal to');
  const [filterValueInput, setFilterValueInput] = useState('');
  const [savePhase, setSavePhase] = useState<'idle' | 'naming' | 'committing'>('idle');
  const [saveAsName, setSaveAsName] = useState('');
  const [isSelectingChip, setIsSelectingChip] = useState(false);
  const saveAsInputRef = useRef<HTMLInputElement>(null);
  const saveTextRef = useRef<HTMLButtonElement>(null);
  const saveContainerRef = useRef<HTMLDivElement>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);
  const hasSelectionRef = useRef<boolean>(false);
  const [barVisible, setBarVisible] = useState(false);
  const [barExiting, setBarExiting] = useState(false);
  const barExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of bar content — frozen when exit begins so content doesn't change during fade-out
  const barSnapshotRef = useRef({ selectedCount: 0, refundableCount: 0 });
  const [columnMenu, setColumnMenu] = useState<{ colId: string; x: number; y: number } | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(activeTab.allViewConfig?.sortCol ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(activeTab.allViewConfig?.sortDir ?? 'asc');
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const [bulkSelectionMenu, setBulkSelectionMenu] = useState<{ top: number; left: number } | null>(null);
  const bulkSelectionMenuRef = useRef<HTMLDivElement>(null);
  const headerCheckboxRef = useRef<HTMLButtonElement>(null);
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false);
  const [toolbarPopoverBounds, setToolbarPopoverBounds] = useState<{ top: number; maxHeight: number } | null>(null);
  // Frozen column list for the settings popover — captured once when the popover
  // opens so toggling visibility doesn't reorder the list while the user is editing.
  // The live `visibleColumns` state still drives checkbox state immediately.
  const [popoverColumns, setPopoverColumns] = useState<ColumnDef[]>([]);
  const [wrapCells, setWrapCells] = useState(false);
  const [saveBadge, setSaveBadge] = useState<{ x: number; y: number } | null>(null);
  const [saveToast, setSaveToast] = useState<{ label: string } | null>(null);
  // Suppresses the save indicator for any programmatic column-state reset (mount,
  // tab switch, chip selection). Set to true before calling the state setters;
  // the auto-save effect reads it and clears it.
  // Suppresses the save indicator for programmatic column-state resets that happen
  // AFTER the initialization window (tab switch, chip selection).
  const suppressSaveIndicatorRef = useRef(false);
  // True only AFTER the first two animation frames have elapsed. Any autosave
  // effect runs that fire before this point are initialization artifacts and must
  // be ignored, regardless of how many renders React batches on mount.
  const postInitRef = useRef(false);
  const [paginationPage, setPaginationPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const chipRowSectionRef = useRef<HTMLDivElement>(null);
  const chipAnchorRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const [searchPlaceholder, setSearchPlaceholder] = useState('Search');
  const stickyTriggerRef = useRef<HTMLDivElement>(null);
  const isScrolledRef = useRef(false);
  const shimmerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadActiveRef = useRef(true);
  const { foreverLoading, columnDragStyle, columnResizeStyle, simulateNoHScroll, autosaveIndicator, savedToast, viewManagement, trigramSearch, elementSize, sheetMode } = usePrototype();
  const lockedDefaults = viewManagement === 'locked-defaults';
  const partialLocked = viewManagement === 'partial-locked';
  const trimmedSearchLength = searchValue.trim().length;
  const trigramSearchPending = trimmedSearchLength > 0 && trimmedSearchLength < 3;
  const trigramNoResultsActive =
    trigramSearch === 'no-results' &&
    trigramSearchPending &&
    (trigramFeedbackVisible || trigramBackspacedFromSearch);
  const isLockedView = (chipId: string) =>
    chipId === primaryChipId ||
    (lockedDefaults && isStripeDefaultView(chipId)) ||
    (partialLocked && (activeTab.lockedViewIds ?? []).includes(chipId));
  const noSearch = config.noSearch ?? false;
  const includeViewTotals = config.includeViewTotals ?? false;
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const pageSizeMenuRef = useRef<HTMLDivElement>(null);
  const pageSizeTriggerRef = useRef<HTMLButtonElement>(null);

  // Pagination overlay position
  const [paginationLeft, setPaginationLeft] = useState(0);
  const [tableClientWidth, setTableClientWidth] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1440);
  const paginationOverlayRef = useRef<HTMLDivElement>(null);
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(activeTab.columns.map(c => [c.id, colDefaultWidth(c)]))
  );

  const openColumnMenu = (e: React.MouseEvent<HTMLTableCellElement>, colId: string) => {
    e.stopPropagation();
    setBulkSelectionMenu(null);
    if (columnMenu?.colId === colId) {
      setColumnMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setColumnMenu({ colId, x: rect.left, y: rect.bottom + 4 });
  };

  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    // Fit columns (width === 0) have no stored pixel width yet — read from the DOM.
    const rawWidth = columnWidths[colId];
    const startWidth = rawWidth === 0
      ? (tableElRef.current?.querySelector<HTMLTableCellElement>(`th[data-col-id="${colId}"]`)?.offsetWidth ?? COLUMN_SIZE_PX.M)
      : rawWidth;
    const startDividerX = lastColDivider.current.x;
    const minWidth = getColMinWidth(colId, colLabels);
    setResizingCol(colId);
    document.body.classList.add('col-resizing');

    // Capture frozen-column order at drag start (stable for the lifetime of this drag)
    const isFrozenCol = frozenColumns.has(colId);
    const frozenOrder = columnOrder.filter(id => visibleColumns.has(id) && frozenColumns.has(id));
    // Snapshot of widths for non-resized columns (used when updating frozen offsets)
    const widthSnapshot = { ...columnWidths };

    let liveWidth = startWidth; // local variable — no React state during drag

    const onMove = (ev: MouseEvent) => {
      liveWidth = Math.max(minWidth, startWidth + ev.clientX - startX);

      // ── Direct DOM: update the <col> width — zero React re-renders ──────────
      const tableEl = tableElRef.current;
      if (tableEl) {
        const col = tableEl.querySelector<HTMLElement>(`col[data-col-id="${colId}"]`);
        if (col) {
          // currency cols: main <col> is (width - 56), the 56px code sub-col is fixed
          col.style.width = colMeta[colId]?.type === 'currency'
            ? `${liveWidth - 56}px`
            : `${liveWidth}px`;
        }
        // ── Update frozen left CSS vars if this column is frozen ──────────────
        if (isFrozenCol) {
          let left = 40;
          for (const id of frozenOrder) {
            const w = id === colId ? liveWidth : (widthSnapshot[id] ?? 160);
            tableEl.style.setProperty(`--fl-${id}`, `${left}px`);
            if (colMeta[id]?.type === 'currency') {
              tableEl.style.setProperty(`--fl-${id}-code`, `${left + w - 56}px`);
            }
            left += w;
          }
        }
      }

      // Only React update during drag: the divider line position (tiny — TableRow memo
      // prevents any row from re-rendering since columnWidths prop is unchanged)
      const x = startDividerX + (liveWidth - startWidth);
      lastColDivider.current = { colId, x };
      setColDivider({ colId, x });
    };

    const onUp = () => {
      // Single React commit for the final width
      setColumnWidths(prev => ({ ...prev, [colId]: liveWidth }));
      setResizingCol(null);
      document.body.classList.remove('col-resizing');
      document.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() =>
    new Set(activeTab.columns.filter(c => c.defaultVisible !== false).map(c => c.id))
  );
  const initialColOrder = activeTab.columns.map(c => c.id);
  const [columnOrder, setColumnOrder] = useState<string[]>(initialColOrder);
  const [frozenColumns, setFrozenColumns] = useState<Set<string>>(new Set());
  const columnOrderRef = useRef<string[]>(initialColOrder);

  // ── Reset all tab-scoped state when the active tab changes ────────────────
  // Tracks the last *committed* (painted) tab index. During the re-render
  // triggered by a tab switch it lags one cycle behind activeTabIdx, which lets
  // chip motion elements detect they should skip their entry animation.

  // Synchronously reset all per-tab state before the browser paints so the user
  // never sees a stale-column intermediate frame when switching tabs.
  const prevTabIdxRef = useRef(activeTabIdx);
  useLayoutEffect(() => {
    if (prevTabIdxRef.current === activeTabIdx) return;
    prevTabIdxRef.current = activeTabIdx;

    const tab = config.tabs[activeTabIdx];
    const chips = getTabDefaultChips(tab);
    const pinned = withAllFirst(tab.defaultPinnedIds ?? chips.map(c => c.id));

    // Load saved column settings for the incoming tab from localStorage so that
    // (a) column customisations are restored when switching tabs, and
    // (b) chipSettingsRef is re-seeded for the new tab so subsequent saves don't
    //     corrupt the outgoing tab's persisted data.
    const incomingChipKey = `m2-${config.pageId}-${tab.tabId}-chip-settings-v2`;
    let incomingChipSettings: Record<string, { columnWidths: Record<string, number>; visibleColumns: string[]; columnOrder?: string[] }> = {};
    try {
      const stored = localStorage.getItem(incomingChipKey);
      if (stored) incomingChipSettings = JSON.parse(stored);
    } catch { /* noop */ }
    chipSettingsRef.current = incomingChipSettings;

    const incomingDefaultChipId = chips[0]?.id ?? '1';
    const savedForIncoming = incomingChipSettings[incomingDefaultChipId];

    setViewChips(chips);
    setViewChipsTabIdx(activeTabIdx);
    setSuppressTabAnim(true);
    setPinnedViewIds(new Set(pinned));
    setDefaultChipId(incomingDefaultChipId);
    suppressSaveIndicatorRef.current = true;

    if (savedForIncoming) {
      setColumnWidths(mergeColumnWidths(savedForIncoming.columnWidths, tab.columns));
      setVisibleColumns(mergeVisibleColumns(savedForIncoming.visibleColumns, tab.columns));
      if (savedForIncoming.columnOrder) {
        const allColIds = tab.columns.map(c => c.id);
        const merged = [...savedForIncoming.columnOrder, ...allColIds.filter(id => !savedForIncoming.columnOrder!.includes(id))];
        setColumnOrder(merged);
        columnOrderRef.current = merged;
      } else {
        const newOrder = tab.columns.map(c => c.id);
        setColumnOrder(newOrder);
        columnOrderRef.current = newOrder;
      }
    } else {
      setColumnWidths(Object.fromEntries(tab.columns.map(c => [c.id, colDefaultWidth(c)])));
      setVisibleColumns(new Set(tab.columns.filter(c => c.defaultVisible !== false).map(c => c.id)));
      const newOrder = tab.columns.map(c => c.id);
      setColumnOrder(newOrder);
      columnOrderRef.current = newOrder;
    }
    setFrozenColumns(new Set());
    setFilterChips([]);
    setSearchValue('');
    setDebouncedSearch('');
    setSelectedRows(new Set());
    lastClickedIndexRef.current = null;
    setPaginationPage(1);
    setSortCol(null);
    setSortDir('asc');

    // Re-seed chip filter configs for the incoming tab so predefined chip filters
    // are always available regardless of which tab was active at mount time.
    const incoming = (tab.defaultViewChips ?? []).filter(c => c.id !== 'all');
    const tabFilters = tab.filters ?? [];
    const freshConfigs: Record<string, { filters: FilterChip[]; searchQuery: string; sortCol?: string | null; sortDir?: 'asc' | 'desc' }> = {
      // 'all' chip always reset to allViewConfig values.
      all: {
        filters: [],
        searchQuery: '',
        sortCol: tab.allViewConfig?.sortCol ?? null,
        sortDir: (tab.allViewConfig?.sortDir ?? 'asc') as 'asc' | 'desc',
      },
      ...Object.fromEntries(
        incoming.map(c => [c.id, {
          filters: (c.filters ?? []).map(f => ({
            ...f,
            filterName: f.filterName ?? tabFilters.find(fd => fd.id === f.id)?.label ?? f.id,
            selectedValues: f.selectedValues ?? [],
          })) as FilterChip[],
          searchQuery: '',
          sortCol: c.sortCol ?? null,
          sortDir: c.sortDir ?? 'asc' as const,
        }])
      ),
    };
    // Preserve any user-created chip configs that were already in the ref.
    const existingIds = new Set(['all', ...incoming.map(c => c.id)]);
    for (const [id, cfg] of Object.entries(chipListConfigsRef.current)) {
      if (!existingIds.has(id)) freshConfigs[id] = cfg;
    }
    chipListConfigsRef.current = freshConfigs;
  }, [activeTabIdx, config.tabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returns the sticky `left` offset (px) for a frozen column, accounting for
  // the optional checkbox column and all frozen columns that precede it in order.
  const getFrozenLeft = useCallback((colId: string): number => {
    let left = CHECKBOX_COL_WIDTH;
    for (const id of columnOrder) {
      if (!visibleColumns.has(id)) continue;
      if (id === colId) break;
      if (frozenColumns.has(id)) left += columnWidths[id] ?? 160;
    }
    return left;
  }, [columnOrder, visibleColumns, frozenColumns, columnWidths, CHECKBOX_COL_WIDTH]);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const ghostElRef = useRef<HTMLDivElement | null>(null);
  const ghostPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragColHappenedRef = useRef(false);
  const dragColClickOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // First visible data row index at drag start — used to mirror scroll state in ghost
  const dragGhostRowOffsetRef = useRef(0);
  const flipSnapRef = useRef<Record<string, number> | null>(null);
  const lineIndicatorRef = useRef<HTMLDivElement | null>(null);
  const linePendingOrderRef = useRef<string[] | null>(null);
  const lineDropIdxRef = useRef<number>(-1);
  const lineAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chip FLIP drag refs ────────────────────────────────────────────────────
  const chipRowRef = useRef<HTMLDivElement>(null);
  // Tracks the chip ID just committed from the save flow — skips its enter animation
  const justCommittedChipIdRef = useRef<string | null>(null);
  const skipChipEnterRef = useRef(true);
  const persistReadyRef = useRef(false);
  const chipGhostRef = useRef<HTMLDivElement | null>(null);
  const chipGhostPosRef = useRef({ x: 0, y: 0 });
  const chipGhostSizeRef = useRef({ w: 0, h: 0 });
  const chipDragHappenedRef = useRef(false);
  const chipDragIdRef = useRef<string | null>(null);
  const chipCurrentOrderRef = useRef<string[]>([]);
  const chipFLIPSnapRef = useRef<Record<string, number>>({}); // chipId → left px before reorder

  // ── Chip row scroll scrim refs / state ─────────────────────────────────────
  const noSearchScrollRef = useRef<HTMLDivElement>(null);
  const chipRowScrollRef = useRef<HTMLDivElement>(null);
  const [noSearchScrims, setNoSearchScrims] = useState({ left: false, right: false });
  const [chipRowScrims, setChipRowScrims] = useState({ left: false, right: false });

  useEffect(() => {
    const el = noSearchScrollRef.current;
    if (!el) return;
    const check = () => setNoSearchScrims({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [noSearch, activeTabIdx]);

  useEffect(() => {
    const el = chipRowScrollRef.current;
    if (!el) return;
    const check = () => setChipRowScrims({
      left: el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [noSearch, activeTabIdx]);

  // Derived from active tab — recomputed whenever the active tab changes
  const allColumns = activeTab.columns.map(c => ({ id: c.id, label: c.label, type: c.type, isMetadata: c.isMetadata }));
  const colLabels: Record<string, string> = Object.fromEntries(activeTab.columns.map(c => [c.id, c.label]));
  // Types that are inherently right-aligned — header follows cell alignment automatically.
  const RIGHT_ALIGNED_TYPES = new Set(['numerical', 'currency', 'color-coded']);
  const colMeta: Record<string, { label: string; align: 'left' | 'right'; colSpan?: number; type: string }> =
    Object.fromEntries(activeTab.columns.map(c => [c.id, {
      label: c.label,
      align: c.align ?? (RIGHT_ALIGNED_TYPES.has(c.type) ? 'right' : 'left'),
      colSpan: c.colSpan,
      type: c.type,
    }]));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sortedColumns = [
    // Visible columns: user's drag order
    ...columnOrder
      .filter(id => visibleColumns.has(id))
      .flatMap(id => { const c = allColumns.find(col => col.id === id); return c ? [c] : []; }),
    // Hidden columns: alphabetical
    ...allColumns.filter(c => !visibleColumns.has(c.id)).sort((a, b) => a.label.localeCompare(b.label)),
  ];

  const toggleRowSelected = useCallback((i: number) => {
    if (!bulkSelectCheckboxes) return;
    lastClickedIndexRef.current = i;
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }, [bulkSelectCheckboxes]);

  const filteredRowsRef = useRef<{ row: Record<string, unknown>; originalIndex: number }[]>([]);

  const handleRowClick = useCallback((e: React.MouseEvent, originalIndex: number) => {
    if (!bulkSelectCheckboxes) return;
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+click: toggle individual row
      toggleRowSelected(originalIndex);
    } else if (e.shiftKey) {
      // Shift+click: select range from last clicked to this row (in filtered display order)
      const anchor = lastClickedIndexRef.current;
      const rows = filteredRowsRef.current;
      if (anchor === null) { toggleRowSelected(originalIndex); return; }
      const anchorPos = rows.findIndex(r => r.originalIndex === anchor);
      const currPos   = rows.findIndex(r => r.originalIndex === originalIndex);
      if (anchorPos === -1 || currPos === -1) { toggleRowSelected(originalIndex); return; }
      const start = Math.min(anchorPos, currPos);
      const end   = Math.max(anchorPos, currPos);
      setSelectedRows(prev => {
        const next = new Set(prev);
        rows.slice(start, end + 1).forEach(r => next.add(r.originalIndex));
        return next;
      });
      lastClickedIndexRef.current = originalIndex;
    }
  }, [bulkSelectCheckboxes, toggleRowSelected]);


  useEffect(() => {
    if (bulkSelectCheckboxes) return;
    setSelectedRows(new Set());
    lastClickedIndexRef.current = null;
  }, [bulkSelectCheckboxes, activeTabIdx]);

  // Canonical config per chip — filters + search query.
  // Table settings auto-save; filters/search do NOT auto-save.
  // Stored in a ref so mutations (e.g. from saveNewView) survive re-renders.

  // Resolve filterName from the tab's FilterDef list if not provided explicitly.
  const resolveFilterName = useCallback((f: { id: string; filterName?: string }) => {
    if (f.filterName) return f.filterName;
    return activeTab.filters?.find(fd => fd.id === f.id)?.label ?? f.id;
  }, [activeTab.filters]);

  const chipListConfigsRef = useRef<Record<string, { filters: FilterChip[]; searchQuery: string; sortCol?: string | null; sortDir?: 'asc' | 'desc' }>>(
    Object.fromEntries([
      // 'all' chip always gets its own entry; seeded from allViewConfig when provided.
      ['all', {
        filters: [],
        searchQuery: '',
        sortCol: activeTab.allViewConfig?.sortCol ?? null,
        sortDir: (activeTab.allViewConfig?.sortDir ?? 'asc') as 'asc' | 'desc',
      }],
      // Named view chips follow.
      ...(activeTab.defaultViewChips ?? []).filter(c => c.id !== 'all').map(c => [c.id, {
        filters: (c.filters ?? []).map(f => ({ ...f, filterName: resolveFilterName(f), selectedValues: f.selectedValues ?? [] })),
        searchQuery: '',
        sortCol: c.sortCol ?? null,
        sortDir: c.sortDir ?? 'asc' as const,
      }]),
    ])
  );
  // Filter/search/sort configs live in a ref so chip transitions can read them
  // synchronously. Incrementing this revision makes ref-only saves observable to
  // React even when the optional saved toast is disabled.
  const [, setChipListConfigRevision] = useState(0);
  const chipListConfigs = chipListConfigsRef.current;

  // v2: bumped when column-width defaults changed (S/M/L refactor) to wipe stale saved widths.
  // Keyed by tabId so tabs with overlapping chip ids don't overwrite each other's column layouts.
  const CHIP_SETTINGS_KEY = `m2-${config.pageId}-${activeTab.tabId}-chip-settings-v2`;
  const chipSettingsRef = useRef<Record<string, { columnWidths: Record<string, number>; visibleColumns: string[]; columnOrder?: string[] }>>(
    (() => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(CHIP_SETTINGS_KEY) : null;
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    })()
  );

  // On mount: restore persisted state before paint so custom chips don't flash
  // in after hydration. First render used tab defaults so SSR HTML matches.
  useLayoutEffect(() => {
    // 1. Resolve default chip ID
    const storedDefault = lsGet<string>(LS.default);
    const resolvedDefaultId = storedDefault ?? defaultViewChips[0]?.id ?? '1';
    if (storedDefault) setDefaultChipId(storedDefault);

    // 2. Restore pinned IDs
    const storedPinned = lsGet<string[]>(LS.pinned);
    if (storedPinned) setPinnedViewIds(new Set(withAllFirst(storedPinned)));

    // 3. Restore per-chip filter configs into the ref
    const storedConfigs = lsGet<Record<string, { filters: FilterChip[]; searchQuery: string }>>(LS.configs);
    if (storedConfigs) Object.assign(chipListConfigsRef.current, storedConfigs);

    // 4. Restore view chips, forcing selection onto the resolved default
    const storedChips = lsGet<ViewChip[]>(LS.chips);
    if (storedChips) {
      setViewChips(ensureAllFirst(storedChips.map(chip => {
        const def = defaultViewChips.find(d => d.id === chip.id);
        return { ...(def ? { ...chip, count: def.count } : chip), selected: chip.id === resolvedDefaultId };
      })));
    } else {
      setViewChips(prev => prev.map(c => ({ ...c, selected: c.id === resolvedDefaultId })));
    }

    // 5. Apply the resolved chip's table settings (column widths / visibility / order).
    //    Merge with current config so added/removed columns don't break saved state.
    const savedSettings = chipSettingsRef.current[resolvedDefaultId];
    if (savedSettings) {
      setColumnWidths(mergeColumnWidths(savedSettings.columnWidths, activeTab.columns));
      setVisibleColumns(mergeVisibleColumns(savedSettings.visibleColumns, activeTab.columns));
      if (savedSettings.columnOrder) {
        const savedOrder = savedSettings.columnOrder;
        const allColIds = activeTab.columns.map(c => c.id);
        const merged = [...savedOrder, ...allColIds.filter(id => !savedOrder.includes(id))];
        columnOrderRef.current = merged;
        setColumnOrder(merged);
      }
    }

    // 6. Apply the resolved chip's filter/search config — must come AFTER step 3
    //    so chipListConfigsRef.current already has the persisted overrides merged in.
    const cfg = chipListConfigsRef.current[resolvedDefaultId];
    setFilterChips(cfg?.filters ?? []);
    setSearchValue(cfg?.searchQuery ?? '');
    setDebouncedSearch(cfg?.searchQuery ?? '');
    persistReadyRef.current = true;
    requestAnimationFrame(() => { skipChipEnterRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the postInitRef gate after two animation frames. Any autosave effect
  // runs that fire before this point are initialization artifacts (initial render
  // + localStorage hydration re-renders) and must not show the indicator.
  useEffect(() => {
    let id2: number;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => { postInitRef.current = true; });
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  // Auto-focus Save As input when it opens
  useEffect(() => {
    if (savePhase === 'naming') saveAsInputRef.current?.focus();
  }, [savePhase]);

  // Keep a mutable ref to viewChips so drag-event closures always see the latest value
  const viewChipsRef = useRef<typeof viewChips>(viewChips);
  useEffect(() => { viewChipsRef.current = viewChips; }, [viewChips]);

  // Persist view chips (labels, custom chips, selected state)
  useEffect(() => { if (!persistReadyRef.current) return; lsSet(LS.chips, viewChips); }, [viewChips]);

  // Persist pinned view IDs
  useEffect(() => { if (!persistReadyRef.current) return; lsSet(LS.pinned, Array.from(pinnedViewIds)); }, [pinnedViewIds]);

  // Persist default chip
  useEffect(() => { if (!persistReadyRef.current) return; lsSet(LS.default, defaultChipId); }, [defaultChipId]);

  // Auto-save table settings only (not filters) on every change
  useEffect(() => {
    // Suppress during initialization window (first 2 frames after mount)
    if (!postInitRef.current) return;
    // Suppress for programmatic resets (tab switch, chip selection).
    // Also skip the localStorage write so that resetting to defaults never
    // overwrites previously-saved custom column state.
    if (suppressSaveIndicatorRef.current) { suppressSaveIndicatorRef.current = false; return; }

    const currentId = viewChips.find(c => c.selected)?.id;
    if (currentId) {
      chipSettingsRef.current[currentId] = {
        columnWidths,
        visibleColumns: Array.from(visibleColumns),
        columnOrder,
      };
      try {
        localStorage.setItem(CHIP_SETTINGS_KEY, JSON.stringify(chipSettingsRef.current));
      } catch { /* storage unavailable */ }
    }

    const selectedChip = viewChips.find(c => c.selected);
    const chipEl = selectedChip
      ? document.querySelector(`[data-chip-id="${selectedChip.id}"]`)
      : null;

    if (savedToast) {
      setSaveToast({ label: selectedChip?.label ?? 'view' });
      const t1 = setTimeout(() => setSaveToast(null), 5200);
      return () => { clearTimeout(t1); setSaveToast(null); };
    } else if (autosaveIndicator === 'badge') {
      if (chipEl) {
        const rect = chipEl.getBoundingClientRect();
        setSaveBadge({ x: rect.right - 10, y: rect.top - 10 });
      }
      const t1 = setTimeout(() => setSaveBadge(null), 700);
      // Dismiss eagerly on cleanup so that if this effect re-runs (deps changed)
      // but the next run is suppressed, the indicator doesn't get stuck on screen.
      // React 18 batches the setSaveBadge(null) with any subsequent setSaveBadge(...)
      // in the same flush, so there is no visible flash when a new badge immediately follows.
      return () => { clearTimeout(t1); setSaveBadge(null); };
    }
  }, [columnWidths, visibleColumns, columnOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!savedToast) setSaveToast(null);
  }, [savedToast]);
  // ── Pagination overlay ────────────────────────────────────────────────────

  // Track content area left edge for fixed pagination positioning.
  // useLayoutEffect ensures layout is computed before the first measurement,
  // avoiding the race condition where getBoundingClientRect returns 0.
  // We observe tableScrollRef (the flex-1 container) rather than tableOuterRef
  // so the ResizeObserver fires when flexbox resolves the container's width.
  useLayoutEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setPaginationLeft(rect.left);
      setTableClientWidth(rect.width);
      setWindowWidth(window.innerWidth);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  // ── Write frozen column left offsets as CSS custom properties on the <table> element.
  // Using CSS vars instead of inline React styles means frozen positions update via a
  // single DOM write per column rather than re-rendering every row, and direct DOM
  // writes during column-drag won't be overwritten by React (since these props aren't
  // in any React style object).
  useLayoutEffect(() => {
    const tableEl = tableElRef.current;
    if (!tableEl) return;
    let left = CHECKBOX_COL_WIDTH; // checkbox col width when bulk select is enabled
    for (const id of columnOrder) {
      if (!visibleColumns.has(id)) continue;
      if (!frozenColumns.has(id)) continue;
      // Fit sentinel (0): read the actual rendered th width from the DOM.
      const stored = columnWidths[id] ?? 0;
      const w = stored === 0
        ? (tableEl.querySelector<HTMLTableCellElement>(`th[data-col-id="${id}"]`)?.offsetWidth ?? 160)
        : stored;
      tableEl.style.setProperty(`--fl-${id}`, `${left}px`);
      // currency-type columns also need a --fl-{id}-code var for the code sub-cell
      if (colMeta[id]?.type === 'currency') {
        tableEl.style.setProperty(`--fl-${id}-code`, `${left + w - 56}px`);
      }
      left += w;
    }
  }, [columnOrder, visibleColumns, frozenColumns, columnWidths, CHECKBOX_COL_WIDTH]);

  // ── Fit columns: measure inner-content width from the DOM to avoid the
  // CSS table-auto "absorb all remaining space" behaviour.
  // Depends on isTableLoading so it only fires once real data cells are in the DOM —
  // skeleton rows use a single colSpan-100 placeholder with no per-column data-col-id.
  // Skips columns that already carry a stored pixel width (user-resized / from localStorage).
  useLayoutEffect(() => {
    if (isTableLoading) return; // skeleton still showing — no real cells to measure yet

    const tableEl = tableElRef.current;
    if (!tableEl) return;

    const fitColIds = activeTab.columns
      .filter(c => colDefaultWidth(c) === 0)
      .map(c => c.id);
    if (fitColIds.length === 0) return;

    const SIDE_PAD = 32; // 16px left + 16px right (px-[16px] class)

    setColumnWidths(prev => {
      const updates: Record<string, number> = {};

      for (const colId of fitColIds) {
        // Skip columns already carrying a stored pixel width.
        if ((prev[colId] ?? 0) !== 0) continue;

        const type = colMeta[colId]?.type ?? '';
        let maxW = 0;

        // Measure content width using Range.getBoundingClientRect() — this reports the
        // actual laid-out text width even when table-layout:fixed collapses the column
        // to 0px, bypassing the visual clipping imposed by overflow:hidden on the cell.
        const measureEl = (el: HTMLElement | null): number => {
          if (!el) return 0;
          const range = document.createRange();
          range.selectNodeContents(el);
          return range.getBoundingClientRect().width;
        };

        // Header: measure the label at its natural (unwrapped) width via canvas.
        // Using Range on the DOM span is unreliable here — the column starts at 0px
        // so the browser wraps long labels, and the Range only returns the longest
        // wrapped line rather than the full single-line width we actually need.
        const th = tableEl.querySelector<HTMLElement>(`th[data-col-id="${colId}"]`);
        if (th) {
          const label = colMeta[colId]?.label ?? colId;
          const labelW = measureText(label, '600 12px "SF Pro Text", system-ui, -apple-system, sans-serif');
          // Account for sort icon (10px icon + 4px margin) when this column is sorted.
          const sortExtra = sortCol === colId ? 14 : 0;
          const hdrNatural = Math.ceil(labelW) + SIDE_PAD + sortExtra;
          maxW = Math.max(maxW, type === 'currency' ? hdrNatural - 56 : hdrNatural);
        }

        // Data cells: measure inner element content width.
        // Range.selectNodeContents measures text ink only — it misses any padding on the
        // inner element itself (e.g. status badge has padding: 2px 6px). Read the actual
        // computed horizontal padding from the inner element and add it explicitly.
        // Currency value td uses pl-[16px] pr-[4px] = 20px total horizontal padding.
        const tds = Array.from(tableEl.querySelectorAll<HTMLElement>(`td[data-col-id="${colId}"]`));
        for (const td of tds) {
          const inner = td.firstElementChild as HTMLElement | null;
          const cellPad = type === 'currency' ? 20 : SIDE_PAD;
          const cs = inner ? getComputedStyle(inner) : null;
          const innerPad = cs ? parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 0;
          maxW = Math.max(maxW, measureEl(inner) + cellPad + (isNaN(innerPad) ? 0 : innerPad));
        }

        if (maxW > 0) {
          // Add 16px breathing room, then clamp to FIT_MAX_WIDTH.
          // Currency stored width = value-cell width + 56px fixed code sub-cell.
          const clampedW = Math.min(maxW + 16, FIT_MAX_WIDTH);
          updates[colId] = type === 'currency' ? clampedW + 56 : clampedW;
        }
      }

      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  // isTableLoading gates execution so we only measure real cells, never skeleton.
  // activeTab.tabId resets eligibility (prev[colId] back to 0) on tab switches.
  // visibleColumns reruns measurement for Fit columns that were hidden at initial
  // load and are revealed by selecting a view or changing table settings.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab.tabId, isTableLoading, visibleColumns]);

  // ── Track sticky bar height so the table header can stick just below it.
  // Writes directly to a CSS custom property instead of React state so the
  // ResizeObserver never triggers a re-render.
  useEffect(() => {
    const el = stickyBarRef.current;
    if (!el) return;
    const setH = () => tableScrollRef.current?.style.setProperty('--sticky-bar-h', el.offsetHeight + 'px');
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    setH();
    return () => ro.disconnect();
  }, []);


  // isScrolled detection via scroll listener.
  // We bail out when scrollTop hasn't changed so horizontal-only scroll events
  // are completely ignored — IntersectionObserver rootMargin gets clipped by
  // the browser at viewport width, making it unreliable for horizontal immunity.
  useEffect(() => {
    const root = tableScrollRef.current;
    const sentinel = stickyTriggerRef.current;
    if (!root || !sentinel) return;

    let prevScrollTop = root.scrollTop;

    const check = (scrollTop: number) => {
      const sentinelTop =
        sentinel.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        scrollTop;
      const newScrolled = scrollTop >= sentinelTop;
      if (newScrolled !== isScrolledRef.current) {
        isScrolledRef.current = newScrolled;
        setIsScrolled(newScrolled);
      }
    };

    const onScroll = () => {
      const scrollTop = root.scrollTop;
      if (scrollTop === prevScrollTop) return; // horizontal-only — skip
      prevScrollTop = scrollTop;
      check(scrollTop);
    };

    check(root.scrollTop); // cover any already-scrolled state on mount
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      isScrolledRef.current = false;
      setIsScrolled(false);
    };
  }, []);

  const openPlusMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 168;
    const center = rect.left + rect.width / 2;
    setPlusMenu(current => {
      if (current) return null;
      const left = Math.max(8, Math.min(center - width / 2, window.innerWidth - 8 - width));
      return { top: rect.bottom + 4, left, center };
    });
  }, []);

  const placeConfirm = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const width = 336;
    const center = rect.left + rect.width / 2;
    const left = Math.max(16, Math.min(center - width / 2, window.innerWidth - 16 - width));
    let top = rect.bottom + 8;
    if (top + 168 > window.innerHeight - 16) top = Math.max(16, rect.top - 8 - 168);
    return { top, left, center };
  };

  const pageContentRef = useRef<HTMLDivElement>(null);
  const filterSearchInputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterSubpageRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const fixedScrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const scrollbarDragging = useRef(false);
  const tableElRef = useRef<HTMLTableElement>(null);
  const [hasTableOverflow, setHasTableOverflow] = useState(false);
  // Detect whether the user's device can scroll horizontally (trackpad / Magic Mouse).
  // We sniff the first wheel event with deltaX != 0, then persist the result in
  // localStorage so trackpad users don't see the scrollbar on subsequent visits.
  const [hasHScrollCapability, setHasHScrollCapability] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('m2-hasHScrollCapability') === '1';
  });
  useEffect(() => {
    if (hasHScrollCapability) return; // already detected — nothing to listen for
    const onWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) {
        setHasHScrollCapability(true);
        localStorage.setItem('m2-hasHScrollCapability', '1');
        window.removeEventListener('wheel', onWheel);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [hasHScrollCapability]);
  // Show the scrollbar when the table overflows AND the user lacks hscroll capability
  // (or the prototype toggle forces it on).
  const SCROLLBAR_H = 16; // matches .fixed-scrollbar height in globals.css
  const showScrollbar = hasTableOverflow && (!hasHScrollCapability || simulateNoHScroll);
  const tableSettingsRef = useRef<HTMLDivElement>(null);
  const tableSettingsBtnRef = useRef<HTMLButtonElement>(null);
  const [tableScrollState, setTableScrollState] = useState({ showLeft: false, showRight: false });
  const tableOuterRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const [colDivider, setColDivider] = useState<{ colId: string; x: number } | null>(null);
  const lastColDivider = useRef<{ colId: string; x: number }>({ colId: '', x: 0 });
  // Header-mode: tracks which column the mouse is anywhere inside (for display only; colDivider still gates resize)
  const [headerHoverCol, setHeaderHoverCol] = useState<{ colId: string; x: number } | null>(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  // Cached column boundary positions — recomputed only when layout changes, not per-mousemove
  const colBoundariesRef = useRef<{ colId: string; x: number }[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => {
      const joined = mq.matches && !noSearch;
      setSearchPlaceholder(joined ? 'Search this page' : 'Search');
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [noSearch]);

  const selectedChip = viewChips.find(c => c.selected);

  // Determine whether current filters/search differ from the selected chip's canonical config
  const selectedChipId = selectedChip?.id ?? '';
  const canonicalConfig = chipListConfigs[selectedChipId] ?? { filters: [], searchQuery: '', sortCol: null, sortDir: 'asc' as const };
  const configChanged = useMemo(() => {
    if (isSelectingChip) return false;
    if (searchValue !== canonicalConfig.searchQuery) return true;
    if (sortCol !== (canonicalConfig.sortCol ?? null)) return true;
    if (sortDir !== (canonicalConfig.sortDir ?? 'asc')) return true;
    if (filterChips.length !== canonicalConfig.filters.length) return true;
    return filterChips.some((fc, i) => {
      const cf = canonicalConfig.filters[i];
      return JSON.stringify(fc) !== JSON.stringify(cf);
    });
  }, [isSelectingChip, searchValue, sortCol, sortDir, filterChips, canonicalConfig]);

  const changeCount = useMemo(() => {
    if (isSelectingChip) return 0;
    let n = 0;
    if (searchValue !== canonicalConfig.searchQuery) n += 1;
    if (sortCol !== (canonicalConfig.sortCol ?? null) || sortDir !== (canonicalConfig.sortDir ?? 'asc')) n += 1;
    const filtersDiffer =
      filterChips.length !== canonicalConfig.filters.length ||
      filterChips.some((fc, i) => JSON.stringify(fc) !== JSON.stringify(canonicalConfig.filters[i]));
    if (filtersDiffer) n += 1;
    return n;
  }, [isSelectingChip, searchValue, sortCol, sortDir, filterChips, canonicalConfig]);


  // Build filter definitions: explicit tab.filters takes priority; otherwise derive from columns.
  const filterDefs: FilterDef[] = activeTab.filters !== undefined
    ? activeTab.filters
    : activeTab.columns
        .filter(c => c.filterOptions !== undefined)
        .map(c => ({
          id: c.id,
          label: c.label,
          type: 'multi-select' as const,
          options: c.filterOptions ?? [],
        }));

  // Labels shown in the main filter menu list
  const filterOptions = filterDefs.map(f => f.label);

  // The definition for whichever filter is currently open in the subpage
  const subpageFilterDef: FilterDef | null = filterDefs.find(f => f.label === selectedFilter) ?? null;

  // Options for multi-select / single-select subpages
  const subpageOptions =
    subpageFilterDef && (subpageFilterDef.type === 'multi-select' || subpageFilterDef.type === 'single-select')
      ? subpageFilterDef.options
      : [];

  const handleFilterClick = (filterLabel: string) => {
    const def = filterDefs.find(f => f.label === filterLabel) ?? null;
    const existing = filterChips.find(c => c.filterName === filterLabel);
    setSelectedFilter(filterLabel);
    setCurrentPage('subpage');
    // Pre-fill from existing chip so re-opening shows the last applied value
    if (def?.type === 'multi-select') {
      setSelectedOptions(existing?.selectedValues ?? []);
    } else if (def?.type === 'single-select') {
      setFilterSingleVal(existing?.selectedValues?.[0] ?? def.options[0] ?? '');
    } else if (def?.type === 'date') {
      setFilterDateOp(existing?.dateOp ?? 'is in the last');
      setFilterDateVal(existing?.dateVal ?? '');
      setFilterDateUnit(existing?.dateUnit ?? 'days');
      setFilterDateTz((existing?.dateTz as 'GMT-8' | 'UTC') ?? 'GMT-8');
    } else if (def?.type === 'value') {
      setFilterValueOp(existing?.valueOp ?? 'is equal to');
      setFilterValueInput(existing?.valueInput ?? '');
    } else {
      setSelectedOptions([]);
    }
  };

  const handleBack = () => {
    if (chipFilterAnchor) {
      setIsFilterMenuOpen(false);
      setCurrentPage('main');
      setSelectedFilter(null);
      setChipFilterAnchor(null);
    } else {
      setCurrentPage('main');
      setSelectedFilter(null);
    }
  };

  const handleApply = () => {
    const def = subpageFilterDef;
    const dismiss = () => { setIsFilterMenuOpen(false); setCurrentPage('main'); setChipFilterAnchor(null); };

    if (!def || !selectedFilter) { dismiss(); return; }

    let newChip: FilterChip;

    if (def.type === 'multi-select') {
      if (selectedOptions.length === 0) { dismiss(); return; }
      newChip = { id: def.id, filterName: def.label, filterType: 'multi-select', selectedValues: selectedOptions };
    } else if (def.type === 'single-select') {
      if (!filterSingleVal) { dismiss(); return; }
      newChip = { id: def.id, filterName: def.label, filterType: 'single-select', selectedValues: [filterSingleVal] };
    } else if (def.type === 'date') {
      if (!filterDateVal.trim()) { dismiss(); return; }
      newChip = {
        id: def.id, filterName: def.label, filterType: 'date', selectedValues: [],
        dateOp: filterDateOp, dateVal: filterDateVal, dateUnit: filterDateUnit, dateTz: filterDateTz,
      };
    } else { // value
      if (!filterValueInput.trim()) { dismiss(); return; }
      newChip = {
        id: def.id, filterName: def.label, filterType: 'value', selectedValues: [],
        valueOp: filterValueOp, valueInput: filterValueInput,
      };
    }

    const existingIdx = filterChips.findIndex(c => c.filterName === selectedFilter);
    if (existingIdx >= 0) {
      const updated = [...filterChips];
      updated[existingIdx] = newChip;
      setFilterChips(updated);
    } else {
      setFilterChips([...filterChips, newChip]);
    }
    dismiss();
  };

  const removeFilterChip = (chipId: string) => {
    setFilterChips(prev => prev.filter(c => c.id !== chipId));
  };

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) 
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  // Sync container height to the active panel, cap at 360px
  useLayoutEffect(() => {
    const container = filterContainerRef.current;
    const subpage = filterSubpageRef.current;
    if (!container || !subpage) return;

    if (currentPage === 'subpage') {
      // Measure natural (unconstrained) height of subpage content
      subpage.style.height = 'auto';
      void subpage.offsetHeight; // force reflow before reading
      const naturalH = Math.min(subpage.scrollHeight, toolbarPopoverBounds?.maxHeight ?? 360);
      // Set an EXACT height on the container so the subpage never inherits
      // the (potentially taller) main-page flow height
      container.style.height = naturalH + 'px';
      container.style.minHeight = '';
      // Subpage fills the container exactly
      subpage.style.height = '100%';
    } else {
      subpage.style.height = '';
      container.style.height = '';
      container.style.minHeight = '';
    }
  }, [currentPage, toolbarPopoverBounds?.maxHeight]);

  // Handle scroll to show/hide gradients
  useEffect(() => {
    // When returning to the main page the multi-select subpage releases
    // scrollContainerRef (sets it to null), so React never re-fires the main
    // page's ref assignment.  Explicitly clear stale gradient state here so
    // the scrim never shows incorrectly on the main filter list.
    if (currentPage === 'main') {
      setShowScrollGradient(false);
      setShowTopScrollGradient(false);
    }

    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        setShowScrollGradient(!isAtBottom);
        setShowTopScrollGradient(scrollTop > 0);
      }
    };

    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      handleScroll(); // Check initial state
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
    }
  }, [isFilterMenuOpen, currentPage, filterSearchQuery]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setIsFilterMenuOpen(false);
        setCurrentPage('main');
        setChipFilterAnchor(null);
      }

      if (
        tableSettingsRef.current &&
        !tableSettingsRef.current.contains(event.target as Node) &&
        tableSettingsBtnRef.current &&
        !tableSettingsBtnRef.current.contains(event.target as Node)
      ) {
        setIsTableSettingsOpen(false);
      }

      if (
        savePhase === 'naming' &&
        saveContainerRef.current &&
        !saveContainerRef.current.contains(event.target as Node)
      ) {
        closeNaming();
      }
    };

    if (isFilterMenuOpen || isTableSettingsOpen || savePhase === 'naming') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterMenuOpen, isTableSettingsOpen, savePhase]);

  useLayoutEffect(() => {
    if (!isFilterMenuOpen && !isTableSettingsOpen) {
      return;
    }
    const measure = () => {
      const root = pageContentRef.current;
      if (!root) return;
      const rootBottom = root.getBoundingClientRect().bottom;
      let top: number;
      if (isFilterMenuOpen && chipFilterAnchor) {
        top = chipFilterAnchor.top + chipFilterAnchor.height + 8;
      } else {
        const trigger = isFilterMenuOpen ? filterButtonRef.current : tableSettingsBtnRef.current;
        top = (trigger?.getBoundingClientRect().bottom ?? 0) + 8;
      }
      setToolbarPopoverBounds({
        top,
        maxHeight: Math.max(160, Math.floor(rootBottom - 24 - top)),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isFilterMenuOpen, isTableSettingsOpen, chipFilterAnchor]);

  useEffect(() => {
    if (!isFilterMenuOpen) {
      setFilterSearchQuery('');
      return;
    }
    if (config.filterSearch && currentPage === 'main') {
      filterSearchInputRef.current?.focus();
    }
  }, [isFilterMenuOpen, currentPage, config.filterSearch]);

  // Close chip-anchored filter popover on window scroll or resize
  useEffect(() => {
    if (!chipFilterAnchor) return;
    const close = () => { setIsFilterMenuOpen(false); setCurrentPage('main'); setChipFilterAnchor(null); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [chipFilterAnchor]);

  // Clear the tab-switch animation suppression after 2 rAFs — enough time for
  // Framer Motion's async exit/enter animation frame to pick up duration:0.
  useEffect(() => {
    if (!suppressTabAnim) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => { setSuppressTabAnim(false); });
    });
    return () => cancelAnimationFrame(id);
  }, [suppressTabAnim]);

  // Freeze the column order for the settings popover when it opens.
  // Columns re-sort only after close so toggling doesn't cause visual thrash.
  useEffect(() => {
    if (isTableSettingsOpen) setPopoverColumns(sortedColumns);
  }, [isTableSettingsOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const menu = plusMenuRef.current;
    if (!plusMenu || !menu) return;
    const width = menu.offsetWidth;
    const left = Math.max(8, Math.min(plusMenu.center - width / 2, window.innerWidth - 8 - width));
    if (Math.abs(left - plusMenu.left) > 0.5) setPlusMenu(prev => prev ? { ...prev, left } : prev);
  }, [plusMenu]);

  useLayoutEffect(() => {
    const popover = confirmPopoverRef.current;
    const confirm = deleteConfirm ?? resetConfirm;
    if (!popover || !confirm) return;
    const width = popover.offsetWidth;
    const left = Math.max(16, Math.min(confirm.center - width / 2, window.innerWidth - 16 - width));
    if (Math.abs(left - confirm.left) <= 0.5) return;
    if (deleteConfirm) setDeleteConfirm(prev => prev ? { ...prev, left } : prev);
    else setResetConfirm(prev => prev ? { ...prev, left } : prev);
  }, [deleteConfirm, resetConfirm]);

  useEffect(() => {
    if (!plusMenu) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (plusMenuRef.current?.contains(target)) return;
      if (target.closest('.lv-plus-trigger')) return;
      setPlusMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlusMenu(null);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [plusMenu]);

  useEffect(() => {
    if (!editViewsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (deleteConfirm) { setDeleteConfirm(null); return; }
      if (resetConfirm) { setResetConfirm(null); return; }
      if (renameChipId) { setRenameChipId(null); return; }
      setEditViewsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [editViewsOpen, deleteConfirm, resetConfirm, renameChipId]);

  useEffect(() => {
    if (!columnMenu) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (columnMenuRef.current?.contains(target)) return;
      // Same header click is handled by openColumnMenu toggle on click — don't close on mousedown.
      const headerTh = (target as HTMLElement).closest?.('th[data-col-id]');
      if (headerTh?.getAttribute('data-col-id') === columnMenu.colId) return;
      setColumnMenu(null);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [columnMenu]);

  useEffect(() => {
    if (!bulkSelectionMenu) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (bulkSelectionMenuRef.current?.contains(target)) return;
      if (headerCheckboxRef.current?.contains(target)) return;
      setBulkSelectionMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBulkSelectionMenu(null);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [bulkSelectionMenu]);

  useEffect(() => {
    if (!chipContextMenu) return;
    const handleDown = (e: MouseEvent) => {
      if (chipContextMenuRef.current && !chipContextMenuRef.current.contains(e.target as Node)) {
        setChipContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [chipContextMenu]);

  useEffect(() => {
    if (!pageSizeMenuOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (
        pageSizeMenuRef.current && !pageSizeMenuRef.current.contains(e.target as Node) &&
        pageSizeTriggerRef.current && !pageSizeTriggerRef.current.contains(e.target as Node)
      ) {
        setPageSizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [pageSizeMenuOpen]);

  // Shimmer loading trigger — fires on mount and whenever data-driving state changes.
  // Trigger the shimmer overlay. Clears after one render tick so the CSS
  // transition handles the fade-out — no artificial delay added.
  const triggerShimmer = () => {
    // Don't interfere with the initial load skeleton
    if (initialLoadActiveRef.current) return;
    if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current);
    setIsTableLoading(true);
    // Don't set a timeout if foreverLoading is active — stay loading forever
    if (!foreverLoading) {
      shimmerTimerRef.current = setTimeout(() => setIsTableLoading(false), 0);
    }
  };

  // Smooth 200ms scroll-to-top for the main scroll container
  const scrollToTableTop = () => {
    const el = tableScrollRef.current;
    if (!el || el.scrollTop === 0) return;
    // Trigger expand animation immediately, in sync with the scroll
    setIsScrolled(false);
    const start = el.scrollTop;
    const startTime = performance.now();
    const duration = 300;
    const raf = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      el.scrollTop = start * (1 - eased);
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  };

  // When foreverLoading is toggled on, immediately show shimmer and keep it.
  // When toggled off, hide shimmer.
  useEffect(() => {
    if (foreverLoading) {
      if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current);
      setIsTableLoading(true);
    } else {
      if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current);
      setIsTableLoading(false);
    }
  }, [foreverLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // initial load — skeleton rows shown to simulate real-world load time
    setIsTableLoading(true);
    const t = setTimeout(() => {
      initialLoadActiveRef.current = false;
      setIsTableLoading(false);
      setIsInitialLoad(false);
    }, 1000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabMountedRef = useRef(false);
  useEffect(() => { // tab change — skeleton rows shown to simulate real-world load time
    if (!tabMountedRef.current) { tabMountedRef.current = true; return; }
    initialLoadActiveRef.current = true;
    setIsTableLoading(true);
    setIsInitialLoad(true);
    if (shimmerTimerRef.current) clearTimeout(shimmerTimerRef.current);
    const t = setTimeout(() => {
      initialLoadActiveRef.current = false;
      setIsTableLoading(false);
      setIsInitialLoad(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [activeTabIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollToTableTop(); }, [debouncedSearch]);  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToTableTop(); }, [filterChips]);      // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToTableTop(); }, [paginationPage]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { /* pageSize change — no scroll reset */ }, [pageSize]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToTableTop(); }, [sortCol, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setTableScrollState({
        showLeft: scrollLeft > 0,
        showRight: scrollLeft < scrollWidth - clientWidth - 1,
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  // Overflow detection — runs independently of the scrollbar element being mounted.
  // This must be separate from the bar-sync effect so hasTableOverflow is set even
  // before the scrollbar div exists in the DOM.
  useEffect(() => {
    const table = tableScrollRef.current;
    if (!table) return;
    const check = () => setHasTableOverflow(table.scrollWidth > table.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(table);
    const tableEl = table.querySelector('table');
    if (tableEl) ro.observe(tableEl);
    return () => ro.disconnect();
  }, []);

  // Custom scrollbar — renders a track+thumb that mirror the table's horizontal scroll.
  // Bar left/width come from React state (paginationLeft/tableClientWidth) so dimensions
  // are correct on the very first paint. This effect only handles thumb positioning and
  // scroll/drag/click interaction. Re-runs when showScrollbar or tableClientWidth changes.
  useEffect(() => {
    const table = tableScrollRef.current;
    const bar = fixedScrollbarRef.current;
    const thumb = scrollbarThumbRef.current;
    if (!table || !bar || !thumb) return;

    const updateThumb = () => {
      const maxScroll = table.scrollWidth - table.clientWidth;
      if (maxScroll <= 0) { thumb.style.opacity = '0'; return; }
      thumb.style.opacity = '1';
      const trackWidth = bar.clientWidth;
      const thumbWidth = Math.max(40, trackWidth * (table.clientWidth / table.scrollWidth));
      const thumbLeft = (table.scrollLeft / maxScroll) * (trackWidth - thumbWidth);
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${thumbLeft}px) translateY(-50%)`;
    };

    updateThumb();
    table.addEventListener('scroll', updateThumb, { passive: true });

    // Drag the thumb to scroll
    const onThumbMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      scrollbarDragging.current = true;
      const startX = e.clientX;
      const startScrollLeft = table.scrollLeft;
      const maxScroll = table.scrollWidth - table.clientWidth;
      const trackWidth = bar.clientWidth;
      const thumbWidth = Math.max(40, trackWidth * (table.clientWidth / table.scrollWidth));
      const scrollPerPx = maxScroll / (trackWidth - thumbWidth);
      thumb.style.transition = 'none';
      const onMouseMove = (ev: MouseEvent) => {
        table.scrollLeft = Math.max(0, Math.min(maxScroll, startScrollLeft + (ev.clientX - startX) * scrollPerPx));
      };
      const onMouseUp = () => {
        scrollbarDragging.current = false;
        thumb.style.transition = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    thumb.addEventListener('mousedown', onThumbMouseDown);

    // Click on track (not thumb) to jump scroll
    const onTrackClick = (e: MouseEvent) => {
      if (e.target === thumb) return;
      const trackWidth = bar.clientWidth;
      const maxScroll = table.scrollWidth - table.clientWidth;
      const rect = bar.getBoundingClientRect();
      table.scrollLeft = ((e.clientX - rect.left) / trackWidth) * maxScroll;
    };
    bar.addEventListener('click', onTrackClick);

    // Re-compute thumb whenever column widths or viewport changes
    const ro = new ResizeObserver(updateThumb);
    ro.observe(table);
    const tableEl = table.querySelector('table');
    if (tableEl) ro.observe(tableEl);

    return () => {
      table.removeEventListener('scroll', updateThumb);
      thumb.removeEventListener('mousedown', onThumbMouseDown);
      bar.removeEventListener('click', onTrackClick);
      ro.disconnect();
    };
  }, [showScrollbar]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTableMouseMove = (e: React.MouseEvent) => {
    if (resizingCol) return; // divider is driven by startResize during an active drag
    if (dragColId) return;   // skip divider detection while reordering columns
    if (!tableOuterRef.current || !theadRef.current) return;
    const outerRect = tableOuterRef.current.getBoundingClientRect();
    const mouseX = e.clientX - outerRect.left;

    // Only show the resize cursor / divider when hovering over the header row
    const theadRect = theadRef.current.getBoundingClientRect();
    const inHeader = e.clientY >= theadRect.top && e.clientY <= theadRect.bottom;

    if (inHeader) {
      // Use cached boundaries — no getBoundingClientRect per frame
      const near = colBoundariesRef.current.find(b => Math.abs(mouseX - b.x) <= 16) ?? null;
      if (near) {
        lastColDivider.current = near;
        document.body.classList.add('col-resizing');
        if (near.colId !== colDivider?.colId) setColDivider(near);
      } else {
        document.body.classList.remove('col-resizing');
        if (colDivider !== null) setColDivider(null);
      }
    } else {
      document.body.classList.remove('col-resizing');
      if (colDivider !== null) setColDivider(null);
    }

    // Header mode: track the column the mouse is anywhere inside for display purposes
    if (columnResizeStyle === 'header') {
      if (inHeader) {
        // Find the first boundary whose right edge is to the right of the mouse —
        // that means the mouse is inside that column.
        const hovered = colBoundariesRef.current.find(b => mouseX <= b.x) ?? null;
        if (hovered) {
          if (hovered.colId !== headerHoverCol?.colId) setHeaderHoverCol(hovered);
        } else {
          if (headerHoverCol !== null) setHeaderHoverCol(null);
        }
      } else {
        if (headerHoverCol !== null) setHeaderHoverCol(null);
      }
    }
  };

  const handleTableMouseLeave = () => {
    if (!resizingCol) {
      setColDivider(null);
      setHeaderHoverCol(null);
      document.body.classList.remove('col-resizing');
    }
  };


  const tableRows = activeTab.data;

  const refField = activeTab.refundableField ?? 'status';
  const refValue = activeTab.refundableValue ?? 'Active';
  const refundableSelected = Array.from(selectedRows).filter(i => tableRows[i]?.[refField] === refValue).length;

  const deleteChip = (id: string) => {
    if (isLockedView(id)) return;
    const chip = viewChips.find(c => c.id === id);
    if (!chip) return;
    if (defaultChipId === id) setDefaultChipId(primaryChipId);
    // If deleting the currently selected chip, fall back to the first available chip
    if (chip.selected) {
      const fallback = viewChips.find(c => c.id !== id);
      if (fallback) selectChip(fallback.id);
    }
    setViewChips(prev => prev.filter(c => c.id !== id));
    setPinnedViewIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    delete chipListConfigsRef.current[id];
    delete chipSettingsRef.current[id];
    lsSet(LS.configs, chipListConfigsRef.current);
    setDeleteConfirm(null);
  };

  const duplicateChip = (source: ViewChip) => {
    const newId = `custom-${Date.now()}`;
    const labels = new Set(viewChips.map(chip => chip.label));
    const copyLabel = `${source.label} copy`;
    let label = copyLabel;
    let copyNumber = 2;
    while (labels.has(label)) {
      label = `${copyLabel} ${copyNumber}`;
      copyNumber += 1;
    }

    if (source.selected) {
      chipSettingsRef.current[source.id] = {
        columnWidths: { ...columnWidths },
        visibleColumns: Array.from(visibleColumns),
        columnOrder: [...columnOrder],
      };
    }

    const sourceConfig = chipListConfigsRef.current[source.id] ?? {
      filters: [],
      searchQuery: '',
      sortCol: null,
      sortDir: 'asc' as const,
    };
    chipListConfigsRef.current[newId] = {
      ...sourceConfig,
      filters: sourceConfig.filters.map(filter => ({
        ...filter,
        selectedValues: [...filter.selectedValues],
      })),
    };

    const sourceDefinition = (activeTab.defaultViewChips ?? []).find(chip => chip.id === source.id);
    const defaultColumnIds = activeTab.columns.map(column => column.id);
    const sourceVisibleColumns = sourceDefinition?.columns
      ? sourceDefinition.columns.filter(columnId => defaultColumnIds.includes(columnId))
      : activeTab.columns.filter(column => column.defaultVisible !== false).map(column => column.id);
    const sourceSettings = chipSettingsRef.current[source.id] ?? {
      columnWidths: Object.fromEntries(activeTab.columns.map(column => [column.id, colDefaultWidth(column)])),
      visibleColumns: sourceVisibleColumns,
      columnOrder: [...sourceVisibleColumns, ...defaultColumnIds.filter(id => !sourceVisibleColumns.includes(id))],
    };
    chipSettingsRef.current[newId] = {
      columnWidths: { ...sourceSettings.columnWidths },
      visibleColumns: [...sourceSettings.visibleColumns],
      columnOrder: sourceSettings.columnOrder ? [...sourceSettings.columnOrder] : undefined,
    };
    try {
      localStorage.setItem(CHIP_SETTINGS_KEY, JSON.stringify(chipSettingsRef.current));
    } catch { /* storage unavailable */ }

    lsSet(LS.configs, chipListConfigsRef.current);
    justCommittedChipIdRef.current = newId;
    setViewChips(prev => [...prev.map(chip => ({ ...chip, selected: false })), {
      id: newId,
      label,
      selected: true,
    }]);
    setPinnedViewIds(prev => new Set(prev).add(newId));
    setChipContextMenu(null);
    selectChip(newId);
    requestAnimationFrame(() => { justCommittedChipIdRef.current = null; });
  };

  const toggleViewShown = (id: string) => {
    if (id === primaryChipId) return;
    const hiding = pinnedViewIds.has(id);
    if (hiding && viewChips.find(c => c.id === id)?.selected) selectChip(primaryChipId);
    if (hiding && defaultChipId === id) setDefaultChipId(primaryChipId);
    setPinnedViewIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetPageToStripeDefaults = () => {
    const prefixes = [`${config.pageId}-`, `m2-${config.pageId}-`];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixes.some(prefix => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
    window.location.replace(`${basePath}/${initialTabId}/`);
  };

  const startCreateView = () => {
    setPlusMenu(null);
    setSaveAsName('');
    setSavePhase('naming');
  };

  const openEditViews = () => {
    setPlusMenu(null);
    setEditViewsOpen(true);
  };

  const commitEditRename = () => {
    const trimmed = renameValue.trim();
    if (!renameChipId || isLockedView(renameChipId)) {
      setRenameChipId(null);
      return;
    }
    if (!trimmed) {
      setRenameChipId(null);
      return;
    }
    setViewChips(prev => prev.map(c => c.id === renameChipId ? { ...c, label: trimmed } : c));
    setRenameChipId(null);
  };

  const closeEditViews = () => {
    setEditViewsOpen(false);
    setDeleteConfirm(null);
    setResetConfirm(null);
    setRenameChipId(null);
    setEditRowHoverId(null);
  };

  const sortedEditViewChips = [...viewChips].sort((a, b) => {
    if (a.id === primaryChipId) return -1;
    if (b.id === primaryChipId) return 1;
    const aHidden = pinnedViewIds.has(a.id) ? 0 : 1;
    const bHidden = pinnedViewIds.has(b.id) ? 0 : 1;
    return aHidden - bHidden;
  });
  const customEditViewChips = sortedEditViewChips.filter(chip => !isStripeDefaultView(chip.id));
  const editViewGroups = lockedDefaults && customEditViewChips.length > 0
    ? [
        { label: 'Stripe defaults', chips: sortedEditViewChips.filter(chip => isStripeDefaultView(chip.id)) },
        { label: 'Custom', chips: customEditViewChips },
      ]
    : [{ label: null, chips: sortedEditViewChips }];

  const selectChip = (id: string) => {
    scrollToTableTop();
    // Save current chip's table settings
    const currentId = viewChips.find(c => c.selected)?.id;
    if (currentId) {
      chipSettingsRef.current[currentId] = {
        columnWidths,
        visibleColumns: Array.from(visibleColumns),
        columnOrder,
      };
    }

    // Urgent: update chip selection and reset save state — allows the box-shadow animation to start
    // immediately. isSelectingChip suppresses configChanged during the deferred transition window.
    setViewChips(prev => prev.map(chip => ({ ...chip, selected: chip.id === id })));
    setSavePhase('idle');
    setSaveAsName('');
    setIsSelectingChip(true);

    // Deferred: loading column config / filters / search triggers heavy table re-renders
    // (shimmer + 238 rows re-rendering). Wrapping in startTransition lets React yield to the
    // browser between render slices, so the 150ms animation frames can run unblocked.
    startTransition(() => {
      setIsSelectingChip(false);
      const saved = chipSettingsRef.current[id];
      if (saved) {
        suppressSaveIndicatorRef.current = true;
        setColumnWidths(saved.columnWidths);
        setVisibleColumns(new Set(saved.visibleColumns));
        if (saved.columnOrder) {
          const savedOrder = saved.columnOrder;
          const allColIds = activeTab.columns.map(c => c.id);
          const merged = [...savedOrder, ...allColIds.filter(id => !savedOrder.includes(id))];
          columnOrderRef.current = merged;
          setColumnOrder(merged);
        }
      } else {
        // No user-saved state — check if the chip config defines a default column set
        const chipDef = (activeTab.defaultViewChips ?? []).find(d => d.id === id);
        if (chipDef?.columns) {
          const allColIds = activeTab.columns.map(c => c.id);
          const defCols = chipDef.columns.filter((c: string) => allColIds.includes(c));
          suppressSaveIndicatorRef.current = true;
          setVisibleColumns(new Set(defCols));
          const merged = [...defCols, ...allColIds.filter(c => !defCols.includes(c))];
          columnOrderRef.current = merged;
          setColumnOrder(merged);
        }
      }
      const cfg = chipListConfigs[id];
      setFilterChips(cfg?.filters ?? []);
      setSearchValue(cfg?.searchQuery ?? '');
      setDebouncedSearch(cfg?.searchQuery ?? '');
      setSortCol(cfg?.sortCol ?? null);
      setSortDir(cfg?.sortDir ?? 'asc');
    });
  };

  const commitSave = (name: string) => {
    const newId = `custom-${Date.now()}`;
    // Mark before state update so the motion.div sees it on first render
    justCommittedChipIdRef.current = newId;
    chipListConfigs[newId] = { filters: [...filterChips], searchQuery: searchValue, sortCol, sortDir };
    lsSet(LS.configs, chipListConfigs); // persist custom chip filter config
    const newChip: ViewChip = { id: newId, label: name, selected: true };
    setViewChips(prev => [...prev.map(c => ({ ...c, selected: false })), newChip]);
    setPinnedViewIds(prev => { const next = new Set(prev); next.add(newId); return next; });
    setSavePhase('idle');
    setSaveAsName('');
    // Clear after mount so subsequent re-renders aren't affected
    requestAnimationFrame(() => { justCommittedChipIdRef.current = null; });
  };

  const saveCurrentView = () => {
    if (!selectedChipId) return;
    chipListConfigs[selectedChipId] = {
      filters: [...filterChips],
      searchQuery: searchValue,
      sortCol,
      sortDir,
    };
    lsSet(LS.configs, chipListConfigs);
    setChipListConfigRevision(revision => revision + 1);
    if (savedToast) {
      setSaveToast({ label: selectedChip?.label ?? 'view' });
      window.setTimeout(() => setSaveToast(null), 5200);
    }
  };

  const resetCurrentView = () => {
    const cfg = chipListConfigs[selectedChipId];
    setFilterChips(cfg?.filters ?? []);
    setSearchValue(cfg?.searchQuery ?? '');
    setDebouncedSearch(cfg?.searchQuery ?? '');
    setSortCol(cfg?.sortCol ?? null);
    setSortDir(cfg?.sortDir ?? 'asc');
  };

  const SAVE_EASING = 'cubic-bezier(0.2, 0, 0.1, 1)';
  /** While a new view is being named, it owns the selection highlight. */
  const isCreatingView = savePhase !== 'idle';
  const CREATE_VIEW_SHADOW = '0 0 0 2px #533AFD, 0px 2px 3px 0px rgba(33,37,44,0.16)';
  const RENAME_FIELD_WIDTH = 240;

  const startChipRename = (chipId: string, label: string) => {
    if (isLockedView(chipId)) return;
    const el = document.querySelector(`[data-chip-id="${chipId}"]`) as HTMLElement | null;
    const selected = viewChips.find(c => c.id === chipId)?.selected;
    setChipRenameFromWidth(el?.getBoundingClientRect().width ?? null);
    setChipRenameStartShadow(selected ? CHIP_SHADOW_SELECTED : CHIP_SHADOW_UNSELECTED);
    setChipRenameValue(label);
    setChipRenamePhase('naming');
    setChipRenameId(chipId);
    setChipContextMenu(null);
  };

  const finishChipRename = () => {
    setChipRenameId(null);
    setChipRenamePhase(null);
    setChipRenameFromWidth(null);
    if (chipRenameContainerRef.current) delete chipRenameContainerRef.current.dataset.entered;
  };

  const cancelChipRename = () => {
    const el = chipRenameContainerRef.current;
    if (!el) { finishChipRename(); return; }
    el.style.transition = `width 220ms ${SAVE_EASING}, box-shadow 220ms ${SAVE_EASING}`;
    el.style.width = `${chipRenameFromWidth ?? el.offsetWidth}px`;
    el.style.boxShadow = chipRenameStartShadow;
    window.setTimeout(finishChipRename, 220);
  };

  const saveChipRename = () => {
    const name = chipRenameValue.trim();
    if (!name || !chipRenameId) return;
    const el = chipRenameContainerRef.current;
    if (!el) {
      setViewChips(prev => prev.map(c => c.id === chipRenameId ? { ...c, label: name } : c));
      finishChipRename();
      return;
    }
    flushSync(() => setChipRenamePhase('committing'));
    el.style.transition = 'none';
    el.style.width = 'max-content';
    el.getBoundingClientRect();
    const targetW = el.offsetWidth;
    el.style.width = `${RENAME_FIELD_WIDTH}px`;
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = `width 200ms ${SAVE_EASING}, box-shadow 200ms ${SAVE_EASING}`;
      el.style.width = `${targetW}px`;
      el.style.boxShadow = chipRenameStartShadow;
    });
    window.setTimeout(() => {
      setViewChips(prev => prev.map(c => c.id === chipRenameId ? { ...c, label: name } : c));
      finishChipRename();
    }, 210);
  };

  const renderChipRenameEditor = () => (
    <div
      ref={chipRenameContainerRef}
      className="relative bg-white flex items-center rounded-[8px]"
      style={{
        boxShadow: chipRenameStartShadow,
        height: 'var(--lv-row-h, 40px)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        width: chipRenameFromWidth ?? RENAME_FIELD_WIDTH,
        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
      }}
    >
      {chipRenamePhase === 'naming' && (
        <input
          ref={chipRenameInputRef}
          autoFocus
          type="text"
          placeholder="Name your view"
          value={chipRenameValue}
          onChange={e => setChipRenameValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') saveChipRename();
            if (e.key === 'Escape') cancelChipRename();
          }}
          onMouseDown={e => e.stopPropagation()}
          className="text-[14px] font-normal leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)] placeholder:text-[#9AA3B0] outline-none bg-transparent"
          style={{ paddingLeft: 12, flex: 1, minWidth: 0 }}
        />
      )}
      {chipRenamePhase === 'committing' && (
        <span
          className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)]"
          style={{ paddingLeft: 12, paddingRight: 12, whiteSpace: 'nowrap' }}
        >
          {chipRenameValue}
        </span>
      )}
      {chipRenamePhase === 'naming' && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
          onClick={cancelChipRename}
          className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] cursor-pointer bg-transparent border-none outline-none shrink-0"
          style={{ padding: '0 4px', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--neutral-600)' }}
        >
          Cancel
        </button>
      )}
      {chipRenamePhase === 'naming' && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
          onClick={saveChipRename}
          className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[#533AFD] cursor-pointer bg-transparent border-none outline-none shrink-0"
          style={{ paddingLeft: 4, paddingRight: 12, height: '100%', display: 'flex', alignItems: 'center' }}
        >
          Save
        </button>
      )}
    </div>
  );

  useLayoutEffect(() => {
    if (!chipRenameId || chipRenamePhase !== 'naming') return;
    const el = chipRenameContainerRef.current;
    if (!el || el.dataset.entered) return;
    el.dataset.entered = '1';
    const startW = chipRenameFromWidth ?? el.offsetWidth;
    el.style.transition = 'none';
    el.style.width = `${startW}px`;
    el.style.boxShadow = chipRenameStartShadow;
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = `width 220ms ${SAVE_EASING}, box-shadow 220ms ${SAVE_EASING}`;
      el.style.width = `${RENAME_FIELD_WIDTH}px`;
      el.style.boxShadow = CREATE_VIEW_SHADOW;
    });
  }, [chipRenameId, chipRenamePhase, chipRenameFromWidth, chipRenameStartShadow]);

  // paddingLeft of the text button in each phase — used to align FLIP by text position, not box edge
  const SAVE_BTN_IDLE_PL = 30;
  const SAVE_BTN_NAMING_PL = 6;

  const openNaming = () => {
    const el = saveContainerRef.current;
    const textBtn = saveTextRef.current;
    if (!el || !textBtn) return;

    const startW = el.offsetWidth;
    const startRect = textBtn.getBoundingClientRect();

    // Immediately apply naming layout so we can measure button's new position
    flushSync(() => setSavePhase('naming'));

    // Lock container to start width, force reflow, then measure button's end position
    el.style.transition = 'none';
    el.style.width = `${startW}px`;
    el.getBoundingClientRect();
    const endRect = textBtn.getBoundingClientRect();
    // Compensate for the padding difference so the text (not the box edge) starts in place
    const deltaX = startRect.left - endRect.left + (SAVE_BTN_IDLE_PL - SAVE_BTN_NAMING_PL);

    // Jump button back so its text aligns with the idle "Save as" text position
    textBtn.style.transition = 'none';
    textBtn.style.transform = `translateX(${deltaX}px)`;
    el.getBoundingClientRect();

    // Animate both container and button to their naming positions
    requestAnimationFrame(() => {
      el.style.transition = `width 220ms ${SAVE_EASING}`;
      el.style.width = '240px';
      textBtn.style.transition = `transform 220ms ${SAVE_EASING}`;
      textBtn.style.transform = 'translateX(0px)';
    });
    setTimeout(() => {
      textBtn.style.transition = '';
      textBtn.style.transform = '';
    }, 225);
  };

  const closeNaming = () => {
    const el = saveContainerRef.current;
    const textBtn = saveTextRef.current;
    if (!el || !textBtn) { setSavePhase('idle'); setSaveAsName(''); return; }

    const startW = el.offsetWidth;
    const startRect = textBtn.getBoundingClientRect();

    // Immediately apply idle layout
    flushSync(() => { setSavePhase('idle'); setSaveAsName(''); });

    // Lock to naming width so we can measure button position in idle layout at that width
    el.style.transition = 'none';
    el.style.width = `${startW}px`;
    el.getBoundingClientRect();
    const endRectAtStart = textBtn.getBoundingClientRect();

    // Measure natural idle width
    el.style.width = 'max-content';
    el.getBoundingClientRect();
    const endW = el.offsetWidth;

    // Compensate for padding difference so the text aligns with where "Save" was
    const deltaX = startRect.left - endRectAtStart.left - (SAVE_BTN_IDLE_PL - SAVE_BTN_NAMING_PL);
    textBtn.style.transition = 'none';
    textBtn.style.transform = `translateX(${deltaX}px)`;
    el.style.width = `${startW}px`;
    el.getBoundingClientRect();

    // Animate both to idle positions
    requestAnimationFrame(() => {
      el.style.transition = `width 220ms ${SAVE_EASING}`;
      el.style.width = `${endW}px`;
      textBtn.style.transition = `transform 220ms ${SAVE_EASING}`;
      textBtn.style.transform = 'translateX(0px)';
    });
    setTimeout(() => {
      el.style.width = '';
      el.style.transition = '';
      textBtn.style.transition = '';
      textBtn.style.transform = '';
    }, 225);
  };

  const handleSave = () => {
    const name = saveAsName.trim();
    if (!name) return;
    const el = saveContainerRef.current;
    if (!el) return;

    // Switch to committing phase — renders chip label content, removes naming content from flow
    flushSync(() => setSavePhase('committing'));

    // Measure the chip's natural width now that the label is in the DOM
    el.style.transition = 'none';
    el.style.width = 'max-content';
    el.getBoundingClientRect();
    const targetW = el.offsetWidth;

    // Reset to naming width, then animate to chip width
    el.style.width = '240px';
    el.getBoundingClientRect();

    requestAnimationFrame(() => {
      el.style.transition = `width 200ms ${SAVE_EASING}, box-shadow 200ms cubic-bezier(0.2, 0, 0.1, 1)`;
      el.style.width = `${targetW}px`;
      // Morph border from purple pill to chip-selected shadow
      el.style.boxShadow = '0 0 0 2px var(--neutral-900), 0px 2px 3px 0px rgba(33,37,44,0.16)';
    });

    setTimeout(() => { commitSave(name); }, 210);
  };

  const handleChipMouseDown = (e: React.MouseEvent, chipId: string) => {
    if (e.button !== 0) return;
    if (chipId === primaryChipId) return; // primary "All" chip is always first — not draggable
    e.preventDefault();

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Capture pinned/selected state at mousedown (won't change during drag)
    const capturedPinnedIds = new Set(pinnedViewIds);

    chipGhostPosRef.current = { x: rect.left, y: rect.top };
    chipGhostSizeRef.current = { w: rect.width, h: rect.height };
    chipDragHappenedRef.current = false;
    chipDragIdRef.current = chipId;

    // Initial displayed order
    const getDisplayed = () => [...viewChipsRef.current]
      .filter(c => capturedPinnedIds.has(c.id) || c.selected)
      .sort((a, b) => (capturedPinnedIds.has(a.id) ? 0 : 1) - (capturedPinnedIds.has(b.id) ? 0 : 1));

    chipCurrentOrderRef.current = getDisplayed().map(c => c.id);

    // Capture each chip's rendered width at mousedown — same approach as capturedDomWidths
    // for columns. Re-used on every frame instead of querying the DOM each time.
    const capturedChipWidths: Record<string, number> = {};
    if (chipRowRef.current) {
      chipRowRef.current.querySelectorAll<HTMLElement>('[data-chip-id]').forEach(el => {
        capturedChipWidths[el.dataset.chipId!] = el.getBoundingClientRect().width;
      });
    }
    const CHIP_GAP = 8; // matches gap-[8px] on the flex row

    // Hysteresis state — persists across all mousemove events for this drag
    let chipFinalIdx = -1;          // insertion slot in withoutDragged space
    let prevChipCenterX: number | null = null;

    const onMouseMove = (me: MouseEvent) => {
      if (!chipDragHappenedRef.current) {
        if (Math.abs(me.clientX - startX) < 5) return;
        chipDragHappenedRef.current = true;
        setDragChipId(chipId);
        document.body.style.cursor = 'grabbing';
      }

      // Move ghost
      const ghostX = me.clientX - offsetX;
      const ghostY = me.clientY - offsetY;
      chipGhostPosRef.current = { x: ghostX, y: ghostY };
      if (chipGhostRef.current) {
        chipGhostRef.current.style.left = `${ghostX}px`;
        chipGhostRef.current.style.top  = `${ghostY}px`;
      }

      if (!chipRowRef.current) return;

      const currentOrder = chipCurrentOrderRef.current;
      const ghostCenterX = ghostX + chipGhostSizeRef.current.w / 2;

      // Build left-edge positions of non-dragged chips based on current logical order
      // and captured widths. The dragged slot still occupies space in the flex row,
      // so its width is included when it precedes other chips — same as leftEdgesNd
      // for columns.
      const rowLeft = chipRowRef.current.getBoundingClientRect().left;
      const ndLeftEdges: number[] = [];
      const ndWidths: number[] = [];
      let cumX = rowLeft;
      for (const id of currentOrder) {
        const w = capturedChipWidths[id] ?? chipGhostSizeRef.current.w;
        if (id === chipId) { cumX += w + CHIP_GAP; continue; }
        ndLeftEdges.push(cumX);
        ndWidths.push(w);
        cumX += w + CHIP_GAP;
      }
      const Nnd = ndLeftEdges.length;

      // Initialise on first move: find the correct slot by scanning from the left
      if (chipFinalIdx === -1) {
        chipFinalIdx = 0;
        for (let i = 0; i < Nnd; i++) {
          if (ghostCenterX > ndLeftEdges[i] + 0.1 * ndWidths[i]) chipFinalIdx = i + 1;
          else break;
        }
        prevChipCenterX = ghostCenterX;
      }

      // RIGHT: advance when ghost center crosses 10%-from-left of the next chip
      while (chipFinalIdx < Nnd) {
        const thr = ndLeftEdges[chipFinalIdx] + 0.1 * ndWidths[chipFinalIdx];
        if ((prevChipCenterX ?? ghostCenterX) <= thr && ghostCenterX > thr) chipFinalIdx++;
        else break;
      }
      // LEFT: retreat when ghost center crosses 90%-from-left (= 10%-from-right) of the previous chip
      while (chipFinalIdx > 0) {
        const thr = ndLeftEdges[chipFinalIdx - 1] + 0.9 * ndWidths[chipFinalIdx - 1];
        if ((prevChipCenterX ?? ghostCenterX) >= thr && ghostCenterX < thr) chipFinalIdx--;
        else break;
      }
      prevChipCenterX = ghostCenterX;

      // Build new order; bail if unchanged
      const withoutDragged = currentOrder.filter(id => id !== chipId);
      const newOrder = [...withoutDragged];
      // Never allow a chip to be placed before "All" (id '1') which is always first
      const allFirstIdx = withoutDragged[0] === primaryChipId ? 1 : 0;
      newOrder.splice(Math.max(allFirstIdx, Math.min(chipFinalIdx, withoutDragged.length)), 0, chipId);
      if (newOrder.join(',') === currentOrder.join(',')) return;

      // Snapshot current positions for FLIP (before React re-renders)
      chipRowRef.current.querySelectorAll<HTMLElement>('[data-chip-id]').forEach(nd => {
        chipFLIPSnapRef.current[nd.dataset.chipId!] = nd.getBoundingClientRect().left;
      });

      chipCurrentOrderRef.current = newOrder;

      // Apply new order to viewChips
      const chips = viewChipsRef.current;
      const newDisplayed = newOrder.map(id => chips.find(c => c.id === id)!).filter(Boolean);
      const displayedIds = new Set(newOrder);
      const rest = chips.filter(c => !displayedIds.has(c.id));
      setViewChips([...newDisplayed, ...rest]);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      chipDragHappenedRef.current = false;
      chipDragIdRef.current = null;
      chipCurrentOrderRef.current = [];
      chipFLIPSnapRef.current = {};
      setDragChipId(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleColMouseDown = (e: React.MouseEvent, colId: string) => {
    if (e.button !== 0) return;
    if (colDivider !== null) { startResize(e, colDivider.colId); return; } // Resize from header only
    e.preventDefault();
    dragColHappenedRef.current = false;
    const startX = e.clientX;

    // Capture state at mousedown — stable for the whole drag
    const capturedVisible = visibleColumns;
    // Read actual rendered widths from DOM — state values can diverge from the
    // real layout (table algorithm, min-width, etc.) and cause cumulative drift.
    const capturedDomWidths: Record<string, number> = {};
    theadRef.current?.querySelectorAll<HTMLElement>('th[data-col-id]').forEach(th => {
      capturedDomWidths[th.dataset.colId!] = th.getBoundingClientRect().width;
    });
    // Original visible column order — stable throughout drag
    const capturedVisibleOrder = columnOrderRef.current.filter(c => visibleColumns.has(c));
    // Non-dragged columns in original order — relative order never changes (only dragged col moves)
    const withoutDraggedCaptured = capturedVisibleOrder.filter(c => c !== colId);
    // Mutable: updated synchronously after each FLIP so thresholds always reflect
    // the current column layout rather than the original pre-drag layout.
    let currentVisibleOrder = capturedVisibleOrder;

    // Hysteresis state — persists across all mousemove events for this drag
    // dragFinalIdx is in withoutDragged space: 0 = before all, N-1 = after all
    let dragFinalIdx = -1;
    let prevDragCenterX: number | null = null;

    const thRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragColClickOffsetRef.current = {
      x: e.clientX - thRect.left,
      y: e.clientY - thRect.top,
    };

    document.body.style.userSelect = 'none';

    const onMouseMove = (me: MouseEvent) => {
      if (!dragColHappenedRef.current) {
        if (Math.abs(me.clientX - startX) < 5) return;
        dragColHappenedRef.current = true;
        ghostPosRef.current = { x: me.clientX, y: me.clientY };
        // Capture which row is at the top of the visible table body so the ghost mirrors scroll state.
        // stickyBarHeight + theadHeight are CSS top-values relative to tableScrollRef, so add
        // tableScrollRef's viewport top to convert to the same coordinate space as getBoundingClientRect.
        {
          const tbody = theadRef.current?.closest('table')?.querySelector('tbody');
          const tbodyTop = tbody?.getBoundingClientRect().top ?? 0;
          const scrollContainerTop = tableScrollRef.current?.getBoundingClientRect().top ?? 0;
          const stickyBarH = parseFloat(tableScrollRef.current?.style.getPropertyValue('--sticky-bar-h') || '0');
          const stickyBottom = scrollContainerTop + stickyBarH + (theadRef.current?.offsetHeight ?? 32);
          const scrolledPx = Math.max(0, stickyBottom - tbodyTop);
          dragGhostRowOffsetRef.current = Math.floor(scrolledPx / 44);
        }
        setDragColId(colId);
        document.body.style.cursor = 'grabbing';
        // Hide any active resize divider and clear the col-resize cursor
        setColDivider(null);
        document.body.classList.remove('col-resizing');
      }

      // Move ghost directly in DOM — bypasses React, keeps FLIP animations undisturbed
      if (ghostElRef.current) {
        const { x: ox, y: oy } = dragColClickOffsetRef.current;
        ghostElRef.current.style.left = `${me.clientX - ox - 8}px`;
        ghostElRef.current.style.top  = `${me.clientY - oy - 8}px`;
      } else {
        ghostPosRef.current = { x: me.clientX, y: me.clientY };
      }

      const tableEl = theadRef.current?.closest('table') as HTMLElement | null;
      if (!tableEl || !theadRef.current) return;

      // ── Left-edge positions of NON-DRAGGED columns ──────────────────────────
      // Use `currentVisibleOrder` (updated after each FLIP) so thresholds track
      // actual post-FLIP positions rather than stale original positions.
      // Use `capturedDomWidths` (measured from DOM at mousedown) for accurate
      // widths — state values can differ from the real layout.
      const colWidth = capturedDomWidths[colId] ?? 160;
      const dragCenterX = me.clientX - dragColClickOffsetRef.current.x + colWidth / 2;
      const tableLeft = tableEl.getBoundingClientRect().left + CHECKBOX_COL_WIDTH;
      const leftEdgesNd: number[] = [];
      const colWidthsNd: number[] = [];
      let ndCumX = tableLeft;
      for (const c of currentVisibleOrder) {
        if (c === colId) { ndCumX += capturedDomWidths[c] ?? 160; continue; }
        leftEdgesNd.push(ndCumX);
        colWidthsNd.push(capturedDomWidths[c] ?? 160);
        ndCumX += capturedDomWidths[c] ?? 160;
      }
      const Nnd = leftEdgesNd.length; // = currentVisibleOrder.length - 1

      // ── Initialise on first move: find the correct finalIdx slot ─────────────
      if (dragFinalIdx === -1) {
        dragFinalIdx = 0;
        for (let i = 0; i < Nnd; i++) {
          if (dragCenterX > leftEdgesNd[i] + 0.1 * colWidthsNd[i]) dragFinalIdx = i + 1;
          else break;
        }
        prevDragCenterX = dragCenterX;
      }

      // ── Hysteretic crossing-based snap: 10% from each side ──────────────────
      // RIGHT: fires when drag center crosses the 10%-from-left mark going rightward.
      while (dragFinalIdx < Nnd) {
        const threshold = leftEdgesNd[dragFinalIdx] + 0.1 * colWidthsNd[dragFinalIdx];
        if ((prevDragCenterX ?? dragCenterX) <= threshold && dragCenterX > threshold) dragFinalIdx++;
        else break;
      }
      // LEFT: fires when drag center crosses the 10%-from-right mark (= 90% from left) going leftward.
      while (dragFinalIdx > 0) {
        const threshold = leftEdgesNd[dragFinalIdx - 1] + 0.9 * colWidthsNd[dragFinalIdx - 1];
        if ((prevDragCenterX ?? dragCenterX) >= threshold && dragCenterX < threshold) dragFinalIdx--;
        else break;
      }
      prevDragCenterX = dragCenterX;

      // ── Build new visible order from withoutDragged + insertion at dragFinalIdx ─
      const finalIdx = dragFinalIdx;
      const newVisibleOrder = [...withoutDraggedCaptured];
      newVisibleOrder.splice(Math.min(finalIdx, withoutDraggedCaptured.length), 0, colId);

      // ── Skip if logical order hasn't changed ────────────────────────────────
      // Compare against currentVisibleOrder (logical state), NOT the DOM.
      // The DOM can be stale between React renders: using it caused a new FLIP to
      // fire on every mousemove frame until React re-rendered, constantly clearing
      // and restarting the animation so it appeared broken during fast drags.
      if (newVisibleOrder.join(',') === currentVisibleOrder.join(',')) return;

      // ── FLIP snapshot: clear transforms → measure natural positions ───────
      theadRef.current.querySelectorAll<HTMLElement>('th[data-col-id]').forEach(th => {
        th.style.transition = 'none'; th.style.transform = '';
      });
      tableEl.querySelectorAll<HTMLElement>('td[data-col-id]').forEach(td => {
        td.style.transition = 'none'; td.style.transform = '';
      });
      theadRef.current.getBoundingClientRect(); // force layout
      const snap: Record<string, number> = {};
      theadRef.current.querySelectorAll<HTMLElement>('th[data-col-id]').forEach(th => {
        const id = th.dataset.colId!;
        if (id !== colId) snap[id] = th.getBoundingClientRect().left;
      });
      flipSnapRef.current = snap;

      // Sync currentVisibleOrder immediately so the next mousemove frame computes
      // thresholds from the new (post-FLIP) column layout, not the pre-FLIP layout.
      currentVisibleOrder = newVisibleOrder;
      // Rebuild full order: use columnOrderRef for hidden-column positions (stable),
      // replace all visible slots with newVisibleOrder.
      let vi = 0;
      setColumnOrder(columnOrderRef.current.map(c => capturedVisible.has(c) ? newVisibleOrder[vi++] : c));
    };

    const onMouseUp = () => {
      setDragColId(null);
      ghostPosRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setTimeout(() => { dragColHappenedRef.current = false; }, 0);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 200ms debounce for search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchValue), 200);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchValue]);

  useEffect(() => {
    setTrigramFeedbackVisible(false);
    if (!trigramSearchPending) {
      setTrigramBackspacedFromSearch(false);
      return;
    }
    const timer = window.setTimeout(() => setTrigramFeedbackVisible(true), 1000);
    return () => window.clearTimeout(timer);
  }, [searchValue, trigramSearch, trigramSearchPending]);

  // Keep columnOrderRef in sync so mouse-drag closures always read the latest order
  useEffect(() => { columnOrderRef.current = columnOrder; }, [columnOrder]);

  // Drive bulk-action-bar enter / exit animations
  useEffect(() => {
    if (selectedRows.size > 0) {
      if (barExitTimerRef.current) { clearTimeout(barExitTimerRef.current); barExitTimerRef.current = null; }
      setBarExiting(false);
      setBarVisible(true);
    } else {
      if (barVisible) {
        setBarExiting(true);
        barExitTimerRef.current = setTimeout(() => {
          setBarVisible(false);
          setBarExiting(false);
          barExitTimerRef.current = null;
        }, 250);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRows.size]);

  // Cache column boundary x-positions so mousemove doesn't call getBoundingClientRect every frame.
  // Recompute after any layout change: column order, visibility, or width.
  // Skip during active column drag — the final width commits on mouseup, which re-runs this.
  useEffect(() => {
    if (resizingCol) return;
    if (!tableOuterRef.current || !theadRef.current) return;
    const outerRect = tableOuterRef.current.getBoundingClientRect();
    const visibleColOrder = columnOrder.filter(c => visibleColumns.has(c));
    const ths = Array.from(theadRef.current.querySelectorAll('th'));
    const thOffset = bulkSelectCheckboxes ? 1 : 0;
    colBoundariesRef.current = visibleColOrder.slice(0, -1).map((colId, i) => {
      const th = ths[i + thOffset];
      return th ? { colId, x: th.getBoundingClientRect().right - outerRect.left } : null;
    }).filter((b): b is { colId: string; x: number } => b !== null);
  }, [columnOrder, visibleColumns, columnWidths, resizingCol, bulkSelectCheckboxes]);

  // FLIP animation: after columnOrder re-render, slide non-dragged columns to their new positions
  useLayoutEffect(() => {
    const snap = flipSnapRef.current;
    if (!snap || !theadRef.current) return;
    flipSnapRef.current = null;

    const ease = 'cubic-bezier(0.2, 0, 0.1, 1)';
    const table = theadRef.current.closest('table');

    // Compute per-column delta from <th> positions only (single source of truth for each column).
    // tds use the same delta as their column header — avoids wrong offsets for sub-span cells.
    const colDeltas: Record<string, number> = {};
    theadRef.current.querySelectorAll<HTMLElement>('th[data-col-id]').forEach(th => {
      const id = th.dataset.colId!;
      if (!(id in snap)) return;
      const delta = snap[id] - th.getBoundingClientRect().left;
      if (Math.abs(delta) < 1) return;
      colDeltas[id] = delta;
      th.style.transition = 'none';
      th.style.transform = `translateX(${delta}px)`;
    });

    // Apply the same per-column delta to every td in that column
    if (table) {
      table.querySelectorAll<HTMLElement>('td[data-col-id]').forEach(td => {
        const id = td.dataset.colId!;
        if (!(id in colDeltas)) return;
        td.style.transition = 'none';
        td.style.transform = `translateX(${colDeltas[id]}px)`;
      });
    }

    // Force reflow so the browser registers the starting transforms before the animation
    theadRef.current.getBoundingClientRect();

    // Animate each moved element to its natural position
    const transition = `transform 250ms ${ease}`;
    theadRef.current.querySelectorAll<HTMLElement>('th[data-col-id]').forEach(th => {
      if (!(th.dataset.colId! in colDeltas)) return;
      th.style.transition = transition;
      th.style.transform = '';
    });
    const animatedTds: HTMLElement[] = [];
    if (table) {
      table.querySelectorAll<HTMLElement>('td[data-col-id]').forEach(td => {
        if (!(td.dataset.colId! in colDeltas)) return;
        // The CSS hover rule uses `transition: background-color !important` which beats a regular
        // inline style, causing the transform to snap on hovered rows. Using setProperty with
        // 'important' ensures the transform transition wins for the duration of the animation.
        td.style.setProperty('transition', transition, 'important');
        td.style.transform = '';
        animatedTds.push(td);
      });
    }
    // Remove the !important transition after the animation so hover bg-color transitions work normally
    setTimeout(() => {
      animatedTds.forEach(td => td.style.removeProperty('transition'));
    }, 260);
  }, [columnOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // FLIP animation for chip reordering — runs after each viewChips state update during drag
  useLayoutEffect(() => {
    const snap = chipFLIPSnapRef.current;
    if (Object.keys(snap).length === 0 || !chipRowRef.current) return;
    chipFLIPSnapRef.current = {};

    const chipEls = Array.from(chipRowRef.current.querySelectorAll<HTMLElement>('[data-chip-id]'));

    // Apply inverse transforms (old position → new position) with no transition
    chipEls.forEach(el => {
      const id = el.dataset.chipId!;
      if (id === chipDragIdRef.current) return; // dragged slot stays invisible; skip
      const oldLeft = snap[id];
      if (oldLeft === undefined) return;
      const newLeft = el.getBoundingClientRect().left;
      const dx = oldLeft - newLeft;
      if (Math.abs(dx) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
    });

    chipRowRef.current.getBoundingClientRect(); // force reflow

    // Animate each moved chip to its natural position
    chipEls.forEach(el => {
      if (el.dataset.chipId === chipDragIdRef.current) return;
      if (!el.style.transform) return;
      el.style.transition = 'transform 200ms cubic-bezier(0.2, 0, 0.1, 1)';
      el.style.transform = '';
    });
  }, [viewChips]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when search query or filters change
  useEffect(() => {
    setPaginationPage(1);
  }, [debouncedSearch, filterChips]);

  // Resolved data-row keys to search across. Recomputed each render (cheap, no memo needed),
  // ensuring it is always in sync with the active tab without any stale-closure risk.
  const searchableKeys = activeTab.columns.filter(c => c.searchable).flatMap(getSearchKeys);

  // Per-chip row counts — recomputed whenever the data, chip list, active filters, or searchable keys change.
  const chipRowCounts = useMemo(() => {
    const counts: Record<string, string> = {};
    const total = tableRows.length;
    viewChips.forEach(chip => {
      const cfg = chipListConfigsRef.current[chip.id];
      if (!cfg || (cfg.filters.length === 0 && !cfg.searchQuery.trim())) {
        counts[chip.id] = total.toLocaleString();
        return;
      }
      let rows = tableRows.map((row, originalIndex) => ({ row, originalIndex }));
      if (cfg.searchQuery.trim()) {
        const q = cfg.searchQuery.trim();
        rows = rows.filter(({ row }) => searchableKeys.some(key => substringMatch(String(row[key] ?? ''), q)));
      }
      rows = applyFilterChips(rows, cfg.filters);
      counts[chip.id] = rows.length.toLocaleString();
    });
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRows, viewChips, filterChips]); // eslint-disable-line react-hooks/exhaustive-deps

  const allFilteredRows = useMemo(() => {
    const q = debouncedSearch.trim();
    let rows = tableRows.map((row, originalIndex) => ({ row, originalIndex }));
    if (trigramSearchPending) {
      if (trigramNoResultsActive) return [];
    } else if (q.length >= 3) {
      rows = rows.filter(({ row }) => searchableKeys.some(key => substringMatch(String(row[key] ?? ''), q)));
    }
    return applyFilterChips(rows, filterChips);
  // searchableKeys is derived inline each render so it doesn't need to be in deps
  }, [debouncedSearch, tableRows, filterChips, trigramSearchPending, trigramNoResultsActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedRows = useMemo(() => {
    if (!sortCol) return allFilteredRows;
    return [...allFilteredRows].sort((a, b) => {
      const av = String(a.row[sortCol] ?? '');
      const bv = String(b.row[sortCol] ?? '');
      return sortDir === 'asc'
        ? av.localeCompare(bv, undefined, { numeric: true })
        : bv.localeCompare(av, undefined, { numeric: true });
    });
  }, [allFilteredRows, sortCol, sortDir]);

  const TOTAL_RESULTS = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(TOTAL_RESULTS / pageSize));
  const filteredRows = useMemo(
    () => sortedRows.slice((paginationPage - 1) * pageSize, paginationPage * pageSize),
    [sortedRows, paginationPage, pageSize]
  );
  const showTrigramEmptyState =
    trigramNoResultsActive &&
    !isTableLoading &&
    !foreverLoading;
  filteredRowsRef.current = filteredRows;

  // allSelected / someSelected are relative to the current page
  const filteredIndices = filteredRows.map(r => r.originalIndex);
  const allSelected = filteredIndices.length > 0 && filteredIndices.every(i => selectedRows.has(i));
  const someSelected = filteredIndices.some(i => selectedRows.has(i)) && !allSelected;
  // Keep ref in sync so TableRow event handlers can read the latest value without causing re-renders
  hasSelectionRef.current = bulkSelectCheckboxes && selectedRows.size > 0;

  const closeBulkSelectionMenu = () => setBulkSelectionMenu(null);
  const openBulkSelectionMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setColumnMenu(null);
    if (bulkSelectionMenu) {
      closeBulkSelectionMenu();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setBulkSelectionMenu({ top: rect.bottom + 4, left: rect.left });
  };
  const deselectAllRows = () => {
    setSelectedRows(new Set());
    closeBulkSelectionMenu();
  };
  const selectCurrentPage = () => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      filteredIndices.forEach(i => next.add(i));
      return next;
    });
    closeBulkSelectionMenu();
  };
  const deselectCurrentPage = () => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      filteredIndices.forEach(i => next.delete(i));
      return next;
    });
    closeBulkSelectionMenu();
  };
  const selectAllRows = () => {
    setSelectedRows(new Set(sortedRows.map(row => row.originalIndex)));
    closeBulkSelectionMenu();
  };



  // Chip row inner content — shared between the two placement modes below.
  const renderChipScrollScrims = (
    scrims: { left: boolean; right: boolean },
    scrollRef: React.RefObject<HTMLDivElement | null>,
  ) => (
    <>
      <AnimatePresence>
        {scrims.left && (
          <motion.div
            key="scrim-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            style={{ position: 'absolute', left: -4, top: -2, bottom: -2, width: '104px', zIndex: 2, display: 'flex', alignItems: 'center', paddingLeft: '4px', pointerEvents: 'none' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #fff 55%, transparent)' }} />
            <button
              style={{ position: 'relative', flexShrink: 0, pointerEvents: 'auto', width: '28px', height: '28px', borderRadius: '8px', background: 'white', border: '1px solid #EBEEF1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 150ms, border-color 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--neutral-25)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--neutral-100)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#EBEEF1'; }}
              onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            >
              <img src="/m2/icons/arrowRight12.svg" alt="Scroll left" style={{ width: '12px', height: '12px', transform: 'scaleX(-1)' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {scrims.right && (
          <motion.div
            key="scrim-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            style={{ position: 'absolute', right: -4, top: -2, bottom: -2, width: '104px', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', pointerEvents: 'none' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to left, #fff 55%, transparent)' }} />
            <button
              style={{ position: 'relative', flexShrink: 0, pointerEvents: 'auto', width: '28px', height: '28px', borderRadius: '8px', background: 'white', border: '1px solid #EBEEF1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 150ms, border-color 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--neutral-25)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--neutral-100)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#EBEEF1'; }}
              onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            >
              <img src="/m2/icons/arrowRight12.svg" alt="Scroll right" style={{ width: '12px', height: '12px' }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  /** Views shown in the chip row (and the mobile views select): All first, then pinned, then a selected unpinned view. */
  const chipRowViews = [...displayViewChips]
    .filter(chip => displayPinnedIds.has(chip.id) || chip.selected)
    .sort((a, b) => {
      if (a.id === primaryChipId) return -1;
      if (b.id === primaryChipId) return 1;
      const aPinned = displayPinnedIds.has(a.id) ? 0 : 1;
      const bPinned = displayPinnedIds.has(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });

  const toEditableView = (chip: ViewChip): EditableView => {
    const isAll = chip.id === primaryChipId;
    const isShown = isAll || pinnedViewIds.has(chip.id);
    return {
      id: chip.id,
      label: chip.label,
      isDefault: defaultChipId === chip.id,
      visibility: isAll
        ? (partialLocked && isLockedView(chip.id) ? 'locked' : 'fixed')
        : isShown ? 'shown' : lockedDefaults ? 'hidden-muted' : 'hidden',
      deletion: !isLockedView(chip.id) ? 'enabled' : lockedDefaults ? 'hidden' : 'disabled',
    };
  };

  const mobilePageActionsRef = useRef<HTMLDivElement>(null);
  /** In "80% sheets" mode, filter and view sheets reach up to 16px below the page actions. */
  const fixedSheetHeight = sheetMode === 'fixed' ? () => sheetHeightBelow(mobilePageActionsRef.current, 16) : undefined;

  const renderMobileViewsMenu = (className?: string) => (
    <MobileViewsMenu
      className={className}
      variant={sheetMode === 'popovers' ? 'dropdown' : 'sheet'}
      fixedSheetHeight={fixedSheetHeight}
      views={chipRowViews}
      selectedId={chipRowViews.find(c => c.selected)?.id ?? primaryChipId}
      onSelect={selectChip}
      onSaveView={configChanged && !isCreatingView && !isLockedView(selectedChipId) ? saveCurrentView : undefined}
      onCreateView={commitSave}
      editGroups={editViewGroups.map(group => ({ label: group.label, views: group.chips.map(toEditableView) }))}
      editActions={{
        onToggleShown: toggleViewShown,
        onMakeDefault: setDefaultChipId,
        onDelete: (id, anchor) => {
          setResetConfirm(null);
          setDeleteConfirm({ chipId: id, ...placeConfirm(anchor) });
        },
        onReset: lockedDefaults ? undefined : anchor => {
          setDeleteConfirm(null);
          setResetConfirm(placeConfirm(anchor));
        },
        onPointerDown: e => {
          if ((e.target as HTMLElement).closest('[data-confirm-anchor]')) return;
          setDeleteConfirm(null);
          setResetConfirm(null);
        },
        onClose: closeEditViews,
      }}
    />
  );

  const renderViewChipRowInner = () => (
    <div ref={chipRowSectionRef} className="lv-chip-section">
    <div style={{ position: 'relative' }}>
    <div ref={chipRowScrollRef} style={{ overflowX: 'auto', scrollbarWidth: 'none', padding: '3px', margin: '-3px' }}>
    <div className="flex items-start" style={{ width: 'max-content' }}>
      <div ref={chipRowRef} className="flex items-start">
      <AnimatePresence key={activeTabIdx} initial={false}>
      {chipRowViews.map((chip) => (
        <motion.div
          key={chip.id}
          layout={chipRenameId === chip.id ? false : 'position'}
          data-chip-id={chip.id}
          suppressHydrationWarning
          style={{ flexShrink: 0 }}
          initial={skipChipEnterRef.current || justCommittedChipIdRef.current === chip.id ? false : { width: 0, opacity: 0, x: 8, marginRight: 0 }}
          animate={{ width: 'auto', opacity: 1, x: 0, marginRight: 8 }}
          exit={{ width: 0, opacity: 0, x: 8, marginRight: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
          onContextMenu={e => {
            e.preventDefault();
            setChipContextMenu({ chipId: chip.id, x: e.clientX, y: e.clientY });
          }}
        >
          {chipRenameId === chip.id ? renderChipRenameEditor() : (
            <ViewChipButton
              chip={{ ...chip, selected: chip.selected && !isCreatingView, count: includeViewTotals ? chipRowCounts[chip.id] : undefined }}
              isDragging={dragChipId === chip.id}
              onMouseDown={e => handleChipMouseDown(e, chip.id)}
              onClick={() => selectChip(chip.id)}
              dirty={Boolean(chip.selected && !isCreatingView && configChanged)}
              changeCount={changeCount}
              onSave={isLockedView(chip.id) ? undefined : saveCurrentView}
              onClear={resetCurrentView}
            />
          )}
        </motion.div>
      ))}
      </AnimatePresence>
      </div>

      {/* Save As button */}
      {savePhase !== 'idle' && (
        <div
          ref={saveContainerRef}
          className="relative bg-white flex items-center rounded-[8px]"
          style={{
            boxShadow: CHIP_SHADOW_SELECTED,
            height: 'var(--lv-row-h, 40px)',
            overflow: 'hidden',
            animation: 'filterChipIn 220ms cubic-bezier(0.2, 0, 0.1, 1) forwards',
            whiteSpace: 'nowrap',
          }}
        >
          <img
            src="/m2/icons/add.svg"
            alt=""
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              pointerEvents: 'none',
              filter: 'brightness(0) saturate(100%) invert(24%) sepia(98%) saturate(1500%) hue-rotate(237deg) brightness(90%) contrast(105%)',
              opacity: savePhase === 'idle' ? 1 : 0,
              transition: 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)',
            }}
          />
          {savePhase === 'naming' && (
            <input
              ref={saveAsInputRef}
              type="text"
              placeholder="Name your view"
              value={saveAsName}
              onChange={e => setSaveAsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeNaming(); }}
              className="text-[14px] font-normal leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)] placeholder:text-[#9AA3B0] outline-none bg-transparent"
              style={{
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                paddingLeft: '12px',
                flex: '1',
                minWidth: 0,
              }}
            />
          )}
          {savePhase === 'committing' && (
            <span
              className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)]"
              style={{
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                paddingLeft: '12px',
                paddingRight: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {saveAsName}
            </span>
          )}
          {savePhase === 'naming' && (
            <button
              onClick={closeNaming}
              className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] cursor-pointer bg-transparent border-none outline-none shrink-0"
              style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', padding: '0 4px', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--neutral-600)' }}
            >
              Cancel
            </button>
          )}
          <button
            ref={saveTextRef}
            onClick={savePhase === 'naming' ? handleSave : savePhase === 'idle' ? openNaming : undefined}
            className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[#533AFD] cursor-pointer bg-transparent border-none outline-none shrink-0"
            style={{
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              paddingLeft: savePhase === 'naming' ? '4px' : '30px',
              paddingRight: '12px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              position: savePhase === 'committing' ? 'absolute' : undefined,
              opacity: savePhase === 'committing' ? 0 : 1,
              pointerEvents: savePhase === 'committing' ? 'none' : undefined,
            }}
          >
            {savePhase === 'naming' ? 'Save' : 'Save as'}
          </button>
        </div>
      )}

      {/* Create / edit views */}
      <div className="relative" style={{ marginLeft: savePhase !== 'idle' ? '8px' : '0' }}>
        <button
          type="button"
          aria-label="View options"
          aria-expanded={plusMenu ? true : undefined}
          data-open={plusMenu ? 'true' : undefined}
          onClick={openPlusMenu}
          className="lv-plus-trigger relative bg-white flex items-center justify-center rounded-[8px] cursor-pointer"
        >
          <div className="lv-plus-outline absolute rounded-[8px] pointer-events-none inset-0" />
          <img src="/m2/icons/add12.svg" alt="" style={{ width: '12px', height: '12px' }} className="relative z-10" />
        </button>
      </div>
    </div>
    {renderChipScrollScrims(chipRowScrims, chipRowScrollRef)}
    </div>
    </div>
    </div>
  );

  useEffect(() => {
    if (!pageActionsOverflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        pageActionsOverflowMenuRef.current && !pageActionsOverflowMenuRef.current.contains(e.target as Node) &&
        pageActionsOverflowBtnRef.current && !pageActionsOverflowBtnRef.current.contains(e.target as Node)
      ) {
        setPageActionsOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pageActionsOverflowOpen]);

  return (
    <div ref={pageContentRef} className="lv-root h-full flex flex-col bg-white" data-element-size={elementSize} style={{ overflowX: 'clip' }}>
      <style>{`
        @property --shimmer-s1 { syntax: '<number>'; inherits: false; initial-value: 0.8; }
        @property --shimmer-s2 { syntax: '<number>'; inherits: false; initial-value: 0;   }
        @property --shimmer-s3 { syntax: '<number>'; inherits: false; initial-value: 0;   }
        .lv-root { --lv-row-h: 36px; --lv-chip-px: 12px; --lv-chip-py: 8px; --lv-search-h: 40px; --lv-search-px: 14px; }
        .lv-root[data-element-size="40"] { --lv-row-h: 40px; --lv-chip-px: 14px; --lv-chip-py: 10px; --lv-search-h: 40px; --lv-search-px: 14px; }
        .lv-root[data-element-size="36"] { --lv-row-h: 36px; --lv-chip-px: 12px; --lv-chip-py: 8px; --lv-search-h: 36px; --lv-search-px: 12px; }
        .table-scroll-hidden-native { --lv-search-w: auto; --lv-search-flex: 1 1 0%; }
        .lv-toolbar {
          position: sticky;
          top: 0;
          left: 0;
          z-index: 50;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 4px 16px;
        }
        .lv-toolbar.lv-toolbar--no-search { gap: 0; padding: 8px 4px 16px; --lv-search-h: var(--lv-row-h); --lv-search-px: var(--lv-chip-px); }
        .lv-toolbar .lv-chip-section { padding: 0; }
        .data-table.no-top-border thead th { border-top: none !important; }
        @media (min-width: 1280px) {
          .lv-root:not([data-element-size="36-40"]) .table-scroll-hidden-native:has(.lv-chip-anchor) {
            --lv-search-w: 240px;
            --lv-search-flex: 0 0 240px;
          }
          .lv-root:not([data-element-size="36-40"]) .lv-toolbar:has(.lv-chip-anchor) {
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }
          .lv-root:not([data-element-size="36-40"]) .lv-toolbar:has(.lv-chip-anchor) .lv-chip-anchor {
            flex: 1 1 auto;
            min-width: 0;
          }
        }
        @media (min-width: 1600px) {
          .lv-root:not([data-element-size="36-40"]) .table-scroll-hidden-native:has(.lv-chip-anchor) {
            --lv-search-w: 280px;
            --lv-search-flex: 0 0 280px;
          }
        }
        .lv-plus-trigger { --slate-25: var(--neutral-25); width: var(--lv-row-h, 40px); height: var(--lv-row-h, 40px); }
        .lv-plus-outline {
          outline: 1px solid var(--neutral-50);
          transition: outline-color 250ms cubic-bezier(0.2, 0, 0.1, 1);
        }
        .lv-plus-trigger:hover .lv-plus-outline,
        .lv-plus-trigger[data-open="true"] .lv-plus-outline { outline-color: var(--neutral-100); }
        .menu-hover-row {
          position: relative;
          isolation: isolate;
          background: transparent;
          --slate-25: var(--neutral-25);
          --menu-row-surface: var(--slate-25);
          -webkit-tap-highlight-color: transparent;
        }
        .menu-hover-row[data-tone="critical"] { --menu-row-surface: #FEF4F6; }
        .menu-hover-row::before {
          content: '';
          position: absolute;
          z-index: -1;
          inset: 0;
          border-radius: var(--menu-row-radius, 4px);
          background: transparent;
          pointer-events: none;
        }
        @media (hover: hover) {
          .menu-hover-row:hover::before { background: var(--menu-row-surface); }
        }
        .menu-hover-row:active::before { background: var(--menu-row-surface); }
        .lv-filter-search::placeholder { color: var(--neutral-500); }
        .lv-filter-clear {
          color: #7F7DFC;
          transition: color 100ms cubic-bezier(0.2, 0, 0.1, 1);
        }
        .lv-filter-clear:hover { color: #533AFD; }
        .lv-filter-clear-icon {
          display: block;
          width: 12px;
          height: 12px;
          background: currentColor;
          -webkit-mask: url('/m2/icons/cancelCircleFilled.svg') center / contain no-repeat;
          mask: url('/m2/icons/cancelCircleFilled.svg') center / contain no-repeat;
        }
        .lv-filter-search-clear-icon {
          display: block;
          width: 12px;
          height: 12px;
          background: var(--neutral-700);
          -webkit-mask: url('/m2/icons/cancelCircleFilled.svg') center / contain no-repeat;
          mask: url('/m2/icons/cancelCircleFilled.svg') center / contain no-repeat;
        }
        .lv-edit-hit {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          padding: 0;
          background: transparent;
        }
        .lv-edit-hit:disabled { cursor: default; opacity: 1; }
        .lv-edit-hit--eye:hover { background: var(--neutral-25); border-radius: 6px; }
        .lv-edit-hit--delete:hover { background: #FEF4F6; border-radius: 8px; }
        .lv-edit-icon--muted {
          width: 16px;
          height: 16px;
          display: block;
          background: var(--neutral-200);
          -webkit-mask: var(--lv-edit-icon) center / contain no-repeat;
          mask: var(--lv-edit-icon) center / contain no-repeat;
        }
        .lv-edit-icon--neutral-400 {
          width: 16px;
          height: 16px;
          display: block;
          background: var(--neutral-400);
          -webkit-mask: var(--lv-edit-icon) center / contain no-repeat;
          mask: var(--lv-edit-icon) center / contain no-repeat;
        }
        .lv-edit-field {
          position: relative;
          flex: 1 1 auto;
          min-width: 0;
          align-self: stretch;
          display: flex;
          align-items: center;
        }
        .lv-edit-field::before {
          content: '';
          position: absolute;
          left: -8px;
          right: 0;
          top: -4px;
          bottom: -4px;
          border-radius: 6px;
          background: transparent;
          pointer-events: none;
        }
        .lv-edit-field:hover::before,
        .lv-edit-field[data-editing="true"]::before { background: var(--neutral-25); }
        .lv-dirty-tip-btn {
          position: relative;
          isolation: isolate;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          padding: 4px 8px;
          margin: 0 8px;
          border: none;
          background: transparent;
          color: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
          letter-spacing: -0.15px;
          cursor: pointer;
          border-radius: 6px;
        }
        .lv-dirty-tip-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: 6px;
          background: transparent;
          pointer-events: none;
        }
        .lv-dirty-tip-btn:hover::before { background: ${ACTION_BAR_STROKE}; }
      `}</style>
      <style>{`
        @keyframes shimmerPulse {
          0%      { --shimmer-s1: 0.8; --shimmer-s2: 0;   --shimmer-s3: 0;   }
          33.33%  { --shimmer-s1: 0;   --shimmer-s2: 0.8; --shimmer-s3: 0;   }
          66.66%  { --shimmer-s1: 0;   --shimmer-s2: 0;   --shimmer-s3: 0.8; }
          100%    { --shimmer-s1: 0.8; --shimmer-s2: 0;   --shimmer-s3: 0;   }
        }

        @keyframes floatingBarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes floatingBarOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(12px); }
        }

        @keyframes filterChipIn {
          from {
            max-width: 0;
            opacity: 0;
            overflow: hidden;
          }
          to {
            max-width: 500px;
            opacity: 1;
            overflow: visible;
          }
        }

        @keyframes chipLabelFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes ghostCardIn {
          from { background-color: transparent; box-shadow: none; }
          to   { background-color: #ffffff; box-shadow: 0px 4px 50px 0px rgba(0,0,0,0.10); }
        }

        @keyframes ghostGlassIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Popover opening below its control (control is above) */
        @keyframes popoverIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }


        /* Popover opening above its control (control is below) */
        @keyframes popoverInUp {
          from { opacity: 0; transform: translateY(8px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }

        .toggle-switch {
          width: 32px;
          height: 18px;
          border-radius: 9px;
          background: #D1D9E0;
          position: relative;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 250ms cubic-bezier(0.2, 0, 0.1, 1);
          border: none;
          outline: none;
        }
        .toggle-switch.on {
          background: #675DFF;
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          transition: transform 250ms cubic-bezier(0.2, 0, 0.1, 1);
        }
        .toggle-switch.on::after {
          transform: translateX(14px);
        }

        /* ── Mobile breakpoint — matches Tailwind max-md and useIsMobile ─── */
        .lv-tab-strip { scrollbar-width: none; }
        @media (width < 48rem) {
          .lv-root, .lv-root[data-element-size] { --lv-pagination-px: 16px; --lv-pagination-h: 52px; }
          .lv-root .lv-toolbar,
          .lv-root .lv-toolbar.lv-toolbar--no-search {
            --lv-search-h: 54px;
            --lv-search-px: 16px;
            --lv-search-radius: 12px;
            gap: 12px;
            padding: 8px 0;
          }
          .lv-root .lv-filter-btn { min-width: var(--lv-search-h); justify-content: center; }
          .lv-root .lv-tab-strip { overflow-x: auto; }
        }
      `}</style>

      {/* ── Everything below scrolls inside tableScrollRef ──────────────────── */}
      <div
        ref={tableScrollRef}
        className={`table-scroll-hidden-native flex flex-col flex-1 min-h-0 max-md:px-[16px] ${tableScrollState.showLeft ? 'scroll-left' : ''}${tableScrollState.showRight ? ' scroll-right' : ''}`}
        style={{ overflow: 'auto', paddingBottom: '44px' }}
      >

      {/* Page Title Row — naturally scrolls away inside tableScrollRef */}
      <div ref={titleRef} className={`${config.tabs.length > 1 ? 'pt-[8px] max-md:pb-[16px]' : 'py-[8px]'} px-[2px] max-md:px-[4px]`} style={{ position: 'sticky', left: 0 }}>
        {config.breadcrumb && (
          <div style={{ paddingBottom: '2px' }}>
            {config.breadcrumb.href ? (
              <a
                href={config.breadcrumb.href}
                style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#533AFD', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#3D2BC9')}
                onMouseLeave={e => (e.currentTarget.style.color = '#533AFD')}
              >
                {config.breadcrumb.label}
              </a>
            ) : (
              <span style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#533AFD' }}>
                {config.breadcrumb.label}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-[16px] h-[44px]">
          <h1
            className="text-[#1A1F2E] min-w-0 truncate"
            style={{ fontFamily: 'SF Pro Display, SF Pro Text, system-ui, -apple-system, sans-serif', fontWeight: 700, fontSize: '28px', lineHeight: '36px', letterSpacing: '0.38px' }}
          >
            {config.pageTitle}
          </h1>
          <MobilePageActions
            ref={mobilePageActionsRef}
            className="md:hidden"
            createLabel={activeTab.createActionLabel}
            variant={sheetMode === 'dynamic' ? 'sheet' : 'popover'}
            moreActions={[...(activeTab.hideHeaderActions ? [] : [{ label: 'Analyze' }, { label: 'Export' }]), ...(config.pageActions ?? [])].map(a => ({ ...a, color: sheetMode === 'dynamic' ? 'var(--neutral-800)' : 'var(--neutral-900)' }))}
          />
          <div className="flex items-center gap-[8px] max-md:hidden">
            {config.pageCopyId ? (
              <>
                <PageHeaderCopyIdField fullId={config.pageCopyId} />
                {/* Vertical separator: gap-[8px] + px-[8px] here = 16px chip→line and line→actions; 8px between action controls. */}
                <div
                  className="flex shrink-0 items-center self-center px-[8px]"
                  role="presentation"
                  aria-hidden
                >
                  <div className="h-[20px] w-px bg-[#D8DEE4]" />
                </div>
              </>
            ) : null}
            {/* Order: More → Analyze → Export → [promoted pill] → Create */}
            {(() => {
              const actions = config.pageActions ?? [];
              const hasCreate = Boolean(activeTab.createActionLabel);
              const promoted = actions.length > 0 && !hasCreate ? actions[0] : null;
              const menuActions = actions.length > 0
                ? (!hasCreate ? actions.slice(1) : actions)
                : [];
              const showMore = menuActions.length > 0;

              // Shared tooltip style
              const tooltipStyle: React.CSSProperties = {
                backgroundColor: 'var(--neutral-700)',
                color: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '20px',
                letterSpacing: '-0.15px',
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
                zIndex: 9999,
                pointerEvents: 'none',
              };

              // Shared icon button style factory
              const iconBtnStyle = (hovered: boolean): React.CSSProperties => ({
                outline: `1px solid ${hovered ? 'var(--neutral-300)' : 'var(--neutral-100)'}`,
                outlineOffset: '0px',
                backgroundColor: hovered ? '#F5F6F8' : 'white',
                transition: 'outline-color 100ms cubic-bezier(0.2, 0, 0.1, 1), background-color 100ms cubic-bezier(0.2, 0, 0.1, 1)',
              });

              // Helper: compute centred-below position for a button ref
              const btnTooltipPos = (ref: React.RefObject<HTMLButtonElement | null>) => {
                if (!ref.current) return { top: 0, left: 0 };
                const r = ref.current.getBoundingClientRect();
                return { top: r.bottom + 8, left: r.left + r.width / 2 };
              };

              return (
                <>
                  {/* More icon button */}
                  {showMore && (
                    <button
                      ref={pageActionsOverflowBtnRef}
                      onMouseEnter={() => {
                        setPageActionsOverflowHover(true);
                        setMoreTooltipPos(btnTooltipPos(pageActionsOverflowBtnRef));
                      }}
                      onMouseLeave={() => setPageActionsOverflowHover(false)}
                      onClick={() => {
                        if (!pageActionsOverflowBtnRef.current) return;
                        const rect = pageActionsOverflowBtnRef.current.getBoundingClientRect();
                        setPageActionsOverflowPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setPageActionsOverflowOpen(v => !v);
                      }}
                      className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] cursor-pointer"
                      style={iconBtnStyle(pageActionsOverflowOpen || pageActionsOverflowHover)}
                    >
                      <img src="/m2/icons/more12.svg" alt="More" style={{ width: '12px', height: '12px' }} />
                    </button>
                  )}
                  {/* Analyze icon button */}
                  {!activeTab.hideHeaderActions && (
                  <button
                    ref={analyzeBtnRef}
                    onMouseEnter={() => {
                      setAnalyzeTooltipVisible(true);
                      setAnalyzeHovered(true);
                      setAnalyzeTooltipPos(btnTooltipPos(analyzeBtnRef));
                    }}
                    onMouseLeave={() => { setAnalyzeTooltipVisible(false); setAnalyzeHovered(false); }}
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] cursor-pointer"
                    style={iconBtnStyle(analyzeHovered)}
                  >
                    <img src="/m2/icons/barChart12.svg" alt="Analyze" style={{ width: '12px', height: '12px' }} />
                  </button>
                  )}
                  {/* Export icon button */}
                  {!activeTab.hideHeaderActions && (
                  <button
                    ref={exportBtnRef}
                    onMouseEnter={() => {
                      setExportTooltipVisible(true);
                      setExportHovered(true);
                      setExportTooltipPos(btnTooltipPos(exportBtnRef));
                    }}
                    onMouseLeave={() => { setExportTooltipVisible(false); setExportHovered(false); }}
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-[6px] cursor-pointer"
                    style={iconBtnStyle(exportHovered)}
                  >
                    <img src="/m2/icons/export12.svg" alt="Export" style={{ width: '12px', height: '12px' }} />
                  </button>
                  )}
                  {/* Promoted action pill — first pageAction when there is no create button */}
                  {promoted && (
                    <button
                      onMouseEnter={() => setPromotedActionHovered(true)}
                      onMouseLeave={() => setPromotedActionHovered(false)}
                      className="flex items-center px-[8px] py-[4px] rounded-[6px] cursor-pointer text-[14px] font-semibold"
                      style={{
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        color: 'var(--neutral-800)',
                        letterSpacing: '-0.15px',
                        lineHeight: '20px',
                        outline: `1px solid ${promotedActionHovered ? 'var(--neutral-300)' : 'var(--neutral-100)'}`,
                        outlineOffset: '0px',
                        backgroundColor: promotedActionHovered ? '#F5F6F8' : 'white',
                        transition: 'outline-color 100ms cubic-bezier(0.2, 0, 0.1, 1), background-color 100ms cubic-bezier(0.2, 0, 0.1, 1)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {promoted.label}
                    </button>
                  )}
                  {/* Portalled tooltips — fixed position avoids overflow:auto clipping */}
                  {typeof document !== 'undefined' && pageActionsOverflowHover && !pageActionsOverflowOpen && createPortal(
                    <div style={{ ...tooltipStyle, position: 'fixed', top: moreTooltipPos.top, left: moreTooltipPos.left, transform: 'translateX(-50%)' }}>More</div>,
                    document.body
                  )}
                  {typeof document !== 'undefined' && analyzeTooltipVisible && createPortal(
                    <div style={{ ...tooltipStyle, position: 'fixed', top: analyzeTooltipPos.top, left: analyzeTooltipPos.left, transform: 'translateX(-50%)' }}>Analyze</div>,
                    document.body
                  )}
                  {typeof document !== 'undefined' && exportTooltipVisible && createPortal(
                    <div style={{ ...tooltipStyle, position: 'fixed', top: exportTooltipPos.top, left: exportTooltipPos.left, transform: 'translateX(-50%)' }}>Export</div>,
                    document.body
                  )}
                  {/* More menu popover */}
                  {typeof document !== 'undefined' && pageActionsOverflowOpen && createPortal(
                    <div
                      ref={pageActionsOverflowMenuRef}
                      style={{
                        position: 'fixed',
                        top: pageActionsOverflowPos.top,
                        right: pageActionsOverflowPos.right,
                        zIndex: 10000,
                        background: 'white',
                        borderRadius: '8px',
                        boxShadow: '0px 15px 35px 0px rgba(48,49,61,0.08), 0px 5px 15px 0px rgba(0,0,0,0.12)',
                        border: '1px solid #D8DEE4',
                        padding: '4px',
                        width: 'max-content',
                        minWidth: '120px',
                        maxWidth: '320px',
                        fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        animation: 'popoverIn 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
                        transformOrigin: 'top right',
                      }}
                    >
                      {renderMoreMenuItems(
                        menuActions.map(a => ({ ...a, color: 'var(--neutral-800)' })),
                        () => setPageActionsOverflowOpen(false),
                      )}
                    </div>,
                    document.body
                  )}
                </>
              );
            })()}
            {/* Primary action button — omitted when the tab defines no createActionLabel */}
            {activeTab.createActionLabel && (
              <button
                onMouseEnter={() => setCreateHovered(true)}
                onMouseLeave={() => setCreateHovered(false)}
                className="flex items-center gap-[6px] px-[8px] py-[4px] rounded-[6px] cursor-pointer text-[14px] font-semibold"
                style={{
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  color: 'var(--neutral-800)',
                  letterSpacing: '-0.15px',
                  lineHeight: '20px',
                  outline: `1px solid ${createHovered ? 'var(--neutral-300)' : 'var(--neutral-100)'}`,
                  outlineOffset: '0px',
                  backgroundColor: createHovered ? '#F5F6F8' : 'white',
                  transition: 'outline-color 100ms cubic-bezier(0.2, 0, 0.1, 1), background-color 100ms cubic-bezier(0.2, 0, 0.1, 1)',
                }}
              >
                <img src="/m2/icons/add12.svg" alt="" style={{ width: '12px', height: '12px' }} />
                {activeTab.createActionLabel}
              </button>
            )}
          </div>
        </div>
      </div>

        {/* Tab Bar — only rendered when the page has 2+ tabs */}
        {config.tabs.length > 1 && (
          <div className="px-[2px] max-md:px-[4px]" style={{ position: 'sticky', left: 0, paddingBottom: '8px' }}>
            <div className="lv-tab-strip" style={{ display: 'flex', alignItems: 'flex-end', gap: 0, borderBottom: '1px solid #EBEEF1' }}>
              {config.tabs.map((tab, idx) => {
                const isActive = idx === activeTabIdx;
                // M2 template keeps every tab navigable for the full system demo.
                // A tab is only disabled when explicitly marked so — `placeholder`
                // just means "no real content yet", independent of clickability.
                const isTabDisabled = Boolean(tab.disabled) && config.pageId !== 'm2-template';
                const labelColor = isTabDisabled
                  ? 'var(--neutral-200)'
                  : isActive
                    ? 'var(--neutral-900)'
                    : '#6A7383';
                return (
                  <button
                    key={tab.tabId}
                    type="button"
                    aria-disabled={isTabDisabled}
                    tabIndex={isTabDisabled ? -1 : 0}
                    onClick={() => {
                      if (isTabDisabled) return;
                      setActiveTabIdx(idx);
                      if (basePath) {
                        window.history.pushState(null, '', `${basePath}/${tab.tabId}`);
                      }
                    }}
                    style={{
                      /* No bottom padding here — it lives on the inner span so
                         the absolute underline's bottom:0 lands at the border line. */
                      padding: '10px 12px 0',
                      marginLeft: idx === 0 ? '-11px' : 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: isTabDisabled ? 'default' : 'pointer',
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      fontSize: '14px',
                      lineHeight: '20px',
                      letterSpacing: '-0.15px',
                      fontWeight: 600,
                      color: labelColor,
                      transition: 'color 150ms',
                      outline: 'none',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      pointerEvents: isTabDisabled ? 'none' : 'auto',
                    }}
                  >
                    {/* inline-block span shrinks to text width — underline inherits that width */}
                    <span style={{ display: 'inline-block', position: 'relative', paddingBottom: '10px' }}>
                      {tab.label}
                      {isActive && !isTabDisabled && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'var(--neutral-900)',
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Zero-height sentinel — IntersectionObserver fires the instant this crosses
            the scroll container top, which is the exact moment the sticky bar sticks. */}
        <div ref={stickyTriggerRef} style={{ height: 0 }} />

        <div
          ref={stickyBarRef}
          className={`lv-toolbar${noSearch ? ' lv-toolbar--no-search' : ''}`}
          style={{ display: activeTab.placeholder && activeTab.blank ? 'none' : undefined }}
        >
        {!noSearch && (
          <>
          {renderMobileViewsMenu('md:hidden')}
          <div ref={chipAnchorRef} className="lv-chip-anchor max-md:hidden">
            {renderViewChipRowInner()}
          </div>
          </>
        )}
        <div className="lv-search-row flex gap-[8px] items-center" style={{ pointerEvents: 'auto' }}>

          {noSearch && activeTab.hideViewChips ? null : noSearch ? (
            /* No-search layout: chip row + more button scroll horizontally together */
            <>
            <div className="flex-1 min-w-0 md:hidden">
              {renderMobileViewsMenu()}
            </div>
            <div className="flex-1 min-w-0 max-md:hidden" style={{ position: 'relative' }}>
            <div ref={noSearchScrollRef} className="no-search-chip-scroll" style={{ overflowX: 'auto', scrollbarWidth: 'none', paddingTop: '2px', paddingBottom: '2px', marginTop: '-2px', marginBottom: '-2px', marginLeft: '-2px' }}>
              <div className="flex items-start" style={{ width: 'max-content', paddingLeft: '2px', paddingRight: '4px' }}>
              <div ref={chipRowRef} className="flex items-start">
                <AnimatePresence key={activeTabIdx} initial={false}>
                {chipRowViews.map((chip) => (
                  <motion.div
                    key={chip.id}
                    layout={chipRenameId === chip.id ? false : 'position'}
                    data-chip-id={chip.id}
                    suppressHydrationWarning
                    style={{ flexShrink: 0 }}
                    initial={skipChipEnterRef.current || justCommittedChipIdRef.current === chip.id ? false : { width: 0, opacity: 0, x: 8, marginRight: 0 }}
                    animate={{ width: 'auto', opacity: 1, x: 0, marginRight: 8 }}
                    exit={{ width: 0, opacity: 0, x: 8, marginRight: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
                    onContextMenu={e => {
                      e.preventDefault();
                      setChipContextMenu({ chipId: chip.id, x: e.clientX, y: e.clientY });
                    }}
                  >
                    {chipRenameId === chip.id ? renderChipRenameEditor() : (
                      <ViewChipButton
                        chip={{ ...chip, selected: chip.selected && !isCreatingView, count: includeViewTotals ? chipRowCounts[chip.id] : undefined }}
                        isDragging={dragChipId === chip.id}
                        onMouseDown={e => handleChipMouseDown(e, chip.id)}
                        onClick={() => selectChip(chip.id)}
                        dirty={Boolean(chip.selected && !isCreatingView && configChanged)}
                        changeCount={changeCount}
                        onSave={isLockedView(chip.id) ? undefined : saveCurrentView}
                        onClear={resetCurrentView}
                      />
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>

              {/* Save As button */}
              {savePhase !== 'idle' && (
                <div
                  ref={saveContainerRef}
                  className="relative bg-white flex items-center rounded-[8px]"
                  style={{
                    boxShadow: CHIP_SHADOW_SELECTED,
                    height: 'var(--lv-row-h, 40px)',
                    overflow: 'hidden',
                    animation: 'filterChipIn 220ms cubic-bezier(0.2, 0, 0.1, 1) forwards',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src="/m2/icons/add.svg"
                    alt=""
                    style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      width: '12px', height: '12px', pointerEvents: 'none',
                      filter: 'brightness(0) saturate(100%) invert(24%) sepia(98%) saturate(1500%) hue-rotate(237deg) brightness(90%) contrast(105%)',
                      opacity: savePhase === 'idle' ? 1 : 0,
                      transition: 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)',
                    }}
                  />
                  {savePhase === 'naming' && (
                    <input
                      ref={saveAsInputRef}
                      type="text"
                      placeholder="Name your view"
                      value={saveAsName}
                      onChange={e => setSaveAsName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeNaming(); }}
                      className="text-[14px] font-normal leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)] placeholder:text-[#9AA3B0] outline-none bg-transparent"
                      style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', paddingLeft: '12px', flex: '1', minWidth: 0 }}
                    />
                  )}
                  {savePhase === 'committing' && (
                    <span
                      className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)]"
                      style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', paddingLeft: '12px', paddingRight: '12px', whiteSpace: 'nowrap' }}
                    >
                      {saveAsName}
                    </span>
                  )}
                  {savePhase === 'naming' && (
                    <button
                      onClick={closeNaming}
                      className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] cursor-pointer bg-transparent border-none outline-none shrink-0"
                      style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', padding: '0 4px', height: '100%', display: 'flex', alignItems: 'center', color: 'var(--neutral-600)' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    ref={saveTextRef}
                    onClick={savePhase === 'naming' ? handleSave : savePhase === 'idle' ? openNaming : undefined}
                    className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[#533AFD] cursor-pointer bg-transparent border-none outline-none shrink-0"
                    style={{
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      paddingLeft: savePhase === 'naming' ? '4px' : '30px',
                      paddingRight: '12px',
                      height: '100%',
                      display: 'flex', alignItems: 'center',
                      position: savePhase === 'committing' ? 'absolute' : undefined,
                      opacity: savePhase === 'committing' ? 0 : 1,
                      pointerEvents: savePhase === 'committing' ? 'none' : undefined,
                    }}
                  >
                    {savePhase === 'naming' ? 'Save' : 'Save as'}
                  </button>
                </div>
              )}

              {/* Create / edit views */}
              <div className="relative flex-shrink-0" style={{ paddingRight: '2px', marginLeft: savePhase !== 'idle' ? '8px' : '0px' }}>
                <button
                  type="button"
                  aria-label="View options"
                  aria-expanded={plusMenu ? true : undefined}
                  data-open={plusMenu ? 'true' : undefined}
                  onClick={openPlusMenu}
                  className="lv-plus-trigger relative bg-white flex items-center justify-center cursor-pointer"
                  style={{ borderRadius: '8px' }}
                >
                  <div className="lv-plus-outline absolute pointer-events-none inset-0" style={{ borderRadius: '8px' }} />
                  <img src="/m2/icons/add12.svg" alt="" style={{ width: '12px', height: '12px' }} className="relative z-10" />
                </button>
              </div>
              </div>{/* close max-content inner wrapper */}
            </div>{/* close scroll container */}
            {renderChipScrollScrims(noSearchScrims, noSearchScrollRef)}
            </div>{/* close relative wrapper */}
            </>
          ) : (
            <>
          {/* Search Bar */}
          <div
            className="search-bar relative flex items-center gap-[8px] max-md:gap-[12px] cursor-text"
            style={{ height: 'var(--lv-search-h, var(--lv-row-h, 40px))', padding: '0 var(--lv-search-px, var(--lv-chip-px, 14px))', borderRadius: 'var(--lv-search-radius, 8px)', width: 'var(--lv-search-w, auto)', flex: 'var(--lv-search-flex, 1 1 auto)', minWidth: 0 }}
            onClick={() => searchInputRef.current?.focus()}
          >
            <img src="/m2/icons/search-12.svg" alt="Search" className="w-[12px] h-[12px] shrink-0 max-md:hidden" />
            <img src="/m2/icons/search16.svg" width="16" height="16" alt="Search" className="shrink-0 md:hidden" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => {
                  const nextLength = e.target.value.trim().length;
                  if (trimmedSearchLength >= 3 && nextLength > 0 && nextLength < 3) {
                    setTrigramBackspacedFromSearch(true);
                  }
                  setSearchValue(e.target.value);
                }}
                className="min-w-0 text-[14px] font-normal leading-5 tracking-[-0.15px] max-md:text-[16px] max-md:leading-6 max-md:tracking-[-0.31px] text-[color:var(--neutral-900)] placeholder:text-[color:var(--neutral-500)] outline-none bg-transparent cursor-text"
                style={{
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  flex: trigramFeedbackVisible && trigramSearch === 'field-hint' ? '0 0 auto' : '1 1 auto',
                  width: trigramFeedbackVisible && trigramSearch === 'field-hint'
                    ? `${Math.ceil(measureText(searchValue, `400 ${isMobile ? 16 : 14}px "SF Pro Text", system-ui, -apple-system, sans-serif`)) + 2}px`
                    : 'auto',
                }}
              />
              {trigramFeedbackVisible && trigramSearch === 'field-hint' && (
                <span style={{
                  flexShrink: 0,
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  fontSize: isMobile ? 16 : 14, fontWeight: 400, lineHeight: isMobile ? '24px' : '20px',
                  letterSpacing: isMobile ? '-0.31px' : '-0.15px', color: 'var(--neutral-400)',
                  whiteSpace: 'nowrap',
                }}>
                  Type three characters
                </span>
              )}
            </div>
            {trigramFeedbackVisible && trigramSearch === 'floating-hint' && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  zIndex: 100,
                  padding: '4px 8px',
                  borderRadius: 8,
                  background: 'var(--neutral-700)',
                  color: '#FFFFFF',
                  boxShadow: '0px 2px 5px rgba(64,68,82,0.08), 0px 3px 9px rgba(64,68,82,0.08)',
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  fontSize: 14, fontWeight: 400, lineHeight: '20px',
                  letterSpacing: '-0.15px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                Type at least 3 characters to search
              </div>
            )}
            {/* Clear button — only when text is present */}
            {searchValue && (
              <button
                onClick={e => { e.stopPropagation(); setSearchValue(''); setDebouncedSearch(''); }}
                className="search-clear-btn flex items-center justify-center shrink-0 cursor-pointer"
                style={{ width: '28px', height: '28px', border: 'none', padding: 0, margin: '0 -8px 0 0', borderRadius: '6px' }}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          </>
          )}

          {/* Filter button */}
          {filterDefs.length > 0 && (
          <div className="relative shrink-0">
            <button
              ref={filterButtonRef}
              onClick={() => { setIsFilterMenuOpen(prev => !prev); setChipFilterAnchor(null); setCurrentPage('main'); }}
              onMouseEnter={() => setIsFilterBtnHovered(true)}
              onMouseLeave={() => setIsFilterBtnHovered(false)}
              className="lv-filter-btn relative flex items-center gap-[8px] max-md:gap-[4px] cursor-pointer"
              aria-label={filterChips.length > 0 ? `Filter, ${filterChips.length} applied` : 'Filter'}
              style={{
                height: 'var(--lv-search-h, var(--lv-row-h, 40px))',
                padding: '0 var(--lv-search-px, var(--lv-chip-px, 14px))',
                borderRadius: 'var(--lv-search-radius, 8px)',
                backgroundColor: isFilterMenuOpen ? 'var(--neutral-25)' : 'transparent',
                outline: `1px solid ${isFilterMenuOpen || isFilterBtnHovered ? 'var(--neutral-100)' : 'var(--neutral-50)'}`,
                outlineOffset: '0px',
                whiteSpace: 'nowrap',
                transition: 'background-color 100ms cubic-bezier(0.2, 0, 0.1, 1), outline-color 100ms cubic-bezier(0.2, 0, 0.1, 1)',
              }}
            >
              {[
                { src: '/m2/icons/filter-icon.svg', className: 'max-md:hidden' },
                { src: '/m2/icons/filter16.svg', className: 'md:hidden' },
              ].map(({ src, className }) => filterChips.length > 0 ? (
                <span key={src} aria-hidden className={className} style={{ width: 16, height: 16, flexShrink: 0, backgroundColor: '#533AFD', mask: `url(${src}) center / 16px 16px no-repeat`, WebkitMask: `url(${src}) center / 16px 16px no-repeat` }} />
              ) : (
                <img key={src} src={src} width="16" height="16" alt="" className={`block ${className}`} style={{ flexShrink: 0 }} />
              ))}
              <span
                className="text-[14px] font-semibold leading-[20px] tracking-[-0.15px] max-md:hidden"
                style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', color: filterChips.length > 0 ? '#533AFD' : 'var(--neutral-900)' }}
              >
                {filterChips.length > 0 ? `${filterChips.length} filter${filterChips.length === 1 ? '' : 's'}` : 'Filter'}
              </span>
              {filterChips.length > 0 && (
                <span
                  className="md:hidden"
                  style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: 16, fontWeight: 600, lineHeight: '24px', letterSpacing: '-0.31px', color: '#533AFD' }}
                >
                  {filterChips.length}
                </span>
              )}
            </button>

            {/* Filter Menu Popover */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
              {isFilterMenuOpen && !isMobile && (
              <motion.div
                ref={filterMenuRef}
                className="bg-white rounded-[8px] shadow-[0px_5px_15px_0px_rgba(0,0,0,0.12),0px_15px_35px_0px_rgba(48,49,61,0.08)] overflow-hidden z-50"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0.1, 1] }}
                style={{
                  position: 'fixed',
                  top: toolbarPopoverBounds?.top ?? 0,
                  right: 24,
                  outline: '1px solid #D8DEE4',
                  outlineOffset: '0px',
                  willChange: 'transform, opacity',
                  width: 'max-content',
                  minWidth: '320px',
                  maxWidth: '480px',
                  maxHeight: toolbarPopoverBounds?.maxHeight,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Animated content container */}
                <div ref={filterContainerRef} className="relative overflow-hidden">
                  {/* Main page */}
                  <div
                    ref={contentRef}
                    className={`transition-transform duration-[100ms]`}
                    style={{
                      transform: currentPage === 'main' ? 'translateX(0)' : 'translateX(-100%)',
                      transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.1, 1)'
                    }}
                  >
                    {/* Header + rows — single container with 4px padding */}
                    <div style={{ padding: '4px', position: 'relative' }}>
                      {/* Heading row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                        <p
                          style={{ 
                            flex: 1,
                            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                            fontSize: '14px',
                            fontWeight: 600,
                            lineHeight: '20px',
                            color: 'var(--neutral-900)',
                            margin: 0,
                          }}
                        >
                          Filter
                        </p>
                        {filterChips.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFilterChips([])}
                            style={{
                              flexShrink: 0,
                              padding: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                              fontSize: 14,
                              fontWeight: 600,
                              lineHeight: '20px',
                              letterSpacing: '-0.15px',
                              color: '#533AFD',
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {config.filterSearch && (
                        <div style={{ padding: '8px 10px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 28,
                              padding: '4px 8px',
                              border: '1px solid var(--neutral-100)',
                              borderRadius: 6,
                              background: 'white',
                            }}
                          >
                            <img src="/m2/icons/search-12.svg" alt="" style={{ display: 'block', flexShrink: 0 }} />
                            <input
                              ref={filterSearchInputRef}
                              type="text"
                              value={filterSearchQuery}
                              onChange={e => setFilterSearchQuery(e.target.value)}
                              placeholder="Search filters"
                              className="lv-filter-search"
                              style={{
                                flex: 1,
                                minWidth: 0,
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                                fontSize: 14,
                                fontWeight: 400,
                                lineHeight: '20px',
                                letterSpacing: '-0.15px',
                                color: 'var(--neutral-800)',
                              }}
                            />
                            {filterSearchQuery && (
                              <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => setFilterSearchQuery('')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 12,
                                  height: 12,
                                  padding: 0,
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                <span className="lv-filter-search-clear-icon" aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Top scrim — appears below heading when rows have scrolled */}
                      {currentPage === 'main' && showTopScrollGradient && (
                        <div
                          className="absolute left-0 right-0 pointer-events-none"
                          style={{
                            top: '36px', // heading row height (6+20+6 = 32px line + 4px padding = 36px)
                            height: '24px',
                            background: 'linear-gradient(to bottom, white, rgba(255,255,255,0))',
                            zIndex: 1,
                          }}
                        />
                      )}

                      {/* Scrollable option rows — applied filters pinned to top */}
                      <div 
                        ref={scrollContainerRef}
                        className="relative overflow-y-auto"
                        style={{
                          maxHeight: toolbarPopoverBounds
                            ? Math.max(80, toolbarPopoverBounds.maxHeight - (config.filterSearch ? 88 : 44))
                            : 344,
                        }}
                      >
                        {(() => {
                          const orderedDefs = orderFilterDefs(filterDefs, new Set(filterChips.map(c => c.filterName)), filterSearchQuery);
                          return orderedDefs.map((def) => {
                            const chip = filterChips.find(c => c.filterName === def.label);
                            return (
                              <div
                                key={def.id}
                                onClick={() => handleFilterClick(def.label)}
                                className="menu-hover-row w-full flex items-center gap-[6px] pl-[10px] pr-[4px] text-left cursor-pointer"
                                style={{
                                  transition: DEFAULT_TRANSITION,
                                  minHeight: 32,
                                  paddingTop: chip ? 2 : 6,
                                  paddingBottom: chip ? 2 : 6,
                                }}
                              >
                                <span
                                  className="flex-1 min-w-0 truncate text-[14px] font-normal leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)]"
                                  style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                                >
                                  {def.label}
                                </span>
                                {chip ? (
                                  <>
                                    <span
                                      className="shrink-0 truncate text-[14px] font-semibold leading-[20px] tracking-[-0.15px] text-[#533AFD]"
                                      style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', maxWidth: 160 }}
                                    >
                                      {filterChipValue(chip)}
                                    </span>
                                    <button
                                      type="button"
                                      className="lv-filter-clear"
                                      onClick={(e) => { e.stopPropagation(); removeFilterChip(chip.id); }}
                                      aria-label={`Remove ${def.label} filter`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 8,
                                        margin: 0,
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <span className="lv-filter-clear-icon" aria-hidden />
                                    </button>
                                  </>
                                ) : (
                                  <span
                                    style={{
                                      width: 28,
                                      height: 20,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <img
                                      src="/m2/icons/chevronDown12.svg"
                                      alt=""
                                      style={{ display: 'block', transform: 'rotate(-90deg)' }}
                                    />
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Bottom Gradient Scrim - only visible when not at bottom */}
                    {currentPage === 'main' && showScrollGradient && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[43px] pointer-events-none"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0), white)'
                        }}
                      />
                    )}
                  </div>

                  {/* Subpage - positioned absolutely to overlay; height is ref-controlled */}
                  <div
                    ref={filterSubpageRef}
                    className="absolute top-0 left-0 w-full transition-transform duration-[100ms] flex flex-col"
                    style={{
                      transform: currentPage === 'subpage' ? 'translateX(0)' : 'translateX(100%)',
                      transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.1, 1)',
                    }}
                  >
                    {/* Header with back button */}
                    <div className="pt-[12px] px-[12px] flex items-center gap-[8px]">
                      {!chipFilterAnchor && (
                        <button
                          onClick={handleBack}
                          className="relative w-[28px] h-[28px] flex items-center justify-center rounded-[6px] hover:bg-[#F5F6F8] cursor-pointer"
                          style={{ 
                            transition: DEFAULT_TRANSITION,
                            outline: '1px solid #D8DEE4',
                            outlineOffset: '0px'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10 12L6 8L10 4" style={{ stroke: 'var(--neutral-700)' }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                      <p
                        className="flex-1"
                        style={{ 
                          fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                          fontSize: '14px',
                          fontWeight: 600,
                          lineHeight: '20px',
                          color: 'var(--neutral-900)',
                          margin: 0,
                        }}
                      >
                        {selectedFilter}
                      </p>
                    </div>

                    {/* ── Multi-select: scrollable checkbox list ── */}
                    {(subpageFilterDef?.type === 'multi-select' || subpageFilterDef == null) && (
                      <>
                        <div className="relative">
                          <div
                            ref={currentPage === 'subpage' ? scrollContainerRef : null}
                            className="overflow-y-auto pt-[16px] px-[4px]"
                            style={{ maxHeight: '344px', paddingBottom: showScrollGradient ? '68px' : '0' }}
                          >
                            {subpageOptions.map((option, index) => (
                              <button
                                key={index}
                                onClick={() => toggleOption(option)}
                                className="w-full flex items-start gap-[6px] px-[10px] py-[6px] rounded-[4px] hover:bg-[#F5F6F8] text-left cursor-pointer"
                                style={{ transition: DEFAULT_TRANSITION }}
                              >
                                <div className="flex items-center justify-center h-[20px] shrink-0">
                                  <img
                                    src={selectedOptions.includes(option) ? '/m2/icons/checkboxSelected.svg' : '/m2/icons/checkboxPassive.svg'}
                                    alt=""
                                    style={{ width: '16px', height: '16px', display: 'block', flexShrink: 0 }}
                                  />
                                </div>
                                <span
                                  className="text-[14px] font-normal leading-[20px] tracking-[-0.15px] text-[color:var(--neutral-900)] flex-1"
                                  style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}
                                >
                                  {option}
                                </span>
                              </button>
                            ))}
                          </div>
                          {currentPage === 'subpage' && showScrollGradient && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-[68px] pointer-events-none"
                              style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0), white)' }}
                            />
                          )}
                        </div>
                        <div className="sticky bottom-0 bg-white flex flex-col gap-[12px] pb-[12px] pt-[4px] px-[12px] mt-auto">
                          <button onClick={handleApply} className="w-full h-[28px] bg-[#675DFF] rounded-[6px] text-white text-[14px] font-semibold leading-[20px] tracking-[-0.15px] hover:bg-[#5648E0] cursor-pointer" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', boxShadow: '0px 1px 1px 0px rgba(47, 14, 99, 0.32)', transition: DEFAULT_TRANSITION }}>Apply</button>
                        </div>
                      </>
                    )}

                    {/* ── Single-select: one-option dropdown ── */}
                    {subpageFilterDef?.type === 'single-select' && (
                      <>
                        <div style={{ padding: '16px 12px 12px' }}>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={filterSingleVal}
                              onChange={e => setFilterSingleVal(e.target.value)}
                              className="w-full bg-white border border-[#D8DEE4] hover:border-[#99A5B8] active:bg-[#F5F6F8] focus:outline-none cursor-pointer"
                              style={{
                                height: '28px', borderRadius: '6px',
                                padding: '0 26px 0 8px',
                                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                                fontSize: '14px', fontWeight: 600, letterSpacing: '-0.15px', color: 'var(--neutral-900)',
                                appearance: 'none',
                              }}
                            >
                              {subpageOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <img src="/m2/icons/arrowUpDown12.svg" alt="" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '12px', height: '12px' }} />
                          </div>
                        </div>
                        <div style={{ padding: '4px 12px 12px' }}>
                          <button onClick={handleApply} className="w-full h-[28px] bg-[#675DFF] rounded-[6px] text-white text-[14px] font-semibold leading-[20px] tracking-[-0.15px] hover:bg-[#5648E0] cursor-pointer" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', boxShadow: '0px 1px 1px 0px rgba(47, 14, 99, 0.32)', transition: DEFAULT_TRANSITION }}>Apply</button>
                        </div>
                      </>
                    )}

                    {/* ── Date: operator + value + unit + timezone ── */}
                    {subpageFilterDef?.type === 'date' && (() => {
                      const FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
                      const selectStyle: React.CSSProperties = {
                        height: '28px', borderRadius: '6px',
                        padding: '0 26px 0 8px',
                        fontFamily: FONT, fontSize: '14px', fontWeight: 600,
                        letterSpacing: '-0.15px', color: 'var(--neutral-900)',
                        appearance: 'none', cursor: 'pointer',
                      };
                      const SELECT_CLS = 'bg-white border border-[#D8DEE4] hover:border-[#99A5B8] active:bg-[#F5F6F8] focus:outline-none';
                      const SelectIcon = () => (
                        <img src="/m2/icons/arrowUpDown12.svg" alt="" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '12px', height: '12px' }} />
                      );
                      return (
                        <>
                          {/* Body */}
                          <div style={{ padding: '16px 4px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 8px' }}>

                              {/* Operator select */}
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={filterDateOp}
                                  onChange={e => setFilterDateOp(e.target.value)}
                                  className={`w-full ${SELECT_CLS}`}
                                  style={selectStyle}
                                >
                                  {FILTER_DATE_OPS.map(o => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                                <SelectIcon />
                              </div>

                              {/* Value + unit row */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {/* → arrow icon */}
                                <svg style={{ flexShrink: 0, color: 'var(--neutral-700)' }} width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M1.5 6H10.5M10.5 6L7.5 3M10.5 6L7.5 9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>

                                {/* Number input — hide browser spinners via inline style */}
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={filterDateVal}
                                  onChange={e => setFilterDateVal(e.target.value.replace(/[^0-9]/g, ''))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
                                  style={{
                                    flex: 1, height: '28px', minWidth: 0,
                                    border: '1px solid #D8DEE4', borderRadius: '6px',
                                    padding: '0 8px', outline: 'none',
                                    fontFamily: FONT, fontSize: '14px',
                                    color: 'var(--neutral-900)', backgroundColor: 'white',
                                    boxShadow: '0px 1px 1px 0px rgba(33, 37, 44, 0.16)',
                                  }}
                                />

                                {/* Unit select — 70px fixed */}
                                <div style={{ position: 'relative', width: '70px', flexShrink: 0 }}>
                                  <select
                                    value={filterDateUnit}
                                    onChange={e => setFilterDateUnit(e.target.value)}
                                    className={SELECT_CLS}
                                    style={{ ...selectStyle, width: '70px' }}
                                  >
                                    {FILTER_DATE_UNITS.map(u => (
                                      <option key={u}>{u}</option>
                                    ))}
                                  </select>
                                  <SelectIcon />
                                </div>
                              </div>

                              {/* Time zone row */}
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ flex: 1, fontFamily: FONT, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-600)' }}>
                                  Time zone
                                </span>
                                {FILTER_TIMEZONES.map(tz => {
                                  const active = filterDateTz === tz;
                                  return (
                                    <button
                                      key={tz}
                                      onClick={() => setFilterDateTz(tz)}
                                      style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                      {/* Radio circle with top-shadow */}
                                      <div style={{ paddingTop: '3px', flexShrink: 0 }}>
                                        <div style={{
                                          width: '14px', height: '14px', borderRadius: '50%',
                                          border: `1px solid ${active ? '#675DFF' : '#D8DEE4'}`,
                                          backgroundColor: 'white',
                                          boxShadow: '0px 1px 1px 0px rgba(33, 37, 44, 0.16)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          transition: 'border-color 120ms',
                                        }}>
                                          {active && (
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#675DFF' }} />
                                          )}
                                        </div>
                                      </div>
                                      <span style={{ fontFamily: FONT, fontSize: '14px', fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-900)' }}>
                                        {tz}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                            </div>
                          </div>

                          {/* Apply footer */}
                          <div style={{ padding: '4px 12px 12px' }}>
                            <button
                              onClick={handleApply}
                              className="w-full h-[28px] bg-[#675DFF] rounded-[6px] text-white text-[14px] font-semibold leading-[20px] tracking-[-0.15px] hover:bg-[#5648E0] cursor-pointer"
                              style={{ fontFamily: FONT, boxShadow: '0px 1px 1px 0px rgba(47, 14, 99, 0.32)', transition: DEFAULT_TRANSITION }}
                            >
                              Apply
                            </button>
                          </div>
                        </>
                      );
                    })()}

                    {/* ── Value: operator + free-text input ── */}
                    {subpageFilterDef?.type === 'value' && (() => {
                      const selStyle: React.CSSProperties = {
                        height: '28px', borderRadius: '6px',
                        padding: '0 26px 0 8px', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                        fontSize: '14px', fontWeight: 600, letterSpacing: '-0.15px', color: 'var(--neutral-900)',
                        cursor: 'pointer', appearance: 'none',
                      };
                      return (
                        <>
                          <div style={{ padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Operator dropdown */}
                            <div style={{ position: 'relative' }}>
                              <select value={filterValueOp} onChange={e => setFilterValueOp(e.target.value)} className="w-full bg-white border border-[#D8DEE4] hover:border-[#99A5B8] active:bg-[#F5F6F8] focus:outline-none" style={selStyle}>
                                {FILTER_VALUE_OPS.map(o => <option key={o}>{o}</option>)}
                              </select>
                              <img src="/m2/icons/arrowUpDown12.svg" alt="" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', width: '12px', height: '12px' }} />
                            </div>
                            {/* Value input */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <svg style={{ flexShrink: 0 }} width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8H13M13 8L9 4M13 8L9 12" style={{ stroke: 'var(--neutral-700)' }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <input
                                type="text"
                                value={filterValueInput}
                                onChange={e => setFilterValueInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
                                style={{
                                  flex: 1, height: '28px', border: '1px solid #D8DEE4', borderRadius: '6px',
                                  padding: '0 8px', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                                  fontSize: '14px', color: 'var(--neutral-900)', backgroundColor: 'white', outline: 'none',
                                  minWidth: 0,
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ padding: '4px 12px 12px' }}>
                            <button onClick={handleApply} className="w-full h-[28px] bg-[#675DFF] rounded-[6px] text-white text-[14px] font-semibold leading-[20px] tracking-[-0.15px] hover:bg-[#5648E0] cursor-pointer" style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', boxShadow: '0px 1px 1px 0px rgba(47, 14, 99, 0.32)', transition: DEFAULT_TRANSITION }}>Apply</button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
              )}
              </AnimatePresence>
            , document.body)}
            <MobileFilterSheet
              variant={sheetMode === 'popovers' ? 'popover' : 'sheet'}
              fixedSheetHeight={fixedSheetHeight}
              anchorRef={filterButtonRef}
              open={isFilterMenuOpen && isMobile}
              panelRef={filterMenuRef}
              page={currentPage}
              filterDefs={filterDefs}
              appliedValue={label => {
                const chip = filterChips.find(c => c.filterName === label);
                return chip ? filterChipValue(chip) : undefined;
              }}
              selectedFilter={selectedFilter}
              form={{
                def: subpageFilterDef,
                selectedOptions, toggleOption,
                singleVal: filterSingleVal, setSingleVal: setFilterSingleVal,
                dateOp: filterDateOp, setDateOp: setFilterDateOp,
                dateVal: filterDateVal, setDateVal: setFilterDateVal,
                dateUnit: filterDateUnit, setDateUnit: setFilterDateUnit,
                dateTz: filterDateTz, setDateTz: setFilterDateTz,
                valueOp: filterValueOp, setValueOp: setFilterValueOp,
                valueInput: filterValueInput, setValueInput: setFilterValueInput,
              }}
              onSelectFilter={handleFilterClick}
              onClearFilter={label => setFilterChips(prev => prev.filter(c => c.filterName !== label))}
              onClearAll={() => setFilterChips([])}
              onBack={handleBack}
              onApply={handleApply}
              onClose={() => { setIsFilterMenuOpen(false); setCurrentPage('main'); setChipFilterAnchor(null); }}
            />
          </div>
          )}

          {/* Table Controls */}
          {!activeTab.hideTableControls && (
          <div className="relative max-md:hidden">
            <button
              ref={tableSettingsBtnRef}
              onClick={() => setIsTableSettingsOpen(v => !v)}
              className="table-settings-btn flex items-center justify-center cursor-pointer"
              style={{ width: 'var(--lv-search-h, var(--lv-row-h, 40px))', height: 'var(--lv-search-h, var(--lv-row-h, 40px))', borderRadius: 8, background: 'white' }}
            >
              <img src="/m2/icons/table-controls.svg" alt="Table Controls" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            </button>

            {/* Table Settings Popover */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
              {isTableSettingsOpen && (
              <motion.div
                ref={tableSettingsRef}
                className="z-50 bg-white rounded-[12px] overflow-hidden"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0.1, 1] }}
                style={{
                  position: 'fixed',
                  top: toolbarPopoverBounds?.top ?? 0,
                  right: 24,
                  width: '320px',
                  minWidth: '320px',
                  maxHeight: toolbarPopoverBounds?.maxHeight,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
                  fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                  willChange: 'transform, opacity',
                }}
              >
                {/* Header */}
                <div className="py-[8px] shrink-0">
                  <div className="px-[12px] py-[6px]">
                    <span style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: '14px', fontWeight: 600, lineHeight: '20px', color: 'var(--neutral-900)' }}>Table settings</span>
                  </div>
                </div>
                <div style={{ height: '1px', background: '#EBEEF1', flexShrink: 0 }} />

                {/* Scrollable body */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {/* Wrap cells */}
                  <div className="py-[8px]">
                    <div className="flex items-center justify-between px-[12px] py-[6px]">
                      <span className="text-[14px] font-normal leading-5 text-[color:var(--neutral-900)]">Wrap cells</span>
                      <button
                        className={`toggle-switch${wrapCells ? ' on' : ''}`}
                        onClick={() => setWrapCells(v => !v)}
                      />
                    </div>
                  </div>
                  <div style={{ height: '1px', background: '#EBEEF1' }} />

                  {/* Columns */}
                  <div className="py-[8px]">
                    <span className="block px-[15px] py-[4px] text-[12px] font-[600] leading-[16px] text-[color:var(--neutral-600)]">Columns</span>
                    <div className="px-[4px]">
                      {popoverColumns.map(col => {
                        const isOn = visibleColumns.has(col.id);
                        return (
                          <button
                            key={col.id}
                            onClick={() => toggleColumn(col.id)}
                            className="w-full flex items-center gap-[6px] px-[12px] py-[6px] hover:bg-[#F5F6F8] cursor-pointer rounded-[4px]"
                            style={{ background: 'none', border: 'none', textAlign: 'left' }}
                          >
                            {/* Mini checkbox */}
                            <img
                              src={isOn ? '/m2/icons/checkboxSelected.svg' : '/m2/icons/checkboxPassive.svg'}
                              alt=""
                              style={{ width: '16px', height: '16px', display: 'block', flexShrink: 0 }}
                            />
                            <span className={`flex-1 min-w-0 text-[14px] leading-5 ${isOn ? 'text-[color:var(--neutral-900)] font-normal' : 'text-[color:var(--neutral-400)] font-normal'}`}>
                              {col.label}
                            </span>
                            {(col.type === 'metadata' || col.isMetadata) && (
                              <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 400, lineHeight: '16px', borderRadius: '4px', padding: '2px 6px', background: 'var(--neutral-25)', color: 'var(--neutral-600)', outline: '1px solid var(--neutral-100)' }}>
                                Metadata
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
              )}
              </AnimatePresence>
            , document.body)}
          </div>
          )}
        </div>
      </div>

      {plusMenu && typeof document !== 'undefined' && createPortal(
        <div
          ref={plusMenuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: plusMenu.top,
            left: plusMenu.left,
            zIndex: 200,
            background: '#fff',
            border: '1px solid var(--neutral-100)',
            borderRadius: 8,
            boxShadow: '0px 15px 35px rgba(48,49,61,0.08), 0px 5px 15px rgba(0,0,0,0.12)',
            padding: 4,
            minWidth: 168,
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
          }}
        >
          {([
            { label: 'Create view', icon: '/m2/icons/add16.svg', onClick: startCreateView },
            { label: 'Edit views', icon: '/m2/icons/edit16.svg', onClick: openEditViews },
          ] as const).map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="menu-hover-row"
              onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '6px 10px', border: 'none', cursor: 'pointer',
                font: 'inherit', fontSize: 14, fontWeight: 400, lineHeight: '20px',
                letterSpacing: '-0.15px', color: 'var(--neutral-800)', textAlign: 'left',
              }}
            >
              <span style={{ width: 16, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={item.icon} alt="" width={12} height={12} style={{ display: 'block' }} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}

      {editViewsOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(11, 26, 43, 0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onMouseDown={closeEditViews}
        >
          <div
            role="dialog"
            aria-label="Edit views"
            onMouseDown={e => {
              e.stopPropagation();
              const target = e.target as HTMLElement;
              if (!target.closest('[data-confirm-anchor]')) {
                setDeleteConfirm(null);
                setResetConfirm(null);
              }
            }}
            style={{
              width: 480,
              maxHeight: 'calc(100vh - 48px)',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0px 15px 35px rgba(48,49,61,0.08), 0px 5px 15px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: '24px', letterSpacing: '-0.31px', color: 'var(--neutral-900)' }}>Edit views</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeEditViews}
                className="menu-hover-row"
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <img src="/m2/icons/cancel12.svg" alt="" style={{ width: 12, height: 12, display: 'block' }} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: lockedDefaults ? '0 16px 16px' : '0 16px', minHeight: 0 }}>
              {editViewGroups.map((group, groupIndex) => (
                <div
                  key={group.label ?? 'all-views'}
                  style={{ paddingBottom: lockedDefaults && groupIndex < editViewGroups.length - 1 ? 16 : 0 }}
                >
                  {group.label && (
                    <div style={{
                      padding: '6px 0',
                      fontSize: 12, fontWeight: 700, lineHeight: '20px',
                      color: 'var(--neutral-800)',
                    }}>
                      {group.label}
                    </div>
                  )}
                  {group.chips.map((chip, rowIndex) => {
                const isAll = chip.id === primaryChipId;
                const isLockedStripeDefault = lockedDefaults && isStripeDefaultView(chip.id);
                const isPartiallyLockedView = partialLocked && isLockedView(chip.id);
                const canToggleVisibility = !isAll;
                const canRename = !isLockedView(chip.id);
                const canDelete = !isLockedView(chip.id);
                const isShown = isAll || pinnedViewIds.has(chip.id);
                const isRenaming = renameChipId === chip.id;
                const isDefault = defaultChipId === chip.id;
                const rowHovered = editRowHoverId === chip.id;
                return (
                  <div
                    key={chip.id}
                    onMouseEnter={() => setEditRowHoverId(chip.id)}
                    onMouseLeave={() => setEditRowHoverId(current => current === chip.id ? null : current)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '8px 0',
                      paddingRight: isLockedStripeDefault ? 8 : 0,
                      borderBottom: !lockedDefaults || rowIndex < group.chips.length - 1 ? '1px solid var(--neutral-50)' : 'none',
                    }}
                  >
                    <button
                      type="button"
                      className={canToggleVisibility ? 'lv-edit-hit lv-edit-hit--eye' : 'lv-edit-hit'}
                      aria-label={!canToggleVisibility ? `${chip.label} is locked` : (isShown ? `Hide ${chip.label}` : `Show ${chip.label}`)}
                      disabled={!canToggleVisibility || undefined}
                      onClick={() => { if (canToggleVisibility) toggleViewShown(chip.id); }}
                      style={{ cursor: canToggleVisibility ? 'pointer' : 'not-allowed' }}
                    >
                      {isPartiallyLockedView && isAll ? (
                        <img src="/m2/icons/lock.svg" alt="" style={{ display: 'block' }} />
                      ) : isAll ? (
                        <img src="/m2/icons/eyeOpen16.svg" alt="" style={{ width: 16, height: 16, display: 'block' }} />
                      ) : lockedDefaults && !isShown ? (
                        <span className="lv-edit-icon--neutral-400" style={{ '--lv-edit-icon': 'url(/m2/icons/eyeClosed16.svg)' } as React.CSSProperties} />
                      ) : (
                        <img
                          src={isShown ? '/m2/icons/eyeOpen16.svg' : '/m2/icons/eyeClosed16.svg'}
                          alt=""
                          style={{ width: 16, height: 16, display: 'block' }}
                        />
                      )}
                    </button>
                    <div
                      className={canRename ? 'lv-edit-field' : undefined}
                      data-editing={isRenaming ? 'true' : undefined}
                      style={!canRename ? { flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center' } : undefined}
                    >
                      {!canRename ? (
                        <span
                          style={{
                            position: 'relative', zIndex: 1,
                            width: '100%', minWidth: 0,
                            font: 'inherit', fontSize: 14, lineHeight: '20px', letterSpacing: '-0.15px',
                            fontWeight: isShown ? 600 : 400,
                            color: isShown ? 'var(--neutral-900)' : (lockedDefaults ? 'var(--neutral-400)' : 'var(--neutral-600)'),
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            cursor: 'default',
                          }}
                        >
                          {chip.label}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={isRenaming ? renameValue : chip.label}
                          aria-label={`Rename ${chip.label}`}
                          onFocus={() => {
                            if (renameChipId === chip.id) return;
                            setRenameChipId(chip.id);
                            setRenameValue(chip.label);
                          }}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') {
                              e.stopPropagation();
                              skipRenameCommitRef.current = true;
                              setRenameChipId(null);
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={() => {
                            if (skipRenameCommitRef.current) {
                              skipRenameCommitRef.current = false;
                              setRenameChipId(null);
                              return;
                            }
                            commitEditRename();
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          style={{
                            position: 'relative', zIndex: 1,
                            width: '100%', minWidth: 0,
                            background: 'none', border: 'none', outline: 'none', padding: 0,
                            font: 'inherit', fontSize: 14, lineHeight: '20px', letterSpacing: '-0.15px',
                            fontWeight: isShown || isRenaming ? 600 : 400,
                            color: isShown || isRenaming ? 'var(--neutral-900)' : (lockedDefaults ? 'var(--neutral-400)' : 'var(--neutral-600)'),
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            cursor: 'text',
                          }}
                        />
                      )}
                    </div>
                    {isDefault && (
                      <span style={{
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center',
                        height: 20, padding: '0 6px', borderRadius: 4,
                        background: '#F5F6F8', color: 'var(--neutral-700)',
                        outline: '1px solid #D8DEE4', outlineOffset: 0,
                        fontSize: 12, fontWeight: 400, lineHeight: '16px',
                        whiteSpace: 'nowrap',
                      }}>Default</span>
                    )}
                    {!isDefault && rowHovered && (
                      <button
                        type="button"
                        aria-label={`Make ${chip.label} the default view`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => setDefaultChipId(chip.id)}
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center',
                          height: 20, padding: '0 6px', borderRadius: 4,
                          background: 'transparent', color: 'var(--neutral-400)',
                          outline: '1px solid var(--neutral-50)', outlineOffset: 0,
                          border: 'none', cursor: 'pointer',
                          font: 'inherit', fontSize: 12, fontWeight: 400, lineHeight: '16px',
                          whiteSpace: 'nowrap',
                        }}
                      >Default</button>
                    )}
                    {!isDefault && isRenaming && !rowHovered && (
                      <span
                        aria-hidden
                        style={{
                          flexShrink: 0,
                          visibility: 'hidden',
                          display: 'inline-flex', alignItems: 'center',
                          height: 20, padding: '0 6px',
                          fontSize: 12, fontWeight: 400, lineHeight: '16px',
                          whiteSpace: 'nowrap',
                        }}
                      >Default</span>
                    )}
                    {!canDelete ? (
                      !lockedDefaults && (
                        <button
                          type="button"
                          className="lv-edit-hit"
                          disabled
                          aria-label={`${chip.label} cannot be deleted`}
                        >
                          <span className="lv-edit-icon--muted" style={{ '--lv-edit-icon': 'url(/m2/icons/negativeCircleFilled.svg)' } as React.CSSProperties} />
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        className="lv-edit-hit lv-edit-hit--delete"
                        data-confirm-anchor=""
                        aria-label={`Delete ${chip.label}`}
                        onClick={e => {
                          setResetConfirm(null);
                          setDeleteConfirm({ chipId: chip.id, ...placeConfirm(e.currentTarget) });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src="/m2/icons/negativeCircleFilled.svg" alt="" style={{ width: 16, height: 16, display: 'block' }} />
                      </button>
                    )}
                  </div>
                );
                  })}
                </div>
              ))}
            </div>
            {!lockedDefaults && <div style={{ padding: 16, flexShrink: 0 }}>
              <button
                type="button"
                data-confirm-anchor=""
                onClick={e => {
                  setDeleteConfirm(null);
                  setResetConfirm(placeConfirm(e.currentTarget));
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  height: 28, padding: '0 8px', borderRadius: 6,
                  border: '1px solid #D8DEE4', background: '#fff', color: 'var(--neutral-900)',
                  font: 'inherit', fontSize: 12, fontWeight: 600, lineHeight: '16px',
                  letterSpacing: '-0.2px', cursor: 'pointer',
                }}
              >
                <img src="/m2/icons/refund.svg" alt="" style={{ display: 'block' }} />
                Reset page to Stripe defaults
              </button>
            </div>}
          </div>
        </div>,
        document.body,
      )}

      {(deleteConfirm || resetConfirm) && typeof document !== 'undefined' && createPortal(
        <div
          ref={confirmPopoverRef}
          role="dialog"
          aria-label={deleteConfirm ? 'Delete view' : 'Reset page'}
          {...{ [STACKED_LAYER_ATTR]: '' }}
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: (deleteConfirm ?? resetConfirm)!.top,
            left: (deleteConfirm ?? resetConfirm)!.left,
            zIndex: 10020,
            width: 336,
            background: '#fff',
            border: '1px solid var(--neutral-100)',
            borderRadius: 8,
            boxShadow: '0px 15px 35px rgba(48,49,61,0.08), 0px 5px 15px rgba(0,0,0,0.12)',
            padding: 16,
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: '24px', letterSpacing: '-0.31px', color: 'var(--neutral-900)' }}>
            {deleteConfirm ? 'Delete view' : 'Reset page'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 400, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-600)' }}>
            {deleteConfirm
              ? lockedDefaults
                ? 'Custom views cannot be recovered after being deleted'
                : 'Customizations cannot be recovered after being deleted'
              : 'All customizations will be removed, and the Stripe default views will be restored.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { setDeleteConfirm(null); setResetConfirm(null); }}
              style={{
                height: 28, padding: '0 8px', borderRadius: 6,
                border: '1px solid var(--neutral-100)', background: '#fff', color: 'var(--neutral-900)',
                font: 'inherit', fontSize: 14, fontWeight: 600, lineHeight: '20px',
                letterSpacing: '-0.15px', cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (deleteConfirm) deleteChip(deleteConfirm.chipId);
                else resetPageToStripeDefaults();
              }}
              style={{
                height: 28, padding: '0 8px', borderRadius: 6,
                border: 'none', background: '#E61947', color: '#fff',
                font: 'inherit', fontSize: 14, fontWeight: 600, lineHeight: '20px',
                letterSpacing: '-0.15px', cursor: 'pointer',
              }}
            >{deleteConfirm ? 'Delete' : 'Reset page'}</button>
          </div>
        </div>,
        document.body,
      )}

      {/* Custom content for a blank tab (e.g. a hand-built page instead of a table) */}
      {activeTab.placeholder && activeTab.blank && activeTab.content}

      {/* Placeholder empty state */}
      {activeTab.placeholder && !activeTab.blank && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 16px', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
            <span style={{ fontFamily: 'SF Pro Display, SF Pro Text, system-ui, sans-serif', fontSize: 20, fontWeight: 700, lineHeight: '28px', letterSpacing: '0.3px', color: '#000' }}>Add your first &lt;thing&gt;</span>
            <span style={{ fontSize: 14, fontWeight: 400, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-600)' }}>(This is a placeholder empty state)</span>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '4px 8px', background: '#675DFF', border: '1px solid #675DFF', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: '-0.15px', lineHeight: '20px', cursor: 'default', boxShadow: '0px 1px 1px 0px rgba(47,14,99,0.32)', fontFamily: 'inherit' }}>
            <img src="/m2/icons/add12.svg" alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(1)' }} />
            Add &lt;thing&gt;
          </button>
        </div>
      )}

      {/* Table */}
      <div
        ref={tableOuterRef}
        className="relative"
        style={{ display: activeTab.placeholder ? 'none' : undefined }}
        onMouseMove={handleTableMouseMove}
        onMouseLeave={handleTableMouseLeave}
      >
        {showTrigramEmptyState && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--neutral-25)',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-900)' }}>
                Keep typing to search
              </span>
              <span style={{ fontSize: 12, fontWeight: 400, lineHeight: '16px', color: 'var(--neutral-600)' }}>
                Enter at least 3 characters to search
              </span>
            </div>
          </div>
        )}

        {/* Shimmer overlay */}
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            pointerEvents: 'none', overflow: 'hidden',
            display: showTrigramEmptyState ? 'none' : undefined,
            opacity: isTableLoading ? 1 : 0,
            transition: 'opacity 250ms cubic-bezier(0.2, 0, 0.1, 1)',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,var(--shimmer-s1)) 0%, rgba(255,255,255,var(--shimmer-s2)) 50%, rgba(255,255,255,var(--shimmer-s3)) 100%)',
            animation: 'shimmerPulse 2s linear infinite',
          }} />
        </div>

      <table
        ref={tableElRef}
        className={`data-table max-md:hidden border-separate border-spacing-0${noSearch ? '' : ' no-top-border'}${dragColId ? ' no-row-hover' : ''}`}
        style={{ display: showTrigramEmptyState ? 'none' : undefined, fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', tableLayout: 'fixed', width: '100%', fontVariantNumeric: 'tabular-nums', userSelect: resizingCol ? 'none' : 'auto', borderSpacing: 0, position: 'relative', marginBottom: '20px' }}
      >
        <colgroup>
          {bulkSelectCheckboxes ? <col style={{ width: '40px' }} /> : null}
          {columnOrder.flatMap(colId => {
            if (!visibleColumns.has(colId)) return [];
            // Skip stale column IDs that don't belong to the current tab
            if (!colMeta[colId]) return [];
            const colType = colMeta[colId]?.type;
            // width === 0 is the Fit sentinel: omit the width style so the browser auto-sizes.
            const fitCol = (columnWidths[colId] ?? 0) === 0;
            if (colType === 'currency') return [
              <col key={`col-${colId}-val`}  data-col-id={colId} style={fitCol ? {} : { width: `${(columnWidths[colId] ?? 200) - 56}px` }} />,
              <col key={`col-${colId}-code`} style={{ width: '56px' }} />,
            ];
            if (colType === 'date') return [
              <col key={`col-${colId}-1`} style={{ width: '1px' }} />,
              <col key={`col-${colId}-2`} data-col-id={colId} style={fitCol ? {} : { width: `${columnWidths[colId]}px` }} />,
            ];
            return [<col key={`col-${colId}`} data-col-id={colId} style={fitCol ? {} : { width: `${columnWidths[colId]}px` }} />];
          })}
          <col />
          <col style={{ width: '40px' }} />
        </colgroup>
        <thead
          ref={theadRef}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
          style={{
            position: 'sticky', top: 'var(--sticky-bar-h, 0px)', zIndex: 4,
            backgroundColor: '#FFFFFF',
            boxShadow: isScrolled ? '0 8px 32px 0px rgba(255,255,255,1)' : 'none',
            transition: 'box-shadow 150ms cubic-bezier(0.2, 0, 0.1, 1)',
          }}
        >
          {(() => {
            const hdrBase = 'text-[12px] font-semibold leading-4 tracking-[0px]';
            const hdrBg: React.CSSProperties = {
              position: 'relative',
              borderTop: '1px solid var(--neutral-25)',
            };

            const sortIcon = (colId: string) => {
              if (sortCol !== colId) return null;
              return (
                <img
                  src="/m2/icons/arrowDown.svg"
                  alt=""
                  style={{
                    display: 'inline',
                    width: '10px',
                    height: '10px',
                    marginLeft: '4px',
                    verticalAlign: 'middle',
                    position: 'relative',
                    top: '-1px',
                    flexShrink: 0,
                    transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none',
                  }}
                />
              );
            };

            const visibleColOrder = columnOrder.filter(c => visibleColumns.has(c));
            const lastVisibleColId = visibleColOrder[visibleColOrder.length - 1];

            return (
              <tr className="h-[40px]" style={{ backgroundColor: '#FFFFFF' }}>
                {bulkSelectCheckboxes ? (
                <th
                  style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--neutral-25)', borderBottom: '1px solid var(--neutral-50)', position: 'sticky', left: 0, zIndex: 3, width: '40px', padding: 0, textAlign: 'center', verticalAlign: 'middle' }}
                >
                  {/* L1: white blocker */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', background: 'white', pointerEvents: 'none' }} />
                  {/* L2: perma rounded cap */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', background: 'white', borderRadius: '8px 0 0 8px', pointerEvents: 'none' }} />
                  {/* L3: gradient scrim */}
                  <div className="header-left-scrim" style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '88px', borderRadius: '8px 0 0 8px', pointerEvents: 'none' }} />
                  <button
                    ref={headerCheckboxRef}
                    type="button"
                    aria-label="Row selection"
                    aria-haspopup="menu"
                    aria-expanded={bulkSelectionMenu != null}
                    onClick={openBulkSelectionMenu}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: 0,
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    <img
                      src={allSelected ? '/m2/icons/checkboxSelected.svg' : someSelected ? '/m2/icons/checkboxIndeterminate.svg' : '/m2/icons/checkboxPassive.svg'}
                      alt=""
                      style={{ width: '16px', height: '16px', display: 'block', flexShrink: 0 }}
                    />
                  </button>
                </th>
                ) : null}
                {(() => {
                  // Only the rightmost frozen column gets the right-side separator border.
                  const lastFrozenHdrColId = [...columnOrder].reverse().find(id => visibleColumns.has(id) && frozenColumns.has(id));
                  return columnOrder.map(colId => {
                  if (!visibleColumns.has(colId)) return null;
                  const meta = colMeta[colId];
                  // colMeta only contains the active tab's columns — stale columnOrder IDs
                  // from the previous tab are skipped until the layout effect corrects state.
                  if (!meta) return null;
                  const isFrozenHdr = frozenColumns.has(colId);
                  const frozenHdrStyle: React.CSSProperties = isFrozenHdr
                    ? { position: 'sticky', left: `var(--fl-${colId})`, zIndex: 3, backgroundColor: '#FFFFFF', borderRight: colId === lastFrozenHdrColId ? '1px solid #E0E6EF' : undefined }
                    : {};
                  return (
                    <th
                      key={colId}
                      data-col-id={colId}
                      colSpan={meta.colSpan}
                      className={`col-header px-[16px] text-${meta.align} ${hdrBase}`}
                      style={{ ...hdrBg, ...frozenHdrStyle }}
                      onMouseDown={e => handleColMouseDown(e, colId)}
                      onClick={e => { if (!dragColHappenedRef.current) openColumnMenu(e, colId); }}
                    >
                      <span style={{ opacity: (isTableLoading || foreverLoading || dragColId === colId) ? 0 : 1, transition: isTableLoading ? 'none' : 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)' }}>
                        {meta.label}{sortIcon(colId)}
                      </span>
                      {columnResizeStyle === 'header' && colId !== lastVisibleColId && (
                        <div style={{
                          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                          width: '1px', height: '12px', background: 'var(--neutral-100)', pointerEvents: 'none',
                          opacity: (isHeaderHovered || resizingCol === colId) ? 1 : 0,
                          transition: 'opacity 200ms cubic-bezier(0.2, 0, 0.1, 1)',
                        }} />
                      )}
                    </th>
                  );
                });
                })()}
                {/* True filler — absorbs remaining table width so data columns stay at exact pixel widths */}
                <th style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--neutral-25)', borderBottom: '1px solid var(--neutral-50)' }} />
                {/* Sticky right endcap for header — must be last cell so it sits at the far right edge */}
                <th style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid var(--neutral-25)', borderBottom: '1px solid var(--neutral-50)', position: 'sticky', right: 0, zIndex: 3, width: '40px' }}>
                  {/* L1: white blocker */}
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '12px', background: 'white', pointerEvents: 'none' }} />
                  {/* L2: perma rounded cap */}
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '12px', background: 'white', borderRadius: '0 8px 8px 0', pointerEvents: 'none' }} />
                  {/* L3: gradient scrim */}
                  <div className="header-right-scrim" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '88px', borderRadius: '0 8px 8px 0', pointerEvents: 'none' }} />
                </th>
              </tr>
            );
          })()}
        </thead>
        <tbody style={{ opacity: (isTableLoading && !isInitialLoad) ? 0 : 1, transition: (isTableLoading && !isInitialLoad) ? 'none' : 'opacity 100ms cubic-bezier(0.2, 0, 0.1, 1)' }}>
          {filteredRows.map(({ row, originalIndex }, i) => (
            <TableRow
              key={originalIndex}
              row={row}
              originalIndex={originalIndex}
              isSelected={selectedRows.has(originalIndex)}
              prevSelected={selectedRows.has(filteredRows[i - 1]?.originalIndex ?? -1)}
              nextSelected={selectedRows.has(filteredRows[i + 1]?.originalIndex ?? -1)}
              isLastRow={i === filteredRows.length - 1}
              isZebra={false}
              isSkeletonLoading={(isTableLoading && isInitialLoad) || foreverLoading}
              dragColId={dragColId}
              columnOrder={columnOrder}
              visibleColumns={visibleColumns}
              wrapCells={wrapCells}
              onToggleSelect={toggleRowSelected}
              hasSelectionRef={hasSelectionRef}
              onRowClick={handleRowClick}
              onRowOpen={onRowOpen}
              frozenColumns={frozenColumns}
              columnWidths={columnWidths}
              columnDragStyle={columnDragStyle}
              columnDefs={activeTab.columns}
              rowActions={activeTab.rowActions ?? []}
              bulkSelectCheckboxes={bulkSelectCheckboxes}
              searchQuery={trimmedSearchLength >= 3 ? debouncedSearch.trim() : ''}
            />
          ))}
        </tbody>
      </table>
        {!showTrigramEmptyState && (
          <MobileList
            className="md:hidden px-[4px] pb-[20px]"
            tab={activeTab}
            rows={filteredRows}
            loading={(isTableLoading && isInitialLoad) || foreverLoading}
            style={{ opacity: (isTableLoading && !isInitialLoad) ? 0 : 1, transition: (isTableLoading && !isInitialLoad) ? 'none' : 'opacity 100ms cubic-bezier(0.2, 0, 0.1, 1)' }}
            renderText={(value, col) => col.searchable && trimmedSearchLength >= 3 ? highlightSearchText(value, debouncedSearch) : String(value ?? '')}          />
        )}
        {/* Full-height column hover/resize divider — only used in 'full' resize mode */}
        {columnResizeStyle === 'full' && !showTrigramEmptyState && (
          <div
            className="absolute"
            style={{
              top: '8px',
              bottom: '8px',
              left: `${(colDivider ?? lastColDivider.current).x}px`,
              width: '24px',
              transform: 'translateX(-12px)',
              opacity: colDivider !== null || resizingCol !== null ? 1 : 0,
              transition: 'opacity 200ms cubic-bezier(0.2, 0, 0.1, 1)',
              zIndex: 15,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '1px', background: resizingCol ? 'var(--neutral-100)' : 'var(--neutral-50)', transition: 'background 100ms cubic-bezier(0.2, 0, 0.1, 1)' }} />
          </div>
        )}

      </div>

      </div>{/* end tableScrollRef */}

      {/* Floating action bar */}
      {barVisible && bulkSelectCheckboxes && (() => {
        // Keep snapshot fresh while bar is active; freeze it once exit begins
        if (!barExiting && selectedRows.size > 0) {
          barSnapshotRef.current = { selectedCount: selectedRows.size, refundableCount: refundableSelected };
        }
        const { selectedCount, refundableCount } = barSnapshotRef.current;
        const allRefundable = refundableCount === selectedCount;

        const FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
        const darkBtn: React.CSSProperties = {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '28px',
          background: ACTION_BAR_BG,
          border: `1px solid ${ACTION_BAR_STROKE}`,
          borderRadius: '6px',
          boxShadow: '0px 1px 1px 0px rgba(33,37,44,0.16)',
          color: 'white',
          fontSize: '14px', fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.15px',
          fontFamily: FONT,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        };
        const clearBtn: React.CSSProperties = {
          ...darkBtn,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        };
        const iconFilter = 'brightness(0) invert(1)';
        // Below 1220px, shift the bar up so it doesn't overlap the (always-visible) pagination.
        // At wider viewports the bar overlaps the pagination (there's room for both).
        // Shift amount = pagination bar's own height (52px, --lv-pagination-h) — in m2 this
        // was 48px (its GlobalFooter height) because pagination sat flush atop that footer;
        // smart-arb has no GlobalFooter, so pagination sits flush at bottom:0 instead.
        const paginationActive = windowWidth < 1220;
        const paginationShift = 52 + (showScrollbar ? SCROLLBAR_H - 1 : 0);
        const restY = paginationActive ? -paginationShift : 0;
        const exitY = paginationActive ? -(paginationShift - 12) : 12; // 12px downward from rest position
        const initY = paginationActive ? -(paginationShift - 12) : 12; // enter from 12px below rest
        return (
          <motion.div
            initial={{ opacity: 0, y: initY }}
            animate={{ opacity: barExiting ? 0 : 1, y: barExiting ? exitY : restY }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0.1, 1] }}
            style={{
              position: 'fixed',
              bottom: '64px',
              left: `calc(${paginationLeft / 2}px + 50vw - 228px)`,
              width: '456px',
              zIndex: 10000,
              background: ACTION_BAR_BG,
              borderRadius: '12px',
              boxShadow: '0px 15px 35px rgba(48,49,61,0.08), 0px 5px 15px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              minHeight: '44px',
              fontFamily: FONT,
              whiteSpace: 'nowrap',
            }}
          >
            {/* Left — selected count */}
            <div style={{ flex: '1 0 0', display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: '6px', minWidth: 0 }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.15px', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                {selectedCount} selected
              </span>
            </div>

            {/* Right — actions + divider + clear */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Refund button — only if eligible rows selected */}
                {refundableCount > 0 && (
                  <button style={{ ...darkBtn, gap: '6px', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
                    <img src="/m2/icons/arrowsLoop.svg" alt="" style={{ width: '12px', height: '12px', flexShrink: 0, filter: iconFilter }} />
                    {allRefundable ? 'Refund' : `Refund ${refundableCount} of ${selectedCount}`}
                  </button>
                )}

                {/* Export button */}
                <button style={{ ...darkBtn, width: '28px' }}>
                  <img src="/m2/icons/export.svg" alt="" style={{ width: '12px', height: '12px', filter: iconFilter }} />
                </button>
              </div>

              {/* Divider */}
              <div style={{ width: '1px', height: '28px', background: ACTION_BAR_STROKE, flexShrink: 0 }} />

              {/* Clear selection */}
              <button
                onClick={() => { setSelectedRows(new Set()); lastClickedIndexRef.current = null; }}
                style={{ ...clearBtn, width: '28px' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </motion.div>
        );
      })()}

      {typeof document !== 'undefined' && bulkSelectionMenu && createPortal(
        <div
          ref={bulkSelectionMenuRef}
          role="menu"
          aria-label="Row selection"
          style={{
            position: 'fixed',
            top: bulkSelectionMenu.top,
            left: bulkSelectionMenu.left,
            zIndex: 200,
            background: 'white',
            border: '1px solid var(--neutral-100)',
            borderRadius: '8px',
            boxShadow: '0px 5px 15px 0px rgba(0,0,0,0.12), 0px 15px 35px 0px rgba(48,49,61,0.08)',
            minWidth: '168px',
            overflow: 'hidden',
            padding: '4px',
            animation: 'popoverIn 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
            transformOrigin: 'top left',
            fontFamily: '"SF Pro Text", system-ui, -apple-system, sans-serif',
          }}
        >
          {[
            ...(selectedRows.size > 0 ? [{ label: 'Deselect all', action: deselectAllRows }] : []),
            allSelected
              ? { label: 'Deselect current page', action: deselectCurrentPage }
              : { label: 'Select current page', action: selectCurrentPage },
            { label: 'Select all', action: selectAllRows },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="menu-hover-row"
              onMouseDown={e => { e.preventDefault(); action(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '6px 10px',
                border: 'none',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '-0.15px',
                color: 'var(--neutral-800)',
                textAlign: 'left',
              }}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* Column header context menu */}
      {columnMenu && (
        <div
          ref={columnMenuRef}
          style={{
            position: 'fixed',
            top: columnMenu.y,
            left: columnMenu.x,
            zIndex: 200,
            background: 'white',
            border: '1px solid #D8DEE4',
            borderRadius: '8px',
            boxShadow: '0px 5px 15px 0px rgba(0,0,0,0.12), 0px 15px 35px 0px rgba(48,49,61,0.08)',
            minWidth: '180px',
            overflow: 'hidden',
            padding: '4px',
            animation: 'popoverIn 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
            transformOrigin: 'top center',
            willChange: 'transform, opacity',
          }}
        >
          {[
            ...(!sortCol || sortCol !== columnMenu.colId || sortDir !== 'asc' ? [{
              label: 'Sort ascending',
              icon: <img src="/m2/icons/arrowUp16.svg" alt="" style={{ display: 'block', width: 12, height: 12 }} />,
              action: () => { setSortCol(columnMenu.colId); setSortDir('asc'); setColumnMenu(null); },
            }] : []),
            ...(!sortCol || sortCol !== columnMenu.colId || sortDir !== 'desc' ? [{
              label: 'Sort descending',
              icon: <img src="/m2/icons/arrowDown16.svg" alt="" style={{ display: 'block', width: 12, height: 12 }} />,
              action: () => { setSortCol(columnMenu.colId); setSortDir('desc'); setColumnMenu(null); },
            }] : []),
            ...(sortCol === columnMenu.colId ? [{
              label: 'Clear sort',
              icon: <img src="/m2/icons/cancelCircle16.svg" alt="" style={{ display: 'block', width: 12, height: 12 }} />,
              action: () => { setSortCol(null); setSortDir('asc'); setColumnMenu(null); },
            }] : []),
            {
              label: frozenColumns.has(columnMenu.colId) ? 'Unpin' : 'Pin',
              icon: <img src="/m2/icons/pin16.svg" alt="" style={{ display: 'block', width: 12, height: 12 }} />,
              action: () => {
                const colId = columnMenu.colId;
                if (!frozenColumns.has(colId)) {
                  // Move the column to just after any already-frozen columns, then mark it frozen.
                  setColumnOrder(prev => {
                    const without = prev.filter(id => id !== colId);
                    const insertAt = without.filter(id => frozenColumns.has(id)).length;
                    without.splice(insertAt, 0, colId);
                    return without;
                  });
                  setFrozenColumns(prev => { const n = new Set(prev); n.add(colId); return n; });
                } else {
                  // Unfreeze: remove from frozen set; column stays in its current position.
                  setFrozenColumns(prev => {
                    const next = new Set(prev);
                    next.delete(colId);
                    return next;
                  });
                }
                setColumnMenu(null);
              },
            },
            {
              label: 'Hide',
              icon: <img src="/m2/icons/eyeClosed16.svg" alt="" style={{ display: 'block', width: 12, height: 12 }} />,
              action: () => {
                setVisibleColumns(prev => { const n = new Set(prev); n.delete(columnMenu.colId); return n; });
                setColumnMenu(null);
              },
            },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onMouseDown={(e) => { e.preventDefault(); action(); }}
              className="menu-hover-row"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '6px 10px',
                border: 'none',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: '"SF Pro Text", system-ui, -apple-system, sans-serif',
                fontSize: '14px', fontWeight: 400, color: 'var(--neutral-900)',
                letterSpacing: '-0.15px', lineHeight: '20px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '12px', height: '12px', flexShrink: 0 }}>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Custom horizontal scrollbar — sits above the GlobalFooter for non-trackpad users */}
      {showScrollbar && (
        <div
          ref={fixedScrollbarRef}
          className="fixed-scrollbar"
          style={{ left: paginationLeft, width: tableClientWidth }}
        >
          <div ref={scrollbarThumbRef} className="fixed-scrollbar-thumb" />
        </div>
      )}

      {/* ── Pagination overlay ─────────────────────────────────────────────────
          position:fixed, pinned flush to the viewport bottom (z-9998).
          m2's original pinned this via translateY(-48px) to sit just above
          its GlobalFooter (z-9999) — smart-arb has no GlobalFooter, so the
          bar sits directly at bottom:0 instead, only shifting up to clear
          the custom horizontal scrollbar when it's visible. */}
      {!activeTab.hidePagination && (
      <div
        ref={paginationOverlayRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: paginationLeft,
          right: 0,
          zIndex: 9998,
          background: 'white',
          fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
          transform: `translateY(-${showScrollbar ? SCROLLBAR_H - 1 : 0}px)`,
          transition: 'transform 200ms cubic-bezier(0.2, 0, 0.1, 1)',
          willChange: 'transform',
        }}
      >
        <div style={{ borderTop: '1px solid var(--neutral-50)', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px var(--lv-pagination-px, 0px)', height: 'var(--lv-pagination-h, auto)', boxSizing: 'border-box', position: 'relative' }}>
          {/* Arrows — left side */}
          {/* Prev button */}
          <button
            onClick={() => { setPaginationPage(p => Math.max(1, p - 1)); }}
            disabled={paginationPage === 1}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px', borderRadius: '4px', border: 'none', background: 'none',
              cursor: paginationPage === 1 ? 'default' : 'pointer',
              opacity: paginationPage === 1 ? 0.5 : 1,
              transition: 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)',
            }}
            aria-label="Previous page"
          >
            <img src="/m2/icons/chevronRight8.svg" alt="" style={{ width: '8px', height: '8px', display: 'block', transform: 'rotate(180deg)' }} />
          </button>
          {/* Next button */}
          <button
            onClick={() => { setPaginationPage(p => Math.min(totalPages, p + 1)); }}
            disabled={paginationPage >= totalPages}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '10px', borderRadius: '4px', border: 'none', background: 'none',
              cursor: paginationPage >= totalPages ? 'default' : 'pointer',
              opacity: paginationPage >= totalPages ? 0.5 : 1,
              transition: 'opacity 150ms cubic-bezier(0.2, 0, 0.1, 1)',
            }}
            aria-label="Next page"
          >
            <img src="/m2/icons/chevronRight8.svg" alt="" style={{ width: '8px', height: '8px', display: 'block' }} />
          </button>

          {/* Results count — right of arrows */}
          <div style={{ position: 'relative' }}>
            <button
              ref={pageSizeTriggerRef}
              onClick={() => setPageSizeMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '6px 8px', borderRadius: '6px', border: 'none',
                background: pageSizeMenuOpen ? 'var(--neutral-25)' : 'transparent',
                cursor: 'pointer',
                fontSize: '12px', fontWeight: 400, lineHeight: '16px', color: 'var(--neutral-600)',
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                transition: 'background 100ms cubic-bezier(0.2, 0, 0.1, 1)',
              }}
              onMouseEnter={e => { if (!pageSizeMenuOpen) e.currentTarget.style.background = 'var(--neutral-25)'; }}
              onMouseLeave={e => { if (!pageSizeMenuOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              {TOTAL_RESULTS === 0
                ? 'No results'
                : `${((paginationPage - 1) * pageSize + 1).toLocaleString()}–${Math.min(paginationPage * pageSize, TOTAL_RESULTS).toLocaleString()} of ${TOTAL_RESULTS.toLocaleString()} results`}
            </button>
            {/* Rows-per-page popover */}
            {pageSizeMenuOpen && (
              <div
                ref={pageSizeMenuRef}
                style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 200,
                  background: 'white', border: '1px solid #D8DEE4', borderRadius: '8px',
                  boxShadow: '0px 5px 15px 0px rgba(0,0,0,0.12), 0px 15px 35px 0px rgba(48,49,61,0.08)',
                  width: 'max-content', minWidth: '140px', overflow: 'hidden', padding: '4px',
                  animation: 'popoverInUp 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
                  transformOrigin: 'bottom center', willChange: 'transform, opacity',
                }}
              >
                <div style={{ padding: '6px 10px', fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--neutral-900)', lineHeight: '20px' }}>
                  Results per page
                </div>
                {[25, 50, 100].map(size => (
                  <button
                    key={size}
                    onMouseDown={e => { e.preventDefault(); setPageSize(size); setPaginationPage(1); setPageSizeMenuOpen(false); }}
                    className="menu-hover-row"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '6px 10px', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                      fontSize: '14px', fontWeight: 400, color: 'var(--neutral-900)', letterSpacing: '-0.15px', lineHeight: '20px',
                    }}
                  >
                    <span>{size}</span>
                    {pageSize === size && (
                      <img src="/m2/icons/checkCircleFilled.svg" width="12" height="12" alt="" style={{ display: 'block', flexShrink: 0 }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Chip right-click context menu */}
      {chipContextMenu && (() => {
        const chip = viewChips.find(c => c.id === chipContextMenu.chipId);
        if (!chip) return null;
        const isDefaultAll = chip.id === primaryChipId;
        const lockedView = isLockedView(chip.id);
        const FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
        const isPinned = pinnedViewIds.has(chip.id);
        const menuItems: { label: string; color: string; onClick: () => void }[] = [
          ...(!isDefaultAll ? [
            {
              label: isPinned ? 'Hide' : 'Show on page',
              color: 'var(--neutral-900)',
              onClick: () => {
                toggleViewShown(chip.id);
                setChipContextMenu(null);
              },
            },
          ] : []),
          {
            label: defaultChipId === chip.id ? 'Default' : 'Make default',
            color: defaultChipId === chip.id ? 'var(--neutral-500)' : 'var(--neutral-900)',
            onClick: () => {
              if (defaultChipId !== chip.id) { setDefaultChipId(chip.id); }
              setChipContextMenu(null);
            },
          },
          {
            label: 'Duplicate',
            color: 'var(--neutral-900)',
            onClick: () => duplicateChip(chip),
          },
          ...(!lockedView ? [
            {
              label: 'Rename',
              color: 'var(--neutral-900)',
              onClick: () => startChipRename(chip.id, chip.label),
            },
            {
              label: 'Delete',
              color: '#C0123C',
              onClick: () => { deleteChip(chip.id); setChipContextMenu(null); },
            },
          ] : []),
        ];
        // Centered under the cursor; clamp so the menu stays on-screen.
        const menuW = 160, menuH = menuItems.length * 36 + 8;
        const x = Math.max(8, Math.min(chipContextMenu.x - menuW / 2, window.innerWidth - menuW - 8));
        const y = Math.max(8, Math.min(chipContextMenu.y + 8, window.innerHeight - menuH - 8));
        return (
          <div
            ref={chipContextMenuRef}
            style={{
              position: 'fixed', top: y, left: x, zIndex: 10001,
              background: 'white', borderRadius: '8px',
              border: '1px solid #D8DEE4',
              boxShadow: '0px 15px 35px 0px rgba(48,49,61,0.08), 0px 5px 15px 0px rgba(0,0,0,0.12)',
              minWidth: `${menuW}px`, padding: '4px',
              fontFamily: FONT,
              animation: 'popoverIn 150ms cubic-bezier(0.2, 0, 0.1, 1) both',
              transformOrigin: 'top center',
            }}
          >
            {menuItems.map(item => (
              <button
                key={item.label}
                onMouseDown={e => { e.preventDefault(); item.onClick(); }}
                className="menu-hover-row"
                data-tone={menuRowTone(item.color)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', border: 'none', cursor: 'pointer',
                  fontFamily: FONT, fontSize: '14px', fontWeight: 400,
                  color: item.color, letterSpacing: '-0.15px', lineHeight: '20px',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Column drag ghost — full column lifted, follows cursor */}
      {dragColId && (() => {
        const colWidth = columnWidths[dragColId] || 160; // 0 = Fit sentinel, fall back to 160
        const ghostColDef = activeTab.columns.find(c => c.id === dragColId);
        const isRight = (ghostColDef?.align ?? 'left') === 'right';

        const renderGhostCell = (ghostColId: string, row: TableRowData) => {
          const base: React.CSSProperties = {
            fontSize: '14px', fontWeight: 400, color: 'var(--neutral-900)',
            letterSpacing: '-0.15px', lineHeight: '20px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          };
          const gColDef = activeTab.columns.find(c => c.id === ghostColId);
          switch (gColDef?.type ?? ghostColId) {
            case 'currency': {
              const vKey = gColDef?.dataKeys?.['value'] ?? ghostColId;
              const cKey = gColDef?.dataKeys?.['code']  ?? `${ghostColId}-code`;
              return (
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px' }}>
                  <span style={{ ...base, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{String(row[vKey] ?? '')}</span>
                  <span style={{ ...base, color: 'var(--neutral-600)' }}>{String(row[cKey] ?? '')}</span>
                </div>
              );
            }
            case 'status': {
              const statusVal  = String(row[ghostColId] ?? '');
              const styleKey   = gColDef?.dataKeys?.['styleKey'];
              const styleVal   = styleKey ? String(row[styleKey] ?? statusVal) : statusVal;
              const badgeStyle = gColDef?.statusMap?.[styleVal] ?? DEFAULT_STATUS_STYLE;
              return (
                <span style={{ fontSize: '12px', fontWeight: 400, display: 'inline-flex', alignItems: 'center', padding: '0 8px', height: '20px', borderRadius: '4px', whiteSpace: 'nowrap', ...badgeStyle }}>
                  {statusVal}
                </span>
              );
            }
            case 'color-text': {
              const ctVal   = String(row[ghostColId] ?? '');
              const ctColor = gColDef?.statusMap?.[ctVal]?.color ?? 'var(--neutral-900)';
              return <span style={{ ...base, color: ctColor }}>{ctVal}</span>;
            }
            case 'color-coded': {
              const vKey = gColDef?.dataKeys?.['value'] ?? ghostColId;
              const pKey = gColDef?.dataKeys?.['positive'] ?? `${ghostColId.replace('color-coded', 'color')}-positive`;
              const isPos = Boolean(row[pKey]);
              return <span style={{ ...base, display: 'block', textAlign: 'right', color: isPos ? '#1A5C1F' : '#991B1B', fontVariantNumeric: 'tabular-nums' }}>{isPos ? '+' : '-'}{String(row[vKey] ?? '')}</span>;
            }
            case 'numerical':
              return <span style={{ ...base, display: 'block', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{String(row[ghostColId] ?? '')}</span>;
            case 'basic-text':
            case 'metadata':
              return <span style={base}>{String(row[ghostColId] ?? '')}</span>;
            case 'icon-box':
              return <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--neutral-25)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={gColDef?.iconSrc ?? '/m2/icons/product16.svg'} alt="" style={{ width: '16px', height: '16px', display: 'block' }} /></div><span style={base}>{String(row[ghostColId] ?? '')}</span></div>;
            case 'image':
              return <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}><img src="/m2/icons/whiteTee.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div><span style={base}>{String(row[ghostColId] ?? '')}</span></div>;
            case 'app-icon': {
              const gAppIconSrc = getAppIconSrc(ghostColId, gColDef, row);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={APP_ICON_CONTAINER_STYLE}>
                    <img src={gAppIconSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <span style={base}>{String(row[ghostColId] ?? '')}</span>
                </div>
              );
            }
            case 'date':        return <span style={base}>{String(row[ghostColId] ?? '')}</span>;
            case 'inline-icon': return <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><img src={gColDef?.iconSrc ?? '/m2/icons/product16.svg'} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} /><span style={base}>{String(row[ghostColId] ?? '')}</span></div>;
            case 'link':        return <span style={base}>{String(row[ghostColId] ?? '')}</span>;
            case 'brand-icon': {
              const gSecondaryKey = gColDef?.dataKeys?.['secondary'] ?? `${ghostColId}-secondary`;
              const gHasSecondary = Boolean(row[gSecondaryKey]);
              const gSecondaryIconSrc = gColDef?.secondaryIconSrc ?? '/m2/icons/link.svg';
              const gBrandKey = gColDef?.dataKeys?.['brand'];
              const gBrandName = gBrandKey ? row[gBrandKey] : undefined;
              const gBrandDisplayVal = gHasSecondary ? String(row[ghostColId] ?? '') : `•••${String(row[ghostColId] ?? '')}`;
              return <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{gHasSecondary && <img src={gSecondaryIconSrc} alt="" style={{ flexShrink: 0, display: 'block' }} />}{gBrandName ? <CardIcon name={gBrandName} size="small" /> : <img src={gColDef?.iconSrc ?? '/m2/icons/brandIcon16.svg'} alt="" style={{ flexShrink: 0, display: 'block' }} />}<span style={base}>{gBrandDisplayVal}</span></div>;
            }
            case 'location':    return <span style={base}>{String(row[ghostColId] ?? '')}</span>;
            case 'dot-scale':   return <DotScaleCell value={row[ghostColId]} />;
            case 'id':          return <span style={{ ...base, fontSize: '14px' }}>{String(row[ghostColId] ?? '')}</span>;
            case 'agg-list': {
              const listKey  = gColDef?.dataKeys?.['list'] ?? `${ghostColId.replace('agg-list', 'agg')}-all`;
              const gItems   = Array.isArray(row[listKey]) ? (row[listKey] as string[]) : [];
              const gAvailW  = (columnWidths[ghostColId] || 200) - 32;
              const [gVis, gHid] = wrapCells
                ? computeAggVisibleWrapped(gItems, gAvailW)
                : computeAggVisible(gItems, gAvailW);
              const gBadge = gHid > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', border: '1px solid var(--neutral-50)', borderRadius: '4px', fontSize: '12px', lineHeight: '16px', color: 'var(--neutral-600)', whiteSpace: 'nowrap' }}>+{gHid}</span>
              ) : null;
              if (wrapCells) {
                return (
                  <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--neutral-900)', letterSpacing: '-0.15px', lineHeight: '20px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {renderAggListItems(gVis)}
                    {gBadge && <><span style={{ color: AGG_LIST_SEP_COLOR }}>{AGG_BADGE_BEFORE_SEP}</span>{gBadge}</>}
                  </span>
                );
              }
              return <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{gVis.length > 0 && <span style={base}>{renderAggListItems(gVis)}</span>}{gBadge}</div>;
            }
            case 'subtext': { const amtKey = gColDef?.dataKeys?.['amount'] ?? `${ghostColId}-amt`; return <span style={base}>{String(row[amtKey] ?? '')}</span>; }
            case 'more-info':   return <span style={base}>{String(row[ghostColId] ?? '')}</span>;
            default:            return null;
          }
        };

        const initPos = ghostPosRef.current;
        const ox = dragColClickOffsetRef.current.x;
        const oy = dragColClickOffsetRef.current.y;
        const isGlass = columnDragStyle === 'glass';

        return (
          <div
            ref={ghostElRef}
            style={{
              position: 'fixed',
              left: initPos ? initPos.x - ox - 8 : -9999,
              top: initPos ? initPos.y - oy - 8 : -9999,
              // Clip to visible viewport — prevents the ghost from hanging below the footer
              // when many rows remain. ghostTop ≈ initPos.y - oy - 8; subtract 48px footer.
              maxHeight: initPos ? `calc(100vh - ${initPos.y - oy - 8}px - 48px)` : undefined,
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 9999,
              borderRadius: '16px',
              padding: '8px',
              animation: isGlass ? 'ghostGlassIn 150ms cubic-bezier(0.2, 0, 0.1, 1) forwards' : 'ghostCardIn 150ms cubic-bezier(0.2, 0, 0.1, 1) forwards',
              width: `${colWidth + 16}px`,
              userSelect: 'none',
              fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
              ...(isGlass ? {
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                background: 'rgba(250,250,250,0.5)',
                border: '1px solid white',
                boxShadow: '0px 4px 50px 0px rgba(0,0,0,0.1)',
              } : {}),
            }}
          >
            {/* Header */}
            <div style={{
              backgroundColor: '#fff',
              borderBottom: '1px solid var(--neutral-50)',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isRight ? 'flex-end' : 'flex-start',
              padding: '0 8px',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)', letterSpacing: '-0.024px', lineHeight: '16px', whiteSpace: 'nowrap' }}>
                {colMeta[dragColId].label}
              </span>
            </div>
            {/* Rows — start from the first visible row to mirror the scrolled state */}
            {filteredRows.slice(dragGhostRowOffsetRef.current).map(({ row }, i) => (
              <div key={i} style={{
                backgroundColor: isGlass ? 'transparent' : '#fff',
                borderBottom: isGlass ? undefined : '1px solid var(--neutral-50)',
                borderRadius: '0px',
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isRight ? 'flex-end' : 'flex-start',
                overflow: 'hidden',
                opacity: isGlass ? 0 : 1,
              }}>
                {renderGhostCell(dragColId, row)}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Chip drag ghost — elevated card that follows the cursor */}
      {dragChipId && (() => {
        const chip = viewChips.find(c => c.id === dragChipId);
        if (!chip) return null;
        const FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
        return (
          <div
            ref={chipGhostRef}
            style={{
              position: 'fixed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: 'var(--lv-chip-py, 10px) var(--lv-chip-px, 14px)',
              borderRadius: '8px',
              background: 'white',
              border: '1px solid #EBEEF1',
              boxShadow: '0px 15px 35px rgba(48,49,61,0.08), 0px 5px 15px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
              zIndex: 9999,
              left: `${chipGhostPosRef.current.x}px`,
              top: `${chipGhostPosRef.current.y}px`,
              fontFamily: FONT,
              whiteSpace: 'nowrap',
              cursor: 'grabbing',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-600)' }}>
              {chip.label}
            </span>
            {includeViewTotals && chipRowCounts[chip.id] && (
              <span style={{ fontSize: '14px', fontWeight: 400, lineHeight: '20px', letterSpacing: '-0.15px', color: 'var(--neutral-600)' }}>
                {chipRowCounts[chip.id]}
              </span>
            )}
          </div>
        );
      })()}

      {/* Drop line indicator for Line drag mode */}
      <div
        ref={lineIndicatorRef}
        style={{
          display: 'none',
          position: 'fixed',
          width: '2px',
          backgroundColor: 'var(--neutral-900)',
          pointerEvents: 'none',
          zIndex: 9998,
          transform: 'translateX(-1px)',
          borderRadius: '1px',
        }}
      />

      {/* Save badge — portalled to body, pops at the top-right corner of the selected chip */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {saveBadge && (
            <motion.img
              key="chip-save-badge"
              src="/m2/icons/checkCircleFilledStroked.svg"
              alt=""
              initial={{ opacity: 0, scale: 0, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: -45 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
              style={{
                position: 'fixed',
                top: saveBadge.y,
                left: saveBadge.x,
                width: 20,
                height: 20,
                pointerEvents: 'none',
                zIndex: 10002,
              }}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Save toast — portalled to body, slides up from bottom-center above the footer */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {savedToast && saveToast && (
            <motion.div
              key="chip-save-toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0.1, 1] }}
              style={{
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                translateX: '-50%',
                zIndex: 10002,
                background: 'var(--neutral-800)',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                letterSpacing: '-0.15px',
                fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0px 5px 15px 0px rgba(0,0,0,0.12), 0px 15px 35px 0px rgba(48,49,61,0.08)',
              }}
            >
              {`Changes saved to "${saveToast.label}"`}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
