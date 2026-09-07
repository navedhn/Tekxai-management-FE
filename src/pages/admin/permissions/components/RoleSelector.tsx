import React, { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import Modal from '@/components/ui/Modal';
import { useRoleEntities, useCreateRole, useDeleteRole, useTemplates } from '@/services/permissionsService';

export const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  HR: { label: 'HR', color: 'bg-green-100 text-green-700' },
  DIVISION_MANAGER: { label: 'Division Manager', color: 'bg-purple-100 text-purple-700' },
  TEAM_LEAD: { label: 'Team Lead', color: 'bg-indigo-100 text-indigo-700' },
  MARKETING: { label: 'Marketing / CRM', color: 'bg-orange-100 text-orange-700' },
  EMPLOYEE: { label: 'Employee', color: 'bg-gray-100 text-gray-700' },
};

function CreateRoleModal({ roles, onClose, onCreated }: { roles: string[]; onClose: () => void; onCreated: (roleName: string) => void }) {
  const toast = useToastContext();
  const [name, setName] = useState('');
  const [level, setLevel] = useState(40);
  const [source, setSource] = useState<'blank' | 'role' | 'template'>('blank');
  const [copyFromRole, setCopyFromRole] = useState(roles[0] || '');
  const [templateId, setTemplateId] = useState('');
  const { data: templates = [] } = useTemplates();
  const createMutation = useCreateRole();

  const handleCreate = () => {
    if (!name.trim()) { toast.error('Role name is required'); return; }
    createMutation.mutate(
      {
        name: name.trim(),
        level,
        copy_from_role: source === 'role' ? copyFromRole : undefined,
        apply_template_id: source === 'template' ? templateId : undefined,
      },
      {
        onSuccess: (res: any) => { toast.success('Role created'); onCreated(res?.payload?.name); onClose(); },
        onError: (e: any) => toast.error(e?.message || 'Failed to create role'),
      },
    );
  };

  return (
    <Modal isOpen title="New Role" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Role Name <span className="text-red-500">*</span></label>
          <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Executive" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Level <span className="text-gray-400 font-normal">(higher = more senior)</span></label>
          <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-2">Starting Permissions</label>
          <div className="flex flex-col gap-2">
            {(['blank', 'role', 'template'] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" checked={source === opt} onChange={() => setSource(opt)} />
                {opt === 'blank' ? 'Start from blank' : opt === 'role' ? 'Copy another role' : 'Copy a template'}
              </label>
            ))}
          </div>
          {source === 'role' && (
            <select className="w-full h-10 px-3 mt-2 border border-gray-200 rounded-xl text-sm" value={copyFromRole} onChange={(e) => setCopyFromRole(e.target.value)}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>)}
            </select>
          )}
          {source === 'template' && (
            <select className="w-full h-10 px-3 mt-2 border border-gray-200 rounded-xl text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select a template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
          {createMutation.isPending ? 'Creating…' : 'Create Role'}
        </button>
      </div>
    </Modal>
  );
}

interface RoleSelectorProps {
  roles: string[];
  selectedRole: string;
  onSelect: (role: string) => void;
  grantCounts?: Record<string, number>;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ roles, selectedRole, onSelect, grantCounts }) => {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const toast = useToastContext();
  const { data: roleEntities = [] } = useRoleEntities();
  const deleteMutation = useDeleteRole();

  const filtered = roles.filter((r) => {
    const label = ROLE_LABELS[r]?.label || r;
    return label.toLowerCase().includes(search.toLowerCase()) || r.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = (role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const entity = roleEntities.find((r) => r.name === role);
    if (!entity) return;
    if (!window.confirm(`Delete role "${ROLE_LABELS[role]?.label || role}"? This cannot be undone.`)) return;
    deleteMutation.mutate(entity.id, {
      onSuccess: () => toast.success('Role deleted'),
      onError: (err: any) => toast.error(err?.message || 'Failed to delete role'),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-100 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles…"
            className="w-full h-9 pl-8 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        <button onClick={() => setCreateOpen(true)} title="New role" className="shrink-0 w-9 h-9 flex items-center justify-center bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100">
          <Plus size={16} />
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No roles match "{search}"</p>
        ) : filtered.map((role) => {
          const meta = ROLE_LABELS[role];
          const isActive = role === selectedRole;
          const entity = roleEntities.find((r) => r.name === role);
          return (
            <button
              key={role}
              onClick={() => onSelect(role)}
              className={cn(
                'group w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors mb-1',
                isActive ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isActive ? 'bg-primary-500' : 'bg-gray-300')} />
                {meta?.label || role}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {grantCounts?.[role] !== undefined && (
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', meta?.color || 'bg-gray-100 text-gray-500')}>
                    {grantCounts[role]}
                  </span>
                )}
                {entity && !entity.is_system && (
                  <span onClick={(e) => handleDelete(role, e)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-opacity">
                    <Trash2 size={12} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {createOpen && <CreateRoleModal roles={roles} onClose={() => setCreateOpen(false)} onCreated={onSelect} />}
    </div>
  );
};

export default RoleSelector;
