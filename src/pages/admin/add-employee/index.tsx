import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Check, User, Briefcase, MapPin, FileText, ClipboardList, Save, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';

// ── Step indicators ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Personal Info',        icon: User },
  { id: 2, label: 'Employment Details',   icon: Briefcase },
  { id: 3, label: 'Work Information',     icon: MapPin },
  { id: 4, label: 'Documents',            icon: FileText },
  { id: 5, label: 'Review & Save',        icon: ClipboardList },
];

// ── Shared field component ───────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white';
const selectCls = `${inputCls} text-gray-700`;

// ── Initial form state ───────────────────────────────────────────────────────
const initPersonal = {
  first_name: '', last_name: '', email: '', phone: '',
  alternate_phone: '', father_name: '', cnic: '',
  dob: '', gender: '', marital_status: '',
  nationality: '', religion: '', blood_group: '',
  current_address: '', permanent_address: '',
};

const initEmployment = {
  employee_id: '', hire_date: '', confirmation_date: '',
  employment_type: '', employment_status: 'ACTIVE',
  probation_start: '', probation_end: '',
  notice_period_days: '', work_email: '',
  department_id: '', team_id: '', designation: '',
  grade: '', supervisor_id: '',
  base_salary: '', salary_currency: 'PKR', pay_frequency: 'MONTHLY',
  effective_salary_date: '',
};

const initWork = {
  work_location: '', office_branch: '', floor_area: '',
  work_start: '09:00', work_end: '18:00',
  lunch_break_min: '60',
  working_days: ['Mon','Tue','Wed','Thu','Fri'],
  weekend: 'Sat-Sun',
  work_extension: '', work_phone: '',
  is_remote: false,
};

// ── Step 1: Personal Info ────────────────────────────────────────────────────
function StepPersonal({ data, onChange }: any) {
  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-900">Personal Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input className={inputCls} value={data.first_name} onChange={e => onChange('first_name', e.target.value)} placeholder="First name" />
        </Field>
        <Field label="Last Name" required>
          <input className={inputCls} value={data.last_name} onChange={e => onChange('last_name', e.target.value)} placeholder="Last name" />
        </Field>
        <Field label="Email Address" required>
          <input className={inputCls} type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="email@company.com" />
        </Field>
        <Field label="Phone Number">
          <input className={inputCls} value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+92 300 1234567" />
        </Field>
        <Field label="Alternate Phone">
          <input className={inputCls} value={data.alternate_phone} onChange={e => onChange('alternate_phone', e.target.value)} placeholder="+92 300 1234567" />
        </Field>
        <Field label="Father's Name">
          <input className={inputCls} value={data.father_name} onChange={e => onChange('father_name', e.target.value)} placeholder="Father's name" />
        </Field>
        <Field label="CNIC / National ID">
          <input className={inputCls} value={data.cnic} onChange={e => onChange('cnic', e.target.value)} placeholder="XXXXX-XXXXXXX-X" />
        </Field>
        <Field label="Date of Birth">
          <input className={inputCls} type="date" value={data.dob} onChange={e => onChange('dob', e.target.value)} />
        </Field>
        <Field label="Gender">
          <select className={selectCls} value={data.gender} onChange={e => onChange('gender', e.target.value)}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Marital Status">
          <select className={selectCls} value={data.marital_status} onChange={e => onChange('marital_status', e.target.value)}>
            <option value="">Select status</option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="DIVORCED">Divorced</option>
            <option value="WIDOWED">Widowed</option>
          </select>
        </Field>
        <Field label="Nationality">
          <input className={inputCls} value={data.nationality} onChange={e => onChange('nationality', e.target.value)} placeholder="Pakistani" />
        </Field>
        <Field label="Religion">
          <input className={inputCls} value={data.religion} onChange={e => onChange('religion', e.target.value)} placeholder="Religion" />
        </Field>
        <Field label="Blood Group">
          <select className={selectCls} value={data.blood_group} onChange={e => onChange('blood_group', e.target.value)}>
            <option value="">Select</option>
            {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Field label="Current Address">
          <textarea className={`${inputCls} h-20 py-2`} value={data.current_address} onChange={e => onChange('current_address', e.target.value)} placeholder="Current residential address" />
        </Field>
        <Field label="Permanent Address">
          <textarea className={`${inputCls} h-20 py-2`} value={data.permanent_address} onChange={e => onChange('permanent_address', e.target.value)} placeholder="Permanent / home town address" />
        </Field>
      </div>
    </div>
  );
}

// ── Step 2: Employment Details ───────────────────────────────────────────────
function StepEmployment({ data, onChange, departments, teams, users }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Employment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee ID">
            <input className={inputCls} value={data.employee_id} onChange={e => onChange('employee_id', e.target.value)} placeholder="EMP-0001" />
          </Field>
          <Field label="Joining Date" required>
            <input className={inputCls} type="date" value={data.hire_date} onChange={e => onChange('hire_date', e.target.value)} />
          </Field>
          <Field label="Confirmation Date">
            <input className={inputCls} type="date" value={data.confirmation_date} onChange={e => onChange('confirmation_date', e.target.value)} />
          </Field>
          <Field label="Employment Type">
            <select className={selectCls} value={data.employment_type} onChange={e => onChange('employment_type', e.target.value)}>
              <option value="">Select type</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </Field>
          <Field label="Employment Status">
            <select className={selectCls} value={data.employment_status} onChange={e => onChange('employment_status', e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="NOTICE">Notice Period</option>
            </select>
          </Field>
          <Field label="Notice Period (days)">
            <input className={inputCls} type="number" value={data.notice_period_days} onChange={e => onChange('notice_period_days', e.target.value)} placeholder="30" />
          </Field>
          <Field label="Probation Start">
            <input className={inputCls} type="date" value={data.probation_start} onChange={e => onChange('probation_start', e.target.value)} />
          </Field>
          <Field label="Probation End">
            <input className={inputCls} type="date" value={data.probation_end} onChange={e => onChange('probation_end', e.target.value)} />
          </Field>
          <Field label="Work Email">
            <input className={inputCls} type="email" value={data.work_email} onChange={e => onChange('work_email', e.target.value)} placeholder="work@company.com" />
          </Field>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Organization Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <select className={selectCls} value={data.department_id} onChange={e => onChange('department_id', e.target.value)}>
              <option value="">Select department</option>
              {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Team">
            <select className={selectCls} value={data.team_id} onChange={e => onChange('team_id', e.target.value)}>
              <option value="">Select team</option>
              {(teams || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Designation" required>
            <input className={inputCls} value={data.designation} onChange={e => onChange('designation', e.target.value)} placeholder="Software Engineer" />
          </Field>
          <Field label="Grade">
            <input className={inputCls} value={data.grade} onChange={e => onChange('grade', e.target.value)} placeholder="L2, Senior, etc." />
          </Field>
          <Field label="Reporting Manager">
            <select className={selectCls} value={data.supervisor_id} onChange={e => onChange('supervisor_id', e.target.value)}>
              <option value="">Select manager</option>
              {(users || []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {u.designation || u.position || 'Staff'}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Compensation</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Basic Salary">
            <input className={inputCls} type="number" value={data.base_salary} onChange={e => onChange('base_salary', e.target.value)} placeholder="50000" />
          </Field>
          <Field label="Currency">
            <select className={selectCls} value={data.salary_currency} onChange={e => onChange('salary_currency', e.target.value)}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="GBP">GBP</option>
            </select>
          </Field>
          <Field label="Pay Frequency">
            <select className={selectCls} value={data.pay_frequency} onChange={e => onChange('pay_frequency', e.target.value)}>
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
            </select>
          </Field>
          <Field label="Effective From">
            <input className={inputCls} type="date" value={data.effective_salary_date} onChange={e => onChange('effective_salary_date', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Work Information ─────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function StepWork({ data, onChange }: any) {
  const toggleDay = (day: string) => {
    const days = data.working_days || [];
    onChange('working_days', days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day]);
  };

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-900">Work Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Work Location">
          <input className={inputCls} value={data.work_location} onChange={e => onChange('work_location', e.target.value)} placeholder="Head Office, Remote…" />
        </Field>
        <Field label="Office Branch">
          <input className={inputCls} value={data.office_branch} onChange={e => onChange('office_branch', e.target.value)} placeholder="Karachi, Lahore…" />
        </Field>
        <Field label="Floor / Area">
          <input className={inputCls} value={data.floor_area} onChange={e => onChange('floor_area', e.target.value)} placeholder="3rd Floor, Block A" />
        </Field>
        <Field label="Weekend">
          <input className={inputCls} value={data.weekend} onChange={e => onChange('weekend', e.target.value)} placeholder="Sat-Sun" />
        </Field>
        <Field label="Work Start Time">
          <input className={inputCls} type="time" value={data.work_start} onChange={e => onChange('work_start', e.target.value)} />
        </Field>
        <Field label="Work End Time">
          <input className={inputCls} type="time" value={data.work_end} onChange={e => onChange('work_end', e.target.value)} />
        </Field>
        <Field label="Lunch Break (minutes)">
          <input className={inputCls} type="number" value={data.lunch_break_min} onChange={e => onChange('lunch_break_min', e.target.value)} placeholder="60" />
        </Field>
        <Field label="Work Extension">
          <input className={inputCls} value={data.work_extension} onChange={e => onChange('work_extension', e.target.value)} placeholder="Ext. 201" />
        </Field>
        <Field label="Work Phone">
          <input className={inputCls} value={data.work_phone} onChange={e => onChange('work_phone', e.target.value)} placeholder="+92 21 1234567" />
        </Field>
      </div>

      <Field label="Working Days">
        <div className="flex gap-2 flex-wrap mt-1">
          {DAYS_OF_WEEK.map(day => (
            <button key={day} type="button"
              onClick={() => toggleDay(day)}
              className={cn('h-9 w-14 rounded-lg border text-sm font-semibold transition-colors',
                (data.working_days || []).includes(day)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}>
              {day}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Remote Work">
        <label className="flex items-center gap-3 cursor-pointer mt-1">
          <div
            onClick={() => onChange('is_remote', !data.is_remote)}
            className={cn('w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0',
              data.is_remote ? 'bg-primary-600' : 'bg-gray-200')}
          >
            <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
              data.is_remote ? 'left-6' : 'left-1')} />
          </div>
          <span className="text-sm text-gray-700">{data.is_remote ? 'Remote worker' : 'On-site'}</span>
        </label>
      </Field>
    </div>
  );
}

// ── Step 4: Documents ────────────────────────────────────────────────────────
const DOC_TABS = ['Identity', 'Education', 'Employment', 'Agreements & Others'];

function StepDocuments() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900">Documents</h3>
      <div className="flex gap-1 border-b border-gray-100 pb-0">
        {DOC_TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={cn('px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors',
              activeTab === i ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700')}>
            {t}
          </button>
        ))}
      </div>
      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center py-12">
        <FileText size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400 font-semibold">{DOC_TABS[activeTab]} documents can be uploaded after saving the employee profile.</p>
        <p className="text-xs text-gray-300 mt-1">Supported formats: PDF, JPG, PNG — max 10 MB per file</p>
      </div>
    </div>
  );
}

// ── Step 5: Review & Save ────────────────────────────────────────────────────
function StepReview({ personal, employment, work }: any) {
  const sections = [
    { label: 'Personal Information', data: {
      'Name': `${personal.first_name} ${personal.last_name}`,
      'Email': personal.email || '—', 'Phone': personal.phone || '—',
      'CNIC': personal.cnic || '—', 'DOB': personal.dob || '—',
      'Gender': personal.gender || '—', 'Blood Group': personal.blood_group || '—',
    }},
    { label: 'Employment Details', data: {
      'Employee ID': employment.employee_id || '—',
      'Join Date': employment.hire_date || '—',
      'Type': employment.employment_type || '—',
      'Status': employment.employment_status || '—',
      'Designation': employment.designation || '—',
      'Basic Salary': employment.base_salary ? `${employment.salary_currency} ${Number(employment.base_salary).toLocaleString()}` : '—',
    }},
    { label: 'Work Information', data: {
      'Location': work.work_location || '—', 'Branch': work.office_branch || '—',
      'Work Hours': `${work.work_start} – ${work.work_end}`,
      'Working Days': (work.working_days || []).join(', ') || '—',
      'Remote': work.is_remote ? 'Yes' : 'No',
    }},
  ];

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-900">Review & Confirm</h3>
      <p className="text-sm text-gray-400">Please review all information before saving.</p>
      {sections.map(s => (
        <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">{s.label}</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {Object.entries(s.data).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2">
                <span className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</span>
                <span className="text-xs font-semibold text-gray-800 break-all">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddEmployee() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [personal, setPersonal]     = useState(initPersonal);
  const [employment, setEmployment] = useState(initEmployment);
  const [work, setWork]             = useState(initWork);

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.DEPARTMENT.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TEAM.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: async (as_draft: boolean) => {
      // 1. Create user account
      const userRes: any = await apiRequest<any>(API_ENDPOINTS.USER.CREATE, {
        method: 'POST',
        body: JSON.stringify({
          first_name:    personal.first_name,
          last_name:     personal.last_name,
          email:         personal.email,
          phone:         personal.phone || undefined,
          employee_id:   employment.employee_id || undefined,
          hire_date:     employment.hire_date || undefined,
          designation:   employment.designation || undefined,
          department_id: employment.department_id || undefined,
          supervisor_id: employment.supervisor_id || undefined,
          business_unit: 'ERP',
        }),
      });
      const userId = userRes?.payload?.id || userRes?.id;
      if (!userId) throw new Error('Failed to create user');

      // 1b. Assign to team if selected
      if (employment.team_id) {
        await apiRequest<any>(API_ENDPOINTS.USER.UPDATE(userId), {
          method: 'PUT',
          body: JSON.stringify({ team_id: employment.team_id }),
        });
      }

      // 2. Save HR profile
      await apiRequest<any>(API_ENDPOINTS.HR_PROFILE.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({
          profile_status: as_draft ? 'DRAFT' : 'ACTIVE',
          personal_email:    personal.email,
          cnic:              personal.cnic,
          dob:               personal.dob || undefined,
          gender:            personal.gender,
          marital_status:    personal.marital_status,
          father_name:       personal.father_name,
          alternate_phone:   personal.alternate_phone,
          nationality:       personal.nationality,
          religion:          personal.religion,
          blood_group:       personal.blood_group,
          current_address:   personal.current_address,
          permanent_address: personal.permanent_address,
          employment_type:   employment.employment_type,
          employment_status: employment.employment_status,
          grade:             employment.grade,
          probation_start:   employment.probation_start || undefined,
          probation_end:     employment.probation_end   || undefined,
          confirmation_date: employment.confirmation_date || undefined,
          notice_period_days: employment.notice_period_days ? +employment.notice_period_days : undefined,
          base_salary:       employment.base_salary ? +employment.base_salary : undefined,
          salary_currency:   employment.salary_currency,
          pay_frequency:     employment.pay_frequency,
          effective_salary_date: employment.effective_salary_date || undefined,
          work_location:     work.work_location,
          office_branch:     work.office_branch,
          floor_area:        work.floor_area,
          work_start:        work.work_start,
          work_end:          work.work_end,
          lunch_break_min:   work.lunch_break_min ? +work.lunch_break_min : undefined,
          working_days:      work.working_days,
          weekend:           work.weekend,
          work_extension:    work.work_extension,
          work_phone:        work.work_phone,
          is_remote:         work.is_remote,
        }),
      });

      return userId;
    },
    onSuccess: (userId: string) => {
      qc.invalidateQueries({ queryKey: ['employee-directory'] });
      navigate(`/hr/employees`);
    },
  });

  const changePersonal    = (k: string, v: any) => setPersonal(p => ({ ...p, [k]: v }));
  const changeEmployment  = (k: string, v: any) => setEmployment(p => ({ ...p, [k]: v }));
  const changeWork        = (k: string, v: any) => setWork(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 1) return personal.first_name && personal.last_name && personal.email;
    if (step === 2) return !!employment.hire_date;
    return true;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Add New Employee</h1>
          <p className="text-sm text-gray-400 mt-0.5">Complete the wizard to create a new employee profile</p>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left: Step list */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1">
            {STEPS.map(s => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button key={s.id} onClick={() => done && setStep(s.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors',
                    active ? 'bg-primary-50' : done ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default')}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0',
                    done ? 'bg-green-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400')}>
                    {done ? <Check size={14} /> : s.id}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', active ? 'text-primary-700' : done ? 'text-gray-700' : 'text-gray-400')}>
                      {s.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Step content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {step === 1 && <StepPersonal data={personal} onChange={changePersonal} />}
            {step === 2 && <StepEmployment data={employment} onChange={changeEmployment} departments={departments} teams={teams} users={users} />}
            {step === 3 && <StepWork data={work} onChange={changeWork} />}
            {step === 4 && <StepDocuments />}
            {step === 5 && <StepReview personal={personal} employment={employment} work={work} />}

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button disabled={step === 1} onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />Previous
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => createMutation.mutate(true)}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">
                  <Save size={16} />Save as Draft
                </button>
                {step < 5 ? (
                  <button disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-2 px-5 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors">
                    Next<ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => createMutation.mutate(false)}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-5 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
                    <Check size={16} />{createMutation.isPending ? 'Saving…' : 'Save Employee'}
                  </button>
                )}
              </div>
            </div>

            {createMutation.isError && (
              <p className="text-red-500 text-sm mt-3 text-center">
                {(createMutation.error as Error)?.message || 'Failed to save employee. Please try again.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
