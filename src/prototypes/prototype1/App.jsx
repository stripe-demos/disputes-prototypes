import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BasePathContext } from '../../contexts/BasePath';
import { Sidebar } from '../../sail/Sidebar';
import { Header, SandboxBanner, SANDBOX_HEIGHT } from '../../sail/Header';
import { Workbench, WORKBENCH_BAR_HEIGHT, SetupGuide } from '../../sail';
import ControlPanel from './ControlPanel';
import SidebarNav from './SidebarNav';
import HeaderNav from './HeaderNav';

// Pages
import Home from './pages/Home';
import Balances from './pages/Balances';
import ConnectOverview from './pages/ConnectOverview';
import ConnectedAccounts from './pages/ConnectedAccounts';
import ConnectedAccountDetail from './pages/ConnectedAccountDetail';
import Settings from './pages/Settings';
import Components from './pages/Components';
import Charts from './pages/Charts';

export default function Prototype1App({ basePath = '' }) {
  const location = useLocation();
  const isHomepage = location.pathname === basePath || location.pathname === basePath + '/';
  const [darkMode, setDarkMode] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFloatie, setShowFloatie] = useState(true);
  const [setupSections, setSetupSections] = useState([
    {
      id: 'get-started',
      title: 'Get started',
      items: [
        { id: 'create-account', label: 'Create your account', complete: true },
        { id: 'verify-email', label: 'Verify your email', complete: false },
        { id: 'add-business-details', label: 'Add business details', complete: false },
      ],
    },
    {
      id: 'set-up-payments',
      title: 'Set up payments',
      items: [
        { id: 'add-bank-account', label: 'Add a bank account', complete: false },
        { id: 'create-first-product', label: 'Create your first product', complete: false },
      ],
    },
    {
      id: 'go-live',
      title: 'Go live',
      locked: true,
      items: [
        { id: 'review-checklist', label: 'Review go-live checklist', complete: false },
        { id: 'activate-account', label: 'Activate your account', complete: false },
      ],
    },
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    return () => document.documentElement.classList.remove('dark');
  }, [darkMode]);

  return (
    <BasePathContext.Provider value={basePath}>
      <div className="min-h-screen bg-surface">
        <ControlPanel
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          sandboxMode={sandboxMode}
          onToggleSandboxMode={() => setSandboxMode(!sandboxMode)}
          showFloatie={showFloatie}
          onToggleFloatie={() => setShowFloatie(!showFloatie)}
        />

        <div className="flex flex-col min-h-screen">
          <div className="flex flex-row flex-1 bg-surface">
            {/* Sandbox Banner */}
            {sandboxMode && <SandboxBanner />}

            {/* Sidebar */}
            <Sidebar sandboxMode={sandboxMode} mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <SidebarNav />
            </Sidebar>

            {/* Header - fixed */}
            <Header sandboxMode={sandboxMode} onMenuToggle={() => setMobileMenuOpen(o => !o)}>
              <HeaderNav />
            </Header>

            {/* Main Content Area - offset for fixed sidebar and header */}
            <div className="ml-0 lg:ml-sidebar-width flex flex-col min-w-0 flex-1 relative" style={{ paddingTop: 60 + (sandboxMode ? SANDBOX_HEIGHT : 0), '--header-offset': `${60 + (sandboxMode ? SANDBOX_HEIGHT : 0)}px` }}>
              <div className="max-w-[1280px] w-full mx-auto px-5 md:px-8 pt-4" style={{ paddingBottom: WORKBENCH_BAR_HEIGHT + 16 }}>

                {/* Content */}
                <Routes>
                  <Route path="" element={<Home />} />
                  <Route path="balances" element={<Balances />} />
                  <Route path="connect" element={<ConnectOverview />} />
                  <Route path="connect/accounts" element={<ConnectedAccounts />} />
                  <Route path="connect/accounts/:accountId/*" element={<ConnectedAccountDetail />} />
                  <Route path="components" element={<Components />} />
                  <Route path="charts" element={<Charts />} />
                  <Route path="settings/*" element={<Settings />} />
                  <Route path="*" element={<Navigate to={basePath || "/"} replace />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Guide Floatie */}
        <SetupGuide
          visible={showFloatie && isHomepage}
          sections={setupSections}
          intro={{
            heading: 'Welcome ',
            body: "You can edit this text in App.jsx. Hide by removing the intro prop from the SetupGuide component.",
          }}
          onItemClick={(itemId, sectionId) => {
            setSetupSections((prev) =>
              prev.map((section) => {
                if (section.id !== sectionId) return section;
                return {
                  ...section,
                  items: section.items.map((item) =>
                    item.id === itemId ? { ...item, complete: !item.complete } : item
                  ),
                };
              })
            );
          }}
        />

        {/* Workbench */}
        <Workbench
          maxHeight={window.innerHeight - (sandboxMode ? SANDBOX_HEIGHT : 0)}
          tabs={[
            { key: 'overview', label: 'Overview' },
            { key: 'webhooks', label: 'Webhooks' },
            { key: 'events', label: 'Events' },
            { key: 'logs', label: 'Logs' },
            { key: 'health', label: 'Health' },
            { key: 'inspector', label: 'Inspector' },
            { key: 'shell', label: 'Shell' },
          ]}
        />
      </div>
    </BasePathContext.Provider>
  );
}
