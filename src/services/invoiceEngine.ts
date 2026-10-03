/**
 * SEQUENCE 14 — AUTHORITATIVE INVOICE ENGINE
 * 
 * Implements the enterprise-grade invoice lifecycle management system.
 * 
 * MANDATORY INVOICE FIELDS (All 20 Supported):
 * 1.  invoice_id           (Primary Key)
 * 2.  organization_id      (Foreign Key to Customer Organization)
 * 3.  subscription_id      (Foreign Key to Customer Subscription)
 * 4.  invoice_number       (Human-readable formatted document number)
 * 5.  invoice_date         (Issuance Date)
 * 6.  billing_period       (Cadence: monthly, quarterly, annual, custom)
 * 7.  due_date             (Payment Due Date)
 * 8.  currency             (Billing Currency Code: USD, ZAR, EUR, GBP)
 * 9.  subtotal             (Net Pre-tax Amount)
 * 10. tax                  (Jurisdiction Tax / VAT Amount)
 * 11. discount             (Promotional / Proration Credit Applied)
 * 12. total                (Authoritative Final Total = subtotal - discount + tax)
 * 13. amount_paid          (Cumulative Settled Amount)
 * 14. amount_due           (Outstanding Balance = total - amount_paid)
 * 15. payment_status       (unpaid, paid, partially_paid, failed, refunded, waived)
 * 16. invoice_status       (draft, open, paid, partially_paid, past_due, void, uncollectible, cancelled)
 * 17. payment_method       (Payment Token, Card Brand + Last 4, Corporate Terms)
 * 18. external_invoice_id  (Gateway Identifier: Stripe, QuickBooks, NetSuite)
 * 19. created_at           (Immutable ISO Creation Timestamp)
 * 20. updated_at           (ISO Last Modified Timestamp)
 * 
 * CORE ARCHITECTURAL INVARIANTS:
 * • Immutability Guarantee: Historical invoices (paid, void, cancelled, uncollectible)
 *   are strictly immutable. Any attempt to modify amounts, dates, or items is rejected.
 * • Mathematical Precision: total = subtotal - discount + tax, amount_due = max(0, total - amount_paid).
 * • Zero-Decimal Compliance for non-USD regional billing currencies where applicable.
 */

import {
  SubscriptionInvoice,
  InvoiceStatus,
  InvoicePaymentStatus,
  BillingPeriod,
  CustomBillingSchedule,
  InvoiceLineItem,
} from '../types';
import { formatSubscriptionPrice } from './currencyService';

/**
 * Valid state transitions for the invoice lifecycle.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['open', 'void', 'cancelled'],
  open: ['paid', 'partially_paid', 'past_due', 'void', 'uncollectible', 'cancelled'],
  partially_paid: ['paid', 'past_due', 'uncollectible', 'void'],
  past_due: ['paid', 'partially_paid', 'uncollectible', 'void', 'cancelled'],
  paid: [], // Terminal / Immutable
  void: [], // Terminal / Immutable
  uncollectible: [], // Terminal / Immutable
  cancelled: [], // Terminal / Immutable
};

/**
 * All 8 required status descriptors with UI metadata.
 */
export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; description: string; badgeClass: string; isTerminal: boolean }
> = {
  draft: {
    label: 'Draft',
    description: 'Pending finalization. Line items and amounts may still be adjusted.',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    isTerminal: false,
  },
  open: {
    label: 'Open',
    description: 'Finalized and issued to customer. Awaiting payment.',
    badgeClass: 'bg-sky-950 text-sky-400 border-sky-800',
    isTerminal: false,
  },
  paid: {
    label: 'Paid',
    description: 'Payment fully settled. Document is permanently locked and immutable.',
    badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    isTerminal: true,
  },
  partially_paid: {
    label: 'Partially Paid',
    description: 'Partial remittance received. Remaining balance remains due.',
    badgeClass: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    isTerminal: false,
  },
  past_due: {
    label: 'Past Due',
    description: 'Payment due date has elapsed without complete settlement.',
    badgeClass: 'bg-amber-950 text-amber-400 border-amber-800',
    isTerminal: false,
  },
  void: {
    label: 'Void',
    description: 'Invoice cancelled as invalid or erroneous. Permanently immutable.',
    badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-700',
    isTerminal: true,
  },
  uncollectible: {
    label: 'Uncollectible',
    description: 'Bad debt write-off. Document is permanently locked and immutable.',
    badgeClass: 'bg-rose-950 text-rose-400 border-rose-800',
    isTerminal: true,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Commercial transaction revoked before fulfillment. Permanently immutable.',
    badgeClass: 'bg-red-950 text-red-400 border-red-800',
    isTerminal: true,
  },
};

/**
 * Checks whether an invoice is immutable.
 * Historical invoices (paid, void, uncollectible, cancelled) must never be mutated.
 */
export function isInvoiceImmutable(invoice: SubscriptionInvoice): boolean {
  if (invoice.immutable === true) return true;
  const terminalStatuses: InvoiceStatus[] = ['paid', 'void', 'uncollectible', 'cancelled'];
  return terminalStatuses.includes(invoice.invoice_status);
}

/**
 * Generates an authoritative unique invoice number.
 * Format: CNTE-INV-YYYY-MM-XXXX
 */
export function generateInvoiceNumber(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CNTE-INV-${year}-${month}-${randomSuffix}`;
}

/**
 * Authoritatively calculates invoice financial totals with mathematical guarantees.
 */
export function calculateInvoiceTotals(params: {
  subtotal: number;
  taxRatePercent?: number;
  fixedTax?: number;
  discount?: number;
  amountPaid?: number;
}): {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
} {
  const subtotal = Math.max(0, Math.round(params.subtotal * 100) / 100);
  const discount = Math.max(0, Math.round((params.discount ?? 0) * 100) / 100);
  const taxableBase = Math.max(0, subtotal - discount);

  let tax = 0;
  if (params.fixedTax !== undefined) {
    tax = Math.max(0, Math.round(params.fixedTax * 100) / 100);
  } else if (params.taxRatePercent !== undefined && params.taxRatePercent > 0) {
    tax = Math.round((taxableBase * params.taxRatePercent) / 100);
  }

  const total = Math.max(0, Math.round((taxableBase + tax) * 100) / 100);
  const amountPaid = Math.max(0, Math.min(total, Math.round((params.amountPaid ?? 0) * 100) / 100));
  const amountDue = Math.max(0, Math.round((total - amountPaid) * 100) / 100);

  return {
    subtotal,
    tax,
    discount,
    total,
    amountPaid,
    amountDue,
  };
}

/**
 * Normalizes any raw invoice object into a full Sequence 14 compliant SubscriptionInvoice
 * ensuring all 20 required properties are populated with mathematical integrity.
 */
export function normalizeInvoiceRecord(raw: Partial<SubscriptionInvoice> & Record<string, any>): SubscriptionInvoice {
  const nowIso = new Date().toISOString();
  const today = nowIso.split('T')[0];

  const invoiceId = raw.invoice_id || raw.id || `inv-${raw.organization_id || 'org1'}-${Date.now()}`;
  const invoiceNumber = raw.invoice_number || generateInvoiceNumber(raw.invoice_date || raw.billing_date || today);
  const orgId = raw.organization_id || 'org-1';
  const subId = raw.subscription_id || `sub-${orgId}-default`;
  const invoiceDate = raw.invoice_date || raw.billing_date || today;
  const billingPeriod: BillingPeriod = raw.billing_period || 'monthly';

  // Calculate default due date (14 days after invoice date if not specified)
  let dueDate = raw.due_date;
  if (!dueDate) {
    const d = new Date(invoiceDate);
    d.setDate(d.getDate() + 14);
    dueDate = d.toISOString().split('T')[0];
  }

  const currency = raw.currency || raw.billing_currency || 'USD';

  // Derive initial status
  let invoiceStatus: InvoiceStatus = raw.invoice_status || 'open';
  if (!raw.invoice_status && raw.status) {
    if (raw.status === 'paid') invoiceStatus = 'paid';
    else if (raw.status === 'failed') invoiceStatus = 'past_due';
    else if (raw.status === 'pending') invoiceStatus = 'open';
  }

  // Calculate figures
  const rawSubtotal = raw.subtotal !== undefined
    ? Number(raw.subtotal)
    : (raw.billed_amount !== undefined ? Number(raw.billed_amount) : (raw.total !== undefined ? Number(raw.total) : 0));
  const rawDiscount = Number(raw.discount || 0);
  const rawTax = Number(raw.tax || 0);

  const totals = calculateInvoiceTotals({
    subtotal: rawSubtotal,
    fixedTax: rawTax,
    discount: rawDiscount,
    amountPaid: raw.amount_paid !== undefined
      ? Number(raw.amount_paid)
      : (invoiceStatus === 'paid' ? rawSubtotal - rawDiscount + rawTax : 0),
  });

  // Reconcile payment status
  let paymentStatus: InvoicePaymentStatus = raw.payment_status || 'unpaid';
  if (totals.amountDue <= 0 && totals.total > 0) {
    paymentStatus = 'paid';
    if (invoiceStatus === 'open' || invoiceStatus === 'partially_paid' || invoiceStatus === 'past_due') {
      invoiceStatus = 'paid';
    }
  } else if (totals.amountPaid > 0 && totals.amountDue > 0) {
    paymentStatus = 'partially_paid';
    if (invoiceStatus === 'open') {
      invoiceStatus = 'partially_paid';
    }
  } else if (totals.total === 0) {
    paymentStatus = 'waived';
    invoiceStatus = 'paid';
  }

  const isTerminal = ['paid', 'void', 'uncollectible', 'cancelled'].includes(invoiceStatus);

  const normalized: SubscriptionInvoice = {
    // 20 Mandatory Sequence 14 Properties
    invoice_id: invoiceId,
    organization_id: orgId,
    subscription_id: subId,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    billing_period: billingPeriod,
    due_date: dueDate,
    currency,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    amount_paid: totals.amountPaid,
    amount_due: totals.amountDue,
    payment_status: paymentStatus,
    invoice_status: invoiceStatus,
    payment_method: raw.payment_method || 'Mastercard •••• 4022',
    external_invoice_id: raw.external_invoice_id || `in_ext_${invoiceId.replace(/[^a-zA-Z0-9]/g, '')}`,
    created_at: raw.created_at || nowIso,
    updated_at: raw.updated_at || nowIso,

    // Presentation & Backward Compatibility Aliases
    id: invoiceId,
    organization_name: raw.organization_name || 'Centurion Realty Holdings Ltd',
    plan_id: raw.plan_id || 'business',
    plan_name: raw.plan_name || 'CNTEstates Business / Plus',
    billing_date: invoiceDate,
    billing_currency: currency,
    billed_amount: totals.total,
    master_price_usd: raw.master_price_usd ?? totals.total,
    exchange_rate: raw.exchange_rate ?? 1.0,
    exchange_rate_source: raw.exchange_rate_source || 'Central Bank Reference Rates',
    status: invoiceStatus,
    custom_schedule: raw.custom_schedule,
    download_url: raw.download_url,
    line_items: raw.line_items || [
      {
        id: `item-${invoiceId}-1`,
        description: `${raw.plan_name || 'CNTEstates Plan'} Subscription (${billingPeriod})`,
        quantity: 1,
        unit_price: totals.subtotal,
        amount: totals.subtotal,
      },
    ],
    notes: raw.notes,
    immutable: raw.immutable ?? isTerminal,
  };

  return normalized;
}

/**
 * In-Memory Authoritative Invoices Repository
 */
let invoicesRepository: SubscriptionInvoice[] = [];

/**
 * Initializes and seeds the in-memory invoices store with authoritative records
 * across all 8 required invoice statuses.
 */
export function seedInvoicesRepository(initialInvoices?: SubscriptionInvoice[]): SubscriptionInvoice[] {
  if (initialInvoices && initialInvoices.length > 0) {
    invoicesRepository = initialInvoices.map((inv) => normalizeInvoiceRecord(inv));
  } else {
    // Standard rich seed covering all 8 statuses
    const sampleInvoices: Partial<SubscriptionInvoice>[] = [
      // 1. PAID (Historical & Immutable)
      {
        invoice_id: 'sinv-101',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-09',
        invoice_date: '2026-09-15',
        due_date: '2026-09-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 3865,
        tax: 580, // 15% VAT
        discount: 0,
        total: 4445,
        amount_paid: 4445,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'Mastercard •••• 4022',
        external_invoice_id: 'in_stripe_1NxQ890Centurion01',
        master_price_usd: 249,
        exchange_rate: 17.85,
        exchange_rate_source: 'International Financial Reference & Central Bank Mid-Market Rates',
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        created_at: '2026-09-15T08:00:00Z',
        updated_at: '2026-09-15T08:05:00Z',
      },
      // 2. PAID (August Prior Period, Immutable)
      {
        invoice_id: 'sinv-102',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-08',
        invoice_date: '2026-08-15',
        due_date: '2026-08-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 3865,
        tax: 580,
        discount: 0,
        total: 4445,
        amount_paid: 4445,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'Mastercard •••• 4022',
        external_invoice_id: 'in_stripe_1NxQ890Centurion02',
        master_price_usd: 249,
        exchange_rate: 17.85,
        exchange_rate_source: 'International Financial Reference & Central Bank Mid-Market Rates',
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        created_at: '2026-08-15T08:00:00Z',
        updated_at: '2026-08-15T08:05:00Z',
      },
      // 3. OPEN (Awaiting Payment)
      {
        invoice_id: 'sinv-103',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-10',
        invoice_date: '2026-10-01',
        due_date: '2026-10-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 4445,
        tax: 667,
        discount: 0,
        total: 5112,
        amount_paid: 0,
        amount_due: 5112,
        payment_status: 'unpaid',
        invoice_status: 'open',
        payment_method: 'Corporate Invoice / Net 15 Terms',
        external_invoice_id: 'in_stripe_1NxQ890Centurion03',
        master_price_usd: 249,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: false,
        created_at: '2026-10-01T08:00:00Z',
        updated_at: '2026-10-01T08:00:00Z',
      },
      // 4. PARTIALLY PAID
      {
        invoice_id: 'sinv-104',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-07-ADJ',
        invoice_date: '2026-07-20',
        due_date: '2026-08-05',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 6000,
        tax: 900,
        discount: 500,
        total: 6400,
        amount_paid: 3200,
        amount_due: 3200,
        payment_status: 'partially_paid',
        invoice_status: 'partially_paid',
        payment_method: 'Bank Wire / EFT Installment',
        external_invoice_id: 'in_wire_part_7701',
        master_price_usd: 350,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: false,
        created_at: '2026-07-20T10:00:00Z',
        updated_at: '2026-07-25T14:00:00Z',
      },
      // 5. PAST DUE
      {
        invoice_id: 'sinv-105',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-06-ADDON',
        invoice_date: '2026-06-01',
        due_date: '2026-06-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 1500,
        tax: 225,
        discount: 0,
        total: 1725,
        amount_paid: 0,
        amount_due: 1725,
        payment_status: 'failed',
        invoice_status: 'past_due',
        payment_method: 'Corporate Credit Card •••• 4022',
        external_invoice_id: 'in_stripe_failed_601',
        master_price_usd: 95,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: false,
        created_at: '2026-06-01T09:00:00Z',
        updated_at: '2026-06-16T00:01:00Z',
      },
      // 6. DRAFT
      {
        invoice_id: 'sinv-106',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-11-DRAFT',
        invoice_date: '2026-11-01',
        due_date: '2026-11-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 4445,
        tax: 667,
        discount: 445, // 10% promo
        total: 4667,
        amount_paid: 0,
        amount_due: 4667,
        payment_status: 'unpaid',
        invoice_status: 'draft',
        payment_method: 'Mastercard •••• 4022',
        external_invoice_id: 'in_draft_pending_11',
        master_price_usd: 249,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: false,
        created_at: '2026-09-28T12:00:00Z',
        updated_at: '2026-09-28T12:00:00Z',
      },
      // 7. VOID (Immutable)
      {
        invoice_id: 'sinv-107',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-05-VOID',
        invoice_date: '2026-05-10',
        due_date: '2026-05-24',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 2000,
        tax: 300,
        discount: 0,
        total: 2300,
        amount_paid: 0,
        amount_due: 0,
        payment_status: 'unpaid',
        invoice_status: 'void',
        payment_method: 'Cancelled Card',
        external_invoice_id: 'in_void_err_501',
        master_price_usd: 120,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        notes: 'Voided due to accidental duplicate billing batch generation.',
        created_at: '2026-05-10T10:00:00Z',
        updated_at: '2026-05-10T11:30:00Z',
      },
      // 8. UNCOLLECTIBLE (Immutable)
      {
        invoice_id: 'sinv-108',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-03-BAD',
        invoice_date: '2026-03-01',
        due_date: '2026-03-15',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 1200,
        tax: 180,
        discount: 0,
        total: 1380,
        amount_paid: 0,
        amount_due: 1380,
        payment_status: 'failed',
        invoice_status: 'uncollectible',
        payment_method: 'Unresponsive ACH Account',
        external_invoice_id: 'in_uncoll_301',
        master_price_usd: 75,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        notes: 'Marked uncollectible after 90 days following commercial audit review.',
        created_at: '2026-03-01T09:00:00Z',
        updated_at: '2026-06-01T15:00:00Z',
      },
      // 9. CANCELLED (Immutable)
      {
        invoice_id: 'sinv-109',
        organization_id: 'org-1',
        organization_name: 'Centurion Realty Holdings Ltd',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-INV-2026-02-CANC',
        invoice_date: '2026-02-14',
        due_date: '2026-02-28',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 2500,
        tax: 375,
        discount: 0,
        total: 2875,
        amount_paid: 0,
        amount_due: 0,
        payment_status: 'unpaid',
        invoice_status: 'cancelled',
        payment_method: 'Cancelled Before Activation',
        external_invoice_id: 'in_canc_201',
        master_price_usd: 150,
        exchange_rate: 17.85,
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        notes: 'Cancelled per customer agreement prior to enterprise service deployment.',
        created_at: '2026-02-14T11:00:00Z',
        updated_at: '2026-02-15T09:00:00Z',
      },
      // ORG-2: Vanguard European Property Partners (Enterprise EUR)
      {
        invoice_id: 'sinv-201',
        organization_id: 'org-2',
        organization_name: 'Vanguard European Property Partners',
        subscription_id: 'sub-org-2-2026',
        invoice_number: 'CNTE-INV-2026-09-EU',
        invoice_date: '2026-09-01',
        due_date: '2026-09-15',
        billing_period: 'monthly',
        currency: 'EUR',
        subtotal: 417,
        tax: 42,
        discount: 0,
        total: 459,
        amount_paid: 459,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'SEPA Direct Debit (Corporate)',
        external_invoice_id: 'in_sepa_vanguard_991',
        master_price_usd: 499,
        exchange_rate: 0.92,
        exchange_rate_source: 'European Central Bank Reference Rate',
        plan_id: 'enterprise',
        plan_name: 'CNTEstates Enterprise',
        immutable: true,
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:05:00Z',
      },
      {
        invoice_id: 'sinv-202',
        organization_id: 'org-2',
        organization_name: 'Vanguard European Property Partners',
        subscription_id: 'sub-org-2-2026',
        invoice_number: 'CNTE-INV-2026-08-EU',
        invoice_date: '2026-08-01',
        due_date: '2026-08-15',
        billing_period: 'monthly',
        currency: 'EUR',
        subtotal: 417,
        tax: 42,
        discount: 0,
        total: 459,
        amount_paid: 459,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'SEPA Direct Debit (Corporate)',
        external_invoice_id: 'in_sepa_vanguard_881',
        master_price_usd: 499,
        exchange_rate: 0.92,
        exchange_rate_source: 'European Central Bank Reference Rate',
        plan_id: 'enterprise',
        plan_name: 'CNTEstates Enterprise',
        immutable: true,
        created_at: '2026-08-01T08:00:00Z',
        updated_at: '2026-08-01T08:05:00Z',
      },
      // ORG-3: Pacific Crest Asset Management (Growth USD)
      {
        invoice_id: 'sinv-301',
        organization_id: 'org-3',
        organization_name: 'Pacific Crest Asset Management',
        subscription_id: 'sub-org-3-2026',
        invoice_number: 'CNTE-INV-2026-09-US',
        invoice_date: '2026-09-10',
        due_date: '2026-09-24',
        billing_period: 'monthly',
        currency: 'USD',
        subtotal: 149,
        tax: 0,
        discount: 0,
        total: 149,
        amount_paid: 149,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'Visa Corporate •••• 9921',
        external_invoice_id: 'in_stripe_pacific_911',
        master_price_usd: 149,
        exchange_rate: 1.0,
        exchange_rate_source: 'Direct USD Base',
        plan_id: 'growth',
        plan_name: 'CNTEstates Growth',
        immutable: true,
        created_at: '2026-09-10T09:00:00Z',
        updated_at: '2026-09-10T09:05:00Z',
      },
      // ORG-4: Table Mountain Commercial Portfolios (Business ZAR)
      {
        invoice_id: 'sinv-401',
        organization_id: 'org-4',
        organization_name: 'Table Mountain Commercial Portfolios',
        subscription_id: 'sub-org-4-2026',
        invoice_number: 'CNTE-INV-2026-09-TM',
        invoice_date: '2026-09-12',
        due_date: '2026-09-26',
        billing_period: 'monthly',
        currency: 'ZAR',
        subtotal: 3865,
        tax: 580,
        discount: 0,
        total: 4445,
        amount_paid: 4445,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'EFT Corporate Wire',
        external_invoice_id: 'in_tm_wire_401',
        master_price_usd: 249,
        exchange_rate: 17.85,
        exchange_rate_source: 'South African Reserve Bank Mid-Market',
        plan_id: 'business',
        plan_name: 'CNTEstates Business / Plus',
        immutable: true,
        created_at: '2026-09-12T07:30:00Z',
        updated_at: '2026-09-12T07:35:00Z',
      },
      // ORG-5: Albion & Thames Residential Estates (Starter GBP)
      {
        invoice_id: 'sinv-501',
        organization_id: 'org-5',
        organization_name: 'Albion & Thames Residential Estates',
        subscription_id: 'sub-org-5-2026',
        invoice_number: 'CNTE-INV-2026-09-UK',
        invoice_date: '2026-09-18',
        due_date: '2026-10-02',
        billing_period: 'monthly',
        currency: 'GBP',
        subtotal: 52,
        tax: 10,
        discount: 0,
        total: 62,
        amount_paid: 62,
        amount_due: 0,
        payment_status: 'paid',
        invoice_status: 'paid',
        payment_method: 'Bacs Direct Debit',
        external_invoice_id: 'in_bacs_albion_501',
        master_price_usd: 79,
        exchange_rate: 0.79,
        exchange_rate_source: 'Bank of England Reference Rate',
        plan_id: 'starter',
        plan_name: 'CNTEstates Starter',
        immutable: true,
        created_at: '2026-09-18T08:00:00Z',
        updated_at: '2026-09-18T08:05:00Z',
      },
      // ORG-6: Horizon Micro Estates (Free USD)
      {
        invoice_id: 'sinv-601',
        organization_id: 'org-6',
        organization_name: 'Horizon Micro Estates',
        subscription_id: 'sub-org-6-free',
        invoice_number: 'CNTE-INV-2024-06-FREE',
        invoice_date: '2024-06-01',
        due_date: '2024-06-01',
        billing_period: 'monthly',
        currency: 'USD',
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        amount_paid: 0,
        amount_due: 0,
        payment_status: 'waived',
        invoice_status: 'paid',
        payment_method: 'No Payment Information Required (Permanent Free Plan)',
        external_invoice_id: 'in_free_permanent_001',
        master_price_usd: 0,
        exchange_rate: 1.0,
        exchange_rate_source: 'Federal Reserve / Direct USD',
        plan_id: 'free',
        plan_name: 'CNTEstates Free',
        immutable: true,
        created_at: '2024-06-01T00:00:00Z',
        updated_at: '2024-06-01T00:00:00Z',
      },
    ];

    invoicesRepository = sampleInvoices.map((inv) => normalizeInvoiceRecord(inv));
  }
  return invoicesRepository;
}

// Auto-seed initially
seedInvoicesRepository();

/**
 * Retrieves all invoices for an organization, with optional status and search filtering.
 */
export function getInvoicesForOrganization(
  organizationId: string,
  filter?: {
    status?: InvoiceStatus | 'all';
    search?: string;
  }
): SubscriptionInvoice[] {
  let list = invoicesRepository.filter(
    (inv) => inv.organization_id === organizationId || organizationId === 'all'
  );

  if (filter?.status && filter.status !== 'all') {
    list = list.filter((inv) => inv.invoice_status === filter.status);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(
      (inv) =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.invoice_id.toLowerCase().includes(q) ||
        inv.external_invoice_id.toLowerCase().includes(q) ||
        (inv.plan_name && inv.plan_name.toLowerCase().includes(q))
    );
  }

  // Sort descending by invoice_date
  return list.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());
}

/**
 * Retrieves a single invoice by its ID.
 */
export function getInvoiceById(invoiceId: string): SubscriptionInvoice | undefined {
  return invoicesRepository.find(
    (inv) => inv.invoice_id === invoiceId || inv.id === invoiceId
  );
}

/**
 * Indexes or updates an invoice in the repository.
 * Strictly enforces immutability policy:
 * If an existing invoice is immutable, field modifications are blocked.
 */
export function saveInvoice(invoice: SubscriptionInvoice): {
  success: boolean;
  invoice?: SubscriptionInvoice;
  error?: string;
} {
  const normalized = normalizeInvoiceRecord(invoice);
  const existingIdx = invoicesRepository.findIndex(
    (inv) => inv.invoice_id === normalized.invoice_id || inv.id === normalized.invoice_id
  );

  if (existingIdx >= 0) {
    const existing = invoicesRepository[existingIdx];
    if (isInvoiceImmutable(existing)) {
      return {
        success: false,
        error: `Immutability policy violation: Invoice ${existing.invoice_number} is locked (${existing.invoice_status.toUpperCase()}) and cannot be edited. Historical invoices are immutable.`,
      };
    }
    invoicesRepository[existingIdx] = {
      ...normalized,
      created_at: existing.created_at, // Preserve original timestamp
      updated_at: new Date().toISOString(),
    };
    return { success: true, invoice: invoicesRepository[existingIdx] };
  }

  invoicesRepository.unshift(normalized);
  return { success: true, invoice: normalized };
}

/**
 * Records a payment against an invoice.
 * Validates that invoice is in an actionable state (open, partially_paid, past_due).
 * Updates amount_paid, amount_due, payment_status, and invoice_status.
 * Automatically marks invoice immutable upon complete settlement.
 */
export function recordInvoicePayment(params: {
  invoiceId: string;
  paymentAmount: number;
  paymentMethod?: string;
  transactionReference?: string;
}): {
  success: boolean;
  invoice?: SubscriptionInvoice;
  error?: string;
} {
  const invoice = getInvoiceById(params.invoiceId);
  if (!invoice) {
    return { success: false, error: `Invoice '${params.invoiceId}' not found.` };
  }

  if (isInvoiceImmutable(invoice)) {
    return {
      success: false,
      error: `Cannot apply payment: Invoice ${invoice.invoice_number} is in immutable status '${invoice.invoice_status}'.`,
    };
  }

  if (invoice.invoice_status === 'draft') {
    return {
      success: false,
      error: `Cannot apply payment to a Draft invoice. Invoice must be finalized to 'open' first.`,
    };
  }

  if (isNaN(Number(params.paymentAmount)) || Number(params.paymentAmount) <= 0) {
    return { success: false, error: 'Payment amount must be a valid positive number.' };
  }

  const paymentAmount = Math.max(0, Math.round(Number(params.paymentAmount) * 100) / 100);

  const newAmountPaid = Math.min(invoice.total, invoice.amount_paid + paymentAmount);
  const newAmountDue = Math.max(0, Math.round((invoice.total - newAmountPaid) * 100) / 100);

  let newInvoiceStatus: InvoiceStatus = invoice.invoice_status;
  let newPaymentStatus: InvoicePaymentStatus = invoice.payment_status;

  if (newAmountDue <= 0) {
    newInvoiceStatus = 'paid';
    newPaymentStatus = 'paid';
  } else {
    newInvoiceStatus = 'partially_paid';
    newPaymentStatus = 'partially_paid';
  }

  const updatedInvoice: SubscriptionInvoice = {
    ...invoice,
    amount_paid: newAmountPaid,
    amount_due: newAmountDue,
    payment_status: newPaymentStatus,
    invoice_status: newInvoiceStatus,
    payment_method: params.paymentMethod || invoice.payment_method,
    updated_at: new Date().toISOString(),
    immutable: newInvoiceStatus === 'paid',
  };

  const idx = invoicesRepository.findIndex((inv) => inv.invoice_id === invoice.invoice_id);
  if (idx >= 0) {
    invoicesRepository[idx] = updatedInvoice;
  }

  return { success: true, invoice: updatedInvoice };
}

/**
 * Transitions the invoice status.
 * Enforces allowed status transitions and blocks illegal mutations on immutable historical records.
 */
export function transitionInvoiceStatus(params: {
  invoiceId: string;
  targetStatus: InvoiceStatus;
  reason?: string;
}): {
  success: boolean;
  invoice?: SubscriptionInvoice;
  error?: string;
} {
  const { invoiceId, targetStatus, reason } = params;
  const invoice = getInvoiceById(invoiceId);

  if (!invoice) {
    return { success: false, error: `Invoice '${invoiceId}' not found.` };
  }

  if (invoice.invoice_status === targetStatus) {
    return { success: true, invoice };
  }

  // Check if current invoice is already in a terminal/immutable state
  if (isInvoiceImmutable(invoice)) {
    return {
      success: false,
      error: `Immutability policy violation: Invoice ${invoice.invoice_number} is locked in '${invoice.invoice_status}' status. Historical invoices are immutable and cannot transition.`,
    };
  }

  // Validate allowed transition
  const allowed = ALLOWED_STATUS_TRANSITIONS[invoice.invoice_status] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      success: false,
      error: `Illegal state transition: Cannot change status from '${invoice.invoice_status}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}].`,
    };
  }

  const nowIso = new Date().toISOString();
  const isNowTerminal = ['paid', 'void', 'uncollectible', 'cancelled'].includes(targetStatus);

  let updatedAmountPaid = invoice.amount_paid;
  let updatedAmountDue = invoice.amount_due;
  let updatedPaymentStatus = invoice.payment_status;

  if (targetStatus === 'paid') {
    updatedAmountPaid = invoice.total;
    updatedAmountDue = 0;
    updatedPaymentStatus = 'paid';
  } else if (targetStatus === 'void' || targetStatus === 'cancelled') {
    updatedAmountDue = 0;
  }

  const updatedInvoice: SubscriptionInvoice = {
    ...invoice,
    invoice_status: targetStatus,
    status: targetStatus,
    payment_status: updatedPaymentStatus,
    amount_paid: updatedAmountPaid,
    amount_due: updatedAmountDue,
    notes: reason ? `${invoice.notes ? invoice.notes + ' | ' : ''}${reason}` : invoice.notes,
    updated_at: nowIso,
    immutable: isNowTerminal,
  };

  const idx = invoicesRepository.findIndex((inv) => inv.invoice_id === invoice.invoice_id);
  if (idx >= 0) {
    invoicesRepository[idx] = updatedInvoice;
  }

  return { success: true, invoice: updatedInvoice };
}
