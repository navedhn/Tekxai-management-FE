import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
const get  = (url: string) => apiRequest<any>(url).then((r: any) => r?.payload ?? r);
const post = (url: string, body?: any) => apiRequest<any>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const del  = (url: string) => apiRequest<any>(url, { method: 'DELETE' });
import { Play, Download, Save, Trash2, BarChart3 } from 'lucide-react';

type SchemaEntity = { entity: string; fields: string[]; filterable: string[] };

function exportCSV(columns: string[], data: any[], filename: string) {
  const header = columns.join(',');
  const rows = data.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','));
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
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
  const [results, setResults] = useState<any>(null);
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const { data: schemaData } = useQuery({ queryKey: ['report-schema'], queryFn: () => get('/reports/builder/schema') });
  const schemas: SchemaEntity[] = (schemaData as any) || [];
  const currentSchema = schemas.find((s: any) => s.entity === entity);

  const { data: savedData } = useQuery({ queryKey: ['saved-reports'], queryFn: () => get('/reports/builder/saved') });
  const saved: any[] = (savedData as any) || [];

  const runMutation = useMutation({
    mutationFn: (body: any) => post('/reports/builder/run', body).then((r: any) => r?.payload ?? r),
    onSuccess: (data) => setResults(data),
  });

  const saveMutation = useMutation({
    mutationFn: (body: any) => post('/reports/builder/saved', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saved-reports'] }); setSaveModal(false); setSaveName(''); },
  });

  const deleteSaved = useMutation({
    mutationFn: (id: string) => del(`/reports/builder/saved/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-reports'] }),
  });

  const toggleColumn = (col: string) =>
    setColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);

  const runReport = () => {
    if (!entity) return;
    runMutation.mutate({ entity, columns: columns.length ? columns : undefined, filters, sort_by: sortBy || undefined, sort_dir: sortDir, limit });
  };

  const loadSaved = (report: any) => {
    const cfg = report.config;
    setEntity(cfg.entity || '');
    setColumns(cfg.columns || []);
    setFilters(cfg.filters || {});
    setSortBy(cfg.sort_by || '');
    setSortDir(cfg.sort_dir || 'desc');
    setLimit(cfg.limit || 100);
    setResults(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Build custom reports from any data in the system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
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

          <button onClick={runReport} disabled={!entity || runMutation.isLoading} className="w-full flex items-center justify-center gap-2 bg-[#005CDA] text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
            <Play size={15} /> {runMutation.isLoading ? 'Running...' : 'Run Report'}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-black text-gray-900">{results.entity}</span>
                  <span className="ml-2 text-sm text-gray-400">{results.count} rows</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(columns.length ? columns : Object.keys(results.data[0] || {}), results.data, `${results.entity}-report.csv`)}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <Download size={14} /> Export CSV
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
                onClick={() => saveMutation.mutate({ name: saveName, description: saveDesc, config: { entity, columns, filters, sort_by: sortBy, sort_dir: sortDir, limit }, is_public: isPublic })}
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
