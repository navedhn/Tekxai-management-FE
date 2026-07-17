import React, { useMemo, useState } from 'react';
import { AlertTriangle, Link2, Plus, Search, Trash2 } from 'lucide-react';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import Loader from './Loader';
import StatusDropdown from './StatusDropdown';
import ActionModal from './ActionModal';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useCreateDependency, useDeleteDependency, useDependencies, useUpdateDependency,
  type DependencyInput, type DependencyStatus, type DependencyType, type ProjectDependency,
} from '@/services/dependenciesService';
import { cn } from '@/utils/cn';

const DEPENDENCY_TYPE_OPTIONS: { label: string; value: DependencyType }[] = [
  { label: 'GitHub', value: 'GITHUB' },
  { label: 'Server', value: 'SERVER' },
  { label: 'Domain', value: 'DOMAIN' },
  { label: 'SMTP', value: 'SMTP' },
  { label: 'OpenAI', value: 'OPENAI' },
  { label: 'Anthropic', value: 'ANTHROPIC' },
  { label: 'Gemini', value: 'GEMINI' },
  { label: 'Stripe', value: 'STRIPE' },
  { label: 'Twilio', value: 'TWILIO' },
  { label: 'Firebase', value: 'FIREBASE' },
  { label: 'Supabase', value: 'SUPABASE' },
  { label: 'AWS', value: 'AWS' },
  { label: 'DigitalOcean', value: 'DIGITALOCEAN' },
  { label: 'Cloudflare', value: 'CLOUDFLARE' },
  { label: 'Google OAuth', value: 'GOOGLE_OAUTH' },
  { label: 'Apple Developer', value: 'APPLE_DEVELOPER' },
  { label: 'Play Store', value: 'PLAY_STORE' },
  { label: 'Other', value: 'OTHER' },
];

const STATUS_OPTIONS: { label: string; value: DependencyStatus; colorClassName: string }[] = [
  { label: 'Not Started', value: 'NOT_STARTED', colorClassName: 'bg-gray-50 text-gray-500 border-gray-200' },
  { label: 'Waiting', value: 'WAITING', colorClassName: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Active', value: 'ACTIVE', colorClassName: 'bg-blue-50 text-blue-600 border-blue-200' },
  { label: 'Blocked', value: 'BLOCKED', colorClassName: 'bg-red-50 text-red-600 border-red-200' },
  { label: 'Completed', value: 'COMPLETED', colorClassName: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
];

const STATUS_FILTER_OPTIONS = [{ label: 'All Statuses', value: 'ALL' }, ...STATUS_OPTIONS];

const EMPTY_FORM: DependencyInput = {
  name: '', type: 'OTHER', category: '', owner: '', status: 'NOT_STARTED',
  vendor: '', external_url: '', notes: '', blocking: false,
};

interface DependenciesPanelProps {
  projectId: string;
  canEdit: boolean;
}

const DependenciesPanel: React.FC<DependenciesPanelProps> = ({ projectId, canEdit }) => {
  const toast = useToastContext();
  const { data: dependencies = [], isLoading } = useDependencies(projectId);
  const createDependency = useCreateDependency(projectId);
  const updateDependency = useUpdateDependency(projectId);
  const deleteDependency = useDeleteDependency(projectId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DependencyInput>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DependencyStatus | 'ALL'>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<ProjectDependency | null>(null);

  const filtered = useMemo(() => {
    return dependencies.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.vendor?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [dependencies, search, statusFilter]);

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Name is required');
    createDependency.mutate(form, {
      onSuccess: () => { toast.success('Dependency added'); setForm(EMPTY_FORM); setShowForm(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add dependency'),
    });
  };

  const handleStatusChange = (dependencyId: string, status: string) => {
    updateDependency.mutate({ dependencyId, updates: { status: status as DependencyStatus } }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update status'),
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteDependency.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Dependency removed'); setDeleteTarget(null); },
      onError: (e: any) => { toast.error(e?.message || 'Failed to remove dependency'); setDeleteTarget(null); },
    });
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center justify-between gap-3 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link2 size={18} strokeWidth={2.5} className="text-primary-500" />
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Dependencies</h3>
        </div>
        {canEdit && (
          <Button leftIcon={Plus} onClick={() => setShowForm((s) => !s)} className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4">
            Add Dependency
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-6">
        {showForm && (
          <div className="flex flex-col gap-3 p-4 bg-gray-50/60 rounded-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Production Server" />
              <Select label="Type *" options={DEPENDENCY_TYPE_OPTIONS} value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v as DependencyType }))} />
              <Input label="Category" value={form.category || ''} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Infrastructure" />
              <Input label="Owner" value={form.owner || ''} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="Who owns access" />
              <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as DependencyStatus }))} />
              <Input label="Vendor" value={form.vendor || ''} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name" />
              <Input label="External URL" value={form.external_url || ''} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} placeholder="https://..." containerClassName="sm:col-span-2" />
            </div>
            <Textarea label="Notes" value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." className="min-h-[60px]" />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" checked={!!form.blocking} onChange={(e) => setForm((f) => ({ ...f, blocking: e.target.checked }))} />
              This dependency is currently blocking the project
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="h-9 rounded-xl font-bold text-xs px-4">Cancel</Button>
              <Button onClick={handleSubmit} disabled={createDependency.isPending} className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-4">
                {createDependency.isPending ? 'Saving…' : 'Save Dependency'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
              placeholder="Search dependencies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as DependencyStatus | 'ALL')}
            containerClassName="sm:w-48"
          />
        </div>

        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {!isLoading && filtered.length === 0 && (
          <span className="text-xs text-gray-400 italic">
            {dependencies.length === 0 ? 'No dependencies tracked yet for this project.' : 'No dependencies match your search.'}
          </span>
        )}

        {filtered.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 p-4 bg-gray-50/60 rounded-2xl group relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {d.blocking && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                <span className="text-sm font-black text-gray-900">{d.name}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider bg-white border border-gray-100 px-2 py-0.5 rounded-lg">
                  {DEPENDENCY_TYPE_OPTIONS.find((o) => o.value === d.type)?.label || d.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <StatusDropdown value={d.status} options={STATUS_OPTIONS} onChange={(v) => handleStatusChange(d.id, v)} />
                ) : (
                  <span className={cn('inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-black tracking-tight border', STATUS_OPTIONS.find((o) => o.value === d.status)?.colorClassName)}>
                    {STATUS_OPTIONS.find((o) => o.value === d.status)?.label || d.status}
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setDeleteTarget(d)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
              {d.category && <span>Category: <span className="text-gray-700 font-bold">{d.category}</span></span>}
              {d.owner && <span>Owner: <span className="text-gray-700 font-bold">{d.owner}</span></span>}
              {d.vendor && <span>Vendor: <span className="text-gray-700 font-bold">{d.vendor}</span></span>}
              {d.external_url && (
                <a href={d.external_url} target="_blank" rel="noreferrer" className="text-primary-600 font-bold hover:underline">
                  {d.external_url}
                </a>
              )}
            </div>
            {d.notes && <p className="text-xs text-gray-500 italic">{d.notes}</p>}
          </div>
        ))}
      </div>

      <ActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Dependency"
        description={`Are you sure you want to remove "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Remove"
        confirmVariant="danger"
        icon="delete"
        loading={deleteDependency.isPending}
      />
    </div>
  );
};

export default DependenciesPanel;
