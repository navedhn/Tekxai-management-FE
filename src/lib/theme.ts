export type ThemeId = 'clean-light' | 'emerald' | 'royal-purple' | 'midnight-blue';

export const THEME_STORAGE_KEY = 'tekxai-theme';

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  { id: 'clean-light', label: 'Clean Light', description: 'Professional light SaaS look — the default.' },
  { id: 'emerald', label: 'Emerald Green', description: 'Deep emerald sidebar, light glass cards.' },
  { id: 'royal-purple', label: 'Royal Purple', description: 'Dark purple/navy, glowing accents.' },
  { id: 'midnight-blue', label: 'Midnight Blue', description: 'Deep navy, premium dark enterprise.' },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value as ThemeId);
}

export function applyTheme(theme: ThemeId) {
  if (theme === 'clean-light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : 'clean-light';
  } catch {
    return 'clean-light';
  }
}

export function storeTheme(theme: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {

  }
}
