'use client';

import { Fragment, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import type { ColumnDef, MobileRowConfig, RowAction, TabConfig } from '../lib/types';
import { ActionMenuList, ActionSheet } from './BottomSheet';
import { MobilePopover } from './MobilePopover';

const ICONS = '/m2/icons';
const FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
const DEFAULT_STATUS_STYLE: CSSProperties = { background: '#F5F6F8', color: 'var(--neutral-500)' };

/** Mirrors Tailwind's `max-md` variant so CSS and JS agree on the mobile breakpoint. */
export const MOBILE_MEDIA_QUERY = '(width < 48rem)';

const subscribeToBreakpoint = (onChange: () => void) => {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeToBreakpoint,
    () => window.matchMedia(MOBILE_MEDIA_QUERY).matches,
    () => false,
  );
}

// ─── Row field resolution ─────────────────────────────────────────────────────

export interface ResolvedMobileRow {
  label: string;
  title: ColumnDef;
  description: { col: ColumnDef; prefix?: string }[];
  right?: ColumnDef;
}

export function resolveMobileRow(columns: ColumnDef[], config?: MobileRowConfig): ResolvedMobileRow | null {
  const byId = new Map(columns.map(c => [c.id, c]));
  if (config) {
    const title = byId.get(config.title);
    if (!title) return null;
    const description = (config.description ?? []).flatMap(field => {
      const { column, prefix } = typeof field === 'string' ? { column: field, prefix: undefined } : field;
      const col = byId.get(column);
      return col ? [{ col, prefix }] : [];
    });
    return {
      label: config.label ?? title.label,
      title,
      description,
      right: config.right ? byId.get(config.right) : undefined,
    };
  }
  const [title, ...rest] = columns;
  if (!title) return null;
  const right = rest.find(c => c.type === 'status');
  const description = rest.find(c => c !== right && c.type !== 'status');
  return { label: title.label, title, description: description ? [{ col: description }] : [], right };
}

// ─── Page actions ─────────────────────────────────────────────────────────────

const LARGE_ICON_BUTTON: CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  background: 'white',
  borderRadius: 8,
  border: 'none',
  outline: '1px solid var(--neutral-100)',
  boxShadow: '0px 1px 1px 0px rgba(33,37,44,0.16)',
  cursor: 'pointer',
};
const PAGE_ACTIONS_MIN_WIDTH = 192;

export function MobilePageActions({ ref, moreActions = [], variant, createLabel, onCreate, className }: {
  ref?: Ref<HTMLDivElement>;
  /** Everything except create; empty hides the more button. */
  moreActions?: RowAction[];
  /** Shows the more actions in a bottom sheet or a dropdown under the button. */
  variant: 'sheet' | 'popover';
  createLabel?: string;
  onCreate?: () => void;
  className?: string;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const hasMore = moreActions.length > 0;
  if (!hasMore && !createLabel) return null;
  const close = () => setActionsOpen(false);

  return (
    <div className={className} style={{ flexShrink: 0 }}>
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {hasMore && (
        <>
          <button
            ref={moreRef}
            type="button"
            aria-label="More actions"
            aria-haspopup={variant === 'sheet' ? 'dialog' : 'menu'}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen(o => variant === 'popover' ? !o : true)}
            style={LARGE_ICON_BUTTON}
          >
            <img src={`${ICONS}/more-16.svg`} alt="" style={{ width: 16, height: 16, display: 'block' }} />
          </button>
          {variant === 'sheet' ? (
            <ActionSheet open={actionsOpen} items={moreActions} onSelect={() => {}} onClose={close} />
          ) : (
            <MobilePopover open={actionsOpen} anchorRef={moreRef} onClose={close} ariaLabel="Actions" align="end" minWidth={PAGE_ACTIONS_MIN_WIDTH}>
              {maxHeight => (
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight, minHeight: 0 }}>
                  <ActionMenuList items={moreActions} onSelect={close} padding={12} sectionInset={0} />
                </div>
              )}
            </MobilePopover>
          )}
        </>
      )}
      {createLabel && (
        <button type="button" aria-label={createLabel} onClick={onCreate} style={LARGE_ICON_BUTTON}>
          <img src={`${ICONS}/add16.svg`} alt="" style={{ width: 16, height: 16, display: 'block' }} />
        </button>
      )}
    </div>
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export interface MobileListRow {
  row: Record<string, unknown>;
  originalIndex: number;
}

type Slot = 'title' | 'description' | 'right';

const TITLE_TEXT: CSSProperties = { fontSize: 16, fontWeight: 600, lineHeight: '24px', letterSpacing: '-0.31px', color: 'var(--neutral-900)' };
const BODY_TEXT: CSSProperties = { fontSize: 14, fontWeight: 400, lineHeight: '20px', letterSpacing: '-0.15px' };
const HEADER_TEXT: CSSProperties = { fontSize: 12, fontWeight: 600, lineHeight: '16px', letterSpacing: '-0.024px', color: 'var(--neutral-600)' };
const TRUNCATE: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const INLINE_ICON: CSSProperties = { width: 16, height: 16, display: 'block', flexShrink: 0 };
const MEDIA_BOX: CSSProperties = { width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const DESCRIPTION_DIVIDER: CSSProperties = { display: 'inline-block', width: 1, height: 12, margin: '0 6px', verticalAlign: '-1px', background: '#D8DEE4' };
const INLINE_WITH_ICON: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'top', maxWidth: '100%' };

const isEmptyValue = (v: unknown) => v === '' || v === null || v === undefined;

function cellValueKey(col: ColumnDef): string {
  switch (col.type) {
    case 'currency':
    case 'color-coded':
      return col.dataKeys?.['value'] ?? col.id;
    case 'subtext':
      return col.dataKeys?.['amount'] ?? `${col.id}-amt`;
    default:
      return col.id;
  }
}

export function isMobileCellEmpty(col: ColumnDef, row: Record<string, unknown>): boolean {
  if (col.type === 'agg-list') {
    const list = row[col.dataKeys?.['list'] ?? col.id];
    return !Array.isArray(list) || list.length === 0;
  }
  return isEmptyValue(row[cellValueKey(col)]);
}

function renderMedia(col: ColumnDef, row: Record<string, unknown>): ReactNode {
  switch (col.type) {
    case 'icon-box':
      return (
        <div style={{ ...MEDIA_BOX, background: 'var(--neutral-25)' }}>
          <img src={col.iconSrc ?? `${ICONS}/product16.svg`} alt="" style={INLINE_ICON} />
        </div>
      );
    case 'image':
      return (
        <div style={MEDIA_BOX}>
          <img src={`${ICONS}/whiteTee.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      );
    case 'app-icon': {
      const src = row[col.dataKeys?.['image'] ?? `${col.id}-image`];
      return (
        <div style={{ ...MEDIA_BOX, background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(0,39,77,0.08)' }}>
          {typeof src === 'string' && src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
      );
    }
    default:
      return null;
  }
}

function renderCell(
  col: ColumnDef,
  row: Record<string, unknown>,
  slot: Slot,
  text: (value: unknown, col: ColumnDef) => ReactNode,
): ReactNode {
  const value = row[col.id];
  switch (col.type) {
    case 'status': {
      const label = String(value);
      if (slot !== 'right') return text(label, col);
      const styleKey = col.dataKeys?.['styleKey'];
      const styleVal = styleKey ? String(row[styleKey] ?? label) : label;
      const style = col.statusMap?.[styleVal] ?? DEFAULT_STATUS_STYLE;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'top', boxSizing: 'border-box', height: 20, padding: '2px 6px', borderRadius: 4, fontSize: 12, fontWeight: 400, lineHeight: '16px', letterSpacing: 0, whiteSpace: 'nowrap', ...style }}>
          {text(label, col)}
        </span>
      );
    }
    case 'color-text': {
      const color = col.statusMap?.[String(value)]?.color;
      return <span style={color ? { color } : undefined}>{text(value, col)}</span>;
    }
    case 'currency': {
      const code = row[col.dataKeys?.['code'] ?? `${col.id}-code`];
      return (
        <>
          {text(row[cellValueKey(col)], col)}
          {!isEmptyValue(code) && <span style={{ fontWeight: 400, color: 'var(--neutral-600)' }}> {String(code)}</span>}
        </>
      );
    }
    case 'color-coded': {
      const positive = Boolean(row[col.dataKeys?.['positive'] ?? `${col.id.replace('color-coded', 'color')}-positive`]);
      return <span style={{ color: positive ? '#1A5C1F' : '#991B1B' }}>{positive ? '+' : '-'}{text(row[cellValueKey(col)], col)}</span>;
    }
    case 'subtext': {
      const sub = row[col.dataKeys?.['sub'] ?? `${col.id}-sub`];
      if (slot === 'title' || isEmptyValue(sub)) return text(row[cellValueKey(col)], col);
      if (slot === 'right') {
        return (
          <>
            <span style={{ display: 'block', ...TRUNCATE }}>{text(row[cellValueKey(col)], col)}</span>
            <span style={{ display: 'block', fontSize: 12, lineHeight: '16px', letterSpacing: 0, color: 'var(--neutral-600)', ...TRUNCATE }}>{text(sub, col)}</span>
          </>
        );
      }
      return <>{text(row[cellValueKey(col)], col)} <span style={{ color: 'var(--neutral-600)' }}>{text(sub, col)}</span></>;
    }
    case 'brand-icon': {
      const hasSecondary = Boolean(row[col.dataKeys?.['secondary'] ?? `${col.id}-secondary`]);
      const lastFour = String(value).replace(/^[•\-\s]+/, '');
      return (
        <span style={{ ...INLINE_WITH_ICON, gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {hasSecondary && <img src={col.secondaryIconSrc ?? `${ICONS}/link.svg`} alt="" style={INLINE_ICON} />}
            <img src={col.iconSrc ?? `${ICONS}/brandIcon16.svg`} alt="" style={INLINE_ICON} />
          </span>
          <span style={{ minWidth: 0, fontVariantNumeric: 'tabular-nums', ...TRUNCATE }}>{text(lastFour, col)}</span>
        </span>
      );
    }
    case 'location':
    case 'inline-icon':
      return (
        <span style={INLINE_WITH_ICON}>
          <img src={col.iconSrc ?? `${ICONS}/usIcon16.svg`} alt="" style={{ ...INLINE_ICON, borderRadius: 2 }} />
          <span style={{ minWidth: 0, ...TRUNCATE }}>{text(value, col)}</span>
        </span>
      );
    case 'agg-list': {
      const list = row[col.dataKeys?.['list'] ?? col.id];
      return text(Array.isArray(list) ? list.join(', ') : '', col);
    }
    default:
      return text(value, col);
  }
}

const defaultText = (value: unknown) => String(value ?? '');

function RowMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Row actions"
      aria-haspopup="dialog"
      onClick={onClick}
      style={{ width: 32, height: 32, margin: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer' }}
    >
      <img src={`${ICONS}/more-16.svg`} alt="" style={INLINE_ICON} />
    </button>
  );
}

const SKELETON_BAR: CSSProperties = { display: 'block', borderRadius: 4, background: 'var(--neutral-25)' };

export function MobileList({ tab, rows, loading, renderText = defaultText, className, style }: {
  tab: TabConfig;
  rows: MobileListRow[];
  /** Renders placeholder rows instead of data. */
  loading?: boolean;
  /** Formats a text value; used to apply search highlighting. */
  renderText?: (value: unknown, col: ColumnDef) => ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const fields = resolveMobileRow(tab.columns, tab.mobileRow);
  if (!fields) return null;
  const { label, title, description, right } = fields;
  const rowActions = tab.rowActions ?? [];
  const hasActions = rowActions.length > 0;

  const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, minHeight: 56, padding: '12px 0', borderBottom: '1px solid #EBEEF1', fontFamily: FONT };

  return (
    <div className={className} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: `12px ${hasActions ? 32 : 0}px 12px 0`, borderBottom: '1px solid var(--neutral-25)', fontFamily: FONT }}>
        <span style={{ ...HEADER_TEXT, flex: '1 1 auto', minWidth: 0, ...TRUNCATE }}>{label}</span>
        {right && <span style={{ ...HEADER_TEXT, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>{right.label}</span>}
      </div>

      {loading
        ? Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={rowStyle} aria-hidden>
              <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 6px' }}>
                <span style={{ ...SKELETON_BAR, width: '55%', height: 14 }} />
                <span style={{ ...SKELETON_BAR, width: '35%', height: 12 }} />
              </div>
              {right && <span style={{ ...SKELETON_BAR, width: 56, height: 16, flexShrink: 0 }} />}
            </div>
          ))
        : rows.map(({ row, originalIndex }) => {
            const media = renderMedia(title, row);
            const segments = description.filter(({ col }) => !isMobileCellEmpty(col, row));
            return (
              <div key={originalIndex} style={rowStyle}>
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {media}
                  <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ ...TITLE_TEXT, ...TRUNCATE }}>
                      {isMobileCellEmpty(title, row) ? '–' : renderCell(title, row, 'title', renderText)}
                    </div>
                    {segments.length > 0 && (
                      <div style={{ ...BODY_TEXT, color: 'var(--neutral-600)', paddingBottom: 4, ...TRUNCATE }}>
                        {segments.map(({ col, prefix }, i) => (
                          <Fragment key={col.id}>
                            {i > 0 && <span aria-hidden style={DESCRIPTION_DIVIDER} />}
                            {prefix && `${prefix} `}
                            {renderCell(col, row, 'description', renderText)}
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {right && (
                  <div style={{ ...BODY_TEXT, color: 'var(--neutral-900)', flexShrink: 0, maxWidth: '45%', textAlign: 'right', ...TRUNCATE, padding: 1, margin: -1 }}>
                    {isMobileCellEmpty(right, row) ? <span style={{ color: 'var(--neutral-400)' }}>–</span> : renderCell(right, row, 'right', renderText)}
                  </div>
                )}
                {hasActions && <RowMoreButton onClick={() => setActionsOpen(true)} />}
              </div>
            );
          })}
      {hasActions && <ActionSheet open={actionsOpen} items={rowActions} onSelect={() => {}} onClose={() => setActionsOpen(false)} />}
    </div>
  );
}
