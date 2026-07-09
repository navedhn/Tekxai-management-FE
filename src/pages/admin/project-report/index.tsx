import React, { useMemo, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import { useProjectsReport, download_report } from '@/services/reportService';
import { PROJECT_STATUS_OPTIONS } from '@/utils/projectStatus';

interface ProjectReportRow {
  title: string;
  status: string;
  client_name: string;
  dev_status: string;
  progress: string;
  members: number;
  total_hours: number;
  start_date: string;
  end_date: string;
  is_overdue: string;
  days_remaining: number | string;
  health_status: string;
  access_score: string;
  owner: string;
  budget_currency: string;
  budget: number | string;
  budget_spent: number;
  budget_remaining: number | string;
}

const HEALTH_STYLE: Record<string, string> = {
  HEALTHY: 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]',
  WARNING: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
  CRITICAL: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
};

const AdminProjectReport: React.FC = () => {
  const [status, setStatus] = useState('');
  const [clientName, setClientName] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (status) p.status = status;
    if (clientName.trim()) p.client_name = clientName.trim();
    if (overdueOnly) p.overdue = 'true';
    return p;
  }, [status, clientName, overdueOnly]);

  const { data: rows = [], isLoading, isError } = useProjectsReport(params) as { data: ProjectReportRow[]; isLoading: boolean; isError: boolean };

  const handleExport = () => download_report('projects', params);

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FileBarChart size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Report</h1>
            <p className="text-sm text-gray-400 font-medium">Delivery, health, and budget summary across all projects</p>
          </div>
        </div>
        <Button leftIcon={Download} onClick={handleExport} className="bg-primary-500 text-white h-11 rounded-xl font-bold text-sm px-5">
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="w-48">
          <Select
            label="Status"
            options={[{ label: 'All Statuses', value: '' }, ...PROJECT_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))]}
            value={status}
            onChange={(v) => setStatus(String(v))}
          />
        </div>
        <div className="w-56">
          <Input
            label="Client"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Filter by client name"
            className="h-11 rounded-xl"
          />
        </div>
        <label className="flex items-center gap-2 h-11 px-1 cursor-pointer select-none">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="w-4 h-4 rounded accent-primary-500" />
          <span className="text-sm font-semibold text-gray-600">Overdue only</span>
        </label>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader size={32} /></div>
        ) : isError ? (
          <div className="text-center py-16 text-sm text-red-500 font-semibold">Failed to load project report.</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 font-semibold">No projects match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Overdue</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3 text-right">Budget</th>
                  <th className="px-4 py-3 text-right">Spent</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-gray-900">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600">{r.client_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.status}</td>
                    <td className="px-4 py-3 text-gray-600">{r.progress}</td>
                    <td className="px-4 py-3 text-gray-600">{r.owner || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.end_date || '—'}</td>
                    <td className="px-4 py-3">
                      {r.is_overdue === 'Yes' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">Overdue</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${HEALTH_STYLE[r.health_status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {r.health_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.access_score}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.budget !== '' ? `${r.budget_currency} ${r.budget}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.budget_currency} {r.budget_spent}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{r.budget_remaining !== '' ? `${r.budget_currency} ${r.budget_remaining}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProjectReport;
