import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TicketPriority, TicketStatus, ServiceTicket } from '../../types';
import { formatCurrency, formatDate } from '../../i18n/translations';
import { formatPreciseCurrency, convertCurrency } from '../../services/currencyService';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wrench,
  User,
  HardHat,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { NewTicketModal } from '../modals/NewTicketModal';

export const ServiceDeskView: React.FC = () => {
  const {
    organization,
    tickets,
    properties,
    units,
    contractors,
    currency,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates,
    language,
    updateTicketStatus,
    createWorkOrderFromTicket,
    selectedPropertyId,
    setActiveTab,
    openPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);

  // Dispatch work order modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [assigneeName, setAssigneeName] = useState('Carlos Mendez (In-House Staff)');
  const [isContractor, setIsContractor] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    const matchesProperty = selectedPropertyId === 'all' || t.propertyId === selectedPropertyId;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch =
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesPriority && matchesStatus && matchesSearch;
  });

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'emergency':
        return 'text-rose-400 bg-rose-950/70 border border-rose-800 animate-pulse';
      case 'critical':
        return 'text-red-400 bg-red-950/60 border border-red-900';
      case 'high':
        return 'text-amber-400 bg-amber-950/60 border border-amber-900';
      case 'normal':
        return 'text-blue-400 bg-blue-950/60 border border-blue-900';
      case 'low':
        return 'text-slate-400 bg-slate-800 border border-slate-700';
    }
  };

  const handleDispatchWO = () => {
    if (!selectedTicket) return;
    createWorkOrderFromTicket(selectedTicket.id, assigneeName, isContractor);
    setShowDispatchModal(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-emerald-400" />
            <span>Service Desk & Ticket Central</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Centralized intake with ticket codes, real-time SLA countdowns, priority classification, and work order conversion.
          </p>
        </div>

        <button
          onClick={() => setShowNewTicketModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Ticket</span>
        </button>
      </div>

      {/* Free Plan Permanent Capability Banner (Sequence 11) */}
      {organization.planId === 'free' && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/60 border border-emerald-800 rounded-lg text-emerald-400 shrink-0">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>Free Plan: Simple Service Requests</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  Permanent Free Plan
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Included permanent capability: Ticket intake, issue categorization, and in-house resolution. Automated SLA timers and contractor bidding matrices require upgrade.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('subscription')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Upgrade for SLA Automation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SLA Legend Banner */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Configured SLA Response & Resolution Standards:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span className="text-rose-400">Emergency: 15m / 4h</span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400">Critical: 30m / 8h</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400">High: 2h / 24h</span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400">Normal: 8h / 3d</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Low: 24h / 7d</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket code (e.g. CBM-00452)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono font-bold text-sm text-emerald-400">[{ticket.code}]</span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded font-mono ${getPriorityBadge(
                    ticket.priority
                  )}`}
                >
                  {ticket.priority}
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase font-semibold">
                  {ticket.category.replace('_', ' ')}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs text-slate-400 font-mono">
                  SLA Target: {ticket.slaTargetHours}h
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {ticket.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{ticket.description}</p>
              </div>

              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                <span>Property: <strong className="text-slate-300">{ticket.propertyName}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Unit: <strong className="text-slate-300">{ticket.unitNumber}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Reporter: <strong className="text-slate-300">{ticket.tenantName}</strong></span>
                {ticket.workOrderId && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400 font-mono font-semibold">WO: {ticket.workOrderId}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right Status & Action Column */}
            <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
              <div className="text-right">
                <span
                  className={`text-xs font-semibold uppercase px-2.5 py-1 rounded block ${
                    ticket.status === 'completed' || ticket.status === 'closed'
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                      : ticket.status === 'in_progress'
                      ? 'text-blue-400 bg-blue-950/60 border border-blue-900'
                      : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                  }`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
                {ticket.cost && (
                  <span className="text-xs font-mono text-slate-400 mt-1 block">
                    Cost: {formatCurrency(ticket.cost, currency, language)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openPrint({
                      type: 'service_ticket',
                      title: 'Building Service Desk Incident Dossier',
                      documentNumber: ticket.code,
                      propertyName: ticket.propertyName,
                      unitNumber: ticket.unitNumber,
                      tenantName: ticket.tenantName,
                      date: ticket.createdAt,
                      originalCurrency: organizationBaseCurrency,
                      originalAmount: ticket.cost || 0,
                      displayCurrency: userPreferredCurrency,
                      displayAmount: ticket.cost
                        ? convertCurrency(ticket.cost, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount
                        : 0,
                      sections: [
                        {
                          title: 'Incident Classification & Dispatch',
                          items: [
                            { label: 'Ticket Code', value: ticket.code, highlight: true },
                            { label: 'Priority Tier', value: ticket.priority.toUpperCase() },
                            { label: 'Category', value: ticket.category.toUpperCase() },
                            { label: 'Incident Status', value: ticket.status.replace('_', ' ').toUpperCase() },
                            { label: 'Associated Work Order', value: ticket.workOrderId || 'Pending Dispatch' },
                          ],
                        },
                        {
                          title: 'Tenant Incident Description',
                          description: ticket.description,
                        },
                        {
                          title: 'Remediation Sign-Off',
                          notes: 'Technician has inspected site, executed maintenance procedures, and tested premises functions.',
                        },
                      ],
                      meta: {
                        generatedBy: 'Central Building Operations Desk',
                        signaturesRequired: ['Building Service Manager', 'Tenant Verification Acceptance'],
                      },
                    });
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-xs transition-colors cursor-pointer"
                  title="Print official incident report dossier"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                {!ticket.workOrderId && ticket.status !== 'closed' && (
                  <button
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowDispatchModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded text-xs font-medium transition-colors"
                  >
                    Convert to WO
                  </button>
                )}

                {ticket.status !== 'closed' && ticket.status !== 'completed' && (
                  <button
                    onClick={() => updateTicketStatus(ticket.id, 'completed', 'Work verified and resolved.')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Convert to Work Order Modal */}
      {showDispatchModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              <span>Issue Work Order from [{selectedTicket.code}]</span>
            </h3>

            <p className="text-xs text-slate-400">
              Generate an auditable field execution order with labor hours, materials tracking, and checklist procedures.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Ticket Summary</label>
                <div className="p-2.5 bg-slate-800 rounded border border-slate-700 text-slate-200">
                  {selectedTicket.title} ({selectedTicket.propertyName} - {selectedTicket.unitNumber})
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assignment Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsContractor(false)}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      !isContractor
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    In-House Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsContractor(true)}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors ${
                      isContractor
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    External Contractor
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Technician or Firm</label>
                {isContractor ? (
                  <select
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {contractors.map((c) => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName} (SLA {c.slaComplianceRate}%)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchWO}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Authorize & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTicketModal && <NewTicketModal onClose={() => setShowNewTicketModal(false)} />}
    </div>
  );
};
