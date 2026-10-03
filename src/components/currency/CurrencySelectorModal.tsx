import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { currencyCatalogue, countryCurrencyCatalogue, getExchangeRate } from '../../services/currencyService';
import {
  DollarSign,
  Search,
  CheckCircle2,
  X,
  Globe2,
  Building,
  Info,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface CurrencySelectorModalProps {
  onClose: () => void;
  mode?: 'user_display' | 'organization_base';
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  onClose,
  mode = 'user_display',
}) => {
  const {
    organizationBaseCurrency,
    userPreferredCurrency,
    setUserPreferredCurrency,
    updateOrganizationBaseCurrency,
    customExchangeRates,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(
    mode === 'organization_base' ? organizationBaseCurrency : userPreferredCurrency
  );
  const [baseChangeWarning, setBaseChangeWarning] = useState(false);
  const [reasonNote, setReasonNote] = useState('');

  const currenciesList = Object.values(currencyCatalogue);

  const filteredCurrencies = currenciesList.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.code.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.country.toLowerCase().includes(term) ||
      c.symbol.toLowerCase().includes(term)
    );
  });

  const handleApply = () => {
    if (mode === 'user_display') {
      setUserPreferredCurrency(selectedCurrency);
      onClose();
    } else {
      // High-impact organization base currency change
      if (!baseChangeWarning) {
        setBaseChangeWarning(true);
      } else {
        updateOrganizationBaseCurrency(selectedCurrency, reasonNote || 'Administrative base currency adjustment');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                {mode === 'organization_base'
                  ? 'Configure Organization Base Currency'
                  : 'Select Preferred Display Currency'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'organization_base'
                  ? 'Official accounting currency for all ledgers and financial reports'
                  : 'Personal working display preference with live currency conversion'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Scope Indicator Banner */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs space-y-1 shrink-0">
          <div className="flex items-center justify-between text-slate-300">
            <span>Organization Base Currency:</span>
            <span className="font-mono font-bold text-emerald-400">
              {organizationBaseCurrency} ({currencyCatalogue[organizationBaseCurrency]?.name || 'Base'})
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Your Current Display Preference:</span>
            <span className="font-mono font-medium text-slate-200">{userPreferredCurrency}</span>
          </div>
        </div>

        {/* High-Impact Base Currency Warning Prompt */}
        {mode === 'organization_base' && baseChangeWarning && (
          <div className="p-4 bg-amber-950/80 border border-amber-600/80 rounded-xl text-xs text-amber-200 space-y-2">
            <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
              <span>⚠️ Base Currency Change Protection Warning</span>
            </div>
            <p>
              Changing the organization's functional base currency is a high-impact financial action.
              Historical financial transactions will strictly retain their original transaction currency
              and amounts to protect financial integrity and audit reproducibility.
            </p>
            <div>
              <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                Enter Reason for Change (Recorded in Immutable Audit Log) *
              </label>
              <input
                type="text"
                placeholder="e.g. Relocating operating corporate entity or restructuring base ledger"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-amber-700 rounded text-slate-100 focus:outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search currency code, name, country, or symbol (e.g. ZAR, Rand, South Africa, USD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Currency List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 pr-1 space-y-1">
          {filteredCurrencies.map((c) => {
            const isSelected = selectedCurrency === c.code;
            const rateVsBase = getExchangeRate(organizationBaseCurrency, c.code, customExchangeRates);

            return (
              <div
                key={c.code}
                onClick={() => setSelectedCurrency(c.code)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/40'
                    : 'border-transparent hover:border-slate-700/80 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" role="img" aria-label={c.country}>
                    {c.flag}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-100">{c.code}</span>
                      <span className="text-xs text-slate-300 font-medium">({c.symbol})</span>
                      <span className="text-xs text-slate-400">· {c.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{c.country}</div>
                  </div>
                </div>

                <div className="text-right">
                  {c.code !== organizationBaseCurrency && (
                    <div className="font-mono text-[11px] text-slate-400">
                      1 {organizationBaseCurrency} ≈ {rateVsBase} {c.code}
                    </div>
                  )}
                  {isSelected && (
                    <div className="text-emerald-400 font-semibold text-xs flex items-center justify-end gap-1 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selected</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            {mode === 'organization_base' && baseChangeWarning ? 'Confirm & Apply Base Currency' : 'Apply Currency'}
          </button>
        </div>
      </div>
    </div>
  );
};
