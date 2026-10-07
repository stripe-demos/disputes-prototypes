'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type ElementSize = '40' | '36' | '36-40';
export type ViewManagement = 'reset' | 'locked-defaults' | 'partial-locked';
export type TrigramSearch = 'field-hint' | 'floating-hint' | 'no-results';
/**
 * Mobile menu surfaces: `popovers` drops filter, view, and page-action menus down from their
 * controls; `dynamic` uses content-height bottom sheets; `fixed` sizes the filter and view sheets
 * to reach 16px below the page actions and keeps page actions in a popover.
 */
export type SheetMode = 'popovers' | 'dynamic' | 'fixed';

export function parseElementSize(value: string | null): ElementSize {
  if (value === '40') return '40';
  if (value === '36') return '36';
  return '36-40';
}

export function parseViewManagement(value: string | null): ViewManagement {
  if (value === 'reset' || value === 'locked-defaults') return value;
  return 'partial-locked';
}

export function parseSheetMode(value: string | null): SheetMode {
  if (value === 'popovers' || value === 'dynamic') return value;
  return 'fixed';
}

export function parseTrigramSearch(value: string | null): TrigramSearch {
  if (value === 'field-hint' || value === 'floating-hint') return value;
  return 'no-results';
}

interface PrototypeContextValue {
  foreverLoading: boolean;
  setForeverLoading: (v: boolean | ((prev: boolean) => boolean)) => void;
  columnDragStyle: 'ui' | 'glass';
  setColumnDragStyle: (v: 'ui' | 'glass') => void;
  columnResizeStyle: 'full' | 'header';
  setColumnResizeStyle: (v: 'full' | 'header') => void;
  simulateNoHScroll: boolean;
  setSimulateNoHScroll: (v: boolean | ((prev: boolean) => boolean)) => void;
  autosaveIndicator: 'badge' | 'toast';
  setAutosaveIndicator: (v: 'badge' | 'toast') => void;
  savedToast: boolean;
  setSavedToast: (v: boolean) => void;
  viewManagement: ViewManagement;
  setViewManagement: (v: ViewManagement) => void;
  trigramSearch: TrigramSearch;
  setTrigramSearch: (v: TrigramSearch) => void;
  navVisible: boolean;
  setNavVisible: (v: boolean) => void;
  elementSize: ElementSize;
  setElementSize: (v: ElementSize) => void;
  /** Whether the sidebar drawer is open at the mobile breakpoint. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  sheetMode: SheetMode;
  setSheetMode: (v: SheetMode) => void;
  /** Whether the sidebar's "Prototype options" section is expanded. */
  optionsOpen: boolean;
  setOptionsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}

const PrototypeContext = createContext<PrototypeContextValue>({
  foreverLoading: false,
  setForeverLoading: () => {},
  columnDragStyle: 'ui',
  setColumnDragStyle: () => {},
  columnResizeStyle: 'header',
  setColumnResizeStyle: () => {},
  simulateNoHScroll: false,
  setSimulateNoHScroll: () => {},
  autosaveIndicator: 'toast',
  setAutosaveIndicator: () => {},
  savedToast: false,
  setSavedToast: () => {},
  viewManagement: 'partial-locked',
  setViewManagement: () => {},
  trigramSearch: 'no-results',
  setTrigramSearch: () => {},
  navVisible: true,
  setNavVisible: () => {},
  elementSize: '36-40',
  setElementSize: () => {},
  mobileNavOpen: false,
  setMobileNavOpen: () => {},
  sheetMode: 'fixed',
  setSheetMode: () => {},
  optionsOpen: false,
  setOptionsOpen: () => {},
});

const LS_NAV_VISIBLE = 'm2-proto-nav-visible';
const LS_ELEMENT_SIZE = 'm2-proto-element-size';
const LS_SAVED_TOAST = 'm2-proto-saved-toast';
const LS_LOCKED_DEFAULTS = 'm2-proto-locked-defaults';
const LS_VIEW_MANAGEMENT = 'm2-proto-view-management';
const LS_TRIGRAM_SEARCH = 'm2-proto-trigram-search';
const LS_SHEET_MODE = 'm2-proto-sheet-mode';
/** Pre-`SheetMode` boolean; read once so sessions that chose dropdowns keep them. */
const LS_ALL_SHEETS = 'm2-proto-all-sheets';

function readElementSize(): ElementSize {
  return parseElementSize(localStorage.getItem(LS_ELEMENT_SIZE));
}

export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [foreverLoading, setForeverLoading] = useState(false);
  const [columnDragStyle, setColumnDragStyle] = useState<'ui' | 'glass'>('ui');
  const [columnResizeStyle, setColumnResizeStyle] = useState<'full' | 'header'>('header');
  const [simulateNoHScroll, setSimulateNoHScroll] = useState(false);
  const [autosaveIndicator, setAutosaveIndicator] = useState<'badge' | 'toast'>('toast');
  const [savedToast, setSavedToastState] = useState(false);
  const [viewManagement, setViewManagementState] = useState<ViewManagement>('partial-locked');
  const [trigramSearch, setTrigramSearchState] = useState<TrigramSearch>('no-results');
  const [navVisible, setNavVisibleState] = useState(true);
  const [elementSize, setElementSizeState] = useState<ElementSize>('36-40');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sheetMode, setSheetModeState] = useState<SheetMode>('fixed');
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_NAV_VISIBLE);
    setNavVisibleState(stored === null ? true : stored === 'true');
    setElementSizeState(readElementSize());
    setSavedToastState(localStorage.getItem(LS_SAVED_TOAST) === 'true');
    const storedViewManagement = localStorage.getItem(LS_VIEW_MANAGEMENT);
    const storedLockedDefaults = localStorage.getItem(LS_LOCKED_DEFAULTS);
    setViewManagementState(
      storedViewManagement !== null
        ? parseViewManagement(storedViewManagement)
        : storedLockedDefaults !== null
          ? (storedLockedDefaults === 'true' ? 'locked-defaults' : 'reset')
          : 'partial-locked',
    );
    setTrigramSearchState(parseTrigramSearch(localStorage.getItem(LS_TRIGRAM_SEARCH)));
    const storedSheetMode = localStorage.getItem(LS_SHEET_MODE);
    setSheetModeState(
      storedSheetMode !== null
        ? parseSheetMode(storedSheetMode)
        : localStorage.getItem(LS_ALL_SHEETS) === 'false' ? 'popovers' : 'fixed',
    );
  }, []);

  const setNavVisible = (v: boolean) => {
    localStorage.setItem(LS_NAV_VISIBLE, String(v));
    setNavVisibleState(v);
  };

  const setElementSize = (v: ElementSize) => {
    localStorage.setItem(LS_ELEMENT_SIZE, v);
    setElementSizeState(v);
  };

  const setSavedToast = (v: boolean) => {
    localStorage.setItem(LS_SAVED_TOAST, String(v));
    setSavedToastState(v);
  };

  const setViewManagement = (v: ViewManagement) => {
    localStorage.setItem(LS_VIEW_MANAGEMENT, v);
    setViewManagementState(v);
  };

  const setTrigramSearch = (v: TrigramSearch) => {
    localStorage.setItem(LS_TRIGRAM_SEARCH, v);
    setTrigramSearchState(v);
  };

  const setSheetMode = (v: SheetMode) => {
    localStorage.setItem(LS_SHEET_MODE, v);
    setSheetModeState(v);
  };

  return (
    <PrototypeContext.Provider value={{ foreverLoading, setForeverLoading, columnDragStyle, setColumnDragStyle, columnResizeStyle, setColumnResizeStyle, simulateNoHScroll, setSimulateNoHScroll, autosaveIndicator, setAutosaveIndicator, savedToast, setSavedToast, viewManagement, setViewManagement, trigramSearch, setTrigramSearch, navVisible, setNavVisible, elementSize, setElementSize, mobileNavOpen, setMobileNavOpen, sheetMode, setSheetMode, optionsOpen, setOptionsOpen }}>
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  return useContext(PrototypeContext);
}
