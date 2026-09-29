import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Badge, Breadcrumb, Button, Link } from '../../../sail';
import { CardIcon } from '../../../icons/SailCardIcons';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import RespondToDisputeModal from './RespondToDisputeModal';
import {
  getDisputeById,
  getDisplayStatusBadge,
  DISPUTE_REASON_LABELS,
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

function StatusBanner({ dispute, basePath, navigate, onRespond }) {
  const reasonLabel = (DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason || '').toLowerCase();

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

function buildActivity(dispute) {
  const events = [];
  const appealDeadline = getAppealDeadline(dispute);
  const isFinal = ['won', 'lost', 'warning_closed'].includes(dispute.status);

  if (appealDeadline && dispute.status !== 'won') {
    events.push({ label: 'Appeal deadline', date: appealDeadline });
  }
  if (isFinal && dispute.resolvedAt) {
    events.push({
      label: 'Dispute decision returned',
      date: dispute.resolvedAt,
      description:
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
    return { id: String(i), title: event.label, description: event.description, timestamp: new Date(event.date), state };
  });
}

function Timeline({ items, sortOrder = 'desc' }) {
  const sorted = [...items].sort((a, b) =>
    sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  );

  const dotClass = (state) => {
    if (state === 'positive') return 'bg-icon-success';
    if (state === 'completed') return 'bg-icon-subdued';
    return 'bg-icon-brand';
  };

  return (
    <div className="relative">
      {sorted.length > 1 && (
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />
      )}
      <div className="space-y-4">
        {sorted.map((item) => (
          <div key={item.id} className="relative flex items-start justify-between gap-4 pl-5">
            <span className={`absolute left-0 top-1.5 size-[7px] rounded-full ${dotClass(item.state)}`} />
            <div>
              <p className="text-body-small-emphasized text-default">{item.title}</p>
              {item.description && (
                <p className="text-body-small text-subdued mt-0.5">{item.description}</p>
              )}
            </div>
            <p className="text-body-small text-subdued shrink-0 whitespace-nowrap">{formatDateTime(item.timestamp)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DisputeDetail() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const dispute = getDisputeById(disputeId);
  const [feesExpanded, setFeesExpanded] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);

  if (!dispute) {
    return <Navigate to={`${basePath}/disputes`} replace />;
  }

  const isFinal = ['won', 'lost', 'warning_closed'].includes(dispute.status);
  const statusBadge = getDisplayStatusBadge(dispute);
  const netAmount = dispute.amount - DISPUTE_FEE_CENTS;
  const activity = buildActivity(dispute);

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
            onRespond={() => setRespondModalOpen(true)}
          />

          <div>
            <h2 className="text-heading-medium text-default mb-4">Recent activity</h2>
            <Timeline items={activity} sortOrder="desc" />
          </div>

          <div>
            <h2 className="text-heading-medium text-default mb-4">Payment breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Payment amount</p>
                <p className="text-body-small text-default">{formatCurrency(dispute.amount, dispute.currency)}</p>
              </div>
              <div>
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
                  <div className="flex items-center justify-between pl-5 mt-2">
                    <p className="text-body-small text-subdued">Dispute fee</p>
                    <p className="text-body-small text-subdued">
                      -{formatCurrency(DISPUTE_FEE_CENTS, dispute.currency)}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-body-small-emphasized text-default">Net amount</p>
                <p className="text-body-small-emphasized text-default">
                  {formatCurrency(netAmount, dispute.currency)}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Dispute ID</p>
                <p className="text-body-small text-default break-all">{dispute.id}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Amount</p>
                <p className="text-body-small text-default">{formatCurrency(dispute.amount, dispute.currency)}</p>
              </div>
              {!isFinal ? (
                <div className="flex items-center justify-between">
                  <p className="text-body-small text-subdued">Respond by</p>
                  <p className="text-body-small text-default">{formatDate(dispute.dueBy)}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-body-small text-subdued">Resolved</p>
                    <p className="text-body-small text-default">{formatDate(dispute.resolvedAt)}</p>
                  </div>
                  {getAppealDeadline(dispute) && dispute.status !== 'won' && (
                    <div className="flex items-center justify-between">
                      <p className="text-body-small text-subdued">Appeal deadline</p>
                      <p className="text-body-small text-default">{formatDateTime(getAppealDeadline(dispute))}</p>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Reason</p>
                <p className="text-body-small text-brand">{DISPUTE_REASON_LABELS[dispute.reason] || dispute.reason}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Reason code</p>
                <p className="text-body-small text-brand">{REASON_CODES[dispute.reason] || '—'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Win likelihood</p>
                <p className="text-body-small text-brand">{getWinLikelihood(dispute)}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-heading-medium text-default mb-4">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Payment ID</p>
                <p className="text-body-small text-default break-all">{dispute.paymentId}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Payment method</p>
                <span className="inline-flex items-center gap-2">
                  <CardIcon name={dispute.cardBrand} size="small" />
                  <span className="text-body-small text-default">•••• {dispute.cardLast4}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Description</p>
                <p className="text-body-small text-default text-right">{dispute.paymentDescription || '—'}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Statement descriptor</p>
                <p className="text-body-small text-default">STRIPE DEMO</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-body-small text-subdued">Dates</p>
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
