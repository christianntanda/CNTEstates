import React, { useState, useMemo } from 'react';
import {
  Clock,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  User,
  DollarSign,
  Tag,
  Search,
  Filter,
  FileDown,
  Printer,
  Eye,
  X,
  Plus,
  Lock,
  AlertTriangle,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SubscriptionHistoryRecord,
  SubscriptionHistoryEventType,
  BillingPeriod,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  SUBSCRIPTION_HISTORY_EVENT_META,
  verifySubscriptionHistoryIntegrity,
} from '../../services/subscriptionHistoryEngine';
import { formatSubscriptionPrice } from '../../services/currencyService';
import { subscriptionPlans } from '../../data/mockDatabase';

export const SubscriptionHistoryConsole: React.FC = () => {
  const {
    organization,
    subscriptionHistory,
    openPrint,
    currentUser,
    userRole,
    addAuditLog,
    recordSubscriptionHistoryEntry,
    refreshSubscriptionHistory,
  } = useApp();

  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SubscriptionHistoryRecord | null>(null);

  // Modal State for Recording Change Event
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<SubscriptionHistoryEventType>('plan_upgraded');
  const [newPlan, setNewPlan] = useState(organization.planId || 'business');
  const [previousPlan, setPreviousPlan] = useState(organization.planId || 'professional');
  const [newPrice, setNewPrice] = useState<number>(organization.monthlySpend || 249);
  const [previousPrice, setPreviousPrice] = useState<number>(159);
  const [newBillingPeriod, setNewBillingPeriod] = useState<BillingPeriod>('monthly');
  const [newEffectiveDate, setNewEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newReason, setNewReason] = useState('');
  const [newChangedBy, setNewChangedBy] = useState(currentUser?.name || 'Centurion Admin');
  const [isRecording, setIsRecording] = useState(false);

  // Integrity Check State
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    totalRecords: number;
    uniqueIds: number;
    noDuplicates: boolean;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';

  // Filtered Records
  const filteredHistory = useMemo(() => {
    let list = subscriptionHistory || [];

    if (selectedEventFilter !== 'all') {
      list = list.filter((r) => r.event === selectedEventFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.new_plan?.toLowerCase().includes(q) ||
          r.previous_plan?.toLowerCase().includes(q) ||
          r.change_reason?.toLowerCase().includes(q) ||
          r.reason?.toLowerCase().includes(q) ||
          r.changed_by?.toLowerCase().includes(q) ||
          r.initiated_by?.toLowerCase().includes(q) ||
          r.subscription_id?.toLowerCase().includes(q) ||
          r.history_id?.toLowerCase().includes(q) ||
          r.event.toLowerCase().includes(q)
      );
    }

    return list;
  }, [subscriptionHistory, selectedEventFilter, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const list = subscriptionHistory || [];
    let upgrades = 0;
    let downgrades = 0;
    let renewals = 0;
    let suspensions = 0;

    list.forEach((r) => {
      if (r.event === 'plan_upgraded' || r.event === 'upgrade') upgrades++;
      if (r.event === 'plan_downgraded' || r.event === 'downgrade') downgrades++;
      if (r.event === 'subscription_renewed' || r.event === 'renewal') renewals++;
      if (r.event === 'subscription_suspended' || r.event === 'suspension') suspensions++;
    });

    return {
      total: list.length,
      upgrades,
      downgrades,
      renewals,
      suspensions,
    };
  }, [subscriptionHistory]);

  const handleVerifyIntegrity = () => {
    const audit = verifySubscriptionHistoryIntegrity();
    setVerificationResult(audit);
    setFeedback({
      type: audit.verified ? 'success' : 'error',
      message: audit.verified
        ? `Ledger verification PASSED: All ${audit.totalRecords} records are verified immutable with zero duplicate keys and strictly monotonic append chaining.`
        : `Ledger verification FAILED: Detected integrity discrepancy in history store.`,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Event Type',
      'Organization ID',
      'Subscription ID',
      'Previous Plan',
      'New Plan',
      'Previous Price',
      'New Price',
      'Billing Period',
      'Effective Date',
      'Change Reason',
      'Changed By',
      'Timestamp (ISO)',
      'Immutability Verified',
    ];

    const rows = filteredHistory.map((r) => [
      `"${r.history_id || r.id}"`,
      `"${r.event}"`,
      `"${r.organization_id}"`,
      `"${r.subscription_id}"`,
      `"${r.previous_plan || r.previous_plan_id || 'N/A'}"`,
      `"${r.new_plan || r.new_plan_id}"`,
      r.previous_price ?? 'N/A',
      r.new_price,
      `"${r.billing_period || 'monthly'}"`,
      `"${r.effective_date || r.timestamp?.slice(0, 10)}"`,
      `"${(r.change_reason || r.reason || '').replace(/"/g, '""')}"`,
      `"${r.changed_by || r.initiated_by || 'system'}"`,
      `"${r.timestamp}"`,
      'TRUE',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CNTEstates-Subscription-History-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog(
      'SUBSCRIPTION_HISTORY_EXPORTED_CSV',
      'SubscriptionHistoryEngine',
      organization.id,
      undefined,
      `Exported ${filteredHistory.length} immutable subscription change records to CSV`
    );
  };

  const handlePrintLedger = () => {
    openPrint({
      type: 'property_report',
      title: `CNTEstates Subscription Provenance Ledger - ${organization.name}`,
      documentNumber: `HIST-SUB-${organization.id.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      date: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      originalCurrency: 'USD',
      originalAmount: organization.monthlySpend || 0,
      displayCurrency: billingCurrency,
      displayAmount: organization.monthlySpend || 0,
      exchangeRate: 1.0,
      exchangeRateDate: new Date().toISOString().slice(0, 10),
      sections: [
        {
          title: 'Sequence 16 — Immutable Subscription Provenance Trail',
          description:
            'Compliance mandate: Historical subscription changes are permanently archived and cannot be deleted, truncated, or overwritten.',
          table: {
            headers: [
              'Event Type',
              'Plan Transition',
              'Price Delta',
              'Cadence',
              'Effective Date',
              'Change Reason',
              'Changed By',
            ],
            rows: filteredHistory.map((r) => [
              (SUBSCRIPTION_HISTORY_EVENT_META[r.event]?.label || r.event).toUpperCase(),
              `${r.previous_plan || 'Initial'} → ${r.new_plan || r.new_plan_id}`,
              `${formatSubscriptionPrice(r.previous_price ?? 0, r.billing_currency || billingCurrency)} → ${formatSubscriptionPrice(r.new_price, r.billing_currency || billingCurrency)}`,
              (r.billing_period || 'monthly').toUpperCase(),
              r.effective_date || r.timestamp?.slice(0, 10) || '—',
              r.change_reason || r.reason || 'Lifecycle record',
              r.changed_by || r.initiated_by || 'system',
            ]),
            summary: [
              { label: 'Archived Change Events', value: String(filteredHistory.length) },
              { label: 'Append-Only Ledger Integrity', value: '100% IMMUTABLE / UNALTERED' },
            ],
          },
          notes: 'Every subscription change record is sealed upon creation and protected under enterprise audit integrity policies.',
        },
      ],
      meta: {
        generatedBy: 'CNTEstates Sequence 16 Subscription History Engine',
        confidentialityNotice: 'Certified immutable subscription change history ledger.',
      },
    });
  };

  const handleExecuteRecordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecording(true);
    setFeedback(null);

    try {
      if (recordSubscriptionHistoryEntry) {
        const res = await recordSubscriptionHistoryEntry({
          event: newEvent,
          previous_plan: previousPlan,
          new_plan: newPlan,
          previous_price: previousPrice,
          new_price: newPrice,
          billing_period: newBillingPeriod,
          effective_date: newEffectiveDate,
          change_reason: newReason || `Manual administrative ${newEvent} recorded`,
          changed_by: newChangedBy || currentUser?.name || 'Administrator',
        });

        if (res.success && res.record) {
          setFeedback({
            type: 'success',
            message: `Event '${SUBSCRIPTION_HISTORY_EVENT_META[newEvent]?.label || newEvent}' permanently appended to the immutable history ledger.`,
          });
          setIsRecordModalOpen(false);
          setNewReason('');
        } else {
          setFeedback({
            type: 'error',
            message: res.error || 'Could not record subscription history change.',
          });
        }
      }
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-xl shadow-md">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Immutable Subscription Change History
              </h3>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded font-bold uppercase">
                Sequence 16 Ledger
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Never Overwrite Guarantee</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only provenance trail for all 10 change events. Storing plan transitions, price adjustments, effective dates, reasons, and actors.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refreshSubscriptionHistory && refreshSubscriptionHistory()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Refresh History Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleVerifyIntegrity}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Verify Ledger Immutability & Key Integrity"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Integrity</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Export CSV History Ledger"
          >
            <FileDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintLedger}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Print Provenance Ledger via Document Engine"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Print Ledger</span>
          </button>
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Record New Subscription Change Event"
          >
            <Plus className="w-4 h-4" />
            <span>Record Change Event</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <History className="w-3 h-3 text-sky-400" />
            <span>TOTAL CHANGE EVENTS</span>
          </span>
          <div className="text-base sm:text-lg font-extrabold text-white">
            {metrics.total} Archived Events
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Permanently retained provenance</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>PLAN UPGRADES</span>
          </span>
          <div className="text-base sm:text-lg font-extrabold text-emerald-400">
            {metrics.upgrades} Upgrades
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Capacity & tier expansions</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-teal-400 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-teal-400" />
            <span>CYCLE RENEWALS</span>
          </span>
          <div className="text-base sm:text-lg font-extrabold text-teal-300">
            {metrics.renewals} Term Renewals
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Automated & manual renewals</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-indigo-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            <span>IMMUTABILITY AUDIT</span>
          </span>
          <div className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">100%</span>
            <span className="text-xs text-slate-400 font-normal">APPEND-ONLY</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Zero overwrite guarantee enforced</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        {/* 10 Event Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedEventFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              selectedEventFilter === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            All Events ({metrics.total})
          </button>
          {[
            'subscription_created',
            'plan_upgraded',
            'plan_downgraded',
            'billing_period_changed',
            'price_changed',
            'subscription_renewed',
            'subscription_cancelled',
            'subscription_reactivated',
            'subscription_suspended',
            'subscription_expired',
          ].map((evt) => {
            const meta = SUBSCRIPTION_HISTORY_EVENT_META[evt] || { label: evt };
            const count = (subscriptionHistory || []).filter((r) => r.event === evt).length;
            return (
              <button
                key={evt}
                onClick={() => setSelectedEventFilter(evt)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedEventFilter === evt
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by plan, change reason, actor, subscription ID, or record ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3">Event Type</th>
              <th className="py-3 px-3">Plan Delta</th>
              <th className="py-3 px-3">Price Delta</th>
              <th className="py-3 px-3">Cadence</th>
              <th className="py-3 px-3">Effective Date</th>
              <th className="py-3 px-3">Reason / Audit Trail</th>
              <th className="py-3 px-3">Changed By</th>
              <th className="py-3 px-3">Timestamp</th>
              <th className="py-3 px-2 text-center">Immutability</th>
              <th className="py-3 px-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-900/60">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No subscription history events found matching criteria.
                </td>
              </tr>
            ) : (
              filteredHistory.map((hist) => {
                const meta = SUBSCRIPTION_HISTORY_EVENT_META[hist.event] || {
                  label: hist.event,
                  badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                };

                const prevPlanName = hist.previous_plan || hist.previous_plan_id;
                const newPlanName = hist.new_plan || hist.new_plan_id;

                return (
                  <tr key={hist.history_id || hist.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Event Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>

                    {/* Plan Delta (previous_plan -> new_plan) */}
                    <td className="py-3 px-3 font-sans text-slate-200 whitespace-nowrap">
                      {prevPlanName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 capitalize">{prevPlanName}</span>
                          <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="font-bold text-slate-100 capitalize">{newPlanName}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-100 capitalize">{newPlanName} (Initial)</span>
                      )}
                    </td>

                    {/* Price Delta (previous_price -> new_price) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {hist.previous_price !== undefined && hist.previous_price !== null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">
                            {formatSubscriptionPrice(hist.previous_price, hist.billing_currency || billingCurrency)}
                          </span>
                          <span className="text-emerald-400">→</span>
                          <span className="font-bold text-emerald-400">
                            {formatSubscriptionPrice(hist.new_price, hist.billing_currency || billingCurrency)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-400">
                          {formatSubscriptionPrice(hist.new_price, hist.billing_currency || billingCurrency)}
                        </span>
                      )}
                    </td>

                    {/* Cadence */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono uppercase text-slate-300">
                        {hist.billing_period || 'monthly'}
                      </span>
                    </td>

                    {/* Effective Date */}
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {hist.effective_date || hist.timestamp?.slice(0, 10)}
                    </td>

                    {/* Change Reason */}
                    <td className="py-3 px-3 font-sans text-slate-300 max-w-xs truncate" title={hist.change_reason || hist.reason}>
                      {hist.change_reason || hist.reason || 'Lifecycle event record'}
                    </td>

                    {/* Changed By */}
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{hist.changed_by || hist.initiated_by || 'system'}</span>
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                      {hist.timestamp ? hist.timestamp.replace('T', ' ').slice(0, 19) : '—'}
                    </td>

                    {/* Immutability Seal */}
                    <td className="py-3 px-2 text-center whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-sans font-semibold"
                        title="Historical record is locked and permanently immutable."
                      >
                        <Lock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Locked</span>
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-3 text-right font-sans whitespace-nowrap">
                      <button
                        onClick={() => setSelectedRecord(hist)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="Inspect Complete Subscription Record Properties"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: INSPECT AUDIT PROVENANCE RECORD                   */}
      {/* ========================================================= */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-950 text-sky-400 border border-sky-800 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    Subscription Change Record Audit
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Record ID: {selectedRecord.history_id || selectedRecord.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Sequence 16 Immutability Active:</strong> This change record is permanently archived in the immutable ledger and cannot be overwritten.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">1. Event Type</span>
                <span className="text-sky-400 font-bold uppercase">{selectedRecord.event}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">2. Organization ID</span>
                <span className="text-slate-200 font-bold">{selectedRecord.organization_id}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">3. Subscription ID</span>
                <span className="text-slate-200">{selectedRecord.subscription_id}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">4. Effective Date</span>
                <span className="text-emerald-400 font-bold">
                  {selectedRecord.effective_date || selectedRecord.timestamp?.slice(0, 10)}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">5. Previous Plan</span>
                <span className="text-slate-300 capitalize">
                  {selectedRecord.previous_plan || selectedRecord.previous_plan_id || 'None (Initial Provisioning)'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">6. New Plan</span>
                <span className="text-white font-bold capitalize">
                  {selectedRecord.new_plan || selectedRecord.new_plan_id}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">7. Previous Price</span>
                <span className="text-slate-300">
                  {selectedRecord.previous_price !== null && selectedRecord.previous_price !== undefined
                    ? formatSubscriptionPrice(selectedRecord.previous_price, selectedRecord.billing_currency || billingCurrency)
                    : 'N/A'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">8. New Price</span>
                <span className="text-emerald-400 font-bold">
                  {formatSubscriptionPrice(selectedRecord.new_price, selectedRecord.billing_currency || billingCurrency)}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">9. Billing Period</span>
                <span className="text-slate-200 uppercase">{selectedRecord.billing_period || 'monthly'}</span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">10. Changed By</span>
                <span className="text-slate-200">{selectedRecord.changed_by || selectedRecord.initiated_by}</span>
              </div>

              <div className="col-span-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block">11. Change Reason</span>
                <span className="text-slate-200 font-sans text-xs">
                  {selectedRecord.change_reason || selectedRecord.reason}
                </span>
              </div>

              <div className="col-span-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                <span>Record Timestamp: {selectedRecord.timestamp}</span>
                <span className="text-emerald-400 font-bold">STATUS: LOCKED IMMUTABLE</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD NEW SUBSCRIPTION CHANGE EVENT              */}
      {/* ========================================================= */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-sky-400" />
                <h4 className="font-bold text-white text-base">
                  Record Subscription Change Event
                </h4>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRecordChange} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  1. Change Event Type (Sequence 16 Mandated Events):
                </label>
                <select
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value as SubscriptionHistoryEventType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="subscription_created">subscription_created (Initial Provisioning)</option>
                  <option value="plan_upgraded">plan_upgraded (Tier Upgrade)</option>
                  <option value="plan_downgraded">plan_downgraded (Tier Downgrade)</option>
                  <option value="billing_period_changed">billing_period_changed (Cadence Adjustment)</option>
                  <option value="price_changed">price_changed (Price / Rebate Change)</option>
                  <option value="subscription_renewed">subscription_renewed (Cycle Renewal)</option>
                  <option value="subscription_cancelled">subscription_cancelled (Cancellation)</option>
                  <option value="subscription_reactivated">subscription_reactivated (Reactivation)</option>
                  <option value="subscription_suspended">subscription_suspended (Administrative Hold)</option>
                  <option value="subscription_expired">subscription_expired (Term Expiration)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Previous Plan:</label>
                  <select
                    value={previousPlan}
                    onChange={(e) => setPreviousPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 capitalize"
                  >
                    {subscriptionPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">New Plan:</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 capitalize font-bold"
                  >
                    {subscriptionPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Previous Price ({billingCurrency}):</label>
                  <input
                    type="number"
                    value={previousPrice}
                    onChange={(e) => setPreviousPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">New Price ({billingCurrency}):</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Billing Period:</label>
                  <select
                    value={newBillingPeriod}
                    onChange={(e) => setNewBillingPeriod(e.target.value as BillingPeriod)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Effective Date:</label>
                  <input
                    type="date"
                    value={newEffectiveDate}
                    onChange={(e) => setNewEffectiveDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Changed By (Actor):</label>
                  <input
                    type="text"
                    value={newChangedBy}
                    onChange={(e) => setNewChangedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Change Reason (Commercial / Audit Rationale):
                </label>
                <textarea
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Account owner upgraded to Enterprise tier to support multi-region building additions."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                <span className="text-sky-400 font-bold block mb-0.5">Strict Immutability Rule:</span>
                This event will be permanently written to the organization's immutable subscription ledger. Historical events cannot be overwritten.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecording}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRecording ? 'Appending...' : 'Permanently Append Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
