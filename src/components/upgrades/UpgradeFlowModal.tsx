import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  CreditCard,
  Building,
  DollarSign,
  AlertCircle,
  Printer,
  ChevronRight,
  Lock,
  Zap,
  RefreshCw,
  X,
  FileText,
  Database,
  Check,
} from 'lucide-react';
import {
  SubscriptionPlan,
  SubscriptionPlanId,
  BillingPeriod,
  CustomBillingSchedule,
  UpgradeRequestPayload,
  UpgradeExecutionResult,
  UpgradeStepExecution,
  FeatureKey,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  subscriptionPlans,
  getSubscriptionPlan,
} from '../../data/mockDatabase';
import {
  calculateBillingAdjustment,
  validateUpgradePayment,
} from '../../services/upgradeEngineService';
import { formatSubscriptionPrice } from '../../services/currencyService';
import { FEATURE_REGISTRY } from '../../services/featureEntitlementEngine';

interface UpgradeFlowModalProps {
  isOpen: boolean;
  initialTargetPlanId?: string;
  onClose: () => void;
  onSuccess?: (result: UpgradeExecutionResult) => void;
}

export const UpgradeFlowModal: React.FC<UpgradeFlowModalProps> = ({
  isOpen,
  initialTargetPlanId = 'business',
  onClose,
  onSuccess,
}) => {
  const {
    organization,
    activeSubscription,
    executeUpgrade,
    openPrint,
    currentUser,
  } = useApp();

  const [targetPlanId, setTargetPlanId] = useState<SubscriptionPlanId>(
    (initialTargetPlanId as SubscriptionPlanId) || 'business'
  );
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    activeSubscription.billing_period || 'monthly'
  );
  const [paymentType, setPaymentType] = useState<'card' | 'bank_transfer' | 'corporate_invoice'>('card');
  const [cardNumber, setCardNumber] = useState('4022 8920 1849 4022');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [cardCvc, setCardCvc] = useState('491');
  const [cardholderName, setCardholderName] = useState(currentUser.name || 'Christian Ntanda');

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<UpgradeExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial target plan when modal opens
  useEffect(() => {
    if (initialTargetPlanId) {
      setTargetPlanId(initialTargetPlanId as SubscriptionPlanId);
    }
    setUpgradeResult(null);
    setErrorMessage(null);
  }, [initialTargetPlanId, isOpen]);

  const currentPlan = useMemo(() => {
    return getSubscriptionPlan(organization.planId) || subscriptionPlans[0];
  }, [organization.planId]);

  const targetPlan = useMemo(() => {
    return getSubscriptionPlan(targetPlanId) || subscriptionPlans[3];
  }, [targetPlanId]);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';

  // Authoritative Billing Adjustment Preview
  const previewAdjustment = useMemo(() => {
    return calculateBillingAdjustment({
      currentPlan,
      targetPlan,
      currentSubscription: activeSubscription,
      billingPeriod,
      billingCurrency,
    });
  }, [currentPlan, targetPlan, activeSubscription, billingPeriod, billingCurrency]);

  const isFreeTarget = targetPlan.id === 'free';

  const handleRunUpgrade = async () => {
    setIsExecuting(true);
    setErrorMessage(null);

    const payload: UpgradeRequestPayload = {
      targetPlanId,
      billingPeriod,
      billingCurrency,
      paymentMethod: isFreeTarget
        ? undefined
        : {
            type: paymentType,
            cardNumber: cardNumber.replace(/\s+/g, ''),
            cardExpMonth,
            cardExpYear,
            cardCvc,
            cardholderName,
            paymentTermsDays: paymentType === 'corporate_invoice' ? 30 : undefined,
          },
      initiatedBy: `${currentUser.name} (${currentUser.role})`,
    };

    try {
      const res = await executeUpgrade(payload);
      if (res.success) {
        setUpgradeResult(res);
        if (onSuccess) onSuccess(res);
      } else {
        setErrorMessage(res.error || 'Upgrade pipeline halted on validation.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Upgrade failed unexpectedly.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Authoritative Subscription Upgrade Engine
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
                  11-Step Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Backend-authoritative pricing & dynamic proration. Frontend prices strictly ignored.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Step 1 & 2: Plan Transition Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Plan */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono uppercase font-semibold">1. Current Active Plan</span>
                <span className="text-emerald-400 font-bold font-mono uppercase">
                  {organization.subscriptionStatus}
                </span>
              </div>
              <div className="font-bold text-white text-base">
                {currentPlan.name}
              </div>
              <div className="flex items-baseline gap-1 text-slate-300 font-mono">
                <span className="font-extrabold text-lg text-emerald-400">
                  ${currentPlan.monthly_price ?? 0}
                </span>
                <span className="text-[11px] text-slate-400">USD/mo</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Cycle: {activeSubscription.current_period_start} → {activeSubscription.current_period_end}
              </div>
            </div>

            {/* Target Plan Selector */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-emerald-300">
                <span className="font-mono uppercase font-semibold">2. Target Upgrade Plan</span>
                <span className="text-emerald-400 font-bold font-mono uppercase">
                  Authoritative
                </span>
              </div>

              <select
                disabled={isExecuting || !!upgradeResult}
                value={targetPlanId}
                onChange={(e) => setTargetPlanId(e.target.value as SubscriptionPlanId)}
                className="w-full bg-slate-900 border border-emerald-700/70 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                {subscriptionPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.monthly_price ?? 0} USD/mo)
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Cadence:</span>
                <div className="flex items-center gap-1">
                  {(['monthly', 'quarterly', 'annual'] as BillingPeriod[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      disabled={isExecuting || !!upgradeResult}
                      onClick={() => setBillingPeriod(period)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-colors ${
                        billingPeriod === period
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Payment Verification */}
          {!isFreeTarget && !upgradeResult && (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>4. Validate Payment Method</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Simulated Gateway Verification
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="flex items-center gap-2">
                {[
                  { id: 'card', label: 'Credit Card (Auto-Debit)' },
                  { id: 'corporate_invoice', label: 'Corporate Invoicing (Net 30)' },
                  { id: 'bank_transfer', label: 'Bank Debit / ACH' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentType(pm.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      paymentType === pm.id
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              {paymentType === 'card' && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Exp (MM/YY)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={cardExpMonth}
                        maxLength={2}
                        onChange={(e) => setCardExpMonth(e.target.value)}
                        className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-mono text-xs text-center"
                      />
                      <span className="text-slate-500">/</span>
                      <input
                        type="text"
                        value={cardExpYear}
                        maxLength={4}
                        onChange={(e) => setCardExpYear(e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-mono text-xs text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">CVC</label>
                    <input
                      type="password"
                      value={cardCvc}
                      maxLength={4}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Authoritative Billing Adjustment Breakdown */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>5. Authoritative Billing Adjustment & Proration</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                Master USD: ${previewAdjustment.masterPriceUsd}
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {previewAdjustment.formulaExplanation}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
              <div className="p-2 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400 block">BASE TARGET CHARGE</span>
                <strong className="text-white">
                  ${previewAdjustment.masterPriceUsd} USD
                </strong>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400 block">UNUSED CYCLE CREDIT</span>
                <strong className="text-emerald-400">
                  -${previewAdjustment.unusedCreditUsd} USD
                </strong>
              </div>
              <div className="p-2 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400 block">DAYS REMAINING</span>
                <strong className="text-slate-200">
                  {previewAdjustment.daysRemainingInCycle} of {previewAdjustment.totalDaysInCycle}
                </strong>
              </div>
              <div className="p-2 bg-emerald-950/50 border border-emerald-800/80 rounded-lg">
                <span className="text-[10px] text-emerald-300 block font-bold">NET ADJUSTMENT PAYABLE</span>
                <strong className="text-emerald-300 text-sm">
                  {formatSubscriptionPrice(previewAdjustment.netAdjustmentLocal, billingCurrency)}
                </strong>
              </div>
            </div>
          </div>

          {/* Success Result or Step Trace */}
          {upgradeResult ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-700 rounded-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-900/80 rounded-xl text-emerald-300">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">
                    Upgrade Successfully Completed!
                  </h4>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Your subscription is now active under <strong>{upgradeResult.subscription.plan_name}</strong>.
                  </p>
                </div>
              </div>

              {/* 11 Steps Audit Execution Grid */}
              <div className="space-y-1.5 pt-2 border-t border-emerald-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Authoritative 11-Step Pipeline Execution Log:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono">
                  {upgradeResult.stepsTrace.map((st) => (
                    <div
                      key={st.step}
                      className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">
                          {st.stepNumber}. {st.title}
                        </span>
                      </div>
                      <span className="text-[9px] text-emerald-400 uppercase font-bold shrink-0">
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unlocked Features & Capacity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    Newly Unlocked Features ({upgradeResult.newlyUnlockedFeatures.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {upgradeResult.newlyUnlockedFeatures.length > 0 ? (
                      upgradeResult.newlyUnlockedFeatures.map((f) => (
                        <span
                          key={f}
                          className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-medium"
                        >
                          {FEATURE_REGISTRY[f]?.name || f}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[11px]">All tier features already available.</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    Updated Capacity Quota:
                  </span>
                  <div className="text-[11px] text-slate-200">
                    {upgradeResult.updatedCapacity.description}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    Rental units limit: {upgradeResult.updatedCapacity.maxRentalUnits === 5000 ? '5,000' : upgradeResult.updatedCapacity.maxRentalUnits} • Properties: {upgradeResult.updatedCapacity.maxProperties}
                  </div>
                </div>
              </div>

              {/* Action Buttons Post-Upgrade */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    openPrint({
                      type: 'invoice',
                      title: `CNTEstates Upgrade Invoice - ${upgradeResult.invoice.invoice_number}`,
                      documentNumber: upgradeResult.invoice.invoice_number,
                      date: upgradeResult.invoice.billing_date,
                      dueDate: upgradeResult.invoice.billing_date,
                      originalCurrency: 'USD',
                      originalAmount: upgradeResult.adjustment.netAdjustmentUsd,
                      displayCurrency: upgradeResult.invoice.billing_currency,
                      displayAmount: upgradeResult.invoice.billed_amount,
                      exchangeRate: upgradeResult.invoice.exchange_rate,
                      exchangeRateDate: upgradeResult.invoice.billing_date,
                      sections: [
                        {
                          title: 'Subscription Upgrade Itemization',
                          items: [
                            { label: 'Customer Organization', value: upgradeResult.invoice.organization_name || organization.name },
                            { label: 'Upgraded Tier', value: upgradeResult.invoice.plan_name || upgradeResult.subscription.plan_name, highlight: true },
                            { label: 'Cadence', value: upgradeResult.invoice.billing_period },
                            { label: 'Payment Method', value: upgradeResult.invoice.payment_method },
                            { label: 'Proration Adjustment', value: upgradeResult.adjustment.formulaExplanation },
                          ],
                        },
                      ],
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Tax Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Close & Refresh Dashboard
                </button>
              </div>
            </div>
          ) : null}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!upgradeResult && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-mono">
              Net Payable: <strong className="text-emerald-400 text-sm">{formatSubscriptionPrice(previewAdjustment.netAdjustmentLocal, billingCurrency)}</strong> (${previewAdjustment.netAdjustmentUsd} USD)
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isExecuting}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={handleRunUpgrade}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing 11-Step Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Execute Upgrade</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
