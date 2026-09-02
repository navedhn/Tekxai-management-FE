import React from 'react';
import { Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import { THEMES, ThemeId } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

const PREVIEW_STYLES: Record<ThemeId, { sidebar: string; app: string; accent: string; card: string }> = {
  'clean-light': { sidebar: '#ffffff', app: '#f9f9ff', accent: '#1a66d6', card: '#ffffff' },
  emerald: { sidebar: '#064e3b', app: '#f0fdf9', accent: '#10b981', card: '#ffffff' },
  'royal-purple': { sidebar: '#1a0f30', app: '#150c26', accent: '#8b5cf6', card: '#2e1b52' },
  'midnight-blue': { sidebar: '#0b1324', app: '#090e1a', accent: '#3b82f6', card: '#0f1729' },
};

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="flex flex-col gap-4 p-6 shadow-sm border border-gray-100 bg-white rounded-xl">
      <div>
        <h4 className="text-[15px] font-bold text-gray-900 tracking-tight">Appearance</h4>
        <p className="text-[13px] text-gray-500 font-medium tracking-tight">Choose how TekXAI looks for you, across the ERP and CRM.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {THEMES.map((t) => {
          const preview = PREVIEW_STYLES[t.id];
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`group flex flex-col gap-2 rounded-xl border-2 p-2 text-left transition-all ${selected ? 'border-primary-600 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div
                className="relative h-16 w-full overflow-hidden rounded-lg border border-black/5"
                style={{ background: preview.app }}
              >
                <div className="absolute left-0 top-0 h-full w-6" style={{ background: preview.sidebar }} />
                <div
                  className="absolute right-2 top-2 h-6 w-[calc(100%-2rem)] rounded-md border border-black/5"
                  style={{ background: preview.card }}
                />
                <div className="absolute left-1.5 top-2 h-2 w-2 rounded-full" style={{ background: preview.accent }} />
                {selected && (
                  <div className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{t.label}</p>
                <p className="text-[11px] text-gray-400 leading-tight">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default ThemeSwitcher;
