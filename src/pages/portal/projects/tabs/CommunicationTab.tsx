import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useMyPermissions } from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import { TableSkeleton } from '@/components/skeletons';
import { PortalMessage } from '../types';

const inputCls =
  'w-full min-h-[80px] px-3 py-2 border border-(--color-border) rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none bg-(--color-surface)';

const CommunicationTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [content, setContent] = useState('');
  const { data: myPerms } = useMyPermissions();
  const canCompose = !!myPerms?.permissions?.includes('client.communication.create');
  const qc = useQueryClient();
  const toast = useToastContext();

  const { data, isLoading } = useQuery<PortalMessage[]>({
    queryKey: ['portal', 'messages', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId)),
    select: (r: any) => r?.payload || [],
  });

  const sendMessage = useMutation({
    mutationFn: (body: { content: string }) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId), {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setContent('');
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
    },
    onError: () => toast?.error?.('Failed to send message'),
  });

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate({ content: content.trim() });
  };

  const senderName = (msg: PortalMessage) =>
    msg.user?.user_type === 'INTERNAL' ? 'TekXAI Team' : `${msg.user?.first_name ?? ''} ${msg.user?.last_name ?? ''}`.trim();

  if (isLoading) return <TableSkeleton columns={1} rows={5} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
        {(!data || data.length === 0) && (
          <p className="text-sm text-(--color-text-secondary) py-10 text-center">No messages yet.</p>
        )}
        {data?.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3',
              m.user?.user_type === 'CLIENT' ? 'self-end bg-primary-50' : 'self-start bg-(--color-elevated)'
            )}
          >
            <div className="flex items-center justify-between gap-4 mb-1">
              <span className="text-xs font-bold text-(--color-text-primary)">{senderName(m)}</span>
              <span className="text-[11px] text-(--color-text-secondary)">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm text-(--color-text-primary) whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>

      {canCompose && (
        <div className="flex flex-col gap-2 pt-4 border-t border-(--color-card-border)">
          <textarea
            className={inputCls}
            placeholder="Write a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || sendMessage.isPending}
            className="self-end flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Send size={15} />
            Send
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunicationTab;
