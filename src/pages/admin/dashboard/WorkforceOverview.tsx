import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, ShieldCheck, Clock, Plus, GraduationCap, UserPlus, AlertCircle, CalendarCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Card from '@/components/ui/Card';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import { StatSkeleton } from '@/components/skeletons';

export default function WorkforceOverview() {
  const navigate = useNavigate();

  const { data: empData, isLoading: hiresLoading } = useQuery({
    queryKey: ['employee-list-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE.LIST + '?limit=5&sort=hire_date&order=desc'),
    select: (r: any) => r?.payload,
  });

  const { data: empStats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.EMPLOYEE.STATS),
    select: (r: any) => r?.payload,
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-pending-hr-dash'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.LEAVE.LIST + '?status=PENDING&limit=10'),
    select: (r: any) => r?.payload,
  });

  const recentHires: any[] = empData?.records || [];
  const stats = empStats || {};
  const leaves: any[] = leaveData?.records || leaveData || [];
  const pendingLeaves = leaves.filter((l: any) => l.status === 'PENDING' || !leaveData?.records);

  const goToDir = (qs?: string) =>
    navigate(qs ? `/admin/employee-directory?${qs}` : '/admin/employee-directory');

  return (
    <>
      <div className="p-3 rounded-[8px] bg-white">
        <div className="bg-[#F8F8F8] grid grid-cols-2 lg:grid-cols-4 gap-3 py-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <DashboardStatCard
                showDivider
                icon={<Users size={20} />}
                iconClassName="bg-blue-50 text-blue-600"
                value={stats.total ?? stats.total_employees ?? '—'}
                label="Total Employees"
                onClick={() => goToDir()}
              />
              <DashboardStatCard
                showDivider
                icon={<ShieldCheck size={20} />}
                iconClassName="bg-green-50 text-green-600"
                value={stats.active ?? '—'}
                label="Permanent Employees"
                onClick={() => goToDir('status=ACTIVE')}
              />
              <DashboardStatCard
                showDivider
                icon={<GraduationCap size={20} />}
                iconClassName="bg-purple-50 text-purple-600"
                value={stats.probation ?? '—'}
                label="Probation Employees"
                onClick={() => goToDir('lifecycle_stage=PROBATION')}
              />
              <DashboardStatCard
                icon={<UserPlus size={20} />}
                iconClassName="bg-teal-50 text-teal-600"
                value={stats.new_this_month ?? '—'}
                label="New This Month"
                onClick={() => goToDir('filter=new_this_month')}
              />
            </>
          )}
        </div>
        <div className="bg-[#F8F8F8] grid grid-cols-2 lg:grid-cols-4 gap-3 pb-1">
          {!statsLoading && (
            <>
              <DashboardStatCard
                showDivider
                icon={<Clock size={20} />}
                iconClassName="bg-amber-50 text-amber-600"
                value={stats.on_leave ?? '—'}
                label="On Leave"
                onClick={() => goToDir('status=ON_LEAVE')}
              />
              <DashboardStatCard
                showDivider
                icon={<AlertCircle size={20} />}
                iconClassName="bg-orange-50 text-orange-600"
                value={stats.suspended ?? '—'}
                label="Suspended"
                onClick={() => goToDir('status=SUSPENDED')}
              />
              <DashboardStatCard
                icon={<Users size={20} />}
                iconClassName="bg-gray-100 text-gray-500"
                value={stats.pending ?? '—'}
                label="Pending"
                onClick={() => goToDir('status=PENDING')}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card isLoading={hiresLoading} className="flex flex-col gap-4 border-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Recent Hires</h2>
            <button
              onClick={() => navigate('/admin/add-employee')}
              className="flex items-center gap-1.5 px-3 h-8 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors"
            >
              <Plus size={14} />Add Employee
            </button>
          </div>
          {recentHires.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No recent hires</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentHires.slice(0, 4).map((emp: any) => (
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
          <button onClick={() => goToDir()} className="mt-1 w-full h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            View All Employees
          </button>
        </Card>

        <Card isLoading={leaveLoading} className="flex flex-col gap-4 border-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">Pending Leave Requests</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {pendingLeaves.length} pending
            </span>
          </div>
          {pendingLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending leave requests</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingLeaves.slice(0, 4).map((leave: any) => (
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
        </Card>
      </div>
    </>
  );
}
