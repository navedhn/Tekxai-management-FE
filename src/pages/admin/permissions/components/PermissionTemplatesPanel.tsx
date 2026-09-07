import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useTemplates, useCreateTemplate, useDeleteTemplate, useApplyTemplate, PermissionTemplate } from '@/services/permissionsService';
import { ROLE_LABELS } from './RoleSelector';

function CreateTemplateModal({ roles, onClose }: { roles: string[]; onClose: () => void }) {
  const toast = useToastContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFromRole, setCopyFromRole] = useState('');
  const createMutation = useCreateTemplate();

  const handleSave = () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    createMutation.mutate(
      { name: name.trim(), description: description || undefined, copy_from_role: copyFromRole || undefined },
      {
        onSuccess: () => { toast.success('Template created'); onClose(); },
        onError: (e: any) => toast.error(e?.message || 'Failed to create template'),
      },
    );
  };

  return (
    <Modal isOpen title="New Permission Template" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Template Name <span className="text-red-500">*</span></label>
          <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Executive Template" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
          <textarea className="w-full h-20 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this template is for…" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Seed from an existing role's permissions (optional)</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={copyFromRole} onChange={(e) => setCopyFromRole(e.target.value)}>
            <option value="">Start blank</option>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={createMutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
          {createMutation.isPending ? 'Creating…' : 'Create Template'}
        </button>
      </div>
    </Modal>
  );
}

function ApplyTemplateModal({ template, roles, onClose }: { template: PermissionTemplate; roles: string[]; onClose: () => void }) {
  const toast = useToastContext();
  const [roleName, setRoleName] = useState(roles[0] || '');
  const applyMutation = useApplyTemplate();

  const handleApply = () => {
    applyMutation.mutate({ templateId: template.id, roleName }, {
      onSuccess: (res: any) => { toast.success(res?.message || 'Template applied'); onClose(); },
      onError: (e: any) => toast.error(e?.message || 'Failed to apply template'),
    });
  };

  return (
    <Modal isOpen title={`Apply "${template.name}"`} onClose={onClose} size="sm">
      <p className="text-sm text-gray-500 mb-4">This adds every permission in the template to the selected role. Existing grants the role already has are left untouched.</p>
      <label className="text-xs font-semibold text-gray-500 block mb-1.5">Target Role</label>
      <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
        {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>)}
      </select>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleApply} disabled={applyMutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
          {applyMutation.isPending ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </Modal>
  );
}

const PermissionTemplatesPanel: React.FC<{ roles: string[] }> = ({ roles }) => {
  const toast = useToastContext();
  const { data: templates = [], isLoading } = useTemplates();
  const deleteMutation = useDeleteTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<PermissionTemplate | null>(null);

  const handleDelete = (tpl: PermissionTemplate) => {
    deleteMutation.mutate(tpl.id, {
      onSuccess: () => toast.success('Template deleted'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete template'),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900">Permission Templates</h3>
          <p className="text-xs text-gray-400 mt-0.5">Build once, apply to any role — onboarding a new role no longer means re-declaring its whole permission set by hand.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 h-9 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700">
          <Plus size={14} /> New Template
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">No templates yet. Create one from an existing role's permissions.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-bold text-gray-800">{tpl.name}</p>
                <p className="text-xs text-gray-400">{tpl.description || 'No description'} · {tpl._count?.items ?? 0} permissions</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setApplyTarget(tpl)} className="flex items-center gap-1 px-2.5 h-8 text-xs font-bold text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50">
                  <Copy size={12} /> Apply to Role
                </button>
                <button onClick={() => handleDelete(tpl)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateTemplateModal roles={roles} onClose={() => setCreateOpen(false)} />}
      {applyTarget && <ApplyTemplateModal template={applyTarget} roles={roles} onClose={() => setApplyTarget(null)} />}
    </div>
  );
};

export default PermissionTemplatesPanel;
