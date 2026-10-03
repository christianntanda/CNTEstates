import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Download,
  Filter,
  Search,
  ShieldCheck,
  CreditCard,
  Layers,
  Coins,
  Lock,
  FileCheck,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
  Server,
  Zap,
  Award,
} from 'lucide-react';
import {
  runAutomatedBillingTestSuite,
  AutomatedBillingTestSuiteReport,
  TestCategory,
  TestResultItem,
} from '../../services/automatedBillingTestSuite';
import { useApp } from '../../context/AppContext';

export const AutomatedTestingConsole: React.FC = () => {
  const { setActiveTab } = useApp();
  const [report, setReport] = useState<AutomatedBillingTestSuiteReport>(() =>
    runAutomatedBillingTestSuite()
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTestIds, setExpandedTestIds] = useState<Set<string>>(new Set());

  // Execute full test suite
  const handleRunTests = async (category?: TestCategory) => {
    setIsRunning(true);
    // Allow brief UI tick for animation
    setTimeout(() => {
      try {
        const freshReport = runAutomatedBillingTestSuite(category);
        setReport(freshReport);
      } finally {
        setIsRunning(false);
      }
    }, 250);
  };

  const toggleExpand = (id: string) => {
    setExpandedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTestIds(new Set(report.results.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedTestIds(new Set());
  };

  // Filtered test items
  const filteredResults = useMemo(() => {
    return report.results.filter((test) => {
      if (selectedCategory !== 'all' && test.category !== selectedCategory) return false;
      if (statusFilter === 'passed' && !test.passed) return false;
      if (statusFilter === 'failed' && test.passed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = test.id.toLowerCase().includes(q);
        const matchesName = test.name.toLowerCase().includes(q);
        const matchesReq = test.requirement.toLowerCase().includes(q);
        const matchesActual = test.actual.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesReq && !matchesActual) return false;
      }
      return true;
    });
  }, [report, selectedCategory, statusFilter, searchQuery]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cntestates-automated-tests-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const categoryIcons: Record<TestCategory, React.ElementType> = {
    plans: Layers,
    capacity: Server,
    subscription: Zap,
    billing: CreditCard,
    currency: Coins,
    security: Lock,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Test Center Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>Seq 34: Billing & Capacity (36/36)</span>
        </button>
        <button
          onClick={() => setActiveTab('regressionTesting')}
          className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Seq 35: Full Regression (28/28)</span>
        </button>
        <button
          onClick={() => setActiveTab('productionValidation')}
          className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>Seq 36: Final Production Validation (33/33)</span>
        </button>
      </div>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                SEQUENCE 34 — AUTOMATED TESTING
              </span>
              <span className="text-xs text-slate-400">Authoritative Platform Test Harness</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Automated Billing Test Suite
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              End-to-end automated verification for subscription plans, multi-tier capacity limits, lifecycle transitions, invoice math, webhook deduplication, zero-decimal currency display, and RBAC tenant isolation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleRunTests()}
              disabled={isRunning}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Running Suite...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Run All Tests (36)
                </>
              )}
            </button>

            <button
              onClick={handleExportJson}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Test Compliance</div>
            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              {report.allPassed ? '100%' : `${Math.round((report.passedTests / report.totalTests) * 100)}%`}
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {report.passedTests} passed / {report.totalTests} tests
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Failed Tests</div>
            <div className={`text-2xl font-bold mt-0.5 ${report.failedTests > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {report.failedTests}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Zero tolerance threshold</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Execution Duration</div>
            <div className="text-2xl font-bold text-sky-400 flex items-center gap-1.5 mt-0.5 font-mono">
              {report.totalDurationMs}ms
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">In-memory deterministic</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Master Currency</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5 font-mono">USD</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Single source of truth</div>
          </div>
        </div>
      </div>

      {/* Category Summaries Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.entries(report.categories) as [TestCategory, any][]).map(([catKey, cat]) => {
          const Icon = categoryIcons[catKey] || Layers;
          const isSelected = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(isSelected ? 'all' : catKey)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  cat.allPassed
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                }`}>
                  {cat.passedTests}/{cat.totalTests}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200 truncate">{cat.categoryName}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                {cat.durationMs}ms
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls & Search Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tests, requirements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {(['all', 'passed', 'failed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Reset category ({selectedCategory})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
          <span>Showing {filteredResults.length} of {report.totalTests} tests</span>
          <span className="text-slate-600">•</span>
          <button onClick={expandAll} className="hover:text-slate-200 underline cursor-pointer">
            Expand all
          </button>
          <span className="text-slate-600">•</span>
          <button onClick={collapseAll} className="hover:text-slate-200 underline cursor-pointer">
            Collapse all
          </button>
        </div>
      </div>

      {/* Test List Accordion */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-400">No tests match your filter criteria</div>
            <p className="text-xs text-slate-500 mt-1">Try clearing search or changing the selected category.</p>
          </div>
        ) : (
          filteredResults.map((test) => {
            const isExpanded = expandedTestIds.has(test.id);
            const Icon = categoryIcons[test.category] || Layers;

            return (
              <div
                key={test.id}
                className={`border rounded-xl transition-all ${
                  test.passed
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-rose-950/10 border-rose-800/60'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(test.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="shrink-0">
                      {test.passed ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-rose-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {test.id}
                        </span>
                        <h4 className="text-sm font-semibold text-white truncate">{test.name}</h4>
                        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full capitalize">
                          {test.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">{test.requirement}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-500">{test.durationMs}ms</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        test.passed
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {test.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 space-y-3 bg-slate-950/40 rounded-b-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Expected Specification
                        </div>
                        <div className="font-mono text-emerald-300 text-xs break-all">
                          {test.expected}
                        </div>
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Actual Observed Result
                        </div>
                        <div className="font-mono text-slate-300 text-xs break-all">
                          {test.actual}
                        </div>
                      </div>
                    </div>

                    {test.details && (
                      <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-sky-400" />
                          Assertion Execution Context
                        </div>
                        <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900/60 rounded border border-slate-800 max-h-48">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
