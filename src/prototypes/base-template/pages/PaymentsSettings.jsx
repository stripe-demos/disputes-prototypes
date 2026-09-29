import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Breadcrumb, Dialog, Link, Radio, Switch, Tabs } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';

const DEFAULT_AUTO_RESPOND_PREFS = { smartDisputesOn: false, manualOn: false, priority: 'manual' };

function getAutoRespondSummary({ smartDisputesOn, manualOn, priority }) {
  if (smartDisputesOn && manualOn) {
    const first = priority === 'smart_disputes' ? 'Smart Disputes evidence' : 'manual evidence';
    return `Smart Disputes evidence and manual evidence are on. Stripe will send ${first} first if both are ready.`;
  }
  if (smartDisputesOn) {
    return 'Smart Disputes evidence will be sent if you haven’t responded by the deadline.';
  }
  if (manualOn) {
    return 'Any evidence you’ve added will be sent if you haven’t responded by the deadline.';
  }
  return 'Choose what Stripe sends if you haven’t sent a response at the time of the response deadline.';
}

function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed z-[110] bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-default rounded-lg shadow-lg px-4 py-3">
      <Icon name="checkCircleFilled" size="small" className="text-icon-brand shrink-0" />
      <span className="text-body-small-emphasized text-surface">{message}</span>
    </div>
  );
}

const TABS = [
  { key: 'checkout_and_payment_links', label: 'Checkout and payment links' },
  { key: 'payment_methods', label: 'Payment methods' },
  { key: 'payment_method_domains', label: 'Payment method domains' },
  { key: 'agentic_commerce', label: 'Agentic commerce' },
  { key: 'disputes', label: 'Disputes' },
];

function SettingRow({ title, description, linkLabel, onLinkClick, actionLabel, actionVariant = 'secondary', onAction }) {
  return (
    <div className="flex items-center gap-6 py-4 border-t border-border">
      <div className="flex-1 min-w-0">
        <h3 className="text-heading-small text-default">{title}</h3>
        <p className="text-body-small text-subdued mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {linkLabel && (
          <Link
            href="#"
            variant="secondary"
            className="text-body-small"
            onClick={onLinkClick ? (e) => { e.preventDefault(); onLinkClick(); } : undefined}
          >
            {linkLabel}
          </Link>
        )}
        <Button variant={actionVariant} size="md" onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}

function BusinessDetailsModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} size="xlarge">
      <div className="-m-4 flex min-h-[560px]">
        {/* Left: form */}
        <div className="flex-1 min-w-0 p-8 flex flex-col">
          <h2 className="text-heading-xlarge text-default">Review and confirm details</h2>
          <p className="text-body-medium text-subdued mt-2">
            Provide Stripe with the details that will be shown to customers and card issuers during a lookup.
          </p>

          <div className="mt-8">
            <h3 className="text-heading-small text-default">Business name</h3>
            <p className="text-body-small text-subdued mt-0.5 mb-2">Public display name of your business</p>
            <button className="w-full flex items-center justify-between border border-border rounded-md px-3 py-2.5 hover:bg-offset transition-colors">
              <span className="text-body-medium-emphasized text-default">Descriptor: STRIPE DEMO</span>
              <Icon name="arrowUpDown" size="small" className="text-icon-subdued" />
            </button>
          </div>

          <div className="mt-5">
            <h3 className="text-heading-small text-default mb-2">URL</h3>
            <div className="bg-offset border border-border rounded-md px-3 py-2.5">
              <span className="text-body-medium text-subdued">www.mocktaillabs.com</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-heading-small text-default mb-2">Phone number</h3>
            <div className="flex items-center gap-2 bg-offset border border-border rounded-md px-3 py-2.5">
              <span className="text-body-medium">🇺🇸</span>
              <Icon name="chevronDown" size="xsmall" className="text-icon-subdued" />
              <span className="text-body-medium text-subdued">+1 415 123 4567</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-heading-small text-default mb-2">About</h3>
            <div className="bg-offset border border-border rounded-md px-3 py-2.5">
              <span className="text-body-medium text-subdued">We sell Stripe T-shirts.</span>
            </div>
          </div>

          <p className="text-body-small text-subdued mt-5">
            Update your account information in{' '}
            <Link href="#" variant="secondary" className="text-body-small">business details</Link>.
          </p>

          <div className="mt-auto pt-6">
            <Button variant="primary" size="lg" className="w-full" onClick={onClose}>Submit</Button>
            <div className="text-center mt-3">
              <Link href="https://stripe.com/pricing" external variant="secondary" className="text-body-small">View pricing</Link>
            </div>
          </div>
        </div>

        {/* Right: before/after preview */}
        <div className="w-[46%] shrink-0 bg-offset flex items-center justify-center p-8 rounded-r-lg">
          <div className="w-full max-w-[280px] flex flex-col gap-4">
            <div>
              <span className="inline-block text-label-small-emphasized text-subdued bg-surface border border-border rounded-full px-2 py-0.5 mb-2">Before</span>
              <div className="bg-surface rounded-lg shadow-md p-4">
                <p className="text-heading-large text-default text-center">$24.45</p>
                <div className="flex items-center justify-between mt-3 text-body-small text-subdued">
                  <span>Transaction date</span><span>Sep 29, 2026</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-body-small text-subdued">
                  <span>Card #</span><span>•••• 9876</span>
                </div>
              </div>
            </div>

            <Icon name="arrowDown" size="medium" className="text-icon-subdued self-center" />

            <div>
              <span className="inline-block text-label-small-emphasized text-subdued bg-surface border border-border rounded-full px-2 py-0.5 mb-2">After</span>
              <div className="bg-surface rounded-lg shadow-lg p-4">
                <p className="text-heading-small-emphasized text-default text-center">STRIPE DEMO</p>
                <p className="text-body-small text-subdued text-center">+14151234567</p>
                <p className="text-heading-large text-default text-center mt-2">$24.45</p>
                <div className="bg-offset rounded-md h-20 mt-3" />
                <div className="flex items-center justify-between mt-3 text-body-small text-subdued">
                  <span>Transaction date</span><span>Sep 29, 2026</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-body-small text-subdued">
                  <span>Card #</span><span>•••• 9876</span>
                </div>
                <div className="border-t border-border mt-3 pt-3 space-y-1.5">
                  <div className="h-2 bg-offset rounded w-3/4 ml-auto" />
                  <div className="h-2 bg-offset rounded w-2/3 ml-auto" />
                  <div className="h-2 bg-offset rounded w-1/2 ml-auto" />
                </div>
                <p className="text-body-small text-subdued text-center mt-3">We sell Stripe T-shirts.</p>
                <div className="flex justify-center mt-3">
                  <Button variant="secondary" size="sm">View receipt</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function AutoRespondPreferencesModal({ open, onClose, value, onSave }) {
  const [smartDisputesOn, setSmartDisputesOn] = useState(value.smartDisputesOn);
  const [manualOn, setManualOn] = useState(value.manualOn);
  const [priority, setPriority] = useState(value.priority);

  useEffect(() => {
    if (open) {
      setSmartDisputesOn(value.smartDisputesOn);
      setManualOn(value.manualOn);
      setPriority(value.priority);
    }
  }, [open, value]);

  const bothOn = smartDisputesOn && manualOn;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSave({ smartDisputesOn, manualOn, priority })}>Enable preferences</Button>
        </>
      }
    >
      <div className="pt-4 pb-3 pr-8">
        <h2 className="text-heading-medium text-default">Auto-respond preferences</h2>
        <p className="text-body-small text-subdued mt-0.5">
          Choose what Stripe sends if you haven't responded by the deadline.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 py-4">
        <div>
          <h3 className="text-heading-small text-default">Smart Disputes evidence</h3>
          <p className="text-body-small text-subdued mt-0.5">
            Smart Disputes prepares and sends a response at the deadline. The{' '}
            <Link href="https://stripe.com/pricing" external variant="secondary" className="text-body-small">Smart Disputes fee</Link> applies if you win.
          </p>
        </div>
        <Switch checked={smartDisputesOn} onChange={(e) => setSmartDisputesOn(e.target.checked)} />
      </div>

      <div className="border-t border-border" />

      <div className="flex items-start justify-between gap-4 py-4">
        <div>
          <h3 className="text-heading-small text-default">Manual evidence</h3>
          <p className="text-body-small text-subdued mt-0.5">
            Stripe sends any evidence you add at the deadline. A{' '}
            <Link href="https://stripe.com/pricing" external variant="secondary" className="text-body-small">fee</Link> applies when the evidence is sent and returned if you win.
          </p>
        </div>
        <Switch checked={manualOn} onChange={(e) => setManualOn(e.target.checked)} />
      </div>

      {bothOn && (
        <>
          <div className="border-t border-border" />
          <div className="py-4">
            <h3 className="text-heading-small text-default">Evidence priority</h3>
            <p className="text-body-small text-subdued mt-0.5 mb-3">
              Both are on. Choose which to send if both are ready:
            </p>
            <div className="flex items-center gap-6">
              <Radio
                name="evidence-priority"
                value="smart_disputes"
                checked={priority === 'smart_disputes'}
                onChange={() => setPriority('smart_disputes')}
                label="Smart Disputes evidence"
              />
              <Radio
                name="evidence-priority"
                value="manual"
                checked={priority === 'manual'}
                onChange={() => setPriority('manual')}
                label="Manual evidence"
              />
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

function AppealResponsesModal({ open, onClose, enabled, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={enabled ? 'Turn off appeals?' : 'Enable appeals?'}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={onConfirm}>{enabled ? 'Turn off' : 'Enable'}</Button>
        </>
      }
    >
      {enabled ? (
        <p className="text-body-medium text-subdued">
          You won't be able to appeal a dispute decision, and appeals will no longer appear in your Dashboard. You can turn appeals back on at any time.
        </p>
      ) : (
        <>
          <p className="text-body-medium text-subdued">Show available appeals in your Dashboard.</p>

          <p className="text-body-medium text-subdued mt-4">
            Turning on appeals is free. Fees vary by payment network and apply when you send an appeal.
          </p>
          <Link href="https://stripe.com/pricing" external variant="secondary" className="text-body-small mt-1">View appeal fees</Link>

          <p className="text-body-medium text-subdued mt-4">
            If you use the Disputes API, turning on appeals adds new statuses and webhook events. You may need to update your integration.
          </p>
          <Link href="#" variant="secondary" className="text-body-small mt-1">View docs</Link>
        </>
      )}
    </Dialog>
  );
}

function DisputesSettingsPanel() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [activeModal, setActiveModal] = useState(null);
  const [autoRespondOpen, setAutoRespondOpen] = useState(false);
  const [autoRespondPrefs, setAutoRespondPrefs] = useState(DEFAULT_AUTO_RESPOND_PREFS);
  const [appealResponsesOpen, setAppealResponsesOpen] = useState(false);
  const [businessDetailsOpen, setBusinessDetailsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [disputeDeflectionOn, setDisputeDeflectionOn] = useState(true);
  const [disputeResolutionOn, setDisputeResolutionOn] = useState(true);
  const [appealResponsesOn, setAppealResponsesOn] = useState(false);

  const closeModal = () => setActiveModal(null);

  const confirmActiveModal = () => {
    activeModal?.onConfirm?.();
    closeModal();
  };

  const hasAutoRespondPrefs = autoRespondPrefs.smartDisputesOn || autoRespondPrefs.manualOn;

  const handleSaveAutoRespond = (prefs) => {
    setAutoRespondPrefs(prefs);
    setAutoRespondOpen(false);
    setToastMessage('Auto-respond preferences saved');
  };

  return (
    <div>
      <section>
        <div className="pb-3">
          <h2 className="text-heading-medium text-default">Preventing disputes</h2>
          <p className="text-body-small text-subdued mt-0.5">
            Automatically deflect and resolve disputes to lower your dispute rate and costs.{' '}
            <Link href="#" variant="secondary" className="text-body-small">View docs</Link>
          </p>
        </div>
        <SettingRow
          title="Dispute deflection"
          description="Stripe sends your business and purchase details to customers who don't recognize a payment."
          linkLabel="Edit business details"
          onLinkClick={() => setBusinessDetailsOpen(true)}
          actionLabel={disputeDeflectionOn ? 'Disable' : 'Enable'}
          actionVariant={disputeDeflectionOn ? 'secondary' : 'primary'}
          onAction={() => setActiveModal(
            disputeDeflectionOn
              ? {
                title: 'Disable dispute deflection',
                description: 'Stripe will stop sending your business and purchase details to customers who don’t recognize a payment.',
                actionLabel: 'Disable',
                onConfirm: () => {
                  setDisputeDeflectionOn(false);
                  setToastMessage('Dispute deflection disabled');
                },
              }
              : {
                title: 'Enable dispute deflection',
                description: 'Stripe will send your business and purchase details to customers who don’t recognize a payment.',
                actionLabel: 'Enable',
                onConfirm: () => {
                  setDisputeDeflectionOn(true);
                  setToastMessage('Dispute deflection enabled');
                },
              }
          )}
        />
        <SettingRow
          title="Dispute resolution"
          description="Automatically refund payments that match your Radar rules."
          linkLabel="View resolution rules"
          onLinkClick={() => navigate(`${basePath}/radar/rules?action=resolve_dispute`)}
          actionLabel={disputeResolutionOn ? 'Disable' : 'Enable'}
          actionVariant={disputeResolutionOn ? 'secondary' : 'primary'}
          onAction={() => setActiveModal(
            disputeResolutionOn
              ? {
                title: 'Disable dispute resolution',
                description: 'Stripe will stop automatically refunding payments that match your Radar rules.',
                actionLabel: 'Disable',
                onConfirm: () => {
                  setDisputeResolutionOn(false);
                  setToastMessage('Dispute resolution disabled');
                },
              }
              : {
                title: 'Enable dispute resolution',
                description: 'Stripe will automatically refund payments that match your Radar rules.',
                actionLabel: 'Enable',
                onConfirm: () => {
                  setDisputeResolutionOn(true);
                  setToastMessage('Dispute resolution enabled');
                },
              }
          )}
        />
        <div className="border-t border-border" />
      </section>

      <section className="mt-10">
        <h2 className="text-heading-medium text-default pb-3">Responding to disputes</h2>
        <SettingRow
          title="Auto-respond at dispute deadline"
          description={getAutoRespondSummary(autoRespondPrefs)}
          actionLabel={hasAutoRespondPrefs ? 'Edit preferences' : 'Set up preferences'}
          actionVariant={hasAutoRespondPrefs ? 'secondary' : 'primary'}
          onAction={() => setAutoRespondOpen(true)}
        />
        <div className="border-t border-border" />
      </section>

      <section className="mt-10">
        <h2 className="text-heading-medium text-default pb-3">Appealing dispute decisions</h2>
        <SettingRow
          title="Appeal responses"
          description="When an appeal is available, it will appear in your Dashboard after a dispute decision. You can review the appeal and respond before its deadline."
          linkLabel="View docs"
          actionLabel={appealResponsesOn ? 'Disable' : 'Enable'}
          actionVariant={appealResponsesOn ? 'secondary' : 'primary'}
          onAction={() => setAppealResponsesOpen(true)}
        />
      </section>

      <Dialog
        open={!!activeModal}
        onClose={closeModal}
        title={activeModal?.title}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="md" onClick={confirmActiveModal}>{activeModal?.actionLabel}</Button>
          </>
        }
      >
        <p className="text-body-medium text-subdued">{activeModal?.description}</p>
      </Dialog>

      <AutoRespondPreferencesModal
        open={autoRespondOpen}
        onClose={() => setAutoRespondOpen(false)}
        value={autoRespondPrefs}
        onSave={handleSaveAutoRespond}
      />

      <AppealResponsesModal
        open={appealResponsesOpen}
        onClose={() => setAppealResponsesOpen(false)}
        enabled={appealResponsesOn}
        onConfirm={() => {
          setAppealResponsesOpen(false);
          setAppealResponsesOn(!appealResponsesOn);
          setToastMessage(appealResponsesOn ? 'Appeal responses turned off' : 'Appeal responses enabled');
        }}
      />

      <BusinessDetailsModal
        open={businessDetailsOpen}
        onClose={() => setBusinessDetailsOpen(false)}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}

export default function PaymentsSettings() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab');
  const activeTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : TABS[0].key;

  const handleTabChange = (key) => {
    setSearchParams(key === TABS[0].key ? {} : { tab: key });
  };

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb pages={[{ label: 'Settings', to: `${basePath}/settings` }]} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-xlarge text-default">Payments</h1>
        {activeTab === 'disputes' && (
          <Button variant="secondary" size="md" onClick={() => navigate(`${basePath}/disputes`)}>
            Go to disputes
          </Button>
        )}
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange}>
        {activeTab === 'disputes' ? (
          <DisputesSettingsPanel />
        ) : (
          <div className="border border-dashed border-border rounded-lg py-16 px-8 flex flex-col items-center justify-center">
            <p className="text-body-medium-emphasized text-default">Nothing here yet</p>
            <p className="text-body-small text-subdued mt-1">
              This section hasn't been built out in this prototype.
            </p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
