import React from "react";
import Skeleton from "./skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5 }) => {
  // Deterministic widths to avoid hydration mismatches
  const getWidth = (rowIndex: number, colIndex: number) => {
    const base = colIndex === 0 ? 60 : 40;
    const variancy = (rowIndex * 7 + colIndex * 13) % 30;
    return `${base + variancy}%`;
  };

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-200">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-4">
                <Skeleton variant="text" width={i === 0 ? "60%" : "40%"} height={16} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="group">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    {colIndex === 0 && (
                      <Skeleton variant="circular" width={32} height={32} className="shrink-0" />
                    )}
                    <Skeleton 
                      variant="text" 
                      width={getWidth(rowIndex, colIndex)} 
                      height={14} 
                    />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;