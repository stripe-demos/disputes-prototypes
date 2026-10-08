import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBasePath } from '../../contexts/BasePath';
import { Icon } from '../../icons/SailIcons';
import SelectDropdown from '../../sail/SelectDropdown';

export const PROTOTYPE_NAV_HEIGHT = 60;

export const DISCOVERY_TOGGLE_GROUPS = [
  {
    key: 'variant',
    default: 'general',
    options: [
      { value: 'general', label: 'General announcement' },
      { value: 'personalized', label: 'Personalized' },
      { value: 'in-context', label: 'Dashboard notice' },
    ],
  },
  {
    key: 'defaultState',
    default: 'default-off',
    hidden: (activeValues) => activeValues.variant !== 'general' && activeValues.variant !== 'in-context',
    options: [
      { value: 'default-on-pre', label: 'Default on (pre-activation)' },
      { value: 'default-on-post', label: 'Default on (post-activation)' },
      { value: 'default-off', label: 'Default off' },
    ],
  },
  {
    key: 'angle',
    default: 'off',
    hidden: (activeValues) => activeValues.variant !== 'personalized',
    options: [
      { value: 'off', label: 'Off (Potential upsell)' },
      { value: 'on', label: 'On (Revenue recovery)' },
    ],
  },
];

export const ENABLEMENT_TOGGLE_GROUPS = [
  {
    key: 'manual',
    default: 'manual',
    options: [
      { value: 'no-manual', label: 'Smart Arb only' },
      { value: 'manual', label: 'Manual + Smart Arb' },
    ],
  },
  {
    key: 'defaultState',
    default: 'default-off',
    hidden: (activeValues) => activeValues.manual !== 'no-manual',
    options: [
      { value: 'inherits', label: 'Inherits SD configuration' },
      { value: 'default-on', label: 'Default on' },
      { value: 'default-off', label: 'Default off' },
    ],
  },
  {
    key: 'escalation',
    default: 'merchant',
    hidden: (activeValues) => activeValues.manual === 'no-manual',
    options: [
      { value: 'merchant', label: 'Merchant first' },
      { value: 'automated', label: 'Stripe first' },
      { value: 'choice', label: 'User choice' },
      { value: 'all-or-nothing', label: 'Stripe or manual' },
    ],
  },
];

export const MANAGEMENT_TOGGLE_GROUPS = [
  {
    key: 'automation',
    default: 'manual',
    options: [
      { value: 'manual', label: 'Manual only' },
      { value: 'some', label: 'Some automation' },
      { value: 'full', label: 'Fully automated' },
    ],
  },
];

const STAGES = [
  {
    key: 'discovery',
    label: 'Discovery',
    match: (p, base) => p === `${base}/discovery`,
    defaultPath: 'discovery',
  },
  {
    key: 'enablement',
    label: 'Enablement',
    match: (p, base) =>
      p.startsWith(`${base}/settings/payments`) ||
      p.startsWith(`${base}/disputes/evidence-library`) ||
      p.startsWith(`${base}/radar`),
    defaultPath: 'settings/payments?tab=disputes',
  },
  {
    key: 'management',
    label: 'Management',
    match: (p, base) => p.startsWith(`${base}/disputes`) && !p.startsWith(`${base}/disputes/evidence-library`),
    defaultPath: 'disputes/activity',
  },
];

// Mirrors the Sail "Chip" component (sail.stripe.me/components/chip): a pill
// with a subdued label, a divider, the brand-colored value, and a chevron.
function StageSelect({ activeStage, onSelect }) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        chipRef.current && !chipRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block shrink-0" ref={chipRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full border border-border hover:bg-offset transition-colors cursor-pointer outline-none"
        style={{ gap: '6px', padding: '3px 8px 3px 10px' }}
      >
        <span className="text-label-small-emphasized text-subdued">Stage</span>
        <div className="w-px h-2 bg-neutral-200" />
        <span className="text-label-small-emphasized text-brand">{activeStage.label}</span>
        <Icon
          name="chevronDown"
          className={`size-[10px] transition-transform text-icon-subdued ${open ? 'rotate-180' : ''}`}
          fill="currentColor"
        />
      </button>

      {open && (
        <SelectDropdown
          ref={dropdownRef}
          anchorRef={chipRef}
          variant="single"
          options={STAGES.map((stage) => ({ value: stage.key, label: stage.label }))}
          value={activeStage.key}
          onChange={onSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ToggleGroups({ groups, activeValues, onChange }) {
  const visibleGroups = groups.filter((group) => !group.hidden?.(activeValues));

  return (
    <>
      {visibleGroups.map((group, groupIndex) => {
        const activeValue = activeValues[group.key];
        return (
          <div key={group.key} className="flex items-center gap-4 shrink-0">
            {groupIndex > 0 && <div className="h-5 w-px bg-border shrink-0" />}
            <div className="flex items-center gap-2 flex-wrap">
              {group.options.map((option) => {
                const active = option.value === activeValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(group.key, option.value)}
                    className={`h-6 flex items-center text-label-small-emphasized rounded-full px-2.5 transition-colors duration-150 ${active
                      ? 'bg-brand/10 text-brand'
                      : 'border border-border text-subdued hover:bg-offset'
                      }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function PrototypeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();

  const activeStage = STAGES.find((stage) => stage.match(location.pathname, basePath)) || STAGES[0];

  const showDiscoveryToggles = location.pathname === `${basePath}/discovery`;
  const showEnablementToggles = location.pathname === `${basePath}/settings/payments`;
  const showManagementToggles =
    location.pathname.startsWith(`${basePath}/disputes`) &&
    !location.pathname.startsWith(`${basePath}/disputes/evidence-library`);
  const currentSearchParams = new URLSearchParams(location.search);

  const handleToggleChange = (groupKey, value) => {
    const next = new URLSearchParams(location.search);
    next.set(groupKey, value);
    navigate(`${location.pathname}?${next.toString()}`);
  };

  const toggleGroupsFor = (groups) =>
    Object.fromEntries(groups.map((group) => [group.key, currentSearchParams.get(group.key) || group.default]));

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-border"
      style={{ height: PROTOTYPE_NAV_HEIGHT }}
    >
      <div className="w-full px-6 flex items-center justify-between gap-4" style={{ height: PROTOTYPE_NAV_HEIGHT }}>
        <div className="flex items-center gap-4 min-w-0">
          <StageSelect
            activeStage={activeStage}
            onSelect={(key) => {
              const stage = STAGES.find((s) => s.key === key);
              if (stage) navigate(`${basePath}/${stage.defaultPath}`);
            }}
          />

          {showDiscoveryToggles && (
            <>
              <div className="h-5 w-px bg-border shrink-0" />
              <ToggleGroups
                groups={DISCOVERY_TOGGLE_GROUPS}
                activeValues={toggleGroupsFor(DISCOVERY_TOGGLE_GROUPS)}
                onChange={handleToggleChange}
              />
            </>
          )}

          {showEnablementToggles && (
            <>
              <div className="h-5 w-px bg-border shrink-0" />
              <ToggleGroups
                groups={ENABLEMENT_TOGGLE_GROUPS}
                activeValues={toggleGroupsFor(ENABLEMENT_TOGGLE_GROUPS)}
                onChange={handleToggleChange}
              />
            </>
          )}

          {showManagementToggles && (
            <>
              <div className="h-5 w-px bg-border shrink-0" />
              <ToggleGroups
                groups={MANAGEMENT_TOGGLE_GROUPS}
                activeValues={toggleGroupsFor(MANAGEMENT_TOGGLE_GROUPS)}
                onChange={handleToggleChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
