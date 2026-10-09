import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Breadcrumb, Checkbox, Dialog, Link, Radio, Switch, Tabs } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';

const DEFAULT_AUTO_RESPOND_PREFS = { smartDisputesOn: true, manualOn: true, priority: 'manual' };
const DEFAULT_APPEAL_PREFS = { smartDisputesOn: false, manualOn: false, reviewOrder: 'user-first' };

function getDefaultAppealPrefs({ manual, defaultState, autoRespondPrefs }) {
  if (manual !== 'no-manual') return DEFAULT_APPEAL_PREFS;

  const smartDisputesOn =
    defaultState === 'default-on' ? true :
    defaultState === 'inherits' ? autoRespondPrefs.smartDisputesOn :
    false;

  return { ...DEFAULT_APPEAL_PREFS, smartDisputesOn };
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
      <Icon name="checkCircleFilled" size="small" className="text-white shrink-0" />
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

function SettingRow({ title, description, active = true, linkLabel, onLinkClick, actionLabel, actionVariant = 'secondary', onAction }) {
  return (
    <div className="flex items-center gap-6 bg-surface rounded-[8px] px-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-heading-small text-default">{title}</h3>
          {active && <Badge variant="success">Active</Badge>}
        </div>
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
            <Link href="https://stripe.com/pricing" target="_blank" rel="noopener noreferrer" variant="secondary" className="text-body-small">Smart Disputes fee</Link> applies if you win.
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
            <Link href="https://stripe.com/pricing" target="_blank" rel="noopener noreferrer" variant="secondary" className="text-body-small">fee</Link> applies when the evidence is sent and returned if you win.
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

const APPEAL_IMPACT_GRADIENT = 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 30%, #bfdbfe 65%, #eff6ff 100%)';

function modeFromAppealPrefs({ smartDisputesOn, manualOn }) {
  if (smartDisputesOn && manualOn) return 'both';
  if (manualOn) return 'manual';
  return 'stripe';
}

function appealPrefsFromMode(mode) {
  if (mode === 'both') return { smartDisputesOn: true, manualOn: true };
  if (mode === 'manual') return { smartDisputesOn: false, manualOn: true };
  return { smartDisputesOn: true, manualOn: false };
}

function AppealToggleItem({ title, description, selected, recommended, onClick, children }) {
  return (
    <div className="w-full relative isolate">
      {recommended && (
        <span
          className={`relative z-[2] -mb-px inline-flex w-fit items-center rounded-t-md px-1.5 py-1 text-label-small-emphasized ${
            selected ? 'bg-brand-500 text-white' : 'bg-border text-subdued'
          }`}
        >
          Recommended
        </span>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={`relative z-[1] w-full text-left rounded-md px-3 py-2 cursor-pointer border ${recommended ? 'rounded-tl-none' : ''} ${
          selected ? 'border-brand-500' : 'border-border'
        }`}
      >
        <div className="text-label-medium-emphasized text-default">{title}</div>
        <div className="text-body-small text-subdued">{description}</div>
        {children}
      </div>
    </div>
  );
}

function getAppealBothTitle({ escalation, showImpact }) {
  if (!showImpact) {
    if (escalation === 'automated') return 'Stripe handles some appeals, you handle the rest';
    return 'You handle appeals, with Stripe as backup';
  }
  return 'Let Stripe handle some appeals';
}

function getAppealBothDescription({ escalation, manual, showImpact }) {
  if (!showImpact) {
    if (escalation === 'automated') {
      return 'Smart Disputes chooses which lost disputes to appeal. You review the rest and decide the response.';
    }
    return 'You choose which lost disputes to appeal. Smart Disputes reviews the rest and appeals the ones it selects.';
  }
  if (escalation === 'choice') {
    return 'You review some of the disputes you lost and so does Stripe.';
  }
  if (escalation === 'automated' && manual === 'manual') {
    return 'Stripe intelligently assesses disputes you lost and automatically appeals eligible disputes. You then review the rest and decide if you want to appeal or agree with the decision.';
  }
  return 'You review disputes you lost and decide if you want to appeal or accept the decision. Stripe then intelligently assesses the remainder and appeals eligible disputes.';
}

function getStripeHandlesAppealsTitle(showImpact, escalation) {
  if (!showImpact && escalation === 'choice') return 'Stripe handles appeals, with you as backup';
  return showImpact ? 'Let Stripe handle appeals' : 'Stripe handles appeals for you';
}

function getStripeHandlesAppealsDescription(showImpact, escalation) {
  if (!showImpact && escalation === 'choice') {
    return 'Smart Disputes chooses which lost disputes to appeal and sends the appeals automatically. You review the rest and decide what you want to appeal.';
  }
  return showImpact
    ? 'Stripe intelligently assesses disputes you lost and chooses which to appeal with the network. Fully automated and fee is only charged if you win the appeal.'
    : "Smart Disputes chooses which lost disputes to appeal and sends the appeals. The rest aren't appealed.";
}

function getHandleAllAppealsTitle(showImpact) {
  return showImpact ? 'You handle appeals' : 'You handle all appeals';
}

function getHandleAllAppealsDescription(showImpact) {
  return showImpact
    ? 'You review disputes you lost that can be appealed and decide how to respond. Fees charged when an appeal is sent regardless of outcome.'
    : 'You choose which lost disputes to appeal.';
}

function AppealPreferencesModal({ open, onClose, value, onSave, showImpact = true, escalation, manual }) {
  const [mode, setMode] = useState(modeFromAppealPrefs(value));
  const [reviewOrder, setReviewOrder] = useState(value.reviewOrder || 'user-first');

  useEffect(() => {
    if (open) {
      setMode(modeFromAppealPrefs(value));
      setReviewOrder(value.reviewOrder || 'user-first');
    }
  }, [open, value]);

  const handleSave = () => onSave({ ...appealPrefsFromMode(mode), reviewOrder });

  if (manual === 'no-manual') {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        size="medium"
        title={<span className="text-heading-medium text-default">Enable automatic appeals</span>}
        subtitle={
          <>
            Stripe reviews disputes you lost manually and intelligently chooses which lost
            disputes to appeal and sends the appeals. A Smart Disputes fee applies only if you win.{' '}
            <Link href="#" variant="secondary">View docs</Link>
          </>
        }
        footer={
          <>
            <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onSave({ smartDisputesOn: true, manualOn: false, reviewOrder })}
            >
              Enable
            </Button>
          </>
        }
      >
        <div>
          <p className="text-heading-small text-default">Estimated impact based on last 6 months</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="shrink-0 bg-offset rounded-md px-4 py-2">
              <p className="text-body-small text-subdued">Lost revenue</p>
              <p className="text-heading-small text-default mt-0.5">$16K</p>
            </div>
            <Icon name="arrowRight" size="small" className="text-icon-subdued shrink-0" />
            <div className="shrink-0 bg-offset rounded-md px-4 py-2">
              <p className="text-body-small text-subdued">Estimated recovery with appeals</p>
              <p className="text-heading-small text-default mt-0.5">
                $12.3K <span className="text-label-small text-success">+72%</span>
              </p>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  const isAllOrNothing = escalation === 'all-or-nothing';

  const toggleItems = (
    <div className="flex flex-col gap-3 w-full">
      <AppealToggleItem
        recommended
        title={getStripeHandlesAppealsTitle(showImpact, escalation)}
        description={getStripeHandlesAppealsDescription(showImpact, escalation)}
        selected={mode === 'stripe'}
        onClick={() => setMode('stripe')}
      />
      {!isAllOrNothing && (
        <AppealToggleItem
          title={getAppealBothTitle({ escalation, showImpact })}
          description={getAppealBothDescription({ escalation, manual, showImpact })}
          selected={mode === 'both'}
          onClick={() => setMode('both')}
        />
      )}
      <AppealToggleItem
        title={getHandleAllAppealsTitle(showImpact)}
        description={getHandleAllAppealsDescription(showImpact)}
        selected={mode === 'manual'}
        onClick={() => setMode('manual')}
      />
    </div>
  );

  if (!showImpact) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        size="large"
        width={500}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="md" onClick={handleSave}>Enable preference</Button>
          </>
        }
      >
        <h2 className="text-heading-medium text-default pr-8">Choose how to respond to appeals</h2>
        <p className="text-body-small text-subdued mt-0.5">
          When you lose a dispute, you can sometimes appeal the decision to recover lost revenue.{' '}
          <Link href="#" variant="secondary" className="text-body-small">View docs</Link>
        </p>
        <div className="mt-4">{toggleItems}</div>
        {escalation === 'choice' && (
          <div className="mt-6">
            <h3 className="text-heading-small text-default">How do fees work?</h3>
            <p className="text-body-small text-subdued mt-0.5">
              Fees vary by who responds to the appeal. You pay fees for the appeals you send, win
              or lose. Smart Disputes fee only applies if you win the appeal, Stripe covers fees if
              the appeal is lost.{' '}
              <Link href="#" variant="secondary" className="text-body-small">View pricing</Link>
            </p>
          </div>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} size="xlarge">
      <div className="-m-4 flex min-h-[560px]">
        {/* Left: options */}
        <div className="flex-1 min-w-0 p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-heading-medium text-default">Choose how to respond to appeals</h2>
            <p className="text-body-medium text-subdued mt-2">
              Appeals are an extended lifecycle that give you an opportunity to challenge the initial
              decision and recover revenue.{' '}
              <Link href="#" variant="secondary" className="text-body-medium">View docs</Link>
            </p>

            <div className="mt-6">{toggleItems}</div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-6"
            onClick={handleSave}
          >
            Enable preferences
          </Button>
        </div>

        {/* Right: potential impact preview */}
        <div className="w-[46%] shrink-0 p-2">
          <div
            className="relative h-full rounded-[8px] overflow-hidden flex flex-col items-start justify-center px-9"
            style={{ background: APPEAL_IMPACT_GRADIENT }}
          >
            <div className="w-full max-w-[358px] bg-surface rounded-2xl shadow-lg px-5 pt-5 pb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-heading-small text-default">Potential impact</h3>
                <span className="flex items-center gap-1 text-label-small-emphasized text-default bg-surface border border-border rounded-[6px] px-2 py-1">
                  Last 6 months
                  <Icon name="arrowUpDown" size="xsmall" className="text-icon-subdued" />
                </span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 bg-offset rounded-md px-4 py-3">
                  <p className="text-label-small text-default">Lost revenue</p>
                  <p className="text-heading-small text-default mt-0.5">$16K</p>
                  <p className="text-label-small text-subdued mt-0.5">40 disputes</p>
                </div>
                <Icon name="arrowRight" size="small" className="text-icon-subdued shrink-0" />
                <div className="flex-1 bg-offset rounded-md px-4 py-3">
                  <p className="text-label-small text-default">Estimated recovery with appeals</p>
                  <p className="text-heading-small text-default mt-0.5">
                    $12.3K <span className="text-label-small text-success">+72%</span>
                  </p>
                  <p className="text-label-small text-subdued mt-0.5">29 dispute decisions overturned</p>
                </div>
              </div>
            </div>

            <p className="text-label-small text-default mt-4">
              No fees charged if you lose. Fee only applied if the appeal is won.
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function getAutoRespondDescription({ smartDisputesOn, manualOn, priority }) {
  if (smartDisputesOn && manualOn) {
    return priority === 'smart_disputes'
      ? "Smart Disputes evidence is sent if you haven't responded by the deadline, even if you've started a manual response."
      : "Manual evidence is sent if you've added it by the deadline; otherwise Smart Disputes sends evidence for you.";
  }
  if (smartDisputesOn) return "Smart Disputes prepares and sends a response if you haven't responded by the deadline.";
  if (manualOn) return "Stripe sends any evidence you've added by the deadline.";
  return "Choose what Stripe sends if you haven't responded by the deadline.";
}

const IMPACT_NOTE = ' Based on your dispute history, enabling this could help recover an estimated $3,200/month in otherwise-lost revenue.';

function getEnablementAppealCopy({ escalation, manual, detail, appealPrefs }) {
  if (manual === 'no-manual') {
    return appealPrefs.smartDisputesOn
      ? 'Stripe automatically appeals eligible disputes with Smart Disputes.'
      : 'Let Stripe handle appeal responses for you intelligently.';
  }

  const configured = appealPrefs.smartDisputesOn || appealPrefs.manualOn;
  if (!configured) {
    return 'Choose your response preferences if an appeal is available for the dispute.';
  }

  const mode = modeFromAppealPrefs(appealPrefs);

  let base;
  if (mode === 'stripe') {
    base = 'Stripe intelligently assesses disputes you lost and chooses which to appeal with the network.';
  } else if (mode === 'manual') {
    base = 'You review disputes you lost that can be appealed and decide how to respond.';
  } else if (escalation === 'automated') {
    base = 'Smart Disputes automatically appeals eligible disputes first. You can still manually appeal any disputes it skips.';
  } else if (escalation === 'choice') {
    base = appealPrefs.reviewOrder === 'stripe-first'
      ? 'Stripe reviews disputes you lost first and automatically appeals eligible ones. You review and decide on the rest.'
      : 'You review disputes you lost first and decide how to respond. Stripe then reviews the rest and automatically appeals eligible ones.';
  } else {
    base = 'You review and appeal disputes manually first. Smart Disputes automatically appeals any eligible disputes you haven’t responded to by the deadline.';
  }

  return detail === 'impact' ? base + IMPACT_NOTE : base;
}

function DisputesSettingsPanel() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [searchParams] = useSearchParams();
  const escalation = searchParams.get('escalation') || 'merchant';
  const manual = searchParams.get('manual') || 'manual';
  const detail = searchParams.get('detail') || 'simple';
  const defaultState = searchParams.get('defaultState') || 'default-off';
  const [activeModal, setActiveModal] = useState(null);
  const [autoRespondOpen, setAutoRespondOpen] = useState(false);
  const [autoRespondPrefs, setAutoRespondPrefs] = useState(DEFAULT_AUTO_RESPOND_PREFS);
  const [appealResponsesOpen, setAppealResponsesOpen] = useState(false);
  const [appealPrefs, setAppealPrefs] = useState(() =>
    getDefaultAppealPrefs({ manual, defaultState, autoRespondPrefs: DEFAULT_AUTO_RESPOND_PREFS })
  );
  const [businessDetailsOpen, setBusinessDetailsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [disputeDeflectionOn, setDisputeDeflectionOn] = useState(true);
  const [disputeResolutionOn, setDisputeResolutionOn] = useState(true);

  useEffect(() => {
    setAppealPrefs(getDefaultAppealPrefs({ manual, defaultState, autoRespondPrefs }));
  }, [escalation, manual, defaultState, autoRespondPrefs.smartDisputesOn]);

  const closeModal = () => setActiveModal(null);

  const confirmActiveModal = () => {
    activeModal?.onConfirm?.();
    closeModal();
  };

  const handleSaveAutoRespond = (prefs) => {
    setAutoRespondPrefs(prefs);
    setAutoRespondOpen(false);
    setToastMessage('Auto-respond preferences saved');
  };

  const handleSaveAppealPrefs = (prefs) => {
    setAppealPrefs(prefs);
    setAppealResponsesOpen(false);
    setToastMessage('Appeal preferences saved');
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
        <div className="bg-offset rounded-[8px] p-2">
        <div className="flex flex-col gap-2">
        <SettingRow
          title="Dispute deflection"
          active={disputeDeflectionOn}
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
          active={disputeResolutionOn}
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
        </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="pb-3">
          <h2 className="text-heading-medium text-default">Responding to disputes</h2>
          <p className="text-body-small text-subdued mt-0.5">
            Manage how Stripe responds to disputes and helps you appeal lost disputes.{' '}
            <Link href="#" variant="secondary" className="text-body-small">View docs</Link>
          </p>
        </div>
        <div className="bg-offset rounded-[8px] p-2">
        <div className="flex flex-col gap-2">
        <SettingRow
          title="Automate dispute response"
          active={autoRespondPrefs.smartDisputesOn || autoRespondPrefs.manualOn}
          description={getAutoRespondDescription(autoRespondPrefs)}
          actionLabel="Edit preferences"
          actionVariant="secondary"
          onAction={() => setAutoRespondOpen(true)}
        />
        <SettingRow
          title="Automate appeal response"
          active={appealPrefs.smartDisputesOn}
          description={getEnablementAppealCopy({ escalation, manual, detail, appealPrefs })}
          actionLabel={
            manual === 'no-manual'
              ? appealPrefs.smartDisputesOn ? 'Disable' : 'Enable'
              : appealPrefs.smartDisputesOn || appealPrefs.manualOn ? 'Edit preferences' : 'Set up'
          }
          actionVariant="secondary"
          onAction={() => {
            if (manual === 'no-manual' && appealPrefs.smartDisputesOn) {
              handleSaveAppealPrefs({ smartDisputesOn: false, manualOn: false, reviewOrder: appealPrefs.reviewOrder });
              return;
            }
            setAppealResponsesOpen(true);
          }}
        />
        </div>
        </div>
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

      <AppealPreferencesModal
        open={appealResponsesOpen}
        onClose={() => setAppealResponsesOpen(false)}
        value={appealPrefs}
        onSave={handleSaveAppealPrefs}
        showImpact={detail === 'impact'}
        escalation={escalation}
        manual={manual}
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
