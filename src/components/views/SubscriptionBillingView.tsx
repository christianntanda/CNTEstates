import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatSubscriptionPrice,
  convertSubscriptionPrice,
  getCountryConfiguration,
  formatPreciseCurrency,
} from '../../services/currencyService';
import { formatDate } from '../../i18n/translations';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Shield,
  Download,
  AlertCircle,
  Globe2,
  DollarSign,
  ArrowRightLeft,
  Building,
  Printer,
  Clock,
  Layers,
  Info,
  Check,
  RefreshCw,
  Sliders,
  Calendar,
  CalendarRange,
  Lock,
  KeyRound,
  Bot,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  SubscriptionInvoice,
  BillingPeriod,
  CustomBillingSchedule,
  BillingPeriodDefinition,
} from '../../types';
import {
  calculatePlanPriceForPeriod,
  calculatePeriodDates,
  getAllBillingPeriods,
  getBillingPeriod,
  formatBillingCadenceLabel,
} from '../../services/billingPeriodService';
import { AUTHORITATIVE_CAPACITY_LIMITS } from '../../services/capacityEngine';
import { UsageMonitoringDashboard } from '../usage/UsageMonitoringDashboard';
import { FeatureEntitlementDashboard } from '../entitlements/FeatureEntitlementDashboard';
import { FeatureAccessControlConsole } from '../entitlements/FeatureAccessControlConsole';
import { UpgradeEngineConsole } from '../upgrades/UpgradeEngineConsole';
import { UpgradeFlowModal } from '../upgrades/UpgradeFlowModal';
import { InvoiceEngineConsole } from '../invoices/InvoiceEngineConsole';
import { SubscriptionHistoryConsole } from '../history/SubscriptionHistoryConsole';
import { UsdMasterPricingBanner } from '../pricing/UsdMasterPricingBanner';
import { OperatingCountryConsole } from '../country/OperatingCountryConsole';
import { ExchangeRateConversionConsole } from '../pricing/ExchangeRateConversionConsole';
import { ZeroDecimalDisplayConsole } from '../pricing/ZeroDecimalDisplayConsole';
import { PaymentProviderConsole } from '../pricing/PaymentProviderConsole';
import { OrganizationBillingDashboard } from '../billing/OrganizationBillingDashboard';
import { PlanComparisonMatrix } from '../pricing/PlanComparisonMatrix';
import { BillingNotificationsConsole } from '../billing/BillingNotificationsConsole';
import { MultiTenantSecurityConsole } from '../security/MultiTenantSecurityConsole';
import { BillingRbacConsole } from '../security/BillingRbacConsole';
import { BillingAuditLogConsole } from '../billing/BillingAuditLogConsole';
import {
  canViewBilling,
  canViewInvoices,
  canChangePlans,
  canUpgrade,
  canDowngrade,
  canCancel,
  canReactivate,
  canChangeBillingInfo,
  AUTHORITATIVE_ROLE_POLICIES,
  getPermissionDenialExplanation,
} from '../../services/billingRbacEngine';
import { UserRole } from '../../types';

export const SubscriptionBillingView: React.FC = () => {
  const {
    userRole,
    setUserRole,
    organization,
    subscriptionPlans,
    activeSubscription,
    subscriptionHistory,
    properties,
    units,
    capacityUsage,
    usageMonitoring,
    simulateUsageScenario,
    currentSimulation,
    changeSubscriptionPlan,
    cancelSubscription,
    reactivateSubscription,
    executeSubscriptionLifecycle,
    updateOrganizationBillingCurrency,
    updateOrganizationCountry,
    countryConfig,
    customExchangeRates,
    exchangeRateUnavailable,
    setExchangeRateUnavailable,
    openPrint,
    setActiveTab,
    aiBillingAuthRequests,
    t,
    language,
  } = useApp();

  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>(() => {
    return activeSubscription.billing_period || 'monthly';
  });
  const [customSchedule, setCustomSchedule] = useState<CustomBillingSchedule>(() => {
    return (
      activeSubscription.custom_schedule || {
        cadenceType: 'multi_year',
        intervalUnit: 'years',
        intervalCount: 3,
        description: 'Multi-Year Enterprise Master Services Agreement (Net 30)',
        paymentTermsDays: 30,
      }
    );
  });
  const registeredPeriods = getAllBillingPeriods();
  const [selectedPlanId, setSelectedPlanId] = useState(organization.planId);
  const [upgradeModalPlanId, setUpgradeModalPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';
  const operatingCountryName = organization.operatingCountry || organization.country || 'South Africa';

  const currentPlan = subscriptionPlans.find((p) => p.id === organization.planId) || subscriptionPlans[2];
  const activeMasterPrice = calculatePlanPriceForPeriod(
    currentPlan,
    selectedBillingPeriod,
    selectedBillingPeriod === 'custom' ? customSchedule : undefined
  );

  // Authoritative live conversion for current plan
  const currentConversion = convertSubscriptionPrice(
    activeMasterPrice,
    billingCurrency,
    customExchangeRates,
    exchangeRateUnavailable
  );

  const handleSelectPlan = async (planId: any) => {
    setSelectedPlanId(planId);
    setUpgradeModalPlanId(planId);
  };

  const handlePrintInvoice = (inv: SubscriptionInvoice) => {
    openPrint({
      type: 'invoice',
      title: `CNTEstates SaaS Subscription Invoice - ${inv.invoice_number}`,
      documentNumber: inv.invoice_number,
      date: inv.billing_date,
      dueDate: inv.billing_date,
      originalCurrency: 'USD',
      originalAmount: inv.master_price_usd,
      displayCurrency: inv.billing_currency,
      displayAmount: inv.billed_amount,
      exchangeRate: inv.exchange_rate,
      exchangeRateDate: inv.billing_date,
      sections: [
        {
          title: 'Subscription Entitlement Details',
          items: [
            { label: 'Customer Organization', value: inv.organization_name || organization.name },
            { label: 'Subscribed Tier', value: inv.plan_name || organization.planId, highlight: true },
            {
              label: 'Billing Period',
              value: formatBillingCadenceLabel(inv.billing_period, inv.custom_schedule),
            },
            { label: 'Payment Method', value: inv.payment_method },
            { label: 'Invoice Status', value: (inv.invoice_status || inv.status || 'PAID').toUpperCase() },
          ],
        },
        {
          title: 'Commercial Conversion & Zero-Decimal Traceability',
          table: {
            headers: ['Plan Description', 'USD Master Price', 'Billing Currency', 'Exchange Rate', 'Exchange Rate Source', 'Billed Total'],
            rows: [
              [
                inv.plan_name || 'Subscription',
                `$${inv.master_price_usd ?? inv.subtotal} USD`,
                inv.currency || inv.billing_currency || 'USD',
                (inv.currency || inv.billing_currency) === 'USD' ? '1.000000' : (inv.exchange_rate ?? 1).toFixed(4),
                inv.exchange_rate_source || 'Central Bank Rate',
                formatSubscriptionPrice(inv.billed_amount ?? inv.total, inv.currency || inv.billing_currency || 'USD'),
              ],
            ],
            summary: [
              { label: 'Authoritative USD Total', value: `$${inv.master_price_usd ?? inv.subtotal} USD` },
              { label: `Billed Amount in ${inv.currency || inv.billing_currency || 'USD'}`, value: formatSubscriptionPrice(inv.billed_amount ?? inv.total, inv.currency || inv.billing_currency || 'USD') },
            ],
          },
          notes: 'CNTEstates commercial subscription policy: Zero decimal places applied to all converted local amounts. Historic invoices remain immutable.',
        },
      ],
      meta: {
        generatedBy: 'CNTEstates Automated Billing Service',
        confidentialityNotice: 'This invoice receipt represents binding subscription service commercialization. Master source currency: USD.',
      },
    });
  };

  const invoices = organization.subscriptionInvoices && organization.subscriptionInvoices.length > 0
    ? organization.subscriptionInvoices
    : [
        {
          id: 'sinv-default-1',
          invoice_number: 'CNTE-INV-2026-09',
          organization_id: organization.id,
          organization_name: organization.name,
          plan_id: organization.planId,
          plan_name: currentPlan.plan_name,
          billing_date: '2026-09-15',
          billing_period: 'monthly' as const,
          master_price_usd: currentPlan.master_price,
          billing_currency: billingCurrency,
          billed_amount: currentConversion.convertedPrice,
          exchange_rate: currentConversion.exchangeRate,
          exchange_rate_source: currentConversion.exchangeRateSource,
          payment_method: 'Mastercard •••• 4022',
          status: 'paid' as const,
        },
      ];

  // SEQUENCE 28: RBAC Visibility Gate for Subscription Billing View
  if (!canViewBilling(userRole)) {
    const rolePolicy = AUTHORITATIVE_ROLE_POLICIES[userRole];
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-rose-950/80 border border-rose-800 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Subscription & Billing Access Restricted
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xl mx-auto">
              Per the CNTEstates Role-Based Access Control (RBAC) security policy, access to organization billing, invoices, plans, and financial settings is restricted to authorized personas.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
            <span className="text-slate-400">Current Session Persona:</span>
            <span className="text-rose-400 font-bold bg-rose-950 border border-rose-900 px-2 py-0.5 rounded">
              {rolePolicy?.roleName || userRole} ({userRole})
            </span>
          </div>
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl max-w-lg mx-auto text-left space-y-2 text-xs">
            <div className="font-semibold text-slate-300">Authorized Roles for Billing Management:</div>
            <div className="grid grid-cols-2 gap-1.5 text-slate-400 font-mono text-[11px]">
              <div>• Organization Owner (org_owner)</div>
              <div>• Finance Manager (finance_manager)</div>
              <div>• Portfolio Manager (portfolio_manager)</div>
              <div>• Property Manager (property_manager)</div>
              <div>• Compliance Auditor (auditor)</div>
              <div>• Platform Admin (platform_admin)</div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400">Quick Persona Switch:</span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg font-mono focus:outline-none"
              >
                <option value="org_owner">Org Owner (Full Access)</option>
                <option value="finance_manager">Finance Manager (Fiscal Admin)</option>
                <option value="portfolio_manager">Portfolio Manager</option>
                <option value="property_manager">Property Manager (Read-Only)</option>
                <option value="auditor">Compliance Auditor (Read-Only)</option>
                <option value="platform_admin">Platform Admin (Superuser)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEQUENCE 28 RBAC Console */}
        <BillingRbacConsole />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* SEQUENCE 28: RBAC Session Persona Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xl">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <span>RBAC Role: {AUTHORITATIVE_ROLE_POLICIES[userRole]?.roleName || userRole}</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-2 py-0.2 rounded font-bold uppercase">
                {userRole}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              {canChangePlans(userRole) ? 'Authorized for Plan Switching & Upgrades' : 'Read-Only Plan Visibility (Plan changes restricted)'} • {canCancel(userRole) ? 'Cancellation Enabled' : 'Cancellation Restricted to Owner'} • {canChangeBillingInfo(userRole) ? 'Configuration Enabled' : 'Configuration Restricted'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
          <span className="text-slate-400">Authorization:</span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            canChangePlans(userRole) ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}>
            {canChangePlans(userRole) ? 'Full Management' : 'Read-Only Billing'}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            <span>{t.subscriptions.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.subscriptions.subtitle}
          </p>
        </div>

        {/* Active Cadence Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start sm:self-auto text-xs">
          <span className="text-[11px] text-slate-400 font-mono px-2">Cadence:</span>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-lg font-semibold text-xs capitalize flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatBillingCadenceLabel(selectedBillingPeriod, selectedBillingPeriod === 'custom' ? customSchedule : undefined)}</span>
          </span>
        </div>
      </div>

      {/* SEQUENCE 37: FINAL CNTESTATES ARCHITECTURE QUICK-BAR */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                Final CNTEstates Architecture (Sequence 37)
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold rounded">
                13 / 13 NODES VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Explore the complete 13-stage SaaS hierarchy: CNTEstates → Organization → Subscription → Plan → Capacity & Entitlements → Cadence → Currency → Invoice → Payment → History → Audit Trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('finalArchitecture')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>View Architecture Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SEQUENCE 32: AI Billing Safety Co-Pilot Interactive Quick-Bar */}
      <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 sm:p-5 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                AI Billing Safety Co-Pilot (Sequence 32)
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold rounded">
                GUARDED ASSISTANCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Need assistance understanding your tier, usage headroom, or latest invoice? AI explains and analyzes with zero autonomous risk.
              {aiBillingAuthRequests.filter((r) => r.status === 'pending_authorization').length > 0 && (
                <span className="text-amber-300 font-semibold ml-1">
                  ({aiBillingAuthRequests.filter((r) => r.status === 'pending_authorization').length} human authorization tickets awaiting review)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('aiAssistant')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-xs transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Launch AI Billing Co-Pilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* SEQUENCE 22 — EXECUTIVE ORGANIZATION BILLING DASHBOARD */}
      <OrganizationBillingDashboard
        onUpgradeClick={(targetPlanId) => {
          if (targetPlanId) {
            handleSelectPlan(targetPlanId);
          } else {
            const planOrder = ['free', 'starter', 'basic', 'pro', 'business', 'enterprise'];
            const idx = planOrder.indexOf(organization.planId);
            const target = idx < planOrder.length - 1 ? planOrder[idx + 1] : 'enterprise';
            handleSelectPlan(target);
          }
        }}
        onDowngradeClick={(targetPlanId) => {
          if (targetPlanId) {
            handleSelectPlan(targetPlanId);
          } else {
            const planOrder = ['free', 'starter', 'basic', 'pro', 'business', 'enterprise'];
            const idx = planOrder.indexOf(organization.planId);
            const target = idx > 0 ? planOrder[idx - 1] : 'free';
            handleSelectPlan(target);
          }
        }}
        onPrintInvoice={handlePrintInvoice}
      />

      {/* Exchange Rate Unavailability Alert (Requirement 6) */}
      {exchangeRateUnavailable && (
        <div className="p-4 bg-amber-950/60 border border-amber-800/80 text-amber-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Exchange Rate Service Unavailable</span>
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            Live foreign currency conversion is temporarily offline. Per CNTEstates commercial protocol, the system does not fabricate exchange rates. Subscription plans are authoritatively priced and billed in the master USD currency ($).
          </p>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
        {/* Current Plan & Pricing */}
        <div className="space-y-3 md:border-r md:border-slate-800 md:pr-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t.subscriptions.currentPlan}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
              organization.planId === 'free'
                ? 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                : 'text-emerald-400 bg-emerald-950/80 border border-emerald-900'
            }`}>
              {organization.planId === 'free' ? 'Permanent Free Plan' : organization.subscriptionStatus}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {currentPlan.plan_name}
          </h2>

          {/* Master USD Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              ${activeMasterPrice}
            </span>
            <span className="text-xs text-slate-400">
              {organization.planId === 'free' ? 'USD / month (Free Forever)' : 'USD / month'}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-medium ml-1">
              {organization.planId === 'free' ? 'Permanent Tier' : 'Master USD'}
            </span>
          </div>

          {organization.planId === 'free' ? (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1 text-xs">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Permanent Plan Active (Not a Trial)</span>
              </div>
              <p className="text-[10px] text-emerald-200/80 leading-normal">
                Includes 2 rental units, 1 property, very basic tenant directory, simple service requests, and manual rent recording. No credit card required.
              </p>
            </div>
          ) : billingCurrency !== 'USD' && (
            <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] text-slate-400">
                {t.subscriptions.local_equivalent}:
              </div>
              {currentConversion.isAvailable ? (
                <div className="text-base font-bold text-emerald-400 font-mono flex items-center justify-between">
                  <span>{currentConversion.formattedConvertedPrice} / month</span>
                  <span className="text-[10px] text-slate-500 font-normal">Zero-Decimal</span>
                </div>
              ) : (
                <div className="text-xs text-amber-400">
                  {t.subscriptions.conversion_unavailable}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Operating Country & Default Currency */}
        <div className="space-y-3 md:border-r md:border-slate-800 md:pr-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t.subscriptions.operating_country} & Functional Defaults
          </span>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-2xl p-1 bg-slate-800 rounded-lg">{countryConfig.flag}</span>
            <div>
              <div className="text-sm font-bold text-slate-200">{countryConfig.country_name}</div>
              <div className="text-xs text-slate-400">{countryConfig.legal_operational_timezone}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">{t.subscriptions.default_currency}:</span>
              <strong className="text-slate-200">{countryConfig.default_currency}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.subscriptions.billing_currency}:</span>
              <strong className="text-emerald-400">{billingCurrency}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Regional Format:</span>
              <span className="text-slate-300 font-sans text-[11px]">{countryConfig.locale}</span>
            </div>
          </div>
        </div>

        {/* Exchange Rate Trace & Commercial Rule Compliance */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t.subscriptions.exchange_rate} & Compliance
            </span>

            {billingCurrency !== 'USD' && currentConversion.isAvailable ? (
              <div className="mt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg font-mono">
                  <span className="text-slate-400">1 USD =</span>
                  <span className="font-bold text-white">
                    {currentConversion.exchangeRate.toFixed(4)} {billingCurrency}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">
                  Source: <span className="text-slate-300">{currentConversion.exchangeRateSource}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Effective: {currentConversion.effectiveAt}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-400 p-2 bg-slate-800/40 rounded-lg font-mono">
                {billingCurrency === 'USD'
                  ? 'Master Currency (1.0000 USD)'
                  : 'Rate conversion unavailable'}
              </div>
            )}
          </div>

          {/* Test / Quality Assurance Simulation Toggle */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Simulate Rate Outage</span>
            <button
              onClick={() => setExchangeRateUnavailable(!exchangeRateUnavailable)}
              className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                exchangeRateUnavailable
                  ? 'bg-amber-950 border-amber-700 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {exchangeRateUnavailable ? 'Outage Active' : 'Normal Live Rates'}
            </button>
          </div>
        </div>
      </div>

      {/* SEQUENCE 08 — USAGE MONITORING & CAPACITY ALLOCATION */}
      <UsageMonitoringDashboard
        usageMonitoring={usageMonitoring}
        onUpgradePlan={() => {
          const el = document.getElementById('available-subscription-plans');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onSimulateScenario={simulateUsageScenario}
        currentSimulation={currentSimulation}
      />

      {/* Authoritative Plan Limits Matrix (Sequence 07 Reference) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div>
            <span className="font-bold text-slate-100 text-sm tracking-tight block">
              Authoritative Tier Limits Matrix
            </span>
            <span className="text-[11px] text-slate-400">
              Contractually enforced maximum capacities across all platform tiers.
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Backend Authoritative</span>
        </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Rental Units Quota</th>
                  <th className="py-2 px-3">Properties Quota</th>
                  <th className="py-2 px-3">Enforcement Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.values(AUTHORITATIVE_CAPACITY_LIMITS).map((tier) => {
                  const isCurrent = capacityUsage.planId === tier.planId;
                  return (
                    <tr key={tier.planId} className={isCurrent ? 'bg-emerald-950/20 font-semibold' : 'hover:bg-slate-800/30'}>
                      <td className="py-2 px-3 flex items-center gap-1.5 font-sans">
                        <span className="text-slate-100">{tier.planName}</span>
                        {isCurrent && (
                          <span className="bg-emerald-900/80 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-emerald-400">
                        {tier.planId === 'professional' ? (
                          <span className="text-sky-400 font-bold">60 per property</span>
                        ) : tier.maxRentalUnits === 'unlimited' ? (
                          'Unlimited'
                        ) : (
                          `${tier.maxRentalUnits.toLocaleString()} units`
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-200">
                        {tier.maxProperties === 'unlimited' ? (
                          <span className="text-purple-400 font-bold">Unlimited</span>
                        ) : (
                          `${tier.maxProperties} ${tier.maxProperties === 1 ? 'property' : 'properties'}`
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[10px] font-sans">
                        {tier.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* SEQUENCE 09 — CENTRALIZED FEATURE ENTITLEMENT ENGINE */}
      <FeatureEntitlementDashboard
        currentPlanId={organization.planId}
        onUpgradePlan={handleSelectPlan}
      />

      {/* SEQUENCE 10 — FEATURE ACCESS CONTROL AUTHORIZATION FLOW */}
      <FeatureAccessControlConsole
        onUpgradePlan={handleSelectPlan}
      />

      {/* SEQUENCE 12 — AUTHORITATIVE SECURE UPGRADE ENGINE */}
      <UpgradeEngineConsole />

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-400 font-bold">Subscription Model:</span>
            <span className="font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {activeSubscription.subscription_id || activeSubscription.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Lifecycle State:</span>
            {(() => {
              const status = activeSubscription.subscription_status || activeSubscription.status;
              switch (status) {
                case 'active':
                  return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Active</span>;
                case 'trial':
                  return <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Trial (14-Day)</span>;
                case 'free':
                  return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Free Tier</span>;
                case 'past_due':
                  return <span className="bg-orange-950 text-orange-400 border border-orange-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Past Due</span>;
                case 'payment_failed':
                  return <span className="bg-red-950 text-red-400 border border-red-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Payment Failed</span>;
                case 'suspended':
                  return <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Suspended</span>;
                case 'cancelled':
                case 'canceled':
                  return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Cancelled</span>;
                case 'expired':
                  return <span className="bg-zinc-900 text-zinc-500 border border-zinc-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Expired</span>;
                case 'pending_activation':
                  return <span className="bg-sky-950 text-sky-400 border border-sky-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">Pending Activation</span>;
                default:
                  return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase">{status}</span>;
              }
            })()}
            <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold uppercase ${
              activeSubscription.payment_status === 'paid'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}>
              {activeSubscription.payment_status}
            </span>
            {activeSubscription.plan_id === 'free' ? (
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold">
                Permanent Plan (Never Expires)
              </span>
            ) : activeSubscription.cancel_at_period_end ? (
              <span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold">
                Cancels at Period End
              </span>
            ) : (
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono text-[11px] font-bold">
                Auto-Renew Active
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 font-mono text-[11px]">
          <div>
            <div className="text-slate-400 text-[10px]">CURRENT PERIOD</div>
            <div className="text-slate-200 font-semibold mt-0.5">
              {activeSubscription.plan_id === 'free'
                ? 'Permanent / Indefinite'
                : `${activeSubscription.current_period_start} → ${activeSubscription.current_period_end}`}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">NEXT RENEWAL DATE</div>
            <div className="text-slate-200 font-semibold mt-0.5">
              {activeSubscription.plan_id === 'free' ? 'Never (Permanent Plan)' : activeSubscription.renewal_date}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">EXTERNAL CUSTOMER ID</div>
            <div className="text-slate-300 font-mono mt-0.5 truncate">
              {activeSubscription.plan_id === 'free' ? 'None Required ($0 / No Card)' : (activeSubscription.external_customer_id || 'cus_none')}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px]">EXTERNAL SUBSCRIPTION ID</div>
            <div className="text-slate-300 font-mono mt-0.5 truncate">
              {activeSubscription.plan_id === 'free' ? 'Permanent Free Tier' : (activeSubscription.external_subscription_id || 'sub_none')}
            </div>
          </div>
        </div>

        {/* Lifecycle Operations Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            {activeSubscription.cancel_at_period_end
              ? `Cancellation requested on ${activeSubscription.cancelled_at?.split('T')[0] || 'record'}. Your access continues until ${activeSubscription.current_period_end}.`
              : `Status: ${activeSubscription.subscription_status || activeSubscription.status} • Renewal: ${activeSubscription.renewal_date}`}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Renewal */}
            <button
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                const res = await executeSubscriptionLifecycle('renewal', {
                  reason: 'Manual early cycle renewal initiated by property manager',
                });
                setIsProcessing(false);
                setFeedbackMessage({ type: res.success ? 'success' : 'error', text: res.message });
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              title="Extend billing period and cycle forward"
            >
              Renew Now
            </button>

            {/* Quick Activation (if pending or trial) */}
            {(activeSubscription.subscription_status === 'pending_activation' ||
              activeSubscription.subscription_status === 'trial' ||
              activeSubscription.subscription_status === 'suspended') && (
              <button
                disabled={isProcessing}
                onClick={async () => {
                  setIsProcessing(true);
                  const res = await executeSubscriptionLifecycle('activation', {
                    reason: 'Activated from portal console',
                  });
                  setIsProcessing(false);
                  setFeedbackMessage({ type: res.success ? 'success' : 'error', text: res.message });
                }}
                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Activate Subscription
              </button>
            )}

            {/* Suspend / Resume Toggle */}
            {activeSubscription.subscription_status !== 'suspended' && activeSubscription.subscription_status !== 'cancelled' && (
              <button
                disabled={isProcessing}
                onClick={async () => {
                  if (confirm('Suspend subscription? Services and automation will be temporarily paused.')) {
                    setIsProcessing(true);
                    const res = await executeSubscriptionLifecycle('suspension', {
                      reason: 'Administrative maintenance suspension',
                    });
                    setIsProcessing(false);
                    setFeedbackMessage({ type: res.success ? 'success' : 'error', text: res.message });
                  }
                }}
                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Suspend
              </button>
            )}

            {/* Cancellation / Reactivation */}
            {activeSubscription.cancel_at_period_end ? (
              <button
                disabled={isProcessing || !canReactivate(userRole)}
                onClick={async () => {
                  if (!canReactivate(userRole)) {
                    setFeedbackMessage({ type: 'error', text: getPermissionDenialExplanation(userRole, 'reactivate') });
                    return;
                  }
                  setIsProcessing(true);
                  const res = await reactivateSubscription();
                  setIsProcessing(false);
                  setFeedbackMessage({ type: 'success', text: res.message });
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  canReactivate(userRole)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
                title={canReactivate(userRole) ? 'Reactivate Auto-Renew' : 'Reactivation Restricted to Authorized Roles'}
              >
                Reactivate Auto-Renew
              </button>
            ) : (
              <button
                disabled={isProcessing || !canCancel(userRole)}
                onClick={async () => {
                  if (!canCancel(userRole)) {
                    setFeedbackMessage({ type: 'error', text: getPermissionDenialExplanation(userRole, 'cancel') });
                    return;
                  }
                  if (confirm('Are you sure you want to cancel auto-renewal? You will keep access until the end of your billing cycle.')) {
                    setIsProcessing(true);
                    const res = await cancelSubscription(false);
                    setIsProcessing(false);
                    setFeedbackMessage({ type: res.success ? 'success' : 'error', text: res.message });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer border ${
                  canCancel(userRole)
                    ? 'bg-slate-800 hover:bg-red-950 hover:text-red-300 hover:border-red-800 border-slate-700 text-slate-400'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title={canCancel(userRole) ? 'Cancel Subscription' : 'Cancellation Restricted to Org Owner'}
              >
                {canCancel(userRole) ? 'Cancel Subscription' : 'Cancel (Owner Only)'}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {/* Dynamic Billing Period Architecture Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">Billing Cadence & Contract Period</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Current standard paid billing period is <strong className="text-emerald-400">Monthly</strong>. Dynamic engine supports Quarterly, Annual, and Enterprise Custom Billing.
              </p>
            </div>

            {/* Dynamic Period Tabs */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl gap-1">
              {registeredPeriods.map((period) => {
                const isSelected = selectedBillingPeriod === period.id;
                return (
                  <button
                    key={period.id}
                    onClick={() => setSelectedBillingPeriod(period.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{period.name}</span>
                    {period.isStandardPaid && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-emerald-400'
                      }`}>
                        Standard
                      </span>
                    )}
                    {period.defaultDiscountPercentage > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-amber-400'
                      }`}>
                        -{period.defaultDiscountPercentage}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enterprise Custom Billing Configuration Panel */}
          {selectedBillingPeriod === 'custom' && (
            <div className="mt-3 p-4 bg-slate-950/80 border border-emerald-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200 text-xs">Enterprise Bespoke Schedule Configuration</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">Multi-Year & Custom Terms</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Contract Duration Unit</label>
                  <select
                    value={customSchedule.intervalUnit}
                    onChange={(e) => setCustomSchedule(prev => ({ ...prev, intervalUnit: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="years">Years (Multi-Year Master Agreement)</option>
                    <option value="months">Months (Custom Milestone Schedule)</option>
                    <option value="days">Days (Bespoke Short-term Term)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Duration Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={customSchedule.intervalCount}
                    onChange={(e) => setCustomSchedule(prev => ({ ...prev, intervalCount: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Payment Invoicing Terms</label>
                  <select
                    value={customSchedule.paymentTermsDays || 30}
                    onChange={(e) => setCustomSchedule(prev => ({ ...prev, paymentTermsDays: parseInt(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value={30}>Net 30 Invoicing</option>
                    <option value={60}>Net 60 Invoicing</option>
                    <option value={90}>Net 90 Invoicing</option>
                    <option value={0}>Immediate Wire / ACH on Invoice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Agreement Description / MSA Reference</label>
                <input
                  type="text"
                  value={customSchedule.description}
                  onChange={(e) => setCustomSchedule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  placeholder="e.g. Enterprise 3-Year Strategic Landlord Master Agreement"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEQUENCE 17 — USD MASTER PRICING (Source of Truth) */}
        <UsdMasterPricingBanner billingCurrency={billingCurrency} />

        {/* SEQUENCE 18 — OPERATING COUNTRY CONFIGURATION & CURRENCY SEPARATION */}
        <OperatingCountryConsole />

        {/* SEQUENCE 19 — AUTHORITATIVE EXCHANGE-RATE CONVERSION ENGINE */}
        <ExchangeRateConversionConsole />

        {/* SEQUENCE 20 — ZERO-DECIMAL SUBSCRIPTION DISPLAY */}
        <ZeroDecimalDisplayConsole />

        {/* SEQUENCE 21 — PAYMENT PROVIDER INTEGRATION */}
        <PaymentProviderConsole />

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Available CNTEstates Subscription Plans</span>
          </h2>
          <span className="text-xs text-slate-400">
            Master currency: <strong className="text-slate-200">USD</strong> · Billed locally with zero decimals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subscriptionPlans.map((plan) => {
            const isCurrent = organization.planId === plan.id;
            const masterPrice = calculatePlanPriceForPeriod(
              plan,
              selectedBillingPeriod,
              selectedBillingPeriod === 'custom' ? customSchedule : undefined
            );
            const isFree = masterPrice === 0;
            const conversion = convertSubscriptionPrice(
              masterPrice,
              billingCurrency,
              customExchangeRates,
              exchangeRateUnavailable
            );

            const cadenceSuffix =
              selectedBillingPeriod === 'monthly'
                ? 'USD / mo'
                : selectedBillingPeriod === 'quarterly'
                ? 'USD / qtr'
                : selectedBillingPeriod === 'annual'
                ? 'USD / yr'
                : `USD / ${customSchedule.intervalCount} ${customSchedule.intervalUnit}`;

            const localSuffix =
              selectedBillingPeriod === 'monthly'
                ? '/ mo'
                : selectedBillingPeriod === 'quarterly'
                ? '/ qtr'
                : selectedBillingPeriod === 'annual'
                ? '/ yr'
                : `/${customSchedule.intervalCount}${customSchedule.intervalUnit.charAt(0)}`;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-emerald-500 bg-slate-900 ring-2 ring-emerald-500/20 shadow-lg'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-100 text-base">{plan.name}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono uppercase">
                        {t.subscriptions.active_plan}
                      </span>
                    )}
                  </div>

                  {/* Authoritative USD Price */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      {isFree ? (
                        <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                          Free
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-extrabold text-white font-mono">
                            ${masterPrice}
                          </span>
                          <span className="text-xs text-slate-400">{cadenceSuffix}</span>
                        </>
                      )}
                    </div>

                    {/* Local Currency Equivalent */}
                    {billingCurrency !== 'USD' && !isFree && (
                      <div className="mt-1 text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
                        {conversion.isAvailable ? (
                          <>
                            <span className="text-slate-400 font-sans text-[11px]">≈</span>
                            <span>{conversion.formattedConvertedPrice}</span>
                            <span className="text-[10px] text-slate-500 font-sans font-normal">{localSuffix}</span>
                          </>
                        ) : (
                          <span className="text-amber-400 text-[10px]">Rates offline</span>
                        )}
                      </div>
                    )}
                    {isFree && (
                      <div className="mt-1.5 space-y-1">
                        <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Permanent Plan • Never Expires</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Not a trial • No payment information required
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capacity Summary Badge */}
                  {plan.capacityDescription && (
                    <div className="text-[11px] font-medium text-emerald-300/90 bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono">
                      {plan.capacityDescription}
                    </div>
                  )}

                  {/* Entitlement Quotas */}
                  <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Rental Units:</span>
                      <strong className="text-slate-200">
                        {plan.unitsLimit === 5000 ? 'Up to 5,000' : `Up to ${plan.unitsLimit}`}
                      </strong>
                    </div>
                    {plan.unitsPerPropertyLimit && (
                      <div className="flex justify-between">
                        <span>Units per Property:</span>
                        <strong className="text-slate-200">Up to {plan.unitsPerPropertyLimit}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Properties Limit:</span>
                      <strong className="text-slate-200">
                        {plan.propertiesLimit === 9999 ? 'Unlimited' : `Up to ${plan.propertiesLimit}`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Seat Licenses:</span>
                      <strong className="text-slate-200">{plan.usersLimit}</strong>
                    </div>
                  </div>

                  {/* Service & Support Level */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Support Level:</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {plan.support_level ? plan.support_level.replace(/_/g, ' ') : 'Standard'}
                    </span>
                  </div>

                  {/* Included Features */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Features
                    </div>
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    onClick={() => {
                      if (!canChangePlans(userRole)) {
                        setFeedbackMessage({
                          type: 'error',
                          text: getPermissionDenialExplanation(userRole, 'change_plans'),
                        });
                        return;
                      }
                      handleSelectPlan(plan.id);
                    }}
                    disabled={isCurrent || isProcessing || !canChangePlans(userRole)}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : !canChangePlans(userRole)
                        ? 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                    }`}
                  >
                    {isCurrent
                      ? (isFree ? 'Active Permanent Free Plan' : `${t.subscriptions.active_plan} (${formatBillingCadenceLabel(activeSubscription.billing_period, activeSubscription.custom_schedule)})`)
                      : !canChangePlans(userRole)
                      ? 'Role Restricted: Plan Change Blocked'
                      : (isFree ? 'Activate Free Plan (No Payment Info Required)' : `${t.subscriptions.switch_to} ${plan.name} • ${formatBillingCadenceLabel(selectedBillingPeriod, selectedBillingPeriod === 'custom' ? customSchedule : undefined)}`)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEQUENCE 28 — AUTHORITATIVE BILLING RBAC SECURITY CONSOLE */}
      <BillingRbacConsole />

      {/* SEQUENCE 29 — AUTHORITATIVE BILLING AUDIT LOG CONSOLE */}
      <BillingAuditLogConsole />

      {/* SEQUENCE 24 — STRUCTURED 21-DIMENSION PLAN COMPARISON MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <PlanComparisonMatrix onSelectPlan={(planId) => handleSelectPlan(planId)} />
      </div>

      {/* SEQUENCE 27 — STRICT MULTI-TENANT SECURITY & ISOLATION CONSOLE */}
      <MultiTenantSecurityConsole />

      {/* SEQUENCE 25 — AUTHORITATIVE BILLING NOTIFICATIONS ENGINE */}
      <BillingNotificationsConsole />

      {/* SEQUENCE 14 — AUTHORITATIVE INVOICE ENGINE */}
      <InvoiceEngineConsole />

      {/* SEQUENCE 16 — AUTHORITATIVE SUBSCRIPTION HISTORY CONSOLE */}
      <SubscriptionHistoryConsole />

      {/* Sequence 12 — 11-Step Interactive Upgrade Flow Modal */}
      <UpgradeFlowModal
        isOpen={!!upgradeModalPlanId}
        initialTargetPlanId={upgradeModalPlanId || 'business'}
        onClose={() => setUpgradeModalPlanId(null)}
        onSuccess={() => setUpgradeModalPlanId(null)}
      />
    </div>
  );
};
