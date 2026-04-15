import React, { useState, useMemo } from 'react';
import { useGetTimesheet, TimesheetEntry } from '@/services/employeeService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Loader from '@/components/ui/Loader';
import { ExternalLink, ChevronDown, Check, X, User, Calendar, Clock, SquarePen, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ReviewEditRequestModal from '@/components/modals/ReviewEditRequestModal';
import { useDebounce } from '@/hooks/useDebounce';
import Select from '@/components/ui/Select';

const mockEditRequests = [
    { id: '1', name: 'Arslan dar', status: 'Pending', time: 'Dec 12, 2:27 PM', reason: 'Forgot to check in on time' },
    { id: '2', name: 'Mubbashar Farooq', status: 'Pending', time: 'Dec 12, 2:27 PM', reason: 'Forgot to check in on time' },
    { id: '3', name: 'Ali Hamza', status: 'Pending', time: 'Dec 12, 2:27 PM', reason: 'Forgot to check in on time' },
];

const mockTimeOffRequests = [
    { id: '1', name: 'Arslan dar', email: 'arslandar@yodo.com', type: 'Paid Leave', dateRange: 'Dec 19 - Dec 21, 2025', duration: '3 day(s)', reason: 'Family vacation planned', avatar: 'https://i.pravatar.cc/150?u=arslan' },
    { id: '2', name: 'Mubbashar Farooq', email: 'mubbasharfarooq88@yodo.com', type: 'Paid Leave', dateRange: 'Dec 19 - Dec 21, 2025', duration: '3 day(s)', reason: 'Family vacation planned', avatar: 'https://i.pravatar.cc/150?u=mubbashar' },
];

const TimesheetManagement: React.FC = () => {
    const { data: timesheet, isLoading } = useGetTimesheet();
    const [activeTab, setActiveTab] = useState('All Entries');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRequestEditModalOpen, setIsRequestEditModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
    const [editForm, setEditForm] = useState({ checkIn: '20/03/2023', checkOut: '20/03/2024', reason: '' });

    const itemsPerPage = 8;

    const tabs = ['All Entries', 'Edit Requests', 'Time Off Requests'];

    // 🔍 Filter and Paginate data
    const filteredAndPaginatedData = useMemo(() => {
        if (!timesheet) return { data: [], total: 0 };

        let processed = [...timesheet];

        // Apply search filter
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            processed = processed.filter(entry =>
                entry.employee.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter !== 'ALL') {
            processed = processed.filter(entry => entry.status === statusFilter);
        }

        const total = processed.length;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return {
            data: processed.slice(startIndex, startIndex + itemsPerPage),
            total
        };
    }, [timesheet, currentPage, debouncedSearch, statusFilter]);

    const { data: paginatedData, total: totalFilteredItems } = filteredAndPaginatedData;
    const totalPages = Math.ceil(totalFilteredItems / itemsPerPage);

    const columns: Column<TimesheetEntry>[] = [
        {
            header: 'Employee',
            key: 'employee',
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white shadow-sm">
                        {item.employee.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-bold text-gray-900">{item.employee}</span>
                </div>
            )
        },
        { header: 'Date', key: 'date' },
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
                    'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]'
                };
                const style = statusStyles[item.status] || '';
                return (
                    <Badge
                        variant="info"
                        className={cn("rounded-lg px-3 py-1 text-[10px] font-black bg-gray-50/80 p-1 rounded-2xl border border-gray-100/50 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-max tracking-wider border", style)}
                    >
                        {item.status}
                    </Badge>
                );
            }
        },
        {
            header: '',
            key: 'actions',
            render: (item) => (
                <button
                    onClick={() => {
                        setSelectedEntry(item);
                        setEditForm({ ...editForm, checkIn: item.checkIn === 'No entries' ? '' : item.checkIn });
                        setIsEditModalOpen(true);
                    }}
                    className="p-2 hover:bg-primary-50 text-primary-500 rounded-lg transition-all active:scale-95 group"
                >
                    <SquarePen size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            )
        }
    ];

    if (isLoading) return <Loader fullPage size={48} />;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Timesheet Management</h1>
                <p className="text-sm text-gray-500 font-medium max-w-2xl">View, edit, and approve all time entries. Keep track of your team's productivity and efficiency effortlessly.</p>
            </div>

            <Card className="flex flex-col gap-3 shadow-2xl border-none p-0 overflow-hidden bg-transparent shadow-none">

                <Tabs
                    options={tabs}
                    value={activeTab}
                    onChange={setActiveTab}
                />
                <div className="px-6 pb-6 mt-4 bg-white rounded-[20px]">

                    <div className="flex flex-col md:flex-row items-center justify-between py-6 gap-4 border-b border-gray-100">
                        <div className="flex md:items-center md:flex-row flex-col  gap-4 w-full justify-between">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight whitespace-nowrap">
                                {activeTab === 'All Entries' && 'Weekly Timesheet'}
                                {activeTab === 'Edit Requests' && 'Pending Edit Requests'}
                                {activeTab === 'Time Off Requests' && 'Pending Time Off Requests'}
                            </h2>
                            {activeTab === 'All Entries' && (
                                <div className="flex sm:items-center gap-2 sm:flex-row flex-col">
                                    <Input
                                        placeholder="Search employee..."
                                        leftIcon={Search}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        containerClassName="min-w-[300px]"
                                        className="h-10 rounded-xl text-sm"
                                    />
                                    <Select
                                        options={[
                                            { value: 'ALL', label: 'All Status' },
                                            { value: 'Completed', label: 'Completed' },
                                            { value: 'Pending', label: 'Pending' },
                                            { value: 'In Progress', label: 'In Progress' },
                                            { value: 'Overdue', label: 'Overdue' }
                                        ]}
                                        value={statusFilter}
                                        onChange={(val) => setStatusFilter(val as string)}
                                        className="h-10 !rounded-xl text-xs font-black min-w-[140px]"
                                    />
                                </div>
                            )}
                        </div>

                    </div>
                    <AnimatePresence mode="wait">
                        {activeTab === 'All Entries' && (
                            <motion.div
                                key="all-entries"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Table
                                    columns={columns}
                                    data={paginatedData}
                                    className="border-none shadow-none bg-white  overflow-hidden"
                                    pagination={{
                                        currentPage: currentPage,
                                        totalPages: totalPages,
                                        onPageChange: setCurrentPage,
                                        totalEntries: totalFilteredItems,
                                        entriesPerPage: itemsPerPage
                                    }}
                                    emptyMessage="No time entries found."
                                />
                            </motion.div>
                        )}

                        {activeTab === 'Edit Requests' && (
                            <motion.div
                                key="edit-requests"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-4"
                            >
                                {mockEditRequests.map((req) => (
                                    <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col gap-4 shadow-sm group hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-lg text-gray-900 tracking-tight">{req.name}</span>
                                                    <Badge variant="info" className="bg-orange-50 text-orange-500 border border-orange-100 font-black text-[10px] px-2 py-0.5 rounded-md">
                                                        {req.status}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{req.time}</span>
                                            </div>
                                            <Button variant='primary' onClick={() => setIsRequestEditModalOpen(true)} className='rounded-xl py-2 text-xs'>
                                                Review
                                            </Button>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-sm font-medium text-gray-500">{req.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                        <ReviewEditRequestModal isOpen={isRequestEditModalOpen} onClose={() => setIsRequestEditModalOpen(false)} />

                        {activeTab === 'Time Off Requests' && (
                            <motion.div
                                key="time-off-requests"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                            >
                                {mockTimeOffRequests.map((req) => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={req.avatar} className="h-12 w-12 rounded-full border-4 border-white shadow-sm ring-1 ring-gray-100" alt={req.name} />
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900 tracking-tight">{req.name}</span>
                                                    <span className="text-xs font-bold text-gray-400">{req.email}</span>
                                                </div>
                                            </div>
                                            <Badge variant="info" className="bg-red-50 text-red-500 border border-red-100 font-bold text-[11px] px-4 py-1.5 rounded-full">
                                                {req.type}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Calendar size={16} />
                                                <span className="text-xs font-bold">{req.dateRange}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock size={16} />
                                                <span className="text-xs font-bold">{req.duration}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col gap-2 min-h-[100px]">
                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Reason</span>
                                            <p className="text-sm font-medium text-gray-500 leading-relaxed">{req.reason}</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <button className="flex-1 py-3.5 bg-red-500 text-white font-black text-sm rounded-xl hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-100">
                                                <X size={18} strokeWidth={3} /> Reject
                                            </button>
                                            <Button variant='primary' className="flex-1 py-3.5  text-sm  transition-all rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                                                <Check size={18} strokeWidth={3} /> Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            {/* Edit Time Entry Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Time Entry"
                size="md"
            >
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Check In"
                            value={editForm.checkIn}
                            onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                            leftIcon={Calendar}
                            placeholder="Select time"
                        />
                        <Input
                            label="Check Out"
                            value={editForm.checkOut}
                            onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                            leftIcon={Calendar}
                            placeholder="Select time"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-black text-gray-700 ml-1">Reason for Edit (Required)</label>
                        <textarea
                            className="w-full min-h-[150px] rounded-2xl border border-gray-200 p-5 text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all resize-none bg-white"
                            placeholder="Explain why this edit is being made...."
                            value={editForm.reason}
                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                        />
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <Button
                            fullWidth
                            variant="primary"
                            size="lg"
                            className="rounded-xl py-4 font-black shadow-lg shadow-blue-100"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Save Changes
                        </Button>
                        <Button
                            fullWidth
                            variant="outline"
                            size="lg"
                            className="rounded-xl py-4 font-bold border-none bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition-all shadow-none"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TimesheetManagement;
