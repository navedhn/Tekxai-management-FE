import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useActionItems, useCompleteActionItem } from '@/services/meetingService';
import { useToastContext } from '@/components/toast/ToastProvider';

const PRIORITY_BADGE: Record<string, 'success' | 'default' | 'warning' | 'error'> = { LOW: 'default', MEDIUM: 'info' as any, HIGH: 'warning', URGENT: 'error' };
const STATUS_BADGE: Record<string, 'success' | 'default' | 'warning'> = { PENDING: 'default', IN_PROGRESS: 'warning', COMPLETED: 'success' };

export default function ActionItemManagerPage() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const overdueOnly = searchParams.get('overdue') === '1';

  const params = useMemo(() => ({
    status: status || undefined,
    priority: priority || undefined,
    assignee_id: assigneeId || undefined,
    due_to: overdueOnly ? new Date().toISOString() : undefined,
  }), [status, priority, assigneeId, overdueOnly]);

  const { data, isLoading } = useActionItems(params);
  const completeActionItem = useCompleteActionItem();

  const items = data?.records || [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-black text-gray-900">Action Item Manager</h1>
        <p className="text-sm text-gray-500">Track follow-ups assigned during meetings across all rooms</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <select className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <input
          className="h-[46px] rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700"
          placeholder="Filter by assignee ID"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
              <th className="p-4">Title</th>
              <th className="p-4">Meeting</th>
              <th className="p-4">Assignee</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-4 text-gray-400" colSpan={7}>Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td className="p-4 text-gray-400" colSpan={7}>No action items found.</td></tr>}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-semibold text-gray-800">{item.title}</td>
                <td className="p-4 text-primary-600 cursor-pointer" onClick={() => navigate(`/admin/meetings/meeting/${item.meeting_id}`)}>{item.meeting?.title}</td>
                <td className="p-4 text-gray-600">{item.assignee?.first_name} {item.assignee?.last_name}</td>
                <td className="p-4 text-gray-600">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}</td>
                <td className="p-4"><Badge variant={PRIORITY_BADGE[item.priority] as any}>{item.priority}</Badge></td>
                <td className="p-4"><Badge variant={STATUS_BADGE[item.status]}>{item.status}</Badge></td>
                <td className="p-4">
                  {item.status !== 'COMPLETED' && (
                    <button
                      className="text-green-600 hover:text-green-700"
                      title="Mark complete"
                      onClick={() => completeActionItem.mutate(item.id, {
                        onSuccess: () => toast.success('Action item completed'),
                        onError: (e: any) => toast.error(e?.message || 'Failed'),
                      })}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
