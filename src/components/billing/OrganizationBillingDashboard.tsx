import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Calendar,
  Layers,
  Building,
  Home,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  RotateCcw,
  Sliders,
  DollarSign,
  Printer,
  ChevronRight,
  Download,
  Lock,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatSubscriptionPrice,
  convertSubscriptionPrice,
  currencyCatalogue,
} from '../../services/currencyService';
import { formatBillingCadenceLabel } from '../../services/billingPeriodService';
import { SubscriptionInvoice } from '../../types';
import { ManageBillingModal } from './ManageBillingModal';

interface OrganizationBillingDashboardProps {
  onUpgradeClick?: (targetPlanId?: string) => void;
  onDowngradeClick?: (targetPlanId?: string) => void;
  onPrintInvoice?: (invoice: SubscriptionInvoice) => void;
}

export const OrganizationBillingDashboard: React.FC<OrganizationBillingDashboardProps> = ({
  onUpgradeClick,
  onDowngradeClick,
  onPrintInvoice,
}) => {
  const {
    organization,
    subscriptionPlans,
    activeSubscription,
    capacityUsage,
    buildings,
    cancelSubscription,
    reactivateSubscription,
    openPrint,
    customExchangeRates,
    exchangeRateUnavailable,
  } = useApp();

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';
  const currentPlan = subscriptionPlans.find((p) => p.id === organization.planId) || subscriptionPlans[0];

  // Authoritative Currency & Price calculation
  const masterPriceUsd = activeSubscription.master_price || currentPlan.monthly_price;
  const isFreePlan = activeSubscription.plan_id === 'free';
  const conversion = convertSubscriptionPrice(
    masterPriceUsd,
    billingCurrency,
    customExchangeRates,
    exchangeRateUnavailable
  );

  const formattedBilledPrice = isFreePlan
    ? 'Free'
    : formatSubscriptionPrice(activeSubscription.current_price || conversion.convertedPrice, billingCurrency);

  // Invoices
  const invoices: SubscriptionInvoice[] =
    organization.subscriptionInvoices && organization.subscriptionInvoices.length > 0
      ? organization.subscriptionInvoices
      : [
          {
            invoice_id: 'sinv-latest-org1',
            id: 'sinv-latest-org1',
            invoice_number: 'CNTE-INV-2026-09',
            organization_id: organization.id,
            organization_name: organization.name,
            subscription_id: activeSubscription.subscription_id,
            billing_period: activeSubscription.billing_period,
            invoice_date: '2026-09-15',
            billing_date: '2026-09-15',
            due_date: '2026-09-15',
            currency: billingCurrency,
            billing_currency: billingCurrency,
            subtotal: Math.round((activeSubscription.current_price || 4445) * 0.85),
            tax: Math.round((activeSubscription.current_price || 4445) * 0.15),
            discount: 0,
            total: activeSubscription.current_price || 4445,
            amount_paid: activeSubscription.current_price || 4445,
            amount_due: 0,
            payment_status: 'paid',
            invoice_status: 'paid',
            payment_method: 'Mastercard •••• 4022',
            external_invoice_id: 'in_stripe_latest_2026',
            created_at: '2026-09-15T08:00:00Z',
            updated_at: '2026-09-15T08:00:00Z',
          },
        ];

  const currentInvoice = invoices[0];

  // Usage statistics
  const unitsUsed = capacityUsage.totalUnits || 0;
  const unitsAllowed = capacityUsage.maxUnits === 'unlimited' ? 'Unlimited' : capacityUsage.maxUnits;
  const unitsPercent =
    capacityUsage.maxUnits === 'unlimited'
      ? 15
      : Math.min(100, Math.round((unitsUsed / (capacityUsage.maxUnits as number)) * 100));

  const propertiesUsed = capacityUsage.totalProperties || 0;
  const propertiesAllowed = capacityUsage.maxProperties === 'unlimited' ? 'Unlimited' : capacityUsage.maxProperties;
  const propertiesPercent =
    capacityUsage.maxProperties === 'unlimited'
      ? 20
      : Math.min(100, Math.round((propertiesUsed / (capacityUsage.maxProperties as number)) * 100));

  const buildingsUsed = buildings.length || 0;
  const rawMaxBuildings = (currentPlan as any).max_buildings || 10;
  const buildingsAllowed = rawMaxBuildings === 'unlimited' ? 'Unlimited' : rawMaxBuildings;
  const buildingsPercent =
    buildingsAllowed === 'Unlimited'
      ? 25
      : Math.min(100, Math.round((buildingsUsed / (buildingsAllowed as number)) * 100));

  // Determine available upgrade and downgrade targets
  const planOrder = ['free', 'starter', 'basic', 'pro', 'business', 'enterprise'];
  const currentPlanIndex = planOrder.indexOf(currentPlan.id);
  const nextHigherPlan = currentPlanIndex < planOrder.length - 1 ? planOrder[currentPlanIndex + 1] : null;
  const nextLowerPlan = currentPlanIndex > 0 ? planOrder[currentPlanIndex - 1] : null;

  // Print invoice helper
  const handlePrint = (inv: SubscriptionInvoice) => {
    if (onPrintInvoice) {
      onPrintInvoice(inv);
      return;
    }

    openPrint({
      type: 'invoice',
      title: `CNTEstates SaaS Subscription Receipt - ${inv.invoice_number}`,
      documentNumber: inv.invoice_number,
      date: inv.billing_date || inv.invoice_date,
      dueDate: inv.due_date || inv.billing_date,
      originalCurrency: 'USD',
      originalAmount: inv.master_price_usd || masterPriceUsd,
      displayCurrency: inv.billing_currency || inv.currency,
      displayAmount: inv.billed_amount || inv.total,
      exchangeRate: inv.exchange_rate || conversion.exchangeRate,
      exchangeRateDate: inv.billing_date || inv.invoice_date,
      sections: [
        {
          title: 'Organization Subscription',
          items: [
            { label: 'Customer Organization', value: inv.organization_name || organization.name },
            { label: 'Subscribed Tier', value: currentPlan.plan_name, highlight: true },
            { label: 'Billing Period', value: formatBillingCadenceLabel(inv.billing_period) },
            { label: 'Payment Method', value: inv.payment_method || 'Mastercard •••• 4022' },
            { label: 'Settlement Status', value: (inv.payment_status || 'PAID').toUpperCase() },
          ],
        },
      ],
    });
  };

  // Handle Cancellation
  const handleCancelClick = async (immediate = false) => {
    setIsProcessing(true);
    setStatusMessage(null);
    const res = await cancelSubscription(immediate);
    setIsProcessing(false);
    setIsCancelConfirmOpen(false);
    if (res.success) {
      setStatusMessage({
        type: 'info',
        text: res.message,
      });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  // Handle Reactivation
  const handleReactivateClick = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    const res = await reactivateSubscription();
    setIsProcessing(false);
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Feedback */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : statusMessage.type === 'info'
              ? 'bg-sky-950/80 border-sky-800 text-sky-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : statusMessage.type === 'info' ? (
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: 4 Core Sections Required by SEQUENCE 22 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ========================================== */}
        {/* 1. CURRENT SUBSCRIPTION (lg:col-span-6)     */}
        {/* ========================================== */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  1. Current Subscription
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              {/* Lifecycle Status Pill */}
              <div className="flex items-center gap-1.5">
                {activeSubscription.cancel_at_period_end ? (
                  <span className="bg-red-950 text-red-300 border border-red-800 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase">
                    Cancels at Period End
                  </span>
                ) : activeSubscription.subscription_status === 'active' ? (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase">
                    Active Subscription
                  </span>
                ) : activeSubscription.subscription_status === 'trial' ? (
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase">
                    14-Day Free Trial
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase">
                    {activeSubscription.subscription_status}
                  </span>
                )}
              </div>
            </div>

            {/* Plan Name & Pricing */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                  {currentPlan.plan_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enterprise property and building portfolio management
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline sm:justify-end gap-1">
                  <span>{formattedBilledPrice}</span>
                  {!isFreePlan && (
                    <span className="text-xs text-slate-400 font-sans font-normal">
                      /{formatBillingCadenceLabel(activeSubscription.billing_period, activeSubscription.custom_schedule)}
                    </span>
                  )}
                </div>
                {!isFreePlan && (
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Master source: <strong className="text-emerald-400 font-semibold">${masterPriceUsd} USD</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Core Metadata Grid: Plan, Price, Billing period, Currency, Status, Renewal date */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/70">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plan Tier</span>
                <span className="font-bold text-slate-200 capitalize mt-0.5 block truncate">
                  {currentPlan.id}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/70">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Billing Period</span>
                <span className="font-bold text-slate-200 capitalize mt-0.5 block truncate">
                  {activeSubscription.billing_period}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/70">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Currency</span>
                <span className="font-mono font-bold text-emerald-400 mt-0.5 block">
                  {billingCurrency}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/70">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Status</span>
                <span className={`font-mono font-bold capitalize mt-0.5 block ${
                  activeSubscription.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {activeSubscription.payment_status}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/70 col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Renewal Date</span>
                <span className="font-mono font-bold text-slate-200 mt-0.5 block flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isFreePlan ? 'Permanent (Never Expires)' : activeSubscription.renewal_date}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Notice on Scheduled Cancellation */}
          {activeSubscription.cancel_at_period_end && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-200 flex items-center justify-between gap-2">
              <span className="text-[11px]">
                Subscription will terminate on <strong className="font-mono">{activeSubscription.current_period_end}</strong>.
              </span>
              <button
                disabled={isProcessing}
                onClick={handleReactivateClick}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
              >
                Reactivate
              </button>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* 2. USAGE (lg:col-span-6)                   */}
        {/* ========================================== */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                2. Capacity & Resource Usage
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentPlan.plan_name} Quotas
              </span>
            </div>

            {/* Metric 1: Units Used / Allowed */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>Rental Units</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-100">
                  <span className="text-emerald-400">{unitsUsed}</span>
                  <span className="text-slate-500"> / </span>
                  <span>{unitsAllowed}</span>
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    unitsPercent >= 90
                      ? 'bg-rose-500'
                      : unitsPercent >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${unitsPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{unitsPercent}% utilized</span>
                <span>
                  {capacityUsage.unitsRemaining === 'unlimited'
                    ? 'Unlimited remaining'
                    : `${capacityUsage.unitsRemaining} available`}
                </span>
              </div>
            </div>

            {/* Metric 2: Properties Used / Allowed */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-purple-400" />
                  <span>Properties</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-100">
                  <span className="text-purple-400">{propertiesUsed}</span>
                  <span className="text-slate-500"> / </span>
                  <span>{propertiesAllowed}</span>
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    propertiesPercent >= 90
                      ? 'bg-rose-500'
                      : propertiesPercent >= 75
                      ? 'bg-amber-500'
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${propertiesPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{propertiesPercent}% utilized</span>
                <span>
                  {capacityUsage.propertiesRemaining === 'unlimited'
                    ? 'Unlimited properties'
                    : `${capacityUsage.propertiesRemaining} properties available`}
                </span>
              </div>
            </div>

            {/* Metric 3: Buildings Used / Allowed */}
            <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Buildings & Complexes</span>
                </span>
                <span className="font-mono text-xs font-bold text-slate-100">
                  <span className="text-sky-400">{buildingsUsed}</span>
                  <span className="text-slate-500"> / </span>
                  <span>{buildingsAllowed}</span>
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    buildingsPercent >= 90
                      ? 'bg-rose-500'
                      : buildingsPercent >= 75
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                  style={{ width: `${buildingsPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{buildingsPercent}% utilized</span>
                <span>Enforced by Capacity Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 3. BILLING & INVOICES (lg:col-span-8)      */}
        {/* ========================================== */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                3. Billing & Invoices
              </span>
              <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                Current Invoice & Remittance Ledger
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono">
                {invoices.length} Invoices on Record
              </span>
            </div>
          </div>

          {/* Current Invoice Spotlight */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Current Billing Cycle Document
                </span>
                <div className="font-mono text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                  <span>{currentInvoice.invoice_number}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                    {(currentInvoice.invoice_status || currentInvoice.status || 'PAID').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrint(currentInvoice)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View / Print Receipt</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2 border-t border-slate-800/80">
              <div>
                <div className="text-slate-400 text-[10px]">ISSUE DATE</div>
                <div className="text-slate-200 font-semibold mt-0.5">
                  {currentInvoice.invoice_date || currentInvoice.billing_date}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">TOTAL SETTLED</div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  {formatSubscriptionPrice(currentInvoice.total || currentInvoice.billed_amount || 0, currentInvoice.currency || billingCurrency)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">PAYMENT METHOD</div>
                <div className="text-slate-200 mt-0.5 truncate">
                  {currentInvoice.payment_method || 'Mastercard •••• 4022'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px]">EXTERNAL ID</div>
                <div className="text-slate-400 mt-0.5 truncate font-mono text-[11px]" title={currentInvoice.external_invoice_id}>
                  {currentInvoice.external_invoice_id || 'in_gateway_synced'}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice History Table */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Recent Invoice History
            </span>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {invoices.map((inv) => (
                    <tr key={inv.id || inv.invoice_id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-2 px-3 text-slate-200 font-bold">{inv.invoice_number}</td>
                      <td className="py-2 px-3 text-slate-400">{inv.invoice_date || inv.billing_date}</td>
                      <td className="py-2 px-3 text-slate-300 font-sans capitalize">{inv.billing_period}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">
                        {formatSubscriptionPrice(inv.total || inv.billed_amount || 0, inv.currency || billingCurrency)}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                          {(inv.payment_status || inv.status || 'PAID').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handlePrint(inv)}
                          className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Print or view receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* 4. ACTIONS & MANAGEMENT (lg:col-span-4)   */}
        {/* ========================================== */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                4. Subscription Actions
              </span>
              <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                Lifecycle & Billing Controls
              </h4>
            </div>

            {/* Action 1: Upgrade */}
            <button
              onClick={() => {
                if (onUpgradeClick) onUpgradeClick(nextHigherPlan || undefined);
              }}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition-colors shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-200" />
                <span>Upgrade Subscription</span>
              </div>
              <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
                {nextHigherPlan ? `To ${nextHigherPlan.toUpperCase()}` : 'Top Tier'}
              </span>
            </button>

            {/* Action 2: Downgrade */}
            <button
              onClick={() => {
                if (onDowngradeClick) onDowngradeClick(nextLowerPlan || undefined);
              }}
              disabled={isFreePlan}
              className="w-full py-2 px-3 bg-slate-950/80 hover:bg-slate-800 disabled:opacity-50 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-slate-400" />
                <span>Downgrade Tier</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {nextLowerPlan ? `To ${nextLowerPlan.toUpperCase()}` : 'Free Tier'}
              </span>
            </button>

            {/* Action 3 & 4: Cancel or Reactivate */}
            {activeSubscription.cancel_at_period_end ? (
              <button
                disabled={isProcessing}
                onClick={handleReactivateClick}
                className="w-full py-2 px-3 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Reactivate Auto-Renewal</span>
                </div>
                <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold">
                  Resumes Renewal
                </span>
              </button>
            ) : (
              <button
                disabled={isFreePlan || isProcessing}
                onClick={() => setIsCancelConfirmOpen(true)}
                className="w-full py-2 px-3 bg-slate-950/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
                  <span>Cancel Subscription</span>
                </div>
                <span className="text-[10px] text-slate-500">Period end</span>
              </button>
            )}

            {/* Action 5: Manage Billing */}
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Manage Billing</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Payment Method & Gateway Snapshot */}
          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <strong className="text-slate-200 font-mono">Mastercard •••• 4022</strong>
            </div>
            <div className="flex justify-between">
              <span>Payment Gateway:</span>
              <span className="text-emerald-400 font-semibold">Stripe Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Cancel Subscription?</h3>
                <p className="text-xs text-slate-400">
                  Your access continues until the end of the billing period.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              You will keep full access to <strong className="text-slate-100">{currentPlan.plan_name}</strong> until{' '}
              <strong className="text-emerald-400 font-mono">{activeSubscription.current_period_end}</strong>. No further renewal charges will occur.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Keep Subscription
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleCancelClick(false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Billing Modal */}
      <ManageBillingModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onSuccess={(msg) => {
          setStatusMessage({ type: 'success', text: msg });
        }}
      />
    </div>
  );
};
