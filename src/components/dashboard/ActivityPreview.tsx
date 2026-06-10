import React from 'react';
import { cn } from '@/utils/cn';

export type ActivityPreviewVariant = 'stats' | 'projects' | 'timesheet' | 'tracker';

interface ActivityPreviewProps {
  variant: ActivityPreviewVariant;
  className?: string;
}

/** Mini dashboard UI previews used until real project screenshots are available */
const ActivityPreview: React.FC<ActivityPreviewProps> = ({ variant, className }) => {
  return (
    <div
      className={cn(
        'w-full aspect-[4/3] bg-[#F5F5FA] p-3 sm:p-4 overflow-hidden select-none pointer-events-none',
        className
      )}
    >
      {variant === 'stats' && <StatsPreview />}
      {variant === 'projects' && <ProjectsPreview />}
      {variant === 'timesheet' && <TimesheetPreview />}
      {variant === 'tracker' && <TrackerPreview />}
    </div>
  );
};

const StatsPreview = () => (
  <div className="h-full flex flex-col gap-2">
    <div className="h-2 w-16 rounded bg-gray-200" />
    <div className="grid grid-cols-3 gap-1.5 flex-1">
      {[
        { bg: 'bg-[#005CDA1A]', accent: 'bg-[#005CDA]' },
        { bg: 'bg-[#FF58551A]', accent: 'bg-[#F04438]' },
        { bg: 'bg-[#F0F9FF]', accent: 'bg-[#0086C9]' },
      ].map((c, i) => (
        <div key={i} className={cn('rounded-md p-1.5 flex gap-1.5 items-center', c.bg)}>
          <div className={cn('w-5 h-5 rounded shrink-0 opacity-80', c.accent)} />
          <div className="flex-1 space-y-1">
            <div className="h-2 w-full rounded bg-gray-300/80" />
            <div className="h-1.5 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
    <div className="h-8 rounded-lg bg-white border border-gray-100 shadow-sm" />
  </div>
);

const ProjectsPreview = () => (
  <div className="h-full flex flex-col gap-2 bg-white rounded-lg border border-gray-100 p-2 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="h-2 w-20 rounded bg-gray-200" />
      <div className="h-4 w-14 rounded-md bg-gray-100" />
    </div>
    <div className="space-y-1.5 flex-1">
      {['w-[85%]', 'w-[70%]', 'w-[90%]', 'w-[60%]'].map((w, i) => (
        <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-0">
          <div className="h-1.5 w-4 rounded bg-[#005CDA]/30 shrink-0" />
          <div className={cn('h-1.5 rounded bg-gray-200', w)} />
          <div className="ml-auto h-1.5 w-8 rounded-full bg-[#005CDA]/20" />
        </div>
      ))}
    </div>
  </div>
);

const TimesheetPreview = () => (
  <div className="h-full flex flex-col gap-1.5 bg-white rounded-lg border border-gray-100 p-2 shadow-sm">
    <div className="grid grid-cols-4 gap-1 pb-1 border-b border-gray-100">
      {['Date', 'In', 'Out', 'Total'].map(h => (
        <div key={h} className="h-1.5 rounded bg-gray-300/70" />
      ))}
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="grid grid-cols-4 gap-1 items-center">
        <div className="h-1.5 rounded bg-gray-200" />
        <div className="h-1.5 rounded bg-gray-100" />
        <div className="h-1.5 rounded bg-gray-100" />
        <div className={cn('h-3 rounded-md', i % 2 === 0 ? 'bg-[#ECFDF3]' : 'bg-[#FFF6ED]')} />
      </div>
    ))}
  </div>
);

const TrackerPreview = () => (
  <div className="h-full flex flex-col justify-center gap-3 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
    <div className="space-y-1">
      <div className="h-2 w-24 rounded bg-gray-200" />
      <div className="h-1.5 w-32 rounded bg-gray-100" />
    </div>
    <div className="flex items-center justify-between gap-2">
      <div className="flex-1 rounded-xl bg-[#F8F9FA] border border-gray-100 px-3 py-2">
        <div className="h-3 w-16 rounded bg-gray-800/80 mb-1" />
        <div className="h-1.5 w-12 rounded bg-gray-200" />
      </div>
      <div className="h-8 w-20 rounded-xl bg-gradient-to-b from-[#005CDA] to-[#001F4A] shrink-0" />
    </div>
  </div>
);

export default ActivityPreview;
