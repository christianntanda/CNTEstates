import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { PublicPricingPage } from '../pricing/PublicPricingPage';
import {
  Building2,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  CheckCircle2,
  Mail,
  Globe2,
  ShieldCheck,
} from 'lucide-react';

const HERO_IMAGE = '/src/assets/images/hero_cntestates_architecture_1795606654189.jpg';
const ATRIUM_IMAGE = '/src/assets/images/solutions_building_atrium_1795606655385.jpg';

interface LandingPageProps {
  initialSection?: 'features' | 'solutions' | 'faq' | 'contact';
  onOpenAuth?: (mode: 'signin' | 'signup', planId?: string) => void;
  onEnterWorkspace?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  initialSection,
  onOpenAuth,
  onEnterWorkspace,
}) => {
  const { setActiveTab } = useApp();
  const { firebaseUser, signOutUser } = useFirebase();

  useEffect(() => {
    if (!initialSection) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(initialSection);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [atriumImgFailed, setAtriumImgFailed] = useState(false);

  // Public Contact & Support inquiry form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactUnits, setContactUnits] = useState('1–50 units');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const isAuthenticated = Boolean(firebaseUser && firebaseUser.emailVerified);

  const openSignIn = () => {
    setMobileNavOpen(false);
    if (onOpenAuth) {
      onOpenAuth('signin');
    } else {
      setActiveTab('auth_signin');
    }
  };

  const openSignUp = (planId?: string) => {
    setMobileNavOpen(false);
    if (onOpenAuth) {
      onOpenAuth('signup', planId);
    } else {
      setActiveTab('auth_signup');
    }
  };

  const enterWorkspace = () => {
    setMobileNavOpen(false);
    if (onEnterWorkspace) {
      onEnterWorkspace();
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError('Please complete your name, email address, and inquiry details.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())) {
      setContactError('Please enter a valid email address.');
      return;
    }
    setContactSubmitted(true);
  };

  const faqs = [
    {
      q: 'Does CNTEstates support multi-building complexes, units, and sub-metering?',
      a: 'Yes. CNTEstates models your entire estate from Portfolio down to Property, Building, Floor, Unit, and Equipment Asset. Built-in utility sub-metering tracks electricity, water, gas, and solar recharges per occupied unit.',
    },
    {
      q: 'How does CNTEstates enforce account isolation between organizations and user roles?',
      a: 'Every registered organization receives an isolated tenant boundary backed by Firebase Authentication and Firestore Security Rules. Property owners, managers, tenants, contractors, and technicians can only read or modify records explicitly authorized for their organization and role.',
    },
    {
      q: 'Can I link multiple sign-in providers to the same CNTEstates account?',
      a: 'Yes. From Account Security settings, authenticated users can link Google Sign-In and Email & Password credentials to the same verified account without creating duplicate workspaces.',
    },
    {
      q: 'How does the AI-powered operations intelligence assist property teams?',
      a: 'The integrated AI operations copilot analyzes live leases, rent arrears, maintenance SLAs, and contractor turnaround times—surfacing concrete operational actions behind explicit human authorization guardrails.',
    },
    {
      q: 'Are multi-currency accounting and multilingual portals supported out of the box?',
      a: 'Yes. CNTEstates supports English, French, Spanish, and Portuguese interfaces alongside multi-currency rent administration, zero-decimal subscription billing, and branded PDF invoice exports.',
    },
  ];

  const capabilities = [
    {
      num: '01.',
      title: 'Property & Building Management',
      body: 'Structure residential towers, commercial offices, and mixed-use estates across a unified Portfolio → Property → Building → Floor → Unit → Asset hierarchy with real-time occupancy visibility.',
      span: 'lg:col-span-7',
    },
    {
      num: '02.',
      title: 'Tenant, Lease & Rental Administration',
      body: 'Centralize tenant profiles, digital lease vaults, escalation schedules, renewal alerts, and deposit ledgers with a dedicated self-service Tenant Portal.',
      span: 'lg:col-span-5',
    },
    {
      num: '03.',
      title: 'Rent Collection, Invoicing & Financial Management',
      body: 'Track monthly rent payments, automate arrears reminders, issue organization-branded PDF invoices, and reconcile multi-currency income and expense ledgers.',
      span: 'lg:col-span-5',
    },
    {
      num: '04.',
      title: 'Maintenance, Service Requests & Contractor Coordination',
      body: 'Capture resident service tickets with SLA priority timers, convert requests into work orders, collect competitive contractor RFQ bids, and equip field technicians with mobile checklists.',
      span: 'lg:col-span-7',
    },
    {
      num: '05.',
      title: 'AI-Powered Automation & Operational Intelligence',
      body: 'Automate recurring SLA escalations, preventive maintenance schedules, and billing workflows while querying live portfolio health through an AI operations copilot governed by human approval gates.',
      span: 'lg:col-span-6',
    },
    {
      num: '06.',
      title: 'Subscriptions, Reporting & Multilingual Governance',
      body: 'Operate seamlessly in English, French, Spanish, and Portuguese with executive financial reports, immutable audit trails, role-based access control, and six transparent subscription tiers.',
      span: 'lg:col-span-6',
    },
  ];

  const solutions = [
    {
      segment: 'Individual Landlords',
      scale: '1–10 rental units',
      description:
        'Automated rent tracking, digital lease storage, tenant maintenance tickets, and branded receipts without spreadsheet overhead.',
    },
    {
      segment: 'Property Management Firms',
      scale: '50–500+ units across owners',
      description:
        'Strict client portfolio isolation, arrears automation, contractor RFQ bidding, owner statements, and role-based team permissions.',
    },
    {
      segment: 'Commercial & Mixed-Use Operators',
      scale: 'Office parks & retail plazas',
      description:
        'Utility sub-metering recharges, preventive HVAC and generator logs, compliance certificates, and 24/7 security incident tracking.',
    },
    {
      segment: 'Institutional Estates & Enterprise',
      scale: 'Multi-region portfolios',
      description:
        'Multi-currency consolidated billing, custom SLA engines, tamper-evident audit trails, and dedicated enterprise onboarding.',
    },
  ];

  return (
    <div
      id="home"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Responsive Public Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand Wordmark */}
          <a
            href="#home"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </span>
            <span>
              CNT<span className="text-emerald-400">Estates</span>
            </span>
          </a>

          {/* Primary Public Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <a
              href="#home"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#features"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#solutions"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Solutions
            </a>
            <a
              href="#pricing"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Pricing Plans
            </a>
            <a
              href="#faq"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
          </nav>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={enterWorkspace}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openSignIn}
                  className="px-3.5 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openSignUp()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Up / Register
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile / Tablet Responsive Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-slate-950 border-t border-slate-800 px-6 py-4 space-y-4">
            <nav className="flex flex-col space-y-2.5 text-sm font-medium text-slate-200">
              <a
                href="#home"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-emerald-400 transition-colors"
              >
                Home
              </a>
              <a
                href="#features"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-emerald-400 transition-colors"
              >
                Features
              </a>
              <a
                href="#solutions"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-emerald-400 transition-colors"
              >
                Solutions
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-emerald-400 transition-colors"
              >
                Pricing Plans
              </a>
              <a
                href="#faq"
                onClick={() => setMobileNavOpen(false)}
                className="py-1.5 hover:text-emerald-400 transition-colors"
              >
                FAQ
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={enterWorkspace}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold text-center"
                  >
                    Open Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileNavOpen(false);
                      void signOutUser();
                    }}
                    className="py-2.5 px-4 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="flex-1 py-2.5 px-4 border border-slate-700 hover:border-slate-500 text-slate-100 rounded-lg text-sm font-medium text-center"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => openSignUp()}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold text-center"
                  >
                    Sign Up / Register
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section — 2-Column Editorial Split */}
      <section className="max-w-7xl mx-auto w-full px-6 pt-12 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-400 font-medium">
              <span>AI-Powered Property &amp; Estate Management</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">Multi-Tenant Cloud SaaS</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white tracking-tight leading-[1.12]">
              <span className="block text-[32px]">Manage Your Buildings</span>
              <span className="block text-[32px]">Manage Your Tenants</span>
              <span className="block text-[32px]">Manage Your Operations</span>
              <span className="block text-[32px] text-emerald-400">from one intelligent platform.</span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed max-w-xl">
              CNTEstates unifies residential, commercial, and mixed-use estate administration—combining tenant leasing, rent collection, branded invoicing, SLA maintenance dispatch, contractor coordination, and AI operational intelligence in four languages.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={enterWorkspace}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Go to Your Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openSignUp()}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <a
                href="#pricing"
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium text-center transition-colors whitespace-nowrap"
              >
                Compare Pricing Plans
              </a>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Permanent Free Tier Available</span>
              <span aria-hidden="true">·</span>
              <span>Strict Tenant Data Isolation</span>
              <span aria-hidden="true">·</span>
              <span>EN / FR / ES / PT</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="Modern residential and commercial mixed-use real estate complex managed on CNTEstates"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Building2 className="w-10 h-10 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">CNTEstates Portfolio Architecture</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-emerald-300 font-medium">Spatial Asset Hierarchy</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    Portfolio · Property · Building · Floor · Unit · Equipment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Quantitative Platform Strip */}
        <div className="mt-12 pt-8 border-t border-slate-800/90 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">6 Tiers</p>
            <p className="text-xs text-slate-400 mt-1">Free to Enterprise (up to 5,000+ units)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">4 Portals</p>
            <p className="text-xs text-slate-400 mt-1">Owner, Tenant, Contractor &amp; Field Technician</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">4 Languages</p>
            <p className="text-xs text-slate-400 mt-1">English, French, Spanish &amp; Portuguese</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">100% Isolated</p>
            <p className="text-xs text-slate-400 mt-1">Per-tenant Firestore security boundaries</p>
          </div>
        </div>
      </section>

      {/* Features / Core Capabilities — Asymmetric Bento Grid */}
      <section id="features" className="border-t border-slate-800/90 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold text-emerald-400">Platform Capabilities</p>
            <h2 className="text-[32px] font-bold text-white tracking-tight [text-wrap:balance]">
              Every operational discipline connected in one auditable system
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Replace fragmented spreadsheets and disconnected maintenance chats with structured building records, financial automation, and role-scoped portals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {capabilities.map((cap) => (
              <div
                key={cap.num}
                className={`${cap.span} bg-slate-900/75 border border-slate-800 rounded-xl p-7 flex flex-col justify-between space-y-4`}
              >
                <div className="space-y-3">
                  <span className="text-xs font-mono font-semibold text-emerald-400 tabular-nums">
                    {cap.num}
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">{cap.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{cap.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section — Tailored Customer Segments + Architectural Visual */}
      <section id="solutions" className="bg-slate-900/40 border-t border-slate-800/90 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-5">
              <div className="relative h-72 lg:h-full min-h-[300px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                {!atriumImgFailed ? (
                  <img
                    src={ATRIUM_IMAGE}
                    alt="Contemporary commercial and residential building atrium lobby"
                    referrerPolicy="no-referrer"
                    onError={() => setAtriumImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-emerald-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-6">
                  <p className="text-xs text-emerald-300 font-medium">Role-Based Portals</p>
                  <p className="text-sm text-white font-semibold mt-0.5">
                    Dedicated views for landlords, property managers, tenants, contractors, and technicians
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-emerald-400">Industry Solutions</p>
                <h2 className="text-[32px] font-bold text-white tracking-tight [text-wrap:balance]">
                  Built for single-building landlords and institutional portfolios alike
                </h2>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  Each stakeholder logs into their own verified account with strict data isolation—ensuring financial ledgers remain private while operational teams resolve maintenance quickly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {solutions.map((sol) => (
                  <div
                    key={sol.segment}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{sol.segment}</h3>
                      <span className="text-[11px] text-emerald-400 font-mono whitespace-nowrap">
                        {sol.scale}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{sol.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Pricing Plans — Embedded Dynamic Catalog */}
      <section id="pricing" className="border-t border-slate-800/90">
        <PublicPricingPage
          embedded={true}
          onSelectPlanForAuth={(planId) => openSignUp(planId)}
        />
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="bg-slate-900/40 border-t border-slate-800/90 py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold text-emerald-400">Questions &amp; Answers</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-400">
              Security, multi-tenant architecture, pricing, and day-to-day property operations.
            </p>
          </div>

          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {faqs.map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div key={faq.q} className="py-1">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full py-4 flex items-center justify-between gap-4 text-left text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-4 pr-8 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public Contact & Onboarding Support Section */}
      <section id="contact" className="border-t border-slate-800/90 py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-semibold text-emerald-400">Contact &amp; Support</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight [text-wrap:balance]">
              Ready to modernize your estate operations?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Start immediately on the permanent CNTEstates Free plan, or speak with our onboarding team about migrating multi-property portfolios, custom SLAs, and ERP integrations.
            </p>

            <div className="space-y-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>support@cntestates.com · enterprise@cntestates.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-region support across Africa, Europe, Americas &amp; Middle East</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Role-based tenant isolation with encrypted Firebase cloud storage</span>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openSignUp()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Sign Up / Register Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            {contactSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Inquiry Received</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Thank you, {contactName}. Our CNTEstates solutions team will respond to{' '}
                  <span className="text-slate-200">{contactEmail}</span> within one business day.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactName('');
                    setContactEmail('');
                    setContactMessage('');
                  }}
                  className="mt-2 px-4 py-2 text-xs font-semibold text-emerald-400 hover:underline"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-white">Request a Portfolio Consultation</h3>

                {contactError && (
                  <p className="text-xs text-red-300 bg-red-950/60 border border-red-800 rounded-lg p-3">
                    {contactError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Work Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-units" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Portfolio Size
                  </label>
                  <select
                    id="contact-units"
                    value={contactUnits}
                    onChange={(e) => setContactUnits(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1–50 units">1–50 units (Individual / Growing)</option>
                    <option value="51–300 units">51–300 units (Property Manager)</option>
                    <option value="301–1,000 units">301–1,000 units (Commercial / Multi-Site)</option>
                    <option value="1,000+ units">1,000+ units (Institutional Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-msg" className="block text-xs font-medium text-slate-300 mb-1.5">
                    How can we help?
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us about your buildings, billing currency, or migration timeline..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Submit Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-800/90 py-8 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">CNTEstates</span>
              <span aria-hidden="true">·</span>
              <span>© 2026 CNTEstates. All rights reserved.</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5">
              <a href="#home" className="hover:text-white transition-colors">Home</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              {!isAuthenticated && (
                <>
                  <button type="button" onClick={openSignIn} className="hover:text-white transition-colors cursor-pointer">
                    Sign In
                  </button>
                  <button type="button" onClick={() => openSignUp()} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer">
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400">
            <p className="text-center sm:text-left">
              Public legal &amp; data-protection disclosures available without sign-in:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('terms');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-slate-300 hover:text-emerald-400 underline underline-offset-4 decoration-slate-700 hover:decoration-emerald-400 transition-colors"
              >
                CNTEstates Terms and Conditions
              </a>
              <span aria-hidden="true" className="text-slate-700">·</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('privacy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-slate-300 hover:text-emerald-400 underline underline-offset-4 decoration-slate-700 hover:decoration-emerald-400 transition-colors"
              >
                CNTEstates Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
