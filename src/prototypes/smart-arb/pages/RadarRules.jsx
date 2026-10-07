import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Chip, FilterChip, Badge, Table } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';

export const RULE_ACTION_OPTIONS = [
  { value: 'resolve_dispute', label: 'Resolve dispute' },
  { value: 'block', label: 'Block' },
  { value: 'allow', label: 'Allow' },
  { value: 'review', label: 'Request review' },
];

const STATUS_OPTIONS = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
];

const CATEGORY_OPTIONS = [
  { value: 'fraud', label: 'Fraud' },
  { value: 'risk', label: 'Risk' },
];

const RADAR_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'rules', label: 'Rules' },
  { key: 'lists', label: 'Lists' },
  { key: 'risk_controls', label: 'Risk controls' },
  { key: 'insights', label: 'Insights' },
];

export const RULES = [
  { id: 1, action: 'resolve_dispute', category: null, condition: "if :amount_in_usd: <= 44", status: 'enabled', traffic: 100, ruleId: 'ssr_0UEzns58908KAxCGmJ8itSBc', dateCreated: '2026-09-12T18:53:00' },
  { id: 2, action: 'resolve_dispute', category: null, condition: "if :card_brand: = 'visa'", status: 'enabled', traffic: 100, ruleId: 'ssr_1VFAot69019LBxDHnK9juTCd', dateCreated: '2026-09-11T14:20:00' },
  { id: 3, action: 'resolve_dispute', category: null, condition: "if :card_brand: = 'visa'", status: 'enabled', traffic: 100, ruleId: 'ssr_2WGBpu70120MCyEIoL0kvUDe', dateCreated: '2026-09-10T09:05:00' },
  { id: 4, action: 'resolve_dispute', category: null, condition: "if :card_brand: = 'visa'", status: 'enabled', traffic: 100, ruleId: 'ssr_3XHCqv81231NDzFJpM1lwVEf', dateCreated: '2026-09-09T16:41:00' },
  { id: 5, action: 'resolve_dispute', category: null, condition: "if :amount_in_usd: < 15.00", status: 'enabled', traffic: 100, ruleId: 'ssr_4YIDrw92342OEaGKqN2mxWFg', dateCreated: '2026-09-08T11:12:00' },
  { id: 6, action: 'resolve_dispute', category: null, condition: "if is_missing(:card_brand:)", status: 'disabled', traffic: 0, ruleId: 'ssr_5ZJEsx03453PFbHLrO3nyXGh', dateCreated: '2026-09-07T08:37:00' },
  { id: 7, action: 'resolve_dispute', category: null, condition: "if :currency: = 'usd' AND :network_reason_code: like '13.9'", status: 'disabled', traffic: 0, ruleId: 'ssr_6aKFty14564QGcIMsP4ozYHi', dateCreated: '2026-09-06T15:29:00' },
  { id: 8, action: 'resolve_dispute', category: null, condition: "if :network_reason_code: INCLUDES '13'", status: 'disabled', traffic: 0, ruleId: 'ssr_7bLGuz25675RHdJNtQ5pAZIj', dateCreated: '2026-09-05T10:03:00' },
  { id: 9, action: 'resolve_dispute', category: null, condition: "if :currency: = 'cad'", status: 'disabled', traffic: 0, ruleId: 'ssr_8cMHva36786SIeKOuR6qBaJk', dateCreated: '2026-09-04T13:48:00' },
  { id: 10, action: 'resolve_dispute', category: null, condition: "if :currency: = 'usd' AND :network_reason_code: IN ('13.9', '13.1')", status: 'disabled', traffic: 0, ruleId: 'ssr_9dNIwb47897TJfLPvS7rCbKl', dateCreated: '2026-09-03T17:56:00' },
  { id: 11, action: 'block', category: 'fraud', condition: "if :risk_score: > 85", status: 'enabled', traffic: 100, ruleId: 'ssr_aeOJxc58908UKgMQwT8sDcLm', dateCreated: '2026-09-02T12:24:00' },
  { id: 12, action: 'review', category: 'risk', condition: "if :risk_level: = 'elevated'", status: 'enabled', traffic: 100, ruleId: 'ssr_bfPKyd69019VLhNRxU9tEdMn', dateCreated: '2026-09-01T09:15:00' },
];

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-icon-subdued shrink-0">
      <path d="M3 5H10.5C12.4 5 14 6.6 14 8.5C14 10.4 12.4 12 10.5 12H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 2.5L3 5L5.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RadarRules() {
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [searchParams, setSearchParams] = useSearchParams();

  const actionFilter = searchParams.get('action') || '';
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';
  const hasFilters = actionFilter || statusFilter || categoryFilter;

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  };

  const filteredRules = useMemo(() => {
    return RULES.filter((r) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      return true;
    });
  }, [actionFilter, statusFilter, categoryFilter]);

  const columns = [
    {
      key: 'action',
      header: 'Action',
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <UndoIcon />
          <span className="text-body-small-emphasized text-default">
            {RULE_ACTION_OPTIONS.find((o) => o.value === r.action)?.label || r.action}
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => r.category || '—' },
    {
      key: 'condition',
      header: 'Condition',
      width: 'grow',
      render: (r) => <span className="text-body-small text-subdued">{r.condition}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'enabled' ? 'success' : 'default'}>
          {r.status === 'enabled' ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'traffic',
      header: 'Traffic allocation',
      align: 'right',
      render: (r) => `${r.traffic}%`,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-heading-xlarge text-default">Radar</h1>
        <Button variant="primary" size="md" icon="add">Add rule</Button>
      </div>

      <Tabs tabs={RADAR_TABS} activeTab="rules" onTabChange={() => {}} />

      <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
        <div className="border border-border rounded-lg p-4">
          <p className="text-body-small text-subdued">Connected account rules</p>
          <p className="text-heading-large text-default mt-1">52</p>
        </div>
        <div className="border-2 border-brand-500 rounded-lg p-4">
          <p className="text-body-small text-brand">Transaction rules</p>
          <p className="text-heading-large text-brand mt-1">130</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Chip label="Date matched" value="set" displayValue="Mar 29, 2026 → Sep 29, 2026" size="sm" renderDropdown={() => null} />
        <FilterChip
          label="Rule action"
          variant="single"
          options={RULE_ACTION_OPTIONS}
          value={actionFilter}
          onChange={(v) => setFilter('action', v)}
          size="sm"
        />
        <FilterChip
          label="Status"
          variant="single"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(v) => setFilter('status', v)}
          size="sm"
        />
        <FilterChip
          label="Category"
          variant="single"
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(v) => setFilter('category', v)}
          size="sm"
        />
        {hasFilters && (
          <button
            className="text-body-small text-brand cursor-pointer"
            onClick={() => setSearchParams({})}
          >
            Clear filters
          </button>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredRules}
        rowKey="id"
        onRowClick={(r) => navigate(`${basePath}/radar/rules/${r.id}`)}
      />

      <p className="text-body-small text-subdued mt-3">{filteredRules.length} rules</p>
    </div>
  );
}
