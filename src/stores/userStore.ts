import { create } from 'zustand';

type Profile = Record<string, unknown> | null;

interface UserState {
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));

