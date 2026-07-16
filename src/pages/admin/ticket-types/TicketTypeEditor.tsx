import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, Copy, ChevronUp, ChevronDown, GripVertical, Sparkles,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { cn } from '@/utils/cn';
import { useTicketCategoriesQuery } from '@/services/ticketService';
import { useGetDepartmentsQuery } from '@/services/departmentService';

// ─── Field & Workflow type definitions (mirrors the backend's field_schema /
// workflow JSON shape exactly — see ticket-types.validation.js on the backend) ──

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'time' | 'checkbox' | 'switch'
  | 'select' | 'multiselect' | 'user' | 'employee' | 'team' | 'department'
  | 'project' | 'asset' | 'email' | 'phone' | 'url' | 'file' | 'image';

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'switch', label: 'Switch' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'user', label: 'User' },
  { value: 'employee', label: 'Employee' },
  { value: 'team', label: 'Team' },
  { value: 'department', label: 'Department' },
  { value: 'project', label: 'Project' },
  { value: 'asset', label: 'Asset' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image Upload' },
];

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help_text?: string;
  required?: boolean;
  default?: any;
  options?: string[];
}

interface SectionDef {
  section: string;
  fields: FieldDef[];
}

interface WorkflowStep {
  key: string;
  label: string;
  requires_approval?: boolean;
  notification_required?: boolean;
  auto_assign?: boolean;
  approver_role?: string;
}

function slugify(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
}

function new_field(existing_keys: Set<string>): FieldDef {
  let base = 'new_field', i = 1, key = base;
  while (existing_keys.has(key)) key = `${base}_${i++}`;
  return { key, label: 'New Field', type: 'text' };
}

function new_step(existing_keys: Set<string>): WorkflowStep {
  let base = 'NEW_STEP', i = 1, key = base;
  while (existing_keys.has(key)) key = `${base}_${i++}`;
  return { key, label: 'New Step' };
}

// ─── Field Builder ───────────────────────────────────────────────────────────

function FieldRow({
  field, onChange, onDuplicate, onDelete, onMove, isFirst, isLast, keyError,
}: {
  field: FieldDef; onChange: (f: FieldDef) => void; onDuplicate: () => void; onDelete: () => void;
  onMove: (dir: -1 | 1) => void; isFirst: boolean; isLast: boolean; keyError?: string;
}) {
  const needs_options = field.type === 'select' || field.type === 'multiselect';
  return (
    <div className="border border-gray-100 rounded-xl p-3 bg-white space-y-2.5">
      <div className="flex items-center gap-2">
        <GripVertical size={14} className="text-gray-300 shrink-0" />
        <input
          className="flex-1 h-8 px-2.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary-400"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
        />
        <select
          className="h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none"
          value={field.type}
          onChange={(e) => onChange({ ...field, type: e.target.value as FieldType })}
        >
          {FIELD_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => onMove(-1)} disabled={isFirst} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
        <button onClick={() => onMove(1)} disabled={isLast} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
        <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-primary-600"><Copy size={14} /></button>
        <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            className={cn('w-full h-8 px-2.5 border rounded-lg text-xs font-mono focus:outline-none', keyError ? 'border-red-300' : 'border-gray-200 focus:border-primary-400')}
            value={field.key}
            onChange={(e) => onChange({ ...field, key: e.target.value.replace(/[^a-z0-9_]/gi, '_') })}
            placeholder="internal_key"
          />
          {keyError && <p className="text-[10px] text-red-500 mt-0.5">{keyError}</p>}
        </div>
        <input
          className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
          value={field.placeholder || ''}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="Placeholder"
        />
        <input
          className="col-span-2 w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
          value={field.help_text || ''}
          onChange={(e) => onChange({ ...field, help_text: e.target.value })}
          placeholder="Help text (shown under the field)"
        />
        <input
          className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
          value={field.default ?? ''}
          onChange={(e) => onChange({ ...field, default: e.target.value })}
          placeholder="Default value"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 h-8">
          <input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ ...field, required: e.target.checked })} />
          Required
        </label>
      </div>

      {needs_options && (
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-1">Options (one per line) — first is default</label>
          <textarea
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
            rows={3}
            value={(field.options || []).join('\n')}
            onChange={(e) => onChange({ ...field, options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            placeholder={'Option A\nOption B'}
          />
        </div>
      )}
    </div>
  );
}

function FieldBuilder({ sections, onChange, duplicateKeys }: { sections: SectionDef[]; onChange: (s: SectionDef[]) => void; duplicateKeys: Set<string> }) {
  const all_keys = useMemo(() => new Set(sections.flatMap((s) => s.fields.map((f) => f.key))), [sections]);

  function update_section(i: number, next: SectionDef) {
    onChange(sections.map((s, idx) => (idx === i ? next : s)));
  }
  function add_section() {
    onChange([...sections, { section: `Section ${sections.length + 1}`, fields: [] }]);
  }
  function delete_section(i: number) {
    onChange(sections.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={si} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-sm font-bold bg-white focus:outline-none focus:border-primary-400"
              value={section.section}
              onChange={(e) => update_section(si, { ...section, section: e.target.value })}
            />
            <button onClick={() => delete_section(si)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>

          <div className="space-y-2">
            {section.fields.map((field, fi) => (
              <FieldRow
                key={fi}
                field={field}
                keyError={duplicateKeys.has(field.key) ? 'Duplicate key — must be unique across all sections' : undefined}
                onChange={(f) => update_section(si, { ...section, fields: section.fields.map((x, i) => (i === fi ? f : x)) })}
                onDuplicate={() => {
                  const dup = { ...field, key: `${field.key}_copy`, label: `${field.label} (Copy)` };
                  const fields = [...section.fields]; fields.splice(fi + 1, 0, dup);
                  update_section(si, { ...section, fields });
                }}
                onDelete={() => update_section(si, { ...section, fields: section.fields.filter((_, i) => i !== fi) })}
                onMove={(dir) => {
                  const target = fi + dir;
                  if (target < 0 || target >= section.fields.length) return;
                  const fields = [...section.fields];
                  [fields[fi], fields[target]] = [fields[target], fields[fi]];
                  update_section(si, { ...section, fields });
                }}
                isFirst={fi === 0}
                isLast={fi === section.fields.length - 1}
              />
            ))}
          </div>

          <button
            onClick={() => update_section(si, { ...section, fields: [...section.fields, new_field(all_keys)] })}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            <Plus size={14} />Add Field
          </button>
        </div>
      ))}

      <button onClick={add_section} className="flex items-center gap-2 px-3 h-9 border border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-primary-400 hover:text-primary-600 w-full justify-center">
        <Plus size={15} />Add Section
      </button>
    </div>
  );
}

// ─── Workflow Builder ────────────────────────────────────────────────────────

function WorkflowBuilder({ steps, onChange, duplicateNames }: { steps: WorkflowStep[]; onChange: (s: WorkflowStep[]) => void; duplicateNames: Set<string> }) {
  const all_keys = useMemo(() => new Set(steps.map((s) => s.key)), [steps]);

  function update(i: number, next: WorkflowStep) {
    onChange(steps.map((s, idx) => (idx === i ? next : s)));
  }

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col items-center pt-2.5">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[11px] font-black flex items-center justify-center">{i + 1}</span>
            {i < steps.length - 1 && <div className="w-px h-6 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 border border-gray-100 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <input
                className={cn('flex-1 h-8 px-2.5 border rounded-lg text-xs font-semibold focus:outline-none',
                  duplicateNames.has(step.label) ? 'border-red-300' : 'border-gray-200 focus:border-primary-400')}
                value={step.label}
                onChange={(e) => update(i, { ...step, label: e.target.value, key: slugify(e.target.value).toUpperCase() })}
                placeholder="Step name"
              />
              <button onClick={() => onChange(steps.filter((_, idx) => idx !== i))} disabled={steps.length <= 1} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
              <button onClick={() => { if (i === 0) return; const s = [...steps]; [s[i - 1], s[i]] = [s[i], s[i - 1]]; onChange(s); }} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => { if (i === steps.length - 1) return; const s = [...steps]; [s[i + 1], s[i]] = [s[i], s[i + 1]]; onChange(s); }} disabled={i === steps.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            {duplicateNames.has(step.label) && <p className="text-[10px] text-red-500">Duplicate step name</p>}
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!step.requires_approval} onChange={(e) => update(i, { ...step, requires_approval: e.target.checked })} />Approval required</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!step.notification_required} onChange={(e) => update(i, { ...step, notification_required: e.target.checked })} />Notification required</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!step.auto_assign} onChange={(e) => update(i, { ...step, auto_assign: e.target.checked })} />Auto assign</label>
            </div>
            {step.requires_approval && (
              <input
                className="w-full h-7 px-2 border border-gray-200 rounded-lg text-[11px] focus:outline-none focus:border-primary-400"
                value={step.approver_role || ''}
                onChange={(e) => update(i, { ...step, approver_role: e.target.value })}
                placeholder="Approver role (e.g. MANAGER)"
              />
            )}
          </div>
        </div>
      ))}
      <button onClick={() => onChange([...steps, new_step(all_keys)])} className="flex items-center gap-2 px-3 h-9 border border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-500 hover:border-primary-400 hover:text-primary-600 w-full justify-center">
        <Plus size={15} />Add Step
      </button>
    </div>
  );
}

// ─── Live Preview ────────────────────────────────────────────────────────────

function LivePreview({ label, sections, workflow }: { label: string; sections: SectionDef[]; workflow: WorkflowStep[] }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-5">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Create Ticket — {label || 'Untitled Type'}</p>
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] font-semibold text-gray-400">Priority</label><div className="h-8 mt-1 border border-gray-200 rounded-lg bg-gray-50" /></div>
            <div><label className="text-[11px] font-semibold text-gray-400">Severity</label><div className="h-8 mt-1 border border-gray-200 rounded-lg bg-gray-50" /></div>
          </div>
          {sections.map((s, si) => (
            <div key={si}>
              <p className="text-xs font-bold text-gray-700 mb-2">{s.section}</p>
              <div className="grid grid-cols-2 gap-3">
                {s.fields.map((f, fi) => (
                  <div key={fi} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      {f.label}{f.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className={cn('mt-1 border border-gray-200 rounded-lg bg-gray-50 flex items-center px-2 text-[11px] text-gray-400', f.type === 'textarea' ? 'h-14' : 'h-8')}>
                      {f.placeholder || `(${FIELD_TYPE_OPTIONS.find((t) => t.value === f.type)?.label})`}
                    </div>
                    {f.help_text && <p className="text-[10px] text-gray-400 mt-0.5">{f.help_text}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Workflow</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {workflow.map((w, i) => (
            <React.Fragment key={i}>
              <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide',
                w.requires_approval ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600')}>
                {w.label}
              </span>
              {i < workflow.length - 1 && <span className="text-gray-300">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Editor SlideOver ────────────────────────────────────────────────────────

type Tab = 'basic' | 'fields' | 'workflow' | 'preview';

export default function TicketTypeEditor({ type, onClose }: { type?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const is_edit = !!type?.id;
  const [tab, setTab] = useState<Tab>('basic');
  const [err, setErr] = useState('');

  const [key, setKey] = useState(type?.key || '');
  const [label, setLabel] = useState(type?.label || '');
  const [description, setDescription] = useState(type?.description || '');
  const [categoryId, setCategoryId] = useState(type?.category_id || '');
  const [departmentId, setDepartmentId] = useState(type?.department_id || '');
  const [teamId, setTeamId] = useState(type?.default_team_id || '');
  const [assigneeId, setAssigneeId] = useState(type?.default_assignee_id || '');
  const [projectAssociation, setProjectAssociation] = useState(type?.project_association || 'NONE');
  const [responseSla, setResponseSla] = useState(type?.response_sla_mins ?? '');
  const [resolutionSla, setResolutionSla] = useState(type?.resolution_sla_mins ?? '');
  const [sections, setSections] = useState<SectionDef[]>(type?.field_schema || [{ section: 'Details', fields: [] }]);
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(type?.workflow || [{ key: 'OPEN', label: 'Open' }, { key: 'CLOSED', label: 'Closed' }]);

  const { data: categories } = useTicketCategoriesQuery(true);
  const { data: departments } = useGetDepartmentsQuery();
  const { data: teams } = useQuery({
    queryKey: ['teams-for-editor'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TEAM.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });
  const { data: users } = useQuery({
    queryKey: ['users-for-editor'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=200`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const duplicate_keys = useMemo(() => {
    const all = sections.flatMap((s) => s.fields.map((f) => f.key));
    const seen = new Set<string>(), dupes = new Set<string>();
    for (const k of all) { if (seen.has(k)) dupes.add(k); seen.add(k); }
    return dupes;
  }, [sections]);

  const duplicate_step_names = useMemo(() => {
    const seen = new Set<string>(), dupes = new Set<string>();
    for (const w of workflow) { if (seen.has(w.label)) dupes.add(w.label); seen.add(w.label); }
    return dupes;
  }, [workflow]);

  const empty_required_fields = useMemo(
    () => sections.some((s) => s.fields.some((f) => !f.label.trim() || !f.key.trim())),
    [sections],
  );

  const has_errors = duplicate_keys.size > 0 || duplicate_step_names.size > 0 || empty_required_fields || !label.trim() || !categoryId || workflow.length === 0;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        key: key || slugify(label).toUpperCase(),
        label, description: description || null,
        category_id: categoryId,
        department_id: departmentId || null,
        default_team_id: teamId || null,
        default_assignee_id: assigneeId || null,
        project_association: projectAssociation,
        response_sla_mins: responseSla === '' ? null : +responseSla,
        resolution_sla_mins: resolutionSla === '' ? null : +resolutionSla,
        field_schema: sections,
        workflow,
      };
      return is_edit
        ? apiRequest<any>(API_ENDPOINTS.TICKET_TYPE.UPDATE(type.id), { method: 'PUT', body: JSON.stringify(payload) })
        : apiRequest<any>(API_ENDPOINTS.TICKET_TYPE.CREATE, { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket-types-page'] }); onClose(); },
    onError: (e: any) => setErr(e?.message || 'Failed to save'),
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'fields', label: 'Field Builder' },
    { id: 'workflow', label: 'Workflow Builder' },
    { id: 'preview', label: 'Live Preview' },
  ];

  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140]" onClick={onClose} />
      <motion.div
        key="panel"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-y-0 right-0 w-full md:w-[720px] bg-white shadow-2xl z-[141] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">{is_edit ? `Edit "${type.label}"` : 'New Ticket Type'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-3 py-2 text-xs font-bold rounded-t-lg transition-colors',
                tab === t.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'basic' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Ticket Type <span className="text-red-500">*</span></label>
                <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                  value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Hardware Request" />
              </div>
              {!is_edit && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Internal Key</label>
                  <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 uppercase"
                    value={key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))} placeholder="Auto-generated from name if left blank" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Category <span className="text-red-500">*</span></label>
                <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">Select a category</option>
                  {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
                <textarea className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" rows={2}
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Default Department</label>
                  <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                    <option value="">None</option>
                    {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Default Team</label>
                  <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                    <option value="">None</option>
                    {(teams || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Default Assignee</label>
                <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">None</option>
                  {(users || []).map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">Project Association</label>
                <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none" value={projectAssociation} onChange={(e) => setProjectAssociation(e.target.value)}>
                  <option value="NONE">Not applicable</option>
                  <option value="OPTIONAL">Optional</option>
                  <option value="REQUIRED">Required</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Response SLA (minutes)</label>
                  <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                    value={responseSla} onChange={(e) => setResponseSla(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Resolution SLA (minutes)</label>
                  <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
                    value={resolutionSla} onChange={(e) => setResolutionSla(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {tab === 'fields' && <FieldBuilder sections={sections} onChange={setSections} duplicateKeys={duplicate_keys} />}
          {tab === 'workflow' && <WorkflowBuilder steps={workflow} onChange={setWorkflow} duplicateNames={duplicate_step_names} />}
          {tab === 'preview' && <LivePreview label={label} sections={sections} workflow={workflow} />}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2">
          {err && <p className="text-red-500 text-xs">{err}</p>}
          {has_errors && (
            <p className="text-amber-600 text-xs flex items-center gap-1.5">
              <Sparkles size={12} />
              {duplicate_keys.size > 0 ? 'Fix duplicate field keys before saving.'
                : duplicate_step_names.size > 0 ? 'Fix duplicate workflow step names before saving.'
                : empty_required_fields ? 'All fields need a label and key.'
                : !categoryId ? 'Select a category.' : !label.trim() ? 'Ticket Type name is required.' : 'Workflow needs at least one step.'}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={has_errors || mutation.isPending}
              className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
              {mutation.isPending ? 'Saving…' : 'Save Ticket Type'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
