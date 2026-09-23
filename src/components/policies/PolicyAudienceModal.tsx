import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Globe, Building2, Users2 } from 'lucide-react';
import { useGetPolicyTargets, useSetPolicyTargets, PolicyTarget } from '@/services/policyService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useGetTeamsQuery } from '@/services/adminService';
import { useToastContext } from '@/components/toast/ToastProvider';

// Phase 2 — who a published policy is actually visible to. Mirrors the
// backend's own model exactly: an empty target set means invisible to
// everyone (not "everyone"), so "Everyone" here is its own explicit radio
// choice that writes a single { target_type: 'all' } row, never an implicit
// default. Business Unit / Team are additive multi-selects on top of that.
interface PolicyAudienceModalProps {
  policyId: string;
  policyTitle: string;
  onClose: () => void;
}

const PolicyAudienceModal: React.FC<PolicyAudienceModalProps> = ({ policyId, policyTitle, onClose }) => {
  const toast = useToastContext();
  const { data: targets = [], isLoading } = useGetPolicyTargets(policyId);
  const { data: businessUnits = [] } = useGetBusinessUnitsQuery();
  const { data: teamsData } = useGetTeamsQuery();
  const teams = (teamsData as any)?.payload?.records || (teamsData as any)?.payload || [];
  const setTargets = useSetPolicyTargets();

  const [mode, setMode] = useState<'all' | 'scoped'>('all');
  const [businessUnitIds, setBusinessUnitIds] = useState<Set<string>>(new Set());
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoading) return;
    const hasAll = targets.some((t) => t.target_type === 'all');
    setMode(hasAll || targets.length === 0 ? 'all' : 'scoped');
    setBusinessUnitIds(new Set(targets.filter((t) => t.target_type === 'business_unit').map((t) => t.target_value)));
    setTeamIds(new Set(targets.filter((t) => t.target_type === 'team').map((t) => t.target_value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, targets.length]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleSave = () => {
    let payload: Array<{ target_type: string; target_value: string }>;
    if (mode === 'all') {
      payload = [{ target_type: 'all', target_value: 'ALL' }];
    } else {
      payload = [
        ...Array.from(businessUnitIds).map((id) => ({ target_type: 'business_unit', target_value: id })),
        ...Array.from(teamIds).map((id) => ({ target_type: 'team', target_value: id })),
      ];
      if (payload.length === 0) {
        toast.error('Select at least one Business Unit or Team, or choose "Everyone"');
        return;
      }
    }
    setTargets.mutate({ id: policyId, targets: payload }, {
      onSuccess: () => { toast.success('Audience updated'); onClose(); },
      onError: () => toast.error('Failed to update audience'),
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={`Audience — ${policyTitle}`}>
      <div className="flex flex-col gap-4 mt-4">
        {isLoading ? (
          <p className="text-sm text-gray-400 italic py-6 text-center">Loading current audience…</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Who should see and be required to acknowledge this policy once published.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`flex items-center gap-3 px-4 h-12 rounded-xl border text-sm font-bold text-left ${mode === 'all' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}
              >
                <Globe size={16} /> Everyone in the company
              </button>
              <button
                type="button"
                onClick={() => setMode('scoped')}
                className={`flex items-center gap-3 px-4 h-12 rounded-xl border text-sm font-bold text-left ${mode === 'scoped' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}
              >
                <Building2 size={16} /> Specific Business Units / Teams
              </button>
            </div>

            {mode === 'scoped' && (
              <div className="flex flex-col gap-4 pl-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
                    <Building2 size={12} /> Business Units
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {(businessUnits as any[]).map((bu) => (
                      <button
                        key={bu.id}
                        type="button"
                        onClick={() => toggle(businessUnitIds, setBusinessUnitIds, bu.id)}
                        className={`px-3 h-8 rounded-full text-xs font-bold border ${businessUnitIds.has(bu.id) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {bu.name}
                      </button>
                    ))}
                    {(businessUnits as any[]).length === 0 && <span className="text-xs text-gray-400">No business units found.</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
                    <Users2 size={12} /> Teams
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {(teams as any[]).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(teamIds, setTeamIds, t.id)}
                        className={`px-3 h-8 rounded-full text-xs font-bold border ${teamIds.has(t.id) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                    {(teams as any[]).length === 0 && <span className="text-xs text-gray-400">No teams found.</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
              <Button type="button" variant="primary" fullWidth loading={setTargets.isPending} onClick={handleSave}>
                Save Audience
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PolicyAudienceModal;
