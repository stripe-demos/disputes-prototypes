import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../icons/SailIcons';

const WORKBENCH_BAR_HEIGHT = 48;
const WORKBENCH_PANEL_HEIGHT = 500;
const MIN_PANEL_HEIGHT = 150;
const DRAG_HANDLE_HEIGHT = 12;
const TAB_HEADER_HEIGHT = 40;

const WorkbenchTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1.5 cursor-pointer whitespace-nowrap transition-colors rounded-t border-b-2 ${active
      ? 'text-brand text-label-medium-emphasized border-brand-500'
      : 'text-neutral-500 hover:text-neutral-700 text-label-medium-emphasized border-transparent'
      }`}
  >
    {label}
  </button>
);

/**
 * Workbench — a developer tools bar fixed to the bottom of the screen.
 *
 * Props:
 * - tabs: Array of { key, label, content? } for the panel tabs
 * - defaultOpen: boolean — seeds initial URL state on mount (default false)
 * - maxHeight: number — maximum panel height in px (e.g. viewport minus banner).
 *   Falls back to window.innerHeight if omitted.
 * - className: additional classes on the root wrapper
 */
export default function Workbench({
  tabs = [],
  defaultOpen = false,
  maxHeight,
  className = '',
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const workbenchParam = searchParams.get('workbench');
  const open = workbenchParam === 'show' || workbenchParam === 'fullscreen';
  const fullscreen = workbenchParam === 'fullscreen';

  // Seed URL state from defaultOpen on mount (one-time)
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (didSeedRef.current || workbenchParam) return;
    didSeedRef.current = true;
    if (defaultOpen) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('workbench', 'show');
        return next;
      }, { replace: true });
    }
  }, []);

  const setWorkbench = useCallback((value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set('workbench', value);
      } else {
        next.delete('workbench');
      }
      return next;
    });
  }, [setSearchParams]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? null);
  const [panelHeight, setPanelHeight] = useState(WORKBENCH_PANEL_HEIGHT);
  const heightBeforeFullscreen = useRef(WORKBENCH_PANEL_HEIGHT);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const maxHeightRef = useRef(maxHeight);
  maxHeightRef.current = maxHeight;

  // Sync panel height when entering/leaving fullscreen via URL
  const prevFullscreen = useRef(false);
  useEffect(() => {
    if (fullscreen && !prevFullscreen.current) {
      // Entering fullscreen — save current height and expand
      heightBeforeFullscreen.current = panelHeight;
      setPanelHeight((maxHeightRef.current ?? window.innerHeight) - WORKBENCH_BAR_HEIGHT);
    } else if (!fullscreen && prevFullscreen.current) {
      // Leaving fullscreen — restore previous height
      setPanelHeight(heightBeforeFullscreen.current || WORKBENCH_PANEL_HEIGHT);
    }
    prevFullscreen.current = fullscreen;
  }, [fullscreen]);

  // Sync active tab from search param
  useEffect(() => {
    const wantTab = searchParams.get('workbench-tab');
    if (!wantTab) return;
    setActiveTab(wantTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('workbench-tab');
      return next;
    }, { replace: true });
  }, [searchParams]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setWorkbench(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const toggleFullscreen = () => {
    setWorkbench(fullscreen ? 'show' : 'fullscreen');
  };

  // Drag-to-resize handlers
  const onDragStart = useCallback((e) => {
    if (fullscreen) return;
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [panelHeight, fullscreen]);

  useEffect(() => {
    const onDragMove = (e) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const dragMax = (maxHeightRef.current ?? window.innerHeight) - WORKBENCH_BAR_HEIGHT - DRAG_HANDLE_HEIGHT - TAB_HEADER_HEIGHT;
      const newHeight = Math.min(dragMax, Math.max(MIN_PANEL_HEIGHT, dragStartHeight.current + delta));
      setPanelHeight(newHeight);
    };

    const onDragEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    return () => {
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', onDragEnd);
    };
  }, []);

  // Expose total workbench height as a CSS custom property for other fixed elements.
  // Use a ResizeObserver on the root element so the value tracks the actual rendered
  // height during CSS transitions (not just the target value).
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const h = Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      document.documentElement.style.setProperty('--workbench-height', `${h}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--workbench-height');
    };
  }, []);

  const activeTabObj = tabs.find((t) => t.key === activeTab);
  const contentHeight = panelHeight - TAB_HEADER_HEIGHT;

  return (
    <div ref={rootRef} className={`dark fixed bottom-0 left-0 right-0 z-[90] ${className}`}>
      {/* Overlay panel — slides up */}
      <div
        className="bg-surface shadow-[0_0_20px_rgba(0,0,0,0.1)] overflow-hidden rounded-t-xl"
        style={{
          height: open ? panelHeight : 0,
          transition: isDragging.current ? 'none' : 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle — top border resize target */}
        <div
          onMouseDown={onDragStart}
          className={`h-[12px] transition-colors group flex items-center justify-center ${fullscreen ? 'cursor-default' : 'cursor-row-resize'
            }`}
        >
          {!fullscreen && (
            <div className="w-12 h-[3px] rounded-full bg-neutral-200 group-hover:bg-neutral-400 transition-colors" />
          )}
        </div>

        {/* Panel header with tabs */}
        <div className="flex items-start justify-between border-b border-border pr-2">
          <div className="">
            <span className="text-label-medium-emphasized text-default px-3">Workbench</span>
            <div className="flex items-center gap-1 px-1">
              {tabs.map((tab) => (
                <WorkbenchTab
                  key={tab.key}
                  label={tab.label}
                  active={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="size-8 flex items-center justify-center text-subdued cursor-pointer transition-colors"
              title={fullscreen ? 'Minimize' : 'Expand'}
            >
              <Icon name={fullscreen ? 'arrowsInward' : 'arrowsOutward'} size="xsmall" />
            </button>
            <button
              onClick={() => setWorkbench(null)}
              className="size-8 flex items-center justify-center text-subdued cursor-pointer transition-colors"
              title="Close"
            >
              <Icon name="cancelCircle" size="xsmall" />
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 overflow-auto" style={{ height: contentHeight - DRAG_HANDLE_HEIGHT }}>
          {activeTabObj?.content ?? (
            <div className="flex items-center justify-center h-full text-subdued text-label-medium">
              No content
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — always visible */}
      <div
        className="flex items-center justify-between px-4 bg-offset border-t border-border cursor-pointer select-none"
        style={{ height: WORKBENCH_BAR_HEIGHT }}
        onClick={() => {
          if (!open) {
            setPanelHeight(WORKBENCH_PANEL_HEIGHT);
            setWorkbench('show');
          } else {
            setWorkbench(null);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <Icon name="api" size="xsmall" className="text-subdued" />
          <span className="text-label-medium-emphasized text-default">Developers</span>
        </div>
        <div className="flex items-center gap-3">
          <Icon name="chevronUpCircle" size="small" fill="currentColor" className={`text-subdued transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
}

export { WORKBENCH_BAR_HEIGHT, WORKBENCH_PANEL_HEIGHT };
