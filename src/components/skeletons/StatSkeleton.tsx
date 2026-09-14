import React from 'react';
import Skeleton from './skeleton';

const StatSkeleton: React.FC = () => {
  return <Skeleton variant="rectangular" height={88} className="rounded-lg w-full" />;
};

export default StatSkeleton;
