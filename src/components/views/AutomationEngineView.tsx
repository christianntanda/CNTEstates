import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Plus,
  Zap,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AutomationEngineView: React.FC = () => {
  const { automationRules, toggleAutomationRule } = useApp();
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span>Operational Automation Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Autonomous event-driven workflows: Trigger → Condition → Action. Eliminates manual operational friction.
          </p>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="space-y-4">
        {automationRules.map((rule) => (
          <div
            key={rule.id}
            className={`p-5 rounded-xl border transition-all ${
              rule.isActive
                ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                : 'bg-slate-900/50 border-slate-800/60 opacity-70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    rule.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{rule.name}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Executions: <strong className="text-slate-300 font-mono">{rule.executionCount}</strong></span>
                    {rule.lastTriggered && (
                      <>
                        <span>·</span>
                        <span>Last run: {rule.lastTriggered}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Toggle Button */}
              <button
                onClick={() => toggleAutomationRule(rule.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer ${
                  rule.isActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                }`}
              >
                {rule.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{rule.isActive ? 'Active & Monitoring' : 'Workflow Paused'}</span>
              </button>
            </div>

            {/* Workflow Pipeline Sequence */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block font-bold">
                  1. When (Trigger)
                </span>
                <p className="text-slate-200 mt-1 font-medium">{rule.trigger}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block font-bold">
                  2. If (Condition)
                </span>
                <p className="text-slate-200 mt-1 font-medium">{rule.condition}</p>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider block font-bold">
                  3. Then (Action)
                </span>
                <p className="text-slate-200 mt-1 font-medium">{rule.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
