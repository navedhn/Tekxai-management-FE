import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PerformanceReviewDetailPage from './detail';
import { ToastProvider } from '@/components/toast/ToastProvider';

const BASE: any = {
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
    assigned_count: 3, on_time_count: 1, missed_count: 2, pending_count: 0,
    successful_count: 1, failed_count: 0, qa_passed_count: 1, qa_failed_count: 0, qa_not_required_count: 0,
    rework_total: 0, evidence_count: 1,
    missed_reason_breakdown: { CLIENT_DEPENDENCY: 1, RESOURCE_CAPACITY: 1 },
    issue_classification_breakdown: { EXTERNAL_DEPENDENCY: 1, CAPACITY: 1 },
    milestones: [],
  },
  evidence_breakdown: {
    objective: { assigned: 3, on_time: 1, missed: 2, pending: 0, successful: 1, failed: 0, qa_passed: 1, qa_failed: 0, rework_total: 0, evidence_count: 1 },
    contextual: { missed_reason_breakdown: { CLIENT_DEPENDENCY: 1, RESOURCE_CAPACITY: 1 }, issue_classification_breakdown: { EXTERNAL_DEPENDENCY: 1, CAPACITY: 1 } },
  },
  missed_attribution: { total_classified: 2, performance_related: 0, capacity_related: 1, external_related: 1, other: 0 },
  attendance: { present_days: 20, absent_days: null, late_days: 0, total_late_minutes: 0, average_late_minutes: 0, leave_days: 0, total_hours: 160, average_check_in: '09:00 AM', missing_checkout_count: 0 },
  utilization: { available: false, reason: 'No logged work time for this review period', total_hours: 0, billable_hours: 0, utilization_pct: null },
  warnings: { restricted: false, records: [] },
  manager_evidence: [],
  evidence_completeness: {
    status: 'SUFFICIENT_EVIDENCE',
    sources: { project: 'HAS_DATA', delivery: 'HAS_DATA', qa: 'HAS_DATA', attendance: 'HAS_DATA', utilization: 'NO_DATA', warnings: 'NOT_APPLICABLE', manager_evidence: 'NO_DATA' },
  },
  decision_indicators: {
    delivery_concerns_present: true, quality_concerns_present: false, attendance_concerns_present: false,
    capacity_concerns_present: true, external_dependency_concerns_present: true, performance_related_misses_present: false,
    previous_warnings_present: false, manager_evidence_present: false,
  },
  increment_readiness: { state: 'REVIEW_NOT_COMPLETED', reason: 'Performance review has not been completed for the applicable review period.' },
};

let mockPerms = { is_super_admin: false, permissions: ['hr.performance_reviews.decide'] };
let mockEvidence = BASE;
const recordDecisionMock = vi.fn();

vi.mock('@/services/performanceReviewsService', async () => {
  const actual = await vi.importActual<any>('@/services/performanceReviewsService');
  return {
    ...actual,
    useReviewEvidence: () => ({ data: mockEvidence, isLoading: false, error: null }),
    useUpdateReview: () => ({ mutate: vi.fn(), isPending: false }),
    useAddManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteManagerEvidence: () => ({ mutate: vi.fn(), isPending: false }),
    useRecordManagementDecision: () => ({ mutate: recordDecisionMock, isPending: false }),
  };
});

vi.mock('@/services/permissionsService', () => ({
  useMyPermissions: () => ({ data: mockPerms }),
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

describe('Phase 5 — Evidence Completeness section', () => {
  it('shows the completeness status and per-source states as facts, not a verdict', () => {
    mockEvidence = BASE;
    renderDetail();
    expect(screen.getByText('SUFFICIENT EVIDENCE')).toBeInTheDocument();
    expect(screen.getAllByText('HAS DATA').length).toBeGreaterThan(0);
    expect(screen.getByText('NOT APPLICABLE')).toBeInTheDocument();
  });

  it('shows decision-support indicators, correctly distinguishing capacity/external from performance', () => {
    mockEvidence = BASE;
    renderDetail();
    expect(screen.getByText(/capacity concerns/)).toBeInTheDocument();
    expect(screen.getByText(/external dependency concerns/)).toBeInTheDocument();
    expect(screen.getByText(/delivery concerns/)).toBeInTheDocument();
  });

  it('shows missed-delivery attribution buckets — never collapsing "2 missed" into "2 performance failures"', () => {
    mockEvidence = BASE;
    renderDetail();
    expect(screen.getByText('Missed Deliveries — By Attribution (never "N missed = N failures")')).toBeInTheDocument();

    const capacityFact = screen.getByText('Capacity-Related').nextSibling as HTMLElement;
    expect(capacityFact.textContent).toBe('1');
    const perfFact = screen.getByText('Performance-Related').nextSibling as HTMLElement;
    expect(perfFact.textContent).toBe('0');
  });
});

describe('Phase 5 — Increment Readiness section', () => {
  it('shows REVIEW_NOT_COMPLETED with its explanatory reason when the review is still DRAFT', () => {
    mockEvidence = BASE;
    renderDetail();
    expect(screen.getByText('REVIEW NOT COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Performance review has not been completed for the applicable review period.')).toBeInTheDocument();
  });

  it('shows ELIGIBLE_FOR_MANAGEMENT_REVIEW when the backend reports that state', () => {
    mockEvidence = { ...BASE, review: { ...BASE.review, status: 'COMPLETED', classification: 'MEETS_EXPECTATIONS' }, increment_readiness: { state: 'ELIGIBLE_FOR_MANAGEMENT_REVIEW', reason: 'Review completed with sufficient evidence and a recorded classification — ready for a management increment decision.' } };
    renderDetail();
    expect(screen.getByText('ELIGIBLE FOR MANAGEMENT REVIEW')).toBeInTheDocument();
  });
});

describe('Phase 5 — Management Decision control', () => {
  it('is disabled until the review is COMPLETED, even for an authorized decider', () => {
    mockPerms = { is_super_admin: false, permissions: ['hr.performance_reviews.decide'] };
    mockEvidence = BASE;
    renderDetail();
    expect(screen.getByText('Complete the review above before recording a management decision.')).toBeInTheDocument();
  });

  it('shows a read-only view (no control) for a user without hr.performance_reviews.decide', () => {
    mockPerms = { is_super_admin: false, permissions: [] };
    mockEvidence = { ...BASE, review: { ...BASE.review, status: 'COMPLETED' } };
    renderDetail();
    expect(screen.getByText('You do not have permission to record a management decision.')).toBeInTheDocument();
  });

  it('shows the recorded decision and who/when decided it', () => {
    mockPerms = { is_super_admin: false, permissions: [] };
    mockEvidence = {
      ...BASE,
      review: {
        ...BASE.review, status: 'COMPLETED', management_decision: 'INCREMENT_APPROVED',
        management_decision_at: '2026-04-01T00:00:00Z', decision_maker: { id: 'u3', first_name: 'HR', last_name: 'Head' },
      },
    };
    renderDetail();
    expect(screen.getByText('Increment Approved')).toBeInTheDocument();
    expect(screen.getByText(/Decided by HR Head/)).toBeInTheDocument();
  });

  it('never auto-fires a decision — the control requires an explicit selection', () => {
    mockPerms = { is_super_admin: false, permissions: ['hr.performance_reviews.decide'] };
    mockEvidence = { ...BASE, review: { ...BASE.review, status: 'COMPLETED' } };
    renderDetail();
    expect(recordDecisionMock).not.toHaveBeenCalled();
  });
});
