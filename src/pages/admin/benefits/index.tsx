import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

const BenefitsAdminPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState('HEALTH');

  const plansQ = useQuery({
    queryKey: ['benefits', 'plans'],
    queryFn: () => apiRequest<any>('/api/v1/benefits/plans?all=true'),
  });
  const enrollQ = useQuery({
    queryKey: ['benefits', 'enrollments'],
    queryFn: () => apiRequest<any>('/api/v1/benefits/enrollments'),
  });

  const createPlan = useMutation({
    mutationFn: () => apiRequest('/api/v1/benefits/plans', {
      method: 'POST',
      body: JSON.stringify({ name, plan_type: planType }),
    }),
    onSuccess: () => { toast.success('Plan created'); setName(''); qc.invalidateQueries({ queryKey: ['benefits'] }); },
    onError: (e: any) => toast.error(e?.message || 'Failed'),
  });

  if (plansQ.isLoading) return <PageSkeleton />;
  const plans = plansQ.data?.payload?.records || [];
  const enrollments = enrollQ.data?.payload?.records || [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Benefits</h1>
      <p className="text-sm text-gray-500 mb-6">Manage benefit plans and employee enrollments.</p>

      <div className="flex gap-2 mb-6">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Plan name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={planType} onChange={(e) => setPlanType(e.target.value)}>
          {['HEALTH', 'DENTAL', 'VISION', 'LIFE', 'RETIREMENT', 'OTHER'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm" disabled={!name.trim()} onClick={() => createPlan.mutate()}>Add plan</button>
      </div>

      <h2 className="font-medium mb-2">Plans</h2>
      <div className="grid md:grid-cols-2 gap-3 mb-8">
        {plans.map((p: any) => (
          <div key={p.id} className="border rounded-xl p-4 bg-white">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-500 mt-1">{p.plan_type} · {p.is_active ? 'Active' : 'Inactive'} · {p._count?.enrollments || 0} enrolled</div>
            {p.description && <p className="text-sm text-gray-600 mt-2">{p.description}</p>}
          </div>
        ))}
      </div>

      <h2 className="font-medium mb-2">Enrollments</h2>
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Dependents</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e: any) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">{e.user?.first_name} {e.user?.last_name}</td>
                <td className="px-3 py-2">{e.plan?.name}</td>
                <td className="px-3 py-2">{e.status}</td>
                <td className="px-3 py-2">{e.dependents?.length || 0}</td>
              </tr>
            ))}
            {!enrollments.length && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">No enrollments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BenefitsAdminPage;
