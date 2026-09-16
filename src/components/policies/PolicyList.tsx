import React from 'react';
import Button from '@/components/ui/Button';
import { Eye, CheckCircle } from 'lucide-react';
import { useGetPolicies, useGetMyAcks, useAcknowledgePolicy, useGetPolicyFile } from '@/services/policyService';
import { useToastContext } from '@/components/toast/ToastProvider';

// Shared "published policies I can view/acknowledge" list — used by both the
// My Documents page (for users who also hold erp.my_documents.view) and the
// standalone Policies page reachable straight from the sidebar for anyone
// who only holds hr.policies.view. Visibility of drafts vs. published is
// already enforced server-side (list_policies), so this component only
// needs to render whatever the API returns.
const PolicyFileLink: React.FC<{ policyId: string }> = ({ policyId }) => {
  const toast = useToastContext();
  const getFile = useGetPolicyFile();
  return (
    <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1"
      onClick={async () => {
        try {
          const { url } = await getFile.mutateAsync(policyId);
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch { toast.error('Failed to open document'); }
      }}>
      <Eye size={12} /> Document
    </Button>
  );
};

const AckButton: React.FC<{ policyId: string; acknowledged: boolean }> = ({ policyId, acknowledged }) => {
  const toast = useToastContext();
  const ack = useAcknowledgePolicy(policyId);
  if (acknowledged) {
    return <span className="flex items-center gap-1 text-green-500 text-xs font-bold"><CheckCircle size={12} /> Acknowledged</span>;
  }
  return (
    <Button size="sm" variant="outline" className="rounded-xl h-7 text-xs gap-1"
      onClick={() => ack.mutate(undefined, { onSuccess: () => toast.success('Policy acknowledged') })}
      loading={ack.isPending}>
      Acknowledge
    </Button>
  );
};

export const PolicyList: React.FC<{ emptyMessage?: string }> = ({ emptyMessage = 'No policies published yet.' }) => {
  const { data: policies = [], isLoading } = useGetPolicies();
  const { data: acks = [] } = useGetMyAcks();
  const acknowledgedIds = new Set((acks as any[]).map((a: any) => a.policy_id));

  if (isLoading) return <p className="text-sm text-gray-400 italic">Loading…</p>;
  if ((policies as any[]).length === 0) return <p className="text-sm text-gray-400 italic">{emptyMessage}</p>;

  return (
    <>
      {(policies as any[]).map((p: any) => (
        <div key={p.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
          <div className="flex-1">
            <p className="font-black text-gray-900">{p.title}</p>
            <p className="text-xs text-gray-400">{p.category} · v{p.version}</p>
            {p.is_mandatory && <span className="text-[10px] font-bold text-red-500">* Required</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {p.file_key && <PolicyFileLink policyId={p.id} />}
            <AckButton policyId={p.id} acknowledged={acknowledgedIds.has(p.id)} />
          </div>
        </div>
      ))}
    </>
  );
};
