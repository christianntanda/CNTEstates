import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DollarSign, X, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../i18n/translations';

export const RecordPaymentModal: React.FC<{ defaultTenantId?: string; onClose: () => void }> = ({
  defaultTenantId,
  onClose,
}) => {
  const { tenants, recordRentPayment, currency, language } = useApp();

  const [tenantId, setTenantId] = useState(defaultTenantId || tenants[0]?.id || '');
  const [amount, setAmount] = useState<number>(3200);
  const [method, setMethod] = useState('ach');
  const [reference, setReference] = useState('');

  const selectedTenant = tenants.find((t) => t.id === tenantId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || amount <= 0) return;

    recordRentPayment(tenantId, Number(amount));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base">Record Inbound Rent Payment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Payer / Tenant *</label>
            <select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                const tObj = tenants.find((t) => t.id === e.target.value);
                if (tObj && tObj.outstandingBalance > 0) {
                  setAmount(tObj.outstandingBalance);
                }
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Balance: {formatCurrency(t.outstandingBalance, currency, language)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Remitted Amount ({currency}) *</label>
            <input
              type="number"
              required
              min="1"
              step="50"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="ach">Bank Wire / ACH Direct Debit</option>
              <option value="card">Credit Card (Stripe / Gateway)</option>
              <option value="cheque">Certified Bank Cheque</option>
              <option value="cash">Cash Counter Receipt</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Bank Reference / Transaction Tag</label>
            <input
              type="text"
              placeholder="e.g. TR-ACH-991204"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm"
            >
              Post Payment Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
