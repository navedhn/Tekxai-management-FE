import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateMilestoneModal from './CreateMilestoneModal';
import { apiRequest } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast/ToastProvider';

// Milestone Financial Foundation — Price/Payment Status must be editable
// alongside every existing milestone field, without disturbing the existing
// payload shape/validation (title/status/sequence/dates/assignments/deps).

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

function renderModal(props: Partial<React.ComponentProps<typeof CreateMilestoneModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CreateMilestoneModal
          isOpen={true}
          onClose={vi.fn()}
          projectId="proj-1"
          milestone={null}
          projectMembers={[]}
          currency="USD"
          {...props}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue({ payload: { records: [], total: 0 } });
});

describe('CreateMilestoneModal — Price & Payment Status', () => {
  it('renders a Price field labeled with the project currency, defaulting to 0', () => {
    renderModal();
    expect(screen.getByText('Price (USD)')).toBeInTheDocument();
    const priceInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(priceInput.value).toBe('0');
  });

  it('renders a Payment Status control defaulting to Unpaid', () => {
    renderModal();
    expect(screen.getByText('Payment Status')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  it('rejects a negative price client-side before submit', () => {
    renderModal();
    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '-50' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Backend API Development'), { target: { value: 'M1' } });
    fireEvent.click(screen.getByText('Create Milestone'));
    expect(screen.getByText('Price cannot be negative')).toBeInTheDocument();
    expect(mockedApiRequest).not.toHaveBeenCalledWith(expect.stringContaining('milestone'), expect.objectContaining({ method: 'POST' }));
  });

  it('submits price and payment_status alongside the existing fields on create', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('e.g. Backend API Development'), { target: { value: 'Phase 1' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2500' } });
    fireEvent.click(screen.getByText('Create Milestone'));

    await waitFor(() => {
      const call = mockedApiRequest.mock.calls.find(([, opts]: any) => opts?.method === 'POST');
      expect(call).toBeTruthy();
      const body = JSON.parse((call![1] as any).body);
      expect(body.title).toBe('Phase 1');
      expect(body.price).toBe(2500);
      expect(body.payment_status).toBe('UNPAID');
      // existing contract fields still present, unaffected
      expect(body).toHaveProperty('status', 'NOT_STARTED');
      expect(body).toHaveProperty('assigned_user_ids');
      expect(body).toHaveProperty('depends_on_ids');
    });
  });

  it('resets payment_status to Unpaid when Status is changed away from Completed while marked Paid', () => {
    renderModal({
      milestone: {
        id: 'm1', project_id: 'proj-1', title: 'Existing', due_date: null, completed: false, blocked: false,
        sequence: 1, status: 'COMPLETED', estimated_start: null, estimated_end: null, completed_date: null,
        progress_percent: 100, remarks: null, archived_at: null, depends_on_ids: [], tasks: [],
        price: 1200, payment_status: 'PAID', created_at: '', updated_at: '',
      } as any,
    });
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // Open Status dropdown and pick a non-Completed option.
    const statusTrigger = screen.getByText('Completed').closest('button')!;
    fireEvent.click(statusTrigger);
    fireEvent.click(screen.getByText('In Progress'));
    // Business invariant (server-enforced too): PAID requires COMPLETED —
    // the form must not let itself sit in a state the backend would reject.
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(screen.queryByText('Paid')).not.toBeInTheDocument();
  });

  it('disables the Paid option while Status is not Completed (default create form)', () => {
    renderModal();
    const paymentTrigger = screen.getByText('Unpaid').closest('button')!;
    fireEvent.click(paymentTrigger);
    const paidOptions = screen.getAllByText('Paid');
    const paidOptionEl = paidOptions[paidOptions.length - 1]; // the dropdown list item, not the trigger
    fireEvent.click(paidOptionEl);
    // Clicking the disabled Paid option must not select it — value stays Unpaid.
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0);
  });

  it('editing an existing milestone prepropulates its price and payment_status', () => {
    renderModal({
      milestone: {
        id: 'm1', project_id: 'proj-1', title: 'Existing', due_date: null, completed: false, blocked: false,
        sequence: 1, status: 'IN_PROGRESS', estimated_start: null, estimated_end: null, completed_date: null,
        progress_percent: 50, remarks: null, archived_at: null, depends_on_ids: [], tasks: [],
        price: 1200, payment_status: 'PAID', created_at: '', updated_at: '',
      } as any,
    });
    const priceInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(priceInput.value).toBe('1200');
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
