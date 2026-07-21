import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  Milestone, MilestoneStatus, MilestoneUpsertPayload,
  useCreateMilestone, useMilestones, useUpdateMilestone,
} from '@/services/milestonesService';

const STATUS_OPTIONS: { label: string; value: MilestoneStatus }[] = [
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Blocked', value: 'BLOCKED' },
];

interface SimpleMember {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  email?: string | null;
}

interface CreateMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number | null;
  milestone?: Milestone | null;
  projectMembers?: SimpleMember[];
}

function memberName(m: SimpleMember) {
  return `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || m.id;
}

// Small self-contained multi-select chip picker — a full user-search
// dropdown isn't needed here since both pickers (assigned members,
// dependencies) draw from a short list already loaded by the parent
// (the project's own roster / the project's own milestones), not the org.
const ChipMultiSelect: React.FC<{
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyText: string;
}> = ({ label, options, selected, onChange, emptyText }) => {
  const [open, setOpen] = useState(false);
  const available = options.filter((o) => !selected.includes(o.id));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {selected.map((id) => {
          const opt = options.find((o) => o.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-bold px-2.5 py-1 rounded-lg">
              {opt?.label || id}
              <button type="button" onClick={() => onChange(selected.filter((s) => s !== id))} className="hover:text-red-500">
                <X size={11} />
              </button>
            </span>
          );
        })}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg"
          >
            <Plus size={12} /> Add
          </button>
          {open && (
            <div className="absolute z-20 mt-1 w-56 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl p-1.5">
              {available.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-2">{emptyText}</p>
              ) : (
                available.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { onChange([...selected, o.id]); setOpen(false); }}
                    className="w-full text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg"
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({ isOpen, onClose, projectId, milestone, projectMembers = [] }) => {
  const isEdit = !!milestone;
  const toast = useToastContext();
  const createMutation = useCreateMilestone(projectId ? String(projectId) : null);
  const updateMutation = useUpdateMilestone(projectId ? String(projectId) : null);
  const { data: allMilestones = [] } = useMilestones(projectId ? String(projectId) : null);

  const [formData, setFormData] = useState({
    title: '', due_date: '', description: '', sequence: '', status: 'NOT_STARTED' as MilestoneStatus,
    estimated_start: '', estimated_end: '', progress_percent: '0', remarks: '',
  });
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [dependsOnIds, setDependsOnIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (milestone) {
      setFormData({
        title: milestone.title || '',
        due_date: milestone.due_date ? milestone.due_date.slice(0, 10) : '',
        description: milestone.description || '',
        sequence: milestone.sequence != null ? String(milestone.sequence) : '',
        status: milestone.status || 'NOT_STARTED',
        estimated_start: milestone.estimated_start ? milestone.estimated_start.slice(0, 10) : '',
        estimated_end: milestone.estimated_end ? milestone.estimated_end.slice(0, 10) : '',
        progress_percent: String(milestone.progress_percent ?? 0),
        remarks: milestone.remarks || '',
      });
      setAssignedIds((milestone.members || []).map((m) => m.user.id));
      setDependsOnIds(milestone.depends_on_ids || []);
    } else {
      setFormData({ title: '', due_date: '', description: '', sequence: '', status: 'NOT_STARTED', estimated_start: '', estimated_end: '', progress_percent: '0', remarks: '' });
      setAssignedIds([]);
      setDependsOnIds([]);
    }
    setErrors({});
  }, [milestone, isOpen]);

  const memberOptions = useMemo(() => projectMembers.map((m) => ({ id: m.id, label: memberName(m) })), [projectMembers]);
  const dependencyOptions = useMemo(
    () => allMilestones.filter((m) => m.id !== milestone?.id).map((m) => ({ id: m.id, label: m.title })),
    [allMilestones, milestone]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Milestone title is required';
    if (formData.sequence && (!Number.isInteger(+formData.sequence) || +formData.sequence < 1)) {
      newErrors.sequence = 'Sequence must be a positive whole number';
    }
    const progress = +formData.progress_percent;
    if (Number.isNaN(progress) || progress < 0 || progress > 100) newErrors.progress_percent = 'Progress must be between 0 and 100';
    if (formData.estimated_start && formData.estimated_end && formData.estimated_end < formData.estimated_start) {
      newErrors.estimated_end = 'Estimated end cannot be before estimated start';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: MilestoneUpsertPayload = {
      title: formData.title.trim(),
      description: formData.description || null,
      due_date: formData.due_date || null,
      sequence: formData.sequence ? +formData.sequence : null,
      status: formData.status,
      estimated_start: formData.estimated_start || null,
      estimated_end: formData.estimated_end || null,
      progress_percent: progress,
      remarks: formData.remarks || null,
      assigned_user_ids: assignedIds,
      depends_on_ids: dependsOnIds,
    };

    const mutation = isEdit
      ? updateMutation.mutate({ milestoneId: milestone!.id, updates: payload }, {
          onSuccess: () => { toast.success('Milestone updated'); onClose(); },
          onError: (e: any) => toast.error(e?.message || 'Failed to update milestone'),
        })
      : createMutation.mutate(payload, {
          onSuccess: () => { toast.success('Milestone created successfully'); onClose(); },
          onError: (e: any) => toast.error(e?.message || 'Failed to create milestone'),
        });
    return mutation;
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Milestone' : 'Create New Milestone'}
      size="sm"
      customClass="sm:min-w-[560px] w-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-1 max-h-[75vh] overflow-y-auto">
        <Input
          label="Milestone Title *"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          error={errors.title}
          placeholder="e.g. Backend API Development"
          className="h-12 rounded-xl"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Sequence"
            name="sequence"
            type="number"
            min={1}
            value={formData.sequence}
            onChange={handleInputChange}
            error={errors.sequence}
            placeholder="1, 2, 3…"
            className="h-12 rounded-xl"
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={formData.status}
            onChange={(v) => setFormData((f) => ({ ...f, status: v as MilestoneStatus }))}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <DatePicker label="Estimated Start" placeholder="Select date" value={formData.estimated_start} onChange={(d) => setFormData((f) => ({ ...f, estimated_start: d }))} />
          <DatePicker label="Estimated End" placeholder="Select date" value={formData.estimated_end} onChange={(d) => setFormData((f) => ({ ...f, estimated_end: d }))} error={errors.estimated_end} />
          <DatePicker label="Due Date" placeholder="Select date" value={formData.due_date} onChange={(d) => setFormData((f) => ({ ...f, due_date: d }))} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress %</span>
            <span className="text-xs font-black text-gray-700">{formData.progress_percent}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            name="progress_percent"
            value={formData.progress_percent}
            onChange={handleInputChange}
            className="w-full accent-primary-500"
          />
          {errors.progress_percent && <span className="text-xs text-red-500 font-semibold">{errors.progress_percent}</span>}
        </div>

        <ChipMultiSelect
          label="Assigned Members"
          options={memberOptions}
          selected={assignedIds}
          onChange={setAssignedIds}
          emptyText={memberOptions.length === 0 ? 'No project members to assign' : 'All members assigned'}
        />

        <ChipMultiSelect
          label="Dependencies (blocked by)"
          options={dependencyOptions}
          selected={dependsOnIds}
          onChange={setDependsOnIds}
          emptyText={dependencyOptions.length === 0 ? 'No other milestones yet' : 'All milestones added'}
        />

        <Textarea
          label="Description (Optional)"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Add some details about this milestone..."
          className="sm:min-h-[80px] rounded-xl"
        />

        <Textarea
          label="Remarks (Optional)"
          name="remarks"
          value={formData.remarks}
          onChange={handleInputChange}
          placeholder="Internal notes about this milestone..."
          className="sm:min-h-[60px] rounded-xl"
        />

        <div className="flex sm:flex-row w-full flex-col items-center gap-3 mt-2">
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1 w-full h-12 rounded-xl font-bold"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="flex-1 h-12 w-full rounded-xl font-bold shadow-lg shadow-primary-100 disabled:opacity-50"
            leftIcon={Plus}
          >
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Milestone')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateMilestoneModal;
