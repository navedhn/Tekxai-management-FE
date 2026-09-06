import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMembersModal from './TeamMembersModal';
import { apiRequest } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast/ToastProvider';

// Regression test — production issue: two active employees can share an
// identical full name (e.g. two real "Abu Bakar Aslam" records, SS-39 and
// SS-10). The "Add Member" picker rendered only the name as the option
// label, so an admin had no way to tell which underlying record they were
// about to add. This proves (a) the label now carries a stable identifier
// (the employee ID) so the two are visually distinguishable, and (b) the
// value actually submitted on "Add" is the correct, real, unique user id —
// selecting the second same-named option must submit *that* user's id, not
// the first one's.

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const TEAM = { id: 'team-1', name: 'Tekxai Software - Tanzeel Team' };

const DUPLICATE_NAME_USERS = [
  { id: 'user-ss39', employee_id: 'SS-39', first_name: 'Abu Bakar', last_name: 'Aslam' },
  { id: 'user-ss10', employee_id: 'SS-10', first_name: 'Abu Bakar', last_name: 'Aslam' },
];

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TeamMembersModal isOpen onClose={vi.fn()} team={TEAM} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockImplementation(async (url: string) => {
    if (url.includes('/user?')) return { payload: { records: DUPLICATE_NAME_USERS } };
    if (url.includes('/members')) return { payload: [] };
    return { payload: [] };
  });
});

describe('TeamMembersModal — duplicate-name employee disambiguation', () => {
  it('shows the employee ID alongside the name for two same-named employees, and submits the correct user id', async () => {
    renderModal();

    // Open the "Add Member" searchable select.
    const trigger = await screen.findByText('Select employee');
    fireEvent.click(trigger);

    // Both duplicate-name entries must be distinguishable by employee ID.
    expect(await screen.findByText('SS-39 — Abu Bakar Aslam')).toBeInTheDocument();
    expect(await screen.findByText('SS-10 — Abu Bakar Aslam')).toBeInTheDocument();

    // Pick the SECOND one (SS-10) specifically.
    fireEvent.click(screen.getByText('SS-10 — Abu Bakar Aslam'));

    mockedApiRequest.mockResolvedValueOnce({ payload: { id: 'member-1' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      const postCall = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST');
      expect(postCall).toBeTruthy();
    });

    const [, options] = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST')!;
    // Must submit user-ss10's real id — not user-ss39's — proving the
    // ambiguous label never leaks into what's actually sent to the API.
    expect(JSON.parse((options as any).body)).toEqual({ user_id: 'user-ss10' });
  });
});
