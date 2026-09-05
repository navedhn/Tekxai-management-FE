import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProjectSlideOver from './CreateProjectSlideOver';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';

// Phase 2 Commercial Project Foundation — Client/Bidder/Source/Commission
// on the project create/edit form.

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const CLIENTS = [
  { id: 'client-1', name: 'Acme Corp', company: 'Acme Inc' },
  { id: 'client-2', name: 'Globex', company: null },
];
const EMPLOYEES = [
  { id: 'emp-1', first_name: 'Jane', last_name: 'Bidder', email: 'jane@fixture.test', avatar: null },
];

function mockRoute(url: string) {
  if (url.includes('/project/clients-lookup')) return Promise.resolve({ success: true, payload: CLIENTS });
  if (url.includes('/user')) return Promise.resolve({ success: true, payload: { records: EMPLOYEES } });
  if (url.includes('/business-unit')) return Promise.resolve({ success: true, payload: { records: [] } });
  return Promise.resolve({ success: true, payload: {} });
}

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CreateProjectSlideOver isOpen={true} onClose={vi.fn()} project={null} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockImplementation((url: any) => mockRoute(String(url)) as any);
});

describe('CreateProjectSlideOver — Commercial section', () => {
  it('renders Client, Bidder, Source/Platform, and Commission fields', async () => {
    renderForm();
    await waitFor(() => expect(screen.getByText('Commercial')).toBeInTheDocument());
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Bidder')).toBeInTheDocument();
    expect(screen.getByText('Source / Platform')).toBeInTheDocument();
    expect(screen.getByText('Commission Type')).toBeInTheDocument();
  });

  it('client selector shows real client_accounts search results, not free text', async () => {
    renderForm();
    const clientTrigger = screen.getByText('Search clients…').closest('button')!;
    fireEvent.click(clientTrigger);
    await waitFor(() => expect(screen.getByText('Acme Corp (Acme Inc)')).toBeInTheDocument());
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('selecting a client updates the displayed value', async () => {
    renderForm();
    const clientTrigger = screen.getByText('Search clients…').closest('button')!;
    fireEvent.click(clientTrigger);
    await waitFor(() => expect(screen.getByText('Acme Corp (Acme Inc)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Acme Corp (Acme Inc)'));
    expect(screen.getByText('Acme Corp (Acme Inc)')).toBeInTheDocument();
  });

  it('commission value input is disabled until a commission type is chosen', async () => {
    renderForm();
    const commissionInput = screen.getByPlaceholderText('—') as HTMLInputElement;
    expect(commissionInput.disabled).toBe(true);
  });

  it('choosing a commission type enables the value input and updates its label', async () => {
    renderForm();
    const typeTrigger = screen.getByText('No commission').closest('button')!;
    fireEvent.click(typeTrigger);
    await waitFor(() => expect(screen.getByText('Percentage')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Percentage'));
    const commissionLabel = screen.getByText('Commission (%)');
    expect(commissionLabel).toBeInTheDocument();
    const commissionInput = commissionLabel.closest('div')!.querySelector('input') as HTMLInputElement;
    expect(commissionInput.disabled).toBe(false);
  });

  it('the commission value field stays disabled (and thus empty) with no type chosen — the backend\'s paired validation is the authoritative guard either way', async () => {
    renderForm();
    const commissionInput = screen.getByPlaceholderText('—') as HTMLInputElement;
    expect(commissionInput.disabled).toBe(true);
    expect(commissionInput.value).toBe('');
  });

  it('bidder search uses the employee lookup and selecting one shows a removable chip', async () => {
    renderForm();
    const bidderTrigger = screen.getByText('Search employees…').closest('button')!;
    fireEvent.click(bidderTrigger);
    await waitFor(() => expect(screen.getByText('Jane Bidder')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Jane Bidder'));
    await waitFor(() => expect(screen.getByLabelText('Remove bidder')).toBeInTheDocument());
  });

  it('source offers curated suggestions including TekXAI/Upwork/LinkedIn', async () => {
    renderForm();
    const sourceTrigger = screen.getByText('Select or clear').closest('button')!;
    fireEvent.click(sourceTrigger);
    await waitFor(() => expect(screen.getByText('TekXAI')).toBeInTheDocument());
    expect(screen.getByText('Upwork')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });
});

describe('CreateProjectSlideOver — legacy project editing safety', () => {
  it('a legacy project with client_name but no client_id shows the free-text value read-only, without crashing', async () => {
    const legacyProject: any = {
      id: 'p1', title: 'Legacy Project', description: '', start_date: '2026-01-01', end_date: '2026-02-01',
      total_hours: 0, status: 'PLANNING', priority: 'MEDIUM', business_unit_id: null, budget: null,
      budget_currency: 'PKR', client_name: 'Old Free Text Client', client_id: null, client: null,
      bidder_id: null, bidder: null, source: null, commission_type: null, commission_value: null,
      owner: { id: 'u1', first_name: 'Owner', last_name: 'Person', avatar: null },
      team_leader: null, members: [], progress: 0, created_at: '', updated_at: '', is_saved: false, member_count: 0,
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreateProjectSlideOver isOpen={true} onClose={vi.fn()} project={legacyProject} />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/Legacy client on file/)).toBeInTheDocument());
    expect(screen.getByText(/Old Free Text Client/)).toBeInTheDocument();
  });

  it('a project with a real client_id shows the linked client, not raw client_name text as a warning', async () => {
    const linkedProject: any = {
      id: 'p2', title: 'Linked Project', description: '', start_date: '2026-01-01', end_date: '2026-02-01',
      total_hours: 0, status: 'PLANNING', priority: 'MEDIUM', business_unit_id: null, budget: null,
      budget_currency: 'PKR', client_name: 'Acme Corp', client_id: 'client-1', client: { id: 'client-1', name: 'Acme Corp', company: 'Acme Inc' },
      bidder_id: null, bidder: null, source: 'LinkedIn', commission_type: 'FIXED', commission_value: 500,
      owner: { id: 'u1', first_name: 'Owner', last_name: 'Person', avatar: null },
      team_leader: null, members: [], progress: 0, created_at: '', updated_at: '', is_saved: false, member_count: 0,
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreateProjectSlideOver isOpen={true} onClose={vi.fn()} project={linkedProject} />
        </ToastProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());
    expect(screen.queryByText(/Legacy client on file/)).not.toBeInTheDocument();
  });
});
