import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { FileText, ShieldCheck, Briefcase, Star, Download, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGetContracts } from '@/services/contractService';
import { useGetPolicies, useGetMyAcks, useAcknowledgePolicy } from '@/services/policyService';
import { useGetMyJD } from '@/services/jdService';
import { useToastContext } from '@/components/toast/ToastProvider';

const EmployeeDocuments: React.FC = () => {
  const toast = useToastContext();
  const { data: contracts = [], isLoading: cLoading } = useGetContracts();
  const { data: policies = [], isLoading: pLoading } = useGetPolicies();
  const { data: acks = [] } = useGetMyAcks();
  const { data: jd } = useGetMyJD();

  const acknowledged_ids = new Set((acks as any[]).map((a: any) => a.policy_id));

  const AckButton: React.FC<{ policyId: string }> = ({ policyId }) => {
    const ack = useAcknowledgePolicy(policyId);
    if (acknowledged_ids.has(policyId)) {
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

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Documents</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">Access your employment documents, contracts, and policies.</p>
      </div>

      {/* Job Description */}
      <Card className="border-none shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Briefcase size={18} /></div>
          <h2 className="text-lg font-black text-gray-900">Job Description</h2>
        </div>
        {jd ? (
          <div className="space-y-4">
            {jd.title && <div><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Title</span><p className="font-bold text-gray-900 mt-1">{(jd as any).title}</p></div>}
            {(jd as any).summary && <div><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Summary</span><p className="text-gray-700 mt-1 text-sm leading-relaxed">{(jd as any).summary}</p></div>}
            {(jd as any).responsibilities && <div><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Responsibilities</span><p className="text-gray-700 mt-1 text-sm whitespace-pre-line leading-relaxed">{(jd as any).responsibilities}</p></div>}
            {(jd as any).kpi_targets && <div><span className="text-xs font-black text-gray-400 uppercase tracking-widest">KPI Targets</span><p className="text-gray-700 mt-1 text-sm">{(jd as any).kpi_targets}</p></div>}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No job description assigned yet.</p>
        )}
      </Card>

      {/* Contracts */}
      <Card className="border-none shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><FileText size={18} /></div>
          <h2 className="text-lg font-black text-gray-900">Contracts</h2>
        </div>
        {cLoading ? <p className="text-sm text-gray-400">Loading...</p> :
         contracts.length === 0 ? <p className="text-sm text-gray-400 italic">No contracts found.</p> :
         contracts.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-black text-gray-900">{c.title}</p>
              <p className="text-xs text-gray-400">{c.type} · {c.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" className={cn('text-[10px] font-bold border rounded-lg px-2 py-0.5',
                c.status === 'SIGNED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100')}>
                {c.status}
              </Badge>
            </div>
          </div>
        ))}
      </Card>

      {/* Policies */}
      <Card className="border-none shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><ShieldCheck size={18} /></div>
          <h2 className="text-lg font-black text-gray-900">Company Policies</h2>
        </div>
        {pLoading ? <p className="text-sm text-gray-400">Loading...</p> :
         (policies as any[]).length === 0 ? <p className="text-sm text-gray-400 italic">No policies published yet.</p> :
         (policies as any[]).map((p: any) => (
          <div key={p.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
            <div className="flex-1">
              <p className="font-black text-gray-900">{p.title}</p>
              <p className="text-xs text-gray-400">{p.category} · v{p.version}</p>
              {p.is_mandatory && <span className="text-[10px] font-bold text-red-500">* Required</span>}
            </div>
            <AckButton policyId={p.id} />
          </div>
        ))}
      </Card>
    </div>
  );
};

export default EmployeeDocuments;
