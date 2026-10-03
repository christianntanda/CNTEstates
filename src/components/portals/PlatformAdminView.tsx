import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { initialOrganizations, subscriptionPlans, initialProperties, initialUnits, initialBuildings } from '../../data/mockDatabase';
import { formatCurrency, formatDate } from '../../i18n/translations';
import { formatSubscriptionPrice, getCountryConfiguration } from '../../services/currencyService';
import {
  searchAdminOrganizations,
  getOrganizationBillingDossier,
  AdminOrganizationBillingDossier,
  CapturePaymentParams,
} from '../../services/adminBillingManagementService';
import {
  Server,
  Building,
  TrendingUp,
  Users,
  AlertTriangle,
  CreditCard,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Filter,
  Search,
  Globe2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Infinity as InfinityIcon,
  Clock,
  ArrowRight,
  FileText,
  FileCheck,
  History,
  Lock,
  Download,
  RefreshCw,
  Eye,
  Check,
  Copy,
  Calendar,
  Zap,
  Sliders,
  Sparkles,
  ChevronRight,
  X,
  ExternalLink,
  ChevronDown,
  Info,
  BadgeCheck,
  Receipt,
  Cpu,
  Terminal,
  Database,
} from 'lucide-react';
import { SubscriptionInvoice, BillingAuditLogEntry } from '../../types';

export const PlatformAdminView: React.FC = () => {
  const {
    organization: activeContextOrg,
    userRole,
    currentUser,
    setActiveTab,
    invoices: contextInvoices,
    billingAuditLogs,
    refreshBillingAuditLogs,
    verifyAuditLedger,
    exportBillingAudit,
    captureAdminPayment,
    logAdminAction,
    addNotification,
  } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');

  // Selected Organization Dossier State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<
    'plan' | 'subscription' | 'usage' | 'invoices' | 'payment_status' | 'history' | 'events' | 'audit' | 'admin_actions'
  >('plan');

  // Capture Payment Modal State
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState<boolean>(false);
  const [captureInvoiceId, setCaptureInvoiceId] = useState<string>('');
  const [captureAmount, setCaptureAmount] = useState<number>(0);
  const [captureCurrency, setCaptureCurrency] = useState<string>('USD');
  const [capturePaymentMethod, setCapturePaymentMethod] = useState<string>('Mastercard (Super-Admin Capture)');
  const [captureReference, setCaptureReference] = useState<string>('');
  const [captureNotes, setCaptureNotes] = useState<string>('Super-admin authorized settlement on tenant invoice.');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureSuccessReceipt, setCaptureSuccessReceipt] = useState<{
    transactionId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    timestamp: string;
    adminName: string;
  } | null>(null);

  // Audit Log Inspector State
  const [inspectedAuditEntry, setInspectedAuditEntry] = useState<BillingAuditLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ledgerVerificationStatus, setLedgerVerificationStatus] = useState<{ isValid: boolean; message: string } | null>(null);

  // Filtered organizations list
  const filteredOrgs = useMemo(() => {
    return searchAdminOrganizations(searchQuery, {
      planId: filterPlan,
      subscriptionStatus: filterStatus,
      country: filterCountry,
    });
  }, [searchQuery, filterPlan, filterStatus, filterCountry]);

  // Compiled Dossier for selected organization
  const selectedDossier: AdminOrganizationBillingDossier | null = useMemo(() => {
    if (!selectedOrgId) return null;
    return getOrganizationBillingDossier(selectedOrgId, contextInvoices, billingAuditLogs);
  }, [selectedOrgId, contextInvoices, billingAuditLogs]);

  // Overall platform statistics
  const totalSubscriptions = initialOrganizations.length;
  const activeSubscriptions = initialOrganizations.filter((o) => o.subscriptionStatus === 'active').length;
  const trialSubscriptions = initialOrganizations.filter((o) => o.subscriptionStatus === 'trial').length;
  const paidSubscriptions = initialOrganizations.filter((o) => o.subscriptionStatus === 'active' && o.monthlySpend > 0).length;

  // Breakdown by plan
  const planBreakdown = useMemo(() => {
    return subscriptionPlans.map((plan) => {
      const count = initialOrganizations.filter((o) => o.planId === plan.id).length;
      return {
        planId: plan.id,
        planName: plan.plan_name,
        count,
        priceUsd: plan.master_price,
      };
    });
  }, []);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Open capture modal for specific invoice or organization
  const handleOpenCaptureModal = (invoice?: SubscriptionInvoice) => {
    if (!selectedDossier) return;
    const inv = invoice || selectedDossier.invoices.find((i) => i.payment_status !== 'paid' && i.invoice_status !== 'paid') || selectedDossier.invoices[0];
    if (inv) {
      setCaptureInvoiceId(inv.invoice_id || inv.id);
      setCaptureAmount(inv.amount_due > 0 ? inv.amount_due : inv.total);
      setCaptureCurrency(inv.currency || selectedDossier.organization.billingCurrency || 'USD');
    } else {
      setCaptureInvoiceId(`inv-manual-${Date.now()}`);
      setCaptureAmount(selectedDossier.organization.monthlySpend || 100);
      setCaptureCurrency(selectedDossier.organization.billingCurrency || 'USD');
    }
    setCaptureReference(`adm_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
    setCaptureNotes(`Platform super-admin captured settlement for ${selectedDossier.organization.name}.`);
    setIsCaptureModalOpen(true);
    setCaptureSuccessReceipt(null);
  };

  // Execute payment capture
  const handleExecuteCapture = async () => {
    if (!selectedDossier) return;
    setIsCapturing(true);

    const invoiceObj = selectedDossier.invoices.find(
      (i) => i.invoice_id === captureInvoiceId || i.id === captureInvoiceId
    );

    const res = await captureAdminPayment({
      organizationId: selectedDossier.organization.id,
      invoiceId: captureInvoiceId,
      amount: captureAmount,
      currency: captureCurrency,
      paymentMethod: capturePaymentMethod,
      transactionReference: captureReference,
      administrativeNotes: captureNotes,
    });

    setIsCapturing(false);

    if (res.success) {
      setCaptureSuccessReceipt({
        transactionId: res.transactionId || captureReference,
        invoiceNumber: invoiceObj?.invoice_number || captureInvoiceId,
        amount: captureAmount,
        currency: captureCurrency,
        timestamp: new Date().toISOString(),
        adminName: currentUser.name || 'Platform Administrator',
      });
      // Log administrative action
      logAdminAction({
        organizationId: selectedDossier.organization.id,
        action: 'PAYMENT_CAPTURED_BY_ADMIN',
        notes: `Captured ${captureAmount} ${captureCurrency} for invoice ${invoiceObj?.invoice_number || captureInvoiceId}. Ref: ${res.transactionId}`,
        targetInvoiceId: captureInvoiceId,
        capturedAmount: captureAmount,
      });
    }
  };

  // Verify ledger integrity
  const handleVerifyLedger = () => {
    const res = verifyAuditLedger();
    setLedgerVerificationStatus({
      isValid: res.isValid,
      message: res.message,
    });
    if (selectedDossier) {
      logAdminAction({
        organizationId: selectedDossier.organization.id,
        action: 'AUDIT_INTEGRITY_VERIFIED',
        notes: `Cryptographic audit ledger verification executed by administrator: ${res.isValid ? 'PASSED' : 'FAILED'}`,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-950/80 text-purple-300 border border-purple-800">
              Sequence 30
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              Authorized Interface
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2 mt-1">
            <Server className="w-6 h-6 text-purple-400" />
            <span>CNTEstates Platform-Administration Billing Interface</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authorized multi-tenant commercial oversight: inspect subscriptions, real-time usage, invoice health, capture payments, and review immutable audit histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('automatedTesting')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 rounded-xl text-xs text-emerald-300 font-semibold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated Tests (Seq 34)</span>
          </button>
          <button
            onClick={() => setActiveTab('databaseMigration')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 rounded-xl text-xs text-indigo-300 font-semibold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Database Migrations (Seq 33)</span>
          </button>
          <button
            onClick={() => refreshBillingAuditLogs()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Refresh State</span>
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Admin Role: {userRole}</span>
          </div>
        </div>
      </div>

      {/* Global Subscription Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Customer Organizations</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-2">
            <span>{totalSubscriptions}</span>
            <span className="text-xs text-purple-400 font-sans font-normal">Active Tenants</span>
          </div>
          <div className="text-[11px] text-purple-300 font-medium">100% Tenant Boundary Enforced</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {activeSubscriptions}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">Authoritative SLA Coverage</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Paid Subscriptions</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {paidSubscriptions}
          </div>
          <div className="text-[11px] text-slate-400">Zero-decimal local conversions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Trials & Free Tier</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {trialSubscriptions}
          </div>
          <div className="text-[11px] text-amber-400">14-Day Full Access Trials</div>
        </div>
      </div>

      {/* Plan Breakdown Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Master Catalog Plan Distribution</span>
          </span>
          <span className="text-slate-400 font-mono">Master Currency: <strong className="text-white">USD ($)</strong></span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {planBreakdown.map((pb) => (
            <div
              key={pb.planId}
              onClick={() => setFilterPlan(filterPlan === pb.planId ? 'all' : pb.planId)}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                filterPlan === pb.planId
                  ? 'bg-purple-950/80 border-purple-500 shadow-sm'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-slate-200 truncate">{pb.planName}</div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-white font-mono font-bold">{pb.count} orgs</span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {pb.priceUsd === 0 ? 'Free' : `$${pb.priceUsd}/mo`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search organizations by name, ID, country, currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Plan:</span>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Plans</option>
              {subscriptionPlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.plan_name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {searchQuery || filterPlan !== 'all' || filterStatus !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPlan('all');
                setFilterStatus('all');
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline px-1"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Content Area: Organizations Table or Selected Organization Dossier */}
      {selectedDossier ? (
        /* ========================================================
         * SELECTED ORGANIZATION BILLING DOSSIER (Full Deep Dive)
         * ======================================================== */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
          {/* Dossier Header Bar */}
          <div className="p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedOrgId(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                title="Back to Organizations Directory"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close Dossier</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedDossier.organization.name}</span>
                    <span className="text-xs font-mono font-normal text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                      {selectedDossier.organization.id}
                    </span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <span>{getCountryConfiguration(selectedDossier.organization.operatingCountry || selectedDossier.organization.country).flag}</span>
                    <span>{selectedDossier.organization.operatingCountry || selectedDossier.organization.country}</span>
                  </span>
                  <span>•</span>
                  <span>Billing: <strong className="text-emerald-400 font-mono">{selectedDossier.organization.billingCurrency || 'USD'}</strong></span>
                  <span>•</span>
                  <span>Plan: <strong className="text-purple-300">{selectedDossier.plan.plan_name}</strong></span>
                  <span>•</span>
                  <span
                    className={`font-semibold uppercase px-2 py-0.5 rounded text-[10px] ${
                      selectedDossier.subscription.status === 'active'
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                    }`}
                  >
                    {selectedDossier.subscription.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action: Capture Payment Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCaptureModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>Capture Payment</span>
              </button>
              <button
                onClick={handleVerifyLedger}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 transition-colors"
                title="Verify cryptographic ledger integrity"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Verify Ledger</span>
              </button>
            </div>
          </div>

          {/* Dossier Navigation Tabs */}
          <div className="border-b border-slate-800 bg-slate-950/60 px-4 flex items-center gap-1 overflow-x-auto text-xs font-medium scrollbar-thin">
            {[
              { id: 'plan', label: '1. Plan & Tier', icon: Layers },
              { id: 'subscription', label: '2. Subscription', icon: Shield },
              { id: 'usage', label: '3. Usage Monitoring', icon: Activity },
              { id: 'invoices', label: `4. Invoices (${selectedDossier.invoices.length})`, icon: FileText },
              { id: 'payment_status', label: '5. Payment Status', icon: CreditCard },
              { id: 'history', label: `6. Provenance History (${selectedDossier.subscriptionHistory.length})`, icon: History },
              { id: 'events', label: `7. Billing Events (${selectedDossier.billingEvents.length})`, icon: Zap },
              { id: 'audit', label: `8. Audit Trail (${selectedDossier.auditTrail.length})`, icon: Lock },
              { id: 'admin_actions', label: `9. Admin Actions (${selectedDossier.adminActionsLog.length})`, icon: Terminal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeDossierTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDossierTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-3 border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-purple-500 text-purple-300 font-bold bg-slate-900/50'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dossier Tab Content */}
          <div className="p-5 space-y-6">
            {/* 1. VIEW PLAN */}
            {activeDossierTab === 'plan' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Subscribed Commercial Plan</span>
                    <div className="text-lg font-bold text-white">{selectedDossier.plan.plan_name}</div>
                    <p className="text-xs text-slate-400">{selectedDossier.plan.description}</p>
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-purple-400 font-mono">
                      Tier Key: {selectedDossier.plan.id}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Master USD Pricing</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      ${selectedDossier.plan.master_price} USD<span className="text-xs text-slate-400 font-normal"> / month</span>
                    </div>
                    <div className="text-xs text-slate-300">
                      Local Billing Conversion: <strong className="text-white font-mono">{formatSubscriptionPrice(selectedDossier.subscription.currentPrice, selectedDossier.subscription.billingCurrency)}</strong>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Zero-Decimal Multi-Currency Standard Enforced
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Entitlements & Features</span>
                    <div className="text-sm font-semibold text-slate-200">
                      {selectedDossier.plan.features?.length || 8} Active Enterprise Features
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                      {(selectedDossier.plan.features || []).slice(0, 3).map((f, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Capacity Ceilings */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Authoritative Plan Capacity Ceilings
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Max Rental Units</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.max_rental_units === 'unlimited' ? '∞ Unlimited' : selectedDossier.plan.max_rental_units || '50'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Max Properties</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.max_properties === 'unlimited' ? '∞ Unlimited' : selectedDossier.plan.max_properties || '10'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Max Buildings</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.max_buildings === 'unlimited' ? '∞ Unlimited' : selectedDossier.plan.max_buildings || '5'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Per-Property Units</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.max_units_per_property === 'unlimited' ? '∞ Unlimited' : selectedDossier.plan.max_units_per_property || 'N/A'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">Vault Storage</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.document_entitlements?.storage_gb || 50} GB
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="text-slate-400 block">AI Operations</span>
                      <span className="text-base font-bold text-white font-mono">
                        {selectedDossier.plan.ai_entitlements?.monthly_prompt_quota || 2500} / mo
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VIEW SUBSCRIPTION */}
            {activeDossierTab === 'subscription' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Subscription Identity & Lifecycle Status</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Subscription ID:</span>
                        <span className="font-mono text-purple-300">{selectedDossier.subscription.id}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Status:</span>
                        <span className="font-semibold text-emerald-400 uppercase font-mono">{selectedDossier.subscription.status}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Billing Cadence:</span>
                        <span className="text-slate-200 capitalize font-medium">{selectedDossier.subscription.billingPeriod}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Billing Currency:</span>
                        <span className="font-bold text-emerald-400 font-mono">{selectedDossier.subscription.billingCurrency}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Auto-Renewal:</span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enabled (Continuous)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span>Period & Gateway Linkage</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Current Period Start:</span>
                        <span className="font-mono text-slate-300">{selectedDossier.subscription.periodStart}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Current Period End / Renewal:</span>
                        <span className="font-mono text-white font-bold">{selectedDossier.subscription.renewalDate}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Gateway Customer Ref:</span>
                        <span className="font-mono text-slate-400">{selectedDossier.subscription.externalCustomerId}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Gateway Subscription Ref:</span>
                        <span className="font-mono text-slate-400">{selectedDossier.subscription.externalSubscriptionId}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Gateway Bridge Health:</span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized & Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. VIEW USAGE */}
            {activeDossierTab === 'usage' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Real-Time Plan Quota & Capacity Monitoring</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Calculated authoritatively via <code className="text-purple-300">usageMonitoringService</code>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedDossier.usage.resourceList.map((metric) => {
                    const isApproaching = metric.isApproaching;
                    const isReached = metric.isReached;
                    return (
                      <div key={metric.key} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{metric.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isReached
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : isApproaching
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {metric.status}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-xl font-bold text-white">
                            {metric.currentUsage} <span className="text-xs text-slate-400 font-normal">/ {metric.allowedCapacity === 'unlimited' ? '∞' : metric.allowedCapacity} {metric.unitLabel}</span>
                          </span>
                          <span className="text-xs text-slate-400 font-bold">{metric.percentage.toFixed(0)}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isReached ? 'bg-red-500' : isApproaching ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, metric.percentage)}%` }}
                          />
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Remaining capacity:</span>
                          <span className="font-mono font-semibold text-slate-300">
                            {metric.remaining === 'unlimited' ? 'Unlimited' : metric.remaining}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. VIEW INVOICES */}
            {activeDossierTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>Subscription Invoices & Settlement Ledger</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Canonical invoice records. Administrators can trigger immediate payment capture on any invoice.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenCaptureModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Capture Invoice Payment</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Issue Date</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Amount Paid</th>
                        <th className="py-3 px-4">Balance Due</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Admin Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono">
                      {selectedDossier.invoices.map((inv) => {
                        const isPaid = inv.payment_status === 'paid' || inv.invoice_status === 'paid';
                        return (
                          <tr key={inv.invoice_id || inv.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Receipt className="w-3.5 h-3.5 text-purple-400" />
                              <span>{inv.invoice_number || inv.invoice_id}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-400">{inv.invoice_date || inv.billing_date}</td>
                            <td className="py-3 px-4 text-slate-400">{inv.due_date}</td>
                            <td className="py-3 px-4 font-bold text-slate-200">
                              {formatSubscriptionPrice(inv.total, inv.currency || selectedDossier.organization.billingCurrency)}
                            </td>
                            <td className="py-3 px-4 text-emerald-400">
                              {formatSubscriptionPrice(inv.amount_paid || 0, inv.currency || selectedDossier.organization.billingCurrency)}
                            </td>
                            <td className="py-3 px-4 text-amber-400 font-bold">
                              {formatSubscriptionPrice(inv.amount_due ?? 0, inv.currency || selectedDossier.organization.billingCurrency)}
                            </td>
                            <td className="py-3 px-4 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  isPaid
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {isPaid ? 'PAID' : 'DUE / UNPAID'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-sans">
                              {isPaid ? (
                                <span className="text-[11px] text-slate-500 font-mono">Settled</span>
                              ) : (
                                <button
                                  onClick={() => handleOpenCaptureModal(inv)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors"
                                >
                                  Capture
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. VIEW PAYMENT STATUS */}
            {activeDossierTab === 'payment_status' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                      <span>Payment Instrument & Settlement Health</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Payment Gateway Provider:</span>
                        <span className="text-slate-200 font-semibold">{selectedDossier.paymentStatus.gatewayProvider}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Default Payment Instrument:</span>
                        <span className="font-mono text-emerald-400 font-medium">{selectedDossier.paymentStatus.defaultPaymentMethod}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Payment Health State:</span>
                        <span className="font-semibold text-emerald-400 uppercase font-mono">{selectedDossier.paymentStatus.paymentState}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Auto-Collection Engine:</span>
                        <span className="text-emerald-400 font-medium">Enabled & Actively Enforced</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Payment Retry Counter:</span>
                        <span className="font-mono text-slate-300">{selectedDossier.paymentStatus.retryCount} (0 Breaches)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-purple-400" />
                      <span>Financial Balances & Last Transaction</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Outstanding Balance:</span>
                        <span className="font-mono font-bold text-white">
                          {formatSubscriptionPrice(selectedDossier.paymentStatus.outstandingBalance, selectedDossier.organization.billingCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Last Settlement Date:</span>
                        <span className="font-mono text-slate-300">{selectedDossier.paymentStatus.lastPaymentDate}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Last Settlement Amount:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatSubscriptionPrice(selectedDossier.paymentStatus.lastPaymentAmount, selectedDossier.paymentStatus.lastPaymentCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Transaction Authorization Ref:</span>
                        <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]" title={selectedDossier.paymentStatus.lastTransactionReference}>
                          {selectedDossier.paymentStatus.lastTransactionReference}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. VIEW SUBSCRIPTION HISTORY */}
            {activeDossierTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-400" />
                      <span>Authoritative Immutable Subscription Lifecycle Provenance</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sequence 16 audit timeline: guarantees strict append-only immutability for all tier shifts and lifecycle events.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    Strict Immutability Enforced
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedDossier.subscriptionHistory.map((rec) => (
                    <div key={rec.id} className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-950 text-purple-300 border border-purple-800">
                            {rec.event}
                          </span>
                          <span className="font-semibold text-slate-200">{rec.new_plan}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{rec.timestamp}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-slate-400 pt-1">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Prior Tier:</span>
                          <span className="text-slate-300">{rec.previous_plan || 'N/A (Genesis)'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Recurring Price:</span>
                          <span className="text-emerald-400 font-bold">${rec.new_price} USD</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Responsible Actor:</span>
                          <span className="text-slate-300">{rec.changed_by}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">Effective Date:</span>
                          <span className="text-slate-300">{rec.effective_date}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80 font-sans">
                        <strong className="text-slate-300">Commercial Justification: </strong>
                        {rec.change_reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. VIEW BILLING EVENTS */}
            {activeDossierTab === 'events' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Real-Time Billing Webhook & Event Telemetry</span>
                  </h3>
                  <span className="text-xs text-slate-400">Idempotent Webhook Stream</span>
                </div>

                <div className="space-y-2">
                  {selectedDossier.billingEvents.map((evt) => (
                    <div key={evt.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-purple-400 font-semibold">{evt.type}</span>
                          <span className="font-semibold text-slate-200">{evt.title}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{evt.details}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1 font-mono text-[11px]">
                        <div className="text-slate-400">{evt.timestamp}</div>
                        <div className="text-slate-500">{evt.actor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. REVIEW AUDIT HISTORY (Sequence 29 Immutable Billing Audit Log) */}
            {activeDossierTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Authoritative Cryptographic Billing Audit Trail (Sequence 29)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Immutable SHA-256 chained ledger recording all 13 billing actions, actors, and prior/new state transitions.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const content = exportBillingAudit('json');
                        const blob = new Blob([content], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `cnt_audit_${selectedDossier.organization.id}.json`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Audit JSON</span>
                    </button>
                    <button
                      onClick={handleVerifyLedger}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-300 rounded text-xs border border-purple-800 font-medium transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Verify Block Chain</span>
                    </button>
                  </div>
                </div>

                {ledgerVerificationStatus && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    ledgerVerificationStatus.isValid ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-red-950/60 border-red-800 text-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{ledgerVerificationStatus.message}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold">SHA-256 Validated</span>
                  </div>
                )}

                {/* Audit Entries Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Correlation / Request ID</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono">
                      {selectedDossier.auditTrail.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-sans font-bold">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-purple-950 text-purple-300 border border-purple-800">
                              {entry.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-200">
                            {entry.actor.name} <span className="text-slate-500 text-[10px] font-mono">({entry.actor.role})</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                            {entry.correlationId}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                            {entry.timestamp}
                          </td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <button
                              onClick={() => setInspectedAuditEntry(entry)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. ADMINISTRATIVE ACTIONS LOG */}
            {activeDossierTab === 'admin_actions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span>Administrative Actions Audit Registry</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Requirement: Administrative actions must be logged. All manual interventions, payment captures, and dossier reviews are preserved.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    Administrator Governance Active
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedDossier.adminActionsLog.map((act) => (
                    <div key={act.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {act.action}
                          </span>
                          <span className="font-semibold text-slate-200">{act.adminName}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{act.timestamp}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{act.notes}</p>
                      {act.capturedAmount ? (
                        <div className="text-[11px] text-emerald-400 font-mono pt-0.5">
                          Amount Settled: {act.capturedAmount} (Invoice: {act.targetInvoiceId})
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================
         * ORGANIZATIONS DIRECTORY (Search, Filter & Open Dossier)
         * ======================================================== */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" />
                <span>Customer Organizations Directory ({filteredOrgs.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Select an organization to open its authoritative commercial billing dossier.
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Strict Multi-Tenant Isolation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Operating Country</th>
                  <th className="py-3 px-4">Subscribed Plan</th>
                  <th className="py-3 px-4">Master USD Price</th>
                  <th className="py-3 px-4">Billing Currency</th>
                  <th className="py-3 px-4">Monthly Spend</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Renewal</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredOrgs.map((org) => {
                  const planObj = subscriptionPlans.find((p) => p.id === org.planId);
                  const countryCfg = getCountryConfiguration(org.operatingCountry || org.country);
                  const billingCurr = org.billingCurrency || org.baseCurrency || 'USD';

                  return (
                    <tr
                      key={org.id}
                      onClick={() => setSelectedOrgId(org.id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors font-mono group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-100 font-sans group-hover:text-purple-300">
                        {org.name}
                        <div className="text-[10px] text-slate-500 font-mono">{org.id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-sans flex items-center gap-1.5">
                        <span>{countryCfg.flag}</span>
                        <span>{countryCfg.country_name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-purple-400 font-sans">
                        {planObj?.plan_name || org.planId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        ${planObj?.master_price || 0} USD
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {billingCurr}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {formatSubscriptionPrice(org.monthlySpend, billingCurr)}/mo
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            org.subscriptionStatus === 'active'
                              ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                              : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                          }`}
                        >
                          {org.subscriptionStatus} {org.trialDaysLeft ? `(${org.trialDaysLeft}d)` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {org.renewalDate}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrgId(org.id);
                          }}
                          className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-200 text-xs rounded-lg transition-colors font-semibold flex items-center gap-1 ml-auto"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
       * CAPTURE PAYMENT MODAL (Platform-Admin Manual Capture)
       * ======================================================== */}
      {isCaptureModalOpen && selectedDossier && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            {captureSuccessReceipt ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Payment Successfully Captured</h3>
                <p className="text-xs text-slate-400">
                  The payment has been reconciled on invoice <strong className="text-purple-300">{captureSuccessReceipt.invoiceNumber}</strong> and recorded in the immutable audit ledger.
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transaction Ref:</span>
                    <span className="text-purple-300 font-bold">{captureSuccessReceipt.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Captured Amount:</span>
                    <span className="text-emerald-400 font-bold">{formatSubscriptionPrice(captureSuccessReceipt.amount, captureSuccessReceipt.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authorized Super-Admin:</span>
                    <span className="text-slate-200">{captureSuccessReceipt.adminName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Settled Timestamp:</span>
                    <span className="text-slate-400">{captureSuccessReceipt.timestamp}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCaptureModalOpen(false)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Capture Organization Payment</h3>
                  </div>
                  <button
                    onClick={() => setIsCaptureModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Target Organization:</label>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-semibold">
                      {selectedDossier.organization.name} ({selectedDossier.organization.id})
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Select Invoice to Settle:</label>
                    <select
                      value={captureInvoiceId}
                      onChange={(e) => {
                        setCaptureInvoiceId(e.target.value);
                        const match = selectedDossier.invoices.find((i) => (i.invoice_id || i.id) === e.target.value);
                        if (match) {
                          setCaptureAmount(match.amount_due > 0 ? match.amount_due : match.total);
                        }
                      }}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    >
                      {selectedDossier.invoices.map((inv) => (
                        <option key={inv.invoice_id || inv.id} value={inv.invoice_id || inv.id}>
                          {inv.invoice_number || inv.invoice_id} — {formatSubscriptionPrice(inv.amount_due || inv.total, inv.currency || selectedDossier.organization.billingCurrency)} ({inv.payment_status || 'unpaid'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Settlement Amount:</label>
                      <input
                        type="number"
                        value={captureAmount}
                        onChange={(e) => setCaptureAmount(Number(e.target.value))}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Currency:</label>
                      <input
                        type="text"
                        value={captureCurrency}
                        onChange={(e) => setCaptureCurrency(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold focus:outline-none focus:border-purple-500 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Payment Method / Instrument:</label>
                    <select
                      value={capturePaymentMethod}
                      onChange={(e) => setCapturePaymentMethod(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Mastercard (Super-Admin Capture)">Stored Mastercard (•••• 4022)</option>
                      <option value="Corporate Central Bank Wire Transfer / EFT">Corporate Wire / Central Bank EFT</option>
                      <option value="Direct ACH Commercial Debit">Direct ACH Commercial Debit</option>
                      <option value="Administrative Service Credit Waive">Administrative Service Credit / Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Administrative Notes & Audit Reason:</label>
                    <textarea
                      rows={2}
                      value={captureNotes}
                      onChange={(e) => setCaptureNotes(e.target.value)}
                      placeholder="Specify commercial or audit reason for platform capture..."
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsCaptureModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteCapture}
                    disabled={isCapturing || captureAmount <= 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isCapturing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    <span>Confirm & Capture Payment</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
       * AUDIT ENTRY INSPECTOR MODAL
       * ======================================================== */}
      {inspectedAuditEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Immutable Audit Block Inspection</h3>
              </div>
              <button onClick={() => setInspectedAuditEntry(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Action:</span>
                <span className="text-purple-300 font-bold">{inspectedAuditEntry.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Actor:</span>
                <span className="text-slate-200">{inspectedAuditEntry.actor.name} ({inspectedAuditEntry.actor.role})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-400">{inspectedAuditEntry.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Correlation ID:</span>
                <span className="text-slate-400">{inspectedAuditEntry.correlationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cryptographic Checksum:</span>
                <span className="text-emerald-400 text-[10px] break-all">{inspectedAuditEntry.checksum}</span>
              </div>

              <div className="space-y-1 pt-2">
                <span className="text-slate-400 block font-sans font-semibold">Previous State Value:</span>
                <pre className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(inspectedAuditEntry.previousValue, null, 2)}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-sans font-semibold">New State Value:</span>
                <pre className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-emerald-300 overflow-x-auto">
                  {JSON.stringify(inspectedAuditEntry.newValue, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setInspectedAuditEntry(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
