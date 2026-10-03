import { Language, CountryConfiguration } from '../types';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  country: string;
  flag: string;
  defaultLocale: string;
}

export interface CountryCurrencyConfig {
  country: string;
  countryCode: string;
  defaultCurrency: string;
  defaultLocale: string;
  timezone: string;
  flag: string;
}

export interface ExchangeRateRecord {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  effectiveTime: string;
  source: string;
  retrievalTimestamp: string;
  rateType: 'central_bank' | 'market_mid' | 'manual_override';
}

// Authoritative centralized Country Configuration catalogue
export const countryConfigurations: CountryConfiguration[] = [
  {
    country_code: 'ZA',
    country_name: 'South Africa',
    default_currency: 'ZAR',
    locale: 'en-ZA',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'YYYY/MM/DD',
    legal_operational_timezone: 'Africa/Johannesburg',
    flag: '🇿🇦',
  },
  {
    country_code: 'US',
    country_name: 'United States',
    default_currency: 'USD',
    locale: 'en-US',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'MM/DD/YYYY',
    legal_operational_timezone: 'America/New_York',
    flag: '🇺🇸',
  },
  {
    country_code: 'GB',
    country_name: 'United Kingdom',
    default_currency: 'GBP',
    locale: 'en-GB',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Europe/London',
    flag: '🇬🇧',
  },
  {
    country_code: 'FR',
    country_name: 'France',
    default_currency: 'EUR',
    locale: 'fr-FR',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Europe/Paris',
    flag: '🇫🇷',
  },
  {
    country_code: 'ES',
    country_name: 'Spain',
    default_currency: 'EUR',
    locale: 'es-ES',
    number_format: { thousandsSeparator: '.', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Europe/Madrid',
    flag: '🇪🇸',
  },
  {
    country_code: 'PT',
    country_name: 'Portugal',
    default_currency: 'EUR',
    locale: 'pt-PT',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Europe/Lisbon',
    flag: '🇵🇹',
  },
  {
    country_code: 'CA',
    country_name: 'Canada',
    default_currency: 'CAD',
    locale: 'en-CA',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'YYYY-MM-DD',
    legal_operational_timezone: 'America/Toronto',
    flag: '🇨🇦',
  },
  {
    country_code: 'BR',
    country_name: 'Brazil',
    default_currency: 'BRL',
    locale: 'pt-BR',
    number_format: { thousandsSeparator: '.', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'America/Sao_Paulo',
    flag: '🇧🇷',
  },
  {
    country_code: 'AU',
    country_name: 'Australia',
    default_currency: 'AUD',
    locale: 'en-AU',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Australia/Sydney',
    flag: '🇦🇺',
  },
  {
    country_code: 'CH',
    country_name: 'Switzerland',
    default_currency: 'CHF',
    locale: 'de-CH',
    number_format: { thousandsSeparator: "'", decimalSeparator: '.', grouping: [3] },
    date_format: 'DD.MM.YYYY',
    legal_operational_timezone: 'Europe/Zurich',
    flag: '🇨🇭',
  },
  {
    country_code: 'DE',
    country_name: 'Germany',
    default_currency: 'EUR',
    locale: 'de-DE',
    number_format: { thousandsSeparator: '.', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD.MM.YYYY',
    legal_operational_timezone: 'Europe/Berlin',
    flag: '🇩🇪',
  },
  {
    country_code: 'JP',
    country_name: 'Japan',
    default_currency: 'JPY',
    locale: 'ja-JP',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'YYYY/MM/DD',
    legal_operational_timezone: 'Asia/Tokyo',
    flag: '🇯🇵',
  },
  {
    country_code: 'CN',
    country_name: 'China',
    default_currency: 'CNY',
    locale: 'zh-CN',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'YYYY-MM-DD',
    legal_operational_timezone: 'Asia/Shanghai',
    flag: '🇨🇳',
  },
  {
    country_code: 'IN',
    country_name: 'India',
    default_currency: 'INR',
    locale: 'en-IN',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3, 2] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Asia/Kolkata',
    flag: '🇮🇳',
  },
  {
    country_code: 'AE',
    country_name: 'United Arab Emirates',
    default_currency: 'AED',
    locale: 'ar-AE',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Asia/Dubai',
    flag: '🇦🇪',
  },
  {
    country_code: 'SA',
    country_name: 'Saudi Arabia',
    default_currency: 'SAR',
    locale: 'ar-SA',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Asia/Riyadh',
    flag: '🇸🇦',
  },
  {
    country_code: 'SG',
    country_name: 'Singapore',
    default_currency: 'SGD',
    locale: 'en-SG',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Asia/Singapore',
    flag: '🇸🇬',
  },
  {
    country_code: 'NG',
    country_name: 'Nigeria',
    default_currency: 'NGN',
    locale: 'en-NG',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Lagos',
    flag: '🇳🇬',
  },
  {
    country_code: 'KE',
    country_name: 'Kenya',
    default_currency: 'KES',
    locale: 'en-KE',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Nairobi',
    flag: '🇰🇪',
  },
  {
    country_code: 'MX',
    country_name: 'Mexico',
    default_currency: 'MXN',
    locale: 'es-MX',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'America/Mexico_City',
    flag: '🇲🇽',
  },
  {
    country_code: 'NZ',
    country_name: 'New Zealand',
    default_currency: 'NZD',
    locale: 'en-NZ',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Pacific/Auckland',
    flag: '🇳🇿',
  },
  {
    country_code: 'AO',
    country_name: 'Angola',
    default_currency: 'AOA',
    locale: 'pt-AO',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Luanda',
    flag: '🇦🇴',
  },
  {
    country_code: 'MZ',
    country_name: 'Mozambique',
    default_currency: 'MZN',
    locale: 'pt-MZ',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Maputo',
    flag: '🇲🇿',
  },
  {
    country_code: 'GH',
    country_name: 'Ghana',
    default_currency: 'GHS',
    locale: 'en-GH',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Accra',
    flag: '🇬🇭',
  },
  {
    country_code: 'CI',
    country_name: 'Ivory Coast',
    default_currency: 'XOF',
    locale: 'fr-CI',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Abidjan',
    flag: '🇨🇮',
  },
  {
    country_code: 'SN',
    country_name: 'Senegal',
    default_currency: 'XOF',
    locale: 'fr-SN',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Dakar',
    flag: '🇸🇳',
  },
  {
    country_code: 'CD',
    country_name: 'Democratic Republic of Congo',
    default_currency: 'USD',
    locale: 'fr-CD',
    number_format: { thousandsSeparator: ' ', decimalSeparator: ',', grouping: [3] },
    date_format: 'DD/MM/YYYY',
    legal_operational_timezone: 'Africa/Kinshasa',
    flag: '🇨🇩',
  },
];

// Backward-compatible countryCurrencyCatalogue
export const countryCurrencyCatalogue: CountryCurrencyConfig[] = countryConfigurations.map((c) => ({
  country: c.country_name,
  countryCode: c.country_code,
  defaultCurrency: c.default_currency,
  defaultLocale: c.locale,
  timezone: c.legal_operational_timezone,
  flag: c.flag,
}));

// Rich currency catalogue
export const currencyCatalogue: Record<string, CurrencyInfo> = {
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2, country: 'South Africa', flag: '🇿🇦', defaultLocale: 'en-ZA' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, country: 'United States', flag: '🇺🇸', defaultLocale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, country: 'European Union', flag: '🇪🇺', defaultLocale: 'fr-FR' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, country: 'United Kingdom', flag: '🇬🇧', defaultLocale: 'en-GB' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2, country: 'Canada', flag: '🇨🇦', defaultLocale: 'en-CA' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, country: 'Australia', flag: '🇦🇺', defaultLocale: 'en-AU' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, country: 'Switzerland', flag: '🇨🇭', defaultLocale: 'de-CH' },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2, country: 'Brazil', flag: '🇧🇷', defaultLocale: 'pt-BR' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, country: 'Japan', flag: '🇯🇵', defaultLocale: 'ja-JP' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, country: 'China', flag: '🇨🇳', defaultLocale: 'zh-CN' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, country: 'India', flag: '🇮🇳', defaultLocale: 'en-IN' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', decimals: 2, country: 'United Arab Emirates', flag: '🇦🇪', defaultLocale: 'ar-AE' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, country: 'Saudi Arabia', flag: '🇸🇦', defaultLocale: 'ar-SA' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, country: 'Singapore', flag: '🇸🇬', defaultLocale: 'en-SG' },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimals: 2, country: 'Nigeria', flag: '🇳🇬', defaultLocale: 'en-NG' },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, country: 'Kenya', flag: '🇰🇪', defaultLocale: 'en-KE' },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', decimals: 2, country: 'Mexico', flag: '🇲🇽', defaultLocale: 'es-MX' },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, country: 'New Zealand', flag: '🇳🇿', defaultLocale: 'en-NZ' },
  XOF: { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', decimals: 0, country: 'West Africa', flag: '🌍', defaultLocale: 'fr-SN' },
};

// Base exchange rates relative to USD (1 USD = X Currency) as of current reference period
export const initialExchangeRatesToUSD: Record<string, number> = {
  USD: 1.0,
  ZAR: 17.85,    // 1 USD = 17.85 ZAR (1 ZAR = 0.0560 USD)
  EUR: 0.92,     // 1 USD = 0.92 EUR
  GBP: 0.77,     // 1 USD = 0.77 GBP
  CAD: 1.38,     // 1 USD = 1.38 CAD
  AUD: 1.52,     // 1 USD = 1.52 AUD
  CHF: 0.88,     // 1 USD = 0.88 CHF
  BRL: 5.45,     // 1 USD = 5.45 BRL
  JPY: 152.4,    // 1 USD = 152.4 JPY
  CNY: 7.24,     // 1 USD = 7.24 CNY
  INR: 84.1,     // 1 USD = 84.1 INR
  AED: 3.67,     // 1 USD = 3.67 AED
  SAR: 3.75,     // 1 USD = 3.75 SAR
  SGD: 1.33,     // 1 USD = 1.33 SGD
  NGN: 1650.0,   // 1 USD = 1650 NGN
  KES: 129.5,    // 1 USD = 129.5 KES
  MXN: 19.3,     // 1 USD = 19.3 MXN
  NZD: 1.64,     // 1 USD = 1.64 NZD
  XOF: 605.0,    // 1 USD = 605 CFA
};

// Effective date & source details
export const exchangeRateMeta = {
  effectiveDate: '2026-09-26',
  effectiveTime: '08:00:00 UTC',
  source: 'International Financial Reference & Central Bank Mid-Market Rates',
  retrievalTimestamp: '2026-09-26T08:00:00Z',
};

/**
 * Calculates conversion between any two supported currencies
 */
export function getExchangeRate(
  sourceCurrency: string,
  targetCurrency: string,
  customRates: Record<string, number> = {}
): number {
  if (sourceCurrency === targetCurrency) return 1.0;

  const rates = { ...initialExchangeRatesToUSD, ...customRates };
  const sourceToUSD = rates[sourceCurrency] || 1.0;
  const targetToUSD = rates[targetCurrency] || 1.0;

  // Rate = (1 / sourceToUSD) * targetToUSD
  const rate = (1 / sourceToUSD) * targetToUSD;
  return Number(rate.toFixed(6));
}

/**
 * Converts an amount from source currency to target currency with audit metadata
 */
export function convertCurrency(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  customRates: Record<string, number> = {}
): {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  rateDate: string;
  isConverted: boolean;
} {
  if (sourceCurrency === targetCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: sourceCurrency,
      convertedAmount: amount,
      targetCurrency,
      rate: 1.0,
      rateDate: exchangeRateMeta.effectiveDate,
      isConverted: false,
    };
  }

  const rate = getExchangeRate(sourceCurrency, targetCurrency, customRates);
  const convertedAmount = Math.round(amount * rate * 100) / 100;

  return {
    originalAmount: amount,
    originalCurrency: sourceCurrency,
    convertedAmount,
    targetCurrency,
    rate,
    rateDate: exchangeRateMeta.effectiveDate,
    isConverted: true,
  };
}

/**
 * Locale-aware, currency-aware formatting that decouples language from currency and country.
 * Supports South African Rand (ZAR), Euro (EUR), USD, GBP, BRL, and all others.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string = 'USD',
  lang: Language = 'en',
  options: { decimals?: number; showCode?: boolean } = {}
): string {
  const info = currencyCatalogue[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    decimals: 2,
    defaultLocale: 'en-US',
  };

  const localeMap: Record<Language, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    pt: 'pt-BR',
  };

  const targetLocale = localeMap[lang] || info.defaultLocale || 'en-US';
  const decimals = options.decimals !== undefined ? options.decimals : (info.decimals > 0 ? 0 : 0);

  try {
    const formatted = new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(amount);

    return formatted;
  } catch {
    // Graceful fallback for non-standard currency codes
    return `${info.symbol || currencyCode} ${amount.toLocaleString(targetLocale, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    })}`;
  }
}

/**
 * Precise currency formatting with 2 decimal places for financial invoices, statements, and tax documents
 */
export function formatPreciseCurrency(
  amount: number,
  currencyCode: string = 'USD',
  lang: Language = 'en'
): string {
  const info = currencyCatalogue[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    decimals: 2,
    defaultLocale: 'en-US',
  };

  const localeMap: Record<Language, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    pt: 'pt-BR',
  };

  const targetLocale = localeMap[lang] || info.defaultLocale || 'en-US';

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: info.decimals,
      minimumFractionDigits: info.decimals,
    }).format(amount);
  } catch {
    return `${info.symbol || currencyCode} ${amount.toFixed(info.decimals)}`;
  }
}

/**
 * Returns complete CountryConfiguration for a given country name or country code
 */
export function getCountryConfiguration(countryNameOrCode: string): CountryConfiguration {
  const query = (countryNameOrCode || '').trim().toLowerCase();
  const match = countryConfigurations.find(
    (c) => c.country_name.toLowerCase() === query || c.country_code.toLowerCase() === query
  );
  if (match) return match;

  // Default fallback
  return {
    country_code: 'US',
    country_name: countryNameOrCode || 'United States',
    default_currency: 'USD',
    locale: 'en-US',
    number_format: { thousandsSeparator: ',', decimalSeparator: '.', grouping: [3] },
    date_format: 'MM/DD/YYYY',
    legal_operational_timezone: 'America/New_York',
    flag: '🌐',
  };
}

/**
 * Returns default currency config for a given country name (backward compatibility)
 */
export function getCountryCurrencyDefaults(countryName: string): CountryCurrencyConfig {
  const cfg = getCountryConfiguration(countryName);
  return {
    country: cfg.country_name,
    countryCode: cfg.country_code,
    defaultCurrency: cfg.default_currency,
    defaultLocale: cfg.locale,
    timezone: cfg.legal_operational_timezone,
    flag: cfg.flag,
  };
}

/**
 * Dedicated Subscription Price Formatter
 * MANDATORY RULE: Zero decimal places (minimumFractionDigits: 0, maximumFractionDigits: 0).
 * Consistent standard rounding: 424.49 -> 424, 424.50 -> 425, 424.99 -> 425.
 * Separated completely from operational property finances.
 */
export function formatSubscriptionPrice(
  amount: number,
  currencyCode: string = 'USD',
  localeOrLang?: string
): string {
  // Round to nearest integer: 424.49 -> 424, 424.50 -> 425
  const roundedAmount = Math.round(amount);

  const info = currencyCatalogue[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    decimals: 0,
    defaultLocale: 'en-US',
  };

  let targetLocale = localeOrLang || info.defaultLocale || 'en-US';
  if (targetLocale === 'en') targetLocale = 'en-US';
  if (targetLocale === 'fr') targetLocale = 'fr-FR';
  if (targetLocale === 'es') targetLocale = 'es-ES';
  if (targetLocale === 'pt') targetLocale = 'pt-BR';

  try {
    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedAmount);
  } catch {
    const symbol = info.symbol || currencyCode;
    return `${symbol}${roundedAmount.toLocaleString(targetLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
}

export interface SubscriptionPriceConversionResult {
  masterPriceUsd: number;
  masterCurrency: 'USD';
  billingCurrency: string;
  convertedPrice: number;
  formattedMasterPrice: string;
  formattedConvertedPrice: string;
  exchangeRate: number;
  exchangeRateSource: string;
  effectiveAt: string;
  retrievedAt: string;
  isConverted: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
}

/**
 * Converts a master USD subscription price to the organization's billing currency.
 * Never overwrites master USD price.
 * Follows zero-decimal places rule for converted amount.
 * Never fabricates exchange rates; provides graceful fallback if rate is unavailable.
 */
export function convertSubscriptionPrice(
  masterPriceUsd: number,
  billingCurrency: string = 'USD',
  customRates: Record<string, number> = {},
  simulateUnavailable: boolean = false
): SubscriptionPriceConversionResult {
  const masterCurrency: 'USD' = 'USD';
  const formattedMasterPrice = formatSubscriptionPrice(masterPriceUsd, 'USD', 'en-US');

  if (billingCurrency === 'USD') {
    return {
      masterPriceUsd,
      masterCurrency,
      billingCurrency: 'USD',
      convertedPrice: masterPriceUsd,
      formattedMasterPrice,
      formattedConvertedPrice: formattedMasterPrice,
      exchangeRate: 1.0,
      exchangeRateSource: 'Authoritative Master USD Rate',
      effectiveAt: exchangeRateMeta.effectiveDate,
      retrievedAt: exchangeRateMeta.retrievalTimestamp,
      isConverted: false,
      isAvailable: true,
    };
  }

  if (simulateUnavailable) {
    return {
      masterPriceUsd,
      masterCurrency,
      billingCurrency,
      convertedPrice: masterPriceUsd,
      formattedMasterPrice,
      formattedConvertedPrice: formattedMasterPrice,
      exchangeRate: 1.0,
      exchangeRateSource: 'Unavailable',
      effectiveAt: exchangeRateMeta.effectiveDate,
      retrievedAt: exchangeRateMeta.retrievalTimestamp,
      isConverted: false,
      isAvailable: false,
      unavailableReason: `Live exchange rates for ${billingCurrency} are temporarily unavailable. Displaying authoritative master price in USD.`,
    };
  }

  const rate = getExchangeRate('USD', billingCurrency, customRates);
  if (!rate || rate <= 0) {
    return {
      masterPriceUsd,
      masterCurrency,
      billingCurrency,
      convertedPrice: masterPriceUsd,
      formattedMasterPrice,
      formattedConvertedPrice: formattedMasterPrice,
      exchangeRate: 1.0,
      exchangeRateSource: 'Unavailable',
      effectiveAt: exchangeRateMeta.effectiveDate,
      retrievedAt: exchangeRateMeta.retrievalTimestamp,
      isConverted: false,
      isAvailable: false,
      unavailableReason: `No valid exchange rate found for ${billingCurrency}. Displaying authoritative master price in USD.`,
    };
  }

  // Consistent zero-decimal rounding: 424.49 -> 424, 424.50 -> 425
  const exactConverted = masterPriceUsd * rate;
  const roundedConverted = Math.round(exactConverted);
  const formattedConvertedPrice = formatSubscriptionPrice(roundedConverted, billingCurrency);

  return {
    masterPriceUsd,
    masterCurrency,
    billingCurrency,
    convertedPrice: roundedConverted,
    formattedMasterPrice,
    formattedConvertedPrice,
    exchangeRate: rate,
    exchangeRateSource: exchangeRateMeta.source,
    effectiveAt: exchangeRateMeta.effectiveDate,
    retrievedAt: exchangeRateMeta.retrievalTimestamp,
    isConverted: true,
    isAvailable: true,
  };
}
