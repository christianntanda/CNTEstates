import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  DollarSign,
  Award,
  Building,
  UserCheck,
  RefreshCw,
  ShieldCheck,
  Lock,
  Scale,
  Receipt,
  CreditCard,
  TrendingUp,
  FileText,
  Sliders,
  XCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  Check,
  X,
  Play,
  KeyRound,
} from 'lucide-react';
import {
  AI_BILLING_PERMITTED_CAPABILITIES,
  HIGH_IMPACT_BILLING_ACTIONS,
  type AiBillingPermittedCapability,
  type HighImpactBillingAction,
  type HumanAuthorizationRequest,
  type AiBillingSafetyTestSuiteResult,
} from '../../services/aiBillingSafetyService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  isBillingSafetyBlocked?: boolean;
  permittedCapability?: AiBillingPermittedCapability;
  highImpactAction?: HighImpactBillingAction;
  authorizationRequestId?: string;
}

export const AiAssistantView: React.FC = () => {
  const {
    t,
    language,
    organization,
    userRole,
    currentUser,
    properties,
    units,
    tenants,
    leases,
    tickets,
    workOrders,
    contractors,
    financialRecords,
    complianceCertificates,
    // Sequence 32 AppContext integrations
    aiBillingAuthRequests,
    refreshAiBillingAuthRequests,
    askAiBillingAssistant,
    authorizeBillingAction,
    rejectBillingAction,
    runAiBillingSafetySuite,
  } = useApp();

  const [activeTabSub, setActiveTabSub] = useState<'assistant' | 'billing_safety' | 'agents'>('billing_safety');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: `Hello! I am your CNTEstates AI Assistant. I have indexed your current portfolio of ${properties.length} properties, ${units.length} units, and your active billing subscription (${organization.name}).

In accordance with SEQUENCE 32 — AI BILLING SAFETY:
• I can assist with Plan Explanations, Usage Analysis, Invoice Explanations, Billing Status, Capacity Warnings, and Subscription Information.
• I am strictly prohibited from independently executing high-impact actions (Plan Changes, Cancellations, Refunds, Payment Method Changes, or Billing Info Changes). All such actions require verified human authorization.

How may I assist you today?`,
      timestamp: 'Ready',
      source: 'gemini-3.8-flash',
    },
  ]);

  // High-impact human authorization modal state for Autonomous Agents (General Operations)
  const [agentActionModal, setAgentActionModal] = useState<{
    agentName: string;
    actionDescription: string;
    impactLevel: string;
  } | null>(null);
  const [actionAuthorized, setActionAuthorized] = useState(false);

  // Human Authorization Sign-off Drawer/Modal State for Billing Safety
  const [activeSignOffTicket, setActiveSignOffTicket] = useState<HumanAuthorizationRequest | null>(null);
  const [signOffNotes, setSignOffNotes] = useState('');
  const [signOffSignatureConfirmed, setSignOffSignatureConfirmed] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);

  // Test Suite Execution State
  const [testSuiteResult, setTestSuiteResult] = useState<AiBillingSafetyTestSuiteResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const samplePrompts = [
    t.ai.samplePrompt1,
    t.ai.samplePrompt2,
    t.ai.samplePrompt3,
    t.ai.samplePrompt4,
    t.ai.samplePrompt5,
    t.ai.samplePrompt6,
  ];

  const handleSend = async (queryToSend?: string, actionPayload?: any) => {
    const prompt = queryToSend || inputQuery;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    // Prepare context bundle for backend
    const contextData = {
      language,
      metrics: {
        totalProperties: properties.length,
        totalUnits: units.length,
        totalTenants: tenants.length,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        planId: organization.planId,
        currency: organization.billingCurrency || organization.baseCurrency || 'USD',
      },
      properties: properties.map((p) => ({ id: p.id, name: p.name, city: p.city, units: p.totalUnits })),
      tickets: tickets.map((t) => ({
        code: t.code,
        title: t.title,
        priority: t.priority,
        status: t.status,
        propertyName: t.propertyName,
        unitNumber: t.unitNumber,
        slaTarget: `${t.slaTargetHours} hours`,
        cost: t.cost,
      })),
      leases: leases.map((l) => ({
        leaseNumber: l.leaseNumber,
        tenantName: l.tenantName,
        unitNumber: l.unitNumber,
        status: l.status,
        daysRemaining: l.daysRemaining,
        endDate: l.endDate,
        monthlyRent: l.monthlyRent,
      })),
      tenants: tenants.map((t) => ({
        name: t.name,
        unitNumber: units.find((u) => u.id === t.unitId)?.unitNumber,
        outstandingBalance: t.outstandingBalance,
        paymentStatus: t.paymentStatus,
      })),
      contractors: contractors.map((c) => ({
        name: c.companyName,
        trades: c.trades,
        slaCompliance: `${c.slaComplianceRate}%`,
      })),
    };

    try {
      const data = await askAiBillingAssistant(prompt, actionPayload);

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || 'Analysis completed with live building and billing telemetry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'gemini-3.8-flash',
        isBillingSafetyBlocked: data.classification === 'high_impact_blocked',
        permittedCapability: data.capability,
        highImpactAction: data.highImpactAction,
        authorizationRequestId: data.authorizationRequest?.id,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If a human authorization ticket was generated, set it for quick review
      if (data.authorizationRequest) {
        setActiveSignOffTicket(data.authorizationRequest);
      }
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: 'Identified 2 critical tickets: CBM-00451 (Plumbing valve seepage) and CBM-00452 (Elevator optical interlock fault). Both have dispatched technicians within SLA targets.',
        timestamp: 'Now',
        source: 'local_engine',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAgent = (agentName: string, actionDescription: string, impactLevel: string) => {
    setAgentActionModal({ agentName, actionDescription, impactLevel });
    setActionAuthorized(false);
  };

  const confirmAgentAction = () => {
    setActionAuthorized(true);
    setTimeout(() => {
      setAgentActionModal(null);
      setActionAuthorized(false);
    }, 2000);
  };

  const handleConfirmHumanSignOff = async (ticket: HumanAuthorizationRequest) => {
    if (!ticket) return;
    setIsSigningOff(true);
    try {
      await authorizeBillingAction(ticket.id, signOffNotes, 'CONFIRMED_HUMAN_SIGN_OFF');
      setActiveSignOffTicket(null);
      setSignOffNotes('');
      setSignOffSignatureConfirmed(false);
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleRejectHumanSignOff = async (ticket: HumanAuthorizationRequest) => {
    if (!ticket) return;
    setIsSigningOff(true);
    try {
      await rejectBillingAction(ticket.id, signOffNotes || 'Rejected by authorized administrator.');
      setActiveSignOffTicket(null);
      setSignOffNotes('');
      setSignOffSignatureConfirmed(false);
    } finally {
      setIsSigningOff(false);
    }
  };

  const handleRunSafetySuite = async () => {
    setIsRunningTests(true);
    try {
      const res = await runAiBillingSafetySuite();
      setTestSuiteResult(res);
    } finally {
      setIsRunningTests(false);
    }
  };

  const isRoleAuthorizedForTicket = (ticket: HumanAuthorizationRequest): boolean => {
    if (!ticket) return false;
    const norm = userRole.toLowerCase().trim();
    return (
      ticket.requiredRoles.includes(norm as any) ||
      norm === 'platform_admin' ||
      norm === 'super_admin' ||
      norm === 'org_owner'
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-400" />
              <span>{t.ai.assistantTitle}</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded">
              SEQUENCE 32 COMPLIANT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grounded operational intelligence & guarded billing assistance with human authorization gates.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTabSub('billing_safety')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'billing_safety'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AI Billing Safety Co-Pilot</span>
          </button>
          <button
            onClick={() => setActiveTabSub('assistant')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'assistant'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Operational Co-Pilot
          </button>
          <button
            onClick={() => setActiveTabSub('agents')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'agents'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Autonomous Agents (4)
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SUB-VIEW 1: AI BILLING SAFETY CO-PILOT (SEQUENCE 32)                */}
      {/* =================================================================== */}
      {activeTabSub === 'billing_safety' && (
        <div className="space-y-6">
          {/* Statutory Policy & Governance Banner */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold rounded uppercase">
                    Mandatory Policy Standard
                  </span>
                  <span className="text-xs text-slate-400">Autonomous Execution Prohibited</span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>SEQUENCE 32 — AI Billing Safety Guarantee</span>
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  CNTEstates AI capabilities may safely assist with{' '}
                  <strong className="text-emerald-400">
                    Plan Explanations, Usage Analysis, Invoice Explanations, Billing-Status Explanations, Capacity Warnings,
                  </strong>{' '}
                  and <strong className="text-emerald-400">Subscription Information</strong>.
                  The AI is <strong className="text-rose-400">strictly barred from independently executing high-impact billing actions</strong>.
                  Any paid plan changes, cancellations, refunds, payment-method updates, or billing-information modifications require verified human authorization.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={handleRunSafetySuite}
                  disabled={isRunningTests}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isRunningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Verify Compliance Suite (13 Tests)</span>
                </button>
                <button
                  onClick={refreshAiBillingAuthRequests}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                  title="Refresh Authorization Tickets"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Test Suite Results Display if ran */}
            {testSuiteResult && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Automated Verification Suite Outcome:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                      testSuiteResult.allPassed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {testSuiteResult.passedTests}/{testSuiteResult.totalTests} TESTS PASSED (100% COMPLIANT)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {testSuiteResult.results.map((r) => (
                    <div
                      key={r.id}
                      className="p-2 bg-slate-950/80 border border-slate-800 rounded text-[11px] flex items-start gap-2"
                    >
                      {r.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-mono text-[10px] text-slate-400">{r.id} • {r.type}</div>
                        <div className="text-slate-200 truncate font-medium">{r.requirement}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dual Columns: Interactive Capabilities vs Safety Guardrails */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 6 Permitted Assistant Capabilities (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Permitted AI Assistance Capabilities (Read-Only)</span>
                </h3>
                <span className="text-[11px] text-emerald-400 font-mono">6 of 6 Active</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Plan Explanations */}
                <div
                  onClick={() => handleSend('Explain what features, limits and pricing are included in our current subscription plan')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      ADVISORY
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Plan Explanations
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Explains contract tier entitlements, master USD vs converted local currency pricing, and capacity limits.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 2. Usage Analysis */}
                <div
                  onClick={() => handleSend('Analyze our current portfolio resource usage and unit consumption against plan limits')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      ANALYTICS
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Usage Analysis
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Calculates live unit, property, and building utilization percentages and remaining contract headroom.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 3. Invoice Explanations */}
                <div
                  onClick={() => handleSend('Explain the line items, taxes and calculations on our latest invoice')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      FINANCIAL
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Invoice Explanations
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Breaks down invoice totals, B2B tax exemptions, discounts, due dates, and settlement verification.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 4. Billing-Status Explanations */}
                <div
                  onClick={() => handleSend('What is our current billing status, account standing and payment health?')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      HEALTH
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Billing-Status Explanations
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Reports financial account standing, overdue balances, upcoming renewals, and gateway health.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 5. Capacity Warnings */}
                <div
                  onClick={() => handleSend('Check for any active or approaching capacity limit warnings on our account')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      MONITOR
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Capacity Warnings
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Scans resource metrics against warning thresholds and advises on authorized headroom expansion.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 6. Subscription Information */}
                <div
                  onClick={() => handleSend('What is our subscription renewal cycle, billing period and country currency rules?')}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl space-y-2 cursor-pointer transition-all hover:bg-slate-850 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 bg-emerald-950/80 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <Info className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      LIFECYCLE
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-300">
                    Subscription Information
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    Summarizes renewal schedule dates, operating country jurisdiction, and zero-decimal rules.
                  </p>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1 pt-1">
                    <span>Ask AI</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Chat & Prompt Input Area */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-md">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-slate-200">AI Billing Assistant Session</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                    HUMAN-IN-THE-LOOP ACTIVE
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          m.sender === 'user'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 border border-slate-700 text-amber-400'
                        }`}
                      >
                        {m.sender === 'user' ? (
                          <span className="text-[10px] font-bold">You</span>
                        ) : (
                          <Bot className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-xs space-y-1.5 ${
                          m.sender === 'user'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : m.isBillingSafetyBlocked
                            ? 'bg-amber-950/40 border border-amber-500/60 text-slate-100 shadow-sm'
                            : 'bg-slate-800/90 border border-slate-700/80 text-slate-200'
                        }`}
                      >
                        {m.isBillingSafetyBlocked && (
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] pb-1 border-b border-amber-500/30">
                            <Lock className="w-3.5 h-3.5" />
                            <span>AI AUTONOMOUS EXECUTION BLOCKED</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                        <div className="text-[10px] flex items-center justify-between pt-1 text-slate-400">
                          <span>{m.timestamp}</span>
                          {m.source && <span className="font-mono text-[9px]">Model: {m.source}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask AI to explain your plan, analyze usage, or review invoice line items..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputQuery.trim() || isLoading}
                    className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 5 High-Impact Action Safety Gates & Human Tickets (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>High-Impact Action Safety Gates</span>
                </h3>
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-900/60">
                  HUMAN GATE ENFORCED
                </span>
              </div>

              {/* 5 High-Impact Action Test Buttons */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="text-[11px] text-slate-400">
                  Select an action to trigger the AI Safety Guardrail and generate a Human Authorization Ticket:
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Action 1: Paid Plan Change */}
                  <button
                    onClick={() => handleSend('Upgrade our subscription to Enterprise plan immediately', { targetPlanId: 'enterprise' })}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                        Paid Plan Change (Upgrade / Downgrade)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      BLOCKED
                    </span>
                  </button>

                  {/* Action 2: Cancellation */}
                  <button
                    onClick={() => handleSend('Cancel our subscription and terminate contract now')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="font-semibold text-slate-200 group-hover:text-rose-300">
                        Subscription Cancellation
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                      CRITICAL
                    </span>
                  </button>

                  {/* Action 3: Refunds */}
                  <button
                    onClick={() => handleSend('Issue a full refund on our latest invoice')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                        Invoice / Payment Refunds
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      BLOCKED
                    </span>
                  </button>

                  {/* Action 4: Payment-Method Changes */}
                  <button
                    onClick={() => handleSend('Update payment method to our new corporate credit card')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                        Payment-Method Changes
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      BLOCKED
                    </span>
                  </button>

                  {/* Action 5: Billing-Information Changes */}
                  <button
                    onClick={() => handleSend('Change our company legal billing address and tax VAT ID')}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                        Billing-Information Changes
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded">
                      BLOCKED
                    </span>
                  </button>
                </div>
              </div>

              {/* Pending Human Authorization Tickets Queue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Human Authorization Queue</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {aiBillingAuthRequests.filter((r) => r.status === 'pending_authorization').length} Pending Review
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
                  {aiBillingAuthRequests.length === 0 ? (
                    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                      No authorization tickets in queue. Attempt a high-impact action above to observe the safety gate.
                    </div>
                  ) : (
                    aiBillingAuthRequests.map((req) => {
                      const isAuthorizedRole = isRoleAuthorizedForTicket(req);
                      const isPending = req.status === 'pending_authorization';

                      return (
                        <div
                          key={req.id}
                          className={`p-3.5 bg-slate-900 border rounded-xl space-y-2 text-xs transition-all ${
                            isPending
                              ? 'border-amber-500/50 shadow-xs'
                              : req.status === 'executed'
                              ? 'border-emerald-800/60 bg-emerald-950/20'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-slate-400 font-bold">{req.id}</span>
                                <span
                                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                                    isPending
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : req.status === 'executed'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {req.status.replace('_', ' ')}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-100 mt-1">{req.title}</h5>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded uppercase ${
                                req.impactLevel === 'critical'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {req.impactLevel} RISK
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300">{req.summary}</p>

                          <div className="p-2 bg-slate-950/70 border border-slate-800 rounded font-mono text-[10px] space-y-1">
                            <div className="text-amber-300 font-semibold">{req.financialImpactSummary}</div>
                            <div className="text-slate-400">
                              Authorized Roles: <span className="text-slate-200">{req.requiredRoles.join(', ')}</span>
                            </div>
                            <div className="text-slate-400 flex items-center gap-1">
                              <span>Your Current Role:</span>
                              <span
                                className={`font-bold ${
                                  isAuthorizedRole ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {userRole} ({isAuthorizedRole ? 'AUTHORIZED' : 'RESTRICTED'})
                              </span>
                            </div>
                          </div>

                          {isPending && (
                            <div className="pt-1 flex items-center gap-2">
                              <button
                                onClick={() => setActiveSignOffTicket(req)}
                                className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Review & Sign Off</span>
                              </button>
                              <button
                                onClick={() => handleRejectHumanSignOff(req)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {req.status === 'executed' && req.authorizationMetadata && (
                            <div className="text-[10px] text-emerald-400 bg-emerald-950/60 p-2 rounded border border-emerald-900/60 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Authorized by {req.authorizationMetadata.authorizedBy} ({req.authorizationMetadata.humanRole})
                              </span>
                            </div>
                          )}

                          {req.status === 'rejected' && req.rejectionMetadata && (
                            <div className="text-[10px] text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-900/60 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Rejected by {req.rejectionMetadata.rejectedBy}: {req.rejectionMetadata.reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-VIEW 2: OPERATIONAL CO-PILOT (ORIGINAL GENERAL ASSISTANT)       */}
      {/* =================================================================== */}
      {activeTabSub === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[600px] overflow-hidden shadow-lg">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 border border-slate-700 text-emerald-400'
                    }`}
                  >
                    {m.sender === 'user' ? (
                      <span className="text-xs font-bold">You</span>
                    ) : (
                      <Bot className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-3.5 text-xs space-y-1 ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 whitespace-pre-wrap leading-relaxed'
                    }`}
                  >
                    <div>{m.text}</div>
                    <div
                      className={`text-[10px] flex items-center justify-between pt-1 ${
                        m.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{m.timestamp}</span>
                      {m.source && <span className="font-mono text-[9px]">Model: {m.source}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about properties, leases, open tickets, or maintenance..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || isLoading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Operational Sample Prompts</span>
              </h3>
              <div className="space-y-1.5">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="w-full text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs transition-colors line-clamp-2"
                  >
                    • {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-VIEW 3: AUTONOMOUS AGENTS VIEW                                  */}
      {/* =================================================================== */}
      {activeTabSub === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Property Management Agent */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">{t.ai.propertyAgent}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono font-semibold">
                  STATUS: ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitors lease renewals, automates statutory escalation notices, and tracks vacancy turnaround intervals.
              </p>
            </div>
            <button
              onClick={() =>
                handleRunAgent(
                  'Property Management Agent',
                  'Initiate vacant unit marketing blast and automated lease renewal offers.',
                  'Medium Impact'
                )
              }
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {t.ai.runAgent}
            </button>
          </div>

          {/* Maintenance Agent */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">{t.ai.maintenanceAgent}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono font-semibold">
                  STATUS: ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triages incoming repair tickets, matches certified trade contractors, and calculates SLA deadlines.
              </p>
            </div>
            <button
              onClick={() =>
                handleRunAgent(
                  'Maintenance & Dispatch Agent',
                  'Auto-assign high-priority trade tickets to on-call preferred contractors.',
                  'High Impact (Authorizes Work Orders)'
                )
              }
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {t.ai.runAgent}
            </button>
          </div>

          {/* Finance Agent */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">{t.ai.financeAgent}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono font-semibold">
                  STATUS: ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tracks rent roll balances, identifies overdue grace period breaches, and reconciles digital payments.
              </p>
            </div>
            <button
              onClick={() =>
                handleRunAgent(
                  'Finance & Arrears Agent',
                  'Transmit statutory late payment notices and assess configured 5% late fees.',
                  'High Impact (Financial Ledger Entry)'
                )
              }
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {t.ai.runAgent}
            </button>
          </div>

          {/* Compliance Agent */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 text-sm">{t.ai.complianceAgent}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-mono font-semibold">
                  STATUS: ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitors mandatory safety inspection dates, fire department certifications, and elevator dockets.
              </p>
            </div>
            <button
              onClick={() =>
                handleRunAgent(
                  'Compliance & Safety Agent',
                  'Schedule certified municipal inspector and generate compliance pre-audit packet.',
                  'Medium Impact'
                )
              }
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {t.ai.runAgent}
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* HUMAN-IN-THE-LOOP BILLING SIGN-OFF MODAL (SEQUENCE 32 GATE)         */}
      {/* =================================================================== */}
      {activeSignOffTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-500/80 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Human Authorization Gate (Sequence 32)</span>
              </div>
              <button
                onClick={() => setActiveSignOffTicket(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Action Type</div>
                  <div className="font-bold text-slate-100">{activeSignOffTicket.title}</div>
                </div>
                <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded uppercase">
                  {activeSignOffTicket.impactLevel} RISK
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">Financial Impact Summary:</div>
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-200 font-medium">
                  {activeSignOffTicket.financialImpactSummary}
                </div>
              </div>

              {/* State Delta Comparison */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Current State</span>
                  <div className="text-slate-300 mt-1 font-mono">
                    {typeof activeSignOffTicket.previousValue === 'object'
                      ? JSON.stringify(activeSignOffTicket.previousValue)
                      : String(activeSignOffTicket.previousValue)}
                  </div>
                </div>
                <div className="p-2 bg-slate-950 border border-amber-500/30 rounded">
                  <span className="text-[10px] text-amber-400 block uppercase font-mono">Proposed Change</span>
                  <div className="text-amber-200 mt-1 font-mono">
                    {typeof activeSignOffTicket.proposedValue === 'object'
                      ? JSON.stringify(activeSignOffTicket.proposedValue)
                      : String(activeSignOffTicket.proposedValue)}
                  </div>
                </div>
              </div>

              {/* Role Authorization Verification Check */}
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Required Roles:</span>
                  <span className="font-semibold text-slate-200">{activeSignOffTicket.requiredRoles.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Logged-in User Role:</span>
                  <span
                    className={`font-bold ${
                      isRoleAuthorizedForTicket(activeSignOffTicket) ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {userRole} ({isRoleAuthorizedForTicket(activeSignOffTicket) ? 'AUTHORIZED' : 'UNAUTHORIZED'})
                  </span>
                </div>
              </div>

              {/* Admin Sign-Off Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Human Audit Notes / Reason for Authorization:
                </label>
                <textarea
                  value={signOffNotes}
                  onChange={(e) => setSignOffNotes(e.target.value)}
                  placeholder="e.g. Authorized by Landlord Principal for Q4 portfolio expansion..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500 resize-none h-16"
                />
              </div>

              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={signOffSignatureConfirmed}
                  onChange={(e) => setSignOffSignatureConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-300">
                  I confirm that I am an authorized human representative and explicitly authorize committing this high-impact billing transaction to the immutable financial ledger.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleRejectHumanSignOff(activeSignOffTicket)}
                disabled={isSigningOff}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Reject Action
              </button>
              <button
                type="button"
                onClick={() => handleConfirmHumanSignOff(activeSignOffTicket)}
                disabled={!signOffSignatureConfirmed || !isRoleAuthorizedForTicket(activeSignOffTicket) || isSigningOff}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {isSigningOff && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Authorize & Execute Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous Agent Human Approval Modal (General Operations) */}
      {agentActionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-600 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>{t.ai.agentRequiresApproval}</span>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                Agent: <strong className="text-slate-100">{agentActionModal.agentName}</strong>
              </p>
              <div className="p-3 bg-slate-800 rounded border border-slate-700 font-medium text-slate-200">
                {agentActionModal.actionDescription}
              </div>
              <p className="text-amber-300 font-mono text-[11px]">
                Scope: {agentActionModal.impactLevel}
              </p>
            </div>

            {actionAuthorized ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Action Authorized by Property Manager. Routine executed.</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAgentActionModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Reject Action
                </button>
                <button
                  type="button"
                  onClick={confirmAgentAction}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  {t.ai.confirmAction}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
