import React from 'react';
import { Check, Palette } from 'lucide-react';
import Card from '@/components/ui/Card';
import { THEMES } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { useColorMode } from '@/hooks/useColorMode';
import { cn } from '@/utils/cn';

const DARK_PREVIEW = {
  app: '#080b12',
  topbar: '#0e131c',
  card: '#121826',
};

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { isDark } = useColorMode();

  return (
    <Card className="flex flex-col shadow-sm border border-(--color-card-border) bg-(--color-card-bg) rounded-xl !p-0 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-(--color-card-border)">
        <div className="h-9 w-9 rounded-xl bg-(--color-info-bg) text-(--color-brand-primary) flex items-center justify-center">
          <Palette size={16} />
        </div>
        <div>
          <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">Appearance</h2>
          <p className="text-[13px] text-(--color-text-secondary) font-medium tracking-tight mt-0.5">
            {isDark
              ? 'Accent colors change the sidebar and brand highlights. Dark mode keeps surfaces consistent.'
              : 'Pick a color theme for sidebar, accents, and workspace tint.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
        {THEMES.map((t) => {
          const selected = theme === t.id;
          const { preview } = t;
          const app = isDark ? DARK_PREVIEW.app : preview.app;
          const topbar = isDark ? DARK_PREVIEW.topbar : preview.topbar;
          const card = isDark ? DARK_PREVIEW.card : preview.card;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                'group relative flex flex-col rounded-2xl border-2 p-3 text-left transition-all duration-200',
                selected
                  ? 'border-primary-600 shadow-lg shadow-primary-600/10 ring-1 ring-primary-600/20'
                  : 'border-(--color-border) hover:border-primary-300 hover:shadow-md',
              )}
            >
              <div
                className="relative h-[88px] w-full overflow-hidden rounded-xl border border-black/10 shadow-inner"
                style={{ background: app }}
              >
                <div
                  className="absolute inset-y-0 left-0 w-[28%] flex flex-col gap-1.5 px-1.5 py-2"
                  style={{ background: `linear-gradient(180deg, ${preview.sidebar} 0%, ${preview.sidebar}ee 100%)` }}
                >
                  <div className="mx-auto mb-1 h-1.5 w-8 rounded-full bg-white/90" />
                  <div className="h-1 w-full rounded-full bg-white/80" />
                  <div className="h-1 w-[85%] rounded-full bg-white/55" />
                  <div className="h-1 w-[70%] rounded-full bg-white/40" />
                  <div className="mt-auto h-4 w-full rounded-md" style={{ background: preview.accent }} />
                </div>

                <div
                  className="absolute top-0 right-0 left-[28%] h-4 border-b border-white/5"
                  style={{ background: topbar }}
                />
                <div
                  className="absolute right-2 top-6 h-8 w-[calc(72%-1rem)] rounded-lg border border-white/10 shadow-sm"
                  style={{ background: card }}
                >
                  <div className="absolute left-2 top-2 h-1.5 w-10 rounded-full" style={{ background: preview.accent }} />
                  <div className="absolute left-2 bottom-2 h-1 w-16 rounded-full bg-white/15" />
                </div>
                <div
                  className="absolute right-2 bottom-2 h-5 w-[calc(72%-1rem)] rounded-md border border-white/10"
                  style={{ background: card }}
                />

                {selected && (
                  <div
                    className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md"
                    style={{ background: preview.accent }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-(--color-text-primary)">{t.label}</p>
                  <p className="text-[11px] text-(--color-text-secondary) leading-snug mt-0.5">{t.description}</p>
                </div>
                <div className="flex shrink-0 gap-1 pt-0.5">
                  {[preview.sidebar, preview.accent, app].map((color) => (
                    <span
                      key={`${t.id}-${color}`}
                      className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default ThemeSwitcher;
