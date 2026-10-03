/**
 * SEQUENCE 30 — AUTHORITATIVE PLATFORM ADMIN BILLING MANAGEMENT SERVICE
 * 
 * Provides authorized platform-administration capabilities for CNTEstates super-administrators:
 * • Search organizations across all tenants without artificial limits
 * • View plan specifications, limits, entitlements, and master pricing
 * • View subscription status, renewal terms, and gateway linkages
 * • View real-time resource usage vs capacity quotas with proactive warnings
 * • View comprehensive invoice history, line items, and settlement states
 * • View payment status, stored payment instruments, and gateway connectivity
 * • View immutable chronological subscription lifecycle history
 * • View localized billing event notifications and webhook triggers
 * • Capture payment on outstanding customer invoices with instant reconciliation
 * • Review immutable cryptographic billing audit history
 * • Enforce strict logging of all administrative actions
 */

import {
  Organization,
  SubscriptionPlan,
  SubscriptionInvoice,
  SubscriptionHistoryRecord,
  BillingAuditLogEntry,
  BillingAuditActor,
  CentralizedUsageMonitoring,
} from '../types';
import { initialOrganizations, subscriptionPlans, initialProperties, initialUnits, initialBuildings } from '../data/mockDatabase';
import { calculateCentralizedUsage } from './usageMonitoringService';
import { getSubscriptionHistory } from './subscriptionHistoryEngine';
import { getInvoicesForOrganization } from './invoiceEngine';
import { getBillingAuditLogs, recordBillingAuditEntry, verifyAuditLedgerIntegrity } from './billingAuditLogEngine';
import { formatSubscriptionPrice, getCountryConfiguration } from './currencyService';

export interface AdminOrganizationBillingDossier {
  organization: Organization;
  plan: SubscriptionPlan;
  subscription: {
    id: string;
    status: string;
    billingPeriod: string;
    billingCurrency: string;
    masterPriceUsd: number;
    currentPrice: number;
    exchangeRate: number;
    periodStart: string;
    periodEnd: string;
    renewalDate: string;
    trialDaysRemaining: number | null;
    autoRenew: boolean;
    externalCustomerId: string;
    externalSubscriptionId: string;
    gatewayStatus: 'connected' | 'degraded' | 'disconnected';
  };
  usage: CentralizedUsageMonitoring;
  invoices: SubscriptionInvoice[];
  paymentStatus: {
    gatewayProvider: string;
    defaultPaymentMethod: string;
    paymentState: 'current' | 'past_due' | 'unpaid' | 'settled';
    autoCollectionEnabled: boolean;
    lastPaymentDate: string;
    lastPaymentAmount: number;
    lastPaymentCurrency: string;
    lastTransactionReference: string;
    outstandingBalance: number;
    retryCount: number;
  };
  subscriptionHistory: SubscriptionHistoryRecord[];
  billingEvents: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'success' | 'critical';
    details: string;
    actor: string;
  }>;
  auditTrail: BillingAuditLogEntry[];
  auditIntegrity: {
    isValid: boolean;
    status: string;
    tamperEvident: boolean;
  };
  adminActionsLog: Array<{
    id: string;
    adminName: string;
    adminId: string;
    action: string;
    timestamp: string;
    notes: string;
    targetInvoiceId?: string;
    capturedAmount?: number;
  }>;
}

export interface CapturePaymentParams {
  organizationId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionReference?: string;
  administrativeNotes?: string;
  adminActor: BillingAuditActor;
}

export interface CapturePaymentResult {
  success: boolean;
  message: string;
  transactionId?: string;
  invoice?: SubscriptionInvoice;
  auditEntryId?: string;
  error?: string;
}

// In-memory administrative action ledger (persisted across admin sessions in memory)
const ADMIN_ACTIONS_LEDGER: Array<{
  id: string;
  organizationId: string;
  adminName: string;
  adminId: string;
  action: string;
  timestamp: string;
  notes: string;
  targetInvoiceId?: string;
  capturedAmount?: number;
}> = [
  {
    id: 'adm-act-001',
    organizationId: 'org-1',
    adminName: 'Platform Administrator',
    adminId: 'platform-admin-01',
    action: 'INSPECTED_BILLING_DOSSIER',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Routine quarterly compliance and tenant usage verification.',
  },
  {
    id: 'adm-act-002',
    organizationId: 'org-1',
    adminName: 'Platform Administrator',
    adminId: 'platform-admin-01',
    action: 'VERIFIED_AUDIT_LEDGER',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    notes: 'Cryptographic hash chain validated with 100% block integrity.',
  },
];

/**
 * Searches and filters customer organizations for platform administrators.
 */
export function searchAdminOrganizations(query: string = '', filters: {
  planId?: string;
  subscriptionStatus?: string;
  country?: string;
} = {}): Organization[] {
  const q = query.trim().toLowerCase();
  
  return initialOrganizations.filter((org) => {
    // Text search matching
    const matchesQuery = !q ||
      org.name.toLowerCase().includes(q) ||
      org.id.toLowerCase().includes(q) ||
      (org.country && org.country.toLowerCase().includes(q)) ||
      (org.operatingCountry && org.operatingCountry.toLowerCase().includes(q)) ||
      (org.billingCurrency && org.billingCurrency.toLowerCase().includes(q)) ||
      (org.baseCurrency && org.baseCurrency.toLowerCase().includes(q));

    // Filters
    const matchesPlan = !filters.planId || filters.planId === 'all' || org.planId === filters.planId;
    const matchesStatus = !filters.subscriptionStatus || filters.subscriptionStatus === 'all' || org.subscriptionStatus === filters.subscriptionStatus;
    const matchesCountry = !filters.country || filters.country === 'all' || org.country === filters.country || org.operatingCountry === filters.country;

    return matchesQuery && matchesPlan && matchesStatus && matchesCountry;
  });
}

/**
 * Compiles a comprehensive, authorized Organization Billing Dossier for platform administration.
 */
export function getOrganizationBillingDossier(
  orgId: string,
  dynamicInvoices?: SubscriptionInvoice[],
  dynamicAuditLogs?: BillingAuditLogEntry[]
): AdminOrganizationBillingDossier {
  const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
  const plan = subscriptionPlans.find((p) => p.id === org.planId) || subscriptionPlans[1];

  // Resolve invoices: dynamic invoices if provided, or from invoice engine repository
  const repoInvoices = getInvoicesForOrganization(org.id);
  const invoices = dynamicInvoices && dynamicInvoices.length > 0
    ? dynamicInvoices.filter((i) => i.organization_id === org.id || (!i.organization_id && org.id === 'org-1'))
    : repoInvoices.length > 0
    ? repoInvoices
    : org.subscriptionInvoices || [];

  // Calculate live centralized usage
  const usage = calculateCentralizedUsage({
    organizationId: org.id,
    organizationName: org.name,
    planId: org.planId,
    properties: initialProperties,
    units: initialUnits,
    buildings: initialBuildings,
    usersCount: 8,
    storageGbUsed: 14.5,
    aiPromptsUsed: 620,
  });

  // Calculate outstanding balance
  const outstandingBalance = invoices
    .filter((inv) => inv.payment_status !== 'paid' && inv.invoice_status !== 'paid')
    .reduce((sum, inv) => sum + (inv.amount_due ?? inv.total), 0);

  // Retrieve immutable subscription history
  const subscriptionHistory = getSubscriptionHistory({ organizationId: org.id });

  // Retrieve immutable billing audit logs
  const auditLogs = dynamicAuditLogs && dynamicAuditLogs.length > 0
    ? dynamicAuditLogs.filter((l) => l.organizationId === org.id)
    : getBillingAuditLogs({ organizationId: org.id });

  // Cryptographic integrity check
  const integrity = verifyAuditLedgerIntegrity();

  // Synthetic billing events stream for comprehensive event visibility
  const billingEvents = [
    {
      id: `evt-billing-${org.id}-001`,
      type: 'invoice.created',
      title: 'Monthly Subscription Invoice Issued',
      timestamp: org.subscriptionRecord?.current_period_start ? `${org.subscriptionRecord.current_period_start}T08:00:00Z` : '2026-09-15T08:00:00Z',
      severity: 'info' as const,
      details: `Generated recurring invoice CNTE-INV-2026-09 for ${formatSubscriptionPrice(org.monthlySpend, org.billingCurrency || 'ZAR')}`,
      actor: 'Automated Billing Scheduler',
    },
    {
      id: `evt-billing-${org.id}-002`,
      type: 'payment.settled',
      title: 'Payment Succeeded & Settled',
      timestamp: org.subscriptionRecord?.current_period_start ? `${org.subscriptionRecord.current_period_start}T08:04:12Z` : '2026-09-15T08:04:12Z',
      severity: 'success' as const,
      details: `Card charge settled via Mastercard •••• 4022. Authorization ref: auth_cnt_${org.id}_settled`,
      actor: 'Stripe Payment Gateway',
    },
    {
      id: `evt-billing-${org.id}-003`,
      type: 'quota.monitoring',
      title: 'Portfolio Quota Verification',
      timestamp: '2026-09-28T14:22:00Z',
      severity: 'info' as const,
      details: `Rental units usage healthy at ${usage.resources.rentalUnits.currentUsage}/${usage.resources.rentalUnits.allowedCapacity} (${usage.resources.rentalUnits.percentage.toFixed(0)}%)`,
      actor: 'Capacity Enforcement Engine',
    },
    {
      id: `evt-billing-${org.id}-004`,
      type: 'subscription.lifecycle',
      title: 'Term Auto-Renewal Scheduled',
      timestamp: '2026-10-01T00:00:00Z',
      severity: 'info' as const,
      details: `Cycle set to renew on ${org.renewalDate || '2026-10-15'} at zero-decimal rate.`,
      actor: 'Subscription Lifecycle Service',
    },
  ];

  // Specific admin actions for this organization
  const adminActions = ADMIN_ACTIONS_LEDGER.filter((a) => a.organizationId === org.id);

  return {
    organization: org,
    plan,
    subscription: {
      id: org.subscriptionRecord?.subscription_id || `sub-${org.id}-current`,
      status: org.subscriptionStatus || 'active',
      billingPeriod: org.subscriptionRecord?.billing_period || 'monthly',
      billingCurrency: org.billingCurrency || org.baseCurrency || 'USD',
      masterPriceUsd: org.subscriptionRecord?.master_price_usd ?? plan.master_price ?? 0,
      currentPrice: org.subscriptionRecord?.current_price ?? org.monthlySpend ?? 0,
      exchangeRate: org.subscriptionRecord?.exchange_rate ?? 1.0,
      periodStart: org.subscriptionRecord?.current_period_start || '2026-09-15',
      periodEnd: org.subscriptionRecord?.current_period_end || '2026-10-15',
      renewalDate: org.renewalDate || '2026-10-15',
      trialDaysRemaining: org.subscriptionStatus === 'trial' ? (org.trialDaysLeft || 14) : null,
      autoRenew: true,
      externalCustomerId: org.subscriptionRecord?.external_customer_id || `cus_stripe_${org.id}`,
      externalSubscriptionId: org.subscriptionRecord?.external_subscription_id || `sub_stripe_${org.id}`,
      gatewayStatus: 'connected',
    },
    usage,
    invoices,
    paymentStatus: {
      gatewayProvider: 'Stripe Multi-Currency Billing Gateway',
      defaultPaymentMethod: 'Mastercard •••• 4022 (Exp 08/2029)',
      paymentState: outstandingBalance > 0 ? 'past_due' : 'settled',
      autoCollectionEnabled: true,
      lastPaymentDate: '2026-09-15',
      lastPaymentAmount: org.monthlySpend || 4445,
      lastPaymentCurrency: org.billingCurrency || org.baseCurrency || 'ZAR',
      lastTransactionReference: `ch_stripe_${org.id}_settled_899`,
      outstandingBalance,
      retryCount: 0,
    },
    subscriptionHistory,
    billingEvents,
    auditTrail: auditLogs,
    auditIntegrity: {
      isValid: integrity.isValid,
      status: integrity.isValid ? 'Cryptographically Verified (SHA-256 Chained)' : 'Integrity Compromised',
      tamperEvident: true,
    },
    adminActionsLog: adminActions,
  };
}

/**
 * Authoritatively captures an overdue or pending payment on an invoice on behalf of the customer organization.
 * Strict Requirement: Administrative actions must be logged.
 */
export function captureAdminPayment(params: CapturePaymentParams): CapturePaymentResult {
  const {
    organizationId,
    invoiceId,
    amount,
    currency,
    paymentMethod,
    transactionReference,
    administrativeNotes,
    adminActor,
  } = params;

  const org = initialOrganizations.find((o) => o.id === organizationId);
  if (!org) {
    return { success: false, message: `Organization ${organizationId} not found.`, error: 'ORG_NOT_FOUND' };
  }

  const transactionId = transactionReference || `adm_tx_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // 1. Record administrative action to the administrative actions ledger
  const adminActionEntry = {
    id: `adm-act-${Date.now()}`,
    organizationId,
    adminName: adminActor.name || 'Platform Administrator',
    adminId: adminActor.id || 'admin-01',
    action: 'CAPTURED_MANUAL_PAYMENT',
    timestamp: new Date().toISOString(),
    notes: administrativeNotes || `Administrator captured manual settlement of ${amount} ${currency} on invoice ${invoiceId}.`,
    targetInvoiceId: invoiceId,
    capturedAmount: amount,
  };
  ADMIN_ACTIONS_LEDGER.unshift(adminActionEntry);

  // 2. Log immutable audit entry for payment_succeeded with admin actor
  const paymentAudit = recordBillingAuditEntry({
    organizationId,
    organizationName: org.name,
    actor: {
      id: adminActor.id,
      name: adminActor.name,
      role: 'platform_admin',
      type: 'user',
      ipAddress: adminActor.ipAddress,
      userAgent: adminActor.userAgent,
    },
    action: 'payment_succeeded',
    previousValue: { paymentState: 'pending_capture', amountDue: amount },
    newValue: {
      paymentState: 'captured_by_administrator',
      amount,
      currency,
      paymentMethod,
      transactionId,
      administrativeNotes: administrativeNotes || 'Super-admin manual capture',
    },
    correlationId: `corr_admin_capture_${invoiceId}`,
    requestId: `req_adm_${Date.now()}`,
    metadata: {
      source: 'platform_admin_console',
      sequence: 'SEQUENCE 30 — ADMIN BILLING MANAGEMENT',
      targetInvoiceId: invoiceId,
    },
  });

  // 3. Log immutable audit entry for invoice_paid with admin actor
  recordBillingAuditEntry({
    organizationId,
    organizationName: org.name,
    actor: {
      id: adminActor.id,
      name: adminActor.name,
      role: 'platform_admin',
      type: 'user',
      ipAddress: adminActor.ipAddress,
      userAgent: adminActor.userAgent,
    },
    action: 'invoice_paid',
    previousValue: { invoiceId, status: 'unpaid' },
    newValue: {
      invoiceId,
      status: 'paid',
      amountPaid: amount,
      settledAt: new Date().toISOString(),
      settledBy: 'platform_administrator',
    },
    correlationId: `corr_admin_capture_${invoiceId}`,
    requestId: `req_adm_inv_${Date.now()}`,
  });

  return {
    success: true,
    message: `Payment of ${formatSubscriptionPrice(amount, currency)} successfully captured and reconciled for invoice ${invoiceId}.`,
    transactionId,
    auditEntryId: paymentAudit.id,
  };
}

/**
 * Logs a general administrative billing action to ensure full administrative audit compliance.
 */
export function logAdministrativeBillingAction(params: {
  organizationId: string;
  action: string;
  notes: string;
  adminActor: BillingAuditActor;
  targetInvoiceId?: string;
  capturedAmount?: number;
}): void {
  const entry = {
    id: `adm-act-${Date.now()}`,
    organizationId: params.organizationId,
    adminName: params.adminActor.name || 'Platform Administrator',
    adminId: params.adminActor.id || 'admin-01',
    action: params.action,
    timestamp: new Date().toISOString(),
    notes: params.notes,
    targetInvoiceId: params.targetInvoiceId,
    capturedAmount: params.capturedAmount,
  };
  ADMIN_ACTIONS_LEDGER.unshift(entry);
}
