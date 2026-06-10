import React from 'react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { Activity } from '@/services/employeeService';
import ActivityPreview from './ActivityPreview';

interface RecentActivityCardProps {
  activity: Activity;
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activity }) => (
  <div className="group cursor-pointer relative rounded-[1.25rem] border border-gray-100 overflow-hidden bg-white">
    {activity.image ? (
      <img
        src={activity.image}
        alt={activity.title}
        className="w-full aspect-[4/3] object-cover object-top transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
    ) : activity.preview ? (
      <ActivityPreview variant={activity.preview} />
    ) : null}

    <div className="absolute top-3 right-3 z-20">
      <Badge
        variant="info"
        className={cn(
          'text-[10px] font-black px-2 py-0.5 rounded-lg border-none',
          activity.progress >= 90
            ? 'bg-[#005CDA] text-white'
            : activity.progress >= 50
              ? 'bg-[#12B76A] text-white'
              : 'bg-[#F04438] text-white'
        )}
      >
        {activity.progress}%
      </Badge>
    </div>

    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center">
      <div className="transform -translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
        <button type="button" className="px-4 py-1.5 text-xs bg-white text-black rounded-full font-semibold shadow">
          View
        </button>
      </div>
      <span className="text-white font-bold text-sm mt-3 text-center px-2">{activity.title}</span>
      {activity.updatedAt && (
        <div className="mt-2 transform translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
          <span className="text-xs text-gray-200">{activity.updatedAt}</span>
        </div>
      )}
    </div>
  </div>
);

export default RecentActivityCard;
