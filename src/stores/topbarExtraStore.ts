import { create } from 'zustand';
import type { ReactNode } from 'react';

// Lets a specific page (e.g. the Dashboard's Business Unit/Team filters)
// inject content into the shared AdminTopbar next to the page title,
// without AdminTopbar itself knowing anything about that page. Plain
// Zustand (not React Context) because AdminTopbar is mounted by the
// layout, a different subtree than the page — no provider to wire up.
interface TopbarExtraState {
  extra: ReactNode;
  setTopbarExtra: (node: ReactNode) => void;
}

export const useTopbarExtraStore = create<TopbarExtraState>((set) => ({
  extra: null,
  setTopbarExtra: (node) => set({ extra: node }),
}));
