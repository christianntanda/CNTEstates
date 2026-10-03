export type Language = 'en' | 'fr' | 'es' | 'pt';
export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'ZAR'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'BRL'
  | 'JPY'
  | 'CNY'
  | 'INR'
  | 'AED'
  | 'SAR'
  | 'SGD'
  | 'NGN'
  | 'KES'
  | 'MXN'
  | 'NZD'
  | 'XOF'
  | string;

export interface OrganizationBranding {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  taxRegistrationNumber: string;
  businessRegistrationNumber: string;
  logoUrl?: string;
  customInvoiceFooter?: string;
  confidentialityNotice?: string;
}

export interface OrganizationFinancialSettings {
  operatingCountry: string;
  baseCurrency: Currency;
  exchangeRateSource: string;
  manualExchangeRates?: Record<string, number>;
  allowUserDisplayCurrency: boolean;
  lastRateUpdate: string;
  rateUpdateFrequency: 'hourly' | 'daily' | 'manual';
}

export type UserRole =
  | 'platform_admin'
  | 'org_owner'
  | 'portfolio_manager'
  | 'property_manager'
  | 'building_manager'
  | 'finance_manager'
  | 'maintenance_manager'
  | 'technician'
  | 'contractor'
  | 'security_officer'
  | 'facility_manager'
  | 'tenant'
  | 'auditor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organizationId: string;
  phone?: string;
  assignedPropertyIds?: string[];
  tenantUnitId?: string; // if role is tenant
  contractorCompanyId?: string; // if role is contractor
}

/**
 * SEQUENCE 28 — AUTHORITATIVE BILLING RBAC PERMISSIONS
 * Enforces role-based access control for billing, invoices, plan changes, and financial configurations.
 */
export type BillingPermission =
  | 'view_billing'
  | 'view_invoices'
  | 'change_plans'
  | 'upgrade'
  | 'downgrade'
  | 'cancel'
  | 'reactivate'
  | 'change_billing_info';

export interface BillingRolePolicy {
  role: UserRole;
  roleName: string;
  description: string;
  category: 'executive' | 'finance' | 'operations' | 'field' | 'resident' | 'compliance';
  permissions: Record<BillingPermission, boolean>;
}

/**
 * SEQUENCE 29 — BILLING AUDIT LOG ACTIONS & ENTRY
 * Authoritative immutable audit trail for all critical financial and subscription events.
 */
export type BillingAuditAction =
  | 'subscription_created'
  | 'subscription_updated'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'capacity_limit_reached'
  | 'billing_information_updated';

export interface BillingAuditActor {
  id: string;
  name: string;
  role: string;
  type: 'user' | 'system';
  ipAddress?: string;
  userAgent?: string;
}

export interface BillingAuditLogEntry {
  id: string;
  organizationId: string;
  organizationName: string;
  actor: BillingAuditActor;
  action: BillingAuditAction;
  previousValue: string | Record<string, any> | null;
  newValue: string | Record<string, any>;
  timestamp: string;
  correlationId: string;
  requestId?: string;
  checksum: string;
  metadata?: Record<string, any>;
}

export type SubscriptionPlanId =
  | 'free'
  | 'starter'
  | 'basic'
  | 'professional'
  | 'business'
  | 'enterprise'
  | (string & {});

export type SubscriptionLifecycleStatus =
  | 'free'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'payment_failed'
  | 'suspended'
  | 'cancelled'
  | 'expired'
  | 'pending_activation'
  | (string & {});

export type SubscriptionHistoryEventType =
  | 'subscription_created'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'billing_period_changed'
  | 'price_changed'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'subscription_reactivated'
  | 'subscription_suspended'
  | 'subscription_expired'
  | 'creation'
  | 'activation'
  | 'renewal'
  | 'upgrade'
  | 'downgrade'
  | 'cancellation'
  | 'reactivation'
  | 'suspension'
  | 'expiration';

export type SubscriptionLifecycleEvent = SubscriptionHistoryEventType;

export interface SubscriptionHistoryRecord {
  // Primary Identifiers
  id: string;
  history_id: string;
  organization_id: string;
  subscription_id: string;

  // Canonical Sequence 16 Attributes
  event: SubscriptionHistoryEventType;
  previous_plan?: string | null;
  new_plan: string;
  previous_price?: number | null;
  new_price: number;
  billing_period: BillingPeriod | string;
  effective_date: string;
  change_reason: string;
  changed_by: string;
  timestamp: string;

  // Backwards Compatibility & Presentation Aliases
  previous_plan_id?: string;
  new_plan_id?: string;
  previous_status?: SubscriptionLifecycleStatus | string;
  new_status?: SubscriptionLifecycleStatus | string;
  billing_currency?: string;
  master_price_usd?: number;
  reason?: string;
  initiated_by?: string;
  immutable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Organization {
  id: string;
  name: string;
  planId: SubscriptionPlanId;
  subscriptionStatus: SubscriptionLifecycleStatus;
  trialDaysLeft?: number;
  monthlySpend: number;
  createdAt: string;
  renewalDate: string;
  currency: Currency;
  baseCurrency: Currency;
  billingCurrency?: string;
  operatingCountry: string;
  timezone: string;
  country: string;
  branding?: OrganizationBranding;
  financialSettings?: OrganizationFinancialSettings;
  subscriptionRecord?: CustomerSubscription;
  subscriptionInvoices?: SubscriptionInvoice[];
  subscriptionHistory?: SubscriptionHistoryRecord[];
}

export type PropertyType =
  | 'residential'
  | 'commercial'
  | 'mixed_use'
  | 'retail'
  | 'industrial'
  | 'student_accommodation'
  | 'other';

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  type: PropertyType;
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  ownerName: string;
  managerName: string;
  description: string;
  imageUrl: string;
  yearBuilt: number;
  totalBuildings: number;
  totalUnits: number;
  occupiedUnits: number;
  parkingSpaces: number;
  amenities: string[];
  status: 'active' | 'under_renovation' | 'development';
}

export interface Building {
  id: string;
  propertyId: string;
  name: string;
  buildingCode: string;
  floorsCount: number;
  totalUnits: number;
  commonAreas: string[];
  facilities: string[];
  emergencyExits: number;
  complianceRating: string;
}

export type UnitType =
  | 'apartment'
  | 'penthouse'
  | 'office_suite'
  | 'retail_shop'
  | 'warehouse'
  | 'studio'
  | 'parking_bay'
  | 'storage';

export type UnitStatus = 'occupied' | 'vacant' | 'maintenance' | 'reserved';

export interface Unit {
  id: string;
  propertyId: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  type: UnitType;
  squareMeters: number;
  monthlyRent: number;
  currency: Currency;
  status: UnitStatus;
  currentTenantId?: string;
  currentLeaseId?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  keyAssetIds: string[];
}

export interface Tenant {
  id: string;
  organizationId: string;
  name: string;
  isCompany: boolean;
  companyRegistration?: string;
  email: string;
  phone: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  unitId: string;
  propertyId: string;
  leaseId: string;
  idDocumentNumber: string;
  occupantsCount: number;
  vehicles: string[];
  outstandingBalance: number;
  paymentStatus: 'paid' | 'overdue' | 'pending' | 'partially_paid';
  depositHeld: number;
  rating: number; // 1-5
  joinedDate: string;
}

export type LeaseStatus = 'active' | 'draft' | 'pending_approval' | 'expiring' | 'expired' | 'terminated';

export interface Lease {
  id: string;
  leaseNumber: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  escalationRatePercent: number;
  paymentDueDay: number;
  status: LeaseStatus;
  daysRemaining: number;
  documents: string[];
  specialClauses: string[];
}

export type TicketPriority = 'emergency' | 'critical' | 'high' | 'normal' | 'low';
export type TicketStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_contractor'
  | 'awaiting_parts'
  | 'completed'
  | 'verified'
  | 'closed';

export interface ServiceTicket {
  id: string;
  code: string; // e.g. CBM-00452
  propertyId: string;
  propertyName: string;
  buildingId: string;
  unitId: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  title: string;
  description: string;
  category:
    | 'electrical'
    | 'plumbing'
    | 'hvac'
    | 'generator'
    | 'elevator'
    | 'fire_systems'
    | 'cctv_security'
    | 'structural'
    | 'appliances'
    | 'cleaning'
    | 'pest_control';
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  slaTargetHours: number;
  slaTargetTime: string;
  slaBreached: boolean;
  assignedTechnician?: string;
  contractorId?: string;
  contractorName?: string;
  workOrderId?: string;
  cost?: number;
  photos: string[];
  customerRating?: number;
  resolutionNotes?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string; // WO-2026-081
  ticketId?: string;
  propertyId: string;
  propertyName: string;
  unitNumber?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: 'created' | 'assigned' | 'in_progress' | 'inspection' | 'completed' | 'approved';
  assignedTo: string; // technician or contractor name
  assignedType: 'in_house' | 'contractor';
  contractorId?: string;
  startDate: string;
  dueDate: string;
  laborHours: number;
  laborRatePerHour: number;
  materialsCost: number;
  totalCost: number;
  photos: string[];
  checklist: { item: string; completed: boolean }[];
  signatureConfirmed: boolean;
}

export interface BuildingAsset {
  id: string;
  propertyId: string;
  propertyName: string;
  buildingId: string;
  name: string;
  category: 'HVAC' | 'Generator' | 'Elevator' | 'Boiler' | 'Pump' | 'Fire System' | 'Solar' | 'Access Control';
  modelNumber: string;
  serialNumber: string;
  manufacturer: string;
  supplier: string;
  installDate: string;
  warrantyExpiry: string;
  purchaseCost: number;
  location: string;
  operatingStatus: 'optimal' | 'requires_service' | 'critical_alert' | 'decommissioned';
  lastServiceDate: string;
  nextScheduledService: string;
  maintenanceLogCount: number;
}

export interface PreventiveMaintenancePlan {
  id: string;
  assetId: string;
  assetName: string;
  propertyId: string;
  title: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';
  assignedContractorOrTech: string;
  estimatedHours: number;
  estimatedCost: number;
  nextDueDate: string;
  lastCompletedDate?: string;
  status: 'scheduled' | 'overdue' | 'in_progress';
}

export interface Contractor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  trades: string[];
  licenseNumber: string;
  insuranceValidUntil: string;
  isInsuranceActive: boolean;
  rating: number; // 1-5
  hourlyRate: number;
  slaComplianceRate: number; // e.g. 96%
  activeWorkOrdersCount: number;
  status: 'preferred' | 'active' | 'suspended' | 'under_review';
}

export interface RFQ {
  id: string;
  rfqNumber: string; // RFQ-2026-104
  title: string;
  propertyId: string;
  propertyName: string;
  serviceCategory: string;
  description: string;
  deadline: string;
  status: 'open' | 'quotes_received' | 'awarded' | 'closed';
  invitedContractors: string[];
  quotes: {
    contractorId: string;
    contractorName: string;
    amount: number;
    estimatedDays: number;
    notes: string;
    submittedAt: string;
    status: 'pending' | 'accepted' | 'rejected';
  }[];
}

export interface FinancialRecord {
  id: string;
  type: 'rent_income' | 'utility_recharge' | 'maintenance_expense' | 'contractor_payout' | 'deposit_received' | 'insurance_expense';
  propertyId: string;
  propertyName: string;
  unitNumber?: string;
  tenantName?: string;
  amount: number;
  currency: Currency;
  originalAmount?: number;
  originalCurrency?: Currency;
  baseAmount?: number;
  baseCurrency?: Currency;
  exchangeRateUsed?: number;
  exchangeRateDate?: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'disputed';
  invoiceNumber: string;
  description: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  taxAmount?: number;
  paymentMethod?: string;
}

export interface UtilityMeter {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber?: string;
  type: 'electricity' | 'water' | 'gas' | 'solar' | 'generator';
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  unitOfMeasure: 'kWh' | 'm³' | 'therms';
  readingDate: string;
  unitRate: number;
  totalCost: number;
  allocatedTenantId?: string;
  billedStatus: 'billed' | 'unbilled';
}

export interface SecurityIncident {
  id: string;
  incidentNumber: string; // INC-2026-039
  propertyId: string;
  propertyName: string;
  type: 'unauthorized_access' | 'vandalism' | 'cctv_alert' | 'parking_violation' | 'noise_complaint' | 'water_leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  timestamp: string;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  description: string;
  actionTaken: string;
}

export interface ComplianceCertificate {
  id: string;
  propertyId: string;
  propertyName: string;
  title: string;
  issuingAuthority: string;
  category: 'fire_safety' | 'elevator' | 'electrical' | 'hvac_emissions' | 'building_occupancy' | 'insurance_policy';
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'missing';
  daysUntilExpiry: number;
  certificateNumber: string;
  documentUrl?: string;
}

export interface FacilityTask {
  id: string;
  propertyId: string;
  propertyName: string;
  category: 'cleaning' | 'waste' | 'landscaping' | 'pest_control' | 'pool_spa';
  area: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  assignedStaff: string;
  lastChecked: string;
  status: 'completed' | 'in_progress' | 'pending_inspection';
  checklist: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  isActive: boolean;
  lastTriggered?: string;
  executionCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  organizationId?: string;
  userId?: string;
  details?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export interface CountryConfiguration {
  country_code: string;
  country_name: string;
  default_currency: string;
  locale: string;
  number_format: {
    thousandsSeparator: string;
    decimalSeparator: string;
    grouping: number[];
  };
  date_format: string;
  legal_operational_timezone: string;
  flag: string;
}

export interface PlanAiEntitlements {
  enabled: boolean;
  tier: 'none' | 'basic' | 'copilot' | 'specialized_agents';
  copilot: boolean;
  specialized_agents: boolean;
  monthly_prompt_quota: number;
  description: string;
}

export interface PlanDocumentEntitlements {
  vault: boolean;
  unlimited: boolean;
  storage_gb: number;
  custom_templates: boolean;
  description: string;
}

export interface PlanIntegrationEntitlements {
  webhooks: boolean;
  accounting_erp: boolean;
  sso_saml: boolean;
  custom_api: boolean;
  supported_integrations: string[];
  description: string;
}

export type StandardBillingPeriod = 'monthly' | 'quarterly' | 'annual' | 'custom';
export type BillingPeriod = StandardBillingPeriod | (string & {});

export interface CustomBillingSchedule {
  cadenceType: 'custom_interval' | 'multi_year' | 'milestone' | 'bespoke_terms';
  intervalUnit: 'days' | 'months' | 'years';
  intervalCount: number;
  description: string;
  installmentsCount?: number;
  paymentTermsDays?: number; // e.g. Net 30, Net 60
  customBasePriceUsd?: number;
}

export interface BillingPeriodDefinition {
  id: BillingPeriod;
  name: string;
  shortName: string;
  description: string;
  months: number;
  defaultDiscountPercentage: number;
  isStandardPaid: boolean; // Monthly is the current standard paid period
  isEnterpriseOnly?: boolean;
}

export interface PlanCapacityLimits {
  planId: string;
  planName: string;
  maxProperties: number | 'unlimited';
  maxRentalUnits: number | 'unlimited';
  unitLimitType: 'organization_wide' | 'per_property';
  maxUnitsPerProperty?: number;
  maxBuildings?: number | 'unlimited';
  maxTeamSeats?: number | 'unlimited';
  maxStorageGb?: number | 'unlimited';
  maxMonthlyAiPrompts?: number | 'unlimited';
  description: string;
}

export type UsageResourceStatus = 'normal' | 'approaching' | 'reached' | 'unlimited';

export interface ResourceUsageMetric {
  key: 'rentalUnits' | 'properties' | 'buildings' | 'teamSeats' | 'documentStorage' | 'aiPrompts' | string;
  name: string; // e.g. "Rental Units", "Properties", "Buildings", "Team Seats", "Document Storage", "AI Monthly Operations"
  unitLabel: string; // e.g. "units", "properties", "buildings", "seats", "GB", "prompts"
  currentUsage: number;
  allowedCapacity: number | 'unlimited';
  displayUsage: string; // Formatted "Current Usage / Allowed Capacity", e.g. "48 / 50"
  percentage: number; // 0 - 100
  remaining: number | 'unlimited';
  status: UsageResourceStatus;
  isApproaching: boolean;
  isReached: boolean;
  warningThresholdPercentage: number;
  warningMessage?: string;
  limitExplanation?: string; // Clear explanation of why the user cannot create additional resources
  upgradeTargetPlanName?: string;
  upgradeTargetCapacity?: string;
}

export interface CentralizedUsageMonitoring {
  organizationId: string;
  organizationName: string;
  planId: string;
  planName: string;
  calculatedAt: string;
  overallStatus: 'normal' | 'approaching' | 'reached';
  resources: {
    rentalUnits: ResourceUsageMetric;
    properties: ResourceUsageMetric;
    buildings: ResourceUsageMetric;
    teamSeats: ResourceUsageMetric;
    documentStorage: ResourceUsageMetric;
    aiPrompts: ResourceUsageMetric;
  };
  resourceList: ResourceUsageMetric[];
  hasWarnings: boolean;
  hasReachedLimits: boolean;
  activeWarnings: string[];
  reachedLimitExplanations: string[];
  perPropertyUnits: Array<{
    propertyId: string;
    propertyName: string;
    unitCount: number;
    maxUnitsAllowed: number | 'unlimited';
    displayUsage: string;
    percentage: number;
    status: UsageResourceStatus;
    remaining: number | 'unlimited';
    isApproaching: boolean;
    isReached: boolean;
    warningMessage?: string;
    limitExplanation?: string;
  }>;
}

export interface CapacityValidationResult {
  allowed: boolean;
  reason?: string;
  code?: 'PROPERTY_LIMIT_REACHED' | 'UNIT_LIMIT_REACHED' | 'PER_PROPERTY_UNIT_LIMIT_REACHED';
  currentCount: number;
  maxLimit: number | 'unlimited';
  planId: string;
  propertyId?: string;
}

// SEQUENCE 09 — CENTRALIZED FEATURE ENTITLEMENT ENGINE TYPES
export type FeatureKey =
  | 'tenant_directory'
  | 'service_requests'
  | 'manual_rent_recording'
  | 'tenant_portal'
  | 'contractor_portal'
  | 'sla_automation'
  | 'work_order_dispatch'
  | 'preventive_maintenance'
  | 'utility_submetering'
  | 'analytics'
  | 'ai_operations_copilot'
  | 'rfq_management'
  | 'contractor_bidding'
  | 'compliance_automation'
  | 'multi_currency'
  | 'tax_support'
  | 'custom_roles'
  | 'document_vault'
  | 'specialized_ai_agents'
  | 'erp_integrations'
  | 'accounting_integrations'
  | 'custom_compliance'
  | 'dedicated_instance'
  | 'enterprise_sso'
  | 'saml'
  | (string & {});

export type FeatureCategory =
  | 'core_operations'
  | 'portals_dispatch'
  | 'maintenance_metering'
  | 'analytics_ai'
  | 'compliance_finance'
  | 'enterprise_infrastructure';

export interface FeatureDefinition {
  key: FeatureKey;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  category: FeatureCategory;
  categoryName: string;
  minPlan: SubscriptionPlanId;
  minPlanName: string;
  availableInPlans: SubscriptionPlanId[];
  icon: string;
  businessValue: string;
}

export interface FeatureCheckResult {
  featureKey: FeatureKey;
  featureName: string;
  entitled: boolean;
  currentPlanId: string;
  currentPlanName: string;
  minRequiredPlanId: string;
  minRequiredPlanName: string;
  reason?: string;
  upgradeMessage?: string;
  category: FeatureCategory;
  categoryName: string;
}

export interface FeatureEntitlementEngineState {
  currentPlanId: string;
  currentPlanName: string;
  entitledFeatureKeys: FeatureKey[];
  allFeatures: FeatureDefinition[];
  featuresByCategory: Record<FeatureCategory, FeatureDefinition[]>;
  categoryNames: Record<FeatureCategory, string>;
}

// SEQUENCE 10 — FEATURE ACCESS CONTROL AUTHORIZATION FLOW TYPES
export type AccessDecisionStage =
  | 'user'
  | 'organization'
  | 'subscription'
  | 'plan'
  | 'entitlement'
  | 'decision';

export interface AccessFlowTrace {
  user: {
    id: string;
    name: string;
    role: UserRole;
    organizationId: string;
    status: 'authenticated' | 'unauthenticated' | 'suspended';
    passed: boolean;
  };
  organization: {
    id: string;
    name: string;
    status: string;
    passed: boolean;
  };
  subscription: {
    id: string;
    status: SubscriptionLifecycleStatus;
    planId: string;
    isUsable: boolean;
    passed: boolean;
  };
  plan: {
    id: string;
    name: string;
    tierScore: number;
    passed: boolean;
  };
  entitlement: {
    featureKey: FeatureKey;
    featureName: string;
    minPlan: string;
    minPlanName: string;
    isIncluded: boolean;
    passed: boolean;
  };
  decision: {
    granted: boolean;
    evaluatedAt: string;
    deniedAtStage?: AccessDecisionStage;
    reasonCode: string;
  };
}

export interface AccessDecision {
  granted: boolean;
  featureKey: FeatureKey;
  featureName: string;
  category: FeatureCategory;
  categoryName: string;
  deniedAtStage?: AccessDecisionStage;
  reason: string;
  explanation: string; // "Explain that the feature is unavailable under the current plan"
  currentPlanId: string;
  currentPlanName: string;
  requiredPlanId?: string;
  requiredPlanName?: string;
  upgradeOption?: {
    targetPlanId: string;
    targetPlanName: string;
    monthlyPriceUsd: number;
    upgradeCtaText: string;
    featureHighlight: string;
  };
  dataPreserved: boolean; // "Do not delete existing data when a feature becomes unavailable"
  preservedRecordsCount?: number;
  preservedDataSummary?: string;
  flowTrace: AccessFlowTrace;
}

export interface CapacityUsage {
  organizationId: string;
  planId: string;
  planName: string;
  totalProperties: number;
  maxProperties: number | 'unlimited';
  propertiesRemaining: number | 'unlimited';
  totalUnits: number;
  maxUnits: number | 'unlimited';
  unitsRemaining: number | 'unlimited';
  unitLimitType: 'organization_wide' | 'per_property';
  maxUnitsPerProperty?: number;
  unitsByProperty: Array<{
    propertyId: string;
    propertyName: string;
    unitCount: number;
    maxUnitsAllowed: number | 'unlimited';
    remainingUnits: number | 'unlimited';
    isExceeded: boolean;
  }>;
  isPropertiesExceeded: boolean;
  isUnitsExceeded: boolean;
  canAddProperty: boolean;
}

export interface SubscriptionPlan {
  // Required Sequence 03 Identifiers
  plan_id: string;
  plan_code: string;
  plan_name: string;
  description: string;
  status: 'active' | 'archived' | 'draft' | string;
  version: number | string;

  // Required Sequence 03 & 06 Pricing & Billing
  master_currency: 'USD';
  monthly_price: number; // Authoritative USD monthly price ($0 for free)
  billing_period: BillingPeriod;
  quarterly_master_price?: number;
  annual_master_price: number; // Authoritative USD annual price per month ($0 for free)
  period_pricing?: Partial<Record<string, number>>;
  custom_billing_supported?: boolean;

  // Required Sequence 03 & 07 Capacity Quotas
  max_rental_units: number | 'unlimited';
  max_units_per_property: number | 'unlimited';
  max_properties: number | 'unlimited';
  max_buildings: number | 'unlimited';
  unit_limit_type?: 'organization_wide' | 'per_property';

  // Required Sequence 03 Entitlements & Support
  feature_entitlements: string[];
  support_level: 'community' | 'email' | 'standard' | 'priority_24_7' | 'dedicated_csm' | string;
  ai_entitlements: PlanAiEntitlements;
  document_entitlements: PlanDocumentEntitlements;
  integration_entitlements: PlanIntegrationEntitlements;

  // Required Sequence 03 Timestamps
  created_at: string;
  updated_at: string;

  // Backward compatibility aliases
  id: SubscriptionPlanId;
  name: string;
  master_price: number;
  monthlyPrice: number;
  annualPricePerMonth: number;
  propertiesLimit: number | 'unlimited';
  unitsLimit: number | 'unlimited';
  unitsPerPropertyLimit?: number | 'unlimited';
  capacityDescription?: string;
  usersLimit: number;
  features: string[];
  aiAssistance: boolean;
  slaAutomation: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface CustomerSubscription {
  // Required Sequence 04 Core Identifiers & Foreign Keys
  subscription_id: string;
  id: string; // Backward compatibility alias for subscription_id
  organization_id: string;
  plan_id: SubscriptionPlanId;
  plan_name: string;

  // Status & Cadence
  subscription_status: SubscriptionLifecycleStatus;
  status: SubscriptionLifecycleStatus; // Backward compatibility alias
  billing_period: BillingPeriod;
  custom_schedule?: CustomBillingSchedule;

  // Currency & Authoritative Pricing
  billing_currency: string;
  master_currency: 'USD';
  master_price: number; // Authoritative USD base price
  master_price_usd: number; // Backward compatibility alias
  current_price: number; // Billed local amount (zero decimal format)
  billed_amount: number; // Backward compatibility alias

  // Conversion Metadata
  exchange_rate?: number;
  exchange_rate_source?: string;
  exchange_rate_timestamp?: string;

  // Lifecycle Timestamps & Periods
  current_period_start: string;
  current_period_end: string;
  renewal_date: string;
  trial_start?: string | null;
  trial_end?: string | null;
  cancel_at_period_end: boolean;
  cancelled_at?: string | null;

  // Payment Status & External Integration Identifiers
  payment_status: 'paid' | 'pending' | 'failed' | 'requires_action' | 'trialing' | string;
  external_customer_id?: string | null;
  external_subscription_id?: string | null;

  // Audit Timestamps
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'partially_paid'
  | 'past_due'
  | 'void'
  | 'uncollectible'
  | 'cancelled';

export type InvoicePaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'partially_paid'
  | 'failed'
  | 'refunded'
  | 'waived';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface SubscriptionInvoice {
  // Canonical Sequence 14 Mandatory Fields
  invoice_id: string;
  organization_id: string;
  subscription_id: string;
  invoice_number: string;
  invoice_date: string;
  billing_period: BillingPeriod;
  due_date: string;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  payment_status: InvoicePaymentStatus;
  invoice_status: InvoiceStatus;
  payment_method: string;
  external_invoice_id: string;
  created_at: string;
  updated_at: string;

  // Compatibility & Presentation Aliases
  id: string;
  organization_name?: string;
  plan_id?: string;
  plan_name?: string;
  billing_date?: string;
  billing_currency?: string;
  billed_amount?: number;
  master_price_usd?: number;
  exchange_rate?: number;
  exchange_rate_source?: string;
  status?: string;
  custom_schedule?: CustomBillingSchedule;
  download_url?: string;
  line_items?: InvoiceLineItem[];
  notes?: string;
  immutable?: boolean;
}

export type PrintDocumentType =
  | 'invoice'
  | 'receipt'
  | 'tenant_statement'
  | 'property_report'
  | 'building_report'
  | 'service_ticket'
  | 'work_order'
  | 'maintenance_report'
  | 'compliance_dossier'
  | 'dashboard_executive'
  | 'ai_analysis'
  | 'general_report';

export interface PrintDocumentPayload {
  type: PrintDocumentType;
  title: string;
  documentNumber?: string;
  propertyId?: string;
  propertyName?: string;
  buildingName?: string;
  unitNumber?: string;
  tenantName?: string;
  date?: string;
  dueDate?: string;
  originalCurrency?: string;
  originalAmount?: number;
  displayCurrency?: string;
  displayAmount?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
  sections: Array<{
    title?: string;
    description?: string;
    items?: Array<{ label: string; value: string | number; highlight?: boolean }>;
    table?: {
      headers: string[];
      rows: Array<Array<string | number>>;
      summary?: Array<{ label: string; value: string | number }>;
    };
    checklist?: Array<{ text: string; completed: boolean }>;
    notes?: string;
  }>;
  meta?: {
    filtersApplied?: Record<string, string>;
    generatedBy?: string;
    userRole?: string;
    timestamp?: string;
    confidentialityNotice?: string;
    notes?: string[];
    signaturesRequired?: string[];
  };
}

export interface PrintConfig {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeBranding: boolean;
  includeDate: boolean;
  includeFilters: boolean;
  includeConfidentiality: boolean;
  includeSignatures: boolean;
  currencyMode: 'base' | 'preferred';
}

export interface PrintAuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  documentType: PrintDocumentType;
  documentTitle: string;
  documentNumber?: string;
  action: 'printed' | 'exported_pdf' | 'previewed';
  organizationId: string;
  ipAddress: string;
}

// ==========================================
// SEQUENCE 12 — UPGRADE ENGINE TYPES
// ==========================================

export type UpgradeStepId =
  | 'current_plan'
  | 'select_new_plan'
  | 'validate_plan'
  | 'validate_payment'
  | 'calculate_billing_adjustment'
  | 'change_subscription'
  | 'update_entitlements'
  | 'update_capacity'
  | 'generate_invoice'
  | 'record_history'
  | 'notify_customer';

export interface UpgradeStepExecution {
  step: UpgradeStepId;
  stepNumber: number;
  title: string;
  status: 'completed' | 'in_progress' | 'failed' | 'skipped';
  timestamp: string;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface UpgradePaymentValidation {
  methodType: 'card' | 'bank_transfer' | 'corporate_invoice' | 'waived_free';
  valid: boolean;
  cardLast4?: string;
  cardBrand?: string;
  authCode?: string;
  reason?: string;
}

export interface BillingAdjustmentDetails {
  previousPlanId: string;
  previousPlanName: string;
  targetPlanId: string;
  targetPlanName: string;
  billingPeriod: BillingPeriod;
  billingCurrency: string;
  masterPriceUsd: number;
  targetPriceLocal: number;
  unusedCreditUsd: number;
  unusedCreditLocal: number;
  proratedChargeUsd: number;
  proratedChargeLocal: number;
  netAdjustmentUsd: number;
  netAdjustmentLocal: number;
  daysRemainingInCycle: number;
  totalDaysInCycle: number;
  cycleEffectiveStart: string;
  cycleEffectiveEnd: string;
  exchangeRateUsed: number;
  exchangeRateSource: string;
  formulaExplanation: string;
}

export interface UpgradeRequestPayload {
  targetPlanId: SubscriptionPlanId;
  billingPeriod?: BillingPeriod;
  customSchedule?: CustomBillingSchedule;
  billingCurrency?: string;
  paymentMethod?: {
    type?: 'card' | 'bank_transfer' | 'corporate_invoice';
    cardNumber?: string;
    cardExpMonth?: string;
    cardExpYear?: string;
    cardCvc?: string;
    cardholderName?: string;
    paymentTermsDays?: number;
  };
  initiatedBy?: string;
}

export interface UpgradeExecutionResult {
  success: boolean;
  organizationId: string;
  subscription: CustomerSubscription;
  invoice: SubscriptionInvoice;
  adjustment: BillingAdjustmentDetails;
  newlyUnlockedFeatures: FeatureKey[];
  allEntitledFeatures: FeatureKey[];
  previousCapacity: PlanCapacityLimits;
  updatedCapacity: PlanCapacityLimits;
  historyRecord: SubscriptionHistoryRecord;
  notification: AppNotification;
  stepsTrace: UpgradeStepExecution[];
  error?: string;
}


