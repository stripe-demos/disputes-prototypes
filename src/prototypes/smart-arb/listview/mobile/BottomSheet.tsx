'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { groupMenuItems, menuRowTone } from '../lib/menuGroups';

const ICONS = '/m2/icons';
export const SHEET_FONT = 'SF Pro Text, system-ui, -apple-system, sans-serif';
export const SHEET_EASE = [0.2, 0, 0.1, 1] as const;
const SHEET_TRANSITION = { duration: 0.25, ease: SHEET_EASE };

export const SHEET_LARGE_TEXT: CSSProperties = { fontFamily: SHEET_FONT, fontSize: 16, lineHeight: '24px', letterSpacing: '-0.31px' };
const TITLE_TEXT: CSSProperties = { ...SHEET_LARGE_TEXT, fontWeight: 700, color: 'var(--neutral-900)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
/** Bottom padding for the last section of a sheet, clear of the home indicator. */
export const SHEET_SAFE_BOTTOM = 'calc(24px + env(safe-area-inset-bottom))';
/** Spread onto list rows inside a sheet; pair with the `menu-hover-row` class. */
export const SHEET_ROW: CSSProperties = {
  ['--menu-row-radius' as string]: '6px',
  width: '100%', height: 40, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px 6px 8px',
  border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer',
};

function HeaderIconButton({ label, icon, onClick, style }: { label: string; icon: string; onClick: () => void; style: CSSProperties }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', ...style }}>
      <img src={`${ICONS}/${icon}`} width="16" height="16" alt="" style={{ display: 'block' }} />
    </button>
  );
}

/** Horizontal inset of sheet content; mobile dropdown popovers sit 4px tighter. */
export type SheetInset = 20 | 16;

/** Sheet title row: optional back button, title, optional text action, and dismiss. */
export function SheetHeader({ title, onClose, onBack, action, inset = 20 }: {
  title: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  action?: { label: string; onClick: () => void };
  inset?: SheetInset;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
      {onBack && <HeaderIconButton label="Back" icon="chevronLeft16.svg" onClick={onBack} style={{ padding: `20px 16px 16px ${inset}px` }} />}
      <div style={{ flex: 1, minWidth: 0, padding: onBack ? '16px 20px 12px 0' : `16px 8px 12px ${inset}px` }}>
        <p style={TITLE_TEXT}>{title}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{ ...SHEET_LARGE_TEXT, fontWeight: 600, color: '#533AFD', flexShrink: 0, padding: '16px 8px 12px 20px', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          {action.label}
        </button>
      )}
      <HeaderIconButton label="Close" icon="cancel16.svg" onClick={onClose} style={{ padding: `20px ${inset}px 4px` }} />
    </div>
  );
}

const SHEET_BUTTON: Record<'primary' | 'secondary', CSSProperties> = {
  primary: { background: '#675DFF', color: 'white', border: 'none', boxShadow: '0px 1px 1px 0px rgba(47, 14, 99, 0.32)' },
  secondary: { background: 'white', color: 'var(--neutral-900)', border: '1px solid var(--neutral-100)', boxShadow: '0px 1px 1px 0px rgba(33, 37, 44, 0.16)' },
};

/** Full-width large button for sheet and popover footers. */
export function SheetButton({ kind, children, ...rest }: { kind: 'primary' | 'secondary' } & Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'style'>) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        ...SHEET_LARGE_TEXT, ...SHEET_BUTTON[kind], fontWeight: 600, width: '100%', height: 40, borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Tracks the rendered height of the most recently mounted element given `ref`, so a container can
 * animate to fit it. Measuring on mount (rather than in an effect) keeps it correct when the
 * element appears a frame late, and an element still animating out never overrides its successor.
 */
export function useMeasuredHeight() {
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const activeRef = useRef<HTMLElement | null>(null);
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    activeRef.current = el;
    const observer = new ResizeObserver(() => { if (activeRef.current === el) setHeight(el.offsetHeight); });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (activeRef.current === el) { activeRef.current = null; setHeight('auto'); }
    };
  }, []);
  return { ref, height };
}

/** Fades the bottom edge of a scroll area while more content sits below the fold. */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [faded, setFaded] = useState(false);
  const update = useCallback(() => {
    const el = ref.current;
    setFaded(!!el && el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  });
  const fade = (
    <div aria-hidden style={{ position: 'sticky', bottom: 0, height: 43, marginTop: -43, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(255,255,255,0), white)', opacity: faded ? 1 : 0, transition: 'opacity 150ms' }} />
  );
  return { ref, onScroll: update, fade };
}

type ActionItem = { label: string; color?: string; group?: string };

/**
 * Menu rows for a list of actions; items carrying a `group` start a new labeled section below a
 * divider. `padding` surrounds the list, and each section adds `sectionInset` on the sides.
 */
export function ActionMenuList<T extends ActionItem>({ items, onSelect, padding, sectionInset }: {
  items: T[];
  onSelect: (item: T) => void;
  padding: CSSProperties['padding'];
  sectionInset: number;
}) {
  return (
    <div role="menu" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding, overflowY: 'auto', minHeight: 0 }}>
      {groupMenuItems(items).map((section, i) => (
        <div key={i} style={{ padding: `0 ${sectionInset}px`, ...(i > 0 && { borderTop: '1px solid #D8DEE4', paddingTop: 8 }) }}>
          {section.label && (
            <div style={{ padding: '6px 8px', fontFamily: SHEET_FONT, fontSize: 12, fontWeight: 700, lineHeight: '20px', color: 'var(--neutral-800)' }}>
              {section.label}
            </div>
          )}
          {section.items.map(item => (
            <button key={item.label} type="button" role="menuitem" onClick={() => onSelect(item)} className="menu-hover-row" data-tone={menuRowTone(item.color)} style={SHEET_ROW}>
              <span style={{ ...SHEET_LARGE_TEXT, color: item.color ?? 'var(--neutral-900)', flex: 1, minWidth: 0 }}>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** A sheet listing actions, grouped as in `ActionMenuList`. */
export function ActionSheet<T extends ActionItem>({ open, title = 'Actions', items, onSelect, onClose }: {
  open: boolean;
  title?: string;
  items: T[];
  onSelect: (item: T) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={title}>
      <SheetHeader title={title} onClose={onClose} />
      <ActionMenuList
        items={items}
        onSelect={item => { onSelect(item); onClose(); }}
        padding={`0 0 ${SHEET_SAFE_BOTTOM}`}
        sectionInset={12}
      />
    </BottomSheet>
  );
}

/** Gap kept above a content-height sheet so the page stays visible behind it. */
export const SHEET_TOP_GAP = 48;
/** Fraction of the viewport a fixed-height sheet covers when it has no on-screen anchor. */
const FIXED_SHEET_FALLBACK = 0.8;

/**
 * Height for a fixed-height sheet whose top edge sits `gap` px below `anchor`, falling back to
 * 80% of the viewport when the anchor is missing or scrolled away.
 */
export function sheetHeightBelow(anchor: HTMLElement | null, gap: number): number {
  const vh = window.innerHeight;
  const bottom = anchor?.getBoundingClientRect().bottom;
  const height = bottom !== undefined && bottom > 0 ? vh - bottom - gap : vh * FIXED_SHEET_FALLBACK;
  return Math.min(height, vh - SHEET_TOP_GAP);
}

/**
 * Mobile bottom sheet: the scrim fades in while the panel slides up from the bottom edge.
 * Tapping the scrim or pressing Escape calls `onClose`.
 */
export function BottomSheet({ open, onClose, ariaLabel, panelRef, height, children }: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Lets callers with their own outside-click handling treat the scrim as "outside". */
  panelRef?: Ref<HTMLDivElement>;
  /** Animated panel height; defaults to fitting the content. */
  height?: number | 'auto';
  children: ReactNode;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="bottom-sheet" style={{ position: 'fixed', inset: 0, zIndex: 10010, fontFamily: SHEET_FONT }}>
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SHEET_TRANSITION}
            style={{ position: 'absolute', inset: 0, background: 'rgba(182,192,205,0.7)' }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: height ?? 'auto' }}
            exit={{ y: '100%' }}
            transition={SHEET_TRANSITION}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden', background: 'white',
              maxHeight: `calc(100dvh - ${SHEET_TOP_GAP}px)`, display: 'flex', flexDirection: 'column',
              borderRadius: '12px 12px 0 0',
              boxShadow: '0px 0px 35px 0px rgba(48,49,61,0.08), 0px 0px 15px 0px rgba(0,0,0,0.12)',
            }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
