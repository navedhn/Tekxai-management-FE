import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

type PortalMessageEvent = {
  id: string;
  project_id: string;
  user_id: string;
  content?: string | null;
  attachment_file_name?: string | null;
  user?: { first_name?: string | null; last_name?: string | null; avatar?: string | null };
};

function senderName(message: PortalMessageEvent): string {
  const name = [message.user?.first_name, message.user?.last_name].filter(Boolean).join(' ').trim();
  return name || 'Someone';
}

function messagePreview(message: PortalMessageEvent): string {
  const text = (message.content || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 160 ? `${text.slice(0, 157)}…` : text;
  return message.attachment_file_name ? `Sent an attachment: ${message.attachment_file_name}` : 'Sent a new message';
}

// App-level native notifications for portal communication. The listener is
// deliberately not mounted in CommunicationTab: users should be notified
// while viewing any other page, just as they are in Discord or Zoom.
export function usePortalMessageNotifications(): void {
  const { isLoggedIn, user, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || !user?.id) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (message: PortalMessageEvent) => {
      // The server broadcasts to the sender too; never notify someone about
      // the message they just sent, and suppress a toast for the conversation
      // they are already actively reading.
      if (!message?.id || !message.project_id || message.user_id === user.id) return;
      const activePath = `/portal/projects/${message.project_id}`;
      const isViewingConversation = window.location.pathname === activePath
        && document.visibilityState === 'visible'
        && document.hasFocus();
      if (isViewingConversation || Notification.permission !== 'granted') return;

      try {
        const notification = new Notification(senderName(message), {
          body: messagePreview(message),
          icon: message.user?.avatar || '/favicon.ico',
          tag: `portal-message-${message.project_id}`,
          renotify: true,
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign(`${activePath}?message=${encodeURIComponent(message.id)}`);
          notification.close();
        };
      } catch {
        // A browser can reject notifications after a permission change; the
        // live Communication tab still receives its socket update normally.
      }
    };

    socket.on('project:message:new', onNewMessage);
    return () => socket.off('project:message:new', onNewMessage);
  }, [hasHydrated, isLoggedIn, user?.id]);
}
