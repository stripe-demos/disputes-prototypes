// Mock connected accounts data

export const connectedAccounts = [
  { id: 'acct_28DT589O8KAxCGbLmxyZ', name: 'Gleason Group', status: 'rejected', email: 'hello@gleasongroup.example.com', paymentBalance: 5502.00, volume: 92877.54, connectedOn: '2024-11-23' },
  { id: 'acct_3Fk9L2mNpQrS7TuVwXyA', name: 'Torp Group', status: 'enabled', email: 'hello@torpgroup.example.com', paymentBalance: 380.00, volume: 68773.12, connectedOn: '2024-11-23' },
  { id: 'acct_4Gl0M3nOpRsT8UvWxYzB', name: 'Lynch Inc', status: 'restricted', email: 'hello@lynchinc.example.com', paymentBalance: 933.00, volume: 5459.23, connectedOn: '2024-11-23' },
  { id: 'acct_5Hm1N4oPqStU9VwXyZaC', name: 'Conroy - Hammes', status: 'restricted_soon', email: 'hello@conroyhammes.example.com', paymentBalance: 168.00, volume: 15489.42, connectedOn: '2024-11-19' },
  { id: 'acct_6In2O5pQrTuV0WxYzAbD', name: 'Stehr LLC', status: 'in_review', email: 'hello@stehrllc.example.com', paymentBalance: 348.00, volume: 41562.98, connectedOn: '2024-11-19' },
  { id: 'acct_7Jo3P6qRsTuV1XyZaBcE', name: 'Larkin and Sons', status: 'in_review', email: 'hello@larkinandsons.example.com', paymentBalance: 988.00, volume: 80568.87, connectedOn: '2024-11-18' },
  { id: 'acct_8Kp4Q7rStUvW2YzAbCdF', name: 'Fadel - Mertz', status: 'rejected', email: 'hello@fadelmertz.example.com', paymentBalance: 8660.00, volume: 20643.30, connectedOn: '2024-11-17' },
  { id: 'acct_9Lq5R8sTuVwX3ZaBcDeG', name: 'Gleason Group', status: 'enabled', email: 'hello@gleasongroup2.example.com', paymentBalance: 47.00, volume: 34569.09, connectedOn: '2024-11-15' },
  { id: 'acct_0Mr6S9tUvWxY4AbCdEfH', name: 'Kutch Group', status: 'restricted_soon', email: 'hello@kutchgroup.example.com', paymentBalance: 748.00, volume: 6498.35, connectedOn: '2024-11-15' },
  { id: 'acct_1Ns7T0uVwXyZ5BcDeFgI', name: 'Hettinger Group', status: 'enabled', email: 'hello@hettingergroup.example.com', paymentBalance: 6452.00, volume: 49435.12, connectedOn: '2024-11-15' },
  { id: 'acct_2Ot8U1vWxYzA6CdEfGhJ', name: 'Rath - Thompson', status: 'restricted_soon', email: 'hello@raththompson.example.com', paymentBalance: 45.00, volume: 8587.32, connectedOn: '2024-11-14' },
  { id: 'acct_3Pu9V2wXyZaB7DeFgHiK', name: 'Kilback LLC', status: 'restricted', email: 'hello@kilbackllc.example.com', paymentBalance: 474.00, volume: 62565.12, connectedOn: '2024-11-10' },
  { id: 'acct_4Qv0W3xYzAbC8EfGhIjL', name: 'Stoltenberg Inc', status: 'enabled', email: 'hello@stoltenberginc.example.com', paymentBalance: 1320.00, volume: 40521.20, connectedOn: '2024-11-10' },
  { id: 'acct_5Rw1X4yZaBcD9FgHiJkM', name: 'Effertz and Sons', status: 'restricted', email: 'hello@effertzandsons.example.com', paymentBalance: 335.00, volume: 9650.36, connectedOn: '2024-11-06' },
  { id: 'acct_6Sx2Y5zAbCdE0GhIjKlN', name: 'Pfeffer and Sons', status: 'in_review', email: 'hello@pfefferandsons.example.com', paymentBalance: 3930.00, volume: 94669.65, connectedOn: '2024-11-03' },
  { id: 'acct_7Ty3Z6aBcDeF1HiJkLmO', name: 'Hintz and Sons', status: 'enabled', email: 'hello@hintzandsons.example.com', paymentBalance: 385.00, volume: 3639.36, connectedOn: '2024-10-28' },
];

// Lookup map by account ID
const accountsById = connectedAccounts.reduce((acc, account) => {
  acc[account.id] = account;
  return acc;
}, {});

// Status counts for tabs
export const statusCounts = {
  all: 15586,
  restricted: 624,
  restricted_soon: 895,
  in_review: 795,
  rejected: 530,
  enabled: 13586,
};

// Status badge configuration
export const statusConfig = {
  rejected: { label: 'Rejected', variant: 'danger' },
  enabled: { label: 'Enabled', variant: 'success' },
  restricted: { label: 'Restricted', variant: 'danger' },
  restricted_soon: { label: 'Restricted soon', variant: 'warning' },
  in_review: { label: 'In review', variant: 'info' },
};

// Helper to get account by ID with fallback
export const getAccountById = (accountId) => {
  return accountsById[accountId] || {
    id: accountId,
    name: 'Unknown Account',
    status: 'enabled',
    email: 'unknown@example.com',
    paymentBalance: 0,
    volume: 0,
    connectedOn: new Date().toISOString().split('T')[0],
  };
};

// Shared overview data for the account detail page
export const sharedOverviewData = {
  balances: {
    total: 49433.22,
    incomingEarnings: {
      amount: 4321.11,
      availableInstantly: 2422.11,
      currencies: 3,
      chartData: [85, 55],
    },
    heldInReserve: {
      amount: 321.89,
      currencies: 1,
    },
  },
  financialAccounts: {
    active: 2,
    total: 8,
    currencies: 3,
    totalBalance: 45098.22,
  },
  moneyMovement: {
    tabs: ['Payments', 'Transfers', 'Payouts', 'Collected fees', 'Financial account transactions'],
  },
  lifetimeVolume: { amount: 1400000 },
  autoTransfers: [
    { id: 'at_1', amount: 1482.33, currency: 'USD', sourceBucket: 'Main', destination: 'Wells Fargo' },
    { id: 'at_2', amount: 2333.58, currency: 'EUR', sourceBucket: 'Main', destination: 'HSBC' },
  ],
  capabilities: {
    status: 'active',
    items: ['Card payments', 'Crypto payments', 'Crypto transfers'],
  },
  profile: {
    country: 'United States',
    countryCode: 'US',
    website: 'toyboxlabs.com',
    statementDescriptor: 'TBOX',
  },
  metadata: { internalId: '184098480804' },
  verifications: { status: 'verified' },
};
