import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Check,
  Lock,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Zap,
  Info,
  Server,
  Building,
  Key,
  Users,
  Award,
  CalendarClock,
  Clock,
  Send,
  Truck,
  ExternalLink,
  LifeBuoy,
  Receipt,
  FileSpreadsheet,
  CheckSquare,
  Globe,
  Calculator,
  Shield,
  FileCode,
  Archive,
  Cpu,
  FileCheck,
  Database,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import {
  FeatureKey,
  FeatureCategory,
  FeatureDefinition,
  SubscriptionPlanId,
} from '../../types';
import {
  getAllFeatureDefinitions,
  getFeaturesByCategory,
  CATEGORY_METADATA,
  PLAN_DISPLAY_NAMES,
  PLAN_TIER_ORDER,
  isFeatureEntitled,
  checkFeatureEntitlement,
  getComparativeFeatureMatrix,
} from '../../services/featureEntitlementEngine';

interface FeatureEntitlementDashboardProps {
  currentPlanId: string;
  onUpgradePlan?: (targetPlanId: string) => void;
  onSimulatePlanChange?: (simulatedPlanId: string) => void;
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  Users,
  LifeBuoy,
  Receipt,
  ExternalLink,
  Truck,
  Clock,
  Send,
  CalendarClock,
  Zap,
  BarChart3,
  Archive,
  Sparkles,
  FileSpreadsheet,
  CheckSquare,
  Award,
  Globe,
  Calculator,
  Shield,
  FileCode,
  Cpu,
  Server,
  FileCheck,
  Database,
  Key,
  ShieldAlert,
};

export const FeatureEntitlementDashboard: React.FC<FeatureEntitlementDashboardProps> = ({
  currentPlanId,
  onUpgradePlan,
  onSimulatePlanChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedPlan, setSimulatedPlan] = useState<string>(currentPlanId);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [selectedFeatureDetail, setSelectedFeatureDetail] = useState<FeatureDefinition | null>(null);

  // Keep simulatedPlan in sync if currentPlanId changes and user hasn't explicitly simulated
  const effectivePlan = simulatedPlan || currentPlanId;

  const allFeatures = useMemo(() => getAllFeatureDefinitions(), []);
  const comparativeMatrix = useMemo(() => getComparativeFeatureMatrix(), []);

  const plansList = ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'];

  // Filter features based on search and category
  const filteredFeatures = useMemo(() => {
    return allFeatures.filter((f) => {
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.minPlanName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allFeatures, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = allFeatures.length;
    const entitled = allFeatures.filter((f) => isFeatureEntitled(effectivePlan, f.key)).length;
    const locked = total - entitled;
    const percentage = Math.round((entitled / total) * 100);
    return { total, entitled, locked, percentage };
  }, [allFeatures, effectivePlan]);

  const handlePlanSelect = (p: string) => {
    setSimulatedPlan(p);
    if (onSimulatePlanChange) {
      onSimulatePlanChange(p);
    }
  };

  const handleUpgrade = (targetPlanId: string) => {
    if (onUpgradePlan) {
      onUpgradePlan(targetPlanId);
    } else {
      const el = document.getElementById('available-subscription-plans');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Centralized Feature Entitlement Engine</span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono border border-slate-700">
                Sequence 09
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Authoritative platform feature access matrix. Plan checks are centralized in the entitlement engine to guarantee reliable role and subscription enforcement across the entire application.
          </p>
        </div>

        {/* View Switcher & Entitlement Metric Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Active Tier:</span>
            <span className="font-bold text-white capitalize font-mono">
              {PLAN_DISPLAY_NAMES[effectivePlan] || effectivePlan}
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded text-[11px] border border-emerald-900 font-mono">
              {stats.entitled} / {stats.total} Features
            </span>
          </div>

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Plan Simulation Bar */}
      <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-slate-300">Test Plan Entitlements Simulator:</span>
            <span className="text-slate-500">Preview feature availability under different platform tiers</span>
          </div>
          {effectivePlan !== currentPlanId && (
            <button
              onClick={() => handlePlanSelect(currentPlanId)}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Reset to active organization plan ({PLAN_DISPLAY_NAMES[currentPlanId]})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {plansList.map((p) => {
            const isSelected = effectivePlan === p;
            const isActualOrgPlan = currentPlanId === p;
            return (
              <button
                key={p}
                onClick={() => handlePlanSelect(p)}
                className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold capitalize">
                    {PLAN_DISPLAY_NAMES[p] || p}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {isActualOrgPlan ? 'Current Active' : `Tier ${PLAN_TIER_ORDER[p]}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search features (e.g. sla, rfq, erp, copilot, portal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
            }`}
          >
            All Categories ({allFeatures.length})
          </button>
          {Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => {
            const count = allFeatures.filter((f) => f.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey as FeatureCategory)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
                }`}
              >
                {meta.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1: Grid Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => {
              const entitled = isFeatureEntitled(effectivePlan, feature.key);
              const result = checkFeatureEntitlement(effectivePlan, feature.key);
              const IconComponent = FEATURE_ICONS[feature.icon] || Layers;

              return (
                <div
                  key={feature.key}
                  className={`rounded-2xl border p-4 transition-all flex flex-col justify-between relative overflow-hidden ${
                    entitled
                      ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/80 opacity-85 hover:opacity-100 hover:border-amber-900/50'
                  }`}
                >
                  {/* Status Indicator Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      entitled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  />

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            entitled
                              ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-400'
                              : 'bg-slate-900 border border-slate-800 text-slate-500'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-tight">
                            {feature.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {feature.key}
                          </span>
                        </div>
                      </div>

                      {/* Entitled / Locked Pill */}
                      {entitled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                          <Check className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800 shrink-0">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{feature.minPlanName}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {feature.shortDescription}
                    </p>

                    <div className="pt-2 border-t border-slate-800/70 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Category:</span>
                        <span className="text-slate-300 font-medium">{feature.categoryName}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Minimum Plan:</span>
                        <span className="font-semibold text-emerald-400 font-mono">
                          {feature.minPlanName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Action */}
                  <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedFeatureDetail(feature)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3 h-3 text-slate-400" />
                      <span>Specifications</span>
                    </button>

                    {!entitled && (
                      <button
                        onClick={() => handleUpgrade(feature.minPlan)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 cursor-pointer bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800 px-2 py-1 rounded-lg transition-colors"
                      >
                        <span>Upgrade</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFeatures.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
              No features found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Full Matrix Table View */}
      {viewMode === 'matrix' && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Feature Name & Key</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Min Plan</th>
                  {plansList.map((p) => {
                    const isSelected = effectivePlan === p;
                    return (
                      <th
                        key={p}
                        className={`py-3 px-3 text-center ${
                          isSelected ? 'bg-emerald-950/80 text-emerald-300 font-bold' : ''
                        }`}
                      >
                        {PLAN_DISPLAY_NAMES[p] || p}
                        {isSelected && <div className="text-[9px] text-emerald-400 font-sans normal-case">(Active)</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {filteredFeatures.map((feature) => {
                  return (
                    <tr
                      key={feature.key}
                      className="hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-sans">
                        <div className="font-semibold text-slate-100">{feature.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{feature.key}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">
                        {feature.categoryName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                        {feature.minPlanName}
                      </td>

                      {plansList.map((p) => {
                        const entitled = isFeatureEntitled(p, feature.key);
                        const isSelectedCol = effectivePlan === p;
                        return (
                          <td
                            key={p}
                            className={`py-2.5 px-3 text-center ${
                              isSelectedCol ? 'bg-emerald-950/30' : ''
                            }`}
                          >
                            {entitled ? (
                              <span className="inline-flex p-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="inline-flex p-1 rounded-full bg-slate-900 text-slate-600 border border-slate-800">
                                <Lock className="w-3 h-3 text-slate-600" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature Specification Modal */}
      {selectedFeatureDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setSelectedFeatureDetail(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                  {selectedFeatureDetail.categoryName}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedFeatureDetail.name}
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Key: {selectedFeatureDetail.key}
                </span>
              </div>
              <button
                onClick={() => setSelectedFeatureDetail(null)}
                className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Detailed Operational Architecture
                </span>
                <p className="mt-1 leading-relaxed text-slate-200">
                  {selectedFeatureDetail.detailedDescription}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block">
                  Commercial Business Value
                </span>
                <p className="mt-1 text-emerald-300 leading-relaxed">
                  {selectedFeatureDetail.businessValue}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">
                    Minimum Plan
                  </span>
                  <span className="font-bold text-emerald-400">
                    {selectedFeatureDetail.minPlanName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">
                    Your Current Tier
                  </span>
                  <span className="font-bold text-white capitalize">
                    {PLAN_DISPLAY_NAMES[effectivePlan] || effectivePlan}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedFeatureDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {!isFeatureEntitled(effectivePlan, selectedFeatureDetail.key) && (
                <button
                  onClick={() => {
                    handleUpgrade(selectedFeatureDetail.minPlan);
                    setSelectedFeatureDetail(null);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Upgrade to {selectedFeatureDetail.minPlanName}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
