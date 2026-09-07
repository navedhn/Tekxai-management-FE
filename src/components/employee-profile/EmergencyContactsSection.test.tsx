import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmergencyContactsSection from './EmergencyContactsSection';
import { apiRequest } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast/ToastProvider';

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

function renderSection(userId = 'user-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <EmergencyContactsSection userId={userId} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedApiRequest.mockReset();

  mockedApiRequest.mockResolvedValue({ payload: { contacts: [] } });
});

describe('EmergencyContactsSection — Add Emergency Contact', () => {
  it('submits a real POST request with the entered fields when Add is clicked', async () => {
    renderSection('user-1');

    fireEvent.click(await screen.findByText('Add Contact'));

    fireEvent.change(screen.getByPlaceholderText('e.g. Jane Doe'), { target: { value: 'Mouzzam Ali' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Spouse'), { target: { value: 'Brother' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. +92 300 1234567'), { target: { value: '+92 316 4511628' } });

    mockedApiRequest.mockResolvedValueOnce({ payload: { id: 'ec-1' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      const postCall = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST');
      expect(postCall).toBeTruthy();
    });

    const [, options] = mockedApiRequest.mock.calls.find((c) => c[1]?.method === 'POST')!;
    expect(JSON.parse((options as any).body)).toEqual({
      name: 'Mouzzam Ali', relation: 'Brother', phone: '+92 316 4511628', is_primary: false,
    });
  });

  it('does NOT call the API and shows a validation error when a required field is blank', async () => {
    renderSection('user-1');
    fireEvent.click(await screen.findByText('Add Contact'));

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockedApiRequest.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
    });
  });
});
