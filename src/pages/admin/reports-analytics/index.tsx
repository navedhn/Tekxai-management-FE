import React, { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import { AttendanceReport } from './AttendanceReport';
import { AssetsReport } from './AssetsReport';
import { RequisitionsReport } from './RequisitionsReport';
import { TicketsReport } from './TicketsReport';
import { ExpensesReport } from './ExpensesReport';

const REPORT_TABS = [
  { label: 'Attendance', value: 'attendance' },
  { label: 'Assets', value: 'assets' },
  { label: 'Requisitions', value: 'requisitions' },
  { label: 'Tickets', value: 'tickets' },
  { label: 'Expenses', value: 'expenses' },
];

const ReportsAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <div className="flex flex-col gap-5 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Overview of key business metrics and activity across the organization.
        </p>
      </div>

      <Tabs options={REPORT_TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'attendance' && <AttendanceReport />}
      {activeTab === 'assets' && <AssetsReport />}
      {activeTab === 'requisitions' && <RequisitionsReport />}
      {activeTab === 'tickets' && <TicketsReport />}
      {activeTab === 'expenses' && <ExpensesReport />}
    </div>
  );
};

export default ReportsAnalyticsPage;
