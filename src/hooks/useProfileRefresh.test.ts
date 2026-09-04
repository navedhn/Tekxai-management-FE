import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileRefresh } from './useProfileRefresh';
import { useAuthStore } from '@/stores/authStore';
import { apiRequest } from '@/lib/queryClient';

vi.mock('@/lib/queryClient', () => ({ apiRequest: vi.fn() }));
vi.mock('@/mocks/mockAuth', () => ({ isMockSession: () => false }));

const mockedApiRequest = vi.mocked(apiRequest);

describe('useProfileRefresh', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    useAuthStore.setState({
      isLoggedIn: true,
      role: 'EMPLOYEE',
      user: {
        id: 'u1',
        first_name: 'Old',
        last_name: 'Name',
        avatar: 'http://localhost:4000/uploads/stale.jpeg',
      } as never,
    });
  });

  it('refreshes the persisted user from /auth/me on mount', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      success: true,
      data: { id: 'u1', first_name: 'Old', last_name: 'Name', avatar: 'https://api.tekxai.services/uploads/fresh.jpeg' },
    });

    renderHook(() => useProfileRefresh());

    await waitFor(() => {
      expect(useAuthStore.getState().user?.avatar).toBe('https://api.tekxai.services/uploads/fresh.jpeg');
    });
    expect(mockedApiRequest).toHaveBeenCalledTimes(1);
  });

  it('calls /auth/me at most once across re-renders', async () => {
    mockedApiRequest.mockResolvedValueOnce({ success: true, data: { id: 'u1' } });
    const { rerender } = renderHook(() => useProfileRefresh());
    rerender();
    rerender();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(1));
  });

  it('does nothing when logged out', async () => {
    useAuthStore.setState({ isLoggedIn: false, user: null, role: null });
    renderHook(() => useProfileRefresh());
    await new Promise((r) => setTimeout(r, 0));
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('swallows a failed /auth/me call without throwing', async () => {
    mockedApiRequest.mockRejectedValueOnce({ status: 401, message: 'Unauthorized' });
    expect(() => renderHook(() => useProfileRefresh())).not.toThrow();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalledTimes(1));
  });
});
