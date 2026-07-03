import React from 'react';
import Skeleton from './skeleton';

interface GraphSkeletonProps {
  className?: string;
  height?: number | string;
}

const GraphSkeleton: React.FC<GraphSkeletonProps> = ({ className, height = 300 }) => {
  return (
    <div className={`p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width={150} height={20} />
          <Skeleton variant="text" width={100} height={14} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
          <Skeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 px-2" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="rectangular" 
            width="6%" 
            height={`${Math.floor(Math.random() * 60) + 20}%`} 
            className="rounded-t-lg"
          />
        ))}
      </div>

      <div className="flex justify-between px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="text" width={40} height={12} />
        ))}
      </div>
    </div>
  );
};

export default GraphSkeleton;
