import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BillingNotificationEvent,
  BILLING_NOTIFICATION_DEFINITIONS,
  dispatchBillingNotification,
  getBillingNotificationAuditLog,
} from '../../services/billingNotificationService';
import { Language, AppNotification } from '../../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Sparkles,
  Zap,
  Globe,
  RefreshCw,
  Send,
  Eye,
  Check,
  CreditCard,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

export const BillingNotificationsConsole: React.FC = () => {
  const {
    organization,
    activeSubscription,
    subscriptionPlans,
    notifications,
    addNotification,
    markNotificationRead,
    currentLanguage,
  } = useApp();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage || 'en');
  const [lastDispatchedEvent, setLastDispatchedEvent] = useState<{
    event: BillingNotificationEvent;
    notification: AppNotification;
  } | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const billingNotifications = notifications.filter((n) =>
    n.id.includes('billing') || n.linkTab === 'subscription'
  );

  const auditHistory = getBillingNotificationAuditLog();

  const triggerEvent = (event: BillingNotificationEvent) => {
    const currentPlanObj = subscriptionPlans.find((p) => p.id === organization.planId);
    const planName = currentPlanObj?.plan_name || organization.planId || 'CNTEstates Business / Plus';
    const currency = organization.billingCurrency || organization.currency || 'USD';

    let payload: Record<string, unknown> = {};

    switch (event) {
      case 'subscription_activated':
        payload = { plan: planName };
        break;
      case 'invoice_generated':
        payload = {
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
          amount: 249,
          currency,
        };
        break;
      case 'payment_successful':
        payload = {
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
          amount: 249,
          currency,
        };
        break;
      case 'payment_failed':
        payload = {
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
          amount: 249,
          currency,
        };
        break;
      case 'invoice_due':
        payload = {
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
          amount: 249,
          currency,
          dueDate: new Date(Date.now() + 3 * 86400000).toLocaleDateString(),
        };
        break;
      case 'invoice_overdue':
        payload = {
          invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
          amount: 249,
          currency,
        };
        break;
      case 'subscription_renewed':
        payload = { plan: planName };
        break;
      case 'plan_upgraded':
        payload = { plan: 'CNTEstates Enterprise' };
        break;
      case 'plan_downgraded':
        payload = { plan: 'CNTEstates Professional' };
        break;
      case 'subscription_cancelled':
        payload = { plan: planName };
        break;
      case 'subscription_suspended':
        payload = { plan: planName };
        break;
      case 'capacity_approaching':
        payload = {
          used: 212,
          max: 250,
          quotaType: 'rental units',
          percentage: 85,
        };
        break;
      case 'capacity_reached':
        payload = {
          used: 250,
          max: 250,
          quotaType: 'rental units',
          percentage: 100,
        };
        break;
    }

    // Dispatch using the authoritative service into AppContext
    const notif = dispatchBillingNotification(
      event,
      payload,
      selectedLanguage,
      (created) => {
        addNotification(created);
      }
    );

    setLastDispatchedEvent({ event, notification: notif });
  };

  const getEventIcon = (event: BillingNotificationEvent) => {
    switch (event) {
      case 'subscription_activated':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'invoice_generated':
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case 'payment_successful':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'payment_failed':
        return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'invoice_due':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case 'invoice_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'subscription_renewed':
        return <RefreshCw className="w-4 h-4 text-emerald-400" />;
      case 'plan_upgraded':
        return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
      case 'plan_downgraded':
        return <TrendingDown className="w-4 h-4 text-amber-400" />;
      case 'subscription_cancelled':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'subscription_suspended':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'capacity_approaching':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'capacity_reached':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const allEvents = Object.keys(BILLING_NOTIFICATION_DEFINITIONS) as BillingNotificationEvent[];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Console Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-emerald-800 text-emerald-400 text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEQUENCE 25 — BILLING NOTIFICATION ENGINE</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Integrated Billing Notifications & Alert Dispatcher
          </h3>
          <p className="text-xs text-slate-400">
            Authoritative lifecycle notifications dispatched into the CNTEstates notification bell across all 13 billing states with full localization.
          </p>
        </div>

        {/* Language Preview Selector */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400 text-[11px]">Localization:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as Language)}
            className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
          >
            <option value="en" className="bg-slate-900">EN (English)</option>
            <option value="fr" className="bg-slate-900">FR (Français)</option>
            <option value="es" className="bg-slate-900">ES (Español)</option>
            <option value="pt" className="bg-slate-900">PT (Português)</option>
          </select>
        </div>
      </div>

      {/* Real-Time Last Dispatched Banner */}
      {lastDispatchedEvent && (
        <div className="bg-slate-950/80 border border-emerald-500/50 rounded-xl p-4 flex items-start justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {lastDispatchedEvent.notification.title}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {lastDispatchedEvent.event}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {selectedLanguage.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {lastDispatchedEvent.notification.message}
              </p>
              <div className="text-[10px] text-slate-500 font-mono">
                Dispatched to Header Notification Bell at {new Date(lastDispatchedEvent.notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button
            onClick={() => setLastDispatchedEvent(null)}
            className="text-slate-500 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 13-Event Dispatch Simulation Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Dispatch Sandbox (All 13 Supported Events)</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
            13 / 13 Events Operational
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {allEvents.map((evtKey) => {
            const def = BILLING_NOTIFICATION_DEFINITIONS[evtKey];

            return (
              <button
                key={evtKey}
                type="button"
                onClick={() => triggerEvent(evtKey)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 rounded-xl p-3 text-left transition-all group flex flex-col justify-between space-y-2 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-slate-900 border border-slate-800 group-hover:border-emerald-500/40">
                      {getEventIcon(evtKey)}
                    </div>
                    <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">
                      {def.label}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      def.severity === 'emergency'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : def.severity === 'warning'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : def.severity === 'success'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {def.severity}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                  {def.description}
                </p>

                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-slate-300 font-mono">
                  <span>Dispatch Alert</span>
                  <span className="group-hover:translate-x-0.5 transition-transform text-emerald-400">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Dispatched Billing Notifications Stream */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Billing Notifications in Active Session ({billingNotifications.length})
            </span>
          </div>

          {billingNotifications.length > 0 && (
            <button
              onClick={() => billingNotifications.forEach((n) => markNotificationRead(n.id))}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        {billingNotifications.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400 font-medium">No billing alerts triggered yet in this session</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Click any event button above to simulate instantaneous billing notifications with full localization.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {billingNotifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                  n.read
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                    : 'bg-slate-950 border-slate-700 hover:border-emerald-500/50 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {n.type === 'emergency' ? (
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                    ) : n.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : n.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${n.read ? 'text-slate-400' : 'text-white'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{n.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.timestamp).toLocaleTimeString()} · {new Date(n.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                    n.type === 'emergency'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : n.type === 'warning'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : n.type === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-blue-950 text-blue-400 border border-blue-800'
                  }`}
                >
                  {n.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Architectural Guarantee Footer */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Native Notification System Integration: Dispatches directly to AppNotification bell</span>
        </div>
        <span>Target Tab: <code className="text-emerald-400">linkTab: 'subscription'</code></span>
      </div>
    </div>
  );
};
