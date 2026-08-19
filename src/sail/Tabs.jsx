import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../icons/SailIcons';

const sizes = {
  sm: 'text-label-small px-1.5 py-1 mb-1',
  md: 'text-label-medium px-2 py-1.5 mb-1',
  lg: 'text-label-large px-2.5 py-2 mb-1',
};

const Tab = ({ label, active, onClick, size = 'md', isFirst = false }) => (
  <button
    onClick={onClick}
    className={`relative text-label-medium-emphasized cursor-pointer rounded-lg shrink-0 whitespace-nowrap transition-colors ${sizes[size]} ${isFirst ? 'ml-[-8px]' : ''} ${active ? 'text-brand hover:bg-brand/10' : 'text-subdued hover:text-default hover:bg-offset'
      }`}
  >
    {label}
    {active && (
      <span className={`absolute bottom-[-5px] left-2.5 right-2.5 bg-brand h-[2px]`} />
    )}
  </button>
);

const MoreTab = ({ active, onClick, size = 'md', menuOpen }) => (
  <button
    onClick={onClick}
    className={`relative text-label-medium-emphasized cursor-pointer rounded-lg shrink-0 whitespace-nowrap transition-colors flex items-center gap-2 ${sizes[size]} ${active ? 'text-brand hover:bg-brand/10' : 'text-subdued hover:text-default hover:bg-offset'}`}
  >
    More
    <Icon name="chevronDown" size="xxsmall" fill="currentColor" />
    {active && (
      <span className="absolute bottom-[-5px] left-2.5 right-2.5 bg-brand h-[2px]" />
    )}
  </button>
);

const Tabs = ({ tabs, activeTab, onTabChange, size = 'md', children }) => {
  const containerRef = useRef(null);
  const tabRefs = useRef([]);
  const moreRef = useRef(null);
  const menuRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabWidths = useRef([]);

  // Measure all tab widths on mount / tab changes using a hidden row
  const measureRef = useRef(null);

  const recalc = useCallback(() => {
    if (!containerRef.current || !measureRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const gap = 6; // gap-1.5 = 6px
    const moreWidth = 70; // approximate width of "More ▾" button + gap

    // Measure each tab from the hidden row
    const hiddenTabs = measureRef.current.children;
    const widths = [];
    for (let i = 0; i < hiddenTabs.length; i++) {
      widths.push(hiddenTabs[i].offsetWidth);
    }
    tabWidths.current = widths;

    // Calculate how many tabs fit
    let usedWidth = 0;
    let count = 0;
    for (let i = 0; i < widths.length; i++) {
      const tabW = widths[i] + (i > 0 ? gap : 0);
      // If this is the last tab, we don't need space for "More"
      if (i === widths.length - 1) {
        if (usedWidth + tabW <= containerWidth) {
          count = widths.length;
          break;
        }
      }
      // Otherwise, check if tab + "More" button still fits
      if (usedWidth + tabW + gap + moreWidth > containerWidth) {
        break;
      }
      usedWidth += tabW;
      count++;
    }
    // Always show at least 1 tab
    setVisibleCount(Math.max(1, count));
  }, [tabs]);

  useEffect(() => {
    recalc();
    const observer = new ResizeObserver(recalc);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recalc]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
        moreRef.current && !moreRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const visibleTabs = tabs.slice(0, visibleCount);
  const overflowTabs = tabs.slice(visibleCount);
  const hasOverflow = overflowTabs.length > 0;
  const activeInOverflow = hasOverflow && overflowTabs.some((t) => t.key === activeTab);

  return (
    <div>
      {/* Hidden measurement row — renders all tabs offscreen to get their widths */}
      <div
        ref={measureRef}
        className="flex gap-1.5 absolute invisible pointer-events-none h-0 overflow-hidden"
        aria-hidden="true"
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.key}
            label={tab.label}
            active={false}
            onClick={() => { }}
            size={size}
            isFirst={index === 0}
          />
        ))}
      </div>

      {/* Visible tab row */}
      <div ref={containerRef} className="relative flex gap-1.5 border-b border-border">
        {visibleTabs.map((tab, index) => (
          <Tab
            key={tab.key}
            label={tab.label}
            active={activeTab === tab.key}
            onClick={() => { onTabChange(tab.key); setMenuOpen(false); }}
            size={size}
            isFirst={index === 0}
          />
        ))}
        {hasOverflow && (
          <div ref={moreRef} className="relative">
            <MoreTab
              active={activeInOverflow}
              onClick={() => setMenuOpen(!menuOpen)}
              size={size}
              menuOpen={menuOpen}
            />
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
              >
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { onTabChange(tab.key); setMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-label-medium transition-colors cursor-pointer ${activeTab === tab.key ? 'text-brand bg-brand/5' : 'text-default hover:bg-offset'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {children && <div className="pt-4">{children}</div>}
    </div>
  );
};

export default Tabs;
