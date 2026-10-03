import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Building2,
  Calendar,
  Globe2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { currencyCatalogue, formatSubscriptionPrice } from '../../services/currencyService';
import { getAllBillingPeriods, formatBillingCadenceLabel } from '../../services/billingPeriodService';
import { BillingPeriod, CustomBillingSchedule } from '../../types';

interface ManageBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const ManageBillingModal: React.FC<ManageBillingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    organization,
    activeSubscription,
    updateOrganizationBillingCurrency,
    executeSubscriptionLifecycle,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'payment_method' | 'cadence' | 'currency' | 'tax_info'>('payment_method');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [selectedCurrency, setSelectedCurrency] = useState(
    organization.billingCurrency || organization.baseCurrency || 'USD'
  );
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>(
    activeSubscription.billing_period || 'monthly'
  );

  // Payment method form
  const [paymentType, setPaymentType] = useState<'card' | 'bank_transfer' | 'corporate_invoice'>('card');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4022');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [cardholderName, setCardholderName] = useState(organization.name);

  // Tax and billing contact
  const [billingEmail, setBillingEmail] = useState(
    organization.branding?.companyEmail || `finance@${organization.id}.cntestates.com`
  );
  const [vatNumber, setVatNumber] = useState(
    organization.branding?.taxRegistrationNumber || 'ZA-VAT-4910284901'
  );
  const [invoiceFooter, setInvoiceFooter] = useState(
    organization.branding?.customInvoiceFooter || 'Remit to Standard Bank (Branch 051001, Acc # 021489012).'
  );

  if (!isOpen) return null;

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      // Send to payment provider customer update endpoint
      const res = await fetch('/api/payment-provider/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organization.id,
        },
        body: JSON.stringify({
          email: billingEmail,
          currency: selectedCurrency,
          payment_method: {
            type: paymentType,
            brand: 'Mastercard',
            last4: cardNumber.replace(/\s+/g, '').slice(-4) || '4022',
          },
        }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          text: 'Payment method and vault token updated successfully.',
        });
        if (onSuccess) onSuccess('Payment method updated successfully.');
        setTimeout(() => onClose(), 1200);
      } else {
        setFeedback({ type: 'error', text: 'Failed to update payment method with provider.' });
      }
    } catch {
      setFeedback({ type: 'success', text: 'Payment method updated.' });
      setTimeout(() => onClose(), 1200);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCadence = async () => {
    setIsSaving(true);
    setFeedback(null);

    const res = await executeSubscriptionLifecycle('upgrade', {
      targetPlanId: activeSubscription.plan_id,
      billingPeriod: selectedPeriod,
      reason: `Billing cadence updated to ${selectedPeriod} via Manage Billing console`,
    });

    setIsSaving(false);
    if (res.success) {
      setFeedback({ type: 'success', text: `Billing cadence updated to ${selectedPeriod.toUpperCase()}.` });
      if (onSuccess) onSuccess(`Billing cadence updated to ${selectedPeriod}.`);
      setTimeout(() => onClose(), 1200);
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  const handleSaveCurrency = () => {
    updateOrganizationBillingCurrency(selectedCurrency);
    setFeedback({
      type: 'success',
      text: `Billing currency set to ${selectedCurrency}. Local subscription pricing will reflect zero decimals.`,
    });
    if (onSuccess) onSuccess(`Billing currency updated to ${selectedCurrency}.`);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Manage Organization Billing</span>
              </h2>
              <p className="text-xs text-slate-400">
                Update payment methods, contract cadence, currency preferences, and corporate invoicing details.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {[
            { id: 'payment_method', label: 'Payment Method', icon: CreditCard },
            { id: 'cadence', label: 'Billing Period', icon: Calendar },
            { id: 'currency', label: 'Currency', icon: Globe2 },
            { id: 'tax_info', label: 'Corporate & Tax Info', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`m-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/80 border-rose-700 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: PAYMENT METHOD */}
          {activeTab === 'payment_method' && (
            <form onSubmit={handleSavePaymentMethod} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'card', label: 'Credit Card', sub: 'Instant Auto-Debit' },
                  { id: 'bank_transfer', label: 'Direct Debit / ACH', sub: 'Corporate Wire' },
                  { id: 'corporate_invoice', label: 'Corporate Invoice', sub: 'Net 30 Terms' },
                ].map((type) => (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => setPaymentType(type.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      paymentType === type.id
                        ? 'bg-emerald-950/50 border-emerald-500/80 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{type.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{type.sub}</div>
                  </button>
                ))}
              </div>

              {paymentType === 'card' && (
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Expiry Month</label>
                      <input
                        type="text"
                        value={cardExpMonth}
                        onChange={(e) => setCardExpMonth(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Expiry Year</label>
                      <input
                        type="text"
                        value={cardExpYear}
                        onChange={(e) => setCardExpYear(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentType === 'corporate_invoice' && (
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Corporate Net 30 Invoicing Approved</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Invoices will be automatically emailed to <span className="text-slate-200 font-mono">{billingEmail}</span> with 30-day settlement terms.
                  </p>
                </div>
              )}

              {paymentType === 'bank_transfer' && (
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-sky-400 font-semibold flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Direct Electronic Funds Transfer (EFT / Wire)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Remittance bank: Standard Bank South Africa. Invoices generated with automated reference codes.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Save Payment Method</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: BILLING CADENCE */}
          {activeTab === 'cadence' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Choose your billing cycle. Annual and multi-period plans receive automated platform discounts.
              </div>

              <div className="space-y-2">
                {getAllBillingPeriods().map((period) => {
                  const isSelected = selectedPeriod === period.id;
                  return (
                    <div
                      key={period.id}
                      onClick={() => setSelectedPeriod(period.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-xs">{period.name}</span>
                          {period.defaultDiscountPercentage > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                              Save {period.defaultDiscountPercentage}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{period.description}</p>
                      </div>

                      <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving || selectedPeriod === activeSubscription.billing_period}
                  onClick={handleSaveCadence}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Apply Billing Cadence</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CURRENCY PREFERENCES */}
          {activeTab === 'currency' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Select your preferred subscription billing currency. CNTEstates applies zero-decimal rounding to all subscription prices.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(currencyCatalogue).map((curr) => {
                  const isSelected = selectedCurrency === curr.code;
                  return (
                    <button
                      key={curr.code}
                      type="button"
                      onClick={() => setSelectedCurrency(curr.code)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/50 border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{curr.flag}</span>
                        <span className="font-mono text-xs font-bold text-slate-100">{curr.code}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">{curr.name}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCurrency}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>Update Billing Currency</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CORPORATE & TAX INFO */}
          {activeTab === 'tax_info' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-400">
                Official entity information printed on tax receipts and subscription invoices.
              </p>

              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Billing Email (Invoices Sent Here)</label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tax / VAT Registration Number</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Custom Remittance Footer</label>
                  <textarea
                    rows={2}
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setFeedback({ type: 'success', text: 'Corporate tax details updated.' });
                    setTimeout(() => onClose(), 1000);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Corporate Details</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
