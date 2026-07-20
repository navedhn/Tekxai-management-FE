import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, BASE_URL } from '@/lib/queryClient';
import { getAccessToken } from '@/utils/tokenMemory';
const get  = (url: string) => apiRequest<any>(url).then((r: any) => r?.payload ?? r);
const post = (url: string, body?: any) => apiRequest<any>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const del  = (url: string) => apiRequest<any>(url, { method: 'DELETE' });
import { Play, Download, Save, Trash2, BarChart3, FileSpreadsheet, FileText, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

// Base path fix: this page previously called `/reports/builder/*` (plural,
// no version prefix) while the backend only mounts these routes at
// `/api/v1/report/builder/*` (singular) — every request 404'd. Matches the
// `${v1}/report/...` pattern already used by reportService.ts.
const v1 = 'api/v1';
const BUILDER = `${v1}/report/builder`;

type SchemaEntity = { entity: string; fields: string[]; filterable: string[]; searchable?: string[] };

function exportCSV(columns: string[], data: any[], filename: string) {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// POST-body binary export (Excel/PDF) — apiRequest always parses JSON, so
// this mirrors its auth-header handling but reads the response as a blob.
async function downloadReportFile(path: string, body: any, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportBuilderPage() {
  const qc = useQueryClient();
  const [entity, setEntity] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [limit, setLimit] = useState(100);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any>(null);
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const { data: schemaData } = useQuery({ queryKey: ['report-schema'], queryFn: () => get(`${BUILDER}/schema`) });
  const schemas: SchemaEntity[] = (schemaData as any) || [];
  const currentSchema = schemas.find((s: any) => s.entity === entity);

  const { data: savedData } = useQuery({ queryKey: ['saved-reports'], queryFn: () => get(`${BUILDER}/saved`) });
  const saved: any[] = (savedData as any) || [];

  const runMutation = useMutation({
    mutationFn: (body: any) => post(`${BUILDER}/run`, body).then((r: any) => r?.payload ?? r),
    onSuccess: (data) => setResults(data),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => post(`${BUILDER}/saved`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-reports'] }); setSaveModal(false); setSaveName(''); },
  });

  const deleteSaved = useMutation({
    mutationFn: (id: string) => del(`${BUILDER}/saved/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });

  const toggleColumn = (col: string) =>
    setColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  // Shared by the initial run, page navigation, and Save Report (config must
  // match exactly what's on screen) — the query shape sent to run/export.
  const buildQuery = (targetPage = page) => ({
    entity, columns: columns.length ? columns : undefined, filters,
    search: search || undefined, sort_by: sortBy || undefined, sort_dir: sortDir,
    limit, page: targetPage,
  });

  const runReport = () => {
    if (!entity) return;
    setPage(1);
    runMutation.mutate(buildQuery(1));
  };

  const goToPage = (p: number) => {
    if (p < 1) return;
    setPage(p);
    runMutation.mutate(buildQuery(p));
  };

  const loadSaved = (report: any) => {
    const cfg = report.config;
    setEntity(cfg.entity || '');
    setColumns(cfg.columns || []);
    setFilters(cfg.filters || {});
    setSortBy(cfg.sort_by || '');
    setSortDir(cfg.sort_dir || 'desc');
    setLimit(cfg.limit || 100);
    setSearch(cfg.search || '');
    setPage(1);
    setResults(null);
  };

  const runExport = async (format: 'excel' | 'pdf') => {
    if (!entity) return;
    setExporting(format);
    try {
      const { page: _p, ...exportBody } = buildQuery(); // exports pull the full filtered set, not just the current page
      await downloadReportFile(`${BUILDER}/export/${format}`, exportBody, `${entity}-report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    } finally {
      setExporting(null);
    }
  };

  const printResults = () => window.print();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-black text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Build custom reports from any data in the system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 print:hidden">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Data Source</label>
            <select value={entity} onChange={e => { setEntity(e.target.value); setColumns([]); setFilters({}); setSortBy(''); }} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select entity...</option>
              {schemas.map(s => <option key={s.entity} value={s.entity}>{s.entity.replace(/_/g,' ')}</option>)}
            </select>
          </div>

          {currentSchema && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Columns (all if none selected)</label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {currentSchema.fields.map(f => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input type="checkbox" checked={columns.includes(f)} onChange={() => toggleColumn(f)} className="rounded" />
                      <span className="text-sm text-gray-700 font-mono">{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              {currentSchema.filterable.includes('created_at') && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" onChange={e => setFilters((f: any) => ({ ...f, created_at: { ...f.created_at, from: e.target.value } }))} className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="date" onChange={e => setFilters((f: any) => ({ ...f, created_at: { ...f.created_at, to: e.target.value } }))} className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              {currentSchema.filterable.includes('status') && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Status filter</label>
                  <input value={filters.status || ''} onChange={e => setFilters((f: any) => ({ ...f, status: e.target.value || undefined }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. ACTIVE" />
                </div>
              )}

              {!!currentSchema.searchable?.length && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Search</label>
                  <input value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={`Search ${currentSchema.searchable.join(', ')}`} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Sort by</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                    <option value="">Default</option>
                    {currentSchema.fields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Direction</label>
                  <select value={sortDir} onChange={e => setSortDir(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Row limit (max 1000)</label>
                <input type="number" min={1} max={1000} value={limit} onChange={e => setLimit(+e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
            </>
          )}

          <button onClick={runReport} disabled={!entity || runMutation.isPending} className="w-full flex items-center justify-center gap-2 bg-[#005CDA] text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
            <Play size={15} /> {runMutation.isPending ? 'Running...' : 'Run Report'}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4 print:col-span-3">
          {results ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5" id="report-print-area">
              <div className="flex items-center justify-between mb-4 print:hidden">
                <div>
                  <span className="font-black text-gray-900">{results.entity}</span>
                  <span className="ml-2 text-sm text-gray-400">
                    {results.total ?? results.count} row{(results.total ?? results.count) === 1 ? '' : 's'}
                    {results.total != null && results.limit ? ` · page ${results.page} of ${Math.max(1, Math.ceil(results.total / results.limit))}` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportCSV(columns.length ? columns : Object.keys(results.data[0] || {}), results.data, `${results.entity}-report.csv`)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button
                    onClick={() => runExport('excel')} disabled={exporting !== null}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileSpreadsheet size={14} /> {exporting === 'excel' ? 'Exporting...' : 'Excel'}
                  </button>
                  <button
                    onClick={() => runExport('pdf')} disabled={exporting !== null}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText size={14} /> {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                  </button>
                  <button onClick={printResults} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => setSaveModal(true)} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold">
                    <Save size={14} /> Save Report
                  </button>
                </div>
              </div>
              {results.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {Object.keys(results.data[0]).map((col: string) => (
                          <th key={col} className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.data.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="py-2 px-3 text-gray-700 max-w-[200px] truncate">{val == null ? '—' : String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-400 text-sm">No results found</p>
              )}

              {results.total != null && results.limit && results.total > results.limit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 print:hidden">
                  <span className="text-xs text-gray-400">
                    Showing {(results.page - 1) * results.limit + 1}–{Math.min(results.page * results.limit, results.total)} of {results.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => goToPage(page - 1)} disabled={page <= 1 || runMutation.isPending} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-semibold text-gray-600">Page {results.page} of {Math.max(1, Math.ceil(results.total / results.limit))}</span>
                    <button onClick={() => goToPage(page + 1)} disabled={page * results.limit >= results.total || runMutation.isPending} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">Configure and run a report</p>
              <p className="text-sm mt-1">Select a data source and click Run Report</p>
            </div>
          )}

          {/* Saved Reports */}
          {saved.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:hidden">
              <h3 className="font-black text-gray-900 mb-4">Saved Reports</h3>
              <div className="space-y-2">
                {saved.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400">{(r.config as any)?.entity} · by {r.creator?.first_name} {r.creator?.last_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadSaved(r)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100">Load</button>
                      <button onClick={() => deleteSaved.mutate(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {saveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-black mb-4">Save Report</h2>
            <div className="space-y-3">
              <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Report name" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                <span className="text-sm text-gray-700">Share with all admins</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSaveModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                disabled={!saveName}
                onClick={() => saveMutation.mutate({ name: saveName, description: saveDesc, config: { entity, columns, filters, search, sort_by: sortBy, sort_dir: sortDir, limit }, is_public: isPublic })}
                className="flex-1 py-2.5 rounded-xl bg-[#005CDA] text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
