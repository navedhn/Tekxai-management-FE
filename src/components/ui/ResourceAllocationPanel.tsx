import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import Loader from './Loader';
import { useProjectResources } from '@/services/projectResourcesService';

interface ResourceAllocationPanelProps {
  projectId: string;
}

const ResourceAllocationPanel: React.FC<ResourceAllocationPanelProps> = ({ projectId }) => {
  const { data: resources = [], isLoading } = useProjectResources(projectId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader size={28} />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
        No resources assigned to this project yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2">
        <Users size={18} strokeWidth={2.5} className="text-primary-500" />
        <h3 className="text-lg font-black text-gray-900 tracking-tight">Resource Allocation</h3>
      </div>
      <div className="flex flex-col gap-2">
        {resources.map((r) => {
          const name = `${r.user.first_name || ''} ${r.user.last_name || ''}`.trim() || r.user.email;
          const otherProjects = r.active_projects.filter((p) => p.project_id !== projectId);
          return (
            <div key={r.member_id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={r.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    alt={name}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-800 truncate">{name}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{r.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">This Project</p>
                    <p className="text-sm font-bold text-gray-700">{r.allocation_percent}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Workload</p>
                    <p className={`text-sm font-bold ${r.over_allocated ? 'text-red-500' : 'text-gray-700'}`}>
                      {r.total_allocation_percent}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Available</p>
                    <p className="text-sm font-bold text-emerald-600">{r.available_capacity_percent}%</p>
                  </div>
                  {r.over_allocated && (
                    <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 text-[11px] font-black">
                      <AlertTriangle size={12} strokeWidth={2.5} />
                      Over-allocated
                    </span>
                  )}
                </div>
              </div>
              {otherProjects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {otherProjects.map((p) => (
                    <span
                      key={p.project_id}
                      className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5"
                    >
                      {p.project_title} · {p.allocation_percent}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResourceAllocationPanel;
