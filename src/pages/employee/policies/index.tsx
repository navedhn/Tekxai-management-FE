import React from 'react';
import Card from '@/components/ui/Card';
import { ShieldCheck } from 'lucide-react';
import { PolicyList } from '@/components/policies/PolicyList';

// Reachable via the sidebar for anyone holding hr.policies.view/manage —
// deliberately separate from /employee/documents (gated by the unrelated
// erp.my_documents.view), so a user granted Policies access alone still
// gets somewhere to see them, without also being handed contracts/HR
// documents/JD they were never granted access to.
const EmployeePolicies: React.FC = () => (
  <div className="flex flex-col gap-8 pb-10">
    <div>
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">Company Policies</h1>
      <p className="text-sm text-gray-500 font-medium mt-1">View and acknowledge company policies.</p>
    </div>

    <Card className="border-none shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><ShieldCheck size={18} /></div>
        <h2 className="text-lg font-black text-gray-900">Company Policies</h2>
      </div>
      <PolicyList showVersionInfo={false} />
    </Card>
  </div>
);

export default EmployeePolicies;
