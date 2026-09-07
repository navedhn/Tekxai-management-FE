export type ThemeId =
  | 'clean-light'
  | 'tekxai-blue'
  | 'cobalt-blue'
  | 'sky-blue'
  | 'ice-blue'
  | 'midnight-blue'
  | 'emerald'
  | 'royal-purple';

export const THEME_STORAGE_KEY = 'tekxai-theme';

export const THEMES: {
  id: ThemeId;
  label: string;
  description: string;
  preview: { sidebar: string; app: string; accent: string; card: string; topbar: string };
}[] = [
  {
    id: 'clean-light',
    label: 'Ocean Slate',
    description: 'Default look — deep slate sidebar with brand blue accents.',
    preview: {
      sidebar: '#0f172a',
      app: '#f8fafc',
      accent: '#1a66d6',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'tekxai-blue',
    label: 'Tekxai Blue',
    description: 'Signature brand blue with a deep navy sidebar.',
    preview: {
      sidebar: '#001F4A',
      app: '#f0f6ff',
      accent: '#005CDA',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'cobalt-blue',
    label: 'Cobalt',
    description: 'Strong cobalt blue — richer and deeper than brand.',
    preview: {
      sidebar: '#002B6B',
      app: '#eef4ff',
      accent: '#0047C7',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'sky-blue',
    label: 'Sky Blue',
    description: 'Lighter sky shade of the brand blue family.',
    preview: {
      sidebar: '#0B3A7A',
      app: '#f0f9ff',
      accent: '#2B7FFF',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'ice-blue',
    label: 'Ice Blue',
    description: 'Soft icy blue accents on a cool light canvas.',
    preview: {
      sidebar: '#12365C',
      app: '#f5f9ff',
      accent: '#4C8DFF',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'midnight-blue',
    label: 'Azure Night',
    description: 'Deep navy sidebar with a bright azure accent.',
    preview: {
      sidebar: '#0c1929',
      app: '#eff6ff',
      accent: '#3b82f6',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'emerald',
    label: 'Teal Grove',
    description: 'Fresh teal accents on a soft mint canvas.',
    preview: {
      sidebar: '#0f3d3a',
      app: '#f0fdfa',
      accent: '#14b8a6',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
  {
    id: 'royal-purple',
    label: 'Violet Bloom',
    description: 'Rich violet sidebar with a soft lavender workspace.',
    preview: {
      sidebar: '#2e1065',
      app: '#f5f3ff',
      accent: '#8b5cf6',
      card: '#ffffff',
      topbar: '#ffffff',
    },
  },
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

export function hasStoredTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored != null && stored !== '';
  } catch {
    return false;
  }
}

export function storeTheme(theme: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage failures
  }
}
