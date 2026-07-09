import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Layers, Users, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useGetDepartmentsQuery, useGetDivisionsQuery } from '@/services/departmentService';
import Loader from '@/components/ui/Loader';

// ── Departmental structure: Department -> Division -> Team ──────────────────

function TeamsForScope({ teams, departmentId, divisionId }: { teams: any[]; departmentId: string; divisionId?: string }) {
  const scoped = teams.filter((t: any) =>
    t.department_id === departmentId && (divisionId ? t.division_id === divisionId : !t.division_id)
  );
  if (scoped.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {scoped.map((t: any) => (
        <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-100 rounded-lg text-xs font-semibold text-primary-700">
          <Users size={12} />
          {t.name}
          <span className="text-primary-400">· {t.members?.length ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function DepartmentCard({ dept, teams }: { dept: any; teams: any[] }) {
  const [open, setOpen] = useState(true);
  const { data: divisions } = useGetDivisionsQuery(dept.id);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center"><Building2 size={16} className="text-primary-600" /></div>
          <div className="text-left">
            <p className="font-black text-gray-900 text-sm">{dept.name}</p>
            <p className="text-[11px] text-gray-400 font-semibold">{dept._count?.users ?? 0} employees</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <TeamsForScope teams={teams} departmentId={dept.id} />
          {(divisions || []).map((div: any) => (
            <div key={div.id} className="ml-4 pl-4 border-l-2 border-gray-100">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-purple-500" />
                <span className="text-sm font-bold text-gray-800">{div.name}</span>
                <span className="text-[11px] text-gray-400">· {div._count?.users ?? 0}</span>
              </div>
              <TeamsForScope teams={teams} departmentId={dept.id} divisionId={div.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reporting structure: recursive supervisor -> subordinate tree ───────────

function PersonNode({ person, byManager, depth }: { person: any; byManager: Map<string, any[]>; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const reports = byManager.get(person.id) || [];

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l-2 border-gray-100' : ''}>
      <button
        onClick={() => reports.length > 0 && setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-1.5 text-left"
        disabled={reports.length === 0}
      >
        {reports.length > 0 ? (
          open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />
        ) : <span className="w-3.5 shrink-0" />}
        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-black overflow-hidden shrink-0">
          {person.avatar ? <img src={person.avatar} className="w-full h-full object-cover" /> : `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
        </div>
        <span className="text-sm font-bold text-gray-800">{person.first_name} {person.last_name}</span>
        <span className="text-[11px] text-gray-400">{person.designation_ref?.name || person.designation || '—'}</span>
        {reports.length > 0 && <span className="text-[11px] text-gray-300">({reports.length})</span>}
      </button>
      {open && reports.map((r: any) => (
        <PersonNode key={r.id} person={r} byManager={byManager} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: departments, isLoading: deptsLoading } = useGetDepartmentsQuery();

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.TEAM.LIST),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['org-chart-users'],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?limit=1000&status=ACTIVE`),
    select: (r: any) => r?.payload?.records || r?.payload || [],
  });

  const { roots, byManager } = useMemo(() => {
    const list: any[] = users || [];
    const byManager = new Map<string, any[]>();
    const withManager = new Set<string>();
    list.forEach((u: any) => {
      const mgrId = u.supervisor_id || u.supervisor?.id;
      if (mgrId) {
        withManager.add(u.id);
        if (!byManager.has(mgrId)) byManager.set(mgrId, []);
        byManager.get(mgrId)!.push(u);
      }
    });
    const roots = list.filter((u: any) => !withManager.has(u.id) && (byManager.get(u.id)?.length ?? 0) > 0);
    return { roots, byManager };
  }, [users]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Network size={22} className="text-primary-600" />Organization Chart</h1>
        <p className="text-sm text-gray-400 mt-0.5">A live view composed from Departments, Divisions, Teams, and reporting lines — not a separate stored chart.</p>
      </div>

      <div>
        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-3">Departmental Structure</h2>
        {deptsLoading ? (
          <div className="flex justify-center py-10"><Loader size={32} /></div>
        ) : (departments || []).length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 text-sm">No departments yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(departments || []).map((dept: any) => (
              <DepartmentCard key={dept.id} dept={dept} teams={teams || []} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-black text-gray-500 uppercase tracking-wide mb-3">Reporting Structure</h2>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          {usersLoading ? (
            <div className="flex justify-center py-10"><Loader size={32} /></div>
          ) : roots.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-6">No reporting relationships set up yet — assign a Reporting Manager on an employee's profile to build this chart.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {roots.map((r: any) => (
                <PersonNode key={r.id} person={r} byManager={byManager} depth={0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
