import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ControlPanelButton,
  ControlPanelBody,
  MARGIN,
  PANEL_WIDTH,
  InfoBanner,
  ContextDialog,
} from '../../sail/ControlPanel';
import { Switch } from '../../sail';
import { Icon } from '../../icons/SailIcons';

export default function ControlPanel({ darkMode, onToggleDarkMode, sandboxMode, onToggleSandboxMode, showFloatie, onToggleFloatie }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [animating, setAnimating] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);

  const open = () => {
    setExpanded(true);
    requestAnimationFrame(() => setAnimating(true));
  };

  const close = () => {
    setAnimating(false);
  };

  useEffect(() => {
    if (!expanded || animating) return;
    const timer = setTimeout(() => setExpanded(false), 150);
    return () => clearTimeout(timer);
  }, [animating, expanded]);

  const bottomExpr = `calc(var(--workbench-height, 0px) + ${MARGIN}px)`;

  return (
    <>
      {/* Collapsed FAB */}
      <button
        onClick={open}
        className="fixed z-[100] left-3 w-10 h-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center cursor-pointer hover:bg-offset origin-bottom-left"
        style={{
          bottom: bottomExpr,
          transform: expanded ? 'scale(0)' : 'scale(1)',
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? 'none' : 'auto',
          transition: 'transform 150ms, opacity 150ms, background-color 150ms',
        }}
      >
        <Icon name="settings" size="small" className="text-icon-subdued" />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="fixed z-[100] bg-surface rounded-lg shadow-lg overflow-hidden border border-border select-none origin-bottom-left"
          style={{
            width: PANEL_WIDTH,
            left: MARGIN,
            bottom: bottomExpr,
            transform: animating ? 'scale(1)' : 'scale(0.8)',
            opacity: animating ? 1 : 0,
            transition: 'transform 150ms, opacity 150ms',
          }}
        >
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <span className="text-label-medium-emphasized text-default">
              Prototype controls
            </span>
            <button
              onClick={close}
              className="w-6 h-6 flex items-center justify-center rounded-md text-icon-default hover:bg-offset cursor-pointer transition-colors -mr-1"
            >
              <Icon name="cancel" size="xsmall" fill="currentColor" className="size-[10px]" />
            </button>
          </div>
          <ControlPanelBody minimized={false}>
            <InfoBanner />
            <Switch
              checked={darkMode}
              onChange={onToggleDarkMode}
              label="Dark mode"
              className="w-full"
            />
            <Switch
              checked={sandboxMode}
              onChange={onToggleSandboxMode}
              label="Sandbox mode"
              className="w-full"
            />
            <Switch
              checked={showFloatie}
              onChange={onToggleFloatie}
              label="Show floatie"
              className="w-full"
            />
            <ControlPanelButton onClick={() => setContextOpen(true)}>
              Show context
            </ControlPanelButton>
            <ControlPanelButton onClick={() => navigate('/')}>
              View all prototypes
            </ControlPanelButton>
          </ControlPanelBody>
        </div>
      )}

      <ContextDialog open={contextOpen} onClose={() => setContextOpen(false)} />
    </>
  );
}
