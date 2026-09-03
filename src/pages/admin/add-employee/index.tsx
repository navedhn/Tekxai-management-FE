import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Check, User, Briefcase, MapPin, FileText, ClipboardList, Save, X, Plus, Trash2, RotateCcw, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { uploadFile } from '@/lib/upload';
import { cn } from '@/utils/cn';
import { EMPLOYMENT_STATUS_OPTIONS, EMPLOYMENT_STATUS_LABELS } from '@/constants/employmentStatus';
import { useGetEmployeeFullRecord } from '@/services/hrService';
import { useGetDesignationsQuery } from '@/services/designationService';
import { useGetGradesQuery } from '@/services/gradeService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import SearchableSelect from '@/components/ui/SearchableSelect';

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
      <SearchableSelect
        options={COUNTRY_CODES.map(c => ({ label: c.label, value: c.code }))}
        value={selectedCode}
        onChange={v => { const code = (v as string) ?? selectedCode; setSelectedCode(code); onChange(`${code}${localNumber}`); }}
        clearable={false}
        containerClassName="w-28 flex-shrink-0"
        className="h-10"
      />
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

// ── Banks (Pakistan) ──────────────────────────────────────────────────────────
const BANKS = [
  'Habib Bank Limited (HBL)', 'United Bank Limited (UBL)', 'MCB Bank Limited',
  'Allied Bank Limited', 'Bank Alfalah', 'Meezan Bank', 'Faysal Bank',
  'Standard Chartered Bank Pakistan', 'Bank Al Habib', 'Askari Bank',
  'National Bank of Pakistan', 'JS Bank', 'Soneri Bank', 'Habib Metropolitan Bank',
  'Bank of Punjab', 'Bank of Khyber', 'Dubai Islamic Bank Pakistan',
  'Al Baraka Bank Pakistan', 'MCB Islamic Bank', 'Silkbank', 'Summit Bank', 'Other',
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
  business_unit_id: '', department_id: '', team_id: '', designation: '', designation_id: '',
  grade: '', grade_id: '', supervisor_id: '',
  base_salary: '', salary_currency: 'PKR', pay_frequency: 'MONTHLY',
  effective_salary_date: '', bank_name: '', bank_account_number: '',
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
        {/* No password field here — the full wizard's account is created
            with a system-generated password (backend already supports a
            missing password, see users.service.js's create_new_user) and
            the new hire sets their own via Forgot Password on first login.
            Password entry stays exclusive to Quick Create User, where an
            admin is standing up an account for someone already working and
            handing it to them directly. */}
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
          <SearchableSelect
            className={selectCls}
            options={[
              { label: 'Male', value: 'MALE' },
              { label: 'Female', value: 'FEMALE' },
              { label: 'Other', value: 'OTHER' },
            ]}
            value={data.gender || null}
            onChange={v => onChange('gender', (v as string) ?? '')}
            placeholder="Select gender"
          />
        </Field>
        <Field label="Marital Status">
          <SearchableSelect
            className={selectCls}
            options={[
              { label: 'Single', value: 'SINGLE' },
              { label: 'Married', value: 'MARRIED' },
              { label: 'Divorced', value: 'DIVORCED' },
              { label: 'Widowed', value: 'WIDOWED' },
            ]}
            value={data.marital_status || null}
            onChange={v => onChange('marital_status', (v as string) ?? '')}
            placeholder="Select status"
          />
        </Field>
        <Field label="Nationality">
          <input className={inputCls} value={data.nationality} onChange={e => onChange('nationality', e.target.value)} placeholder="Pakistani" />
        </Field>
        <Field label="Religion">
          <input className={inputCls} value={data.religion} onChange={e => onChange('religion', e.target.value)} placeholder="Religion" />
        </Field>
        <Field label="Blood Group">
          <SearchableSelect
            className={selectCls}
            options={['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg => ({ label: bg, value: bg }))}
            value={data.blood_group || null}
            onChange={v => onChange('blood_group', (v as string) ?? '')}
            placeholder="Select"
          />
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
function StepEmployment({ data, onChange, businessUnits, departments, teams, users, designations, grades, errorField, errorMessage, registerRef, employeeIdPreview, employeeIdPreviewLoading, isEditMode }: any) {
  const employeeIdDisplay = isEditMode
    ? (data.employee_id || 'Assigned at creation')
    : data.department_id
      ? (employeeIdPreviewLoading ? 'Generating…' : (employeeIdPreview || 'Auto-generated on save'))
      : 'Select Business Unit + Department first';
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-gray-900 mb-4">Employment Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee ID">
            <input
              className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed select-all`}
              value={employeeIdDisplay}
              readOnly
              tabIndex={-1}
              title="Derived from Business Unit + Department (Function) — not editable"
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
            <SearchableSelect
              className={selectCls}
              options={[
                { label: 'Full Time', value: 'FULL_TIME' },
                { label: 'Part Time', value: 'PART_TIME' },
                { label: 'Contract', value: 'CONTRACT' },
                { label: 'Intern', value: 'INTERN' },
                { label: 'Freelance', value: 'FREELANCE' },
              ]}
              value={data.employment_type || null}
              onChange={v => onChange('employment_type', (v as string) ?? '')}
              placeholder="Select type"
            />
          </Field>
          <Field label="Employment Status">
            <div ref={(el) => registerRef?.('employment_status', el)}>
              <SearchableSelect
                className={cn(selectCls, (errorField === 'employment_status' || errorField === 'status') && errorInputCls)}
                options={EMPLOYMENT_STATUS_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
                value={data.employment_status}
                onChange={v => onChange('employment_status', (v as string) ?? data.employment_status)}
                clearable={false}
              />
            </div>
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
          <Field label="Business Unit">
            <SearchableSelect
              className={selectCls}
              options={(businessUnits || []).map((bu: any) => ({ label: bu.name, value: bu.id }))}
              value={data.business_unit_id || null}
              onChange={v => {
                onChange('business_unit_id', (v as string) ?? '');
                // Department must belong to the selected Business Unit —
                // the Employee ID prefix is derived from both together, so
                // a stale department from a different unit can't linger.
                onChange('department_id', '');
              }}
              placeholder="Select business unit"
            />
          </Field>
          <Field label="Department (Function)">
            <SearchableSelect
              className={selectCls}
              options={(departments || [])
                .filter((d: any) => (d.business_unit_id || d.business_unit?.id) === data.business_unit_id)
                .map((d: any) => ({ label: d.name, value: d.id }))}
              value={data.department_id || null}
              disabled={!data.business_unit_id}
              onChange={v => onChange('department_id', (v as string) ?? '')}
              placeholder={data.business_unit_id ? 'Select department' : 'Select a business unit first'}
            />
          </Field>
          <Field label="Team">
            <SearchableSelect
              className={selectCls}
              options={(teams || []).map((t: any) => ({ label: t.name, value: t.id }))}
              value={data.team_id || null}
              onChange={v => onChange('team_id', (v as string) ?? '')}
              placeholder="Select team"
            />
          </Field>
          <Field label="Designation" required>
            <div ref={(el) => registerRef?.('designation_id', el)}>
              <SearchableSelect
                className={cn(selectCls, errorField === 'designation_id' && errorInputCls)}
                options={(designations || []).map((d: any) => ({ label: d.name, value: d.id }))}
                value={data.designation_id || null}
                onChange={v => {
                  const chosen = (designations || []).find((d: any) => d.id === v);
                  onChange('designation_id', (v as string) ?? '');
                  onChange('designation', chosen?.name || '');
                }}
                placeholder="Select designation"
              />
            </div>
            <FieldError show={errorField === 'designation_id'} message={errorMessage} />
          </Field>
          <Field label="Grade">
            <SearchableSelect
              className={selectCls}
              options={(grades || []).map((g: any) => ({ label: g.name, value: g.id }))}
              value={data.grade_id || null}
              onChange={v => {
                const chosen = (grades || []).find((g: any) => g.id === v);
                onChange('grade_id', (v as string) ?? '');
                onChange('grade', chosen?.name || '');
              }}
              placeholder="Select grade"
            />
          </Field>
          <Field label="Reporting Manager">
            <SearchableSelect
              className={selectCls}
              options={(users || []).map((u: any) => ({ label: `${u.first_name} ${u.last_name} — ${u.designation || u.position || 'Staff'}`, value: u.id }))}
              value={data.supervisor_id || null}
              onChange={v => onChange('supervisor_id', (v as string) ?? '')}
              placeholder="Select manager"
            />
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
            <SearchableSelect
              className={selectCls}
              options={[
                { label: 'PKR', value: 'PKR' },
                { label: 'USD', value: 'USD' },
                { label: 'AED', value: 'AED' },
                { label: 'GBP', value: 'GBP' },
              ]}
              value={data.salary_currency}
              onChange={v => onChange('salary_currency', (v as string) ?? data.salary_currency)}
              clearable={false}
            />
          </Field>
          <Field label="Pay Frequency">
            <SearchableSelect
              className={selectCls}
              options={[
                { label: 'Monthly', value: 'MONTHLY' },
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Bi-weekly', value: 'BIWEEKLY' },
              ]}
              value={data.pay_frequency}
              onChange={v => onChange('pay_frequency', (v as string) ?? data.pay_frequency)}
              clearable={false}
            />
          </Field>
          <Field label="Effective From">
            <input className={inputCls} type="date" value={data.effective_salary_date} onChange={e => onChange('effective_salary_date', e.target.value)} />
          </Field>
          <Field label="Bank">
            <SearchableSelect
              className={selectCls}
              options={BANKS.map(b => ({ label: b, value: b }))}
              value={data.bank_name || null}
              onChange={v => onChange('bank_name', (v as string) ?? '')}
              placeholder="Select bank"
            />
          </Field>
          <Field label="Bank Account Number">
            <input
              className={inputCls}
              value={data.bank_account_number}
              onChange={e => onChange('bank_account_number', e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
              placeholder="Account / IBAN number"
              disabled={!data.bank_name}
            />
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
          <SearchableSelect
            className={selectCls}
            options={PK_CITIES.map(c => ({ label: c, value: c }))}
            value={data.office_branch || null}
            onChange={v => onChange('office_branch', (v as string) ?? '')}
            placeholder="Select city"
          />
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
// CNIC Front/Back, Police Verification, and Employee Registration were
// previously mandatory before the wizard could proceed — now optional per
// request, so HR can complete onboarding without blocking on these docs.
const REQUIRED_DOC_TYPES: string[] = [];

const DOC_TYPE_OPTIONS = [
  { value: 'CNIC_FRONT',         label: 'CNIC Front' },
  { value: 'CNIC_BACK',          label: 'CNIC Back' },
  { value: 'POLICE_VERIFICATION',    label: 'Police Verification' },
  { value: 'EMPLOYEE_REGISTRATION',  label: 'Employee Registration' },
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
// `existingTypes` (edit mode only) lists document_types already on file from
// a prior session — a required type already present there also satisfies the
// check, so re-editing an employee who already uploaded their CNIC docs
// doesn't get incorrectly blocked just because docFiles (new uploads only)
// is empty.
export function missingRequiredDocs(docFiles: DocFile[], existingTypes: string[] = []): string[] {
  return REQUIRED_DOC_TYPES.filter(
    type => !docFiles.some(d => d.document_type === type && d.file_url.trim()) && !existingTypes.includes(type)
  ).map(type => DOC_TYPE_OPTIONS.find(o => o.value === type)?.label || type);
}

function StepDocuments({ docFiles, setDocFiles, existingTypes = [] }: { docFiles: DocFile[]; setDocFiles: React.Dispatch<React.SetStateAction<DocFile[]>>; existingTypes?: string[] }) {
  const missing = missingRequiredDocs(docFiles, existingTypes);
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
                  <SearchableSelect
                    className="h-9"
                    options={DOC_TYPE_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
                    value={doc.document_type}
                    onChange={v => updateRow(idx, 'document_type', (v as string) ?? doc.document_type)}
                    clearable={false}
                  />
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
      'Employee ID': 'Auto-generated on save',
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

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddEmployee() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Legacy deep link: /admin/add-employee/:employeeId (the raw DB cuid,
  // never meant to be user-visible). Kept only so old bookmarks/links still
  // work — resolved below into the clean ?mode=edit&employee=<employeeId>
  // URL the moment the record loads.
  const { employeeId: legacyDbId } = useParams<{ employeeId?: string }>();
  const [searchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employee');
  const isEditMode = searchParams.get('mode') === 'edit' ? !!employeeIdParam : !!legacyDbId;
  // The full-record endpoint accepts either a DB id or a human-readable
  // employee_id (e.g. TXI-0046) — whichever identifier the URL carries.
  const recordLookupId = isEditMode ? (employeeIdParam || legacyDbId) : undefined;
  const { data: record, isLoading: recordLoading, error: recordError } = useGetEmployeeFullRecord(recordLookupId);
  // The resolved DB id, once the record has loaded — every mutation
  // (save, invalidation) needs the real id, never the URL's employee_id.
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(undefined);
  // Guards against a background refetch (e.g. after invalidation elsewhere)
  // clobbering fields the user is actively editing — population only ever
  // runs once, the first time the record arrives.
  const populatedRef = useRef(false);
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

  // ── Draft auto-save / restore (create mode only — an edit session must
  // never read or write the shared create-draft key) ─────────────────────────
  useEffect(() => {
    if (isEditMode) return;
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
  }, [isEditMode]);

  // Save draft to localStorage on every meaningful change
  useEffect(() => {
    if (isEditMode) return;
    if (!personal.first_name && !personal.email) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ personal, employment, work, step }));
    } catch { /* storage full — ignore */ }
  }, [isEditMode, personal, employment, work, step]);

  // ── Edit mode: populate wizard state from the fetched full record ──────────
  useEffect(() => {
    if (!isEditMode || !record || populatedRef.current) return;
    populatedRef.current = true;
    const { user, profile } = record as any;
    setResolvedUserId(user?.id);
    // Never expose the internal DB id in the URL. If we got here via the
    // legacy /admin/add-employee/:employeeId deep link (or the record's own
    // employee_id differs from what's already in the URL), replace it with
    // the clean ?mode=edit&employee=<employeeId> form — silently, so back/
    // forward and copy-paste always see the human-readable id.
    if (user?.employee_id && employeeIdParam !== user.employee_id) {
      navigate(`/admin/add-employee?mode=edit&employee=${user.employee_id}`, { replace: true });
    }
    setPersonal(prev => ({
      ...prev,
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      alternate_phone: profile?.alternate_phone || '',
      father_name: profile?.father_name || '',
      cnic: profile?.cnic || '',
      dob: profile?.dob ? String(profile.dob).slice(0, 10) : '',
      gender: profile?.gender || '',
      marital_status: profile?.marital_status || '',
      nationality: profile?.nationality || '',
      religion: profile?.religion || '',
      blood_group: profile?.blood_group || '',
      current_address: profile?.current_address || '',
      permanent_address: profile?.permanent_address || '',
    }));
    setEmployment(prev => ({
      ...prev,
      employee_id: user?.employee_id || '',
      hire_date: user?.hire_date ? String(user.hire_date).slice(0, 10) : '',
      confirmation_date: profile?.confirmation_date ? String(profile.confirmation_date).slice(0, 10) : '',
      employment_type: profile?.employment_type || '',
      employment_status: profile?.employment_status || prev.employment_status,
      probation_start: profile?.probation_start ? String(profile.probation_start).slice(0, 10) : '',
      probation_end: profile?.probation_end ? String(profile.probation_end).slice(0, 10) : '',
      work_email: profile?.work_email || '',
      // Department dropdown is filtered by business_unit_id (see StepEmployment),
      // so business_unit_id must be populated here too — not just department_id —
      // or the filter matches nothing and the Department select renders empty
      // even though a real department_id is already set. The full-record
      // endpoint returns the department relation (not just department_id), which
      // carries its own business_unit_id.
      business_unit_id: user?.department?.business_unit?.id || '',
      department_id: user?.department_id || '',
      team_id: user?.team_memberships?.[0]?.team?.id || '',
      designation: user?.designation || '',
      designation_id: user?.designation_ref?.id || '',
      grade: profile?.grade || '',
      grade_id: user?.grade?.id || '',
      supervisor_id: user?.supervisor?.id || '',
      base_salary: profile?.base_salary != null ? String(profile.base_salary) : '',
      salary_currency: profile?.salary_currency || prev.salary_currency,
      pay_frequency: profile?.pay_frequency || prev.pay_frequency,
      effective_salary_date: profile?.effective_salary_date ? String(profile.effective_salary_date).slice(0, 10) : '',
      bank_name: profile?.bank_name || '',
      bank_account_number: profile?.bank_account_number || '',
    }));
    setWork(prev => ({
      ...prev,
      work_location: profile?.work_location || '',
      office_branch: profile?.office_branch || '',
      floor_area: profile?.floor_area || '',
      work_start: profile?.work_start || prev.work_start,
      work_end: profile?.work_end || prev.work_end,
      lunch_break_min: profile?.lunch_break_min != null ? String(profile.lunch_break_min) : prev.lunch_break_min,
      working_days: profile?.working_days?.length ? profile.working_days : prev.working_days,
      weekend: profile?.weekend || prev.weekend,
      work_extension: profile?.work_extension || '',
      work_phone: profile?.work_phone || '',
      is_remote: !!profile?.is_remote,
    }));
  }, [isEditMode, record]);

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

  // Reuse the canonical departments hook — other mounted components (e.g.
  // QuickCreateUserModal) also query key ['departments'] via this same hook,
  // and a locally duplicated queryFn with a different return shape here would
  // silently corrupt this shared cache entry for every consumer (whichever
  // queryFn resolves last "wins" the cached raw data for all observers).
  const { data: departments } = useGetDepartmentsQuery();

  const { data: businessUnits } = useGetBusinessUnitsQuery();

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TEAM.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  const { data: designations } = useGetDesignationsQuery(employment.department_id || undefined);

  const { data: grades } = useGetGradesQuery();

  const { data: users } = useQuery({
    queryKey: ['user-list-brief'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
    staleTime: 300000,
  });

  // Employee ID is never generated client-side — it's derived server-side
  // from Business Unit + Department the moment the employee is created
  // (see users.service.js generate_employee_id) and is not editable. This
  // preview query just shows the admin what it WILL be once both are
  // selected; it doesn't reserve the sequence number (create time recomputes
  // it), so it's safe to refetch as the selection changes. Skipped in edit
  // mode — an existing employee's ID is already assigned and immutable.
  const { data: employeeIdPreview, isFetching: employeeIdPreviewLoading } = useQuery({
    queryKey: ['employee-id-preview', employment.department_id],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.USER.EMPLOYEE_ID_PREVIEW(employment.department_id)),
    select: (r: any) => r?.payload?.employee_id,
    enabled: !isEditMode && !!employment.department_id,
    staleTime: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (as_draft: boolean) => {
      let userId: string;

      if (isEditMode) {
        userId = resolvedUserId!;
        // Base user fields only — employee_id and business_unit are never
        // re-sent on edit, they're immutable once assigned at creation.
        await apiRequest<any>(API_ENDPOINTS.USER.UPDATE(userId), {
          method: 'PUT',
          body: JSON.stringify({
            first_name:    personal.first_name,
            last_name:     personal.last_name,
            email:         personal.email,
            phone:         personal.phone || undefined,
            hire_date:     employment.hire_date || undefined,
            designation:   employment.designation || undefined,
            designation_id: employment.designation_id || undefined,
            grade_id:      employment.grade_id || undefined,
            department_id: employment.department_id || undefined,
            supervisor_id: employment.supervisor_id || undefined,
            team_id:       employment.team_id || undefined,
          }),
        });
      } else {
        const userRes: any = await apiRequest<any>(API_ENDPOINTS.USER.CREATE, {
          method: 'POST',
          body: JSON.stringify({
            first_name:    personal.first_name,
            last_name:     personal.last_name,
            email:         personal.email,
            phone:         personal.phone || undefined,
            // No password sent — create_new_user (users.service.js) already
            // falls back to a system-generated one when this is omitted;
            // the new hire sets their own via Forgot Password.
            hire_date:     employment.hire_date || undefined,
            designation:   employment.designation || undefined,
            designation_id: employment.designation_id || undefined,
            grade_id:      employment.grade_id || undefined,
            department_id: employment.department_id || undefined,
            supervisor_id: employment.supervisor_id || undefined,
            business_unit: 'ERP',
          }),
        });
        userId = userRes?.payload?.id || userRes?.id;
        if (!userId) throw new Error('Failed to create user');

        if (employment.team_id) {
          await apiRequest<any>(API_ENDPOINTS.USER.UPDATE(userId), {
            method: 'PUT',
            body: JSON.stringify({ team_id: employment.team_id }),
          });
        }
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
          bank_name:         employment.bank_name || undefined,
          bank_account_number: employment.bank_account_number || undefined,
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
      qc.invalidateQueries({ queryKey: ['employee-directory'] });
      if (isEditMode) {
        qc.invalidateQueries({ queryKey: ['employee-full', recordLookupId] });
        qc.invalidateQueries({ queryKey: ['hr-profile', resolvedUserId] });
        navigate('/admin/employee-directory');
      } else {
        clearDraft();
        navigate('/admin/employee-directory');
      }
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

  const existingDocTypes = ((record as any)?.documents || []).map((d: any) => d.document_type);

  const canNext = () => {
    if (step === 1) return !!(personal.first_name && personal.last_name && personal.email);
    if (step === 2) return !!employment.hire_date;
    if (step === 4) return missingRequiredDocs(docFiles, existingDocTypes).length === 0;
    return true;
  };

  if (isEditMode && recordLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <Loader2 size={28} className="animate-spin text-primary-500" />
        <p className="text-sm text-gray-400 font-semibold">Loading employee profile…</p>
      </div>
    );
  }

  if (isEditMode && !recordLoading && !record) {
    const status = (recordError as any)?.status;
    const isForbidden = status === 401 || status === 403;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32">
        <p className="text-sm font-semibold text-gray-500">
          {isForbidden ? "You don't have permission to view this employee." : 'Employee not found.'}
        </p>
        <button onClick={() => navigate('/admin/employee-directory')} className="text-sm text-primary-600 font-semibold hover:underline">
          Back to Employee Directory
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEditMode ? "Update the employee's profile" : 'Complete the wizard to create a new employee profile'}
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Draft restore banner (create mode only) */}
      {!isEditMode && draftBanner && (
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
            {step === 2 && <StepEmployment data={employment} onChange={changeEmployment} businessUnits={businessUnits} departments={departments} teams={teams} users={users} designations={designations} grades={grades} errorField={errorField} errorMessage={errorMessage} registerRef={registerRef} employeeIdPreview={employeeIdPreview} employeeIdPreviewLoading={employeeIdPreviewLoading} isEditMode={isEditMode} />}
            {step === 3 && <StepWork data={work} onChange={changeWork} />}
            {step === 4 && <StepDocuments docFiles={docFiles} setDocFiles={setDocFiles} existingTypes={existingDocTypes} />}
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
                    which can only be reached via Next once step 4 is satisfied.
                    Not shown in edit mode — an existing employee is never a
                    "draft", there's no meaningful profile_status: 'DRAFT' mid-edit. */}
                {!isEditMode && (
                  <button
                    onClick={() => saveMutation.mutate(true)}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <Save size={16} />Save as Draft
                  </button>
                )}
                {step < 5 ? (
                  <button disabled={!canNext()} onClick={() => setStep(s => s + 1)}
                    className="flex items-center gap-2 px-5 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    Next<ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => saveMutation.mutate(false)}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-5 h-10 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    <Check size={16} />{saveMutation.isPending ? 'Saving…' : (isEditMode ? 'Save Changes' : 'Save Employee')}
                  </button>
                )}
              </div>
            </div>

            {saveMutation.isError && (
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
