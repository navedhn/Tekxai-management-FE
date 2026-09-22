import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';

export type AuthState = {
  isLoggedIn: boolean;
  user: User;
  role: string | null;
  hasHydrated: boolean;
};

export const useAuth = () => {
  const { isLoggedIn, user, role, userLogout, hasHydrated } = useAuthStore();
  return { isLoggedIn, user, role, userLogout, hasHydrated };
};
