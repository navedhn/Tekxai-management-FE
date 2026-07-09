import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useGetPolicies } from '@/services/policyService';

// Policy Status — HR-facing view of an employee's standing against all
// mandatory, published company policies (Milestone 5). This is distinct from
// the existing "Policy Acknowledgements" card in HistorySection, which only
// ever lists what the employee HAS acknowledged. Here we cross-reference the
// full mandatory policy catalog (fetched via useGetPolicies) against the
// employee's own acknowledgement records to surface what's still Outstanding.
// Read-only — HR views status here, the employee acknowledges elsewhere.

export interface PolicyStatusSectionProps {
  policy_acknowledgements: any[];
}

const PolicyStatusSection: React.FC<PolicyStatusSectionProps> = ({ policy_acknowledgements }) => {
  const { data: policies = [], isLoading } = useGetPolicies();

  const mandatoryPolicies = (policies as any[]).filter((p: any) => p.is_mandatory && p.is_published);

  const ackByPolicyId = new Map<string, any>();
  (policy_acknowledgements || []).forEach((pa: any) => {
    const policyId = pa.policy?.id ?? pa.policy_id;
    if (policyId) ackByPolicyId.set(policyId, pa);
  });

  const acknowledged = mandatoryPolicies
    .filter((p: any) => ackByPolicyId.has(p.id))
    .map((p: any) => ({ policy: p, ack: ackByPolicyId.get(p.id) }));

  const outstanding = mandatoryPolicies.filter((p: any) => !ackByPolicyId.has(p.id));

  return (
    <Card>
      <h3 className="text-base font-black text-gray-900 mb-4">Policy Status</h3>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading policy status…</p>
      ) : mandatoryPolicies.length === 0 ? (
        <p className="text-sm text-gray-400">No mandatory published policies found</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-red-500" />Outstanding ({outstanding.length})
            </p>
            {outstanding.length > 0 ? (
              <div className="space-y-2">
                {outstanding.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                    <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', 'bg-red-50 text-red-700 border-red-100')}>
                      Outstanding
                    </Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No outstanding policies — all mandatory policies acknowledged</p>}
          </div>

          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-green-500" />Acknowledged ({acknowledged.length})
            </p>
            {acknowledged.length > 0 ? (
              <div className="space-y-2">
                {acknowledged.map(({ policy: p, ack }: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{ack?.acknowledged_at ? new Date(ack.acknowledged_at).toLocaleDateString() : '—'}</span>
                      <Badge className={cn('border text-[10px] font-bold px-2 py-0.5 rounded-full', 'bg-green-50 text-green-700 border-green-100')}>
                        Acknowledged
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No mandatory policies acknowledged yet</p>}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PolicyStatusSection;
