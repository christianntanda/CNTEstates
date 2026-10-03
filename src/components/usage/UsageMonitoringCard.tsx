import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Home,
  Building as BuildingIcon,
  Layers,
  Users,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { ResourceUsageMetric } from '../../types';

interface UsageMonitoringCardProps {
  metric: ResourceUsageMetric;
  onUpgradeClick?: () => void;
}

export const UsageMonitoringCard: React.FC<UsageMonitoringCardProps> = ({
  metric,
  onUpgradeClick,
}) => {
  const getResourceIcon = () => {
    switch (metric.key) {
      case 'rentalUnits':
        return <Home className="w-4 h-4 text-emerald-400" />;
      case 'properties':
        return <BuildingIcon className="w-4 h-4 text-sky-400" />;
      case 'buildings':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'teamSeats':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'documentStorage':
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case 'aiPrompts':
        return <Cpu className="w-4 h-4 text-rose-400" />;
      default:
        return <Home className="w-4 h-4 text-emerald-400" />;
    }
  };

  // Color styles based on status
  const isReached = metric.isReached;
  const isApproaching = metric.isApproaching;
  const isUnlimited = metric.status === 'unlimited';

  const cardBorderClass = isReached
    ? 'border-red-500/60 bg-red-950/20 shadow-red-950/30'
    : isApproaching
    ? 'border-amber-500/60 bg-amber-950/20 shadow-amber-950/30'
    : 'border-slate-800 bg-slate-950/80';

  const progressColorClass = isReached
    ? 'bg-red-500'
    : isApproaching
    ? 'bg-amber-400'
    : 'bg-emerald-500';

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3.5 ${cardBorderClass}`}
    >
      {/* Header: Title and Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
            {getResourceIcon()}
          </div>
          <div>
            <h4 className="font-semibold text-slate-100 text-sm tracking-tight">{metric.name}</h4>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              Plan Controlled Resource
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isReached ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-900/60 text-red-200 border border-red-700/70 font-mono animate-pulse">
              <XCircle className="w-3 h-3 text-red-400" />
              LIMIT REACHED
            </span>
          ) : isApproaching ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-900/60 text-amber-200 border border-amber-600/70 font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              APPROACHING LIMIT
            </span>
          ) : isUnlimited ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-900/40 text-purple-300 border border-purple-700/50 font-mono">
              <CheckCircle2 className="w-3 h-3 text-purple-400" />
              UNLIMITED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              WITHIN LIMITS
            </span>
          )}
        </div>
      </div>

      {/* Main Display: Current Usage / Allowed Capacity */}
      <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/80">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-slate-400 font-medium">Current Usage / Allowed Capacity</span>
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {isUnlimited ? 'Unlimited' : `${metric.percentage}% Used`}
          </span>
        </div>

        {/* Prominent Example Display: Rental Units: 48 / 50 */}
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1.5">
            <span>{metric.currentUsage}</span>
            <span className="text-slate-500 font-normal text-lg">/</span>
            <span className={isReached ? 'text-red-400' : isApproaching ? 'text-amber-300' : 'text-slate-300'}>
              {metric.allowedCapacity === 'unlimited' ? '∞ Unlimited' : metric.allowedCapacity}
            </span>
            <span className="text-xs font-normal text-slate-400 ml-1 font-sans">{metric.unitLabel}</span>
          </div>

          {!isUnlimited && (
            <div className="text-right text-[11px] font-mono text-slate-400">
              {metric.remaining === 0 ? (
                <span className="text-red-400 font-bold">0 {metric.unitLabel} left</span>
              ) : (
                <span className={isApproaching ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                  {metric.remaining} {metric.unitLabel} free
                </span>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColorClass}`}
            style={{
              width: isUnlimited ? '15%' : `${Math.min(100, metric.percentage)}%`,
            }}
          />
        </div>
      </div>

      {/* Dynamic Warning Banner (When approaching limit) */}
      {isApproaching && metric.warningMessage && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/50 text-[11px] text-amber-200 flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-amber-100">Approaching Plan Limit</span>
            <p className="text-amber-300/90">{metric.warningMessage}</p>
          </div>
        </div>
      )}

      {/* Dynamic Limit Reached Explanation Banner (Explaining why cannot create additional resources) */}
      {isReached && metric.limitExplanation && (
        <div className="p-3 rounded-lg bg-red-950/50 border border-red-600/60 text-[11px] text-red-200 flex items-start gap-2.5 leading-relaxed">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <span className="font-bold block text-red-100 text-xs">Creation Blocked — Capacity Limit Exhausted</span>
            <p className="text-red-300/90 text-[11px]">{metric.limitExplanation}</p>

            {onUpgradeClick && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
              >
                <span>Upgrade to {metric.upgradeTargetPlanName || 'Next Tier'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
