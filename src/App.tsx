import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';
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
import { PublicLegalPage } from './components/legal/PublicLegalPage';
import { AuthView } from './components/auth/AuthView';
import { MultiTenantSecurityConsole } from './components/security/MultiTenantSecurityConsole';
import { BillingRbacConsole } from './components/security/BillingRbacConsole';
import { DatabaseMigrationConsole } from './components/database/DatabaseMigrationConsole';
import { AutomatedTestingConsole } from './components/testing/AutomatedTestingConsole';
import { FullRegressionConsole } from './components/testing/FullRegressionConsole';
import { FinalProductionValidationConsole } from './components/testing/FinalProductionValidationConsole';
import { FinalArchitectureConsole } from './components/architecture/FinalArchitectureConsole';
import { UniversalPrintModal } from './components/printing/UniversalPrintModal';
import { FeatureGate } from './components/entitlements/FeatureGate';
import { AccountSecurityPanel } from './components/security/AccountSecurityPanel';
import {
  getRoleNavigationPolicy,
  isTabAuthorizedForRole,
} from './services/rbacNavigationPolicy';
import {
  resolvePathToRoute,
  getPathForTab,
  isPublicTab,
} from './utils/appRoutes';
import { Menu, X, ShieldAlert } from 'lucide-react';
import type { UserRole } from './types';

function getDefaultWorkspaceTabForRole(role: UserRole, isPlatformAdmin: boolean): string {
  return getRoleNavigationPolicy(role, isPlatformAdmin).defaultTab;
}

const AppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isPrintModalOpen,
    currentPrintPayload,
    closePrint,
  } = useApp();

  const {
    firebaseUser,
    authReady,
    userRoleCategory,
    isPlatformAdmin,
  } = useFirebase();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAuthPlanId, setSelectedAuthPlanId] = useState<string | undefined>(undefined);
  const [intendedProtectedTab, setIntendedProtectedTab] = useState<string | null>(null);
  const [landingSection, setLandingSection] = useState<'features' | 'solutions' | 'faq' | 'contact' | undefined>(undefined);
  const [initialRouteApplied, setInitialRouteApplied] = useState(false);

  const isAuthenticated = Boolean(firebaseUser && firebaseUser.emailVerified);

  const resolveAuthorizedPostAuthTarget = (requestedTab: string | null): string => {
    const defaultTab = getDefaultWorkspaceTabForRole(userRoleCategory, isPlatformAdmin);
    if (!requestedTab || isPublicTab(requestedTab)) {
      return defaultTab;
    }
    return isTabAuthorizedForRole(requestedTab, userRoleCategory, isPlatformAdmin)
      ? requestedTab
      : defaultTab;
  };

  // 1. Hydrate active view from initial browser pathname and subscribe to browser Back/Forward (popstate)
  useEffect(() => {
    const syncFromLocation = () => {
      const resolved = resolvePathToRoute(window.location.pathname);
      setLandingSection(resolved.landingSection);
      if (!resolved.isPublic) {
        setIntendedProtectedTab(resolved.tab);
      }
      setActiveTab(resolved.tab);
      setInitialRouteApplied(true);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [setActiveTab]);

  // 2. Keep browser URL bar cleanly synchronized with activeTab & auth state
  useEffect(() => {
    if (!initialRouteApplied) return;
    if (!isAuthenticated && !isPublicTab(activeTab)) {
      if (intendedProtectedTab !== activeTab) {
        setIntendedProtectedTab(activeTab);
      }
      if (window.location.pathname !== '/signin') {
        window.history.replaceState({ tab: 'auth_signin' }, '', '/signin');
      }
      return;
    }

    const desiredPath = getPathForTab(activeTab, window.location.pathname);
    if (window.location.pathname !== desiredPath) {
      window.history.pushState({ tab: activeTab }, '', desiredPath);
    }
  }, [activeTab, isAuthenticated, initialRouteApplied, intendedProtectedTab]);

  // 3. When authenticated user is on an auth screen, redirect to their originally requested page ONLY if authorized for their role
  useEffect(() => {
    if (
      isAuthenticated &&
      (activeTab === 'auth_signin' || activeTab === 'auth_signup' || activeTab === 'auth_reset')
    ) {
      const target = resolveAuthorizedPostAuthTarget(intendedProtectedTab);
      setIntendedProtectedTab(null);
      setActiveTab(target);
    }
  }, [isAuthenticated, activeTab, intendedProtectedTab, userRoleCategory, isPlatformAdmin, setActiveTab]);

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'reset', planId?: string) => {
    setSelectedAuthPlanId(planId);
    setActiveTab(
      mode === 'signup' ? 'auth_signup' : mode === 'reset' ? 'auth_reset' : 'auth_signin'
    );
  };

  const handleEnterWorkspace = () => {
    if (isAuthenticated) {
      setActiveTab(getDefaultWorkspaceTabForRole(userRoleCategory, isPlatformAdmin));
    } else {
      handleOpenAuth('signin');
    }
  };

  // =========================================================================
  // PUBLIC ROUTES — Always accessible without requiring authentication
  // =========================================================================
  if (activeTab === 'marketingPage') {
    return (
      <LandingPage
        initialSection={landingSection}
        onOpenAuth={handleOpenAuth}
        onEnterWorkspace={handleEnterWorkspace}
      />
    );
  }

  if (activeTab === 'pricing' || activeTab === 'publicPricing') {
    return (
      <PublicPricingPage
        onSelectPlanForAuth={(planId) => handleOpenAuth('signup', planId)}
      />
    );
  }

  if (activeTab === 'terms' || activeTab === 'privacy') {
    return (
      <PublicLegalPage
        documentType={activeTab === 'privacy' ? 'privacy' : 'terms'}
        onBackToHome={() => {
          setLandingSection(undefined);
          setActiveTab('marketingPage');
        }}
        onSwitchDocument={(doc) => setActiveTab(doc)}
        onOpenPricing={() => setActiveTab('pricing')}
        onOpenAuth={(mode) => handleOpenAuth(mode)}
        onEnterWorkspace={handleEnterWorkspace}
      />
    );
  }

  if (activeTab === 'auth_signin' || activeTab === 'auth_signup' || activeTab === 'auth_reset') {
    const initialMode =
      activeTab === 'auth_signup' ? 'signup' : activeTab === 'auth_reset' ? 'reset' : 'signin';
    return (
      <AuthView
        initialMode={initialMode}
        selectedPlanId={selectedAuthPlanId}
        onModeChange={(nextMode) =>
          setActiveTab(
            nextMode === 'signup' ? 'auth_signup' : nextMode === 'reset' ? 'auth_reset' : 'auth_signin'
          )
        }
        onBackToHome={() => {
          setLandingSection(undefined);
          setActiveTab('marketingPage');
        }}
        onOpenLegal={(doc) => setActiveTab(doc)}
        onAuthenticated={() => {
          const target = resolveAuthorizedPostAuthTarget(intendedProtectedTab);
          setIntendedProtectedTab(null);
          setActiveTab(target);
        }}
      />
    );
  }

  // =========================================================================
  // PROTECTED APPLICATION ROUTES — Require verified Firebase authentication
  // =========================================================================
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthView
        initialMode="signin"
        selectedPlanId={selectedAuthPlanId}
        redirectNotice="Sign in or register an account to access protected CNTEstates workspace views."
        onModeChange={(nextMode) =>
          setActiveTab(
            nextMode === 'signup' ? 'auth_signup' : nextMode === 'reset' ? 'auth_reset' : 'auth_signin'
          )
        }
        onBackToHome={() => {
          setIntendedProtectedTab(null);
          setLandingSection(undefined);
          setActiveTab('marketingPage');
        }}
        onOpenLegal={(doc) => setActiveTab(doc)}
        onAuthenticated={() => {
          const target = resolveAuthorizedPostAuthTarget(intendedProtectedTab || activeTab);
          setIntendedProtectedTab(null);
          setActiveTab(target);
        }}
      />
    );
  }

  const navPolicy = getRoleNavigationPolicy(userRoleCategory, isPlatformAdmin);

  const renderActiveView = () => {
    // STRICT ROUTE-LEVEL RBAC GUARD: Prevent direct navigation or state manipulation
    // from bypassing role authorization boundaries.
    if (!isTabAuthorizedForRole(activeTab, userRoleCategory, isPlatformAdmin)) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <h2 className="text-base font-bold text-white">Access Restricted by Role Policy</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your verified role (<span className="text-slate-200 font-medium capitalize">{isPlatformAdmin ? 'SaaS Platform Admin' : userRoleCategory.replace(/_/g, ' ')}</span>) is not authorized to access this section. CNTEstates enforces least-privilege access control and strict account isolation across all modules.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(navPolicy.defaultTab)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
            >
              Return to Authorized Workspace
            </button>
          </div>
        </div>
      );
    }

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
      case 'accountSecurity':
        if (!navPolicy.canAccessOrgSettings) {
          return (
            <div className="p-6 max-w-5xl mx-auto">
              <AccountSecurityPanel />
            </div>
          );
        }
        return <SettingsView initialTab="account_security" />;
      case 'tenantPortal':
        if (userRoleCategory === 'tenant' || isPlatformAdmin) {
          return <TenantPortalView />;
        }
        return (
          <FeatureGate feature="tenant_portal" onUpgrade={() => setActiveTab('subscription')}>
            <TenantPortalView />
          </FeatureGate>
        );
      case 'contractorPortal':
        if (userRoleCategory === 'contractor' || isPlatformAdmin) {
          return <ContractorPortalView />;
        }
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
    <ErrorBoundary>
      <FirebaseProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
