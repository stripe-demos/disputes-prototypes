'use client';

import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, Ref, RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FilterDef } from '../lib/types';
import {
  FILTER_DATE_OPS, FILTER_DATE_UNITS, FILTER_TIMEZONES, FILTER_VALUE_OPS, orderFilterDefs,
  type FilterTimezone,
} from '../lib/filterOptions';
import {
  BottomSheet, SheetButton, SheetHeader, SHEET_EASE, SHEET_LARGE_TEXT, SHEET_ROW, SHEET_SAFE_BOTTOM, SHEET_TOP_GAP,
  useMeasuredHeight, useScrollFade, type SheetInset,
} from './BottomSheet';
import { MobilePopover } from './MobilePopover';

const ICONS = '/m2/icons';
const PAGE_TRANSITION = { duration: 0.2, ease: SHEET_EASE };

const FIELD: CSSProperties = {
  ...SHEET_LARGE_TEXT, width: '100%', height: 40, boxSizing: 'border-box', borderRadius: 6,
  border: '1px solid #D8DEE4', background: 'white', color: 'var(--neutral-900)', outline: 'none',
};
const SELECT: CSSProperties = { ...FIELD, fontWeight: 600, padding: '0 36px 0 12px', appearance: 'none', cursor: 'pointer' };
const INPUT: CSSProperties = { ...FIELD, padding: '0 12px', minWidth: 0 };
const TRAILING_ICON: CSSProperties = { width: 28, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const CLEAR_ICON_MASK = `url(${ICONS}/cancelCircleFilled16.svg) center / 16px 16px no-repeat`;
const CLEAR_ICON: CSSProperties = { width: 16, height: 16, display: 'block', background: '#533AFD', mask: CLEAR_ICON_MASK, WebkitMask: CLEAR_ICON_MASK };

/** Draft values for the filter open in the sub-level, owned by the list view. */
export interface MobileFilterForm {
  def: FilterDef | null;
  selectedOptions: string[];
  toggleOption: (option: string) => void;
  singleVal: string;
  setSingleVal: (v: string) => void;
  dateOp: string;
  setDateOp: (v: string) => void;
  dateVal: string;
  setDateVal: (v: string) => void;
  dateUnit: string;
  setDateUnit: (v: string) => void;
  dateTz: FilterTimezone;
  setDateTz: (v: FilterTimezone) => void;
  valueOp: string;
  setValueOp: (v: string) => void;
  valueInput: string;
  setValueInput: (v: string) => void;
}

function Select({ value, options, onChange, label }: { value: string; options: readonly string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={SELECT}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <img src={`${ICONS}/arrowUpDown12.svg`} width="12" height="12" alt="" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

function SubpageBody({ form, onApply, inset }: { form: MobileFilterForm; onApply: () => void; inset: SheetInset }) {
  const { def } = form;
  const applyOnEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') onApply(); };

  if (!def || def.type === 'multi-select') {
    return (
      <div style={{ padding: `16px ${inset - 8}px 4px`, overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
        {(def?.options ?? []).map(option => (
          <button
            key={option}
            type="button"
            onClick={() => form.toggleOption(option)}
            className="menu-hover-row"
            style={{ ...SHEET_ROW, height: 'auto', minHeight: 40, gap: 8, padding: '8px' }}
          >
            <img src={`${ICONS}/${form.selectedOptions.includes(option) ? 'checkboxSelected' : 'checkboxPassive'}.svg`} width="16" height="16" alt="" style={{ display: 'block', flexShrink: 0 }} />
            <span style={{ ...SHEET_LARGE_TEXT, color: 'var(--neutral-900)', flex: 1, minWidth: 0 }}>{option}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: `16px ${inset}px 12px`, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {def.type === 'single-select' && (
        <Select label={def.label} value={form.singleVal} options={def.options} onChange={form.setSingleVal} />
      )}
      {def.type === 'value' && (
        <>
          <Select label="Operator" value={form.valueOp} options={FILTER_VALUE_OPS} onChange={form.setValueOp} />
          <input aria-label="Value" type="text" value={form.valueInput} onChange={e => form.setValueInput(e.target.value)} onKeyDown={applyOnEnter} style={INPUT} />
        </>
      )}
      {def.type === 'date' && (
        <>
          <Select label="Operator" value={form.dateOp} options={FILTER_DATE_OPS} onChange={form.setDateOp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              aria-label="Amount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.dateVal}
              onChange={e => form.setDateVal(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={applyOnEnter}
              style={{ ...INPUT, flex: 1 }}
            />
            <Select label="Unit" value={form.dateUnit} options={FILTER_DATE_UNITS} onChange={form.setDateUnit} />
          </div>
          <div role="radiogroup" aria-label="Time zone" style={{ display: 'flex', alignItems: 'center', gap: 16, minHeight: 40 }}>
            <span style={{ ...SHEET_LARGE_TEXT, color: 'var(--neutral-600)', flex: 1 }}>Time zone</span>
            {FILTER_TIMEZONES.map(tz => {
              const active = form.dateTz === tz;
              return (
                <button key={tz} type="button" role="radio" aria-checked={active} onClick={() => form.setDateTz(tz)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', boxSizing: 'border-box', border: `1px solid ${active ? '#675DFF' : '#D8DEE4'}`, boxShadow: '0px 1px 1px 0px rgba(33, 37, 44, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#675DFF' }} />}
                  </span>
                  <span style={{ ...SHEET_LARGE_TEXT, fontWeight: 600, color: 'var(--neutral-900)' }}>{tz}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FilterList({ rows, appliedValue, onSelectFilter, onClearFilter, inset, bottomPadding }: {
  rows: FilterDef[];
  appliedValue: (label: string) => string | undefined;
  onSelectFilter: (label: string) => void;
  onClearFilter: (label: string) => void;
  inset: SheetInset;
  bottomPadding: string | number;
}) {
  const scroll = useScrollFade<HTMLDivElement>();
  return (
    <div ref={scroll.ref} onScroll={scroll.onScroll} style={{ padding: `0 ${inset - 8}px`, overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
      <div style={{ paddingBottom: bottomPadding }}>
        {rows.map(def => {
          const value = appliedValue(def.label);
          const applied = value !== undefined;
          return (
            <div key={def.id} className="menu-hover-row" style={{ ...SHEET_ROW, padding: 0, gap: 0, cursor: 'default' }}>
              <button type="button" onClick={() => onSelectFilter(def.label)} style={{ ...SHEET_ROW, flex: 1, minWidth: 0, paddingRight: applied ? 0 : 4 }}>
                <span style={{ ...SHEET_LARGE_TEXT, color: 'var(--neutral-900)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</span>
                {applied && (
                  <span style={{ ...SHEET_LARGE_TEXT, fontWeight: 600, color: '#533AFD', maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                )}
                {!applied && (
                  <span style={TRAILING_ICON}>
                    <img src={`${ICONS}/chevronDown12.svg`} width="12" height="12" alt="" style={{ display: 'block', transform: 'rotate(-90deg)' }} />
                  </span>
                )}
              </button>
              {applied && (
                <button
                  type="button"
                  aria-label={`Clear ${def.label} filter`}
                  onClick={() => onClearFilter(def.label)}
                  style={{ ...TRAILING_ICON, height: '100%', margin: '0 4px 0 6px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <span aria-hidden style={CLEAR_ICON} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {scroll.fade}
    </div>
  );
}

/**
 * Mobile filter menu with a main level (filter list) and a sub level (the selected filter's
 * form). Renders as a bottom sheet, or as a dropdown below `anchorRef` when `variant` is "popover".
 */
export function MobileFilterSheet({
  variant, fixedSheetHeight, anchorRef, open, panelRef, page, filterDefs, appliedValue, selectedFilter, form, onSelectFilter, onClearFilter, onClearAll, onBack, onApply, onClose,
}: {
  variant: 'sheet' | 'popover';
  /** Gives the sheet variant a fixed height for every page instead of fitting each page's content. */
  fixedSheetHeight?: () => number;
  /** The control the popover variant drops down from. */
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** Attached to the panel so the list view's outside-click handling treats the rest of the page as "outside". */
  panelRef: Ref<HTMLDivElement>;
  page: 'main' | 'subpage';
  filterDefs: FilterDef[];
  /** Display value of an applied filter, keyed by filter label. */
  appliedValue: (label: string) => string | undefined;
  selectedFilter: string | null;
  form: MobileFilterForm;
  onSelectFilter: (label: string) => void;
  /** Removes one applied filter, keyed by filter label. */
  onClearFilter: (label: string) => void;
  onClearAll: () => void;
  onBack: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const pageSize = useMeasuredHeight();
  /** Main-page height with no search query; searching never shrinks the menu below it. */
  const [unfilteredMainHeight, setUnfilteredMainHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!open) { setQuery(''); setUnfilteredMainHeight(undefined); }
  }, [open]);

  useLayoutEffect(() => {
    if (open && page === 'main' && !query && typeof pageSize.height === 'number') setUnfilteredMainHeight(pageSize.height);
  }, [open, page, query, pageSize.height]);

  const applied = new Set(filterDefs.map(f => f.label).filter(l => appliedValue(l) !== undefined));
  const rows = orderFilterDefs(filterDefs, applied, query);
  const forward = page === 'subpage';
  const isSheet = variant === 'sheet';
  const inset: SheetInset = isSheet ? 20 : 16;
  const bottomPadding = isSheet ? SHEET_SAFE_BOTTOM : 4;
  const ariaLabel = forward ? selectedFilter ?? 'Filter' : 'Filter';

  const pages = (size: CSSProperties) => (
    <AnimatePresence initial={false} mode="popLayout" custom={forward}>
      <motion.div
        key={page}
        ref={pageSize.ref}
        custom={forward}
        variants={{
          enter: (fwd: boolean) => ({ x: fwd ? '100%' : '-100%' }),
          center: { x: 0 },
          exit: (fwd: boolean) => ({ x: fwd ? '-100%' : '100%' }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={PAGE_TRANSITION}
        style={{
          display: 'flex', flexDirection: 'column', ...size, width: '100%', flexShrink: 0,
          minHeight: page === 'main' && query ? unfilteredMainHeight : undefined,
        }}
      >
        {page === 'main' ? (
          <>
            <SheetHeader title="Filter" onClose={onClose} inset={inset} action={applied.size > 0 ? { label: 'Clear', onClick: onClearAll } : undefined} />
            <div style={{ padding: `8px ${inset}px 16px`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 40, boxSizing: 'border-box', padding: '8px 12px', border: '1px solid var(--neutral-100)', borderRadius: 6 }}>
                <img src={`${ICONS}/search16.svg`} width="16" height="16" alt="" style={{ display: 'block', flexShrink: 0 }} />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find a filter"
                  aria-label="Find a filter"
                  className="lv-filter-search"
                  style={{ ...SHEET_LARGE_TEXT, flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--neutral-900)', padding: 0 }}
                />
              </div>
            </div>
            <FilterList rows={rows} appliedValue={appliedValue} onSelectFilter={onSelectFilter} onClearFilter={onClearFilter} inset={inset} bottomPadding={bottomPadding} />
          </>
        ) : (
          <>
            <SheetHeader title={selectedFilter} onClose={onClose} onBack={onBack} inset={inset} />
            <SubpageBody form={form} onApply={onApply} inset={inset} />
            <div style={{ padding: `16px ${inset}px ${isSheet ? SHEET_SAFE_BOTTOM : `${inset}px`}`, flexShrink: 0, marginTop: 'auto' }}>
              <SheetButton kind="primary" onClick={onApply}>Apply</SheetButton>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  const fixedHeight = isSheet && open ? fixedSheetHeight?.() : undefined;
  return isSheet ? (
    <BottomSheet open={open} onClose={onClose} ariaLabel={ariaLabel} panelRef={panelRef} height={fixedHeight ?? pageSize.height}>
      {pages(fixedHeight !== undefined ? { height: fixedHeight } : { maxHeight: `calc(100dvh - ${SHEET_TOP_GAP}px)` })}
    </BottomSheet>
  ) : (
    <MobilePopover open={open} anchorRef={anchorRef} onClose={onClose} ariaLabel={ariaLabel} panelRef={panelRef} height={pageSize.height}>
      {maxHeight => pages({ maxHeight })}
    </MobilePopover>
  );
}
