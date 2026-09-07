import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyColorMode, ColorMode, getStoredColorMode, storeColorMode } from '@/lib/colorMode';

interface ColorModeState {
  mode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

function commitColorMode(mode: ColorMode) {
  applyColorMode(mode);
  storeColorMode(mode);
}

export const useColorModeStore = create<ColorModeState>()(
  persist(
    (set, get) => ({
      mode: getStoredColorMode(),
      setColorMode: (mode) => {
        commitColorMode(mode);
        set({ mode });
      },
      toggleColorMode: () => {
        const next: ColorMode = get().mode === 'dark' ? 'light' : 'dark';
        commitColorMode(next);
        set({ mode: next });
      },
    }),
    {
      name: 'tekxai-color-mode-store',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        const mode = state?.mode === 'dark' ? 'dark' : getStoredColorMode();
        commitColorMode(mode);
      },
    },
  ),
);
