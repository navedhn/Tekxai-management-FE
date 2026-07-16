import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Send } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import DynamicFormRenderer from './DynamicFormRenderer';
import { CreateTicketPayload, TicketCategory, TicketPriority, TicketTypeSummary } from '@/types/ticket';
import {
  TICKET_CATEGORIES, TICKET_RECIPIENTS,
  useCreateTicketMutation, useTicketCategoriesQuery, useTicketTypesQuery,
} from '@/services/ticketService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useGetDepartmentsQuery } from '@/services/departmentService';
import { useGetProjects } from '@/services/projectService';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  createdBy: string;
  createdByEmail: string;
}

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const RECIPIENT_OPTIONS = TICKET_RECIPIENTS.map(r => ({
  label: r.role === 'other' ? r.label : `${r.label} — ${r.name}`,
  value: r.id,
}));

// M5 — Ticket Creation Flow: Category → Type → Dynamic Form → Review → Submit.
// Falls back to the original free-form ("legacy") ticket when no Service Desk
// categories are configured, or when the user picks "General request".
type WizardStep = 'pick' | 'form' | 'review' | 'legacy';

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  createdBy,
  createdByEmail,
}) => {
  const toast = useToastContext();
  const createMutation = useCreateTicketMutation();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const { data: categories = [] } = useTicketCategoriesQuery();

  const activeCategories = useMemo(
    () => categories.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const hasServiceDesk = activeCategories.length > 0;

  const [step, setStep] = useState<WizardStep>('pick');
  const [categoryId, setCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState<TicketTypeSummary | null>(null);

  const { data: types = [] } = useTicketTypesQuery(categoryId || undefined);
  const activeTypes = useMemo(() => types.filter(t => t.is_active), [types]);

  // Shared fields
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  // Service Desk fields
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [projectId, setProjectId] = useState('');
  const needsProject = selectedType?.project_association !== 'NONE' && !!selectedType;
  const { data: projects = [] } = useGetProjects();

  // Legacy fields
  const [recipientId, setRecipientId] = useState('tl');
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [departmentId, setDepartmentId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(hasServiceDesk ? 'pick' : 'legacy');
    setCategoryId('');
    setSelectedType(null);
    setSubject('');
    setDescription('');
    setPriority('medium');
    setCustomFields({});
    setProjectId('');
    setRecipientId('tl');
    setCustomName('');
    setCategory('');
    setDepartmentId('');
  }, [isOpen, hasServiceDesk]);

  const DEPARTMENT_OPTIONS = departments.map((d: { id: string; name: string }) => ({
    label: d.name,
    value: d.id,
  }));
  const PROJECT_OPTIONS = projects.map((p: any) => ({ label: p.title, value: p.id }));

  const pickType = (t: TicketTypeSummary) => {
    setSelectedType(t);
    setCustomFields({});
    setStep('form');
  };

  const validateForm = (): string | null => {
    if (!subject.trim() || !description.trim()) return 'Please fill in subject and description.';
    if (selectedType) {
      for (const section of selectedType.field_schema || []) {
        for (const f of section.fields || []) {
          const v = customFields[f.key];
          if (f.required && (v === undefined || v === null || v === '')) {
            return `"${f.label}" is required.`;
          }
        }
      }
      if (selectedType.project_association === 'REQUIRED' && !projectId) {
        return 'This ticket type requires a project.';
      }
    }
    return null;
  };

  const goToReview = () => {
    const err = validateForm();
    if (err) { toast.error(err); return; }
    setStep('review');
  };

  const submit = async () => {
    const isLegacy = step === 'legacy' || !selectedType;
    if (isLegacy) {
      if (!subject.trim() || !description.trim()) {
        toast.error('Please fill in subject and description.');
        return;
      }
      if (recipientId === 'other' && !customName.trim()) {
        toast.error('Please enter who this ticket is for.');
        return;
      }
    }

    const payload: CreateTicketPayload = isLegacy
      ? {
          subject, description,
          category: category || undefined,
          departmentId: departmentId || undefined,
          recipientId,
          customRecipientName: recipientId === 'other' ? customName : undefined,
          priority, createdBy, createdByEmail,
        }
      : {
          subject, description, priority, createdBy, createdByEmail,
          recipientId: 'other',
          ticketTypeId: selectedType!.id,
          customFields,
          projectId: projectId || undefined,
        };

    try {
      const ticket = await createMutation.mutateAsync(payload);
      toast.success(`Ticket ${ticket.ticketNumber} sent successfully!`);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to send ticket. Please try again.');
    }
  };

  const categoryLabel = activeCategories.find(c => c.id === categoryId)?.label;

  // ── Step: pick category + type ─────────────────────────────────────────────
  const renderPick = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 font-medium">What do you need help with?</p>
      <div className="flex flex-wrap gap-2">
        {activeCategories.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setCategoryId(c.id); setSelectedType(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              categoryId === c.id
                ? 'bg-[#005CDA] text-white border-[#005CDA]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {categoryId && (
        <div className="space-y-2">
          {activeTypes.length === 0 && (
            <p className="text-sm text-gray-400">No request types configured for this category yet.</p>
          )}
          {activeTypes.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 hover:border-[#005CDA]/50 hover:bg-blue-50/40 px-4 py-3 text-left transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-gray-900">{t.label}</p>
                {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setStep('legacy')}
        className="text-xs font-semibold text-gray-400 hover:text-gray-600 underline underline-offset-2"
      >
        None of these fit — raise a general request
      </button>
    </div>
  );

  // ── Step: dynamic form ─────────────────────────────────────────────────────
  const renderForm = () => (
    <div className="space-y-4">
      <button type="button" onClick={() => setStep('pick')} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600">
        <ArrowLeft size={12} /> {categoryLabel} / {selectedType?.label}
      </button>

      <Input label="Subject *" placeholder="Brief summary of your request" value={subject} onChange={e => setSubject(e.target.value)} />
      <Textarea label="Description *" placeholder="Describe your request in detail…" value={description} onChange={e => setDescription(e.target.value)} rows={3} />

      <DynamicFormRenderer
        sections={selectedType?.field_schema || []}
        values={customFields}
        onChange={(key, value) => setCustomFields(prev => ({ ...prev, [key]: value }))}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={v => setPriority(v as TicketPriority)} />
        {needsProject && (
          <Select
            label={selectedType?.project_association === 'REQUIRED' ? 'Project *' : 'Project (optional)'}
            options={PROJECT_OPTIONS}
            value={projectId}
            onChange={v => setProjectId(String(v))}
          />
        )}
      </div>
    </div>
  );

  // ── Step: review ───────────────────────────────────────────────────────────
  const renderReview = () => {
    const fieldRows: { label: string; value: string }[] = [];
    for (const section of selectedType?.field_schema || []) {
      for (const f of section.fields || []) {
        const v = customFields[f.key];
        if (v !== undefined && v !== null && v !== '') {
          fieldRows.push({ label: f.label, value: Array.isArray(v) ? v.join(', ') : String(v) });
        }
      }
    }
    const projectTitle = PROJECT_OPTIONS.find((p: { value: string }) => p.value === projectId)?.label;

    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setStep('form')} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600">
          <ArrowLeft size={12} /> Edit details
        </button>
        <p className="text-sm text-gray-500 font-medium">Review your request before submitting.</p>

        <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-4 py-2.5"><span className="text-gray-400 font-semibold">Type</span><span className="font-bold text-gray-900">{categoryLabel} / {selectedType?.label}</span></div>
          <div className="flex justify-between px-4 py-2.5"><span className="text-gray-400 font-semibold">Subject</span><span className="font-bold text-gray-900 text-right max-w-[60%]">{subject}</span></div>
          <div className="flex justify-between px-4 py-2.5"><span className="text-gray-400 font-semibold">Priority</span><span className="font-bold text-gray-900 capitalize">{priority}</span></div>
          {projectTitle && (
            <div className="flex justify-between px-4 py-2.5"><span className="text-gray-400 font-semibold">Project</span><span className="font-bold text-gray-900">{projectTitle}</span></div>
          )}
          {fieldRows.map(r => (
            <div key={r.label} className="flex justify-between px-4 py-2.5"><span className="text-gray-400 font-semibold">{r.label}</span><span className="font-bold text-gray-900 text-right max-w-[60%]">{r.value}</span></div>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>
      </div>
    );
  };

  // ── Step: legacy free-form ticket (pre-Service-Desk behavior, unchanged) ──
  const renderLegacy = () => (
    <div className="space-y-4">
      {hasServiceDesk && (
        <button type="button" onClick={() => setStep('pick')} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600">
          <ArrowLeft size={12} /> Back to request types
        </button>
      )}
      <p className="text-sm text-gray-500 font-medium">
        Raise a ticket against your Team Lead, Office Boy, HR, Admin, or anyone else.
      </p>

      <Select label="Raise ticket to" options={RECIPIENT_OPTIONS} value={recipientId} onChange={v => setRecipientId(String(v))} />

      {recipientId === 'other' && (
        <Input
          label="Person / department name"
          placeholder="e.g. IT Support, Facility Manager"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select label="Category (optional)" options={TICKET_CATEGORIES} value={category} onChange={v => setCategory(v as TicketCategory)} />
        <Select label="Department (optional)" options={DEPARTMENT_OPTIONS} value={departmentId} onChange={v => setDepartmentId(String(v))} />
      </div>

      <Input label="Subject" placeholder="Brief summary of your issue" value={subject} onChange={e => setSubject(e.target.value)} />
      <Textarea label="Description" placeholder="Describe your issue or request in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      <Select label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={v => setPriority(v as TicketPriority)} />
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" animation="none" rounded={false} className="rounded-lg" onClick={onClose}>
        Cancel
      </Button>
      {step === 'form' && (
        <Button animation="none" rounded={false} className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB]" onClick={goToReview}>
          Review
          <ChevronRight size={16} />
        </Button>
      )}
      {(step === 'review' || step === 'legacy') && (
        <Button
          animation="none"
          rounded={false}
          className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB]"
          loading={createMutation.isPending}
          onClick={submit}
        >
          <Send size={16} />
          Send Ticket
        </Button>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Raise a Support Ticket" footer={footer}>
      {step === 'pick' && renderPick()}
      {step === 'form' && renderForm()}
      {step === 'review' && renderReview()}
      {step === 'legacy' && renderLegacy()}
    </Modal>
  );
};

export default CreateTicketModal;
