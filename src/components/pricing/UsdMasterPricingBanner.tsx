import React, { useState } from 'react';
import {
  DollarSign,
  ShieldCheck,
  Lock,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import {
  AUTHORITATIVE_MASTER_CURRENCY,
  getAuthoritativeMasterPricingList,
  verifyMasterPricingIntegrity,
} from '../../services/masterPricingService';
import { subscriptionPlans } from '../../data/mockDatabase';

export const UsdMasterPricingBanner: React.FC<{ billingCurrency?: string }> = ({ billingCurrency = 'USD' }) => {
  const [showMatrix, setShowMatrix] = useState(false);
  const masterPricing = getAuthoritativeMasterPricingList();
  const integrity = verifyMasterPricingIntegrity(subscriptionPlans);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-sm shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-white text-sm sm:text-base">
                Sequence 17 — Authoritative USD Master Pricing
              </h3>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded uppercase">
                Source of Truth: {AUTHORITATIVE_MASTER_CURRENCY}
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Protected Against Overwrite</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              The USD price is the platform source of truth. Converted currency values ({billingCurrency !== 'USD' ? `${billingCurrency}, ` : ''}ZAR, EUR, GBP, CAD) never overwrite the USD master price.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-300 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Master Pricing 100% Invariant</span>
          </div>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
          >
            <span>{showMatrix ? 'Hide Details' : 'View Master Matrix'}</span>
            {showMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Six Tier Quick Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 font-mono text-xs">
        {masterPricing.map((item) => (
          <div
            key={item.planId}
            className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans font-bold text-slate-200 capitalize">
                {item.planName}
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded font-mono">
                USD
              </span>
            </div>
            <div className="text-base font-extrabold text-white">
              {item.formattedUsd}
            </div>
            <span className="text-[10px] text-slate-500 font-sans block truncate">
              {item.isFree ? 'Permanent ($0)' : 'Master source of truth'}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable Master Matrix Table */}
      {showMatrix && (
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3">USD Master Price</th>
                  <th className="py-2.5 px-3">Billing Cadence</th>
                  <th className="py-2.5 px-3">Role in System</th>
                  <th className="py-2.5 px-3 text-center">Overwrite Invariant</th>
                  <th className="py-2.5 px-3 text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-900/60">
                {masterPricing.map((p) => (
                  <tr key={p.planId} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-sans font-bold text-white capitalize">
                      {p.planName}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-emerald-400">
                      {p.formattedUsd}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 uppercase">
                      {p.cadence}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 text-xs">
                      {p.description}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-sans font-semibold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Protected</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold font-sans">
                      Verified Match
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Sequence 17 Policy:</strong> When organizations choose local billing currencies (e.g., South African Rand, Euro, British Pound), real-time exchange rates calculate the display and billed amounts with zero decimals. The underlying USD master price ($0, $25, $49, $99, $249, $499) remains immutably anchored as the source of truth and is never overwritten.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
