import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Flame, Briefcase, Linkedin, Mail, Filter, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD'];

const STAGE_COLORS: Record<string, string> = {
  NEW:           'bg-gray-100 text-gray-700',
  CONTACTED:     'bg-blue-100 text-blue-700',
  QUALIFIED:     'bg-cyan-100 text-cyan-700',
  PROPOSAL_SENT: 'bg-purple-100 text-purple-700',
  NEGOTIATION:   'bg-yellow-100 text-yellow-700',
  WON:           'bg-green-100 text-green-700',
  LOST:          'bg-red-100 text-red-700',
  ON_HOLD:       'bg-orange-100 text-orange-700',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  upwork:   <Briefcase size={14} />,
  linkedin: <Linkedin size={14} />,
  email:    <Mail size={14} />,
};

const fmt_usd = (v: number) =>
  v ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '—';

function useLeads(filters: any) {
  return useQuery({
    queryKey: ['crm-leads', filters],
    queryFn: () => apiRequest<any>('api/v1/crm/leads'),
  });
}

function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ source, id, pipeline_stage }: { source: string; id: string; pipeline_stage: string }) =>
      apiRequest<any>(`api/v1/crm/leads/${source}/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ pipeline_stage }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      // Stage changes shift pipeline aggregates shown on the CRM dashboard.
      qc.invalidateQueries({ queryKey: ['crm-dashboard'] });
    },
  });
}

const CRMPipeline: React.FC = () => {
  const [source, setSource]     = useState('');
  const [stage, setStage]       = useState('');
  const [is_hot, setIsHot]      = useState('');
  const [stageModal, setStageModal] = useState<{ lead: any } | null>(null);

  const { data, isLoading } = useLeads({ source: source || undefined, stage: stage || undefined, is_hot: is_hot || undefined });
  const updateStage = useUpdateStage();

  const leads: any[] = (data as any)?.payload?.records ?? (data as any)?.records ?? [];

  const handleStageChange = (lead: any, new_stage: string) => {
    updateStage.mutate({ source: lead._source, id: lead.id, pipeline_stage: new_stage });
    setStageModal(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM Pipeline</h1>
        <p className="text-sm text-gray-500 font-medium">Unified view of all leads across Upwork, LinkedIn, and Email channels.</p>
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-gray-400" />
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700"
          >
            <option value="">All Sources</option>
            <option value="upwork">Upwork</option>
            <option value="linkedin">LinkedIn</option>
            <option value="email">Email</option>
          </select>
          <select
            value={stage}
            onChange={e => setStage(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700"
          >
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select
            value={is_hot}
            onChange={e => setIsHot(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-700"
          >
            <option value="">All Leads</option>
            <option value="true">Hot Only</option>
          </select>
          {(source || stage || is_hot) && (
            <button
              onClick={() => { setSource(''); setStage(''); setIsHot(''); }}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </Card>

      {/* Stage tiles summary */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {STAGES.map(s => {
          const count = leads.filter(l => l.pipeline_stage === s).length;
          return (
            <button
              key={s}
              onClick={() => setStage(stage === s ? '' : s)}
              className={`text-center p-2 rounded-xl border-2 transition-all ${stage === s ? 'border-[#005CDA] shadow-md' : 'border-transparent bg-gray-50'}`}
            >
              <div className="text-lg font-black text-gray-800">{count}</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{s.replace(/_/g, ' ')}</div>
            </button>
          );
        })}
      </div>

      {/* Lead cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-gray-100">
          <p className="text-gray-400 font-bold">No leads found for the selected filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead: any) => (
            <Card key={`${lead._source}-${lead.id}`} className="p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{SOURCE_ICONS[lead._source]}</span>
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">{lead._source}</span>
                  {lead.is_hot && <Flame size={14} className="text-orange-500" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${STAGE_COLORS[lead.pipeline_stage] || 'bg-gray-100 text-gray-600'}`}>
                  {lead.pipeline_stage?.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <div className="text-sm font-black text-gray-900 leading-snug">{lead.title}</div>
                {lead.contact_name && <div className="text-xs text-gray-400 font-medium mt-0.5">{lead.contact_name}</div>}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-green-600">{fmt_usd(lead.value)}</span>
                <span className="text-xs text-gray-400 font-medium">
                  {lead.owner ? `${lead.owner.first_name} ${lead.owner.last_name}` : '—'}
                </span>
              </div>

              {/* Stage selector */}
              <select
                value={lead.pipeline_stage || 'NEW'}
                onChange={e => handleStageChange(lead, e.target.value)}
                disabled={updateStage.isPending}
                className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 font-bold text-gray-600 w-full bg-gray-50"
              >
                {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </Card>
          ))}
        </div>
      )}

      {/* Stage legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {STAGES.map(s => (
          <span key={s} className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${STAGE_COLORS[s]}`}>
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CRMPipeline;
