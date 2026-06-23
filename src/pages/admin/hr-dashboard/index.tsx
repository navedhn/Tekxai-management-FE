import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle, Clock, UserPlus, Plus, FolderOpen, BarChart2, CalendarCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

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

export default function HRDashboardPage() {
  const navigate = useNavigate();

  const { data: empData } = useQuery({
    queryKey: ['employee-list-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE.LIST + '?limit=5&sort=hire_date&order=desc'),
    select: (r: any) => r?.payload,
  });

  const { data: empStats } = useQuery({
    queryKey: ['employee-stats-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE.STATS),
    select: (r: any) => r?.payload,
  });

  const { data: leaveData } = useQuery({
    queryKey: ['leave-pending-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.LEAVE.LIST + '?status=PENDING&limit=10'),
    select: (r: any) => r?.payload,
  });

  const recentHires: any[] = empData?.records || [];
  const stats = empStats || {};
  const leaves: any[] = leaveData?.records || leaveData || [];
  const pendingLeaves = leaves.filter((l: any) => l.status === 'PENDING' || !leaveData?.records);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview of your workforce and HR activities</p>
        </div>
        <button
          onClick={() => navigate('/hr/add-employee')}
          className="flex items-center gap-2 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />Add Employee
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       color="bg-blue-500"   label="Total Employees"  value={stats.total_employees ?? stats.total} />
        <StatCard icon={CheckCircle} color="bg-green-500"  label="Active"           value={stats.active} />
        <StatCard icon={Clock}       color="bg-amber-500"  label="On Leave"         value={stats.on_leave} />
        <StatCard icon={UserPlus}    color="bg-purple-500" label="New This Month"   value={stats.new_this_month ?? stats.new_hires} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-gray-800 mb-4">Recent Hires</h2>
          {recentHires.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent hires</p>
          ) : (
            <div className="space-y-3">
              {recentHires.slice(0, 5).map((emp: any) => (
                <div key={emp.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-black text-sm flex-shrink-0">
                    {emp.first_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.designation || emp.department?.name || '—'}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => navigate('/hr/employees')} className="mt-4 w-full h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            View All Employees
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-gray-800">Pending Leave Requests</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {pendingLeaves.length} pending
            </span>
          </div>
          {pendingLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending leave requests</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.slice(0, 5).map((leave: any) => (
                <div key={leave.id} className="flex items-center gap-3">
                  <CalendarCheck size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {leave.user?.first_name} {leave.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-400">{leave.leave_type || leave.type || 'Leave'} · {leave.days || ''} days</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-black text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Add Employee',    icon: Plus,        color: 'bg-primary-50 text-primary-700', path: '/hr/add-employee' },
            { label: 'View Directory',  icon: FolderOpen,  color: 'bg-blue-50 text-blue-700',       path: '/hr/employees' },
            { label: 'HR Reports',      icon: BarChart2,   color: 'bg-green-50 text-green-700',     path: '/hr/reports' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', a.color)}>
                <a.icon size={18} />
              </div>
              <span className="text-xs font-semibold text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
