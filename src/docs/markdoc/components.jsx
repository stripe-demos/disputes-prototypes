import React, { createContext, useContext, useState } from 'react';
import { Icon } from '../../icons/SailIcons';

const OrderedListContext = createContext(null);

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Heading({ id, level, children }) {
  const Tag = `h${level}`;
  const classes = {
    2: 'text-heading-large text-default mt-10 mb-4 scroll-mt-[100px]',
    3: 'text-heading-medium text-default mt-8 mb-3 scroll-mt-[100px]',
    4: 'text-label-large-emphasized text-default mt-6 mb-2 scroll-mt-[100px]',
  };
  return <Tag id={id} className={classes[level] || ''}>{children}</Tag>;
}

function Paragraph({ children }) {
  return <p className="text-body-medium mb-4">{children}</p>;
}

function List({ ordered, children }) {
  if (ordered) {
    return (
      <OrderedListContext.Provider value={true}>
        <ol className="space-y-3 text-body-medium mb-4 list-none pl-0" style={{ counterReset: 'list-counter' }}>{children}</ol>
      </OrderedListContext.Provider>
    );
  }
  return <ul className="list-disc pl-5 space-y-2 text-body-medium mb-4 marker:text-neutral-200">{children}</ul>;
}

function ListItem({ children }) {
  const isOrdered = useContext(OrderedListContext);
  if (isOrdered) {
    return (
      <li className="flex items-start gap-3" style={{ counterIncrement: 'list-counter' }}>
        <span className="shrink-0 size-5 rounded-full bg-neutral-50 text-default text-label-small flex items-center justify-center mt-0.5 before:content-[counter(list-counter)]" />
        <span>{children}</span>
      </li>
    );
  }
  return <li>{children}</li>;
}

function Strong({ children }) {
  return <strong className="font-semibold text-default">{children}</strong>;
}

function InlineCode({ children, content }) {
  return (
    <code className="rounded bg-offset px-1.5 py-0.5 text-monospace-small text-monospace-small">
      {content || children}
    </code>
  );
}

function DocLink({ href = '#', children }) {
  return (
    <a
      href={href}
      className="text-docs-accent font-semibold hover:text-docs-accent-hover transition-colors"
    >
      {children}
    </a>
  );
}

const CALLOUT_STYLES = {
  note:                { border: 'border-l-neutral-300',  label: 'Note',                labelColor: 'text-neutral-700' },
  caution:             { border: 'border-l-yellow-400',   label: 'Caution',             labelColor: 'text-yellow-700' },
  warning:             { border: 'border-l-[#e61947]',    label: 'Warning',             labelColor: 'text-critical' },
  'private-preview':   { border: 'border-l-[#7cd548]',    label: 'Private preview',     labelColor: 'text-success' },
  'public-preview':    { border: 'border-l-[#7cd548]',    label: 'Public preview',      labelColor: 'text-success' },
};

function InfoCallout({ type = 'note', title, children }) {
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.note;
  const displayTitle = title || style.label;
  return (
    <div className={`border-l-4 ${style.border} pl-3`}>
      {displayTitle && (
        <div className={`text-label-small-emphasized ${style.labelColor} mb-1`}>{displayTitle}</div>
      )}
      <div className="text-default [&_p]:text-body-small">{children}</div>
    </div>
  );
}

function Tooltip({ label, children }) {
  return (
    <span className="relative group cursor-help">
      <span className="underline decoration-dashed decoration-placeholder underline-offset-2">{children}</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1f36] text-white text-[12px] leading-[16px] rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {label}
      </span>
    </span>
  );
}

const ICON_MAP = {
  blueprint: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  code: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
    </svg>
  ),
  checklist: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
};

function ResourceCard({ icon, title, description, tag }) {
  return (
    <a href="#" className="flex gap-4 p-4 border border-[#e3e8ee] rounded-lg hover:border-[#c1c9d2] hover:shadow-sm transition-all group">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-docs-accent-bg text-docs-accent flex items-center justify-center">
        {ICON_MAP[icon] || null}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-label-medium-emphasized text-default group-hover:text-docs-accent transition-colors">{title}</span>
          {tag && (
            <span className="text-[11px] font-medium text-docs-accent bg-docs-accent-bg px-1.5 py-0.5 rounded">
              {tag}
            </span>
          )}
        </div>
        <p className="text-label-small text-subdued">{description}</p>
      </div>
    </a>
  );
}

function ResourceCards({ children }) {
  return <div className="space-y-3 mb-12">{children}</div>;
}

function CodeBlock({ language, children }) {
  return (
    <pre className="bg-[#0a2540] border border-[#1a365d] rounded-lg p-4 mb-4 overflow-x-auto text-[13px] leading-6 text-[#d6ecff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <code className={language ? `language-${language}` : ''}>{children}</code>
    </pre>
  );
}

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'text-badge-default-text bg-badge-default-bg border-badge-default-border',
    success: 'text-badge-success-text bg-badge-success-bg border-badge-success-border',
    warning: 'text-badge-warning-text bg-badge-warning-bg border-badge-warning-border',
    danger: 'text-badge-danger-text bg-badge-danger-bg border-badge-danger-border',
    info: 'text-badge-info-text bg-badge-info-bg border-badge-info-border',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-label-small rounded-sm border ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}


function Section({ id, number, title, children, defaultOpen = true, preview = false, badge, collapsable = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = id || slugify(title);

  return (
    <section className="my-3 overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => {
          if (!collapsable) return;
          setOpen((value) => !value);
        }}
        className="flex w-full items-center gap-4 py-4 text-left text-heading-medium border-b border-[#e3e8ee]"
      >
        {number ? (
          <span className="text-subdued">
            {number}
          </span>
        ) : null}
        <span className="flex flex-1 items-center gap-2 text-default">
          <h3 id={sectionId} className="text-heading-medium text-default scroll-mt-[100px]">
            {title}
          </h3>
          {preview ? <Badge tone="success">Preview</Badge> : null}
          {badge ? <Badge>{badge}</Badge> : null}
        </span>
        {collapsable ? (
          <span className={`text-placeholder transition-transform ${open ? 'rotate-180' : ''}`}>
            <Icon name="chevronDown" size="xxsmall" fill="currentColor" className="size-[14px]" />
          </span>
        ) : null}
      </button>
      {open || !collapsable ? (
          <div className="text-body-medium text-default pt-4">{children}</div>
      ) : null}
    </section>
  );
}

const components = {
  Heading,
  Paragraph,
  List,
  ListItem,
  Strong,
  InlineCode,
  DocLink,
  InfoCallout,
  Tooltip,
  ResourceCard,
  ResourceCards,
  CodeBlock,
  Badge,
  Section,
};

export default components;
