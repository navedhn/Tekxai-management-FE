import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Download, Filter, Users, CheckCircle, Clock, UserX, MoreVertical, Eye, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetEmployeeDirectory } from '@/services/employeeService';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  INACTIVE:  'bg-gray-100 text-gray-500',
  ON_LEAVE:  'bg-amber-100 text-amber-700',
  PROBATION: 'bg-blue-100 text-blue-700',
  TERMINATED:'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', ON_LEAVE: 'On Leave',
  PROBATION: 'Probation', TERMINATED: 'Terminated',
};

function StatCard({ icon: Icon, color, label, value }: any) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const [q, setQ]               = useState('');
  const [divisionId, setDiv]    = useState('');
  const [deptId, setDept]       = useState('');
  const [teamId, setTeam]       = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const limit = 10;

  const filters = useMemo(() => ({
    q: q || undefined, division_id: divisionId || undefined,
    department_id: deptId || undefined, team_id: teamId || undefined,
    status: status || undefined, page, limit,
  }), [q, divisionId, deptId, teamId, status, page, limit]);

  const { data, isLoading } = useGetEmployeeDirectory(filters);
  const records: any[] = data?.records || [];
  const stats = data?.stats || {};
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => apiRequest<any>(`api/v1/department`),
    select: (r: any) => r?.payload?.divisions || r?.payload?.records || [],
    staleTime: 300000,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiRequest<any>(`api/v1/department`),
    select: (r: any) => r?.payload?.records || [],
    staleTime: 300000,
  });

  const clearFilters = () => { setQ(''); setDiv(''); setDept(''); setTeam(''); setStatus(''); setPage(1); };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Employee Directory</h1>
          <p className="text-sm text-gray-400 mt-0.5">View and manage all employees across the organization</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={16} />Export
          </button>
          <button
            onClick={() => navigate('/hr/add-employee')}
            className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            <Plus size={16} />Add Employee
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       color="bg-blue-500"   label="Total Employees"  value={stats.total_employees} />
        <StatCard icon={CheckCircle} color="bg-green-500"  label="Active Employees" value={stats.active} />
        <StatCard icon={Clock}       color="bg-amber-500"  label="On Leave"         value={stats.on_leave} />
        <StatCard icon={UserX}       color="bg-gray-400"   label="Inactive"         value={stats.inactive} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search by name, employee ID, email, or designation..."
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-10 px-3 border border-gray-200 rounded-xl text-sm min-w-[130px] text-gray-600">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="PROBATION">Probation</option>
          </select>
          {(q || divisionId || deptId || teamId || status) && (
            <button onClick={clearFilters} className="h-10 px-3 text-sm text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Employee', 'Employee ID', 'Designation', 'Department', 'Team', 'Manager', 'Status', 'Join Date', 'Actions']
                  .map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="py-4 px-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">No employees found</td></tr>
              ) : records.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-sm flex-shrink-0">
                        {emp.avatar ? <img src={emp.avatar} className="w-9 h-9 rounded-full object-cover" alt="" /> : (emp.first_name?.[0] || '?')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{emp.full_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-gray-600 font-mono text-xs">{emp.employee_id || '—'}</td>
                  <td className="py-3 px-2 text-gray-700">{emp.designation || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{emp.department?.name || '—'}</td>
                  <td className="py-3 px-2 text-gray-600">{emp.team?.name || '—'}</td>
                  <td className="py-3 px-2">
                    {emp.manager ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {emp.manager.first_name?.[0]}
                        </div>
                        <span className="text-gray-600 text-xs">{emp.manager.first_name?.[0]}. {emp.manager.last_name}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[emp.status] || 'bg-gray-100 text-gray-500')}>
                      {STATUS_LABEL[emp.status] || emp.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs whitespace-nowrap">
                    {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/hr/employee/${emp.id}`)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Profile"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} employees
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="h-8 w-8 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">‹</button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('h-8 w-8 border rounded-lg text-sm font-semibold', page === p ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 hover:bg-gray-50')}>
                  {p}
                </button>
              ))}
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="h-8 w-8 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
