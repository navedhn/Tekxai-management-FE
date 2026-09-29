import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

/** Keep notification bell / list unread counts fresh without a page refresh. */
export function useNotificationRealtime(): void {
  const qc = useQueryClient();
  const { isLoggedIn, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return;
    const socket = getSocket();
    if (!socket) return;

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', refresh);
    return () => {
      socket.off('notification:new', refresh);
    };
  }, [hasHydrated, isLoggedIn, qc]);
}
