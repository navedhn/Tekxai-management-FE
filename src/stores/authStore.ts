import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  isLoggedIn: boolean;
  user: User;
  role: string | null;
  // False until zustand's persist middleware has finished reading
  // localStorage. Reads of isLoggedIn before this flips true are reads of
  // the store's initial (always-false) value, not the real persisted
  // session — ProtectedRoute must wait for this instead of treating "not
  // yet rehydrated" as "logged out" (see hasHydrated usage there).
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
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
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
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

      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        role: state.role,
      }),
      // Must not reference the `useAuthStore` module binding here — persist
      // rehydration runs synchronously as part of `create()` itself, before
      // the `export const useAuthStore = ...` assignment has finished, so
      // `useAuthStore.setState(...)` throws "Cannot access before
      // initialization" (confirmed live). `state` is the store's real
      // post-rehydration state (actions included — only `partialize`
      // affects what's persisted, not this), so call the action on it
      // instead of reaching for the outer binding.
      onRehydrateStorage: () => (state) => {
        // Fires whether or not a persisted value existed, and even on a
        // read error — in every case, the store's real state is now known.
        state?.setHasHydrated(true);
      },
    }
  )
);
