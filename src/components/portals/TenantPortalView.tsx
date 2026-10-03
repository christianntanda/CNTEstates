import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  Home,
  FileText,
  DollarSign,
  LifeBuoy,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Droplets,
  Bell,
  Camera,
  Download,
  CreditCard,
} from 'lucide-react';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { NewTicketModal } from '../modals/NewTicketModal';

export const TenantPortalView: React.FC = () => {
  const {
    t,
    tenants,
    leases,
    units,
    properties,
    tickets,
    utilityMeters,
    currency,
    language,
    currentUser,
  } = useApp();

  // Find tenant by unit or first tenant
  const tenant =
    tenants.find((t) => t.id === currentUser.id || t.email === currentUser.email) ||
    tenants[1]; // Elena Rostova by default

  const lease = leases.find((l) => l.tenantId === tenant.id) || leases[0];
  const unit = units.find((u) => u.id === tenant.unitId);
  const property = properties.find((p) => p.id === tenant.propertyId);

  const tenantTickets = tickets.filter(
    (t) => t.tenantId === tenant.id || t.unitNumber === unit?.unitNumber
  );

  const tenantMeters = utilityMeters.filter((m) => m.allocatedTenantId === tenant.id);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Welcome Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/50 rounded-2xl p-6 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            {t.brand.name} Resident Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t.tenantPortal.welcome} {tenant.name}
          </h1>
          <p className="text-xs text-slate-300">
            {property?.name} · Unit {unit?.unitNumber} · Resident since {tenant.joinedDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowTicketModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 text-emerald-400" />
            <span>{t.tenantPortal.reportIssue}</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{t.tenantPortal.payRent}</span>
          </button>
        </div>
      </div>

      {/* Main Tenant Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Lease & Maintenance Status */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Lease & Rent Due Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">{t.tenantPortal.myLease}</h3>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-400">
                #{lease.leaseNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase">Monthly Rent</span>
                <span className="font-bold text-slate-100 text-base">
                  {formatCurrency(lease.monthlyRent, currency, language)}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase">Balance Due</span>
                <span
                  className={`font-bold text-base ${
                    tenant.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(tenant.outstandingBalance, currency, language)}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block uppercase">Deposit Held</span>
                <span className="font-bold text-slate-100 text-base">
                  {formatCurrency(tenant.depositHeld, currency, language)}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>
                Lease Period: <strong>{formatDate(lease.startDate, language)}</strong> to{' '}
                <strong>{formatDate(lease.endDate, language)}</strong> ({lease.daysRemaining} days left)
              </div>
              <div className="text-[11px] text-slate-400">
                Payment due on day {lease.paymentDueDay} of each calendar month.
              </div>
            </div>
          </div>

          {/* Service Requests */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {t.tenantPortal.openRequests} ({tenantTickets.length})
                </h3>
              </div>

              <button
                onClick={() => setShowTicketModal(true)}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </div>

            {tenantTickets.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No open maintenance tickets for your unit. Everything is operating smoothly.
              </div>
            ) : (
              <div className="space-y-3">
                {tenantTickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-emerald-400">[{tkt.code}]</span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-700 px-1.5 py-0.2 rounded">
                          {tkt.priority}
                        </span>
                      </div>
                      <div className="font-bold text-slate-100">{tkt.title}</div>
                      <p className="text-slate-400 text-[11px] line-clamp-1">{tkt.description}</p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded shrink-0 ${
                        tkt.status === 'completed'
                          ? 'text-emerald-400 bg-emerald-950/60'
                          : 'text-amber-400 bg-amber-950/60'
                      }`}
                    >
                      {tkt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Utilities Sub-Metering & Quick Notices */}
        <div className="space-y-6">
          {/* Sub-Meter Readings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>{t.tenantPortal.utilityUsage}</span>
            </h3>

            {tenantMeters.length === 0 ? (
              <p className="text-xs text-slate-400">
                Utilities included in base rent or sub-meter scheduled for next billing cycle.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {tenantMeters.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 capitalize">{m.type}</span>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Reading: {m.currentReading} {m.unitOfMeasure}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(m.totalCost, currency, language)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Building Notices */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>{t.tenantPortal.buildingAnnouncements}</span>
            </h3>

            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1 text-xs">
              <span className="font-bold text-slate-200 block">Quarterly Window Cleaning</span>
              <p className="text-[11px] text-slate-400">
                Exterior scaffolding crews will be operating Tuesday 09:00 - 16:00. Please keep balcony blinds drawn.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && <RecordPaymentModal defaultTenantId={tenant.id} onClose={() => setShowPaymentModal(false)} />}
      {showTicketModal && <NewTicketModal defaultUnitId={unit?.id} onClose={() => setShowTicketModal(false)} />}
    </div>
  );
};
