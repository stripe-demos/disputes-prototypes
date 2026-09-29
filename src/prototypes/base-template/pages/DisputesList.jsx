import { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Chip, FilterChip, SelectDropdown, Select, Checkbox, Table } from '../../../sail';
import useDropdownPosition from '../../../sail/useDropdownPosition';
import { CardIcon } from '../../../icons/SailCardIcons';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import {
  disputes,
  DISPUTE_REASON_LABELS,
  STATUS_FILTER_OPTIONS,
  formatCurrency,
  formatDateTime,
  getDisplayStatusBadge,
  getStatusFilterCategory,
} from '../data/disputes';

const SMART_DISPUTES_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'needs_evidence', label: 'Needs evidence' },
  { value: 'not_available', label: 'Not available' },
];

function smartDisputesBucket(d) {
  if (d.smartDisputesAvailable) return 'available';
  if (getStatusFilterCategory(d.status) === 'needs_response' && !d.evidenceSubmitted) return 'needs_evidence';
  return 'not_available';
}

function FilterByPanel({ panelRef, anchorRef, onClose, title, onApply, children }) {
  const pos = useDropdownPosition(anchorRef, panelRef, true);
  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      className="fixed z-[200] bg-surface rounded-lg border border-border p-3"
      style={{
        top: pos.top,
        left: pos.left,
        minWidth: '220px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
      }}
    >
      <p className="text-label-medium-emphasized text-default mb-2">Filter by: {title}</p>
      <div className="flex flex-col gap-2 mb-3">{children}</div>
      <Button variant="primary" className="w-full" onClick={() => { onApply(); onClose(); }}>
        Apply
      </Button>
    </div>,
    document.body
  );
}

const DUE_IN_OPTIONS = [
  { value: '1', label: 'Next day' },
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
];

const AMOUNT_OPTIONS = [
  { value: 'lt100', label: 'Less than $100' },
  { value: '100to500', label: '$100 – $500' },
  { value: '500to1000', label: '$500 – $1,000' },
  { value: 'gt1000', label: 'More than $1,000' },
];

const PAGE_SIZE = 25;

const FILTERS_STORAGE_KEY = 'disputesList.filters';

function getPersistedFilters() {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const SEGMENTS = [
  { key: 'all', label: 'All' },
  { key: 'smart_disputes', label: 'Smart Disputes available' },
  { key: 'respond_manually', label: 'Respond manually' },
  { key: 'closed', label: 'Closed' },
];

function matchesAmount(amount, bucket) {
  const dollars = amount / 100;
  switch (bucket) {
    case 'lt100': return dollars < 100;
    case '100to500': return dollars >= 100 && dollars < 500;
    case '500to1000': return dollars >= 500 && dollars < 1000;
    case 'gt1000': return dollars >= 1000;
    default: return true;
  }
}

function matchesDueIn(dispute, days) {
  if (!dispute.dueBy) return false;
  const daysUntilDue = Math.ceil((new Date(dispute.dueBy) - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilDue >= 0 && daysUntilDue <= Number(days);
}

export default function DisputesList() {
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [segment, setSegment] = useState(() => getPersistedFilters().segment ?? 'all');
  const [reasonFilter, setReasonFilter] = useState(() => getPersistedFilters().reasonFilter ?? '');
  const [reasonPending, setReasonPending] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [appliedStatusFilter, setAppliedStatusFilter] = useState(() => getPersistedFilters().appliedStatusFilter ?? []);
  const [dueInFilter, setDueInFilter] = useState(() => getPersistedFilters().dueInFilter ?? '');
  const [smartDisputesFilter, setSmartDisputesFilter] = useState(() => getPersistedFilters().smartDisputesFilter ?? []);
  const [smartDisputesPending, setSmartDisputesPending] = useState([]);
  const [amountFilter, setAmountFilter] = useState(() => getPersistedFilters().amountFilter ?? '');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(() => getPersistedFilters().page ?? 1);

  const reasonOptions = Object.entries(DISPUTE_REASON_LABELS).map(([value, label]) => ({ value, label }));

  const segmentCounts = useMemo(() => ({
    all: disputes.length,
    smart_disputes: disputes.filter((d) => d.smartDisputesAvailable).length,
    respond_manually: disputes.filter((d) => !d.smartDisputesAvailable && getStatusFilterCategory(d.status) === 'needs_response').length,
    closed: disputes.filter((d) => ['won', 'lost', 'closed'].includes(getStatusFilterCategory(d.status))).length,
  }), []);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      if (segment === 'smart_disputes' && !d.smartDisputesAvailable) return false;
      if (segment === 'respond_manually' && (d.smartDisputesAvailable || getStatusFilterCategory(d.status) !== 'needs_response')) return false;
      if (segment === 'closed' && !['won', 'lost', 'closed'].includes(getStatusFilterCategory(d.status))) return false;

      if (reasonFilter && d.reason !== reasonFilter) return false;
      if (appliedStatusFilter.length > 0 && !appliedStatusFilter.includes(getStatusFilterCategory(d.status))) return false;
      if (dueInFilter && !matchesDueIn(d, dueInFilter)) return false;
      if (smartDisputesFilter.length > 0) {
        if (!smartDisputesFilter.includes(smartDisputesBucket(d))) return false;
      }
      if (amountFilter && !matchesAmount(d.amount, amountFilter)) return false;

      return true;
    });
  }, [segment, reasonFilter, appliedStatusFilter, dueInFilter, smartDisputesFilter, amountFilter]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [segment, reasonFilter, appliedStatusFilter, dueInFilter, smartDisputesFilter, amountFilter]);

  useEffect(() => {
    sessionStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ segment, reasonFilter, appliedStatusFilter, dueInFilter, smartDisputesFilter, amountFilter, page })
    );
  }, [segment, reasonFilter, appliedStatusFilter, dueInFilter, smartDisputesFilter, amountFilter, page]);

  const totalPages = Math.max(1, Math.ceil(filteredDisputes.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedDisputes = filteredDisputes.slice(pageStart, pageStart + PAGE_SIZE);

  const allSelected = filteredDisputes.length > 0 && selectedIds.length === filteredDisputes.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filteredDisputes.map((d) => d.id));
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const columns = [
    {
      key: 'select',
      header: (
        <button
          onClick={toggleSelectAll}
          className={`w-[14px] h-[14px] border rounded-[4px] flex items-center justify-center transition-colors ${allSelected ? 'bg-brand-500 border-brand-500' : 'bg-surface border-border'}`}
          aria-label="Select all disputes"
        >
          {allSelected && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ),
      width: 'hug',
      render: (d) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectRow(d.id);
          }}
          className={`w-[14px] h-[14px] border rounded-[4px] flex items-center justify-center transition-colors ${selectedIds.includes(d.id) ? 'bg-brand-500 border-brand-500' : 'bg-surface border-border'}`}
          aria-label={`Select dispute ${d.id}`}
        >
          {selectedIds.includes(d.id) && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (d) => (
        <span className="text-body-small-emphasized text-default">
          {formatCurrency(d.amount, d.currency)} <span className="text-body-small text-subdued">{d.currency.toUpperCase()}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const badge = getDisplayStatusBadge(d);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'smartDisputesAvailable',
      header: 'Smart Disputes',
      render: (d) => (d.smartDisputesAvailable ? 'Available' : 'Not available'),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (d) => DISPUTE_REASON_LABELS[d.reason] || d.reason,
    },
    {
      key: 'customerName',
      header: 'Customer',
      width: 'grow',
      render: (d) => d.customerName || d.customerEmail,
    },
    {
      key: 'sourceType',
      header: 'Payment method',
      render: (d) => (
        <span className="inline-flex items-center gap-2">
          <CardIcon name={d.cardBrand} size="small" />
          <span className="text-body-small text-subdued">•••• •••• •••• {d.cardLast4}</span>
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Disputed on',
      render: (d) => formatDateTime(d.created),
    },
    {
      key: 'dueBy',
      header: 'Respond by',
      render: (d) => formatDateTime(d.dueBy),
    },
    {
      key: 'winLikelihood',
      header: 'Win Likelihood',
      align: 'right',
      render: () => <span className="text-subdued">-</span>,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-heading-xlarge text-default">Disputes</h1>
      </div>

      {/* Action filters */}
      <div className="flex items-start gap-2 mb-4">
        {SEGMENTS.map((s) => {
          const isSelected = segment === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={`flex-1 min-w-[80px] text-left p-[11px] rounded-md border bg-surface transition-colors cursor-pointer ${isSelected ? 'border-2 border-brand-500 p-[10px]' : 'border-border hover:bg-offset'
                }`}
            >
              <p className={`text-body-small ${isSelected ? 'text-brand' : 'text-default'}`}>{s.label}</p>
              <p className="text-body-large-emphasized text-default">{segmentCounts[s.key]}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar: filter chips + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip
            label="Reason"
            size="sm"
            value={reasonFilter}
            displayValue={reasonOptions.find((o) => o.value === reasonFilter)?.label}
            onClear={() => setReasonFilter('')}
            onOpenChange={(open) => {
              if (open) setReasonPending(reasonFilter || reasonOptions[0]?.value || '');
            }}
            renderDropdown={({ ref, anchorRef, onClose }) => (
              <FilterByPanel
                panelRef={ref}
                anchorRef={anchorRef}
                onClose={onClose}
                title="reason"
                onApply={() => setReasonFilter(reasonPending)}
              >
                <Select
                  value={reasonPending}
                  onChange={(e) => setReasonPending(e.target.value)}
                  className="w-full"
                >
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FilterByPanel>
            )}
          />

          <Chip
            label="Status"
            size="sm"
            value={appliedStatusFilter}
            displayValue={
              appliedStatusFilter.length === 1
                ? STATUS_FILTER_OPTIONS.find((o) => o.value === appliedStatusFilter[0])?.label
                : `${appliedStatusFilter.length} selected`
            }
            onClear={() => {
              setStatusFilter([]);
              setAppliedStatusFilter([]);
            }}
            onOpenChange={(open) => {
              if (open) setStatusFilter(appliedStatusFilter);
            }}
            renderDropdown={({ ref, anchorRef, onClose }) => (
              <SelectDropdown
                ref={ref}
                anchorRef={anchorRef}
                variant="multi"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                onClose={onClose}
                hideSelectAll
                showApplyButton
                onApply={() => setAppliedStatusFilter(statusFilter)}
              />
            )}
          />

          <FilterChip
            label="Due in"
            variant="single"
            options={DUE_IN_OPTIONS}
            value={dueInFilter}
            onChange={setDueInFilter}
            size="sm"
          />

          <Chip
            label="Smart Disputes"
            size="sm"
            value={smartDisputesFilter}
            displayValue={
              smartDisputesFilter.length === 1
                ? SMART_DISPUTES_OPTIONS.find((o) => o.value === smartDisputesFilter[0])?.label
                : `${smartDisputesFilter.length} selected`
            }
            onClear={() => setSmartDisputesFilter([])}
            onOpenChange={(open) => {
              if (open) setSmartDisputesPending(smartDisputesFilter);
            }}
            renderDropdown={({ ref, anchorRef, onClose }) => (
              <FilterByPanel
                panelRef={ref}
                anchorRef={anchorRef}
                onClose={onClose}
                title="smart disputes"
                onApply={() => setSmartDisputesFilter(smartDisputesPending)}
              >
                {SMART_DISPUTES_OPTIONS.map((option) => (
                  <Checkbox
                    key={option.value}
                    checked={smartDisputesPending.includes(option.value)}
                    onChange={() =>
                      setSmartDisputesPending((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((v) => v !== option.value)
                          : [...prev, option.value]
                      )
                    }
                    label={option.label}
                  />
                ))}
              </FilterByPanel>
            )}
          />

          <FilterChip
            label="Amount"
            variant="single"
            options={AMOUNT_OPTIONS}
            value={amountFilter}
            onChange={setAmountFilter}
            size="sm"
          />

          {/* Placeholder — no design available yet, not wired up */}
          <Chip label="More filters" size="sm" renderDropdown={() => null} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon="export">Export</Button>
          <Button variant="secondary" size="sm">Analyze</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={pagedDisputes}
        rowKey="id"
        onRowClick={(d) => navigate(`${basePath}/disputes/${d.id}`)}
        emptyStateTitle="No disputes"
        emptyStateDescription="Disputed payments will show up here."
      />

      {filteredDisputes.length > 0 && (
        <>
          <div className="h-16" />
          <div className="fixed bottom-0 left-0 lg:left-sidebar-width right-0 bg-surface border-t border-border z-40">
            <div className="max-w-[1280px] w-full mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
              <span className="text-body-small text-subdued">
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredDisputes.length)} of {filteredDisputes.length} results
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
