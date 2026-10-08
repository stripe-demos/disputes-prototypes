import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBasePath } from '../../../contexts/BasePath';
import { Sidebar } from '../../../sail/Sidebar';
import { Header } from '../../../sail/Header';
import SidebarNav from '../SidebarNav';
import HeaderNav from '../HeaderNav';
import { AppealsNoticeBanner } from './DisputesList';
import { PrototypeProvider } from '../listview/contexts/PrototypeContext';
import ListViewTemplate from '../listview/ListViewTemplate';
import { createDisputesConfig } from '../listview/disputesConfig';
import { Link } from '../../../sail';

const EMAIL_VARIANTS = {
  general: {
    heading: 'Turn on automatic appeals',
    ctaLabel: 'Turn on automatic appeals',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>
          Smart Disputes can now appeal lost disputes for you to help you recover revenue.
        </p>
        <p>
          <span className="text-heading-small text-default">How it works</span><br />
          Stripe reviews disputes that are available to appeal and selects some based on the
          case details and evidence. Smart Disputes automatically prepares and sends the
          selected appeals.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          The Smart Disputes fee applies only if you win the appeal. You aren&rsquo;t charged a
          Smart Disputes or network fee if you lose the appeal.{' '}
          <Link href="#" variant="secondary">View pricing</Link>
        </p>
      </>
    ),
  },
  'general-default-on-pre': {
    heading: 'Automatic appeals will be turned on {date}',
    ctaLabel: 'Edit preferences',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>
          Starting &#123;date&#125;, automatic appeals with Smart Disputes will be turned on for
          your &#123;account&#125;. No action is required. To prevent automatic appeals, turn
          them off before &#123;date&#125;.
        </p>
        <p>
          <span className="text-heading-small text-default">How it works</span><br />
          Stripe reviews disputes that are available to appeal and selects some based on the
          case details and evidence. Smart Disputes automatically prepares and sends the
          selected appeals.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          The Smart Disputes fee applies only if you win the appeal. You aren&rsquo;t charged a
          Smart Disputes or network fee if you lose the appeal.{' '}
          <Link href="#" variant="secondary">View pricing</Link>
        </p>
      </>
    ),
  },
  'general-default-on-post': {
    heading: 'Automatic appeals are now on',
    ctaLabel: 'Edit preferences',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>
          Automatic appeals with Smart Disputes are now on for your Stripe account. No action is
          required.
        </p>
        <p>
          <span className="text-heading-small text-default">How it works</span><br />
          Stripe reviews disputes that are available to appeal and selects some based on the
          case details and evidence. Smart Disputes automatically prepares and sends the
          selected appeals.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          The Smart Disputes fee applies only if an automatic appeal is won. You aren&rsquo;t
          charged a Smart Disputes or network fee if an automatic appeal is lost.{' '}
          <Link href="#" variant="secondary">View pricing</Link>
        </p>
        <p>
          <span className="text-heading-small text-default">Manage automatic appeals</span><br />
          You can turn off automatic appeals at any time in your Disputes settings.
        </p>
      </>
    ),
  },
  personalized: {
    heading: 'Let Smart Disputes appeal future disputes',
    ctaLabel: 'Turn on automatic appeals',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>
          A &#123;amount&#125; dispute you recently lost was eligible for an appeal with Smart
          Disputes. Automatic appeals weren&rsquo;t turned on, so Smart Disputes didn&rsquo;t
          appeal it, and this dispute can no longer be appealed.
        </p>
        <p>
          Turn on automatic appeals and Smart Disputes will decide whether to appeal future lost
          disputes automatically.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          If you win the appeal, your business recovers the dispute amount minus the Smart
          Disputes fee. You aren&rsquo;t charged if the appeal is lost.
        </p>
      </>
    ),
  },
  'personalized-on': {
    heading: 'Good news — you recovered {amount_returned}.',
    ctaLabel: 'View dispute',
    ctaPath: 'disputes/du_proto_001',
    body: (
      <>
        <p>
          Smart Disputes automatically appealed a lost dispute and won. That means
          &#123;amount_returned&#125; is back in your Stripe balance after the Smart Disputes
          fee. You didn&rsquo;t need to take any action.
        </p>
      </>
    ),
  },
};

function InContextDisputesPreview({ noticeState }) {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const config = useMemo(() => createDisputesConfig('manual'), []);

  return (
    <div className="h-full flex flex-row bg-surface relative overflow-hidden">
      <Sidebar contained mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <SidebarNav />
      </Sidebar>

      <Header contained onMenuToggle={() => setMobileMenuOpen((o) => !o)}>
        <HeaderNav />
      </Header>

      <div
        className="ml-0 lg:ml-sidebar-width flex flex-col min-w-0 flex-1 relative overflow-y-auto"
        style={{ paddingTop: 60, '--header-offset': '60px' }}
      >
        <div className="max-w-[1280px] w-full mx-auto px-5 md:px-8 pt-4 pb-4">
          <PrototypeProvider>
            <ListViewTemplate
              config={config}
              basePath={`${basePath}/disputes`}
              initialTabId="activity"
              onRowOpen={(row) => navigate(`${basePath}/disputes/${row.id}`)}
              belowTabsSlot={
                !noticeDismissed && (
                  <AppealsNoticeBanner state={noticeState} onDismiss={() => setNoticeDismissed(true)} linkToSettings={false} />
                )
              }
            />
          </PrototypeProvider>
        </div>
      </div>
    </div>
  );
}

export default function Discovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();

  const searchParams = new URLSearchParams(location.search);
  const variantKey = searchParams.get('variant') || 'general';
  const defaultState = searchParams.get('defaultState') || 'default-off';
  const angle = searchParams.get('angle') || 'off';
  const noticeState = defaultState === 'default-on-pre' || defaultState === 'default-on-post' ? defaultState : 'default-off';

  if (variantKey === 'in-context') {
    return <InContextDisputesPreview noticeState={noticeState} />;
  }

  const generalStateKey =
    variantKey === 'general' && defaultState === 'default-on-pre' ? 'general-default-on-pre' :
    variantKey === 'general' && defaultState === 'default-on-post' ? 'general-default-on-post' :
    variantKey === 'personalized' && angle === 'on' ? 'personalized-on' :
    variantKey;

  const variant = EMAIL_VARIANTS[generalStateKey] || EMAIL_VARIANTS.general;

  return (
    <div className="h-full flex items-center justify-center bg-[#EEF1F5] p-10 overflow-y-auto">
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-[470px] bg-surface rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-8 py-9">
          <img src="/stripe-logo.svg" alt="Stripe" className="h-7 w-auto mb-6" />
          <h2 className="text-heading-medium text-default mb-4">{variant.heading}</h2>
          <div className="border-t border-border mb-4" />
          <div className="text-body-medium text-default space-y-4">
            {variant.body}
          </div>
          <div className="border-t border-border my-5" />
          <button
            type="button"
            onClick={
              variant.ctaPath.startsWith('settings/')
                ? undefined
                : () => navigate(`${basePath}/${variant.ctaPath}`)
            }
            className="inline-flex items-center rounded-md bg-brand text-white text-label-large-emphasized px-4 py-2.5 hover:opacity-90"
          >
            {variant.ctaLabel}
          </button>
        </div>
        <p className="text-label-small text-subdued">Stripe, 354 Oyster Point Blvd, South San Francisco, CA 94080</p>
      </div>
    </div>
  );
}
