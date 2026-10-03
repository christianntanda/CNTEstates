import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkOrder } from '../../types';
import { formatCurrency, formatDate } from '../../i18n/translations';
import { formatPreciseCurrency, convertCurrency } from '../../services/currencyService';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  User,
  DollarSign,
  AlertTriangle,
  FileCheck,
  Camera,
  CheckSquare,
  Square,
  Printer,
} from 'lucide-react';

export const WorkOrdersView: React.FC = () => {
  const {
    workOrders,
    properties,
    currency,
    organizationBaseCurrency,
    userPreferredCurrency,
    customExchangeRates,
    language,
    updateWorkOrderStatus,
    toggleWorkOrderChecklist,
    selectedPropertyId,
    openPrint,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesProperty = selectedPropertyId === 'all' || wo.propertyId === selectedPropertyId;
    const matchesStatus = filterStatus === 'all' || wo.status === filterStatus;
    const matchesSearch =
      wo.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-400" />
            <span>Field Work Orders Execution</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track labor hours, materials expenses, multi-step safety checklists, and signed completion sign-offs.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search WO # (e.g. WO-2026-081)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'assigned', label: 'Assigned' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkOrders.map((wo) => {
          const completedTasksCount = wo.checklist.filter((c) => c.completed).length;
          const totalTasksCount = wo.checklist.length;
          const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

          return (
            <div
              key={wo.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-emerald-400">{wo.workOrderNumber}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      wo.status === 'completed' || wo.status === 'approved'
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                        : wo.status === 'in_progress'
                        ? 'text-blue-400 bg-blue-950/60 border border-blue-900'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                    }`}
                  >
                    {wo.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{wo.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{wo.description}</p>

                <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                  <span>{wo.propertyName}</span>
                  {wo.unitNumber && (
                    <>
                      <span>·</span>
                      <span>Unit {wo.unitNumber}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="text-slate-300">Assignee: {wo.assignedTo}</span>
                </div>
              </div>

              {/* Progress Checklist Bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Standard Procedure Checklist</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {completedTasksCount}/{totalTasksCount} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Checklist Preview */}
                <div className="mt-2 space-y-1">
                  {wo.checklist.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleWorkOrderChecklist(wo.id, idx)}
                      className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className={`truncate ${item.completed ? 'line-through text-slate-500' : ''}`}>
                        {item.item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial & Completion Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <div className="font-mono">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Cost</span>
                  <span className="font-bold text-slate-100 text-sm">
                    {formatPreciseCurrency(
                      userPreferredCurrency !== organizationBaseCurrency
                        ? convertCurrency(wo.totalCost, organizationBaseCurrency, userPreferredCurrency, customExchangeRates).convertedAmount
                        : wo.totalCost,
                      userPreferredCurrency,
                      language
                    )}
                  </span>
                  {userPreferredCurrency !== organizationBaseCurrency && (
                    <span className="text-[10px] text-slate-400 block">
                      Base: {formatPreciseCurrency(wo.totalCost, organizationBaseCurrency, language)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const conv = convertCurrency(wo.totalCost, organizationBaseCurrency, userPreferredCurrency, customExchangeRates);
                      openPrint({
                        type: 'work_order',
                        title: 'Authorized Maintenance Work Permit & Order',
                        documentNumber: wo.workOrderNumber,
                        propertyName: wo.propertyName,
                        unitNumber: wo.unitNumber,
                        date: wo.startDate,
                        dueDate: wo.dueDate,
                        originalCurrency: organizationBaseCurrency,
                        originalAmount: wo.totalCost,
                        displayCurrency: userPreferredCurrency,
                        displayAmount: conv.convertedAmount,
                        exchangeRate: conv.rate,
                        exchangeRateDate: conv.rateDate,
                        sections: [
                          {
                            title: 'Work Specification & Assignment',
                            description: wo.description,
                            items: [
                              { label: 'Work Order #', value: wo.workOrderNumber, highlight: true },
                              { label: 'Assigned Specialist', value: wo.assignedTo },
                              { label: 'Status', value: wo.status.toUpperCase() },
                              { label: 'Labor Cost', value: formatPreciseCurrency(wo.laborHours * wo.laborRatePerHour, organizationBaseCurrency, language) },
                              { label: 'Materials Cost', value: formatPreciseCurrency(wo.materialsCost, organizationBaseCurrency, language) },
                            ],
                          },
                          {
                            title: 'Standard Safety & Execution Checklist',
                            checklist: wo.checklist.map((c) => ({ text: c.item, completed: c.completed })),
                          },
                          {
                            title: 'Signatures & Acceptance',
                            notes: 'All work executed under CNTEstates Safety & Environmental regulations. Contractor guarantees 180-day workmanship warranty.',
                          },
                        ],
                        meta: {
                          generatedBy: 'Field Operations Engine',
                          signaturesRequired: ['Supervising Maintenance Lead', 'Field Technician / Contractor Lead'],
                        },
                      });
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded transition-colors cursor-pointer"
                    title="Print official work permit & procedure dossier"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  {wo.status !== 'completed' && (
                    <button
                      onClick={() => updateWorkOrderStatus(wo.id, 'completed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      Complete Work
                    </button>
                  )}
                  {wo.status === 'completed' && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
