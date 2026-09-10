import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Tabs from '@/components/ui/Tabs';
import { AssetsReport } from './AssetsReport';
import { RequisitionsReport } from './RequisitionsReport';
import { TicketsReport } from './TicketsReport';
import { ExpensesReport } from './ExpensesReport';

// NOTE: the "Attendance" tab was removed here (remediation Phase 13). It
// rendered generateAttendanceRows(60) — fabricated data — which is
// dangerous for a surface that informs payroll/compliance decisions. Real
// attendance analytics live at /admin/attendance (dashboard, org-scoped)
// and /admin/reports (Attendance report, backed by the real API).
const REPORT_TABS = [
  { label: 'Assets', value: 'assets' },
  { label: 'Requisitions', value: 'requisitions' },
  { label: 'Tickets', value: 'tickets' },
  { label: 'Expenses', value: 'expenses' },
];

const ReportsAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assets');

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Overview of key business metrics and activity across the organization.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Looking for attendance analytics? Use{' '}
        <Link to="/admin/attendance" className="font-semibold underline">Attendance</Link>{' '}
        or the{' '}
        <Link to="/admin/reports" className="font-semibold underline">Attendance report</Link>{' '}
        — both are backed by live data.
      </div>

      <Tabs options={REPORT_TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'assets' && <AssetsReport />}
      {activeTab === 'requisitions' && <RequisitionsReport />}
      {activeTab === 'tickets' && <TicketsReport />}
      {activeTab === 'expenses' && <ExpensesReport />}
    </div>
  );
};

export default ReportsAnalyticsPage;
