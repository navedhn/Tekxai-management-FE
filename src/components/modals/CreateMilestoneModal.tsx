import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DatePicker from '@/components/ui/DatePicker';
import Textarea from '@/components/ui/Textarea';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { Button } from '@/components/ui/Button';
import ChipMultiSelect from '@/components/ui/ChipMultiSelect';
import { Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  Milestone, MilestoneStatus, MilestoneUpsertPayload,
  MissedReasonCategory, IssueClassification, QaStatus,
  useCreateMilestone, useMilestones, useUpdateMilestone,
} from '@/services/milestonesService';

const STATUS_OPTIONS: { label: string; value: MilestoneStatus }[] = [
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Blocked', value: 'BLOCKED' },
];

// Payment state is a financial fact, independent of workflow status above —
// a milestone can be COMPLETED and still UNPAID, or vice versa.
const PAYMENT_STATUS_OPTIONS: { label: string; value: 'UNPAID' | 'PAID' }[] = [
  { label: 'Unpaid', value: 'UNPAID' },
  { label: 'Paid', value: 'PAID' },
];

// Phase 3 Project Delivery & Evidence Foundation — "what happened" (missed
// reason) is a deliberately separate vocabulary from "whose/what fault"
// (issue classification) below; neither is ever inferred from lateness.
const MISSED_REASON_OPTIONS: { label: string; value: MissedReasonCategory }[] = [
  { label: 'Client Dependency', value: 'CLIENT_DEPENDENCY' },
  { label: 'Access / Infrastructure', value: 'ACCESS_INFRASTRUCTURE' },
  { label: 'Scope Change', value: 'SCOPE_CHANGE' },
  { label: 'Blocker', value: 'BLOCKER' },
  { label: 'Resource Capacity', value: 'RESOURCE_CAPACITY' },
  { label: 'Technical Issue', value: 'TECHNICAL_ISSUE' },
  { label: 'Quality / Rework', value: 'QUALITY_REWORK' },
  { label: 'Other', value: 'OTHER' },
];
const ISSUE_CLASSIFICATION_OPTIONS: { label: string; value: IssueClassification }[] = [
  { label: 'Performance Issue', value: 'PERFORMANCE' },
  { label: 'Capacity Issue', value: 'CAPACITY' },
  { label: 'External Dependency', value: 'EXTERNAL_DEPENDENCY' },
  { label: 'Scope/Requirement Change', value: 'SCOPE_CHANGE' },
  { label: 'Technical/Infrastructure Issue', value: 'TECHNICAL_INFRASTRUCTURE' },
  { label: 'Quality/Rework Issue', value: 'QUALITY_REWORK' },
  { label: 'Other', value: 'OTHER' },
];
const QA_STATUS_OPTIONS: { label: string; value: QaStatus }[] = [
  { label: 'Not Required', value: 'NOT_REQUIRED' },
  { label: 'Passed', value: 'PASSED' },
  { label: 'Failed', value: 'FAILED' },
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
  /** Project's budget_currency — milestone price always inherits it; no per-milestone currency in this phase. */
  currency?: string;
}

function memberName(m: SimpleMember) {
  return `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email || m.id;
}

const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({ isOpen, onClose, projectId, milestone, projectMembers = [], currency = 'PKR' }) => {
  const isEdit = !!milestone;
  const toast = useToastContext();
  const createMutation = useCreateMilestone(projectId ? String(projectId) : null);
  const updateMutation = useUpdateMilestone(projectId ? String(projectId) : null);
  const { data: allMilestones = [] } = useMilestones(projectId ? String(projectId) : null);

  const [formData, setFormData] = useState({
    title: '', due_date: '', description: '', sequence: '', status: 'NOT_STARTED' as MilestoneStatus,
    estimated_start: '', estimated_end: '', progress_percent: '0', remarks: '',
    price: '0', payment_status: 'UNPAID' as 'UNPAID' | 'PAID',
    // Phase 3 Project Delivery & Evidence Foundation — '' means "not set",
    // distinct from any real enum value; never defaulted to something else.
    missed_reason_category: '' as MissedReasonCategory | '',
    missed_reason_detail: '',
    issue_classification: '' as IssueClassification | '',
    qa_status: '' as QaStatus | '',
    qa_notes: '',
    rework_count: '',
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
        price: milestone.price != null ? String(milestone.price) : '0',
        payment_status: milestone.payment_status || 'UNPAID',
        missed_reason_category: milestone.missed_reason_category || '',
        missed_reason_detail: milestone.missed_reason_detail || '',
        issue_classification: milestone.issue_classification || '',
        qa_status: milestone.qa_status || '',
        qa_notes: milestone.qa_notes || '',
        rework_count: milestone.rework_count != null ? String(milestone.rework_count) : '',
      });
      setAssignedIds((milestone.members || []).map((m) => m.user.id));
      setDependsOnIds(milestone.depends_on_ids || []);
    } else {
      setFormData({
        title: '', due_date: '', description: '', sequence: '', status: 'NOT_STARTED', estimated_start: '', estimated_end: '', progress_percent: '0', remarks: '', price: '0', payment_status: 'UNPAID',
        missed_reason_category: '', missed_reason_detail: '', issue_classification: '', qa_status: '', qa_notes: '', rework_count: '',
      });
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
    const price = formData.price === '' ? 0 : +formData.price;
    if (Number.isNaN(price) || price < 0) newErrors.price = 'Price cannot be negative';
    // Mirrors the backend's own paired validation exactly.
    if (formData.missed_reason_category === 'OTHER' && !formData.missed_reason_detail.trim()) {
      newErrors.missed_reason_detail = 'Please explain when selecting "Other"';
    }
    if (formData.rework_count !== '' && (!Number.isInteger(+formData.rework_count) || +formData.rework_count < 0)) {
      newErrors.rework_count = 'Rework count must be a non-negative whole number';
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
      price,
      payment_status: formData.payment_status,
      // Phase 3 Project Delivery & Evidence Foundation.
      missed_reason_category: formData.missed_reason_category || null,
      missed_reason_detail: formData.missed_reason_detail || null,
      issue_classification: formData.issue_classification || null,
      qa_status: formData.qa_status || null,
      qa_notes: formData.qa_notes || null,
      rework_count: formData.rework_count === '' ? null : +formData.rework_count,
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

        <div className={cn('grid gap-4', isEdit ? 'grid-cols-1' : 'grid-cols-2')}>
          {/* Sequence is only meaningful on create, as an optional insertion
              position (existing milestones from that position on shift down
              one) — the backend now server-controls sequence entirely and
              silently ignores it on update. Reordering an existing milestone
              is done via drag-and-drop in the milestones list, which calls
              the dedicated reorder endpoint. */}
          {!isEdit && (
            <Input
              label="Insert at Position"
              name="sequence"
              type="number"
              min={1}
              value={formData.sequence}
              onChange={handleInputChange}
              error={errors.sequence}
              placeholder="Leave blank to append"
              className="h-12 rounded-xl"
            />
          )}
          <SearchableSelect
            label="Status"
            options={STATUS_OPTIONS}
            value={formData.status}
            onChange={(v) => setFormData((f) => ({
              ...f,
              status: v as MilestoneStatus,
              // Business invariant (enforced server-side too, see
              // milestones.service.js): a PAID milestone must be COMPLETED.
              // Moving status away from COMPLETED while marked PAID would be
              // rejected by the backend — reset it here so the form never
              // lands in a state the server would refuse.
              payment_status: v !== 'COMPLETED' && f.payment_status === 'PAID' ? 'UNPAID' : f.payment_status,
            }))}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <DatePicker label="Estimated Start" placeholder="Select date" value={formData.estimated_start} onChange={(d) => setFormData((f) => ({ ...f, estimated_start: d }))} />
          <DatePicker label="Estimated End" placeholder="Select date" value={formData.estimated_end} onChange={(d) => setFormData((f) => ({ ...f, estimated_end: d }))} error={errors.estimated_end} />
          <DatePicker label="Due Date" placeholder="Select date" value={formData.due_date} onChange={(d) => setFormData((f) => ({ ...f, due_date: d }))} />
        </div>

        {/* Financial state — deliberately separate from workflow Status
            above: a milestone can be Completed and still Unpaid. */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Price (${currency})`}
            name="price"
            type="number"
            // No `min` attribute here deliberately: an HTML5 min constraint
            // silently blocks native form submission (no error shown) before
            // our own validation below ever runs. The negative check just
            // beneath (and the backend's own validator) is the real guard.
            step="0.01"
            value={formData.price}
            onChange={handleInputChange}
            error={errors.price}
            placeholder="0.00"
            className="h-12 rounded-xl"
          />
          <div className="flex flex-col gap-1">
            <SearchableSelect
              label="Payment Status"
              options={PAYMENT_STATUS_OPTIONS.map((o) => ({
                ...o,
                // A milestone can only be marked PAID once it's COMPLETED
                // (server-enforced invariant — disabled here too so the
                // form can't be submitted into a state it would reject).
                disabled: o.value === 'PAID' && formData.status !== 'COMPLETED',
              }))}
              value={formData.payment_status}
              onChange={(v) => setFormData((f) => ({ ...f, payment_status: v as 'UNPAID' | 'PAID' }))}
            />
            {formData.status !== 'COMPLETED' && (
              <span className="text-[11px] text-gray-400 font-medium ml-1">Mark Status as Completed to allow Paid</span>
            )}
          </div>
        </div>

        {/* Phase 3 Project Delivery & Evidence Foundation — only shown once
            editing a real milestone: there's nothing to explain about a
            delivery that hasn't happened yet on brand-new one. Deliberately
            two separate vocabularies: "what happened" (Missed Reason) is
            never conflated with "whose/what fault" (Issue Classification) —
            neither is auto-derived from lateness or from each other. */}
        {isEdit && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Delivery Evidence</span>

            {milestone?.delivery && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold">Delivery status:</span>
                <span className={cn(
                  'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide',
                  milestone.delivery.status === 'ON_TIME' ? 'bg-emerald-50 text-emerald-700'
                    : milestone.delivery.status === 'MISSED' ? 'bg-red-50 text-red-600'
                    : 'bg-gray-100 text-gray-500'
                )}>
                  {milestone.delivery.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">(computed from deadline vs. actual completion — not editable)</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Missed Reason"
                options={MISSED_REASON_OPTIONS}
                value={formData.missed_reason_category || null}
                onChange={(v) => setFormData((f) => ({ ...f, missed_reason_category: (v as MissedReasonCategory) || '' }))}
                placeholder="Not set"
              />
              <SearchableSelect
                label="Performance / Capacity Classification"
                options={ISSUE_CLASSIFICATION_OPTIONS}
                value={formData.issue_classification || null}
                onChange={(v) => setFormData((f) => ({ ...f, issue_classification: (v as IssueClassification) || '' }))}
                placeholder="Not set"
              />
            </div>
            {formData.missed_reason_category === 'OTHER' && (
              <Textarea
                label="Explain (required for Other)"
                name="missed_reason_detail"
                value={formData.missed_reason_detail}
                onChange={handleInputChange}
                error={errors.missed_reason_detail}
                placeholder="What happened?"
                className="min-h-[60px] rounded-xl"
              />
            )}
            <p className="text-[11px] text-gray-400 -mt-1">A missed deadline does not by itself mean underperformance — this classification is management's own evidence-backed judgment.</p>

            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="QA Status"
                options={QA_STATUS_OPTIONS}
                value={formData.qa_status || null}
                onChange={(v) => setFormData((f) => ({ ...f, qa_status: (v as QaStatus) || '' }))}
                placeholder="Not assessed"
              />
              <Input
                label="Rework Count"
                name="rework_count"
                type="number"
                step="1"
                value={formData.rework_count}
                onChange={handleInputChange}
                error={errors.rework_count}
                placeholder="Not tracked"
                className="h-12 rounded-xl"
              />
            </div>
            <Textarea
              label="QA / Evidence Notes (Optional)"
              name="qa_notes"
              value={formData.qa_notes}
              onChange={handleInputChange}
              placeholder="Evidence backing the QA outcome or missed reason..."
              className="min-h-[60px] rounded-xl"
            />
            {milestone?.delivery && milestone.delivery.evidence_count > 0 && (
              <p className="text-[11px] text-gray-500 font-semibold">{milestone.delivery.evidence_count} evidence document{milestone.delivery.evidence_count === 1 ? '' : 's'} attached — see the project's Files tab.</p>
            )}
          </div>
        )}

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
