import { create } from 'zustand';

interface PortalTopbarState {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const usePortalTopbarStore = create<PortalTopbarState>()((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));
