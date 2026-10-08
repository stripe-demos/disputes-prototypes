import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Badge, Breadcrumb, Button, Link, Timeline } from '../../../sail';
import { CardIcon } from '../../../icons/SailCardIcons';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import RespondToDisputeModal from './RespondToDisputeModal';
import { getEffectiveStatus, getListStatusBadge } from '../listview/disputesConfig';
import {
  getDisputeById,
  DISPUTE_REASON_LABELS,
  DISPUTE_STAGE_LABELS,
  getDisputeStage,
  formatCurrency,
  formatDate,
  formatDateTime,
  pluralizeDays,
} from '../data/disputes';

const DISPUTE_FEE_CENTS = 1500;
const APPEAL_WINDOW_DAYS = 7;

const REASON_CODES = {
  fraudulent: '10.4',
  unrecognized: '13.1',
  product_not_received: '13.1',
  product_unacceptable: '13.3',
  duplicate: '12.6.1',
  credit_not_processed: '13.6',
  subscription_canceled: '13.2',
  general: '53',
  customer_initiated: '11.3',
  debit_not_authorized: 'R10',
  bank_cannot_process: 'R09',
  check_returned: 'R05',
  incorrect_account_details: 'R03',
  insufficient_funds: 'R01',
  noncompliant: '12.5',
};

function getWinLikelihood(dispute) {
  if (dispute.smartDisputesAvailable) return 'High';
  if (dispute.evidenceSubmitted) return 'Medium';
  return 'Low';
}

function getAppealDeadline(dispute) {
  if (!dispute.resolvedAt) return null;
  const deadline = new Date(dispute.resolvedAt);
  deadline.setDate(deadline.getDate() + APPEAL_WINDOW_DAYS);
  return deadline;
}

function StatusBanner({ dispute, basePath, navigate, onRespond, wasAutomated }) {
  const reasonLabel = (DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason || '').toLowerCase();
  const isAppealStage = getDisputeStage(dispute) === DISPUTE_STAGE_LABELS.appeal;

  if (isAppealStage && (dispute.status === 'needs_response' || dispute.status === 'warning_needs_response')) {
    return (
      <div className="mb-6 bg-surface border-4 border-offset rounded-lg p-6">
        <h2 className="text-heading-medium text-default mb-1">
          You have {pluralizeDays(dispute.daysRemaining)} to appeal the decision.
        </h2>
        <p className="text-body-small text-subdued">
          The customer's bank reviewed the evidence and agreed with the customer. You can appeal
          this decision or accept it by {formatDateTime(dispute.dueBy)}. If you appeal and the
          customer wins, additional fees may exceed {formatCurrency(DISPUTE_FEE_CENTS, dispute.currency)}.
        </p>
        <div className="flex items-center justify-between mt-4">
          <Link href="#" variant="secondary" className="text-body-small">Review dispute activity</Link>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md">Accept decision</Button>
            <Button variant="primary" size="md">Appeal decision</Button>
          </div>
        </div>
      </div>
    );
  }

  if (dispute.status === 'needs_response' || dispute.status === 'warning_needs_response') {
    return (
      <div className="mb-6 bg-surface border border-border rounded-lg p-6">
        <h2 className="text-heading-small text-default mb-1">The customer disputed this payment.</h2>
        <p className="text-body-small text-subdued">
          {dispute.smartDisputesAvailable
            ? `Stripe will automatically respond to this dispute with Smart Disputes on ${formatDateTime(dispute.dueBy)}. You can add evidence, respond manually, or accept the dispute before then.`
            : `Respond to this dispute by ${formatDateTime(dispute.dueBy)}. If you don't respond, you'll automatically lose this dispute.`}
        </p>
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="secondary" size="md">Accept dispute</Button>
          <Button variant="primary" size="md" onClick={onRespond}>
            Respond to dispute
          </Button>
        </div>
      </div>
    );
  }

  if (isAppealStage && (dispute.status === 'under_review' || dispute.status === 'warning_under_review')) {
    return (
      <div className="mb-6 bg-surface border-4 border-offset rounded-lg p-6">
        <h2 className="text-heading-medium text-default mb-1">Appeal was sent.</h2>
        <p className="text-body-small text-subdued">
          The customer's bank agreed with the customer on the initial response. Smart Disputes
          reviewed the evidence and appealed the decision. We expect you'll get a decision from
          the network in 60–90 days.
        </p>
        <div className="mt-4">
          <Link href="#" variant="secondary" className="text-body-small">Review dispute activity</Link>
        </div>
      </div>
    );
  }

  if (dispute.status === 'under_review' || dispute.status === 'warning_under_review') {
    return (
      <div className="mb-6">
        <h2 className="text-heading-small text-default mb-1">Evidence under review.</h2>
        <p className="text-body-small text-subdued">
          {dispute.evidenceSubmittedAt
            ? `You submitted evidence on ${formatDate(dispute.evidenceSubmittedAt)}. `
            : 'Evidence has been submitted. '}
          The customer's bank is reviewing your response and will return a decision.
        </p>
        <div className="mt-4">
          <Button variant="secondary" size="md" onClick={() => navigate(`${basePath}/disputes/${dispute.id}/evidence`)}>
            View submitted evidence
          </Button>
        </div>
      </div>
    );
  }

  if (isAppealStage && dispute.status === 'won') {
    return (
      <div className="mb-6 bg-surface border border-border rounded-lg shadow-sm p-6">
        <h2 className="text-heading-medium text-default mb-1">You won the dispute.</h2>
        <p className="text-body-small text-subdued">
          The customer's bank agreed with your appeal. The disputed amount, minus fees, will be
          returned to you.
        </p>
        <Link href="#" variant="secondary" className="text-body-small mt-3 inline-block">
          Review your appeal
        </Link>
      </div>
    );
  }

  if (isAppealStage && (dispute.status === 'lost' || dispute.status === 'warning_closed')) {
    return (
      <div className="mb-6 bg-surface border border-border rounded-lg shadow-sm p-6">
        <h2 className="text-heading-medium text-default mb-1">You lost this dispute.</h2>
        <p className="text-body-small text-subdued">
          The network reviewed the appeal {wasAutomated ? 'Smart Disputes sent' : 'you sent'} and
          upheld the initial decision. The full disputed amount will be returned to the customer.
        </p>
        <Link href="#" variant="secondary" className="text-body-small mt-3 inline-block">
          Review dispute activity
        </Link>
      </div>
    );
  }

  if (dispute.status === 'won') {
    return (
      <div className="mb-6">
        <h2 className="text-heading-small text-default mb-1">You won this dispute.</h2>
        <p className="text-body-small text-subdued">
          The customer's bank reviewed the evidence and sided with you. The disputed amount of{' '}
          {formatCurrency(dispute.amount, dispute.currency)} has been returned to you.
        </p>
        <Link href="#" variant="primary" className="text-body-small mt-3 inline-block">
          View the bank's response
        </Link>
      </div>
    );
  }

  // lost / warning_closed
  const appealDeadline = getAppealDeadline(dispute);
  const daysToAppeal = appealDeadline
    ? Math.ceil((appealDeadline - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (appealDeadline && daysToAppeal > 0) {
    return (
      <div className="mb-6">
        <h2 className="text-heading-small text-default mb-1">
          You have {daysToAppeal} {daysToAppeal === 1 ? 'day' : 'days'} to appeal the decision.
        </h2>
        <p className="text-body-small text-subdued">
          The customer's bank reviewed the evidence and agreed with the customer. You can appeal this
          decision or accept it by {formatDateTime(appealDeadline)}. If you appeal and the customer wins,
          additional fees may exceed {formatCurrency(DISPUTE_FEE_CENTS, dispute.currency)}.
        </p>
        <Link href="#" variant="primary" className="text-body-small mt-1 inline-block">
          View the bank's response
        </Link>
        <div className="flex items-center gap-2 mt-4">
          <Button variant="secondary" size="md">Accept decision</Button>
          <Button variant="primary" size="md">Appeal decision</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-heading-small text-default mb-1">The appeal window has closed.</h2>
      <p className="text-body-small text-subdued">
        The customer's bank reviewed the evidence and agreed with the customer. The disputed amount of{' '}
        {formatCurrency(dispute.amount, dispute.currency)} was not returned to you.
      </p>
      <Link href="#" variant="primary" className="text-body-small mt-3 inline-block">
        View the bank's response
      </Link>
    </div>
  );
}

function toTimelineItems(events) {
  return events.map((event, i) => ({
    id: String(i),
    title: event.label,
    subcopy: event.subcopy,
    timestamp: formatDateTime(event.date),
    sortTimestamp: new Date(event.date),
    state: event.state,
  }));
}

function buildActivity(dispute, wasAutomated) {
  const isAppealStage = getDisputeStage(dispute) === DISPUTE_STAGE_LABELS.appeal;
  const isAppealNeedsResponse =
    isAppealStage && (dispute.status === 'needs_response' || dispute.status === 'warning_needs_response');

  // Fixed, non-chronological order per design: the appeal deadline leads even
  // though the payment/dispute events underneath it are further in the past.
  if (isAppealNeedsResponse) {
    const decisionReturned = new Date(dispute.dueBy);
    decisionReturned.setDate(decisionReturned.getDate() - APPEAL_WINDOW_DAYS);
    return toTimelineItems([
      { label: 'Appeal response deadline', date: dispute.dueBy, state: 'default' },
      {
        label: 'Dispute decision returned',
        date: decisionReturned,
        state: 'default',
        subcopy: `Customer's bank agreed with the customer. The disputed amount of ${formatCurrency(dispute.amount, dispute.currency)} has not been returned to you.`,
      },
      { label: 'Evidence sent manually', date: dispute.evidenceSubmittedAt || dispute.created, state: 'completed' },
      { label: 'Payment disputed', date: dispute.created, state: 'completed' },
      { label: 'Payment succeeded', date: dispute.paymentCreated, state: 'completed' },
      { label: 'Payment started', date: dispute.paymentCreated, state: 'completed' },
    ]);
  }

  if (isAppealStage && dispute.status === 'won') {
    const appealedAt = new Date(dispute.resolvedAt);
    appealedAt.setDate(appealedAt.getDate() - APPEAL_WINDOW_DAYS);
    const decisionReturned = new Date(appealedAt);
    decisionReturned.setDate(decisionReturned.getDate() - APPEAL_WINDOW_DAYS);
    return toTimelineItems([
      { label: 'Dispute won', date: dispute.resolvedAt, state: 'positive' },
      { label: 'Dispute decision appealed', date: appealedAt, state: 'completed' },
      {
        label: 'Dispute decision returned',
        date: decisionReturned,
        state: 'completed',
        subcopy: `Customer's bank agreed with the customer.`,
      },
      { label: 'Evidence sent', date: dispute.evidenceSubmittedAt || dispute.created, state: 'completed' },
      { label: 'Payment disputed', date: dispute.created, state: 'completed' },
      { label: 'Payment succeeded', date: dispute.paymentCreated, state: 'completed' },
      { label: 'Payment started', date: dispute.paymentCreated, state: 'completed' },
    ]);
  }

  if (isAppealStage && (dispute.status === 'under_review' || dispute.status === 'warning_under_review')) {
    const appealSentAt = dispute.evidenceSubmittedAt || dispute.created;
    const decisionReturned = new Date(appealSentAt);
    decisionReturned.setDate(decisionReturned.getDate() - APPEAL_WINDOW_DAYS);
    return toTimelineItems([
      {
        label: wasAutomated ? 'Appeal sent automatically with Smart Disputes' : 'You sent an appeal',
        date: appealSentAt,
        state: 'default',
      },
      {
        label: 'Dispute decision returned in favor of customer',
        date: decisionReturned,
        state: 'completed',
        subcopy: `The disputed amount of ${formatCurrency(dispute.amount, dispute.currency)} has not been returned to you.`,
      },
      { label: 'Evidence sent manually', date: dispute.created, state: 'completed' },
      { label: 'Payment disputed', date: dispute.created, state: 'completed' },
      { label: 'Payment succeeded', date: dispute.paymentCreated, state: 'completed' },
      { label: 'Payment started', date: dispute.paymentCreated, state: 'completed' },
    ]);
  }

  if (isAppealStage && (dispute.status === 'lost' || dispute.status === 'warning_closed')) {
    const decisionReturned = new Date(dispute.resolvedAt);
    decisionReturned.setDate(decisionReturned.getDate() - APPEAL_WINDOW_DAYS);
    return toTimelineItems([
      { label: 'Dispute lost', date: dispute.resolvedAt, state: 'default' },
      {
        label: wasAutomated ? 'Appeal sent automatically with Smart Disputes' : 'You sent an appeal',
        date: dispute.resolvedAt,
        state: 'completed',
      },
      {
        label: 'Dispute decision returned in favor of customer',
        date: decisionReturned,
        state: 'completed',
        subcopy: `The disputed amount of ${formatCurrency(dispute.amount, dispute.currency)} has not been returned to you.`,
      },
      { label: 'Evidence sent manually', date: dispute.evidenceSubmittedAt || dispute.created, state: 'completed' },
      { label: 'Payment disputed', date: dispute.created, state: 'completed' },
      { label: 'Payment succeeded', date: dispute.paymentCreated, state: 'completed' },
      { label: 'Payment started', date: dispute.paymentCreated, state: 'completed' },
    ]);
  }

  const events = [];
  const appealDeadline = getAppealDeadline(dispute);
  const isFinal = ['won', 'lost', 'warning_closed'].includes(dispute.status);

  if (appealDeadline && dispute.status !== 'won') {
    events.push({ label: 'Appeal response deadline', date: appealDeadline });
  }
  if (isFinal && dispute.resolvedAt) {
    events.push({
      label: 'Dispute decision returned',
      date: dispute.resolvedAt,
      subcopy:
        dispute.status === 'won'
          ? `The bank agreed with you. ${formatCurrency(dispute.amount, dispute.currency)} was returned to you.`
          : `The bank agreed with the customer. ${formatCurrency(dispute.amount, dispute.currency)} was not returned to you.`,
    });
  }
  if (dispute.evidenceSubmitted && dispute.evidenceSubmittedAt) {
    events.push({ label: 'Evidence sent', date: dispute.evidenceSubmittedAt });
  }
  events.push({ label: 'Payment disputed', date: dispute.created });
  events.push({ label: 'Payment succeeded', date: dispute.paymentCreated });
  events.push({ label: 'Payment started', date: dispute.paymentCreated });

  const sorted = events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const now = Date.now();
  let currentMarked = false;
  return sorted.map((event, i) => {
    const isFuture = new Date(event.date).getTime() > now;
    let state = 'completed';
    if (isFuture) {
      state = 'default';
    } else if (!currentMarked) {
      currentMarked = true;
      state = event.label === 'Dispute decision returned' && dispute.status === 'won' ? 'positive' : 'default';
    }
    return {
      id: String(i),
      title: event.label,
      subcopy: event.subcopy,
      timestamp: formatDateTime(event.date),
      sortTimestamp: new Date(event.date),
      state,
    };
  });
}

export default function DisputeDetail() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useBasePath();
  const automation = new URLSearchParams(location.search).get('automation') || 'manual';
  const rawDispute = getDisputeById(disputeId);
  const [feesExpanded, setFeesExpanded] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);

  if (!rawDispute) {
    return <Navigate to={`${basePath}/disputes`} replace />;
  }

  // Aligns this page with the status shown on the list row that linked here —
  // the "management stage" automation chip (see MANAGEMENT_TOGGLE_GROUPS in
  // PrototypeNav.jsx) can display a dispute as "Under review" on the list even
  // though its underlying data is still "Needs response".
  const effectiveStatus = getEffectiveStatus(rawDispute, automation);
  const dispute = effectiveStatus === rawDispute.status ? rawDispute : { ...rawDispute, status: effectiveStatus };

  const isFinal = ['won', 'lost', 'warning_closed'].includes(dispute.status);
  const isAppealStage = getDisputeStage(dispute) === DISPUTE_STAGE_LABELS.appeal;
  const isAppealNeedsResponse =
    isAppealStage && (dispute.status === 'needs_response' || dispute.status === 'warning_needs_response');
  const statusBadge = getListStatusBadge(dispute);
  const isLost = dispute.status === 'lost' || dispute.status === 'warning_closed';
  const isWon = dispute.status === 'won';
  const isAppealFixedOrderTimeline =
    isAppealNeedsResponse ||
    (isAppealStage &&
      (isWon ||
        isLost ||
        dispute.status === 'under_review' ||
        dispute.status === 'warning_under_review'));
  // Sum of every line item actually shown in the Payment breakdown below —
  // Payment amount, Fees, and (unless won, where it's crossed out and excluded) Disputed amount.
  const netAmount = isWon ? dispute.amount - DISPUTE_FEE_CENTS : dispute.amount - dispute.amount - DISPUTE_FEE_CENTS;
  const activity = buildActivity(dispute, effectiveStatus !== rawDispute.status);

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb
          pages={[{ label: 'Disputes', to: `${basePath}/disputes` }]}
          showCurrentPage={false}
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-heading-xlarge text-default">
            {formatCurrency(dispute.amount, dispute.currency)}
          </h1>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
        <p className="text-body-medium">
          <span className="text-subdued">Charged to</span>{' '}
          <span className="text-brand">{dispute.customerName || dispute.customerEmail}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <StatusBanner
            dispute={dispute}
            basePath={basePath}
            navigate={navigate}
            wasAutomated={effectiveStatus !== rawDispute.status}
            onRespond={() => setRespondModalOpen(true)}
          />

          <div>
            <h2 className="text-heading-medium text-default mb-4">Recent activity</h2>
            <Timeline items={activity} sortOrder={isAppealFixedOrderTimeline ? 'none' : 'desc'} />
          </div>

          <div>
            <h2 className="text-heading-medium text-default mb-4">Payment breakdown</h2>
            <div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <p className="text-body-small text-subdued">Payment amount</p>
                <p className="text-body-small text-default">{formatCurrency(dispute.amount, dispute.currency)}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <p className={`text-body-small text-subdued ${isWon ? 'line-through' : ''}`}>Disputed amount</p>
                <p className={`text-body-small text-default ${isWon ? 'line-through' : ''}`}>
                  -{formatCurrency(dispute.amount, dispute.currency)}
                </p>
              </div>
              <div className="py-2 border-b border-border">
                <button
                  className="w-full flex items-center justify-between cursor-pointer"
                  onClick={() => setFeesExpanded((v) => !v)}
                >
                  <span className="inline-flex items-center gap-1 text-body-small text-subdued">
                    <Icon name={feesExpanded ? 'chevronDown' : 'chevronRight'} size="xxsmall" fill="currentColor" />
                    Fees
                  </span>
                  <span className="text-body-small text-default">
                    -{formatCurrency(DISPUTE_FEE_CENTS, dispute.currency)}
                  </span>
                </button>
                {feesExpanded && (
                  <div className="flex items-center justify-between pl-5 mt-2 pt-2 border-t border-border">
                    <p className="text-body-small text-subdued">Dispute received fee</p>
                    <p className="text-body-small text-subdued">
                      -{formatCurrency(DISPUTE_FEE_CENTS, dispute.currency)}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3">
                <p className="text-body-small-emphasized text-default">Net amount</p>
                <p className="text-body-small-emphasized text-default">
                  {netAmount < 0 ? '-' : ''}{formatCurrency(Math.abs(netAmount), dispute.currency)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-heading-medium text-default mb-4">Payment method</h2>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <CardIcon name={dispute.cardBrand} size="small" />
                <span className="text-body-small text-default">•••• •••• •••• {dispute.cardLast4}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-heading-medium text-default mb-4">Dispute</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Dispute ID</p>
                <p className="text-body-small text-default break-all">{dispute.id}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Amount</p>
                <p className="text-body-small text-default">{formatCurrency(dispute.amount, dispute.currency)}</p>
              </div>
              {isAppealNeedsResponse ? (
                <div className="flex flex-col gap-1">
                  <p className="text-body-small-emphasized text-default">Appeal response deadline</p>
                  <p className="text-body-small text-default">{formatDateTime(dispute.dueBy)}</p>
                </div>
              ) : !isFinal ? (
                <div className="flex flex-col gap-1">
                  <p className="text-body-small-emphasized text-default">Respond by</p>
                  <p className="text-body-small text-default">{formatDate(dispute.dueBy)}</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-body-small-emphasized text-default">Resolved</p>
                    <p className="text-body-small text-default">{formatDate(dispute.resolvedAt)}</p>
                  </div>
                  {getAppealDeadline(dispute) && dispute.status !== 'won' && (
                    <div className="flex flex-col gap-1">
                      <p className="text-body-small-emphasized text-default">Appeal deadline</p>
                      <p className="text-body-small text-default">{formatDateTime(getAppealDeadline(dispute))}</p>
                    </div>
                  )}
                </>
              )}
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Reason</p>
                <p className="text-body-small text-brand">{DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Reason code</p>
                <p className="text-body-small text-brand">{REASON_CODES[dispute.reason] || '—'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Win likelihood</p>
                <p className="text-body-small text-brand">{getWinLikelihood(dispute)}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-heading-medium text-default mb-4">Details</h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Payment ID</p>
                <p className="text-body-small text-default break-all">{dispute.paymentId}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Payment method</p>
                <span className="inline-flex items-center gap-2">
                  <CardIcon name={dispute.cardBrand} size="small" />
                  <span className="text-body-small text-default">•••• {dispute.cardLast4}</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Description</p>
                <p className="text-body-small text-default">{dispute.paymentDescription || '—'}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Statement descriptor</p>
                <p className="text-body-small text-default">STRIPE DEMO</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-body-small-emphasized text-default">Dates</p>
                <p className="text-body-small text-default">Created {formatDateTime(dispute.paymentCreated)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RespondToDisputeModal
        open={respondModalOpen}
        onClose={() => setRespondModalOpen(false)}
        dispute={dispute}
        onReviewEvidence={() => {
          setRespondModalOpen(false);
          navigate(`${basePath}/disputes/${dispute.id}/evidence`);
        }}
      />
    </div>
  );
}
