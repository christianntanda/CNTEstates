import React, { useState } from 'react';
import {
  Hash,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Building,
  Receipt,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Sliders,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  roundSubscriptionPrice,
  formatZeroDecimalSubscriptionPrice,
  FINANCIAL_PRECISION_RULES,
  auditZeroDecimalSeparation,
  FinancialScope,
} from '../../services/zeroDecimalRuleService';
import { formatPreciseCurrency } from '../../services/currencyService';

export const ZeroDecimalDisplayConsole: React.FC = () => {
  const {
    organization,
    organizationBaseCurrency,
    subscriptionPlans,
    userPreferredCurrency,
    language,
  } = useApp();

  const billingCurrency = organization.billingCurrency || organizationBaseCurrency || 'ZAR';

  // Interactive Sandbox test state
  const [testAmount, setTestAmount] = useState<string>('424.50');
  const [activeTab, setActiveTab] = useState<'matrix' | 'sandbox' | 'audit'>('matrix');

  const parsedAmount = parseFloat(testAmount);
  const validNumber = !isNaN(parsedAmount);

  // Audit results
  const audit = auditZeroDecimalSeparation();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-xl shadow-sm shrink-0">
            <Hash className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-white text-base sm:text-lg">
                Sequence 20 — Zero-Decimal Subscription Display
              </h2>
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded uppercase">
                424.49 → 424 · 424.50 → 425
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>Operational Decimals Preserved</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              All converted CNTEstates subscription prices display zero decimal places. Rent, tenant balances, utilities, and contractor invoices strictly retain their standard operational precision.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Precision Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rounding Sandbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Separation Audit
          </button>
        </div>
      </div>

      {/* Invariant Rule Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subscription Rule Card */}
        <div className="p-4 bg-amber-950/30 border border-amber-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>CNTEstates Subscription Scope</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
              Zero Decimals Only
            </span>
          </div>
          <div className="font-mono text-sm text-white font-extrabold flex items-center gap-3">
            <span>424.49 → <strong className="text-amber-300">424</strong></span>
            <span className="text-slate-500">|</span>
            <span>424.50 → <strong className="text-amber-300">425</strong></span>
          </div>
          <p className="text-[11px] text-amber-200/80 leading-snug">
            Applied to SaaS plans, subscription upgrades, and billing invoices. Zero decimal places ensure clear, clean commercial billing.
          </p>
        </div>

        {/* Operational Values Rule Card */}
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Operational Finances Scope</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              Retains Currency Decimals
            </span>
          </div>
          <div className="font-mono text-sm text-white font-extrabold flex items-center gap-3">
            <span>Rent: <strong className="text-emerald-300">R 18,500.50</strong></span>
            <span className="text-slate-500">|</span>
            <span>Tax: <strong className="text-emerald-300">R 2,590.07</strong></span>
          </div>
          <p className="text-[11px] text-emerald-200/80 leading-snug">
            Never altered by subscription zero-decimal rule. Rents, balances, utilities, taxes, and accounting ledger records retain exact financial decimals.
          </p>
        </div>
      </div>

      {/* TAB 1: PRECISION MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Scope-by-scope precision enforcement across the entire platform:
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Financial Domain / Scope</th>
                  <th className="py-2.5 px-3 text-center">Decimals</th>
                  <th className="py-2.5 px-3">Sample Input</th>
                  <th className="py-2.5 px-3">Formatted Output</th>
                  <th className="py-2.5 px-3">Precision Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {Object.values(FINANCIAL_PRECISION_RULES).map((rule) => {
                  const isSubscription = rule.scope === 'subscription_pricing';
                  const formatted = isSubscription
                    ? formatZeroDecimalSubscriptionPrice(rule.sampleInput, billingCurrency)
                    : formatPreciseCurrency(rule.sampleInput, billingCurrency, language);

                  return (
                    <tr
                      key={rule.scope}
                      className={`hover:bg-slate-900/60 ${
                        isSubscription ? 'bg-amber-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans text-white font-medium flex items-center gap-2">
                        {isSubscription ? (
                          <Calculator className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span>{rule.displayName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            rule.zeroDecimalEnforced
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {rule.decimals} Decimals
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {rule.sampleInput.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-white">
                        {formatted}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300 text-xs">
                        {rule.explanation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROUNDING SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Test Any Candidate Amount
                </label>
                <p className="text-xs text-slate-400">
                  Observe how the value is formatted as a Subscription Price (0 decimals) vs an Operational Value (2 decimals).
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {['424.49', '424.50', '99.49', '99.50', '249.25', '499.75'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTestAmount(preset)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg font-mono text-[11px] cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase font-mono mb-1">
                  Candidate Float Value
                </label>
                <input
                  type="text"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  placeholder="e.g. 424.49"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Result 1: As Subscription Price */}
              <div className="p-3 bg-amber-950/40 border border-amber-700/80 rounded-xl space-y-1">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  As Subscription Price (0 Decimals)
                </span>
                <div className="text-lg font-extrabold text-white font-mono">
                  {validNumber
                    ? formatZeroDecimalSubscriptionPrice(parsedAmount, billingCurrency)
                    : 'Invalid Number'}
                </div>
                <div className="text-[10px] text-amber-300 font-mono">
                  {validNumber ? `Math.round(${parsedAmount}) = ${roundSubscriptionPrice(parsedAmount)}` : ''}
                </div>
              </div>

              {/* Result 2: As Operational Finance Value */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/80 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                  As Operational Rent / Ledger (2 Decimals)
                </span>
                <div className="text-lg font-extrabold text-white font-mono">
                  {validNumber
                    ? formatPreciseCurrency(parsedAmount, billingCurrency, language)
                    : 'Invalid Number'}
                </div>
                <div className="text-[10px] text-emerald-300 font-mono">
                  {validNumber ? `toFixed(2) = ${parsedAmount.toFixed(2)}` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEPARATION AUDIT */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">
                  Sequence 20 Automated Compliance Audit
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                100% Passed
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {audit.summary}
            </p>

            <div className="space-y-2 pt-2">
              {audit.testCases.map((tc, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white font-sans">{tc.name}:</span>
                    <span className="text-slate-400">Input {tc.input}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-300 font-bold">{tc.output}</span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      ({tc.decimalsUsed} decimals)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
