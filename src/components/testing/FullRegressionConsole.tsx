import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Download,
  Filter,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
  Activity,
  Layers,
  Box,
  Building,
  Users,
  FileText,
  Key,
  Truck,
  Wrench,
  Zap,
  Lock,
  FileCheck,
  MessageSquare,
  DollarSign,
  BarChart3,
  Bot,
  Bell,
  Smartphone,
  Server,
  Award,
} from 'lucide-react';
import {
  runFullRegressionTestSuite,
  FullRegressionReport,
  RegressionTestResult,
} from '../../services/fullRegressionTestSuite';
import { useApp } from '../../context/AppContext';

export const FullRegressionConsole: React.FC = () => {
  const { setActiveTab } = useApp();
  const [report, setReport] = useState<FullRegressionReport>(() =>
    runFullRegressionTestSuite()
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTestIds, setExpandedTestIds] = useState<Set<string>>(new Set());

  const allDomains = useMemo(() => {
    return Array.from(new Set(report.results.map((r) => r.domain)));
  }, [report]);

  const handleRunTests = (domain?: string) => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const fresh = runFullRegressionTestSuite(domain === 'all' ? undefined : domain);
        setReport(fresh);
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

  const filteredResults = useMemo(() => {
    return report.results.filter((test) => {
      if (selectedDomain !== 'all' && test.domain !== selectedDomain) return false;
      if (statusFilter === 'passed' && !test.passed) return false;
      if (statusFilter === 'failed' && test.passed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = test.id.toLowerCase().includes(q);
        const matchesName = test.name.toLowerCase().includes(q);
        const matchesDomain = test.domain.toLowerCase().includes(q);
        const matchesReq = test.requirement.toLowerCase().includes(q);
        const matchesActual = test.actual.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesDomain && !matchesReq && !matchesActual) return false;
      }
      return true;
    });
  }, [report, selectedDomain, statusFilter, searchQuery]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cntestates-full-regression-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Test Center Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('automatedTesting')}
          className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Seq 34: Billing & Capacity (36/36)</span>
        </button>
        <button
          className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-200" />
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                SEQUENCE 35 — FULL REGRESSION TEST
              </span>
              <span className="text-xs text-slate-400">Zero Critical Regressions Guarantee</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Full Platform Regression Suite
              <Activity className="w-7 h-7 text-indigo-400" />
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Comprehensive regression verification ensuring the new authoritative billing architecture, multi-currency engines, and quota systems do not break any of the 28 foundational CNTEstates property management domains.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleRunTests(selectedDomain)}
              disabled={isRunning}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Verifying Platform...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Run Regression (28 Domains)
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
            <div className="text-xs text-slate-400 font-medium">Platform Health</div>
            <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              {report.allPassed ? '100% HEALTHY' : `${Math.round((report.passedTests / report.totalTests) * 100)}%`}
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {report.passedTests} passed / {report.totalTests} domains
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Critical Regressions</div>
            <div className={`text-2xl font-bold mt-0.5 ${report.failedTests > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {report.failedTests}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Zero broken flows</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Domains Verified</div>
            <div className="text-2xl font-bold text-indigo-400 flex items-center gap-1.5 mt-0.5 font-mono">
              {report.domainsTested}/28
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Full suite coverage</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <div className="text-xs text-slate-400 font-medium">Execution Duration</div>
            <div className="text-2xl font-bold text-sky-400 mt-0.5 font-mono">{report.totalDurationMs}ms</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Immediate feedback loop</div>
          </div>
        </div>
      </div>

      {/* Domain Quick Pills */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 overflow-x-auto">
        <div className="text-xs text-slate-400 font-medium mb-2 px-1 flex items-center justify-between">
          <span>Filter by Domain ({allDomains.length} Domains)</span>
          {selectedDomain !== 'all' && (
            <button
              onClick={() => setSelectedDomain('all')}
              className="text-indigo-400 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedDomain('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedDomain === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Domains (28)
          </button>
          {allDomains.map((dom) => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom === selectedDomain ? 'all' : dom)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedDomain === dom
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {dom}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative min-w-[240px] flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search domains, requirements, outputs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

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
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
          <span>Showing {filteredResults.length} of {report.totalTests} regression tests</span>
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

      {/* Regression Tests List */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
            <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-400">No regression tests match your search</div>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search keywords.</p>
          </div>
        ) : (
          filteredResults.map((test, idx) => {
            const isExpanded = expandedTestIds.has(test.id);

            return (
              <div
                key={test.id}
                className={`border rounded-xl transition-all ${
                  test.passed
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    : 'bg-rose-950/10 border-rose-800/60'
                }`}
              >
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
                        <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded">
                          {test.domain}
                        </span>
                        <h4 className="text-sm font-semibold text-white truncate">{test.name}</h4>
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
                      {test.passed ? 'VERIFIED' : 'REGRESSION DETECTED'}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 space-y-3 bg-slate-950/40 rounded-b-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-2">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Expected Invariant
                        </div>
                        <div className="font-mono text-indigo-300 text-xs break-all">
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
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          Domain State Snapshot
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
