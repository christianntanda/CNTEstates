import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getCentralizedPlanPresentations,
  CentralizedPlanPresentation,
} from '../../services/planCatalogService';
import {
  countryConfigurations,
  getCountryConfiguration,
} from '../../services/currencyService';
import { BillingPeriod } from '../../types';
import { UpgradeFlowModal } from '../upgrades/UpgradeFlowModal';
import { PlanComparisonMatrix } from './PlanComparisonMatrix';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  Globe2,
  Layers,
  Bot,
  FileText,
  ChevronDown,
  Check,
  Minus,
  Info,
  Calendar,
  PhoneCall,
  Crown,
  Home,
  Sliders,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';

interface PublicPricingPageProps {
  embedded?: boolean;
}

export const PublicPricingPage: React.FC<PublicPricingPageProps> = ({ embedded = false }) => {
  const {
    organization,
    activeSubscription,
    setActiveTab,
  } = useApp();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedCountryName, setSelectedCountryName] = useState<string>('South Africa');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [enterpriseInquiryOpen, setEnterpriseInquiryOpen] = useState<boolean>(false);
  const [inquirySubmitted, setInquirySubmitted] = useState<boolean>(false);

  const countryConfig = getCountryConfiguration(selectedCountryName);
  const targetCurrency = countryConfig.default_currency;

  const currentOrgPlanId = organization?.planId || activeSubscription?.plan_id || 'business';
  const isLoggedIn = !!organization?.id;

  // Retrieve all 6 plans dynamically from the centralized plan catalog
  const planPresentations = getCentralizedPlanPresentations(
    billingPeriod,
    targetCurrency,
    currentOrgPlanId,
    isLoggedIn
  );

  const handleCtaClick = (presentation: CentralizedPlanPresentation) => {
    if (presentation.ctaAction === 'contact_enterprise') {
      setEnterpriseInquiryOpen(true);
      return;
    }

    if (isLoggedIn) {
      setSelectedPlanForUpgrade(presentation.id);
      setIsUpgradeModalOpen(true);
    } else {
      // Direct guest to platform onboarding / dashboard
      setActiveTab('dashboard');
    }
  };

  const faqs = [
    {
      q: 'How does rental-unit and property capacity work across plans?',
      a: 'Each CNTEstates plan establishes strict capacity limits for rental units, individual properties, and physical buildings. For example, CNTEstates Starter includes 5 units and 1 property, Basic includes 50 units and 2 properties, and Professional provides 60 units per property up to 5 properties (300 units max). Upgrades are instant and dynamically prorated.',
    },
    {
      q: 'What is the authoritative reference currency for CNTEstates plans?',
      a: 'All plans are centrally priced in USD as the master reference currency. Converted local prices (ZAR, EUR, GBP, KES, etc.) are computed in real time using verified exchange rates and strictly respect the CNTEstates zero-decimal subscription rule.',
    },
    {
      q: 'Can I switch between monthly and annual billing anytime?',
      a: 'Yes. Switching to annual billing provides a 20% discount (equivalent to ~2.4 months free). Upgrades take effect immediately with down-to-the-second credit calculations.',
    },
    {
      q: 'What happens if our portfolio exceeds the maximum rental unit quota?',
      a: 'CNTEstates warns administrators at 80% and 95% capacity. Once capacity is reached, creating new units or properties is temporarily paused until you upgrade to a higher tier or archive inactive units. Current operations and tenant portals remain completely uninterrupted.',
    },
    {
      q: 'Does CNTEstates Enterprise support bespoke integrations and ERPs?',
      a: 'Yes. Enterprise includes custom REST API access, ERP accounting integrations (SAP, Oracle, Xero, QuickBooks), bespoke compliance dossiers, dedicated SLAs, and a dedicated Customer Success Manager.',
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header if rendered standalone */}
      {!embedded && (
        <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Back to Platform"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="font-bold text-lg text-white">
                  CNT<span className="text-emerald-400">Estates</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6 text-xs text-slate-300">
              <button
                onClick={() => setActiveTab('marketingPage')}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Overview
              </button>
              <a href="#plans" className="text-emerald-400 font-semibold">
                All 6 Plans
              </a>
              <a href="#comparison" className="hover:text-emerald-400 transition-colors">
                Feature Matrix
              </a>
              <a href="#faq" className="hover:text-emerald-400 transition-colors">
                FAQ
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {isLoggedIn ? 'Go to Workspace' : 'Sign In'}
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Manage Billing
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Pricing Hero Header */}
      <section id="plans" className="pt-12 pb-10 px-6 max-w-7xl mx-auto w-full text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SEQUENCE 23 — AUTHORITATIVE PUBLIC PRICING PAGE</span>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Transparent, Predictable Plans For Every Real Estate Portfolio
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            All six CNTEstates subscription plans are dynamically rendered from our centralized plan catalog with zero hardcoded pricing. Scale seamlessly from a 2-unit duplex to a 5,000-unit institutional portfolio.
          </p>
        </div>

        {/* Central Controls: Billing Cadence & Country/Currency Selector */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-4">
          {/* Billing Period Toggle */}
          <div className="inline-flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner text-xs">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                billingPeriod === 'annual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Save ~20%
              </span>
            </button>
          </div>

          {/* Operating Country & Multi-Currency Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 text-xs">
              <Globe2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Operating Country:</span>
            </span>
            <select
              value={selectedCountryName}
              onChange={(e) => setSelectedCountryName(e.target.value)}
              className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer text-xs pr-1"
            >
              {countryConfigurations.map((c) => (
                <option
                  key={c.country_code}
                  value={c.country_name}
                  className="bg-slate-900 text-slate-200"
                >
                  {c.flag} {c.country_name} ({c.default_currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Informative Precision Badge */}
        <div className="inline-flex items-center gap-2 text-[11px] text-slate-400 font-mono bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded-full">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            USD Master Reference · Converted amounts strictly enforce <strong>zero decimals</strong>
          </span>
        </div>
      </section>

      {/* Grid of All Six CNTEstates Plans */}
      <section className="py-6 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planPresentations.map((item) => {
            const { plan, pricing, capacity } = item;
            const isHighlighted = item.isPopular;
            const isEnterprise = item.isEnterprise;

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                  isHighlighted
                    ? 'bg-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/30'
                    : isEnterprise
                    ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/60'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Plan Badge (Popular / Enterprise / Value) */}
                {item.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md ${
                        isHighlighted
                          ? 'bg-emerald-500 text-slate-950'
                          : isEnterprise
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-5">
                  {/* Plan Name & Description */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-white text-lg tracking-tight">
                        {item.planName}
                      </h3>
                      {item.id === currentOrgPlanId && isLoggedIn && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                      {item.description}
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      {pricing.isFree ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-emerald-400">
                            $0
                          </span>
                          <span className="text-xs text-slate-400 font-sans">USD</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white">
                            {pricing.formattedMasterPrice}
                          </span>
                          <span className="text-xs text-slate-400 font-sans">
                            USD / {billingPeriod === 'annual' ? 'mo (billed annually)' : 'mo'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Local Converted Pricing (South Africa ZAR, EUR, GBP, etc.) */}
                    {pricing.currency !== 'USD' && !pricing.isFree && pricing.isConverted && (
                      <div className="text-xs text-emerald-400 font-mono font-medium flex items-center justify-between border-t border-slate-800/70 pt-2">
                        <span className="text-slate-400 text-[11px]">Converted Local:</span>
                        <span className="font-bold">
                          {pricing.formattedConvertedPrice} / mo
                        </span>
                      </div>
                    )}

                    {pricing.isFree ? (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Zero cost forever for independent landlords</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                        <span>Billing period:</span>
                        <span className="text-slate-300 font-semibold capitalize">
                          {billingPeriod}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quota Capacities: Rental Units & Properties */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Authoritative Capacity Quotas
                    </div>

                    {/* 1. Rental-Unit Capacity */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium">Rental-Unit Capacity</span>
                      </div>
                      <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {capacity.unitCapacityText}
                      </span>
                    </div>

                    {/* 2. Property Capacity */}
                    <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium">Property Capacity</span>
                      </div>
                      <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {capacity.propertyCapacityText}
                      </span>
                    </div>
                  </div>

                  {/* Included Features List */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Platform Features
                    </div>
                    <div className="space-y-2 text-xs text-slate-300">
                      {item.includedFeatures.slice(0, 7).map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feature}</span>
                        </div>
                      ))}
                      {item.includedFeatures.length > 7 && (
                        <div className="text-[11px] text-slate-400 pl-5.5 font-medium">
                          + {item.includedFeatures.length - 7} additional enterprise capabilities
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="p-6 pt-2 border-t border-slate-800/80 bg-slate-950/30">
                  <button
                    type="button"
                    onClick={() => handleCtaClick(item)}
                    disabled={item.disabled}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      item.disabled
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : isHighlighted
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                        : isEnterprise
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950'
                        : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    <span>{item.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEQUENCE 24 — STRUCTURED PLAN COMPARISON MATRIX */}
      <section id="comparison" className="py-16 px-6 max-w-7xl mx-auto w-full">
        <PlanComparisonMatrix />
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-16 px-6 max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">
            Clear answers on plan capacities, currency conversion, and billing operations.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer"
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
            >
              <div className="p-4 flex items-center justify-between text-xs font-bold text-slate-200">
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    activeFaq === idx ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </div>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise Contact Modal */}
      {enterpriseInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Crown className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">
                  CNTEstates Enterprise Institutional Inquiry
                </h3>
              </div>
              <button
                onClick={() => {
                  setEnterpriseInquiryOpen(false);
                  setInquirySubmitted(false);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Inquiry Dispatched</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Our Key Accounts Director will contact your team within 2 business hours to review custom rental unit volumes, multi-region database isolation, and accounting ERP integrations.
                </p>
                <button
                  onClick={() => {
                    setEnterpriseInquiryOpen(false);
                    setInquirySubmitted(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Return to Pricing
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setInquirySubmitted(true);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Organization / Real Estate Fund Name</label>
                  <input
                    type="text"
                    required
                    defaultValue={organization?.name || 'Metropolitan Capital Properties'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Estimated Rental Units</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                      <option>1,000 – 2,500 units</option>
                      <option>2,500 – 5,000 units</option>
                      <option>5,000 – 10,000 units</option>
                      <option>10,000+ units (Custom cluster)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Primary Operating Region</label>
                    <input
                      type="text"
                      defaultValue={selectedCountryName}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Executive Contact Email</label>
                  <input
                    type="email"
                    required
                    placeholder="director@fund.com"
                    defaultValue="executive@cntestates.co.za"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Specific ERP / Compliance Requirements</label>
                  <textarea
                    rows={3}
                    placeholder="E.g. SAP S/4HANA sync, SOC2 audit dossier, dedicated regional tenant data partition."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnterpriseInquiryOpen(false)}
                    className="px-3.5 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-md cursor-pointer"
                  >
                    Dispatch Enterprise Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Flow Modal Integration (reuses authoritative upgrade engine) */}
      {isUpgradeModalOpen && selectedPlanForUpgrade && (
        <UpgradeFlowModal
          isOpen={isUpgradeModalOpen}
          initialTargetPlanId={selectedPlanForUpgrade}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setSelectedPlanForUpgrade(null);
          }}
          onSuccess={() => {
            setIsUpgradeModalOpen(false);
            setSelectedPlanForUpgrade(null);
          }}
        />
      )}

      {/* Public Footer if rendered standalone */}
      {!embedded && (
        <footer className="mt-auto border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-300">CNTEstates</span>
              <span>· Centralized Plan Catalog · Sequence 23</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Zero-Decimal Subscription Display</span>
              <span>·</span>
              <span>USD Single Source of Truth</span>
              <span>·</span>
              <span>Enterprise Ready</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
