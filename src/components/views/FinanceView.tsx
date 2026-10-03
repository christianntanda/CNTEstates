import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import {
  convertCurrency,
  formatPreciseCurrency,
  getExchangeRate,
  exchangeRateMeta,
} from '../../services/currencyService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Printer,
  Globe2,
  ArrowRightLeft,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';

export const FinanceView: React.FC = () => {
  const {
    organization,
    financialRecords,
    tenants,
    properties,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates,
    language,
    selectedPropertyId,
    setActiveTab,
    openPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<'base' | 'preferred'>('preferred');

  const activeCurrency = currencyMode === 'preferred' ? userPreferredCurrency : organizationBaseCurrency;
  const isConverted = currencyMode === 'preferred' && userPreferredCurrency !== organizationBaseCurrency;
  const currentRate = getExchangeRate(organizationBaseCurrency, userPreferredCurrency, customExchangeRates);

  const filteredRecords = financialRecords.filter((f) => {
    const matchesProperty = selectedPropertyId === 'all' || f.propertyId === selectedPropertyId;
    const matchesType = filterType === 'all' || f.type === filterType;
    const matchesSearch =
      f.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.tenantName && f.tenantName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesProperty && matchesType && matchesSearch;
  });

  // Calculate Operating Result in Base Currency
  const totalRevenueBase = financialRecords
    .filter((f) => f.type === 'rent_income' || f.type === 'utility_recharge')
    .filter((f) => f.status === 'paid')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalExpensesBase = financialRecords
    .filter((f) => f.type === 'maintenance_expense' || f.type === 'contractor_payout' || f.type === 'insurance_expense')
    .reduce((sum, f) => sum + f.amount, 0);

  const netOperatingIncomeBase = totalRevenueBase - totalExpensesBase;
  const totalArrearsBase = tenants.reduce((sum, t) => sum + (t.outstandingBalance || 0), 0);

  // Converted equivalents
  const getDisplayValue = (amountInBase: number) => {
    if (!isConverted) return amountInBase;
    return convertCurrency(amountInBase, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount;
  };

  const exportCSV = () => {
    const headers = [
      'Invoice Number',
      'Type',
      'Property',
      'Unit',
      'Tenant',
      `Amount (${organizationBaseCurrency})`,
      `Converted Amount (${userPreferredCurrency})`,
      'Exchange Rate',
      'Date',
      'Status',
      'Description',
    ];
    const rows = filteredRecords.map((r) => {
      const conv = convertCurrency(r.amount, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);
      return [
        r.invoiceNumber,
        r.type,
        r.propertyName,
        r.unitNumber || '',
        r.tenantName || '',
        r.amount,
        conv.convertedAmount,
        conv.rate,
        r.date,
        r.status,
        `"${r.description.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintProfitLoss = () => {
    const selectedPropName =
      selectedPropertyId === 'all'
        ? 'All Portfolio Premises'
        : properties.find((p) => p.id === selectedPropertyId)?.name || 'Premises';

    openPrint({
      type: 'property_report',
      title: 'Net Operating Income & Cash Flow Statement',
      documentNumber: `NOI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      propertyName: selectedPropName,
      date: new Date().toISOString().split('T')[0],
      originalCurrency: organizationBaseCurrency,
      originalAmount: netOperatingIncomeBase,
      displayCurrency: userPreferredCurrency,
      displayAmount: getDisplayValue(netOperatingIncomeBase),
      exchangeRate: currentRate,
      exchangeRateDate: exchangeRateMeta.effectiveDate,
      sections: [
        {
          title: 'Executive Financial Summary',
          description: 'Comprehensive cash-flow and net operating result for the rental portfolio under management.',
          items: [
            { label: 'Reporting Basis', value: currencyMode === 'preferred' ? `Display (${userPreferredCurrency})` : `Base Ledger (${organizationBaseCurrency})` },
            { label: 'Functional Base Currency', value: organizationBaseCurrency },
            { label: 'Operating Country Reference', value: 'South Africa' },
            { label: 'Collection Efficiency Rate', value: '96.8%', highlight: true },
          ],
        },
        {
          title: 'Revenues vs Expenses Breakdown',
          table: {
            headers: ['Accounting Classification', 'Base Ledger Amount', 'Converted Display Value', 'Margin %'],
            rows: [
              [
                'Rental & Utility Operating Revenue',
                formatPreciseCurrency(totalRevenueBase, organizationBaseCurrency, language),
                formatPreciseCurrency(getDisplayValue(totalRevenueBase), userPreferredCurrency, language),
                '100.0%',
              ],
              [
                'Operating & Maintenance Expenses (OPEX)',
                formatPreciseCurrency(totalExpensesBase, organizationBaseCurrency, language),
                formatPreciseCurrency(getDisplayValue(totalExpensesBase), userPreferredCurrency, language),
                `${totalRevenueBase > 0 ? ((totalExpensesBase / totalRevenueBase) * 100).toFixed(1) : 0}%`,
              ],
            ],
            summary: [
              {
                label: 'Net Operating Income (NOI)',
                value: formatPreciseCurrency(
                  currencyMode === 'preferred' ? getDisplayValue(netOperatingIncomeBase) : netOperatingIncomeBase,
                  activeCurrency,
                  language
                ),
              },
            ],
          },
        },
        {
          title: 'Arrears Escalation Position',
          items: [
            {
              label: 'Total Outstanding Overdue Arrears',
              value: formatPreciseCurrency(
                currencyMode === 'preferred' ? getDisplayValue(totalArrearsBase) : totalArrearsBase,
                activeCurrency,
                language
              ),
              highlight: true,
            },
            {
              label: 'Escalation Status',
              value: 'Automated 7-day payment reminder & legal notice active',
            },
          ],
        },
      ],
      meta: {
        generatedBy: 'Financial Operations Desk',
        filtersApplied: {
          Premises: selectedPropName,
          AccountingCurrency: organizationBaseCurrency,
          DisplayPreference: userPreferredCurrency,
        },
      },
    });
  };

  const handlePrintRecord = (r: typeof financialRecords[0]) => {
    const isIncome = r.type === 'rent_income' || r.type === 'utility_recharge';
    const conv = convertCurrency(r.amount, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);

    openPrint({
      type: isIncome ? 'invoice' : 'receipt',
      title: isIncome ? 'Official Rent & Services Tax Invoice' : 'Payment Remittance Voucher',
      documentNumber: r.invoiceNumber,
      propertyName: r.propertyName,
      unitNumber: r.unitNumber,
      tenantName: r.tenantName,
      date: r.date,
      dueDate: r.dueDate,
      originalCurrency: organizationBaseCurrency,
      originalAmount: r.amount,
      displayCurrency: userPreferredCurrency,
      displayAmount: conv.convertedAmount,
      exchangeRate: conv.rate,
      exchangeRateDate: conv.rateDate,
      sections: [
        {
          title: 'Remittance Itemization',
          table: {
            headers: ['Service Description', 'Transaction Type', 'Location', 'Amount Due'],
            rows: [
              [
                r.description,
                r.type.replace('_', ' ').toUpperCase(),
                r.unitNumber ? `Unit ${r.unitNumber} (${r.propertyName})` : r.propertyName,
                formatPreciseCurrency(
                  currencyMode === 'preferred' ? conv.convertedAmount : r.amount,
                  activeCurrency,
                  language
                ),
              ],
            ],
            summary: [
              {
                label: 'Subtotal Due',
                value: formatPreciseCurrency(
                  currencyMode === 'preferred' ? conv.convertedAmount : r.amount,
                  activeCurrency,
                  language
                ),
              },
              {
                label: 'Payment Status',
                value: r.status.toUpperCase(),
              },
            ],
          },
        },
        {
          title: 'Financial Integrity & Remittance Instructions',
          description:
            'All remittances must quote this invoice reference number. Original financial record remains strictly anchored in base ledger currency to guarantee audit trail reproducibility.',
          notes:
            'Payment remitted directly to Centurion Realty Holdings Ltd operational accounts. Thank you for your continued tenancy.',
        },
      ],
      meta: {
        generatedBy: 'Central Accounting Desk',
        signaturesRequired: ['Authorized Financial Controller', 'Tenant / Remitter Acceptance'],
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Financial Oversight & Rent Roll</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Revenues − Expenses = Net Operating Result (NOI). Multi-currency accounting with original transaction preservation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Currency Display Mode Selector (1.9 Financial Reports) */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setCurrencyMode('base')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                currencyMode === 'base'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`View ledgers in official Organization Base Currency (${organizationBaseCurrency})`}
            >
              Base ({organizationBaseCurrency})
            </button>
            <button
              onClick={() => setCurrencyMode('preferred')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                currencyMode === 'preferred'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`View ledgers converted to User Display Preference (${userPreferredCurrency})`}
            >
              Display ({userPreferredCurrency})
            </button>
          </div>

          <button
            onClick={handlePrintProfitLoss}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Generate print-ready P&L financial statement"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print P&L Statement</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Free Plan Permanent Capability Banner (Sequence 11) */}
      {organization.planId === 'free' && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/60 border border-emerald-800 rounded-lg text-emerald-400 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <span>Free Plan: Manual Rent Recording</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                  Permanent Free Plan
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Included permanent capability: Record cash, check, and bank transfer rent payments with printable receipts and balance ledger. Payment gateway sync requires upgrade.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('subscription')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Upgrade for Automated Gateways</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Conversion Transparency Alert Banner (1.8) */}
      {isConverted && (
        <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3.5 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300">Display Currency Active:</span>
              <span className="text-slate-300 ml-1.5">
                Financial records are converted from <strong>{organizationBaseCurrency}</strong> to <strong>{userPreferredCurrency}</strong> for display preference.
              </span>
            </div>
          </div>
          <div className="font-mono text-[11px] text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded border border-amber-700/60">
            1 {organizationBaseCurrency} = {currentRate} {userPreferredCurrency} · Effective: {exchangeRateMeta.effectiveDate}
          </div>
        </div>
      )}

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operating Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Operating Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatPreciseCurrency(
              currencyMode === 'preferred' ? getDisplayValue(totalRevenueBase) : totalRevenueBase,
              activeCurrency,
              language
            )}
          </div>
          {isConverted ? (
            <div className="text-[11px] font-mono text-slate-400">
              Base: {formatPreciseCurrency(totalRevenueBase, organizationBaseCurrency, language)}
            </div>
          ) : (
            <div className="text-[11px] text-emerald-400 font-medium">96.8% Collection efficiency</div>
          )}
        </div>

        {/* Operating Expenses (OPEX) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Operating Expenses (OPEX)</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatPreciseCurrency(
              currencyMode === 'preferred' ? getDisplayValue(totalExpensesBase) : totalExpensesBase,
              activeCurrency,
              language
            )}
          </div>
          {isConverted ? (
            <div className="text-[11px] font-mono text-slate-400">
              Base: {formatPreciseCurrency(totalExpensesBase, organizationBaseCurrency, language)}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Maintenance & contractor invoices</div>
          )}
        </div>

        {/* Net Operating Income (NOI) */}
        <div className="bg-slate-900 border border-emerald-900/60 p-4 rounded-xl space-y-2 bg-gradient-to-br from-emerald-950/20 to-slate-900">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Net Operating Income (NOI)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 font-mono">
            {formatPreciseCurrency(
              currencyMode === 'preferred' ? getDisplayValue(netOperatingIncomeBase) : netOperatingIncomeBase,
              activeCurrency,
              language
            )}
          </div>
          {isConverted ? (
            <div className="text-[11px] font-mono text-slate-400">
              Base: {formatPreciseCurrency(netOperatingIncomeBase, organizationBaseCurrency, language)}
            </div>
          ) : (
            <div className="text-[11px] text-emerald-400">Revenue minus all operational expenses</div>
          )}
        </div>

        {/* Outstanding Arrears */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Overdue Arrears</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {formatPreciseCurrency(
              currencyMode === 'preferred' ? getDisplayValue(totalArrearsBase) : totalArrearsBase,
              activeCurrency,
              language
            )}
          </div>
          {isConverted ? (
            <div className="text-[11px] font-mono text-slate-400">
              Base: {formatPreciseCurrency(totalArrearsBase, organizationBaseCurrency, language)}
            </div>
          ) : (
            <div className="text-[11px] text-rose-400 font-medium">Automated escalation notices active</div>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, tenant, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'rent_income', label: 'Rent Incomes' },
            { id: 'maintenance_expense', label: 'Maintenance Costs' },
            { id: 'contractor_payout', label: 'Contractor Payouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 cursor-pointer ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice / Ref #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Entity / Tenant</th>
                <th className="py-3 px-4">Property / Location</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount ({activeCurrency})</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Universal Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRecords.map((r) => {
                const isIncome = r.type === 'rent_income' || r.type === 'utility_recharge';
                const conv = convertCurrency(r.amount, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);

                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{r.invoiceNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] uppercase font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {r.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {r.tenantName || 'Building Facility'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300">{r.propertyName}</div>
                      {r.unitNumber && <div className="text-[11px] text-slate-400">Unit {r.unitNumber}</div>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{formatDate(r.date, language)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className={isIncome ? 'text-emerald-400' : 'text-slate-200'}>
                        {isIncome ? '+' : '-'}
                        {formatPreciseCurrency(
                          currencyMode === 'preferred' ? conv.convertedAmount : r.amount,
                          activeCurrency,
                          language
                        )}
                      </div>
                      {isConverted && (
                        <div className="text-[10px] text-slate-500 font-normal">
                          Orig: {formatPreciseCurrency(r.amount, organizationBaseCurrency, language)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          r.status === 'paid'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                            : r.status === 'overdue'
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-900'
                            : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handlePrintRecord(r)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title={isIncome ? 'Print Official Rent Tax Invoice' : 'Print Remittance Voucher'}
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPaymentModal && <RecordPaymentModal onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
};
