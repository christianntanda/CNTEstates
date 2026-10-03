/**
 * SEQUENCE 19 — AUTHORITATIVE EXCHANGE-RATE CONVERSION ENGINE
 * 
 * For displaying local subscription pricing:
 * USD Master Price
 *        ↓
 * Valid Exchange Rate
 *        ↓
 * Converted Local Price
 *        ↓
 * Regional Formatting
 * 
 * CORE ARCHITECTURAL INVARIANTS:
 * The exchange rate must be:
 * • Valid (strictly positive, non-NaN, supported currency pair)
 * • Timestamped (accurate retrieval and market effective dates)
 * • Source-recorded (official central bank / institutional mid-market origin)
 * • Reproducible (deterministic mathematical conversion and audit trail)
 * 
 * CRITICAL RULE:
 * Never invent an exchange rate.
 * If conversion is unavailable:
 * Show the USD price rather than fabricating a local equivalent.
 */

import { CountryConfiguration } from '../types';
import {
  initialExchangeRatesToUSD,
  exchangeRateMeta,
  currencyCatalogue,
  getCountryConfiguration,
  formatSubscriptionPrice,
} from './currencyService';
import { getMasterPriceUsd } from './masterPricingService';
import { formatWithRegionalRules } from './operatingCountryEngine';

export interface AuthoritativeExchangeRate {
  baseCurrency: 'USD';
  targetCurrency: string;
  rate: number;
  effectiveDate: string;
  effectiveTime: string;
  source: string;
  retrievedAt: string;
  rateType: 'central_bank_mid' | 'market_reference' | 'manual_override';
  isValid: boolean;
  isInvented: false; // Invariant: Never invented
  auditHash: string;
}

export interface ExchangeRatePipelineResult {
  sequence: 'SEQUENCE 19 — EXCHANGE-RATE CONVERSION';
  planId: string;
  targetCurrency: string;
  countryName: string;
  status: 'CONVERTED' | 'FALLBACK_USD';
  fallbackToUsd: boolean;
  unavailableReason?: string;
  displayedPrice: string;
  displayedPeriod: string;

  // Pipeline Steps
  step1_usdMasterPrice: {
    amount: number;
    currency: 'USD';
    formatted: string;
    sourceOfTruth: true;
  };

  step2_validExchangeRate: {
    rate: number;
    isValid: boolean;
    isInvented: false;
    timestampedEffectiveDate: string;
    timestampedEffectiveTime: string;
    timestampedRetrievedAt: string;
    sourceRecorded: string;
    rateType: string;
    auditHash: string;
  };

  step3_convertedLocalPrice: {
    rawExactAmount: number;
    roundedIntegerAmount: number;
    zeroDecimalsEnforced: true;
    roundingPolicy: 'Standard round (Math.round)';
    isReproducible: true;
  };

  step4_regionalFormatting: {
    locale: string;
    currencySymbol: string;
    formattedAmount: string;
    thousandsSeparator: string;
    decimalSeparator: string;
    grouping: number[];
  };

  reproducibilityProof: {
    formula: string;
    computedAt: string;
    isReproducible: true;
  };
}

/**
 * Validates that an exchange rate satisfies all Sequence 19 criteria:
 * 1. Valid (positive number, finite, real ISO target currency)
 * 2. Timestamped
 * 3. Source-recorded
 * 4. Never invented
 */
export function validateExchangeRate(
  targetCurrency: string,
  customRates: Record<string, number> = {}
): {
  isValid: boolean;
  rate?: AuthoritativeExchangeRate;
  rejectionReason?: string;
} {
  const code = (targetCurrency || '').trim().toUpperCase();

  if (!code) {
    return { isValid: false, rejectionReason: 'Target currency code is missing' };
  }

  if (code === 'USD') {
    return {
      isValid: true,
      rate: {
        baseCurrency: 'USD',
        targetCurrency: 'USD',
        rate: 1.0,
        effectiveDate: exchangeRateMeta.effectiveDate,
        effectiveTime: exchangeRateMeta.effectiveTime,
        source: 'Authoritative USD Source of Truth',
        retrievedAt: exchangeRateMeta.retrievalTimestamp,
        rateType: 'central_bank_mid',
        isValid: true,
        isInvented: false,
        auditHash: `RATE_USD_USD_1.0_${exchangeRateMeta.effectiveDate}`,
      },
    };
  }

  // Check known currency catalogue
  const currencyInfo = currencyCatalogue[code];
  if (!currencyInfo) {
    return {
      isValid: false,
      rejectionReason: `Unknown or unsupported currency '${code}'. Per Sequence 19, rates are never invented.`,
    };
  }

  // Check available rates
  const knownRate = customRates[code] ?? initialExchangeRatesToUSD[code];

  if (knownRate === undefined || knownRate === null) {
    return {
      isValid: false,
      rejectionReason: `No verified exchange rate feed available for '${code}'. Rate will not be fabricated.`,
    };
  }

  if (typeof knownRate !== 'number' || isNaN(knownRate) || knownRate <= 0 || !isFinite(knownRate)) {
    return {
      isValid: false,
      rejectionReason: `Exchange rate value for '${code}' (${knownRate}) is invalid or non-positive.`,
    };
  }

  const isCustom = customRates[code] !== undefined;

  return {
    isValid: true,
    rate: {
      baseCurrency: 'USD',
      targetCurrency: code,
      rate: Number(knownRate.toFixed(6)),
      effectiveDate: exchangeRateMeta.effectiveDate,
      effectiveTime: exchangeRateMeta.effectiveTime,
      source: isCustom
        ? 'Verified Manual Administrative Override Rate'
        : exchangeRateMeta.source,
      retrievedAt: exchangeRateMeta.retrievalTimestamp,
      rateType: isCustom ? 'manual_override' : 'central_bank_mid',
      isValid: true,
      isInvented: false,
      auditHash: `RATE_USD_${code}_${knownRate.toFixed(4)}_${exchangeRateMeta.effectiveDate}`,
    },
  };
}

/**
 * Executes the complete 4-step Exchange-Rate Conversion Pipeline:
 * USD Master Price
 *        ↓
 * Valid Exchange Rate
 *        ↓
 * Converted Local Price
 *        ↓
 * Regional Formatting
 * 
 * If conversion is unavailable, strictly displays the USD price rather than fabricating a local equivalent.
 */
export function executeExchangeRatePipeline(params: {
  planId?: string;
  usdPrice?: number;
  targetCurrency: string;
  countryNameOrCode?: string;
  customRates?: Record<string, number>;
  forceUnavailable?: boolean;
}): ExchangeRatePipelineResult {
  const planId = (params.planId || 'business').toLowerCase();
  const masterPriceUsd = params.usdPrice !== undefined ? params.usdPrice : getMasterPriceUsd(planId);
  const targetCurrency = (params.targetCurrency || 'USD').toUpperCase();
  const countryConfig = getCountryConfiguration(params.countryNameOrCode || targetCurrency);

  const formattedUsd = masterPriceUsd === 0 ? '$0' : `$${masterPriceUsd}/month`;

  // Base Step 1: USD Master Price
  const step1 = {
    amount: masterPriceUsd,
    currency: 'USD' as const,
    formatted: formattedUsd,
    sourceOfTruth: true as const,
  };

  // If forceUnavailable or USD, handle directly
  if (params.forceUnavailable) {
    return {
      sequence: 'SEQUENCE 19 — EXCHANGE-RATE CONVERSION',
      planId,
      targetCurrency,
      countryName: countryConfig.country_name,
      status: 'FALLBACK_USD',
      fallbackToUsd: true,
      unavailableReason: `Exchange rate feed for ${targetCurrency} is offline. Per Sequence 19 policy, rates are never invented; showing authoritative USD price.`,
      displayedPrice: formattedUsd,
      displayedPeriod: '/month',
      step1_usdMasterPrice: step1,
      step2_validExchangeRate: {
        rate: 1.0,
        isValid: false,
        isInvented: false,
        timestampedEffectiveDate: exchangeRateMeta.effectiveDate,
        timestampedEffectiveTime: exchangeRateMeta.effectiveTime,
        timestampedRetrievedAt: exchangeRateMeta.retrievalTimestamp,
        sourceRecorded: 'Live Feed Unavailable (No fabrication)',
        rateType: 'market_reference',
        auditHash: 'UNAVAILABLE_FALLBACK_USD',
      },
      step3_convertedLocalPrice: {
        rawExactAmount: masterPriceUsd,
        roundedIntegerAmount: masterPriceUsd,
        zeroDecimalsEnforced: true,
        roundingPolicy: 'Standard round (Math.round)',
        isReproducible: true,
      },
      step4_regionalFormatting: {
        locale: 'en-US',
        currencySymbol: '$',
        formattedAmount: `$${masterPriceUsd}`,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        grouping: [3],
      },
      reproducibilityProof: {
        formula: `${masterPriceUsd} USD (Direct master fallback - rate unavailable)`,
        computedAt: new Date().toISOString(),
        isReproducible: true,
      },
    };
  }

  // Validate Exchange Rate (Never invent an exchange rate)
  const validation = validateExchangeRate(targetCurrency, params.customRates);

  if (!validation.isValid || !validation.rate) {
    return {
      sequence: 'SEQUENCE 19 — EXCHANGE-RATE CONVERSION',
      planId,
      targetCurrency,
      countryName: countryConfig.country_name,
      status: 'FALLBACK_USD',
      fallbackToUsd: true,
      unavailableReason: validation.rejectionReason || `Conversion unavailable for ${targetCurrency}. Displaying USD master price.`,
      displayedPrice: formattedUsd,
      displayedPeriod: '/month',
      step1_usdMasterPrice: step1,
      step2_validExchangeRate: {
        rate: 1.0,
        isValid: false,
        isInvented: false,
        timestampedEffectiveDate: exchangeRateMeta.effectiveDate,
        timestampedEffectiveTime: exchangeRateMeta.effectiveTime,
        timestampedRetrievedAt: exchangeRateMeta.retrievalTimestamp,
        sourceRecorded: 'Rate Rejected / Unverified (Never invented)',
        rateType: 'market_reference',
        auditHash: 'REJECTED_FALLBACK_USD',
      },
      step3_convertedLocalPrice: {
        rawExactAmount: masterPriceUsd,
        roundedIntegerAmount: masterPriceUsd,
        zeroDecimalsEnforced: true,
        roundingPolicy: 'Standard round (Math.round)',
        isReproducible: true,
      },
      step4_regionalFormatting: {
        locale: 'en-US',
        currencySymbol: '$',
        formattedAmount: `$${masterPriceUsd}`,
        thousandsSeparator: ',',
        decimalSeparator: '.',
        grouping: [3],
      },
      reproducibilityProof: {
        formula: `${masterPriceUsd} USD (Direct master fallback - unverified rate prevented)`,
        computedAt: new Date().toISOString(),
        isReproducible: true,
      },
    };
  }

  const rateInfo = validation.rate;

  // Step 2: Valid Exchange Rate
  const step2 = {
    rate: rateInfo.rate,
    isValid: true,
    isInvented: false as const,
    timestampedEffectiveDate: rateInfo.effectiveDate,
    timestampedEffectiveTime: rateInfo.effectiveTime,
    timestampedRetrievedAt: rateInfo.retrievedAt,
    sourceRecorded: rateInfo.source,
    rateType: rateInfo.rateType,
    auditHash: rateInfo.auditHash,
  };

  // Step 3: Converted Local Price (Zero decimal places enforced, standard rounding)
  const rawExactAmount = masterPriceUsd * rateInfo.rate;
  const roundedIntegerAmount = Math.round(rawExactAmount);

  const step3 = {
    rawExactAmount: Number(rawExactAmount.toFixed(4)),
    roundedIntegerAmount,
    zeroDecimalsEnforced: true as const,
    roundingPolicy: 'Standard round (Math.round)' as const,
    isReproducible: true as const,
  };

  // Step 4: Regional Formatting
  const currencyInfo = currencyCatalogue[targetCurrency] || {
    code: targetCurrency,
    symbol: targetCurrency,
    defaultLocale: countryConfig.locale,
  };

  // Format with country's regional rules
  const formattedRawNumber = formatWithRegionalRules(
    roundedIntegerAmount,
    countryConfig.number_format,
    0
  );

  const formattedAmount = `${currencyInfo.symbol} ${formattedRawNumber}`;

  const step4 = {
    locale: countryConfig.locale,
    currencySymbol: currencyInfo.symbol,
    formattedAmount,
    thousandsSeparator: countryConfig.number_format.thousandsSeparator,
    decimalSeparator: countryConfig.number_format.decimalSeparator,
    grouping: countryConfig.number_format.grouping,
  };

  const formula = `${masterPriceUsd} USD × ${rateInfo.rate} [${targetCurrency}/USD] = ${rawExactAmount.toFixed(2)} → round to zero decimals = ${roundedIntegerAmount} ${targetCurrency}`;

  return {
    sequence: 'SEQUENCE 19 — EXCHANGE-RATE CONVERSION',
    planId,
    targetCurrency,
    countryName: countryConfig.country_name,
    status: 'CONVERTED',
    fallbackToUsd: false,
    displayedPrice: `${formattedAmount}/month`,
    displayedPeriod: '/month',
    step1_usdMasterPrice: step1,
    step2_validExchangeRate: step2,
    step3_convertedLocalPrice: step3,
    step4_regionalFormatting: step4,
    reproducibilityProof: {
      formula,
      computedAt: new Date().toISOString(),
      isReproducible: true,
    },
  };
}

/**
 * Validates reproducibility of a historical or candidate conversion calculation.
 */
export function verifyConversionReproducibility(params: {
  usdMasterPrice: number;
  rate: number;
  claimedLocalPrice: number;
}): {
  isReproducible: boolean;
  expectedLocalPrice: number;
  actualLocalPrice: number;
  discrepancy: number;
  formula: string;
} {
  const expected = Math.round(params.usdMasterPrice * params.rate);
  const discrepancy = Math.abs(expected - params.claimedLocalPrice);

  return {
    isReproducible: discrepancy === 0,
    expectedLocalPrice: expected,
    actualLocalPrice: params.claimedLocalPrice,
    discrepancy,
    formula: `Math.round(${params.usdMasterPrice} * ${params.rate}) = ${expected}`,
  };
}

/**
 * Returns the entire catalogue of authoritative exchange rates with metadata.
 */
export function getAuthoritativeExchangeRateRegistry(customRates: Record<string, number> = {}): AuthoritativeExchangeRate[] {
  const currencies = Object.keys(currencyCatalogue);
  const list: AuthoritativeExchangeRate[] = [];

  for (const curr of currencies) {
    const val = validateExchangeRate(curr, customRates);
    if (val.isValid && val.rate) {
      list.push(val.rate);
    }
  }

  return list;
}
