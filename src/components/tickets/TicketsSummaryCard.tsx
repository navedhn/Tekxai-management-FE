import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Ticket } from 'lucide-react';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreateTicketModal, TicketStatusBadge } from '@/components/tickets';
import { useAuth } from '@/hooks/useAuth';
import { formatTicketDate, getTicketStats, useGetTickets } from '@/services/ticketService';

const TicketsSummaryCard: React.FC = () => {
  const { user } = useAuth();
  const { data: tickets = [], isLoading } = useGetTickets();
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useMemo(() => getTicketStats(tickets), [tickets]);
  const recent = useMemo(() => tickets.slice(0, 3), [tickets]);

  const employeeName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Employee';
  const employeeEmail = user?.email || 'employee@tekxai.com';

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E4F0FF] flex items-center justify-center">
              <Ticket size={20} className="text-[#005CDA]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Support Tickets</h2>
              <p className="text-xs text-gray-500 font-medium">
                Raise tickets to TL, Office Boy, HR, or anyone
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              animation="none"
              rounded={false}
              size="sm"
              className="rounded-lg bg-[#005CDA] text-white border-0 hover:bg-[#0047AB] h-9"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} />
              Create Ticket
            </Button>
            <Link to="/employee/tickets">
              <Button
                variant="outline"
                animation="none"
                rounded={false}
                size="sm"
                className="rounded-lg h-9"
              >
                View All
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-[#C4320A]' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-[#175CD3]' },
            { label: 'Resolved', value: stats.resolved, color: 'text-[#067647]' },
          ].map(item => (
            <div key={item.label} className="rounded-lg bg-[#F8F8F8] px-3 py-2.5 text-center">
              <p className={`text-xl font-black tabular-nums ${item.color}`}>
                {isLoading ? '—' : item.value}
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{item.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading tickets...</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No tickets yet. Create one to get help from your team.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map(ticket => (
              <li
                key={ticket.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {ticket.ticketNumber} · To {ticket.recipientName} · {formatTicketDate(ticket.createdAt)}
                  </p>
                </div>
                <TicketStatusBadge status={ticket.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CreateTicketModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        createdBy={employeeName}
        createdByEmail={employeeEmail}
      />
    </>
  );
};

export default TicketsSummaryCard;
