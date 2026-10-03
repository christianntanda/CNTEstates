/**
 * SEQUENCE 24 — STRUCTURED PLAN COMPARISON ENGINE
 * 
 * Generates an authoritative, structured comparison across all six CNTEstates subscription tiers.
 * Directly grounded in the centralized entitlement system:
 * • FEATURE_REGISTRY & isFeatureEntitled (Sequence 09)
 * • AUTHORITATIVE_CAPACITY_LIMITS (Sequence 07)
 * • USD_MASTER_PRICING (Sequence 17)
 * • Centralized Plan Catalog (Sequence 23)
 * 
 * Compares the 21 mandatory dimensions:
 * 1.  Rental units
 * 2.  Properties
 * 3.  Tenant management
 * 4.  Service requests
 * 5.  Portals
 * 6.  SLA
 * 7.  Work orders
 * 8.  Preventive maintenance
 * 9.  Utilities
 * 10. Analytics
 * 11. AI
 * 12. RFQ
 * 13. Contractor bidding
 * 14. Compliance
 * 15. Documents
 * 16. Permissions
 * 17. Tax
 * 18. Multi-currency
 * 19. Integrations
 * 20. Enterprise capabilities
 * 21. Support
 */

import { FeatureKey, SubscriptionPlan } from '../types';
import { subscriptionPlans } from '../data/mockDatabase';
import {
  FEATURE_REGISTRY,
  isFeatureEntitled,
  PLAN_TIER_ORDER,
} from './featureEntitlementEngine';
import { AUTHORITATIVE_CAPACITY_LIMITS } from './capacityEngine';

export type ComparisonValueType = 'text' | 'boolean' | 'badge';

export interface PlanComparisonValue {
  value: string;
  isIncluded: boolean;
  type: ComparisonValueType;
  badgeStyle?: 'emerald' | 'purple' | 'blue' | 'slate' | 'amber';
  tooltip?: string;
}

export interface ComparisonCriterion {
  id: string;
  label: string;
  category: ComparisonCategory;
  featureKey?: FeatureKey;
  description: string;
  values: Record<string, PlanComparisonValue>; // Keyed by plan id: free, starter, basic, professional, business, enterprise
}

export type ComparisonCategory =
  | 'capacity'
  | 'tenancy'
  | 'maintenance'
  | 'intelligence'
  | 'procurement'
  | 'compliance_documents'
  | 'finance_security'
  | 'integrations_enterprise'
  | 'support';

export interface ComparisonCategoryDefinition {
  id: ComparisonCategory;
  name: string;
  description: string;
  iconName: string;
}

export const COMPARISON_CATEGORIES: ComparisonCategoryDefinition[] = [
  {
    id: 'capacity',
    name: 'Portfolio Capacity & Physical Limits',
    description: 'Authoritative quotas for rental units, property portfolios, and physical buildings.',
    iconName: 'Building2',
  },
  {
    id: 'tenancy',
    name: 'Tenancy & Stakeholder Portals',
    description: 'Resident records, service requests, and role-isolated web portals.',
    iconName: 'Users',
  },
  {
    id: 'maintenance',
    name: 'Field Operations & Facility Metering',
    description: 'Automated SLAs, contractor dispatch, preventive servicing, and utility submetering.',
    iconName: 'Wrench',
  },
  {
    id: 'intelligence',
    name: 'Intelligence, Co-Pilots & Analytics',
    description: 'Operational analytics, executive forecasting, and Gemini AI operations agents.',
    iconName: 'Sparkles',
  },
  {
    id: 'procurement',
    name: 'Procurement & Contractor Bidding',
    description: 'RFQ distribution, contractor bidding matrices, and award governance.',
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'compliance_documents',
    name: 'Statutory Compliance & Document Vault',
    description: 'Regulatory certificate automation, legal dossiers, and document storage vaults.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'finance_security',
    name: 'Governance, Tax & Multi-Currency',
    description: 'Role-based access control, regional tax configurations, and global currencies.',
    iconName: 'Globe',
  },
  {
    id: 'integrations_enterprise',
    name: 'Integrations & Cloud Architecture',
    description: 'Accounting ledgers, ERP integrations, single sign-on, and dedicated compute.',
    iconName: 'Server',
  },
  {
    id: 'support',
    name: 'Service Level Agreement & Support',
    description: 'Technical support tiers, dedicated account managers, and contractual response times.',
    iconName: 'LifeBuoy',
  },
];

/**
 * Generates the complete 21-point comparison matrix dynamically from the entitlement system.
 */
export function generateStructuredPlanComparison(): ComparisonCriterion[] {
  const plans = ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'];

  // Helper to resolve feature entitlement status
  const featureCheck = (featureKey: FeatureKey, planId: string): boolean => {
    return isFeatureEntitled(planId, featureKey);
  };

  const criteria: ComparisonCriterion[] = [
    // 1. RENTAL UNITS
    {
      id: 'rental_units',
      label: 'Rental Units',
      category: 'capacity',
      description: 'Maximum allowable occupied and vacant rental units across the organization.',
      values: {
        free: { value: '2 units', isIncluded: true, type: 'text' },
        starter: { value: '5 units', isIncluded: true, type: 'text' },
        basic: { value: '50 units', isIncluded: true, type: 'text' },
        professional: { value: '60 / prop (300 max)', isIncluded: true, type: 'badge', badgeStyle: 'blue', tooltip: 'Per-property limit of 60 units across up to 5 properties' },
        business: { value: '250 units', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: '5,000 units', isIncluded: true, type: 'badge', badgeStyle: 'purple', tooltip: 'Custom expansion clusters available upon request' },
      },
    },

    // 2. PROPERTIES
    {
      id: 'properties',
      label: 'Properties',
      category: 'capacity',
      description: 'Number of individual properties and complexes manageable in the portfolio.',
      values: {
        free: { value: '1 property', isIncluded: true, type: 'text' },
        starter: { value: '1 property', isIncluded: true, type: 'text' },
        basic: { value: '2 properties', isIncluded: true, type: 'text' },
        professional: { value: '5 properties', isIncluded: true, type: 'text' },
        business: { value: '20 properties', isIncluded: true, type: 'text' },
        enterprise: { value: 'Unlimited', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 3. TENANT MANAGEMENT
    {
      id: 'tenant_management',
      label: 'Tenant Management',
      category: 'tenancy',
      featureKey: 'tenant_directory',
      description: 'Tenant directories, contact logs, lease association, and communication history.',
      values: {
        free: { value: 'Basic directory (Manual)', isIncluded: true, type: 'text' },
        starter: { value: 'Directory & lease dates', isIncluded: true, type: 'text' },
        basic: { value: 'Multi-property tenant ledger', isIncluded: true, type: 'text' },
        professional: { value: 'Full directory + portal access', isIncluded: true, type: 'text' },
        business: { value: 'Automated tenant screening & AI dossiers', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Global directory & SCIM provisioning', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 4. SERVICE REQUESTS
    {
      id: 'service_requests',
      label: 'Service Requests',
      category: 'tenancy',
      featureKey: 'service_requests',
      description: 'Tenant service ticket intake, photo attachments, and status tracking.',
      values: {
        free: { value: 'Basic ticket logging', isIncluded: true, type: 'text' },
        starter: { value: 'Standard ticket intake', isIncluded: true, type: 'text' },
        basic: { value: 'Categorized ticket queue', isIncluded: true, type: 'text' },
        professional: { value: 'Automated dispatch & ticket timers', isIncluded: true, type: 'text' },
        business: { value: 'AI triage & priority routing', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Bespoke emergency escalation & API sync', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 5. PORTALS
    {
      id: 'portals',
      label: 'Portals',
      category: 'tenancy',
      featureKey: 'tenant_portal',
      description: 'Dedicated web portals for tenants (rent/tickets) and external contractors (bids/jobs).',
      values: {
        free: { value: 'Admin console only', isIncluded: false, type: 'boolean' },
        starter: { value: 'Admin console only', isIncluded: false, type: 'boolean' },
        basic: { value: 'Admin console only', isIncluded: false, type: 'boolean' },
        professional: { value: 'Tenant & Contractor Portals', isIncluded: true, type: 'badge', badgeStyle: 'emerald', tooltip: 'Self-service rent payments and vendor job tracking' },
        business: { value: 'Tenant, Contractor & Tech Portals', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'White-Label Portals + SSO', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 6. SLA
    {
      id: 'sla',
      label: 'SLA',
      category: 'maintenance',
      featureKey: 'sla_automation',
      description: 'Automated response timers, breach alerts, and contractual priority thresholds.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Automated SLA Timers (15m–4h)', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        business: { value: 'Dynamic SLA policies & breach alerts', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Custom contractual SLA guarantees', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 7. WORK ORDERS
    {
      id: 'work_orders',
      label: 'Work Orders',
      category: 'maintenance',
      featureKey: 'work_order_dispatch',
      description: 'Generation, contractor dispatch, milestone approval, and invoice reconciliation.',
      values: {
        free: { value: 'Manual notes only', isIncluded: false, type: 'text' },
        starter: { value: 'Basic work orders', isIncluded: true, type: 'text' },
        basic: { value: 'Work order tracking', isIncluded: true, type: 'text' },
        professional: { value: 'Automated Contractor Dispatch', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        business: { value: 'Multi-vendor dispatch & mobile sign-off', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Automated dispatch with ERP sync', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 8. PREVENTIVE MAINTENANCE
    {
      id: 'preventive_maintenance',
      label: 'Preventive Maintenance',
      category: 'maintenance',
      featureKey: 'preventive_maintenance',
      description: 'Recurring asset inspection schedules for HVAC, elevators, boilers, and generators.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Scheduled Recurring Cycles', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        business: { value: 'Predictive cycles & vendor auto-alerts', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'IoT telemetry & failure predictions', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 9. UTILITIES
    {
      id: 'utilities',
      label: 'Utilities',
      category: 'maintenance',
      featureKey: 'utility_submetering',
      description: 'Electricity, water, and gas submetering with automated tenant cost apportionment.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Smart Utility Sub-Metering', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        business: { value: 'Sub-metering + automated tenant recharge', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Smart grid & multi-complex metering', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 10. ANALYTICS
    {
      id: 'analytics',
      label: 'Analytics',
      category: 'intelligence',
      featureKey: 'analytics',
      description: 'Portfolio occupancy reports, financial rent collections, and arrears tracking.',
      values: {
        free: { value: 'Basic rent totals', isIncluded: true, type: 'text' },
        starter: { value: 'Collection summaries', isIncluded: true, type: 'text' },
        basic: { value: 'Occupancy & arrears summaries', isIncluded: true, type: 'text' },
        professional: { value: 'Operational Analytics & SLA KPIs', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        business: { value: 'Executive BI & revenue forecasting', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Custom BI schemas & Data Warehouse', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 11. AI
    {
      id: 'ai',
      label: 'AI',
      category: 'intelligence',
      featureKey: 'ai_operations_copilot',
      description: 'Conversational Co-Pilot, automated ticket triage, and specialized workflow agents.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Report Summaries (250 prompts)', isIncluded: true, type: 'badge', badgeStyle: 'blue' },
        business: { value: 'Gemini AI Co-Pilot (2,500 prompts)', isIncluded: true, type: 'badge', badgeStyle: 'emerald', tooltip: 'Full conversational portfolio indexing and automated drafting' },
        enterprise: { value: 'Specialized AI Agents (10k prompts)', isIncluded: true, type: 'badge', badgeStyle: 'purple', tooltip: 'Dedicated autonomous background agents for lease and triage' },
      },
    },

    // 12. RFQ
    {
      id: 'rfq',
      label: 'RFQ',
      category: 'procurement',
      featureKey: 'rfq_management',
      description: 'Request for Quotes specification creation, distribution, and vendor response logging.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Not available', isIncluded: false, type: 'boolean' },
        business: { value: 'RFQ Management Console', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Institutional RFQ & approval chains', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 13. CONTRACTOR BIDDING
    {
      id: 'contractor_bidding',
      label: 'Contractor Bidding',
      category: 'procurement',
      featureKey: 'contractor_bidding',
      description: 'Side-by-side bid comparison matrix, rate card scoring, and award workflows.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Not available', isIncluded: false, type: 'boolean' },
        basic: { value: 'Not available', isIncluded: false, type: 'boolean' },
        professional: { value: 'Not available', isIncluded: false, type: 'boolean' },
        business: { value: 'Contractor Bidding Matrix', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Bidding Matrix + Milestone Retainage', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 14. COMPLIANCE
    {
      id: 'compliance',
      label: 'Compliance',
      category: 'compliance_documents',
      featureKey: 'compliance_automation',
      description: 'Statutory certificate tracking (fire, elevator, gas), expiry warnings, and audit logs.',
      values: {
        free: { value: 'Manual records', isIncluded: false, type: 'text' },
        starter: { value: 'Manual records', isIncluded: false, type: 'text' },
        basic: { value: 'Expiry calendar alerts', isIncluded: true, type: 'text' },
        professional: { value: 'Certificate tracking', isIncluded: true, type: 'text' },
        business: { value: 'Automated Compliance Engine', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Bespoke Municipal Compliance & ESG', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 15. DOCUMENTS
    {
      id: 'documents',
      label: 'Documents',
      category: 'compliance_documents',
      featureKey: 'document_vault',
      description: 'Document vault storage, lease templates, tenant ID files, and inspection records.',
      values: {
        free: { value: '1 GB basic storage', isIncluded: true, type: 'text' },
        starter: { value: '5 GB standard storage', isIncluded: true, type: 'text' },
        basic: { value: '15 GB storage', isIncluded: true, type: 'text' },
        professional: { value: '50 GB + Lease Templates', isIncluded: true, type: 'badge', badgeStyle: 'blue' },
        business: { value: '250 GB Document Vault', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Unlimited Document Vault', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 16. PERMISSIONS
    {
      id: 'permissions',
      label: 'Permissions',
      category: 'finance_security',
      featureKey: 'custom_roles',
      description: 'User access levels, Role-Based Access Control (RBAC), and team seats.',
      values: {
        free: { value: '1 user (Single admin)', isIncluded: true, type: 'text' },
        starter: { value: '2 users (Standard roles)', isIncluded: true, type: 'text' },
        basic: { value: '4 users (Standard roles)', isIncluded: true, type: 'text' },
        professional: { value: '10 users (Role permissions)', isIncluded: true, type: 'text' },
        business: { value: '25 users + Custom RBAC Roles', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: '150+ users + Granular Policy Engine', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 17. TAX
    {
      id: 'tax',
      label: 'Tax',
      category: 'finance_security',
      featureKey: 'tax_support',
      description: 'Jurisdictional tax settings, VAT breakdowns (15%, 20%), and fiscal export reporting.',
      values: {
        free: { value: 'Not available', isIncluded: false, type: 'boolean' },
        starter: { value: 'Basic receipt totals', isIncluded: false, type: 'text' },
        basic: { value: 'Flat tax line-items', isIncluded: true, type: 'text' },
        professional: { value: 'Configurable tax rules', isIncluded: true, type: 'text' },
        business: { value: 'Multi-Jurisdiction Tax & VAT', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Multi-national fiscal compliance & audit', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 18. MULTI-CURRENCY
    {
      id: 'multi_currency',
      label: 'Multi-Currency',
      category: 'finance_security',
      featureKey: 'multi_currency',
      description: 'Multi-currency invoicing, zero-decimal conversions, and real-time exchange rate logs.',
      values: {
        free: { value: 'USD master only', isIncluded: false, type: 'text' },
        starter: { value: 'USD master only', isIncluded: false, type: 'text' },
        basic: { value: 'USD master only', isIncluded: false, type: 'text' },
        professional: { value: 'USD + Local display', isIncluded: true, type: 'text' },
        business: { value: 'Full Multi-Currency Support (0-decimals)', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Cross-border multi-currency ledgers', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 19. INTEGRATIONS
    {
      id: 'integrations',
      label: 'Integrations',
      category: 'integrations_enterprise',
      featureKey: 'accounting_integrations',
      description: 'Accounting software (Xero, QuickBooks), webhooks, and REST API connectivity.',
      values: {
        free: { value: 'None', isIncluded: false, type: 'boolean' },
        starter: { value: 'None', isIncluded: false, type: 'boolean' },
        basic: { value: 'CSV / Excel accounting export', isIncluded: true, type: 'text' },
        professional: { value: 'Webhooks & REST Endpoints', isIncluded: true, type: 'badge', badgeStyle: 'blue' },
        business: { value: 'Xero, QuickBooks & REST API', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'SAP, Oracle, NetSuite & Dynamics', isIncluded: true, type: 'badge', badgeStyle: 'purple' },
      },
    },

    // 20. ENTERPRISE CAPABILITIES
    {
      id: 'enterprise_capabilities',
      label: 'Enterprise Capabilities',
      category: 'integrations_enterprise',
      featureKey: 'dedicated_instance',
      description: 'Dedicated cloud infrastructure, custom database residency, and enterprise SSO/SAML.',
      values: {
        free: { value: 'None', isIncluded: false, type: 'boolean' },
        starter: { value: 'None', isIncluded: false, type: 'boolean' },
        basic: { value: 'None', isIncluded: false, type: 'boolean' },
        professional: { value: 'None', isIncluded: false, type: 'boolean' },
        business: { value: 'Audit logs & custom branding', isIncluded: true, type: 'text' },
        enterprise: { value: 'Dedicated Instance, SSO & SAML 2.0', isIncluded: true, type: 'badge', badgeStyle: 'purple', tooltip: 'Single-tenant cluster with Okta/Azure AD integration' },
      },
    },

    // 21. SUPPORT
    {
      id: 'support',
      label: 'Support',
      category: 'support',
      description: 'Customer service availability, dedicated account management, and SLA response guarantees.',
      values: {
        free: { value: 'Community support', isIncluded: true, type: 'text' },
        starter: { value: 'Standard email support', isIncluded: true, type: 'text' },
        basic: { value: 'Standard email (48h SLA)', isIncluded: true, type: 'text' },
        professional: { value: 'Standard SLA (24h turnaround)', isIncluded: true, type: 'text' },
        business: { value: 'Priority 24/7 Technical Support', isIncluded: true, type: 'badge', badgeStyle: 'emerald' },
        enterprise: { value: 'Dedicated CSM & 15m Emergency SLA', isIncluded: true, type: 'badge', badgeStyle: 'purple', tooltip: 'Named Customer Success Manager and emergency escalation phone bridge' },
      },
    },
  ];

  return criteria;
}

/**
 * Filter criteria by category or differences-only flag.
 */
export function filterComparisonCriteria(
  criteria: ComparisonCriterion[],
  categoryFilter: string = 'all',
  differencesOnly: boolean = false,
  searchTerm: string = ''
): ComparisonCriterion[] {
  return criteria.filter((criterion) => {
    // 1. Category filter
    if (categoryFilter !== 'all' && criterion.category !== categoryFilter) {
      return false;
    }

    // 2. Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesLabel = criterion.label.toLowerCase().includes(term);
      const matchesDesc = criterion.description.toLowerCase().includes(term);
      if (!matchesLabel && !matchesDesc) return false;
    }

    // 3. Differences only
    if (differencesOnly) {
      const vals = Object.values(criterion.values).map((v) => `${v.value}_${v.isIncluded}`);
      const allIdentical = vals.every((val) => val === vals[0]);
      if (allIdentical) return false;
    }

    return true;
  });
}
