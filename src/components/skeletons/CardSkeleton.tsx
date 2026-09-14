import React from 'react';
import { cn } from '@/utils/cn';
import Skeleton from './skeleton';

interface CardSkeletonProps {
  className?: string;
}

const CardSkeleton: React.FC<CardSkeletonProps> = ({ className }) => {
  return (
    <Skeleton
      variant="rectangular"
      height={120}
      className={cn('rounded-lg w-full', className)}
    />
  );
};

export default CardSkeleton;
