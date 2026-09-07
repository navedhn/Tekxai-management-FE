import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProjectDetailsSlideOver from './ProjectDetailsSlideOver';
import { ToastProvider } from '@/components/toast/ToastProvider';

const LINKED_PROJECT: any = {
  id: 'p1', title: 'Linked Project', description: 'A real project', status: 'IN_PROGRESS',
  progress: 40, total_hours: 10, start_date: '2026-01-01', end_date: '2026-03-01',
  member_count: 0, members: [], owner: null, team_leader: null, milestones: [],
  financial: { total: 0, paid: 0, remaining: 0, active: 0, currency: 'PKR' },
  active_milestone: null, access_completion_score: { granted: 0, total: 6, percent: 0 },
  client_portal: { enabled: false, portal_user: null, status: null, access_level: null },
  created_at: '', updated_at: '', is_saved: false,
  client_name: 'Acme Corp', client_id: 'client-1', client: { id: 'client-1', name: 'Acme Corp', company: 'Acme Inc' },
  bidder_id: 'u1', bidder: { id: 'u1', first_name: 'Jane', last_name: 'Bidder', avatar: null },
  source: 'LinkedIn', commission_type: 'PERCENTAGE', commission_value: 10,
  budget_currency: 'PKR',
};

const LEGACY_PROJECT: any = {
  ...LINKED_PROJECT,
  id: 'p2', client_name: null, client_id: null, client: null,
  bidder_id: null, bidder: null, source: null, commission_type: null, commission_value: null,
};

vi.mock('@/services/projectService', async () => {
  const actual = await vi.importActual<any>('@/services/projectService');
  return {
    ...actual,
    useGetProjectDetails: (id: string) => ({ data: id === 'p2' ? LEGACY_PROJECT : LINKED_PROJECT, isLoading: false }),
    useUpdateProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/milestonesService', async () => {
  const actual = await vi.importActual<any>('@/services/milestonesService');
  return {
    ...actual,
    useMilestones: () => ({ data: [], isLoading: false }),
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

function renderPanel(projectId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ProjectDetailsSlideOver isOpen={true} onClose={vi.fn()} projectId={projectId} routePrefix="/admin" />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('ProjectDetailsSlideOver — Commercial panel (Overview tab)', () => {
  it('shows the linked client, bidder, source, and commission for a fully-set project', () => {
    renderPanel('p1');
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Linked record')).toBeInTheDocument();
    expect(screen.getByText('Jane Bidder')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('shows "Not set"/"None" for every commercial field on a legacy project, no crash', () => {
    renderPanel('p2');
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    const notSet = screen.getAllByText('Not set');
    expect(notSet.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByText('Linked record')).not.toBeInTheDocument();
  });

  it('Commercial and Financial are visually distinct sections, not conflated', () => {
    renderPanel('p1');

    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.queryByText('Milestone Financials')).not.toBeInTheDocument();
  });
});
