import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge, Breadcrumb, Tabs, KeyValuePair } from '../../../sail';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';
import { getAccountById, statusConfig, sharedOverviewData } from '../data/connectedAccounts';

// Page-level tab configuration
const pageTabs = [
  { key: 'activity', label: 'Overview' },
  { key: 'payments', label: 'Payments' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'customers', label: 'Customers' },
  { key: 'products', label: 'Products' },
  { key: 'payment-methods', label: 'Payment methods' },
];

// Format currency helper
const formatCurrency = (amount, options = {}) => {
  const { compact = false, currency = 'USD' } = options;
  if (compact && amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  const symbol = currency === 'EUR' ? '\u20AC' : '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format date helper
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Account logo placeholder
const AccountLogo = () => (
  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center">
    <Icon name="platform" size="small" fill="white" />
  </div>
);

// Section header for right column
const SectionHeader = ({ title, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-heading-small text-default">{title}</h3>
    {action}
  </div>
);

// Overview tab content
const OverviewContent = ({ account }) => {
  const [moneyMovementTab, setMoneyMovementTab] = useState('Financial account transactions');
  const { lifetimeVolume, capabilities, profile, metadata, verifications } = sharedOverviewData;

  const moneyMovementTabs = sharedOverviewData.moneyMovement.tabs.map((t) => ({
    key: t,
    label: t,
  }));

  return (
    <div className="flex gap-8 pb-24">
      {/* Left Column */}
      <div className="flex-1 min-w-0">
        {/* Top Stats Cards */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-offset rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-body-small text-subdued mb-1">Lifetime total volume</div>
                <div className="text-body-large-emphasized text-default">{formatCurrency(lifetimeVolume.amount, { compact: true })}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-offset rounded-lg p-4">
            <div className="text-body-small text-subdued mb-1">In transit to bank</div>
            <div className="text-body-large-emphasized text-default">$7,600.00</div>
          </div>
        </div>

        {/* Balances Section */}
        <div className="mb-8">
          <h3 className="text-heading-small text-default mb-4">Balances</h3>
          <div className="bg-offset rounded-lg h-64" />
        </div>

        {/* Money movement Section */}
        <div>
          <h3 className="text-heading-small text-default mb-4">Money movement</h3>
          <Tabs
            tabs={moneyMovementTabs}
            activeTab={moneyMovementTab}
            onTabChange={setMoneyMovementTab}
            size="md"
          >
            <div className="bg-offset rounded-lg h-80" />
          </Tabs>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-72 flex-shrink-0">
        {/* Capabilities */}
        <div className="mb-6">
          <SectionHeader
            title="Capabilities"
            action={<Button variant="secondary" size="sm">Edit</Button>}
          />
          <div className="flex items-center gap-1.5 mb-1">
            <Icon name="checkCircle" size="xsmall" fill="currentColor" className="text-icon-success" />
            <span className="text-body-small-emphasized text-default">Active</span>
          </div>
          <div className="text-body-small">
            {capabilities.items.map((item, index) => (
              <span key={item}>
                <a href="#" className="leading-5 text-subdued underline decoration-dashed hover:decoration-solid underline-offset-3">{item}</a>
                {index < capabilities.items.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="mb-6">
          <SectionHeader
            title="Profile"
            action={<Button variant="secondary" size="sm">View more</Button>}
          />
          <div className="space-y-4">
            <KeyValuePair variant="stack" label="Connected on" value={formatDate(account.connectedOn)} />
            <KeyValuePair variant="stack" label="Country" value={profile.country} />
            <KeyValuePair variant="stack" label="Email" value={account.email} />
            <KeyValuePair variant="stack" label="Website" value={profile.website} />
            <KeyValuePair variant="stack" label="Statement descriptor" value={profile.statementDescriptor} />
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6">
          <SectionHeader
            title="Metadata"
            action={<Button variant="secondary" size="sm">Edit</Button>}
          />
          <div className="space-y-3">
            <KeyValuePair variant="stack" label="Internal ID" value={metadata.internalId} />
          </div>
        </div>

        {/* Verifications */}
        <div>
          <SectionHeader
            title="Verifications"
            action={<Button variant="secondary" size="sm">View more</Button>}
          />
          <div className="space-y-3">
            <KeyValuePair variant="stack" label="Status" value={<span className="capitalize">{verifications.status}</span>} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ConnectedAccountDetail() {
  const { accountId, '*': tabPath } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const activeTab = tabPath || 'activity';

  const account = getAccountById(accountId);
  const statusInfo = statusConfig[account.status] || statusConfig.enabled;

  const handleTabChange = (tabKey) => {
    navigate(`${basePath}/connect/accounts/${accountId}/${tabKey}`);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(accountId);
  };

  return (
    <div className="relative">
      {/* Sticky header: breadcrumbs + account info + tabs */}
      <div className="sticky z-[5] -mx-1 px-1 -mt-4 pt-4 bg-surface" style={{ top: 'var(--header-offset)' }}>
        {/* Breadcrumbs */}
        <div className="mb-2">
          <Breadcrumb
            pages={[{ label: 'Connected accounts', to: `${basePath}/connect/accounts` }]}
            showCurrentPage={false}
          />
        </div>

        {/* Account Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <AccountLogo />
              <h1 className="text-heading-xlarge text-default">{account.name}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-body-small text-subdued">
              <Icon name="email" size="xsmall" fill="currentColor" />
              {account.email}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="clipboard" onClick={handleCopyId}>Copy ID</Button>
            <Button variant="secondary" icon="more" />
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          size="md"
        />
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'activity' && <OverviewContent account={account} />}
        {activeTab !== 'activity' && (
          <div className="text-subdued">
            <h2 className="text-body-large-emphasized text-default mb-2">
              {pageTabs.find((t) => t.key === activeTab)?.label || 'Unknown'}
            </h2>
            <p>This tab is not yet implemented.</p>
          </div>
        )}
      </div>
    </div>
  );
}
