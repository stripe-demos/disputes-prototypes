'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BottomSheet, SheetButton, SHEET_TOP_GAP, SheetHeader, SHEET_FONT, SHEET_LARGE_TEXT, SHEET_ROW, SHEET_SAFE_BOTTOM,
  useMeasuredHeight, useScrollFade,
} from './BottomSheet';
import { MobilePopover } from './MobilePopover';

const ICONS = '/m2/icons';
const CONTENT_FADE = { duration: 0.15, ease: [0.2, 0, 0.1, 1] as const };
const ROW_DIVIDER = '1px solid var(--neutral-25)';
const DROPDOWN_FOOTER_PADDING = '16px 20px 20px';
const SHEET_MAX_HEIGHT = `calc(100dvh - ${SHEET_TOP_GAP}px)`;

export interface MobileViewOption {
  id: string;
  label: string;
}

/** A view as it appears in the edit-views list. */
export interface EditableView {
  id: string;
  label: string;
  isDefault: boolean;
  /** `fixed` views are always shown; `locked` views also show a lock in place of the eye. */
  visibility: 'shown' | 'hidden' | 'hidden-muted' | 'fixed' | 'locked';
  deletion: 'enabled' | 'disabled' | 'hidden';
}

export interface EditViewGroup {
  label: string | null;
  views: EditableView[];
}

export interface EditViewsActions {
  onToggleShown: (id: string) => void;
  onMakeDefault: (id: string) => void;
  /** Starts deletion; the caller anchors its confirmation to `anchor`. */
  onDelete: (id: string, anchor: HTMLElement) => void;
  /** Omit to hide "Reset page to Stripe defaults". */
  onReset?: (anchor: HTMLElement) => void;
  /** Called on any press inside the edit sheet, e.g. to dismiss a confirmation. */
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

const FIELD_STYLE: CSSProperties = {
  height: 54,
  boxSizing: 'border-box',
  background: 'white',
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: '#EBEEF1',
  borderRadius: 12,
  fontFamily: SHEET_FONT,
  transition: 'border-color 150ms, border-width 150ms',
};
/** Buttons inside the field span its full height so the whole row is tappable. */
const FIELD_BUTTON: CSSProperties = {
  alignSelf: 'stretch', display: 'flex', alignItems: 'center', flexShrink: 0,
  border: 'none', background: 'none', cursor: 'pointer', fontFamily: SHEET_FONT,
};
/** The select and naming states share one grid cell and cross-fade; the hidden one is removed from focus. */
const fieldLayer = (shown: boolean): CSSProperties => ({
  gridArea: '1 / 1', minWidth: 0, display: 'flex', alignItems: 'center',
  opacity: shown ? 1 : 0, visibility: shown ? 'visible' : 'hidden',
  transition: shown ? 'opacity 150ms 75ms, visibility 0s' : 'opacity 150ms, visibility 0s 150ms',
});
const NAMING_ACTION: CSSProperties = {
  ...SHEET_LARGE_TEXT, fontWeight: 600, flexShrink: 0, padding: '2px 4px', border: 'none', background: 'none', cursor: 'pointer',
};
const ICON_HIT: CSSProperties = {
  ['--menu-row-radius' as string]: '6px',
  width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, border: 'none', background: 'none', cursor: 'pointer',
};
const BADGE: CSSProperties = {
  flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4,
  fontFamily: SHEET_FONT, fontSize: 12, fontWeight: 400, lineHeight: '16px', whiteSpace: 'nowrap',
};

function MaskIcon({ src, color }: { src: string; color: string }) {
  const mask = `url(${ICONS}/${src}) center / contain no-repeat`;
  return <span aria-hidden style={{ width: 16, height: 16, display: 'block', background: color, mask, WebkitMask: mask }} />;
}

function ViewOptions({ views, selectedId, onSelect, divided }: {
  views: MobileViewOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Sheet rows are taller and separated by hairlines. */
  divided: boolean;
}) {
  return (
    <div role="listbox">
      {views.map(view => {
        const isSelected = view.id === selectedId;
        return (
          <button
            key={view.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className="menu-hover-row"
            onClick={() => onSelect(view.id)}
            style={{ ...SHEET_ROW, ...(divided && { height: 52, borderBottom: ROW_DIVIDER }) }}
          >
            <span style={{ ...SHEET_LARGE_TEXT, flex: 1, minWidth: 0, fontWeight: isSelected ? 600 : 400, color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view.label}
            </span>
            {isSelected && (
              <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={`${ICONS}/checkCircleFilled.svg`} width="12" height="12" alt="" style={{ display: 'block' }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EditViewRow({ view, actions }: { view: EditableView; actions: EditViewsActions }) {
  const { visibility, deletion } = view;
  const shown = visibility === 'shown' || visibility === 'fixed' || visibility === 'locked';
  const canToggle = visibility === 'shown' || visibility === 'hidden' || visibility === 'hidden-muted';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 52, borderBottom: ROW_DIVIDER }}>
      <button
        type="button"
        aria-label={canToggle ? `${shown ? 'Hide' : 'Show'} ${view.label}` : `${view.label} is always shown`}
        disabled={!canToggle}
        onClick={() => actions.onToggleShown(view.id)}
        className={canToggle ? 'menu-hover-row' : undefined}
        style={{ ...ICON_HIT, cursor: canToggle ? 'pointer' : 'default' }}
      >
        {visibility === 'locked' ? (
          <img src={`${ICONS}/lock.svg`} width="16" height="16" alt="" style={{ display: 'block' }} />
        ) : visibility === 'hidden-muted' ? (
          <MaskIcon src="eyeClosed16.svg" color="var(--neutral-400)" />
        ) : (
          <img src={`${ICONS}/${shown ? 'eyeOpen16' : 'eyeClosed16'}.svg`} width="16" height="16" alt="" style={{ display: 'block' }} />
        )}
      </button>
      <span style={{
        ...SHEET_LARGE_TEXT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontWeight: shown ? 600 : 400,
        color: shown ? 'var(--neutral-900)' : visibility === 'hidden-muted' ? 'var(--neutral-400)' : 'var(--neutral-600)',
      }}>
        {view.label}
      </span>
      {view.isDefault ? (
        <span style={{ ...BADGE, background: '#F5F6F8', color: 'var(--neutral-700)', outline: '1px solid #D8DEE4' }}>Default</span>
      ) : (
        <button
          type="button"
          aria-label={`Make ${view.label} the default view`}
          onClick={() => actions.onMakeDefault(view.id)}
          style={{ ...BADGE, background: 'transparent', color: 'transparent', outline: '1px solid var(--neutral-50)', border: 'none', cursor: 'pointer' }}
        >
          Default
        </button>
      )}
      {deletion !== 'hidden' && (
        <button
          type="button"
          data-confirm-anchor=""
          aria-label={deletion === 'enabled' ? `Delete ${view.label}` : `${view.label} cannot be deleted`}
          disabled={deletion === 'disabled'}
          onClick={e => actions.onDelete(view.id, e.currentTarget)}
          className={deletion === 'enabled' ? 'menu-hover-row' : undefined}
          data-tone="critical"
          style={{ ...ICON_HIT, ['--menu-row-radius' as string]: '8px', cursor: deletion === 'enabled' ? 'pointer' : 'default' }}
        >
          {deletion === 'enabled'
            ? <img src={`${ICONS}/negativeCircleFilled.svg`} width="16" height="16" alt="" style={{ display: 'block' }} />
            : <MaskIcon src="negativeCircleFilled.svg" color="var(--neutral-200)" />}
        </button>
      )}
    </div>
  );
}

/** `size` bounds the content (max or fixed height); the sheet adds a header and clears the home indicator. */
function EditViewsContent({ groups, actions, surface, size }: {
  groups: EditViewGroup[];
  actions: EditViewsActions;
  surface: 'sheet' | 'popover';
  size: CSSProperties;
}) {
  const scroll = useScrollFade<HTMLDivElement>();
  const inSheet = surface === 'sheet';
  const onReset = actions.onReset;
  return (
    <div onPointerDown={actions.onPointerDown} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, ...size }}>
      {inSheet && <SheetHeader title="Edit views" onClose={actions.onClose} />}
      <div ref={scroll.ref} onScroll={scroll.onScroll} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: inSheet ? '0 16px' : '12px 20px 0' }}>
        <div>
          {groups.map((group, i) => (
            <div key={group.label ?? 'all-views'} style={{ paddingTop: i > 0 ? 16 : 0 }}>
              {group.label && (
                <div style={{ padding: '6px 0', fontFamily: SHEET_FONT, fontSize: 12, fontWeight: 700, lineHeight: '20px', color: 'var(--neutral-800)' }}>
                  {group.label}
                </div>
              )}
              {group.views.map(view => <EditViewRow key={view.id} view={view} actions={actions} />)}
            </div>
          ))}
        </div>
        {scroll.fade}
      </div>
      <div style={{ padding: inSheet ? `16px 20px ${SHEET_SAFE_BOTTOM}` : DROPDOWN_FOOTER_PADDING, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {onReset && (
          <SheetButton kind="secondary" data-confirm-anchor="" onClick={e => onReset(e.currentTarget)}>
            <img src={`${ICONS}/refund.svg`} width="12" height="12" alt="" style={{ display: 'block' }} />
            Reset page to Stripe defaults
          </SheetButton>
        )}
        <SheetButton kind="primary" onClick={actions.onClose}>Done</SheetButton>
      </div>
    </div>
  );
}

function DropdownViews({ views, selectedId, onSelect, onEdit, maxHeight }: {
  views: MobileViewOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEdit: () => void;
  maxHeight: number;
}) {
  const scroll = useScrollFade<HTMLDivElement>();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight, minHeight: 0 }}>
      <div ref={scroll.ref} onScroll={scroll.onScroll} style={{ overflowY: 'auto', minHeight: 0, padding: '12px 12px 0' }}>
        <ViewOptions views={views} selectedId={selectedId} onSelect={onSelect} divided={false} />
        {scroll.fade}
      </div>
      <div style={{ padding: DROPDOWN_FOOTER_PADDING, flexShrink: 0 }}>
        <SheetButton kind="secondary" onClick={onEdit}>Edit views</SheetButton>
      </div>
    </div>
  );
}

type MenuPage = 'views' | 'edit';

/**
 * Mobile views control: a select-style trigger that opens the views list as a dropdown or a
 * bottom sheet. "Edit views" swaps the same surface's content for the edit list, resizing the
 * surface to fit.
 */
export function MobileViewsMenu({ variant, fixedSheetHeight, views, selectedId, onSelect, onSaveView, onCreateView, editGroups, editActions, className }: {
  variant: 'sheet' | 'dropdown';
  /** Gives the sheet variant a fixed height for both pages instead of fitting each page's content. */
  fixedSheetHeight?: () => number;
  views: MobileViewOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Present while the selected view has unsaved changes; replaces the chevron with "Save". */
  onSaveView?: () => void;
  /** Saves the current list setup as a new view; omit to hide the plus button. */
  onCreateView?: (name: string) => void;
  editGroups: EditViewGroup[];
  editActions: EditViewsActions;
  className?: string;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [naming, setNaming] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [openPage, setOpenPage] = useState<MenuPage | null>(null);
  /** Keeps the closing surface's content in place while it animates away. */
  const lastPageRef = useRef<MenuPage>('views');
  if (openPage) lastPageRef.current = openPage;
  const page = openPage ?? lastPageRef.current;
  const selected = views.find(v => v.id === selectedId) ?? views[0];
  const content = useMeasuredHeight();

  const close = () => {
    if (openPage === 'edit') editActions.onClose();
    setOpenPage(null);
  };
  const select = (id: string) => {
    onSelect(id);
    setOpenPage(null);
  };
  const openEdit = () => setOpenPage('edit');

  const startNaming = () => {
    setOpenPage(null);
    setNewViewName('');
    // Focus synchronously inside the tap so mobile browsers raise the keyboard.
    flushSync(() => setNaming(true));
    nameInputRef.current?.focus();
  };
  const cancelNaming = () => {
    setNaming(false);
    setNewViewName('');
  };
  const saveNewView = () => {
    const name = newViewName.trim();
    if (!name || !onCreateView) return;
    onCreateView(name);
    cancelNaming();
  };
  const actions: EditViewsActions = { ...editActions, onClose: close };
  const fixedHeight = variant === 'sheet' && openPage ? fixedSheetHeight?.() : undefined;
  const sheetSize: CSSProperties = fixedHeight !== undefined ? { height: fixedHeight } : { maxHeight: SHEET_MAX_HEIGHT };

  /** Wraps the current page so the surface can animate its height to fit while the content cross-fades. */
  const pageContent = (renderPage: () => ReactNode) => (
    <div ref={content.ref} style={{ flexShrink: 0 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={CONTENT_FADE}
          style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div className={className}>
      <div
        ref={fieldRef}
        style={{
          ...FIELD_STYLE, display: 'grid', overflow: 'hidden',
          ...(naming && { borderWidth: 1.5, borderColor: '#D8DEE4' }),
        }}
      >
        {onCreateView && (
          <form
            onSubmit={e => { e.preventDefault(); saveNewView(); }}
            style={{ ...fieldLayer(naming), gap: 16, padding: '0 12px 0 16px' }}
          >
            <input
              ref={nameInputRef}
              type="text"
              aria-label="View name"
              placeholder="Name your view"
              value={newViewName}
              onChange={e => setNewViewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') cancelNaming(); }}
              className="placeholder:text-[color:var(--neutral-500)]"
              style={{ ...SHEET_LARGE_TEXT, flex: 1, minWidth: 0, padding: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--neutral-900)', caretColor: '#004DFF' }}
            />
            <button type="button" onClick={cancelNaming} style={{ ...NAMING_ACTION, color: 'var(--neutral-600)' }}>Cancel</button>
            <button type="submit" style={{ ...NAMING_ACTION, color: '#533AFD' }}>Save</button>
          </form>
        )}
        <div style={fieldLayer(!naming)}>
          <button
            type="button"
            aria-haspopup={variant === 'sheet' ? 'dialog' : 'listbox'}
            aria-expanded={openPage !== null}
            onClick={() => (openPage && variant === 'dropdown' ? close() : setOpenPage('views'))}
            style={{ ...FIELD_BUTTON, flex: 1, minWidth: 0, gap: 4, padding: onSaveView ? '0 0 0 16px' : '0 12px 0 16px' }}
          >
            <span style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'left', fontSize: 16, fontWeight: 600, lineHeight: '24px', letterSpacing: '-0.31px', color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected?.label}
            </span>
            {!onSaveView && (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}>
                <img src={`${ICONS}/chevronDown-12.svg`} alt="" style={{ width: 12, height: 12, display: 'block' }} />
              </span>
            )}
          </button>
          {onSaveView && (
            <button
              type="button"
              aria-label={`Save changes to ${selected?.label ?? 'view'}`}
              onClick={onSaveView}
              style={{ ...FIELD_BUTTON, ...SHEET_LARGE_TEXT, fontWeight: 600, color: '#533AFD', padding: '0 16px 0 12px' }}
            >
              Save
            </button>
          )}
          {onCreateView && (
            <>
              <span aria-hidden style={{ width: 1, height: 8, flexShrink: 0, background: '#D8DEE4' }} />
              <button type="button" aria-label="New view" onClick={startNaming} style={{ ...FIELD_BUTTON, padding: '0 20px' }}>
                <img src={`${ICONS}/add.svg`} width="12" height="12" alt="" style={{ display: 'block' }} />
              </button>
            </>
          )}
        </div>
      </div>

      {variant === 'dropdown' ? (
        <MobilePopover
          open={openPage !== null}
          anchorRef={fieldRef}
          onClose={close}
          ariaLabel={page === 'edit' ? 'Edit views' : 'Views'}
          height={content.height}
        >
          {maxHeight => pageContent(() => (page === 'edit'
            ? <EditViewsContent groups={editGroups} actions={actions} surface="popover" size={{ maxHeight }} />
            : <DropdownViews views={views} selectedId={selected?.id ?? ''} onSelect={select} onEdit={openEdit} maxHeight={maxHeight} />
          ))}
        </MobilePopover>
      ) : (
        <BottomSheet
          open={openPage !== null}
          onClose={close}
          ariaLabel={page === 'edit' ? 'Edit views' : 'Views'}
          height={fixedHeight ?? content.height}
        >
          {pageContent(() => (page === 'edit' ? (
            <EditViewsContent groups={editGroups} actions={actions} surface="sheet" size={sheetSize} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, ...sheetSize }}>
              <SheetHeader title="Views" onClose={close} />
              <div style={{ padding: '0 12px', overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
                <ViewOptions views={views} selectedId={selected?.id ?? ''} onSelect={select} divided />
              </div>
              <div style={{ padding: `16px 20px ${SHEET_SAFE_BOTTOM}`, flexShrink: 0 }}>
                <SheetButton kind="secondary" onClick={openEdit}>Edit views</SheetButton>
              </div>
            </div>
          )))}
        </BottomSheet>
      )}
    </div>
  );
}
