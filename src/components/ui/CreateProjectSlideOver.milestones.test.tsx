import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateProjectSlideOver from './CreateProjectSlideOver';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import type { ProjectDetail } from '@/services/projectService';

// Milestone management inside the Edit Project slide-over — reuses the
// exact same canonical hooks (milestonesService.ts) and component
// (CreateMilestoneModal) ProjectDetailsSlideOver's Milestones tab already
// uses, not a parallel implementation.
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

// jsdom doesn't implement scrollIntoView — handleSubmit's validation-error
// path calls it, unrelated to anything under test here.
if (!globalThis.Element.prototype.scrollIntoView) {
  globalThis.Element.prototype.scrollIntoView = vi.fn();
}

const PROJECT: ProjectDetail = {
  id: 'proj-1',
  title: 'Fixture Project',
  status: 'ACTIVE' as any,
  progress: 0,
  total_hours: 0,
  due_date: null,
  start_date: '2026-01-01',
  end_date: '2026-06-01',
  member_count: 0,
  members: [{ id: 'user-1', first_name: 'Ana', last_name: 'Fixture', email: 'ana@fixture.test', avatar: null }],
  owner: { id: 'user-1', first_name: 'Ana', last_name: 'Fixture', email: 'ana@fixture.test', avatar: null },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_saved: true,
  budget_currency: 'PKR',
};

const MILESTONES = [
  {
    id: 'ms-1', project_id: 'proj-1', title: 'Discovery Phase', description: null,
    due_date: '2026-02-01T00:00:00.000Z', completed: false, blocked: false, sequence: 1,
    status: 'IN_PROGRESS', estimated_start: null, estimated_end: null, completed_date: null,
    progress_percent: 40, remarks: null, archived_at: null, depends_on_ids: [], tasks: [],
    price: 5000, payment_status: 'UNPAID', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ms-2', project_id: 'proj-1', title: 'Delivery Phase', description: null,
    due_date: '2026-03-01T00:00:00.000Z', completed: true, blocked: false, sequence: 2,
    status: 'COMPLETED', estimated_start: null, estimated_end: null, completed_date: '2026-03-01T00:00:00.000Z',
    progress_percent: 100, remarks: null, archived_at: null, depends_on_ids: [], tasks: [],
    price: 8000, payment_status: 'PAID', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  },
];

function mockRoute(url: string) {
  if (url.includes('/milestones') && !url.includes('/project')) return Promise.resolve({ success: true, payload: MILESTONES });
  if (url.match(/\/project\/proj-1\/milestones$/)) return Promise.resolve({ success: true, payload: MILESTONES });
  if (url.includes('/project/clients-lookup')) return Promise.resolve({ success: true, payload: [] });
  if (url.includes('/user')) return Promise.resolve({ success: true, payload: { records: [] } });
  if (url.includes('/business-unit')) return Promise.resolve({ success: true, payload: { records: [] } });
  return Promise.resolve({ success: true, payload: {} });
}

function renderEditForm(project: ProjectDetail | null = PROJECT) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CreateProjectSlideOver isOpen={true} onClose={vi.fn()} project={project} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockImplementation((url: any) => mockRoute(String(url)) as any);
});

describe('CreateProjectSlideOver — Milestones section', () => {
  it('does not render a Milestones section when creating a new project (no project id to attach to)', async () => {
    renderEditForm(null);
    await waitFor(() => expect(screen.getByText('Create Project')).toBeInTheDocument());
    expect(screen.queryByText('Milestones')).not.toBeInTheDocument();
  });

  it('loads and displays the existing project\'s real milestones', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Milestones')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    expect(screen.getByText('Delivery Phase')).toBeInTheDocument();
    expect(screen.getByText('PKR 5,000')).toBeInTheDocument();
    expect(screen.getByText('PKR 8,000')).toBeInTheDocument();
  });

  it('shows payment status for each milestone using real backend data', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('"Add Milestone" opens the canonical CreateMilestoneModal', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Add Milestone')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Milestone'));
    await waitFor(() => expect(screen.getByText('Create Milestone')).toBeInTheDocument());
  });

  it('editing a milestone opens the same modal pre-filled with its existing data', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Edit Discovery Phase'));
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('Discovery Phase') as HTMLInputElement;
      expect(titleInput).toBeInTheDocument();
    });
  });

  it('deleting a milestone requires confirmation before calling the delete API', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Delete Discovery Phase'));
    await waitFor(() => expect(screen.getAllByText('Delete Milestone').length).toBeGreaterThan(0));
    expect(mockedApiRequest).not.toHaveBeenCalledWith(expect.stringContaining('ms-1'), expect.objectContaining({ method: 'DELETE' }));

    const confirmButton = screen.getAllByText('Delete Milestone').find((el) => el.closest('button'))!.closest('button')!;
    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/milestones/ms-1'),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it('delete is disabled for a PAID milestone — never opens the confirmation, never calls the API', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Delivery Phase')).toBeInTheDocument());
    const paidDeleteButton = screen.getByLabelText('Delete Delivery Phase') as HTMLButtonElement;
    expect(paidDeleteButton.disabled).toBe(true);

    fireEvent.click(paidDeleteButton);
    expect(screen.queryByText('Delete Milestone')).not.toBeInTheDocument();
    expect(mockedApiRequest).not.toHaveBeenCalledWith(
      expect.stringContaining('ms-2'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('delete remains enabled and functional for a non-PAID milestone', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    const unpaidDeleteButton = screen.getByLabelText('Delete Discovery Phase') as HTMLButtonElement;
    expect(unpaidDeleteButton.disabled).toBe(false);
  });

  it('reordering does not offer moving the first milestone up or the last one down', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByText('Discovery Phase')).toBeInTheDocument());
    const upButtons = screen.getAllByLabelText('Move milestone up');
    const downButtons = screen.getAllByLabelText('Move milestone down');
    expect((upButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((downButtons[downButtons.length - 1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('editing project fields (e.g. title) does not touch the milestones endpoint', async () => {
    renderEditForm();
    await waitFor(() => expect(screen.getByDisplayValue('Fixture Project')).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue('Fixture Project'), { target: { value: 'Renamed Project' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() =>
      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.stringContaining('/project/proj-1'),
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    const milestoneWriteCalls = mockedApiRequest.mock.calls.filter(
      ([url, opts]: any[]) => String(url).includes('/milestones') && opts?.method && opts.method !== 'GET',
    );
    expect(milestoneWriteCalls.length).toBe(0);
  });
});
