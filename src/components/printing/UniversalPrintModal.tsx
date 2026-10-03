import React, { useState } from 'react';
import { PrintDocumentPayload, PrintConfig } from '../../types';
import { useApp } from '../../context/AppContext';
import { PrintDocumentView } from './PrintDocumentView';
import {
  Printer,
  FileDown,
  X,
  Settings2,
  Check,
  Globe2,
  Eye,
  Sliders,
  DollarSign,
  Maximize2,
} from 'lucide-react';

interface UniversalPrintModalProps {
  payload: PrintDocumentPayload;
  onClose: () => void;
}

export const UniversalPrintModal: React.FC<UniversalPrintModalProps> = ({ payload, onClose }) => {
  const {
    organization,
    userPreferredCurrency,
    organizationBaseCurrency,
    language,
    addAuditLog,
    customExchangeRates,
  } = useApp();

  const [config, setConfig] = useState<PrintConfig>({
    pageSize: 'A4',
    orientation: 'portrait',
    includeBranding: true,
    includeDate: true,
    includeFilters: true,
    includeConfidentiality: true,
    includeSignatures: payload.type === 'invoice' || payload.type === 'work_order' || payload.type === 'service_ticket',
    currencyMode: 'base',
  });

  const [activeTab, setActiveTab] = useState<'preview' | 'options'>('preview');

  const handlePrint = () => {
    // Record audit trail of document printing
    addAuditLog(
      'DOCUMENT_PRINTED',
      'PrintEngine',
      payload.documentNumber || payload.title,
      undefined,
      `Printed ${payload.type} "${payload.title}" in ${config.currencyMode === 'preferred' ? userPreferredCurrency : organizationBaseCurrency}`
    );

    // Trigger window print
    window.print();
  };

  const handleSavePDF = () => {
    addAuditLog(
      'DOCUMENT_EXPORTED_PDF',
      'PrintEngine',
      payload.documentNumber || payload.title,
      undefined,
      `Exported PDF for ${payload.type} "${payload.title}"`
    );

    // Modern browsers support Save to PDF directly through window.print() destination
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col backdrop-blur-xs print:p-0 print:bg-white print:fixed-none">
      {/* Top Controls Toolbar (Hidden in Print) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-100 print:hidden shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">{payload.title}</span>
              {payload.documentNumber && (
                <span className="font-mono text-xs text-emerald-400 font-semibold">
                  #{payload.documentNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Universal Print & Document Engine · Document Type: <strong className="text-slate-300 uppercase">{payload.type.replace('_', ' ')}</strong>
            </p>
          </div>
        </div>

        {/* Quick Config Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Display Mode Selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setConfig({ ...config, currencyMode: 'base' })}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                config.currencyMode === 'base'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Print in Organization Base Currency (${organizationBaseCurrency})`}
            >
              Base ({organizationBaseCurrency})
            </button>
            <button
              onClick={() => setConfig({ ...config, currencyMode: 'preferred' })}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                config.currencyMode === 'preferred'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Print in User Display Preference (${userPreferredCurrency})`}
            >
              Display ({userPreferredCurrency})
            </button>
          </div>

          {/* Page Size & Orientation Toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 text-xs">
            <button
              onClick={() => setConfig({ ...config, pageSize: config.pageSize === 'A4' ? 'Letter' : 'A4' })}
              className="px-2 py-0.5 rounded text-slate-300 hover:text-white font-mono"
            >
              {config.pageSize}
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() =>
                setConfig({
                  ...config,
                  orientation: config.orientation === 'portrait' ? 'landscape' : 'portrait',
                })
              }
              className="px-2 py-0.5 rounded text-slate-300 hover:text-white capitalize"
            >
              {config.orientation}
            </button>
          </div>

          {/* Toggle Options Panel */}
          <button
            onClick={() => setActiveTab(activeTab === 'preview' ? 'options' : 'preview')}
            className={`p-2 rounded-lg border transition-colors ${
              activeTab === 'options'
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Configure print options"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Save PDF Action */}
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Save as PDF</span>
          </button>

          {/* Primary Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Now</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
        {activeTab === 'options' ? (
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 space-y-5 self-center">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Print Layout & Formatting Options</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Standard Paper Size</label>
                  <select
                    value={config.pageSize}
                    onChange={(e) => setConfig({ ...config, pageSize: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">US Letter (8.5 × 11 in)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Page Orientation</label>
                  <select
                    value={config.orientation}
                    onChange={(e) => setConfig({ ...config, orientation: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeBranding}
                    onChange={(e) => setConfig({ ...config, includeBranding: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include Organization Logo & Company Details</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeDate}
                    onChange={(e) => setConfig({ ...config, includeDate: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include Audit Generation Timestamp</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeFilters}
                    onChange={(e) => setConfig({ ...config, includeFilters: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include Filter Criteria Section</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSignatures}
                    onChange={(e) => setConfig({ ...config, includeSignatures: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include Signatures & Verification Block</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeConfidentiality}
                    onChange={(e) => setConfig({ ...config, includeConfidentiality: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Include Organization Confidentiality Notice</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Return to Document Preview
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center print:w-full print:block">
            <PrintDocumentView
              payload={payload}
              config={config}
              organization={organization}
              userPreferredCurrency={userPreferredCurrency}
              language={language}
              customExchangeRates={customExchangeRates}
            />
          </div>
        )}
      </div>
    </div>
  );
};
