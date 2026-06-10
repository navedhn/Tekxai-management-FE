import React from 'react';
import Skeleton from './skeleton';

const StatSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 min-w-0 border-r border-[#00000014] lg:border-gray-100 last:border-r-0">
      <Skeleton variant="rectangular" width={48} height={48} className="rounded-lg shrink-0" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <Skeleton variant="text" width="35%" height={20} />
        <Skeleton variant="text" width="65%" height={14} />
        <Skeleton variant="text" width="50%" height={12} />
      </div>
    </div>
  );
};

export default StatSkeleton;
