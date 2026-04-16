import React, { useState, useMemo } from 'react';
import { useGetTimesheet } from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { ChevronDown, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import RequestTimeOffModal from '@/components/ui/RequestTimeOffModal';
import { useGetTimeOffRequests, useGetWeeklyTimesheet, TimesheetEntry } from '@/services/timesheetService';

interface LeaveRequest {
    id: string;
    type: string;
    status: 'Rejected' | 'Pending' | 'Approved';
    dateRange: string;
    duration: string;
    totalHours: string;
    reason: string;
    managerComment?: string;
    submittedAt: string;
}

const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
    {
        id: '1',
        type: 'Paid Leave',
        status: 'Rejected',
        dateRange: 'Dec 13, 2025 - Dec 15, 2025',
        duration: '1 day',
        totalHours: '8.0h total',
        reason: 'Requesting leave due to a family matter.',
        managerComment: 'Please ensure task handover.',
        submittedAt: 'Submitted Dec 12, 2025 7:10 PM'
    },
    {
        id: '2',
        type: 'Paid Leave',
        status: 'Pending',
        dateRange: 'Dec 13, 2025 - Dec 15, 2025',
        duration: '3 days',
        totalHours: '24.0h total',
        reason: 'Requesting leave due to a family matter.',
        submittedAt: 'Submitted Dec 12, 2025 4:54 PM'
    }
];

const EmployeeTimesheet: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Weekly View');
    const { data: timesheet, isLoading } = useGetWeeklyTimesheet(undefined, activeTab === 'Weekly View');
    const { data: timeOffRequests, isLoading: isLoadingRequests } = useGetTimeOffRequests(activeTab === 'My Requests');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const tabs = ['Weekly View', 'My Requests'];

    // Helper to format date as "Mon, Dec 29"
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                month: 'short',
                day: '2-digit'
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const columns: Column<TimesheetEntry>[] = [
        {
            header: 'Day',
            key: 'day_date',
            render: (item) => <span className="font-bold text-gray-900">{item.day_label || formatDate(item.day_date)}</span>
        },
        {
            header: 'Check In',
            key: 'check_in',
            render: (item) => <span className={!item.has_entry ? "text-gray-400" : ""}>{item.check_in || item.no_entry_text}</span>
        },
        {
            header: 'Check Out',
            key: 'check_out',
            render: (item) => <span className={!item.has_entry ? "text-gray-400" : ""}>{item.check_out || item.no_entry_text}</span>
        },
        { header: 'Duration', key: 'duration_label', render: (item) => <span>{item.duration_label}</span> },
        {
            header: 'Status',
            key: 'status',
            render: (item) => {
                if (!item.has_entry && !item.status) return null;
                const statusStyles: Record<string, string> = {
                    'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
                    'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
                    'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
                    'Completed': 'bg-[#EFF8FF] text-[#005CDA] border-[#D1E9FF]'
                };
                const style = item.status_label ? statusStyles[item.status_label] : '';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold border", style)}
                    >
                        {item.status_label || item.status}
                    </Badge>
                );
            }
        },
        {
            header: '',
            key: 'actions',
            render: () => (
                <div className="flex justify-end">
                    <button className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg transition-all active:scale-95">
                        <MoreVertical size={16} />
                    </button>
                </div>
            )
        }
    ];

    if (isLoading || isLoadingRequests) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8 pb-10">
            <RequestTimeOffModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
            {/* Header Section */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Timesheet</h1>
                    <p className="text-sm text-gray-400 font-bold">View and manage your time entries</p>
                </div>

            </div>

            {/* Tab Navigation */}
            <Tabs
                options={tabs}
                value={activeTab}
                onChange={setActiveTab}
            />

            {/* Content Logic */}
            {activeTab === 'Weekly View' ? (
                /* Main Content Card - Weekly View */
                <Card className="flex flex-col gap-4 shadow-xl border-none p-0 overflow-hidden bg-white">
                    <div className="px-4 pt-4">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{timesheet?.week_label || 'Current Week'}</h2>
                    </div>

                    <div className="px-4 pb-4">
                        <Table
                            columns={columns}
                            data={timesheet?.rows || []}
                            className="border-none shadow-none"
                            headerClassName="bg-[#F0F5FF]/50 border-none rounded-xl"
                        />
                    </div>
                </Card>
            ) : (
                /* My Requests View */
                <div className="flex flex-col gap-8 bg-white p-6 rounded-xl">
                    {/* Sub Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Requests</h2>
                        <Button
                            variant="primary"
                            className="rounded-xl px-6 flex items-center gap-2"
                            onClick={() => setIsRequestModalOpen(true)}
                        >
                            <Calendar size={18} />
                            <span>Request Time Off</span>
                        </Button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Time Off Requests</h3>

                        {timeOffRequests?.time_off_requests?.length ? timeOffRequests.time_off_requests.map((req: any) => (
                            <Card key={req.id} className="p-6 flex flex-col gap-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold  text-gray-900">{req.policy_name || req.type || req.policy?.name || 'Leave Request'}</h3>
                                            <Badge
                                                variant={req.status === 'REJECTED' || req.status === 'Rejected' ? 'error' : 'success'}
                                                className={cn(
                                                    "px-2 py-0.5 text-[10px] font-bold rounded-lg",
                                                    (req.status === 'REJECTED' || req.status === 'Rejected') ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-500 border-green-100"
                                                )}
                                            >
                                                {req.status_label || req.status}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold tracking-tight">{req.date_range_label || req.dateRange || `${req.start_date} - ${req.end_date}`}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-base font-black text-gray-900">{req.days ? `${req.days} days` : req.duration || "N/A"}</span>
                                        <span className="text-base text-gray-400 font-bold">{req.total_hours_label || req.totalHours || "N/A"}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[14px] font-bold text-gray-400 mb-1">Reason: <span className="font-medium text-gray-600">{req.reason}</span></p>
                                    </div>
                                    {(req.manager_comment || req.managerComment) && (
                                        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[14px] font-bold text-gray-400 mb-1">Manager comment: <span className="font-medium text-gray-600">{req.manager_comment || req.managerComment}</span></p>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[10px] tracking-tight font-bold text-gray-400 pb-1">{req.submitted_at_label || req.submittedAt}</span>
                            </Card>
                        )) : <p className="text-xs text-gray-400 font-bold mt-2">No time off requests found.</p>}

                        <div className="mt-4">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Timesheet Edit Requests</h3>
                            {timeOffRequests?.timesheet_edit_requests?.length ? timeOffRequests.timesheet_edit_requests.map((req: any) => (
                                <Card key={req.id} className="p-6 flex flex-col gap-4 mt-4 bg-white border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-gray-900">{req.name || 'Edit Request'}</h3>
                                    <p className="text-[14px] font-bold text-gray-400">{req.reason}</p>
                                    <Badge
                                        variant="info"
                                        className={cn(
                                            "!w-max px-2 py-0.5 text-[10px] font-bold rounded-lg border",
                                            req.status === 'Pending' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-gray-50 text-gray-500"
                                        )}
                                    >
                                        {req.status}
                                    </Badge>
                                </Card>
                            )) : <p className="text-xs text-gray-400 font-bold mt-2">No edit requests found.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTimesheet;
