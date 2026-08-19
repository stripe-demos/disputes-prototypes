import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBasePath } from '../../contexts/BasePath';
import { NavItem, SubNavItem, SectionHeading, ExpandableNavItem } from '../../sail/Sidebar';
import { ACCOUNT_NAME } from '../../sail/Header';
import { Icon } from '../../icons/SailIcons';

export default function SidebarNav() {
  const location = useLocation();
  const basePath = useBasePath();
  const [expandedSection, setExpandedSection] = useState('connect');

  const isActive = (path) => location.pathname === (path ? `${basePath}/${path}` : basePath || '/');

  return (
    <>
      {/* Account Section - Desktop (compact row) */}
      <div className="hidden lg:flex p-1.5 -mx-0.5 rounded-lg items-center border-border hover:bg-offset gap-2 duration-100">
        <img src="/rocketrides.svg" alt={ACCOUNT_NAME} className="size-[24px] rounded" />
        <span className="text-default text-label-medium-emphasized">
          {ACCOUNT_NAME}
        </span>
      </div>

      {/* Account Section - Mobile (centered) */}
      <div className="flex lg:hidden flex-col items-center gap-2 pt-2 pb-8 border-b border-border">
        <img src="/rocketrides.svg" alt={ACCOUNT_NAME} className="size-[40px] rounded-lg" />
        <span className="text-default text-heading-small">{ACCOUNT_NAME}</span>
      </div>

      {/* Main Navigation */}
      <div className="">
        <NavItem icon={<Icon name="home" size="small" fill="currentColor" />} label="Home" to="" active={isActive('')} />
        <NavItem icon={<Icon name="balance" size="small" fill="currentColor" />} label="Balances" to="balances" active={isActive('balances')} />
        <NavItem icon={<Icon name="arrowsLoop" size="small" fill="currentColor" />} label="Transactions" />
        <NavItem icon={<Icon name="person" size="small" fill="currentColor" />} label="Network" />
        <NavItem icon={<Icon name="product" size="small" fill="currentColor" />} label="Product catalog" />
      </div>

      {/* Products */}
      <div className="space-y-2">
        <SectionHeading label="Products" />
        <div className="">
          <ExpandableNavItem
            icon={<Icon name="platform" size="small" fill="currentColor" />}
            label="Connect"
            sectionId="connect"
            expandedSection={expandedSection}
            onToggle={setExpandedSection}
          >
            <SubNavItem
              label="Overview"
              to="connect"
              highlighted={isActive('connect')}
            />
            <SubNavItem
              label="Connected accounts"
              to="connect/accounts"
              highlighted={location.pathname.startsWith(basePath + '/connect/accounts')}
            />
            <SubNavItem label="Capital" />
          </ExpandableNavItem>
          <ExpandableNavItem
            icon={<Icon name="wallet" size="small" fill="currentColor" />}
            label="Payments"
            sectionId="payments"
            expandedSection={expandedSection}
            onToggle={setExpandedSection}
          >
            <SubNavItem label="Analytics" />
            <SubNavItem label="Disputes" />
            <SubNavItem label="Radar" />
            <SubNavItem label="Payment Links" />
            <SubNavItem label="Terminal" />
          </ExpandableNavItem>
          <ExpandableNavItem
            icon={<Icon name="invoice" size="small" fill="currentColor" />}
            label="Billing"
            sectionId="billing"
            expandedSection={expandedSection}
            onToggle={setExpandedSection}
          >
            <SubNavItem label="Overview" />
            <SubNavItem label="Subscriptions" />
            <SubNavItem label="Invoices" />
            <SubNavItem label="Usage-based" />
            <SubNavItem label="Revenue recovery" />
          </ExpandableNavItem>
          <ExpandableNavItem
            icon={<Icon name="barChart" size="small" fill="currentColor" />}
            label="Reporting"
            sectionId="reporting"
            expandedSection={expandedSection}
            onToggle={setExpandedSection}
          >
            <SubNavItem label="Reports" />
            <SubNavItem label="Sigma" />
            <SubNavItem label="Revenue Recognition" />
            <SubNavItem label="Data management" />
          </ExpandableNavItem>
          <NavItem icon={<Icon name="product" size="small" fill="currentColor" />} label="Components" to="components" active={isActive('components')} />
          <NavItem icon={<Icon name="barChart" size="small" fill="currentColor" />} label="Charts" to="charts" active={isActive('charts')} />
          <NavItem icon={<Icon name="more" size="small" fill="currentColor" />} label="More" />
        </div>
      </div>
    </>
  );
}
