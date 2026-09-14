import React from 'react';
import { Clock, MonitorSmartphone } from 'lucide-react';
import Card from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { type TrackerState } from './useTimeTracker';

type TimeTrackerCardProps = {
  trackerState: TrackerState;
  seconds: number;
};

function splitTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

const TimeUnit: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="min-w-[4rem] sm:min-w-[4.75rem] rounded-xl bg-[#F4F7FB] border border-gray-100 px-3 py-2.5 text-center">
      <span className="block text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none text-(--color-text-primary)">
        {value}
      </span>
    </div>
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--color-text-secondary)">
      {label}
    </span>
  </div>
);

const TimeTrackerCard: React.FC<TimeTrackerCardProps> = ({ trackerState, seconds }) => {
  const isTracking = trackerState === 'tracking';
  const hasTime = seconds > 0;
  const { h, m, s } = splitTime(seconds);
  const dayProgress = Math.min(100, Math.round((seconds / (8 * 3600)) * 100));

  return (
    <Card className="bg-white border border-gray-100 shadow-sm py-5 px-5 sm:px-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-[#E8F1FF] text-[#005CDA] flex items-center justify-center">
              {isTracking ? <Clock size={18} /> : <MonitorSmartphone size={18} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-(--color-text-primary) tracking-tight">
                Time Tracker
              </h2>
              <p className="text-xs text-(--color-text-secondary) font-medium mt-0.5">
                {isTracking
                  ? 'Checked in via TekXAI Desktop App'
                  : 'Attendance starts from the TekXAI Desktop App'}
              </p>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              isTracking
                ? 'bg-emerald-50 text-emerald-700'
                : hasTime
                  ? 'bg-[#E8F1FF] text-[#005CDA]'
                  : 'bg-gray-100 text-gray-500',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isTracking ? 'bg-emerald-500 animate-pulse' : hasTime ? 'bg-[#005CDA]' : 'bg-gray-400',
              )}
            />
            {isTracking ? 'Tracking' : hasTime ? 'Completed' : 'Idle'}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
          <div className="flex items-end justify-center sm:justify-start gap-2 sm:gap-2.5">
            <TimeUnit value={h} label="Hours" />
            <span className="pb-7 text-xl font-black text-gray-300">:</span>
            <TimeUnit value={m} label="Mins" />
            <span className="pb-7 text-xl font-black text-gray-300">:</span>
            <TimeUnit value={s} label="Secs" />
          </div>

          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-(--color-text-secondary)">
                {isTracking ? "Today's progress" : hasTime ? "Today's total" : 'Ready to track'}
              </span>
              <span className="text-xs font-bold text-(--color-sidebar-bg) tabular-nums">
                {isTracking || hasTime ? `${dayProgress}% of 8h` : '—'}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-[#EEF2F7] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 bg-(--color-sidebar-bg)',
                  !isTracking && !hasTime && 'bg-transparent',
                )}
                style={{ width: `${isTracking || hasTime ? dayProgress : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-(--color-text-secondary)">
              {isTracking
                ? 'Updates live while checked in from desktop.'
                : hasTime
                  ? 'Clocked out for today.'
                  : 'Open the desktop app to check in.'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TimeTrackerCard;
