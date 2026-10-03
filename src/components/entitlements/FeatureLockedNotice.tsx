import React, { useState } from 'react';
import {
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Database,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Layers,
} from 'lucide-react';
import { FeatureKey, AccessDecision } from '../../types';
import { evaluateFeatureAccess } from '../../services/accessControlEngine';
import { useApp } from '../../context/AppContext';

interface FeatureLockedNoticeProps {
  feature: FeatureKey;
  currentPlanId?: string;
  onUpgrade?: (targetPlanId: string) => void;
  compact?: boolean;
  customTitle?: string;
  customDescription?: string;
  decisionOverride?: AccessDecision;
}

export const FeatureLockedNotice: React.FC<FeatureLockedNoticeProps> = ({
  feature,
  currentPlanId,
  onUpgrade,
  compact = false,
  customTitle,
  customDescription,
  decisionOverride,
}) => {
  const {
    currentUser,
    organization,
    activeSubscription,
    rfqs,
    complianceCertificates,
    utilityMeters,
    automationRules,
    workOrders,
    leases,
    properties,
    units,
  } = useApp();

  const [showTrace, setShowTrace] = useState(false);

  // Evaluate the authoritative 6-stage authorization pipeline
  const decision: AccessDecision = decisionOverride || evaluateFeatureAccess({
    user: currentUser,
    organization: organization ? {
      ...organization,
      planId: currentPlanId || organization.planId,
    } : null,
    subscription: activeSubscription,
    featureKey: feature,
    contextData: {
      rfqs,
      complianceCertificates,
      utilityMeters,
      automationRules,
      workOrders,
      leases,
      properties,
      units,
    },
  });

  const handleUpgradeClick = () => {
    const targetPlan = decision.requiredPlanId || decision.upgradeOption?.targetPlanId || 'business';
    if (onUpgrade) {
      onUpgrade(targetPlan);
    } else {
      const el = document.getElementById('available-subscription-plans');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Compact banner mode
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg text-amber-400 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">
                {customTitle || decision.featureName}
              </span>
              <span className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded font-mono">
                Requires {decision.requiredPlanName}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {decision.explanation}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {decision.dataPreserved && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-1 rounded font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Data Preserved</span>
            </span>
          )}
          <button
            onClick={handleUpgradeClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Full Non-Broken Interface with Authorization Pipeline & Upgrade Options
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl mx-auto my-6 shadow-xl relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Lock Badge & Feature Info */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3.5 bg-slate-950 border border-amber-500/30 rounded-2xl text-amber-400 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <span className="inline-block px-2.5 py-0.5 bg-amber-950/70 border border-amber-800/80 text-amber-300 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
            {decision.categoryName} • Feature Locked
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {customTitle || decision.featureName}
          </h3>
        </div>

        {/* Clear Requirement Explanation */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          {customDescription || decision.explanation}
        </p>
      </div>

      {/* Authorization Flow Pipeline Trace Diagram (Sequence 10 Flow) */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorization Flow Pipeline</span>
          </span>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded">
            Stage: {decision.deniedAtStage?.toUpperCase() || 'ENTITLEMENT'}
          </span>
        </div>

        {/* Visual 6-Stage Pipeline Steps */}
        <div className="grid grid-cols-6 gap-1.5 text-center text-[10px] font-mono">
          {/* 1. User */}
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <div className="font-bold flex items-center justify-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>User</span>
            </div>
            <div className="text-[8px] text-slate-400 truncate mt-0.5">{decision.flowTrace.user.role}</div>
          </div>

          {/* 2. Organization */}
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <div className="font-bold flex items-center justify-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>Org</span>
            </div>
            <div className="text-[8px] text-slate-400 truncate mt-0.5">Valid</div>
          </div>

          {/* 3. Subscription */}
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <div className="font-bold flex items-center justify-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>Sub</span>
            </div>
            <div className="text-[8px] text-slate-400 truncate mt-0.5 capitalize">{decision.flowTrace.subscription.status}</div>
          </div>

          {/* 4. Plan */}
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <div className="font-bold flex items-center justify-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              <span>Plan</span>
            </div>
            <div className="text-[8px] text-slate-400 truncate mt-0.5">{decision.currentPlanName}</div>
          </div>

          {/* 5. Entitlement (Denied / Gated) */}
          <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-600 text-amber-200 ring-1 ring-amber-500/50">
            <div className="font-bold flex items-center justify-center gap-0.5 text-amber-300">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>Entitlement</span>
            </div>
            <div className="text-[8px] text-amber-300/80 truncate mt-0.5">Missing</div>
          </div>

          {/* 6. Decision */}
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <div className="font-bold flex items-center justify-center gap-0.5 text-rose-400">
              <XCircle className="w-2.5 h-2.5 text-rose-400" />
              <span>Decision</span>
            </div>
            <div className="text-[8px] text-slate-400 truncate mt-0.5">Blocked</div>
          </div>
        </div>
      </div>

      {/* Data Preservation Guarantee Callout (Sequence 10 Mandate) */}
      <div className="p-4 bg-emerald-950/40 border border-emerald-800/70 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Data Preservation Guarantee</span>
        </div>
        <p className="text-emerald-200/90 leading-relaxed text-[11px]">
          {decision.preservedDataSummary || 'None of your existing data has been deleted. All historic records, documents, and configuration data remain securely stored in your account database.'}
        </p>
        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Database className="w-3.5 h-3.5" />
            <span>Data State: Safe & Encrypted</span>
          </span>
          <span>•</span>
          <span>Restores immediately upon upgrading</span>
        </div>
      </div>

      {/* Relevant Upgrade Option Card (Sequence 10 Mandate) */}
      {decision.upgradeOption && (
        <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-800/50 rounded-xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider font-semibold">
                Recommended Upgrade Option
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                {decision.upgradeOption.targetPlanName}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {decision.upgradeOption.featureHighlight}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-extrabold text-emerald-400 font-mono">
                ${decision.upgradeOption.monthlyPriceUsd}
              </div>
              <div className="text-[10px] text-slate-400">USD / month</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              Instant activation • No setup fee • Seamless data access
            </span>
            <button
              onClick={handleUpgradeClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{decision.upgradeOption.upgradeCtaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Detailed Trace Inspector */}
      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={() => setShowTrace(!showTrace)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
        >
          <span className="font-mono text-[11px]">Inspect 6-Stage Authorization Pipeline Trace</span>
          {showTrace ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTrace && (
          <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">1. User</span>
                <span>{decision.flowTrace.user.name} ({decision.flowTrace.user.role})</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">2. Organization</span>
                <span>{decision.flowTrace.organization.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">3. Subscription Status</span>
                <span className="capitalize">{decision.flowTrace.subscription.status}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">4. Subscribed Plan</span>
                <span>{decision.currentPlanName} (Tier {decision.flowTrace.plan.tierScore})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">5. Feature Entitlement</span>
                <span className="text-amber-400">Locked (Requires {decision.requiredPlanName})</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase block">6. Access Decision</span>
                <span className="text-rose-400 font-bold">{decision.flowTrace.decision.reasonCode}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
