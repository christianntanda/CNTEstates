import React, { useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Printer,
  Lock,
  Database,
  Scale,
  Globe2,
  Mail,
} from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';

export type LegalDocumentType = 'terms' | 'privacy';

interface PublicLegalPageProps {
  documentType: LegalDocumentType;
  onBackToHome: () => void;
  onSwitchDocument: (doc: LegalDocumentType) => void;
  onOpenPricing: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onEnterWorkspace: () => void;
}

interface LegalSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    number: '1',
    title: 'Acceptance of Terms and Scope of Platform',
    paragraphs: [
      'These Terms and Conditions ("Terms") govern your access to and use of the CNTEstates web application, portals, APIs, subscription billing services, and related property and estate management features (collectively, the "Platform").',
      'By registering an account, accessing the public or authenticated areas of the Platform, or accepting these Terms during sign-up, you agree to be bound by these Terms on behalf of yourself and, where applicable, the organization or estate management entity you represent ("Customer" or "Account"). If you do not agree to these Terms, you must not access or use the Platform.',
    ],
  },
  {
    id: 'registration',
    number: '2',
    title: 'Account Registration and Multi-Provider Authentication',
    paragraphs: [
      'Access to CNTEstates operational workspaces requires creating a verified account through Firebase Authentication using supported credentials, which may include email and password or approved federated identity providers (such as Google, Microsoft, Apple, or GitHub where enabled).',
      'You must provide accurate, complete, and up-to-date registration details, verify your email address where required, and maintain the confidentiality of your credentials. You are responsible for all activity occurring under your authenticated sessions and linked sign-in providers.',
    ],
    bullets: [
      'Each email identity maps to a single authoritative CNTEstates user identity to prevent duplicate profiles and unauthorized account takeovers.',
      'Linking additional sign-in providers requires prior authentication and verification under your existing CNTEstates account.',
      'You must promptly notify your organization administrator or CNTEstates support if you suspect unauthorized access or compromised credentials.',
    ],
  },
  {
    id: 'roles',
    number: '3',
    title: 'Organization Accounts, User Roles, and Access Boundaries',
    paragraphs: [
      'CNTEstates enforces strict role-based access control (RBAC) across every organization account. Account Owners and authorized administrators may provision and manage access for Property Managers, Building or Facility Managers, Finance Managers, Auditors, Tenants/Residents, Contractors/Vendors, and Field Technicians.',
      'Users may only view, modify, or export records explicitly authorized for their assigned role and scoped to their organization account. Attempting to bypass role boundaries, manipulate route parameters, or probe another organization’s workspace is strictly prohibited and may result in immediate account suspension.',
    ],
  },
  {
    id: 'billing',
    number: '4',
    title: 'Subscription Plans, Capacity Limits, and Multi-Currency Billing',
    paragraphs: [
      'CNTEstates offers tiered subscription plans—including trial, standard, growth, and enterprise tiers—each subject to defined portfolio capacity limits (such as active properties, buildings, units, and team seats) and feature entitlements.',
      'All subscription charges, invoices, and payments are bound exclusively to the owning CNTEstates Account. Supported currencies include both standard two-decimal currencies (such as USD, EUR, GBP, CAD, AUD, ZAR, KES, NGN) and zero-decimal currencies (such as XAF, XOF, JPY, RWF), calculated and displayed in minor units according to international billing standards.',
    ],
    bullets: [
      'Subscription renewals, upgrades, downgrades, and cancellations must be initiated by an authorized Account Owner or Finance Administrator.',
      'Payment statuses are authoritative only once verified by CNTEstates backend services and cryptographic payment-gateway webhook signatures.',
      'Invoices, payment receipts, and subscription change logs remain bound to the owning account for auditability and statutory compliance.',
    ],
  },
  {
    id: 'acceptable-use',
    number: '5',
    title: 'Acceptable Use and Prohibited Conduct',
    paragraphs: [
      'You agree to use CNTEstates solely for lawful property management, leasing, maintenance, financial accounting, compliance, and resident or contractor coordination.',
    ],
    bullets: [
      'Do not attempt to access, query, modify, or infer data belonging to any other CNTEstates tenant, account, or organization.',
      'Do not reverse engineer, scrape, stress-test without written authorization, introduce malicious code, or interfere with platform security rules or infrastructure.',
      'Do not upload unlawful, fraudulent, defamatory, or infringing documents, lease agreements, or financial records.',
      'Do not share administrative credentials across unauthorized individuals or automate actions that evade audit logging.',
    ],
  },
  {
    id: 'ownership',
    number: '6',
    title: 'Customer Data Ownership and Strict Multi-Tenant Isolation',
    paragraphs: [
      'As between CNTEstates and the Customer, the Customer retains full ownership of all property portfolios, building hierarchies, unit inventories, lease contracts, tenant ledgers, maintenance work orders, utility meter readings, contractor bids, and financial records uploaded or generated within their Account ("Customer Data").',
      'CNTEstates processes Customer Data strictly inside isolated, account-scoped boundaries enforced through server-side ownership checks and Firestore Security Rules. CNTEstates does not sell Customer Data or expose one Customer’s operational or financial records to any other Customer.',
    ],
  },
  {
    id: 'ai-policy',
    number: '7',
    title: 'AI Operations Copilot and Human Authorization',
    paragraphs: [
      'Where enabled under your subscription plan, CNTEstates provides AI-assisted operational insights, lease drafting aids, maintenance triage, and portfolio summaries. All AI outputs are advisory in nature.',
      'CNTEstates enforces a human-in-the-loop operational model: AI tools do not execute binding financial transfers, alter official rent ledgers, terminate leases, or issue legal notices without explicit review and confirmation by an authorized human user.',
    ],
  },
  {
    id: 'availability',
    number: '8',
    title: 'Service Availability, Updates, and Platform Changes',
    paragraphs: [
      'CNTEstates strives to maintain reliable, continuous availability of the Platform and regularly deploys security patches, schema enhancements, and product improvements. Scheduled maintenance windows and material functional changes will be communicated through platform notices where practicable.',
    ],
  },
  {
    id: 'ip',
    number: '9',
    title: 'Intellectual Property',
    paragraphs: [
      'All rights, title, and interest in and to the CNTEstates software architecture, user interface, brand marks, documentation, algorithms, and underlying platform technology remain the exclusive property of CNTEstates and its licensors. Subject to compliance with these Terms and active subscription status, CNTEstates grants you a limited, non-exclusive, non-transferable, revocable right to access and use the Platform for your internal estate management operations.',
    ],
  },
  {
    id: 'termination',
    number: '10',
    title: 'Suspension, Termination, and Data Portability',
    paragraphs: [
      'Account Owners may terminate or downgrade their subscription in accordance with their active billing cycle. CNTEstates reserves the right to suspend or restrict access immediately if an account poses a security threat, violates these Terms, engages in fraudulent payment behavior, or remains materially overdue after notice.',
      'Upon termination, authorized Account Owners may request an export of their active operational and financial records during the applicable retention window before permanent account decommissioning, subject to statutory financial and audit retention obligations.',
    ],
  },
  {
    id: 'liability',
    number: '11',
    title: 'Disclaimers and Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by applicable law, the Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express, implied, or statutory, including implied warranties of merchantability, fitness for a particular purpose, or non-infringement. Customers remain solely responsible for compliance with local landlord-tenant legislation, tax regulations, building safety codes, and accounting standards.',
      'To the fullest extent permitted by law, CNTEstates shall not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, rent revenue, or business opportunities arising out of or related to use of the Platform. Aggregate liability for direct claims shall not exceed the subscription fees paid by the Customer to CNTEstates during the twelve (12) months immediately preceding the event giving rise to liability.',
    ],
  },
  {
    id: 'contact',
    number: '12',
    title: 'Updates to Terms and Legal Notices',
    paragraphs: [
      'CNTEstates may update these Terms periodically to reflect legal, security, or platform developments. Material updates will be reflected by an updated Effective Date on this page and communicated to Account Owners. Continued use of the Platform after the effective date of revised Terms constitutes acceptance.',
      'Questions regarding these Terms and Conditions or enterprise contractual agreements may be directed to CNTEstates Legal & Compliance at legal@cntestates.com.',
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'scope',
    number: '1',
    title: 'Scope and Privacy Commitment',
    paragraphs: [
      'This Privacy Policy explains how CNTEstates ("CNTEstates", "we", "us") collects, stores, secures, and processes personal data, account credentials, and property management records when you visit our public website, register an account, or operate within an organization workspace on the Platform.',
      'For account registration, authentication, subscription billing, and platform security, CNTEstates acts as the data controller. For tenant profiles, lease records, maintenance histories, utility readings, and property documents stored inside a Customer’s isolated workspace, the subscribing Customer organization acts as the data controller and CNTEstates acts as a secure data processor acting strictly on the Customer’s documented instructions.',
    ],
  },
  {
    id: 'data-collected',
    number: '2',
    title: 'Categories of Account and Property Records Processed',
    paragraphs: [
      'We limit data collection to what is strictly necessary to authenticate users, enforce multi-tenant isolation, administer subscriptions, and deliver estate management functionality:',
    ],
    bullets: [
      'Account & Identity Records: Full name, verified email address, organization or company name, country, preferred interface language (English, French, Spanish, Portuguese), assigned role category, and timestamps of Terms and Privacy acceptance.',
      'Authentication & Linked Provider Metadata: Firebase Authentication unique user identifier (UID), email verification status, and linked sign-in provider identifiers (e.g., Password, Google, Microsoft, Apple, GitHub). CNTEstates never stores plaintext passwords.',
      'Property & Estate Operational Records: Portfolios, properties, buildings, floors, units, equipment assets, lease agreements, tenant contact details, service desk tickets, work orders, contractor profiles, RFQ bids, utility sub-meter readings, inspections, and compliance certificates scoped to the Customer Account.',
      'Financial & Subscription Records: Rent invoices, payment ledger entries, subscription plan entitlements, billing currency, invoice ownership references, and verified gateway transaction references.',
      'Security & Audit Telemetry: Immutable audit trail entries recording user authentication events, role changes, billing actions, and administrative changes to protect account integrity.',
    ],
  },
  {
    id: 'purposes',
    number: '3',
    title: 'Purposes and Lawful Basis for Processing',
    paragraphs: [
      'CNTEstates processes account and property records exclusively for legitimate, transparent operational purposes:',
    ],
    bullets: [
      'Contract Performance: Provisioning your isolated CNTEstates account, authenticating sessions, delivering property/lease/maintenance workflows, and administering subscription plans and invoices.',
      'Security & Fraud Prevention: Preventing duplicate account creation, blocking unauthorized cross-account access, verifying payment webhooks, and maintaining immutable audit trails.',
      'Legal & Accounting Compliance: Fulfilling statutory tax, invoicing, anti-fraud, and regulatory record-keeping obligations.',
      'Support & Product Reliability: Responding to public inquiries, diagnosing technical issues, and ensuring high availability of the Platform.',
    ],
  },
  {
    id: 'isolation',
    number: '4',
    title: 'Strict Multi-Tenant Isolation and Technical Safeguards',
    paragraphs: [
      'Protecting the confidentiality and separation of every Customer’s account and property records is foundational to CNTEstates’ architecture:',
    ],
    bullets: [
      'Every operational, billing, and property record is bound to an immutable account/organization identifier and validated on every read and write.',
      'Firestore Security Rules and server-side ownership checks prevent any user from viewing, querying, modifying, or exporting records belonging to another CNTEstates Account.',
      'Role-based access controls restrict Tenants, Contractors, Technicians, Managers, Finance staff, and Auditors to the minimum records required for their respective portals.',
      'All data in transit is encrypted using HTTPS/TLS, and data stored in Google Cloud / Firebase infrastructure is encrypted at rest using industry-standard AES-256 encryption.',
      'Sensitive server-side secrets (such as payment webhook signing secrets and service credentials) are isolated exclusively in protected server environments and are never exposed to client browsers.',
    ],
  },
  {
    id: 'payments',
    number: '5',
    title: 'Subscription Billing and Payment Data Security',
    paragraphs: [
      'Subscription billing, invoice retrieval, and payment records are validated against the authenticated Account context before display or download. CNTEstates does not store raw payment card numbers (PAN) or CVV codes on its application servers.',
      'Payment confirmation events received from external payment gateways are accepted only after cryptographic webhook signature verification and duplicate-transaction protection on the server, ensuring billing records cannot be forged or altered from the browser.',
    ],
  },
  {
    id: 'retention',
    number: '6',
    title: 'Data Retention and Immutable Financial & Audit Records',
    paragraphs: [
      'We retain your account profile and property records for as long as your CNTEstates Account remains active or as instructed by your organization’s Account Owner. Certain financial ledgers, verified payment receipts, subscription invoices, and security audit logs are retained in immutable form for the period required by applicable financial, tax, and regulatory laws.',
      'When an account is closed or a deletion request is verified, active operational records are queued for secure erasure or anonymization once statutory retention periods expire.',
    ],
  },
  {
    id: 'international',
    number: '7',
    title: 'Cloud Infrastructure and International Data Transfers',
    paragraphs: [
      'CNTEstates operates on enterprise Google Cloud and Firebase infrastructure provisioned in secure regional data centers (including Europe / UK regions). Where cross-border transfers occur to serve international portfolios and multilingual teams, CNTEstates relies on recognized contractual and technical transfer safeguards to protect personal data.',
    ],
  },
  {
    id: 'rights',
    number: '8',
    title: 'Your Privacy Rights and Account Controls',
    paragraphs: [
      'Depending on your jurisdiction (including GDPR, UK GDPR, CCPA/CPRA, and equivalent data protection frameworks), you have rights regarding your personal data:',
    ],
    bullets: [
      'Access & Portability: Request confirmation of personal data processed and obtain a structured copy of your account and property records.',
      'Correction: Update inaccurate profile, organization, or property records directly within your workspace or through your Account Owner.',
      'Authentication Provider Controls: Link or unlink federated sign-in providers (Google, Microsoft, Apple, GitHub) directly from Account Security settings while preserving at least one verified sign-in method.',
      'Deletion & Restriction: Request deletion or restriction of processing of personal data, subject to active lease/contractual requirements and mandatory financial record-keeping laws.',
      'Tenants, contractors, or staff operating inside a Customer organization workspace should direct record-specific requests to their managing property organization (the data controller), whom CNTEstates assists as processor.',
    ],
  },
  {
    id: 'subprocessors',
    number: '9',
    title: 'Subprocessors and No Sale of Personal Data',
    paragraphs: [
      'CNTEstates does not sell, rent, or trade your personal information, tenant rosters, or property portfolio records to third-party advertisers or data brokers. We share data only with vetted infrastructure and payment subprocessors necessary to operate the Platform (such as Google Cloud / Firebase for authentication and database hosting, and authorized payment processors for billing), or where strictly required by lawful court order or statutory obligation.',
    ],
  },
  {
    id: 'incidents',
    number: '10',
    title: 'Security Incident Response and Privacy Contact',
    paragraphs: [
      'CNTEstates maintains continuous monitoring, audit logging, and incident response procedures. In the event of a confirmed security incident affecting personal or account records, CNTEstates will promptly investigate, mitigate the impact, and notify affected Account Owners and relevant supervisory authorities in accordance with applicable law.',
      'To exercise privacy rights, inquire about data processing agreements (DPAs), or report a security or privacy concern, please contact the CNTEstates Privacy & Data Protection Office at privacy@cntestates.com.',
    ],
  },
];

export const PublicLegalPage: React.FC<PublicLegalPageProps> = ({
  documentType,
  onBackToHome,
  onSwitchDocument,
  onOpenPricing,
  onOpenAuth,
  onEnterWorkspace,
}) => {
  const { firebaseUser } = useFirebase();
  const isAuthenticated = Boolean(firebaseUser && firebaseUser.emailVerified);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [documentType]);

  const isTerms = documentType === 'terms';
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Public Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-bold text-white tracking-tight">CNTEstates</span>
            </button>

            <span className="hidden sm:inline-block h-4 w-px bg-slate-800" aria-hidden="true" />

            <button
              type="button"
              onClick={onBackToHome}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={onEnterWorkspace}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Open Workspace
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Document Hero & Switcher */}
      <section className="border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400 mb-3">
                {isTerms ? <Scale className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Public Legal & Governance Documentation</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {isTerms ? 'CNTEstates Terms and Conditions' : 'CNTEstates Privacy Policy'}
              </h1>

              <p className="mt-3 text-sm md:text-base text-slate-300 leading-relaxed">
                {isTerms
                  ? 'Governing platform usage, account registration, role-based access boundaries, subscription billing, and strict multi-tenant data isolation across CNTEstates.'
                  : 'Explaining how CNTEstates collects, isolates, safeguards, and processes your account credentials, subscription records, and property management data.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
                <span>Effective Date: January 1, 2026</span>
                <span aria-hidden="true">·</span>
                <span>Last Updated: March 2026</span>
                <span aria-hidden="true">·</span>
                <span>Document Version: 2.0</span>
                <span aria-hidden="true">·</span>
                <span>Publicly Accessible — No Sign-In Required</span>
              </div>
            </div>

            {/* Document Switcher */}
            <div
              role="tablist"
              aria-label="Legal documents"
              className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start lg:self-end print:hidden"
            >
              <a
                href="/terms"
                role="tab"
                aria-selected={isTerms}
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchDocument('terms');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isTerms
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Terms & Conditions</span>
              </a>
              <a
                href="/privacy"
                role="tab"
                aria-selected={!isTerms}
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchDocument('privacy');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  !isTerms
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Reading Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Sticky Table of Contents */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 space-y-6 print:hidden">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Table of Contents
              </h2>
              <nav aria-label="Document sections" className="space-y-1.5">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-start gap-2.5 text-xs text-slate-300 hover:text-emerald-400 py-1 transition-colors"
                  >
                    <span className="text-slate-500 font-mono shrink-0">{section.number}.</span>
                    <span className="leading-snug">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Security & Trust Highlights</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Every CNTEstates organization operates inside an isolated multi-tenant workspace backed by Firebase Authentication, Firestore Security Rules, and server-verified billing records.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{isTerms ? 'legal@cntestates.com' : 'privacy@cntestates.com'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Global Multi-Currency & Multilingual SaaS</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Document Body */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-8">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 md:p-7"
              >
                <h2 className="text-lg md:text-xl font-semibold text-white mb-3 flex items-baseline gap-2.5">
                  <span className="text-emerald-400 font-mono text-sm">{section.number}.</span>
                  <span>{section.title}</span>
                </h2>

                <div className="space-y-3.5 text-sm text-slate-300 leading-relaxed">
                  {section.paragraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2 pt-1 pl-5 list-disc marker:text-emerald-500">
                      {section.bullets.map((bullet, idx) => (
                        <li key={idx} className="text-slate-300 leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            {/* Bottom Cross-Document Navigation Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
              <div>
                <p className="text-sm font-semibold text-white">
                  {isTerms
                    ? 'Want to review how we safeguard your data?'
                    : 'Looking for platform usage and subscription terms?'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isTerms
                    ? 'Read the CNTEstates Privacy Policy covering secure processing of account and property records.'
                    : 'Read the CNTEstates Terms and Conditions governing platform usage, roles, and billing.'}
                </p>
              </div>
              <a
                href={isTerms ? '/privacy' : '/terms'}
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchDocument(isTerms ? 'privacy' : 'terms');
                }}
                className="shrink-0 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors"
              >
                {isTerms ? 'Read Privacy Policy' : 'Read Terms and Conditions'}
              </a>
            </div>
          </article>
        </div>
      </main>

      {/* Quiet Public Footer */}
      <footer className="mt-auto border-t border-slate-800/90 py-8 px-6 text-xs text-slate-400 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">CNTEstates</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 CNTEstates. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBackToHome();
              }}
              className="hover:text-white transition-colors"
            >
              Home
            </a>
            <a
              href="/pricing"
              onClick={(e) => {
                e.preventDefault();
                onOpenPricing();
              }}
              className="hover:text-white transition-colors"
            >
              Pricing Plans
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onSwitchDocument('terms');
              }}
              className={isTerms ? 'text-emerald-400 font-medium' : 'hover:text-white transition-colors'}
            >
              Terms and Conditions
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onSwitchDocument('privacy');
              }}
              className={!isTerms ? 'text-emerald-400 font-medium' : 'hover:text-white transition-colors'}
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
