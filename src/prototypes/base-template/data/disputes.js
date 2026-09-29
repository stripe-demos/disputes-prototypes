import rawData from './disputes_prototype_data.json';

// Zero-decimal currencies are already in their base unit (no /100 needed).
const ZERO_DECIMAL_CURRENCIES = new Set(['jpy']);

function normalizeDispute(raw) {
  const card = raw.payment_method?.card;
  const dueBy = raw.evidence_details?.due_by || null;
  const daysRemaining = dueBy
    ? Math.max(0, Math.ceil((new Date(dueBy) - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    id: raw.id,
    amount: raw.amount,
    currency: raw.currency,
    status: raw.status,
    reason: raw.reason,
    customerName: raw.customer?.name,
    customerEmail: raw.customer?.email,
    paymentId: raw.payment?.charge_id || raw.payment?.payment_id || raw.payment?.payment_intent_id,
    cardBrand: card?.network || 'unknown',
    cardLast4: card?.last4 || '',
    smartDisputesAvailable: raw.smart_disputes?.status === 'available',
    created: raw.created_at,
    dueBy,
    daysRemaining,
    evidenceSubmitted: !!raw.evidence_details?.has_evidence,
    evidenceSubmittedAt: raw.evidence_details?.submitted_at || null,
    paymentDescription: raw.payment?.description || '',
    paymentCreated: raw.payment?.created_at || raw.created_at,
    resolvedAt: raw.outcome?.resolved_at || null,
    lossReason: raw.outcome?.loss_reason || null,
  };
}

export const disputes = rawData.disputes.map(normalizeDispute);

export const DISPUTE_REASON_LABELS = {
  fraudulent: 'Fraudulent',
  unrecognized: 'Unrecognized',
  product_not_received: 'Product not received',
  product_unacceptable: 'Product unacceptable',
  duplicate: 'Duplicate',
  credit_not_processed: 'Credit not processed',
  subscription_canceled: 'Subscription canceled',
  general: 'General',
  customer_initiated: 'Customer initiated',
  debit_not_authorized: 'Debit not authorized',
  bank_cannot_process: 'Bank cannot process',
  check_returned: 'Check returned',
  incorrect_account_details: 'Incorrect account details',
  insufficient_funds: 'Insufficient funds',
  noncompliant: 'Noncompliant',
};

// Static labels/variants for contexts (e.g. the detail page) that show a
// single badge per status without the row's live day-count text.
export const DISPUTE_STATUS_LABELS = {
  needs_response: 'Needs response',
  under_review: 'Under review',
  won: 'Won',
  lost: 'Lost',
  warning_needs_response: 'Needs response (early warning)',
  warning_under_review: 'Under review (early warning)',
  warning_closed: 'Closed (early warning)',
};

export const DISPUTE_STATUS_VARIANTS = {
  needs_response: 'warning',
  under_review: 'default',
  won: 'success',
  lost: 'danger',
  warning_needs_response: 'warning',
  warning_under_review: 'default',
  warning_closed: 'default',
};

// The status filter groups the granular per-row statuses above into the
// buckets shown in the "Status" filter menu.
export const STATUS_FILTER_OPTIONS = [
  { value: 'needs_response', label: 'Needs response' },
  { value: 'under_review', label: 'Under review' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_FILTER_CATEGORY = {
  needs_response: 'needs_response',
  under_review: 'under_review',
  won: 'won',
  lost: 'lost',
  warning_needs_response: 'needs_response',
  warning_under_review: 'under_review',
  warning_closed: 'closed',
};

export function getStatusFilterCategory(status) {
  return STATUS_FILTER_CATEGORY[status] || status;
}

export function pluralizeDays(n) {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

// Row badge: label + Badge variant, including the live "days remaining" text.
export function getStatusBadge(dispute) {
  switch (dispute.status) {
    case 'needs_response':
    case 'warning_needs_response':
      return { variant: 'warning', label: `${pluralizeDays(dispute.daysRemaining)} to respond` };
    case 'under_review':
    case 'warning_under_review':
      return { variant: 'default', label: 'Evidence sent' };
    case 'won':
      return { variant: 'success', label: 'Won' };
    case 'lost':
      return { variant: 'danger', label: 'Lost' };
    case 'warning_closed':
      return { variant: 'default', label: 'Closed' };
    default:
      return { variant: 'default', label: DISPUTE_STATUS_LABELS[dispute.status] || dispute.status };
  }
}

// Row/detail badge: overrides the "needs response" badge with an
// auto-respond countdown when Smart Disputes is available for the dispute.
export function getDisplayStatusBadge(dispute) {
  const isNeedsResponse = dispute.status === 'needs_response' || dispute.status === 'warning_needs_response';
  if (isNeedsResponse && dispute.smartDisputesAvailable) {
    return { variant: 'default', label: `${pluralizeDays(dispute.daysRemaining)} until auto-respond` };
  }
  return getStatusBadge(dispute);
}

export function getDisputeById(id) {
  return disputes.find((d) => d.id === id);
}

export function formatCurrency(amount, currency = 'usd') {
  const lowerCurrency = currency.toLowerCase();
  const value = ZERO_DECIMAL_CURRENCIES.has(lowerCurrency) ? amount : amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);
}

export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
