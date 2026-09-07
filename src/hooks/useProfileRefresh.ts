import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { isMockSession } from '@/mocks/mockAuth';

export const useProfileRefresh = () => {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || hasRunRef.current || isMockSession()) return;
    hasRunRef.current = true;

    apiRequest<{ success: boolean; data: Record<string, unknown> }>(API_ENDPOINTS.AUTH.ME)
      .then((res) => {
        if (res?.data) updateUserProfile(res.data);
      })
      .catch(() => {

      });
  }, [isLoggedIn, updateUserProfile]);
};
