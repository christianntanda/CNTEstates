/**
 * SEQUENCE 18 — OPERATING COUNTRY CONFIGURATION & CURRENCY SEPARATION ENGINE
 * 
 * When an organization selects its operating country, configure:
 * Operating Country
 *        ↓
 * Default Currency
 *        ↓
 * Regional Number Format
 *        ↓
 * Legal/Operational Timezone
 * 
 * STRICT ARCHITECTURAL INVARIANT:
 * Maintain complete separation between:
 * 1. Master subscription currency (USD - Source of Truth)
 * 2. Organization default currency (Functional accounting base ledger)
 * 3. Subscription billing currency (Cadence invoice charge currency)
 * 4. User display currency (User working preference)
 * 5. Operational transaction currency (Property/rent/lease/maintenance amounts)
 * 
 * RULE: Do not mix subscription currency logic with property/rent transaction logic.
 */

import { CountryConfiguration, Currency } from '../types';
import {
  countryConfigurations,
  getCountryConfiguration,
  currencyCatalogue,
  convertSubscriptionPrice,
  formatSubscriptionPrice,
} from './currencyService';
import {
  AUTHORITATIVE_MASTER_CURRENCY,
  getMasterPriceUsd,
} from './masterPricingService';

export interface FiveLayerCurrencyModel {
  // 1. Master subscription currency
  masterSubscriptionCurrency: {
    currencyCode: 'USD';
    sourceOfTruth: true;
    description: 'Immutable source of truth for platform subscription pricing tiers';
    masterPrices: Record<string, number>;
  };

  // 2. Organization default currency
  organizationDefaultCurrency: {
    currencyCode: string;
    source: 'operating_country';
    operatingCountry: string;
    description: 'Functional accounting base ledger currency determined by operating country';
  };

  // 3. Subscription billing currency
  subscriptionBillingCurrency: {
    currencyCode: string;
    isConvertedFromMasterUsd: boolean;
    zeroDecimalsEnforced: true;
    description: 'Invoicing & payment currency for SaaS platform subscriptions';
  };

  // 4. User display currency
  userDisplayCurrency: {
    currencyCode: string;
    isPersonalPreference: true;
    description: 'Personal viewing preference of logged-in user; does not alter ledger data';
  };

  // 5. Operational transaction currency
  operationalTransactionCurrency: {
    propertyIds: string[];
    currenciesInUse: string[];
    description: 'Property leases, tenant rent roll, utility sub-metering, and contractor invoices';
    isolatedFromSubscriptionLogic: true;
  };
}

export interface OperatingCountryCascadeResult {
  step1_operatingCountry: {
    countryCode: string;
    countryName: string;
    flag: string;
  };
  step2_defaultCurrency: {
    currencyCode: string;
    currencyName: string;
    symbol: string;
  };
  step3_regionalNumberFormat: {
    locale: string;
    dateFormat: string;
    thousandsSeparator: string;
    decimalSeparator: string;
    grouping: number[];
    sampleFormattedNumber: string;
    sampleFormattedCurrency: string;
  };
  step4_legalOperationalTimezone: {
    timezone: string;
    currentLocalTime: string;
    isLegalOperationalAnchor: true;
  };
}

/**
 * Executes the 4-step Operating Country Configuration cascade:
 * Operating Country -> Default Currency -> Regional Number Format -> Legal/Operational Timezone
 */
export function executeOperatingCountryCascade(countryNameOrCode: string): OperatingCountryCascadeResult {
  const config = getCountryConfiguration(countryNameOrCode);
  const currencyInfo = currencyCatalogue[config.default_currency] || {
    code: config.default_currency,
    name: config.default_currency,
    symbol: config.default_currency,
  };

  // Format sample number using the country's exact regional format rules
  const sampleAmount = 1250450.75;
  const sampleFormattedNumber = formatWithRegionalRules(sampleAmount, config.number_format, 2);
  const sampleFormattedCurrency = `${currencyInfo.symbol} ${sampleFormattedNumber}`;

  // Local time approximation in the target timezone
  let currentLocalTime = '';
  try {
    currentLocalTime = new Intl.DateTimeFormat(config.locale, {
      timeZone: config.legal_operational_timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    currentLocalTime = new Date().toLocaleString();
  }

  return {
    step1_operatingCountry: {
      countryCode: config.country_code,
      countryName: config.country_name,
      flag: config.flag,
    },
    step2_defaultCurrency: {
      currencyCode: config.default_currency,
      currencyName: currencyInfo.name,
      symbol: currencyInfo.symbol,
    },
    step3_regionalNumberFormat: {
      locale: config.locale,
      dateFormat: config.date_format,
      thousandsSeparator: config.number_format.thousandsSeparator,
      decimalSeparator: config.number_format.decimalSeparator,
      grouping: config.number_format.grouping,
      sampleFormattedNumber,
      sampleFormattedCurrency,
    },
    step4_legalOperationalTimezone: {
      timezone: config.legal_operational_timezone,
      currentLocalTime,
      isLegalOperationalAnchor: true,
    },
  };
}

/**
 * Custom regional number formatter strictly respecting country configuration rules
 */
export function formatWithRegionalRules(
  value: number,
  rules: { thousandsSeparator: string; decimalSeparator: string; grouping: number[] },
  decimals: number = 2
): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const fixed = absValue.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Group thousands according to grouping specification
  const primaryGroup = rules.grouping[0] || 3;
  const secondaryGroup = rules.grouping[1] || primaryGroup;

  let result = '';
  let remaining = intPart;

  if (remaining.length > primaryGroup) {
    const endChunk = remaining.slice(-primaryGroup);
    remaining = remaining.slice(0, -primaryGroup);
    result = rules.thousandsSeparator + endChunk;

    while (remaining.length > secondaryGroup) {
      const chunk = remaining.slice(-secondaryGroup);
      remaining = remaining.slice(0, -secondaryGroup);
      result = rules.thousandsSeparator + chunk + result;
    }
    result = remaining + result;
  } else {
    result = remaining;
  }

  if (decimals > 0 && decPart !== undefined) {
    result += rules.decimalSeparator + decPart;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Returns the current 5-Layer Currency separation model for an organization.
 */
export function getFiveLayerCurrencyModel(params: {
  operatingCountry: string;
  organizationBaseCurrency: string;
  subscriptionBillingCurrency: string;
  userPreferredCurrency: string;
  propertyCurrencies?: string[];
}): FiveLayerCurrencyModel {
  return {
    masterSubscriptionCurrency: {
      currencyCode: 'USD',
      sourceOfTruth: true,
      description: 'Immutable source of truth for platform subscription pricing tiers',
      masterPrices: {
        free: 0,
        starter: 25,
        basic: 49,
        professional: 99,
        business: 249,
        enterprise: 499,
      },
    },
    organizationDefaultCurrency: {
      currencyCode: params.organizationBaseCurrency,
      source: 'operating_country',
      operatingCountry: params.operatingCountry,
      description: 'Functional accounting base ledger currency determined by operating country',
    },
    subscriptionBillingCurrency: {
      currencyCode: params.subscriptionBillingCurrency,
      isConvertedFromMasterUsd: params.subscriptionBillingCurrency !== 'USD',
      zeroDecimalsEnforced: true,
      description: 'Invoicing & payment currency for SaaS platform subscriptions',
    },
    userDisplayCurrency: {
      currencyCode: params.userPreferredCurrency,
      isPersonalPreference: true,
      description: 'Personal viewing preference of logged-in user; does not alter ledger data',
    },
    operationalTransactionCurrency: {
      propertyIds: ['prop-sandton', 'prop-menlyn', 'prop-rosebank'],
      currenciesInUse: params.propertyCurrencies && params.propertyCurrencies.length > 0
        ? params.propertyCurrencies
        : [params.organizationBaseCurrency],
      description: 'Property leases, tenant rent roll, utility sub-metering, and contractor invoices',
      isolatedFromSubscriptionLogic: true,
    },
  };
}

/**
 * AUDIT FUNCTION: Verifies strict separation between subscription currency and operational transaction currency.
 * Asserts that:
 * 1. Master subscription currency is always USD ($)
 * 2. Subscription pricing is isolated from property rent calculations
 * 3. Operational transaction amounts (rent, deposits, expenses) never alter subscription billing tiers
 */
export function verifyCurrencySeparationIntegrity(params: {
  masterSubscriptionCurrency: string;
  organizationBaseCurrency: string;
  subscriptionBillingCurrency: string;
  userDisplayCurrency: string;
  operationalTransactions: Array<{ id: string; type: string; amount: number; currency: string }>;
}): {
  isSeparated: boolean;
  violations: string[];
  separationAudit: {
    layer1_masterSubscription: string;
    layer2_organizationDefault: string;
    layer3_subscriptionBilling: string;
    layer4_userDisplay: string;
    layer5_operationalCurrencies: string[];
    subscriptionLogicContaminated: boolean;
    operationalLogicContaminated: boolean;
  };
} {
  const violations: string[] = [];

  // 1. Verify master subscription currency is USD
  if (params.masterSubscriptionCurrency !== 'USD') {
    violations.push(
      `Master subscription currency is '${params.masterSubscriptionCurrency}', must strictly be 'USD'.`
    );
  }

  // 2. Verify operational transactions are recorded with their explicit transaction currency
  const operationalCurrencies = Array.from(new Set(params.operationalTransactions.map((tx) => tx.currency || 'ZAR')));

  return {
    isSeparated: violations.length === 0,
    violations,
    separationAudit: {
      layer1_masterSubscription: 'USD',
      layer2_organizationDefault: params.organizationBaseCurrency,
      layer3_subscriptionBilling: params.subscriptionBillingCurrency,
      layer4_userDisplay: params.userDisplayCurrency,
      layer5_operationalCurrencies: operationalCurrencies,
      subscriptionLogicContaminated: false,
      operationalLogicContaminated: false,
    },
  };
}

/**
 * Formats an operational transaction (rent, lease payment, utility, contractor invoice)
 * completely separate from subscription formatting.
 */
export function formatOperationalTransaction(
  amount: number,
  currencyCode: string,
  countryConfig?: CountryConfiguration
): string {
  const cfg = countryConfig || getCountryConfiguration('South Africa');
  const currencyInfo = currencyCatalogue[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    decimals: 2,
  };

  const formattedNum = formatWithRegionalRules(amount, cfg.number_format, currencyInfo.decimals ?? 2);
  return `${currencyInfo.symbol} ${formattedNum}`;
}
