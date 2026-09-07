import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProjectDetailsSlideOver from './ProjectDetailsSlideOver';
import { ToastProvider } from '@/components/toast/ToastProvider';

const PROJECT: any = {
  id: 'p1', title: 'Project', description: '', status: 'IN_PROGRESS',
  progress: 40, total_hours: 10, start_date: '2026-01-01', end_date: '2026-03-01',
  member_count: 0, members: [], all_members: [], owner: null, team_leader: null,
  financial: { total: 0, paid: 0, remaining: 0, active: 0, currency: 'PKR' },
  active_milestone: null, access_completion_score: { granted: 0, total: 6, percent: 0 },
  client_portal: { enabled: false, portal_user: null, status: null, access_level: null },
  created_at: '', updated_at: '', is_saved: false,
  client_name: null, client_id: null, client: null, bidder_id: null, bidder: null,
  source: null, commission_type: null, commission_value: null, budget_currency: 'PKR',
};

const MISSED_MILESTONE = {
  id: 'm1', title: 'Missed Deliverable', due_date: '2026-01-01', completed: false, blocked: false,
  sequence: 1, status: 'IN_PROGRESS', progress_percent: 50, price: 0, payment_status: 'UNPAID',
  archived_at: null, depends_on_ids: [], tasks: [], members: [],
  responsible_resources: [{ id: 'u1', first_name: 'Jane', last_name: 'Dev' }],
  delivery: {
    expected: 'Missed Deliverable', deadline: '2026-01-01', original_deadline: '2025-12-15',
    actual: null, status: 'MISSED',
    missed_reason_category: 'RESOURCE_CAPACITY', missed_reason_detail: null,
    issue_classification: 'CAPACITY', qa_status: 'FAILED', qa_notes: 'Broke in staging',
    rework_count: 2, evidence_count: 2,
  },
};

const CLEAN_MILESTONE = {
  id: 'm2', title: 'Clean Deliverable', due_date: null, completed: false, blocked: false,
  sequence: 2, status: 'NOT_STARTED', progress_percent: 0, price: 0, payment_status: 'UNPAID',
  archived_at: null, depends_on_ids: [], tasks: [], members: [],
  responsible_resources: [],
  delivery: {
    expected: 'Clean Deliverable', deadline: null, original_deadline: null, actual: null, status: 'PENDING',
    missed_reason_category: null, missed_reason_detail: null, issue_classification: null,
    qa_status: null, qa_notes: null, rework_count: null, evidence_count: 0,
  },
};

vi.mock('@/services/projectService', async () => {
  const actual = await vi.importActual<any>('@/services/projectService');
  return {
    ...actual,
    useGetProjectDetails: () => ({ data: PROJECT, isLoading: false }),
    useUpdateProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/milestonesService', async () => {
  const actual = await vi.importActual<any>('@/services/milestonesService');
  return {
    ...actual,
    useMilestones: () => ({ data: [MISSED_MILESTONE, CLEAN_MILESTONE], isLoading: false }),
    useDeleteMilestone: () => ({ mutate: vi.fn() }),
    useArchiveMilestone: () => ({ mutate: vi.fn(), isPending: false }),
    useReorderMilestones: () => ({ mutate: vi.fn() }),
  };
});

vi.mock('@/services/permissionsService', () => ({
  useMyPermissions: () => ({ data: { is_super_admin: true, permissions: [] } }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ProjectDetailsSlideOver isOpen={true} onClose={vi.fn()} projectId="p1" routePrefix="/admin" />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function openMilestonesTab() {
  fireEvent.click(screen.getByText('Milestones'));
}

describe('ProjectDetailsSlideOver — Milestones tab Delivery', () => {
  it('shows a MISSED delivery badge distinct from workflow Status and Payment', () => {
    renderPanel();
    openMilestonesTab();
    expect(screen.getByText('Missed Deliverable')).toBeInTheDocument();
    expect(screen.getByText('MISSED')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0);
  });

  it('shows a PENDING badge for a milestone with no deadline yet, no crash', () => {
    renderPanel();
    openMilestonesTab();
    expect(screen.getByText('Clean Deliverable')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('expanding a missed milestone reveals its Delivery section with responsible resource, missed reason, classification, QA, rework, and evidence count', () => {
    renderPanel();
    openMilestonesTab();
    fireEvent.click(screen.getByText('Missed Deliverable'));
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Jane Dev')).toBeInTheDocument();
    expect(screen.getByText('RESOURCE CAPACITY')).toBeInTheDocument();
    expect(screen.getByText('CAPACITY')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('2 documents')).toBeInTheDocument();
    expect(screen.getByText('Broke in staging')).toBeInTheDocument();
  });

  it('a clean/legacy milestone with no delivery evidence at all shows no Delivery section (no forced empty block)', () => {
    renderPanel();
    openMilestonesTab();
    fireEvent.click(screen.getByText('Clean Deliverable'));
    expect(screen.queryByText('Delivery')).not.toBeInTheDocument();
  });
});
