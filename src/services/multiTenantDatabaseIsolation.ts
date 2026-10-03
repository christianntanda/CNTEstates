/**
 * SEQUENCE 27 — DATABASE LEVEL MULTI-TENANT ISOLATION
 * 
 * Provides an authoritative database abstraction layer ensuring that
 * no low-level query, store accessor, or repository method ever returns
 * cross-tenant records.
 * 
 * All queries require an explicit organization context (`orgId`).
 */

import {
  CustomerSubscription,
  SubscriptionInvoice,
  SubscriptionHistoryRecord,
  Organization,
  CapacityUsage,
} from '../types';
import { initialOrganizations, subscriptionPlans } from '../data/mockDatabase';
import { getInvoicesForOrganization, getInvoiceById as rawGetInvoiceById } from './invoiceEngine';
import { getSubscriptionHistory as rawGetSubscriptionHistory } from './subscriptionHistoryEngine';
import { calculateCapacityUsage } from './capacityEngine';
import { assertTenantAccess, TenantSecurityContext } from './multiTenantSecurityService';

export class TenantDatabaseIsolationError extends Error {
  public readonly code = 'DB_TENANT_ISOLATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'TenantDatabaseIsolationError';
  }
}

export const tenantIsolatedDatabase = {
  /**
   * 1. SUBSCRIPTION: Retrieves active subscription strictly scoped to caller's org.
   */
  getSubscription(context: TenantSecurityContext, targetOrgId: string): CustomerSubscription | null {
    assertTenantAccess(context, targetOrgId, 'subscription', 'db_get_subscription', 'database');
    const org = initialOrganizations.find((o) => o.id === targetOrgId);
    return org?.subscriptionRecord || null;
  },

  /**
   * 2. PLAN: Retrieves plan information strictly scoped to caller's org.
   */
  getPlan(context: TenantSecurityContext, targetOrgId: string) {
    assertTenantAccess(context, targetOrgId, 'plan', 'db_get_plan', 'database');
    const org = initialOrganizations.find((o) => o.id === targetOrgId);
    if (!org) return null;
    const plan = subscriptionPlans.find((p) => p.id === org.planId);
    return {
      organizationId: org.id,
      organizationName: org.name,
      planId: org.planId,
      plan,
      monthlySpend: org.monthlySpend,
      currency: org.billingCurrency || org.currency,
      renewalDate: org.renewalDate,
    };
  },

  /**
   * 3. INVOICES: Retrieves invoice list strictly filtered by targetOrgId.
   */
  getInvoices(context: TenantSecurityContext, targetOrgId: string): SubscriptionInvoice[] {
    assertTenantAccess(context, targetOrgId, 'invoice', 'db_get_invoices', 'database');
    return getInvoicesForOrganization(targetOrgId);
  },

  /**
   * 3b. INVOICE BY ID: Retrieves a specific invoice only if it belongs to targetOrgId.
   */
  getInvoiceById(
    context: TenantSecurityContext,
    targetOrgId: string,
    invoiceId: string
  ): SubscriptionInvoice | null {
    assertTenantAccess(context, targetOrgId, 'invoice', 'db_get_invoice_by_id', 'database');
    const invoice = rawGetInvoiceById(invoiceId);
    if (!invoice) return null;
    if (invoice.organization_id !== targetOrgId) {
      assertTenantAccess(context, invoice.organization_id, 'invoice', 'db_verify_invoice_owner', 'database');
    }
    return invoice;
  },

  /**
   * 4. PAYMENTS: Retrieves payment records strictly for targetOrgId.
   */
  getPayments(context: TenantSecurityContext, targetOrgId: string) {
    assertTenantAccess(context, targetOrgId, 'payment', 'db_get_payments', 'database');
    const invoices = getInvoicesForOrganization(targetOrgId);
    return invoices
      .filter((inv) => inv.amount_paid > 0)
      .map((inv) => ({
        invoiceId: inv.invoice_id,
        invoiceNumber: inv.invoice_number,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        paymentStatus: inv.payment_status,
        paymentMethod: inv.payment_method,
        paidAt: inv.updated_at,
      }));
  },

  /**
   * 5. BILLING HISTORY: Retrieves historical receipts strictly for targetOrgId.
   */
  getBillingHistory(context: TenantSecurityContext, targetOrgId: string): SubscriptionInvoice[] {
    assertTenantAccess(context, targetOrgId, 'billing_history', 'db_get_billing_history', 'database');
    const org = initialOrganizations.find((o) => o.id === targetOrgId);
    return (org?.subscriptionInvoices || []).filter((inv) => inv.organization_id === targetOrgId);
  },

  /**
   * 6. USAGE: Calculates capacity usage strictly for targetOrgId.
   */
  getUsage(
    context: TenantSecurityContext,
    targetOrgId: string,
    properties: any[] = [],
    units: any[] = []
  ): CapacityUsage {
    assertTenantAccess(context, targetOrgId, 'usage', 'db_get_usage', 'database');
    const org = initialOrganizations.find((o) => o.id === targetOrgId);
    const planId = org?.planId || 'free';
    const orgProperties = properties.filter((p) => p.organizationId === targetOrgId);
    const orgUnits = units.filter((u) => {
      const prop = orgProperties.find((p) => p.id === u.propertyId);
      return Boolean(prop);
    });

    return calculateCapacityUsage({
      organizationId: targetOrgId,
      planId,
      properties: orgProperties,
      units: orgUnits,
    });
  },

  /**
   * 7. SUBSCRIPTION HISTORY: Retrieves immutable provenance history strictly for targetOrgId.
   */
  getSubscriptionHistory(
    context: TenantSecurityContext,
    targetOrgId: string
  ): SubscriptionHistoryRecord[] {
    assertTenantAccess(context, targetOrgId, 'subscription_history', 'db_get_subscription_history', 'database');
    return rawGetSubscriptionHistory({ organizationId: targetOrgId });
  },
};
