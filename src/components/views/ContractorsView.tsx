import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  Truck,
  HardHat,
  FileCheck,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { FeatureGate } from '../entitlements/FeatureGate';

export const ContractorsView: React.FC = () => {
  const { contractors, rfqs, currency, language, awardRFQQuote, setActiveTab } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'contractors' | 'rfqs'>('contractors');
  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);

  const activeRFQ = selectedRFQId ? rfqs.find((r) => r.id === selectedRFQId) : rfqs[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-400" />
            <span>Contractor Ecosystem & RFQ Bidding</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Vetted trade contractor directory, active insurance policies, SLA performance ratings, and competitive quote matrix.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTabSub('contractors')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'contractors'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contractor Directory ({contractors.length})
          </button>
          <button
            onClick={() => setActiveTabSub('rfqs')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'rfqs'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RFQs & Quotes ({rfqs.length})
          </button>
        </div>
      </div>

      {/* Sub-view: Contractor Directory */}
      {activeTabSub === 'contractors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contractors.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-4 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-base">{c.companyName}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-semibold uppercase">
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold font-mono">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{c.rating}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>Contact: <strong className="text-slate-200">{c.contactPerson}</strong></div>
                  <div>Phone: {c.phone} · {c.email}</div>
                  <div>License: {c.licenseNumber}</div>
                </div>

                {/* Trades */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.trades.map((t, i) => (
                    <span
                      key={i}
                      className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metrics & Performance Strip */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">SLA Compliance</span>
                  <span className="font-bold text-emerald-400 text-sm">{c.slaComplianceRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Standard Rate</span>
                  <span className="font-bold text-slate-100 text-sm">
                    {formatCurrency(c.hourlyRate, currency, language)}/hr
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Jobs</span>
                  <span className="font-bold text-slate-200 text-sm">{c.activeWorkOrdersCount}</span>
                </div>
              </div>

              {/* Verified Insurance Footer */}
              <div className="flex items-center justify-between text-xs pt-1 text-slate-400 border-t border-slate-800/80">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Insurance Valid: {formatDate(c.insuranceValidUntil, language)}</span>
                </span>
                <button
                  onClick={() => setActiveTab('contractorPortal')}
                  className="text-xs text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Portal View &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-view: RFQ & Quote Comparison Matrix */}
      {activeTabSub === 'rfqs' && (
        <FeatureGate feature="rfq_management" onUpgrade={() => setActiveTab('subscription')}>
          {activeRFQ && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">[{activeRFQ.rfqNumber}]</span>
                      <h3 className="font-bold text-slate-100 text-base">{activeRFQ.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Location: {activeRFQ.propertyName} · Category: {activeRFQ.serviceCategory} · Bidding Deadline: {activeRFQ.deadline}
                    </p>
                  </div>

                  <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded self-start sm:self-auto text-amber-400 bg-amber-950/60 border border-amber-900">
                    {activeRFQ.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded border border-slate-700/60">
                  {activeRFQ.description}
                </p>
              </div>

              {/* Quotes Comparison Matrix */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Side-by-Side Competitive Quote Comparison</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRFQ.quotes.map((quote, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border space-y-3 transition-all ${
                        quote.status === 'accepted'
                          ? 'border-emerald-500 bg-emerald-950/20'
                          : 'border-slate-800 bg-slate-850/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-100 text-sm">{quote.contractorName}</h5>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            quote.status === 'accepted'
                              ? 'text-emerald-400 bg-emerald-950'
                              : 'text-amber-400 bg-amber-950'
                          }`}
                        >
                          {quote.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-y border-slate-700/50">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Quoted Amount</span>
                          <span className="text-base font-bold text-emerald-400">
                            {formatCurrency(quote.amount, currency, language)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Est. Duration</span>
                          <span className="text-base font-bold text-slate-100">{quote.estimatedDays} Days</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 italic">"{quote.notes}"</p>

                      <div className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400">Submitted: {quote.submittedAt}</span>
                        {quote.status === 'pending' && (
                          <button
                            onClick={() => awardRFQQuote(activeRFQ.id, idx)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition-colors"
                          >
                            Accept & Award Contract
                          </button>
                        )}
                        {quote.status === 'accepted' && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Contract Awarded</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </FeatureGate>
      )}
    </div>
  );
};
