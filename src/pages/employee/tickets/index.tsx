import React, { useMemo, useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import Card from '@/components/ui/Card';
import Table, { Column } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Tabs from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import DashboardStatCard from '@/components/ui/DashboardStatCard';
import {
  CreateTicketModal,
  TicketDetailModal,
  TicketStatusBadge,
} from '@/components/tickets';
import { useAuth } from '@/hooks/useAuth';
import {
  filterTicketsByStatus,
  formatTicketDate,
  getTicketStats,
  useGetTickets,
} from '@/services/ticketService';
import { SupportTicket, TicketStatus } from '@/types/ticket';
import { cn } from '@/utils/cn';

const STATUS_TABS = [
  { id: 'all', label: 'All Tickets' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-[#C4320A]',
  high: 'text-red-600 font-bold',
};

const EmployeeTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useGetTickets();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const employeeName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Employee';
  const employeeEmail = user?.email || 'employee@tekxai.com';

  const stats = useMemo(() => getTicketStats(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    const byStatus = filterTicketsByStatus(
      tickets,
      statusTab as TicketStatus | 'all'
    );
    const q = search.toLowerCase();
    if (!q) return byStatus;
    return byStatus.filter(
      t =>
        t.subject.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.recipientName.toLowerCase().includes(q)
    );
  }, [tickets, statusTab, search]);

  const columns: Column<SupportTicket>[] = [
    {
      header: 'Ticket ID',
      key: 'ticketNumber',
      render: item => (
        <span className="font-bold text-[#005CDA] text-sm">{item.ticketNumber}</span>
      ),
    },
    {
      header: 'Subject',
      key: 'subject',
      render: item => (
        <span className="font-semibold text-gray-900 max-w-xs block truncate">{item.subject}</span>
      ),
    },
    {
      header: 'Raised To',
      key: 'recipientName',
      render: item => (
        <div>
          <p className="font-medium text-gray-900">{item.recipientName}</p>
          <p className="text-xs text-gray-500">{item.recipientLabel}</p>
        </div>
      ),
    },
    {
      header: 'Priority',
      key: 'priority',
      render: item => (
        <span className={cn('text-sm capitalize font-semibold', PRIORITY_STYLES[item.priority])}>
          {item.priority}
        </span>
      ),
    },
    {
      header: 'Date',
      key: 'createdAt',
      render: item => (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {formatTicketDate(item.createdAt)}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: item => <TicketStatusBadge status={item.status} />,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: item => (
        <Button
          variant="outline"
          size="sm"
          animation="none"
          rounded={false}
          className="rounded-lg text-xs h-8 px-2.5 bg-white"
          onClick={() => setSelectedTicket(item)}
        >
          <Eye size={13} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Support Tickets</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Raise tickets to TL, Office Boy, HR, Admin, or anyone on your team.
          </p>
        </div>
        <Button
          animation="none"
          rounded={false}
          className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB] h-11 px-5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} />
          Create Ticket
        </Button>
      </div>

      <div className="p-3 rounded-[8px] bg-white">
        <div className="bg-[#F8F8F8] grid grid-cols-2 lg:grid-cols-4 gap-3 py-4">
          <DashboardStatCard
            label="Total Tickets"
            value={stats.total}
            icon={<span className="text-lg">🎫</span>}
            iconClassName="bg-[#E4F0FF]"
            showDivider
          />
          <DashboardStatCard
            label="Pending"
            value={stats.pending}
            icon={<span className="text-lg">⏳</span>}
            iconClassName="bg-[#FFF6ED]"
            showDivider
          />
          <DashboardStatCard
            label="In Progress"
            value={stats.inProgress}
            icon={<span className="text-lg">🔄</span>}
            iconClassName="bg-[#EFF8FF]"
            showDivider
          />
          <DashboardStatCard
            label="Resolved"
            value={stats.resolved}
            icon={<span className="text-lg">✅</span>}
            iconClassName="bg-[#ECFDF3]"
          />
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 space-y-4">
          <Tabs
            options={STATUS_TABS.map(t => ({ label: t.label, value: t.id }))}
            value={statusTab}
            onChange={setStatusTab}
          />
          <div className="w-full sm:max-w-sm">
            <Input
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={Search}
            />
          </div>
        </div>
        <div className="px-2 pb-2">
          <Table
            columns={columns}
            data={filteredTickets}
            isLoading={isLoading}
            emptyMessage="No tickets found. Create your first ticket!"
            className="border-0 shadow-none"
          />
        </div>
      </Card>

      <CreateTicketModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={employeeName}
        createdByEmail={employeeEmail}
      />

      <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  );
};

export default EmployeeTicketsPage;
