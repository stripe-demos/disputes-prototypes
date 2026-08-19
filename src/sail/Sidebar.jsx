import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../icons/SailIcons';
import { useBasePath } from '../contexts/BasePath';

const SANDBOX_HEIGHT = 44;

export const NavItem = ({ icon, label, active, highlighted, to }) => {
  const basePath = useBasePath();
  const isHighlighted = active || highlighted;
  const href = to !== undefined ? (to ? `${basePath}/${to}` : basePath || '/') : undefined;
  const content = (
    <div className="flex items-center space-x-2 h-[36px] lg:h-[30px] px-1 rounded-md cursor-pointer hover:bg-offset">
      {icon && (
        <div className={`w-6 h-6 flex items-center justify-center ${isHighlighted ? 'text-brand' : 'text-icon-subdued'}`}>
          {icon}
        </div>
      )}
      <span className={`flex-1 ${isHighlighted ? 'text-label-large-emphasized lg:text-label-medium-emphasized text-brand' : 'text-label-large lg:text-label-medium text-default'}`}>{label}</span>
    </div>
  );

  if (href !== undefined) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
};

export const SubNavItem = ({ label, highlighted, onClick, to }) => {
  const basePath = useBasePath();
  const href = to !== undefined ? (to ? `${basePath}/${to}` : basePath || '/') : undefined;
  const content = (
    <div
      className={`flex items-center space-x-2 h-[36px] lg:h-[30px] px-1 rounded-md cursor-pointer hover:bg-offset`}
      onClick={!to ? onClick : undefined}
    >
      {/* Empty spacer to match icon width */}
      <div className="w-6 h-6 flex-shrink-0" />
      <span className={highlighted ? 'text-label-large-emphasized lg:text-label-medium-emphasized text-brand' : 'text-label-large lg:text-label-medium text-default'}>{label}</span>
    </div>
  );

  if (href !== undefined) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
};

export const SectionHeading = ({ label }) => (
  <div className="px-1 flex items-center">
    <span className="text-heading-xsmall-subdued text-default">
      {label}
    </span>
  </div>
);

export const ExpandableNavItem = ({ icon, label, children, sectionId, expandedSection, onToggle }) => {
  const isExpanded = expandedSection === sectionId;

  return (
    <div>
      <div
        className="flex items-center space-x-2 h-[36px] lg:h-[30px] px-1 rounded-md hover:bg-offset cursor-pointer relative"
        onClick={() => onToggle(isExpanded ? null : sectionId)}
      >
        {icon && (
          <div className="w-6 h-6 flex items-center justify-center text-icon-subdued">
            {icon}
          </div>
        )}
        <span className="text-label-large lg:text-label-medium text-default flex-1">{label}</span>
        <div className="w-6 h-6 flex items-center justify-center">
          <Icon name="chevronDown" size="xxsmall" fill="currentColor" className={`size-[8px] transition-transform text-icon-default ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="pb-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Sidebar = ({ sandboxMode = false, mobileMenuOpen = false, onClose, children }) => {
  const location = useLocation();

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    if (mobileMenuOpen) onClose?.();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close on resize past lg breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1040px)');
    const handler = (e) => { if (e.matches && mobileMenuOpen) onClose?.(); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mobileMenuOpen, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileMenuOpen, onClose]);

  // Body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => { document.documentElement.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const sidebarStyle = { top: sandboxMode ? SANDBOX_HEIGHT : 0, height: sandboxMode ? `calc(100vh - ${SANDBOX_HEIGHT}px)` : '100vh' };

  const navContent = (
    <div className="flex-1 px-4 py-4 space-y-7 overflow-y-auto">
      {children}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:flex fixed left-0 w-sidebar-width bg-surface border-r border-neutral-50 flex-col z-10 shrink-0 ${sandboxMode ? 'rounded-tl-xl overflow-hidden' : ''}`}
        style={sidebarStyle}
      >
        {navContent}
      </div>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={`fixed top-0 left-0 right-0 bottom-0 z-40 bg-overlay-backdrop transition-opacity duration-200 ease-in-out ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${sandboxMode ? 'rounded-t-xl overflow-hidden' : ''}`}
          style={{ top: sidebarStyle.top }}
          onClick={onClose}
        >
          {/* Panel */}
          <div
            className={`absolute h-full top-0 left-0 w-mobile-sidebar-width bg-surface border-r border-neutral-50 flex flex-col z-50 transition-transform duration-200 ease-in-out rounded-r-xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${sandboxMode ? 'rounded-tl-xl overflow-hidden' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex items-center justify-start px-4 pt-4 gap-3">
              <HeaderButton onClick={onClose} className="mr-auto">
                <Icon name="cancel" size="small" fill="currentColor" />
              </HeaderButton>
              <HeaderButton>
                <Icon name="help" className="size-[20px]" />
              </HeaderButton>
              <HeaderButton>
                <Icon name="addCircleFilled" className="text-brand size-[20px]" />
              </HeaderButton>
            </div>

            {navContent}
          </div>
        </div>
      </div>
    </>
  );
};

// Internal helper used for mobile sidebar close button
const HeaderButton = ({ children, className = '', ...props }) => (
  <button
    className={`size-8 rounded-full flex items-center justify-center hover:bg-offset transition-colors cursor-pointer text-icon-default ${className}`}
    {...props}
  >
    {children}
  </button>
);
