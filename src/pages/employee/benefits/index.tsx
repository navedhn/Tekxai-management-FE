import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PageSkeleton } from '@/components/skeletons';

/** Employee view of own benefit enrollments. */
const MyBenefitsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['benefits', 'me'],
    queryFn: () => apiRequest<any>('/api/v1/benefits/enrollments/me'),
  });
  if (isLoading) return <PageSkeleton />;
  const records = data?.payload?.records || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">My benefits</h1>
      <p className="text-sm text-gray-500 mb-6">Your current benefit enrollments and dependents.</p>
      <div className="flex flex-col gap-3">
        {records.map((e: any) => (
          <div key={e.id} className="border rounded-xl p-4 bg-white">
            <div className="font-medium">{e.plan?.name}</div>
            <div className="text-xs text-gray-500 mt-1">{e.plan?.plan_type} · {e.status}</div>
            {e.dependents?.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc pl-5">
                {e.dependents.map((d: any) => (
                  <li key={d.id}>{d.name} ({d.relation})</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {!records.length && <div className="text-sm text-gray-500 text-center py-10">No enrollments.</div>}
      </div>
    </div>
  );
};

export default MyBenefitsPage;
