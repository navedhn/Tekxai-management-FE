import React from 'react';
import Skeleton from './skeleton';

interface CardSkeletonProps {
  className?: string;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ className }) => {
  return (
    <div className={`p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex flex-col gap-2">
            <Skeleton variant="text" width={100} height={16} />
            <Skeleton variant="text" width={60} height={12} />
          </div>
        </div>
        <Skeleton variant="rectangular" width={24} height={24} className="rounded-lg" />
      </div>
      
      <div className="space-y-3 mt-2">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="90%" height={14} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
        <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
      </div>
    </div>
  );
};

export default CardSkeleton;
