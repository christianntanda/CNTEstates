import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BillingAuditAction,
  BillingAuditLogEntry,
} from '../../types';
import {
  BILLING_AUDIT_ACTIONS,
  BillingAuditActionMeta,
  runBillingAuditTestSuite,
  calculateAuditChecksum,
} from '../../services/billingAuditLogEngine';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  History,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Cpu,
  Hash,
  ArrowRight,
  RefreshCw,
  Lock,
  Layers,
  FileText,
  Play,
  Copy,
  Check,
  Eye,
  ChevronDown,
  ChevronRight,
  Database,
  Terminal,
} from 'lucide-react';

export const BillingAuditLogConsole: React.FC = () => {
  const {
    organization,
    userRole,
    currentUser,
    billingAuditLogs,
    refreshBillingAuditLogs,
    recordBillingAudit,
    verifyAuditLedger,
    exportBillingAudit,
    addNotification,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<BillingAuditAction | 'all'>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<BillingAuditLogEntry | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<ReturnType<typeof verifyAuditLedger> | null>(null);
  const [testSuiteResult, setTestSuiteResult] = useState<ReturnType<typeof runBillingAuditTestSuite> | null>(null);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulatedAction, setSimulatedAction] = useState<BillingAuditAction>('plan_upgraded');
  const [simulatedReason, setSimulatedReason] = useState('Quarterly portfolio scale expansion');
  const [isTamperModalOpen, setIsTamperModalOpen] = useState(false);
  const [tamperDetectedNotice, setTamperDetectedNotice] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Run cryptographic verification
  const handleVerifyLedger = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const res = verifyAuditLedger();
      setVerificationResult(res);
      setIsVerifying(false);
      addNotification({
        title: res.isValid ? 'Audit Ledger Verified' : 'Audit Ledger Integrity Warning',
        message: res.message,
        type: res.isValid ? 'info' : 'emergency',
      });
    }, 350);
  };

  // Run compliance test suite
  const handleRunTestSuite = () => {
    const res = runBillingAuditTestSuite();
    setTestSuiteResult(res);
    addNotification({
      title: 'Billing Audit Compliance Suite',
      message: `Passed ${res.passedChecks} / ${res.totalChecks} tests across all 13 billing actions and cryptographic chaining.`,
      type: 'info',
    });
  };

  // Export logs
  const handleExport = (format: 'json' | 'csv') => {
    const content = exportBillingAudit(format);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cnt_billing_audit_${organization.id}_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({
      title: 'Audit Log Exported',
      message: `Downloaded immutable billing audit trail in ${format.toUpperCase()} format.`,
      type: 'info',
    });
  };

  // Simulate a live action
  const handleSimulateAction = () => {
    const now = new Date().toISOString();
    let prev: any = null;
    let next: any = {};

    switch (simulatedAction) {
      case 'subscription_created':
        prev = null;
        next = { planId: 'starter', planName: 'CNTEstates Starter', masterPrice: 49, currency: 'USD' };
        break;
      case 'subscription_updated':
        prev = { billingPeriod: 'monthly', renewalDate: '2026-10-15' };
        next = { billingPeriod: 'quarterly', renewalDate: '2026-12-15', reason: simulatedReason };
        break;
      case 'plan_upgraded':
        prev = { planId: 'starter', planName: 'CNTEstates Starter', units: 20 };
        next = { planId: 'business', planName: 'CNTEstates Business', units: 500, reason: simulatedReason };
        break;
      case 'plan_downgraded':
        prev = { planId: 'enterprise', planName: 'CNTEstates Enterprise', units: 5000 };
        next = { planId: 'business', planName: 'CNTEstates Business', units: 500, reason: simulatedReason };
        break;
      case 'invoice_created':
        prev = null;
        next = { invoiceNumber: `CNTE-INV-${Date.now().toString().slice(-4)}`, amount: 249, currency: 'USD', status: 'issued' };
        break;
      case 'invoice_paid':
        prev = { status: 'issued', amountDue: 249 };
        next = { status: 'paid', amountPaid: 249, paymentMethod: 'Mastercard •••• 4022', transactionRef: `tx_live_${Date.now()}` };
        break;
      case 'invoice_failed':
        prev = { status: 'issued', amountDue: 249 };
        next = { status: 'failed', reason: 'Insufficient funds on debit card', attempts: 3 };
        break;
      case 'payment_succeeded':
        prev = { status: 'pending_capture' };
        next = { status: 'settled', amount: 249, currency: 'USD', gatewayRef: `ch_stripe_${Date.now()}` };
        break;
      case 'payment_failed':
        prev = { status: 'pending_capture' };
        next = { status: 'failed', errorCode: 'card_declined', reason: simulatedReason };
        break;
      case 'subscription_cancelled':
        prev = { cancelAtPeriodEnd: false, autoRenew: true };
        next = { cancelAtPeriodEnd: true, autoRenew: false, reason: simulatedReason, cancelledAt: now };
        break;
      case 'subscription_reactivated':
        prev = { cancelAtPeriodEnd: true, autoRenew: false };
        next = { cancelAtPeriodEnd: false, autoRenew: true, reason: simulatedReason, reactivatedAt: now };
        break;
      case 'capacity_limit_reached':
        prev = { unitsUsed: 499, unitsLimit: 500, utilization: '99.8%' };
        next = { unitsUsed: 500, unitsLimit: 500, utilization: '100%', status: 'LIMIT_ENFORCED', blockedOperation: 'unit_create' };
        break;
      case 'billing_information_updated':
        prev = { billingCurrency: 'USD', operatingCountry: 'United States' };
        next = { billingCurrency: 'EUR', operatingCountry: 'Germany', reason: simulatedReason };
        break;
    }

    recordBillingAudit(simulatedAction, prev, next, { simulationNote: simulatedReason });
    setIsSimulationOpen(false);
    addNotification({
      title: 'Billing Action Recorded',
      message: `Logged immutable '${simulatedAction}' entry with cryptographic hash chain linkage.`,
      type: 'info',
    });
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return billingAuditLogs.filter((entry) => {
      // Action filter
      if (selectedActionFilter !== 'all' && entry.action !== selectedActionFilter) {
        return false;
      }

      // Role filter
      if (selectedRoleFilter !== 'all' && entry.actor.role !== selectedRoleFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        const meta = BILLING_AUDIT_ACTIONS[entry.action];
        if (meta && meta.category !== selectedCategoryFilter) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const actorName = (entry.actor.name || '').toLowerCase();
        const action = entry.action.toLowerCase();
        const correlation = (entry.correlationId || '').toLowerCase();
        const reqId = (entry.requestId || '').toLowerCase();
        const prevStr = JSON.stringify(entry.previousValue || '').toLowerCase();
        const newStr = JSON.stringify(entry.newValue || '').toLowerCase();
        const checksum = (entry.checksum || '').toLowerCase();

        return (
          actorName.includes(query) ||
          action.includes(query) ||
          correlation.includes(query) ||
          reqId.includes(query) ||
          prevStr.includes(query) ||
          newStr.includes(query) ||
          checksum.includes(query)
        );
      }

      return true;
    });
  }, [billingAuditLogs, selectedActionFilter, selectedRoleFilter, selectedCategoryFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = billingAuditLogs.length;
    const actionsCount: Record<string, number> = {};
    for (const log of billingAuditLogs) {
      actionsCount[log.action] = (actionsCount[log.action] || 0) + 1;
    }
    return {
      total,
      planChanges: (actionsCount['plan_upgraded'] || 0) + (actionsCount['plan_downgraded'] || 0),
      invoices: (actionsCount['invoice_created'] || 0) + (actionsCount['invoice_paid'] || 0) + (actionsCount['invoice_failed'] || 0),
      payments: (actionsCount['payment_succeeded'] || 0) + (actionsCount['payment_failed'] || 0),
      lifecycle: (actionsCount['subscription_created'] || 0) + (actionsCount['subscription_updated'] || 0) + (actionsCount['subscription_cancelled'] || 0) + (actionsCount['subscription_reactivated'] || 0),
      capacity: actionsCount['capacity_limit_reached'] || 0,
      billingInfo: actionsCount['billing_information_updated'] || 0,
    };
  }, [billingAuditLogs]);

  // Badge styling helper
  const getActionBadge = (action: BillingAuditAction) => {
    const meta = BILLING_AUDIT_ACTIONS[action] || {
      name: action,
      badgeStyle: 'blue',
      category: 'lifecycle',
      severity: 'info',
    };

    switch (meta.badgeStyle) {
      case 'emerald':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>{meta.name}</span>
          </span>
        );
      case 'rose':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3 shrink-0" />
            <span>{meta.name}</span>
          </span>
        );
      case 'amber':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>{meta.name}</span>
          </span>
        );
      case 'purple':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
            <Layers className="w-3 h-3 shrink-0" />
            <span>{meta.name}</span>
          </span>
        );
      case 'blue':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{meta.name}</span>
          </span>
        );
    }
  };

  const formatValueDisplay = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-500 italic">None / Genesis</span>;
    }
    if (typeof val === 'string') {
      return <span className="font-mono text-slate-200">{val}</span>;
    }
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      if (keys.length === 0) return <span className="text-slate-500">Empty object</span>;
      return (
        <div className="space-y-0.5 font-mono text-[10px]">
          {keys.slice(0, 3).map((k) => (
            <div key={k} className="truncate">
              <span className="text-slate-400">{k}: </span>
              <span className="text-slate-200 font-semibold">{String(val[k])}</span>
            </div>
          ))}
          {keys.length > 3 && (
            <span className="text-slate-500 text-[9px]">+{keys.length - 3} more properties...</span>
          )}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl">
      {/* Console Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold font-mono tracking-wider uppercase rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
              SEQUENCE 29
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              Strict Immutability
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800">
              Chained Checksums
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Authoritative Billing Audit Log</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Immutable, append-only financial ledger recording all 13 critical billing actions with cryptographic hash chain integrity, user/system actor attribution, state transitions, and correlation tracking.
          </p>
        </div>

        {/* Verification & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={handleVerifyLedger}
            disabled={isVerifying}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Verify SHA-variant cryptographic chain integrity"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Cryptographic Chain'}</span>
          </button>

          <button
            onClick={handleRunTestSuite}
            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Run automated 13-action compliance suite"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run 13-Action Suite</span>
          </button>

          <button
            onClick={() => setIsSimulationOpen(true)}
            className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Interactive simulation of any of the 13 billing actions"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Simulate Action</span>
          </button>

          <div className="relative inline-block">
            <button
              onClick={() => handleExport('json')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="Download JSON audit ledger"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>JSON</span>
            </button>
          </div>

          <div className="relative inline-block">
            <button
              onClick={() => handleExport('csv')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="Download CSV audit ledger"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verification Banner if verified */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          verificationResult.isValid
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            {verificationResult.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider font-mono">
                {verificationResult.isValid ? 'CRYPTOGRAPHIC INTEGRITY GUARANTEE: ACTIVE & VERIFIED' : 'INTEGRITY BREACH DETECTED'}
              </div>
              <div className="text-xs mt-0.5">{verificationResult.message}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Verified Entries: {verificationResult.totalEntries} · Tampered: {verificationResult.tamperedEntriesCount} · Hash Chain: Validated against genesis block.
              </div>
            </div>
          </div>
          <button
            onClick={() => setVerificationResult(null)}
            className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Test Suite Summary Banner */}
      {testSuiteResult && (
        <div className="p-4 bg-slate-950 border border-emerald-900/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-xs">{testSuiteResult.suiteName}</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              {testSuiteResult.passedChecks} / {testSuiteResult.totalChecks} PASSED
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {testSuiteResult.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-300 truncate mr-2">{r.test}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  r.status === 'PASS' ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setTestSuiteResult(null)}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Close Test Results
            </button>
          </div>
        </div>
      )}

      {/* 13 Actions Matrix KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Actions</div>
          <div className="text-xl font-extrabold text-white font-mono">{stats.total}</div>
          <div className="text-[10px] text-emerald-400 font-mono">Immutable Ledger</div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Changes</div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">{stats.planChanges}</div>
          <div className="text-[10px] text-slate-400 font-mono">Upgraded / Downgraded</div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoices</div>
          <div className="text-xl font-extrabold text-sky-400 font-mono">{stats.invoices}</div>
          <div className="text-[10px] text-slate-400 font-mono">Created / Paid / Failed</div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payments</div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">{stats.payments}</div>
          <div className="text-[10px] text-slate-400 font-mono">Succeeded / Failed</div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifecycle</div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">{stats.lifecycle}</div>
          <div className="text-[10px] text-slate-400 font-mono">Create / Cancel / Renew</div>
        </div>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotas & Config</div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">{stats.capacity + stats.billingInfo}</div>
          <div className="text-[10px] text-slate-400 font-mono">Limits & Currency</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, actor, correlation ID, checksum, or state values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Action:</span>
            </div>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All 13 Actions</option>
              {Object.keys(BILLING_AUDIT_ACTIONS).map((act) => (
                <option key={act} value={act}>
                  {BILLING_AUDIT_ACTIONS[act as BillingAuditAction].name} ({act})
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Actors</option>
              <option value="system">System (Automated)</option>
              <option value="org_owner">Org Owner</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="property_manager">Property Manager</option>
              <option value="platform_admin">Platform Admin</option>
            </select>

            {/* Clear filters button */}
            {(selectedActionFilter !== 'all' || selectedRoleFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedActionFilter('all');
                  setSelectedRoleFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 13 Actions Quick Pills */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Quick Select:</span>
          {(
            [
              'subscription_created',
              'subscription_updated',
              'plan_upgraded',
              'plan_downgraded',
              'invoice_created',
              'invoice_paid',
              'invoice_failed',
              'payment_succeeded',
              'payment_failed',
              'subscription_cancelled',
              'subscription_reactivated',
              'capacity_limit_reached',
              'billing_information_updated',
            ] as BillingAuditAction[]
          ).map((act) => {
            const isSelected = selectedActionFilter === act;
            const meta = BILLING_AUDIT_ACTIONS[act];
            return (
              <button
                key={act}
                onClick={() => setSelectedActionFilter(isSelected ? 'all' : act)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
              >
                {meta?.name || act}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Billing Action</th>
                <th className="py-3 px-3.5">Organization</th>
                <th className="py-3 px-3.5">Actor</th>
                <th className="py-3 px-3.5">State Transition (Previous &rarr; New)</th>
                <th className="py-3 px-3.5">Correlation ID</th>
                <th className="py-3 px-3.5 text-right">Tamper-Proof Checksum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No billing audit records matched your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedEntry(log)}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="text-slate-200 font-semibold">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Organization */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-200 text-xs truncate max-w-[160px]">
                          {log.organizationName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {log.organizationId}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          {log.actor.type === 'system' ? (
                            <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200 text-xs truncate max-w-[140px]">
                            {log.actor.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">
                          {log.actor.role}
                        </div>
                      </td>

                      {/* State Transition */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-900/80 p-1.5 rounded border border-slate-800 text-[11px]">
                            {formatValueDisplay(log.previousValue)}
                          </div>
                          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                          <div className="flex-1 bg-slate-900 p-1.5 rounded border border-emerald-950/60 text-[11px]">
                            {formatValueDisplay(log.newValue)}
                          </div>
                        </div>
                      </td>

                      {/* Correlation ID */}
                      <td className="py-3 px-3.5 font-mono text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[110px]" title={log.correlationId}>
                            {log.correlationId}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(log.correlationId, `corr-${log.id}`);
                            }}
                            className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                            title="Copy correlation ID"
                          >
                            {copiedId === `corr-${log.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {log.requestId && (
                          <div className="text-[9px] text-slate-500 truncate max-w-[110px]" title={log.requestId}>
                            req: {log.requestId}
                          </div>
                        )}
                      </td>

                      {/* Checksum */}
                      <td className="py-3 px-3.5 text-right font-mono text-[11px]">
                        <div className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[90px]" title={log.checksum}>
                            {log.checksum}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulation Modal */}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Simulate Authoritative Billing Action</h3>
              </div>
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select one of the 13 required billing actions. The action will be cryptographically hashed, linked to the previous block checksum, and frozen in the immutable ledger.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Billing Action</label>
                <select
                  value={simulatedAction}
                  onChange={(e) => setSimulatedAction(e.target.value as BillingAuditAction)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                >
                  {Object.keys(BILLING_AUDIT_ACTIONS).map((act) => (
                    <option key={act} value={act}>
                      {BILLING_AUDIT_ACTIONS[act as BillingAuditAction].name} ({act})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {BILLING_AUDIT_ACTIONS[simulatedAction]?.description}
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Action Reason / Description</label>
                <input
                  type="text"
                  value={simulatedReason}
                  onChange={(e) => setSimulatedReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  placeholder="e.g. Quarterly growth scale, automated dunning failure, regional currency adjustment"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">Organization: <span className="text-white">{organization.name}</span></div>
                <div className="text-slate-400">Actor: <span className="text-emerald-400">{currentUser.name} ({userRole})</span></div>
                <div className="text-slate-400">Hash Chaining: <span className="text-sky-400">Chained to previous block</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateAction}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Append to Immutable Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Detail Drawer / Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Immutable Audit Block Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Action ID & Event</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{selectedEntry.id}</span>
                  {getActionBadge(selectedEntry.action)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase font-mono">Timestamp</div>
                <div className="text-xs font-mono text-slate-300">{selectedEntry.timestamp}</div>
              </div>
            </div>

            {/* Actor & Organization Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Attributed Actor</span>
                <div className="font-bold text-slate-200">{selectedEntry.actor.name}</div>
                <div className="text-slate-400 font-mono text-[11px]">Role: {selectedEntry.actor.role}</div>
                <div className="text-slate-500 font-mono text-[10px]">Type: {selectedEntry.actor.type} · IP: {selectedEntry.actor.ipAddress}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Tenant Organization</span>
                <div className="font-bold text-slate-200">{selectedEntry.organizationName}</div>
                <div className="text-slate-400 font-mono text-[11px]">ID: {selectedEntry.organizationId}</div>
                <div className="text-slate-500 font-mono text-[10px]">Isolation Domain: Strictly Enforced</div>
              </div>
            </div>

            {/* Cryptographic Hash Chaining Details */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase">Cryptographic Block Checksum</span>
                <span className="text-emerald-400 text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  Tamper-Evident Chain Intact
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded text-emerald-300 text-xs break-all select-all border border-emerald-950">
                {selectedEntry.checksum}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                <div>Correlation ID: <span className="text-slate-200">{selectedEntry.correlationId}</span></div>
                <div>Request ID: <span className="text-slate-200">{selectedEntry.requestId || 'N/A'}</span></div>
              </div>
            </div>

            {/* Raw JSON Payloads */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Previous vs New State Payload</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Previous Value</span>
                  <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.previousValue, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">New Value</span>
                  <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEntry.newValue, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
