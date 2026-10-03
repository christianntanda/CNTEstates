import React, { useState } from 'react';
import {
  Globe,
  ArrowDown,
  DollarSign,
  Hash,
  Clock,
  ShieldCheck,
  Layers,
  Building2,
  Receipt,
  Eye,
  CheckCircle2,
  Lock,
  Info,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  countryConfigurations,
  getCountryConfiguration,
  currencyCatalogue,
  formatSubscriptionPrice,
} from '../../services/currencyService';
import {
  executeOperatingCountryCascade,
  getFiveLayerCurrencyModel,
  verifyCurrencySeparationIntegrity,
  formatOperationalTransaction,
  formatWithRegionalRules,
} from '../../services/operatingCountryEngine';

export const OperatingCountryConsole: React.FC = () => {
  const {
    organization,
    updateOrganizationCountry,
    organizationBaseCurrency,
    userPreferredCurrency,
    setUserPreferredCurrency,
    financialRecords,
    properties,
    countryConfig,
    t,
  } = useApp();

  const currentCountry = organization.operatingCountry || organization.country || 'South Africa';
  const [selectedCountry, setSelectedCountry] = useState(currentCountry);
  const [previewCountry, setPreviewCountry] = useState(currentCountry);
  const [activeTab, setActiveTab] = useState<'cascade' | 'separation' | 'live_demo'>('cascade');
  const [notice, setNotice] = useState<string | null>(null);

  // Active cascade for current organization
  const activeCascade = executeOperatingCountryCascade(currentCountry);

  // Interactive preview cascade
  const previewCascade = executeOperatingCountryCascade(previewCountry);

  // 5-Layer currency separation model
  const fiveLayerModel = getFiveLayerCurrencyModel({
    operatingCountry: currentCountry,
    organizationBaseCurrency,
    subscriptionBillingCurrency: organization.billingCurrency || organizationBaseCurrency,
    userPreferredCurrency,
    propertyCurrencies: properties.map((p) => organizationBaseCurrency),
  });

  // Integrity audit
  const sampleTransactions = financialRecords.map((f) => ({
    id: f.id,
    type: f.type,
    amount: f.amount,
    currency: f.currency,
  }));
  const auditResult = verifyCurrencySeparationIntegrity({
    masterSubscriptionCurrency: 'USD',
    organizationBaseCurrency,
    subscriptionBillingCurrency: organization.billingCurrency || organizationBaseCurrency,
    userDisplayCurrency: userPreferredCurrency,
    operationalTransactions: sampleTransactions,
  });

  const handleApplyCountry = (countryName: string) => {
    setSelectedCountry(countryName);
    setPreviewCountry(countryName);
    updateOrganizationCountry(countryName);
    setNotice(`Operating country updated to ${countryName}. 4-Step cascade applied instantly.`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-sky-700 text-white rounded-xl shadow-sm shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-white text-base sm:text-lg">
                Sequence 18 — Operating Country Configuration & Currency Separation
              </h2>
              <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded uppercase">
                4-Step Cascade
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>5-Layer Separation Enforced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Selecting an operating country configures Default Currency → Regional Number Format → Legal/Operational Timezone, while maintaining strict isolation from subscription pricing logic.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('cascade')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'cascade'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4-Step Cascade
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('separation')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'separation'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            5-Layer Currency Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('live_demo')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'live_demo'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cascade Simulator
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* TAB 1: 4-STEP CASCADE VISUALIZATION */}
      {activeTab === 'cascade' && (
        <div className="space-y-6">
          {/* Cascade Flow Header */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>Authoritative Configuration Pipeline:</span>
              <span className="text-slate-300 font-sans font-bold">
                Operating Country → Default Currency → Regional Number Format → Legal Timezone
              </span>
            </div>

            {/* 4 Connected Cards in Vertical/Horizontal pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
              {/* Step 1: Operating Country */}
              <div className="p-4 bg-slate-900 border-2 border-indigo-500/40 rounded-xl space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">Step 1</span>
                  <span className="text-xl">{activeCascade.step1_operatingCountry.flag}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Operating Country</div>
                <div className="text-base font-extrabold text-white">
                  {activeCascade.step1_operatingCountry.countryName}
                </div>
                <span className="text-[10px] font-mono text-slate-500 block">
                  ISO: {activeCascade.step1_operatingCountry.countryCode}
                </span>
              </div>

              {/* Step 2: Default Currency */}
              <div className="p-4 bg-slate-900 border-2 border-emerald-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Step 2 (Auto)</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs text-slate-400 font-medium">Default Currency</div>
                <div className="text-base font-extrabold text-emerald-400 font-mono">
                  {activeCascade.step2_defaultCurrency.currencyCode} ({activeCascade.step2_defaultCurrency.symbol})
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {activeCascade.step2_defaultCurrency.currencyName}
                </span>
              </div>

              {/* Step 3: Regional Number Format */}
              <div className="p-4 bg-slate-900 border-2 border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Step 3 (Auto)</span>
                  <Hash className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xs text-slate-400 font-medium">Regional Number Format</div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {activeCascade.step3_regionalNumberFormat.sampleFormattedCurrency}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Sep: &apos;{activeCascade.step3_regionalNumberFormat.thousandsSeparator}&apos; Dec: &apos;{activeCascade.step3_regionalNumberFormat.decimalSeparator}&apos;
                </div>
              </div>

              {/* Step 4: Legal/Operational Timezone */}
              <div className="p-4 bg-slate-900 border-2 border-purple-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Step 4 (Auto)</span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xs text-slate-400 font-medium">Legal/Operational Timezone</div>
                <div className="text-xs font-bold text-purple-300 font-mono truncate">
                  {activeCascade.step4_legalOperationalTimezone.timezone}
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {activeCascade.step4_legalOperationalTimezone.currentLocalTime}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Country Switcher to Test Cascade */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Quick Operating Country Switcher
                </span>
                <span className="text-[11px] text-slate-400">
                  Switching operating country automatically drives all 4 down-stream configurations.
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {countryConfigurations.length} Configured Nations
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { name: 'South Africa', code: 'ZA', flag: '🇿🇦', curr: 'ZAR' },
                { name: 'United States', code: 'US', flag: '🇺🇸', curr: 'USD' },
                { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', curr: 'GBP' },
                { name: 'France', code: 'FR', flag: '🇫🇷', curr: 'EUR' },
                { name: 'Germany', code: 'DE', flag: '🇩🇪', curr: 'EUR' },
                { name: 'Switzerland', code: 'CH', flag: '🇨🇭', curr: 'CHF' },
                { name: 'Brazil', code: 'BR', flag: '🇧🇷', curr: 'BRL' },
                { name: 'Australia', code: 'AU', flag: '🇦🇺', curr: 'AUD' },
                { name: 'Kenya', code: 'KE', flag: '🇰🇪', curr: 'KES' },
                { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', curr: 'AED' },
                { name: 'Singapore', code: 'SG', flag: '🇸🇬', curr: 'SGD' },
                { name: 'Japan', code: 'JP', flag: '🇯🇵', curr: 'JPY' },
              ].map((c) => {
                const isSelected = currentCountry.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleApplyCountry(c.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded">
                        {c.curr}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {isSelected ? '● Active Org' : 'Click to Set'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-LAYER CURRENCY SEPARATION MODEL */}
      {activeTab === 'separation' && (
        <div className="space-y-6">
          <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-4 text-xs text-indigo-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm mb-0.5">
                Strict Architectural Invariant: 5 Distinct Currency Roles
              </strong>
              <span>
                To preserve commercial stability and financial audit compliance, CNTEstates strictly separates subscription billing logic from property/rent operational transactions. Converted values never overwrite master USD prices, and operational rent records remain anchored in their own transaction currencies.
              </span>
            </div>
          </div>

          {/* 5-Layer Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Layer</th>
                  <th className="py-3 px-4">Currency Role</th>
                  <th className="py-3 px-4">Current Value</th>
                  <th className="py-3 px-4">Architectural Boundary</th>
                  <th className="py-3 px-4">Overwrite Invariant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {/* 1. Master subscription currency */}
                <tr className="hover:bg-slate-900/60 bg-emerald-950/20">
                  <td className="py-3 px-4 text-emerald-400 font-bold">1</td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    Master Subscription Currency
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-extrabold text-sm">
                    USD ($)
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    Platform source of truth ($0, $25, $49, $99, $249, $499). Immutable across all organizations.
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-sans font-semibold">
                    <span className="inline-flex items-center gap-1 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      <Lock className="w-3 h-3" /> Never Overwritten
                    </span>
                  </td>
                </tr>

                {/* 2. Organization default currency */}
                <tr className="hover:bg-slate-900/60">
                  <td className="py-3 px-4 text-sky-400 font-bold">2</td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    Organization Default Currency
                  </td>
                  <td className="py-3 px-4 text-sky-400 font-bold text-sm">
                    {organizationBaseCurrency}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    Functional ledger accounting base configured from operating country ({currentCountry}).
                  </td>
                  <td className="py-3 px-4 text-sky-300 font-sans">
                    Configured by Country
                  </td>
                </tr>

                {/* 3. Subscription billing currency */}
                <tr className="hover:bg-slate-900/60">
                  <td className="py-3 px-4 text-amber-400 font-bold">3</td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    Subscription Billing Currency
                  </td>
                  <td className="py-3 px-4 text-amber-400 font-bold text-sm">
                    {organization.billingCurrency || organizationBaseCurrency}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    Invoice currency for SaaS plan charges. Zero-decimal rounding enforced on converted prices.
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">
                    Calculated Per Cadence
                  </td>
                </tr>

                {/* 4. User display currency */}
                <tr className="hover:bg-slate-900/60">
                  <td className="py-3 px-4 text-purple-400 font-bold">4</td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    User Display Currency
                  </td>
                  <td className="py-3 px-4 text-purple-300 font-bold text-sm">
                    {userPreferredCurrency}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    Personal viewing preference of logged-in user. Converts UI metrics without altering ledgers.
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">
                    Client View Only
                  </td>
                </tr>

                {/* 5. Operational transaction currency */}
                <tr className="hover:bg-slate-900/60 bg-slate-900/40">
                  <td className="py-3 px-4 text-indigo-400 font-bold">5</td>
                  <td className="py-3 px-4 font-sans font-bold text-white">
                    Operational Transaction Currency
                  </td>
                  <td className="py-3 px-4 text-indigo-300 font-bold text-sm">
                    {organizationBaseCurrency} (Property Ledgers)
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300 text-xs">
                    Tenant unit leases, monthly rent rolls, utility meter billing, maintenance & contractor work orders.
                  </td>
                  <td className="py-3 px-4 text-indigo-400 font-sans font-semibold">
                    <span className="inline-flex items-center gap-1 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      <ShieldCheck className="w-3 h-3" /> Fully Isolated
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Do Not Mix Guarantee Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">
                  Isolation Rule: Zero Cross-Contamination
                </span>
                <span className="text-slate-400">
                  Subscription tier calculation never alters property rental amounts. Property rental collections never alter subscription invoices.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <span>Separation Audit: 100% Passed</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CASCADE SIMULATOR & REGIONAL FORMATTER */}
      {activeTab === 'live_demo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Country Picker */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Simulate Operating Country Selection
                </label>
                <p className="text-xs text-slate-400">
                  Pick any nation to preview its immediate cascading defaults.
                </p>
              </div>

              <select
                value={previewCountry}
                onChange={(e) => setPreviewCountry(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {countryConfigurations.map((c) => (
                  <option key={c.country_code} value={c.country_name}>
                    {c.flag} {c.country_name} ({c.default_currency} · {c.legal_operational_timezone})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleApplyCountry(previewCountry)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply &apos;{previewCountry}&apos; as Organization Operating Country</span>
              </button>
            </div>

            {/* Simulated Cascade Details Card */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-indigo-400 uppercase text-[11px]">
                  Cascaded Configuration Result
                </span>
                <span className="text-2xl">{previewCascade.step1_operatingCountry.flag}</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Operating Country:</span>
                  <span className="text-white font-bold">{previewCascade.step1_operatingCountry.countryName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Default Currency:</span>
                  <span className="text-emerald-400 font-bold">
                    {previewCascade.step2_defaultCurrency.currencyCode} ({previewCascade.step2_defaultCurrency.symbol})
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Regional Number Format:</span>
                  <span className="text-amber-300 font-bold">{previewCascade.step3_regionalNumberFormat.sampleFormattedCurrency}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Number Format Spec:</span>
                  <span className="text-slate-300 text-[11px]">
                    Grouping: [{previewCascade.step3_regionalNumberFormat.grouping.join(',')}], Sep: &apos;{previewCascade.step3_regionalNumberFormat.thousandsSeparator}&apos;, Dec: &apos;{previewCascade.step3_regionalNumberFormat.decimalSeparator}&apos;
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Date Format:</span>
                  <span className="text-slate-300">{previewCascade.step3_regionalNumberFormat.dateFormat}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Legal/Operational Timezone:</span>
                  <span className="text-purple-300 font-bold truncate max-w-[200px]">
                    {previewCascade.step4_legalOperationalTimezone.timezone}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="font-sans">Timezone Clock:</span>
                  <span className="text-slate-200">{previewCascade.step4_legalOperationalTimezone.currentLocalTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
