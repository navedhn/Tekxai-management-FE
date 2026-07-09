import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, DollarSign, FileText, Clock, Plus, Trash2, Save } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetEmployeeFullRecord, useUpsertHRProfile, useUpdateUserOrg,
  useGetEmployeeDocs, useGetDocTypes, useCreateEmployeeDoc, useDeleteEmployeeDoc,
} from '@/services/hrService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetGradesQuery } from '@/services/gradeService';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useQuery } from '@tanstack/react-query';

const TABS = ['Overview', 'Employment', 'Compensation', 'Documents', 'History'];

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800">{value || '—'}</p>
  </div>
);

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-100',
  INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
  PROBATION: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  RESIGNED: 'bg-orange-50 text-orange-700 border-orange-100',
  TERMINATED: 'bg-red-50 text-red-700 border-red-100',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  CNIC: 'bg-blue-50 text-blue-700',
  RESUME: 'bg-purple-50 text-purple-700',
  CONTRACT: 'bg-green-50 text-green-700',
  OFFER_LETTER: 'bg-teal-50 text-teal-700',
  NDA: 'bg-pink-50 text-pink-700',
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

const EmployeeProfilePage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const [hrForm, setHrForm] = useState<any>({});
  const [hrEditing, setHrEditing] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', document_type: 'OTHER', file_url: '', notes: '' });
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [orgEditing, setOrgEditing] = useState(false);
  const [orgForm, setOrgForm] = useState<{ designation_id: string; grade_id: string; supervisor_id: string }>({ designation_id: '', grade_id: '', supervisor_id: '' });

  const { data: record, isLoading } = useGetEmployeeFullRecord(employeeId);
  const { data: docs = [] } = useGetEmployeeDocs(employeeId);
  const { data: docTypes = [] } = useGetDocTypes();
  const upsertProfile = useUpsertHRProfile(employeeId!);
  const createDoc = useCreateEmployeeDoc(employeeId!);
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

  const { user, profile, contracts, onboarding_tasks, leave_balances, performance_scores, asset_assignments, policy_acknowledgements } = record;
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');

  const handleEditProfile = () => {
    setHrForm({ ...profile });
    setHrEditing(true);
    setActiveTab('Employment');
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

  const handleAddDoc = () => {
    if (!newDoc.title) { toast.error('Title is required'); return; }
    createDoc.mutate(newDoc, {
      onSuccess: () => { toast.success('Document added'); setShowAddDoc(false); setNewDoc({ title: '', document_type: 'OTHER', file_url: '', notes: '' }); },
      onError: (e: any) => toast.error(e?.message || 'Failed'),
    });
  };

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
              {user.status}
            </Badge>
            <span className="text-xs text-gray-400 font-medium">{user.email}</span>
            {user.employee_id && <span className="text-xs text-gray-400 font-medium">ID: {user.employee_id}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={handleEditProfile}>
            Edit HR Info
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="w-fit">
        <Tabs options={TABS} value={activeTab} onChange={setActiveTab} variant="pills" />
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><User size={16} />Basic Information</h3>
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
            <h3 className="text-base font-black text-gray-900 mb-4">Address & Emergency Contact</h3>
            <div className="grid grid-cols-1 gap-4">
              <InfoRow label="Current Address" value={profile?.current_address} />
              <InfoRow label="Permanent Address" value={profile?.permanent_address} />
              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Name" value={profile?.emergency_contact_name} />
                  <InfoRow label="Relation" value={profile?.emergency_contact_relation} />
                  <InfoRow label="Phone" value={profile?.emergency_contact_phone} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Hire Date" value={user.hire_date ? new Date(user.hire_date).toLocaleDateString() : null} />
              <InfoRow label="Role" value={user.role_name?.replace(/_/g, ' ')} />
              <InfoRow label="Division" value={user.division?.name} />
              <InfoRow label="Team" value={user.team_memberships?.[0]?.team?.name} />
              <InfoRow label="Onboarding" value={`${onboarding_tasks?.filter((t: any) => t.is_completed).length || 0} / ${onboarding_tasks?.length || 0} tasks done`} />
              <InfoRow label="Assets Assigned" value={String(asset_assignments?.filter((a: any) => a.is_active).length || 0)} />
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4">Leave Balances</h3>
            {leave_balances?.length > 0 ? (
              <div className="space-y-3">
                {leave_balances.map((lb: any) => (
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
        </div>
      )}

      {/* ── Employment Tab ── */}
      {activeTab === 'Employment' && (
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
                <Select
                  label="Designation"
                  options={[{ label: 'None', value: '' }, ...(designations || []).map((d: any) => ({ label: d.name, value: d.id }))]}
                  value={orgForm.designation_id}
                  onChange={v => setOrgForm(p => ({ ...p, designation_id: String(v) }))}
                  className="h-10 !rounded-xl"
                />
                <Select
                  label="Grade"
                  options={[{ label: 'None', value: '' }, ...(grades || []).map((g: any) => ({ label: g.name, value: g.id }))]}
                  value={orgForm.grade_id}
                  onChange={v => setOrgForm(p => ({ ...p, grade_id: String(v) }))}
                  className="h-10 !rounded-xl"
                />
                <Select
                  label="Reporting Manager"
                  options={[{ label: 'None', value: '' }, ...(managers || []).filter((m: any) => m.id !== employeeId).map((m: any) => ({ label: `${m.first_name} ${m.last_name}`, value: m.id }))]}
                  value={orgForm.supervisor_id}
                  onChange={v => setOrgForm(p => ({ ...p, supervisor_id: String(v) }))}
                  className="h-10 !rounded-xl"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Designation" value={user.designation_ref?.name || user.designation} />
                <InfoRow label="Grade" value={user.grade?.name} />
                <InfoRow label="Department" value={user.department?.name} />
                <InfoRow label="Reporting Manager" value={user.supervisor ? `${user.supervisor.first_name} ${user.supervisor.last_name}` : null} />
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Briefcase size={16} />Employment Details</h3>
            {hrEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <Select label="Employment Type" options={EMPLOYMENT_TYPES} value={hrForm.employment_type || ''} onChange={v => setHrForm((p: any) => ({ ...p, employment_type: v }))} placeholder="Select" className="h-10 !rounded-xl" />
                <Select label="Work Mode" options={WORK_MODES} value={hrForm.work_mode || ''} onChange={v => setHrForm((p: any) => ({ ...p, work_mode: v }))} placeholder="Select" className="h-10 !rounded-xl" />
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
                <Select label="Probation Status" options={PROBATION_STATUSES} value={hrForm.probation_status || ''} onChange={v => setHrForm((p: any) => ({ ...p, probation_status: v }))} placeholder="Select" className="h-10 !rounded-xl" />
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
            <h3 className="text-base font-black text-gray-900 mb-4">Contracts</h3>
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
            )) : <p className="text-sm text-gray-400">No contracts found</p>}
          </Card>

          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4">Onboarding Checklist</h3>
            {onboarding_tasks?.length > 0 ? (
              <div className="space-y-2">
                {onboarding_tasks.map((t: any) => (
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
      )}

      {/* ── Compensation Tab ── */}
      {activeTab === 'Compensation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><DollarSign size={16} />Salary Information</h3>
            {hrEditing ? (
              <div className="grid grid-cols-2 gap-3">
                <Select label="Currency" options={[{ value: 'PKR', label: 'PKR' }, { value: 'USD', label: 'USD' }]} value={hrForm.salary_currency || 'PKR'} onChange={v => setHrForm((p: any) => ({ ...p, salary_currency: v }))} className="h-10 !rounded-xl" />
                <Input label="Base Salary" type="number" value={hrForm.base_salary || ''} onChange={e => setHrForm((p: any) => ({ ...p, base_salary: e.target.value }))} className="h-10 rounded-xl" />
                <Input label="Gross Salary" type="number" value={hrForm.gross_salary || ''} onChange={e => setHrForm((p: any) => ({ ...p, gross_salary: e.target.value }))} className="h-10 rounded-xl" />
                <Input label="Effective Date" type="date" value={hrForm.effective_salary_date ? hrForm.effective_salary_date.slice(0, 10) : ''} onChange={e => setHrForm((p: any) => ({ ...p, effective_salary_date: e.target.value }))} className="h-10 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Currency" value={profile?.salary_currency} />
                <InfoRow label="Base Salary" value={profile?.base_salary ? `${profile.salary_currency || 'PKR'} ${Number(profile.base_salary).toLocaleString()}` : null} />
                <InfoRow label="Gross Salary" value={profile?.gross_salary ? `${profile.salary_currency || 'PKR'} ${Number(profile.gross_salary).toLocaleString()}` : null} />
                <InfoRow label="Effective From" value={profile?.effective_salary_date ? new Date(profile.effective_salary_date).toLocaleDateString() : null} />
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
            <h3 className="text-base font-black text-gray-900 mb-4">Performance Scores</h3>
            {performance_scores?.length > 0 ? (
              <div className="space-y-3">
                {performance_scores.map((ps: any) => (
                  <div key={ps.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{ps.period}</p>
                      <p className="text-xs text-gray-400">{ps.score_type}</p>
                    </div>
                    <span className="text-lg font-black text-[#005CDA]">{ps.total_score}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No performance scores recorded</p>}
          </Card>
        </div>
      )}

      {/* ── Documents Tab ── */}
      {activeTab === 'Documents' && (
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
                <Input label="Title *" value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Employment Contract 2024" />
                <Select label="Document Type" options={docTypes} value={newDoc.document_type} onChange={v => setNewDoc(p => ({ ...p, document_type: String(v) }))} className="h-10 !rounded-xl" />
                <Input label="File URL (optional)" value={newDoc.file_url} onChange={e => setNewDoc(p => ({ ...p, file_url: e.target.value }))} className="h-10 rounded-xl col-span-2" placeholder="https://..." />
                <Input label="Notes (optional)" value={newDoc.notes} onChange={e => setNewDoc(p => ({ ...p, notes: e.target.value }))} className="h-10 rounded-xl col-span-2" />
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAddDoc(false)}>Cancel</Button>
                <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={createDoc.isPending} onClick={handleAddDoc}>Add</Button>
              </div>
            </Card>
          )}

          {docs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((doc: any) => (
                <Card key={doc.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.OTHER)}>
                      {doc.document_type.replace(/_/g, ' ')}
                    </div>
                    <button onClick={() => deleteDoc.mutate(doc.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{doc.title}</p>
                    {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#005CDA] font-semibold flex items-center gap-1">
                      <FileText size={12} />View File
                    </a>
                  )}
                  <p className="text-[10px] text-gray-300 mt-auto">{new Date(doc.created_at).toLocaleDateString()}</p>
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
      )}

      {/* ── History Tab ── */}
      {activeTab === 'History' && (
        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} />Employee Timeline</h3>
            <div className="relative pl-6 border-l-2 border-gray-100 space-y-6">

              {user.hire_date && (
                <div className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-[#005CDA] border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(user.hire_date).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Joined as {user.designation || user.position || 'Employee'}</p>
                  <p className="text-xs text-gray-500">{user.department?.name}</p>
                </div>
              )}

              {profile?.probation_start && (
                <div className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-yellow-400 border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(profile.probation_start).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Probation Started</p>
                  {profile.probation_end && <p className="text-xs text-gray-500">Ends: {new Date(profile.probation_end).toLocaleDateString()}</p>}
                </div>
              )}

              {profile?.confirmation_date && (
                <div className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(profile.confirmation_date).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Employment Confirmed</p>
                </div>
              )}

              {asset_assignments?.map((a: any) => (
                <div key={a.id} className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-purple-400 border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(a.assigned_at).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Asset Assigned: {a.asset?.name}</p>
                  <p className="text-xs text-gray-500">{a.asset?.category?.name} · {a.is_active ? 'Active' : `Returned ${a.returned_at ? new Date(a.returned_at).toLocaleDateString() : ''}`}</p>
                </div>
              ))}

              {policy_acknowledgements?.map((pa: any) => (
                <div key={pa.id} className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-gray-300 border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(pa.acknowledged_at).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Policy Acknowledged: {pa.policy?.title}</p>
                </div>
              ))}

              {profile?.resignation_date && (
                <div className="relative">
                  <div className="absolute -left-[1.45rem] top-0.5 h-3 w-3 rounded-full bg-orange-400 border-2 border-white" />
                  <p className="text-xs text-gray-400 font-medium">{new Date(profile.resignation_date).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-800">Resignation</p>
                </div>
              )}

              {!user.hire_date && !profile && (
                <p className="text-sm text-gray-400 pl-4">No timeline events yet. Update the employee profile to start tracking.</p>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-black text-gray-900 mb-4">Assigned Assets</h3>
            {asset_assignments?.length > 0 ? (
              <div className="space-y-2">
                {asset_assignments.map((a: any) => (
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
            ) : <p className="text-sm text-gray-400">No assets assigned</p>}
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfilePage;
