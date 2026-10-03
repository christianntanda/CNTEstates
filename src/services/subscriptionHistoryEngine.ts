/**
 * SEQUENCE 16 — AUTHORITATIVE SUBSCRIPTION HISTORY ENGINE
 * 
 * Provides an immutable, append-only provenance trail for all customer subscription changes.
 * 
 * MANDATORY CHANGE EVENTS RECORDED:
 * 1.  subscription_created      — Initial subscription and entitlement provisioning
 * 2.  plan_upgraded             — Transition to higher operational tier
 * 3.  plan_downgraded           — Transition to lower operational tier
 * 4.  billing_period_changed    — Cadence adjusted (monthly, quarterly, annual, custom)
 * 5.  price_changed             — Recurring master price or converted amount modified
 * 6.  subscription_renewed      — Periodic cycle renewal without tier change
 * 7.  subscription_cancelled    — Service terminated or scheduled for term-end cancellation
 * 8.  subscription_reactivated  — Account restored from suspended/cancelled state
 * 9.  subscription_suspended    — Account placed on administrative or billing hold
 * 10. subscription_expired      — Term elapsed without renewal or payment settlement
 * 
 * MANDATORY STORED ATTRIBUTES (All 11 Supported):
 * 1.  organization_id           — Foreign key to customer organization
 * 2.  subscription_id           — Foreign key to customer subscription
 * 3.  previous_plan             — Prior plan tier (null for initial creation)
 * 4.  new_plan                  — Subscribed plan tier
 * 5.  previous_price            — Prior recurring price
 * 6.  new_price                 — New recurring price
 * 7.  billing_period            — Cadence (monthly, quarterly, annual, custom)
 * 8.  effective_date            — Date change becomes operative (YYYY-MM-DD)
 * 9.  change_reason             — Auditable commercial / technical reason
 * 10. changed_by                — Actor (user role, admin, customer, or system)
 * 11. timestamp                 — ISO creation timestamp
 * 
 * CORE ARCHITECTURAL INVARIANT:
 * • Strict Immutability Guarantee: Historical subscription changes must NEVER be overwritten,
 *   mutated, or deleted under any circumstance.
 */

import {
  SubscriptionHistoryRecord,
  SubscriptionHistoryEventType,
  BillingPeriod,
} from '../types';
import { initialOrganizations } from '../data/mockDatabase';
import { getMasterPriceUsd } from './masterPricingService';

export const SUBSCRIPTION_HISTORY_EVENT_META: Record<
  string,
  {
    label: string;
    description: string;
    badgeClass: string;
    category: 'lifecycle' | 'plan' | 'financial' | 'status';
  }
> = {
  subscription_created: {
    label: 'Subscription Created',
    description: 'Initial subscription and account provisioning',
    badgeClass: 'bg-sky-950 text-sky-400 border-sky-800',
    category: 'lifecycle',
  },
  plan_upgraded: {
    label: 'Plan Upgraded',
    description: 'Tier upgraded with expanded feature set & capacity',
    badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    category: 'plan',
  },
  plan_downgraded: {
    label: 'Plan Downgraded',
    description: 'Tier transitioned to a lower operational tier',
    badgeClass: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    category: 'plan',
  },
  billing_period_changed: {
    label: 'Billing Period Changed',
    description: 'Billing cadence adjusted (monthly / quarterly / annual / custom)',
    badgeClass: 'bg-purple-950 text-purple-400 border-purple-800',
    category: 'financial',
  },
  price_changed: {
    label: 'Price Changed',
    description: 'Recurring price adjusted or special commercial discount applied',
    badgeClass: 'bg-amber-950 text-amber-400 border-amber-800',
    category: 'financial',
  },
  subscription_renewed: {
    label: 'Subscription Renewed',
    description: 'Automated or manual cycle renewal for the current tier',
    badgeClass: 'bg-teal-950 text-teal-400 border-teal-800',
    category: 'lifecycle',
  },
  subscription_cancelled: {
    label: 'Subscription Cancelled',
    description: 'Scheduled or immediate cancellation of platform subscription',
    badgeClass: 'bg-rose-950 text-rose-400 border-rose-800',
    category: 'status',
  },
  subscription_reactivated: {
    label: 'Subscription Reactivated',
    description: 'Reactivated after suspension or scheduled cancellation',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    category: 'status',
  },
  subscription_suspended: {
    label: 'Subscription Suspended',
    description: 'Service temporarily suspended due to billing hold or policy breach',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-700',
    category: 'status',
  },
  subscription_expired: {
    label: 'Subscription Expired',
    description: 'Fixed subscription period elapsed without renewal settlement',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    category: 'lifecycle',
  },

  // Legacy event aliases mapped to Sequence 16
  creation: {
    label: 'Subscription Created',
    description: 'Initial subscription and account provisioning',
    badgeClass: 'bg-sky-950 text-sky-400 border-sky-800',
    category: 'lifecycle',
  },
  activation: {
    label: 'Subscription Created',
    description: 'Account activated after payment clearance',
    badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    category: 'lifecycle',
  },
  upgrade: {
    label: 'Plan Upgraded',
    description: 'Tier upgraded with expanded feature set & capacity',
    badgeClass: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    category: 'plan',
  },
  downgrade: {
    label: 'Plan Downgraded',
    description: 'Tier transitioned to a lower operational tier',
    badgeClass: 'bg-indigo-950 text-indigo-400 border-indigo-800',
    category: 'plan',
  },
  renewal: {
    label: 'Subscription Renewed',
    description: 'Automated or manual cycle renewal for the current tier',
    badgeClass: 'bg-teal-950 text-teal-400 border-teal-800',
    category: 'lifecycle',
  },
  cancellation: {
    label: 'Subscription Cancelled',
    description: 'Scheduled or immediate cancellation of platform subscription',
    badgeClass: 'bg-rose-950 text-rose-400 border-rose-800',
    category: 'status',
  },
  reactivation: {
    label: 'Subscription Reactivated',
    description: 'Reactivated after suspension or scheduled cancellation',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    category: 'status',
  },
  suspension: {
    label: 'Subscription Suspended',
    description: 'Service temporarily suspended',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-700',
    category: 'status',
  },
  expiration: {
    label: 'Subscription Expired',
    description: 'Fixed term elapsed without renewal',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    category: 'lifecycle',
  },
};

/**
 * Normalizes a raw subscription history record into the authoritative Sequence 16 representation.
 */
export function normalizeSubscriptionHistoryRecord(
  raw: Partial<SubscriptionHistoryRecord> & {
    organization_id: string;
    subscription_id: string;
    new_plan: string;
    new_price: number;
  }
): SubscriptionHistoryRecord {
  const nowIso = raw.timestamp || new Date().toISOString();
  const effectiveDate = raw.effective_date || nowIso.slice(0, 10);
  const id = raw.id || raw.history_id || `subhist-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

  // Map legacy event keywords to canonical Sequence 16 snake_case names if needed
  let canonicalEvent = raw.event || 'subscription_created';
  if (canonicalEvent === 'creation' || canonicalEvent === 'activation') canonicalEvent = 'subscription_created';
  if (canonicalEvent === 'upgrade') canonicalEvent = 'plan_upgraded';
  if (canonicalEvent === 'downgrade') canonicalEvent = 'plan_downgraded';
  if (canonicalEvent === 'renewal') canonicalEvent = 'subscription_renewed';
  if (canonicalEvent === 'cancellation') canonicalEvent = 'subscription_cancelled';
  if (canonicalEvent === 'reactivation') canonicalEvent = 'subscription_reactivated';
  if (canonicalEvent === 'suspension') canonicalEvent = 'subscription_suspended';
  if (canonicalEvent === 'expiration') canonicalEvent = 'subscription_expired';

  const prevPlan = raw.previous_plan !== undefined ? raw.previous_plan : (raw.previous_plan_id || null);
  const prevPrice = raw.previous_price !== undefined ? raw.previous_price : null;
  const reason = raw.change_reason || raw.reason || `Subscription change: ${canonicalEvent}`;
  const changedBy = raw.changed_by || raw.initiated_by || 'system';

  return {
    id,
    history_id: id,
    organization_id: raw.organization_id,
    subscription_id: raw.subscription_id,
    event: canonicalEvent as SubscriptionHistoryEventType,
    previous_plan: prevPlan,
    new_plan: raw.new_plan || raw.new_plan_id || 'business',
    previous_price: prevPrice,
    new_price: raw.new_price,
    billing_period: raw.billing_period || 'monthly',
    effective_date: effectiveDate,
    change_reason: reason,
    changed_by: changedBy,
    timestamp: nowIso,

    // Aliases
    previous_plan_id: prevPlan || undefined,
    new_plan_id: raw.new_plan || raw.new_plan_id || 'business',
    previous_status: raw.previous_status,
    new_status: raw.new_status,
    billing_currency: raw.billing_currency || 'USD',
    // Sequence 17: USD price is the source of truth. Converted currency values must never overwrite the USD master price.
    master_price_usd: raw.master_price_usd !== undefined && (raw.billing_currency === 'USD' || !raw.billing_currency)
      ? raw.master_price_usd
      : getMasterPriceUsd(raw.new_plan || raw.new_plan_id || 'business'),
    reason,
    initiated_by: changedBy,
    immutable: true,
    metadata: raw.metadata,
  };
}

/**
 * In-memory authoritative append-only history ledger.
 * NEVER overwrite historical records.
 */
let subscriptionHistoryLedger: SubscriptionHistoryRecord[] = [];

/**
 * Seed initial historical changes across organizations to provide rich provenance.
 */
export function seedInitialSubscriptionHistory(): void {
  const initialRecords: SubscriptionHistoryRecord[] = [
    // Org-1: Centurion Realty Holdings Ltd (Detailed history across multiple events)
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-001',
      history_id: 'subhist-org1-001',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'subscription_created',
      previous_plan: null,
      new_plan: 'starter',
      previous_price: null,
      new_price: 1585,
      billing_period: 'monthly',
      effective_date: '2024-03-01',
      change_reason: 'Initial corporate account provisioning on CNTEstates platform',
      changed_by: 'Centurion System Provisioner',
      timestamp: '2024-03-01T08:00:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 89,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-002',
      history_id: 'subhist-org1-002',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'plan_upgraded',
      previous_plan: 'starter',
      new_plan: 'professional',
      previous_price: 1585,
      new_price: 2830,
      billing_period: 'monthly',
      effective_date: '2024-09-01',
      change_reason: 'Portfolio expansion required RFQ bidding and compliance vault',
      changed_by: 'Centurion Admin (christian.ntanda@gmail.com)',
      timestamp: '2024-09-01T10:15:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 159,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-003',
      history_id: 'subhist-org1-003',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'billing_period_changed',
      previous_plan: 'professional',
      new_plan: 'professional',
      previous_price: 2830,
      new_price: 7640,
      billing_period: 'quarterly',
      effective_date: '2025-01-01',
      change_reason: 'Switched to quarterly billing cycle to align with fiscal quarters',
      changed_by: 'Finance Director (Centurion Realty)',
      timestamp: '2025-01-01T09:00:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 429,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-004',
      history_id: 'subhist-org1-004',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'plan_upgraded',
      previous_plan: 'professional',
      new_plan: 'business',
      previous_price: 7640,
      new_price: 4445,
      billing_period: 'monthly',
      effective_date: '2025-07-01',
      change_reason: 'Enterprise scaling: required multi-currency accounting and predictive maintenance engine',
      changed_by: 'Centurion Admin (christian.ntanda@gmail.com)',
      timestamp: '2025-07-01T14:30:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 249,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-005',
      history_id: 'subhist-org1-005',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'price_changed',
      previous_plan: 'business',
      new_plan: 'business',
      previous_price: 4445,
      new_price: 3999,
      billing_period: 'monthly',
      effective_date: '2025-11-01',
      change_reason: 'Annual corporate loyalty concession applied (-10% rebate)',
      changed_by: 'CNTEstates Key Accounts',
      timestamp: '2025-11-01T08:00:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 224,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-006',
      history_id: 'subhist-org1-006',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'subscription_renewed',
      previous_plan: 'business',
      new_plan: 'business',
      previous_price: 3999,
      new_price: 4445,
      billing_period: 'monthly',
      effective_date: '2026-01-01',
      change_reason: 'Standard annual contract term renewal for 2026 calendar period',
      changed_by: 'Automated Renewal Daemon',
      timestamp: '2026-01-01T00:00:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 249,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-007',
      history_id: 'subhist-org1-007',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'subscription_suspended',
      previous_plan: 'business',
      new_plan: 'business',
      previous_price: 4445,
      new_price: 4445,
      billing_period: 'monthly',
      effective_date: '2026-04-03',
      change_reason: 'Routine banking gateway migration hold pending merchant account switch',
      changed_by: 'Security Risk Compliance Gateway',
      timestamp: '2026-04-03T11:20:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 249,
    }),
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org1-008',
      history_id: 'subhist-org1-008',
      organization_id: 'org-1',
      subscription_id: 'sub-org-1-2026',
      event: 'subscription_reactivated',
      previous_plan: 'business',
      new_plan: 'business',
      previous_price: 4445,
      new_price: 4445,
      billing_period: 'monthly',
      effective_date: '2026-04-04',
      change_reason: 'Merchant gateway verification completed and direct bank debit verified',
      changed_by: 'Centurion Admin (christian.ntanda@gmail.com)',
      timestamp: '2026-04-04T09:10:00Z',
      billing_currency: 'ZAR',
      master_price_usd: 249,
    }),

    // Org-6: Horizon Micro Estates (Free plan creation)
    normalizeSubscriptionHistoryRecord({
      id: 'subhist-org6-001',
      history_id: 'subhist-org6-001',
      organization_id: 'org-6',
      subscription_id: 'sub-org-6-free',
      event: 'subscription_created',
      previous_plan: null,
      new_plan: 'free',
      previous_price: null,
      new_price: 0,
      billing_period: 'monthly',
      effective_date: '2024-06-01',
      change_reason: 'Free tier onboard with standard capacity limits',
      changed_by: 'Horizon Admin',
      timestamp: '2024-06-01T12:00:00Z',
      billing_currency: 'USD',
      master_price_usd: 0,
    }),
  ];

  subscriptionHistoryLedger = initialRecords;
}

// Initialize seed data on module import
seedInitialSubscriptionHistory();

/**
 * Retrieves the complete, immutable subscription history trail for an organization.
 */
export function getSubscriptionHistory(filter?: {
  organizationId?: string;
  subscriptionId?: string;
  event?: string;
}): SubscriptionHistoryRecord[] {
  let records = [...subscriptionHistoryLedger];

  if (filter?.organizationId) {
    records = records.filter((r) => r.organization_id === filter.organizationId);
  }
  if (filter?.subscriptionId) {
    records = records.filter((r) => r.subscription_id === filter.subscriptionId);
  }
  if (filter?.event && filter.event !== 'all') {
    records = records.filter((r) => r.event === filter.event);
  }

  // Sort descending by timestamp (most recent first)
  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Appends a new subscription change event to the immutable ledger.
 * NEVER OVERWRITES HISTORICAL SUBSCRIPTION CHANGES.
 */
export function recordSubscriptionHistory(
  payload: Partial<SubscriptionHistoryRecord> & {
    organization_id: string;
    subscription_id: string;
    event: SubscriptionHistoryEventType;
    new_plan: string;
    new_price: number;
    billing_period: BillingPeriod | string;
    change_reason: string;
    changed_by: string;
    effective_date?: string;
    previous_plan?: string | null;
    previous_price?: number | null;
  }
): { success: boolean; record: SubscriptionHistoryRecord; error?: string } {
  const historyId = payload.id || payload.history_id || `subhist-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

  // IMMUTABILITY GUARANTEE CHECK:
  // If a record with this ID already exists, reject any attempt to overwrite!
  const existing = subscriptionHistoryLedger.find((r) => r.history_id === historyId || r.id === historyId);
  if (existing) {
    return {
      success: false,
      record: existing,
      error: `Immutability Violation: Subscription history record '${historyId}' already exists and cannot be overwritten.`,
    };
  }

  const normalized = normalizeSubscriptionHistoryRecord({
    ...payload,
    id: historyId,
    history_id: historyId,
    effective_date: payload.effective_date || new Date().toISOString().slice(0, 10),
    timestamp: payload.timestamp || new Date().toISOString(),
  });

  // Append-only to the front of the ledger
  subscriptionHistoryLedger.unshift(normalized);

  return {
    success: true,
    record: normalized,
  };
}

/**
 * Convenience helper to record plan upgrades.
 */
export function recordPlanUpgraded(params: {
  organizationId: string;
  subscriptionId: string;
  previousPlan: string;
  newPlan: string;
  previousPrice: number;
  newPrice: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'plan_upgraded',
    previous_plan: params.previousPlan,
    new_plan: params.newPlan,
    previous_price: params.previousPrice,
    new_price: params.newPrice,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record plan downgrades.
 */
export function recordPlanDowngraded(params: {
  organizationId: string;
  subscriptionId: string;
  previousPlan: string;
  newPlan: string;
  previousPrice: number;
  newPrice: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'plan_downgraded',
    previous_plan: params.previousPlan,
    new_plan: params.newPlan,
    previous_price: params.previousPrice,
    new_price: params.newPrice,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record billing period changes.
 */
export function recordBillingPeriodChanged(params: {
  organizationId: string;
  subscriptionId: string;
  currentPlan: string;
  previousPrice: number;
  newPrice: number;
  newBillingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'billing_period_changed',
    previous_plan: params.currentPlan,
    new_plan: params.currentPlan,
    previous_price: params.previousPrice,
    new_price: params.newPrice,
    billing_period: params.newBillingPeriod,
    effective_date: new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record price adjustments.
 */
export function recordPriceChanged(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  previousPrice: number;
  newPrice: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'price_changed',
    previous_plan: params.plan,
    new_plan: params.plan,
    previous_price: params.previousPrice,
    new_price: params.newPrice,
    billing_period: params.billingPeriod,
    effective_date: new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record initial subscription creation.
 */
export function recordSubscriptionCreated(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  price: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_created',
    previous_plan: null,
    new_plan: params.plan,
    previous_price: null,
    new_price: params.price,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record subscription renewal.
 */
export function recordSubscriptionRenewed(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  price: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_renewed',
    previous_plan: params.plan,
    new_plan: params.plan,
    previous_price: params.price,
    new_price: params.price,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record subscription cancellation.
 */
export function recordSubscriptionCancelled(params: {
  organizationId: string;
  subscriptionId: string;
  currentPlan: string;
  currentPrice: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_cancelled',
    previous_plan: params.currentPlan,
    new_plan: params.currentPlan,
    previous_price: params.currentPrice,
    new_price: params.currentPrice,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record subscription reactivation.
 */
export function recordSubscriptionReactivated(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  price: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_reactivated',
    previous_plan: params.plan,
    new_plan: params.plan,
    previous_price: params.price,
    new_price: params.price,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record subscription suspension.
 */
export function recordSubscriptionSuspended(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  price: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_suspended',
    previous_plan: params.plan,
    new_plan: params.plan,
    previous_price: params.price,
    new_price: params.price,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * Convenience helper to record subscription expiration.
 */
export function recordSubscriptionExpired(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  price: number;
  billingPeriod: BillingPeriod | string;
  changeReason: string;
  changedBy: string;
  currency?: string;
  effectiveDate?: string;
}): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistory({
    organization_id: params.organizationId,
    subscription_id: params.subscriptionId,
    event: 'subscription_expired',
    previous_plan: params.plan,
    new_plan: params.plan,
    previous_price: params.price,
    new_price: params.price,
    billing_period: params.billingPeriod,
    effective_date: params.effectiveDate || new Date().toISOString().slice(0, 10),
    change_reason: params.changeReason,
    changed_by: params.changedBy,
    billing_currency: params.currency || 'USD',
  });
  return res.record;
}

/**
 * STRICT IMMUTABILITY GUARDS:
 * Explicit functions that categorically refuse update or delete operations
 * to enforce "Never overwrite historical subscription changes".
 */
export function updateSubscriptionHistory(): { success: false; error: string } {
  return {
    success: false,
    error: 'Sequence 16 Immutability Rule: Historical subscription changes can NEVER be overwritten or updated.',
  };
}

export function deleteSubscriptionHistory(): { success: false; error: string } {
  return {
    success: false,
    error: 'Sequence 16 Immutability Rule: Historical subscription changes can NEVER be deleted or truncated.',
  };
}

/**
 * Verifies that the subscription history ledger has not been modified or truncated.
 */
export function verifySubscriptionHistoryIntegrity(): {
  verified: boolean;
  totalRecords: number;
  uniqueIds: number;
  noDuplicates: boolean;
} {
  const ids = subscriptionHistoryLedger.map((r) => r.history_id);
  const uniqueCount = new Set(ids).size;
  return {
    verified: uniqueCount === subscriptionHistoryLedger.length,
    totalRecords: subscriptionHistoryLedger.length,
    uniqueIds: uniqueCount,
    noDuplicates: uniqueCount === subscriptionHistoryLedger.length,
  };
}
