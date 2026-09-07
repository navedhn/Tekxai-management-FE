import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateMilestoneModal from './CreateMilestoneModal';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const BASE_MILESTONE: any = {
  id: 'm1', project_id: 'proj-1', title: 'Existing', due_date: null, completed: false, blocked: false,
  sequence: 1, status: 'BLOCKED', estimated_start: null, estimated_end: null, completed_date: null,
  progress_percent: 50, remarks: null, archived_at: null, depends_on_ids: [], tasks: [],
  price: 0, payment_status: 'UNPAID', created_at: '', updated_at: '',
  missed_reason_category: null, missed_reason_detail: null, issue_classification: null,
  qa_status: null, qa_notes: null, rework_count: null,
  delivery: { expected: 'Existing', deadline: null, original_deadline: null, actual: null, status: 'PENDING', missed_reason_category: null, missed_reason_detail: null, issue_classification: null, qa_status: null, qa_notes: null, rework_count: null, evidence_count: 0 },
};

function renderModal(props: Partial<React.ComponentProps<typeof CreateMilestoneModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CreateMilestoneModal isOpen={true} onClose={vi.fn()} projectId="proj-1" milestone={null} projectMembers={[]} currency="PKR" {...props} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue({ payload: { records: [], total: 0 } });
});

describe('CreateMilestoneModal — Delivery Evidence (edit only)', () => {
  it('does not show Delivery Evidence on the create-new-milestone form', () => {
    renderModal({ milestone: null });
    expect(screen.queryByText('Delivery Evidence')).not.toBeInTheDocument();
  });

  it('shows Delivery Evidence with Missed Reason, Classification, QA Status, and Rework Count when editing', () => {
    renderModal({ milestone: BASE_MILESTONE });
    expect(screen.getByText('Delivery Evidence')).toBeInTheDocument();
    expect(screen.getByText('Missed Reason')).toBeInTheDocument();
    expect(screen.getByText('Performance / Capacity Classification')).toBeInTheDocument();
    expect(screen.getByText('QA Status')).toBeInTheDocument();
    expect(screen.getByText('Rework Count')).toBeInTheDocument();
  });

  it('shows the computed, non-editable delivery status badge', () => {
    renderModal({ milestone: BASE_MILESTONE });
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText(/not editable/)).toBeInTheDocument();
  });

  it('requires an explanation when Missed Reason is set to Other', async () => {
    renderModal({ milestone: BASE_MILESTONE });
    const missedReasonTrigger = screen.getAllByText('Not set')[0].closest('button')!;
    fireEvent.click(missedReasonTrigger);
    await waitFor(() => expect(screen.getByText('Other')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Other'));
    fireEvent.click(screen.getByText('Save Changes'));
    expect(screen.getByText('Please explain when selecting "Other"')).toBeInTheDocument();
  });

  it('submitting with a missed reason, classification, QA status, and rework count sends them all', async () => {
    renderModal({ milestone: BASE_MILESTONE });

    fireEvent.click(screen.getAllByText('Not set')[0].closest('button')!);
    await waitFor(() => expect(screen.getByText('Blocker')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Blocker'));

    fireEvent.click(screen.getAllByText('Not set')[0].closest('button')!);
    await waitFor(() => expect(screen.getByText('Capacity Issue')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Capacity Issue'));

    fireEvent.click(screen.getByText('Not assessed').closest('button')!);
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Failed'));

    fireEvent.change(screen.getByPlaceholderText('Not tracked'), { target: { value: '2' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      const call = mockedApiRequest.mock.calls.find(([, opts]: any) => opts?.method === 'PUT');
      expect(call).toBeTruthy();
      const body = JSON.parse((call![1] as any).body);
      expect(body.missed_reason_category).toBe('BLOCKER');
      expect(body.issue_classification).toBe('CAPACITY');
      expect(body.qa_status).toBe('FAILED');
      expect(body.rework_count).toBe(2);
    });
  });

  it('a missed reason does not force a particular classification — both are independently selectable', async () => {
    renderModal({ milestone: { ...BASE_MILESTONE, missed_reason_category: 'CLIENT_DEPENDENCY' } });

    expect(screen.getByText('Client Dependency')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('shows the evidence document count when the milestone has attached evidence', () => {
    renderModal({ milestone: { ...BASE_MILESTONE, delivery: { ...BASE_MILESTONE.delivery, evidence_count: 3 } } });
    expect(screen.getByText(/3 evidence documents attached/)).toBeInTheDocument();
  });
});
