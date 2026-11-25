import type { UserRole } from '../types';
import { hasBillingPermission } from './billingRbacEngine';

export type WorkspaceTabId = string;

export interface RoleNavigationPolicy {
  defaultTab: WorkspaceTabId;
  allowedTabs: Set<WorkspaceTabId>;
  allowedPortals: Set<'tenantPortal' | 'contractorPortal' | 'technicianView' | 'platformAdmin'>;
  canViewBilling: boolean;
  canAccessOrgSettings: boolean;
  canAccessPlatformAdmin: boolean;
}

const SAAS_ADMIN_ONLY_TABS: WorkspaceTabId[] = [
  'platformAdmin',
  'adminBilling',
  'billingAdmin',
  'databaseMigration',
  'databaseMigrations',
  'dbMigration',
  'migrationConsole',
  'automatedTesting',
  'automatedTests',
  'testingConsole',
  'testSuite',
  'regressionTesting',
  'regressionTests',
  'fullRegression',
  'platformRegression',
  'productionValidation',
  'finalProductionValidation',
  'prodValidation',
  'finalValidation',
  'finalArchitecture',
  'architecture',
  'finalArchitectureConsole',
  'cntestatesArchitecture',
  'tenantSecurity',
  'multiTenantSecurity',
  'billingRbac',
  'rbac',
  'rbacSecurity',
];

const PUBLIC_TABS = new Set<WorkspaceTabId>([
  'marketingPage',
  'pricing',
  'publicPricing',
  'auth_signin',
  'auth_signup',
]);

const TENANT_TABS: WorkspaceTabId[] = [
  'tenantPortal',
  'communications',
  'accountSecurity',
];

const CONTRACTOR_TABS: WorkspaceTabId[] = [
  'contractorPortal',
  'workOrders',
  'rfq',
  'communications',
  'accountSecurity',
];

const TECHNICIAN_TABS: WorkspaceTabId[] = [
  'technicianView',
  'serviceDesk',
  'workOrders',
  'maintenance',
  'assets',
  'communications',
  'accountSecurity',
];

const ORG_MANAGER_CORE_TABS: WorkspaceTabId[] = [
  'dashboard',
  'digitalBuilding',
  'properties',
  'units',
  'assets',
  'tenants',
  'leasing',
  'serviceDesk',
  'workOrders',
  'maintenance',
  'contractors',
  'rfq',
  'finance',
  'utilities',
  'facilities',
  'security',
  'compliance',
  'communications',
  'automation',
  'auditLogs',
  'aiAssistant',
  'reports',
  'accountSecurity',
  'settings',
];

export function isPublicTab(tabId: string): boolean {
  return PUBLIC_TABS.has(tabId);
}

export function isSaasAdminOnlyTab(tabId: string): boolean {
  return SAAS_ADMIN_ONLY_TABS.includes(tabId);
}

/**
 * Resolves the authoritative UI and route authorization policy for the
 * authenticated user's verified RBAC role category.
 */
export function getRoleNavigationPolicy(
  role: UserRole,
  isPlatformAdmin: boolean
): RoleNavigationPolicy {
  if (isPlatformAdmin || role === 'platform_admin') {
    const allTabs = new Set<WorkspaceTabId>([
      ...ORG_MANAGER_CORE_TABS,
      'subscription',
      'tenantPortal',
      'contractorPortal',
      'technicianView',
      ...SAAS_ADMIN_ONLY_TABS,
    ]);
    return {
      defaultTab: 'dashboard',
      allowedTabs: allTabs,
      allowedPortals: new Set(['tenantPortal', 'contractorPortal', 'technicianView', 'platformAdmin']),
      canViewBilling: true,
      canAccessOrgSettings: true,
      canAccessPlatformAdmin: true,
    };
  }

  if (role === 'tenant') {
    return {
      defaultTab: 'tenantPortal',
      allowedTabs: new Set(TENANT_TABS),
      allowedPortals: new Set(['tenantPortal']),
      canViewBilling: false,
      canAccessOrgSettings: false,
      canAccessPlatformAdmin: false,
    };
  }

  if (role === 'contractor') {
    return {
      defaultTab: 'contractorPortal',
      allowedTabs: new Set(CONTRACTOR_TABS),
      allowedPortals: new Set(['contractorPortal']),
      canViewBilling: false,
      canAccessOrgSettings: false,
      canAccessPlatformAdmin: false,
    };
  }

  if (role === 'technician') {
    return {
      defaultTab: 'technicianView',
      allowedTabs: new Set(TECHNICIAN_TABS),
      allowedPortals: new Set(['technicianView']),
      canViewBilling: false,
      canAccessOrgSettings: false,
      canAccessPlatformAdmin: false,
    };
  }

  // Organizational management & specialist roles (org_owner, portfolio_manager,
  // property_manager, building_manager, finance_manager, maintenance_manager,
  // security_officer, facility_manager, auditor)
  const canViewBilling = hasBillingPermission(role, 'view_billing');
  const allowed = new Set<WorkspaceTabId>(ORG_MANAGER_CORE_TABS);

  if (canViewBilling) {
    allowed.add('subscription');
  }

  // Specialist scoping: restrict financial/settings controls for non-finance operational roles
  if (role === 'security_officer' || role === 'maintenance_manager' || role === 'facility_manager') {
    allowed.delete('finance');
    allowed.delete('subscription');
  }

  if (role === 'auditor') {
    allowed.delete('settings');
    allowed.delete('automation');
  }

  return {
    defaultTab: 'dashboard',
    allowedTabs: allowed,
    allowedPortals: new Set(
      role === 'org_owner' || role === 'property_manager' || role === 'portfolio_manager'
        ? ['tenantPortal', 'contractorPortal', 'technicianView']
        : []
    ),
    canViewBilling,
    canAccessOrgSettings: allowed.has('settings'),
    canAccessPlatformAdmin: false,
  };
}

export function isTabAuthorizedForRole(
  tabId: string,
  role: UserRole,
  isPlatformAdmin: boolean
): boolean {
  if (isPublicTab(tabId)) return true;
  const policy = getRoleNavigationPolicy(role, isPlatformAdmin);
  return policy.allowedTabs.has(tabId);
}
