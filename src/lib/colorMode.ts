export type ColorMode = 'light' | 'dark';

export const COLOR_MODE_STORAGE_KEY = 'tekxai-color-mode';

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark';
}

export function applyColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-mode', mode);
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function getStoredColorMode(): ColorMode {
  try {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (isColorMode(stored)) return stored;
  } catch {
    // ignore
  }
  return 'light';
}

export function storeColorMode(mode: ColorMode) {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
