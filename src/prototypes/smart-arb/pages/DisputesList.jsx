import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBasePath } from '../../../contexts/BasePath';
import { PrototypeProvider } from '../listview/contexts/PrototypeContext';
import ListViewTemplate from '../listview/ListViewTemplate';
import { createDisputesConfig } from '../listview/disputesConfig';
import { Icon } from '../../../icons/SailIcons';

export function AppealsNoticeBanner({ onDismiss }) {
  const navigate = useNavigate();
  const basePath = useBasePath();

  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] bg-offset px-3 py-2 mb-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex items-center gap-1 shrink-0">
          <Icon name="sparkle" size="xsmall" className="text-icon-default" />
          <span className="text-label-small-emphasized text-default">New</span>
        </div>
        <p className="text-body-small text-default truncate flex-1">
          Turn on automatic appeals, and Smart Disputes can appeal lost disputes when available to help you recover revenue.
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/settings/payments?tab=disputes`)}
          className="text-label-medium-emphasized text-brand hover:underline"
        >
          Turn on
        </button>
        <div className="h-4 w-px bg-border" />
        <button type="button" onClick={onDismiss} className="text-icon-subdued hover:text-icon-default">
          <Icon name="cancel" size="xsmall" />
        </button>
      </div>
    </div>
  );
}

export default function DisputesList() {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const automation = new URLSearchParams(location.search).get('automation') || 'manual';
  const config = useMemo(() => createDisputesConfig(automation), [automation]);
  const segments = location.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  const tab = config.tabs.some((t) => t.tabId === lastSegment) ? lastSegment : 'activity';
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const showNotice = new URLSearchParams(location.search).get('notice') === 'smart-arb' && !noticeDismissed;

  return (
    <PrototypeProvider>
      {showNotice && <AppealsNoticeBanner onDismiss={() => setNoticeDismissed(true)} />}
      <ListViewTemplate
        config={config}
        basePath={`${basePath}/disputes`}
        initialTabId={tab}
        onRowOpen={(row) => navigate(`${basePath}/disputes/${row.id}?automation=${automation}`)}
      />
    </PrototypeProvider>
  );
}
