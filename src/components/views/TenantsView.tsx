import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import { formatPreciseCurrency, convertCurrency } from '../../services/currencyService';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Home,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Car,
  Shield,
  CreditCard,
  Printer,
  ArrowRight,
} from 'lucide-react';
import { NewTenantModal } from '../modals/NewTenantModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

export const TenantsView: React.FC = () => {
  const {
    organization,
    tenants,
    units,
    properties,
    leases,
    currency,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates,
    language,
    selectedPropertyId,
    setActiveTab,
    openPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTenantIdForPayment, setSelectedTenantIdForPayment] = useState<string | null>(null);

  const filteredTenants = tenants.filter((t) => {
    const matchesProperty = selectedPropertyId === 'all' || t.propertyId === selectedPropertyId;
    const matchesStatus = filterStatus === 'all' || t.paymentStatus === filterStatus;
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm);
    return matchesProperty && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Tenant & Occupant Profiles</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Comprehensive tenant directory with lease links, deposit escrows, vehicle permits, and arrears tracking.
          </p>
        </div>

        <button
          onClick={() => setShowNewTenantModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register Tenant</span>
        </button>
      </div>

      {/* Free Plan Permanent Capability Banner (Sequence 11) */}
      {organization.planId === 'free' && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/60 border border-emerald-800 rounded-lg text-emerald-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>Free Plan: Very Basic Tenant Directory</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  Permanent Free Plan
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Included permanent capability: Up to 2 rental units, 1 property. Manual records and printable statements preserved.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('subscription')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Upgrade for Tenant Portal & Screening</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Tenants' },
            { id: 'paid', label: 'Up to Date' },
            { id: 'overdue', label: 'Arrears / Overdue' },
            { id: 'partially_paid', label: 'Partially Paid' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tenant Name</th>
                <th className="py-3 px-4">Assigned Unit & Property</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Emergency Contact</th>
                <th className="py-3 px-4">Deposit Held</th>
                <th className="py-3 px-4">Arrears / Balance</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTenants.map((t) => {
                const prop = properties.find((p) => p.id === t.propertyId);
                const unit = units.find((u) => u.id === t.unitId);
                const lease = leases.find((l) => l.id === t.leaseId);

                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{t.name}</span>
                        {t.isCompany && (
                          <span className="text-[10px] text-blue-400 bg-blue-950 px-1.5 py-0.2 rounded font-mono">
                            CORP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>ID: {t.idDocumentNumber}</span>
                        <span>·</span>
                        <span>{t.occupantsCount} Occupants</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-emerald-400">{unit?.unitNumber}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{prop?.name}</div>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[170px]">{t.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{t.phone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="text-slate-300">{t.emergencyContact.name}</div>
                      <div className="text-slate-400">{t.emergencyContact.phone}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {formatCurrency(t.depositHeld, currency, language)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div
                        className={`font-mono font-bold ${
                          t.outstandingBalance > 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(t.outstandingBalance, currency, language)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          t.paymentStatus === 'paid'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                            : t.paymentStatus === 'overdue'
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-900'
                            : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                        }`}
                      >
                        {t.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const unit = units.find((u) => u.id === t.unitId);
                          const prop = properties.find((p) => p.id === t.propertyId);
                          const lease = leases.find((l) => l.tenantId === t.id);
                          const conv = convertCurrency(t.outstandingBalance, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);

                          openPrint({
                            type: 'tenant_statement',
                            title: 'Resident Tenancy Statement & Account Balance',
                            documentNumber: `STMT-${t.id.slice(-6).toUpperCase()}`,
                            propertyName: prop?.name,
                            unitNumber: unit?.unitNumber,
                            tenantName: t.name,
                            date: new Date().toISOString().split('T')[0],
                            originalCurrency: organizationBaseCurrency,
                            originalAmount: t.outstandingBalance,
                            displayCurrency: userPreferredCurrency,
                            displayAmount: conv.convertedAmount,
                            exchangeRate: conv.rate,
                            exchangeRateDate: conv.rateDate,
                            sections: [
                              {
                                title: 'Tenancy Profile & Lease Reference',
                                items: [
                                  { label: 'Primary Tenant', value: t.name, highlight: true },
                                  { label: 'Contact Phone', value: t.phone },
                                  { label: 'Registered Email', value: t.email },
                                  { label: 'Assigned Unit', value: unit ? `Unit ${unit.unitNumber} (${prop?.name})` : 'Premises' },
                                  { label: 'Lease Status', value: lease?.status.toUpperCase() || 'ACTIVE' },
                                  { label: 'Monthly Rental', value: lease ? formatPreciseCurrency(lease.monthlyRent, organizationBaseCurrency, language) : 'N/A' },
                                  { label: 'Security Deposit Held', value: lease ? formatPreciseCurrency(lease.depositAmount, organizationBaseCurrency, language) : 'N/A' },
                                ],
                              },
                              {
                                title: 'Account Reconciliation & Current Standing',
                                table: {
                                  headers: ['Account Dimension', `Base Amount (${organizationBaseCurrency})`, `Display Value (${userPreferredCurrency})`, 'Status'],
                                  rows: [
                                    [
                                      'Current Period Rent Charges',
                                      formatPreciseCurrency(lease?.monthlyRent || 0, organizationBaseCurrency, language),
                                      formatPreciseCurrency(
                                        convertCurrency(lease?.monthlyRent || 0, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount,
                                        userPreferredCurrency,
                                        language
                                      ),
                                      'Current',
                                    ],
                                    [
                                      'Overdue Arrears Balance',
                                      formatPreciseCurrency(t.outstandingBalance, organizationBaseCurrency, language),
                                      formatPreciseCurrency(conv.convertedAmount, userPreferredCurrency, language),
                                      t.outstandingBalance > 0 ? 'Overdue' : 'Settled',
                                    ],
                                  ],
                                  summary: [
                                    {
                                      label: 'Total Net Outstanding Due',
                                      value: formatPreciseCurrency(t.outstandingBalance, organizationBaseCurrency, language),
                                    },
                                  ],
                                },
                              },
                              {
                                title: 'Payment Remittance Instructions',
                                description:
                                  'Please quote your tenant reference code on all banking transactions. Ensure prompt clearance before the 1st of each calendar month.',
                              },
                            ],
                            meta: {
                              generatedBy: 'Tenant Relations & Billing Management',
                              signaturesRequired: ['Authorized Property Manager', 'Tenant Acceptance Acknowledgment'],
                            },
                          });
                        }}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors inline-block"
                        title="Print official tenant statement & arrears dossier"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      {t.outstandingBalance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedTenantIdForPayment(t.id);
                            setShowPaymentModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          Collect
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('leasing')}
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        Lease
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showNewTenantModal && <NewTenantModal onClose={() => setShowNewTenantModal(false)} />}
      {showPaymentModal && (
        <RecordPaymentModal
          defaultTenantId={selectedTenantIdForPayment || undefined}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedTenantIdForPayment(null);
          }}
        />
      )}
    </div>
  );
};
