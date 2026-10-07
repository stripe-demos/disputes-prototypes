'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, Ref, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SHEET_EASE, SHEET_FONT } from './BottomSheet';

/** Matches the mobile page gutter so the popover lines up with the controls above it. */
const PAGE_INSET = 16;
/** Keeps the popover clear of the workbench footer pinned to the bottom of the page. */
const PAGE_BOTTOM_CLEARANCE = 48 + 16;
const ANCHOR_GAP = 8;
/** Marks UI layered above a popover (e.g. a confirmation) so pressing it doesn't dismiss the popover. */
export const STACKED_LAYER_ATTR = 'data-stacked-layer';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * Mobile dropdown: spans the page width below its anchor, and its max height is bounded by the
 * page area. Closes on an outside press, Escape, page scroll, or resize.
 */
export function MobilePopover({ open, anchorRef, onClose, ariaLabel, role = 'dialog', panelRef, height, align = 'stretch', minWidth, children }: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  ariaLabel: string;
  role?: string;
  panelRef?: Ref<HTMLDivElement>;
  /** Animated panel height; defaults to fitting the content. */
  height?: number | 'auto';
  /** `stretch` spans the page width; `end` sizes to content against the page's right gutter. */
  align?: 'stretch' | 'end';
  minWidth?: number;
  /** Receives the max height available inside the popover's border. */
  children: (maxHeight: number) => ReactNode;
}) {
  const ownRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const setPanel = useCallback((el: HTMLDivElement | null) => {
    ownRef.current = el;
    assignRef(panelRef, el);
  }, [panelRef]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    setTop(open && anchor ? anchor.getBoundingClientRect().bottom + ANCHOR_GAP : null);
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null) =>
      target instanceof Node && (
        ownRef.current?.contains(target) || anchorRef.current?.contains(target)
        || (target instanceof Element && target.closest(`[${STACKED_LAYER_ATTR}]`) !== null)
      );
    const onPointerDown = (e: PointerEvent) => { if (!isInside(e.target)) onClose(); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onScroll = (e: Event) => { if (!isInside(e.target)) onClose(); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, anchorRef, onClose]);

  if (typeof document === 'undefined') return null;
  const maxHeight = top === null ? 0 : window.innerHeight - top - PAGE_BOTTOM_CLEARANCE;

  return createPortal(
    <AnimatePresence>
      {open && top !== null && (
        <motion.div
          ref={setPanel}
          role={role}
          aria-label={ariaLabel}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, height: height ?? 'auto' }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: SHEET_EASE }}
          style={{
            position: 'fixed', top, right: PAGE_INSET, zIndex: 10010, maxHeight, minWidth,
            ...(align === 'stretch'
              ? { left: PAGE_INSET }
              : { width: 'max-content', maxWidth: window.innerWidth - 2 * PAGE_INSET }),
            display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white',
            border: '1px solid #D8DEE4', borderRadius: 12, fontFamily: SHEET_FONT,
            boxShadow: '0px 15px 35px 0px rgba(48,49,61,0.08), 0px 5px 15px 0px rgba(0,0,0,0.12)',
          }}
        >
          {children(maxHeight - 2)}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
