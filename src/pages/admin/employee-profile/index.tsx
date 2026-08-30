import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Briefcase, DollarSign, FileText, Clock, Plus, Trash2, Save, Upload, Download,
  RefreshCw, FileSignature, Users, Activity, StickyNote, Monitor, Ticket as TicketIcon,
  CheckSquare, Wallet, TrendingUp, Laptop, CalendarClock, Edit2,
} from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetEmployeeFullRecord, useUpsertHRProfile, useUpdateUserOrg,
  useGetEmployeeDocs, useGetDocTypes, useCreateEmployeeDoc, useUpdateEmployeeDoc, useDeleteEmployeeDoc,
  useGetReportingStructure, useGetLifecycleApprovals, useGetActivityLog,
  useGetEmployeeNotes, useCreateEmployeeNote, useUpdateEmployeeNote, useDeleteEmployeeNote,
  useGetEmployeePayslips,
} from '@/services/hrService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetGradesQuery } from '@/services/gradeService';
import {
  useSetLifecycleStageMutation, useMoveToProbationMutation, useEnterNoticePeriodMutation,
  useMoveToExitClearanceMutation, useArchiveEmployeeMutation,
} from '@/services/userService';
import { useGetMyAttendanceSummary } from '@/services/attendanceService';
import { useGetUserLeaveBalances } from '@/services/leaveBalanceService';
import { useGetPerformanceScoreByEmployee } from '@/services/performanceScoringService';
import { useGetScreenshots, useGetProductivity, useGetAppUsage } from '@/services/monitoringService';
import { useGetTickets } from '@/services/ticketService';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useQuery } from '@tanstack/react-query';
import EmergencyContactsSection from '@/components/employee-profile/EmergencyContactsSection';
import PolicyStatusSection from '@/components/employee-profile/PolicyStatusSection';
import EducationExperienceSection from '@/components/employee-profile/EducationExperienceSection';
import { EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';
import { NewDocumentModal } from '@/pages/admin/hr-documents';

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
  </div>
);

const EmptyState: React.FC<{ icon?: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="py-10 flex flex-col items-center gap-2 text-gray-400">
    {icon}
    <p className="text-sm font-medium">{label}</p>
  </div>
);

const SectionLoader: React.FC = () => (
  <div className="py-10 flex items-center justify-center">
    <Loader size={28} />
  </div>
);

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-100',
  INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
  ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-100',
  SUSPENDED: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  TERMINATED: 'bg-red-50 text-red-700 border-red-100',
  DECEASED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  ONBOARDING: 'bg-blue-50 text-blue-700 border-blue-100',
  PROBATION: 'bg-purple-50 text-purple-700 border-purple-100',
  ACTIVE_EMPLOYMENT: 'bg-teal-50 text-teal-700 border-teal-100',
  NOTICE_PERIOD: 'bg-orange-50 text-orange-700 border-orange-100',
  EXIT_CLEARANCE: 'bg-rose-50 text-rose-700 border-rose-100',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
};

const LIFECYCLE_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  PROBATION: 'Probation',
  ACTIVE_EMPLOYMENT: 'Active Employment',
  NOTICE_PERIOD: 'Notice Period',
  EXIT_CLEARANCE: 'Exit Clearance',
  ARCHIVED: 'Archived',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  CNIC: 'bg-blue-50 text-blue-700',
  RESUME: 'bg-purple-50 text-purple-700',
  CONTRACT: 'bg-green-50 text-green-700',
  OFFER_LETTER: 'bg-teal-50 text-teal-700',
  NDA: 'bg-pink-50 text-pink-700',
  POLICE_VERIFICATION: 'bg-amber-50 text-amber-700',
  EMPLOYEE_REGISTRATION: 'bg-indigo-50 text-indigo-700',
  OTHER: 'bg-gray-50 text-gray-600',
};

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'PROBATION', label: 'Probation' },
];
const WORK_MODES = [
  { value: 'ONSITE', label: 'Onsite' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];
const PROBATION_STATUSES = [
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'EXTENDED', label: 'Extended' },
  { value: 'FAILED', label: 'Failed' },
];

const OverviewSection: React.FC<{
  user: any; profile: any; onboarding_tasks: any[]; asset_assignments: any[]; leave_balances: any[];
  employeeId?: string; onNavigateTab: (tab: string) => void;
}> = ({
  user, profile,
  onboarding_tasks: onboardingTasks,
  asset_assignments: assetAssignments,
  leave_balances: leaveBalances,
  employeeId, onNavigateTab,
}) => {
  const { data: approvals } = useGetLifecycleApprovals({ status: 'PENDING', user_id: employeeId });
  const { data: scores } = useGetPerformanceScoreByEmployee(employeeId);
  const latestScore = scores?.[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><User size={16} />Quick Stats</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Hire Date" value={user.hire_date ? new Date(user.hire_date).toLocaleDateString() : null} />
          <InfoRow label="Employment Status" value={EMPLOYMENT_STATUS_LABELS[user.status] || user.status} />
          <InfoRow label="Lifecycle Stage" value={LIFECYCLE_LABELS[profile?.lifecycle_stage] || profile?.lifecycle_stage} />
          <InfoRow label="Department" value={user.department?.name} />
          <InfoRow label="Onboarding" value={`${onboardingTasks?.filter((t: any) => t.is_completed).length || 0} / ${onboardingTasks?.length || 0} tasks done`} />
          <InfoRow label="Assets Assigned" value={String(assetAssignments?.filter((a: any) => a.is_active).length || 0)} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-gray-900">Leave Balances</h3>
          <button onClick={() => onNavigateTab('Leave')} className="text-xs font-bold text-[#005CDA] hover:underline">View all</button>
        </div>
        {leaveBalances?.length > 0 ? (
          <div className="space-y-3">
            {leaveBalances.slice(0, 4).map((lb: any) => (
              <div key={lb.id} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{lb.policy?.name}</span>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900">{lb.remaining_days}</span>
                  <span className="text-xs text-gray-400 ml-1">/ {lb.total_days} days</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">No leave balances initialized</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-gray-900">Pending Approvals</h3>
          <button onClick={() => onNavigateTab('Approvals')} className="text-xs font-bold text-[#005CDA] hover:underline">View all</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <CheckSquare size={22} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{approvals?.total ?? approvals?.records?.length ?? 0}</p>
            <p className="text-xs text-gray-400 font-medium">Lifecycle approvals awaiting action</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-gray-900">Latest Performance</h3>
          <button onClick={() => onNavigateTab('Performance')} className="text-xs font-bold text-[#005CDA] hover:underline">View all</button>
        </div>
        {latestScore ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-[#005CDA] flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{latestScore.totalScore}%</p>
              <p className="text-xs text-gray-400 font-medium">{latestScore.period}</p>
            </div>
          </div>
        ) : <p className="text-sm text-gray-400">No performance scores recorded</p>}
      </Card>
    </div>
  );
};

const PersonalSection: React.FC<{ user: any; profile: any; employeeId?: string }> = ({ user, profile, employeeId }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><User size={16} />Personal Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <InfoRow label="First Name" value={user.first_name} />
        <InfoRow label="Last Name" value={user.last_name} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Personal Email" value={profile?.personal_email} />
        <InfoRow label="Phone" value={user.phone} />
        <InfoRow label="CNIC" value={profile?.cnic} />
        <InfoRow label="Date of Birth" value={profile?.dob ? new Date(profile.dob).toLocaleDateString() : null} />
        <InfoRow label="Gender" value={profile?.gender} />
        <InfoRow label="Marital Status" value={profile?.marital_status} />
      </div>
    </Card>

    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Address</h3>
      <div className="grid grid-cols-1 gap-4">
        <InfoRow label="Current Address" value={profile?.current_address} />
        <InfoRow label="Permanent Address" value={profile?.permanent_address} />
      </div>
    </Card>

    {employeeId && <EmergencyContactsSection userId={employeeId} />}

    {employeeId && (
      <div className="lg:col-span-2">
        <EducationExperienceSection userId={employeeId} />
      </div>
    )}
  </div>
);

const ReportingStructureSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data, isLoading } = useGetReportingStructure(employeeId);
  const navigate = useNavigate();

  if (isLoading) return <SectionLoader />;

  const manager = data?.manager;
  const directReports = data?.direct_reports || [];

  const PersonCard: React.FC<{ person: any }> = ({ person }) => (
    <button
      onClick={() => navigate(`/admin/employee-profile/${person.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors w-full text-left"
    >
      <div className="h-10 w-10 rounded-xl bg-[#005CDA] text-white flex items-center justify-center text-sm font-black shrink-0">
        {person.avatar ? <img src={person.avatar} className="h-full w-full rounded-xl object-cover" /> : `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{person.first_name} {person.last_name}</p>
        <p className="text-xs text-gray-400 truncate">{person.designation || person.designation_ref?.name || '—'}</p>
      </div>
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Users size={16} />Reporting Manager</h3>
        {manager ? <PersonCard person={manager} /> : <EmptyState label="No reporting manager assigned" />}
      </Card>

      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Users size={16} />Direct Reports ({directReports.length})</h3>
        {directReports.length > 0 ? (
          <div className="space-y-2">
            {directReports.map((p: any) => <PersonCard key={p.id} person={p} />)}
          </div>
        ) : <EmptyState label="No direct reports" />}
      </Card>
    </div>
  );
};

const AttendanceSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetMyAttendanceSummary({ user_id: employeeId });

  if (isLoading) return <SectionLoader />;
  if (!data) return <EmptyState icon={<Clock size={32} className="text-gray-200" />} label="No attendance data available" />;

  const stats = [
    { label: 'Present Days', value: data.present_days ?? data.total_present ?? 0 },
    { label: 'Absent Days', value: data.absent_days ?? data.total_absent ?? 0 },
    { label: 'Late Days', value: data.late_days ?? data.total_late ?? 0 },
    { label: 'Total Hours', value: data.total_hours ?? data.total_worked_hours ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="text-center py-6">
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-1">{s.label}</p>
          </Card>
        ))}
      </div>
      {/* Reuses the exact Employee Timesheets screen (no duplicated UI) —
          navigates with the employee pre-selected via ?user_id=. */}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => navigate(`/admin/employee-timesheets?user_id=${employeeId}`)}
      >
        Open Full Timesheet
      </Button>
    </div>
  );
};

const LeaveSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data: balances = [], isLoading } = useGetUserLeaveBalances(employeeId || '');

  if (isLoading) return <SectionLoader />;

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Leave Balances</h3>
      {balances.length > 0 ? (
        <div className="space-y-3">
          {balances.map((lb: any) => (
            <div key={lb.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-bold text-gray-800">{lb.policy?.name || 'Leave Policy'}</p>
                <p className="text-xs text-gray-400">Year {lb.year || new Date().getFullYear()}</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-gray-900">{lb.remaining_days}</span>
                <span className="text-xs text-gray-400 ml-1">/ {lb.total_days} days</span>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState label="No leave balances initialized" />}
    </Card>
  );
};

const BANKS = [
  'Habib Bank Limited (HBL)', 'United Bank Limited (UBL)', 'MCB Bank Limited',
  'Allied Bank Limited', 'Bank Alfalah', 'Meezan Bank', 'Faysal Bank',
  'Standard Chartered Bank Pakistan', 'Bank Al Habib', 'Askari Bank',
  'National Bank of Pakistan', 'JS Bank', 'Soneri Bank', 'Habib Metropolitan Bank',
  'Bank of Punjab', 'Bank of Khyber', 'Dubai Islamic Bank Pakistan',
  'Al Baraka Bank Pakistan', 'MCB Islamic Bank', 'Silkbank', 'Summit Bank', 'Other',
];

const PAYSLIP_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-500 border-gray-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-100',
  PAID: 'bg-green-50 text-green-700 border-green-100',
};

const PayrollSection: React.FC<{
  profile: any; hrEditing: boolean; hrForm: any; setHrForm: any;
  handleEditProfile: () => void; handleSaveProfile: () => void; setHrEditing: (v: boolean) => void; upsertProfile: any;
  employeeId?: string;
}> = ({ profile, hrEditing, hrForm, setHrForm, handleEditProfile, handleSaveProfile, setHrEditing, upsertProfile, employeeId }) => {
  const { data: payslips = [], isLoading } = useGetEmployeePayslips(employeeId);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={16} />Salary Information</h3>
        {hrEditing ? (
          <div className="grid grid-cols-2 gap-3">
            <SearchableSelect label="Currency" options={[{ value: 'PKR', label: 'PKR' }, { value: 'USD', label: 'USD' }]} value={hrForm.salary_currency || 'PKR'} onChange={(v: any) => setHrForm((p: any) => ({ ...p, salary_currency: v }))} className="h-10 !rounded-xl" />
            <Input label="Base Salary" type="number" value={hrForm.base_salary || ''} onChange={e => setHrForm((p: any) => ({ ...p, base_salary: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Gross Salary" type="number" value={hrForm.gross_salary || ''} onChange={e => setHrForm((p: any) => ({ ...p, gross_salary: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Effective Date" type="date" value={hrForm.effective_salary_date ? hrForm.effective_salary_date.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, effective_salary_date: e.target.value }))} className="h-10 rounded-xl" />
            <SearchableSelect label="Bank" options={[{ value: '', label: 'Select bank' }, ...BANKS.map(b => ({ value: b, label: b }))]} value={hrForm.bank_name || ''} onChange={(v: any) => setHrForm((p: any) => ({ ...p, bank_name: v }))} className="h-10 !rounded-xl" />
            <Input label="Bank Account Number" value={hrForm.bank_account_number || ''} onChange={e => setHrForm((p: any) => ({ ...p, bank_account_number: e.target.value.replace(/[^0-9A-Za-z-]/g, '') }))} className="h-10 rounded-xl" disabled={!hrForm.bank_name} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Currency" value={profile?.salary_currency} />
            <InfoRow label="Base Salary" value={profile?.base_salary ? `${profile.salary_currency || 'PKR'} ${Number(profile.base_salary).toLocaleString()}` : null} />
            <InfoRow label="Gross Salary" value={profile?.gross_salary ? `${profile.salary_currency || 'PKR'} ${Number(profile.gross_salary).toLocaleString()}` : null} />
            <InfoRow label="Effective From" value={profile?.effective_salary_date ? new Date(profile.effective_salary_date).toLocaleDateString() : null} />
            <InfoRow label="Bank" value={profile?.bank_name} />
            <InfoRow label="Bank Account Number" value={profile?.bank_account_number} />
          </div>
        )}
        {!hrEditing && (
          <Button variant="outline" size="sm" animation="none" rounded={false} className="mt-4 rounded-xl" onClick={handleEditProfile}>Edit Compensation</Button>
        )}
        {hrEditing && (
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" animation="none" rounded={false} className="rounded-xl" onClick={() => setHrEditing(false)}>Cancel</Button>
            <Button variant="primary" animation="none" rounded={false} className="rounded-xl" loading={upsertProfile.isPending} onClick={handleSaveProfile}>
              <Save size={14} className="mr-1.5" />Save
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Wallet size={16} />Payslips</h3>
        {isLoading ? <SectionLoader /> : payslips.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-400 font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2 pr-4">Gross</th>
                  <th className="pb-2 pr-4">Deductions</th>
                  <th className="pb-2 pr-4">Net</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-gray-800">{p.period_month}/{p.period_year}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{Number(p.gross_amount || 0).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{Number(p.deductions || 0).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 font-bold text-gray-900">{Number(p.net_amount || 0).toLocaleString()}</td>
                    <td className="py-2.5">
                      <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', PAYSLIP_STATUS_COLORS[p.status] || PAYSLIP_STATUS_COLORS.DRAFT)}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={<Wallet size={32} className="text-gray-200" />} label="No payslips found" />}
      </Card>
    </div>
  );
};

const PerformanceSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data: scores = [], isLoading } = useGetPerformanceScoreByEmployee(employeeId);

  if (isLoading) return <SectionLoader />;

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Performance Scores</h3>
      {scores.length > 0 ? (
        <div className="space-y-3">
          {scores.map((ps: any) => (
            <div key={ps.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{ps.period}</p>
                <p className="text-xs text-gray-400">Updated {ps.updatedAt ? new Date(ps.updatedAt).toLocaleDateString() : ''}</p>
              </div>
              <span className="text-lg font-black text-[#005CDA]">{ps.totalScore}%</span>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<TrendingUp size={32} className="text-gray-200" />} label="No performance scores recorded" />}
    </Card>
  );
};

const AssetsSection: React.FC<{ asset_assignments: any[] }> = ({ asset_assignments: assetAssignments }) => (
  <Card>
    <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Laptop size={16} />Assigned Assets</h3>
    {assetAssignments?.length > 0 ? (
      <div className="space-y-2">
        {assetAssignments.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">{a.asset?.name}</p>
              <p className="text-xs text-gray-400">{a.asset?.category?.name} · {a.asset?.brand}</p>
            </div>
            <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', a.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200')}>
              {a.is_active ? 'Active' : 'Returned'}
            </Badge>
          </div>
        ))}
      </div>
    ) : <EmptyState icon={<Laptop size={32} className="text-gray-200" />} label="No assets assigned" />}
  </Card>
);

const ContractsSection: React.FC<{ contracts: any[] }> = ({ contracts }) => (
  <Card>
    <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Briefcase size={16} />Contracts</h3>
    {contracts?.length > 0 ? contracts.map((c: any) => (
      <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
        <div>
          <p className="text-sm font-semibold text-gray-800">{c.title}</p>
          <p className="text-xs text-gray-400">{c.type} · {c.status}</p>
        </div>
        <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', c.status === 'SIGNED' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200')}>
          {c.status}
        </Badge>
      </div>
    )) : <EmptyState icon={<Briefcase size={32} className="text-gray-200" />} label="No contracts found" />}
  </Card>
);

const EmploymentSection: React.FC<{
  user: any; profile: any; onboarding_tasks: any[];
  orgEditing: boolean; orgForm: any; setOrgForm: any; setOrgEditing: (v: boolean) => void; handleEditOrg: () => void; handleSaveOrg: () => void; updateOrg: any;
  designations: any; grades: any; managers: any; employeeId?: string;
  hrEditing: boolean; hrForm: any; setHrForm: any; handleSaveProfile: () => void; setHrEditing: (v: boolean) => void; upsertProfile: any;
}> = ({
  user, profile,
  onboarding_tasks: onboardingTasks,
  orgEditing, orgForm, setOrgForm, setOrgEditing, handleEditOrg, handleSaveOrg, updateOrg,
  designations, grades, managers, employeeId,
  hrEditing, hrForm, setHrForm, handleSaveProfile, setHrEditing, upsertProfile,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><Briefcase size={16} />Organization</h3>
        {!orgEditing ? (
          <Button variant="outline" onClick={handleEditOrg} className="h-8 rounded-lg text-xs font-bold px-3">Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOrgEditing(false)} className="h-8 rounded-lg text-xs font-bold px-3">Cancel</Button>
            <Button variant="primary" onClick={handleSaveOrg} disabled={updateOrg.isPending} className="h-8 rounded-lg text-xs font-bold px-3">
              {updateOrg.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>
      {orgEditing ? (
        <div className="grid grid-cols-1 gap-3">
          <SearchableSelect
            label="Designation"
            options={[{ label: 'None', value: '' }, ...(designations || []).map((d: any) => ({ label: d.name, value: d.id }))]}
            value={orgForm.designation_id}
            onChange={(v: any) => setOrgForm((p: any) => ({ ...p, designation_id: String(v) }))}
            className="h-10 !rounded-xl"
          />
          <SearchableSelect
            label="Grade"
            options={[{ label: 'None', value: '' }, ...(grades || []).map((g: any) => ({ label: g.name, value: g.id }))]}
            value={orgForm.grade_id}
            onChange={(v: any) => setOrgForm((p: any) => ({ ...p, grade_id: String(v) }))}
            className="h-10 !rounded-xl"
          />
          <SearchableSelect
            label="Reporting Manager"
            options={[{ label: 'None', value: '' }, ...(managers || []).filter((m: any) => m.id !== employeeId).map((m: any) => ({ label: `${m.first_name} ${m.last_name}`, value: m.id }))]}
            value={orgForm.supervisor_id}
            onChange={(v: any) => setOrgForm((p: any) => ({ ...p, supervisor_id: String(v) }))}
            className="h-10 !rounded-xl"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Designation" value={user.designation_ref?.name || user.designation} />
          <InfoRow label="Grade" value={user.grade?.name} />
          <InfoRow label="Department" value={user.department?.name} />
          <InfoRow label="Business Unit" value={user.department?.business_unit?.name || user.division?.name} />
          <InfoRow label="Reporting Manager" value={user.supervisor ? `${user.supervisor.first_name} ${user.supervisor.last_name}` : null} />
        </div>
      )}
    </Card>

    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Briefcase size={16} />Employment Details</h3>
      {hrEditing ? (
        <div className="grid grid-cols-2 gap-3">
          <SearchableSelect label="Employment Type" options={EMPLOYMENT_TYPES} value={hrForm.employment_type || ''} onChange={(v: any) => setHrForm((p: any) => ({ ...p, employment_type: v }))} placeholder="Select" className="h-10 !rounded-xl" />
          <SearchableSelect label="Work Mode" options={WORK_MODES} value={hrForm.work_mode || ''} onChange={(v: any) => setHrForm((p: any) => ({ ...p, work_mode: v }))} placeholder="Select" className="h-10 !rounded-xl" />
          <Input label="Office Location" value={hrForm.office_location || ''} onChange={e => setHrForm((p: any) => ({ ...p, office_location: e.target.value }))} className="h-10 rounded-xl" />
          <Input label="Notice Period (days)" type="number" value={hrForm.notice_period_days || ''} onChange={e => setHrForm((p: any) => ({ ...p, notice_period_days: e.target.value }))} className="h-10 rounded-xl" />
          <Input label="Joining Date" type="date" value={hrForm.confirmation_date ? hrForm.confirmation_date.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, confirmation_date: e.target.value }))} className="h-10 rounded-xl" />
          <Input label="Resignation Date" type="date" value={hrForm.resignation_date ? hrForm.resignation_date.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, resignation_date: e.target.value }))} className="h-10 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Employment Type" value={profile?.employment_type?.replace(/_/g, ' ')} />
          <InfoRow label="Work Mode" value={profile?.work_mode} />
          <InfoRow label="Office Location" value={profile?.office_location} />
          <InfoRow label="Notice Period" value={profile?.notice_period_days ? `${profile.notice_period_days} days` : null} />
          <InfoRow label="Confirmation Date" value={profile?.confirmation_date ? new Date(profile.confirmation_date).toLocaleDateString() : null} />
          <InfoRow label="Resignation Date" value={profile?.resignation_date ? new Date(profile.resignation_date).toLocaleDateString() : null} />
          <InfoRow label="Termination Date" value={profile?.termination_date ? new Date(profile.termination_date).toLocaleDateString() : null} />
        </div>
      )}
    </Card>

    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Probation Tracking</h3>
      {hrEditing ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Probation Start" type="date" value={hrForm.probation_start ? hrForm.probation_start.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, probation_start: e.target.value }))} className="h-10 rounded-xl" />
          <Input label="Probation End" type="date" value={hrForm.probation_end ? hrForm.probation_end.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, probation_end: e.target.value }))} className="h-10 rounded-xl" />
          <SearchableSelect label="Probation Status" options={PROBATION_STATUSES} value={hrForm.probation_status || ''} onChange={(v: any) => setHrForm((p: any) => ({ ...p, probation_status: v }))} placeholder="Select" className="h-10 !rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Probation Start" value={profile?.probation_start ? new Date(profile.probation_start).toLocaleDateString() : null} />
          <InfoRow label="Probation End" value={profile?.probation_end ? new Date(profile.probation_end).toLocaleDateString() : null} />
          <InfoRow label="Probation Status" value={profile?.probation_status} />
        </div>
      )}
    </Card>

    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Onboarding Checklist</h3>
      {onboardingTasks?.length > 0 ? (
        <div className="space-y-2">
          {onboardingTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3">
              <div className={cn('h-4 w-4 rounded-full border-2 shrink-0', t.is_completed ? 'bg-green-500 border-green-500' : 'border-gray-300')} />
              <span className={cn('text-sm', t.is_completed ? 'line-through text-gray-400' : 'text-gray-700 font-medium')}>{t.title}</span>
              <span className="ml-auto text-xs text-gray-400 shrink-0">{t.category}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-gray-400">No onboarding tasks</p>}
    </Card>

    {hrEditing && (
      <div className="lg:col-span-2 flex justify-end gap-3">
        <Button variant="outline" animation="none" rounded={false} className="rounded-xl" onClick={() => setHrEditing(false)}>Cancel</Button>
        <Button variant="primary" animation="none" rounded={false} className="rounded-xl" loading={upsertProfile.isPending} onClick={handleSaveProfile}>
          <Save size={14} className="mr-1.5" />Save Changes
        </Button>
      </div>
    )}
  </div>
);

const REQUIRED_DOC_TYPES = ['CNIC', 'RESUME', 'OFFER_LETTER', 'CONTRACT', 'NDA'];

const DOC_STATUS_BADGE: Record<string, string> = {
  UPLOADED: 'bg-green-50 text-green-700',
  EXPIRING_SOON: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-red-50 text-red-700',
};
const DOC_STATUS_LABEL: Record<string, string> = {
  UPLOADED: '✓ Uploaded',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired',
};

const VERIFICATION_BADGE: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  VERIFIED: 'bg-blue-50 text-blue-700',
  REJECTED: 'bg-red-50 text-red-700',
};

const DocumentsSection: React.FC<{
  docs: any[]; docTypes: any; showAddDoc: boolean; setShowAddDoc: (v: boolean) => void;
  newDoc: any; setNewDoc: any; createDoc: any; updateDoc: any; deleteDoc: any; handleAddDoc: () => void;
}> = ({ docs, docTypes, showAddDoc, setShowAddDoc, newDoc, setNewDoc, createDoc, updateDoc, deleteDoc, handleAddDoc }) => {
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const toast = useToastContext();
  const { data: myPerms } = useMyPermissions();
  const canVerify = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('hr.employee_documents.edit');

  const handleVerify = (doc: any, status: 'VERIFIED' | 'REJECTED') => {
    updateDoc.mutate({ docId: doc.id, data: { verification_status: status } }, {
      onSuccess: () => toast.success(status === 'VERIFIED' ? 'Document verified' : 'Document rejected'),
      onError: (e: any) => toast.error(e?.message || 'Failed to update verification'),
    });
  };

  const handleSetExpiry = (doc: any, expiry_date: string) => {
    updateDoc.mutate({ docId: doc.id, data: { title: doc.title, document_type: doc.document_type, notes: doc.notes, expiry_date: expiry_date || null } }, {
      onSuccess: () => toast.success('Expiry date updated'),
      onError: (e: any) => toast.error(e?.message || 'Failed to update expiry date'),
    });
  };

  const uploadedTypes = new Set(docs.map((d) => d.document_type));
  const missingTypes = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t));

  const handleNewDocFile = async (file: File) => {
    setUploading(true);
    try {
      const { file_url, file_key } = await uploadFile(file);
      setNewDoc((p: any) => ({ ...p, file_url, file_key, title: p.title || file.name.replace(/\.[^.]+$/, '') }));
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const handleReplaceFile = async (doc: any, file: File) => {
    setReplacingId(doc.id);
    try {
      const { file_url, file_key } = await uploadFile(file);
      updateDoc.mutate({ docId: doc.id, data: { title: doc.title, document_type: doc.document_type, notes: doc.notes, file_url, file_key } }, {
        onSuccess: () => toast.success('Document replaced'),
        onError: (e: any) => toast.error(e?.message || 'Replace failed'),
      });
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    }
    setReplacingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAddDoc(true)}>
          <Plus size={14} className="mr-1.5" />Add Document
        </Button>
      </div>

      {showAddDoc && (
        <Card>
          <h3 className="text-sm font-black text-gray-900 mb-3">Add New Document</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title *" value={newDoc.title} onChange={e => setNewDoc((p: any) => ({ ...p, title: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Employment Contract 2024" />
            <SearchableSelect label="Document Type" options={docTypes} value={newDoc.document_type} onChange={(v: any) => setNewDoc((p: any) => ({ ...p, document_type: String(v) }))} className="h-10 !rounded-xl" />
            <div className="col-span-2">
              <p className="text-xs font-bold text-gray-500 mb-1">Upload File *</p>
              <label className={cn(
                'flex items-center gap-2 w-full h-10 px-3 border border-dashed rounded-xl text-sm cursor-pointer transition-colors',
                uploading ? 'border-blue-300 bg-blue-50 text-blue-500' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50 text-gray-400 hover:text-blue-500',
              )}>
                <Upload size={14} />
                <span className="truncate">{uploading ? 'Uploading…' : newDoc.file_url ? 'File uploaded — choose another to replace' : 'Choose file to upload'}</span>
                <input type="file" className="hidden" disabled={uploading} onChange={e => e.target.files?.[0] && handleNewDocFile(e.target.files[0])} />
              </label>
              {newDoc.file_url && (
                <a href={newDoc.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#005CDA] font-semibold mt-1.5 inline-flex items-center gap-1">
                  <FileText size={12} />Preview uploaded file
                </a>
              )}
            </div>
            <Input type="date" label="Expiry Date (optional)" value={newDoc.expiry_date} onChange={e => setNewDoc((p: any) => ({ ...p, expiry_date: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Notes (optional)" value={newDoc.notes} onChange={e => setNewDoc((p: any) => ({ ...p, notes: e.target.value }))} className="h-10 rounded-xl col-span-2" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAddDoc(false)}>Cancel</Button>
            <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={createDoc.isPending} disabled={uploading} onClick={handleAddDoc}>Add</Button>
          </div>
        </Card>
      )}

      {docs.length > 0 || missingTypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc: any) => (
            <Card key={doc.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.OTHER)}>
                  {doc.document_type.replace(/_/g, ' ')}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap', DOC_STATUS_BADGE[doc.status] || DOC_STATUS_BADGE.UPLOADED)}>
                    {DOC_STATUS_LABEL[doc.status] || '✓ Uploaded'}
                  </span>
                  <button onClick={() => deleteDoc.mutate(doc.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{doc.title}</p>
                {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
              </div>
              {doc.file_url && (
                <div className="flex items-center gap-3">
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#005CDA] font-semibold flex items-center gap-1">
                    <FileText size={12} />Preview
                  </a>
                  <a href={doc.file_url} download target="_blank" rel="noreferrer" className="text-xs text-[#005CDA] font-semibold flex items-center gap-1">
                    <Download size={12} />Download
                  </a>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Expiry Date</p>
                <input
                  type="date"
                  defaultValue={doc.expiry_date ? String(doc.expiry_date).slice(0, 10) : ''}
                  onBlur={(e) => e.target.value !== (doc.expiry_date ? String(doc.expiry_date).slice(0, 10) : '') && handleSetExpiry(doc, e.target.value)}
                  className="w-full h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn('px-1.5 py-0.5 rounded-full font-bold', VERIFICATION_BADGE[doc.verification_status] || VERIFICATION_BADGE.PENDING)}>
                  {doc.verification_status || 'PENDING'}
                </span>
                {canVerify && doc.verification_status !== 'VERIFIED' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleVerify(doc, 'VERIFIED')} className="text-green-600 font-bold hover:underline">Verify</button>
                    <button onClick={() => handleVerify(doc, 'REJECTED')} className="text-red-500 font-bold hover:underline">Reject</button>
                  </div>
                )}
              </div>
              <label className={cn(
                'flex items-center justify-center gap-1.5 w-full h-8 border border-dashed rounded-lg text-[11px] font-bold cursor-pointer transition-colors',
                replacingId === doc.id ? 'border-blue-300 bg-blue-50 text-blue-500' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-400 hover:text-blue-500',
              )}>
                <RefreshCw size={11} className={replacingId === doc.id ? 'animate-spin' : ''} />
                {replacingId === doc.id ? 'Uploading…' : 'Replace file'}
                <input type="file" className="hidden" disabled={replacingId === doc.id} onChange={e => e.target.files?.[0] && handleReplaceFile(doc, e.target.files[0])} />
              </label>
              <div className="flex items-center justify-between text-[10px] text-gray-300 mt-auto">
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                <span>{doc.uploader ? `by ${doc.uploader.first_name || ''} ${doc.uploader.last_name || ''}`.trim() : ''}</span>
              </div>
            </Card>
          ))}
          {missingTypes.map((type) => (
            <Card key={type} className="flex flex-col gap-3 border-dashed border-red-200 bg-red-50/30 justify-center items-center py-8">
              <FileText size={24} className="text-red-200" />
              <p className="text-sm font-black text-gray-700">{type.replace(/_/g, ' ')}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600">Missing</span>
              <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => { setNewDoc((p: any) => ({ ...p, document_type: type })); setShowAddDoc(true); }}>
                Upload
              </Button>
            </Card>
          ))}
        </div>
      ) : !showAddDoc && (
        <Card className="py-12 flex flex-col items-center gap-3">
          <FileText size={32} className="text-gray-200" />
          <p className="text-gray-400 font-medium">No documents uploaded yet</p>
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAddDoc(true)}>
            Add First Document
          </Button>
        </Card>
      )}
    </div>
  );
};

const MonitoringSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const params = { user_id: employeeId || '', limit: '10' };
  const { data: screenshotData, isLoading: loadingShots } = useGetScreenshots(params);
  const { data: productivityData, isLoading: loadingProd } = useGetProductivity(params);
  const { data: appUsage = [], isLoading: loadingApps } = useGetAppUsage(params);

  const screenshots = screenshotData?.records || [];
  const sessions = productivityData?.records || [];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Monitor size={16} />Productivity Sessions</h3>
        {loadingProd ? <SectionLoader /> : sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-semibold text-gray-800">{new Date(s.date).toLocaleDateString()}</span>
                <span className="text-xs text-gray-500">Active {Math.round((s.active_seconds || 0) / 60)}m</span>
                <span className="text-sm font-black text-[#005CDA]">{s.productivity_score}%</span>
              </div>
            ))}
          </div>
        ) : <EmptyState label="No productivity data recorded" />}
      </Card>

      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4">App Usage</h3>
        {loadingApps ? <SectionLoader /> : appUsage.length > 0 ? (
          <div className="space-y-2">
            {appUsage.map((a) => (
              <div key={a.app_name} className="flex items-center justify-between py-1.5">
                <span className="text-sm font-medium text-gray-700">{a.app_name}</span>
                <span className="text-xs text-gray-400">{Math.round(a.duration_seconds / 60)}m ({a.percentage}%)</span>
              </div>
            ))}
          </div>
        ) : <EmptyState label="No app usage data" />}
      </Card>

      <Card>
        <h3 className="text-base font-black text-gray-900 mb-4">Recent Screenshots</h3>
        {loadingShots ? <SectionLoader /> : screenshots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {screenshots.map((s: any) => (
              <a key={s.id} href={s.file_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-gray-100 aspect-video bg-gray-50">
                {s.file_url && <img src={s.file_url} className="w-full h-full object-cover" />}
              </a>
            ))}
          </div>
        ) : <EmptyState label="No screenshots captured" />}
      </Card>
    </div>
  );
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-100',
  resolved: 'bg-green-50 text-green-700 border-green-100',
  closed: 'bg-gray-50 text-gray-500 border-gray-200',
};

const TicketsSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data: tickets = [], isLoading } = useGetTickets({ created_by: employeeId });
  const navigate = useNavigate();

  if (isLoading) return <SectionLoader />;

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><TicketIcon size={16} />Tickets Raised</h3>
      {tickets.length > 0 ? (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <button
              key={t.id}
              onClick={() => navigate(`/admin/tickets/${t.id}`)}
              className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 w-full text-left hover:bg-gray-50/60 rounded-lg px-2 -mx-2 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.subject}</p>
                <p className="text-xs text-gray-400">{t.category || t.ticket_type?.name} · {new Date(t.created_at).toLocaleDateString()}</p>
              </div>
              <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase', TICKET_STATUS_COLORS[t.status] || TICKET_STATUS_COLORS.pending)}>
                {String(t.status).replace(/_/g, ' ')}
              </Badge>
            </button>
          ))}
        </div>
      ) : <EmptyState icon={<TicketIcon size={32} className="text-gray-200" />} label="No tickets raised" />}
    </Card>
  );
};

const APPROVAL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  APPROVED: 'bg-green-50 text-green-700 border-green-100',
  REJECTED: 'bg-red-50 text-red-700 border-red-100',
};

const ApprovalsSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data, isLoading } = useGetLifecycleApprovals({ user_id: employeeId });
  const records = data?.records || [];

  if (isLoading) return <SectionLoader />;

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><CheckSquare size={16} />Lifecycle Approvals</h3>
      {records.length > 0 ? (
        <div className="space-y-2">
          {records.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{String(r.transition).replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-400">{r.from_stage} → {r.to_stage} · {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', APPROVAL_STATUS_COLORS[r.status] || APPROVAL_STATUS_COLORS.PENDING)}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<CheckSquare size={32} className="text-gray-200" />} label="No lifecycle approval requests" />}
    </Card>
  );
};

const ActivityTimelineSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { data: events = [], isLoading } = useGetActivityLog({ user_id: employeeId });

  if (isLoading) return <SectionLoader />;

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Activity size={16} />Activity Timeline</h3>
      {events.length > 0 ? (
        <div className="relative pl-6 border-l-2 border-gray-100 space-y-6">
          {events.map((e: any) => (
            <div key={e.id} className="relative">
              <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-[#005CDA] border-2 border-white" />
              <p className="text-xs text-gray-400 font-medium">{new Date(e.created_at).toLocaleString()}</p>
              <p className="text-sm font-bold text-gray-800">{e.action}</p>
              {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<CalendarClock size={32} className="text-gray-200" />} label="No activity recorded yet" />}
    </Card>
  );
};

const NotesSection: React.FC<{ employeeId?: string }> = ({ employeeId }) => {
  const { user: currentUser } = useAuth();
  const toast = useToastContext();
  const { data: notes = [], isLoading } = useGetEmployeeNotes(employeeId);
  const createNote = useCreateEmployeeNote(employeeId || '');
  const updateNote = useUpdateEmployeeNote(employeeId || '');
  const deleteNote = useDeleteEmployeeNote(employeeId || '');

  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);

  const { data: myPerms } = useMyPermissions();
  const isAdmin = !!myPerms?.is_super_admin;

  const handleAdd = () => {
    if (!body.trim()) { toast.error('Note cannot be empty'); return; }
    createNote.mutate({ body: body.trim(), is_private: isPrivate }, {
      onSuccess: () => { setBody(''); setIsPrivate(false); toast.success('Note added'); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add note'),
    });
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setEditBody(note.body);
    setEditPrivate(note.is_private);
  };

  const saveEdit = (noteId: string) => {
    updateNote.mutate({ noteId, data: { body: editBody.trim(), is_private: editPrivate } }, {
      onSuccess: () => { setEditingId(null); toast.success('Note updated'); },
      onError: (e: any) => toast.error(e?.message || 'Failed to update note'),
    });
  };

  const handleDelete = (noteId: string) => {
    deleteNote.mutate(noteId, {
      onSuccess: () => toast.success('Note deleted'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete note'),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="text-sm font-black text-gray-900 mb-3">Add a Note</h3>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a note about this employee…"
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
        />
        <div className="flex items-center justify-between mt-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
            Private (HR/Admin only)
          </label>
          <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={createNote.isPending} onClick={handleAdd}>
            <Plus size={14} className="mr-1.5" />Add Note
          </Button>
        </div>
      </Card>

      {isLoading ? <SectionLoader /> : notes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {notes.map((note: any) => {
            const canManage = note.author?.id === currentUser?.id || isAdmin;
            const isEditing = editingId === note.id;
            return (
              <Card key={note.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#005CDA] text-white flex items-center justify-center text-xs font-black shrink-0">
                      {note.author?.avatar ? <img src={note.author.avatar} className="h-full w-full rounded-full object-cover" /> : `${note.author?.first_name?.[0] || ''}${note.author?.last_name?.[0] || ''}`.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{note.author?.first_name} {note.author?.last_name}</p>
                      <p className="text-[11px] text-gray-400">{new Date(note.created_at).toLocaleString()}</p>
                    </div>
                    {note.is_private && (
                      <Badge className="border text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border-purple-100">Private</Badge>
                    )}
                  </div>
                  {canManage && !isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEdit(note)} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(note.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-3">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={editPrivate} onChange={(e) => setEditPrivate(e.target.checked)} className="rounded" />
                        Private
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={updateNote.isPending} onClick={() => saveEdit(note.id)}>Save</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{note.body}</p>
                )}
              </Card>
            );
          })}
        </div>
      ) : <Card className="py-12 flex flex-col items-center gap-2"><StickyNote size={32} className="text-gray-200" /><p className="text-gray-400 font-medium">No notes yet</p></Card>}
    </div>
  );
};

const EmployeeProfilePage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const [hrForm, setHrForm] = useState<any>({});
  const [hrEditing, setHrEditing] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', document_type: 'OTHER', file_url: '', file_key: '', notes: '', expiry_date: '' });
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [orgEditing, setOrgEditing] = useState(false);
  const [orgForm, setOrgForm] = useState<{ designation_id: string; grade_id: string; supervisor_id: string }>({ designation_id: '', grade_id: '', supervisor_id: '' });
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingLifecycle, setEditingLifecycle] = useState(false);

  const { data: record, isLoading } = useGetEmployeeFullRecord(employeeId);
  const setLifecycleStage = useSetLifecycleStageMutation();
  const moveToProbation = useMoveToProbationMutation();
  const enterNoticePeriod = useEnterNoticePeriodMutation();
  const moveToExitClearance = useMoveToExitClearanceMutation();
  const archiveEmployee = useArchiveEmployeeMutation();
  const { data: docs = [] } = useGetEmployeeDocs(employeeId);
  const { data: docTypes = [] } = useGetDocTypes();
  const upsertProfile = useUpsertHRProfile(employeeId!);
  const createDoc = useCreateEmployeeDoc(employeeId!);
  const updateDoc = useUpdateEmployeeDoc(employeeId!);
  const deleteDoc = useDeleteEmployeeDoc(employeeId!);
  const updateOrg = useUpdateUserOrg(employeeId!);
  const { data: designations } = useGetDesignationsQuery(record?.user?.department?.id);
  const { data: grades } = useGetGradesQuery();
  const { data: managers } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  if (isLoading) return <Loader fullPage size={48} />;
  if (!record) return <div className="p-10 text-center text-gray-500 font-bold">Employee not found</div>;

  const { user, profile, contracts, onboarding_tasks, leave_balances, asset_assignments } = record;
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');

  const handleEditProfile = () => {
    setHrForm({ ...profile });
    setHrEditing(true);
    setActiveTab('Payroll');
  };

  const handleEditOrg = () => {
    setOrgForm({
      designation_id: user.designation_ref?.id || '',
      grade_id: user.grade?.id || '',
      supervisor_id: user.supervisor?.id || '',
    });
    setOrgEditing(true);
  };

  const handleSaveOrg = () => {
    updateOrg.mutate({
      designation_id: orgForm.designation_id || null,
      grade_id: orgForm.grade_id || null,
      supervisor_id: orgForm.supervisor_id || null,
    }, {
      onSuccess: () => { toast.success('Organization details updated'); setOrgEditing(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to update'),
    });
  };

  const handleSaveProfile = () => {
    upsertProfile.mutate(hrForm, {
      onSuccess: () => { toast.success('Profile saved'); setHrEditing(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to save'),
    });
  };

  const SENSITIVE_STAGE_MUTATIONS: Record<string, { mutate: (opts: { onSuccess: () => void; onError: (e: any) => void }) => void }> = {
    PROBATION: { mutate: (opts) => moveToProbation.mutate(employeeId!, opts) },
    NOTICE_PERIOD: { mutate: (opts) => enterNoticePeriod.mutate({ userId: employeeId! }, opts) },
    EXIT_CLEARANCE: { mutate: (opts) => moveToExitClearance.mutate(employeeId!, opts) },
    ARCHIVED: { mutate: (opts) => archiveEmployee.mutate(employeeId!, opts) },
  };

  const handleLifecycleStageChange = (value: string | number) => {
    const stage = String(value);
    const onSuccess = () => { toast.success('Lifecycle stage updated'); setEditingLifecycle(false); };
    const onError = (e: any) => {
      toast.error(e?.message || (e?.status === 409 ? 'Transition blocked — requirements not met' : 'Failed to update lifecycle stage'));
    };

    const sensitive = SENSITIVE_STAGE_MUTATIONS[stage];
    if (sensitive) {
      sensitive.mutate({ onSuccess, onError });
      return;
    }

    setLifecycleStage.mutate({ user_ids: [employeeId!], lifecycle_stage: stage }, { onSuccess, onError });
  };

  const isLifecycleStagePending = setLifecycleStage.isPending || moveToProbation.isPending
    || enterNoticePeriod.isPending || moveToExitClearance.isPending || archiveEmployee.isPending;

  const handleAddDoc = () => {
    if (!newDoc.title) { toast.error('Title is required'); return; }
    if (!newDoc.file_url) { toast.error('Please upload a file'); return; }
    createDoc.mutate(newDoc, {
      onSuccess: () => { toast.success('Document added'); setShowAddDoc(false); setNewDoc({ title: '', document_type: 'OTHER', file_url: '', file_key: '', notes: '', expiry_date: '' }); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

  const tabs = [
    {
      id: 'Overview',
      label: 'Overview',
      render: () => (
        <OverviewSection
          user={user} profile={profile} onboarding_tasks={onboarding_tasks}
          asset_assignments={asset_assignments} leave_balances={leave_balances}
          employeeId={employeeId} onNavigateTab={setActiveTab}
        />
      ),
    },
    {
      id: 'Personal',
      label: 'Personal',
      render: () => <PersonalSection user={user} profile={profile} employeeId={employeeId} />,
    },
    {
      id: 'Employment',
      label: 'Employment',
      render: () => (
        <EmploymentSection
          user={user} profile={profile} onboarding_tasks={onboarding_tasks}
          orgEditing={orgEditing} orgForm={orgForm} setOrgForm={setOrgForm} setOrgEditing={setOrgEditing}
          handleEditOrg={handleEditOrg} handleSaveOrg={handleSaveOrg} updateOrg={updateOrg}
          designations={designations} grades={grades} managers={managers} employeeId={employeeId}
          hrEditing={hrEditing} hrForm={hrForm} setHrForm={setHrForm}
          handleSaveProfile={handleSaveProfile} setHrEditing={setHrEditing} upsertProfile={upsertProfile}
        />
      ),
    },
    {
      id: 'Reporting Structure',
      label: 'Reporting Structure',
      render: () => <ReportingStructureSection employeeId={employeeId} />,
    },
    {
      id: 'Attendance',
      label: 'Attendance',
      render: () => <AttendanceSection employeeId={employeeId} />,
    },
    {
      id: 'Leave',
      label: 'Leave',
      render: () => <LeaveSection employeeId={employeeId} />,
    },
    {
      id: 'Payroll',
      label: 'Payroll',
      render: () => (
        <PayrollSection
          profile={profile} hrEditing={hrEditing} hrForm={hrForm} setHrForm={setHrForm}
          handleEditProfile={handleEditProfile} handleSaveProfile={handleSaveProfile}
          setHrEditing={setHrEditing} upsertProfile={upsertProfile} employeeId={employeeId}
        />
      ),
    },
    {
      id: 'Performance',
      label: 'Performance',
      render: () => <PerformanceSection employeeId={employeeId} />,
    },
    {
      id: 'Assets',
      label: 'Assets',
      render: () => <AssetsSection asset_assignments={asset_assignments} />,
    },
    {
      id: 'Contracts',
      label: 'Contracts',
      render: () => <ContractsSection contracts={contracts} />,
    },
    {
      id: 'Documents',
      label: 'Documents',
      render: () => (
        <DocumentsSection
          docs={docs} docTypes={docTypes} showAddDoc={showAddDoc} setShowAddDoc={setShowAddDoc}
          newDoc={newDoc} setNewDoc={setNewDoc} createDoc={createDoc} updateDoc={updateDoc} deleteDoc={deleteDoc} handleAddDoc={handleAddDoc}
        />
      ),
    },
    {
      id: 'Monitoring',
      label: 'Monitoring',
      render: () => <MonitoringSection employeeId={employeeId} />,
    },
    {
      id: 'Tickets',
      label: 'Tickets',
      render: () => <TicketsSection employeeId={employeeId} />,
    },
    {
      id: 'Approvals',
      label: 'Approvals',
      render: () => <ApprovalsSection employeeId={employeeId} />,
    },
    {
      id: 'Activity Timeline',
      label: 'Activity Timeline',
      render: () => <ActivityTimelineSection employeeId={employeeId} />,
    },
    {
      id: 'Notes',
      label: 'Notes',
      render: () => <NotesSection employeeId={employeeId} />,
    },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeTab) ?? tabs[0];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-gray-900">Employee Profile</h1>
      </div>

      {/* Hero Card */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-[#005CDA] text-white flex items-center justify-center text-2xl font-black shrink-0">
          {user.avatar
            ? <img src={user.avatar} className="h-full w-full rounded-2xl object-cover" />
            : initials.toUpperCase() || <User size={28} />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-gray-900">{name}</h2>
          <p className="text-sm text-gray-500 font-medium">{user.designation || user.position || '—'} · {user.department?.name || '—'}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={cn('border text-xs font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[user.status] || STATUS_COLORS.INACTIVE)}>
              {EMPLOYMENT_STATUS_LABELS[user.status] || user.status}
            </Badge>
            {profile?.lifecycle_stage && (
              editingLifecycle ? (
                <SearchableSelect
                  options={Object.entries(LIFECYCLE_LABELS).map(([value, label]) => ({ value, label }))}
                  value={profile.lifecycle_stage}
                  onChange={handleLifecycleStageChange}
                  disabled={isLifecycleStagePending}
                  className="min-w-[160px]"
                />
              ) : (
                <button onClick={() => setEditingLifecycle(true)} title="Click to change lifecycle stage">
                  <Badge className={cn('border text-xs font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80', LIFECYCLE_COLORS[profile.lifecycle_stage] || LIFECYCLE_COLORS.ONBOARDING)}>
                    {LIFECYCLE_LABELS[profile.lifecycle_stage] || profile.lifecycle_stage}
                  </Badge>
                </button>
              )
            )}
            <span className="text-xs text-gray-400 font-medium">{user.email}</span>
            {user.employee_id && <span className="text-xs text-gray-400 font-medium">ID: {user.employee_id}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl gap-1.5" onClick={() => setShowGenerateModal(true)}>
            <FileSignature size={14} />Generate Document
          </Button>
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={handleEditProfile}>
            Update Info
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="w-fit max-w-full">
        <Tabs options={tabs.map(t => ({ label: t.label, value: t.id }))} value={activeTab} onChange={setActiveTab} variant="pills" />
      </div>

      {activeTabConfig.render()}

      {showGenerateModal && (
        <NewDocumentModal
          initialUserId={employeeId}
          initialUserName={name}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={(id) => { toast.success('Document generated'); if (id) navigate(`/admin/documents/${id}`); }}
        />
      )}
    </div>
  );
};

export default EmployeeProfilePage;
