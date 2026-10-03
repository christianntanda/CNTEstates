import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  Truck,
  HardHat,
  FileCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Send,
  ShieldCheck,
  Star,
  Square,
  CheckSquare,
} from 'lucide-react';

export const ContractorPortalView: React.FC = () => {
  const {
    t,
    contractors,
    workOrders,
    rfqs,
    submitContractorQuote,
    updateWorkOrderStatus,
    toggleWorkOrderChecklist,
    currency,
    language,
    currentUser,
  } = useApp();

  const contractor =
    contractors.find((c) => c.id === currentUser.contractorCompanyId) || contractors[0]; // Apex HVAC by default

  const assignedWOs = workOrders.filter(
    (wo) => wo.contractorId === contractor.id || wo.assignedTo.includes(contractor.companyName)
  );

  const openRFQs = rfqs.filter((r) => r.status === 'open' || r.status === 'quotes_received');

  // Submit quote modal state
  const [selectedRFQForQuote, setSelectedRFQForQuote] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<number>(1250);
  const [quoteDays, setQuoteDays] = useState<number>(3);
  const [quoteNotes, setQuoteNotes] = useState('');

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRFQForQuote) return;

    submitContractorQuote(
      selectedRFQForQuote,
      contractor.id,
      contractor.companyName,
      Number(quoteAmount),
      Number(quoteDays),
      quoteNotes || 'Standard certified trade proposal with OEM replacement parts.'
    );

    setSelectedRFQForQuote(null);
    setQuoteNotes('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Contractor Header */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-6 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {t.contractorPortal.title}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{contractor.companyName}</h1>
          <p className="text-xs text-slate-300">
            Primary Contact: {contractor.contactPerson} · Trades: {contractor.trades.join(', ')}
          </p>
        </div>

        {/* Credentials & Score */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-2 rounded-xl text-xs">
            <span className="text-[10px] text-slate-400 uppercase block">Quality Score</span>
            <div className="flex items-center gap-1 font-bold text-amber-400 text-sm">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{contractor.rating} / 5.0</span>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 px-3 py-2 rounded-xl text-xs">
            <span className="text-[10px] text-slate-400 uppercase block">SLA Compliance</span>
            <span className="font-bold text-emerald-400 text-sm">{contractor.slaComplianceRate}%</span>
          </div>
        </div>
      </div>

      {/* Assigned Work Orders Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-amber-400" />
          <span>{t.contractorPortal.activeJobs} ({assignedWOs.length})</span>
        </h2>

        {assignedWOs.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            No work orders currently dispatched to your firm.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedWOs.map((wo) => (
              <div
                key={wo.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-amber-400">{wo.workOrderNumber}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded text-amber-400 bg-amber-950 border border-amber-900">
                      {wo.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100">{wo.title}</h3>
                  <p className="text-xs text-slate-400">{wo.description}</p>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Target: {wo.propertyName} {wo.unitNumber && `(Unit ${wo.unitNumber})`}
                  </div>

                  {/* Checklist */}
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Field Checklist:</span>
                    {wo.checklist.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleWorkOrderChecklist(wo.id, idx)}
                        className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className={item.completed ? 'line-through text-slate-500' : ''}>
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase">Contract Value</span>
                    <span className="font-bold text-slate-100">
                      {formatCurrency(wo.totalCost, currency, language)}
                    </span>
                  </div>

                  {wo.status !== 'completed' && (
                    <button
                      onClick={() => updateWorkOrderStatus(wo.id, 'completed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors"
                    >
                      {t.contractorPortal.uploadInvoice}
                    </button>
                  )}
                  {wo.status === 'completed' && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open RFQs for Bidding */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          <span>{t.contractorPortal.openRfqs}</span>
        </h2>

        <div className="space-y-3">
          {openRFQs.map((rfq) => {
            const hasBid = rfq.quotes.some((q) => q.contractorId === contractor.id);

            return (
              <div
                key={rfq.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-bold text-emerald-400">[{rfq.rfqNumber}]</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300 font-semibold">{rfq.serviceCategory}</span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm">{rfq.title}</h3>
                  <p className="text-xs text-slate-400">{rfq.description}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Property: {rfq.propertyName} · Deadline: {rfq.deadline}
                  </div>
                </div>

                <div className="shrink-0">
                  {hasBid ? (
                    <span className="text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Quotation Submitted</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedRFQForQuote(rfq.id)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.contractorPortal.submitQuote}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Submission Modal */}
      {selectedRFQForQuote && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <span>Submit Competitive Quotation</span>
            </h3>

            <form onSubmit={handleSubmitQuote} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Total Bid Amount ({currency}) *</label>
                  <input
                    type="number"
                    required
                    min="50"
                    step="50"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Est. Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteDays}
                    onChange={(e) => setQuoteDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Proposal Scope & Warranty Addendum</label>
                <textarea
                  rows={3}
                  placeholder="Outline materials, OEM parts used, safety standards..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRFQForQuote(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  Transmit Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
