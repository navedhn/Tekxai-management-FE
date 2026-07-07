import React from 'react';
import { Activity, Plus, Pencil, Trash2 } from 'lucide-react';
import Loader from './Loader';
import { useProjectTimeline } from '@/services/projectTimelineService';

interface CommunicationTimelineProps {
  projectId: string;
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  CREATE: <Plus size={13} />,
  UPDATE: <Pencil size={13} />,
  DELETE: <Trash2 size={13} />,
};

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-[#ECFDF3] text-[#027A48]',
  UPDATE: 'bg-[#EFF8FF] text-[#175CD3]',
  DELETE: 'bg-[#FFF1F3] text-[#C01048]',
};

const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({ projectId }) => {
  const { data: entries = [], isLoading } = useProjectTimeline(projectId);

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center gap-3 p-6 border-b border-gray-100">
        <Activity size={18} strokeWidth={2.5} className="text-primary-500" />
        <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Activity Timeline</h3>
      </div>

      <div className="flex flex-col p-6">
        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {!isLoading && entries.length === 0 && (
          <span className="text-xs text-gray-400 italic">No activity recorded yet.</span>
        )}

        {entries.length > 0 && (
          <div className="flex flex-col">
            {entries.map((entry, i) => (
              <div key={entry.id} className="flex gap-3 relative">
                <div className="flex flex-col items-center">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${ACTION_COLOR[entry.action] || 'bg-gray-100 text-gray-500'}`}>
                    {ACTION_ICON[entry.action] || <Activity size={13} />}
                  </div>
                  {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                </div>
                <div className="flex flex-col gap-0.5 pb-5 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{entry.description}</p>
                  <span className="text-[10px] font-bold text-gray-400">
                    {entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : 'System'} · {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationTimeline;
