import React, { useState, useMemo } from 'react';
import { useGetTimesheet, TimesheetEntry } from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { ChevronDown, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import RequestTimeOffModal from '@/components/ui/RequestTimeOffModal';

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
    const { data: timesheet, isLoading } = useGetTimesheet();
    const [activeTab, setActiveTab] = useState('Weekly View');
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
            key: 'date',
            render: (item) => <span className="font-bold text-gray-900">{formatDate(item.date)}</span>
        },
        { header: 'Check In', key: 'checkIn' },
        { header: 'Check Out', key: 'checkOut' },
        { header: 'Duration', key: 'duration' },
        {
            header: 'Status',
            key: 'status',
            render: (item) => {
                const statusStyles: Record<string, string> = {
                    'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
                    'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
                    'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
                    'Completed': 'bg-[#EFF8FF] text-[#005CDA] border-[#D1E9FF]'
                };
                const style = statusStyles[item.status] || '';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-2 py-0.5 text-[10px] font-bold border", style)}
                    >
                        {item.status}
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

    if (isLoading) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8 pb-10">
            <RequestTimeOffModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
            {/* Header Section */}
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Timesheet</h1>
                    <p className="text-sm text-gray-400 font-bold">View and manage your time entries</p>
                </div>
                <button className="flex bg-white items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-500 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors">
                    Weekly <ChevronDown size={18} />
                </button>
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
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Week of Dec 29 - Jan 4, 2026</h2>
                    </div>

                    <div className="px-4 pb-4">
                        <Table
                            columns={columns}
                            data={timesheet || []}
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

                        {/* Recursive Request Cards */}
                        {MOCK_LEAVE_REQUESTS.map((req) => (
                            <Card key={req.id} className="p-6 flex flex-col gap-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold  text-gray-900">{req.type}</h3>
                                            <Badge
                                                variant={req.status === 'Rejected' ? 'error' : 'success'}
                                                className={cn(
                                                    "px-2 py-0.5 text-[10px] font-bold rounded-lg",
                                                    req.status === 'Rejected' ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-500 border-green-100"
                                                )}
                                            >
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold tracking-tight">{req.dateRange}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-base font-black text-gray-900">{req.duration}</span>
                                        <span className="text-base text-gray-400 font-bold">{req.totalHours}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[14px] font-bold text-gray-400 mb-1">Reason: <span className="font-medium text-gray-600">{req.reason}</span></p>
                                    </div>
                                    {req.managerComment && (
                                        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[14px] font-bold text-gray-400 mb-1">Manager comment: <span className="font-medium text-gray-600">{req.managerComment}</span></p>
                                        </div>
                                    )}
                                </div>

                                <span className="text-[10px] text-gray-400 font-bold mt-2">{req.submittedAt}</span>
                            </Card>
                        ))}

                        <div className="mt-4">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Timesheet Edit Requests</h3>
                            <p className="text-xs text-gray-400 font-bold mt-2">No edit requests found.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTimesheet;
