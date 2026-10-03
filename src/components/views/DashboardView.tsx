import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  convertCurrency,
  formatPreciseCurrency,
  getExchangeRate,
  currencyCatalogue,
} from '../../services/currencyService';
import {
  Building2,
  Home,
  Users,
  AlertTriangle,
  LifeBuoy,
  Wrench,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Calendar,
  Zap,
  Printer,
  Globe2,
} from 'lucide-react';
import { NewTicketModal } from '../modals/NewTicketModal';
import { NewTenantModal } from '../modals/NewTenantModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

export const DashboardView: React.FC = () => {
  const {
    t,
    language,
    currency,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates,
    openPrint,
    properties,
    buildings,
    units,
    tenants,
    leases,
    tickets,
    workOrders,
    financialRecords,
    complianceCertificates,
    setActiveTab,
    selectedPropertyId,
  } = useApp();

  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Filter based on selected property if any
  const filteredProperties =
    selectedPropertyId === 'all'
      ? properties
      : properties.filter((p) => p.id === selectedPropertyId);

  const filteredPropertyIds = filteredProperties.map((p) => p.id);

  const filteredUnits = units.filter((u) =>
    selectedPropertyId === 'all' ? true : filteredPropertyIds.includes(u.propertyId)
  );

  const totalUnits = filteredUnits.length;
  const occupiedUnits = filteredUnits.filter((u) => u.status === 'occupied').length;
  const vacantUnits = filteredUnits.filter((u) => u.status === 'vacant').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const filteredTenants = tenants.filter((t) =>
    selectedPropertyId === 'all' ? true : filteredPropertyIds.includes(t.propertyId)
  );

  const rentCollected = financialRecords
    .filter((f) => f.type === 'rent_income' && f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0);

  const outstandingArrears = filteredTenants.reduce((sum, t) => sum + (t.outstandingBalance || 0), 0);

  const openTickets = tickets.filter(
    (t) =>
      t.status !== 'closed' &&
      t.status !== 'completed' &&
      (selectedPropertyId === 'all' || t.propertyId === selectedPropertyId)
  );

  const criticalEmergencies = openTickets.filter(
    (t) => t.priority === 'emergency' || t.priority === 'critical'
  );

  const activeWorkOrders = workOrders.filter(
    (wo) =>
      wo.status !== 'completed' &&
      wo.status !== 'approved' &&
      (selectedPropertyId === 'all' || wo.propertyId === selectedPropertyId)
  );

  const expiringCompliance = complianceCertificates.filter(
    (c) =>
      (c.status === 'expiring_soon' || c.status === 'expired') &&
      (selectedPropertyId === 'all' || c.propertyId === selectedPropertyId)
  );

  const expiringLeases = leases.filter(
    (l) =>
      (l.status === 'expiring' || l.daysRemaining <= 60) &&
      (selectedPropertyId === 'all' || l.propertyId === selectedPropertyId)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Operational Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            {t.dashboard.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{t.dashboard.subtitle}</p>
        </div>

        {/* Quick Operations Button Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const conversion = convertCurrency(
                rentCollected,
                organizationBaseCurrency,
                userPreferredCurrency,
                customExchangeRates
              );
              openPrint({
                type: 'dashboard_executive',
                title: 'Executive Portfolio Operations Digest',
                documentNumber: `EXEC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
                date: new Date().toISOString().split('T')[0],
                originalCurrency: organizationBaseCurrency,
                originalAmount: rentCollected,
                displayCurrency: userPreferredCurrency,
                displayAmount: conversion.convertedAmount,
                exchangeRate: conversion.rate,
                exchangeRateDate: conversion.rateDate,
                sections: [
                  {
                    title: 'Executive Performance Summary',
                    description: 'Real-time aggregated portfolio indicators across occupancy, financial collections, service desk resolution, and statutory compliance.',
                    items: [
                      { label: 'Portfolio Occupancy Rate', value: `${occupancyRate}% (${occupiedUnits}/${totalUnits} Units)`, highlight: true },
                      { label: 'Active Leased Tenants', value: `${filteredTenants.length} Residents / Businesses` },
                      { label: 'Open Service Tickets', value: `${openTickets.length} (${criticalEmergencies.length} Critical Emergencies)` },
                      { label: 'Active Work Orders', value: `${activeWorkOrders.length} in progress` },
                      { label: 'Statutory Compliance', value: `${complianceCertificates.length - expiringCompliance.length}/${complianceCertificates.length} Valid Certs` },
                    ],
                  },
                  {
                    title: 'Financial Revenue & Arrears Audit',
                    table: {
                      headers: ['Financial Dimension', 'Base Accounting Amount', 'Display Value', 'Status'],
                      rows: [
                        [
                          'Month-to-Date Rent Collected',
                          formatPreciseCurrency(rentCollected, organizationBaseCurrency, language),
                          formatPreciseCurrency(conversion.convertedAmount, userPreferredCurrency, language),
                          'Collected',
                        ],
                        [
                          'Outstanding Tenant Arrears',
                          formatPreciseCurrency(outstandingArrears, organizationBaseCurrency, language),
                          formatPreciseCurrency(
                            convertCurrency(outstandingArrears, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount,
                            userPreferredCurrency,
                            language
                          ),
                          'Overdue Escalated',
                        ],
                      ],
                      summary: [
                        {
                          label: 'Net Cash Flow Position',
                          value: `${formatPreciseCurrency(rentCollected, organizationBaseCurrency, language)} (${organizationBaseCurrency} Base)`,
                        },
                      ],
                    },
                  },
                  {
                    title: 'Premises Breakdown',
                    table: {
                      headers: ['Property Name', 'Location', 'Total Units', 'Occupied Units', 'Occupancy %'],
                      rows: filteredProperties.map((p) => [
                        p.name,
                        `${p.city}, ${p.country}`,
                        p.totalUnits,
                        p.occupiedUnits,
                        `${p.totalUnits > 0 ? Math.round((p.occupiedUnits / p.totalUnits) * 100) : 0}%`,
                      ]),
                    },
                  },
                ],
                meta: {
                  generatedBy: 'Operations Command Center',
                  filtersApplied: {
                    Property: selectedPropertyId === 'all' ? 'All Portfolio Properties' : (properties.find(p => p.id === selectedPropertyId)?.name || selectedPropertyId),
                    BaseCurrency: organizationBaseCurrency,
                    DisplayCurrency: userPreferredCurrency,
                  },
                },
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Generate audit-ready print or PDF report"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Print Digest</span>
          </button>

          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.dashboard.newTicket}</span>
          </button>

          <button
            onClick={() => setShowNewTenantModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.dashboard.newTenant}</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.dashboard.collectRent}</span>
          </button>
        </div>
      </div>

      {/* Critical SLA Alarm Banner if any emergency tickets */}
      {criticalEmergencies.length > 0 && (
        <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-4 text-slate-200 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-900/60 text-rose-300 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-300 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-rose-100 flex items-center gap-2">
                  <span>{criticalEmergencies.length} Critical / Emergency Maintenance Tickets Active</span>
                  <span className="text-[11px] text-rose-400 font-mono">SLA Under Monitoring</span>
                </div>
                <div className="text-xs text-rose-200/90 mt-1 space-y-1">
                  {criticalEmergencies.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-rose-300">[{item.code}]</span>
                      <span>{item.title}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-300">{item.propertyName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('serviceDesk')}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-800/80 hover:bg-rose-700 text-rose-100 rounded-lg transition-colors shrink-0"
            >
              Open Service Desk
            </button>
          </div>
        </div>
      )}

      {/* High-Level Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div
          onClick={() => setActiveTab('units')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.dashboard.occupancyRate}</span>
            <Home className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{occupancyRate}%</span>
            <span className="text-xs text-emerald-400 font-medium">
              {occupiedUnits} / {totalUnits} {t.common.occupied.toLowerCase()}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{vacantUnits} vacant lots</span>
            <span className="group-hover:text-emerald-400 flex items-center gap-0.5">
              Inspect units <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Rent Collection Card */}
        <div
          onClick={() => setActiveTab('finance')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.dashboard.rentCollected}</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {formatPreciseCurrency(
                convertCurrency(rentCollected, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount,
                userPreferredCurrency,
                language
              )}
            </span>
            {userPreferredCurrency !== organizationBaseCurrency && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-700/60 px-1.5 py-0.5 rounded">
                conv
              </span>
            )}
          </div>
          {userPreferredCurrency !== organizationBaseCurrency ? (
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              <span>Base: </span>
              <strong className="text-slate-300 font-semibold">{formatPreciseCurrency(rentCollected, organizationBaseCurrency, language)}</strong>
              <span className="text-[10px] text-slate-500 block">
                1 {organizationBaseCurrency} = {getExchangeRate(organizationBaseCurrency, userPreferredCurrency, customExchangeRates)} {userPreferredCurrency}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-[11px] font-mono text-emerald-400/80">
              Base Ledger ({organizationBaseCurrency})
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-rose-400 font-medium">
              {formatPreciseCurrency(
                convertCurrency(outstandingArrears, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount,
                userPreferredCurrency,
                language
              )} {t.dashboard.outstandingArrears.toLowerCase()}
            </span>
            <span className="group-hover:text-emerald-400 flex items-center gap-0.5 text-slate-400">
              Rent roll <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Service Desk Open Tickets Card */}
        <div
          onClick={() => setActiveTab('serviceDesk')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.dashboard.openTickets}</span>
            <LifeBuoy className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{openTickets.length}</span>
            <span className="text-xs text-slate-400">in queue</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="text-amber-400 font-medium">{activeWorkOrders.length} active work orders</span>
            <span className="group-hover:text-emerald-400 flex items-center gap-0.5">
              Tickets <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Governance & Compliance Card */}
        <div
          onClick={() => setActiveTab('compliance')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.dashboard.complianceExpiring}</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {expiringCompliance.length}
            </span>
            <span className="text-xs text-amber-400 font-medium">require renewal</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>100% legal coverage</span>
            <span className="group-hover:text-emerald-400 flex items-center gap-0.5">
              Certificates <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Grid: Active Operational Pipeline & Immediate Action Required */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Operational Work Orders & Service Requests Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Work Orders In Field */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Active Maintenance & Work Orders</h3>
              </div>
              <button
                onClick={() => setActiveTab('workOrders')}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all ({workOrders.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              {workOrders.slice(0, 4).map((wo) => (
                <div key={wo.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-400">{wo.workOrderNumber}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-medium text-slate-200 text-xs sm:text-sm">{wo.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                      <span>{wo.propertyName}</span>
                      {wo.unitNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Unit {wo.unitNumber}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300">Assignee: {wo.assignedTo}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {formatCurrency(wo.totalCost, currency, language)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{wo.status}</div>
                    </div>
                    <button
                      onClick={() => setActiveTab('workOrders')}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Properties Hierarchy Snapshot */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm">Portfolio Property Hierarchy</h3>
              </div>
              <button
                onClick={() => setActiveTab('properties')}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Manage Properties</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {filteredProperties.slice(0, 4).map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setActiveTab('properties')}
                  className="p-3.5 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs sm:text-sm">{prop.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {prop.city}, {prop.country}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">
                      {prop.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300 border-t border-slate-700/40 pt-2 font-mono">
                    <span>{prop.totalUnits} Units</span>
                    <span className="text-emerald-400">
                      {Math.round((prop.occupiedUnits / prop.totalUnits) * 100)}% Occ
                    </span>
                    <span>{prop.totalBuildings} Bldgs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Immediate Action Items (Leases Expiring, Arrears, AI Assist) */}
        <div className="space-y-6">
          {/* AI Operations Prompt Card */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>AI Operations Co-Pilot</span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Ready to analyze SLA breaches, project next month's cash flow, or draft lease renewal escalations.
            </p>
            <div className="mt-3 space-y-1.5">
              <button
                onClick={() => setActiveTab('aiAssistant')}
                className="w-full text-left text-[11px] text-slate-300 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-700/60 transition-colors truncate block"
              >
                "Show all critical issues & SLA deadlines"
              </button>
              <button
                onClick={() => setActiveTab('aiAssistant')}
                className="w-full text-left text-[11px] text-slate-300 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-700/60 transition-colors truncate block"
              >
                "Which leases expire in next 90 days?"
              </button>
            </div>
            <button
              onClick={() => setActiveTab('aiAssistant')}
              className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
            >
              Consult AI Assistant
            </button>
          </div>

          {/* Expiring Leases Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-slate-100 text-xs">Leases Expiring Soon</h4>
              </div>
              <button
                onClick={() => setActiveTab('leasing')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              {expiringLeases.slice(0, 3).map((l) => (
                <div key={l.id} className="py-2 text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-200">
                    <span className="truncate">{l.tenantName}</span>
                    <span className="font-mono text-amber-400 text-[11px]">{l.daysRemaining} days</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                    <span>
                      {l.propertyName} ({l.unitNumber})
                    </span>
                    <span className="font-mono">{formatCurrency(l.monthlyRent, currency, language)}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tenants in Arrears */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h4 className="font-bold text-slate-100 text-xs">Arrears & Late Rent</h4>
              </div>
              <button
                onClick={() => setActiveTab('finance')}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Finance Hub
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              {filteredTenants
                .filter((t) => (t.outstandingBalance || 0) > 0)
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} className="py-2 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200 truncate">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.vehicles.length > 0 ? t.vehicles[0] : 'Resident'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-400">
                        {formatCurrency(t.outstandingBalance, currency, language)}
                      </div>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals for Direct Execution */}
      {showNewTicketModal && <NewTicketModal onClose={() => setShowNewTicketModal(false)} />}
      {showNewTenantModal && <NewTenantModal onClose={() => setShowNewTenantModal(false)} />}
      {showPaymentModal && <RecordPaymentModal onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
};
