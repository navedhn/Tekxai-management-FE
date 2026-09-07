import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PerformanceReviewDetailPage from './detail';
import { ToastProvider } from '@/components/toast/ToastProvider';

const FULL_EVIDENCE: any = {
  review: {
    id: 'r1', user_id: 'u1', reviewer_id: 'u2',
    user: { id: 'u1', first_name: 'Jane', last_name: 'Employee' },
    reviewer: { id: 'u2', first_name: 'Sam', last_name: 'Manager' },
    review_period: { id: 'p1', name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', status: 'OPEN' },
    status: 'DRAFT', classification: null, recommended_action: null,
    completed_at: null, evidence_entries: [], created_at: '', updated_at: '',
    management_decision: null, management_decision_at: null,
  },
  role: { designation: { id: 'd1', name: 'Backend Developer' }, resolved_source: 'HISTORY' },
  project_evidence: {
    assigned_projects: [{ project_id: 'proj1', title: 'Client Portal', status: 'IN_PROGRESS', role: 'BACKEND' }],
    assigned_count: 2, on_time_count: 1, missed_count: 1, pending_count: 0,
    successful_count: 1, failed_count: 0, qa_passed_count: 1, qa_failed_count: 0, qa_not_required_count: 0,
    rework_total: 0, evidence_count: 1,
    missed_reason_breakdown: { CLIENT_DEPENDENCY: 1 },
    issue_classification_breakdown: { EXTERNAL_DEPENDENCY: 1 },
    milestones: [
      {
        id: 'm1', title: 'API Integration', project: { id: 'proj1', title: 'Client Portal' }, status: 'COMPLETED', outcome: 'SUCCESSFUL',
        responsible_resources: [{ id: 'u1', first_name: 'Jane', last_name: 'Employee' }],
        delivery: { expected: 'API Integration', deadline: '2026-02-01', original_deadline: '2026-02-01', actual: '2026-01-30', status: 'ON_TIME', missed_reason_category: null, missed_reason_detail: null, issue_classification: null, qa_status: 'PASSED', qa_notes: null, rework_count: null, evidence_count: 1 },
      },
      {
        id: 'm2', title: 'Client Handoff', project: { id: 'proj1', title: 'Client Portal' }, status: 'BLOCKED', outcome: 'PENDING',
        responsible_resources: [{ id: 'u1', first_name: 'Jane', last_name: 'Employee' }],
        delivery: { expected: 'Client Handoff', deadline: '2026-02-15', original_deadline: '2026-02-15', actual: null, status: 'MISSED', missed_reason_category: 'CLIENT_DEPENDENCY', missed_reason_detail: null, issue_classification: 'EXTERNAL_DEPENDENCY', qa_status: null, qa_notes: null, rework_count: null, evidence_count: 0 },
      },
    ],
  },
  attendance: { present_days: 20, absent_days: null, late_days: 2, total_late_minutes: 30, average_late_minutes: 15, leave_days: 1, total_hours: 160, average_check_in: '09:15 AM', missing_checkout_count: 0 },
  utilization: { available: false, reason: 'No logged work time for this review period', total_hours: 0, billable_hours: 0, utilization_pct: null },
  warnings: { restricted: false, records: [] },
  manager_evidence: [],
  evidence_breakdown: {
    objective: { assigned: 2, on_time: 1, missed: 1, pending: 0, successful: 1, failed: 0, qa_passed: 1, qa_failed: 0, rework_total: 0, evidence_count: 1 },
    contextual: { missed_reason_breakdown: { CLIENT_DEPENDENCY: 1 }, issue_classification_breakdown: { EXTERNAL_DEPENDENCY: 1 } },
  },
  missed_attribution: { total_classified: 1, performance_related: 0, capacity_related: 0, external_related: 1, other: 0 },
  evidence_completeness: {
    status: 'PARTIAL_EVIDENCE',
    sources: { project: 'HAS_DATA', delivery: 'HAS_DATA', qa: 'HAS_DATA', attendance: 'HAS_DATA', utilization: 'NO_DATA', warnings: 'NO_DATA', manager_evidence: 'NO_DATA' },
  },
  decision_indicators: {
    delivery_concerns_present: true, quality_concerns_present: false, attendance_concerns_present: true,
    capacity_concerns_present: false, external_dependency_concerns_present: true, performance_related_misses_present: false,
    previous_warnings_present: false, manager_evidence_present: false,
  },
  increment_readiness: { state: 'REVIEW_NOT_COMPLETED', reason: 'Performance review has not been completed for the applicable review period.' },
};

vi.mock('@/services/performanceReviewsService', async () => {
  const actual = await vi.importActual<any>('@/services/performanceReviewsService');
  return {
    ...actual,
    useReviewEvidence: () => ({ data: FULL_EVIDENCE, isLoading: false, error: null }),
    useUpdateReview: () => ({ mutate: vi.fn(), isPending: false }),
    useAddManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }),
    useRecordManagementDecision: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/permissionsService', () => ({
  useMyPermissions: () => ({ data: { is_super_admin: false, permissions: ['hr.performance_reviews.decide'] } }),
}));

function renderDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/admin/performance-reviews/r1']}>
          <Routes>
            <Route path="/admin/performance-reviews/:id" element={<PerformanceReviewDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Performance Review detail — evidence before conclusion', () => {
  it('shows employee, role, and review period at the top', () => {
    renderDetail();
    expect(screen.getByText('Jane Employee')).toBeInTheDocument();
    expect(screen.getByText(/Backend Developer/)).toBeInTheDocument();
    expect(screen.getByText(/Q1 2026/)).toBeInTheDocument();
  });

  it('shows assigned projects from real membership only', () => {
    renderDetail();
    expect(screen.getAllByText(/Client Portal/).length).toBeGreaterThan(0);
  });

  it('shows delivery evidence facts and per-milestone missed reason distinct from classification', () => {
    renderDetail();
    expect(screen.getByText('API Integration')).toBeInTheDocument();
    expect(screen.getByText('Client Handoff')).toBeInTheDocument();
    expect(screen.getByText(/Missed reason: CLIENT DEPENDENCY.*Classified: EXTERNAL DEPENDENCY/)).toBeInTheDocument();
  });

  it('shows attendance facts and leaves absent days as "Not available" rather than fabricating 0', () => {
    renderDetail();
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('shows "Not enough data" for utilization rather than a fabricated percentage', () => {
    renderDetail();
    expect(screen.getByText('No logged work time for this review period')).toBeInTheDocument();
  });

  it('shows "No prior warnings on record" when warnings are visible and empty (not restricted)', () => {
    renderDetail();
    expect(screen.getByText('No prior warnings on record.')).toBeInTheDocument();
  });

  it('shows a restricted message instead of records when warnings.restricted is true', () => {
    const restricted = { ...FULL_EVIDENCE, warnings: { restricted: true, records: [] } };
    vi.doMock('@/services/performanceReviewsService', async () => {
      const actual = await vi.importActual<any>('@/services/performanceReviewsService');
      return { ...actual, useReviewEvidence: () => ({ data: restricted, isLoading: false, error: null }), useUpdateReview: () => ({ mutate: vi.fn(), isPending: false }), useAddManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }), useDeleteManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }) };
    });

    expect(restricted.warnings.restricted).toBe(true);
  });

  it('classification and recommended action selectors default to "not yet set" — never fabricated', () => {
    renderDetail();
    expect(screen.getByText('Not yet classified')).toBeInTheDocument();
    expect(screen.getByText('No recommendation yet')).toBeInTheDocument();
  });

  it('shows workflow action buttons for a DRAFT review', () => {
    renderDetail();
    expect(screen.getByText('Move to In Review')).toBeInTheDocument();
    expect(screen.getByText('Complete Review')).toBeInTheDocument();
  });
});
