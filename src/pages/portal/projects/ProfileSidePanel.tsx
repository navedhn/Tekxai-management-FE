import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Briefcase, Building2, ShieldCheck, MessageCircle, Phone } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useCreateInstantZoomMeeting, isZoomNotConnectedError, isZoomReauthError } from '@/services/zoomChatService';
import Loader from '@/components/ui/Loader';

// The Client Portal's "click a name to see their profile" sidebar — a
// slide-in panel (not a full page navigation) showing avatar, name, email
// and role for whoever was clicked. Backed by the client-safe
// GET /portal/projects/:id/people/:userId lookup, which only ever returns
// someone actually visible to this client on this project (see that
// endpoint's own comment) — this component trusts that scoping entirely
// and does no additional filtering of its own.

type PersonProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string | null;
  user_type: 'INTERNAL' | 'CLIENT';
  designation: string | null;
  last_active_at: string | null;
};

// Same 2-minute "online" convention as the internal chat module's own
// isOnline/fmtLastSeen (src/pages/chat/index.tsx) — there's no live
// presence socket reaching this panel, so it's purely last_active_at
// derived, same as chat's own fallback when a user isn't in its socket set.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
function presenceLabel(lastActiveAt: string | null): { label: string; online: boolean } {
  if (!lastActiveAt) return { label: 'Offline', online: false };
  const ms = Date.now() - new Date(lastActiveAt).getTime();
  if (ms < ONLINE_WINDOW_MS) return { label: 'Online', online: true };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { label: `Last seen ${mins}m ago`, online: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `Last seen ${hours}h ago`, online: false };
  return { label: `Last seen ${new Date(lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, online: false };
}

function displayName(p?: Pick<PersonProfile, 'first_name' | 'last_name'>) {
  return `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown';
}

interface ProfileSidePanelProps {
  projectId: string;
  userId: string;
  onClose: () => void;
}

const ProfileSidePanel: React.FC<ProfileSidePanelProps> = ({ projectId, userId, onClose }) => {
  const navigate = useNavigate();
  const toast = useToastContext();
  const { user: me } = useAuth();
  const [calling, setCalling] = useState(false);
  const { data, isLoading } = useQuery<PersonProfile | null>({
    queryKey: ['portal', 'person', projectId, userId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PERSON(projectId, userId)),
    select: (r: any) => r?.payload || null,
  });

  const isInternal = data?.user_type === 'INTERNAL';
  // The internal chat/DM system (and Zoom-backed calling) only exists for
  // INTERNAL accounts — a CLIENT has no login into it at all, and the
  // viewer themselves must also be internal to reach it. Neither icon is
  // meaningful (or reachable) for a client-to-client or viewer-is-client
  // pairing, so both are hidden rather than shown-then-broken.
  const canReachViaInternalChat = me?.user_type === 'INTERNAL' && isInternal && me.id !== data?.id;

  const openDm = useMutation({
    mutationFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.CHAT.DM, {
        method: 'POST',
        body: JSON.stringify({ target_user_id: userId }),
      });
      return res?.payload?.id as string;
    },
    onSuccess: (channelId) => {
      onClose();
      navigate(`/chat?channel=${channelId}`);
    },
    onError: () => toast.error('Could not open a direct message with this person'),
  });

  const createMeeting = useCreateInstantZoomMeeting();

  const handleCall = async () => {
    setCalling(true);
    try {
      const meeting = await createMeeting.mutateAsync(`Call with ${displayName(data ?? undefined)}`);
      const dm = await apiRequest<any>(API_ENDPOINTS.CHAT.DM, {
        method: 'POST',
        body: JSON.stringify({ target_user_id: userId }),
      });
      const channelId = dm?.payload?.id;
      if (channelId) {
        await apiRequest<any>(API_ENDPOINTS.CHAT.MESSAGES(channelId), {
          method: 'POST',
          body: JSON.stringify({ content: `📞 Zoom call started — join here: ${meeting.join_url}` }),
        });
      }
      window.open(meeting.join_url, '_blank', 'noopener,noreferrer');
      toast.success(channelId ? 'Meeting started — link sent in your DM' : 'Meeting started');
    } catch (e: any) {
      if (isZoomNotConnectedError(e) || isZoomReauthError(e)) {
        toast.error('Connect your Zoom account first (Chat → Zoom) before starting a call');
      } else {
        toast.error('Could not start the call');
      }
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-(--color-surface) shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-(--color-border)">
          <h3 className="text-sm font-black text-(--color-text-primary)">Profile</h3>
          <button onClick={onClose} className="text-(--color-text-secondary) hover:text-(--color-text-primary)">
            <X size={18} />
          </button>
        </div>

        {isLoading && <div className="flex justify-center py-16"><Loader size={28} /></div>}

        {!isLoading && !data && (
          <p className="text-sm text-(--color-text-secondary) text-center py-16 px-6">
            This profile isn't available.
          </p>
        )}

        {!isLoading && data && (() => {
          const presence = presenceLabel(data.last_active_at);
          return (
          <div className="flex flex-col gap-6 p-6 overflow-y-auto">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                {data.avatar ? (
                  <img src={data.avatar} alt={displayName(data)} className="h-20 w-20 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-black">
                    {displayName(data).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span
                  className={`absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-(--color-surface) ${presence.online ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  title={presence.label}
                />
              </div>
              <div>
                <p className="text-base font-black text-(--color-text-primary)">{displayName(data)}</p>
                <span className={
                  isInternal
                    ? 'inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-600'
                    : 'inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600'
                }>
                  {isInternal ? 'TekXAI Team' : 'Client'}
                </span>
                <p className={`mt-1.5 text-xs font-semibold ${presence.online ? 'text-emerald-600' : 'text-(--color-text-secondary)'}`}>
                  {presence.label}
                </p>
              </div>
              {canReachViaInternalChat && (
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => openDm.mutate()}
                    disabled={openDm.isPending}
                    title="Send a direct message"
                    className="h-10 w-10 rounded-full border border-(--color-border) flex items-center justify-center text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-primary-600 disabled:opacity-50"
                  >
                    <MessageCircle size={17} />
                  </button>
                  <button
                    onClick={handleCall}
                    disabled={calling}
                    title="Start a Zoom call"
                    className="h-10 w-10 rounded-full border border-(--color-border) flex items-center justify-center text-(--color-text-secondary) hover:bg-(--color-state-hover) hover:text-primary-600 disabled:opacity-50"
                  >
                    {calling ? <Loader size={16} /> : <Phone size={17} />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-(--color-border) px-3 py-2.5">
                <Mail size={16} className="text-(--color-text-secondary) shrink-0" />
                <span className="text-sm text-(--color-text-primary) truncate">{data.email}</span>
              </div>
              {data.designation && (
                <div className="flex items-center gap-3 rounded-xl border border-(--color-border) px-3 py-2.5">
                  <Briefcase size={16} className="text-(--color-text-secondary) shrink-0" />
                  <span className="text-sm text-(--color-text-primary) truncate">{data.designation}</span>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-xl border border-(--color-border) px-3 py-2.5">
                {isInternal ? <ShieldCheck size={16} className="text-(--color-text-secondary) shrink-0" /> : <Building2 size={16} className="text-(--color-text-secondary) shrink-0" />}
                <span className="text-sm text-(--color-text-primary)">{isInternal ? 'Internal team member' : 'Client contact'}</span>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ProfileSidePanel;
