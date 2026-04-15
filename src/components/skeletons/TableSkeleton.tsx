import React from 'react';
import Skeleton from './skeleton';

type Props = {
  rows?: number;
  columns?: number;
};

const TableSkeleton: React.FC<Props> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height={20} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="100%" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;

