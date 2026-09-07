import React from 'react';
import PageSkeleton, { getPageSkeletonVariant } from '@/components/skeletons/PageSkeleton';

const RouteFallback: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  return <PageSkeleton variant={getPageSkeletonVariant(pathname)} />;
};

export default RouteFallback;
