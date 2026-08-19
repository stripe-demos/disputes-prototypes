import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBasePath } from '../../contexts/BasePath';

function isRoutePath(href) {
  if (href === '' || href === null || href === undefined) return false;
  return href !== '#' && !href.startsWith('http');
}

function Chevron({ expanded, className }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={`shrink-0 transition-transform text-placeholder ${expanded ? 'rotate-90' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 2 3 3-3 3" />
    </svg>
  );
}

function resolveHref(item, basePath) {
  const href = item.href;
  // content items auto-derive path from filename
  if (item.content && (href === null || href === undefined)) return `${basePath}/${item.content.replace(/\.md$/, '')}`;
  if (item.content && href != null) {
    if (href === '') return basePath || '/';
    return href.startsWith('/') ? href : `${basePath}/${href}`;
  }
  if (!isRoutePath(href)) return null;
  if (href.startsWith('/')) return href;
  return `${basePath}/${href}`;
}

function isItemActive(item, pathname, basePath) {
  if (item.active) return true;
  const resolved = resolveHref(item, basePath);
  return resolved ? pathname === resolved : false;
}

function hasActiveDescendant(item, pathname, basePath) {
  if (isItemActive(item, pathname, basePath)) return true;
  if (item.children) return item.children.some((c) => hasActiveDescendant(c, pathname, basePath));
  return false;
}

function SidebarItem({ item, depth = 0, basePath, pathname }) {
  const [userToggled, setUserToggled] = useState(null);
  const hasChildren = item.children;
  const expanded = userToggled !== null ? userToggled : hasActiveDescendant(item, pathname, basePath);
  const active = isItemActive(item, pathname, basePath);
  const resolved = resolveHref(item, basePath);

  const bold = depth === 0 && hasChildren && hasActiveDescendant(item, pathname, basePath);

  const className = `flex gap-1.5 py-1 text-label-medium text-default transition-colors rounded-md px-1 cursor-pointer ${active
    ? 'text-docs-accent text-label-medium-emphasized'
    : bold
      ? 'text-default font-semibold'
      : 'text-default hover:text-default'
    }`;

  const style = { paddingLeft: `${8 + depth * 12}px` };

  const content = (
    <>
      {hasChildren ? (
        <Chevron expanded={expanded} className="mt-[4px]" />
      ) : (
        <span className="shrink-0 w-[10px]" />
      )}
      <span>{item.label}</span>
    </>
  );

  return (
    <div>
      {resolved && !hasChildren ? (
        <Link to={resolved} className={className} style={style}>
          {content}
        </Link>
      ) : (
        <a
          href={item.href}
          onClick={hasChildren ? (e) => { e.preventDefault(); setUserToggled(!expanded); } : undefined}
          className={className}
          style={style}
        >
          {content}
        </a>
      )}
      {hasChildren && (
        <div className={`grid transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {item.children.map((child, i) => (
              <SidebarItem key={`${child.label}-${i}`} item={child} depth={depth + 1} basePath={basePath} pathname={pathname} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarDivider() {
  return <div className="ml-2 mt-4 pt-4 border-t border-border" />;
}

export default function DocsSidebar({ sections = [] }) {
  const basePath = useBasePath();
  const { pathname } = useLocation();

  return (
    <aside className="w-docs-sidebar-width shrink-0 hidden lg:block border-r border-border pl-1 pt-3 bg-white overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
      <div className="pb-8 pr-2">
        {sections.map((section, i) => (
          <div key={i}>
            {i > 0 && <SidebarDivider />}
            {section.heading && (
              <div className="px-2 mb-2 text-label-small-emphasized tracking-wide text-subdued uppercase">
                {section.heading}
              </div>
            )}
            <div>
              {section.items.map((item) => (
                <SidebarItem key={item.label} item={item} basePath={basePath} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
