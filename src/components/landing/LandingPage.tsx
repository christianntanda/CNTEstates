import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { subscriptionPlans } from '../../data/mockDatabase';
import {
  countryConfigurations,
  getCountryConfiguration,
} from '../../services/currencyService';
import { PublicPricingPage } from '../pricing/PublicPricingPage';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Shield,
  LifeBuoy,
  Zap,
  Users,
  DollarSign,
  Cpu,
  Layers,
  Sparkles,
  Smartphone,
  ChevronDown,
  Globe2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Does CNTEstates support multi-building complexes and sub-metering?',
      a: 'Yes. CNTEstates supports a full visual spatial hierarchy: Portfolio → Property → Building → Floor → Unit → Equipment Asset. Smart sub-metering automatically calculates electricity, water, gas, and solar recharge allocations per tenant.',
    },
    {
      q: 'How does the Autonomous AI Operations Co-Pilot work?',
      a: 'The AI assistant is grounded in real-time portfolio telemetry via the official Gemini API. It can identify overdue arrears, analyze contractor SLA compliance, project monthly cash flow, and triage emergency work orders with human authorization guardrails.',
    },
    {
      q: 'Can contractors and tenants access dedicated portals without seeing financial admin data?',
      a: 'Yes. CNTEstates provides strictly isolated role-based experiences: a resident Tenant Portal for rent payments and service requests, a Contractor Portal for bidding on RFQs and executing work orders, and a mobile-ready Field Technician Terminal.',
    },
    {
      q: 'Is multi-currency and multilingual support available out of the box?',
      a: 'Yes. The platform natively supports English, French, Spanish, and Portuguese, and seamlessly decouples language selection from functional base currency (USD, EUR, GBP, BRL) and local timezones.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Marketing Top Nav */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="font-bold text-lg text-white">
              CNT<span className="text-emerald-400">Estates</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-emerald-400 transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing Plans</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Launch Platform
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-6 text-center max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-emerald-900/80 text-emerald-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Rental Building Operations SaaS</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Manage Your Buildings. <br />
          Manage Your Tenants. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            Manage Your Operations.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
          CNTEstates is an advanced property and rental building management SaaS for private residential, commercial and mixed-use properties.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Start Managing Your Buildings</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#pricing"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            View Subscription Plans
          </a>
        </div>
      </section>

      {/* Spatial Model Pipeline Banner */}
      <section className="bg-slate-900/80 border-y border-slate-800 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs font-mono text-slate-400">
          <span className="text-emerald-400 font-bold">PORTFOLIO</span>
          <span>&rarr;</span>
          <span>PROPERTY</span>
          <span>&rarr;</span>
          <span>BUILDING</span>
          <span>&rarr;</span>
          <span>FLOOR</span>
          <span>&rarr;</span>
          <span>UNIT</span>
          <span>&rarr;</span>
          <span>TENANT</span>
          <span>&rarr;</span>
          <span>LEASE</span>
          <span>&rarr;</span>
          <span>SERVICE TICKET</span>
          <span>&rarr;</span>
          <span>WORK ORDER</span>
          <span>&rarr;</span>
          <span>CONTRACTOR</span>
          <span>&rarr;</span>
          <span className="text-emerald-400 font-bold">OUTCOME</span>
        </div>
      </section>

      {/* Feature Pillars */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Integrated Real Estate Operations Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered to eliminate disconnected spreadsheets and unify every operational building service into an auditable engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Central Service Desk & SLAs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ticket tracking with unique codes (CBM-XXXX), automated priority timers (Emergency 15m, Critical 30m), and one-click dispatch to work orders.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Gemini AI Operational Co-Pilot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time conversational queries over live leases, arrears, maintenance budgets, and automated specialized agents with human authorization guardrails.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Digital Building Spatial Model</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visual floor-by-floor inspection twin. Drill down into mechanical chillers, backup generators, elevators, and occupied suites in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Solutions Tab Strip */}
      <section id="solutions" className="bg-slate-900/60 border-t border-slate-800 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tailored for Every Real Estate Customer Segment
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From individual landlords managing a single rental duplex to institutional property management companies managing thousands of units.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-400 text-sm">Individual Landlords</h4>
              <p className="text-slate-300">
                1–10 units. Automated rent collection, tenant screening records, digital lease vault, and maintenance dispatch without costly overhead.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-400 text-sm">Property Managers</h4>
              <p className="text-slate-300">
                Hundreds of units across multiple owners. Strict trust accounting, automated arrears notices, contractor RFQ bidding, and owner reports.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-400 text-sm">Commercial Operators</h4>
              <p className="text-slate-300">
                Office parks & retail plazas. Sub-metering recharges, 24/7 HVAC server guarantees, visitor access badges, and preventive maintenance logs.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-400 text-sm">Institutional Enterprise</h4>
              <p className="text-slate-300">
                Multi-region portfolios. SOC2 compliance audit trails, custom SLA policies, dedicated database isolation, and accounting ERP APIs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEQUENCE 23 — AUTHORITATIVE PUBLIC PRICING PAGE */}
      <section id="pricing" className="border-t border-slate-800">
        <PublicPricingPage embedded={true} />
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="bg-slate-900/40 border-t border-slate-800 py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400">Everything you need to know about the platform.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="p-4 flex items-center justify-between text-xs font-bold text-slate-200">
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      activeFaq === i ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </div>
                {activeFaq === i && (
                  <div className="px-4 pb-4 text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">CNTEstates</span>
            <span>· All Rights Reserved © 2026</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>SOC2 Ready</span>
            <span>·</span>
            <span>GDPR Compliant</span>
            <span>·</span>
            <span>256-Bit TLS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
