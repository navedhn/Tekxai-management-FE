import { useEffect } from 'react';
import { applyColorMode } from '@/lib/colorMode';
import { useColorModeStore } from '@/stores/colorModeStore';

export function useColorMode() {
  const mode = useColorModeStore((s) => s.mode);
  const setColorMode = useColorModeStore((s) => s.setColorMode);
  const toggleColorMode = useColorModeStore((s) => s.toggleColorMode);

  useEffect(() => {
    applyColorMode(useColorModeStore.getState().mode);
  }, []);

  return {
    mode,
    isDark: mode === 'dark',
    setColorMode,
    toggleColorMode,
  };
}
