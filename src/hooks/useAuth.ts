import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';

export type AuthState = {
  isLoggedIn: boolean;
  user: User;
  role: string | null;
};

export const useAuth = () => {
  const { isLoggedIn, user, role, userLogout } = useAuthStore();
  return { isLoggedIn, user, role, userLogout };
};
