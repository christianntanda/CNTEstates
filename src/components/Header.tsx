import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Language, Currency, UserRole } from '../types';
import { currencyCatalogue, getExchangeRate } from '../services/currencyService';
import { CurrencySelectorModal } from './currency/CurrencySelectorModal';
import {
  Building2,
  Search,
  Bell,
  Globe,
  DollarSign,
  Shield,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronDown,
  ArrowRightLeft,
  Settings2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    t,
    language,
    setLanguage,
    currency,
    setCurrency,
    userRole,
    setUserRole,
    currentUser,
    organization,
    organizationBaseCurrency,
    userPreferredCurrency,
    setUserPreferredCurrency,
    customExchangeRates,
    searchTerm,
    setSearchTerm,
    notifications,
    markNotificationRead,
    setActiveTab,
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [currencyModalConfig, setCurrencyModalConfig] = useState<{
    isOpen: boolean;
    mode: 'user_display' | 'organization_base';
  }>({ isOpen: false, mode: 'user_display' });
  const [currencyQuickSearch, setCurrencyQuickSearch] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const currentDisplayInfo = currencyCatalogue[userPreferredCurrency] || {
    code: userPreferredCurrency,
    name: userPreferredCurrency,
    symbol: userPreferredCurrency,
    flag: '🌐',
  };

  const baseInfo = currencyCatalogue[organizationBaseCurrency] || {
    code: organizationBaseCurrency,
    name: organizationBaseCurrency,
    symbol: organizationBaseCurrency,
    flag: '🇿🇦',
  };

  const isConverted = userPreferredCurrency !== organizationBaseCurrency;
  const currentRate = getExchangeRate(organizationBaseCurrency, userPreferredCurrency, customExchangeRates);

  const roleLabels: Record<UserRole, string> = {
    platform_admin: 'Platform Admin',
    org_owner: 'Org Owner',
    portfolio_manager: 'Portfolio Manager',
    property_manager: 'Property Manager',
    building_manager: 'Building Manager',
    finance_manager: 'Finance Manager',
    maintenance_manager: 'Maintenance Manager',
    technician: 'Field Technician',
    contractor: 'Contractor Partner',
    security_officer: 'Security Officer',
    facility_manager: 'Facility Manager',
    tenant: 'Resident Tenant',
    auditor: 'Compliance Auditor',
  };

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    setShowRoleMenu(false);

    // Auto navigate to the relevant dedicated portal view for that persona
    if (role === 'tenant') {
      setActiveTab('tenantPortal');
    } else if (role === 'contractor') {
      setActiveTab('contractorPortal');
    } else if (role === 'technician') {
      setActiveTab('technicianView');
    } else if (role === 'platform_admin') {
      setActiveTab('platformAdmin');
    } else {
      setActiveTab('dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 lg:px-6 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Brand & Org */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center font-bold tracking-tight text-white text-base">
                CNT<span className="text-emerald-400">Estates</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-none truncate max-w-[200px]">
                {organization.name}
              </div>
            </div>
          </div>

          {/* Property Filter Dropdown */}
          <div className="hidden md:flex items-center ml-2 pl-3 border-l border-slate-800">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="bg-slate-800/80 border border-slate-700/80 rounded-md text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 max-w-[180px] truncate"
            >
              <option value="all">All Properties ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.common.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Persona / Role Quick Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-md text-xs font-medium text-slate-200 transition-colors"
              title="Switch user persona to test specific portal workflows"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{roleLabels[userRole]}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  Select User Persona
                </div>
                {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-700 ${
                      userRole === r ? 'text-emerald-400 font-semibold bg-slate-700/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{roleLabels[r]}</span>
                    {userRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multilingual Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-slate-200 transition-colors"
              title="Select interface language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-semibold uppercase">{language}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  Language / Langue
                </div>
                {[
                  { code: 'en', label: 'English (EN)' },
                  { code: 'fr', label: 'Français (FR)' },
                  { code: 'es', label: 'Español (ES)' },
                  { code: 'pt', label: 'Português (PT)' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code as Language);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center justify-between ${
                      language === l.code ? 'text-emerald-400 font-medium bg-slate-700/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{l.label}</span>
                    {language === l.code && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Professional Currency Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                isConverted
                  ? 'bg-amber-950/40 border-amber-600/70 text-amber-200 hover:bg-amber-900/50'
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
              }`}
              title={
                isConverted
                  ? `Converted Display: ${userPreferredCurrency} (Base: ${organizationBaseCurrency} @ 1 ${organizationBaseCurrency} = ${currentRate} ${userPreferredCurrency})`
                  : `Organization Base Currency: ${organizationBaseCurrency}`
              }
            >
              <span className="text-sm" role="img" aria-label={currentDisplayInfo.country}>
                {currentDisplayInfo.flag}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold">{currentDisplayInfo.code}</span>
                <span className="text-slate-400 font-normal hidden md:inline">({currentDisplayInfo.symbol})</span>
                {isConverted && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1 rounded ml-0.5">
                    conv
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCurrencyMenu && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                {/* Header Information */}
                <div className="px-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Currency Selection
                    </span>
                    <button
                      onClick={() => setShowCurrencyMenu(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scope Distinction Card */}
                  <div className="mt-2 p-2 bg-slate-800/80 rounded-lg space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Org Base Accounting:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {baseInfo.flag} {organizationBaseCurrency} ({baseInfo.name})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Your Working Display:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {currentDisplayInfo.flag} {userPreferredCurrency} ({currentDisplayInfo.name})
                      </span>
                    </div>
                    {isConverted && (
                      <div className="pt-1 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span>Exchange Rate:</span>
                        <span className="text-amber-300">1 {organizationBaseCurrency} = {currentRate} {userPreferredCurrency}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Currency Search Filter */}
                <div className="p-2 border-b border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search code, name, country (e.g. ZAR, USD, Rand)..."
                      value={currencyQuickSearch}
                      onChange={(e) => setCurrencyQuickSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Currency List */}
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-800/50 py-1">
                  {Object.values(currencyCatalogue)
                    .filter((c) => {
                      const q = currencyQuickSearch.toLowerCase();
                      return (
                        c.code.toLowerCase().includes(q) ||
                        c.name.toLowerCase().includes(q) ||
                        c.country.toLowerCase().includes(q) ||
                        c.symbol.toLowerCase().includes(q)
                      );
                    })
                    .map((c) => {
                      const isSelected = userPreferredCurrency === c.code;
                      const isBase = organizationBaseCurrency === c.code;
                      const rate = getExchangeRate(organizationBaseCurrency, c.code, customExchangeRates);

                      return (
                        <button
                          key={c.code}
                          onClick={() => {
                            setUserPreferredCurrency(c.code);
                            setShowCurrencyMenu(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            isSelected ? 'bg-emerald-950/40 text-emerald-300 font-medium' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.flag}</span>
                            <div className="truncate">
                              <span className="font-mono font-bold mr-1.5 text-white">{c.code}</span>
                              <span className="text-slate-400 truncate">({c.symbol}) {c.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isBase && (
                              <span className="text-[9px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-1 py-0.5 rounded font-semibold uppercase">
                                Base
                              </span>
                            )}
                            {c.code !== organizationBaseCurrency && (
                              <span className="font-mono text-[10px] text-slate-400">
                                ≈ {rate}
                              </span>
                            )}
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="pt-2 px-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setShowCurrencyMenu(false);
                      setCurrencyModalConfig({ isOpen: true, mode: 'user_display' });
                    }}
                    className="w-full text-center py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Browse Full Currency Catalogue...</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowCurrencyMenu(false);
                      setCurrencyModalConfig({ isOpen: true, mode: 'organization_base' });
                    }}
                    className="w-full text-center py-1.5 text-slate-400 hover:text-slate-200 text-[10px] flex items-center justify-center gap-1"
                  >
                    <Settings2 className="w-3 h-3 text-slate-400" />
                    <span>Configure Organization Base Currency ({organizationBaseCurrency})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] text-red-400 bg-red-950/60 border border-red-900 px-1.5 py-0.5 rounded">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.linkTab) setActiveTab(n.linkTab);
                        setShowNotifications(false);
                      }}
                      className={`p-3 text-xs hover:bg-slate-800/60 cursor-pointer transition-colors ${
                        !n.read ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'emergency' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {n.type === 'info' && <Bell className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-100 truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{n.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div
            className="flex items-center gap-2 pl-2 border-l border-slate-800 cursor-pointer"
            onClick={() => setActiveTab('settings')}
            title="User Settings"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/50"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <span className="hidden xl:inline text-xs font-medium text-slate-200 truncate max-w-[100px]">
              {currentUser.name}
            </span>
          </div>
        </div>
      </div>

      {/* Currency Catalogue & Base Currency Modal */}
      {currencyModalConfig.isOpen && (
        <CurrencySelectorModal
          mode={currencyModalConfig.mode}
          onClose={() => setCurrencyModalConfig({ ...currencyModalConfig, isOpen: false })}
        />
      )}
    </header>
  );
};
