import React from 'react';
import { PrintDocumentPayload, PrintConfig, Organization } from '../../types';
import { formatCurrencyAmount, formatPreciseCurrency, convertCurrency } from '../../services/currencyService';
import { formatDate } from '../../i18n/translations';
import { Building2, ShieldCheck, CheckCircle2, AlertTriangle, FileText, CheckSquare, Square } from 'lucide-react';

interface PrintDocumentViewProps {
  payload: PrintDocumentPayload;
  config: PrintConfig;
  organization: Organization;
  userPreferredCurrency: string;
  language: any;
  customExchangeRates?: Record<string, number>;
}

export const PrintDocumentView: React.FC<PrintDocumentViewProps> = ({
  payload,
  config,
  organization,
  userPreferredCurrency,
  language,
  customExchangeRates = {},
}) => {
  const branding = organization.branding || {
    companyName: organization.name,
    companyAddress: '100 Sandton Drive, Sandton, Johannesburg, South Africa',
    companyPhone: '+27 11 883 9000',
    companyEmail: 'operations@centurionrealty.co.za',
    companyWebsite: 'https://centurionrealty.co.za',
    taxRegistrationNumber: 'ZA-VAT-4910284901',
    businessRegistrationNumber: '2018/489102/07',
    customInvoiceFooter: 'Thank you for your tenancy. Please quote document number on all remittances.',
    confidentialityNotice: 'Confidential commercial building operations record. Unauthorized reproduction strictly prohibited.',
  };

  const baseCurrency = organization.baseCurrency || organization.currency || 'ZAR';

  // Determine whether we are printing in base currency or user preferred currency
  const targetCurrency = config.currencyMode === 'preferred' ? userPreferredCurrency : baseCurrency;

  const originalCurrency = payload.originalCurrency || baseCurrency;
  const originalAmount = payload.originalAmount !== undefined ? payload.originalAmount : 0;

  // Convert if target currency differs from original currency
  const conversionInfo = originalAmount > 0
    ? convertCurrency(originalAmount, originalCurrency, targetCurrency, customExchangeRates)
    : null;

  const isConverted = conversionInfo?.isConverted && config.currencyMode === 'preferred';

  return (
    <div
      id="cnt-print-document"
      className={`bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-4xl mx-auto shadow-sm print:shadow-none print:p-0 print:max-w-none ${
        config.orientation === 'landscape' ? 'print:landscape' : 'print:portrait'
      }`}
      style={{
        width: '100%',
        minHeight: config.pageSize === 'A4' ? '297mm' : '11in',
        boxSizing: 'border-box',
      }}
    >
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          {/* Organization & Platform Branding */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-emerald-800 flex items-center justify-center text-white font-bold print:border print:border-emerald-900">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase block">
                  CNTEstates
                </span>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {config.includeBranding ? branding.companyName : organization.name}
                </h1>
              </div>
            </div>

            {config.includeBranding && (
              <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                <p>{branding.companyAddress}</p>
                <p>
                  Tel: {branding.companyPhone} · Email: {branding.companyEmail} · Web: {branding.companyWebsite}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono pt-0.5">
                  {branding.taxRegistrationNumber && (
                    <span>Tax ID: <strong>{branding.taxRegistrationNumber}</strong></span>
                  )}
                  {branding.businessRegistrationNumber && (
                    <span>Reg #: <strong>{branding.businessRegistrationNumber}</strong></span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Document Title & Reference Metadata */}
          <div className="text-right space-y-1 shrink-0">
            <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
              {payload.title}
            </span>

            {payload.documentNumber && (
              <div className="font-mono text-base font-extrabold text-slate-900 mt-1">
                #{payload.documentNumber}
              </div>
            )}

            {payload.date && (
              <div className="text-xs text-slate-600">
                Date: <strong className="text-slate-900 font-mono">{formatDate(payload.date, language)}</strong>
              </div>
            )}

            {payload.dueDate && (
              <div className="text-xs text-rose-700">
                Due: <strong className="font-mono">{formatDate(payload.dueDate, language)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Premises & Tenant Context Bar */}
        {(payload.propertyName || payload.tenantName || payload.unitNumber) && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded">
            {payload.propertyName && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Premises / Complex</span>
                <span className="font-bold text-slate-900">{payload.propertyName}</span>
                {payload.buildingName && <span className="text-slate-600 block text-[11px]">{payload.buildingName}</span>}
              </div>
            )}

            {payload.unitNumber && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Unit Number</span>
                <span className="font-mono font-bold text-slate-900">Unit {payload.unitNumber}</span>
              </div>
            )}

            {payload.tenantName && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Account / Party</span>
                <span className="font-bold text-slate-900">{payload.tenantName}</span>
              </div>
            )}
          </div>
        )}

        {/* Applied Filters Criteria Box (for Reports & Analysis) */}
        {config.includeFilters && payload.meta?.filtersApplied && Object.keys(payload.meta.filtersApplied).length > 0 && (
          <div className="mt-3 p-2.5 bg-slate-100 rounded text-xs text-slate-700 font-mono border border-slate-200">
            <span className="font-bold text-slate-900 block text-[10px] uppercase">
              Auditable Report Criteria Applied:
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
              {Object.entries(payload.meta.filtersApplied).map(([k, v]) => (
                <span key={k}>
                  <strong>{k}:</strong> {v}
                </span>
              ))}
              <span>
                <strong>Currency Basis:</strong> {config.currencyMode === 'preferred' ? userPreferredCurrency : baseCurrency}
              </span>
            </div>
          </div>
        )}

        {/* Multi-Currency Conversion Transparency Notice */}
        {isConverted && conversionInfo && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Multi-Currency Display Conversion Notice</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 font-mono text-[11px]">
              <div>
                <span className="text-amber-700 block text-[10px] uppercase">Original Amount:</span>
                <strong>{formatPreciseCurrency(conversionInfo.originalAmount, conversionInfo.originalCurrency, language)}</strong>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px] uppercase">Converted Display:</span>
                <strong>{formatPreciseCurrency(conversionInfo.convertedAmount, conversionInfo.targetCurrency, language)}</strong>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px] uppercase">Exchange Rate:</span>
                <span>1 {conversionInfo.originalCurrency} = {conversionInfo.rate} {conversionInfo.targetCurrency}</span>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px] uppercase">Rate Effective:</span>
                <span>{conversionInfo.rateDate}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document Body Sections */}
      <div className="space-y-6">
        {payload.sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3">
            {section.title && (
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
                {section.title}
              </h2>
            )}

            {section.description && (
              <p className="text-xs text-slate-700 leading-relaxed">{section.description}</p>
            )}

            {/* Key-Value Detail Items Grid */}
            {section.items && section.items.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded border border-slate-200 text-xs">
                {section.items.map((item, iIdx) => (
                  <div key={iIdx}>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">{item.label}</span>
                    <span className={`font-medium ${item.highlight ? 'font-bold text-emerald-800 font-mono text-sm' : 'text-slate-900'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Structured Table */}
            {section.table && (
              <div className="overflow-hidden border border-slate-300 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300">
                    <tr>
                      {section.table.headers.map((h, hIdx) => (
                        <th key={hIdx} className={`py-2 px-3 ${hIdx === section.table!.headers.length - 1 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {section.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-3 text-slate-800 ${
                              cIdx === 0 ? 'font-sans font-medium' : ''
                            } ${cIdx === row.length - 1 ? 'text-right font-bold' : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {section.table.summary && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-mono">
                      {section.table.summary.map((sum, sumIdx) => (
                        <tr key={sumIdx} className="font-bold text-xs text-slate-900">
                          <td colSpan={section.table!.headers.length - 1} className="py-2.5 px-3 text-right font-sans uppercase">
                            {sum.label}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-sm text-slate-900">
                            {sum.value}
                          </td>
                        </tr>
                      ))}
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Checklist */}
            {section.checklist && (
              <div className="space-y-1.5 border border-slate-200 p-3 rounded bg-slate-50 text-xs">
                {section.checklist.map((chk, cIdx) => (
                  <div key={cIdx} className="flex items-center gap-2">
                    {chk.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={chk.completed ? 'font-medium text-slate-900' : 'text-slate-600'}>
                      {chk.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {section.notes && (
              <p className="text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                "{section.notes}"
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Signature and Approval Block */}
      {config.includeSignatures && (
        <div className="mt-8 pt-6 border-t-2 border-slate-300">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-12">
              <span className="text-[11px] font-bold text-slate-700 uppercase block">
                Authorized Organization Manager Sign-Off
              </span>
              <div className="border-t border-slate-400 pt-1 text-slate-600">
                Signature: __________________________ · Date: ___________
              </div>
            </div>

            <div className="space-y-12">
              <span className="text-[11px] font-bold text-slate-700 uppercase block">
                Tenant / Contractor Verification Acceptance
              </span>
              <div className="border-t border-slate-400 pt-1 text-slate-600">
                Signature: __________________________ · Date: ___________
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Footer */}
      <div className="mt-10 pt-4 border-t border-slate-300 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span>{branding.companyName}</span>
          <span className="mx-1.5">·</span>
          <span>Functional Base Currency: <strong className="font-mono text-slate-700">{baseCurrency}</strong></span>
        </div>

        {config.includeDate && (
          <div className="font-mono">
            Generated: {new Date().toLocaleString()} {payload.meta?.generatedBy ? `by ${payload.meta.generatedBy}` : ''}
          </div>
        )}
      </div>

      {config.includeConfidentiality && branding.confidentialityNotice && (
        <div className="mt-2 text-[10px] text-slate-400 italic text-center">
          {branding.confidentialityNotice}
        </div>
      )}
    </div>
  );
};
