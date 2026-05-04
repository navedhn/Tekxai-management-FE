import React from 'react';
import Skeleton from './skeleton';

const StatSkeleton: React.FC = () => {
  return (
    <div className="flex items-center px-4 md:px-6 py-4 gap-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-100 last:border-b-0 lg:last:border-r-0">
      <Skeleton variant="rectangular" width={64} height={64} className="rounded-xl shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton variant="text" width="40%" height={24} />
        <Skeleton variant="text" width="70%" height={14} />
        <Skeleton variant="text" width="50%" height={12} />
      </div>
    </div>
  );
};

export default StatSkeleton;
