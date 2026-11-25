/**
 * CNTEstates Public & Protected Browser Route Registry
 *
 * Maps clean browser URLs (/, /features, /solutions, /pricing, /faq, /contact,
 * /signin, /signup, /forgot-password, /dashboard, /admin, /tenant, /contractor,
 * /technician, /subscriptions, /billing, /invoices, /payments, /account-settings, etc.)
 * to internal CNTEstates workspace views, enforcing clear separation between public
 * and protected routes.
 */

export interface ResolvedAppRoute {
  tab: string;
  isPublic: boolean;
  canonicalPath: string;
  landingSection?: 'features' | 'solutions' | 'faq' | 'contact';
}

export const PUBLIC_ROUTE_MAP: Record<string, ResolvedAppRoute> = {
  '/': { tab: 'marketingPage', isPublic: true, canonicalPath: '/' },
  '/features': { tab: 'marketingPage', isPublic: true, canonicalPath: '/features', landingSection: 'features' },
  '/solutions': { tab: 'marketingPage', isPublic: true, canonicalPath: '/solutions', landingSection: 'solutions' },
  '/pricing': { tab: 'pricing', isPublic: true, canonicalPath: '/pricing' },
  '/faq': { tab: 'marketingPage', isPublic: true, canonicalPath: '/faq', landingSection: 'faq' },
  '/contact': { tab: 'marketingPage', isPublic: true, canonicalPath: '/contact', landingSection: 'contact' },
  '/signin': { tab: 'auth_signin', isPublic: true, canonicalPath: '/signin' },
  '/login': { tab: 'auth_signin', isPublic: true, canonicalPath: '/signin' },
  '/signup': { tab: 'auth_signup', isPublic: true, canonicalPath: '/signup' },
  '/register': { tab: 'auth_signup', isPublic: true, canonicalPath: '/signup' },
  '/forgot-password': { tab: 'auth_reset', isPublic: true, canonicalPath: '/forgot-password' },
  '/terms': { tab: 'terms', isPublic: true, canonicalPath: '/terms' },
  '/terms-and-conditions': { tab: 'terms', isPublic: true, canonicalPath: '/terms' },
  '/privacy': { tab: 'privacy', isPublic: true, canonicalPath: '/privacy' },
  '/privacy-policy': { tab: 'privacy', isPublic: true, canonicalPath: '/privacy' },
};

export const PROTECTED_ROUTE_MAP: Record<string, ResolvedAppRoute> = {
  '/dashboard': { tab: 'dashboard', isPublic: false, canonicalPath: '/dashboard' },
  '/admin': { tab: 'platformAdmin', isPublic: false, canonicalPath: '/admin' },
  '/tenant': { tab: 'tenantPortal', isPublic: false, canonicalPath: '/tenant' },
  '/contractor': { tab: 'contractorPortal', isPublic: false, canonicalPath: '/contractor' },
  '/technician': { tab: 'technicianView', isPublic: false, canonicalPath: '/technician' },
  '/subscriptions': { tab: 'subscription', isPublic: false, canonicalPath: '/subscriptions' },
  '/billing': { tab: 'subscription', isPublic: false, canonicalPath: '/billing' },
  '/invoices': { tab: 'subscription', isPublic: false, canonicalPath: '/invoices' },
  '/payments': { tab: 'subscription', isPublic: false, canonicalPath: '/payments' },
  '/account-settings': { tab: 'accountSecurity', isPublic: false, canonicalPath: '/account-settings' },
  '/settings': { tab: 'settings', isPublic: false, canonicalPath: '/settings' },
  '/properties': { tab: 'properties', isPublic: false, canonicalPath: '/properties' },
  '/units': { tab: 'units', isPublic: false, canonicalPath: '/units' },
  '/tenants': { tab: 'tenants', isPublic: false, canonicalPath: '/tenants' },
  '/leasing': { tab: 'leasing', isPublic: false, canonicalPath: '/leasing' },
  '/service-desk': { tab: 'serviceDesk', isPublic: false, canonicalPath: '/service-desk' },
  '/work-orders': { tab: 'workOrders', isPublic: false, canonicalPath: '/work-orders' },
  '/maintenance': { tab: 'maintenance', isPublic: false, canonicalPath: '/maintenance' },
  '/contractors': { tab: 'contractors', isPublic: false, canonicalPath: '/contractors' },
  '/finance': { tab: 'finance', isPublic: false, canonicalPath: '/finance' },
  '/utilities': { tab: 'utilities', isPublic: false, canonicalPath: '/utilities' },
  '/security': { tab: 'security', isPublic: false, canonicalPath: '/security' },
  '/compliance': { tab: 'compliance', isPublic: false, canonicalPath: '/compliance' },
  '/communications': { tab: 'communications', isPublic: false, canonicalPath: '/communications' },
  '/automation': { tab: 'automation', isPublic: false, canonicalPath: '/automation' },
  '/ai-assistant': { tab: 'aiAssistant', isPublic: false, canonicalPath: '/ai-assistant' },
  '/reports': { tab: 'reports', isPublic: false, canonicalPath: '/reports' },
  '/audit-logs': { tab: 'auditLogs', isPublic: false, canonicalPath: '/audit-logs' },
  '/digital-building': { tab: 'digitalBuilding', isPublic: false, canonicalPath: '/digital-building' },
};

const TAB_TO_PATH: Record<string, string> = {
  marketingPage: '/',
  pricing: '/pricing',
  publicPricing: '/pricing',
  auth_signin: '/signin',
  auth_signup: '/signup',
  auth_reset: '/forgot-password',
  terms: '/terms',
  privacy: '/privacy',
  dashboard: '/dashboard',
  platformAdmin: '/admin',
  adminBilling: '/admin',
  billingAdmin: '/admin',
  tenantPortal: '/tenant',
  contractorPortal: '/contractor',
  technicianView: '/technician',
  subscription: '/billing',
  accountSecurity: '/account-settings',
  settings: '/settings',
  properties: '/properties',
  units: '/units',
  tenants: '/tenants',
  leasing: '/leasing',
  serviceDesk: '/service-desk',
  workOrders: '/work-orders',
  maintenance: '/maintenance',
  assets: '/maintenance',
  contractors: '/contractors',
  rfq: '/contractors',
  finance: '/finance',
  utilities: '/utilities',
  facilities: '/security',
  security: '/security',
  compliance: '/compliance',
  communications: '/communications',
  automation: '/automation',
  aiAssistant: '/ai-assistant',
  reports: '/reports',
  auditLogs: '/audit-logs',
  digitalBuilding: '/digital-building',
};

export const PUBLIC_TABS = new Set<string>([
  'marketingPage',
  'pricing',
  'publicPricing',
  'auth_signin',
  'auth_signup',
  'auth_reset',
  'terms',
  'privacy',
]);

export function normalizePathname(pathname: string): string {
  const clean = (pathname || '/').trim().toLowerCase();
  if (clean === '/' || clean === '') return '/';
  return clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

export function resolvePathToRoute(pathname: string): ResolvedAppRoute {
  const normalized = normalizePathname(pathname);
  if (PUBLIC_ROUTE_MAP[normalized]) {
    return PUBLIC_ROUTE_MAP[normalized];
  }
  if (PROTECTED_ROUTE_MAP[normalized]) {
    return PROTECTED_ROUTE_MAP[normalized];
  }
  return { tab: 'marketingPage', isPublic: true, canonicalPath: '/' };
}

export function getPathForTab(tab: string, currentPath?: string): string {
  // Preserve explicit billing aliases (/subscriptions, /billing, /invoices, /payments)
  if (tab === 'subscription' && currentPath) {
    const normalized = normalizePathname(currentPath);
    if (['/subscriptions', '/billing', '/invoices', '/payments'].includes(normalized)) {
      return normalized;
    }
  }
  // Preserve explicit landing section routes (/features, /solutions, /faq, /contact)
  if (tab === 'marketingPage' && currentPath) {
    const normalized = normalizePathname(currentPath);
    if (['/features', '/solutions', '/faq', '/contact'].includes(normalized)) {
      return normalized;
    }
  }
  return TAB_TO_PATH[tab] || '/dashboard';
}

export function isPublicTab(tab: string): boolean {
  return PUBLIC_TABS.has(tab);
}
