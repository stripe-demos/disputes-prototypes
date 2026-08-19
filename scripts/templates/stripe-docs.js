function toPascal(str) {
  return str
    .split(/[-_]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

export default function generate(id, name, description) {
  const pascal = toPascal(id);
  const safeName = name.replace(/[`$\\]/g, '\\$&');
  const safeId = id.replace(/[`$\\]/g, '\\$&');
  return {
    'App.jsx': `import { Routes, Route, Navigate } from 'react-router-dom';
import { BasePathContext } from '../../contexts/BasePath';
import { DocsLayout, DocsPage, collectRoutes } from '../../docs';
import ControlPanel from './ControlPanel';
import yaml from 'js-yaml';
import sidebarYaml from './content/sidebar.yaml?raw';

const sidebarData = yaml.load(sidebarYaml);
const contentFiles = import.meta.glob('./content/*.md', { eager: true, query: '?raw', import: 'default' });
const { routes: sidebarRoutes, defaultPath } = collectRoutes(sidebarData.sections);

export default function ${pascal}App({ basePath = '' }) {
  return (
    <BasePathContext.Provider value={basePath}>
      <ControlPanel />
      <DocsLayout sections={sidebarData.sections} activeTab="Platforms and marketplaces">
        <Routes>
          {sidebarRoutes.map(({ path, content }) => {
            const raw = contentFiles[\`./content/\${content}\`];
            return raw ? <Route key={path} path={path} element={<DocsPage content={raw} />} /> : null;
          })}
          <Route path="*" element={<Navigate to={\`\${basePath}/\${defaultPath || ''}\`} replace />} />
        </Routes>
      </DocsLayout>
    </BasePathContext.Provider>
  );
}
`,
    'ControlPanel.jsx': `import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ControlPanelButton,
  ControlPanelBody,
  MARGIN,
  PANEL_WIDTH,
  InfoBanner,
  ContextDialog,
} from '../../sail/ControlPanel';
import { Icon } from '../../icons/SailIcons';

export default function ControlPanel() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [animating, setAnimating] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);

  const open = () => {
    setExpanded(true);
    requestAnimationFrame(() => setAnimating(true));
  };

  const close = () => {
    setAnimating(false);
  };

  useEffect(() => {
    if (!expanded || animating) return;
    const timer = setTimeout(() => setExpanded(false), 150);
    return () => clearTimeout(timer);
  }, [animating, expanded]);

  const bottomExpr = \`calc(var(--workbench-height, 0px) + \${MARGIN}px)\`;

  return (
    <>
      {/* Collapsed FAB */}
      <button
        onClick={open}
        className="fixed z-[100] left-3 w-10 h-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center cursor-pointer hover:bg-offset origin-bottom-left"
        style={{
          bottom: bottomExpr,
          transform: expanded ? 'scale(0)' : 'scale(1)',
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? 'none' : 'auto',
          transition: 'transform 150ms, opacity 150ms, background-color 150ms',
        }}
      >
        <Icon name="settings" size="small" className="text-icon-subdued" />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="fixed z-[100] bg-surface rounded-lg shadow-lg overflow-hidden border border-border select-none origin-bottom-left"
          style={{
            width: PANEL_WIDTH,
            left: MARGIN,
            bottom: bottomExpr,
            transform: animating ? 'scale(1)' : 'scale(0.8)',
            opacity: animating ? 1 : 0,
            transition: 'transform 150ms, opacity 150ms',
          }}
        >
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <span className="text-label-medium-emphasized text-default">
              Prototype controls
            </span>
            <button
              onClick={close}
              className="w-6 h-6 flex items-center justify-center rounded-md text-icon-default hover:bg-offset cursor-pointer transition-colors -mr-1"
            >
              <Icon name="cancel" size="xsmall" fill="currentColor" className="size-[10px]" />
            </button>
          </div>
          <ControlPanelBody minimized={false}>
            <InfoBanner />
            <ControlPanelButton onClick={() => setContextOpen(true)}>
              Show context
            </ControlPanelButton>
            <ControlPanelButton onClick={() => navigate('/')}>
              View all prototypes
            </ControlPanelButton>
          </ControlPanelBody>
        </div>
      )}

      <ContextDialog open={contextOpen} onClose={() => setContextOpen(false)} />
    </>
  );
}
`,
    'content/getting-started.md': `---
title: ${safeName}
subtitle: ${description || 'Get started with this documentation prototype.'}
---

This is a sample documentation page built with {% link %}Markdoc{% /link %}. Edit this file at \`src/prototypes/${safeId}/content/getting-started.md\` to add your own content.

{% callout %}
This prototype uses the **stripe-docs** template, which includes a docs header, sidebar navigation, table of contents, and Markdoc rendering. Sidebar navigation is defined in \`content/sidebar.yaml\`.
{% /callout %}

## Getting started {% #getting-started %}

The docs template provides several features out of the box:

- **Markdoc rendering** with support for custom tags like callouts and links
- **Sidebar navigation** driven by a YAML configuration file
- **Table of contents** automatically generated from headings with scroll-spy highlighting
- **Docs header** with search bar and navigation tabs

### Custom tags {% #custom-tags %}

You can use custom tags throughout your content. These include:

- \`{% callout %}\` for info boxes
- \`{% link %}\` for styled documentation links

### Adding pages {% #adding-pages %}

To add a new page:

1. Create a \`.md\` file in \`content/\`
2. Add \`content: your-file.md\` to a sidebar item in \`content/sidebar.yaml\`
3. That's it — routing is automatic
`,
    'content/components.md': `---
title: Component showcase
subtitle: A reference of all available Markdoc components and formatting options.
breadcrumbs:
  - label: Home
---

This page demonstrates every docs component available in the stripe-docs template.

## Headings {% #headings %}

Headings use the \`{% #anchor %}\` syntax to create linkable anchors. The table of contents on the right is auto-generated from all \`##\` and \`###\` headings on the page.

### Third-level heading {% #third-level %}

Headings up to level 3 appear in the table of contents.

## Inline formatting {% #inline-formatting %}

Standard markdown formatting works as expected:

- **Bold text** for emphasis
- *Italic text* for secondary emphasis
- \`inline code\` for code references
- [Standard links](#) for navigation

## Callouts {% #callouts %}

Use callouts to highlight important information. The \`type\` attribute controls the color and label. An optional \`title\` overrides the default label.

{% callout %}
This is a default note callout. Use it for general information and tips.
{% /callout %}

{% callout type="caution" %}
This is a caution callout. Use it when users should proceed carefully.
{% /callout %}

{% callout type="warning" %}
This is a warning callout. Use it for critical information that could cause issues.
{% /callout %}

{% callout type="private-preview" %}
This feature is in private preview. Contact us for early access.
{% /callout %}

## Links {% #links %}

The \`{% link %}\` tag renders styled documentation links: {% link %}View the full API reference{% /link %}

Standard markdown links also work: [Go to the dashboard](#).

## Code blocks {% #code-blocks %}

Fenced code blocks render with syntax highlighting:

\`\`\`bash
# Install dependencies
npm install stripe
\`\`\`

\`\`\`javascript
const stripe = require('stripe')('sk_test_...');

const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  payment_method_types: ['card'],
});

console.log(paymentIntent.client_secret);
\`\`\`

## Lists {% #lists %}

### Unordered lists

- First item in the list
- Second item with **bold text** and \`inline code\`
- Third item with a [link](#)
- Fourth item with a [link](#)

### Ordered lists

1. Create a Stripe account and get your API keys
2. Install the Stripe SDK in your project
3. Configure your server-side integration
4. Test using Stripe's test mode credentials
5. Go live by switching to production keys

## Combined usage {% #combined-usage %}

Components can be composed together naturally. For example, a typical getting started section might look like this:

{% callout %}
Before you begin, make sure you have a Stripe account and your API keys ready.
{% /callout %}

1. Install the {% link %}Stripe Node.js library{% /link %}
2. Configure your API key
3. Create your first payment

\`\`\`bash
npm install stripe
\`\`\`
`,
    'content/sidebar.yaml': `sections:
  - heading: null
    items:
      - label: Prototype overview
        content: getting-started.md
        default: true
      - label: Components
        content: components.md
        href: components
  - heading: null
    items:
      - label: Overview
      - label: Get started with Connect
        children:
          - label: How Connect works
          - label: Connect and the Accounts v2 API
          - label: SaaS platforms and marketplaces
          - label: Risk management with Connect
            children:
              - label: Understand the merchant of record
              - label: Migrate to account controller properties
              - label: Compare SaaS platform configurations for Accounts v1 and Accounts v2
              - label: Upcoming requirements updates
              - label: Onboarding Quickstart
      - label: Design your integration
        children:
          - label: Interactive platform guide
          - label: SaaS platform
            children: []
          - label: Marketplace
            children: []
      - label: Integration fundamentals
        children:
          - label: Make API calls for connected accounts
          - label: Integration recommendations
          - label: Migrate to a supported configuration
          - label: Configure the behavior of connected accounts
          - label: Use the Accounts v2 API in your existing integration
          - label: Use Accounts as customers
          - label: Listen for updates
          - label: Testing
      - label: Example integrations
        children:
          - label: Build a fully embedded Connect integration
            children: []
          - label: Charge SaaS fees to connected accounts
          - label: LEGACY ACCOUNTS V1 INTEGRATIONS
          - label: Create subscriptions using Stripe balance payments
          - label: Design an advanced integration
          - label: Build a marketplace
          - label: Build a SaaS platform
  - heading: Account management
    items:
      - label: Onboard accounts
        children:
          - label: Choose your onboarding configuration
            children: []
          - label: Service agreement types
            children: []
          - label: Networked onboarding
          - label: Migrate to Stripe
      - label: Configure account Dashboards
        children:
          - label: Get started with Connect embedded components
            children: []
          - label: Customize Connect embedded components
            children: []
          - label: Supported Connect embedded components
            children: []
          - label: Stripe Dashboard customization
          - label: Platform controls for Stripe Dashboard accounts
          - label: Express Dashboard
            children: []
      - label: Capabilities and information requirements
        children:
          - label: Account capabilities and configurations
            children: []
          - label: Required verification information
            children: []
          - label: Additional verifications
      - label: Work with connected account types
        children:
          - label: Connected account types
          - label: Dynamic payment methods
  - heading: Payment processing
    items:
      - label: Accept payments
        children:
          - label: Charges in a Connect integration
            children: []
          - label: Set statement descriptors
          - label: Set MCCs
          - label: Handle multiple currencies
            children: []
          - label: Create payment links with Connect
          - label: Use Radar with Connect
          - label: Disputes on Connect
          - label: Create subscriptions
          - label: Create invoices
          - label: Multiple payment method configurations
          - label: Embed the payment method settings component
          - label: Account balance
            children: []
      - label: Pay out to accounts
        children:
          - label: Payouts to connected accounts
          - label: Manage payout accounts for connected accounts
          - label: Manage payout schedule
          - label: Manual payouts
          - label: Payout reversals
          - label: Payout statement descriptors
          - label: Multi-currency settlement
          - label: Instant Payouts
          - label: Multiprocessor payouts for marketplaces
          - label: Cross-border payouts
          - label: Stablecoin payouts
`,
  };
}
