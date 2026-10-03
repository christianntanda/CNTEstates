import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  XCircle,
  Building,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { CentralizedUsageMonitoring } from '../../types';
import { UsageMonitoringCard } from './UsageMonitoringCard';

interface UsageMonitoringDashboardProps {
  usageMonitoring: CentralizedUsageMonitoring;
  onUpgradePlan?: () => void;
  onSimulateScenario?: (scenario: 'normal' | 'approaching_units' | 'reached_units' | 'approaching_properties' | null) => void;
  currentSimulation?: string | null;
}

export const UsageMonitoringDashboard: React.FC<UsageMonitoringDashboardProps> = ({
  usageMonitoring,
  onUpgradePlan,
  onSimulateScenario,
  currentSimulation = null,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'portfolio' | 'extended'>('all');

  const {
    planName,
    overallStatus,
    resources,
    resourceList,
    hasWarnings,
    hasReachedLimits,
    activeWarnings,
    reachedLimitExplanations,
    perPropertyUnits,
  } = usageMonitoring;

  const filteredResources = resourceList.filter((r) => {
    if (filterCategory === 'portfolio') {
      return ['rentalUnits', 'properties', 'buildings'].includes(r.key);
    }
    if (filterCategory === 'extended') {
      return ['teamSeats', 'documentStorage', 'aiPrompts'].includes(r.key);
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6 text-slate-300">
      {/* Header with Title & Scenario Simulation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg tracking-tight">
              Subscription Usage Monitoring & Resource Capacity
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Authoritative centralized calculations for rental units, properties, buildings, and plan-controlled quotas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-slate-950 text-emerald-400 border border-slate-800 px-3 py-1 rounded-lg font-mono text-xs font-bold">
            Plan: {planName}
          </span>
          <span
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border ${
              overallStatus === 'reached'
                ? 'bg-red-950/80 text-red-300 border-red-800 animate-pulse'
                : overallStatus === 'approaching'
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
            }`}
          >
            {overallStatus === 'reached'
              ? 'LIMIT REACHED'
              : overallStatus === 'approaching'
              ? 'WARNING: APPROACHING LIMIT'
              : 'SYSTEM HEALTHY'}
          </span>
        </div>
      </div>

      {/* Interactive Verification & Simulation Strip (For Sequence 08 QA) */}
      {onSimulateScenario && (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Sequence 08 Verification Controls:</span>
            <span className="text-slate-400 hidden sm:inline">Test warning thresholds and limit explanations</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSimulateScenario('approaching_units')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                currentSimulation === 'approaching_units'
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-600/40'
              }`}
            >
              Simulate 48 / 50 Units (Warning)
            </button>
            <button
              type="button"
              onClick={() => onSimulateScenario('reached_units')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                currentSimulation === 'reached_units'
                  ? 'bg-red-500 text-white font-bold border-red-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-red-300 border-red-600/40'
              }`}
            >
              Simulate 50 / 50 Units (Blocked)
            </button>
            <button
              type="button"
              onClick={() => onSimulateScenario('approaching_properties')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                currentSimulation === 'approaching_properties'
                  ? 'bg-sky-500 text-white font-bold border-sky-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-sky-300 border-sky-600/40'
              }`}
            >
              Simulate Properties Warning
            </button>
            {currentSimulation && (
              <button
                type="button"
                onClick={() => onSimulateScenario(null)}
                className="px-2 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Alerts: Active Warnings & Explanations */}
      {(hasReachedLimits || hasWarnings) && (
        <div className="space-y-3">
          {hasReachedLimits && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/70 text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-100 text-sm">
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>Resource Creation Blocked — Active Limit Reached</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">
                One or more subscription capacity limits have been reached. The engine prevents adding new resources to maintain SLA and plan integrity.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-300 pt-1">
                {reachedLimitExplanations.map((exp, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasWarnings && !hasReachedLimits && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/60 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-100 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Capacity Warning — Approaching Plan Limits</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-300/90 pt-1">
                {activeWarnings.map((warn, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {warn}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Resources ({resourceList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('portfolio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterCategory === 'portfolio'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Core Portfolio (Units, Properties, Buildings)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('extended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterCategory === 'extended'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Extended Plan Resources (Seats, Vault, AI)
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Format: Current Usage / Allowed Capacity
        </span>
      </div>

      {/* Grid of Centralized Resource Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((metric) => (
          <UsageMonitoringCard
            key={metric.key}
            metric={metric}
            onUpgradeClick={onUpgradePlan}
          />
        ))}
      </div>

      {/* Per-Property Breakdown (Vital for Professional 60 Units/Property & General Operations) */}
      {perPropertyUnits && perPropertyUnits.length > 0 && (
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-400" />
              <h4 className="font-semibold text-slate-100 text-xs sm:text-sm">
                Property-Level Unit Allocation Breakdown
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Professional: 60 Units / Property Cap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {perPropertyUnits.map((prop) => (
              <div
                key={prop.propertyId}
                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                  prop.isReached
                    ? 'bg-red-950/30 border-red-700/60'
                    : prop.isApproaching
                    ? 'bg-amber-950/20 border-amber-600/50'
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-slate-100 truncate block">{prop.propertyName}</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      prop.isReached
                        ? 'text-red-400'
                        : prop.isApproaching
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {prop.displayUsage}
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      prop.isReached
                        ? 'bg-red-500'
                        : prop.isApproaching
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, prop.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{prop.remaining === 'unlimited' ? 'Unlimited free' : `${prop.remaining} slots free`}</span>
                  <span>{prop.isReached ? 'Limit Reached' : prop.isApproaching ? 'Approaching Limit' : 'Within Limits'}</span>
                </div>

                {prop.isApproaching && prop.warningMessage && (
                  <p className="text-[10px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-700/40">
                    {prop.warningMessage}
                  </p>
                )}

                {prop.isReached && prop.limitExplanation && (
                  <p className="text-[10px] text-red-300 bg-red-950/60 p-1.5 rounded border border-red-700/50">
                    {prop.limitExplanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
