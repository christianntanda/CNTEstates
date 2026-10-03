import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import { formatPreciseCurrency, convertCurrency } from '../../services/currencyService';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Download,
  Eye,
  Printer,
} from 'lucide-react';

export const LeasingView: React.FC = () => {
  const {
    leases,
    properties,
    units,
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
  const [previewLease, setPreviewLease] = useState<(typeof leases)[0] | null>(null);

  const filteredLeases = leases.filter((l) => {
    const matchesProperty = selectedPropertyId === 'all' || l.propertyId === selectedPropertyId;
    const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchesSearch =
      l.leaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.unitNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            <span>Leasing & Contract Lifecycle</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Application → Approval → Active Lease → Renewal Alerts → Escalation & Deposit Release.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('tenants')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Lease Agreement</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search lease # or tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Leases' },
            { id: 'active', label: 'Active' },
            { id: 'expiring', label: 'Expiring Soon' },
            { id: 'pending_approval', label: 'Pending Approval' },
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

      {/* Leases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Lease Code</th>
                <th className="py-3 px-4">Tenant & Unit</th>
                <th className="py-3 px-4">Duration & Expiry</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Deposit Held</th>
                <th className="py-3 px-4">Escalation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLeases.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{l.leaseNumber}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-100">{l.tenantName}</div>
                    <div className="text-[11px] text-slate-400">
                      Unit {l.unitNumber} · {l.propertyName}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200">
                      {formatDate(l.startDate, language)} - {formatDate(l.endDate, language)}
                    </div>
                    <div className="text-[11px] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className={l.daysRemaining <= 60 ? 'text-amber-400 font-semibold font-mono' : 'text-slate-400'}>
                        {l.daysRemaining} days remaining
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                    {formatCurrency(l.monthlyRent, currency, language)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {formatCurrency(l.depositAmount, currency, language)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">+{l.escalationRatePercent}% / yr</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        l.status === 'active'
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                          : l.status === 'expiring'
                          ? 'text-amber-400 bg-amber-950/60 border border-amber-900'
                          : 'text-slate-400 bg-slate-800 border border-slate-700'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => {
                        const conv = convertCurrency(l.monthlyRent, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);
                        openPrint({
                          type: 'property_report',
                          title: 'Tenancy Lease Agreement Contract Summary',
                          documentNumber: l.leaseNumber,
                          propertyName: l.propertyName,
                          unitNumber: l.unitNumber,
                          tenantName: l.tenantName,
                          date: l.startDate,
                          dueDate: l.endDate,
                          originalCurrency: organizationBaseCurrency,
                          originalAmount: l.monthlyRent,
                          displayCurrency: userPreferredCurrency,
                          displayAmount: conv.convertedAmount,
                          exchangeRate: conv.rate,
                          exchangeRateDate: conv.rateDate,
                          sections: [
                            {
                              title: 'Lease Terms & Premises',
                              items: [
                                { label: 'Contract Number', value: l.leaseNumber, highlight: true },
                                { label: 'Premises', value: `${l.propertyName} - Unit ${l.unitNumber}` },
                                { label: 'Tenant of Record', value: l.tenantName },
                                { label: 'Term Duration', value: `${l.startDate} to ${l.endDate} (${l.daysRemaining} days remaining)` },
                                { label: 'Escalation Rate', value: `${l.escalationRatePercent}% per annum` },
                                { label: 'Due Day of Month', value: `Day ${l.paymentDueDay}` },
                              ],
                            },
                            {
                              title: 'Rental & Escrow Deposit Schedule',
                              table: {
                                headers: ['Obligation', `Base Ledger (${organizationBaseCurrency})`, `Display Value (${userPreferredCurrency})`, 'Escrow Account'],
                                rows: [
                                  [
                                    'Monthly Base Rent',
                                    formatPreciseCurrency(l.monthlyRent, organizationBaseCurrency, language),
                                    formatPreciseCurrency(conv.convertedAmount, userPreferredCurrency, language),
                                    'Operational Account',
                                  ],
                                  [
                                    'Refundable Security Deposit',
                                    formatPreciseCurrency(l.depositAmount, organizationBaseCurrency, language),
                                    formatPreciseCurrency(
                                      convertCurrency(l.depositAmount, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount,
                                      userPreferredCurrency,
                                      language
                                    ),
                                    'Escrow Trust Account',
                                  ],
                                ],
                              },
                            },
                            {
                              title: 'Special Covenants & Rules',
                              checklist: l.specialClauses.map((c) => ({ text: c, completed: true })),
                            },
                          ],
                          meta: {
                            generatedBy: 'Central Legal & Leasing Secretariat',
                            signaturesRequired: ['Authorized Landlord Representative', 'Primary Tenant Lessee'],
                          },
                        });
                      }}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors inline-block"
                      title="Print official lease contract summary dossier"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    </button>

                    <button
                      onClick={() => setPreviewLease(l)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 text-xs transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lease Document Review Modal */}
      {previewLease && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">
                  Lease Agreement Dossier: {previewLease.leaseNumber}
                </h3>
              </div>
              <button
                onClick={() => setPreviewLease(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Monthly Rent</span>
                  <span className="font-bold text-slate-100 text-sm">
                    {formatCurrency(previewLease.monthlyRent, currency, language)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Deposit Escrow</span>
                  <span className="font-bold text-slate-100 text-sm">
                    {formatCurrency(previewLease.depositAmount, currency, language)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Escalation</span>
                  <span className="font-bold text-emerald-400 text-sm">+{previewLease.escalationRatePercent}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Payment Due Day</span>
                  <span className="font-bold text-slate-100 text-sm">Day {previewLease.paymentDueDay}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                  Tenant & Property Identification
                </h4>
                <p className="text-slate-300">
                  Tenant of Record: <strong>{previewLease.tenantName}</strong>
                </p>
                <p className="text-slate-400">
                  Premises: Unit {previewLease.unitNumber} at {previewLease.propertyName}
                </p>
                <p className="text-slate-400">
                  Term: {formatDate(previewLease.startDate, language)} to{' '}
                  {formatDate(previewLease.endDate, language)} ({previewLease.daysRemaining} days remaining)
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                  Special Clauses & Covenant Addenda
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {previewLease.specialClauses.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-1">
                  Executed Legal Documents Vault
                </h4>
                <div className="flex flex-wrap gap-2">
                  {previewLease.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-emerald-400 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setPreviewLease(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
