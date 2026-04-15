import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  isLoggedIn: boolean;
  user: User;
  role: string | null;
  loggedIn: (payload: { user: User }) => void;
  userLogout: () => void;
  updateUserProfile: (payload: Partial<NonNullable<User>>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      role: null,
      loggedIn: (payload) => {
        set({
          isLoggedIn: true,
          user: payload.user,
          role: payload.user?.role_name ?? null,
        });
      },
      userLogout: () => {
        set({
          isLoggedIn: false,
          user: null,
          role: null,
        });
      },
      updateUserProfile: (payload) => {
        set((state) => ({
          user: { ...(state.user || {}), ...payload } as User,
        }));
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user data, not token (token is in memory)
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        role: state.role,
      }),
    }
  )
);
