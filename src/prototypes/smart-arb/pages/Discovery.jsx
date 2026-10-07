import { useLocation, useNavigate } from 'react-router-dom';
import { useBasePath } from '../../../contexts/BasePath';
import BrowserWindow from '../BrowserWindow';
import { AppealsNoticeBanner } from './DisputesList';

const EMAIL_VARIANTS = {
  general: {
    heading: 'Automatic appeals are here',
    ctaLabel: 'Set up appeal preference',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>Hi there,</p>
        <p>
          Smart Disputes can now prepare and send appeals for lost disputes it determines are
          eligible that you do not manually appeal. It uses dispute details and evidence
          you&rsquo;ve already provided in the appeal.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          Automatic appeals only charge a fee when you win. If you lose, Stripe doesn&rsquo;t
          charge you network fees.
        </p>
        <p>
          <span className="text-heading-small text-default">Turning it off</span><br />
          You can turn off automatic appeals anytime in your Disputes settings.
        </p>
      </>
    ),
  },
  personalized: {
    heading: 'Recover more from future disputes',
    ctaLabel: 'Set up appeal preference',
    ctaPath: 'settings/payments?tab=disputes',
    body: (
      <>
        <p>Hi there,</p>
        <p>
          A &#123;amount&#125; dispute you recently lost was eligible for an appeal with Smart
          Disputes. Automatic appeals weren&rsquo;t turned on, so Smart Disputes didn&rsquo;t
          appeal it, and this dispute can no longer be appealed.
        </p>
        <p>
          Turn on automatic appeals to let Smart Disputes handle similar cases you miss the
          deadline for automatically next time.
        </p>
        <p>
          <span className="text-heading-small text-default">Fees</span><br />
          If the appeal is won, your business recovers the dispute amount minus the Smart
          Disputes fee. You aren&rsquo;t charged if the appeal is lost.
        </p>
      </>
    ),
  },
};

const WIREFRAME_COLUMNS = ['Status', 'Reason', 'Customer', 'Amount', 'Due in'];
const WIREFRAME_ROW_COUNT = 6;

function DisputesWireframeTable() {
  return (
    <div className="mt-6 border border-neutral-200 rounded-md overflow-hidden">
      <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-neutral-50 border-b border-neutral-200">
        {WIREFRAME_COLUMNS.map((label) => (
          <span key={label} className="text-label-small text-subdued">{label}</span>
        ))}
      </div>
      {Array.from({ length: WIREFRAME_ROW_COUNT }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-5 gap-4 px-4 py-3.5 border-b border-neutral-100 last:border-b-0 items-center"
        >
          <div className="h-4 w-16 rounded-full bg-neutral-200" />
          <div className="h-3 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-28 rounded bg-neutral-200" />
          <div className="h-3 w-14 rounded bg-neutral-200" />
          <div className="h-3 w-10 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

export default function Discovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();

  const variantKey = new URLSearchParams(location.search).get('variant') || 'general';

  if (variantKey === 'in-context') {
    return (
      <BrowserWindow url="dashboard.stripe.com/disputes">
        <div className="h-full overflow-y-auto px-8 py-6">
          <h1 className="text-heading-small text-default mb-4">Disputes</h1>
          <AppealsNoticeBanner onDismiss={() => {}} />
          <DisputesWireframeTable />
        </div>
      </BrowserWindow>
    );
  }

  const variant = EMAIL_VARIANTS[variantKey] || EMAIL_VARIANTS.general;

  return (
    <div className="h-full flex items-center justify-center bg-[#EEF1F5] p-10 overflow-y-auto">
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-[470px] bg-surface rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-8 py-9">
          <img src="/stripe-logo.svg" alt="Stripe" className="h-7 w-auto mb-6" />
          <h2 className="text-heading-medium text-default mb-4">{variant.heading}</h2>
          <div className="border-t border-border mb-4" />
          <div className="text-body-small text-default space-y-4">
            {variant.body}
          </div>
          <div className="border-t border-border my-5" />
          <button
            type="button"
            onClick={() => navigate(`${basePath}/${variant.ctaPath}`)}
            className="inline-flex items-center rounded-md bg-brand text-white text-label-medium-emphasized px-4 py-2.5 hover:opacity-90"
          >
            {variant.ctaLabel}
          </button>
        </div>
        <p className="text-label-small text-subdued">Stripe, 354 Oyster Point Blvd, South San Francisco, CA 94080</p>
      </div>
    </div>
  );
}
