import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Check, User, Briefcase, MapPin, FileText, ClipboardList, Save, X, Plus, Trash2, RotateCcw, Upload, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { uploadFile } from '@/lib/upload';
import { cn } from '@/utils/cn';
import { EMPLOYMENT_STATUS_OPTIONS, EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';

const DRAFT_KEY = 'add_employee_draft';

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
const errorInputCls = 'border-red-400 focus:border-red-500 ring-1 ring-red-200';

// Generic backend-validation-error routing: maps a field name (as returned
// by the backend's field_error() contract, e.g. { field: 'email', code:
// 'DUPLICATE_EMAIL' }) to the wizard step that owns it, so ANY validation
// error — not just duplicate email — auto-navigates + highlights correctly.
const FIELD_STEP_MAP: Record<string, number> = {
  first_name: 1, last_name: 1, email: 1,
  hire_date: 2, designation_id: 2, employment_status: 2, status: 2,
};
const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE_EMAIL: 'This email is already in use — please use a different address.',
};

function FieldError({ show, message }: { show: boolean; message?: string | null }) {
  if (!show || !message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

// ── CNIC formatter ────────────────────────────────────────────────────────────
function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

// ── Phone country codes ───────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+92', flag: '🇵🇰', label: 'PK +92', format: (d: string) => d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3, 10)}` : d },
  { code: '+1',  flag: '🇺🇸', label: 'US +1',  format: (d: string) => d.length > 6 ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}` : d },
  { code: '+44', flag: '🇬🇧', label: 'UK +44', format: (d: string) => d },
  { code: '+971',flag: '🇦🇪', label: 'AE +971',format: (d: string) => d },
];

function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [selectedCode, setSelectedCode] = useState('+92');
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (!value) { setLocalNumber(''); return; }
    for (const cc of COUNTRY_CODES) {
      if (value.startsWith(cc.code)) {
        setSelectedCode(cc.code);
        setLocalNumber(value.slice(cc.code.length).replace(/\D/g, ''));
        return;
      }
    }
    setLocalNumber(value.replace(/\D/g, ''));
  }, []);

  const handleLocal = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setLocalNumber(digits);
    const cc = COUNTRY_CODES.find(c => c.code === selectedCode)!;
    onChange(`${selectedCode}${digits}`);
    return cc.format(digits);
  };

  const cc = COUNTRY_CODES.find(c => c.code === selectedCode)!;
  const displayed = cc.format(localNumber);

  return (
    <div className="flex gap-2">
      <select
        value={selectedCode}
        onChange={e => { setSelectedCode(e.target.value); onChange(`${e.target.value}${localNumber}`); }}
        className="h-10 px-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white text-gray-700 w-28 flex-shrink-0"
      >
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input
        className={inputCls}
        value={displayed}
        onChange={e => handleLocal(e.target.value)}
        placeholder={selectedCode === '+92' ? '300 1234567' : 'Phone number'}
        inputMode="numeric"
      />
    </div>
  );
}

// ── Pakistani cities ─────────────────────────────────────────────────────────
const PK_CITIES = [
  'Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan',
  'Hyderabad','Peshawar','Quetta','Sialkot','Gujranwala','Bahawalpur',
  'Sargodha','Sukkur','Larkana','Sheikhupura','Abbottabad','Mardan',
  'Gujrat','Kasur','Rahim Yar Khan','Sahiwal','Okara','Mirpur','Muzaffarabad',
  'Remote','Other',
];

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
  notice_period_days: '30', work_email: '',
  department_id: '', team_id: '', designation: '', designation_id: '',
  grade: '', grade_id: '', supervisor_id: '',
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
function StepPersonal({ data, onChange, errorField, errorMessage, registerRef }: any) {
  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-900">Personal Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input
            ref={(el) => registerRef?.('first_name', el)}
            className={cn(inputCls, errorField === 'first_name' && errorInputCls)}
            value={data.first_name}
            onChange={e => onChange('first_name', e.target.value)}
            placeholder="First name"
          />
          <FieldError show={errorField === 'first_name'} message={errorMessage} />
        </Field>
        <Field label="Last Name" required>
          <input
            ref={(el) => registerRef?.('last_name', el)}
            className={cn(inputCls, errorField === 'last_name' && errorInputCls)}
            value={data.last_name}
            onChange={e => onChange('last_name', e.target.value)}
            placeholder="Last name"
          />
          <FieldError show={errorField === 'last_name'} message={errorMessage} />
        </Field>
        <Field label="Email Address" required>
          <input
            ref={(el) => registerRef?.('email', el)}
            className={cn(inputCls, errorField === 'email' && errorInputCls)}
            type="email"
            value={data.email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="email@company.com"
          />
          <FieldError show={errorField === 'email'} message={errorMessage} />
        </Field>
        <Field label="Phone Number">
          <PhoneInput value={data.phone} onChange={v => onChange('phone', v)} />
        </Field>
        <Field label="Alternate Phone">
          <PhoneInput value={data.alternate_phone} onChange={v => onChange('alternate_phone', v)} />
        </Field>
        <Field label="Father's Name">
          <input className={inputCls} value={data.father_name} onChange={e => onChange('father_name', e.target.value)} placeholder="Father's name" />
        </Field>
        <Field label="CNIC / National ID">
          <input
            className={inputCls}
            value={data.cnic}
            onChange={e => onChange('cnic', formatCnic(e.target.value))}
            placeholder="12345-1234567-5"
            maxLength={15}
            inputMode="numeric"
          />
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
function StepEmployment({ data, onChange, departments, teams, users, designations, grades, errorField, errorMessage, registerRef }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Employment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee ID">
            <input
              className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed select-all`}
              value={data.employee_id || 'Generating…'}
              readOnly
              tabIndex={-1}
            />
          </Field>
          <Field label="Joining Date" required>
            <input
              ref={(el) => registerRef?.('hire_date', el)}
              className={cn(inputCls, errorField === 'hire_date' && errorInputCls)}
              type="date"
              value={data.hire_date}
              onChange={e => onChange('hire_date', e.target.value)}
            />
            <FieldError show={errorField === 'hire_date'} message={errorMessage} />
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
            <select
              ref={(el) => registerRef?.('employment_status', el)}
              className={cn(selectCls, (errorField === 'employment_status' || errorField === 'status') && errorInputCls)}
              value={data.employment_status}
              onChange={e => onChange('employment_status', e.target.value)}
            >
              {EMPLOYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <FieldError show={errorField === 'employment_status' || errorField === 'status'} message={errorMessage} />
          </Field>
          <Field label="Notice Period">
            <div className="flex items-center h-10 px-3 border border-gray-100 rounded-xl bg-gray-50 text-sm text-gray-500 font-semibold select-none">
              30 days (fixed policy)
            </div>
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
            <select
              ref={(el) => registerRef?.('designation_id', el)}
              className={cn(selectCls, errorField === 'designation_id' && errorInputCls)}
              value={data.designation_id}
              onChange={e => {
                const chosen = (designations || []).find((d: any) => d.id === e.target.value);
                onChange('designation_id', e.target.value);
                onChange('designation', chosen?.name || '');
              }}
            >
              <option value="">Select designation</option>
              {(designations || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <FieldError show={errorField === 'designation_id'} message={errorMessage} />
          </Field>
          <Field label="Grade">
            <select
              className={selectCls}
              value={data.grade_id}
              onChange={e => {
                const chosen = (grades || []).find((g: any) => g.id === e.target.value);
                onChange('grade_id', e.target.value);
                onChange('grade', chosen?.name || '');
              }}
            >
              <option value="">Select grade</option>
              {(grades || []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
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
            <input
              className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              inputMode="numeric"
              value={data.base_salary}
              onChange={e => onChange('base_salary', e.target.value.replace(/\D/g, ''))}
              placeholder="50000"
            />
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
        <Field label="Office Branch (City)">
          <select className={selectCls} value={data.office_branch} onChange={e => onChange('office_branch', e.target.value)}>
            <option value="">Select city</option>
            {PK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
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
          <input
            className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            inputMode="numeric"
            value={data.lunch_break_min}
            onChange={e => onChange('lunch_break_min', e.target.value.replace(/\D/g, ''))}
            placeholder="60"
          />
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
// CNIC is split into two explicit, required document types (front/back) —
// the old generic single 'CNIC' catch-all is removed so a submission can
// never be missing one side of the ID.
const CNIC_DOC_TYPES = ['CNIC_FRONT', 'CNIC_BACK'];

const DOC_TYPE_OPTIONS = [
  { value: 'CNIC_FRONT',         label: 'CNIC Front' },
  { value: 'CNIC_BACK',          label: 'CNIC Back' },
  { value: 'RESUME',             label: 'Resume / CV' },
  { value: 'OFFER_LETTER',       label: 'Offer Letter' },
  { value: 'CONTRACT',           label: 'Contract' },
  { value: 'NDA',                label: 'NDA' },
  { value: 'EDUCATIONAL',        label: 'Educational Certificate' },
  { value: 'EXPERIENCE_LETTER',  label: 'Experience Letter' },
  { value: 'SALARY_REVISION',    label: 'Salary Revision' },
  { value: 'WARNING_LETTER',     label: 'Warning Letter' },
  { value: 'RESIGNATION',        label: 'Resignation Letter' },
  { value: 'CLEARANCE',          label: 'Clearance' },
  { value: 'OTHER',              label: 'Other' },
];

interface DocFile { title: string; document_type: string; file_url: string; notes: string; }

const EMPTY_DOC: DocFile = { title: '', document_type: 'OTHER', file_url: '', notes: '' };

// Required upload validation: both CNIC sides must be present (uploaded file
// or pasted link) before the wizard can proceed past the Documents step.
export function missingRequiredDocs(docFiles: DocFile[]): string[] {
  return CNIC_DOC_TYPES.filter(
    type => !docFiles.some(d => d.document_type === type && d.file_url.trim())
  ).map(type => DOC_TYPE_OPTIONS.find(o => o.value === type)?.label || type);
}

function StepDocuments({ docFiles, setDocFiles }: { docFiles: DocFile[]; setDocFiles: React.Dispatch<React.SetStateAction<DocFile[]>> }) {
  const missing = missingRequiredDocs(docFiles);
  const [uploading, setUploading] = React.useState<Record<number, boolean>>({});
  const addRow = () => setDocFiles(prev => [...prev, { ...EMPTY_DOC }]);
  const removeRow = (idx: number) => setDocFiles(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, key: keyof DocFile, val: string) =>
    setDocFiles(prev => prev.map((d, i) => i === idx ? { ...d, [key]: val } : d));

  const handleFileUpload = async (idx: number, file: File) => {
    setUploading(p => ({ ...p, [idx]: true }));
    try {
      const { file_url } = await uploadFile(file);
      updateRow(idx, 'file_url', file_url);
      if (!docFiles[idx].title) updateRow(idx, 'title', file.name.replace(/\.[^.]+$/, ''));
    } catch (e) { console.error('Upload failed', e); }
    setUploading(p => ({ ...p, [idx]: false }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-gray-900">Documents</h3>
        <p className="text-xs text-gray-400 mt-0.5">Upload files directly or paste a Google Drive / OneDrive link.</p>
      </div>

      {missing.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-semibold">
          Required before continuing: {missing.join(', ')}
        </div>
      )}

      {docFiles.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <FileText size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-500">No documents added yet</p>
          <p className="text-xs text-gray-300 mt-1">Click "Add Document" below to upload or link a document</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docFiles.map((doc, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-wide">Document {idx + 1}</span>
                <button onClick={() => removeRow(idx)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Title *</label>
                  <input
                    className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
                    placeholder="e.g. CNIC Front"
                    value={doc.title}
                    onChange={e => updateRow(idx, 'title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Type</label>
                  <select
                    className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
                    value={doc.document_type}
                    onChange={e => updateRow(idx, 'document_type', e.target.value)}
                  >
                    {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Upload File</label>
                <label className={`flex items-center gap-2 w-full h-9 px-3 border border-dashed rounded-xl text-sm cursor-pointer transition-colors ${uploading[idx] ? 'border-primary-300 bg-primary-50 text-primary-500' : 'border-gray-300 hover:border-primary-300 hover:bg-primary-50 text-gray-400 hover:text-primary-500'}`}>
                  <Upload size={14} />
                  <span className="truncate">{uploading[idx] ? 'Uploading…' : 'Choose file to upload'}</span>
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading[idx]}
                    onChange={e => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                  />
                </label>
              </div>

              {/* Or URL */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Or paste a link</label>
                <input
                  className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
                  placeholder="https://drive.google.com/..."
                  value={doc.file_url}
                  onChange={e => updateRow(idx, 'file_url', e.target.value)}
                />
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary-500 hover:underline mt-1 inline-flex items-center gap-1">
                    <ExternalLink size={10} /> Preview file
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Notes (optional)</label>
                <input
                  className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
                  placeholder="Any additional notes"
                  value={doc.notes}
                  onChange={e => updateRow(idx, 'notes', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addRow}
        className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary-300 text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors w-full justify-center"
      >
        <Plus size={15} /> Add Document
      </button>
    </div>
  );
}

// ── Step 5: Review & Save ────────────────────────────────────────────────────
function StepReview({ personal, employment, work }: any) {
  const STATUS_LABELS = EMPLOYMENT_STATUS_LABELS;
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
      'Status': STATUS_LABELS[employment.employment_status] || employment.employment_status || '—',
      'Notice Period': '30 days',
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

function generateEmployeeId(count: number) {
  return `TXI-${String(count + 1).padStart(4, '0')}`;
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddEmployee() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [personal, setPersonal]     = useState(initPersonal);
  const [employment, setEmployment] = useState({ ...initEmployment });
  const [work, setWork]             = useState(initWork);
  const [docFiles, setDocFiles]     = useState<DocFile[]>([] as DocFile[]);
  const [draftBanner, setDraftBanner] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fieldRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const registerRef = (field: string, el: HTMLElement | null) => { fieldRefs.current[field] = el; };

  // ── Draft auto-save / restore ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const { personal: p, employment: e, work: w, step: s } = JSON.parse(saved);
        if (p?.first_name || p?.email) {
          setDraftBanner(true);
          setPersonal(prev => ({ ...prev, ...p }));
          setEmployment(prev => ({ ...prev, ...e }));
          setWork(prev => ({ ...prev, ...w }));
          if (s) setStep(s);
        }
      }
    } catch { /* ignore corrupt draft */ }
  }, []);

  // Save draft to localStorage on every meaningful change
  useEffect(() => {
    if (!personal.first_name && !personal.email) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ personal, employment, work, step }));
    } catch { /* storage full — ignore */ }
  }, [personal, employment, work, step]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftBanner(false);
  };

  const discardDraft = () => {
    clearDraft();
    setPersonal(initPersonal);
    setEmployment({ ...initEmployment });
    setWork(initWork);
    setStep(1);
  };

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

  const { data: designations } = useQuery({
    queryKey: ['designations', employment.department_id || 'all'],
    queryFn: () => apiRequest<any>(
      employment.department_id ? `${API_ENDPOINTS.DESIGNATION.LIST}?department_id=${employment.department_id}` : API_ENDPOINTS.DESIGNATION.LIST
    ),
    select: (r: any) => r?.payload || [],
    staleTime: 300000,
  });

  const { data: grades } = useQuery({
    queryKey: ['grades'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.GRADE.LIST),
    select: (r: any) => r?.payload || [],
    staleTime: 300000,
  });

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: userCount } = useQuery({
    queryKey: ['user-count'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=1`),
    select: (r: any) => r?.payload?.total ?? (r?.payload?.records?.length ?? 0),
    staleTime: 60000,
  });

  React.useEffect(() => {
    if (userCount != null) {
      setEmployment(p => ({ ...p, employee_id: p.employee_id || generateEmployeeId(userCount) }));
    } else {
      // Fallback so field never stays "Generating…" indefinitely
      const timeout = setTimeout(() => {
        setEmployment(p => {
          if (!p.employee_id) return { ...p, employee_id: `TXI-${String(Date.now()).slice(-4)}` };
          return p;
        });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [userCount]);

  const createMutation = useMutation({
    mutationFn: async (as_draft: boolean) => {
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
          designation_id: employment.designation_id || undefined,
          grade_id:      employment.grade_id || undefined,
          department_id: employment.department_id || undefined,
          supervisor_id: employment.supervisor_id || undefined,
          business_unit: 'ERP',
        }),
      });
      const userId = userRes?.payload?.id || userRes?.id;
      if (!userId) throw new Error('Failed to create user');

      if (employment.team_id) {
        await apiRequest<any>(API_ENDPOINTS.USER.UPDATE(userId), {
          method: 'PUT',
          body: JSON.stringify({ team_id: employment.team_id }),
        });
      }

      await apiRequest<any>(API_ENDPOINTS.HR_PROFILE.UPDATE(userId), {
        method: 'PUT',
        body: JSON.stringify({
          profile_status:    as_draft ? 'DRAFT' : 'ACTIVE',
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
          notice_period_days: 30,
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

      const validDocs = docFiles.filter(d => d.title.trim());
      if (validDocs.length > 0) {
        await Promise.allSettled(
          validDocs.map(doc =>
            apiRequest<any>(API_ENDPOINTS.EMPLOYEE_DOC.CREATE(String(userId)), {
              method: 'POST',
              body: JSON.stringify(doc),
            })
          )
        );
      }

      return userId;
    },
    onSuccess: () => {
      clearDraft();
      qc.invalidateQueries({ queryKey: ['employee-directory'] });
      navigate(`/hr/employees`);
    },
    onError: (err: any) => {
      // Generic backend-validation-error routing: the backend's field_error()
      // contract returns { field, code, message } (err.data here, since
      // apiRequest throws { status, data, message }). ANY field the backend
      // names — not just email — auto-navigates to its owning step, highlights
      // the input, focuses it, and shows a message. Entered data is never
      // reset on error. Falls back to the plain message with no navigation
      // for errors the backend didn't attach a field to.
      const field = err?.data?.field;
      const code = err?.data?.code;
      const backendMessage = err?.data?.message || err?.message;
      const step_for_field = field ? FIELD_STEP_MAP[field] : undefined;
      if (field && step_for_field != null) {
        setStep(step_for_field);
        setErrorField(field);
        setErrorMessage(FRIENDLY_ERROR_MESSAGES[code] || backendMessage || 'Please fix the highlighted field and try again.');
        setTimeout(() => (fieldRefs.current[field] as any)?.focus?.(), 0);
      } else {
        setErrorField(null);
        setErrorMessage(backendMessage || 'Failed to save employee. Please try again.');
      }
    },
  });

  const changePersonal = (k: string, v: any) => {
    setPersonal(p => ({ ...p, [k]: v }));
    if (k === errorField) setErrorField(null);
  };
  const changeEmployment = (k: string, v: any) => {
    setEmployment(p => ({ ...p, [k]: v }));
    if (k === errorField || (k === 'employment_status' && errorField === 'status')) setErrorField(null);
  };
  const changeWork        = (k: string, v: any) => setWork(p => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 1) return personal.first_name && personal.last_name && personal.email;
    if (step === 2) return !!employment.hire_date;
    if (step === 4) return missingRequiredDocs(docFiles).length === 0;
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

      {/* Draft restore banner */}
      {draftBanner && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-amber-800">
            <RotateCcw size={15} />
            <span className="text-sm font-semibold">Draft restored — you can continue from where you left off.</span>
          </div>
          <button onClick={discardDraft} className="text-xs text-amber-600 underline font-semibold hover:text-amber-800">
            Discard draft
          </button>
        </div>
      )}

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
            {step === 1 && <StepPersonal data={personal} onChange={changePersonal} errorField={errorField} errorMessage={errorMessage} registerRef={registerRef} />}
            {step === 2 && <StepEmployment data={employment} onChange={changeEmployment} departments={departments} teams={teams} users={users} designations={designations} grades={grades} errorField={errorField} errorMessage={errorMessage} registerRef={registerRef} />}
            {step === 3 && <StepWork data={work} onChange={changeWork} />}
            {step === 4 && <StepDocuments docFiles={docFiles} setDocFiles={setDocFiles} />}
            {step === 5 && <StepReview personal={personal} employment={employment} work={work} />}

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button disabled={step === 1} onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft size={16} />Previous
              </button>
              <div className="flex items-center gap-3">
                {/* DECISION (Milestone 1, gap #5): Save as Draft intentionally
                    bypasses the required-CNIC-documents check (missingRequiredDocs)
                    and is reachable from any step. A draft exists precisely to let
                    HR save incomplete progress and finish later — required-document
                    validation only applies to the final "Save Employee" submission,
                    which can only be reached via Next once step 4 is satisfied. */}
                <button
                  onClick={() => createMutation.mutate(true)}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save size={16} />Save as Draft
                </button>
                {step < 5 ? (
                  <button disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-2 px-5 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    Next<ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => createMutation.mutate(false)}
                    disabled={createMutation.isPending}
                    className="flex items-center gap-2 px-5 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    <Check size={16} />{createMutation.isPending ? 'Saving…' : 'Save Employee'}
                  </button>
                )}
              </div>
            </div>

            {createMutation.isError && (
              <p className="text-red-500 text-sm mt-3 text-center">
                {errorField
                  ? 'Please fix the highlighted field above before saving again.'
                  : (errorMessage || 'Failed to save employee. Please try again.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
