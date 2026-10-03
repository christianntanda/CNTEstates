import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Currency, Language, OrganizationBranding } from '../../types';
import {
  countryCurrencyCatalogue,
  currencyCatalogue,
  getExchangeRate,
  convertCurrency,
  exchangeRateMeta,
  formatPreciseCurrency,
} from '../../services/currencyService';
import {
  Settings,
  Building,
  Globe,
  DollarSign,
  Shield,
  Bell,
  CheckCircle2,
  Save,
  RotateCcw,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  FileText,
  Printer,
  Sliders,
  TrendingUp,
  Info,
  CreditCard,
} from 'lucide-react';
import { CurrencySelectorModal } from '../currency/CurrencySelectorModal';
import { OperatingCountryConsole } from '../country/OperatingCountryConsole';
import { ExchangeRateConversionConsole } from '../pricing/ExchangeRateConversionConsole';
import { ZeroDecimalDisplayConsole } from '../pricing/ZeroDecimalDisplayConsole';
import { PaymentProviderConsole } from '../pricing/PaymentProviderConsole';

export const SettingsView: React.FC = () => {
  const {
    organization,
    setOrganization,
    language,
    setLanguage,
    organizationBaseCurrency,
    userPreferredCurrency,
    setUserPreferredCurrency,
    updateOrganizationBaseCurrency,
    updateOrganizationCountry,
    updateOrganizationBranding,
    customExchangeRates,
    updateCustomExchangeRate,
    resetToDemoData,
    openPrint,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'regional_currency' | 'branding_print' | 'exchange_rates' | 'payment_provider' | 'system'>('regional_currency');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [showBaseCurrencyModal, setShowBaseCurrencyModal] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState(organization.name);
  const [selectedCountry, setSelectedCountry] = useState(organization.operatingCountry || organization.country || 'South Africa');
  const [selectedTimezone, setSelectedTimezone] = useState(organization.timezone || 'Africa/Johannesburg');

  // Branding states
  const branding = organization.branding || {
    companyName: organization.name,
    companyAddress: '100 Sandton Drive, Sandton, Johannesburg, 2196, South Africa',
    companyPhone: '+27 11 883 9000',
    companyEmail: 'finance@centurionrealty.co.za',
    companyWebsite: 'https://centurionrealty.co.za',
    taxRegistrationNumber: 'ZA-VAT-4910284901',
    businessRegistrationNumber: '2018/489102/07',
    customInvoiceFooter: 'All payments must reference your unique Tenant ID. Remit to Standard Bank (Branch 051001, Acc # 021489012). Thank you for your tenancy.',
    confidentialityNotice: 'This document contains confidential proprietary property management and financial information protected by law.',
  };

  const [brandingForm, setBrandingForm] = useState<OrganizationBranding>(branding);

  // Manual rate override states
  const [overrideCurrency, setOverrideCurrency] = useState('USD');
  const [overrideRate, setOverrideRate] = useState<string>('');

  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    updateOrganizationCountry(countryName);
    const countryConfig = countryCurrencyCatalogue.find(
      (c) => c.country.toLowerCase() === countryName.toLowerCase()
    );
    if (countryConfig) {
      setSelectedTimezone(countryConfig.timezone);
    }
    setSaveMessage(`Operating country updated to ${countryName}. Functional Base Currency automatically configured.`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setOrganization({
      ...organization,
      name: orgName,
      country: selectedCountry,
      operatingCountry: selectedCountry,
      timezone: selectedTimezone,
    });
    setSaveMessage('Organization general preferences saved successfully.');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganizationBranding(brandingForm);
    setSaveMessage('Corporate branding and universal print parameters updated.');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleApplyRateOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(overrideRate);
    if (!isNaN(rateNum) && rateNum > 0) {
      updateCustomExchangeRate(overrideCurrency, rateNum);
      setOverrideRate('');
      setSaveMessage(`Manual exchange rate for ${overrideCurrency} set to ${rateNum}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Sample conversion calculation for display demo
  const sampleAmount = 25000;
  const sampleConversion = convertCurrency(
    sampleAmount,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates
  );

  const baseCurrencyInfo = currencyCatalogue[organizationBaseCurrency] || {
    code: organizationBaseCurrency,
    name: organizationBaseCurrency,
    symbol: organizationBaseCurrency,
    flag: '🇿🇦',
  };

  const preferredCurrencyInfo = currencyCatalogue[userPreferredCurrency] || {
    code: userPreferredCurrency,
    name: userPreferredCurrency,
    symbol: userPreferredCurrency,
    flag: '🌐',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            <span>Organization, Multi-Currency & Print Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure functional base currency from operating country, user display preferences, exchange rate feeds, and corporate print branding.
          </p>
        </div>

        {/* Currency Scope Quick Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-900 border border-emerald-600/40 rounded-lg text-xs flex items-center gap-2">
            <span className="text-slate-400">Org Base:</span>
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
              <span>{baseCurrencyInfo.flag}</span>
              <span>{organizationBaseCurrency}</span>
            </span>
          </div>

          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs flex items-center gap-2">
            <span className="text-slate-400">Display Pref:</span>
            <span className="font-mono font-bold text-amber-300 flex items-center gap-1">
              <span>{preferredCurrencyInfo.flag}</span>
              <span>{userPreferredCurrency}</span>
            </span>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        {[
          { id: 'regional_currency', label: '1. Country & Multi-Currency', icon: Globe },
          { id: 'exchange_rates', label: '2. Exchange Rate Architecture', icon: ArrowRightLeft },
          { id: 'payment_provider', label: '3. Payment Provider & Webhooks', icon: CreditCard },
          { id: 'branding_print', label: '4. Corporate Branding & Print Engine', icon: Printer },
          { id: 'system', label: '5. System & Demo Reset', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OPERATING COUNTRY & MULTI-CURRENCY */}
      {activeSubTab === 'regional_currency' && (
        <div className="space-y-6">
          {/* SEQUENCE 18 — OPERATING COUNTRY CONFIGURATION & CURRENCY SEPARATION */}
          <OperatingCountryConsole />

          {/* Functional Base Currency Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  1.1 Operating Country as Primary Currency Source
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-0.5">
                  Functional Base Currency & Regional Onboarding
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The organization's operating country automatically determines its official functional base currency, primary accounting reference, and default timezone.
                </p>
              </div>

              <button
                onClick={() => setShowBaseCurrencyModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold self-start sm:self-auto cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Change Base Currency</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Country Selection Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Operating Country * (Primary Currency Source)
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {countryCurrencyCatalogue.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.flag} {c.country} ({c.defaultCurrency} · {c.timezone})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Selecting an operating country configures default currency, regional number format, and legal operational timezone.
                </p>
              </div>

              {/* Functional Base Currency Summary Badge */}
              <div className="p-4 bg-slate-800/80 border border-emerald-600/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Organization Functional Base Currency:</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Official Ledger
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{baseCurrencyInfo.flag}</span>
                  <div>
                    <div className="text-xl font-extrabold text-white font-mono flex items-center gap-2">
                      <span>{organizationBaseCurrency}</span>
                      <span className="text-sm font-normal text-slate-400">({baseCurrencyInfo.symbol})</span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">{baseCurrencyInfo.name}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2 font-mono flex items-center justify-between">
                  <span>Operating Timezone:</span>
                  <span className="text-slate-200">{selectedTimezone}</span>
                </div>
              </div>
            </div>

            {/* User Working Display Preference vs Base Currency */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  1.3 User-Selectable Display Currency
                </span>
                <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                  Personal Working / Display Currency Preference
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Users may choose another currency for their personal working view while the organization's underlying accounting records remain strictly anchored in the functional base currency ({organizationBaseCurrency}).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Preferred Working Display Currency
                  </label>
                  <select
                    value={userPreferredCurrency}
                    onChange={(e) => setUserPreferredCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {Object.values(currencyCatalogue).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    Converts displayed financial statements, rent rolls, and dashboards without altering original ledger entries.
                  </p>
                </div>

                {/* Conversion Visual Distinction Preview */}
                <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">1.8 Currency Conversion Display Preview</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Audit Sample
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-sans">Base Amount:</span>
                      <strong className="text-slate-100 text-sm">
                        {formatPreciseCurrency(sampleConversion.originalAmount, sampleConversion.originalCurrency, language)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-amber-400 uppercase block font-sans">Display Value:</span>
                      <strong className="text-amber-300 text-sm">
                        {formatPreciseCurrency(sampleConversion.convertedAmount, sampleConversion.targetCurrency, language)}
                      </strong>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-400 font-sans">Exchange Rate: </span>
                        <span className="text-slate-200">
                          1 {sampleConversion.originalCurrency} = {sampleConversion.rate} {sampleConversion.targetCurrency}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans">Rate Date: </span>
                        <span className="text-slate-200">{sampleConversion.rateDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* General Organization Info Form */}
            <form onSubmit={handleSaveGeneral} className="pt-6 border-t border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-slate-100">
                Organization Profile & Regional Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Company / Organization Legal Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Default Interface Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="en">English (US/UK/International)</option>
                    <option value="fr">Français (France / Canada / Afrique)</option>
                    <option value="es">Español (España / LATAM)</option>
                    <option value="pt">Português (Brasil / Portugal / Angola)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save General Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: EXCHANGE RATE ARCHITECTURE */}
      {activeSubTab === 'exchange_rates' && (
        <div className="space-y-6">
          {/* SEQUENCE 19 — AUTHORITATIVE EXCHANGE-RATE CONVERSION ENGINE */}
          <ExchangeRateConversionConsole />

          {/* SEQUENCE 20 — ZERO-DECIMAL SUBSCRIPTION DISPLAY */}
          <ZeroDecimalDisplayConsole />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-slate-800">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              1.6 Exchange Rate Architecture
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-0.5">
              Live & Configured Exchange Rate Feed Reference
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic, timestamped currency conversion. Historical transactions strictly retain their original transaction currency and amount.
            </p>
          </div>

          {/* Rate Feed Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Rate Source:</span>
              <span className="font-medium text-slate-200">{exchangeRateMeta.source}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Effective Date:</span>
              <span className="font-mono font-medium text-slate-200">{exchangeRateMeta.effectiveDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Effective Time:</span>
              <span className="font-mono font-medium text-slate-200">{exchangeRateMeta.effectiveTime}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Rate Type:</span>
              <span className="text-emerald-400 font-semibold font-mono uppercase">Central Bank Mid-Market</span>
            </div>
          </div>

          {/* Manual Rate Override Form */}
          <form onSubmit={handleApplyRateOverride} className="p-4 bg-slate-800/50 border border-slate-700/70 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure Organization Manual Rate Override</span>
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={overrideCurrency}
                onChange={(e) => setOverrideCurrency(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs"
              >
                {Object.values(currencyCatalogue).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} ({c.name})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 font-mono">1 USD =</span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Rate relative to USD..."
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(e.target.value)}
                  className="w-36 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Apply Custom Rate
              </button>

              {customExchangeRates[overrideCurrency] && (
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...customExchangeRates };
                    delete next[overrideCurrency];
                    localStorage.setItem('cnt_custom_rates', JSON.stringify(next));
                    window.location.reload();
                  }}
                  className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 text-xs font-medium"
                >
                  Reset to Benchmark
                </button>
              )}
            </div>
          </form>

          {/* Full Exchange Rates Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Currency</th>
                  <th className="py-2.5 px-4">Country / Region</th>
                  <th className="py-2.5 px-4">Rate vs Base ({organizationBaseCurrency})</th>
                  <th className="py-2.5 px-4">Inverse Rate</th>
                  <th className="py-2.5 px-4">Rate Source</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {Object.values(currencyCatalogue).map((c) => {
                  const rateFromBase = getExchangeRate(organizationBaseCurrency, c.code, customExchangeRates);
                  const rateToBase = getExchangeRate(c.code, organizationBaseCurrency, customExchangeRates);
                  const isBase = c.code === organizationBaseCurrency;
                  const isManual = customExchangeRates[c.code] !== undefined;

                  return (
                    <tr key={c.code} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="font-bold text-white">{c.code}</span>
                          <span className="text-slate-400 font-normal font-sans">· {c.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-300">{c.country}</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-400">
                        1 {organizationBaseCurrency} = {rateFromBase} {c.code}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        1 {c.code} = {rateToBase} {organizationBaseCurrency}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px]">
                        {isManual ? 'Manual Org Override' : 'Central Bank Mid-Market'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isBase ? (
                          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded font-sans uppercase font-bold">
                            Base Accounting
                          </span>
                        ) : isManual ? (
                          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-sans uppercase font-semibold">
                            Manual
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans">Active Live</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* TAB 3: PAYMENT PROVIDER & WEBHOOKS */}
      {activeSubTab === 'payment_provider' && (
        <div className="space-y-6">
          <PaymentProviderConsole />
        </div>
      )}

      {/* TAB 4: CORPORATE BRANDING & UNIVERSAL PRINT ENGINE */}
      {activeSubTab === 'branding_print' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                2. Universal Printing & Document Generation
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">
                Organization Corporate Branding for Print & PDF
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize corporate details, tax numbers, bank remittance notes, and confidentiality disclaimers that appear on all printed invoices, receipts, and reports.
              </p>
            </div>

            <button
              onClick={() => {
                openPrint({
                  type: 'general_report',
                  title: 'Corporate Branding Verification Dossier',
                  documentNumber: 'PRINT-VERIFY-001',
                  date: new Date().toISOString().split('T')[0],
                  sections: [
                    {
                      title: 'Corporate Identity Specification',
                      items: [
                        { label: 'Company Legal Name', value: brandingForm.companyName },
                        { label: 'Tax ID / VAT #', value: brandingForm.taxRegistrationNumber },
                        { label: 'Business Reg #', value: brandingForm.businessRegistrationNumber },
                        { label: 'Base Currency', value: organizationBaseCurrency, highlight: true },
                      ],
                    },
                    {
                      title: 'Registered Operational Headquarters',
                      description: brandingForm.companyAddress,
                      items: [
                        { label: 'Corporate Tel', value: brandingForm.companyPhone },
                        { label: 'Billing Email', value: brandingForm.companyEmail },
                        { label: 'Website', value: brandingForm.companyWebsite },
                      ],
                    },
                    {
                      title: 'Remittance & Confidentiality Directives',
                      notes: brandingForm.customInvoiceFooter,
                    },
                  ],
                });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-4 h-4" />
              <span>Preview Print Layout</span>
            </button>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Legal Entity Name *</label>
                <input
                  type="text"
                  value={brandingForm.companyName}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Corporate Physical Registered Address *</label>
                <input
                  type="text"
                  value={brandingForm.companyAddress}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tax / VAT Registration Number</label>
                <input
                  type="text"
                  value={brandingForm.taxRegistrationNumber}
                  onChange={(e) => setBrandingForm({ ...brandingForm, taxRegistrationNumber: e.target.value })}
                  placeholder="e.g. ZA-VAT-4910284901"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business / Company Registration Number</label>
                <input
                  type="text"
                  value={brandingForm.businessRegistrationNumber}
                  onChange={(e) => setBrandingForm({ ...brandingForm, businessRegistrationNumber: e.target.value })}
                  placeholder="e.g. 2018/489102/07"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Billing & Finance Phone</label>
                <input
                  type="text"
                  value={brandingForm.companyPhone}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Finance & Operations Email</label>
                <input
                  type="email"
                  value={brandingForm.companyEmail}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Company Website URL</label>
                <input
                  type="text"
                  value={brandingForm.companyWebsite}
                  onChange={(e) => setBrandingForm({ ...brandingForm, companyWebsite: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Custom Invoice Remittance Footer</label>
                <textarea
                  rows={2}
                  value={brandingForm.customInvoiceFooter}
                  onChange={(e) => setBrandingForm({ ...brandingForm, customInvoiceFooter: e.target.value })}
                  placeholder="Banking details, wire transfer instructions, payment terms..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Confidentiality & Legal Notice</label>
                <textarea
                  rows={2}
                  value={brandingForm.confidentialityNotice}
                  onChange={(e) => setBrandingForm({ ...brandingForm, confidentialityNotice: e.target.value })}
                  placeholder="Confidentiality statement printed at the bottom of official reports..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Branding & Print Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SYSTEM & RESET */}
      {activeSubTab === 'system' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-100 text-sm">Demo Data & Factory Reset</h3>
          <p className="text-xs text-slate-400">
            Reset all operational data back to the clean factory preset with default South African properties, active leases, service tickets, and contractors.
          </p>

          {resetConfirm ? (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  resetToDemoData();
                  setResetConfirm(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Factory Reset
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-rose-400 border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Demo Dataset</span>
            </button>
          )}
        </div>
      )}

      {/* Base Currency Protection Modal */}
      {showBaseCurrencyModal && (
        <CurrencySelectorModal
          mode="organization_base"
          onClose={() => setShowBaseCurrencyModal(false)}
        />
      )}
    </div>
  );
};
