/**
 * SEQUENCE 09 — CENTRALIZED FEATURE ENTITLEMENT ENGINE
 * 
 * Provides an authoritative, single source of truth for platform feature entitlements.
 * Prevents scattering plan checks throughout the application by centralizing:
 * - Feature registry & categorization
 * - Minimum plan association & hierarchy inheritance
 * - Dynamic entitlement evaluation (isFeatureEntitled / checkFeatureEntitlement)
 * - Clear explanations of upgrade requirements when a feature is locked
 * 
 * Supported core features (at minimum):
 * • tenant_directory
 * • service_requests
 * • manual_rent_recording
 * • tenant_portal
 * • contractor_portal
 * • sla_automation
 * • work_order_dispatch
 * • preventive_maintenance
 * • utility_submetering
 * • analytics
 * • ai_operations_copilot
 * • rfq_management
 * • contractor_bidding
 * • compliance_automation
 * • multi_currency
 * • tax_support
 * • custom_roles
 * • document_vault
 * • specialized_ai_agents
 * • erp_integrations
 * • accounting_integrations
 * • custom_compliance
 * • dedicated_instance
 * • enterprise_sso
 * • saml
 */

import {
  FeatureKey,
  FeatureCategory,
  FeatureDefinition,
  FeatureCheckResult,
  FeatureEntitlementEngineState,
  SubscriptionPlanId,
} from '../types';

export const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  basic: 2,
  professional: 3,
  business: 4,
  enterprise: 5,
};

export const PLAN_DISPLAY_NAMES: Record<string, string> = {
  free: 'Free Tier',
  starter: 'Starter',
  basic: 'Basic',
  professional: 'Professional',
  business: 'Business / Plus',
  enterprise: 'Enterprise',
};

export const CATEGORY_METADATA: Record<FeatureCategory, { name: string; description: string; icon: string }> = {
  core_operations: {
    name: 'Core Operations & Tenancy',
    description: 'Foundational property, tenant registry, and basic maintenance records.',
    icon: 'Home',
  },
  portals_dispatch: {
    name: 'Portals & Field Dispatch',
    description: 'Self-service tenant access, external contractor workspaces, and work order dispatching.',
    icon: 'Truck',
  },
  maintenance_metering: {
    name: 'Maintenance & Metering',
    description: 'Preventive maintenance scheduling, automated SLA tracking, and utility submetering.',
    icon: 'Zap',
  },
  analytics_ai: {
    name: 'Intelligence & Analytics',
    description: 'Autonomous AI co-pilot, executive reporting, and specialized workflow agents.',
    icon: 'Sparkles',
  },
  compliance_finance: {
    name: 'Procurement & Finance',
    description: 'RFQ bidding matrix, multi-currency accounting, document vault, and statutory compliance.',
    icon: 'ShieldCheck',
  },
  enterprise_infrastructure: {
    name: 'Enterprise Architecture & Security',
    description: 'Dedicated cloud instances, custom compliance dockets, SSO, SAML, and ERP integrations.',
    icon: 'Lock',
  },
};

/**
 * Authoritative Feature Registry
 */
export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  // 1. Core Operations
  tenant_directory: {
    key: 'tenant_directory',
    name: 'Tenant Directory',
    shortDescription: 'Basic tenant directory with lease records and contact information.',
    detailedDescription: 'Unified tenant roster storing profiles, emergency contacts, lease dates, and occupied unit designations.',
    category: 'core_operations',
    categoryName: 'Core Operations & Tenancy',
    minPlan: 'free',
    minPlanName: 'Free Tier',
    availableInPlans: ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'],
    icon: 'Users',
    businessValue: 'Ensures reliable tenancy data and contact points for landlords of any portfolio size.',
  },
  service_requests: {
    key: 'service_requests',
    name: 'Service Requests',
    shortDescription: 'Standard tenant service ticket intake and status tracking.',
    detailedDescription: 'Central service ticket logging system for tracking tenant complaints, maintenance needs, and repair states.',
    category: 'core_operations',
    categoryName: 'Core Operations & Tenancy',
    minPlan: 'free',
    minPlanName: 'Free Tier',
    availableInPlans: ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'],
    icon: 'LifeBuoy',
    businessValue: 'Prevents overlooked maintenance issues and documents ticket histories.',
  },
  manual_rent_recording: {
    key: 'manual_rent_recording',
    name: 'Manual Rent Recording',
    shortDescription: 'Record manual rent payments and generate offline receipts.',
    detailedDescription: 'Ledger for recording cash, check, or bank transfer payments with real-time balance calculations.',
    category: 'core_operations',
    categoryName: 'Core Operations & Tenancy',
    minPlan: 'free',
    minPlanName: 'Free Tier',
    availableInPlans: ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'],
    icon: 'Receipt',
    businessValue: 'Accurate bookkeeping for rent collection and payment tracking without requiring payment gateway fees.',
  },

  // 2. Portals & Field Dispatch (Professional and above)
  tenant_portal: {
    key: 'tenant_portal',
    name: 'Tenant Portal',
    shortDescription: 'Dedicated self-service web portal for tenant payments and tickets.',
    detailedDescription: 'Secure web interface allowing tenants to submit work requests, inspect balances, view lease contracts, and download invoices.',
    category: 'portals_dispatch',
    categoryName: 'Portals & Field Dispatch',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'ExternalLink',
    businessValue: 'Dramatically cuts call center volumes and elevates tenant satisfaction through 24/7 self-service.',
  },
  contractor_portal: {
    key: 'contractor_portal',
    name: 'Contractor Portal',
    shortDescription: 'Dedicated portal for external vendors and technicians.',
    detailedDescription: 'Secure contractor interface to view assigned work orders, accept jobs, update completion statuses, and upload invoices.',
    category: 'portals_dispatch',
    categoryName: 'Portals & Field Dispatch',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'Truck',
    businessValue: 'Streamlines vendor coordination and tracks job progress without manual phone tag.',
  },
  sla_automation: {
    key: 'sla_automation',
    name: 'SLA Automation',
    shortDescription: 'Automated SLA response timers, breach alerts, and escalation triggers.',
    detailedDescription: 'Configurable Service Level Agreement engine enforcing response and resolution deadlines with automated urgency escalations.',
    category: 'maintenance_metering',
    categoryName: 'Maintenance & Metering',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'Clock',
    businessValue: 'Protects contractual service commitments and mitigates tenant dispute risks.',
  },
  work_order_dispatch: {
    key: 'work_order_dispatch',
    name: 'Work Order Dispatch',
    shortDescription: 'Automated & manual dispatching of work orders to qualified contractors.',
    detailedDescription: 'Smart assignment engine that matches maintenance tickets with verified contractor skills, locations, and rate cards.',
    category: 'portals_dispatch',
    categoryName: 'Portals & Field Dispatch',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'Send',
    businessValue: 'Accelerates turnaround times from ticket reporting to field technician arrival.',
  },
  preventive_maintenance: {
    key: 'preventive_maintenance',
    name: 'Preventive Maintenance',
    shortDescription: 'Recurring asset inspection routines and scheduled maintenance cycles.',
    detailedDescription: 'Calendar-driven recurring servicing engine for HVAC, elevators, electrical risers, and plumbing infrastructure.',
    category: 'maintenance_metering',
    categoryName: 'Maintenance & Metering',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'CalendarClock',
    businessValue: 'Prevents catastrophic asset failures and prolongs equipment operational longevity.',
  },
  utility_submetering: {
    key: 'utility_submetering',
    name: 'Utility Submetering',
    shortDescription: 'Submeter tracking, automated consumption calculation, and billing apportionment.',
    detailedDescription: 'Digital metering console for electricity, water, and gas with automated utility consumption billing by unit.',
    category: 'maintenance_metering',
    categoryName: 'Maintenance & Metering',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'Zap',
    businessValue: 'Recovers utility overhead costs with transparent unit-level consumption audit trails.',
  },
  analytics: {
    key: 'analytics',
    name: 'Analytics & Reporting',
    shortDescription: 'Operational reports, financial analytics, and portfolio occupancy dashboards.',
    detailedDescription: 'Business intelligence suite delivering occupancy analytics, revenue forecasting, arrears tracking, and maintenance SLA performance.',
    category: 'analytics_ai',
    categoryName: 'Intelligence & Analytics',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'BarChart3',
    businessValue: 'Equips property managers with data-driven operational visibility and executive KPIs.',
  },
  document_vault: {
    key: 'document_vault',
    name: 'Document Vault',
    shortDescription: 'Secure centralized document storage with versioning and templates.',
    detailedDescription: 'Central digital repository with categorized folders for leases, compliance certificates, inspection dockets, and photo evidence.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'professional',
    minPlanName: 'Professional',
    availableInPlans: ['professional', 'business', 'enterprise'],
    icon: 'Archive',
    businessValue: 'Eliminates misplaced paper contracts and consolidates statutory records in one searchable vault.',
  },

  // 3. Business / Plus and above
  ai_operations_copilot: {
    key: 'ai_operations_copilot',
    name: 'Autonomous AI Operations Co-Pilot',
    shortDescription: 'Conversational operational AI assistant with portfolio-wide indexing.',
    detailedDescription: 'Deep conversational AI assistant analyzing leases, diagnosing maintenance inquiries, generating contractor RFQs, and summarizing portfolios.',
    category: 'analytics_ai',
    categoryName: 'Intelligence & Analytics',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'Sparkles',
    businessValue: 'Multiplies manager productivity by automating triage, tenant communication, and operational drafting.',
  },
  rfq_management: {
    key: 'rfq_management',
    name: 'RFQ Management',
    shortDescription: 'Request for Quotes creation, distribution, and contractor RFP pipelines.',
    detailedDescription: 'Comprehensive procurement console for creating work specifications, inviting vetted contractors, and reviewing bids.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'FileSpreadsheet',
    businessValue: 'Enforces competitive market pricing on capital works and routine maintenance jobs.',
  },
  contractor_bidding: {
    key: 'contractor_bidding',
    name: 'Contractor Bidding Matrix',
    shortDescription: 'Side-by-side bid comparison, rate card analysis, and award scoring.',
    detailedDescription: 'Structured bid comparison grid calculating normalized contractor rates, past SLA compliance, and estimated completion times.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'CheckSquare',
    businessValue: 'Guarantees transparent procurement decisions and protects asset margins.',
  },
  compliance_automation: {
    key: 'compliance_automation',
    name: 'Compliance Automation',
    shortDescription: 'Automated certificate tracking, expiry alerts, and statutory audit logging.',
    detailedDescription: 'Statutory compliance engine monitoring fire, elevator, electrical, and gas certificates with automated renewal workflows.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'Award',
    businessValue: 'Prevents legal penalties and insurance invalidation caused by expired regulatory certificates.',
  },
  multi_currency: {
    key: 'multi_currency',
    name: 'Multi-Currency Support',
    shortDescription: 'Multi-currency invoicing, zero-decimal conversions, and real-time exchange rates.',
    detailedDescription: 'Global commercial engine supporting multi-currency billing, localized tenant statements, and immutable exchange rate audit trails.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'Globe',
    businessValue: 'Enables cross-border property portfolio management across diverse regional currencies.',
  },
  tax_support: {
    key: 'tax_support',
    name: 'Tax Support',
    shortDescription: 'Jurisdiction tax configuration, VAT calculations, and exportable tax summaries.',
    detailedDescription: 'Configurable tax rules per region (e.g., South African VAT 15%, UK VAT 20%, US Sales Tax) with automated line-item breakdowns.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'Calculator',
    businessValue: 'Simplifies end-of-year statutory tax filing and complies with localized taxation laws.',
  },
  custom_roles: {
    key: 'custom_roles',
    name: 'Custom Roles & RBAC',
    shortDescription: 'Fine-grained permission policies and custom organizational access roles.',
    detailedDescription: 'Granular Role-Based Access Control allowing bespoke privilege assignments for property managers, accountants, and auditors.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'Shield',
    businessValue: 'Protects confidential financials and isolates staff permissions according to company governance.',
  },
  accounting_integrations: {
    key: 'accounting_integrations',
    name: 'Accounting Integrations',
    shortDescription: 'Direct synchronization with Xero, QuickBooks, and accounting ledgers.',
    detailedDescription: 'Automated two-way ledger synchronization pushing rent receipts, maintenance invoices, and reconciliation journals.',
    category: 'compliance_finance',
    categoryName: 'Procurement & Finance',
    minPlan: 'business',
    minPlanName: 'Business / Plus',
    availableInPlans: ['business', 'enterprise'],
    icon: 'FileCode',
    businessValue: 'Eliminates duplicate manual bookkeeping and reduces reconciliation errors to zero.',
  },

  // 4. Enterprise Only
  specialized_ai_agents: {
    key: 'specialized_ai_agents',
    name: 'Specialized AI Workflow Agents',
    shortDescription: 'Autonomous background AI agents for lease audit, triage, and utility optimization.',
    detailedDescription: 'Dedicated autonomous agents continuously auditing lease compliance, auto-triaging complex emergency work orders, and detecting energy anomalies.',
    category: 'analytics_ai',
    categoryName: 'Intelligence & Analytics',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'Cpu',
    businessValue: 'Provides 24/7 autonomous surveillance over portfolio health, cutting manual oversight by 80%.',
  },
  erp_integrations: {
    key: 'erp_integrations',
    name: 'ERP Integrations',
    shortDescription: 'Deep enterprise integration with SAP, Oracle NetSuite, and Microsoft Dynamics.',
    detailedDescription: 'Enterprise integration gateway supporting custom ETL pipelines, Webhook event buses, and real-time ERP schema mapping.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'Server',
    businessValue: 'Seamlessly embeds property management financials into corporate group ERP infrastructure.',
  },
  custom_compliance: {
    key: 'custom_compliance',
    name: 'Custom Compliance & Dossiers',
    shortDescription: 'Bespoke municipal compliance rules, custom audit frameworks, and legal dossiers.',
    detailedDescription: 'Enterprise policy engine allowing custom municipal ordinance rules, environmental ESG audits, and automated legal dossiers.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'FileCheck',
    businessValue: 'Guarantees compliance with unique municipal bylaws, institutional fund mandates, and cross-border standards.',
  },
  dedicated_instance: {
    key: 'dedicated_instance',
    name: 'Dedicated Cloud Instance',
    shortDescription: 'Isolated single-tenant cloud environment with custom data residency.',
    detailedDescription: 'Physically or virtually segregated database and compute clusters ensuring zero cross-tenant contamination and custom jurisdiction residency.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'Database',
    businessValue: 'Satisfies rigorous institutional security audits and sovereign data residency requirements.',
  },
  enterprise_sso: {
    key: 'enterprise_sso',
    name: 'Enterprise SSO',
    shortDescription: 'Single Sign-On integration via Okta, Azure Active Directory, and Ping.',
    detailedDescription: 'Enterprise federated identity management allowing centralized provisioning, employee deboarding, and credential governance.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'Key',
    businessValue: 'Protects enterprise perimeter security and simplifies employee access management.',
  },
  saml: {
    key: 'saml',
    name: 'SAML 2.0 & SCIM',
    shortDescription: 'SAML 2.0 protocol support with automated directory user provisioning.',
    detailedDescription: 'Industry-standard SAML 2.0 authentication provider with automated SCIM user lifecycle management.',
    category: 'enterprise_infrastructure',
    categoryName: 'Enterprise Architecture & Security',
    minPlan: 'enterprise',
    minPlanName: 'Enterprise',
    availableInPlans: ['enterprise'],
    icon: 'ShieldAlert',
    businessValue: 'Meets stringent IT compliance protocols for multinational corporate enterprises.',
  },
};

/**
 * Check if a plan is entitled to a specific feature
 * Uses plan tier hierarchy so higher plans automatically inherit all lower-tier features.
 */
export function isFeatureEntitled(planId: string | undefined | null, featureKey: FeatureKey): boolean {
  if (!planId) return false;
  const normalizedPlan = planId.toLowerCase().trim();
  const definition = FEATURE_REGISTRY[featureKey];

  if (!definition) {
    // If unknown feature key, default to requiring enterprise
    return normalizedPlan === 'enterprise';
  }

  // Explicit plan inclusion
  if (definition.availableInPlans.includes(normalizedPlan as SubscriptionPlanId)) {
    return true;
  }

  // Tier-based evaluation
  const currentTierScore = PLAN_TIER_ORDER[normalizedPlan] ?? -1;
  const requiredTierScore = PLAN_TIER_ORDER[definition.minPlan] ?? 99;

  return currentTierScore >= requiredTierScore;
}

/**
 * Detailed entitlement check with explanations and upgrade prompts
 */
export function checkFeatureEntitlement(
  planId: string | undefined | null,
  featureKey: FeatureKey
): FeatureCheckResult {
  const normalizedPlan = (planId || 'free').toLowerCase().trim();
  const currentPlanName = PLAN_DISPLAY_NAMES[normalizedPlan] || normalizedPlan;
  const definition = FEATURE_REGISTRY[featureKey];

  if (!definition) {
    return {
      featureKey,
      featureName: featureKey,
      entitled: false,
      currentPlanId: normalizedPlan,
      currentPlanName,
      minRequiredPlanId: 'enterprise',
      minRequiredPlanName: 'Enterprise',
      reason: `Feature '${featureKey}' is not recognized in the standard entitlement registry.`,
      upgradeMessage: 'Upgrade to Enterprise to request bespoke platform capabilities.',
      category: 'enterprise_infrastructure',
      categoryName: 'Enterprise Architecture & Security',
    };
  }

  const entitled = isFeatureEntitled(normalizedPlan, featureKey);

  if (entitled) {
    return {
      featureKey,
      featureName: definition.name,
      entitled: true,
      currentPlanId: normalizedPlan,
      currentPlanName,
      minRequiredPlanId: definition.minPlan,
      minRequiredPlanName: definition.minPlanName,
      category: definition.category,
      categoryName: definition.categoryName,
    };
  }

  return {
    featureKey,
    featureName: definition.name,
    entitled: false,
    currentPlanId: normalizedPlan,
    currentPlanName,
    minRequiredPlanId: definition.minPlan,
    minRequiredPlanName: definition.minPlanName,
    reason: `'${definition.name}' requires the ${definition.minPlanName} plan or higher (currently on ${currentPlanName}).`,
    upgradeMessage: `Upgrade your subscription to ${definition.minPlanName} to unlock ${definition.name}.`,
    category: definition.category,
    categoryName: definition.categoryName,
  };
}

/**
 * Returns all feature keys entitled for a given plan
 */
export function getPlanEntitlements(planId: string | undefined | null): FeatureKey[] {
  const normalizedPlan = (planId || 'free').toLowerCase().trim();
  const allKeys = Object.keys(FEATURE_REGISTRY) as FeatureKey[];
  return allKeys.filter((key) => isFeatureEntitled(normalizedPlan, key));
}

/**
 * Get all feature definitions as a list
 */
export function getAllFeatureDefinitions(): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY);
}

/**
 * Get feature definition by key
 */
export function getFeatureDefinition(featureKey: FeatureKey): FeatureDefinition | undefined {
  return FEATURE_REGISTRY[featureKey];
}

/**
 * Group all feature definitions by their category
 */
export function getFeaturesByCategory(): Record<FeatureCategory, FeatureDefinition[]> {
  const groups: Record<FeatureCategory, FeatureDefinition[]> = {
    core_operations: [],
    portals_dispatch: [],
    maintenance_metering: [],
    analytics_ai: [],
    compliance_finance: [],
    enterprise_infrastructure: [],
  };

  for (const def of Object.values(FEATURE_REGISTRY)) {
    if (groups[def.category]) {
      groups[def.category].push(def);
    }
  }

  return groups;
}

/**
 * Produce a consolidated feature entitlement state for a plan
 */
export function getFeatureEntitlementState(planId: string | undefined | null): FeatureEntitlementEngineState {
  const normalizedPlan = (planId || 'free').toLowerCase().trim();
  const currentPlanName = PLAN_DISPLAY_NAMES[normalizedPlan] || normalizedPlan;
  const entitledFeatureKeys = getPlanEntitlements(normalizedPlan);
  const allFeatures = getAllFeatureDefinitions();
  const featuresByCategory = getFeaturesByCategory();

  const categoryNames: Record<FeatureCategory, string> = {
    core_operations: CATEGORY_METADATA.core_operations.name,
    portals_dispatch: CATEGORY_METADATA.portals_dispatch.name,
    maintenance_metering: CATEGORY_METADATA.maintenance_metering.name,
    analytics_ai: CATEGORY_METADATA.analytics_ai.name,
    compliance_finance: CATEGORY_METADATA.compliance_finance.name,
    enterprise_infrastructure: CATEGORY_METADATA.enterprise_infrastructure.name,
  };

  return {
    currentPlanId: normalizedPlan,
    currentPlanName,
    entitledFeatureKeys,
    allFeatures,
    featuresByCategory,
    categoryNames,
  };
}

/**
 * Return feature matrix across all platform plans for comparative display
 */
export function getComparativeFeatureMatrix(): Array<{
  feature: FeatureDefinition;
  plans: Record<string, boolean>;
}> {
  const plans = ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'];
  const allFeatures = getAllFeatureDefinitions();

  return allFeatures.map((def) => {
    const plansEntitlement: Record<string, boolean> = {};
    for (const p of plans) {
      plansEntitlement[p] = isFeatureEntitled(p, def.key);
    }
    return {
      feature: def,
      plans: plansEntitlement,
    };
  });
}
