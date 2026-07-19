import React, { useState, useMemo } from 'react';
import {
    useGetWeeklyTimesheet,
    useGetTimesheetRequests,
    useUpdateTimesheetMutation,
    useApproveTimeOffMutation,
    useRejectTimeOffMutation,
    useDeleteTimeOffMutation,
    TimesheetEntry,
    EditRequest,
} from '@/services/timesheetService';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import { Check, X, Trash2, Calendar, Clock, SquarePen, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import ActionModal from '@/components/ui/ActionModal';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import ReviewEditRequestModal from '@/components/modals/ReviewEditRequestModal';
import { useDebounce } from '@/hooks/useDebounce';
import Select from '@/components/ui/Select';
import { useToastContext } from '@/components/toast/ToastProvider';
import { CardSkeleton } from '@/components/skeletons';

const TimesheetManagement: React.FC = () => {
    const toast = useToastContext();
    const [activeTab, setActiveTab] = useState('All Entries');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const debouncedSearch = useDebounce(searchQuery, 500);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRequestEditModalOpen, setIsRequestEditModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
    const [editForm, setEditForm] = useState({ checkIn: '20/03/2023', checkOut: '20/03/2024', reason: '' });

    // Queries
    const { data: timesheet, isLoading: isTimesheetLoading } = useGetWeeklyTimesheet({ search: debouncedSearch, status: statusFilter === 'ALL' ? undefined : statusFilter }, activeTab === 'All Entries');
    const { data: requestData, isLoading: isRequestsLoading } = useGetTimesheetRequests(activeTab === 'Edit Requests' || activeTab === 'Time Off Requests');

    const editRequests = requestData?.timesheet_edit_requests || [];
    const timeOffRequests = requestData?.time_off_requests || [];

    // Mutations
    const updateMutation = useUpdateTimesheetMutation();
    const approveMutation = useApproveTimeOffMutation();
    const rejectMutation = useRejectTimeOffMutation();
    const deleteMutation = useDeleteTimeOffMutation();

    const itemsPerPage = 8;
    const tabs = ['All Entries', 'Edit Requests', 'Time Off Requests'];

    const paginatedData = useMemo(() => {
        if (!timesheet || !timesheet.rows) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return timesheet.rows.slice(startIndex, startIndex + itemsPerPage);
    }, [timesheet, currentPage]);

    const totalPages = Math.ceil((timesheet?.rows?.length || 0) / itemsPerPage);

    const handleUpdateEntry = async () => {
        if (!selectedEntry || !selectedEntry.entry_id) {
            toast.error('No valid entry ID found');
            return;
        }
        if (!editForm.reason.trim()) {
            toast.error('Reason for edit is required');
            return;
        }
        try {
            await updateMutation.mutateAsync({ id: selectedEntry.entry_id, data: editForm });
            toast.success('Entry updated successfully');
            setIsEditModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update entry');
        }
    };

    const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

    const handleApproveTimeOff = async (id: string) => {
        setPendingRequestId(id);
        try {
            await approveMutation.mutateAsync(id);
            toast.success('Request approved');
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve');
        } finally {
            setPendingRequestId(null);
        }
    };

    const handleRejectTimeOff = async (id: string) => {
        setPendingRequestId(id);
        try {
            await rejectMutation.mutateAsync(id);
            toast.success('Request rejected');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject');
        } finally {
            setPendingRequestId(null);
        }
    };

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const handleDeleteTimeOff = async () => {
        if (!deleteTargetId) return;
        setPendingRequestId(deleteTargetId);
        try {
            await deleteMutation.mutateAsync(deleteTargetId);
            toast.success('Request deleted');
            setDeleteTargetId(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete');
        } finally {
            setPendingRequestId(null);
        }
    };

    const columns: Column<TimesheetEntry>[] = [
        { header: 'Date', key: 'day_date' },
        {
            header: 'Check In',
            key: 'check_in ',
            render: (item) => <span className={!item.has_entry ? "text-gray-400 " : ""}>{item.check_in || item.no_entry_text}</span>
        },
        {
            header: 'Check Out',
            key: 'check_out',
            render: (item) => <span className={!item.has_entry ? "text-gray-400" : ""}>{item.check_out || item.no_entry_text}</span>
        },
        { header: 'Duration', key: 'duration_label ', render: (item) => <span>{item.duration_label}</span> },
        {
            header: 'Action',
            key: 'actions',
            render: (item) => (
                !item.has_entry ? null : (
                    <button
                        onClick={() => {
                            setSelectedEntry(item);
                            setEditForm({
                                checkIn: item.check_in || '',
                                checkOut: item.check_out || '',
                                reason: ''
                            });
                            setIsEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-primary-50 text-primary-500 rounded-lg transition-all active:scale-95 group"
                    >
                        <SquarePen size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                )
            )
        }
    ];

    const isTabLoading = (activeTab === 'All Entries' && isTimesheetLoading) || 
                       ((activeTab === 'Edit Requests' || activeTab === 'Time Off Requests') && isRequestsLoading);

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
                        <div className="flex md:items-center md:flex-row flex-col gap-4 w-full justify-between">
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
                                    isLoading={isTimesheetLoading}
                                    className="border-none shadow-none bg-white overflow-hidden"
                                    pagination={{
                                        currentPage: currentPage,
                                        totalPages: totalPages,
                                        onPageChange: setCurrentPage,
                                        totalEntries: timesheet?.rows?.length || 0,
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
                                className="flex flex-col gap-4 py-4"
                            >
                                {isRequestsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
                                ) : editRequests && editRequests.length > 0 ? editRequests.map((req) => (
                                    <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col gap-4 shadow-sm group hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-lg text-gray-900 tracking-tight">{req.name}</span>
                                                    <Badge variant="info" className="bg-orange-50 text-orange-500 border border-orange-100 font-black text-[10px] px-2 py-0.5 rounded-md">
                                                        {req.status_label || req.status}
                                                    </Badge>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{req.date_range_label || req.time}</span>
                                            </div>
                                            <Button variant='primary' onClick={() => { setSelectedRequest(req); setIsRequestEditModalOpen(true); }} className='rounded-xl py-2 text-xs'>
                                                Review
                                            </Button>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-sm font-medium text-gray-500">{req.reason}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 italic ">No edit requests found.</div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'Time Off Requests' && (
                            <motion.div
                                key="time-off-requests"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4"
                            >
                                {isRequestsLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                                ) : timeOffRequests.length ? timeOffRequests.map((req) => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={req.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.name || 'Unknown User')}&background=random`} className="h-12 w-12 rounded-full border-4 border-white shadow-sm ring-1 ring-gray-100" alt={req.name || ''} />
                                                <div className="flex flex-col">
                                                    <span className="font-black text-gray-900 tracking-tight">{req.name || 'Unknown User'}</span>
                                                    <span className="text-xs font-bold text-gray-400">{req.email || ''}</span>
                                                </div>
                                            </div>
                                            <Badge variant="info" className="bg-red-50 text-red-500 border border-red-100 font-bold text-[11px] px-4 py-1.5 rounded-full">
                                                {req.policy_name || req.type || 'Leave Request'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Calendar size={16} />
                                                <span className="text-xs font-bold">{req.date_range_label || req.dateRange}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock size={16} />
                                                <span className="text-xs font-bold">{req.days ? `${req.days} days` : req.duration}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col gap-2 min-h-[100px]">
                                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Reason</span>
                                            <p className="text-sm font-medium text-gray-500 leading-relaxed">{req.reason}</p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                disabled={pendingRequestId !== null}
                                                onClick={() => handleRejectTimeOff(req.id)}
                                                className="flex-1 py-3.5 bg-red-100 text-red-600 font-black text-sm rounded-xl hover:bg-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {rejectMutation.isPending && pendingRequestId === req.id ? <Loader2 className="animate-spin" size={18} /> : <><X size={18} strokeWidth={3} /> Reject</>}
                                            </button>
                                            <Button
                                                variant='primary'
                                                loading={approveMutation.isPending && pendingRequestId === req.id}
                                                disabled={pendingRequestId !== null && pendingRequestId !== req.id}
                                                onClick={() => handleApproveTimeOff(req.id)}
                                                className="flex-1 py-3.5 text-sm transition-all rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                                            >
                                                <Check size={18} strokeWidth={3} /> Approve
                                            </Button>
                                            <button
                                                disabled={pendingRequestId !== null}
                                                onClick={() => setDeleteTargetId(req.id)}
                                                title="Delete request"
                                                className="p-3.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {deleteMutation.isPending && pendingRequestId === req.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center py-12 italic">No time-off requests found.</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            <ReviewEditRequestModal
                isOpen={isRequestEditModalOpen}
                onClose={() => { setIsRequestEditModalOpen(false); setSelectedRequest(null); }}
                request={selectedRequest}
            />

            <ActionModal
                isOpen={!!deleteTargetId}
                onClose={() => setDeleteTargetId(null)}
                onConfirm={handleDeleteTimeOff}
                title="Delete Time-Off Request"
                description="Are you sure you want to delete this request? This cannot be undone — use this to remove stray requests (e.g. left behind after an employee was deleted), not to decide a live request (use Approve/Reject for that)."
                confirmText="Delete"
                confirmVariant="danger"
                icon="delete"
                loading={deleteMutation.isPending}
            />

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
                            type="datetime-local"
                            value={editForm.checkIn}
                            onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                            leftIcon={Calendar}
                            placeholder="Select time"
                        />
                        <Input
                            label="Check Out"
                            type="datetime-local"
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
                            onClick={handleUpdateEntry}
                            loading={updateMutation.isPending}
                        >
                            Save Changes
                        </Button>
                        <Button
                            fullWidth
                            variant="outline"
                            size="lg"
                            className="rounded-xl py-4 font-bold border-none bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition-all shadow-none"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={updateMutation.isPending}
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

