import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SIDEBAR_EXPANDED = '17.75rem';
const SIDEBAR_COLLAPSED = '4.75rem';

function applySidebarCollapsed(collapsed: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');
  document.documentElement.style.setProperty(
    '--spacing-sidebar',
    collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
  );
}

interface SidebarState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      toggleCollapsed: () => {
        const next = !get().collapsed;
        applySidebarCollapsed(next);
        set({ collapsed: next });
      },
      setCollapsed: (collapsed) => {
        applySidebarCollapsed(collapsed);
        set({ collapsed });
      },
    }),
    {
      name: 'tekxai-sidebar',
      onRehydrateStorage: () => (state) => {
        applySidebarCollapsed(!!state?.collapsed);
      },
    },
  ),
);
