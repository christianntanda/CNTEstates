import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  User,
  Building,
  CreditCard,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  Lock,
} from 'lucide-react';
import {
  FeatureKey,
  UserProfile,
  UserRole,
  SubscriptionLifecycleStatus,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  evaluateFeatureAccess,
  evaluateAllFeaturesAccess,
} from '../../services/accessControlEngine';
import {
  getAllFeatureDefinitions,
  PLAN_DISPLAY_NAMES,
  PLAN_TIER_ORDER,
} from '../../services/featureEntitlementEngine';

interface FeatureAccessControlConsoleProps {
  onUpgradePlan?: (targetPlanId: string) => void;
}

export const FeatureAccessControlConsole: React.FC<FeatureAccessControlConsoleProps> = ({
  onUpgradePlan,
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

  // Interactive Test State
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey>('rfq_management');
  const [simulatedRole, setSimulatedRole] = useState<UserRole>(currentUser.role);
  const [simulatedPlanId, setSimulatedPlanId] = useState<string>(organization.planId);
  const [simulatedSubStatus, setSimulatedSubStatus] = useState<SubscriptionLifecycleStatus>(
    activeSubscription.subscription_status || organization.subscriptionStatus || 'active'
  );
  const [featureSearch, setFeatureSearch] = useState('');

  const allFeatures = useMemo(() => getAllFeatureDefinitions(), []);

  // Build simulated context
  const simulatedUser: UserProfile = useMemo(() => ({
    ...currentUser,
    role: simulatedRole,
  }), [currentUser, simulatedRole]);

  const simulatedOrg = useMemo(() => ({
    ...organization,
    planId: simulatedPlanId as any,
    subscriptionStatus: simulatedSubStatus,
  }), [organization, simulatedPlanId, simulatedSubStatus]);

  const simulatedSub = useMemo(() => ({
    ...activeSubscription,
    plan_id: simulatedPlanId as any,
    subscription_status: simulatedSubStatus,
  }), [activeSubscription, simulatedPlanId, simulatedSubStatus]);

  // Run the 6-stage authorization pipeline
  const currentDecision = useMemo(() => {
    return evaluateFeatureAccess({
      user: simulatedUser,
      organization: simulatedOrg,
      subscription: simulatedSub,
      featureKey: selectedFeature,
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
  }, [simulatedUser, simulatedOrg, simulatedSub, selectedFeature, rfqs, complianceCertificates, utilityMeters, automationRules, workOrders, leases, properties, units]);

  // Filter features for dropdown/selector
  const filteredFeatures = useMemo(() => {
    return allFeatures.filter(
      (f) =>
        f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.key.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.categoryName.toLowerCase().includes(featureSearch.toLowerCase())
    );
  }, [allFeatures, featureSearch]);

  const plans = ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'];
  const roles: UserRole[] = [
    'org_owner',
    'portfolio_manager',
    'property_manager',
    'finance_manager',
    'technician',
    'contractor',
    'tenant',
  ];
  const statuses: SubscriptionLifecycleStatus[] = ['active', 'trial', 'past_due', 'suspended', 'cancelled'];

  const handleResetSimulation = () => {
    setSimulatedRole(currentUser.role);
    setSimulatedPlanId(organization.planId);
    setSimulatedSubStatus(activeSubscription.subscription_status || organization.subscriptionStatus || 'active');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Sequence 10 — Feature Access Control Authorization Flow</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Strict 6-stage authorization pipeline enforcing user permissions, organization tenancy, subscription cadence, and plan entitlements with guaranteed data preservation.
          </p>
        </div>

        <button
          onClick={handleResetSimulation}
          className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Simulation</span>
        </button>
      </div>

      {/* 6-Stage Pipeline Graphic */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block">
          Live Authorization Flow Trace: User &rarr; Organization &rarr; Subscription &rarr; Plan &rarr; Entitlement &rarr; Access Decision
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          {/* Stage 1: User */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.flowTrace.user.passed
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">1. User</span>
              {currentDecision.flowTrace.user.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
            <div className="font-bold text-white truncate text-xs">{simulatedUser.name}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate capitalize mt-0.5">{simulatedUser.role}</div>
          </div>

          {/* Stage 2: Organization */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.flowTrace.organization.passed
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">2. Organization</span>
              {currentDecision.flowTrace.organization.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
            <div className="font-bold text-white truncate text-xs">{simulatedOrg.name}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{simulatedOrg.id}</div>
          </div>

          {/* Stage 3: Subscription */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.flowTrace.subscription.passed
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">3. Subscription</span>
              {currentDecision.flowTrace.subscription.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
            <div className="font-bold text-white truncate text-xs capitalize">{simulatedSubStatus}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{simulatedSub.id}</div>
          </div>

          {/* Stage 4: Plan */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.flowTrace.plan.passed
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">4. Plan</span>
              {currentDecision.flowTrace.plan.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
            <div className="font-bold text-white truncate text-xs">{PLAN_DISPLAY_NAMES[simulatedPlanId] || simulatedPlanId}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">Tier Score: {PLAN_TIER_ORDER[simulatedPlanId] ?? 0}</div>
          </div>

          {/* Stage 5: Entitlement */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.flowTrace.entitlement.passed
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-amber-950/50 border-amber-700/80 text-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">5. Entitlement</span>
              {currentDecision.flowTrace.entitlement.passed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <div className="font-bold text-white truncate text-xs">{currentDecision.featureName}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">Min: {currentDecision.flowTrace.entitlement.minPlanName}</div>
          </div>

          {/* Stage 6: Access Decision */}
          <div className={`p-3 rounded-xl border flex flex-col justify-between ${
            currentDecision.granted
              ? 'bg-emerald-950 border-emerald-600 text-emerald-300 shadow-sm'
              : 'bg-rose-950/60 border-rose-700 text-rose-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">6. Decision</span>
              {currentDecision.granted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            </div>
            <div className="font-extrabold text-xs truncate">
              {currentDecision.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </div>
            <div className="text-[9px] font-mono truncate mt-0.5 opacity-80">
              {currentDecision.flowTrace.decision.reasonCode}
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        {/* Select Feature */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 mb-1.5 block">
            Target Feature:
          </label>
          <select
            value={selectedFeature}
            onChange={(e) => setSelectedFeature(e.target.value as FeatureKey)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-600"
          >
            {allFeatures.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name} ({f.minPlanName}+)
              </option>
            ))}
          </select>
        </div>

        {/* Select Plan */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 mb-1.5 block">
            Simulated Plan:
          </label>
          <select
            value={simulatedPlanId}
            onChange={(e) => setSimulatedPlanId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-600"
          >
            {plans.map((p) => (
              <option key={p} value={p}>
                {PLAN_DISPLAY_NAMES[p] || p}
              </option>
            ))}
          </select>
        </div>

        {/* Select Role */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 mb-1.5 block">
            User Role:
          </label>
          <select
            value={simulatedRole}
            onChange={(e) => setSimulatedRole(e.target.value as UserRole)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-600"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Select Subscription Status */}
        <div>
          <label className="text-[11px] font-bold text-slate-300 mb-1.5 block">
            Subscription Status:
          </label>
          <select
            value={simulatedSubStatus}
            onChange={(e) => setSimulatedSubStatus(e.target.value as SubscriptionLifecycleStatus)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-600"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decision Summary & Data Preservation Guarantee */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        currentDecision.granted
          ? 'bg-emerald-950/30 border-emerald-800 text-slate-200'
          : 'bg-amber-950/30 border-amber-800/80 text-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                currentDecision.granted ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
              }`}>
                {currentDecision.granted ? 'Access Allowed' : 'Feature Unavailable'}
              </span>
              <span className="font-bold text-white text-sm">
                {currentDecision.featureName}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentDecision.explanation}
            </p>
          </div>

          {!currentDecision.granted && currentDecision.upgradeOption && (
            <button
              onClick={() => onUpgradePlan && onUpgradePlan(currentDecision.upgradeOption!.targetPlanId)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-md"
            >
              {currentDecision.upgradeOption.upgradeCtaText} (${currentDecision.upgradeOption.monthlyPriceUsd}/mo)
            </button>
          )}
        </div>

        {/* Data Preservation Verification */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-emerald-300">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Data Preserved:</strong> {currentDecision.preservedDataSummary}
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">
            No records deleted on tier changes
          </span>
        </div>
      </div>
    </div>
  );
};
