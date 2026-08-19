import { useState } from 'react';
import { Icon } from '../icons/SailIcons';
import blurGradient from './assets/blur-gradient.png';

/**
 * SetupGuide — a floating setup guide panel (bottom-right).
 *
 * Props:
 *   sections — array of section objects:
 *     { id, title, collapsible?, locked?, items: [{ id, label, complete? }] }
 *   onItemClick(itemId, sectionId) — called when an item row is clicked
 *   title — header text (default: "Setup guide")
 *   defaultExpandedSection — id of initially expanded section (default: first section)
 *   visible — controls mount/visibility (default: true)
 *   intro — optional { heading, body } to show text beside the guide with a gradient backdrop
 *
 * The component manages its own collapsed/expanded UI state.
 * Completion state lives in your `sections` prop — update it from the parent.
 */

function SectionItem({ label, complete, disabled, onAction }) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-2 rounded-lg group hover:bg-neutral-50 transition-colors ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={!disabled ? onAction : undefined}
    >
      <div className="flex items-center">
        {complete ? (
          <Icon name="checkCircleFilled" className="size-[10px] mr-[12px] text-brand shrink-0" />
        ) : disabled ? (
          <Icon name="cancel" className="size-[10px] mr-[12px] text-icon-subdued shrink-0" />
        ) : (
          <div className="size-[10px] mr-[12px] rounded-full bg-neutral-200 shrink-0" />
        )}
        <span className={`text-body-small ${disabled ? 'text-subdued' : 'text-default'}`}>{label}</span>
      </div>
    </div>
  );
}

function SectionBlock({ id, title, collapsible = true, locked, items = [], expanded, onToggle, onItemAction }) {
  const complete = items.length > 0 && items.every((item) => item.complete);

  return (
    <div className={`transition-colors duration-200 rounded-lg ${expanded ? 'bg-offset' : ''}`}>
      <button
        className="flex items-center justify-between w-full py-2 px-3 text-left"
        onClick={() => collapsible && !locked && onToggle(expanded ? null : id)}
      >
        <span className={`text-label-medium-emphasized ${complete ? 'line-through text-subdued' : 'text-default'}`}>{title}</span>
        {locked && (
          <Icon name="lock" className="size-[12px] text-icon-subdued" />
        )}
        {collapsible && !locked && (
          <Icon
            name="chevronDown"
            className={`size-[10px] text-icon-subdued transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {collapsible && !locked && items.length > 0 && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="px-1 pb-1">
              {items.map((item) => (
                <SectionItem
                  key={item.id}
                  label={item.label}
                  complete={item.complete}
                  disabled={locked}
                  onAction={() => onItemAction?.(item.id, id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetupGuide({
  sections = [],
  onItemClick,
  title = 'Setup guide',
  defaultExpandedSection,
  visible = true,
  intro,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSection, setExpandedSection] = useState(
    defaultExpandedSection ?? sections[0]?.id ?? null
  );

  if (!visible) return null;

  const showIntro = intro && !collapsed;

  return (
    <>
      {/* Blur gradient behind setup guide */}
      <div
        className="fixed z-30 pointer-events-none transition-opacity duration-300"
        style={{
          bottom: 'calc(var(--workbench-height, 0px) - 400px)',
          right: -375,
          width: 1500,
          height: 900,
          backgroundImage: `url(${blurGradient})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          opacity: showIntro ? 1 : 0,
        }}
      />

      {/* Intro text next to setup guide */}
      <div
        className="fixed z-35 right-[350px] pointer-events-none max-w-[320px] transition-opacity duration-500"
        style={{
          bottom: 'calc(var(--workbench-height, 0px) + 40px)',
          opacity: showIntro ? 1 : 0,
        }}
      >
        {intro?.heading && <h2 className="text-display-small text-default mb-2">{intro.heading}</h2>}
        {intro?.body && <p className="text-body-medium text-subdued">{intro.body}</p>}
      </div>

    <div
      className="fixed right-4 z-40 w-[280px] bg-surface rounded-xl overflow-hidden"
      style={{
        bottom: 'calc(var(--workbench-height, 0px) + 8px)',
        boxShadow: '0px 5px 15px 0px rgba(0, 0, 0, 0.12), 0px 15px 35px 0px rgba(48, 49, 61, 0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-label-medium-emphasized text-default">{title}</span>
        <button onClick={() => setCollapsed((c) => !c)} className="cursor-pointer">
          <Icon name={collapsed ? 'chevronUp' : 'cancel'} className="size-[12px] text-icon-subdued" />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="py-1 px-1">
          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              {...section}
              expanded={expandedSection === section.id}
              onToggle={setExpandedSection}
              onItemAction={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
