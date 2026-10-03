import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import { BillingAuditLogConsole } from '../billing/BillingAuditLogConsole';
import {
  History,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, language } = useApp();
  const [activeAuditTab, setActiveAuditTab] = useState<'billing' | 'operational'>('billing');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Immutable Audit Trail & Compliance Vault</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tamper-evident record of all billing transactions, license events, lease changes, and operational governance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 self-start sm:self-auto">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>SOC2 / GDPR / IFRS Compliance Vault</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveAuditTab('billing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeAuditTab === 'billing'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Authoritative Billing Audit Log (Sequence 29)</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            activeAuditTab === 'billing' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-slate-400'
          }`}>
            13 Actions
          </span>
        </button>

        <button
          onClick={() => setActiveAuditTab('operational')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeAuditTab === 'operational'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Operational & Lease Audit Trail</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
            activeAuditTab === 'operational' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-slate-400'
          }`}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeAuditTab === 'billing' ? (
        <BillingAuditLogConsole />
      ) : (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by user, action or entity ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator / Persona</th>
                    <th className="py-3 px-4">Operational Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">State Transition (Previous &rarr; New)</th>
                    <th className="py-3 px-4 text-right">Terminal IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{log.userName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{log.userRole}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-emerald-400 text-[11px] bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-200">{log.entityType}</div>
                        <div className="text-[11px] text-slate-400">ID: {log.entityId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {log.previousValue && (
                          <span className="text-slate-400 line-through mr-1.5">{log.previousValue}</span>
                        )}
                        <span className="text-slate-100 font-medium">{log.newValue || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right text-slate-500 text-[11px]">
                        127.0.0.1
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
