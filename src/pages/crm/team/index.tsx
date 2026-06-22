import React from 'react';
import Card from '@/components/ui/Card';
import { Users, User, ChevronRight } from 'lucide-react';
import { useGetTeamHierarchy } from '@/services/crmService';

const CRMTeam: React.FC = () => {
  const { data, isLoading } = useGetTeamHierarchy();
  const members: any[] = Array.isArray(data) ? data : (data as any)?.payload ?? [];

  // Separate TLs (with subordinates) and individual contributors
  const team_leads = members.filter(m => m.subordinates?.length > 0);
  const solo = members.filter(m => !m.subordinates?.length && !m.supervisor_id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM Team Hierarchy</h1>
        <p className="text-sm text-gray-500 font-medium">View and manage team lead → resource assignment structure for the CRM workspace.</p>
      </div>

      {members.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border border-gray-100">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-bold">No CRM team members found.</p>
          <p className="text-xs text-gray-400 mt-1">Assign users to the CRM workspace via User Management to see them here.</p>
        </Card>
      ) : (
        <>
          {team_leads.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Team Leads</h2>
              {team_leads.map((tl: any) => (
                <Card key={tl.id} className="p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#005CDA]/10 flex items-center justify-center text-[#005CDA] font-black uppercase">
                      {tl.first_name?.[0]}{tl.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-black text-gray-900">{tl.first_name} {tl.last_name}</div>
                      <div className="text-xs text-gray-400 font-medium">{tl.designation || 'Team Lead'}</div>
                    </div>
                    <span className="ml-auto text-xs font-black text-[#005CDA] bg-blue-50 px-2 py-0.5 rounded-lg">Team Lead</span>
                  </div>

                  <div className="ml-4 border-l-2 border-gray-100 pl-4 flex flex-col gap-2">
                    {tl.subordinates?.map((sub: any) => (
                      <div key={sub.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black uppercase text-xs">
                          {sub.first_name?.[0]}{sub.last_name?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-800">{sub.first_name} {sub.last_name}</div>
                          <div className="text-xs text-gray-400 font-medium">{sub.designation || 'Resource'}</div>
                        </div>
                      </div>
                    ))}
                    {!tl.subordinates?.length && (
                      <p className="text-xs text-gray-400 font-medium">No resources assigned</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {solo.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Unassigned Members</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {solo.map((m: any) => (
                  <Card key={m.id} className="p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black uppercase text-xs shrink-0">
                      {m.first_name?.[0]}{m.last_name?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{m.first_name} {m.last_name}</div>
                      <div className="text-xs text-gray-400 font-medium">{m.designation || '—'}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CRMTeam;
