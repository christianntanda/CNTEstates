import React, { useState, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  CreditCard,
  Building,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Lock,
  FileText,
  Database,
  ArrowUpRight,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  SubscriptionPlanId,
  BillingPeriod,
  UpgradeRequestPayload,
  UpgradeExecutionResult,
  UpgradeStepExecution,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  subscriptionPlans,
  getSubscriptionPlan,
} from '../../data/mockDatabase';
import {
  calculateBillingAdjustment,
} from '../../services/upgradeEngineService';
import { formatSubscriptionPrice } from '../../services/currencyService';
import { FEATURE_REGISTRY, PLAN_DISPLAY_NAMES } from '../../services/featureEntitlementEngine';
import { UpgradeFlowModal } from './UpgradeFlowModal';

export const UpgradeEngineConsole: React.FC = () => {
  const {
    organization,
    activeSubscription,
    executeUpgrade,
    currentUser,
  } = useApp();

  const [targetPlanId, setTargetPlanId] = useState<SubscriptionPlanId>('business');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    activeSubscription.billing_period || 'monthly'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<UpgradeExecutionResult | null>(null);

  const currentPlan = useMemo(() => {
    return getSubscriptionPlan(organization.planId) || subscriptionPlans[0];
  }, [organization.planId]);

  const targetPlan = useMemo(() => {
    return getSubscriptionPlan(targetPlanId) || subscriptionPlans[3];
  }, [targetPlanId]);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';

  const preview = useMemo(() => {
    return calculateBillingAdjustment({
      currentPlan,
      targetPlan,
      currentSubscription: activeSubscription,
      billingPeriod,
      billingCurrency,
    });
  }, [currentPlan, targetPlan, activeSubscription, billingPeriod, billingCurrency]);

  const PIPELINE_STEPS = [
    { num: 1, title: 'Current Plan', desc: 'Identify active plan, billing period, and cycle dates' },
    { num: 2, title: 'Select New Plan', desc: 'Specify target plan and billing cadence' },
    { num: 3, title: 'Validate Plan', desc: 'Verify plan exists and is active; strip client-supplied pricing' },
    { num: 4, title: 'Validate Payment', desc: 'Verify card / token / corporate terms (waived for Free tier)' },
    { num: 5, title: 'Calculate Adjustment', desc: 'Compute unused credit and authoritative net adjustment' },
    { num: 6, title: 'Change Subscription', desc: 'Transition lifecycle and register normalized subscription' },
    { num: 7, title: 'Update Entitlements', desc: 'Refresh feature engine and unlock new tier capabilities' },
    { num: 8, title: 'Update Capacity', desc: 'Expand property, unit, building, and team quotas' },
    { num: 9, title: 'Generate/Update Invoice', desc: 'Issue authoritative tax invoice with itemized proration' },
    { num: 10, title: 'Record History', desc: 'Persist immutable audit trail in subscription history' },
    { num: 11, title: 'Notify Customer', desc: 'Dispatch in-app confirmation and email notification' },
  ];

  const handleQuickExecute = async () => {
    setIsExecuting(true);
    const payload: UpgradeRequestPayload = {
      targetPlanId,
      billingPeriod,
      billingCurrency,
      initiatedBy: `${currentUser.name} (${currentUser.role})`,
    };
    try {
      const res = await executeUpgrade(payload);
      if (res.success) {
        setLastResult(res);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Authoritative Upgrade Engine
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
                Sequence 12 Pipeline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure 11-step execution pipeline. Backend pricing is authoritative; frontend-submitted prices are strictly untrusted.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md self-start sm:self-auto cursor-pointer"
        >
          <span>Open Interactive Upgrade Wizard</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 11-Step Pipeline Flow Diagram */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
          Authoritative 11-Step Upgrade Architecture:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[10px] font-mono">
          {PIPELINE_STEPS.map((s, idx) => (
            <div
              key={s.num}
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                lastResult
                  ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="font-bold">Step {s.num}</span>
                {lastResult ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Clock className="w-3 h-3 text-slate-500" />
                )}
              </div>
              <div className="font-bold text-white text-[11px] truncate">
                {s.title}
              </div>
              <div className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulator Control Matrix & Live Proration Calculation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1 & 2: Interactive Controls */}
        <div className="space-y-3 bg-slate-950/60 p-4 border border-slate-800 rounded-xl text-xs">
          <span className="font-bold text-slate-200 block text-xs">
            Upgrade Simulation Controls
          </span>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Current Active Plan:</label>
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-semibold flex items-center justify-between">
              <span>{currentPlan.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                {organization.planId === 'free' ? 'Permanent Free' : 'Active'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Select Target Plan:</label>
            <select
              value={targetPlanId}
              onChange={(e) => setTargetPlanId(e.target.value as SubscriptionPlanId)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {subscriptionPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.monthly_price ?? 0} USD/mo)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Billing Cadence:</label>
            <div className="flex items-center gap-1">
              {(['monthly', 'quarterly', 'annual'] as BillingPeriod[]).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillingPeriod(period)}
                  className={`flex-1 py-1 rounded text-[11px] font-mono capitalize transition-colors ${
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

        {/* Step 5: Authoritative Billing Adjustment Breakdown */}
        <div className="space-y-3 bg-slate-950/60 p-4 border border-slate-800 rounded-xl text-xs md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Step 5: Live Billing Adjustment & Proration Ledger</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Zero-Decimal Enforced
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono">
            {preview.formulaExplanation}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-400">TARGET CHARGE</div>
              <div className="text-white font-bold text-sm mt-0.5">
                ${preview.masterPriceUsd} USD
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {preview.targetPriceLocal} {billingCurrency}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-400">UNUSED CREDIT</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">
                -${preview.unusedCreditUsd} USD
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                -{preview.unusedCreditLocal} {billingCurrency}
              </div>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-400">CYCLE PROGRESS</div>
              <div className="text-slate-200 font-bold text-sm mt-0.5">
                {preview.daysRemainingInCycle}d left
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                of {preview.totalDaysInCycle} total days
              </div>
            </div>

            <div className="p-2.5 bg-emerald-950/70 border border-emerald-800 rounded-lg">
              <div className="text-[10px] text-emerald-300 font-semibold">NET PAYABLE</div>
              <div className="text-emerald-300 font-extrabold text-sm mt-0.5">
                {formatSubscriptionPrice(preview.netAdjustmentLocal, billingCurrency)}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                ${preview.netAdjustmentUsd} USD
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Policy Rule: All pricing authoritative on backend. Frontend prices ignored.
            </span>
            <button
              onClick={handleQuickExecute}
              disabled={isExecuting || organization.planId === targetPlanId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Execute Authoritative Upgrade</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Flow Modal Trigger */}
      <UpgradeFlowModal
        isOpen={isModalOpen}
        initialTargetPlanId={targetPlanId}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(res) => setLastResult(res)}
      />
    </div>
  );
};
