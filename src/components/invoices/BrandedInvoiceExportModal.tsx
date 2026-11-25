import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  CheckCircle2,
  Building,
  Shield,
  Palette,
  FileCheck,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  RefreshCw,
  Hash,
  Eye,
} from 'lucide-react';
import { SubscriptionInvoice, Organization, UserRole } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  downloadInvoicePdf,
  batchExportInvoicesPdf,
  CustomBrandingPdfOptions,
} from '../../services/invoicePdfGenerator';
import { formatSubscriptionPrice } from '../../services/currencyService';
import { AUTHORITATIVE_TAX_PROFILES } from '../../services/taxEngine';
import { formatBillingCadenceLabel } from '../../services/billingPeriodService';

interface BrandedInvoiceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoice?: SubscriptionInvoice | null;
  allInvoices?: SubscriptionInvoice[];
}

const BRAND_COLOR_PRESETS = [
  { name: 'Emerald', hex: '#047857', bgClass: 'bg-emerald-600' },
  { name: 'Sapphire', hex: '#1d4ed8', bgClass: 'bg-blue-700' },
  { name: 'Indigo', hex: '#4338ca', bgClass: 'bg-indigo-700' },
  { name: 'Purple', hex: '#6b21a8', bgClass: 'bg-purple-800' },
  { name: 'Slate', hex: '#334155', bgClass: 'bg-slate-700' },
  { name: 'Amber', hex: '#b45309', bgClass: 'bg-amber-700' },
];

export const BrandedInvoiceExportModal: React.FC<BrandedInvoiceExportModalProps> = ({
  isOpen,
  onClose,
  initialInvoice,
  allInvoices = [],
}) => {
  const { organization, userRole, addAuditLog } = useApp();

  const invoicesList = useMemo(() => {
    if (allInvoices && allInvoices.length > 0) return allInvoices;
    if (organization.subscriptionInvoices && organization.subscriptionInvoices.length > 0) {
      return organization.subscriptionInvoices;
    }
    if (initialInvoice) return [initialInvoice];
    return [];
  }, [allInvoices, organization.subscriptionInvoices, initialInvoice]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(() => {
    return initialInvoice?.id || initialInvoice?.invoice_id || invoicesList[0]?.id || invoicesList[0]?.invoice_id || '';
  });

  const [brandColor, setBrandColor] = useState<string>('#047857');
  const [customCompanyName, setCustomCompanyName] = useState<string>(
    organization.branding?.companyName || organization.name || 'Centurion Realty Holdings Ltd'
  );
  const [customTaxId, setCustomTaxId] = useState<string>(
    organization.branding?.taxRegistrationNumber || 'ZA-VAT-4910284901'
  );
  const [customPoNumber, setCustomPoNumber] = useState<string>('PO-CNT-2026-981');
  const [customNotes, setCustomNotes] = useState<string>(
    organization.branding?.customInvoiceFooter || 'Please quote invoice number on all remittances. Electronic tax document.'
  );
  const [includeAuditSeal, setIncludeAuditSeal] = useState(true);
  const [includeTaxBreakdown, setIncludeTaxBreakdown] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Active selected invoice
  const currentInvoice = useMemo(() => {
    const found = invoicesList.find((inv) => (inv.id || inv.invoice_id) === selectedInvoiceId);
    return found || initialInvoice || invoicesList[0];
  }, [invoicesList, selectedInvoiceId, initialInvoice]);

  if (!isOpen) return null;

  const countryCode = organization.operatingCountry?.toUpperCase().slice(0, 2) || 'ZA';
  const taxProfile = AUTHORITATIVE_TAX_PROFILES[countryCode] || AUTHORITATIVE_TAX_PROFILES.ZA;
  const currency = currentInvoice?.currency || currentInvoice?.billing_currency || organization.billingCurrency || 'ZAR';

  const handleDownloadSinglePdf = () => {
    if (!currentInvoice) return;
    setIsExporting(true);
    setDownloadSuccessMessage(null);

    const brandingOptions: CustomBrandingPdfOptions = {
      companyName: customCompanyName,
      taxRegistrationNumber: customTaxId,
      poNumber: customPoNumber,
      customNotes,
      brandColorHex: brandColor,
      exportedByRole: userRole,
      exportedByName: userRole === 'tenant' ? 'Tenant Account' : 'Authorized Administrator',
      includeAuditSeal,
      includeTaxBreakdown,
    };

    try {
      downloadInvoicePdf(currentInvoice, organization, brandingOptions);

      // Record immutable audit event
      addAuditLog(
        'INVOICE_PDF_DOWNLOADED',
        'BrandedInvoicePdfGenerator',
        currentInvoice.invoice_number,
        undefined,
        `Branded PDF invoice ${currentInvoice.invoice_number} exported by ${userRole} for organization ${organization.name}`
      );

      setDownloadSuccessMessage(`Successfully downloaded PDF for ${currentInvoice.invoice_number}`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBatchExportPdf = () => {
    if (!invoicesList || invoicesList.length === 0) return;
    setIsExporting(true);
    setDownloadSuccessMessage(null);

    const brandingOptions: CustomBrandingPdfOptions = {
      companyName: customCompanyName,
      taxRegistrationNumber: customTaxId,
      poNumber: customPoNumber,
      customNotes,
      brandColorHex: brandColor,
      exportedByRole: userRole,
      exportedByName: userRole === 'tenant' ? 'Tenant Account' : 'Authorized Administrator',
      includeAuditSeal,
      includeTaxBreakdown,
    };

    try {
      batchExportInvoicesPdf(invoicesList, organization, brandingOptions);

      addAuditLog(
        'BATCH_INVOICE_PDF_EXPORTED',
        'BrandedInvoicePdfGenerator',
        `BATCH-${invoicesList.length}-INVOICES`,
        undefined,
        `Batch multi-page PDF invoice dossier containing ${invoicesList.length} records exported by ${userRole}`
      );

      setDownloadSuccessMessage(`Exported compiled multi-page PDF containing ${invoicesList.length} billing records!`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Batch export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold transition-colors"
              style={{ backgroundColor: brandColor }}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Download Branded PDF Invoice
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 uppercase">
                  Vector PDF
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate production-grade statutory tax invoices formatted with your organization's identity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccessMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Customization Controls (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4 bg-slate-950/30">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Select Invoice to Export
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              >
                {invoicesList.map((inv) => (
                  <option key={inv.id || inv.invoice_id} value={inv.id || inv.invoice_id}>
                    {inv.invoice_number} · {inv.invoice_date || inv.billing_date} ({formatSubscriptionPrice(inv.total || inv.billed_amount || 0, inv.currency || currency)})
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Color Chooser */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Brand Accent Color</span>
              </label>
              <div className="flex items-center gap-2">
                {BRAND_COLOR_PRESETS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setBrandColor(color.hex)}
                    className={`w-7 h-7 rounded-lg transition-transform ${color.bgClass} flex items-center justify-center cursor-pointer ${
                      brandColor === color.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={color.name}
                  >
                    {brandColor === color.hex && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </button>
                ))}
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-7 h-7 bg-transparent border-0 rounded cursor-pointer ml-1"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Branding Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tax / VAT Registration ID</label>
                <input
                  type="text"
                  value={customTaxId}
                  onChange={(e) => setCustomTaxId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. ZA-VAT-4910284901"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Purchase Order (PO) / Remittance Reference</label>
                <input
                  type="text"
                  value={customPoNumber}
                  onChange={(e) => setCustomPoNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. PO-2026-9921"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Custom Statutory Remittance Note</label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Compliance & Audit Options */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeAuditSeal}
                  onChange={(e) => setIncludeAuditSeal(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span>Include Cryptographic Audit Seal & Timestamp</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includeTaxBreakdown}
                  onChange={(e) => setIncludeTaxBreakdown(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                />
                <span>Include Statutory Tax Authority Breakdown ({taxProfile.taxType} {taxProfile.standardRatePercent}%)</span>
              </label>
            </div>

            {/* Persona Role Notice */}
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
              <span>Export Role Persona:</span>
              <span className="font-mono text-emerald-400 font-semibold uppercase">{userRole}</span>
            </div>
          </div>

          {/* Right Column: Live Document Preview (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Branded Document Preview</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ISO 216 / A4 Standard Format</span>
              </div>

              {/* Document Mock Sheet */}
              <div className="bg-white text-slate-900 rounded-xl p-4 sm:p-5 shadow-lg border border-slate-200 text-xs space-y-3 font-sans">
                {/* Accent Top Bar */}
                <div className="h-1.5 rounded-t -mt-4 sm:-mt-5 -mx-4 sm:-mx-5" style={{ backgroundColor: brandColor }} />

                {/* Header */}
                <div className="flex justify-between items-start pt-1 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-sm"
                      style={{ backgroundColor: brandColor }}
                    >
                      {customCompanyName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm" style={{ color: brandColor }}>CNTEstates</div>
                      <div className="font-bold text-xs text-slate-800">{customCompanyName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">VAT: {customTaxId}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: brandColor }}>
                      Tax Invoice
                    </div>
                    <div className="font-mono font-extrabold text-xs text-slate-900">
                      {currentInvoice?.invoice_number || 'CNTE-INV-2026-09'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Date: {currentInvoice?.invoice_date || currentInvoice?.billing_date || '2026-10-26'}
                    </div>
                  </div>
                </div>

                {/* Context Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Billed To</span>
                    <strong className="text-slate-800">{currentInvoice?.organization_name || organization.name}</strong>
                    <div className="text-[10px] text-slate-500 font-mono">Org ID: {organization.id}</div>
                    {customPoNumber && (
                      <div className="text-[10px] text-slate-600 font-mono">Ref: {customPoNumber}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Subscription</span>
                    <strong className="text-slate-800">{currentInvoice?.plan_name || 'CNTEstates Business / Plus'}</strong>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {formatBillingCadenceLabel(currentInvoice?.billing_period || 'monthly')}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold uppercase font-mono">
                      Status: {(currentInvoice?.payment_status || 'PAID')}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-white text-[10px] uppercase" style={{ backgroundColor: brandColor }}>
                      <th className="py-1 px-2 rounded-l">Item Description</th>
                      <th className="py-1 px-2 text-center">Qty</th>
                      <th className="py-1 px-2 text-right">Price</th>
                      <th className="py-1 px-2 text-right rounded-r">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr className="bg-slate-50/50">
                      <td className="py-1.5 px-2 font-medium">
                        {currentInvoice?.plan_name || 'CNTEstates Subscription Tier'} ({formatBillingCadenceLabel(currentInvoice?.billing_period || 'monthly')})
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono">1</td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {formatSubscriptionPrice(currentInvoice?.subtotal || 3778, currency)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold">
                        {formatSubscriptionPrice(currentInvoice?.subtotal || 3778, currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-between items-end pt-1">
                  <div className="text-[10px] text-slate-500 max-w-[200px]">
                    <div>{taxProfile.taxAuthorityName}</div>
                    <div>Zero decimal places applied to regional currency.</div>
                  </div>

                  <div className="w-48 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Net Subtotal:</span>
                      <span className="font-mono">{formatSubscriptionPrice(currentInvoice?.subtotal || 3778, currency)}</span>
                    </div>
                    {includeTaxBreakdown && (
                      <div className="flex justify-between text-slate-600">
                        <span>{taxProfile.taxType} ({taxProfile.standardRatePercent}%):</span>
                        <span className="font-mono">{formatSubscriptionPrice(currentInvoice?.tax || 667, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200 text-slate-900">
                      <span>Total ({currency}):</span>
                      <span className="font-mono" style={{ color: brandColor }}>
                        {formatSubscriptionPrice(currentInvoice?.total || currentInvoice?.billed_amount || 4445, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Seal Note */}
                {includeAuditSeal && (
                  <div className="p-1.5 bg-slate-100 rounded text-[9px] text-slate-600 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      <span>Certified WORM Ledger Record</span>
                    </span>
                    <span>Role: {userRole}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBatchExportPdf}
                disabled={isExporting || invoicesList.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Download all organization invoices in one combined multi-page PDF"
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Export All Invoices ({invoicesList.length} Records)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSinglePdf}
                disabled={isExporting}
                className="w-full sm:w-auto px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-95"
                style={{ backgroundColor: brandColor }}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Branded PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Branded PDF ({currentInvoice?.invoice_number || 'Invoice'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
