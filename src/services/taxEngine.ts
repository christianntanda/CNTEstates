/**
 * SEQUENCE 37 — AUTHORITATIVE TAX & FISCAL COMPLIANCE ENGINE
 * 
 * Provides production-grade jurisdictional tax calculations, VAT/GST rule
 * evaluation, B2B reverse-charge exemption handling, and statutory tax ID verification.
 * 
 * CORE TAX PRINCIPLES:
 * 1. Jurisdiction-Aware: Automatically applies the correct statutory tax rate based on the tenant's operating country.
 * 2. Mathematical Precision: total = subtotal - discount + tax.
 * 3. B2B Exemption Support: Handles cross-border reverse charges and valid tax exemption certificates.
 * 4. Statutory Format Auditing: Validates VAT/GST/EIN identification formats for legal invoicing.
 */

export interface CountryTaxProfile {
  countryCode: string;
  countryName: string;
  taxType: 'VAT' | 'GST' | 'Sales Tax' | 'Zero-Rated';
  standardRatePercent: number;
  reducedRatePercent?: number;
  taxAuthorityName: string;
  taxIdFormat: string;
  taxIdExample: string;
  reverseChargeApplicable: boolean;
  notes: string;
}

export const AUTHORITATIVE_TAX_PROFILES: Record<string, CountryTaxProfile> = {
  ZA: {
    countryCode: 'ZA',
    countryName: 'South Africa',
    taxType: 'VAT',
    standardRatePercent: 15,
    taxAuthorityName: 'South African Revenue Service (SARS)',
    taxIdFormat: 'ZA-VAT-XXXXXXXXXX or 10-digit number starting with 4',
    taxIdExample: 'ZA-VAT-4910284901',
    reverseChargeApplicable: false,
    notes: 'Standard 15% VAT on commercial SaaS and property management subscriptions.',
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    taxType: 'Sales Tax',
    standardRatePercent: 0, // State-dependent SaaS tax, default 0% B2B software services
    taxAuthorityName: 'Internal Revenue Service (IRS) & State Dept of Revenue',
    taxIdFormat: 'XX-XXXXXXX (Federal EIN)',
    taxIdExample: '12-3456789',
    reverseChargeApplicable: false,
    notes: 'Exempt B2B software services unless state economic nexus threshold reached.',
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    taxType: 'VAT',
    standardRatePercent: 20,
    taxAuthorityName: 'HM Revenue & Customs (HMRC)',
    taxIdFormat: 'GBXXXXXXXXX (9 digits)',
    taxIdExample: 'GB987654321',
    reverseChargeApplicable: true,
    notes: 'Standard 20% UK VAT; reverse charge for overseas business customers.',
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    taxType: 'VAT',
    standardRatePercent: 19,
    taxAuthorityName: 'Bundeszentralamt für Steuern (BZSt)',
    taxIdFormat: 'DE999999999 (9 digits)',
    taxIdExample: 'DE123456789',
    reverseChargeApplicable: true,
    notes: 'Standard 19% German Mehrwertsteuer (MwSt).',
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    taxType: 'VAT',
    standardRatePercent: 20,
    taxAuthorityName: 'Direction Générale des Finances Publiques (DGFiP)',
    taxIdFormat: 'FRXX999999999',
    taxIdExample: 'FR12345678901',
    reverseChargeApplicable: true,
    notes: 'Standard 20% French Taxe sur la Valeur Ajoutée (TVA).',
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    taxType: 'GST',
    standardRatePercent: 5,
    taxAuthorityName: 'Canada Revenue Agency (CRA)',
    taxIdFormat: '9 digits + RT + 4 digits',
    taxIdExample: '123456789RT0001',
    reverseChargeApplicable: false,
    notes: 'Federal 5% GST; provincial harmonized rates (HST) applied where applicable.',
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    taxType: 'GST',
    standardRatePercent: 10,
    taxAuthorityName: 'Australian Taxation Office (ATO)',
    taxIdFormat: '11 digits (ABN)',
    taxIdExample: '12345678901',
    reverseChargeApplicable: true,
    notes: 'Standard 10% Goods and Services Tax (GST).',
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    taxType: 'VAT',
    standardRatePercent: 21,
    taxAuthorityName: 'Agencia Estatal de Administración Tributaria (AEAT)',
    taxIdFormat: 'ESX9999999X',
    taxIdExample: 'ESA12345678',
    reverseChargeApplicable: true,
    notes: 'Standard 21% Spanish Impuesto sobre el Valor Añadido (IVA).',
  },
  PT: {
    countryCode: 'PT',
    countryName: 'Portugal',
    taxType: 'VAT',
    standardRatePercent: 23,
    taxAuthorityName: 'Autoridade Tributária e Aduaneira (AT)',
    taxIdFormat: 'PT999999999 (9 digits)',
    taxIdExample: 'PT501234567',
    reverseChargeApplicable: true,
    notes: 'Standard 23% Portuguese Imposto sobre o Valor Acrescentado (IVA).',
  },
  NG: {
    countryCode: 'NG',
    countryName: 'Nigeria',
    taxType: 'VAT',
    standardRatePercent: 7.5,
    taxAuthorityName: 'Federal Inland Revenue Service (FIRS)',
    taxIdFormat: 'TIN 8 to 12 digits',
    taxIdExample: 'TIN-12345678-0001',
    reverseChargeApplicable: false,
    notes: 'Standard 7.5% Nigerian Value Added Tax.',
  },
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    taxType: 'VAT',
    standardRatePercent: 16,
    taxAuthorityName: 'Kenya Revenue Authority (KRA)',
    taxIdFormat: 'P0XXXXXXXXX (KRA PIN)',
    taxIdExample: 'P051234567Z',
    reverseChargeApplicable: false,
    notes: 'Standard 16% Value Added Tax on electronic services.',
  },
};

export interface TaxCalculationParams {
  subtotal: number;
  discount?: number;
  countryCodeOrName: string;
  isTaxExempt?: boolean;
  taxExemptionReason?: string;
  customerTaxId?: string;
  fixedTaxRate?: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  discount: number;
  taxableBase: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  taxType: string;
  taxAuthority: string;
  isTaxExempt: boolean;
  exemptionReason?: string;
  reverseChargeApplied: boolean;
  taxJurisdiction: string;
  summaryFormatted: string;
}

/**
 * Resolves the 2-letter country code from code or country name.
 */
export function resolveCountryTaxProfile(countryInput: string): CountryTaxProfile {
  if (!countryInput) return AUTHORITATIVE_TAX_PROFILES.ZA;

  const normalized = countryInput.trim().toUpperCase();

  // Direct 2-letter match
  if (AUTHORITATIVE_TAX_PROFILES[normalized]) {
    return AUTHORITATIVE_TAX_PROFILES[normalized];
  }

  // Name matching
  const lower = countryInput.toLowerCase().trim();
  if (lower.includes('south africa') || lower.includes('afrique du sud') || lower.includes('sudáfrica')) {
    return AUTHORITATIVE_TAX_PROFILES.ZA;
  }
  if (lower.includes('united states') || lower.includes('usa') || lower.includes('états-unis') || lower.includes('estados unidos')) {
    return AUTHORITATIVE_TAX_PROFILES.US;
  }
  if (lower.includes('united kingdom') || lower.includes('uk') || lower.includes('royaume-uni') || lower.includes('reino unido') || lower.includes('england')) {
    return AUTHORITATIVE_TAX_PROFILES.GB;
  }
  if (lower.includes('germany') || lower.includes('allemagne') || lower.includes('alemania') || lower.includes('deutschland')) {
    return AUTHORITATIVE_TAX_PROFILES.DE;
  }
  if (lower.includes('france') || lower.includes('francia')) {
    return AUTHORITATIVE_TAX_PROFILES.FR;
  }
  if (lower.includes('canada')) {
    return AUTHORITATIVE_TAX_PROFILES.CA;
  }
  if (lower.includes('australia') || lower.includes('australie')) {
    return AUTHORITATIVE_TAX_PROFILES.AU;
  }
  if (lower.includes('spain') || lower.includes('espagne') || lower.includes('españa')) {
    return AUTHORITATIVE_TAX_PROFILES.ES;
  }
  if (lower.includes('portugal')) {
    return AUTHORITATIVE_TAX_PROFILES.PT;
  }
  if (lower.includes('nigeria') || lower.includes('nigéria')) {
    return AUTHORITATIVE_TAX_PROFILES.NG;
  }
  if (lower.includes('kenya')) {
    return AUTHORITATIVE_TAX_PROFILES.KE;
  }

  // Fallback to South Africa (primary home jurisdiction)
  return AUTHORITATIVE_TAX_PROFILES.ZA;
}

/**
 * Calculates jurisdiction-accurate tax and final invoice totals.
 */
export function calculateJurisdictionTax(params: TaxCalculationParams): TaxCalculationResult {
  const profile = resolveCountryTaxProfile(params.countryCodeOrName);
  const subtotal = Math.max(0, params.subtotal || 0);
  const discount = Math.max(0, Math.min(subtotal, params.discount || 0));
  const taxableBase = Math.max(0, subtotal - discount);

  // Check exemption or reverse charge
  let isExempt = Boolean(params.isTaxExempt);
  let reverseChargeApplied = false;
  let exemptionReason = params.taxExemptionReason;

  if (profile.reverseChargeApplicable && params.customerTaxId && params.customerTaxId.trim().length >= 8) {
    isExempt = true;
    reverseChargeApplied = true;
    exemptionReason = `B2B Reverse Charge Applied per Statutory Article (VAT ID: ${params.customerTaxId})`;
  }

  let taxRatePercent = 0;
  if (!isExempt) {
    taxRatePercent = params.fixedTaxRate !== undefined ? params.fixedTaxRate : profile.standardRatePercent;
  }

  const rawTax = isExempt ? 0 : (taxableBase * taxRatePercent) / 100;
  const taxAmount = Math.round(rawTax * 100) / 100;
  const total = Math.round((taxableBase + taxAmount) * 100) / 100;

  return {
    subtotal,
    discount,
    taxableBase,
    taxRatePercent,
    taxAmount,
    total,
    taxType: profile.taxType,
    taxAuthority: profile.taxAuthorityName,
    isTaxExempt: isExempt,
    exemptionReason,
    reverseChargeApplied,
    taxJurisdiction: `${profile.countryName} (${profile.countryCode})`,
    summaryFormatted: isExempt
      ? `Tax Exempt (${profile.taxType} 0% - ${exemptionReason || 'Authorized Exemption'})`
      : `${profile.taxType} ${taxRatePercent}% (${profile.countryCode})`,
  };
}

/**
 * Validates whether a provided tax identification string conforms to regional format rules.
 */
export function validateTaxRegistrationNumber(
  taxId: string | undefined | null,
  countryInput: string
): { isValid: boolean; normalizedTaxId: string; message: string } {
  if (!taxId || taxId.trim().length === 0) {
    return {
      isValid: false,
      normalizedTaxId: '',
      message: 'Tax registration number is empty.',
    };
  }

  const profile = resolveCountryTaxProfile(countryInput);
  const trimmed = taxId.trim().toUpperCase();

  switch (profile.countryCode) {
    case 'ZA': {
      // South Africa: Either ZA-VAT-XXXXXXXXXX or 10 digits
      const digitsOnly = trimmed.replace(/\D/g, '');
      const valid = digitsOnly.length === 10 || trimmed.startsWith('ZA-VAT-');
      return {
        isValid: valid,
        normalizedTaxId: trimmed.startsWith('ZA-VAT-') ? trimmed : `ZA-VAT-${digitsOnly}`,
        message: valid
          ? 'Valid South African SARS VAT Registration Number.'
          : 'Invalid South African VAT format. Expected 10 digits or ZA-VAT-XXXXXXXXXX format.',
      };
    }
    case 'GB': {
      // UK: GB + 9 digits or 9 digits
      const digitsOnly = trimmed.replace(/\D/g, '');
      const valid = digitsOnly.length === 9;
      return {
        isValid: valid,
        normalizedTaxId: trimmed.startsWith('GB') ? trimmed : `GB${digitsOnly}`,
        message: valid
          ? 'Valid United Kingdom HMRC VAT Registration Number.'
          : 'Invalid UK VAT format. Expected 9 numeric digits (GBXXXXXXXXX).',
      };
    }
    case 'US': {
      // US EIN: 9 digits usually formatted XX-XXXXXXX
      const digitsOnly = trimmed.replace(/\D/g, '');
      const valid = digitsOnly.length === 9;
      const formatted = valid ? `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2)}` : trimmed;
      return {
        isValid: valid,
        normalizedTaxId: formatted,
        message: valid
          ? 'Valid United States Federal Employer Identification Number (EIN).'
          : 'Invalid US EIN format. Expected 9 numeric digits (XX-XXXXXXX).',
      };
    }
    default: {
      const valid = trimmed.length >= 6 && trimmed.length <= 20;
      return {
        isValid: valid,
        normalizedTaxId: trimmed,
        message: valid
          ? `Format accepted for ${profile.countryName} (${profile.taxType}).`
          : `Tax ID length must be between 6 and 20 characters.`,
      };
    }
  }
}
