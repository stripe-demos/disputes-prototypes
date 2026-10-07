import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BasePathContext } from '../../contexts/BasePath';
import { Sidebar } from '../../sail/Sidebar';
import { Header, SandboxBanner, SANDBOX_HEIGHT } from '../../sail/Header';
import { SetupGuide } from '../../sail';
import SidebarNav from './SidebarNav';
import HeaderNav from './HeaderNav';
import PrototypeNav from './PrototypeNav';
import BrowserWindow from './BrowserWindow';

// Pages
import Splash from './pages/Splash';
import Discovery from './pages/Discovery';
import DisputesList from './pages/DisputesList';
import DisputeDetail from './pages/DisputeDetail';
import EvidenceSubmission from './pages/EvidenceSubmission';
import Settings from './pages/Settings';
import PaymentsSettings from './pages/PaymentsSettings';
import RadarRules from './pages/RadarRules';
import RadarRuleDetail from './pages/RadarRuleDetail';

export default function Prototype1App({ basePath = '' }) {
  const location = useLocation();
  const isHomepage = location.pathname === basePath || location.pathname === basePath + '/';
  const isDiscovery = location.pathname === `${basePath}/discovery`;
  const [darkMode] = useState(false);
  const [sandboxMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  if (isHomepage) {
    return (
      <BasePathContext.Provider value={basePath}>
        <Splash basePath={basePath} />
      </BasePathContext.Provider>
    );
  }

  if (isDiscovery) {
    return (
      <BasePathContext.Provider value={basePath}>
        <div className="h-screen flex flex-col">
          <PrototypeNav />
          <div className="flex-1 min-h-0">
            <Discovery />
          </div>
        </div>
      </BasePathContext.Provider>
    );
  }

  return (
    <BasePathContext.Provider value={basePath}>
      <div className="h-screen flex flex-col">
        <PrototypeNav />
        <div className="flex-1 min-h-0">
          <div className="h-full flex flex-row bg-surface relative overflow-hidden">
            {/* Sandbox Banner */}
            {sandboxMode && <SandboxBanner />}

            {/* Sidebar */}
            <Sidebar sandboxMode={sandboxMode} contained mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
              <SidebarNav />
            </Sidebar>

            {/* Header */}
            <Header sandboxMode={sandboxMode} contained onMenuToggle={() => setMobileMenuOpen(o => !o)}>
              <HeaderNav />
            </Header>

            {/* Main Content Area - offset for sidebar and header */}
            <div className="ml-0 lg:ml-sidebar-width flex flex-col min-w-0 flex-1 relative overflow-y-auto" style={{ paddingTop: 60 + (sandboxMode ? SANDBOX_HEIGHT : 0), '--header-offset': `${60 + (sandboxMode ? SANDBOX_HEIGHT : 0)}px` }}>
              <div className="max-w-[1280px] w-full mx-auto px-5 md:px-8 pt-4 pb-4">

                {/* Content */}
                <Routes>
                  <Route path="" element={<DisputesList />} />
                  <Route path="disputes" element={<DisputesList />} />
                  <Route path="disputes/activity" element={<DisputesList />} />
                  <Route path="disputes/evidence-library" element={<DisputesList />} />
                  <Route path="disputes/:disputeId" element={<DisputeDetail />} />
                  <Route path="disputes/:disputeId/evidence" element={<EvidenceSubmission />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/payments" element={<PaymentsSettings />} />
                  <Route path="radar/rules" element={<RadarRules />} />
                  <Route path="radar/rules/:ruleId" element={<RadarRuleDetail />} />
                  <Route path="*" element={<Navigate to={basePath || "/"} replace />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Guide Floatie */}
      <SetupGuide
        visible={false}
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
    </BasePathContext.Provider>
  );
}
