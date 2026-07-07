import React, { useState } from 'react';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import Select from './Select';
import Textarea from './Textarea';
import Button from './Button';
import Loader from './Loader';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useWeeklyUpdates, useCreateWeeklyUpdate, useDeleteWeeklyUpdate } from '@/services/weeklyUpdatesService';
import type { CommChannel } from '@/types/devopsAccess';

const METHOD_OPTIONS: { label: string; value: CommChannel }[] = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'Clickup', value: 'CLICKUP' },
  { label: 'Slack', value: 'SLACK' },
  { label: 'Microsoft Teams', value: 'TEAMS' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Google Meet', value: 'GOOGLE_MEET' },
  { label: 'Zoom', value: 'ZOOM' },
  { label: 'Other Platform', value: 'OTHER' },
];

interface WeeklyUpdatesPanelProps {
  projectId: string;
  canEdit: boolean;
}

const WeeklyUpdatesPanel: React.FC<WeeklyUpdatesPanelProps> = ({ projectId, canEdit }) => {
  const toast = useToastContext();
  const { data: updates = [], isLoading } = useWeeklyUpdates(projectId);
  const createUpdate = useCreateWeeklyUpdate(projectId);
  const deleteUpdate = useDeleteWeeklyUpdate(projectId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ method: 'EMAIL' as CommChannel, summary: '', client_response: '' });

  const handleSubmit = () => {
    if (!form.summary.trim()) return toast.error('Summary is required');
    createUpdate.mutate(form, {
      onSuccess: () => { toast.success('Client update logged'); setForm({ method: 'EMAIL', summary: '', client_response: '' }); setShowForm(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to log update'),
    });
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center justify-between gap-3 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <MessageCircle size={18} strokeWidth={2.5} className="text-primary-500" />
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Weekly Client Updates</h3>
        </div>
        {canEdit && (
          <Button leftIcon={Plus} onClick={() => setShowForm((s) => !s)} className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4">
            Log Update
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-6">
        {showForm && (
          <div className="flex flex-col gap-3 p-4 bg-gray-50/60 rounded-2xl">
            <Select
              label="Method"
              options={METHOD_OPTIONS}
              value={form.method}
              onChange={(v) => setForm((f) => ({ ...f, method: v as CommChannel }))}
            />
            <Textarea
              label="Summary *"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="What was shared with the client..."
              className="min-h-[80px]"
            />
            <Textarea
              label="Client Response (optional)"
              value={form.client_response}
              onChange={(e) => setForm((f) => ({ ...f, client_response: e.target.value }))}
              placeholder="How did the client respond..."
              className="min-h-[60px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 rounded-xl font-bold text-xs px-4">Cancel</Button>
              <Button onClick={handleSubmit} disabled={createUpdate.isPending} className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-4">
                {createUpdate.isPending ? 'Saving…' : 'Save Update'}
              </Button>
            </div>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {!isLoading && updates.length === 0 && (
          <span className="text-xs text-gray-400 italic">No client updates logged yet.</span>
        )}

        {updates.map((u) => (
          <div key={u.id} className="flex flex-col gap-1.5 p-4 bg-gray-50/60 rounded-2xl group relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-primary-600 uppercase tracking-wider">
                {METHOD_OPTIONS.find((o) => o.value === u.method)?.label || u.method}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400">{new Date(u.update_date).toLocaleDateString()}</span>
                {canEdit && (
                  <button
                    onClick={() => deleteUpdate.mutate(u.id, { onError: (e: any) => toast.error(e?.message || 'Failed to delete') })}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700">{u.summary}</p>
            {u.client_response && (
              <p className="text-xs text-gray-500 italic border-l-2 border-primary-200 pl-2 mt-1">Client: {u.client_response}</p>
            )}
            {u.updater && (
              <span className="text-[10px] font-bold text-gray-400 mt-1">by {u.updater.first_name} {u.updater.last_name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyUpdatesPanel;
