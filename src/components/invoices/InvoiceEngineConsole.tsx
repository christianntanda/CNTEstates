import React, { useState, useMemo } from 'react';
import {
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Search,
  Filter,
  Printer,
  DollarSign,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  Eye,
  X,
  Building,
  Calendar,
  AlertTriangle,
  Receipt,
  Check,
  FileDown,
} from 'lucide-react';
import {
  SubscriptionInvoice,
  InvoiceStatus,
  InvoicePaymentStatus,
  BillingPeriod,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { initialOrganizations } from '../../data/mockDatabase';
import {
  INVOICE_STATUS_META,
  isInvoiceImmutable,
  ALLOWED_STATUS_TRANSITIONS,
} from '../../services/invoiceEngine';
import { formatSubscriptionPrice } from '../../services/currencyService';

/**
 * Generates an authoritative, print-ready, stand-alone HTML/PDF invoice
 * utilizing the CNTEstates corporate styling and statutory layout.
 */
export const generateInvoiceDocumentEngineHtml = (
  inv: SubscriptionInvoice,
  org: any
): string => {
  const branding = org?.branding || {
    companyName: org?.name || 'Centurion Realty Holdings Ltd',
    companyAddress: '100 Sandton Drive, Sandton, Johannesburg, South Africa',
    companyPhone: '+27 11 883 9000',
    companyEmail: 'operations@centurionrealty.co.za',
    companyWebsite: 'https://centurionrealty.co.za',
    taxRegistrationNumber: 'ZA-VAT-4910284901',
    businessRegistrationNumber: '2018/489102/07',
    customInvoiceFooter: 'Thank you for your tenancy. Please quote invoice number on all remittances.',
  };

  const lineItems =
    inv.line_items && inv.line_items.length > 0
      ? inv.line_items
      : [
          {
            description: `${inv.plan_name || 'Enterprise Platform Subscription'} (${inv.billing_period.toUpperCase()})`,
            quantity: 1,
            unit_price: inv.subtotal,
            amount: inv.subtotal,
          },
        ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CNTEstates Invoice - ${inv.invoice_number}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 32px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #047857;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #047857;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .company-name {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .company-details {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.4;
    }
    .inv-header-meta {
      text-align: right;
    }
    .doc-pill {
      background: #047857;
      color: white;
      font-weight: 800;
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 4px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .inv-num {
      font-size: 18px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
      margin: 8px 0 4px 0;
    }
    .date-meta {
      font-size: 11px;
      color: #64748b;
    }
    .date-meta strong {
      color: #1e293b;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 11px;
    }
    .meta-col {
      display: flex;
      flex-direction: column;
    }
    .meta-lbl {
      color: #64748b;
      text-transform: uppercase;
      font-size: 9px;
      font-weight: 700;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .meta-val {
      font-weight: 600;
      color: #0f172a;
      word-break: break-all;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      border-bottom: 2px solid #cbd5e1;
      letter-spacing: 0.5px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
      font-size: 12px;
    }
    .text-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .text-right {
      text-align: right;
    }
    .summary-card {
      width: 320px;
      margin-left: auto;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 28px;
    }
    .sum-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      color: #475569;
    }
    .sum-row.total {
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .sum-row.due {
      font-size: 13px;
      font-weight: 800;
      color: ${inv.amount_due > 0 ? '#b45309' : '#047857'};
      border-top: 1px dashed #cbd5e1;
      margin-top: 4px;
      padding-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .badge-open { background: #e0f2fe; color: #075985; border: 1px solid #7dd3fc; }
    .badge-past_due { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-draft { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .badge-immutable {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .audit-box {
      background: #f8fafc;
      border-left: 3px solid #047857;
      padding: 10px 14px;
      font-size: 10.5px;
      color: #475569;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      text-align: center;
      font-size: 10px;
      color: #64748b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">CNTEstates</h1>
      <div class="company-name">${branding.companyName}</div>
      <div class="company-details">
        ${branding.companyAddress}<br>
        Tel: ${branding.companyPhone} · Email: ${branding.companyEmail}<br>
        Tax / VAT ID: <strong>${branding.taxRegistrationNumber || 'ZA-VAT-4910284901'}</strong> · Reg #: <strong>${branding.businessRegistrationNumber || '2018/489102/07'}</strong>
      </div>
    </div>
    <div class="inv-header-meta">
      <div class="doc-pill">Enterprise Tax Invoice</div>
      <div class="inv-num">#${inv.invoice_number}</div>
      <div class="date-meta">Date: <strong>${inv.invoice_date}</strong></div>
      <div class="date-meta" style="color: #b91c1c;">Due: <strong>${inv.due_date}</strong></div>
      <div style="margin-top: 6px;">
        <span class="badge ${
          inv.invoice_status === 'paid'
            ? 'badge-paid'
            : inv.invoice_status === 'past_due'
            ? 'badge-past_due'
            : inv.invoice_status === 'open'
            ? 'badge-open'
            : 'badge-draft'
        }">${inv.invoice_status}</span>
        ${
          isInvoiceImmutable(inv)
            ? '<span class="badge badge-immutable" style="margin-left: 4px;">✓ LOCKED IMMUTABLE</span>'
            : ''
        }
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-col">
      <span class="meta-lbl">Customer Organization</span>
      <span class="meta-val">${inv.organization_name || org?.name || 'Customer Organization'}</span>
      <span style="color: #64748b; font-size: 10px;">ID: ${inv.organization_id}</span>
    </div>
    <div class="meta-col">
      <span class="meta-lbl">Subscription Plan</span>
      <span class="meta-val">${inv.plan_name || 'Enterprise Portfolio'}</span>
      <span style="color: #64748b; font-size: 10px;">Sub ID: ${inv.subscription_id}</span>
    </div>
    <div class="meta-col">
      <span class="meta-lbl">Billing Cadence</span>
      <span class="meta-val" style="text-transform: uppercase;">${inv.billing_period}</span>
      <span style="color: #64748b; font-size: 10px;">Currency: ${inv.currency}</span>
    </div>
    <div class="meta-col">
      <span class="meta-lbl">Payment Method</span>
      <span class="meta-val">${inv.payment_method}</span>
      <span style="color: #64748b; font-size: 10px;">Status: ${inv.payment_status.toUpperCase()}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 55%;">Line Item Description</th>
        <th style="width: 10%; text-align: center;">Qty</th>
        <th style="width: 17%; text-align: right;">Unit Price</th>
        <th style="width: 18%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems
        .map(
          (item) => `
        <tr>
          <td>
            <strong>${item.description}</strong>
          </td>
          <td style="text-align: center;" class="text-mono">${item.quantity}</td>
          <td class="text-right text-mono">${formatSubscriptionPrice(item.unit_price, inv.currency)}</td>
          <td class="text-right text-mono font-bold">${formatSubscriptionPrice(item.amount, inv.currency)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="summary-card">
    <div class="sum-row">
      <span>Subtotal (Net Amount):</span>
      <span class="text-mono font-semibold">${formatSubscriptionPrice(inv.subtotal, inv.currency)}</span>
    </div>
    ${
      inv.discount > 0
        ? `<div class="sum-row" style="color: #047857;">
             <span>Promotional / Proration Credit:</span>
             <span class="text-mono">-${formatSubscriptionPrice(inv.discount, inv.currency)}</span>
           </div>`
        : ''
    }
    <div class="sum-row">
      <span>Jurisdiction Tax / VAT:</span>
      <span class="text-mono font-semibold">${formatSubscriptionPrice(inv.tax, inv.currency)}</span>
    </div>
    <div class="sum-row total">
      <span>Total Billed Amount:</span>
      <span class="text-mono">${formatSubscriptionPrice(inv.total, inv.currency)}</span>
    </div>
    <div class="sum-row" style="color: #047857; margin-top: 4px;">
      <span>Amount Paid (Settled to Date):</span>
      <span class="text-mono font-bold">${formatSubscriptionPrice(inv.amount_paid, inv.currency)}</span>
    </div>
    <div class="sum-row due">
      <span>Outstanding Balance Due:</span>
      <span class="text-mono">${formatSubscriptionPrice(inv.amount_due, inv.currency)}</span>
    </div>
  </div>

  <div class="audit-box">
    <strong>CNTEstates Document Engine Audit Verification (Sequence 15):</strong><br>
    Invoice Primary Key: <span class="text-mono">${inv.invoice_id}</span> · External Gateway Token: <span class="text-mono">${inv.external_invoice_id}</span><br>
    Creation Timestamp: <span class="text-mono">${inv.created_at}</span> · Audit Reconciled: <span class="text-mono">${inv.updated_at}</span><br>
    <em>Under platform compliance rules, historical paid, void, uncollectible, or cancelled invoices are locked permanently against mutations.</em>
  </div>

  <div class="footer">
    ${branding.customInvoiceFooter || 'Thank you for your tenancy. Please quote invoice number on all remittances.'}<br>
    Official Billing Record · Generated by CNTEstates Document Engine · Confidential Enterprise Documentation
  </div>
</body>
</html>`;
};

export const InvoiceEngineConsole: React.FC = () => {
  const {
    organization,
    invoices,
    payInvoice,
    transitionInvoiceStatus,
    createInvoice,
    refreshInvoices,
    openPrint,
    currentUser,
    addAuditLog,
  } = useApp();

  const [viewMode, setViewMode] = useState<'history' | 'lifecycle'>('history');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);

  // Modal States
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<SubscriptionInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Mastercard •••• 4022');
  const [isPaying, setIsPaying] = useState(false);

  const [statusModalInvoice, setStatusModalInvoice] = useState<SubscriptionInvoice | null>(null);
  const [targetStatus, setTargetStatus] = useState<InvoiceStatus>('open');
  const [statusReason, setStatusReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubtotal, setNewSubtotal] = useState(2500);
  const [newTax, setNewTax] = useState(375);
  const [newDiscount, setNewDiscount] = useState(0);
  const [newBillingPeriod, setNewBillingPeriod] = useState<BillingPeriod>('monthly');
  const [newStatus, setNewStatus] = useState<InvoiceStatus>('open');
  const [newNotes, setNewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const billingCurrency = organization.billingCurrency || organization.baseCurrency || 'USD';

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (statusFilter !== 'all') {
      list = list.filter((inv) => inv.invoice_status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.invoice_id.toLowerCase().includes(q) ||
          inv.external_invoice_id.toLowerCase().includes(q) ||
          (inv.plan_name && inv.plan_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [invoices, statusFilter, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let immutableCount = 0;

    invoices.forEach((inv) => {
      if (inv.invoice_status !== 'void' && inv.invoice_status !== 'cancelled') {
        totalInvoiced += inv.total;
        totalPaid += inv.amount_paid;
        totalDue += inv.amount_due;
      }
      if (isInvoiceImmutable(inv)) {
        immutableCount++;
      }
    });

    return { totalInvoiced, totalPaid, totalDue, immutableCount };
  }, [invoices]);

  // Counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    (Object.keys(INVOICE_STATUS_META) as InvoiceStatus[]).forEach((st) => {
      counts[st] = invoices.filter((i) => i.invoice_status === st).length;
    });
    return counts;
  }, [invoices]);

  const handlePrint = (inv: SubscriptionInvoice) => {
    openPrint({
      type: 'invoice',
      title: `CNTEstates Enterprise Tax Invoice - ${inv.invoice_number}`,
      documentNumber: inv.invoice_number,
      date: inv.invoice_date,
      dueDate: inv.due_date,
      originalCurrency: 'USD',
      originalAmount: inv.master_price_usd ?? inv.subtotal,
      displayCurrency: inv.currency,
      displayAmount: inv.total,
      exchangeRate: inv.exchange_rate ?? 1.0,
      exchangeRateDate: inv.invoice_date,
      sections: [
        {
          title: 'Invoice Identifiers & Classification (Sequence 14)',
          items: [
            { label: 'Invoice Identifier', value: inv.invoice_id },
            { label: 'Invoice Document #', value: inv.invoice_number, highlight: true },
            { label: 'External Gateway ID', value: inv.external_invoice_id },
            { label: 'Organization ID', value: inv.organization_id },
            { label: 'Subscription ID', value: inv.subscription_id },
            { label: 'Billing Cadence', value: inv.billing_period.toUpperCase() },
            { label: 'Issuance Date', value: inv.invoice_date },
            { label: 'Payment Due Date', value: inv.due_date },
            { label: 'Payment Status', value: inv.payment_status.toUpperCase() },
            { label: 'Invoice Lifecycle Status', value: inv.invoice_status.toUpperCase(), highlight: true },
            { label: 'Payment Method', value: inv.payment_method },
            { label: 'Historical Immutability', value: isInvoiceImmutable(inv) ? 'LOCKED / IMMUTABLE' : 'ACTIONABLE' },
          ],
        },
        {
          title: 'Authoritative Itemized Financial Ledger',
          table: {
            headers: ['Line Item Description', 'Quantity', 'Unit Price', 'Total Amount'],
            rows: (inv.line_items || []).map((item) => [
              item.description,
              String(item.quantity),
              formatSubscriptionPrice(item.unit_price, inv.currency),
              formatSubscriptionPrice(item.amount, inv.currency),
            ]),
            summary: [
              { label: 'Subtotal (Net)', value: formatSubscriptionPrice(inv.subtotal, inv.currency) },
              { label: 'Promotional / Proration Discount', value: `-${formatSubscriptionPrice(inv.discount, inv.currency)}` },
              { label: 'Tax / VAT Amount', value: formatSubscriptionPrice(inv.tax, inv.currency) },
              { label: 'Total Invoiced (Gross)', value: formatSubscriptionPrice(inv.total, inv.currency) },
              { label: 'Settled to Date (Amount Paid)', value: formatSubscriptionPrice(inv.amount_paid, inv.currency) },
              { label: 'Outstanding Balance Due', value: formatSubscriptionPrice(inv.amount_due, inv.currency) },
            ],
          },
          notes: 'Commercial Invoice Mandate: Historical invoices (Paid, Void, Cancelled, Uncollectible) are immutable under platform enterprise audit policy.',
        },
      ],
      meta: {
        generatedBy: 'CNTEstates Sequence 14 Authoritative Invoice Engine',
        confidentialityNotice: 'Binding commercial invoice document. Zero decimals applied to regional currencies.',
      },
    });
  };

  const handleDownloadPDF = (inv: SubscriptionInvoice) => {
    // 1. Audit log export via CNTEstates Document Engine
    addAuditLog(
      'DOCUMENT_EXPORTED_PDF',
      'CNTEstatesDocumentEngine',
      inv.invoice_number,
      undefined,
      `Exported authoritative PDF tax invoice ${inv.invoice_number} for ${organization.name}`
    );

    // 2. Generate and download standalone compliant tax invoice HTML document
    const htmlContent = generateInvoiceDocumentEngineHtml(inv, organization);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CNTEstates-Invoice-${inv.invoice_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 3. Open universal print engine so user can also use browser native Save to PDF
    handlePrint(inv);
  };

  const handleExportAllCSV = () => {
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Billing Period',
      'Plan',
      'Amount (Net)',
      'Currency',
      'Tax',
      'Total',
      'Amount Paid',
      'Amount Due',
      'Payment Status',
      'Invoice Status',
      'Payment Method',
      'External Invoice ID',
      'Immutable',
    ];

    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoice_number}"`,
      `"${inv.invoice_date}"`,
      `"${inv.billing_period}"`,
      `"${inv.plan_name || inv.plan_id}"`,
      inv.subtotal,
      `"${inv.currency}"`,
      inv.tax,
      inv.total,
      inv.amount_paid,
      inv.amount_due,
      `"${inv.payment_status}"`,
      `"${inv.invoice_status}"`,
      `"${inv.payment_method}"`,
      `"${inv.external_invoice_id}"`,
      isInvoiceImmutable(inv) ? 'YES' : 'NO',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CNTEstates-Billing-History-${organization.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog(
      'DOCUMENT_EXPORTED_CSV',
      'CNTEstatesDocumentEngine',
      organization.id,
      undefined,
      `Exported billing history CSV ledger (${filteredInvoices.length} invoices)`
    );
  };

  const handleExecutePayment = async () => {
    if (!paymentModalInvoice) return;
    setIsPaying(true);
    setActionFeedback(null);

    try {
      const res = await payInvoice(paymentModalInvoice.invoice_id, paymentAmount, paymentMethod);
      if (res.success && res.invoice) {
        setActionFeedback({
          type: 'success',
          message: `Payment of ${formatSubscriptionPrice(paymentAmount, res.invoice.currency)} applied to ${res.invoice.invoice_number}. New status: ${res.invoice.invoice_status.toUpperCase()}${res.invoice.immutable ? ' (Locked Immutable)' : ''}.`,
        });
        setPaymentModalInvoice(null);
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Payment failed.',
        });
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleExecuteStatusTransition = async () => {
    if (!statusModalInvoice) return;
    setIsTransitioning(true);
    setActionFeedback(null);

    try {
      const res = await transitionInvoiceStatus(
        statusModalInvoice.invoice_id,
        targetStatus,
        statusReason || `Transitioned by ${currentUser.name}`
      );
      if (res.success && res.invoice) {
        setActionFeedback({
          type: 'success',
          message: `Invoice ${res.invoice.invoice_number} transitioned to status '${res.invoice.invoice_status.toUpperCase()}'${res.invoice.immutable ? ' (Locked Immutable)' : ''}.`,
        });
        setStatusModalInvoice(null);
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Transition failed.',
        });
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCreateNewInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setActionFeedback(null);

    try {
      const res = await createInvoice({
        subtotal: newSubtotal,
        tax: newTax,
        discount: newDiscount,
        billing_period: newBillingPeriod,
        invoice_status: newStatus,
        payment_method: 'Corporate Invoice / Net 30 Terms',
        notes: newNotes,
      });

      if (res.success && res.invoice) {
        setActionFeedback({
          type: 'success',
          message: `Invoice ${res.invoice.invoice_number} generated successfully with status ${res.invoice.invoice_status.toUpperCase()}.`,
        });
        setIsCreateModalOpen(false);
      } else {
        setActionFeedback({
          type: 'error',
          message: res.error || 'Could not generate invoice.',
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-sky-700 text-white rounded-xl shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Authoritative Invoicing & Billing History Engine
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
                Sequence 15 History
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 border border-indigo-900 px-2 py-0.5 rounded font-bold uppercase">
                Sequence 14 Lifecycle
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Accessible enterprise billing history with 12 mandated financial metrics, CNTEstates document engine integration, and immutable historical archives.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refreshInvoices()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Refresh Invoices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportAllCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Export Invoicing History CSV Ledger"
          >
            <FileDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Invoice</span>
          </button>
        </div>
      </div>

      {/* Mode View Switcher (Sequence 15 History vs Sequence 14 Lifecycle) */}
      <div className="flex items-center justify-between gap-3 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sequence 15 — Invoicing & Billing History (12 Mandated Fields)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('lifecycle')}
            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'lifecycle'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sequence 14 — Invoice Lifecycle & Immutability Engine</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden md:inline px-2">
          {filteredInvoices.length} Available Invoices · Organization: {organization.name}
        </span>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-slate-400">TOTAL BILLED VOLUME</span>
          <div className="text-base sm:text-lg font-extrabold text-white">
            {formatSubscriptionPrice(metrics.totalInvoiced, billingCurrency)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Gross valid receivables</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-emerald-400">TOTAL SETTLED (PAID)</span>
          <div className="text-base sm:text-lg font-extrabold text-emerald-400">
            {formatSubscriptionPrice(metrics.totalPaid, billingCurrency)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Reconciled payments</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-amber-400">OUTSTANDING BALANCE DUE</span>
          <div className="text-base sm:text-lg font-extrabold text-amber-300">
            {formatSubscriptionPrice(metrics.totalDue, billingCurrency)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Open & past due balances</span>
        </div>

        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] font-mono text-sky-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-sky-400" />
            <span>IMMUTABLE RECORDS</span>
          </span>
          <div className="text-base sm:text-lg font-extrabold text-slate-100">
            {metrics.immutableCount} / {invoices.length}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Locked historical records</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        {/* Status Filter Tabs (All 8 Statuses Supported) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            All Statuses ({statusCounts.all || 0})
          </button>
          {(Object.keys(INVOICE_STATUS_META) as InvoiceStatus[]).map((st) => {
            const meta = INVOICE_STATUS_META[st];
            const count = statusCounts[st] || 0;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice #, invoice ID, gateway token, or plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: SEQUENCE 15 INVOICING HISTORY (12 MANDATED FIELDS) */}
      {/* ========================================================= */}
      {viewMode === 'history' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Billing History Ledger: Supporting all 12 mandated financial metrics & CNTEstates document export
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Showing {filteredInvoices.length} of {invoices.length} Invoices
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Invoice Date</th>
                  <th className="py-3 px-3">Billing Period</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-2 text-center">Currency</th>
                  <th className="py-3 px-3">Tax</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3">Amount Due</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3">Invoice Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-900/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-500">
                      No invoices found in billing history matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const meta = INVOICE_STATUS_META[inv.invoice_status] || INVOICE_STATUS_META.open;
                    const isLocked = isInvoiceImmutable(inv);
                    const canPay = !isLocked && inv.invoice_status !== 'draft' && inv.amount_due > 0;
                    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[inv.invoice_status] || [];

                    return (
                      <tr key={inv.invoice_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* 1. Invoice Number */}
                        <td className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{inv.invoice_number}</span>
                          </div>
                        </td>

                        {/* 2. Invoice Date */}
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {inv.invoice_date}
                        </td>

                        {/* 3. Billing Period */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono uppercase text-slate-300">
                            {inv.billing_period}
                          </span>
                        </td>

                        {/* 4. Plan */}
                        <td className="py-3 px-3 font-sans text-slate-200 max-w-[150px] truncate" title={inv.plan_name || inv.plan_id}>
                          {inv.plan_name || inv.plan_id}
                        </td>

                        {/* 5. Amount (Net Subtotal) */}
                        <td className="py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">
                          {formatSubscriptionPrice(inv.subtotal, inv.currency)}
                        </td>

                        {/* 6. Currency */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300">
                            {inv.currency}
                          </span>
                        </td>

                        {/* 7. Tax */}
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {formatSubscriptionPrice(inv.tax, inv.currency)}
                        </td>

                        {/* 8. Total */}
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          {formatSubscriptionPrice(inv.total, inv.currency)}
                        </td>

                        {/* 9. Amount Paid */}
                        <td className="py-3 px-3 text-emerald-400 font-semibold whitespace-nowrap">
                          {formatSubscriptionPrice(inv.amount_paid, inv.currency)}
                        </td>

                        {/* 10. Amount Due */}
                        <td className={`py-3 px-3 font-bold whitespace-nowrap ${inv.amount_due > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {formatSubscriptionPrice(inv.amount_due, inv.currency)}
                        </td>

                        {/* 11. Payment Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              inv.payment_status === 'paid'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : inv.payment_status === 'partially_paid'
                                ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                                : inv.payment_status === 'failed'
                                ? 'bg-rose-950 text-rose-400 border-rose-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {inv.payment_status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* 12. Invoice Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>

                        {/* Professional Actions (View, Print, PDF/download) */}
                        <td className="py-3 px-3 text-right font-sans whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View */}
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                              title="View Invoice Audit Breakdown (All 20 Properties)"
                            >
                              <Eye className="w-3 h-3 text-indigo-400" />
                              <span>View</span>
                            </button>

                            {/* Print (Document Engine) */}
                            <button
                              onClick={() => handlePrint(inv)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                              title="Print Invoice via CNTEstates Document Engine"
                            >
                              <Printer className="w-3 h-3 text-emerald-400" />
                              <span>Print</span>
                            </button>

                            {/* PDF/Download (Document Engine) */}
                            <button
                              onClick={() => handleDownloadPDF(inv)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                              title="Export & Download PDF via CNTEstates Document Engine"
                            >
                              <FileDown className="w-3 h-3 text-sky-400" />
                              <span>PDF</span>
                            </button>

                            {/* Pay Action for Open Receivables */}
                            {canPay && (
                              <button
                                onClick={() => {
                                  setPaymentModalInvoice(inv);
                                  setPaymentAmount(inv.amount_due);
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
                                title="Record Remittance Payment"
                              >
                                Pay
                              </button>
                            )}

                            {/* Status Transition Action */}
                            {allowedTransitions.length > 0 && (
                              <button
                                onClick={() => {
                                  setStatusModalInvoice(inv);
                                  setTargetStatus(allowedTransitions[0]);
                                  setStatusReason('');
                                }}
                                className="px-2 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                                title="Transition Lifecycle Status"
                              >
                                Status
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VIEW 2: SEQUENCE 14 LIFECYCLE & STATE MACHINE CONSOLE      */
        /* ========================================================= */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Lifecycle State Machine: Status transitions across 8 states, payment remittance, and immutability lock validation
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {metrics.immutableCount} of {invoices.length} Locked Immutable
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5">Invoice #</th>
                  <th className="py-3 px-3">Date / Due</th>
                  <th className="py-3 px-3">Cadence</th>
                  <th className="py-3 px-3">Subtotal & Tax</th>
                  <th className="py-3 px-3">Total Billed</th>
                  <th className="py-3 px-3">Settled / Due</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Immutability</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-900/60">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const meta = INVOICE_STATUS_META[inv.invoice_status] || INVOICE_STATUS_META.open;
                    const isLocked = isInvoiceImmutable(inv);
                    const canPay = !isLocked && inv.invoice_status !== 'draft' && inv.amount_due > 0;
                    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[inv.invoice_status] || [];

                    return (
                      <tr key={inv.invoice_id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Invoice # & ID */}
                        <td className="py-3 px-3.5 font-bold text-slate-100">
                          <div className="flex flex-col">
                            <span>{inv.invoice_number}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-normal">
                              {inv.invoice_id}
                            </span>
                          </div>
                        </td>

                        {/* Date / Due */}
                        <td className="py-3 px-3 text-slate-400">
                          <div>{inv.invoice_date}</div>
                          <div className="text-[10px] text-slate-500">Due: {inv.due_date}</div>
                        </td>

                        {/* Cadence */}
                        <td className="py-3 px-3 font-sans capitalize text-slate-300">
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono">
                            {inv.billing_period}
                          </span>
                        </td>

                        {/* Subtotal & Tax */}
                        <td className="py-3 px-3 text-slate-400">
                          <div>Net: {formatSubscriptionPrice(inv.subtotal, inv.currency)}</div>
                          <div className="text-[10px] text-slate-500">
                            Tax: {formatSubscriptionPrice(inv.tax, inv.currency)}
                            {inv.discount > 0 ? ` • Disc: -${formatSubscriptionPrice(inv.discount, inv.currency)}` : ''}
                          </div>
                        </td>

                        {/* Total Billed */}
                        <td className="py-3 px-3 font-bold text-white text-xs">
                          {formatSubscriptionPrice(inv.total, inv.currency)}
                        </td>

                        {/* Settled / Due */}
                        <td className="py-3 px-3">
                          <div className="text-emerald-400">
                            Paid: {formatSubscriptionPrice(inv.amount_paid, inv.currency)}
                          </div>
                          <div className={`text-[10px] ${inv.amount_due > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                            Due: {formatSubscriptionPrice(inv.amount_due, inv.currency)}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>

                        {/* Immutability Lock */}
                        <td className="py-3 px-3 text-center">
                          {isLocked ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-semibold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded"
                              title="Historical record is immutable and permanently locked against mutations."
                            >
                              <Lock className="w-3 h-3 text-emerald-400" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-sky-400 font-sans font-semibold bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded"
                              title="Active invoice can receive payments or transition status."
                            >
                              <span>Actionable</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View & Audit Breakdown */}
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="Inspect 20 Mandatory Fields & Audit Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Pay Invoice */}
                            {canPay && (
                              <button
                                onClick={() => {
                                  setPaymentModalInvoice(inv);
                                  setPaymentAmount(inv.amount_due);
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
                                title="Record Payment"
                              >
                                Pay
                              </button>
                            )}

                            {/* Transition Status */}
                            {allowedTransitions.length > 0 && (
                              <button
                                onClick={() => {
                                  setStatusModalInvoice(inv);
                                  setTargetStatus(allowedTransitions[0]);
                                  setStatusReason('');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Transition Status"
                              >
                                Status
                              </button>
                            )}

                            {/* Print Invoice */}
                            <button
                              onClick={() => handlePrint(inv)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                              title="Export Tax Invoice PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* PDF Download */}
                            <button
                              onClick={() => handleDownloadPDF(inv)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors cursor-pointer"
                              title="Download Standalone PDF Invoice"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: VIEW & AUDIT 20 MANDATORY FIELDS BREAKDOWN */}
      {/* ========================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">
                    Invoice Audit Specification: {selectedInvoice.invoice_number}
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">
                    Sequence 14 All 20 Properties Verification
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immutability Banner */}
            {isInvoiceImmutable(selectedInvoice) ? (
              <div className="bg-emerald-950/60 border-b border-emerald-800 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-300 font-medium">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Historical Immutability Active:</strong> This invoice has reached status '{selectedInvoice.invoice_status.toUpperCase()}'. Amounts, lines, and dates are permanently locked.
                </span>
              </div>
            ) : (
              <div className="bg-sky-950/60 border-b border-sky-800 px-4 py-2.5 flex items-center gap-2 text-xs text-sky-300 font-medium">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  <strong>Active Invoice:</strong> In status '{selectedInvoice.invoice_status.toUpperCase()}'. Outstanding balance: {formatSubscriptionPrice(selectedInvoice.amount_due, selectedInvoice.currency)}.
                </span>
              </div>
            )}

            {/* 20 Fields Grid */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">1. invoice_id</span>
                  <span className="text-slate-200 font-bold">{selectedInvoice.invoice_id}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">2. organization_id</span>
                  <span className="text-slate-200 font-bold">{selectedInvoice.organization_id}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">3. subscription_id</span>
                  <span className="text-slate-200 font-bold">{selectedInvoice.subscription_id}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">4. invoice_number</span>
                  <span className="text-emerald-400 font-bold">{selectedInvoice.invoice_number}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">5. invoice_date</span>
                  <span className="text-slate-200">{selectedInvoice.invoice_date}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">6. billing_period</span>
                  <span className="text-slate-200 uppercase">{selectedInvoice.billing_period}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">7. due_date</span>
                  <span className="text-slate-200">{selectedInvoice.due_date}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">8. currency</span>
                  <span className="text-emerald-400 font-bold">{selectedInvoice.currency}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">9. subtotal</span>
                  <span className="text-slate-200">{formatSubscriptionPrice(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">10. tax</span>
                  <span className="text-slate-200">{formatSubscriptionPrice(selectedInvoice.tax, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">11. discount</span>
                  <span className="text-slate-200">-{formatSubscriptionPrice(selectedInvoice.discount, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">12. total (subtotal - discount + tax)</span>
                  <span className="text-white font-bold text-sm">{formatSubscriptionPrice(selectedInvoice.total, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">13. amount_paid</span>
                  <span className="text-emerald-400 font-bold">{formatSubscriptionPrice(selectedInvoice.amount_paid, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">14. amount_due (total - amount_paid)</span>
                  <span className="text-amber-400 font-bold">{formatSubscriptionPrice(selectedInvoice.amount_due, selectedInvoice.currency)}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">15. payment_status</span>
                  <span className="text-slate-200 font-bold uppercase">{selectedInvoice.payment_status}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">16. invoice_status</span>
                  <span className="text-indigo-400 font-bold uppercase">{selectedInvoice.invoice_status}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">17. payment_method</span>
                  <span className="text-slate-200">{selectedInvoice.payment_method}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">18. external_invoice_id</span>
                  <span className="text-slate-300 font-mono">{selectedInvoice.external_invoice_id}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">19. created_at</span>
                  <span className="text-slate-400">{selectedInvoice.created_at}</span>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">20. updated_at</span>
                  <span className="text-slate-400">{selectedInvoice.updated_at}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                onClick={() => handlePrint(selectedInvoice)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export Tax PDF</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: APPLY PAYMENT MODAL */}
      {/* ========================================================= */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">
                  Record Payment for {paymentModalInvoice.invoice_number}
                </h4>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Total Invoiced:</span>
                  <span>{formatSubscriptionPrice(paymentModalInvoice.total, paymentModalInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Already Paid:</span>
                  <span>{formatSubscriptionPrice(paymentModalInvoice.amount_paid, paymentModalInvoice.currency)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                  <span>Current Due:</span>
                  <span>{formatSubscriptionPrice(paymentModalInvoice.amount_due, paymentModalInvoice.currency)}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Payment Amount ({paymentModalInvoice.currency}):
                </label>
                <input
                  type="number"
                  min={1}
                  max={paymentModalInvoice.amount_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Remittance Payment Method:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="Mastercard •••• 4022">Mastercard •••• 4022</option>
                  <option value="Visa Corporate •••• 1189">Visa Corporate •••• 1189</option>
                  <option value="Corporate ACH / Bank Debit">Corporate ACH / Bank Debit</option>
                  <option value="Direct Electronic Funds Transfer (EFT)">Direct Electronic Funds Transfer (EFT)</option>
                  <option value="Commercial Check Remittance">Commercial Check Remittance</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                Note: When full balance is settled, invoice status will automatically transition to <strong>PAID</strong> and the record will be locked permanently into immutable historical state.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isPaying || paymentAmount <= 0}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isPaying ? 'Recording...' : 'Confirm Remittance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: STATUS TRANSITION MODAL */}
      {/* ========================================================= */}
      {statusModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">
                  Transition Status: {statusModalInvoice.invoice_number}
                </h4>
              </div>
              <button
                onClick={() => setStatusModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                <div className="text-slate-400">Current Status:</div>
                <span className="font-bold text-white uppercase text-sm font-mono">
                  {statusModalInvoice.invoice_status}
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Allowed Target Status:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as InvoiceStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500 uppercase font-mono"
                >
                  {(ALLOWED_STATUS_TRANSITIONS[statusModalInvoice.invoice_status] || []).map((st) => (
                    <option key={st} value={st}>
                      {st.toUpperCase()} — {INVOICE_STATUS_META[st]?.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Audit Reason / Justification:
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide commercial justification for audit trail..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {['paid', 'void', 'uncollectible', 'cancelled'].includes(targetStatus) && (
                <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-300 text-[11px]">
                  <strong>Warning:</strong> Transitioning to <strong>{targetStatus.toUpperCase()}</strong> will permanently lock this invoice into an immutable historical record.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStatusModalInvoice(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusTransition}
                disabled={isTransitioning}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isTransitioning ? 'Applying...' : 'Apply Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ISSUE NEW INVOICE */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <form
            onSubmit={handleCreateNewInvoice}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">
                  Issue Subscription Invoice
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Subtotal Amount ({billingCurrency}):</label>
                  <input
                    type="number"
                    min={0}
                    value={newSubtotal}
                    onChange={(e) => setNewSubtotal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Tax / VAT ({billingCurrency}):</label>
                  <input
                    type="number"
                    min={0}
                    value={newTax}
                    onChange={(e) => setNewTax(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Discount ({billingCurrency}):</label>
                  <input
                    type="number"
                    min={0}
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Initial Status:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as InvoiceStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white capitalize"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open (Issued)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Billing Cadence:</label>
                <select
                  value={newBillingPeriod}
                  onChange={(e) => setNewBillingPeriod(e.target.value as BillingPeriod)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white capitalize"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Notes / Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled subscription renewal invoice"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg font-mono flex justify-between text-xs font-bold text-white border border-slate-800">
                <span>Calculated Total:</span>
                <span className="text-emerald-400">
                  {formatSubscriptionPrice(Math.max(0, newSubtotal - newDiscount + newTax), billingCurrency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isCreating ? 'Creating...' : 'Issue Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
