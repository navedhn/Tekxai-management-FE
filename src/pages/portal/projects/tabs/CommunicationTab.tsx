import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, FileText, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useMyPermissions } from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import { TableSkeleton } from '@/components/skeletons';
import { PortalMessage } from '../types';

const inputCls =
  'w-full min-h-[80px] px-3 py-2 border border-(--color-border) rounded-xl text-sm focus:outline-none focus:border-primary-400 resize-none bg-(--color-surface)';

// Kept broad on purpose — project materials can legitimately be almost any
// common file type, including installers/disk images (an explicit product
// decision, not an oversight); the backend re-validates its own allow-list
// regardless of what this attribute permits client-side.
const ATTACHMENT_ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.odt,.rtf,.txt,.csv,.xls,.xlsx,.ods,.zip,.rar,.7z,.tar,.gz,.exe,.dmg,.pkg,.msi,.apk,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.heic,.mp4,.mov,.webm,.mkv,.avi,.m4v,.mp3,.wav,.ogg,.m4a';

function formatBytes(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PendingAttachment = {
  attachment_file_key: string;
  attachment_file_url: string;
  attachment_file_name: string;
  attachment_mime_type: string;
  attachment_size_bytes: number;
};

const CommunicationTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [content, setContent] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: myPerms } = useMyPermissions();
  const canCompose = !!myPerms?.permissions?.includes('client.communication.create');
  const qc = useQueryClient();
  const toast = useToastContext();

  const { data, isLoading } = useQuery<PortalMessage[]>({
    queryKey: ['portal', 'messages', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId)),
    select: (r: any) => r?.payload?.records || [],
  });

  const sendMessage = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGES(projectId), {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setContent('');
      setPendingAttachment(null);
      qc.invalidateQueries({ queryKey: ['portal', 'messages', projectId] });
    },
    onError: () => toast?.error?.('Failed to send message'),
  });

  const handleFileChosen = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_UPLOAD(projectId), {
        method: 'POST',
        body: form,
      });
      setPendingAttachment(res?.payload);
    } catch {
      toast?.error?.('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!content.trim() && !pendingAttachment) return;
    sendMessage.mutate({ content: content.trim(), ...(pendingAttachment || {}) });
  };

  const handleViewAttachment = async (message: PortalMessage) => {
    try {
      const res = await apiRequest<any>(API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(projectId, message.id));
      const url = res?.payload?.view_url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast?.error?.('Failed to open attachment');
    }
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
            {m.content && <p className="text-sm text-(--color-text-primary) whitespace-pre-wrap">{m.content}</p>}
            {m.attachment_file_key && (
              <button
                onClick={() => handleViewAttachment(m)}
                className="mt-2 flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) bg-(--color-surface) text-xs font-semibold text-(--color-text-primary) hover:bg-(--color-state-hover)"
              >
                <FileText size={14} className="shrink-0" />
                <span className="truncate max-w-[220px]">{m.attachment_file_name}</span>
                {!!m.attachment_size_bytes && (
                  <span className="text-(--color-text-secondary) shrink-0">{formatBytes(m.attachment_size_bytes)}</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {canCompose && (
        <div className="flex flex-col gap-2 pt-4 border-t border-(--color-card-border)">
          {pendingAttachment && (
            <div className="flex items-center gap-2 px-3 h-9 rounded-xl border border-(--color-border) bg-(--color-elevated) text-xs font-semibold w-fit">
              <FileText size={14} />
              <span className="truncate max-w-[220px]">{pendingAttachment.attachment_file_name}</span>
              <span className="text-(--color-text-secondary)">{formatBytes(pendingAttachment.attachment_size_bytes)}</span>
              <button onClick={() => setPendingAttachment(null)} className="text-(--color-text-secondary) hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          )}
          <textarea
            className={inputCls}
            placeholder="Write a message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 h-10 rounded-xl border border-(--color-border) text-sm font-semibold text-(--color-text-secondary) hover:bg-(--color-state-hover) disabled:opacity-50"
            >
              <Paperclip size={15} />
              {uploading ? 'Uploading…' : 'Attach file'}
            </button>
            <button
              onClick={handleSend}
              disabled={(!content.trim() && !pendingAttachment) || sendMessage.isPending || uploading}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Send size={15} />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationTab;
