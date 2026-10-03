import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { DigitalBuildingView } from './components/views/DigitalBuildingView';
import { PropertiesView } from './components/views/PropertiesView';
import { UnitsView } from './components/views/UnitsView';
import { TenantsView } from './components/views/TenantsView';
import { LeasingView } from './components/views/LeasingView';
import { ServiceDeskView } from './components/views/ServiceDeskView';
import { WorkOrdersView } from './components/views/WorkOrdersView';
import { MaintenanceAssetsView } from './components/views/MaintenanceAssetsView';
import { ContractorsView } from './components/views/ContractorsView';
import { FinanceView } from './components/views/FinanceView';
import { UtilitiesView } from './components/views/UtilitiesView';
import { SecurityFacilitiesView } from './components/views/SecurityFacilitiesView';
import { ComplianceView } from './components/views/ComplianceView';
import { CommunicationsView } from './components/views/CommunicationsView';
import { AutomationEngineView } from './components/views/AutomationEngineView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { ReportsView } from './components/views/ReportsView';
import { AuditLogsView } from './components/views/AuditLogsView';
import { SubscriptionBillingView } from './components/views/SubscriptionBillingView';
import { SettingsView } from './components/views/SettingsView';
import { TenantPortalView } from './components/portals/TenantPortalView';
import { ContractorPortalView } from './components/portals/ContractorPortalView';
import { TechnicianView } from './components/portals/TechnicianView';
import { PlatformAdminView } from './components/portals/PlatformAdminView';
import { LandingPage } from './components/landing/LandingPage';
import { PublicPricingPage } from './components/pricing/PublicPricingPage';
import { MultiTenantSecurityConsole } from './components/security/MultiTenantSecurityConsole';
import { BillingRbacConsole } from './components/security/BillingRbacConsole';
import { DatabaseMigrationConsole } from './components/database/DatabaseMigrationConsole';
import { AutomatedTestingConsole } from './components/testing/AutomatedTestingConsole';
import { FullRegressionConsole } from './components/testing/FullRegressionConsole';
import { FinalProductionValidationConsole } from './components/testing/FinalProductionValidationConsole';
import { FinalArchitectureConsole } from './components/architecture/FinalArchitectureConsole';
import { UniversalPrintModal } from './components/printing/UniversalPrintModal';
import { FeatureGate } from './components/entitlements/FeatureGate';
import { Menu, X, ArrowLeft } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isPrintModalOpen,
    currentPrintPayload,
    closePrint,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If user requested public marketing landing page, render it standalone
  if (activeTab === 'marketingPage') {
    return <LandingPage />;
  }

  // If user requested public pricing page, render it standalone
  if (activeTab === 'pricing' || activeTab === 'publicPricing') {
    return <PublicPricingPage />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'digitalBuilding':
        return <DigitalBuildingView />;
      case 'properties':
        return <PropertiesView />;
      case 'units':
        return <UnitsView />;
      case 'tenants':
        return <TenantsView />;
      case 'leasing':
        return <LeasingView />;
      case 'serviceDesk':
        return <ServiceDeskView />;
      case 'workOrders':
        return <WorkOrdersView />;
      case 'maintenance':
      case 'assets':
        return <MaintenanceAssetsView />;
      case 'contractors':
      case 'rfq':
        return <ContractorsView />;
      case 'finance':
        return <FinanceView />;
      case 'utilities':
        return (
          <FeatureGate feature="utility_submetering" onUpgrade={() => setActiveTab('subscription')}>
            <UtilitiesView />
          </FeatureGate>
        );
      case 'facilities':
      case 'security':
        return <SecurityFacilitiesView />;
      case 'compliance':
        return (
          <FeatureGate feature="compliance_automation" onUpgrade={() => setActiveTab('subscription')}>
            <ComplianceView />
          </FeatureGate>
        );
      case 'communications':
        return <CommunicationsView />;
      case 'automation':
        return (
          <FeatureGate feature="sla_automation" onUpgrade={() => setActiveTab('subscription')}>
            <AutomationEngineView />
          </FeatureGate>
        );
      case 'aiAssistant':
        return (
          <FeatureGate feature="ai_operations_copilot" onUpgrade={() => setActiveTab('subscription')}>
            <AiAssistantView />
          </FeatureGate>
        );
      case 'reports':
        return (
          <FeatureGate feature="analytics" onUpgrade={() => setActiveTab('subscription')}>
            <ReportsView />
          </FeatureGate>
        );
      case 'auditLogs':
        return <AuditLogsView />;
      case 'subscription':
        return <SubscriptionBillingView />;
      case 'settings':
        return <SettingsView />;
      case 'tenantPortal':
        return (
          <FeatureGate feature="tenant_portal" onUpgrade={() => setActiveTab('subscription')}>
            <TenantPortalView />
          </FeatureGate>
        );
      case 'contractorPortal':
        return (
          <FeatureGate feature="contractor_portal" onUpgrade={() => setActiveTab('subscription')}>
            <ContractorPortalView />
          </FeatureGate>
        );
      case 'technicianView':
        return <TechnicianView />;
      case 'platformAdmin':
      case 'adminBilling':
      case 'billingAdmin':
        return <PlatformAdminView />;
      case 'pricing':
      case 'publicPricing':
        return <PublicPricingPage />;
      case 'tenantSecurity':
      case 'multiTenantSecurity':
        return <MultiTenantSecurityConsole />;
      case 'billingRbac':
      case 'rbac':
      case 'rbacSecurity':
        return <BillingRbacConsole />;
      case 'databaseMigration':
      case 'databaseMigrations':
      case 'dbMigration':
      case 'migrationConsole':
        return <DatabaseMigrationConsole />;
      case 'automatedTesting':
      case 'automatedTests':
      case 'testingConsole':
      case 'testSuite':
        return <AutomatedTestingConsole />;
      case 'regressionTesting':
      case 'regressionTests':
      case 'fullRegression':
      case 'platformRegression':
        return <FullRegressionConsole />;
      case 'productionValidation':
      case 'finalProductionValidation':
      case 'prodValidation':
      case 'finalValidation':
        return <FinalProductionValidationConsole />;
      case 'finalArchitecture':
      case 'architecture':
      case 'finalArchitectureConsole':
      case 'cntestatesArchitecture':
        return <FinalArchitectureConsole />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Mobile Sidebar Hamburger Bar */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg flex items-center gap-2 text-xs font-medium"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>Operations Menu</span>
        </button>

        <span className="text-xs font-semibold text-emerald-400 capitalize">
          {activeTab.replace(/([A-Z])/g, ' $1')}
        </span>
      </div>

      <div className="flex-1 flex">
        {/* Navigation Sidebar */}
        <Sidebar
          isMobileOpen={mobileMenuOpen}
          closeMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Operational Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* Universal Printing & Document Generation Engine Modal */}
      {isPrintModalOpen && currentPrintPayload && (
        <UniversalPrintModal
          payload={currentPrintPayload}
          onClose={closePrint}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
