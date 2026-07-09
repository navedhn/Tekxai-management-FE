import React, { useState } from 'react';
import { GraduationCap, Briefcase, Plus, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useGetEducation, useCreateEducation, useDeleteEducation,
  useGetEmploymentHistory, useCreateEmploymentHistory, useDeleteEmploymentHistory,
} from '@/services/employeeService';

// ── Education ────────────────────────────────────────────────────────────────

const EMPTY_EDUCATION = {
  qualification: '',
  field_of_study: '',
  institute: '',
  passing_year: '',
  cgpa: '',
  division_class: '',
  percentage: '',
};

const EducationCard: React.FC<{ userId: string }> = ({ userId }) => {
  const toast = useToastContext();
  const { data: records = [], isLoading } = useGetEducation(userId);
  const createEducation = useCreateEducation(userId);
  const deleteEducation = useDeleteEducation(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState<any>({ ...EMPTY_EDUCATION });

  const handleAdd = () => {
    if (!newRecord.qualification) { toast.error('Qualification is required'); return; }
    const payload = {
      ...newRecord,
      passing_year: newRecord.passing_year ? Number(newRecord.passing_year) : undefined,
      cgpa: newRecord.cgpa ? Number(newRecord.cgpa) : undefined,
      percentage: newRecord.percentage ? Number(newRecord.percentage) : undefined,
    };
    createEducation.mutate(payload, {
      onSuccess: () => { toast.success('Education record added'); setShowAdd(false); setNewRecord({ ...EMPTY_EDUCATION }); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add education record'),
    });
  };

  const handleDelete = (id: string) => {
    deleteEducation.mutate(id, {
      onSuccess: () => toast.success('Education record removed'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete education record'),
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><GraduationCap size={16} />Education</h3>
        <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" />Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <h3 className="text-sm font-black text-gray-900 mb-3">Add Education Record</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qualification *" value={newRecord.qualification} onChange={e => setNewRecord((p: any) => ({ ...p, qualification: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. BS Computer Science" />
            <Input label="Field of Study" value={newRecord.field_of_study} onChange={e => setNewRecord((p: any) => ({ ...p, field_of_study: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Institute" value={newRecord.institute} onChange={e => setNewRecord((p: any) => ({ ...p, institute: e.target.value }))} className="h-10 rounded-xl col-span-2" />
            <Input label="Passing Year" type="number" value={newRecord.passing_year} onChange={e => setNewRecord((p: any) => ({ ...p, passing_year: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Division / Class" value={newRecord.division_class} onChange={e => setNewRecord((p: any) => ({ ...p, division_class: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="CGPA" type="number" value={newRecord.cgpa} onChange={e => setNewRecord((p: any) => ({ ...p, cgpa: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="Percentage" type="number" value={newRecord.percentage} onChange={e => setNewRecord((p: any) => ({ ...p, percentage: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={createEducation.isPending} onClick={handleAdd}>Save</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : records.length > 0 ? (
        <div className="flex flex-col gap-3">
          {records.map((rec: any) => (
            <div key={rec.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-black text-gray-900">{rec.qualification}</p>
                {rec.field_of_study && <p className="text-xs text-gray-500">{rec.field_of_study}</p>}
                <p className="text-xs text-gray-400">{rec.institute}{rec.passing_year ? ` · ${rec.passing_year}` : ''}</p>
                <p className="text-xs text-gray-400">
                  {rec.division_class && <span>{rec.division_class}</span>}
                  {rec.cgpa != null && rec.cgpa !== '' && <span>{rec.division_class ? ' · ' : ''}CGPA: {rec.cgpa}</span>}
                  {rec.percentage != null && rec.percentage !== '' && <span>{(rec.division_class || (rec.cgpa != null && rec.cgpa !== '')) ? ' · ' : ''}{rec.percentage}%</span>}
                </p>
              </div>
              <button onClick={() => handleDelete(rec.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : !showAdd && (
        <p className="text-sm text-gray-400">No education records added yet</p>
      )}
    </Card>
  );
};

// ── Experience / Employment History ─────────────────────────────────────────

const EMPTY_EXPERIENCE = {
  company_name: '',
  designation: '',
  from_date: '',
  to_date: '',
  is_current: 'false',
  notes: '',
};

const CURRENT_OPTIONS = [
  { label: 'No', value: 'false' },
  { label: 'Yes, current role', value: 'true' },
];

const ExperienceCard: React.FC<{ userId: string }> = ({ userId }) => {
  const toast = useToastContext();
  const { data: records = [], isLoading } = useGetEmploymentHistory(userId);
  const createHistory = useCreateEmploymentHistory(userId);
  const deleteHistory = useDeleteEmploymentHistory(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState<any>({ ...EMPTY_EXPERIENCE });

  const handleAdd = () => {
    if (!newRecord.company_name) { toast.error('Company name is required'); return; }
    const isCurrent = newRecord.is_current === 'true' || newRecord.is_current === true;
    const payload = {
      ...newRecord,
      is_current: isCurrent,
      to_date: isCurrent ? undefined : (newRecord.to_date || undefined),
    };
    createHistory.mutate(payload, {
      onSuccess: () => { toast.success('Experience record added'); setShowAdd(false); setNewRecord({ ...EMPTY_EXPERIENCE }); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add experience record'),
    });
  };

  const handleDelete = (id: string) => {
    deleteHistory.mutate(id, {
      onSuccess: () => toast.success('Experience record removed'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete experience record'),
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2"><Briefcase size={16} />Experience / Employment History</h3>
        <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" />Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <h3 className="text-sm font-black text-gray-900 mb-3">Add Experience Record</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company Name *" value={newRecord.company_name} onChange={e => setNewRecord((p: any) => ({ ...p, company_name: e.target.value }))} className="h-10 rounded-xl col-span-2" placeholder="e.g. Acme Corp" />
            <Input label="Designation" value={newRecord.designation} onChange={e => setNewRecord((p: any) => ({ ...p, designation: e.target.value }))} className="h-10 rounded-xl col-span-2" />
            <Input label="From Date" type="date" value={newRecord.from_date} onChange={e => setNewRecord((p: any) => ({ ...p, from_date: e.target.value }))} className="h-10 rounded-xl" />
            <Input label="To Date" type="date" value={newRecord.to_date} onChange={e => setNewRecord((p: any) => ({ ...p, to_date: e.target.value }))} className="h-10 rounded-xl" disabled={newRecord.is_current === 'true'} />
            <Select label="Currently Working Here?" options={CURRENT_OPTIONS} value={newRecord.is_current} onChange={(v: any) => setNewRecord((p: any) => ({ ...p, is_current: String(v) }))} className="h-10 !rounded-xl col-span-2" />
            <Input label="Notes (optional)" value={newRecord.notes} onChange={e => setNewRecord((p: any) => ({ ...p, notes: e.target.value }))} className="h-10 rounded-xl col-span-2" />
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" animation="none" rounded={false} className="rounded-xl" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" animation="none" rounded={false} className="rounded-xl" loading={createHistory.isPending} onClick={handleAdd}>Save</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : records.length > 0 ? (
        <div className="flex flex-col gap-3">
          {records.map((rec: any) => (
            <div key={rec.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-black text-gray-900">{rec.company_name}</p>
                {rec.designation && <p className="text-xs text-gray-500">{rec.designation}</p>}
                <p className="text-xs text-gray-400">
                  {rec.from_date ? new Date(rec.from_date).toLocaleDateString() : '—'}
                  {' – '}
                  {rec.is_current ? 'Present' : (rec.to_date ? new Date(rec.to_date).toLocaleDateString() : '—')}
                </p>
                {rec.notes && <p className="text-xs text-gray-400 mt-0.5">{rec.notes}</p>}
              </div>
              <button onClick={() => handleDelete(rec.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : !showAdd && (
        <p className="text-sm text-gray-400">No experience records added yet</p>
      )}
    </Card>
  );
};

// ── Exported section ─────────────────────────────────────────────────────────

export interface EducationExperienceSectionProps {
  userId: string;
}

const EducationExperienceSection: React.FC<EducationExperienceSectionProps> = ({ userId }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <EducationCard userId={userId} />
    <ExperienceCard userId={userId} />
  </div>
);

export default EducationExperienceSection;
