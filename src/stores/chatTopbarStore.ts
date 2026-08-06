import { create } from 'zustand';

// Lets ChatPage (rendered inside ChatLayout's <Outlet>) override the shared
// AdminTopbar's title with the active server's name — e.g. "QA Test Server"
// instead of the static "Messages" route title. Reset to null on unmount /
// leaving a server so other pages sharing AdminTopbar are unaffected.
interface ChatTopbarState {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const useChatTopbarStore = create<ChatTopbarState>()((set) => ({
  title: null,
  setTitle: (title) => set({ title }),
}));
