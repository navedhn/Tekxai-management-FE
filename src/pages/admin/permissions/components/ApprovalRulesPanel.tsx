import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  ApprovalRule, ApprovalRuleKey, useApprovalRules, useCreateApprovalRule, useUpdateApprovalRule, useDeleteApprovalRule,
} from '@/services/permissionsService';
import { ROLE_LABELS } from './RoleSelector';

const RULE_KEYS: ApprovalRuleKey[] = ['EXPENSE_APPROVAL', 'PURCHASE_APPROVAL', 'DISCOUNT_APPROVAL', 'LEAVE_APPROVAL', 'SALARY_APPROVAL', 'OVERTIME_APPROVAL'];

function ruleKeyLabel(key: string) {
  return key.replace(/_APPROVAL$/, '').replace(/_/g, ' ');
}

function CreateRuleModal({ roles, onClose }: { roles: string[]; onClose: () => void }) {
  const toast = useToastContext();
  const [ruleKey, setRuleKey] = useState<ApprovalRuleKey>('EXPENSE_APPROVAL');
  const [roleName, setRoleName] = useState(roles[0] || '');
  const [maxAmount, setMaxAmount] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const createMutation = useCreateApprovalRule();

  const handleSave = () => {
    createMutation.mutate(
      { rule_key: ruleKey, role_name: roleName, max_amount: maxAmount || undefined, currency },
      {
        onSuccess: () => { toast.success('Approval rule created'); onClose(); },
        onError: (e: any) => toast.error(e?.message || 'Failed to create rule'),
      },
    );
  };

  return (
    <Modal isOpen title="New Approval Rule" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Rule</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={ruleKey} onChange={(e) => setRuleKey(e.target.value as ApprovalRuleKey)}>
            {RULE_KEYS.map((k) => <option key={k} value={k}>{ruleKeyLabel(k)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1.5">Applies to Role</label>
          <select className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]?.label || r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Max Amount</label>
            <input type="number" className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="e.g. 500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Currency</label>
            <input className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={createMutation.isPending} className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
          {createMutation.isPending ? 'Saving…' : 'Create Rule'}
        </button>
      </div>
    </Modal>
  );
}

const ApprovalRulesPanel: React.FC<{ roles: string[] }> = ({ roles }) => {
  const toast = useToastContext();
  const { data: rules = [], isLoading } = useApprovalRules();
  const updateMutation = useUpdateApprovalRule();
  const deleteMutation = useDeleteApprovalRule();
  const [createOpen, setCreateOpen] = useState(false);

  const toggleActive = (rule: ApprovalRule) => {
    updateMutation.mutate({ id: rule.id, is_active: !rule.is_active }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update rule'),
    });
  };

  const handleDelete = (rule: ApprovalRule) => {
    deleteMutation.mutate(rule.id, {
      onSuccess: () => toast.success('Approval rule deleted'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete rule'),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900">Approval Thresholds</h3>
          <p className="text-xs text-gray-400 mt-0.5">Configurable limits on top of the binary Approve permission — not hardcoded.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 h-9 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700">
          <Plus size={14} /> Add Rule
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">No approval rules configured yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Switch checked={rule.is_active} onChange={() => toggleActive(rule)} size="sm" />
                <div>
                  <p className="text-sm font-bold text-gray-800">{ruleKeyLabel(rule.rule_key)}</p>
                  <p className="text-xs text-gray-400">
                    {rule.role_name ? (ROLE_LABELS[rule.role_name]?.label || rule.role_name) : rule.user_id ? 'Specific user' : '—'}
                    {rule.max_amount ? ` · up to ${rule.max_amount} ${rule.currency || ''}` : ' · no limit set'}
                    {rule.scope !== 'ALL' ? ` · scope: ${rule.scope}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(rule)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {createOpen && <CreateRuleModal roles={roles} onClose={() => setCreateOpen(false)} />}
    </div>
  );
};

export default ApprovalRulesPanel;
