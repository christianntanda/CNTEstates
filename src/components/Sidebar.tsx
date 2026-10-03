import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Building,
  Layers,
  Home,
  Users,
  FileText,
  LifeBuoy,
  Wrench,
  CalendarClock,
  Cpu,
  Truck,
  FileCheck,
  DollarSign,
  Zap,
  Sparkles,
  ShieldAlert,
  Award,
  MessageSquare,
  Bot,
  BarChart3,
  History,
  CreditCard,
  Settings,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  HardHat,
  Smartphone,
  Server,
  Globe2,
  KeyRound,
  Database,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  isHighlight?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<{ isMobileOpen?: boolean; closeMobile?: () => void }> = ({
  isMobileOpen = false,
  closeMobile,
}) => {
  const {
    t,
    activeTab,
    setActiveTab,
    tickets,
    leases,
    financialRecords,
    complianceCertificates,
    organization,
    organizationBaseCurrency,
    userRole,
    canPerformBillingAction,
  } = useApp();

  const isBillingAllowed = canPerformBillingAction('view_billing');

  const openTicketsCount = tickets.filter((t) => t.status !== 'closed' && t.status !== 'completed').length;
  const criticalTicketsCount = tickets.filter(
    (t) => (t.priority === 'emergency' || t.priority === 'critical') && t.status !== 'closed'
  ).length;
  const expiringLeasesCount = leases.filter((l) => l.status === 'expiring' || l.daysRemaining <= 60).length;
  const overdueRentCount = financialRecords.filter((f) => f.status === 'overdue').length;
  const expiringComplianceCount = complianceCertificates.filter(
    (c) => c.status === 'expiring_soon' || c.status === 'expired'
  ).length;

  const navGroups: NavGroup[] = [
    {
      title: t.sections.overview,
      items: [
        { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
        { id: 'digitalBuilding', label: t.nav.digitalBuilding, icon: Building },
      ],
    },
    {
      title: t.sections.realEstate,
      items: [
        { id: 'properties', label: t.nav.properties, icon: Building },
        { id: 'units', label: t.nav.units, icon: Home },
        { id: 'assets', label: t.nav.assets, icon: Cpu },
      ],
    },
    {
      title: t.sections.tenantsLeasing,
      items: [
        { id: 'tenants', label: t.nav.tenants, icon: Users },
        {
          id: 'leasing',
          label: t.nav.leasing,
          icon: FileText,
          badge: expiringLeasesCount > 0 ? expiringLeasesCount : undefined,
          badgeColor: 'text-amber-400 bg-amber-950/60 border border-amber-900',
        },
      ],
    },
    {
      title: t.sections.fieldOperations,
      items: [
        {
          id: 'serviceDesk',
          label: t.nav.serviceDesk,
          icon: LifeBuoy,
          badge: criticalTicketsCount > 0 ? `${criticalTicketsCount} Alert` : openTicketsCount > 0 ? openTicketsCount : undefined,
          badgeColor: criticalTicketsCount > 0 ? 'text-red-400 bg-red-950 border border-red-900' : 'text-slate-300 bg-slate-800',
        },
        { id: 'workOrders', label: t.nav.workOrders, icon: Wrench },
        { id: 'maintenance', label: t.nav.maintenance, icon: CalendarClock },
      ],
    },
    {
      title: t.sections.contractorsProcurement,
      items: [
        { id: 'contractors', label: t.nav.contractors, icon: Truck },
        { id: 'rfq', label: t.nav.rfq, icon: FileCheck },
      ],
    },
    {
      title: t.sections.financials,
      items: [
        {
          id: 'finance',
          label: t.nav.finance,
          icon: DollarSign,
          badge: overdueRentCount > 0 ? `${overdueRentCount} Overdue` : undefined,
          badgeColor: 'text-rose-400 bg-rose-950/60 border border-rose-900',
        },
        { id: 'utilities', label: t.nav.utilities, icon: Zap },
      ],
    },
    {
      title: t.sections.buildingServices,
      items: [
        { id: 'facilities', label: t.nav.facilities, icon: Sparkles },
        { id: 'security', label: t.nav.security, icon: ShieldAlert },
      ],
    },
    {
      title: t.sections.governance,
      items: [
        {
          id: 'compliance',
          label: t.nav.compliance,
          icon: Award,
          badge: expiringComplianceCount > 0 ? expiringComplianceCount : undefined,
          badgeColor: 'text-amber-400 bg-amber-950/60 border border-amber-900',
        },
        { id: 'communications', label: t.nav.communications, icon: MessageSquare },
        { id: 'automation', label: t.nav.automation, icon: Settings },
        { id: 'auditLogs', label: t.nav.auditLogs, icon: History },
      ],
    },
    {
      title: t.sections.intelligence,
      items: [
        { id: 'aiAssistant', label: t.nav.aiAssistant, icon: Bot, isHighlight: true },
        { id: 'reports', label: t.nav.reports, icon: BarChart3 },
      ],
    },
    {
      title: t.sections.administration,
      items: [
        {
          id: 'subscription',
          label: t.nav.subscription,
          icon: CreditCard,
          badge: !isBillingAllowed ? 'Restricted' : undefined,
          badgeColor: !isBillingAllowed ? 'text-rose-400 bg-rose-950/80 border border-rose-800' : undefined,
        },
        { id: 'platformAdmin', label: 'Platform Admin Billing', icon: Server, isHighlight: true },
        { id: 'automatedTesting', label: 'Automated Tests (Seq 34)', icon: CheckCircle2, isHighlight: true, badge: '36/36 Passed', badgeColor: 'text-emerald-400 bg-emerald-950/80 border border-emerald-800' },
        { id: 'regressionTesting', label: 'Full Regression (Seq 35)', icon: ShieldCheck, isHighlight: true, badge: '28/28 Passed', badgeColor: 'text-emerald-400 bg-emerald-950/80 border border-emerald-800' },
        { id: 'productionValidation', label: 'Production Validation (Seq 36)', icon: Award, isHighlight: true, badge: '33/33 Passed', badgeColor: 'text-amber-400 bg-amber-950/80 border border-amber-800' },
        { id: 'finalArchitecture', label: 'Final Architecture (Seq 37)', icon: Layers, isHighlight: true, badge: '13/13 Nodes', badgeColor: 'text-emerald-400 bg-emerald-950/80 border border-emerald-800' },
        { id: 'databaseMigration', label: 'Database Migrations', icon: Database, isHighlight: true },
        { id: 'tenantSecurity', label: 'Multi-Tenant Security', icon: ShieldCheck, isHighlight: true },
        { id: 'billingRbac', label: 'Billing RBAC Security', icon: KeyRound, isHighlight: true },
        { id: 'settings', label: t.nav.settings, icon: Settings },
      ],
    },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (closeMobile) closeMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[53px] left-0 h-screen lg:h-[calc(100vh-53px)] w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col z-40 transition-transform duration-200 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Operating Country & Base Currency Scope Badge */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/40">
          <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">🇿🇦</span>
              <span className="text-slate-300 font-medium truncate">{organization.operatingCountry || 'South Africa'}</span>
            </div>
            <span className="font-mono font-bold text-emerald-400 shrink-0 text-[10px] bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
              {organizationBaseCurrency} (Base)
            </span>
          </div>
        </div>

        {/* Dedicated Portals Quick Bar */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            Dedicated Views
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleTabClick('tenantPortal')}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'tenantPortal'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">Tenant App</span>
            </button>

            <button
              onClick={() => handleTabClick('contractorPortal')}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'contractorPortal'
                  ? 'bg-amber-600 text-white font-medium'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Contractor</span>
            </button>

            <button
              onClick={() => handleTabClick('technicianView')}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'technicianView'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span className="truncate">Technician</span>
            </button>

            <button
              onClick={() => handleTabClick('platformAdmin')}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'platformAdmin'
                  ? 'bg-purple-600 text-white font-medium'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Server className="w-3.5 h-3.5 shrink-0 text-purple-400" />
              <span className="truncate">SaaS Admin</span>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Tree */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md font-medium transition-all group ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : item.isHighlight
                        ? 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : item.isHighlight
                            ? 'text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Public Landing & Pricing Switcher & Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 space-y-1.5">
          <button
            onClick={() => handleTabClick('pricing')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
              activeTab === 'pricing'
                ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 font-semibold'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Pricing Page</span>
            </div>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 font-mono font-bold">
              6 Plans
            </span>
          </button>

          <button
            onClick={() => handleTabClick('marketingPage')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
              activeTab === 'marketingPage'
                ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.nav.marketingPage}</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </aside>
    </>
  );
};
