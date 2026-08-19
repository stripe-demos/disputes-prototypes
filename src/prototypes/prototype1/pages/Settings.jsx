import { Link } from 'react-router-dom';
import { Icon } from '../../../icons/SailIcons';
import { useBasePath } from '../../../contexts/BasePath';

const settingsSections = [
  {
    heading: 'Personal settings',
    items: [
      {
        icon: 'person',
        title: 'Personal details',
        description: 'Contact information, password, authentication methods, and your active sessions.',
        to: null,
      },
      {
        icon: 'email',
        title: 'Communication preferences',
        description: 'Customize the emails, SMS, and push notifications you receive.',
        to: null,
      },
      {
        icon: 'api',
        title: 'Developers',
        description: 'Workbench, developer tools, and more.',
        to: null,
      },
    ],
  },
  {
    heading: 'Account settings',
    items: [
      {
        icon: 'business',
        title: 'Business',
        description: 'Account details, account health, public info, payouts, legal entity, custom domains, and more.',
        to: null,
      },
      {
        icon: 'lock',
        title: 'Team and security',
        description: 'Team members, roles, account security, authorized apps, and shared resources.',
        to: null,
      },
      {
        icon: 'website',
        title: 'Stripe profile',
        description: 'Manage how you show up to other businesses.',
        to: null,
      },
      {
        icon: 'document',
        title: 'Compliance and documents',
        description: 'PCI compliance, documents, and legacy exports.',
        to: null,
      },
      {
        icon: 'star',
        title: 'Perks',
        description: 'Discounts on tools to run your startup.',
        to: null,
      },
    ],
  },
  {
    heading: 'Product settings',
    items: [
      {
        icon: 'billing',
        title: 'Billing',
        description: 'Subscriptions, invoices, quotes, and customer portal.',
        to: null,
      },
      {
        icon: 'code',
        title: 'Sigma',
        description: 'Manage your Sigma features.',
        to: null,
      },
      {
        icon: 'platform',
        title: 'Connect',
        description: 'Manage your platform and connected accounts.',
        to: null,
      },
      {
        icon: 'payment',
        title: 'Managed Payments',
        description: "Stripe's merchant of record handles global tax, fraud, and disputes.",
        to: null,
      },
      {
        icon: 'data',
        title: 'Data Pipeline',
        description: 'Data warehouse and contact for updates on data processing.',
        to: null,
      },
      {
        icon: 'wallet',
        title: 'Payments',
        description: 'Checkout, payment methods, currency conversion, and more.',
        to: null,
      },
      {
        icon: 'link',
        title: 'Financial Connections',
        description: 'Appearance, featured institutions, optimizations, and usage details.',
        to: null,
      },
      {
        icon: 'shield',
        title: 'Radar',
        description: 'Manage fraud protection and customization capabilities for your account.',
        to: null,
      },
    ],
  },
];

const SettingsItem = ({ icon, title, description, to, basePath }) => {
  const className = "flex items-start gap-3 p-2 -m-2 rounded-lg transition-colors hover:bg-offset cursor-pointer";
  const content = (
    <>
      <div className="flex bg-offset rounded-lg size-[32px] items-center justify-center shrink-0">
        <Icon name={icon} className="size-[16px] text-brand shrink-0" />
      </div>
      <div>
        <p className="text-label-large-emphasized text-brand">{title}</p>
        <p className="text-body-small text-default">{description}</p>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={`${basePath}/${to}`} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
};

export default function Settings() {
  const basePath = useBasePath();

  return (
    <div className="">
      <div className="space-y-10">
        {settingsSections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-heading-small text-default mb-4">{section.heading}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-7">
              {section.items.map((item) => (
                <SettingsItem
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  to={item.to}
                  basePath={basePath}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
