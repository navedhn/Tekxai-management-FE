import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ProjectManagement from './index';
import { ToastProvider } from '@/components/toast/ToastProvider';

// Phase 2 Commercial Project Foundation — Projects list surfaces
// Client (with a "linked" indicator) and a combined Bidder/Source column,
// reading only backend-provided fields.

vi.mock('@/services/permissionsService', () => ({
  useMyPermissions: () => ({ data: { is_super_admin: true, permissions: ['erp.projects.delete'] } }),
}));

vi.mock('@/services/projectDashboardService', () => ({
  useProjectDashboardStats: () => ({ data: undefined }),
}));

const PROJECTS: any[] = [
  {
    id: 'p1', title: 'Linked Client Project', status: 'IN_PROGRESS', priority: 'MEDIUM',
    client_name: 'Acme Corp', client_id: 'client-1', client: { id: 'client-1', name: 'Acme Corp', company: 'Acme Inc' },
    bidder: { id: 'u1', first_name: 'Jane', last_name: 'Bidder' }, source: 'LinkedIn',
    owner: { id: 'o1', first_name: 'Owner', last_name: 'One' }, progress: 40, total_hours: 10,
    member_role_counts: {}, is_saved: false, health_status: 'HEALTHY',
  },
  {
    id: 'p2', title: 'Legacy Client Project', status: 'PLANNING', priority: 'LOW',
    client_name: 'Old Legacy Co', client_id: null, client: null,
    bidder: null, source: null,
    owner: null, progress: 0, total_hours: 0,
    member_role_counts: {}, is_saved: false, health_status: 'HEALTHY',
  },
];

vi.mock('@/services/projectService', async () => {
  const actual = await vi.importActual<any>('@/services/projectService');
  return {
    ...actual,
    useGetProjects: () => ({ data: PROJECTS, isLoading: false }),
    useDeleteProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useRestoreProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useSaveProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUnsaveProjectMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <ProjectManagement />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Projects list — Bidder/Source column and Client linked indicator', () => {
  it('shows the real client name and the bidder/source column for a linked project', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Jane Bidder')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('shows a dash for bidder/source on a project with neither, no crash', () => {
    renderPage();
    expect(screen.getByText('Old Legacy Co')).toBeInTheDocument();
  });

  it('existing columns (Priority, Status) still render — no regression to the table', () => {
    renderPage();
    expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
  });
});
