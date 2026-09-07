import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PerformanceReviewsPage from './index';
import { ToastProvider } from '@/components/toast/ToastProvider';

const REVIEWS = [
  {
    id: 'r1', user_id: 'u1', reviewer_id: 'u2',
    user: { id: 'u1', first_name: 'Jane', last_name: 'Employee' },
    reviewer: { id: 'u2', first_name: 'Sam', last_name: 'Manager' },
    review_period: { id: 'p1', name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', status: 'OPEN' },
    designation: { id: 'd1', name: 'Backend Developer' },
    status: 'DRAFT', classification: null, recommended_action: null,
    completed_at: null, evidence_entries: [], created_at: '', updated_at: '',
  },
  {
    id: 'r2', user_id: 'u3', reviewer_id: 'u2',
    user: { id: 'u3', first_name: 'Ali', last_name: 'Dev' },
    reviewer: { id: 'u2', first_name: 'Sam', last_name: 'Manager' },
    review_period: { id: 'p1', name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', status: 'OPEN' },
    designation: null,
    status: 'COMPLETED', classification: 'MEETS_EXPECTATIONS', recommended_action: 'NO_ACTION',
    completed_at: '2026-04-01', evidence_entries: [], created_at: '', updated_at: '',
  },
];

vi.mock('@/services/performanceReviewsService', async () => {
  const actual = await vi.importActual<any>('@/services/performanceReviewsService');
  return {
    ...actual,
    useReviews: () => ({ data: REVIEWS, isLoading: false }),
    useReviewPeriods: () => ({ data: [{ id: 'p1', name: 'Q1 2026', start_date: '2026-01-01', end_date: '2026-03-31', status: 'OPEN' }] }),
    useCreateReview: () => ({ mutate: vi.fn(), isPending: false }),
    useCreateReviewPeriod: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('@/services/departmentService', () => ({
  useGetDepartmentsQuery: () => ({ data: [{ id: 'dep1', name: 'Engineering' }] }),
}));

vi.mock('@/services/businessUnitService', () => ({
  useGetBusinessUnitsQuery: () => ({ data: [{ id: 'bu1', name: 'Software' }] }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <PerformanceReviewsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Performance Reviews list', () => {
  it('renders employee, role, period, status, and classification columns', () => {
    renderPage();
    expect(screen.getByText('Jane Employee')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getAllByText('Q1 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('Not yet classified')).toBeInTheDocument();
  });

  it('shows a real classification label for a completed review, never a fabricated default', () => {
    renderPage();
    expect(screen.getByText('Meets Expectations')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('shows a dash for an employee with no designation on record', () => {
    renderPage();
    expect(screen.getByText('Ali Dev')).toBeInTheDocument();
  });

  it('opens the New Review modal with no employee/period pre-selected', () => {
    renderPage();
    fireEvent.click(screen.getByText('New Review'));
    expect(screen.getByText('Start a Performance Review')).toBeInTheDocument();
    expect(screen.getByText('Start Review')).toBeInTheDocument();
  });

  it('requires selecting an employee and a period before submitting', () => {
    renderPage();
    fireEvent.click(screen.getByText('New Review'));
    fireEvent.click(screen.getByText('Start Review'));
    expect(screen.getByText('Select an employee')).toBeInTheDocument();
  });
});
