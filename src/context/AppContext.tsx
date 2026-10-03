import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Language,
  Currency,
  UserRole,
  Organization,
  Property,
  Building,
  Unit,
  Tenant,
  Lease,
  ServiceTicket,
  WorkOrder,
  BuildingAsset,
  PreventiveMaintenancePlan,
  Contractor,
  RFQ,
  FinancialRecord,
  UtilityMeter,
  SecurityIncident,
  ComplianceCertificate,
  FacilityTask,
  AutomationRule,
  AuditLog,
  AppNotification,
  UserProfile,
  OrganizationBranding,
  PrintDocumentPayload,
  SubscriptionPlan,
  CustomerSubscription,
  SubscriptionInvoice,
  CountryConfiguration,
  SubscriptionHistoryRecord,
  SubscriptionHistoryEventType,
  SubscriptionLifecycleEvent,
  BillingPeriod,
  BillingPeriodDefinition,
  CustomBillingSchedule,
  CapacityUsage,
  CapacityValidationResult,
  PlanCapacityLimits,
  CentralizedUsageMonitoring,
  ResourceUsageMetric,
  FeatureKey,
  FeatureCheckResult,
  FeatureEntitlementEngineState,
  AccessDecision,
  UpgradeRequestPayload,
  UpgradeExecutionResult,
  InvoiceStatus,
  InvoicePaymentStatus,
} from '../types';
import {
  getInvoicesForOrganization,
  recordInvoicePayment,
  transitionInvoiceStatus as transitionInvoiceStatusEngine,
  saveInvoice,
  normalizeInvoiceRecord,
  isInvoiceImmutable,
} from '../services/invoiceEngine';
import {
  executeSecureUpgrade,
  calculateBillingAdjustment,
} from '../services/upgradeEngineService';
import {
  validateAddProperty,
  validateAddUnit,
  validateAddBuilding,
  calculateCapacityUsage,
  getPlanCapacityLimits,
  AUTHORITATIVE_CAPACITY_LIMITS,
} from '../services/capacityEngine';
import {
  calculateCentralizedUsage,
  validateResourceCapacity,
} from '../services/usageMonitoringService';
import {
  isFeatureEntitled,
  checkFeatureEntitlement,
  getPlanEntitlements,
  getFeatureEntitlementState,
} from '../services/featureEntitlementEngine';
import {
  evaluateFeatureAccess,
} from '../services/accessControlEngine';
import {
  normalizeSubscriptionRecord,
  indexSubscription,
  validateSubscriptionConstraints,
  initializeSubscriptionDatabase,
  transitionSubscriptionLifecycle,
  getSubscriptionHistory,
} from '../services/subscriptionService';
import {
  recordSubscriptionHistory as recordSubscriptionHistoryEngine,
} from '../services/subscriptionHistoryEngine';
import {
  getMasterPriceUsd,
} from '../services/masterPricingService';
import {
  createBillingNotification,
  dispatchBillingNotification,
  BillingNotificationEvent,
} from '../services/billingNotificationService';
import {
  calculatePeriodDates,
  calculatePlanPriceForPeriod,
  getAllBillingPeriods,
} from '../services/billingPeriodService';
import {
  recordTenantSwitch,
  validateTenantAccess,
} from '../services/multiTenantSecurityService';
import {
  BillingPermission,
  BillingAuditAction,
  BillingAuditActor,
  BillingAuditLogEntry,
} from '../types';
import {
  hasBillingPermission,
  getBillingPermissionsForRole,
  getPermissionDenialExplanation,
} from '../services/billingRbacEngine';
import {
  recordBillingAuditEntry,
  getBillingAuditLogs,
  verifyAuditLedgerIntegrity,
  exportBillingAuditLogs,
  seedInitialBillingAuditLogs,
  billingAuditLogger,
  BILLING_AUDIT_ACTIONS,
  runBillingAuditTestSuite,
} from '../services/billingAuditLogEngine';
import {
  captureAdminPayment as executeAdminPaymentCapture,
  logAdministrativeBillingAction,
  type CapturePaymentResult,
} from '../services/adminBillingManagementService';
import {
  type HumanAuthorizationRequest,
  getHumanAuthorizationRequests,
  executeHumanAuthorizationDecision,
  processAiBillingQuery,
  runAiBillingSafetyTestSuite,
} from '../services/aiBillingSafetyService';
import {
  initialOrganizations,
  subscriptionPlans,
  initialProperties,
  initialBuildings,
  initialUnits,
  initialTenants,
  initialLeases,
  initialServiceTickets,
  initialWorkOrders,
  initialBuildingAssets,
  initialPreventivePlans,
  initialContractors,
  initialRFQs,
  initialFinancialRecords,
  initialUtilityMeters,
  initialSecurityIncidents,
  initialComplianceCertificates,
  initialFacilityTasks,
  initialAutomationRules,
  initialAuditLogs,
  initialNotifications,
  demoUsers,
} from '../data/mockDatabase';
import { translations } from '../i18n/translations';
import {
  getCountryCurrencyDefaults,
  getCountryConfiguration,
  convertSubscriptionPrice,
  formatSubscriptionPrice,
} from '../services/currencyService';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: UserProfile;
  organization: Organization;
  setOrganization: (org: Organization) => void;
  switchOrganization: (targetOrgId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  t: (typeof translations)['en'];

  // Core Data
  properties: Property[];
  buildings: Building[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  tickets: ServiceTicket[];
  workOrders: WorkOrder[];
  assets: BuildingAsset[];
  preventivePlans: PreventiveMaintenancePlan[];
  contractors: Contractor[];
  rfqs: RFQ[];
  financialRecords: FinancialRecord[];
  utilityMeters: UtilityMeter[];
  securityIncidents: SecurityIncident[];
  complianceCertificates: ComplianceCertificate[];
  facilityTasks: FacilityTask[];
  automationRules: AutomationRule[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  currentLanguage: Language;
  addNotification: (notif: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'emergency' | 'success';
    linkTab?: string;
  }) => void;

  // Multi-Currency Management
  organizationBaseCurrency: string;
  userPreferredCurrency: string;
  setUserPreferredCurrency: (curr: string) => void;
  updateOrganizationBaseCurrency: (newCurrency: string, reason?: string) => void;
  updateOrganizationCountry: (countryName: string) => void;
  updateOrganizationBranding: (branding: Partial<OrganizationBranding>) => void;
  customExchangeRates: Record<string, number>;
  updateCustomExchangeRate: (currencyCode: string, rateToUSD: number) => void;

  // Subscription & Billing Core
  subscriptionPlans: SubscriptionPlan[];
  activeSubscription: CustomerSubscription;
  subscriptionHistory: SubscriptionHistoryRecord[];
  billingPeriods: BillingPeriodDefinition[];
  changeSubscriptionPlan: (
    planId: SubscriptionPlan['id'],
    billingPeriod?: BillingPeriod,
    customSchedule?: CustomBillingSchedule
  ) => Promise<{ success: boolean; message: string }>;
  cancelSubscription: (immediate?: boolean) => Promise<{ success: boolean; message: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; message: string }>;
  executeSubscriptionLifecycle: (
    event: SubscriptionLifecycleEvent,
    params?: {
      targetPlanId?: string;
      reason?: string;
      immediate?: boolean;
      billingPeriod?: BillingPeriod;
      customSchedule?: CustomBillingSchedule;
    }
  ) => Promise<{ success: boolean; message: string; history?: SubscriptionHistoryRecord }>;
  updateOrganizationBillingCurrency: (currencyCode: string) => void;
  exchangeRateUnavailable: boolean;
  setExchangeRateUnavailable: (unavailable: boolean) => void;
  countryConfig: CountryConfiguration;
  // SEQUENCE 28: Authoritative Billing RBAC Permissions
  billingPermissions: Record<BillingPermission, boolean>;
  canPerformBillingAction: (action: BillingPermission) => boolean;

  // SEQUENCE 29: Authoritative Billing Audit Log
  billingAuditLogs: BillingAuditLogEntry[];
  refreshBillingAuditLogs: () => void;
  recordBillingAudit: (
    action: BillingAuditAction,
    previousValue: any,
    newValue: any,
    metadata?: Record<string, any>
  ) => BillingAuditLogEntry;
  verifyAuditLedger: () => ReturnType<typeof verifyAuditLedgerIntegrity>;
  exportBillingAudit: (format?: 'json' | 'csv') => string;

  // SEQUENCE 30: Platform Admin Billing Management
  captureAdminPayment: (params: {
    organizationId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionReference?: string;
    administrativeNotes?: string;
  }) => Promise<CapturePaymentResult>;
  logAdminAction: (params: {
    organizationId: string;
    action: string;
    notes: string;
    targetInvoiceId?: string;
    capturedAmount?: number;
  }) => void;

  // SEQUENCE 32: AI Billing Safety Co-Pilot & Human Authorization Gate
  aiBillingAuthRequests: HumanAuthorizationRequest[];
  refreshAiBillingAuthRequests: () => void;
  askAiBillingAssistant: (prompt: string, actionPayload?: any) => Promise<any>;
  authorizeBillingAction: (requestId: string, notes?: string, signature?: string) => Promise<any>;
  rejectBillingAction: (requestId: string, reason?: string) => Promise<any>;
  runAiBillingSafetySuite: () => Promise<any>;

  // Universal Printing & Document Engine
  isPrintModalOpen: boolean;
  currentPrintPayload: PrintDocumentPayload | null;
  openPrint: (payload: PrintDocumentPayload) => void;
  closePrint: () => void;

  // Subscription Capacity Engine & Usage Monitoring (Sequence 07 & 08)
  capacityUsage: CapacityUsage;
  validatePropertyAddition: () => CapacityValidationResult;
  validateUnitAddition: (propertyId?: string) => CapacityValidationResult;
  usageMonitoring: CentralizedUsageMonitoring;
  simulateUsageScenario: (scenario: 'normal' | 'approaching_units' | 'reached_units' | 'approaching_properties' | null) => void;
  currentSimulation: string | null;
  addBuilding: (building: Omit<Building, 'id'>) => Promise<{ success: boolean; message?: string; building?: Building }>;
  validateBuildingAddition: () => CapacityValidationResult;

  // Feature Entitlement Engine (Sequence 09)
  hasFeature: (feature: FeatureKey) => boolean;
  checkFeature: (feature: FeatureKey) => FeatureCheckResult;
  entitledFeatures: FeatureKey[];
  featureEntitlementsState: FeatureEntitlementEngineState;

  // Feature Access Control Authorization Flow (Sequence 10)
  evaluateAccess: (feature: FeatureKey) => AccessDecision;
  canAccess: (feature: FeatureKey) => boolean;

  // Authoritative Secure Upgrade Engine (Sequence 12)
  executeUpgrade: (payload: UpgradeRequestPayload) => Promise<UpgradeExecutionResult>;

  // Authoritative Invoice Engine (Sequence 14)
  invoices: SubscriptionInvoice[];
  payInvoice: (invoiceId: string, paymentAmount?: number, paymentMethod?: string) => Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }>;
  transitionInvoiceStatus: (invoiceId: string, targetStatus: InvoiceStatus, reason?: string) => Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }>;
  createInvoice: (invoiceData: Partial<SubscriptionInvoice>) => Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }>;
  refreshInvoices: () => void;

  // Subscription Provenance History Engine (Sequence 16)
  refreshSubscriptionHistory: () => void;
  recordSubscriptionHistoryEntry: (payload: Partial<SubscriptionHistoryRecord> & {
    event: SubscriptionHistoryEventType;
    new_plan: string;
    new_price: number;
    billing_period: BillingPeriod | string;
    change_reason: string;
    changed_by: string;
    effective_date?: string;
    previous_plan?: string | null;
    previous_price?: number | null;
  }) => Promise<{ success: boolean; record?: SubscriptionHistoryRecord; error?: string }>;

  // Data Manipulation Actions
  addProperty: (property: Omit<Property, 'id'>) => Promise<{ success: boolean; message?: string; property?: Property }>;
  addUnit: (unit: Omit<Unit, 'id'>) => Promise<{ success: boolean; message?: string; unit?: Unit }>;
  addTenant: (tenant: Omit<Tenant, 'id' | 'joinedDate'>, lease: Omit<Lease, 'id' | 'leaseNumber' | 'daysRemaining'>) => void;
  addServiceTicket: (ticket: Omit<ServiceTicket, 'id' | 'code' | 'createdAt' | 'slaBreached'>) => void;
  updateTicketStatus: (ticketId: string, status: ServiceTicket['status'], notes?: string) => void;
  createWorkOrderFromTicket: (ticketId: string, assignedTo: string, isContractor: boolean) => void;
  updateWorkOrderStatus: (workOrderId: string, status: WorkOrder['status']) => void;
  toggleWorkOrderChecklist: (workOrderId: string, itemIndex: number) => void;
  recordRentPayment: (tenantId: string, amount: number) => void;
  submitContractorQuote: (rfqId: string, contractorId: string, contractorName: string, amount: number, estimatedDays: number, notes: string) => void;
  awardRFQQuote: (rfqId: string, quoteIndex: number) => void;
  addSecurityIncident: (incident: Omit<SecurityIncident, 'id' | 'incidentNumber' | 'timestamp'>) => void;
  toggleAutomationRule: (ruleId: string) => void;
  markNotificationRead: (notifId: string) => void;
  addAuditLog: (action: string, entityType: string, entityId: string, previousValue?: string, newValue?: string) => void;
  resetToDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('cnt_lang') as Language) || 'en';
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem('cnt_curr') as Currency) || 'USD';
  });

  const [userRole, setUserRole] = useState<UserRole>('property_manager');
  const [organization, setOrganization] = useState<Organization>(() => {
    const saved = localStorage.getItem('cnt_organization');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return initialOrganizations[0];
  });
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryRecord[]>(() => {
    const saved = localStorage.getItem('cnt_subscription_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return getSubscriptionHistory({ organizationId: organization.id });
  });
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>(() => {
    const fromRepo = getInvoicesForOrganization(organization.id);
    if (fromRepo.length > 0) return fromRepo;
    return (organization.subscriptionInvoices || []).map((inv) => normalizeInvoiceRecord(inv));
  });

  // Sync invoices whenever active organization changes
  useEffect(() => {
    const list = getInvoicesForOrganization(organization.id);
    if (list.length > 0) {
      setInvoices(list);
    } else if (organization.subscriptionInvoices && organization.subscriptionInvoices.length > 0) {
      setInvoices(organization.subscriptionInvoices.map((inv) => normalizeInvoiceRecord(inv)));
    } else {
      setInvoices([]);
    }
  }, [organization.id]);

  const [exchangeRateUnavailable, setExchangeRateUnavailable] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  // Stored state collections with localStorage fallback
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('cnt_properties');
    return saved ? JSON.parse(saved) : initialProperties;
  });

  const [buildings, setBuildings] = useState<Building[]>(() => {
    const saved = localStorage.getItem('cnt_buildings');
    return saved ? JSON.parse(saved) : initialBuildings;
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('cnt_units');
    return saved ? JSON.parse(saved) : initialUnits;
  });

  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('cnt_tenants');
    return saved ? JSON.parse(saved) : initialTenants;
  });

  const [leases, setLeases] = useState<Lease[]>(() => {
    const saved = localStorage.getItem('cnt_leases');
    return saved ? JSON.parse(saved) : initialLeases;
  });

  const [tickets, setTickets] = useState<ServiceTicket[]>(() => {
    const saved = localStorage.getItem('cnt_tickets');
    return saved ? JSON.parse(saved) : initialServiceTickets;
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => {
    const saved = localStorage.getItem('cnt_work_orders');
    return saved ? JSON.parse(saved) : initialWorkOrders;
  });

  const [assets, setAssets] = useState<BuildingAsset[]>(() => {
    const saved = localStorage.getItem('cnt_assets');
    return saved ? JSON.parse(saved) : initialBuildingAssets;
  });

  const [preventivePlans, setPreventivePlans] = useState<PreventiveMaintenancePlan[]>(() => {
    const saved = localStorage.getItem('cnt_preventive');
    return saved ? JSON.parse(saved) : initialPreventivePlans;
  });

  const [contractors, setContractors] = useState<Contractor[]>(() => {
    const saved = localStorage.getItem('cnt_contractors');
    return saved ? JSON.parse(saved) : initialContractors;
  });

  const [rfqs, setRfqs] = useState<RFQ[]>(() => {
    const saved = localStorage.getItem('cnt_rfqs');
    return saved ? JSON.parse(saved) : initialRFQs;
  });

  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(() => {
    const saved = localStorage.getItem('cnt_financials');
    return saved ? JSON.parse(saved) : initialFinancialRecords;
  });

  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>(() => {
    const saved = localStorage.getItem('cnt_meters');
    return saved ? JSON.parse(saved) : initialUtilityMeters;
  });

  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>(() => {
    const saved = localStorage.getItem('cnt_incidents');
    return saved ? JSON.parse(saved) : initialSecurityIncidents;
  });

  const [complianceCertificates, setComplianceCertificates] = useState<ComplianceCertificate[]>(() => {
    const saved = localStorage.getItem('cnt_compliance');
    return saved ? JSON.parse(saved) : initialComplianceCertificates;
  });

  const [facilityTasks, setFacilityTasks] = useState<FacilityTask[]>(() => {
    const saved = localStorage.getItem('cnt_facilities');
    return saved ? JSON.parse(saved) : initialFacilityTasks;
  });

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem('cnt_automations');
    return saved ? JSON.parse(saved) : initialAutomationRules;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('cnt_audit');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('cnt_notifs');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const addNotification = useCallback((notif: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'emergency' | 'success';
    linkTab?: string;
  }) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        timestamp: 'Just now',
        read: false,
        linkTab: notif.linkTab,
      },
      ...prev,
    ]);
  }, []);

  // Current active user matching role
  const currentUser: UserProfile = demoUsers.find((u) => u.role === userRole) || demoUsers[0];

  const activeSubscription: CustomerSubscription = organization.subscriptionRecord
    ? normalizeSubscriptionRecord(organization.subscriptionRecord)
    : normalizeSubscriptionRecord({
        subscription_id: `sub-${organization.id}`,
        id: `sub-${organization.id}`,
        organization_id: organization.id,
        plan_id: organization.planId,
        plan_name: subscriptionPlans.find((p) => p.id === organization.planId)?.plan_name || 'CNTEstates Business / Plus',
        subscription_status: organization.subscriptionStatus,
        status: organization.subscriptionStatus,
        master_price: subscriptionPlans.find((p) => p.id === organization.planId)?.master_price || 249,
        master_price_usd: subscriptionPlans.find((p) => p.id === organization.planId)?.master_price || 249,
        billing_currency: organization.billingCurrency || organization.baseCurrency || 'ZAR',
        current_price: organization.monthlySpend || 4445,
        billed_amount: organization.monthlySpend || 4445,
        exchange_rate: 17.85,
        exchange_rate_source: 'International Financial Reference & Central Bank Mid-Market Rates',
        exchange_rate_timestamp: '2026-09-26T08:00:00Z',
        billing_period: 'monthly',
        current_period_start: '2026-09-15',
        current_period_end: '2026-10-15',
        renewal_date: '2026-10-15',
        cancel_at_period_end: false,
        payment_status: 'paid',
        created_at: organization.createdAt,
        updated_at: '2026-09-15T08:00:00Z',
      });

  // Functional Base Currency & User Preferred Currency State
  const [organizationBaseCurrency, setOrganizationBaseCurrency] = useState<string>(() => {
    return localStorage.getItem('cnt_base_curr') || initialOrganizations[0].baseCurrency || 'ZAR';
  });

  const [userPreferredCurrency, setUserPreferredCurrencyState] = useState<string>(() => {
    return localStorage.getItem('cnt_pref_curr') || initialOrganizations[0].baseCurrency || 'ZAR';
  });

  const [customExchangeRates, setCustomExchangeRates] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('cnt_custom_rates');
    return saved ? JSON.parse(saved) : {};
  });

  // SEQUENCE 29: Authoritative Billing Audit Log State & Handlers
  const [billingAuditLogs, setBillingAuditLogs] = useState<BillingAuditLogEntry[]>(() => {
    seedInitialBillingAuditLogs(organization.id);
    return getBillingAuditLogs({ organizationId: organization.id });
  });

  const refreshBillingAuditLogs = useCallback(() => {
    const list = getBillingAuditLogs(userRole === 'platform_admin' ? undefined : { organizationId: organization.id });
    setBillingAuditLogs(list);
  }, [organization.id, userRole]);

  useEffect(() => {
    seedInitialBillingAuditLogs(organization.id);
    refreshBillingAuditLogs();
  }, [organization.id, refreshBillingAuditLogs]);

  const recordBillingAudit = useCallback((
    action: BillingAuditAction,
    previousValue: any,
    newValue: any,
    metadata?: Record<string, any>
  ): BillingAuditLogEntry => {
    const actor: BillingAuditActor = {
      id: currentUser.id || 'usr-1',
      name: currentUser.name || (userRole === 'platform_admin' ? 'Platform Administrator' : 'Alex Vance'),
      role: userRole,
      type: (userRole as string) === 'system' ? 'system' : 'user',
      ipAddress: '127.0.0.1 (client_session)',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    const entry = recordBillingAuditEntry({
      organizationId: organization.id,
      organizationName: organization.name,
      actor,
      action,
      previousValue: previousValue !== undefined ? previousValue : null,
      newValue: newValue !== undefined ? newValue : {},
      metadata,
    });

    setBillingAuditLogs((prev) => [entry, ...prev]);

    // Mirror to server endpoint asynchronously
    try {
      fetch('/api/billing/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-user-role': userRole,
          'x-user-id': currentUser.id || 'usr-1',
        },
        body: JSON.stringify({
          action,
          previousValue,
          newValue,
          correlationId: entry.correlationId,
          requestId: entry.requestId,
          metadata,
        }),
      }).catch(() => {});
    } catch {}

    return entry;
  }, [organization.id, organization.name, currentUser, userRole]);

  const verifyAuditLedger = useCallback(() => {
    return verifyAuditLedgerIntegrity();
  }, []);

  const exportBillingAudit = useCallback((format: 'json' | 'csv' = 'json') => {
    return exportBillingAuditLogs(format, organization.id);
  }, [organization.id]);

  // SEQUENCE 30: Platform Admin Billing Management
  const captureAdminPayment = useCallback(async (params: {
    organizationId: string;
    invoiceId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionReference?: string;
    administrativeNotes?: string;
  }): Promise<CapturePaymentResult> => {
    const adminActor: BillingAuditActor = {
      id: currentUser.id || 'platform-admin-01',
      name: currentUser.name || 'Platform Administrator',
      role: 'platform_admin',
      type: 'user',
    };

    const res = executeAdminPaymentCapture({
      ...params,
      adminActor,
    });

    if (res.success) {
      // Update local invoice state if active organization or matching invoice
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoice_id === params.invoiceId || inv.id === params.invoiceId
            ? {
                ...inv,
                status: 'paid',
                invoice_status: 'paid',
                payment_status: 'paid',
                amount_paid: (inv.amount_paid || 0) + params.amount,
                amount_due: 0,
                updated_at: new Date().toISOString(),
              }
            : inv
        )
      );

      // Refresh billing audit logs
      refreshBillingAuditLogs();

      addNotification({
        title: 'Admin Payment Captured',
        message: res.message,
        type: 'success',
      });

      // Sync with server route
      try {
        fetch(`/api/admin/billing/organizations/${params.organizationId}/capture-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': params.organizationId,
            'x-user-role': 'platform_admin',
            'x-user-id': currentUser.id || 'platform-admin-01',
          },
          body: JSON.stringify(params),
        }).catch(() => {});
      } catch {}
    } else {
      addNotification({
        title: 'Payment Capture Failed',
        message: res.error || res.message,
        type: 'warning',
      });
    }

    return res;
  }, [currentUser, refreshBillingAuditLogs, addNotification]);

  const logAdminAction = useCallback((params: {
    organizationId: string;
    action: string;
    notes: string;
    targetInvoiceId?: string;
    capturedAmount?: number;
  }) => {
    const adminActor: BillingAuditActor = {
      id: currentUser.id || 'platform-admin-01',
      name: currentUser.name || 'Platform Administrator',
      role: 'platform_admin',
      type: 'user',
    };

    logAdministrativeBillingAction({
      organizationId: params.organizationId,
      action: params.action,
      notes: params.notes,
      adminActor,
      targetInvoiceId: params.targetInvoiceId,
      capturedAmount: params.capturedAmount,
    });

    try {
      fetch('/api/admin/billing/actions/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': params.organizationId,
          'x-user-role': 'platform_admin',
          'x-user-id': currentUser.id || 'platform-admin-01',
        },
        body: JSON.stringify(params),
      }).catch(() => {});
    } catch {}
  }, [currentUser]);

  // SEQUENCE 32: AI Billing Safety State & Human Authorization Gate
  const [aiBillingAuthRequests, setAiBillingAuthRequests] = useState<HumanAuthorizationRequest[]>(() => {
    return getHumanAuthorizationRequests(organization.id);
  });

  const refreshAiBillingAuthRequests = useCallback(() => {
    setAiBillingAuthRequests(getHumanAuthorizationRequests(organization.id));
  }, [organization.id]);

  const askAiBillingAssistant = useCallback(
    async (prompt: string, actionPayload?: any) => {
      try {
        const res = await fetch('/api/ai/billing/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': organization.id,
            'x-user-role': userRole,
            'x-user-id': currentUser.id || 'usr-1',
          },
          body: JSON.stringify({ prompt, actionPayload }),
        });
        const data = await res.json();
        if (data.authorizationRequest) {
          setAiBillingAuthRequests((prev) => [
            data.authorizationRequest,
            ...prev.filter((r) => r.id !== data.authorizationRequest.id),
          ]);
        }
        return data;
      } catch {
        // Fallback to authoritative local engine
        const local = processAiBillingQuery({
          prompt,
          organizationId: organization.id,
          userRole,
          requestedActionPayload: actionPayload,
        });
        if (local.authorizationRequest) {
          setAiBillingAuthRequests((prev) => [
            local.authorizationRequest!,
            ...prev.filter((r) => r.id !== local.authorizationRequest!.id),
          ]);
        }
        return local;
      }
    },
    [organization.id, userRole, currentUser.id]
  );

  const authorizeBillingAction = useCallback(
    async (requestId: string, notes?: string, signature?: string) => {
      const actorUserId = currentUser.id || 'usr-1';
      const actorRole = userRole;
      const actorName = currentUser.name || 'Authorized User';

      const localResult = executeHumanAuthorizationDecision({
        requestId,
        actorUserId,
        actorRole,
        actorName,
        decision: 'authorize',
        notes,
        signatureConfirmation: signature || 'CONFIRMED_HUMAN_SIGN_OFF',
      });

      if (localResult.success) {
        setAiBillingAuthRequests((prev) =>
          prev.map((r) => (r.id === requestId ? localResult.request : r))
        );
        refreshBillingAuditLogs();
        addNotification({
          title: 'Action Authorized by Human',
          message: localResult.message,
          type: 'success',
        });

        try {
          fetch(`/api/ai/billing/authorization-requests/${requestId}/authorize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-organization-id': organization.id,
              'x-user-role': userRole,
              'x-user-id': actorUserId,
            },
            body: JSON.stringify({
              actorUserId,
              actorRole,
              actorName,
              notes,
              signatureConfirmation: signature,
            }),
          }).catch(() => {});
        } catch {}
      } else {
        addNotification({
          title: 'Authorization Denied',
          message: localResult.message,
          type: 'warning',
        });
      }

      return localResult;
    },
    [currentUser, userRole, organization.id, refreshBillingAuditLogs, addNotification]
  );

  const rejectBillingAction = useCallback(
    async (requestId: string, reason?: string) => {
      const actorUserId = currentUser.id || 'usr-1';
      const actorRole = userRole;
      const actorName = currentUser.name || 'Authorized User';

      const localResult = executeHumanAuthorizationDecision({
        requestId,
        actorUserId,
        actorRole,
        actorName,
        decision: 'reject',
        notes: reason,
      });

      if (localResult.success) {
        setAiBillingAuthRequests((prev) =>
          prev.map((r) => (r.id === requestId ? localResult.request : r))
        );
        refreshBillingAuditLogs();
        addNotification({
          title: 'AI Action Rejected',
          message: localResult.message,
          type: 'info',
        });

        try {
          fetch(`/api/ai/billing/authorization-requests/${requestId}/reject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-organization-id': organization.id,
              'x-user-role': userRole,
              'x-user-id': actorUserId,
            },
            body: JSON.stringify({
              actorUserId,
              actorRole,
              actorName,
              reason,
            }),
          }).catch(() => {});
        } catch {}
      }

      return localResult;
    },
    [currentUser, userRole, organization.id, refreshBillingAuditLogs, addNotification]
  );

  const runAiBillingSafetySuite = useCallback(async () => {
    return runAiBillingSafetyTestSuite();
  }, []);

  // Universal Printing State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentPrintPayload, setCurrentPrintPayload] = useState<PrintDocumentPayload | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cnt_lang', lang);
  };

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('cnt_curr', curr);
  };

  const setUserPreferredCurrency = (curr: string) => {
    setUserPreferredCurrencyState(curr);
    setCurrencyState(curr as Currency);
    localStorage.setItem('cnt_pref_curr', curr);
    localStorage.setItem('cnt_curr', curr);
  };

  const updateOrganizationBaseCurrency = (newCurrency: string, reason?: string) => {
    const oldCurrency = organizationBaseCurrency;
    setOrganizationBaseCurrency(newCurrency);
    localStorage.setItem('cnt_base_curr', newCurrency);
    setOrganization((prev) => ({
      ...prev,
      baseCurrency: newCurrency as Currency,
      currency: newCurrency as Currency,
      financialSettings: prev.financialSettings
        ? { ...prev.financialSettings, baseCurrency: newCurrency as Currency }
        : undefined,
    }));
    addAuditLog(
      'ORGANIZATION_BASE_CURRENCY_CHANGED',
      'OrganizationFinancialSettings',
      organization.id,
      oldCurrency,
      `${newCurrency} (Reason: ${reason || 'Administrative Base Currency Adjustment'})`
    );
  };

  const updateOrganizationCountry = (countryName: string) => {
    // SEQUENCE 28: Enforce RBAC permission for changing billing information
    if (!hasBillingPermission(userRole, 'change_billing_info')) {
      const denialReason = getPermissionDenialExplanation(userRole, 'change_billing_info');
      addAuditLog('RBAC_PERMISSION_DENIED', 'OrganizationCountry', organization.id, userRole, denialReason);
      addNotification({
        title: 'RBAC Access Denied: Change Billing Information',
        message: denialReason,
        type: 'warning',
      });
      return;
    }

    const countryConfig = getCountryConfiguration(countryName);
    const oldCountry = organization.operatingCountry || organization.country;
    const oldCurrency = organizationBaseCurrency;

    setOrganizationBaseCurrency(countryConfig.default_currency);
    localStorage.setItem('cnt_base_curr', countryConfig.default_currency);

    // Calculate current subscription price converted to new billing currency
    const currentPlan = subscriptionPlans.find((p) => p.id === organization.planId) || subscriptionPlans[4];
    const conversion = convertSubscriptionPrice(
      currentPlan.master_price,
      countryConfig.default_currency,
      customExchangeRates,
      exchangeRateUnavailable
    );

    setOrganization((prev) => {
      const updatedOrg: Organization = {
        ...prev,
        operatingCountry: countryConfig.country_name,
        country: countryConfig.country_name,
        baseCurrency: countryConfig.default_currency as Currency,
        currency: countryConfig.default_currency as Currency,
        billingCurrency: countryConfig.default_currency,
        timezone: countryConfig.legal_operational_timezone,
        monthlySpend: conversion.convertedPrice,
        financialSettings: prev.financialSettings
          ? {
              ...prev.financialSettings,
              operatingCountry: countryConfig.country_name,
              baseCurrency: countryConfig.default_currency as Currency,
            }
          : undefined,
        subscriptionRecord: prev.subscriptionRecord
          ? {
              ...prev.subscriptionRecord,
              billing_currency: countryConfig.default_currency,
              billed_amount: conversion.convertedPrice,
              exchange_rate: conversion.exchangeRate,
              exchange_rate_source: conversion.exchangeRateSource,
              exchange_rate_timestamp: conversion.effectiveAt,
              updated_at: new Date().toISOString(),
            }
          : undefined,
      };
      localStorage.setItem('cnt_organization', JSON.stringify(updatedOrg));
      return updatedOrg;
    });

    addAuditLog(
      'ORGANIZATION_COUNTRY_CHANGED',
      'OrganizationProfile',
      organization.id,
      `${oldCountry} (${oldCurrency})`,
      `${countryName} -> Base & Billing Currency set to ${countryConfig.default_currency}, Timezone: ${countryConfig.legal_operational_timezone}`
    );

    // SEQUENCE 29: Immutable Billing Audit Log
    recordBillingAudit(
      'billing_information_updated',
      { operatingCountry: oldCountry, billingCurrency: oldCurrency },
      { operatingCountry: countryName, billingCurrency: countryConfig.default_currency, reason: 'Operating country migration' },
      { legalTimezone: countryConfig.legal_operational_timezone }
    );
  };

  const updateOrganizationBillingCurrency = (currencyCode: string) => {
    // SEQUENCE 28: Enforce RBAC permission for changing billing information
    if (!hasBillingPermission(userRole, 'change_billing_info')) {
      const denialReason = getPermissionDenialExplanation(userRole, 'change_billing_info');
      addAuditLog('RBAC_PERMISSION_DENIED', 'OrganizationBillingCurrency', organization.id, userRole, denialReason);
      addNotification({
        title: 'RBAC Access Denied: Change Billing Information',
        message: denialReason,
        type: 'warning',
      });
      return;
    }

    const currentPlan = subscriptionPlans.find((p) => p.id === organization.planId) || subscriptionPlans[4];
    const conversion = convertSubscriptionPrice(
      currentPlan.master_price,
      currencyCode,
      customExchangeRates,
      exchangeRateUnavailable
    );

    setOrganization((prev) => {
      const updatedOrg: Organization = {
        ...prev,
        billingCurrency: currencyCode,
        monthlySpend: conversion.convertedPrice,
        subscriptionRecord: prev.subscriptionRecord
          ? {
              ...prev.subscriptionRecord,
              billing_currency: currencyCode,
              billed_amount: conversion.convertedPrice,
              exchange_rate: conversion.exchangeRate,
              exchange_rate_source: conversion.exchangeRateSource,
              exchange_rate_timestamp: conversion.effectiveAt,
              updated_at: new Date().toISOString(),
            }
          : undefined,
      };
      localStorage.setItem('cnt_organization', JSON.stringify(updatedOrg));
      return updatedOrg;
    });

    addAuditLog(
      'SUBSCRIPTION_BILLING_CURRENCY_UPDATED',
      'CustomerSubscription',
      organization.id,
      organization.billingCurrency || organization.baseCurrency,
      currencyCode
    );

    // SEQUENCE 29: Immutable Billing Audit Log
    recordBillingAudit(
      'billing_information_updated',
      { billingCurrency: organization.billingCurrency || organization.baseCurrency || 'USD' },
      { billingCurrency: currencyCode, reason: 'Organization billing currency update' },
      { convertedSpend: conversion.convertedPrice }
    );
  };

  // SEQUENCE 27: Strict Multi-Tenant Organization Switcher (Zero Data Leakage)
  const switchOrganization = (targetOrgId: string) => {
    const targetOrg = initialOrganizations.find((o) => o.id === targetOrgId);
    if (!targetOrg) return;

    const prevOrgId = organization.id;
    recordTenantSwitch(prevOrgId, targetOrg.id, currentUser.name);

    setOrganization(targetOrg);
    localStorage.setItem('cnt_organization', JSON.stringify(targetOrg));

    // Re-scope invoices strictly to target organization
    const orgInvoices = getInvoicesForOrganization(targetOrg.id);
    setInvoices(orgInvoices);

    // Re-scope subscription history strictly to target organization
    const orgHist = getSubscriptionHistory({ organizationId: targetOrg.id });
    setSubscriptionHistory(orgHist);

    // Re-scope currencies to target organization
    const targetCurrency = targetOrg.billingCurrency || targetOrg.baseCurrency || 'USD';
    setOrganizationBaseCurrency(targetCurrency);
    setUserPreferredCurrencyState(targetCurrency);
    localStorage.setItem('cnt_base_curr', targetCurrency);
    localStorage.setItem('cnt_pref_curr', targetCurrency);

    addNotification({
      title: 'Tenant Context Switched',
      message: `Switched operational context to ${targetOrg.name} (${targetOrg.id}). All data scoped exclusively to new tenant.`,
      type: 'info',
    });
  };

  const changeSubscriptionPlan = async (
    planId: SubscriptionPlan['id'],
    billingPeriod: BillingPeriod = 'monthly',
    customSchedule?: CustomBillingSchedule
  ): Promise<{ success: boolean; message: string }> => {
    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return { success: false, message: 'Invalid plan selected' };

    // SEQUENCE 28: Enforce RBAC permission for plan changes, upgrades, and downgrades
    const tierOrder: Record<string, number> = {
      free: 0,
      starter: 1,
      basic: 2,
      professional: 3,
      pro: 3,
      business: 4,
      plus: 4,
      enterprise: 5,
    };
    const currentTierRank = tierOrder[(organization.planId || 'free').toLowerCase()] ?? 0;
    const targetTierRank = tierOrder[plan.id.toLowerCase()] ?? 0;
    const isUpgrade = targetTierRank > currentTierRank;
    const isDowngrade = targetTierRank < currentTierRank;
    const requiredPermission: BillingPermission = isUpgrade
      ? 'upgrade'
      : isDowngrade
      ? 'downgrade'
      : 'change_plans';

    if (!hasBillingPermission(userRole, requiredPermission)) {
      const denialReason = getPermissionDenialExplanation(userRole, requiredPermission);
      addAuditLog(
        'RBAC_PERMISSION_DENIED',
        'CustomerSubscription',
        organization.id,
        userRole,
        denialReason
      );
      addNotification({
        title: `RBAC Access Denied: ${requiredPermission.toUpperCase()}`,
        message: denialReason,
        type: 'warning',
      });
      return { success: false, message: denialReason };
    }

    const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';
    const masterPrice = calculatePlanPriceForPeriod(plan, billingPeriod, customSchedule);
    const conversion = convertSubscriptionPrice(
      masterPrice,
      billingCurrency,
      customExchangeRates,
      exchangeRateUnavailable
    );

    const now = new Date();
    const { periodStart, periodEnd, renewalDate } = calculatePeriodDates(
      now,
      billingPeriod,
      customSchedule
    );

    const isFreePlan = plan.id === 'free';
    const updatedSubRecord = normalizeSubscriptionRecord({
      subscription_id: `sub-${organization.id}-${Date.now()}`,
      organization_id: organization.id,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      subscription_status: isFreePlan ? 'free' : 'active',
      status: isFreePlan ? 'free' : 'active',
      master_price: isFreePlan ? 0 : masterPrice,
      master_price_usd: isFreePlan ? 0 : masterPrice,
      billing_currency: billingCurrency,
      current_price: isFreePlan ? 0 : conversion.convertedPrice,
      billed_amount: isFreePlan ? 0 : conversion.convertedPrice,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
      exchange_rate_timestamp: conversion.effectiveAt,
      billing_period: billingPeriod,
      custom_schedule: customSchedule,
      current_period_start: periodStart,
      current_period_end: isFreePlan ? '2099-12-31' : periodEnd,
      renewal_date: isFreePlan ? '2099-12-31' : renewalDate,
      cancel_at_period_end: false,
      cancelled_at: null,
      payment_status: 'paid',
      trial_start: null,
      trial_end: null,
      external_customer_id: isFreePlan ? 'cus_none_free_permanent' : `cus_stripe_${organization.id}`,
      external_subscription_id: isFreePlan ? 'sub_none_free_permanent' : `sub_stripe_${organization.id}`,
      created_at: organization.subscriptionRecord?.created_at || now.toISOString(),
    });

    // Enforce in-memory indexing
    indexSubscription(updatedSubRecord);

    const invoiceNumber = `CNTE-INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newInvoice = normalizeInvoiceRecord({
      invoice_id: `sinv-${Date.now()}`,
      id: `sinv-${Date.now()}`,
      invoice_number: invoiceNumber,
      organization_id: organization.id,
      organization_name: organization.name,
      subscription_id: updatedSubRecord.subscription_id,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      invoice_date: now.toISOString().split('T')[0],
      billing_date: now.toISOString().split('T')[0],
      billing_period: billingPeriod,
      custom_schedule: customSchedule,
      due_date: now.toISOString().split('T')[0],
      currency: billingCurrency,
      billing_currency: billingCurrency,
      subtotal: isFreePlan ? 0 : conversion.convertedPrice,
      tax: 0,
      discount: 0,
      total: isFreePlan ? 0 : conversion.convertedPrice,
      amount_paid: isFreePlan ? 0 : conversion.convertedPrice,
      amount_due: 0,
      payment_status: isFreePlan ? 'waived' : 'paid',
      invoice_status: 'paid',
      status: 'paid',
      master_price_usd: isFreePlan ? 0 : masterPrice,
      billed_amount: isFreePlan ? 0 : conversion.convertedPrice,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
      payment_method: isFreePlan
        ? 'No Payment Information Required (Permanent Free Plan)'
        : 'Corporate Account Card (Auto-Debit)',
      external_invoice_id: `in_plan_${Date.now()}`,
      immutable: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    saveInvoice(newInvoice);
    setInvoices((prev) => [newInvoice, ...prev]);

    setOrganization((prev) => {
      const updatedOrg: Organization = {
        ...prev,
        planId: plan.id,
        monthlySpend: isFreePlan ? 0 : conversion.convertedPrice,
        subscriptionStatus: isFreePlan ? 'free' : 'active',
        trialDaysLeft: undefined,
        renewalDate: isFreePlan ? 'Never (Permanent Plan)' : renewalDate,
        subscriptionRecord: updatedSubRecord,
        subscriptionInvoices: [newInvoice, ...(prev.subscriptionInvoices || [])],
      };
      localStorage.setItem('cnt_organization', JSON.stringify(updatedOrg));
      return updatedOrg;
    });

    // Sequence 16 — Record immutable subscription change in history ledger
    const prevSpend = organization.monthlySpend || 0;
    const newSpend = isFreePlan ? 0 : conversion.convertedPrice;
    let historyEvent: SubscriptionHistoryEventType = 'plan_upgraded';
    if (plan.id === organization.planId) {
      if (billingPeriod !== organization.subscriptionRecord?.billing_period) {
        historyEvent = 'billing_period_changed';
      } else if (prevSpend !== newSpend) {
        historyEvent = 'price_changed';
      } else {
        historyEvent = 'subscription_renewed';
      }
    } else if (isFreePlan || newSpend < prevSpend) {
      historyEvent = 'plan_downgraded';
    } else {
      historyEvent = 'plan_upgraded';
    }

    const histResult = recordSubscriptionHistoryEngine({
      organization_id: organization.id,
      subscription_id: updatedSubRecord.subscription_id,
      event: historyEvent,
      previous_plan: organization.planId || null,
      new_plan: plan.id,
      previous_price: prevSpend,
      new_price: newSpend,
      billing_period: billingPeriod,
      effective_date: now.toISOString().slice(0, 10),
      change_reason: isFreePlan
        ? 'Activated free plan tier (no payment required)'
        : `Switched plan to ${plan.plan_name} (${billingPeriod})`,
      changed_by: currentUser?.name || 'Administrator',
      billing_currency: billingCurrency,
      master_price_usd: getMasterPriceUsd(plan.id),
    });

    if (histResult.success && histResult.record) {
      setSubscriptionHistory((prev) => [histResult.record, ...prev]);
    }

    addAuditLog(
      isFreePlan ? 'SUBSCRIPTION_PLAN_CHANGED_TO_FREE' : 'SUBSCRIPTION_PLAN_UPGRADED',
      'CustomerSubscription',
      organization.id,
      organization.planId,
      isFreePlan
        ? `${plan.plan_name} (Permanent Free Plan - No Payment Information Required)`
        : `${plan.plan_name} (${formatSubscriptionPrice(conversion.convertedPrice, billingCurrency)}/${billingPeriod})`
    );

    // SEQUENCE 29: Immutable Billing Audit Log for Plan Changes
    recordBillingAudit(
      isUpgrade ? 'plan_upgraded' : isDowngrade ? 'plan_downgraded' : 'subscription_updated',
      { planId: organization.planId, monthlySpend: prevSpend },
      { planId: plan.id, planName: plan.plan_name, monthlySpend: newSpend, isFreePlan },
      { billingPeriod, customSchedule }
    );
    recordBillingAudit(
      'subscription_updated',
      { billingPeriod: organization.subscriptionRecord?.billing_period, renewalDate: organization.renewalDate },
      { billingPeriod, renewalDate: updatedSubRecord.renewal_date, planId: plan.id }
    );
    recordBillingAudit(
      'invoice_created',
      null,
      { invoiceId: newInvoice.invoice_id, invoiceNumber, amount: newInvoice.billed_amount, currency: billingCurrency },
      { subscriptionId: updatedSubRecord.subscription_id }
    );
    if (!isFreePlan && newInvoice.payment_status === 'paid') {
      recordBillingAudit(
        'payment_succeeded',
        { paymentState: 'initiated' },
        { paymentState: 'settled', amount: newInvoice.billed_amount, currency: billingCurrency, invoiceNumber }
      );
    }

    return {
      success: true,
      message: isFreePlan
        ? `Successfully activated ${plan.plan_name} as a permanent plan (not a trial). No payment information required.`
        : `Subscription successfully updated to ${plan.plan_name}`,
    };
  };

  // Authoritative Secure Upgrade Engine (Sequence 12)
  const executeUpgrade = async (
    payload: UpgradeRequestPayload
  ): Promise<UpgradeExecutionResult> => {
    // Execute authoritative 11-step upgrade pipeline
    const result = executeSecureUpgrade({
      organization,
      currentSubscription: activeSubscription,
      payload,
      allOrganizations: initialOrganizations,
    });

    if (!result.success) {
      return result;
    }

    // SEQUENCE 29: Immutable Billing Audit Log for Upgrade Pipeline
    recordBillingAudit(
      'plan_upgraded',
      { planId: organization.planId, price: organization.monthlySpend },
      { planId: result.subscription.plan_id, price: result.subscription.current_price, planName: payload.targetPlanId },
      { billedAmount: result.invoice.billed_amount, appliedCredit: result.adjustment?.unusedCreditUsd }
    );
    recordBillingAudit(
      'subscription_updated',
      { status: activeSubscription.subscription_status },
      { status: result.subscription.subscription_status, planId: result.subscription.plan_id }
    );
    recordBillingAudit(
      'invoice_created',
      null,
      { invoiceId: result.invoice.invoice_id, invoiceNumber: result.invoice.invoice_number, amount: result.invoice.billed_amount, currency: result.invoice.billing_currency }
    );
    recordBillingAudit(
      'payment_succeeded',
      { paymentState: 'initiated' },
      { paymentState: 'settled', amount: result.invoice.billed_amount, currency: result.invoice.billing_currency, transactionRef: result.invoice.external_invoice_id || result.invoice.invoice_number }
    );

    // Update organization with committed subscription record & status
    setOrganization((prev) => {
      const updatedOrg: Organization = {
        ...prev,
        planId: result.subscription.plan_id,
        monthlySpend: result.subscription.current_price,
        subscriptionStatus: result.subscription.subscription_status,
        renewalDate: result.subscription.renewal_date,
        subscriptionRecord: result.subscription,
        subscriptionInvoices: [result.invoice, ...(prev.subscriptionInvoices || [])],
      };
      localStorage.setItem('cnt_organization', JSON.stringify(updatedOrg));
      return updatedOrg;
    });

    // Record immutable history
    setSubscriptionHistory((prev) => [result.historyRecord, ...prev]);
    setInvoices((prev) => [result.invoice, ...prev]);

    // Dispatch in-app customer notification
    if (result.notification) {
      addNotification(result.notification);
    }

    // SEQUENCE 25: Dispatch authoritative localized plan_upgraded and invoice_generated notifications
    const targetPlanObj = subscriptionPlans.find((p) => p.id === result.subscription.plan_id);
    addNotification(
      createBillingNotification(
        'plan_upgraded',
        {
          plan: targetPlanObj?.plan_name || result.subscription.plan_id,
          amount: result.subscription.current_price,
          currency: result.subscription.billing_currency || organization.currency || 'USD',
        },
        language
      )
    );
    if (result.invoice) {
      addNotification(
        createBillingNotification(
          'invoice_generated',
          {
            invoiceNumber: result.invoice.invoice_number,
            amount: result.invoice.total,
            currency: result.invoice.currency,
          },
          language
        )
      );
    }

    // Audit log
    addAuditLog(
      'SUBSCRIPTION_UPGRADE_EXECUTED',
      'CustomerSubscription',
      organization.id,
      organization.planId,
      result.historyRecord.reason
    );

    // Asynchronously notify backend server to synchronize state
    try {
      fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Offline fallback handling
    }

    return result;
  };

  // Authoritative Invoice Engine Operations (Sequence 14)
  const refreshInvoices = useCallback(() => {
    setInvoices(getInvoicesForOrganization(organization.id));
  }, [organization.id]);

  const payInvoice = async (
    invoiceId: string,
    paymentAmount?: number,
    paymentMethod?: string
  ): Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }> => {
    const inv = invoices.find((i) => i.invoice_id === invoiceId || i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found.' };

    // SEQUENCE 27: Enforce strict multi-tenant boundary on payment
    if (inv.organization_id !== organization.id && userRole !== 'platform_admin') {
      const errorMsg = `Security Tenant Isolation Violation: Cannot process payment on invoice '${invoiceId}' belonging to organization '${inv.organization_id}' from context '${organization.id}'.`;
      addNotification({
        title: 'Security Alert: Cross-Tenant Breach Blocked',
        message: errorMsg,
        type: 'emergency',
      });
      return { success: false, error: errorMsg };
    }

    // SEQUENCE 28: Enforce RBAC permission for paying invoices
    if (!hasBillingPermission(userRole, 'change_billing_info') && !hasBillingPermission(userRole, 'view_invoices') && userRole !== 'platform_admin') {
      const denialReason = getPermissionDenialExplanation(userRole, 'change_billing_info');
      addAuditLog('RBAC_PERMISSION_DENIED', 'SubscriptionInvoice', invoiceId, userRole, denialReason);
      addNotification({
        title: 'RBAC Access Denied: Invoice Payment',
        message: denialReason,
        type: 'warning',
      });
      return { success: false, error: denialReason };
    }

    const amount = paymentAmount !== undefined ? paymentAmount : inv.amount_due;
    const result = recordInvoicePayment({
      invoiceId: inv.invoice_id,
      paymentAmount: amount,
      paymentMethod,
    });

    if (!result.success || !result.invoice) {
      // SEQUENCE 29: Immutable Billing Audit Log for Failed Payment & Invoice
      recordBillingAudit(
        'payment_failed',
        { paymentState: 'processing', amount },
        { paymentState: 'failed', amount, currency: inv.currency, error: result.error || 'Payment failed' }
      );
      recordBillingAudit(
        'invoice_failed',
        { invoiceId: inv.invoice_id, status: inv.status },
        { invoiceId: inv.invoice_id, status: 'payment_failed', reason: result.error || 'Payment declined' }
      );

      addNotification(
        createBillingNotification(
          'payment_failed',
          {
            invoiceNumber: inv.invoice_number || inv.invoice_id,
            amount,
            currency: inv.currency,
          },
          language
        )
      );
      return { success: false, error: result.error || 'Payment failed.' };
    }

    const updated = result.invoice;
    setInvoices((prev) => prev.map((i) => (i.invoice_id === updated.invoice_id ? updated : i)));
    setOrganization((prev) => ({
      ...prev,
      subscriptionInvoices: (prev.subscriptionInvoices || []).map((i) =>
        i.invoice_id === updated.invoice_id || i.id === updated.invoice_id ? updated : i
      ),
    }));

    addAuditLog(
      'INVOICE_PAYMENT_RECORDED',
      'SubscriptionInvoice',
      updated.invoice_id,
      `Paid: ${amount} ${updated.currency}`,
      `Remaining: ${updated.amount_due} ${updated.currency}`
    );

    // SEQUENCE 29: Immutable Billing Audit Log for Succeeded Payment & Invoice Paid
    recordBillingAudit(
      'payment_succeeded',
      { paymentState: 'pending' },
      { paymentState: 'succeeded', amount, currency: updated.currency, paymentMethod, invoiceId: updated.invoice_id }
    );
    recordBillingAudit(
      'invoice_paid',
      { invoiceId: updated.invoice_id, amountDue: inv.amount_due },
      { invoiceId: updated.invoice_id, amountPaid: amount, status: 'paid', paymentMethod }
    );

    // SEQUENCE 25: Localized payment_successful billing notification
    addNotification(
      createBillingNotification(
        'payment_successful',
        {
          invoiceNumber: updated.invoice_number || updated.invoice_id,
          amount,
          currency: updated.currency,
        },
        language
      )
    );

    try {
      fetch(`/api/invoices/${updated.invoice_id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-user-role': userRole,
          'x-user-id': currentUser.id || userRole,
        },
        body: JSON.stringify({ paymentAmount: amount, paymentMethod }),
      }).catch(() => {});
    } catch {}

    return { success: true, invoice: updated };
  };

  const transitionInvoiceStatus = async (
    invoiceId: string,
    targetStatus: InvoiceStatus,
    reason?: string
  ): Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }> => {
    const inv = invoices.find((i) => i.invoice_id === invoiceId || i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found.' };

    // SEQUENCE 27: Enforce strict multi-tenant boundary on status transition
    if (inv.organization_id !== organization.id && userRole !== 'platform_admin') {
      const errorMsg = `Security Tenant Isolation Violation: Cannot modify invoice '${invoiceId}' belonging to organization '${inv.organization_id}' from context '${organization.id}'.`;
      addNotification({
        title: 'Security Alert: Cross-Tenant Breach Blocked',
        message: errorMsg,
        type: 'emergency',
      });
      return { success: false, error: errorMsg };
    }

    // SEQUENCE 28: Enforce RBAC permission for modifying invoice statuses
    if (!hasBillingPermission(userRole, 'change_billing_info') && userRole !== 'platform_admin') {
      const denialReason = getPermissionDenialExplanation(userRole, 'change_billing_info');
      addAuditLog('RBAC_PERMISSION_DENIED', 'SubscriptionInvoice', invoiceId, userRole, denialReason);
      return { success: false, error: denialReason };
    }

    const result = transitionInvoiceStatusEngine({
      invoiceId: inv.invoice_id,
      targetStatus,
      reason,
    });

    if (!result.success || !result.invoice) {
      return { success: false, error: result.error || 'Status transition failed.' };
    }

    const updated = result.invoice;
    setInvoices((prev) => prev.map((i) => (i.invoice_id === updated.invoice_id ? updated : i)));
    setOrganization((prev) => ({
      ...prev,
      subscriptionInvoices: (prev.subscriptionInvoices || []).map((i) =>
        i.invoice_id === updated.invoice_id || i.id === updated.invoice_id ? updated : i
      ),
    }));

    addAuditLog(
      'INVOICE_STATUS_TRANSITION',
      'SubscriptionInvoice',
      updated.invoice_id,
      inv.invoice_status,
      updated.invoice_status
    );

    // SEQUENCE 29: Immutable Billing Audit Log for Invoice Status Changes
    if (targetStatus === 'paid') {
      recordBillingAudit(
        'invoice_paid',
        { invoiceId: updated.invoice_id, status: inv.status },
        { invoiceId: updated.invoice_id, status: 'paid', reason }
      );
      recordBillingAudit(
        'payment_succeeded',
        { paymentState: 'pending' },
        { paymentState: 'settled', invoiceId: updated.invoice_id, amount: updated.total, currency: updated.currency }
      );
    } else if (targetStatus === 'uncollectible' || targetStatus === 'void' || targetStatus === 'cancelled') {
      recordBillingAudit(
        'invoice_failed',
        { invoiceId: updated.invoice_id, status: inv.status },
        { invoiceId: updated.invoice_id, status: targetStatus, reason: reason || 'Invoice marked uncollectible/failed' }
      );
      recordBillingAudit(
        'payment_failed',
        { invoiceId: updated.invoice_id, status: inv.status },
        { invoiceId: updated.invoice_id, status: 'failed', reason: reason || 'Payment uncollectible' }
      );
    }

    try {
      fetch(`/api/invoices/${updated.invoice_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
        },
        body: JSON.stringify({ targetStatus, reason }),
      }).catch(() => {});
    } catch {}

    return { success: true, invoice: updated };
  };

  const createInvoice = async (
    invoiceData: Partial<SubscriptionInvoice>
  ): Promise<{ success: boolean; error?: string; invoice?: SubscriptionInvoice }> => {
    const normalized = normalizeInvoiceRecord({
      ...invoiceData,
      organization_id: organization.id,
      organization_name: organization.name,
      currency: invoiceData.currency || organization.billingCurrency || organization.baseCurrency || 'USD',
    });

    const result = saveInvoice(normalized);
    if (!result.success || !result.invoice) {
      return { success: false, error: result.error || 'Could not save invoice.' };
    }

    const saved = result.invoice;
    setInvoices((prev) => [saved, ...prev]);
    setOrganization((prev) => ({
      ...prev,
      subscriptionInvoices: [saved, ...(prev.subscriptionInvoices || [])],
    }));

    addAuditLog(
      'INVOICE_CREATED',
      'SubscriptionInvoice',
      saved.invoice_id,
      undefined,
      `${saved.invoice_number} (${saved.invoice_status.toUpperCase()})`
    );

    try {
      fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
        },
        body: JSON.stringify(invoiceData),
      }).catch(() => {});
    } catch {}

    return { success: true, invoice: saved };
  };

  const executeSubscriptionLifecycle = async (
    event: SubscriptionLifecycleEvent,
    params?: {
      targetPlanId?: string;
      reason?: string;
      immediate?: boolean;
      billingPeriod?: BillingPeriod;
      customSchedule?: CustomBillingSchedule;
    }
  ): Promise<{ success: boolean; message: string; history?: SubscriptionHistoryRecord }> => {
    // SEQUENCE 28: Enforce RBAC permission on subscription lifecycle transitions
    let requiredPerm: BillingPermission = 'change_plans';
    if (event === 'cancellation') requiredPerm = 'cancel';
    else if (event === 'reactivation') requiredPerm = 'reactivate';
    else if (event === 'upgrade') requiredPerm = 'upgrade';
    else if (event === 'downgrade') requiredPerm = 'downgrade';

    if (!hasBillingPermission(userRole, requiredPerm)) {
      const denialReason = getPermissionDenialExplanation(userRole, requiredPerm);
      addAuditLog(
        'RBAC_PERMISSION_DENIED',
        'CustomerSubscription',
        organization.id,
        userRole,
        denialReason
      );
      addNotification({
        title: `RBAC Access Denied: ${requiredPerm.toUpperCase()}`,
        message: denialReason,
        type: 'warning',
      });
      return { success: false, message: denialReason };
    }

    const currentSub = activeSubscription;
    const result = transitionSubscriptionLifecycle(event, {
      subscription: currentSub,
      targetPlanId: params?.targetPlanId,
      billingPeriod: params?.billingPeriod,
      customSchedule: params?.customSchedule,
      billingCurrency: organization.billingCurrency || organization.currency,
      reason: params?.reason,
      immediate: params?.immediate,
      initiatedBy: userRole,
    });

    if (!result.success) {
      return { success: false, message: result.error || 'Failed to execute lifecycle transition' };
    }

    // Update organization with new subscription record & status
    setOrganization((prev) => {
      const updatedOrg: Organization = {
        ...prev,
        subscriptionRecord: result.subscription,
        subscriptionStatus: result.subscription.subscription_status,
        planId: result.subscription.plan_id,
        monthlySpend: result.subscription.current_price,
        renewalDate: result.subscription.renewal_date,
      };
      localStorage.setItem('cnt_organization', JSON.stringify(updatedOrg));
      return updatedOrg;
    });

    // Update immutable history in state and storage (never delete)
    setSubscriptionHistory((prev) => {
      const updatedHistory = [result.history, ...prev];
      localStorage.setItem('cnt_subscription_history', JSON.stringify(updatedHistory));
      return updatedHistory;
    });

    addAuditLog(
      `SUBSCRIPTION_LIFECYCLE_${event.toUpperCase()}`,
      'CustomerSubscription',
      organization.id,
      `Status: ${currentSub.subscription_status}, Plan: ${currentSub.plan_id}`,
      `Status: ${result.subscription.subscription_status}, Plan: ${result.subscription.plan_id} (Reason: ${result.history.reason})`
    );

    // SEQUENCE 29: Immutable Billing Audit Log for Subscription Lifecycle
    if (event === 'cancellation') {
      recordBillingAudit(
        'subscription_cancelled',
        { cancelAtPeriodEnd: false, autoRenew: true },
        { cancelAtPeriodEnd: true, autoRenew: false, reason: result.history.reason, immediate: params?.immediate }
      );
    } else if (event === 'reactivation') {
      recordBillingAudit(
        'subscription_reactivated',
        { cancelAtPeriodEnd: true, autoRenew: false },
        { cancelAtPeriodEnd: false, autoRenew: true, reason: result.history.reason }
      );
    } else if (event === 'upgrade') {
      recordBillingAudit(
        'plan_upgraded',
        { planId: currentSub.plan_id },
        { planId: result.subscription.plan_id, reason: result.history.reason }
      );
    } else if (event === 'downgrade') {
      recordBillingAudit(
        'plan_downgraded',
        { planId: currentSub.plan_id },
        { planId: result.subscription.plan_id, reason: result.history.reason }
      );
    } else {
      recordBillingAudit(
        'subscription_updated',
        { status: currentSub.subscription_status, renewalDate: currentSub.renewal_date },
        { status: result.subscription.subscription_status, renewalDate: result.subscription.renewal_date, event }
      );
    }

    // SEQUENCE 25: Localized Billing Notification Dispatch for Lifecycle Event
    let billingEvt: BillingNotificationEvent | null = null;
    if (event === 'activation' || event === 'reactivation') billingEvt = 'subscription_activated';
    else if (event === 'cancellation') billingEvt = 'subscription_cancelled';
    else if (event === 'suspension') billingEvt = 'subscription_suspended';
    else if (event === 'renewal') billingEvt = 'subscription_renewed';
    else if (event === 'upgrade') billingEvt = 'plan_upgraded';
    else if (event === 'downgrade') billingEvt = 'plan_downgraded';

    if (billingEvt) {
      const planObj = subscriptionPlans.find((p) => p.id === result.subscription.plan_id);
      addNotification(
        createBillingNotification(
          billingEvt,
          {
            plan: planObj?.plan_name || result.subscription.plan_id,
            amount: result.subscription.current_price,
            currency: result.subscription.billing_currency || organization.currency || 'USD',
          },
          language
        )
      );
    }

    // Sync via server endpoint
    try {
      fetch(`/api/subscription/lifecycle/${event}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-user-id': userRole,
          'x-user-role': userRole,
        },
        body: JSON.stringify({
          targetPlanId: params?.targetPlanId,
          billingPeriod: params?.billingPeriod,
          billingCurrency: organization.billingCurrency || organization.currency,
          reason: params?.reason,
          immediate: params?.immediate,
        }),
      }).catch(() => {});
    } catch {
      // offline / client-first
    }

    return {
      success: true,
      message: `Subscription transition '${event}' successful. Current status: ${result.subscription.subscription_status}.`,
      history: result.history,
    };
  };

  const cancelSubscription = async (immediate = false) => {
    const res = await executeSubscriptionLifecycle('cancellation', {
      immediate,
      reason: immediate ? 'Immediate administrative cancellation' : 'Self-service cancel at period end',
    });
    return {
      success: res.success,
      message: immediate
        ? 'Subscription has been cancelled immediately.'
        : 'Subscription will remain active until end of billing cycle and will not renew.',
    };
  };

  const reactivateSubscription = async () => {
    const res = await executeSubscriptionLifecycle('reactivation', {
      reason: 'Self-service reactivation by user',
    });
    return {
      success: res.success,
      message: 'Subscription reactivated successfully. Auto-renewal has been resumed.',
    };
  };

  const refreshSubscriptionHistory = useCallback(() => {
    const list = getSubscriptionHistory({ organizationId: organization.id });
    setSubscriptionHistory(list);
  }, [organization.id]);

  const recordSubscriptionHistoryEntry = async (
    payload: Partial<SubscriptionHistoryRecord> & {
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
  ): Promise<{ success: boolean; record?: SubscriptionHistoryRecord; error?: string }> => {
    const res = recordSubscriptionHistoryEngine({
      ...payload,
      organization_id: payload.organization_id || organization.id,
      subscription_id: payload.subscription_id || activeSubscription.subscription_id,
      billing_currency: payload.billing_currency || organization.billingCurrency || organization.currency || 'USD',
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    setSubscriptionHistory((prev) => {
      // Append only, strictly never overwrite existing historical records
      const exists = prev.some((r) => r.history_id === res.record.history_id || r.id === res.record.history_id);
      if (exists) return prev;
      const updated = [res.record, ...prev];
      localStorage.setItem('cnt_subscription_history', JSON.stringify(updated));
      return updated;
    });

    addAuditLog(
      `SUBSCRIPTION_HISTORY_${payload.event.toUpperCase()}`,
      'SubscriptionHistoryEngine',
      organization.id,
      payload.previous_plan || undefined,
      `Recorded ${payload.event}: ${payload.change_reason}`
    );

    // Sync to backend server
    try {
      fetch('/api/subscriptions/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-user-id': currentUser?.id || 'admin',
        },
        body: JSON.stringify({
          ...payload,
          organization_id: organization.id,
          subscription_id: activeSubscription.subscription_id,
        }),
      }).catch(() => {});
    } catch {}

    return { success: true, record: res.record };
  };

  const updateOrganizationBranding = (branding: Partial<OrganizationBranding>) => {
    setOrganization((prev) => ({
      ...prev,
      branding: {
        ...(prev.branding || ({} as OrganizationBranding)),
        ...branding,
      },
    }));
    addAuditLog(
      'ORGANIZATION_BRANDING_UPDATED',
      'OrganizationBranding',
      organization.id,
      undefined,
      'Updated corporate print branding information'
    );
  };

  const updateCustomExchangeRate = (currencyCode: string, rateToUSD: number) => {
    setCustomExchangeRates((prev) => {
      const next = { ...prev, [currencyCode]: rateToUSD };
      localStorage.setItem('cnt_custom_rates', JSON.stringify(next));
      return next;
    });
    addAuditLog(
      'CUSTOM_EXCHANGE_RATE_OVERRIDE',
      'ExchangeRateService',
      currencyCode,
      undefined,
      `Rate relative to USD manually set to ${rateToUSD}`
    );
  };

  const openPrint = (payload: PrintDocumentPayload) => {
    setCurrentPrintPayload(payload);
    setIsPrintModalOpen(true);
  };

  const closePrint = () => {
    setIsPrintModalOpen(false);
    setCurrentPrintPayload(null);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('cnt_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('cnt_work_orders', JSON.stringify(workOrders));
  }, [workOrders]);

  useEffect(() => {
    localStorage.setItem('cnt_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('cnt_leases', JSON.stringify(leases));
  }, [leases]);

  useEffect(() => {
    localStorage.setItem('cnt_financials', JSON.stringify(financialRecords));
  }, [financialRecords]);

  const addAuditLog = (
    action: string,
    entityType: string,
    entityId: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newEntry: AuditLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      ipAddress: '127.0.0.1',
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const [currentSimulation, setCurrentSimulation] = useState<
    'normal' | 'approaching_units' | 'reached_units' | 'approaching_properties' | null
  >(null);

  const simulateUsageScenario = (
    scenario: 'normal' | 'approaching_units' | 'reached_units' | 'approaching_properties' | null
  ) => {
    setCurrentSimulation(scenario);
  };

  const capacityUsage: CapacityUsage = useMemo(() => {
    return calculateCapacityUsage({
      organizationId: organization.id,
      planId: organization.planId,
      properties,
      units,
    });
  }, [organization.id, organization.planId, properties, units]);

  const usageMonitoring: CentralizedUsageMonitoring = useMemo(() => {
    return calculateCentralizedUsage({
      organizationId: organization.id,
      organizationName: organization.name,
      planId: organization.planId,
      properties,
      units,
      buildings,
      usersCount: 3,
      storageGbUsed: 12.8,
      aiPromptsUsed: 215,
      simulatedScenario: currentSimulation,
    });
  }, [organization.id, organization.name, organization.planId, properties, units, buildings, currentSimulation]);

  const validatePropertyAddition = (): CapacityValidationResult => {
    return validateAddProperty(organization.planId, properties.length);
  };

  const validateBuildingAddition = (): CapacityValidationResult => {
    return validateAddBuilding(organization.planId, buildings.length);
  };

  const validateUnitAddition = (propertyId?: string): CapacityValidationResult => {
    return validateAddUnit({
      planId: organization.planId,
      propertyId,
      allUnits: units,
      properties,
    });
  };

  // Feature Entitlement Engine (Sequence 09)
  const hasFeature = useCallback((feature: FeatureKey): boolean => {
    return isFeatureEntitled(organization.planId, feature);
  }, [organization.planId]);

  const checkFeature = useCallback((feature: FeatureKey): FeatureCheckResult => {
    return checkFeatureEntitlement(organization.planId, feature);
  }, [organization.planId]);

  const entitledFeatures = useMemo(() => {
    return getPlanEntitlements(organization.planId);
  }, [organization.planId]);

  const featureEntitlementsState = useMemo(() => {
    return getFeatureEntitlementState(organization.planId);
  }, [organization.planId]);

  // Feature Access Control Authorization Flow (Sequence 10)
  const evaluateAccess = useCallback((feature: FeatureKey): AccessDecision => {
    return evaluateFeatureAccess({
      user: currentUser,
      organization,
      subscription: activeSubscription,
      featureKey: feature,
      contextData: {
        rfqs,
        complianceCertificates,
        utilityMeters,
        automationRules,
        workOrders,
        leases,
        properties,
        units,
      },
    });
  }, [currentUser, organization, activeSubscription, rfqs, complianceCertificates, utilityMeters, automationRules, workOrders, leases, properties, units]);

  const canAccess = useCallback((feature: FeatureKey): boolean => {
    return evaluateAccess(feature).granted;
  }, [evaluateAccess]);

  const addProperty = async (
    newProp: Omit<Property, 'id'>
  ): Promise<{ success: boolean; message?: string; property?: Property }> => {
    // 1. Client-Side Preflight Capacity Check
    const planLimits = getPlanCapacityLimits(organization.planId);
    const validation = validatePropertyAddition();
    if (!validation.allowed) {
      // SEQUENCE 29: Immutable Billing Audit Log for Quota Enforcement
      recordBillingAudit(
        'capacity_limit_reached',
        { used: properties.length, max: planLimits.maxProperties, quotaType: 'properties' },
        { used: properties.length, max: planLimits.maxProperties, quotaType: 'properties', status: 'BLOCKED' },
        { reason: validation.reason }
      );

      addNotification(
        createBillingNotification(
          'capacity_reached',
          {
            used: properties.length,
            max: planLimits.maxProperties,
            quotaType: 'properties',
            percentage: 100,
          },
          language
        )
      );
      return { success: false, message: validation.reason };
    }

    const id = `prop-${Date.now()}`;
    const property: Property = { ...newProp, id };

    // 2. Authoritative Backend Capacity Enforcement
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-plan-id': organization.planId,
        },
        body: JSON.stringify(property),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.error === 'CAPACITY_LIMIT_EXCEEDED') {
          const reason =
            errorData.message || validation.reason || 'Maximum properties reached for your plan.';
          addNotification(
            createBillingNotification(
              'capacity_reached',
              {
                used: properties.length,
                max: planLimits.maxProperties,
                quotaType: 'properties',
                percentage: 100,
              },
              language
            )
          );
          return { success: false, message: reason };
        }
      }
    } catch {
      // Offline fallback: client validation already passed
    }

    setProperties((prev) => [...prev, property]);
    addAuditLog('PROPERTY_CREATED', 'Property', id, undefined, `Created ${property.name}`);

    // Check if capacity is approaching 80%+
    const newCount = properties.length + 1;
    const propLimit = planLimits.maxProperties;
    if (typeof propLimit === 'number' && propLimit > 0) {
      const pct = Math.round((newCount / propLimit) * 100);
      if (pct >= 80 && pct < 100) {
        addNotification(
          createBillingNotification(
            'capacity_approaching',
            {
              used: newCount,
              max: propLimit,
              quotaType: 'properties',
              percentage: pct,
            },
            language
          )
        );
      }
    }

    return { success: true, property };
  };

  const addUnit = async (
    newUnit: Omit<Unit, 'id'>
  ): Promise<{ success: boolean; message?: string; unit?: Unit }> => {
    // 1. Client-Side Preflight Capacity Check
    const planLimits = getPlanCapacityLimits(organization.planId);
    const validation = validateUnitAddition(newUnit.propertyId);
    if (!validation.allowed) {
      // SEQUENCE 29: Immutable Billing Audit Log for Quota Enforcement
      recordBillingAudit(
        'capacity_limit_reached',
        { used: units.length, max: planLimits.maxRentalUnits, quotaType: 'rental units' },
        { used: units.length, max: planLimits.maxRentalUnits, quotaType: 'rental units', status: 'BLOCKED' },
        { reason: validation.reason }
      );

      addNotification(
        createBillingNotification(
          'capacity_reached',
          {
            used: units.length,
            max: planLimits.maxRentalUnits,
            quotaType: 'rental units',
            percentage: 100,
          },
          language
        )
      );
      return { success: false, message: validation.reason };
    }

    const id = `unit-${Date.now()}`;
    const unit: Unit = { ...newUnit, id };

    // 2. Authoritative Backend Capacity Enforcement
    try {
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-plan-id': organization.planId,
        },
        body: JSON.stringify(unit),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.error === 'CAPACITY_LIMIT_EXCEEDED') {
          const reason =
            errorData.message || validation.reason || 'Maximum unit capacity reached for your plan.';
          addNotification(
            createBillingNotification(
              'capacity_reached',
              {
                used: units.length,
                max: planLimits.maxRentalUnits,
                quotaType: 'rental units',
                percentage: 100,
              },
              language
            )
          );
          return { success: false, message: reason };
        }
      }
    } catch {
      // Offline fallback: client validation already passed
    }

    setUnits((prev) => [...prev, unit]);
    addAuditLog('UNIT_CREATED', 'Unit', id, undefined, `Added unit ${unit.unitNumber}`);

    // Check if capacity is approaching 80%+
    const newUnitCount = units.length + 1;
    const unitLimit = planLimits.maxRentalUnits;
    if (typeof unitLimit === 'number' && unitLimit > 0) {
      const pct = Math.round((newUnitCount / unitLimit) * 100);
      if (pct >= 80 && pct < 100) {
        addNotification(
          createBillingNotification(
            'capacity_approaching',
            {
              used: newUnitCount,
              max: unitLimit,
              quotaType: 'rental units',
              percentage: pct,
            },
            language
          )
        );
      }
    }

    return { success: true, unit };
  };

  const addBuilding = async (
    newBuilding: Omit<Building, 'id'>
  ): Promise<{ success: boolean; message?: string; building?: Building }> => {
    // 1. Client-side preflight check
    const planLimits = getPlanCapacityLimits(organization.planId);
    const validation = validateBuildingAddition();
    if (!validation.allowed) {
      addNotification(
        createBillingNotification(
          'capacity_reached',
          {
            used: buildings.length,
            max: planLimits.maxBuildings,
            quotaType: 'buildings',
            percentage: 100,
          },
          language
        )
      );
      return { success: false, message: validation.reason };
    }

    const id = `bld-${Date.now()}`;
    const building: Building = { ...newBuilding, id };

    // 2. Authoritative backend enforcement
    try {
      const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
          'x-plan-id': organization.planId,
        },
        body: JSON.stringify(building),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 || errorData.error === 'CAPACITY_LIMIT_EXCEEDED') {
          const reason =
            errorData.message || validation.reason || 'Maximum buildings reached for your plan.';
          addNotification(
            createBillingNotification(
              'capacity_reached',
              {
                used: buildings.length,
                max: planLimits.maxBuildings,
                quotaType: 'buildings',
                percentage: 100,
              },
              language
            )
          );
          return { success: false, message: reason };
        }
      }
    } catch {
      // Offline fallback
    }

    setBuildings((prev) => [...prev, building]);
    addAuditLog('BUILDING_CREATED', 'Building', id, undefined, `Created ${building.name}`);

    // Check if approaching 80%+
    const newBldCount = buildings.length + 1;
    const bldLimit = planLimits.maxBuildings;
    if (typeof bldLimit === 'number' && bldLimit > 0) {
      const pct = Math.round((newBldCount / bldLimit) * 100);
      if (pct >= 80 && pct < 100) {
        addNotification(
          createBillingNotification(
            'capacity_approaching',
            {
              used: newBldCount,
              max: bldLimit,
              quotaType: 'buildings',
              percentage: pct,
            },
            language
          )
        );
      }
    }

    return { success: true, building };
  };

  const addTenant = (
    newTenant: Omit<Tenant, 'id' | 'joinedDate'>,
    newLease: Omit<Lease, 'id' | 'leaseNumber' | 'daysRemaining'>
  ) => {
    const tenantId = `ten-${Date.now()}`;
    const leaseId = `lse-${Date.now()}`;
    const leaseNumber = `LSE-2026-${Math.floor(100 + Math.random() * 900)}`;

    const tenant: Tenant = {
      ...newTenant,
      id: tenantId,
      leaseId,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    const lease: Lease = {
      ...newLease,
      id: leaseId,
      leaseNumber,
      tenantId,
      tenantName: tenant.name,
      daysRemaining: 365,
    };

    setTenants((prev) => [...prev, tenant]);
    setLeases((prev) => [...prev, lease]);

    // Update unit status to occupied
    setUnits((prev) =>
      prev.map((u) =>
        u.id === tenant.unitId
          ? { ...u, status: 'occupied', currentTenantId: tenantId, currentLeaseId: leaseId }
          : u
      )
    );

    addAuditLog('TENANT_REGISTERED', 'Tenant', tenantId, undefined, `Registered tenant ${tenant.name}`);
  };

  const addServiceTicket = (ticketData: Omit<ServiceTicket, 'id' | 'code' | 'createdAt' | 'slaBreached'>) => {
    const nextCode = `CBM-${Math.floor(1000 + Math.random() * 9000)}`;
    const id = `tkt-${Date.now()}`;
    const newTicket: ServiceTicket = {
      ...ticketData,
      id,
      code: nextCode,
      createdAt: new Date().toISOString(),
      slaBreached: false,
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Send notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `New Ticket [${newTicket.code}] - ${newTicket.priority.toUpperCase()}`,
        message: `${newTicket.title} in ${newTicket.propertyName} (Unit ${newTicket.unitNumber})`,
        type: newTicket.priority === 'emergency' ? 'emergency' : 'info',
        timestamp: 'Just now',
        read: false,
        linkTab: 'serviceDesk',
      },
      ...prev,
    ]);

    addAuditLog('TICKET_CREATED', 'ServiceTicket', nextCode, undefined, `Created ticket: ${newTicket.title}`);
  };

  const updateTicketStatus = (ticketId: string, status: ServiceTicket['status'], notes?: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          addAuditLog('TICKET_STATUS_UPDATED', 'ServiceTicket', t.code, `Status: ${t.status}`, `Status: ${status}`);
          return { ...t, status, resolutionNotes: notes || t.resolutionNotes };
        }
        return t;
      })
    );
  };

  const createWorkOrderFromTicket = (ticketId: string, assignedTo: string, isContractor: boolean) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const woNumber = `WO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const woId = `wo-${Date.now()}`;

    const newWO: WorkOrder = {
      id: woId,
      workOrderNumber: woNumber,
      ticketId,
      propertyId: ticket.propertyId,
      propertyName: ticket.propertyName,
      unitNumber: ticket.unitNumber,
      title: `Dispatch: ${ticket.title}`,
      description: ticket.description,
      priority: ticket.priority,
      status: 'assigned',
      assignedTo,
      assignedType: isContractor ? 'contractor' : 'in_house',
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      laborHours: 2,
      laborRatePerHour: isContractor ? 110 : 55,
      materialsCost: 80,
      totalCost: isContractor ? 300 : 190,
      photos: ticket.photos,
      checklist: [
        { item: 'Site inspection and hazard assessment', completed: true },
        { item: 'Execute repair procedures', completed: false },
        { item: 'Clean workspace and test operation', completed: false },
        { item: 'Customer sign-off and verification', completed: false },
      ],
      signatureConfirmed: false,
    };

    setWorkOrders((prev) => [newWO, ...prev]);

    // Update ticket with link
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'assigned', workOrderId: woNumber } : t))
    );

    addAuditLog('WORK_ORDER_DISPATCHED', 'WorkOrder', woNumber, undefined, `Dispatched to ${assignedTo}`);
  };

  const updateWorkOrderStatus = (workOrderId: string, status: WorkOrder['status']) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === workOrderId) {
          addAuditLog('WORK_ORDER_UPDATED', 'WorkOrder', wo.workOrderNumber, `Status: ${wo.status}`, `Status: ${status}`);
          return { ...wo, status };
        }
        return wo;
      })
    );
  };

  const toggleWorkOrderChecklist = (workOrderId: string, itemIndex: number) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id === workOrderId) {
          const updatedChecklist = wo.checklist.map((c, idx) =>
            idx === itemIndex ? { ...c, completed: !c.completed } : c
          );
          return { ...wo, checklist: updatedChecklist };
        }
        return wo;
      })
    );
  };

  const recordRentPayment = (tenantId: string, amount: number) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const newOutstanding = Math.max(0, tenant.outstandingBalance - amount);
    const newStatus = newOutstanding === 0 ? 'paid' : 'partially_paid';

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              outstandingBalance: newOutstanding,
              paymentStatus: newStatus,
            }
          : t
      )
    );

    const invNum = `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const finRecord: FinancialRecord = {
      id: `fin-${Date.now()}`,
      type: 'rent_income',
      propertyId: tenant.propertyId,
      propertyName: properties.find((p) => p.id === tenant.propertyId)?.name || 'Property',
      unitNumber: units.find((u) => u.id === tenant.unitId)?.unitNumber,
      tenantName: tenant.name,
      amount,
      currency,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'paid',
      invoiceNumber: invNum,
      description: `Rent payment received for ${tenant.name}`,
    };

    setFinancialRecords((prev) => [finRecord, ...prev]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `Payment Received: $${amount.toLocaleString()}`,
        message: `Tenant ${tenant.name} paid balance. New balance: $${newOutstanding.toLocaleString()}`,
        type: 'success',
        timestamp: 'Just now',
        read: false,
        linkTab: 'finance',
      },
      ...prev,
    ]);

    addAuditLog('PAYMENT_RECORDED', 'FinancialRecord', invNum, undefined, `Paid $${amount} by ${tenant.name}`);
  };

  const submitContractorQuote = (
    rfqId: string,
    contractorId: string,
    contractorName: string,
    amount: number,
    estimatedDays: number,
    notes: string
  ) => {
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.id === rfqId) {
          const newQuote = {
            contractorId,
            contractorName,
            amount,
            estimatedDays,
            notes,
            submittedAt: new Date().toISOString().split('T')[0],
            status: 'pending' as const,
          };
          return {
            ...r,
            status: 'quotes_received',
            quotes: [...r.quotes, newQuote],
          };
        }
        return r;
      })
    );
    addAuditLog('QUOTE_SUBMITTED', 'RFQ', rfqId, undefined, `Quote of $${amount} from ${contractorName}`);
  };

  const awardRFQQuote = (rfqId: string, quoteIndex: number) => {
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.id === rfqId) {
          const updatedQuotes = r.quotes.map((q, idx) => ({
            ...q,
            status: (idx === quoteIndex ? 'accepted' : 'rejected') as 'accepted' | 'rejected',
          }));
          return {
            ...r,
            status: 'awarded',
            quotes: updatedQuotes,
          };
        }
        return r;
      })
    );
    addAuditLog('RFQ_AWARDED', 'RFQ', rfqId, undefined, `Awarded quote to index ${quoteIndex}`);
  };

  const addSecurityIncident = (inc: Omit<SecurityIncident, 'id' | 'incidentNumber' | 'timestamp'>) => {
    const incNumber = `INC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newInc: SecurityIncident = {
      ...inc,
      id: `inc-${Date.now()}`,
      incidentNumber: incNumber,
      timestamp: new Date().toISOString(),
    };
    setSecurityIncidents((prev) => [newInc, ...prev]);
    addAuditLog('SECURITY_INCIDENT_REPORTED', 'SecurityIncident', incNumber, undefined, inc.description);
  };

  const toggleAutomationRule = (ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((rule) => {
        if (rule.id === ruleId) {
          const updated = { ...rule, isActive: !rule.isActive };
          addAuditLog('AUTOMATION_TOGGLED', 'AutomationRule', rule.name, `Active: ${rule.isActive}`, `Active: ${updated.isActive}`);
          return updated;
        }
        return rule;
      })
    );
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const resetToDemoData = () => {
    localStorage.clear();
    setProperties(initialProperties);
    setBuildings(initialBuildings);
    setUnits(initialUnits);
    setTenants(initialTenants);
    setLeases(initialLeases);
    setTickets(initialServiceTickets);
    setWorkOrders(initialWorkOrders);
    setAssets(initialBuildingAssets);
    setPreventivePlans(initialPreventivePlans);
    setContractors(initialContractors);
    setRfqs(initialRFQs);
    setFinancialRecords(initialFinancialRecords);
    setUtilityMeters(initialUtilityMeters);
    setSecurityIncidents(initialSecurityIncidents);
    setComplianceCertificates(initialComplianceCertificates);
    setFacilityTasks(initialFacilityTasks);
    setAutomationRules(initialAutomationRules);
    setAuditLogs(initialAuditLogs);
    setNotifications(initialNotifications);
  };

  const t = translations[language] || translations.en;

  const countryConfig = getCountryConfiguration(organization.operatingCountry || organization.country);

  // SEQUENCE 28: Authoritative Billing RBAC permissions mapping
  const billingPermissions = useMemo(() => {
    return getBillingPermissionsForRole(userRole);
  }, [userRole]);

  const canPerformBillingAction = useCallback(
    (action: BillingPermission) => {
      return hasBillingPermission(userRole, action);
    },
    [userRole]
  );

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        userRole,
        setUserRole,
        billingPermissions,
        canPerformBillingAction,
        currentUser,
        organization,
        setOrganization,
        switchOrganization,
        activeTab,
        setActiveTab,
        searchTerm,
        setSearchTerm,
        selectedPropertyId,
        setSelectedPropertyId,
        t,
        properties,
        buildings,
        units,
        tenants,
        leases,
        tickets,
        workOrders,
        assets,
        preventivePlans,
        contractors,
        rfqs,
        financialRecords,
        utilityMeters,
        securityIncidents,
        complianceCertificates,
        facilityTasks,
        automationRules,
        auditLogs,
        notifications,
        // Multi-Currency Management
        organizationBaseCurrency,
        userPreferredCurrency,
        setUserPreferredCurrency,
        updateOrganizationBaseCurrency,
        updateOrganizationCountry,
        updateOrganizationBranding,
        customExchangeRates,
        updateCustomExchangeRate,
        // Subscription & Billing Core
        subscriptionPlans,
        activeSubscription,
        subscriptionHistory,
        billingPeriods: getAllBillingPeriods(),
        changeSubscriptionPlan,
        cancelSubscription,
        reactivateSubscription,
        executeSubscriptionLifecycle,
        updateOrganizationBillingCurrency,
        exchangeRateUnavailable,
        setExchangeRateUnavailable,
        countryConfig,
        // SEQUENCE 29: Authoritative Billing Audit Log
        billingAuditLogs,
        refreshBillingAuditLogs,
        recordBillingAudit,
        verifyAuditLedger,
        exportBillingAudit,
        // SEQUENCE 30: Platform Admin Billing Management
        captureAdminPayment,
        logAdminAction,
        // SEQUENCE 32: AI Billing Safety Co-Pilot & Human Authorization Gate
        aiBillingAuthRequests,
        refreshAiBillingAuthRequests,
        askAiBillingAssistant,
        authorizeBillingAction,
        rejectBillingAction,
        runAiBillingSafetySuite,
        // Capacity Engine & Usage Monitoring (Sequence 07 & 08)
        capacityUsage,
        validatePropertyAddition,
        validateUnitAddition,
        usageMonitoring,
        simulateUsageScenario,
        currentSimulation,
        addBuilding,
        validateBuildingAddition,
        // Feature Entitlement Engine (Sequence 09)
        hasFeature,
        checkFeature,
        entitledFeatures,
        featureEntitlementsState,
        // Feature Access Control Authorization Flow (Sequence 10)
        evaluateAccess,
        canAccess,
        // Authoritative Secure Upgrade Engine (Sequence 12)
        executeUpgrade,
        // Authoritative Invoice Engine (Sequence 14)
        invoices,
        payInvoice,
        transitionInvoiceStatus,
        createInvoice,
        refreshInvoices,
        // Subscription Provenance History Engine (Sequence 16)
        refreshSubscriptionHistory,
        recordSubscriptionHistoryEntry,
        // Universal Printing
        isPrintModalOpen,
        currentPrintPayload,
        openPrint,
        closePrint,
        addProperty,
        addUnit,
        addTenant,
        addServiceTicket,
        updateTicketStatus,
        createWorkOrderFromTicket,
        updateWorkOrderStatus,
        toggleWorkOrderChecklist,
        recordRentPayment,
        submitContractorQuote,
        awardRFQQuote,
        addSecurityIncident,
        toggleAutomationRule,
        markNotificationRead,
        addNotification,
        currentLanguage: language,
        addAuditLog,
        resetToDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
