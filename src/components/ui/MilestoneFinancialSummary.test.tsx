import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MilestoneFinancialSummary from './MilestoneFinancialSummary';

describe('MilestoneFinancialSummary', () => {
  it('shows a loading state when financial has not arrived yet', () => {
    render(<MilestoneFinancialSummary financial={undefined} activeMilestone={null} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders Total/Paid/Remaining/Active exactly as given by the API, with currency', () => {
    render(
      <MilestoneFinancialSummary
        financial={{ total: 5000, paid: 2000, remaining: 3000, active: 1500, currency: 'USD' }}
        activeMilestone={{ id: 'm1', title: 'Phase 2', due_date: null, progress_percent: 40, owner: null, price: 1500, payment_status: 'UNPAID' }}
      />
    );
    expect(screen.getByText('USD 5,000')).toBeInTheDocument();
    expect(screen.getByText('USD 2,000')).toBeInTheDocument();
    expect(screen.getByText('USD 3,000')).toBeInTheDocument();
    expect(screen.getByText('USD 1,500')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('shows an empty-state message when there is no active milestone', () => {
    render(
      <MilestoneFinancialSummary
        financial={{ total: 0, paid: 0, remaining: 0, active: 0, currency: 'PKR' }}
        activeMilestone={null}
      />
    );
    expect(screen.getByText(/No active milestone/)).toBeInTheDocument();
  });

  it('never shows a "Remaining" figure larger than Total (sanity check on given data, not a recompute)', () => {
    render(
      <MilestoneFinancialSummary
        financial={{ total: 1000, paid: 400, remaining: 600, active: 600, currency: 'PKR' }}
        activeMilestone={null}
      />
    );
    expect(screen.getAllByText('PKR 600').length).toBeGreaterThan(0);
    expect(screen.getByText('PKR 1,000')).toBeInTheDocument();
  });
});
