import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileText,
  Lock,
  ArrowRight,
  Send,
  Zap,
  RotateCcw,
  Sparkles,
  Info,
  DollarSign,
  ChevronDown,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  PAYMENT_PROVIDER_NAME,
  DEFAULT_WEBHOOK_SECRET,
  processProviderWebhook,
  getWebhookAuditLogs,
  getOrCreateProviderCustomer,
  createProviderSubscription,
  changeProviderSubscription,
  executeProviderRenewal,
  executeProviderCancellation,
  handleProviderPaymentFailure,
  syncProviderInvoice,
  WebhookAuditEntry,
  WebhookEventPayload,
} from '../../services/paymentProviderService';
import { subscriptionPlans } from '../../data/mockDatabase';

export const PaymentProviderConsole: React.FC = () => {
  const {
    organization,
    activeSubscription,
    executeSubscriptionLifecycle,
  } = useApp();

  const subscriptionInvoices = organization.subscriptionInvoices || [];

  // Active view tab inside console: 'overview' | 'lifecycle' | 'webhooks'
  const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'webhooks'>('overview');

  // Webhook sandbox simulation state
  const [selectedEventType, setSelectedEventType] = useState<
    'invoice.paid' | 'invoice.payment_failed' | 'customer.subscription.updated' | 'customer.subscription.deleted'
  >('invoice.paid');
  const [webhookSecretInput, setWebhookSecretInput] = useState<string>(DEFAULT_WEBHOOK_SECRET);
  const [simulateTimestampAgeSeconds, setSimulateTimestampAgeSeconds] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [lastSimulationResult, setLastSimulationResult] = useState<any>(null);
  const [lastUsedEventId, setLastUsedEventId] = useState<string>('evt_stripe_sample_101');
  const [auditLogs, setAuditLogs] = useState<WebhookAuditEntry[]>([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState<WebhookAuditEntry | null>(null);

  // Lifecycle action state
  const [targetPlanToChange, setTargetPlanToChange] = useState<string>('enterprise');
  const [targetPeriodToChange, setTargetPeriodToChange] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Refresh audit logs from engine
  const refreshAuditLogs = () => {
    setAuditLogs(getWebhookAuditLogs());
  };

  useEffect(() => {
    // Initial fetch from server or service
    fetch('/api/payment-provider/webhooks/audit')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.audits) {
          setAuditLogs(data.audits);
        } else {
          refreshAuditLogs();
        }
      })
      .catch(() => {
        refreshAuditLogs();
      });
  }, []);

  // Provider IDs for the current organization and subscription
  const providerCustomerId =
    activeSubscription.external_customer_id || `cus_stripe_${organization.id}`;
  const providerSubscriptionId =
    activeSubscription.external_subscription_id || `sub_stripe_${organization.id}_2026`;
  const latestInvoiceId =
    subscriptionInvoices && subscriptionInvoices.length > 0
      ? subscriptionInvoices[0].external_invoice_id || `in_stripe_${organization.id}_latest`
      : `in_stripe_${organization.id}_001`;

  // 1. Simulate Webhook Execution
  const handleSimulateWebhook = async (params?: {
    forceInvalidSecret?: boolean;
    forceExpiredTimestamp?: boolean;
    reuseEventId?: boolean;
  }) => {
    setIsSimulating(true);
    setActionFeedback(null);

    const nowUnix = Math.floor(Date.now() / 1000);
    const createdTimestamp = params?.forceExpiredTimestamp
      ? nowUnix - 600 // 10 minutes ago (> 300s tolerance)
      : nowUnix - (simulateTimestampAgeSeconds || 0);

    const eventId = params?.reuseEventId
      ? lastUsedEventId
      : `evt_stripe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    setLastUsedEventId(eventId);

    const signature = params?.forceInvalidSecret
      ? 'bad_secret_invalid_signature_tampered_payload'
      : webhookSecretInput;

    const mockPayload: WebhookEventPayload = {
      id: eventId,
      object: 'event',
      api_version: '2026-09-01',
      created: createdTimestamp,
      type: selectedEventType,
      data: {
        object: {
          id: selectedEventType.startsWith('invoice') ? `in_stripe_${Date.now()}` : providerSubscriptionId,
          customer: providerCustomerId,
          subscription: providerSubscriptionId,
          organization_id: organization.id,
          amount_paid: activeSubscription.current_price,
          total: activeSubscription.current_price,
          currency: activeSubscription.billing_currency || 'ZAR',
          status: selectedEventType === 'invoice.payment_failed' ? 'past_due' : 'paid',
          last_payment_error:
            selectedEventType === 'invoice.payment_failed'
              ? { code: 'card_declined', message: 'Insufficient funds on credit card' }
              : null,
        },
      },
    };

    try {
      // Send to server webhook endpoint for full full-stack verification
      const res = await fetch('/api/payment-provider/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        body: JSON.stringify(mockPayload),
      });

      const data = await res.json();
      setLastSimulationResult({
        http_status: res.status,
        ...data,
      });

      if (res.ok) {
        if (data.idempotent_replay) {
          setActionFeedback({
            type: 'info',
            text: `[IDEMPOTENT REPLAY]: Duplicate event '${eventId}' recognized. Returned cached execution without duplicate billing.`,
          });
        } else {
          setActionFeedback({
            type: 'success',
            text: `[WEBHOOK PROCESSED]: Event '${selectedEventType}' authenticated, verified, and audited.`,
          });
          // Also sync in UI if renewal or change
          if (selectedEventType === 'invoice.paid') {
            await executeSubscriptionLifecycle('renewal', {
              reason: `Stripe webhook invoice.paid for ${providerSubscriptionId}`,
            });
          }
        }
      } else {
        setActionFeedback({
          type: 'error',
          text: `[WEBHOOK REJECTED HTTP ${res.status}]: ${data.error || 'Authentication/Verification failed'}`,
        });
      }

      // Re-fetch audit logs
      const auditRes = await fetch('/api/payment-provider/webhooks/audit');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.audits || []);
      } else {
        refreshAuditLogs();
      }
    } catch {
      // Client-side fallback if server offline
      const localResult = processProviderWebhook({
        rawBody: mockPayload,
        signatureHeader: signature,
        secret: DEFAULT_WEBHOOK_SECRET,
      });

      setLastSimulationResult({
        http_status: localResult.status,
        ...localResult,
      });
      refreshAuditLogs();

      setActionFeedback({
        type: localResult.success ? 'success' : 'error',
        text: localResult.auditEntry.summary,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // 2. Lifecycle action: Subscription Change
  const handleExecuteSubscriptionChange = async () => {
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/payment-provider/subscriptions/${providerSubscriptionId}/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
        },
        body: JSON.stringify({
          target_plan_id: targetPlanToChange,
          billing_period: targetPeriodToChange,
          billing_currency: activeSubscription.billing_currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          text: `Subscription changed to ${targetPlanToChange.toUpperCase()} (${targetPeriodToChange}). Maintained provider IDs: Customer [${data.maintained_provider_ids.customer_id}], Sub [${data.maintained_provider_ids.subscription_id}].`,
        });
        await executeSubscriptionLifecycle('upgrade', {
          targetPlanId: targetPlanToChange,
          billingPeriod: targetPeriodToChange,
          reason: `Stripe provider subscription plan shift to ${targetPlanToChange}`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: data.error || 'Failed to change subscription via provider.',
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message || 'Network error' });
    }
  };

  // 3. Lifecycle action: Invoice Sync
  const handleSyncInvoices = async () => {
    setActionFeedback(null);
    try {
      const res = await fetch('/api/payment-provider/invoices/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
        },
        body: JSON.stringify({
          amount: activeSubscription.current_price,
          currency: activeSubscription.billing_currency,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          text: `Synchronized invoice with Stripe gateway. External Invoice ID: ${data.invoice.external_invoice_id} maintained.`,
        });
      } else {
        setActionFeedback({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message || 'Sync error' });
    }
  };

  // 4. Lifecycle action: Renewal
  const handleRenewNow = async () => {
    setActionFeedback(null);
    const res = await executeSubscriptionLifecycle('renewal', {
      reason: `Stripe provider renewal executed for ${providerSubscriptionId}`,
    });
    if (res.success) {
      setActionFeedback({
        type: 'success',
        text: `Subscription renewed. Period advanced to ${activeSubscription.renewal_date}. Maintained Provider Sub ID: ${providerSubscriptionId}.`,
      });
    } else {
      setActionFeedback({ type: 'error', text: res.message });
    }
  };

  // 5. Lifecycle action: Payment Failure Simulation
  const handleSimulatePaymentFailure = async () => {
    setActionFeedback(null);
    try {
      const res = await fetch('/api/payment-provider/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'invoice.payment_failed',
          organization_id: organization.id,
          customer_id: providerCustomerId,
          subscription_id: providerSubscriptionId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          type: 'error',
          text: `[PAYMENT FAILURE DETECTED]: Stripe invoice marked past_due. Dunning protocol activated. Maintained sub ${providerSubscriptionId}.`,
        });
        await executeSubscriptionLifecycle('suspension', {
          reason: 'Stripe simulated invoice.payment_failed dunning grace period',
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header & Provider ID Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-700/60 flex items-center justify-center shrink-0 shadow-inner">
            <CreditCard className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                SEQUENCE 21 — PAYMENT PROVIDER
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Integration
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 mt-0.5">
              <span>{PAYMENT_PROVIDER_NAME}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Preserves provider IDs across customer, subscription, invoice sync, renewals, and cancellations with authenticated, verified, idempotent webhooks.
            </p>
          </div>
        </div>

        {/* Console View Navigation */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Provider IDs & Status
          </button>
          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'lifecycle'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lifecycle Suite
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'webhooks'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Webhook Engine</span>
            {auditLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-violet-900 text-violet-200 text-[10px] font-mono font-bold">
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Maintained Provider Identifiers Live Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Maintained Customer ID</span>
            <Lock className="w-3 h-3 text-violet-400" />
          </div>
          <div className="font-mono text-xs text-violet-300 font-bold mt-1 truncate" title={providerCustomerId}>
            {providerCustomerId}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Default Payment Method: Mastercard •••• 4022
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Maintained Subscription ID</span>
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="font-mono text-xs text-emerald-300 font-bold mt-1 truncate" title={providerSubscriptionId}>
            {providerSubscriptionId}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Status: <span className="text-emerald-400 uppercase font-semibold">{activeSubscription.subscription_status}</span> • Cadence: {activeSubscription.billing_period}
          </div>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center justify-between">
            <span>Maintained Invoice ID</span>
            <FileText className="w-3 h-3 text-sky-400" />
          </div>
          <div className="font-mono text-xs text-sky-300 font-bold mt-1 truncate" title={latestInvoiceId}>
            {latestInvoiceId}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Synchronized with zero-decimal local billing
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : actionFeedback.type === 'info'
              ? 'bg-sky-950/80 border-sky-700 text-sky-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : actionFeedback.type === 'info' ? (
            <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="flex-1 font-medium">{actionFeedback.text}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-200 font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & INVARIANTS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Payment Provider Invariant Checklist</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Provider IDs Maintained</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Customer, subscription, and invoice IDs are persistently linked across mutations.
                </p>
              </div>

              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated Webhooks</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Rejects unauthenticated requests with HTTP 401 Unauthorized.
                </p>
              </div>

              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Payload & Time</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces 300s timestamp freshness window to eliminate replay attacks.
                </p>
              </div>

              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Idempotent & Audited</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Deduplicates incoming event IDs and writes to tamper-evident audit log.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400">
              Active Provider Customer:{' '}
              <strong className="text-slate-200 font-mono">{providerCustomerId}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('lifecycle')}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Lifecycle Suite</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('webhooks')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Webhook Sandbox</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIFECYCLE OPERATIONS SUITE */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Subscription Changes */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span>1. Subscription Changes</span>
                </span>
                <span className="text-[10px] text-slate-400">Maintains sub ID</span>
              </div>
              <p className="text-xs text-slate-400">
                Execute an upgrade or downgrade through the provider without creating redundant customer or subscription records.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Target Plan</label>
                  <select
                    value={targetPlanToChange}
                    onChange={(e) => setTargetPlanToChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    {subscriptionPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plan_name} (${p.monthly_price}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Billing Period</label>
                  <select
                    value={targetPeriodToChange}
                    onChange={(e) => setTargetPeriodToChange(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleExecuteSubscriptionChange}
                className="w-full mt-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Execute Provider Subscription Change</span>
              </button>
            </div>

            {/* Box 2: Invoice Synchronization */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>2. Invoice Synchronization</span>
                </span>
                <span className="text-[10px] text-slate-400">Zero-decimal local</span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronizes external gateway invoice tokens into CNTEstates immutable invoice ledger while preserving external_invoice_id.
              </p>

              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Current Period Amount:</span>
                  <span className="font-bold text-slate-200">
                    {activeSubscription.billing_currency} {activeSubscription.current_price}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Latest Synced ID:</span>
                  <span className="font-mono text-sky-300">{latestInvoiceId}</span>
                </div>
              </div>

              <button
                onClick={handleSyncInvoices}
                className="w-full mt-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Synchronize Invoices Now</span>
              </button>
            </div>

            {/* Box 3: Period Renewal */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>3. Period Renewals</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Automated</span>
              </div>
              <p className="text-xs text-slate-400">
                Advances billing cycle dates, generates renewal invoice, and maintains provider subscription identity.
              </p>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Renewal Due:</span>
                <span className="font-bold text-emerald-400 font-mono">{activeSubscription.renewal_date}</span>
              </div>

              <button
                onClick={handleRenewNow}
                className="w-full mt-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simulate Automated Renewal</span>
              </button>
            </div>

            {/* Box 4: Payment Failures & Dunning */}
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>4. Payment Failure & Dunning</span>
                </span>
                <span className="text-[10px] text-rose-400 font-semibold">Recovery Flow</span>
              </div>
              <p className="text-xs text-slate-400">
                Triggers payment failure handling, transitions status to past_due, records next retry schedule, and preserves provider IDs.
              </p>

              <button
                onClick={handleSimulatePaymentFailure}
                className="w-full mt-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Trigger Simulated Payment Failure</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEBHOOK ENGINE & TAMPER-EVIDENT AUDIT TRAIL */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Webhook Sandbox Simulation Controls */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Webhook Sandbox & Invariant Testing</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Endpoint: <span className="text-slate-200">POST /api/payment-provider/webhook</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Simulated Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="invoice.paid">invoice.paid (Renewal / Settled)</option>
                  <option value="invoice.payment_failed">invoice.payment_failed (Dunning)</option>
                  <option value="customer.subscription.updated">customer.subscription.updated</option>
                  <option value="customer.subscription.deleted">customer.subscription.deleted</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Webhook Secret (Header Auth)</label>
                <input
                  type="text"
                  value={webhookSecretInput}
                  onChange={(e) => setWebhookSecretInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Last Event ID: <span className="text-slate-300 font-mono">{lastUsedEventId}</span>
                </label>
                <div className="text-[11px] text-slate-500 pt-1">
                  Use for testing the Idempotency Invariant (Duplicate Delivery).
                </div>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
              <button
                disabled={isSimulating}
                onClick={() => handleSimulateWebhook()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Send valid authenticated and verified webhook"
              >
                <Send className="w-3.5 h-3.5" />
                <span>1. Send Valid Event</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => handleSimulateWebhook({ reuseEventId: true })}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Send duplicate event with identical ID to test idempotency deduplication"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Test Idempotency (Replay)</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => handleSimulateWebhook({ forceInvalidSecret: true })}
                className="px-3 py-2 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Send bad secret to verify 401 Unauthorized rejection"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>3. Test Invalid Auth (401)</span>
              </button>

              <button
                disabled={isSimulating}
                onClick={() => handleSimulateWebhook({ forceExpiredTimestamp: true })}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Send timestamp > 300s old to test replay-attack rejection"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>4. Test Expired Time (400)</span>
              </button>
            </div>
          </div>

          {/* Tamper-Evident Webhook Audit Trail */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tamper-Evident Webhook Audit Trail ({auditLogs.length})</span>
              </h3>
              <button
                onClick={refreshAuditLogs}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Log</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No webhooks recorded yet. Click one of the test buttons above to simulate incoming events.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                      <th className="py-2 px-2.5">Time</th>
                      <th className="py-2 px-2.5">Event ID</th>
                      <th className="py-2 px-2.5">Type</th>
                      <th className="py-2 px-2.5">Auth</th>
                      <th className="py-2 px-2.5">Verified</th>
                      <th className="py-2 px-2.5">Idempotency</th>
                      <th className="py-2 px-2.5">HTTP</th>
                      <th className="py-2 px-2.5">Provider IDs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr
                        key={log.audit_id}
                        onClick={() => setSelectedAuditLog(selectedAuditLog?.audit_id === log.audit_id ? null : log)}
                        className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-2.5 text-slate-400">
                          {log.received_at.slice(11, 19)}
                        </td>
                        <td className="py-2 px-2.5 text-violet-300 font-bold truncate max-w-[130px]" title={log.event_id}>
                          {log.event_id}
                        </td>
                        <td className="py-2 px-2.5 font-sans font-medium text-slate-200">
                          {log.event_type}
                        </td>
                        <td className="py-2 px-2.5">
                          {log.authenticated ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                              PASS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold">
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          {log.verified ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                              PASS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold">
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 font-sans">
                          {log.idempotency_action === 'deduplicated_cached' ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                              DUPLICATE (CACHED)
                            </span>
                          ) : log.idempotency_action === 'processed_new' ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                              NEW (EXECUTED)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                              {log.idempotency_action}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`font-bold ${
                              log.http_status === 200
                                ? 'text-emerald-400'
                                : log.http_status === 401
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {log.http_status}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-[10px] text-slate-400 truncate max-w-[150px]">
                          {log.provider_ids?.customer_id || 'none'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expandable Audit Log Details */}
            {selectedAuditLog && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Audit Detail: {selectedAuditLog.event_id}</span>
                  <button
                    onClick={() => setSelectedAuditLog(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-slate-300">{selectedAuditLog.summary}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>Customer ID: {selectedAuditLog.provider_ids?.customer_id || 'N/A'}</div>
                  <div>Subscription ID: {selectedAuditLog.provider_ids?.subscription_id || 'N/A'}</div>
                  <div>Invoice ID: {selectedAuditLog.provider_ids?.invoice_id || 'N/A'}</div>
                  <div>Duration: {selectedAuditLog.processing_duration_ms}ms</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
