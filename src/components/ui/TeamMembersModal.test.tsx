import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamMembersModal from './TeamMembersModal';
import { apiRequest } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast/ToastProvider';

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

    const trigger = await screen.findByText('Select employee');
    fireEvent.click(trigger);

    expect(await screen.findByText('SS-39 — Abu Bakar Aslam')).toBeInTheDocument();
    expect(await screen.findByText('SS-10 — Abu Bakar Aslam')).toBeInTheDocument();

    fireEvent.click(screen.getByText('SS-10 — Abu Bakar Aslam'));

    mockedApiRequest.mockResolvedValueOnce({ payload: { id: 'member-1' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      const postCall = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST');
      expect(postCall).toBeTruthy();
    });

    const [, options] = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST')!;

    expect(JSON.parse((options as any).body)).toEqual({ user_id: 'user-ss10' });
  });
});
