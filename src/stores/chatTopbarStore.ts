import { create } from 'zustand';

interface ChatTopbarState {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const useChatTopbarStore = create<ChatTopbarState>()((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));
