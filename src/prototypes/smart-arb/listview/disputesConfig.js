import { createElement } from 'react';
import { S } from './lib/statusStyles';
import EvidenceLibrary from '../pages/EvidenceLibrary';
import {
  disputes,
  DISPUTE_REASON_LABELS,
  DISPUTE_STAGE_LABELS,
  SMART_DISPUTES_LABELS,
  STATUS_FILTER_OPTIONS,
  formatCurrency,
  formatDate,
  getStatusFilterCategory,
  getWinLikelihood,
  getDisputeStage,
  getCardBrand,
  getSmartDisputesLabel,
  getDueIn,
  fnv1aPercent,
  pluralizeDays,
} from '../data/disputes';

// Cloned 1:1 from apps/m2/src/app/disputes/config.ts (columns, filters, view
// chip structure, status style map). Only the `data` array and the option
// lists that depend on this app's real status/reason taxonomy differ from
// the m2 mock — everything else (ids, types, labels) is unchanged.

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'amount', type: 'basic-text', label: 'Amount' },
  {
    id: 'status', type: 'status', label: 'Status',
    dataKeys: { styleKey: 'status-style', tooltipKey: 'status-tooltip' },
    statusMap: {
      'Needs response': S.warning,
      'Needs response (Appeal)': S.warning,
      'Needs response (Smart Disputes available)': S.default,
      'Under review': S.default,
      'Won': S.success,
      'Lost': S.critical,
      'Closed': S.default,
    },
  },
  { id: 'reason', type: 'basic-text', label: 'Reason' },
  { id: 'stage', type: 'basic-text', label: 'Stage' },
  { id: 'customer', type: 'basic-text', label: 'Customer' },
  { id: 'source-type', type: 'brand-icon', label: 'Source type', iconSrc: '/m2/icons/brandIcon16.svg', secondaryIconSrc: '/m2/icons/link.svg', dataKeys: { secondary: 'source-type-secondary', brand: 'source-type-brand' } },
  { id: 'disputed-on', type: 'date', label: 'Disputed on', colSpan: 2 },
  { id: 'respond-by', type: 'date', label: 'Respond by', colSpan: 2 },
  { id: 'due-in', type: 'basic-text', label: 'Due in' },
  { id: 'win-likelihood', type: 'dot-scale', label: 'Win likelihood' },
  { id: 'smart-disputes', type: 'basic-text', label: 'Smart Disputes', defaultVisible: false },
  { id: 'settlement-merchant', type: 'basic-text', label: 'Settlement merchant', defaultVisible: false },
  { id: 'charge-transferred-to', type: 'basic-text', label: 'Charge transferred to', defaultVisible: false },
];

// ─── Filters ──────────────────────────────────────────────────────────────────
// Reason/status options reflect this app's real taxonomy (data/disputes.js)
// rather than m2's mock list, so every filter actually matches real rows.

const REASON_OPTIONS = Object.values(DISPUTE_REASON_LABELS);
const STATUS_OPTIONS = STATUS_FILTER_OPTIONS.map((o) => o.label);
const RESOLUTION_OPTIONS = ['Won', 'Lost', 'Warning closed', 'Inquiry closed'];
const STAGE_OPTIONS = Object.values(DISPUTE_STAGE_LABELS);
const SMART_DISPUTES_OPTIONS = Object.values(SMART_DISPUTES_LABELS);

const FILTERS = [
  { id: 'reason', label: 'Reason', type: 'single-select', options: REASON_OPTIONS },
  { id: 'status', label: 'Status', type: 'multi-select', options: STATUS_OPTIONS },
  { id: 'stage', label: 'Stage', type: 'multi-select', options: STAGE_OPTIONS },
  { id: 'smart-disputes', label: 'Smart Disputes', type: 'multi-select', options: SMART_DISPUTES_OPTIONS },
  { id: 'resolution', label: 'Resolution', type: 'single-select', options: RESOLUTION_OPTIONS },
  { id: 'amount', label: 'Amount', type: 'value' },
  { id: 'disputed-date', label: 'Disputed date', type: 'date' },
  { id: 'connected-account-id', label: 'Connected Account ID (OBO only)', type: 'value' },
  { id: 'evidence-due-by', label: 'Evidence due by', type: 'date' },
  { id: 'settlement-merchant', label: 'Settlement merchant', type: 'value' },
  { id: 'charge-transferred-to', label: 'Charge transferred to', type: 'value' },
  { id: 'win-likelihood', label: 'Win likelihood', type: 'value' },
];

// ─── Data: map real disputes (data/disputes.js) into the engine's generic row shape ──

function getStatusLabel(d) {
  const category = getStatusFilterCategory(d.status);
  return STATUS_FILTER_OPTIONS.find((o) => o.value === category)?.label || category;
}

const STATUS_CATEGORY_VARIANT = {
  needs_response: 'warning',
  under_review: 'default',
  won: 'success',
  lost: 'danger',
  closed: 'default',
};

// Same label + badge color the list's "Status" column shows for a dispute —
// used by the detail page so its header badge always matches the row it was
// opened from (list = category labels like "Needs response", not the
// detail-only "X days to respond" countdown text).
export function getListStatusBadge(d) {
  const label = getStatusLabel(d);
  const category = getStatusFilterCategory(d.status);
  if (category === 'needs_response' && d.smartDisputesAvailable) {
    return { label, variant: 'default' };
  }
  return { label, variant: STATUS_CATEGORY_VARIANT[category] || 'default' };
}

function getResolution(d) {
  if (d.status === 'won') return 'Won';
  if (d.status === 'lost') return 'Lost';
  if (d.status === 'warning_closed') return 'Warning closed';
  if (getStatusFilterCategory(d.status) === 'closed') return 'Inquiry closed';
  return undefined;
}

// "Management stage" automation levels (driven by the PrototypeNav chip
// control, see MANAGEMENT_TOGGLE_GROUPS in PrototypeNav.jsx) simulate what the
// list looks like once Smart Disputes is handling appeal-stage responses:
// disputes that are in the "Appeal" stage and still "Needs response" are the
// ones that would actually be auto-handled, so those are the only ones whose
// displayed status shifts to "Under review". "Some automation" flips a
// deterministic ~50% subset of them; "Fully automated" flips all of them.
export function getEffectiveStatus(d, automationLevel) {
  if (automationLevel === 'manual' || !automationLevel) return d.status;
  if (d.status !== 'needs_response' && d.status !== 'warning_needs_response') return d.status;
  if (getDisputeStage(d) !== DISPUTE_STAGE_LABELS.appeal) return d.status;

  if (automationLevel === 'some' && fnv1aPercent(`automation:${d.id}`) >= 50) return d.status;

  return d.status === 'warning_needs_response' ? 'warning_under_review' : 'under_review';
}

function toRow(d, automationLevel) {
  const effectiveStatus = getEffectiveStatus(d, automationLevel);
  const effective = effectiveStatus === d.status ? d : { ...d, status: effectiveStatus };
  const winLikelihood = getWinLikelihood(effective);
  const statusLabel = getStatusLabel(effective);
  const isNeedsResponse = getStatusFilterCategory(effective.status) === 'needs_response';
  const isUnderReview = getStatusFilterCategory(effective.status) === 'under_review';
  const wasAutomated = effective.status !== d.status;
  const stage = getDisputeStage(d);
  const isAppealStage = stage === DISPUTE_STAGE_LABELS.appeal;
  return {
    id: d.id,
    amount: `${formatCurrency(d.amount, d.currency)} ${d.currency.toUpperCase()}`,
    status: statusLabel,
    'status-style':
      isNeedsResponse && d.smartDisputesAvailable ? 'Needs response (Smart Disputes available)' :
      isNeedsResponse && isAppealStage ? 'Needs response (Appeal)' :
      statusLabel,
    'status-tooltip':
      isNeedsResponse && isAppealStage
        ? `You have ${pluralizeDays(d.daysRemaining)} to appeal the initial dispute decision.`
        : isUnderReview
        ? (wasAutomated
          ? 'Smart Disputes automatically sent an appeal. The network will respond in 30-60 days.'
          : 'You sent an appeal. The network will respond in 30-60 days.')
        : undefined,
    resolution: getResolution(effective),
    reason: DISPUTE_REASON_LABELS[d.reason] || d.reason,
    stage,
    customer: d.customerName || d.customerEmail,
    'source-type': `•••• ${d.cardLast4}`,
    'source-type-secondary': false,
    'source-type-brand': getCardBrand(d),
    'disputed-on': formatDate(d.created),
    'respond-by': d.dueBy ? formatDate(d.dueBy) : '—',
    'due-in': getDueIn(effective),
    'win-likelihood': winLikelihood !== null ? `${winLikelihood}%` : '—',
    'smart-disputes': isAppealStage ? '—' : getSmartDisputesLabel(d),
    'settlement-merchant': '—',
    'charge-transferred-to': '—',
  };
}

// ─── View chips ───────────────────────────────────────────────────────────────
// Dropped m2's "Prevented" chip — this app's data model has no fraud-prevention
// status to back it. Counts are computed live from the real dataset.

const SMART_DISPUTES_UNAVAILABLE_LABELS = [SMART_DISPUTES_LABELS.unavailable, SMART_DISPUTES_LABELS.requires_evidence];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export function createDisputesConfig(automationLevel = 'manual') {
  const effectiveDisputes = disputes.map((d) => {
    const effectiveStatus = getEffectiveStatus(d, automationLevel);
    return effectiveStatus === d.status ? d : { ...d, status: effectiveStatus };
  });

  function countWhere(predicate) {
    return String(effectiveDisputes.filter(predicate).length);
  }

  const VIEW_CHIPS = [
    {
      id: 'smart-disputes-available',
      label: 'Smart Disputes available',
      count: countWhere((d) => d.smartDisputesAvailable),
      filters: [{ id: 'smart-disputes', filterType: 'single-select', selectedValues: [SMART_DISPUTES_LABELS.available] }],
    },
    {
      id: 'needs-response',
      label: 'Needs response',
      count: countWhere((d) => getStatusFilterCategory(d.status) === 'needs_response' && !d.smartDisputesAvailable),
      filters: [
        { id: 'status', filterType: 'single-select', selectedValues: ['Needs response'] },
        { id: 'smart-disputes', filterType: 'multi-select', selectedValues: SMART_DISPUTES_UNAVAILABLE_LABELS },
      ],
    },
    {
      id: 'under-review',
      label: 'Under review',
      count: countWhere((d) => getStatusFilterCategory(d.status) === 'under_review'),
      filters: [{ id: 'status', filterType: 'single-select', selectedValues: ['Under review'] }],
    },
    {
      id: 'closed',
      label: 'Closed',
      count: countWhere((d) => d.status === 'won' || d.status === 'lost'),
      filters: [{ id: 'status', filterType: 'multi-select', selectedValues: ['Won', 'Lost'] }],
    },
  ];

  const ACTIVITY_TAB = {
    tabId: 'activity',
    mobileRow: { label: 'Dispute', title: 'amount', description: ['reason', 'customer'], right: 'status' },
    label: 'Activity',
    columns: COLUMNS,
    filters: FILTERS,
    data: disputes.map((d) => toRow(d, automationLevel)),
    defaultViewChips: VIEW_CHIPS,
    defaultPinnedIds: ['smart-disputes-available', 'needs-response', 'under-review', 'closed'],
    allViewConfig: {
      filters: [{ id: 'stage', filterType: 'single-select', selectedValues: [DISPUTE_STAGE_LABELS.appeal] }],
    },
  };

  return {
    pageId: 'disputes',
    pageTitle: 'Disputes',
    noSearch: true,
    includeViewTotals: true,
    tabs: [
      ACTIVITY_TAB,
      // Active (clickable) tab with no content yet — `placeholder: true` hides
      // the table shell, `blank: true` suppresses the engine's default
      // "Add your first <thing>" placeholder copy so it renders a plain blank page.
      { tabId: 'evidence-library', label: 'Evidence library', placeholder: true, blank: true, hideViewChips: true, hideTableControls: true, hidePagination: true, hideHeaderActions: true, columns: COLUMNS, filters: [], data: [], content: createElement(EvidenceLibrary) },
    ],
  };
}

export default createDisputesConfig('manual');
