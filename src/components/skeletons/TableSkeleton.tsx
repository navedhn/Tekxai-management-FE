import React from "react";
import Skeleton from "./skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6 }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={48} className="rounded-lg w-full" />
      ))}
    </div>
  );
};

export default TableSkeleton;
