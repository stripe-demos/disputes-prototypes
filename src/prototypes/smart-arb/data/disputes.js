import rawData from './disputes_prototype_data.json';

// Zero-decimal currencies are already in their base unit (no /100 needed).
const ZERO_DECIMAL_CURRENCIES = new Set(['jpy']);

// The static prototype JSON's due_by dates are fixed to when the fixture was
// authored, so by now most "needs response" rows have drifted into the past.
// A dispute still needing a response should always have a deadline ahead of
// today, so those rows get a deterministic future due date instead.
function needsResponseFutureDueBy(id) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const days = 1 + ((hash >>> 0) % 21); // 1–21 days out
  const due = new Date();
  due.setHours(23, 59, 59, 999);
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

function normalizeDispute(raw) {
  const card = raw.payment_method?.card;
  const isNeedsResponse = raw.status === 'needs_response' || raw.status === 'warning_needs_response';
  let dueBy = raw.evidence_details?.due_by || null;
  if (isNeedsResponse && (!dueBy || new Date(dueBy).getTime() < Date.now())) {
    dueBy = needsResponseFutureDueBy(raw.id);
  }
  const daysRemaining = dueBy
    ? Math.max(0, Math.ceil((new Date(dueBy) - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    id: raw.id,
    amount: raw.amount,
    // All prototype disputes display as USD regardless of the source data's
    // currency, since this prototype only needs one consistent currency.
    currency: 'usd',
    status: raw.status,
    reason: raw.reason,
    customerName: raw.customer?.name,
    customerEmail: raw.customer?.email,
    paymentId: raw.payment?.charge_id || raw.payment?.payment_id || raw.payment?.payment_intent_id,
    cardBrand: card?.network || 'unknown',
    cardLast4: card?.last4 || '',
    smartDisputesAvailable: raw.smart_disputes?.status === 'available',
    smartDisputesStatus: raw.smart_disputes?.status || 'unavailable',
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

export function getDisputeById(id) {
  return disputes.find((d) => d.id === id);
}

// Deterministic pseudo win-likelihood (no model backing this prototype yet):
// hashes the dispute id into a stable 30–85% range so the same dispute always
// shows the same value across renders.
function hashToPercent(id, min = 30, max = 85) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

// Win likelihood only makes sense while a dispute is still being contested;
// resolved/closed disputes show no score.
export function getWinLikelihood(dispute) {
  const category = getStatusFilterCategory(dispute.status);
  if (category !== 'needs_response' && category !== 'under_review') return null;
  return hashToPercent(dispute.id);
}

// Deterministic pseudo "stage" assignment (no backing field in the prototype
// data yet): hashes the dispute id into a stable bucket so the same dispute
// always lands in the same stage across renders. Weighted so most disputes
// sit at "Initial dispute", "Appeal" is next most common, "Inquiry" is rarest.
export const DISPUTE_STAGE_LABELS = {
  inquiry: 'Inquiry',
  initial_dispute: 'Initial dispute',
  appeal: 'Appeal',
};

// FNV-1a mixes sequential near-identical ids (e.g. "du_proto_001" vs "_002")
// far more evenly than the simple *31 rolling hash above, which clusters on
// this id shape and would skew the stage weighting.
export function fnv1aPercent(id) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function getDisputeStage(dispute) {
  const bucket = fnv1aPercent(dispute.id);
  if (bucket < 60) return DISPUTE_STAGE_LABELS.initial_dispute; // 60%
  if (bucket < 90) return DISPUTE_STAGE_LABELS.appeal; // 30%
  return DISPUTE_STAGE_LABELS.inquiry; // 10%
}

// Deterministic pseudo card brand (ignores the prototype data's real
// `card.network`, which includes discover/null): hashes the dispute id into
// an even three-way split across visa/mastercard/amex, matching the names
// `CardIcon` (src/icons/SailCardIcons.jsx) expects.
export function getCardBrand(dispute) {
  const bucket = fnv1aPercent(`brand:${dispute.id}`);
  if (bucket < 34) return 'visa';
  if (bucket < 67) return 'mastercard';
  return 'amex';
}

// Prototype data's smart_disputes.status has four raw values (available,
// unavailable, requires_evidence, processing) — collapsed to the three
// states the Smart Disputes column shows. "processing" reads as not yet
// actionable, so it folds into "Not available" alongside "unavailable".
export const SMART_DISPUTES_LABELS = {
  available: 'Available',
  unavailable: 'Not available',
  requires_evidence: 'Needs evidence',
};

export function getSmartDisputesLabel(dispute) {
  if (dispute.smartDisputesStatus === 'requires_evidence') return SMART_DISPUTES_LABELS.requires_evidence;
  if (dispute.smartDisputesStatus === 'available') return SMART_DISPUTES_LABELS.available;
  return SMART_DISPUTES_LABELS.unavailable;
}

// Only disputes still awaiting a response have a deadline to count down —
// under review, won, lost, and closed disputes show no due-in value.
export function getDueIn(dispute) {
  const category = getStatusFilterCategory(dispute.status);
  if (category !== 'needs_response') return '—';
  return pluralizeDays(dispute.daysRemaining);
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
